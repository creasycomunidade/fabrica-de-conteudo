# Transcrição local com tempo de cada palavra (faster-whisper).
#   python motor/transcrever.py <video> <saida.json> [modelo=small] [idioma=pt]
import json
import sys

from faster_whisper import WhisperModel

video, saida = sys.argv[1], sys.argv[2]
modelo = sys.argv[3] if len(sys.argv) > 3 else "small"
idioma = sys.argv[4] if len(sys.argv) > 4 else "pt"
segs, _ = WhisperModel(modelo, device="cpu", compute_type="int8").transcribe(video, language=idioma, word_timestamps=True)
palavras = [{"t": w.word.strip(), "ini": round(w.start, 2), "fim": round(w.end, 2)} for s in segs for w in (s.words or []) if w.word.strip()]
with open(saida, "w", encoding="utf-8") as f:
    json.dump(palavras, f, ensure_ascii=False)
print(f"{len(palavras)} palavras")
