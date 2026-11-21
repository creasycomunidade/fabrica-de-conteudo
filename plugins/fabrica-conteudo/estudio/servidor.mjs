// Estúdio da Fábrica de Conteúdo: interface no navegador para quem não programa.
//   node estudio/servidor.mjs            abre em http://localhost:3838 (só neste computador)
// Sem dependências: Node puro. Arquivos servidos só de saida/ e clientes/ (nunca .env).
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(AQUI, '..');
const PUB = path.join(AQUI, 'public');
const P = (...a) => path.join(ROOT, ...a);
const PY = process.platform === 'win32' ? 'python' : 'python3';
const FFSK = path.join(os.homedir(), '.claude', 'skills', 'ffmpeg-skill', 'scripts');
const CFG_ARQ = P('estudio', 'config.json');
const cfg = () => ({ porta: 3838, modelo: 'sonnet', conta: 'claude', envClaude: {}, ...(fs.existsSync(CFG_ARQ) ? JSON.parse(fs.readFileSync(CFG_ARQ, 'utf8')) : {}) });

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.mp4': 'video/mp4', '.mov': 'video/quicktime', '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.m4a': 'audio/mp4', '.srt': 'text/plain; charset=utf-8', '.txt': 'text/plain; charset=utf-8', '.md': 'text/plain; charset=utf-8', '.ttf': 'font/ttf' };
const lerJson = f => JSON.parse(fs.readFileSync(f, 'utf8'));
const salvarJson = (f, o) => { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, JSON.stringify(o, null, 2)); };
const slugify = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'item';
const hoje = () => new Date().toISOString().slice(0, 10);
const rel = abs => path.relative(ROOT, abs).split(path.sep).join('/');
const url = abs => `/arquivos/${rel(abs)}`;

// Trust boundary: every client-supplied path must resolve inside these folders.
function seguro(relativo, ...bases) {
  const abs = path.resolve(ROOT, relativo || '');
  const ok = bases.some(b => abs === P(b) || abs.startsWith(P(b) + path.sep));
  if (!ok || path.basename(abs).startsWith('.') || abs.split(path.sep).some(s => s === '.env')) throw Object.assign(new Error('caminho não permitido'), { status: 403 });
  return abs;
}
const cliente = s => { if (!/^[a-z0-9-]+$/.test(s || '')) throw Object.assign(new Error('cliente inválido'), { status: 400 }); const d = P('clientes', s); if (!fs.existsSync(path.join(d, 'marca.json'))) throw Object.assign(new Error('cliente não existe'), { status: 404 }); return d; };

// ---------- jobs (processos em segundo plano com log) ----------
const jobs = new Map();
function novoJob(titulo, slug) {
  const j = { id: crypto.randomUUID().slice(0, 8), titulo, cliente: slug, status: 'rodando', log: [], resultado: null, erro: null, inicio: Date.now() };
  jobs.set(j.id, j);
  return j;
}
const logar = (j, t) => { for (const l of String(t).split(/\r?\n/)) if (l.trim()) j.log.push(l.slice(0, 400)); if (j.log.length > 500) j.log.splice(0, j.log.length - 500); };
function rodar(j, cmd, args, { cwd = ROOT, entrada, aoLinha } = {}) {
  return new Promise((ok, erro) => {
    logar(j, `▸ ${path.basename(cmd)} ${args.filter(a => a.length < 80).join(' ').slice(0, 200)}`);
    const pr = spawn(cmd, args, { cwd, env: { ...process.env, PYTHONIOENCODING: 'utf-8' } });
    let buf = '';
    const linha = d => { buf += d; const ls = buf.split(/\r?\n/); buf = ls.pop(); for (const l of ls) aoLinha ? aoLinha(l) : logar(j, l); };
    pr.stdout.on('data', linha); pr.stderr.on('data', d => logar(j, d));
    if (entrada) pr.stdin.end(entrada); else pr.stdin.end();
    pr.on('error', erro);
    pr.on('close', c => { if (buf) aoLinha ? aoLinha(buf) : logar(j, buf); if (c === 0) return ok(); const msg = [...j.log].reverse().find(l => l.startsWith('ERRO:')); erro(new Error(msg ? msg.replace(/^ERRO:\s*/, '') : `${path.basename(cmd)} terminou com erro (${c})`)); });
  });
}
async function executar(j, fn) {
  try { j.resultado = await fn(); j.status = 'ok'; } catch (e) { j.status = 'erro'; j.erro = e.message; logar(j, `ERRO: ${e.message}`); }
  j.fim = Date.now();
}

