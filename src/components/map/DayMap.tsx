'use client'
import { useEffect } from 'react'
import type { Event } from '@/types'
import { CAT_CONFIG } from '@/lib/utils'

export default function DayMap({ events }: { events: Event[] }) {
  useEffect(() => {
    if (typeof window === 'undefined') return
    import('leaflet').then(L => {
      const container = document.getElementById('day-map')
      if (!container) return
      // Clear previous map
      if ((container as any)._leaflet_id) return

      const center: [number, number] = events[0]?.lat && events[0]?.lng
        ? [events[0].lat, events[0].lng] : [0, 0]

      const map = L.map('day-map').setView(center, 13)
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap'
      }).addTo(map)

      events.forEach((ev, i) => {
        if (!ev.lat || !ev.lng) return
        const cfg = CAT_CONFIG[ev.category]
        const icon = L.divIcon({
          className: '',
          html: `<div style="background:${cfg.color};color:white;width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:14px;box-shadow:0 2px 8px rgba(0,0,0,0.3);border:2px solid white">${i+1}</div>`,
          iconSize: [32, 32], iconAnchor: [16, 16]
        })
        L.marker([ev.lat, ev.lng], { icon })
          .addTo(map)
          .bindPopup(`<strong>${ev.title}</strong><br>${ev.location || ''}`)
      })

      if (events.length > 1) {
        const coords = events.filter(e => e.lat && e.lng).map(e => [e.lat!, e.lng!] as [number,number])
        L.polyline(coords, { color: '#2563EB', weight: 2, dashArray: '5,8', opacity: 0.6 }).addTo(map)
        map.fitBounds(L.latLngBounds(coords), { padding: [20, 20] })
      }
    })
  }, [events])

  return <div id="day-map" className="w-full h-full" />
}
