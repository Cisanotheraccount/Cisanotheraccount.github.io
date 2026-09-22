/** The URL is the only language selector; no browser preference or stored override. */
export type Locale = 'en' | 'zh-CN';
export const locale: Locale = typeof location !== 'undefined' && /^\/zh(?:\/|$)/.test(location.pathname) ? 'zh-CN' : 'en';
export const isChinese = locale === 'zh-CN';
export type Translations = Readonly<Record<string, string>>;
export const translate = (text: string, translations: Translations): string => isChinese ? translations[text] ?? text : text;

/** Apply an exact, reviewed copy map, retaining all structural keys and numbers. */
export function translateTree<T>(value: T, translations: Translations): T {
  if (!isChinese) return value;
  if (typeof value === 'string') return (translations[value] ?? value) as T;
  if (Array.isArray(value)) return value.map(item => translateTree(item, translations)) as T;
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, translateTree(item, translations)])) as T;
  return value;
}

/** Known navigation destinations only. Asset URLs must never use this helper. */
export function sitePath(destination: 'home' | 'photography'): string {
  return destination === 'home' ? (isChinese ? '/zh/' : '/') : (isChinese ? '/zh/photography/' : '/photography/');
}
