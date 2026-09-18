import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { runInNewContext } from 'node:vm';
import { build } from 'esbuild';
import * as THREE from 'three';

// Bundle the real HeroPost and visual configuration in memory. Only the browser
// runtime and renderer boundary are controlled; no shader cadence is reimplemented.
// This verifies submitted pass counts, not GPU performance or rendered appearance.
const bundled = await build({
  entryPoints: [fileURLToPath(new URL('../src/v2-1/heroPost.ts', import.meta.url))],
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
  let destination = null, flarePasses = 0, maskPasses = 0, skyPasses = 0, cachedPasses = 0;
  const observedViewports = [];
  let failStage;
  const clearColor = new THREE.Color(0);
  let clearAlpha = 1;
  const renderer = {
    capabilities: { maxSamples: 4 },
    autoClear: true,
    getContext: () => ({}),
    getCurrentViewport: vector => vector.copy(destination?.viewport ?? new THREE.Vector4(0, 0, 1440, 900)),
    getRenderTarget: () => destination,
    setRenderTarget: value => { destination = value; },
    getClearColor: result => result.copy(clearColor),
    getClearAlpha: () => clearAlpha,
    setClearColor: (color, alpha = 1) => { clearColor.set(color); clearAlpha = alpha; },
    clear() {},
    render(renderScene) {
      if (destination === post.flare) flarePasses++;
      if (destination === post.mask) maskPasses++;
      if (renderScene === scene && backdrop.visible) {
        if (backdrop.material === originalBackdrop) skyPasses++;
        else {
          // Simulate Three's transmission draw at a different viewport before
          // its normal color draw, then inspect actual material callback state.
          const colorTarget = destination;
          const internal = new THREE.WebGLRenderTarget(1224, 765);
          for (const output of [internal, colorTarget]) {
            destination = output;
            backdrop.material.onBeforeRender(renderer);
            observedViewports.push(backdrop.material.uniforms.uViewport.value.toArray());
            cachedPasses++;
          }
          destination = colorTarget;
          internal.dispose();
        }
      }
      if (destination === failStage) throw new Error('intentional draw failure');
    },
  };
  const post = new HeroPost(renderer);
  const scene = new THREE.Scene(), camera = new THREE.Camera();
  const glass = new THREE.Mesh(new THREE.BoxGeometry(.6, .3, .1)), backdrop = new THREE.Mesh();
  const originalBackdrop = backdrop.material;
  scene.add(glass, backdrop);
  const draw = () => post.render(scene, camera, glass, backdrop, 1 / targetFps, false);
  return { post, draw, renderer, scene, camera, glass, backdrop, originalBackdrop, observedViewports,
    failAt: target => { failStage = target; },
    get destination() { return destination; },
    get flarePasses() { return flarePasses; }, get maskPasses() { return maskPasses; },
    get skyPasses() { return skyPasses; }, get cachedPasses() { return cachedPasses; },
  };
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
const test = fixture();
try {
  now = 0; targetFps = 60; test.post.setSize(1440, 900, 2); test.draw();
  const originalGlass = test.glass.material;
  assert.equal(test.skyPasses, 1); assert.equal(test.cachedPasses, 2);
  assert.deepEqual(test.observedViewports, [[0, 0, 1224, 765], [0, 0, 2880, 1800]]);
  console.log('PASS expensive background rendered once; transmission and color normalize using their own viewport'); checks++;

  now += 17; test.post.invalidateBackground(); test.draw();
  assert.equal(test.skyPasses, 2); assert.equal(test.maskPasses, 1);
  test.glass.position.x += .1; now += 17; test.draw();
  assert.equal(test.maskPasses, 2);
  test.camera.projectionMatrix.elements[0] += .1; now += 17; test.draw();
  assert.equal(test.maskPasses, 3);
  console.log('PASS sky-only changes keep cached coverage; mesh and projection changes redraw it'); checks++;

  test.post.push(new THREE.Vector2(.5, .5), new THREE.Vector2(.01, .01));
  const energy = test.post.energy, velocity = test.post.velocity;
  test.post.setQuality('balanced');
  assert.equal(test.post.energy, energy); assert.equal(test.post.velocity, velocity);
  assert.equal(test.post.flare.width, Math.ceil(2880 * .4));
  assert.equal(test.post.color.width, 2880); assert.equal(test.post.mask.width, 2880);
  now += 17; test.draw();
  assert.equal(test.post.flare.scissorTest, false); assert.equal(test.renderer.autoClear, true);
  assert.equal(test.destination, null);
  console.log('PASS balanced quality resizes only soft flare; fluid and sharp buffers survive; scissor state restores'); checks++;

  const stages = [];
  test.post.invalidateBackground(); now += 34;
  test.post.render(test.scene, test.camera, test.glass, test.backdrop, 1 / 60, true, (name, action) => { stages.push(name); action(); });
  assert.deepEqual(stages, ['fluid', 'background', 'color', 'flare', 'composite']);
  assert.equal(test.backdrop.material, test.originalBackdrop);
  assert.equal(test.glass.material, originalGlass);
  console.log('PASS stage callbacks execute sequentially; cached mask omitted; original materials restore'); checks++;

  test.failAt(test.post.color); test.post.invalidateBackground();
  assert.throws(test.draw, /intentional draw failure/);
  assert.equal(test.backdrop.material, test.originalBackdrop);
  assert.equal(test.glass.material, originalGlass);
  assert.equal(test.glass.visible, true); assert.equal(test.backdrop.visible, true);
  assert.equal(test.destination, null);
  console.log('PASS renderer failure restores materials, visibility and caller render target'); checks++;
} finally { test.post.dispose(); }
console.log(`\n${checks} v2.1 render-cost regression checks passed. No browser/GPU performance claim is made.`);
