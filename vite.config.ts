import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  // build: {
  //   rollupOptions: {
  //     output: {
  //       manualChunks: {
  //         'tensorflow': ['@tensorflow/tfjs'],
  //         'coco-ssd': ['@tensorflow-models/coco-ssd'],
  //       }
  //     }
  //   }
  // },
  // optimizeDeps: {
  //   exclude: ['@tensorflow/tfjs', '@tensorflow-models/coco-ssd']
  // },
  server: {
    host: true,
    port: 5173, 
  }  
})
