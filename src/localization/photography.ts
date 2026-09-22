import photographyChinese from './photography.zh.json';
import { translate } from './locale';

/** Exact photography-page copy map. English remains the source copy and fallback. */
export const photographyText = (text: string): string => translate(text, photographyChinese);
