import {
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent,
} from 'react';
import { MaterialFilterContents } from './vendor/simple-liquid-glass/MaterialFilter';
import { createLensMapGenerator } from './vendor/simple-liquid-glass/displacement';
import { photographyText as t } from '../localization/photography';
import './glass.css';

export type PhotographyGlassCategory = 'landscape' | 'concert' | 'video';

export type GlassCategoryNavProps<Category extends string> = {
  active: Category;
  items: readonly { id: Category; label: string }[];
  hidden?: boolean;
  onNavigate: (category: Category, keyboard: boolean) => void;
};

type Lens = {
  width: number;
  height: number;
  map: string;
};

const emptyLens: Lens = { width: 0, height: 0, map: '' };

// This is the same capability boundary used by the 2.3 interface glass. CSS
// accepts url() more broadly than browsers actually render SVG backdrop filters.
function supportsBackdropRefraction() {
  return /(?:Chrome|Chromium|Edg|OPR)\//.test(navigator.userAgent)
    && !/(?:CriOS|EdgiOS|OPiOS)/.test(navigator.userAgent)
    && CSS.supports('backdrop-filter', 'url("#photo-glass-capability")')
    && !new URLSearchParams(location.search).has('no-refraction');
}

const glass = {
  mapSize: 512,
  blur: 0.75,
  fallbackBlur: 4,
  saturation: 1.08,
  strength: 0.092,
  dispersion: 0.035,
  depth: 0.88,
  curvature: 0.3,
  bend: 0.68,
  bendWidth: 0.38,
  sheen: 0.6,
  sheenWidth: 1.8,
  sheenAngle: 125,
  sheenFalloff: 1.65,
  glow: 0.045,
  glowSpread: 0.4,
  glowFalloff: 1.6,
  specular: 0.82,
} as const;

export function GlassCategoryNav<Category extends string>({ active, items, hidden = false, onNavigate }: GlassCategoryNavProps<Category>) {
  const surfaceRef = useRef<HTMLElement>(null);
  const scrollerRef = useRef<HTMLSpanElement>(null);
  const linksRef = useRef<HTMLSpanElement>(null);
  const indicatorRef = useRef<HTMLSpanElement>(null);
  const feImageRef = useRef<SVGFEImageElement>(null);
  const filterId = `photo-glass-${useId().replace(/:/g, '')}`;
  const [supported] = useState(supportsBackdropRefraction);
  const [lens, setLens] = useState<Lens>(emptyLens);

  // Move only this horizontal scroller, never the page or an inactive photo panel.
  const revealLink = (link: HTMLAnchorElement) => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const left = link.offsetLeft;
    const right = left + link.offsetWidth;
    if (left < scroller.scrollLeft) scroller.scrollLeft = left;
    else if (right > scroller.scrollLeft + scroller.clientWidth) {
      scroller.scrollLeft = right - scroller.clientWidth;
    }
  };

  useLayoutEffect(() => {
    const scroller = scrollerRef.current;
    const links = linksRef.current;
    const indicator = indicatorRef.current;
    if (!scroller || !links || !indicator || hidden) return;
    let disposed = false;
    const measure = () => {
      if (disposed) return;
      const selected = links.querySelector<HTMLAnchorElement>('a[aria-current="page"]');
      if (!selected || !selected.offsetWidth) return;
      indicator.style.width = `${selected.offsetWidth}px`;
      indicator.style.transform = `translate3d(${selected.offsetLeft}px, 0, 0)`;
      revealLink(selected);
    };
    measure();
    const observer = new ResizeObserver(() => measure());
    observer.observe(scroller);
    observer.observe(links);
    links.querySelectorAll('a').forEach(link => observer.observe(link));
    void document.fonts?.ready.then(() => measure());
    return () => { disposed = true; observer.disconnect(); };
  }, [active, items, hidden]);

  useLayoutEffect(() => {
    const surface = surfaceRef.current;
    if (!surface || !supported) return;

    const generator = createLensMapGenerator(glass.mapSize);
    let previousGeometry = '';

    const measure = () => {
      const width = surface.offsetWidth;
      const height = surface.offsetHeight;
      if (width < 1 || height < 1) return;

      const radius = Math.min(
        Number.parseFloat(getComputedStyle(surface).borderTopLeftRadius) || 0,
        width / 2,
        height / 2,
      );
      const geometry = `${width}:${height}:${radius}`;
      if (geometry === previousGeometry) return;
      previousGeometry = geometry;

      setLens({
        width,
        height,
        map: generator.generate({
          lensHalfWidth: width / 2,
          lensHalfHeight: height / 2,
          borderRadius: radius,
          depth: glass.depth,
          clipToShape: true,
          softEdge: true,
          curvature: glass.curvature,
          bend: glass.bend,
          bendWidth: glass.bendWidth,
          sheen: glass.sheen,
          sheenWidth: glass.sheenWidth,
          sheenAngle: glass.sheenAngle,
          sheenFalloff: glass.sheenFalloff,
          glow: glass.glow,
          glowSpread: glass.glowSpread,
          glowFalloff: glass.glowFalloff,
        }),
      });
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(surface);
    return () => {
      observer.disconnect();
      generator.dispose();
    };
  }, [supported]);

  const ready = supported && Boolean(lens.map);
  const blur = ready ? glass.blur : glass.fallbackBlur;
  const backdrop = `blur(${blur}px) ${ready ? `url("#${filterId}") ` : ''}saturate(${glass.saturation})`;
  const displacement = Math.hypot(lens.width, lens.height) * glass.strength;
  const margin = Math.ceil(displacement + blur * 3 + 2);
  const navigate = (category: Category) => (event: MouseEvent<HTMLAnchorElement>) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
    event.preventDefault();
    onNavigate(category, event.detail === 0);
  };

  return (
    <nav
      ref={surfaceRef}
      className="photo-glass-nav"
      hidden={hidden}
      aria-label={t('Photography categories')}
      data-active={active}
      data-count={items.length}
      data-wide={items.length > 2 ? 'true' : undefined}
      data-glass={ready ? 'refraction' : 'frosted'}
    >
      <svg className="photo-glass-nav__defs" aria-hidden="true" width="0" height="0" focusable="false">
        {ready && (
          <defs>
            <filter
              id={filterId}
              x={-margin}
              y={-margin}
              width={lens.width + margin * 2}
              height={lens.height + margin * 2}
              filterUnits="userSpaceOnUse"
              primitiveUnits="userSpaceOnUse"
              colorInterpolationFilters="sRGB"
            >
              <MaterialFilterContents
                dispScale={displacement}
                dispersion={glass.dispersion}
                specular={glass.specular}
                hasSpecular
                mapMatrix={null}
                width={lens.width}
                height={lens.height}
                mapUrl={lens.map}
                feImageRef={feImageRef}
              />
            </filter>
          </defs>
        )}
      </svg>
      <span
        className="photo-glass-nav__optics"
        aria-hidden="true"
        style={{ backdropFilter: backdrop, WebkitBackdropFilter: backdrop } as CSSProperties}
      />
      <span ref={scrollerRef} className="photo-glass-nav__scroller">
        <span ref={linksRef} className="photo-glass-nav__links">
          <span ref={indicatorRef} className="photo-glass-nav__indicator" aria-hidden="true" />
          {items.map(item => <a key={item.id} href={`#${item.id}`}
            aria-current={active === item.id ? 'page' : undefined}
            onFocus={event => revealLink(event.currentTarget)} onClick={navigate(item.id)}>
            {item.label}
          </a>)}
        </span>
      </span>
    </nav>
  );
}
