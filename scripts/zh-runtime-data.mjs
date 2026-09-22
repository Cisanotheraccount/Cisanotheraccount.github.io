import assert from 'node:assert/strict';

/** Browser thumbnails need public variants, not the editorial source archive. */
export function thumbnailRuntimeManifest(manifest) {
  assert.equal(manifest.schemaVersion, 1);
  return {
    schemaVersion: manifest.schemaVersion,
    projects: Object.fromEntries(Object.entries(manifest.projects).map(([slug, project]) => [slug, {
      images: project.images.map(({ id, variants }) => ({
        id,
        variants: variants.map(({ url, width, height, bytes, sha256 }) => ({ url, width, height, bytes, sha256 })),
      })),
    }])),
  };
}

export function assertPublicRuntime(code, filename) {
  // Check escaped strings too; minification must not conceal an archive path.
  const decoded = code.replace(/\\u([0-9a-f]{4})/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
  assert(!/(?:内容资料[\\/]|\/Users\/|com~apple~CloudDocs|\.codex[\\/])/i.test(decoded), `Private workspace provenance in Chinese runtime: ${filename}`);
}
