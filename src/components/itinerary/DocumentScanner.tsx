'use client'
import { useState } from 'react'
import { Upload, Sparkles, X, FileText, AlertTriangle, Plane, BedDouble, Ticket, Car, UtensilsCrossed } from 'lucide-react'

const PROMPT_CLASSIFY = [
  'Analiza este documento de viaje y responde SOLO con una de estas palabras, sin nada más:',
  'flight   → si es un billete de avión',
  'hotel    → si es una reserva de alojamiento (hotel, apartamento, villa, hostal, airbnb)',
  'activity → si es una entrada o reserva de actividad, tour, excursión o restaurante',
  'transport → si es un billete de tren, bus, ferry o alquiler de coche',
  'Solo la palabra, sin puntos ni explicaciones.',
].join('\n')

const PROMPT_FLIGHT = [
  'Extrae los datos de este billete de avión. Devuelve SOLO un array JSON, sin markdown.',
  '',
  'REGLAS:',
  '- Si contiene IDA Y VUELTA: array con DOS objetos (ida primero, vuelta segundo)',
  '- Si es solo IDA: array con UN objeto',
  '- Cada vuelo máximo 2 escalas (3 segmentos). num_stops = número de escalas',
  '- El precio va en el primer vuelo. El vuelo de vuelta lleva cost:0',
  '',
  'ESTRUCTURA:',
  '[{"category":"flight","title":"Vuelo MAD-NRT","event_date":"YYYY-MM-DD","time":"HH:MM","cost":0,"currency":"EUR","paid":false,"num_stops":1,"flight_segments":[{"from":"MAD","to":"DOH","flight_number":"QR6949","airline":"Qatar Airways","dep_time":"15:55","arr_time":"00:40","arr_date":"2026-12-25","terminal_dep":"4S","terminal_arr":""}]}]',
  '',
  'Fechas YYYY-MM-DD, horas HH:MM en 24h. SOLO el array JSON.',
].join('\n')

const PROMPT_HOTEL = [
  'Extrae los datos de esta reserva de alojamiento. Devuelve SOLO un array JSON con UN objeto, sin markdown.',
  '',
  'ESTRUCTURA:',
  '[{"category":"hotel","title":"Nombre del alojamiento","event_date":"YYYY-MM-DD","time":"15:00","checkout_date":"YYYY-MM-DD","cost":0,"currency":"EUR","paid":false,"location":"dirección o ciudad","confirmation_number":"número de reserva"}]',
  '',
  'event_date = fecha de CHECK-IN. checkout_date = fecha de CHECK-OUT.',
  'time = hora de check-in si aparece, si no pon "15:00".',
  'Fechas YYYY-MM-DD. SOLO el array JSON.',
].join('\n')

const PROMPT_ACTIVITY = [
  'Extrae los datos de esta entrada o reserva de actividad. Devuelve SOLO un array JSON con UN objeto, sin markdown.',
  '',
  'ESTRUCTURA:',
  '[{"category":"activity","title":"Nombre de la actividad","event_date":"YYYY-MM-DD","time":"HH:MM","cost":0,"currency":"EUR","paid":false,"location":"lugar"}]',
  '',
  'Fechas YYYY-MM-DD, horas HH:MM en 24h. SOLO el array JSON.',
].join('\n')

const PROMPT_TRANSPORT = [
  'Extrae los datos de este billete de transporte. Devuelve SOLO un array JSON con UN objeto, sin markdown.',
  '',
  'ESTRUCTURA:',
  '[{"category":"transport","title":"Descripción del transporte","event_date":"YYYY-MM-DD","time":"HH:MM","cost":0,"currency":"EUR","paid":false,"location":"origen → destino"}]',
  '',
  'Fechas YYYY-MM-DD, horas HH:MM en 24h. SOLO el array JSON.',
].join('\n')

const PROMPTS: Record<string, string> = {
  flight: PROMPT_FLIGHT,
  hotel: PROMPT_HOTEL,
  activity: PROMPT_ACTIVITY,
  transport: PROMPT_TRANSPORT,
}

type Props = {
  tripDay: string
  onExtracted: (data: any) => void
  onClose: () => void
}

export default function DocumentScanner({ tripDay, onExtracted, onClose }: Props) {
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const [preview, setPreview] = useState<string | null>(null)

  async function callHaiku(system: string, contentBlock: any, userText: string) {
    const apiKey = process.env.NEXT_PUBLIC_ANTHROPIC_API_KEY
    const res = await fetch('https://api.anthropic.com/v1/messages', {
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
        system,
        messages: [{ role: 'user', content: [contentBlock, { type: 'text', text: userText }] }]
      })
    })
    const data = await res.json()
    return data.content?.find((b: any) => b.type === 'text')?.text?.trim() || ''
  }

  async function handleFile(file: File) {
    setError('')
    setPreview(null)
    const isPDF = file.type === 'application/pdf'
    const isImage = file.type.startsWith('image/')
    if (!isPDF && !isImage) { setError('Solo se admiten imágenes o PDFs'); return }
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

      // Step 1: classify
      setStatus('Identificando tipo de documento...')
      const docType = await callHaiku(
        PROMPT_CLASSIFY,
        contentBlock,
        'Clasifica este documento.'
      )
      const cleanType = docType.toLowerCase().replace(/[^a-z]/g, '')
      const matchedType = ['flight', 'hotel', 'activity', 'transport'].find(t => cleanType.includes(t)) || 'activity'

      const typeLabels: Record<string, string> = {
        flight: 'vuelo', hotel: 'alojamiento', activity: 'actividad', transport: 'transporte'
      }
      setStatus(`Detectado: ${typeLabels[matchedType]}. Extrayendo datos...`)

      // Step 2: extract with specific prompt
      const extractPrompt = PROMPTS[matchedType]
      const raw = await callHaiku(
        extractPrompt,
        contentBlock,
        `Extrae los datos. Fecha aproximada del viaje: ${tripDay}.`
      )

      const clean = raw.replace(/```json|```/g, '').trim()
      const parsed = JSON.parse(clean)
      const result = Array.isArray(parsed) ? parsed : [parsed]
      onExtracted(result)
    } catch (e: any) {
      console.error(e)
      setError('No se pudo analizar el documento. Inténtalo de nuevo.')
    } finally {
      setLoading(false)
      setStatus('')
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
                <p className="text-sm text-slate-500 text-center">{status || 'Analizando...'}</p>
              </>
            ) : preview ? (
              <>
                <img src={preview} alt="preview" className="max-h-32 rounded-xl object-contain" />
                <p className="text-xs text-slate-400">Pulsa para cambiar</p>
              </>
            ) : (
              <>
                <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center">
                  <Upload size={24} className="text-slate-400" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-slate-700">Sube tu billete o reserva</p>
                  <p className="text-xs text-slate-400 mt-1">JPG, PNG o PDF</p>
                </div>
              </>
            )}
          </label>
          <div className="flex flex-wrap gap-2">
            {([
              { label: 'Vuelos', Icon: Plane },
              { label: 'Hoteles', Icon: BedDouble },
              { label: 'Entradas', Icon: Ticket },
              { label: 'Transporte', Icon: Car },
              { label: 'Restaurantes', Icon: UtensilsCrossed },
            ] as {label:string;Icon:any}[]).map(({ label, Icon }) => (
              <span key={label} className="inline-flex items-center gap-1 text-xs bg-slate-100 text-slate-500 px-2 py-1 rounded-lg">
                <Icon size={11} strokeWidth={1.8} /> {label}
              </span>
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
