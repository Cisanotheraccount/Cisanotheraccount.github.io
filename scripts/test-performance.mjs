import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

// Compile the two pure TS modules in memory. No browser, fake display or generated repo files.
const sourceRoot = new URL('../src/v-next/', import.meta.url);
const asModule = source => `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`;
const transpile = source => ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 },
}).outputText;
const configUrl = asModule(transpile(await readFile(new URL('performanceConfig.ts', sourceRoot), 'utf8')));
const governorSource = transpile(await readFile(new URL('performanceGovernor.ts', sourceRoot), 'utf8'))
  .replace("'./performanceConfig'", JSON.stringify(configUrl));
const { PerformanceGovernor, evenlyPacedRate } = await import(asModule(governorSource));

let checks = 0;
function check(name, run) {
  run(); checks++; console.log(`PASS ${name}`);
}
function harness() {
  const governor = new PerformanceGovernor();
  let now = 0;
  governor.setReady('hero', true, now);
  return {
    governor,
    get now() { return now; },
    advance(duration, { hz = 120, cpu = 2, gpu, skipRenderEvery = 0, jitter = 0 } = {}) {
      const start = now;
      const end = now + duration;
      let admitted = 0, count = 0;
      const timestamps = [];
      while (now < end - .001) {
        now += (1000 / hz) + (count % 2 ? jitter : -jitter);
        governor.observeNativeFrame(now);
        if (governor.shouldRender(now)) {
          admitted++;
          if (!(skipRenderEvery && admitted % skipRenderEvery === 0)) {
            if (gpu !== undefined) governor.recordGpuTime(gpu);
            governor.recordFrame(now, cpu); timestamps.push(now);
          }
        }
        count++;
      }
      return { fps: timestamps.length * 1000 / (now - start), timestamps, snapshot: governor.getSnapshot() };
    },
    idle(duration) { governor.suspend(); now += duration; },
  };
}

check('native divisor selection is uniform and never exceeds ceiling', () => {
  for (const [native, expected] of [[60, 60], [90, 90], [120, 120], [144, 72], [165, 82.5], [240, 120]]) {
    assert.equal(evenlyPacedRate(native, 120), expected);
    assert(evenlyPacedRate(native, 60) <= 60.1);
  }
});

for (const [native, expected] of [[30, 30], [60, 60], [90, 90], [120, 120], [144, 72], [240, 120]]) {
  check(`${native}Hz raw cadence qualifies ${expected} full-quality updates/s`, () => {
    const h = harness();
    h.advance(8_000, { hz: native });
    const run = h.advance(3_000, { hz: native });
    assert.equal(run.snapshot.observedHz, native);
    assert.equal(run.snapshot.targetFps, expected);
    assert.equal(run.snapshot.phase, 'stable');
    assert.equal(run.snapshot.staticFallback, false);
    assert(Math.abs(run.fps - expected) < 1, JSON.stringify(run.snapshot));
    const deltas = run.timestamps.slice(1).map((t, i) => t - run.timestamps[i]);
    assert(Math.max(...deltas) - Math.min(...deltas) < .01, 'steady native delivery has uniform admission');
  });
}

check('own 60fps startup cap does not misidentify a 120Hz browser', () => {
  const h = harness();
  const startup = h.advance(1_000);
  assert(startup.fps >= 59 && startup.fps <= 61);
  const trial = h.advance(1_600);
  assert.equal(trial.snapshot.observedHz, 120);
  assert.equal(trial.snapshot.phase, 'trial');
  assert.equal(trial.snapshot.targetFps, 120);
});

check('small native timestamp jitter does not halve the accepted update rate', () => {
  const h = harness();
  h.advance(8_000, { jitter: .3 });
  const run = h.advance(3_000, { jitter: .3 });
  assert(run.fps > 116 && run.fps <= 121);
});

