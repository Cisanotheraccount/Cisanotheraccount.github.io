import { hypnosCockpitCase } from './cases/hypnosCockpitContent';
import { dealPointsCase } from './cases/dealPointsContent';
import { orbitCase } from './cases/orbitContent';
import type { HarvardCaseData } from './harvardCaseTypes';

const cases: Record<string, HarvardCaseData> = {
  'hypnos-cockpit': hypnosCockpitCase,
  'deal-points': dealPointsCase,
  orbit: orbitCase,
};
export const harvardCase = (slug: string): HarvardCaseData | undefined => cases[slug];
