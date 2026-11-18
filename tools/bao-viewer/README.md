# Bao restaurant viewer source

Public page: https://galaxci.com/galaxci/bao/

From this directory run `npm ci` then `npm run build`. Vite rebuilds the viewer UI directly into `public/galaxci/bao`, preserving its independently versioned model and camera assets. The main site build copies that public directory into future releases. Dependencies are pinned in package-lock.json. The deployed model preserves all 997,248 Gaussians and SH3, with vanilla (non-antialiased) covariance conventions.

The public page saves screenshots as browser downloads; no server-side API is required. Source photographs, full-precision PLY, optimizer checkpoints and local filesystem paths are not part of the website.

On each fresh page load, the scene makes one 30-second panoramic turn at the calibrated starting position. Keyboard arrows, WASD, pointer navigation and touch arrows cancel it immediately for the rest of that page session. Background tabs pause the turn.
