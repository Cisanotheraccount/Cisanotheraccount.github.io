"""Detect compact bright stars in the unchanged, EXIF-oriented hero photograph.

Requires Pillow + NumPy. Coordinates describe original-image pixel centres, never
viewport positions. Technical QA images are written separately from photo assets.
Run from any directory with the bundled Python runtime.
"""
from pathlib import Path
from hashlib import sha256
import json
import math
from PIL import Image, ImageOps, ImageFilter, ImageDraw, ImageFont
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / '内容资料/03_摄影与平面设计合集/摄影/首页背景原图/201A3976.jpg'
OUTPUT = ROOT / 'public/v-next/background/star-points.json'
REVIEW = ROOT / 'v-next/review/star-twinkle-v6/extraction'
TARGET = 180
# These source-specific masks exclude a person and one long satellite/aircraft
# streak. The photograph has no visible terrestrial horizon. Nebulosity is
# rejected by local contrast and compactness rather than masking the Milky Way.
PERSON = [(0.285, 1), (.325, .79), (.327, .705), (.355, .657), (.398, .606),
          (.441, .6), (.457, .626), (.487, .616), (.535, .615), (.552, .646),
          (.527, .714), (.485, .775), (.48, 1)]
STREAK = (.615, .337, .716, .365)


def digest(path):
    return sha256(path.read_bytes()).hexdigest()


def luminance(rgb):
    return np.asarray(rgb, dtype=np.float32) @ np.array([.2126, .7152, .0722], dtype=np.float32) / 255


def in_polygon(x, y, polygon):
    inside = False
    for (ax, ay), (bx, by) in zip(polygon, polygon[1:] + polygon[:1]):
        if (ay > y) != (by > y) and x < (bx - ax) * (y - ay) / (by - ay) + ax:
            inside = not inside
    return inside


def masked(u, v):
    return in_polygon(u, v, PERSON) or (STREAK[0] < u < STREAK[2] and STREAK[1] < v < STREAK[3])


def measure_star(image, x, y, radius=19):
    """Robust core centroid after a tiny blur; background from an outer annulus."""
    ix, iy = round(x), round(y)
    rgb_image = image.crop((ix-radius, iy-radius, ix+radius+1, iy+radius+1))
    rgb = np.asarray(rgb_image, dtype=np.float32)
    lum = luminance(rgb)
    smooth = luminance(rgb_image.filter(ImageFilter.GaussianBlur(.55)))
    yy, xx = np.mgrid[-radius:radius+1, -radius:radius+1]
    rr = np.sqrt(xx*xx + yy*yy)
    bg = float(np.median(lum[(rr >= radius*.63) & (rr <= radius)]))
    # Constrain refinement to the candidate star rather than a neighbour.
    search = smooth.copy()
    search[rr > 8] = -1
    py, px = np.unravel_index(np.argmax(search), search.shape)
    peak = float(smooth[py, px])
    core_r = np.sqrt((xx-(px-radius))**2 + (yy-(py-radius))**2)
    weights = np.maximum(smooth-bg-max(.004, (peak-bg)*.12), 0)
    weights[core_r > 9] = 0
    mass = float(weights.sum())
    if mass <= 0:
        return None
    cx, cy = float((xx*weights).sum()/mass), float((yy*weights).sum()/mass)
    dx, dy = xx-cx, yy-cy
    cov = np.array([[(dx*dx*weights).sum(), (dx*dy*weights).sum()],
                    [(dx*dy*weights).sum(), (dy*dy*weights).sum()]]) / mass
    eig = np.linalg.eigvalsh(cov)
    elongation = float(math.sqrt(max(.01, eig[1])/max(.01, eig[0])))
    radius_px = float(math.sqrt(max(.25, eig.sum())))
    color = (rgb*weights[:, :, None]).sum(axis=(0,1))/mass/255
    return dict(x=ix+cx, y=iy+cy, luminance=peak, contrast=peak-bg,
                background=bg, mass=mass, radiusPx=radius_px,
                elongation=elongation, color=[float(v) for v in color])


def percentile(values, p):
    return float(np.percentile(values, p)) if values else 0


