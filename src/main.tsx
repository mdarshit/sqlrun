import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './styles.css'

// Service worker: caches the app shell + SQLite engine so sqlrun keeps
// working with no network at all after the first visit.
if (import.meta.env.PROD) {
  void import('virtual:pwa-register').then(({ registerSW }) => registerSW({ immediate: true }))
}

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
