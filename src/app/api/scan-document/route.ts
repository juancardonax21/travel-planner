import { NextRequest, NextResponse } from 'next/server'

const SYSTEM_PROMPT = `Eres un asistente que extrae datos de billetes, reservas y documentos de viaje.
Analiza el documento y devuelve ÚNICAMENTE un objeto JSON válido (sin markdown, sin texto adicional) con esta estructura según el tipo:

VUELOS (category: "flight"):
{"category":"flight","title":"Vuelo ORIGEN-DESTINO","event_date":"YYYY-MM-DD","time":"HH:MM","cost":0,"currency":"EUR","paid":false,"ticket_url":"","insurance_url":"","num_stops":0,"flight_segments":[{"from":"MAD","to":"LIS","flight_number":"TP1023","airline":"TAP Air Portugal","dep_time":"07:40","arr_time":"08:05","arr_date":"","terminal_dep":"T2","terminal_arr":"T1"}]}

ALOJAMIENTO (category: "hotel"):
{"category":"hotel","title":"Nombre alojamiento","event_date":"YYYY-MM-DD","time":"15:00","cost":0,"currency":"EUR","paid":false,"accom_type":"hotel","accom_booking_ref":"","accom_pin":"","accom_checkin_date":"YYYY-MM-DD","accom_checkin_time":"HH:MM","accom_checkout_date":"YYYY-MM-DD","accom_checkout_time":"HH:MM","accom_guests_adults":2,"accom_guests_children":0,"accom_address":"","accom_web":"","accom_cancel_date":"","accom_cancel_fee":"","accom_wifi":false,"accom_breakfast":false,"accom_parking_included":false,"accom_pool":false,"accom_ac":false}

ACTIVIDAD (category: "activity"):
{"category":"activity","title":"Nombre actividad","event_date":"YYYY-MM-DD","time":"HH:MM","end_time":"HH:MM","cost":0,"currency":"EUR","paid":false,"location":"","ticket_url":"","note":""}

TRANSPORTE (category: "transport"):
{"category":"transport","title":"Descripción transporte","event_date":"YYYY-MM-DD","time":"HH:MM","end_time":"","cost":0,"currency":"EUR","paid":false,"location":"","note":""}

RESTAURANTE (category: "meal"):
{"category":"meal","title":"Nombre restaurante","event_date":"YYYY-MM-DD","time":"HH:MM","cost":0,"currency":"EUR","paid":false,"location":"","note":""}

Reglas: fechas YYYY-MM-DD, horas HH:MM (24h), arr_date solo si llega otro día, num_stops=escalas. Devuelve SOLO el JSON.`

export async function POST(req: NextRequest) {
  try {
    const { fileBase64, fileType, tripDay } = await req.json()

    const contentBlock = fileType === 'application/pdf'
      ? { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: fileBase64 } }
      : { type: 'image', source: { type: 'base64', media_type: fileType, data: fileBase64 } }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1000,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: [
          contentBlock,
          { type: 'text', text: `Extrae los datos. Fecha aproximada del viaje: ${tripDay}. Devuelve solo el JSON.` }
        ]}]
      })
    })

    const data = await response.json()
    const text = data.content?.find((b: any) => b.type === 'text')?.text || ''
    const clean = text.replace(/```json|```/g, '').trim()
    const extracted = JSON.parse(clean)

    return NextResponse.json({ ok: true, data: extracted })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 })
  }
}
