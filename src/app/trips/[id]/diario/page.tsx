'use client'
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Voz } from '@/lib/voces'
import Diario from '@/components/diario/Diario'

/* El diario del viaje.
 *
 * No se escribe: se recoge. Todo lo que hay aquí se ha ido diciendo sobre la
 * marcha —el ancla que lleva cada día, el corazón que alguien le puso a una
 * cosa, lo que se comentó de ella—, y esta página lo pone por orden. Esa es
 * la única forma de que un diario de viaje se escriba de verdad: que no haya
 * que sentarse a escribirlo.
 *
 * Los días sin nada no salen. Un diario con quince páginas en blanco no es un
 * diario, es un remordimiento.
 */

type Ev = { id: string; day: string; time: string | null; title: string | null
  location: string | null; foto_ref: string | null }

export default function DiarioPage({ params }: { params: { id: string } }) {
  const { id } = params
  const [trip, setTrip] = useState<any>(null)
  const [events, setEvents] = useState<Ev[]>([])
  const [anclas, setAnclas] = useState<Record<string, string>>({})
  const [voces, setVoces] = useState<Voz[]>([])
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    let vivo = true
    ;(async () => {
      const [{ data: t }, { data: ev }, { data: dn }, { data: vo }] = await Promise.all([
        supabase.from('trips').select('*').eq('id', id).single(),
        supabase.from('events').select('id, day, time, title, location, foto_ref')
          .eq('trip_id', id).order('day').order('time'),
        supabase.from('day_notes').select('day, ancla').eq('trip_id', id),
        supabase.from('voces').select('*').eq('trip_id', id).order('created_at'),
      ])
      if (!vivo) return
      setTrip(t)
      setEvents((ev || []) as Ev[])
      const anc: Record<string, string> = {}
      ;(dn || []).forEach((n: any) => { if (n.ancla) anc[n.day] = n.ancla })
      setAnclas(anc)
      setVoces((vo || []) as Voz[])   // si la tabla no está, viene vacío y ya
      setCargando(false)
    })()
    return () => { vivo = false }
  }, [id])

  /* Un día entra en el diario cuando alguien ha dicho algo de él, y solo
     entonces. El ancla no basta: las dieciséis están escritas desde antes de
     salir de casa, son el plan hablando, y si contaran, el diario se abriría
     hoy con el viaje entero ya redactado y una sola voz perdida dentro.
     Cuando el día entra, su ancla lo encabeza, que para eso está. */
  const dias = useMemo(() => {
    const porEvento: Record<string, Voz[]> = {}
    voces.forEach(v => { if (v.event_id) (porEvento[v.event_id] ||= []).push(v) })

    const todos = Array.from(new Set(events.map(e => e.day))).sort()
    return todos.map(day => {
      const conVoz = events
        .filter(e => e.day === day && porEvento[e.id]?.length)
        .map(e => ({
          ev: e,
          corazones: porEvento[e.id].filter(v => v.tipo === 'corazon'),
          notas: porEvento[e.id].filter(v => v.tipo === 'nota'),
        }))
      return { day, ancla: anclas[day] || '', cosas: conVoz }
    }).filter(d => d.cosas.length > 0)
  }, [events, anclas, voces])

  if (cargando) return (
    <div className="max-w-2xl mx-auto px-4 py-16 text-center text-slate-400">Abriendo el diario…</div>
  )
  if (!trip) return null

  return <Diario trip={trip} dias={dias} />
}
