# Recorte profissional de produto: BiRefNet (via rembg) + limpeza da borda.
#   python motor/recorte.py <entrada> <saida.png> [modelo=birefnet-general] [encolher=1]
# A limpeza tira o "halo" do fundo antigo: encolhe a máscara 1 px, suaviza e
# descontamina a cor dos pixels semitransparentes (remove o branco/cinza do fundo que vaza na borda).
import sys

import numpy as np
from PIL import Image, ImageFilter
from rembg import new_session, remove
from scipy import ndimage


def limpar(rgb, alfa, encolher=1):
    """rgb: HxWx3 float 0-255, alfa: HxW float 0-1 (máscara do modelo). Devolve RGBA uint8."""
    fundo = alfa < 0.02
    cor_fundo = np.median(rgb[fundo], axis=0) if fundo.sum() > 100 else np.array([255.0, 255.0, 255.0])
    # Drop loose fragments (a slice of the product next door in a crop): keep pieces >= 5% of the largest.
    rotulos, n = ndimage.label(alfa > 0.5)
    if n > 1:
        areas = ndimage.sum(np.ones_like(alfa), rotulos, range(1, n + 1))
        manter = np.isin(rotulos, 1 + np.nonzero(areas >= 0.05 * areas.max())[0])
        alfa = alfa * ndimage.binary_dilation(manter, iterations=3)
    m = Image.fromarray((alfa * 255).astype("uint8"))
    for _ in range(encolher):
        m = m.filter(ImageFilter.MinFilter(3))
    a = np.asarray(m.filter(ImageFilter.GaussianBlur(0.6))).astype(float) / 255
    a[a < 0.03] = 0
    # Background-coloured specks the model kept in small gaps (e.g. where cap meets bottle):
    # within a thin band next to the cut, fade pixels by how close they are to the old background.
    k = 5 * encolher + 4
    fora = Image.fromarray(((a < 0.5) * 255).astype("uint8")).filter(ImageFilter.MaxFilter(2 * k + 1))
    faixa = (np.asarray(fora) > 0) & (a > 0)
    d = np.linalg.norm(rgb - cor_fundo, axis=2)
    a[faixa] *= np.clip((d[faixa] - 25) / 60, 0, 1) ** 1.5
    borda = (a > 0) & (a < 0.98)
    ab = a[borda][:, None]
    rgb = rgb.copy()
    rgb[borda] = np.clip((rgb[borda] - (1 - ab) * cor_fundo) / ab, 0, 255)
    return np.dstack([rgb, a * 255]).round().astype("uint8"), cor_fundo


if __name__ == "__main__":
    if sys.argv[1:2] == ["teste"]:
        # Red square on white, soft mask edge: after cleanup the edge must be red, not pink.
        rgb = np.full((40, 40, 3), 255.0)
        rgb[10:30, 10:30] = [255, 0, 0]
        alfa = np.zeros((40, 40))
        alfa[10:30, 10:30] = 1
        rgb[9, 10:30] = [255, 128, 128]  # 50% blend with the white background
        alfa[9, 10:30] = 0.5
        out, cor = limpar(rgb, alfa, encolher=0)
        assert tuple(cor) == (255, 255, 255), cor
        assert out[9, 20, 1] < 40 and out[9, 20, 3] > 0, out[9, 20]
        assert out[0, 0, 3] == 0
        alfa2 = alfa.copy()
        alfa2[35:37, 0:2] = 1  # tiny loose fragment
        out2, _ = limpar(rgb, alfa2, encolher=0)
        assert out2[36, 1, 3] == 0 and out2[20, 20, 3] == 255
        print("ok")
        sys.exit(0)
    entrada, saida = sys.argv[1], sys.argv[2]
    modelo = sys.argv[3] if len(sys.argv) > 3 else "birefnet-general"
    encolher = int(sys.argv[4]) if len(sys.argv) > 4 else 1
    img = Image.open(entrada).convert("RGB")
    mascara = remove(img, session=new_session(modelo), only_mask=True)
    out, _ = limpar(np.asarray(img).astype(float), np.asarray(mascara.convert("L")).astype(float) / 255, encolher)
    Image.fromarray(out, "RGBA").save(saida)
    print(saida)
