'use client'
import { useEffect, useState } from 'react'
import { MapPin, Loader2, Car, BedDouble, Calendar } from 'lucide-react'
import type { Event, Trip } from '@/types'

interface Stop {
  id: string
  title: string
  location: string
  lat: number | null
  lng: number | null
  country: string
  startDay: string
  endDay: string
  type: 'hotel' | 'transport'
  dayCount: number
}

interface Segment {
  from: Stop
  to: Stop
  distanceKm?: number
  countryChange: boolean
}

async function geocodeLocation(location: string): Promise<{ lat: number; lng: number; country: string } | null> {
  if (!location?.trim()) return null
  
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(location)}&format=json&limit=1`,
      { headers: { 'Accept-Language': 'es' } }
    )
    if (!response.ok) return null
    
    const data = await response.json()
    if (!data?.[0]) return null
    
    const result = data[0]
    const country = result.address?.country || getCountryFromLocation(location)
    return { 
      lat: parseFloat(result.lat), 
      lng: parseFloat(result.lon), 
      country 
    }
  } catch (error) {
    console.error('Geocoding error:', error)
    return null
  }
}

function getCountryFromLocation(location: string): string {
  const l = location.toLowerCase()
  if (l.includes('portugal')) return 'Portugal'
  if (l.includes('españa') || l.includes('madrid') || l.includes('benavente') || l.includes('valencia')) return 'España'
  if (l.includes('france')) return 'Francia'
  return 'Destino'
}

function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return Math.round(R * c)
}

function daysDiff(d1: string, d2: string): number {
  return Math.ceil((new Date(d2).getTime() - new Date(d1).getTime()) / 86400000)
}

function formatDate(day: string): string {
  const d = new Date(day)
  return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
}

export default function TripRoute({ trip, events }: { trip: Trip; events: Event[] }) {
  const [stops, setStops] = useState<Stop[]>([])
  const [segments, setSegments] = useState<Segment[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function buildRoute() {
      try {
        setLoading(true)
        
        // Incluir hoteles (por título) + transportes principales
        const routeEvents = events.filter(e => 
          (e.category === 'hotel' || e.category === 'transport') && 
          (e.location || e.accom_address)
        ).sort((a, b) => a.day.localeCompare(b.day) || a.time.localeCompare(b.time))
        
        if (routeEvents.length === 0) {
          setStops([])
          setSegments([])
          setLoading(false)
          return
        }
        
        // Crear un stop por evento (no deduplicar)
        const stopsArray: Stop[] = []
        
        for (const event of routeEvents) {
          const location = event.category === 'hotel' 
            ? (event.accom_address || event.location)
            : event.location
          
          if (!location) continue
          
          const geocoded = await geocodeLocation(location)
          
          // Buscar si hay parada anterior en mismo lugar
          const existingStop = stopsArray.find(s => 
            s.location === location && s.type === event.category
          )
          
          if (existingStop) {
            existingStop.endDay = event.day
            existingStop.dayCount = daysDiff(existingStop.startDay, event.day) + 1
          } else {
            stopsArray.push({
              id: event.id,
              title: event.title,
              location,
              lat: geocoded?.lat || null,
              lng: geocoded?.lng || null,
              country: geocoded?.country || getCountryFromLocation(location),
              startDay: event.day,
              endDay: event.day,
              type: event.category === 'hotel' ? 'hotel' : 'transport',
              dayCount: 1
            })
          }
        }
        
        // Calcular segmentos
        const routeSegments: Segment[] = []
        for (let i = 0; i < stopsArray.length - 1; i++) {
          const from = stopsArray[i]
          const to = stopsArray[i + 1]
          
          let distanceKm: number | undefined
          if (from.lat && from.lng && to.lat && to.lng) {
            distanceKm = calculateDistance(from.lat, from.lng, to.lat, to.lng)
          }
          
          routeSegments.push({
            from,
            to,
            distanceKm,
            countryChange: from.country !== to.country
          })
        }
        
        setStops(stopsArray)
        setSegments(routeSegments)
      } catch (err) {
        console.error('Route building error:', err)
      } finally {
        setLoading(false)
      }
    }
    
    buildRoute()
  }, [events])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 size={16} className="animate-spin text-blue-500 mr-2" />
        <span className="text-xs text-slate-500">Cargando ruta...</span>
      </div>
    )
  }

  if (stops.length === 0) return null

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 mb-4">
      <div className="flex items-center gap-2 mb-4">
        <MapPin size={16} strokeWidth={2} className="text-blue-600" />
        <h3 className="text-sm font-semibold text-slate-900">Ruta del viaje</h3>
      </div>
      
      <div className="space-y-3">
        {stops.map((stop, idx) => (
          <div key={stop.id}>
            {/* Stop */}
            <div className="bg-slate-50 rounded-lg p-3 border border-slate-200 hover:border-blue-300 transition-colors">
              <div className="flex items-start gap-3">
                {/* Icon + title + details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {stop.type === 'hotel' ? (
                      <BedDouble size={14} strokeWidth={2} className="text-amber-600 flex-shrink-0" />
                    ) : (
                      <Car size={14} strokeWidth={2} className="text-blue-600 flex-shrink-0" />
                    )}
                    <span className="text-xs font-semibold text-slate-600 uppercase">
                      {stop.type === 'hotel' ? 'Hotel' : 'Transporte'}
                    </span>
                  </div>
                  <h4 className="text-sm font-semibold text-slate-900 truncate">{stop.title}</h4>
                  <p className="text-xs text-slate-500 line-clamp-1">{stop.location}</p>
                  <div className="flex items-center gap-1 text-xs text-slate-500 mt-1">
                    <Calendar size={11} strokeWidth={2} />
                    {formatDate(stop.startDay)}
                    {stop.dayCount > 1 && <span>• {stop.dayCount}d</span>}
                  </div>
                </div>
                
                {/* Distance badge */}
                {idx < stops.length - 1 && segments[idx]?.distanceKm && (
                  <div className={`flex-shrink-0 text-right`}>
                    <div className={`px-2 py-1 rounded text-xs font-semibold whitespace-nowrap ${
                      segments[idx].countryChange
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-blue-100 text-blue-700'
                    }`}>
                      {segments[idx].distanceKm} km
                    </div>
                    {segments[idx].countryChange && (
                      <span className="text-xs text-amber-600 font-medium mt-1 block">Cambio país</span>
                    )}
                  </div>
                )}
              </div>
            </div>
            
            {/* Arrow */}
            {idx < stops.length - 1 && (
              <div className="flex justify-center py-1.5">
                <div className="text-slate-300 text-lg">↓</div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
