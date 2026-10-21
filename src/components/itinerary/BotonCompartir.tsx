'use client'
import { useState } from 'react'
import { Share2, Check, X } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { planDe, tituloSinPlan } from '@/lib/planes'
import type { Event } from '@/types'

/* «Mira dónde estamos» y «nos vemos aquí a las seis».
 *
 * En el móvil abre el compartir del propio teléfono, que es donde está
 * WhatsApp y todo lo demás. En el escritorio no existe ese menú en todos los
 * navegadores, así que el texto se copia al portapapeles y se pega donde haga
 * falta: es lo mismo en dos pasos, y no se abre una pestaña que nadie pidió.
 *
 * Y si el portapapeles está cerrado -algunos navegadores lo niegan sin
 * preguntar- el texto se enseña para copiarlo a mano. Un botón que no hace
 * nada al tocarlo es peor que no tener botón.
 */

/* El portapapeles de toda la vida. Feo, pero pasa donde el moderno no pasa. */
function copiaALaVieja(texto: string): boolean {
  try {
    const ta = document.createElement('textarea')
    ta.value = texto
    ta.setAttribute('readonly', '')
    ta.style.position = 'fixed'
    ta.style.top = '-1000px'
    document.body.appendChild(ta)
    ta.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(ta)
    return ok
  } catch { return false }
}

function enlaceDeMapa(ev: Event): string {
  const e = ev as any
  if (e.lat && e.lng) return `https://maps.google.com/?q=${e.lat},${e.lng}`
  const sitio = e.accom_address || ev.location
  return sitio ? `https://maps.google.com/?q=${encodeURIComponent(sitio)}` : ''
}

export function textoDelEvento(ev: Event): { titulo: string; texto: string; url: string } {
  const e = ev as any
  const titulo = tituloSinPlan(ev)
  const horas = ev.time
    ? ev.time.slice(0, 5) + (e.end_time ? `–${e.end_time.slice(0, 5)}` : '')
    : ''
  /* El prefijo del título es de quién es el plan los días que la familia se
     separa. En la app se enseña aparte; aquí se dice con todas las letras,
     porque quien lo reciba no tiene la pantalla delante. */
  const plan = planDe(ev)
  const lineas = [
    titulo,
    [formatDate(ev.day, 'EEEE'), horas].filter(Boolean).join(' · '),
    plan ? `Plan de ${plan}` : '',
    e.accom_address || ev.location || '',
  ].filter(Boolean)
  return { titulo, texto: lineas.join('\n'), url: enlaceDeMapa(ev) }
}

export default function BotonCompartir({ ev }: { ev: Event }) {
  const [copiado, setCopiado] = useState(false)
  const [aMano, setAMano] = useState<string | null>(null)

  async function comparte() {
    const { titulo, texto, url } = textoDelEvento(ev)
    const entero = [texto, url].filter(Boolean).join('\n')

    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title: titulo, text: texto, url: url || undefined })
        return
      } catch (err: any) {
        // Cerrar el menú no es un fallo: no hay que copiar nada por detrás.
        if (err?.name === 'AbortError') return
      }
    }

    let hecho = false
    try {
      await navigator.clipboard.writeText(entero)
      hecho = true
    } catch { hecho = copiaALaVieja(entero) }

    if (hecho) {
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2000)
    } else {
      setAMano(entero)
    }
  }

  return (
    <>
      <button type="button" onClick={comparte}
        title="Compartir"
        className={`btn-secondary px-4 flex items-center justify-center gap-1.5 transition-colors ${
          copiado ? 'text-emerald-600 border-emerald-200 bg-emerald-50' : ''
        }`}>
        {copiado
          ? <><Check size={14} strokeWidth={2.5} /> Copiado</>
          : <Share2 size={14} strokeWidth={2} />}
      </button>

      {aMano && (
        <div className="fixed inset-x-0 bottom-0 z-[60] p-4" onClick={() => setAMano(null)}>
          <div className="max-w-lg mx-auto card p-4 shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-2 mb-2">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                Copia esto y pégalo donde quieras
              </span>
              <button type="button" onClick={() => setAMano(null)}
                className="text-slate-300 hover:text-slate-600 transition-colors">
                <X size={16} />
              </button>
            </div>
            <textarea readOnly value={aMano} rows={5}
              onFocus={e => e.currentTarget.select()}
              className="w-full text-sm bg-slate-50 rounded-xl p-3 text-slate-700 resize-none focus:outline-none" />
          </div>
        </div>
      )}
    </>
  )
}
