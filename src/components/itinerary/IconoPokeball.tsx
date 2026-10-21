/* Una pokéball, en color.
 *
 * El resto de la iconografía del viaje es monocroma y discreta a propósito,
 * porque hay ciento cincuenta eventos y si todos gritan no se oye ninguno.
 * Esta grita adrede: sale en cuatro sitios de todo el viaje, y justamente
 * por ser la única en color se ve desde el otro lado de la pantalla.
 *
 * Dibujada a mano y no traída de ninguna librería: el rojo y el negro son
 * los del juguete de siempre, y a doce píxeles sigue reconociéndose porque
 * la silueta es un círculo con una banda en medio.
 */
export default function IconoPokeball({
  size = 16, className = '', style,
}: { size?: number; className?: string; style?: React.CSSProperties }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} style={style}
      aria-hidden="true" focusable="false">
      <circle cx="12" cy="12" r="10.5" fill="#F5F5F5" />
      <path d="M1.5 12a10.5 10.5 0 0 1 21 0z" fill="#EE1515" />
      <path d="M1.5 12h21" stroke="#1F2937" strokeWidth="2.6" />
      <circle cx="12" cy="12" r="4.1" fill="#F5F5F5" stroke="#1F2937" strokeWidth="2.2" />
      <circle cx="12" cy="12" r="1.7" fill="#F5F5F5" stroke="#1F2937" strokeWidth="1.2" />
      <circle cx="12" cy="12" r="10.5" fill="none" stroke="#1F2937" strokeWidth="1.6" />
    </svg>
  )
}
