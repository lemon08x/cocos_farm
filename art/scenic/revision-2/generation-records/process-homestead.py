from pathlib import Path

from PIL import Image, ImageChops, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "generation-records/raw/env-homestead-raw.png"
DESTINATION = ROOT / "sources/env-homestead.png"
CANVAS_SIZE = (920, 760)
SUBJECT_WIDTH = 890
SUBJECT_TOP = 128


def is_chroma(rgb):
    red, green, blue = rgb
    return green > 190 and red < 90 and blue < 90


def main():
    image = Image.open(SOURCE).convert("RGB")
    chroma_mask = Image.new("L", image.size)
    chroma_mask.putdata([0 if is_chroma(pixel) else 255 for pixel in image.get_flattened_data()])

    feathered = chroma_mask.filter(ImageFilter.GaussianBlur(0.6))
    alpha = ImageChops.darker(chroma_mask, feathered)
    edge_band = ImageChops.subtract(chroma_mask, chroma_mask.filter(ImageFilter.MinFilter(5)))
    bounds = chroma_mask.getbbox()
    if bounds is None:
        raise ValueError("No foreground was found")

    rgba = image.convert("RGBA")
    rgba.putalpha(alpha)
    pixels = rgba.load()
    band_pixels = edge_band.load()
    for vertical in range(bounds[1], bounds[3]):
        for horizontal in range(bounds[0], bounds[2]):
            red, green, blue, opacity = pixels[horizontal, vertical]
            if band_pixels[horizontal, vertical] and green > 150 and green > red * 1.35 and green > blue * 1.4 and red < 180:
                green = min(green, max(red, blue) + 55)
                opacity = min(opacity, 230)
                pixels[horizontal, vertical] = (red, green, blue, opacity)

    subject = rgba.crop(bounds)
    subject_height = round(subject.height * SUBJECT_WIDTH / subject.width)
    subject = subject.resize((SUBJECT_WIDTH, subject_height), Image.Resampling.LANCZOS)

    canvas = Image.new("RGBA", CANVAS_SIZE, (0, 0, 0, 0))
    left = (CANVAS_SIZE[0] - SUBJECT_WIDTH) // 2
    canvas.alpha_composite(subject, (left, SUBJECT_TOP))
    canvas.save(DESTINATION)
    print(f"raw={image.size}, crop={bounds}, scaled={subject.size}, paste=({left}, {SUBJECT_TOP})")


if __name__ == "__main__":
    main()
