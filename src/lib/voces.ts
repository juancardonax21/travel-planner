'use client'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'

/* Las voces del viaje: corazones y comentarios sobre cada cosa del plan.
 * El porqué del diseño está en migrations/014_las_voces.sql. */

export type Voz = {
  id: string
  trip_id: string
  event_id: string | null
  day: string | null
  member_id: string | null
  autor: string
  tipo: 'corazon' | 'nota'
  texto: string | null
  created_at: string
}

export type Viajero = { id: string; name: string }

export function useVoces(tripId?: string) {
  const [voces, setVoces] = useState<Voz[]>([])
  /* Mientras la migración no esté puesta, la tabla no existe y Supabase
     devuelve error. No es motivo para romper el itinerario: se apaga la
     función y el resto sigue funcionando igual que antes. */
  const [hayTabla, setHayTabla] = useState(true)

  const carga = useCallback(async () => {
    if (!tripId) return
    const { data, error } = await supabase
      .from('voces').select('*').eq('trip_id', tripId)
      .order('created_at', { ascending: true })
    if (error) { setHayTabla(false); return }
    setHayTabla(true)
    setVoces((data || []) as Voz[])
  }, [tripId])

  useEffect(() => { carga() }, [carga])

  /* Agrupado por evento, que es como se consulta siempre. */
  const porEvento = useMemo(() => {
    const m: Record<string, Voz[]> = {}
    voces.forEach(v => {
      if (!v.event_id) return
      ;(m[v.event_id] ||= []).push(v)
    })
    return m
  }, [voces])

  async function alternaCorazon(eventId: string, yo: Viajero) {
    const mio = voces.find(v =>
      v.tipo === 'corazon' && v.event_id === eventId && v.member_id === yo.id)
    if (mio) {
      setVoces(vs => vs.filter(v => v.id !== mio.id))
      const { error } = await supabase.from('voces').delete().eq('id', mio.id)
      if (error) carga()
      return
    }
    const { data: sesion } = await supabase.auth.getUser()
    const { data, error } = await supabase.from('voces').insert({
      trip_id: tripId, event_id: eventId, member_id: yo.id, autor: yo.name,
      tipo: 'corazon', user_id: sesion?.user?.id ?? null,
    }).select().single()
    if (error) { carga(); return }
    setVoces(vs => [...vs, data as Voz])
  }

  async function añadeNota(eventId: string, yo: Viajero, texto: string) {
    const limpio = texto.trim()
    if (!limpio) return
    const { data: sesion } = await supabase.auth.getUser()
    const { data, error } = await supabase.from('voces').insert({
      trip_id: tripId, event_id: eventId, member_id: yo.id, autor: yo.name,
      tipo: 'nota', texto: limpio, user_id: sesion?.user?.id ?? null,
    }).select().single()
    if (error) { carga(); return }
    setVoces(vs => [...vs, data as Voz])
  }

  async function borraVoz(id: string) {
    setVoces(vs => vs.filter(v => v.id !== id))
    const { error } = await supabase.from('voces').delete().eq('id', id)
    if (error) carga()
  }

  return { voces, porEvento, hayTabla, alternaCorazon, añadeNota, borraVoz, recarga: carga }
}

/* Quién eres tú en este teléfono.
 *
 * No se deduce de la cuenta a propósito: los cuatro viajeros entran con dos
 * cuentas, así que la cuenta no distingue a Nico de su madre. Se pregunta una
 * vez por dispositivo y se recuerda; se puede cambiar después. */
const CLAVE = (tripId: string) => `viajero:${tripId}`

export function useYo(tripId: string | undefined, viajeros: Viajero[]) {
  const [yoId, setYoId] = useState<string | null>(null)
  const [listo, setListo] = useState(false)

  useEffect(() => {
    if (!tripId) return
    try { setYoId(localStorage.getItem(CLAVE(tripId))) } catch {}
    setListo(true)
  }, [tripId])

  const elige = useCallback((id: string | null) => {
    setYoId(id)
    if (!tripId) return
    try {
      if (id) localStorage.setItem(CLAVE(tripId), id)
      else localStorage.removeItem(CLAVE(tripId))
    } catch {}
  }, [tripId])

  const yo = useMemo(
    () => viajeros.find(v => v.id === yoId) || null,
    [viajeros, yoId])

  return { yo, listo, elige }
}
