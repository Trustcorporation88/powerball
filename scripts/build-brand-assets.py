#!/usr/bin/env python3
"""Gera os arquivos de marca a partir do logotipo original.

    pip install pillow
    python3 scripts/build-brand-assets.py caminho/para/logo-original.jpg

Produz, em `public/`:
  - logo-powerball.png        logotipo com fundo transparente, usado nas telas
  - icons/icon-192.png        ícone do PWA
  - icons/icon-512.png        ícone do PWA em alta
  - icons/icon-maskable-512.png  versão com folga para o recorte do Android

Só precisa rodar de novo quando o logotipo mudar; os arquivos gerados ficam
versionados no repositório para não exigir Python no build.
"""

import sys
from collections import deque
from pathlib import Path

from PIL import Image

RAIZ = Path(__file__).resolve().parent.parent
PUBLICO = RAIZ / "public"

# Azul do escudo do logotipo. Precisa bater com `powerball.navy` do Tailwind e
# com o theme_color do manifesto.
NAVY = (30, 48, 84, 255)


def recortar_fundo(caminho: Path) -> Image.Image:
    """Torna transparente o branco ao redor do logotipo.

    O preenchimento parte das bordas de propósito: o branco de dentro do escudo
    (o "P", o contorno, as letras) precisa continuar opaco.
    """
    img = Image.open(caminho).convert("RGBA")
    largura, altura = img.size
    px = img.load()

    def quase_branco(p) -> bool:
        return p[0] > 235 and p[1] > 235 and p[2] > 235

    visto = [[False] * largura for _ in range(altura)]
    fila: deque = deque()

    for x in range(largura):
        for y in (0, altura - 1):
            if quase_branco(px[x, y]) and not visto[y][x]:
                visto[y][x] = True
                fila.append((x, y))

    for y in range(altura):
        for x in (0, largura - 1):
            if quase_branco(px[x, y]) and not visto[y][x]:
                visto[y][x] = True
                fila.append((x, y))

    while fila:
        x, y = fila.popleft()
        px[x, y] = (255, 255, 255, 0)
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nx, ny = x + dx, y + dy
            if 0 <= nx < largura and 0 <= ny < altura:
                if not visto[ny][nx] and quase_branco(px[nx, ny]):
                    visto[ny][nx] = True
                    fila.append((nx, ny))

    return img.crop(img.getbbox())


def gerar_icone(logo: Image.Image, lado: int, ocupacao: float, destino: Path) -> None:
    """Centraliza o logotipo sobre o azul da marca."""
    fundo = Image.new("RGBA", (lado, lado), NAVY)
    disponivel = lado * ocupacao
    fator = min(disponivel / logo.width, disponivel / logo.height)
    marca = logo.resize(
        (max(1, round(logo.width * fator)), max(1, round(logo.height * fator))),
        Image.LANCZOS,
    )
    fundo.alpha_composite(marca, ((lado - marca.width) // 2, (lado - marca.height) // 2))
    fundo.save(destino, optimize=True)
    print(f"{destino.relative_to(RAIZ)} ({lado}x{lado})")


def main() -> None:
    if len(sys.argv) < 2:
        raise SystemExit("uso: build-brand-assets.py <logo-original>")

    logo = recortar_fundo(Path(sys.argv[1]))

    # Altura dobrada em relação à maior exibição em tela, para telas retina.
    escala = 240 / logo.height
    cabecalho = logo.resize((round(logo.width * escala), 240), Image.LANCZOS)
    cabecalho.save(PUBLICO / "logo-powerball.png", optimize=True)
    print(f"public/logo-powerball.png ({cabecalho.width}x{cabecalho.height})")

    icones = PUBLICO / "icons"
    icones.mkdir(parents=True, exist_ok=True)

    gerar_icone(logo, 192, 0.86, icones / "icon-192.png")
    gerar_icone(logo, 512, 0.86, icones / "icon-512.png")
    # O recorte circular do Android come até 20% de cada borda.
    gerar_icone(logo, 512, 0.62, icones / "icon-maskable-512.png")


if __name__ == "__main__":
    main()