for (const [label, interval, jitter, expected] of [
  ['WebKit 16ms', 16, 0, 60],
  ['WebKit 16/16.1ms', 16.05, .05, 60],
  ['quantized 8ms', 8, 0, 120],
  ['quantized 8/8.1ms', 8.05, .05, 120],
  ['nearest 72Hz', 1000 / 72, .1, 72],
  ['nearest 75Hz', 1000 / 75, .1, 75],
]) {
  check(`${label} delivery snaps to ${expected} without needless half-rate`, () => {
    const h = harness();
    const settings = { hz: 1000 / interval, jitter };
    h.advance(8_000, settings);
    const run = h.advance(4_000, settings);
    assert.equal(run.snapshot.observedHz, expected);
    assert.equal(run.snapshot.targetFps, expected);
    assert.equal(run.snapshot.phase, 'stable');
    assert(Math.abs(run.fps - expected) < 1, JSON.stringify(run.snapshot));
  });
}

check('intentional pacing allowance does not hide genuine missing high-rate updates', () => {
  const h = harness();
  h.advance(8_000, { hz: 125 });
  assert.equal(h.governor.getSnapshot().targetFps, 120);
  h.advance(2_500, { hz: 125, skipRenderEvery: 8 });
  assert.equal(h.governor.getSnapshot().targetFps, 60);
  assert.equal(h.governor.getSnapshot().phase, 'cooldown');
});

check('readiness excludes asset compilation and loading time from qualification', () => {
  const h = harness();
  h.governor.setReady('hero', false, h.now);
  h.advance(5_000, { cpu: 100 });
  assert.equal(h.governor.getSnapshot().targetFps, 60);
  assert.equal(h.governor.getSnapshot().stats, null);
  h.governor.setReady('hero', true, h.now);
  h.advance(1_000);
  assert.equal(h.governor.getSnapshot().targetFps, 60);
  h.advance(6_000);
  assert.equal(h.governor.getSnapshot().targetFps, 120);
  assert.equal(h.governor.getSnapshot().phase, 'stable');
});

check('failed 120fps full-quality trial retains full-quality 60fps', () => {
  const h = harness();
  h.advance(7_000, { cpu: 7 });
  const state = h.governor.getSnapshot();
  assert.equal(state.targetFps, 60);
  assert.equal(state.phase, 'cooldown');
  assert.equal(state.staticFallback, false);
  assert.equal(state.retries, 0);
});

check('optional GPU time rejects an otherwise cheap CPU trial', () => {
  const h = harness();
  h.advance(7_000, { cpu: 1, gpu: 7 });
  assert.equal(h.governor.getSnapshot().targetFps, 60);
  assert.equal(h.governor.getSnapshot().stats.gpuP95Ms, 7);
});

check('two overloaded stable windows downgrade 120 to 60', () => {
  const h = harness();
  h.advance(8_000);
  h.advance(2_500, { cpu: 9 });
  assert.equal(h.governor.getSnapshot().targetFps, 60);
  assert.equal(h.governor.getSnapshot().phase, 'cooldown');
});

check('five overloaded baseline seconds downgrade full quality to 30', () => {
  const h = harness();
  h.advance(8_000, { hz: 60 });
  h.advance(6_000, { hz: 60, cpu: 18 });
  assert.equal(h.governor.getSnapshot().targetFps, 30);
  assert.equal(h.governor.getSnapshot().staticFallback, false);
});

check('sustained fewer than 20 rendered updates/s at low tier reaches fallback', () => {
  const h = harness();
  h.advance(8_000, { hz: 60 });
  h.advance(6_000, { hz: 60, cpu: 18 });
  h.advance(12_000, { hz: 60, skipRenderEvery: 2 });
  assert.equal(h.governor.getSnapshot().phase, 'static');
  assert.equal(h.governor.getSnapshot().staticFallback, true);
});

check('power-saving regular 30Hz remains full quality and does not count as failure', () => {
  const h = harness();
  h.advance(8_000);
  h.advance(20_000, { hz: 30 });
  assert.equal(h.governor.getSnapshot().observedHz, 30);
  assert.equal(h.governor.getSnapshot().targetFps, 30);
  assert.equal(h.governor.getSnapshot().phase, 'stable');
  assert.equal(h.governor.getSnapshot().staticFallback, false);
});

check('known CPU overload is not relabelled as a lower browser refresh policy', () => {
  const h = harness();
  h.advance(8_000);
  h.advance(4_000, { hz: 60, cpu: 10 });
  assert.equal(h.governor.getSnapshot().observedHz, 120);
  assert.equal(h.governor.getSnapshot().targetFps, 60);
  assert.equal(h.governor.getSnapshot().phase, 'cooldown');
});

