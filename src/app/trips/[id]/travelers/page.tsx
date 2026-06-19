'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Trip, FamilyMember, TripMember } from '@/types'
import TripNav from '@/components/layout/TripNav'
import { daysUntil, formatDate } from '@/lib/utils'
import {
  Users, UserPlus, ChevronDown, ChevronUp, AlertTriangle, CheckCircle2,
  Heart, CreditCard, Car, Phone, ExternalLink, X,
  FileText, Loader2, Ticket,
} from 'lucide-react'
import Link from 'next/link'

type DocStatus = 'ok' | 'warn' | 'expired' | 'missing'

function docStatus(expiry?: string | null): DocStatus {
  if (expiry === 'indefinido') return 'ok'
  if (!expiry) return 'missing'
  const d = daysUntil(expiry)
  if (d === null) return 'missing'
  if (d < 0) return 'expired'
  if (d <= 90) return 'warn'
  return 'ok'
}

const STATUS_STYLE: Record<DocStatus, string> = {
  ok:      'bg-emerald-50 text-emerald-700 border-emerald-200',
  warn:    'bg-amber-50 text-amber-700 border-amber-200',
  expired: 'bg-red-50 text-red-700 border-red-200',
  missing: 'bg-slate-50 text-slate-300 border-slate-200',
}

