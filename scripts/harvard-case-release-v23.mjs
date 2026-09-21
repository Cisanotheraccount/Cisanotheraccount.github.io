import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

export const harvardCaseSlugs = ['hypnos-cockpit', 'deal-points', 'orbit', 'psytrain'];
const mimeTypes = { '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg' };

// The release admits only explicitly reviewed assets. Source inventories and
// Figma's expiring URLs remain local; the website has no Figma dependency.
export async function verifyHarvardCaseRelease(directory) {
  const manifests = [], files = [];
  for (const slug of harvardCaseSlugs) {
    const namespace = `v2-3/cases/${slug}/`;
    const manifestPath = namespace + 'manifest.json';
    const manifest = JSON.parse(await readFile(path.join(directory, manifestPath), 'utf8'));
    assert.equal(manifest.schemaVersion, 1, 'Unsupported Harvard case manifest');
    assert.equal(manifest.slug, slug, 'Case manifest identity mismatch');
    assert(Array.isArray(manifest.assets) && manifest.assets.length, 'Case manifest has no assets');
    const seen = new Set();
    files.push(manifestPath);
    for (const asset of manifest.assets) {
      assert.equal(typeof asset.path, 'string', 'Asset path missing');
      assert(asset.path.startsWith('/' + namespace), 'Case asset outside its namespace');
      assert.match(asset.path.slice(namespace.length + 1), /^[a-z0-9][a-z0-9-]*\.(svg|png|webp|jpe?g)$/, 'Invalid case asset filename');
      assert(!seen.has(asset.path), 'Duplicate case asset');
      seen.add(asset.path);
      assert.equal(typeof asset.sourceNode, 'string', 'Figma source node missing');
      assert(asset.sourceNode.length > 0, 'Empty Figma source node');
      assert(Number.isFinite(asset.width) && asset.width > 0 && Number.isFinite(asset.height) && asset.height > 0, 'Invalid case asset dimensions');
      assert(Number.isSafeInteger(asset.bytes) && asset.bytes > 0, 'Invalid case asset byte count');
      assert.match(asset.sha256, /^[0-9a-f]{64}$/, 'Invalid case asset hash');
      assert.equal(asset.mime, mimeTypes[path.extname(asset.path)], 'Case asset MIME mismatch');
      const file = asset.path.slice(1), bytes = await readFile(path.join(directory, file));
      assert.equal(bytes.length, asset.bytes, 'Case asset bytes changed: ' + asset.path);
      assert.equal(createHash('sha256').update(bytes).digest('hex'), asset.sha256, 'Case asset hash changed: ' + asset.path);
      if (asset.mime === 'image/png') {
        assert.equal(bytes.toString('hex', 0, 8), '89504e470d0a1a0a', 'Invalid PNG');
        assert.equal(bytes.readUInt32BE(16), asset.width, 'PNG width mismatch: ' + asset.path);
        assert.equal(bytes.readUInt32BE(20), asset.height, 'PNG height mismatch: ' + asset.path);
      } else if (asset.mime === 'image/svg+xml') {
        const svg = bytes.toString('utf8');
        assert(/<svg[\s>]/.test(svg), 'Invalid SVG');
        assert(!/<script[\s>]/i.test(svg), 'SVG must not contain scripts');
        assert(!/(?:href\s*=\s*["']|url\(\s*["']?)(?:https?:|\/\/)/i.test(svg), 'SVG cannot depend on remote assets');
      } else if (asset.mime === 'image/webp') {
        assert.equal(bytes.toString('ascii', 0, 4), 'RIFF', 'Invalid WebP');
        assert.equal(bytes.toString('ascii', 8, 12), 'WEBP', 'Invalid WebP');
      } else {
        assert.equal(bytes.toString('hex', 0, 3), 'ffd8ff', 'Invalid JPEG');
      }
      files.push(file);
    }
    manifests.push(manifest);
  }
  return { manifest: manifests, files };
}
