"""Genera el icono de UTI Tools: SVG escalable y los PNG que piden Android e iOS.

Fuente unica de la geometria. Si el icono cambia, se edita aca y se corre:

    python iconos/generar_iconos.py

Paleta tomada de index.html: fondo #0a0f1e, verde #1D9E75 (el mismo del
pulse-dot del indice).
"""

import os

from PIL import Image, ImageDraw

FONDO = (10, 15, 30)       # #0a0f1e
VERDE = (29, 158, 117)     # #1D9E75
DIR = os.path.dirname(os.path.abspath(__file__))

# Trazo de ECG en un lienzo normalizado de 100x100. Un latido: linea de base,
# deflexion menor, complejo QRS y vuelta a la base.
TRAZO = [
    (8, 50), (26, 50), (32, 42), (38, 50), (46, 50),
    (52, 18), (58, 78), (64, 50), (72, 50), (78, 44), (84, 50), (92, 50),
]

# Los lanzadores de Android recortan el icono "maskable" a un circulo. El
# contenido tiene que caber en el 80% central para no perder los extremos.
ESCALA_MASKABLE = 0.72


def _puntos(lado, escala):
    """Lleva el trazo normalizado a pixeles, centrado, con la escala pedida."""
    desplazamiento = lado * (1 - escala) / 2
    return [
        (x / 100 * lado * escala + desplazamiento,
         y / 100 * lado * escala + desplazamiento)
        for x, y in TRAZO
    ]


def png(lado, ruta, maskable=False, radio_relativo=0.22):
    escala = ESCALA_MASKABLE if maskable else 0.88
    # Se dibuja al cuadruple y se reduce: el trazo queda suavizado sin
    # depender de un rasterizador externo.
    f = 4
    img = Image.new("RGBA", (lado * f, lado * f), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)

    if maskable:
        # Fondo completo: el lanzador aplica su propia forma encima.
        d.rectangle([0, 0, lado * f, lado * f], fill=FONDO)
    else:
        d.rounded_rectangle(
            [0, 0, lado * f - 1, lado * f - 1],
            radius=int(lado * f * radio_relativo),
            fill=FONDO,
        )

    grosor = max(1, int(lado * f * 0.055))
    d.line(_puntos(lado * f, escala), fill=VERDE, width=grosor, joint="curve")

    img.resize((lado, lado), Image.LANCZOS).save(ruta)
    return ruta


def svg(ruta, lado=512):
    puntos = " ".join(f"{x:.1f},{y:.1f}" for x, y in _puntos(100, 0.88))
    contenido = f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="{lado}" height="{lado}" role="img" aria-label="UTI Tools">
  <rect width="100" height="100" rx="22" fill="#0a0f1e"/>
  <polyline points="{puntos}" fill="none" stroke="#1D9E75" stroke-width="5.5" stroke-linecap="round" stroke-linejoin="round"/>
</svg>
"""
    with open(ruta, "w", encoding="utf-8") as f:
        f.write(contenido)
    return ruta


if __name__ == "__main__":
    generados = [
        svg(os.path.join(DIR, "icono.svg")),
        png(180, os.path.join(DIR, "icono-180.png")),   # apple-touch-icon
        png(192, os.path.join(DIR, "icono-192.png")),   # Android
        png(512, os.path.join(DIR, "icono-512.png")),   # Android, splash
        png(512, os.path.join(DIR, "icono-512-maskable.png"), maskable=True),
        png(32, os.path.join(DIR, "favicon-32.png")),
    ]
    for ruta in generados:
        print(f"  {os.path.basename(ruta):28} {os.path.getsize(ruta):>7,} bytes")
