import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  root: '.',
  base: '/my-game/',
  build: {
    outDir: 'dist',
    emptyOutDir: true
  }
})
