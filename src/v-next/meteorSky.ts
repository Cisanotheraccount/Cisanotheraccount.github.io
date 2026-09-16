import type { SkyStreak } from './skyState';

/** Render capacity is independent of the quieter, three-flight population cap. */
export const skyMotion = {
  capacity: 12,
  desktopCount: 2,
  mobileCount: 2,
  desktopMax: 3,
  mobileMax: 3,
  // Sample a wider speed range once at birth; each crossing stays constant-speed.
  duration: [.9, 2.2],
  mobileDuration: [.75, 1.8],
  preparation: [.09, .16],
  baseInterval: [.035, .14],
  extraInterval: [1.5, 3.6],
  angle: [12, 27],
  tailRatio: [.23, .43],
  mobileTailRatio: [.34, .59],
  minTail: 120,
  maxTail: 650,
  mobileMinTail: 95,
  mobileMaxTail: 270,
  maxTailTravelTime: .55,
  coreWidth: [1.15, 2.05],
  mobileCoreWidth: [.95, 1.7],
  opacity: [.72, .98],
  crossingWordY: [.12, .88],
  crossingScatter: [.14, .86],
} as const;

export type SkyGeometry = {
  width: number;
  height: number;
  wordTop: number;
  wordHeight: number;
  mobile: boolean;
  /** Visible viewport intersection, in hero-local CSS pixels. */
  visibleTop?: number;
  visibleBottom?: number;
};

type Flight = {
  id: number;
  stream: number; // Two base streams, plus one occasional companion.
  entry: number;
  duration: number;
  crossingWordY: number;
  crossingScatter: number;
  angle: number;
  tailMix: number;
  coreMix: number;
  opacity: number;
};

type RenderedFlight = { flight: Flight; streak: SkyStreak; phase: number; visible: boolean; finished: boolean };
export type SkyDiagnostics = {
  clock: number;
  visibleHeads: number;
  renderSlots: number;
  flights: { id: number; stream: number; entry: number; exit: number; duration: number; phase: number; x: number; y: number; visible: boolean }[];
};

const clamp = (value: number, low = 0, high = 1) => Math.max(low, Math.min(high, value));
const mix = (low: number, high: number, progress: number) => low + (high - low) * progress;
const exitAt = (flight: Flight) => flight.entry + flight.duration;

/**
 * Each of three slots can own at most one complete streak. Replacements wait
 * until the old head AND residual tail have left, so the actual picture never
 * contains more than three meteors. Two slots recur with a short breathing gap;
 * the third arrives occasionally. There is no lifetime opacity fade.
 *
 * Flights all travel down-left. Their shallow angle is sampled once, then only
 * reduced if a short viewport requires it. Resize preserves flight time/phase,
 * and pause advances neither time nor the arrival schedule.
 */
export class RandomSky {
  private flights: Flight[] = [];
  private clock = 0;
  private serial = 0;
  private initialized = false;
  private nextEntries = [Infinity, Infinity, Infinity];
  private diagnostic: SkyDiagnostics = { clock: 0, visibleHeads: 0, renderSlots: 0, flights: [] };

  constructor(private readonly random: () => number = Math.random) {}

  private unit() {
    const value = this.random();
    return Number.isFinite(value) ? clamp(value, 0, .999999999) : .5;
  }

  private range(values: readonly [number, number]) {
    return mix(values[0], values[1], this.unit());
  }

  private launch(stream: number, entry: number, mobile: boolean): Flight {
    const range = mobile ? skyMotion.mobileDuration : skyMotion.duration;
    const flight: Flight = {
      id: ++this.serial, stream, entry, duration: this.range(range),
      crossingWordY: this.range(skyMotion.crossingWordY),
      crossingScatter: this.range(skyMotion.crossingScatter),
      angle: this.range(skyMotion.angle), tailMix: this.unit(), coreMix: this.unit(),
      opacity: this.range(skyMotion.opacity),
    };
    this.flights.push(flight);
    this.nextEntries[stream] = Infinity;
    return flight;
  }

