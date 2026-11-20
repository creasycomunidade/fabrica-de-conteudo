// Agendamento via Metricool (alternativa à publicação direta pela Meta).
// O Metricool guarda o post e publica no horário: o computador não precisa ficar ligado,
// e cobre Instagram, Facebook, TikTok, LinkedIn, YouTube, Threads, Pinterest, X, Bluesky e Google Business.
// Precisa do plano com API (Advanced ou superior) e, no clientes/<slug>/.env:
//   METRICOOL_TOKEN=   (Configurações da conta > API)   METRICOOL_USER_ID=   METRICOOL_BLOG_ID= (id da marca, aparece na URL)
//   TIMEZONE=America/Sao_Paulo (opcional)
//
//   node motor/metricool.mjs testar <cliente>                       confere a conexão e lista as marcas
//   node motor/metricool.mjs agendar <pasta-da-peca> <AAAA-MM-DDTHH:MM> <redes> [--rascunho]
//        redes: instagram,facebook,tiktok,linkedin,youtube,threads,pinterest,twitter,bluesky,gmb
//        --rascunho cria como rascunho no Metricool (para aprovar lá antes de publicar)
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { envCliente, lerJson, salvarJson, mime } from './lib.mjs';

const BASE = 'https://app.metricool.com/api';

function conf(slug) {
  const e = envCliente(slug);
  for (const k of ['METRICOOL_TOKEN', 'METRICOOL_USER_ID', 'METRICOOL_BLOG_ID']) if (!e[k]) throw new Error(`${k} ausente no .env do cliente ${slug}`);
  return { token: e.METRICOOL_TOKEN, user: e.METRICOOL_USER_ID, blog: e.METRICOOL_BLOG_ID, tz: e.TIMEZONE || 'America/Sao_Paulo' };
}

