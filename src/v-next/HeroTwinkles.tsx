import { useEffect, useLayoutEffect, useRef } from 'react';
import { getFrameSnapshot, requestFrame, subscribeFrame } from './runtime';
import { photoCover, subscribeHeroPhoto, type LoadedHeroPhoto } from './heroPhoto';
import { catalogMatchesPhoto, clearTwinkles, publishTwinkles, sampleStar, starCatalog, TwinkleField, type PhotoStar, type Twinkle } from './twinkle';
import { heroTwinkleArt as art, heroTwinkleGradient, projectHeroTwinkle } from './heroTwinkleArt';
import { singlePeakEnvelope } from './starLight';
import { combinedHeroStars, heroSupplementValid } from './heroStarCatalog';
import { createHeroStarDistribution } from './heroStarDistribution';
import './twinkles.css';

declare global { interface Window { __gxcTwinkles?: { points: typeof starCatalog.points; set(ids: string[] | null, amplitude?: number): void } } }

export function HeroTwinkles({ paused, reduced, suspended }: { paused: boolean; reduced: boolean; suspended: boolean }) {
  const root = useRef<HTMLDivElement>(null);
  const patches = useRef<(HTMLSpanElement | null)[]>([]);
  const props = useRef({ paused, reduced, suspended }); props.current = { paused, reduced, suspended };
  useLayoutEffect(() => { requestFrame(); }, [paused, reduced, suspended]);
  useEffect(() => {
    const el = root.current, hero = el?.closest<HTMLElement>('.gxc-hero');
    if (!el || !hero) return;
    const diagnostics = import.meta.env.DEV || ['perf', 'qa'].some(key => new URLSearchParams(location.search).get(key) === '1');
    const omitted = new URLSearchParams(location.search).has('no-twinkles');
    let photo: LoadedHeroPhoto | undefined, dirty = true, visible = false, disposed = false;
    let width = 0, height = 0, cover = photoCover(1, 1, 1, 1), candidates: PhotoStar[] = [];
    let exposed = new Set<string>(), lastScroll = NaN;
    let distribution: ReturnType<typeof createHeroStarDistribution> | undefined;
    const obstacles = [...document.querySelectorAll<HTMLElement>('.gxc-brand, .gxc-nav, .gxc-hero-top > p, .gxc-hero-bottom p, .gxc-hero-bottom .gxc-mono, .gxc-round-link')];
    let debug: { ids: string[]; amplitude: number } | null = null, frames = 0;
    const slots = new Map<string, number>();
    let latestPoints: Twinkle[] = [];
    const field = new TwinkleField(Math.random, art, singlePeakEnvelope(art.rise, art.hold));
    const wake = () => { dirty = true; requestFrame(); };
    const resize = new ResizeObserver(wake); resize.observe(hero);
    obstacles.forEach(node => resize.observe(node));
    const intersection = new IntersectionObserver(entries => { visible = entries.some(entry => entry.isIntersecting); requestFrame(); }); intersection.observe(hero);
    const offPhoto = subscribeHeroPhoto(hero, asset => { photo = asset; wake(); }, () => { photo = undefined; wake(); });
    document.addEventListener('visibilitychange', wake);
    window.addEventListener('resize', wake);
    // Entry transforms move text without changing its ResizeObserver box.
    hero.addEventListener('animationend', wake, true);
    void document.fonts.ready.then(() => { if (!disposed) wake(); });
    const offMeasure = subscribeFrame(() => {
      const snapshot = getFrameSnapshot();
      if (!dirty && lastScroll === snapshot.scrollY) return;
      dirty = false;
      lastScroll = snapshot.scrollY;
      const rect = hero.getBoundingClientRect(); width = rect.width; height = rect.height;
      if (photo) cover = photoCover(width, height, photo.width, photo.height);
      candidates = !catalogMatchesPhoto || !photo || photo.fallback ? [] : combinedHeroStars.filter(star => {
        const x = cover.left + star.u * cover.width, y = cover.top + star.v * cover.height;
        return x > 5 && x < width - 5 && y > 5 && y < height - 5;
      });
      el.dataset.source = photo?.url ?? ''; el.dataset.candidates = String(candidates.length);
      el.dataset.catalogCount = String(combinedHeroStars.length);
      el.dataset.supplementValid = String(heroSupplementValid);
      if (diagnostics) el.dataset.cover = JSON.stringify(cover);
      const blocked = obstacles.map(node => node.getBoundingClientRect()).filter(r => r.width && r.height)
        .map(r => ({ left: r.left - 8, right: r.right + 8, top: r.top - 8, bottom: r.bottom + 8 }));
      // The glass is transparent scenery, not a text obstacle. Its entire
      // footprint remains eligible so stars can light up through transmission.
      exposed = new Set(candidates.filter(star => {
        const x = rect.left + cover.left + star.u * cover.width, y = rect.top + cover.top + star.v * cover.height;
        return x > 8 && x < snapshot.width - 8 && y > 8 && y < snapshot.height - 8
          && !blocked.some(r => x >= r.left && x <= r.right && y >= r.top && y <= r.bottom);
      }).map(star => star.id));
      el.dataset.exposed = String(exposed.size);
      if (diagnostics) el.dataset.exposedIds = JSON.stringify([...exposed]);
      const left = Math.max(0, -rect.left), top = Math.max(0, -rect.top);
      const visibleWidth = Math.max(1, Math.min(width, snapshot.width - rect.left) - left);
      const visibleHeight = Math.max(1, Math.min(height, snapshot.height - rect.top) - top);
      const columns = visibleWidth > art.distribution.wideBreakpoint ? art.distribution.wideColumns
        : visibleWidth > art.mobileBreakpoint ? art.distribution.mediumColumns : art.distribution.narrowColumns;
      distribution = createHeroStarDistribution(candidates, exposed, cover,
        { left, top, width: visibleWidth, height: visibleHeight }, { ...art.distribution, columns });
      el.dataset.grid = `${distribution.columns}x${distribution.rows}`;
    }, 'measure');
    const syncFallback = () => {
      if (hero.dataset.skyReady === 'true') return;
      // Independent transparent light; never duplicate, filter or rewrite the photo.
      // The fallback uses the same profile and original-photo coordinates as WebGL.
      // Keep each light in its own DOM slot until its pulse ends. Removing one
      // star must not rebuild the gradients of the other 79 fallback lights.
      const activeIds = new Set(latestPoints.map(point => point.id));
      for (const [id, index] of slots) if (!activeIds.has(id)) {
        const patch = patches.current[index]; if (patch) patch.hidden = true;
        slots.delete(id);
      }
      const occupied = new Set(slots.values());
      for (const star of latestPoints) {
        let index = slots.get(star.id);
        if (index === undefined) {
          index = patches.current.findIndex((_, i) => !occupied.has(i));
          if (index < 0) continue;
          slots.set(star.id, index); occupied.add(index);
        }
        const patch = patches.current[index]; if (!patch || !photo) continue;
        const x = cover.left + star.u * cover.width, y = cover.top + star.v * cover.height;
        const sigma = star.radiusPx * cover.width / starCatalog.source.width;
        const radius = sigma * art.supportSigma;
        const placement = `${photo.url}:${x}:${y}:${radius}:${star.id}`;
        if (patch.dataset.placement !== placement) {
          patch.dataset.placement = placement; patch.dataset.star = star.id;
          patch.style.width = `${radius * 2}px`; patch.style.height = `${radius * 2}px`;
          patch.style.transform = `translate3d(${x - radius}px,${y - radius}px,0)`;
          patch.style.backgroundImage = heroTwinkleGradient(star.overlay!.color);
          patch.dataset.diameter = String(star.overlay!.diameterPx);
        }
        patch.hidden = false; patch.style.opacity = String(star.amplitude);
      }
    };
    // Attribute mutations deliver before paint; loss of the WebGL owner restores
    // the latest complete point snapshot without waiting for another scene frame.
    const ownership = new MutationObserver(syncFallback);
    ownership.observe(hero, { attributes: true, attributeFilter: ['data-sky-ready'] });
    const offUpdate = subscribeFrame((_, dt) => {
      const state = props.current;
      const valid = !omitted && catalogMatchesPhoto && !!photo && !photo.fallback;
      const running = valid && visible && !document.hidden && !state.paused && !state.reduced && !state.suspended && !debug;
      const mobile = width <= art.mobileBreakpoint || (matchMedia('(pointer: coarse)').matches && Math.min(width, window.innerHeight) <= art.mobileBreakpoint);
      const limit = mobile ? art.mobileCapacity : art.capacity;
      const rawPoints = !valid || state.reduced ? [] : debug
        ? candidates.filter(star => debug!.ids.includes(star.id)).slice(0, art.capacity).map(star => sampleStar(star, debug!.amplitude))
        : field.update(dt, running, candidates, limit, (available, active) => distribution?.choose(available, active,
          Math.max(12, Math.min(width, window.innerHeight) * art.separation)));
      const points = rawPoints.map(point => projectHeroTwinkle(point, cover.width, mobile));
      publishTwinkles(hero, points);
      if (running) frames++;
      el.dataset.state = !valid ? 'unavailable' : state.reduced ? 'reduced' : debug ? 'debug' : running ? 'running' : 'paused';
      el.dataset.frames = String(frames); el.dataset.count = String(points.length);
      if (diagnostics) {
        el.dataset.points = JSON.stringify(points);
        el.dataset.distribution = JSON.stringify(distribution?.summarize(points) ?? []);
      }
      latestPoints = points;
      syncFallback();
      return running;
    }, 'update');
    const debugApi = { points: combinedHeroStars, set(ids: string[] | null, amplitude = .8) { debug = ids ? { ids, amplitude: Math.max(0, Math.min(1, amplitude)) } : null; requestFrame(); } };
    if (diagnostics) window.__gxcTwinkles = debugApi;
    return () => {
      disposed = true; ownership.disconnect();
      offMeasure(); offUpdate(); offPhoto(); resize.disconnect(); intersection.disconnect(); clearTwinkles(hero);
      document.removeEventListener('visibilitychange', wake);
      window.removeEventListener('resize', wake);
      hero.removeEventListener('animationend', wake, true);
      if (window.__gxcTwinkles === debugApi) delete window.__gxcTwinkles;
    };
  }, []);
  return <div ref={root} className="gxc-twinkles" aria-hidden="true">{Array.from({ length: art.capacity }, (_, i) => <span key={i} hidden ref={node => { patches.current[i] = node; }} />)}</div>;
}
