import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { copyFile, mkdir, readFile, readdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const photoEntry = 'photography/index.html';
export const photoNamespace = 'photography-assets/';
export const appNamespace = 'photography-assets/app/';
export const releaseManifestPath = appNamespace + 'release-manifest.json';
export const catalogOutputPath = appNamespace + 'catalog.json';
export const photographyBackgrounds = Object.freeze([
  { path: photoNamespace + 'background/stars-1536.jpg', nativeSource: 'v-next/background/stars-1536.jpg' },
  { path: photoNamespace + 'background/stars-2560.jpg', nativeSource: 'v-next/background/stars-2560.jpg' },
  { path: photoNamespace + 'background/stars-4096.jpg', nativeSource: 'v-next/background/stars-4096.jpg' },
]);
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const mimeFor = file => ({
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2',
})[path.extname(file).toLowerCase()];

function safePath(value, label = 'path') {
  assert(typeof value === 'string' && value.length > 0 && !path.posix.isAbsolute(value) && !value.includes('\\') && !value.split('/').some(part => !part || part === '.' || part === '..'), `Unsafe ${label}: ${value}`);
  return value;
}
function overlaps(first, second) {
  const a = path.resolve(first); const b = path.resolve(second);
  return a === b || a.startsWith(b + path.sep) || b.startsWith(a + path.sep);
}
function assertSeparate(first, second, label) {
  assert(!overlaps(first, second), `${label} directories must not overlap`);
}
function exactKeys(value, keys, label) {
  assert(value && typeof value === 'object' && !Array.isArray(value), `${label} must be an object`);
  assert.deepEqual(Object.keys(value).sort(), [...keys].sort(), `Unexpected ${label} fields`);
}
function publicPhotoPath(src) {
  assert(typeof src === 'string' && src.startsWith('/photography-assets/selected-20260921/') && !src.includes('?') && !src.includes('#'), `Photo variant must use the selected public namespace: ${src}`);
  return safePath(src.slice(1), 'variant source');
}

/** Validate the deliberately small public catalog schema. It has no provenance or EXIF fields. */
export function validatePhotographyCatalog(catalog) {
  exactKeys(catalog, ['version', 'heroPhotoId', 'photos', 'series'], 'catalog');
  assert.equal(catalog.version, 'selected-20260921', 'Catalog version must be selected-20260921');
  assert(typeof catalog.heroPhotoId === 'string' && catalog.heroPhotoId, 'Missing heroPhotoId');
  assert(Array.isArray(catalog.photos) && catalog.photos.length === 53, 'Catalog must contain exactly 53 photos');
  assert(Array.isArray(catalog.series) && catalog.series.length > 0, 'Catalog must contain series');
  const ids = new Set(); let landscapes = 0; let live = 0; let hdrPhotos = 0;
  const variantPaths = new Set();
  for (const photo of catalog.photos) {
    exactKeys(photo, ['id', 'category', 'seriesId', 'width', 'height', 'alt', 'variants', 'original'], `photo ${photo?.id ?? ''}`);
    assert(typeof photo.id === 'string' && /^[a-z0-9][a-z0-9-]*$/.test(photo.id) && !ids.has(photo.id), `Invalid or duplicate photo id: ${photo.id}`);
    ids.add(photo.id);
    assert(['Landscapes', 'Live'].includes(photo.category), `Invalid category for ${photo.id}`);
    landscapes += photo.category === 'Landscapes'; live += photo.category === 'Live';
    assert(typeof photo.seriesId === 'string' && photo.seriesId, `Missing seriesId for ${photo.id}`);
    assert(Number.isInteger(photo.width) && photo.width > 0 && Number.isInteger(photo.height) && photo.height > 0, `Invalid dimensions for ${photo.id}`);
    assert(typeof photo.alt === 'string' && photo.alt.trim(), `Missing alt text for ${photo.id}`);
    assert(Array.isArray(photo.variants) && photo.variants.length > 0, `Missing variants for ${photo.id}`);
    let hasHdrJpeg = false;
    const dimensions = new Map(); const formatWidths = new Set();
    for (const variant of photo.variants) {
      const keys = Object.prototype.hasOwnProperty.call(variant, 'hdr') ? ['src', 'width', 'height', 'format', 'hdr'] : ['src', 'width', 'height', 'format'];
      exactKeys(variant, keys, `variant for ${photo.id}`);
      assert(Number.isInteger(variant.width) && variant.width > 0 && Number.isInteger(variant.height) && variant.height > 0, `Invalid variant dimensions for ${photo.id}`);
      assert(variant.width <= photo.width && variant.height <= photo.height, `Variant upscales ${photo.id}`);
      const crossProductError = Math.abs(variant.width * photo.height - variant.height * photo.width);
      assert(crossProductError <= Math.max(photo.width, photo.height), `Variant aspect ratio changed: ${photo.id}`);
      assert(['webp', 'jpeg'].includes(variant.format), `Invalid format for ${photo.id}`);
      assert(!formatWidths.has(`${variant.format}:${variant.width}`), `Duplicate ${variant.format} width for ${photo.id}`); formatWidths.add(`${variant.format}:${variant.width}`);
      const variantPath = publicPhotoPath(variant.src);
      assert(!variantPaths.has(variantPath), `Duplicate photo resource: ${variantPath}`); variantPaths.add(variantPath);
      assert(variant.format === 'jpeg' ? /\.jpe?g$/i.test(variantPath) : /\.webp$/i.test(variantPath), `Format/path mismatch: ${variantPath}`);
      if (variant.hdr !== undefined) assert(typeof variant.hdr === 'boolean' && variant.format === 'jpeg', `HDR variant must be JPEG: ${photo.id}`);
      hasHdrJpeg ||= variant.hdr === true;
      const dimension = `${variant.width}x${variant.height}`;
      const formats = dimensions.get(dimension) ?? new Set(); formats.add(variant.format); dimensions.set(dimension, formats);
    }
    if (hasHdrJpeg) {
      assert.equal(photo.category, 'Landscapes', `HDR photo must be Landscapes: ${photo.id}`);
      for (const variant of photo.variants) assert(variant.format === 'jpeg' && variant.hdr === true, `HDR photos may contain only HDR JPEG variants: ${photo.id}`);
    } else {
      for (const [dimension, formats] of dimensions) assert(formats.has('jpeg'), `SDR dimension requires a native JPEG preview: ${photo.id} ${dimension}`);
    }
    const original = photo.original;
    exactKeys(original, Object.prototype.hasOwnProperty.call(original ?? {}, 'hdr') ? ['src', 'width', 'height', 'bytes', 'hdr'] : ['src', 'width', 'height', 'bytes'], `original for ${photo.id}`);
    const originalPrefix = 'https://github.com/Cisanotheraccount/Cisanotheraccount.github.io/releases/download/photography-2026-09-21/';
    assert.equal(original.src, originalPrefix + photo.id + '.jpg', `Original must use the reviewed GitHub release: ${photo.id}`);
    assert.equal(original.width, photo.width, `Original width changed: ${photo.id}`);
    assert.equal(original.height, photo.height, `Original height changed: ${photo.id}`);
    assert(Number.isSafeInteger(original.bytes) && original.bytes > 0 && original.bytes < 2 * 1024 ** 3, `Invalid original file size: ${photo.id}`);
    assert.equal(original.hdr === true, hasHdrJpeg, `Original and preview HDR mismatch: ${photo.id}`);
    for (const variant of photo.variants) assert(Math.max(variant.width, variant.height) <= 1600, `Preview exceeds 1600 pixels: ${photo.id}`);
    hdrPhotos += hasHdrJpeg;
  }
  assert.equal(landscapes, 32, 'Catalog must contain 32 Landscapes photos');
  assert.equal(live, 21, 'Catalog must contain 21 Live photos');
  assert.equal(hdrPhotos, 2, 'Catalog must contain exactly 2 photos with HDR JPEG variants');
  assert(ids.has(catalog.heroPhotoId), 'heroPhotoId is not in photos');
  const seriesIds = new Set(); const assigned = new Set();
  for (const series of catalog.series) {
    exactKeys(series, ['id', 'title', 'category', 'coverId', 'photoIds'], `series ${series?.id ?? ''}`);
    assert(typeof series.id === 'string' && series.id && !seriesIds.has(series.id), `Invalid or duplicate series id: ${series.id}`); seriesIds.add(series.id);
    assert(typeof series.title === 'string' && series.title.trim(), `Missing series title: ${series.id}`);
    assert(['Landscapes', 'Live'].includes(series.category), `Invalid series category: ${series.id}`);
    assert(typeof series.coverId === 'string' && Array.isArray(series.photoIds) && series.photoIds.length > 0 && series.photoIds.includes(series.coverId), `Invalid cover for series: ${series.id}`);
    for (const id of series.photoIds) {
      const photo = catalog.photos.find(item => item.id === id);
      assert(photo && photo.seriesId === series.id && photo.category === series.category && !assigned.has(id), `Invalid series membership: ${id}`);
      assigned.add(id);
    }
  }
  assert.equal(assigned.size, catalog.photos.length, 'Every photo must appear in exactly one series');
  return { photos: catalog.photos.length, landscapes, live, hdrPhotos, variantPaths };
}

export async function readPhotographyRelease(releaseRoot = path.join(projectRoot, 'public')) {
  const manifestFile = path.join(releaseRoot, releaseManifestPath);
  const manifest = JSON.parse(await readFile(manifestFile, 'utf8'));
  exactKeys(manifest, ['version', 'catalog', 'files'], 'photography release manifest');
  assert.equal(manifest.version, 1, 'Unsupported photography release manifest');
  exactKeys(manifest.catalog, ['path', 'photos', 'landscapes', 'live', 'hdrPhotos'], 'release catalog summary');
  assert.equal(manifest.catalog.path, catalogOutputPath, 'Unexpected public catalog location');
  assert(Array.isArray(manifest.files) && manifest.files.length > 1, 'Photography release manifest has no files');
  const seen = new Set();
  for (const file of manifest.files) {
    exactKeys(file, ['path', 'source', 'bytes', 'sha256', 'mime'], `release file ${file?.path ?? ''}`);
    safePath(file.path, 'release output path'); safePath(file.source, 'release source path');
    assert((file.path === photoEntry || file.path.startsWith(photoNamespace)) && !seen.has(file.path), `Release may only own photography paths: ${file.path}`); seen.add(file.path);
    assert(file.source.startsWith(photoNamespace), `Release source must remain in photography assets: ${file.source}`);
    assert(Number.isInteger(file.bytes) && file.bytes >= 0 && /^[a-f0-9]{64}$/.test(file.sha256), `Invalid resource receipt: ${file.path}`);
    assert.equal(file.mime, mimeFor(file.path), `Incorrect MIME receipt: ${file.path}`);
  }
  assert(seen.has(photoEntry) && seen.has(catalogOutputPath), 'Release must include photography entry and catalog');
  for (const background of photographyBackgrounds) {
    assert(seen.has(background.path), `Release must include photography background: ${background.path}`);
  }
  const catalog = JSON.parse(await readFile(path.join(releaseRoot, catalogOutputPath), 'utf8'));
  const summary = validatePhotographyCatalog(catalog);
  assert.deepEqual({ photos: summary.photos, landscapes: summary.landscapes, live: summary.live, hdrPhotos: summary.hdrPhotos }, { photos: manifest.catalog.photos, landscapes: manifest.catalog.landscapes, live: manifest.catalog.live, hdrPhotos: manifest.catalog.hdrPhotos }, 'Catalog summary changed');
  for (const resource of summary.variantPaths) assert(seen.has(resource), `Catalog resource missing from release: ${resource}`);
  return { manifest, catalog, summary };
}

export async function verifyPhotographyRelease(releaseRoot = path.join(projectRoot, 'public')) {
  const release = await readPhotographyRelease(releaseRoot);
  for (const file of release.manifest.files) {
    const bytes = await readFile(path.join(releaseRoot, file.source));
    assert.equal(bytes.length, file.bytes, `Resource size changed: ${file.path}`);
    assert.equal(sha256(bytes), file.sha256, `Resource hash changed: ${file.path}`);
  }
  return release;
}

async function filesUnder(directory, prefix = '') {
  const entries = await readdir(path.join(directory, prefix), { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
    assert(rel !== '.git' && !rel.startsWith('.git/'), 'Baseline directory must not contain Git metadata');
    assert(!entry.isSymbolicLink(), `Symlinks are not allowed in a release: ${rel}`);
    if (entry.isDirectory()) files.push(...await filesUnder(directory, rel));
    else if (entry.isFile()) files.push(rel);
  }
  return files.sort();
}
export async function snapshotNonPhotography(directory) {
  const records = [];
  for (const rel of await filesUnder(directory)) {
    if (rel === photoEntry || rel.startsWith(photoNamespace)) continue;
    const bytes = await readFile(path.join(directory, rel)); records.push({ path: rel, bytes: bytes.length, sha256: sha256(bytes) });
  }
  return records;
}
export async function assertNonPhotographySnapshot(directory, snapshot) {
  assert.deepEqual(await snapshotNonPhotography(directory), snapshot, 'A non-photography baseline file changed during photography release');
}

/** Overlay the reviewed, committed public photography files on an already restored site root. */
export async function applyPhotographyRelease(outDir, { releaseRoot = path.join(projectRoot, 'public') } = {}) {
  assert(path.isAbsolute(outDir) && path.isAbsolute(releaseRoot), 'applyPhotographyRelease requires absolute directories');
  assertSeparate(outDir, releaseRoot, 'Output and committed release');
  const release = await verifyPhotographyRelease(releaseRoot);
  // This helper owns only the route entry; other photography pages are baseline-owned.
  await rm(path.join(outDir, photoEntry), { force: true });
  await rm(path.join(outDir, 'photography-assets'), { recursive: true, force: true });
  for (const file of release.manifest.files) {
    const destination = path.join(outDir, file.path);
    await mkdir(path.dirname(destination), { recursive: true });
    await copyFile(path.join(releaseRoot, file.source), destination);
  }
  return release;
}

export async function verifyAppliedPhotographyRelease(outDir, { releaseRoot = path.join(projectRoot, 'public') } = {}) {
  const release = await verifyPhotographyRelease(releaseRoot);
  for (const file of release.manifest.files) {
    const bytes = await readFile(path.join(outDir, file.path));
    assert.equal(bytes.length, file.bytes, `Packaged resource size changed: ${file.path}`);
    assert.equal(sha256(bytes), file.sha256, `Packaged resource hash changed: ${file.path}`);
  }
  return release;
}

/** Create a complete candidate by copying an explicit published baseline, then applying photography only. */
export async function overlayPhotographyRelease({ baselineDir, outDir, releaseRoot = path.join(projectRoot, 'public') }) {
  assert(path.isAbsolute(baselineDir) && path.isAbsolute(outDir) && path.isAbsolute(releaseRoot), 'Baseline, output, and release must be absolute paths');
  assertSeparate(baselineDir, outDir, 'Baseline and output');
  assertSeparate(releaseRoot, outDir, 'Committed release and output');
  const snapshot = await snapshotNonPhotography(baselineDir);
  await rm(outDir, { recursive: true, force: true });
  await mkdir(outDir, { recursive: true });
  // Node cp preserves content but never follows release-controlled symlinks (checked in snapshot).
  const { cp } = await import('node:fs/promises'); await cp(baselineDir, outDir, { recursive: true, dereference: false });
  await applyPhotographyRelease(outDir, { releaseRoot });
  await assertNonPhotographySnapshot(outDir, snapshot);
  return { release: await verifyAppliedPhotographyRelease(outDir, { releaseRoot }), preservedFiles: snapshot.length };
}
