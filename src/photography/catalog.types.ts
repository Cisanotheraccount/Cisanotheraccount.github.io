export type PhotographyCategory = 'Landscapes' | 'Portraits' | 'Restaurants' | 'Spaces' | 'Live';

export type PhotoVariant = {
  src: string;
  width: number;
  height: number;
  format: 'webp' | 'jpeg';
  hdr?: boolean;
};

export type PhotoOriginal = {
  src: string;
  width: number;
  height: number;
  bytes: number;
  hdr?: boolean;
};

export type PhotographyPhoto = {
  id: string;
  category: PhotographyCategory;
  seriesId: string;
  width: number;
  height: number;
  alt: string;
  variants: PhotoVariant[];
  original: PhotoOriginal;
};

export type PhotographySeries = {
  id: string;
  title: string;
  category: PhotographyCategory;
  coverId: string;
  photoIds: string[];
};

export type PhotographyCatalog = {
  version: string;
  heroPhotoId: string;
  photos: PhotographyPhoto[];
  series: PhotographySeries[];
};
