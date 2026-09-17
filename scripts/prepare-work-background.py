"""Prepare the work-only star crop and fixed project ambient-light palettes.

Technical crop, Lanczos resize, and high-fidelity JPEG export only. The supplied
2022 original and all existing hero exports remain unchanged. Star coordinates
come from the verified original-photo catalog, never synthetic star positions.
Run with Python + Pillow; no runtime image analysis is required.
"""
from pathlib import Path
from hashlib import sha256
import colorsys
import json
import re
from PIL import Image, ImageOps, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / '内容资料/03_摄影与平面设计合集/摄影/首页背景原图/201A3976.jpg'
OUTPUT = ROOT / 'public/v-next/work-background'
CATALOG = ROOT / 'public/v-next/background/star-points.json'
WIDTHS = (1536, 2560, 3072, 4096)
CROP = (0, 0, 8192, 3000)
ORDER = ('psytrain', 'shotflow', 'introme', 'hypnos-cockpit', 'deal-points', 'orbit', 'cyber-city', 'crystal-city', 'last-one', 'gala-x-ci-vr-gallery')


def digest(path):
    return sha256(path.read_bytes()).hexdigest()


def write_json(name, value):
    (OUTPUT / name).write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n')


def muted(rgb):
    """Preserve measured hue; reduce saturation and keep light-source energy useful."""
    hue, saturation, value = colorsys.rgb_to_hsv(*(channel / 255 for channel in rgb))
    saturation = min(.48, saturation * .62)
    value = max(.56, min(.74, value))
    return [round(channel * 255) for channel in colorsys.hsv_to_rgb(hue, saturation, value)]


def palette_for(path):
    with Image.open(path) as source:
        image = source.convert('RGB')
        image.thumbnail((384, 384), Image.Resampling.LANCZOS)
        # Count colors on a proxy to omit expensive analysis from the browser.
        quantized = image.quantize(colors=64, method=Image.Quantize.MEDIANCUT)
        table = quantized.getpalette()
        clusters = []
        for count, index in quantized.getcolors():
            rgb = table[index * 3:index * 3 + 3]
            hue, saturation, value = colorsys.rgb_to_hsv(*(c / 255 for c in rgb))
            if .12 <= value <= .96:
                clusters.append(dict(count=count, rgb=rgb, hue=hue, saturation=saturation, value=value))
        accent = [c for c in clusters if c['saturation'] >= .075]
        # Summing nearby hues keeps a large blue region split by shading together.
        bins = {}
        for color in accent:
            bucket = int(color['hue'] * 18) % 18
            bins.setdefault(bucket, []).append(color)
        groups = []
        for bucket, colors in bins.items():
            weights = [c['count'] * c['saturation'] ** .7 for c in colors]
            score = sum(weights)
            rgb = [round(sum(c['rgb'][j] * w for c, w in zip(colors, weights)) / score) for j in range(3)]
            groups.append(dict(rgb=rgb, hue=colorsys.rgb_to_hsv(*(c/255 for c in rgb))[0], score=score))
        groups.sort(key=lambda item: item['score'], reverse=True)
        if groups:
            primary = groups[0]
            remaining = [g for g in groups[1:] if min(abs(g['hue']-primary['hue']), 1-abs(g['hue']-primary['hue'])) >= .09]
            # A genuine second hue if present; otherwise use a measured neutral.
            second = next((g for g in remaining if g['score'] >= primary['score'] * .075), None)
        else:
            primary, second = None, None
        neutral = sorted((c for c in clusters if c['saturation'] < .075), key=lambda c: c['count'], reverse=True)
        fallback = neutral[0]['rgb'] if neutral else max(clusters, key=lambda c: c['count'])['rgb']
        raw_primary = primary['rgb'] if primary else fallback
        raw_secondary = second['rgb'] if second else fallback
        return {
            'primary': muted(raw_primary), 'secondary': muted(raw_secondary),
            'source': '/' + str(path.relative_to(ROOT / 'public')),
            'sourceSha256': digest(path),
            'extracted': {'primary': raw_primary, 'secondary': raw_secondary},
            'method': '64-color median-cut proxy; omit black/white backplates; saturation-weighted hue groups; retain a distinct measured secondary hue or measured neutral; HSV saturation x0.62 capped 0.48, value clamped 0.56–0.74.',
        }


