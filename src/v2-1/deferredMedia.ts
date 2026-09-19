import { useEffect, useState, type RefObject } from 'react';
import { requestFrame, subscribeFrame } from './runtime';

// Stage nearby native image requests, without changing intrinsic layout or the
// texture queue's currentSrc ownership. One request is admitted per shared frame.
const pending = new Set<() => void>();
let off: (() => void) | undefined;
function admit(commit: () => void) {
  pending.add(commit);
  if (!off) off = subscribeFrame(() => {
    const next = pending.values().next().value;
    if (next) { pending.delete(next); next(); }
    if (!pending.size) { off?.(); off = undefined; return false; }
    return true;
  }, 'render');
  requestFrame();
  return () => { pending.delete(commit); if (!pending.size) { off?.(); off = undefined; } };
}

export function useDeferredImage(ref: RefObject<HTMLImageElement | null>, enabled: boolean) {
  const [admitted, setAdmitted] = useState(false);
  useEffect(() => {
    if (!enabled || admitted || !ref.current) return;
    let cancel: (() => void) | undefined, disposed = false;
    const observer = new IntersectionObserver(entries => {
      if (!entries.some(entry => entry.isIntersecting)) return;
      observer.disconnect();
      cancel = admit(() => { if (!disposed) setAdmitted(true); });
    }, { rootMargin: `${Math.max(400, innerHeight)}px 0px` });
    observer.observe(ref.current);
    return () => { disposed = true; cancel?.(); observer.disconnect(); };
  }, [admitted, enabled, ref]);
  return admitted;
}
