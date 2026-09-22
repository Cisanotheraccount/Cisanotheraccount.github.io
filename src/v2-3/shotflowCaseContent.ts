import { shotFlowAsset, shotFlowCapture, shotFlowShotCount } from './shotflowWalkthrough';
import { localizeMain } from '../localization/main';

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
