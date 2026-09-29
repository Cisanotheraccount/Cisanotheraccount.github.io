import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ComponentPropsWithoutRef,
  type ReactNode,
} from 'react';
import { MaterialFilterContents } from '../../v2-3/vendor/simple-liquid-glass/MaterialFilter';
import { createLensMapGenerator } from '../../v2-3/vendor/simple-liquid-glass/displacement';
import { uiGlass } from '../../v2-3/uiGlassConfig';
import '../../v2-3/liquidSurface.css';

type Lens = {
  width: number;
  height: number;
  map: string;
  revision: number;
};

const emptyLens: Lens = { width: 0, height: 0, map: '', revision: 0 };

// CSS.supports() accepts url() in browsers that do not render SVG backdrop
// filters. Keep the same explicit capability boundary as the site navigation.
function supportsBackdropRefraction() {
  return /(?:Chrome|Chromium|Edg|OPR)\//.test(navigator.userAgent)
    && !/(?:CriOS|EdgiOS|OPiOS)/.test(navigator.userAgent)
    && CSS.supports('backdrop-filter', 'url("#gxc-consent-capability")')
    && !new URLSearchParams(location.search).has('no-refraction');
}

function motionIsReduced() {
  return matchMedia('(prefers-reduced-motion: reduce)').matches
    || Boolean(document.querySelector('.gxc-site[data-motion="reduced"]'));
}

export function ConsentGlass({
  className,
  children,
  variant,
  ...props
}: ComponentPropsWithoutRef<'div'> & {
  className: string;
  children: ReactNode;
  variant: 'prompt' | 'details';
}) {
  const surfaceRef = useRef<HTMLDivElement>(null);
  const feImageRef = useRef<SVGFEImageElement>(null);
  const filterId = `gxc-consent-lens-${useId().replace(/:/g, '')}`;
  const [supported] = useState(supportsBackdropRefraction);
  const [lens, setLens] = useState<Lens>(emptyLens);
  const [reducedMotion, setReducedMotion] = useState(motionIsReduced);

  useLayoutEffect(() => {
    const surface = surfaceRef.current;
    if (!surface || !supported) return;

    let generator: ReturnType<typeof createLensMapGenerator> | null = null;
    let observer: ResizeObserver | null = null;
    let disposed = false;
    let previousGeometry = '';
    let revision = 0;

    const dispose = () => {
      if (disposed) return;
      disposed = true;
      observer?.disconnect();
      try { generator?.dispose(); } catch { /* The frosted fallback remains usable. */ }
      generator = null;
    };

    try {
      generator = createLensMapGenerator(uiGlass.mapSize);
    } catch {
      setLens(emptyLens);
      return;
    }

    const measure = () => {
      const activeGenerator = generator;
      if (disposed || !activeGenerator) return;
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
      revision += 1;

      try {
        const map = activeGenerator.generate({
          lensHalfWidth: width / 2,
          lensHalfHeight: height / 2,
          borderRadius: radius,
          depth: uiGlass.depth,
          clipToShape: true,
          softEdge: true,
          curvature: uiGlass.curvature,
          bend: uiGlass.bend,
          bendWidth: uiGlass.bendWidth,
          sheen: uiGlass.sheen,
          sheenWidth: uiGlass.sheenWidth,
          sheenAngle: uiGlass.sheenAngle,
          sheenFalloff: uiGlass.sheenFalloff,
          glow: uiGlass.glow,
          glowSpread: uiGlass.glowSpread,
          glowFalloff: uiGlass.glowFalloff,
        });
        setLens({ width, height, revision, map });
      } catch {
        setLens(emptyLens);
        dispose();
      }
    };

    measure();
    if (disposed) return;
    observer = new ResizeObserver(measure);
    observer.observe(surface);
    return dispose;
  }, [supported]);

  useEffect(() => {
    const media = matchMedia('(prefers-reduced-motion: reduce)');
    const refresh = () => setReducedMotion(motionIsReduced());
    const observer = new MutationObserver(refresh);
    observer.observe(document.documentElement, {
      attributes: true,
      subtree: true,
      attributeFilter: ['data-motion'],
    });
    media.addEventListener('change', refresh);
    return () => {
      observer.disconnect();
      media.removeEventListener('change', refresh);
    };
  }, []);

  const ready = supported && Boolean(lens.map);
  const blur = ready ? uiGlass.menuBlur : uiGlass.fallbackMenuBlur;
  const backdrop = `blur(${blur}px) ${ready ? `url("#${filterId}") ` : ''}saturate(${uiGlass.saturation})`;
  const displacement = Math.hypot(lens.width, lens.height) * uiGlass.menuStrength;
  const margin = Math.ceil(displacement + blur * 3 + 2);

  return (
    <div
      {...props}
      ref={surfaceRef}
      className={`${className} gxc-consent-glass gxc-glass gxc-liquid-surface`}
      data-consent-variant={variant}
      data-liquid-kind="menu"
      data-glass={ready ? 'refraction' : 'frosted'}
      data-liquid-map-revision={lens.revision || undefined}
      data-motion={reducedMotion ? 'reduced' : 'full'}
      style={{ '--liquid-contrast-tint': `rgba(0,0,0,${uiGlass.menuTint})` } as CSSProperties}
    >
      <svg className="gxc-consent-glass__defs gxc-liquid-defs" aria-hidden="true" width="0" height="0" focusable="false">
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
                dispersion={uiGlass.dispersion}
                specular={uiGlass.specular}
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
      <span className="gxc-liquid-optics" aria-hidden="true"
        style={{ backdropFilter: backdrop, WebkitBackdropFilter: backdrop } as CSSProperties} />
      <div className="gxc-consent-content">{children}</div>
    </div>
  );
}
