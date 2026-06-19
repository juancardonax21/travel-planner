'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Trip } from '@/types'
import TripNav from '@/components/layout/TripNav'
import { daysUntil, formatDate } from '@/lib/utils'
import {
  Plane, BedDouble, Shield, FileText, Car, FolderOpen,
  AlertTriangle, CheckCircle2, Clock, ExternalLink,
  Plus, X, Trash2, Ticket, UtensilsCrossed, Tag, ChevronDown, ChevronUp
} from 'lucide-react'

type Status = 'ok' | 'warn' | 'expired' | 'missing'

function getStatus(expiry?: string | null): Status {
  if (expiry === 'indefinido') return 'ok'
  if (!expiry) return 'missing'
  const d = daysUntil(expiry)
  if (d === null) return 'missing'
  if (d < 0) return 'expired'
  if (d <= 90) return 'warn'
  return 'ok'
}

function StatusIcon({ status }: { status: Status }) {
  if (status === 'ok')      return <CheckCircle2 size={14} strokeWidth={2} className="text-emerald-500 flex-shrink-0" />
  if (status === 'warn')    return <Clock size={14} strokeWidth={2} className="text-amber-500 flex-shrink-0" />
  if (status === 'expired') return <AlertTriangle size={14} strokeWidth={2} className="text-red-500 flex-shrink-0" />
  return <div className="w-3.5 h-3.5 rounded-full border-2 border-slate-300 flex-shrink-0" />
}

const TRIP_CATS: Record<string, { label: string; Icon: any; color: string; bg: string }> = {
  vuelos:     { label: 'Vuelos',             Icon: Plane,           color: '#1D4ED8', bg: '#DBEAFE' },
  hoteles:    { label: 'Alojamiento',        Icon: BedDouble,       color: '#065F46', bg: '#D1FAE5' },
  seguros:    { label: 'Seguros',            Icon: Shield,          color: '#5B21B6', bg: '#EDE9FE' },
  transporte: { label: 'Transporte',         Icon: Car,             color: '#991B1B', bg: '#FEE2E2' },
  actividades:{ label: 'Actividades',        Icon: Ticket,          color: '#92400E', bg: '#FEF3C7' },
  otros:      { label: 'Otros',              Icon: Tag,             color: '#374151', bg: '#F3F4F6' },
}

type DocItem = {
  id: string
  name: string
  category: string
  url?: string
  expiry?: string
  source: 'trip' | 'member'
  member_name?: string
}

