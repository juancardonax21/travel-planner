'use client'
import type { Trip, Event } from '@/types'
import { CAT_CONFIG, formatCurrency } from '@/lib/utils'

/* Rejilla de planning: columnas = días, filas = tramos de 30 min.
   El bloque se dibuja con su duración real y lleva dentro sus notas,
   igual que en el plan en papel. */

const SLOT_MIN = 30
const SLOT_H = 34          // alto de media hora
const RAIL_W = 56          // columna de horas
const DAY_W = 190          // ancho mínimo de cada día

// paleta de la cuadrícula
const C = {
  ink: '#171B26', ink2: '#3E465A', muted: '#6B7489', faint: '#98A0B3',
  rule: '#D6DAE4', ruleStrong: '#BFC5D3',
  surface: '#FFFFFF', surface2: '#F7F8FB', shade: '#EDEEF2',
  accent: '#27437A', accentSoft: '#E6EBF6', accentLine: '#A9BADC',
  moss: '#41653F', mossSoft: '#E9EFE6', mossLine: '#B6C9B2',
  shu: '#AE352A',
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
const REDUNDANTES = ['⚠ Fecha u hora que no admite cambio', 'Ya contratado o pendiente de reservar']

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

/** Estilo del bloque a partir de la categoría y de si ya está contratado. */
function blockStyle(ev: Event, fijo: boolean) {
  const e = ev as any
  const contratado = Boolean(e.ticket_url || e.confirmation_url || e.paid)
  let s: React.CSSProperties = {
    background: C.surface, borderColor: C.ruleStrong,
    borderLeft: `3px solid ${C.accent}`,
  }
  let titleColor = C.ink
  let weight = 700

  if (ev.category === 'meal') {
    s = { background: C.mossSoft, borderColor: C.mossLine }
    titleColor = C.moss
  } else if (ev.category === 'transport') {
    s = { background: 'transparent', borderColor: C.ruleStrong, borderStyle: 'dashed' }
    titleColor = C.muted; weight = 500
  } else if (ev.category === 'other') {
    s = { background: C.shade, borderColor: C.ruleStrong }
    titleColor = C.muted; weight = 500
  } else if (ev.category === 'hotel') {
    const cfg = CAT_CONFIG.hotel
    s = { background: cfg.bg, borderColor: cfg.color + '55', borderLeft: `3px solid ${cfg.color}` }
    titleColor = cfg.color
  }
  if (contratado && ev.category !== 'meal' && ev.category !== 'transport') {
    s = { background: C.accentSoft, borderColor: C.accentLine, borderLeft: `3px solid ${C.accent}` }
    titleColor = C.ink
  }
  if (fijo) s.borderLeft = `3px solid ${C.shu}`
  return { style: s, titleColor, weight }
}

/** Reparte en carriles los bloques que se solapan. */
function assignLanes(items: { start: number; end: number }[]) {
  const lanes: number[] = []          // fin del último bloque de cada carril
  const idx: number[] = []
  items.forEach(it => {
    let l = lanes.findIndex(end => end <= it.start)
    if (l === -1) { lanes.push(it.end); l = lanes.length - 1 }
    else lanes[l] = it.end
    idx.push(l)
  })
  return { lane: idx, total: Math.max(1, lanes.length) }
}

type Props = {
  trip: Trip
  events: Event[]
  days: string[]
  onDayClick: (day: string) => void
}

export default function WeekView({ trip, events, days, onDayClick }: Props) {
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
      <div className="overflow-auto rounded-sm border"
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
                  className="flex-shrink-0 py-2 px-2 text-center hover:bg-slate-50 transition-colors">
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
                  className="absolute right-2 font-mono" >
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
                  {/* líneas horarias */}
                  {ticks.map(m => (
                    <div key={m} style={{
                      top: yOf(m),
                      borderTop: `1px solid ${m % 60 === 0 ? C.ruleStrong : C.rule}`,
                    }} className="absolute left-0 right-0" />
                  ))}
                  <button className="absolute inset-0 w-full z-0 hover:bg-blue-50/20 transition-colors"
                    onClick={() => onDayClick(day)} aria-label={`Ver ${day}`} />

                  {dayEvents.map(({ ev, start, end }, i) => {
                    const top = yOf(Math.max(start, originMin))
                    const height = Math.max(yOf(Math.min(end, endH * 60)) - top, 22)
                    if (start >= endH * 60) return null

                    const allLines = noteLines((ev as any).note)
                    const fijo = allLines.some(isWarn)
                    const lines = allLines.filter(l => !REDUNDANTES.includes(l))
                    const { style, titleColor, weight } = blockStyle(ev, fijo)
                    const w = 100 / total
                    const overnight = end > endH * 60

                    return (
                      <button key={ev.id}
                        onClick={e => { e.stopPropagation(); onDayClick(ev.day) }}
                        style={{
                          top, height,
                          left: `calc(${lane[i] * w}% + 3px)`,
                          width: `calc(${w}% - 6px)`,
                          borderWidth: 1, borderRadius: 2,
                          ...style,
                        }}
                        className="absolute z-10 px-2 py-1.5 text-left overflow-hidden hover:brightness-[.97] transition-all">
                        <span className="block font-mono" style={{ fontSize: 9.5, letterSpacing: '.04em', color: C.faint }}>
                          {ev.time?.slice(0, 5)}
                          {(ev as any).end_time ? `–${(ev as any).end_time.slice(0, 5)}` : ''}
                          {overnight ? ' →' : ''}
                        </span>
                        <span className="block leading-tight" style={{ fontSize: 12.5, fontWeight: weight, color: titleColor }}>
                          {ev.title}
                        </span>
                        {height > 60 && lines.map((l, k) => (
                          <span key={k} className="block leading-snug mt-0.5"
                            style={{ fontSize: 10.8, color: isWarn(l) ? C.shu : C.muted, fontWeight: isWarn(l) ? 500 : 400 }}>
                            {l}
                          </span>
                        ))}
                        {ev.cost > 0 && height > 44 && (
                          <span className="block font-mono mt-0.5" style={{ fontSize: 9.5, color: C.ink2 }}>
                            {formatCurrency(ev.cost, (ev as any).currency || trip.currency)}
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

      {/* ── leyenda ── */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mt-3 px-1" style={{ fontSize: 12, color: C.muted }}>
        <span className="inline-flex items-center gap-2">
          <i style={{ width: 20, height: 11, borderRadius: 2, background: C.surface, border: `1px solid ${C.ruleStrong}`, borderLeft: `3px solid ${C.accent}` }} /> Visita
        </span>
        <span className="inline-flex items-center gap-2">
          <i style={{ width: 20, height: 11, borderRadius: 2, background: C.accentSoft, border: `1px solid ${C.accentLine}` }} /> Contratado o pagado
        </span>
        <span className="inline-flex items-center gap-2">
          <i style={{ width: 20, height: 11, borderRadius: 2, background: C.mossSoft, border: `1px solid ${C.mossLine}` }} /> Comida
        </span>
        <span className="inline-flex items-center gap-2">
          <i style={{ width: 20, height: 11, borderRadius: 2, background: C.shade, border: `1px solid ${C.ruleStrong}` }} /> Descanso
        </span>
        <span className="inline-flex items-center gap-2">
          <i style={{ width: 20, height: 11, borderRadius: 2, background: 'transparent', border: `1px dashed ${C.ruleStrong}` }} /> Traslado
        </span>
        <span style={{ color: C.shu }}>Borde rojo · no admite cambio</span>
      </div>
    </div>
  )
}
