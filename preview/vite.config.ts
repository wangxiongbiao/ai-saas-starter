import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { paraglideVitePlugin } from '@inlang/paraglide-js';
export default defineConfig({
  root: 'preview',
  resolve: { alias: { '@': new URL('../src', import.meta.url).pathname } },
  define: { 'import.meta.env.VITE_APP_NAME': JSON.stringify('Photo to Dance') },
  plugins: [
    paraglideVitePlugin({
      project: new URL('../project.inlang', import.meta.url).pathname,
      outdir: new URL('../src/paraglide', import.meta.url).pathname,
      outputStructure: 'message-modules',
      strategy: ['baseLocale'],
    }),
    react(),
  ],
  build: { outDir: '../preview-dist', emptyOutDir: true },
});
