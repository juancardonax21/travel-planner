'use client'
import { useEffect, useState } from 'react'
import { WifiOff } from 'lucide-react'

/* Registra el service worker y avisa cuando se pierde la conexión.
   Sin el aviso, la app parecería funcionar pero guardar fallaría en silencio. */
export default function OfflineReady() {
  const [sinRed, setSinRed] = useState(false)

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        // En desarrollo o sin HTTPS puede no registrarse: no es motivo de error.
      })
    }
    const actualizar = () => setSinRed(!navigator.onLine)
    actualizar()
    window.addEventListener('online', actualizar)
    window.addEventListener('offline', actualizar)
    return () => {
      window.removeEventListener('online', actualizar)
      window.removeEventListener('offline', actualizar)
    }
  }, [])

  if (!sinRed) return null
  return (
    <div className="fixed bottom-0 inset-x-0 z-[60] bg-amber-500 text-white text-sm text-center py-2 px-4 flex items-center justify-center gap-2 shadow-lg">
      <WifiOff size={15} strokeWidth={2} />
      Sin conexión: ves la última versión guardada y los cambios no se guardarán.
    </div>
  )
}
