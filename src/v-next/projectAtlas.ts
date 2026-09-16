import * as THREE from 'three';
import { projectMarks } from './meteorsConfig';
import { projectLabelArt } from './projectLabel';

export const projectAtlasLayout = {
  columns: 4, rows: 4, cell: 304, padding: 8, image: 128, capacity: 7,
  labelStart: 7, labelImage: projectLabelArt.canvasSize * projectLabelArt.scale,
} as const;
export const projectAtlasSlugs = Object.keys(projectMarks);

// Decoding/rasterization happens once per page, never on a pointer or flight update.
// Each glass scene gets its own disposable texture over the same immutable canvas.
let source: Promise<HTMLCanvasElement> | undefined;

function decodeMark(file: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    const timer = window.setTimeout(() => finish(new Error(`Project mark timed out: ${file}`)), 10000);
    const finish = (error?: Error) => {
      clearTimeout(timer); image.onload = null; image.onerror = null;
      if (error) reject(error); else resolve(image);
    };
    image.onload = () => finish();
    image.onerror = () => finish(new Error(`Project mark could not load: ${file}`));
    image.src = `/v-next/project-marks/${file}`;
  });
}

export async function createProjectAtlas(): Promise<THREE.CanvasTexture> {
  if (!source) source = Promise.all([
    Promise.all(projectAtlasSlugs.map(slug => decodeMark(projectMarks[slug].file))),
    document.fonts.load(projectLabelArt.font, Object.values(projectMarks).map(mark => mark.shortName).join(' ')),
  ]).then(([images]) => {
    const { columns, rows, cell, padding, image: size } = projectAtlasLayout;
    const canvas = document.createElement('canvas'); canvas.width = columns * cell; canvas.height = rows * cell;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Project atlas canvas is unavailable');
    images.forEach((image, index) => context.drawImage(image,
      (index % columns) * cell + padding, Math.floor(index / columns) * cell + padding, size, size));
    projectAtlasSlugs.forEach((slug, index) => {
      const labelCell = index + projectAtlasLayout.labelStart;
      const art = projectLabelArt, center = art.canvasSize / 2;
      context.save();
      context.translate((labelCell % columns) * cell + padding, Math.floor(labelCell / columns) * cell + padding);
      context.scale(art.scale, art.scale);
      context.font = art.font;
      // Canvas letterSpacing is newer than canvas text; set it only where supported.
      if ('letterSpacing' in context) context.letterSpacing = `${art.letterSpacing}px`;
      const name = projectMarks[slug].shortName;
      const metrics = context.measureText(name);
      const width = Math.min(art.maxWidth, Math.ceil(metrics.width) + art.paddingX * 2);
      context.beginPath();
      context.roundRect(center - width / 2, center - art.height / 2, width, art.height, art.radius);
      context.fillStyle = art.background;
      context.shadowColor = '#0002'; context.shadowBlur = 8 * art.scale; context.shadowOffsetY = 2 * art.scale;
      context.fill();
      context.shadowColor = 'transparent'; context.shadowBlur = 0; context.shadowOffsetY = 0;
      context.fillStyle = art.foreground;
      context.textAlign = 'center'; context.textBaseline = 'alphabetic';
      const ascent = metrics.fontBoundingBoxAscent ?? metrics.actualBoundingBoxAscent;
      const descent = metrics.fontBoundingBoxDescent ?? metrics.actualBoundingBoxDescent;
      context.fillText(name, center, center + (ascent - descent) / 2, width - art.paddingX * 2);
      context.restore();
    });
    return canvas;
  });
  const texture = new THREE.CanvasTexture(await source);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearMipmapLinearFilter; texture.magFilter = THREE.LinearFilter;
  texture.wrapS = texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.name = 'galaxci-project-marks-and-labels';
  return texture;
}
