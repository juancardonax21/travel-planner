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

function timeToMins(t: string | null | undefined): number {
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

// Resolve start/end minutes for any event type
function getEventTimes(ev: Event): { startMins: number; endMins: number } {
  const e = ev as any

  if (ev.category === 'hotel') {
    // Show at check-in time
    const startMins = timeToMins(e.accom_checkin_time || ev.time)
    return { startMins, endMins: startMins + 30 } // 30min block
  }

  if (ev.category === 'flight') {
    const segs = e.flight_segments
    const depTime = segs?.[0]?.dep_time || e.dep_time || ev.time
    const lastSeg = segs?.[segs.length - 1]
    const arrTime = lastSeg?.arr_time || e.arr_time || null
    const startMins = timeToMins(depTime)
    let endMins = arrTime ? timeToMins(arrTime) : startMins + 60

    // Use arr_date to calculate extra days
    const arrDate = lastSeg?.arr_date || null
    const evDay = ev.day || ''
    if (arrDate && evDay && arrDate !== evDay) {
      const diff = Math.round(
        (new Date(arrDate).getTime() - new Date(evDay).getTime()) / 86400000
      )
      endMins += diff * 24 * 60
    } else if (endMins <= startMins) {
      // Fallback: same-date overnight
      endMins += 24 * 60
    }
    return { startMins, endMins }
  }

  // Generic event
  const startMins = timeToMins(ev.time)
  const endMins = e.end_time ? timeToMins(e.end_time) : startMins + 60
  return { startMins, endMins: endMins <= startMins ? startMins + 60 : endMins }
}

export default function WeekView({ trip, events, days, onDayClick }: Props) {
  const totalH = (GRID_END - GRID_START) * SLOT_H
  const hours = Array.from({ length: GRID_END - GRID_START }, (_, i) => GRID_START + i)

  // Multi-day accommodation bars (presence strip)
  const multiDay = events.filter(e =>
    e.category === 'hotel' && (e as any).accom_checkin_date && (e as any).accom_checkout_date
  )

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

        {/* Multi-day presence bar */}
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
                {String(h).padStart(2, '0')}
              </div>
            ))}
          </div>

          {/* Day columns */}
          {days.map(day => {
            // Show ALL events including hotels (as check-in blocks)
            const dayEvents = events
              .filter(e => e.day === day)
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

                {/* Events — including overnight continuations */}
                {dayEvents.map(ev => {
                  const cfg = CAT_CONFIG[ev.category as keyof typeof CAT_CONFIG] || CAT_CONFIG.other
                  const Icon = CAT_ICONS[ev.category] || Tag
                  const { startMins, endMins } = getEventTimes(ev)
                  const isOvernight = endMins > GRID_END * 60

                  const clampedStart = Math.max(startMins, GRID_START * 60)
                  const clampedEnd = Math.min(endMins, GRID_END * 60)
                  if (clampedStart >= GRID_END * 60) return null

                  const top = minsToY(clampedStart)
                  const height = Math.max(minsToY(clampedEnd) - minsToY(clampedStart), 24)

                  const e = ev as any
                  const displayTime = ev.category === 'flight'
                    ? (e.flight_segments?.[0]?.dep_time?.slice(0, 5) || ev.time?.slice(0, 5))
                    : ev.time?.slice(0, 5)

                  return (
                    <button key={ev.id}
                      onClick={evt => { evt.stopPropagation(); onDayClick(ev.day) }}
                      style={{ top, height, background: cfg.bg, color: cfg.color, borderColor: cfg.color + '33' }}
                      className="absolute left-1 right-1 z-10 rounded-xl border px-1.5 py-1 text-left overflow-hidden hover:brightness-95 transition-all shadow-sm">
                      <div className="flex items-start gap-1 h-full overflow-hidden">
                        <Icon size={10} strokeWidth={2} className="flex-shrink-0 mt-0.5 opacity-70" />
                        <div className="min-w-0 flex-1 overflow-hidden">
                          <p className="text-xs font-medium leading-tight truncate">{ev.title}</p>
                          {height > 36 && displayTime && (
                            <p className="text-xs opacity-50 leading-none mt-0.5">{displayTime}{isOvernight ? ' →+1' : ''}</p>
                          )}
                        </div>
                      </div>
                    </button>
                  )
                })}
                {/* Auto checkout blocks */}
                {events.filter(ev => {
                  const ea = ev as any
                  return ev.category === 'hotel' &&
                    ea.accom_checkout_date &&
                    String(ea.accom_checkout_date).slice(0,10) === day
                }).map(ev => {
                  const e = ev as any
                  const cfg = CAT_CONFIG['hotel' as keyof typeof CAT_CONFIG]
                  const checkoutTime = e.accom_checkout_time?.slice(0,5) || '12:00'
                  const startMins = timeToMins(checkoutTime)
                  const clampedStart = Math.max(startMins, GRID_START * 60)
                  if (clampedStart >= GRID_END * 60) return null
                  const top = minsToY(clampedStart)
                  const height = Math.max(minsToY(clampedStart + 30) - top, 24)
                  return (
                    <button key={ev.id + '-checkout'}
                      onClick={evt => { evt.stopPropagation(); onDayClick(day) }}
                      style={{ top, height, background: '#D1FAE5', color: '#065F46', borderColor: '#6EE7B7' }}
                      className="absolute left-1 right-1 z-10 rounded-xl border px-1.5 py-1 text-left overflow-hidden hover:brightness-95 transition-all shadow-sm">
                      <div className="flex items-start gap-1 h-full overflow-hidden">
                        <BedDouble size={10} strokeWidth={2} className="flex-shrink-0 mt-0.5 opacity-70" />
                        <div className="min-w-0 flex-1 overflow-hidden">
                          <p className="text-xs font-medium leading-tight truncate">Check-out</p>
                          {height > 36 && <p className="text-xs opacity-50 leading-none mt-0.5">hasta {checkoutTime}</p>}
                        </div>
                      </div>
                    </button>
                  )
                })}
                {/* Overnight continuations from previous day */}
                {(() => {
                  const dayIdx = days.indexOf(day)
                  if (dayIdx <= 0) return null
                  const prevDay = days[dayIdx - 1]
                  const prevDayEvents = events.filter(e => e.day === prevDay)
                  return prevDayEvents.map(ev => {
                    const { startMins, endMins } = getEventTimes(ev)
                    if (endMins <= GRID_END * 60) return null // not overnight
                    const cfg = CAT_CONFIG[ev.category as keyof typeof CAT_CONFIG] || CAT_CONFIG.other
                    const Icon = CAT_ICONS[ev.category] || Tag
                    const arrMins = endMins - 24 * 60 // actual arrival time in next day
                    const clampedEnd = Math.min(arrMins, GRID_END * 60)
                    const top = minsToY(GRID_START * 60)
                    const height = Math.max(minsToY(clampedEnd) - top, 24)
                    const e = ev as any
                    const arrTime = e.flight_segments?.[e.flight_segments.length-1]?.arr_time?.slice(0,5) || ''
                    return (
                      <button key={ev.id + '-cont'}
                        onClick={evt => { evt.stopPropagation(); onDayClick(ev.day) }}
                        style={{ top, height, background: cfg.bg, color: cfg.color, borderColor: cfg.color + '33' }}
                        className="absolute left-1 right-1 z-10 rounded-xl border px-1.5 py-1 text-left overflow-hidden hover:brightness-95 transition-all shadow-sm opacity-80">
                        <div className="flex items-start gap-1 h-full overflow-hidden">
                          <Icon size={10} strokeWidth={2} className="flex-shrink-0 mt-0.5 opacity-70" />
                          <div className="min-w-0 flex-1 overflow-hidden">
                            <p className="text-xs font-medium leading-tight truncate">{ev.title}</p>
                            {height > 36 && arrTime && (
                              <p className="text-xs opacity-50 leading-none mt-0.5">llega {arrTime}</p>
                            )}
                          </div>
                        </div>
                      </button>
                    )
                  })
                })()}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
