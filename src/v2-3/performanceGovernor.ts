import { performancePolicy as policy } from './performanceConfig';

export type PerformanceScene = 'hero' | 'work';
export type PerformancePhase = 'warming' | 'trial' | 'stable' | 'cooldown' | 'static';
export type PerformanceQuality = 'full' | 'balanced';
type Tier = 'baseline' | 'high' | 'low' | 'static';

export interface FrameStatistics {
  frames: number;
  durationMs: number;
  fps: number;
  intervalP95Ms: number;
  cpuP95Ms: number;
  /** Null means unavailable, not a zero-cost GPU. */
  gpuP95Ms: number | null;
  missedRatio: number;
}

export interface PerformanceSnapshot {
  version: '2.1';
  scene: PerformanceScene | null;
  /** Only internal transmission/highlight targets change; main DPR and artwork never do. */
  quality: PerformanceQuality;
  targetFps: number;
  /** Estimated callback delivery cadence, NOT the monitor's advertised refresh rate. */
  observedHz: number | null;
  phase: PerformancePhase;
  staticFallback: boolean;
  reason: string;
  retries: number;
  stats: FrameStatistics | null;
}

interface SceneState {
  ready: boolean;
  quality: PerformanceQuality;
  tier: Tier;
  phase: PerformancePhase;
  reason: string;
  retries: number;
  lastDowngrade: number;
  triedHigh: boolean;
  trialFrom: Tier;
  goodTrialWindows: number;
  badWindows: number;
  badDuration: number;
  healthyDuration: number;
  highHealthyDuration: number;
  qualityWarmupRemaining: number;
  stats: FrameStatistics | null;
}

const createState = (): SceneState => ({
  ready: false, quality: 'full', tier: 'baseline', phase: 'warming', reason: 'Measuring browser cadence at full quality',
  retries: 0, lastDowngrade: -Infinity, triedHigh: false, trialFrom: 'baseline',
  goodTrialWindows: 0, badWindows: 0, badDuration: 0, healthyDuration: 0,
  highHealthyDuration: 0, qualityWarmupRemaining: 0, stats: null,
});

function percentile(values: readonly number[], fraction: number) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * fraction))];
}

/** Use every Nth browser opportunity, instead of unevenly fitting 120 updates into 144Hz. */
export function evenlyPacedRate(nativeHz: number | null, ceiling: number) {
  if (!nativeHz || !Number.isFinite(nativeHz) || nativeHz <= 0) return ceiling;
  return nativeHz / Math.max(1, Math.ceil((nativeHz - .1) / ceiling));
}

/**
 * No timers, RAFs, DOM or hardware fingerprinting. The existing demand-driven runtime owns
 * lifecycle. Feed *every* active native RAF, and separately report accepted rendered frames.
 * All times and durations here are milliseconds; visual simulation can keep using seconds.
 */
export class PerformanceGovernor {
  private scene: PerformanceScene | null = 'hero';
  private states: Record<PerformanceScene, SceneState> = { hero: createState(), work: createState() };
  private inactiveState = createState();
  private nativeSamples: { time: number; delta: number }[] = [];
  private previousNative: number | null = null;
  private observedHz: number | null = null;
  private lastEstimate = -Infinity;
  private allowCadenceReduction = true;
  private warmStart: number | null = null;
  private nextRender: number | null = null;
  private pacedSkipped = 0;
  private pendingPacingAllowance = 0;
  private lastRendered: number | null = null;
  private intervals: number[] = [];
  private intervalAllowances: number[] = [];
  private cpuTimes: number[] = [];
  private gpuTimes: number[] = [];
  private windowDuration = 0;

  private get state() { return this.scene ? this.states[this.scene] : this.inactiveState; }

  setScene(scene: PerformanceScene | null, nowMs: number) {
    if (scene === this.scene) return;
    this.scene = scene;
    // Retain the scene's decision/history, never charge an inactive scene for elapsed wall time.
    this.resetSamples(nowMs);
  }

  setReady(scene: PerformanceScene, ready: boolean, nowMs: number) {
    const state = this.states[scene];
    if (state.ready === ready) return;
    state.ready = ready;
    if (scene === this.scene) this.resetSamples(nowMs);
  }

