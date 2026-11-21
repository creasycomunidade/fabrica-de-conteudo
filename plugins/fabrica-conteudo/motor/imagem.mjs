// Recorte de produto, local e sem custo.
//   node motor/imagem.mjs recortar <entrada> <saida.png> [--crop x,y,w,h] [--escala 2] [--simples [--tol 30]]
// Padrão: IA local BiRefNet (motor/recorte.py, pip install rembg) + limpeza da borda, sem halo do fundo.
//   --simples  sem IA: preenche o fundo liso a partir das bordas (rápido; use só se o rembg não estiver instalado)
//   --crop   recorta um produto de uma foto com vários (coordenadas da imagem original)
//   --escala amplia com lanczos antes do recorte (fotos pequenas da internet)
//   --apagar "x,y x,y x,y ...; x,y ..."  apaga polígonos (coordenadas da original, separados por ;), p.ex. outro produto encostado
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import ffmpeg from 'ffmpeg-static';
import { pathToFileURL } from 'node:url';

function decodificar(entrada, filtros) {
  const info = spawnSync(ffmpeg, ['-hide_banner', '-i', entrada, '-vf', filtros, '-f', 'null', '-'], { encoding: 'utf8' }).stderr;
  const m = [...info.matchAll(/Video: .*?(\d{2,5})x(\d{2,5})/g)].at(-1);
  if (!m) throw new Error(`Não consegui ler ${entrada}`);
  const r = spawnSync(ffmpeg, ['-loglevel', 'error', '-i', entrada, '-vf', `${filtros},format=rgba`, '-f', 'rawvideo', '-'], { maxBuffer: 1 << 29 });
  if (r.status !== 0) throw new Error(String(r.stderr));
  return { w: +m[1], h: +m[2], px: r.stdout };
}

// Pure function: RGBA buffer in, RGBA buffer out (alpha set), plus tight bounding box of the subject.
const dentro = (x, y, pol) => { let d = false; for (let i = 0, j = pol.length - 1; i < pol.length; j = i++) { const [xi, yi] = pol[i], [xj, yj] = pol[j]; if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) d = !d; } return d; };

export function removerFundo(px, w, h, tol = 30, apagar = null) {
  const at = (x, y) => (y * w + x) * 4;
  const borda = [];
  for (let x = 0; x < w; x++) borda.push(at(x, 0), at(x, h - 1));
  for (let y = 0; y < h; y++) borda.push(at(0, y), at(w - 1, y));
  const med = k => { const v = borda.map(i => px[i + k]).sort((a, b) => a - b); return v[v.length >> 1]; };
  const bg = [med(0), med(1), med(2)];
  const dist = i => Math.hypot(px[i] - bg[0], px[i + 1] - bg[1], px[i + 2] - bg[2]);
  const fundo = new Uint8Array(w * h);
  const pilha = [];
  for (let x = 0; x < w; x++) pilha.push(x, (h - 1) * w + x);
  for (let y = 0; y < h; y++) pilha.push(y * w, y * w + w - 1);
  while (pilha.length) {
    const p = pilha.pop();
    if (fundo[p] || dist(p * 4) > tol) continue;
    fundo[p] = 1;
    const x = p % w, y = (p / w) | 0;
    if (x > 0) pilha.push(p - 1);
    if (x < w - 1) pilha.push(p + 1);
    if (y > 0) pilha.push(p - w);
    if (y < h - 1) pilha.push(p + w);
  }
  if (apagar) for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (apagar.some(pol => dentro(x, y, pol))) fundo[y * w + x] = 1;
  const out = Buffer.from(px);
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const p = y * w + x, i = p * 4;
    if (fundo[p]) { out[i + 3] = 0; continue; }
    // Edge pixels next to the background get partial alpha so the cut isn't jagged.
    const viz = (x > 0 && fundo[p - 1]) || (x < w - 1 && fundo[p + 1]) || (y > 0 && fundo[p - w]) || (y < h - 1 && fundo[p + w]);
    if (viz) out[i + 3] = Math.round(255 * Math.min(1, Math.max(0.15, (dist(i) - tol) / tol)));
    if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
  }
  return { px: out, caixa: x1 < 0 ? null : { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 }, bg };
}

// AI cut already carries alpha: only erase polygons and find the subject's box.
export function porAlfa(px, w, h, apagar = null) {
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 4;
    if (apagar?.some(pol => dentro(x, y, pol))) px[i + 3] = 0;
    if (px[i + 3] > 8) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  }
  return { px, caixa: x1 < 0 ? null : { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 }, bg: ['ia'] };
}