// ---------- Claude Code em segundo plano ----------
function claudeBin() {
  const c = [process.env.CLAUDE_BIN, process.env.APPDATA && path.join(process.env.APPDATA, 'npm', 'node_modules', '@anthropic-ai', 'claude-code', 'bin', 'claude.exe')].filter(Boolean).find(f => fs.existsSync(f));
  return c || 'claude';
}
// "claude" mode: ignore proxy/model variables from the user's settings and use the logged-in Claude account.
// User settings are skipped, so the plugins the Estúdio needs are loaded explicitly.
function pluginDirs() {
  let reg = {};
  try { reg = JSON.parse(fs.readFileSync(path.join(os.homedir(), '.claude', 'plugins', 'installed_plugins.json'), 'utf8')).plugins || {}; } catch { /* no registry */ }
  const inst = k => { const v = reg[k]; return (Array.isArray(v) ? v.at(-1) : v)?.installPath; };
  const local = P('plugins', 'fabrica-conteudo');
  const fab = fs.existsSync(path.join(local, '.claude-plugin', 'plugin.json')) ? local : inst('fabrica-conteudo@creasy');
  return [fab, inst('youtube-agent@youtube-agent-skill')].filter(d => d && fs.existsSync(d));
}
function ambienteClaude(c) {
  if (c.conta !== 'claude') return { env: { ...process.env, ...c.envClaude }, extra: [] };
  const env = Object.fromEntries(Object.entries(process.env).filter(([k]) => !k.startsWith('ANTHROPIC_')));
  return { env, extra: ['--setting-sources', 'project,local', ...pluginDirs().flatMap(d => ['--plugin-dir', d])] };
}
const FERRAMENTAS = ['Read', 'Write', 'Edit', 'Glob', 'Grep', 'Skill', 'Bash(node motor/*)', 'Bash(node motor/render.mjs *)', `Bash(${PY} *)`, 'Bash(ffmpeg *)', 'Bash(ls *)', 'Bash(mkdir *)'];
const REGRAS = 'Não publique nem agende nada. Não leia nem altere arquivos .env. Ao terminar, a ÚLTIMA linha da resposta deve ser só um JSON: {"pecas":["saida/<cliente>/<pasta>"],"arquivos":["caminhos de .md/.mp3 criados"],"resumo":"uma frase"}.';
function promptPara({ tipo, slug, pedido, anexos = [], pasta, formato, narracao }) {
  const base = `Você está no Estúdio da Fábrica de Conteúdo, na pasta de trabalho atual. Siga a skill fabrica-conteudo. Cliente: ${slug} (clientes/${slug}/marca.json).`;
  const anx = anexos.length ? `\nArquivos enviados pelo usuário: ${anexos.join(', ')}. Se forem fotos de produto, recorte com node motor/imagem.mjs recortar (use --ia se o fundo não for liso), confira o recorte e cadastre o produto no marca.json.` : '';
  const ped = `\nPedido do usuário: """${pedido}"""`;
  const peca = `Salve o spec em saida/${slug}/specs/ com "saida": "saida/${slug}/<nome-curto>" e renderize com node motor/render.mjs <spec>. Revise as imagens geradas e corrija o que precisar.`;
  const t = {
    post: `Crie um post (imagem única)${formato ? ` no formato ${formato}` : ''}. ${peca}`,
    carrossel: `Crie um carrossel${formato ? ` no formato ${formato}` : ''}. ${peca}`,
    story: `Crie um story (imagem 9:16). ${peca}`,
    reel: `Crie um reel (vídeo animado 9:16) seguindo o comando criar-video da fábrica.${narracao ? ' Inclua narração com "fala" em cada cena (ElevenLabs).' : ' Sem narração.'} ${peca}`,
    anuncio: `Crie um vídeo de anúncio completo (personagem, produto real, narração, legenda e cartela) seguindo o comando video-completo da fábrica: roteiro em 3 a 5 cenas, spec em saida/${slug}/specs/ e node motor/completo.mjs <spec> com timeout de 540000 ms no Bash (se estourar, rode de novo: o cache continua de onde parou). Revise os quadros e a capa antes de terminar.`,
    roteiro: `Escreva um roteiro${formato ? ` (${formato})` : ''} pronto para gravar ou animar: gancho forte nos 2 primeiros segundos (use a skill yt-script se ajudar), falas, o que aparece na tela e duração de cada parte. Salve em saida/${slug}/roteiros/${hoje()}-<nome-curto>.md.`,
    pauta: `Faça uma pauta de conteúdo seguindo o comando pauta da fábrica. Salve em saida/${slug}/pautas/${hoje()}-<tema>.md.`,
    editor: `Edite o projeto de vídeo em ${pasta}/projeto.json (formato no topo de motor/editor.mjs e na seção "Editor de vídeo" da skill). O vídeo está parado em ${Number(formato?.tempo || 0).toFixed(2)} s${formato?.sel ? `, com o trecho de ${formato.sel[0].toFixed(2)} s a ${formato.sel[1].toFixed(2)} s selecionado` : ''}. "Aqui", "isso" e "essa parte" se referem a esse ponto ou trecho. Use "palavras" (transcrição com o tempo de cada palavra) para achar falas, palavras e pausas. Adicione, mude ou remova itens de "edicoes" conforme o pedido; cada item novo com "id" único e "nota" curta (ex.: "pausa", "zoom em grátis"). Tempos sempre do vídeo original. Música, legenda e formatos ficam nos campos "musica", "legenda" e "formatos". Não exporte nem renderize: o usuário vê a prévia na hora. Responda em uma frase o que mudou.`,
    ajuste: `Ajuste a peça existente em ${pasta} (o spec está em ${pasta}/peca.json, campo "spec"; se o campo for "anuncio", é um vídeo completo). Edite conforme o pedido, mantenha "saida": "${pasta}" e gere de novo com node motor/render.mjs (spec) ou node motor/completo.mjs (anuncio, salvo como arquivo JSON). No vídeo completo, mude só as cenas pedidas: as outras saem do cache.`,
  }[tipo];
  if (!t) throw Object.assign(new Error('tipo inválido'), { status: 400 });
  return `${base}\n${t}${anx}${ped}\n${REGRAS}`;
}
// Limits: the first reply must come in 2 min (a broken setup retries silently); after that a task may run
// as long as it keeps working, and is only stopped after 10 min with no activity or 2 h in total.
const LIMITE = { primeira: 2 * 60000, parado: 10 * 60000, total: 120 * 60000 };
function jobClaude(dados) {
  const c = cfg();
  const j = novoJob(dados.titulo || `IA: ${dados.tipo}`, dados.slug);
  j.dados = dados; // lets the interface offer "try again"
  const prompt = dados.retomar ? 'Continue a tarefa anterior exatamente de onde parou, sem refazer o que já está pronto. ' + REGRAS : promptPara(dados);
  executar(j, async () => {
    let final = '';
    const amb = ambienteClaude(c);
    const args = ['-p', ...(dados.retomar ? ['--resume', dados.retomar] : []), '--model', c.modelo, '--output-format', 'stream-json', '--verbose', '--permission-mode', 'acceptEdits', '--max-turns', '80', ...amb.extra, '--allowedTools', ...FERRAMENTAS];
    await new Promise((ok, erro) => {
      const pr = spawn(claudeBin(), args, { cwd: ROOT, env: amb.env });
      let buf = '', respondeu = false, motivo = '', ultima = Date.now();
      const vigia = setInterval(() => {
        const agora = Date.now();
        if (!respondeu && agora - j.inicio > LIMITE.primeira) motivo = 'A IA não respondeu em 2 minutos. O Claude Code deste computador pode estar configurado para um proxy ou modelo que não está funcionando (veja Ajustes).';
        else if (respondeu && agora - ultima > LIMITE.parado) motivo = 'A IA ficou 10 minutos sem nenhuma atividade e a tarefa foi pausada. Use "Continuar de onde parou".';
        else if (agora - j.inicio > LIMITE.total) motivo = 'A tarefa passou de 2 horas e foi pausada. Use "Continuar de onde parou".';
        if (motivo) { clearInterval(vigia); pr.kill(); }
      }, 5000);
      pr.stdout.on('data', d => {
        ultima = Date.now();
        buf += d; const ls = buf.split(/\r?\n/); buf = ls.pop();
        for (const l of ls) {
          let m; try { m = JSON.parse(l); } catch { continue; }
          if (m.session_id) j.sessao = m.session_id; // enables "continue where it stopped"
          if (m.type === 'assistant') respondeu = true;
          if (m.type === 'assistant') for (const b of m.message?.content || []) {
            if (b.type === 'text' && b.text.trim()) logar(j, `💬 ${b.text.trim().split('\n')[0]}`);
            if (b.type === 'tool_use') logar(j, `🔧 ${b.name}${b.input?.command ? `: ${String(b.input.command).slice(0, 140)}` : b.input?.file_path ? `: ${rel(path.resolve(ROOT, b.input.file_path))}` : ''}`);
          }
          if (m.type === 'result') { final = m.result || ''; if (m.is_error || m.subtype !== 'success') logar(j, `Resultado: ${m.subtype} ${m.terminal_reason || ''}`); }
        }
      });
      pr.stderr.on('data', d => logar(j, d));
      pr.stdin.end(prompt);
      pr.on('error', e => erro(new Error(`Não consegui iniciar o Claude Code: ${e.message}`)));
      pr.on('close', code => { clearInterval(vigia); code === 0 && final && !motivo ? ok() : erro(new Error(motivo || final || 'O Claude Code não concluiu. Veja o log e a página Ajustes.')); });
    });
    const linhaJson = final.trim().split('\n').reverse().find(l => l.trim().startsWith('{'));
    let r = {}; try { r = JSON.parse(linhaJson); } catch { r = { resumo: final.trim().split('\n').at(-1) }; }
    // Only folders that really are pieces get an "open" button.
    r.pecas = (r.pecas || []).filter(x => { try { return fs.existsSync(path.join(seguro(x, 'saida'), 'peca.json')); } catch { return false; } });
    if (dados.slug) spawnSync(process.execPath, [P('motor', 'revisao.mjs'), dados.slug], { cwd: ROOT });
    return r;
  });
  return j;
}

