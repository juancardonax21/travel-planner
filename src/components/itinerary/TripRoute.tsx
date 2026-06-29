'use client'
import { useEffect, useState } from 'react'
import { MapPin, Loader2, AlertCircle } from 'lucide-react'
import type { Event, Trip } from '@/types'

interface RoutePoint {
  day: string
  location: string
  lat: number | null
  lng: number | null
  country: string
  fullLocation: string
  events: Event[]
}

interface RouteSegment extends RoutePoint {
  nextPoint?: RoutePoint
  distanceKm?: number
  countryChange?: boolean
}

async function geocodeLocation(location: string): Promise<{ lat: number; lng: number; country: string } | null> {
  if (!location || location.trim().length === 0) return null
  
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(location)}&format=json&limit=1`,
      {
        headers: { 'Accept-Language': 'es' }
      }
    )
    if (!response.ok) return null
    
    const data = await response.json()
    if (!data || data.length === 0) return null
    
    const result = data[0]
    const lat = parseFloat(result.lat)
    const lng = parseFloat(result.lon)
    
    // Extract country from address
    const address = result.address || {}
    const country = address.country || extractCountryFromLocation(location)
    
    return { lat, lng, country }
  } catch (error) {
    console.error('Geocoding error:', error)
    return null
  }
}

function extractCountryFromLocation(location: string): string {
  const locationLower = location.toLowerCase()
  
  const countryMap: Record<string, string> = {
    'portugal': '🇵🇹 Portugal',
    'españa': '🇪🇸 España',
    'spain': '🇪🇸 España',
    'madrid': '🇪🇸 España',
    'barcelona': '🇪🇸 España',
    'valencia': '🇪🇸 España',
    'benavente': '🇪🇸 España',
    'vila nova': '🇵🇹 Portugal',
    'porto': '🇵🇹 Portugal',
    'cerveira': '🇵🇹 Portugal',
    'france': '🇫🇷 Francia',
    'italie': '🇮🇹 Italia',
    'germany': '🇩🇪 Alemania',
  }
  
  for (const [key, value] of Object.entries(countryMap)) {
    if (locationLower.includes(key)) return value
  }
  
  return '🌍 Ubicación desconocida'
}

function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371 // Radius of Earth in km
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return Math.round(R * c)
}

function formatDateRange(startDay: string, endDay: string | null): string {
  if (!endDay || startDay === endDay) {
    const d = new Date(startDay)
    return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
  }
  const d1 = new Date(startDay)
  const d2 = new Date(endDay)
  return `${d1.toLocaleDateString('es-ES', { day: 'numeric' })}-${d2.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}`
}

export default function TripRoute({ trip, events }: { trip: Trip; events: Event[] }) {
  const [routePoints, setRoutePoints] = useState<RouteSegment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function buildRoute() {
      try {
        setLoading(true)
        setError(null)
        
        // Extract unique locations by day, preserve order
        const locationsByDay = new Map<string, { location: string; fullLocation: string; events: Event[] }>()
        
        events.forEach(event => {
          const fullLoc = event.category === 'hotel' ? (event.accom_address || event.location || '') : (event.location || '')
          const simpleLoc = event.category === 'hotel' ? (event.accom_address || event.location || '') : (event.location || '')
          
          if (!simpleLoc) return
          
          if (!locationsByDay.has(event.day)) {
            locationsByDay.set(event.day, { location: simpleLoc, fullLocation: fullLoc, events: [] })
          }
          locationsByDay.get(event.day)!.events.push(event)
        })
        
        // Geocode each location
        const points: RoutePoint[] = []
        for (const [day, data] of locationsByDay.entries()) {
          const geocoded = await geocodeLocation(data.fullLocation)
          if (geocoded) {
            points.push({
              day,
              location: data.location,
              lat: geocoded.lat,
              lng: geocoded.lng,
              country: geocoded.country,
              fullLocation: data.fullLocation,
              events: data.events
            })
          }
        }
        
        // Calculate distances between consecutive points
        const segments: RouteSegment[] = points.map((point, idx) => {
          const segment: RouteSegment = { ...point }
          
          if (idx < points.length - 1) {
            const nextPoint = points[idx + 1]
            segment.nextPoint = nextPoint
            segment.countryChange = point.country !== nextPoint.country
            
            if (point.lat !== null && point.lng !== null && nextPoint.lat !== null && nextPoint.lng !== null) {
              segment.distanceKm = calculateDistance(point.lat, point.lng, nextPoint.lat, nextPoint.lng)
            }
          }
          
          return segment
        })
        
        setRoutePoints(segments)
      } catch (err) {
        console.error('Route building error:', err)
        setError('No se pudo cargar la ruta del viaje')
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

  if (error || routePoints.length === 0) {
    return null
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-6">
      <div className="flex items-center gap-2 mb-6">
        <MapPin size={18} strokeWidth={1.8} className="text-blue-600" />
        <h3 className="text-lg font-semibold text-slate-900">Ruta del viaje</h3>
      </div>
      
      <div className="space-y-4">
        {routePoints.map((segment, idx) => (
          <div key={idx}>
            {/* Location card */}
            <div className="flex items-start gap-4">
              {/* Country flag + location */}
              <div className="flex-1">
                <div className="text-base font-semibold text-slate-900 mb-1">
                  {segment.country}
                </div>
                <div className="text-sm text-slate-600 mb-2">
                  {segment.location}
                </div>
                <div className="text-xs text-slate-400 font-medium">
                  {formatDateRange(segment.day, segment.events[segment.events.length - 1]?.day || segment.day)}
                </div>
              </div>
              
              {/* Distance to next location */}
              {segment.nextPoint && segment.distanceKm !== undefined && (
                <div className="flex flex-col items-end">
                  <div className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium ${
                    segment.countryChange
                      ? 'bg-amber-50 text-amber-700 border border-amber-200'
                      : 'bg-blue-50 text-blue-700 border border-blue-200'
                  }`}>
                    {segment.distanceKm} km
                    {segment.countryChange && (
                      <span className="ml-1">🌍</span>
                    )}
                  </div>
                </div>
              )}
            </div>
            
            {/* Arrow to next */}
            {segment.nextPoint && (
              <div className="flex items-center justify-center py-3">
                <div className="text-slate-300 text-2xl">↓</div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