def main():
    OUTPUT.mkdir(parents=True, exist_ok=True)
    before = digest(SOURCE)
    existing = {str(path): digest(path) for path in (ROOT / 'public/v-next/background').glob('*') if path.is_file()}
    catalog = json.loads(CATALOG.read_text())
    assert before == catalog['source']['sha256'], 'Photo changed; review crop and catalog first'
    with Image.open(SOURCE) as original:
        photo = ImageOps.exif_transpose(original).convert('RGB')
        assert photo.size == (8192, 5464)
        crop = photo.crop(CROP)
        icc = original.info.get('icc_profile', b'')
        variants = []
        for width in WIDTHS:
            height = round(crop.height * width / crop.width)
            path = OUTPUT / f'stars-{width}.jpg'
            crop.resize((width, height), Image.Resampling.LANCZOS).save(path, 'JPEG', quality=98, subsampling=0, optimize=True, icc_profile=icc)
            variants.append({'url': f'/v-next/work-background/{path.name}', 'width': width, 'height': height, 'bytes': path.stat().st_size, 'sha256': digest(path)})
        write_json('provenance.json', {
            'source': str(SOURCE.relative_to(ROOT)), 'sourceSha256': before,
            'sourceWidth': photo.width, 'sourceHeight': photo.height,
            'width': crop.width, 'height': crop.height,
            'crop': {'x': CROP[0], 'y': CROP[1], 'width': crop.width, 'height': crop.height},
            'colorSpace': 'sRGB', 'variants': variants,
            'processing': 'Top 3000 rows of the EXIF-oriented 8192×5464 source, avoiding the silhouette below. Proportional Lanczos resize; JPEG quality 98, 4:4:4, original ICC. No exposure, saturation, grading or sharpening changes. Section brightness is controlled separately at display time.',
            'originalPreserved': True, 'heroExportsPreserved': True,
        })
        points = []
        for source_star in catalog['points']:
            # Catalog centroid x/y is authoritative; retain full precision UVs for
            # affine crop mapping and resize. Pixel-center origin is unchanged.
            x, y = source_star['x'] - CROP[0], source_star['y'] - CROP[1]
            margin = max(8, source_star['radiusPx'] * 3)
            if not (margin <= x < crop.width - margin and margin <= y < crop.height - margin):
                continue
            star = dict(source_star)
            star.update(x=x, y=y, u=(x+.5)/crop.width, v=(y+.5)/crop.height)
            star['original'] = {key: source_star[key] for key in ('x', 'y', 'u', 'v')}
            points.append(star)
        write_json('star-points.json', {
            'version': 1, 'source': {'path': str(SOURCE.relative_to(ROOT)), 'sha256': before, 'width': crop.width, 'height': crop.height, 'originalWidth': photo.width, 'originalHeight': photo.height, 'crop': {'x':0, 'y':0, 'width':crop.width, 'height':crop.height}, 'colorSpace':'sRGB'},
            'coordinateSystem': 'top-left pixel centers in cropped photograph; u=(x+0.5)/width, v=(y+0.5)/height. Cover mapping must use the actual decoded derivative dimensions.',
            'derivedFrom': '/v-next/background/star-points.json',
            'catalogSha256': digest(CATALOG), 'count': len(points), 'points': points,
        })
    text = (ROOT / 'src/portfolioData.ts').read_text()
    paths = dict(re.findall(r'''["']?slug["']?\s*:\s*["']([^"']+)["'][\s\S]*?["']?image["']?\s*:\s*["']([^"']+)["']''', text))
    palettes = {slug: palette_for(ROOT / 'public' / paths[slug].lstrip('/')) for slug in ORDER}
    write_json('palettes.json', palettes)
    # Compact review sheet only; not loaded by the website.
    sheet = Image.new('RGB', (1200, 210 * ((len(ORDER) + 1) // 2)), '#15171c')
    draw = ImageDraw.Draw(sheet)
    for i, (slug, palette) in enumerate(palettes.items()):
        x, y = (i % 2)*600, (i//2)*210
        with Image.open(ROOT / 'public' / palette['source'].lstrip('/')) as source:
            thumb = ImageOps.contain(source.convert('RGB'), (360, 174), Image.Resampling.LANCZOS)
            sheet.paste(thumb, (x + 12, y + 26))
        draw.text((x+12, y+7), slug, fill='white')
        for j, key in enumerate(('primary', 'secondary')):
            draw.rectangle((x+390, y+30+j*80, x+565, y+100+j*80), fill=tuple(palette[key]))
            draw.text((x+394,y+33+j*80), key, fill='white')
    sheet.save(OUTPUT/'palette-review.jpg', quality=95, subsampling=0)
    assert before == digest(SOURCE), 'Original changed unexpectedly'
    assert all(digest(Path(path)) == value for path, value in existing.items()), 'Existing hero asset changed'
    assert all(0 < p['u'] < 1 and 0 < p['v'] < 1 for p in points)
    assert len(palettes) == len(ORDER)
    print(json.dumps({'originalUnchanged':True,'heroUnchanged':True,'crop':CROP,'points':len(points),'variants':variants,'palettes':palettes}, ensure_ascii=False,indent=2))


if __name__ == '__main__':
    main()