// ---------- dados ----------
function listarPecas(slug) {
  const base = P('saida', slug);
  const out = [];
  (function andar(d) {
    if (!fs.existsSync(d)) return;
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const f = path.join(d, e.name);
      if (e.isDirectory() && !e.name.startsWith('.')) andar(f);
      else if (e.name === 'peca.json') {
        try {
          const pc = lerJson(f);
          const st = fs.statSync(f);
          out.push({ pasta: rel(d), nome: path.basename(d), tipo: pc.tipo, formato: pc.formato, criado: pc.criado || st.mtime.toISOString(), alterado: st.mtime.toISOString(), legenda: pc.legenda || '', avisos: pc.avisos || [], arquivos: pc.arquivos.map(a => url(path.join(d, a))), capa: url(path.join(d, fs.existsSync(path.join(d, 'capa.jpg')) ? 'capa.jpg' : pc.arquivos[0])) });
        } catch { /* skip broken */ }
      }
    }
  })(base);
  return out.sort((a, b) => b.alterado.localeCompare(a.alterado));
}
function resumoCliente(slug) {
  const m = lerJson(P('clientes', slug, 'marca.json'));
  const prods = Object.entries(m.produtos || {}).map(([chave, v]) => ({ chave, ...v, url: v.foto && fs.existsSync(P('clientes', slug, v.foto)) ? url(P('clientes', slug, v.foto)) : null }));
  const pecas = listarPecas(slug);
  return { slug, ...m, produtosLista: prods, logoUrl: m.logo && fs.existsSync(P('clientes', slug, m.logo)) ? url(P('clientes', slug, m.logo)) : null, nPecas: pecas.length, ultima: pecas[0]?.capa || null };
}
const CHAVES = ['METRICOOL_TOKEN', 'METRICOOL_USER_ID', 'METRICOOL_BLOG_ID', 'META_PAGE_ID', 'META_PAGE_TOKEN', 'IG_USER_ID', 'WEBHOOK_URL'];
const CHAVES_GERAIS = ['FAL_KEY', 'ELEVENLABS_API_KEY', 'ELEVENLABS_VOICE_ID', 'GEMINI_API_KEY', 'RUNWAYML_API_SECRET', 'MINIMAX_API_KEY', 'HIGGSFIELD_KEY', 'HIGGSFIELD_APP', 'HEYGEN_API_KEY'];
function lerEnv(f) { const o = {}; if (fs.existsSync(f)) for (const l of fs.readFileSync(f, 'utf8').split(/\r?\n/)) { const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/); if (m) o[m[1]] = m[2].trim(); } return o; }
function gravarEnv(f, novos, permitidas) {
  const atual = lerEnv(f);
  for (const k of permitidas) if (typeof novos[k] === 'string' && novos[k].trim()) atual[k] = novos[k].trim().replace(/[\r\n]/g, '');
  fs.writeFileSync(f, permitidas.map(k => `${k}=${atual[k] || ''}`).join('\n') + '\n');
}
const preenchidas = (f, ks) => Object.fromEntries(ks.map(k => [k, !!lerEnv(f)[k]]));

let ESTADO_FERRAMENTAS = null;
function ferramentas() {
  if (ESTADO_FERRAMENTAS) return ESTADO_FERRAMENTAS;
  const py = mod => spawnSync(PY, ['-c', `import ${mod}`]).status === 0;
  ESTADO_FERRAMENTAS = {
    ffmpegSkill: fs.existsSync(path.join(FFSK, 'caption.py')),
    fasterWhisper: py('faster_whisper'),
    backgroundremover: py('backgroundremover'),
    claude: fs.existsSync(claudeBin()) || spawnSync(claudeBin(), ['--version']).status === 0,
    motor: fs.existsSync(P('motor', 'node_modules')),
  };
  return ESTADO_FERRAMENTAS;
}

// ---------- vídeo gravado (ffmpeg-skill, sem IA) ----------
function jobVideo(slug, origem, op) {
  const j = novoJob(`Vídeo: ${path.basename(origem)}`, slug);
  const dir = path.dirname(origem);
  executar(j, async () => {
    const py = (script, args) => rodar(j, PY, [path.join(FFSK, script), ...args, '--overwrite'], { cwd: dir });
    let atual = path.basename(origem);
    if (op.silencio) { await py('silence.py', [atual, '--transcribe', '--engine', 'faster-whisper', '--model', 'small', '--filler', '--filler-lang', 'pt', '-o', 'sem-silencio.mp4']); atual = 'sem-silencio.mp4'; }
    if (op.volume) { await py('loudness.py', [atual, '-I', '-14', '-o', 'volume.mp4']); atual = 'volume.mp4'; }
    const meta = fs.existsSync(path.join(dir, 'video.json')) ? lerJson(path.join(dir, 'video.json')) : {};
    // Windows locks a file while the browser plays it, so every run writes new names instead of overwriting.
    const sfx = `-${Date.now() % 1000000}`;
    if (op.legenda) {
      const f = spawnSync(process.execPath, [P('motor', 'fonte.mjs'), slug], { cwd: ROOT, encoding: 'utf8' });
      const fonte = JSON.parse(f.stdout);
      meta.baseLegenda = atual; meta.fonte = fonte;
      const fonteArgs = ['--karaoke', '--karaoke-style', 'word', '--font', fonte.fonteLegenda, '--fonts-dir', fonte.fontsDir, '--highlight-color', fonte.destaque, '--font-size', '22'];
      await py('caption.py', [atual, ...(op.srt ? ['--srt', op.srt] : ['--transcribe', '--engine', 'faster-whisper', '--model', 'small', '--lang', 'pt', '--write-srt', 'legenda.srt']), ...fonteArgs, '-o', `legendado${sfx}.mp4`]);
      atual = `legendado${sfx}.mp4`;
    }
    const arquivos = [atual];
    for (const a of op.formatos || []) {
      if (!/^\d+:\d+$/.test(a)) continue;
      const out = `final-${a.replace(':', 'x')}${sfx}.mp4`;
      await py('fit.py', [atual, '--aspect', a, '--fit', 'blur', '-o', out]);
      arquivos.push(out);
    }
    for (const f of fs.readdirSync(dir)) if (/^(legendado|final-)/.test(f) && !arquivos.includes(f) && !f.endsWith('.ass')) try { fs.rmSync(path.join(dir, f)); } catch { /* still playing; removed next run */ }
    salvarJson(path.join(dir, 'video.json'), { ...meta, origem: meta.origem || path.basename(origem), op });
    salvarJson(path.join(dir, 'peca.json'), { cliente: slug, tipo: 'video-editado', formato: 'gravado', arquivos, legenda: fs.existsSync(path.join(dir, 'peca.json')) ? lerJson(path.join(dir, 'peca.json')).legenda || '' : '', criado: new Date().toISOString() });
    return { pecas: [rel(dir)], resumo: `${arquivos.length} arquivo(s) prontos` };
  });
  return j;
}

