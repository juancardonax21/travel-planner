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
          
          const geocoded = await geocodeLocation(location)
          
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
        
        // Calcular distancias
        for (let i = 1; i < stopsArray.length; i++) {
          const prev = stopsArray[i - 1]
          const curr = stopsArray[i]
          
          if (prev.lat && prev.lng && curr.lat && curr.lng) {
            curr.distanceToPrevious = calculateDistance(prev.lat, prev.lng, curr.lat, curr.lng)
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
    <div className="max-w-2xl mx-auto py-8">
      {/* Timeline */}
      <div className="relative">
        {/* Vertical line */}
        <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gradient-to-b from-blue-200 via-violet-200 to-blue-200" />
        
        {/* Stops */}
        <div className="space-y-6">
          {stops.map((stop, idx) => (
            <div key={stop.id} className="relative pl-20">
              {/* Dot */}
              <div className="absolute -left-3 top-1.5 w-5 h-5 rounded-full border-2 border-white shadow-md"
                style={{
                  backgroundColor: stop.type === 'hotel' ? '#f59e0b' : '#3b82f6'
                }} />
              
              {/* Card */}
              <div className="bg-white rounded-lg border border-slate-200 p-4 hover:shadow-md hover:border-slate-300 transition-all">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {stop.type === 'hotel' ? (
                        <BedDouble size={13} strokeWidth={2} className="text-amber-600" />
                      ) : (
                        <Car size={13} strokeWidth={2} className="text-blue-600" />
                      )}
                      <h3 className="text-sm font-semibold text-slate-900">{stop.title}</h3>
                    </div>
                    <p className="text-xs text-slate-500 mb-2">{stop.location}</p>
                    <span className="text-xs text-slate-400">
                      {formatDate(stop.startDay)}
                      {stop.dayCount > 1 && ` • ${stop.dayCount}d`}
                    </span>
                  </div>
                  
                  {/* Distance badge */}
                  {stop.distanceToPrevious !== undefined && (
                    <div className={`flex-shrink-0 text-right`}>
                      <div className={`px-2 py-1 rounded text-xs font-semibold whitespace-nowrap ${
                        stop.previousCountry !== stop.country
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-blue-100 text-blue-700'
                      }`}>
                        {stop.distanceToPrevious} km
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Arrow */}
              {idx < stops.length - 1 && (
                <div className="flex justify-center -ml-14 my-2 text-slate-300">
                  <div className="text-lg">↓</div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
