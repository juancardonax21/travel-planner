'use client'
import { useEffect, useState } from 'react'
import { Loader2, Car, BedDouble, MapPin } from 'lucide-react'
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
    return null
  }
}

function getCountryFromLocation(location: string): string {
  const l = location.toLowerCase()
  if (l.includes('portugal')) return 'Portugal'
  if (l.includes('españa') || l.includes('madrid') || l.includes('benavente') || l.includes('valencia')) return 'España'
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

async function getRoadDistance(lat1: number, lng1: number, lat2: number, lng2: number): Promise<number | null> {
  try {
    const response = await fetch(
      `/api/distance?lat1=${lat1}&lng1=${lng1}&lat2=${lat2}&lng2=${lng2}`
    )
    const data = await response.json()
    return data.distance || null
  } catch (err) {
    console.error('Distance calculation error:', err)
    return null
  }
}

function daysDiff(d1: string, d2: string): number {
  return Math.ceil((new Date(d2).getTime() - new Date(d1).getTime()) / 86400000)
}

function formatDate(day: string): string {
  return new Date(day).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
}

interface RouteStop extends Stop {
  distanceToPrevious?: number
  previousCountry?: string
}

export default function TripRoute({ trip, events }: { trip: Trip; events: Event[] }) {
  const [stops, setStops] = useState<RouteStop[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function buildRoute() {
      try {
        setLoading(true)
        
        const routeEvents = events.filter(e => 
          (e.category === 'hotel' || e.category === 'transport') && 
          (e.location || e.accom_address)
        ).sort((a, b) => a.day.localeCompare(b.day) || a.time.localeCompare(b.time))
        
        if (routeEvents.length === 0) {
          setStops([])
          setLoading(false)
          return
        }
        
        const stopsArray: RouteStop[] = []
        
        for (const event of routeEvents) {
          const location = event.category === 'hotel' 
            ? (event.accom_address || event.location)
            : event.location
          
          if (!location) continue
          
          // Primero intentar usar las coordenadas guardadas
          let lat = event.lat
          let lng = event.lng
          let country = getCountryFromLocation(location)
          
          // Si no tiene coordenadas guardadas, geocodificar
          if (!lat || !lng) {
            const geocoded = await geocodeLocation(location)
            if (geocoded) {
              lat = geocoded.lat
              lng = geocoded.lng
              country = geocoded.country
            }
          }
          
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
              lat: lat || null,
              lng: lng || null,
              country: country,
              startDay: event.day,
              endDay: event.day,
              type: event.category === 'hotel' ? 'hotel' : 'transport',
              dayCount: 1
            })
          }
        }
        
        // Calcular distancias reales por carretera
        for (let i = 1; i < stopsArray.length; i++) {
          const prev = stopsArray[i - 1]
          const curr = stopsArray[i]
          
          if (prev.lat && prev.lng && curr.lat && curr.lng) {
            // Intentar obtener distancia real por carretera
            const roadDist = await getRoadDistance(prev.lat, prev.lng, curr.lat, curr.lng)
            // Si no funciona OpenRouteService, usar Haversine como fallback
            curr.distanceToPrevious = roadDist || calculateDistance(prev.lat, prev.lng, curr.lat, curr.lng)
            curr.previousCountry = prev.country
          }
        }
        
        setStops(stopsArray)
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
      <div className="flex items-center justify-center py-12">
        <Loader2 size={16} className="animate-spin text-blue-500 mr-2" />
        <span className="text-xs text-slate-500">Cargando ruta...</span>
      </div>
    )
  }

  if (stops.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 text-slate-400">
        <MapPin size={16} className="mr-2" />
        <span className="text-sm">Sin ubicaciones en este viaje</span>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      <div className="space-y-0">
        {stops.map((stop, idx) => (
          <div key={stop.id}>
            {/* Distance from previous (centered between stops) */}
            {stop.distanceToPrevious !== undefined && (
              <div className="flex gap-6 py-1.5">
                <div className="flex-shrink-0 w-20" />
                <div className="text-sm text-slate-600 font-medium">
                  ↓ {stop.distanceToPrevious} km
                </div>
              </div>
            )}
            
            <div className="flex gap-6 py-2">
              {/* Left: Date column */}
              <div className="flex flex-col items-center flex-shrink-0 pt-0.5">
                <div className="text-center">
                  <div className="text-lg font-bold text-slate-900">{formatDate(stop.startDay)}</div>
                  {stop.dayCount > 1 && (
                    <div className="text-xs text-slate-500 mt-0.5">{stop.dayCount}d</div>
                  )}
                </div>
                
                {/* Dot */}
                <div className="w-3 h-3 rounded-full border-2 border-white shadow-sm flex-shrink-0 mt-3"
                  style={{
                    backgroundColor: stop.type === 'hotel' ? '#f59e0b' : '#3b82f6'
                  }} />
                
                {/* Vertical line to next */}
                {idx < stops.length - 1 && (
                  <div className="flex-1 w-0.5 bg-slate-300 mt-3 min-h-12" />
                )}
              </div>
              
              {/* Right: Info (no card) */}
              <div className="flex-1 pt-0.5">
                <div className="flex items-start gap-2 mb-0.5">
                  {stop.type === 'hotel' ? (
                    <BedDouble size={13} strokeWidth={2} className="text-amber-600 flex-shrink-0 mt-0.5" />
                  ) : (
                    <Car size={13} strokeWidth={2} className="text-blue-600 flex-shrink-0 mt-0.5" />
                  )}
                  <h3 className="text-sm font-semibold text-slate-900">{stop.title}</h3>
                </div>
                <p className="text-xs text-slate-500 ml-5">{stop.location}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
