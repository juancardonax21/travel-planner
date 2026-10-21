'use client'
import { formatDate } from '@/lib/utils'
import { fotoDeSitio } from '@/lib/foto'
import { tituloSinPlan } from '@/lib/planes'
import type { Voz } from '@/lib/voces'
import { BookHeart, Heart, Printer, Sparkles } from 'lucide-react'

/* El diario, ya recogido: esto solo lo pinta.
 *
 * Separado de la página que lo busca en la base para poder verlo con datos
 * de mentira sin pasar por el login, que es como se encontró que los días
 * largos partían la hoja por la mitad al imprimir.
 */

export type Cosa = { ev: { id: string; time: string | null; title: string | null; foto_ref: string | null }
  corazones: Voz[]; notas: Voz[] }
export type DiaDelDiario = { day: string; ancla: string; cosas: Cosa[] }

export default function Diario({ trip, dias }:
  { trip: { name: string; start_date: string; end_date: string }; dias: DiaDelDiario[] }) {
  return (
    <div className="max-w-2xl mx-auto px-4 pb-16 diario">
      <div className="flex items-start justify-between gap-3 py-6">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-violet-600 mb-1">
            <BookHeart size={18} strokeWidth={2} />
            <span className="text-xs font-semibold uppercase tracking-wide">El diario del viaje</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 leading-tight">{trip.name}</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {formatDate(trip.start_date, 'd MMM')} — {formatDate(trip.end_date, 'd MMM yyyy')}
          </p>
        </div>
        {dias.length > 0 && (
          <button onClick={() => window.print()}
            className="btn-secondary px-3 py-2 flex items-center gap-1.5 flex-shrink-0 sin-imprimir"
            title="Imprimir el diario">
            <Printer size={15} strokeWidth={2} />
          </button>
        )}
      </div>

      {dias.length === 0 ? (
        <div className="card p-8 text-center">
          <BookHeart size={36} strokeWidth={1} className="mx-auto text-slate-200 mb-3" />
          <p className="text-slate-600 font-medium mb-1">Todavía no hay nada escrito</p>
          <p className="text-sm text-slate-400 leading-relaxed">
            El diario se llena solo. Cada corazón y cada comentario que dejéis sobre
            una cosa del plan aparece aquí, ordenado por días, y el ancla de cada
            día lo encabeza. No hay que sentarse a escribirlo.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {dias.map(d => (
            <section key={d.day} className="card p-5 dia">
              <h2 className="text-xs font-mono uppercase tracking-wide text-slate-400 mb-3">
                {formatDate(d.day, 'EEEE')}
              </h2>

              {d.ancla && (
                <div className="bg-violet-50 border border-violet-200 rounded-2xl p-3 mb-4">
                  <div className="text-xs font-semibold text-violet-600 uppercase tracking-wide mb-1 flex items-center gap-1.5">
                    <Sparkles size={11} strokeWidth={2} /> El ancla del día
                  </div>
                  <p className="text-sm text-violet-900 leading-snug whitespace-pre-wrap">{d.ancla}</p>
                </div>
              )}

              <div className="space-y-5">
                {d.cosas.map(({ ev, corazones, notas }) => (
                  <div key={ev.id}>
                    <div className="flex items-baseline gap-2 mb-1.5">
                      {ev.time && <span className="font-mono text-xs text-slate-400">{ev.time.slice(0, 5)}</span>}
                      <h3 className="font-semibold text-slate-900 leading-tight">{tituloSinPlan(ev)}</h3>
                    </div>

                    {ev.foto_ref && (
                      <img src={fotoDeSitio(ev.foto_ref) || ''} alt=""
                        className="w-full aspect-video object-cover rounded-xl bg-slate-100 mb-2" />
                    )}

                    {corazones.length > 0 && (
                      <div className="flex items-center gap-1.5 text-sm text-rose-600 mb-2">
                        <Heart size={13} strokeWidth={2} fill="currentColor" />
                        <span className="text-slate-500">
                          {corazones.map(c => c.autor.split(' ')[0]).join(', ')}
                        </span>
                      </div>
                    )}

                    <div className="space-y-1.5">
                      {notas.map(n => (
                        <p key={n.id} className="text-sm text-slate-600 leading-snug">
                          <span className="font-semibold text-slate-700">{n.autor.split(' ')[0]}: </span>
                          <span className="whitespace-pre-wrap">{n.texto}</span>
                        </p>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
