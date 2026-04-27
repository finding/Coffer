import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'
import { copyFileSync, mkdirSync, existsSync, cpSync } from 'fs'

export default defineConfig({
  plugins: [
    vue(),
    {
      name: 'copy-manifest-and-icons',
      closeBundle() {
        copyFileSync('manifest.json', 'dist/manifest.json')
        if (!existsSync('dist/icons')) mkdirSync('dist/icons', { recursive: true })
        cpSync('public/icons', 'dist/icons', { recursive: true })
      }
    }
  ],
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        popup: resolve(__dirname, 'src/popup/index.html'),
        devtools: resolve(__dirname, 'src/devtools/index.html'),
        manager: resolve(__dirname, 'src/manager/index.html'),
        background: resolve(__dirname, 'src/background/index.ts')
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: 'chunks/[name].[hash].js',
        assetFileNames: 'assets/[name].[ext]'
      }
    }
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  }
})
