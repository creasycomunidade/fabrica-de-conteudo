// Análise de requisitos da Fábrica de Conteúdo. Node puro, sem dependências.
//   node requisitos.mjs           tabela para ler
//   node requisitos.mjs --json    para o Claude Code decidir o que instalar
// Sai com código 1 se faltar algo obrigatório.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import net from 'node:net';
import { spawnSync } from 'node:child_process';

const WIN = process.platform === 'win32', MAC = process.platform === 'darwin';
const PY = WIN ? 'python' : 'python3';
// On Windows, npm-installed CLIs (claude) are .cmd files and need the shell; nothing else does.
const roda = (cmd, args) => { const r = WIN && cmd === 'claude' ? spawnSync(`claude ${args.join(' ')}`, { encoding: 'utf8', shell: true, timeout: 20000 }) : spawnSync(cmd, args, { encoding: 'utf8', timeout: 20000 }); return r.status === 0 ? (r.stdout || r.stderr).trim() : null; };
const versao = s => (s?.match(/(\d+)\.(\d+)/) || []).slice(1).map(Number);
const home = os.homedir();
const plugins = (() => { try { return JSON.parse(fs.readFileSync(path.join(home, '.claude', 'plugins', 'installed_plugins.json'), 'utf8')).plugins || {}; } catch { return {}; } })();
const py = mod => roda(PY, ['-c', `import ${mod}`]) !== null;

const itens = [
  { id: 'node', nome: 'Node.js 20 ou mais', nivel: 'obrigatório', para: 'Motor de artes e vídeos, e o Estúdio',
    teste: () => { const [m] = versao(process.version); return { ok: m >= 20, info: process.version }; },
    win: 'winget install -e --id OpenJS.NodeJS.LTS', mac: 'brew install node' },
  { id: 'navegador', nome: 'Google Chrome ou Microsoft Edge', nivel: 'obrigatório', para: 'Desenhar as artes e gravar os vídeos',
    teste: () => { const c = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Microsoft/Edge/Application/msedge.exe', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge', '/usr/bin/google-chrome', '/usr/bin/chromium'].find(f => fs.existsSync(f)); return { ok: !!c, info: c ? path.basename(c) : '' }; },
    win: 'winget install -e --id Google.Chrome', mac: 'brew install --cask google-chrome' },
  { id: 'git', nome: 'Git', nivel: 'obrigatório', para: 'Instalar e atualizar o plugin a partir do GitHub',
    teste: () => { const v = roda('git', ['--version']); return { ok: !!v, info: v || '' }; },
    win: 'winget install -e --id Git.Git', mac: 'xcode-select --install' },
  { id: 'claude', nome: 'Claude Code (com login)', nivel: 'obrigatório', para: 'Botões "Criar com IA" do Estúdio e os comandos /fabrica-conteudo',
    teste: () => { const v = roda('claude', ['--version']); return { ok: !!v, info: v ? `${v.split('\n')[0]} (confira o login rodando "claude" uma vez)` : '' }; },
    win: 'npm install -g @anthropic-ai/claude-code', mac: 'npm install -g @anthropic-ai/claude-code' },
  { id: 'python', nome: 'Python 3.10 ou mais', nivel: 'recomendado', para: 'Edição de vídeo gravado, legenda automática e recorte com IA',
    teste: () => { const v = roda(PY, ['--version']); const [a, b] = versao(v); return { ok: !!v && (a > 3 || (a === 3 && b >= 10)), info: v || '' }; },
    win: 'winget install -e --id Python.Python.3.12', mac: 'brew install python' },
  { id: 'ffmpeg', nome: 'FFmpeg no sistema', nivel: 'recomendado', para: 'Edição de vídeo gravado (ffmpeg-skill). As artes usam um FFmpeg embutido',
    teste: () => { const v = roda('ffmpeg', ['-version']); return { ok: !!v, info: v ? v.split('\n')[0].slice(0, 40) : '' }; },
    win: 'winget install -e --id Gyan.FFmpeg', mac: 'brew install ffmpeg' },
  { id: 'ffmpegSkill', nome: 'ffmpeg-skill', nivel: 'recomendado', para: 'Cortar pausas, legendar, ajustar volume e gerar formatos de vídeo',
    teste: () => ({ ok: fs.existsSync(path.join(home, '.claude', 'skills', 'ffmpeg-skill', 'scripts', 'caption.py')), info: '' }),
    win: 'npx -y ffmpeg-skill setup', mac: 'npx -y ffmpeg-skill setup' },
  { id: 'fasterWhisper', nome: 'faster-whisper (transcrição local)', nivel: 'recomendado', para: 'Legenda automática em português, grátis',
    teste: () => {
      if (!py('faster_whisper')) return { ok: false, info: '' };
      const av = roda(PY, ['-c', 'import av; print(av.__version__)']);
      return { ok: (versao(av)[0] || 0) < 16, info: av ? `av ${av}${versao(av)[0] >= 16 ? ' (precisa ser menor que 16)' : ''}` : '' };
    },
    win: 'pip install faster-whisper "av<16"', mac: 'pip3 install faster-whisper "av<16"' },
  { id: 'bgremover', nome: 'rembg + BiRefNet (recorte com IA)', nivel: 'recomendado', para: 'Tirar o fundo da foto do produto com borda limpa',
    teste: () => ({ ok: py('rembg'), info: '' }), win: 'pip install rembg', mac: 'pip3 install rembg' },
  { id: 'youtube', nome: 'Skills de YouTube (yt-*)', nivel: 'opcional', para: 'Ganchos com nota, roteiro, título e thumbnail',
    teste: () => ({ ok: !!plugins['youtube-agent@youtube-agent-skill'], info: '' }),
    win: 'claude plugin marketplace add Jakeschincariol/youtube-agent-skill && claude plugin install youtube-agent@youtube-agent-skill', mac: 'claude plugin marketplace add Jakeschincariol/youtube-agent-skill && claude plugin install youtube-agent@youtube-agent-skill' },
  { id: 'animacao', nome: 'Skills de animação (Emil Kowalski)', nivel: 'opcional', para: 'Bom gosto em movimento ao ajustar as animações',
    teste: () => ({ ok: fs.existsSync(path.join(home, '.claude', 'skills', 'animate')), info: '' }),
    win: 'npx -y skills@latest add emilkowalski/skills -g -a claude-code -y --copy -s animate -s choreograph -s animation-vocabulary -s review-animations -s improve-animations -s emil-design-eng', mac: 'npx -y skills@latest add emilkowalski/skills -g -a claude-code -y --copy -s animate -s choreograph -s animation-vocabulary -s review-animations -s improve-animations -s emil-design-eng' },
  { id: 'disco', nome: 'Espaço livre em disco (5 GB)', nivel: 'recomendado', para: 'Modelos de transcrição e recorte, vídeos gerados',
    teste: () => { try { const s = fs.statfsSync(process.cwd()); const gb = (s.bavail * s.bsize) / 1e9; return { ok: gb >= 5, info: `${gb.toFixed(0)} GB livres` }; } catch { return { ok: true, info: 'não verificado' }; } },
    win: 'Libere espaço no disco', mac: 'Libere espaço no disco' },
];

