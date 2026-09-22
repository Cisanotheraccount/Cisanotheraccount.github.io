import { hypnosCockpitCase } from './cases/hypnosCockpitContent';
import { dealPointsCase } from './cases/dealPointsContent';
import { orbitCase } from './cases/orbitContent';
import { psytrainCase } from './cases/psytrainContent';
import type { HarvardCaseData } from './harvardCaseTypes';
import { localizeHarvard } from '../localization/harvard';

const cases: Record<string, HarvardCaseData> = {
  psytrain: localizeHarvard(psytrainCase),
  'hypnos-cockpit': localizeHarvard(hypnosCockpitCase),
  'deal-points': localizeHarvard(dealPointsCase),
  orbit: localizeHarvard(orbitCase),
};
export const harvardCase = (slug: string): HarvardCaseData | undefined => cases[slug];
