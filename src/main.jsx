import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

/**
 * Register the service worker so the app installs standalone and boots
 * offline. Wrapped in a guard: with `devOptions.enabled: false` the virtual
 * module is not injected into the dev server, so a hard import would break
 * `npm run dev`.
 */
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  import('virtual:pwa-register')
    .then(({ registerSW }) => registerSW({ immediate: true }))
    .catch(() => {
      // PWA support is optional; the app runs fine without it.
    })
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
