'use client'
import { useEffect, useState } from 'react'
import { Share2, Copy, Check, Trash2, Users } from 'lucide-react'
import { supabase } from '@/lib/supabase'

/* Enlace de invitación al viaje. Quien lo abra podrá darse de alta con su
   propio correo y quedará con acceso. Es revocable. */
export default function CompartirViaje({ tripId }: { tripId: string }) {
  const [token, setToken] = useState<string | null>(null)
  const [gente, setGente] = useState(0)
  const [copiado, setCopiado] = useState(false)
  const [ocupado, setOcupado] = useState(false)

  useEffect(() => { cargar() }, [tripId])

  async function cargar() {
    const { data: inv } = await supabase.from('trip_invitations')
      .select('token').eq('trip_id', tripId).eq('revoked', false).limit(1)
    setToken(inv?.[0]?.token ?? null)
    const { count } = await supabase.from('trip_access')
      .select('user_id', { count: 'exact', head: true }).eq('trip_id', tripId)
    setGente(count ?? 0)
  }

  async function crear() {
    setOcupado(true)
    const { data: u } = await supabase.auth.getUser()
    const nuevo = crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '').slice(0, 8)
    const { error } = await supabase.from('trip_invitations')
      .insert({ token: nuevo, trip_id: tripId, created_by: u.user?.id })
    if (!error) setToken(nuevo)
    setOcupado(false)
  }

  async function revocar() {
    if (!token) return
    setOcupado(true)
    await supabase.from('trip_invitations').update({ revoked: true }).eq('token', token)
    setToken(null); setOcupado(false)
  }

  const enlace = token ? `${typeof window !== 'undefined' ? location.origin : ''}/invitacion/${token}` : ''

  return (
    <div className="card p-6 mb-4">
      <h2 className="font-semibold text-slate-800 mb-2 flex items-center gap-2">
        <Share2 size={16} strokeWidth={1.8} className="text-slate-400" /> Compartir el viaje
      </h2>
      <p className="text-sm text-slate-500 mb-4">
        Manda este enlace a quien quieras. Al abrirlo creará su cuenta con su
        correo y verá el viaje: cada uno con la suya, sin repartir contraseñas.
      </p>

      {gente > 1 && (
        <p className="text-xs text-slate-500 mb-3 flex items-center gap-1.5">
          <Users size={12} strokeWidth={1.8} /> {gente} personas con acceso
        </p>
      )}

      {token ? (
        <div className="space-y-2">
          <div className="flex gap-2">
            <input readOnly value={enlace} onFocus={e => e.currentTarget.select()}
              className="input font-mono text-xs flex-1" />
            <button onClick={() => { navigator.clipboard.writeText(enlace); setCopiado(true); setTimeout(() => setCopiado(false), 1500) }}
              className="btn-primary px-4 flex items-center gap-1.5">
              {copiado ? <Check size={15} /> : <Copy size={15} />}
            </button>
          </div>
          <button onClick={revocar} disabled={ocupado}
            className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1.5 disabled:opacity-50">
            <Trash2 size={12} /> Anular este enlace
          </button>
        </div>
      ) : (
        <button onClick={crear} disabled={ocupado}
          className="btn-secondary w-full py-3 flex items-center justify-center gap-2 disabled:opacity-50">
          <Share2 size={16} /> {ocupado ? 'Creando...' : 'Crear enlace de invitación'}
        </button>
      )}
    </div>
  )
}
