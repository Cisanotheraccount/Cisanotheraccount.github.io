import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

const transpile = source => ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 } }).outputText;
const importSource = source => import('data:text/javascript;base64,' + Buffer.from(transpile(source)).toString('base64'));
const quality = await importSource(await readFile(new URL('../src/v2-1/backgroundQuality.ts', import.meta.url), 'utf8'));
const makeVariants = (widths, sourceWidth, sourceHeight) => widths.map(width => ({ url: `/image-${width}.jpg`, width, height: Math.round(width * sourceHeight / sourceWidth) }));
const hero = { width: 8192, height: 5464, sourceSha256: 'same-source', derivatives: makeVariants([1536, 2560, 3072, 4096], 8192, 5464) };
const variants = makeVariants([1536, 2560, 3072, 4096, 5120, 6144, 8192], 8192, 5464);
const workVariants = makeVariants([8192], 8192, 5464);
const choose = (width, height, dpr, extra = {}) => quality.selectBackgroundVariant({ width, height, dpr, imageWidth: hero.width, imageHeight: hero.height, variants, ...extra });
assert.equal(choose(390, 844, 3).variant.width, 4096, 'Portrait cover uses height and true DPR 3.');
assert.equal(choose(430, 932, 3).variant.width, 5120, 'Retina 3 is not capped to the glass DPR 2.');
assert.equal(choose(2560, 1440, 2).variant.width, 5120);
assert.equal(choose(3200, 2000, 2).variant.width, 8192);
assert.equal(choose(6000, 4000, 3).variant.width, 8192);
assert.equal(choose(6000, 4000, 3).sourceLimited, true);
assert.equal(choose(430, 932, 1).variant.width, 1536);
assert.equal(choose(430, 932, Number.NaN).dpr, 1);
assert.equal(choose(1536, 100, 1, { variants: [...variants].reverse() }).variant.width, 1536);
assert.equal(choose(10000, 10000, 3, { variants: [...variants, { url: '/upscaled.jpg', width: 16384, height: 10928 }] }).variant.width, 8192);
assert.equal(choose(390, 844, 3, { variants: [] }).variant, undefined);
const work = quality.selectBackgroundVariant({ width: 430, height: 932, dpr: 3, overscan: 1.1, imageWidth: 8192, imageHeight: 5464, variants: workVariants });
assert.equal(work.variant.width, 8192, 'Work uses the Lightroom JPEG without another compression pass.');
assert(Math.abs(work.desiredWidth - 932 * 8192 / 5464 * 3 * 1.1) < .00001);
const work4k = quality.selectBackgroundVariant({ width: 3840, height: 2160, dpr: 2, overscan: 1.1, imageWidth: 8192, imageHeight: 5464, variants: workVariants });
assert.equal(work4k.variant.width, 8192); assert.equal(work4k.sourceLimited, true);

// Execute the real shared controller with a deterministic browser clock/decode
// transport. This verifies async races; it does not claim image-quality or FPS QA.
let now = 0, timerId = 0, active = 0, maximum = 0;
const timers = new Map(), requests = [], resizeObservers = new Set(), viewportListeners = new Set();
const flush = async () => { for (let i = 0; i < 8; i++) await Promise.resolve(); };
const win = new EventTarget(); win.scrollY = 0;
win.setTimeout = (fn, delay) => { const id = ++timerId; timers.set(id, { fn, at: now + delay }); return id; };
win.clearTimeout = id => timers.delete(id);
const doc = new EventTarget(); doc.hidden = false;
globalThis.window = win; globalThis.document = doc; globalThis.devicePixelRatio = 3;
Object.defineProperty(globalThis, 'performance', { configurable: true, value: { now: () => now } });
globalThis.ResizeObserver = class {
  constructor(fn) { this.fn = fn; resizeObservers.add(this); }
  observe() {} disconnect() { resizeObservers.delete(this); }
};
globalThis.Image = class {
  decoding = ''; naturalWidth = 0; naturalHeight = 0;
  set src(url) { this.url = url; const item = variants.find(item => item.url === url); this.naturalWidth = item?.width ?? 1920; this.naturalHeight = item?.height ?? 1280; }
  decode() { active++; maximum = Math.max(maximum, active); return new Promise((resolve, reject) => {
    requests.push({ url: this.url, finish: (ok = true) => { active--; ok ? resolve() : reject(Error('Injected decode failure')); } });
  }); }
};
globalThis.__backgroundFixture = { metadata: hero, backgrounds: { hero: { ...hero, variants } }, quality,
  subscribe: fn => { viewportListeners.add(fn); return () => viewportListeners.delete(fn); } };
let source = await readFile(new URL('../src/v2-1/heroPhoto.ts', import.meta.url), 'utf8');
source = source.replace("import { subscribeViewportChange } from './runtime';", 'const subscribeViewportChange = globalThis.__backgroundFixture.subscribe;')
  .replace("import metadata from '../../public/v-next/background/provenance.json';", 'const metadata = globalThis.__backgroundFixture.metadata;')
  .replace("import backgrounds from '../../public/v2-1/backgrounds/manifest.json';", 'const backgrounds = globalThis.__backgroundFixture.backgrounds;')
  .replace("import { selectBackgroundVariant } from './backgroundQuality';", 'const { selectBackgroundVariant } = globalThis.__backgroundFixture.quality;');
