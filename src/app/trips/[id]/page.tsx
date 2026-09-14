import { redirect } from 'next/navigation'

/* Entrar en un viaje es entrar en su plan.
 *
 * Aquí había una portada: la foto a pantalla completa con un efecto de
 * acercamiento, y debajo una lista de atajos a las mismas pestañas que ya
 * están en la cabecera. Un clic de más para no ver nada que no estuviera ya.
 *
 * La foto no se pierde: sigue siendo el fondo de la cabecera del viaje.
 */
export default function TripHomePage({ params }: { params: { id: string } }) {
  redirect(`/trips/${params.id}/itinerary`)
}