  observeNativeFrame(nowMs: number) {
    if (!Number.isFinite(nowMs)) return;
    if (this.warmStart === null && this.state.ready) this.warmStart = nowMs;
    const previous = this.previousNative;
    this.previousNative = nowMs;
    if (previous === null) return;
    const delta = nowMs - previous;
    if (delta <= 0 || delta > policy.nativeGapLimitMs) return;
    this.nativeSamples.push({ time: nowMs, delta });
    while (this.nativeSamples.length && this.nativeSamples[0].time < nowMs - policy.nativeWindowMs) this.nativeSamples.shift();
    const span = this.nativeSamples.length ? nowMs - this.nativeSamples[0].time + this.nativeSamples[0].delta : 0;
    if (span < policy.nativeMinimumMs || nowMs - this.lastEstimate < policy.nativeEstimateEveryMs) return;
    this.lastEstimate = nowMs;
    // The fast cluster survives occasional dropped callbacks; an arithmetic mean would label
    // a 120Hz browser as 100Hz under mild load. Never infer usable hardware cadence below 30Hz.
    const fastInterval = percentile(this.nativeSamples.map(sample => sample.delta), .2);
    const cluster = this.nativeSamples.filter(sample => Math.abs(sample.delta - fastInterval) < fastInterval * .2);
    const interval = cluster.reduce((sum, sample) => sum + sample.delta, 0) / cluster.length;
    const measured = 1000 / interval;
    if (!Number.isFinite(measured) || measured < 27 || measured > 520) return;
    const common = [30, 48, 50, 60, 72, 75, 90, 100, 120, 144, 165, 180, 200, 240, 360, 480];
    // WebKit can report quantized 16/16.1ms (about 62Hz) for nominal 60Hz delivery.
    // Choose the nearest rate, not the first match: a 5% range overlaps 72Hz and 75Hz.
    const nearest = common.reduce((best, rate) => Math.abs(measured - rate) < Math.abs(measured - best) ? rate : best);
    const snapped = Math.abs(measured - nearest) / nearest <= policy.nativeSnapToleranceRatio ? nearest : measured;
    const nextHz = Math.max(30, snapped);
    if (this.observedHz !== null && Math.abs(nextHz - this.observedHz) / this.observedHz < .04) return;
    const oldHz = this.observedHz;
    if (oldHz !== null && nextHz < oldHz * .9 && !this.allowCadenceReduction) {
      const oldBudget = 1000 / oldHz;
      const cpu = this.cpuTimes.length ? percentile(this.cpuTimes, .95) : this.state.stats?.cpuP95Ms ?? 0;
      const gpu = this.gpuTimes.length ? percentile(this.gpuTimes, .95) : this.state.stats?.gpuP95Ms ?? null;
      // A synchronous bottleneck can make 120Hz callbacks arrive at 60Hz. Do not relabel
      // known over-budget work as a browser power policy and erase the overload evidence.
      if (cpu > oldBudget * policy.overload.cpuBudgetRatio
        || (gpu !== null && gpu > oldBudget * policy.overload.gpuBudgetRatio)) return;
    }
    this.observedHz = nextHz;
    this.allowCadenceReduction = false;
    this.nextRender = null;
    this.clearWindow();
    this.lastRendered = null;
    this.state.healthyDuration = 0; this.state.highHealthyDuration = 0;
    // A browser cadence change is not evidence that our material is too expensive. A regular
    // power-saving 30Hz browser remains full-quality 30Hz, rather than falling to static.
    if (oldHz !== null && this.state.tier === 'high') {
      this.state.tier = 'baseline'; this.state.phase = 'warming'; this.state.triedHigh = false;
      this.warmStart = nowMs;
      this.state.reason = 'Browser cadence changed; rechecking full-quality performance';
      this.state.badDuration = 0; this.state.badWindows = 0;
    }
  }

