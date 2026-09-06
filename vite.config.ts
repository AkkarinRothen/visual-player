import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vitest/config'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return;
          const normalizedId = id.replace(/\\/g, '/');
          if (id.includes('@mui') || id.includes('@emotion')) return 'mui-vendor';
          if (id.includes('@ionic') || id.includes('ionicons')) return 'ionic-vendor';
          if (id.includes('@material/web')) return 'material-vendor';
          if (id.includes('@radix-ui')) return 'radix-vendor';
          if (id.includes('@floating-ui')) return 'floating-vendor';
          if (id.includes('react-aria') || id.includes('@react-aria') || id.includes('@react-stately')) return 'aria-vendor';
          if (
            normalizedId.includes('/node_modules/react/') ||
            normalizedId.includes('/node_modules/react-dom/') ||
            normalizedId.includes('/node_modules/scheduler/')
          ) {
            return 'react-vendor';
          }
          if (id.includes('konva') || id.includes('react-konva')) return 'canvas-vendor';
          if (
            id.includes('dexie') ||
            id.includes('howler') ||
            id.includes('html5-qrcode') ||
            id.includes('peerjs')
          ) {
            return 'runtime-vendor';
          }
          return 'vendor';
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
  },
})

