import catalog from './video-catalog.json';

export type PhotographyVideoDimensions = {
  width: number;
  height: number;
};

export type PhotographyVideoItem = {
  id: string;
  originalUrl: string;
  title: string;
  category: 'real-estate' | 'interviews';
  postedBy: string | null;
  filmmaker: string;
  duration: number;
  dimensions: PhotographyVideoDimensions;
  poster: string;
  source: string;
  bytes: number;
  sha256: string;
};

export const photographyVideoCatalog = catalog as readonly PhotographyVideoItem[];
