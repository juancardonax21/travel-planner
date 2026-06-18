'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Trip } from '@/types'
import TripNav from '@/components/layout/TripNav'
import { daysUntil, formatDate } from '@/lib/utils'
import {
  Plane, BedDouble, Shield, FileText, Car, FolderOpen,
  CreditCard, Heart, User, AlertTriangle, CheckCircle2,
  Clock, ExternalLink, ChevronDown, ChevronUp
} from 'lucide-react'

// ── Doc status helpers ────────────────────────────────────────────────────────
type Status = 'ok' | 'warn' | 'expired' | 'missing'

function getStatus(expiry?: string | null): Status {
  if (expiry === 'indefinido') return 'ok'
  if (!expiry) return 'missing'
  const d = daysUntil(expiry ?? undefined)
  if (d === null) return 'missing'
  if (d < 0) return 'expired'
  if (d <= 90) return 'warn'
  return 'ok'
}

function StatusIcon({ status }: { status: Status }) {
  if (status === 'ok')      return <CheckCircle2 size={14} strokeWidth={2} className="text-emerald-500" />
  if (status === 'warn')    return <Clock size={14} strokeWidth={2} className="text-amber-500" />
  if (status === 'expired') return <AlertTriangle size={14} strokeWidth={2} className="text-red-500" />
  return <div className="w-3.5 h-3.5 rounded-full border-2 border-slate-300" />
}

function statusLabel(status: Status, expiry?: string | null): string {
  if (status === 'missing') return 'Sin datos'
  const d = daysUntil(expiry ?? undefined)
  if (status === 'expired') return 'Caducado'
  if (status === 'warn') return `Caduca en ${d}d`
  return `Hasta ${formatDate(expiry!, 'd MMM yyyy')}`
}

// ── Traveler doc row ──────────────────────────────────────────────────────────
function TravelerDocRow({ label, number, expiry }: {
  label: string; number?: string; expiry?: string
}) {
  const status = getStatus(expiry)
  if (!number && !expiry) return null
  return (
    <div className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
      <div className="flex items-center gap-2 min-w-0">
        <StatusIcon status={status} />
        <span className="text-sm text-slate-600">{label}</span>
        {number && <span className="text-xs font-mono text-slate-400">{number}</span>}
      </div>
      <span className={`text-xs flex-shrink-0 ml-2 ${
        status === 'expired' ? 'text-red-500' :
        status === 'warn' ? 'text-amber-600' :
        status === 'ok' ? 'text-emerald-600' : 'text-slate-300'
      }`}>
        {statusLabel(status, expiry)}
      </span>
    </div>
  )
}

// ── Trip documents categories ─────────────────────────────────────────────────
const TRIP_CATS: Record<string, { label: string; Icon: any; color: string; bg: string }> = {
  vuelos:     { label: 'Vuelos',             Icon: Plane,      color: '#1D4ED8', bg: '#DBEAFE' },
  hoteles:    { label: 'Alojamiento',        Icon: BedDouble,  color: '#065F46', bg: '#D1FAE5' },
  seguros:    { label: 'Seguros',            Icon: Shield,     color: '#5B21B6', bg: '#EDE9FE' },
  permisos:   { label: 'Visados / Permisos', Icon: FileText,   color: '#92400E', bg: '#FEF3C7' },
  transporte: { label: 'Transporte',         Icon: Car,        color: '#991B1B', bg: '#FEE2E2' },
  otros:      { label: 'Otros',              Icon: FolderOpen, color: '#374151', bg: '#F3F4F6' },
}

