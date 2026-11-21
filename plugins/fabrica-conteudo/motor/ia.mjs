// Módulo opcional (pago por uso): precisa de FAL_KEY no .env da pasta de trabalho.
//   node motor/ia.mjs fundo "<prompt do cenário, SEM o produto>" <saida.png> [1:1|4:5|9:16]
//   node motor/ia.mjs clip <imagem> "<prompt de movimento>" <saida.mp4> [5|10]
//   node motor/ia.mjs ilustracao "<prompt>" <saida.png> [aspect] [--ref personagem.png]   ilustração/mascote sem texto
//   node motor/ia.mjs cena "<prompt>" <saida.png> [aspect] [--ref produto.png] [--ref personagem.png]   foto realista de cena (quadro inicial do vídeo)
// "fundo" gera só o cenário; a foto oficial do produto é colada por cima pelo render, então o rótulo nunca muda.
// "clip" anima uma imagem: a IA pode deformar o rótulo, revise antes de usar.
import fs from 'node:fs';
import path from 'node:path';
import { envCliente, dataUri } from './lib.mjs';

const KEY = envCliente().FAL_KEY;

async function fal(modelo, input) {
  if (!KEY) throw new Error('FAL_KEY ausente. Crie uma chave em fal.ai e coloque FAL_KEY=... no arquivo .env da pasta de trabalho.');
  const h = { Authorization: `Key ${KEY}`, 'Content-Type': 'application/json' };
  const r = await fetch(`https://queue.fal.run/${modelo}`, { method: 'POST', headers: h, body: JSON.stringify(input) });
  const j = await r.json();
  if (!r.ok) throw new Error(`fal.ai ${r.status}: ${JSON.stringify(j)}`);
  for (let i = 0; i < 180; i++) {
    const s = await (await fetch(j.status_url, { headers: h })).json();
    if (s.status === 'COMPLETED') return (await fetch(j.response_url, { headers: h })).json();
    if (s.status === 'FAILED' || s.error) throw new Error(`fal.ai falhou: ${JSON.stringify(s)}`);
    await new Promise(ok => setTimeout(ok, 4000));
  }
  throw new Error('fal.ai demorou demais');
}

async function baixar(url, saida) {
  fs.mkdirSync(path.dirname(path.resolve(saida)), { recursive: true });
  fs.writeFileSync(saida, Buffer.from(await (await fetch(url)).arrayBuffer()));
  console.log('Salvo', path.resolve(saida));
}

const [cmd, ...a] = process.argv.slice(2);
try {
  if (cmd === 'fundo') {
    const [prompt, saida, aspect = '4:5'] = a;
    const r = await fal('fal-ai/nano-banana-pro', { prompt: `${prompt}. Empty product photography backdrop, no products, no text, no logos, space in the center for a product.`, aspect_ratio: aspect, num_images: 1 });
    await baixar(r.images[0].url, saida);
  } else if (cmd === 'clip') {
    const [img, prompt, saida, dur = '5'] = a;
    const r = await fal('fal-ai/kling-video/v2.5-turbo/pro/image-to-video', { image_url: dataUri(img), prompt: `${prompt}. Keep the product and its label exactly as in the image.`, duration: dur });
    await baixar(r.video.url, saida);
  } else if (cmd === 'ilustracao' || cmd === 'cena') {
    // Text is never baked into AI art: the engine sets the text in HTML, so it is always spelled right.
    const refs = a.flatMap((x, i) => (a[i - 1] === '--ref' ? [x] : []));
    const [prompt, saida, aspect = '1:1'] = a.filter((x, i) => x !== '--ref' && a[i - 1] !== '--ref');
    const fim = cmd === 'cena'
      ? 'Photorealistic advertising photo, natural light, real skin texture, candid pose. Keep the product exactly as in the reference image (same shape, colors and logo). No added text, no watermark.'
      : 'No text, no letters, no words, no logos, no watermark. Clean background, centered subject, high quality.';
    const input = { prompt: `${prompt}. ${fim}`, aspect_ratio: aspect, num_images: 1, output_format: 'png' };
    const r = refs.length ? await fal('fal-ai/nano-banana-pro/edit', { ...input, image_urls: refs.map(dataUri) }) : await fal('fal-ai/nano-banana-pro', input);
    await baixar(r.images[0].url, saida);
  } else console.log(fs.readFileSync(new URL(import.meta.url), 'utf8').split('\n').slice(0, 6).join('\n'));
} catch (e) { console.error('ERRO:', e.message); process.exit(1); }
