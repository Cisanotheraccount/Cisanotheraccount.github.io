"""Extract supplemental real stars for the existing top-3000px work photograph.

Requires Pillow and NumPy. Run with the bundled Python runtime from any directory.
The original 97-point work catalogue, hero catalogue and all photos are read-only.
Only the extra JSON and ignored technical review images/reports are written.
"""
from pathlib import Path
import importlib.util
import json
import math
from PIL import Image, ImageOps, ImageFilter, ImageDraw
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
MODULE_SPEC = importlib.util.spec_from_file_location('hero_star_measurement', ROOT / 'scripts/extract-hero-stars.py')
measurement = importlib.util.module_from_spec(MODULE_SPEC)
MODULE_SPEC.loader.exec_module(measurement)  # Imports helpers; never invokes its main().
SOURCE = measurement.SOURCE
BASE = ROOT / 'public/v-next/work-background/star-points.json'
PROVENANCE = BASE.parent / 'provenance.json'
OUTPUT = BASE.parent / 'star-points-extra.json'
REVIEW = ROOT / 'v-next/review/star-visibility-v18/extraction'
TARGET = 420
GRID = (16, 6)
MIN_DISTANCE = 36
MAX_PER_CELL = 6


def visible_points(points, width, height, source_width, source_height):
    scale = max(width / source_width, height / source_height)
    left, top = (width - source_width * scale) / 2, (height - source_height * scale) / 2
    return [p for p in points if 8 < left + p['u'] * source_width * scale < width - 8
            and 8 < top + p['v'] * source_height * scale < height - 8]


