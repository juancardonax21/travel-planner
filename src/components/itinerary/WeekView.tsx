'use client'
import type { Trip, Event } from '@/types'
import { formatCurrency } from '@/lib/utils'
import {
  Plane, BedDouble, Compass, UtensilsCrossed, Car, Tag, Bike, Bus, Footprints,
  Waves, TrainFront, CheckCircle2, LucideIcon,
} from 'lucide-react'

/* Rejilla de planning: columnas = días, filas = tramos de 30 min.
   El bloque se dibuja con su duración real y lleva dentro sus notas,
   igual que en el plan en papel. */

const SLOT_MIN = 30
const SLOT_H = 34          // alto de media hora
const RAIL_W = 56          // columna de horas
const DAY_W = 190          // ancho mínimo de cada día

// Color por categoría, tomado de la paleta de la app.
type Paleta = { bg: string; line: string; ink: string }
const CAT_COLOR: Record<string, Paleta> = {
  transport: { bg: '#E0EDFF', line: '#93B4E8', ink: '#1D4ED8' },
  hotel:     { bg: '#D1FAE5', line: '#6EE7B7', ink: '#047857' },
  activity:  { bg: '#EDE9FE', line: '#C4B5FD', ink: '#6D28D9' },
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

const MODE_ICON: Record<string, LucideIcon> = {
  flight: Plane, train: TrainFront, driving: Car, transit: Bus,
  walking: Footprints, bicycling: Bike, boat: Waves,
}
const CAT_ICON: Record<string, LucideIcon> = {
  hotel: BedDouble, activity: Compass, meal: UtensilsCrossed, other: Tag,
}

function eventIcon(ev: Event): LucideIcon {
  if (ev.category === 'transport') return MODE_ICON[(ev as any).travel_mode] || Car
  return CAT_ICON[ev.category] || Tag
}

function timeToMins(t?: string | null): number {
  if (!t) return 0
  const [h, m] = t.slice(0, 5).split(':').map(Number)
  return (h || 0) * 60 + (m || 0)
}

/** Inicio y fin en minutos. Los vuelos usan sus segmentos. */
function eventRange(ev: Event): { start: number; end: number } {
  const e = ev as any
  if (ev.category === 'hotel') {
    const start = timeToMins(ev.time)
    return { start, end: start + SLOT_MIN }
  }
  const segs = e.flight_segments as any[] | null
  if (segs && segs.length) {
    const start = timeToMins(segs[0]?.dep_time || ev.time)
    let end = timeToMins(segs[segs.length - 1]?.arr_time) || start + 60
    if (end <= start) end += 24 * 60
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
// El desglose del coste ya se ve en la etiqueta del importe: en la rejilla
// sobra como texto. Sigue estando en la ficha al abrir el evento.
const esCoste = (line: string) => line.startsWith('Coste ')
const MAX_NOTAS = 2        // líneas informativas; los avisos no se recortan

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
}

export default function WeekView({ trip, events, days, onDayClick, onEventClick }: Props) {
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

  return (
    <div>
      <div className="overflow-auto rounded-xl border shadow-sm"
        style={{ borderColor: C.ruleStrong, background: C.surface, maxHeight: 'calc(100vh - 200px)' }}>
        <div style={{ minWidth: RAIL_W + days.length * DAY_W }}>

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
                  style={{ width: DAY_W, borderLeft: `1px solid ${C.rule}` }}
                  className="flex-shrink-0 py-2 px-2 text-center hover:bg-blue-50 transition-colors">
                  <span className="block font-mono uppercase" style={{ fontSize: 10.5, letterSpacing: '.14em', color: C.muted }}>
                    {dt.toLocaleDateString('es-ES', { weekday: 'long' })}
                  </span>
                  <span className="block font-bold" style={{ fontSize: 14.5, color: evs.length ? C.ink : C.faint }}>
                    {dt.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                  </span>
                  <span className="block truncate" style={{ fontSize: 11, color: C.accent, minHeight: 16 }}>
                    {place}
                  </span>
                </button>
              )
            })}
          </div>

          {/* ── rejilla ── */}
          <div className="flex relative" style={{ height: gridH }}>
            {/* raíl de horas */}
            <div style={{ width: RAIL_W, borderRight: `1px solid ${C.ruleStrong}`, background: C.surface }}
              className="flex-shrink-0 relative sticky left-0 z-20">
              {ticks.map(m => (
                <div key={m} style={{ top: yOf(m) - 7, color: m % 60 === 0 ? C.ink2 : C.faint }}
                  className="absolute right-2 font-mono">
                  <span style={{ fontSize: 10.5 }}>
                    {String(Math.floor(m / 60)).padStart(2, '0')}:{String(m % 60).padStart(2, '0')}
                  </span>
                </div>
              ))}
            </div>

            {/* columnas de día */}
            {days.map(day => {
              const dayEvents = events.filter(e => e.day === day)
                .map(ev => ({ ev, ...eventRange(ev) }))
                .sort((a, b) => a.start - b.start || b.end - a.end)
              const { lane, total } = assignLanes(dayEvents)

              return (
                <div key={day} style={{ width: DAY_W, borderLeft: `1px solid ${C.rule}` }}
                  className="flex-shrink-0 relative">
                  {ticks.map(m => (
                    <div key={m} style={{
                      top: yOf(m),
                      borderTop: `1px solid ${m % 60 === 0 ? C.ruleStrong : C.rule}`,
                    }} className="absolute left-0 right-0" />
                  ))}
                  <button className="absolute inset-0 w-full z-0 hover:bg-blue-50/30 transition-colors"
                    onClick={() => onDayClick(day)} aria-label={`Ver ${day}`} />

                  {dayEvents.map(({ ev, start, end }, i) => {
                    const top = yOf(Math.max(start, originMin))
                    const height = Math.max(yOf(Math.min(end, endH * 60)) - top, 22)
                    if (start >= endH * 60) return null

                    const e = ev as any
                    const todas = noteLines(e.note)
                    const avisos = todas.filter(isWarn)
                    const sueltas = todas.filter(l => !isWarn(l) && !esCoste(l))
                    const recortadas = sueltas.length > MAX_NOTAS
                    const lines = [...avisos, ...sueltas.slice(0, MAX_NOTAS)]
                    const fijo = Boolean(e.fixed_time)
                    const contratado = Boolean(e.ticket_url || e.confirmation_url || e.paid)
                    const pal = CAT_COLOR[ev.category] || CAT_COLOR.other
                    const esTraslado = ev.category === 'transport'
                    const Icon = eventIcon(ev)
                    const w = 100 / total[i]
                    const overnight = end > endH * 60

                    return (
                      <button key={ev.id}
                        onClick={evt => {
                          evt.stopPropagation()
                          if (onEventClick) onEventClick(ev)
                          else onDayClick(ev.day)
                        }}
                        style={{
                          top, height,
                          left: `calc(${lane[i] * w}% + 3px)`,
                          width: `calc(${w}% - 6px)`,
                          background: esTraslado ? 'transparent' : pal.bg,
                          borderWidth: 1, borderRadius: 6,
                          borderColor: pal.line,
                          borderStyle: esTraslado ? 'dashed' : 'solid',
                          borderLeft: `3px solid ${fijo ? C.shu : pal.ink}`,
                        }}
                        className="absolute z-10 px-2 py-1.5 text-left overflow-hidden hover:brightness-[.96] hover:shadow-md transition-all">
                        <span className="flex items-center gap-1 font-mono" style={{ fontSize: 9.5, letterSpacing: '.04em', color: pal.ink }}>
                          <Icon size={10} strokeWidth={2} className="flex-shrink-0 opacity-80" />
                          <span className="opacity-75">
                            {ev.time?.slice(0, 5)}
                            {e.end_time ? `–${e.end_time.slice(0, 5)}` : ''}
                            {overnight ? ' →' : ''}
                          </span>
                          {contratado && <CheckCircle2 size={10} strokeWidth={2.4} className="flex-shrink-0" />}
                          {ev.cost > 0 && (
                            <span className="ml-auto flex-shrink-0 font-semibold opacity-90">
                              {formatCurrency(ev.cost, e.currency || trip.currency)}
                            </span>
                          )}
                        </span>
                        <span className="block leading-tight" style={{
                          fontSize: 12.5, color: pal.ink,
                          fontWeight: esTraslado || ev.category === 'other' ? 500 : 700,
                        }}>
                          {ev.title}
                        </span>
                        {height > 60 && lines.map((l, k) => (
                          <span key={k} className="block leading-snug mt-1"
                            style={{ fontSize: 10.5, color: isWarn(l) ? C.shu : C.muted, fontWeight: isWarn(l) ? 500 : 400 }}>
                            {l}
                          </span>
                        ))}
                        {recortadas && height > 60 && (
                          <span className="block leading-none mt-1" style={{ fontSize: 10.8, color: C.faint }}>…</span>
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

      {/* ── leyenda ── */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-3 px-1" style={{ fontSize: 12, color: C.muted }}>
        {(['transport', 'hotel', 'activity', 'meal', 'other'] as const).map(k => {
          const p = CAT_COLOR[k]
          return (
            <span key={k} className="inline-flex items-center gap-1.5">
              <i style={{
                width: 20, height: 12, borderRadius: 3,
                background: k === 'transport' ? 'transparent' : p.bg,
                border: `1px ${k === 'transport' ? 'dashed' : 'solid'} ${p.line}`,
                borderLeft: `3px solid ${p.ink}`,
              }} />
              {CAT_LABEL[k]}
            </span>
          )
        })}
        <span className="inline-flex items-center gap-1.5">
          <CheckCircle2 size={12} strokeWidth={2.4} style={{ color: C.ink2 }} /> Contratado o pagado
        </span>
        <span className="inline-flex items-center gap-1.5" style={{ color: C.shu }}>
          <i style={{ width: 20, height: 12, borderRadius: 3, background: '#FFF', border: `1px solid ${C.rule}`, borderLeft: `3px solid ${C.shu}` }} />
          No admite cambio
        </span>
      </div>
    </div>
  )
}
