import { useEffect } from 'react';
import { useEntryPhase } from './entry';
import { BrandGlass, type GlassScheduler } from '../shared/brandGlass/BrandGlass';
import { requestFrame, subscribeFrame } from './runtime';
import normal from './assets/logo-optics.png';
import mask from './assets/logo-mask.png';
import highlight from './assets/logo-highlight.png';

const readyForBrand = () => !window.__gxcEntry || window.__gxcEntry.phase === 'complete';
const scheduler: GlassScheduler = { subscribe: callback => subscribeFrame(callback, 'overlay'), wake: requestFrame };
/** Same rounded mesh normal field as the entry, sampling the local page in every browser. */
export function LogoGlass() {
  const phase = useEntryPhase();
  useEffect(() => { requestFrame(); }, [phase]); // Also wake when the hero has fallen back to a static image.
  return <BrandGlass enabled={readyForBrand} normal={normal} mask={mask} highlight={highlight} scheduler={scheduler}/>;
}
