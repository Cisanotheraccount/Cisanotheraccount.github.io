import { starCatalog, type Twinkle } from './twinkle';
import { projectStarLight, starLightGradient } from './starLight';
import { combinedHeroStars } from './heroStarCatalog';

/** Hero-only appearance, independent of the work-section photograph and light. */
export const heroTwinkleArt = {
  capacity: 10, mobileCapacity: 5, mobileBreakpoint: 760,
  interval: [.18, .34], duration: [1.7, 2.7], cooldown: [6, 16], strength: [.95, 1],
  rise: [.18, .3], hold: [.14, .24],
  diameter: { min: 3.6, max: 4, scale: 2 },
  mobileDiameter: { min: 3.2, max: 4, scale: 2 },
  coreOpacity: .98, haloOpacity: .38, haloSigma: 2.1, supportSigma: 5,
  separation: .16,
} as const;

const starsById = new Map(combinedHeroStars.map(star => [star.id, star]));
export function projectHeroTwinkle(point: Twinkle, coverWidth: number, mobile = false): Twinkle {
  return projectStarLight(point, starsById.get(point.id)!, starCatalog.source.width, coverWidth,
    mobile ? heroTwinkleArt.mobileDiameter : heroTwinkleArt.diameter);
}
export const heroTwinkleGradient = (color: readonly number[]) => starLightGradient(color, heroTwinkleArt);
