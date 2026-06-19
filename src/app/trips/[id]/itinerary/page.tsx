'use client'
import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, Map, X, Sparkles, Plane, BedDouble, Compass, UtensilsCrossed, Car, Tag, PlaneLanding, CalendarDays, NotebookPen, CheckCircle2, AlertTriangle, Ticket, Shield, Users, Hash, MapPin, Globe, Wifi, Snowflake, ParkingSquare, Utensils, Dog, Droplets, LayoutGrid, List, LucideIcon } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { Trip, Event } from '@/types'
import { formatDate, CAT_CONFIG, formatCurrency } from '@/lib/utils'
import { fetchWeather, weatherEmoji, type WeatherDay } from '@/lib/weather'
import TripNav from '@/components/layout/TripNav'
import dynamic from 'next/dynamic'
import WeekView from '@/components/itinerary/WeekView'
import DocumentScanner from '@/components/itinerary/DocumentScanner'

const DayMap = dynamic(() => import('@/components/map/DayMap'), { ssr: false })


// Category icon components (Lucide)
const CAT_ICONS: Record<string, LucideIcon> = {
  flight: Plane,
  hotel: BedDouble,
  activity: Compass,
  meal: UtensilsCrossed,
  transport: Car,
  other: Tag,
}

function CategoryIcon({ category, size = 16, className = '' }: { category: string; size?: number; className?: string }) {
  const Icon = CAT_ICONS[category] || Tag
  return <Icon size={size} strokeWidth={1.8} className={className} />
}

function CategoryBadge({ category }: { category: string }) {
  const cfg = CAT_CONFIG[category as keyof typeof CAT_CONFIG] || CAT_CONFIG.other
  const Icon = CAT_ICONS[category] || Tag
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full"
      style={{ background: cfg.bg, color: cfg.color }}>
      <Icon size={11} strokeWidth={2} />
      {cfg.label}
    </span>
  )
}

type Segment = {
  from: string; to: string; flight_number: string; airline: string
  dep_time: string; arr_time: string; arr_date: string; terminal_dep: string; terminal_arr: string
}

const EMPTY_SEG = (): Segment => ({
  from: '', to: '', flight_number: '', airline: '',
  dep_time: '', arr_time: '', arr_date: '', terminal_dep: '', terminal_arr: ''
})

const EMPTY: any = {
  title: '', category: 'activity', time: '09:00',
  event_date: '',
  location: '', note: '', cost: 0, currency: '', paid: false,
  ticket_url: '', insurance_url: '',
  num_stops: 0,
  flight_segments: [EMPTY_SEG()],
  // Accommodation fields
  accom_type: 'apartamento',
  accom_booking_ref: '', accom_pin: '',
  accom_checkin_date: '', accom_checkin_time: '',
  accom_checkout_date: '', accom_checkout_time: '',
  accom_guests_adults: '', accom_guests_children: '',
  accom_address: '', accom_web: '',
  accom_cancel_date: '', accom_cancel_fee: '',
  end_time: '',
  accom_notes: '',
  accom_phone: '',
  accom_room: '',
  accom_parking_info: '',
  accom_breakfast: false,
  accom_parking_included: false,
  accom_pool: false,
  accom_wifi: false,
  accom_ac: false,
  accom_pets: false,
}

function safeHost(url: string) {
  try { return new URL(url).hostname.replace('www.', '') } catch { return 'Link' }
}

function SegmentForm({ seg, idx, total, onChange }: {
  seg: Segment; idx: number; total: number
  onChange: (idx: number, key: keyof Segment, val: string) => void
}) {
  return (
    <div className="bg-white rounded-xl border border-blue-100 p-3 space-y-2">
      <div className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-1">
        Tramo {idx + 1} de {total}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="label">Aerolínea</label>
          <input className="input" value={seg.airline} onChange={e => onChange(idx, 'airline', e.target.value)} placeholder="TAP Air Portugal" />
        </div>
        <div>
          <label className="label">Nº Vuelo</label>
          <input className="input" value={seg.flight_number} onChange={e => onChange(idx, 'flight_number', e.target.value)} placeholder="TP1023" />
        </div>
        <div>
          <label className="label">Origen (IATA)</label>
          <input className="input" value={seg.from} onChange={e => onChange(idx, 'from', e.target.value)} placeholder="MAD" />
        </div>
        <div>
          <label className="label">Destino (IATA)</label>
          <input className="input" value={seg.to} onChange={e => onChange(idx, 'to', e.target.value)} placeholder="LIS" />
        </div>
        <div>
          <label className="label">Hora salida</label>
          <input className="input" type="time" value={seg.dep_time} onChange={e => onChange(idx, 'dep_time', e.target.value)} />
        </div>
        <div>
          <label className="label">Hora llegada</label>
          <input className="input" type="time" value={seg.arr_time} onChange={e => onChange(idx, 'arr_time', e.target.value)} />
        </div>
        <div>
          <label className="label">Terminal salida</label>
          <input className="input" value={seg.terminal_dep} onChange={e => onChange(idx, 'terminal_dep', e.target.value)} placeholder="T2" />
        </div>
        <div>
          <label className="label">Terminal llegada</label>
          <input className="input" value={seg.terminal_arr} onChange={e => onChange(idx, 'terminal_arr', e.target.value)} placeholder="T1" />
        </div>
        <div className="col-span-2">
          <label className="label">📅 Fecha llegada (si diferente al día del vuelo)</label>
          <input className="input" type="date" value={seg.arr_date} onChange={e => onChange(idx, 'arr_date', e.target.value)} />
        </div>
      </div>
    </div>
  )
}

