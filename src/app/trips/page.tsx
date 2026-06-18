'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import type { Trip } from '@/types'
import { formatDate, daysUntil } from '@/lib/utils'
import Link from 'next/link'
import { Users } from 'lucide-react'

const GRADIENTS = [
  'from-blue-600 to-violet-600',
  'from-emerald-500 to-teal-600',
  'from-orange-500 to-rose-600',
  'from-violet-600 to-purple-700',
  'from-cyan-500 to-blue-600',
  'from-pink-500 to-rose-600',
]

const DESTINATIONS_EMOJI: Record<string, string> = {
  miami: '🌴', usa: '🗽', japan: '🗼', france: '🗼', paris: '🗼',
  spain: '🏖️', italy: '🏛️', uk: '🎡', london: '🎡', mexico: '🌮',
  thailand: '🏯', dubai: '🌆', default: '✈️'
}

function destinationEmoji(dest: string) {
  const lower = dest.toLowerCase()
  for (const [key, emoji] of Object.entries(DESTINATIONS_EMOJI)) {
    if (lower.includes(key)) return emoji
  }
  return DESTINATIONS_EMOJI.default
}

function TripCard({ trip, index }: { trip: Trip; index: number }) {
  const dL = daysUntil(trip.start_date)
  const isPast = (dL ?? 0) < -1
  const isActive = (dL ?? 1) <= 0 && (dL ?? 0) > -1
  const gradient = GRADIENTS[index % GRADIENTS.length]
  const emoji = destinationEmoji(trip.destination)

  return (
    <Link href={`/trips/${trip.id}/itinerary`} className="block group">
      <div className={`relative overflow-hidden rounded-3xl transition-all duration-300 group-hover:scale-[1.02] group-hover:shadow-2xl shadow-lg ${isPast ? 'opacity-70' : ''}`}>
        {/* Background gradient */}
        <div className={`bg-gradient-to-br ${gradient} p-6 pb-4 min-h-[180px] flex flex-col justify-between`}>
          {/* Top row */}
          <div className="flex items-start justify-between">
            <div>
              <p className="text-white/60 text-xs uppercase tracking-widest font-mono mb-1">
                {trip.destination}
              </p>
              <h3 className="text-white font-bold text-xl leading-tight">{trip.name}</h3>
            </div>
            <div className="text-5xl opacity-80">{emoji}</div>
          </div>

          {/* Dates */}
          <div className="mt-4">
            <p className="text-white/80 text-sm font-medium">
              {formatDate(trip.start_date, 'd MMM')} — {formatDate(trip.end_date, 'd MMM yyyy')}
            </p>

            {/* Status bar */}
            <div className="flex items-center justify-between mt-3">
              <div className="flex items-center gap-2">
                <span className={`text-xs font-medium px-3 py-1 rounded-full backdrop-blur-sm ${
                  isPast ? 'bg-white/20 text-white/70' :
                  isActive ? 'bg-yellow-400 text-yellow-900' :
                  (dL ?? 0) <= 30 ? 'bg-white/30 text-white' :
                  'bg-white/20 text-white/80'
                }`}>
                  {isPast ? '✓ Completado' :
                   isActive ? '✈️ ¡En marcha!' :
                   `En ${dL} días`}
                </span>
                {trip.travelers && trip.travelers.length > 0 && (
                  <span className="text-white/60 text-xs flex items-center gap-1">
                    <Users size={11} strokeWidth={1.8} /> {trip.travelers.length}
                  </span>
                )}
              </div>
              {!isPast && dL !== null && dL > 0 && (
                <div className="text-right">
                  <span className="text-4xl font-black text-white/90 leading-none font-mono">{dL}</span>
                  <span className="text-white/60 text-xs ml-1">días</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Link>
  )
}

export default function TripsPage() {
  const [trips, setTrips] = useState<Trip[]>([])
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) { router.push('/login'); return }
      setUser(data.user)
      supabase.from('trips')
        .select('*, travelers(*)')
        .eq('user_id', data.user.id)
        .order('start_date')
        .then(({ data: t }) => { setTrips(t || []); setLoading(false) })
    })
  }, [])

  if (loading) return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-700 to-violet-700 flex items-center justify-center">
      <div className="text-center text-white">
        <div className="text-6xl mb-4 animate-bounce">✈️</div>
        <p className="text-blue-200 text-lg">Cargando viajes...</p>
      </div>
    </div>
  )

  const upcoming = trips.filter(t => (daysUntil(t.start_date) ?? 0) >= 0)
  const past = trips.filter(t => (daysUntil(t.start_date) ?? 0) < 0)

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Hero header */}
      <div className="bg-gradient-to-br from-blue-900 via-blue-700 to-violet-700 text-white">
        <div className="max-w-5xl mx-auto px-4 py-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-2xl flex items-center justify-center text-xl">✈️</div>
              <div>
                <h1 className="text-xl font-bold">Travel Planner</h1>
                <p className="text-blue-300 text-xs">{user?.email}</p>
              </div>
            </div>
            <button onClick={() => supabase.auth.signOut().then(() => router.push('/login'))}
              className="text-blue-300 hover:text-white text-sm transition-colors">
              Salir
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 mb-2">
            {[
              { n: trips.length, l: 'Total viajes', emoji: '🗺️' },
              { n: upcoming.length, l: 'Próximos', emoji: '📅' },
              { n: past.length, l: 'Completados', emoji: '✓' },
            ].map(s => (
              <div key={s.l} className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 text-center">
                <div className="text-2xl mb-1">{s.emoji}</div>
                <div className="text-2xl font-bold">{s.n}</div>
                <div className="text-blue-300 text-xs">{s.l}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6">
        {/* Actions */}
        <div className="flex gap-3 mb-6">
          <Link href="/trips/new"
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-2xl text-center transition-colors shadow-md shadow-blue-200 flex items-center justify-center gap-2">
            ＋ Nuevo viaje
          </Link>
        </div>

        {trips.length === 0 ? (
          <div className="card p-16 text-center">
            <div className="text-7xl mb-4">🌍</div>
            <h3 className="text-xl font-semibold text-slate-700 mb-2">Sin viajes todavía</h3>
            <p className="text-slate-400 mb-6">Crea tu primer viaje para empezar a planificar</p>
            <Link href="/trips/new" className="btn-primary inline-flex px-8 py-3">
              Crear primer viaje ✈️
            </Link>
          </div>
        ) : (
          <>
            {upcoming.length > 0 && (
              <div className="mb-8">
                <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-4">
                  Próximos viajes
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {upcoming.map((t, i) => <TripCard key={t.id} trip={t} index={i} />)}
                </div>
              </div>
            )}
            {past.length > 0 && (
              <div>
                <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-4">
                  Viajes completados
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {past.map((t, i) => <TripCard key={t.id} trip={t} index={i + upcoming.length} />)}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
