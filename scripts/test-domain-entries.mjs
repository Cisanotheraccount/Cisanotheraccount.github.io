import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promoteLatest, legacyRedirect } from './promote-latest-release.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { version } = JSON.parse(await readFile(path.join(root, 'release-baselines/latest.json'), 'utf8'));
const fixture = await mkdtemp(path.join(tmpdir(), 'galaxci-domain-'));
const entry = `<!doctype html><title>Gala X Ci ${version}</title><script src="/assets/example.js"></script>`;
try {
  await mkdir(path.join(fixture, `galaxci/${version}`), { recursive: true });
  await writeFile(path.join(fixture, '.nojekyll'), '');
  await writeFile(path.join(fixture, `galaxci/${version}/index.html`), entry);
  await writeFile(path.join(fixture, 'index.html'), 'prior root');
  await writeFile(path.join(fixture, 'psytrain.html'), 'unrelated existing page');
  await assert.rejects(promoteLatest(fixture), /Refusing to replace existing content/);
  assert.equal(await readFile(path.join(fixture, 'index.html'), 'utf8'), 'prior root');
  await rm(path.join(fixture, 'psytrain.html'));
  const result = await promoteLatest(fixture);
  assert.equal(result.rootEntry, true);
  assert.equal(await readFile(path.join(fixture, 'index.html'), 'utf8'), entry);
  assert.equal(await readFile(path.join(fixture, `galaxci/${version}/index.html`), 'utf8'), entry);
  await promoteLatest(fixture, { verifyOnly: true });
  await writeFile(path.join(fixture, 'index.html'), 'stale homepage');
  await assert.rejects(promoteLatest(fixture, { verifyOnly: true }), /Generated entry differs: index.html/);
  await promoteLatest(fixture);
  await writeFile(path.join(fixture, 'galaxci/2.0/index.html'), 'changed frozen archive');
  await assert.rejects(promoteLatest(fixture), /Do not overwrite a different 2.0 archive/);
  for (const target of ['https://example.com/', '//example.com/', '/../../private', '/#work<script>']) {
    assert.throws(() => legacyRedirect(target));
  }
  assert(legacyRedirect('/#/work/psytrain').includes('location.search + "#/work/psytrain"'));
  assert(legacyRedirect('/photography/').includes('location.search + location.hash'));
  console.log('Domain entries passed: exact root copy, legacy routes, verify-only drift, collision and frozen archive guards.');
} finally {
  await rm(fixture, { recursive: true, force: true });
}
