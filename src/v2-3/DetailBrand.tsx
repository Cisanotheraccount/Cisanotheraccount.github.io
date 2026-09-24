import { useLayoutEffect, useRef } from 'react';
import { motion, useMotionValue, useMotionValueEvent, useTransform, type MotionValue } from 'motion/react';
import { t } from '../localization/main';
import type { MouseEvent } from 'react';
import { BrandMark } from './BrandMark';
import logoMask from './assets/logo-mask.png';

type LensLayout = { toolbar: HTMLElement; offsetX: number; offsetY: number; width: number; height: number; toolbarLeft: number; toolbarTop: number };
function updateLensPosition(x: number, y: number, layout: LensLayout | null) {
  if (!layout) return;
  layout.toolbar.style.setProperty('--brand-lens-left', `${x + layout.offsetX - layout.toolbarLeft}px`);
  layout.toolbar.style.setProperty('--brand-lens-top', `${y + layout.offsetY - layout.toolbarTop}px`);
}

/** The modal owns the traveling copy while it occupies the browser's top layer. */
export function DetailBrand({ progress, entering, fromHome, onHome }: {
  progress: MotionValue<number>; entering: boolean; fromHome: boolean; onHome(e: MouseEvent<HTMLAnchorElement>): void;
}) {
  const link = useRef<HTMLAnchorElement>(null);
  const lensLayout = useRef<LensLayout | null>(null);
  const homeX = useMotionValue(0), homeY = useMotionValue(0), centerX = useMotionValue(0), centerY = useMotionValue(0);
  const direct = useMotionValue(entering && !fromHome);
  const x = useTransform(() => { const p = direct.get() ? 1 : progress.get(); return homeX.get() + (centerX.get() - homeX.get()) * p; });
  const y = useTransform(() => { const p = direct.get() ? 1 : progress.get(); return homeY.get() + (centerY.get() - homeY.get()) * p; });
  // Reuse the brand's position; scrolling/animation must not add layout reads.
  useMotionValueEvent(x, 'change', value => updateLensPosition(value, y.get(), lensLayout.current));
  useMotionValueEvent(y, 'change', value => updateLensPosition(x.get(), value, lensLayout.current));
  useLayoutEffect(() => { direct.set(entering && !fromHome); }, [entering, fromHome, direct]);
  useLayoutEffect(() => {
    const element = link.current;
    if (!element) return;
    const home = document.querySelector<HTMLElement>('.gxc-header .gxc-brand');
    const measure = () => {
      const source = home?.getBoundingClientRect(), box = element.getBoundingClientRect();
      const toolbarElement = element.closest('dialog')?.querySelector<HTMLElement>('.gxc-detail-toolbar');
      const toolbar = toolbarElement?.getBoundingClientRect();
      if (!source || !toolbar) return;
      homeX.set(source.left); homeY.set(source.top);
      centerX.set((innerWidth - box.width) / 2); centerY.set(toolbar.top + (toolbar.height - box.height) / 2);
      const logo = element.querySelector('.gxc-brand-logo')?.getBoundingClientRect();
      if (logo && toolbarElement) {
        lensLayout.current = { toolbar: toolbarElement, offsetX: logo.left - box.left, offsetY: logo.top - box.top, width: logo.width, height: logo.height, toolbarLeft: toolbar.left, toolbarTop: toolbar.top };
        toolbarElement.style.setProperty('--brand-lens-mask', `url("${logoMask}")`);
        toolbarElement.style.setProperty('--brand-lens-width', `${logo.width}px`);
        toolbarElement.style.setProperty('--brand-lens-height', `${logo.height}px`);
        updateLensPosition(x.get(), y.get(), lensLayout.current);
      }
    };
    measure();
    const observer = new ResizeObserver(measure); observer.observe(element); if (home) observer.observe(home);
    window.addEventListener('resize', measure);
    document.addEventListener('gxc:brand-layout', measure);
    return () => {
      lensLayout.current = null;
      observer.disconnect(); window.removeEventListener('resize', measure);
      document.removeEventListener('gxc:brand-layout', measure);
    };
  }, [homeX, homeY, centerX, centerY, x, y]);
  return <motion.a ref={link} className="gxc-brand gxc-detail-brand" href="#top" aria-label={t('Gala X Ci, back to home')} onClick={onHome}
    style={{ x, y }}><BrandMark secondary /></motion.a>;
}
