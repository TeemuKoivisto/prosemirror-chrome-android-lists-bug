import path from 'path'
import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        index: path.resolve('./index.html')
      }
    },
    minify: false
  }
})
