'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Trip } from '@/types'
import { daysUntil, formatDate, formatCurrency } from '@/lib/utils'
import TripNav from '@/components/layout/TripNav'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { Plane, BedDouble, Car, Compass, UtensilsCrossed, Tag, CheckCircle2, Circle, ArrowLeftRight, AlertTriangle, Ticket, Shield } from 'lucide-react'

const BCAT: Record<string, { label: string; color: string; bg: string; Icon: any }> = {
  flights:    { label: 'Vuelos',       color: '#1D4ED8', bg: '#DBEAFE', Icon: Plane },
  hotels:     { label: 'Alojamiento',  color: '#065F46', bg: '#D1FAE5', Icon: BedDouble },
  transport:  { label: 'Transporte',   color: '#991B1B', bg: '#FEE2E2', Icon: Car },
  activities: { label: 'Actividades',  color: '#5B21B6', bg: '#EDE9FE', Icon: Compass },
  meals:      { label: 'Comidas',      color: '#92400E', bg: '#FEF3C7', Icon: UtensilsCrossed },
  other:      { label: 'Otros',        color: '#374151', bg: '#F3F4F6', Icon: Tag },
}

const CAT_TO_BCAT: Record<string, string> = {
  flight: 'flights', hotel: 'hotels', transport: 'transport',
  activity: 'activities', meal: 'meals', other: 'other'
}

type EventItem = {
  id: string; title: string; category: string; cost: number
  currency: string; paid: boolean; day: string
  ticket_url?: string; insurance_url?: string
  accom_checkin_date?: string; accom_checkout_date?: string
  accom_cancel_date?: string; accom_cancel_fee?: string
  accom_booking_ref?: string; accom_type?: string
}