  /** Returns false for a skipped render opportunity. Caller keeps RAF alive only for real work. */
  shouldRender(nowMs: number, force = false) {
    const interval = 1000 / this.targetFps();
    const tolerance = (1000 / (this.observedHz ?? 120)) * policy.pacingToleranceRatio;
    if (!force && this.nextRender !== null && nowMs + tolerance < this.nextRender) {
      this.pacedSkipped++;
      return false;
    }
    const ordinarySkipped = Math.max(0, Math.round((this.observedHz ?? 120) / this.targetFps()) - 1);
    // Snapping 125 callback opportunities to a 120 cap occasionally *intentionally* skips an
    // extra opportunity. Exclude only this deliberate extra gap from overload accounting;
    // absent native callbacks and ordinary Nth-frame pacing still use the real frame budget.
    this.pendingPacingAllowance = force ? 0
      : Math.max(0, this.pacedSkipped - ordinarySkipped) * (1000 / (this.observedHz ?? 120));
    this.pacedSkipped = 0;
    // No catch-up burst after a stall; also preserve the deadline through small timestamp jitter.
    this.nextRender = this.nextRender === null || force || nowMs - this.nextRender > interval
      ? nowMs + interval : this.nextRender + interval;
    return true;
  }

  /** CPU duration covers the shared accepted frame, including layout/update/scene submission. */
  recordFrame(nowMs: number, cpuMs: number) {
    if (!this.state.ready || !Number.isFinite(nowMs) || this.state.tier === 'static') return;
    const previous = this.lastRendered;
    this.lastRendered = nowMs;
    if (this.warmStart === null) this.warmStart = nowMs;
    if (previous !== null && nowMs > previous) {
      const interval = nowMs - previous;
      this.intervals.push(interval); this.windowDuration += interval;
      this.intervalAllowances.push(this.pendingPacingAllowance);
      this.cpuTimes.push(Math.max(0, Number.isFinite(cpuMs) ? cpuMs : 0));
    }
    const windowMs = this.state.phase === 'trial' ? policy.trialWindowMs : policy.stableWindowMs;
    // Tolerance avoids extending a nominal second by another whole frame due to FP arithmetic.
    if (this.windowDuration >= windowMs - .5 && this.intervals.length) this.finishWindow(nowMs);
    this.maybeUpgrade(nowMs);
  }

  /** Async GPU results are optional. Drop unavailable/disjoint results in the renderer. */
  recordGpuTime(ms: number, scene: PerformanceScene | null = this.scene) {
    if (scene === this.scene && this.state.ready && Number.isFinite(ms) && ms >= 0) {
      this.gpuTimes.push(ms);
      // Defensive bound if a renderer reports GPU results while no CPU frame is accepted.
      if (this.gpuTimes.length > 600) this.gpuTimes.shift();
    }
  }

  /** Idle/hidden time must neither punish performance nor satisfy the healthy retry interval. */
  suspend() {
    this.previousNative = null;
    this.nativeSamples = [];
    this.warmStart = null;
    this.lastEstimate = -Infinity;
    this.allowCadenceReduction = true;
    this.resetSamples(null);
  }

  /** Resize/DPR requalifies pacing, preserving the scene's quality and session retry history. */
  resetMeasurements(nowMs: number, reason = 'Viewport changed; rechecking performance at the current quality') {
    this.observedHz = null;
    this.previousNative = null;
    this.nativeSamples = [];
    this.lastEstimate = -Infinity;
    this.allowCadenceReduction = true;
    for (const state of Object.values(this.states)) {
      if (state.tier !== 'static') {
        state.tier = 'baseline'; state.phase = 'warming'; state.reason = reason;
        state.triedHigh = false;
      }
      state.goodTrialWindows = 0; state.badWindows = 0; state.badDuration = 0;
      state.healthyDuration = 0; state.highHealthyDuration = 0; state.stats = null;
    }
    this.resetSamples(nowMs);
  }

  getSnapshot(scene: PerformanceScene | null = this.scene): PerformanceSnapshot {
    const state = scene ? this.states[scene] : this.inactiveState;
    return {
      version: '2.1', scene, quality: state.quality,
      targetFps: this.targetFps(scene), observedHz: this.observedHz,
      phase: state.phase, staticFallback: state.tier === 'static', reason: state.reason,
      retries: state.retries, stats: state.stats ? { ...state.stats } : null,
    };
  }

