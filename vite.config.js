import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  root: 'frontend',
  publicDir: resolve(__dirname, 'frontend/public'),
  server: {
    port: 3000,
    open: true
  },
  build: {
    outDir: '../dist',
    sourcemap: true,
    emptyOutDir: true
  }
}) 