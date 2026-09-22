import assert from 'node:assert/strict';
import { build } from 'vite';
import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { root, ownsZh, snapshot, verifyZh, zhReceipt, zhSite } from './zh-release.mjs';
import { assertPublicRuntime } from './zh-runtime-data.mjs';

const args = process.argv.slice(2);
const value = flag => { const index = args.indexOf(flag); assert(index < 0 || args[index + 1], `Missing ${flag} value`); return index < 0 ? undefined : args[index + 1]; };
const output = path.resolve(value('--out') ?? path.join(root, '.cache/zh-dist'));
const baseline = value('--baseline') && path.resolve(value('--baseline'));
const staging = path.join(root, '.site-build/zh');
const overlaps = (a, b) => a === b || a.startsWith(b + path.sep) || b.startsWith(a + path.sep);
assert(output.startsWith(path.join(root, '.cache') + path.sep) && /^zh-dist(?:-[a-z0-9-]+)?$/.test(path.basename(output)), 'Chinese output must be a zh-dist directory inside the task-owned .cache');
assert(!baseline || !overlaps(output, baseline), 'Output cannot overlap the published baseline');
const before = baseline ? await snapshot(baseline, rel => !ownsZh(rel)) : [];
await rm(staging, { recursive: true, force: true });
await build({ root, configFile: path.join(root, 'vite.zh.config.ts'), build: { outDir: staging, emptyOutDir: true } });
await mkdir(path.join(staging, 'zh/photography'), { recursive: true });
await cp(path.join(staging, 'v2-3/index.html'), path.join(staging, 'zh/index.html'));
await cp(path.join(staging, 'photography/index.html'), path.join(staging, 'zh/photography/index.html'));
await rm(path.join(staging, 'v2-3'), { recursive: true });
await rm(path.join(staging, 'photography'), { recursive: true });
const emitted = await snapshot(staging);
const files = emitted.filter(file => ownsZh(file.path));
const sharedMedia = emitted.filter(file => !ownsZh(file.path));
for (const file of files.filter(file => file.path.endsWith('.js'))) {
  assertPublicRuntime(await readFile(path.join(staging, file.path), 'utf8'), file.path);
}
const receipt = { version: 1, locale: 'zh-CN', baseVersion: '2.3', files, sharedMedia };
await verifyZh(staging, receipt, { verifyShared: true });
if (baseline) for (const file of sharedMedia) {
  assert.deepEqual(before.find(existing => existing.path === file.path), file, `Chinese media must reuse the published path and bytes: ${file.path}`);
}
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
if (baseline) await cp(baseline, output, { recursive: true, filter: source => path.basename(source) !== '.git' });
await cp(staging, output, { recursive: true });
await verifyZh(output, receipt, { verifyShared: true });
if (baseline) assert.deepEqual(await snapshot(output, rel => !ownsZh(rel)), before, 'Chinese build changed an existing non-Chinese file');
await writeFile(path.join(root, '.cache/zh-build.json'), JSON.stringify(receipt, null, 2) + '\n');
if (args.includes('--write-release')) {
  await rm(zhSite, { recursive: true, force: true });
  await mkdir(path.dirname(zhSite), { recursive: true });
  for (const file of files) {
    await mkdir(path.dirname(path.join(zhSite, file.path)), { recursive: true });
    await cp(path.join(staging, file.path), path.join(zhSite, file.path));
  }
  await writeFile(zhReceipt, JSON.stringify(receipt, null, 2) + '\n');
}
console.log(JSON.stringify({ output, files: files.length, sharedMedia: sharedMedia.length, preservedFiles: before.length, receipt: args.includes('--write-release'), publication: 'not performed by build' }));
