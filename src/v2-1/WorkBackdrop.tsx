import { useEffect, useLayoutEffect, useRef, type RefObject, type CSSProperties } from 'react';
import { workProjects } from './content/portfolioData';
import metadata from '../../public/v-next/work-background/yellowstone/provenance.json';
import backgrounds from '../../public/v2-1/backgrounds/manifest.json';
import catalog from '../../public/v-next/work-background/yellowstone/star-points.json';
import palettes from '../../public/v-next/work-background/palettes.json';
import { photoCover } from './heroPhoto';
import { getFrameSnapshot, requestFrame, subscribeFrame, subscribeViewportChange } from './runtime';
import { sampleStar, TwinkleField, type PhotoStar } from './twinkle';
import { chooseExposedStar, projectStarLight, singlePeakEnvelope, starLightGradient } from './starLight';
import { workBackdropArt as art } from './workBackdropConfig';
import { getLayoutRect, getLayoutRevision } from './layoutSnapshot';
import { getInputState } from './inputState';
import { recordTouchMetric } from './touchDiagnostics';
import { selectBackgroundVariant } from './backgroundQuality';
import './workBackdrop.css';

// Work has its own photograph and measured coordinates. The archived 2022
// work supplement still supplies the hero catalog and must remain unchanged.
const workStars = catalog.points;
const manifestMatches = backgrounds.work.sourceSha256 === metadata.sourceSha256
  && backgrounds.work.width === metadata.width && backgrounds.work.height === metadata.height;
const photoVariants = manifestMatches ? backgrounds.work.variants : metadata.variants;
declare global { interface Window { __gxcWorkTwinkles?: { points: typeof workStars; set(ids: string[] | null, amplitude?: number): void } } }

type Palette = { primary: readonly number[]; secondary: readonly number[] };
const colorsFor = (slug: string): Palette => palettes[slug as keyof typeof palettes] ?? art.neutral;
const blend = (a: Palette, b: Palette, t: number): Palette => ({
  primary: a.primary.map((v, i) => v + (b.primary[i] - v) * t),
  secondary: a.secondary.map((v, i) => v + (b.secondary[i] - v) * t),
});