function DocBadge({ label, status }: { label: string; status: DocStatus }) {
  return (
    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border ${STATUS_STYLE[status]}`}>
      {status === 'ok' && <CheckCircle2 size={9} strokeWidth={2.5} />}
      {(status === 'warn' || status === 'expired') && <AlertTriangle size={9} strokeWidth={2.5} />}
      {status === 'missing' && <div className="w-2 h-2 rounded-full border border-current" />}
      {label}
    </span>
  )
}


// ── Tickets per traveler per trip (URL-based) ────────────────────
function TravelerTickets({ memberId, tripId }: { memberId: string; tripId: string }) {
  const [docs, setDocs] = useState<any[]>([])
  const [adding, setAdding] = useState(false)
  const [newUrl, setNewUrl] = useState('')
  const [newLabel, setNewLabel] = useState('')

  useEffect(() => {
    supabase.from('member_documents')
      .select('*').eq('family_member_id', memberId).eq('trip_id', tripId).eq('type', 'ticket')
      .then(({ data }) => setDocs((data || []).filter((d: any) => d?.file_url)))
  }, [memberId, tripId])

  async function save() {
    if (!newUrl.trim()) return
    const { data: newDoc } = await supabase.from('member_documents').insert({
      family_member_id: memberId, trip_id: tripId, type: 'ticket',
      label: newLabel || 'Billete', file_url: newUrl.trim(), file_name: newLabel || 'Billete',
    }).select().single()
    if (newDoc) setDocs(prev => [...prev, newDoc])
    setNewUrl(''); setNewLabel(''); setAdding(false)
  }

  async function remove(doc: any) {
    await supabase.from('member_documents').delete().eq('id', doc.id)
    setDocs(prev => prev.filter((d: any) => d.id !== doc.id))
  }

  return (
    <div className="mt-3 pt-3 border-t border-slate-100 px-4 pb-3">
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2 flex items-center gap-1">
        <Ticket size={11} strokeWidth={2} /> Billetes
      </p>
      <div className="space-y-1.5">
        {docs.map((doc: any) => (
          <div key={doc.id} className="flex items-center gap-2">
            <a href={doc.file_url} target="_blank" rel="noopener"
              className="flex items-center gap-1.5 text-xs text-slate-600 hover:text-blue-600 flex-1 truncate transition-colors">
              <FileText size={11} strokeWidth={1.8} className="flex-shrink-0 text-slate-400" />
              <span className="truncate">{doc.label || 'Billete'}</span>
              <ExternalLink size={10} strokeWidth={1.8} className="ml-auto flex-shrink-0 text-slate-300" />
            </a>
            <button onClick={() => remove(doc)} className="text-slate-300 hover:text-red-500 transition-colors flex-shrink-0">
              <X size={13} strokeWidth={2} />
            </button>
          </div>
        ))}
        {adding ? (
          <div className="space-y-1.5 bg-slate-50 rounded-xl p-2">
            <input className="input text-xs py-1.5" placeholder="Nombre (ej: Billete Juan)"
              value={newLabel} onChange={e => setNewLabel(e.target.value)} />
            <input className="input text-xs py-1.5 font-mono" placeholder="URL de Google Drive..."
              value={newUrl} onChange={e => setNewUrl(e.target.value)} />
            <div className="flex gap-1.5">
              <button onClick={save}
                className="flex-1 bg-emerald-600 text-white text-xs py-1.5 rounded-lg hover:bg-emerald-700 transition-colors">
                Guardar
              </button>
              <button onClick={() => { setAdding(false); setNewUrl(''); setNewLabel('') }}
                className="px-3 text-slate-400 hover:text-slate-600 text-xs py-1.5 rounded-lg hover:bg-slate-200 transition-colors">
                Cancelar
              </button>
            </div>
          </div>
        ) : (
          <button onClick={() => setAdding(true)}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-emerald-600 bg-slate-50 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-200 px-3 py-1.5 rounded-xl transition-colors">
            <ExternalLink size={11} strokeWidth={2} /> Añadir enlace
          </button>
        )}
      </div>
    </div>
  )
}

export default function TravelersPage({ params }: { params: { id: string } }) {
  const { id } = params
  const [trip, setTrip] = useState<Trip | null>(null)
  const [tripMembers, setTripMembers] = useState<TripMember[]>([])
  const [allFamily, setAllFamily] = useState<FamilyMember[]>([])
  const [expanded, setExpanded] = useState<string | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [editTripDoc, setEditTripDoc] = useState<string | null>(null)
  const [tripDocForm, setTripDocForm] = useState<Partial<TripMember>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => { load() }, [id])

  async function load() {
    const { data: t } = await supabase.from('trips').select('*, travelers(*)').eq('id', id).single()
    setTrip(t)

    const { data: tm } = await supabase
      .from('trip_members')
      .select('*, family_member:family_members(*)')
      .eq('trip_id', id)
    setTripMembers(tm || [])

    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: fm } = await supabase.from('family_members')
        .select('*').eq('user_id', user.id).order('name')
      setAllFamily(fm || [])
    }
    if (tm?.length) setExpanded(tm[0].id)
    setLoading(false)
  }

  async function addMember(familyMemberId: string) {
    await supabase.from('trip_members').insert({ trip_id: id, family_member_id: familyMemberId })
    setShowAdd(false)
    load()
  }

  async function removeMember(tripMemberId: string) {
    if (!confirm('¿Quitar este viajero del viaje?')) return
    await supabase.from('trip_members').delete().eq('id', tripMemberId)
    setTripMembers(prev => prev.filter(tm => tm.id !== tripMemberId))
  }

  async function saveTripDoc(tripMemberId: string) {
    await supabase.from('trip_members').update(tripDocForm).eq('id', tripMemberId)
    setTripMembers(prev => prev.map(tm => tm.id === tripMemberId ? { ...tm, ...tripDocForm } : tm))
    setEditTripDoc(null)
  }

  const assignedIds = new Set(tripMembers.map(tm => tm.family_member_id))
  const unassigned = allFamily.filter(fm => !assignedIds.has(fm.id))

  if (loading || !trip) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-slate-400 animate-pulse">Cargando...</div>
    </div>
  )

  return (
    <div className="min-h-screen bg-slate-50">
      <TripNav trip={trip} active="travelers" />
      <div className="max-w-4xl mx-auto px-4 pb-12">

        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-slate-800">
            Viajeros <span className="text-slate-400 font-normal text-sm">({tripMembers.length})</span>
          </h2>
          <div className="flex gap-2">
            <Link href="/family"
              className="btn-secondary text-sm flex items-center gap-1.5">
              <Users size={13} /> Gestionar familia
            </Link>
            {unassigned.length > 0 && (
              <button onClick={() => setShowAdd(v => !v)}
                className="btn-primary text-sm flex items-center gap-1.5">
                <UserPlus size={13} /> Añadir al viaje
              </button>
            )}
          </div>
        </div>

        {/* Add member panel */}
        {showAdd && (
          <div className="card p-4 mb-4 border-blue-200 bg-blue-50/30">
            <div className="flex items-center justify-between mb-3">
              <p className="font-medium text-slate-700 text-sm">Añadir viajero a este viaje</p>
              <button onClick={() => setShowAdd(false)} className="text-slate-400"><X size={16} /></button>
            </div>
            <div className="space-y-2">
              {unassigned.map(fm => (
                <button key={fm.id} onClick={() => addMember(fm.id)}
                  className="w-full flex items-center gap-3 p-3 bg-white rounded-xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50 transition-all text-left">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-400 to-violet-400 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                    {fm.name.split(' ').map(n => n[0]).slice(0,2).join('')}
                  </div>
                  <span className="font-medium text-slate-700 text-sm">{fm.name}</span>
                  <span className="ml-auto text-blue-500 text-xs">+ Añadir</span>
                </button>
              ))}
            </div>
            {unassigned.length === 0 && (
              <p className="text-slate-400 text-sm text-center py-2">Todos los miembros ya están en este viaje</p>
            )}
          </div>
        )}

        {/* Trip members */}
        {tripMembers.length === 0 ? (
          <div className="card p-12 text-center">
            <Users size={40} className="mx-auto text-slate-200 mb-3" strokeWidth={1} />
            <p className="text-slate-400 mb-2">Sin viajeros en este viaje</p>
            <button onClick={() => setShowAdd(true)} className="btn-primary inline-flex items-center gap-2 mt-2 px-6">
              <UserPlus size={15} /> Añadir viajero
            </button>
          </div>
        ) : tripMembers.map(tm => {
          const m = tm.family_member as any
          if (!m) return null
          const isOpen = expanded === tm.id
          const initials = m.name.split(' ').map((n: string) => n[0]).slice(0,2).join('').toUpperCase()
          const isUSA = /miami|usa|estados unidos|florida|new york/i.test(trip.destination)
          const tripEnd = trip.end_date
          const minPP = new Date(tripEnd); minPP.setMonth(minPP.getMonth() + 6)
          const minPPStr = minPP.toISOString().slice(0,10)

          // Compute alerts for this trip
          const alerts: string[] = []
          if (!m.passport_number) alerts.push('Sin pasaporte')
          else if (m.passport_expiry && m.passport_expiry < minPPStr) alerts.push('Pasaporte caduca pronto')
          if (isUSA && !m.esta_number) alerts.push('Sin ESTA')
          else if (isUSA && m.esta_expiry && m.esta_expiry < tripEnd) alerts.push('ESTA caducada')

          const hasAlert = alerts.length > 0

          return (
            <div key={tm.id} className="card overflow-hidden mb-3">
              <div className="flex items-center gap-3 p-4">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center text-white font-bold flex-shrink-0">
                  {initials}
                </div>
                <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setExpanded(isOpen ? null : tm.id)}>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-slate-900">{m.name}</p>
                    {hasAlert && <AlertTriangle size={13} className="text-amber-500" strokeWidth={2} />}
                    {!hasAlert && m.passport_number && <CheckCircle2 size={13} className="text-emerald-500" strokeWidth={2} />}
                  </div>
                  <div className="flex gap-1.5 mt-1 flex-wrap">
                    <DocBadge label="Pasaporte" status={docStatus(m.passport_expiry)} />
                    {isUSA && <DocBadge label="ESTA" status={docStatus(m.esta_expiry)} />}
                    <DocBadge label="TSE" status={docStatus(m.tse_expiry)} />
                    <DocBadge label="Seg. salud" status={docStatus(m.health_ins_expiry)} />
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button onClick={() => removeMember(tm.id)}
                    className="p-2 text-slate-200 hover:text-red-400 hover:bg-red-50 rounded-xl transition-colors">
                    <X size={14} />
                  </button>
                  <button onClick={() => setExpanded(isOpen ? null : tm.id)}
                    className="p-2 text-slate-300">
                    {isOpen ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                  </button>
                </div>
              </div>

              {isOpen && (
                <div className="border-t border-slate-100 divide-y divide-slate-50">
                  {/* Alerts */}
                  {alerts.length > 0 && (
                    <div className="px-4 py-3 bg-amber-50 space-y-1">
                      {alerts.map(a => (
                        <div key={a} className="flex items-center gap-2 text-xs text-amber-700">
                          <AlertTriangle size={11} strokeWidth={2} /> {a}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Personal docs — read only, link to family page */}
                  <div className="px-4 py-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5">
                        <CreditCard size={11} className="text-blue-400" strokeWidth={2} />
                        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Documentos personales</span>
                      </div>
                      <Link href="/family" className="text-xs text-blue-500 hover:text-blue-700 flex items-center gap-1">
                        Editar <ExternalLink size={10} />
                      </Link>
                    </div>
                    <DocRow label="Pasaporte" value={m.passport_number} expiry={m.passport_expiry} />
                    {isUSA && <DocRow label="ESTA" value={m.esta_number} expiry={m.esta_expiry} />}
                    <DocRow label="TSE" value={m.tse_number} expiry={m.tse_expiry} />
                    <DocRow label="Seg. médico" value={m.health_ins_number} expiry={m.health_ins_expiry} />
                    {m.health_ins_phone && (
                      <div className="flex items-center justify-between py-1.5 text-xs">
                        <span className="text-slate-400">Emergencias seguro</span>
                        <a href={`tel:${m.health_ins_phone}`} className="text-blue-600 font-mono hover:underline">{m.health_ins_phone}</a>
                      </div>
                    )}
                  </div>

                  {/* Trip-specific docs */}
                  <div className="px-4 py-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5">
                        <Heart size={11} className="text-rose-400" strokeWidth={2} />
                        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Docs específicos del viaje</span>
                      </div>
                      <button onClick={() => { setEditTripDoc(tm.id); setTripDocForm(tm) }}
                        className="text-xs text-blue-500 hover:text-blue-700">Editar</button>
                    </div>
                    {editTripDoc === tm.id ? (
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="label">Seguro médico viaje nº</label>
                            <input className="input font-mono" value={(tripDocForm as any).travel_ins_number || ''}
                              onChange={e => setTripDocForm(f => ({...f, travel_ins_number: e.target.value}))} />
                          </div>
                          <div>
                            <label className="label">Caducidad</label>
                            <input className="input" type="date" value={(tripDocForm as any).travel_ins_expiry || ''}
                              onChange={e => setTripDocForm(f => ({...f, travel_ins_expiry: e.target.value}))} />
                          </div>
                          <div className="col-span-2">
                            <label className="label"><Phone size={10} className="inline mr-1" />Tel. emergencias viaje</label>
                            <input className="input" type="tel" value={(tripDocForm as any).travel_ins_phone || ''}
                              onChange={e => setTripDocForm(f => ({...f, travel_ins_phone: e.target.value}))} />
                          </div>
                          <div className="col-span-2">
                            <label className="label">Seguro cancelación nº</label>
                            <input className="input font-mono" value={(tripDocForm as any).cancel_ins_number || ''}
                              onChange={e => setTripDocForm(f => ({...f, cancel_ins_number: e.target.value}))} />
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => saveTripDoc(tm.id)} className="btn-primary flex-1 py-2 text-sm">Guardar</button>
                          <button onClick={() => setEditTripDoc(null)} className="btn-secondary px-4 text-sm">Cancelar</button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <DocRow label="Seg. médico viaje" value={(tm as any).travel_ins_number} expiry={(tm as any).travel_ins_expiry} />
                        {(tm as any).travel_ins_phone && (
                          <div className="flex items-center justify-between py-1.5 text-xs">
                            <span className="text-slate-400">Tel. emergencias</span>
                            <a href={`tel:${(tm as any).travel_ins_phone}`} className="text-blue-600 font-mono hover:underline">{(tm as any).travel_ins_phone}</a>
                          </div>
                        )}
                        <DocRow label="Seg. cancelación" value={(tm as any).cancel_ins_number} />
                        {!(tm as any).travel_ins_number && !(tm as any).cancel_ins_number && (
                          <p className="text-xs text-slate-300 py-1">Sin docs específicos del viaje</p>
                        )}
                      </div>
                    )}
                  </div>
                  <TravelerTickets memberId={(tm as any).family_member?.id || (tm as any).id} tripId={id} />
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function DocRow({ label, value, expiry }: { label: string; value?: string; expiry?: string }) {
  if (!value && !expiry) return null
  const s = expiry ? (() => {
    const d = daysUntil(expiry)
    if (!d) return 'missing'
    if (d < 0) return 'expired'
    if (d <= 90) return 'warn'
    return 'ok'
  })() : 'ok'
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-slate-50 last:border-0">
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-sm text-slate-600">{label}</span>
        {value && <span className="text-xs font-mono text-slate-400">{value}</span>}
      </div>
      {expiry && (
        <span className={`text-xs flex-shrink-0 ml-2 ${s === 'expired' ? 'text-red-500' : s === 'warn' ? 'text-amber-600' : 'text-emerald-600'}`}>
          {s === 'expired' ? '⚠️ Caducado' : `hasta ${formatDate(expiry, 'd MMM yyyy')}`}
        </span>
      )}
    </div>
  )
}
