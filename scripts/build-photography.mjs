import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { copyFile, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { build } from 'vite';
import path from 'node:path';
import { appNamespace, catalogOutputPath, photoEntry, projectRoot, releaseManifestPath, validatePhotographyCatalog } from './photography-release.mjs';

const args = process.argv.slice(2);
const value = flag => { const index = args.indexOf(flag); return index === -1 ? undefined : args[index + 1]; };
const root = path.resolve(value('--root') ?? projectRoot);
const output = path.resolve(value('--out') ?? path.join(root, '.cache/photography-dist'));
const commitReceipt = args.includes('--write-release');
const publicRoot = path.join(root, 'public');
const isRootOrAncestor = candidate => root === candidate || root.startsWith(candidate + path.sep);
assert(!isRootOrAncestor(output), '--out must not be the project root or an ancestor');
assert(!(output === publicRoot || output.startsWith(publicRoot + path.sep) || publicRoot.startsWith(output + path.sep)), '--out must not overlap public release sources');
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const mimeFor = file => ({
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2',
})[path.extname(file).toLowerCase()];
async function filesUnder(directory, prefix = '') {
  const result = [];
  for (const entry of await readdir(path.join(directory, prefix), { withFileTypes: true })) {
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
    assert(!entry.isSymbolicLink(), `Generated photography output cannot contain symlinks: ${rel}`);
    if (entry.isDirectory()) result.push(...await filesUnder(directory, rel));
    else if (entry.isFile()) result.push(rel);
  }
  return result.sort();
}
async function receiptFile(publicRoot, outputPath, source) {
  const bytes = await readFile(path.join(publicRoot, source));
  return { path: outputPath, source, bytes: bytes.length, sha256: sha256(bytes), mime: mimeFor(outputPath) };
}

const catalogFile = path.join(root, 'src/photography/catalog.json');
const catalog = JSON.parse(await readFile(catalogFile, 'utf8'));
const summary = validatePhotographyCatalog(catalog);
await rm(output, { recursive: true, force: true });
await build({ configFile: path.join(root, 'vite.photography.config.ts'), root, base: '/', publicDir: false,
  build: { outDir: output, emptyOutDir: true, copyPublicDir: false, assetsDir: 'photography-assets/app', rollupOptions: { input: { photography: path.join(root, 'photography/index.html') } } } });
for (const resource of summary.variantPaths) {
  const source = path.join(publicRoot, resource); const destination = path.join(output, resource);
  await mkdir(path.dirname(destination), { recursive: true }); await copyFile(source, destination);
}
await mkdir(path.dirname(path.join(output, catalogOutputPath)), { recursive: true });
await writeFile(path.join(output, catalogOutputPath), JSON.stringify(catalog) + '\n');
assert(await readFile(path.join(output, photoEntry), 'utf8'), 'Vite did not produce photography/index.html');

if (commitReceipt) {
  // This creates a reviewable public package; it does not publish it or touch a full-site baseline.
  const entrySource = appNamespace + 'photography.index.html';
  await rm(path.join(publicRoot, appNamespace), { recursive: true, force: true });
  await mkdir(path.join(publicRoot, appNamespace), { recursive: true });
  await copyFile(path.join(output, photoEntry), path.join(publicRoot, entrySource));
  for (const rel of await filesUnder(path.join(output, appNamespace))) {
    const source = appNamespace + rel;
    await mkdir(path.dirname(path.join(publicRoot, source)), { recursive: true });
    await copyFile(path.join(output, source), path.join(publicRoot, source));
  }
  const files = [await receiptFile(publicRoot, photoEntry, entrySource)];
  for (const rel of await filesUnder(path.join(output, appNamespace))) {
    files.push(await receiptFile(publicRoot, appNamespace + rel, appNamespace + rel));
  }
  for (const resource of summary.variantPaths) files.push(await receiptFile(publicRoot, resource, resource));
  const paths = new Set(files.map(file => file.path));
  assert(paths.has(catalogOutputPath), 'Release receipt is missing the public catalog');
  assert.equal(paths.size, files.length, 'Release receipt has duplicate paths');
  const manifest = { version: 1, catalog: { path: catalogOutputPath, photos: summary.photos, landscapes: summary.landscapes, live: summary.live, hdrPhotos: summary.hdrPhotos }, files };
  await writeFile(path.join(publicRoot, releaseManifestPath), JSON.stringify(manifest, null, 2) + '\n');
}
console.log(JSON.stringify({ output, photos: summary.photos, landscapes: summary.landscapes, live: summary.live, hdrPhotos: summary.hdrPhotos, receipt: commitReceipt ? releaseManifestPath : 'not written; use --write-release after review', publication: 'not performed by build' }, null, 2));
