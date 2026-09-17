import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { runInNewContext } from 'node:vm';
import { build } from 'esbuild';
import * as THREE from 'three';

// Bundle the real HeroPost and visual configuration in memory. Only the browser
// runtime and renderer boundary are controlled; no shader cadence is reimplemented.
// This verifies submitted pass counts, not GPU performance or rendered appearance.
const bundled = await build({
  entryPoints: [fileURLToPath(new URL('../src/v-next/heroPost.ts', import.meta.url))],
  bundle: true, write: false, platform: 'node', format: 'cjs',
  external: ['three'], define: { 'import.meta.env.DEV': 'false' },
  plugins: [{
    name: 'controlled-runtime',
    setup(builder) {
      builder.onResolve({ filter: /^\.\/runtime$/ }, () => ({ path: 'render-cost-runtime', external: true }));
    },
  }],
});
let now = 0, targetFps = 120;
const module = { exports: {} };
runInNewContext(bundled.outputFiles[0].text, {
  module, exports: module.exports,
  performance: { now: () => now },
  require(name) {
    if (name === 'three') return THREE;
    if (name === 'render-cost-runtime') return { getPerformanceSnapshot: () => ({ targetFps }) };
    throw new Error(`Unexpected test dependency: ${name}`);
  },
});
const { HeroPost } = module.exports;

function fixture() {
  let destination = null, flarePasses = 0;
  const clearColor = new THREE.Color(0);
  let clearAlpha = 1;
  const renderer = {
    capabilities: { maxSamples: 4 },
    getRenderTarget: () => destination,
    setRenderTarget: value => { destination = value; },
    getClearColor: result => result.copy(clearColor),
    getClearAlpha: () => clearAlpha,
    setClearColor: (color, alpha = 1) => { clearColor.set(color); clearAlpha = alpha; },
    clear() {},
    render() { if (destination === post.flare) flarePasses++; },
  };
  const post = new HeroPost(renderer);
  const scene = new THREE.Scene(), camera = new THREE.Camera();
  const glass = new THREE.Mesh(), backdrop = new THREE.Mesh();
  const draw = () => post.render(scene, camera, glass, backdrop, 1 / targetFps, false);
  return { post, draw, get flarePasses() { return flarePasses; } };
}

let checks = 0;
for (const [fps, expected] of [[120, 180], [60, 90], [30, 90]]) {
  targetFps = fps;
  const test = fixture();
  try {
    for (let frame = 0; frame < fps * 3; frame++) {
      now = frame * 1000 / fps;
      // Reproduce continuously changing stars, meteors and floating projects.
      test.post.invalidateBackground();
      test.draw();
    }
    assert.equal(test.flarePasses, expected, `${fps}fps scene must keep its independent highlight cadence`);
    console.log(`PASS ${fps}fps: ${expected} flare passes over 3s with continuous background invalidation`);
    checks++;

    const beforeResize = test.flarePasses;
    now += .1;
    test.post.setSize(1440, 900, 2);
    test.draw();
    assert.equal(test.flarePasses, beforeResize + 1, 'Resize must populate the new flare target immediately');
    console.log(`PASS ${fps}fps: resized highlight target refreshes immediately`);
    checks++;

    const beforeInvalidation = test.flarePasses;
    now += 1;
    test.post.invalidateBackground();
    test.draw();
    assert.equal(test.flarePasses, beforeInvalidation, 'Background invalidation must not force another early highlight pass');
    console.log(`PASS ${fps}fps: sky-only changes respect the existing highlight deadline`);
    checks++;

    now += 5_000;
    const beforeResume = test.flarePasses;
    test.draw();
    assert.equal(test.flarePasses, beforeResume + 1, 'Resuming must refresh once without replaying idle work');
    test.post.setFlare(false);
    now += 5_000;
    test.draw();
    assert.equal(test.flarePasses, beforeResume + 1, 'Disabled flare must submit no highlight pass');
    console.log(`PASS ${fps}fps: idle resume does not catch up; disabled flare stays idle`);
    checks++;
  } finally { test.post.dispose(); }
}
console.log(`\n${checks} render-cost regression checks passed. No browser/GPU performance claim is made.`);
