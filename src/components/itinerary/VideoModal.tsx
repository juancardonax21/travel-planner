'use client'
import { useEffect } from 'react'
import { X, ExternalLink } from 'lucide-react'

/* El vídeo, dentro de la aplicación.
 *
 * Abrir YouTube en otra pestaña rompe el hilo: se pierde el plan de vista, se
 * acaba en recomendaciones y hay que volver a buscar dónde se estaba. Aquí el
 * vídeo se ve encima del plan y se cierra con Escape, con la X o pinchando
 * fuera.
 *
 * Hay vídeos cuyo autor prohíbe incrustarlos: en esos el reproductor enseña un
 * aviso de YouTube y no arranca. Por eso el enlace de abajo no sobra.
 */
export default function VideoModal({ videoId, titulo, onClose }:
  { videoId: string; titulo?: string; onClose: () => void }) {

  useEffect(() => {
    const alTeclear = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', alTeclear)
    // El plan de debajo no se desplaza mientras el vídeo está abierto.
    const antes = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', alTeclear)
      document.body.style.overflow = antes
    }
  }, [onClose])

  return (
    <div className="fixed inset-0 z-[60] bg-black/85 flex items-center justify-center p-4"
      onClick={onClose} role="dialog" aria-modal="true" aria-label={titulo || 'Vídeo'}>
      <div className="w-full max-w-3xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between gap-3 mb-2">
          <p className="text-white font-medium truncate">{titulo}</p>
          <button onClick={onClose} aria-label="Cerrar"
            className="flex-shrink-0 text-white/70 hover:text-white transition-colors">
            <X size={22} strokeWidth={2} />
          </button>
        </div>

        <div className="relative w-full overflow-hidden rounded-xl bg-black" style={{ aspectRatio: '16 / 9' }}>
          <iframe className="absolute inset-0 h-full w-full"
            src={`https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`}
            title={titulo || 'Vídeo'}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen />
        </div>

        <a href={`https://www.youtube.com/watch?v=${videoId}`} target="_blank" rel="noreferrer"
          onClick={e => e.stopPropagation()}
          className="mt-2 inline-flex items-center gap-1.5 text-xs text-white/60 hover:text-white transition-colors">
          <ExternalLink size={12} strokeWidth={2} /> Si no arranca, verlo en YouTube
        </a>
      </div>
    </div>
  )
}
