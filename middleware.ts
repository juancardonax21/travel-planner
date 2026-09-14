import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

/* Refresca la sesión en cada navegación y vuelve a escribir sus cookies desde
 * el servidor. Ese es el punto: una cookie puesta por el servidor sobrevive al
 * borrado de almacenamiento que iOS aplica a las apps instaladas. */
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookies: { name: string; value: string; options: CookieOptions }[]) => {
          cookies.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookies.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
        },
      },
    }
  )

  await supabase.auth.getUser()   // refresca el token y dispara setAll

  // La marca del bloqueo biométrico se renueva igual, para que no caduque
  // por el mismo motivo y el bloqueo desaparezca sin avisar.
  const bio = request.cookies.get('tp_bio')
  if (bio?.value) {
    response.cookies.set('tp_bio', bio.value, {
      maxAge: 60 * 60 * 24 * 365, sameSite: 'lax', path: '/',
    })
  }
  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon|icon-|apple-touch|manifest.json|sw.js).*)'],
}
