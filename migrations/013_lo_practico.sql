-- Lo práctico de cada actividad.
--
-- Cuatro cosas que uno quiere saber delante del sitio, y que no caben en las
-- notas sueltas porque cada una se lee distinto:
--
--   porQue    por qué merece la pena, en una frase
--   queHacer  qué hacer allí, concreto
--   fotos     dónde y cuándo está la foto buena
--   comprar   qué llevarse, o qué hay que sacar antes, para que no se pase
--
-- Va en jsonb y no en cuatro columnas: son opcionales, no todas las
-- actividades tienen las cuatro, y así añadir una quinta no pide migración.

alter table public.events add column if not exists practico jsonb;
