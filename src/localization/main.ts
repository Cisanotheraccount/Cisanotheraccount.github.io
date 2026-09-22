import mainChinese from './main.zh.json';
import { translate, translateTree } from './locale';

export const t = (text: string) => translate(text, mainChinese);
export const localizeMain = <T,>(value: T): T => translateTree(value, mainChinese);
