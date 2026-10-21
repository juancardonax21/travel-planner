'use client'
import IconoPokeball from './IconoPokeball'

/* Lo que se puede cazar aquí.
 *
 * Las «ポケふた» son tapas de alcantarilla con un Pokémon dibujado, oficiales
 * y permanentes, y cada una está dada de alta como Poképarada en el juego:
 * son foto y objetivo a la vez. Solo salen en los eventos donde cae una de
 * verdad, sin desviarse del plan. */

export type Caza = {
  tapa: string            // dónde está exactamente
  pokemon: string[]       // qué lleva dibujado
  nota?: string           // cómo llegar, o por qué tiene gracia
}

export default function BloqueCaza({ caza }: { caza: Caza | Caza[] }) {
  // En Ueno hay dos tapas a cinco minutos una de otra, así que esto admite
  // varias; donde solo hay una, se escribe una y ya.
  const tapas = Array.isArray(caza) ? caza : [caza]
  if (!tapas.length) return null
  return (
    <div className="rounded-2xl border border-red-200 bg-red-50/60 p-3 mb-3">
      <div className="flex items-center gap-1.5 mb-2">
        <IconoPokeball size={15} />
        <span className="text-xs font-semibold text-red-700 uppercase tracking-wide">
          {tapas.length > 1 ? `Aquí hay ${tapas.length} ポケふた` : 'Aquí hay una ポケふた'}
        </span>
      </div>
      <div className="space-y-2.5">
        {tapas.map((t, i) => (
          <div key={i}>
            <p className="text-sm font-semibold text-slate-800 leading-tight">
              {t.pokemon.join(' · ')}
            </p>
            <p className="text-xs text-slate-500 mt-0.5">{t.tapa}</p>
            {t.nota && <p className="text-sm text-slate-600 mt-1 leading-snug">{t.nota}</p>}
          </div>
        ))}
      </div>
      <p className="text-[11px] text-slate-400 mt-2">
        Las tapas están dadas de alta como Poképarada: cuentan en el juego y además es la foto.
      </p>
    </div>
  )
}
