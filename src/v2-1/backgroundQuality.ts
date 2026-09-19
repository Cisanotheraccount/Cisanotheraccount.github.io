export type BackgroundVariant = { url: string; width: number; height: number };

/** The photo's CSS cover width, then its real display-pixel demand.
 * This deliberately has no relationship to a WebGL render-resolution budget.
 */
export function selectBackgroundVariant<T extends BackgroundVariant>({ width, height, imageWidth, imageHeight, dpr, overscan = 1, variants }: {
  width: number; height: number; imageWidth: number; imageHeight: number;
  dpr: number; overscan?: number; variants: readonly T[];
}) {
  const positive = (value: number, fallback: number) => Number.isFinite(value) && value > 0 ? value : fallback;
  const pixelRatio = positive(dpr, 1), scale = positive(overscan, 1);
  const originalWidth = positive(imageWidth, 1), originalHeight = positive(imageHeight, 1);
  const coverWidth = Math.max(positive(width, 0), positive(height, 0) * originalWidth / originalHeight) * scale;
  const desiredWidth = coverWidth * pixelRatio;
  const cappedWidth = Math.min(originalWidth, desiredWidth);
  // Ignore malformed or artificially upscaled candidates. Sort a copy so the
  // imported, immutable provenance remains unchanged for every consumer.
  const candidates = variants.filter(item => Number.isFinite(item.width) && item.width > 0
    && Number.isFinite(item.height) && item.height > 0 && item.width <= originalWidth).slice().sort((a, b) => a.width - b.width);
  const variant = candidates.find(item => item.width + .000001 >= cappedWidth) ?? candidates[candidates.length - 1];
  return { coverWidth, desiredWidth, cappedWidth, dpr: pixelRatio, variant, sourceLimited: desiredWidth > originalWidth + .000001 };
}
