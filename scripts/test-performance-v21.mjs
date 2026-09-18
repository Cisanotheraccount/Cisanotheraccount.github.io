import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

// Exercise the actual 2.1 state machine without DOM, browser timing or generated source files.
const sourceRoot = new URL('../src/v2-1/', import.meta.url);
const asModule = source => `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`;
const transpile = source => ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 },
}).outputText;
const configUrl = asModule(transpile(await readFile(new URL('performanceConfig.ts', sourceRoot), 'utf8')));
const source = transpile(await readFile(new URL('performanceGovernor.ts', sourceRoot), 'utf8'))
  .replace("'./performanceConfig'", JSON.stringify(configUrl));
const { PerformanceGovernor, evenlyPacedRate } = await import(asModule(source));

let checks = 0;
function check(name, run) { run(); checks++; console.log(`PASS ${name}`); }
function harness() {
  const governor = new PerformanceGovernor();
  let now = 0;
  governor.setReady('hero', true, now);
  return {
    governor,
    get now() { return now; },
    advance(duration, { hz = 120, cpu = 2, gpu, skipRenderEvery = 0, jitter = 0 } = {}) {
      const start = now, end = now + duration;
      let admitted = 0, count = 0;
      const timestamps = [], changes = [];
      let key = JSON.stringify(governor.getSnapshot());
      while (now < end - .001) {
        now += 1000 / hz + (count % 2 ? jitter : -jitter);
        governor.observeNativeFrame(now);
        if (governor.shouldRender(now)) {
          admitted++;
          if (!(skipRenderEvery && admitted % skipRenderEvery === 0)) {
            const before = governor.getSnapshot();
            const value = typeof gpu === 'function' ? gpu(before) : gpu;
            if (value !== undefined) governor.recordGpuTime(value);
            governor.recordFrame(now, typeof cpu === 'function' ? cpu(before) : cpu);
            timestamps.push(now);
            const snapshot = governor.getSnapshot(), next = JSON.stringify(snapshot);
            if (next !== key) { changes.push({ time: now, ...snapshot }); key = next; }
          }
        }
        count++;
      }
      return { fps: timestamps.length * 1000 / (now - start), timestamps, changes, snapshot: governor.getSnapshot() };
    },
    idle(duration) { governor.suspend(); now += duration; },
    work() { governor.setScene('work', now); governor.setReady('work', true, now); },
  };
}

check('2.1 starts full at 60 and keeps native samples separate from admission', () => {
  const h = harness();
  assert.equal(h.governor.getSnapshot().version, '2.1');
  const start = h.advance(3_000);
  assert.equal(start.snapshot.quality, 'full');
  assert.equal(start.snapshot.targetFps, 60);
  assert.equal(start.snapshot.observedHz, 120);
  assert(start.fps >= 59 && start.fps <= 61);
});

check('ten continuous healthy seconds with high-rate headroom precede a trial', () => {
  const h = harness();
  h.advance(10_000, { gpu: 4 });
  assert.equal(h.governor.getSnapshot().targetFps, 60);
  h.advance(3_000, { gpu: 4 });
  assert.equal(h.governor.getSnapshot().targetFps, 120);
  assert.equal(h.governor.getSnapshot().phase, 'trial');
  h.advance(5_000, { gpu: 4 });
  assert.equal(h.governor.getSnapshot().phase, 'stable');
});

for (const [label, costs] of [['CPU', { cpu: 7 }], ['GPU', { cpu: 1, gpu: 7 }]]) {
  check(`${label} headroom too small for 120 keeps full 60 without speculative trials`, () => {
    const h = harness();
    h.advance(90_000, costs);
    assert.equal(h.governor.getSnapshot().targetFps, 60);
    assert.equal(h.governor.getSnapshot().phase, 'stable');
    assert.equal(h.governor.getSnapshot().quality, 'full');
    assert.equal(h.governor.getSnapshot().retries, 0);
  });
}

