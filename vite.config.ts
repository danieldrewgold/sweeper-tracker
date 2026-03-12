import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'zustand'],
          'vendor-ui': ['@chakra-ui/react', '@chakra-ui/icons', '@emotion/react', '@emotion/styled', 'framer-motion'],
          'vendor-map': ['leaflet', 'react-leaflet'],
        },
      },
    },
  },
})