// ---------- HTTP ----------
const resJson = (res, code, o) => { res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(o)); };
const corpo = req => new Promise((ok, erro) => { let s = ''; req.on('data', d => { s += d; if (s.length > 5e6) { erro(Object.assign(new Error('pedido grande demais'), { status: 413 })); req.destroy(); } }); req.on('end', () => { try { ok(s ? JSON.parse(s) : {}); } catch { erro(Object.assign(new Error('JSON inválido'), { status: 400 })); } }); });

function servirArquivo(req, res, abs) {
  if (!fs.existsSync(abs) || !fs.statSync(abs).isFile()) { res.writeHead(404); return res.end('não encontrado'); }
  const st = fs.statSync(abs);
  const tipo = MIME[path.extname(abs).toLowerCase()] || 'application/octet-stream';
  const range = req.headers.range?.match(/bytes=(\d*)-(\d*)/);
  // Range requests let the browser seek in videos.
  if (range) {
    const ini = range[1] ? +range[1] : 0, fim = range[2] ? Math.min(+range[2], st.size - 1) : st.size - 1;
    res.writeHead(206, { 'Content-Type': tipo, 'Content-Range': `bytes ${ini}-${fim}/${st.size}`, 'Accept-Ranges': 'bytes', 'Content-Length': fim - ini + 1 });
    return fs.createReadStream(abs, { start: ini, end: fim }).pipe(res);
  }
  res.writeHead(200, { 'Content-Type': tipo, 'Content-Length': st.size, 'Accept-Ranges': 'bytes', 'Cache-Control': abs.startsWith(PUB) ? 'no-store' : 'no-cache', ...(new URL(req.url, 'http://x').searchParams.has('baixar') ? { 'Content-Disposition': `attachment; filename="${path.basename(abs)}"` } : {}) });
  fs.createReadStream(abs).pipe(res);
}

const rotas = [];
const rota = (metodo, padrao, fn) => rotas.push({ metodo, re: new RegExp(`^${padrao.replace(/:(\w+)/g, '(?<$1>[^/]+)')}$`), fn });

rota('GET', '/api/estado', async () => ({ ferramentas: ferramentas(), chaves: preenchidas(P('.env'), CHAVES_GERAIS), modelo: cfg().modelo, conta: cfg().conta, vozPadrao: lerEnv(P('.env')).ELEVENLABS_VOICE_ID || '', raiz: ROOT }));
rota('PUT', '/api/estado', async (req, b) => {
  if (b.chaves) gravarEnv(P('.env'), b.chaves, CHAVES_GERAIS);
  if (b.modelo && /^[a-z0-9.\-]+$/i.test(b.modelo)) salvarJson(CFG_ARQ, { ...cfg(), modelo: b.modelo });
  if (['claude', 'sistema'].includes(b.conta)) salvarJson(CFG_ARQ, { ...cfg(), conta: b.conta });
  ESTADO_FERRAMENTAS = null;
  return { ok: true };
});
rota('GET', '/api/clientes', async () => fs.existsSync(P('clientes')) ? fs.readdirSync(P('clientes')).filter(s => fs.existsSync(P('clientes', s, 'marca.json'))).map(resumoCliente) : []);
rota('GET', '/api/clientes/:slug', async (req, b, { slug }) => { cliente(slug); return { ...resumoCliente(slug), chaves: preenchidas(P('clientes', slug, '.env'), CHAVES) }; });
rota('POST', '/api/clientes', async (req, b) => {
  const slug = slugify(b.slug || b.nome);
  if (fs.existsSync(P('clientes', slug, 'marca.json'))) throw Object.assign(new Error('Já existe um cliente com esse nome'), { status: 409 });
  const m = { nome: b.nome || slug, instagram: b.instagram || '', estilo: b.estilo || 'premium', tom: b.tom || 'próximo, direto, frases curtas', publico: b.publico || '', cores: { primaria: '#6C2BD9', secundaria: '#FF4F9A', fundo: '#F7F0FA', texto: '#1A1022', ...(b.cores || {}) }, fontes: { titulo: 'Playfair Display', corpo: 'Manrope', ...(b.fontes || {}) }, hashtags: b.hashtags || [], redes: ['instagram', 'facebook'], horarios: ['12:00', '19:30'], produtos: {} };
  salvarJson(P('clientes', slug, 'marca.json'), m);
  gravarEnv(P('clientes', slug, '.env'), {}, CHAVES);
  return { slug };
});
rota('PUT', '/api/clientes/:slug', async (req, b, { slug }) => {
  const d = cliente(slug);
  const m = lerJson(path.join(d, 'marca.json'));
  for (const k of ['nome', 'instagram', 'estilo', 'tom', 'publico', 'hashtags', 'horarios', 'redes', 'voz', 'logo']) if (b[k] !== undefined) m[k] = b[k];
  if (b.cores) m.cores = { ...m.cores, ...b.cores };
  if (b.fontes) m.fontes = { ...m.fontes, ...b.fontes };
  if (b.autor !== undefined) { if (b.autor && b.autor.nome) m.autor = b.autor; else delete m.autor; }
  salvarJson(path.join(d, 'marca.json'), m);
  return resumoCliente(slug);
});
rota('PUT', '/api/clientes/:slug/chaves', async (req, b, { slug }) => { const d = cliente(slug); gravarEnv(path.join(d, '.env'), b, CHAVES); return preenchidas(path.join(d, '.env'), CHAVES); });
rota('PUT', '/api/clientes/:slug/produtos/:chave', async (req, b, { slug, chave }) => {
  const d = cliente(slug); const k = slugify(chave);
  const m = lerJson(path.join(d, 'marca.json'));
  m.produtos ||= {};
  m.produtos[k] = { ...(m.produtos[k] || {}), ...Object.fromEntries(['nome', 'preco', 'precoDe', 'detalhe'].filter(x => b[x] !== undefined).map(x => [x, b[x]])) };
  if (b.foto) { seguro(path.join('clientes', slug, b.foto), 'clientes'); m.produtos[k].foto = b.foto; }
  salvarJson(path.join(d, 'marca.json'), m);
  return resumoCliente(slug);
});
rota('DELETE', '/api/clientes/:slug/produtos/:chave', async (req, b, { slug, chave }) => { const d = cliente(slug); const m = lerJson(path.join(d, 'marca.json')); delete m.produtos?.[chave]; salvarJson(path.join(d, 'marca.json'), m); return resumoCliente(slug); });
rota('POST', '/api/clientes/:slug/recortar', async (req, b, { slug }) => {
  const d = cliente(slug);
  const ent = seguro(b.arquivo, 'clientes', 'saida');
  const k = slugify(b.chave || path.parse(ent).name);
  const sai = path.join(d, 'produtos', `${k}.png`);
  fs.mkdirSync(path.dirname(sai), { recursive: true });
  const j = novoJob(`Recorte: ${k}`, slug);
  executar(j, async () => {
    await rodar(j, process.execPath, [P('motor', 'imagem.mjs'), 'recortar', ent, sai, '--escala', String(b.escala || 1), ...(b.modo === 'ia' ? ['--ia'] : ['--tol', String(b.tol || 30)])]);
    const m = lerJson(path.join(d, 'marca.json'));
    m.produtos ||= {}; m.produtos[k] = { ...(m.produtos[k] || {}), nome: m.produtos[k]?.nome || b.nome || k, foto: `produtos/${k}.png` };
    salvarJson(path.join(d, 'marca.json'), m);
    return { foto: url(sai) };
  });
  return { job: j.id };
});

