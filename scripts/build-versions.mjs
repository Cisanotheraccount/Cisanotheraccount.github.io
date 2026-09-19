import { build } from 'vite';
import react from '@vitejs/plugin-react';
import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { projectRoot, restoreBaseline, verifyBaseline } from './release-baseline.mjs';
import { verifyThumbnailRelease } from './thumbnail-release.mjs';

// Each version has a separate Rollup graph. The approved 2.0 graph is an exact
// published snapshot, including old immutable bundles still used by cached tabs.
const output = path.join(projectRoot, 'dist');
const staging = path.join(projectRoot, '.site-build/version-2-1');
await verifyBaseline();
const thumbnails = await verifyThumbnailRelease(path.join(projectRoot, 'public'));
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
  await rm(output, { recursive: true, force: true });
  await restoreBaseline(output);
  await cp(path.join(staging, 'assets/2-1'), path.join(output, 'assets/2-1'), { recursive: true });
  for (const file of thumbnails.files) {
    await mkdir(path.dirname(path.join(output, file)), { recursive: true });
    await cp(path.join(projectRoot, 'public', file), path.join(output, file));
  }
  const html = await readFile(path.join(staging, 'v2-1/index.html'), 'utf8');
  for (const route of ['galaxci/2.1', 'v2-1']) {
    await mkdir(path.join(output, route), { recursive: true });
    await writeFile(path.join(output, route, 'index.html'), html);
  }
  await verifyBaseline(output);
  await verifyThumbnailRelease(output);
  console.log(`Built independent 2.1 at /galaxci/2.1/ and /v2-1/ with ${thumbnails.files.length - 1} verified mobile thumbnails. All 240 published 2.0 files remain byte-identical.`);
} finally {
  await rm(staging, { recursive: true, force: true });
}
