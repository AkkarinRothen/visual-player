import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Capacitor } from '@capacitor/core'
import { toast } from 'sonner'
import './index.css'
import App from './App.tsx'

if (!Capacitor.isNativePlatform() && 'serviceWorker' in navigator) {
  void import('virtual:pwa-register').then(({ registerSW }) => {
    registerSW({
      immediate: true,
      onNeedRefresh() {
        toast('Hay una actualización de Visual Player disponible.', {
          description: 'Aplicala cuando termine la escena actual.',
          duration: Infinity,
          action: {
            label: 'Actualizar',
            onClick: () => window.location.reload(),
          },
        })
      },
      onOfflineReady() {
        toast.success('Visual Player está listo para usarse sin conexión.', {
          duration: 4200,
        })
      },
    })
  })
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
