import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

export const entryNamespace = 'v2-1/entry/';

// Container/header validation does not need native dependencies or private
// source material. Both lossless and ordinary alpha WebP captures are accepted.
function webpInfo(bytes, file) {
  assert(bytes.length >= 12 && bytes.toString('ascii', 0, 4) === 'RIFF'
    && bytes.toString('ascii', 8, 12) === 'WEBP', `Invalid WebP container: ${file}`);
  assert.equal(bytes.readUInt32LE(4) + 8, bytes.length, `Truncated WebP container: ${file}`);
  let width = 0, height = 0, alpha = false, hasImage = false;
  for (let offset = 12; offset < bytes.length;) {
    assert(offset + 8 <= bytes.length, `Truncated WebP chunk: ${file}`);
    const kind = bytes.toString('ascii', offset, offset + 4), length = bytes.readUInt32LE(offset + 4);
    const start = offset + 8, end = start + length;
    assert(end + (length & 1) <= bytes.length, `Invalid WebP chunk length: ${file}`);
    if (kind === 'VP8X') {
      assert(length >= 10, `Invalid WebP extended header: ${file}`);
      assert(!(bytes[start] & 2), `Entry fallback must be a still image: ${file}`);
      alpha ||= !!(bytes[start] & 16);
      width = 1 + bytes.readUIntLE(start + 4, 3); height = 1 + bytes.readUIntLE(start + 7, 3);
    } else if (kind === 'VP8L') {
      assert(length >= 5 && bytes[start] === 0x2f, `Invalid lossless WebP: ${file}`);
      const bits = bytes.readUInt32LE(start + 1), w = (bits & 0x3fff) + 1, h = ((bits >>> 14) & 0x3fff) + 1;
      if (width) assert(width === w && height === h, `Conflicting WebP dimensions: ${file}`);
      width = w; height = h; alpha ||= !!((bits >>> 28) & 1); hasImage = true;
    } else if (kind === 'VP8 ') {
      assert(length >= 10 && bytes.toString('hex', start + 3, start + 6) === '9d012a', `Invalid WebP keyframe: ${file}`);
      const w = bytes.readUInt16LE(start + 6) & 0x3fff, h = bytes.readUInt16LE(start + 8) & 0x3fff;
      if (width) assert(width === w && height === h, `Conflicting WebP dimensions: ${file}`);
      width = w; height = h; hasImage = true;
    } else if (kind === 'ALPH') alpha = true;
    offset = end + (length & 1);
  }
  assert(hasImage && width > 0 && height > 0, `Missing WebP image: ${file}`);
  return { width, height, alpha };
}

export async function verifyEntryRelease(directory) {
  const manifestPath = entryNamespace + 'manifest.json';
  const manifest = JSON.parse(await readFile(path.join(directory, manifestPath), 'utf8'));
  assert.equal(manifest.version, 1, 'Unsupported entry asset manifest version');
  assert(manifest.source && typeof manifest.source === 'object' && !Array.isArray(manifest.source), 'Entry asset provenance is required');
  assert(Array.isArray(manifest.files) && manifest.files.length > 0, 'Entry manifest must list its dependencies');
  const files = [manifestPath], seen = new Set();
  for (const asset of manifest.files) {
    assert.match(asset.path, /^v2-1\/entry\/[a-z0-9][a-z0-9-]*\.webp$/, 'Entry dependencies must stay in their reviewed flat namespace');
    assert(!seen.has(asset.path), `Duplicate entry asset: ${asset.path}`); seen.add(asset.path);
    assert(Number.isSafeInteger(asset.bytes) && asset.bytes > 0, `Invalid entry byte count: ${asset.path}`);
    assert(Number.isInteger(asset.width) && asset.width > 0 && Number.isInteger(asset.height) && asset.height > 0, `Invalid entry dimensions: ${asset.path}`);
    assert.match(asset.sha256, /^[a-f0-9]{64}$/, `Invalid entry SHA-256: ${asset.path}`);
    const bytes = await readFile(path.join(directory, asset.path));
    assert.equal(bytes.length, asset.bytes, `Entry byte count changed: ${asset.path}`);
    assert.equal(createHash('sha256').update(bytes).digest('hex'), asset.sha256, `Entry hash changed: ${asset.path}`);
    const info = webpInfo(bytes, asset.path);
    assert.equal(info.width, asset.width, `Entry width changed: ${asset.path}`);
    assert.equal(info.height, asset.height, `Entry height changed: ${asset.path}`);
    assert(info.alpha, `Entry fallback must preserve transparency: ${asset.path}`);
    files.push(asset.path);
  }
  assert(seen.has(entryNamespace + 'mobius.webp'), 'The reviewed ring fallback must be present');
  return { manifest, files };
}
