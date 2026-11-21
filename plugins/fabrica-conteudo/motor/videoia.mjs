// Vídeo gerado por IA, direto nas APIs oficiais (cada uma com sua chave no .env da pasta de trabalho).
//   node motor/videoia.mjs provedores
//   node motor/videoia.mjs <provedor> "<prompt>" <saida.mp4> [--imagem foto.png] [--modelo X] [--formato 9:16|16:9|1:1] [--duracao 8]
//
// Provedores (documentação conferida em nov/2026):
//   google      Gemini Omni Flash (substituto do Veo 3.1 na Gemini API)  GEMINI_API_KEY
//   runway      Runway Dev: Gen-4.5, Veo 3.1, Kling 4, Hailuo 3, Seedance 2.5, Gemini Omni  RUNWAYML_API_SECRET
//   hailuo      MiniMax H3 (Hailuo)                                      MINIMAX_API_KEY
//   higgsfield  Higgsfield Cloud (informe o app com --modelo)            HIGGSFIELD_KEY=id:secret
//   heygen      HeyGen Video Agent (vídeo pronto a partir do pedido)     HEYGEN_API_KEY
// Regra da fábrica: IA pode deformar rótulo e logo do produto. Revise quadro a quadro antes de usar.
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { envCliente, dataUri, mime } from './lib.mjs';

const esperar = ms => new Promise(r => setTimeout(r, ms));
const erro = (m, extra) => Object.assign(new Error(m), extra);

async function json(url, opc = {}) {
  const r = await fetch(url, opc);
  const t = await r.text();
  let j; try { j = JSON.parse(t); } catch { j = { texto: t.slice(0, 300) }; }
  if (!r.ok) throw erro(`${new URL(url).host} ${r.status}: ${JSON.stringify(j.error || j.message || j.detail || j.failure || j).slice(0, 300)}`);
  return j;
}
async function baixar(url, saida) {
  fs.mkdirSync(path.dirname(path.resolve(saida)), { recursive: true });
  const r = await fetch(url);
  if (!r.ok) throw erro(`Download falhou: ${r.status}`);
  fs.writeFileSync(saida, Buffer.from(await r.arrayBuffer()));
}
// Video URLs sit in different places in each API's JSON; take the first one that looks like a video.
export function acharVideo(o) {
  if (!o) return null;
  if (typeof o === 'string') return /^https?:\/\//.test(o) && /\.(mp4|mov|webm)(\?|$)|video/i.test(o) ? o : null;
  if (Array.isArray(o)) { for (const x of o) { const v = acharVideo(x); if (v) return v; } return null; }
  for (const k of ['video_url', 'videoUrl', 'url', 'video', 'videos', 'output', 'content', 'data', 'result']) if (k in o) { const v = acharVideo(o[k]); if (v) return v; }
  for (const v of Object.values(o)) { const r = typeof v === 'object' ? acharVideo(v) : null; if (r) return r; }
  return null;
}
async function poll(fn, { a = 5000, max = 40 * 60000 } = {}) {
  const t0 = Date.now();
  for (;;) {
    const r = await fn();
    if (r !== undefined) return r;
    if (Date.now() - t0 > max) throw erro('A geração passou de 40 minutos sem terminar.');
    await esperar(a);
  }
}
const chave = (env, nome, onde) => env[nome] || (() => { throw erro(`${nome} ausente. Crie a chave em ${onde} e cole em Ajustes no Estúdio (ou no .env).`); })();

