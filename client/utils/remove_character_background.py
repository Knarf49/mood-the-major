from __future__ import annotations

import argparse
from pathlib import Path

from PIL import Image


def is_edge_background(pixel: tuple[int, int, int, int], threshold: int) -> bool:
    red, green, blue, alpha = pixel
    if alpha == 0:
        return True
    return red >= threshold and green >= threshold and blue >= threshold


def background_mask(image: Image.Image, threshold: int) -> bytearray:
    rgba = image.convert("RGBA")
    width, height = rgba.size
    pixels = rgba.load()
    mask = bytearray(width * height)
    stack: list[int] = []

    def enqueue(x: int, y: int):
        index = y * width + x
        if mask[index] or not is_edge_background(pixels[x, y], threshold):
            return
        mask[index] = 1
        stack.append(index)

    for x in range(width):
        enqueue(x, 0)
        enqueue(x, height - 1)
    for y in range(1, height - 1):
        enqueue(0, y)
        enqueue(width - 1, y)

    while stack:
        index = stack.pop()
        x = index % width
        y = index // width

        if x > 0:
            enqueue(x - 1, y)
        if x + 1 < width:
            enqueue(x + 1, y)
        if y > 0:
            enqueue(x, y - 1)
        if y + 1 < height:
            enqueue(x, y + 1)

    return mask


def clean_image(source: Path, output: Path, size: int = 128, threshold: int = 245, padding: int = 4) -> None:
    image = Image.open(source).convert("RGBA")
    width, height = image.size
    pixels = image.load()
    mask = background_mask(image, threshold)

    for index, remove in enumerate(mask):
        if remove:
            x = index % width
            y = index // width
            red, green, blue, _alpha = pixels[x, y]
            pixels[x, y] = (red, green, blue, 0)

    box = image.getchannel("A").getbbox()
    output.parent.mkdir(parents=True, exist_ok=True)
    if box is None:
        Image.new("RGBA", (size, size), (0, 0, 0, 0)).save(output)
        return

    character = image.crop(box)
    max_content_size = max(1, size - padding * 2)
    character.thumbnail((max_content_size, max_content_size), Image.Resampling.LANCZOS)

    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    x = (size - character.width) // 2
    y = (size - character.height) // 2
    canvas.paste(character, (x, y), character)
    canvas.save(output)


def process_directory(source_root: Path, output_root: Path, size: int = 128, threshold: int = 245, padding: int = 4) -> int:
    count = 0
    for source in sorted(source_root.rglob("*.png")):
        relative = source.relative_to(source_root)
        clean_image(source, output_root / relative, size=size, threshold=threshold, padding=padding)
        count += 1
    return count


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Remove edge-connected white background from character frames.")
    parser.add_argument("--input", type=Path, default=Path("client/assets/chracter"))
    parser.add_argument("--output", type=Path, default=Path("client/assets/chracter_clean"))
    parser.add_argument("--size", type=int, default=128)
    parser.add_argument("--threshold", type=int, default=245)
    parser.add_argument("--padding", type=int, default=4)
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    count = process_directory(args.input, args.output, size=args.size, threshold=args.threshold, padding=args.padding)
    print(f"Wrote {count} cleaned frame(s) to {args.output}")


if __name__ == "__main__":
    main()
