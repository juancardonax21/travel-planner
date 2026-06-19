'use client'
import { useState } from 'react'
import { Upload, Sparkles, X, FileText, AlertTriangle } from 'lucide-react'

// SYSTEM_PROMPT moved to server API route
const _UNUSED = `placeholder, reservas y documentos de viaje.
Analiza el documento y devuelve ÚNICAMENTE un objeto JSON válido (sin markdown, sin texto adicional) con esta estructura exacta según el tipo de documento:

PARA VUELOS (category: "flight"):
{
  "category": "flight",
  "title": "Vuelo [ORIGEN]-[DESTINO]",
  "event_date": "YYYY-MM-DD",
  "time": "HH:MM",
  "cost": 0,
  "currency": "EUR",
  "paid": false,
  "ticket_url": "",
  "insurance_url": "",
  "num_stops": 0,
  "flight_segments": [
    {
      "from": "MAD",
      "to": "LIS",
      "flight_number": "TP1023",
      "airline": "TAP Air Portugal",
      "dep_time": "07:40",
      "arr_time": "08:05",
      "arr_date": "YYYY-MM-DD o vacío si mismo día",
      "terminal_dep": "T2",
      "terminal_arr": "T1"
    }
  ]
}

PARA ALOJAMIENTO (category: "hotel"):
{
  "category": "hotel",
  "title": "Nombre del alojamiento",
  "event_date": "YYYY-MM-DD",
  "time": "15:00",
  "cost": 0,
  "currency": "EUR",
  "paid": false,
  "accom_type": "hotel|apartamento|airbnb|hostal|otro",
  "accom_booking_ref": "",
  "accom_pin": "",
  "accom_checkin_date": "YYYY-MM-DD",
  "accom_checkin_time": "HH:MM",
  "accom_checkout_date": "YYYY-MM-DD",
  "accom_checkout_time": "HH:MM",
  "accom_guests_adults": 2,
  "accom_guests_children": 0,
  "accom_address": "",
  "accom_web": "",
  "accom_cancel_date": "",
  "accom_cancel_fee": "",
  "accom_wifi": false,
  "accom_breakfast": false,
  "accom_parking_included": false,
  "accom_pool": false,
  "accom_ac": false
}

PARA ACTIVIDADES/ENTRADAS (category: "activity"):
{
  "category": "activity",
  "title": "Nombre de la actividad",
  "event_date": "YYYY-MM-DD",
  "time": "HH:MM",
  "end_time": "HH:MM",
  "cost": 0,
  "currency": "EUR",
  "paid": false,
  "location": "",
  "ticket_url": "",
  "note": ""
}

PARA TRANSPORTE (category: "transport"):
{
  "category": "transport",
  "title": "Descripción del transporte",
  "event_date": "YYYY-MM-DD",
  "time": "HH:MM",
  "end_time": "HH:MM",
  "cost": 0,
  "currency": "EUR",
  "paid": false,
  "location": "",
  "note": ""
}

PARA RESTAURANTES/COMIDAS (category: "meal"):
{
  "category": "meal",
  "title": "Nombre del restaurante",
  "event_date": "YYYY-MM-DD",
  "time": "HH:MM",
  "cost": 0,
  "currency": "EUR",
  "paid": false,
  "location": "",
  "note": ""
}

Reglas:
- Fechas siempre en formato YYYY-MM-DD
- Horas siempre en formato HH:MM (24h)
- Si no encuentras un dato, deja el valor vacío "" o 0
- Para vuelos con escalas, incluye todos los segmentos en flight_segments
- num_stops = número de escalas (0 = directo, 1 = una escala, etc.)
- Si el precio no aparece, pon 0
- Devuelve SOLO el JSON, sin explicaciones`

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
    if (!isPDF && !isImage) {
      setError('Solo se admiten imágenes (JPG, PNG) o PDFs')
      return
    }
    setFileType(isPDF ? 'pdf' : 'image')
    if (isImage) {
      setPreview(URL.createObjectURL(file))
    }
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

      const response = await fetch('/api/scan-document', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileBase64: base64, fileType: file.type, tripDay })
      })
      const result = await response.json()
      if (!result.ok) throw new Error(result.error || 'Error del servidor')
      onExtracted(result.data)
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
        {/* Header */}
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

        {/* Body */}
        <div className="p-4 space-y-4">
          {/* Drop zone */}
          <label
            className="w-full border-2 border-dashed border-slate-200 hover:border-violet-300 hover:bg-violet-50/50 rounded-2xl p-8 flex flex-col items-center gap-3 transition-all cursor-pointer">
            <input type="file" accept="image/*,.pdf" className="hidden"
              onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
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
                  {fileType === 'pdf'
                    ? <FileText size={24} className="text-slate-400" />
                    : <Upload size={24} className="text-slate-400" />
                  }
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-slate-700">Sube tu billete o reserva</p>
                  <p className="text-xs text-slate-400 mt-1">JPG, PNG o PDF</p>
                </div>
              </>
            )}
          </label>

          {/* Supported types */}
          <div className="flex flex-wrap gap-2">
            {['✈️ Billetes de avión', '🏨 Reservas hotel', '🎡 Entradas', '🚌 Transporte', '🍽️ Restaurantes'].map(t => (
              <span key={t} className="text-xs bg-slate-100 text-slate-500 px-2 py-1 rounded-lg">{t}</span>
            ))}
          </div>

          {error && (
            <div className="flex items-center gap-2 text-red-600 bg-red-50 border border-red-200 rounded-xl p-3 text-sm">
              <AlertTriangle size={14} strokeWidth={2} />
              {error}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
