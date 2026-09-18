import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { runInNewContext } from 'node:vm';
const code = await build({ entryPoints: ['src/v2-1/gpuTiming.ts'], bundle: true, write: false, format: 'cjs', platform: 'node' });
let now = 0;
const module = { exports: {} };
runInNewContext(code.outputFiles[0].text, { module, exports: module.exports, performance: { now: () => now } });
const { createHeroGpuProfiler, createGpuTimer, readHeroGpuStages } = module.exports;
function context() {
  let active = null, gpu = 0, nextId = 0, peak = 0;
  const reads = { disjoint: 0, current: 0, availability: 0, result: 0 };
  const live = new Set();
  const gl = {
    disjoint: false, lost: false, supported: true, available: true, foreignQuery: false,
    QUERY_RESULT_AVAILABLE: 2, QUERY_RESULT: 3, CURRENT_QUERY: 4,
    isContextLost: () => gl.lost,
    getExtension: () => gl.supported ? { TIME_ELAPSED_EXT: 10, GPU_DISJOINT_EXT: 11 } : null,
    getParameter: () => { reads.disjoint++; return gl.disjoint; },
    getQuery: () => { reads.current++; return gl.foreignQuery || active; },
    createQuery: () => { const q = { id: ++nextId, start: 0, result: 0 }; live.add(q); peak = Math.max(peak, live.size); return q; },
    beginQuery: (_target, q) => { assert.equal(active, null, 'Elapsed-time queries must never nest'); active = q; q.start = gpu; },
    endQuery: () => { assert.ok(active); active.result = (gpu - active.start) * 1e6; active = null; },
    getQueryParameter: (q, param) => {
      if (param === 2) { reads.availability++; return gl.available; }
      reads.result++; return q.result;
    },
    deleteQuery: q => live.delete(q),
    draw: ms => { gpu += ms; },
    loseContext: () => { gl.lost = true; active = null; live.clear(); },
    state: () => ({ active, live: live.size, peak, reads: { ...reads } }),
  };
  return gl;
}
const names = ['fluid', 'background', 'color', 'mask', 'flare', 'composite'];
let checks = 0;
const check = (name, body) => { body(); checks++; console.log(`PASS ${name}`); };
check('Subpass queries alternate with whole frames without nesting or contaminating governor totals', () => {
  const gl = context(), totals = [], profiler = createHeroGpuProfiler(gl, ms => totals.push(ms), true);
  for (let frame = 0; frame < 50; frame++) {
    now += 260; profiler.begin();
    names.forEach(name => profiler.measure(name, () => gl.draw(2)));
    profiler.end();
  }
  assert.ok(totals.length > 10); assert.ok(totals.every(value => value === 12));
  const stages = readHeroGpuStages();
  for (const name of names) { const stage = stages.find(x => x.name === name); assert.ok(stage); assert.equal(stage.p95Ms, 2); }
  assert.ok(gl.state().peak <= 4);
  profiler.dispose(); assert.equal(gl.state().live, 0); assert.equal(readHeroGpuStages().length, 0);
});
check('Normal production profile samples only complete frames and collects no subpass data', () => {
  const gl = context(), totals = [], profiler = createHeroGpuProfiler(gl, ms => totals.push(ms), false);
  for (let frame = 0; frame < 30; frame++) {
    now += 260; profiler.begin(); names.forEach(name => profiler.measure(name, () => gl.draw(3))); profiler.end();
  }
  assert.ok(totals.every(value => value === 18)); assert.equal(readHeroGpuStages().length, 0); profiler.dispose();
});
check('A disjoint interval drops pending readings', () => {
  const gl = context(), totals = [], timer = createGpuTimer(gl, ms => totals.push(ms));
  now += 300; timer.begin(); gl.draw(20); timer.end(); gl.disjoint = true;
  now += 300; timer.begin(); assert.equal(totals.length, 0); assert.equal(gl.state().live, 0); timer.dispose();
});
check('Unsupported timers still execute every visual action', () => {
  const gl = context(); gl.supported = false;
  const profiler = createHeroGpuProfiler(gl, () => assert.fail('No GPU timing available'), true);
  let draws = 0;
  for (let frame = 0; frame < 20; frame++) { now += 300; profiler.begin(); names.forEach(n => profiler.measure(n, () => draws++)); profiler.end(); }
  assert.equal(draws, 120); assert.equal(gl.state().peak, 0); profiler.dispose();
});
check('Queries release even when a profiled stage throws', () => {
  const gl = context(), profiler = createHeroGpuProfiler(gl, () => {}, true);
  now += 300; profiler.begin(); profiler.end();
  now += 300; profiler.begin();
  assert.throws(() => profiler.measure('fluid', () => { throw new Error('draw failure'); }));
  profiler.end(); assert.equal(gl.state().active, null); profiler.dispose(); assert.equal(gl.state().live, 0);
});