def main():
    REVIEW.mkdir(parents=True, exist_ok=True)
    before = digest(SOURCE)
    provenance = json.loads((OUTPUT.parent/'provenance.json').read_text())
    assert before == provenance['sourceSha256'], 'Photo changed: re-review source masks first'
    with Image.open(SOURCE) as original:
        photo = ImageOps.exif_transpose(original).convert('RGB')
    w, h = photo.size
    assert (w,h) == (8192,5464)
    detection = photo.resize((2048, round(h*2048/w)), Image.Resampling.LANCZOS)
    lum = luminance(detection)
    local = luminance(detection.filter(ImageFilter.GaussianBlur(3)))
    contrast = lum-local
    maxima = np.ones(lum.shape, dtype=bool)
    for dy in range(-2,3):
        for dx in range(-2,3):
            if dy or dx:
                maxima &= lum > np.roll(np.roll(lum, dy, axis=0), dx, axis=1)
    maxima &= (lum > .095) & (contrast > .047)
    maxima[:8] = maxima[-8:] = False
    maxima[:,:8] = maxima[:,-8:] = False
    ys, xs = np.where(maxima)
    scores = contrast[ys,xs] * np.sqrt(lum[ys,xs])
    order = np.argsort(scores)[::-1][:6000]
    candidates = []
    for index in order:
        x = (float(xs[index])+.5)*w/detection.width-.5
        y = (float(ys[index])+.5)*h/detection.height-.5
        if masked((x+.5)/w, (y+.5)/h):
            continue
        point = measure_star(photo, x, y)
        if not point:
            continue
        if point['contrast'] < .105 or point['radiusPx'] < .85 or point['radiusPx'] > 6.5:
            continue
        if point['mass'] < 1.2 or point['elongation'] > 5.5:
            continue
        if masked((point['x']+.5)/w, (point['y']+.5)/h):
            continue
        point['score'] = point['contrast'] * math.sqrt(point['mass'])
        candidates.append(point)
    candidates.sort(key=lambda p:p['score'], reverse=True)
    # Spatial non-maximum suppression avoids selecting one elongated star twice.
    # Per-cell caps keep central phone crops represented without admitting noise.
    selected = []
    cells = {}
    min_distance = 86
    for point in candidates:
        x,y = point['x'],point['y']
        cell = (min(7,int(x/w*8)), min(5,int(y/h*6)))
        if cells.get(cell,0) >= 6:
            continue
        if any((q['x']-x)**2+(q['y']-y)**2 < min_distance**2 for q in selected):
            continue
        selected.append(point)
        cells[cell] = cells.get(cell,0)+1
        if len(selected) == TARGET:
            break
    # IDs are stable reading-order positions, unrelated to runtime random timing.
    selected.sort(key=lambda p:(int(p['y']/h*6),p['x']))
    points = []
    scores = [p['score'] for p in selected]
    lo,hi = min(scores),max(scores)
    for index,p in enumerate(selected):
        points.append(dict(
            id=f'star-{index+1:03}', u=round((p['x']+.5)/w,9),v=round((p['y']+.5)/h,9),
            x=round(p['x'],5),y=round(p['y'],5),luminance=round(p['luminance'],5),
            contrast=round(p['contrast'],5),color=[round(c,5) for c in p['color']],
            radiusPx=round(p['radiusPx'],4),strength=round(.55+.45*math.sqrt((p['score']-lo)/(hi-lo)),5)))
    metadata = dict(version=1,
        source=dict(path=str(SOURCE.relative_to(ROOT)),sha256=before,width=w,height=h,colorSpace='sRGB'),
        coordinateSystem='top-left pixel centers; u=(x+0.5)/width, v=(y+0.5)/height; x/y are subpixel source centroids',
        algorithm=dict(detection='2048px Lanczos proxy; strict 5x5 local maxima; local contrast against sigma=3px Gaussian background',
            refinement='Original-resolution 39x39 windows; outer-annulus median background; sigma=0.55px denoise; contrast-weighted core centroid within 9px',
            acceptance=dict(minProxyLuminance=.095,minProxyContrast=.047,minSourceContrast=.105,
                minCoreMass=1.2,sourceRadiusRange=[.85,6.5],maxElongation=5.5),
            suppression=dict(sourceDistancePx=min_distance,distributionGrid=[8,6],maxPerCell=6),
            exclusions=dict(personPolygonUV=PERSON,existingLongStreakUV=STREAK),
            photometry='sRGB channel values, Rec.709 brightness weights; no photo asset changed'),
        count=len(points),points=points)
    OUTPUT.write_text(json.dumps(metadata,ensure_ascii=False,indent=2)+'\n')
    assert len(points) >= 120, f'Insufficient real stars: {len(points)}'
    # Check all four actual JPEG variants against their own subpixel bright cores.
    validation = []
    for derivative in provenance['derivatives']:
        path=ROOT/'public'/derivative['url'].lstrip('/')
        im=Image.open(path).convert('RGB')
        rows=[]
        for p in points:
            expected_x=p['u']*im.width-.5;expected_y=p['v']*im.height-.5
            measured=measure_star(im,expected_x,expected_y,radius=12)
            # Refine centroid in a scaled original-star neighbourhood, so adjacent
            # dim stars cannot change the reference at small responsive sizes.
            radius=max(2.0,p['radiusPx']*im.width/w*2.3)
            ix,iy=round(expected_x),round(expected_y)
            patch=luminance(im.crop((ix-10,iy-10,ix+11,iy+11)))
            yy,xx=np.mgrid[-10:11,-10:11]
            rr=np.sqrt((xx+ix-expected_x)**2+(yy+iy-expected_y)**2)
            bg=float(np.median(patch[(rr>7)&(rr<10)]))
            weights=np.maximum(patch-bg-max(.002,(float(patch.max())-bg)*.12),0)
            weights[rr>radius]=0
            mass=weights.sum()
            actual_x=ix+float((xx*weights).sum()/mass);actual_y=iy+float((yy*weights).sum()/mass)
            error=math.hypot(actual_x-expected_x,actual_y-expected_y)
            rows.append(dict(id=p['id'],expected=[round(expected_x,5),round(expected_y,5)],
                             measured=[round(actual_x,5),round(actual_y,5)],errorPx=round(error,5)))
        errors=[p['errorPx'] for p in rows]
        validation.append(dict(url=derivative['url'],size=list(im.size),count=len(rows),
              centroidErrorPx=dict(mean=float(np.mean(errors)),p95=percentile(errors,95),max=max(errors)),points=rows))
    # Raster markers are audit material only. Runtime should map source UV via the
    # same centered-cover crop as the photograph, then use a soft low-amplitude pulse.
    overview=photo.resize((1600,round(h*1600/w)),Image.Resampling.LANCZOS)
    draw=ImageDraw.Draw(overview)
    for p in points:
        x=p['u']*overview.width;y=p['v']*overview.height
        draw.ellipse((x-5,y-5,x+5,y+5),outline='#7affca',width=1)
        draw.text((x+7,y-5),p['id'][5:],fill='#c8ffe6',stroke_width=1,stroke_fill='#101b16')
    overview.save(REVIEW/'star-points-location.jpg',quality=96,subsampling=0)
    # Contact sheets show the unchanged source crop and the centroid cross beside
    # one another. All points are inspectable, including faint phone-centre stars.
    columns=6;per_page=60;cellw=238;cellh=126
    for page,start in enumerate(range(0,len(points),per_page),1):
        batch=points[start:start+per_page]
        sheet=Image.new('RGB',(columns*cellw,math.ceil(len(batch)/columns)*cellh),'#111319')
        sd=ImageDraw.Draw(sheet)
        for i,p in enumerate(batch):
            ix,iy=round(p['x']),round(p['y'])
            crop=photo.crop((ix-22,iy-22,ix+23,iy+23)).resize((90,90),Image.Resampling.NEAREST)
            x=(i%columns)*cellw+8;y=(i//columns)*cellh+24
            sheet.paste(crop,(x,y));sheet.paste(crop,(x+112,y))
            cx=x+112+(p['x']-ix+22.5)*2;cy=y+(p['y']-iy+22.5)*2
            sd.line((cx-7,cy,cx-3,cy),fill='#63ffb9',width=1);sd.line((cx+3,cy,cx+7,cy),fill='#63ffb9',width=1)
            sd.line((cx,cy-7,cx,cy-3),fill='#63ffb9',width=1);sd.line((cx,cy+3,cx,cy+7),fill='#63ffb9',width=1)
            sd.text((x,y-19),f"{p['id']}  {p['x']:.1f}, {p['y']:.1f}",fill='#edf2f4')
        sheet.save(REVIEW/f'star-contact-{page}.jpg',quality=96,subsampling=0)
    # Analytical centered-cover scenarios. Actual browser viewport mapping is a
    # separate integration check, since hero height can differ from viewport.
    cover=[]
    for vw,vh in [(1440,900),(768,1024),(390,844)]:
        scale=max(vw/w,vh/h);ox=(vw-w*scale)/2;oy=(vh-h*scale)/2
        visible=[p for p in points if 0<=p['u']*w*scale+ox<vw and 0<=p['v']*h*scale+oy<vh]
        cover.append(dict(viewport=[vw,vh],visibleCount=len(visible),scale=scale,
                          centerCoverOffset=[ox,oy],sourcePixelCenterConvention=True))
    report=dict(sourceSha256=before,unchangedSource=digest(SOURCE)==before,
        rawProxyPeaks=len(order),acceptedCandidates=len(candidates),selected=len(points),
        localBrightness=dict(min=min(p['luminance'] for p in points),median=percentile([p['luminance'] for p in points],50)),
        derivatives=validation,centeredCoverScenarios=cover,
        limitation='Star cores in this long-exposure photo are sometimes elongated; a soft pulse must stay centred and avoid replacing them with hard dots. Derivative centroid differences include JPEG/resampling and centroid measurement noise.')
    (REVIEW/'extraction-report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
    summary={k:v for k,v in report.items() if k!='derivatives'}
    summary['derivatives']=[{k:v for k,v in d.items() if k!='points'} for d in validation]
    (REVIEW/'summary.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2)+'\n')
    print(json.dumps(summary,ensure_ascii=False,indent=2))


if __name__=='__main__':
    main()
