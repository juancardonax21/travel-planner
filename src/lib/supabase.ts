import { createBrowserClient } from '@supabase/ssr'

/* La sesión va en cookies, no en localStorage.
 *
 * iOS vacía el localStorage de las apps guardadas en la pantalla de inicio
 * —tope de 7 días, y antes si al sistema le falta espacio—, así que la sesión
 * se perdía y había que volver a entrar con la contraseña. Las cookies que
 * reescribe el servidor en cada petición no sufren ese borrado.
 */
export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)
