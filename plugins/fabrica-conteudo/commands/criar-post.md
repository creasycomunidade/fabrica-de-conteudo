---
description: Cria post, carrossel ou story (imagem) com legenda para um cliente
argument-hint: "<cliente> <tema ou pedido>"
---
Pedido: $ARGUMENTS

Siga a skill `fabrica-conteudo`.
1. Carregue `clientes/<cliente>/marca.json`. Se o tipo não estiver claro, escolha: post (1 imagem), carrossel (conteúdo educativo, 3 a 8 slides) ou story. Escolha o layout pelo objetivo (tabela na skill): venda → `hero`/`oferta`/`split`; autoridade → `editorial`/`beneficios`; prova social → `depoimento`; carrossel → `capa` + `lista`… + `cta`.
2. Escreva o texto no tom da marca: títulos curtos (até ~7 palavras), legenda com gancho na 1ª linha e CTA.
3. Salve o spec em `saida/<cliente>/specs/<data>-<nome>.json` e rode `node motor/render.mjs <spec>`.
4. Se o render imprimir `AVISO`, encurte o texto e gere de novo. Depois leia as imagens e confira como diretor de arte: hierarquia, produto bem visível, palavra destacada com `*...*` fazendo sentido, nada encostando nas bordas.
5. Rode `node motor/revisao.mjs <cliente>` para atualizar a página de revisão. Mostre as imagens e a legenda. Pergunte se quer agendar (`/fabrica-conteudo:agendar`).
