// Estúdio da Fábrica de Conteúdo — interface (sem frameworks).
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const tela = $('#tela');

// ---------- ícones (traço 2px, 24x24) ----------
const P = {
  casa: 'M3 11l9-7 9 7v9a1 1 0 01-1 1h-5v-6H9v6H4a1 1 0 01-1-1z', brilho: 'M12 3c.7 4.6 2.4 6.3 7 7-4.6.7-6.3 2.4-7 7-.7-4.6-2.4-6.3-7-7 4.6-.7 6.3-2.4 7-7zM19 3v4M17 5h4',
  grade: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z', video: 'M3 6h12v12H3zM15 10l6-3v10l-6-3', audio: 'M4 10v4M8 6v12M12 3v18M16 7v10M20 10v4',
  doc: 'M6 3h9l4 4v14H6zM14 3v5h5M9 13h7M9 17h5', pessoas: 'M9 11a4 4 0 100-8 4 4 0 000 8zM2 21c0-4 3-6 7-6s7 2 7 6M17 11a3 3 0 100-6M22 20c0-3-2-5-5-5',
  engrenagem: 'M12 15a3 3 0 100-6 3 3 0 000 6zM12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9L7 7M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1',
  mais: 'M12 5v14M5 12h14', imagem: 'M3 5h18v14H3zM3 16l5-5 4 4 3-3 6 6M15 9.5a1.5 1.5 0 100-3 1.5 1.5 0 000 3z', carrossel: 'M7 5h10v14H7zM3 7v10M21 7v10',
  story: 'M8 2h8a2 2 0 012 2v16a2 2 0 01-2 2H8a2 2 0 01-2-2V4a2 2 0 012-2zM11 18h2', reel: 'M4 4h16v16H4zM4 9h16M9 4l3 5M15 4l3 5M10 13v4l4-2z',
  ideia: 'M9 18h6M10 21h4M12 3a6 6 0 00-4 10.5c.6.6 1 1.4 1 2.5h6c0-1.1.4-1.9 1-2.5A6 6 0 0012 3z', cima: 'M12 19V5M6 11l6-6 6 6', baixo: 'M12 5v14M6 13l6 6 6-6',
  lixo: 'M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13', copiar: 'M8 8h12v12H8zM4 16V4h12', baixar: 'M12 4v12M6 11l6 6 6-6M4 20h16', voltar: 'M15 18l-6-6 6-6',
  editar: 'M4 20h4L19 9l-4-4L4 16zM14 6l4 4', check: 'M5 12l5 5 9-10', recorte: 'M6 3v13a2 2 0 002 2h13M3 6h13a2 2 0 012 2v13', upload: 'M12 16V4M6 9l6-6 6 6M4 20h16',
  duplicar: 'M8 8h12v12H8zM4 16V4h12M14 11v6M11 14h6', x: 'M6 6l12 12M18 6L6 18',
};
const svg = d => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="${d}"/></svg>`;
const ico = n => `<i data-i="${n}">${svg(P[n] || P.mais)}</i>`;
const pintarIcones = (raiz = document) => $$('i[data-i]', raiz).forEach(i => { if (!i.innerHTML) i.innerHTML = svg(P[i.dataset.i] || P.mais); });

// ---------- API ----------
async function api(url, o = {}) {
  const bruto = o.body instanceof Blob;
  const r = await fetch(url, { method: o.method || (o.body ? 'POST' : 'GET'), headers: { 'X-Estudio': '1', ...(o.body && !bruto ? { 'Content-Type': 'application/json' } : {}) }, body: o.body && !bruto ? JSON.stringify(o.body) : o.body });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.erro || `Erro ${r.status}`);
  return j;
}
let tAviso;
function aviso(t, erro = false) { const a = $('#aviso'); a.textContent = t; a.className = `aviso on ${erro ? 'erro' : ''}`; clearTimeout(tAviso); tAviso = setTimeout(() => (a.className = 'aviso'), 3800); }
const falhou = e => aviso(e.message || String(e), true);
const enviar = (arquivo, cliente, tipo) => api(`/api/upload?cliente=${encodeURIComponent(cliente)}&tipo=${tipo}&nome=${encodeURIComponent(arquivo.name)}`, { method: 'POST', body: arquivo });
const quando = iso => new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

// ---------- estado ----------
const S = { clientes: [], cliente: localStorage.getItem('cliente') || '', estado: null };
const cli = () => S.clientes.find(c => c.slug === S.cliente);
async function carregarClientes() {
  S.clientes = await api('/api/clientes');
  if (!cli()) S.cliente = S.clientes.find(c => !['lumina', 'norte'].includes(c.slug))?.slug || S.clientes[0]?.slug || '';
  const sel = $('#selCliente');
  sel.innerHTML = S.clientes.length ? S.clientes.map(c => `<option value="${esc(c.slug)}" ${c.slug === S.cliente ? 'selected' : ''}>${esc(c.nome)}</option>`).join('') : '<option value="">Nenhum cliente</option>';
  $('#corCliente').style.background = cli()?.cores?.primaria || 'var(--ac)';
  localStorage.setItem('cliente', S.cliente);
}
$('#selCliente').addEventListener('change', e => { S.cliente = e.target.value; localStorage.setItem('cliente', S.cliente); $('#corCliente').style.background = cli()?.cores?.primaria; render(); });

// ---------- modal e tarefas ----------
function modal(html, aoAbrir) {
  const m = $('#modal'); const c = $('.caixa', m);
  c.innerHTML = html; pintarIcones(c); m.hidden = false;
  const fechar = () => { m.hidden = true; c.innerHTML = ''; };
  m.onclick = e => { if (e.target === m) fechar(); };
  $$('[data-fechar]', c).forEach(b => (b.onclick = fechar));
  aoAbrir?.(c, fechar);
  return fechar;
}
const TRAD = [[/^▸ (node|python).*?(render\.mjs)/, 'Desenhando a peça…'], [/^▸ .*silence\.py/, 'Cortando silêncios e vícios de fala…'], [/^▸ .*caption\.py/, 'Transcrevendo e gravando a legenda…'], [/^▸ .*loudness\.py/, 'Ajustando o volume…'], [/^▸ .*fit\.py/, 'Gerando versão em outro formato…'], [/^▸ .*imagem\.mjs/, 'Recortando a foto…'], [/^▸ .*voz\.mjs/, 'Gerando a narração…']];
const amigavel = l => (TRAD.find(([re]) => re.test(l))?.[1]) || l;
function acompanhar(id, { titulo, aoTerminar } = {}) {
  let parar = false;
  const fechar = modal(`<h2>${esc(titulo || 'Trabalhando')}</h2><p class="sub" id="jStatus">Isso pode levar alguns minutos. Pode fechar esta janela: a tarefa continua.</p>
    <div class="progresso" style="margin:16px 0"><span></span></div><div class="log" id="jLog">Iniciando…</div>
    <div class="linha" style="margin-top:16px;justify-content:flex-end" id="jAcoes"><button class="btn ghost" data-fechar>Fechar</button></div>`, c => {
    $('[data-fechar]', c).addEventListener('click', () => (parar = true));
  });
  const caixa = $('.caixa');
  (async function loop() {
    while (!parar) {
      let j; try { j = await api(`/api/jobs/${id}`); } catch { break; }
      const log = $('#jLog', caixa); if (!log) return;
      log.textContent = j.log.slice(-60).map(amigavel).join('\n') || 'Iniciando…'; log.scrollTop = log.scrollHeight;
      if (j.status !== 'rodando') {
        $('.progresso', caixa)?.remove();
        $('#jStatus', caixa).innerHTML = j.status === 'ok' ? `<span class="tag ok">Pronto</span> ${esc(j.resultado?.resumo || '')}` : `<span class="tag falta">Não concluiu</span> ${esc(j.erro || '')}`;
        const acoes = $('#jAcoes', caixa);
        for (const p of j.resultado?.pecas || []) acoes.insertAdjacentHTML('afterbegin', `<a class="btn" href="#/peca?pasta=${encodeURIComponent(p)}">${ico('editar')}Abrir peça</a>`);
        if (j.status === 'erro' && j.dados) {
          acoes.insertAdjacentHTML('afterbegin', `${j.sessao ? `<button class="btn" data-rep="1">${ico('brilho')}Continuar de onde parou</button>` : ''}<button class="btn ghost" data-rep="0">Tentar de novo</button>`);
          $$('[data-rep]', acoes).forEach(b => b.addEventListener('click', async () => {
            try { const r = await api('/api/ia/repetir', { body: { job: id, continuar: b.dataset.rep === '1' } }); parar = true; acompanhar(r.job, { titulo: titulo + (b.dataset.rep === '1' ? ' (continuação)' : ''), aoTerminar }); } catch (e) { falhou(e); }
          }));
        }
        $$('a.btn', acoes).forEach(a => a.addEventListener('click', fechar));
        aoTerminar?.(j);
        atualizarTarefas();
        return;
      }
      await new Promise(r => setTimeout(r, 1200));
    }
  })();
}
async function atualizarTarefas() {
  try {
    const js = await api('/api/jobs');
    const rodando = js.filter(j => j.status === 'rodando');
    const b = $('#btnTarefas'); b.hidden = !rodando.length;
    $('#txtTarefas').textContent = `${rodando.length} tarefa${rodando.length > 1 ? 's' : ''} em andamento`;
    b.onclick = () => rodando[0] && acompanhar(rodando[0].id, { titulo: rodando[0].titulo });
  } catch { /* server offline */ }
}
setInterval(atualizarTarefas, 4000);
$('#btnDesligar').onclick = async () => {
  if (!confirm('Desligar o Estúdio? Para abrir de novo, use o atalho "Estúdio da Fábrica".')) return;
  try { await api('/api/desligar', { method: 'POST' }); document.body.innerHTML = '<div style="display:grid;place-items:center;height:100vh;font:600 18px Inter,system-ui;color:#888;text-align:center;padding:20px">Estúdio desligado.<br>Pode fechar esta aba.</div>'; } catch (e) { falhou(e); }
};

// ---------- componentes ----------
function zonaSoltar(el, aceitar, aoEscolher, multiplo = false) {
  const inp = Object.assign(document.createElement('input'), { type: 'file', accept: aceitar, multiple: multiplo, hidden: true });
  el.append(inp);
  el.addEventListener('click', e => { if (e.target !== inp) inp.click(); });
  inp.addEventListener('change', () => inp.files.length && aoEscolher([...inp.files]));
  el.addEventListener('dragover', e => { e.preventDefault(); el.classList.add('sobre'); });
  el.addEventListener('dragleave', () => el.classList.remove('sobre'));
  el.addEventListener('drop', e => { e.preventDefault(); el.classList.remove('sobre'); e.dataTransfer.files.length && aoEscolher([...e.dataTransfer.files]); });
}
const ehVideo = u => /\.(mp4|mov|webm|m4v)(\?|$)/i.test(u);
const TIPOS = { post: 'Post', carrossel: 'Carrossel', story: 'Story', reel: 'Reel', 'story-video': 'Story vídeo', 'video-editado': 'Vídeo editado' };
function cardPeca(p) {
  const midia = ehVideo(p.capa) ? `<video src="${esc(p.capa)}#t=0.5" muted preload="metadata"></video>` : `<img src="${esc(p.capa)}" loading="lazy" alt="">`;
  return `<a class="peca" href="#/peca?pasta=${encodeURIComponent(p.pasta)}"><div class="thumb">${midia}<span class="selo">${esc(TIPOS[p.tipo] || p.tipo)}</span></div><div class="info"><b>${esc(p.nome.replace(/^\d{4}-\d{2}-\d{2}-/, ''))}</b><span>${quando(p.alterado)}${p.arquivos.length > 1 ? ` · ${p.arquivos.length} arquivos` : ''}</span></div></a>`;
}
const semCliente = () => `<div class="card vazio">${ico('pessoas')}<h2>Cadastre um cliente primeiro</h2><p class="sub">Tudo no Estúdio é feito para uma marca: cores, fontes e produtos.</p><p style="margin-top:14px"><a class="btn" href="#/clientes?novo=1">${ico('mais')}Novo cliente</a></p></div>`;

// ---------- telas ----------
const ATALHOS = [
  ['post', 'imagem', 'Post', 'Uma imagem para o feed'], ['carrossel', 'carrossel', 'Carrossel', 'Vários slides, dicas ou produtos'],
  ['reel', 'reel', 'Reel animado', 'Vídeo com a foto do produto'], ['story', 'story', 'Story', 'Imagem vertical 9:16'],
  ['roteiro', 'doc', 'Roteiro', 'Texto para gravar ou animar'], ['pauta', 'ideia', 'Ideias de pauta', 'Pesquisa e sugestões de posts'],
];
async function telaInicio() {
  if (!S.clientes.length) return (tela.innerHTML = `<div class="cab"><div><h1>Bem-vindo ao Estúdio</h1><p class="sub">Crie posts, carrosséis, reels, áudios e roteiros com a identidade de cada marca.</p></div></div>${semCliente()}`);
  const c = cli();
  tela.innerHTML = `<div class="cab"><div><h1>O que vamos criar para ${esc(c.nome)}?</h1><p class="sub">Escolha um formato. Você descreve com suas palavras e a IA monta com as cores, fontes e produtos da marca.</p></div></div>
  <div class="grade g3">${ATALHOS.map(([t, i, n, d]) => `<a class="acao" href="#/criar?tipo=${t}"><span class="ico">${ico(i)}</span><b>${n}</b><span>${d}</span></a>`).join('')}</div>
  <div class="grade g3" style="margin-top:16px">
    <a class="acao" href="#/videos"><span class="ico">${ico('video')}</span><b>Editar vídeo gravado</b><span>Legenda, cortes de silêncio e formatos</span></a>
    <a class="acao" href="#/audios"><span class="ico">${ico('audio')}</span><b>Narração</b><span>Texto vira voz para os vídeos</span></a>
    <a class="acao" href="#/clientes/${esc(c.slug)}"><span class="ico">${ico('pessoas')}</span><b>Marca e produtos</b><span>Cores, fontes, fotos e preços</span></a>
  </div>
  <div class="cab" style="margin:30px 0 14px"><h2>Peças recentes</h2><a class="btn ghost peq" href="#/pecas">Ver todas</a></div>
  <div class="grade auto" id="recentes"><div class="sub">Carregando…</div></div>`;
  const ps = await api(`/api/pecas?cliente=${S.cliente}`);
  $('#recentes').innerHTML = ps.length ? ps.slice(0, 8).map(cardPeca).join('') : `<div class="card vazio" style="grid-column:1/-1">Nada criado ainda para esta marca. Comece por um dos formatos acima.</div>`;
}

const EXEMPLOS = {
  post: 'Ex.: post de lançamento do shampoo Nutri Rosé, destacando nutrição profunda, com botão "Peça já".',
  carrossel: 'Ex.: carrossel com 5 dicas de cronograma capilar, terminando com convite para comentar "QUERO".',
  story: 'Ex.: story de oferta relâmpago do kit Nutri Rosé, válido só hoje.',
  reel: 'Ex.: reel de 15 segundos apresentando a máscara de reparação, começando com "Cabelo ressecado?".',
  roteiro: 'Ex.: roteiro de reel de 30 segundos ensinando a montar o cronograma capilar com os produtos da marca.',
  pauta: 'Ex.: ideias de posts para dezembro, com foco em presentes de Natal.',
};
async function telaCriar(q) {
  if (!cli()) return (tela.innerHTML = semCliente());
  let tipo = q.get('tipo') || 'post';
  const anexos = q.get('base') ? [q.get('base')] : [];
  const semVoz = !S.estado?.chaves?.ELEVENLABS_API_KEY;
  const desenhar = () => {
    tela.innerHTML = `<div class="cab"><div><h1>Criar com IA</h1><p class="sub">Para <b>${esc(cli().nome)}</b>. Descreva como falaria para um designer.</p></div></div>
    <div class="grade g3" id="tipos">${ATALHOS.map(([t, i, n, d]) => `<button class="acao ${t === tipo ? 'sel' : ''}" data-t="${t}"><span class="ico">${ico(i)}</span><b>${n}</b><span>${d}</span></button>`).join('')}</div>
    <div class="card form" style="margin-top:18px">
      <label class="campo">O que você quer?<textarea class="inp" id="pedido" rows="5" placeholder="${esc(EXEMPLOS[tipo])}">${q.get('pedido') ? esc(q.get('pedido')) : ''}</textarea></label>
      <div class="linha">
        ${['post', 'carrossel'].includes(tipo) ? `<label class="campo">Formato<select class="inp" id="formato"><option value="">Automático</option><option value="retrato">Retrato 4:5 (feed)</option><option value="quadrado">Quadrado 1:1</option><option value="story">Vertical 9:16</option></select></label>` : ''}
        ${tipo === 'roteiro' ? `<label class="campo">Para<select class="inp" id="formato"><option>Reel de 30 segundos</option><option>Reel de 15 segundos</option><option>Vídeo de YouTube (5 a 8 min)</option><option>Carrossel de 6 slides</option><option>Story em sequência</option></select></label>` : ''}
        ${tipo === 'reel' ? `<label class="chip ${semVoz ? '' : 'on'}"><input type="checkbox" id="narracao" ${semVoz ? 'disabled' : ''}> Com narração ${semVoz ? '(configure o ElevenLabs em Ajustes)' : ''}</label>` : ''}
      </div>
      <div><b style="font-size:13px">Arquivos de apoio <small class="sub">(opcional: fotos de produto, referência, texto)</small></b>
        <div class="soltar" id="zona" style="margin-top:8px">${ico('upload')}<div>Arraste aqui ou clique para escolher</div></div>
        <div class="chips" id="anexos" style="margin-top:10px"></div></div>
      <div class="linha" style="justify-content:space-between"><span class="sub">A IA cria, confere e salva em <b>Peças</b>. Nada é publicado.</span><button class="btn grande" id="criar">${ico('brilho')}Criar agora</button></div>
    </div>`;
    pintarIcones(tela);
    const pintarAnexos = () => ($('#anexos').innerHTML = anexos.map((a, i) => `<span class="chip">${esc(a.split('/').pop())}<button class="icobtn" data-rm="${i}" title="Remover">${ico('x')}</button></span>`).join(''));
    pintarAnexos();
    $('#anexos').addEventListener('click', e => { const b = e.target.closest('[data-rm]'); if (b) { anexos.splice(+b.dataset.rm, 1); pintarAnexos(); } });
    $$('#tipos .acao').forEach(b => b.addEventListener('click', () => { const ped = $('#pedido').value; tipo = b.dataset.t; desenhar(); $('#pedido').value = ped; }));
    zonaSoltar($('#zona'), '', async fs => { for (const f of fs) { try { anexos.push((await enviar(f, S.cliente, 'anexo')).caminho); pintarAnexos(); } catch (e) { falhou(e); } } });
    $('#criar').addEventListener('click', async () => {
      const pedido = $('#pedido').value.trim();
      if (!pedido) return aviso('Escreva o que você quer criar', true);
      try {
        const { job } = await api('/api/ia', { body: { tipo, slug: S.cliente, pedido, anexos, formato: $('#formato')?.value || '', narracao: $('#narracao')?.checked } });
        acompanhar(job, { titulo: `Criando ${ATALHOS.find(a => a[0] === tipo)[2].toLowerCase()} para ${cli().nome}`, aoTerminar: j => { if (j.status === 'ok' && (j.resultado?.arquivos || []).some(a => /\.md$/.test(a))) aviso('Pronto! Veja em Roteiros e pautas.'); } });
      } catch (e) { falhou(e); }
    });
  };
  desenhar();
}

async function telaPecas(q) {
  const filtro = q.get('tipo') || '';
  tela.innerHTML = `<div class="cab"><div><h1>Peças</h1><p class="sub">Tudo o que foi criado${cli() ? ` para <b>${esc(cli().nome)}</b>` : ''}. Clique para editar, trocar a legenda ou baixar.</p></div>
    <div class="linha"><a class="btn ghost" href="/arquivos/saida/${esc(S.cliente)}/revisao.html" target="_blank">${ico('grade')}Página de aprovação</a><a class="btn" href="#/criar">${ico('mais')}Criar</a></div></div>
    <div class="chips" style="margin-bottom:16px">${[['', 'Todas'], ['post', 'Posts'], ['carrossel', 'Carrosséis'], ['story', 'Stories'], ['reel', 'Reels'], ['video-editado', 'Vídeos editados']].map(([t, n]) => `<a class="chip ${t === filtro ? 'on' : ''}" href="#/pecas${t ? `?tipo=${t}` : ''}">${n}</a>`).join('')}</div>
    <div class="grade auto" id="lista"><div class="sub">Carregando…</div></div>`;
  pintarIcones(tela);
  if (!cli()) return ($('#lista').innerHTML = semCliente());
  const ps = (await api(`/api/pecas?cliente=${S.cliente}`)).filter(p => !filtro || p.tipo === filtro);
  $('#lista').innerHTML = ps.length ? ps.map(cardPeca).join('') : `<div class="card vazio" style="grid-column:1/-1">Nenhuma peça aqui ainda.</div>`;
}

// ---- editor de peça ----
const LAYOUTS = { hero: 'Produto em destaque', oferta: 'Oferta', editorial: 'Editorial', split: 'Dividido', beneficios: 'Benefícios', depoimento: 'Depoimento', capa: 'Capa de carrossel', lista: 'Dica numerada', cards: 'Lista de cards', mockup: 'Print em janela', comparativo: 'Antes e depois', topico: 'Tópico com imagem', comente: 'Comente a palavra', cta: 'Chamada final', impacto: 'Frase de impacto' };
const EXTRA = {
  hero: ['mostrarPreco', 'preco', 'de', 'selo'], oferta: ['faixa', 'mostrarPreco', 'preco', 'de', 'selo'], split: ['mostrarPreco', 'preco', 'de', 'selo'], cta: ['selo', 'rodape'],
  editorial: ['palavra', 'meta'], beneficios: ['itens'], cards: ['abas', 'aba', 'itensCards', 'imagem'], mockup: ['etiqueta', 'url', 'imagem', 'itensFeat'],
  comparativo: ['antes', 'depois'], topico: ['numero', 'imagem', 'icone'], comente: ['palavra', 'antesC', 'depoisC', 'imagem'], depoimento: ['autor', 'detalhe', 'estrelas'], lista: ['numero'], capa: ['imagem'], impacto: [],
};
const ROT = {
  eyebrow: ['Texto pequeno acima', 'Categoria ou novidade, 2 a 4 palavras'], titulo: ['Título', 'Use *palavra* para destacar na cor da marca. Enter quebra a linha.'], texto: ['Texto de apoio', '1 frase curta'], cta: ['Botão', 'Ex.: Peça já'],
  preco: ['Preço', 'Ex.: R$ 59,90'], de: ['Preço antigo ("de")', ''], selo: ['Selo', 'Ex.: -20%'], faixa: ['Faixa de oferta', 'Texto que corre na faixa'], rodape: ['Rodapé', '@ ou site'],
  palavra: ['Palavra', ''], meta: ['Linha de detalhes', '3 itens separados por vírgula'], itens: ['Benefícios', 'Um por linha: ícone | texto (ícones: check, gota, folha, escudo, brilho, raio, coracao, estrela…)'],
  abas: ['Abas', 'Separadas por vírgula'], aba: ['Aba ativa', 'Nome da aba destacada'], itensCards: ['Cards', 'Um por linha: ícone | nome | função | texto | número | selo'],
  etiqueta: ['Etiqueta', ''], url: ['Endereço na janela', ''], imagem: ['Imagem', 'Caminho do arquivo (ex.: imagens/print.png)'], itensFeat: ['Destaques', 'Um por linha: ícone | nome | texto'],
  antes: ['Antes', 'rótulo | legenda | valor | texto'], depois: ['Depois', 'rótulo | legenda | valor | texto'], numero: ['Número', 'Ex.: 01'], icone: ['Ícone', 'Ex.: raio'],
  antesC: ['Texto antes da palavra', 'Ex.: Comenta'], depoisC: ['Texto depois da palavra', 'Ex.: que eu te mando.'], autor: ['Nome de quem disse', ''], detalhe: ['Detalhe', 'Ex.: Cliente verificada · SP'], estrelas: ['Estrelas', '1 a 5'],
  duracao: ['Duração (segundos)', ''], fala: ['Narração desta cena', 'O que a voz fala (precisa do ElevenLabs)'],
};
const linhas = (v, ks) => (v || []).map(o => (typeof o === 'string' ? o : ks.map(k => o[k] ?? '').join(' | ').replace(/( \| )+$/, ''))).join('\n');
const deLinhas = (t, ks) => t.split('\n').map(l => l.trim()).filter(Boolean).map(l => { const p = l.split('|').map(x => x.trim()); return Object.fromEntries(ks.map((k, i) => [k, p[i] ?? '']).filter(([, v]) => v)); });
const ladoTxt = o => (o ? [o.rotulo, o.legenda, o.valor, o.texto].map(x => x ?? '').join(' | ') : '');
const ladoObj = t => { const [rotulo, legenda, valor, texto] = t.split('|').map(x => x.trim()); return { rotulo, legenda, valor, texto }; };
function valorCampo(s, k) {
  return { itens: linhas(s.itens, ['icone', 'texto']), itensCards: linhas(s.itens, ['icone', 'nome', 'papel', 'texto', 'numero', 'selo']), itensFeat: linhas(s.itens, ['icone', 'nome', 'texto']), abas: (s.abas || []).join(', '), meta: (s.meta || []).join(', '), antes: ladoTxt(s.antes), depois: ladoTxt(s.depois), antesC: s.antes, depoisC: s.depois }[k] ?? s[k] ?? '';
}
function campoHtml(s, k, i, produtos) {
  const v = valorCampo(s, k);
  if (k === 'mostrarPreco') return `<label class="chip"><input type="checkbox" data-k="mostrarPreco" data-s="${i}" ${s.mostrarPreco ? 'checked' : ''}> Mostrar preço do produto</label>`;
  const [rot, dica] = ROT[k] || [k, ''];
  const longo = ['titulo', 'itens', 'itensCards', 'itensFeat', 'fala', 'texto'].includes(k);
  return `<label class="campo">${rot}${dica ? `<small>${esc(dica)}</small>` : ''}${longo ? `<textarea class="inp" rows="${k.startsWith('itens') ? 4 : 2}" data-k="${k}" data-s="${i}">${esc(v)}</textarea>` : `<input class="inp" data-k="${k}" data-s="${i}" value="${esc(v)}">`}</label>`;
}
function slideHtml(s, i, total, video, produtos) {
  const lay = s.layout === 'produto' ? 'hero' : s.layout === 'texto' ? 'lista' : s.layout || 'hero';
  const extras = (EXTRA[lay] || []).map(k => campoHtml(s, k, i, produtos)).join('');
  return `<details class="slide" ${i === 0 ? 'open' : ''} data-i="${i}"><summary><span class="num">${i + 1}</span>${esc(LAYOUTS[lay] || lay)} <span class="sub" style="font-weight:400">${esc(String(s.titulo || '').replace(/\*/g, '').slice(0, 40))}</span>
    <span class="ferr"><button class="icobtn" data-acao="subir" title="Mover para cima">${ico('cima')}</button><button class="icobtn" data-acao="descer" title="Mover para baixo">${ico('baixo')}</button><button class="icobtn" data-acao="duplicar" title="Duplicar">${ico('duplicar')}</button><button class="icobtn" data-acao="remover" title="Remover" ${total < 2 ? 'disabled' : ''}>${ico('lixo')}</button></span></summary>
    <div class="corpo">
      <div class="grade g2"><label class="campo">Modelo<select class="inp" data-k="layout" data-s="${i}">${Object.entries(LAYOUTS).map(([k, n]) => `<option value="${k}" ${k === lay ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
      <label class="campo">Produto<select class="inp" data-k="produto" data-s="${i}"><option value="">Nenhum</option>${produtos.map(p => `<option value="${esc(p.chave)}" ${p.chave === s.produto ? 'selected' : ''}>${esc(p.nome || p.chave)}</option>`).join('')}</select></label></div>
      ${['eyebrow', 'titulo', 'texto', 'cta'].map(k => campoHtml(s, k, i, produtos)).join('')}
      ${extras}
      ${video ? `<div class="grade g2">${campoHtml(s, 'duracao', i)}</div>${campoHtml(s, 'fala', i)}` : ''}
    </div></details>`;
}
function lerSlides(raiz, originais) {
  return originais.map((orig, i) => {
    const s = { ...orig };
    for (const el of $$(`[data-s="${i}"]`, raiz)) {
      const k = el.dataset.k, v = el.type === 'checkbox' ? el.checked : el.value;
      const set = (kk, val) => { if (val === '' || val === false || (Array.isArray(val) && !val.length)) delete s[kk]; else s[kk] = val; };
      if (k === 'itens') set('itens', deLinhas(v, ['icone', 'texto']));
      else if (k === 'itensCards') set('itens', deLinhas(v, ['icone', 'nome', 'papel', 'texto', 'numero', 'selo']));
      else if (k === 'itensFeat') set('itens', deLinhas(v, ['icone', 'nome', 'texto']));
      else if (k === 'abas' || k === 'meta') set(k, v.split(',').map(x => x.trim()).filter(Boolean));
      else if (k === 'antes' || k === 'depois') { if (['comparativo'].includes(s.layout)) set(k, v.trim() ? ladoObj(v) : ''); }
      else if (k === 'antesC') set('antes', v);
      else if (k === 'depoisC') set('depois', v);
      else if (k === 'duracao' || k === 'estrelas') set(k, v === '' ? '' : Number(v));
      else set(k, typeof v === 'string' ? v.replace(/\r/g, '') : v);
    }
    return s;
  });
}

async function telaPeca(q) {
  const pasta = q.get('pasta');
  const pc = await api(`/api/peca?pasta=${encodeURIComponent(pasta)}`);
  if (pc.cliente && pc.cliente !== S.cliente && S.clientes.some(c => c.slug === pc.cliente)) { S.cliente = pc.cliente; await carregarClientes(); }
  const dados = await api(`/api/clientes/${pc.cliente}`).catch(() => ({ produtosLista: [] }));
  const ehV = pc.arquivosUrl.some(ehVideo);
  const temSpec = !!pc.spec;
  let itens = temSpec ? JSON.parse(JSON.stringify(pc.spec.slides || pc.spec.cenas || [])) : [];
  let atual = 0;
  const abas = [temSpec && ['editar', 'Editar textos'], ['legenda', 'Legenda do post'], temSpec && ['ia', 'Pedir à IA'], pc.srt != null && ['srt', 'Legenda do vídeo'], ['arquivos', 'Baixar']].filter(Boolean);
  let aba = abas[0][0];
  const palco = () => { const u = pc.arquivosUrl[atual]; return ehVideo(u) ? `<video src="${esc(u)}" controls playsinline></video>` : `<img src="${esc(u)}?v=${Date.now()}" alt="">`; };
  const desenhar = () => {
    tela.innerHTML = `<div class="cab"><div><a class="sub" href="#/pecas">${ico('voltar')} Peças</a><h1 style="margin-top:6px">${esc(pc.pasta.split('/').pop().replace(/^\d{4}-\d{2}-\d{2}-/, ''))}</h1><p class="sub">${esc(TIPOS[pc.tipo] || pc.tipo)} · ${esc(dados.nome || pc.cliente)}${pc.avisos?.length ? ` · <span class="tag falta">${pc.avisos.length} aviso(s)</span>` : ''}</p></div>
      <button class="btn perigo" id="excluir">${ico('lixo')}Excluir</button></div>
    <div class="editor"><div class="palco"><div class="tela-peca" id="palco">${palco()}</div>
      ${pc.arquivosUrl.length > 1 ? `<div class="miniaturas">${pc.arquivosUrl.map((u, i) => ehVideo(u) ? `<span class="chip ${i === atual ? 'on' : ''}" data-m="${i}">${ico('video')} ${esc(pc.arquivos[i])}</span>` : `<img src="${esc(u)}?v=${Date.now()}" data-m="${i}" class="${i === atual ? 'on' : ''}" alt="Slide ${i + 1}">`).join('')}</div>` : ''}
      ${pc.avisos?.length ? `<div class="nota">${pc.avisos.map(esc).join('<br>')}</div>` : ''}</div>
    <div><div class="abas">${abas.map(([k, n]) => `<button data-aba="${k}" class="${k === aba ? 'on' : ''}">${n}</button>`).join('')}</div><div id="painel"></div></div></div>`;
    pintarIcones(tela);
    $$('[data-m]').forEach(m => m.addEventListener('click', () => { atual = +m.dataset.m; desenhar(); }));
    $$('[data-aba]').forEach(b => b.addEventListener('click', () => { aba = b.dataset.aba; desenhar(); }));
    $('#excluir').onclick = async () => { if (!confirm('Mover esta peça para a lixeira (saida/.lixeira)?')) return; try { await api(`/api/peca?pasta=${encodeURIComponent(pc.pasta)}`, { method: 'DELETE' }); aviso('Peça movida para a lixeira'); location.hash = '#/pecas'; } catch (e) { falhou(e); } };
    painel();
  };
  const painel = () => {
    const el = $('#painel');
    if (aba === 'editar') {
      el.innerHTML = `<p class="sub" style="margin-bottom:12px">Mude os textos e clique em <b>Atualizar peça</b>. É rápido e não usa IA.</p>
        <div id="slides">${itens.map((s, i) => slideHtml(s, i, itens.length, ehV, dados.produtosLista || [])).join('')}</div>
        <div class="linha" style="justify-content:space-between;margin-top:6px"><button class="btn ghost" id="addSlide">${ico('mais')}${ehV ? 'Nova cena' : 'Novo slide'}</button><button class="btn grande" id="render">${ico('check')}Atualizar peça</button></div>`;
      pintarIcones(el);
      const salvarLocal = () => (itens = lerSlides(el, itens));
      $('#slides').addEventListener('click', e => {
        const b = e.target.closest('[data-acao]'); if (!b) return; e.preventDefault();
        salvarLocal(); const i = +b.closest('.slide').dataset.i;
        if (b.dataset.acao === 'subir' && i > 0) [itens[i - 1], itens[i]] = [itens[i], itens[i - 1]];
        if (b.dataset.acao === 'descer' && i < itens.length - 1) [itens[i + 1], itens[i]] = [itens[i], itens[i + 1]];
        if (b.dataset.acao === 'duplicar') itens.splice(i + 1, 0, JSON.parse(JSON.stringify(itens[i])));
        if (b.dataset.acao === 'remover' && itens.length > 1) itens.splice(i, 1);
        painel();
      });
      $('#slides').addEventListener('change', e => { if (e.target.dataset.k === 'layout') { salvarLocal(); painel(); } });
      $('#addSlide').onclick = () => { salvarLocal(); itens.push({ ...itens.at(-1), titulo: 'Novo título', texto: '' }); painel(); };
      $('#render').onclick = async () => {
        salvarLocal();
        const spec = { ...pc.spec, legenda: pc.legenda, hashtags: [] };
        delete spec.slides; delete spec.cenas;
        spec[pc.spec.cenas ? 'cenas' : 'slides'] = itens;
        try { const { job } = await api('/api/peca/render', { body: { pasta: pc.pasta, spec } }); acompanhar(job, { titulo: 'Atualizando a peça', aoTerminar: j => j.status === 'ok' && render() }); } catch (e) { falhou(e); }
      };
    }
    if (aba === 'legenda') {
      el.innerHTML = `<div class="form"><label class="campo">Legenda do post<small>O texto que vai embaixo da imagem no Instagram, com as hashtags.</small><textarea class="inp" id="leg" rows="12">${esc(pc.legenda)}</textarea></label>
        <div class="linha" style="justify-content:space-between"><span class="sub" id="nChars">${pc.legenda.length} caracteres</span><div class="linha"><button class="btn ghost" id="copiar">${ico('copiar')}Copiar</button><button class="btn" id="salvarLeg">${ico('check')}Salvar</button></div></div></div>`;
      pintarIcones(el);
      $('#leg').oninput = e => ($('#nChars').textContent = `${e.target.value.length} caracteres`);
      $('#copiar').onclick = () => navigator.clipboard.writeText($('#leg').value).then(() => aviso('Legenda copiada'));
      $('#salvarLeg').onclick = async () => { try { pc.legenda = $('#leg').value; await api('/api/peca/legenda', { method: 'PUT', body: { pasta: pc.pasta, legenda: pc.legenda } }); aviso('Legenda salva'); } catch (e) { falhou(e); } };
    }
    if (aba === 'ia') {
      el.innerHTML = `<div class="form"><label class="campo">O que mudar?<small>Ex.: "deixa o título mais curto", "troca o fundo para o estilo claro", "adiciona um slide com o preço", "refaz a legenda mais divertida".</small><textarea class="inp" id="ajuste" rows="5"></textarea></label>
        <div class="linha" style="justify-content:flex-end"><button class="btn grande" id="pedir">${ico('brilho')}Pedir ajuste</button></div></div>`;
      pintarIcones(el);
      $('#pedir').onclick = async () => {
        const pedido = $('#ajuste').value.trim(); if (!pedido) return aviso('Descreva o ajuste', true);
        try { const { job } = await api('/api/ia', { body: { tipo: 'ajuste', slug: pc.cliente, pasta: pc.pasta, pedido } }); acompanhar(job, { titulo: 'Ajustando com IA', aoTerminar: j => j.status === 'ok' && render() }); } catch (e) { falhou(e); }
      };
    }
    if (aba === 'srt') {
      const blocos = pc.srt.trim().split(/\r?\n\r?\n/).map(b => { const ls = b.split(/\r?\n/); return { n: ls[0], t: ls[1], txt: ls.slice(2).join('\n') }; });
      el.innerHTML = `<p class="sub" style="margin-bottom:12px">Corrija nomes e palavras que a transcrição errou e clique em <b>Regravar legenda</b>.</p>
        <div class="form" id="srt">${blocos.map((b, i) => `<div class="srt"><span>${esc(b.t?.split(' --> ')[0]?.slice(3, 8) || '')}</span><input class="inp" data-b="${i}" value="${esc(b.txt.replace(/\n/g, ' '))}"></div>`).join('')}</div>
        <div class="linha" style="justify-content:flex-end;margin-top:14px"><button class="btn grande" id="regravar">${ico('check')}Regravar legenda</button></div>`;
      pintarIcones(el);
      $('#regravar').onclick = async () => {
        const srt = blocos.map((b, i) => `${b.n}\n${b.t}\n${$(`[data-b="${i}"]`).value}`).join('\n\n') + '\n';
        try { const { job } = await api('/api/video', { body: { cliente: pc.cliente, arquivo: `${pc.pasta}/${pc.video.origem}`, srt } }); acompanhar(job, { titulo: 'Regravando a legenda', aoTerminar: j => j.status === 'ok' && render() }); } catch (e) { falhou(e); }
      };
    }
    if (aba === 'arquivos') {
      el.innerHTML = `<div class="lista">${pc.arquivos.map((a, i) => `<div class="item"><span class="grow"><b>${esc(a)}</b></span><a class="btn ghost peq" href="${esc(pc.arquivosUrl[i])}?baixar=1">${ico('baixar')}Baixar</a></div>`).join('')}
        <div class="item"><span class="grow"><b>legenda.txt</b></span><a class="btn ghost peq" href="/arquivos/${esc(pc.pasta)}/legenda.txt?baixar=1">${ico('baixar')}Baixar</a></div></div>`;
      pintarIcones(el);
    }
  };
  desenhar();
}

// ---- vídeos gravados ----
async function telaVideos() {
  if (!cli()) return (tela.innerHTML = semCliente());
  tela.innerHTML = `<div class="cab"><div><h1>Vídeos gravados</h1><p class="sub">Mande o vídeo do celular: a fábrica corta as pausas, coloca legenda com a fonte da marca e gera as versões de cada rede. Tudo no seu computador, sem custo.</p></div></div>
    <div class="soltar" id="zona">${ico('upload')}<div><b>Arraste o vídeo aqui</b> ou clique para escolher (MP4 ou MOV)</div></div>
    <div id="opcoes"></div>
    <div class="cab" style="margin:30px 0 14px"><h2>Vídeos editados</h2></div><div class="grade auto" id="lista"><div class="sub">Carregando…</div></div>`;
  pintarIcones(tela);
  zonaSoltar($('#zona'), 'video/*', async ([f]) => {
    $('#opcoes').innerHTML = `<div class="card" style="margin-top:14px"><div class="linha"><div class="progresso" style="flex:1"><span></span></div><span class="sub">Enviando ${esc(f.name)}…</span></div></div>`;
    try {
      const up = await enviar(f, S.cliente, 'video');
      $('#opcoes').innerHTML = `<div class="card form" style="margin-top:14px"><h2>O que fazer com <span style="color:var(--ac)">${esc(f.name)}</span>?</h2>
        <div class="chips">${[['silencio', 'Cortar pausas e "é…", "tipo"', true], ['legenda', 'Legenda palavra a palavra com a marca', true], ['volume', 'Volume padrão das redes', true]].map(([k, n, on]) => `<label class="chip on"><input type="checkbox" data-op="${k}" ${on ? 'checked' : ''}> ${n}</label>`).join('')}</div>
        <div><b style="font-size:13px">Versões extras</b><div class="chips" style="margin-top:8px">${['9:16', '1:1', '4:5', '16:9'].map(a => `<label class="chip"><input type="checkbox" data-fmt="${a}"> ${a}</label>`).join('')}</div></div>
        <div class="linha" style="justify-content:flex-end"><button class="btn grande" id="processar">${ico('check')}Processar vídeo</button></div></div>`;
      pintarIcones($('#opcoes'));
      $$('#opcoes .chip input').forEach(i => i.addEventListener('change', () => i.parentElement.classList.toggle('on', i.checked)));
      $('#processar').onclick = async () => {
        const body = { cliente: S.cliente, arquivo: up.caminho, formatos: $$('[data-fmt]:checked').map(i => i.dataset.fmt) };
        for (const i of $$('[data-op]')) body[i.dataset.op] = i.checked;
        try { const { job } = await api('/api/video', { body }); acompanhar(job, { titulo: 'Editando o vídeo', aoTerminar: () => telaVideos() }); } catch (e) { falhou(e); }
      };
    } catch (e) { falhou(e); $('#opcoes').innerHTML = ''; }
  });
  const ps = (await api(`/api/pecas?cliente=${S.cliente}`)).filter(p => p.tipo === 'video-editado');
  $('#lista').innerHTML = ps.length ? ps.map(cardPeca).join('') : `<div class="card vazio" style="grid-column:1/-1">Nenhum vídeo editado ainda.</div>`;
}

// ---- áudios ----
async function telaAudios() {
  if (!cli()) return (tela.innerHTML = semCliente());
  tela.innerHTML = `<div class="cab"><div><h1>Áudios e narração</h1><p class="sub">Escreva o texto e escolha a voz. O áudio fica salvo para usar nos vídeos.</p></div></div>
    <div class="grade g2"><div class="card form"><label class="campo">Texto da narração<small>Escreva como se fala: frases curtas, números por extenso.</small><textarea class="inp" id="texto" rows="7"></textarea></label>
      <div class="grade g2"><label class="campo">Voz<select class="inp" id="voz"><option value="">Carregando vozes…</option></select></label><label class="campo">Nome do arquivo<input class="inp" id="nome" placeholder="opcional"></label></div>
      <div id="notaVoz"></div><div class="linha" style="justify-content:space-between"><span class="sub" id="nChars">0 caracteres</span><button class="btn grande" id="gerar">${ico('audio')}Gerar narração</button></div></div>
      <div><h2 style="margin-bottom:12px">Áudios salvos</h2><div class="lista" id="lista"><div class="sub">Carregando…</div></div></div></div>`;
  pintarIcones(tela);
  $('#texto').oninput = e => ($('#nChars').textContent = `${e.target.value.length} caracteres`);
  api('/api/vozes').then(r => {
    if (r.erro) $('#notaVoz').innerHTML = `<div class="nota">${esc(r.erro)}</div>`;
    const padrao = cli()?.voz || '';
    $('#voz').innerHTML = `<option value="">Voz padrão da marca</option>` + r.vozes.map(v => `<option value="${esc(v.id)}" ${v.id === padrao ? 'selected' : ''}>${esc(v.nome)}${/pt|brazil/i.test(v.info) ? ' 🇧🇷' : ''}</option>`).join('');
  });
  $('#gerar').onclick = async () => {
    try { const { job } = await api('/api/audio', { body: { cliente: S.cliente, texto: $('#texto').value, voz: $('#voz').value, nome: $('#nome').value } }); acompanhar(job, { titulo: 'Gerando a narração', aoTerminar: () => listar() }); } catch (e) { falhou(e); }
  };
  const listar = async () => {
    const as = await api(`/api/biblioteca?cliente=${S.cliente}&tipo=audios`);
    $('#lista').innerHTML = as.length ? as.map(a => `<div class="item"><div class="grow"><b>${esc(a.nome)}</b><div class="sub" style="font-size:12.5px">${esc(a.texto.slice(0, 120))}</div></div><audio controls src="${esc(a.url)}" preload="none"></audio><a class="icobtn" href="${esc(a.url)}?baixar=1" title="Baixar">${ico('baixar')}</a></div>`).join('') : `<div class="card vazio">Nenhum áudio ainda.</div>`;
    pintarIcones($('#lista'));
  };
  listar();
}

// ---- roteiros e pautas ----
async function telaRoteiros(q) {
  if (!cli()) return (tela.innerHTML = semCliente());
  const [rs, ps] = await Promise.all([api(`/api/biblioteca?cliente=${S.cliente}&tipo=roteiros`), api(`/api/biblioteca?cliente=${S.cliente}&tipo=pautas`)]);
  const todos = [...rs.map(r => ({ ...r, tipo: 'Roteiro' })), ...ps.map(p => ({ ...p, tipo: 'Pauta' }))].sort((a, b) => b.alterado.localeCompare(a.alterado));
  let sel = todos.find(t => t.caminho === q.get('arq')) || todos[0];
  tela.innerHTML = `<div class="cab"><div><h1>Roteiros e pautas</h1><p class="sub">Textos criados pela IA para gravar, animar ou planejar. Edite à vontade.</p></div>
    <div class="linha"><a class="btn ghost" href="#/criar?tipo=pauta">${ico('ideia')}Nova pauta</a><a class="btn" href="#/criar?tipo=roteiro">${ico('mais')}Novo roteiro</a></div></div>
    ${todos.length ? `<div class="editor" style="grid-template-columns:300px 1fr"><div class="lista">${todos.map(t => `<a class="item" href="#/roteiros?arq=${encodeURIComponent(t.caminho)}" style="${t === sel ? 'border-color:var(--ac)' : ''}"><span class="grow"><span class="tag">${t.tipo}</span><b style="display:block;margin-top:4px">${esc(t.nome.replace(/\.md$/, '').replace(/^\d{4}-\d{2}-\d{2}-/, ''))}</b><span class="sub" style="font-size:12px">${quando(t.alterado)}</span></span></a>`).join('')}</div>
      <div class="card form"><textarea class="inp" id="texto" rows="24" style="font:13px/1.6 ui-monospace,Consolas,monospace">${esc(sel.texto)}</textarea>
      <div class="linha" style="justify-content:space-between"><a class="btn ghost" href="#/criar?tipo=reel&base=${encodeURIComponent(sel.caminho)}&pedido=${encodeURIComponent('Crie um reel a partir do roteiro anexado.')}">${ico('reel')}Transformar em reel</a><div class="linha"><button class="btn ghost" id="copiar">${ico('copiar')}Copiar</button><button class="btn" id="salvar">${ico('check')}Salvar</button></div></div></div></div>`
    : `<div class="card vazio">${ico('doc')}<h2>Nenhum roteiro ainda</h2><p class="sub">Peça um roteiro ou uma pauta de ideias para a IA.</p></div>`}`;
  pintarIcones(tela);
  if (!sel) return;
  $('#copiar').onclick = () => navigator.clipboard.writeText($('#texto').value).then(() => aviso('Copiado'));
  $('#salvar').onclick = async () => { try { await api('/api/texto', { method: 'PUT', body: { caminho: sel.caminho, texto: $('#texto').value } }); aviso('Salvo'); } catch (e) { falhou(e); } };
}

// ---- clientes ----
const ESTILOS = { premium: ['Premium', 'linear-gradient(135deg,#2a1a40,#0a0610)'], vibrante: ['Vibrante', 'linear-gradient(135deg,#6C2BD9,#FF4F9A)'], clean: ['Clean', 'linear-gradient(135deg,#fff,#efeae4)'], quadro: ['Quadro', 'repeating-linear-gradient(0deg,#eee 0 1px,#fff 1px 12px),repeating-linear-gradient(90deg,#eee 0 1px,#fff 1px 12px)'] };
const FONTES_T = ['Playfair Display', 'Fraunces', 'DM Serif Display', 'Montserrat', 'Poppins', 'Inter Tight', 'Bebas Neue', 'Anton', 'Sora', 'Outfit'];
const FONTES_C = ['Manrope', 'Inter', 'DM Sans', 'Poppins', 'Montserrat', 'Nunito', 'Lato', 'Work Sans', 'Outfit'];
async function telaClientes(q) {
  tela.innerHTML = `<div class="cab"><div><h1>Clientes</h1><p class="sub">Cada cliente tem cores, fontes, produtos e chaves próprias.</p></div><button class="btn" id="novo">${ico('mais')}Novo cliente</button></div>
    <div class="grade auto">${S.clientes.map(c => `<a class="cliente-card" href="#/clientes/${esc(c.slug)}"><div class="cli-topo"><div class="cli-img" style="background-image:url('${esc(c.logoUrl || c.produtosLista?.[0]?.url || '')}')"></div><div><b>${esc(c.nome)}</b><div class="sub" style="font-size:12.5px">${esc(c.instagram || '')}</div></div></div>
      <div class="cores">${['primaria', 'secundaria', 'fundo', 'texto'].map(k => `<span style="background:${esc(c.cores?.[k])}"></span>`).join('')}</div>
      <div class="linha"><span class="tag">${esc(ESTILOS[c.estilo]?.[0] || c.estilo)}</span><span class="tag">${c.produtosLista.length} produto(s)</span><span class="tag">${c.nPecas} peça(s)</span></div></a>`).join('')}</div>`;
  pintarIcones(tela);
  const abrirNovo = () => modal(`<h2>Novo cliente</h2><p class="sub" style="margin-bottom:16px">Depois você completa cores, fontes e produtos.</p><div class="form">
      <label class="campo">Nome da marca<input class="inp" id="nNome" placeholder="Ex.: Loja Bella"></label><label class="campo">@ do Instagram<input class="inp" id="nIg" placeholder="@lojabella"></label>
      <div class="linha" style="justify-content:flex-end"><button class="btn ghost" data-fechar>Cancelar</button><button class="btn" id="nCriar">Criar cliente</button></div></div>`, (c, fechar) => {
    $('#nNome', c).focus();
    $('#nCriar', c).onclick = async () => { try { const r = await api('/api/clientes', { body: { nome: $('#nNome', c).value, instagram: $('#nIg', c).value } }); fechar(); S.cliente = r.slug; await carregarClientes(); location.hash = `#/clientes/${r.slug}`; } catch (e) { falhou(e); } };
  });
  $('#novo').onclick = abrirNovo;
  if (q.get('novo')) abrirNovo();
}
async function telaCliente(slug, q) {
  let c = await api(`/api/clientes/${slug}`);
  if (S.cliente !== slug) { S.cliente = slug; await carregarClientes(); }
  let aba = q.get('aba') || 'marca';
  const desenhar = () => {
    tela.innerHTML = `<div class="cab"><div><a class="sub" href="#/clientes">${ico('voltar')} Clientes</a><h1 style="margin-top:6px">${esc(c.nome)}</h1></div></div>
      <div class="abas">${[['marca', 'Marca'], ['produtos', `Produtos (${c.produtosLista.length})`], ['publicar', 'Publicação']].map(([k, n]) => `<button data-aba="${k}" class="${k === aba ? 'on' : ''}">${n}</button>`).join('')}</div><div id="painel"></div>`;
    pintarIcones(tela);
    $$('[data-aba]').forEach(b => (b.onclick = () => { aba = b.dataset.aba; desenhar(); }));
    ({ marca, produtos, publicar })[aba]();
  };
  const marca = () => {
    const el = $('#painel');
    el.innerHTML = `<div class="grade g2"><div class="card form">
      <h2>Identidade</h2>
      <div class="grade g2"><label class="campo">Nome<input class="inp" data-m="nome" value="${esc(c.nome)}"></label><label class="campo">@ do Instagram<input class="inp" data-m="instagram" value="${esc(c.instagram || '')}"></label></div>
      <div><b style="font-size:13px">Estilo visual</b><div class="estilos" style="margin-top:8px">${Object.entries(ESTILOS).map(([k, [n, bg]]) => `<div class="estilo ${k === c.estilo ? 'on' : ''}" data-estilo="${k}"><div class="amostra" style="background:${bg}"></div>${n}</div>`).join('')}</div></div>
      <div><b style="font-size:13px">Cores</b><div class="grade g4" style="margin-top:8px">${[['primaria', 'Principal'], ['secundaria', 'Destaque'], ['fundo', 'Fundo claro'], ['texto', 'Texto']].map(([k, n]) => `<label class="campo" style="font-weight:500">${n}<input type="color" class="inp" style="height:42px;padding:4px" data-cor="${k}" value="${esc(c.cores?.[k] || '#000000')}"></label>`).join('')}</div></div>
      <div class="grade g2"><label class="campo">Fonte dos títulos<select class="inp" data-f="titulo">${[...new Set([c.fontes?.titulo, ...FONTES_T])].filter(Boolean).map(f => `<option ${f === c.fontes?.titulo ? 'selected' : ''}>${esc(f)}</option>`).join('')}</select></label>
      <label class="campo">Fonte dos textos<select class="inp" data-f="corpo">${[...new Set([c.fontes?.corpo, ...FONTES_C])].filter(Boolean).map(f => `<option ${f === c.fontes?.corpo ? 'selected' : ''}>${esc(f)}</option>`).join('')}</select></label></div>
      <div><b style="font-size:13px">Logo</b><div class="linha" style="margin-top:8px"><div class="cli-img" style="width:72px;height:72px;background-image:url('${esc(c.logoUrl || '')}')"></div><div class="soltar" id="zonaLogo" style="flex:1;padding:16px">PNG de preferência com fundo transparente</div></div></div>
      </div><div class="card form"><h2>Voz e público</h2>
      <label class="campo">Tom de voz<input class="inp" data-m="tom" value="${esc(c.tom || '')}" placeholder="Ex.: próximo, direto, bem-humorado"></label>
      <label class="campo">Público<input class="inp" data-m="publico" value="${esc(c.publico || '')}" placeholder="Ex.: mulheres de 25 a 40 anos"></label>
      <label class="campo">Hashtags fixas<small>Separadas por espaço</small><input class="inp" data-m="hashtags" value="${esc((c.hashtags || []).join(' '))}"></label>
      <label class="campo">Horários preferidos<small>Ex.: 12:00 19:30</small><input class="inp" data-m="horarios" value="${esc((c.horarios || []).join(' '))}"></label>
      <label class="chip ${c.autor ? 'on' : ''}" style="align-self:start"><input type="checkbox" id="pessoal" ${c.autor ? 'checked' : ''}> É marca pessoal (mostra foto e @ no topo)</label>
      <div id="autor" ${c.autor ? '' : 'hidden'} class="grade g2"><label class="campo">Nome da pessoa<input class="inp" id="aNome" value="${esc(c.autor?.nome || '')}"></label><label class="campo">@<input class="inp" id="aArroba" value="${esc(c.autor?.arroba || '')}"></label></div>
      <div class="linha" style="justify-content:flex-end;margin-top:auto"><button class="btn grande" id="salvar">${ico('check')}Salvar marca</button></div></div></div>`;
    pintarIcones(el);
    let estilo = c.estilo;
    $$('[data-estilo]', el).forEach(d => (d.onclick = () => { estilo = d.dataset.estilo; $$('[data-estilo]', el).forEach(x => x.classList.toggle('on', x === d)); }));
    $('#pessoal').onchange = e => { $('#autor').hidden = !e.target.checked; e.target.parentElement.classList.toggle('on', e.target.checked); };
    zonaSoltar($('#zonaLogo'), 'image/*', async ([f]) => { try { await enviar(f, slug, 'logo'); c = await api(`/api/clientes/${slug}`); aviso('Logo atualizado'); marca(); } catch (e) { falhou(e); } });
    $('#salvar').onclick = async () => {
      const b = { estilo, cores: {}, fontes: {} };
      for (const i of $$('[data-m]', el)) b[i.dataset.m] = ['hashtags', 'horarios'].includes(i.dataset.m) ? i.value.split(/\s+/).filter(Boolean) : i.value;
      for (const i of $$('[data-cor]', el)) b.cores[i.dataset.cor] = i.value;
      for (const i of $$('[data-f]', el)) b.fontes[i.dataset.f] = i.value;
      b.autor = $('#pessoal').checked ? { ...(c.autor || {}), nome: $('#aNome').value, arroba: $('#aArroba').value } : null;
      try { c = { ...c, ...(await api(`/api/clientes/${slug}`, { method: 'PUT', body: b })) }; await carregarClientes(); aviso('Marca salva'); } catch (e) { falhou(e); }
    };
  };
  const produtos = () => {
    const el = $('#painel');
    el.innerHTML = `<div class="grade auto">${c.produtosLista.map(p => `<div class="prod"><div class="ft">${p.url ? `<img src="${esc(p.url)}?v=${Date.now()}" alt="">` : ''}</div><b>${esc(p.nome || p.chave)}</b><span class="sub" style="font-size:12.5px">${esc([p.preco, p.detalhe].filter(Boolean).join(' · ') || 'sem preço')}</span>
      <div class="linha"><button class="btn ghost peq" data-ed="${esc(p.chave)}">${ico('editar')}Editar</button><button class="icobtn" data-rm="${esc(p.chave)}" title="Remover">${ico('lixo')}</button></div></div>`).join('')}
      <div class="prod soltar" id="zonaProd" style="justify-content:center;min-height:240px">${ico('upload')}<b>Adicionar produto</b><span>Arraste a foto oficial</span></div></div>`;
    pintarIcones(el);
    const editar = (p, arquivo) => modal(`<h2>${p ? 'Editar produto' : 'Novo produto'}</h2><div class="form" style="margin-top:14px">
        <div class="grade g2"><label class="campo">Nome<input class="inp" id="pNome" value="${esc(p?.nome || '')}"></label><label class="campo">Detalhe<small>Ex.: 400 ml</small><input class="inp" id="pDet" value="${esc(p?.detalhe || '')}"></label>
        <label class="campo">Preço<input class="inp" id="pPreco" value="${esc(p?.preco || '')}" placeholder="R$ 59,90"></label><label class="campo">Preço antigo<input class="inp" id="pDe" value="${esc(p?.precoDe || '')}" placeholder="opcional"></label></div>
        ${arquivo ? `<div><b style="font-size:13px">Fundo da foto</b><div class="chips" style="margin-top:8px">${[['liso', 'Tirar fundo liso (branco/bege) · rápido'], ['ia', 'Tirar fundo com IA (cenário) · ~20 s'], ['manter', 'Usar a foto como está']].map(([k, n], i) => `<label class="chip ${i === 0 ? 'on' : ''}"><input type="radio" name="modo" value="${k}" ${i === 0 ? 'checked' : ''}> ${n}</label>`).join('')}</div></div>` : ''}
        <div class="linha" style="justify-content:flex-end"><button class="btn ghost" data-fechar>Cancelar</button><button class="btn" id="pSalvar">Salvar</button></div></div>`, (cx, fechar) => {
      $$('input[name=modo]', cx).forEach(r => (r.onchange = () => $$('input[name=modo]', cx).forEach(x => x.parentElement.classList.toggle('on', x.checked))));
      $('#pSalvar', cx).onclick = async () => {
        const nome = $('#pNome', cx).value.trim() || 'produto';
        const chave = p?.chave || nome;
        const dados = { nome, detalhe: $('#pDet', cx).value, preco: $('#pPreco', cx).value, precoDe: $('#pDe', cx).value };
        try {
          if (arquivo) {
            const modo = $('input[name=modo]:checked', cx).value;
            if (modo === 'manter') dados.foto = arquivo.caminho.replace(`clientes/${slug}/`, '');
            else {
              fechar();
              const { job } = await api(`/api/clientes/${slug}/recortar`, { body: { arquivo: arquivo.caminho, chave, nome, modo, escala: 2 } });
              return acompanhar(job, { titulo: 'Recortando a foto do produto', aoTerminar: async j => { if (j.status === 'ok') { await api(`/api/clientes/${slug}/produtos/${encodeURIComponent(chave)}`, { method: 'PUT', body: dados }); c = await api(`/api/clientes/${slug}`); produtos(); } } });
            }
          }
          await api(`/api/clientes/${slug}/produtos/${encodeURIComponent(chave)}`, { method: 'PUT', body: dados });
          fechar(); c = await api(`/api/clientes/${slug}`); produtos(); aviso('Produto salvo');
        } catch (e) { falhou(e); }
      };
    });
    zonaSoltar($('#zonaProd'), 'image/*', async ([f]) => { try { editar(null, await enviar(f, slug, 'produto')); } catch (e) { falhou(e); } });
    $$('[data-ed]', el).forEach(b => (b.onclick = () => editar(c.produtosLista.find(p => p.chave === b.dataset.ed))));
    $$('[data-rm]', el).forEach(b => (b.onclick = async () => { if (!confirm('Remover este produto do cadastro? (a foto continua na pasta)')) return; c = await api(`/api/clientes/${slug}/produtos/${encodeURIComponent(b.dataset.rm)}`, { method: 'DELETE' }); produtos(); }));
  };
  const publicar = () => {
    const el = $('#painel');
    const campo = (k, n) => `<label class="campo">${n} ${c.chaves[k] ? '<span class="tag ok">preenchida</span>' : '<span class="tag">vazia</span>'}<input class="inp" type="password" autocomplete="off" data-ch="${k}" placeholder="${c.chaves[k] ? 'Deixe em branco para manter' : 'Cole aqui'}"></label>`;
    el.innerHTML = `<div class="nota info" style="margin-bottom:16px">O Estúdio não publica nada sozinho. Estas chaves servem para agendar depois, quando você pedir. Elas ficam só neste computador.</div>
      <div class="grade g2"><div class="card form"><h2>Metricool <span class="tag">recomendado</span></h2><p class="sub">Todas as redes. Precisa de plano com API.</p>${campo('METRICOOL_TOKEN', 'Token (userToken)')}${campo('METRICOOL_USER_ID', 'User ID')}${campo('METRICOOL_BLOG_ID', 'Blog ID (marca)')}</div>
      <div class="card form"><h2>Meta direto</h2><p class="sub">Instagram e Facebook, grátis, exige app da Meta.</p>${campo('META_PAGE_ID', 'ID da página')}${campo('META_PAGE_TOKEN', 'Token da página')}${campo('IG_USER_ID', 'ID do Instagram')}</div></div>
      <div class="linha" style="justify-content:flex-end;margin-top:16px"><button class="btn grande" id="salvarCh">${ico('check')}Salvar chaves</button></div>`;
    pintarIcones(el);
    $('#salvarCh').onclick = async () => { const b = {}; for (const i of $$('[data-ch]', el)) if (i.value.trim()) b[i.dataset.ch] = i.value; try { c.chaves = await api(`/api/clientes/${slug}/chaves`, { method: 'PUT', body: b }); aviso('Chaves salvas'); publicar(); } catch (e) { falhou(e); } };
  };
  desenhar();
}

// ---- ajustes ----
async function telaAjustes() {
  const e = S.estado = await api('/api/estado');
  const f = e.ferramentas;
  const st = (ok, n, d) => `<div class="item"><span class="grow"><b>${n}</b><div class="sub" style="font-size:12.5px">${d}</div></span><span class="tag ${ok ? 'ok' : 'falta'}">${ok ? 'pronto' : 'falta'}</span></div>`;
  const ch = (k, n, d) => `<label class="campo">${n} ${e.chaves[k] ? '<span class="tag ok">preenchida</span>' : '<span class="tag">vazia</span>'}<small>${d}</small><input class="inp" type="${k.endsWith('VOICE_ID') ? 'text' : 'password'}" autocomplete="off" data-ch="${k}" placeholder="${e.chaves[k] ? 'Deixe em branco para manter' : 'Cole aqui'}"></label>`;
  tela.innerHTML = `<div class="cab"><div><h1>Ajustes</h1><p class="sub">Ferramentas instaladas e chaves de serviços (opcionais).</p></div></div>
    <div class="grade g2"><div class="card"><h2 style="margin-bottom:12px">Ferramentas</h2><div class="lista">
      ${st(f.motor, 'Motor de artes e vídeos', 'Posts, carrosséis e reels animados')}${st(f.claude, 'IA (Claude Code)', 'Botões "Criar com IA" e "Pedir à IA"')}
      ${st(f.ffmpegSkill, 'Editor de vídeo', 'Cortes, legenda, volume e formatos')}${st(f.fasterWhisper, 'Transcrição local', 'Legenda automática em português')}${st(f.backgroundremover, 'Recorte com IA', 'Tirar fundo de fotos com cenário')}</div>
      <label class="campo" style="margin-top:16px">Modelo da IA<small>Sonnet é rápido e econômico; Opus capricha mais.</small><select class="inp" id="modelo">${['sonnet', 'opus', 'haiku', 'fable'].map(m => `<option ${m === e.modelo ? 'selected' : ''}>${m}</option>`).join('')}</select></label>
      <label class="campo" style="margin-top:12px">Conta da IA<small>"Minha conta do Claude" usa o login do Claude deste computador e ignora proxies configurados no Claude Code.</small><select class="inp" id="conta"><option value="claude" ${e.conta === 'claude' ? 'selected' : ''}>Minha conta do Claude (recomendado)</option><option value="sistema" ${e.conta === 'sistema' ? 'selected' : ''}>Configuração do Claude Code deste computador</option></select></label></div>
    <div class="card form" id="cardAtalhos"><h2>Atalhos</h2><p class="sub">Abra o Estúdio como um aplicativo, sem janela preta.</p><div class="sub">Verificando…</div></div>
    <div class="card form"><h2>Chaves da agência</h2><p class="sub">Cole cada chave e clique em Salvar. Elas ficam só neste computador e nunca aparecem de novo na tela.</p>${ch('ELEVENLABS_API_KEY', 'ElevenLabs', 'Narração dos reels e áudios')}<label class="campo">Voz padrão<small>Usada quando a marca não tem voz própria. 🇧🇷 = português do Brasil</small><select class="inp" data-ch="ELEVENLABS_VOICE_ID" id="vozPadrao"><option value="">Carregando vozes…</option></select></label><div id="notaVoz"></div>${ch('FAL_KEY', 'fal.ai', 'Ilustrações e fundos com IA')}
      <div class="linha" style="justify-content:flex-end"><button class="btn" id="salvar">${ico('check')}Salvar</button></div></div></div>`;
  pintarIcones(tela);
  $('#salvar').onclick = async () => { const chaves = {}; for (const i of $$('[data-ch]')) if (i.value.trim()) chaves[i.dataset.ch] = i.value; try { await api('/api/estado', { method: 'PUT', body: { chaves, modelo: $('#modelo').value } }); aviso('Ajustes salvos'); telaAjustes(); } catch (er) { falhou(er); } };
  const atalhos = async () => {
    const el = $('#cardAtalhos'); if (!el) return;
    const a = await api('/api/atalhos').catch(() => ({ suportado: false }));
    el.innerHTML = `<h2>Atalhos</h2><p class="sub">Abra o Estúdio como um aplicativo, sem janela preta.</p>${a.suportado ? `
      <div class="item"><span class="grow"><b>Atalho na Área de Trabalho</b><div class="sub" style="font-size:12.5px">"Estúdio da Fábrica", com ícone</div></span>${a.desktop ? '<span class="tag ok">criado</span>' : `<button class="btn peq" id="criarAtalho">${ico('mais')}Criar</button>`}</div>
      <label class="item" style="cursor:pointer"><span class="grow"><b>Abrir quando o Windows ligar</b><div class="sub" style="font-size:12.5px">Fica pronto em segundo plano, sem abrir o navegador</div></span><input type="checkbox" id="startup" ${a.startup ? 'checked' : ''} style="width:20px;height:20px;accent-color:var(--ac)"></label>` : '<div class="nota">Atalhos automáticos só no Windows. No Mac, use "Abrir Estudio.command".</div>'}`;
    pintarIcones(el);
    $('#criarAtalho', el)?.addEventListener('click', async () => { try { await api('/api/atalhos', { method: 'PUT', body: { desktop: true } }); aviso('Atalho criado na Área de Trabalho'); atalhos(); } catch (er) { falhou(er); } });
    $('#startup', el)?.addEventListener('change', async ev => { try { await api('/api/atalhos', { method: 'PUT', body: { startup: ev.target.checked } }); aviso(ev.target.checked ? 'O Estúdio vai abrir com o Windows' : 'Não abre mais com o Windows'); } catch (er) { falhou(er); ev.target.checked = !ev.target.checked; } });
  };
  atalhos();
  api('/api/vozes').then(r => {
    const sel = $('#vozPadrao'); if (!sel) return;
    const lista = r.vozes.length ? r.vozes : e.vozPadrao ? [{ id: e.vozPadrao, nome: `Voz atual (${e.vozPadrao})`, info: '' }] : [];
    sel.innerHTML = `<option value="">Nenhuma</option>` + lista.map(v => `<option value="${esc(v.id)}" ${v.id === e.vozPadrao ? 'selected' : ''}>${esc(v.nome)}${/pt|brazil/i.test(v.info) ? ' 🇧🇷' : ''}</option>`).join('');
    if (r.erro) $('#notaVoz').innerHTML = `<div class="nota">${esc(r.erro)}</div>`;
  });
  $('#modelo').onchange = () => api('/api/estado', { method: 'PUT', body: { modelo: $('#modelo').value } }).then(() => aviso('Modelo salvo'));
  $('#conta').onchange = () => api('/api/estado', { method: 'PUT', body: { conta: $('#conta').value } }).then(() => aviso('Conta da IA salva'));
}

// ---------- roteador ----------
async function render() {
  const [caminho, qs] = (location.hash.slice(1) || '/inicio').split('?');
  const q = new URLSearchParams(qs || '');
  const partes = caminho.split('/').filter(Boolean);
  const r = partes[0] || 'inicio';
  $$('#menu a').forEach(a => a.classList.toggle('on', a.dataset.r === (r === 'peca' ? 'pecas' : r)));
  $('#modal').hidden = true; $('#modal .caixa').innerHTML = ''; // tasks keep running; the sidebar button reopens them
  tela.innerHTML = '<div class="sub">Carregando…</div>';
  try {
    if (r === 'inicio') await telaInicio();
    else if (r === 'criar') await telaCriar(q);
    else if (r === 'pecas') await telaPecas(q);
    else if (r === 'peca') await telaPeca(q);
    else if (r === 'videos') await telaVideos();
    else if (r === 'audios') await telaAudios();
    else if (r === 'roteiros') await telaRoteiros(q);
    else if (r === 'clientes' && partes[1]) await telaCliente(partes[1], q);
    else if (r === 'clientes') await telaClientes(q);
    else if (r === 'ajustes') await telaAjustes();
    else location.hash = '#/inicio';
  } catch (e) { tela.innerHTML = `<div class="card vazio"><h2>Algo deu errado</h2><p class="sub">${esc(e.message)}</p></div>`; }
  pintarIcones(tela);
  tela.focus({ preventScroll: true });
}
window.addEventListener('hashchange', () => { window.scrollTo(0, 0); render(); });
(async () => {
  pintarIcones();
  try { S.estado = await api('/api/estado'); await carregarClientes(); } catch (e) { tela.innerHTML = `<div class="card vazio"><h2>O Estúdio não está rodando</h2><p class="sub">Abra o atalho "Estúdio" de novo.</p></div>`; return; }
  render(); atualizarTarefas();
})();