const { subscribeHeroPhoto, heroPhoto } = await importSource(source);
assert.equal(heroPhoto.width, 8192); assert.equal(heroPhoto.height, 5464);
const advance = async ms => {
  now += ms;
  for (let guard = 0; guard < 30; guard++) {
    const due = [...timers.entries()].filter(([, item]) => item.at <= now);
    if (!due.length) break;
    for (const [id, item] of due) { if (!timers.delete(id)) continue; item.fn(); }
    await flush();
  }
};
const frame = (width, height) => ({ width, height, dataset: {}, getBoundingClientRect() { return { width: this.width, height: this.height }; } });
const resize = (element, width, height) => { element.width = width; element.height = height; win.dispatchEvent(new Event('resize')); };
{
  const element = frame(390, 844), photos = [];
  const off = subscribeHeroPhoto(element, photo => photos.push(photo));
  assert.equal(requests.at(-1).url, '/image-4096.jpg');
  resize(element, 430, 1800); assert.equal(active, 1, 'Never decode two hero variants together.');
  requests.at(-1).finish(); await flush();
  assert.equal(photos.length, 0, 'An obsolete smaller decode cannot replace the new requested state.');
  assert.equal(requests.at(-1).url, '/image-8192.jpg');
  requests.at(-1).finish(); await flush(); assert.equal(photos.at(-1).width, 8192);
  const count = requests.length; resize(element, 390, 844); await advance(301);
  assert.equal(requests.length, count, 'Shrinking keeps the decoded larger photo.'); off();
}
{
  globalThis.devicePixelRatio = 1;
  const element = frame(1440, 800), photos = [];
  const off = subscribeHeroPhoto(element, photo => photos.push(photo));
  requests.at(-1).finish(); await flush(); assert.equal(photos.at(-1).width, 1536);
  globalThis.devicePixelRatio = 2; resize(element, 2560, 1440);
  const before = requests.length; await advance(250); assert.equal(requests.length, before);
  win.scrollY = 80; win.dispatchEvent(new Event('scroll'));
  await advance(299); assert.equal(requests.length, before, 'Scroll restarts the 300ms stable interval.');
  await advance(2); assert.equal(requests.at(-1).url, '/image-5120.jpg');
  win.scrollY = 100; win.dispatchEvent(new Event('scroll'));
  requests.at(-1).finish(); await flush(); assert.equal(photos.at(-1).width, 1536, 'Do not commit during scrolling.');
  await advance(301); assert.equal(photos.at(-1).width, 5120);
  off();
}
{
  globalThis.devicePixelRatio = 3;
  const element = frame(390, 844), photos = [];
  const off = subscribeHeroPhoto(element, photo => photos.push(photo));
  requests.at(-1).finish(false); await flush(); assert.equal(requests.at(-1).url, '/image-3072.jpg');
  requests.at(-1).finish(); await flush(); assert.equal(photos.at(-1).width, 3072); assert.equal(photos.at(-1).fallback, false);
  const count = requests.length; for (let i = 0; i < 4; i++) { resize(element, 390, 844); await advance(301); }
  assert.equal(requests.length, count, 'A failed target is not retried on every same-size update.'); off();
}
{
  const element = frame(390, 844), photos = [];
  const off = subscribeHeroPhoto(element, photo => photos.push(photo)); off();
  requests.at(-1).finish(); await flush(); assert.equal(photos.length, 0, 'Disposed controller rejects late decode.');
}
{
  const element = frame(390, 844), photos = []; let earlyErrors = 0, lateErrors = 0;
  const off = subscribeHeroPhoto(element, photo => photos.push(photo), () => earlyErrors++);
  while (active) { requests.at(-1).finish(false); await flush(); }
  assert.equal(earlyErrors, 1);
  const lateOff = subscribeHeroPhoto(element, photo => photos.push(photo), () => lateErrors++);
  assert.equal(lateErrors, 1, 'A late glass subscriber receives the cached terminal failure immediately.');
  resize(element, 430, 1800); assert.equal(requests.at(-1).url, '/image-8192.jpg');
  requests.at(-1).finish(); await flush(); assert.equal(photos.at(-1).width, 8192);
  let recoveredErrors = 0;
  const recoveredOff = subscribeHeroPhoto(element, photo => photos.push(photo), () => recoveredErrors++);
  assert.equal(recoveredErrors, 0, 'Successful new-size decode clears the cached terminal failure.');
  assert.equal(element.dataset.photoFailed, undefined);
  off(); lateOff(); recoveredOff();
}
assert.equal(maximum, 1); assert.equal(active, 0); assert.equal(timers.size, 0);
console.log('PASS: real DPR cover/overscan selection, original-pixel ceiling, metadata preservation, serial decode, stale/disposed rejection, 300ms scroll/resize/commit stability, no downshift/repeated failures, terminal failure replay and recovery.');