export default function DocumentsPage({ params }: { params: { id: string } }) {
  const { id } = params
  const [trip, setTrip] = useState<Trip | null>(null)
  const [travelers, setTravelers] = useState<any[]>([])
  const [docs, setDocs] = useState<any[]>([])
  const [openTraveler, setOpenTraveler] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [{ data: t }, { data: tm }, { data: d }] = await Promise.all([
        supabase.from('trips').select('*').eq('id', id).single(),
        supabase.from('trip_members')
          .select('*, family_member:family_members(*)')
          .eq('trip_id', id),
        supabase.from('documents').select('*').eq('trip_id', id).order('category'),
      ])
      setTrip(t)
      // Flatten: each item is the family_member with trip_member data merged
      const members = (tm || []).map((item: any) => ({
        ...item.family_member,
        _trip_member_id: item.id,
        travel_ins_number: item.travel_ins_number,
        travel_ins_expiry: item.travel_ins_expiry,
        travel_ins_phone: item.travel_ins_phone,
        cancel_ins_number: item.cancel_ins_number,
      }))
      setTravelers(members)
      setDocs(d || [])
      if (members.length) setOpenTraveler(members[0].id)
      setLoading(false)
    }
    load()
  }, [id])

  if (loading || !trip) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-slate-400 animate-pulse">Cargando...</div>
    </div>
  )

  // Overall alert count
  const allStatuses = travelers.flatMap(tv => [
    getStatus(tv.passport_expiry), getStatus(tv.esta_expiry),
    getStatus(tv.tse_expiry), getStatus(tv.health_ins_expiry),
    getStatus(tv.drive_license_expiry),
  ])
  const alertCount = allStatuses.filter(s => s === 'warn' || s === 'expired').length

  return (
    <div className="min-h-screen bg-slate-50">
      <TripNav trip={trip} active="documents" />
      <div className="max-w-4xl mx-auto px-4 pb-12">

        {/* Alert banner */}
        {alertCount > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 mb-6 flex items-center gap-3">
            <AlertTriangle size={16} className="text-amber-500 flex-shrink-0" strokeWidth={2} />
            <p className="text-sm text-amber-700">
              <strong>{alertCount} documento{alertCount > 1 ? 's' : ''}</strong> próximos a caducar o caducados — revisa las fichas de los viajeros
            </p>
          </div>
        )}

        {/* ── SECTION 1: Traveler documents ── */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center">
              <User size={14} strokeWidth={1.8} className="text-blue-600" />
            </div>
            <h3 className="font-semibold text-slate-700">Documentos personales</h3>
          </div>

          <div className="space-y-2">
            {travelers.map(tv => {
              const isOpen = openTraveler === tv.id
              const initials = tv.name.split(' ').map((n: string) => n[0]).slice(0,2).join('').toUpperCase()
              const tvStatuses = [
                getStatus(tv.passport_expiry), getStatus(tv.esta_expiry),
                getStatus(tv.tse_expiry), getStatus(tv.health_ins_expiry),
              ]
              const tvAlert = tvStatuses.some(s => s === 'warn' || s === 'expired')
              const tvMissing = tvStatuses.filter(s => s === 'missing').length

              return (
                <div key={tv.id} className="card overflow-hidden">
                  <button className="w-full flex items-center gap-3 p-3 hover:bg-slate-50 transition-colors text-left"
                    onClick={() => setOpenTraveler(isOpen ? null : tv.id)}>
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
                      {initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-800 text-sm">{tv.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {tvAlert && <span className="text-xs text-amber-600 flex items-center gap-1"><AlertTriangle size={10} /> Revisar</span>}
                        {!tvAlert && tvMissing === 0 && <span className="text-xs text-emerald-600 flex items-center gap-1"><CheckCircle2 size={10} /> Todo OK</span>}
                        {!tvAlert && tvMissing > 0 && <span className="text-xs text-slate-400">{tvMissing} sin rellenar</span>}
                      </div>
                    </div>
                    {isOpen ? <ChevronUp size={15} className="text-slate-300 flex-shrink-0" /> : <ChevronDown size={15} className="text-slate-300 flex-shrink-0" />}
                  </button>

                  {isOpen && (
                    <div className="border-t border-slate-100 divide-y divide-slate-50">
                      {/* Identity */}
                      <div className="px-4 py-3">
                        <div className="flex items-center gap-1.5 mb-2">
                          <CreditCard size={11} strokeWidth={2} className="text-blue-400" />
                          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Viaje</span>
                        </div>
                        <TravelerDocRow label="Pasaporte" number={tv.passport_number} expiry={tv.passport_expiry} />
                        <TravelerDocRow label="ESTA" number={tv.esta_number} expiry={tv.esta_expiry} />
                      </div>
                      {/* Health */}
                      <div className="px-4 py-3">
                        <div className="flex items-center gap-1.5 mb-2">
                          <Heart size={11} strokeWidth={2} className="text-rose-400" />
                          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Sanidad</span>
                        </div>
                        <TravelerDocRow label="TSE" number={tv.tse_number} expiry={tv.tse_expiry} />
                        <TravelerDocRow label="Seguro médico viaje" number={tv.health_ins_number} expiry={tv.health_ins_expiry} />
                        {tv.health_ins_phone && (
                          <div className="flex items-center gap-2 py-1 text-xs text-slate-500">
                            <span className="text-slate-400">Emergencias:</span>
                            <a href={`tel:${tv.health_ins_phone}`} className="text-blue-600 hover:underline font-mono">
                              {tv.health_ins_phone}
                            </a>
                          </div>
                        )}
                      </div>
                      {/* Driving */}
                      {(tv.drive_license || tv.drive_license_expiry) && (
                        <div className="px-4 py-3">
                          <div className="flex items-center gap-1.5 mb-2">
                            <Car size={11} strokeWidth={2} className="text-slate-400" />
                            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Conducción</span>
                          </div>
                          <TravelerDocRow label="Carnet conducir" number={tv.drive_license} expiry={tv.drive_license_expiry} />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* ── SECTION 2: Trip documents ── */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center">
                <FolderOpen size={14} strokeWidth={1.8} className="text-slate-500" />
              </div>
              <h3 className="font-semibold text-slate-700">Documentos del viaje</h3>
            </div>
            <button className="btn-secondary text-xs flex items-center gap-1.5 px-3 py-1.5">
              + Añadir
            </button>
          </div>

          {docs.length === 0 ? (
            <div className="card p-8 text-center">
              <FolderOpen size={32} className="mx-auto text-slate-200 mb-2" strokeWidth={1} />
              <p className="text-slate-400 text-sm">Sin documentos del viaje</p>
              <p className="text-slate-300 text-xs mt-1">Seguros, billetes adicionales, permisos...</p>
            </div>
          ) : (
            Object.entries(TRIP_CATS).map(([cat, cfg]) => {
              const catDocs = docs.filter(d => d.category === cat)
              if (!catDocs.length) return null
              const { Icon } = cfg
              return (
                <div key={cat} className="mb-4">
                  <div className="flex items-center gap-2 mb-2 px-1">
                    <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: cfg.bg }}>
                      <Icon size={12} strokeWidth={1.8} style={{ color: cfg.color }} />
                    </div>
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{cfg.label}</span>
                  </div>
                  <div className="space-y-2">
                    {catDocs.map(doc => {
                      const status = getStatus(doc.expiry)
                      return (
                        <div key={doc.id} className="card p-3 flex items-center gap-3 border-l-4"
                          style={{ borderLeftColor: cfg.color }}>
                          <StatusIcon status={status} />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-slate-800 text-sm">{doc.name}</p>
                            {doc.expiry && (
                              <p className={`text-xs mt-0.5 ${
                                status === 'expired' ? 'text-red-500' :
                                status === 'warn' ? 'text-amber-600' : 'text-slate-400'
                              }`}>{statusLabel(status, doc.expiry)}</p>
                            )}
                          </div>
                          {doc.url && (
                            <a href={doc.url} target="_blank" rel="noopener"
                              className="flex items-center gap-1 text-xs text-blue-600 bg-blue-50 border border-blue-100 px-2.5 py-1.5 rounded-xl hover:bg-blue-100 transition-colors flex-shrink-0">
                              <ExternalLink size={11} strokeWidth={2} /> Abrir
                            </a>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
