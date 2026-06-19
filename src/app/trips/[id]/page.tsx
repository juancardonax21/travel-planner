'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { formatDate, daysUntil } from '@/lib/utils'
import type { Trip } from '@/types'
import {
  CalendarDays, CreditCard, FolderOpen, Users, Sparkles,
  Plane, ArrowLeft, Printer, Settings2, ChevronRight
} from 'lucide-react'

const kenburnsStyle = `
  @keyframes kenburns {
    from { transform: scale(1.06); }
    to   { transform: scale(1.0); }
  }
`

export default function TripHomePage({ params }: { params: { id: string } }) {
  const { id } = params
  const router = useRouter()
  const [trip, setTrip] = useState<Trip | null>(null)
  const [stats, setStats] = useState({ events: 0, budget: 0, travelers: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [{ data: t }, { data: ev }, { data: tm }] = await Promise.all([
        supabase.from('trips').select('*').eq('id', id).single(),
        supabase.from('events').select('id, cost').eq('trip_id', id),
        supabase.from('trip_members').select('id').eq('trip_id', id),
      ])
      setTrip(t)
      const totalBudget = (ev || []).reduce((s: number, e: any) => s + parseFloat(e.cost || 0), 0)
      setStats({ events: ev?.length || 0, budget: totalBudget, travelers: tm?.length || 0 })
      setLoading(false)
    }
    load()
  }, [id])

  if (loading || !trip) return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center">
      <div className="text-white/40 animate-pulse text-sm">Cargando...</div>
    </div>
  )

  const dL = daysUntil(trip.start_date)
  const isPast = dL !== null && dL < 0
  const isToday = dL === 0
  const coverImage = (trip as any).cover_image

  const NAV = [
    { key: 'itinerary',  label: 'Itinerario',  Icon: CalendarDays, desc: `${stats.events} eventos` },
    { key: 'budget',     label: 'Presupuesto', Icon: CreditCard,   desc: `${stats.budget.toLocaleString('es-ES', {maximumFractionDigits:0})} €` },
    { key: 'documents',  label: 'Documentos',  Icon: FolderOpen,   desc: 'Reservas y vouchers' },
    { key: 'travelers',  label: 'Viajeros',    Icon: Users,         desc: `${stats.travelers} viajeros` },
    { key: 'prepare',   label: 'Preparar',    Icon: Sparkles,     desc: 'Requisitos e inspiración' },
  ]

  return (
    <div className="min-h-screen flex flex-col">
      <style>{kenburnsStyle}</style>

      {/* Hero */}
      <div className="relative flex-shrink-0 h-[60vh] min-h-[400px] overflow-hidden">
        {/* Background */}
        {coverImage ? (
          <div className="absolute inset-0 bg-cover bg-center" style={{
            backgroundImage: `url(${coverImage})`,
            animation: 'kenburns 6s ease-out forwards',
          }} />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-blue-900 via-blue-700 to-violet-800" />
        )}
        {/* Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/10" />

        {/* Top bar */}
        <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-6 pt-8">
          <button onClick={() => router.push('/trips')}
            className="flex items-center gap-2 text-white/70 hover:text-white transition-colors text-sm">
            <ArrowLeft size={16} strokeWidth={2} /> Mis viajes
          </button>
          <div className="flex items-center gap-2">
            <Link href={`/trips/${id}/dossier`} target="_blank"
              className="flex items-center gap-1.5 text-white/60 hover:text-white transition-colors text-sm px-3 py-1.5 rounded-xl hover:bg-white/10">
              <Printer size={14} strokeWidth={1.8} /> Dossier
            </Link>
            <Link href={`/trips/${id}/settings`}
              className="flex items-center gap-1.5 text-white/60 hover:text-white transition-colors text-sm px-3 py-1.5 rounded-xl hover:bg-white/10">
              <Settings2 size={14} strokeWidth={1.8} />
            </Link>
          </div>
        </div>

        {/* Main hero content */}
        <div className="absolute bottom-0 left-0 right-0 px-6 pb-8">
          <p className="text-white/50 text-xs uppercase tracking-[3px] font-mono mb-2">{trip.destination}</p>
          <h1 className="text-4xl sm:text-5xl font-bold text-white leading-tight mb-4" style={{ textShadow: '0 2px 20px rgba(0,0,0,0.5)' }}>
            {trip.name}
          </h1>
          <div className="flex items-center gap-6 text-white/70 text-sm">
            <span className="flex items-center gap-1.5">
              <CalendarDays size={13} strokeWidth={1.8} />
              {formatDate(trip.start_date, 'd MMM')} — {formatDate(trip.end_date, 'd MMM yyyy')}
            </span>
            <span className="flex items-center gap-1.5">
              <Users size={13} strokeWidth={1.8} />
              {stats.travelers} viajeros
            </span>
          </div>
        </div>

        {/* Countdown */}
        <div className="absolute top-8 right-1/2 translate-x-1/2 sm:right-8 sm:translate-x-0 text-center">
          {!isPast && !isToday && dL !== null && (
            <div className="bg-black/30 backdrop-blur-sm rounded-2xl px-5 py-3 border border-white/10">
              <div className="text-4xl font-bold text-white font-mono">{dL}</div>
              <div className="text-white/50 text-xs uppercase tracking-widest">días</div>
            </div>
          )}
          {isToday && (
            <div className="bg-blue-600/80 backdrop-blur-sm rounded-2xl px-5 py-3 border border-blue-400/30">
              <Plane size={28} className="text-white mx-auto mb-1" strokeWidth={1.5} />
              <div className="text-white text-xs font-bold uppercase tracking-widest">¡Hoy!</div>
            </div>
          )}
          {isPast && (
            <div className="bg-black/30 backdrop-blur-sm rounded-2xl px-4 py-2 border border-white/10">
              <div className="text-white/60 text-xs uppercase tracking-widest">Completado</div>
            </div>
          )}
        </div>
      </div>

      {/* Navigation cards */}
      <div className="flex-1 bg-slate-50">
        <div className="max-w-2xl mx-auto px-4 py-6 space-y-2">
          {NAV.map(({ key, label, Icon, desc }) => (
            <Link key={key} href={`/trips/${id}/${key}`}
              className="flex items-center gap-4 bg-white rounded-2xl px-5 py-4 shadow-sm hover:shadow-md border border-slate-100 hover:border-blue-200 transition-all group">
              <div className="w-10 h-10 rounded-xl bg-slate-100 group-hover:bg-blue-50 flex items-center justify-center transition-colors flex-shrink-0">
                <Icon size={18} strokeWidth={1.8} className="text-slate-500 group-hover:text-blue-600 transition-colors" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-slate-800 text-sm">{label}</p>
                <p className="text-xs text-slate-400">{desc}</p>
              </div>
              <ChevronRight size={16} strokeWidth={2} className="text-slate-300 group-hover:text-blue-400 transition-colors flex-shrink-0" />
            </Link>
          ))}
        </div>
      </div>

    </div>
  )
}
