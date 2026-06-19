'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Trip, FamilyMember } from '@/types'
import TripNav from '@/components/layout/TripNav'
import { formatDate } from '@/lib/utils'
import {
  Sparkles, CheckCircle2, AlertTriangle, Circle, RefreshCw,
  ShieldCheck, MapPin, Star, Calendar, ChevronDown, ChevronUp
} from 'lucide-react'

type CheckItem = {
  label: string
  status: 'ok' | 'warn' | 'missing'
  note?: string
}

type Section = {
  title: string
  items: CheckItem[]
}

type MustItem = {
  category: string
  title: string
  description: string
  tip?: string
}

function StatusIcon({ status }: { status: CheckItem['status'] }) {
  if (status === 'ok')      return <CheckCircle2 size={16} strokeWidth={2} className="text-emerald-500 flex-shrink-0" />
  if (status === 'warn')    return <AlertTriangle size={16} strokeWidth={2} className="text-amber-500 flex-shrink-0" />
  return <Circle size={16} strokeWidth={2} className="text-slate-300 flex-shrink-0" />
}

async function callHaiku(system: string, user: string): Promise<string> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.NEXT_PUBLIC_ANTHROPIC_API_KEY!,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1500,
      system,
      messages: [{ role: 'user', content: user }]
    })
  })
  const data = await res.json()
  return data.content?.find((b: any) => b.type === 'text')?.text?.trim() || ''
}

