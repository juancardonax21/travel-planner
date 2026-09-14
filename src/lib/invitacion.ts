/* Invitación pendiente de canjear.
 *
 * El canje puede quedarse a medias: si el proyecto exige confirmar el correo,
 * la persona sale de la página de invitación, confirma desde su email y vuelve
 * a la aplicación por otra puerta. Guardando el código, el canje se completa
 * en cuanto haya sesión, entre por donde entre. */
const CLAVE = 'tp_invitacion'

export function guardarPendiente(token: string) {
  try { localStorage.setItem(CLAVE, token) } catch { /* almacenamiento bloqueado */ }
  try { document.cookie = `${CLAVE}=${token}; Max-Age=${60 * 60 * 24 * 7}; Path=/; SameSite=Lax` } catch { /* */ }
}

export function leerPendiente(): string | null {
  try {
    const l = localStorage.getItem(CLAVE)
    if (l) return l
  } catch { /* */ }
  const m = typeof document !== 'undefined'
    ? document.cookie.match(new RegExp('(?:^|; )' + CLAVE + '=([^;]*)')) : null
  return m ? decodeURIComponent(m[1]) : null
}

export function olvidarPendiente() {
  try { localStorage.removeItem(CLAVE) } catch { /* */ }
  try { document.cookie = `${CLAVE}=; Max-Age=0; Path=/` } catch { /* */ }
}

/** Canjea lo que haya pendiente. Devuelve el viaje si lo consiguió. */
export async function canjearPendiente(): Promise<string | null> {
  const token = leerPendiente()
  if (!token) return null
  try {
    const res = await fetch('/api/invitacion', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    })
    const j = await res.json()
    if (res.ok) { olvidarPendiente(); return j.trip_id }
    // 401 significa que aún no hay sesión: se deja pendiente para más tarde.
    if (res.status !== 401) olvidarPendiente()
  } catch { /* sin red: se reintentará */ }
  return null
}
