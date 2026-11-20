// Fila de publicação.
//   node motor/publicar.mjs add <pasta-da-peca> <quando ISO, ex 2026-11-20T11:30> <redes: instagram,facebook,webhook>
//   node motor/publicar.mjs list
//   node motor/publicar.mjs run            publica tudo que já venceu (é o que a tarefa agendada roda)
//   node motor/publicar.mjs agora <id>     publica já (reenvia só as redes que falharam)
//   node motor/publicar.mjs cancelar <id>
//   node motor/publicar.mjs instalar       cria a tarefa do sistema (a cada 15 min)
//   node motor/publicar.mjs testar <cliente>  confere tokens sem publicar nada
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { p, lerJson, salvarJson, envCliente, mime } from './lib.mjs';
import { VIDEO } from './render.mjs';

const FILA = p('fila');
const log = m => { const l = `[${new Date().toISOString()}] ${m}`; console.log(l); fs.mkdirSync(FILA, { recursive: true }); fs.appendFileSync(path.join(FILA, 'log.txt'), l + '\n'); };
const esperar = ms => new Promise(r => setTimeout(r, ms));
const arquivo = f => new File([fs.readFileSync(f)], path.basename(f), { type: mime(f) });

// ---------- Graph API ----------
function graph(env) {
  const V = env.GRAPH_VERSION || 'v23.0';
  const token = env.META_PAGE_TOKEN;
  if (!token) throw new Error('META_PAGE_TOKEN ausente no .env do cliente');
  async function call(url, fields = {}, method = 'POST') {
    let res;
    if (method === 'GET') {
      const u = new URL(url);
      for (const [k, v] of Object.entries({ ...fields, access_token: token })) u.searchParams.set(k, v);
      res = await fetch(u);
    } else {
      const fd = new FormData();
      for (const [k, v] of Object.entries({ ...fields, access_token: token })) v instanceof Blob ? fd.append(k, v, v.name) : fd.append(k, String(v));
      res = await fetch(url, { method, body: fd });
    }
    const j = await res.json().catch(() => ({}));
    if (!res.ok || j.error) throw new Error(`Graph ${res.status}: ${j.error?.message || JSON.stringify(j)}`);
    return j;
  }
  const G = `https://graph.facebook.com/${V}`;
  const GV = `https://graph-video.facebook.com/${V}`;
  return { call, G, GV, V, token };
}

function facebook(env) {
  const { call, G, GV } = graph(env);
  const page = env.META_PAGE_ID || (() => { throw new Error('META_PAGE_ID ausente'); })();
  return {
    foto: (f, legenda) => call(`${G}/${page}/photos`, { source: arquivo(f), message: legenda, published: true }),
    async album(fs_, legenda) {
      const ids = [];
      for (const f of fs_) ids.push((await call(`${G}/${page}/photos`, { source: arquivo(f), published: false })).id);
      const campos = { message: legenda };
      ids.forEach((id, i) => { campos[`attached_media[${i}]`] = JSON.stringify({ media_fbid: id }); });
      return call(`${G}/${page}/feed`, campos);
    },
    video: (f, legenda) => call(`${GV}/${page}/videos`, { source: arquivo(f), description: legenda }),
    // Instagram only accepts images by public URL: upload as an unpublished page photo and use its CDN URL.
    async urlPublica(f) {
      const { id } = await call(`${G}/${page}/photos`, { source: arquivo(f), published: false, temporary: true });
      const j = await call(`${G}/${id}`, { fields: 'images' }, 'GET');
      return j.images[0].source;
    },
  };
}

