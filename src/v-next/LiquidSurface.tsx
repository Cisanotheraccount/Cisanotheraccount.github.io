import { useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode, type RefObject } from 'react';
import { MaterialFilterContents } from './vendor/simple-liquid-glass/MaterialFilter';
import { createLensMapGenerator } from './vendor/simple-liquid-glass/displacement';
import { uiGlass } from './uiGlassConfig';
import { observeLiquidContrast } from './liquidContrast';

type Lens = { width: number; height: number; radius: number; map: string; revision: number };
const emptyLens: Lens = { width: 0, height: 0, radius: 0, map: '', revision: 0 };

// CSS.supports accepts url() even where backdrop SVG filters are not rendered.
// Keep that unsupported branch explicit instead of silently losing all blur.
function supportsBackdropRefraction() {
  return /(?:Chrome|Chromium|Edg|OPR)\//.test(navigator.userAgent)
    && !/(?:CriOS|EdgiOS|OPiOS)/.test(navigator.userAgent)
    && CSS.supports('backdrop-filter', 'url("#gxc-capability")')
    && !new URLSearchParams(location.search).has('no-refraction');
}

/** Returns material children that must be rendered inside the target itself.
 * For a native dialog, this keeps the filter in the same top-layer subtree.
 * Resize/visibility changes rebuild the map; pointer events only move CSS light.
 */
