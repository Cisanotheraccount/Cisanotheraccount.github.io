import translations from './harvard.zh.json';
import { translate, translateTree } from './locale';
import type { HarvardCaseData } from '../v2-3/harvardCaseTypes';

export const tHarvard = (text: string): string => translate(text, translations);
export const localizeHarvard = (data: HarvardCaseData): HarvardCaseData => translateTree(data, translations);
