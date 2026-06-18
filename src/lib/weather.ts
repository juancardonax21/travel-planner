const OWM_KEY = process.env.NEXT_PUBLIC_OWM_KEY || ''

export type WeatherDay = {
  temp: number
  temp_min: number
  temp_max: number
  feels_like: number
  description: string
  icon: string
  wind_speed: number
  rain_prob: number
}

export function weatherEmoji(icon: string): string {
  if (!icon) return '🌤️'
  if (icon.startsWith('01')) return '☀️'
  if (icon.startsWith('02')) return '🌤️'
  if (icon.startsWith('03')) return '⛅'
  if (icon.startsWith('04')) return '☁️'
  if (icon.startsWith('09')) return '🌧️'
  if (icon.startsWith('10')) return '🌦️'
  if (icon.startsWith('11')) return '⛈️'
  if (icon.startsWith('13')) return '❄️'
  if (icon.startsWith('50')) return '🌫️'
  // Open-Meteo WMO codes
  const code = parseInt(icon)
  if (code === 0) return '☀️'
  if (code <= 2) return '🌤️'
  if (code === 3) return '☁️'
  if (code <= 49) return '🌫️'
  if (code <= 59) return '🌦️'
  if (code <= 69) return '🌧️'
  if (code <= 79) return '❄️'
  if (code <= 84) return '🌦️'
  if (code <= 94) return '⛈️'
  return '🌤️'
}

// Open-Meteo: free, no API key, 16-day forecast
async function fetchOpenMeteo(destination: string): Promise<Record<string, WeatherDay>> {
  try {
    // First geocode the city
    const geo = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(destination.split(',')[0])}&count=1&language=es`
    )
    const geoData = await geo.json()
    if (!geoData.results?.[0]) return {}
    const { latitude, longitude } = geoData.results[0]

    // Fetch 16-day forecast
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_speed_10m_max&timezone=auto&forecast_days=16`
    const res = await fetch(url, { next: { revalidate: 3600 } })
    const data = await res.json()
    if (!data.daily) return {}

    const byDay: Record<string, WeatherDay> = {}
    data.daily.time.forEach((date: string, i: number) => {
      const code = String(data.daily.weather_code[i])
      const tMax = Math.round(data.daily.temperature_2m_max[i])
      const tMin = Math.round(data.daily.temperature_2m_min[i])
      byDay[date] = {
        temp: Math.round((tMax + tMin) / 2),
        temp_min: tMin,
        temp_max: tMax,
        feels_like: Math.round((tMax + tMin) / 2),
        description: wmoDescription(data.daily.weather_code[i]),
        icon: code,
        wind_speed: Math.round(data.daily.wind_speed_10m_max[i]),
        rain_prob: data.daily.precipitation_probability_max[i] || 0,
      }
    })
    return byDay
  } catch { return {} }
}

function wmoDescription(code: number): string {
  if (code === 0) return 'despejado'
  if (code <= 2) return 'parcialmente nublado'
  if (code === 3) return 'nublado'
  if (code <= 49) return 'niebla'
  if (code <= 59) return 'llovizna'
  if (code <= 69) return 'lluvia'
  if (code <= 79) return 'nieve'
  if (code <= 84) return 'chubascos'
  if (code <= 99) return 'tormenta'
  return 'variable'
}

// Fallback to OWM if Open-Meteo fails
async function fetchOWM(destination: string): Promise<Record<string, WeatherDay>> {
  if (!OWM_KEY) return {}
  try {
    const city = destination.split(',')[0].trim()
    const url = `https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(city)}&units=metric&cnt=40&appid=${OWM_KEY}`
    const res = await fetch(url, { next: { revalidate: 3600 } })
    const data = await res.json()
    if (!data.list) return {}
    const byDay: Record<string, WeatherDay> = {}
    data.list.forEach((item: any) => {
      const date = item.dt_txt.split(' ')[0]
      if (!byDay[date] || item.dt_txt.includes('12:00')) {
        byDay[date] = {
          temp: Math.round(item.main.temp),
          temp_min: Math.round(item.main.temp_min),
          temp_max: Math.round(item.main.temp_max),
          feels_like: Math.round(item.main.feels_like),
          description: item.weather[0]?.description || '',
          icon: item.weather[0]?.icon || '',
          wind_speed: Math.round((item.wind?.speed || 0) * 3.6),
          rain_prob: Math.round((item.pop || 0) * 100),
        }
      }
    })
    return byDay
  } catch { return {} }
}

export async function fetchWeather(destination: string): Promise<Record<string, WeatherDay>> {
  const result = await fetchOpenMeteo(destination)
  if (Object.keys(result).length > 0) return result
  return fetchOWM(destination)
}

export async function fetchExchangeRate(from: string, to: string): Promise<number | null> {
  try {
    const res = await fetch(`https://api.exchangerate-api.com/v4/latest/${from}`)
    const data = await res.json()
    return data.rates?.[to] ?? null
  } catch { return null }
}
