'use client'
import { useEffect, useState } from 'react'
import { WifiOff } from 'lucide-react'

/* Registra el service worker y avisa cuando se pierde la conexión.
   Sin el aviso, la app parecería funcionar pero guardar fallaría en silencio. */
export default function OfflineReady() {
  const [sinRed, setSinRed] = useState(false)

  useEffect(() => {
    // En desarrollo NO se registra: el caché serviría el HTML de una
    // compilación anterior, que apunta a chunks que ya no existen, y la
    // página saldría en blanco tras cada cambio.
    const enDesarrollo = location.hostname === 'localhost' || location.hostname === '127.0.0.1'
    if ('serviceWorker' in navigator && !enDesarrollo) {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        // Sin HTTPS no se puede registrar: no es motivo de error.
      })
    } else if ('serviceWorker' in navigator && enDesarrollo) {
      navigator.serviceWorker.getRegistrations().then(rs => rs.forEach(r => r.unregister()))
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
