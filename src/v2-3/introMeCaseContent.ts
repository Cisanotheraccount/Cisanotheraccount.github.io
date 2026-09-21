import portrait from './assets/introme/portrait-1600.webp';
import portraitSmall from './assets/introme/portrait-800.webp';
import website from './assets/introme/website-1600.webp';
import websiteSmall from './assets/introme/website-800.webp';
import character from './assets/introme/character-1600.webp';
import characterSmall from './assets/introme/character-800.webp';
import scan from './assets/introme/scan-1600.webp';
import scanSmall from './assets/introme/scan-800.webp';
import recording from './assets/introme/recording-original-1600.webp';
import recordingSmall from './assets/introme/recording-original-800.webp';
import voice from './assets/introme/voice-settings-1600.webp';
import voiceSmall from './assets/introme/voice-settings-800.webp';

import proposalWebsite from './assets/introme/proposal-website-1600.webp';
import proposalWebsiteSmall from './assets/introme/proposal-website-800.webp';
import conceptAvatar from './assets/introme/concept-avatar-626.webp';
import aiTool from './assets/introme/ai-tool-1600.webp';
import aiToolSmall from './assets/introme/ai-tool-800.webp';

export type IntroMeStudy = {
  node?: string;
  frame?: { width: number; height: number; radius: number; crop?: readonly [number, number, number, number] };
  image: string;
  alt: string;
  caption: string;
  width: number;
  height: number;
  srcSet?: string;
  sizes?: string;
  loading?: 'lazy' | 'eager';
};

export const introMePresentation = {
  title: 'IMA Capstone Week Fall 2025 — Ci Song',
  caption: 'Capstone Presentation · NYU IMA · December 2025',
  url: 'https://vimeo.com/1152299335',
  embedUrl: 'https://player.vimeo.com/video/1152299335?autoplay=1&playsinline=1&dnt=1#t=0s',
  durationLabel: '8 min 36 sec',
  // Only the verified 00:20 frame belongs here; do not substitute Vimeo's default poster.
  poster: null as IntroMeStudy | null,
};

const media = (image: string, small: string, width: number, height: number, alt: string, caption: string): IntroMeStudy => ({
  image, width, height, alt, caption,
  srcSet: `${small} 800w, ${image} ${width}w`,
  sizes: '(max-width: 760px) calc(100vw - 44px), (max-width: 1000px) 50vw, 42vw',
});

export const introMeMedia = {
  portrait: { ...media(portrait, portraitSmall, 1600, 1114, 'Ci Song wearing a light blue hoodie, as shown on the IntroMe presentation cover.', 'A familiar face, in a different form.'), loading: 'eager' as const },
  website: { ...media(website, websiteSmall, 1600, 988, 'The original Gala X Ci website with a HeyGen conversation window showing Ci Song’s avatar.', 'HeyGen avatar embedded in my original portfolio.'), loading: 'eager' as const, node: '11:295', frame: { width: 1217, height: 746, radius: 16, crop: [1, .993875265, 0, .003062359] as const } },
  character: { ...media(character, characterSmall, 1600, 1600, 'A long-haired 3D character from an early Unreal workflow exploration.', 'An early character workflow.'), node: '56:93', frame: { width: 1051, height: 900, radius: 16, crop: [1, .856327295, 0, .071836345] as const } },
  scan: { ...media(scan, scanSmall, 1600, 2133, 'A Creaform handheld scanner beside a laptop showing a scan of Ci Song’s face.', 'Trying a Creaform scan.'), node: '56:103', frame: { width: 1051, height: 900, radius: 16, crop: [1.000432253, .64252311, -.000432253, .178675637] as const } },
  recording: { ...media(recording, recordingSmall, 1600, 2844, 'Camera and lights set up for recording the IntroMe avatar.', 'The recording setup, from the original media poster.'), node: '25:21', frame: { width: 1050.545898, height: 1000.586548, radius: 16 } },
  voice: { ...media(voice, voiceSmall, 1600, 1200, 'Archived avatar voice settings, with ElevenLabs selected as the voice engine.', 'Voice settings explored during the project.'), node: '167:19', frame: { width: 968.445313, height: 724.457458, radius: 24, crop: [.934697926, .931983531, .021782456, .036422715] as const } },
  proposalWebsite: { ...media(proposalWebsite, proposalWebsiteSmall, 1600, 1196, 'The original Gala X Ci portfolio showing a grid of projects.', 'The portfolio behind the proposal.'), node: '11:247' },
  conceptAvatar: { image: conceptAvatar, width: 626, height: 626, alt: 'The illustrated avatar used in the original IntroMe concept.', caption: 'The first concept: another me.', node: '11:264' },
  aiTool: { ...media(aiTool, aiToolSmall, 1600, 1600, 'An early conceptual diagram linking project input, an agent, HeyGen and a portfolio website.', 'An early concept diagram, rather than a verified system architecture.'), node: '190:79', frame: { width: 1059, height: 684, radius: 16, crop: [1, .645892322, 0, .177053824] as const } },
};

export const introMeExplorations = [
  { title: 'Build a character.', tools: 'CC4 · Unity · Unreal · MetaHuman · Convai', image: introMeMedia.character, body: 'I explored successive 3D character workflows. The likeness mattered, alongside the hardware and production effort needed to make it work.' },
  { title: 'Capture a likeness.', tools: 'Creaform · 3D scanning', image: introMeMedia.scan, body: 'I tried scanning myself. The result did not give me the likeness I was looking for, so I continued exploring another way to represent myself.' },
  { title: 'Start with myself.', tools: 'HeyGen · Video-based avatar', image: { ...introMeMedia.portrait, loading: 'lazy' as const, caption: 'Ci Song, shown on the IntroMe presentation cover.' }, body: 'I moved toward a video-based approach, learning the distinction between generating an avatar video and preparing one for live conversation.' },
];

export const introMeRecordingStates = [
  { label: 'Listening', duration: '15s' },
  { label: 'Speaking', duration: '90s' },
  { label: 'Idle', duration: '15s' },
];

export const introMeKnowledge = [
  { title: 'Background', description: 'The context behind my work.' },
  { title: 'Personality', description: 'The way I introduce myself.' },
  { title: 'Portfolio', description: 'An overview of what I make.' },
  { title: 'LinkedIn', description: 'My professional background.' },
  { title: 'Projects', description: 'Ideas, decisions and connections.' },
];

export const introMeVoice = [
  { title: 'Pace', description: 'A slower, considered speaking rhythm.' },
  { title: 'Energy', description: 'An engaged, enthusiastic delivery.' },
  { title: 'Accent', description: 'Attention to how the voice represented me.' },
];

// Editorial text is native HTML; only independent Figma image fills are rendered as media.
export const introMeIntent = [
  { title: 'Browse the work.', body: 'Visitors begin with the projects that interest them.' },
  { title: 'Ask a question.', body: 'The digital twin listens to what they want to know.' },
  { title: 'Hear the story.', body: 'My voice and project knowledge introduce the work in conversation.' },
];

export const introMeLimits = [
  { title: 'Personal experience', body: 'Do not invent experiences or reveal overly personal information.' },
  { title: 'Knowledge boundaries', body: 'Acknowledge what is outside the supplied knowledge and avoid sensitive subjects.' },
  { title: 'Project conversations', body: 'Guide the conversation back to my work and the ideas behind it.' },
];
