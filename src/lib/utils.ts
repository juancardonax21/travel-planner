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
