#!/usr/bin/env python3
"""Write PNG home-screen icons that iOS and Android will accept."""

from __future__ import annotations

import struct
import zlib
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1] / "public"


def png(size: int, rgba: list[tuple[int, int, int, int]]) -> bytes:
    def chunk(tag: bytes, data: bytes) -> bytes:
        return struct.pack(">I", len(data)) + tag + data + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)

    raw = b"".join(b"\x00" + b"".join(struct.pack("BBBB", *px) for px in rgba[y * size : (y + 1) * size]) for y in range(size))
    return b"".join(
        [
            b"\x89PNG\r\n\x1a\n",
            chunk(b"IHDR", struct.pack(">IIBBBBB", size, size, 8, 6, 0, 0, 0)),
            chunk(b"IDAT", zlib.compress(raw, 9)),
            chunk(b"IEND", b""),
        ]
    )


def pixel(size: int, x: int, y: int) -> tuple[int, int, int, int]:
    pad = int(size * 0.08)
    radius = int(size * 0.22)
    if x < pad or y < pad or x >= size - pad or y >= size - pad:
        return (7, 20, 14, 255)
    rx, ry = x - pad, y - pad
    inner = size - pad * 2
    if (rx < radius and ry < radius and (rx - radius) ** 2 + (ry - radius) ** 2 > radius**2) or (
        rx > inner - radius - 1
        and ry < radius
        and (rx - (inner - radius - 1)) ** 2 + (ry - radius) ** 2 > radius**2
    ) or (
        rx < radius
        and ry > inner - radius - 1
        and (rx - radius) ** 2 + (ry - (inner - radius - 1)) ** 2 > radius**2
    ) or (
        rx > inner - radius - 1
        and ry > inner - radius - 1
        and (rx - (inner - radius - 1)) ** 2 + (ry - (inner - radius - 1)) ** 2 > radius**2
    ):
        return (7, 20, 14, 255)

    plate_top = int(size * 0.34)
    plate_bot = int(size * 0.66)
    plate_left = int(size * 0.18)
    plate_right = int(size * 0.82)
    if plate_left <= x <= plate_right and plate_top <= y <= plate_bot:
        return (61, 220, 132, 255)
    return (16, 48, 32, 255)


def write(name: str, size: int) -> None:
    pixels = [pixel(size, x, y) for y in range(size) for x in range(size)]
    (ROOT / name).write_bytes(png(size, pixels))
    print(f"wrote public/{name} ({size}x{size})")


def main() -> None:
    ROOT.mkdir(exist_ok=True)
    write("apple-touch-icon.png", 180)
    write("icon-192.png", 192)
    write("icon-512.png", 512)


if __name__ == "__main__":
    main()