export default function PreparePage({ params }: { params: { id: string } }) {
  const { id } = params
  const [trip, setTrip] = useState<Trip | null>(null)
  const [travelers, setTravelers] = useState<FamilyMember[]>([])
  const [loading, setLoading] = useState(true)

  const [reqs, setReqs] = useState<Section[] | null>(null)
  const [musts, setMusts] = useState<MustItem[] | null>(null)
  const [loadingReqs, setLoadingReqs] = useState(false)
  const [loadingMusts, setLoadingMusts] = useState(false)
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({})

  useEffect(() => { load() }, [id])

  async function load() {
    const { data: t } = await supabase.from('trips').select('*').eq('id', id).single()
    setTrip(t)
    if (t?.entry_requirements) {
      setReqs(t.entry_requirements)
      const open: Record<string, boolean> = {}
      t.entry_requirements.forEach((s: Section) => { open[s.title] = true })
      setOpenSections(open)
    }
    if (t?.must_do) setMusts(t.must_do)
    const { data: tm } = await supabase
      .from('trip_members')
      .select('family_member:family_members(*)')
      .eq('trip_id', id)
    const members = (tm || []).map((m: any) => m.family_member).filter(Boolean)
    setTravelers(members)
    setLoading(false)
  }

  async function fetchRequirements() {
    if (!trip) return
    setLoadingReqs(true)
    try {
      const travelerInfo = travelers.map(t => {
        const permits = (t as any).entry_permits || []
        const vaccines = (t as any).vaccines || []
        return `- ${t.name}: pasaporte ${t.passport_expiry ? `caduca ${t.passport_expiry}` : 'sin datos'}, permisos: ${permits.map((p: any) => p.type).join(', ') || 'ninguno'}, vacunas: ${vaccines.map((v: any) => v.name).join(', ') || 'ninguna'}`
      }).join('\n')

      const system = [
        'Eres un experto en requisitos de viaje internacional. Analiza los requisitos de entrada para el destino indicado.',
        'Devuelve SOLO un array JSON con secciones. Sin markdown ni explicaciones.',
        '',
        'Formato:',
        '[{"title":"Documentos de viaje","items":[{"label":"Pasaporte vigente 6 meses","status":"ok|warn|missing","note":"explicación breve si es warn o missing"}]}]',
        '',
        'Secciones típicas: Documentos de viaje, Visados y permisos de entrada, Vacunas, Seguro de viaje.',
        'status=ok si los viajeros ya lo tienen cubierto, warn si caduca pronto o hay dudas, missing si falta.',
        'Sé conciso. Máximo 4-5 items por sección.',
      ].join('\n')

      const user = `Destino: ${trip.destination}\nFechas: ${formatDate(trip.start_date, 'd MMM yyyy')} - ${formatDate(trip.end_date, 'd MMM yyyy')}\n\nViajeros:\n${travelerInfo}\n\nAnaliza los requisitos de entrada y cruza con los datos de los viajeros.`

      const raw = await callHaiku(system, user)
      const clean = raw.replace(/```json|```/g, '').trim()
      const parsed = JSON.parse(clean)
      setReqs(parsed)
      const open: Record<string, boolean> = {}
      parsed.forEach((s: Section) => { open[s.title] = true })
      setOpenSections(prev => ({ ...open, ...prev }))
      await supabase.from('trips').update({ entry_requirements: parsed }).eq('id', id)
    } catch (e) {
      console.error(e)
    } finally {
      setLoadingReqs(false)
    }
  }

  async function fetchMusts() {
    if (!trip) return
    setLoadingMusts(true)
    try {
      const system = [
        'Eres un experto viajero y guía de viajes. Genera recomendaciones concretas y entusiastas para el destino.',
        'Devuelve SOLO un array JSON. Sin markdown ni explicaciones.',
        '',
        'Formato:',
        '[{"category":"Imprescindible ver","title":"Nombre del lugar o experiencia","description":"Por qué es especial y qué esperar","tip":"consejo práctico opcional"}]',
        '',
        'Categorías: Imprescindible ver, Gastronomía, Experiencia única, Evento especial (si coincide con las fechas), Hueco perfecto para.',
        'Genera 8-10 items variados. Sé específico y concreto, no genérico.',
      ].join('\n')

      const user = `Destino: ${trip.destination}\nFechas: ${formatDate(trip.start_date, 'd MMM yyyy')} - ${formatDate(trip.end_date, 'd MMM yyyy')}\nViajeros: familia con ${travelers.length} personas\n\nGenera recomendaciones específicas para este viaje.`

      const raw = await callHaiku(system, user)
      const clean = raw.replace(/```json|```/g, '').trim()
      const parsed = JSON.parse(clean)
      setMusts(parsed)
      await supabase.from('trips').update({ must_do: parsed }).eq('id', id)
    } catch (e) {
      console.error(e)
    } finally {
      setLoadingMusts(false)
    }
  }

  function toggleSection(title: string) {
    setOpenSections(prev => ({ ...prev, [title]: !prev[title] }))
  }

  if (loading || !trip) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-slate-400 animate-pulse">Cargando...</div>
    </div>
  )

  const mustsByCategory = musts ? musts.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = []
    acc[item.category].push(item)
    return acc
  }, {} as Record<string, MustItem[]>) : {}

  return (
    <div className="min-h-screen bg-slate-50">
      <TripNav trip={trip} active="prepare" />
      <div className="max-w-4xl mx-auto px-4 pb-12 space-y-6">

        {/* Requirements */}
        <div>
          <div className="flex items-center justify-between mb-3 mt-4">
            <div className="flex items-center gap-2">
              <ShieldCheck size={18} className="text-slate-400" strokeWidth={1.8} />
              <h2 className="font-semibold text-slate-800">Requisitos de entrada</h2>
            </div>
            <button onClick={fetchRequirements} disabled={loadingReqs}
              className="flex items-center gap-1.5 text-sm px-4 py-2 rounded-xl bg-violet-600 text-white hover:bg-violet-700 transition-colors disabled:opacity-50">
              {loadingReqs
                ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Analizando...</>
                : <><Sparkles size={14} strokeWidth={2} /> {reqs ? 'Actualizar' : 'Analizar'}</>
              }
            </button>
          </div>

          {!reqs && !loadingReqs && (
            <div className="card p-8 text-center">
              <ShieldCheck size={36} className="mx-auto text-slate-200 mb-3" strokeWidth={1} />
              <p className="text-slate-400 text-sm font-medium">Comprueba si cumples los requisitos</p>
              <p className="text-slate-300 text-xs mt-1">La IA revisará visados, vacunas y documentos para {trip.destination}</p>
            </div>
          )}

          {reqs && (
            <div className="space-y-3">
              {reqs.map(section => (
                <div key={section.title} className="card overflow-hidden">
                  <button onClick={() => toggleSection(section.title)}
                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-slate-700">{section.title}</span>
                      <span className="text-xs text-slate-400">
                        {section.items.filter(i => i.status === 'ok').length}/{section.items.length} ✓
                      </span>
                    </div>
                    {openSections[section.title]
                      ? <ChevronUp size={14} className="text-slate-400" />
                      : <ChevronDown size={14} className="text-slate-400" />
                    }
                  </button>
                  {openSections[section.title] && (
                    <div className="border-t border-slate-100 divide-y divide-slate-50">
                      {section.items.map((item, i) => (
                        <div key={i} className="flex items-start gap-3 px-4 py-3">
                          <StatusIcon status={item.status} />
                          <div className="flex-1">
                            <p className={`text-sm font-medium ${
                              item.status === 'missing' ? 'text-slate-400' :
                              item.status === 'warn' ? 'text-amber-700' : 'text-slate-700'
                            }`}>{item.label}</p>
                            {item.note && (
                              <p className="text-xs text-slate-400 mt-0.5">{item.note}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Must do/see */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Star size={18} className="text-slate-400" strokeWidth={1.8} />
              <h2 className="font-semibold text-slate-800">Imprescindibles</h2>
            </div>
            <button onClick={fetchMusts} disabled={loadingMusts}
              className="flex items-center gap-1.5 text-sm px-4 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-50">
              {loadingMusts
                ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Generando...</>
                : <><Sparkles size={14} strokeWidth={2} /> {musts ? 'Actualizar' : 'Descubrir'}</>
              }
            </button>
          </div>

          {!musts && !loadingMusts && (
            <div className="card p-8 text-center">
              <Star size={36} className="mx-auto text-slate-200 mb-3" strokeWidth={1} />
              <p className="text-slate-400 text-sm font-medium">Descubre qué no te puedes perder</p>
              <p className="text-slate-300 text-xs mt-1">Recomendaciones personalizadas para {trip.destination} en esas fechas</p>
            </div>
          )}

          {musts && (
            <div className="space-y-4">
              {Object.entries(mustsByCategory).map(([category, items]) => (
                <div key={category}>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                    <MapPin size={11} strokeWidth={2} /> {category}
                  </p>
                  <div className="space-y-2">
                    {items.map((item, i) => (
                      <div key={i} className="card p-4">
                        <p className="text-sm font-semibold text-slate-800 mb-1">{item.title}</p>
                        <p className="text-sm text-slate-500 leading-relaxed">{item.description}</p>
                        {item.tip && (
                          <p className="text-xs text-blue-600 mt-2 bg-blue-50 px-2 py-1 rounded-lg">
                            💡 {item.tip}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
