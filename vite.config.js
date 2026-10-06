import { defineConfig } from 'vite';

// base './' lets the built site work from any path (GitHub Pages, a subfolder, a file server).
export default defineConfig({
  base: './',
  build: { target: 'es2020' },
});
