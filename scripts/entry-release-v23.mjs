import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

export const entry23Namespace = 'v2-3/entry-rounded/';
const originalLogoSha256 = '22a602ba52c5eb4e2821d64aed5d7a91b2e0330c6971e4dfb1dd24709ee107b3';
const repairedLogoSha256 = 'f92e7a1374c24d3b33c23a2950cd4726238a641e7ea0ff29fa7e530e2fe0ad92';
const repairedMeshSha256 = '68e3c3a91837c899b1b5a5e5bb56d6c05a3199a385277d1f5c91864f6909f5a7';

// The original asset stays immutable. The 2.3 fallback and derived Poisson mesh
// share one narrowly repaired lower-inner contour in this independent namespace.
export async function verifyEntry23Release(directory) {
  const manifestPath = entry23Namespace + 'manifest.json';
  const manifest = JSON.parse(await readFile(path.join(directory, manifestPath), 'utf8'));
  assert.equal(manifest.version, 2, 'Unsupported 2.3 entry asset manifest version');
  assert.equal(manifest.source?.sha256, originalLogoSha256, '2.3 must retain the approved personal logo source provenance');
  assert.equal(manifest.source?.path, 'public/assets/gala-x-ci-logo-silver-fill.svg', 'Preserve original logo provenance');
  assert.equal(manifest.repair?.sourceSha256, originalLogoSha256, 'The contour repair must point to the immutable original');
  assert.equal(manifest.repair?.derivedSvgSha256, repairedLogoSha256, 'Unexpected 2.3 contour repair');
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
  assert.equal(asset.sha256, repairedLogoSha256, 'The fallback must use the reviewed 2.3 contour repair');
  const svg = bytes.toString('utf8');
  assert.match(svg, /<svg\b[^>]*viewBox="500 560 1160 1040"/);
  assert.equal([...svg.matchAll(/<path\b/g)].length, 3, 'Preserve all three logo shapes');
  assert.match(svg, /stroke-width:\s*25px/);
  assert.match(svg, /38\.82l-132\.85,230\.02/, 'Preserve the tangent-continuous repaired lower inner turn');
  assert(!/38\.82h0s\.23\.13\.23\.13/.test(svg), 'Do not restore the subpixel cusp that produced the miter needle');
  assert.match(svg, /6\.93-26\.81,0-38\.81Z/, 'The left piece must close exactly without a miter needle');
  assert(!/<(?:script|image|foreignObject)\b|\bon\w+\s*=|\bhref\s*=/i.test(svg), 'The fallback must be a self-contained static SVG');
  const derived = byPath.get(expected[1]);
  assert.equal(derived.asset.mime, 'application/json', 'The precomputed mesh must be JSON');
  assert.equal(derived.asset.sha256, repairedMeshSha256, 'Unexpected reviewed 2.3 repaired mesh');
  const mesh = JSON.parse(derived.bytes.toString('utf8'));
  assert.equal(mesh.version, 1, 'Unsupported logo mesh version');
  assert.equal(mesh.sourceSha256, repairedLogoSha256, 'Mesh must derive from the reviewed 2.3 repaired fallback');
  assert.equal(mesh.originalSourceSha256, originalLogoSha256, 'Mesh must retain immutable original provenance');
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
  const edgeIncidence = new Map();
  for (let offset = 0; offset < mesh.indices.length; offset += 3) {
    const triangle = mesh.indices.slice(offset, offset + 3);
    assert.equal(new Set(triangle).size, 3, 'Logo mesh contains a repeated triangle vertex');
    for (let edge = 0; edge < 3; edge += 1) {
      const a = triangle[edge], b = triangle[(edge + 1) % 3];
      const key = a < b ? `${a}:${b}` : `${b}:${a}`;
      const incidence = edgeIncidence.get(key) ?? { count: 0, direction: 0 };
      incidence.count += 1;
      incidence.direction += a < b ? 1 : -1;
      edgeIncidence.set(key, incidence);
    }
  }
  for (const [edge, incidence] of edgeIncidence) {
    assert.equal(incidence.count, 2, `Logo mesh edge ${edge} must have exactly two incident faces`);
    assert.equal(incidence.direction, 0, `Logo mesh edge ${edge} must have opposite directed winding`);
  }
  assert(Array.isArray(mesh.parts) && mesh.parts.length === vertices
    && mesh.parts.every(part => Number.isInteger(part) && part >= 0 && part < 3)
    && new Set(mesh.parts).size === 3, 'Logo mesh must contain the three authored pieces');
  return { manifest, files: [manifestPath, ...expected] };
}
