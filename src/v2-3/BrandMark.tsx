import { useLayoutEffect, useRef } from 'react';
import { LogoGlass } from './LogoGlass';

const logoScale = 2.5;
const logoAspect = 7.4293103 / 6.5275862;

/** A real DOM landing slot; canvas artwork never owns the navigation link. */
export function BrandMark({ secondary = false }: { secondary?: boolean }) {
  const host = useRef<HTMLSpanElement>(null);
  useLayoutEffect(() => {
    const element = host.current;
    if (!element) return;
    const text = element.querySelector<HTMLElement>('.gxc-brand-text')!;
    const mark = element.querySelector<HTMLElement>('.gxc-brand-logo')!;
    const context = document.createElement('canvas').getContext('2d');
    let disposed = false, previous = '';
    const measure = () => {
      if (disposed || !context) return;
      const css = getComputedStyle(text);
      context.font = css.fontWeight + ' ' + css.fontSize + ' ' + css.fontFamily;
      const metrics = context.measureText(text.textContent || 'GALA X CI');
      const height = metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent;
      if (!(height > 0)) return;
      // Center the enlarged artwork on the actual glyphs, not the font line box.
      const logoHeight = height * logoScale;
      const values = [logoHeight, logoHeight * logoAspect, -metrics.actualBoundingBoxDescent - (logoHeight - height) / 2];
      const key = values.join(':');
      if (previous !== key) {
        previous = key;
        mark.style.height = values[0] + 'px'; mark.style.width = values[1] + 'px';
        mark.style.verticalAlign = values[2] + 'px';
        element.dataset.capHeight = String(height);
        document.dispatchEvent(new Event('gxc:brand-layout'));
      }
    };
    measure();
    const observer = new ResizeObserver(measure); observer.observe(text);
    window.addEventListener('resize', measure);
    void document.fonts.ready.then(measure);
    document.fonts.addEventListener('loadingdone', measure);
    return () => { disposed = true; observer.disconnect(); window.removeEventListener('resize', measure); document.fonts.removeEventListener('loadingdone', measure); };
  }, []);
  return <span ref={host} className="gxc-brand-content"><span data-gxc-brand-logo={secondary ? undefined : ""} className="gxc-brand-logo" aria-hidden="true"><img src="/v2-3/entry/logo.svg" alt="" width="1160" height="1040" /><LogoGlass /></span><span className="gxc-brand-text" data-gxc-brand-text={secondary ? undefined : ""} data-gxc-reveal={secondary ? undefined : "0"}>GALA X CI</span></span>;
}
