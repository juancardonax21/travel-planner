'use client'
import { useEffect, useRef } from 'react'

/* Un campo de texto que crece con lo que lleva dentro.
 *
 * El ancla del día se leía a medias: alto fijo de dos líneas y el texto se
 * cortaba justo donde empezaba lo que importaba. Un textarea no se estira
 * solo, así que hay que medirlo: se pone a cero y se le da el alto de su
 * propio contenido, al montarlo y cada vez que se escribe.
 */
export default function CampoCrece({
  className = '', onInput, ...props
}: React.ComponentProps<'textarea'>) {
  const ref = useRef<HTMLTextAreaElement>(null)

  const ajusta = () => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = el.scrollHeight + 'px'
  }

  useEffect(() => { ajusta() }, [props.defaultValue, props.value])

  /* Y otra vez si cambia el ancho: al girar el móvil o al estrecharse la
     ventana, el mismo texto ocupa más líneas y el alto medido se queda
     corto, que es justo cuando se nota el recorte. */
  useEffect(() => {
    const el = ref.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(() => ajusta())
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  return (
    <textarea
      {...props}
      ref={ref}
      rows={1}
      onInput={e => { ajusta(); onInput?.(e) }}
      className={`resize-none overflow-hidden ${className}`}
    />
  )
}
