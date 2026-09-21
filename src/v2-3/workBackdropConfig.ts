/** Work-only art direction. Hero exposure, timing and colors stay independent. */
export const workBackdropArt = {
  // Preserve the user's Lightroom exposure and star highlights on the page.
  photoOpacity: 1,
  // Lift the lower Milky Way into view; overscan keeps portrait edges covered.
  photoScale: 1.10,
  photoAnchorY: 1,
  primaryOpacity: 0,
  secondaryOpacity: 0,
  transitionSeconds: 1.1,
  selectionHysteresis: .065,
  // Section-edge transitions are separate from the photograph's exposure.
  entryFade: 220,
  exitFade: 300,
  mobileBreakpoint: 760,
  neutral: { primary: [102, 114, 132], secondary: [119, 112, 108] },
  twinkles: {
    capacity: 4,
    mobileCapacity: 2,
    interval: [.85, 2.4],
    duration: [3, 5],
    cooldown: [12, 30],
    strength: [.65, .85],
    rise: [.55, .85],
    hold: [.12, .22],
    diameter: { min: 2, max: 3.2, scale: 1.6 },
    mobileDiameter: { min: 1.8, max: 2.8, scale: 1.6 },
    coreOpacity: .75,
    haloOpacity: .14,
    haloSigma: 1.8,
    supportSigma: 5,
    separation: .14,
    obstructionPadding: 8,
  },
} as const;