check('one poor headroom window resets the ten-second prequalification streak', () => {
  const h = harness();
  h.advance(8_000, { gpu: 3 });
  h.advance(2_000, { gpu: 7 });
  h.advance(8_000, { gpu: 3 });
  assert.equal(h.governor.getSnapshot().targetFps, 60);
  h.advance(5_000, { gpu: 3 });
  assert.equal(h.governor.getSnapshot().targetFps, 120);
});

check('GPU-unavailable qualification uses CPU and actual intervals without fabricating zero GPU', () => {
  const h = harness();
  h.advance(18_000);
  assert.equal(h.governor.getSnapshot().targetFps, 120);
  assert.equal(h.governor.getSnapshot().stats.gpuP95Ms, null);
});

for (const [native, expected] of [[30, 30], [60, 60], [90, 90], [120, 120], [144, 72], [240, 120]]) {
  check(`${native}Hz qualifies a uniform ${expected}fps ceiling`, () => {
    const h = harness();
    h.advance(18_000, { hz: native });
    const run = h.advance(3_000, { hz: native });
    assert.equal(run.snapshot.observedHz, native);
    assert.equal(run.snapshot.targetFps, expected);
    assert.equal(run.snapshot.quality, 'full');
    assert.equal(run.snapshot.phase, 'stable');
    assert(Math.abs(run.fps - expected) < 1);
    const deltas = run.timestamps.slice(1).map((time, i) => time - run.timestamps[i]);
    assert(Math.max(...deltas) - Math.min(...deltas) < .01);
    assert(evenlyPacedRate(native, 60) <= 60.1);
  });
}

for (const [interval, jitter, expected] of [[16, 0, 60], [16.05, .05, 60], [8, 0, 120], [8.05, .05, 120]]) {
  check(`quantized ${interval}ms raw cadence does not halve ${expected}fps`, () => {
    const h = harness();
    const options = { hz: 1000 / interval, jitter };
    h.advance(18_000, options);
    const run = h.advance(3_000, options);
    assert.equal(run.snapshot.targetFps, expected);
    assert.equal(run.snapshot.phase, 'stable');
    assert(Math.abs(run.fps - expected) < 1);
  });
}

check('high-rate trial failure returns full 60 rather than changing quality', () => {
  const h = harness();
  h.advance(13_000);
  assert.equal(h.governor.getSnapshot().phase, 'trial');
  h.advance(3_000, { gpu: 8 });
  assert.equal(h.governor.getSnapshot().targetFps, 60);
  assert.equal(h.governor.getSnapshot().quality, 'full');
  assert.equal(h.governor.getSnapshot().phase, 'cooldown');
});

check('two genuinely missed high windows are not hidden by quantized pacing allowances', () => {
  const h = harness();
  h.advance(18_000, { hz: 125 });
  h.advance(2_500, { hz: 125, skipRenderEvery: 8 });
  assert.equal(h.governor.getSnapshot().targetFps, 60);
  assert.equal(h.governor.getSnapshot().phase, 'cooldown');
});

check('hero full 60 overload first selects balanced 60, with two active settling seconds', () => {
  const h = harness();
  h.advance(4_000, { hz: 60 });
  h.advance(6_000, { hz: 60, gpu: 18 });
  let state = h.governor.getSnapshot();
  assert.equal(state.quality, 'balanced');
  assert.equal(state.targetFps, 60);
  h.advance(4_000, { hz: 60, gpu: 18 });
  assert.equal(h.governor.getSnapshot().targetFps, 60, 'warmup is excluded from five bad balanced seconds');
  h.advance(4_000, { hz: 60, gpu: 18 });
  state = h.governor.getSnapshot();
  assert.equal(state.quality, 'balanced');
  assert.equal(state.targetFps, 30);
});

check('successful balanced tier holds 60 and never qualifies 120', () => {
  const h = harness();
  h.advance(8_000, { gpu: 18 });
  const run = h.advance(40_000, { gpu: 2 });
  assert.equal(run.snapshot.quality, 'balanced');
  assert.equal(run.snapshot.targetFps, 60);
  assert(run.changes.every(state => state.targetFps <= 60));
});

