'use client'
import { useState } from 'react'
import { Upload, Sparkles, X, FileText, AlertTriangle } from 'lucide-react'

const SYSTEM_PROMPT = [
  'Eres un asistente que extrae datos de billetes y reservas de viaje.',
  '',
  'REGLAS IMPORTANTES:',
  '1. Si el billete contiene IDA Y VUELTA, devuelve un ARRAY con DOS objetos separados: primero el vuelo de ida, luego el de vuelta.',
  '2. Si es solo IDA, devuelve un ARRAY con UN objeto.',
  '3. Cada vuelo puede tener MAXIMO 2 escalas (3 segmentos). Si hay mas, incluye solo los del trayecto de ese vuelo.',
  '4. num_stops = numero de escalas (0=directo, 1=una escala, 2=dos escalas).',
  '',
  'ESTRUCTURA (devuelve siempre un array JSON):',
  '[{"category":"flight","title":"Vuelo ORIGEN-DESTINO","event_date":"YYYY-MM-DD","time":"HH:MM","cost":0,"currency":"EUR","paid":false,"num_stops":1,"flight_segments":[{"from":"MAD","to":"DOH","flight_number":"QR6949","airline":"Qatar Airways","dep_time":"15:55","arr_time":"00:40","arr_date":"2026-12-25","terminal_dep":"4S","terminal_arr":""},{"from":"DOH","to":"NRT","flight_number":"QR806","airline":"Qatar Airways","dep_time":"02:15","arr_time":"17:55","arr_date":"2026-12-25","terminal_dep":"","terminal_arr":"2"}]}]',
  '',
  'Si hay precio en el billete, ponlo en el primer vuelo. El segundo vuelo lleva cost:0.',
  'Fechas YYYY-MM-DD, horas HH:MM 24h. SOLO el array JSON sin explicaciones ni markdown.',
].join('\n')

type Props = {
  tripDay: string
  onExtracted: (data: any) => void
  onClose: () => void
}

export default function DocumentScanner({ tripDay, onExtracted, onClose }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [preview, setPreview] = useState<string | null>(null)
  const [fileType, setFileType] = useState<'image' | 'pdf' | null>(null)

  async function handleFile(file: File) {
    setError('')
    setPreview(null)
    const isPDF = file.type === 'application/pdf'
    const isImage = file.type.startsWith('image/')
    if (!isPDF && !isImage) { setError('Solo se admiten imágenes o PDFs'); return }
    setFileType(isPDF ? 'pdf' : 'image')
    if (isImage) setPreview(URL.createObjectURL(file))
    setLoading(true)
    try {
      const base64 = await new Promise<string>((res, rej) => {
        const r = new FileReader()
        r.onload = () => res((r.result as string).split(',')[1])
        r.onerror = () => rej(new Error('Error leyendo archivo'))
        r.readAsDataURL(file)
      })

      const contentBlock = isPDF
        ? { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: base64 } }
        : { type: 'image', source: { type: 'base64', media_type: file.type, data: base64 } }

      const apiKey = process.env.NEXT_PUBLIC_ANTHROPIC_API_KEY
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey!,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 1500,
          system: SYSTEM_PROMPT,
          messages: [{ role: 'user', content: [
            contentBlock,
            { type: 'text', text: 'Extrae los datos. Fecha aproximada del viaje: ' + tripDay + '. Devuelve SOLO el array JSON.' }
          ]}]
        })
      })

      const data = await response.json()
      const text = data.content?.find((b: any) => b.type === 'text')?.text || ''
      const clean = text.replace(/```json|```/g, '').trim()
      const parsed = JSON.parse(clean)
      const result = Array.isArray(parsed) ? parsed : [parsed]
      onExtracted(result)
    } catch (e: any) {
      setError('No se pudo analizar el documento. Inténtalo de nuevo.')
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-violet-100 rounded-xl flex items-center justify-center">
              <Sparkles size={16} className="text-violet-600" strokeWidth={2} />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800 text-sm">Escanear documento</h3>
              <p className="text-xs text-slate-400">La IA extraerá los datos automáticamente</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-300 hover:text-slate-500 transition-colors">
            <X size={20} />
          </button>
        </div>
        <div className="p-4 space-y-4">
          <label className="w-full border-2 border-dashed border-slate-200 hover:border-violet-300 hover:bg-violet-50/50 rounded-2xl p-8 flex flex-col items-center gap-3 transition-all cursor-pointer">
            <input type="file" accept="image/*,.pdf" className="hidden"
              onChange={e => { if (e.target.files?.[0]) handleFile(e.target.files[0]) }} />
            {loading ? (
              <>
                <div className="w-10 h-10 rounded-full border-2 border-violet-300 border-t-violet-600 animate-spin" />
                <p className="text-sm text-slate-500">Analizando documento...</p>
              </>
            ) : preview ? (
              <>
                <img src={preview} alt="preview" className="max-h-32 rounded-xl object-contain" />
                <p className="text-xs text-slate-400">Pulsa para cambiar</p>
              </>
            ) : (
              <>
                <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center">
                  {fileType === 'pdf' ? <FileText size={24} className="text-slate-400" /> : <Upload size={24} className="text-slate-400" />}
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-slate-700">Sube tu billete o reserva</p>
                  <p className="text-xs text-slate-400 mt-1">JPG, PNG o PDF</p>
                </div>
              </>
            )}
          </label>
          <div className="flex flex-wrap gap-2">
            {['✈️ Vuelos', '🏨 Hoteles', '🎡 Entradas', '🚌 Transporte', '🍽️ Restaurantes'].map(t => (
              <span key={t} className="text-xs bg-slate-100 text-slate-500 px-2 py-1 rounded-lg">{t}</span>
            ))}
          </div>
          {error && (
            <div className="flex items-center gap-2 text-red-600 bg-red-50 border border-red-200 rounded-xl p-3 text-sm">
              <AlertTriangle size={14} strokeWidth={2} /> {error}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
