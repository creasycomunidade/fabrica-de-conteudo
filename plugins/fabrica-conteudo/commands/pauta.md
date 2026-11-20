---
description: Pesquisa tendências, concorrentes e datas do nicho do cliente e propõe uma pauta de conteúdo com ganchos
argument-hint: "<cliente> [tema ou período, ex: dezembro]"
---
Pedido: $ARGUMENTS

Siga a skill `fabrica-conteudo`.

1. Leia `clientes/<cliente>/marca.json` (nicho, público, tom, produtos).
2. Pesquise com WebSearch e WebFetch (as ferramentas nativas do Claude Code). Se o usuário tiver plugins como Firecrawl, Apify ou Perplexity instalados, pode usá-los também.
   - O que está em alta no nicho nos últimos 30 dias: notícias, termos, dúvidas frequentes, formatos que estão performando.
   - 2 ou 3 perfis de referência ou concorrentes que o usuário indicar (só conteúdo público).
   - Datas comemorativas e sazonais do período (Brasil), incluindo as do varejo.
   Anote a fonte de cada informação. Não invente dado, número ou tendência; se não achou, diga.
   Para ângulos por rede, consulte os agentes `instagram-curator`, `tiktok-strategist` e `linkedin-content-creator`; para ganchos e roteiro, a skill `yt-script` (plugin youtube-agent; 21 fórmulas de gancho com nota) e, para o que está funcionando no nicho, `yt-viral`.
3. Proponha de 10 a 20 ideias numa tabela: tema, formato (post, carrossel educativo, reel, story), layout sugerido, gancho (1ª linha), por que agora (com a fonte), objetivo (alcance, salvamento, venda, comentário).
   - Misture: ~40% educativo (carrossel `cards`/`lista`/`topico`), ~30% produto/oferta, ~20% prova social/bastidores, ~10% interação (`comente`).
4. Salve em `saida/<cliente>/pautas/<data>-<tema>.md` com as fontes no fim.
5. Pergunte quais ideias viram campanha e siga com `/fabrica-conteudo:campanha`.
