import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';
import { chineseHtml } from './zh-html.mjs';
import { digest, ownsZh, verifyZh } from './zh-release.mjs';
import { thumbnailRuntimeManifest, assertPublicRuntime } from './zh-runtime-data.mjs';

const root = path.resolve(import.meta.dirname, '..');
const originalThumbnails = JSON.parse(await readFile(path.join(root, 'public/v2-1/thumbnails/manifest.json'), 'utf8'));
const runtimeThumbnails = thumbnailRuntimeManifest(originalThumbnails);
for (const [slug, project] of Object.entries(originalThumbnails.projects)) {
  assert.deepEqual(runtimeThumbnails.projects[slug].images, project.images.map(({ id, variants }) => ({ id, variants })), 'Thumbnail runtime projection must preserve every public variant and its order');
}
assertPublicRuntime(JSON.stringify(runtimeThumbnails), 'thumbnail runtime fixture');
for (const code of ['"内容资料/private.jpg"', '"/Users/example/archive.jpg"', '"\\u5185\\u5bb9\\u8d44\\u6599/private.jpg"']) {
  assert.throws(() => assertPublicRuntime(code, 'private fixture'), /Private workspace provenance/);
}
const testRoot = path.join(root, '.cache/zh-20260922/test');
await rm(testRoot, { recursive: true, force: true });
await mkdir(testRoot, { recursive: true });

function walkValues(value, visit, key = '') {
  if (typeof value === 'string') visit(value, key);
  else if (Array.isArray(value)) value.forEach(item => walkValues(item, visit, key));
  else if (value && typeof value === 'object') Object.entries(value).forEach(([childKey, child]) => walkValues(child, visit, childKey));
}
function structure(value, key = '') {
  if (Array.isArray(value)) return value.map(item => structure(item, key));
  if (!value || typeof value !== 'object') {
    if (typeof value !== 'string') return value;
    return /^(?:id|slug|sourceNode|sourceNodes|sourceFrame|coverFrame|image|imageSmall|src|srcSet|sizes|url|href|provider|layout|width|height|bytes|format|hdr)$/i.test(key) || value.startsWith('/') || /^https?:\/\//.test(value)
      ? value
      : '<display-copy>';
  }
  return Object.fromEntries(Object.entries(value).map(([childKey, child]) => [childKey, structure(child, childKey)]));
}
function urls(value) {
  const found = [];
  walkValues(value, (text, key) => {
    if (/^(?:image|imageSmall|src|srcSet|url|href)$/i.test(key) || text.startsWith('/') || /^https?:\/\//.test(text)) found.push([key, text]);
  });
  return found.sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
}
async function bundle(entry, name) {
  const outfile = path.join(testRoot, name);
  const result = await build({
    stdin: { contents: entry, resolveDir: root, sourcefile: `${name}.ts` },
    bundle: true,
    platform: 'node',
    format: 'esm',
    target: 'node20',
    loader: { '.webp': 'file', '.png': 'file', '.jpg': 'file', '.jpeg': 'file', '.mp4': 'file' },
    assetNames: 'media/[name]-[hash]',
    outfile,
    write: false,
    logLevel: 'silent',
  });
  for (const output of result.outputFiles) {
    await mkdir(path.dirname(output.path), { recursive: true });
    await writeFile(output.path, output.contents);
  }
  return outfile;
}
let importSerial = 0;
async function importAt(file, pathname, browserLanguage = 'en-US') {
  const locationDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'location');
  const navigatorDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  Object.defineProperty(globalThis, 'location', { configurable: true, value: { pathname } });
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { language: browserLanguage, languages: [browserLanguage] } });
  try { return await import(`${pathToFileURL(file).href}?case=${++importSerial}`); }
  finally {
    if (locationDescriptor) Object.defineProperty(globalThis, 'location', locationDescriptor);
    else delete globalThis.location;
    if (navigatorDescriptor) Object.defineProperty(globalThis, 'navigator', navigatorDescriptor);
    else delete globalThis.navigator;
  }
}

