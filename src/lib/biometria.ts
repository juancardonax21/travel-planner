/* Bloqueo biométrico local con WebAuthn.
 *
 * No sustituye al login de Supabase: la sesión sigue siendo la suya. Esto es
 * una barrera de interfaz para que, con el móvil desbloqueado en la mano de
 * cualquiera, no se vea el itinerario ni los datos de pasaporte.
 *
 * Es deliberadamente local: la credencial se crea y se comprueba en el propio
 * dispositivo, sin servidor que valide la firma. Eso significa que alguien con
 * conocimientos y acceso al móvil podría saltárselo desde las herramientas de
 * desarrollo. Para lo que es —un planificador de viajes familiar— compensa;
 * para proteger de un atacante real haría falta verificación en servidor.
 */

const CLAVE = 'tp_bio'                 // cookie: iOS vacía el localStorage
const CLAVE_HASTA = 'tp_bio_hasta'     // esta sí puede ser de sesión
const MINUTOS_GRACIA = 5

/* La marca del bloqueo va en cookie y el middleware la renueva en cada
   navegación. En localStorage se perdía y el bloqueo desaparecía solo. */
function leerCookie(nombre: string): string | null {
  if (typeof document === 'undefined') return null
  const m = document.cookie.match(new RegExp('(?:^|; )' + nombre + '=([^;]*)'))
  return m ? decodeURIComponent(m[1]) : null
}
function escribirCookie(nombre: string, valor: string, segundos: number) {
  if (typeof document === 'undefined') return
  const seguro = location.protocol === 'https:' ? '; Secure' : ''
  document.cookie = `${nombre}=${encodeURIComponent(valor)}; Max-Age=${segundos}; Path=/; SameSite=Lax${seguro}`
}
function borrarCookie(nombre: string) {
  if (typeof document === 'undefined') return
  document.cookie = `${nombre}=; Max-Age=0; Path=/`
}

function b64(buf: ArrayBuffer): string {
  let bin = ''
  const bytes = new Uint8Array(buf)
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i])
  return btoa(bin)
}
function deB64(s: string): ArrayBuffer {
  const bin = atob(s)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out.buffer
}
function reto(): ArrayBuffer {
  return crypto.getRandomValues(new Uint8Array(32)).buffer
}
function idUsuario(): ArrayBuffer {
  return crypto.getRandomValues(new Uint8Array(16)).buffer
}

/** ¿Este dispositivo tiene Face ID, Touch ID o equivalente disponible? */
export async function hayBiometria(): Promise<boolean> {
  if (typeof window === 'undefined') return false
  if (!window.PublicKeyCredential || !window.isSecureContext) return false
  try {
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
  } catch {
    return false
  }
}

export function estaActivado(): boolean {
  return !!leerCookie(CLAVE)
}

export function desactivar() {
  borrarCookie(CLAVE)
  borrarCookie(CLAVE_HASTA)
}

/** Registra la credencial del dispositivo. Devuelve el error si no pudo. */
export async function activar(email: string): Promise<string | null> {
  try {
    const cred = await navigator.credentials.create({
      publicKey: {
        challenge: reto(),
        rp: { name: 'Travel Planner', id: location.hostname },
        user: {
          id: idUsuario(),
          name: email || 'viajero',
          displayName: email || 'Viajero',
        },
        pubKeyCredParams: [{ type: 'public-key', alg: -7 }, { type: 'public-key', alg: -257 }],
        authenticatorSelection: {
          authenticatorAttachment: 'platform',   // el sensor del propio móvil
          userVerification: 'required',          // exige Face ID, no solo presencia
          residentKey: 'preferred',
        },
        timeout: 60000,
        attestation: 'none',
      },
    }) as PublicKeyCredential | null
    if (!cred) return 'El dispositivo no devolvió ninguna credencial.'
    escribirCookie(CLAVE, b64(cred.rawId), 60 * 60 * 24 * 365)
    marcarDesbloqueado()
    return null
  } catch (e: any) {
    if (e?.name === 'NotAllowedError') return 'Se canceló la petición de Face ID.'
    return e?.message || 'No se pudo activar el bloqueo en este dispositivo.'
  }
}

/** Pide Face ID. true si se verificó. */
export async function desbloquear(): Promise<boolean> {
  const id = leerCookie(CLAVE)
  if (!id) return true
  try {
    const res = await navigator.credentials.get({
      publicKey: {
        challenge: reto(),
        rpId: location.hostname,
        allowCredentials: [{ type: 'public-key', id: deB64(id) }],
        userVerification: 'required',
        timeout: 60000,
      },
    })
    if (!res) return false
    marcarDesbloqueado()
    return true
  } catch {
    return false
  }
}

/** Tras desbloquear se da un margen para no pedirlo en cada navegación. */
function marcarDesbloqueado() {
  escribirCookie(CLAVE_HASTA, String(Date.now() + MINUTOS_GRACIA * 60000), MINUTOS_GRACIA * 60)
}

export function dentroDeGracia(): boolean {
  return Date.now() < Number(leerCookie(CLAVE_HASTA) || 0)
}
