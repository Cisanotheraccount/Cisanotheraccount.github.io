import { build } from 'vite';
import react from '@vitejs/plugin-react';
import assert from 'node:assert/strict';
import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { projectRoot, restoreBaseline, verifyBaseline } from './release-baseline.mjs';
import { verifyThumbnailRelease } from './thumbnail-release.mjs';
import { verifyBackgroundRelease } from './background-release.mjs';
import { verifyEntryRelease } from './entry-release.mjs';
import { shotFlowNamespaces, verifyShotFlowRelease } from './shotflow-release.mjs';
import { applyPhotographyRelease, photoEntry, verifyAppliedPhotographyRelease, verifyPhotographyRelease } from './photography-release.mjs';

// Each version has a separate Rollup graph. The approved 2.0 graph is an exact
// published snapshot, including old immutable bundles still used by cached tabs.
const output = path.join(projectRoot, 'dist');
const staging = path.join(projectRoot, '.site-build/version-2-1');
const baseline = await verifyBaseline();
const thumbnails = await verifyThumbnailRelease(path.join(projectRoot, 'public'));
const backgrounds = await verifyBackgroundRelease(path.join(projectRoot, 'public'));
const entry = await verifyEntryRelease(path.join(projectRoot, 'public'));
const shotFlow = await verifyShotFlowRelease(path.join(projectRoot, 'public'));
const photography = await verifyPhotographyRelease(path.join(projectRoot, 'public'));
const baselinePaths = new Set(baseline.files.map(file => file.path));
for (const file of backgrounds.files) assert(!baselinePaths.has(file), '2.1 backgrounds cannot replace a frozen 2.0 asset');
for (const file of entry.files) assert(!baselinePaths.has(file), '2.1 entry assets cannot replace a frozen 2.0 asset');
for (const file of shotFlow.files) assert(!baselinePaths.has(file), '2.1 ShotFlow assets cannot replace a frozen 2.0 asset');
for (const file of photography.manifest.files) {
  assert(!baselinePaths.has(file.path) || file.path === photoEntry, 'Photography may only replace its registered route entry');
}
for (const file of thumbnails.files.filter(file => shotFlowNamespaces.some(namespace => file.startsWith(namespace)))) {
  assert(shotFlow.files.includes(file), 'New ShotFlow thumbnails must also belong to the capture manifest');
}
await rm(staging, { recursive: true, force: true });
try {
  await build({
    configFile: false,
    root: projectRoot,
    base: '/',
    plugins: [react()],
    // Resolve existing absolute font/public URLs exactly as 2.0 does, but never
    // let this build copy or replace shared assets. The baseline owns them.
    publicDir: path.join(projectRoot, 'public'),
    build: {
      outDir: staging,
      emptyOutDir: true,
      copyPublicDir: false,
      assetsDir: 'assets/2-1',
      rollupOptions: { input: { version21: path.join(projectRoot, 'v2-1/index.html') } },
    },
  });
  // Preserve the last working dist if compilation fails; only replace it after
  // the new graph is available and all shared source assets pass their guard.
  await verifyBaseline();
  assert.deepEqual((await verifyThumbnailRelease(path.join(projectRoot, 'public'))).manifest, thumbnails.manifest,
    'Thumbnail assets changed during compilation; retry with a consistent manifest');
  assert.deepEqual((await verifyBackgroundRelease(path.join(projectRoot, 'public'))).manifest, backgrounds.manifest,
    'Background assets changed during compilation; retry with a consistent manifest');
  assert.deepEqual((await verifyEntryRelease(path.join(projectRoot, 'public'))).manifest, entry.manifest,
    'Entry assets changed during compilation; retry with a consistent manifest');
  assert.deepEqual((await verifyShotFlowRelease(path.join(projectRoot, 'public'))).manifest, shotFlow.manifest,
    'ShotFlow assets changed during compilation; retry with a consistent manifest');
  assert.deepEqual((await verifyPhotographyRelease(path.join(projectRoot, 'public'))).manifest, photography.manifest,
    'Photography release changed during compilation; retry with a consistent receipt');
  await rm(output, { recursive: true, force: true });
  await restoreBaseline(output);
  await cp(path.join(staging, 'assets/2-1'), path.join(output, 'assets/2-1'), { recursive: true });
  for (const file of new Set([...thumbnails.files, ...backgrounds.files, ...entry.files, ...shotFlow.files])) {
    await mkdir(path.dirname(path.join(output, file)), { recursive: true });
    await cp(path.join(projectRoot, 'public', file), path.join(output, file));
  }
  await applyPhotographyRelease(output, { releaseRoot: path.join(projectRoot, 'public') });
  const html = await readFile(path.join(staging, 'v2-1/index.html'), 'utf8');
  for (const route of ['galaxci/2.1', 'v2-1']) {
    await mkdir(path.join(output, route), { recursive: true });
    await writeFile(path.join(output, route, 'index.html'), html);
  }
  await verifyBaseline(output, { photographyOverlay: true, releaseRoot: path.join(projectRoot, 'public') });
  assert.deepEqual((await verifyThumbnailRelease(output)).manifest, thumbnails.manifest,
    'Packaged thumbnail assets must match the manifest used during compilation');
  assert.deepEqual((await verifyBackgroundRelease(output)).manifest, backgrounds.manifest,
    'Packaged background assets must match the manifest used during compilation');
  assert.deepEqual((await verifyEntryRelease(output)).manifest, entry.manifest,
    'Packaged entry assets must match the manifest used during compilation');
  assert.deepEqual((await verifyShotFlowRelease(output)).manifest, shotFlow.manifest,
    'Packaged ShotFlow assets must match the manifest used during compilation');
  assert.deepEqual((await verifyAppliedPhotographyRelease(output, { releaseRoot: path.join(projectRoot, 'public') })).manifest, photography.manifest,
    'Packaged photography release must match the receipt used during compilation');
  console.log(`Built independent 2.1 at /galaxci/2.1/ and /v2-1/ with ${thumbnails.files.length - 1} verified mobile thumbnails, ${backgrounds.files.length - 1} new responsive backgrounds, ${entry.files.length - 1} entry assets, ${shotFlow.files.length - 1} ShotFlow assets and ${photography.summary.photos} verified photography selections. All ${baseline.files.length - 1} unchanged 2.0 files and the receipt-verified photography entry are preserved.`);
} finally {
  await rm(staging, { recursive: true, force: true });
}
