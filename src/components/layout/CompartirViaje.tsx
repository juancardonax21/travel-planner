'use client'
import { useEffect, useState } from 'react'
import { Share2, Copy, Check, Trash2, Users, Eye, EyeOff, UserMinus } from 'lucide-react'
import { supabase } from '@/lib/supabase'

/* Enlace de invitación al viaje. Quien lo abra podrá darse de alta con su
   propio correo y quedará con acceso. Es revocable. */
export default function CompartirViaje({ tripId }: { tripId: string }) {
  type Miembro = { user_id: string; email: string; role: string; soyYo: boolean }
  const [token, setToken] = useState<string | null>(null)
  const [gente, setGente] = useState<Miembro[]>([])
  const [copiado, setCopiado] = useState(false)
  const [ocupado, setOcupado] = useState(false)

  useEffect(() => { cargar() }, [tripId])

  async function cargar() {
    const { data: inv } = await supabase.from('trip_invitations')
      .select('token').eq('trip_id', tripId).eq('revoked', false).limit(1)
    setToken(inv?.[0]?.token ?? null)
    const res = await fetch(`/api/miembros?trip=${tripId}`)
    if (res.ok) setGente((await res.json()).miembros || [])
  }

  async function cambiarPapel(m: Miembro) {
    setOcupado(true)
    await fetch('/api/miembros', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ trip: tripId, user_id: m.user_id,
        role: m.role === 'sin_costes' ? 'member' : 'sin_costes' }),
    })
    await cargar(); setOcupado(false)
  }

  async function retirar(m: Miembro) {
    if (!confirm(`¿Retirar el acceso de ${m.email}?`)) return
    setOcupado(true)
    await fetch('/api/miembros', {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ trip: tripId, user_id: m.user_id }),
    })
    await cargar(); setOcupado(false)
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

      {gente.filter(m => !m.soyYo).length > 0 && (
        <div className="mb-4 space-y-2">
          <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide flex items-center gap-1.5">
            <Users size={12} strokeWidth={2} /> Quién tiene acceso
          </p>
          {gente.filter(m => !m.soyYo).map(m => (
            <div key={m.user_id} className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
              <span className="text-sm text-slate-700 truncate flex-1 min-w-0">{m.email}</span>
              <button onClick={() => cambiarPapel(m)} disabled={ocupado}
                title={m.role === 'sin_costes' ? 'Ahora no ve los precios' : 'Ahora lo ve todo'}
                className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border transition-all disabled:opacity-50 ${
                  m.role === 'sin_costes'
                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                    : 'bg-white text-slate-600 border-slate-200'
                }`}>
                {m.role === 'sin_costes' ? <EyeOff size={12} /> : <Eye size={12} />}
                {m.role === 'sin_costes' ? 'Sin precios' : 'Todo'}
              </button>
              <button onClick={() => retirar(m)} disabled={ocupado}
                className="text-slate-300 hover:text-red-500 p-1 disabled:opacity-50" title="Retirar acceso">
                <UserMinus size={14} />
              </button>
            </div>
          ))}
        </div>
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
