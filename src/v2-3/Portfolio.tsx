import { useEffect, useLayoutEffect, useRef, useState, type MouseEvent, type CSSProperties, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { motion, animate, useMotionValue, useTransform } from 'motion/react';
import { ArrowUpRight, ArrowDown, ArrowLeft, ArrowRight, Plus, X, Menu, Pause, Play, Check } from 'lucide-react';
import { workProjects, portfolioContact, type PortfolioProject } from './content/portfolioData';
import rawGalleries from './content/projectGalleries.json';
import { localizeMain, t } from '../localization/main';
import { sitePath } from '../localization/locale';
import { visual } from './config';
import { useSmoothScene, scrollToPage, setScrollLocked, resetScrollSample } from './runtime';
import { GlassHero, HeroPhoto } from './Hero';
import { GlassNav, useLiquidSurface } from './LiquidSurface';
import { HeroMeteors } from './HeroMeteors';
import { HeroTwinkles } from './HeroTwinkles';
import { WorkCanvas } from './WorkCanvas';
import { WorkBackdrop } from './WorkBackdrop';
import type { WorkScene } from './workScene';
import { shotFlowCaseCover, shotFlowCaseScreens, shotFlowPainPoints, shotFlowExampleShots, shotFlowReferencePreview } from './shotflowCaseContent';
import { mobileThumbnail, useMobileThumbnailMode, workImageSizes, workLayout } from './mobileThumbnails';

import ShotFlowDemo from './ShotFlowDemo';
import { ShotFlowPhoneFrame } from './ShotFlowPhoneFrame';
import { IntroMeCase } from './IntroMeCase';
import { FilmCase } from './FilmCase';
import { introMeMedia } from './introMeCaseContent';
import { HarvardCase } from './HarvardCase';
import { harvardCase } from './harvardCaseContent';
import { PerformancePanel } from './PerformancePanel';
import { markEntryAppReady, useEntryPhase } from './entry';
import { BrandMark } from './BrandMark';
import { DetailBrand } from './DetailBrand';
import { useDeferredImage } from './deferredMedia';

type Rect = { x: number; y: number; width: number; height: number };
type Study = { image: string; alt: string; caption: string; width?: number; height?: number; srcSet?: string; sizes?: string; loading?: 'lazy' | 'eager' };
const number = (n: number) => String(n + 1).padStart(2, '0');
const galleries = localizeMain(rawGalleries);
const parseProject = () => workProjects.find(p => location.hash === '#/work/' + p.slug) ?? null;
const retiredProject = () => /^#\/work\/m-box\/?$/.test(location.hash);
const modified = (e: MouseEvent) => e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0;

export function NextPortfolio() {
  const entryPhase = useEntryPhase();
  const entering = entryPhase !== 'complete';
  useEffect(() => { markEntryAppReady(); }, []);
  const mobileThumbnails = useMobileThumbnailMode();
  const [reduce, setReduce] = useState(() => matchMedia('(prefers-reduced-motion: reduce)').matches);
  useEffect(() => {
    const media = matchMedia('(prefers-reduced-motion: reduce)');
    const change = () => setReduce(media.matches);
    media.addEventListener('change', change); return () => media.removeEventListener('change', change);
  }, []);
  const [paused, setPaused] = useState(false);
  const disabled = reduce || paused;
  const [project, setProject] = useState<PortfolioProject | null>(parseProject);
  const [entrySource, setEntrySource] = useState<'hero' | 'work'>(() => history.state?.gxcEntry === 'hero' ? 'hero' : 'work');
  const [menu, setMenu] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const closing = useRef(false);
  const [locked, setLocked] = useState(!!project);
  const [active, setActive] = useState('top');
  const [keyboard, setKeyboard] = useState(false);
  const origin = useRef<Rect | null>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const savedScroll = useRef(0);
  const menuTrigger = useRef<HTMLButtonElement>(null);
  const workRoot = useRef<HTMLElement>(null);
  const workScene = useRef<WorkScene | null>(null);
  const pendingOpen = useRef<AbortController | null>(null);
  const [openingSlug, setOpeningSlug] = useState<string | null>(null);
  const projectRef = useRef(project); projectRef.current = project;
  useSmoothScene(disabled, locked || menuVisible || entering);
  useEffect(() => {
    const oldRestoration = history.scrollRestoration; history.scrollRestoration = 'manual';
    const sync = () => {
      cancelPending();
      const retired = retiredProject();
      if (retired) history.replaceState(null, '', '#work');
      const next = parseProject();
      if (next) { closing.current = false; setEntrySource(history.state?.gxcEntry === 'hero' ? 'hero' : 'work'); }
      setProject(next); setMenu(false);
      if (retired) {
        savedScroll.current = Math.max(0, (document.getElementById('work')?.offsetTop ?? 0) - 90);
        scrollToPage(savedScroll.current, { immediate: true });
        document.getElementById('work')?.focus({ preventScroll: true });
      }
    };
    if (retiredProject()) sync();
    window.addEventListener('popstate', sync); window.addEventListener('hashchange', sync);
    const key = (event: KeyboardEvent) => {
      setKeyboard(true);
      if (event.key === 'Escape' && pendingOpen.current) { event.preventDefault(); cancelPending(); }
    };
    const pointer = () => setKeyboard(false);
    window.addEventListener('keydown', key); window.addEventListener('pointerdown', pointer);
    return () => { pendingOpen.current?.abort(); history.scrollRestoration = oldRestoration; window.removeEventListener('popstate', sync); window.removeEventListener('hashchange', sync); window.removeEventListener('keydown', key); window.removeEventListener('pointerdown', pointer); };
  }, []);
  useLayoutEffect(() => {
    document.title = project ? project.title + t(' — Gala X Ci 2.3') : t('Gala X Ci 2.3 — Ci Song');
  }, [project]);
  useEffect(() => {
    const observer = new IntersectionObserver(() => {
      const items = ['top', 'work', 'about', 'contact'];
      let current = 'top';
      for (const id of items) if ((document.getElementById(id)?.getBoundingClientRect().top ?? 9999) <= innerHeight * .42) current = id;
      setActive(current);
    }, { threshold: [0, .1, .4, .7, 1], rootMargin: '-15% 0px -30% 0px' });
    document.querySelectorAll('[data-section]').forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, []);
  useLayoutEffect(() => {
    const value = document.body.style.overflow;
    if (locked || menuVisible) document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = value; };
  }, [locked, menuVisible]);
  function cancelPending() {
    if (!pendingOpen.current) return;
    pendingOpen.current.abort(); pendingOpen.current = null; setOpeningSlug(null);
    if (!projectRef.current) { setLocked(false); setScrollLocked(false); }
  }
  const jump = (id: string, instant = false) => {
    cancelPending();
    setMenu(false);
    history.pushState(null, '', '#' + id);
    const el = document.getElementById(id);
    if (instant) el?.focus({ preventScroll: true });
    scrollToPage((el?.getBoundingClientRect().top ?? 0) + scrollY - 90, { immediate: disabled || instant });
    setActive(id);
  };
  const open = (e: MouseEvent<HTMLAnchorElement>, item: PortfolioProject, entry: 'hero' | 'work' = 'work') => {
    if (modified(e)) return; e.preventDefault();
    const anchor = e.currentTarget, instant = disabled || e.detail === 0;
    setKeyboard(e.detail === 0); closing.current = false;
    if (projectRef.current) {
      history.replaceState(history.state, '', '#/work/' + item.slug); setProject(item); return;
    }
    setEntrySource(entry);
    pendingOpen.current?.abort();
    const controller = new AbortController(); pendingOpen.current = controller;
    setOpeningSlug(item.slug); setLocked(true); setScrollLocked(true);
    returnFocus.current = anchor;
    void (async () => {
      try { if (entry === 'work') await workScene.current?.flatten({ duration: instant ? 0 : visual.work.flattenDuration, signal: controller.signal }); }
      catch { if (controller.signal.aborted) return; }
      if (controller.signal.aborted || pendingOpen.current !== controller) return;
      // Native scrolling can deliver one final compositor update after cancellation.
      // Capture the reading position in the same frame as the settled cover bounds.
      savedScroll.current = scrollY;
      const selector = item.slug === 'shotflow' ? '.gxc-project-picture > img' : '.gxc-project-picture';
      const rect = entry === 'work' ? anchor.querySelector(selector)?.getBoundingClientRect() : undefined;
      origin.current = rect ? { x: rect.x, y: rect.y, width: rect.width, height: rect.height } : null;
      pendingOpen.current = null; setOpeningSlug(null);
      history.pushState({ gxcProject: true, gxcEntry: entry }, '', '#/work/' + item.slug);
      setProject(item);
    })();
  };
  const close = () => {
    if (pendingOpen.current) { cancelPending(); return; }
    if (closing.current || !project) return; closing.current = true;
    if (history.state?.gxcProject && returnFocus.current) history.back();
    else { const target = entrySource === 'hero' ? 'top' : 'work'; setProject(null); history.replaceState(null, '', '#' + target); savedScroll.current = Math.max(0, (document.getElementById(target)?.offsetTop ?? 0) - 90); }
  };
  const homeFromProject = (event: MouseEvent<HTMLAnchorElement>) => {
    if (modified(event)) return;
    event.preventDefault(); cancelPending(); setMenu(false); setKeyboard(event.detail === 0);
    closing.current = true; savedScroll.current = 0; origin.current = null;
    returnFocus.current = document.getElementById('top');
    history.pushState(null, '', '#top'); setProject(null);
  };
  const prepareRestore = async () => {
    scrollToPage(savedScroll.current, { immediate: true }); resetScrollSample();
    workScene.current?.setSuspended(false);
    await workScene.current?.restore();
  };
  const restore = () => {
    scrollToPage(savedScroll.current, { immediate: true }); resetScrollSample();
    (returnFocus.current ?? document.getElementById(entrySource === 'hero' ? 'top' : 'work'))?.focus({ preventScroll: true });
    setLocked(false); setScrollLocked(false);
  };
  return <div className="gxc-site" data-motion={disabled ? 'reduced' : 'full'} data-state={openingSlug ? 'flattening' : project ? 'detail' : locked ? 'closing' : 'home'} data-target={openingSlug ?? project?.slug ?? ''} style={{ '--entry-duration': visual.motion.entry + 's' } as CSSProperties}>
    <a className="gxc-skip" href="#work" onClick={e => { e.preventDefault(); jump('work', true); }}>{t('Skip to work')}</a>
    <header className="gxc-header">
      <a className="gxc-brand" href="#top" onClick={e => { if (modified(e)) return; e.preventDefault(); jump('top', e.detail === 0); }} aria-label={t('Gala X Ci, back to top')}><BrandMark /></a>
      <GlassNav className="gxc-nav">
        <nav aria-label={t('Main navigation')}>{['work', 'about', 'contact'].map(id => <a key={id} href={'#' + id} aria-current={active === id ? 'location' : undefined} onClick={e => { e.preventDefault(); jump(id, e.detail === 0); }}>{t(id)}<span aria-hidden="true" /></a>)}</nav>
        <button className="gxc-motion" aria-label={t(reduce ? 'System reduced motion enabled' : paused ? 'Resume motion' : 'Pause motion')} aria-pressed={disabled} disabled={reduce} onClick={() => setPaused(!paused)}>{disabled ? <Play size={13} /> : <Pause size={13} />}</button>
        <button ref={menuTrigger} className="gxc-menu-trigger" aria-expanded={menu} aria-controls="gxc-menu" aria-label={t('Open menu')} onClick={() => { cancelPending(); setMenu(true); }}><Menu size={21} /></button>
      </GlassNav>
    </header>
    <main>
      <section className="gxc-hero" id="top" tabIndex={-1} data-section>
        <HeroPhoto />
        <HeroTwinkles paused={paused} reduced={reduce} suspended={entryPhase === 'preparing' || locked || menuVisible || !!project} />
        <div className="gxc-hero-top gxc-gutter">
          <p className="gxc-mono"><span className="gxc-reveal-line"><span data-gxc-reveal="1">CI SONG</span></span><span className="gxc-reveal-line"><span data-gxc-reveal="2">{t('DESIGN & EXPLORATION')}</span></span></p>
          <p className="gxc-hero-statement"><span className="gxc-reveal-line"><span data-gxc-reveal="2">{t('Between people,')}</span></span><span className="gxc-reveal-line"><span data-gxc-reveal="3">{t('interfaces & environments.')}</span></span></p>
          <p className="gxc-mono gxc-hero-photo-credit"><span className="gxc-reveal-line"><span data-gxc-reveal="3">{t('PHOTOGRAPHED BY')}</span></span><span className="gxc-reveal-line"><span data-gxc-reveal="4">CI SONG · <time dateTime="2022">2022</time></span></span></p>
        </div>
        <h1 className="gxc-sr">Gala X Ci — Ci Song</h1>
        <GlassHero disabled={disabled} suspended={locked || menuVisible || !!project} />
        <div className="gxc-hero-footer">
          <div className="gxc-hero-bottom gxc-gutter">
            <p><span className="gxc-reveal-line"><span data-gxc-reveal="4">{t('Designing experiences across')}</span></span><span className="gxc-reveal-line"><span data-gxc-reveal="5">{t('digital and physical worlds.')}</span></span></p>
            <div><span className="gxc-mono"><span className="gxc-reveal-line"><span data-gxc-reveal="5">{t('INTERFACES, EXPERIMENTS,')}</span></span><span className="gxc-reveal-line"><span data-gxc-reveal="6">{t('AND ENVIRONMENTS.')}</span></span></span><a className="gxc-round-link" data-gxc-reveal="7" href="#work" onClick={e => { e.preventDefault(); jump('work', e.detail === 0); }} aria-label={t('Explore selected work')}><ArrowDown size={22}/></a></div>
          </div>
          <div className="gxc-hero-rule gxc-gutter" data-gxc-reveal="7" aria-hidden="true"><Plus/><span/><Plus/></div>
          <HeroMeteors paused={paused} reduced={reduce} suspended={entryPhase === 'preparing' || locked || menuVisible || !!project} onOpen={(e, item) => open(e, item, 'hero')} />
        </div>
      </section>
      <section ref={workRoot} className="gxc-work gxc-gutter" id="work" tabIndex={-1} data-section aria-labelledby="work-title">
        <div className="gxc-section-heading"><span className="gxc-mono">{t('01 / SELECTED EXPLORATIONS')}</span><h2 id="work-title">{t('Ideas, made')}<br/><em>{t('tangible.')}</em></h2><p>{t('Conversation. Environments.')}<br/>{t('New ways to interact.')}</p></div>
        <div className="gxc-project-grid">{workProjects.map((item, i) => <ProjectCard key={item.id} item={item} index={i} pending={openingSlug === item.slug} mobileThumbnails={mobileThumbnails} onOpen={open} />)}</div>
        <div className="gxc-work-end gxc-mono"><span>{t('FROM CONVERSATION TO ENVIRONMENTS.')}</span><Plus size={15}/><span>{t('ALWAYS EXPLORING.')}</span></div>
      </section>
      <section className="gxc-about gxc-gutter" id="about" tabIndex={-1} data-section aria-labelledby="about-title">
        <div className="gxc-about-label gxc-mono">{t('02 / A LITTLE ABOUT ME')}<ArrowDown size={18}/></div>
        <div className="gxc-about-main"><h2 id="about-title">{t('Between people,')}<br/>{t('interfaces')}<br/>& <em>{t('environments.')}</em></h2><div className="gxc-about-copy"><p>{t('People and technology. Screens and spaces. An idea and the moment it becomes an experience.')}</p><p>{t('My work explores conversational AI, virtual environments, and physical interfaces. I make things to understand how they might feel, work, and fit into our lives.')}</p></div><a className="gxc-text-link" href={'mailto:' + portfolioContact.email + '?subject=' + encodeURIComponent(t('Resume request'))}>{t('Request my résumé')}<ArrowUpRight size={18}/></a></div>
      </section>
      <section className="gxc-contact gxc-gutter" id="contact" tabIndex={-1} data-section aria-labelledby="contact-title">
        <div className="gxc-contact-top gxc-mono"><span>{t('03 / WHAT’S NEXT?')}</span><span>{t('OPEN TO OPPORTUNITIES')}</span></div>
        <h2 id="contact-title">{t('Let’s make')}<br/><em>{t('what’s next.')}</em><a className="gxc-contact-arrow" href={'mailto:' + portfolioContact.email} aria-label={t('Email Ci Song')}><ArrowUpRight/></a></h2>
        <a className="gxc-email" href={'mailto:' + portfolioContact.email}>{portfolioContact.email}</a>
        <footer><span className="gxc-mono">GALA X CI / CI SONG</span><div><a href={portfolioContact.linkedIn} target="_blank" rel="noreferrer">LinkedIn <ArrowUpRight size={13}/></a><a href={sitePath('photography')}>{t('Photography & Film')} <ArrowUpRight size={13}/></a><a href="#top" onClick={e => { e.preventDefault(); jump('top', e.detail === 0); }}>{t('Back to top')} <ArrowUpRight size={13}/></a></div></footer>
      </section>
    </main>
    <WorkBackdrop root={workRoot} paused={paused} reduced={reduce} suspended={locked || menuVisible || !!project} enabled={!entering}/>
    <WorkCanvas root={workRoot} scene={workScene} disabled={disabled} suspended={!!project || menuVisible} enabled={!entering}/>
    <PerformancePanel />
    <MobileMenu open={menu} close={() => setMenu(false)} jump={jump} instant={disabled || keyboard} onPresenceChange={setMenuVisible} returnFocus={menuTrigger} />
    <ProjectDialog project={project} brandFromHome={!!returnFocus.current} onHome={homeFromProject} entrySource={entrySource} source={origin.current} instant={disabled || keyboard} onClose={close} onLock={() => setLocked(true)} onPrepareRestore={prepareRestore} onRestored={restore} onOpen={open}/>
  </div>;
}

function ProjectThumbnail({ slug, id, mobile, src, desktopSrcSet, sizes, alt, width, height, className }: { slug: string; id: string; mobile: boolean; src: string; desktopSrcSet?: string; sizes: string; alt: string; width: number; height: number; className?: string }) {
  const imageRef = useRef<HTMLImageElement>(null);
  const entryPhase = useEntryPhase();
  const admitted = useDeferredImage(imageRef, entryPhase === 'complete');
  const light = mobile ? mobileThumbnail(slug, id) : undefined;
  const sourceKey = [src, desktopSrcSet, light?.srcSet ?? 'desktop'].join('|');
  const [failedKey, setFailedKey] = useState('');
  const fallback = failedKey === sourceKey;
  useEffect(() => { setFailedKey(''); }, [sourceKey]);
  useEffect(() => {
    if (!fallback) return;
    // A failed mobile candidate should not disable responsive selection forever.
    // Retry after a changed viewport/DPR, as well as on a media/source change.
    const failedWidth = innerWidth, failedDpr = devicePixelRatio;
    const retry = () => { if (innerWidth !== failedWidth || devicePixelRatio !== failedDpr) setFailedKey(''); };
    window.addEventListener('resize', retry);
    return () => window.removeEventListener('resize', retry);
  }, [fallback]);
  return <img ref={imageRef} className={className} src={admitted ? fallback ? src : light?.src ?? src : undefined} srcSet={admitted && !fallback ? light?.srcSet ?? desktopSrcSet : undefined} sizes={sizes} alt={alt} width={width} height={height} loading="lazy" decoding="async" data-load={admitted ? 'admitted' : 'pending'} data-thumbnail-id={id} data-thumbnail-mode={fallback ? 'fallback' : light ? 'mobile' : 'desktop'} onError={() => { if (!fallback) setFailedKey(sourceKey); }}/>
}

function ProjectCard({ item, index, pending, mobileThumbnails, onOpen }: { item: PortfolioProject; index: number; pending: boolean; mobileThumbnails: boolean; onOpen: (e: MouseEvent<HTMLAnchorElement>, p: PortfolioProject) => void }) {
  const media = item.slug === 'shotflow' ? shotFlowCaseCover : item;
  const layout = workLayout(index);
  const sizes = workImageSizes(layout, item.slug === 'shotflow');
  const pictureStyle = { '--project-image-ratio': `${media.imageWidth} / ${media.imageHeight}` } as CSSProperties;
  return <article className={'gxc-project gxc-project-' + item.slug} data-layout={layout}>
    <a href={'#/work/' + item.slug} onClick={e => onOpen(e, item)} data-opening={pending ? 'true' : undefined} aria-busy={pending || undefined} aria-label={t('Explore ') + item.title}>
      <div className="gxc-project-picture" data-fit={item.imageFit ?? 'cover'} style={pictureStyle}>
        <ProjectThumbnail slug={item.slug} id={item.slug === 'shotflow' ? 'workspace' : 'cover'} mobile={mobileThumbnails} src={media.image} desktopSrcSet={media.imageSmall + ' 800w, ' + media.image + ' ' + media.imageWidth + 'w'} sizes={sizes} alt={media.imageAlt} width={media.imageWidth} height={media.imageHeight}/>
        {item.slug === 'shotflow' && <ProjectThumbnail slug={item.slug} id="storyboard" mobile={mobileThumbnails} className="gxc-shotflow-second" src={shotFlowCaseScreens[2].image} sizes={sizes} alt={t('ShotFlow English native storyboard capture')} width={1290} height={2796}/>}
        <span className="gxc-project-index gxc-mono">{number(index)} / {t(index < 3 ? 'IN FOCUS' : 'EXPLORATION')}</span><span className="gxc-project-open"><ArrowUpRight size={22}/></span>
      </div>
      <div className="gxc-project-caption"><div><h3>{item.title}</h3><p>{item.category}</p></div><span className="gxc-mono">{item.tags[0]}</span></div>
    </a>
  </article>;
}

function MobileMenu({ open, close, jump, instant, onPresenceChange, returnFocus }: { open: boolean; close(): void; jump(id: string, instant?: boolean): void; instant: boolean; onPresenceChange(value: boolean): void; returnFocus: RefObject<HTMLButtonElement | null> }) {
  const ref = useRef<HTMLDialogElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const material = useLiquidSurface(panel, open, true);
  const latest = useRef(open); latest.current = open;
  const pendingJump = useRef<{ id: string; instant: boolean } | null>(null);
  const jumpRef = useRef(jump); jumpRef.current = jump;
  const progress = useMotionValue(0);
  const y = useTransform(progress, [0, 1], [-8, 0]);
  const menuScale = useTransform(progress, [0, 1], [.96, 1]);
  useLayoutEffect(() => {
    if (!open && !ref.current?.open) return;
    if (open) { pendingJump.current = null; ref.current?.showModal(); onPresenceChange(true); }
    const control = animate(progress, open ? 1 : 0, { duration: instant ? 0 : visual.motion.menu, ease: [.23, 1, .32, 1] });
    if (!open) control.then(() => { if (!latest.current) { ref.current?.close(); onPresenceChange(false); returnFocus.current?.focus({ preventScroll: true });
      const pending = pendingJump.current; pendingJump.current = null;
      if (pending) requestAnimationFrame(() => jumpRef.current(pending.id, pending.instant)); } });
    return () => control.stop();
  }, [open, instant, progress, onPresenceChange, returnFocus]);
  return <dialog ref={ref} id="gxc-menu" className="gxc-menu-dialog" aria-label={t('Navigation')} onCancel={e => { e.preventDefault(); close(); }} onKeyDown={event => {
    if (event.key !== 'Tab' || event.altKey || event.ctrlKey || event.metaKey) return;
    // WebKit can honor a system preference that skips anchors with Tab.
    // Keep this navigation dialog complete and consistent in either setting.
    const items = [...event.currentTarget.querySelectorAll<HTMLElement>('a[href], button:not(:disabled)')].filter(el => el.tabIndex >= 0 && el.getClientRects().length);
    if (!items.length) return;
    event.preventDefault();
    const current = items.indexOf(document.activeElement as HTMLElement);
    const next = current < 0 ? (event.shiftKey ? items.length - 1 : 0) : (current + (event.shiftKey ? -1 : 1) + items.length) % items.length;
    items[next].focus();
  }}>
    <motion.div ref={panel} className="gxc-menu-panel gxc-glass" data-glass="frosted" style={{ opacity: progress, y, scale: menuScale }}>
      {material}
      <div className="gxc-menu-top"><span className="gxc-mono">GALA X CI</span><button onClick={close} aria-label={t('Close menu')}><X/></button></div>
      <nav>{['top', 'work', 'about', 'contact'].map((id, i) => <a key={id} href={'#' + id} onClick={e => { e.preventDefault(); pendingJump.current = { id, instant: e.detail === 0 }; close(); }}><span className="gxc-mono">{number(i)}</span>{t(id === 'top' ? 'Home' : id)}<ArrowUpRight/></a>)}</nav>
      <a className="gxc-menu-photo" href={sitePath('photography')}>{t('Photography & Film')}<ArrowUpRight size={18}/></a>
      <span className="gxc-mono">{t('CI SONG / DESIGN & EXPLORATION')}</span>
    </motion.div>
  </dialog>;
}

function ShotFlowCase({ item, heading, slot, onZoom, active }: { item: PortfolioProject; heading: RefObject<HTMLHeadingElement | null>; slot: RefObject<HTMLDivElement | null>; onZoom(study: Study): void; active: boolean }) {
  const screens = shotFlowCaseScreens;
  const demo = useRef<HTMLDivElement>(null);
  const demoHeading = useRef<HTMLHeadingElement>(null);
  const visitDemo = () => {
    demo.current?.scrollIntoView({ block: 'start', behavior: 'instant' });
    demoHeading.current?.focus({ preventScroll: true });
  };
  return <div className="gxc-shotflow-case gxc-shotflow-import-case" onClickCapture={event => {
    const button = event.target instanceof Element ? event.target.closest('.gxc-study > button') : null;
    if (button instanceof HTMLButtonElement) button.focus({ preventScroll: true });
  }}>
    <section className="gxc-shotflow-introduction" aria-labelledby="gxc-detail-title">
      <header className="gxc-detail-heading"><span className="gxc-mono">{item.category}</span><h2 ref={heading} id="gxc-detail-title" tabIndex={-1}>{item.title}</h2></header>
      <section className="gxc-shotflow-product-cover" aria-labelledby="gxc-shotflow-cover-title">
        <div className="gxc-shotflow-cover-copy">
          <span className="gxc-mono">{t('SHOTFLOW AT A GLANCE')}</span>
          <h3 id="gxc-shotflow-cover-title">{t('Turn reference videos into a shot list.')}</h3>
          <p>{t('Automatically find the cuts. Review and plan what to film.')}</p>
        </div>
        <div className="gxc-shotflow-cover-source">
          <p className="gxc-shotflow-cover-count"><strong>1</strong><span>{t('reference video')}</span></p>
          <StudyImage study={{ ...shotFlowReferencePreview, loading: 'eager' }} onZoom={onZoom}/>
          <p className="gxc-shotflow-cover-note">{t('96-second demo reference')}</p>
        </div>
        <div className="gxc-shotflow-cover-transfer"><span>{t('Automatic shot detection')}</span><span className="gxc-shotflow-cover-arrow" aria-hidden="true"><ArrowRight size={24}/></span></div>
        <div className="gxc-shotflow-cover-result">
          <p className="gxc-shotflow-cover-count"><strong>32</strong><span>{t('individual shots')}</span></p>
          <div className="gxc-shotflow-cover-phone"><StudyImage study={{ ...screens[2], loading: 'eager' }} onZoom={onZoom} phoneFrame/></div>
          <p className="gxc-shotflow-cover-note">{t('Review · Arrange · Check off')}</p>
        </div>
        <p className="gxc-shotflow-cover-caption">{t('Native development build · Actual analysis result')}</p>
      </section>
      <div className="gxc-shotflow-pain-grid">
        {shotFlowPainPoints.map(point => <article className="gxc-shotflow-pain" key={point.id} aria-labelledby={`gxc-shotflow-pain-${point.id}`}>
          <StudyImage study={{ ...point, loading: 'eager' }} onZoom={onZoom}/>
          <div className="gxc-shotflow-pain-copy">
            <span className="gxc-mono">{t(point.stage)}</span>
            <h3 id={`gxc-shotflow-pain-${point.id}`}>{t(point.title)}</h3>
            <p>{t(point.description)}</p>
          </div>
        </article>)}
      </div>
      <section className="gxc-shotflow-comparison" aria-labelledby="gxc-shotflow-comparison-title">
        <header className="gxc-shotflow-compare-heading">
          <span className="gxc-mono">{t('Illustrative example · A café film')}</span>
          <h3 id="gxc-shotflow-comparison-title">{t('From a reference film to a list of things to film.')}</h3>
          <p>{t('Each of these moments needs to be planned and filmed.')}</p>
        </header>
        <div className="gxc-shotflow-compare-grid">
          <div className="gxc-shotflow-reference">
            <h4>{t('What you watch')}</h4>
            <p className="gxc-shotflow-compare-note">{t('One continuous reference film.')}</p>
            <ol className="gxc-shotflow-filmstrip" aria-label={t('Three moments in the same reference film')}>
              {shotFlowExampleShots.map((shot, i) => <li key={shot.id}>
                <StudyImage study={{ ...shot, caption: `${number(i)} / ${t(shot.label)}`, sizes: '(max-width: 1000px) calc((100vw - 80px) / 3), 180px' }} onZoom={onZoom}/>
              </li>)}
            </ol>
          </div>
          <div className="gxc-shotflow-manual-work">
            <h4>{t('The work in between')}</h4>
            <ol aria-label={t('Manually turning a reference into filming tasks')}>
              {['Pause', 'Find', 'Select', 'Record'].map((step, i) => <li key={step}><span>{t(step)}</span>{i < 3 && <ArrowDown size={15} aria-hidden="true"/>}</li>)}
            </ol>
            <p className="gxc-shotflow-compare-note">{t('Write down what to film.')}</p>
          </div>
          <div className="gxc-shotflow-filming-tasks">
            <h4>{t('What you need to shoot')}</h4>
            <p className="gxc-shotflow-compare-note">{t('Separate tasks, each linked to its reference.')}</p>
            <ol className="gxc-shotflow-task-list" aria-label={t('Illustrative filming tasks and progress')}>
              {shotFlowExampleShots.map((shot, i) => <li key={shot.id}>
                <StudyImage study={{ ...shot, caption: t(shot.task), sizes: '(max-width: 760px) 88px, 108px' }} onZoom={onZoom}/>
                <div className="gxc-shotflow-task-copy"><p><span className="gxc-shotflow-task-number" aria-hidden="true">{number(i)} / </span>{t(shot.task)}</p><span className="gxc-shotflow-task-status" data-filmed={shot.filmed}><span className="gxc-shotflow-task-mark" aria-hidden="true">{shot.filmed && <Check size={12}/>}</span>{t(shot.filmed ? 'Filmed' : 'To film')}</span></div>
              </li>)}
            </ol>
            <p className="gxc-shotflow-compare-note gxc-shotflow-progress-note">{t('Example progress during filming.')}</p>
          </div>
        </div>
      </section>
      <div className="gxc-shotflow-response">
        <div><span className="gxc-mono">{t('THE IDEA')}</span><p>{t('ShotFlow turns reference footage into individual shots you can review, arrange and check off as you shoot.')}</p><p className="gxc-shotflow-choice">{t('You choose which moments belong in your own shoot.')}</p></div>
        <button className="gxc-text-link gxc-shotflow-demo-link" onClick={visitDemo}>{t('Try the workflow')}<ArrowDown size={17}/></button>
      </div>
    </section>
    <section ref={demo} className="gxc-shotflow-walkthrough" aria-labelledby="gxc-shotflow-demo-title">
      <header className="gxc-shotflow-step"><h3 ref={demoHeading} id="gxc-shotflow-demo-title" tabIndex={-1}>{t('From a video to its shots.')}</h3></header>
      <ShotFlowDemo active={active} preview={<div ref={slot} className="gxc-shotflow-screen"><StudyImage study={screens[0]} onZoom={onZoom}/></div>}/>
    </section>
    <ol className="gxc-shotflow-flow gxc-shotflow-overview-flow" aria-label={t('From reference video to a shooting plan')}>{['Add a reference', 'On-device AI analysis', 'Explore the shots', 'Bring it on set'].map((step, i) => <li key={step}><span>{t(step)}</span>{i < 3 && <ArrowRight size={20} aria-hidden="true"/>}</li>)}</ol>
    <section className="gxc-shotflow-row" aria-labelledby="gxc-shotflow-import-title">
      <div className="gxc-shotflow-step">
        <span className="gxc-mono">{t('01 / ADD A REFERENCE')}</span><h3 id="gxc-shotflow-import-title">{t('Begin with the video.')}</h3>
        <p>{t('The starting point is a reference worth studying. Create a project and choose a video from Photos. Once the video is imported, analysis begins within the same flow. The project gives the resulting shots a place to belong, keeping them connected to the material that prompted the shoot.')}</p>
        <p>{t('A source is useful beyond its first import. Its name and original sequence remain available as the project grows, so a shot can always be understood in context. Several reference videos can belong to one project without losing their identities. This walkthrough follows one complete reference through that process.')}</p>
      </div>
      <div className="gxc-shotflow-screen"><StudyImage study={screens[4]} onZoom={onZoom} phoneFrame/></div>
    </section>
    <section className="gxc-shotflow-review" aria-labelledby="gxc-shotflow-analysis-title">
      <div className="gxc-shotflow-step">
        <span className="gxc-mono">{t('02 / AUTOMATIC ANALYSIS')}</span><h3 id="gxc-shotflow-analysis-title">{t('Let the shots emerge.')}</h3>
        <p>{t('ShotFlow runs a pretrained TransNet V2 model locally on iPhone through Core ML. Its weights are converted to Core ML FP16; inference and ShotFlow’s post-processing turn boundary predictions into time-aligned segments. Each shot keeps its original video, timing and visual reference.')}</p>
        <p>{t('My contribution is the model integration and the product workflow around its output. Apple Vision, optical flow and local rules support the separate framing and camera-motion suggestions. Users can review and adjust the detected shots before taking the plan on set.')}</p>
        <p>{t('The analysis screen keeps that work visible and attached to its source. After it finishes, the workspace brings the source video and generated shot count together. The example above uses the actual output from the entire reference; its recorded waiting time is shortened only for the web walkthrough.')}</p>
        <p className="gxc-shotflow-tags gxc-mono">{item.tags.join(' / ')}</p>
      </div>
      <div className="gxc-shotflow-screen"><StudyImage study={screens[1]} onZoom={onZoom} phoneFrame/></div>
    </section>
    <section className="gxc-shotflow-row" aria-labelledby="gxc-shotflow-results-title">
      <div className="gxc-shotflow-step">
        <span className="gxc-mono">{t('THE GENERATED STORYBOARD')}</span><h3 id="gxc-shotflow-results-title">{t('See the structure in the reference.')}</h3>
        <p>{t('The storyboard makes the result readable as a whole. Source grouping preserves the order and context of the original video, while each row brings the shot’s timing and information close to its image. Scroll the sequence, compare neighboring shots and choose a moment to look at more closely.')}</p>
        <p>{t('A separate shooting-order view lets the project serve practical preparation across references. This recorded build demonstrates automatic shot boundaries; shot size, camera movement and lens suggestions remain unconfirmed. When a boundary needs correction, optional manual adjustment can refine the selected range while retaining the original video.')}</p>
      </div>
      <div className="gxc-shotflow-screen"><StudyImage study={screens[2]} onZoom={onZoom} phoneFrame/></div>
    </section>
    <section className="gxc-shotflow-review" aria-labelledby="gxc-shotflow-playback-title">
      <div className="gxc-shotflow-step">
        <span className="gxc-mono">{t('03 / REVIEW & USE')}</span><h3 id="gxc-shotflow-playback-title">{t('Understand how a shot unfolds.')}</h3>
        <p>{t('A thumbnail helps identify a shot; playback reveals its movement and rhythm. Open an individual segment to study the original footage at the boundaries produced by the analysis. Returning to the list keeps the surrounding sequence within reach, making it easy to connect one camera decision with the next.')}</p>
        <p>{t('The guided example offers three consecutive shots for playback and a small checklist to try. Their images, timing and original audio come from the same reference video used for the analysis. Sound starts muted and can be enabled when you choose.')}</p>
      </div>
      <div className="gxc-shotflow-screen"><StudyImage study={screens[3]} onZoom={onZoom} phoneFrame/></div>
    </section>
    <section className="gxc-shotflow-onset gxc-shotflow-row" aria-labelledby="gxc-shotflow-onset-title">
      <div className="gxc-shotflow-step">
        <span className="gxc-mono">{t('FROM REFERENCE TO SHOOT')}</span><h3 id="gxc-shotflow-onset-title">{t('Keep the plan beside the camera.')}</h3>
        <p>{t('On set, the phone becomes a reference and checklist beside the professional camera. Review the current shot, prepare the framing and movement, then mark it complete after filming. The next unfinished shot comes forward, connecting the reference studied earlier with the work still ahead.')}</p>
        <ol className="gxc-shotflow-onset-steps" aria-label={t('On-set workflow')}>{['Review', 'Shoot', 'Mark complete', 'Next shot'].map((step, i) => <li key={step}><span>{t(step)}</span>{i < 3 && <ArrowRight size={15} aria-hidden="true"/>}</li>)}</ol>
      </div>
      <div className="gxc-shotflow-screen"><StudyImage study={screens[5]} onZoom={onZoom} phoneFrame/></div>
    </section>
    <aside className="gxc-shotflow-status"><span className="gxc-mono">{t('IN DEVELOPMENT')}</span><p>{t('English interfaces captured from the native development app, using a prepared project and a user-supplied reference video. The walkthrough connects real captures, recorded analysis and its generated results. Analysis is prepared in advance; the website does not process uploads or run the iOS app. Playback subtitles are omitted for clarity; original audio and shot boundaries are retained. Earlier demonstration captures remain archived.')}</p></aside>
  </div>;
}

function ProjectDialog({ project, brandFromHome, onHome, entrySource, source, instant, onClose, onLock, onPrepareRestore, onRestored, onOpen }: { project: PortfolioProject | null; brandFromHome: boolean; onHome(e: MouseEvent<HTMLAnchorElement>): void; entrySource: 'hero' | 'work'; source: Rect | null; instant: boolean; onClose(): void; onLock(): void; onPrepareRestore(): Promise<void>; onRestored(): void; onOpen(e: MouseEvent<HTMLAnchorElement>, item: PortfolioProject): void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const slot = useRef<HTMLDivElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const latest = useRef(project); latest.current = project;
  const callbacks = useRef({ onRestored, onLock, onPrepareRestore }); callbacks.current = { onRestored, onLock, onPrepareRestore };
  const [shown, setShown] = useState<PortfolioProject | null>(project);
  const [target, setTarget] = useState<Rect | null>(null);
  const [morph, setMorph] = useState(!!source);
  const [zoom, setZoom] = useState<Study | null>(null);
  const identity = useRef<string | null>(null);
  const progress = useMotionValue(0);
  const opacity = useTransform(progress, [0, .24, 1], [0, 1, 1]);
  const contentOpacity = useTransform(progress, [0, .55, 1], [0, 0, 1]);
  const cloneOpacity = useTransform(progress, [0, .985, 1], [1, 1, 0]);
  // The source card contains slide typography; fade it into the separately
  // exported hero artwork before the case copy finishes appearing.
  const harvardCloneOpacity = useTransform(progress, [0, .55, .85, 1], [1, 1, 0, 0]);
  const introBackground = useTransform(progress, [0, 1], ['#d6d7d7', '#0b0d10']);
  const x = useTransform(progress, p => source && target ? source.x + (target.x - source.x) * p : 0);
  const y = useTransform(progress, p => source && target ? source.y + (target.y - source.y) * p : 0);
  // Resize the isolated image frame so object-fit preserves portrait proportions.
  const coverWidth = useTransform(progress, p => source && target ? source.width + (target.width - source.width) * p : 0);
  const coverHeight = useTransform(progress, p => source && target ? source.height + (target.height - source.height) * p : 0);
  useLayoutEffect(() => {
    if (!project && !dialog.current?.open) return;
    if (project) {
      if (!dialog.current?.open) { dialog.current?.showModal(); callbacks.current.onLock(); setMorph(!!source && !instant); }
      if (identity.current !== project.slug) {
        if (identity.current) setMorph(false);
        identity.current = project.slug;
        setShown(project); setZoom(null); if (scroller.current) scroller.current.scrollTop = 0;
      }
    }
    let cancelled = false;
    let control: ReturnType<typeof animate> | undefined;
    const transition = async () => {
      if (!project) {
        setZoom(null);
        if ((scroller.current?.scrollTop ?? 0) > 1) setMorph(false);
        try { await callbacks.current.onPrepareRestore(); } catch { /* DOM media remains the fallback. */ }
        if (cancelled) return;
      }
      control = animate(progress, project ? 1 : 0, instant ? { duration: 0 } : visual.motion.spring);
      if (!project) {
        await control;
        if (!cancelled && !latest.current) { dialog.current?.close(); identity.current = null; setShown(null); callbacks.current.onRestored(); }
      }
    };
    void transition();
    return () => { cancelled = true; control?.stop(); };
  }, [project, instant, progress]);
  useLayoutEffect(() => {
    if (!shown) return;
    // Dedicated cases transition into the image itself, excluding caption and copy.
    const media = shown.video ? slot.current : ['shotflow', 'introme'].includes(shown.slug) || harvardCase(shown.slug) ? slot.current?.querySelector('button') : slot.current;
    const measure = () => { const r = media?.getBoundingClientRect(); if (r) setTarget({ x: r.x, y: r.y, width: r.width, height: r.height }); };
    measure(); const observer = new ResizeObserver(measure); if (media) observer.observe(media);
    heading.current?.focus({ preventScroll: true });
    const resize = () => setMorph(false); window.addEventListener('resize', resize);
    return () => { observer.disconnect(); window.removeEventListener('resize', resize); };
  }, [shown]);
  const studies: Study[] = shown ? [...((galleries as Record<string, Study[]>)[shown.slug] ?? []), ...(shown.gallery ?? [])] : [];
  const next = shown ? workProjects[(workProjects.indexOf(shown) + 1) % workProjects.length] : workProjects[0];
  const harvard = shown ? harvardCase(shown.slug) : undefined;
  return createPortal(<dialog ref={dialog} className="gxc-detail-dialog" data-harvard={harvard?.slug} data-film={shown?.video ? shown.slug : undefined} aria-labelledby="gxc-detail-title" onCancel={e => { e.preventDefault(); if (zoom) setZoom(null); else onClose(); }}>
    <motion.div className="gxc-detail-bg" style={{ opacity }}/>
    {shown && <div ref={scroller} className="gxc-detail-scroll" data-native-scroll>
      <motion.div className="gxc-detail-toolbar" style={{ opacity }}><button onClick={onClose} aria-label={t(entrySource === 'hero' ? 'Back to home' : 'Back to work')}><ArrowLeft size={17}/><span className="gxc-back-full">{t(entrySource === 'hero' ? 'Back to home' : 'Back to work')}</span><span className="gxc-back-short" aria-hidden="true">{t('Back')}</span></button><button onClick={onClose} aria-label={t('Close project')}><X size={20}/></button></motion.div>
      <motion.article className="gxc-detail-content" style={{ opacity: contentOpacity }}>
        {shown.slug === 'shotflow' ? <ShotFlowCase item={shown} heading={heading} slot={slot} onZoom={setZoom} active={project?.slug === 'shotflow' && !zoom}/> : shown.slug === 'introme' ? <IntroMeCase item={shown} heading={heading} slot={slot} renderStudy={study => <StudyImage study={study} onZoom={setZoom}/>} instant={instant} active={project?.slug === 'introme' && !zoom}/> : harvard ? <HarvardCase data={harvard} heading={heading} slot={slot} renderStudy={study => <StudyImage study={study} onZoom={setZoom}/>}/> : shown.video ? <FilmCase key={shown.slug} item={shown} heading={heading} slot={slot} active={project?.slug === shown.slug && !zoom} instant={instant} studies={studies} renderStudy={study => <StudyImage study={study} onZoom={setZoom}/>}/> : <>
        <header className="gxc-detail-heading"><span className="gxc-mono">{shown.category}</span><h2 ref={heading} id="gxc-detail-title" tabIndex={-1}>{shown.title}</h2><p>{shown.summary}</p></header>
        <div ref={slot} className={'gxc-detail-cover cover-' + shown.slug} data-fit={shown.imageFit ?? 'cover'}><img src={shown.image} alt={shown.imageAlt} width={shown.imageWidth} height={shown.imageHeight}/></div>
        <div className="gxc-detail-overview"><aside><span className="gxc-mono">{t('PROJECT OVERVIEW')}</span>{shown.role && <p><small>{t('ROLE')}</small>{shown.role}</p>}{shown.period && <p><small>{t('PERIOD')}</small>{shown.period}</p>}<p><small>{t('EXPLORING')}</small>{shown.tags.join(' / ')}</p></aside><div>{shown.overview.map(text => <p key={text}>{text}</p>)}{shown.externalLinks.length > 0 && <div className="gxc-material-links">{shown.externalLinks.map(link => <a key={link.url} className="gxc-text-link" href={link.url} target="_blank" rel="noreferrer">{link.label}<ArrowUpRight size={17}/></a>)}</div>}</div></div>
        <div className="gxc-detail-highlights">{shown.highlights.map((h, i) => <section key={h.title}><span className="gxc-mono">{number(i)}</span><h3>{h.title}</h3><p>{h.body}</p></section>)}</div>{studies.length > 0 && <div className="gxc-studies"><div className="gxc-studies-heading"><span className="gxc-mono">{t('PROCESS & DESIGN STUDIES')}</span><h3>{t('A closer look.')}</h3></div>{studies.map(study => <StudyImage study={study} key={study.image} onZoom={setZoom}/>)}</div>}
        </>}
        {shown.liveDemo && <div className="gxc-live-status"><span className="gxc-mono">{t('LIVE EXPERIENCE')}</span><p>{shown.liveDemo.description}</p></div>}
        <a className="gxc-next-project" href={'#/work/' + next.slug} onClick={e => onOpen(e, next)}><div><span className="gxc-mono">{t('NEXT EXPLORATION')}</span><h3>{next.title}</h3></div><ArrowRight size={38}/></a>
      </motion.article>
      {morph && target && source && <motion.div className={'gxc-transition-cover cover-' + shown.slug} data-fit={shown.imageFit ?? 'cover'} style={{ x, y, width: coverWidth, height: coverHeight, opacity: harvard ? harvardCloneOpacity : cloneOpacity, backgroundColor: shown.slug === 'introme' ? introBackground : undefined }}><img src={shown.slug === 'shotflow' ? shotFlowCaseCover.image : shown.slug === 'introme' ? introMeMedia.portrait.image : shown.image} alt=""/></motion.div>}
    </div>}
    {shown && <DetailBrand progress={progress} entering={!!project} fromHome={brandFromHome} onHome={onHome} />}
    <ZoomImage study={zoom} close={() => setZoom(null)} phoneFrame={shown?.slug === 'shotflow' && shotFlowCaseScreens.some(screen => screen.image === zoom?.image)} theme={harvard?.slug}/>
  </dialog>, document.body);
}
function StudyImage({ study, onZoom, phoneFrame = false }: { study: Study; onZoom(study: Study): void; phoneFrame?: boolean }) {
  const image = <button onClick={event => { event.currentTarget.focus({ preventScroll: true }); onZoom(study); }} aria-label={t('Enlarge: ') + study.caption}><img src={study.image} srcSet={study.srcSet} sizes={study.sizes} alt={study.alt} width={study.width} height={study.height} loading={study.loading ?? 'lazy'} decoding="async"/></button>;
  return <figure className="gxc-study">{phoneFrame ? <ShotFlowPhoneFrame>{image}</ShotFlowPhoneFrame> : image}<figcaption>{study.caption}</figcaption></figure>;
}
function ZoomImage({ study, close, phoneFrame = false, theme }: { study: Study | null; close(): void; phoneFrame?: boolean; theme?: string }) {
  const ref = useRef<HTMLDialogElement>(null);
  const viewport = useRef<HTMLDivElement>(null);
  const [actualSize, setActualSize] = useState(false);
  useLayoutEffect(() => { setActualSize(false); }, [study]);
  useLayoutEffect(() => { if (study) ref.current?.showModal(); else ref.current?.close(); }, [study]);
  return <dialog ref={ref} className="gxc-zoom" data-shotflow={phoneFrame || undefined} data-harvard={theme} aria-label={t('Full size project image')} onCancel={e => { e.preventDefault(); close(); }}><button className="gxc-zoom-close" onClick={close} aria-label={t('Close image')}><X/></button>{study && <>{theme ? <><button className="hc-zoom-size" aria-pressed={actualSize} onClick={() => { setActualSize(value => !value); viewport.current?.scrollTo(0, 0); }}>{t(actualSize ? 'Fit image' : 'Actual size')}</button><div ref={viewport} className="hc-zoom-viewport" data-actual-size={actualSize || undefined} tabIndex={0} role="region" aria-label={t('Image detail, scroll to explore')}><img src={study.image} alt={study.alt} width={study.width} height={study.height}/></div></> : phoneFrame ? <ShotFlowPhoneFrame><img src={study.image} alt={study.alt}/></ShotFlowPhoneFrame> : <img src={study.image} alt={study.alt}/>}<p>{study.caption}</p></>}</dialog>;
}
