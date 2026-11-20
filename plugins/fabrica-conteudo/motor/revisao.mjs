// Gera saida/<cliente>/revisao.html: todas as peças com legenda, para aprovação da equipe ou do cliente.
//   node motor/revisao.mjs <cliente> [filtro-de-pasta]
// A página usa caminhos relativos: dá para zipar a pasta saida/<cliente> e enviar.
import fs from 'node:fs';
import path from 'node:path';
import { p, lerJson, carregarCliente } from './lib.mjs';

const [slug, filtro = ''] = process.argv.slice(2);
if (!slug) { console.error('Uso: node motor/revisao.mjs <cliente> [filtro]'); process.exit(1); }
const c = carregarCliente(slug);
const base = p('saida', slug);
const esc = s => String(s ?? '').replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));

const pecas = [];
(function andar(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const f = path.join(d, e.name);
    if (e.isDirectory()) andar(f);
    else if (e.name === 'peca.json' && f.includes(filtro)) pecas.push({ dir: d, ...lerJson(f) });
  }
})(base);
pecas.sort((a, b) => a.dir.localeCompare(b.dir));

const fila = fs.existsSync(p('fila')) ? fs.readdirSync(p('fila')).filter(f => f.endsWith('.json')).map(f => lerJson(p('fila', f))) : [];
const agendado = dir => fila.find(i => p(i.pasta) === dir);

const card = pc => {
  const rel = path.relative(base, pc.dir).split(path.sep).join('/');
  const midia = pc.arquivos.map(a => a.endsWith('.mp4')
    ? `<video src="${rel}/${a}" controls loop muted playsinline poster="${rel}/capa.jpg"></video>`
    : `<img src="${rel}/${a}" loading="lazy">`).join('');
  const ag = agendado(pc.dir);
  return `<article class="card">
<div class="midia ${pc.arquivos.length > 1 ? 'varias' : ''} f-${pc.formato}">${midia}</div>
<div class="info"><div class="tags"><span>${esc(pc.tipo)}</span><span>${esc(pc.formato)}</span>${ag ? `<span class="ag">${esc(ag.status)} · ${new Date(ag.quando).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}</span>` : ''}</div>
<h3>${esc(path.basename(pc.dir))}</h3>
${pc.avisos?.length ? `<p class="aviso">⚠ ${pc.avisos.map(esc).join('<br>⚠ ')}</p>` : ''}
<pre>${esc(pc.legenda)}</pre></div></article>`;
};

const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Revisão · ${esc(c.nome)}</title>
<style>
:root{--bg:#f5f4f1;--card:#fff;--t:#1b1a18;--m:#6d6a64;--l:#e4e1db;--ac:${c.cores.primaria}}
@media (prefers-color-scheme:dark){:root{--bg:#141413;--card:#1e1d1b;--t:#f1efe9;--m:#a19d95;--l:#2e2c29}}
*{box-sizing:border-box;margin:0}body{background:var(--bg);color:var(--t);font:15px/1.5 system-ui,-apple-system,'Segoe UI',sans-serif;padding:32px 16px}
header{max-width:1400px;margin:0 auto 28px;display:flex;justify-content:space-between;align-items:end;gap:16px;flex-wrap:wrap}
h1{font-size:28px;letter-spacing:-.02em}header p{color:var(--m)}
.grid{max-width:1400px;margin:0 auto;display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:20px}
.card{background:var(--card);border:1px solid var(--l);border-radius:14px;overflow:hidden;display:flex;flex-direction:column}
.midia{display:flex;gap:6px;overflow-x:auto;scroll-snap-type:x mandatory;background:#000}
.midia img,.midia video{width:100%;flex:none;scroll-snap-align:start;display:block}
.midia.varias img{width:88%}
.info{padding:14px 16px 18px}
.tags{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px}.tags span{font-size:12px;padding:2px 8px;border-radius:99px;background:var(--bg);color:var(--m)}
.tags .ag{background:var(--ac);color:#fff}
h3{font-size:14px;margin-bottom:8px;word-break:break-all}
pre{white-space:pre-wrap;font-family:inherit;font-size:13px;color:var(--m)}
.aviso{font-size:13px;color:#b45309;margin-bottom:8px}
</style></head><body>
<header><div><h1>${esc(c.nome)} · revisão de conteúdo</h1><p>${pecas.length} peça(s) · gerado em ${new Date().toLocaleString('pt-BR')}</p></div><p>Deslize para ver todos os slides de um carrossel.</p></header>
<main class="grid">${pecas.map(card).join('\n')}</main></body></html>`;

const saida = path.join(base, 'revisao.html');
fs.writeFileSync(saida, html);
console.log(saida);
