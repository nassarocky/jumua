"""Generate Android and iOS app icons from the master logo."""
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "assets" / "jumua-logo.png"

ANDROID_SIZES = {
    "mipmap-mdpi": 48,
    "mipmap-hdpi": 72,
    "mipmap-xhdpi": 96,
    "mipmap-xxhdpi": 144,
    "mipmap-xxxhdpi": 192,
}

IOS_ICONS = [
    ("Icon-20@2x.png", 40),
    ("Icon-20@3x.png", 60),
    ("Icon-29@2x.png", 58),
    ("Icon-29@3x.png", 87),
    ("Icon-40@2x.png", 80),
    ("Icon-40@3x.png", 120),
    ("Icon-60@2x.png", 120),
    ("Icon-60@3x.png", 180),
    ("Icon-1024.png", 1024),
]


def resize_and_save(img: Image.Image, size: int, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    resized = img.resize((size, size), Image.Resampling.LANCZOS)
    resized.save(path, "PNG", optimize=True)
    print(f"  {path.relative_to(ROOT)} ({size}x{size})")


def main() -> None:
    if not SOURCE.exists():
        raise SystemExit(f"Source logo not found: {SOURCE}")

    img = Image.open(SOURCE).convert("RGBA")
    print(f"Source: {SOURCE} ({img.size[0]}x{img.size[1]})")

    print("\nAndroid icons:")
    for folder, size in ANDROID_SIZES.items():
        base = ROOT / "android" / "app" / "src" / "main" / "res" / folder
        resize_and_save(img, size, base / "ic_launcher.png")
        resize_and_save(img, size, base / "ic_launcher_round.png")

    print("\niOS icons:")
    ios_dir = (
        ROOT / "ios" / "RnStarterMedusa" / "Images.xcassets" / "AppIcon.appiconset"
    )
    for filename, size in IOS_ICONS:
        resize_and_save(img, size, ios_dir / filename)

    print("\nDone.")


if __name__ == "__main__":
    main()
