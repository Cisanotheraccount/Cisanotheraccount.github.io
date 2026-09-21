import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  base: '/',
  plugins: [react()],
  resolve: { alias: { '/fonts': fileURLToPath(new URL('./public/fonts', import.meta.url)) } },
  publicDir: false,
  build: {
    outDir: '.cache/photography-dist',
    emptyOutDir: true,
    assetsDir: 'photography-assets/app',
    rollupOptions: {
      input: 'photography/index.html',
      output: {
        entryFileNames: 'photography-assets/app/[name]-[hash].js',
        chunkFileNames: 'photography-assets/app/[name]-[hash].js',
        assetFileNames: 'photography-assets/app/[name]-[hash][extname]',
      },
    },
  },
  server: { host: '127.0.0.1' },
});
