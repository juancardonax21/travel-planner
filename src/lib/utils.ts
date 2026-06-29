export const CAT_CONFIG = {
  transport: { label: 'Transporte', color: '#1D4ED8', bg: '#DBEAFE', emoji: '✈️' },
  hotel:     { label: 'Alojamiento', color: '#065F46', bg: '#D1FAE5', emoji: '🏨' },
  activity:  { label: 'Actividad',  color: '#5B21B6', bg: '#EDE9FE', emoji: '🎯' },
  meal:      { label: 'Comida',     color: '#92400E', bg: '#FEF3C7', emoji: '🍽️' },
  other:     { label: 'Otro',       color: '#374151', bg: '#F3F4F6', emoji: '📌' },
} as const

export const BCAT_CONFIG = {
  flights:    { label: 'Vuelos',      color: '#1D4ED8' },
  hotels:     { label: 'Hoteles',     color: '#065F46' },
  transport:  { label: 'Transporte',  color: '#1D4ED8' },
  activities: { label: 'Actividades', color: '#5B21B6' },
  meals:      { label: 'Comidas',     color: '#92400E' },
  other:      { label: 'Otros',       color: '#374151' },
} as const

export function daysUntil(dateStr: string): number {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = new Date(dateStr + 'T00:00:00')
  const diff = target.getTime() - today.getTime()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

export function formatDate(dateStr: string, format: string = 'd MMM yyyy'): string {
  if (!dateStr) return ''
  const date = new Date(dateStr + 'T00:00:00')
  const options: Intl.DateTimeFormatOptions = {}
  
  if (format.includes('EEEE')) {
    return date.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' })
  }
  if (format.includes('d MMM yyyy')) {
    return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })
  }
  if (format.includes('d MMM')) {
    return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
  }
  if (format.includes('MMM yyyy')) {
    return date.toLocaleDateString('es-ES', { month: 'short', year: 'numeric' })
  }
  return date.toLocaleDateString('es-ES')
}

export function formatCurrency(amount: number, currency: string = 'EUR'): string {
  const formatter = new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })
  return formatter.format(amount)
}

export function buildAlerts(
  budgetItems: any[],
  travelers: any[],
  events: any[],
  trip: any
): Array<{ type: 'warning' | 'error' | 'info'; message: string; icon?: string }> {
  const alerts: Array<{ type: 'warning' | 'error' | 'info'; message: string; icon?: string }> = []
  
  // Budget alerts
  budgetItems?.forEach((item: any) => {
    if (item.spent > item.budget * 0.9) {
      alerts.push({
        type: 'warning',
        message: `${item.category} está al ${Math.round((item.spent / item.budget) * 100)}% del presupuesto`,
        icon: '💰',
      })
    }
  })
  
  // Document alerts
  travelers?.forEach((traveler: any) => {
    const today = new Date().toISOString().split('T')[0]
    if (traveler.passport_expiry && traveler.passport_expiry < trip?.end_date) {
      alerts.push({
        type: 'error',
        message: `Pasaporte de ${traveler.name} vence antes de terminar el viaje`,
        icon: '📕',
      })
    }
    if (traveler.esta_expiry && traveler.esta_expiry < today) {
      alerts.push({
        type: 'error',
        message: `ESTA de ${traveler.name} ha expirado`,
        icon: '🚫',
      })
    }
  })
  
  return alerts
}
