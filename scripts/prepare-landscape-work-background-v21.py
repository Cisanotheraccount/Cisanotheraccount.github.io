"""Import the reviewed Lightroom landscape JPEG without re-encoding its pixels.

Requires Pillow + NumPy. Writes only independent 2.1 assets and local review
evidence. The original and all older backgrounds remain byte-identical.
"""

from hashlib import sha256
from pathlib import Path
import importlib.util
import io
import json
import math

import numpy as np
from PIL import Image, ImageCms, ImageDraw, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / '内容资料/03_摄影与平面设计合集/摄影/作品区背景原图/_25A6463.jpg'
OUTPUT = ROOT / 'public/v2-1/backgrounds/work'
REVIEW = ROOT / 'v-next/review/work-landscape-20260919'
EXPECTED_SOURCE_SHA = '43f6a67451e5a89db861f2e97950aaa7fe060e62553ee51d325e02c28d242ebb'
SOURCE_SIZE = (8192, 5464)
SKY_MAX_V = .52
TARGET = 350
GRID = (14, 10)
MIN_DISTANCE = 40

SPEC = importlib.util.spec_from_file_location('star_measurement', ROOT / 'scripts/extract-hero-stars.py')
measurement = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(measurement)  # Measurement helpers only, never the old source masks/main.


def digest(path):
    return sha256(path.read_bytes()).hexdigest()


def write_json(path, value):
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n')


def strip_private_jpeg_metadata(data):
    """Remove APP1/APP13/COM segments while preserving every JPEG scan byte.

    APP2 ICC and APP14 Adobe color-transform markers are retained. Entropy-coded
    segments, including progressive scans and restart markers, are copied intact.
    """
    assert data[:2] == b'\xff\xd8', 'Expected JPEG SOI'
    output = bytearray(data[:2])
    removed, scans = [], []
    offset = 2
    while offset < len(data):
        start = offset
        assert data[offset] == 0xff, f'Invalid JPEG marker at {offset}'
        while offset < len(data) and data[offset] == 0xff:
            offset += 1
        marker = data[offset]
        offset += 1
        if marker == 0xd9:
            output.extend(data[start:offset])
            assert offset == len(data), 'Unexpected data after JPEG EOI'
            return bytes(output), removed, sha256(b''.join(scans)).hexdigest()
        assert marker not in (0x00, 0xd8), 'Invalid standalone marker'
        if marker == 0x01 or 0xd0 <= marker <= 0xd7:
            output.extend(data[start:offset])
            continue
        length = int.from_bytes(data[offset:offset + 2], 'big')
        assert length >= 2 and offset + length <= len(data), 'Invalid JPEG segment length'
        end = offset + length
        if marker in (0xe1, 0xed, 0xfe):
            removed.append(dict(marker=f'FF{marker:02X}', bytes=end - start))
        else:
            output.extend(data[start:end])
        offset = end
        if marker == 0xda:
            scan_start = offset
            while offset < len(data):
                position = data.find(b'\xff', offset)
                assert position >= 0 and position + 1 < len(data), 'Unterminated JPEG scan'
                next_byte = position + 1
                while data[next_byte] == 0xff:
                    next_byte += 1
                if data[next_byte] == 0x00 or 0xd0 <= data[next_byte] <= 0xd7:
                    offset = next_byte + 1
                    continue
                offset = position
                break
            scan = data[scan_start:offset]
            output.extend(scan)
            scans.append(scan)
    raise ValueError('Missing JPEG EOI')


