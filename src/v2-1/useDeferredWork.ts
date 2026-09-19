import { useEffect, useState, type RefObject } from 'react';

/** Start the optional work renderer once, after the entry gate and near the work.
 * The section itself always stays mounted, so anchors and native images work
 * before WebGL exists. A pixel margin tracks viewport height on portrait screens.
 */
export function useDeferredWork(root: RefObject<HTMLElement | null>, enabled: boolean) {
  const [started, setStarted] = useState(false);
  useEffect(() => {
    if (!enabled || started || !root.current) return;
    const element = root.current;
    let disposed = false, scheduled = false;
    let frame = 0, idle = 0, timer = 0;
    let observer: IntersectionObserver | undefined;
    const finish = () => { if (!disposed) setStarted(true); };
    const schedule = (inView: boolean) => {
      if (disposed || scheduled) return;
      scheduled = true; observer?.disconnect();
      // Yield a paint after revealing the homepage. A visible/deep-linked work
      // section takes the next frame; merely nearby content uses a bounded idle.
      frame = requestAnimationFrame(() => {
        frame = 0;
        if (disposed) return;
        if (inView) finish();
        else if (typeof window.requestIdleCallback === 'function') idle = window.requestIdleCallback(finish, { timeout: 300 });
        else timer = window.setTimeout(finish, 32);
      });
    };
    const observe = () => {
      if (disposed || scheduled) return;
      observer?.disconnect();
      if (typeof IntersectionObserver === 'undefined') { schedule(false); return; }
      observer = new IntersectionObserver(entries => {
        const entry = entries.find(item => item.target === element);
        if (!entry?.isIntersecting) return;
        schedule(entry.boundingClientRect.top < window.innerHeight && entry.boundingClientRect.bottom > 0);
      }, { rootMargin: `${Math.max(1, window.innerHeight)}px 0px`, threshold: 0 });
      observer.observe(element);
    };
    observe();
    window.addEventListener('resize', observe);
    return () => {
      disposed = true; observer?.disconnect();
      window.removeEventListener('resize', observe);
      if (frame) cancelAnimationFrame(frame);
      if (idle) window.cancelIdleCallback(idle);
      if (timer) window.clearTimeout(timer);
    };
  }, [enabled, root, started]);
  return enabled && started;
}