export function useLiquidSurface(ref: RefObject<HTMLDivElement | null>, visible = true, expanded = false): ReactNode {
  const id = 'gxc-lens-' + useId().replace(/:/g, '');
  const [lens, setLens] = useState<Lens>(emptyLens);
  const [supported] = useState(supportsBackdropRefraction);
  const refreshRef = useRef<() => void>(() => undefined);
  const feImageRef = useRef<SVGFEImageElement>(null);

  useLayoutEffect(() => {
    const el = ref.current; if (!el) return;
    el.classList.add('gxc-liquid-surface');
    el.dataset.glass = supported ? 'refraction' : 'frosted';
    el.dataset.liquidKind = expanded ? 'menu' : 'nav';
    el.style.setProperty('--liquid-press-scale', String(uiGlass.pressScale));
    el.style.setProperty('--liquid-press-duration', uiGlass.pressDuration + 'ms');
    const generator = supported ? createLensMapGenerator(uiGlass.mapSize) : null;
    let previous = '', revision = 0;
    const measure = () => {
      // Layout dimensions ignore an in-flight press/menu transform.
      const width = el.offsetWidth, height = el.offsetHeight;
      if (width < 1 || height < 1) return;
      const radius = Math.min(parseFloat(getComputedStyle(el).borderTopLeftRadius) || 0, Math.min(width, height) / 2);
      const key = [width, height, radius, expanded].join(':');
      if (key === previous) return;
      previous = key;
      const map = generator?.generate({
        lensHalfWidth: width / 2, lensHalfHeight: height / 2, borderRadius: radius,
        depth: uiGlass.depth, clipToShape: true, softEdge: true,
        curvature: uiGlass.curvature, bend: uiGlass.bend, bendWidth: uiGlass.bendWidth,
        sheen: uiGlass.sheen, sheenWidth: uiGlass.sheenWidth, sheenAngle: uiGlass.sheenAngle,
        sheenFalloff: uiGlass.sheenFalloff, glow: uiGlass.glow,
        glowSpread: uiGlass.glowSpread, glowFalloff: uiGlass.glowFalloff,
      }) ?? '';
      revision += 1;
      el.dataset.liquidMapRevision = String(revision);
      setLens({ width, height, radius, map, revision });
    };
    refreshRef.current = measure;
    measure();
    const observer = new ResizeObserver(measure); observer.observe(el);
    return () => { observer.disconnect(); generator?.dispose(); refreshRef.current = () => undefined; };
  }, [ref, expanded, supported]);

  useLayoutEffect(() => {
    if (!visible) return;
    // showModal() happens in the owner's following layout effect.
    const frame = requestAnimationFrame(() => refreshRef.current());
    return () => cancelAnimationFrame(frame);
  }, [visible]);

  useEffect(() => {
    const el = ref.current; if (!el) return;
    const light = el.querySelector<HTMLElement>('.gxc-liquid-light');
    const ripple = el.querySelector<HTMLElement>('.gxc-liquid-ripple');
    const indicator = el.querySelector<HTMLElement>('.gxc-liquid-indicator');
    const fine = matchMedia('(hover: hover) and (pointer: fine)');
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    let rippleAnimation: Animation | null = null;
    const stopContrast = observeLiquidContrast(el);
    const motionEnabled = () => !reduced.matches && !el.closest('[data-motion="reduced"]');
    const coordinates = (event: PointerEvent) => {
      const rect = el.getBoundingClientRect();
      return { x: (event.clientX - rect.left) * el.offsetWidth / rect.width, y: (event.clientY - rect.top) * el.offsetHeight / rect.height };
    };
    const move = (event: PointerEvent) => {
      if (!light || !fine.matches || !motionEnabled()) return;
      const { x, y } = coordinates(event);
      light.style.transform = `translate3d(${x - 90}px, ${y - 90}px, 0)`;
      light.style.opacity = '1';
    };
    const leave = () => { if (light) light.style.opacity = '0'; };
    const press = (event: PointerEvent) => {
      if (!ripple || !motionEnabled() || event.button !== 0) return;
      const { x, y } = coordinates(event);
      ripple.style.left = x + 'px'; ripple.style.top = y + 'px';
      rippleAnimation?.cancel();
      rippleAnimation = ripple.animate([
        { opacity: 0, transform: 'translate(-50%, -50%) scale(.25)' },
        { opacity: .46, offset: .18, transform: 'translate(-50%, -50%) scale(.55)' },
        { opacity: 0, transform: 'translate(-50%, -50%) scale(1.6)' },
      ], { duration: uiGlass.rippleDuration, easing: 'cubic-bezier(.23,1,.32,1)' });
    };
    const select = () => {
      if (!indicator) return;
      const link = el.querySelector<HTMLElement>('nav a[aria-current]');
      const nav = el.querySelector<HTMLElement>('nav');
      if (!link || !nav || !nav.offsetWidth) { indicator.style.opacity = '0'; return; }
      indicator.style.transitionDuration = motionEnabled() ? uiGlass.selectionDuration + 'ms' : '0ms';
      indicator.style.width = link.offsetWidth + 'px'; indicator.style.height = link.offsetHeight + 'px';
      indicator.style.transform = `translate3d(${nav.offsetLeft + link.offsetLeft}px, ${nav.offsetTop + link.offsetTop}px, 0)`;
      indicator.style.opacity = '1';
    };
    const mutations = new MutationObserver(select);
    mutations.observe(el, { attributes: true, subtree: true, attributeFilter: ['aria-current'] });
    const resize = new ResizeObserver(select); resize.observe(el);
    select();
    el.addEventListener('pointermove', move); el.addEventListener('pointerleave', leave);
    el.addEventListener('pointerdown', press); window.addEventListener('blur', leave);
    const hidden = () => { if (document.hidden) { leave(); rippleAnimation?.cancel(); } };
    document.addEventListener('visibilitychange', hidden);
    return () => {
      mutations.disconnect(); resize.disconnect(); rippleAnimation?.cancel();
      stopContrast();
      el.removeEventListener('pointermove', move); el.removeEventListener('pointerleave', leave);
      el.removeEventListener('pointerdown', press); window.removeEventListener('blur', leave);
      document.removeEventListener('visibilitychange', hidden);
    };
  }, [ref]);

  const ready = supported && !!lens.map;
  const blur = ready ? (expanded ? uiGlass.menuBlur : uiGlass.blur) : uiGlass.fallbackBlur;
  const backdrop = `blur(${blur}px) ${ready ? `url("#${id}") ` : ''}saturate(${uiGlass.saturation})`;
  const displacement = Math.hypot(lens.width, lens.height) * (expanded ? uiGlass.menuStrength : uiGlass.strength);
  const margin = Math.ceil(displacement + blur * 3 + 2);
  return <>
    <svg className="gxc-liquid-defs" aria-hidden="true" width="0" height="0" focusable="false">
      {ready && <defs><filter id={id} x={-margin} y={-margin} width={lens.width + margin * 2} height={lens.height + margin * 2} filterUnits="userSpaceOnUse" primitiveUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
        <MaterialFilterContents dispScale={displacement} dispersion={uiGlass.dispersion} specular={uiGlass.specular} hasSpecular mapMatrix={null} width={lens.width} height={lens.height} mapUrl={lens.map} feImageRef={feImageRef}/>
      </filter></defs>}
    </svg>
    <span className="gxc-liquid-optics" aria-hidden="true" style={{ backdropFilter: backdrop, WebkitBackdropFilter: backdrop } as CSSProperties}/>
    <span className="gxc-liquid-feedback" aria-hidden="true"><i className="gxc-liquid-light"/><i className="gxc-liquid-ripple"/></span>
    {!expanded && <span className="gxc-liquid-indicator" aria-hidden="true"/>}
  </>;
}

export function GlassNav({ children, className = '' }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const material = useLiquidSurface(ref);
  return <div ref={ref} className={'gxc-glass gxc-liquid-surface ' + className} data-glass="frosted">{material}{children}</div>;
}
