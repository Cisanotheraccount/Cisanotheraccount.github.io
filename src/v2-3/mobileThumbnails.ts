import { useEffect, useState } from 'react';
import { getInputState, subscribeInputChange } from './inputState';
import manifest from '../../public/v2-1/thumbnails/manifest.json';

export const MOBILE_THUMBNAIL_QUERY = '(max-width: 760px)';
type Variant = { url: string; width: number; height: number; bytes: number; sha256: string };
type ThumbnailManifest = { schemaVersion: number; projects: Record<string, { images: { id: string; variants: Variant[] }[] }> };

// Initialize before the first img is rendered; avoid briefly requesting the
// desktop original on a phone. Input capability is independent of layout width.
export function useMobileThumbnailMode() {
  const [enabled, setEnabled] = useState(() => window.matchMedia(MOBILE_THUMBNAIL_QUERY).matches || getInputState().touchCapable);
  useEffect(() => {
    const media = window.matchMedia(MOBILE_THUMBNAIL_QUERY);
    const change = () => setEnabled(media.matches || getInputState().touchCapable);
    change();
    const offInput = subscribeInputChange(change);
    media.addEventListener('change', change);
    return () => media.removeEventListener('change', change);
  }, []);
  return enabled;
}

export function mobileThumbnail(slug: string, id: string) {
  const variants = (manifest as ThumbnailManifest).projects[slug]?.images.find(image => image.id === id)?.variants;
  if (!variants?.length) return undefined;
  return {
    src: (variants.find(variant => variant.width >= 800) ?? variants[variants.length - 1]).url,
    srcSet: variants.map(variant => `${variant.url} ${variant.width}w`).join(', '),
  };
}

export type WorkLayout = 'lead' | 'wide' | 'narrow' | 'left' | 'right';
export function workLayout(index: number): WorkLayout {
  return index === 0 ? 'lead' : index === 1 ? 'wide' : index === 2 ? 'narrow' : index % 2 ? 'left' : 'right';
}

// Keep these calculations paired with styles.css: twelve columns, responsive
// gutters/gaps and, for ShotFlow, two portrait images inside a square card.
export function workImageSizes(layout: WorkLayout, shotFlow = false) {
  const desktopSpan = { lead: 9, wide: 7, narrow: 4, left: 6, right: 5 }[layout];
  const tabletSpan = layout === 'lead' ? 11 : 6;
  const grid = (span: number, gutter: number, gap: number) => ({
    vw: span / 12 * 100,
    px: (2 * gutter * span + gap * (12 - span)) / 12,
  });
  const calc = (vw: number, px: number) => `calc(${Number(vw.toFixed(6))}vw - ${Number(px.toFixed(6))}px)`;
  const width = ({ vw, px }: { vw: number; px: number }, mobile = false) => {
    if (!shotFlow) return calc(vw, px);
    const ratio = 1290 / 2796;
    // Width is capped by both the two-column fit (36px horizontal padding +
    // 20px gap) and intrinsic portrait width at the available image height.
    return `min(${calc(vw / 2, (px + 56) / 2)}, ${calc(vw * ratio, (px + (mobile ? 36 : 48)) * ratio)})`;
  };
  return `(max-width: 760px) ${width({ vw: 100, px: 44 }, true)}, (max-width: 1000px) ${width(grid(tabletSpan, 32, 24))}, (min-width: 1600px) ${width(grid(desktopSpan, 80, 40))}, ${width(grid(desktopSpan, 56, 32))}`;
}