// Exercise the real URL-selected locale module in a fresh bundled module for each path.
const localeEntry = `export * from './src/localization/locale.ts';`;
const localeCases = [
  ['/zh', true], ['/zh/', true], ['/zh/photography', true], ['/zh/photography/', true],
  ['/', false], ['/photography/', false], ['/galaxci/2.3/', false], ['/zh-extra/', false],
];
for (const [index, [pathname, chinese]] of localeCases.entries()) {
  const file = await bundle(localeEntry, `locale-${index}.mjs`);
  const locale = await importAt(file, pathname, chinese ? 'en-US' : 'zh-CN');
  assert.equal(locale.isChinese, chinese, `locale for ${pathname} must be selected by path only`);
  assert.equal(locale.locale, chinese ? 'zh-CN' : 'en');
  assert.equal(locale.sitePath('home'), chinese ? '/zh/' : '/');
  assert.equal(locale.sitePath('photography'), chinese ? '/zh/photography/' : '/photography/');
  assert.equal(locale.sitePath('photography') + '#concert', `${chinese ? '/zh/photography/' : '/photography/'}#concert`);
}

// Route and asset strings survive actual translateTree calls unchanged.
const contentEntry = `
  import { workProjects, portfolioProjects, portfolioContact } from './src/v2-3/content/portfolioData.ts';
  import rawGalleries from './src/v2-3/content/projectGalleries.json';
  import { localizeMain } from './src/localization/main.ts';
  import { harvardCase } from './src/v2-3/harvardCaseContent.ts';
  import { introMePresentation, introMeMedia, introMeExplorations, introMeRecordingStates, introMeKnowledge, introMeVoice, introMeIntent, introMeLimits } from './src/v2-3/introMeCaseContent.ts';
  import { shotFlowCaseScreens, shotFlowCaseCover } from './src/v2-3/shotflowCaseContent.ts';
  import { shotFlowCapture, shotFlowThreeCapture, shotFlowWalkthrough } from './src/v2-3/shotflowWalkthrough.ts';
  import { locale, isChinese } from './src/localization/locale.ts';
  export { workProjects, portfolioProjects, portfolioContact, rawGalleries, localizeMain, harvardCase, locale, isChinese };
  export const galleries = localizeMain(rawGalleries);
  export const cases = ['psytrain', 'hypnos-cockpit', 'deal-points', 'orbit'].map(slug => harvardCase(slug));
  export const introMe = { introMePresentation, introMeMedia, introMeExplorations, introMeRecordingStates, introMeKnowledge, introMeVoice, introMeIntent, introMeLimits };
  export const shotFlowCase = { shotFlowCaseScreens, shotFlowCaseCover };
  export const shotFlowDemo = { shotFlowCapture, shotFlowThreeCapture, shotFlowWalkthrough };
`;
const photoEntry = `
  import catalog from './src/photography/catalog.json';
  import { photographyText } from './src/localization/photography.ts';
  import { locale, isChinese } from './src/localization/locale.ts';
  export { catalog, photographyText, locale, isChinese };
  export const displayedCatalog = {
    series: catalog.series.map(series => ({ ...series, title: photographyText(series.title) })),
    photos: catalog.photos.map(photo => ({ ...photo, alt: photographyText(photo.alt) })),
  };
`;
const enContent = await importAt(await bundle(contentEntry, 'content-en.mjs'), '/v2-3/', 'zh-CN');
const zhContent = await importAt(await bundle(contentEntry, 'content-zh.mjs'), '/zh/', 'en-US');
assert.equal(enContent.locale, 'en');
assert.equal(enContent.isChinese, false);
assert.equal(zhContent.locale, 'zh-CN');
assert.equal(zhContent.isChinese, true);
assert.deepEqual(zhContent.workProjects.map(project => project.slug), enContent.workProjects.map(project => project.slug), 'Chinese mode must preserve public project order and slugs');
assert.deepEqual(structure(zhContent.workProjects), structure(enContent.workProjects), 'Chinese localization must preserve project structure, IDs, layout, dimensions, and media paths');
assert.deepEqual(urls(zhContent.workProjects), urls(enContent.workProjects), 'Chinese localization must preserve every project URL and asset path');
assert.deepEqual(zhContent.portfolioContact, enContent.portfolioContact, 'Portfolio email and profile links must remain unchanged across locales');
assert.deepEqual(structure(zhContent.cases), structure(enContent.cases), 'Chinese Harvard copy must preserve case, chapter, section, and media structure');
assert.deepEqual(urls(zhContent.cases), urls(enContent.cases), 'Chinese Harvard copy must preserve all image and media paths');
assert.deepEqual(structure(zhContent.galleries), structure(enContent.galleries), 'Gallery translation must preserve IDs, order, and structure');
assert.deepEqual(urls(zhContent.galleries), urls(enContent.galleries), 'Gallery translation must preserve asset paths');
assert.deepEqual(structure(zhContent.introMe), structure(enContent.introMe), 'IntroMe localization must preserve its media, Figma IDs, measurements, and sequence');
assert.deepEqual(urls(zhContent.introMe), urls(enContent.introMe), 'IntroMe localization must preserve every image and Vimeo URL');
assert.deepEqual(structure(zhContent.shotFlowCase), structure(enContent.shotFlowCase), 'ShotFlow case copy must preserve native capture IDs, dimensions, and order');
assert.deepEqual(urls(zhContent.shotFlowCase), urls(enContent.shotFlowCase), 'ShotFlow case localization must preserve source media paths');
assert.deepEqual(structure(zhContent.shotFlowDemo), structure(enContent.shotFlowDemo), 'ShotFlow walkthrough localization must preserve state IDs, layouts, timings, and geometry');
assert.deepEqual(urls(zhContent.shotFlowDemo), urls(enContent.shotFlowDemo), 'ShotFlow walkthrough localization must preserve all recording and capture URLs');
const pathsFixture = { '#/work/psytrain': '#/work/psytrain', '/photography-assets/original.jpg?width=full': '/photography-assets/original.jpg?width=full', 'https://galaxci.com/': 'https://galaxci.com/' };
assert.deepEqual(zhContent.localizeMain(pathsFixture), pathsFixture, 'Hashes, local resources, and full URLs must not be rewritten as copy');

