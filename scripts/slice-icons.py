"""Corta las hojas de iconos generadas con Higgsfield (assets/icon-sheets/sheet*.webp) en iconos sueltos
con fondo transparente: public/icons/<nombre>.webp, y escribe src/icon-names.ts con la lista de nombres.

Uso: python3 scripts/slice-icons.py     (necesita Pillow y numpy)
Cada hoja tiene 4 columnas x 3 filas, en el orden de NAMES. Para cambiar un icono: genera otra hoja
(o reemplaza una) y vuelve a correr el script."""
from collections import deque
from pathlib import Path
import numpy as np
from PIL import Image

NAMES = [
    ["game", "locked", "daily", "fire", "time", "progress", "rank", "world", "room", "box", "hands", "kbd"],
    ["shop", "gift", "coin", "challenge", "win", "sound", "mute", "music", "phone", "gem", "skin", "star"],
    ["party", "catears", "headphones", "tophat", "wizard", "halo", "crown", "spacehelmet", "glasses", "mustache", "monocle", "shades"],
    ["visor", "bow", "scarf", "cape", "wings", "jetpack", "sparks", "hearts", "stars", "flames", "rainbow", "paint"],
    ["propeller", "chef", "headband", "cowboy", "heartglasses", "medal", "tie", "devbadge", "tools", "pencil", "infinity", "combo"],
]
COLS, ROWS, OUT = 4, 3, 128
root = Path(__file__).resolve().parent.parent


def cutout(rgb: np.ndarray, white: int = 238) -> np.ndarray:
    """Quita el fondo blanco que toca los bordes y suaviza el contorno sin dejar halo blanco."""
    h, w, _ = rgb.shape
    near_white = rgb.min(axis=2) >= white
    bg = np.zeros((h, w), bool)
    q = deque()
    for x in range(w):
        for y in (0, h - 1):
            if near_white[y, x] and not bg[y, x]: bg[y, x] = True; q.append((y, x))
    for y in range(h):
        for x in (0, w - 1):
            if near_white[y, x] and not bg[y, x]: bg[y, x] = True; q.append((y, x))
    while q:
        y, x = q.popleft()
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            ny, nx = y + dy, x + dx
            if 0 <= ny < h and 0 <= nx < w and near_white[ny, nx] and not bg[ny, nx]:
                bg[ny, nx] = True; q.append((ny, nx))
    # banda de 2 px junto al fondo: transparencia gradual y color recuperado (sin el blanco del fondo)
    band = bg.copy()
    for _ in range(2):
        p = np.pad(band, 1)
        band = band | p[:-2, 1:-1] | p[2:, 1:-1] | p[1:-1, :-2] | p[1:-1, 2:]
    edge = band & ~bg
    alpha = np.where(bg, 0.0, 1.0)
    m = rgb.min(axis=2).astype(float)
    a_edge = np.clip((255 - m) / 70.0, 0.0, 1.0)
    alpha = np.where(edge, np.maximum(a_edge, 0.0), alpha)
    out = rgb.astype(float)
    safe = np.maximum(alpha, 0.05)[..., None]
    out = np.where(edge[..., None], np.clip((out - 255 * (1 - safe)) / safe, 0, 255), out)
    return np.dstack([out, alpha * 255]).astype(np.uint8)


def drop_specks(rgba: np.ndarray) -> np.ndarray:
    """Quita restos de los iconos vecinos que se cuelan en los bordes de la celda (piezas pequeñas sueltas)."""
    from scipy import ndimage
    lab, n = ndimage.label(rgba[..., 3] > 20)
    if n < 2: return rgba
    sizes = ndimage.sum(np.ones_like(lab), lab, range(1, n + 1))
    keep = [i + 1 for i, a in enumerate(sizes) if a >= 0.04 * sizes.max()]
    rgba = rgba.copy()
    rgba[..., 3] = np.where(np.isin(lab, keep) | (ndimage.binary_dilation(np.isin(lab, keep), iterations=2) & (rgba[..., 3] > 0)), rgba[..., 3], 0)
    return rgba


names_flat = []
for s, names in enumerate(NAMES):
    sheet = Image.open(root / f"assets/icon-sheets/sheet{s}.webp").convert("RGB")
    W, H = sheet.size
    cw, ch = W / COLS, H / ROWS
    for i, name in enumerate(names):
        c, r = i % COLS, i // COLS
        box = (int(c * cw), int(r * ch), int((c + 1) * cw), int((r + 1) * ch))
        cell = np.array(sheet.crop(box))
        rgba = cutout(cell, 252 if name == "chef" else 238)
        if s == 4: rgba = drop_specks(rgba)
        ys, xs = np.where(rgba[..., 3] > 20)
        x0, x1, y0, y1 = xs.min(), xs.max() + 1, ys.min(), ys.max() + 1
        img = Image.fromarray(rgba).crop((x0, y0, x1, y1))
        side = int(max(img.size) * 1.08)
        canvas = Image.new("RGBA", (side, side), (0, 0, 0, 0))
        canvas.paste(img, ((side - img.width) // 2, (side - img.height) // 2))
        canvas.resize((OUT, OUT), Image.LANCZOS).save(root / f"public/icons/{name}.webp", quality=90, method=6)
        names_flat.append(name)

(root / "src/icon-names.ts").write_text(
    "// Generado por scripts/slice-icons.py: los nombres de los iconos de public/icons.\n"
    f"export const ICON_NAMES = {names_flat!r} as const;\nexport type IconName = (typeof ICON_NAMES)[number];\n".replace("'", '"')
)
print(len(names_flat), "iconos")
