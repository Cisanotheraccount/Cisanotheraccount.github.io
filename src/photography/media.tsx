import { useState, type ImgHTMLAttributes } from 'react';
import type { PhotographyPhoto, PhotoVariant } from './catalog.types';
import { photographyText as t } from '../localization/photography';

type ManagedPhotoProps = Omit<ImgHTMLAttributes<HTMLImageElement>, 'src' | 'srcSet' | 'width' | 'height' | 'alt'> & {
  photo: PhotographyPhoto;
  sizes: string;
  priority?: boolean;
  className?: string;
  onFailure?: () => void;
  forceJpeg?: boolean;
};

type OriginalPhotoProps = {
  photo: PhotographyPhoto;
  requestKey: number;
  className?: string;
  onReady: () => void;
  onFailure: () => void;
};

function variantsFor(photo: PhotographyPhoto, format: PhotoVariant['format']) {
  return photo.variants.filter((variant) => variant.format === format);
}

function srcSet(variants: PhotoVariant[]) {
  return variants.map((variant) => `${variant.src} ${variant.width}w`).join(', ');
}

function closestVariant(variants: PhotoVariant[], width: number) {
  return [...variants].sort((a, b) => Math.abs(a.width - width) - Math.abs(b.width - width))[0];
}

/**
 * Catalog variants are page-sized previews. HDR previews stay on a native JPEG
 * <img>, where browsers can use their gain map. SDR previews may use WebP with
 * a JPEG fallback through <picture>.
 */
export function ManagedPhoto({ photo, sizes, priority = false, className, loading, onFailure, forceJpeg: forceJpegFromParent = false, ...rest }: ManagedPhotoProps) {
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const [forceJpeg, setForceJpeg] = useState(false);
  const jpeg = variantsFor(photo, 'jpeg');
  const webp = variantsFor(photo, 'webp');
  const hdr = jpeg.filter((variant) => variant.hdr);
  const isHdr = hdr.length > 0;
  const nativeCandidates = isHdr ? hdr : jpeg;
  const fallback = closestVariant(nativeCandidates, photo.width) ?? closestVariant(webp, photo.width);

  if (!fallback && !onFailure) {
    return <div className="photo-media-error" role="status">{t('Image unavailable')}</div>;
  }

  if (failed) {
    if (onFailure) return null;
    return <div className="photo-media-error" role="status"><span>{t('Image unavailable')}</span><button type="button" onClick={() => { setFailed(false); setLoaded(false); setForceJpeg(true); setRetryKey((value) => value + 1); }}>{t('Retry')}</button></div>;
  }

  if (!fallback) return null;

  const image = <img
    key={retryKey}
    className={className}
    src={fallback.src}
    srcSet={srcSet(nativeCandidates) || undefined}
    sizes={sizes}
    width={photo.width}
    height={photo.height}
    alt={t(photo.alt)}
    loading={loading ?? (priority ? 'eager' : 'lazy')}
    decoding="async"
    {...(priority ? { fetchPriority: 'high' as const } : {})}
    {...rest}
    onLoad={() => setLoaded(true)}
    onError={() => { setFailed(true); onFailure?.(); }}
  />;

  const media = isHdr || forceJpegFromParent || forceJpeg || webp.length === 0 ? image : <picture>
    <source type="image/webp" srcSet={srcSet(webp)} sizes={sizes} />
    {image}
  </picture>;

  return <div className="photo-media" aria-busy={!loaded}>
    {media}
    {!loaded && <span className="photo-media-loading" role="status">{t('Loading image')}</span>}
  </div>;
}

/**
 * Mounted automatically for the current photograph in the fullscreen viewer. It stays visually hidden
 * until the browser has loaded and decoded the file, leaving the preview in place.
 */
export function OriginalPhoto({ photo, requestKey, className, onReady, onFailure }: OriginalPhotoProps) {
  const original = photo.original;
  if (!original) return null;

  return <img
    key={`${photo.id}-${requestKey}`}
    className={className}
    src={original.src}
    width={original.width}
    height={original.height}
    alt=""
    aria-hidden="true"
    loading="eager"
    decoding="async"
    fetchPriority="high"
    onLoad={(event) => {
      const image = event.currentTarget;
      if (typeof image.decode !== 'function') {
        onReady();
        return;
      }
      void image.decode().then(() => { if (image.isConnected) onReady(); }, () => { if (image.isConnected) onFailure(); });
    }}
    onError={onFailure}
  />;
}
