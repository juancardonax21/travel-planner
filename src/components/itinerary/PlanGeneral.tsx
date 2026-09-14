'use client'
import type { Trip, Event } from '@/types'
import { formatDate } from '@/lib/utils'
import { pasosDelDia, formateaPasos } from '@/lib/pasos'
import { MapPin, BedDouble, Footprints, Plane, TrainFront, Sparkles } from 'lucide-react'

/* Plan general: el viaje leído de un vistazo.
 *
 * El hito es la ciudad, no el día. Debajo, una línea por jornada con lo
 * gordo de ese día. Sirve para responder "¿qué hacemos en Kioto?" sin
 * recorrer la cuadrícula hora a hora.
 *
 * La ciudad sale de las ubicaciones ya geocodificadas de cada día, y los
 * titulares de cada jornada, de las actividades con nombre propio: nada de
 * esto se escribe a mano, así que sigue al plan cuando el plan cambia.
 *
 * La excepción es el ancla, que sí está escrita: dice por qué ese día está en
 * el viaje, y eso no se deduce de una lista de actividades. Cuando la hay,
 * manda ella.
 *
 * Aquí no se habla de dinero. El viaje se lee por lo que se hace; lo que
 * cuesta se mira entero en la pestaña de presupuesto.
 */

/** Ciudad a partir de la dirección geocodificada.
 *  Google devuelve el código postal pegado al final —"Tokyo 103-0005"— y a
 *  veces como parte suelta, así que hay que quitarlo antes de quedarse con
 *  la última pieza. */
function ciudadDe(ev: Event): string | null {
  const loc = (ev as any).location as string | undefined
  if (!loc) return null
  const partes = loc.split(',')
    .map(s => s.replace(/〒?\d{3}-\d{4}/g, '').trim())
    .filter(s => s && !/^jap[oó]n$|^japan$/i.test(s))
  const c = partes[partes.length - 1]
  return c && c.length <= 18 ? c : null
}

/** El alojamiento de esa noche, que es lo que ancla el tramo. */
function hotelDeLaNoche(events: Event[], day: string): Event | undefined {
  return events.find(e => e.category === 'hotel'
    && (e as any).accom_checkin_date <= day
    && (e as any).accom_checkout_date > day)
}

/** Lo más gordo del día: actividades con nombre, por duración. */
function titulares(evs: Event[], max = 3): string[] {
  const min = (t?: string | null) => {
    if (!t) return 0
    const [h, m] = t.slice(0, 5).split(':').map(Number)
    return h * 60 + m
  }
  return evs
    .filter(e => e.category === 'activity')
    .map(e => ({ t: e.title, dur: min((e as any).end_time) - min(e.time) }))
    .sort((a, b) => b.dur - a.dur)
    .slice(0, max)
    .map(x => x.t)
}

/** Si un día no tiene actividades, se cuenta por lo que sí tiene. */
function respaldo(evs: Event[]): string {
  const t = evs.find(e => e.category === 'transport'
    && ['flight', 'shinkansen', 'train', 'bus'].includes((e as any).travel_mode))
  if (t) return t.title
  const o = evs.find(e => e.category === 'other')
  if (o) return o.title
  return evs.length ? 'Sin visitas programadas' : 'Día libre'
}

type Tramo = { ciudad: string; hotel?: Event; dias: string[]; eventos: Event[] }

