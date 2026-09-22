import assert from 'node:assert/strict';

export function chineseHtml(html, photography = false) {
  assert(html.includes('<html lang="en">'), 'Chinese entries must be generated from the English template');
  const replacements = photography ? {
    'Photography by Ci Song.': 'Ci Song 的摄影作品。',
    'Ci Song — Photography': 'Ci Song — 摄影作品',
    '/src/photography/main.tsx': '/src/localization/photographyEntry.ts',
  } : {
    'Ci Song — interfaces, experiments, and environments. Explore work across digital and physical worlds.': 'Ci Song — 界面、实验与环境。探索连接数字与现实世界的作品。',
    'Gala X Ci 2.3 — Ci Song': 'Gala X Ci — Ci Song 的作品集',
    "Opening Ci Song's portfolio": '正在打开 Ci Song 的作品集',
    'Interactive Gala X Ci glass logo. Drag or use arrow keys to turn.': '可交互的 Gala X Ci 玻璃标志。拖动或使用方向键旋转。',
    'Preparing your experience': '正在准备页面',
    'Continue to site': '进入网站',
    'Try again': '重试',
    'The page is taking longer than expected. You can try again.': '页面加载时间较长，请重试。',
    'Some page files could not be loaded. Please try again.': '部分页面文件未能加载，请重试。',
    'This portfolio needs JavaScript. Please enable it and reload the page.': '此作品集需要 JavaScript。请启用后重新加载页面。',
    '/src/v2-3/main.tsx': '/src/localization/portfolioEntry.ts',
  };
  for (const [english, chinese] of Object.entries(replacements)) {
    assert(html.includes(english), `Entry template changed; review Chinese copy for: ${english}`);
    html = html.replaceAll(english, chinese);
  }
  // The same startup watchdog also recognizes this build's module namespace.
  html = html.replaceAll('\\/assets\\/2-3\\/', '\\/assets\\/(?:2-3|zh)\\/');
  const canonical = 'https://galaxci.com/zh/' + (photography ? 'photography/' : '');
  return html.replace('<html lang="en">', '<html lang="zh-CN">')
    .replace('</head>', `<link rel="canonical" href="${canonical}"/>\n<meta name="robots" content="index,follow"/>\n</head>`);
}
