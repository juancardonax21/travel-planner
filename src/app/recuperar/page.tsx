'use client'
import { useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

export default function RecuperarPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [enviado, setEnviado] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError('')

    const destino = `${window.location.origin}/auth/callback?next=/cuenta/contrasena`
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: destino })

    // Un correo que no existe no se delata: la respuesta es la misma.
    if (error) { setError(error.message); setLoading(false); return }
    setEnviado(true); setLoading(false)
  }

  return (
    <div className="min-h-screen gradient-hero flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🔑</div>
          <h1 className="text-2xl font-bold text-slate-900">Recuperar la contraseña</h1>
          <p className="text-slate-500 text-sm mt-1">
            {enviado
              ? 'Mira tu correo'
              : 'Te mandamos un enlace para poner una nueva'}
          </p>
        </div>

        {enviado ? (
          <div className="space-y-4">
            <p className="text-sm text-slate-600 bg-slate-50 p-4 rounded-xl">
              Si <span className="font-medium">{email}</span> tiene cuenta, le acaba de llegar un
              enlace. Caduca en una hora y solo sirve una vez. Ábrelo en este mismo navegador: el
              enlace se abre donde lo pediste.
            </p>
            <Link href="/login" className="btn-primary w-full py-3 text-base block text-center">
              Volver a entrar
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label" htmlFor="email">Email</label>
              <input className="input" id="email" name="email" type="email"
                autoComplete="username" autoCapitalize="none" autoCorrect="off" spellCheck={false}
                value={email}
                onChange={e => setEmail(e.target.value)} placeholder="tu@email.com" required />
            </div>
            {error && <p className="text-red-500 text-sm bg-red-50 p-3 rounded-lg">{error}</p>}
            <button type="submit" disabled={loading}
              className="btn-primary w-full py-3 text-base disabled:opacity-50">
              {loading ? 'Enviando...' : 'Enviar el enlace'}
            </button>
            <Link href="/login"
              className="block text-center text-sm text-slate-500 hover:text-slate-700">
              Volver a entrar
            </Link>
          </form>
        )}
      </div>
    </div>
  )
}
