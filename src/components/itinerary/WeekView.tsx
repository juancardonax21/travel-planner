'use client'
import { useEffect, useRef, useState } from 'react'
import type { Trip, Event } from '@/types'
import { formatCurrency } from '@/lib/utils'
import { pasosDelDia, formateaPasos } from '@/lib/pasos'

import {
  Plane, BedDouble, Compass, UtensilsCrossed, Car, Tag, Bike, Bus, Footprints,
  TrainFront, TrainFrontTunnel, Train, Ship, CheckCircle2, Banknote, AlertTriangle, Info, Footprints as Pie, LucideIcon,
} from 'lucide-react'

/* Rejilla de planning: columnas = días, filas = tramos de 30 min.
   El bloque se dibuja con su duración real y lleva dentro sus notas,
   igual que en el plan en papel. */

const SLOT_MIN = 30
const SLOT_H = 34          // alto de media hora
const RAIL_W = 48          // columna de horas
const DAY_W = 215          // ancho de cada día en escritorio
const MOVIL = 768          // por debajo, un día ocupa la pantalla entera
const HITO_H = 26          // alto del hito; en móvil sube para poder tocarlo
const HITO_H_MOVIL = 40
const HEAD_H = 66          // alto de la cabecera de días, para fijar la franja de hotel

// Color por categoría, tomado de la paleta de la app.
type Paleta = { bg: string; line: string; ink: string }
const CAT_COLOR: Record<string, Paleta> = {
  transport: { bg: '#DBEAFE', line: '#60A5FA', ink: '#1D4ED8' },
  hotel:     { bg: '#D1FAE5', line: '#6EE7B7', ink: '#047857' },
  activity:  { bg: '#FFFFFF', line: '#DDD6FE', ink: '#6D28D9' },
  meal:      { bg: '#FEF3C7', line: '#FCD34D', ink: '#B45309' },
  other:     { bg: '#F1F5F9', line: '#CBD5E1', ink: '#475569' },
}
const C = {
  ink: '#0F172A', ink2: '#334155', muted: '#64748B', faint: '#94A3B8',
  rule: '#E2E8F0', ruleStrong: '#CBD5E1',
  surface: '#FFFFFF', accent: '#2563EB', shu: '#DC2626',
}

const CAT_LABEL: Record<string, string> = {
  transport: 'Transporte', hotel: 'Alojamiento', activity: 'Actividad',
  meal: 'Comida', other: 'Descanso',
}

// Un icono por medio de transporte. El morro del TrainFront es el shinkansen;
// el tren en túnel, el metro; el de vagones, el cercanías.
const MODE_ICON: Record<string, LucideIcon> = {
  flight: Plane, shinkansen: TrainFront, train: Train, metro: TrainFrontTunnel,
  bus: Bus, walking: Footprints, driving: Car, bicycling: Bike, boat: Ship,
  transit: Bus,
}
export const MODE_LABEL: Record<string, string> = {
  flight: 'Avión', shinkansen: 'Tren de alta velocidad', train: 'Tren',
  metro: 'Metro', bus: 'Autobús', walking: 'A pie', driving: 'Coche o taxi',
  bicycling: 'Bicicleta', boat: 'Barco', transit: 'Transporte público',
}
const CAT_ICON: Record<string, LucideIcon> = {
  hotel: BedDouble, activity: Compass, meal: UtensilsCrossed, other: Tag,
}

function eventIcon(ev: Event): LucideIcon {
  if (ev.category === 'transport') return MODE_ICON[(ev as any).travel_mode] || Car
  return CAT_ICON[ev.category] || Tag
}

const minsToHHMM = (m: number) =>
  `${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`

function timeToMins(t?: string | null): number {
  if (!t) return 0
  const [h, m] = t.slice(0, 5).split(':').map(Number)
  return (h || 0) * 60 + (m || 0)
}

/** Inicio y fin en minutos. Los vuelos usan sus segmentos. */
function eventRange(ev: Event): { start: number; end: number } {
  const e = ev as any
  const segs = e.flight_segments as any[] | null
  if (segs && segs.length) {
    const ultimo = segs[segs.length - 1]
    const start = timeToMins(segs[0]?.dep_time || ev.time)
    let end = timeToMins(ultimo?.arr_time) || start + 60
    // Un vuelo largo aterriza al día siguiente o más allá: sin esto el bloque
    // se dibujaba como si llegara la misma tarde.
    const dias = ultimo?.arr_date && ev.day
      ? Math.round((Date.parse(ultimo.arr_date + 'T00:00:00') - Date.parse(ev.day + 'T00:00:00')) / 86400000)
      : 0
    if (dias > 0) end += dias * 24 * 60
    else if (end <= start) end += 24 * 60
    return { start, end }
  }
  const start = timeToMins(ev.time)
  const end = e.end_time ? timeToMins(e.end_time) : start + 60
  return { start, end: end <= start ? start + 60 : end }
}

