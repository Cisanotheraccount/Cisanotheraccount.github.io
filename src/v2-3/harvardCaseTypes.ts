export type HarvardSlug = 'hypnos-cockpit' | 'deal-points' | 'orbit' | 'psytrain';

export type HarvardMedia = {
  id: string;
  sourceNode: string;
  image: string;
  width: number;
  height: number;
  alt: string;
  caption?: string;
  srcSet?: string;
  sizes?: string;
  background?: 'light' | 'dark' | 'transparent';
};

export type HarvardItem = {
  title?: string;
  body?: string[];
  media?: HarvardMedia;
  gallery?: HarvardMedia[];
  sourceNodes?: string[];
};

export type HarvardSection = {
  id: string;
  title?: string;
  body?: string[];
  layout: 'split' | 'wide' | 'grid' | 'steps' | 'cards' | 'comparison';
  media?: HarvardMedia[];
  itemsTitle?: string;
  items?: HarvardItem[];
  transcript?: Pick<HarvardItem, 'title' | 'body' | 'sourceNodes'>[];
  table?: { caption: string; columns: string[]; rows: string[][] };
  sourceNodes?: string[];
};

export type HarvardChapter = {
  id: string;
  sourceFrame: string;
  title: string;
  lead?: string[];
  sections: HarvardSection[];
};

export type HarvardCaseData = {
  slug: HarvardSlug;
  title: string;
  subtitle?: string;
  period: string;
  kind: string;
  tags: string[];
  mark?: HarvardMedia;
  hero: HarvardMedia;
  coverFrame: string;
  chapters: HarvardChapter[];
};
