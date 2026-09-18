# Frozen galaxci 2.0 release

This is the approved `adaptive-fps-v27` release, preserved independently of the
2.1 renderer. The public default remains `/galaxci/`; `/galaxci/2.1/` is separate.

- Source commit: `bea1081d49f3ca6b6fd6e9af79d28b0ac161654c`.
- GitHub Pages commit: `7303887b33dc34d0cb9806f3cdaa06b9e601b668`.
- `manifest.json` records all 240 files tracked in that published release.
- `site/` stores 87 generated pages, immutable bundles and release markers.
- 153 unchanged photos, fonts, models and public metadata are reused from
  `public/`, guarded by exact byte lengths and SHA-256 hashes.

`npm run build` typechecks current sources, builds 2.1 in its own Vite/Rollup
graph, restores this release byte for byte and appends only the new version's
HTML and `assets/2-1/` files. It needs no private content library, previous
`dist/`, `.cache/`, Git checkout, or local archive.

`npm run verify:baseline` checks the frozen inputs and shared public assets.
`npm run verify:baseline -- dist` checks a complete deployment directory.
Run the latter before publishing, and deploy the entire `dist/` directory.

Do not regenerate this baseline during 2.1 work or overwrite shared assets.
Revised art must receive an independent path and an explicit build-copy rule.
The baseline includes historical hashed bundles so already-open/cached 2.0 tabs
can continue loading their original dynamic imports after 2.1 is deployed.
