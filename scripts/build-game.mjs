import { build } from 'vite';
import { fileURLToPath } from 'node:url';

await build({
  configFile: false,
  root: fileURLToPath(new URL('../games/hidden-layers-of-truth/', import.meta.url)),
  base: './',
  build: {
    outDir: fileURLToPath(new URL('../public/hidden-layers-of-truth/', import.meta.url)),
    emptyOutDir: true,
  },
});
