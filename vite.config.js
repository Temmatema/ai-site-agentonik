import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base './' lets the built site work from any path (GitHub Pages, a subfolder, a file server).
export default defineConfig({
  base: './',
  plugins: [react()],
  build: { target: 'es2020' },
});
