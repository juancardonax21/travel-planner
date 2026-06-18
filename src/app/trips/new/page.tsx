'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import type { FamilyMember } from '@/types'
import { fetchExchangeRate } from '@/lib/weather'
import { Users, Plus, CheckCircle2, AlertTriangle, X } from 'lucide-react'
import Link from 'next/link'

const CURRENCIES = [
  {c:'USD',s:'$'},{c:'EUR',s:'€'},{c:'GBP',s:'£'},{c:'JPY',s:'¥'},
  {c:'CHF',s:'Fr'},{c:'CAD',s:'CA$'},{c:'AUD',s:'A$'},{c:'MXN',s:'$MX'},
]

export default function NewTripPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [saving, setSaving] = useState(false)
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [rateLoading, setRateLoading] = useState(false)

  const [form, setForm] = useState({
    name: '', destination: '',
    start_date: '', end_date: '',
    currency: 'USD', currency_sym: '$',
    exchange_base: 'EUR', exchange_rate: 0.92,
  })

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) return
      supabase.from('family_members')
        .select('*').eq('user_id', data.user.id).order('name')
        .then(({ data: fm }) => {
          setFamilyMembers(fm || [])
          // Select all by default
          setSelectedIds(new Set((fm || []).map(m => m.id)))
        })
    })
  }, [])

  function upd(k: string, v: any) { setForm(f => ({ ...f, [k]: v })) }

  async function refreshRate() {
    setRateLoading(true)
    const rate = await fetchExchangeRate(form.currency, form.exchange_base)
    if (rate) upd('exchange_rate', Math.round(rate * 100000) / 100000)
    setRateLoading(false)
  }

  function toggleMember(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  // Doc alerts for selected members
  function getMemberAlerts(m: FamilyMember): string[] {
    if (!form.end_date) return []
    const alerts: string[] = []
    const isUSA = /miami|usa|florida|new york|estados unidos/i.test(form.destination)
    const minPP = new Date(form.end_date); minPP.setMonth(minPP.getMonth() + 6)
    const minPPStr = minPP.toISOString().slice(0,10)
    if (!m.passport_number) alerts.push('Sin pasaporte')
    else if (m.passport_expiry && m.passport_expiry < minPPStr) alerts.push('Pasaporte caduca antes del viaje +6m')
    if (isUSA && !m.esta_number) alerts.push('Sin ESTA (destino USA)')
    else if (isUSA && m.esta_expiry && m.esta_expiry < form.end_date) alerts.push('ESTA caduca antes del viaje')
    return alerts
  }

  async function handleCreate() {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: trip } = await supabase.from('trips').insert({
      ...form, user_id: user.id
    }).select().single()

    if (trip) {
      // Link selected family members
      if (selectedIds.size > 0) {
        await supabase.from('trip_members').insert(
          Array.from(selectedIds).map(fmId => ({
            trip_id: trip.id,
            family_member_id: fmId
          }))
        )
      }
      router.push(`/trips/${trip.id}/itinerary`)
    }
    setSaving(false)
  }

  const totalAlerts = familyMembers
    .filter(m => selectedIds.has(m.id))
    .flatMap(m => getMemberAlerts(m))

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-gradient-to-r from-blue-800 via-blue-600 to-violet-600 text-white shadow-lg">
        <div className="max-w-2xl mx-auto px-4 py-5">
          <Link href="/trips" className="text-blue-200 hover:text-white text-sm mb-3 inline-flex items-center gap-1.5 transition-colors">
            ← Mis viajes
          </Link>
          <h1 className="text-xl font-bold">Nuevo viaje</h1>
          {/* Steps */}
          <div className="flex items-center gap-2 mt-4">
            {[1,2,3].map(n => (
              <div key={n} className="flex items-center gap-2">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                  step === n ? 'bg-white text-blue-700' :
                  step > n ? 'bg-white/30 text-white' :
                  'bg-white/15 text-white/50'
                }`}>{step > n ? '✓' : n}</div>
                {n < 3 && <div className={`w-8 h-0.5 ${step > n ? 'bg-white/50' : 'bg-white/20'}`} />}
              </div>
            ))}
            <span className="text-blue-200 text-xs ml-2">
              {step === 1 ? 'Datos del viaje' : step === 2 ? 'Viajeros' : 'Resumen'}
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6">

        {/* Step 1: Trip data */}
        {step === 1 && (
          <div className="card p-6 space-y-4">
            <h2 className="font-semibold text-slate-800">Datos del viaje</h2>
            <div>
              <label className="label">Nombre del viaje *</label>
              <input className="input" placeholder="Semana Santa 2027 en Miami"
                value={form.name} onChange={e => upd('name', e.target.value)} autoFocus />
            </div>
            <div>
              <label className="label">Destino *</label>
              <input className="input" placeholder="Miami, Florida, USA"
                value={form.destination} onChange={e => upd('destination', e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Fecha salida</label>
                <input className="input" type="date" value={form.start_date} onChange={e => upd('start_date', e.target.value)} />
              </div>
              <div>
                <label className="label">Fecha vuelta</label>
                <input className="input" type="date" value={form.end_date} onChange={e => upd('end_date', e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-1">
                <label className="label">Moneda</label>
                <select className="input" value={form.currency} onChange={e => {
                  const c = CURRENCIES.find(x => x.c === e.target.value)
                  upd('currency', e.target.value)
                  if (c) upd('currency_sym', c.s)
                }}>
                  {CURRENCIES.map(c => <option key={c.c} value={c.c}>{c.c}</option>)}
                </select>
              </div>
              <div className="col-span-1">
                <label className="label">Referencia</label>
                <select className="input" value={form.exchange_base} onChange={e => upd('exchange_base', e.target.value)}>
                  {CURRENCIES.map(c => <option key={c.c} value={c.c}>{c.c}</option>)}
                </select>
              </div>
              <div className="col-span-1">
                <label className="label">Tipo cambio</label>
                <div className="flex gap-1">
                  <input className="input" type="number" step="0.001" value={form.exchange_rate}
                    onChange={e => upd('exchange_rate', parseFloat(e.target.value) || 1)} />
                  <button onClick={refreshRate} disabled={rateLoading}
                    className="btn-secondary px-2 text-xs flex-shrink-0">
                    {rateLoading ? '...' : '↻'}
                  </button>
                </div>
              </div>
            </div>
            <button onClick={() => setStep(2)}
              disabled={!form.name.trim() || !form.destination.trim()}
              className="btn-primary w-full py-3 disabled:opacity-50">
              Siguiente → Viajeros
            </button>
          </div>
        )}

        {/* Step 2: Select members */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="card p-6">
              <h2 className="font-semibold text-slate-800 mb-1">¿Quién viaja?</h2>
              <p className="text-slate-400 text-sm mb-4">Selecciona los miembros que irán a este viaje</p>

              {familyMembers.length === 0 ? (
                <div className="text-center py-6">
                  <Users size={32} className="mx-auto text-slate-200 mb-2" strokeWidth={1} />
                  <p className="text-slate-400 text-sm mb-3">Sin viajeros registrados</p>
                  <Link href="/family" className="btn-secondary text-sm inline-flex items-center gap-2">
                    <Plus size={13} /> Crear viajeros primero
                  </Link>
                </div>
              ) : (
                <div className="space-y-2">
                  {familyMembers.map(m => {
                    const selected = selectedIds.has(m.id)
                    const alerts = getMemberAlerts(m)
                    return (
                      <button key={m.id} onClick={() => toggleMember(m.id)}
                        className={`w-full flex items-center gap-3 p-3 rounded-2xl border transition-all text-left ${
                          selected ? 'border-blue-300 bg-blue-50' : 'border-slate-200 bg-white hover:border-slate-300'
                        }`}>
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                          selected ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400'
                        }`}>
                          {selected ? '✓' : m.name.split(' ').map(n => n[0]).slice(0,2).join('')}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`font-medium text-sm ${selected ? 'text-blue-800' : 'text-slate-600'}`}>{m.name}</p>
                          {alerts.length > 0 && (
                            <p className="text-xs text-amber-600 flex items-center gap-1 mt-0.5">
                              <AlertTriangle size={10} strokeWidth={2} /> {alerts[0]}
                            </p>
                          )}
                          {alerts.length === 0 && selected && (
                            <p className="text-xs text-emerald-600 flex items-center gap-1 mt-0.5">
                              <CheckCircle2 size={10} strokeWidth={2} /> Documentación OK
                            </p>
                          )}
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Alerts summary */}
            {totalAlerts.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle size={14} className="text-amber-600" strokeWidth={2} />
                  <p className="text-sm font-semibold text-amber-700">Documentación pendiente</p>
                </div>
                <ul className="space-y-1">
                  {totalAlerts.map((a, i) => (
                    <li key={i} className="text-xs text-amber-600">• {a}</li>
                  ))}
                </ul>
                <Link href="/family" className="text-xs text-amber-700 underline mt-2 inline-block">
                  Actualizar documentación →
                </Link>
              </div>
            )}

            <div className="flex gap-3">
              <button onClick={() => setStep(1)} className="btn-secondary px-6">← Atrás</button>
              <button onClick={() => setStep(3)} className="btn-primary flex-1 py-3">
                Siguiente → Resumen
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Summary */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="card p-6">
              <h2 className="font-semibold text-slate-800 mb-4">Resumen del viaje</h2>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">Nombre</span>
                  <span className="font-medium text-slate-800">{form.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Destino</span>
                  <span className="font-medium text-slate-800">{form.destination}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Fechas</span>
                  <span className="font-medium text-slate-800">{form.start_date} → {form.end_date}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Moneda</span>
                  <span className="font-medium text-slate-800">{form.currency} · cambio {form.exchange_rate} {form.exchange_base}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Viajeros</span>
                  <span className="font-medium text-slate-800">
                    {familyMembers.filter(m => selectedIds.has(m.id)).map(m => m.name.split(' ')[0]).join(', ') || 'Ninguno'}
                  </span>
                </div>
              </div>
            </div>

            {totalAlerts.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-2">
                <AlertTriangle size={14} className="text-amber-600 flex-shrink-0 mt-0.5" strokeWidth={2} />
                <p className="text-xs text-amber-700">{totalAlerts.length} alerta{totalAlerts.length > 1 ? 's' : ''} de documentación — podrás resolverlas desde la pestaña Viajeros</p>
              </div>
            )}

            <div className="flex gap-3">
              <button onClick={() => setStep(2)} className="btn-secondary px-6">← Atrás</button>
              <button onClick={handleCreate} disabled={saving}
                className="btn-primary flex-1 py-3">
                {saving ? 'Creando...' : '✈️ Crear viaje'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
