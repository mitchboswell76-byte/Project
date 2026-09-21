import { defineConfig } from 'vite';

export default defineConfig({
  // Relative base so the built site works from a subdirectory or from file://
  base: './',
  server: { host: true, port: 5173 },
  build: {
    target: 'es2020',
    outDir: 'dist',
    assetsInlineLimit: 0, // keep the audio files as real files, not data URIs
    rollupOptions: {
      output: {
        // Split three out so the app code can be re-cached on its own.
        manualChunks: { three: ['three'], gsap: ['gsap'] },
      },
    },
  },
});