// Visible prose gets Chinese copy; a small exact allowlist covers names and acronyms only.
const properNouns = new Set([
  'Hýpnos Cockpit', 'PsytrAIn', 'ShotFlow', 'IntroMe', 'Deal Points', 'Orbit', 'Cyber City', 'Crystal City', 'Last_One', 'Gala x Ci VR Gallery',
  'AI', 'VR', 'AI / VR', 'Core ML', 'Apple Vision', 'Unreal Engine', 'Vision Pro', 'Photos', 'LinkedIn', 'PG ONE', 'TT', 'Spatial UI', 'UI/UX',
  'Wysa', 'Replika', 'Youper', 'Spring Health', '✕', '✓',
  'ANA By KRAFTON', 'Alita: Battle Angel', 'Rendora 3D AI Avatar', 'R&D', 'Yuhao', 'Jeep', 'Model Y', 'Li L9', 'Dembell', 'VW california',
  'Oura Ring', 'Eight Sleep', 'Physical AI', 'Apple AirTag', 'MemPal', 'Limitless Pendant',
  'Microsoft SenseCam', 'Amazon Echo Look', 'Go-Finder', 'HippoCam', 'Meta Ray-Ban Display', 'Ethan',
  '1', '2', '3', '4', '5', '2011', '2017', '2019', '2021', '2024', '1.5-3%', '1-10%', '13.3%', '26.7%', '23.3%', '10.0%',
  '4.2/5.0', '6.33/10', '7.83/10', '8.17/10', '8.48/10', '7.63/10', '8.60/10', '8.20/10', '8.90/10', '0', '20',
]);
const untranslated = [];
const mainDictionary = JSON.parse(await readFile(path.join(root, 'src/localization/main.zh.json'), 'utf8'));
const harvardDictionary = JSON.parse(await readFile(path.join(root, 'src/localization/harvard.zh.json'), 'utf8'));
const copyField = /^(?:title|subtitle|period|kind|category|role|summary|imageAlt|alt|caption|body|lead|overview|tags|highlights|externalLinks|label|description|tools|action|durationLabel|itemsTitle|columns|rows)$/i;
function checkLocalizedCopy(original, localized, dictionary, context, key = '') {
  if (Array.isArray(original)) {
    assert.ok(Array.isArray(localized), `Localized structure must remain an array at ${context}`);
    assert.equal(localized.length, original.length, `Localized array length must remain stable at ${context}`);
    original.forEach((value, index) => checkLocalizedCopy(value, localized[index], dictionary, `${context}[${index}]`, key));
    return;
  }
  if (original && typeof original === 'object') {
    assert.ok(localized && typeof localized === 'object' && !Array.isArray(localized), `Localized structure must remain an object at ${context}`);
    assert.deepEqual(Object.keys(localized), Object.keys(original), `Localized object keys must stay stable at ${context}`);
    for (const [childKey, value] of Object.entries(original)) checkLocalizedCopy(value, localized[childKey], dictionary, `${context}.${childKey}`, childKey);
    return;
  }
  if (typeof original !== 'string' || !original.trim() || !copyField.test(key)) return;
  const expected = dictionary[original];
  if (expected !== undefined) {
    if (localized !== expected) untranslated.push(`${context}: dictionary mismatch for ${original}`);
    return;
  }
  if (localized === original && properNouns.has(original.trim())) return;
  untranslated.push(`${context}: missing exact dictionary key for ${original}`);
}
checkLocalizedCopy(enContent.workProjects, zhContent.workProjects, mainDictionary, 'projects');
checkLocalizedCopy(enContent.galleries, zhContent.galleries, mainDictionary, 'galleries');
checkLocalizedCopy(enContent.introMe, zhContent.introMe, mainDictionary, 'introMe');
checkLocalizedCopy(enContent.shotFlowCase, zhContent.shotFlowCase, mainDictionary, 'shotFlowCase');
checkLocalizedCopy(enContent.shotFlowDemo, zhContent.shotFlowDemo, mainDictionary, 'shotFlowDemo');
checkLocalizedCopy(enContent.cases, zhContent.cases, harvardDictionary, 'harvardCases');
assert.ok(zhContent.workProjects.length === 10, 'The ten approved portfolio projects must remain present');

