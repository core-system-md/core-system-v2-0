import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
// import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'

export default defineConfig({
  plugins: [
    react(),
    // PWA disabled to fix API caching:
    // // VitePWA({
    // registerType: 'autoUpdate',
    // manifest: false,
    // workbox: {
    // globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
    // }
    // })
  ],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
})
