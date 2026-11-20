<p align="center"><img src="plugins/fabrica-conteudo/estudio/public/marca/icone.svg" width="96" alt="Fábrica CRΞΛSY"></p>

<h1 align="center">Fábrica de Conteúdo CRΞΛSY</h1>

<p align="center">Um projeto aberto da <b>comunidade CRΞΛSY</b> que transforma o Claude Code numa fábrica de posts, carrosséis, stories e reels, com a foto real do produto, legenda, roteiro, áudio e agendamento. Para quem programa (comandos) e para quem não programa (Estúdio no navegador).</p>

<p align="center"><a href="LICENSE">Licença Apache 2.0</a> · <a href="CREDITS.md">Créditos</a> · <a href="NOTICE">NOTICE</a></p>

## O que precisa em cada máquina
O próprio setup faz a **análise de requisitos** (`plugins/fabrica-conteudo/instalar/requisitos.mjs`), mostra o que falta e instala com o seu ok:

| Nível | Itens |
|---|---|
| Obrigatório | Node.js 20+, Chrome ou Edge, Git, Claude Code com login |
| Recomendado | Python 3.10+, FFmpeg, ffmpeg-skill, faster-whisper, 5 GB livres, internet |
| Opcional | backgroundremover, skills de YouTube, skills de animação |

- Chaves de serviços pagos, todas opcionais (preenchidas pela tela **Ajustes** do Estúdio, sem abrir arquivo): (cada um liga um recurso, todos pagos por uso ou por plano):

| Chave (no `.env`) | Serviço | Para quê |
|---|---|---|
| `FAL_KEY` | [fal.ai](https://fal.ai) | Ilustrações e mascotes (Nano Banana), fundos de cenário, clipes de vídeo com IA |
| `ELEVENLABS_API_KEY` | [ElevenLabs](https://elevenlabs.io) | **Narração** dos reels com legenda sincronizada |
| `METRICOOL_TOKEN`, `METRICOOL_USER_ID`, `METRICOOL_BLOG_ID` | [Metricool](https://metricool.com) (plano com API) | **Agendar em todas as redes** sem deixar o computador ligado |
| `META_PAGE_ID`, `META_PAGE_TOKEN`, `IG_USER_ID` | App da Meta | Publicação direta no Instagram/Facebook (alternativa ao Metricool) |

## Instalar em qualquer computador
Repositório público: **github.com/creasycomunidade/fabrica-de-conteudo**. Não precisa de conta no GitHub para instalar.

**Jeito mais fácil:** abra o Claude Code numa pasta vazia (ex.: `C:\Conteudo`) e peça:
> Instale o plugin fabrica-conteudo do repositório creasycomunidade/fabrica-de-conteudo e rode o setup nesta pasta.

**Ou pelo terminal:**
```bash
claude plugin marketplace add creasycomunidade/fabrica-de-conteudo
claude plugin install fabrica-conteudo@creasy
```
Depois, numa sessão nova do Claude Code nessa pasta, rode `/fabrica-conteudo:setup`. No fim aparece o ícone **Estúdio da Fábrica** na Área de Trabalho.

Para atualizar depois de um `git push` novo: `claude plugin marketplace update creasy` e rode `/fabrica-conteudo:setup` de novo na pasta de trabalho (não apaga clientes, saídas nem fila).

## Estúdio (interface no navegador, para quem não programa)
Dê dois cliques no ícone **Estúdio da Fábrica** na Área de Trabalho (ou em **Abrir Estudio** na pasta). Abre no navegador em `http://localhost:3838`, sem janela preta, só neste computador; para fechar, use **Desligar Estúdio** na barra lateral. Em Ajustes dá para fazê-lo abrir junto com o Windows.

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

## Licença e créditos
Este é um projeto **da comunidade, para a comunidade**: use, adapte e distribua à vontade, inclusive comercialmente, sob a [Licença Apache 2.0](LICENSE). A única condição é **manter os créditos**:

- mantenha os arquivos [`NOTICE`](NOTICE), [`CREDITS.md`](CREDITS.md) e [`LICENSE`](LICENSE) em qualquer cópia ou versão modificada;
- cite a origem no seu projeto, por exemplo: *"Baseado na [Fábrica de Conteúdo da Comunidade CRΞΛSY](https://github.com/creasycomunidade/fabrica-de-conteudo)"*;
- não use o nome ou os logotipos CRΞΛSY como marca do seu projeto (eles não fazem parte da licença).

A lista completa de bibliotecas, ferramentas, modelos, fontes e serviços de terceiros que usamos, com autor e licença de cada um, está em [`CREDITS.md`](CREDITS.md).