check('120 to 60 to 120 browser cadence requalifies after a genuine low-cost change', () => {
  const h = harness();
  h.advance(8_000);
  h.advance(6_000, { hz: 60 });
  assert.equal(h.governor.getSnapshot().observedHz, 60);
  assert.equal(h.governor.getSnapshot().targetFps, 60);
  h.advance(9_000);
  assert.equal(h.governor.getSnapshot().observedHz, 120);
  assert.equal(h.governor.getSnapshot().targetFps, 120);
  assert.equal(h.governor.getSnapshot().phase, 'stable');
});

check('static fallback does not retain unbounded rendered-frame samples', () => {
  const h = harness();
  h.advance(8_000, { hz: 60 });
  h.advance(6_000, { hz: 60, cpu: 18 });
  h.advance(12_000, { hz: 60, skipRenderEvery: 2 });
  assert.equal(h.governor.getSnapshot().staticFallback, true);
  h.advance(120_000, { hz: 60 });
  assert.equal(h.governor.intervals.length, 0);
  assert.equal(h.governor.cpuTimes.length, 0);
});

check('retry requires cooldown plus actual healthy active time; session retry count is bounded', () => {
  const h = harness();
  h.advance(7_000, { cpu: 7 });
  h.advance(30_000);
  assert.equal(h.governor.getSnapshot().retries, 0);
  h.idle(120_000);
  h.advance(5_000);
  assert.equal(h.governor.getSnapshot().retries, 0, 'hidden time is not healthy scene time');
  h.advance(8_000);
  assert.equal(h.governor.getSnapshot().retries, 1);
  h.advance(8_000, { cpu: 9 });
  h.advance(70_000, { cpu: 7 });
  assert.equal(h.governor.getSnapshot().retries, 2);
  h.advance(100_000, { cpu: 7 });
  assert.equal(h.governor.getSnapshot().retries, 2);
  assert.equal(h.governor.getSnapshot().targetFps, 60);
});

check('hero overload does not permanently cap independent work scene', () => {
  const h = harness();
  h.advance(7_000, { cpu: 7 });
  assert.equal(h.governor.getSnapshot('hero').targetFps, 60);
  h.governor.setScene('work', h.now);
  h.governor.setReady('work', true, h.now);
  h.advance(8_000);
  assert.equal(h.governor.getSnapshot().targetFps, 120);
  assert.equal(h.governor.getSnapshot('hero').targetFps, 60);
  h.governor.setScene('hero', h.now);
  h.advance(1_000);
  assert.equal(h.governor.getSnapshot().targetFps, 60);
});

check('asynchronous GPU results from inactive scene cannot contaminate current trial', () => {
  const h = harness();
  h.governor.setScene('work', h.now);
  h.governor.setReady('work', true, h.now);
  h.governor.recordGpuTime(1_000, 'hero');
  h.advance(8_000);
  assert.equal(h.governor.getSnapshot().targetFps, 120);
  assert.equal(h.governor.getSnapshot().stats.gpuP95Ms, null);
});

check('idle/resume and null scene never charge elapsed wall time to rendered intervals', () => {
  const h = harness();
  h.advance(8_000);
  h.idle(1_000_000);
  h.advance(4_000);
  assert.equal(h.governor.getSnapshot().targetFps, 120);
  assert(h.governor.getSnapshot().stats.intervalP95Ms < 9);
  h.governor.setScene(null, h.now);
  h.advance(20_000, { cpu: 100 });
  assert.equal(h.governor.getSnapshot().scene, null);
  assert.equal(h.governor.getSnapshot('hero').targetFps, 120);
});

check('resize requalifies without changing artwork quality or clearing session retry history', () => {
  const h = harness();
  h.advance(8_000);
  h.governor.resetMeasurements(h.now);
  assert.equal(h.governor.getSnapshot().targetFps, 60);
  assert.equal(h.governor.getSnapshot().observedHz, null);
  h.advance(8_000);
  assert.equal(h.governor.getSnapshot().targetFps, 120);
});

console.log(`\n${checks} deterministic timing checks passed (${fileURLToPath(sourceRoot)}).`);