// Upload: corpo bruto (sem multipart). ?cliente=&tipo=logo|produto|anexo|video|audio&nome=
rota('POST', '/api/upload', async req => {
  const q = new URL(req.url, 'http://x').searchParams;
  const slug = q.get('cliente'); const d = cliente(slug);
  const tipo = q.get('tipo');
  const nome = path.basename(q.get('nome') || 'arquivo').replace(/[^\w.\-]+/g, '_').slice(-80);
  const ext = path.extname(nome).toLowerCase();
  const permitidas = { logo: ['.png', '.jpg', '.jpeg', '.webp', '.svg'], produto: ['.png', '.jpg', '.jpeg', '.webp'], anexo: ['.png', '.jpg', '.jpeg', '.webp', '.svg', '.pdf', '.txt', '.mp4', '.mov', '.mp3', '.wav', '.m4a'], video: ['.mp4', '.mov', '.m4v', '.webm'], audio: ['.mp3', '.wav', '.m4a'] }[tipo];
  if (!permitidas?.includes(ext)) throw Object.assign(new Error(`Tipo de arquivo não aceito aqui: ${ext}`), { status: 400 });
  const destino = { logo: path.join(d, `logo${ext}`), produto: path.join(d, 'originais', `${Date.now()}-${nome}`), anexo: path.join(d, 'anexos', `${Date.now()}-${nome}`), video: P('saida', slug, 'videos', `${hoje()}-${slugify(path.parse(nome).name)}-${Date.now() % 100000}`, `original${ext}`), audio: P('saida', slug, 'audios', nome) }[tipo];
  fs.mkdirSync(path.dirname(destino), { recursive: true });
  await new Promise((ok, erro) => { const w = fs.createWriteStream(destino); req.pipe(w); w.on('finish', ok); w.on('error', erro); });
  if (tipo === 'logo') { const m = lerJson(path.join(d, 'marca.json')); m.logo = path.basename(destino); salvarJson(path.join(d, 'marca.json'), m); }
  return { caminho: rel(destino), url: url(destino) };
});

rota('GET', '/api/pecas', async req => {
  const s = new URL(req.url, 'http://x').searchParams.get('cliente');
  const slugs = s ? [s] : fs.existsSync(P('clientes')) ? fs.readdirSync(P('clientes')) : [];
  return slugs.filter(x => fs.existsSync(P('clientes', x, 'marca.json'))).flatMap(x => listarPecas(x).map(pc => ({ ...pc, cliente: x })));
});
rota('GET', '/api/peca', async req => {
  const pasta = seguro(new URL(req.url, 'http://x').searchParams.get('pasta'), 'saida');
  const pc = lerJson(path.join(pasta, 'peca.json'));
  const v = fs.existsSync(path.join(pasta, 'video.json')) ? lerJson(path.join(pasta, 'video.json')) : null;
  return { ...pc, pasta: rel(pasta), arquivosUrl: pc.arquivos.map(a => url(path.join(pasta, a))), srt: fs.existsSync(path.join(pasta, 'legenda.srt')) ? fs.readFileSync(path.join(pasta, 'legenda.srt'), 'utf8') : null, video: v };
});
rota('PUT', '/api/peca/legenda', async (req, b) => {
  const pasta = seguro(b.pasta, 'saida');
  const pc = lerJson(path.join(pasta, 'peca.json'));
  pc.legenda = String(b.legenda || '');
  salvarJson(path.join(pasta, 'peca.json'), pc);
  fs.writeFileSync(path.join(pasta, 'legenda.txt'), pc.legenda);
  return { ok: true };
});
rota('POST', '/api/peca/render', async (req, b) => {
  const pasta = seguro(b.pasta, 'saida');
  const pc = lerJson(path.join(pasta, 'peca.json'));
  const spec = { ...b.spec, cliente: pc.cliente, saida: rel(pasta) };
  const arq = P('saida', pc.cliente, 'specs', `${path.basename(pasta)}.json`);
  salvarJson(arq, spec);
  const j = novoJob(`Renderizar: ${path.basename(pasta)}`, pc.cliente);
  executar(j, async () => {
    // Old frames would linger if the new spec has fewer slides.
    for (const f of fs.readdirSync(pasta)) if (/^\d+\.png$/.test(f)) fs.rmSync(path.join(pasta, f));
    await rodar(j, process.execPath, [P('motor', 'render.mjs'), arq]);
    spawnSync(process.execPath, [P('motor', 'revisao.mjs'), pc.cliente], { cwd: ROOT });
    return { pecas: [rel(pasta)], resumo: 'Peça atualizada' };
  });
  return { job: j.id };
});
rota('DELETE', '/api/peca', async req => {
  const pasta = seguro(new URL(req.url, 'http://x').searchParams.get('pasta'), 'saida');
  if (!fs.existsSync(path.join(pasta, 'peca.json'))) throw Object.assign(new Error('não é uma peça'), { status: 400 });
  // Move to a trash folder instead of deleting, so nothing is lost by a misclick.
  const lixo = P('saida', '.lixeira', `${Date.now()}-${path.basename(pasta)}`);
  fs.mkdirSync(path.dirname(lixo), { recursive: true });
  fs.renameSync(pasta, lixo);
  return { ok: true };
});