const enPhoto = await importAt(await bundle(photoEntry, 'photo-en.mjs'), '/photography/', 'zh-CN');
const zhPhoto = await importAt(await bundle(photoEntry, 'photo-zh.mjs'), '/zh/photography/', 'en-US');
assert.equal(enPhoto.locale, 'en');
assert.equal(zhPhoto.locale, 'zh-CN');
assert.equal(zhPhoto.catalog.photos.length, 81);
assert.equal(zhPhoto.catalog.series.length, 9);
assert.deepEqual(zhPhoto.catalog, enPhoto.catalog, 'Photography catalog and matching metadata remain source data in both locales');
assert.deepEqual(zhPhoto.displayedCatalog.photos.map(photo => photo.id), enPhoto.displayedCatalog.photos.map(photo => photo.id));
assert.deepEqual(zhPhoto.displayedCatalog.series.map(series => [series.id, series.category, series.photoIds]), enPhoto.displayedCatalog.series.map(series => [series.id, series.category, series.photoIds]), 'Photography translation must leave category matching keys and photo order intact');
assert.deepEqual(new Set(zhPhoto.catalog.series.map(series => series.category)), new Set(['Landscapes', 'Live']));
const photographyDictionary = JSON.parse(await readFile(path.join(root, 'src/localization/photography.zh.json'), 'utf8'));
const photoAltKeys = new Set(zhPhoto.catalog.photos.map(photo => photo.alt));
const seriesTitleKeys = new Set(zhPhoto.catalog.series.map(series => series.title));
assert.equal([...photoAltKeys].filter(key => Object.hasOwn(photographyDictionary, key)).length, 81, 'Every unique photo alt needs an explicit Chinese translation');
assert.equal([...seriesTitleKeys].filter(key => Object.hasOwn(photographyDictionary, key)).length, 9, 'Every series title needs an explicit Chinese translation');
assert.ok(zhPhoto.displayedCatalog.photos.every(photo => photo.alt === photographyDictionary[zhPhoto.catalog.photos.find(source => source.id === photo.id).alt]), 'Every displayed photo alt must match its exact dictionary translation');
assert.ok(zhPhoto.displayedCatalog.series.every(series => series.title === photographyDictionary[zhPhoto.catalog.series.find(source => source.id === series.id).title]), 'Every displayed series title must match its exact dictionary translation');

