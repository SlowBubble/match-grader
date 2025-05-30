import { resolve } from 'path'
import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        index: resolve(__dirname, 'index.html'),
        view: resolve(__dirname, 'edit.html'),
        watch: resolve(__dirname, 'watch.html'),
        output: resolve(__dirname, 'output.html'),
      },
    },
  },
})