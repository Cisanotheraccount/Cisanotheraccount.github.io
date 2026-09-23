import { useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { MaterialFilterContents } from './vendor/simple-liquid-glass/MaterialFilter';
import './photographyBrand.css';

const logo = new URL('./assets/logo.svg', import.meta.url).href;
const normalMap = new URL('./assets/logo-optics.png', import.meta.url).href;
const silhouette = new URL('./assets/logo-mask.png', import.meta.url).href;
const highlight = new URL('./assets/logo-highlight.png', import.meta.url).href;

let assetsReady: Promise<void> | undefined;

function prepareOptics() {
  return assetsReady ??= Promise.all([normalMap, silhouette, highlight].map(src => new Promise<void>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve();
    image.onerror = () => reject(new Error('Photography logo optics unavailable'));
    image.src = src;
  }))).then(() => undefined);
}

function supportsBackdropRefraction() {
  return /(?:Chrome|Chromium|Edg|OPR)\//.test(navigator.userAgent)
    && !/(?:CriOS|EdgiOS|OPiOS)/.test(navigator.userAgent)
    && CSS.supports('backdrop-filter', 'url("#photo-logo-capability")')
    && !new URLSearchParams(location.search).has('no-refraction');
}

export function PhotographyBrand({ subtitle }: { subtitle: string }) {
  const mark = useRef<HTMLSpanElement>(null);
  const feImage = useRef<SVGFEImageElement>(null);
  const filterId = `photo-logo-lens-${useId().replace(/:/g, '')}`;
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [refracts] = useState(supportsBackdropRefraction);
  const [size, setSize] = useState({ width: 1, height: 1 });

  useEffect(() => {
    let alive = true;
    void prepareOptics().then(() => {
      if (alive) setReady(true);
    }).catch(() => {
      if (alive) setFailed(true);
    });
    return () => { alive = false; };
  }, []);

  useLayoutEffect(() => {
    const element = mark.current;
    if (!element) return;
    const measure = () => {
      const { width, height } = element.getBoundingClientRect();
      if (width > 0 && height > 0) {
        setSize(previous => previous.width === width && previous.height === height ? previous : { width, height });
      }
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const element = mark.current;
    const link = element?.closest('a');
    if (!element || !link) return;
    const fine = matchMedia('(hover: hover) and (pointer: fine)');
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    const move = (event: PointerEvent) => {
      if (!fine.matches || reduced.matches) return;
      const box = link.getBoundingClientRect();
      element.style.setProperty('--photo-logo-light-x', `${15 + Math.max(0, Math.min(1, (event.clientX - box.left) / box.width)) * 70}%`);
      element.style.setProperty('--photo-logo-light-y', `${Math.max(0, Math.min(100, (event.clientY - box.top) / box.height * 100))}%`);
    };
    const leave = () => {
      element.style.removeProperty('--photo-logo-light-x');
      element.style.removeProperty('--photo-logo-light-y');
    };
    link.addEventListener('pointermove', move);
    link.addEventListener('pointerleave', leave);
    return () => {
      link.removeEventListener('pointermove', move);
      link.removeEventListener('pointerleave', leave);
    };
  }, []);

  const scale = size.height * .3;
  const margin = Math.ceil(scale + 3);
  const filter = `blur(.2px) ${ready && refracts ? `url("#${filterId}") ` : ''}saturate(1.04)`;
  const style = {
    '--photo-logo-mask': `url("${silhouette}")`,
    '--photo-logo-highlight': `url("${highlight}")`,
  } as CSSProperties;

  return <span className="photo-brand-content" data-logo-state={failed ? 'fallback' : ready ? 'ready' : 'loading'}>
    <span className="photo-brand-lockup">
      <span ref={mark} className="photo-brand-logo" aria-hidden="true" data-live-glass={ready} data-glass-material={ready ? (refracts ? 'refraction' : 'translucent') : undefined}>
        <img src={logo} alt="" width="1160" height="1040" />
        <span className="photo-brand-logo-live" data-ready={ready} data-refraction={refracts} style={style}>
          <svg className="photo-brand-logo-defs" aria-hidden="true" width="0" height="0" focusable="false">
            {ready && refracts && <defs><filter id={filterId} x={-margin} y={-margin} width={size.width + 2 * margin} height={size.height + 2 * margin}
              filterUnits="userSpaceOnUse" primitiveUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
              <MaterialFilterContents dispScale={-scale} dispersion={.08} specular={0} hasSpecular={false} mapMatrix={null}
                width={size.width} height={size.height} mapUrl={normalMap} feImageRef={feImage} />
            </filter></defs>}
          </svg>
          <span className="photo-brand-logo-optics" style={{ backdropFilter: filter, WebkitBackdropFilter: filter }} />
          <span className="photo-brand-logo-highlight" />
        </span>
      </span>
      <span className="photo-brand-text">GALA X CI</span>
    </span>
    <span className="photo-brand-sub">{subtitle}</span>
  </span>;
}
