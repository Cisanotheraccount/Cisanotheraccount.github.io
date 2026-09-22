import { translate } from './locale';
const copy = {
  'Explore projects in the sky': '探索星空中的项目',
  'Explore ': '探索 ',
  'galaxci, a connected glass signature against a starry sky': 'galaxci，星空背景下的连笔玻璃签名',
};
export const sceneText = (text: string) => translate(text, copy);
