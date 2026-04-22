import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: {
      outDir: 'out/main',
      lib: {
        entry: 'electron/main/index.ts',
        formats: ['cjs'],
        fileName: () => 'index.js',
      },
    },
    resolve: {
      alias: {
        '@shared': path.resolve('electron/shared'),
      },
    },
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      outDir: 'out/preload',
      lib: {
        entry: 'electron/preload/index.ts',
        formats: ['cjs'],
        fileName: () => 'index.js',
      },
    },
    resolve: {
      alias: {
        '@shared': path.resolve('electron/shared'),
      },
    },
  },
  renderer: {
    root: path.resolve('frontend'),
    build: {
      outDir: path.resolve('out/renderer'),
      emptyOutDir: true,
      rollupOptions: {
        input: path.resolve('frontend/index.html'),
      },
    },
    plugins: [react()],
    resolve: {
      alias: {
        '@shared': path.resolve('electron/shared'),
      },
    },
  },
})
