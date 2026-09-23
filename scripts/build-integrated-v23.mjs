import { build } from 'vite';
import { applyZhRelease } from './zh-release.mjs';
import react from '@vitejs/plugin-react';
import assert from 'node:assert/strict';
import { cp, mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { root, output23, buildManifestPath23, sha256, captureCompiled23, copyPreviousRelease, verifyPreviousRelease, verifyNewAssets, verifyOutput23 } from './version23-release.mjs';
import { verifyEntry23Release } from './entry-release-v23.mjs';
import { verifyHarvardCaseRelease } from './harvard-case-release-v23.mjs';
import { applyPhotographyRelease, verifyPhotographyRelease } from './photography-release.mjs';
import { thumbnailRuntimeManifest, assertPublicRuntime } from './zh-runtime-data.mjs';

const staging = path.join(root, '.site-build/integrated-2-3');
const candidate = path.join(root, '.site-build/integrated-2-3-complete');
const previousOutput = path.join(root, '.site-build/integrated-2-3-previous');
const contentSource = path.join(root, 'src/v2-3/introMeCaseContent.ts');
const contentSha = sha256(await readFile(contentSource));
await verifyPreviousRelease();
const assets = await verifyNewAssets();
await verifyEntry23Release(path.join(root, 'public'));
await verifyHarvardCaseRelease(path.join(root, 'public'));
const photography = await verifyPhotographyRelease(path.join(root, 'public'));
await rm(staging, { recursive: true, force: true });
await rm(candidate, { recursive: true, force: true });
try {
  await build({ configFile: false, root, base: '/', plugins: [{
    name: 'galaxci-public-thumbnail-data',
    enforce: 'pre',
    async load(id) {
      if (id !== path.join(root, 'public/v2-1/thumbnails/manifest.json')) return null;
      // Keep editorial provenance in the source manifest, outside browser data.
      return JSON.stringify(thumbnailRuntimeManifest(JSON.parse(await readFile(id, 'utf8'))));
    },
  }, react()], cacheDir: path.join(root, '.site-cache/vite-2-3-integrated'), publicDir: path.join(root, 'public'),
    build: { outDir: staging, emptyOutDir: true, copyPublicDir: false, assetsDir: 'assets/2-3', rollupOptions: { input: { version23: path.join(root, 'v2-3/index.html') } } } });
  assert.deepEqual(await verifyNewAssets(), assets, 'Assets changed during compilation');
  assert.deepEqual((await verifyPhotographyRelease(path.join(root, 'public'))).manifest, photography.manifest,
    'Photography release changed during compilation; retry with a consistent receipt');
  await copyPreviousRelease(candidate);
  await cp(path.join(staging, 'assets/2-3'), path.join(candidate, 'assets/2-3'), { recursive: true });
  for (const file of assets.files) {
    const dest = path.join(candidate, file.path);
    await mkdir(path.dirname(dest), { recursive: true });
    await cp(path.join(root, 'public', file.path), dest);
  }
  await applyPhotographyRelease(candidate, { releaseRoot: path.join(root, 'public') });
  const html = await readFile(path.join(staging, 'v2-3/index.html'), 'utf8');
  for (const route of ['galaxci/2.3', 'v2-3']) {
    await mkdir(path.join(candidate, route), { recursive: true });
    await writeFile(path.join(candidate, route, 'index.html'), html);
  }
  assert.equal(sha256(await readFile(contentSource)), contentSha, 'IntroMe changed during compilation');
  const compiled = await captureCompiled23(candidate, contentSha);
  for (const file of compiled.files) {
    if (/\.(?:js|css|html)$/.test(file.path)) assertPublicRuntime(await readFile(path.join(candidate, file.path), 'utf8'), file.path);
  }
  await applyZhRelease(candidate);
  const report = await verifyOutput23(candidate, compiled);
  await mkdir(path.dirname(output23), { recursive: true });
  await rm(previousOutput, { recursive: true, force: true });
  try { await rename(output23, previousOutput); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  try { await rename(candidate, output23); }
  catch (error) { await rename(previousOutput, output23).catch(() => {}); throw error; }
  await rm(previousOutput, { recursive: true, force: true });
  await writeFile(buildManifestPath23 + '.tmp', JSON.stringify(compiled, null, 2) + '\n');
  await rename(buildManifestPath23 + '.tmp', buildManifestPath23);
  console.log(JSON.stringify({ ...report, photography: photography.summary, output: path.relative(root, output23), publication: 'not performed by build' }, null, 2));
} finally {
  await rm(staging, { recursive: true, force: true });
  await rm(candidate, { recursive: true, force: true });
}
