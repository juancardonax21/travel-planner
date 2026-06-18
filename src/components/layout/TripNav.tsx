'use client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { Trip } from '@/types'
import { daysUntil, formatDate } from '@/lib/utils'
import { CalendarDays, CreditCard, FolderOpen, Users, Settings2 } from 'lucide-react'

const NAV_ITEMS = [
  { key: 'itinerary',  label: 'Itinerario',  Icon: CalendarDays },
  { key: 'budget',     label: 'Presupuesto', Icon: CreditCard },
  { key: 'documents',  label: 'Documentos',  Icon: FolderOpen },
  { key: 'travelers',  label: 'Viajeros',    Icon: Users },
]

export default function TripNav({ trip, active }: { trip: Trip; active: string }) {
  const router = useRouter()
  const dL = daysUntil(trip.start_date)

  return (
    <>
      <div className="relative text-white shadow-lg overflow-hidden">
        {(trip as any).cover_image ? (
          <>
            <div className="absolute inset-0 bg-cover bg-center"
              style={{ backgroundImage: `url(${(trip as any).cover_image})` }} />
            <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/40 to-black/70" />
          </>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-r from-blue-800 via-blue-600 to-violet-600" />
        )}
        <div className="relative z-10 max-w-4xl mx-auto px-4">
          <div className="flex items-start justify-between py-3 gap-2">
            <div className="min-w-0 flex-1">
              <button onClick={() => router.push('/trips')}
                className="text-white/60 hover:text-white text-sm mb-1 flex items-center gap-1 transition-colors">
                ← Mis viajes
              </button>
              <p className="text-white/60 text-xs uppercase tracking-widest font-mono truncate">
                {trip.destination}
              </p>
              <h1 className="text-lg sm:text-xl font-bold truncate">{trip.name}</h1>
              <p className="text-white/70 text-xs mt-0.5">
                {formatDate(trip.start_date, 'd MMM')} — {formatDate(trip.end_date, 'd MMM yyyy')}
              </p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <div className="text-right">
                <div className="text-2xl sm:text-3xl font-bold font-mono leading-none">
                  {dL === null ? '?' : dL > 0 ? dL : dL === 0 ? '✈' : '✓'}
                </div>
                <div className="text-white/60 text-xs uppercase tracking-wide">
                  {dL === null ? '' : dL > 0 ? 'días' : dL === 0 ? 'hoy' : 'hecho'}
                </div>
              </div>
              <Link href={`/trips/${trip.id}/settings`}
                className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${
                  active === 'settings' ? 'bg-white text-blue-700' : 'bg-white/20 hover:bg-white/30'
                }`}>
                <Settings2 size={15} strokeWidth={1.8} />
              </Link>
            </div>
          </div>
          <div className="hidden sm:flex gap-0.5 overflow-x-auto">
            {NAV_ITEMS.map(({ key, label, Icon }) => (
              <Link key={key} href={`/trips/${trip.id}/${key}`}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-xl transition-all whitespace-nowrap ${
                  active === key
                    ? 'bg-white text-blue-700 shadow-sm'
                    : 'text-white/70 hover:text-white hover:bg-white/10'
                }`}>
                <Icon size={14} strokeWidth={active === key ? 2.2 : 1.8} />
                {label}
              </Link>
            ))}
          </div>
          <div className="sm:hidden h-2" />
        </div>
      </div>

      <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-slate-200 shadow-lg">
        <div className="flex">
          {NAV_ITEMS.map(({ key, label, Icon }) => (
            <Link key={key} href={`/trips/${trip.id}/${key}`}
              className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 transition-colors ${
                active === key ? 'text-blue-600' : 'text-slate-400'
              }`}>
              <Icon size={20} strokeWidth={active === key ? 2.2 : 1.8} />
              <span className="text-xs leading-tight">{label}</span>
            </Link>
          ))}
        </div>
      </nav>

      <div className="sm:hidden h-16" />
    </>
  )
}