for (const hz of [60, 120]) {
  check(`${hz}fps regular frames perform no synchronizing GL reads between 250ms samples`, () => {
    const gl = context(), totals = [], timer = createGpuTimer(gl, ms => totals.push(ms));
    const start = now;
    timer.begin(); gl.draw(7); timer.end();
    const initialReads = gl.state().reads;
    for (let frame = 1; frame < hz / 4; frame++) {
      now = start + frame * 1000 / hz;
      timer.begin(); gl.draw(3); timer.end();
      assert.deepEqual(gl.state().reads, initialReads, 'Untimed frames must not read disjoint/query parameters');
    }
    assert.equal(totals.length, 0, 'Completion is polled asynchronously at the next sampling opportunity');
    now = start + 250;
    timer.begin(); gl.draw(4); timer.end();
    assert.deepEqual(totals, [7]);
    assert.equal(gl.state().reads.disjoint, 4);
    assert.equal(gl.state().reads.current, 2);
    assert.equal(gl.state().reads.availability, 1);
    assert.equal(gl.state().reads.result, 1);
    timer.dispose();
  });
}

check('Poll-only then whole-frame begin can start a query in the same frame without polling twice', () => {
  const gl = context(), totals = [], timer = createGpuTimer(gl, ms => totals.push(ms));
  now += 300;
  timer.begin('poll', false);
  const polls = gl.state().reads.disjoint;
  assert.equal(gl.state().active, null);
  timer.begin('total');
  assert.ok(gl.state().active, 'Polling must not consume the sampling attempt');
  assert.equal(gl.state().reads.disjoint, polls);
  gl.draw(9); timer.end();
  now += 250; timer.begin('poll', false);
  assert.deepEqual(totals, [9]); timer.dispose();
});

check('Busy external query throttles repeated CURRENT_QUERY checks and never nests', () => {
  const gl = context(), timer = createGpuTimer(gl, () => assert.fail('No query was allowed to start'));
  gl.foreignQuery = true;
  const start = now;
  for (let frame = 0; frame < 120; frame++) {
    now = start + frame * 1000 / 120; timer.begin(); timer.end();
  }
  assert.equal(gl.state().reads.current, 4);
  assert.equal(gl.state().reads.disjoint, 8);
  assert.equal(gl.state().peak, 0);
  timer.dispose();
});

check('Unavailable query pool stays bounded and timed-out readings are discarded at a poll', () => {
  const gl = context(), timer = createGpuTimer(gl, () => assert.fail('Unavailable reading must never be reported'));
  gl.available = false;
  const start = now;
  for (let frame = 0; frame < 240; frame++) {
    now = start + frame * 1000 / 120; timer.begin(); gl.draw(1); timer.end();
  }
  assert.equal(gl.state().live, 4);
  assert.equal(gl.state().peak, 4);
  assert.equal(gl.state().reads.current, 4, 'A full pool does not need CURRENT_QUERY reads');
  now = start + 6_000;
  timer.begin('poll', false);
  assert.equal(gl.state().live, 0, 'Five-second query expiry is serviced by the bounded poll');
  timer.dispose();
});

check('Disjoint detected during polling discards results and blocks same-frame sampling', () => {
  const gl = context(), totals = [], timer = createGpuTimer(gl, ms => totals.push(ms));
  now += 300; timer.begin(); gl.draw(12); timer.end();
  const normalParameter = gl.getParameter;
  let reads = 0;
  gl.getParameter = () => { normalParameter(); return ++reads === 2; };
  now += 250; timer.begin('poll', false);
  assert.equal(totals.length, 0, 'A disjoint second check invalidates a just-completed result');
  timer.begin('total');
  assert.equal(gl.state().active, null, 'Do not start immediately after a disjoint poll');
  assert.equal(gl.state().live, 0); timer.dispose();
});

check('Context loss discards queries and restoration permits a fresh sample without waiting for stale cadence', () => {
  const gl = context(), totals = [], timer = createGpuTimer(gl, ms => totals.push(ms));
  now += 300; timer.begin(); gl.draw(11); timer.end();
  gl.loseContext(); now += 10; timer.begin(); timer.end();
  assert.equal(timer.supported, false);
  gl.lost = false; now += 10; timer.begin();
  assert.ok(gl.state().active);
  gl.draw(5); timer.end();
  now += 250; timer.begin('poll', false);
  assert.deepEqual(totals, [5]); timer.dispose();
});
console.log(`${checks} GPU profiler checks passed.`);