// Every literal passed to a production translation function must have an exact dictionary entry.
function stringCallArguments(file, identifiers) {
  const contents = requireSource(file);
  const parsed = ts.createSourceFile(file, contents, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const result = [];
  const visit = node => {
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && identifiers.has(node.expression.text)) {
      const arg = node.arguments[0];
      if (arg) {
        const collect = child => {
          if (ts.isStringLiteral(child) || ts.isNoSubstitutionTemplateLiteral(child)) result.push(child.text);
          else if (ts.isConditionalExpression(child)) { collect(child.whenTrue); collect(child.whenFalse); }
          else if (ts.isParenthesizedExpression(child) || ts.isAsExpression(child) || ts.isTypeAssertionExpression(child)) collect(child.expression);
        };
        collect(arg);
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(parsed);
  return result;
}
function requireSource(file) { return sourceCache.get(file); }
const sourceCache = new Map();
const translationSources = [
  ...['Portfolio', 'IntroMeCase', 'ShotFlowDemo', 'FilmCase', 'ProjectVideo', 'DetailBrand'].map(name => [`src/v2-3/${name}.tsx`, 't', 'main']),
  ['src/v2-3/HarvardCase.tsx', 'tHarvard', 'harvard'],
  ...['PhotographySite', 'GlassCategoryNav', 'PhotoViewerImage', 'media'].map(name => [`src/photography/${name}.tsx`, 't', 'photography']),
];
for (const [file] of translationSources) sourceCache.set(file, await readFile(path.join(root, file), 'utf8'));
const staticCalls = translationSources.flatMap(([file, identifier, group]) =>
  stringCallArguments(file, new Set([identifier])).map(key => [group, key]));
for (const key of ['work', 'about', 'contact']) staticCalls.push(['main', key]);
const missingStatic = staticCalls.filter(([group, key]) => !Object.hasOwn(({ main: mainDictionary, harvard: harvardDictionary, photography: photographyDictionary })[group], key));
if (missingStatic.length) untranslated.push(...missingStatic.map(([group, key]) => `missing ${group} dictionary key: ${key}`));

// Verify the translated HTML entry transforms preserve its watchdog, recoveries, fallback, and indexability.
const sourcePortfolioHtml = await readFile(path.join(root, 'v2-3/index.html'), 'utf8');
const sourcePhotoHtml = await readFile(path.join(root, 'photography/index.html'), 'utf8');
const chinesePortfolioHtml = chineseHtml(sourcePortfolioHtml);
const chinesePhotoHtml = chineseHtml(sourcePhotoHtml, true);
for (const [html, canonical] of [[chinesePortfolioHtml, 'https://galaxci.com/zh/'], [chinesePhotoHtml, 'https://galaxci.com/zh/photography/']]) {
  assert.match(html, /<html lang="zh-CN">/);
  assert.match(html, /<meta name="robots" content="index,follow"\/>/);
  assert.doesNotMatch(html, /noindex/i);
  assert.ok(html.includes(`<link rel="canonical" href="${canonical}"/>`));
}
for (const expected of ['正在打开 Ci Song 的作品集', '正在准备页面', '进入网站', '重试', '页面加载时间较长，请重试。', '部分页面文件未能加载，请重试。', '此作品集需要 JavaScript。请启用后重新加载页面。']) assert.ok(chinesePortfolioHtml.includes(expected), `Chinese portfolio shell must retain translated startup/fallback copy: ${expected}`);
  assert.ok(chinesePortfolioHtml.includes('setTimeout(') && /later\(\(\) => \{ if \(!bridge\.appReady\) fail\('deadline'\)/.test(chinesePortfolioHtml), 'Portfolio startup watchdog must remain in the Chinese HTML');
assert.ok(chinesePortfolioHtml.includes('gxc-entry-fallback') && chinesePortfolioHtml.includes('data-error=true'), 'Portfolio visual fallback and error state must remain in Chinese HTML');
assert.ok(chinesePortfolioHtml.includes('/src/localization/portfolioEntry.ts'));
assert.ok(chinesePhotoHtml.includes('/src/localization/photographyEntry.ts'));

// Release helpers are exercised only against task-owned fixtures, including bad ownership and bad bytes.
assert.equal(ownsZh('zh/index.html'), true);
assert.equal(ownsZh('zh/photography/index.html'), true);
assert.equal(ownsZh('assets/zh/app-hash123.js'), true);
for (const rel of ['../index.html', 'zh/../index.html', 'index.html', 'assets/app.js', 'assets/zh/asset.bin', '/zh/index.html']) assert.equal(ownsZh(rel), false, `Chinese release ownership must reject ${rel}`);
async function releaseFixture(name, mutation) {
  const dir = path.join(testRoot, name);
  await rm(dir, { recursive: true, force: true });
  await mkdir(path.join(dir, 'zh/photography'), { recursive: true });
  await mkdir(path.join(dir, 'assets/zh'), { recursive: true });
  const entries = [
    ['zh/index.html', '<html lang="zh-CN"><head><link rel="canonical" href="https://galaxci.com/zh/"/></head><script src="/assets/zh/main.js"></script></html>'],
    ['zh/photography/index.html', '<html lang="zh-CN"><head><link rel="canonical" href="https://galaxci.com/zh/photography/"/></head><script src="/assets/zh/main.js"></script></html>'],
    ['assets/zh/main.js', 'export const locale = "zh-CN";'],
  ];
  for (const [rel, content] of entries) await writeFile(path.join(dir, rel), content);
  const files = await Promise.all(entries.map(async ([rel]) => {
    const bytes = await readFile(path.join(dir, rel));
    return { path: rel, bytes: bytes.length, sha256: digest(bytes) };
  }));
  let receipt = { version: 1, locale: 'zh-CN', baseVersion: '2.3', files };
  if (mutation) receipt = await mutation(dir, receipt);
  return { dir, receipt };
}
const goodRelease = await releaseFixture('release-good');
assert.equal((await verifyZh(goodRelease.dir, goodRelease.receipt)).files.length, 3);
const traversalRelease = await releaseFixture('release-traversal', (_dir, receipt) => ({ ...receipt, files: [...receipt.files, { path: '../outside', bytes: 0, sha256: digest(Buffer.alloc(0)) }] }));
await assert.rejects(() => verifyZh(traversalRelease.dir, traversalRelease.receipt), /Invalid Chinese release ownership/);
const missingRelease = await releaseFixture('release-missing', async (dir, receipt) => {
  const files = receipt.files.filter(file => file.path !== 'assets/zh/main.js');
  await rm(path.join(dir, 'assets/zh/main.js'));
  return { ...receipt, files };
});
await assert.rejects(() => verifyZh(missingRelease.dir, { ...missingRelease.receipt, files: [...missingRelease.receipt.files, { path: 'assets/zh/missing.js', bytes: 1, sha256: digest(Buffer.from('x')) }] }), /ENOENT/);
const corruptRelease = await releaseFixture('release-corrupt', async (dir, receipt) => {
  await writeFile(path.join(dir, 'assets/zh/main.js'), 'corrupted');
  return receipt;
});
await assert.rejects(() => verifyZh(corruptRelease.dir, corruptRelease.receipt), /size changed|hash changed/);

const sharedRelease = await releaseFixture('release-shared-media', async (dir, receipt) => {
  const media = Buffer.from('original-media');
  await mkdir(path.join(dir, 'assets/2-3'), { recursive: true });
  await writeFile(path.join(dir, 'assets/2-3/example-hash123.png'), media);
  return { ...receipt, sharedMedia: [{ path: 'assets/2-3/example-hash123.png', bytes: media.length, sha256: digest(media) }] };
});
await verifyZh(sharedRelease.dir, sharedRelease.receipt, { verifyShared: true });
await writeFile(path.join(sharedRelease.dir, 'assets/2-3/example-hash123.png'), 'altered-media!');
await assert.rejects(() => verifyZh(sharedRelease.dir, sharedRelease.receipt, { verifyShared: true }), /Shared media (size|hash) changed/);
await assert.rejects(() => verifyZh(sharedRelease.dir, { ...sharedRelease.receipt, sharedMedia: [{ path: '../outside' }] }), /Invalid shared media dependency/);

// Optional same-name snapshot comparisons strengthen the clean-source assertions when present.
let baselineCompared = false;
if (process.argv.includes('--baseline')) {
  const index = process.argv.indexOf('--baseline');
  const baselineRoot = path.resolve(process.argv[index + 1] ?? path.join(root, '.cache/zh-20260922/before'));
  const portfolioPath = path.join(baselineRoot, 'src/v2-3/content/portfolioData.ts');
  const galleryPath = path.join(baselineRoot, 'src/v2-3/content/projectGalleries.json');
  const harvardPath = path.join(baselineRoot, 'src/v2-3/harvardCaseContent.ts');
  const photoPath = path.join(baselineRoot, 'src/photography/catalog.json');
  for (const file of [portfolioPath, galleryPath, harvardPath, photoPath]) await readFile(file);
  const baselineEntry = `
    import { workProjects } from ${JSON.stringify(portfolioPath)};
    import galleries from ${JSON.stringify(galleryPath)};
    import { harvardCase } from ${JSON.stringify(harvardPath)};
    export { workProjects, galleries };
    export const cases = ['psytrain', 'hypnos-cockpit', 'deal-points', 'orbit'].map(slug => harvardCase(slug));
  `;
  const baseline = await importAt(await bundle(baselineEntry, 'content-baseline.mjs'), '/v2-3/', 'en-US');
  assert.deepEqual(enContent.workProjects, baseline.workProjects, 'The English project copy and media must match the optional pre-Chinese snapshot');
  assert.deepEqual(enContent.rawGalleries, baseline.galleries, 'English galleries must match the optional pre-Chinese snapshot');
  assert.deepEqual(enContent.cases, baseline.cases, 'English Harvard case structure and copy must match the optional pre-Chinese snapshot');
  assert.deepEqual(enPhoto.catalog, JSON.parse(await readFile(photoPath, 'utf8')), 'Photography catalog must match the optional pre-Chinese snapshot');
  baselineCompared = true;
}

if (untranslated.length) {
  await writeFile(path.join(testRoot, 'untranslated.json'), JSON.stringify({ count: untranslated.length, entries: untranslated }, null, 2) + '\n');
  console.error(JSON.stringify({
  untranslatedDisplayFields: untranslated.length - missingStatic.length,
  missingStaticTranslationCalls: missingStatic.length,
  examples: untranslated.slice(0, 30),
  allMissingStaticCalls: missingStatic,
  baselineCompared,
  }, null, 2));
}
assert.equal(untranslated.length, 0, `Untranslated main or Harvard display text and missing static translation keys: ${untranslated.length}`);

console.log(JSON.stringify({
  localePaths: localeCases.length,
  projects: zhContent.workProjects.length,
  harvardCases: zhContent.cases.length,
  photographyPhotos: zhPhoto.catalog.photos.length,
  photographySeries: zhPhoto.catalog.series.length,
  photoAltTranslations: photoAltKeys.size,
  seriesTitleTranslations: seriesTitleKeys.size,
  staticTranslationCalls: staticCalls.length,
  releaseFixtures: 5,
  baselineCompared,
  result: 'passed',
}, null, 2));
