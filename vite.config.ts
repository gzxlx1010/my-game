import { defineConfig } from 'vite'

export default defineConfig({
  base: '/my-game/dist/',
  build: {
    outDir: 'dist'
  }
})
