// Vídeo de anúncio completo a partir de um roteiro: personagem + produto real + narração + legenda + música + cartela final.
//   node motor/completo.mjs <anuncio.json>
// anuncio.json:
//   { "cliente": "loja", "nome": "tenis-corrida", "produto": "tenis",          chave do produto (foto oficial) no marca.json
//     "personagem": "mulher de 28 anos, cabelo cacheado, roupa de corrida verde", mesma descrição em todas as cenas
//     "referencia": "caminho/foto-da-personagem.png",                          opcional: rosto fixo da personagem
//     "provedor": "runway", "modelo": "veo3.1_fast",                           opcional: senão, o primeiro com chave
//     "voz": "<id ElevenLabs>", "musica": "caminho/trilha.mp3", "legendas": true,
//     "cenas": [ { "fala": "texto narrado (até ~18 palavras)", "cena": "o que aparece e como a câmera se move", "clip": "opcional: vídeo pronto" } ],
//     "cartela": { "layout": "oferta", "titulo": "...", "preco": "R$ 499", "de": "R$ 599", "selo": "-20%", "cta": "Compre agora" },
//     "legenda": "texto do post", "hashtags": ["#..."] }
// Cada etapa paga fica em cache (partes/): rodar de novo só refaz a cena que mudou.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { spawn } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import ffmpegPath from 'ffmpeg-static';
import { p, carregarCliente, resolverImagem, lerJson, salvarJson, envCliente } from './lib.mjs';
import { narrar, agrupar } from './voz.mjs';
import { gerar, PROVEDORES } from './videoia.mjs';
import { renderizar } from './render.mjs';

const W = 1080, H = 1920, FPS = 30;
const PY = process.platform === 'win32' ? 'python' : 'python3';
const FFSK = path.join(os.homedir(), '.claude', 'skills', 'ffmpeg-skill', 'scripts');
const MOTOR = path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, '$1'));
const hash = o => crypto.createHash('sha1').update(JSON.stringify(o)).digest('hex').slice(0, 10);
const slug = s => String(s || 'anuncio').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);
const etapa = t => console.log(`▸ ${t}`);

function rodar(cmd, args, cwd) {
  return new Promise((ok, falha) => {
    const pr = spawn(cmd, args, { cwd, env: { ...process.env, PYTHONIOENCODING: 'utf-8' } });
    let out = '', err = '';
    pr.stdout.on('data', d => (out += d));
    pr.stderr.on('data', d => (err += d));
    pr.on('error', falha);
    pr.on('close', c => {
      if (c === 0) return ok(out);
      const erro = (err + out).split(/\r?\n/).reverse().find(l => /ERRO|error/i.test(l)) || (err || out).trim().split(/\r?\n/).pop();
      falha(new Error(`${path.basename(args[0] || cmd)}: ${erro}`));
    });
  });
}
const ffmpeg = args => rodar(ffmpegPath, ['-y', '-loglevel', 'error', ...args]);

// SRT with short word groups, shifted to each scene's start on the final timeline.
export function srt(cenas) {
  const t = s => { const ms = Math.round(s * 1000); return `${String(Math.floor(ms / 3600000)).padStart(2, '0')}:${String(Math.floor(ms / 60000) % 60).padStart(2, '0')}:${String(Math.floor(ms / 1000) % 60).padStart(2, '0')},${String(ms % 1000).padStart(3, '0')}`; };
  const cues = [];
  let ini = 0;
  for (const c of cenas) {
    for (const g of agrupar(c.palavras, 3)) cues.push([ini + g.ini, ini + Math.min(g.fim, c.dur - 0.05), g.palavras.map(w => w.t).join(' ')]);
    ini += c.dur;
  }
  return cues.map(([a, b, txt], i) => `${i + 1}\n${t(a)} --> ${t(b)}\n${txt}\n`).join('\n');
}

