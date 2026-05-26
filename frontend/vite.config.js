import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    include: [
      '@mediapipe/hands',
      '@mediapipe/camera_utils',
      '@mediapipe/drawing_utils',
    ],
  },
  build: {
    commonjsOptions: {
      include: [/node_modules/],
    },
  },
})
