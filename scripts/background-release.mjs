import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

export const backgroundNamespace = 'v2-1/backgrounds/';
const sources = {
  hero: {
    width: 8192, height: 5464,
    sha256: '5d4f83c4c09adcce5859f836f08d842222ab65e9494e93a70226059d99556af0',
    prefix: 'stars', legacy: 'v-next/background/',
    legacyWidths: [1536, 2560, 3072, 4096], newWidths: [5120, 6144, 8192],
  },
  work: {
    width: 5464, height: 3900,
    sha256: 'b65272f302a58cf6ebcad0fee757e272445e8caaaae1b7e7b6a99587737e7e5d',
    prefix: 'yellowstone', legacy: 'v-next/work-background/yellowstone/',
    legacyWidths: [1536, 1920, 2560, 3072, 4096], newWidths: [5120, 5464],
  },
};

// Read only the JPEG frame header; no native image package or private original
// is required by normal builds. APP/ICC segments are skipped by their lengths.
function jpegDimensions(bytes, file) {
  assert(bytes.length >= 4 && bytes.readUInt16BE(0) === 0xffd8, `Invalid JPEG: ${file}`);
  const frameMarkers = new Set([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf]);
  let offset = 2;
  while (offset < bytes.length) {
    assert.equal(bytes[offset++], 0xff, `Invalid JPEG marker: ${file}`);
    while (offset < bytes.length && bytes[offset] === 0xff) offset += 1;
    assert(offset < bytes.length, `Truncated JPEG marker: ${file}`);
    const marker = bytes[offset++];
    assert(marker !== 0xda && marker !== 0xd9 && marker !== 0, `Missing JPEG frame header: ${file}`);
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd8)) continue;
    assert(offset + 2 <= bytes.length, `Truncated JPEG segment: ${file}`);
    const length = bytes.readUInt16BE(offset);
    assert(length >= 2 && offset + length <= bytes.length, `Invalid JPEG segment length: ${file}`);
    if (frameMarkers.has(marker)) {
      assert(length >= 8, `Invalid JPEG frame: ${file}`);
      return { width: bytes.readUInt16BE(offset + 5), height: bytes.readUInt16BE(offset + 3) };
    }
    offset += length;
  }
  assert.fail(`Missing JPEG dimensions: ${file}`);
}

// Verify both shared 2.0 references and the new 2.1 assets. Return only the five
// new JPEGs and their manifest for copying/allowlisting; legacy dependencies
// remain owned by the frozen baseline and must never be overwritten here.
export async function verifyBackgroundRelease(directory) {
  const manifestPath = backgroundNamespace + 'manifest.json';
  const manifest = JSON.parse(await readFile(path.join(directory, manifestPath), 'utf8'));
  assert.deepEqual(Object.keys(manifest).sort(), Object.keys(sources).sort(), 'Expected hero and work background ladders');
  const files = [manifestPath], urls = new Set();
  let sharedCount = 0;
  for (const [name, source] of Object.entries(sources)) {
    const background = manifest[name];
    assert.equal(background.sourceSha256, source.sha256, `Background source changed: ${name}`);
    assert.equal(background.width, source.width, `Background source width changed: ${name}`);
    assert.equal(background.height, source.height, `Background source/crop height changed: ${name}`);
    assert(Array.isArray(background.variants), `Missing background variants: ${name}`);
    assert.deepEqual(background.variants.map(variant => variant.width), [...source.legacyWidths, ...source.newWidths],
      `Unexpected reviewed background widths: ${name}`);
    let previousWidth = 0, previousHeight = 0;
    for (const variant of background.variants) {
      assert(Number.isInteger(variant.width) && variant.width > previousWidth && variant.width <= source.width,
        `Invalid/upscaled background width: ${variant.url}`);
      assert(Number.isInteger(variant.height) && variant.height > previousHeight && variant.height <= source.height,
        `Invalid/upscaled background height: ${variant.url}`);
      // Python's round uses ties-to-even (the preserved 1536px hero is 1024px
      // high), so accept either integral height within half a source-ratio pixel.
      assert(Math.abs(variant.height - source.height * variant.width / source.width) <= 0.500001,
        `Background proportions changed: ${variant.url}`);
      const isNew = source.newWidths.includes(variant.width);
      const folder = isNew ? `${backgroundNamespace}${name}/` : source.legacy;
      assert.equal(variant.url, `/${folder}${source.prefix}-${variant.width}.jpg`,
        'Background must stay in an explicitly reviewed legacy or 2.1 namespace');
      assert(!urls.has(variant.url), `Duplicate background dependency: ${variant.url}`);
      assert(Number.isInteger(variant.bytes) && variant.bytes > 0, `Invalid background byte length: ${variant.url}`);
      assert.match(variant.sha256, /^[a-f0-9]{64}$/, `Invalid background SHA-256: ${variant.url}`);
      const file = variant.url.slice(1), bytes = await readFile(path.join(directory, file));
      assert.equal(bytes.length, variant.bytes, `Background byte length changed: ${file}`);
      assert.equal(createHash('sha256').update(bytes).digest('hex'), variant.sha256, `Background hash changed: ${file}`);
      assert.deepEqual(jpegDimensions(bytes, file), { width: variant.width, height: variant.height },
        `Background manifest/JPEG dimensions differ: ${file}`);
      urls.add(variant.url);
      previousWidth = variant.width;
      previousHeight = variant.height;
      if (isNew) files.push(file);
      else sharedCount += 1;
    }
  }
  assert.equal(files.length, 6, 'Only the five reviewed 2.1 JPEGs and manifest may be appended');
  return { manifest, files, sharedCount };
}
