/** Work-only art direction. Hero exposure, timing and colors stay independent. */
export const workBackdropArt = {
  photoOpacity: .56,
  primaryOpacity: .16,
  secondaryOpacity: .08,
  transitionSeconds: 1.1,
  selectionHysteresis: .065,
  entryFade: 220,
  exitFade: 300,
  maxDpr: 1.5,
  mobileBreakpoint: 760,
  neutral: { primary: [102, 114, 132], secondary: [119, 112, 108] },
  twinkles: {
    capacity: 4,
    mobileCapacity: 2,
    interval: [.85, 2.4],
    duration: [2.5, 5],
    cooldown: [12, 30],
    strength: [.24, .52],
  },
} as const;
