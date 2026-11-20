// Baixa as fontes da marca (Google Fonts, TrueType) para legendas burned-in do ffmpeg-skill.
//   node motor/fonte.mjs <cliente>   imprime a pasta (--fonts-dir) e os nomes (--font) para o caption.py
import fs from 'node:fs';
import path from 'node:path';
import { p, carregarCliente } from './lib.mjs';

// Family name libass matches on (TrueType "name" table, id 1, Windows platform), e.g. "Manrope ExtraBold".
export function nomeInterno(arq) {
  const b = fs.readFileSync(arq);
  let tab = 0;
  for (let i = 0; i < b.readUInt16BE(4); i++) if (b.toString('latin1', 12 + 16 * i, 16 + 16 * i) === 'name') tab = b.readUInt32BE(12 + 16 * i + 8);
  const base = tab + b.readUInt16BE(tab + 4);
  for (let i = 0; i < b.readUInt16BE(tab + 2); i++) {
    const r = tab + 6 + 12 * i;
    if (b.readUInt16BE(r) === 3 && b.readUInt16BE(r + 6) === 1) {
      let s = '';
      for (let k = 0; k < b.readUInt16BE(r + 8); k += 2) s += String.fromCharCode(b.readUInt16BE(base + b.readUInt16BE(r + 10) + k));
      return s;
    }
  }
  return null;
}

// Without a browser User-Agent, Google Fonts serves .ttf URLs, which libass can load.
export async function baixarFonte(familia, peso = 800) {
  const dir = p('saida', '.cache', 'fontes');
  const arq = path.join(dir, `${familia.replace(/\W+/g, '_')}-${peso}.ttf`);
  if (!fs.existsSync(arq)) {
    const css = await (await fetch(`https://fonts.googleapis.com/css2?family=${encodeURIComponent(familia).replace(/%20/g, '+')}:wght@${peso}`)).text();
    const url = css.match(/url\((https:[^)]+\.ttf)\)/)?.[1];
    if (!url) throw new Error(`Fonte "${familia}" peso ${peso} não encontrada no Google Fonts`);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(arq, Buffer.from(await (await fetch(url)).arrayBuffer()));
  }
  return { dir, nome: nomeInterno(arq) };
}

const slug = process.argv[2];
if (!slug) { console.error('Uso: node motor/fonte.mjs <cliente>'); process.exitCode = 1; }
else {
  try {
    const c = carregarCliente(slug);
    const corpo = c.fontes?.corpo || c.fonte || 'Montserrat';
    const titulo = c.fontes?.titulo || corpo;
    const leg = await baixarFonte(corpo);
    const tit = await baixarFonte(titulo);
    console.log(JSON.stringify({ fontsDir: leg.dir, fonteLegenda: leg.nome, fonteTitulo: tit.nome, destaque: c.cores.secundaria, primaria: c.cores.primaria }, null, 2));
  } catch (e) { console.error('ERRO:', e.message); process.exitCode = 1; }
}
