import { defineConfig } from 'vite';

// Un único archivo ES module: dist/inventa-cards.js (lo que se copia a /config/www).
export default defineConfig({
  build: {
    lib: {
      entry: 'src/index.ts',
      formats: ['es'],
      fileName: () => 'inventa-cards.js',
    },
    outDir: 'dist',
    target: 'es2021',
    minify: 'esbuild',
    sourcemap: false,
  },
});
