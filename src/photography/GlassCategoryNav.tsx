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

export type GlassCategoryNavProps = {
  active: PhotographyGlassCategory;
  showVideo?: boolean;
  onNavigate: (category: PhotographyGlassCategory, keyboard: boolean) => void;
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

export function GlassCategoryNav({ active, showVideo = false, onNavigate }: GlassCategoryNavProps) {
  const surfaceRef = useRef<HTMLElement>(null);
  const feImageRef = useRef<SVGFEImageElement>(null);
  const filterId = `photo-glass-${useId().replace(/:/g, '')}`;
  const [supported] = useState(supportsBackdropRefraction);
  const [lens, setLens] = useState<Lens>(emptyLens);

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
  const navigate = (category: PhotographyGlassCategory) => (event: MouseEvent<HTMLAnchorElement>) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
    event.preventDefault();
    onNavigate(category, event.detail === 0);
  };

  return (
    <nav
      ref={surfaceRef}
      className="photo-glass-nav"
      aria-label={t('Photography categories')}
      data-active={active}
      data-count={showVideo ? 3 : 2}
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
      <span className="photo-glass-nav__indicator" aria-hidden="true" />
      <span className="photo-glass-nav__links">
        <a href="#landscape" aria-current={active === 'landscape' ? 'page' : undefined} onClick={navigate('landscape')}>
          {t('Landscape')}
        </a>
        <a href="#concert" aria-current={active === 'concert' ? 'page' : undefined} onClick={navigate('concert')}>
          {t('Concert')}
        </a>
        {showVideo && <a href="#video" aria-current={active === 'video' ? 'page' : undefined} onClick={navigate('video')}>
          {t('Video')}
        </a>}
      </span>
    </nav>
  );
}
