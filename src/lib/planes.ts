/* Planes en paralelo dentro de un mismo día.
 *
 * Hay días en que la familia se separa: unos van a Universal y otro se queda
 * en Osaka. Los eventos no apuntan a ninguna persona en la base de datos, así
 * que lo único que dice de quién es cada cosa es el propio título, escrito con
 * un prefijo: "Mamá · Sumiyoshi Taisha".
 *
 * Ese prefijo manda de verdad -decide en qué columna de la rejilla cae cada
 * plan-, pero no debe comerse el ancho de la etiqueta. Se muestra aparte: como
 * cabecera de columna en la rejilla y como distintivo en la ficha. */

// Más largo que esto no es un plan, es un título con un punto medio dentro.
const LARGO_MAX = 24

export function planDe(ev: { title?: string | null }): string | null {
  const t = ev.title || ''
  const i = t.indexOf(' · ')
  return i > 0 && i <= LARGO_MAX ? t.slice(0, i) : null
}

/** El título sin el prefijo del plan, que es lo que se enseña. */
export function tituloSinPlan(ev: { title?: string | null }): string {
  const t = ev.title || ''
  const p = planDe(ev)
  return p ? t.slice(p.length + 3) : t
}
