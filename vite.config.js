import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['chiliad-logo.png', 'apple-touch-icon.png', 'favicon.ico'],
      manifest: {
        name: 'Chiliad - 1,000-Day Journey OS',
        short_name: 'Chiliad',
        // Kept in step with package.json so an installed app can report which
        // build it is.
        version: '0.1.24',
        description:
          'Track a 1,000-day journey with daily logs, heatmaps and analytics.',
        theme_color: '#0e0e0e',
        background_color: '#0e0e0e',
        display: 'standalone',
        orientation: 'any',
        start_url: '/',
        scope: '/',
        // Icon paths are generated into public/ at build time by
        // scripts/generate-icons.mjs, so they can never go stale.
        icons: [
          {
            src: 'chiliad-logo.png',
            sizes: '256x256',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'maskable',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // Precache the built app shell so the PWA opens instantly offline.
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
        // Never intercept the sync API: it must always hit the network so the
        // app-level queue in src/lib/sync.js sees real failures and retries.
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/api/'),
            handler: 'NetworkOnly',
          },
        ],
      },
      devOptions: {
        // Keep the SW out of the dev server; it is validated in `npm run build`.
        enabled: false,
      },
    }),
  ],
})
