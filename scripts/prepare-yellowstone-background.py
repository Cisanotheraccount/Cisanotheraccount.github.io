"""Prepare the user-supplied Yellowstone photograph for the work background.

Run with Pillow + NumPy. The private original is never changed or published.
This script owns only the yellowstone/ derivatives and its local review output;
it never regenerates hero assets, old work catalogs, or project palettes.
"""
from pathlib import Path
from hashlib import sha256
import importlib.util
import io
import json
import math
from PIL import Image, ImageOps, ImageCms, ImageFilter, ImageDraw
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / '内容资料/03_摄影与平面设计合集/摄影/作品区背景原图/_25A6448.jpg'
OUTPUT = ROOT / 'public/v-next/work-background/yellowstone'
REVIEW = ROOT / 'v-next/review/yellowstone-work-v21'
CROP = dict(x=0, y=1500, width=5464, height=3900)
WIDTHS = (1536, 1920, 2560, 3072, 4096)
JPEG_QUALITY = 95
TARGET = 350
GRID = (14, 10)
MIN_DISTANCE = 40
EXPECTED_SOURCE_SHA = 'b65272f302a58cf6ebcad0fee757e272445e8caaaae1b7e7b6a99587737e7e5d'

SPEC = importlib.util.spec_from_file_location('star_measurement', ROOT / 'scripts/extract-hero-stars.py')
measurement = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(measurement)  # Helpers only; source-specific main/masks are not called.


def digest(path):
    return sha256(path.read_bytes()).hexdigest()


def write_json(path, value):
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n')


def visible_count(points, vw, vh):
    scale = max(vw / CROP['width'], vh / CROP['height'])
    w, h = CROP['width'] * scale, CROP['height'] * scale
    left, top = (vw - w) / 2, (vh - h) / 2
    return sum(8 < left + p['u'] * w < vw - 8 and 8 < top + p['v'] * h < vh - 8 for p in points)


