import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// The engine lives in <workspace>/motor, so the workspace is its parent (works from Task Scheduler too).
export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const p = (...a) => path.resolve(ROOT, ...a);

const MIME = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.gif': 'image/gif', '.mp4': 'video/mp4' };
export const mime = f => MIME[path.extname(f).toLowerCase()] || 'application/octet-stream';
export const dataUri = f => `data:${mime(f)};base64,${fs.readFileSync(f).toString('base64')}`;
export const lerJson = f => JSON.parse(fs.readFileSync(f, 'utf8'));
export const salvarJson = (f, o) => { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, JSON.stringify(o, null, 2)); };

export function findBrowser() {
  const c = [
    process.env.CHROME_PATH,
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
    '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/microsoft-edge',
  ].filter(Boolean);
  const f = c.find(x => fs.existsSync(x));
  if (!f) throw new Error('Chrome ou Edge não encontrado. Instale um deles ou defina CHROME_PATH.');
  return f;
}

export function lerEnv(arquivo) {
  if (!fs.existsSync(arquivo)) return {};
  const out = {};
  for (const l of fs.readFileSync(arquivo, 'utf8').split(/\r?\n/)) {
    const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
  return out;
}

// Workspace .env (FAL_KEY etc.) merged with the client's own .env (Meta tokens).
export const envCliente = slug => ({ ...lerEnv(p('.env')), ...(slug ? lerEnv(p('clientes', slug, '.env')) : {}), ...process.env });

export function carregarCliente(slug) {
  const dir = p('clientes', slug);
  const f = path.join(dir, 'marca.json');
  if (!fs.existsSync(f)) throw new Error(`Cliente "${slug}" não existe (${f}). Rode /fabrica-conteudo:novo-cliente.`);
  const c = lerJson(f);
  c.slug = slug;
  c.dir = dir;
  c.cores = { primaria: '#222222', secundaria: '#F2C14E', fundo: '#FFFFFF', texto: '#111111', ...c.cores };
  return c;
}

// Accepts a product key from marca.json or a path (relative to the client folder or the workspace).
export function resolverImagem(c, ref) {
  if (!ref) return null;
  const prod = c.produtos?.[ref];
  const rel = prod ? prod.foto : ref;
  for (const cand of [path.resolve(c.dir, rel), p(rel), path.resolve(rel)]) if (fs.existsSync(cand)) return cand;
  throw new Error(`Imagem não encontrada: ${rel}`);
}
