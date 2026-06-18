import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { differenceInDays, parseISO, format } from 'date-fns'
import { es } from 'date-fns/locale'
import type { Alert, BudgetItem, Traveler } from '@/types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function daysUntil(dateStr?: string): number | null {
  if (!dateStr) return null
  try {
    return differenceInDays(parseISO(dateStr), new Date())
  } catch { return null }
}

export function formatDate(dateStr: string, fmt = 'd MMM yyyy') {
  try { return format(parseISO(dateStr), fmt, { locale: es }) }
  catch { return dateStr }
}

export const CAT_CONFIG = {
  flight:    { label: 'Vuelo',      color: '#1D4ED8', bg: '#DBEAFE', emoji: '✈️' },
  hotel:     { label: 'Alojamiento', color: '#065F46', bg: '#D1FAE5', emoji: '🏨' },
  activity:  { label: 'Actividad',  color: '#5B21B6', bg: '#EDE9FE', emoji: '🎯' },
  meal:      { label: 'Comida',     color: '#92400E', bg: '#FEF3C7', emoji: '🍽️' },
  transport: { label: 'Transporte', color: '#991B1B', bg: '#FEE2E2', emoji: '🚗' },
  other:     { label: 'Otro',       color: '#374151', bg: '#F3F4F6', emoji: '📌' },
} as const

export const BCAT_CONFIG = {
  flights:    { label: 'Vuelos',      color: '#1D4ED8' },
  hotels:     { label: 'Hoteles',     color: '#065F46' },
  transport:  { label: 'Transporte',  color: '#991B1B' },
  activities: { label: 'Actividades', color: '#5B21B6' },
  meals:      { label: 'Comidas',     color: '#92400E' },
  other:      { label: 'Otros',       color: '#374151' },
} as const

export function buildAlerts(
  budgetItems: BudgetItem[],
  travelers: Traveler[]
): Alert[] {
  const alerts: Alert[] = []
  budgetItems.forEach(b => {
    if (!b.cancel_before) return
    const d = daysUntil(b.cancel_before)
    if (d === null) return
    if (d < 0) alerts.push({ level: 'red', message: `VENCIDA — Cancelación: ${b.description}`, type: 'cancel' })
    else if (d <= 7) alerts.push({ level: 'red', message: `En ${d} días — Cancelación: ${b.description}`, type: 'cancel' })
    else if (d <= 14) alerts.push({ level: 'amber', message: `En ${d} días — Cancelación: ${b.description}`, type: 'cancel' })
  })
  travelers.forEach(tv => {
    if (tv.passport_expiry) {
      const d = daysUntil(tv.passport_expiry)
      if (d !== null) {
        if (d < 0) alerts.push({ level: 'red', message: `Pasaporte caducado: ${tv.name}`, type: 'passport' })
        else if (d <= 90) alerts.push({ level: d <= 30 ? 'red' : 'amber', message: `Pasaporte caduca en ${d} días: ${tv.name}`, type: 'passport' })
      }
    }
    if (tv.esta_expiry) {
      const d = daysUntil(tv.esta_expiry)
      if (d !== null) {
        if (d < 0) alerts.push({ level: 'red', message: `ESTA caducada: ${tv.name}`, type: 'esta' })
        else if (d <= 90) alerts.push({ level: d <= 30 ? 'red' : 'amber', message: `ESTA caduca en ${d} días: ${tv.name}`, type: 'esta' })
      }
    }
  })
  return alerts
}

export const TRIP_COLORS = [
  'from-blue-700 to-violet-600',
  'from-emerald-600 to-teal-500',
  'from-orange-500 to-rose-500',
  'from-violet-700 to-purple-500',
  'from-cyan-600 to-blue-500',
]

// Currency formatting
// EUR: EUR 1.310,98  |  USD: US$ 1,310.98  |  others: CODE 0,000.00
export function formatCurrency(amount: number, currency: string, decimals = 2): string {
  const cur = (currency || 'USD').toUpperCase()

  if (cur === 'EUR') {
    const formatted = amount.toLocaleString('de-DE', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    })
    return `EUR ${formatted}`
  }

  if (cur === 'USD') {
    const formatted = amount.toLocaleString('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    })
    return `US$ ${formatted}`
  }

  if (cur === 'GBP') {
    const formatted = amount.toLocaleString('en-GB', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    })
    return `GBP ${formatted}`
  }

  const formatted = amount.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
  return `${cur} ${formatted}`
}
