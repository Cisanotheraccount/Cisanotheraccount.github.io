import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { applyPhotographyRelease, catalogOutputPath, overlayPhotographyRelease, photographyBackgrounds, projectRoot, releaseManifestPath, validatePhotographyCatalog } from './photography-release.mjs';

const temp = await mkdtemp(path.join(os.tmpdir(), 'photography-release-'));
const publicRoot = path.join(temp, 'public'); const baseline = path.join(temp, 'baseline'); const output = path.join(temp, 'output');
const digest = text => createHash('sha256').update(text).digest('hex');
async function put(root, file, content) { const target = path.join(root, file); await mkdir(path.dirname(target), { recursive: true }); await writeFile(target, content); }
function catalog() {
  const photos = Array.from({ length: 53 }, (_, index) => {
    const live = index >= 32; const id = `photo-${index + 1}`; const hdr = index === 0 || index === 1;
    const variants = hdr
      ? [{ src: `/photography-assets/selected-20260921/${id}-hdr.jpg`, width: 900, height: 600, format: 'jpeg', hdr: true }]
      : [{ src: `/photography-assets/selected-20260921/${id}.webp`, width: 900, height: 600, format: 'webp' }, { src: `/photography-assets/selected-20260921/${id}.jpg`, width: 900, height: 600, format: 'jpeg' }];
    return { id, category: live ? 'Live' : 'Landscapes', seriesId: live ? 'live' : 'landscapes', width: 1200, height: 800, alt: `Photo ${index + 1}`, variants, original: { src: `https://github.com/Cisanotheraccount/Cisanotheraccount.github.io/releases/download/photography-2026-09-21/${id}.jpg`, width: 1200, height: 800, bytes: 2000000, ...(hdr ? { hdr: true } : {}) } };
  });
  return { version: 'selected-20260921', heroPhotoId: 'photo-1', photos, series: [
    { id: 'landscapes', title: 'Landscapes', category: 'Landscapes', coverId: 'photo-1', photoIds: photos.slice(0, 32).map(photo => photo.id) },
    { id: 'live', title: 'Live', category: 'Live', coverId: 'photo-33', photoIds: photos.slice(32).map(photo => photo.id) },
  ] };
}
try {
  const data = catalog(); const stats = validatePhotographyCatalog(data);
  assert.deepEqual({ photos: stats.photos, landscapes: stats.landscapes, live: stats.live, hdrPhotos: stats.hdrPhotos }, { photos: 53, landscapes: 32, live: 21, hdrPhotos: 2 });
  const panorama = catalog(); panorama.photos[2].width = 8192; panorama.photos[2].height = 1026; for (const variant of panorama.photos[2].variants) { variant.width = 480; variant.height = 60; } panorama.photos[2].original.width = 8192; panorama.photos[2].original.height = 1026; validatePhotographyCatalog(panorama);
  const jpegOnly = catalog(); for (const photo of jpegOnly.photos) photo.variants = photo.variants.filter(v => v.format === 'jpeg'); validatePhotographyCatalog(jpegOnly);
  const badOrigin = catalog(); badOrigin.photos[0].original.src = 'https://example.com/private.jpg'; assert.throws(() => validatePhotographyCatalog(badOrigin), /reviewed GitHub release/);
  const wrongHdr = catalog(); wrongHdr.photos[0].original.hdr = false; assert.throws(() => validatePhotographyCatalog(wrongHdr), /HDR mismatch/);
  const resources = [{ path: 'photography/index.html', source: 'photography-assets/app/photography.index.html', content: '<!doctype html><script src="/photography-assets/app/app.js"></script>' }, { path: catalogOutputPath, source: catalogOutputPath, content: JSON.stringify(data) }, { path: 'photography-assets/app/app.js', source: 'photography-assets/app/app.js', content: 'console.log("photo")' }];
  for (const photo of data.photos) for (const variant of photo.variants) resources.push({ path: variant.src.slice(1), source: variant.src.slice(1), content: variant.src });
  for (const background of photographyBackgrounds) resources.push({ path: background.path, source: background.path, content: `native-${path.basename(background.path)}` });
  for (const file of resources) await put(publicRoot, file.source, file.content);
  const manifest = { version: 1, catalog: { path: catalogOutputPath, photos: 53, landscapes: 32, live: 21, hdrPhotos: 2 }, files: resources.map(file => ({ path: file.path, source: file.source, bytes: Buffer.byteLength(file.content), sha256: digest(file.content), mime: file.path.endsWith('.html') ? 'text/html; charset=utf-8' : file.path.endsWith('.json') ? 'application/json; charset=utf-8' : file.path.endsWith('.js') ? 'text/javascript; charset=utf-8' : file.path.endsWith('.jpg') ? 'image/jpeg' : 'image/webp' })) };
  await put(publicRoot, releaseManifestPath, JSON.stringify(manifest));
  await put(baseline, 'photography/other.html', 'legacy-photography-page'); await put(baseline, 'galaxci/index.html', 'frozen-two'); await put(baseline, 'v2-3/index.html', 'independent-two-three'); await put(baseline, 'fonts/Inter.woff2', 'font-bytes'); await put(baseline, 'portfolio/background.webp', 'background');
  for (const background of photographyBackgrounds) await put(baseline, background.nativeSource, `baseline-${path.basename(background.nativeSource)}`);
  const result = await overlayPhotographyRelease({ baselineDir: baseline, outDir: output, releaseRoot: publicRoot });
  assert.equal(result.preservedFiles, 8); assert.equal(await readFile(path.join(output, 'galaxci/index.html'), 'utf8'), 'frozen-two');
  assert.equal(await readFile(path.join(output, 'v2-3/index.html'), 'utf8'), 'independent-two-three'); assert.equal(await readFile(path.join(output, 'photography/other.html'), 'utf8'), 'legacy-photography-page'); assert.equal(await readFile(path.join(output, 'photography/index.html'), 'utf8'), resources[0].content);
  for (const background of photographyBackgrounds) {
    assert.equal(await readFile(path.join(output, background.path), 'utf8'), `native-${path.basename(background.path)}`);
    assert.equal(await readFile(path.join(output, background.nativeSource), 'utf8'), `baseline-${path.basename(background.nativeSource)}`);
    const nativeBytes = await readFile(path.join(projectRoot, 'public', background.nativeSource));
    const namespacedBytes = await readFile(path.join(projectRoot, 'public', background.path));
    assert.equal(digest(namespacedBytes), digest(nativeBytes), `Namespaced background is not a byte-exact native copy: ${background.path}`);
  }
  await assert.rejects(() => applyPhotographyRelease(output, { releaseRoot: path.join(temp, 'missing') }));
  const traversal = structuredClone(manifest); traversal.files[0].source = '../outside.html'; await put(publicRoot, releaseManifestPath, JSON.stringify(traversal)); await assert.rejects(() => applyPhotographyRelease(output, { releaseRoot: publicRoot }), /Unsafe/); await put(publicRoot, releaseManifestPath, JSON.stringify(manifest));
  const missingBackground = structuredClone(manifest); missingBackground.files = missingBackground.files.filter(file => file.path !== photographyBackgrounds[0].path); await put(publicRoot, releaseManifestPath, JSON.stringify(missingBackground)); await assert.rejects(() => applyPhotographyRelease(output, { releaseRoot: publicRoot }), /must include photography background/); await put(publicRoot, releaseManifestPath, JSON.stringify(manifest));
  const leakedDependency = structuredClone(manifest); leakedDependency.files.find(file => file.path === photographyBackgrounds[0].path).source = photographyBackgrounds[0].nativeSource; await put(publicRoot, releaseManifestPath, JSON.stringify(leakedDependency)); await assert.rejects(() => applyPhotographyRelease(output, { releaseRoot: publicRoot }), /must remain in photography assets/); await put(publicRoot, releaseManifestPath, JSON.stringify(manifest));
  const invalid = structuredClone(data); invalid.photos[0].sourcePath = '/private/source.raw'; assert.throws(() => validatePhotographyCatalog(invalid), /Unexpected/);
  const liveHdr = structuredClone(data); liveHdr.photos[32].variants = [{ src: '/photography-assets/selected-20260921/live-hdr.jpg', width: 900, height: 600, format: 'jpeg', hdr: true }]; assert.throws(() => validatePhotographyCatalog(liveHdr), /HDR photo must be Landscapes/);
  const mixedHdr = structuredClone(data); mixedHdr.photos[0].variants.push({ src: '/photography-assets/selected-20260921/mixed.webp', width: 600, height: 400, format: 'webp' }); assert.throws(() => validatePhotographyCatalog(mixedHdr), /only HDR JPEG/);
  const rounded = structuredClone(data); rounded.photos[2].width = 8192; rounded.photos[2].height = 5464; for (const variant of rounded.photos[2].variants) { variant.width = 480; variant.height = 320; } rounded.photos[2].original.width = 8192; rounded.photos[2].original.height = 5464; validatePhotographyCatalog(rounded);
  const aspect = structuredClone(data); aspect.photos[2].variants[0].height = 590; assert.throws(() => validatePhotographyCatalog(aspect), /aspect ratio/);
  const upscale = structuredClone(data); upscale.photos[2].variants[0].width = 1800; upscale.photos[2].variants[0].height = 1200; assert.throws(() => validatePhotographyCatalog(upscale), /upscales/);
  const duplicate = structuredClone(data); duplicate.photos[2].variants.push({ src: '/photography-assets/selected-20260921/duplicate.webp', width: 900, height: 600, format: 'webp' }); assert.throws(() => validatePhotographyCatalog(duplicate), /Duplicate webp width/);
  await assert.rejects(() => applyPhotographyRelease(publicRoot, { releaseRoot: publicRoot }), /must not overlap/);
  await assert.rejects(() => overlayPhotographyRelease({ baselineDir: baseline, outDir: path.join(baseline, 'child'), releaseRoot: publicRoot }), /must not overlap/);
  await assert.rejects(() => overlayPhotographyRelease({ baselineDir: baseline, outDir: output, releaseRoot: path.join(output, 'release') }), /must not overlap/);
  await put(baseline, '.git/config', 'must-not-copy'); await assert.rejects(() => overlayPhotographyRelease({ baselineDir: baseline, outDir: output, releaseRoot: publicRoot }), /Git metadata/);
  console.log('Photography release checks passed: catalog completeness, HDR JPEG receipts, byte-exact native background copies, dependency isolation, traversal guards, Git baseline rejection, and non-photography baseline preservation.');
} finally { await rm(temp, { recursive: true, force: true }); }
