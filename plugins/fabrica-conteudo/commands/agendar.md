---
description: Gerencia a fila de publicação (agendar, listar, publicar já, cancelar, instalar o agendador)
argument-hint: "[pasta da peça] [data/hora] [redes] | list | instalar"
---
Pedido: $ARGUMENTS

Há dois caminhos. Pergunte qual o cliente usa se não estiver claro pelo `.env` dele.

**A. Metricool (recomendado quando o cliente tem plano com API)**: `node motor/metricool.mjs` (veja o cabeçalho).
- Cobre Instagram, Facebook, TikTok, LinkedIn (carrossel vira documento PDF), YouTube Shorts, Threads, Pinterest, X, Bluesky e Google Business.
- O próprio Metricool publica no horário: o computador não precisa ficar ligado e não usa a fila local.
- `testar <cliente>` confere as chaves. `agendar <pasta> <AAAA-MM-DDTHH:MM> <redes>` sobe as mídias e agenda; `--rascunho` cria como rascunho para aprovar dentro do Metricool.
- Confirme peça, data/hora e redes com o usuário antes de `agendar`.

**B. Publicação direta pela Meta (Instagram/Facebook)**: fila em `fila/`, executada por `node motor/publicar.mjs` (veja o cabeçalho do arquivo para os comandos).

- **Agendar**: confirme com o usuário peça, data/hora (horário local) e redes (`instagram`, `facebook`, `webhook`) antes de rodar `add`. Publicar é público e não dá para desfazer pelo motor.
- **Publicar já**: só com confirmação explícita; `add` com a hora atual e depois `agora <id>`.
- **Instalar o agendador** (uma vez por máquina): explique que cria a tarefa "FabricaConteudo" do sistema, que roda `publicar.mjs run` a cada 15 min, e que o computador precisa estar ligado e com internet no horário. Com o ok, rode `node motor/publicar.mjs instalar`.
- **Status**: `list`, e mostre o fim de `fila/log.txt` se houver erros. Item com status `erro` não é reenviado sozinho (evita post duplicado): corrija a causa e rode `agora <id>`, que só reenvia as redes que falharam.