function instagram(env) {
  const { call, G, token } = graph(env);
  const ig = env.IG_USER_ID || (() => { throw new Error('IG_USER_ID ausente'); })();
  const fb = facebook(env);
  async function pronto(id) {
    for (let i = 0; i < 60; i++) {
      const { status_code } = await call(`${G}/${id}`, { fields: 'status_code' }, 'GET');
      if (status_code === 'FINISHED') return;
      if (status_code === 'ERROR' || status_code === 'EXPIRED') throw new Error(`Instagram recusou a mídia (${status_code})`);
      await esperar(5000);
    }
    throw new Error('Instagram demorou demais para processar a mídia');
  }
  const publicar = async id => { await pronto(id); return call(`${G}/${ig}/media_publish`, { creation_id: id }); };
  async function videoResumable(f, campos) {
    const c = await call(`${G}/${ig}/media`, { ...campos, upload_type: 'resumable' });
    const buf = fs.readFileSync(f);
    const r = await fetch(c.uri, { method: 'POST', headers: { Authorization: `OAuth ${token}`, offset: '0', file_size: String(buf.length) }, body: buf });
    if (!r.ok) throw new Error(`Upload do vídeo falhou: ${r.status} ${await r.text()}`);
    return publicar(c.id);
  }
  return {
    imagem: async (f, legenda) => publicar((await call(`${G}/${ig}/media`, { image_url: await fb.urlPublica(f), caption: legenda })).id),
    story: async f => publicar((await call(`${G}/${ig}/media`, { media_type: 'STORIES', image_url: await fb.urlPublica(f) })).id),
    async carrossel(fs_, legenda) {
      const filhos = [];
      for (const f of fs_) filhos.push((await call(`${G}/${ig}/media`, { image_url: await fb.urlPublica(f), is_carousel_item: true })).id);
      for (const id of filhos) await pronto(id);
      return publicar((await call(`${G}/${ig}/media`, { media_type: 'CAROUSEL', children: filhos.join(','), caption: legenda })).id);
    },
    reel: (f, legenda) => videoResumable(f, { media_type: 'REELS', caption: legenda, share_to_feed: true }),
    storyVideo: f => videoResumable(f, { media_type: 'STORIES' }),
  };
}

async function webhook(env, peca, arquivos) {
  if (!env.WEBHOOK_URL) throw new Error('WEBHOOK_URL ausente no .env do cliente');
  const fd = new FormData();
  fd.append('peca', JSON.stringify({ cliente: peca.cliente, tipo: peca.tipo, legenda: peca.legenda }));
  for (const f of arquivos) fd.append('arquivos', arquivo(f), path.basename(f));
  const r = await fetch(env.WEBHOOK_URL, { method: 'POST', body: fd });
  if (!r.ok) throw new Error(`Webhook ${r.status}`);
  return { status: r.status };
}

async function publicarEm(rede, peca, dir) {
  const env = envCliente(peca.cliente);
  const arqs = peca.arquivos.map(a => path.join(dir, a));
  const { tipo, legenda } = peca;
  if (rede === 'webhook') return webhook(env, peca, arqs);
  if (rede === 'instagram') {
    const ig = instagram(env);
    if (tipo === 'reel') return ig.reel(arqs[0], legenda);
    if (tipo === 'story-video') return ig.storyVideo(arqs[0]);
    if (tipo === 'story') return ig.story(arqs[0]);
    if (tipo === 'carrossel' && arqs.length > 1) return ig.carrossel(arqs.slice(0, 10), legenda);
    return ig.imagem(arqs[0], legenda);
  }
  if (rede === 'facebook') {
    const fb = facebook(env);
    if (tipo.startsWith('story')) return { pulado: 'stories do Facebook não são publicados por este motor' };
    if (VIDEO.has(tipo)) return fb.video(arqs[0], legenda);
    if (arqs.length > 1) return fb.album(arqs, legenda);
    return fb.foto(arqs[0], legenda);
  }
  throw new Error(`Rede desconhecida: ${rede}`);
}

// ---------- Fila ----------
const itens = () => fs.existsSync(FILA) ? fs.readdirSync(FILA).filter(f => f.endsWith('.json')).map(f => lerJson(path.join(FILA, f))) : [];
const salvar = it => salvarJson(path.join(FILA, `${it.id}.json`), it);

async function executar(it) {
  it.status = 'publicando'; salvar(it);
  const dir = p(it.pasta);
  const peca = lerJson(path.join(dir, 'peca.json'));
  if (it.legenda) peca.legenda = it.legenda;
  it.resultado ||= {};
  for (const rede of it.redes) {
    if (it.resultado[rede]?.ok) continue;
    try {
      const r = await publicarEm(rede, peca, dir);
      it.resultado[rede] = { ok: true, resposta: r, em: new Date().toISOString() };
      log(`OK ${it.id} ${rede} ${JSON.stringify(r)}`);
    } catch (e) {
      it.resultado[rede] = { ok: false, erro: e.message, em: new Date().toISOString() };
      log(`ERRO ${it.id} ${rede}: ${e.message}`);
    }
  }
  // Failed items are not retried automatically, to avoid double posts; use "agora <id>".
  it.status = it.redes.every(r => it.resultado[r]?.ok) ? 'publicado' : 'erro';
  salvar(it);
}

