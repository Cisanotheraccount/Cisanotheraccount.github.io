import { uiGlass } from './uiGlassConfig';
import { meteorArt } from './meteorsConfig';
// Shared art direction. DOM controls never share a transform with the scene.
export const visual = {
  ink: '#090a0c', paper: '#f1f0ed', muted: '#a8a9ad',
  motion: { entry: .72, menu: .22, press: .12, spring: { type: 'spring' as const, stiffness: 310, damping: 36, mass: .9 } },
  glass: { roughness: .035, ior: 1.36, thickness: 1.4, dispersion: .08, environment: 1.5, clearcoat: .55, starExposure: 1, tint: 0xffffff, attenuation: 0xedf2fc, maxDpr: 2, mobileDpr: 2 },
  renderQuality: { full: { transmissionScale: 1, flareScale: .5 }, balanced: { transmissionScale: .85, flareScale: .4 } },
  scattering: { strength: .055, density: .45, wrap: .5 },
  lighting: {
    exposure: 1.12, point: 190, fill: 1.3, backdropTint: 0xffffff,
    panels: [
      { color: 0xffffff, strength: 5, position: [-8, 7, 5], size: [2, 14] },
      { color: 0xf3f5ff, strength: 2.5, position: [0, 2, 10], size: [17, 5] },
      { color: 0xe0e6ff, strength: 3.2, position: [8, 3, 3], size: [3, 12] },
      { color: 0xffffff, strength: 3, position: [0, 9, -2], size: [16, 2] },
      { color: 0xc5b9a6, strength: 1.3, position: [0, -7, 4], size: [14, 3] },
      { color: 0xffffff, strength: 1.2, position: [-5, -1, -8], size: [7, 7] },
    ],
  },
  work: {
    maxCurl: .06, touchCurl: .035, speedReference: 800, attack: .025, release: .175,
    hoverScale: 1.025, hoverDamping: 12, flattenDuration: 140, maxDpr: 1.5, touchDpr: 3,
    scrollOverscan: .12, scrollOverscanMin: 64, scrollOverscanMax: 128,
    scrollStaleMs: 160,
  },
  uiGlass,
  meteors: meteorArt,
  pointer: { rotationX: .03, rotationY: .042, damping: 7 },
  cameraMotion: { offsetX: .85, offsetY: .55, lookAtFactor: -.12, damping: 7, leaveDamping: 5, overscan: 1.035 },
  rimLight: { radius: Math.hypot(Math.cos(.9) * 10, Math.sin(.9) * 8), angle: Math.atan2(Math.sin(.9) * 8, Math.cos(.9) * 10), damping: 6, centerDeadZone: .035, z: 10 },
  fluid: {
    resolution: 224, pressureIterations: 6,
    radius: .095, force: 5.5, velocityLimit: .22, maxImpulse: .045,
    dissipation: 5.8, displacement: .095, maxPixels: 16, widthRatio: .014,
    chroma: .035, tailThreshold: .012, settle: .001,
  },
  flare: { resolutionScale: .5, highRefreshFps: 60, standardFps: 30, threshold: .9, power: 4, intensity: .11, length: 16 },
} as const;
