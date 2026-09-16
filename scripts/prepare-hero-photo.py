"""Create the v-next responsive photograph; leave the supplied original untouched.

Run with Python + Pillow. This is technical resizing/encoding only: no exposure,
color grading, sharpening, or creative cropping is applied. JPEG 4:4:4 keeps the
small blue/yellow star colors that lossy WebP chroma subsampling suppressed.
Existing WebP exports remain available for comparison and rollback.
"""
from pathlib import Path
from hashlib import sha256
import json
from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / '内容资料/03_摄影与平面设计合集/摄影/首页背景原图/201A3976.jpg'
OUTPUT = ROOT / 'public/v-next/background'
WIDTHS = (1536, 2560, 3072, 4096)


def digest(path):
    return sha256(path.read_bytes()).hexdigest()


def main():
    OUTPUT.mkdir(parents=True, exist_ok=True)
    before = digest(SOURCE)
    with Image.open(SOURCE) as original:
        photo = ImageOps.exif_transpose(original).convert('RGB')
        icc = original.info.get('icc_profile', b'')
        derivatives = []
        for width in WIDTHS:
            height = round(photo.height * width / photo.width)
            path = OUTPUT / f'stars-{width}.jpg'
            photo.resize((width, height), Image.Resampling.LANCZOS).save(
                path, 'JPEG', quality=98, subsampling=0, optimize=True, icc_profile=icc)
            derivatives.append({'url': f'/v-next/background/{path.name}',
                                'width': width, 'height': height,
                                'bytes': path.stat().st_size, 'sha256': digest(path)})
        manifest = {
            'source': str(SOURCE.relative_to(ROOT)), 'sourceSha256': before,
            'sourceBytes': SOURCE.stat().st_size,
            'width': photo.width, 'height': photo.height, 'colorSpace': 'sRGB',
            'processing': 'EXIF orientation, proportional Lanczos resize, JPEG quality 98 with 4:4:4 color sampling and original sRGB ICC. No exposure, color grade, sharpening or creative crop. Original and previous WebP exports preserved.',
            'encoding': {'format': 'JPEG', 'quality': 98, 'subsampling': '4:4:4', 'optimized': True},
            'colorValidation': 'v-next/review/meteors-color-v4/encoding-report.json',
            'derivatives': derivatives,
        }
    assert before == digest(SOURCE), 'Source file changed unexpectedly'
    (OUTPUT / 'provenance.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps(manifest, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()
