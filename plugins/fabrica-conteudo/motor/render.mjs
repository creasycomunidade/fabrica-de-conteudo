// Uso: node motor/render.mjs <spec.json>
// spec: { cliente, tipo: post|carrossel|story|reel|story-video, formato?, slides|cenas: [...], legenda, hashtags?, musica?, nome?, saida? }
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import puppeteer from 'puppeteer-core';
import ffmpegPath from 'ffmpeg-static';
import { p, findBrowser, carregarCliente, lerJson, salvarJson } from './lib.mjs';
import { pagina } from './templates.mjs';
import { narrar, agrupar } from './voz.mjs';

export const FORMATOS = { quadrado: [1080, 1080], retrato: [1080, 1350], story: [1080, 1920] };
const PADRAO = { post: 'retrato', carrossel: 'retrato', story: 'story', reel: 'story', 'story-video': 'story' };
export const VIDEO = new Set(['reel', 'story-video']);
const FPS = 30;

const slug = s => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);

async function montar(page, { html, cfg }) {
  await page.setContent(html, { waitUntil: 'load', timeout: 30000 }).catch(() => {});
  return page.evaluate(c => window.__build(c), cfg);
}
const seek = (page, t) => page.evaluate(s => { window.TL.seek(s, false); }, t); // return nothing: serializing the timeline hangs

// Narração: gera a fala de cada cena, alonga a cena se a fala for maior e monta legendas no tempo absoluto do vídeo.
async function prepararNarracao(c, spec, itens) {
  const audios = [];
  let legendas = [];
  const lead = 0.35; // starts after the scene transition settles
  let t = 0;
  for (const s of itens) {
    if (s.fala) {
      const n = await narrar(c, s.fala, spec.narracao || {});
      s.duracao = Math.max(s.duracao ?? 0, n.dur + lead + 0.45);
      audios.push({ arquivo: n.audio, ini: t + lead });
      const mv = w => ({ ...w, ini: w.ini + t + lead, fim: w.fim + t + lead });
      legendas.push(...agrupar(n.palavras).map(g => ({ ...mv(g), palavras: g.palavras.map(mv) })));
    }
    t += s.duracao ?? 3;
  }
  if (spec.narracao?.legendas === false) legendas = [];
  return { audios, legendas };
}

// Mixes narration (delayed to each scene) and optional music (ducked under the voice) into one track.
function argsAudio(audios, musica, duracao) {
  const fontes = [...audios.map(a => a.arquivo), ...(musica ? [musica] : [])];
  if (!fontes.length) return { entradas: [], saida: [] };
  const fx = audios.map((a, k) => `[${k + 1}:a]adelay=${Math.round(a.ini * 1000)}:all=1[a${k}]`);
  const rot = audios.map((_, k) => `[a${k}]`);
  if (musica) {
    const m = audios.length + 1;
    fx.push(`[${m}:a]volume=${audios.length ? 0.16 : 1},afade=t=out:st=${Math.max(0, duracao - 1.2).toFixed(2)}:d=1.2[am]`);
    rot.push('[am]');
  }
  fx.push(`${rot.join('')}amix=inputs=${rot.length}:normalize=0:duration=longest,apad,atrim=0:${duracao.toFixed(2)}[aout]`);
  return {
    entradas: fontes.flatMap(f => ['-i', f]),
    saida: ['-filter_complex', fx.join(';'), '-map', '0:v', '-map', '[aout]', '-c:a', 'aac', '-b:a', '192k'],
  };
}

