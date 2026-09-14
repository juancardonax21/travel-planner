import type { Event } from '@/types'

/* Pasos previstos de una jornada.
 *
 * Sale de dos sumandos, y conviene saber qué es cada uno porque la fiabilidad
 * es muy distinta:
 *
 *   1. Los traslados marcados «a pie», medidos entre las coordenadas reales de
 *      cada evento. Esto es dato: si el plan dice que vais andando de Todai-ji
 *      a Kasuga Taisha, esa distancia existe.
 *   2. Una asignación fija por visita, porque dentro de un templo o un mercado
 *      también se anda. Esto es estimación gruesa: nadie sabe cuánto vais a
 *      recorrer dentro de Fushimi Inari.
 *
 * Por eso la cifra se presenta como aproximada y redondeada al millar.
 */

const PASOS_POR_KM = 1350        // zancada media adulta
const RODEO = 1.3                // las calles no van en línea recta
const PASOS_POR_VISITA: Record<string, number> = {
  activity: 900,                 // moverse por dentro del sitio
  meal: 150,
  hotel: 0,
  other: 200,
}

function km(a: Event, b: Event): number {
  const la = (a as any).lat, lo = (a as any).lng
  const lb = (b as any).lat, lob = (b as any).lng
  if (!la || !lb) return 0
  const R = 6371
  const p1 = la * Math.PI / 180, p2 = lb * Math.PI / 180
  const dp = p2 - p1, dl = (lob - lo) * Math.PI / 180
  const x = Math.sin(dp / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(x))
}

export type Pasos = { pasos: number; kmAndando: number; tramos: number }

/** Calcula los pasos de un día a partir de sus eventos ya ordenados. */
export function pasosDelDia(eventos: Event[]): Pasos {
  const orden = [...eventos].sort((a, b) => (a.time || '').localeCompare(b.time || ''))
  let kmTotal = 0
  let tramos = 0

  orden.forEach((ev, i) => {
    if (ev.category !== 'transport') return
    if ((ev as any).travel_mode !== 'walking') return
    // El trayecto va del evento anterior al siguiente con coordenadas.
    const antes = orden.slice(0, i).reverse().find(e => (e as any).lat)
    const despues = orden.slice(i + 1).find(e => (e as any).lat)
    const d = antes && despues ? km(antes, despues) : 0
    if (d > 0) { kmTotal += d * RODEO; tramos++ }
  })

  const dentro = orden.reduce((s, e) =>
    s + (e.category === 'transport' ? 0 : (PASOS_POR_VISITA[e.category] ?? 200)), 0)

  const pasos = Math.round((kmTotal * PASOS_POR_KM + dentro) / 100) * 100
  return { pasos, kmAndando: Math.round(kmTotal * 10) / 10, tramos }
}

export function formateaPasos(n: number): string {
  return new Intl.NumberFormat('es-ES').format(n)
}
