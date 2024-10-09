import { defineConfig } from 'vite'

export default defineConfig({
  server: {
    port: 3300,
    strictPort: true
  },
  build: {
    outDir: 'dist',
    minify: false
  }
})
