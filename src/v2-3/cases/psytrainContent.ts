import type { HarvardCaseData, HarvardChapter, HarvardMedia } from '../harvardCaseTypes';
import { psytrainResearchChapters } from './psytrainResearch';
import { psytrainAvatarUIChapters } from './psytrainAvatarUI';
import { psytrainResponsiveMedia } from './psytrainResponsiveMedia';

const responsive = (media: HarvardMedia): HarvardMedia => ({ ...media, ...psytrainResponsiveMedia[media.image] });
const chapters: HarvardChapter[] = [...psytrainResearchChapters, ...psytrainAvatarUIChapters].map(chapter => ({
  ...chapter,
  sections: chapter.sections.map(section => ({
    ...section,
    media: section.media?.map(responsive),
    items: section.items?.map(item => ({ ...item, media: item.media && responsive(item.media), gallery: item.gallery?.map(responsive) })),
  })),
}));

export const psytrainCase: HarvardCaseData = {
  slug: 'psytrain',
  title: 'PsytrAIn',
  subtitle: 'A VR-based AI Psychology counseling trainer that uses a realistic, emotionally responsive avatar to help students practice real-world clinical decision-making.',
  period: 'Jul. 2025 — Nov. 2025',
  kind: 'Personal Project · VR / AI Concept',
  tags: ['Virtual Reality', 'AI', 'UI/UX', 'Unreal Engine'],
  coverFrame: '159:4677',
  mark: { id: 'psytrain-mark', sourceNode: '159:4681', image: '/v2-3/cases/psytrain/psytrain-mark.svg', width: 84, height: 84, alt: 'PsytrAIn project mark.' },
  hero: responsive({
    id: 'psytrain-hero', sourceNode: '159:4678',
    image: '/v2-3/cases/psytrain/hero-counseling-scene.png',
    srcSet: '/v2-3/cases/psytrain/hero-counseling-scene-1280.webp 1280w, /v2-3/cases/psytrain/hero-counseling-scene-2560.webp 2560w, /v2-3/cases/psytrain/hero-counseling-scene.png 3840w',
    width: 3840, height: 2160,
    alt: 'Emma, the PsytrAIn virtual avatar, seated in the proposed counseling environment.',
    caption: 'PsytrAIn · Virtual counseling environment',
  }),
  chapters,
};
