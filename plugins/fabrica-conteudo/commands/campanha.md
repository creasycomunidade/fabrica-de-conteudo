---
description: Planeja um calendário de conteúdo, gera todas as peças e monta a fila de publicação
argument-hint: "<cliente> <objetivo> [período, ex: 2 semanas]"
---
Pedido: $ARGUMENTS

Siga a skill `fabrica-conteudo`.
0. Se não houver pauta pronta, comece por `/fabrica-conteudo:pauta`.
1. Monte o calendário (padrão: 2 semanas, 4 a 5 publicações por semana nos horários de `marca.json`), misturando: produto/oferta, carrossel educativo, reel, story. Salve em `saida/<cliente>/campanhas/<data>-<nome>.md` como tabela (data, hora, tipo, tema, redes).
2. Mostre o calendário e **espere o ok do usuário** antes de gerar.
3. Gere todas as peças (um spec e um render por linha). Confira cada uma.
4. Rode `node motor/revisao.mjs <cliente> <pasta-da-campanha>` e entregue `saida/<cliente>/revisao.html` para aprovação da equipe/cliente (dá para zipar `saida/<cliente>` e enviar). Se houver conector do Google Drive disponível, ofereça subir a pasta para o cliente. Com novo ok explícito do usuário, agende pelo Metricool (`node motor/metricool.mjs agendar`, um por peça) ou adicione cada peça à fila com `node motor/publicar.mjs add` e mostre `node motor/publicar.mjs list`.
