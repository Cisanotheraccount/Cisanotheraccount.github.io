import assert from 'node:assert/strict';
import { access, readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { projectRoot, verifyBaseline } from './release-baseline.mjs';
import { verifyThumbnailRelease } from './thumbnail-release.mjs';
import { verifyBackgroundRelease } from './background-release.mjs';

const output = path.join(projectRoot, 'dist');
const baseline = await verifyBaseline(output);
const baselinePaths = new Set(baseline.files.map(file => file.path));
const thumbnails = await verifyThumbnailRelease(output);
const thumbnailPaths = new Set(thumbnails.files);
const backgrounds = await verifyBackgroundRelease(output);
const backgroundPaths = new Set(backgrounds.files);
async function filesUnder(directory, relative = '') {
  const result = [];
  for (const entry of await readdir(path.join(directory, relative), { withFileTypes: true })) {
    const name = path.posix.join(relative, entry.name);
    result.push(...(entry.isDirectory() ? await filesUnder(directory, name) : [name]));
  }
  return result;
}
const files = await filesUnder(output);
const added = files.filter(file => !baselinePaths.has(file));
assert(added.length > 2, 'The independent 2.1 build must exist.');
assert(added.every(file => file.startsWith('assets/2-1/') || thumbnailPaths.has(file) || backgroundPaths.has(file) || ['galaxci/2.1/index.html', 'v2-1/index.html'].includes(file)), '2.1 may only append namespaced bundles and verified thumbnail/background dependencies.');
for (const file of thumbnailPaths) assert(!baselinePaths.has(file), '2.1 thumbnails cannot replace any frozen 2.0 asset');
for (const file of backgroundPaths) assert(!baselinePaths.has(file), '2.1 backgrounds cannot replace any frozen 2.0 asset');
const newPage = await readFile(path.join(output, 'galaxci/2.1/index.html'), 'utf8');
assert.equal(await readFile(path.join(output, 'v2-1/index.html'), 'utf8'), newPage, 'Local and branded 2.1 entries must match.');
assert.match(newPage, /<title>[^<]*2\.1[^<]*<\/title>/, 'The tab title identifies 2.1.');
assert.match(newPage, /src="\/assets\/2-1\//, 'The new entry must use its own JS namespace.');
assert(!/\/assets\/2-1\//.test(await readFile(path.join(output, 'galaxci/index.html'), 'utf8')), 'The original homepage cannot load 2.1 code.');
let dependencies = 0;
for (const file of files.filter(file => /\.(html|js|css)$/.test(file))) {
  const content = await readFile(path.join(output, file), 'utf8');
  for (const [, reference] of content.matchAll(/["']((?:\/assets\/|\.\/)[^"'\s]+\.(?:js|css))["']/g)) {
    const destination = reference.startsWith('/') ? path.join(output, reference) : path.resolve(output, path.dirname(file), reference);
    assert(destination.startsWith(output + path.sep), `Dependency leaves deployment: ${reference}`);
    await access(destination);
    dependencies += 1;
  }
}
console.log(`Release isolation passed: ${baseline.files.length} frozen SHA-256 matches, ${added.length} namespaced additions, ${thumbnails.files.length - 1} verified thumbnail hashes, ${backgrounds.files.length - 1} new/${backgrounds.sharedCount} shared background hashes, ${dependencies} existing JS/CSS references.`);
