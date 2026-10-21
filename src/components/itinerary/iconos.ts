import {
  Plane, TrainFront, Train, Bus, Footprints, Car, Bike, Ship,
  BedDouble, Compass, UtensilsCrossed, Tag, type LucideIcon,
} from 'lucide-react'
import IconoMetro from './IconoMetro'
import { CAT_CONFIG } from '@/lib/utils'
import type { Event } from '@/types'

/* Los iconos del itinerario, en un solo sitio.
 *
 * Estaban por duplicado en la cuadrícula y en la lista del día, y se notó: al
 * metro le puse su símbolo en la cuadrícula y en la lista seguía saliendo la
 * etiqueta genérica, que de hecho parecía un ticket. Una sola tabla y ya no
 * puede volver a pasar.
 *
 * El morro del TrainFront es el shinkansen; el de vagones, el cercanías. El
 * metro no lleva icono de lucide: a doce píxeles el tren en túnel no se
 * distinguía del de cercanías. Va la M en un círculo, que es símbolo de metro
 * en medio mundo y a ese tamaño se reconoce por la silueta.
 */

export type IconoLista = LucideIcon | typeof IconoMetro

export const MODE_ICON: Record<string, IconoLista> = {
  flight: Plane, shinkansen: TrainFront, train: Train, metro: IconoMetro,
  bus: Bus, walking: Footprints, driving: Car, bicycling: Bike, boat: Ship,
  transit: Bus,
}

export const MODE_LABEL: Record<string, string> = {
  flight: 'Avión', shinkansen: 'Tren de alta velocidad', train: 'Tren',
  metro: 'Metro', bus: 'Autobús', walking: 'A pie', driving: 'Coche o taxi',
  bicycling: 'Bicicleta', boat: 'Barco', transit: 'Transporte público',
}

export const CAT_ICON: Record<string, IconoLista> = {
  transport: Car, hotel: BedDouble, activity: Compass,
  meal: UtensilsCrossed, other: Tag,
}

export function eventIcon(ev: Event): IconoLista {
  if (ev.category === 'transport') return MODE_ICON[(ev as any).travel_mode] || Car
  return CAT_ICON[ev.category] || Tag
}

/* Lo que diría el icono si pudiera hablar. Va en el title, para quien dude de
   un símbolo, y evita tener que repetirlo al lado en una etiqueta. */
export function etiquetaEvento(ev: Event): string {
  if (ev.category === 'transport') {
    return MODE_LABEL[(ev as any).travel_mode] || 'Transporte'
  }
  return CAT_CONFIG[ev.category as keyof typeof CAT_CONFIG]?.label || 'Otro'
}
