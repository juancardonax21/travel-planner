'use client'
import type { Trip, Event } from '@/types'
import { CAT_CONFIG } from '@/lib/utils'
import { Plane, BedDouble, Compass, UtensilsCrossed, Car, Tag } from 'lucide-react'

const CAT_ICONS: Record<string, any> = {
  flight: Plane, hotel: BedDouble, activity: Compass,
  meal: UtensilsCrossed, transport: Car, other: Tag,
}

const SLOT_H = 56
const GRID_START = 7
const GRID_END = 23
const TIME_COL_W = 44
const DAY_COL_W = 140

function timeToMins(t: string): number {
  if (!t) return 0
  const [h, m] = t.slice(0, 5).split(':').map(Number)
  return (h || 0) * 60 + (m || 0)
}

function minsToY(mins: number): number {
  return ((mins - GRID_START * 60) / 60) * SLOT_H
}

type Props = {
  trip: Trip
  events: Event[]
  days: string[]
  onDayClick: (day: string) => void
}

export default function WeekView({ trip, events, days, onDayClick }: Props) {
  const totalH = (GRID_END - GRID_START) * SLOT_H
  const hours = Array.from({ length: GRID_END - GRID_START }, (_, i) => GRID_START + i)
  const multiDay = events.filter(e =>
    e.category === 'hotel' && (e as any).accom_checkin_date && (e as any).accom_checkout_date
  )

  function getEventStyle(ev: Event) {
    const cfg = CAT_CONFIG[ev.category as keyof typeof CAT_CONFIG] || CAT_CONFIG.other
    const startMins = timeToMins(ev.time)
    const endMins = (ev as any).end_time ? timeToMins((ev as any).end_time) : startMins + 60
    const top = minsToY(Math.max(startMins, GRID_START * 60))
    const height = Math.max(minsToY(endMins) - minsToY(startMins), 26)
    return { top, height, bg: cfg.bg, color: cfg.color }
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div style={{ minWidth: TIME_COL_W + days.length * DAY_COL_W }}>

        {/* Header */}
        <div className="flex border-b border-slate-200 bg-slate-50 sticky top-0 z-20">
          <div style={{ width: TIME_COL_W }} className="flex-shrink-0" />
          {days.map(day => {
            const dt = new Date(day + 'T00:00:00')
            const hasEv = events.some(e => e.day === day)
            return (
              <button key={day} onClick={() => onDayClick(day)}
                style={{ width: DAY_COL_W }}
                className="flex-shrink-0 flex flex-col items-center py-2.5 border-l border-slate-200 hover:bg-blue-50 transition-colors group">
                <span className="text-xs uppercase tracking-wide text-slate-400 font-mono">
                  {dt.toLocaleDateString('es-ES', { weekday: 'short' })}
                </span>
                <span className={`text-lg font-bold leading-tight group-hover:text-blue-600 transition-colors ${hasEv ? 'text-slate-800' : 'text-slate-300'}`}>
                  {dt.getDate()}
                </span>
                <span className="text-xs text-slate-300 font-mono">
                  {dt.toLocaleDateString('es-ES', { month: 'short' })}
                </span>
                {hasEv && <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-0.5" />}
              </button>
            )
          })}
        </div>

        {/* Multi-day bar */}
        {multiDay.length > 0 && (
          <div className="flex border-b border-slate-100 bg-slate-50/50">
            <div style={{ width: TIME_COL_W }} className="flex-shrink-0 flex items-center justify-center py-1">
              <span className="text-xs text-slate-300 font-mono">···</span>
            </div>
            {days.map(day => {
              const spanning = multiDay.filter(e => {
                const ci = (e as any).accom_checkin_date
                const co = (e as any).accom_checkout_date
                return day >= ci && day <= co
              })
              return (
                <div key={day} style={{ width: DAY_COL_W }}
                  className="flex-shrink-0 border-l border-slate-100 py-1 px-1 space-y-0.5">
                  {spanning.map(e => {
                    const cfg = CAT_CONFIG[e.category as keyof typeof CAT_CONFIG]
                    const isFirst = day === (e as any).accom_checkin_date
                    return (
                      <button key={e.id} onClick={() => onDayClick((e as any).accom_checkin_date)}
                        className="w-full text-left text-xs font-medium px-2 py-0.5 rounded-full truncate hover:opacity-80 transition-opacity"
                        style={{ background: cfg.bg, color: cfg.color }}>
                        {isFirst ? e.title.split(' ')[0] : '·'}
                      </button>
                    )
                  })}
                </div>
              )
            })}
          </div>
        )}

        {/* Time grid */}
        <div className="flex relative" style={{ height: totalH }}>
          {/* Hour labels */}
          <div style={{ width: TIME_COL_W }} className="flex-shrink-0 relative">
            {hours.map(h => (
              <div key={h} style={{ top: (h - GRID_START) * SLOT_H }}
                className="absolute right-2 text-xs text-slate-300 font-mono -translate-y-2">
                {String(h).padStart(2,'0')}
              </div>
            ))}
          </div>

          {/* Day columns */}
          {days.map(day => {
            const dayEvents = events
              .filter(e => e.day === day && e.category !== 'hotel')
              .sort((a, b) => a.time.localeCompare(b.time))

            return (
              <div key={day} style={{ width: DAY_COL_W }}
                className="flex-shrink-0 border-l border-slate-100 relative">
                {/* Grid lines */}
                {hours.map(h => (
                  <div key={h} style={{ top: (h - GRID_START) * SLOT_H }}
                    className="absolute left-0 right-0 border-t border-slate-100" />
                ))}
                {hours.map(h => (
                  <div key={h + 0.5} style={{ top: (h - GRID_START) * SLOT_H + SLOT_H / 2 }}
                    className="absolute left-0 right-0 border-t border-slate-50 border-dashed" />
                ))}
                {/* Background click */}
                <button className="absolute inset-0 w-full z-0 hover:bg-blue-50/20 transition-colors"
                  onClick={() => onDayClick(day)} />
                {/* Events */}
                {dayEvents.map(ev => {
                  const { top, height, bg, color } = getEventStyle(ev)
                  const Icon = CAT_ICONS[ev.category] || Tag
                  return (
                    <button key={ev.id}
                      onClick={e => { e.stopPropagation(); onDayClick(ev.day) }}
                      style={{ top, height, background: bg, color, borderColor: color + '33' }}
                      className="absolute left-1 right-1 z-10 rounded-xl border px-1.5 py-1 text-left overflow-hidden hover:brightness-95 transition-all shadow-sm">
                      <div className="flex items-start gap-1 h-full">
                        <Icon size={10} strokeWidth={2} className="flex-shrink-0 mt-0.5 opacity-70" />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium leading-tight truncate">
                            {height <= 36 && <span className="opacity-60">{ev.time?.slice(0,5)} </span>}
                            {ev.title}
                          </p>
                          {height > 46 && ev.time && (
                            <p className="text-xs opacity-50 leading-none mt-0.5">{ev.time.slice(0,5)}</p>
                          )}
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