check('work retains full effects and goes directly from 60 to 30', () => {
  const h = harness(); h.work();
  h.advance(8_000, { hz: 60, gpu: 18 });
  const state = h.governor.getSnapshot();
  assert.equal(state.targetFps, 30);
  assert.equal(state.quality, 'full');
  assert.equal(h.governor.getSnapshot('hero').quality, 'full');
});

check('full recovery requires cooldown plus ten actually healthy active seconds', () => {
  const h = harness();
  h.advance(8_000, { gpu: 18 });
  h.advance(30_000, { gpu: 3 });
  assert.equal(h.governor.getSnapshot().quality, 'balanced');
  h.idle(120_000);
  h.advance(8_000, { gpu: 3 });
  assert.equal(h.governor.getSnapshot().quality, 'balanced', 'hidden time is not healthy time');
  h.advance(5_000, { gpu: 3 });
  assert.equal(h.governor.getSnapshot().quality, 'full');
  assert.equal(h.governor.getSnapshot().targetFps, 60, 'restore quality before high-rate prequalification');
  assert.equal(h.governor.getSnapshot().retries, 1);
});

check('quality and frame-rate recoveries share a bounded two-retry scene budget', () => {
  const h = harness();
  const qualityCost = state => state.quality === 'full' ? 18 : 3;
  h.advance(250_000, { gpu: qualityCost });
  const state = h.governor.getSnapshot();
  assert.equal(state.retries, 2);
  assert.equal(state.quality, 'balanced');
  assert.equal(state.targetFps, 60);
  h.advance(100_000, { gpu: 1 });
  assert.equal(h.governor.getSnapshot().quality, 'balanced');
  assert.equal(h.governor.getSnapshot().retries, 2);
});

check('higher-rate retry also consumes the shared recovery budget', () => {
  const h = harness();
  h.advance(8_000, { gpu: 18 });
  h.advance(85_000, { gpu: 3 });
  const state = h.governor.getSnapshot();
  assert.equal(state.quality, 'full');
  assert.equal(state.targetFps, 120);
  assert.equal(state.phase, 'stable');
  assert.equal(state.retries, 2);
});

check('resize retains balanced quality and retry history while remeasuring cadence', () => {
  const h = harness();
  h.advance(90_000, { gpu: state => state.quality === 'full' ? 18 : 3 });
  assert.equal(h.governor.getSnapshot().quality, 'balanced');
  const retries = h.governor.getSnapshot().retries;
  h.governor.resetMeasurements(h.now);
  const state = h.governor.getSnapshot();
  assert.equal(state.quality, 'balanced');
  assert.equal(state.targetFps, 60);
  assert.equal(state.observedHz, null);
  assert.equal(state.retries, retries);
  h.advance(4_000, { gpu: 3 });
  assert.equal(h.governor.getSnapshot().quality, 'balanced');
});

check('quality and performance history stay independent for hero and work', () => {
  const h = harness();
  h.advance(8_000, { gpu: 18 });
  h.work(); h.advance(18_000, { gpu: 3 });
  assert.equal(h.governor.getSnapshot().targetFps, 120);
  assert.equal(h.governor.getSnapshot().quality, 'full');
  assert.equal(h.governor.getSnapshot('hero').quality, 'balanced');
  h.governor.setScene('hero', h.now); h.advance(1_000, { gpu: 3 });
  assert.equal(h.governor.getSnapshot().quality, 'balanced');
  assert.equal(h.governor.getSnapshot().targetFps, 60);
});

check('loading, hidden time and scene interruption cannot complete high prequalification', () => {
  const h = harness();
  h.governor.setReady('hero', false, h.now);
  h.advance(20_000, { gpu: 100 });
  assert.equal(h.governor.getSnapshot().stats, null);
  h.governor.setReady('hero', true, h.now);
  h.advance(8_000);
  h.idle(120_000);
  h.advance(8_000);
  assert.equal(h.governor.getSnapshot().targetFps, 60);
  h.advance(9_000);
  assert.equal(h.governor.getSnapshot().targetFps, 120);
});