// ---------- Google: Gemini Omni Flash (Interactions API) ----------
async function google(env, { prompt, imagem, formato, duracao, modelo, saida }) {
  const k = chave(env, 'GEMINI_API_KEY', 'aistudio.google.com/apikey');
  const h = { 'x-goog-api-key': k, 'Content-Type': 'application/json' };
  const input = imagem ? [{ type: 'image', data: fs.readFileSync(imagem).toString('base64'), mime_type: mime(imagem) }, { type: 'text', text: prompt }] : prompt;
  const rf = { type: 'video', ...(formato === '9:16' || formato === '16:9' ? { aspect_ratio: formato } : {}), ...(duracao ? { duration: `${Math.min(15, Math.max(3, duracao))}s` } : {}) };
  let it = await json('https://generativelanguage.googleapis.com/v1beta/interactions', { method: 'POST', headers: h, body: JSON.stringify({ model: modelo || 'gemini-omni-1.2-flash', input, response_format: rf }) });
  it = await poll(async () => {
    if (it.status === 'completed') return it;
    if (it.status === 'failed' || it.status === 'cancelled') throw erro(`Google: ${it.status} ${JSON.stringify(it.error || '').slice(0, 200)}`);
    it = await json(`https://generativelanguage.googleapis.com/v1beta/interactions/${it.id}`, { headers: h });
    return it.status === 'completed' ? it : undefined;
  });
  const parte = (it.steps || []).filter(s => s.type === 'model_output').flatMap(s => s.content || []).find(c => c.type === 'video');
  if (parte?.data) return fs.writeFileSync(saida, Buffer.from(parte.data, 'base64'));
  const url = parte?.uri || acharVideo(it);
  if (!url) throw erro('Google não devolveu vídeo.');
  await baixar(url, saida);
}

// ---------- Runway Dev ----------
// Vertical ratio and allowed duration per model, from the official OpenAPI (nov/2026).
export const RUNWAY = {
  'veo3.1': { r: { '9:16': '720:1280', '16:9': '1280:720' }, d: [4, 6, 8] },
  'veo3.1_fast': { r: { '9:16': '720:1280', '16:9': '1280:720' }, d: [4, 6, 8] },
  'kling_4': { r: { '9:16': '720:1280', '16:9': '1280:720' }, d: [3, 30], semRatioImagem: true },
  'hailuo3': { r: { '9:16': '9:16', '16:9': '16:9', '1:1': '1:1' }, d: [5, 15] },
  'gen4.5': { r: { '9:16': '720:1280', '16:9': '1280:720' }, d: [2, 10], exige: true },
  'seedance2_5': { r: { '9:16': '720:1280', '16:9': '1280:720' } },
  'gemini_omni_flash_1.2': { r: { '9:16': '720:1280', '16:9': '1280:720' } },
};
export function corpoRunway(modelo, { prompt, imagemUri, formato = '9:16', duracao }) {
  const m = RUNWAY[modelo] || {};
  const b = { model: modelo, promptText: prompt };
  if (imagemUri) b.promptImage = imagemUri;
  const ratio = m.r?.[formato];
  if (ratio && !(imagemUri && m.semRatioImagem)) b.ratio = ratio;
  if (m.d) { const [lo, hi] = [m.d[0], m.d.at(-1)]; let d = Math.min(hi, Math.max(lo, duracao || (m.exige ? 5 : lo))); if (m.d.length > 2) d = m.d.reduce((x, y) => (Math.abs(y - d) < Math.abs(x - d) ? y : x)); if (duracao || m.exige) b.duration = d; }
  return b;
}
async function runway(env, { prompt, imagem, formato, duracao, modelo, saida }) {
  const k = chave(env, 'RUNWAYML_API_SECRET', 'dev.runway.com');
  const h = { Authorization: `Bearer ${k}`, 'X-Runway-Version': '2024-11-06', 'Content-Type': 'application/json' };
  if (imagem && fs.statSync(imagem).size > 5e6) throw erro('Runway aceita imagem de até 5 MB.');
  const m = modelo || 'veo3.1_fast';
  const corpo = corpoRunway(m, { prompt, imagemUri: imagem ? dataUri(imagem) : null, formato, duracao });
  const t = await json(`https://api.dev.runwayml.com/v1/${imagem ? 'image_to_video' : 'text_to_video'}`, { method: 'POST', headers: h, body: JSON.stringify(corpo) });
  const fim = await poll(async () => {
    const s = await json(`https://api.dev.runwayml.com/v1/tasks/${t.id}`, { headers: h });
    if (s.status === 'SUCCEEDED') return s;
    if (s.status === 'FAILED' || s.status === 'CANCELLED') throw erro(`Runway: ${s.failure || s.status}`);
  });
  await baixar(fim.output[0], saida);
}

