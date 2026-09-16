import { skyMotion } from './meteorSky';
/** Small, replaceable portfolio marks; these are provisional designs, not official logos. */
export const projectMarks: Record<string, { file: string; shortName: string }> = {
  'hypnos-cockpit': { file: 'hypnos.svg', shortName: 'Hýpnos' },
  introme: { file: 'introme.svg', shortName: 'IntroMe' },
  shotflow: { file: 'shotflow.svg', shortName: 'ShotFlow' },
  psytrain: { file: 'psytrain.svg', shortName: 'PsytrAIn' },
  'deal-points': { file: 'deal-points.svg', shortName: 'Deal Points' },
  orbit: { file: 'orbit.svg', shortName: 'Orbit' },
  'm-box': { file: 'm-box.svg', shortName: 'M-box' },
};

export const meteorArt = {
  breakpoint: 760,
  marks: {
    desktopCount: 7, tabletCount: 4, mobileCount: 3,
    desktopBreakpoint: 1100,
    duration: [60, 90], mobileDuration: [30, 45],
    baseDuration: 74, mobileBaseDuration: 37,
    // Each project keeps a recognisable, modest speed difference (about ±9%).
    projectSpeed: [.92, 1.04, .98, 1.09, .95, 1.06, 1.01],
    durationJitter: .025, laneJitter: .008,
    // Horizontal spacing of the vertical columns.
    band: [.12, .88], mobileBand: [.18, .82], landscapeBand: [.18, .82],
    openingPhases: [.32, .64, .43, .68, .52, .36, .58],
    mobileOpeningPhases: [.45, .63, .54],
    landscapeOpeningPhases: [.62, .80, .71],
    proximity: 64, hitSize: 44, imageSize: 38, sizeRange: [34, 42],
    opacityRange: [.78, .94],
    tailRange: [18, 42],
  },
  stars: skyMotion,
} as const;