async function internet() {
  try { const r = await fetch('https://fonts.googleapis.com/css2?family=Inter', { signal: AbortSignal.timeout(8000) }); return { ok: r.ok, info: '' }; } catch { return { ok: false, info: 'sem acesso' }; }
}
function porta(n) {
  return new Promise(ok => { const s = net.createServer().once('error', () => ok({ ok: true, info: 'em uso (o Estúdio pode já estar aberto)' })).once('listening', () => s.close(() => ok({ ok: true, info: 'livre' }))).listen(n, '127.0.0.1'); });
}

const res = [];
for (const it of itens) { let r; try { r = it.teste(); } catch (e) { r = { ok: false, info: e.message }; } res.push({ ...it, ...r, instalar: WIN ? it.win : it.mac }); }
res.push({ id: 'internet', nome: 'Internet', nivel: 'recomendado', para: 'Fontes do Google, downloads e IA', ...(await internet()), instalar: 'Conecte à internet' });
res.push({ id: 'porta', nome: 'Porta 3838 (Estúdio)', nivel: 'opcional', para: 'Endereço do Estúdio no navegador', ...(await porta(3838)), instalar: '' });

const faltaObrig = res.filter(r => !r.ok && r.nivel === 'obrigatório');
if (process.argv.includes('--json')) {
  console.log(JSON.stringify({ sistema: `${os.type()} ${os.release()}`, pronto: !faltaObrig.length, itens: res.map(({ teste, win, mac, ...r }) => r) }, null, 2));
} else {
  console.log(`\nRequisitos da Fábrica de Conteúdo · ${os.type()} ${os.release()}\n`);
  for (const r of res) console.log(`${r.ok ? '✔' : r.nivel === 'opcional' ? '–' : '✖'} ${r.nome.padEnd(38)} ${r.nivel.padEnd(12)} ${r.ok ? r.info : `FALTA → ${r.instalar}`}`);
  console.log(faltaObrig.length ? `\nFaltam ${faltaObrig.length} item(ns) obrigatório(s).` : '\nTudo o que é obrigatório está pronto.');
}
process.exitCode = faltaObrig.length ? 1 : 0;
