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

All ten selected projects use equal 3:2 preview frames, with two columns on larger screens and one on phones. Most detail covers follow a shared responsive size. ShotFlow uses a dedicated portrait case with six English native interfaces and a nine-step guided walkthrough from development build 15. The example data are staged; the native app is not presented as publicly released.

## Photographic star light

The homepage and work section place small, independently timed light cores over measured stars in the original photographs. The photograph exports, exposure and color stay unchanged. Responsive cover coordinates keep the light aligned; new pulses prefer unobstructed sky. The hero uses WebGL transmission with a transparent DOM fallback, while work-section lights remain DOM overlays. Motion pause, reduced-motion preferences and hidden/offscreen suspension are supported.

The homepage uses a broader pool of measured photo stars for narrow crops, with a faster rise, small brighter cores and soft local halos. Positions remain tied to the original photograph; work-section timing and artwork are unchanged.

The current homepage density preview supports up to 80 desktop or 40 phone pulses, with per-star size and blue/warm-yellow temperature variation, independent brightness, and mixed 1.8–5.4 second lifetimes. A photo-UV tile index keeps the glass-transmission backdrop efficient at the higher density.

## ShotFlow case and walkthrough

ShotFlow follows references, analysis, shot review and professional-camera use. The case uses complete portrait captures with image enlargement. The homepage retains a matching 3:2 project card with two equal-height captures.

The free guided walkthrough connects nine captured states with measured hotspots and keyboard-accessible actions. Two short recordings play only after a user action; media pause when changing steps, opening image zoom, hiding the page or leaving the project. Previous, restart and exit stay within the walkthrough. It does not run the native app, analyze new footage or offer arbitrary editing.

The isolated capture fixture contains two illustrative videos made from existing bundled sample images, six shots and two initially completed. Completing the demonstrated shot changes progress to three of six. See [capture provenance and media notes](public/portfolio/shotflow-walkthrough-v1/README.md).

Current-only capture mapping lives in `src/v-next/shotflowCaseContent.ts`; `ShotFlowDemo.tsx`, `shotflowWalkthrough.ts` and `shotflowDemo.css` own the guided states and interactions. Existing shared project metadata, legacy content and image archives remain intact.

## Work-section photograph

The work section has an independent Yellowstone star photograph. Prepared sRGB JPEG95/4:4:4 variants and 350 measured star positions live in `public/v-next/work-background/yellowstone/`; its source crop excludes the car and trees. The original 2022 silhouette hero and its 80/40 pulse limits remain unchanged. Older work assets are retained because the hero still uses their measured-star supplement. Normal builds use exported files without requiring the private photo archive.
