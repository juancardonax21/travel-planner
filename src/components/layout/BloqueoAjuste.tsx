'use client'
import { useEffect, useState } from 'react'
import { Fingerprint, ShieldCheck } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { hayBiometria, estaActivado, activar, desactivar } from '@/lib/biometria'

/* Interruptor del bloqueo biométrico. Se esconde si el dispositivo no lo
   soporta, en vez de ofrecer algo que va a fallar. */
export default function BloqueoAjuste() {
  const [soportado, setSoportado] = useState<boolean | null>(null)
  const [activo, setActivo] = useState(false)
  const [error, setError] = useState('')
  const [ocupado, setOcupado] = useState(false)

  useEffect(() => {
    hayBiometria().then(setSoportado)
    setActivo(estaActivado())
  }, [])

  if (soportado === null) return null
  if (!soportado) {
    return (
      <div className="card p-6 mb-4">
        <h2 className="font-semibold text-slate-800 mb-2 flex items-center gap-2">
          <Fingerprint size={16} strokeWidth={1.8} className="text-slate-400" /> Bloqueo biométrico
        </h2>
        <p className="text-sm text-slate-500">
          Este dispositivo o navegador no ofrece Face ID ni huella para páginas web.
          Pruébalo desde el iPhone, con la app abierta por HTTPS.
        </p>
      </div>
    )
  }

  async function alternar() {
    setError(''); setOcupado(true)
    if (activo) {
      desactivar(); setActivo(false); setOcupado(false); return
    }
    const { data } = await supabase.auth.getUser()
    const err = await activar(data.user?.email || '')
    if (err) setError(err); else setActivo(true)
    setOcupado(false)
  }

  return (
    <div className="card p-6 mb-4">
      <h2 className="font-semibold text-slate-800 mb-2 flex items-center gap-2">
        <Fingerprint size={16} strokeWidth={1.8} className="text-slate-400" /> Bloqueo biométrico
      </h2>
      <p className="text-sm text-slate-500 mb-4">
        Pide Face ID al abrir la app, también desde el icono de la pantalla de inicio.
        Es una barrera para que nadie que coja el móvil desbloqueado vea el viaje;
        no sustituye a tu contraseña.
      </p>
      {error && <p className="text-sm text-red-600 bg-red-50 p-3 rounded-xl mb-3">{error}</p>}
      <button onClick={alternar} disabled={ocupado}
        className={`w-full py-3 rounded-xl font-medium flex items-center justify-center gap-2 border transition-all disabled:opacity-50 ${
          activo ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                 : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
        }`}>
        {activo ? <ShieldCheck size={17} strokeWidth={2} /> : <Fingerprint size={17} strokeWidth={2} />}
        {ocupado ? 'Un momento...' : activo ? 'Activado · tocar para quitar' : 'Activar Face ID'}
      </button>
    </div>
  )
}
