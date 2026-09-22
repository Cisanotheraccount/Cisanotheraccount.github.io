import manifest from '../../public/v2-1/shotflow-import-v2/manifest.json';
import threeManifest from '../../public/v2-1/shotflow-three-v3/manifest.json';
import presentation from '../../public/v2-1/shotflow-clean-v4/manifest.json';
import { localizeMain } from '../localization/main';

/** Subtitle-free presentation derivatives; original capture metadata stays immutable. */
export const shotFlowAsset = (url: string) => (presentation.replacements as Record<string, string>)[url] ?? url;

/** Top-left bounds, in percent of the complete native capture. */
export type ShotFlowRect = readonly [number, number, number, number];
type StateId = 'projects' | 'new-project' | 'add-reference' | 'photos' | 'selected-video' | 'analysis' | 'workspace' | 'storyboard' | 'player' | 'field';
type Capture = { image: string; width: number; height: number; hotspots: { action: string; rectPercent: ShotFlowRect }[] };
type Shot = { shotId: string; order: number; start: number; end: number; rectInContent: ShotFlowRect };
type ShotFlowManifest = {
  native: { version: string; build: string | number; device: string; screenPixels: readonly [number, number] };
  source: { publicAlias: string; duration: number };
  analysis: { actualSeconds: number; displaySeconds: number; recording: string; engine: string; shots: unknown[] };
  states: Record<StateId, Capture>;
  storyboard: { scrollContent: { image: string; width: number; height: number }; viewportRectPercent: ShotFlowRect; trailingSpace: { width: number; height: number; color: string }; rows: Shot[] };
  representative: { shotId: string; start: number; end: number; media: string; playerVideoRectPercent: ShotFlowRect; poster?: string };
};

// Captures and bounds come from the isolated native run; no simulated shot data.
const originalCapture = localizeMain(manifest as unknown as ShotFlowManifest);
export const shotFlowCapture: ShotFlowManifest = {
  ...originalCapture,
  states: Object.fromEntries(Object.entries(originalCapture.states).map(([id, state]) => [id, { ...state, image: shotFlowAsset(state.image) }])) as Record<StateId, Capture>,
  analysis: { ...originalCapture.analysis, recording: shotFlowAsset(originalCapture.analysis.recording) },
  storyboard: { ...originalCapture.storyboard, scrollContent: { ...originalCapture.storyboard.scrollContent, image: shotFlowAsset(originalCapture.storyboard.scrollContent.image) } },
  representative: { ...originalCapture.representative, media: shotFlowAsset(originalCapture.representative.media), poster: originalCapture.representative.poster ? shotFlowAsset(originalCapture.representative.poster) : undefined },
};
export const shotFlowCaptureSize = { width: shotFlowCapture.native.screenPixels[0], height: shotFlowCapture.native.screenPixels[1] };
export const shotFlowRepresentative = shotFlowCapture.storyboard.rows.find(row => row.shotId === shotFlowCapture.representative.shotId)!;
export const shotFlowShotCount = shotFlowCapture.storyboard.rows.length;

export type DemoShot = {
  shotId: string; order: number; start: number; end: number;
  media: string; poster: string; playerImage: string; videoRectPercent: ShotFlowRect;
  checkbox: { rectInContent: ShotFlowRect; checkedImage: string; uncheckedImage: string };
};
type ThreeShotManifest = {
  shots: DemoShot[];
  ui: {
    workspaceCounter: { rectPercent: ShotFlowRect; background: string; images?: Record<string, string> };
    workspaceProgress: { rectPercent: ShotFlowRect; background: string };
    player: { play: ShotFlowRect; previous: ShotFlowRect; next: ShotFlowRect; close: ShotFlowRect; elapsed: ShotFlowRect; progress: ShotFlowRect };
  };
};
const originalThreeCapture = threeManifest as unknown as ThreeShotManifest;
export const shotFlowThreeCapture: ThreeShotManifest = {
  ...originalThreeCapture,
  shots: originalThreeCapture.shots.map(shot => ({ ...shot, media: shotFlowAsset(shot.media), poster: shotFlowAsset(shot.poster), playerImage: shotFlowAsset(shot.playerImage) })),
};
export const shotFlowDemoShots = shotFlowThreeCapture.shots;
export const shotFlowDemoCount = shotFlowDemoShots.length;

/** The next unfinished demo shot, wrapping in original source order. */
export function nextUnfinishedDemoShot(completed: readonly string[], fromId: string): string | null {
  const from = shotFlowDemoShots.findIndex(shot => shot.shotId === fromId);
  for (let offset = 1; offset <= shotFlowDemoCount; offset += 1) {
    const shot = shotFlowDemoShots[(from + offset) % shotFlowDemoCount];
    if (!completed.includes(shot.shotId)) return shot.shotId;
  }
  return null;
}

type Step = { id: StateId; label: string; title: string; description: string; action: string; kind?: 'analysis' | 'storyboard' | 'player' };
export const shotFlowWalkthrough: readonly Step[] = localizeMain([
  { id: 'projects', label: 'Your projects', title: 'Start with a new project.', description: 'One reference, one place to begin. Tap the new-project control to start this guided example.', action: 'Create a project' },
  { id: 'new-project', label: 'Create project', title: 'Give the reference a home.', description: 'This walkthrough uses a prepared project named Reference Study. Create it to add the source video.', action: 'Create Reference Study' },
  { id: 'add-reference', label: 'Add a reference', title: 'Bring in a video.', description: 'Choose Photos to add the prepared reference from the phone’s photo library.', action: 'Choose from Photos' },
  { id: 'photos', label: 'Photo library', title: 'Choose the reference.', description: 'Select the prepared video in Photos. The original reference is about 96 seconds long.', action: 'Select the reference video' },
  { id: 'selected-video', label: 'Ready to import', title: 'Add it to the project.', description: 'Add the selected video. ShotFlow begins analysis after import; the following recording shows that process with the waiting time condensed.', action: 'Add video and analyze' },
  { id: 'analysis', kind: 'analysis', label: 'Automatic analysis', title: 'Let the video become shots.', description: 'ShotFlow reads the video and finds its shot boundaries. This real analysis was recorded beforehand and condensed to about three seconds for the walkthrough.', action: 'View the project' },
  { id: 'workspace', label: 'Project ready', title: 'A project, ready to explore.', description: `The complete reference has become ${shotFlowShotCount} shots. Open the storyboard to see the result, with its source and timing preserved. Other shot suggestions remain unconfirmed in this build.`, action: 'Open the generated storyboard' },
  { id: 'storyboard', kind: 'storyboard', label: 'Generated storyboard', title: 'See how the reference breaks down.', description: `Scroll through all ${shotFlowShotCount} shots from the actual analysis. Shots 5–7 are available to play and mark complete in this guided example. The other shots remain available to browse.`, action: `Open shot ${shotFlowRepresentative?.order ?? ''}` },
  { id: 'player', kind: 'player', label: 'Reference playback', title: 'Watch the shots, one by one.', description: 'Play three consecutive shots, then move between them to compare framing, timing and movement. Each segment keeps the boundaries produced by the real analysis.', action: 'Play reference shot' },
]);
