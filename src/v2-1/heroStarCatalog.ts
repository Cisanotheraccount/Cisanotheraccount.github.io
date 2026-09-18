import supplement from '../../public/v-next/work-background/star-points-extra.json';
import { catalogMatchesPhoto, starCatalog, type PhotoStar } from './twinkle';

const original = starCatalog.source;
const source = supplement.source;
const crop = source.crop;
const minimumDistancePx = 36;

/** Reuse measured source stars, never the work image's cropped UV coordinates. */
export const heroSupplementValid = catalogMatchesPhoto
  && source.sha256 === original.sha256
  && source.originalWidth === original.width && source.originalHeight === original.height
  && source.width === crop.width && source.height === crop.height
  && [crop.x, crop.y, crop.width, crop.height].every(Number.isFinite)
  && crop.x >= 0 && crop.y >= 0 && crop.width > 0 && crop.height > 0
  && crop.x + crop.width <= original.width && crop.y + crop.height <= original.height
  && supplement.count === supplement.points.length
  && new Set(supplement.points.map(point => point.id)).size === supplement.points.length
  && supplement.points.every(point => /^work-star-\d+$/.test(point.id)
    && Number.isFinite(point.x) && Number.isFinite(point.y)
    && point.x >= 0 && point.y >= 0 && point.x < crop.width && point.y < crop.height
    && Math.abs(point.u - (point.x + .5) / crop.width) < .000001
    && Math.abs(point.v - (point.y + .5) / crop.height) < .000001);

const additional: PhotoStar[] = [];
if (heroSupplementValid) {
  for (const point of supplement.points) {
    const x = crop.x + point.x, y = crop.y + point.y;
    const isDuplicate = (other: PhotoStar) =>
      (other.x - x) ** 2 + (other.y - y) ** 2 < minimumDistancePx ** 2;
    if (starCatalog.points.some(isDuplicate) || additional.some(isDuplicate)) continue;
    additional.push({
      ...point,
      id: point.id.replace('work-star-', 'hero-extra-'),
      x, y,
      u: (x + .5) / original.width,
      v: (y + .5) / original.height,
    });
  }
}

export const heroSupplementSourceCount = supplement.points.length;
export const heroSupplementCount = additional.length;
export const combinedHeroStars: PhotoStar[] = [...starCatalog.points, ...additional];