check('stable browser-supplied 30Hz remains full quality', () => {
  const h = harness();
  h.advance(18_000);
  h.advance(20_000, { hz: 30 });
  const state = h.governor.getSnapshot();
  assert.equal(state.observedHz, 30);
  assert.equal(state.targetFps, 30);
  assert.equal(state.quality, 'full');
  assert.equal(state.staticFallback, false);
});

check('known GPU overload cannot masquerade as a healthy lower browser cadence', () => {
  const h = harness();
  h.advance(18_000);
  h.advance(4_000, { hz: 60, gpu: 10 });
  assert.equal(h.governor.getSnapshot().observedHz, 120);
  assert.equal(h.governor.getSnapshot().targetFps, 60);
});

check('low-tier severe overload reaches static and bounded storage remains bounded', () => {
  const h = harness();
  h.advance(18_000, { hz: 60, gpu: 18 });
  assert.equal(h.governor.getSnapshot().targetFps, 30);
  h.advance(12_000, { hz: 60, skipRenderEvery: 2 });
  assert.equal(h.governor.getSnapshot().staticFallback, true);
  h.advance(120_000, { hz: 60 });
  assert.equal(h.governor.intervals.length, 0);
  assert.equal(h.governor.cpuTimes.length, 0);
});

check('late GPU results from the inactive hero do not affect work qualification', () => {
  const h = harness(); h.work();
  h.governor.recordGpuTime(1000, 'hero');
  h.advance(18_000);
  assert.equal(h.governor.getSnapshot().targetFps, 120);
  assert.equal(h.governor.getSnapshot().stats.gpuP95Ms, null);
});

check('disposed hero stays static through raw cadence changes, resize and readiness notifications', () => {
  const h = harness();
  h.advance(18_000, { hz: 60, gpu: 18 });
  h.advance(12_000, { hz: 60, skipRenderEvery: 2 });
  assert.equal(h.governor.getSnapshot().staticFallback, true);
  const { reason, quality, retries } = h.governor.getSnapshot();
  for (const hz of [120, 144, 30, 60]) {
    h.advance(8_000, { hz });
    const state = h.governor.getSnapshot();
    assert.equal(state.phase, 'static');
    assert.equal(state.staticFallback, true);
    assert(state.targetFps <= 30);
    assert.equal(state.reason, reason);
  }
  h.governor.resetMeasurements(h.now);
  h.governor.setReady('hero', false, h.now);
  h.advance(4_000);
  h.governor.setReady('hero', true, h.now);
  h.advance(18_000);
  const state = h.governor.getSnapshot();
  assert.equal(state.phase, 'static');
  assert.equal(state.staticFallback, true);
  assert.equal(state.targetFps, 30);
  assert.equal(state.reason, reason);
  assert.equal(state.quality, quality);
  assert.equal(state.retries, retries);
  assert.equal(state.stats, null, 'Viewport reset must not claim newly rendered hero samples');
});

check('healthy work scene and idle time cannot revive a disposed static hero', () => {
  const h = harness();
  h.advance(18_000, { hz: 60, gpu: 18 });
  h.advance(12_000, { hz: 60, skipRenderEvery: 2 });
  h.work(); h.advance(18_000);
  assert.equal(h.governor.getSnapshot().scene, 'work');
  assert.equal(h.governor.getSnapshot().targetFps, 120);
  assert.equal(h.governor.getSnapshot('hero').staticFallback, true);
  h.governor.setScene('hero', h.now);
  h.idle(120_000);
  h.advance(70_000);
  assert.equal(h.governor.getSnapshot().scene, 'hero');
  assert.equal(h.governor.getSnapshot().phase, 'static');
  assert.equal(h.governor.getSnapshot().staticFallback, true);
  assert.equal(h.governor.getSnapshot().targetFps, 30);
});

console.log(`\n${checks} deterministic 2.1 quality and timing checks passed.`);
