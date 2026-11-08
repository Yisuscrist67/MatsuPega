"""Genera los íconos de la app (PNG) sin librerías externas.

Uso (desde la carpeta del proyecto):
    python icons/generar_iconos.py

Dibuja una cámara de fotos clara sobre el color óxido de la app.
Solo hace falta volver a correrlo si se quiere cambiar el diseño.
"""
import math
import os
import struct
import zlib

AQUI = os.path.dirname(os.path.abspath(__file__))

FONDO = (0x0F, 0x1C, 0x1F)   # fondo oscuro de la página
OXIDO = (0xC1, 0x54, 0x1C)   # --rust
CLARO = (0xEF, 0xE7, 0xD6)   # --ink


def sd_caja_redondeada(px, py, cx, cy, hx, hy, r):
    qx = abs(px - cx) - (hx - r)
    qy = abs(py - cy) - (hy - r)
    ox, oy = max(qx, 0.0), max(qy, 0.0)
    return math.hypot(ox, oy) + min(max(qx, qy), 0.0) - r


def sd_circulo(px, py, cx, cy, r):
    return math.hypot(px - cx, py - cy) - r


def camara(u, v):
    """Capas de la cámara en coordenadas 0..1. Devuelve [(distancia, color)]."""
    return [
        (sd_caja_redondeada(u, v, 0.37, 0.30, 0.10, 0.07, 0.03), CLARO),   # visor
        (sd_caja_redondeada(u, v, 0.50, 0.55, 0.34, 0.23, 0.07), CLARO),   # cuerpo
        (sd_circulo(u, v, 0.50, 0.56, 0.155), FONDO),                       # lente
        (sd_circulo(u, v, 0.50, 0.56, 0.095), OXIDO),                       # vidrio
        (sd_circulo(u, v, 0.74, 0.42, 0.028), FONDO),                       # flash
    ]


def mezclar(a, b, t):
    return tuple(a[i] + (b[i] - a[i]) * t for i in range(len(a)))


def dibujar(tam, completo):
    """completo=True: fondo óxido de borde a borde (maskable / iPhone).
    completo=False: cuadrado óxido con esquinas redondeadas y fondo transparente."""
    escala_glifo = 0.62 if completo else 0.70
    filas = []
    for y in range(tam):
        fila = bytearray()
        for x in range(tam):
            u = (x + 0.5) / tam
            v = (y + 0.5) / tam
            px1 = 1.0 / tam  # tamaño de un pixel, para suavizar bordes
            if completo:
                color = OXIDO + (255,)
            else:
                d = sd_caja_redondeada(u, v, 0.5, 0.5, 0.46, 0.46, 0.11)
                a = min(max(0.5 - d / px1, 0.0), 1.0)
                color = OXIDO + (255 * a,)
            gu = (u - 0.5) / escala_glifo + 0.5
            gv = (v - 0.5) / escala_glifo + 0.5
            for d, c in camara(gu, gv):
                t = min(max(0.5 - d * escala_glifo / px1, 0.0), 1.0)
                if t > 0:
                    alfa = color[3] + (255 - color[3]) * t
                    rgb = mezclar(color[:3], c, t if color[3] else 1.0)
                    color = rgb + (alfa,)
            fila += bytes(int(round(min(max(ch, 0), 255))) for ch in color)
        filas.append(bytes(fila))
    return filas


def guardar_png(ruta, filas, tam):
    raw = b"".join(b"\x00" + f for f in filas)

    def trozo(tipo, datos):
        c = tipo + datos
        return struct.pack(">I", len(datos)) + c + struct.pack(">I", zlib.crc32(c) & 0xFFFFFFFF)

    png = b"\x89PNG\r\n\x1a\n"
    png += trozo(b"IHDR", struct.pack(">IIBBBBB", tam, tam, 8, 6, 0, 0, 0))
    png += trozo(b"IDAT", zlib.compress(raw, 9))
    png += trozo(b"IEND", b"")
    with open(ruta, "wb") as f:
        f.write(png)


if __name__ == "__main__":
    for nombre, tam, completo in [
        ("icon-192.png", 192, False),
        ("icon-512.png", 512, False),
        ("icon-maskable-512.png", 512, True),
        ("apple-touch-icon.png", 180, True),
    ]:
        guardar_png(os.path.join(AQUI, nombre), dibujar(tam, completo), tam)
        print("listo:", nombre)