// ---------- Hailuo (MiniMax H3) ----------
async function hailuo(env, { prompt, imagem, formato, duracao, modelo, saida }) {
  const k = chave(env, 'MINIMAX_API_KEY', 'platform.minimax.io (Pay-as-you-go)');
  const h = { Authorization: `Bearer ${k}`, 'Content-Type': 'application/json' };
  const content = [{ type: 'text', text: prompt }, ...(imagem ? [{ type: 'image_url', image_url: { url: dataUri(imagem) }, role: 'first_frame' }] : [])];
  const r = await json('https://api.minimax.io/v2/video_generation', { method: 'POST', headers: h, body: JSON.stringify({ model: modelo || 'MiniMax-H3', content, resolution: '768P', duration: Math.min(10, Math.max(5, duracao || 6)), ratio: imagem ? 'adaptive' : (formato || '9:16') }) });
  const id = r.task_id || r.data?.task_id || r.id;
  if (!id) throw erro(`Hailuo não devolveu task_id: ${JSON.stringify(r).slice(0, 200)}`);
  const fim = await poll(async () => {
    const s = await json(`https://api.minimax.io/v2/query/video_generation/${id}`, { headers: h });
    const st = String(s.status || s.data?.status || '').toLowerCase();
    if (st === 'succeeded' || st === 'success') return s;
    if (st === 'failed' || st === 'fail') throw erro(`Hailuo: ${JSON.stringify(s.error || s.base_resp || s).slice(0, 200)}`);
  });
  await baixar(acharVideo(fim), saida);
}

// ---------- Higgsfield Cloud ----------
async function higgsfield(env, { prompt, imagem, formato, duracao, modelo, saida }) {
  const k = chave(env, 'HIGGSFIELD_KEY', 'cloud.higgsfield.ai (formato id:secret)');
  const app = modelo || env.HIGGSFIELD_APP || (() => { throw erro('Informe o app do Higgsfield (ex.: o caminho do modelo de vídeo no catálogo do Higgsfield Cloud) em --modelo ou HIGGSFIELD_APP.'); })();
  const h = { Authorization: `Key ${k}`, 'Content-Type': 'application/json' };
  let image_url;
  if (imagem) {
    const u = await json('https://api.higgsfield.ai/files/generate-upload-url', { method: 'POST', headers: h, body: JSON.stringify({ content_type: mime(imagem) }) });
    const up = await fetch(u.upload_url, { method: 'PUT', headers: u.upload_headers || { 'Content-Type': mime(imagem) }, body: fs.readFileSync(imagem) });
    if (!up.ok) throw erro(`Upload Higgsfield ${up.status}`);
    image_url = u.public_url;
  }
  const r = await json(`https://api.higgsfield.ai/${app.replace(/^\//, '')}`, { method: 'POST', headers: h, body: JSON.stringify({ prompt, ...(image_url ? { image_url } : {}), aspect_ratio: formato || '9:16', ...(duracao ? { duration: duracao } : {}) }) });
  const fim = await poll(async () => {
    const s = await json(r.status_url, { headers: h });
    if (s.status === 'completed') return s;
    if (['failed', 'nsfw', 'canceled'].includes(s.status)) throw erro(`Higgsfield: ${s.status}`);
  });
  const url = acharVideo(fim);
  if (!url) throw erro('Higgsfield terminou sem vídeo no resultado (o app escolhido gera vídeo?).');
  await baixar(url, saida);
}

