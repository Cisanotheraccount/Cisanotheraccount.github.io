import { useLayoutEffect, useRef } from 'react';
import { motion, useMotionValue, useTransform, type MotionValue } from 'motion/react';
import type { MouseEvent } from 'react';
import { BrandMark } from './BrandMark';

/** The modal owns the traveling copy while it occupies the browser's top layer. */
export function DetailBrand({ progress, entering, fromHome, onHome }: {
  progress: MotionValue<number>; entering: boolean; fromHome: boolean; onHome(e: MouseEvent<HTMLAnchorElement>): void;
}) {
  const link = useRef<HTMLAnchorElement>(null);
  const homeX = useMotionValue(0), homeY = useMotionValue(0), centerX = useMotionValue(0), centerY = useMotionValue(0);
  const direct = useMotionValue(entering && !fromHome);
  const x = useTransform(() => { const p = direct.get() ? 1 : progress.get(); return homeX.get() + (centerX.get() - homeX.get()) * p; });
  const y = useTransform(() => { const p = direct.get() ? 1 : progress.get(); return homeY.get() + (centerY.get() - homeY.get()) * p; });
  useLayoutEffect(() => { direct.set(entering && !fromHome); }, [entering, fromHome, direct]);
  useLayoutEffect(() => {
    const element = link.current;
    if (!element) return;
    const home = document.querySelector<HTMLElement>('.gxc-header .gxc-brand');
    const measure = () => {
      const source = home?.getBoundingClientRect(), box = element.getBoundingClientRect();
      const toolbar = element.closest('dialog')?.querySelector('.gxc-detail-toolbar')?.getBoundingClientRect();
      if (!source || !toolbar) return;
      homeX.set(source.left); homeY.set(source.top);
      centerX.set((innerWidth - box.width) / 2); centerY.set(toolbar.top + (toolbar.height - box.height) / 2);
    };
    measure();
    const observer = new ResizeObserver(measure); observer.observe(element); if (home) observer.observe(home);
    window.addEventListener('resize', measure);
    document.addEventListener('gxc:brand-layout', measure);
    return () => {
      observer.disconnect(); window.removeEventListener('resize', measure);
      document.removeEventListener('gxc:brand-layout', measure);
    };
  }, [homeX, homeY, centerX, centerY]);
  return <motion.a ref={link} className="gxc-brand gxc-detail-brand" href="#top" aria-label="Gala X Ci, back to home" onClick={onHome}
    style={{ x, y }}><BrandMark secondary /></motion.a>;
}
