---
description: Cria um vídeo de anúncio completo com personagem, o produto real, narração, legenda, música e cartela final
argument-hint: "<cliente> <pedido, ex.: vídeo para vender o tênis X com personagem feminina>"
---
Pedido: $ARGUMENTS

Siga a skill `fabrica-conteudo`, seção "Vídeo completo".
1. Carregue `clientes/<cliente>/marca.json`. O produto precisa estar cadastrado com a foto oficial. Se não estiver, peça a foto e cadastre antes (recorte com `node motor/imagem.mjs recortar`).
2. Confira as chaves: `node motor/videoia.mjs provedores` (precisa de ao menos um serviço de vídeo; FAL_KEY também gera os quadros iniciais com a personagem) e ElevenLabs para a narração. Sem chave, diga qual falta e pare.
3. Escreva o roteiro: 3 a 5 cenas, total de 15 a 30 s. Cena 1 é o gancho (dor ou desejo em até 8 palavras). Depois benefício mostrado em uso, prova ou detalhe do produto e chamada. Cada `fala` com até 18 palavras, escrita para o ouvido. Cada `cena` descreve ação, cenário, luz e movimento de câmera, sempre com o produto visível.
4. `personagem`: descrição fixa e detalhada (idade, cabelo, pele, roupa, estilo), repetida igual em todo o vídeo. Se o usuário mandou foto da personagem, use em `referencia`.
5. `cartela` com layout `oferta` ou `hero`: título curto, preço, selo e CTA.
6. Salve o roteiro em `saida/<cliente>/specs/<data>-<nome>-anuncio.json` com `"saida": "saida/<cliente>/<data>-<nome>"` e rode `node motor/completo.mjs <arquivo>` com timeout de 540000 ms no Bash. Pode levar de 5 a 20 minutos: se o comando estourar o tempo, rode de novo, porque o que já foi gerado vem do cache e ele continua de onde parou.
7. Revise `partes/quadro-*.png` e a `capa.jpg`: produto fiel (logo, cor, formato) e mesma personagem em todas as cenas. Se uma cena ficou ruim, ajuste só o texto dela e rode de novo: as outras vêm do cache e não são pagas outra vez.
8. Mostre o resultado e os avisos. Não publique nem agende sem o ok do usuário.