// ---------- HeyGen Video Agent ----------
async function heygen(env, { prompt, formato, saida }) {
  const k = chave(env, 'HEYGEN_API_KEY', 'app.heygen.com → Settings → API');
  const h = { 'X-Api-Key': k, 'Content-Type': 'application/json' };
  const s0 = await json('https://api.heygen.com/v3/video-agents', { method: 'POST', headers: h, body: JSON.stringify({ prompt, orientation: formato === '16:9' ? 'landscape' : 'portrait' }) });
  const sid = s0.session_id || s0.data?.session_id;
  const videoId = await poll(async () => {
    const s = (await json(`https://api.heygen.com/v3/video-agents/${sid}`, { headers: h })).data || {};
    if (s.status === 'failed' || s.status === 'waiting_for_input') throw erro(`HeyGen: sessão ${s.status}. Abra https://app.heygen.com/video-agent/${sid}`);
    return s.video_id || undefined;
  }, { a: 8000 });
  const v = await poll(async () => {
    const r = (await json(`https://api.heygen.com/v3/videos/${videoId}`, { headers: h })).data || {};
    if (r.status === 'completed' && r.video_url) return r;
    if (r.status === 'failed') throw erro(`HeyGen: ${JSON.stringify(r.failure_message || r.error || '').slice(0, 200)}`);
  }, { a: 8000 });
  await baixar(v.video_url, saida);
}

export const PROVEDORES = {
  google: { nome: 'Google Gemini Omni Flash', chave: 'GEMINI_API_KEY', fn: google, imagem: true, modelos: ['gemini-omni-1.2-flash'] },
  runway: { nome: 'Runway (Veo 3.1, Kling 4, Hailuo 3, Seedance, Gen-4.5)', chave: 'RUNWAYML_API_SECRET', fn: runway, imagem: true, modelos: Object.keys(RUNWAY) },
  hailuo: { nome: 'Hailuo (MiniMax H3)', chave: 'MINIMAX_API_KEY', fn: hailuo, imagem: true, modelos: ['MiniMax-H3', 'MiniMax-H3-Highspeed', 'MiniMax-H3-Lite', 'MiniMax-H3-Max'] },
  higgsfield: { nome: 'Higgsfield Cloud', chave: 'HIGGSFIELD_KEY', fn: higgsfield, imagem: true, modelos: [] },
  heygen: { nome: 'HeyGen Video Agent', chave: 'HEYGEN_API_KEY', fn: heygen, imagem: false, modelos: [] },
};

export async function gerar(provedor, opc, slug) {
  const p = PROVEDORES[provedor] || (() => { throw erro(`Provedor desconhecido: ${provedor}. Use: ${Object.keys(PROVEDORES).join(', ')}`); })();
  if (opc.imagem && !p.imagem) throw erro(`${p.nome} não usa imagem de entrada; mande só o texto.`);
  await p.fn(envCliente(slug), opc);
  if (!fs.existsSync(opc.saida) || fs.statSync(opc.saida).size < 1000) throw erro('O arquivo de vídeo não foi salvo.');
  return opc.saida;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [cmd, prompt, saida, ...a] = process.argv.slice(2);
  const opt = n => { const i = a.indexOf(`--${n}`); return i < 0 ? undefined : a[i + 1]; };
  try {
    if (cmd === 'provedores' || !cmd) {
      const env = envCliente();
      for (const [id, p] of Object.entries(PROVEDORES)) console.log(`${env[p.chave] ? '✔' : '–'} ${id.padEnd(11)} ${p.nome}${env[p.chave] ? '' : `  (falta ${p.chave})`}`);
    } else if (cmd === 'teste') {
      // Offline self-check of the request builders and the URL finder.
      const b = corpoRunway('veo3.1', { prompt: 'x', formato: '9:16', duracao: 7 });
      if (b.ratio !== '720:1280' || b.duration !== 6) throw erro('corpoRunway falhou');
      if (acharVideo({ data: { content: { url: 'https://cdn.x/v.mp4' } } }) !== 'https://cdn.x/v.mp4') throw erro('acharVideo falhou');
      console.log('ok');
    } else {
      await gerar(cmd, { prompt, saida, imagem: opt('imagem'), modelo: opt('modelo'), formato: opt('formato') || '9:16', duracao: opt('duracao') ? +opt('duracao') : undefined }, opt('cliente'));
      console.log(`Salvo ${path.resolve(saida)}`);
    }
  } catch (e) { console.error('ERRO:', e.message); process.exitCode = 1; }
}