/** Las notas se guardan unidas por " · "; cada trozo es una línea. */
function noteLines(note?: string | null): string[] {
  if (!note) return []
  return note.split(' · ').map(s => s.trim()).filter(Boolean)
}
const isWarn = (line: string) => line.startsWith('⚠')

/** Ciudades del día, sacadas de las ubicaciones ya geocodificadas. */
function dayPlaces(evs: Event[]): string {
  const seen: string[] = []
  for (const e of evs) {
    const loc = (e as any).location as string | undefined
    if (!loc) continue
    const parts = loc.split(',').map(s => s.trim())
      .filter(s => s && !/^jap[oó]n$|^japan$/i.test(s))
    const city = parts[parts.length - 1]
    if (city && city.length <= 18 && !seen.includes(city)) seen.push(city)
  }
  return seen.slice(0, 2).join(' · ')
}

const MINUTO_HITO = 30
const esMomento = (ev: Event, dur: number) =>
  dur <= MINUTO_HITO && (ev.category === 'transport' || ev.category === 'other')

type Trozo = { ev: Event; start: number; end: number; sigue: boolean; viene: boolean }

/** Trozos que le tocan a un día: los que empiezan en él y la cola de los que
 *  vienen de días anteriores. */
function trozosDelDia(events: Event[], day: string, minDia: number, maxDia: number): Trozo[] {
  const out: Trozo[] = []
  for (const ev of events) {
    if (ev.category === 'hotel') continue
    const dias = Math.round((Date.parse(day + 'T00:00:00') - Date.parse(ev.day + 'T00:00:00')) / 86400000)
    if (dias < 0) continue
    const { start, end } = eventRange(ev)
    const desfase = dias * 24 * 60
    const a = Math.max(start - desfase, minDia)
    const b = Math.min(end - desfase, maxDia)
    if (b <= a) continue
    if (esMomento(ev, end - start)) continue
    out.push({ ev, start: a, end: b, sigue: end - desfase > maxDia, viene: dias > 0 })
  }
  return out.sort((x, y) => x.start - y.start || y.end - x.end)
}

/** Hitos del día: entradas y salidas de hotel, y los traslados o recados
 *  demasiado breves para dibujarse como bloque. Se apilan si caen juntos. */
function hitosDelDia(events: Event[], day: string) {
  const out: { t: number; texto: string; ev: Event; color: string; Icon: LucideIcon }[] = []
  for (const ev of events) {
    const e = ev as any
    if (ev.category === 'hotel') {
      if (e.accom_checkin_date === day && e.accom_checkin_time)
        out.push({ t: timeToMins(e.accom_checkin_time), texto: 'Check-in · ' + ev.title, ev, color: CAT_COLOR.hotel.ink, Icon: BedDouble })
      if (e.accom_checkout_date === day && e.accom_checkout_time)
        out.push({ t: timeToMins(e.accom_checkout_time), texto: 'Check-out · ' + ev.title, ev, color: CAT_COLOR.hotel.ink, Icon: BedDouble })
      continue
    }
    if (ev.day !== day) continue
    const { start, end } = eventRange(ev)
    if (!esMomento(ev, end - start)) continue
    out.push({ t: start, texto: `${minsToHHMM(start)} · ${ev.title}`, ev,
               color: (CAT_COLOR[ev.category] || CAT_COLOR.other).ink, Icon: eventIcon(ev) })
  }
  return out.sort((a, b) => a.t - b.t)
}

/** Reparte en carriles los bloques que se solapan.
 *  Los carriles se cuentan por grupo de solape, no por día entero: así un
 *  choque suelto a última hora no estrecha todos los bloques de la jornada. */
function assignLanes(items: { start: number; end: number }[]) {
  const lane = new Array(items.length).fill(0)
  const total = new Array(items.length).fill(1)
  let grupo: number[] = []            // índices del grupo en curso
  let lanes: number[] = []            // fin del último bloque de cada carril
  let finGrupo = -Infinity

  const cerrar = () => {
    grupo.forEach(i => { total[i] = Math.max(1, lanes.length) })
    grupo = []; lanes = []; finGrupo = -Infinity
  }

  items.forEach((it, i) => {
    if (it.start >= finGrupo) cerrar()
    let l = lanes.findIndex(end => end <= it.start)
    if (l === -1) { lanes.push(it.end); l = lanes.length - 1 }
    else lanes[l] = it.end
    lane[i] = l
    grupo.push(i)
    finGrupo = Math.max(finGrupo, it.end)
  })
  cerrar()
  return { lane, total }
}

