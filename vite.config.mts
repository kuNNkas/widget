import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api/tryon': {
        target: 'http://localhost:8787',
        changeOrigin: true
      }
    }
  }
})
