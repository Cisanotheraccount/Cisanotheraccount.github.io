import type { Twinkle } from './twinkle';

/** Five RGBA8 texels per photo-UV tile: count, then up to sixteen one-based IDs. */
export const starSpatialGrid = {
  columns: 64,
  rows: 64,
  slots: 16,
  texelsPerCell: 5,
  overflow: 255,
} as const;

export const starSpatialTextureSize = {
  width: starSpatialGrid.columns * starSpatialGrid.texelsPerCell,
  height: starSpatialGrid.rows,
} as const;

/**
 * Broad-phase lookup only: the shader still evaluates the exact Gaussian and
 * support taper. An overflow tile requests the full list, never drops a star.
 * The caller reuses data, so normal animation does not allocate image buffers.
 */
export function fillStarSpatialIndex(
  data: Uint8Array,
  points: readonly Pick<Twinkle, 'u' | 'v' | 'radiusPx'>[],
  sourceWidth: number,
  sourceHeight: number,
  supportSigma: number,
) {
  const { columns, rows, slots, texelsPerCell, overflow } = starSpatialGrid;
  if (data.length !== columns * rows * texelsPerCell * 4) throw new Error('Incorrect star index buffer size');
  if (points.length >= overflow) throw new Error('Star index supports at most 254 points');
  data.fill(0);
  let occupiedCells = 0, overflowCells = 0;
  for (let index = 0; index < points.length; index++) {
    const point = points[index], radius = point.radiusPx * supportSigma;
    if (!Number.isFinite(point.u + point.v + radius) || radius <= 0) continue;
    // Float shader uniforms can round across an exact tile border. The pad is
    // one hundredth of an original-photo pixel, far below any rendered pixel.
    const support = radius + .01;
    const minU = point.u - support / sourceWidth, maxU = point.u + support / sourceWidth;
    const minV = point.v - support / sourceHeight, maxV = point.v + support / sourceHeight;
    if (maxU < 0 || minU > 1 || maxV < 0 || minV > 1) continue;
    const left = Math.max(0, Math.min(columns - 1, Math.floor(minU * columns)));
    const right = Math.max(0, Math.min(columns - 1, Math.floor(maxU * columns)));
    const top = Math.max(0, Math.min(rows - 1, Math.floor(minV * rows)));
    const bottom = Math.max(0, Math.min(rows - 1, Math.floor(maxV * rows)));
    for (let y = top; y <= bottom; y++) {
      for (let x = left; x <= right; x++) {
        const offset = (y * columns + x) * texelsPerCell * 4;
        const count = data[offset];
        if (count === overflow) continue;
        if (count === slots) { data[offset] = overflow; overflowCells++; continue; }
        if (count === 0) occupiedCells++;
        data[offset] = count + 1;
        data[offset + count + 1] = index + 1;
      }
    }
  }
  return { occupiedCells, overflowCells };
}
