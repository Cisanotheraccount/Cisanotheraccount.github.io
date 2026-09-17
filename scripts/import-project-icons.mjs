import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { inflateSync } from 'node:zlib';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const defaultOutput = path.join(root, 'public/v-next/project-marks');
const defaultSource = path.join(root, '内容资料/06_网站图标/项目图标');
const slugs = ['psytrain', 'shotflow', 'introme', 'hypnos-cockpit', 'deal-points', 'orbit'];
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const json = value => JSON.stringify(value, null, 2) + '\n';
const fail = message => { throw new Error(message); };

function svgInfo(bytes) {
  const svg = bytes.toString('utf8');
  if (/<!DOCTYPE|<!ENTITY/i.test(svg)) fail('SVG 不允许 DOCTYPE 或实体声明，请导出为独立纯 SVG。');
  if (/<(?:[\w.-]+:)?(?:script|foreignObject|iframe|object|embed|image|link)\b/i.test(svg)) fail('SVG 包含脚本、嵌入内容或图片；请使用纯矢量轮廓，复杂图片请改用透明 PNG。');
  if (/<(?:[\w.-]+:)?(?:text|tspan|textPath)\b/i.test(svg)) fail('SVG 仍包含文字，请先将文字转为轮廓，避免依赖字体。');
  if (/\son[\w:-]+\s*=/i.test(svg)) fail('SVG 包含事件处理属性，请移除交互代码后重新导出。');
  if (/@(?:import|font-face)|font-family\s*[:=]/i.test(svg)) fail('SVG 包含字体或样式依赖，请将文字转轮廓并嵌入图形样式。');
  for (const [, reference] of svg.matchAll(/(?:\b(?:xlink:)?href|\bsrc)\s*=\s*["']([^"']*)["']/gi)) {
    if (!/^#[A-Za-z_][\w:.-]*$/.test(reference)) fail('SVG 的 href/src 只能引用文件内的 #id，不能依赖外部文件或 data URL。');
  }
  for (const [, reference] of svg.matchAll(/url\(\s*([^)]*?)\s*\)/gi)) {
    if (!/^['"]?#[A-Za-z_][\w:.-]*['"]?$/.test(reference)) fail('SVG 的 url() 只能引用文件内渐变或蒙版，不能引用外部资源。');
  }
  if (/\\|<!\[CDATA\[/i.test(svg)) fail('SVG 包含转义样式或 CDATA，请导出为展开的纯 SVG 属性。');
  // A small XML structure check catches broken exports without an XML dependency.
  const markup = svg.replace(/<!--[\s\S]*?-->/g, '').replace(/^\s*<\?xml[^?]*\?>/, '').trim();
  const tokens = markup.match(/<(?:(?:"[^"]*"|'[^']*'|[^'">])*)>/g) ?? [];
  if (!/^<svg(?:\s|>)/i.test(markup) || !tokens.length) fail('文件不是有效的 SVG 根节点。');
  const stack = [];
  let rootClosed = false;
  for (const token of tokens) {
    const name = token.match(/^<\/?([\w:.-]+)/)?.[1];
    if (!name || rootClosed) fail('SVG 标签结构不完整或包含额外根节点。');
    if (token.startsWith('</')) {
      if (stack.pop() !== name) fail('SVG 开始和结束标签不匹配。');
      rootClosed = stack.length === 0;
    } else if (!token.endsWith('/>')) stack.push(name);
    else if (!stack.length) rootClosed = true;
  }
  if (stack.length || !rootClosed) fail('SVG 未完整关闭，请重新导出。');
  const attributes = Object.fromEntries([...tokens[0].matchAll(/([\w:-]+)\s*=\s*["']([^"']*)["']/g)].map(([, key, value]) => [key, value]));
  const viewBox = attributes.viewBox?.trim().split(/[\s,]+/).map(Number);
  const dimension = value => /^\d+(?:\.\d+)?(?:px)?$/.test(value ?? '') ? parseFloat(value) : NaN;
  const width = viewBox?.[2] ?? dimension(attributes.width), height = viewBox?.[3] ?? dimension(attributes.height);
  if ((viewBox && (viewBox.length !== 4 || !viewBox.every(Number.isFinite))) || !Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) fail('SVG 必须带有效的 viewBox 或正数 width / height。');
  return { format: 'svg', width, height, warnings: width === height ? [] : ['非方形 SVG 将等比居中显示，不拉伸或裁切。'] };
}

function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function pngInfo(bytes) {
  if (!bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) fail('PNG 文件签名无效；不要只修改其他格式的扩展名。');
  let offset = 8, width = 0, height = 0, colorType = -1, complete = false, transparency = false, profile = false;
  const compressed = [];
  while (offset + 12 <= bytes.length) {
    const size = bytes.readUInt32BE(offset), end = offset + 12 + size;
    if (end > bytes.length) fail('PNG 数据被截断，请重新导出。');
    const type = bytes.toString('ascii', offset + 4, offset + 8), data = bytes.subarray(offset + 8, end - 4);
    if (crc32(bytes.subarray(offset + 4, end - 4)) !== bytes.readUInt32BE(end - 4)) fail(`PNG 的 ${type} 数据校验失败，请重新导出。`);
    if (offset === 8 && type !== 'IHDR') fail('PNG 缺少首个 IHDR 图像头。');
    if (type === 'IHDR') {
      if (width || size !== 13) fail('PNG 的 IHDR 图像头无效。');
      width = data.readUInt32BE(0); height = data.readUInt32BE(4); colorType = data[9];
      if (!width || !height || width > 4096 || height > 4096) fail('PNG 宽高需在 1–4096px 之间；建议导出为 1024 × 1024。');
    }
    if (type === 'IDAT') compressed.push(data);
    if (type === 'tRNS') transparency = true;
    if (type === 'iCCP') profile = true;
    if (type === 'IEND') { complete = true; offset = end; break; }
    offset = end;
  }
  if (!complete || !compressed.length || offset !== bytes.length) fail('PNG 缺少图像数据、结尾或包含额外损坏数据。');
  try { inflateSync(Buffer.concat(compressed), { maxOutputLength: 140 * 1024 * 1024 }); }
  catch { fail('PNG 图像数据无法解压，请重新导出。'); }
  const warnings = [];
  if (width !== height) warnings.push('非方形 PNG 将等比居中显示，不拉伸或裁切。');
  if (![4, 6].includes(colorType) && !transparency) warnings.push('PNG 没有透明通道；建议透明背景以保留清透效果。');
  if (Math.min(width, height) < 128) warnings.push('PNG 小于图集的 128px 采样尺寸；建议使用 1024px 原图。');
  if (profile) warnings.push('PNG 含 ICC 配置；请确认已导出为 sRGB，导入命令不更改颜色。');
  return { format: 'png', width, height, warnings };
}

export function validateIcon(bytes, extension) {
  if (bytes.length > 32 * 1024 * 1024) fail('图标超过 32MB，请使用网页适用的 SVG 或 1024px PNG。');
  return extension === '.svg' ? svgInfo(bytes) : extension === '.png' ? pngInfo(bytes) : fail('仅支持 icon.svg 或 icon.png。');
}

export async function importProjectIcons({ source = defaultSource, output = defaultOutput, dryRun = false } = {}) {
  const sourceRoot = path.resolve(source), outputRoot = path.resolve(output);
  const manifestFile = path.join(outputRoot, 'manifest.json');
  const baseline = existsSync(manifestFile) ? manifestFile : path.join(defaultOutput, 'manifest.json');
  const manifest = JSON.parse(await readFile(baseline, 'utf8'));
  if (manifest.schemaVersion !== 1 || !manifest.projects) fail('图标 manifest 版本不匹配。');
  const updates = [], warnings = [], errors = [];
  for (const slug of slugs) {
    const candidates = ['icon.svg', 'icon.png'].map(file => path.join(sourceRoot, slug, file)).filter(existsSync);
    if (candidates.length > 1) { errors.push(`${slug}: 同时存在 icon.svg 和 icon.png，请只保留要发布的一个。`); continue; }
    if (!candidates.length) continue;
    try {
      const sourceFile = candidates[0], bytes = await readFile(sourceFile), extension = path.extname(sourceFile);
      const info = validateIcon(bytes, extension), digest = hash(bytes), current = manifest.projects[slug];
      if (!current) fail('manifest 缺少该项目的固定 slug。');
      warnings.push(...info.warnings.map(warning => `${slug}: ${warning}`));
      if (current.status === 'user-supplied' && current.sha256 === digest && existsSync(path.join(outputRoot, current.file))) continue;
      const file = `${slug}.${digest.slice(0, 16)}${extension}`;
      updates.push({ slug, file, bytes });
      manifest.projects[slug] = {
        file, fallbackFile: current.fallbackFile, shortName: current.shortName, status: 'user-supplied',
        sha256: digest, format: info.format, width: info.width, height: info.height,
        provenance: { kind: 'user-supplied', source: `${slug}/${path.basename(sourceFile)}`, importedAt: new Date().toISOString(), note: 'Original bytes copied without recoloring, cropping or stretching. Original retained in the private content library.' },
      };
    } catch (error) { errors.push(`${slug}: ${error.message}`); }
  }
  // Validate the entire batch before publishing any changes.
  if (errors.length) fail(errors.join('\n'));
  if (!dryRun && updates.length) {
    await mkdir(outputRoot, { recursive: true });
    for (const update of updates) {
      const destination = path.join(outputRoot, update.file);
      if (existsSync(destination) && hash(await readFile(destination)) !== hash(update.bytes)) fail(`文件名冲突：${update.file}。未覆盖现有文件。`);
    }
    for (const update of updates) await writeFile(path.join(outputRoot, update.file), update.bytes);
    // Custom output folders are self-contained, including all provisional fallbacks.
    for (const record of Object.values(manifest.projects)) {
      for (const file of new Set([record.file, record.fallbackFile])) {
        const destination = path.join(outputRoot, file);
        if (!existsSync(destination)) await writeFile(destination, await readFile(path.join(defaultOutput, file)));
      }
    }
    await writeFile(manifestFile, json(manifest));
  }
  return { dryRun, updated: updates.map(({ slug, file }) => ({ slug, file })), unchanged: slugs.length - updates.length, warnings };
}

async function main() {
  const args = process.argv.slice(2), options = {};
  for (let index = 0; index < args.length; index++) {
    const arg = args[index];
    if (arg === '--dry-run') options.dryRun = true;
    else if (['--source', '--output'].includes(arg) && args[index + 1] && !args[index + 1].startsWith('--')) options[arg.slice(2)] = args[++index];
    else if (arg === '--help') {
      console.log('npm run assets:icons -- [--dry-run] [--source <folder>] [--output <folder>]\nMissing source icons keep the current artwork. SVG and PNG in the same project folder is an error.');
      return;
    } else fail(`未知或不完整参数：${arg}`);
  }
  console.log(json(await importProjectIcons(options)));
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch(error => { console.error(error.message); process.exitCode = 1; });
