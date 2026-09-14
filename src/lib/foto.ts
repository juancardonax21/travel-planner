/* La foto de un sitio.
 *
 * Se guarda la referencia de Google Places, no la URL: la URL lleva dentro la
 * clave de la API, y guardarla en la base significaría que rotar la clave
 * rompe de golpe todas las imágenes del viaje. Se arma al pintar, con la
 * misma clave pública que ya usa el mapa.
 */
export function fotoDeSitio(ref?: string | null, ancho = 640): string | null {
  const clave = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
  if (!ref || !clave) return null
  return 'https://maps.googleapis.com/maps/api/place/photo'
    + `?maxwidth=${ancho}&photo_reference=${encodeURIComponent(ref)}&key=${clave}`
}
