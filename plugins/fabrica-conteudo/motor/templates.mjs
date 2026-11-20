import fs from 'node:fs';
import { createRequire } from 'node:module';
import { dataUri, resolverImagem } from './lib.mjs';

const require = createRequire(import.meta.url);
const GSAP = ['gsap/dist/gsap.min.js', 'gsap/dist/SplitText.min.js'].map(f => fs.readFileSync(require.resolve(f), 'utf8')).join('\n');

// ---------- helpers ----------
const esc = s => String(s ?? '').replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
// *palavra* vira destaque na cor de acento; \n quebra linha.
const rich = s => esc(s).replace(/\*(.+?)\*/g, '<em>$1</em>').replace(/\n/g, '<br>');

function lum(hex) {
  const h = hex.replace('#', '');
  const [r, g, b] = [0, 2, 4].map(i => parseInt(h.length === 3 ? h[i / 2].repeat(2) : h.slice(i, i + 2), 16) / 255)
    .map(v => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
const contraste = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };
// Cor de texto legível sobre um fundo: branco ou a cor de texto da marca.
const sobre = (bg, escuro) => (contraste(bg, '#ffffff') >= contraste(bg, escuro) ? '#ffffff' : escuro);

function preco(str) {
  const m = String(str ?? '').match(/^(\D*?)\s*(\d[\d.]*)(,\d+)?\s*$/);
  if (!m) return `<span class="int">${esc(str)}</span>`;
  return `${m[1] ? `<span class="moeda">${esc(m[1])}</span>` : ''}<span class="int">${m[2]}</span>${m[3] ? `<span class="cent">${m[3]}</span>` : ''}`;
}

const ICONES = {
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  estrela: '<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/>',
  coracao: '<path d="M12 20s-7-4.4-7-10a4 4 0 017-2.6A4 4 0 0119 10c0 5.6-7 10-7 10z"/>',
  gota: '<path d="M12 3s6 6.6 6 11a6 6 0 01-12 0c0-4.4 6-11 6-11z"/>',
  folha: '<path d="M5 19c0-8 5-14 15-14 0 10-6 15-14 15M5 19l7-7"/>',
  raio: '<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>',
  escudo: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/>',
  relogio: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  caminhao: '<path d="M3 6h11v10H3zM14 10h4l3 3v3h-7"/><circle cx="7" cy="18" r="1.8"/><circle cx="17" cy="18" r="1.8"/>',
  brilho: '<path d="M12 3c.6 4.6 2.4 6.4 7 7-4.6.6-6.4 2.4-7 7-.6-4.6-2.4-6.4-7-7 4.6-.6 6.4-2.4 7-7z"/>',
  seta: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  codigo: '<path d="M8 7l-5 5 5 5M16 7l5 5-5 5M13.5 4l-3 16"/>',
  play: '<path d="M7 4.5v15l12-7.5z"/>',
  tesoura: '<circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M8.5 7.5L20 18M8.5 16.5L20 6"/>',
  audio: '<path d="M3 12h1M7 8v8M11 5v14M15 8v8M19 10v4"/>',
  grafico: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  chat: '<path d="M4 5h16v11H9l-5 4z"/>',
  lupa: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>',
  calendario: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  usuario: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1-4.5 4-6.5 8-6.5s7 2 8 6.5"/>',
  link: '<path d="M10 14a4 4 0 005.7 0l3-3a4 4 0 00-5.7-5.7l-1 1M14 10a4 4 0 00-5.7 0l-3 3a4 4 0 005.7 5.7l1-1"/>',
  nuvem: '<path d="M7 18h10a4 4 0 000-8 6 6 0 00-11.5 1.5A3.5 3.5 0 007 18z"/>',
  cadeado: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 018 0v4"/>',
  dinheiro: '<rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="3"/>',
  engrenagem: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9L7 7M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1"/>',
  camadas: '<path d="M12 3l9 5-9 5-9-5zM3 13l9 5 9-5"/>',
};
const icone = n => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICONES[n] || ICONES.check}</svg>`;
const GRAO = `url("data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300"><filter id="n"><feTurbulence type="fractalNoise" baseFrequency=".85" numOctaves="3" stitchTiles="stitch"/></filter><rect width="100%" height="100%" filter="url(#n)"/></svg>')}")`;

// ---------- design tokens ----------
function tokens(c, w) {
  const { primaria: p, secundaria: s, fundo: f, texto: t } = c.cores;
  const ft = c.fontes?.titulo || c.fonte || 'Montserrat';
  const fc = c.fontes?.corpo || c.fonte || 'Inter';
  const fm = c.fontes?.mono || 'JetBrains Mono';
  return `:root{--u:${w / 100}px;--p:${p};--s:${s};--f:${f};--t:${t};--ft:'${ft}';--fc:'${fc}';--fm:'${fm}';--leg:${s};
--on-p:${sobre(p, t)};--on-s:${sobre(s, t)}}
.estilo-premium{--bg1:color-mix(in srgb,${p} 45%,#050505);--bg2:color-mix(in srgb,${p} 12%,#020202);--ink:${f};--muted:color-mix(in srgb,${f} 68%,transparent);--ac:${s};--on-ac:${sobre(s, t)};--linha:color-mix(in srgb,${f} 18%,transparent);--card:rgba(255,255,255,.06);--painel:color-mix(in srgb,${p} 30%,#08060a);--on-painel:${f}}
.estilo-vibrante{--bg1:${p};--bg2:color-mix(in srgb,${p} 78%,#000);--ink:${sobre(p, t)};--muted:color-mix(in srgb,${sobre(p, t)} 78%,transparent);--ac:${s};--on-ac:${sobre(s, t)};--linha:color-mix(in srgb,${sobre(p, t)} 25%,transparent);--card:rgba(255,255,255,.12);--painel:${s};--on-painel:${sobre(s, t)}}
.estilo-clean{--bg1:${f};--bg2:color-mix(in srgb,${f} 88%,${p});--ink:${t};--muted:color-mix(in srgb,${t} 62%,transparent);--ac:${p};--on-ac:${sobre(p, t)};--linha:color-mix(in srgb,${t} 14%,transparent);--card:#ffffff;--painel:${p};--on-painel:${sobre(p, t)}}
.estilo-quadro{--bg1:color-mix(in srgb,${f} 35%,#fff);--bg2:#fff;--ink:${t};--muted:color-mix(in srgb,${t} 60%,transparent);--ac:${p};--on-ac:${sobre(p, t)};--linha:color-mix(in srgb,${t} 11%,transparent);--card:#ffffff;--painel:${p};--on-painel:${sobre(p, t)};--grade:color-mix(in srgb,${t} 6%,transparent)}`;
}

const CSS = `
*{margin:0;padding:0;box-sizing:border-box}
html,body{overflow:hidden;background:#000;-webkit-font-smoothing:antialiased;font-kerning:normal}
.cena{position:absolute;inset:0;overflow:hidden;color:var(--ink);font-family:var(--fc),system-ui,sans-serif}
.video .cena{visibility:hidden}
.camada{position:absolute;inset:0;overflow:hidden}
.bg{position:absolute;inset:-3%;background:radial-gradient(55% 40% at 50% 58%,color-mix(in srgb,var(--ac) 26%,transparent),transparent 72%),radial-gradient(130% 90% at 50% 0%,var(--bg1),var(--bg2))}
.estilo-vibrante .bg{background:radial-gradient(70% 50% at 70% 30%,color-mix(in srgb,var(--bg1) 80%,#fff),transparent 70%),linear-gradient(160deg,var(--bg1),var(--bg2))}
.bg.foto{background-size:cover;background-position:center}
.veu{position:absolute;inset:0;background:linear-gradient(180deg,color-mix(in srgb,var(--bg2) 85%,transparent) 0%,transparent 38%,transparent 55%,color-mix(in srgb,var(--bg2) 90%,transparent) 100%)}
.grao{position:absolute;inset:0;background-image:${GRAO};opacity:.13;mix-blend-mode:overlay;pointer-events:none}
.blob{position:absolute;border-radius:50%;background:var(--ac);opacity:.9}
.anel{position:absolute;border-radius:50%;border:calc(var(--u)*.25) solid var(--linha)}
.conteudo{position:absolute;inset:0;display:flex;flex-direction:column;padding:calc(var(--u)*7.2);overflow:hidden}
.fmt-story .conteudo{padding:calc(var(--u)*19) calc(var(--u)*7.2) calc(var(--u)*26)}
.tipo-video.fmt-story .conteudo{padding:calc(var(--u)*20) calc(var(--u)*8.5) calc(var(--u)*40)}
.topo{display:flex;align-items:center;justify-content:space-between;gap:calc(var(--u)*3);font:600 calc(var(--u)*2.3)/1 var(--fc);letter-spacing:.12em;text-transform:uppercase;color:var(--muted);flex:none}
.topo .marca{font:700 calc(var(--u)*3.2)/1 var(--ft);letter-spacing:.02em;text-transform:none;color:var(--ink)}
.topo img{height:calc(var(--u)*6.5);width:auto;max-width:calc(var(--u)*30);object-fit:contain}
.eyebrow{display:flex;align-items:center;gap:calc(var(--u)*1.6);font:700 calc(var(--u)*2.3)/1.2 var(--fc);letter-spacing:.22em;text-transform:uppercase;color:var(--ac);margin-bottom:calc(var(--u)*2.4)}
.eyebrow::before{content:'';width:calc(var(--u)*5);height:calc(var(--u)*.3);background:currentColor}
h1{font-family:var(--ft),Georgia,serif;font-weight:800;font-size:calc(var(--u)*var(--h1,9.2));line-height:1.02;letter-spacing:-.025em;color:var(--ink);text-wrap:balance}
h1 em{font-style:italic;color:var(--ac)}
.sub{font:400 calc(var(--u)*3.5)/1.42 var(--fc);color:var(--muted);margin-top:calc(var(--u)*2.6);max-width:92%;text-wrap:pretty}
.bloco{flex:none}
.flex{flex:1 1 0;min-height:0}
.produto{position:relative;flex:1 1 0;min-height:var(--minprod,32%);display:flex;align-items:center;justify-content:center;margin:calc(var(--u)*2.5) 0}
.produto .halo{position:absolute;left:50%;top:50%;width:min(80%,calc(var(--u)*80));aspect-ratio:1;transform:translate(-50%,-50%);border-radius:50%;background:radial-gradient(closest-side,color-mix(in srgb,var(--ac) 42%,transparent),transparent)}
.estilo-clean .produto .halo{background:radial-gradient(closest-side,color-mix(in srgb,var(--ac) 16%,transparent),transparent)}
.produto .flutua{position:relative;height:100%;width:100%;display:flex;align-items:center;justify-content:center}
.produto img{max-height:100%;max-width:82%;object-fit:contain;filter:drop-shadow(0 calc(var(--u)*2.5) calc(var(--u)*3) rgba(0,0,0,.38))}
.estilo-premium .produto img{-webkit-box-reflect:below calc(var(--u)*.4) linear-gradient(transparent 78%,rgba(255,255,255,.16))}
.hero .produto:has(+ .rodape),.oferta .produto:has(+ .rodape){margin-bottom:calc(var(--u)*-12)}
.rodape{position:relative;z-index:3}
.selo{position:absolute;top:4%;right:8%;width:calc(var(--u)*21);aspect-ratio:1;border-radius:50%;background:var(--ac);color:var(--on-ac);display:flex;flex-direction:column;align-items:center;justify-content:center;font:900 calc(var(--u)*6.4)/.95 var(--ft);letter-spacing:-.03em;text-align:center;box-shadow:0 calc(var(--u)*1.5) calc(var(--u)*4) rgba(0,0,0,.3);transform:rotate(-12deg);z-index:2}
.selo small{display:block;font:700 calc(var(--u)*2)/1.1 var(--fc);letter-spacing:.12em;text-transform:uppercase}
.rodape{display:flex;align-items:flex-end;justify-content:space-between;gap:calc(var(--u)*3);flex:none}
.preco{display:flex;flex-direction:column;color:var(--ink)}
.preco .de{font:500 calc(var(--u)*2.8)/1.2 var(--fc);color:var(--muted);text-decoration:line-through;text-decoration-thickness:.12em}
.preco .por{display:flex;align-items:flex-start;font-family:var(--ft);font-weight:900;line-height:.9;letter-spacing:-.03em}
.preco .moeda{font-size:calc(var(--u)*3.6);margin:calc(var(--u)*1) calc(var(--u)*.8) 0 0}
.preco .int{font-size:calc(var(--u)*11)}
.preco .cent{font-size:calc(var(--u)*4.6);margin-top:calc(var(--u)*.6)}
.preco .rot{font:700 calc(var(--u)*2.1)/1.2 var(--fc);letter-spacing:.18em;text-transform:uppercase;color:var(--ac);margin-bottom:calc(var(--u)*.8)}
.cta{display:inline-flex;align-items:center;gap:calc(var(--u)*1.6);background:var(--ac);color:var(--on-ac);font:700 calc(var(--u)*3.2)/1 var(--fc);padding:calc(var(--u)*2.6) calc(var(--u)*4.6);border-radius:999px;box-shadow:0 calc(var(--u)*1.2) calc(var(--u)*3.5) color-mix(in srgb,var(--ac) 40%,transparent);white-space:nowrap;margin-left:auto}
.cta svg,.arraste svg{width:1.1em;height:1.1em}
.faixa{margin:0 calc(var(--u)*-12) calc(var(--u)*3);transform:rotate(-2.5deg);background:var(--ac);color:var(--on-ac);font:800 calc(var(--u)*2.8)/1 var(--fc);letter-spacing:.16em;text-transform:uppercase;padding:calc(var(--u)*2) 0;white-space:nowrap;overflow:hidden;flex:none}
.faixa .trilha{display:inline-block}
.gigante{position:absolute;left:50%;top:44%;transform:translate(-50%,-50%);font:900 calc(var(--u)*34)/.8 var(--ft);letter-spacing:-.05em;white-space:nowrap;color:transparent;-webkit-text-stroke:calc(var(--u)*.22) var(--linha);text-transform:uppercase}
.estilo-vibrante .gigante,.estilo-clean .gigante{-webkit-text-stroke:0;color:color-mix(in srgb,var(--ac) 14%,transparent)}
.meta{display:flex;justify-content:space-between;border-top:1px solid var(--linha);border-bottom:1px solid var(--linha);padding:calc(var(--u)*1.6) 0;font:600 calc(var(--u)*2)/1 var(--fc);letter-spacing:.2em;text-transform:uppercase;color:var(--muted);margin-top:calc(var(--u)*3);flex:none}
/* split */
.split .conteudo{padding:0;flex-direction:row}
.split .painel{width:54%;background:var(--painel);color:var(--on-painel);padding:calc(var(--u)*7.2);display:flex;flex-direction:column;--ink:var(--on-painel);--muted:color-mix(in srgb,var(--on-painel) 72%,transparent)}
.split .lado{flex:1;display:flex;padding:calc(var(--u)*5)}
.split .lado .produto{margin:0}
.split .conteudo>.pontos{position:absolute;left:0;right:0;bottom:calc(var(--u)*4)}
.split .produto img{max-width:100%}
.split.fmt-story .conteudo{flex-direction:column-reverse}
.split.fmt-story .painel{width:100%;height:50%;padding:calc(var(--u)*8) calc(var(--u)*7.2) calc(var(--u)*26);border-radius:calc(var(--u)*7) calc(var(--u)*7) 0 0}
.split.fmt-story .lado{padding:calc(var(--u)*19) calc(var(--u)*7.2) calc(var(--u)*2)}
.split .painel h1 em{color:inherit;background:linear-gradient(transparent 60%,color-mix(in srgb,var(--s) 70%,transparent) 60% 92%,transparent 92%)}
.split .painel .eyebrow{color:inherit;opacity:.75}
.split .painel .cta{margin-left:0;align-self:flex-start;background:var(--ink);color:var(--painel);box-shadow:none}
/* capa */
.capa{--h1:12.5}
.capa .canto{position:absolute;right:-6%;bottom:-8%;height:50%;width:46%;display:flex;align-items:flex-end;justify-content:flex-end}
.capa .canto .flutua{height:100%;width:100%;display:flex;align-items:flex-end;justify-content:flex-end}
.capa .canto img{max-height:100%;max-width:100%;transform:rotate(-9deg);filter:drop-shadow(0 calc(var(--u)*3) calc(var(--u)*4) rgba(0,0,0,.4))}
.capa h1{max-width:96%}
.capa .sub{max-width:62%}
.arraste{display:inline-flex;align-items:center;gap:calc(var(--u)*1.4);font:700 calc(var(--u)*2.6)/1 var(--fc);letter-spacing:.1em;text-transform:uppercase;color:var(--ink);border:calc(var(--u)*.25) solid var(--linha);padding:calc(var(--u)*2) calc(var(--u)*3.4);border-radius:999px;align-self:flex-start;flex:none}
/* lista */
.lista{--h1:9}
.num{font:900 calc(var(--u)*24)/.85 var(--ft);letter-spacing:-.05em;color:transparent;-webkit-text-stroke:calc(var(--u)*.3) var(--ac);margin:calc(var(--u)*4) 0 calc(var(--u)*3);flex:none}
.lista .sub{font-size:calc(var(--u)*4.3)}
.progresso{display:flex;gap:calc(var(--u)*1.2);align-items:center;flex:none}
.progresso i{flex:1;height:calc(var(--u)*.6);border-radius:9px;background:var(--linha)}
.progresso i.on{background:var(--ac)}
.progresso .arraste{border:0;padding:0 0 0 calc(var(--u)*2);color:var(--ac)}
/* beneficios */
.beneficios{--h1:7.4}
.duo{flex:1 1 0;min-height:0;display:flex;gap:calc(var(--u)*4);align-items:center;margin-top:calc(var(--u)*3)}
.duo .produto{flex:0 0 42%;height:100%;margin:0;min-height:0}
.itens{flex:1;display:flex;flex-direction:column;gap:calc(var(--u)*2.6)}
.item{display:flex;align-items:center;gap:calc(var(--u)*2.4);background:var(--card);border:1px solid var(--linha);border-radius:calc(var(--u)*3);padding:calc(var(--u)*2.4);font:600 calc(var(--u)*3.1)/1.25 var(--fc);color:var(--ink)}
.estilo-clean .item{box-shadow:0 calc(var(--u)*.8) calc(var(--u)*3) rgba(0,0,0,.06);border-color:transparent}
.item .ic{flex:none;width:calc(var(--u)*8);height:calc(var(--u)*8);border-radius:50%;background:var(--ac);color:var(--on-ac);display:flex;align-items:center;justify-content:center}
.item .ic svg{width:55%;height:55%}
.fmt-story .duo{flex-direction:column}
.fmt-story .duo .produto{flex:1 1 0;width:100%}
.fmt-story .itens{flex:none;width:100%}
/* depoimento */
.depoimento{--h1:6.2}
.aspas{font:900 calc(var(--u)*22)/1 var(--ft);color:var(--ac);height:calc(var(--u)*11);margin-top:calc(var(--u)*3);overflow:hidden;flex:none}
.depoimento h1{font-weight:500;letter-spacing:-.01em;line-height:1.15}
.estrelas{display:flex;gap:calc(var(--u)*.8);color:var(--ac);margin-top:calc(var(--u)*4);flex:none}
.estrelas svg{width:calc(var(--u)*5);height:calc(var(--u)*5);fill:currentColor}
.autor{margin-top:calc(var(--u)*2.4);font:700 calc(var(--u)*3)/1.3 var(--fc);color:var(--ink);flex:none}
.autor span{display:block;font-weight:400;font-size:calc(var(--u)*2.5);color:var(--muted)}
.depoimento .produto{--minprod:14%}
/* estilo quadro + educativos */
.estilo-quadro .bg{background:radial-gradient(38% 28% at 100% 0%,color-mix(in srgb,var(--s) 24%,transparent),transparent 70%),linear-gradient(var(--grade) 1px,transparent 1px) 0 0/calc(var(--u)*3.6) calc(var(--u)*3.6),linear-gradient(90deg,var(--grade) 1px,transparent 1px) 0 0/calc(var(--u)*3.6) calc(var(--u)*3.6),var(--bg1)}
.estilo-quadro .grao{display:none}
.estilo-quadro h1{letter-spacing:-.045em}
.autor-pill{display:inline-flex;align-items:center;gap:calc(var(--u)*1.4);background:var(--card);border:1px solid var(--linha);border-radius:999px;padding:calc(var(--u)*.8) calc(var(--u)*2.6) calc(var(--u)*.8) calc(var(--u)*.8);font:500 calc(var(--u)*2.3)/1 var(--fc);color:var(--muted);text-transform:none;letter-spacing:0;box-shadow:0 calc(var(--u)*.6) calc(var(--u)*2.4) rgba(0,0,0,.08)}
.autor-pill img{width:calc(var(--u)*5.6);height:calc(var(--u)*5.6);border-radius:50%;object-fit:cover}
.autor-pill b{color:var(--ink);font-weight:700}
.estilo-premium .autor-pill,.estilo-vibrante .autor-pill{background:rgba(255,255,255,.1)}
.titulo-linha{display:flex;align-items:center;gap:calc(var(--u)*3)}.titulo-linha h1{flex:1}
.titulo-linha .mini{height:calc(var(--u)*12);width:auto;max-width:34%;object-fit:contain}
.abas{display:flex;justify-content:space-between;align-items:center;background:var(--card);border:1px solid var(--linha);border-radius:calc(var(--u)*2.4);padding:calc(var(--u)*1.1);margin-top:calc(var(--u)*3.6);box-shadow:0 calc(var(--u)*.6) calc(var(--u)*2.4) rgba(0,0,0,.06);flex:none}
.aba{font:600 calc(var(--u)*1.9)/1 var(--fm),monospace;letter-spacing:.06em;text-transform:uppercase;color:var(--muted);padding:calc(var(--u)*1.3) calc(var(--u)*1.5);border-radius:calc(var(--u)*1.6);white-space:nowrap;border:calc(var(--u)*.2) solid transparent}
.aba::before{content:'●';font-size:.7em;margin-right:.7em;opacity:.5}
.aba.on{color:var(--ac);border-color:var(--ac);background:color-mix(in srgb,var(--ac) 9%,var(--card))}
.aba.on::before{opacity:1}
.cardlist{flex:1 1 0;min-height:0;display:flex;flex-direction:column;justify-content:center;gap:calc(var(--u)*1.7*var(--k,1));margin-top:calc(var(--u)*3)}
.card{display:flex;align-items:center;gap:1.1em;background:var(--card);border:1px solid var(--linha);border-radius:1em;padding:.75em 1.1em;font-size:calc(var(--u)*2.9*var(--k,1));box-shadow:0 .25em .9em rgba(0,0,0,.05)}
.cic{flex:none;width:2.7em;height:2.7em;border-radius:.75em;border:1px solid var(--linha);display:flex;align-items:center;justify-content:center;background:var(--card);overflow:hidden;color:var(--ac)}
.cic svg{width:55%;height:55%}.cic img{width:76%;height:76%;object-fit:contain}.cic .emoji{font-size:1.5em;line-height:1}
.cmeio{flex:1;min-width:0}
.cnome{display:flex;align-items:baseline;gap:.6em;flex-wrap:wrap}
.cnome b{font:700 1.12em/1.15 var(--fm),monospace;color:var(--ink);letter-spacing:-.01em}
.cnome i{font-style:normal;font-weight:500;color:var(--ac);font-size:.95em}
.card p{color:var(--muted);font-size:.9em;line-height:1.3;margin-top:.2em}
.cdir{display:flex;flex-direction:column;align-items:flex-end;gap:.35em;flex:none}
.cnum{font:700 1.4em/1 var(--fm),monospace;color:var(--ac)}
.cselo{font:700 .72em/1 var(--fm),monospace;letter-spacing:.1em;text-transform:uppercase;color:var(--ac);background:color-mix(in srgb,var(--ac) 12%,transparent);padding:.45em .8em;border-radius:.5em;white-space:nowrap}
.pontos{display:flex;gap:calc(var(--u)*1);justify-content:center;flex:none;margin-top:calc(var(--u)*2.6)}
.pontos i{width:calc(var(--u)*1.1);height:calc(var(--u)*1.1);border-radius:9px;background:var(--linha)}
.pontos i.on{width:calc(var(--u)*3.6);background:var(--ac)}
.etiqueta{display:inline-block;font:700 calc(var(--u)*3)/1 var(--fc);color:var(--ac);background:color-mix(in srgb,var(--ac) 12%,var(--card));padding:calc(var(--u)*1.4) calc(var(--u)*2.6);border-radius:calc(var(--u)*1.6);margin-bottom:calc(var(--u)*2.4)}
.janela{flex:1 1 0;min-height:30%;display:flex;flex-direction:column;margin-top:calc(var(--u)*3.4);border-radius:calc(var(--u)*2.4);overflow:hidden;background:#111;border:calc(var(--u)*.5) solid color-mix(in srgb,var(--ac) 55%,#fff);box-shadow:0 calc(var(--u)*2) calc(var(--u)*5) rgba(0,0,0,.22)}
.barra-jan{display:flex;align-items:center;gap:calc(var(--u)*1);padding:calc(var(--u)*1.4) calc(var(--u)*2);background:#1b1b1d;flex:none}
.barra-jan i{width:calc(var(--u)*1.4);height:calc(var(--u)*1.4);border-radius:50%;background:#ff5f57}.barra-jan i:nth-child(2){background:#febc2e}.barra-jan i:nth-child(3){background:#28c840}
.barra-jan span{margin-left:calc(var(--u)*2);flex:1;font:500 calc(var(--u)*1.9)/1 var(--fm),monospace;color:#bbb;background:#2a2a2d;border-radius:99px;padding:calc(var(--u)*.9) calc(var(--u)*2)}
.tela{flex:1;min-height:0;overflow:hidden}
.tela img{width:100%;height:100%;object-fit:cover;object-position:top center;display:block}
.feats{display:grid;grid-template-columns:1fr 1fr;gap:calc(var(--u)*2*var(--k,1));margin-top:calc(var(--u)*3);flex:none}
.feat{display:flex;gap:.8em;align-items:center;background:var(--card);border:1px solid var(--linha);border-radius:.9em;padding:.8em;font-size:calc(var(--u)*2.5*var(--k,1))}
.feat .cic{width:2.6em;height:2.6em;background:color-mix(in srgb,var(--ac) 12%,var(--card));border:0}
.feat b{display:block;font:700 1.08em/1.2 var(--fc);color:var(--ink)}.feat span{color:var(--muted);font-size:.92em;line-height:1.25}
.cmp{flex:1 1 0;min-height:0;display:flex;align-items:center;gap:calc(var(--u)*2.4);font-size:calc(var(--u)*3*var(--k,1))}
.cmp>div{flex:1;background:var(--card);border:1px solid var(--linha);border-radius:1em;padding:1.4em 1em;text-align:center;display:flex;flex-direction:column;align-items:center;gap:.4em}
.cmp .rot{font:700 .85em/1 var(--fc);padding:.5em 1em;border-radius:.6em;background:color-mix(in srgb,var(--ink) 55%,var(--card));color:var(--card)}
.cmp .lado-b{border:.12em solid var(--ac);background:color-mix(in srgb,var(--ac) 7%,var(--card))}
.cmp .lado-b .rot{background:var(--ac);color:var(--on-ac)}
.cmp small{font-weight:700;color:var(--ink);font-size:.9em;margin-top:.6em}
.cmp strong{font:900 3.2em/1 var(--ft);letter-spacing:-.04em;color:var(--ink)}
.cmp .lado-b strong{color:var(--ac)}
.cmp p{color:var(--muted);font-size:.85em;line-height:1.3}
.seta-cmp{flex:none;width:2.4em;color:var(--ac);display:flex}.seta-cmp svg{width:100%}
.comente{--h1:9.5}
.comente .asterisco{width:calc(var(--u)*13);height:calc(var(--u)*13);color:var(--ac);margin:0 auto calc(var(--u)*4);flex:none}.comente .asterisco svg{width:100%;height:100%;fill:currentColor}
.comente .simbolo{height:calc(var(--u)*18);width:auto;margin:0 auto calc(var(--u)*4);flex:none;object-fit:contain}
.comenta{display:flex;align-items:center;justify-content:center;gap:calc(var(--u)*2);flex-wrap:wrap;margin-top:calc(var(--u)*6);font:800 calc(var(--u)*4.3)/1.1 var(--ft);letter-spacing:-.02em;color:var(--ink);flex:none}
.comenta .palavra{font:700 calc(var(--u)*4.6)/1 var(--fm),monospace;letter-spacing:.14em;color:var(--ac);border:calc(var(--u)*.3) solid var(--ac);border-radius:calc(var(--u)*2);padding:calc(var(--u)*1.6) calc(var(--u)*3);background:var(--card)}
.tcab{display:flex;align-items:center;gap:calc(var(--u)*3);margin-top:calc(var(--u)*4);flex:none}
.tnum{font:900 calc(var(--u)*15)/.9 var(--ft);letter-spacing:-.05em;color:var(--ac);flex:none}
.tcab h1{--h1:8;flex:1}
.timg{flex:1 1 0;min-height:25%;display:flex;align-items:center;justify-content:center;margin:calc(var(--u)*3) 0}
.timg img{max-width:92%;max-height:100%;object-fit:contain}
.tcard{display:flex;align-items:center;gap:calc(var(--u)*3);background:var(--card);border:1px solid var(--linha);border-left:calc(var(--u)*1) solid var(--ac);border-radius:calc(var(--u)*3);padding:calc(var(--u)*3.4);box-shadow:0 calc(var(--u)*1.4) calc(var(--u)*4) color-mix(in srgb,var(--ac) 14%,transparent);flex:none}
.tcard .cic{width:calc(var(--u)*13);height:calc(var(--u)*13);border-radius:calc(var(--u)*3);background:color-mix(in srgb,var(--ac) 10%,var(--card));border:0}
.tcard p{font:600 calc(var(--u)*3.8)/1.3 var(--fc);color:var(--ink)}
.tcard p em{font-style:normal;color:var(--ac)}
/* legendas do reel */
.legendas{position:absolute;left:calc(var(--u)*7);right:calc(var(--u)*7);bottom:24%;z-index:50;pointer-events:none}
.leg{position:absolute;left:0;right:0;bottom:0;text-align:center;visibility:hidden;font:900 calc(var(--u)*6.4)/1.12 var(--fc);text-transform:uppercase;color:#fff;-webkit-text-stroke:calc(var(--u)*1.1) #000;paint-order:stroke fill}
.com-legendas .conteudo{padding-bottom:calc(var(--u)*50)!important}
.com-legendas .hero .produto,.com-legendas .oferta .produto{margin-bottom:0}
/* SplitText line masks clip descenders (g, j, p) without this */
h1 .ln-mask{padding:0 .06em .16em;margin:0 -.06em -.16em}
/* cta e impacto */
.final .conteudo,.impacto .conteudo{align-items:center;text-align:center}
.final .topo,.impacto .topo{justify-content:center}
.final .eyebrow{justify-content:center}.final .eyebrow::before{display:none}
.final .sub{margin-left:auto;margin-right:auto}
.final .cta{margin:0 auto;font-size:calc(var(--u)*3.8);padding:calc(var(--u)*3) calc(var(--u)*6)}
.final .arroba{margin-top:calc(var(--u)*2.6);font:600 calc(var(--u)*2.8)/1 var(--fc);color:var(--muted);flex:none}
.impacto{--h1:15}
.impacto h1{text-transform:uppercase;line-height:.92;letter-spacing:-.035em}
.impacto .bg{background:linear-gradient(160deg,var(--ac),color-mix(in srgb,var(--ac) 70%,#000))}
.impacto{--ink:var(--on-ac);--muted:color-mix(in srgb,var(--on-ac) 75%,transparent)}
.impacto h1 em{color:var(--ink);-webkit-text-stroke:0;font-style:italic}
`;

// Runs inside the page: fits text, builds one paused GSAP timeline, exposes window.TL.
const RUNTIME = `
window.__avisos=[];
function fit(sc){
  const box=sc.querySelector('.conteudo');
  const vazou=()=>{const r=box.getBoundingClientRect(),pb=parseFloat(getComputedStyle(box).paddingBottom);let m=0;for(const ch of box.children){const cs=getComputedStyle(ch);if(cs.position==='absolute')continue;m=Math.max(m,ch.getBoundingClientRect().bottom+Math.min(0,parseFloat(cs.marginBottom)||0));}return m>r.bottom-pb+1;};
  const cheio=g=>vazou()||g.scrollHeight>g.clientHeight+1;
  box.querySelectorAll('[data-fit-grupo]').forEach(g=>{let k=1,n=0;while(cheio(g)&&k>.62&&n++<40){k*=.96;g.style.setProperty('--k',k);}if(cheio(g))window.__avisos.push('Cena '+(+sc.dataset.i+1)+': itens demais para o espaço. Tire um item ou encurte os textos.');});
  // Centered flex items grow instead of overflowing, so also compare against the column width.
  const csb=getComputedStyle(box),coluna=box.clientWidth-parseFloat(csb.paddingLeft)-parseFloat(csb.paddingRight);
  const over=el=>vazou()||el.scrollWidth>el.clientWidth+1||el.getBoundingClientRect().width>coluna+1;
  for(const [sel,min] of [['h1',.5],['.sub',.7],['.item',.75]]){
    for(const el of box.querySelectorAll(sel)){
      let fs=parseFloat(getComputedStyle(el).fontSize);const lim=fs*min;let n=0;
      while(over(el)&&fs>lim&&n++<60){fs*=.95;el.style.fontSize=fs+'px';}
    }
  }
  if(vazou())
    window.__avisos.push('Cena '+(+sc.dataset.i+1)+': conteúdo não coube mesmo reduzindo o texto. Encurte o texto.');
  box.querySelectorAll('h1').forEach(h=>{if(h.style.fontSize&&parseFloat(h.style.fontSize)<parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--u'))*5)window.__avisos.push('Cena '+(+sc.dataset.i+1)+': título longo ficou pequeno.');});
}
function cenaTL(sc,dur,video){
  const tl=gsap.timeline(),q=s=>sc.querySelectorAll(s),E='expo.out';
  if(video)tl.fromTo(q('.bg'),{scale:1.12},{scale:1,duration:dur+1,ease:'none'},0);
  tl.from(q('[data-a=deco]'),{scale:0,autoAlpha:0,duration:1.2,ease:E,stagger:.1},0);
  tl.from(q('[data-a=gigante]'),{xPercent:-12,autoAlpha:0,duration:1.6,ease:E},0);
  if(video)tl.to(q('[data-a=gigante]'),{xPercent:-58,duration:dur+1,ease:'none'},0);
  tl.from(q('[data-a=topo]'),{y:-30,autoAlpha:0,duration:.8,ease:E},.05);
  tl.from(q('[data-a=faixa]'),{xPercent:-110,duration:1,ease:E},.15);
  if(video)tl.to(q('.faixa .trilha'),{xPercent:-25,duration:dur,ease:'none'},0);
  tl.from(q('[data-a=eyebrow]'),{x:-30,autoAlpha:0,duration:.8,ease:E},.15);
  tl.from(q('[data-a=num]'),{yPercent:30,autoAlpha:0,scale:1.25,transformOrigin:'0% 100%',duration:1.1,ease:E},.1);
  q('[data-a=titulo]').forEach(el=>{
    const st=SplitText.create(el,{type:'lines,words',mask:'lines',linesClass:'ln'});
    tl.from(st.words,{yPercent:115,duration:1,ease:E,stagger:.05},.22);
  });
  tl.from(q('[data-a=texto]'),{y:26,autoAlpha:0,duration:.9,ease:E,stagger:.1},.6);
  tl.from(q('[data-a=produto]'),{y:160,scale:.84,rotation:-6,autoAlpha:0,duration:1.3,ease:E},.18);
  if(video)tl.to(q('[data-a=produto] .flutua'),{y:-22,rotation:1.8,duration:Math.max(dur-.6,1),ease:'sine.inOut'},.9);
  tl.from(q('[data-a=item]'),{x:-60,autoAlpha:0,duration:.8,ease:E,stagger:.13},.65);
  tl.from(q('[data-a=estrela]'),{scale:0,rotation:-40,duration:.6,ease:'back.out(3)',stagger:.07},.55);
  tl.from(q('[data-a=selo]'),{scale:0,rotation:-60,duration:.9,ease:'back.out(2.2)'},.8);
  tl.from(q('[data-a=preco]'),{y:40,autoAlpha:0,duration:.9,ease:E},.85);
  tl.from(q('[data-a=cta]'),{y:44,autoAlpha:0,duration:.9,ease:E},.95);
  if(video)tl.to(q('[data-a=cta]'),{scale:1.06,duration:.5,ease:'sine.inOut',yoyo:true,repeat:Math.max(0,Math.floor((dur-2)/.5)-1)},1.9);
  tl.from(q('[data-a=barra] i'),{scaleX:0,transformOrigin:'0 50%',duration:.7,ease:E,stagger:.05},.5);
  return tl;
}
window.__build=async function(cfg){
  gsap.config({nullTargetWarn:false});
  await Promise.all(cfg.fontes.flatMap(f=>['400','700','800'].map(w=>document.fonts.load(w+' 40px "'+f+'"').catch(()=>{}))));
  await Promise.race([document.fonts.ready,new Promise(r=>setTimeout(r,8000))]);
  const cenas=[...document.querySelectorAll('.cena')];
  cenas.forEach(fit);
  document.querySelectorAll('.conteudo,.cardlist').forEach(e=>{e.scrollTop=0;});window.scrollTo(0,0);
  const tl=gsap.timeline({paused:true});let t=0;
  cenas.forEach((sc,i)=>{
    const d=cfg.duracoes[i];
    if(cfg.video&&i>0){
      const de=['inset(100% 0% 0% 0%)','inset(0% 0% 0% 100%)','circle(0% at 50% 60%)'][i%3];
      const ate=de.startsWith('circle')?'circle(150% at 50% 60%)':'inset(0% 0% 0% 0%)';
      tl.set(sc,{autoAlpha:1},t-.45);
      tl.fromTo(sc,{clipPath:de},{clipPath:ate,duration:.8,ease:'expo.inOut',immediateRender:false},t-.45);
      tl.fromTo(cenas[i-1],{scale:1,filter:'brightness(1)'},{scale:.9,filter:'brightness(.45)',duration:.8,ease:'expo.inOut',immediateRender:false},t-.45);
      tl.set(cenas[i-1],{autoAlpha:0},t+.4);
      tl.add(cenaTL(sc,d,true),t-.15);
    }else{tl.set(sc,{autoAlpha:1},t);tl.add(cenaTL(sc,d,cfg.video),t);}
    t+=d;
  });
  if(cfg.legendas&&cfg.legendas.length){
    const L=document.createElement('div');L.className='legendas';document.body.appendChild(L);
    const cor=getComputedStyle(document.documentElement).getPropertyValue('--leg').trim()||'#ffd400';
    cfg.legendas.forEach(g=>{
      const el=document.createElement('div');el.className='leg';L.appendChild(el);
      g.palavras.forEach(p=>{const s=document.createElement('span');s.textContent=p.t+' ';el.appendChild(s);tl.set(s,{color:cor},p.ini);tl.set(s,{color:'#ffffff'},p.fim);});
      tl.set(el,{autoAlpha:1},g.ini);tl.fromTo(el,{scale:.86},{scale:1,duration:.18,ease:'back.out(3)',immediateRender:false},g.ini);tl.set(el,{autoAlpha:0},g.fim);
    });
  }
  window.TL=tl;
  return {duracao:t,avisos:window.__avisos};
};
`;

// ---------- peças de layout ----------
function ctx(c, s) {
  const prod = c.produtos?.[s.produto];
  const img = s.produto ? dataUri(resolverImagem(c, s.produto)) : null;
  const logo = c.logo ? `<img src="${dataUri(resolverImagem(c, c.logo))}">` : `<span class="marca">${esc(c.nome)}</span>`;
  const precoPor = s.preco ?? (s.mostrarPreco || s.layout === 'oferta' ? prod?.preco : '');
  const precoDe = s.de ?? (s.mostrarPreco || s.layout === 'oferta' ? prod?.precoDe : '');
  // `autor` as an object is the personal-brand pill; as a string (testimonial) it is the customer's name.
  const a = s.autor === false ? null : (s.autor && typeof s.autor === 'object' ? s.autor : c.autor);
  const autor = a ? `<div class="autor-pill">${a.foto ? `<img src="${dataUri(resolverImagem(c, a.foto))}">` : ''}<b>${esc(a.nome)}</b>${a.arroba ? `<span>· ${esc(a.arroba)}</span>` : ''}</div>` : '';
  const imagem = s.imagem ? dataUri(resolverImagem(c, s.imagem)) : null;
  return { prod, img, logo, precoPor, precoDe, autor, imagem, temLogo: !!c.logo };
}
const topo = (x, direita) => (x.autor
  ? `<header class="topo" data-a="topo">${x.temLogo ? x.logo : '<span></span>'}${x.autor}</header>`
  : `<header class="topo" data-a="topo">${x.logo}<span>${esc(direita ?? '')}</span></header>`);
const ehImagem = v => /\.(png|jpe?g|webp|svg|gif)$/i.test(String(v || ''));
// Ícone do card: nome de ícone interno, caminho de imagem (logo) ou emoji/texto.
const simbolo = (c, v) => (!v ? icone('check') : ICONES[v] ? icone(v) : ehImagem(v) ? `<img src="${dataUri(resolverImagem(c, v))}">` : `<span class="emoji">${esc(v)}</span>`);
const pontos = (i, n) => (n > 1 ? `<div class="pontos" data-a="barra">${Array.from({ length: n }, (_, k) => `<i class="${k === i ? 'on' : ''}"></i>`).join('')}</div>` : '');
const abas = s => (s.abas?.length ? `<nav class="abas" data-a="topo">${s.abas.map((a, k) => `<span class="aba ${s.aba === k || s.aba === a ? 'on' : ''}">${esc(a)}</span>`).join('')}</nav>` : '');
const objeto = it => (typeof it === 'string' ? { nome: it, texto: it } : it);
const card = (c, it) => { const o = objeto(it); return `<div class="card" data-a="item"><span class="cic">${simbolo(c, o.icone)}</span><div class="cmeio"><div class="cnome"><b>${esc(o.nome)}</b>${o.papel ? `<i>${esc(o.papel)}</i>` : ''}</div>${o.texto && o.texto !== o.nome ? `<p>${rich(o.texto)}</p>` : ''}</div>${o.numero || o.selo ? `<div class="cdir">${o.numero ? `<span class="cnum">${esc(o.numero)}</span>` : ''}${o.selo ? `<span class="cselo">${esc(o.selo)}</span>` : ''}</div>` : ''}</div>`; };
const feat = (c, it) => { const o = objeto(it); return `<div class="feat" data-a="item"><span class="cic">${simbolo(c, o.icone)}</span><div><b>${esc(o.nome)}</b>${o.texto && o.texto !== o.nome ? `<span>${rich(o.texto)}</span>` : ''}</div></div>`; };
const ladoCmp = o => `<span class="rot">${esc(o?.rotulo ?? '')}</span>${o?.legenda ? `<small>${esc(o.legenda)}</small>` : ''}<strong>${rich(o?.valor ?? '')}</strong>${o?.texto ? `<p>${rich(o.texto)}</p>` : ''}`;
const eyebrow = s => (s.eyebrow ? `<div class="eyebrow" data-a="eyebrow">${esc(s.eyebrow)}</div>` : '');
const titulo = s => (s.titulo ? `<h1 data-a="titulo">${rich(s.titulo)}</h1>` : '');
const sub = s => (s.texto ? `<p class="sub" data-a="texto">${rich(s.texto)}</p>` : '');
const produto = (x, s, extra = '') => (x.img ? `<div class="produto" data-a="produto"><div class="halo"></div><div class="flutua"><img src="${x.img}"></div>${extra}</div>` : '<div class="flex"></div>');
const cta = s => (s.cta ? `<div class="cta" data-a="cta">${esc(s.cta)}${icone('seta')}</div>` : '');
const precoBloco = x => (x.precoPor ? `<div class="preco" data-a="preco">${x.precoDe ? `<span class="de">de ${esc(x.precoDe)}</span><span class="rot">por apenas</span>` : ''}<div class="por">${preco(x.precoPor)}</div></div>` : '');
const rodape = (x, s) => (x.precoPor || s.cta ? `<footer class="rodape">${precoBloco(x)}${cta(s)}</footer>` : '');
const selo = s => (s.selo ? `<div class="selo" data-a="selo">${rich(s.selo).replace(/&lt;small&gt;(.*?)&lt;\/small&gt;/, '<small>$1</small>')}</div>` : '');
const decoBolhas = estilo => (estilo === 'vibrante'
  ? '<div class="blob" data-a="deco" style="width:62%;aspect-ratio:1;right:-22%;top:-12%"></div><div class="anel" data-a="deco" style="width:38%;aspect-ratio:1;left:-12%;bottom:8%"></div>'
  : estilo === 'clean' ? '<div class="anel" data-a="deco" style="width:78%;aspect-ratio:1;left:11%;top:22%"></div>' : '');

const LAYOUTS = {
  hero: (c, s, x) => ({ fundo: decoBolhas(s._estilo), html: `${topo(x, c.instagram)}<div class="bloco" style="margin-top:calc(var(--u)*5)">${eyebrow(s)}${titulo(s)}${sub(s)}</div>${produto(x, s, selo(s))}${rodape(x, s)}` }),
  oferta: (c, s, x) => {
    const txt = esc(s.faixa || 'Oferta por tempo limitado');
    return { fundo: decoBolhas(s._estilo), html: `<div class="faixa" data-a="faixa"><span class="trilha">${Array(8).fill(`${txt} &nbsp;✦&nbsp; `).join('')}</span></div>${topo(x, c.instagram)}<div class="bloco" style="margin-top:calc(var(--u)*3)">${eyebrow(s)}${titulo(s)}</div>${produto(x, s, selo(s))}${rodape(x, s)}` };
  },
  editorial: (c, s, x) => ({
    fundo: `<div class="gigante" data-a="gigante">${esc(s.palavra || c.nome)}</div>`,
    html: `${topo(x, s.edicao || c.instagram)}<div class="meta" data-a="topo"><span>${esc(s.meta?.[0] ?? 'Coleção')}</span><span>${esc(s.meta?.[1] ?? '')}</span><span>${esc(s.meta?.[2] ?? new Date().getFullYear())}</span></div>${produto(x, s, selo(s))}<div class="bloco">${eyebrow(s)}${titulo(s)}${sub(s)}</div>${s.cta ? `<footer class="rodape" style="margin-top:calc(var(--u)*3)">${cta(s)}</footer>` : ''}`,
  }),
  split: (c, s, x) => ({ html: `<div class="painel">${topo(x, '')}<div class="flex"></div>${eyebrow(s)}${titulo(s)}${sub(s)}<div style="height:calc(var(--u)*4)"></div>${precoBloco(x)}${s.cta ? `<div style="height:calc(var(--u)*3)"></div>${cta(s)}` : ''}</div><div class="lado">${produto(x, s, selo(s))}</div>` }),
  capa: (c, s, x, i, n) => ({
    fundo: `${decoBolhas(s._estilo)}${x.img || x.imagem ? `<div class="canto" data-a="produto"><div class="flutua"><img src="${x.img || x.imagem}"></div></div>` : ''}`,
    html: `${topo(x, n > 1 ? `${i + 1}/${n}` : c.instagram)}<div class="bloco" style="margin-top:calc(var(--u)*8)">${eyebrow(s)}${titulo(s)}${sub(s)}</div><div class="flex"></div>${n > 1 ? `<div class="arraste" data-a="cta">Arraste ${icone('seta')}</div>` : cta(s)}`,
  }),
  lista: (c, s, x, i, n) => ({
    html: `${topo(x, c.instagram)}<div class="flex"></div>${s.numero === false ? '' : `<div class="num" data-a="num">${esc(s.numero ?? String(i).padStart(2, '0'))}</div>`}${eyebrow(s)}${titulo(s)}${sub(s)}${x.img ? produto(x, s) : '<div class="flex" style="flex-grow:1.4"></div>'}${n > 1 ? `<div class="progresso" data-a="barra">${Array.from({ length: n }, (_, k) => `<i class="${k <= i ? 'on' : ''}"></i>`).join('')}${i < n - 1 ? `<span class="arraste">${icone('seta')}</span>` : ''}</div>` : ''}`,
  }),
  beneficios: (c, s, x) => ({
    fundo: decoBolhas(s._estilo),
    html: `${topo(x, c.instagram)}<div class="bloco" style="margin-top:calc(var(--u)*5)">${eyebrow(s)}${titulo(s)}</div><div class="duo">${produto(x, s)}<div class="itens">${(s.itens || []).map(it => { const o = typeof it === 'string' ? { texto: it } : it; return `<div class="item" data-a="item"><span class="ic">${icone(o.icone || 'check')}</span><span>${rich(o.texto)}</span></div>`; }).join('')}</div></div>${s.cta ? `<footer class="rodape" style="margin-top:calc(var(--u)*3)">${cta(s)}</footer>` : ''}`,
  }),
  depoimento: (c, s, x) => ({
    html: `${topo(x, c.instagram)}<div class="aspas" data-a="deco">“</div>${titulo(s)}<div class="estrelas">${Array(s.estrelas ?? 5).fill(`<span data-a="estrela">${icone('estrela')}</span>`).join('')}</div><div class="autor" data-a="texto">${esc(s.autor || '')}<span>${esc(s.detalhe || 'Cliente verificada')}</span></div>${produto(x, s)}`,
  }),
  cta: (c, s, x) => ({ fundo: decoBolhas(s._estilo), html: `${topo(x, '').replace('<span></span>', '')}<div class="bloco" style="margin-top:calc(var(--u)*6)">${eyebrow(s)}${titulo(s)}${sub(s)}</div>${produto(x, s, selo(s))}${s.cta ? `<div data-a="cta">${cta(s)}</div>` : ''}<div class="arroba" data-a="texto">${esc(s.rodape ?? c.instagram ?? '')}</div>` }),
  cards: (c, s, x, i, n) => ({
    html: `${topo(x, c.instagram)}<div class="bloco" style="margin-top:calc(var(--u)*4)">${eyebrow(s)}<div class="titulo-linha">${titulo(s)}${x.imagem ? `<img class="mini" data-a="deco" src="${x.imagem}">` : ''}</div>${sub(s)}</div>${abas(s)}<div class="cardlist" data-fit-grupo>${(s.itens || []).map(it => card(c, it)).join('')}</div>${pontos(i, n)}`,
  }),
  mockup: (c, s, x, i, n) => ({
    html: `${topo(x, c.instagram)}<div class="bloco" style="margin-top:calc(var(--u)*3)">${s.etiqueta ? `<span class="etiqueta" data-a="eyebrow">${esc(s.etiqueta)}</span>` : ''}${eyebrow(s)}${titulo(s)}${sub(s)}</div><div class="janela" data-a="produto"><div class="barra-jan"><i></i><i></i><i></i>${s.url ? `<span>${esc(s.url)}</span>` : ''}</div><div class="tela">${x.imagem ? `<img src="${x.imagem}">` : ''}</div></div>${s.itens?.length ? `<div class="feats" data-fit-grupo>${s.itens.map(it => feat(c, it)).join('')}</div>` : ''}${pontos(i, n)}`,
  }),
  comparativo: (c, s, x, i, n) => ({
    html: `${topo(x, c.instagram)}<div class="bloco" style="margin-top:calc(var(--u)*5)">${eyebrow(s)}${titulo(s)}${sub(s)}</div><div class="cmp" data-fit-grupo><div class="lado-a" data-a="item">${ladoCmp(s.antes)}</div><span class="seta-cmp" data-a="item">${icone('seta')}</span><div class="lado-b" data-a="item">${ladoCmp(s.depois)}</div></div>${s.cta ? `<footer class="rodape">${cta(s)}</footer>` : ''}${pontos(i, n)}`,
  }),
  comente: (c, s, x, i, n) => ({
    fundo: decoBolhas(s._estilo),
    html: `${topo(x, '').replace('<span></span>', '')}<div class="flex"></div>${x.imagem ? `<img class="simbolo" data-a="deco" src="${x.imagem}">` : `<div class="asterisco" data-a="deco">${icone('brilho')}</div>`}${titulo(s)}${sub(s)}<div class="comenta" data-a="cta"><span>${esc(s.antes ?? 'Comenta')}</span><b class="palavra">${esc(s.palavra || 'EU QUERO')}</b><span>${esc(s.depois ?? 'que eu te mando.')}</span></div><div class="flex"></div>${pontos(i, n)}`,
  }),
  topico: (c, s, x, i, n) => ({
    html: `${topo(x, c.instagram)}<div class="tcab"><span class="tnum" data-a="num">${esc(s.numero ?? String(i).padStart(2, '0'))}</span>${titulo(s)}</div>${eyebrow(s)}<div class="timg">${x.imagem ? `<img data-a="produto" src="${x.imagem}">` : x.img ? `<img data-a="produto" src="${x.img}">` : ''}</div>${s.texto ? `<div class="tcard" data-a="item"><span class="cic">${simbolo(c, s.icone || 'raio')}</span><p>${rich(s.texto)}</p></div>` : ''}${pontos(i, n)}`,
  }),
  impacto: (c, s, x) => ({ html: `${topo(x, '').replace('<span></span>', '')}<div class="flex"></div>${titulo(s)}${sub(s)}<div class="flex"></div>${cta(s)}` }),
};
const ALIAS = { produto: 'hero', texto: 'lista', 'final': 'cta' };
const CLASSE = { cta: 'final', comente: 'final comente' };
export const NOMES_LAYOUT = Object.keys(LAYOUTS);

function cena(c, s, i, n, estilo) {
  const nome = ALIAS[s.layout] || s.layout || 'hero';
  const fn = LAYOUTS[nome];
  if (!fn) throw new Error(`Layout desconhecido: ${s.layout}. Use: ${NOMES_LAYOUT.join(', ')}`);
  const est = s.estilo || estilo;
  const sl = { ...s, _estilo: est, numero: nome === 'lista' && s.layout === 'texto' && s.numero === undefined ? false : s.numero };
  const x = ctx(c, sl);
  const r = fn(c, sl, x, i, n);
  const fundo = r.fundo || '';
  // Carousel slides always show progress, even product layouts that don't draw their own.
  const html = n > 1 && nome !== 'capa' && !/class="(pontos|progresso)"/.test(r.html) ? r.html + pontos(i, n) : r.html;
  const bg = s.fundo ? `<div class="bg foto" style="background-image:url('${dataUri(resolverImagem(c, s.fundo))}')"></div><div class="veu"></div>` : '<div class="bg"></div>';
  return `<section class="cena estilo-${est} ${CLASSE[nome] || nome}" data-i="${i}"><div class="camada">${bg}${fundo}<div class="grao"></div></div><div class="conteudo">${html}</div></section>`;
}

const FAMILIAS = c => [...new Set([c.fontes?.titulo || c.fonte || 'Montserrat', c.fontes?.corpo || c.fonte || 'Inter', c.fontes?.mono || 'JetBrains Mono'])];
// One <link> per weight: Google Fonts rejects the whole request if any listed weight doesn't exist for a family.
const linksFontes = c => FAMILIAS(c).flatMap(f => ['wght@400', 'wght@500', 'wght@600', 'wght@700', 'wght@800', 'wght@900', 'ital,wght@1,400', 'ital,wght@1,700']
  .map(v => `<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=${encodeURIComponent(f).replace(/%20/g, '+')}:${v}&display=block">`)).join('');

// so: render only slide index `so` (stills), keeping numbering relative to the whole set.
export function pagina(c, itens, { w, h, formato, video, so, legendas }) {
  const estilo = c.estilo || 'premium';
  const idx = so === undefined ? itens.map((_, i) => i) : [so];
  // Video scenes are not carousel slides: no progress dots or slide counters.
  const body = idx.map(i => cena(c, itens[i], i, video ? 1 : itens.length, estilo)).join('\n');
  const html = `<!doctype html><html><head><meta charset="utf-8">${linksFontes(c)}
<style>${tokens(c, w)}${CSS}html,body{width:${w}px;height:${h}px}</style>
<script>${GSAP}</script><script>${RUNTIME}</script></head>
<body class="fmt-${formato} ${video ? 'video tipo-video' : ''} ${legendas?.length ? 'com-legendas' : ''}">${body}</body></html>`;
  return { html, cfg: { video, duracoes: idx.map(i => itens[i].duracao ?? 3), fontes: FAMILIAS(c), legendas: legendas || [] } };
}
