import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

/* Tipo de cambio al día.
 *
 * Cada viaje guarda su exchange_rate a mano, y un número escrito hace meses
 * deja de ser verdad: el yen se movió un 15% mientras planificábamos este.
 * Esta ruta lo relee y lo actualiza.
 *
 * La llama el cron de Vercel una vez por semana (ver vercel.json), y también
 * se puede pedir a mano con el mismo secreto.
 *
 * Los datos salen de Frankfurter, que publica las referencias diarias del
 * Banco Central Europeo. Es gratis y no pide clave.
 *
 * Se llama a api.frankfurter.dev directamente: el viejo api.frankfurter.app
 * responde con un 301 hacia aquí, y esa redirección devuelve 403 según qué
 * cliente la siga.
 */

export const dynamic = 'force-dynamic'

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

async function actualizar() {
  const a = admin()
  const { data: viajes, error } = await a.from('trips').select('id, name, currency, exchange_base, exchange_rate')
  if (error) throw new Error(error.message)

  // Un viaje por moneda no: una consulta por par de monedas, que casi todos
  // los viajes comparten el mismo.
  const pares = new Map<string, { from: string; to: string }>()
  for (const v of viajes || []) {
    if (!v.currency || !v.exchange_base || v.currency === v.exchange_base) continue
    pares.set(`${v.currency}-${v.exchange_base}`, { from: v.currency, to: v.exchange_base })
  }

  const tasas = new Map<string, number>()
  // Array.from y no for..of directo sobre el Map: el target de TypeScript
  // de este proyecto no permite recorrer iteradores sin downlevelIteration.
  for (const [clave, { from, to }] of Array.from(pares.entries())) {
    const r = await fetch(`https://api.frankfurter.dev/v1/latest?from=${from}&to=${to}`, { cache: 'no-store' })
    if (!r.ok) continue
    const j = await r.json()
    const tasa = j?.rates?.[to]
    if (typeof tasa === 'number' && tasa > 0) tasas.set(clave, tasa)
  }

  const cambios: any[] = []
  for (const v of viajes || []) {
    const tasa = tasas.get(`${v.currency}-${v.exchange_base}`)
    if (!tasa) continue
    // Menos de un 0,5% no merece escribir en la base.
    const antes = Number(v.exchange_rate) || 0
    if (antes > 0 && Math.abs(tasa - antes) / antes < 0.005) continue
    const { error: e2 } = await a.from('trips').update({ exchange_rate: tasa }).eq('id', v.id)
    if (!e2) cambios.push({ viaje: v.name, de: antes, a: tasa, par: `${v.currency}→${v.exchange_base}` })
  }
  return { revisados: (viajes || []).length, pares: pares.size, actualizados: cambios.length, cambios }
}

export async function GET(request: Request) {
  const secreto = process.env.CRON_SECRET
  if (!secreto) {
    return NextResponse.json({ error: 'Falta CRON_SECRET en el servidor.' }, { status: 500 })
  }
  if (request.headers.get('authorization') !== `Bearer ${secreto}`) {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 401 })
  }
  try {
    return NextResponse.json(await actualizar())
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Error del servidor.' }, { status: 500 })
  }
}