def extract_stars(photo):
    width, height = photo.size
    proxy = photo.resize((2048, round(height * 2048 / width)), Image.Resampling.LANCZOS)
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
    # All tree/car/terrestrial edges are below this conservatively reviewed band.
    maxima[math.floor(proxy.height * SKY_MAX_V):] = False
    ys, xs = np.where(maxima)
    scores = contrast[ys, xs] * np.sqrt(lum[ys, xs])
    candidates = []
    for index in np.argsort(scores)[::-1][:8000]:
        x = (float(xs[index]) + .5) * width / proxy.width - .5
        y = (float(ys[index]) + .5) * height / proxy.height - .5
        point = measurement.measure_star(photo, x, y)
        if not point or point['contrast'] < .085 or not .85 <= point['radiusPx'] <= 6.5:
            continue
        if point['mass'] < 1.2 or point['elongation'] > 3:
            continue
        if not (24 < point['x'] < width - 24 and 24 < point['y'] < height * SKY_MAX_V - 24):
            continue
        point['score'] = point['contrast'] * math.sqrt(point['mass'])
        candidates.append(point)
    cells = {(x, y): [] for y in range(GRID[1]) for x in range(GRID[0])}
    for point in sorted(candidates, key=lambda p: p['score'], reverse=True):
        cell = (min(GRID[0] - 1, int(point['x'] / width * GRID[0])),
                min(GRID[1] - 1, int(point['y'] / (height * SKY_MAX_V) * GRID[1])))
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
    selected.sort(key=lambda p: (int(p['y'] / (height * SKY_MAX_V) * GRID[1]), p['x']))
    lo, hi = min(p['score'] for p in selected), max(p['score'] for p in selected)
    points = []
    for index, point in enumerate(selected):
        x, y = round(point['x'], 5), round(point['y'], 5)
        u, v = round((x + .5) / width, 12), round((y + .5) / height, 12)
        points.append(dict(id=f'yellowstone-landscape-star-{index + 1:03}', x=x, y=y, u=u, v=v,
            original=dict(x=x, y=y, u=u, v=v), luminance=round(point['luminance'], 5),
            contrast=round(point['contrast'], 5), color=[round(c, 5) for c in point['color']],
            radiusPx=round(point['radiusPx'], 4),
            strength=round(.55 + .45 * math.sqrt((point['score'] - lo) / max(hi - lo, .00001)), 5)))
    return points, candidates


