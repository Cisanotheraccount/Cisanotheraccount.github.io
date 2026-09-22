import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile, rm, copyFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runInNewContext } from 'node:vm';
import { zhReceipt, verifyZh } from './zh-release.mjs';
import { promoteLatest, legacyRedirect, latestRedirect } from './promote-latest-release.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { version } = JSON.parse(await readFile(path.join(root, 'release-baselines/latest.json'), 'utf8'));
const fixture = await mkdtemp(path.join(tmpdir(), 'galaxci-domain-'));
const entry = `<!doctype html><title>Gala X Ci ${version}</title><script src="/assets/example.js"></script>`;
try {
  // A reviewed Chinese package references unchanged 2.3 media. Populate those
  // dependencies from the verified build before exercising the entry overlay.
  let chinese;
  try { chinese = JSON.parse(await readFile(zhReceipt, 'utf8')); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  if (chinese) {
    const build = path.join(root, '.cache/integrated-2-3-dist');
    await verifyZh(build, chinese, { verifyShared: true });
    for (const file of chinese.sharedMedia ?? []) {
      await mkdir(path.dirname(path.join(fixture, file.path)), { recursive: true });
      await copyFile(path.join(build, file.path), path.join(fixture, file.path));
    }
  }
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
  for (const [options, target, canonical] of [
    [{ serveAtRoot: true, customDomain: 'galaxci.com' }, '/', 'https://galaxci.com/'],
    [{ serveAtRoot: true }, `/galaxci/${version}/`, 'https://cisanotheraccount.github.io/galaxci/'],
    [{}, `/galaxci/${version}/`, 'https://cisanotheraccount.github.io/galaxci/'],
  ]) {
    const html = latestRedirect(version, options);
    for (const [search, hash] of [['', ''], ['?v=old-link&x=%26', '#/work/shotflow'], ['?x=1', '#work']]) {
      let destination;
      runInNewContext(html.match(/<script>([\s\S]*?)<\/script>/)[1], {
        location: { search, hash, replace: value => { destination = value; } },
      });
      assert.equal(destination, target + search + hash, 'Preserve query/hash at the canonical destination');
    }
    assert(html.includes(`rel="canonical" href="${canonical}"`));
    assert(html.includes(`content="0;url=${target}"`));
  }
  assert.throws(() => latestRedirect(version, { customDomain: 'example.com' }));
  console.log('Domain entries passed: exact root copy, legacy routes, verify-only drift, collision and frozen archive guards.');
} finally {
  await rm(fixture, { recursive: true, force: true });
}
