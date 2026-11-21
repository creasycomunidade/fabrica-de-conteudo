// Editor de vídeo por linha do tempo. O projeto é um JSON com a lista de edições; nada é destrutivo:
// o original fica intacto e cada exportação aplica as edições ativas do zero.
//   node motor/editor.mjs novo <cliente> <video> <pasta>     copia o vídeo, mede e transcreve palavra a palavra
//   node motor/editor.mjs exportar <pasta>                   gera final-<n>.mp4 (+ versões em outros formatos)
//
// <pasta>/projeto.json:
//   { cliente, origem, duracao, largura, altura, fps, palavras: [{t, ini, fim}],
//     legenda: true, musica: {arquivo, volume} | null, formatos: ["1:1"],
//     edicoes: [ {id, tipo: "corte", ini, fim}            remove o trecho
//                {id, tipo: "zoom", ini, fim, escala}     aproxima (1.1 a 2)
//                {id, tipo: "texto", ini, fim, texto, posicao: "topo"|"centro"|"baixo"}
//                {id, tipo: "som", em, efeito: "whoosh"|"pop"|"ding"|"click"} ] }
// Todos os tempos são do vídeo ORIGINAL, em segundos.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawn } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import ffmpegPath from 'ffmpeg-static';
import { carregarCliente, lerJson, salvarJson } from './lib.mjs';
import { agrupar } from './voz.mjs';

const PY = process.platform === 'win32' ? 'python' : 'python3';
const FFSK = path.join(os.homedir(), '.claude', 'skills', 'ffmpeg-skill', 'scripts');
const MOTOR = path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, '$1'));
export const EFEITOS = {
  whoosh: 'anoisesrc=d=0.7:c=pink:a=0.5,highpass=f=400,lowpass=f=5000,afade=t=in:d=0.3,afade=t=out:st=0.35:d=0.35',
  pop: 'sine=f=880:d=0.09,afade=t=out:d=0.09,volume=0.8',
  ding: 'sine=f=1320:d=0.9,afade=t=out:st=0.03:d=0.85,volume=0.6',
  click: 'sine=f=2400:d=0.025,volume=0.7',
};
const etapa = t => console.log(`▸ ${t}`);

function rodar(cmd, args, cwd) {
  return new Promise((ok, falha) => {
    const pr = spawn(cmd, args, { cwd, env: { ...process.env, PYTHONIOENCODING: 'utf-8' } });
    let out = '', err = '';
    pr.stdout.on('data', d => (out += d));
    pr.stderr.on('data', d => (err += d));
    pr.on('error', falha);
    pr.on('close', c => (c === 0 ? ok(out + err) : falha(new Error(`${path.basename(args[0] || cmd)}: ${(err || out).trim().split(/\r?\n/).slice(-3).join(' | ')}`))));
  });
}
const ffmpeg = (args, cwd) => rodar(ffmpegPath, ['-y', '-hide_banner', '-loglevel', 'error', ...args], cwd);

async function medir(video) {
  // ffmpeg -i with no output exits 1 but prints the stream info on stderr.
  const info = await new Promise(ok => { let s = ''; const pr = spawn(ffmpegPath, ['-hide_banner', '-i', video]); pr.stderr.on('data', d => (s += d)); pr.on('close', () => ok(s)); pr.on('error', () => ok(s)); });
  const [, h, m, s] = info.match(/Duration: (\d+):(\d+):([\d.]+)/) || [];
  const v = info.match(/Video:.*?(\d{2,5})x(\d{2,5})/);
  const fps = +(info.match(/([\d.]+) fps/)?.[1] || 30);
  const rot = /rotation of -?90|rotate\s*:\s*-?90/.test(info);
  if (!h || !v) throw new Error('Não consegui ler o vídeo (formato não suportado?).');
  const [w, a] = rot ? [+v[2], +v[1]] : [+v[1], +v[2]];
  return { duracao: +h * 3600 + +m * 60 + +s, largura: w, altura: a, fps: Math.round(fps) || 30, audio: /Audio:/.test(info) };
}

