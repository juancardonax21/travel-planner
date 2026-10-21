'use client'

/* El símbolo del metro.
 *
 * El icono que había era un tren entrando en un túnel: a doce píxeles, dentro
 * de una banda de color, no se distinguía del de cercanías ni del shinkansen.
 * A ese tamaño no hay sitio para dibujar un tren, así que se usa lo que sirve
 * de símbolo de metro en medio mundo: la M dentro de un círculo. Dos trazos
 * gruesos, legibles en blanco sobre color.
 *
 * Se dibuja con el grosor que le pasen, como cualquier icono de lucide, para
 * que no desentone al lado de los demás.
 */
export default function IconoMetro(
  { size = 16, strokeWidth = 2, className = '', style }:
  { size?: number; strokeWidth?: number; className?: string; style?: React.CSSProperties }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"
      className={className} style={style} aria-hidden>
      <circle cx="12" cy="12" r="9.5" />
      <path d="M7.8 15.6V8.4l4.2 4.6 4.2-4.6v7.2" />
    </svg>
  )
}
