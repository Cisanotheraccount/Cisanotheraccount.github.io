import catalog from '../../public/v-next/background/star-points.json';
import photoMetadata from '../../public/v-next/background/provenance.json';

export const twinkleArt = {
  capacity: 10, mobileCapacity: 6, mobileBreakpoint: 760,
  interval: [.24, .9], duration: [1.8, 4.6], cooldown: [8, 24],
  strength: [.38, .9], gain: 1.65, halo: .003,
  sigmaScale: 1.15, minimumSigmaPx: 2.4,
} as const;
export const starCatalog = catalog;
export const catalogMatchesPhoto = catalog.source.sha256 === photoMetadata.sourceSha256
  && catalog.source.width === photoMetadata.width && catalog.source.height === photoMetadata.height;
export type PhotoStar = typeof catalog.points[number];
export type Twinkle = { id: string; u: number; v: number; radiusPx: number; amplitude: number; overlay?: { diameterPx: number; color: [number, number, number] } };
type Pulse = { star: PhotoStar; age: number; duration: number; strength: number; knots: { time: number; value: number }[] };
export type PulseEnvelope = (duration: number, random: () => number) => Pulse['knots'];
export type TwinkleTiming = {
  interval: readonly [number, number]; duration: readonly [number, number];
  cooldown: readonly [number, number]; strength: readonly [number, number];
  /** Preserve dense emission rates across frame intervals; opt-in for the hero. */
  catchUp?: boolean;
};
const smooth = (value: number) => { const t = Math.max(0, Math.min(1, value)); return t * t * (3 - 2 * t); };

/** Independent, finite scintillations. Nothing drifts and no repeating sine loop. */
export class TwinkleField {
  private pulses: Pulse[] = [];
  private clock = 0;
  private next = .12;
  private cooldown = new Map<string, number>();
  constructor(private readonly random: () => number = Math.random, private readonly timing: TwinkleTiming = twinkleArt, private readonly envelope?: PulseEnvelope) {}
  private range(values: readonly [number, number]) { return values[0] + this.random() * (values[1] - values[0]); }
  update(dt: number, running: boolean, candidates: PhotoStar[], limit: number, choose?: (available: PhotoStar[], active: PhotoStar[]) => PhotoStar | undefined): Twinkle[] {
    const visible = new Set(candidates.map(point => point.id));
    // Cropping may remove a star, but must never assign its pulse to a new pixel.
    this.pulses = this.pulses.filter(pulse => visible.has(pulse.star.id));
    if (running) {
      this.clock += dt;
      for (const pulse of this.pulses) pulse.age += dt;
      this.pulses = this.pulses.filter(pulse => pulse.age < pulse.duration);
      const activeIds = new Set(this.pulses.map(pulse => pulse.star.id));
      const emissions = this.timing.catchUp ? 8 : 1;
      for (let attempt = 0; attempt < emissions && this.clock >= this.next; attempt++) {
        const available = candidates.filter(star => !activeIds.has(star.id) && (this.cooldown.get(star.id) ?? 0) <= this.clock);
        if (this.pulses.length < limit && available.length) {
          const star = choose ? choose(available, this.pulses.map(pulse => pulse.star)) : available[Math.floor(this.random() * available.length)];
          if (star) {
            const duration = this.range(this.timing.duration);
            this.pulses.push({ star, age: this.timing.catchUp ? Math.min(this.clock - this.next, .05) : 0, duration, strength: this.range(this.timing.strength), knots: this.envelope?.(duration, this.random) ?? [
              { time: 0, value: 0 }, { time: this.range([.14, .25]), value: this.range([.55, 1]) },
              { time: this.range([.34, .49]), value: this.range([.12, .5]) },
              { time: this.range([.59, .77]), value: this.range([.5, 1]) }, { time: 1, value: 0 },
            ] });
            activeIds.add(star.id);
            this.cooldown.set(star.id, this.clock + duration + this.range(this.timing.cooldown));
          }
        }
        this.next = (this.timing.catchUp ? this.next : this.clock) + this.range(this.timing.interval);
      }
      // Never replay a long backlog after a stalled frame. Paused time is not accrued.
      if (this.timing.catchUp && this.clock >= this.next) this.next = this.clock + this.range(this.timing.interval);
    }
    return this.pulses.slice(0, limit).map(pulse => {
      const progress = pulse.age / pulse.duration;
      const index = pulse.knots.findIndex(knot => knot.time > progress);
      const end = pulse.knots[Math.max(1, index)], start = pulse.knots[Math.max(0, index - 1)];
      const amplitude = pulse.strength * (start.value + (end.value - start.value) * smooth((progress - start.time) / (end.time - start.time)));
      return sampleStar(pulse.star, amplitude);
    });
  }
}
export function sampleStar(star: PhotoStar, amplitude: number): Twinkle {
  return { id: star.id, u: star.u, v: star.v, radiusPx: Math.max(twinkleArt.minimumSigmaPx, star.radiusPx * twinkleArt.sigmaScale), amplitude };
}

type Frame = { points: Twinkle[]; revision: number };
const frames = new WeakMap<HTMLElement, Frame>();
const empty: Frame = { points: [], revision: 0 };
export function publishTwinkles(hero: HTMLElement, points: Twinkle[]) {
  const previous = frames.get(hero) ?? empty;
  if (previous.points.length === points.length && points.every((point, i) => {
    const old = previous.points[i];
    return point.id === old.id && point.u === old.u && point.v === old.v && point.amplitude === old.amplitude
      && point.radiusPx === old.radiusPx && point.overlay?.diameterPx === old.overlay?.diameterPx
      && point.overlay?.color.join(',') === old.overlay?.color.join(',');
  })) return;
  frames.set(hero, { points, revision: previous.revision + 1 });
}
export const getTwinkles = (hero: HTMLElement) => frames.get(hero) ?? empty;
export const clearTwinkles = (hero: HTMLElement) => frames.delete(hero);
