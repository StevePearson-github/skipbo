import { resolve } from 'path'
import { defineConfig } from 'vite'

// Plain web build of the renderer, wrapped by Capacitor for Android.
export default defineConfig({
  root: resolve(__dirname, 'src/renderer'),
  base: './',
  build: { outDir: resolve(__dirname, 'build/web'), emptyOutDir: true, target: 'es2022' },
})
