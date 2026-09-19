import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

export const thumbnailNamespace = 'v2-1/thumbnails/';
const projects = ['psytrain', 'shotflow', 'introme', 'hypnos-cockpit', 'deal-points', 'orbit', 'cyber-city', 'crystal-city', 'last-one', 'gala-x-ci-vr-gallery'];

// Both packaging and release verification consume this exact asset allowlist.
// Never copy all public/v2-1 files: only reviewed manifest dependencies belong
// in the isolated release, and every byte must agree with its recorded hash.
export async function verifyThumbnailRelease(directory) {
  const manifestPath = thumbnailNamespace + 'manifest.json';
  const manifest = JSON.parse(await readFile(path.join(directory, manifestPath), 'utf8'));
  assert.equal(manifest.schemaVersion, 1, 'Unsupported thumbnail manifest version');
  assert.deepEqual(Object.keys(manifest.projects).sort(), [...projects].sort(), 'All ten public projects need thumbnails');
  const files = [manifestPath], urls = new Set();
  for (const slug of projects) {
    const images = manifest.projects[slug].images;
    const ids = slug === 'shotflow' ? ['workspace', 'storyboard'] : ['cover'];
    assert.deepEqual(images.map(image => image.id).sort(), [...ids].sort(), `Incorrect image slots for ${slug}`);
    for (const image of images) {
      assert(image.variants.length > 0, `No responsive candidates for ${slug}/${image.id}`);
      let previousWidth = 0;
      for (const variant of image.variants) {
        assert(Number.isInteger(variant.width) && variant.width > previousWidth && variant.width <= 1600, `Invalid width ordering: ${variant.url}`);
        assert(Number.isInteger(variant.height) && variant.height > 0, `Invalid image height: ${variant.url}`);
        assert(variant.width <= image.source.width, `Thumbnail cannot upscale its source: ${variant.url}`);
        const allowedUrls = [`/${thumbnailNamespace}${slug}/${image.id}-${variant.width}.webp`];
        if (slug === 'shotflow') allowedUrls.push(`/v2-1/shotflow-import-v2/thumbnails/${image.id}-${variant.width}.webp`);
        assert(allowedUrls.includes(variant.url), 'Thumbnail must stay in its exact project/slot namespace');
        assert(!urls.has(variant.url), `Duplicate thumbnail dependency: ${variant.url}`);
        const file = variant.url.slice(1), bytes = await readFile(path.join(directory, file));
        assert.equal(bytes.length, variant.bytes, `Thumbnail byte length changed: ${file}`);
        assert.equal(createHash('sha256').update(bytes).digest('hex'), variant.sha256, `Thumbnail hash changed: ${file}`);
        assert.equal(bytes.toString('ascii', 0, 4), 'RIFF', `Invalid WebP container: ${file}`);
        assert.equal(bytes.toString('ascii', 8, 12), 'WEBP', `Invalid WebP type: ${file}`);
        previousWidth = variant.width; urls.add(variant.url); files.push(file);
      }
    }
  }
  return { manifest, files };
}
