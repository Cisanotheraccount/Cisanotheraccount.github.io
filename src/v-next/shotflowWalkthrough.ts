export type ShotFlowHotspot = {
  /** Center (x/y) and size, as percentages of the full, uncropped native capture. */
  x: number;
  y: number;
  width: number;
  height: number;
};

export type ShotFlowWalkthroughStep = {
  id: string;
  label: string;
  title: string;
  description: string;
  image: string;
  alt: string;
  action: string;
  guidance?: string;
  hotspot?: ShotFlowHotspot;
  recording?: {
    src: string;
    label: string;
    playHotspot?: ShotFlowHotspot;
    advanceWhenEnded?: boolean;
  };
};

export const shotFlowCaptureSize = { width: 1290, height: 2796 };
const media = '/portfolio/shotflow-walkthrough-v1/';
const nativeHotspot = (left: number, top: number, width: number, height: number): ShotFlowHotspot => ({
  x: left + width / 2, y: top + height / 2, width, height,
});

// This is a guided path through captured app states, with local navigation only.
// Hotspots are measured from the native controls, never inferred from screen order.
// Evidence: v-next/review/shotflow-walkthrough-20260917/native/hotspots.json.
export const shotFlowWalkthrough: readonly ShotFlowWalkthroughStep[] = [
  {
    id: 'workspace', label: 'Project workspace', title: 'Begin with the references.',
    description: 'Start in the project workspace, where source footage, shot review and on-set progress stay together.',
    image: media + 'workspace-1290.webp',
    alt: 'ShotFlow development app: project workspace with reference footage and storyboard actions.',
    action: 'Open storyboard',
    hotspot: nativeHotspot(4.6512, 35.9442, 90.6977, 6.2232),
  },
  {
    id: 'storyboard', label: 'Storyboard', title: 'Review a shot in context.',
    description: 'Open a reference shot from its source group to review the framing and movement.',
    image: media + 'storyboard-1290.webp',
    alt: 'ShotFlow development app: storyboard with reference shots grouped by source video.',
    action: 'Open reference shot',
    hotspot: nativeHotspot(9.3023, 42.9185, 81.3953, 8.1545),
  },
  {
    id: 'player', label: 'Reference playback', title: 'Watch the reference.',
    description: 'Play the reference recording, then continue to the captured trim view.',
    image: media + 'player-1290.webp',
    alt: 'ShotFlow development app: reference playback for the selected shot.',
    action: 'Open trim view',
    hotspot: nativeHotspot(83.2558, 9.9785, 11.1628, 3.8627),
    recording: { src: media + 'reference-playback.mp4', label: 'Play reference recording', playHotspot: nativeHotspot(16.7442, 84.3348, 53.4884, 6.2232) },
  },
  {
    id: 'trim-before', label: 'Trim reference', title: 'Refine the selected range.',
    description: 'Watch a recorded trim adjustment. The next capture shows the selected range.',
    image: media + 'trim-before-1290.webp',
    alt: 'ShotFlow development app: the native trim view before the recorded adjustment.',
    action: 'View trimmed result',
    recording: {
      src: media + 'trim-adjustment.mp4', label: 'Play trim recording', advanceWhenEnded: true,
      // The visible Play cue starts a recorded adjustment; it is not a draggable editor.
      playHotspot: nativeHotspot(4.6512, 51.4664, 90.6977, 3.3262),
    },
  },
  {
    id: 'trim-after', label: 'Confirm trim', title: 'Confirm the selected range.',
    description: 'Review the captured range, then continue to the storyboard after saving and confirming it.',
    image: media + 'trim-after-1290.webp',
    alt: 'ShotFlow development app: the selected trim range after the recorded adjustment.',
    action: 'View saved storyboard',
    guidance: 'The guide continues after Save and the app’s confirmation.',
  },
  {
    id: 'storyboard-updated', label: 'Updated storyboard', title: 'Take the reference on set.',
    description: 'The edited reference is back in its shot list. Continue to the professional-camera guide.',
    image: media + 'storyboard-updated-1290.webp',
    alt: 'ShotFlow development app: the storyboard after confirming the reference trim.',
    action: 'Continue to camera guide',
    guidance: 'The guide passes through the workspace and checklist to open camera guidance.',
  },
  {
    id: 'field', label: 'Camera guide', title: 'Keep track as you shoot.',
    description: 'Review framing and timing beside your camera. Mark this demonstration shot complete to advance.',
    image: media + 'field-1290.webp',
    alt: 'ShotFlow development app: full-frame camera guidance before marking the current shot complete.',
    action: 'Mark this shot complete',
    hotspot: nativeHotspot(4.1860, 89.0558, 91.6279, 6.2232),
  },
  {
    id: 'completed', label: 'Shot completed', title: 'One shot complete.',
    description: 'The app has marked shot 3 complete and advanced to shot 4. Return to the checklist to see the next reference.',
    image: media + 'completed-1290.webp',
    alt: 'ShotFlow development app: completion confirmation after automatically advancing to the next shot.',
    action: 'Return to checklist',
    guidance: 'Closing the camera guide reveals the updated checklist.',
    hotspot: nativeHotspot(5.8140, 9.0129, 10.2326, 4.7210),
  },
  {
    id: 'next-shot', label: 'Next shot', title: 'Ready for the next shot.',
    description: 'Three of six shots are complete, and shot 4 is ready in the checklist. This is the final step of the walkthrough.',
    image: media + 'next-shot-1290.webp',
    alt: 'ShotFlow development app: the next reference shot ready in the on-set checklist.',
    action: 'Finish walkthrough',
  },
];
