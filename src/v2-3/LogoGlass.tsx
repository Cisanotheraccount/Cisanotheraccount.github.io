import { useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { useEntryPhase } from './entry';
import { MaterialFilterContents } from './vendor/simple-liquid-glass/MaterialFilter';
import normalMap from './assets/logo-optics.png';
import silhouette from './assets/logo-mask.png';
import highlight from './assets/logo-highlight.png';
import './logoGlass.css';

let assetsReady: Promise<void> | undefined;
function prepareOptics() {
  return assetsReady ??= Promise.all([normalMap, silhouette, highlight].map(src => new Promise<void>((resolve, reject) => {
    const image = new Image(); image.onload = () => resolve(); image.onerror = () => reject(new Error('Logo optics unavailable')); image.src = src;
  }))).then(() => undefined);
}

/** The compositor samples the real backdrop; the rounded mesh supplies only its optical field. */
export function LogoGlass() {
  const host = useRef<HTMLSpanElement>(null), image = useRef<SVGFEImageElement>(null);
  const id = 'gxc-logo-lens-' + useId().replace(/:/g, '');
  const phase = useEntryPhase();
  const [ready, setReady] = useState(false);
  const [size, setSize] = useState({ width: 1, height: 1 });
  const [refracts] = useState(() => /(?:Chrome|Chromium|Edg|OPR)\//.test(navigator.userAgent)
    && !/(?:CriOS|EdgiOS|OPiOS)/.test(navigator.userAgent)
    && CSS.supports('backdrop-filter', 'url("#gxc-logo-capability")')
    && !new URLSearchParams(location.search).has('no-refraction'));
  useEffect(() => {
    let alive = true;
    void prepareOptics().then(() => { if (alive) setReady(true); }).catch(() => { /* Keep the original SVG if optical assets fail. */ });
    return () => { alive = false; };
  }, []);
  useLayoutEffect(() => {
    const slot = host.current?.parentElement; if (!slot) return;
    const measure = () => {
      const { width, height } = slot.getBoundingClientRect();
      if (width > 0 && height > 0) setSize(previous => previous.width === width && previous.height === height ? previous : { width, height });
    };
    measure(); const observer = new ResizeObserver(measure); observer.observe(slot);
    return () => observer.disconnect();
  }, []);
  const live = phase === 'complete' && ready;
  useLayoutEffect(() => {
    const slot = host.current?.parentElement; if (!slot) return;
    slot.dataset.liveGlass = String(live);
    if (live) slot.dataset.glassMaterial = refracts ? 'refraction' : 'translucent';
    return () => { delete slot.dataset.liveGlass; delete slot.dataset.glassMaterial; };
  }, [live, refracts]);
  useEffect(() => {
    const el = host.current, link = el?.closest('a'); if (!el || !link) return;
    const fine = matchMedia('(hover: hover) and (pointer: fine)'), reduced = matchMedia('(prefers-reduced-motion: reduce)');
    const move = (event: PointerEvent) => {
      if (!fine.matches || reduced.matches || document.querySelector('.gxc-site[data-motion="reduced"]')) return;
      const box = link.getBoundingClientRect();
      el.style.setProperty('--logo-light-x', `${15 + Math.max(0, Math.min(1, (event.clientX - box.left) / box.width)) * 70}%`);
      el.style.setProperty('--logo-light-y', `${Math.max(0, Math.min(100, (event.clientY - box.top) / box.height * 100))}%`);
    };
    const leave = () => { el.style.removeProperty('--logo-light-x'); el.style.removeProperty('--logo-light-y'); };
    link.addEventListener('pointermove', move); link.addEventListener('pointerleave', leave);
    return () => { link.removeEventListener('pointermove', move); link.removeEventListener('pointerleave', leave); };
  }, []);
  const scale = size.height * .3, margin = Math.ceil(scale + 3);
  const filter = `blur(.2px) ${refracts ? `url("#${id}") ` : ''}saturate(1.04)`;
  const style = { '--logo-mask': `url("${silhouette}")`, '--logo-highlight': `url("${highlight}")` } as CSSProperties;
  return <span ref={host} className="gxc-logo-live" data-ready={live} data-refraction={refracts} style={style}>
    <svg className="gxc-logo-defs" aria-hidden="true" width="0" height="0" focusable="false">
      {ready && refracts && <defs><filter id={id} x={-margin} y={-margin} width={size.width + 2 * margin} height={size.height + 2 * margin}
        filterUnits="userSpaceOnUse" primitiveUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
        <MaterialFilterContents dispScale={-scale} dispersion={.08} specular={0} hasSpecular={false} mapMatrix={null}
          width={size.width} height={size.height} mapUrl={normalMap} feImageRef={image}/>
      </filter></defs>}
    </svg>
    <span className="gxc-logo-optics" style={{ backdropFilter: filter, WebkitBackdropFilter: filter }}/>
    <span className="gxc-logo-highlight"/>
  </span>;
}
