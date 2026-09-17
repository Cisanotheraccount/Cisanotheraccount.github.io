import { skyMotion } from './meteorSky';
import { floatingProjects } from '../portfolioData';
import markManifest from '../../public/v-next/project-marks/manifest.json';
/** The catalog controls selection; the public manifest controls replaceable artwork. */
export const heroProjectSlugs = floatingProjects.map(project => project.slug);
export const projectMarks: Record<string, { file: string; fallbackFile: string; shortName: string }> = markManifest.projects;

export const meteorArt = {
  breakpoint: 760,
  marks: {
    desktopCount: 6, tabletCount: 4, mobileCount: 3,
    desktopBreakpoint: 1100,
    duration: [60, 90], mobileDuration: [30, 45],
    baseDuration: 74, mobileBaseDuration: 37,
    // Each project keeps a recognisable, modest speed difference (about ±9%).
    projectSpeed: { 'hypnos-cockpit': .92, introme: 1.04, shotflow: .98, psytrain: 1.09, 'deal-points': .95, orbit: 1.06 } as Record<string, number>,
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