// Merged, sorted cut ranges.
export function cortesDe(edicoes) {
  const cs = edicoes.filter(e => e.tipo === 'corte' && e.ativo !== false && e.fim > e.ini).map(e => [e.ini, e.fim]).sort((a, b) => a[0] - b[0]);
  const out = [];
  for (const c of cs) { const u = out.at(-1); if (u && c[0] <= u[1]) u[1] = Math.max(u[1], c[1]); else out.push([...c]); }
  return out;
}
// Original time -> exported time (null when it falls inside a cut).
export function remapear(t, cortes) {
  let menos = 0;
  for (const [a, b] of cortes) { if (t >= b) menos += b - a; else if (t > a) return null; }
  return t - menos;
}
// Pauses longer than `min` seconds between words become cut suggestions (keeps a little air on each side).
export function pausas(palavras, duracao, min = 0.6) {
  const out = [];
  let ant = 0;
  for (const w of [...palavras, { ini: duracao, fim: duracao }]) {
    if (w.ini - ant > min) out.push({ tipo: 'corte', ini: +(ant + (ant ? 0.15 : 0)).toFixed(2), fim: +(w.ini - 0.12).toFixed(2), nota: 'pausa' });
    ant = Math.max(ant, w.fim);
  }
  return out.filter(c => c.fim - c.ini > 0.2);
}
export function srt(palavras, cortes) {
  const t = s => { const ms = Math.round(s * 1000); return `${String(Math.floor(ms / 3600000)).padStart(2, '0')}:${String(Math.floor(ms / 60000) % 60).padStart(2, '0')}:${String(Math.floor(ms / 1000) % 60).padStart(2, '0')},${String(ms % 1000).padStart(3, '0')}`; };
  const vivas = palavras.map(w => ({ ...w, ini: remapear(w.ini, cortes), fim: remapear(w.fim, cortes) })).filter(w => w.ini != null).map(w => ({ ...w, fim: w.fim ?? w.ini + 0.3 }));
  return agrupar(vivas, 3).map((g, i) => `${i + 1}\n${t(g.ini)} --> ${t(Math.max(g.ini + 0.2, g.fim))}\n${g.palavras.map(w => w.t).join(' ')}\n`).join('\n');
}

export async function novo(slug, video, dir) {
  carregarCliente(slug);
  fs.mkdirSync(dir, { recursive: true });
  const origem = `original${path.extname(video).toLowerCase()}`;
  if (path.resolve(video) !== path.resolve(dir, origem)) fs.copyFileSync(video, path.join(dir, origem));
  etapa('Lendo o vídeo');
  const m = await medir(path.join(dir, origem));
  etapa('Transcrevendo palavra a palavra (no seu computador)');
  let palavras = [];
  if (m.audio) {
    await rodar(PY, [path.join(MOTOR, 'transcrever.py'), origem, 'palavras.json'], dir);
    palavras = lerJson(path.join(dir, 'palavras.json'));
  }
  etapa('Preparando efeitos sonoros');
  fs.mkdirSync(path.join(dir, 'sfx'), { recursive: true });
  for (const [k, f] of Object.entries(EFEITOS)) await ffmpeg(['-f', 'lavfi', '-i', f, '-ac', '2', '-ar', '44100', path.join('sfx', `${k}.wav`)], dir);
  const proj = { cliente: slug, origem, ...m, palavras, legenda: palavras.length > 0, musica: null, formatos: [], edicoes: [], criado: new Date().toISOString() };
  salvarJson(path.join(dir, 'projeto.json'), proj);
  return proj;
}

