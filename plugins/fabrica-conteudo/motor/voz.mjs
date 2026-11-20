// Narração com ElevenLabs (opcional, pago por uso). Precisa de ELEVENLABS_API_KEY no .env.
//   node motor/voz.mjs vozes                      lista as vozes da conta (escolha uma e ponha "voz" no marca.json)
//   node motor/voz.mjs falar <cliente> "texto" <saida.mp3>
// No reel, basta pôr "fala" em cada cena: o render narra, sincroniza as legendas e ajusta a duração.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { p, envCliente, carregarCliente } from './lib.mjs';

const API = 'https://api.elevenlabs.io/v1';
const chave = slug => envCliente(slug).ELEVENLABS_API_KEY
  || (() => { throw new Error('ELEVENLABS_API_KEY ausente. Crie a chave em elevenlabs.io e coloque no .env da pasta de trabalho.'); })();

// Agrupa palavras em legendas curtas (até `max` palavras, quebrando em pontuação).
export function agrupar(palavras, max = 3) {
  const grupos = [];
  let g = [];
  for (const w of palavras) {
    g.push(w);
    if (g.length >= max || /[.!?,:;]$/.test(w.t)) { grupos.push(g); g = []; }
  }
  if (g.length) grupos.push(g);
  return grupos.map((ws, i) => ({ ini: ws[0].ini, fim: grupos[i + 1]?.[0].ini ?? ws.at(-1).fim + 0.25, palavras: ws }));
}

// Converte o alinhamento por caractere em palavras com início/fim.
export function palavrasDe(al) {
  const out = [];
  let cur = null;
  al.characters.forEach((ch, i) => {
    if (/\s/.test(ch)) { if (cur) out.push(cur); cur = null; return; }
    if (!cur) cur = { t: '', ini: al.character_start_times_seconds[i] };
    cur.t += ch;
    cur.fim = al.character_end_times_seconds[i];
  });
  if (cur) out.push(cur);
  return out;
}

export async function narrar(c, texto, opc = {}) {
  const env = envCliente(c.slug);
  const voz = opc.voz || c.voz || env.ELEVENLABS_VOICE_ID;
  if (!voz) throw new Error('Defina a voz: "voz" no marca.json (id da ElevenLabs) ou ELEVENLABS_VOICE_ID no .env. Liste com: node motor/voz.mjs vozes');
  const modelo = opc.modelo || 'eleven_multilingual_v2';
  const hash = crypto.createHash('sha1').update(`${voz}|${modelo}|${JSON.stringify(c.vozConfig || {})}|${texto}`).digest('hex').slice(0, 16);
  const dir = p('saida', '.cache', 'voz');
  const mp3 = path.join(dir, `${hash}.mp3`);
  const meta = path.join(dir, `${hash}.json`);
  // Cache: the same line is never paid for twice.
  if (!fs.existsSync(mp3) || !fs.existsSync(meta)) {
    const r = await fetch(`${API}/text-to-speech/${voz}/with-timestamps?output_format=mp3_44100_128`, {
      method: 'POST',
      headers: { 'xi-api-key': chave(c.slug), 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: texto, model_id: modelo, ...(c.vozConfig ? { voice_settings: c.vozConfig } : {}) }),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(`ElevenLabs ${r.status}: ${JSON.stringify(j.detail || j)}`);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(mp3, Buffer.from(j.audio_base64, 'base64'));
    fs.writeFileSync(meta, JSON.stringify({ texto, palavras: palavrasDe(j.alignment) }));
  }
  const { palavras } = JSON.parse(fs.readFileSync(meta, 'utf8'));
  return { audio: mp3, palavras, dur: palavras.at(-1)?.fim ?? 0 };
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [cmd, ...a] = process.argv.slice(2);
  try {
    if (cmd === 'vozes') {
      const r = await fetch(`${API}/voices`, { headers: { 'xi-api-key': chave(a[0]) } });
      const j = await r.json();
      if (!r.ok) throw new Error(JSON.stringify(j));
      for (const v of j.voices) console.log(`${v.voice_id}  ${v.name}  ${Object.values(v.labels || {}).join(', ')}`);
    } else if (cmd === 'falar') {
      const [slug, texto, saida, voz] = a;
      const r = await narrar(carregarCliente(slug), texto, voz ? { voz } : {});
      fs.copyFileSync(r.audio, saida);
      console.log(`Salvo ${path.resolve(saida)} (${r.dur.toFixed(1)}s)`);
    } else console.log(fs.readFileSync(new URL(import.meta.url), 'utf8').split('\n').slice(0, 4).join('\n'));
  } catch (e) { console.error('ERRO:', e.message); process.exit(1); }
}
