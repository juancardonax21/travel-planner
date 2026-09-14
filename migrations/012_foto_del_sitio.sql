-- La foto del sitio.
--
-- Las actividades enseñan un vídeo. Los hoteles y las comidas no tienen
-- vídeo que enseñar, pero sí sitio: el hotel es un edificio concreto, y una
-- cena en Dotonbori es Dotonbori aunque no esté elegido el restaurante.
--
-- Se guarda la referencia de foto de Google Places, no la URL: la URL lleva
-- dentro la clave de la API, y guardarla ahí significaría que rotar la clave
-- rompe todas las imágenes. La página arma la URL al pintar, con la clave
-- pública que ya usa el mapa.

alter table public.events add column if not exists foto_ref text;
