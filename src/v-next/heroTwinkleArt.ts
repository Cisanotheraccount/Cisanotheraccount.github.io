import { starCatalog, type Twinkle } from './twinkle';
import { projectStarLight, starLightGradient } from './starLight';

/** Hero-only appearance, independent of the work-section photograph and light. */
export const heroTwinkleArt = {
  capacity: 6, mobileCapacity: 3, mobileBreakpoint: 760,
  interval: [.42, .7], duration: [2.5, 4.5], cooldown: [8, 24], strength: [.85, 1],
  rise: [.4, .6], hold: [.12, .22],
  diameter: { min: 2.6, max: 4, scale: 1.7 },
  mobileDiameter: { min: 2.2, max: 3.4, scale: 1.7 },
  coreOpacity: .82, haloOpacity: .18, haloSigma: 1.8, supportSigma: 5,
  separation: .16,
} as const;

const starsById = new Map(starCatalog.points.map(star => [star.id, star]));
export function projectHeroTwinkle(point: Twinkle, coverWidth: number, mobile = false): Twinkle {
  return projectStarLight(point, starsById.get(point.id)!, starCatalog.source.width, coverWidth,
    mobile ? heroTwinkleArt.mobileDiameter : heroTwinkleArt.diameter);
}
export const heroTwinkleGradient = (color: readonly number[]) => starLightGradient(color, heroTwinkleArt);
