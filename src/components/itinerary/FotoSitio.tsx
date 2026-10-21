'use client'
import { useState } from 'react'
import { fotoDeSitio } from '@/lib/foto'

/* La foto de un sitio, que puede no estar.
 *
 * Las referencias de Google Places caducan, y cuando caducan el navegador
 * pinta el icono de imagen rota: un recuadro gris con una hoja partida en
 * medio de la ficha, que es peor que no poner nada. Aquí, si no carga, no
 * ocupa. El hueco desaparece y la ficha se lee igual.
 */
export default function FotoSitio({ refFoto, ancho = 640, className = '' }:
  { refFoto?: string | null; ancho?: number; className?: string }) {
  const [rota, setRota] = useState(false)
  const src = fotoDeSitio(refFoto, ancho)
  if (!src || rota) return null
  return <img src={src} alt="" loading="lazy" className={className} onError={() => setRota(true)} />
}
