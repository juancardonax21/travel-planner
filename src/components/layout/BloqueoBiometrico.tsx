'use client'
import { useEffect, useState } from 'react'
import { Lock, Fingerprint } from 'lucide-react'
import { estaActivado, dentroDeGracia, desbloquear } from '@/lib/biometria'

/* Tapa la aplicación hasta que se verifica con Face ID. Solo actúa si el
   bloqueo está activado en este dispositivo; si no, no estorba. */
export default function BloqueoBiometrico() {
  const [estado, setEstado] = useState<'comprobando' | 'bloqueado' | 'abierto'>('comprobando')
  const [fallo, setFallo] = useState(false)

  useEffect(() => {
    if (!estaActivado() || dentroDeGracia()) { setEstado('abierto'); return }
    setEstado('bloqueado')
    intentar()
  }, [])

  async function intentar() {
    setFallo(false)
    const ok = await desbloquear()
    if (ok) setEstado('abierto')
    else setFallo(true)
  }

  // Se superpone en vez de envolver la app: así el servidor sigue enviando
  // el contenido y un fallo de JavaScript no deja la pantalla en blanco.
  if (estado !== 'bloqueado') return null

  return (
    <div className="fixed inset-0 z-[70] gradient-hero flex items-center justify-center p-6">
      <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-sm text-center">
        <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-4">
          <Lock size={24} strokeWidth={1.8} />
        </div>
        <h1 className="text-lg font-bold text-slate-900">Travel Planner está bloqueado</h1>
        <p className="text-slate-500 text-sm mt-1 mb-6">
          {fallo ? 'No se pudo verificar. Inténtalo otra vez.' : 'Verifica tu identidad para continuar.'}
        </p>
        <button onClick={intentar}
          className="btn-primary w-full py-3 flex items-center justify-center gap-2">
          <Fingerprint size={17} strokeWidth={2} /> Desbloquear
        </button>
      </div>
    </div>
  )
}