def main():
    assert digest(SOURCE) == EXPECTED_SOURCE_SHA, 'New source supplied; inspect before regeneration'
    protected = {p: digest(p) for folder in ('background', 'work-background')
                 for p in (ROOT / 'public/v-next' / folder).rglob('*') if p.is_file()}
    with Image.open(SOURCE) as original:
        assert original.size == SOURCE_SIZE and original.getexif().get(274, 1) == 1
        icc = original.info.get('icc_profile')
        profile = ImageCms.getProfileDescription(ImageCms.ImageCmsProfile(io.BytesIO(icc))).strip()
        assert 'srgb' in profile.lower(), f'Expected sRGB, found {profile}'
        photo = original.convert('RGB')
    original_bytes = SOURCE.read_bytes()
    public_bytes, removed, scan_hash = strip_private_jpeg_metadata(original_bytes)
    with Image.open(io.BytesIO(public_bytes)) as exported:
        assert exported.size == photo.size and exported.info.get('icc_profile') == icc
        assert not dict(exported.getexif()) and not exported.info.get('exif')
        assert not exported.info.get('xmp') and not exported.info.get('photoshop')
        decoded = exported.convert('RGB')
        # Compare every decoded channel in bounded-height tiles to limit memory.
        for top in range(0, photo.height, 256):
            bounds = (0, top, photo.width, min(photo.height, top + 256))
            assert np.array_equal(np.asarray(photo.crop(bounds)), np.asarray(decoded.crop(bounds)))
    stripped_again, removed_again, output_scan_hash = strip_private_jpeg_metadata(public_bytes)
    assert stripped_again == public_bytes and not removed_again and output_scan_hash == scan_hash
    OUTPUT.mkdir(parents=True, exist_ok=True)
    REVIEW.mkdir(parents=True, exist_ok=True)
    jpeg = OUTPUT / 'yellowstone-landscape-8192.jpg'
    if jpeg.exists():
        assert jpeg.read_bytes() == public_bytes, 'Refusing to overwrite a different public asset'
    else:
        jpeg.write_bytes(public_bytes)
    variant = dict(url='/' + jpeg.relative_to(ROOT / 'public').as_posix(), width=photo.width,
                   height=photo.height, bytes=len(public_bytes), sha256=digest(jpeg))
    crop = dict(x=0, y=0, width=photo.width, height=photo.height)
    provenance = dict(source=SOURCE.name, sourceSha256=EXPECTED_SOURCE_SHA, sourceBytes=len(original_bytes),
        sourceWidth=photo.width, sourceHeight=photo.height, width=photo.width, height=photo.height,
        crop=crop, colorSpace='sRGB', profile=profile, variants=[variant],
        encoding=dict(format='JPEG', reencoded=False, originalICC=True, exif=False, xmp=False,
                      jpegScanSha256=scan_hash, decodedPixelsIdentical=True),
        processing='Full uncropped Lightroom landscape export. JPEG entropy-coded scan bytes and original sRGB ICC '
                   'retained verbatim. Only APP1 (EXIF/XMP), APP13 (Photoshop/IPTC) and COM metadata segments removed. '
                   'No resize, crop, exposure, saturation, grading, sharpening, blur or second JPEG encoding.',
        originalPreserved=True, heroExportsPreserved=True, previousWorkExportsPreserved=True)
    write_json(OUTPUT / 'provenance.json', provenance)
    points, candidates = extract_stars(photo)
    catalog = dict(version=1, source=dict(path=SOURCE.name, sha256=EXPECTED_SOURCE_SHA,
        width=photo.width, height=photo.height, originalWidth=photo.width, originalHeight=photo.height,
        crop=crop, colorSpace='sRGB'), count=len(points), points=points,
        coordinateSystem='Top-left pixel centers of the complete original photograph; u=(x+0.5)/width, v=(y+0.5)/height. '
                         'No crop offset. Runtime cover mapping uses decoded derivative dimensions.',
        algorithm=dict(reusedMeasurement='scripts/extract-hero-stars.py: measure_star and luminance helpers only; no old-photo masks/main',
            detection='2048px Lanczos proxy; strict 5x5 local maxima; sigma=3px local contrast',
            acceptance=dict(minProxyLuminance=.07, minProxyContrast=.035, minSourceContrast=.085,
                minCoreMass=1.2, sourceRadiusRange=[.85, 6.5], maxElongation=3),
            selection=dict(grid=list(GRID), gridDomain='Eligible sky band only', sourceDistancePx=MIN_DISTANCE,
                           target=TARGET, method='Round-robin strongest remaining candidate by grid cell'),
            exclusions=dict(skyMaxV=SKY_MAX_V, boundaryPaddingSourcePx=24,
                            rationale='Only the upper 52 percent is measured; lower trees, cars, horizon and ground excluded.'),
            photometry='Measured original-resolution centroids and sRGB samples; no arbitrary star positions; existing strength mapping retained'))
    write_json(OUTPUT / 'star-points.json', catalog)

    overview = photo.copy()
    overview.thumbnail((1600, 1600), Image.Resampling.LANCZOS)
    draw = ImageDraw.Draw(overview)
    draw.line((0, SKY_MAX_V * overview.height, overview.width, SKY_MAX_V * overview.height), fill='#63ffb9', width=2)
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
        tile = photo.crop((x - 24, y - 24, x + 25, y + 25)).resize((196, 196), Image.Resampling.NEAREST)
        marker = ImageDraw.Draw(tile)
        cx, cy = (point['x'] - (x - 24) + .5) * 4, (point['y'] - (y - 24) + .5) * 4
        marker.line((cx - 8, cy, cx + 8, cy), fill='#ffd065', width=1)
        marker.line((cx, cy - 8, cx, cy + 8), fill='#ffd065', width=1)
        sheet.paste(tile, (left + 2, top + 18))
        draw.text((left + 3, top + 2), point['id'].replace('yellowstone-landscape-', ''), fill='white')
    sheet.save(REVIEW / 'star-centroid-contact-sheet.jpg', quality=95, subsampling=0)
    scenarios = []
    for vw, vh in ((1440, 1000), (768, 1000), (390, 844), (844, 390)):
        scale = max(vw / photo.width, vh / photo.height) * 1.10
        cover_width, cover_height = photo.width * scale, photo.height * scale
        left, top = (vw - cover_width) / 2, vh - cover_height
        visible = sum(8 < left + p['u'] * cover_width < vw - 8 and 8 < top + p['v'] * cover_height < vh - 8 for p in points)
        scenarios.append(dict(viewport=[vw, vh], visibleCandidates=visible,
                              photoScale=1.10, photoAnchorY=1, cover=[left, top, cover_width, cover_height]))
    unchanged = {str(p.relative_to(ROOT)): digest(p) == before for p, before in protected.items()}
    assert all(unchanged.values()) and digest(SOURCE) == EXPECTED_SOURCE_SHA
    report = dict(sourceFile=SOURCE.name, sourceSha256=EXPECTED_SOURCE_SHA, originalUnchanged=True,
        sourceBytes=len(original_bytes), publicBytes=len(public_bytes), removedMetadataSegments=removed,
        sourceICC=profile, originalICCBytesRetained=True, decodedPixelsIdentical=True,
        scanBytesIdentical=True, jpegScanSha256=scan_hash, publicExifXmpIptc=False, variants=[variant],
        crop=crop, measuredCandidates=len(candidates), catalogCount=len(points), skyMaxV=SKY_MAX_V,
        scenarios=scenarios, acceptance=catalog['algorithm']['acceptance'], preservedFiles=unchanged,
        catalogSha256=digest(OUTPUT / 'star-points.json'), provenanceSha256=digest(OUTPUT / 'provenance.json'),
        limitation='Analytical cover counts do not establish normal-playback star visibility or actual browser loading time.')
    write_json(REVIEW / 'extraction-report.json', report)
    print(json.dumps({key: value for key, value in report.items() if key != 'preservedFiles'}, indent=2))


if __name__ == '__main__':
    main()
