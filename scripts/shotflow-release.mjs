import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

export const shotFlowNamespace = 'v2-1/shotflow-import-v2/';
const mimeTypes = {
  '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.mp4': 'video/mp4', '.json': 'application/json', '.md': 'text/markdown',
};

// Only registered dependencies are packaged. Native source, capture logs and
// private inputs are never discovered or copied from the directory.
export async function verifyShotFlowRelease(directory) {
  const manifestPath = shotFlowNamespace + 'manifest.json';
  const manifest = JSON.parse(await readFile(path.join(directory, manifestPath), 'utf8'));
  assert.equal(manifest.schemaVersion, 1, 'Unsupported ShotFlow asset manifest version');
  assert(Array.isArray(manifest.assets) && manifest.assets.length > 0, 'ShotFlow manifest must list its dependencies');
  const files = [manifestPath], seen = new Set(['/' + manifestPath]);
  for (const asset of manifest.assets) {
    assert(asset && typeof asset === 'object', 'Invalid ShotFlow asset record');
    assert.equal(typeof asset.path, 'string', 'ShotFlow dependency path is required');
    assert.match(asset.path, /^\/v2-1\/shotflow-import-v2\/(?:[a-z0-9][a-z0-9-]*\/)*[a-z0-9][a-z0-9-]*\.(?:webp|png|jpe?g|mp4|json|md)$/, 'ShotFlow dependencies must stay in their reviewed namespace');
    assert(!seen.has(asset.path), 'Duplicate ShotFlow dependency: ' + asset.path);
    assert(Number.isSafeInteger(asset.bytes) && asset.bytes > 0, 'Invalid ShotFlow byte count: ' + asset.path);
    assert.match(asset.sha256, /^[a-f0-9]{64}$/, 'Invalid ShotFlow SHA-256: ' + asset.path);
    assert.equal(asset.mime, mimeTypes[path.extname(asset.path)], 'Invalid ShotFlow MIME type: ' + asset.path);
    if (asset.width !== undefined || asset.height !== undefined) {
      assert(asset.mime.startsWith('image/') || asset.mime.startsWith('video/'), 'Non-media dimensions: ' + asset.path);
      assert(Number.isSafeInteger(asset.width) && asset.width > 0 && Number.isSafeInteger(asset.height) && asset.height > 0, 'Invalid ShotFlow dimensions: ' + asset.path);
    }
    const file = asset.path.slice(1);
    const bytes = await readFile(path.join(directory, file));
    assert.equal(bytes.length, asset.bytes, 'ShotFlow byte count changed: ' + asset.path);
    assert.equal(createHash('sha256').update(bytes).digest('hex'), asset.sha256, 'ShotFlow hash changed: ' + asset.path);
    if (asset.mime === 'image/webp') {
      assert(bytes.length >= 12 && bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP', 'Invalid ShotFlow WebP: ' + asset.path);
      assert.equal(bytes.readUInt32LE(4) + 8, bytes.length, 'Truncated ShotFlow WebP: ' + asset.path);
    } else if (asset.mime === 'image/png') {
      assert.equal(bytes.toString('hex', 0, 8), '89504e470d0a1a0a', 'Invalid ShotFlow PNG: ' + asset.path);
    } else if (asset.mime === 'image/jpeg') {
      assert.equal(bytes.toString('hex', 0, 3), 'ffd8ff', 'Invalid ShotFlow JPEG: ' + asset.path);
    } else if (asset.mime === 'video/mp4') {
      assert(bytes.length >= 12 && bytes.toString('ascii', 4, 8) === 'ftyp', 'Invalid ShotFlow MP4: ' + asset.path);
    } else if (asset.mime === 'application/json') JSON.parse(bytes.toString('utf8'));
    seen.add(asset.path); files.push(file);
  }
  return { manifest, files };
}
