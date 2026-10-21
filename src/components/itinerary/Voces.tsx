'use client'
import { useState } from 'react'
import { Heart, Send, Trash2, UserRound } from 'lucide-react'
import CampoCrece from './CampoCrece'
import type { Voz, Viajero } from '@/lib/voces'

/* Lo que dice la familia sobre una cosa del plan.
 *
 * El mismo bloque sirve para dos momentos y lo único que cambia son las
 * palabras: antes del viaje el corazón son ganas y el texto es una opinión
 * sobre algo que aún no ha pasado; desde el día en adelante el corazón es
 * veredicto y el texto es un recuerdo. La fecha ya la sabe la app, así que
 * no hace falta preguntar nada.
 */

function cuando(iso: string) {
  const d = new Date(iso)
  const min = Math.round((Date.now() - d.getTime()) / 60000)
  if (min < 1) return 'ahora'
  if (min < 60) return `hace ${min} min`
  if (min < 60 * 24) return `hace ${Math.round(min / 60)} h`
  return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
}

export default function Voces({
  voces, viajeros, yo, elige, yaPasado, onCorazon, onNota, onBorrar,
}: {
  voces: Voz[]
  viajeros: Viajero[]
  yo: Viajero | null
  elige: (id: string) => void
  yaPasado: boolean
  onCorazon: (yo: Viajero) => void
  onNota: (yo: Viajero, texto: string) => void
  onBorrar: (id: string) => void
}) {
  const [texto, setTexto] = useState('')
  /* Lo que ibas a hacer cuando te preguntamos el nombre: se guarda y se hace
     en cuanto lo dices, para no obligar a repetir el gesto. */
  const [pendiente, setPendiente] = useState<{ hacer: (y: Viajero) => void } | null>(null)
  const [pidiendoNombre, setPidiendoNombre] = useState(false)

  const corazones = voces.filter(v => v.tipo === 'corazon')
  const notas = voces.filter(v => v.tipo === 'nota')
  const mio = !!(yo && corazones.some(c => c.member_id === yo.id))

  /* Nada de hacer y luego preguntar: si no sabemos quién es, se pregunta
     antes de tocar nada, y no se vuelve a preguntar en este teléfono. */
  const conNombre = (hacer: (y: Viajero) => void) => {
    if (!yo) { setPendiente({ hacer }); setPidiendoNombre(true); return }
    hacer(yo)
  }

  const meLlamo = (v: Viajero) => {
    elige(v.id)
    setPidiendoNombre(false)
    pendiente?.hacer(v)
    setPendiente(null)
  }

  if (pidiendoNombre && !yo) {
    return (
      <div className="border-t border-slate-100 pt-4 mb-4">
        <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
          ¿Quién eres?
        </div>
        <p className="text-xs text-slate-400 mb-2.5">
          Para que lo que digas lleve tu nombre. Solo se pregunta una vez en este móvil.
        </p>
        <div className="flex flex-wrap gap-1.5">
          {viajeros.map(v => (
            <button key={v.id} type="button"
              onClick={() => meLlamo(v)}
              className="inline-flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-full bg-white border border-slate-200 text-slate-700 hover:border-violet-400 hover:text-violet-700 transition-colors">
              <UserRound size={13} strokeWidth={2} /> {v.name.split(' ')[0]}
            </button>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="border-t border-slate-100 pt-4 mb-4">
      <div className="flex items-center justify-between gap-2 mb-2.5">
        <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
          {yaPasado ? 'Lo que nos pareció' : 'Lo que decimos'}
        </div>
        {yo && (
          <button type="button" onClick={() => setPidiendoNombre(true)}
            className="text-[11px] text-slate-300 hover:text-slate-500 transition-colors">
            {yo.name.split(' ')[0]} · cambiar
          </button>
        )}
      </div>

      <div className="flex items-center gap-2 flex-wrap mb-3">
        <button type="button" onClick={() => conNombre(onCorazon)}
          className={`inline-flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-full border transition-colors ${
            mio ? 'bg-rose-50 text-rose-600 border-rose-200'
                : 'bg-white text-slate-500 border-slate-200 hover:border-rose-300 hover:text-rose-500'
          }`}>
          <Heart size={14} strokeWidth={2} fill={mio ? 'currentColor' : 'none'} />
          {yaPasado ? 'Me gustó' : 'Me apetece'}
          {corazones.length > 0 && <span className="font-mono">{corazones.length}</span>}
        </button>
        {corazones.length > 0 && (
          <span className="text-xs text-slate-400">
            {corazones.map(c => c.autor.split(' ')[0]).join(', ')}
          </span>
        )}
      </div>

      {notas.length > 0 && (
        <div className="space-y-2 mb-3">
          {notas.map(n => (
            <div key={n.id} className="group/n flex gap-2 text-sm">
              <div className="flex-1 min-w-0 bg-slate-50 rounded-2xl px-3 py-2">
                <div className="flex items-baseline gap-2">
                  <span className="font-semibold text-slate-700 text-xs">{n.autor.split(' ')[0]}</span>
                  <span className="text-[11px] text-slate-300">{cuando(n.created_at)}</span>
                </div>
                <p className="text-slate-600 whitespace-pre-wrap leading-snug">{n.texto}</p>
              </div>
              {yo && n.member_id === yo.id && (
                <button type="button" onClick={() => onBorrar(n.id)}
                  className="self-start text-slate-200 hover:text-red-500 p-1.5 rounded-lg transition-colors opacity-100 sm:opacity-0 sm:group-hover/n:opacity-100">
                  <Trash2 size={13} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="flex items-end gap-2">
        <CampoCrece
          className="flex-1 text-sm bg-white border border-slate-200 rounded-2xl px-3 py-2 focus:outline-none focus:border-violet-400 transition-colors"
          placeholder={yaPasado ? '¿Qué tal ha ido?' : '¿Qué te parece?'}
          value={texto}
          onChange={e => setTexto(e.target.value)} />
        <button type="button"
          disabled={!texto.trim()}
          onClick={() => conNombre(y => { onNota(y, texto); setTexto('') })}
          className="btn-primary px-3 py-2 disabled:opacity-30 disabled:cursor-not-allowed">
          <Send size={15} strokeWidth={2} />
        </button>
      </div>
    </div>
  )
}
