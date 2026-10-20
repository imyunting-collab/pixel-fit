import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base: './' 讓 App 可以部署在任何子路徑（例如 GitHub Pages 的 /pixel-fit/）
export default defineConfig({
  base: './',
  plugins: [react()],
  build: { target: 'es2020' },
});
