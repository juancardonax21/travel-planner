'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

const MINIMO = 8

/* Fija una contraseña nueva. Llega aquí quien viene del enlace de recuperación
 * —el callback ya le dejó la sesión puesta— y también quien ya está dentro y
 * quiere cambiarla. En ambos casos hace falta sesión: sin ella, a recuperar. */

export default function ContrasenaPage() {
  const [comprobando, setComprobando] = useState(true)
  const [password, setPassword] = useState('')
  const [repetida, setRepetida] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [hecho, setHecho] = useState(false)
  const router = useRouter()

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) { router.replace('/recuperar'); return }
      setComprobando(false)
    })
  }, [router])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password.length < MINIMO) { setError(`La contraseña necesita al menos ${MINIMO} caracteres.`); return }
    if (password !== repetida) { setError('Las dos contraseñas no coinciden.'); return }

    setLoading(true); setError('')
    const { error } = await supabase.auth.updateUser({ password })
    if (error) { setError(error.message); setLoading(false); return }

    setHecho(true); setLoading(false)
    setTimeout(() => router.push('/trips'), 1500)
  }

  if (comprobando) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-slate-400 animate-pulse">Cargando...</div>
    </div>
  )

  return (
    <div className="min-h-screen gradient-hero flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🔒</div>
          <h1 className="text-2xl font-bold text-slate-900">Nueva contraseña</h1>
          <p className="text-slate-500 text-sm mt-1">
            {hecho ? 'Guardada' : `Al menos ${MINIMO} caracteres`}
          </p>
        </div>

        {hecho ? (
          <p className="text-sm text-emerald-700 bg-emerald-50 p-4 rounded-xl text-center">
            Listo. Entrando en tus viajes...
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label" htmlFor="password">Contraseña</label>
              <input className="input" id="password" name="password" type="password"
                autoComplete="new-password"
                value={password}
                onChange={e => setPassword(e.target.value)} placeholder="••••••••" required />
            </div>
            <div>
              <label className="label" htmlFor="repetida">Repítela</label>
              <input className="input" id="repetida" name="repetida" type="password"
                autoComplete="new-password"
                value={repetida}
                onChange={e => setRepetida(e.target.value)} placeholder="••••••••" required />
            </div>
            {error && <p className="text-red-500 text-sm bg-red-50 p-3 rounded-lg">{error}</p>}
            <button type="submit" disabled={loading}
              className="btn-primary w-full py-3 text-base disabled:opacity-50">
              {loading ? 'Guardando...' : 'Guardar'}
            </button>
            <Link href="/trips"
              className="block text-center text-sm text-slate-500 hover:text-slate-700">
              Dejarlo como está
            </Link>
          </form>
        )}
      </div>
    </div>
  )
}