def main():
    OUTPUT.mkdir(parents=True, exist_ok=True)
    REVIEW.mkdir(parents=True, exist_ok=True)
    source_hash = digest(SOURCE)
    assert source_hash == EXPECTED_SOURCE_SHA, 'New source supplied; review the crop before regeneration'
    protected = {p: digest(p) for folder in ('background', 'work-background')
                 for p in (ROOT / 'public/v-next' / folder).rglob('*')
                 if p.is_file() and OUTPUT not in p.parents}
    with Image.open(SOURCE) as original:
        icc = original.info.get('icc_profile', b'')
        profile = ImageCms.getProfileDescription(ImageCms.ImageCmsProfile(io.BytesIO(icc))).strip()
        assert 'sRGB' in profile, f'Expected source sRGB, found {profile}'
        photo = ImageOps.exif_transpose(original).convert('RGB')
        assert photo.size == (5464, 8192)
    crop = photo.crop((CROP['x'], CROP['y'], CROP['x'] + CROP['width'], CROP['y'] + CROP['height']))
    variants = []
    for width in WIDTHS:
        height = round(crop.height * width / crop.width)
        path = OUTPUT / f'yellowstone-{width}.jpg'
        crop.resize((width, height), Image.Resampling.LANCZOS).save(
            path, 'JPEG', quality=JPEG_QUALITY, subsampling=0, optimize=True, icc_profile=icc)
        with Image.open(path) as exported:
            assert exported.size == (width, height) and not dict(exported.getexif()), 'Unexpected export dimensions or EXIF'
            assert exported.info.get('icc_profile') == icc
        variants.append(dict(url=f'/v-next/work-background/yellowstone/{path.name}', width=width,
                             height=height, bytes=path.stat().st_size, sha256=digest(path)))
    provenance = dict(source=SOURCE.name, sourceSha256=source_hash, sourceBytes=SOURCE.stat().st_size,
        sourceWidth=photo.width, sourceHeight=photo.height, width=crop.width, height=crop.height,
        crop=CROP, colorSpace='sRGB', profile=profile, variants=variants,
        encoding=dict(format='JPEG', quality=JPEG_QUALITY, subsampling='4:4:4', originalICC=True, exif=False),
        processing='Pure-sky crop x=0, y=1500, width=5464, height=3900 of the EXIF-oriented original; '
                   'excludes the car, trees and terrestrial horizon. Proportional Lanczos resize; JPEG quality 95, '
                   '4:4:4 and original sRGB ICC. No exposure, saturation, grading, sharpening or blur changes. '
                   'EXIF/GPS metadata is omitted from public derivatives. Background opacity is controlled separately at display time.',
        originalPreserved=True, heroExportsPreserved=True, previousWorkExportsPreserved=True)
    write_json(OUTPUT / 'provenance.json', provenance)

    proxy = crop.resize((2048, round(crop.height * 2048 / crop.width)), Image.Resampling.LANCZOS)
    lum = measurement.luminance(proxy)
    contrast = lum - measurement.luminance(proxy.filter(ImageFilter.GaussianBlur(3)))
    maxima = np.ones(lum.shape, dtype=bool)
    for dy in range(-2, 3):
        for dx in range(-2, 3):
            if dy or dx:
                maxima &= lum > np.roll(np.roll(lum, dy, axis=0), dx, axis=1)
    maxima &= (lum > .07) & (contrast > .035)
    maxima[:8] = maxima[-8:] = False
    maxima[:, :8] = maxima[:, -8:] = False
    ys, xs = np.where(maxima)
    scores = contrast[ys, xs] * np.sqrt(lum[ys, xs])
    candidates = []
    for index in np.argsort(scores)[::-1][:8000]:
        x = (float(xs[index]) + .5) * crop.width / proxy.width - .5
        y = (float(ys[index]) + .5) * crop.height / proxy.height - .5
        point = measurement.measure_star(crop, x, y)
        if not point or point['contrast'] < .085 or not .85 <= point['radiusPx'] <= 6.5:
            continue
        if point['mass'] < 1.2 or point['elongation'] > 3:
            continue
        if not (24 < point['x'] < crop.width - 24 and 24 < point['y'] < crop.height - 24):
            continue
        point['score'] = point['contrast'] * math.sqrt(point['mass'])
        candidates.append(point)
    cells = {(x, y): [] for y in range(GRID[1]) for x in range(GRID[0])}
    for point in sorted(candidates, key=lambda p: p['score'], reverse=True):
        cell = (min(GRID[0] - 1, int(point['x'] / crop.width * GRID[0])),
                min(GRID[1] - 1, int(point['y'] / crop.height * GRID[1])))
        cells[cell].append(point)
    selected = []
    for _ in range(6):
        for cell in cells.values():
            while cell:
                point = cell.pop(0)
                if all((p['x'] - point['x']) ** 2 + (p['y'] - point['y']) ** 2 >= MIN_DISTANCE ** 2 for p in selected):
                    selected.append(point)
                    break
            if len(selected) == TARGET:
                break
        if len(selected) == TARGET:
            break
    assert len(selected) == TARGET, f'Only {len(selected)} stars passed; inspect before lowering limits'
    selected.sort(key=lambda p: (int(p['y'] / crop.height * GRID[1]), p['x']))
    lo, hi = min(p['score'] for p in selected), max(p['score'] for p in selected)
    points = []
    for index, point in enumerate(selected):
        x, y = round(point['x'], 5), round(point['y'], 5)
        original_x, original_y = x + CROP['x'], y + CROP['y']
        points.append(dict(id=f'yellowstone-star-{index + 1:03}', x=x, y=y,
            u=round((x + .5) / crop.width, 12), v=round((y + .5) / crop.height, 12),
            original=dict(x=original_x, y=original_y, u=(original_x + .5) / photo.width, v=(original_y + .5) / photo.height),
            luminance=round(point['luminance'], 5), contrast=round(point['contrast'], 5),
            color=[round(channel, 5) for channel in point['color']], radiusPx=round(point['radiusPx'], 4),
            strength=round(.55 + .45 * math.sqrt((point['score'] - lo) / max(hi - lo, .00001)), 5)))
    catalog = dict(version=1, source=dict(path=SOURCE.name, sha256=source_hash, width=crop.width, height=crop.height,
        originalWidth=photo.width, originalHeight=photo.height, crop=CROP, colorSpace='sRGB'),
        coordinateSystem='Top-left pixel centers in cropped photograph; u=(x+0.5)/width, v=(y+0.5)/height. '
                         'Original coordinates include the crop offset. Runtime cover mapping uses decoded derivative dimensions.',
        count=len(points), points=points,
        algorithm=dict(reusedMeasurement='scripts/extract-hero-stars.py: measure_star and luminance helpers only; no old-photo masks or main',
            detection='2048px Lanczos proxy; strict 5x5 local maxima; sigma=3px local contrast',
            acceptance=dict(minProxyLuminance=.07, minProxyContrast=.035, minSourceContrast=.085,
                minCoreMass=1.2, sourceRadiusRange=[.85, 6.5], maxElongation=3),
            selection=dict(grid=list(GRID), sourceDistancePx=MIN_DISTANCE, target=TARGET,
                method='Round-robin strongest remaining candidate by grid cell'),
            exclusions='Pure-sky crop excludes all terrestrial objects; no hero-source person/streak masks reused',
            photometry='Measured source star centroids and sRGB samples; no arbitrary star positions'))
    write_json(OUTPUT / 'star-points.json', catalog)

    # These annotated/contact images stay in ignored local review, not public/.
    overview = crop.copy()
    overview.thumbnail((1400, 1400), Image.Resampling.LANCZOS)
    draw = ImageDraw.Draw(overview)
    for point in points:
        x, y = point['u'] * overview.width, point['v'] * overview.height
        draw.ellipse((x - 2, y - 2, x + 2, y + 2), outline='#fcce60')
    overview.save(REVIEW / 'measured-stars-overview.jpg', quality=95, subsampling=0)
    samples = [points[round(i * (len(points) - 1) / 23)] for i in range(24)]
    sheet = Image.new('RGB', (1200, 4 * 215), '#111317')
    draw = ImageDraw.Draw(sheet)
    for i, point in enumerate(samples):
        left, top = i % 6 * 200, i // 6 * 215
        x, y = round(point['x']), round(point['y'])
        tile = crop.crop((x - 24, y - 24, x + 25, y + 25)).resize((196, 196), Image.Resampling.NEAREST)
        marker = ImageDraw.Draw(tile)
        cx, cy = (point['x'] - (x - 24) + .5) * 4, (point['y'] - (y - 24) + .5) * 4
        marker.line((cx - 8, cy, cx + 8, cy), fill='#ffd065', width=1)
        marker.line((cx, cy - 8, cx, cy + 8), fill='#ffd065', width=1)
        sheet.paste(tile, (left + 2, top + 18))
        draw.text((left + 3, top + 2), point['id'], fill='white')
    sheet.save(REVIEW / 'star-centroid-contact-sheet.jpg', quality=95, subsampling=0)
    scenarios = [dict(viewport=[w, h], visibleCandidates=visible_count(points, w, h))
                 for w, h in ((1440, 1000), (768, 1000), (390, 844), (844, 390))]
    unchanged = {str(path.relative_to(ROOT)): digest(path) == before for path, before in protected.items()}
    assert all(unchanged.values()) and digest(SOURCE) == source_hash
    report = dict(sourceFile=SOURCE.name, sourceSha256=source_hash, originalUnchanged=True,
        sourceICC=profile, crop=CROP, variants=variants, measuredCandidates=len(candidates), catalogCount=len(points),
        scenarios=scenarios, acceptance=catalog['algorithm']['acceptance'],
        measuredRanges=dict(contrast=[min(p['contrast'] for p in selected), max(p['contrast'] for p in selected)],
            radiusPx=[min(p['radiusPx'] for p in selected), max(p['radiusPx'] for p in selected)],
            elongation=[min(p['elongation'] for p in selected), max(p['elongation'] for p in selected)]),
        preservedFiles=unchanged, catalogSha256=digest(OUTPUT / 'star-points.json'),
        publicExportsHaveNoEXIF=True, originalICCBytesRetained=True)
    write_json(REVIEW / 'extraction-report.json', report)
    print(json.dumps({key: value for key, value in report.items() if key != 'preservedFiles'}, indent=2))


if __name__ == '__main__':
    main()