function instalar() {
  const nodeExe = process.execPath;
  if (process.platform === 'win32') {
    const cmd = p('motor', 'publicar.cmd');
    fs.writeFileSync(cmd, `@echo off\r\ncd /d "%~dp0.."\r\n"${nodeExe}" motor\\publicar.mjs run >> fila\\log.txt 2>&1\r\n`);
    const q = s => `'${s.replace(/'/g, "''")}'`;
    const ps = `$a=New-ScheduledTaskAction -Execute ${q(cmd)}; $t=New-ScheduledTaskTrigger -Once -At (Get-Date) -RepetitionInterval (New-TimeSpan -Minutes 15); $s=New-ScheduledTaskSettingsSet -StartWhenAvailable -DontStopIfGoingOnBatteries -AllowStartIfOnBatteries; Register-ScheduledTask -TaskName 'FabricaConteudo' -Action $a -Trigger $t -Settings $s -Force | Out-Null; 'Tarefa FabricaConteudo criada'`;
    const r = spawnSync('powershell', ['-NoProfile', '-Command', ps], { encoding: 'utf8' });
    console.log(r.stdout || r.stderr);
    if (r.status !== 0) process.exit(1);
  } else {
    console.log(`Adicione ao crontab (crontab -e):\n*/15 * * * * cd "${p()}" && "${nodeExe}" motor/publicar.mjs run >> fila/log.txt 2>&1`);
  }
}

async function testar(slug) {
  const env = envCliente(slug);
  const { call, G } = graph(env);
  if (env.META_PAGE_ID) console.log('Página:', await call(`${G}/${env.META_PAGE_ID}`, { fields: 'name' }, 'GET'));
  if (env.IG_USER_ID) console.log('Instagram:', await call(`${G}/${env.IG_USER_ID}`, { fields: 'username' }, 'GET'));
}

const [cmd, ...a] = process.argv.slice(2);
try {
  if (cmd === 'add') {
    const [pasta, quando, redes] = a;
    const dir = path.resolve(pasta);
    if (!fs.existsSync(path.join(dir, 'peca.json'))) throw new Error(`Sem peca.json em ${dir}`);
    const data = new Date(quando);
    if (isNaN(data)) throw new Error(`Data inválida: ${quando}`);
    const id = `${data.toISOString().slice(0, 16).replace(/[-:T]/g, '')}-${Math.random().toString(36).slice(2, 6)}`;
    const it = { id, quando: data.toISOString(), pasta: path.relative(p(), dir), redes: (redes || 'instagram,facebook').split(','), status: 'pendente' };
    salvar(it);
    console.log(`Agendado ${id} para ${data.toLocaleString('pt-BR')} em ${it.redes.join(', ')}`);
  } else if (cmd === 'list') {
    for (const it of itens().sort((x, y) => x.quando.localeCompare(y.quando)))
      console.log(`${it.id}  ${new Date(it.quando).toLocaleString('pt-BR')}  ${it.status.padEnd(10)}  ${it.redes.join(',')}  ${it.pasta}`);
  } else if (cmd === 'run') {
    const agora = Date.now();
    for (const it of itens().filter(i => i.status === 'pendente' && Date.parse(i.quando) <= agora)) await executar(it);
  } else if (cmd === 'agora') {
    const it = itens().find(i => i.id === a[0]) || (() => { throw new Error(`Item ${a[0]} não encontrado`); })();
    await executar(it);
  } else if (cmd === 'cancelar') {
    fs.rmSync(path.join(FILA, `${a[0]}.json`));
    console.log('Cancelado', a[0]);
  } else if (cmd === 'instalar') instalar();
  else if (cmd === 'testar') await testar(a[0]);
  else console.log(fs.readFileSync(new URL(import.meta.url), 'utf8').split('\n').slice(0, 9).join('\n'));
} catch (e) { console.error('ERRO:', e.message); process.exit(1); }
