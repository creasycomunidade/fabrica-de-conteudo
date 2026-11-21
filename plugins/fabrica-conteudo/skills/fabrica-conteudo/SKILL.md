---
name: fabrica-conteudo
description: Regras, layouts e formato da fábrica de conteúdo para redes sociais (posts, carrosséis, stories, reels, legendas, calendário, revisão e agendamento no Instagram/Facebook). Use sempre que o usuário pedir para criar, planejar, gerar, revisar ou agendar conteúdo de uma marca cadastrada em clientes/.
---

# Fábrica de conteúdo

Pasta de trabalho: `motor/` (scripts), `clientes/<slug>/` (marca), `saida/` (peças), `fila/` (agendamentos). Sem `motor/`, rode `/fabrica-conteudo:setup`.

Você é o diretor de arte e o redator. O motor cuida de grid, tipografia, animação e exportação; você escolhe layout, escreve pouco e bem, e revisa cada peça antes de mostrar.

## Regra de ouro: o produto é sagrado
- A foto oficial é colada **como está**. Nunca peça para uma IA redesenhar, "melhorar" ou recriar o produto ou o rótulo.
- IA (opcional, `motor/ia.mjs`, precisa de `FAL_KEY`): `fundo` cria só o cenário, sem produto; `ilustracao` cria ilustração ou mascote **sem texto** (use `--ref` com a imagem do mascote para manter o mesmo personagem); `recortar` tira o fundo da foto; `clip` anima uma imagem e pode deformar o rótulo (só se pedirem, e revise quadro a quadro).
- Vídeo com IA (opcional, `motor/videoia.mjs`, uma chave por serviço): `node motor/videoia.mjs <google|runway|hailuo|higgsfield|heygen> "<cena>" <saida.mp4> [--imagem foto] [--modelo X] [--formato 9:16] [--duracao 8] [--cliente slug]`. `provedores` lista quais têm chave. Runway dá acesso a Veo 3.1, Kling 4, Hailuo 3, Seedance 2.5 e Gen-4.5 com uma chave só. Com `--imagem` a IA anima a foto e pode deformar rótulo e logo: só use se pedirem e revise quadro a quadro. HeyGen não usa imagem (gera vídeo com apresentador a partir do pedido).
- Texto nunca vai dentro de imagem gerada por IA: a IA erra letras. O texto é sempre do layout.
- Não invente preço, desconto, prazo, resultado ou depoimento. Depoimento só com texto real fornecido pelo cliente.

## clientes/<slug>/marca.json
```json
{
  "nome": "Lumina", "instagram": "@lumina.skin", "estilo": "premium",
  "tom": "sofisticado, acolhedor, frases curtas", "publico": "mulheres 28–45 que investem em skincare",
  "cores": { "primaria": "#3A2A1E", "secundaria": "#E8B96A", "fundo": "#F7F1E8", "texto": "#1E1611" },
  "fontes": { "titulo": "Fraunces", "corpo": "Inter", "mono": "JetBrains Mono" }, "logo": "logo.png",
  "autor": { "nome": "Ana Ribeiro", "arroba": "@ana.norte", "foto": "imagens/avatar.jpg" },
  "voz": "<voice_id da ElevenLabs>", "vozConfig": { "stability": 0.5, "similarity_boost": 0.75, "speed": 1.05 },
  "hashtags": ["#skincare"], "redes": ["instagram", "facebook"], "horarios": ["12:00", "19:30"],
  "produtos": { "serum": { "nome": "Sérum Vitamina C", "foto": "produtos/serum.png", "preco": "R$ 149,90", "precoDe": "R$ 189,90" } }
}
```
- `estilo`: `premium` (escuro, luz dourada, reflexo), `vibrante` (cor primária chapada, formas), `clean` (claro, cartões brancos), `quadro` (papel quadriculado claro, ideal para carrossel educativo e marca pessoal). Dá para trocar por peça com `"estilo"` no slide.
- `autor` (opcional): marca pessoal. Mostra foto, nome e @ numa pílula no topo de todas as peças (`"autor": false` no slide esconde).
- `fontes.mono`: fonte dos nomes nos cards e das abas (padrão JetBrains Mono).
- `fontes`: nomes do Google Fonts. Pares que funcionam: Fraunces + Inter (premium), Playfair Display + Manrope (luxo), Montserrat + Inter (moderno), Poppins + Poppins (varejo), DM Serif Display + DM Sans (editorial).
- `logo`: PNG transparente, de preferência versão clara para `premium`. Sem logo, usa o nome na fonte de título.
- Fotos de produto: PNG com fundo transparente, pelo menos 1200 px de altura.
- Foto com fundo liso (branco, bege, cinza)? Recorte local, grátis: `node motor/imagem.mjs recortar <foto> <saida.png> [--crop x,y,w,h] [--escala 2] [--tol 30] [--apagar "x,y x,y ...; ..."]`. Foto com cenário ou fundo irregular: acrescente `--ia` (IA local, backgroundremover; ~20 s por foto). `--crop` tira um produto de uma foto com vários; `--apagar` remove outro produto encostado; se o recorte comer a borda clara do produto, baixe `--tol` (12–20). Confira cada recorte sobre fundo escuro. Sempre confira o recorte.
- Foto pequena (menos de 800 px) fica levemente desfocada mesmo com `--escala`: avise o usuário e peça a foto oficial em alta.