type Props = {
  trip: Trip
  events: Event[]
  days: string[]
  onDayClick: (day: string) => void
  onEventClick?: (ev: Event) => void
  veCostes?: boolean
}

export default function WeekView({ trip, events, days, onDayClick, onEventClick, veCostes = true }: Props) {
  // En móvil cada día ocupa la pantalla y se pasa deslizando; en escritorio
  // caben varios. Se mide el contenedor, no la ventana, por si cambia el ancho.
  const caja = useRef<HTMLDivElement>(null)
  const [anchoDia, setAnchoDia] = useState(DAY_W)
  const [movil, setMovil] = useState(false)
  useEffect(() => {
    const medir = () => {
      const esMovil = window.innerWidth < MOVIL
      setMovil(esMovil)
      const w = caja.current?.clientWidth ?? 0
      setAnchoDia(esMovil && w ? Math.max(240, w - RAIL_W) : DAY_W)
    }
    medir()
    window.addEventListener('resize', medir)
    return () => window.removeEventListener('resize', medir)
  }, [])
  const hitoH = movil ? HITO_H_MOVIL : HITO_H
  // rango horario: 7:00–23:00 por defecto, ampliado si hay eventos fuera
  let startH = 7, endH = 23
  events.forEach(ev => {
    if (!days.includes(ev.day)) return
    const { start, end } = eventRange(ev)
    startH = Math.min(startH, Math.floor(start / 60))
    endH = Math.max(endH, Math.min(24, Math.ceil(end / 60)))
  })
  const originMin = startH * 60
  const slots = ((endH - startH) * 60) / SLOT_MIN
  const gridH = slots * SLOT_H
  const yOf = (mins: number) => ((mins - originMin) / SLOT_MIN) * SLOT_H
  const ticks = Array.from({ length: slots }, (_, i) => originMin + i * SLOT_MIN)
  const hoteles = events.filter(e => e.category === 'hotel')

  return (
    <div>
      <div className="overflow-auto rounded-xl border shadow-sm rejilla-alto rejilla-snap"
        ref={caja}
        style={{ borderColor: C.ruleStrong, background: C.surface }}>
        <div style={{ minWidth: RAIL_W + days.length * anchoDia }}>

          {/* ── cabecera de días ── */}
          <div className="flex sticky top-0 z-30" style={{ borderBottom: `2px solid ${C.ink}`, background: C.surface }}>
            <div style={{ width: RAIL_W, background: C.surface }}
              className="flex-shrink-0 sticky left-0 z-40" />
            {days.map(day => {
              const dt = new Date(day + 'T00:00:00')
              const evs = events.filter(e => e.day === day)
              const place = dayPlaces(evs)
              return (
                <button key={day} onClick={() => onDayClick(day)}
                  style={{ width: anchoDia, borderLeft: `1px solid ${C.rule}`, scrollSnapAlign: 'start' }}
                  className="flex-shrink-0 py-2 px-2 text-center hover:bg-blue-50 transition-colors">
                  <span className="block font-mono uppercase" style={{ fontSize: 11, letterSpacing: '.12em', color: C.muted }}>
                    {dt.toLocaleDateString('es-ES', { weekday: 'long' })}
                  </span>
                  <span className="block font-bold" style={{ fontSize: 14.5, color: evs.length ? C.ink : C.faint }}>
                    {dt.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                  </span>
                  <span className="block truncate" style={{ fontSize: 11.5, color: C.accent, minHeight: 16 }}>
                    {place}
                  </span>
                  {(() => {
                    const p = pasosDelDia(evs)
                    if (!p.pasos) return null
                    return (
                      <span className="inline-flex items-center gap-1 mt-0.5" style={{ fontSize: 10.5, color: C.muted }}
                        title={`Aproximado: ${p.kmAndando} km a pie en ${p.tramos} tramos, más lo que se anda dentro de cada sitio`}>
                        <Pie size={10} strokeWidth={2} /> ~{formateaPasos(p.pasos)}
                      </span>
                    )
                  })()}
                </button>
              )
            })}
          </div>

          {/* ── franja de alojamiento: qué hotel toca cada noche ── */}
          {hoteles.length > 0 && (
            <div className="flex sticky z-20" style={{ top: HEAD_H, background: C.surface, borderBottom: `1px solid ${C.ruleStrong}` }}>
              <div style={{ width: RAIL_W, background: C.surface }}
                className="flex-shrink-0 sticky left-0 z-30 flex items-center justify-end pr-2">
                <BedDouble size={11} strokeWidth={2} style={{ color: C.faint }} />
              </div>
              {days.map(day => {
                const h = hoteles.find(x => {
                  const e = x as any
                  return e.accom_checkin_date && e.accom_checkout_date
                    && day >= e.accom_checkin_date && day < e.accom_checkout_date
                })
                const entra = h && (h as any).accom_checkin_date === day
                const pal = CAT_COLOR.hotel
                return (
                  <div key={day} style={{ width: anchoDia, borderLeft: `1px solid ${C.rule}`, scrollSnapAlign: 'start' }}
                    className="flex-shrink-0 px-1 py-1">
                    {h && (
                      <button onClick={() => onEventClick ? onEventClick(h) : onDayClick(day)}
                        style={{ background: pal.bg, color: pal.ink, borderColor: pal.line, paddingBlock: movil ? 8 : 3 }}
                        className="w-full truncate text-left px-2 rounded border hover:brightness-95 transition-all"
                        title={h.title}>
                        <span style={{ fontSize: 11, fontWeight: entra ? 700 : 400, opacity: entra ? 1 : .75 }}>
                          {h.title}
                        </span>
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {/* ── rejilla ── */}
          <div className="flex relative" style={{ height: gridH }}>
            {/* raíl de horas */}
            <div style={{ width: RAIL_W, borderRight: `1px solid ${C.ruleStrong}`, background: C.surface }}
              className="flex-shrink-0 relative sticky left-0 z-20">
              {ticks.map(m => (
                <div key={m} style={{ top: yOf(m) - 7, color: m % 60 === 0 ? C.ink2 : C.faint }}
                  className="absolute right-2 font-mono">
                  <span style={{ fontSize: 11 }}>
                    {String(Math.floor(m / 60)).padStart(2, '0')}:{String(m % 60).padStart(2, '0')}
                  </span>
                </div>
              ))}
            </div>

            {/* columnas de día */}
            {days.map(day => {
              const dayEvents = trozosDelDia(events, day, originMin, endH * 60)
              const { lane, total } = assignLanes(dayEvents)
              const hitos = hitosDelDia(events, day)

              return (
                <div key={day} style={{ width: anchoDia, borderLeft: `1px solid ${C.rule}`, scrollSnapAlign: 'start' }}
                  className="flex-shrink-0 relative">
                  {ticks.map(m => (
                    <div key={m} style={{
                      top: yOf(m),
                      borderTop: `1px solid ${m % 60 === 0 ? C.ruleStrong : C.rule}`,
                    }} className="absolute left-0 right-0" />
                  ))}
                  <button className="absolute inset-0 w-full z-0 hover:bg-blue-50/30 transition-colors"
                    onClick={() => onDayClick(day)} aria-label={`Ver ${day}`} />

                  {/* Hitos de alojamiento: cruzan la columna sin ocupar carril */}
                  {(() => {
                    let ocupadoHasta = -Infinity
                    return hitos.map((h, k) => {
                      const y = Math.max(yOf(h.t), ocupadoHasta)
                      ocupadoHasta = y + hitoH
                      return (
                        <button key={k} onClick={e => { e.stopPropagation(); onEventClick ? onEventClick(h.ev) : onDayClick(day) }}
                          style={{ top: y - 1, height: hitoH, borderTop: `2px dashed ${h.color}` }}
                          className="absolute left-0 right-0 z-20 flex items-start">
                          <span className="flex items-center gap-1.5 rounded-br font-mono truncate shadow-sm"
                            style={{ fontSize: 11, background: h.color, color: '#fff', maxWidth: '100%',
                                     padding: movil ? '8px 10px' : '3px 7px' }}>
                            <h.Icon size={12} strokeWidth={2.4} className="flex-shrink-0" />
                            <span className="truncate">{h.texto}</span>
                          </span>
                        </button>
                      )
                    })
                  })()}

                  {dayEvents.map(({ ev, start, end, sigue, viene }, i) => {
                    const top = yOf(start)
                    const height = Math.max(yOf(end) - top, 22)

                    const e = ev as any
                    const avisos = noteLines(e.note).filter(isWarn)
                    const fijo = Boolean(e.fixed_time)
                    const contratado = Boolean(e.ticket_url || e.confirmation_url || e.paid)
                    const enEfectivo = e.payment_method === 'efectivo'
                    const pal = CAT_COLOR[ev.category] || CAT_COLOR.other
                    const esTraslado = ev.category === 'transport'
                    const Icon = eventIcon(ev)
                    const w = 100 / total[i]

                    return (
                      <button key={ev.id + (viene ? '-cont' : '')}
                        onClick={evt => {
                          evt.stopPropagation()
                          if (onEventClick) onEventClick(ev)
                          else onDayClick(ev.day)
                        }}
                        style={{
                          top, height,
                          left: `calc(${lane[i] * w}% + 3px)`,
                          width: `calc(${w}% - 6px)`,
                          background: pal.bg,
                          borderWidth: 1, borderRadius: 6,
                          borderColor: pal.line,
                          borderStyle: esTraslado ? 'dashed' : 'solid',
                          borderLeft: `${esTraslado ? 4 : 3}px solid ${fijo ? C.shu : pal.ink}`,
                        }}
                        className="absolute z-10 px-2 py-1.5 text-left overflow-hidden hover:brightness-[.96] hover:shadow-md transition-all">
                        <span className="flex items-center gap-1 font-mono" style={{ fontSize: 11, letterSpacing: '.02em', color: pal.ink }}>
                          <Icon size={10} strokeWidth={2} className="flex-shrink-0 opacity-80" />
                          <span className="opacity-75">
                            {viene && sigue ? 'todo el día'
                              : viene ? `← llega ${minsToHHMM(end)}`
                              : sigue ? `${minsToHHMM(start)} →`
                              : `${minsToHHMM(start)}–${minsToHHMM(end)}`}
                          </span>
                          {contratado && <CheckCircle2 size={10} strokeWidth={2.4} className="flex-shrink-0" />}
                          {enEfectivo && <Banknote size={11} strokeWidth={2.2} className="flex-shrink-0" style={{ color: C.shu }} />}
                          {avisos.length > 0 && height <= 4 * SLOT_H && (
                            <AlertTriangle size={10} strokeWidth={2.4} className="flex-shrink-0" style={{ color: C.shu }} />
                          )}
                          {ev.cost > 0 && !viene && veCostes && (
                            <span className="ml-auto flex-shrink-0 font-semibold opacity-90">
                              {formatCurrency(ev.cost, e.currency || trip.currency)}
                            </span>
                          )}
                        </span>
                        <span className="block leading-tight" style={{
                          fontSize: 13, color: pal.ink,
                          fontWeight: ev.category === 'other' ? 500 : 700,
                        }}>
                          {ev.title}
                        </span>
                        {avisos.length > 0 && height > 4 * SLOT_H && (
                          <span className="block leading-snug mt-1"
                            style={{ fontSize: 11, color: C.shu, fontWeight: 500 }}>
                            {avisos[0]}
                          </span>
                        )}
                      </button>
                    )
                  })}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* ── leyenda: plegada en móvil, donde el alto es oro ── */}
      <details className="mt-3 px-1" open={!movil}>
        <summary className="cursor-pointer list-none select-none inline-flex items-center gap-1.5 py-2"
          style={{ fontSize: 12, color: C.muted }}>
          <Info size={13} strokeWidth={2} /> Qué significa cada color
        </summary>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pb-1" style={{ fontSize: 12, color: C.muted }}>

        {(['transport', 'hotel', 'activity', 'meal', 'other'] as const).map(k => {
          const p = CAT_COLOR[k]
          return (
            <span key={k} className="inline-flex items-center gap-1.5">
              <i style={{
                width: 20, height: 12, borderRadius: 3,
                background: p.bg,
                border: `1px ${k === 'transport' ? 'dashed' : 'solid'} ${p.line}`,
                borderLeft: `${k === 'transport' ? 4 : 3}px solid ${p.ink}`,
              }} />
              {CAT_LABEL[k]}
            </span>
          )
        })}
        <span className="inline-flex items-center gap-1.5">
          <CheckCircle2 size={12} strokeWidth={2.4} style={{ color: C.ink2 }} /> Contratado o pagado
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Banknote size={12} strokeWidth={2.2} style={{ color: C.shu }} /> Solo efectivo
        </span>
        <span className="inline-flex items-center gap-1.5" style={{ color: C.shu }}>
          <i style={{ width: 20, height: 12, borderRadius: 3, background: '#FFF', border: `1px solid ${C.rule}`, borderLeft: `3px solid ${C.shu}` }} />
          No admite cambio
        </span>
      </div>
      </details>
    </div>
  )
}
