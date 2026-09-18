import type { PhotoStar } from './twinkle';

type Cover = { left: number; top: number; width: number; height: number };
type Bounds = { left: number; top: number; width: number; height: number };
type Grid = { columns: number; minRows: number; maxRows: number };

/** Balance new pulses in visible sky, without moving any measured photograph star. */
export function createHeroStarDistribution(
  stars: PhotoStar[], exposed: ReadonlySet<string>, cover: Cover, bounds: Bounds,
  grid: Grid, random: () => number = Math.random,
) {
  const columns = grid.columns;
  const rows = Math.max(grid.minRows, Math.min(grid.maxRows,
    Math.round(bounds.height / Math.max(1, bounds.width / columns))));
  const cells = Array.from({ length: columns * rows }, (_, id) => ({ id, candidates: 0 }));
  const cellById = new Map<string, number>();
  for (const star of stars) {
    if (!exposed.has(star.id)) continue;
    const x = cover.left + star.u * cover.width, y = cover.top + star.v * cover.height;
    const column = Math.max(0, Math.min(columns - 1, Math.floor((x - bounds.left) / Math.max(1, bounds.width) * columns)));
    const row = Math.max(0, Math.min(rows - 1, Math.floor((y - bounds.top) / Math.max(1, bounds.height) * rows)));
    const id = row * columns + column;
    cellById.set(star.id, id); cells[id].candidates++;
  }
  const occupancy = (active: readonly { id: string }[]) => {
    const counts = new Array<number>(cells.length).fill(0);
    for (const star of active) {
      const id = cellById.get(star.id);
      if (id !== undefined) counts[id]++;
    }
    return counts;
  };
  return {
    columns, rows, cells,
    summarize(active: readonly { id: string }[]) {
      const counts = occupancy(active);
      return cells.map(cell => ({ ...cell, active: counts[cell.id] }));
    },
    choose(available: PhotoStar[], active: PhotoStar[], distance: number): PhotoStar | undefined {
      const counts = occupancy(active);
      const byCell = new Map<number, PhotoStar[]>();
      for (const star of available) {
        const id = cellById.get(star.id);
        if (id === undefined) continue;
        const pool = byCell.get(id);
        if (pool) pool.push(star); else byCell.set(id, [star]);
      }
      // Choose an underfilled region first, then a real star inside it. Dense
      // portions of the catalog must not crowd the center or edges out of view.
      // Cells with no available stars wait for cooldown; no synthetic points.
      let least = Infinity;
      const eligible: number[] = [];
      for (const id of byCell.keys()) {
        if (counts[id] < least) { least = counts[id]; eligible.length = 0; }
        if (counts[id] === least) eligible.push(id);
      }
      if (!eligible.length) return undefined;
      const id = eligible[Math.floor(random() * eligible.length)];
      const pool = byCell.get(id)!;
      const separated = pool.filter(star => active.every(other =>
        Math.hypot((star.u - other.u) * cover.width, (star.v - other.v) * cover.height) >= distance));
      const selection = separated.length ? separated : pool;
      return selection[Math.floor(random() * selection.length)];
    },
  };
}
