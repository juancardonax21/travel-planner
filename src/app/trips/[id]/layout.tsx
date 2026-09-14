'use client'
import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import type { Trip } from '@/types'
import TripNav from '@/components/layout/TripNav'

/* La cabecera vive aquí y no en cada página.
 *
 * Next conserva el layout al navegar entre rutas hermanas, así que al cambiar
 * de pestaña solo se sustituye el contenido: antes la cabecera se desmontaba
 * y se volvía a montar, con su parpadeo y su recarga de la portada. */
export default function TripLayout({ children, params }:
  { children: React.ReactNode; params: { id: string } }) {
  const [trip, setTrip] = useState<Trip | null>(null)
  const ruta = usePathname()
  // /trips/<id>/<seccion> -> la sección es el índice 3, no el 4. Con el 4
  // siempre salía indefinida y la pestaña marcada se quedaba en Itinerario.
  const activa = (ruta || '').split('/')[3] || 'itinerary'

  useEffect(() => {
    supabase.from('trips').select('*').eq('id', params.id).maybeSingle()
      .then(({ data }) => setTrip(data as Trip))
  }, [params.id])

  // El dossier se imprime: va sin cabecera ni navegación.
  if (activa === 'dossier') return <>{children}</>

  return (
    <div className="min-h-screen bg-slate-50">
      {trip && <TripNav trip={trip} active={activa} />}
      {children}
    </div>
  )
}
