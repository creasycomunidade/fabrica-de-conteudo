---
description: Edita vídeo gravado (do cliente ou da equipe) com legenda automática na fonte da marca, corte de silêncio, versões para cada rede e mais
argument-hint: "<arquivo de vídeo> [cliente] [o que fazer]"
---
Pedido: $ARGUMENTS

Use a skill **`ffmpeg-skill`** (instalada no setup; FFmpeg local, sem nuvem, sem chave). Ela faz o trabalho técnico; a fábrica entra com a identidade da marca. Leia o SKILL.md dela antes do primeiro uso e siga o fluxo probe → editar → verificar dela. Os scripts ficam em `~/.claude/skills/ffmpeg-skill/scripts/` (no Windows use `python`, não `python3`).

Fluxo recomendado para talking-head (cliente falando para a câmera):
1. **Tirar silêncio e vícios de fala**: `silence.py <video> --transcribe --engine faster-whisper --model small` (com `--filler --filler-lang pt` remove "é…", "tipo", "né"). Confira a duração antes e depois.
2. **Legenda com a marca**: rode `node motor/fonte.mjs <cliente>`; ele baixa a fonte e imprime `fontsDir`, `fonteLegenda` e `destaque`. Depois:
   `caption.py <video> --transcribe --engine faster-whisper --model small --lang pt --karaoke --karaoke-style word --font "<fonteLegenda>" --fonts-dir "<fontsDir>" --highlight-color "<destaque>" --font-size 22`
   **Antes de gravar a versão final**, leia o `.srt` gerado e corrija nomes de marca, produto e termos técnicos (o Whisper erra esses). Depois rode com `--srt <corrigido>.srt` no lugar de `--transcribe`.
3. **Áudio**: `loudness.py` para o volume padrão das redes; `audio.py` para música de fundo com ducking automático por baixo da voz (só música licenciada).
4. **Versões por rede**: `fit.py <video> --aspect 9:16|1:1|4:5|16:9 --fit blur` (nada cortado, fundo desfocado). `check.py` confere se o arquivo atende à especificação de cada plataforma.
5. **Conferir**: `look.py` gera quadros e uma folha de contato; leia as imagens e veja se a legenda cobre rosto ou texto.

Outros casos:
- **Vídeo longo (live, podcast, aula) → cortes**: `scenes.py` acha mudanças de cena e momentos fortes; `cut.py` corta os trechos; depois legende e use `fit.py --aspect 9:16`.
- **Juntar clipes** com transição: `join.py`. **B-roll** por cima: `broll.py`. **Logo/marca d'água**: `overlay.py` com `clientes/<cliente>/logo.png`.
- **Vários arquivos iguais**: `batch.py`.

Para peças animadas a partir dos layouts da marca, use `/fabrica-conteudo:criar-video`. Para o roteiro de um vídeo gravado, use o agente `short-video-editing-coach` ou as skills `yt-*`.
