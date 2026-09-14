'use client'
import {
  Croissant, Coffee, Soup, UtensilsCrossed, BedDouble, Compass, Tag, LucideIcon,
} from 'lucide-react'
import type { Event } from '@/types'

/* Un hueco cuidado, no un hueco vacío.
 *
 * Hay eventos que no tienen nada que enseñar todavía: un "Desayuno" sin sitio
 * decidido no admite ni foto ni vídeo. Antes dejaban un agujero en la tira de
 * miniaturas.
 *
 * La alternativa habría sido una foto de archivo de un desayuno cualquiera,
 * pero eso miente: no es ese desayuno ni es ese sitio. Se dibuja en su lugar,
 * con el color de su categoría y el icono de lo que es, y se lee al momento
 * como "esto está por decidir".
 */

// Fondo claro, fondo oscuro y tinta, por categoría. Los mismos colores que la
// cuadrícula, para que no parezca traído de otra aplicación.
const PALETA: Record<string, [string, string, string]> = {
  meal:      ['#FEF7E0', '#FDE68A', '#B45309'],
  hotel:     ['#ECFDF5', '#A7F3D0', '#047857'],
  activity:  ['#F5F3FF', '#DDD6FE', '#6D28D9'],
  transport: ['#EFF6FF', '#BFDBFE', '#1D4ED8'],
  other:     ['#F8FAFC', '#E2E8F0', '#475569'],
}

function iconoDe(ev: Event): LucideIcon {
  const t = (ev.title || '').toLowerCase()
  if (ev.category === 'meal') {
    if (t.includes('desayuno')) return Croissant
    if (t.includes('café') || t.includes('cafe')) return Coffee
    if (t.includes('cena') || t.includes('soba') || t.includes('ramen')) return Soup
    return UtensilsCrossed
  }
  if (ev.category === 'hotel') return BedDouble
  if (ev.category === 'activity') return Compass
  return Tag
}

/** ¿Merece la pena dibujar algo para este evento? Un traslado de metro, no. */
export function seIlustra(ev: Event): boolean {
  return ['meal', 'hotel', 'activity'].includes(ev.category)
}

export default function Ilustracion({ ev, className = '' }: { ev: Event; className?: string }) {
  const [claro, oscuro, tinta] = PALETA[ev.category] || PALETA.other
  const Icono = iconoDe(ev)
  return (
    <div className={`relative flex items-center justify-center overflow-hidden ${className}`}
      style={{ background: `linear-gradient(135deg, ${claro} 0%, ${oscuro} 100%)` }}
      aria-hidden="true">
      {/* Un círculo apenas visible detrás del icono, para que el degradado no
          se quede plano. */}
      <span className="absolute rounded-full"
        style={{ width: '58%', aspectRatio: '1', background: '#FFFFFF', opacity: .38 }} />
      <Icono size={36} strokeWidth={1.3} className="relative" style={{ color: tinta, opacity: .7 }} />
    </div>
  )
}