def main():
    provenance = json.loads(PROVENANCE.read_text())
    base = json.loads(BASE.read_text())
    protected = [SOURCE, BASE, PROVENANCE, ROOT / 'public/v-next/background/star-points.json',
                 ROOT / 'public/v-next/background/provenance.json']
    for folder, key in [('work-background', 'variants'), ('background', 'derivatives')]:
        data = json.loads((ROOT / f'public/v-next/{folder}/provenance.json').read_text())
        protected.extend(ROOT / 'public' / item['url'].lstrip('/') for item in data[key])
    hashes = {str(path.relative_to(ROOT)): measurement.digest(path) for path in protected}
    source_hash = measurement.digest(SOURCE)
    assert source_hash == provenance['sourceSha256'] == base['source']['sha256'], 'Photo changed; re-review masks first'
    with Image.open(SOURCE) as original:
        photo = ImageOps.exif_transpose(original).convert('RGB')
    width, original_height = photo.size
    height = provenance['height']
    assert (width, original_height, height) == (8192, 5464, 3000)
    assert provenance['crop'] == dict(x=0, y=0, width=width, height=height)

    proxy = photo.resize((2048, round(original_height * 2048 / width)), Image.Resampling.LANCZOS)
    lum = measurement.luminance(proxy)
    contrast = lum - measurement.luminance(proxy.filter(ImageFilter.GaussianBlur(3)))
    maxima = np.ones(lum.shape, dtype=bool)
    for dy in range(-2, 3):
        for dx in range(-2, 3):
            if dy or dx:
                maxima &= lum > np.roll(np.roll(lum, dy, axis=0), dx, axis=1)
    maxima &= (lum > .095) & (contrast > .047)
    maxima[:8] = maxima[-8:] = False
    maxima[:, :8] = maxima[:, -8:] = False
    maxima[math.floor((height - 24) * proxy.height / original_height):] = False
    ys, xs = np.where(maxima)
    scores = contrast[ys, xs] * np.sqrt(lum[ys, xs])
    order = np.argsort(scores)[::-1]
    candidates = []
    for index in order:
        x = (float(xs[index]) + .5) * width / proxy.width - .5
        y = (float(ys[index]) + .5) * original_height / proxy.height - .5
        if measurement.masked((x + .5) / width, (y + .5) / original_height):
            continue
        point = measurement.measure_star(photo, x, y)
        if not point or point['contrast'] < .105 or not .85 <= point['radiusPx'] <= 6.5:
            continue
        if point['mass'] < 1.2 or point['elongation'] > 5.5 or not 24 < point['y'] < height - 24:
            continue
        if measurement.masked((point['x'] + .5) / width, (point['y'] + .5) / original_height):
            continue
        if any((p['x'] - point['x']) ** 2 + (p['y'] - point['y']) ** 2 < MIN_DISTANCE ** 2 for p in base['points']):
            continue
        point['score'] = point['contrast'] * math.sqrt(point['mass'])
        candidates.append(point)

    # Take each cell's strongest remaining point in rounds. Central mobile crops
    # therefore receive coverage before a brighter outer region consumes the cap.
    cells = {(x, y): [] for y in range(GRID[1]) for x in range(GRID[0])}
    for point in sorted(candidates, key=lambda p: p['score'], reverse=True):
        cell = (min(GRID[0] - 1, int(point['x'] / width * GRID[0])),
                min(GRID[1] - 1, int(point['y'] / height * GRID[1])))
        cells[cell].append(point)
    selected = []
    for _ in range(MAX_PER_CELL):
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
    assert len(selected) >= 350, f'Only {len(selected)} distinct real stars passed; inspect extraction before publishing'
    selected.sort(key=lambda p: (int(p['y'] / height * GRID[1]), p['x']))
    lo, hi = min(p['score'] for p in selected), max(p['score'] for p in selected)
    points = [dict(id=f'work-star-{index + 1:03}', u=round((p['x'] + .5) / width, 9),
                   v=round((p['y'] + .5) / height, 9), x=round(p['x'], 5), y=round(p['y'], 5),
                   luminance=round(p['luminance'], 5), contrast=round(p['contrast'], 5),
                   color=[round(c, 5) for c in p['color']], radiusPx=round(p['radiusPx'], 4),
                   strength=round(.55 + .45 * math.sqrt((p['score'] - lo) / max(hi - lo, .00001)), 5))
              for index, p in enumerate(selected)]
    combined = base['points'] + points
    scenarios = []
    for vw, vh in [(1440, 1000), (768, 1000), (390, 844), (844, 390)]:
        scenarios.append(dict(viewport=[vw, vh], originalCount=len(visible_points(base['points'], vw, vh, width, height)),
                              supplementalCount=len(visible_points(points, vw, vh, width, height)),
                              combinedCount=len(visible_points(combined, vw, vh, width, height))))
    assert next(row['combinedCount'] for row in scenarios if row['viewport'] == [390, 844]) >= 30
    document = dict(version=1, source=base['source'], coordinateSystem=base['coordinateSystem'],
        supplements='/v-next/work-background/star-points.json', baseCatalogSha256=measurement.digest(BASE),
        algorithm=dict(reusedMeasurement='scripts/extract-hero-stars.py: measure_star, masked, luminance; main not invoked',
            detection='2048px Lanczos proxy; strict 5x5 local maxima; sigma=3px local-background contrast',
            acceptance=dict(minProxyLuminance=.095, minProxyContrast=.047, minSourceContrast=.105,
                minCoreMass=1.2, sourceRadiusRange=[.85, 6.5], maxElongation=5.5),
            selection=dict(grid=list(GRID), cellOrder='reading order, round-robin strongest remaining',
                sourceDistancePx=MIN_DISTANCE, maxPerCell=MAX_PER_CELL, targetSupplement=TARGET),
            exclusions=dict(personPolygonOriginalUV=measurement.PERSON, longStreakOriginalUV=measurement.STREAK),
            photometry='Original source centroids and sampled sRGB color; no generated or randomly placed dots'),
        count=len(points), points=points)
    REVIEW.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json.dumps(document, ensure_ascii=False, indent=2) + '\n')

    overview = photo.crop((0, 0, width, height)).resize((1638, 600), Image.Resampling.LANCZOS)
    draw = ImageDraw.Draw(overview)
    for group, color in [(base['points'], '#72bcff'), (points, '#71ffc4')]:
        for p in group:
            x, y = p['u'] * overview.width, p['v'] * overview.height
            draw.ellipse((x - 3, y - 3, x + 3, y + 3), outline=color, width=1)
    overview.save(REVIEW / 'work-stars-overview.jpg', quality=96, subsampling=0)
    columns, per_page, cell_width, cell_height = 6, 60, 238, 126
    for page, start in enumerate(range(0, len(points), per_page), 1):
        batch = points[start:start + per_page]
        sheet = Image.new('RGB', (columns * cell_width, math.ceil(len(batch) / columns) * cell_height), '#111319')
        draw = ImageDraw.Draw(sheet)
        for index, point in enumerate(batch):
            ix, iy = round(point['x']), round(point['y'])
            patch = photo.crop((ix - 22, iy - 22, ix + 23, iy + 23)).resize((90, 90), Image.Resampling.NEAREST)
            x, y = (index % columns) * cell_width + 8, (index // columns) * cell_height + 24
            sheet.paste(patch, (x, y)); sheet.paste(patch, (x + 112, y))
            cx, cy = x + 112 + (point['x'] - ix + 22.5) * 2, y + (point['y'] - iy + 22.5) * 2
            for line in [(cx - 7, cy, cx - 3, cy), (cx + 3, cy, cx + 7, cy), (cx, cy - 7, cx, cy - 3), (cx, cy + 3, cx, cy + 7)]:
                draw.line(line, fill='#63ffb9', width=1)
            draw.text((x, y - 19), f"{point['id']} c={point['contrast']:.2f}", fill='#edf2f4')
        sheet.save(REVIEW / f'work-star-contact-{page}.jpg', quality=96, subsampling=0)
    intact = {name: measurement.digest(ROOT / name) == value for name, value in hashes.items()}
    assert all(intact.values()), 'Protected photo/catalogue changed during extraction'
    report = dict(sourceSha256=source_hash, preservedFiles=intact, preservedHashes=hashes,
        proxyPeaks=len(order), acceptedCandidates=len(candidates), originalCount=len(base['points']),
        supplementaryCount=len(points), combinedCount=len(combined), centeredCoverScenarios=scenarios,
        sourceMeasurements=dict(minContrast=min(p['contrast'] for p in selected), minMass=min(p['mass'] for p in selected),
            maxElongation=max(p['elongation'] for p in selected), radiusRange=[min(p['radiusPx'] for p in selected), max(p['radiusPx'] for p in selected)]),
        measurements=[dict(id=p['id'], mass=round(m['mass'], 5), background=round(m['background'], 5),
                           elongation=round(m['elongation'], 5)) for p, m in zip(points, selected)],
        limitation='Coverage counts are photo-visible candidates; DOM cards and text further reduce exposed sky. Browser alignment and perception need separate checks.')
    (REVIEW / 'extraction-report.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps({key: value for key, value in report.items() if key not in ['measurements', 'preservedHashes']}, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()
