"""Export the four user-selected archived moving-image projects without upscaling.

Optional editorial import only: normal builds use the checked-in web assets and
do not need the private content library or Pillow. Originals remain untouched.
Run with Python + Pillow. Palette extraction reuses prepare-work-background.py,
but does not run its photo/crop export.
"""
from pathlib import Path
from hashlib import sha256
import importlib.util
import json
from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / 'public/portfolio'
QUALITY = 92
PROJECTS = {
    'cyber-city': {
        'folder': 'P08_Cyber-City', 'cover': 'IMG-01', 'gallery': [],
        'selection': 'Original project-index cover; only one distinct archived still is available.',
    },
    'crystal-city': {
        'folder': 'P09_Crystal-City', 'cover': 'IMG-04',
        'selection': 'Higher-resolution archived version of the original project-index cover composition. IMG-05 repeats this view and is omitted from the gallery.',
        'gallery': [
            ('IMG-01', 'Crystal City rendered as a translucent blue skyline beneath a pale cyan sky.', 'A translucent city in daylight.'),
            ('IMG-02', 'A wide view across the reflective buildings of Crystal City, with a low sun on the horizon.', 'Light passing through the city.'),
            ('IMG-03', 'A close aerial view of Crystal City illuminated by orange lines and glowing building edges.', 'The city illuminated after dark.'),
        ],
    },
    'last-one': {
        'folder': 'P07_Last-One', 'cover': 'IMG-05',
        'selection': '2000-pixel archived background version of the character and sphere composition used on the original project index. IMG-06 repeats this view and is omitted.',
        'gallery': [
            ('IMG-01', 'A stylized character wearing a hat stands among white particles and polygonal clouds against a black background.', 'Character and particle study.'),
            ('IMG-02', 'A close view of a character’s legs with dark hands reaching upward against an orange background.', 'A close-up from the animated sequence.'),
            ('IMG-03', 'A small running character moves above three rough spherical forms in a black space.', 'A character moving between suspended worlds.'),
            ('IMG-04', 'A brightly lit sphere and a small character appear inside a dark angular space with orange light.', 'Light and scale in a cinematic frame.'),
        ],
    },
    'gala-x-ci-vr-gallery': {
        'folder': 'P06_Gala-X-Ci-VR-Gallery', 'cover': 'IMG-01',
        'selection': 'Original project-index cover showing the gallery’s black-hole opening.',
        'gallery': [
            ('IMG-02', 'The virtual gallery’s introduction appears in front of a luminous black hole and a pale tiled floor.', 'The gallery begins at a singularity.'),
            ('IMG-03', 'A distant Gala X Ci label floats inside a minimal blue virtual space.', 'Entering the virtual space.'),
            ('IMG-04', 'A tall dark portal marked Virtual Gallery stands against a blue environment.', 'The gallery threshold.'),
            ('IMG-05', 'A glowing orange star fills the left side of a virtual exhibition space beside a dark display wall.', 'Celestial scale within the exhibition.'),
            ('IMG-06', 'A long yellow moving-image display is installed inside a star-filled virtual exhibition space.', 'Moving image as an exhibit.'),
            ('IMG-07', 'A row of illuminated project displays stretches into a dark star-filled virtual gallery.', 'A sequence of projects in one shared space.'),
        ],
    },
}


def digest(path):
    return sha256(path.read_bytes()).hexdigest()


def write_json(path, value):
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n')


def export(source, destination, width):
    with Image.open(source) as original:
        image = ImageOps.exif_transpose(original)
        image = image.convert('RGBA' if 'A' in image.getbands() else 'RGB')
        width = min(width, image.width)
        size = (width, round(image.height * width / image.width))
        if image.size != size:
            image = image.resize(size, Image.Resampling.LANCZOS)
        image.save(destination, 'WEBP', quality=QUALITY, method=6, icc_profile=original.info.get('icc_profile', b''))
    return {'file': str(destination.relative_to(PUBLIC)), 'width': size[0], 'height': size[1], 'bytes': destination.stat().st_size, 'sha256': digest(destination)}


