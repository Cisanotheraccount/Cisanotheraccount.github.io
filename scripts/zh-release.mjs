import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { copyFile, mkdir, readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const zhReceipt = path.join(root, 'release-baselines/zh/release.json');
export const zhSite = path.join(root, 'release-baselines/zh/site');
export const digest = bytes => createHash('sha256').update(bytes).digest('hex');
export const ownsZh = rel => rel === 'zh/index.html' || rel === 'zh/photography/index.html' || /^assets\/zh\/[A-Za-z0-9][A-Za-z0-9_.-]*\.(?:js|css|png|webp|svg|woff2?)$/.test(rel);
export async function walk(directory, prefix = '') {
  const result = [];
  for (const item of await readdir(path.join(directory, prefix), { withFileTypes: true })) {
    if (item.name === '.git') continue;
    const rel = prefix ? `${prefix}/${item.name}` : item.name;
    assert(!item.isSymbolicLink(), `Release must not contain symlinks: ${rel}`);
    if (item.isDirectory()) result.push(...await walk(directory, rel));
    else if (item.isFile()) result.push(rel);
  }
  return result.sort();
}
export async function snapshot(directory, filter = () => true) {
  return Promise.all((await walk(directory)).filter(filter).map(async rel => {
    const bytes = await readFile(path.join(directory, rel));
    return { path: rel, bytes: bytes.length, sha256: digest(bytes) };
  }));
}
export async function verifyZh(directory = zhSite, receipt, { verifyShared = false } = {}) {
  receipt ??= JSON.parse(await readFile(zhReceipt, 'utf8'));
  assert.equal(receipt.version, 1);
  const seen = new Set();
  for (const file of receipt.files) {
    assert(ownsZh(file.path) && !seen.has(file.path), `Invalid Chinese release ownership: ${file.path}`);
    seen.add(file.path);
    const bytes = await readFile(path.join(directory, file.path));
    assert.equal(bytes.length, file.bytes, `Chinese file size changed: ${file.path}`);
    assert.equal(digest(bytes), file.sha256, `Chinese file hash changed: ${file.path}`);
  }
  const shared = new Set();
  for (const file of receipt.sharedMedia ?? []) {
    assert(/^assets\/2-3\/[A-Za-z0-9][A-Za-z0-9_.-]*\.(?:png|webp|svg|woff2?)$/.test(file.path) && !shared.has(file.path), `Invalid shared media dependency: ${file.path}`);
    shared.add(file.path);
    if (verifyShared) {
      const bytes = await readFile(path.join(directory, file.path));
      assert.equal(bytes.length, file.bytes, `Shared media size changed: ${file.path}`);
      assert.equal(digest(bytes), file.sha256, `Shared media hash changed: ${file.path}`);
    }
  }
  for (const rel of ['zh/index.html', 'zh/photography/index.html']) {
    assert(seen.has(rel), `Missing Chinese route: ${rel}`);
    const html = await readFile(path.join(directory, rel), 'utf8');
    assert(html.includes('<html lang="zh-CN">') && html.includes('/assets/zh/'));
    assert(html.includes(`href="https://galaxci.com/${rel.replace('index.html', '')}"`));
    assert(!/noindex|location\.replace\(/.test(html));
  }
  return receipt;
}
/** Preserve the reviewed Chinese package when a full English release is rebuilt. */
export async function applyZhRelease(directory, { verifyOnly = false } = {}) {
  let receipt;
  try { receipt = JSON.parse(await readFile(zhReceipt, 'utf8')); }
  catch (error) { if (error.code === 'ENOENT') return { files: [] }; throw error; }
  await verifyZh(zhSite, receipt);
  if (!verifyOnly) for (const file of receipt.files) {
    const target = path.join(directory, file.path);
    await mkdir(path.dirname(target), { recursive: true });
    await copyFile(path.join(zhSite, file.path), target);
  }
  return verifyZh(directory, receipt, { verifyShared: true });
}
