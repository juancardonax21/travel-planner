'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { UserPlus, LogIn } from 'lucide-react'
import { guardarPendiente, olvidarPendiente } from '@/lib/invitacion'

/* Pantalla de invitación.
 *
 * Quien abre el enlace puede no tener cuenta, así que se entra por el alta y
 * no por el acceso: es el caso más frecuente. Los campos llevan los atributos
 * que el llavero necesita para ofrecer guardar la contraseña y rellenarla con
 * Face ID la próxima vez. */
export default function Invitacion({ params }: { params: { token: string } }) {
  const router = useRouter()
  const [modo, setModo] = useState<'alta' | 'acceso'>('alta')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState('')
  const [aviso, setAviso] = useState('')

  useEffect(() => {
    // Se apunta el código nada más abrir: si hay que confirmar el correo, la
    // persona sale de aquí y vuelve por otra puerta, y así no se pierde.
    guardarPendiente(params.token)
    supabase.auth.getUser().then(({ data }) => { if (data.user) canjear() })
  }, [])

  async function canjear() {
    const res = await fetch('/api/invitacion', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: params.token }),
    })
    const j = await res.json().catch(() => ({}))
    if (!res.ok) {
      setError((j.error || 'No se pudo aceptar la invitación.') + ` (${res.status})`)
      setCargando(false); return
    }
    olvidarPendiente()
    router.push(`/trips/${j.trip_id}/itinerary`)
  }

  async function enviar(e: React.FormEvent) {
    e.preventDefault()
    setCargando(true); setError(''); setAviso('')

    if (modo === 'alta') {
      const { data, error } = await supabase.auth.signUp({ email, password })
      if (error) { setError(traduce(error.message)); setCargando(false); return }
      // Si el proyecto exige confirmar el correo, no hay sesión todavía.
      if (!data.session) {
        setAviso('Cuenta creada. Te hemos enviado un correo para confirmarla: '
          + 'ábrelo y, al volver, el viaje ya estará esperándote.')
        setCargando(false); return
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) { setError(traduce(error.message)); setCargando(false); return }
    }
    await canjear()
  }

  return (
    <div className="min-h-screen gradient-hero flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-md">
        <div className="text-center mb-7">
          <div className="text-4xl mb-3">✈️</div>
          <h1 className="text-xl font-bold text-slate-900">Te han invitado a un viaje</h1>
          <p className="text-slate-500 text-sm mt-1">
            {modo === 'alta'
              ? 'Crea tu cuenta para verlo. Solo hace falta una vez.'
              : 'Entra con tu cuenta para verlo.'}
          </p>
        </div>

        <form onSubmit={enviar} className="space-y-4">
          <div>
            <label className="label" htmlFor="email">Email</label>
            <input className="input" id="email" name="email" type="email"
              autoComplete="username" autoCapitalize="none" autoCorrect="off" spellCheck={false}
              value={email} onChange={e => setEmail(e.target.value)}
              placeholder="tu@email.com" required />
          </div>
          <div>
            <label className="label" htmlFor="password">Contraseña</label>
            <input className="input" id="password" name="password" type="password"
              autoComplete={modo === 'alta' ? 'new-password' : 'current-password'}
              value={password} onChange={e => setPassword(e.target.value)}
              placeholder="••••••••" minLength={6} required />
            {modo === 'alta' && (
              <p className="text-xs text-slate-400 mt-1">Mínimo 6 caracteres. Guárdala en el llavero y no tendrás que volver a escribirla.</p>
            )}
          </div>

          {error && <p className="text-red-600 text-sm bg-red-50 p-3 rounded-xl">{error}</p>}
          {aviso && <p className="text-blue-700 text-sm bg-blue-50 p-3 rounded-xl">{aviso}</p>}

          <button type="submit" disabled={cargando}
            className="btn-primary w-full py-3 text-base disabled:opacity-50 flex items-center justify-center gap-2">
            {modo === 'alta' ? <UserPlus size={17} /> : <LogIn size={17} />}
            {cargando ? 'Un momento...' : modo === 'alta' ? 'Crear cuenta y ver el viaje' : 'Entrar y ver el viaje'}
          </button>
        </form>

        <button onClick={() => { setModo(modo === 'alta' ? 'acceso' : 'alta'); setError('') }}
          className="w-full text-center text-sm text-slate-500 hover:text-slate-700 mt-4">
          {modo === 'alta' ? '¿Ya tienes cuenta? Entra' : '¿No tienes cuenta? Créala'}
        </button>
      </div>
    </div>
  )
}

function traduce(m: string): string {
  if (/already registered/i.test(m)) return 'Ese correo ya tiene cuenta. Entra con ella.'
  if (/invalid login credentials/i.test(m)) return 'El correo o la contraseña no son correctos.'
  if (/at least 6/i.test(m)) return 'La contraseña necesita al menos 6 caracteres.'
  return m
}
