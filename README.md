# Creasy · Fábrica de conteúdo para Claude Code

Plugin que transforma o Claude Code numa fábrica de posts, carrosséis, stories e reels, com a foto real do produto, legenda, calendário e publicação agendada no Instagram e Facebook.

## O que precisa em cada máquina
- Claude Code (o plano Pro basta para roteiro, texto, artes e vídeos animados)
- Node.js 20 ou mais
- Google Chrome ou Microsoft Edge
- Opcionais (cada um liga um recurso, todos pagos por uso ou por plano):

| Chave (no `.env`) | Serviço | Para quê |
|---|---|---|
| `FAL_KEY` | [fal.ai](https://fal.ai) | Ilustrações e mascotes (Nano Banana), fundos de cenário, clipes de vídeo com IA |
| `ELEVENLABS_API_KEY` | [ElevenLabs](https://elevenlabs.io) | **Narração** dos reels com legenda sincronizada |
| `METRICOOL_TOKEN`, `METRICOOL_USER_ID`, `METRICOOL_BLOG_ID` | [Metricool](https://metricool.com) (plano com API) | **Agendar em todas as redes** sem deixar o computador ligado |
| `META_PAGE_ID`, `META_PAGE_TOKEN`, `IG_USER_ID` | App da Meta | Publicação direta no Instagram/Facebook (alternativa ao Metricool) |

## Publicar este repositório (uma vez)
Crie um repositório **privado** vazio no GitHub chamado `creasy-plugins` e, nesta pasta:
```bash
git init && git add . && git commit -m "Fábrica de conteúdo v0.1.0"
git branch -M main
git remote add origin https://github.com/SEU-USUARIO/creasy-plugins.git
git push -u origin main
```

## Instalar em qualquer Claude Code
A máquina precisa ter acesso ao repositório privado (login no GitHub via `git`/Git Credential Manager).
```bash
claude plugin marketplace add SEU-USUARIO/creasy-plugins
claude plugin install fabrica-conteudo@creasy
```
Depois, abra o Claude Code numa pasta vazia (ex.: `C:\Conteudo`) e rode `/fabrica-conteudo:setup`.

Para atualizar depois de um `git push` novo: `claude plugin marketplace update creasy` e rode `/fabrica-conteudo:setup` de novo na pasta de trabalho (não apaga clientes, saídas nem fila).

## Estúdio (interface no navegador, para quem não programa)
Dê dois cliques em **Abrir Estudio** na pasta de trabalho (ou rode `node estudio/servidor.mjs`). Abre em `http://localhost:3838`, só neste computador.

| Tela | O que faz |
|---|---|
| Início | Atalhos para cada formato e peças recentes |
| Criar com IA | Escolha o formato, descreva com suas palavras, anexe fotos. O Claude Code monta com a identidade da marca |
| Peças | Galeria com edição de cada slide ou cena (sem IA, na hora), legenda do post, "pedir à IA" e download |
| Vídeos gravados | Envie o vídeo: corta pausas, coloca legenda na fonte da marca, ajusta volume e gera formatos. Corrija a legenda linha a linha |
| Áudios | Narração com as vozes do ElevenLabs |
| Roteiros e pautas | Textos criados pela IA, editáveis, com botão "transformar em reel" |
| Clientes | Marca (cores, fontes, estilo, logo), produtos com recorte de fundo e chaves de publicação |
| Ajustes | Ferramentas instaladas, chaves da agência e modelo da IA |

Os botões de IA usam o Claude Code deste computador em segundo plano (`claude -p`), com permissões restritas às pastas da fábrica. Nada é publicado pelo Estúdio.

## Comandos
| Comando | O que faz |
|---|---|
| `/fabrica-conteudo:setup` | Instala o motor na pasta de trabalho e gera peças de teste |
| `/fabrica-conteudo:novo-cliente` | Cadastra marca, produtos (fotos oficiais) e redes |
| `/fabrica-conteudo:criar-post` | Post, carrossel ou story com legenda |
| `/fabrica-conteudo:criar-video` | Reel ou story em vídeo |
| `/fabrica-conteudo:pauta` | Pesquisa tendências, concorrentes e datas, e propõe ideias com gancho |
| `/fabrica-conteudo:campanha` | Calendário, todas as peças e agendamento |
| `/fabrica-conteudo:editar-video` | Vídeo gravado: corte de silêncio, legenda na fonte da marca, áudio, versões por rede (via ffmpeg-skill) |
| `/fabrica-conteudo:agendar` | Fila, publicação e agendador do sistema |

Também dá para pedir em linguagem natural ("cria um carrossel com 3 dicas para o cliente aurora").

## Como funciona
- **15 layouts**: de produto (hero, oferta, editorial, split, benefícios, depoimento, CTA, impacto) e educativos (capa, lista, cards, mockup, comparativo, tópico, comente), em 4 estilos (premium, vibrante, clean, quadro), com pílula de autor para marca pessoal, com as cores e as fontes da marca. Cada peça sai em quadrado, retrato 4:5 ou story 9:16, respeitando as áreas que a interface do Instagram cobre.
- **Produto fiel**: a foto oficial entra sem alteração, com luz, sombra e reflexo aplicados ao redor dela.
- **Texto que cabe**: o motor ajusta o tamanho do título e avisa quando o texto está longo demais.
- **Vídeos**: animação com GSAP (texto revelado palavra a palavra, produto entrando e flutuando, transições de cortina, lateral e círculo), exportados em MP4 1080×1920 a 30 fps, com capa. Narração opcional (ElevenLabs) com legenda palavra a palavra sincronizada e música por baixo da voz.
- **Vídeo gravado**: [ffmpeg-skill](https://github.com/kajisho5/ffmpeg-skill) com transcrição local (faster-whisper): corte de silêncio e vícios de fala, legenda palavra a palavra na fonte da marca, volume padrão, versões por rede. Tudo local e grátis.
- **Recorte de produto**: local e grátis, para fundo liso (`imagem.mjs recortar`) ou cenário (`--ia`, backgroundremover).
- **Estratégia**: 6 agentes de marketing ([agency-agents](https://github.com/msitarzewski/agency-agents), MIT) dentro do plugin, mais as skills de YouTube e de animação instaladas pelo setup.
- **Texto sem cara de IA**: a skill traz regras contra os vícios típicos de texto gerado por IA.
- **Revisão**: `revisao.html` reúne todas as peças e legendas para a equipe ou o cliente aprovarem.
- **Agendamento pelo Metricool**: sobe as mídias e agenda em Instagram, Facebook, TikTok, LinkedIn (carrossel vira PDF), YouTube Shorts, Threads e outras; pode criar como rascunho para aprovação.
- **Agendamento direto pela Meta**: cada peça agendada vira um arquivo em `fila/`. A tarefa `FabricaConteudo` (Windows) ou o cron (Mac/Linux) roda a cada 15 min e publica o que venceu, sem precisar do Claude aberto. O computador precisa estar ligado e com internet no horário.
- **Instagram**: imagens precisam de URL pública; o motor sobe a imagem como foto não publicada da página do Facebook e usa esse endereço. Vídeos vão por upload direto.

## Ainda não testado com contas reais
Publicação no Instagram/Facebook, Metricool, ElevenLabs, as chamadas à fal.ai (ilustração, fundo, clipe) e o agendador do Windows foram escritos conforme a documentação oficial de cada API, mas só o caminho sem credenciais foi exercitado (a narração e a legenda foram testadas com áudio e transcrição simulados). Faça o primeiro uso com uma página/conta de teste.

## Estrutura
```
.claude-plugin/marketplace.json
plugins/fabrica-conteudo/
  .claude-plugin/plugin.json
  commands/        comandos /fabrica-conteudo:*
  skills/          regras da fábrica (formato de marca.json e dos specs)
  agents/          6 agentes de marketing (agency-agents, MIT)
  estudio/         servidor.mjs + public/ (interface no navegador) e atalhos Abrir Estudio
  motor/           render.mjs, templates.mjs, revisao.mjs, imagem.mjs, fonte.mjs, voz.mjs, metricool.mjs, publicar.mjs, ia.mjs, teste.mjs, demo/
```
