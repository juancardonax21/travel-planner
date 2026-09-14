'use client'
import { useEffect, useState } from 'react'
import { Camera, ImageIcon, X, Trash2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import type { Trip } from '@/types'
import { fetchExchangeRate } from '@/lib/weather'
import TripNav from '@/components/layout/TripNav'

const CURRENCIES = [
  {c:'USD',s:'$'},{c:'EUR',s:'€'},{c:'GBP',s:'£'},{c:'JPY',s:'¥'},
  {c:'CHF',s:'Fr'},{c:'CAD',s:'CA$'},{c:'AUD',s:'A$'},{c:'MXN',s:'$MX'},
  {c:'BRL',s:'R$'},{c:'THB',s:'฿'},{c:'KRW',s:'₩'},{c:'SGD',s:'S$'},
]

export default function TripSettingsPage({ params }: { params: { id: string } }) {
  const { id } = params
  const router = useRouter()
  const [trip, setTrip] = useState<Trip | null>(null)
  const [form, setForm] = useState<Partial<Trip>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [rateLoading, setRateLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    supabase.from('trips').select('*, travelers(*)').eq('id', id).single()
      .then(({ data }) => {
        if (data) { setTrip(data); setForm(data) }
        setLoading(false)
      })
  }, [id])

  function upd(k: string, v: any) { setForm(f => ({ ...f, [k]: v })) }

  async function uploadCover(file: File) {
    setUploading(true)
    const ext = file.name.split('.').pop()
    const path = `covers/${id}-${Date.now()}.${ext}`
    const { data, error } = await supabase.storage
      .from('trip-photos')
      .upload(path, file, { upsert: true })
    if (!error && data) {
      const { data: urlData } = supabase.storage
        .from('trip-photos')
        .getPublicUrl(path)
      upd('cover_image', urlData.publicUrl)
    }
    setUploading(false)
  }

  async function refreshRate() {
    setRateLoading(true)
    const rate = await fetchExchangeRate(
      (form as any).currency || 'USD',
      (form as any).exchange_base || 'EUR'
    )
    if (rate) upd('exchange_rate', Math.round(rate * 100000) / 100000)
    setRateLoading(false)
  }

  async function handleSave() {
    setSaving(true)
    await supabase.from('trips').update({
      name: (form as any).name,
      destination: (form as any).destination,
      start_date: (form as any).start_date,
      end_date: (form as any).end_date,
      currency: (form as any).currency,
      currency_sym: (form as any).currency_sym,
      exchange_base: (form as any).exchange_base,
      exchange_rate: (form as any).exchange_rate,
      cover_image: (form as any).cover_image || null,
    }).eq('id', id)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
    router.refresh()
  }

  async function handleDelete() {
    if (!confirm('¿Eliminar este viaje? Esta acción no se puede deshacer.')) return
    await supabase.from('trips').delete().eq('id', id)
    router.push('/trips')
  }

  if (loading || !trip) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-slate-400 animate-pulse">Cargando...</div>
    </div>
  )

  const f = form as any

  return (
    <div className="min-h-screen bg-slate-50">
      <TripNav trip={{ ...trip, ...form } as Trip} active="settings" />
      <div className="max-w-2xl mx-auto px-4 pb-12">

        {/* Cover photo */}
        <div className="card p-6 mb-4">
          <h2 className="font-semibold text-slate-800 mb-4 flex items-center gap-2"><ImageIcon size={16} strokeWidth={1.8} className="text-slate-400" /> Foto de portada</h2>
          <div className="space-y-3">
            {f.cover_image && (
              <div className="relative rounded-2xl overflow-hidden h-40 bg-slate-100">
                <img src={f.cover_image} alt="portada"
                  className="w-full h-full object-cover" />
                <button onClick={() => upd('cover_image', null)}
                  className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white rounded-full w-7 h-7 flex items-center justify-center text-sm transition-colors">
                  ✕
                </button>
              </div>
            )}
            <label className={`flex items-center justify-center gap-3 border-2 border-dashed rounded-2xl p-5 cursor-pointer transition-all text-sm ${
              uploading
                ? 'border-blue-300 bg-blue-50 text-blue-600'
                : 'border-slate-200 hover:border-blue-300 hover:bg-blue-50 text-slate-500'
            }`}>
              <Camera size={20} strokeWidth={1.5} className={uploading ? 'text-blue-400' : 'text-slate-400'} />
              <div>
                <div className="font-medium">{uploading ? 'Subiendo...' : f.cover_image ? 'Cambiar foto' : 'Subir foto de portada'}</div>
                <div className="text-xs text-slate-400 mt-0.5">JPG, PNG · Aparece como fondo en el banner del viaje</div>
              </div>
              <input type="file" accept="image/*" className="hidden"
                onChange={e => e.target.files?.[0] && uploadCover(e.target.files[0])}
                disabled={uploading} />
            </label>
          </div>
        </div>

        {/* Trip data */}
        <div className="card p-6 mb-4">
          <h2 className="font-semibold text-slate-800 mb-4">Datos del viaje</h2>
          <div className="space-y-4">
            <div>
              <label className="label">Nombre del viaje</label>
              <input className="input" value={f.name || ''} onChange={e => upd('name', e.target.value)} />
            </div>
            <div>
              <label className="label">Destino</label>
              <input className="input" value={f.destination || ''} onChange={e => upd('destination', e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Fecha salida</label>
                <input className="input" type="date" value={f.start_date || ''}
                  onChange={e => upd('start_date', e.target.value)} />
              </div>
              <div>
                <label className="label">Fecha vuelta</label>
                <input className="input" type="date" value={f.end_date || ''}
                  onChange={e => upd('end_date', e.target.value)} />
              </div>
            </div>
          </div>
        </div>

        {/* Currency */}
        <div className="card p-6 mb-4">
          <h2 className="font-semibold text-slate-800 mb-4">Moneda y tipo de cambio</h2>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Moneda del viaje</label>
                <select className="input" value={f.currency || 'USD'} onChange={e => {
                  const c = CURRENCIES.find(x => x.c === e.target.value)
                  upd('currency', e.target.value)
                  if (c) upd('currency_sym', c.s)
                }}>
                  {CURRENCIES.map(c => <option key={c.c} value={c.c}>{c.c} ({c.s})</option>)}
                </select>
              </div>
              <div>
                <label className="label">Moneda referencia</label>
                <select className="input" value={f.exchange_base || 'EUR'}
                  onChange={e => upd('exchange_base', e.target.value)}>
                  {CURRENCIES.map(c => <option key={c.c} value={c.c}>{c.c}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="label">Tipo de cambio (1 {f.currency} = X {f.exchange_base})</label>
              <div className="flex gap-2">
                <input className="input" type="number" step="0.001"
                  value={f.exchange_rate || 1}
                  onChange={e => upd('exchange_rate', parseFloat(e.target.value) || 1)} />
                <button onClick={refreshRate} disabled={rateLoading}
                  className="btn-secondary whitespace-nowrap text-sm px-3">
                  {rateLoading ? '...' : '↻ Live'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button onClick={handleSave} disabled={saving}
            className={`btn-primary flex-1 py-3 transition-all ${saved ? 'bg-emerald-500 hover:bg-emerald-500' : ''}`}>
            {saving ? 'Guardando...' : saved ? '✓ Guardado' : 'Guardar cambios'}
          </button>
          <button onClick={() => router.back()} className="btn-secondary px-6">Cancelar</button>
        </div>

        {/* Danger zone */}
        <div className="mt-8 card p-6 border-red-200 bg-red-50">
          <h3 className="font-semibold text-red-700 mb-2">Zona de peligro</h3>
          <p className="text-sm text-red-500 mb-4">Eliminar el viaje borra todos los datos permanentemente.</p>
          <button onClick={handleDelete}
            className="text-sm text-red-600 border border-red-300 bg-white hover:bg-red-50 px-4 py-2 rounded-xl transition-colors">
            <><Trash2 size={13} className="inline mr-1.5" />Eliminar viaje</>
          </button>
        </div>
      </div>
    </div>
  )
}