rota('POST', '/api/ia', async (req, b) => {
  if (b.slug) cliente(b.slug);
  if (b.tipo === 'editor') throw Object.assign(new Error('use /api/editor/pedido'), { status: 400 });
  if (b.tipo === 'ajuste') seguro(b.pasta, 'saida');
  for (const a of b.anexos || []) seguro(a, 'clientes', 'saida');
  if (!String(b.pedido || '').trim()) throw Object.assign(new Error('Escreva o pedido'), { status: 400 });
  return { job: jobClaude(b).id };
});
// Retry the same request, or resume the stopped Claude session where it left off.
rota('POST', '/api/ia/repetir', async (req, b) => {
  const antigo = jobs.get(b.job);
  if (!antigo?.dados) throw Object.assign(new Error('Tarefa não encontrada (o Estúdio foi reiniciado?)'), { status: 404 });
  const dados = { ...antigo.dados, retomar: undefined };
  if (b.continuar) { if (!antigo.sessao) throw Object.assign(new Error('Esta tarefa não chegou a começar; use Tentar de novo'), { status: 400 }); dados.retomar = antigo.sessao; dados.titulo = `${antigo.titulo} (continuação)`; }
  return { job: jobClaude(dados).id };
});
rota('POST', '/api/video', async (req, b) => {
  cliente(b.cliente);
  const origem = seguro(b.arquivo, 'saida');
  const op = { silencio: !!b.silencio, volume: !!b.volume, legenda: !!b.legenda, formatos: (b.formatos || []).filter(x => /^\d+:\d+$/.test(x)) };
  if (b.srt) { // regravar a legenda a partir do texto corrigido
    const dir = path.dirname(origem);
    const v = lerJson(path.join(dir, 'video.json'));
    fs.writeFileSync(path.join(dir, 'legenda.srt'), String(b.srt));
    return { job: jobVideo(b.cliente, path.join(dir, v.baseLegenda), { legenda: true, srt: 'legenda.srt', formatos: v.op?.formatos || [] }).id };
  }
  return { job: jobVideo(b.cliente, origem, op).id };
});
rota('GET', '/api/videoia', async () => {
  const { PROVEDORES } = await import(pathToFileURL(P('motor', 'videoia.mjs')).href);
  const env = lerEnv(P('.env'));
  return Object.entries(PROVEDORES).map(([id, p]) => ({ id, nome: p.nome, chave: p.chave, pronta: !!env[p.chave], imagem: p.imagem, modelos: p.modelos }));
});
rota('POST', '/api/videoia', async (req, b) => {
  cliente(b.cliente);
  const { PROVEDORES } = await import(pathToFileURL(P('motor', 'videoia.mjs')).href);
  if (!PROVEDORES[b.provedor]) throw Object.assign(new Error('Escolha o serviço de vídeo'), { status: 400 });
  const prompt = String(b.prompt || '').trim();
  if (!prompt) throw Object.assign(new Error('Descreva a cena do vídeo'), { status: 400 });
  if (b.modelo && !/^[\w.:\/-]{1,120}$/.test(b.modelo)) throw Object.assign(new Error('Modelo inválido'), { status: 400 });
  const formato = ['9:16', '16:9', '1:1'].includes(b.formato) ? b.formato : '9:16';
  let foto = null;
  if (b.produto) {
    const pr = lerJson(P('clientes', b.cliente, 'marca.json')).produtos?.[b.produto];
    if (!pr?.foto) throw Object.assign(new Error('Produto sem foto'), { status: 400 });
    foto = seguro(`clientes/${b.cliente}/${pr.foto}`, 'clientes');
  }
  const dir = P('saida', b.cliente, 'videos-ia', `${hoje()}-${slugify(prompt.slice(0, 30))}-${Date.now() % 100000}`);
  fs.mkdirSync(dir, { recursive: true });
  const j = novoJob(`Vídeo IA (${PROVEDORES[b.provedor].nome})`, b.cliente);
  executar(j, async () => {
    const args = [P('motor', 'videoia.mjs'), b.provedor, prompt, path.join(dir, 'video.mp4'), '--formato', formato, '--cliente', b.cliente];
    if (b.modelo) args.push('--modelo', b.modelo);
    if (foto) args.push('--imagem', foto);
    if (+b.duracao > 0) args.push('--duracao', String(Math.min(30, Math.round(+b.duracao))));
    await rodar(j, process.execPath, args).catch(e => { fs.rmSync(dir, { recursive: true, force: true }); throw e; });
    salvarJson(path.join(dir, 'peca.json'), { cliente: b.cliente, tipo: 'video-ia', formato, arquivos: ['video.mp4'], legenda: '', provedor: b.provedor, modelo: b.modelo || '', prompt, produto: b.produto || '', avisos: foto ? ['Vídeo gerado por IA a partir da foto: confira rótulo, logo e formato do produto quadro a quadro antes de usar.'] : [], criado: new Date().toISOString() });
    return { pecas: [rel(dir)], resumo: 'Vídeo gerado' };
  });
  return { job: j.id };
});
// ---------- editor de vídeo (projeto.json + motor/editor.mjs) ----------
const projetoDe = pasta => { const d = seguro(pasta, 'saida'); if (!fs.existsSync(path.join(d, 'projeto.json'))) throw Object.assign(new Error('projeto não encontrado'), { status: 404 }); return d; };
rota('GET', '/api/editor/projetos', async req => {
  const slug = new URL(req.url, 'http://x').searchParams.get('cliente'); cliente(slug);
  const base = P('saida', slug, 'edicoes');
  if (!fs.existsSync(base)) return [];
  return fs.readdirSync(base).filter(n => fs.existsSync(path.join(base, n, 'projeto.json'))).map(n => {
    const d = path.join(base, n), pj = lerJson(path.join(d, 'projeto.json'));
    return { pasta: rel(d), nome: n, duracao: pj.duracao, edicoes: (pj.edicoes || []).length, capa: fs.existsSync(path.join(d, 'capa.jpg')) ? url(path.join(d, 'capa.jpg')) : null, video: url(path.join(d, pj.origem)), alterado: fs.statSync(path.join(d, 'projeto.json')).mtime.toISOString() };
  }).sort((a, b) => b.alterado.localeCompare(a.alterado));
});
rota('POST', '/api/editor', async (req, b) => {
  cliente(b.cliente);
  const origem = seguro(b.arquivo, 'saida');
  const dir = P('saida', b.cliente, 'edicoes', `${hoje()}-${slugify(b.nome || path.basename(path.dirname(origem)).replace(/^\d{4}-\d{2}-\d{2}-/, ''))}`);
  if (fs.existsSync(path.join(dir, 'projeto.json'))) throw Object.assign(new Error('Já existe um projeto com esse nome hoje'), { status: 409 });
  const j = novoJob(`Editor: ${path.basename(dir)}`, b.cliente);
  executar(j, async () => {
    await rodar(j, process.execPath, [P('motor', 'editor.mjs'), 'novo', b.cliente, origem, dir]);
    // The upload folder only held the original, which now lives in the project.
    if (path.basename(origem).startsWith('original.') && !fs.existsSync(path.join(path.dirname(origem), 'peca.json'))) fs.rmSync(path.dirname(origem), { recursive: true, force: true });
    return { pasta: rel(dir), resumo: 'Projeto pronto' };
  });
  return { job: j.id };
});
rota('GET', '/api/editor', async req => {
  const d = projetoDe(new URL(req.url, 'http://x').searchParams.get('pasta'));
  const pj = lerJson(path.join(d, 'projeto.json'));
  const sfx = Object.fromEntries(fs.readdirSync(path.join(d, 'sfx')).map(f => [path.parse(f).name, url(path.join(d, 'sfx', f))]));
  return { ...pj, pasta: rel(d), videoUrl: url(path.join(d, pj.origem)), sfx, exportadoUrl: pj.exportado && fs.existsSync(path.join(d, pj.exportado)) ? url(path.join(d, pj.exportado)) : null, musicaUrl: pj.musica?.arquivo ? url(path.join(d, pj.musica.arquivo)) : null };
});
const EFEITOS_ED = ['whoosh', 'pop', 'ding', 'click'];
function validarEdicoes(lista, dur) {
  if (!Array.isArray(lista) || lista.length > 500) throw Object.assign(new Error('edições inválidas'), { status: 400 });
  const t = x => Math.min(dur, Math.max(0, +(+x).toFixed(3)));
  return lista.map((e, i) => {
    const base = { id: String(e.id || `e${Date.now()}${i}`).slice(0, 40), tipo: e.tipo, nota: String(e.nota || '').slice(0, 120), ativo: e.ativo !== false };
    if (e.tipo === 'som') { if (!EFEITOS_ED.includes(e.efeito) || !Number.isFinite(+e.em)) throw Object.assign(new Error('som inválido'), { status: 400 }); return { ...base, em: t(e.em), efeito: e.efeito }; }
    if (!['corte', 'zoom', 'texto'].includes(e.tipo) || !Number.isFinite(+e.ini) || !Number.isFinite(+e.fim)) throw Object.assign(new Error(`edição inválida: ${e.tipo}`), { status: 400 });
    const r = { ...base, ini: t(Math.min(e.ini, e.fim)), fim: t(Math.max(e.ini, e.fim)) };
    if (e.tipo === 'zoom') r.escala = Math.min(2.5, Math.max(1.05, +e.escala || 1.25));
    if (e.tipo === 'texto') { r.texto = String(e.texto || '').slice(0, 200); r.posicao = ['topo', 'centro', 'baixo'].includes(e.posicao) ? e.posicao : 'topo'; }
    return r;
  });
}
rota('PUT', '/api/editor', async (req, b) => {
  const d = projetoDe(b.pasta);
  const pj = lerJson(path.join(d, 'projeto.json'));
  if (b.edicoes) pj.edicoes = validarEdicoes(b.edicoes, pj.duracao);
  if (typeof b.legenda === 'boolean') pj.legenda = b.legenda;
  if (Array.isArray(b.formatos)) pj.formatos = b.formatos.filter(x => ['1:1', '4:5', '16:9', '9:16'].includes(x));
  if (b.musica === null) pj.musica = null;
  else if (b.musica) {
    let arquivo = pj.musica?.arquivo;
    if (b.musica.caminho) { // new upload: copy it into the project
      const src = seguro(b.musica.caminho, 'clientes', 'saida');
      if (!/\.(mp3|wav|m4a)$/i.test(src)) throw Object.assign(new Error('Música deve ser MP3, WAV ou M4A'), { status: 400 });
      arquivo = `musica${path.extname(src).toLowerCase()}`;
      fs.copyFileSync(src, path.join(d, arquivo));
    }
    if (arquivo) pj.musica = { arquivo, volume: Math.min(-6, Math.max(-30, +b.musica.volume || -18)) };
  }
  salvarJson(path.join(d, 'projeto.json'), pj);
  return { ok: true, musicaUrl: pj.musica ? url(path.join(d, pj.musica.arquivo)) : null };
});
rota('POST', '/api/editor/exportar', async (req, b) => {
  const d = projetoDe(b.pasta);
  const pj = lerJson(path.join(d, 'projeto.json'));
  const j = novoJob(`Exportando ${path.basename(d)}`, pj.cliente);
  executar(j, async () => { await rodar(j, process.execPath, [P('motor', 'editor.mjs'), 'exportar', d]); return { pecas: [rel(d)], resumo: 'Vídeo exportado' }; });
  return { job: j.id };
});
rota('POST', '/api/editor/pedido', async (req, b) => {
  const d = projetoDe(b.pasta);
  const pj = lerJson(path.join(d, 'projeto.json'));
  if (!String(b.pedido || '').trim()) throw Object.assign(new Error('Diga o que fazer'), { status: 400 });
  const sel = Array.isArray(b.sel) && b.sel.length === 2 && b.sel.every(Number.isFinite) ? b.sel : null;
  return { job: jobClaude({ tipo: 'editor', slug: pj.cliente, pasta: rel(d), pedido: String(b.pedido).slice(0, 2000), formato: { tempo: +b.tempo || 0, sel }, titulo: 'Editando com IA' }).id };
});
rota('GET', '/api/vozes', async () => {
  const r = spawnSync(process.execPath, [P('motor', 'voz.mjs'), 'vozes'], { cwd: ROOT, encoding: 'utf8' });
  if (r.status !== 0) return { erro: (r.stderr || '').replace(/^ERRO:\s*/, '').trim(), vozes: [] };
  return { vozes: r.stdout.trim().split(/\r?\n/).map(l => { const [id, ...resto] = l.split(/\s{2,}/); return { id, nome: resto[0] || id, info: resto.slice(1).join(' ') }; }).filter(v => v.id) };
});
rota('POST', '/api/audio', async (req, b) => {
  cliente(b.cliente);
  const texto = String(b.texto || '').trim();
  if (!texto) throw Object.assign(new Error('Escreva o texto da narração'), { status: 400 });
  const arq = P('saida', b.cliente, 'audios', `${hoje()}-${slugify(b.nome || texto.slice(0, 30))}.mp3`);
  fs.mkdirSync(path.dirname(arq), { recursive: true });
  const j = novoJob(`Narração: ${path.basename(arq)}`, b.cliente);
  executar(j, async () => {
    await rodar(j, process.execPath, [P('motor', 'voz.mjs'), 'falar', b.cliente, texto, arq, ...(b.voz && /^\w+$/.test(b.voz) ? [b.voz] : [])]);
    fs.writeFileSync(arq.replace(/\.mp3$/, '.txt'), texto);
    return { arquivos: [rel(arq)], resumo: 'Narração pronta' };
  });
  return { job: j.id };
});
rota('GET', '/api/biblioteca', async req => {
  const q = new URL(req.url, 'http://x').searchParams;
  const slug = q.get('cliente'); cliente(slug);
  const tipo = q.get('tipo'); // audios | roteiros | pautas | videos
  if (!['audios', 'roteiros', 'pautas', 'videos'].includes(tipo)) throw Object.assign(new Error('tipo inválido'), { status: 400 });
  const d = P('saida', slug, tipo);
  if (!fs.existsSync(d)) return [];
  const ext = { audios: /\.(mp3|wav|m4a)$/, roteiros: /\.md$/, pautas: /\.md$/, videos: /^original\./ }[tipo];
  const out = [];
  (function andar(x) { for (const e of fs.readdirSync(x, { withFileTypes: true })) { const f = path.join(x, e.name); if (e.isDirectory()) andar(f); else if (ext.test(e.name)) out.push({ caminho: rel(f), nome: tipo === 'videos' ? path.basename(x) : e.name, url: url(f), alterado: fs.statSync(f).mtime.toISOString(), texto: /\.md$/.test(e.name) ? fs.readFileSync(f, 'utf8') : fs.existsSync(f.replace(/\.\w+$/, '.txt')) ? fs.readFileSync(f.replace(/\.\w+$/, '.txt'), 'utf8') : '' }); } })(d);
  return out.sort((a, b) => b.alterado.localeCompare(a.alterado));
});
rota('PUT', '/api/texto', async (req, b) => {
  const f = seguro(b.caminho, 'saida');
  if (!/\.(md|txt|srt)$/.test(f)) throw Object.assign(new Error('Só arquivos de texto'), { status: 400 });
  fs.writeFileSync(f, String(b.texto ?? ''));
  return { ok: true };
});
rota('GET', '/api/jobs', async () => [...jobs.values()].sort((a, b) => b.inicio - a.inicio).slice(0, 30).map(({ log, ...j }) => ({ ...j, ultima: log.at(-1) || '' })));
rota('GET', '/api/jobs/:id', async (req, b, { id }) => { const j = jobs.get(id); if (!j) throw Object.assign(new Error('job não encontrado'), { status: 404 }); return j; });
rota('GET', '/api/atalhos', async () => (await import('./atalhos.mjs')).status());
rota('PUT', '/api/atalhos', async (req, b) => {
  const a = await import('./atalhos.mjs');
  if (b.desktop) a.criarDesktop();
  if (typeof b.startup === 'boolean') a.iniciarComWindows(b.startup);
  return a.status();
});
rota('POST', '/api/desligar', async () => {
  if ([...jobs.values()].some(j => j.status === 'rodando')) throw Object.assign(new Error('Há tarefas em andamento. Espere terminar antes de desligar.'), { status: 409 });
  setTimeout(() => process.exit(0), 300);
  return { ok: true };
});

