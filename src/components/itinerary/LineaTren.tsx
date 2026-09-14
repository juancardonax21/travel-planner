'use client'

/* La chapa de la línea.
 *
 * En una estación japonesa no se busca el nombre: se busca el color y la
 * letra. La Hanzomon es el círculo morado con una Z, la Midosuji el rojo con
 * una M. Puestos así, el traslado se reconoce antes de leerlo.
 *
 * Los colores y los códigos son los oficiales de cada operador. Las líneas de
 * las que no tengo el color exacto -algunas de JR y las privadas- salen en
 * gris con su nombre: es mejor no enseñar un color que enseñar uno inventado,
 * porque el color es justamente lo que se va a buscar en el andén.
 */

type Linea = { nombre: string; codigo: string; color: string; operador: string }

export const LINEAS: Record<string, Linea> = {
  // Tokyo Metro
  ginza:       { nombre: 'Ginza',       codigo: 'G', color: '#FF9500', operador: 'Tokyo Metro' },
  marunouchi:  { nombre: 'Marunouchi',  codigo: 'M', color: '#F62E36', operador: 'Tokyo Metro' },
  hibiya:      { nombre: 'Hibiya',      codigo: 'H', color: '#B5B5AC', operador: 'Tokyo Metro' },
  tozai:       { nombre: 'Tozai',       codigo: 'T', color: '#009BBF', operador: 'Tokyo Metro' },
  chiyoda:     { nombre: 'Chiyoda',     codigo: 'C', color: '#00BB85', operador: 'Tokyo Metro' },
  yurakucho:   { nombre: 'Yurakucho',   codigo: 'Y', color: '#C1A470', operador: 'Tokyo Metro' },
  hanzomon:    { nombre: 'Hanzomon',    codigo: 'Z', color: '#8F76D6', operador: 'Tokyo Metro' },
  namboku:     { nombre: 'Namboku',     codigo: 'N', color: '#00AC9B', operador: 'Tokyo Metro' },
  fukutoshin:  { nombre: 'Fukutoshin',  codigo: 'F', color: '#9C5E31', operador: 'Tokyo Metro' },
  // Toei
  oedo:        { nombre: 'Oedo',        codigo: 'E', color: '#B6007A', operador: 'Toei' },
  // Osaka Metro
  midosuji:    { nombre: 'Midosuji',    codigo: 'M', color: '#E5171F', operador: 'Osaka Metro' },
  tanimachi:   { nombre: 'Tanimachi',   codigo: 'T', color: '#522886', operador: 'Osaka Metro' },
  chuo:        { nombre: 'Chuo',        codigo: 'C', color: '#019A66', operador: 'Osaka Metro' },
  sakaisuji:   { nombre: 'Sakaisuji',   codigo: 'K', color: '#814721', operador: 'Osaka Metro' },
  sennichimae: { nombre: 'Sennichimae', codigo: 'S', color: '#E44D93', operador: 'Osaka Metro' },
  // JR y privadas de las que no doy color: gris, con el nombre entero
  jr_nara:     { nombre: 'JR Nara',     codigo: 'JR', color: '#64748B', operador: 'JR West' },
  jr_sagano:   { nombre: 'JR Sagano',   codigo: 'JR', color: '#64748B', operador: 'JR West' },
  jr_kyoto:    { nombre: 'JR Kioto',    codigo: 'JR', color: '#64748B', operador: 'JR West' },
  jr_yumesaki: { nombre: 'JR Yumesaki', codigo: 'JR', color: '#64748B', operador: 'JR West' },
  keihan:      { nombre: 'Keihan',      codigo: 'KH', color: '#64748B', operador: 'Keihan' },
  kintetsu:    { nombre: 'Kintetsu',    codigo: 'A',  color: '#64748B', operador: 'Kintetsu' },
  nankai:      { nombre: 'Nankai',      codigo: 'NK', color: '#64748B', operador: 'Nankai' },
}

export default function LineaTren({ clave, direccion }: { clave: string; direccion?: string }) {
  const l = LINEAS[clave]
  if (!l) return null
  return (
    <span className="inline-flex items-center gap-2">
      <span className="flex items-center justify-center rounded-full text-white font-bold flex-shrink-0"
        style={{ background: l.color, width: 26, height: 26, fontSize: l.codigo.length > 1 ? 10 : 13 }}>
        {l.codigo}
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-slate-800 leading-tight">
          Línea {l.nombre}
        </span>
        <span className="block text-[11px] text-slate-500 leading-tight">
          {l.operador}{direccion ? ` · dirección ${direccion}` : ''}
        </span>
      </span>
    </span>
  )
}
