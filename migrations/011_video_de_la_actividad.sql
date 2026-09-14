-- El vídeo de la actividad.
--
-- Un id de YouTube, no una URL: con el id se arma sola la miniatura
-- (i.ytimg.com/vi/<id>/mqdefault.jpg) y el enlace para verlo. Guardar la URL
-- entera obligaría a extraer el id cada vez y aguanta peor los formatos
-- raros de YouTube.
--
-- No se usa la columna url, que ya lleva los enlaces de Google Maps de los
-- traslados y la página de la reserva del taller de palillos.

alter table public.events add column if not exists video_id text;
