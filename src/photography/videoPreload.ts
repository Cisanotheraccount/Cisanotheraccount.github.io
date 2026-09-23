export const VIDEO_PRELOAD_LIMIT = 2;
export const VIDEO_PRELOAD_TIMEOUT_MS = 4_000;

type NavigatorWithConnection = Navigator & {
  connection?: EventTarget & { saveData?: boolean; effectiveType?: string };
};

export type VideoPreloadEnvironment = {
  fineHover: boolean;
  reducedMotion: boolean;
  saveData: boolean;
  effectiveType?: string;
  visible: boolean;
};

export function allowsVideoPreload(environment: VideoPreloadEnvironment) {
  if (!environment.visible || !environment.fineHover || environment.reducedMotion || environment.saveData) return false;
  return !environment.effectiveType || environment.effectiveType === '4g';
}

export function currentVideoPreloadEnvironment(): VideoPreloadEnvironment {
  const connection = (navigator as NavigatorWithConnection).connection;
  return {
    fineHover: matchMedia('(hover: hover) and (pointer: fine)').matches,
    reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches,
    saveData: connection?.saveData === true,
    effectiveType: connection?.effectiveType,
    visible: document.visibilityState === 'visible',
  };
}

export function browserAllowsVideoPreload() {
  return allowsVideoPreload(currentVideoPreloadEnvironment());
}

export function browserConnection() {
  return (navigator as NavigatorWithConnection).connection;
}
