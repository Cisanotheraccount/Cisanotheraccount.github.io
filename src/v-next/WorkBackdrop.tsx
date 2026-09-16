import { useEffect, useLayoutEffect, useRef, type RefObject, type CSSProperties } from 'react';
import { workProjects } from '../portfolioData';
import metadata from '../../public/v-next/work-background/provenance.json';
import catalog from '../../public/v-next/work-background/star-points.json';
import palettes from '../../public/v-next/work-background/palettes.json';
import { photoCover } from './heroPhoto';
import { getFrameSnapshot, requestFrame, subscribeFrame } from './runtime';
import { TwinkleField, type PhotoStar } from './twinkle';
import { workBackdropArt as art } from './workBackdropConfig';
import './workBackdrop.css';

type Palette = { primary: readonly number[]; secondary: readonly number[] };
const colorsFor = (slug: string): Palette => palettes[slug as keyof typeof palettes] ?? art.neutral;
const blend = (a: Palette, b: Palette, t: number): Palette => ({
  primary: a.primary.map((v, i) => v + (b.primary[i] - v) * t),
  secondary: a.secondary.map((v, i) => v + (b.secondary[i] - v) * t),
});

export function WorkBackdrop({ root, paused, reduced, suspended }: {
  root: RefObject<HTMLElement | null>; paused: boolean; reduced: boolean; suspended: boolean;
}) {
  const layer = useRef<HTMLDivElement>(null);
  const photograph = useRef<HTMLImageElement>(null);
  const patches = useRef<(HTMLSpanElement | null)[]>([]);
  const props = useRef({ paused, reduced, suspended }); props.current = { paused, reduced, suspended };
  useLayoutEffect(() => { requestFrame(); }, [paused, reduced, suspended]);
  useEffect(() => {
    const el = layer.current, section = root.current, photoElement = photograph.current;
    if (!el || !section || !photoElement) return;
    const omitted = new URLSearchParams(location.search).has('no-work-background');
    if (omitted) { el.dataset.state = 'omitted'; return; }
    let disposed = false, dirty = true, visible = false;
    let width = 0, height = 0, top = 0, bottom = 0, lastScroll = NaN, lastClip = '';
    let centers: { slug: string; y: number }[] = [], candidates: PhotoStar[] = [];
    let cover = photoCover(1, 1, 1, 1);
    let photo: { url: string; width: number; height: number } | undefined;
    let pending = '', generation = 0, failed = false;
    let active = workProjects[0].slug, current = colorsFor(active), from = current, target = current;
    let elapsed: number = art.transitionSeconds, frames = 0, wasReduced = false, needsPalette = false, lastIdle = '';
    const field = new TwinkleField(Math.random, art.twinkles);
    const validCatalog = catalog.source.sha256 === metadata.sourceSha256
      && catalog.source.width === metadata.width && catalog.source.height === metadata.height;
    const wake = () => { dirty = true; requestFrame(); };
    const resize = new ResizeObserver(wake);
    resize.observe(section);
    const pictures = workProjects.map(project => ({ slug: project.slug,
      el: section.querySelector<HTMLElement>(`.gxc-project-${project.slug} .gxc-project-picture`)! }));
    for (const picture of pictures) if (picture.el) resize.observe(picture.el);
    const hero = document.getElementById('top'); if (hero) resize.observe(hero);
    window.addEventListener('resize', wake);
    document.addEventListener('visibilitychange', wake);
    section.addEventListener('load', wake, true);
    void document.fonts.ready.then(() => { if (!disposed) wake(); });

    const selectPhoto = () => {
      const needed = Math.max(width, height * metadata.width / metadata.height) * Math.min(devicePixelRatio || 1, art.maxDpr);
      const variants = metadata.variants;
      const selected = variants.find(item => item.width >= needed) ?? variants[variants.length - 1];
      if (pending === selected.url) return;
      pending = selected.url;
      const request = ++generation;
      if (selected.url === photo?.url) return;
      // Keep a decoded photo visible during resize; an older request cannot replace it.
      void (async () => {
        for (const item of [selected, ...variants.filter(v => v.width < selected.width).reverse()]) {
          if (disposed || request !== generation) return;
          try {
            const image = new Image(); image.decoding = 'async'; image.src = item.url;
            await image.decode();
            if (disposed || request !== generation) return;
            photo = { url: item.url, width: image.naturalWidth, height: image.naturalHeight };
            photoElement.src = photo.url; photoElement.hidden = false; failed = false;
            wake(); return;
          } catch { /* Smaller derivatives remain a complete fallback. */ }
        }
        if (!disposed && request === generation) { failed = !photo; wake(); }
      })();
    };
    const setColors = (value: Palette) => {
      el.style.setProperty('--work-primary', value.primary.map(v => v.toFixed(2)).join(', '));
      el.style.setProperty('--work-secondary', value.secondary.map(v => v.toFixed(2)).join(', '));
      el.dataset.colors = JSON.stringify(value);
    };
    setColors(current);

    const offMeasure = subscribeFrame(() => {
      const frame = getFrameSnapshot();
      if (dirty) {
        dirty = false;
        width = frame.width; height = frame.height;
        const rect = section.getBoundingClientRect();
        top = rect.top + frame.scrollY; bottom = rect.bottom + frame.scrollY;
        centers = pictures.filter(p => p.el).map(p => {
          const bounds = p.el.getBoundingClientRect();
          return { slug: p.slug, y: bounds.top + frame.scrollY + bounds.height / 2 };
        });
        selectPhoto();
        if (photo) {
          cover = photoCover(width, height, photo.width, photo.height);
          Object.assign(photoElement.style, { width: `${cover.width}px`, height: `${cover.height}px`, left: `${cover.left}px`, top: `${cover.top}px` });
          candidates = validCatalog ? catalog.points.filter(star => {
            const x = cover.left + star.u * cover.width, y = cover.top + star.v * cover.height;
            return x > 8 && x < width - 8 && y > 8 && y < height - 8;
          }) : [];
        }
        el.dataset.cover = JSON.stringify(cover); el.dataset.candidates = String(candidates.length);
        el.dataset.source = photo?.url ?? ''; el.dataset.sourceWidth = String(metadata.width); el.dataset.sourceHeight = String(metadata.height);
        el.dataset.viewport = JSON.stringify({ width, height }); lastScroll = NaN;
      }
      if (lastScroll === frame.scrollY) return;
      lastScroll = frame.scrollY;
      const start = top - frame.scrollY, end = bottom - frame.scrollY;
      visible = end > 0 && start < height;
      el.dataset.visible = String(visible);
      if (!visible) return;
      const clip = `inset(${Math.max(0, start)}px 0px ${Math.max(0, height - end)}px)`;
      if (clip !== lastClip) { el.style.clipPath = clip; lastClip = clip; }
      // Pixel positions may be outside the viewport; fades stay attached to the
      // section's entrance/exit, while the photograph always keeps a cover crop.
      const mask = `linear-gradient(to bottom, transparent ${start}px, #000 ${start + art.entryFade}px, #000 ${end - art.exitFade}px, transparent ${end}px)`;
      el.style.maskImage = mask; el.style.webkitMaskImage = mask;
    }, 'measure');

    const offUpdate = subscribeFrame((_, dt) => {
      const state = props.current;
      const running = visible && !document.hidden && !state.paused && !state.reduced && !state.suspended;
      const idle = `${visible}:${document.hidden}:${state.paused}:${state.reduced}:${state.suspended}:${photo?.url}:${failed}:${width}:${height}`;
      if (!running && idle === lastIdle) return;
      lastIdle = running ? '' : idle;
      if (state.reduced) {
        needsPalette = true;
        if (!wasReduced) { current = art.neutral; from = current; target = current; elapsed = art.transitionSeconds; setColors(current); }
      } else if (running) {
        const viewCenter = getFrameSnapshot().scrollY + height / 2;
        const nearest = centers.reduce<{ slug: string; y: number } | undefined>((best, item) =>
          !best || Math.abs(item.y - viewCenter) < Math.abs(best.y - viewCenter) ? item : best, undefined);
        const selected = centers.find(item => item.slug === active);
        const beforeFirst = centers.length && viewCenter < centers[0].y;
        const next = beforeFirst ? workProjects[0].slug : nearest?.slug ?? active;
        const shouldChange = next !== active && (beforeFirst || !selected ||
          Math.abs(selected.y - viewCenter) - Math.abs(nearest!.y - viewCenter) > height * art.selectionHysteresis);
        if (shouldChange || needsPalette) {
          active = next; from = current; target = colorsFor(active); elapsed = 0; needsPalette = false;
        }
        if (elapsed < art.transitionSeconds) {
          elapsed = Math.min(art.transitionSeconds, elapsed + dt);
          const t = elapsed / art.transitionSeconds;
          current = blend(from, target, t * t * (3 - 2 * t)); setColors(current);
        }
      }
      wasReduced = state.reduced;
      const mobile = width <= art.mobileBreakpoint || (matchMedia('(pointer: coarse)').matches && Math.min(width, height) <= art.mobileBreakpoint);
      const limit = mobile ? art.twinkles.mobileCapacity : art.twinkles.capacity;
      const points = !photo || state.reduced ? [] : field.update(dt, running, candidates, limit);
      if (running) frames++;
      el.dataset.state = state.reduced ? 'reduced' : failed ? 'photo-failed' : running ? 'running' : 'paused';
      el.dataset.frames = String(frames); el.dataset.activeProject = active;
      el.dataset.tween = String(elapsed); el.dataset.points = JSON.stringify(points);
      el.dataset.count = String(points.length);
      for (let i = 0; i < patches.current.length; i++) {
        const patch = patches.current[i], star = points[i]; if (!patch) continue;
        if (!star || !photo) { patch.hidden = true; continue; }
        const x = cover.left + star.u * cover.width, y = cover.top + star.v * cover.height;
        const radius = star.radiusPx * cover.width / metadata.width * 4.5;
        const placement = `${photo.url}:${x}:${y}:${radius}`;
        if (patch.dataset.placement !== placement) {
          patch.dataset.placement = placement; patch.dataset.star = star.id;
          Object.assign(patch.style, {
            width: `${radius * 2}px`, height: `${radius * 2}px`,
            transform: `translate3d(${x - radius}px,${y - radius}px,0)`,
            backgroundImage: `url("${photo.url}")`, backgroundSize: `${cover.width}px ${cover.height}px`,
            backgroundPosition: `${cover.left - x + radius}px ${cover.top - y + radius}px`,
          });
        }
        patch.hidden = false; patch.style.opacity = String(star.amplitude * art.photoOpacity);
      }
      return running && (!!photo || elapsed < art.transitionSeconds);
    }, 'update');
    return () => {
      disposed = true; generation++; offMeasure(); offUpdate(); resize.disconnect();
      window.removeEventListener('resize', wake); document.removeEventListener('visibilitychange', wake);
      section.removeEventListener('load', wake, true);
    };
  }, [root]);

  return <div ref={layer} className="gxc-work-backdrop" aria-hidden="true" style={{
    '--work-primary-alpha': art.primaryOpacity, '--work-secondary-alpha': art.secondaryOpacity,
  } as CSSProperties}>
    <img ref={photograph} className="gxc-work-backdrop-photo" hidden alt="" style={{ opacity: art.photoOpacity }} />
    <div className="gxc-work-backdrop-twinkles">{Array.from({ length: art.twinkles.capacity }, (_, i) =>
      <span key={i} hidden ref={node => { patches.current[i] = node; }} />)}</div>
    <div className="gxc-work-backdrop-light" />
  </div>;
}
