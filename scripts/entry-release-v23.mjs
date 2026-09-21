import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

export const entry23Namespace = 'v2-3/entry/';
const logoSha256 = '22a602ba52c5eb4e2821d64aed5d7a91b2e0330c6971e4dfb1dd24709ee107b3';

// The static SVG remains exact; its derived Poisson mesh is generated offline,
// provenance-checked and packaged in the same independent namespace.
export async function verifyEntry23Release(directory) {
  const manifestPath = entry23Namespace + 'manifest.json';
  const manifest = JSON.parse(await readFile(path.join(directory, manifestPath), 'utf8'));
  assert.equal(manifest.version, 1, 'Unsupported 2.3 entry asset manifest version');
  assert.equal(manifest.source?.sha256, logoSha256, '2.3 must retain the approved personal logo source');
  assert.equal(manifest.source?.path, 'public/assets/gala-x-ci-logo-silver-fill.svg', 'Preserve original logo provenance');
  assert(Array.isArray(manifest.files) && manifest.files.length === 2, '2.3 packages exactly the reviewed logo and derived mesh');
  const expected = ['logo.svg', 'logo-mesh.json'].map(file => entry23Namespace + file);
  const byPath = new Map();
  for (const asset of manifest.files) {
    assert(expected.includes(asset.path) && !byPath.has(asset.path), 'Logo dependencies must stay in the reviewed 2.3 entry namespace');
    assert(Number.isSafeInteger(asset.bytes) && asset.bytes > 0, 'Invalid logo byte count');
    assert.match(asset.sha256, /^[a-f0-9]{64}$/, 'Invalid logo asset SHA-256');
    const bytes = await readFile(path.join(directory, asset.path));
    assert.equal(bytes.length, asset.bytes, 'Logo asset byte count changed: ' + asset.path);
    assert.equal(createHash('sha256').update(bytes).digest('hex'), asset.sha256, 'Logo hash changed: ' + asset.path);
    byPath.set(asset.path, { asset, bytes });
  }
  const { asset, bytes } = byPath.get(expected[0]);
  assert.equal(asset.mime, 'image/svg+xml');
  assert.equal(asset.width, 1160); assert.equal(asset.height, 1040);
  assert.equal(asset.sha256, logoSha256, 'The fallback must be the unmodified source SVG');
  const svg = bytes.toString('utf8');
  assert.match(svg, /<svg\b[^>]*viewBox="500 560 1160 1040"/);
  assert.equal([...svg.matchAll(/<path\b/g)].length, 3, 'Preserve all three logo shapes');
  assert.match(svg, /stroke-width:\s*25px/);
  assert(!/<(?:script|image|foreignObject)\b|\bon\w+\s*=|\bhref\s*=/i.test(svg), 'The fallback must be a self-contained static SVG');
  const derived = byPath.get(expected[1]);
  assert.equal(derived.asset.mime, 'application/json', 'The precomputed mesh must be JSON');
  const mesh = JSON.parse(derived.bytes.toString('utf8'));
  assert.equal(mesh.version, 1, 'Unsupported logo mesh version');
  assert.equal(mesh.sourceSha256, logoSha256, 'Mesh must derive from the approved personal logo');
  assert.deepEqual(mesh.viewBox, { x: 500, y: 560, width: 1160, height: 1040 });
  assert.equal(mesh.stroke, 25, 'Mesh must retain the original stroke');
  assert(Array.isArray(mesh.positions) && mesh.positions.length % 3 === 0 && mesh.positions.every(Number.isFinite), 'Invalid logo mesh positions');

  assert(Array.isArray(mesh.normals) && mesh.normals.length === mesh.positions.length && mesh.normals.every(Number.isFinite), 'Invalid precomputed logo mesh normals');
  for (let offset = 0; offset < mesh.normals.length; offset += 3) {
    const length = Math.hypot(mesh.normals[offset], mesh.normals[offset + 1], mesh.normals[offset + 2]);
    assert(Math.abs(length - 1) < .001, 'Logo mesh normals must be unit vectors');
  }
  const vertices = mesh.positions.length / 3;
  assert(vertices > 0 && vertices <= 20000, 'Logo mesh exceeds vertex budget');
  assert(Array.isArray(mesh.indices) && mesh.indices.length > 0 && mesh.indices.length % 3 === 0
    && mesh.indices.every(index => Number.isSafeInteger(index) && index >= 0 && index < vertices), 'Invalid logo mesh indices');
  assert(Array.isArray(mesh.parts) && mesh.parts.length === vertices
    && mesh.parts.every(part => Number.isInteger(part) && part >= 0 && part < 3)
    && new Set(mesh.parts).size === 3, 'Logo mesh must contain the three authored pieces');
  return { manifest, files: [manifestPath, ...expected] };
}
