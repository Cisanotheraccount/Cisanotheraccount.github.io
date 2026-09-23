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
  const photos = Array.from({ length: 81 }, (_, index) => {
    const live = index >= 60;
    const id = `gxc-${(index + 1).toString(16).padStart(12, '0')}`;
    const category = live ? 'Live' : 'Landscapes';
    const previewNamespace = live ? 'selected-20260921' : 'landscape-20260923';
    const previewName = live ? `${id}.jpg` : `${id}-1600.jpg`;
    const originalTag = live ? 'photography-2026-09-21' : 'photography-landscape-2026-09-23';
    return { id, category, seriesId: live ? 'live' : 'landscape-color-flow', width: 1200, height: 800, alt: `Photo ${index + 1}`, variants: [{ src: `/photography-assets/${previewNamespace}/${previewName}`, width: 900, height: 600, format: 'jpeg' }], original: { src: `https://github.com/Cisanotheraccount/Cisanotheraccount.github.io/releases/download/${originalTag}/${id}.jpg`, width: 1200, height: 800, bytes: 2000000 } };
  });
  return { version: 'landscape-20260923', heroPhotoId: photos[0].id, photos, series: [
    { id: 'landscape-color-flow', title: 'Landscape', category: 'Landscapes', coverId: photos[0].id, photoIds: photos.slice(0, 60).map(photo => photo.id) },
    { id: 'live', title: 'Live', category: 'Live', coverId: photos[60].id, photoIds: photos.slice(60).map(photo => photo.id) },
  ] };
}
try {
  const data = catalog(); const stats = validatePhotographyCatalog(data);
  assert.deepEqual({ photos: stats.photos, landscapes: stats.landscapes, live: stats.live, hdrPhotos: stats.hdrPhotos }, { photos: 81, landscapes: 60, live: 21, hdrPhotos: 0 });
  const panorama = catalog(); panorama.photos[2].width = 8192; panorama.photos[2].height = 1026; for (const variant of panorama.photos[2].variants) { variant.width = 480; variant.height = 60; } panorama.photos[2].original.width = 8192; panorama.photos[2].original.height = 1026; validatePhotographyCatalog(panorama);
  const badOrigin = catalog(); badOrigin.photos[0].original.src = 'https://example.com/private.jpg'; assert.throws(() => validatePhotographyCatalog(badOrigin), /reviewed GitHub release/);
  const landscapeInLiveNamespace = catalog(); landscapeInLiveNamespace.photos[0].variants[0].src = `/photography-assets/selected-20260921/${landscapeInLiveNamespace.photos[0].id}.jpg`; assert.throws(() => validatePhotographyCatalog(landscapeInLiveNamespace), /Landscapes preview must use its reviewed public namespace/);
  const liveInLandscapeNamespace = catalog(); liveInLandscapeNamespace.photos[60].variants[0].src = `/photography-assets/landscape-20260923/${liveInLandscapeNamespace.photos[60].id}-1600.jpg`; assert.throws(() => validatePhotographyCatalog(liveInLandscapeNamespace), /Live preview must use its reviewed public namespace/);
  const landscapeInLiveRelease = catalog(); landscapeInLiveRelease.photos[0].original.src = `https://github.com/Cisanotheraccount/Cisanotheraccount.github.io/releases/download/photography-2026-09-21/${landscapeInLiveRelease.photos[0].id}.jpg`; assert.throws(() => validatePhotographyCatalog(landscapeInLiveRelease), /reviewed GitHub release/);
  const liveInLandscapeRelease = catalog(); liveInLandscapeRelease.photos[60].original.src = `https://github.com/Cisanotheraccount/Cisanotheraccount.github.io/releases/download/photography-landscape-2026-09-23/${liveInLandscapeRelease.photos[60].id}.jpg`; assert.throws(() => validatePhotographyCatalog(liveInLandscapeRelease), /reviewed GitHub release/);
  const extraLandscapeSeries = catalog(); const movedId = extraLandscapeSeries.series[0].photoIds.pop(); extraLandscapeSeries.photos.find(photo => photo.id === movedId).seriesId = 'landscape-secondary'; extraLandscapeSeries.series.push({ id: 'landscape-secondary', title: 'Landscape two', category: 'Landscapes', coverId: movedId, photoIds: [movedId] }); assert.throws(() => validatePhotographyCatalog(extraLandscapeSeries), /exactly one Landscape series/);
  const resources = [{ path: 'photography/index.html', source: 'photography-assets/app/photography.index.html', content: '<!doctype html><script src="/photography-assets/app/app.js"></script>' }, { path: catalogOutputPath, source: catalogOutputPath, content: JSON.stringify(data) }, { path: 'photography-assets/app/app.js', source: 'photography-assets/app/app.js', content: 'console.log("photo")' }];
  for (const photo of data.photos) for (const variant of photo.variants) resources.push({ path: variant.src.slice(1), source: variant.src.slice(1), content: variant.src });
  for (const background of photographyBackgrounds) resources.push({ path: background.path, source: background.path, content: `native-${path.basename(background.path)}` });
  for (const file of resources) await put(publicRoot, file.source, file.content);
  const manifest = { version: 1, catalog: { path: catalogOutputPath, photos: 81, landscapes: 60, live: 21, hdrPhotos: 0 }, files: resources.map(file => ({ path: file.path, source: file.source, bytes: Buffer.byteLength(file.content), sha256: digest(file.content), mime: file.path.endsWith('.html') ? 'text/html; charset=utf-8' : file.path.endsWith('.json') ? 'application/json; charset=utf-8' : file.path.endsWith('.js') ? 'text/javascript; charset=utf-8' : file.path.endsWith('.jpg') ? 'image/jpeg' : 'image/webp' })) };
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
  const hdr = structuredClone(data); hdr.photos[0].variants[0].hdr = true; hdr.photos[0].original.hdr = true; assert.throws(() => validatePhotographyCatalog(hdr), /only SDR photos/);
  const rounded = structuredClone(data); rounded.photos[2].width = 8192; rounded.photos[2].height = 5464; for (const variant of rounded.photos[2].variants) { variant.width = 480; variant.height = 320; } rounded.photos[2].original.width = 8192; rounded.photos[2].original.height = 5464; validatePhotographyCatalog(rounded);
  const aspect = structuredClone(data); aspect.photos[2].variants[0].height = 590; assert.throws(() => validatePhotographyCatalog(aspect), /aspect ratio/);
  const upscale = structuredClone(data); upscale.photos[2].variants[0].width = 1800; upscale.photos[2].variants[0].height = 1200; assert.throws(() => validatePhotographyCatalog(upscale), /upscales/);
  const duplicate = structuredClone(data); duplicate.photos[2].variants.push(structuredClone(duplicate.photos[2].variants[0])); assert.throws(() => validatePhotographyCatalog(duplicate), /Duplicate jpeg width/);
  await assert.rejects(() => applyPhotographyRelease(publicRoot, { releaseRoot: publicRoot }), /must not overlap/);
  await assert.rejects(() => overlayPhotographyRelease({ baselineDir: baseline, outDir: path.join(baseline, 'child'), releaseRoot: publicRoot }), /must not overlap/);
  await assert.rejects(() => overlayPhotographyRelease({ baselineDir: baseline, outDir: output, releaseRoot: path.join(output, 'release') }), /must not overlap/);
  await put(baseline, '.git/config', 'must-not-copy'); await assert.rejects(() => overlayPhotographyRelease({ baselineDir: baseline, outDir: output, releaseRoot: publicRoot }), /Git metadata/);
  console.log('Photography release checks passed: 81-photo SDR catalog, one continuous Landscape series, category-isolated preview/original URLs, proportional previews, byte-exact native background copies, dependency isolation, traversal guards, Git baseline rejection, and non-photography baseline preservation.');
} finally { await rm(temp, { recursive: true, force: true }); }
