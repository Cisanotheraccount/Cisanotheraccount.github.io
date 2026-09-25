import { shotFlowAsset, shotFlowCapture, shotFlowShotCount } from './shotflowWalkthrough';
import { localizeMain } from '../localization/main';

export const shotFlowReferencePreview = {
  image: shotFlowAsset('/v2-1/shotflow-import-v2/representative-shot-poster.webp'),
  alt: 'A frame from the reference video, showing a tram car above a city street.',
  caption: 'One reference video. This frame belongs to the same footage analyzed into 32 shots.',
  width: 1280, height: 720,
};

// Conceptual storyboards of the filming workflow; separate from native UI captures.
const painAssetRoot = '/v2-3/shotflow-painpoints-v1';
export const shotFlowPainPoints = [
  {
    id: 'reference-overload',
    stage: '01 / PREPARING THE SHOOT',
    title: 'A reference isn’t a shooting plan.',
    description: 'A film can show the look you want without giving you a clear list of shots to capture.',
    alt: 'Storyboard illustration of a filmmaker at a desk, surrounded by many overlapping reference-video frames.',
  },
  {
    id: 'repeated-search',
    stage: '02 / STUDYING EACH SHOT',
    title: 'Rewind. Pause. Find it again.',
    description: 'Studying individual shots means repeatedly searching through the same reference.',
    alt: 'Storyboard illustration of the same filmmaker repeatedly seeking and pausing a reference video to find one shot.',
  },
  {
    id: 'on-set-uncertainty',
    stage: '03 / KEEPING TRACK ON SET',
    title: 'What’s still left to shoot?',
    description: 'On set, keeping track of what’s captured—and what’s missing—becomes another task.',
    alt: 'Storyboard illustration of the filmmaker beside a camera on a tripod, checking reference shots and wondering what remains to film.',
  },
].map(point => ({
  ...point,
  image: `${painAssetRoot}/${point.id}.webp`,
  srcSet: `${painAssetRoot}/${point.id}-640.webp 640w, ${painAssetRoot}/${point.id}.webp 1200w`,
  sizes: '(max-width: 760px) calc(100vw - 44px), (max-width: 1000px) calc((100vw - 96px) / 2), (min-width: 1600px) 461px, calc((100vw - 176px) / 3)',
  width: 1200, height: 800,
  caption: point.title,
}));

// The same fictional café frames appear on both sides of the task comparison.
const comparisonAssetRoot = '/v2-3/shotflow-comprehension-v1';
export const shotFlowExampleShots = [
  { id: 'cafe-entrance', label: 'The entrance', task: 'Film the entrance', filmed: true,
    alt: 'Illustration of a café entrance with a glass door and street-facing window.' },
  { id: 'coffee-pour', label: 'The pour', task: 'Film the coffee being poured', filmed: false,
    alt: 'Illustration of coffee being poured from a carafe into a white ceramic cup.' },
  { id: 'cup-handoff', label: 'The handoff', task: 'Film the customer receiving the cup', filmed: false,
    alt: 'Illustration of a customer receiving a white ceramic cup across the café counter.' },
].map(shot => ({
  ...shot,
  image: `${comparisonAssetRoot}/${shot.id}.webp`,
  srcSet: `${comparisonAssetRoot}/${shot.id}-480.webp 480w, ${comparisonAssetRoot}/${shot.id}.webp 960w`,
  width: 960, height: 640,
  caption: shot.label,
}));

const screen = (key: keyof typeof shotFlowCapture.states, alt: string, caption: string) => ({
  image: shotFlowCapture.states[key].image, alt, caption, width: 1290, height: 2796,
});
export const shotFlowCaseScreens = localizeMain([
  screen('workspace', 'ShotFlow Reference Study project after analyzing the complete reference video.', `One reference video, ${shotFlowShotCount} generated shots. The project keeps the source and its shot list together.`),
  screen('analysis', 'ShotFlow analyzing the imported reference video in the native app.', 'A real analysis of the complete reference. The walkthrough condenses the recorded waiting time.'),
  screen('storyboard', 'ShotFlow storyboard showing the shots generated from the reference video.', 'The resulting shots retain their source, sequence and individual timing.'),
  screen('player', 'ShotFlow playing an individual shot from the analyzed reference.', 'Watch the original segment to understand its framing, timing and movement.'),
  screen('add-reference', 'ShotFlow reference import screen with the option to select a video from Photos.', 'Start with a project, then add a reference from the photo library.'),
  screen('field', 'ShotFlow professional-camera guidance for a generated reference shot.', 'Carry the reference and the next action beside the camera.'),
]);
export const shotFlowCaseCover = {
  image: shotFlowCaseScreens[0].image,
  imageSmall: shotFlowAsset('/v2-1/shotflow-import-v2/workspace-800.webp'),
  imageAlt: shotFlowCaseScreens[0].alt,
  imageWidth: 1290,
  imageHeight: 2796,
};