  private initialize(mobile: boolean) {
    for (let stream = 0; stream < 2; stream++) {
      const flight = this.launch(stream, 0, mobile);
      // Offset initial heads without making the opening frame feel empty.
      flight.entry = -flight.duration * (.16 + stream * .45 + this.unit() * .08);
    }
    this.nextEntries[2] = this.range(skyMotion.extraInterval);
    this.initialized = true;
  }

  private render(flight: Flight, geometry: SkyGeometry): RenderedFlight {
    const width = Math.max(1, geometry.width);
    const height = Math.max(1, geometry.height);
    const top = clamp(geometry.visibleTop ?? 0, 0, height);
    const bottom = clamp(geometry.visibleBottom ?? height, top, height);
    const visibleHeight = Math.max(1, bottom - top);
    const wordY = geometry.wordTop + geometry.wordHeight * flight.crossingWordY;
    const cross = clamp(mix((wordY - top) / visibleHeight, flight.crossingScatter, .38), .16, .84);
    const descent = Math.min(
      width * Math.tan(flight.angle * Math.PI / 180),
      visibleHeight * Math.min(cross, 1 - cross) * 1.75,
    );
    const distance = Math.hypot(width, descent);
    const phase = (this.clock - flight.entry) / flight.duration;
    const x = (1 - phase) * width;
    const y = top + cross * visibleHeight + (phase - .5) * descent;
    const tailRange = geometry.mobile ? skyMotion.mobileTailRatio : skyMotion.tailRatio;
    const requestedTail = clamp(width * mix(tailRange[0], tailRange[1], flight.tailMix),
      geometry.mobile ? skyMotion.mobileMinTail : skyMotion.minTail,
      geometry.mobile ? skyMotion.mobileMaxTail : skyMotion.maxTail);
    const tail = Math.min(requestedTail, distance / flight.duration * skyMotion.maxTailTravelTime);
    const coreRange = geometry.mobile ? skyMotion.mobileCoreWidth : skyMotion.coreWidth;
    const streak = {
      x, y, length: tail, angle: -Math.atan2(descent, width) * 180 / Math.PI,
      opacity: flight.opacity, width: mix(coreRange[0], coreRange[1], flight.coreMix),
    };
    return {
      flight, streak, phase,
      visible: x >= 0 && x <= width && y >= top && y <= bottom && bottom > top,
      // The spare 24px also clears the shader's soft halo outside the tail.
      finished: phase > 1 + tail / distance + 24 / width,
    };
  }

  update(dt: number, running: boolean, geometry: SkyGeometry): SkyStreak[] {
    if (!this.initialized) this.initialize(geometry.mobile);
    const advancing = running && Number.isFinite(dt) && dt > 0;
    if (advancing) this.clock += dt;
    let rendered = this.flights.map(flight => this.render(flight, geometry));
    // Keep paused state exactly stable, including any queued replacement. A
    // resize may move an invisible residual tail farther out; it can wait there.
    if (advancing) {
      for (const { flight, finished } of rendered) if (finished) {
        this.nextEntries[flight.stream] = this.clock
          + this.range(flight.stream === 2 ? skyMotion.extraInterval : skyMotion.baseInterval);
      }
      this.flights = rendered.filter(item => !item.finished).map(item => item.flight);
      for (let stream = 0; stream < this.nextEntries.length; stream++) {
        if (this.nextEntries[stream] <= this.clock) {
          // Start just outside the right edge. The whole tail is still offscreen
          // and therefore cannot pop into existence inside the picture.
          this.launch(stream, this.clock + this.range(skyMotion.preparation), geometry.mobile);
        }
      }
      rendered = this.flights.map(flight => this.render(flight, geometry));
    }
    this.diagnostic = {
      clock: this.clock,
      visibleHeads: rendered.filter(item => item.visible).length,
      renderSlots: rendered.length,
      flights: rendered.map(({ flight, streak, phase, visible }) => ({
        id: flight.id, stream: flight.stream, entry: flight.entry, exit: exitAt(flight),
        duration: flight.duration, phase, x: streak.x, y: streak.y, visible,
      })),
    };
    return rendered.map(item => item.streak);
  }

  /** Read-only evidence for local acceptance recording; never drives rendering. */
  snapshot(): SkyDiagnostics {
    return { ...this.diagnostic, flights: this.diagnostic.flights.map(flight => ({ ...flight })) };
  }
}
