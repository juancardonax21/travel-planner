'use client'
import { useEffect, useState } from 'react'
import { supabase } from './supabase'

export type Rol = 'owner' | 'member' | 'sin_costes'

/* Qué papel tiene quien mira, en este viaje. Mientras se averigua devuelve
   null y la interfaz oculta el dinero: es preferible que aparezca un instante
   después a que se vea un momento a quien no debe verlo. */
export function useRolViaje(tripId: string | undefined): { rol: Rol | null; veCostes: boolean } {
  const [rol, setRol] = useState<Rol | null>(null)

  useEffect(() => {
    if (!tripId) return
    let vivo = true
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) return
      supabase.from('trip_access')
        .select('role')
        .eq('trip_id', tripId)
        .eq('user_id', data.user.id)
        .maybeSingle()
        .then(({ data: a }) => { if (vivo) setRol((a?.role as Rol) ?? 'member') })
    })
    return () => { vivo = false }
  }, [tripId])

  return { rol, veCostes: rol !== null && rol !== 'sin_costes' }
}

/* ¿Puede esta persona crear viajes propios? Sin ficha en app_users, sí: la
   restricción solo alcanza a quien se marca al aceptar una invitación. */
export function usePuedeCrearViajes(): boolean {
  const [puede, setPuede] = useState(true)
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) return
      supabase.from('app_users')
        .select('puede_crear_viajes')
        .eq('user_id', data.user.id)
        .maybeSingle()
        .then(({ data: f }) => { if (f) setPuede(f.puede_crear_viajes) })
    })
  }, [])
  return puede
}
