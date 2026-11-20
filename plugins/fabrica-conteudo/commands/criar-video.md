---
description: Cria reel ou story em vídeo (motion graphics com a foto real do produto)
argument-hint: "<cliente> <tema ou pedido>"
---
Pedido: $ARGUMENTS

Siga a skill `fabrica-conteudo`.
1. Carregue `clientes/<cliente>/marca.json`. Tipo `reel` (padrão) ou `story-video`.
2. (Opcional) Peça gancho e ritmo ao agente `short-video-editing-coach` ou às skills `yt-*`.
   Roteiro em cenas de 2 a 4 s, total de 8 a 20 s. Estrutura que funciona: `impacto` (gancho em até 5 palavras, ~2 s) → `hero` (produto) → `beneficios` ou `lista` → `oferta` (se houver) → `cta`. Uma ideia por cena. As transições (cortina, lateral, círculo) e o movimento do produto são automáticos.
3. Áudio:
   - **Narração** (ElevenLabs, precisa de `ELEVENLABS_API_KEY` e de `voz` no marca.json): ponha `"fala": "texto"` em cada cena. O render narra, estica a cena se a fala for mais longa e coloca legenda palavra a palavra sincronizada. Escreva a fala para o ouvido: frases curtas, números por extenso quando soar melhor. `"narracao": {"legendas": false}` no spec desliga a legenda.
   - **Música** (arquivo licenciado): `"musica": "caminho.mp3"`. Com narração, a música fica baixa por baixo da voz. Sem música, avise que dá para escolher áudio em alta no app do Instagram ou pelo Metricool.
   - **Vários formatos**: `"formato": ["story", "quadrado"]` gera as duas versões a partir do mesmo roteiro.
4. Salve o spec em `saida/<cliente>/specs/` e rode `node motor/render.mjs <spec>` (leva ~5 s por segundo de vídeo).
5. O render também salva `capa.jpg` (use como capa do reel). Para conferir, extraia 3 quadros com o ffmpeg do motor (`node -e "console.log(require('./motor/node_modules/ffmpeg-static'))"` dá o caminho) e leia as imagens.
6. Mostre o resultado e pergunte se quer agendar.
