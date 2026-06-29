'use client'
import { useEffect, useState } from 'react'
import { MapPin, Loader2, Plane, MapPinOff, Calendar } from 'lucide-react'
import type { Event, Trip } from '@/types'

interface StopPoint {
  sequence: number
  location: string
  fullLocation: string
  lat: number | null
  lng: number | null
  country: string
  startDay: string
  endDay: string
  eventType: 'hotel' | 'transport' | 'mixed'
  dayCount: number
  events: Event[]
}

interface RouteLink {
  from: StopPoint
  to: StopPoint
  distanceKm?: number
  countryChange: boolean
}

async function geocodeLocation(location: string): Promise<{ lat: number; lng: number; country: string } | null> {
  if (!location || location.trim().length === 0) return null
  
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(location)}&format=json&limit=1`,
      { headers: { 'Accept-Language': 'es' } }
    )
    if (!response.ok) return null
    
    const data = await response.json()
    if (!data || data.length === 0) return null
    
    const result = data[0]
    const country = result.address?.country || extractCountryFromLocation(location)
    return { lat: parseFloat(result.lat), lng: parseFloat(result.lon), country }
  } catch (error) {
    console.error('Geocoding error:', error)
    return null
  }
}

function extractCountryFromLocation(location: string): string {
  const locationLower = location.toLowerCase()
  const countryMap: Record<string, string> = {
    'portugal': '🇵🇹', 'españa': '🇪🇸', 'spain': '🇪🇸',
    'madrid': '🇪🇸', 'barcelona': '🇪🇸', 'valencia': '🇪🇸', 'benavente': '🇪🇸',
    'vila nova': '🇵🇹', 'porto': '🇵🇹', 'cerveira': '🇵🇹',
    'france': '🇫🇷', 'italie': '🇮🇹', 'germany': '🇩🇪',
  }
  
  for (const [key, value] of Object.entries(countryMap)) {
    if (locationLower.includes(key)) return value
  }
  return '🌍'
}

function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return Math.round(R * c)
}

function daysDiff(d1: string, d2: string): number {
  const start = new Date(d1)
  const end = new Date(d2)
  return Math.ceil((end.getTime() - start.getTime()) / 86400000)
}

export default function TripRoute({ trip, events }: { trip: Trip; events: Event[] }) {
  const [stops, setStops] = useState<StopPoint[]>([])
  const [links, setLinks] = useState<RouteLink[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function buildRoute() {
      try {
        setLoading(true)
        
        // Filtrar eventos significativos (hoteles + transportes principales)
        const significantEvents = events.filter(e => 
          (e.category === 'hotel' || e.category === 'transport') && e.location
        ).sort((a, b) => a.day.localeCompare(b.day))
        
        if (significantEvents.length === 0) {
          setStops([])
          setLinks([])
          setLoading(false)
          return
        }
        
        // Agrupar por ubicación única (mantener orden temporal)
        const stopMap = new Map<string, StopPoint>()
        let sequence = 0
        
        for (const event of significantEvents) {
          const fullLoc = event.category === 'hotel' 
            ? (event.accom_address || event.location)
            : event.location
          
          if (!fullLoc) continue
          
          if (!stopMap.has(fullLoc)) {
            stopMap.set(fullLoc, {
              sequence: sequence++,
              location: fullLoc.split(',')[0].trim(), // Simplificar nombre
              fullLocation: fullLoc,
              lat: null,
              lng: null,
              country: extractCountryFromLocation(fullLoc),
              startDay: event.day,
              endDay: event.day,
              eventType: event.category === 'hotel' ? 'hotel' : 'transport',
              dayCount: 1,
              events: [event]
            })
          } else {
            const stop = stopMap.get(fullLoc)!
            if (event.day > stop.endDay) stop.endDay = event.day
            stop.dayCount = daysDiff(stop.startDay, stop.endDay) + 1
            stop.events.push(event)
          }
        }
        
        // Geocodificar
        const stopsArray = Array.from(stopMap.values())
        for (const stop of stopsArray) {
          const geocoded = await geocodeLocation(stop.fullLocation)
          if (geocoded) {
            stop.lat = geocoded.lat
            stop.lng = geocoded.lng
            stop.country = geocoded.country
          }
        }
        
        // Calcular distancias
        const routeLinks: RouteLink[] = []
        for (let i = 0; i < stopsArray.length - 1; i++) {
          const from = stopsArray[i]
          const to = stopsArray[i + 1]
          
          let distanceKm: number | undefined
          if (from.lat && from.lng && to.lat && to.lng) {
            distanceKm = calculateDistance(from.lat, from.lng, to.lat, to.lng)
          }
          
          routeLinks.push({
            from,
            to,
            distanceKm,
            countryChange: from.country !== to.country
          })
        }
        
        setStops(stopsArray)
        setLinks(routeLinks)
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
      <div className="flex items-center justify-center py-8">
        <Loader2 size={18} className="animate-spin text-blue-500 mr-2" />
        <span className="text-sm text-slate-500">Cargando ruta...</span>
      </div>
    )
  }

  if (stops.length === 0) return null

  return (
    <div className="bg-gradient-to-br from-white to-slate-50 rounded-2xl border border-slate-200 p-6 mb-6 shadow-sm">
      <div className="flex items-center gap-2 mb-6">
        <div className="p-2 bg-blue-100 rounded-lg">
          <MapPin size={18} strokeWidth={1.8} className="text-blue-600" />
        </div>
        <h3 className="text-lg font-semibold text-slate-900">Ruta del viaje</h3>
      </div>
      
      <div className="space-y-6">
        {stops.map((stop, idx) => (
          <div key={stop.sequence}>
            {/* Stop card */}
            <div className="bg-white rounded-xl border border-slate-200 p-4 hover:border-blue-300 hover:shadow-md transition-all">
              <div className="flex items-start gap-4">
                {/* Left: Country + Location */}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl">{stop.country}</span>
                    <span className="text-xs font-semibold text-slate-500 uppercase px-2 py-1 bg-slate-100 rounded-full">
                      {stop.eventType === 'hotel' ? '🏨 Hotel' : '✈️ Transporte'}
                    </span>
                  </div>
                  <h4 className="font-semibold text-slate-900 mb-1">{stop.location}</h4>
                  <p className="text-xs text-slate-500 mb-3">{stop.fullLocation}</p>
                  
                  {/* Dates + duration */}
                  <div className="flex items-center gap-2 text-xs text-slate-600">
                    <Calendar size={12} strokeWidth={2} />
                    <span>
                      {new Date(stop.startDay).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                      {stop.dayCount > 1 && ` - ${stop.dayCount} días`}
                    </span>
                  </div>
                </div>
                
                {/* Right: Next distance */}
                {idx < stops.length - 1 && links[idx] && (
                  <div className="flex flex-col items-end gap-2">
                    <div className={`px-3 py-2 rounded-lg text-sm font-semibold flex items-center gap-1.5 ${
                      links[idx].countryChange
                        ? 'bg-amber-100 text-amber-700 border border-amber-300'
                        : 'bg-blue-100 text-blue-700 border border-blue-300'
                    }`}>
                      {links[idx].distanceKm ? `${links[idx].distanceKm} km` : '—'}
                    </div>
                    {links[idx].countryChange && (
                      <span className="text-xs font-medium text-amber-600">Cambio país</span>
                    )}
                  </div>
                )}
              </div>
            </div>
            
            {/* Arrow to next */}
            {idx < stops.length - 1 && (
              <div className="flex justify-center py-4">
                <div className="text-slate-300 text-2xl">↓</div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
