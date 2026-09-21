import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export function latestRedirect(version) {
  assert(/^\d+\.\d+(?:\.\d+)?$/.test(version), 'Use an explicit numeric release version');
  assert(version !== '2.0', '2.0 is the frozen archive, not a mutable latest release');
  const target = `/galaxci/${version}/`;
  return `<!doctype html>
<html lang="en"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Gala X Ci — Ci Song</title>
<meta name="description" content="Ci Song — Creative Technologist. Explore interactive experiences, creative tools and immersive environments.">
<link rel="canonical" href="https://cisanotheraccount.github.io/galaxci/">
<style>html{background:#090a0c;color:#f1f0ed;font-family:system-ui,sans-serif}body{margin:2rem}a{color:inherit}</style>
<script>location.replace(${JSON.stringify(target)} + location.search + location.hash);</script>
<noscript><meta http-equiv="refresh" content="0;url=${target}"></noscript>
</head><body><a href="${target}">Open Gala X Ci</a></body></html>
`;
}

export async function promoteLatest(directory, { verifyOnly = false } = {}) {
  const { version } = JSON.parse(await readFile(path.join(root, 'release-baselines/latest.json'), 'utf8'));
  const html = latestRedirect(version);
  // Only operate on a complete website artifact with an already-built target.
  await readFile(path.join(directory, '.nojekyll'));
  const target = `galaxci/${version}/index.html`;
  const targetHtml = await readFile(path.join(directory, target), 'utf8');
  assert(targetHtml.includes(`Gala X Ci ${version}`) && !targetHtml.includes('location.replace('), 'Latest target must be an actual versioned website entry');
  const frozen = await readFile(path.join(root, 'release-baselines/2.0/site/galaxci/index.html'));
  const archive = path.join(directory, 'galaxci/2.0/index.html');
  let priorArchive;
  try { priorArchive = await readFile(archive); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  if (priorArchive) assert(priorArchive.equals(frozen), 'Do not overwrite a different 2.0 archive');
  if (!verifyOnly) {
    await mkdir(path.dirname(archive), { recursive: true });
    if (!priorArchive) await writeFile(archive, frozen);
    await writeFile(path.join(directory, 'galaxci/index.html'), html);
  }
  assert.equal(await readFile(path.join(directory, 'galaxci/index.html'), 'utf8'), html, 'Stable entry does not match the configured latest version');
  assert((await readFile(archive)).equals(frozen), 'Frozen 2.0 archive differs');
  return { version, stable: '/galaxci/', target: `/galaxci/${version}/`, archive: '/galaxci/2.0/', verified: true };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const index = args.indexOf('--output');
  assert(index >= 0 && args[index + 1], 'Usage: node scripts/promote-latest-release.mjs --output <complete-release-directory> [--verify-only]');
  console.log(JSON.stringify(await promoteLatest(path.resolve(args[index + 1]), { verifyOnly: args.includes('--verify-only') }), null, 2));
}
