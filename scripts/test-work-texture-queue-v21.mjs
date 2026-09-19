import fs from 'node:fs';
import assert from 'node:assert/strict';
import ts from 'typescript';

// Execute the actual scheduler in memory. Only browser-only diagnostics are
// replaced; this creates no build artifacts and does not mock queue behavior.
const filename = new URL('../src/v2-1/workTextureQueue.ts', import.meta.url);
let source = fs.readFileSync(filename, 'utf8');
const diagnosticsImport = "import { recordTouchMetric, sampleTouchMetric } from './touchDiagnostics';";
assert(source.includes(diagnosticsImport));
source = source.replace(diagnosticsImport, 'const recordTouchMetric = () => {}; const sampleTouchMetric = () => {};');
const result = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ESNext }, reportDiagnostics: true });
assert.equal(result.diagnostics.length, 0);
const { createWorkTextureQueue } = await import('data:text/javascript;base64,' + Buffer.from(result.outputText).toString('base64'));
const flush = async () => { for (let i = 0; i < 6; i++) await Promise.resolve(); };
function harness() {
  const state = { active: 0, maximum: 0, failures: [], discarded: [], starts: [], uploads: [], wakes: 0 };
  const releases = new Map(), keys = new Map();
  const queue = createWorkTextureQueue(() => state.wakes++);
  const add = (name, priority, valid = () => true) => {
    const key = {}; keys.set(name, key);
    queue.enqueue({ key, priority: () => priority, valid,
      decode: () => {
        state.starts.push(name); state.active++; state.maximum = Math.max(state.maximum, state.active);
        return new Promise((resolve, reject) => releases.set(name, (ok = true) => {
          state.active--; if (ok) resolve({ name }); else reject(Error('injected decode failure'));
        }));
      },
      upload: image => state.uploads.push(image.name),
      failed: stage => state.failures.push({ name, stage }), discarded: () => state.discarded.push(name),
    });
  };
  return { state, releases, keys, queue, add };
}
{
  const { state, releases, keys, queue, add } = harness();
  add('previous', 4); add('next', 2); add('visible-a', 0); add('visible-b', .1); add('far', Infinity);
  queue.prepare(); assert.deepEqual(state.starts, ['visible-a', 'visible-b']); assert.equal(state.maximum, 2);
  releases.get('visible-b')(); await flush(); queue.prepare();
  assert.deepEqual(state.starts, ['visible-a', 'visible-b', 'next']);
  releases.get('visible-a')(); await flush();
  assert.equal(queue.uploadOne(), true); assert.deepEqual(state.uploads, ['visible-a']);
  assert.equal(queue.uploadOne(), true); assert.deepEqual(state.uploads, ['visible-a', 'visible-b']);
  queue.cancel(keys.get('next')); releases.get('next')(); await flush(); queue.prepare();
  assert.equal(state.starts.at(-1), 'previous'); assert(!state.uploads.includes('next'));
  releases.get('previous')(); await flush(); queue.uploadOne();
  assert.equal(state.maximum, 2); assert(!state.starts.includes('far')); queue.dispose();
}
{
  const { state, releases, queue, add } = harness();
  let generation = 1;
  add('stale-after-decode', 0, () => generation === 1); queue.prepare();
  releases.get('stale-after-decode')(); await flush(); generation++;
  assert.equal(queue.uploadOne(), false); assert.deepEqual(state.uploads, []);
  assert(state.discarded.includes('stale-after-decode')); queue.dispose();
}
{
  const { state, releases, queue, add } = harness();
  add('fail', 0); add('busy', 1); add('next', 2); queue.prepare();
  releases.get('fail')(false); await flush(); queue.prepare();
  assert.equal(state.starts.at(-1), 'next');
  assert.deepEqual(state.failures, [{ name: 'fail', stage: 'decode' }]);
  releases.get('busy')(); releases.get('next')(); await flush();
  queue.uploadOne(); queue.uploadOne(); assert.deepEqual(state.uploads, ['busy', 'next']); queue.dispose();
}
{
  const { state, releases, queue, add } = harness();
  add('pending-at-dispose', 0); queue.prepare(); queue.dispose(); const wakes = state.wakes;
  releases.get('pending-at-dispose')(); await flush();
  queue.prepare(); assert.equal(queue.uploadOne(), false); assert.equal(queue.hasReadyWork(), false);
  assert.equal(state.wakes, wakes); assert.deepEqual(state.uploads, []);
}
console.log('PASS: decode concurrency <=2; visible/next/previous priority; one upload per call; stale/cancelled jobs cannot upload; failure frees slot; far jobs dormant; disposal ignores late completion.');