export async function renderizar(spec, opc = {}) {
  // Vários formatos de uma vez: renderiza o mesmo spec em cada um (ex.: ["story", "quadrado"]).
  if (Array.isArray(spec.formato)) {
    const out = [];
    for (const f of spec.formato) out.push(await renderizar({ ...spec, formato: f, saida: spec.saida ? `${spec.saida}-${f}` : undefined, nome: `${spec.nome || 'peca'}-${f}` }, opc));
    return Object.assign(out[0], { variantes: out });
  }
  const { browser: externo } = opc;
  const c = carregarCliente(spec.cliente);
  const tipo = spec.tipo || 'post';
  const formato = spec.formato || PADRAO[tipo];
  if (!FORMATOS[formato]) throw new Error(`Formato inválido: ${formato}`);
  const [w, h] = FORMATOS[formato];
  const itens = (spec.slides || spec.cenas || []).map(s => ({ ...s }));
  if (!itens.length) throw new Error('spec sem slides/cenas');
  const video = VIDEO.has(tipo);
  const { audios, legendas } = video && itens.some(s => s.fala) ? await prepararNarracao(c, spec, itens) : { audios: [], legendas: [] };

  const hoje = new Date().toISOString().slice(0, 10);
  const dir = spec.saida ? p(spec.saida) : p('saida', c.slug, `${hoje}-${tipo}-${slug(spec.nome || itens[0].titulo || 'peca')}`);
  fs.mkdirSync(dir, { recursive: true });

  const browser = externo || await puppeteer.launch({ executablePath: findBrowser(), headless: true, args: ['--hide-scrollbars', '--force-color-profile=srgb', '--font-render-hinting=none'] });
  const arquivos = [];
  const avisos = [];
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: w, height: h, deviceScaleFactor: 1 });

    if (!video) {
      for (let i = 0; i < itens.length; i++) {
        const r = await montar(page, pagina(c, itens, { w, h, formato, video, so: i }));
        avisos.push(...r.avisos);
        await page.evaluate(() => { window.TL.progress(1, false); });
        const nome = `${String(i + 1).padStart(2, '0')}.png`;
        await page.screenshot({ path: path.join(dir, nome) });
        arquivos.push(nome);
      }
    } else {
      const { duracao, avisos: av } = await montar(page, pagina(c, itens, { w, h, formato, video, legendas }));
      avisos.push(...av);
      const nome = 'video.mp4';
      const musica = spec.musica ? p(spec.musica) : null;
      const au = argsAudio(audios, musica, duracao);
      const args = ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-i', '-',
        ...au.entradas, ...au.saida,
        '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-preset', 'slow', '-crf', '17', '-r', String(FPS),
        '-movflags', '+faststart', path.join(dir, nome)];
      const ff = spawn(ffmpegPath, args, { stdio: ['pipe', 'inherit', 'inherit'] });
      const fim = new Promise((ok, erro) => ff.on('close', code => (code === 0 ? ok() : erro(new Error(`ffmpeg saiu com código ${code}`)))));
      const total = Math.round(duracao * FPS);
      for (let f = 0; f < total; f++) {
        await seek(page, f / FPS);
        const buf = await page.screenshot({ type: 'jpeg', quality: 95 });
        if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
      }
      ff.stdin.end();
      await fim;
      arquivos.push(nome);
      // Capa do reel: o quadro do fim da primeira cena.
      await seek(page, Math.min(itens[0].duracao ?? 3, duracao) - 0.5);
      await page.screenshot({ path: path.join(dir, 'capa.jpg'), type: 'jpeg', quality: 92 });
    }
    await page.close();
  } finally {
    if (!externo) await browser.close();
  }

  for (const a of avisos) console.warn('AVISO:', a);
  const legenda = [spec.legenda, (spec.hashtags || c.hashtags || []).join(' ')].filter(Boolean).join('\n\n');
  fs.writeFileSync(path.join(dir, 'legenda.txt'), legenda);
  const peca = { cliente: c.slug, tipo, formato, arquivos, legenda, avisos, criado: new Date().toISOString(), spec };
  salvarJson(path.join(dir, 'peca.json'), peca);
  return { dir, ...peca };
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (!process.argv[2]) { console.error('Uso: node motor/render.mjs <spec.json>'); process.exit(1); }
  renderizar(lerJson(path.resolve(process.argv[2])))
    .then(r => console.log(JSON.stringify({ pasta: r.dir, arquivos: r.arquivos, avisos: r.avisos }, null, 2)))
    .catch(e => { console.error('ERRO:', e.message); process.exitCode = 1; }); // exitCode, not exit(): exiting mid-fetch crashes libuv on Windows
}
