import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  resolve: {
    // Force Vite to always use a single copy of React
    // This fixes "Invalid hook call" caused by duplicate React instances
    dedupe: ['react', 'react-dom', 'react-router-dom'],
  },
})