async function api(cf, method, rota, body) {
  const u = new URL(BASE + rota);
  u.searchParams.set('userId', cf.user);
  u.searchParams.set('blogId', cf.blog);
  const r = await fetch(u, { method, headers: { 'X-Mc-Auth': cf.token, 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  const txt = await r.text();
  let j; try { j = JSON.parse(txt); } catch { j = txt; }
  if (!r.ok) throw new Error(`Metricool ${r.status} em ${rota}: ${String(typeof j === 'string' ? j : JSON.stringify(j)).slice(0, 400)}`);
  return j;
}

// S3 presigned PUT. Checksum header only when the URL signed it (sending unsigned x-amz-* headers can break the signature).
async function putS3(url, buf, tipo, hash) {
  const q = new URL(url).searchParams;
  const assinados = (q.get('X-Amz-SignedHeaders') || '').toLowerCase();
  const h = {};
  if (tipo) h['Content-Type'] = tipo;
  if (assinados.includes('x-amz-checksum-sha256') || q.has('x-amz-checksum-sha256') || /checksum/i.test(q.get('x-amz-sdk-checksum-algorithm') || '')) h['x-amz-checksum-sha256'] = hash;
  const r = await fetch(url, { method: 'PUT', headers: h, body: buf });
  if (!r.ok) throw new Error(`Upload S3 ${r.status}: ${(await r.text()).slice(0, 300)}`);
  return r;
}

export async function subir(cf, arquivo) {
  const buf = fs.readFileSync(arquivo);
  const PARTE = 5 * 1024 * 1024;
  const partes = [];
  for (let i = 0; i < buf.length; i += PARTE) {
    const pb = buf.subarray(i, Math.min(i + PARTE, buf.length));
    partes.push({ size: pb.length, startByte: i, endByte: i + pb.length, hash: crypto.createHash('sha256').update(pb).digest('base64') });
  }
  const t = (await api(cf, 'PUT', '/v2/media/s3/upload-transactions', { resourceType: 'planner', contentType: mime(arquivo), parts: partes })).data;
  let fim;
  if (t.presignedUrl) {
    await putS3(t.presignedUrl, buf, mime(arquivo), partes[0].hash);
    fim = (await api(cf, 'PATCH', '/v2/media/s3/upload-transactions', { simple: { fileUrl: t.fileUrl } })).data;
  } else {
    const etags = [];
    for (const pp of t.parts) {
      const pb = buf.subarray(pp.startByte, pp.endByte);
      const r = await putS3(pp.presignedUrl, pb, null, crypto.createHash('sha256').update(pb).digest('base64'));
      etags.push({ partNumber: pp.partNumber, etag: r.headers.get('etag') });
    }
    fim = (await api(cf, 'PATCH', '/v2/media/s3/upload-transactions', { multipart: { uploadId: t.uploadId, key: t.key, parts: etags } })).data;
  }
  return fim?.convertedFileUrl || fim?.fileUrl || t.fileUrl;
}

const TIPO = { post: 'POST', carrossel: 'POST', story: 'STORY', 'story-video': 'STORY', reel: 'REEL' };

export function corpoPost(peca, urls, redes, quando, tz, rascunho) {
  const primeira = (peca.legenda || '').split('\n')[0].slice(0, 100) || 'Post';
  const tipo = TIPO[peca.tipo] || 'POST';
  const dados = {
    instagram: { instagramData: { type: tipo, autoPublish: true, showReelOnFeed: true } },
    facebook: { facebookData: { type: tipo } },
    tiktok: { tiktokData: { privacyOption: 'PUBLIC_TO_EVERYONE', title: primeira, autoAddMusic: false, disableComment: false, disableDuet: false, disableStitch: false } },
    youtube: { youtubeData: { title: primeira, type: 'SHORT', privacy: 'PUBLIC', madeForKids: false } },
    linkedin: { linkedinData: peca.tipo === 'carrossel' ? { type: 'POST', publishImagesAsPDF: true, documentTitle: primeira } : { type: 'POST' } },
  };
  return Object.assign({
    text: peca.legenda || '',
    publicationDate: { dateTime: quando.length === 16 ? `${quando}:00` : quando, timezone: tz },
    providers: redes.map(network => ({ network })),
    media: urls,
    autoPublish: !rascunho,
    draft: !!rascunho,
    shortener: false,
  }, ...redes.map(r => dados[r] || {}));
}

const principal = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
const [cmd, ...a] = principal ? process.argv.slice(2) : [];
if (principal) try {
  if (cmd === 'testar') {
    const cf = conf(a[0]);
    const j = await api(cf, 'GET', '/admin/profiles');
    const lista = Array.isArray(j) ? j : j.data || [];
    for (const b of lista) console.log(`${b.id ?? b.blogId}  ${b.label ?? b.title ?? b.name ?? ''}`);
    console.log('Conexão OK');
  } else if (cmd === 'agendar') {
    const [pasta, quando, redesStr] = a;
    if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(quando || '')) throw new Error('Data no formato AAAA-MM-DDTHH:MM (horário local do cliente)');
    const dir = path.resolve(pasta);
    const peca = lerJson(path.join(dir, 'peca.json'));
    const cf = conf(peca.cliente);
    const redes = (redesStr || 'instagram,facebook').split(',');
    const urls = [];
    for (const f of peca.arquivos) { urls.push(await subir(cf, path.join(dir, f))); console.log('mídia enviada:', f); }
    const r = await api(cf, 'POST', '/v2/scheduler/posts', corpoPost(peca, urls, redes, quando, cf.tz, a.includes('--rascunho')));
    const post = r.data || r;
    salvarJson(path.join(dir, 'metricool.json'), { quando, redes, rascunho: a.includes('--rascunho'), id: post.id, uuid: post.uuid, providers: post.providers });
    console.log(`Agendado no Metricool: id ${post.id} · ${quando} (${cf.tz}) · ${redes.join(', ')}${a.includes('--rascunho') ? ' · RASCUNHO' : ''}`);
  } else console.log(fs.readFileSync(new URL(import.meta.url), 'utf8').split('\n').slice(0, 13).join('\n'));
} catch (e) { console.error('ERRO:', e.message); process.exit(1); }