export default function DocumentsPage({ params }: { params: { id: string } }) {
  const { id } = params
  const [trip, setTrip] = useState<Trip | null>(null)
  const [items, setItems] = useState<DocItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})
  const [form, setForm] = useState({ name: '', category: 'vuelos', url: '', expiry: '' })

  useEffect(() => { load() }, [id])

  async function load() {
    const [{ data: t }, { data: md }, { data: d }] = await Promise.all([
      supabase.from('trips').select('*').eq('id', id).single(),
      supabase.from('member_documents')
        .select('*, family_member:family_members(name)')
        .eq('trip_id', id)
        .eq('type', 'ticket'),
      supabase.from('documents').select('*').eq('trip_id', id).order('category'),
    ])
    setTrip(t)

    const allItems: DocItem[] = []

    // Traveler tickets → vuelos
    ;(md || []).forEach((doc: any) => {
      if (doc.file_url) {
        const name = doc.family_member?.name?.split(' ')[0] || 'Viajero'
        allItems.push({
          id: doc.id,
          name: `${doc.label || 'Billete'} — ${name}`,
          category: 'vuelos',
          url: doc.file_url,
          source: 'member',
          member_name: name,
        })
      }
    })

    // Trip documents
    ;(d || []).forEach((doc: any) => {
      allItems.push({
        id: doc.id,
        name: doc.name,
        category: doc.category || 'otros',
        url: doc.url,
        expiry: doc.expiry,
        source: 'trip',
      })
    })

    setItems(allItems)
    setLoading(false)
  }

  async function saveDoc() {
    if (!form.name.trim()) return
    const { data: newDoc } = await supabase.from('documents').insert({
      trip_id: id,
      name: form.name,
      category: form.category,
      url: form.url || null,
      expiry: form.expiry || null,
    }).select().single()
    if (newDoc) {
      setItems(prev => [...prev, {
        id: newDoc.id, name: newDoc.name, category: newDoc.category,
        url: newDoc.url, expiry: newDoc.expiry, source: 'trip'
      }])
    }
    setForm({ name: '', category: 'vuelos', url: '', expiry: '' })
    setShowForm(false)
  }

  async function deleteDoc(item: DocItem) {
    if (item.source === 'trip') {
      await supabase.from('documents').delete().eq('id', item.id)
    } else {
      await supabase.from('member_documents').delete().eq('id', item.id)
    }
    setItems(prev => prev.filter(d => d.id !== item.id))
  }

  if (loading || !trip) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-slate-400 animate-pulse">Cargando...</div>
    </div>
  )

  const totalDocs = items.length
  const alerts = items.filter(d => d.expiry && (getStatus(d.expiry) === 'warn' || getStatus(d.expiry) === 'expired')).length

  return (
    <div className="min-h-screen bg-slate-50">
      <TripNav trip={trip} active="documents" />
      <div className="max-w-4xl mx-auto px-4 pb-12">

        {alerts > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 mb-6 flex items-center gap-2 mt-4">
            <AlertTriangle size={16} className="text-amber-500 flex-shrink-0" strokeWidth={2} />
            <p className="text-sm text-amber-700">
              <strong>{alerts} documento{alerts > 1 ? 's' : ''}</strong> próximos a caducar o caducados
            </p>
          </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between mb-4 mt-4">
          <div className="flex items-center gap-2">
            <FolderOpen size={18} className="text-slate-400" strokeWidth={1.8} />
            <h2 className="font-semibold text-slate-800">Documentos del viaje</h2>
            {totalDocs > 0 && (
              <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{totalDocs}</span>
            )}
          </div>
          <button onClick={() => setShowForm(v => !v)}
            className={`flex items-center gap-1.5 text-sm px-4 py-2 rounded-xl border font-medium transition-colors ${
              showForm ? 'bg-blue-600 text-white border-blue-600' : 'btn-primary'
            }`}>
            <Plus size={14} strokeWidth={2.5} /> Añadir
          </button>
        </div>

        {/* Add form */}
        {showForm && (
          <div className="card p-4 mb-4 space-y-3 border-blue-200 bg-blue-50/30">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="label">Nombre del documento *</label>
                <input className="input" placeholder="ej: Confirmación vuelo TAP"
                  value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} />
              </div>
              <div>
                <label className="label">Categoría</label>
                <select className="input" value={form.category}
                  onChange={e => setForm(f => ({...f, category: e.target.value}))}>
                  {Object.entries(TRIP_CATS).map(([k, v]) => (
                    <option key={k} value={k}>{v.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Caducidad <span className="text-slate-300 font-normal">(opcional)</span></label>
                <input className="input" type="date" value={form.expiry}
                  onChange={e => setForm(f => ({...f, expiry: e.target.value}))} />
              </div>
              <div className="col-span-2">
                <label className="label flex items-center gap-1"><ExternalLink size={11} strokeWidth={1.8} /> URL / Enlace</label>
                <input className="input font-mono text-xs" placeholder="https://drive.google.com/..."
                  value={form.url} onChange={e => setForm(f => ({...f, url: e.target.value}))} />
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={saveDoc} className="btn-primary flex-1 py-2 text-sm">Guardar</button>
              <button onClick={() => setShowForm(false)} className="btn-secondary px-4 text-sm">Cancelar</button>
            </div>
          </div>
        )}

        {/* Categories */}
        {totalDocs === 0 && !showForm ? (
          <div className="card p-10 text-center">
            <FolderOpen size={36} className="mx-auto text-slate-200 mb-3" strokeWidth={1} />
            <p className="text-slate-400 text-sm font-medium">Sin documentos todavía</p>
            <p className="text-slate-300 text-xs mt-1">Añade billetes, reservas, seguros o cualquier enlace relevante</p>
          </div>
        ) : (
          <div className="space-y-4">
            {Object.entries(TRIP_CATS).map(([cat, cfg]) => {
              const catItems = items.filter(d => d.category === cat)
              if (!catItems.length) return null
              return (
                <div key={cat} className="card overflow-hidden">
                  {/* Category header — collapsible */}
                  <button
                    onClick={() => setCollapsed(c => ({ ...c, [cat]: !c[cat] }))}
                    className="w-full flex items-center gap-2.5 px-4 py-3 border-b border-slate-100 hover:brightness-95 transition-all"
                    style={{ background: cfg.bg + '60' }}>
                    <div className="w-6 h-6 rounded-lg flex items-center justify-center"
                      style={{ background: cfg.bg }}>
                      <cfg.Icon size={13} strokeWidth={1.8} style={{ color: cfg.color }} />
                    </div>
                    <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: cfg.color }}>
                      {cfg.label}
                    </span>
                    <span className="text-xs bg-white/60 px-1.5 py-0.5 rounded-full ml-1" style={{ color: cfg.color }}>
                      {catItems.length}
                    </span>
                    <span className="ml-auto text-slate-400">
                      {collapsed[cat]
                        ? <ChevronDown size={14} strokeWidth={2} />
                        : <ChevronUp size={14} strokeWidth={2} />
                      }
                    </span>
                  </button>
                  {/* Items */}
                  {!collapsed[cat] && <div className="divide-y divide-slate-50">
                    {catItems.map(item => {
                      const status = item.expiry ? getStatus(item.expiry) : 'missing'
                      return (
                        <div key={item.id} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors">
                          {item.expiry
                            ? <StatusIcon status={status} />
                            : <div className="w-3.5 h-3.5 rounded-full border-2 border-slate-200 flex-shrink-0" />
                          }
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-slate-700 font-medium truncate">{item.name}</p>
                            {item.expiry && (
                              <p className={`text-xs mt-0.5 ${
                                status === 'expired' ? 'text-red-500' :
                                status === 'warn' ? 'text-amber-600' : 'text-slate-400'
                              }`}>
                                {status === 'expired' ? 'Caducado' :
                                 status === 'warn' ? `Caduca ${formatDate(item.expiry, 'd MMM yyyy')}` :
                                 `Hasta ${formatDate(item.expiry, 'd MMM yyyy')}`}
                              </p>
                            )}
                            {item.source === 'member' && (
                              <span className="text-xs text-slate-300">Billete individual</span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            {item.url && (
                              <a href={item.url} target="_blank" rel="noopener"
                                className="flex items-center gap-1 text-xs text-blue-600 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-lg hover:bg-blue-100 transition-colors">
                                <ExternalLink size={11} strokeWidth={2} /> Abrir
                              </a>
                            )}
                            {item.source === 'trip' && (
                              <button onClick={() => deleteDoc(item)}
                                className="text-slate-300 hover:text-red-500 p-1 rounded transition-colors">
                                <Trash2 size={13} strokeWidth={1.8} />
                              </button>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