export function WorkBackdrop({ root, paused, reduced, suspended, enabled = true }: {
  root: RefObject<HTMLElement | null>; paused: boolean; reduced: boolean; suspended: boolean; enabled?: boolean;
}) {
  const layer = useRef<HTMLDivElement>(null);
  const photograph = useRef<HTMLImageElement>(null);
  const patches = useRef<(HTMLSpanElement | null)[]>([]);
  const props = useRef({ paused, reduced, suspended }); props.current = { paused, reduced, suspended };
  useLayoutEffect(() => { if (enabled) requestFrame(); }, [enabled, paused, reduced, suspended]);
  useEffect(() => {
    const el = layer.current, section = root.current, photoElement = photograph.current;
    if (!el || !section || !photoElement) return;
    if (!enabled) {
      el.dataset.state = 'deferred'; el.dataset.visible = 'false';
      photoElement.hidden = true;
      for (const patch of patches.current) if (patch) patch.hidden = true;
      return;
    }
    const diagnostics = import.meta.env.DEV || ['perf', 'qa'].some(key => new URLSearchParams(location.search).get(key) === '1');
    const omitted = new URLSearchParams(location.search).has('no-work-background');
    if (omitted) { el.dataset.state = 'omitted'; return; }
    let disposed = false, dirty = true, visible = false;
    let width = 0, height = 0, top = 0, bottom = 0, lastScroll = NaN, lastClip = '', lastCurl = '';
    let centers: { slug: string; y: number; top: number; bottom: number }[] = [], candidates: PhotoStar[] = [];
    let exposed = new Set<string>(), debug: { ids: string[]; amplitude: number } | null = null, debugVersion = 0;
    const starsById = new Map(workStars.map(star => [star.id, star]));
    let hoveredSlug: string | undefined, focusedSlug: string | undefined;
    let cover = photoCover(1, 1, 1, 1);
    let photo: { url: string; width: number; height: number } | undefined;
    let pending = '', generation = 0, failed = false;
    let readyPhoto: typeof photo, photoChanged = false, geometryChanged = true, visibilityChanged = true;
    let readyRequestWidth = 0;
    let nextClip = '', nextMask = '', lastMask = '', layoutRevision = -1;
    let lastScrollAt = -Infinity, lastViewportAt = -Infinity, viewportKey = '', photoTimer = 0;
    const failedRequests = new Set<string>();
    const failedUrls = new Set<string>();
    let quality: ReturnType<typeof selectBackgroundVariant> | undefined, qualityChanged = false, qualityKey = '';
    let active = workProjects[0].slug, current = colorsFor(active), from = current, target = current;
    let elapsed: number = art.transitionSeconds, frames = 0, wasReduced = false, needsPalette = false, lastIdle = '';
    const field = new TwinkleField(Math.random, art.twinkles, singlePeakEnvelope(art.twinkles.rise, art.twinkles.hold));
    const validCatalog = catalog.source.sha256 === metadata.sourceSha256
      && catalog.source.width === metadata.width && catalog.source.height === metadata.height
      && catalog.source.originalWidth === metadata.sourceWidth && catalog.source.originalHeight === metadata.sourceHeight
      && catalog.source.crop.x === metadata.crop.x && catalog.source.crop.y === metadata.crop.y
      && catalog.source.crop.width === metadata.crop.width && catalog.source.crop.height === metadata.crop.height
      && catalog.count === workStars.length && new Set(workStars.map(star => star.id)).size === workStars.length
      && workStars.every(star => Number.isFinite(star.x) && Number.isFinite(star.y)
        && star.x >= 0 && star.y >= 0 && star.x < metadata.width && star.y < metadata.height
        && Math.abs(star.u - (star.x + .5) / metadata.width) < .000001
        && Math.abs(star.v - (star.y + .5) / metadata.height) < .000001);
    el.dataset.catalogCount = String(validCatalog ? workStars.length : 0);
    el.dataset.catalogValid = String(validCatalog);
    const wake = () => { dirty = true; requestFrame(); };
    const resize = new ResizeObserver(wake);
    resize.observe(section);
    const pictures = workProjects.map(project => ({ slug: project.slug,
      el: section.querySelector<HTMLElement>(`.gxc-project-${project.slug} .gxc-project-picture`)! }));
    const blockers = [...section.querySelectorAll<HTMLElement>('.gxc-project, .gxc-section-heading > *, .gxc-work-end > *'),
      ...document.querySelectorAll<HTMLElement>('.gxc-header > *')].map(element => ({ element, anchor: element.querySelector<HTMLElement>('a') }));
    const workCanvas = document.querySelector<HTMLElement>('.gxc-work-canvas');
    for (const picture of pictures) if (picture.el) resize.observe(picture.el);
    const interactionSlug = (target: EventTarget | null) => {
      const card = target instanceof Element ? target.closest('.gxc-project') : null;
      return card && section.contains(card)
        ? pictures.find(picture => card.contains(picture.el))?.slug : undefined;
    };
    const pointerOver = (event: PointerEvent) => { hoveredSlug = interactionSlug(event.target); requestFrame(); };
    const pointerOut = (event: PointerEvent) => { hoveredSlug = interactionSlug(event.relatedTarget); requestFrame(); };
    const focusIn = (event: FocusEvent) => { focusedSlug = interactionSlug(event.target); requestFrame(); };
    const focusOut = (event: FocusEvent) => { focusedSlug = interactionSlug(event.relatedTarget); requestFrame(); };
    section.addEventListener('pointerover', pointerOver);
    section.addEventListener('pointerout', pointerOut);
    section.addEventListener('focusin', focusIn);
    section.addEventListener('focusout', focusOut);
    const hero = document.getElementById('top'); if (hero) resize.observe(hero);
    window.addEventListener('resize', wake);
    const offViewport = subscribeViewportChange(wake);
    document.addEventListener('visibilitychange', wake);
    section.addEventListener('load', wake, true);
    void document.fonts.ready.then(() => { if (!disposed) wake(); });

    const selectPhoto = (time: number) => {
      quality = selectBackgroundVariant({ width, height, imageWidth: metadata.width, imageHeight: metadata.height,
        dpr: devicePixelRatio || 1, overscan: art.photoScale, variants: photoVariants });
      const nextQualityKey = `${quality.desiredWidth}:${quality.dpr}:${quality.variant?.url}`;
      if (qualityKey !== nextQualityKey) { qualityKey = nextQualityKey; qualityChanged = true; }
      // Wait until the section is approaching the viewport. The hero should not
      // compete with a multi-megabyte work photograph that is still far below it.
      const near = bottom > getFrameSnapshot().scrollY - height && top < getFrameSnapshot().scrollY + height * 2;
      if (!near || document.hidden || props.current.suspended || pending || readyPhoto) return;
      const variants = photoVariants;
      const selected = quality.variant;
      if (!selected) return;
      // Never alternate between two resolutions as Safari's address bar moves.
      // Keep the decoded source, and upgrade only after size AND scroll settle.
      if ((photo && photo.width >= selected.width) || selected.url === photo?.url || failedRequests.has(selected.url)) return;
      const due = Math.max(lastScrollAt, lastViewportAt) + 300;
      if (photo && time < due) {
        if (!photoTimer) photoTimer = window.setTimeout(() => { photoTimer = 0; requestFrame(); }, Math.max(1, due - time));
        return;
      }
      pending = selected.url;
      const request = ++generation;
      // Keep a decoded photo visible during resize; an older request cannot replace it.
      void (async () => {
        for (const item of [selected, ...variants.filter(v => v.width < selected.width).sort((a, b) => b.width - a.width)]) {
          if (disposed || request !== generation) return;
          if (failedUrls.has(item.url)) continue;
          try {
            recordTouchMetric('workBackgroundRequests');
            const image = new Image(); image.decoding = 'async'; image.src = item.url;
            await image.decode();
            if (disposed || request !== generation) return;
            // Stage the resource. Its cover and star coordinates are measured
            // before the shared update phase makes the replacement visible.
            if (!photo || image.naturalWidth > photo.width) {
              readyPhoto = { url: item.url, width: image.naturalWidth, height: image.naturalHeight };
              readyRequestWidth = selected.width;
            }
            if (item.url !== selected.url) failedRequests.add(selected.url);
            pending = ''; failed = false;
            wake(); return;
          } catch { failedUrls.add(item.url); /* Smaller derivatives remain a complete fallback. */ }
        }
        if (!disposed && request === generation) { pending = ''; failedRequests.add(selected.url); failed = !photo; wake(); }
      })();
    };
    const setColors = (value: Palette) => {
      el.style.setProperty('--work-primary', value.primary.map(v => v.toFixed(2)).join(', '));
      el.style.setProperty('--work-secondary', value.secondary.map(v => v.toFixed(2)).join(', '));
      if (diagnostics) el.dataset.colors = JSON.stringify(value);
    };
    setColors(current);

    const offMeasure = subscribeFrame(time => {
      const frame = getFrameSnapshot();
      const nextViewport = `${frame.width}:${frame.height}:${devicePixelRatio}`;
      if (viewportKey !== nextViewport) { viewportKey = nextViewport; lastViewportAt = time; dirty = true; }
      if (frame.scrollY !== lastScroll) lastScrollAt = time;
      const revision = getLayoutRevision();
      if (revision !== layoutRevision) { layoutRevision = revision; dirty = true; }
      if (readyPhoto) {
        const due = Math.max(lastScrollAt, lastViewportAt) + 300;
        const latest = selectBackgroundVariant({ width: frame.width, height: frame.height,
          imageWidth: metadata.width, imageHeight: metadata.height, dpr: devicePixelRatio || 1, overscan: art.photoScale, variants: photoVariants });
        if (latest.variant && readyRequestWidth < latest.variant.width) readyPhoto = undefined;
        else if (!photo || time >= due) { photo = readyPhoto; readyPhoto = undefined; photoChanged = true; dirty = true; }
        else if (!photoTimer) photoTimer = window.setTimeout(() => { photoTimer = 0; requestFrame(); }, Math.max(1, due - time));
      }
      if (dirty) {
        dirty = false; geometryChanged = true;
        width = frame.width; height = frame.height;
        const rect = getLayoutRect(section);
        top = rect.top + frame.scrollY; bottom = rect.bottom + frame.scrollY;
        centers = pictures.filter(p => p.el).map(p => {
          const bounds = getLayoutRect(p.el);
          return { slug: p.slug, y: bounds.top + frame.scrollY + bounds.height / 2,
            top: bounds.top + frame.scrollY, bottom: bounds.bottom + frame.scrollY };
        });
        if (photo) {
          cover = photoCover(width, height, photo.width, photo.height);
          cover.width *= art.photoScale; cover.height *= art.photoScale;
          cover.left = (width - cover.width) / 2;
          cover.top = (height - cover.height) * art.photoAnchorY;
          candidates = validCatalog ? workStars.filter(star => {
            const x = cover.left + star.u * cover.width, y = cover.top + star.v * cover.height;
            return x > 8 && x < width - 8 && y > 8 && y < height - 8;
          }) : [];
        }
      }
      selectPhoto(time);
      const curl = workCanvas?.dataset.curl ?? '';
      if (lastScroll === frame.scrollY && curl === lastCurl && !geometryChanged) return;
      lastScroll = frame.scrollY;
      lastCurl = curl;
      const start = top - frame.scrollY, end = bottom - frame.scrollY;
      visible = end > 0 && start < height;
      visibilityChanged = true;
      if (!visible) { exposed.clear(); return; }
      nextClip = `inset(${Math.max(0, start)}px 0px ${Math.max(0, height - end)}px)`;
      // Pixel positions may be outside the viewport; fades stay attached to the
      // section's entrance/exit, while the photograph always keeps a cover crop.
      nextMask = `linear-gradient(to bottom, transparent ${start}px, #000 ${start + art.entryFade}px, #000 ${end - art.exitFade}px, transparent ${end}px)`;
      const padding = art.twinkles.obstructionPadding;
      const obstacles = blockers.flatMap(({ element, anchor }) => {
        const rect = getLayoutRect(element);
        if (!rect.width || !rect.height || rect.bottom < 0 || rect.top > height) return [];
        let left = rect.left, right = rect.right;
        // Include the curved image's expanded hit bounds as well as its flat DOM card.
        if (anchor?.dataset.workHit === 'true') {
          const anchorRect = getLayoutRect(anchor);
          const hitLeft = parseFloat(anchor.style.getPropertyValue('--work-hit-left'));
          const hitWidth = parseFloat(anchor.style.getPropertyValue('--work-hit-width'));
          if (Number.isFinite(hitLeft) && Number.isFinite(hitWidth)) {
            left = Math.min(left, anchorRect.left + hitLeft);
            right = Math.max(right, anchorRect.left + hitLeft + hitWidth);
          }
        }
        return [{ left: left - padding, right: right + padding, top: rect.top - padding, bottom: rect.bottom + padding }];
      });
      exposed = new Set(candidates.filter(star => {
        const x = cover.left + star.u * cover.width, y = cover.top + star.v * cover.height;
        return y > Math.max(8, start + art.entryFade) && y < Math.min(height - 8, end - art.exitFade)
          && !obstacles.some(box => x >= box.left && x <= box.right && y >= box.top && y <= box.bottom);
      }).map(star => star.id));
    }, 'measure');

    const offUpdate = subscribeFrame((_, dt) => {
      if (qualityChanged && quality) {
        el.dataset.photoDesiredWidth = quality.desiredWidth.toFixed(2); el.dataset.photoDpr = String(quality.dpr);
        el.dataset.photoDesiredSource = quality.variant?.url ?? ''; el.dataset.photoSourceLimited = String(quality.sourceLimited);
        qualityChanged = false;
      }
      // Keep every layout read above, then publish geometry and source together.
      if (geometryChanged) {
        if (photo) Object.assign(photoElement.style, { width: `${cover.width}px`, height: `${cover.height}px`, left: `${cover.left}px`, top: `${cover.top}px` });
        if (diagnostics) { el.dataset.cover = JSON.stringify(cover); el.dataset.viewport = JSON.stringify({ width, height }); }
        el.dataset.candidates = String(candidates.length);
        el.dataset.source = photo?.url ?? ''; el.dataset.sourceWidth = String(metadata.width); el.dataset.sourceHeight = String(metadata.height);
        geometryChanged = false;
      }
      if (photoChanged && photo) { photoElement.src = photo.url; photoElement.hidden = false; photoChanged = false; el.dataset.photoWidth = String(photo.width); recordTouchMetric('workBackgroundCommits'); }
      if (visibilityChanged) {
        el.dataset.visible = String(visible); el.dataset.exposed = String(exposed.size);
        if (diagnostics) el.dataset.exposedIds = JSON.stringify([...exposed]);
        if (visible && nextClip !== lastClip) { el.style.clipPath = nextClip; lastClip = nextClip; }
        if (visible && nextMask !== lastMask) { el.style.maskImage = nextMask; el.style.webkitMaskImage = nextMask; lastMask = nextMask; }
        visibilityChanged = false;
      }
      const state = props.current;
      const running = visible && !document.hidden && !state.paused && !state.reduced && !state.suspended;
      const idle = `${visible}:${document.hidden}:${state.paused}:${state.reduced}:${state.suspended}:${photo?.url}:${failed}:${width}:${height}:${debugVersion}`;
      if (!running && idle === lastIdle) return;
      lastIdle = running ? '' : idle;
      if (state.reduced) {
        needsPalette = true;
        if (!wasReduced) { current = art.neutral; from = current; target = current; elapsed = art.transitionSeconds; setColors(current); }
      } else if (running) {
        const scrollY = getFrameSnapshot().scrollY, viewCenter = scrollY + height / 2;
        const nearest = centers.reduce<(typeof centers)[number] | undefined>((best, item) =>
          !best || Math.abs(item.y - viewCenter) < Math.abs(best.y - viewCenter) ? item : best, undefined);
        const selected = centers.find(item => item.slug === active);
        // Equal-height cards share a row. Interaction chooses a sibling without
        // allowing a distant row to steal the color; otherwise keep a tied choice.
        const inNearestRow = (item: (typeof centers)[number]) => !!nearest && Math.abs(item.y - nearest.y) <= 2;
        const preferred = [focusedSlug, hoveredSlug].map(slug => centers.find(item => item.slug === slug))
          .find(item => item && inNearestRow(item) && item.bottom > scrollY && item.top < scrollY + height);
        const beforeFirst = centers.length && viewCenter < centers[0].y;
        const next = preferred?.slug ?? (selected && inNearestRow(selected) ? active
          : beforeFirst ? workProjects[0].slug : nearest?.slug ?? active);
        const shouldChange = next !== active && (preferred || beforeFirst || !selected ||
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
      const mobile = width <= art.mobileBreakpoint || (getInputState().touchCapable && Math.min(width, height) <= art.mobileBreakpoint);
      const limit = mobile ? art.twinkles.mobileCapacity : art.twinkles.capacity;
      const rawPoints = !photo || state.reduced ? [] : debug
        ? candidates.filter(star => debug!.ids.includes(star.id)).slice(0, limit).map(star => sampleStar(star, debug!.amplitude))
        : field.update(dt, running, candidates, limit, (available, activeStars) =>
          chooseExposedStar(available, activeStars, exposed, cover.width, cover.height, Math.max(32, Math.min(width, height) * art.twinkles.separation)));
      const diameter = mobile ? art.twinkles.mobileDiameter : art.twinkles.diameter;
      const points = rawPoints.map(point => projectStarLight(point, starsById.get(point.id)!, metadata.width, cover.width, diameter));
      if (running) frames++;
      el.dataset.state = state.reduced ? 'reduced' : failed ? 'photo-failed' : debug ? 'debug' : running ? 'running' : 'paused';
      el.dataset.frames = String(frames); el.dataset.activeProject = active;
      el.dataset.tween = String(elapsed);
      if (diagnostics) el.dataset.points = JSON.stringify(points);
      el.dataset.count = String(points.length);
      for (let i = 0; i < patches.current.length; i++) {
        const patch = patches.current[i], star = points[i]; if (!patch) continue;
        if (!star || !photo) { patch.hidden = true; continue; }
        const x = cover.left + star.u * cover.width, y = cover.top + star.v * cover.height;
        const radius = star.radiusPx * cover.width / metadata.width * art.twinkles.supportSigma;
        const placement = `${photo.url}:${x}:${y}:${radius}:${star.id}`;
        if (patch.dataset.placement !== placement) {
          patch.dataset.placement = placement; patch.dataset.star = star.id;
          Object.assign(patch.style, {
            width: `${radius * 2}px`, height: `${radius * 2}px`,
            transform: `translate3d(${x - radius}px,${y - radius}px,0)`,
            backgroundImage: starLightGradient(star.overlay!.color, art.twinkles),
            backgroundSize: '100% 100%', backgroundPosition: 'center',
          });
          patch.dataset.diameter = String(star.overlay!.diameterPx);
        }
        patch.hidden = false; patch.style.opacity = String(star.amplitude);
      }
      return running && (!!photo || elapsed < art.transitionSeconds);
    }, 'update');
    const debugApi = { points: workStars, set(ids: string[] | null, amplitude = .85) {
      debug = ids ? { ids, amplitude: Math.max(0, Math.min(1, amplitude)) } : null;
      debugVersion++; requestFrame();
    } };
    if (diagnostics) window.__gxcWorkTwinkles = debugApi;
    return () => {
      disposed = true; generation++; offMeasure(); offUpdate(); resize.disconnect(); offViewport();
      clearTimeout(photoTimer);
      window.removeEventListener('resize', wake); document.removeEventListener('visibilitychange', wake);
      section.removeEventListener('load', wake, true);
      section.removeEventListener('pointerover', pointerOver); section.removeEventListener('pointerout', pointerOut);
      section.removeEventListener('focusin', focusIn); section.removeEventListener('focusout', focusOut);
      if (window.__gxcWorkTwinkles === debugApi) delete window.__gxcWorkTwinkles;
    };
  }, [enabled, root]);

  return <div ref={layer} className="gxc-work-backdrop" aria-hidden="true" style={{
    '--work-primary-alpha': art.primaryOpacity, '--work-secondary-alpha': art.secondaryOpacity,
  } as CSSProperties}>
    <img ref={photograph} className="gxc-work-backdrop-photo" hidden alt="" style={{ opacity: art.photoOpacity }} />
    <div className="gxc-work-backdrop-twinkles">{Array.from({ length: art.twinkles.capacity }, (_, i) =>
      <span key={i} hidden ref={node => { patches.current[i] = node; }} />)}</div>
    <div className="gxc-work-backdrop-light" />
  </div>;
}
