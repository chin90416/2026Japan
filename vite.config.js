import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  base: '/2026Japan/',
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'firebase-vendor': ['firebase/app', 'firebase/auth', 'firebase/firestore', 'firebase/functions'],
          'dnd-vendor': ['@dnd-kit/core', '@dnd-kit/sortable', '@dnd-kit/utilities']
        }
      }
    }
  },
  server: {
    open: true
  }
})
