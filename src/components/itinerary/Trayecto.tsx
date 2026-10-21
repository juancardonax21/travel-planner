'use client'
import { LINEAS } from './LineaTren'

/* El viaje en metro, dibujado.
 *
 * Una chapa de color decía la línea, pero no el viaje: faltaba de dónde se
 * sale, por dónde se pasa y dónde se baja. Puesto en vertical, con la línea
 * de su color uniendo las paradas, se ve de un golpe cuánto queda y en qué
 * parada hay que empezar a levantarse.
 *
 * Las paradas intermedias van en gris y pequeñas; la de subida y la de bajada,
 * en negro. Un transbordo es otro tramo, con su propia chapa: así se ve que
 * hay que cambiar sin tener que leerlo.
 *
 * No es horario real: son las paradas y una estimación. Para un viaje que se
 * hace por primera vez, saber que son seis paradas y que la cuarta es Ginza
 * vale más que saber que el tren sale a las 12:03.
 */

export type Tramo = {
  linea: string            // clave de LINEAS
  direccion: string        // el terminus del cartel del andén
  desde: string
  hasta: string
  paradas?: string[]       // intermedias, sin incluir desde ni hasta
  minutos?: number
}

function Chapa({ clave }: { clave: string }) {
  const l = LINEAS[clave]
  if (!l) return null
  return (
    <span className="flex items-center justify-center rounded-full text-white font-bold flex-shrink-0"
      style={{ background: l.color, width: 24, height: 24, fontSize: l.codigo.length > 1 ? 9 : 12 }}>
      {l.codigo}
    </span>
  )
}

function Punto({ color, grande, arriba = true, abajo = true }:
  { color: string; grande?: boolean; arriba?: boolean; abajo?: boolean }) {
  return (
    <span className="relative flex-shrink-0 flex items-center justify-center" style={{ width: 24 }}>
      <span className="absolute" style={{
        top: arriba ? 0 : '50%', bottom: abajo ? 0 : '50%',
        width: 3, background: color, opacity: .35 }} />
      <span className="relative rounded-full bg-white"
        style={{ width: grande ? 13 : 8, height: grande ? 13 : 8, border: `${grande ? 3.5 : 2.5}px solid ${color}` }} />
    </span>
  )
}

export default function Trayecto({ tramos }: { tramos: Tramo[] }) {
  const total = tramos.reduce((s, t) => s + (t.minutos || 0), 0)
  const paradas = tramos.reduce((s, t) => s + (t.paradas?.length ?? 0) + 1, 0)
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3.5 mb-3">
      <div className="flex items-baseline justify-between mb-2.5">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">El trayecto</span>
        <span className="text-[11px] text-slate-500 font-mono">
          {paradas} parada{paradas === 1 ? '' : 's'}
          {total > 0 && ` · ~${total} min`}
          {tramos.length > 1 && ` · ${tramos.length - 1} transbordo${tramos.length > 2 ? 's' : ''}`}
        </span>
      </div>

      {tramos.map((t, i) => {
        const l = LINEAS[t.linea]
        const color = l?.color || '#94A3B8'
        return (
          <div key={i} className={i > 0 ? 'mt-1' : ''}>
            {/* rótulo del tramo */}
            <div className="flex items-center gap-2 mb-1">
              <Chapa clave={t.linea} />
              <span className="min-w-0">
                <span className="block text-[13px] font-semibold text-slate-800 leading-tight">
                  {l ? `Línea ${l.nombre}` : t.linea}
                </span>
                <span className="block text-[11px] text-slate-500 leading-tight">
                  dirección {t.direccion}
                  {t.minutos ? ` · ${t.minutos} min` : ''}
                </span>
              </span>
            </div>

            {/* subida */}
            <div className="flex items-stretch gap-2.5" style={{ minHeight: 26 }}>
              <Punto color={color} grande arriba={i > 0} />
              <span className="text-[13px] font-semibold text-slate-900 self-center">{t.desde}</span>
              {i > 0 && <span className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5 self-center">transbordo</span>}
            </div>

            {/* paradas por las que se pasa */}
            {(t.paradas || []).map((p, j) => (
              <div key={j} className="flex items-stretch gap-2.5" style={{ minHeight: 21 }}>
                <Punto color={color} />
                <span className="text-[12px] text-slate-400 self-center">{p}</span>
              </div>
            ))}

            {/* bajada: en el último tramo cierra el dibujo */}
            <div className="flex items-stretch gap-2.5" style={{ minHeight: 26 }}>
              <span className="relative flex-shrink-0 flex items-center justify-center" style={{ width: 24 }}>
                {i < tramos.length - 1 && (
                  <span className="absolute" style={{ top: 0, bottom: 0, width: 3, background: color, opacity: .35 }} />
                )}
                {i === tramos.length - 1 && (
                  <span className="absolute" style={{ top: 0, height: '50%', width: 3, background: color, opacity: .35 }} />
                )}
                <span className="relative rounded-full bg-white"
                  style={{ width: 13, height: 13, border: `3.5px solid ${color}` }} />
              </span>
              <span className="text-[13px] font-semibold text-slate-900 self-center">{t.hasta}</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}
