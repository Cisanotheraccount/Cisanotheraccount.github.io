import type { PhotographyPhoto } from './catalog.types';

// Phone landscape remains one column. Tablets use one portrait / two landscape.
export function galleryMode(width: number, height: number): 1 | 2 | 3 {
  if (Math.min(width, height) < 600 || width < 768) return 1;
  if (width <= 1366) return width > height ? 2 : 1;
  return 3;
}

export function arrangePhotos(photos: PhotographyPhoto[], width: number, gap: number, mode: 1 | 2 | 3, viewportHeight: number) {
  const available = Math.max(1, width);
  const target = Math.max(400, Math.min(720, viewportHeight * .66));
  const ratio = (photo: PhotographyPhoto) => photo.width / photo.height;
  const rows: Array<{ photos: PhotographyPhoto[]; height: number; widths: number[] }> = [];
  const costs = new Array<number>(photos.length + 1).fill(Infinity);
  const counts = new Array<number>(photos.length).fill(1);
  costs[photos.length] = 0;
  for (let start = photos.length - 1; start >= 0; start--) {
    const candidates = mode === 1 ? [1] : mode === 2 ? [Math.min(2, photos.length - start)] : [2, 3, 1];
    for (const count of candidates) {
      if (start + count > photos.length || (mode === 3 && count === 1 && start !== photos.length - 1)) continue;
      const sum = photos.slice(start, start + count).reduce((value, photo) => value + ratio(photo), 0);
      const height = (available - gap * (count - 1)) / sum;
      const cost = Math.log(height / target) ** 2 + (count === 1 && mode > 1 ? 4 : 0) + costs[start + count];
      if (cost < costs[start]) { costs[start] = cost; counts[start] = count; }
    }
  }
  for (let start = 0; start < photos.length;) {
    const count = counts[start];
    const rowPhotos = photos.slice(start, start + count);
    const sum = rowPhotos.reduce((value, photo) => value + ratio(photo), 0);
    const naturalHeight = (available - gap * (count - 1)) / sum;
    const height = count === 1 && mode > 1 ? Math.min(naturalHeight, target) : naturalHeight;
    rows.push({ photos: rowPhotos, height, widths: rowPhotos.map(photo => height * ratio(photo)) });
    start += count;
  }
  return rows;
}
