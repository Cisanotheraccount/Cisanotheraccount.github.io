import { createHash } from 'node:crypto';
import { copyFile, mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { photoEntry, verifyPhotographyRelease } from './photography-release.mjs';

export const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const baselineRoot = path.join(projectRoot, 'release-baselines/2.0');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');

export async function readBaseline() {
  const manifest = JSON.parse(await readFile(path.join(baselineRoot, 'manifest.json'), 'utf8'));
  const seen = new Set();
  for (const file of manifest.files) {
    if (!['public', 'frozen'].includes(file.source) || file.path.startsWith('/') || file.path.split('/').some(part => part === '..') || seen.has(file.path)) {
      throw new Error(`Invalid baseline entry: ${file.path}`);
    }
    seen.add(file.path);
  }
  return manifest;
}

export function baselineSource(file) {
  return path.join(file.source === 'public' ? path.join(projectRoot, 'public') : path.join(baselineRoot, 'site'), file.path);
}

/**
 * Verify frozen 2.0 receipts. A completed photography overlay is allowed to
 * replace exactly its route entry in an output directory; the source baseline
 * is always checked against its original receipt.
 */
export async function verifyBaseline(directory, { photographyOverlay = false, releaseRoot } = {}) {
  if (photographyOverlay && !directory) throw new Error('Photography overlay verification requires an output directory');
  const manifest = await readBaseline();
  const photography = photographyOverlay ? await verifyPhotographyRelease(releaseRoot) : undefined;
  const photographyEntry = photography?.manifest.files.find(file => file.path === photoEntry);
  if (photographyOverlay && !photographyEntry) throw new Error('Photography receipt is missing its route entry');
  const failures = [];
  for (const file of manifest.files) {
    const input = directory ? path.join(directory, file.path) : baselineSource(file);
    try {
      const bytes = await readFile(input);
      const expected = photographyOverlay && file.path === photoEntry ? photographyEntry : file;
      if (bytes.length !== expected.bytes || hash(bytes) !== expected.sha256) failures.push(file.path);
    } catch { failures.push(file.path); }
  }
  if (failures.length) throw new Error(`2.0 preservation check failed for ${failures.length} file(s):\n${failures.join('\n')}\nDo not replace the 2.0 baseline. Put revised 2.1 assets in a separate path.`);
  return manifest;
}

export async function restoreBaseline(directory) {
  const manifest = await verifyBaseline();
  for (const file of manifest.files) {
    const destination = path.join(directory, file.path);
    await mkdir(path.dirname(destination), { recursive: true });
    await copyFile(baselineSource(file), destination);
  }
  return manifest;
}
