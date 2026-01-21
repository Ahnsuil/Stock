import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173, // Changed from 3000 to avoid conflict with Supabase REST API
    host: '0.0.0.0', // Allow access from any IP address
    strictPort: false, // Allow port fallback if 5173 is in use
    open: false // Don't auto-open browser
  },
  preview: {
    port: 5173,
    host: true // same port and network access as dev for one-time setup
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          supabase: ['@supabase/supabase-js'],
          ui: ['lucide-react', 'react-hot-toast'],
          forms: ['react-hook-form'],
          utils: ['date-fns', 'clsx', 'xlsx']
        }
      }
    },
    chunkSizeWarningLimit: 1000
  }
})