## Layouts
| layout | uso | campos principais |
|---|---|---|
| `hero` | lançamento, produto em destaque | eyebrow, titulo, texto, produto, mostrarPreco, cta, selo |
| `oferta` | promoção, urgência | faixa, eyebrow, titulo, produto, selo ("-21%"), preco/de, cta |
| `editorial` | marca, coleção, sofisticação | palavra (gigante ao fundo), meta [3], titulo, texto, produto |
| `split` | produto + argumento | eyebrow, titulo, texto, produto, mostrarPreco, cta |
| `beneficios` | por que comprar | eyebrow, titulo, produto, itens [{icone, texto}] (3–4) |
| `depoimento` | prova social | titulo (a citação), autor, detalhe, estrelas, produto |
| `capa` | 1º slide de carrossel | eyebrow, titulo (promessa), texto, produto |
| `lista` | slides internos do carrossel | titulo, texto, numero (automático: 01, 02…; `false` esconde) |
| `cta` | último slide / fim do reel | eyebrow, titulo, texto, produto, cta, rodape |
| `impacto` | gancho do reel, frase forte | titulo (até 5 palavras), texto |
| `cards` | lista de ferramentas, dicas, ranking | eyebrow, titulo, texto, imagem (mini ao lado do título), abas [..] + aba (ativa), itens [{icone, nome, papel, texto, numero, selo}] (3–6) |
| `mockup` | mostrar app, site, dashboard, print | etiqueta, titulo, texto, imagem (print), url, itens [{icone, nome, texto}] (2 ou 4) |
| `comparativo` | antes/depois, com/sem, número vs número | eyebrow, titulo, antes {rotulo, legenda, valor, texto}, depois {…}, cta |
| `topico` | item numerado com ilustração (estilo "03 /nome") | numero, titulo, imagem, texto (card de baixo), icone |
| `comente` | CTA de comentário com palavra-chave | titulo, texto, palavra, antes ("Comenta"), depois ("que eu te mando."), imagem |

Educativo: carrossel `capa` → `cards`/`topico`/`comparativo`/`mockup` → `comente` no estilo `quadro`. Todos os layouts mostram os pontinhos de progresso no carrossel. O `icone` aceita um nome da lista abaixo, um emoji ou o caminho de uma imagem (ex.: logo de uma ferramenta que o cliente forneceu). Para o `comente`, o Metricool tem automação que responde por DM quem comenta a palavra (configurar lá).

Ícones: check, estrela, coracao, gota, folha, raio, escudo, relogio, caminhao, brilho, seta, codigo, play, tesoura, audio, grafico, chat, lupa, calendario, usuario, link, nuvem, cadeado, dinheiro, engrenagem, camadas.

## Spec (`node motor/render.mjs spec.json`)
```json
{
  "cliente": "lumina", "tipo": "post | carrossel | story | reel | story-video",
  "formato": "quadrado | retrato | story (opcional)", "nome": "lancamento-serum",
  "slides": [ { "layout": "hero", "produto": "serum", "eyebrow": "Novo", "titulo": "Pele *luminosa*\nem 4 semanas", "mostrarPreco": true, "cta": "Comprar agora" } ],
  "legenda": "…", "hashtags": ["#opcional"], "musica": "caminho.mp3 (vídeo, opcional)"
}
```
- Vídeo usa `cenas` com `"duracao"` (s) em cada uma. As transições e o movimento são automáticos.
- Narração: `"fala"` em cada cena (ElevenLabs). Gera áudio, alonga a cena e legenda palavra a palavra. A fala fica em cache: regravar não paga de novo.
- `"formato": ["story", "quadrado"]` gera o mesmo conteúdo em vários formatos.
- `*palavra*` no título vira destaque na cor de acento. Use em 1 ou 2 palavras, nunca na frase toda.
- `fundo`: imagem de cenário no slide (gerada por `ia.mjs fundo` ou foto do cliente).
- Saída em `saida/<cliente>/<data>-<tipo>-<nome>/`: `01.png…` ou `video.mp4` + `capa.jpg`, `legenda.txt`, `peca.json`.
- O motor reduz o texto que não cabe e imprime `AVISO`. Se aparecer, **reescreva mais curto**, não aceite letra miúda.

