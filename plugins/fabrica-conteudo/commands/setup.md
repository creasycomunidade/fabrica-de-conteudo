---
description: Instala o motor da fábrica de conteúdo e as ferramentas de apoio nesta pasta de trabalho e roda o autoteste
---
Prepare a pasta atual como pasta de trabalho da fábrica de conteúdo. Mostre ao usuário a lista do passo 5 antes de instalar (são downloads de fontes oficiais: npm, PyPI e GitHub) e siga com o ok dele.

1. Confira `node -v` (20 ou mais) e `python --version` (3.10 ou mais; no Mac/Linux, `python3`). Se faltar algum, peça ao usuário para instalar o Node.js LTS ou o Python e pare.
2. Copie a pasta `${CLAUDE_PLUGIN_ROOT}/motor` para `./motor` (sobrescreva os arquivos .mjs e package.json, mas nunca apague `./clientes`, `./saida` ou `./fila`). Se `${CLAUDE_PLUGIN_ROOT}` não estiver expandido, encontre a pasta do plugin em `~/.claude/plugins` (procure `fabrica-conteudo/motor`).
3. Rode `npm install --no-audit --no-fund` dentro de `./motor`. Copie também `${CLAUDE_PLUGIN_ROOT}/estudio` para `./estudio` (interface no navegador) e o atalho `estudio/Abrir Estudio.cmd` (Windows) ou `estudio/Abrir Estudio.command` (Mac) para a raiz da pasta.
4. Crie, se não existirem: `clientes/`, `saida/`, `fila/`, um `.env` com as chaves opcionais em branco (`FAL_KEY=` para ilustração, fundo e clipe com IA; `ELEVENLABS_API_KEY=` e `ELEVENLABS_VOICE_ID=` para narração) e um `.gitignore` com `.env`, `*.env`, `clientes/`, `saida/`, `fila/`, `/motor/`, `/estudio/`, `node_modules/`.
5. **Ferramentas de apoio** (todas grátis e locais; pule as que já estiverem instaladas):
   | Ferramenta | Instalação | Para quê |
   |---|---|---|
   | ffmpeg-skill | `npx -y ffmpeg-skill setup` | Edição de vídeo gravado: corte, silêncio, legenda, áudio, formatos |
   | faster-whisper | `pip install faster-whisper "av<16"` | Transcrição local em português (legendas). O `av<16` evita uma incompatibilidade conhecida da versão 19 |
   | backgroundremover | `pip install backgroundremover` | Recorte de produto em foto com cenário (`imagem.mjs recortar --ia`). Baixa o modelo (~170 MB) no primeiro uso |
   | Skills de animação (Emil Kowalski) | `npx -y skills@latest add emilkowalski/skills -g -a claude-code -y --copy -s animate -s choreograph -s animation-vocabulary -s review-animations -s improve-animations -s emil-design-eng` | Bom gosto em movimento ao criar ou ajustar animações dos layouts |
   | Skills de YouTube | `claude plugin marketplace add Jakeschincariol/youtube-agent-skill` e `claude plugin install youtube-agent@youtube-agent-skill` | Ganchos com nota, título e thumbnail, roteiro, achar Shorts em vídeo longo |
   Depois rode `npx ffmpeg-skill doctor` e confirme que não falta nada obrigatório. Os agentes de marketing (Instagram, TikTok, LinkedIn, estrategista, editor de vídeo curto, criador de conteúdo) já vêm dentro deste plugin.
6. Rode `node motor/teste.mjs` (cerca de 2 min; use `node motor/teste.mjs rapido` se só quiser conferir a instalação). Ele cria duas marcas fictícias (`lumina`, produto premium, e `norte`, marca pessoal no estilo educativo) e gera uma peça de cada layout, dois carrosséis e um reel em `saida/lumina/vitrine/`. Depois rode `node motor/revisao.mjs lumina` e diga ao usuário para abrir `saida/lumina/revisao.html` no navegador. Mostre 2 ou 3 PNGs gerados.
7. Diga ao usuário que, para quem não programa, o jeito mais fácil é dar dois cliques em **Abrir Estudio** na pasta: abre o Estúdio no navegador (clientes, criar com IA, editar peças, vídeos, áudios e roteiros).
8. Diga o que vem a seguir: `/fabrica-conteudo:novo-cliente` para cadastrar a primeira marca. Se instalou skills ou plugins no passo 5, avise que eles aparecem numa sessão nova do Claude Code.