def main():
    galleries_path = ROOT / 'src/projectGalleries.json'
    gallery_manifest = json.loads(galleries_path.read_text())
    cover_manifest_path = PUBLIC / 'asset-sources.json'
    cover_manifest = json.loads(cover_manifest_path.read_text())
    case_manifest_path = PUBLIC / 'case-asset-sources.json'
    case_manifest = json.loads(case_manifest_path.read_text())
    selected = set(PROJECTS)
    cover_manifest['assets'] = [entry for entry in cover_manifest['assets'] if entry['project'] not in selected]
    case_manifest = [entry for entry in case_manifest if not any(entry['export'].startswith('/portfolio/cases/' + slug + '-') for slug in selected)]
    before = {}
    covers = {}
    for slug, config in PROJECTS.items():
        folder = ROOT / '内容资料/02_项目' / config['folder']
        entries = json.loads((folder / 'sources/assets.json').read_text())['assets']
        assets = {entry['id']: entry for entry in entries}
        for entry in entries:
            source = folder / entry['file']
            before[source] = digest(source)
            assert before[source] == entry['sha256'], f'Source hash changed: {source}'
        cover = assets[config['cover']]
        source = folder / cover['file']
        width = min(1600, cover['width'])
        variants = [export(source, PUBLIC / f'{slug}-{w}.webp', w) for w in (width, 800)]
        covers[slug] = PUBLIC / variants[0]['file']
        cover_manifest['assets'].append({
            'project': slug, 'source': str(source.relative_to(ROOT)),
            'sourceSha256': cover['sha256'], 'sourceSize': [cover['width'], cover['height']],
            'sourceBytes': source.stat().st_size, 'source_urls': cover['source_urls'],
            'derivatives': variants, 'quality': QUALITY,
            'processing': 'EXIF orientation; proportional Lanczos resize only when smaller; original ICC retained; no crop, recolor, or upscaling.',
            'selection': config['selection'], 'publicationAuthorization': 'User-approved ten-project implementation plan, 2026-09-16.',
        })
        gallery_manifest[slug] = []
        seen = set()
        for asset_id, alt, caption in config['gallery']:
            asset = assets[asset_id]
            if asset['sha256'] in seen:
                continue
            seen.add(asset['sha256'])
            source = folder / asset['file']
            name = f'{slug}-{asset_id.lower()}.webp'
            exported = export(source, PUBLIC / 'cases' / name, 1600)
            url = '/portfolio/cases/' + name
            gallery_manifest[slug].append({'image': url, 'alt': alt, 'caption': caption, 'width': exported['width'], 'height': exported['height']})
            case_manifest.append({'export': url, 'source': str(source.relative_to(ROOT)), 'source_urls': asset['source_urls'], 'sourceSha256': asset['sha256'], 'sha256': exported['sha256'], 'width': exported['width'], 'height': exported['height'], 'quality': QUALITY, 'processing': 'Full-frame proportional WebP export; no upscaling or recoloring.'})
    palette_spec = importlib.util.spec_from_file_location('work_palette', ROOT / 'scripts/prepare-work-background.py')
    palette_module = importlib.util.module_from_spec(palette_spec)
    palette_spec.loader.exec_module(palette_module)
    palettes_path = ROOT / 'public/v-next/work-background/palettes.json'
    palettes = json.loads(palettes_path.read_text())
    palettes.update({slug: palette_module.palette_for(path) for slug, path in covers.items()})
    assert all(digest(path) == expected for path, expected in before.items()), 'Archive originals changed'
    write_json(galleries_path, gallery_manifest)
    write_json(cover_manifest_path, cover_manifest)
    write_json(case_manifest_path, case_manifest)
    write_json(palettes_path, palettes)
    print(json.dumps({'projects': list(PROJECTS), 'coverVariants': 8, 'galleryImages': sum(len(gallery_manifest[slug]) for slug in PROJECTS), 'originalsUnchanged': True, 'workPhotoUnchanged': 'Photo export never invoked'}, indent=2))


if __name__ == '__main__':
    main()
