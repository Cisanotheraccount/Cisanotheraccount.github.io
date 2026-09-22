import { sceneText } from '../localization/scene';
import { useEffect, useId, useLayoutEffect, useRef, type MouseEvent, type SyntheticEvent } from 'react';
import { floatingProjects, type PortfolioProject } from './content/portfolioData';
import { getFrameSnapshot, requestFrame, scrollToPage, subscribeFrame } from './runtime';
import { meteorArt, projectMarks } from './meteorsConfig';
import { RandomSky } from './meteorSky';
import { publishSky, clearSky } from './skyState';
import { publishProjectSky, clearProjectSky, type ProjectSkyPoint } from './projectSkyState';
import { createCrossing, crossingPoint, trackCenter, type ProjectCrossing } from './projectCrossing';
import { projectLabelArt } from './projectLabel';
import './meteors.css';

type Mark = { index: number; slot: number; flight: ProjectCrossing | null; elapsed: number; x: number; y: number; size: number; opacity: number; labelOpacity: number; tailLength: number; angle: number; focused: boolean; pressed: boolean; hovered: boolean; near: boolean };
export type HeroMeteorsProps = { paused: boolean; reduced: boolean; suspended: boolean; onOpen(event: MouseEvent<HTMLAnchorElement>, project: PortfolioProject): void };
function recoverMark(event: SyntheticEvent<HTMLImageElement>, slug: string) {
  const image = event.currentTarget;
  if (image.dataset.fallback) { image.style.visibility = 'hidden'; return; }
  image.dataset.fallback = 'true';
  image.src = '/v-next/project-marks/' + projectMarks[slug].fallbackFile;
}
const range = (a: number, b: number) => a + Math.random() * (b - a);
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

