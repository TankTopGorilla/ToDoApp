import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  root: 'src/electron/renderer',
  // THIS IS CRITICAL: For Electron to work with the file:// protocol, base must be './'.
  base: './',
  build: {
    // Redirecting outDir to the dist folder at the root directory
    outDir: path.resolve(__dirname, 'dist'),
    emptyOutDir: true,
    // Ensure the assets directory is correctly configured
    assetsDir: 'assets',
  },
  server: {
    port: 5173,
    strictPort: true,
  },
  resolve: {
    alias: {
      '~': path.resolve(__dirname, 'src'),
    },
  },
});
