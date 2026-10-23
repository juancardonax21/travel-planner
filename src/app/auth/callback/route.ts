import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

/* Donde aterriza el enlace del correo de recuperación.
 *
 * Supabase manda un `code` de un solo uso que aquí se canjea por la sesión,
 * escribiendo sus cookies desde el servidor igual que hace el middleware. Esa
 * sesión es la que luego deja fijar la contraseña nueva.
 *
 * El verificador del canje vive en una cookie del navegador que pidió el
 * correo, así que el enlace solo funciona ahí: abrirlo en otro sitio falla. */

export async function GET(request: Request) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')

  // Solo rutas internas: un `next` con host propio sería un redirector abierto.
  const pedido = url.searchParams.get('next') || '/trips'
  const next = pedido.startsWith('/') && !pedido.startsWith('//') ? pedido : '/trips'

  const alLogin = (motivo: string) =>
    NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(motivo)}`, url.origin))

  if (!code) return alLogin('El enlace no es válido. Pide otro correo de recuperación.')

  const store = cookies()
  const supabase = createServerClient(
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

  const { error } = await supabase.auth.exchangeCodeForSession(code)
  if (error) {
    return alLogin('El enlace ha caducado o ya se usó. Pide otro y ábrelo en el navegador donde lo pediste.')
  }

  return NextResponse.redirect(new URL(next, url.origin))
}
