'use client'
import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { formatDate } from '@/lib/utils'
import { Plane, BedDouble, Ticket, Car, UtensilsCrossed, FileText, MapPin, CreditCard, CheckCircle2, AlertTriangle, Circle, CalendarDays, Users, Tag } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'

export default function DossierPage({ params }: { params: { id: string } }) {
  const { id } = params
  const [trip, setTrip] = useState<any>(null)
  const [events, setEvents] = useState<any[]>([])
  const [travelers, setTravelers] = useState<any[]>([])
  const [docs, setDocs] = useState<any[]>([])
  const [memberDocs, setMemberDocs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { load() }, [id])

  async function load() {
    const [{ data: t }, { data: ev }, { data: tm }, { data: d }, { data: md }] = await Promise.all([
      supabase.from('trips').select('*').eq('id', id).single(),
      supabase.from('events').select('*').eq('trip_id', id).order('day').order('time'),
      supabase.from('trip_members').select('family_member:family_members(*)').eq('trip_id', id),
      supabase.from('documents').select('*').eq('trip_id', id).order('category'),
      supabase.from('member_documents').select('*, family_member:family_members(name)').eq('trip_id', id),
    ])
    setTrip(t)
    setEvents(ev || [])
    setTravelers((tm || []).map((m: any) => m.family_member).filter(Boolean))
    setDocs(d || [])
    setMemberDocs(md || [])
    setLoading(false)
  }

  // Print only when all data is loaded
  useEffect(() => {
    if (!loading && trip && events.length >= 0) {
      const t = setTimeout(() => window.print(), 800)
      return () => clearTimeout(t)
    }
  }, [loading, trip, events])

  if (loading) return (
    <div style={{ fontFamily: 'system-ui', padding: 60, textAlign: 'center', color: '#888' }}>
      <div style={{ fontSize: 24, marginBottom: 12 }}>✈</div>
      Preparando dossier...
    </div>
  )
  if (!trip) return null

  const reqs: any[] = trip.entry_requirements || []
  const musts: any[] = trip.must_do || []

  // Group events by day
  const days = [...new Set(events.map((e: any) => e.day))].sort()
  const byDay = (day: string) => events.filter(e => e.day === day)

  // Budget by category
  const budgetEvents = events.filter((e: any) => parseFloat(e.cost || 0) > 0)
  const totalCost = budgetEvents.reduce((s: number, e: any) => s + parseFloat(e.cost || 0), 0)
  const byCat: Record<string, number> = {}
  budgetEvents.forEach((e: any) => { byCat[e.category] = (byCat[e.category] || 0) + parseFloat(e.cost || 0) })

  // Vouchers
  const vouchers: any[] = [
    ...events.filter(e => e.ticket_url).map(e => ({ name: e.title, url: e.ticket_url, date: e.day, type: 'Billete' })),
    ...events.filter(e => e.insurance_url).map(e => ({ name: `Seguro — ${e.title}`, url: e.insurance_url, date: e.day, type: 'Seguro' })),
    ...events.filter(e => e.category === 'hotel' && e.accom_web).map(e => ({ name: e.title, url: e.accom_web, date: e.accom_checkin_date, type: 'Alojamiento' })),
    ...docs.filter(d => d.url).map(d => ({ name: d.name, url: d.url, date: null, type: d.category })),
    ...memberDocs.filter(d => d.file_url).map(d => ({ name: `${d.label} — ${d.family_member?.name?.split(' ')[0] || ''}`, url: d.file_url, date: null, type: 'Billete' })),
  ]

  const CAT: Record<string, string> = {
    flight: 'Vuelo', hotel: 'Alojamiento', activity: 'Actividad',
    transport: 'Transporte', restaurant: 'Restaurante', other: 'Otro'
  }
  const CAT_ICON: Record<string, any> = {
    flight: Plane, hotel: BedDouble, activity: Ticket,
    transport: Car, restaurant: UtensilsCrossed, other: Tag
  }

  // Calendar grid
  const startDate = new Date(trip.start_date)
  const endDate = new Date(trip.end_date)
  const totalDays = Math.round((endDate.getTime() - startDate.getTime()) / 86400000) + 1

  return (
    <div style={{ fontFamily: '"Helvetica Neue", Arial, sans-serif', fontSize: 10, color: '#1a1a1a', maxWidth: 860, margin: '0 auto' }}>
      <style>{`
        @page { margin: 15mm; size: A4; }
        @media print {
          body { margin: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .pb { page-break-before: always; }
        }
        * { box-sizing: border-box; }
        h2 { font-size: 18px; color: #1e3a5f; margin: 0 0 16px; padding-bottom: 8px; border-bottom: 2px solid #1e3a5f; letter-spacing: -0.3px; }
        h3 { font-size: 12px; color: #444; margin: 14px 0 6px; font-weight: 600; }
        .section { padding: 20px 0; }
        .tag { display: inline-block; padding: 1px 6px; border-radius: 3px; font-size: 8px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }
        .ok { background: #d1fae5; color: #065f46; }
        .warn { background: #fef3c7; color: #92400e; }
        .miss { background: #fee2e2; color: #991b1b; }
      `}</style>

      {/* ── PORTADA ─────────────────────────────────────────── */}
      <div style={{ background: 'linear-gradient(135deg, #1e3a5f 0%, #3b4ea6 50%, #6b21a8 100%)', color: 'white', padding: '60px 40px', minHeight: 320, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
        <div style={{ fontSize: 10, letterSpacing: 4, textTransform: 'uppercase', opacity: 0.6 }}>Dossier de viaje</div>
        <div>
          <div style={{ fontSize: 42, fontWeight: 800, letterSpacing: -1, lineHeight: 1.1, marginBottom: 8 }}>{trip.name}</div>
          <div style={{ fontSize: 18, opacity: 0.8, marginBottom: 20 }}>{trip.destination}</div>
          <div style={{ display: 'flex', gap: 32, fontSize: 12, opacity: 0.7 }}>
            <div style={{display:'flex',alignItems:'center',gap:4}}><CalendarDays size={11} /> {formatDate(trip.start_date, 'd MMM')} — {formatDate(trip.end_date, 'd MMM yyyy')}</div>
            <div style={{display:'flex',alignItems:'center',gap:4}}><Users size={11} /> {travelers.map(t => t.name?.split(' ')[0]).join(', ')}</div>
            <div style={{display:'flex',alignItems:'center',gap:4}}><CalendarDays size={11} /> {totalDays} días</div>
          </div>
        </div>
        <div style={{ fontSize: 9, opacity: 0.4, marginTop: 20 }}>Generado el {formatDate(new Date().toISOString().split('T')[0], 'd MMMM yyyy')}</div>
      </div>

      {/* ── PLANNING DEL VIAJE (Itinerario día a día) ────────── */}
      <div className="pb" style={{ padding: '20px 0' }}>
        <h2>Planning del viaje</h2>
        {days.map(day => (
          <div key={day} style={{ marginBottom: 12, breakInside: 'avoid' }}>
            <div style={{ background: '#1e3a5f', color: 'white', padding: '5px 12px', borderRadius: '6px 6px 0 0', fontSize: 11, fontWeight: 700 }}>
              {formatDate(day, 'EEEE d MMMM yyyy')}
            </div>
            {byDay(day).map((ev, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, padding: '7px 12px', background: i % 2 === 0 ? '#f9fafb' : 'white', borderLeft: '1px solid #e5e7eb', borderRight: '1px solid #e5e7eb', borderBottom: '1px solid #f0f0f0' }}>
                <div style={{ width: 45, flexShrink: 0, color: '#888', fontSize: 10 }}>{ev.time || ''}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {(() => { const Icon = CAT_ICON[ev.category]; return Icon ? <Icon size={9} strokeWidth={1.8} style={{color:'#888',flexShrink:0}} /> : null })()}
                    <span style={{ fontSize: 8, color: '#888' }}>{CAT[ev.category] || ev.category}</span>
                    <strong style={{ fontSize: 11 }}>{ev.title}</strong>
                  </div>
                  {ev.location && <div style={{ fontSize: 9, color: '#888', display:'flex', alignItems:'center', gap:3 }}><MapPin size={8} strokeWidth={1.8} />{ev.location}</div>}
                  {ev.category === 'flight' && ev.flight_segments && (
                    <div style={{ fontSize: 9, color: '#3b4ea6', marginTop: 2 }}>
                      {ev.flight_segments.map((seg: any, j: number) => (
                        <span key={j}>{seg.from}→{seg.to} {seg.flight_number} · {seg.dep_time}–{seg.arr_time}{j < ev.flight_segments.length - 1 ? ' | ' : ''}</span>
                      ))}
                    </div>
                  )}
                  {ev.category === 'hotel' && ev.accom_checkout_date && (
                    <div style={{ fontSize: 9, color: '#065f46' }}>Check-out: {formatDate(ev.accom_checkout_date, 'd MMM yyyy')}</div>
                  )}
                  {ev.notes && <div style={{ fontSize: 9, color: '#aaa', marginTop: 2 }}>{ev.notes}</div>}
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0, fontSize: 10 }}>
                  {ev.cost > 0 && <div style={{ fontWeight: 700, color: '#1e3a5f' }}>{ev.cost.toLocaleString()} {ev.currency}</div>}
                  {ev.paid !== null && <div style={{ fontSize: 8, color: ev.paid ? '#065f46' : '#92400e' }}>{ev.paid ? '✓ Pagado' : '○ Pendiente'}</div>}
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* ── ITINERARIO DEL VIAJE (Mapa) ────────────────────── */}
      <div className="pb" style={{ padding: '20px 0' }}>
        <h2>Itinerario del viaje</h2>
        {(() => {
          const locationsWithCoords = events.filter(e => e.lat && e.lng)
          if (locationsWithCoords.length > 0) {
            const markers = locationsWithCoords
              .map((e, i) => `color:blue|label:${i + 1}|${e.lat},${e.lng}`)
              .join('&markers=')
            const mapUrl = `https://maps.googleapis.com/maps/api/staticmap?size=1000x500&markers=${markers}&path=color:0x2563EB|weight:2|geodesic:true|${locationsWithCoords.map(e => `${e.lat},${e.lng}`).join('|')}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`
            return (
              <div style={{ textAlign: 'center' }}>
                <img src={mapUrl} alt="Mapa del viaje" style={{ maxWidth: '100%', borderRadius: 8, border: '1px solid #e5e7eb' }} />
                <div style={{ fontSize: 9, color: '#888', marginTop: 8 }}>Ruta completa del viaje con {locationsWithCoords.length} ubicaciones</div>
              </div>
            )
          }
          return null
        })()}
      </div>

      {/* ── PRESUPUESTO ────────────────────────────────────── */}
      <div className="pb" style={{ padding: '20px 0' }}>
        <h2>Presupuesto del viaje</h2>
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 20 }}>
          <thead>
            <tr style={{ background: '#1e3a5f', color: 'white' }}>
              <th style={{ padding: '8px 12px', textAlign: 'left', fontSize: 10 }}>Concepto</th>
              <th style={{ padding: '8px 12px', textAlign: 'left', fontSize: 10 }}>Categoría</th>
              <th style={{ padding: '8px 12px', textAlign: 'left', fontSize: 10 }}>Fecha</th>
              <th style={{ padding: '8px 12px', textAlign: 'right', fontSize: 10 }}>Importe</th>
              <th style={{ padding: '8px 12px', textAlign: 'center', fontSize: 10 }}>Estado</th>
            </tr>
          </thead>
          <tbody>
            {budgetEvents.map((ev, i) => (
              <tr key={i} style={{ background: i % 2 === 0 ? '#f9fafb' : 'white', borderBottom: '1px solid #f0f0f0' }}>
                <td style={{ padding: '6px 12px', fontSize: 10, fontWeight: 500 }}>{ev.title}</td>
                <td style={{ padding: '6px 12px', fontSize: 9, color: '#888' }}>{CAT[ev.category] || ev.category}</td>
                <td style={{ padding: '6px 12px', fontSize: 9, color: '#888' }}>{ev.day ? formatDate(ev.day, 'd MMM') : ''}</td>
                <td style={{ padding: '6px 12px', textAlign: 'right', fontWeight: 600, fontSize: 10 }}>{parseFloat(ev.cost || 0).toLocaleString()} {ev.currency}</td>
                <td style={{ padding: '6px 12px', textAlign: 'center' }}>
                  <span className={`tag ${ev.paid ? 'ok' : 'warn'}`}>{ev.paid ? 'Pagado' : 'Pendiente'}</span>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr style={{ background: '#1e3a5f', color: 'white', fontWeight: 700 }}>
              <td style={{ padding: '8px 12px', fontSize: 11 }} colSpan={3}>TOTAL</td>
              <td style={{ padding: '8px 12px', textAlign: 'right', fontSize: 12 }}>{totalCost.toLocaleString()} €</td>
              <td />
            </tr>
          </tfoot>
        </table>

        <h3>Desglose por categoría</h3>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {Object.entries(byCat).map(([cat, total]) => (
            <div key={cat} style={{ background: '#f0f4ff', border: '1px solid #c7d2fe', borderRadius: 8, padding: '8px 16px', textAlign: 'center' }}>
              <div style={{ fontSize: 9, color: '#6366f1', marginBottom: 2 }}>{CAT[cat] || cat}</div>
              <div style={{ fontWeight: 700, fontSize: 13, color: '#1e3a5f' }}>{total.toLocaleString()} €</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── VOUCHERS / QR ──────────────────────────────────── */}
      {vouchers.length > 0 && (
        <div className="pb" style={{ padding: '20px 0' }}>
          <h2>Vouchers y reservas</h2>
          <p style={{ fontSize: 9, color: '#888', marginBottom: 16 }}>Escanea el código QR para acceder al documento original sin conexión a internet.</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {vouchers.map((v, i) => (
              <div key={i} style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: 12, display: 'flex', gap: 12, breakInside: 'avoid' }}>
                <div style={{ flexShrink: 0 }}>
                  <QRCodeSVG value={v.url} size={72} level="M" />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 11, marginBottom: 3 }}>{v.name}</div>
                  <div style={{ fontSize: 8, color: '#888', marginBottom: 2, display:'flex', alignItems:'center', gap:3 }}>
                    <Tag size={8} strokeWidth={1.8} />{v.type} {v.date ? `· ${formatDate(v.date, 'd MMM yyyy')}` : ''}
                  </div>
                  <div style={{ fontSize: 7, color: '#a5b4fc', wordBreak: 'break-all', lineHeight: 1.4 }}>{v.url}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── VIAJEROS ───────────────────────────────────────── */}
      <div className="pb" style={{ padding: '20px 0' }}>
        <h2>Datos de viajeros</h2>
        {travelers.map((t: any) => (
          <div key={t.id} style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: 14, marginBottom: 12, breakInside: 'avoid' }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: '#1e3a5f', marginBottom: 10, paddingBottom: 6, borderBottom: '1px solid #f0f0f0' }}>
              {t.name}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 20px', fontSize: 10 }}>
              {t.passport_number && <div><span style={{ color: '#888' }}>Pasaporte: </span><strong>{t.passport_number}</strong>{t.passport_expiry ? ` (hasta ${formatDate(t.passport_expiry, 'd MMM yyyy')})` : ''}</div>}
              {t.dni && <div><span style={{ color: '#888' }}>DNI: </span><strong>{t.dni}</strong></div>}
              {t.tse_number && <div><span style={{ color: '#888' }}>TSE: </span><strong>{t.tse_number}</strong>{t.tse_expiry ? ` (hasta ${formatDate(t.tse_expiry, 'd MMM yyyy')})` : ''}</div>}
              {t.health_ins_number && <div><span style={{ color: '#888' }}>Seguro: </span><strong>{t.health_ins_number}</strong></div>}
              {t.health_ins_phone && <div><span style={{ color: '#888' }}>Tel. emergencias: </span><strong>{t.health_ins_phone}</strong></div>}
              {t.email && <div><span style={{ color: '#888' }}>Email: </span>{t.email}</div>}
              {t.phone && <div><span style={{ color: '#888' }}>Teléfono: </span>{t.phone}</div>}
              {(t.entry_permits || []).map((p: any, i: number) => (
                <div key={i}><span style={{ color: '#888' }}>{p.type}: </span><strong>{p.number}</strong>{p.expiry ? ` (hasta ${formatDate(p.expiry, 'd MMM yyyy')})` : ''}</div>
              ))}
              {(t.vaccines || []).map((v: any, i: number) => (
                <div key={i}><span style={{ color: '#888' }}>Vacuna {v.name}: </span>{v.date ? formatDate(v.date, 'd MMM yyyy') : ''}</div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* ── REQUISITOS ─────────────────────────────────────── */}
      {reqs.length > 0 && (
        <div className="pb" style={{ padding: '20px 0' }}>
          <h2>Requisitos de entrada — {trip.destination}</h2>
          {reqs.map((section: any) => (
            <div key={section.title} style={{ marginBottom: 14, breakInside: 'avoid' }}>
              <h3>{section.title}</h3>
              {section.items.map((item: any, i: number) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '5px 0', borderBottom: '1px solid #f5f5f5' }}>
                  <span style={{ fontSize: 13, flexShrink: 0, marginTop: -1 }}>
                    {item.status === 'ok' ? <CheckCircle2 size={13} style={{color:'#065f46'}} /> : item.status === 'warn' ? <AlertTriangle size={13} style={{color:'#92400e'}} /> : <Circle size={13} style={{color:'#ccc'}} />}
                  </span>
                  <div>
                    <span style={{ fontSize: 10 }}>{item.label}</span>
                    {item.note && <div style={{ fontSize: 9, color: '#888', marginTop: 1 }}>{item.note}</div>}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* Footer */}
      <div style={{ textAlign: 'center', fontSize: 8, color: '#ccc', borderTop: '1px solid #f0f0f0', paddingTop: 10, marginTop: 20 }}>
        {trip.name} · {trip.destination} · {formatDate(trip.start_date, 'd MMM')}–{formatDate(trip.end_date, 'd MMM yyyy')} · Travel Planner
      </div>
    </div>
  )
}