export async function exportar(dir) {
  const pj = lerJson(path.join(dir, 'projeto.json'));
  const c = carregarCliente(pj.cliente);
  const ed = (pj.edicoes || []).filter(e => e.ativo !== false);
  const cortes = cortesDe(ed);
  const zooms = ed.filter(e => e.tipo === 'zoom' && e.fim > e.ini);
  const textos = ed.filter(e => e.tipo === 'texto' && e.texto && e.fim > e.ini);
  const sons = ed.filter(e => e.tipo === 'som' && EFEITOS[e.efeito]);
  const n = Date.now() % 1000000;
  const F = await rodar(process.execPath, [path.join(MOTOR, 'fonte.mjs'), c.slug]).then(o => JSON.parse(o.slice(o.indexOf('{'))));
  const corpo = c.fontes?.corpo || c.fonte || 'Montserrat';
  const ttf = path.join(F.fontsDir, `${corpo.replace(/\W+/g, '_')}-800.ttf`);
  if (textos.length) fs.copyFileSync(ttf, path.join(dir, 'fonte.ttf'));

  etapa('Aplicando cortes, zoom, textos e sons');
  const { largura: W, altura: H, fps } = pj;
  const v = [];
  if (zooms.length) {
    // Each zoom eases in over 0.25 s; zoompan with d=1 keeps one output frame per input frame.
    const z = zooms.map(e => `${(e.escala || 1.25) - 1}*between(it,${e.ini},${e.fim})*min(1,(it-${e.ini})/0.25)`).join('+');
    v.push(`zoompan=z='1+${z}':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=1:s=${W}x${H}:fps=${fps}`);
  }
  textos.forEach((e, i) => {
    fs.writeFileSync(path.join(dir, `texto-${i}.txt`), e.texto);
    const y = { topo: 'h*0.14', centro: '(h-text_h)/2', baixo: 'h*0.70' }[e.posicao] || 'h*0.14';
    v.push(`drawtext=fontfile=fonte.ttf:textfile=texto-${i}.txt:fontsize=${Math.round(W * 0.062)}:fontcolor=white:box=1:boxcolor=${c.cores.primaria}@0.9:boxborderw=${Math.round(W * 0.025)}:x=(w-text_w)/2:y=${y}:enable='between(t,${e.ini},${e.fim})'`);
  });
  const fora = cortes.map(([a, b]) => `between(t,${a},${b})`).join('+');
  if (fora) v.push(`select='not(${fora})'`, 'setpts=N/FRAME_RATE/TB');
  const ent = ['-i', pj.origem, ...sons.flatMap(s => ['-i', path.join('sfx', `${s.efeito}.wav`)])];
  const fx = [`[0:v]${v.length ? v.join(',') : 'null'},format=yuv420p[v]`];
  const temAudio = pj.audio !== false;
  const base = temAudio ? '[0:a]aformat=sample_rates=44100:channel_layouts=stereo[a0]' : `anullsrc=r=44100:cl=stereo,atrim=duration=${pj.duracao}[a0]`;
  fx.push(base);
  sons.forEach((s, i) => fx.push(`[${i + 1}:a]adelay=${Math.round(s.em * 1000)}:all=1[s${i}]`));
  const mix = sons.length ? `[a0]${sons.map((_, i) => `[s${i}]`).join('')}amix=inputs=${sons.length + 1}:duration=first:normalize=0` : '[a0]anull';
  fx.push(`${mix}${fora ? `,aselect='not(${fora})',asetpts=N/SR/TB` : ''}[a]`);
  await ffmpeg([...ent, '-filter_complex', fx.join(';'), '-map', '[v]', '-map', '[a]', '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-r', String(fps), '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', 'editado.mp4'], dir);

  const py = (s, a) => rodar(PY, [path.join(FFSK, s), ...a, '--overwrite'], dir);
  let atual = 'editado.mp4';
  const precisaSkill = (pj.legenda && pj.palavras?.length) || pj.musica || (pj.formatos || []).length;
  if (precisaSkill && !fs.existsSync(path.join(FFSK, 'caption.py'))) throw new Error('ffmpeg-skill não instalada. Rode /fabrica-conteudo:setup.');
  if (pj.legenda && pj.palavras?.length) {
    etapa('Legenda palavra a palavra');
    fs.writeFileSync(path.join(dir, 'legenda.srt'), srt(pj.palavras, cortes));
    await py('caption.py', [atual, '--srt', 'legenda.srt', '--karaoke', '--karaoke-style', 'word', '--font', F.fonteLegenda, '--fonts-dir', F.fontsDir, '--highlight-color', F.destaque, '--font-size', '22', '--platform', 'reels', '-o', 'legendado.mp4']);
    atual = 'legendado.mp4';
  }
  if (pj.musica?.arquivo) {
    etapa('Música com volume automático sob a voz');
    await py('audio.py', [atual, '--music', pj.musica.arquivo, '--duck', '--music-volume', String(pj.musica.volume ?? -18), '--music-loop', '--music-fade-out', '2', '-o', 'com-musica.mp4']);
    atual = 'com-musica.mp4';
  }
  etapa('Volume padrão das redes');
  if (fs.existsSync(path.join(FFSK, 'loudness.py')) && temAudio) { await py('loudness.py', [atual, '-I', '-14', '-o', `final-${n}.mp4`]); } else fs.copyFileSync(path.join(dir, atual), path.join(dir, `final-${n}.mp4`));
  const arquivos = [`final-${n}.mp4`];
  for (const a of (pj.formatos || []).filter(x => /^\d+:\d+$/.test(x))) {
    etapa(`Versão ${a}`);
    const out = `final-${a.replace(':', 'x')}-${n}.mp4`;
    await py('fit.py', [arquivos[0], '--aspect', a, '--fit', 'blur', '-o', out]);
    arquivos.push(out);
  }
  // Windows locks files the browser is playing: old exports are removed when possible, otherwise next time.
  for (const f of fs.readdirSync(dir)) if (/^final-/.test(f) && !arquivos.includes(f)) try { fs.rmSync(path.join(dir, f)); } catch { /* in use */ }
  await ffmpeg(['-ss', '0.5', '-i', arquivos[0], '-frames:v', '1', '-q:v', '3', 'capa.jpg'], dir);
  const antiga = fs.existsSync(path.join(dir, 'peca.json')) ? lerJson(path.join(dir, 'peca.json')) : {};
  salvarJson(path.join(dir, 'peca.json'), { cliente: c.slug, tipo: 'edicao', formato: 'gravado', arquivos, legenda: antiga.legenda || '', avisos: [], criado: antiga.criado || new Date().toISOString() });
  pj.exportado = arquivos[0];
  salvarJson(path.join(dir, 'projeto.json'), pj);
  return { dir, arquivos };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [cmd, ...a] = process.argv.slice(2);
  const fim = p => p.then(r => console.log(JSON.stringify(r.arquivos ? { pasta: r.dir, arquivos: r.arquivos } : { ok: true }))).catch(e => { console.error('ERRO:', e.message); process.exitCode = 1; });
  if (cmd === 'novo') fim(novo(a[0], path.resolve(a[1]), path.resolve(a[2])));
  else if (cmd === 'exportar') fim(exportar(path.resolve(a[0])));
  else if (cmd === 'teste') {
    const cs = cortesDe([{ tipo: 'corte', ini: 1, fim: 2 }, { tipo: 'corte', ini: 1.5, fim: 3 }, { tipo: 'corte', ini: 5, fim: 6, ativo: false }]);
    if (JSON.stringify(cs) !== '[[1,3]]') throw new Error(`cortesDe: ${JSON.stringify(cs)}`);
    if (remapear(4, cs) !== 2 || remapear(2, cs) !== null || remapear(0.5, cs) !== 0.5) throw new Error('remapear');
    const ps = pausas([{ t: 'a', ini: 1, fim: 1.5 }, { t: "b", ini: 3, fim: 3.4 }], 3.9);
    if (ps.length !== 2 || ps[0].ini !== 0 || ps[1].ini !== 1.65) throw new Error(`pausas: ${JSON.stringify(ps)}`);
    console.log('ok');
  } else console.log(fs.readFileSync(new URL(import.meta.url), 'utf8').split('\n').slice(0, 13).join('\n'));
}