  private targetFps(scene: PerformanceScene | null = this.scene) {
    const state = scene ? this.states[scene] : this.inactiveState;
    const ceiling = state.tier === 'high' && state.quality === 'full' ? policy.highCeiling
      : state.tier === 'low' || state.tier === 'static' ? policy.lowCeiling : policy.initialCeiling;
    return evenlyPacedRate(this.observedHz, ceiling);
  }

  private clearWindow() {
    this.intervals = []; this.intervalAllowances = []; this.cpuTimes = []; this.gpuTimes = []; this.windowDuration = 0;
    this.pacedSkipped = 0; this.pendingPacingAllowance = 0;
  }

  private resetSamples(nowMs: number | null) {
    this.nextRender = null; this.lastRendered = null; this.clearWindow();
    this.warmStart = this.state.ready ? nowMs : null;
    this.state.badWindows = 0; this.state.badDuration = 0; this.state.healthyDuration = 0;
    this.state.highHealthyDuration = 0;
    // A trial interrupted by a hidden page/scene boundary must pass both windows after resuming.
    this.state.goodTrialWindows = 0;
  }

  private finishWindow(nowMs: number) {
    const state = this.state;
    const budget = 1000 / this.targetFps();
    const stats: FrameStatistics = {
      frames: this.intervals.length, durationMs: this.windowDuration,
      fps: this.intervals.length * 1000 / this.windowDuration,
      intervalP95Ms: percentile(this.intervals, .95), cpuP95Ms: percentile(this.cpuTimes, .95),
      gpuP95Ms: this.gpuTimes.length ? percentile(this.gpuTimes, .95) : null,
      missedRatio: this.intervals.filter((interval, index) => interval > budget * policy.missedDeadlineRatio + this.intervalAllowances[index]).length / this.intervals.length,
    };
    state.stats = stats; this.clearWindow();
    // Changing internal targets can allocate/compile once. Exclude a bounded amount of
    // actual active time rather than letting hidden time satisfy this settling period.
    if (state.qualityWarmupRemaining > 0) {
      state.qualityWarmupRemaining = Math.max(0, state.qualityWarmupRemaining - stats.durationMs);
      state.badWindows = 0; state.badDuration = 0; state.healthyDuration = 0;
      state.highHealthyDuration = 0;
      return;
    }
    const qualifies = stats.fps >= this.targetFps() * policy.qualification.rateRatio
      && stats.missedRatio <= policy.qualification.missedRatio
      && stats.cpuP95Ms <= budget * policy.qualification.cpuBudgetRatio
      && (stats.gpuP95Ms === null || stats.gpuP95Ms <= budget * policy.qualification.gpuBudgetRatio);
    const overloaded = stats.fps < this.targetFps() * policy.overload.rateRatio
      || stats.missedRatio > policy.overload.missedRatio
      || stats.cpuP95Ms > budget * policy.overload.cpuBudgetRatio
      || (stats.gpuP95Ms !== null && stats.gpuP95Ms > budget * policy.overload.gpuBudgetRatio);
    state.healthyDuration = qualifies ? state.healthyDuration + stats.durationMs : 0;
    // A cheap 60fps frame alone does not qualify 120fps: reserve 30% of the prospective
    // high-rate budget for the browser/compositor before spending four seconds on a trial.
    const highBudget = 1000 / evenlyPacedRate(this.observedHz, policy.highCeiling);
    const highHeadroom = qualifies && state.quality === 'full'
      && stats.cpuP95Ms <= highBudget * policy.qualification.cpuBudgetRatio
      && (stats.gpuP95Ms === null || stats.gpuP95Ms <= highBudget * policy.qualification.gpuBudgetRatio);
    state.highHealthyDuration = highHeadroom ? state.highHealthyDuration + stats.durationMs : 0;
    if (state.phase === 'trial') {
      if (!qualifies) {
        this.downgrade(state.trialFrom, nowMs, 'Higher frame rate did not sustain the full-quality frame budget');
      } else if (++state.goodTrialWindows >= policy.trialWindows) {
        state.phase = 'stable'; state.reason = 'Full-quality frame rate qualified in two real-scene windows';
        state.badWindows = 0; state.badDuration = 0;
      }
      return;
    }
    state.badWindows = overloaded ? state.badWindows + 1 : 0;
    state.badDuration = overloaded ? state.badDuration + stats.durationMs : 0;
    if (state.tier === 'high' && state.badWindows >= policy.highBadWindows) {
      this.downgrade('baseline', nowMs, 'Two overloaded windows; preserving quality at the 60fps ceiling');
    } else if (state.tier === 'baseline' && state.badDuration >= policy.baselineBadMs - .5) {
      if (this.scene === 'hero' && state.quality === 'full') {
        this.setQuality('balanced', nowMs, 'Five seconds over budget; testing lighter internal effects at the 60fps ceiling');
      } else {
        this.downgrade('low', nowMs, 'Five seconds over budget; preserving the current quality at the 30fps ceiling');
      }
    } else if (state.tier === 'low') {
      // This is deliberately absolute: a stable browser-supplied 30Hz is healthy.
      state.badDuration = stats.fps < policy.minimumUsefulFps ? state.badDuration : 0;
      if (state.badDuration >= policy.lowBadMs - .5) {
        this.downgrade('static', nowMs, 'Ten seconds below 20 updates/s; using the accessible static fallback');
      }
    }
  }

