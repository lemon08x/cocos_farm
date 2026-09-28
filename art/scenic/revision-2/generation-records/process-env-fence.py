from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[3]
RAW = ROOT / "scenic/revision-2/generation-records/raw/env-fence-raw.png"
FINAL = ROOT / "scenic/revision-2/sources/env-fence.png"


def process() -> None:
    if FINAL.exists():
        raise FileExistsError(f"Refusing to overwrite existing asset: {FINAL}")

    image = Image.open(RAW).convert("RGBA")
    pixels = image.load()
    for row in range(image.height):
        for column in range(image.width):
            red, green, blue, alpha = pixels[column, row]
            if alpha <= 3 or (green > 190 and red < 90 and blue < 90):
                pixels[column, row] = (0, 0, 0, 0)
                continue
            if alpha < 80 and green > 160 and red < 110 and blue < 110:
                alpha = round(alpha * max(0, (255 - green) / 95))
            if alpha < 200 and green > 120 and green > 1.3 * max(red, blue):
                green = min(green, round(1.1 * max(red, blue)))
            pixels[column, row] = (red, green, blue, alpha)

    mask = image.getchannel("A").point(lambda alpha: 255 if alpha >= 8 else 0)
    bounds = mask.getbbox()
    if bounds is None:
        raise ValueError("No visible fence pixels in the raw image")

    crop = image.crop(bounds)
    target_width = 512
    target_height = round(crop.height * target_width / crop.width)
    if target_height > 116:
        raise ValueError(f"Fence too tall for target: {target_height}")
    fence = crop.resize((target_width, target_height), Image.Resampling.LANCZOS)
    canvas = Image.new("RGBA", (520, 120), (0, 0, 0, 0))
    position = (4, 2)
    canvas.alpha_composite(fence, position)
    FINAL.parent.mkdir(parents=True, exist_ok=True)
    canvas.save(FINAL)
    print(f"raw={image.size} crop={bounds} resized={fence.size} position={position}")


if __name__ == "__main__":
    process()
