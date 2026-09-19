import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const html = await readFile(new URL('../v2-1/index.html', import.meta.url), 'utf8');
const source = html.match(/<script id="gxc-entry-runtime">([\s\S]*?)<\/script>/)?.[1];
assert(source, 'The independent classic entry bridge exists before the app module.');
assert(html.indexOf('id="gxc-entry-runtime"') < html.indexOf('id="gxc-main-module"'));
assert.match(html, /id="gxc-entry-visual"[^>]+tabindex="0"/);
assert.match(html, /touch-action: pinch-zoom/);
assert.match(html, /data-entry-ring=true\] canvas \{ visibility: visible !important/);
assert.match(html, /data-entry-handoff=out/); assert.match(html, /data-entry-handoff=in/);
assert.match(html, /<noscript>/); assert.match(html, /Preparing your experience/); assert.match(html, /Continue to site/);
assert(!/animationend/.test(source), 'Exit is timer-driven, not dependent on CSS animation events.');
const flush = async () => { for (let i = 0; i < 8; i++) await Promise.resolve(); };
class Hub {
  events = new Map();
  addEventListener(type, fn) { const listeners = this.events.get(type) ?? new Set(); listeners.add(fn); this.events.set(type, listeners); }
  removeEventListener(type, fn) { this.events.get(type)?.delete(fn); }
  emit(type, event = {}) { for (const fn of this.events.get(type) ?? []) fn({ target: this, ...event }); }
}
class Element extends Hub {
  dataset = {}; hidden = false; inert = false; attributes = new Map(); textContent = ''; focuses = 0;
  classes = new Set(); classList = { add: (...values) => values.forEach(v => this.classes.add(v)), remove: (...values) => values.forEach(v => this.classes.delete(v)), contains: value => this.classes.has(value) };
  setAttribute(name, value) { this.attributes.set(name, value); }
  removeAttribute(name) { this.attributes.delete(name); }
  contains(node) { return node?.entryChild === true; }
  focus() { this.focuses++; }
}
function setup({ hash = '', reduced = false, navigation = 'navigate', fonts = 'ready' } = {}) {
  let now = 0, sequence = 0, reloads = 0;
  const pending = new Map(), fontCalls = [];
  const elements = Object.fromEntries(['root', 'gxc-entry', 'gxc-entry-status', 'gxc-entry-skip', 'gxc-entry-retry'].map(id => [id, new Element()]));
  elements['gxc-entry'].hidden = true; elements['gxc-entry-skip'].hidden = true; elements['gxc-entry-retry'].hidden = true;
  elements['gxc-entry-skip'].entryChild = true; elements['gxc-entry-retry'].entryChild = true;
  const document = new Hub(); document.documentElement = new Element(); document.hidden = false; document.activeElement = null;
  document.getElementById = id => elements[id]; const firstLink = new Element(); document.querySelector = () => firstLink;
  document.fonts = { load: descriptor => { fontCalls.push(descriptor); return fonts === 'stuck' ? new Promise(() => {}) : Promise.resolve([]); } };
  const window = new Hub(), motion = new Hub(); motion.matches = reduced;
  const context = { window, document, matchMedia: () => motion, location: { hash, reload: () => reloads++ },
    performance: { now: () => now, getEntriesByType: () => [{ type: navigation }] },
    setTimeout: (fn, delay) => { const id = ++sequence; pending.set(id, { fn, at: now + Math.max(0, delay) }); return id; },
    clearTimeout: id => pending.delete(id), console,
  };
  vm.runInNewContext(source, context);
  const advance = async milliseconds => {
    const destination = now + milliseconds;
    for (let guard = 0; guard < 1000; guard++) {
      const next = [...pending].filter(([, item]) => item.at <= destination).sort((a, b) => a[1].at - b[1].at)[0];
      if (!next) break;
      pending.delete(next[0]); now = next[1].at; next[1].fn(); await flush();
    }
    now = destination; await flush();
  };
  return { bridge: window.__gxcEntry, elements, document, window, motion, advance, fontCalls, firstLink, reloads: () => reloads };
}
{
  const h = setup(), b = h.bridge;
  assert.equal(b.phase, 'preparing'); assert.equal(h.elements.root.inert, true);
  assert.equal(h.fontCalls.length, 0, 'Do not accept document.fonts.ready before app/CSS readiness.');
  b.settlePart('photo', 'ready'); b.settlePart('glass', 'ready'); await h.advance(100);
  assert.equal(b.phase, 'preparing', 'Assets alone cannot bypass app/font readiness.');
  b.markAppReady(); await flush(); assert.equal(h.fontCalls.length, 2);
  await h.advance(699); assert.equal(b.phase, 'preparing');
  await h.advance(1); assert.equal(b.phase, 'revealing'); assert.equal(b.milestones.revealing, 800);
  await h.advance(649); assert.equal(b.phase, 'revealing');
  await h.advance(1); assert.equal(b.phase, 'complete'); assert.equal(h.elements.root.inert, false);
  assert.equal(h.elements['gxc-entry'].hidden, true); assert.equal(b.milestones.complete, 1450);
}
{
  const h = setup({ fonts: 'stuck' }), b = h.bridge;
  b.markAppReady(); b.settlePart('photo', 'fallback'); b.settlePart('glass', 'fallback');
  await h.advance(1499); assert.equal(b.phase, 'preparing');
  await h.advance(1); assert.equal(b.phase, 'revealing'); assert.equal(h.elements['gxc-entry'].dataset.fontResult, 'timeout');
  await h.advance(650); assert.equal(b.phase, 'complete');
}
{
  const h = setup({ reduced: true }), b = h.bridge;
  b.markAppReady(); b.settlePart('photo', 'ready'); b.settlePart('glass', 'fallback'); await flush();
  assert.equal(b.phase, 'revealing'); assert.equal(b.milestones.revealing, 0);
  await h.advance(99); assert.equal(b.phase, 'revealing'); await h.advance(1); assert.equal(b.phase, 'complete');
}
for (const hash of ['#work', '#about', '#contact', '#/work/shotflow']) {
  const h = setup({ hash }); assert.equal(h.bridge.phase, 'complete'); assert.equal(h.bridge.reason, 'deep-link');
  assert.equal(h.elements.root.inert, false); h.bridge.markAppReady(); await h.advance(9000); assert.equal(h.bridge.error, false);
}
{
  const h = setup({ navigation: 'back_forward' }); assert.equal(h.bridge.phase, 'complete'); assert.equal(h.bridge.reason, 'history');
}
{
  const h = setup(); h.window.emit('pageshow', { persisted: true }); assert.equal(h.bridge.phase, 'complete'); assert.equal(h.bridge.reason, 'bfcache');
}
{
  const h = setup(); h.bridge.markAppReady(); h.bridge.settlePart('photo', 'ready'); h.bridge.settlePart('glass', 'ready'); await flush(); await h.advance(800);
  h.window.emit('hashchange'); assert.equal(h.bridge.phase, 'complete'); assert.equal(h.bridge.reason, 'hashchange');
  await h.advance(1000); assert.equal(h.bridge.reason, 'hashchange', 'Cancelled reveal callback cannot overwrite later navigation.');
}
{
  const h = setup(); h.bridge.markAppReady(); await flush();
  await h.advance(3000); assert.equal(h.elements['gxc-entry'].dataset.statusVisible, 'true');
  await h.advance(1000); assert.equal(h.elements['gxc-entry-skip'].hidden, false);
  h.document.activeElement = h.elements['gxc-entry-skip']; h.elements['gxc-entry-skip'].emit('click');
  assert.equal(h.bridge.phase, 'revealing'); await h.advance(650);
  assert.equal(h.bridge.phase, 'complete'); assert.equal(h.firstLink.focuses, 1);
}
{
  const h = setup(); h.bridge.markAppReady(); await h.advance(8000);
  assert.equal(h.bridge.phase, 'revealing'); assert.equal(h.bridge.reason, 'deadline');
  await h.advance(650); assert.equal(h.bridge.phase, 'complete');
}
{
  const h = setup(); await h.advance(8000);
  assert.equal(h.bridge.phase, 'complete'); assert.equal(h.bridge.error, true); assert.equal(h.elements.root.inert, false);
  assert.equal(h.elements['gxc-entry-retry'].hidden, false); h.elements['gxc-entry-retry'].emit('click'); assert.equal(h.reloads(), 1);
  h.bridge.markAppReady(); assert.equal(h.bridge.error, false); assert.equal(h.elements['gxc-entry'].hidden, true);
}
{
  const h = setup({ hash: '#work' }); h.window.emit('error', { target: { tagName: 'SCRIPT', type: 'module' } });
  assert.equal(h.bridge.error, true); assert.equal(h.bridge.reason, 'module-error');
  await h.advance(9000); assert.equal(h.bridge.reason, 'module-error', 'A watchdog does not overwrite the original failure reason.');
}
{
  const h = setup(); h.document.hidden = true; h.document.emit('visibilitychange');
  assert.equal(h.document.documentElement.dataset.gxcEntryHidden, 'true');
  h.document.hidden = false; h.document.emit('visibilitychange'); assert.equal(h.document.documentElement.dataset.gxcEntryHidden, 'false');
}
console.log('PASS: entry readiness gates/800ms minimum/650ms handoff; bounded app-ready font gate; reduced motion; deep links/history/BFCache/hash cancellation; 3s status/4s continue/8s deadline; independent module failure/retry/recovery; hidden animation state.');
