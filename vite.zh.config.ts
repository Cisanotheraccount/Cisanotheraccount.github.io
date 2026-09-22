import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
// @ts-expect-error The shared build helper is a checked JavaScript module.
import { chineseHtml } from './scripts/zh-html.mjs';
// @ts-expect-error The runtime projection is covered by the Chinese release checks.
import { thumbnailRuntimeManifest } from './scripts/zh-runtime-data.mjs';

export default defineConfig({
  base: '/',
  plugins: [{
    name: 'galaxci-chinese-runtime-data',
    enforce: 'pre',
    async load(id) {
      if (!id.endsWith('/public/v2-1/thumbnails/manifest.json')) return null;
      const manifest = JSON.parse(await readFile(id, 'utf8'));
      return JSON.stringify(thumbnailRuntimeManifest(manifest));
    },
  }, react(), {
    name: 'galaxci-chinese-entry',
    transformIndexHtml: { order: 'pre', handler(html, context) {
      if (html.includes('<html lang="zh-CN">')) return html;
      return chineseHtml(html, context.filename.includes('photography'));
    } },
    configureServer(server) {
      server.middlewares.use(async (request, response, next) => {
        const url = new URL(request.url ?? '/', 'http://localhost');
        if (!/^\/zh(?:\/photography)?\/?(?:index\.html)?$/.test(url.pathname)) return next();
        try {
          const photo = url.pathname.includes('/photography');
          const html = chineseHtml(await readFile(path.join(server.config.root, photo ? 'photography/index.html' : 'v2-3/index.html'), 'utf8'), photo);
          response.setHeader('Content-Type', 'text/html; charset=utf-8');
          response.end(await server.transformIndexHtml(url.pathname, html));
        } catch (error) { next(error as Error); }
      });
    },
  }],
  build: { copyPublicDir: false, assetsDir: 'assets/zh', rollupOptions: { input: { portfolio: 'v2-3/index.html', photography: 'photography/index.html' }, output: { assetFileNames: asset => (asset.names?.[0] ?? asset.name ?? '').endsWith('.css') ? 'assets/zh/[name]-[hash][extname]' : 'assets/2-3/[name]-[hash][extname]' } } },
  server: { host: '127.0.0.1', port: 5218, strictPort: true, watch: { ignored: ['**/内容资料/**', '**/.cache/**', '**/versions/**'] } },
});