  private maybeUpgrade(nowMs: number) {
    const state = this.state;
    if (!state.ready || this.warmStart === null || nowMs - this.warmStart < policy.warmupMs
      || this.observedHz === null || state.phase === 'trial' || state.tier === 'static' || state.tier === 'high'
      || state.qualityWarmupRemaining > 0) return;
    if (state.phase === 'warming') {
      state.phase = 'stable'; state.reason = `Following the browser cadence with ${state.quality} internal effects`;
    }
    const highAvailable = evenlyPacedRate(this.observedHz, policy.highCeiling) > evenlyPacedRate(this.observedHz, policy.initialCeiling) + 1;
    const isRetry = Number.isFinite(state.lastDowngrade);
    if (isRetry && (state.retries >= policy.maximumRetries || nowMs - state.lastDowngrade < policy.retryCooldownMs
      || state.healthyDuration < policy.retryHealthyMs)) return;
    if (state.tier === 'baseline' && state.quality === 'balanced') {
      // Recover quality before frame rate, sharing the same bounded retry allowance.
      if (!isRetry) return;
      state.retries++;
      this.setQuality('full', nowMs, 'Cooldown and ten healthy seconds passed; restoring full internal effects');
      return;
    }
    if (state.tier === 'baseline' && !highAvailable) return;
    if (state.tier === 'baseline' && state.triedHigh && !isRetry) return;
    if (state.tier === 'baseline' && state.highHealthyDuration < policy.highHealthyMs - .5) return;
    if (isRetry) state.retries++;
    state.trialFrom = state.tier;
    state.tier = state.tier === 'low' ? 'baseline' : 'high';
    if (state.tier === 'high') state.triedHigh = true;
    state.phase = 'trial'; state.goodTrialWindows = 0;
    state.reason = `Testing a higher frame rate with ${state.quality} internal effects`;
    state.badWindows = 0; state.badDuration = 0; state.healthyDuration = 0; state.highHealthyDuration = 0;
    this.nextRender = null; this.lastRendered = null; this.clearWindow();
  }

  private downgrade(tier: Tier, nowMs: number, reason: string) {
    const state = this.state;
    state.tier = tier; state.phase = tier === 'static' ? 'static' : 'cooldown'; state.reason = reason;
    state.lastDowngrade = nowMs; state.badWindows = 0; state.badDuration = 0;
    state.healthyDuration = 0; state.highHealthyDuration = 0; state.goodTrialWindows = 0;
    this.nextRender = null; this.lastRendered = null; this.clearWindow();
  }

  private setQuality(quality: PerformanceQuality, nowMs: number, reason: string) {
    const state = this.state;
    state.quality = quality; state.tier = 'baseline';
    state.phase = quality === 'full' ? 'warming' : 'cooldown'; state.reason = reason;
    if (quality === 'balanced') state.lastDowngrade = nowMs;
    state.triedHigh = false;
    state.badWindows = 0; state.badDuration = 0; state.healthyDuration = 0;
    state.highHealthyDuration = 0; state.goodTrialWindows = 0;
    state.qualityWarmupRemaining = policy.qualityWarmupMs;
    this.nextRender = null; this.lastRendered = null; this.clearWindow();
  }
}
