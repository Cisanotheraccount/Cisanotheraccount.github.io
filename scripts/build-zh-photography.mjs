import assert from 'node:assert/strict';
import { build } from 'vite';
import { copyFile, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { root, snapshot, verifyZh, zhReceipt, zhSite, ownsZh } from './zh-release.mjs';
import { assertPublicRuntime } from './zh-runtime-data.mjs';

// Rebuild the shared Photography UI without rebuilding the Chinese portfolio.
const args = process.argv.slice(2);
const index = args.indexOf('--out');
const output = path.resolve(index < 0 ? path.join(root, '.cache/zh-photography-dist') : args[index + 1]);
assert(output.startsWith(path.join(root, '.cache') + path.sep), 'Output must stay inside the project cache');
const generated = path.join(output, 'generated');
const site = path.join(output, 'site');
const previous = await verifyZh();
await rm(output, { recursive: true, force: true });
await build({ root, configFile: path.join(root, 'vite.zh.config.ts'),
  build: { outDir: generated, emptyOutDir: true, rollupOptions: { input: path.join(root, 'photography/index.html') } } });
await mkdir(path.join(generated, 'zh/photography'), { recursive: true });
await copyFile(path.join(generated, 'photography/index.html'), path.join(generated, 'zh/photography/index.html'));
await rm(path.join(generated, 'photography'), { recursive: true });
const emitted = await snapshot(generated);
const files = emitted.filter(file => ownsZh(file.path));
assert(files.some(file => file.path === 'zh/photography/index.html'));
assert(files.every(file => file.path === 'zh/photography/index.html' || file.path.startsWith('assets/zh/')));
for (const file of files.filter(file => file.path.endsWith('.js'))) {
  assertPublicRuntime(await readFile(path.join(generated, file.path), 'utf8'), file.path);
}
// Fonts and imported media must already exist in the reviewed shared dependency list.
for (const file of emitted.filter(file => !ownsZh(file.path))) {
  assert.deepEqual(previous.sharedMedia.find(existing => existing.path === file.path), file, `Unexpected shared dependency: ${file.path}`);
}
const updated = new Map(previous.files.map(file => [file.path, file]));
for (const file of files) updated.set(file.path, file);
const receipt = { ...previous, files: [...updated.values()].sort((a, b) => a.path.localeCompare(b.path)) };
for (const file of previous.files) {
  const target = path.join(site, file.path);
  await mkdir(path.dirname(target), { recursive: true });
  await copyFile(path.join(zhSite, file.path), target);
}
for (const file of files) {
  const target = path.join(site, file.path);
  await mkdir(path.dirname(target), { recursive: true });
  await copyFile(path.join(generated, file.path), target);
}
await verifyZh(site, receipt);
for (const file of previous.files.filter(file => file.path !== 'zh/photography/index.html')) {
  assert.deepEqual(updated.get(file.path), file, `Existing Chinese resource changed: ${file.path}`);
}
await writeFile(path.join(output, 'release.json'), JSON.stringify(receipt, null, 2) + '\n');
if (args.includes('--write-release')) {
  for (const file of files) {
    const target = path.join(zhSite, file.path);
    await mkdir(path.dirname(target), { recursive: true });
    await copyFile(path.join(site, file.path), target);
  }
  await writeFile(zhReceipt, JSON.stringify(receipt, null, 2) + '\n');
}
console.log(JSON.stringify({ output, newFiles: files.length, preservedChinesePortfolio: true, receipt: args.includes('--write-release'), publication: 'not performed by build' }));
