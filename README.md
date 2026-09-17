# Gala X Ci — Ci Song

Personal portfolio of Ci Song: interfaces, experiments, environments and photography.

**Website:** https://cisanotheraccount.github.io/galaxci/  
**Contact:** galaxci.song@gmail.com

## Run locally

Requires Node.js 20 or newer.

```sh
npm ci
npm run dev
```

Open `/v-next/` for the current design. The development root retains the earlier design.

## Production

```sh
npm run build
npm run preview
```

The `/galaxci/` route serves the current glass-and-starlight portfolio. The root URL forwards there, preserving bookmarked project hashes and query parameters. `/v-next/` remains available, alongside `/photography/`, the earlier `/legacy/` design and existing project URLs.

React, TypeScript, Vite, Three.js, Motion and Lenis. Ten project details use hash routing, so direct links and refresh work on GitHub Pages. The starfield and project colors use the original photographs and portfolio material.

## Publishing

The `main` branch contains the source. The `gh-pages` branch contains the built contents of `dist/` and a `.nojekyll` file. GitHub Pages publishes that branch at the root URL above. To update, build the current source, commit it to `main`, then publish the matching `dist/` output to `gh-pages`.

The original content archive, local review screenshots/recordings and machine-specific hosting configuration stay outside this public repository. Prepared website images and fonts are included so the production build is reproducible.

## Credits

Portfolio text, photographs and project artwork by Ci Song. Third-party font and glass-material licenses are retained with their respective assets and modules. Publishing the source does not grant a new license to the portfolio artwork or photographs.

## Project icons

Six selected projects float in the homepage. The artwork registry is `public/v-next/project-marks/manifest.json`; current marks are provisional. To import your SVG or transparent PNG artwork, place `icon.svg` or `icon.png` in folders named `psytrain`, `shotflow`, `introme`, `hypnos-cockpit`, `deal-points`, and `orbit`, then run:

```sh
npm run assets:icons -- --source /absolute/path/to/icons --dry-run
npm run assets:icons -- --source /absolute/path/to/icons
```

The importer preserves source bytes, records hashes, and updates public artwork without stretching or recoloring. Normal builds use the exported assets and do not access a private source archive.

## Current presentation

All ten selected projects use equal 3:2 preview frames, with two columns on larger screens and one on phones. Detail covers follow a shared responsive size. ShotFlow uses English native simulator captures from development build 15 with staged English demonstration data; the app is not presented as publicly released.

## Photographic star light

The homepage and work section place small, independently timed light cores over measured stars in the original photographs. The photograph exports, exposure and color stay unchanged. Responsive cover coordinates keep the light aligned; new pulses prefer unobstructed sky. The hero uses WebGL transmission with a transparent DOM fallback, while work-section lights remain DOM overlays. Motion pause, reduced-motion preferences and hidden/offscreen suspension are supported.
