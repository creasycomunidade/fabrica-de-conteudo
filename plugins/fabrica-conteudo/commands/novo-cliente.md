---
description: Cadastra uma marca (cores, tom, produtos com foto oficial) e as redes onde publicar
argument-hint: "[nome da marca]"
---
Cadastre um cliente na fábrica. Siga a skill `fabrica-conteudo` para o formato dos arquivos.

Marca: $ARGUMENTS

1. Pergunte só o que faltar: nome, @ do Instagram, cores (ou extraia do logo/site se o usuário der), estilo (`premium`, `vibrante`, `clean` ou `quadro` para conteúdo educativo), fontes do Google Fonts para título e corpo, se é marca pessoal (`autor`: nome, @ e foto aparecem no topo das peças), voz da ElevenLabs para narração (`voz`; liste com `node motor/voz.mjs vozes`), tom de voz, público, hashtags fixas, horários preferidos de publicação, e a lista de produtos com nome, preço e caminho da **foto oficial** (de preferência PNG com fundo transparente).
2. Crie `clientes/<slug>/marca.json` e copie as fotos para `clientes/<slug>/produtos/` e o logo para `clientes/<slug>/logo.png` sem alterá-las. Se a foto do produto tiver fundo (JPG), avise que o resultado fica muito melhor com PNG transparente; recorte de graça com `node motor/imagem.mjs recortar <foto> <saida.png>` (IA local com borda limpa; veja as opções na skill). Confira o recorte sobre fundo escuro antes de usar.
3. Para publicar direto, crie `clientes/<slug>/.env` com as chaves abaixo vazias e explique como obtê-las (app em developers.facebook.com, conta Instagram profissional ligada à página, token de página de longa duração com `pages_manage_posts`, `pages_read_engagement`, `instagram_basic`, `instagram_content_publish`):
   ```
   # Metricool (recomendado, se o cliente tiver plano com API)
   METRICOOL_TOKEN=
   METRICOOL_USER_ID=
   METRICOOL_BLOG_ID=
   # ou publicação direta pela Meta
   META_PAGE_ID=
   META_PAGE_TOKEN=
   IG_USER_ID=
   WEBHOOK_URL=
   ```
   Nunca peça para o usuário colar tokens no chat: ele mesmo edita o arquivo. Depois rode `node motor/metricool.mjs testar <slug>` ou `node motor/publicar.mjs testar <slug>` para conferir.
4. Gere um post de boas-vindas da marca com `/fabrica-conteudo:criar-post` para validar cores e foto.