export async function anuncio(spec) {
  const c = carregarCliente(spec.cliente);
  const env = envCliente(c.slug);
  if (!spec.cenas?.length) throw new Error('O roteiro precisa de "cenas".');
  const dir = spec.saida ? p(spec.saida) : p('saida', c.slug, `${new Date().toISOString().slice(0, 10)}-anuncio-${slug(spec.nome)}`);
  const partes = path.join(dir, 'partes');
  fs.mkdirSync(partes, { recursive: true });
  const produto = spec.produto ? resolverImagem(c, spec.produto) : null;
  const precisaIA = spec.cenas.some(s => !s.clip);
  const provedor = spec.provedor || ['runway', 'google', 'hailuo', 'fal', 'higgsfield'].find(k => env[PROVEDORES[k].chave]);
  if (precisaIA && !provedor) throw new Error('Nenhum serviço de vídeo com chave. Cole a chave da Runway, Google, MiniMax ou fal.ai em Ajustes.');
  if (precisaIA && !PROVEDORES[provedor]?.imagem) throw new Error(`${PROVEDORES[provedor]?.nome || provedor} não anima a foto do produto; escolha outro serviço.`);
  const temFal = !!env.FAL_KEY;
  const ia = (...a) => rodar(process.execPath, [path.join(MOTOR, 'ia.mjs'), ...a]);

  // 1. Character reference: one image reused in every scene keeps the same face and outfit.
  let ref = spec.referencia ? resolverImagem(c, spec.referencia) : null;
  if (!ref && spec.personagem && temFal && precisaIA) {
    ref = path.join(partes, `personagem-${hash([spec.personagem, produto])}.png`);
    if (!fs.existsSync(ref)) {
      etapa('Criando a personagem');
      await ia('cena', `${spec.personagem}. Full body portrait, using the product from the reference image, plain studio background`, ref, '9:16', ...(produto ? ['--ref', produto] : []));
    }
  }

  // 2. Each scene: narration -> first frame -> AI clip (each step cached).
  const cenas = [];
  for (const [i, s] of spec.cenas.entries()) {
    const n = s.fala ? (etapa(`Cena ${i + 1}/${spec.cenas.length}: narração`), await narrar(c, s.fala, spec.voz ? { voz: spec.voz } : {})) : { audio: null, palavras: [], dur: s.duracao || 3 };
    const dur = +(n.dur + 0.45).toFixed(2);
    let clip = s.clip ? resolverImagem(c, s.clip) : null;
    if (!clip) {
      const k = hash([s.cena, spec.personagem, provedor, spec.modelo, Math.ceil(dur), produto, ref]);
      let quadro = produto;
      if (temFal) {
        quadro = path.join(partes, `quadro-${i + 1}-${k}.png`);
        if (!fs.existsSync(quadro)) {
          etapa(`Cena ${i + 1}: quadro inicial`);
          await ia('cena', [spec.personagem, s.cena].filter(Boolean).join('. '), quadro, '9:16', ...[produto, ref].filter(Boolean).flatMap(f => ['--ref', f]));
        }
      }
      clip = path.join(partes, `clip-${i + 1}-${k}.mp4`);
      if (!fs.existsSync(clip)) {
        etapa(`Cena ${i + 1}: vídeo com ${PROVEDORES[provedor].nome} (alguns minutos)`);
        const prompt = `${s.cena}. ${spec.personagem ? `${spec.personagem}. ` : ''}Smooth realistic motion, commercial look. Keep the product exactly as in the first frame. No text on screen.`;
        await gerar(provedor, { prompt, imagem: quadro, formato: '9:16', duracao: Math.ceil(dur), modelo: spec.modelo, saida: clip }, c.slug);
      }
    }
    cenas.push({ clip, audio: n.audio, palavras: n.palavras, dur });
  }

  // 3. End card with brand layout, price and call to action (same engine as the reels).
  if (spec.cartela) {
    etapa('Cartela final');
    const durC = spec.cartela.duracao || 3;
    const r = await renderizar({ cliente: c.slug, tipo: 'reel', formato: 'story', saida: path.join(partes, 'cartela'), nome: 'cartela', cenas: [{ layout: 'oferta', produto: spec.produto, ...spec.cartela, duracao: durC }] });
    fs.rmSync(path.join(r.dir, 'peca.json'), { force: true }); // not a piece of its own
    cenas.push({ clip: path.join(r.dir, 'video.mp4'), audio: null, palavras: [], dur: durC });
  }

  // 4. Assemble: every clip scaled to 1080x1920, held on its last frame until its narration ends.
  etapa('Montando o vídeo');
  const ent = [], fx = [];
  cenas.forEach((s, i) => {
    ent.push('-i', s.clip);
    ent.push(...(s.audio ? ['-i', s.audio] : ['-f', 'lavfi', '-t', String(s.dur), '-i', 'anullsrc=r=44100:cl=stereo']));
    fx.push(`[${2 * i}:v]scale=${W}:${H}:force_original_aspect_ratio=increase,crop=${W}:${H},fps=${FPS},setsar=1,format=yuv420p,tpad=stop_mode=clone:stop_duration=30,trim=duration=${s.dur},setpts=PTS-STARTPTS[v${i}]`);
    fx.push(`[${2 * i + 1}:a]aresample=44100,aformat=sample_fmts=fltp:channel_layouts=stereo,apad,atrim=duration=${s.dur},asetpts=PTS-STARTPTS[a${i}]`);
  });
  fx.push(`${cenas.map((_, i) => `[v${i}][a${i}]`).join('')}concat=n=${cenas.length}:v=1:a=1[v][a]`);
  await ffmpeg([...ent, '-filter_complex', fx.join(';'), '-map', '[v]', '-map', '[a]', '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '192k', path.join(partes, 'montado.mp4')]);

  // 5. Captions, music and loudness with ffmpeg-skill (names relative to partes/: "C:" would read as a language tag).
  const py = (script, args) => rodar(PY, [path.join(FFSK, script), ...args, '--overwrite'], partes);
  let atual = 'montado.mp4';
  const falas = cenas.some(s => s.palavras.length);
  if (falas || spec.musica) if (!fs.existsSync(path.join(FFSK, 'caption.py'))) throw new Error('ffmpeg-skill não instalada. Rode /fabrica-conteudo:setup.');
  if (falas && spec.legendas !== false) {
    etapa('Legenda palavra a palavra');
    fs.writeFileSync(path.join(partes, 'legenda.srt'), srt(cenas));
    const f = JSON.parse(await rodar(process.execPath, [path.join(MOTOR, 'fonte.mjs'), c.slug]));
    await py('caption.py', [atual, '--srt', 'legenda.srt', '--karaoke', '--karaoke-style', 'word', '--font', f.fonteLegenda, '--fonts-dir', f.fontsDir, '--highlight-color', f.destaque, '--font-size', '22', '--platform', 'reels', '-o', 'legendado.mp4']);
    atual = 'legendado.mp4';
  }
  if (spec.musica) {
    etapa('Música com volume automático sob a voz');
    const m = resolverImagem(c, spec.musica);
    fs.copyFileSync(m, path.join(partes, `musica${path.extname(m)}`));
    await py('audio.py', [atual, '--music', `musica${path.extname(m)}`, '--duck', '--music-volume', '-18', '--music-fade-out', '2', '-o', 'com-musica.mp4']);
    atual = 'com-musica.mp4';
  }
  if (falas || spec.musica) { await py('loudness.py', [atual, '-I', '-14', '-o', 'final.mp4']); atual = 'final.mp4'; }

  const video = path.join(dir, 'video.mp4');
  fs.copyFileSync(path.join(partes, atual), video);
  await ffmpeg(['-ss', String(Math.min(1.2, cenas[0].dur / 2)), '-i', video, '-frames:v', '1', '-q:v', '3', path.join(dir, 'capa.jpg')]);

  const legenda = [spec.legenda, (spec.hashtags || c.hashtags || []).join(' ')].filter(Boolean).join('\n\n');
  fs.writeFileSync(path.join(dir, 'legenda.txt'), legenda);
  const avisos = precisaIA ? ['Cenas geradas por IA: confira o produto (rótulo, logo, formato) e o rosto da personagem quadro a quadro antes de usar.'] : [];
  const peca = { cliente: c.slug, tipo: 'reel', formato: 'story', arquivos: ['video.mp4'], legenda, avisos, criado: new Date().toISOString(), anuncio: { ...spec, provedor } };
  salvarJson(path.join(dir, 'peca.json'), peca);
  return { dir, ...peca, duracao: +cenas.reduce((a, s) => a + s.dur, 0).toFixed(1) };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const arg = process.argv[2];
  if (!arg) { console.error('Uso: node motor/completo.mjs <anuncio.json>'); process.exitCode = 1; }
  else if (arg === 'teste') {
    const s = srt([{ dur: 2, palavras: [{ t: 'Olá', ini: 0, fim: 0.4 }, { t: 'mundo.', ini: 0.4, fim: 0.9 }] }, { dur: 3, palavras: [{ t: 'Fim', ini: 0.1, fim: 0.5 }] }]);
    if (!s.includes('00:00:02,100 --> ') || !s.startsWith('1\n00:00:00,000 --> ')) throw new Error(`srt falhou:\n${s}`);
    console.log('ok');
  } else {
    anuncio(lerJson(path.resolve(arg)))
      .then(r => console.log(JSON.stringify({ pasta: r.dir, arquivos: r.arquivos, duracao: r.duracao, avisos: r.avisos }, null, 2)))
      .catch(e => { console.error('ERRO:', e.message); process.exitCode = 1; });
  }
}