export default function BudgetPage({ params }: { params: { id: string } }) {
  const { id } = params
  const [trip, setTrip] = useState<Trip | null>(null)
  const [items, setItems] = useState<EventItem[]>([])
  const [showAlt, setShowAlt] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [{ data: t }, { data: ev }] = await Promise.all([
        supabase.from('trips').select('*, travelers(*)').eq('id', id).single(),
        supabase.from('events').select('*').eq('trip_id', id).gt('cost', 0).order('day'),
      ])
      setTrip(t); setItems((ev || []) as EventItem[]); setLoading(false)
    }
    load()
  }, [id])

  async function togglePaid(item: EventItem) {
    await supabase.from('events').update({ paid: !item.paid }).eq('id', item.id)
    setItems(prev => prev.map(b => b.id === item.id ? { ...b, paid: !b.paid } : b))
  }

  if (loading || !trip) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-slate-400 animate-pulse">Cargando...</div>
    </div>
  )

  function toTripCurrency(item: EventItem) {
    const cur = item.currency || trip!.currency
    if (cur === trip!.currency) return item.cost
    if (cur === trip!.exchange_base) return item.cost / trip!.exchange_rate
    return item.cost
  }

  function toDisplay(amt: number) {
    return showAlt ? amt * trip!.exchange_rate : amt
  }

  const displaySym = showAlt ? trip.exchange_base : trip.currency_sym

  const grouped: Record<string, EventItem[]> = {}
  items.forEach(item => {
    const bcat = CAT_TO_BCAT[item.category] || 'other'
    if (!grouped[bcat]) grouped[bcat] = []
    grouped[bcat].push(item)
  })

  const total = items.reduce((s, b) => s + toTripCurrency(b), 0)
  const paid  = items.reduce((s, b) => s + (b.paid ? toTripCurrency(b) : 0), 0)
  const pending = total - paid

  const pieData = Object.entries(grouped).map(([cat, evs]) => ({
    name: BCAT[cat]?.label || cat,
    value: evs.reduce((s, e) => s + toTripCurrency(e), 0),
    color: BCAT[cat]?.color || '#374151',
  })).filter(d => d.value > 0)

  return (
    <div className="min-h-screen bg-slate-50">
      <TripNav trip={trip} active="budget" />
      <div className="max-w-4xl mx-auto px-4 pb-12">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-slate-800">Presupuesto</h2>
          <button onClick={() => setShowAlt(v => !v)}
            className="flex items-center gap-1.5 text-sm border border-slate-200 bg-white rounded-xl px-3 py-1.5 hover:border-blue-300 transition-colors">
            <ArrowLeftRight size={13} strokeWidth={2} className="text-slate-400" />
            <span className="font-mono text-slate-600">{showAlt ? trip.exchange_base : `${trip.currency_sym} ${trip.currency}`}</span>
          </button>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { label: 'Total', value: total, gradient: 'from-blue-600 to-violet-600' },
            { label: 'Pagado', value: paid, gradient: 'from-emerald-500 to-teal-500' },
            { label: 'Pendiente', value: pending, gradient: 'from-amber-400 to-orange-500' },
          ].map(s => (
            <div key={s.label} className={`rounded-2xl p-4 bg-gradient-to-br ${s.gradient} text-white shadow-md`}>
              <p className="text-white/70 text-xs uppercase tracking-wide mb-1">{s.label}</p>
              <p className="text-white font-bold font-mono text-lg">
                {formatCurrency(toDisplay(s.value), showAlt ? trip.exchange_base : trip.currency, 0)}
              </p>
              {trip.travelers?.length ? (
                <p className="text-white/60 text-xs mt-0.5 font-mono">
                  {formatCurrency(toDisplay(s.value)/trip.travelers.length, showAlt ? trip.exchange_base : trip.currency, 0)} p/p
                </p>
              ) : null}
            </div>
          ))}
        </div>

        {items.length === 0 ? (
          <div className="card p-12 text-center">
            <CreditCard size={40} className="mx-auto text-slate-200 mb-3" strokeWidth={1} />
            <p className="text-slate-400 mb-1">Sin gastos todavía</p>
            <p className="text-slate-300 text-sm">Añade vuelos, alojamiento o actividades con coste desde el Itinerario</p>
          </div>
        ) : (
          <>
            {/* Pie */}
            {pieData.length > 1 && (
              <div className="card p-4 mb-6">
                <h3 className="text-sm font-semibold text-slate-600 mb-4">Distribución</h3>
                <div className="flex gap-4 items-center">
                  <ResponsiveContainer width="40%" height={140}>
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" innerRadius={35} outerRadius={65}
                        dataKey="value" paddingAngle={2}>
                        {pieData.map((d, i) => <Cell key={i} fill={d.color} />)}
                      </Pie>
                      <Tooltip formatter={(v: any) => [formatCurrency(toDisplay(+v), showAlt ? trip.exchange_base : trip.currency, 0), '']} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex-1 space-y-2">
                    {pieData.map(d => {
                      const cfg = Object.values(BCAT).find(b => b.label === d.name)
                      return (
                        <div key={d.name} className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 rounded-full" style={{background: d.color}} />
                            <span className="text-slate-600 text-xs">{d.name}</span>
                          </div>
                          <span className="font-mono text-slate-700 text-xs font-medium">
                            {formatCurrency(toDisplay(d.value), showAlt ? trip.exchange_base : trip.currency, 0)}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Items by category */}
            {Object.entries(grouped).map(([cat, catItems]) => {
              const cfg = BCAT[cat] || BCAT.other
              const { Icon } = cfg
              const catTotal = catItems.reduce((s, e) => s + toTripCurrency(e), 0)
              const catPaid  = catItems.reduce((s, e) => s + (e.paid ? toTripCurrency(e) : 0), 0)
              return (
                <div key={cat} className="mb-5">
                  <div className="flex items-center justify-between mb-2 px-1">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                        style={{background: cfg.bg}}>
                        <Icon size={14} strokeWidth={1.8} style={{color: cfg.color}} />
                      </div>
                      <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                        {cfg.label}
                      </span>
                    </div>
                    <div className="text-xs font-mono text-slate-500">
                      <span className="text-emerald-600">
                        {formatCurrency(toDisplay(catPaid), showAlt ? trip.exchange_base : trip.currency, 0)} pag.
                      </span>
                      {' · '}
                      <span className="font-semibold text-slate-700">
                        {formatCurrency(toDisplay(catTotal), showAlt ? trip.exchange_base : trip.currency, 0)} total
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {catItems.map(item => {
                      const nights = item.accom_checkin_date && item.accom_checkout_date
                        ? Math.round((new Date(item.accom_checkout_date).getTime() - new Date(item.accom_checkin_date).getTime()) / 86400000)
                        : null
                      const cancelDays = daysUntil(item.accom_cancel_date)
                      return (
                        <div key={item.id} className="card p-3 border-l-4"
                          style={{ borderLeftColor: cfg.color }}>
                          <div className="flex items-start gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="font-medium text-slate-900 text-sm">{item.title}</p>
                                {item.accom_type && (
                                  <span className="text-xs px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 capitalize">
                                    {item.accom_type}
                                  </span>
                                )}
                              </div>
                              {item.accom_checkin_date ? (
                                <p className="text-xs text-slate-400 font-mono mt-0.5">
                                  {formatDate(item.accom_checkin_date, 'd MMM')} → {formatDate(item.accom_checkout_date || '', 'd MMM')}
                                  {nights !== null && ` · ${nights} noche${nights !== 1 ? 's' : ''}`}
                                </p>
                              ) : (
                                <p className="text-xs text-slate-400 font-mono mt-0.5">
                                  {formatDate(item.day, 'd MMM yyyy')}
                                </p>
                              )}
                              {item.accom_cancel_date && cancelDays !== null && cancelDays <= 14 && (
                                <p className={`text-xs mt-1 flex items-center gap-1 ${cancelDays <= 7 ? 'text-red-500' : 'text-amber-500'}`}>
                                  <span>⚠️</span> Cancelar antes del {formatDate(item.accom_cancel_date, 'd MMM yyyy')}
                                  {item.accom_cancel_fee && ` · ${item.accom_cancel_fee}`}
                                </p>
                              )}
                              <div className="flex gap-2 mt-1.5 flex-wrap">
                                {item.ticket_url && (
                                  <a href={item.ticket_url} target="_blank" rel="noopener"
                                    className="inline-flex items-center gap-1 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-lg hover:bg-emerald-100">
                                    <Ticket size={11} strokeWidth={2} /> Billetes
                                  </a>
                                )}
                                {item.insurance_url && (
                                  <a href={item.insurance_url} target="_blank" rel="noopener"
                                    className="inline-flex items-center gap-1 text-xs text-violet-700 bg-violet-50 border border-violet-200 px-2 py-0.5 rounded-lg hover:bg-violet-100">
                                    <Shield size={11} strokeWidth={2} /> Seguro
                                  </a>
                                )}
                              </div>
                            </div>
                            <div className="flex flex-col items-end gap-2 flex-shrink-0">
                              <div className="text-right">
                                <div className="font-mono font-bold text-slate-800 text-sm">
                                  {formatCurrency(item.cost, item.currency || trip.currency)}
                                </div>
                                <div className="text-xs font-mono text-slate-400">
                                  ≈ {formatCurrency(toDisplay(toTripCurrency(item)), showAlt ? trip.exchange_base : trip.currency, 0)}
                                </div>
                              </div>
                              <button onClick={() => togglePaid(item)}
                                className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium transition-colors border ${
                                  item.paid
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                    : 'bg-slate-50 text-slate-400 border-slate-200 hover:bg-amber-50 hover:text-amber-600 hover:border-amber-200'
                                }`}>
                                {item.paid
                                  ? <><CheckCircle2 size={11} strokeWidth={2.5} /> Pagado</>
                                  : <><Circle size={11} strokeWidth={2} /> Pendiente</>
                                }
                              </button>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}

            {/* Total */}
            <div className="card p-4 mt-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold text-slate-800">Total viaje</div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    {items.length} reservas · {trip.travelers?.length || 0} viajeros
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold font-mono text-slate-900">
                    {formatCurrency(toDisplay(total), showAlt ? trip.exchange_base : trip.currency)}
                  </div>
                  <div className="text-xs font-mono text-slate-400">
                    {formatCurrency(toDisplay(total)/Math.max(1,trip.travelers?.length||1), showAlt ? trip.exchange_base : trip.currency, 0)} por persona
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