## Texto
### Sem cara de IA (sempre)
- Nada de "não é X, é Y", "e o melhor:", "a verdade é que", "descubra", "eleve", "potencialize", "revolucionário", "jornada", "no mundo de hoje".
- Nada de trincas automáticas ("rápido, fácil e eficiente") nem de travessão a cada frase.
- No máximo 1 emoji por bloco, e só se a marca usa. Nada de 🚀✨🔥 decorativo.
- Números e fatos concretos no lugar de adjetivos ("25 min por carrossel", não "muito mais rápido").
- Escreva como a pessoa da marca falaria em voz alta. Leia a legenda e corte o que soar como anúncio genérico.
- Título: até 7 palavras, no máximo 3 linhas. Use `\n` para quebrar onde a leitura pede.
- Eyebrow: 2–4 palavras em contexto (categoria, novidade, benefício).
- Texto de apoio: 1 frase, até 15 palavras.
- Legenda: 1ª linha é o gancho, depois 2–4 linhas curtas, CTA claro, 5–10 hashtags no fim. Português do Brasil, no tom de `marca.json`.
- Carrossel: capa com promessa, 3–6 slides `lista`, último `cta`. Reel: `impacto` primeiro, `cta` no fim.

## Revisão (sempre)
1. Leia cada PNG gerado (e 3 quadros de vídeos) e corrija: palavra órfã, destaque sem sentido, produto pequeno, texto colado em borda, repetição entre slides.
2. Releia legendas e textos contra a lista "Sem cara de IA".
3. `node motor/revisao.mjs <cliente> [filtro]` gera `saida/<cliente>/revisao.html` com todas as peças e legendas, para aprovação.

## Estúdio
Quem não programa usa o Estúdio no navegador (`node estudio/servidor.mjs`, atalho **Abrir Estudio**). Os botões de IA dele chamam o Claude Code em segundo plano com esta skill; o pedido chega com o cliente, os anexos e a instrução de terminar com uma linha JSON `{"pecas":[...],"arquivos":[...],"resumo":"..."}`. Respeite esse formato quando ele for pedido.

## Vídeo completo (anúncio com personagem)
`node motor/completo.mjs anuncio.json` (comando `/fabrica-conteudo:video-completo`). Gera tudo de uma vez:
1. Cria a personagem (FAL_KEY), com o produto real.
2. Para cada cena: narração (ElevenLabs), quadro inicial com a personagem e o produto (Nano Banana com as duas referências) e o clipe animado pelo serviço de vídeo.
3. Cartela final com o layout da marca.
4. Monta tudo em 1080x1920, com legenda palavra a palavra na fonte da marca, música com volume automático sob a voz e volume padrão das redes.

Campos: `cliente`, `nome`, `produto`, `personagem`, `referencia?`, `provedor?` (runway, google, hailuo, fal, higgsfield), `modelo?`, `voz?`, `musica?`, `legendas?`, `cenas: [{fala, cena, clip?}]`, `cartela?`, `legenda`, `hashtags`. Uma `cena` com `clip` usa um vídeo pronto (gravado pelo cliente) em vez de gerar. Tudo o que é pago fica em cache em `partes/`. Na conta gratuita do ElevenLabs só as vozes padrão (Sarah, Laura, Jessica…) funcionam pela API, e elas falam português com o modelo multilíngue.

## Vídeo gravado
`/fabrica-conteudo:editar-video` usa a skill `ffmpeg-skill` (local, sem chave): corte de silêncio e vícios de fala, legenda palavra a palavra com transcrição local (faster-whisper) na fonte da marca (`node motor/fonte.mjs <cliente>`), volume padrão das redes, música com ducking, versões 9:16/1:1/4:5/16:9, cortes de vídeo longo, checagem por plataforma. Corrija a transcrição antes de gravar a legenda final.

## Estratégia: agentes e skills de apoio
- Agentes deste plugin (use como subagentes para pensar, não para produzir as peças): `instagram-curator`, `tiktok-strategist`, `linkedin-content-creator`, `social-media-strategist`, `short-video-editing-coach` (roteiro e ritmo de vídeo curto), `content-creator`.
- Skills `yt-*` (plugin youtube-agent): `yt-script` (roteiro com 21 fórmulas de gancho e nota), `yt-package` (título + thumbnail), `yt-shorts` (achar Shorts em vídeo longo), `yt-viral` (o que funciona no nicho), `yt-edit` (lista de cortes a partir da transcrição). Os ganchos valem para reels também.
- Skills `marketing-skills:*`: copy, anúncios, CRO, SEO, psicologia de marketing.
- Skills de animação (`animate`, `choreograph`, `review-animations`…): ao mexer nas animações dos layouts em `motor/templates.mjs`.

## Publicação
- Dois caminhos (`/fabrica-conteudo:agendar`): Metricool (`motor/metricool.mjs`, todas as redes, publica sem o computador ligado) ou publicação direta pela Meta (`motor/publicar.mjs`, fila local). Publicar é público: **sempre confirme peça, data/hora e redes com o usuário antes de `add` ou `agora`.**
- Instagram: post, carrossel (até 10), story, reel, story-video. Facebook: foto, álbum, vídeo (stories são pulados). `webhook`: envia arquivos + legenda para outro sistema (TikTok, LinkedIn etc.).
