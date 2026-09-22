import assert from 'node:assert/strict';
import { applyZhRelease } from './zh-release.mjs';
import { createHash } from 'node:crypto';
import { copyFile, mkdir, readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { photoEntry, verifyAppliedPhotographyRelease, verifyPhotographyRelease } from './photography-release.mjs';

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
// Keep generated artifacts alongside the other task-owned caches; the top-level
// iCloud output directory repeatedly acquired conflict copies after validation.
export const output23 = path.join(root, '.cache/integrated-2-3-dist');
export const buildManifestPath23 = path.join(root, 'release-baselines/2.3-build.json');
export const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const baselineRoot = path.join(root, 'release-baselines/pre-2.3');
const sourceRoots = { public: path.join(root, 'public'), 'frozen-2.0': path.join(root, 'release-baselines/2.0/site'), frozen: path.join(baselineRoot, 'site') };

function checkPath(value) {
  assert(typeof value === 'string' && value.length && !path.isAbsolute(value) && !value.includes('\\') && !value.split('/').some(part => part === '..' || part === '.'), 'Unsafe release path: ' + value);
}
export async function baseline23() {
  const manifest = JSON.parse(await readFile(path.join(baselineRoot, 'manifest.json'), 'utf8'));
  assert.equal(manifest.version, 1);
  const seen = new Set();
  for (const file of manifest.files) {
    checkPath(file.path);
    assert(sourceRoots[file.source] && !seen.has(file.path), 'Invalid baseline ownership: ' + file.path);
    seen.add(file.path);
  }
  return manifest;
}
/**
 * The previous-release source stays frozen. Only a completed output may use
 * the new photography receipt for the legacy photography route entry.
 */
export async function verifyPreviousRelease(directory, { photographyOverlay = false, releaseRoot } = {}) {
  assert(!photographyOverlay || directory, 'Photography overlay verification requires an output directory');
  const manifest = await baseline23();
  const photography = photographyOverlay ? await verifyPhotographyRelease(releaseRoot) : undefined;
  const photographyEntry = photography?.manifest.files.find(file => file.path === photoEntry);
  assert(!photographyOverlay || photographyEntry, 'Photography receipt is missing its route entry');
  for (const file of manifest.files) {
    const bytes = await readFile(path.join(directory ?? sourceRoots[file.source], file.path));
    const expected = photographyOverlay && file.path === photoEntry ? photographyEntry : file;
    assert.equal(bytes.length, expected.bytes, 'Previous release size changed: ' + file.path);
    assert.equal(sha256(bytes), expected.sha256, 'Previous release hash changed: ' + file.path);
  }
  return manifest;
}
export async function copyPreviousRelease(directory) {
  const manifest = await verifyPreviousRelease();
  for (const file of manifest.files) {
    const target = path.join(directory, file.path);
    await mkdir(path.dirname(target), { recursive: true });
    await copyFile(path.join(sourceRoots[file.source], file.path), target);
  }
}
export async function verifyNewAssets(directory = path.join(root, 'public')) {
  const manifest = JSON.parse(await readFile(path.join(root, 'release-baselines/2.3-assets.json'), 'utf8'));
  assert.equal(manifest.version, 1);
  const previous = new Set((await baseline23()).files.map(file => file.path));
  const seen = new Set();
  for (const file of manifest.files) {
    checkPath(file.path);
    assert(file.path.startsWith('v2-3/') && !previous.has(file.path) && !seen.has(file.path), 'Invalid 2.3 asset namespace: ' + file.path);
    assert(!/(^|\/)(?:\.|README|AGENTS|SKILL)|(?:^|\/)(?:docs|review|内容资料)\//i.test(file.path), 'Private file in asset manifest: ' + file.path);
    seen.add(file.path);
    const bytes = await readFile(path.join(directory, file.path));
    assert.equal(bytes.length, file.bytes, '2.3 asset size changed: ' + file.path);
    assert.equal(sha256(bytes), file.sha256, '2.3 asset hash changed: ' + file.path);
  }
  return manifest;
}
export async function filesUnder(directory, prefix = '') {
  const result = [];
  for (const entry of await readdir(path.join(directory, prefix), { withFileTypes: true })) {
    const rel = path.posix.join(prefix, entry.name);
    assert(!entry.isSymbolicLink(), 'Release must not contain symlinks: ' + rel);
    if (entry.isDirectory()) result.push(...await filesUnder(directory, rel));
    else if (entry.isFile()) result.push(rel);
  }
  return result.sort();
}
export async function captureCompiled23(directory, sourceSha256) {
  const paths = [
    ...(await filesUnder(path.join(directory, 'assets/2-3'))).map(rel => 'assets/2-3/' + rel),
    'galaxci/2.3/index.html', 'v2-3/index.html',
  ];
  const files = [];
  for (const rel of paths) {
    // Vite-generated names only; reject iCloud conflict copies during capture, too.
    assert(/^assets\/2-3\/[A-Za-z0-9][A-Za-z0-9_.-]*-[A-Za-z0-9_-]{8}\.(?:js|css|webp|png|svg|woff2?)$/.test(rel)
      || ['galaxci/2.3/index.html', 'v2-3/index.html'].includes(rel), 'Unexpected compiled file: ' + rel);
    const bytes = await readFile(path.join(directory, rel));
    files.push({ path: rel, bytes: bytes.length, sha256: sha256(bytes) });
  }
  return { version: 1, source: { path: 'src/v2-3/introMeCaseContent.ts', sha256: sourceSha256 }, files };
}
export async function verifyOutput23(directory = output23, compiled) {
  compiled ??= JSON.parse(await readFile(buildManifestPath23, 'utf8'));
  assert.equal(compiled.version, 1);
  const previous = await verifyPreviousRelease(directory, { photographyOverlay: true });
  const assets = await verifyNewAssets(directory);
  const photography = await verifyAppliedPhotographyRelease(directory);
  const previousPaths = new Set(previous.files.map(file => file.path));
  const assetPaths = new Set(assets.files.map(file => file.path));
  const photographyPaths = new Set(photography.manifest.files.map(file => file.path));
  const chinesePaths = new Set((await applyZhRelease(directory, { verifyOnly: true })).files.map(file => file.path));
  const compiledPaths = new Set();
  for (const file of compiled.files) {
    checkPath(file.path);
    assert((/^assets\/2-3\/[^/]+$/.test(file.path) || ['galaxci/2.3/index.html', 'v2-3/index.html'].includes(file.path))
      && !compiledPaths.has(file.path), 'Invalid compiled ownership: ' + file.path);
    compiledPaths.add(file.path);
    const bytes = await readFile(path.join(directory, file.path));
    assert.equal(bytes.length, file.bytes, 'Compiled size changed: ' + file.path);
    assert.equal(sha256(bytes), file.sha256, 'Compiled hash changed: ' + file.path);
  }
  assert(compiledPaths.has('galaxci/2.3/index.html') && compiledPaths.has('v2-3/index.html'), 'Missing compiled entry ownership');
  assert.equal(compiled.source.path, 'src/v2-3/introMeCaseContent.ts');
  assert.equal(sha256(await readFile(path.join(root, compiled.source.path))), compiled.source.sha256, 'IntroMe configuration changed since build; rebuild 2.3');
  const paths = await filesUnder(directory);
  const html = await readFile(path.join(directory, 'galaxci/2.3/index.html'), 'utf8');
  assert.equal(html, await readFile(path.join(directory, 'v2-3/index.html'), 'utf8'));
  assert(html.includes('/assets/2-3/') && html.includes('2.3'), 'Missing independent 2.3 entry');
  assert(!/LOCAL DEMO|LOCAL PREVIEW|temporary preview/i.test(html), 'Local preview label in production entry');
  for (const rel of paths) {
    assert(previousPaths.has(rel) || assetPaths.has(rel) || compiledPaths.has(rel) || photographyPaths.has(rel) || chinesePaths.has(rel), 'Unregistered output file: ' + rel);
  }
  for (const rel of paths.filter(rel => rel === photoEntry || rel.startsWith('photography-assets/'))) {
    assert(photographyPaths.has(rel), 'Unregistered photography output file: ' + rel);
  }
  return { previousFiles: previous.files.length, newAssets: assets.files.length, photographyFiles: photography.manifest.files.length, outputFiles: paths.length, baselineCommit: previous.commit };
}