const porta = +(process.env.PORT || process.env.PORTA || cfg().porta);
const HOSTS = new Set([`localhost:${porta}`, `127.0.0.1:${porta}`]);
const srv = http.createServer(async (req, res) => {
  try {
    const u = new URL(req.url, 'http://x');
    // Other websites open in the browser can reach localhost: reject foreign Host (DNS rebinding) and Origin,
    // and require a custom header on every action, which cross-site pages cannot send without CORS.
    if (!HOSTS.has(req.headers.host)) { res.writeHead(403); return res.end('host não permitido'); }
    if (req.headers.origin && !HOSTS.has(req.headers.origin.replace(/^https?:\/\//, ''))) { res.writeHead(403); return res.end('origem não permitida'); }
    if (req.method !== 'GET' && req.headers['x-estudio'] !== '1') { res.writeHead(403); return res.end('pedido sem cabeçalho do Estúdio'); }
    if (u.pathname.startsWith('/arquivos/')) return servirArquivo(req, res, seguro(decodeURIComponent(u.pathname.slice(10)), 'saida', 'clientes'));
    if (u.pathname.startsWith('/api/')) {
      for (const r of rotas) {
        const m = r.metodo === req.method && u.pathname.match(r.re);
        if (m) {
          const params = Object.fromEntries(Object.entries(m.groups || {}).map(([k, v]) => [k, decodeURIComponent(v)]));
          const b = r.metodo === 'GET' || u.pathname === '/api/upload' ? {} : await corpo(req);
          return resJson(res, 200, await r.fn(req, b, params));
        }
      }
      return resJson(res, 404, { erro: 'rota não encontrada' });
    }
    const f = path.resolve(PUB, '.' + (u.pathname === '/' ? '/index.html' : u.pathname));
    if (!f.startsWith(PUB)) { res.writeHead(403); return res.end(); }
    return servirArquivo(req, res, fs.existsSync(f) ? f : path.join(PUB, 'index.html'));
  } catch (e) {
    resJson(res, e.status || 500, { erro: e.message });
  }
});

const end = `http://localhost:${porta}`;
const abrirNavegador = () => spawn(process.platform === 'win32' ? 'explorer' : process.platform === 'darwin' ? 'open' : 'xdg-open', [end], { detached: true, stdio: 'ignore' }).unref();
// Already running (shortcut clicked twice)? Just bring the browser back instead of failing.
srv.on('error', async e => {
  if (e.code !== 'EADDRINUSE') throw e;
  const ehEstudio = await fetch(`${end}/api/estado`).then(r => r.ok).catch(() => false);
  if (ehEstudio) { if (!process.argv.includes('--sem-navegador')) abrirNavegador(); console.log(`O Estúdio já está aberto em ${end}`); process.exit(0); }
  console.error(`A porta ${porta} está ocupada por outro programa. Troque "porta" em estudio/config.json.`); process.exit(1);
});
// 127.0.0.1 only: the Estúdio has no login, so it must not be reachable from the network.
srv.listen(porta, '127.0.0.1', () => {
  console.log(`Estúdio da Fábrica aberto em ${end}  (feche esta janela para desligar)`);
  if (!process.argv.includes('--sem-navegador')) abrirNavegador();
});
