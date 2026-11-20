---
description: Instala a fábrica de conteúdo neste computador - analisa os requisitos, instala o que falta, prepara a pasta, cria o atalho do Estúdio e roda o autoteste
---
Instale a Fábrica de Conteúdo na pasta atual. Fale com o usuário em português simples (pode não ser programador) e mantenha uma lista de tarefas visível com cada etapa.

## 1. Análise de requisitos
1. Rode `node -v`. Se o Node não existir (ou for menor que 20), explique e, com o ok do usuário, instale: Windows `winget install -e --id OpenJS.NodeJS.LTS`, Mac `brew install node`. Depois disso o terminal pode precisar ser reaberto; avise.
2. Rode `node "${CLAUDE_PLUGIN_ROOT}/instalar/requisitos.mjs" --json` (se `${CLAUDE_PLUGIN_ROOT}` não estiver expandido, ache a pasta do plugin em `~/.claude/plugins`, procurando `fabrica-conteudo/instalar`).
3. Mostre ao usuário uma tabela: item, para que serve, nível (obrigatório / recomendado / opcional) e situação (✔ pronto / ✖ falta).
4. Proponha instalar **tudo o que falta** dos níveis obrigatório e recomendado, e pergunte sobre os opcionais. Diga que são downloads das fontes oficiais (winget, npm, PyPI, GitHub). Com o ok, rode o comando `instalar` de cada item, um por vez, conferindo o resultado.
5. Rode o verificador de novo até não faltar nada obrigatório. Se algo não instalar, explique o que fazer e siga com o resto (só o obrigatório impede continuar).
6. Login do Claude Code: se `claude` nunca foi usado neste computador, peça para o usuário rodar `claude` uma vez num terminal e fazer login (o Estúdio usa essa conta para os botões de IA).

## 2. Pasta de trabalho
1. Copie `${CLAUDE_PLUGIN_ROOT}/motor` para `./motor` e `${CLAUDE_PLUGIN_ROOT}/estudio` para `./estudio` (sobrescreva os arquivos do programa, mas nunca apague `./clientes`, `./saida`, `./fila` nem `./estudio/config.json`).
2. Rode `npm install --no-audit --no-fund` dentro de `./motor`.
3. Crie, se não existirem: `clientes/`, `saida/`, `fila/`, um `.env` com as chaves opcionais em branco (`FAL_KEY=`, `ELEVENLABS_API_KEY=`, `ELEVENLABS_VOICE_ID=`) e um `.gitignore` com `.env`, `*.env`, `clientes/`, `saida/`, `fila/`, `/motor/`, `/estudio/`, `node_modules/`. As chaves são preenchidas depois pela tela **Ajustes** do Estúdio; o usuário não precisa abrir o `.env`.
4. Copie `estudio/Abrir Estudio.cmd` (Windows) ou `estudio/Abrir Estudio.command` (Mac) para a raiz da pasta, como alternativa ao atalho.

## 3. Atalho e teste
1. Windows: rode `node estudio/atalhos.mjs criar`. Cria **"Estúdio da Fábrica"** na Área de Trabalho, com ícone, que abre sem janela preta. Pergunte se o usuário quer que o Estúdio abra junto com o Windows (`node estudio/atalhos.mjs iniciar-com-windows on`); não ative sem o ok.
2. Rode `node motor/teste.mjs rapido` para conferir o motor (1 peça). Se o usuário quiser ver a vitrine completa, `node motor/teste.mjs` (~2 min).
3. Termine com um resumo: o que foi instalado, o que ficou de fora e por quê, e o próximo passo: **dois cliques em "Estúdio da Fábrica" na Área de Trabalho** → Clientes → Novo cliente. Se instalou skills ou plugins, avise que eles aparecem numa sessão nova do Claude Code.
