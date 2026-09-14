/* Service worker del Travel Planner.
 *
 * El viaje se consulta en Japón, donde puede no haber datos o el roaming ser
 * caro. Sin esto, cada pantalla es una consulta en vivo y la app queda vacía
 * justo cuando más falta hace: en el andén, buscando el número de reserva.
 *
 * Estrategia por tipo de petición:
 *   - Estáticos (_next/static, iconos): cache-first. Llevan hash en el nombre,
 *     así que nunca cambian bajo el mismo nombre.
 *   - Navegación: network-first con la copia como respaldo.
 *   - Lecturas de Supabase (GET): network-first, guardando copia. Sin red se
 *     sirve la última buena.
 *   - Escrituras y todo lo demás: directo a la red, sin tocar la caché.
 */

const VERSION = 'v1'
const ESTATICOS = `estaticos-${VERSION}`
const PAGINAS = `paginas-${VERSION}`
const DATOS = `datos-${VERSION}`
const CACHES = [ESTATICOS, PAGINAS, DATOS]

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const nombres = await caches.keys()
    await Promise.all(nombres.filter(n => !CACHES.includes(n)).map(n => caches.delete(n)))
    await self.clients.claim()
  })())
})

/** Guarda una copia sin romper si la caché está llena o la respuesta no vale. */
async function guardar(cache, request, response) {
  if (!response || !response.ok || response.type === 'opaque') return
  try {
    await (await caches.open(cache)).put(request, response.clone())
  } catch (_) { /* cuota llena: seguimos sirviendo igual */ }
}

async function primeroRed(request, cache) {
  try {
    const res = await fetch(request)
    await guardar(cache, request, res)
    return res
  } catch (err) {
    const copia = await caches.match(request)
    if (copia) return copia
    throw err
  }
}

async function primeroCache(request, cache) {
  const copia = await caches.match(request)
  if (copia) return copia
  const res = await fetch(request)
  await guardar(cache, request, res)
  return res
}

self.addEventListener('fetch', event => {
  const { request } = event
  if (request.method !== 'GET') return          // las escrituras nunca se cachean

  const url = new URL(request.url)

  // Navegación: si no hay red, la última versión de esa página.
  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        return await primeroRed(request, PAGINAS)
      } catch (_) {
        return (await caches.match(request)) || (await caches.match('/trips')) ||
               new Response('Sin conexión y sin copia guardada de esta página.',
                 { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } })
      }
    })())
    return
  }

  // Estáticos del propio dominio.
  if (url.origin === self.location.origin &&
      (url.pathname.startsWith('/_next/static/') || /\.(png|svg|ico|woff2?|css|js)$/.test(url.pathname))) {
    event.respondWith(primeroCache(request, ESTATICOS))
    return
  }

  // Lecturas de datos del viaje.
  if (url.pathname.includes('/rest/v1/')) {
    event.respondWith(primeroRed(request, DATOS))
    return
  }
})
