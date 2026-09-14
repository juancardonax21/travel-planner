import { createClient } from '@supabase/supabase-js'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

/* Lista y cambia el papel de quien tiene acceso a un viaje.
 *
 * Pasa por el servidor porque los correos viven en auth.users, que el
 * navegador no puede consultar. Solo responde al propietario del viaje. */

async function quienPide() {
  const store = cookies()
  const c = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => store.getAll(),
        setAll: (cs: { name: string; value: string; options: CookieOptions }[]) => {
          try { cs.forEach(({ name, value, options }) => store.set(name, value, options)) } catch { /* */ }
        },
      },
    }
  )
  const { data } = await c.auth.getUser()
  return data.user
}

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

async function esPropietario(tripId: string, userId: string) {
  const { data } = await admin().from('trips').select('user_id').eq('id', tripId).maybeSingle()
  return data?.user_id === userId
}

export async function GET(request: Request) {
  try {
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ error: 'Falta SUPABASE_SERVICE_ROLE_KEY en el servidor.' }, { status: 500 })
    }
    const trip = new URL(request.url).searchParams.get('trip')
    const user = await quienPide()
    if (!trip || !user) return NextResponse.json({ error: 'No autorizado.' }, { status: 401 })
    if (!await esPropietario(trip, user.id)) {
      return NextResponse.json({ error: 'Solo el propietario ve esta lista.' }, { status: 403 })
    }

    const a = admin()
    const { data: accesos } = await a.from('trip_access')
      .select('user_id, role').eq('trip_id', trip)
    const { data: lista } = await a.auth.admin.listUsers({ page: 1, perPage: 200 })
    const correo = new Map((lista?.users || []).map(u => [u.id, u.email]))

    return NextResponse.json({
      miembros: (accesos || []).map(x => ({
        user_id: x.user_id, role: x.role,
        email: correo.get(x.user_id) || '(cuenta borrada)',
        soyYo: x.user_id === user.id,
      })),
    })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Error del servidor.' }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const { trip, user_id, role } = await request.json()
    if (!['member', 'sin_costes'].includes(role)) {
      return NextResponse.json({ error: 'Papel no válido.' }, { status: 400 })
    }
    const user = await quienPide()
    if (!user) return NextResponse.json({ error: 'No autorizado.' }, { status: 401 })
    if (!await esPropietario(trip, user.id)) {
      return NextResponse.json({ error: 'Solo el propietario puede cambiarlo.' }, { status: 403 })
    }
    // El propietario no se degrada a sí mismo sin querer.
    if (user_id === user.id) {
      return NextResponse.json({ error: 'No puedes cambiar tu propio papel.' }, { status: 400 })
    }
    const { error } = await admin().from('trip_access')
      .update({ role }).eq('trip_id', trip).eq('user_id', user_id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Error del servidor.' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const { trip, user_id } = await request.json()
    const user = await quienPide()
    if (!user) return NextResponse.json({ error: 'No autorizado.' }, { status: 401 })
    if (!await esPropietario(trip, user.id)) {
      return NextResponse.json({ error: 'Solo el propietario puede retirar el acceso.' }, { status: 403 })
    }
    if (user_id === user.id) {
      return NextResponse.json({ error: 'No puedes retirarte a ti mismo.' }, { status: 400 })
    }
    await admin().from('trip_access').delete().eq('trip_id', trip).eq('user_id', user_id)
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Error del servidor.' }, { status: 500 })
  }
}
