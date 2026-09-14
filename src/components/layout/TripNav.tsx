'use client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { Trip } from '@/types'
import { daysUntil, formatDate } from '@/lib/utils'
import {
  CalendarDays, CreditCard, FolderOpen, Users, Sparkles,
  Settings2, Printer, ChevronLeft,
} from 'lucide-react'
import { useRolViaje } from '@/lib/rolViaje'

/* Cabecera del viaje.
 *
 * Vive en el layout de /trips/[id], así que no se desmonta al cambiar de
 * pestaña: solo se sustituye el contenido de abajo. */

// En móvil caben siete pestañas solo con nombres cortos: "Presupuesto" y
// "Documentos" se pisaban con las vecinas.
const NAV_ITEMS = [
  { key: 'itinerary', label: 'Itinerario',  corto: 'Plan',   Icon: CalendarDays },
  { key: 'budget',    label: 'Presupuesto', corto: 'Gastos', Icon: CreditCard },
  { key: 'documents', label: 'Documentos',  corto: 'Docs',   Icon: FolderOpen },
  { key: 'travelers', label: 'Viajeros',    corto: 'Quién',  Icon: Users },
  { key: 'prepare',   label: 'Preparar',    corto: 'Listas', Icon: Sparkles },
  // Las dos últimas van solo con icono: son accesorias y no merecen el
  // ancho de una etiqueta.
  { key: 'dossier',   label: 'Dossier',     corto: 'Dossier', Icon: Printer,   soloIcono: true },
  { key: 'settings',  label: 'Ajustes',     corto: 'Ajustes', Icon: Settings2, soloIcono: true },
]

export default function TripNav({ trip, active }: { trip: Trip; active: string }) {
  const router = useRouter()
  const dL = daysUntil(trip.start_date)
  const { rol } = useRolViaje(trip.id)
  // La pestaña se muestra salvo que se sepa que está restringido: ocultarla
  // mientras se averigua el papel hacía saltar la barra al cargar. Su
  // contenido sí está protegido por las políticas de la base.
  const items = NAV_ITEMS.filter(i => i.key !== 'budget' || rol !== 'sin_costes')

  const cuenta = dL === null ? null
    : dL > 0 ? `Faltan ${dL} días`
    : dL === 0 ? 'Empieza hoy'
    : 'Viaje terminado'

  return (
    <>
      <div className="relative text-white shadow-lg overflow-hidden sticky top-0 z-30 cabecera-viaje"
        style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        {(trip as any).cover_image ? (
          <>
            {/* La portada la elige el usuario y puede ser muy clara. Un
                desenfoque corto le quita el detalle que compite con el texto,
                y el escalado evita que se vean los bordes al desenfocar. */}
            <div className="absolute inset-0 bg-cover bg-center"
              style={{
                backgroundImage: `url(${(trip as any).cover_image})`,
                filter: 'blur(3px)', transform: 'scale(1.06)',
              }} />
            <div className="absolute inset-0 bg-black/55" />
            <div className="absolute inset-0 bg-gradient-to-b from-black/45 via-black/35 to-black/85" />
          </>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-r from-blue-800 via-blue-600 to-violet-600" />
        )}

        <div className="relative z-10 max-w-4xl mx-auto px-4">
          {/* El viaje manda: destino, nombre y fechas. La cuenta atrás pasa a
              ser un dato más, en pequeño, en vez de dominar la cabecera. */}
          <div className="py-4">
            <p className="text-white/85 text-xs uppercase tracking-[0.18em] font-mono truncate">
              {trip.destination}
            </p>
            <h1 className="text-2xl sm:text-3xl font-bold leading-tight truncate mt-0.5">
              {trip.name}
            </h1>
            <p className="text-white/90 text-sm mt-1">
              {formatDate(trip.start_date, 'd MMM')} — {formatDate(trip.end_date, 'd MMM yyyy')}
              {cuenta && <span className="text-white/70"> · {cuenta}</span>}
            </p>
          </div>

          {/* Pestañas, con la vuelta a la lista a su izquierda. */}
          <div className="hidden sm:flex items-end gap-2">
            <button onClick={() => router.push('/trips')}
              className="flex items-center gap-1 text-white/85 hover:text-white text-sm pb-2.5 pr-1 transition-colors whitespace-nowrap">
              <ChevronLeft size={15} strokeWidth={2} /> Mis viajes
            </button>
            <div className="flex gap-0.5 overflow-x-auto scrollbar-hide">
              {items.map(({ key, label, Icon, soloIcono }) => (
                <Link key={key} href={`/trips/${trip.id}/${key}`}
                  title={soloIcono ? label : undefined}
                  aria-label={soloIcono ? label : undefined}
                  className={`flex items-center gap-2 py-2.5 text-sm font-medium rounded-t-xl transition-colors whitespace-nowrap ${
                    soloIcono ? 'px-3' : 'px-4'
                  } ${
                    active === key
                      ? 'bg-white text-blue-700'
                      : 'text-white/90 hover:text-white bg-black/25 hover:bg-black/40'
                  }`}>
                  <Icon size={15} strokeWidth={active === key ? 2.2 : 1.8} />
                  {!soloIcono && label}
                </Link>
              ))}
            </div>
          </div>

          {/* En móvil las pestañas van abajo: aquí solo la vuelta atrás. */}
          <button onClick={() => router.push('/trips')}
            className="sm:hidden flex items-center gap-1 text-white/85 text-sm pb-3 transition-colors">
            <ChevronLeft size={15} strokeWidth={2} /> Mis viajes
          </button>
        </div>
      </div>

      <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-slate-200 shadow-lg"
        style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 10px)' }}>
        <div className="flex">
          {items.map(({ key, corto, Icon }) => (
            <Link key={key} href={`/trips/${trip.id}/${key}`}
              className={`flex-1 min-w-0 flex flex-col items-center gap-0.5 pt-2.5 pb-1.5 px-0.5 transition-colors ${
                active === key ? 'text-blue-600' : 'text-slate-500'
              }`}>
              <Icon size={19} strokeWidth={active === key ? 2.2 : 1.8} />
              <span className="text-[10px] leading-tight truncate max-w-full">{corto}</span>
            </Link>
          ))}
        </div>
      </nav>

      <div className="sm:hidden" style={{ height: 'calc(4.25rem + max(env(safe-area-inset-bottom), 10px))' }} />
    </>
  )
}