export default function PlanGeneral({ trip, events, days, onDayClick, anclas = {} }:
  { trip: Trip; events: Event[]; days: string[]; onDayClick: (d: string) => void
    anclas?: Record<string, string> }) {

  // Un tramo dura lo que dura un alojamiento. Los días sin hotel —los de
  // vuelo— quedan aparte, que son tránsito y no estancia.
  const tramos: Tramo[] = []
  days.forEach(day => {
    const evs = events.filter(e => e.day === day && e.category !== 'hotel')
    const hotel = hotelDeLaNoche(events, day)
    const ciudad = hotel ? (ciudadDe(hotel) || hotel.title) : 'En ruta'
    const ultimo = tramos[tramos.length - 1]
    const mismoTramo = ultimo && ultimo.hotel?.id === hotel?.id && ultimo.ciudad === ciudad
    if (mismoTramo) {
      ultimo.dias.push(day); ultimo.eventos.push(...evs)
    } else {
      tramos.push({ ciudad, hotel, dias: [day], eventos: [...evs] })
    }
  })

  return (
    <div className="mb-4">
      {tramos.map((tr, i) => {
        const hotel = tr.hotel

        return (
          <div key={i} className="relative pl-8 pb-2">
            {/* hilo vertical que une los tramos */}
            {i < tramos.length - 1 && (
              <div className="absolute left-[11px] top-7 bottom-0 w-px bg-slate-200" />
            )}
            <div className="absolute left-0 top-1 w-6 h-6 rounded-full bg-blue-600 text-white
              flex items-center justify-center shadow-sm">
              <MapPin size={13} strokeWidth={2.2} />
            </div>

            <div className="card p-4 mb-3">
              <div className="flex items-baseline justify-between gap-2 flex-wrap">
                <h3 className="text-lg font-bold text-slate-900">{tr.ciudad}</h3>
                <span className="text-xs font-mono text-slate-400">
                  {formatDate(tr.dias[0], 'd MMM')} – {formatDate(tr.dias[tr.dias.length - 1], 'd MMM')}
                  {' · '}{tr.dias.length} {tr.dias.length === 1 ? 'día' : 'días'}
                </span>
              </div>

              {hotel && (
                <p className="text-xs text-emerald-700 mt-1 flex items-center gap-1.5">
                  <BedDouble size={12} strokeWidth={1.8} /> {hotel.title}
                </p>
              )}

              <div className="mt-3 space-y-2">
                {tr.dias.map(day => {
                  const evs = events.filter(e => e.day === day && e.category !== 'hotel')
                  const tit = titulares(evs)
                  const pasos = pasosDelDia(events.filter(e => e.day === day)).pasos
                  const largo = evs.find(e => e.category === 'transport'
                    && ['shinkansen', 'flight'].includes((e as any).travel_mode))
                  return (
                    <button key={day} onClick={() => onDayClick(day)}
                      className="w-full text-left flex gap-3 py-1.5 px-2 -mx-2 rounded-lg hover:bg-slate-50 transition-colors">
                      <span className="font-mono text-xs text-slate-400 w-14 flex-shrink-0 pt-0.5">
                        {formatDate(day, 'd MMM')}
                      </span>
                      <span className="text-sm text-slate-600 leading-snug flex-1 min-w-0">
                        {largo && (
                          <span className="inline-flex items-center gap-1 text-blue-700 font-medium mr-1.5">
                            {(largo as any).travel_mode === 'flight'
                              ? <Plane size={12} strokeWidth={2} />
                              : <TrainFront size={12} strokeWidth={2} />}
                            {largo.title}
                            {(anclas[day] || tit.length > 0) && ' ·'}
                          </span>
                        )}
                        {anclas[day] ? (
                          <span className="inline-flex items-start gap-1.5 text-violet-800">
                            <Sparkles size={12} strokeWidth={2} className="flex-shrink-0 mt-0.5 text-violet-500" />
                            {anclas[day]}
                          </span>
                        ) : (tit.length > 0 ? tit.join(', ') : (largo ? '' : respaldo(evs)))}
                      </span>
                      {/* Los pasos son de cada jornada: sumados por ciudad no
                          dicen nada, porque lo que se quiere saber es si un
                          día concreto va a ser una paliza. */}
                      {pasos > 0 && (
                        <span className="font-mono text-xs text-slate-400 flex-shrink-0 pt-0.5 inline-flex items-center gap-1"
                          title="Aproximado, contando lo que se anda entre sitios y dentro de cada uno">
                          <Footprints size={11} strokeWidth={1.8} /> {formateaPasos(pasos)}
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>

            </div>
          </div>
        )
      })}
    </div>
  )
}
