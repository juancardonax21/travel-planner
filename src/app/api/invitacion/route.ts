import { createClient } from '@supabase/supabase-js'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

/* Canje de una invitación.
 *
 * Tiene que pasar por el servidor: un usuario no puede darse acceso a sí mismo
 * —las políticas se lo impiden, y deben impedírselo—, así que la comprobación
 * del token y el alta las hace la clave de servicio, que se salta RLS.
 *
 * Lo que se valida antes de dar acceso: que el token exista, que no esté
 * revocado, y que quien lo canjea haya iniciado sesión de verdad.
 */
export async function POST(request: Request) {
  const { token } = await request.json().catch(() => ({ token: null }))
  if (!token || typeof token !== 'string') {
    return NextResponse.json({ error: 'Falta el código de invitación.' }, { status: 400 })
  }

  // Quién pide el canje, según su propia sesión.
  const store = cookies()
  const auth = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => store.getAll(),
        setAll: (cs: { name: string; value: string; options: CookieOptions }[]) => {
          cs.forEach(({ name, value, options }) => store.set(name, value, options))
        },
      },
    }
  )
  const { data: { user } } = await auth.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Inicia sesión antes de aceptar la invitación.' }, { status: 401 })
  }

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )

  const { data: inv } = await admin
    .from('trip_invitations')
    .select('trip_id, revoked')
    .eq('token', token)
    .maybeSingle()

  if (!inv || inv.revoked) {
    return NextResponse.json({ error: 'Esta invitación ya no es válida.' }, { status: 404 })
  }

  const { error } = await admin
    .from('trip_access')
    .upsert({ trip_id: inv.trip_id, user_id: user.id, role: 'member' },
            { onConflict: 'trip_id,user_id' })

  if (error) {
    return NextResponse.json({ error: 'No se pudo dar de alta el acceso.' }, { status: 500 })
  }
  return NextResponse.json({ trip_id: inv.trip_id })
}