export function recortar(entrada, saida, { crop, tol = 30, escala = 1, apagar, ia = false } = {}) {
  let f = [crop ? `crop=${crop[2]}:${crop[3]}:${crop[0]}:${crop[1]}` : 'null', escala > 1 ? `scale=iw*${escala}:ih*${escala}:flags=lanczos` : 'null'].join(',');
  let fonte = entrada;
  if (ia) {
    // Crop/scale first, then let the model see only the product.
    const prep = `${saida}.prep.png`, cut = `${saida}.ia.png`;
    const r1 = spawnSync(ffmpeg, ['-y', '-loglevel', 'error', '-i', entrada, '-vf', f, '-frames:v', '1', prep]);
    if (r1.status !== 0) throw new Error(String(r1.stderr));
    // Upscaled photos get a wider fringe, so the mask shrinks a little more.
    const r2 = spawnSync(process.platform === 'win32' ? 'python' : 'python3', [new URL('./recorte.py', import.meta.url).pathname.replace(/^\/(\w:)/, '$1'), prep, cut, 'birefnet-general', String(Math.max(1, Math.round(escala)))], { encoding: 'utf8', env: { ...process.env, PYTHONIOENCODING: 'utf-8' } });
    fs.rmSync(prep, { force: true });
    if (r2.status !== 0 || !fs.existsSync(cut)) throw new Error(`Recorte com IA falhou (instale com: pip install rembg): ${(r2.stderr || '').trim().split(/\r?\n/).at(-1)}`);
    fonte = cut; f = 'null';
  }
  const { w, h, px } = decodificar(fonte, f);
  if (ia) fs.rmSync(fonte, { force: true });
  const pol = apagar?.map(poly => poly.map(([x, y]) => [(x - (crop?.[0] || 0)) * escala, (y - (crop?.[1] || 0)) * escala]));
  const r = ia ? porAlfa(px, w, h, pol) : removerFundo(px, w, h, tol, pol);
  if (!r.caixa) throw new Error('A imagem inteira parece fundo: diminua --tol');
  const m = 6;
  const c = { x: Math.max(0, r.caixa.x - m), y: Math.max(0, r.caixa.y - m) };
  c.w = Math.min(w - c.x, r.caixa.w + 2 * m); c.h = Math.min(h - c.y, r.caixa.h + 2 * m);
  const enc = spawnSync(ffmpeg, ['-y', '-loglevel', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', `${w}x${h}`, '-i', '-', '-vf', `crop=${c.w}:${c.h}:${c.x}:${c.y}`, '-frames:v', '1', saida], { input: r.px });
  if (enc.status !== 0) throw new Error(String(enc.stderr));
  return { saida, largura: c.w, altura: c.h, fundo: `rgb(${r.bg.join(',')})` };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [cmd, entrada, saida, ...a] = process.argv.slice(2);
  const opt = n => { const i = a.indexOf(`--${n}`); return i < 0 ? undefined : a[i + 1]; };
  try {
    if (cmd === 'recortar') console.log(recortar(entrada, saida, { crop: opt('crop')?.split(',').map(Number), tol: +(opt('tol') ?? 30), escala: +(opt('escala') ?? 1), apagar: opt('apagar')?.split(';').map(poly => poly.trim().split(/\s+/).map(p => p.split(',').map(Number))), ia: !a.includes('--simples') }));
    else if (cmd === 'teste') {
      // White 20x20 with a red square and a white "label" pixel inside it: the inner white must survive.
      const w = 20, h = 20, px = Buffer.alloc(w * h * 4, 255);
      for (let y = 5; y < 15; y++) for (let x = 5; x < 15; x++) { const i = (y * w + x) * 4; px[i + 1] = 0; px[i + 2] = 0; }
      const ii = (10 * w + 10) * 4; px[ii + 1] = 255; px[ii + 2] = 255;
      const r = removerFundo(px, w, h);
      if (r.px[3] !== 0 || r.px[ii + 3] !== 255 || r.caixa.w !== 10) throw new Error('autoteste falhou');
      const q = porAlfa(Buffer.from(r.px), w, h, [[[0, 0], [10, 0], [10, 20], [0, 20]]]);
      if (q.caixa.x !== 10 || q.caixa.w !== 5) throw new Error('autoteste porAlfa falhou');
      console.log('ok');
    } else console.log(fs.readFileSync(new URL(import.meta.url), 'utf8').split('\n').slice(0, 6).join('\n'));
  } catch (e) { console.error('ERRO:', e.message); process.exitCode = 1; }
}
