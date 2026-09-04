import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  // GitHub Pages serve o site em https://<user>.github.io/chess-pwa/,
  // então os assets precisam ser resolvidos a partir desse subcaminho.
  base: '/chess-pwa/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Xadrez PWA',
        short_name: 'Xadrez',
        description: 'Jogo de xadrez sem propaganda: 2 jogadores ou contra o computador.',
        lang: 'pt-BR',
        theme_color: '#312e2b',
        background_color: '#312e2b',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/chess-pwa/',
        scope: '/chess-pwa/',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
})