export function HeroMeteors({ paused, reduced, suspended, onOpen }: HeroMeteorsProps) {
  const root = useRef<HTMLDivElement>(null);
  const initiallyHidden = useRef(!reduced);
  const anchors = useRef<(HTMLAnchorElement | null)[]>([]);
  const fallbackMarks = useRef<(HTMLDivElement | null)[]>([]);
  const streaks = useRef<(SVGSVGElement | null)[]>([]);
  const marks = useRef<Mark[]>(floatingProjects.map((_, index) => ({ index, slot: -1, flight: null, elapsed: 0, x: 0, y: 0, size: 38, opacity: .86, labelOpacity: 0, tailLength: 30, angle: 0, focused: false, pressed: false, hovered: false, near: false })));
  const props = useRef({ paused, reduced, suspended }); props.current = { paused, reduced, suspended };
  const gradient = useId().replace(/:/g, '');
  const omitted = new URLSearchParams(location.search).has('no-meteors');
  useLayoutEffect(() => { requestFrame(); }, [paused, reduced, suspended]);
  useEffect(() => {
    const el = root.current, hero = el?.closest<HTMLElement>('.gxc-hero');
    if (!el || !hero || omitted) return;
    const diagnostics = import.meta.env.DEV || ['perf', 'qa'].some(key => new URLSearchParams(location.search).get(key) === '1');
    const fine = matchMedia('(hover: hover) and (pointer: fine)');
    let heroRect = hero.getBoundingClientRect(), width = heroRect.width, height = heroRect.height;
    let mobile = width <= meteorArt.breakpoint, wordTop = Math.min(height, innerHeight) * .3, wordHeight = Math.min(height, innerHeight) * .4;
    let dirty = true, visible = false, revealFocus = true, wasReduced = props.current.reduced, oldScroll = -1, oldWidth = 0, oldHeight = 0, wordData = '', count = 0;
    let nextProjectIndex = 0, previousLimit = 0, previousLayout = '';
    const primed = Array.from({ length: floatingProjects.length }, () => false);
    const sky = new RandomSky();
    const wake = () => { dirty = true; requestFrame(); };
    const release = () => { for (const mark of marks.current) { mark.pressed = false; mark.hovered = false; mark.near = false; } requestFrame(); };
    const resized = new ResizeObserver(wake); resized.observe(hero);
    const intersection = new IntersectionObserver(entries => { visible = entries.some(entry => entry.isIntersecting); dirty = true; requestFrame(); }); intersection.observe(hero);
    document.addEventListener('visibilitychange', release);
    window.addEventListener('blur', release); window.addEventListener('pointerup', release); window.addEventListener('pointercancel', release); fine.addEventListener('change', wake);
    const measure = subscribeFrame(() => {
      if (!visible && !dirty) return;
      const frame = getFrameSnapshot(), data = hero.querySelector<HTMLElement>('.gxc-canvas')?.dataset.wordRect ?? '';
      if (frame.width !== oldWidth || frame.height !== oldHeight || data !== wordData) dirty = true;
      if (frame.scrollY !== oldScroll) { heroRect = hero.getBoundingClientRect(); oldScroll = frame.scrollY; }
      if (!dirty) return;
      dirty = false; oldWidth = frame.width; oldHeight = frame.height; wordData = data; heroRect = hero.getBoundingClientRect();
      width = heroRect.width; height = heroRect.height;
      mobile = width <= meteorArt.breakpoint || (navigator.maxTouchPoints > 0 && Math.min(width, frame.height || innerHeight) <= 500);
      // Meteor placement keeps its original viewport-based fallback; vertical
      // project flights independently use the full hero height.
      const fallbackWordHeight = Math.min(height, frame.height || innerHeight);
      wordTop = fallbackWordHeight * .3; wordHeight = fallbackWordHeight * .4;
      try { const word = JSON.parse(data); if (Number.isFinite(word.top) && word.height > 0) { wordTop = word.top; wordHeight = word.height; } } catch { /* Static word bounds while WebGL loads. */ }
      // Normalized paths retain their phase across resize/orientation changes.
      revealFocus = true;
    }, 'measure');
    const retire = (mark: Mark) => { mark.slot = -1; mark.flight = null; };
    // Fair catalog order: every available project gets a turn before a repeat.
    const nextProject = () => {
      for (let attempt = 0; attempt < floatingProjects.length; attempt++) {
        const mark = marks.current[nextProjectIndex];
        nextProjectIndex = (nextProjectIndex + 1) % floatingProjects.length;
        if (!mark.flight && !mark.focused && !mark.pressed) return mark;
      }
    };
    const projectLimit = () => Math.min(floatingProjects.length, width >= meteorArt.marks.desktopBreakpoint ? meteorArt.marks.desktopCount : mobile ? meteorArt.marks.mobileCount : meteorArt.marks.tabletCount);
    const assign = (mark: Mark, slot: number, phase: number | null, secondsUntilEntry?: number) => {
      mark.flight = createCrossing(mobile, floatingProjects[mark.index].slug, slot, projectLimit(), mobile && width > innerHeight); mark.slot = slot;
      mark.elapsed = phase === null ? -(secondsUntilEntry ?? (meteorArt.marks.tailRange[1] + 70) / height * mark.flight.duration) : phase * mark.flight.duration;
      primed[slot] = true;
      mark.size = range(...meteorArt.marks.sizeRange); mark.opacity = range(...meteorArt.marks.opacityRange); mark.tailLength = range(...meteorArt.marks.tailRange);
      mark.labelOpacity = mobile || !fine.matches ? 1 : 0;
    };
    // Both the viewport and the hero clip these controls. Residual tails may
    // keep rendering after an icon exits, but its link must leave Tab order.
    const inVisibleHero = (x: number, y: number) => x + 22 > 0 && x - 22 < width
      && y + 22 > 0 && y - 22 < height
      && y + heroRect.top + 22 > 0 && y + heroRect.top - 22 < innerHeight;
    const update = subscribeFrame((_, delta) => {
      const state = props.current, frame = getFrameSnapshot();
      const running = visible && !document.hidden && !state.suspended && !state.paused && !state.reduced;
      const limit = projectLimit();
      el.dataset.running = String(running); el.dataset.suspended = String(state.suspended);
      el.dataset.state = state.reduced ? 'reduced' : state.suspended || !visible || document.hidden ? 'suspended' : state.paused ? 'paused' : 'running';
      if (running) el.dataset.frames = String(++count);
      if (state.reduced) {
        for (const anchor of anchors.current) if (anchor) { anchor.hidden = false; anchor.style.pointerEvents = ''; anchor.dataset.visible = 'true'; anchor.tabIndex = 0; anchor.removeAttribute('aria-hidden'); }
        for (const node of [...streaks.current, ...fallbackMarks.current]) if (node) node.style.display = 'none';
        publishSky(hero, []); publishProjectSky(hero, []); el.dataset.skyCount = '0'; el.dataset.sky = '[]'; wasReduced = true; return false;
      }
      if (wasReduced) { wasReduced = false; revealFocus = true; }
      if (limit === floatingProjects.length && limit !== previousLimit) {
        for (const mark of marks.current) if (mark.flight) mark.slot = mark.index;
      }
      for (const mark of marks.current) {
        if (mark.slot >= limit && !mark.focused && !mark.pressed && !state.suspended) retire(mark);
        if (mark.focused && (!mark.flight || mark.slot >= limit)) {
          const slot = Array.from({ length: limit }, (_, i) => i).find(i => !marks.current.some(other => other !== mark && other.slot === i)) ?? 0;
          for (const other of marks.current) if (other !== mark && other.slot === slot) retire(other);
          if (mark.flight) { mark.slot = slot; primed[slot] = true; }
          else assign(mark, slot, .5);
        }
      }
      // Resize reflows the parallel tracks without replacing a project's phase,
      // duration or identity. Focus stays on the same entrance through reflow.
      const layoutKey = `${limit}:${mobile}:${mobile && width > innerHeight}`;
      if (layoutKey !== previousLayout) {
        for (const mark of marks.current) if (mark.flight && mark.slot < limit) {
          const center = trackCenter(mark.slot, limit, mobile, mobile && width > innerHeight);
          mark.flight.x = center;
        }
        previousLimit = limit; previousLayout = layoutKey;
      }
      const opening = mobile ? (width > innerHeight ? meteorArt.marks.landscapeOpeningPhases : meteorArt.marks.mobileOpeningPhases) : meteorArt.marks.openingPhases;
      // Reserve each wide-screen track for its own project. On smaller screens,
      // a fair queue rotates the six projects through the separated tracks.
      for (let slot = 0; slot < limit; slot++) {
        const occupants = marks.current.filter(mark => mark.slot === slot && mark.flight);
        const head = occupants.find(mark => mark.elapsed < mark.flight!.duration);
        if (!head) {
          const mark = limit === floatingProjects.length ? marks.current[slot] : nextProject();
          if (mark && !mark.flight) assign(mark, slot, primed[slot] ? null : opening[slot] * Math.min(1, innerHeight / height));
        }
        else if (limit < floatingProjects.length && head.elapsed >= 0 && !occupants.some(mark => mark.elapsed < 0)) {
          const remaining = head.flight!.duration - head.elapsed;
          const lead = (meteorArt.marks.tailRange[1] + 70) / height * (mobile ? 45 : 90);
          if (remaining > 0 && remaining <= lead) { const mark = nextProject(); if (mark) assign(mark, slot, null, remaining); }
        }
      }
      // Seed only the opening frame; a lane first exposed by resizing also enters from outside.
      primed.fill(true);
      const pointer = frame.pointer;
      // Freeze the pending successor as well, so it cannot overtake a held entry.
      const frozenSlots = new Set<number>();
      for (const mark of marks.current) {
        if (!mark.flight) continue;
        const point = crossingPoint(mark.flight, mark.elapsed / mark.flight.duration, width, height); mark.x = point.x; mark.y = point.y;
        mark.near = inVisibleHero(mark.x, mark.y) && fine.matches && pointer.inside && pointer.kind !== 'touch' && Math.hypot(pointer.x - heroRect.left - mark.x, pointer.y - heroRect.top - mark.y) <= meteorArt.marks.proximity;
        if (mark.focused || mark.pressed || mark.hovered || mark.near) frozenSlots.add(mark.slot);
      }
      const projectFrame: ProjectSkyPoint[] = [];
      let labelsAnimating = false;
      for (const mark of marks.current) {
        const anchor = anchors.current[mark.index], fallback = fallbackMarks.current[mark.index]; if (!anchor || !fallback) continue;
        anchor.dataset.slot = String(mark.slot);
        if (!mark.flight) { anchor.hidden = true; anchor.tabIndex = -1; anchor.dataset.visible = 'false'; anchor.setAttribute('aria-hidden', 'true'); fallback.style.display = 'none'; continue; }
        const frozen = frozenSlots.has(mark.slot), path = mark.flight;
        if (running && !frozen) mark.elapsed += delta;
        let point = crossingPoint(path, mark.elapsed / path.duration, width, height);
        if (mark.focused && revealFocus) {
          const labelBottom = projectLabelArt.offsetY + projectLabelArt.height / 2 + 12;
          const safe = { x: clamp(point.x, 54, width - 54), y: clamp(point.y, Math.max(100, -heroRect.top + 32), Math.min(height - labelBottom, innerHeight - heroRect.top - labelBottom)) };
          path.offsetX += (safe.x - point.x) / width; path.offsetY += (safe.y - point.y) / height; point = safe;
        }
        mark.x = point.x; mark.y = point.y;
        const margin = mark.tailLength + mark.size + 24;
        if (!frozen && mark.y > height + margin) { retire(mark); anchor.hidden = true; anchor.tabIndex = -1; anchor.dataset.visible = 'false'; anchor.setAttribute('aria-hidden', 'true'); fallback.style.display = 'none'; continue; }
        mark.angle = -90;
        const inView = inVisibleHero(mark.x, mark.y);
        anchor.hidden = false; anchor.tabIndex = inView ? 0 : -1;
        if (inView) anchor.removeAttribute('aria-hidden'); else anchor.setAttribute('aria-hidden', 'true');
        const transform = `translate3d(${(mark.x - 22).toFixed(2)}px,${(mark.y - 22).toFixed(2)}px,0)`;
        anchor.style.transform = transform; anchor.style.opacity = '1'; anchor.style.pointerEvents = inView ? '' : 'none';
        anchor.dataset.frozen = String(frozen); anchor.dataset.visible = String(inView);
        // The label is part of the flying image, not a viewport-pinned tooltip.
        // Keep its offset and let the same hero clip it naturally at either edge.
        const labelTarget = mobile || !fine.matches || mark.focused || mark.pressed || mark.hovered || mark.near ? 1 : 0;
        mark.labelOpacity += clamp(labelTarget - mark.labelOpacity, -delta / .14, delta / .14);
        if (Math.abs(labelTarget - mark.labelOpacity) > .0001) labelsAnimating = true;
        anchor.dataset.labelOpacity = mark.labelOpacity.toFixed(4);
        anchor.dataset.elapsed = mark.elapsed.toFixed(4); anchor.dataset.phase = (mark.elapsed / path.duration).toFixed(5);
        if (diagnostics) anchor.dataset.flight = JSON.stringify({ ...path, size: mark.size, opacity: mark.opacity, tailLength: mark.tailLength });
        anchor.dataset.labelSide = 'bottom';
        for (const node of [anchor, fallback]) {
          node.style.setProperty('--meteor-tail-angle', mark.angle + 'deg'); node.style.setProperty('--meteor-tail-length', mark.tailLength + 'px');
          const img = node.querySelector('img'); if (img) { img.style.width = mark.size + 'px'; img.style.height = mark.size + 'px'; }
        }
        fallback.style.display = 'grid'; fallback.style.transform = transform; fallback.style.opacity = String(mark.opacity);
        fallback.style.setProperty('--project-label-opacity', String(mark.labelOpacity));
        projectFrame.push({ index: mark.index, slug: floatingProjects[mark.index].slug, x: mark.x, y: mark.y, size: mark.size, opacity: mark.opacity, labelOpacity: mark.labelOpacity, tailLength: mark.tailLength, angle: mark.angle });
      }
      if (revealFocus && !state.suspended) {
        revealFocus = false;
        const mark = marks.current.find(item => item.focused), anchor = mark && anchors.current[mark.index];
        if (anchor) {
          const box = anchor.getBoundingClientRect(), label = anchor.querySelector('.gxc-meteor-label')?.getBoundingClientRect();
          const top = Math.min(box.top, label?.top ?? box.top) - 10, bottom = Math.max(box.bottom, label?.bottom ?? box.bottom) + 10;
          const adjustment = top < 0 ? top : bottom > innerHeight ? bottom - innerHeight : 0;
          if (adjustment) { scrollToPage(window.scrollY + adjustment, { immediate: true }); heroRect = hero.getBoundingClientRect(); dirty = true; }
        }
      }
      publishProjectSky(hero, projectFrame);
      if (diagnostics) el.dataset.projects = JSON.stringify(projectFrame);
      el.dataset.lanes = String(limit);
      if (running && frozenSlots.size) el.dataset.state = 'frozen';
      const skyFrame = sky.update(delta, running, { width, height: heroRect.height, wordTop, wordHeight, mobile, visibleTop: Math.max(0, -heroRect.top), visibleBottom: Math.min(heroRect.height, innerHeight - heroRect.top) });
      for (let i = 0; i < streaks.current.length; i++) {
        const node = streaks.current[i], star = skyFrame[i]; if (!node) continue;
        if (!star) { node.style.display = 'none'; continue; }
        node.style.display = 'block'; node.style.width = star.length + 'px';
        node.style.transform = `translate3d(${star.x.toFixed(2)}px,${(star.y - 7).toFixed(2)}px,0) rotate(${star.angle.toFixed(2)}deg)`; node.style.opacity = star.opacity.toFixed(3);
      }
      publishSky(hero, skyFrame);
      el.dataset.skyCount = String(skyFrame.filter(s => s.x >= 0 && s.x <= width && s.y >= Math.max(0, -heroRect.top) && s.y <= Math.min(heroRect.height, innerHeight - heroRect.top)).length);
      if (diagnostics) el.dataset.sky = JSON.stringify(skyFrame);
      return running || (labelsAnimating && visible && !document.hidden && !state.suspended);
    }, 'update');
    return () => {
      measure(); update(); clearSky(hero); clearProjectSky(hero); resized.disconnect(); intersection.disconnect();
      document.removeEventListener('visibilitychange', release); window.removeEventListener('blur', release); window.removeEventListener('pointerup', release); window.removeEventListener('pointercancel', release); fine.removeEventListener('change', wake);
    };
  }, [omitted]);
  const freeze = (index: number, key: 'focused' | 'pressed' | 'hovered', value: boolean) => { marks.current[index][key] = value; requestFrame(); };
  if (omitted) return null;
  return <>
    {/* Match the scene: meteors behind project artwork, with both below glass. */}
    <div className="gxc-sky-fallback" data-reduced={reduced ? 'true' : 'false'} aria-hidden="true">{Array.from({ length: meteorArt.stars.capacity }, (_, index) => <svg key={index} ref={element => { streaks.current[index] = element; }} className="gxc-fast-meteor" viewBox="0 0 500 14" preserveAspectRatio="none" aria-hidden="true" style={{ display: 'none' }}>
      <defs><linearGradient id={`${gradient}-${index}`}><stop offset="0" stopColor="#f5f7ff" stopOpacity=".85"/><stop offset=".13" stopColor="#e9efff" stopOpacity=".55"/><stop offset="1" stopColor="#d2e1ff" stopOpacity="0"/></linearGradient></defs>
      <path d="M4 7 L500 5.8 L500 8.2 Z" fill={`url(#${gradient}-${index})`}/><circle cx="4" cy="7" r="1.9" fill="#f8faff"/>
    </svg>)}</div>
    <div className="gxc-project-fallback" aria-hidden="true" data-reduced={reduced ? 'true' : 'false'}>{floatingProjects.map((project, index) => <div className="gxc-meteor-visual" data-project={project.slug} key={project.id} ref={node => { fallbackMarks.current[index] = node; }} style={{ display: 'none' }}><span className="gxc-meteor-symbol"><img src={'/v-next/project-marks/' + projectMarks[project.slug].file} onError={event => recoverMark(event, project.slug)} width={38} height={38} alt=""/></span><span className="gxc-meteor-label">{projectMarks[project.slug].shortName}</span></div>)}</div>
    <div ref={root} className="gxc-meteors" data-reduced={reduced ? 'true' : 'false'} aria-label={sceneText('Explore projects in the sky')} role="navigation">
      {floatingProjects.map((project, index) => <a key={project.id} ref={element => { anchors.current[index] = element; }} className="gxc-meteor-mark" data-project={project.slug} data-entry="hero" href={'#/work/' + project.slug} tabIndex={-1} aria-label={sceneText('Explore ') + project.title} hidden={initiallyHidden.current}
        onFocus={() => freeze(index, 'focused', true)} onBlur={() => { freeze(index, 'focused', false); freeze(index, 'pressed', false); }}
        onPointerEnter={event => { if (event.pointerType === 'mouse') freeze(index, 'hovered', true); }} onPointerLeave={() => freeze(index, 'hovered', false)}
        onPointerDown={() => freeze(index, 'pressed', true)} onPointerCancel={() => freeze(index, 'pressed', false)} onClick={event => onOpen(event, project)}>
        <span className="gxc-meteor-symbol" aria-hidden="true"><img src={'/v-next/project-marks/' + projectMarks[project.slug].file} onError={event => recoverMark(event, project.slug)} width={38} height={38} alt="" draggable={false}/></span>
        <span className="gxc-meteor-label" aria-hidden="true">{projectMarks[project.slug].shortName}</span>
      </a>)}
    </div>
  </>;
}
