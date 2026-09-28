from pathlib import Path
from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / "generation-records/raw/env-signpost-raw.png"
OUTPUT = ROOT / "sources/env-signpost.png"
CANVAS = (240, 320)
SUBJECT_HEIGHT = 286
SUBJECT_BOTTOM = 294


def remove_key_and_despill(image):
    pixels = []
    keyed = 0
    despilled = 0
    for red, green, blue, alpha in image.getdata():
        if alpha < 16:
            pixels.append((0, 0, 0, 0))
            continue
        if green > 190 and red < 90 and blue < 90:
            distance = (red * red + (255 - green) ** 2 + blue * blue) ** 0.5
            alpha = round(alpha * min(1, max(0, (distance - 30) / 70)))
            keyed += 1
        if alpha < 225 and green > red * 1.65 and green > blue * 1.25 and red < 100 and blue < 100:
            green = min(green, round(max(red * 1.4, blue * 1.2, 30)))
            despilled += 1
        pixels.append((red, green, blue, alpha))
    result = Image.new("RGBA", image.size)
    result.putdata(pixels)
    return result, keyed, despilled


def main():
    if OUTPUT.exists():
        raise FileExistsError(f"Refusing to overwrite {OUTPUT}")
    image, keyed, despilled = remove_key_and_despill(Image.open(RAW).convert("RGBA"))
    alpha = image.getchannel("A")
    bounds = alpha.point(lambda value: 255 if value >= 16 else 0).getbbox()
    if bounds is None:
        raise ValueError("No subject remains after keying")
    cropped = image.crop(bounds)
    scale = min(SUBJECT_HEIGHT / cropped.height, (CANVAS[0] - 12) / cropped.width)
    size = (round(cropped.width * scale), round(cropped.height * scale))
    subject = cropped.resize(size, Image.Resampling.LANCZOS)
    position = ((CANVAS[0] - size[0]) // 2, SUBJECT_BOTTOM - size[1])
    canvas = Image.new("RGBA", CANVAS, (0, 0, 0, 0))
    canvas.alpha_composite(subject, position)
    canvas.save(OUTPUT)
    print(f"raw={image.size}, crop={bounds}, key_pixels={keyed}, despill_pixels={despilled}")
    print(f"scale={scale:.6f}, resized={size}, position={position}, final={CANVAS}")


if __name__ == "__main__":
    main()
