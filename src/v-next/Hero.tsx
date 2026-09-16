import { useEffect, useRef, useState } from 'react';
import type { GlassScene } from './glassScene';
import { heroPhoto, subscribeHeroPhoto } from './heroPhoto';

export function HeroPhoto() {
  const host = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = host.current, hero = element?.closest<HTMLElement>('.gxc-hero');
    if (!element || !hero) return;
    return subscribeHeroPhoto(hero, photo => {
      // Same URL and decoded browser resource; keep the GPU image out of DOM layout.
      const image = photo.image.cloneNode() as HTMLImageElement;
      image.alt = ''; image.width = photo.width; image.height = photo.height;
      element.replaceChildren(image);
      element.dataset.source = photo.url;
    });
  }, []);
  return <div ref={host} className="gxc-hero-image" aria-hidden="true" data-original-size={`${heroPhoto.width}×${heroPhoto.height}`} />;
}

export function GlassHero({ disabled }: { disabled: boolean }) {
  const host = useRef<HTMLDivElement>(null);
  const area = useRef<HTMLDivElement>(null);
  const scene = useRef<GlassScene | undefined>(undefined);
  const [ready, setReady] = useState(false);
  const disabledRef = useRef(disabled); disabledRef.current = disabled;
  useEffect(() => {
    if (ready || !host.current || !area.current) return;
    const publish = () => {
      const rect = area.current?.getBoundingClientRect(), canvas = host.current;
      if (!rect || !canvas) return;
      const hero = canvas.getBoundingClientRect();
      const width = rect.width - (rect.width < 700 ? 44 : 160);
      const height = rect.height * .88;
      const scale = Math.min(width / 2133, height / 933);
      const w = scale * 2133, h = scale * 933;
      canvas.dataset.wordRect = JSON.stringify({ left: rect.left - hero.left + (rect.width - w) / 2, top: rect.top - hero.top + (rect.height - h) / 2, width: w, height: h });
    };
    const observer = new ResizeObserver(publish); observer.observe(area.current); publish();
    return () => observer.disconnect();
  }, [ready]);
  useEffect(() => {
    let disposed = false; setReady(false);
    if (new URLSearchParams(location.search).has('no-webgl')) return;
    import('./glassScene').then(async module => {
      if (disposed || !host.current || !area.current) return;
      const instance = await module.mountGlass(host.current, area.current, disabledRef.current, () => { if (!disposed) setReady(false); });
      if (disposed) { instance.dispose(); return; }
      instance.setMotion(!disabledRef.current); scene.current = instance; setReady(true);
    }).catch(error => {
      if (!disposed) {
        setReady(false);
        if (host.current) host.current.dataset.failed = 'initialization';
        if (import.meta.env.DEV) console.error('Glass initialization failed', error);
      }
    });
    return () => { disposed = true; scene.current?.dispose(); scene.current = undefined; };
  }, []);
  useEffect(() => { scene.current?.setMotion(!disabled); }, [disabled]);
  return <div ref={area} className="gxc-wordmark-space" role="img" aria-label="galaxci, a connected glass signature against a starry sky">
    {!ready && <div className="gxc-wordmark-fallback"><img src="/v-next/galaxci-glass-poster.webp" alt="" width="2133" height="933"/></div>}
    <div ref={host} className="gxc-canvas" data-ready={ready ? 'true' : 'false'} aria-hidden="true"/>
  </div>;
}