function FlightTimeline({ segments, eventDay }: { segments: Segment[]; eventDay: string }) {
  return (
    <div className="mt-2 bg-blue-50 rounded-xl p-3 space-y-0">
      {segments.map((seg, i) => (
        <div key={i}>
          {/* Segment row */}
          <div className="flex items-start gap-3">
            {/* Timeline dots */}
            <div className="flex flex-col items-center pt-1 w-4 flex-shrink-0">
              <div className="w-3 h-3 rounded-full bg-blue-600 border-2 border-white shadow" />
              {i < segments.length - 1 || seg.arr_time ? (
                <div className="w-0.5 bg-blue-200 flex-1 min-h-[32px]" />
              ) : null}
              {seg.arr_time && <div className="w-3 h-3 rounded-full bg-blue-400 border-2 border-white shadow mt-0" />}
            </div>
            {/* Content */}
            <div className="flex-1 pb-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-blue-800 text-base">{seg.from}</span>
                <span className="text-slate-400">→</span>
                <span className="font-bold text-blue-800 text-base">{seg.to}</span>
                {seg.flight_number && <span className="text-blue-500 font-mono text-xs">{seg.flight_number}</span>}
                {seg.airline && <span className="text-slate-400 text-xs">{seg.airline}</span>}
              </div>
              <div className="flex gap-4 text-xs text-slate-500 font-mono mt-0.5">
                {seg.dep_time && <span className="flex items-center gap-1"><Plane size={11} strokeWidth={1.8} />{seg.dep_time?.slice(0,5)}{seg.terminal_dep ? ` · ${seg.terminal_dep}` : ''}</span>}
                {seg.arr_time && (
                  <span className="inline-flex items-center gap-1.5">
                    <span>🛬 {seg.arr_time?.slice(0,5)}{seg.terminal_arr ? ` · ${seg.terminal_arr}` : ''}</span>
                    {seg.arr_date && seg.arr_date !== eventDay && (
                      <span className="bg-orange-100 text-orange-600 border border-orange-200 font-bold px-1.5 py-0.5 rounded-md" style={{fontSize:'10px'}}>
                        +1 DÍA
                      </span>
                    )}
                  </span>
                )}
              </div>
            </div>
          </div>
          {/* Connection between segments */}
          {i < segments.length - 1 && (
            <div className="flex items-center gap-3 my-1">
              <div className="w-4 flex justify-center flex-shrink-0">
                <div className="w-0.5 h-5 bg-blue-200" />
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full border-2 border-slate-300 bg-white" />
                <span className="text-xs text-slate-400 bg-white border border-slate-200 px-2 py-0.5 rounded-lg">
                  Escala {seg.to}
                </span>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}



// ── DOC STATUS CHECK ─────────────────────────────────────────────────────────
function checkTravelDocs(travelers: any[], tripEndDate: string, destination: string) {
  if (!travelers?.length) return { status: 'missing' as const, msg: 'Sin viajeros' }
  const issues: string[] = []
  const isUSA = /miami|usa|estados unidos|new york|florida/i.test(destination)
  const minPassportDate = new Date(tripEndDate)
  minPassportDate.setMonth(minPassportDate.getMonth() + 6)
  const minStr = minPassportDate.toISOString().slice(0,10)

  travelers.forEach((tv: any) => {
    if (!tv.passport_number) issues.push('Sin pasaporte')
    else if (tv.passport_expiry && tv.passport_expiry < minStr) issues.push('Pasaporte caduca pronto')
    if (isUSA && !tv.esta_number) issues.push('Sin ESTA')
    else if (isUSA && tv.esta_expiry && tv.esta_expiry < tripEndDate) issues.push('ESTA caducada')
  })
  const unique = [...new Set(issues)]
  if (unique.length === 0) return { status: 'ok' as const, msg: 'Docs OK' }
  if (unique.some(i => i.startsWith('Sin '))) return { status: 'missing' as const, msg: unique[0] }
  return { status: 'warn' as const, msg: unique[0] }
}

function DocStatusBadge({ travelers, tripEndDate, destination }: {
  travelers: any[]; tripEndDate: string; destination: string
}) {
  const { status, msg } = checkTravelDocs(travelers, tripEndDate, destination)
  const styles = {
    ok:      'bg-emerald-50 text-emerald-700 border-emerald-200',
    warn:    'bg-amber-50 text-amber-700 border-amber-200',
    missing: 'bg-slate-50 text-slate-400 border-slate-200',
  }
  const icons = {
    ok:      <CheckCircle2 size={10} strokeWidth={2.5} />,
    warn:    <AlertTriangle size={10} strokeWidth={2} />,
    missing: <div className="w-2.5 h-2.5 rounded-full border border-current" />,
  }
  return (
    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border ${styles[status]}`}>
      {icons[status]} {msg}
    </span>
  )
}

// ── PRESENCE BAR ─────────────────────────────────────────────────────────────
type MultiDayEvent = {
  id: string; title: string; category: string
  start: string; end: string; color: string; bg: string
}

function PresenceBar({
  events, days, selDay, onSelect
}: {
  events: any[]; days: string[]; selDay: string | null
  onSelect: (day: string) => void
}) {
  // Build multi-day spans from accommodation events
  const spans: MultiDayEvent[] = events
    .filter(e => e.category === 'hotel' && e.accom_checkin_date && e.accom_checkout_date)
    .map(e => ({
      id: e.id, title: e.title, category: e.category,
      start: e.accom_checkin_date, end: e.accom_checkout_date,
      color: '#065F46', bg: '#D1FAE5'
    }))

  if (spans.length === 0) return null

  return (
    <div className="mb-1">
      {spans.map(span => {
        const startIdx = days.indexOf(span.start)
        const endIdx   = days.indexOf(span.end)
        if (startIdx < 0) return null

        // Render a strip across the days array
        return (
          <div key={span.id} className="flex gap-2 mb-1 overflow-x-auto scrollbar-hide">
            {days.map((day, i) => {
              const inRange = i >= startIdx && i <= endIdx
              const isStart = i === startIdx
              const isEnd   = i === endIdx
              const isMid   = inRange && !isStart && !isEnd

              if (!inRange) return (
                <div key={day} className="flex-shrink-0 min-w-[62px] h-6" />
              )

              return (
                <button key={day} onClick={() => onSelect(span.start)}
                  className="flex-shrink-0 min-w-[62px] h-6 flex items-center relative group"
                  title={span.title}>
                  {/* Connecting line */}
                  <div className="absolute inset-y-0 left-0 right-0 flex items-center">
                    {/* Left connector (not first) */}
                    {!isStart && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1/2 h-2"
                      style={{background: span.bg}} />}
                    {/* Right connector (not last) */}
                    {!isEnd && <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1/2 h-2"
                      style={{background: span.bg}} />}
                  </div>

                  {/* Pill */}
                  <div className={`relative z-10 h-6 flex items-center justify-center text-xs font-medium transition-opacity group-hover:opacity-80 ${
                    isStart ? 'rounded-l-full pl-2.5 pr-1' :
                    isEnd   ? 'rounded-r-full pr-2.5 pl-1' :
                    'px-0'
                  } ${(isStart || isEnd) ? 'w-full' : 'w-full'}`}
                    style={{
                      background: span.bg,
                      color: span.color,
                      borderRadius: isStart && isEnd ? '100px' : isStart ? '100px 0 0 100px' : isEnd ? '0 100px 100px 0' : '0'
                    }}>
                    {isStart && (
                      <span className="truncate max-w-[52px] flex items-center gap-1">
                        <BedDouble size={10} strokeWidth={2} />
                        <span className="truncate">{span.title.split(' ')[0]}</span>
                      </span>
                    )}
                    {isMid && <div className="w-full h-2 rounded-none" style={{background: span.bg}} />}
                  </div>
                </button>
              )
            })}
          </div>
        )
      })}
    </div>
  )
}

// ── AUTO CHECKOUT CHIP ────────────────────────────────────────────────────────
function CheckoutChip({ events, day }: { events: any[]; day: string }) {
  const checkouts = events.filter(e =>
    e.category === 'hotel' && e.accom_checkout_date === day
  )
  if (!checkouts.length) return null
  return (
    <>
      {checkouts.map(e => (
        <div key={e.id} className="flex items-center gap-3 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl mb-3">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-emerald-50">
            <BedDouble size={14} strokeWidth={1.8} className="text-emerald-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-slate-600">Check-out</p>
            <p className="text-sm text-slate-700 truncate">{e.title}</p>
          </div>
          {e.accom_checkout_time && (
            <span className="text-xs font-mono text-slate-400 flex-shrink-0">
              hasta {e.accom_checkout_time.slice(0,5)}
            </span>
          )}
        </div>
      ))}
    </>
  )
}

export default function ItineraryPage({ params }: { params: { id: string } }) {
  const { id } = params
  const [trip, setTrip] = useState<Trip | null>(null)
  const [events, setEvents] = useState<Event[]>([])
  const [tripMembers, setTripMembers] = useState<any[]>([])
  const [dayNotes, setDayNotes] = useState<Record<string, string>>({})
  const [weather, setWeather] = useState<Record<string, WeatherDay>>({})
  const [selDay, setSelDay] = useState<string | null>(null)
  const [showMap, setShowMap] = useState(false)
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editEvent, setEditEvent] = useState<Event | null>(null)
  const [form, setForm] = useState<any>({ ...EMPTY })
  const [segments, setSegments] = useState<Segment[]>([EMPTY_SEG()])
  const [saving, setSaving] = useState(false)
  const [viewMode, setViewMode] = useState<'week'|'day'>('week')
  const [showScanner, setShowScanner] = useState(false)

  useEffect(() => { loadData() }, [id])

  async function loadData() {
    const [{ data: t }, { data: ev }, { data: dn }, { data: tm }] = await Promise.all([
      supabase.from('trips').select('*').eq('id', id).single(),
      supabase.from('events').select('*').eq('trip_id', id).order('day').order('time'),
      supabase.from('day_notes').select('*').eq('trip_id', id),
      supabase.from('trip_members').select('*, family_member:family_members(*)').eq('trip_id', id),
    ])
    if (t) { setTrip(t); setSelDay(t.start_date); fetchWeather(t.destination).then(setWeather) }
    setTripMembers((tm || []).map((item: any) => item.family_member).filter(Boolean))
    setEvents(ev || [])
    const notes: Record<string, string> = {}
    ;(dn || []).forEach((n: any) => { notes[n.day] = n.content })
    setDayNotes(notes)
    setLoading(false)
  }

  async function saveNote(day: string, content: string) {
    setDayNotes(n => ({ ...n, [day]: content }))
    const { data: ex } = await supabase.from('day_notes').select('id').eq('trip_id', id).eq('day', day).single()
    if (ex) await supabase.from('day_notes').update({ content }).eq('id', ex.id)
    else await supabase.from('day_notes').insert({ trip_id: id, day, content })
  }

  function setNumStops(n: number) {
    const cur = segments.length
    const target = n + 1
    if (target > cur) {
      setSegments(prev => [...prev, ...Array(target - cur).fill(null).map(EMPTY_SEG)])
    } else {
      setSegments(prev => prev.slice(0, target))
    }
    setForm((f: any) => ({ ...f, num_stops: n }))
  }

  function updateSegment(idx: number, key: keyof Segment, val: string) {
    setSegments(prev => prev.map((s, i) => i === idx ? { ...s, [key]: val } : s))
  }

  function handleExtracted(data: any) {
    setShowScanner(false)
    // Merge extracted data into form, set day
    setForm({ ...EMPTY, ...data, event_date: data.event_date || selDay })
    setSelDay(data.event_date || selDay)
    setViewMode('day')
    setShowForm(true)
  }

  function openNew() {
    setForm({ ...EMPTY }); setSegments([EMPTY_SEG()]); setEditEvent(null); setShowForm(true)
  }

  function openEdit(ev: Event) {
    const e = ev as any
    const segs: Segment[] = e.flight_segments
      ? e.flight_segments
      : [{ from: e.from_airport || '', to: e.to_airport || '', flight_number: e.flight_number || '',
            airline: e.airline || '', dep_time: e.dep_time || '', arr_time: e.arr_time || '',
            terminal_dep: e.terminal || '', terminal_arr: e.arr_terminal || '' }]
    setSegments(segs)
    setForm({
      title: e.title, category: e.category, time: e.time || '09:00',
      event_date: e.day || '',
      location: e.location || '', note: e.note || '', cost: e.cost || 0,
      ticket_url: e.ticket_url || '', insurance_url: e.insurance_url || '',
      currency: e.currency || '',
      paid: e.paid || false,
      num_stops: segs.length - 1,
      end_time: e.end_time || '',
      accom_type: e.accom_type || 'apartamento',
      accom_booking_ref: e.accom_booking_ref || '',
      accom_pin: e.accom_pin || '',
      accom_checkin_date: e.accom_checkin_date || '',
      accom_checkin_time: e.accom_checkin_time || '',
      accom_checkout_date: e.accom_checkout_date || '',
      accom_checkout_time: e.accom_checkout_time || '',
      accom_guests_adults: e.accom_guests_adults || '',
      accom_guests_children: e.accom_guests_children || '',
      accom_address: e.accom_address || '',
      accom_web: e.accom_web || '',
      accom_cancel_date: e.accom_cancel_date || '',
      accom_cancel_fee: e.accom_cancel_fee || '',
      accom_notes: e.accom_notes || '',
      accom_phone: e.accom_phone || '',
      accom_room: e.accom_room || '',
      accom_parking_info: e.accom_parking_info || '',
      accom_breakfast: e.accom_breakfast || false,
      accom_parking_included: e.accom_parking_included || false,
      accom_pool: e.accom_pool || false,
      accom_wifi: e.accom_wifi || false,
      accom_ac: e.accom_ac || false,
      accom_pets: e.accom_pets || false,
    })
    setEditEvent(ev); setShowForm(true)
  }

  async function handleSave() {
    if (!form.title.trim()) return
    setSaving(true)
    const firstSeg = segments[0]
    const flightTime = form.category === 'flight' ? (firstSeg?.dep_time || form.time) : form.time
    const payload: any = {
      trip_id: id, day: (isAccom && form.accom_checkin_date) ? form.accom_checkin_date : (form.event_date || selDay), time: flightTime,
      title: form.title, category: form.category,
      location: form.location || null, note: form.note || null,
      cost: Number(form.cost) || 0,
      ticket_url: form.ticket_url || null,
      insurance_url: form.insurance_url || null,
      currency: form.currency || null,
      paid: form.paid || false,
      num_stops: form.category === 'flight' ? form.num_stops : null,
      flight_segments: form.category === 'flight' ? segments : null,
      accom_type: form.category === 'hotel' ? form.accom_type : null,
      accom_booking_ref: form.accom_booking_ref || null,
      accom_pin: form.accom_pin || null,
      accom_checkin_date: form.accom_checkin_date || null,
      accom_checkin_time: form.accom_checkin_time || null,
      accom_checkout_date: form.accom_checkout_date || null,
      accom_checkout_time: form.accom_checkout_time || null,
      accom_guests_adults: form.accom_guests_adults || null,
      accom_guests_children: form.accom_guests_children || null,
      accom_address: form.accom_address || null,
      accom_web: form.accom_web || null,
      accom_cancel_date: form.accom_cancel_date || null,
      accom_cancel_fee: form.accom_cancel_fee || null,
      accom_notes: form.accom_notes || null,
      accom_phone: form.accom_phone || null,
      accom_room: form.accom_room || null,
      accom_parking_info: form.accom_parking_info || null,
      accom_breakfast: form.accom_breakfast || false,
      accom_parking_included: form.accom_parking_included || false,
      accom_pool: form.accom_pool || false,
      accom_wifi: form.accom_wifi || false,
      accom_ac: form.accom_ac || false,
      accom_pets: form.accom_pets || false,
      // Keep legacy fields for compat
      from_airport: firstSeg?.from || null,
      to_airport: segments[segments.length - 1]?.to || null,
      flight_number: segments.map(s => s.flight_number).filter(Boolean).join(' / ') || null,
      airline: firstSeg?.airline || null,
      dep_time: firstSeg?.dep_time || null,
      arr_time: segments[segments.length - 1]?.arr_time || null,
      terminal: firstSeg?.terminal_dep || null,
      arr_terminal: segments[segments.length - 1]?.terminal_arr || null,
    }
    if (editEvent) await supabase.from('events').update(payload).eq('id', editEvent.id)
    else await supabase.from('events').insert(payload)
    const { data: ev } = await supabase.from('events').select('*').eq('trip_id', id).order('day').order('time')
    setEvents(ev || []); setShowForm(false); setEditEvent(null); setSaving(false)
  }

  async function handleDelete(evId: string) {
    if (!confirm('¿Eliminar este evento?')) return
    await supabase.from('events').delete().eq('id', evId)
    setEvents(prev => prev.filter(e => e.id !== evId))
  }

  function upd(k: string, v: any) { setForm((f: any) => ({ ...f, [k]: v })) }

  if (loading || !trip) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="flex items-center gap-2 text-slate-400 animate-pulse"><Plane size={18} strokeWidth={1.5} /> Cargando...</div>
    </div>
  )

  const days: string[] = []
  const start = new Date(trip.start_date + 'T00:00:00')
  const end = new Date(trip.end_date + 'T00:00:00')
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const y = d.getFullYear(), m = String(d.getMonth()+1).padStart(2,'0'), dd = String(d.getDate()).padStart(2,'0')
    days.push(`${y}-${m}-${dd}`)
  }

  const dayEvents = events.filter(e => e.day === selDay).sort((a, b) => a.time.localeCompare(b.time))
  const dayW = selDay ? weather[selDay] : null
  const eventsWithCoords = dayEvents.filter(e => e.lat && e.lng)
  const isFlight = form.category === 'flight'
  const isAccom = form.category === 'hotel'

  return (
    <div className="min-h-screen bg-slate-50">
      <TripNav trip={trip} active="itinerary" />
      <div className="max-w-4xl mx-auto px-4 pb-12">

        {/* View toggle + day picker */}
        <div className="flex items-center justify-between mb-2 pt-2">
          <button onClick={() => setShowScanner(true)}
            className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-xl border border-violet-200 text-violet-600 hover:bg-violet-50 transition-colors font-medium">
            <Sparkles size={14} strokeWidth={2} /> Escanear billete
          </button>
          <div className="flex bg-slate-100 rounded-xl p-0.5 gap-0.5">
            <button onClick={() => setViewMode('week')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                viewMode === 'week' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400 hover:text-slate-600'
              }`}>
              <LayoutGrid size={13} strokeWidth={2} /> Vista general
            </button>
            <button onClick={() => setViewMode('day')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                viewMode === 'day' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400 hover:text-slate-600'
              }`}>
              <List size={13} strokeWidth={2} /> Vista día
            </button>
          </div>
          {viewMode === 'day' && (
            <div className="flex gap-2">
              <button onClick={() => setShowScanner(true)}
                className="btn-secondary text-sm flex items-center gap-1.5 border-violet-200 text-violet-600 hover:bg-violet-50">
                <Sparkles size={14} strokeWidth={2} /> IA
              </button>
              <button onClick={openNew} className="btn-primary text-sm flex items-center gap-1.5">
                <Plus size={14} strokeWidth={2.5} /> Añadir
              </button>
            </div>
          )}
        </div>

        {/* Week view */}
        {viewMode === 'week' && (
          <div className="mb-4">
            <WeekView
              trip={trip} events={events} days={days}
              onDayClick={day => { setSelDay(day); setViewMode('day'); setShowForm(false) }}
            />
          </div>
        )}

        {/* Presence bar — multi-day events */}
        {viewMode === 'day' && <div className="overflow-x-auto scrollbar-hide">
          <PresenceBar events={events} days={days} selDay={selDay}
            onSelect={day => { setSelDay(day); setShowForm(false) }} />
        </div>}
        {/* Day picker */}
        {viewMode === 'day' && <div className="flex gap-2 overflow-x-auto py-2 pb-4">
          {days.map(day => {
            const dt = new Date(day + 'T00:00:00')
            const hasEv = events.some(e => e.day === day)
            const isOn = selDay === day
            return (
              <button key={day} onClick={() => { setSelDay(day); setShowForm(false) }}
                className={`flex-shrink-0 flex flex-col items-center px-3 py-2 rounded-2xl min-w-[62px] transition-all ${
                  isOn ? 'bg-gradient-to-b from-blue-600 to-violet-600 text-white shadow-lg scale-105'
                       : 'bg-white border border-slate-200 text-slate-600 hover:border-blue-300'
                }`}>
                <span className="text-xs uppercase tracking-wide opacity-70 font-mono">
                  {dt.toLocaleDateString('es-ES', { weekday: 'short' })}
                </span>
                <span className="text-xl font-bold leading-tight">{dt.getDate()}</span>
                <span className="text-xs opacity-70 font-mono">
                  {dt.toLocaleDateString('es-ES', { month: 'short' })}
                </span>
                {/* Weather mini */}
                {(() => {
                  const w = weather[day]
                  if (w) return (
                    <div className="flex flex-col items-center mt-1 gap-0">
                      <span className="text-sm leading-none">{weatherEmoji(w.icon)}</span>
                      <span className={`text-xs font-mono font-semibold leading-tight ${isOn ? 'text-white/90' : 'text-slate-600'}`}>
                        {w.temp}°
                      </span>
                    </div>
                  )
                  return hasEv
                    ? <div className={`w-1.5 h-1.5 rounded-full mt-1 ${isOn ? 'bg-white/60' : 'bg-blue-500'}`} />
                    : null
                })()}
                {/* Arrival indicator */}
                {(() => {
                  const hasArrival = events.some(e => {
                    const segs = (e as any).flight_segments as Segment[] | null
                    return segs?.some(s => s.arr_date === day && s.arr_date !== e.day)
                  })
                  return hasArrival ? (
                    <div className={`mt-0.5 ${isOn ? 'text-orange-200' : 'text-orange-400'}`} title="Llegada de vuelo">
                      <PlaneLanding size={12} strokeWidth={1.8} />
                    </div>
                  ) : null
                })()}
              </button>
            )
          })}
        </div>}

        {selDay && viewMode === 'day' && (
          <>
            {dayW && (
              <div className="bg-gradient-to-r from-sky-50 to-blue-50 border border-sky-200 rounded-2xl p-3 mb-4 flex items-center gap-4 flex-wrap">
                <span className="text-3xl">{weatherEmoji(dayW.icon)}</span>
                <div>
                  <span className="text-2xl font-bold text-blue-700">{dayW.temp_max ?? dayW.temp}°</span>
                  <span className="text-blue-400 text-sm ml-1">{dayW.temp_min ?? dayW.temp}°</span>
                  <span className="text-slate-500 text-sm ml-2 capitalize">{dayW.description}</span>
                </div>
                <div className="flex gap-3 text-sm text-slate-500 ml-auto">
                  <span>💧 {dayW.rain_prob}%</span>
                  <span>💨 {dayW.wind_speed}km/h</span>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-800 capitalize">
                {formatDate(selDay, 'EEEE, d MMMM')}
              </h2>
              <div className="flex gap-2">
                {eventsWithCoords.length > 0 && (
                  <button onClick={() => setShowMap(v => !v)}
                    className={`btn-secondary text-sm flex items-center gap-1.5 ${showMap ? 'bg-blue-50 border-blue-300 text-blue-700' : ''}`}>
                    <Map size={14} /> Mapa
                  </button>
                )}
                <button onClick={openNew} className="btn-primary text-sm flex items-center gap-1.5"><Plus size={14} strokeWidth={2.5} /> Añadir</button>
              </div>
            </div>

            {showMap && eventsWithCoords.length > 0 && (
              <div className="card mb-4 overflow-hidden h-64"><DayMap events={eventsWithCoords} /></div>
            )}

            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 mb-4">
              <div className="text-xs font-semibold text-amber-600 uppercase tracking-wide mb-1 flex items-center gap-1.5"><NotebookPen size={11} strokeWidth={2} /> Notas del día</div>
              <textarea className="w-full bg-transparent text-sm text-slate-700 resize-none focus:outline-none min-h-[40px]"
                placeholder="Escribe una nota para este día..."
                defaultValue={dayNotes[selDay] || ''}
                onBlur={e => { if (e.target.value !== (dayNotes[selDay] || '')) saveNote(selDay, e.target.value) }} />
            </div>

            {/* ── CHECKOUT CHIP ── */}
            {selDay && (() => {
              const checkouts = events.filter(e =>
                e.category === 'hotel' &&
                e.accom_checkout_date &&
                String(e.accom_checkout_date).slice(0,10) === selDay
              )
              if (!checkouts.length) return null
              return (
                <>
                  {checkouts.map(e => (
                    <div key={e.id + '-checkout'} className="flex items-center gap-3 px-4 py-2.5 bg-emerald-50 border border-emerald-200 rounded-2xl mb-3">
                      <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-emerald-100">
                        <BedDouble size={14} strokeWidth={1.8} className="text-emerald-700" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wide">Check-out</p>
                        <p className="text-sm font-medium text-slate-700 truncate">{e.title}</p>
                      </div>
                      {e.accom_checkout_time && (
                        <span className="text-xs font-mono text-emerald-600 bg-emerald-100 px-2 py-1 rounded-lg flex-shrink-0">
                          hasta {String(e.accom_checkout_time).slice(0,5)}
                        </span>
                      )}
                    </div>
                  ))}
                </>
              )
            })()}


            {/* ── FORM ── */}
            {showForm && (
              <div className="card p-5 mb-4 border-blue-200 bg-blue-50/30">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="font-semibold text-slate-800">{(() => {
                    const labels: Record<string,string> = {flight:'Vuelo',hotel:'Alojamiento',activity:'Actividad',meal:'Comida',transport:'Transporte',other:'Otro'}
                    const cat = labels[form.category] || 'Elemento'
                    return editEvent ? `Editar ${cat.toLowerCase()}` : `Nuevo ${cat.toLowerCase()}`
                  })()}</h3>
                  <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600 text-xl">✕</button>
                </div>

                <div className="space-y-3">
                  {/* Categoría */}
                  <div>
                    <label className="label">Categoría</label>
                    <select className="input" value={form.category} onChange={e => upd('category', e.target.value)}>
                      {Object.entries(CAT_CONFIG).map(([k, v]) => (
                        <option key={k} value={k}>{v.label}</option>
                      ))}
                    </select>
                  </div>

                  {/* Título */}
                  <div>
                    <label className="label">Título *</label>
                    <input className="input" value={form.title} onChange={e => upd('title', e.target.value)}
                      placeholder={isFlight ? 'VUELO MAD → MIA' : 'Nombre del evento'} autoFocus />
                  </div>

                  {/* Date — hide for accommodation (uses checkin date) */}
                  {!isAccom && (
                  <div>
                    <label className="label">📅 Fecha del evento</label>
                    <input className="input" type="date" value={form.event_date || selDay || ''}
                      onChange={e => upd('event_date', e.target.value)}
                      min={trip.start_date} max={trip.end_date} />
                  </div>
                  )}

                  {isAccom && (
                    <div className="space-y-3">
                      {/* Subtipo */}
                      <div>
                        <label className="label">Tipo de alojamiento</label>
                        <div className="flex gap-2 flex-wrap">
                          {['Hotel','Apartamento','Casa rural','Hostal','Resort','Otro'].map(t => (
                            <button key={t} type="button"
                              onClick={() => upd('accom_type', t.toLowerCase())}
                              className={`px-3 py-1.5 rounded-xl text-sm border transition-all ${
                                form.accom_type === t.toLowerCase()
                                  ? 'bg-green-600 text-white border-green-600'
                                  : 'bg-white text-slate-600 border-slate-200 hover:border-green-300'
                              }`}>{t}</button>
                          ))}
                        </div>
                      </div>
                      {/* Nº reserva + PIN */}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="label">Nº Reserva</label>
                          <input className="input" value={form.accom_booking_ref} onChange={e => upd('accom_booking_ref', e.target.value)} placeholder="6749117536" />
                        </div>
                        <div>
                          <label className="label">PIN (confidencial)</label>
                          <input className="input" value={form.accom_pin} onChange={e => upd('accom_pin', e.target.value)} placeholder="2360" />
                        </div>
                      </div>
                      {/* Check-in */}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="label">📅 Check-in fecha</label>
                          <input className="input" type="date" value={form.accom_checkin_date} onChange={e => upd('accom_checkin_date', e.target.value)} />
                        </div>
                        <div>
                          <label className="label">⏰ Check-in hora (desde)</label>
                          <input className="input" type="time" value={form.accom_checkin_time} onChange={e => upd('accom_checkin_time', e.target.value)} />
                        </div>
                      </div>
                      {/* Check-out */}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="label">📅 Check-out fecha</label>
                          <input className="input" type="date" value={form.accom_checkout_date} onChange={e => upd('accom_checkout_date', e.target.value)} />
                        </div>
                        <div>
                          <label className="label">⏰ Check-out hora (hasta)</label>
                          <input className="input" type="time" value={form.accom_checkout_time} onChange={e => upd('accom_checkout_time', e.target.value)} />
                        </div>
                      </div>
                      {/* Huéspedes */}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="label">👤 Adultos</label>
                          <input className="input" type="number" min="1" value={form.accom_guests_adults} onChange={e => upd('accom_guests_adults', e.target.value)} placeholder="2" />
                        </div>
                        <div>
                          <label className="label">👶 Niños</label>
                          <input className="input" type="number" min="0" value={form.accom_guests_children} onChange={e => upd('accom_guests_children', e.target.value)} placeholder="2" />
                        </div>
                      </div>
                      {/* Dirección */}
                      <div>
                        <label className="label">📍 Dirección</label>
                        <input className="input" value={form.accom_address} onChange={e => upd('accom_address', e.target.value)} placeholder="Collins Avenue, Miami Beach 33141" />
                      </div>
                      {/* Web alojamiento */}
                      <div>
                        <label className="label flex items-center gap-1"><Globe size={11} strokeWidth={1.8} /> Web / Link reserva</label>
                        <input className="input" type="url" value={form.accom_web} onChange={e => upd('accom_web', e.target.value)} placeholder="https://booking.com/..." />
                      </div>
                      {/* Cancelación */}
                      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 space-y-2">
                        <div className="text-xs font-semibold text-amber-700 uppercase tracking-wide flex items-center gap-1"><AlertTriangle size={11} strokeWidth={2} /> Política de cancelación</div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="label">Cancelación gratis hasta</label>
                            <input className="input" type="date" value={form.accom_cancel_date} onChange={e => upd('accom_cancel_date', e.target.value)} />
                          </div>
                          <div>
                            <label className="label">Cargo si cancelas después</label>
                            <input className="input" value={form.accom_cancel_fee} onChange={e => upd('accom_cancel_fee', e.target.value)} placeholder="$1.600 / 100%" />
                          </div>
                        </div>
                      </div>
                      {/* Teléfono + Nº habitación */}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="label">📞 Teléfono alojamiento</label>
                          <input className="input" type="tel" value={form.accom_phone} onChange={e => upd('accom_phone', e.target.value)} placeholder="+1 305 000 0000" />
                        </div>
                        <div>
                          <label className="label">🔑 Nº habitación / apto.</label>
                          <input className="input" value={form.accom_room} onChange={e => upd('accom_room', e.target.value)} placeholder="Apt. 4B, Room 302..." />
                        </div>
                      </div>
                      {/* Amenities */}
                      <div>
                        <label className="label">Servicios incluidos</label>
                        <div className="grid grid-cols-3 gap-2">
                          {([
                            {k:'accom_breakfast', Icon: Utensils, label:'Desayuno'},
                            {k:'accom_parking_included', Icon: ParkingSquare, label:'Parking'},
                            {k:'accom_pool', Icon: Droplets, label:'Piscina'},
                            {k:'accom_wifi', Icon: Wifi, label:'WiFi'},
                            {k:'accom_ac', Icon: Snowflake, label:'A/C'},
                            {k:'accom_pets', Icon: Dog, label:'Mascotas'},
                          ] as {k:string;Icon:any;label:string}[]).map(a => (
                            <button key={a.k} type="button"
                              onClick={() => upd(a.k, !form[a.k])}
                              className={`flex items-center gap-1.5 px-2.5 py-2 rounded-xl text-xs border transition-all ${
                                form[a.k]
                                  ? 'bg-green-50 text-green-700 border-green-300 font-medium'
                                  : 'bg-white text-slate-400 border-slate-200 hover:border-slate-300'
                              }`}>
                              <a.Icon size={12} strokeWidth={1.8} /> {a.label}
                            </button>
                          ))}
                        </div>
                      </div>
                      {/* Parking info */}
                      {form.accom_parking_included && (
                      <div>
                        <label className="label">🚗 Info parking (matrícula, altura, precio...)</label>
                        <input className="input" value={form.accom_parking_info} onChange={e => upd('accom_parking_info', e.target.value)} placeholder="Incluido · acceso por Collins Ave." />
                      </div>
                      )}
                      {/* Notas */}
                      <div>
                        <label className="label">🔑 Acceso / Indicaciones de llegada</label>
                        <textarea className="input" rows={2} value={form.accom_notes} onChange={e => upd('accom_notes', e.target.value)} placeholder="Recogida de llaves, código de acceso, parking..." />
                      </div>
                    </div>
                  )}

                  {isFlight ? (
                    <>
                      {/* Número de escalas */}
                      <div>
                        <label className="label">Escalas</label>
                        <div className="flex gap-2">
                          {[
                            { n: 0, label: 'Directo' },
                            { n: 1, label: '1 escala' },
                            { n: 2, label: '2 escalas' },
                          ].map(o => (
                            <button key={o.n} type="button"
                              onClick={() => setNumStops(o.n)}
                              className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-all ${
                                form.num_stops === o.n
                                  ? 'bg-blue-600 text-white border-blue-600 shadow'
                                  : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300'
                              }`}>
                              {o.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Segment forms */}
                      {segments.map((seg, i) => (
                        <SegmentForm key={i} seg={seg} idx={i} total={segments.length} onChange={updateSegment} />
                      ))}
                    </>
                  ) : (
                    <>
                      <div>
                        <label className="label">Hora inicio</label>
                        <input className="input" type="time" value={form.time} onChange={e => upd('time', e.target.value)} />
                      </div>
                      <div>
                        <label className="label">Hora fin <span className="text-slate-400 font-normal">(opcional)</span></label>
                        <input className="input" type="time" value={form.end_time || ''} onChange={e => upd('end_time', e.target.value)} />
                      </div>
                      <div>
                        <label className="label">Lugar</label>
                        <input className="input" value={form.location} onChange={e => upd('location', e.target.value)} placeholder="Nombre del lugar" />
                      </div>
                      <div>
                        <label className="label">Notas</label>
                        <textarea className="input" rows={2} value={form.note} onChange={e => upd('note', e.target.value)} placeholder="Notas adicionales..." />
                      </div>
                    </>
                  )}

                  {/* Coste + Moneda + Pagado */}
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-3">
                    <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">💳 Pago</div>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="col-span-2">
                        <label className="label">Importe</label>
                        <input className="input" type="number" value={form.cost} onChange={e => upd('cost', e.target.value)} placeholder="0" />
                      </div>
                      <div>
                        <label className="label">Moneda</label>
                        <select className="input" value={form.currency || trip.currency} onChange={e => upd('currency', e.target.value)}>
                          {['USD','EUR','GBP','JPY','CHF','CAD','AUD','MXN','BRL'].map(c => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <button type="button"
                        onClick={() => upd('paid', !form.paid)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border transition-all ${
                          form.paid
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                            : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
                        }`}>
                        <span>{form.paid ? '✓' : '○'}</span>
                        {form.paid ? 'Pagado' : 'Pendiente de pago'}
                      </button>
                    </div>
                  </div>
                  {!isAccom && (
                  <div>
                    <label className="label flex items-center gap-1"><Ticket size={11} strokeWidth={1.8} /> Billetes / voucher</label>
                    <input className="input" type="url" value={form.ticket_url} onChange={e => upd('ticket_url', e.target.value)} placeholder="https://drive.google.com/..." />
                  </div>
                  )}
                  <div>
                    <label className="label flex items-center gap-1"><Shield size={11} strokeWidth={1.8} /> Seguro de viaje</label>
                    <input className="input" type="url" value={form.insurance_url} onChange={e => upd('insurance_url', e.target.value)} placeholder="https://drive.google.com/..." />
                  </div>
                </div>

                <div className="flex gap-2 mt-5">
                  <button onClick={handleSave} disabled={saving || !form.title.trim()}
                    className="btn-primary flex-1 py-2.5 disabled:opacity-50">
                    {saving ? 'Guardando...' : editEvent ? 'Actualizar' : 'Añadir evento'}
                  </button>
                  <button onClick={() => setShowForm(false)} className="btn-secondary px-4">Cancelar</button>
                </div>
              </div>
            )}

            {/* ── EVENTS ── */}
            <div className="space-y-3">
              {dayEvents.length === 0 && !showForm ? (
                <div className="card p-12 text-center">
                  <CalendarDays size={40} className="mx-auto text-slate-200 mb-3" strokeWidth={1} />
                  <p className="text-slate-400 mb-4">Sin eventos este día</p>
                  <button onClick={openNew} className="btn-primary text-sm px-6 flex items-center gap-1.5 mx-auto"><Plus size={15} /> Añadir</button>
                </div>
              ) : dayEvents.map(ev => {
                const cfg = CAT_CONFIG[ev.category]
                const e = ev as any
                const segs: Segment[] | null = e.flight_segments

                return (
                  <div key={ev.id} className="card overflow-hidden group">
                    {/* Main content */}
                    <div className="flex gap-3 p-4 pb-3">
                      <div className="flex flex-col items-center pt-0.5 min-w-[44px]">
                        <span className="text-xs font-mono text-slate-400">{ev.time?.slice(0,5)}</span>
                        <div className="mt-1.5 w-9 h-9 rounded-xl flex items-center justify-center"
                          style={{background: cfg.bg}}>
                          {(() => { const Icon = CAT_ICONS[ev.category] || Tag; return <Icon size={17} strokeWidth={1.8} style={{color: cfg.color}} /> })()}
                        </div>
                      </div>
                      <div className="w-px bg-slate-100 self-stretch" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-slate-900">{ev.title}</h3>
                            {ev.location && <p className="text-sm text-slate-500 mt-0.5 flex items-center gap-1"><MapPin size={12} strokeWidth={1.8} className="flex-shrink-0" />{ev.location}</p>}
                            {ev.note && <p className="text-sm text-slate-400 mt-1 italic">{ev.note}</p>}

                            {/* Accommodation details card */}
                            {ev.category === 'hotel' && e.accom_checkin_date && (
                              <div className="mt-2 bg-green-50 rounded-xl p-3 space-y-2">
                                {/* Type badge */}
                                {e.accom_type && (
                                  <span className="text-xs bg-green-100 text-green-700 border border-green-200 px-2 py-0.5 rounded-lg font-medium capitalize">
                                    <BedDouble size={11} strokeWidth={1.8} className="inline mr-1" />{e.accom_type}
                                  </span>
                                )}
                                {/* Check-in / out */}
                                <div className="grid grid-cols-2 gap-2 text-xs font-mono text-slate-600">
                                  <div>
                                    <div className="text-slate-400 mb-0.5">CHECK-IN</div>
                                    <div className="font-semibold text-slate-700">{formatDate(e.accom_checkin_date || '', 'd MMM yyyy')}</div>
                                    {e.accom_checkin_time && <div className="text-green-600">desde {e.accom_checkin_time?.slice(0,5)}</div>}
                                  </div>
                                  <div>
                                    <div className="text-slate-400 mb-0.5">CHECK-OUT</div>
                                    <div className="font-semibold text-slate-700">{formatDate(e.accom_checkout_date || '', 'd MMM yyyy')}</div>
                                    {e.accom_checkout_time && <div className="text-slate-500">hasta {e.accom_checkout_time?.slice(0,5)}</div>}
                                  </div>
                                </div>
                                {/* Guests */}
                                {(e.accom_guests_adults || e.accom_guests_children) && (
                                  <div className="text-xs text-slate-500 flex items-center gap-1">
                                    <Users size={11} strokeWidth={1.8} /> {e.accom_guests_adults && `${e.accom_guests_adults} adulto${e.accom_guests_adults > 1 ? 's' : ''}`}
                                    {e.accom_guests_children && ` · ${e.accom_guests_children} niño${e.accom_guests_children > 1 ? 's' : ''}`}
                                  </div>
                                )}
                                {/* Booking ref */}
                                {e.accom_booking_ref && (
                                  <div className="text-xs text-slate-500 font-mono">
                                    <Hash size={11} strokeWidth={1.8} className="inline mr-0.5" />Reserva: <span className="text-slate-700 font-semibold">{e.accom_booking_ref}</span>
                                    {e.accom_pin && <span className="ml-2 text-slate-400">PIN: {e.accom_pin}</span>}
                                  </div>
                                )}
                                {/* Address */}
                                {e.accom_address && !String(e.accom_address).includes('Latitud') && !String(e.accom_address).includes('Longitud') && (
                                  <a href={`https://maps.google.com/?q=${encodeURIComponent(e.accom_address)}`}
                                    target="_blank" rel="noopener"
                                    className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-blue-600 transition-colors">
                                    <MapPin size={11} strokeWidth={1.8} className="inline mr-0.5" />{e.accom_address}
                                    <span className="text-blue-400 text-xs">→ Maps</span>
                                  </a>
                                )}

                                {/* Amenities badges */}
                                {(e.accom_breakfast || e.accom_parking_included || e.accom_pool || e.accom_wifi || e.accom_ac || e.accom_pets) && (
                                  <div className="flex gap-1 flex-wrap">
                                    {e.accom_breakfast && <span className="inline-flex items-center gap-1 text-xs bg-green-50 text-green-700 border border-green-200 px-1.5 py-0.5 rounded-lg"><Utensils size={10} strokeWidth={1.8} /> Desayuno</span>}
                                    {e.accom_parking_included && <span className="inline-flex items-center gap-1 text-xs bg-blue-50 text-blue-700 border border-blue-100 px-1.5 py-0.5 rounded-lg"><ParkingSquare size={10} strokeWidth={1.8} /> Parking</span>}
                                    {e.accom_pool && <span className="inline-flex items-center gap-1 text-xs bg-cyan-50 text-cyan-700 border border-cyan-100 px-1.5 py-0.5 rounded-lg"><Droplets size={10} strokeWidth={1.8} /> Piscina</span>}
                                    {e.accom_wifi && <span className="inline-flex items-center gap-1 text-xs bg-slate-50 text-slate-600 border border-slate-200 px-1.5 py-0.5 rounded-lg"><Wifi size={10} strokeWidth={1.8} /> WiFi</span>}
                                    {e.accom_ac && <span className="inline-flex items-center gap-1 text-xs bg-slate-50 text-slate-600 border border-slate-200 px-1.5 py-0.5 rounded-lg"><Snowflake size={10} strokeWidth={1.8} /> A/C</span>}
                                    {e.accom_pets && <span className="inline-flex items-center gap-1 text-xs bg-amber-50 text-amber-700 border border-amber-100 px-1.5 py-0.5 rounded-lg"><Dog size={10} strokeWidth={1.8} /> Mascotas</span>}
                                  </div>
                                )}
                                {/* Notes */}
                                {e.accom_notes && (
                                  <div className="text-xs text-slate-400 italic">{e.accom_notes}</div>
                                )}

                              </div>
                            )}
                            {/* Flight segments timeline */}
                            {ev.category === 'flight' && segs && segs.length > 0 && (
                              <FlightTimeline segments={segs} eventDay={ev.day} />
                            )}
                            {/* Fallback for old events without segments */}
                            {ev.category === 'flight' && !segs && e.from_airport && (
                              <div className="mt-2 bg-blue-50 rounded-xl p-2.5 space-y-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-blue-800">{e.from_airport}</span>
                                  <span className="text-slate-400">→</span>
                                  <span className="font-bold text-blue-800">{e.to_airport}</span>
                                  {e.flight_number && <span className="text-blue-500 font-mono text-xs">{e.flight_number}</span>}
                                </div>
                                <div className="flex gap-4 text-xs text-slate-500 font-mono">
                                  {e.dep_time && <span className="flex items-center gap-1"><Plane size={11} strokeWidth={1.8} /> {e.dep_time?.slice(0,5)}{e.terminal ? ` · ${e.terminal}` : ''}</span>}
                                  {e.arr_time && <span>🛬 {e.arr_time?.slice(0,5)}{e.arr_terminal ? ` · ${e.arr_terminal}` : ''}</span>}
                                </div>
                              </div>
                            )}
                          </div>
                          {/* Edit/delete — hover */}
                          <div className="flex flex-col items-end gap-2 flex-shrink-0">
                            <CategoryBadge category={ev.category} />
                            {ev.category === 'flight' && tripMembers.length > 0 && (
                              <DocStatusBadge
                                travelers={tripMembers}
                                tripEndDate={trip.end_date}
                                destination={trip.destination}
                              />
                            )}
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => openEdit(ev)} className="text-slate-300 hover:text-blue-500 p-1.5 rounded-lg hover:bg-blue-50 transition-colors"><Pencil size={13} /></button>
                              <button onClick={() => handleDelete(ev.id)} className="text-slate-300 hover:text-red-500 p-1.5 rounded-lg hover:bg-red-50 transition-colors"><Trash2 size={13} /></button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Footer strip: cost + links + cancel warning */}
                    {(ev.cost > 0 || e.ticket_url || e.insurance_url || e.url || e.accom_web || e.accom_cancel_date) && (
                      <div className="border-t border-slate-100 bg-slate-50">

                        {/* Actions row */}
                        <div className="flex items-center gap-3 px-4 py-2.5">
                          {/* Left: paid status + amount */}
                          {ev.cost > 0 && (
                            <div className="flex items-center gap-2 mr-auto">
                              <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${
                                e.paid ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-600 border-amber-200'
                              }`}>{e.paid ? '✓ Pagado' : '○ Pendiente'}</span>
                              <span className="font-mono font-bold text-slate-800 text-sm">
                                {formatCurrency(ev.cost, e.currency || trip.currency)}
                              </span>
                            </div>
                          )}
                          {/* Right: 1st primary access links, 2nd seguro, 3rd cancel */}
                          {e.ticket_url && (
                            <a href={e.ticket_url} target="_blank" rel="noopener"
                              className="flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl hover:bg-emerald-100 transition-colors font-medium">
                              <Ticket size={12} strokeWidth={2} /> Billetes
                            </a>
                          )}
                          {e.accom_web && (
                            <a href={e.accom_web} target="_blank" rel="noopener"
                              className="flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl hover:bg-emerald-100 transition-colors font-medium">
                              <Ticket size={12} strokeWidth={2} /> Ver reserva
                            </a>
                          )}
                          {e.url && !e.ticket_url && !e.accom_web && (
                            <a href={e.url} target="_blank" rel="noopener"
                              className="flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl hover:bg-emerald-100 transition-colors font-medium">
                              <Ticket size={12} strokeWidth={2} /> {safeHost(e.url)}
                            </a>
                          )}
                          {e.insurance_url && (
                            <a href={e.insurance_url} target="_blank" rel="noopener"
                              className="flex items-center gap-1.5 text-xs text-violet-700 bg-violet-50 border border-violet-200 px-3 py-1.5 rounded-xl hover:bg-violet-100 transition-colors font-medium">
                              <Shield size={12} strokeWidth={2} /> Seguro
                            </a>
                          )}
                          {e.accom_cancel_date && (() => {
                            const d = Math.ceil((new Date(e.accom_cancel_date).getTime() - new Date().getTime()) / 86400000)
                            const urgent = d <= 14
                            return (
                              <span className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl border font-medium ${
                                urgent
                                  ? 'bg-red-50 text-red-700 border-red-200'
                                  : 'bg-violet-50 text-violet-700 border-violet-200'
                              }`} title={e.accom_cancel_fee ? `Cancelación gratuita hasta esta fecha. Después: ${e.accom_cancel_fee}` : 'Fecha límite cancelación gratuita'}>
                                <Shield size={11} strokeWidth={2} /> Cancel. {formatDate(e.accom_cancel_date, 'd MMM')}
                              </span>
                            )
                          })()}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
