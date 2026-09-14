'use client'
import { useEffect, useState } from 'react'
import { Copy, Check, Fingerprint, KeyRound } from 'lucide-react'

/* Pantalla de diagnóstico del bloqueo biométrico.
 *
 * Cuando algo falla solo en el móvil de otra persona, lo único que sirve es
 * que el propio aparato cuente qué ve. Esto recoge todo lo que condiciona a
 * WebAuthn y deja los errores completos —nombre y mensaje—, no un "no se
 * pudo" genérico. */

type Linea = { k: string; v: string; mal?: boolean }

export default function Diagnostico() {
  const [datos, setDatos] = useState<Linea[]>([])
  const [registro, setRegistro] = useState<string[]>([])
  const [copiado, setCopiado] = useState(false)

  useEffect(() => { recoger() }, [])

  async function recoger() {
    const l: Linea[] = []
    const add = (k: string, v: any, mal?: boolean) => l.push({ k, v: String(v), mal })

    add('URL', location.href)
    add('Dominio (rp.id)', location.hostname)
    add('Protocolo', location.protocol, location.protocol !== 'https:' && location.hostname !== 'localhost')
    add('Contexto seguro', window.isSecureContext, !window.isSecureContext)
    add('Instalada (standalone)',
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as any).standalone === true)
    add('API WebAuthn', !!window.PublicKeyCredential, !window.PublicKeyCredential)

    if (window.PublicKeyCredential) {
      try {
        const p = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
        add('Face ID / Touch ID disponible', p, !p)
      } catch (e: any) { add('Face ID / Touch ID disponible', 'error: ' + e?.message, true) }
      try {
        const c = await (PublicKeyCredential as any).isConditionalMediationAvailable?.()
        add('Mediación condicional', c ?? 'no soportado')
      } catch { add('Mediación condicional', 'no soportado') }
    }

    const cookies = document.cookie.split('; ').map(c => c.split('=')[0]).filter(Boolean)
    add('Cookies', cookies.join(', ') || '(ninguna)')
    add('Cookie tp_bio', cookies.includes('tp_bio') ? 'presente' : 'AUSENTE', !cookies.includes('tp_bio'))
    add('Sesión en cookie', cookies.some(c => c.startsWith('sb-')) ? 'sí' : 'no')
    try {
      add('Restos en localStorage', Object.keys(localStorage).filter(k => k.startsWith('sb-') || k.startsWith('tp')).join(', ') || '(ninguno)')
    } catch { add('Restos en localStorage', 'bloqueado') }
    add('Navegador', navigator.userAgent)
    setDatos(l)
  }

  function log(s: string) { setRegistro(r => [...r, s]) }

  async function probarCrear() {
    log('— Creando credencial…')
    try {
      const cred: any = await navigator.credentials.create({
        publicKey: {
          challenge: crypto.getRandomValues(new Uint8Array(32)).buffer,
          rp: { name: 'Travel Planner', id: location.hostname },
          user: { id: crypto.getRandomValues(new Uint8Array(16)).buffer, name: 'prueba', displayName: 'Prueba' },
          pubKeyCredParams: [{ type: 'public-key', alg: -7 }, { type: 'public-key', alg: -257 }],
          authenticatorSelection: {
            authenticatorAttachment: 'platform', userVerification: 'required', residentKey: 'preferred',
          },
          timeout: 60000, attestation: 'none',
        },
      })
      log('OK. Credencial creada. id=' + (cred?.id || '').slice(0, 16) + '…')
      log('transports: ' + JSON.stringify(cred?.response?.getTransports?.() ?? 'n/d'))
    } catch (e: any) {
      log('FALLO al crear → ' + e?.name + ': ' + e?.message)
    }
  }

  async function probarUsar() {
    log('— Pidiendo Face ID (sin lista de credenciales)…')
    try {
      const res: any = await navigator.credentials.get({
        publicKey: {
          challenge: crypto.getRandomValues(new Uint8Array(32)).buffer,
          rpId: location.hostname,
          userVerification: 'required',
          timeout: 60000,
        },
      })
      log('OK. Verificado. id=' + (res?.id || '').slice(0, 16) + '…')
    } catch (e: any) {
      log('FALLO al usar → ' + e?.name + ': ' + e?.message)
    }
  }

  const texto = datos.map(d => `${d.k}: ${d.v}`).join('\n') + '\n\n' + registro.join('\n')

  return (
    <div className="min-h-screen bg-slate-50 p-4">
      <div className="max-w-lg mx-auto space-y-4">
        <h1 className="text-xl font-bold text-slate-900">Diagnóstico de Face ID</h1>

        <div className="card p-4">
          <table className="w-full text-xs">
            <tbody>
              {datos.map((d, i) => (
                <tr key={i} className="border-b border-slate-100 last:border-0">
                  <td className="py-1.5 pr-3 text-slate-500 align-top whitespace-nowrap">{d.k}</td>
                  <td className={`py-1.5 font-mono break-all ${d.mal ? 'text-red-600 font-semibold' : 'text-slate-800'}`}>{d.v}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button onClick={probarCrear} className="btn-primary py-3 flex items-center justify-center gap-2">
            <KeyRound size={16} /> Probar crear
          </button>
          <button onClick={probarUsar} className="btn-secondary py-3 flex items-center justify-center gap-2">
            <Fingerprint size={16} /> Probar usar
          </button>
        </div>

        {registro.length > 0 && (
          <pre className="card p-4 text-xs whitespace-pre-wrap break-all text-slate-700">{registro.join('\n')}</pre>
        )}

        <button
          onClick={() => { navigator.clipboard.writeText(texto); setCopiado(true); setTimeout(() => setCopiado(false), 1500) }}
          className="btn-secondary w-full py-3 flex items-center justify-center gap-2">
          {copiado ? <Check size={16} /> : <Copy size={16} />} {copiado ? 'Copiado' : 'Copiar todo para enviar'}
        </button>
      </div>
    </div>
  )
}
