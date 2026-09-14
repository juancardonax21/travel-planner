-- Medios de transporte con grano fino. 'transit' metía en el mismo saco el
-- autobús del aeropuerto, el metro y los tramos a pie, y 'train' no distinguía
-- el shinkansen del cercanías, así que en el planning no se veía cómo se viaja.
alter table public.events drop constraint if exists travel_mode_check;
alter table public.events add constraint travel_mode_check
  check (travel_mode is null or travel_mode in
    ('flight', 'shinkansen', 'train', 'metro', 'bus',
     'walking', 'driving', 'bicycling', 'boat', 'transit'));

-- Reclasificación de los traslados del viaje a Japón.
update public.events set travel_mode = 'bus'
 where trip_id = 'f4215d8a-1df5-492d-aac5-877d8f4e4df9' and day = '2026-12-25' and title = 'Bus limusina a T-CAT';
update public.events set travel_mode = 'walking'
 where trip_id = 'f4215d8a-1df5-492d-aac5-877d8f4e4df9' and day = '2026-12-25' and title = 'T-CAT → hotel, 8 min';
update public.events set travel_mode = 'metro'
 where trip_id = 'f4215d8a-1df5-492d-aac5-877d8f4e4df9' and day = '2026-12-26' and title = '→ Shibuya, 25 min';
update public.events set travel_mode = 'metro'
 where trip_id = 'f4215d8a-1df5-492d-aac5-877d8f4e4df9' and day = '2026-12-27' and title = 'Nijubashi → Yotsuya';
update public.events set travel_mode = 'metro'
 where trip_id = 'f4215d8a-1df5-492d-aac5-877d8f4e4df9' and day = '2026-12-27' and title = '→ Ginza, 9 min';
update public.events set travel_mode = 'walking'
 where trip_id = 'f4215d8a-1df5-492d-aac5-877d8f4e4df9' and day = '2026-12-29' and title = 'Foto del Skytree';
update public.events set travel_mode = 'shinkansen'
 where trip_id = 'f4215d8a-1df5-492d-aac5-877d8f4e4df9' and day = '2026-12-30' and title = 'Nozomi a Kioto';
update public.events set travel_mode = 'bus'
 where trip_id = 'f4215d8a-1df5-492d-aac5-877d8f4e4df9' and day = '2026-12-30' and title = 'Estación de Kioto → hotel';
update public.events set travel_mode = 'train'
 where trip_id = 'f4215d8a-1df5-492d-aac5-877d8f4e4df9' and day = '2026-12-31' and title = '→ Arashiyama';
update public.events set travel_mode = 'train'
 where trip_id = 'f4215d8a-1df5-492d-aac5-877d8f4e4df9' and day = '2027-01-02' and title = '→ Fushimi Inari';
update public.events set travel_mode = 'bus'
 where trip_id = 'f4215d8a-1df5-492d-aac5-877d8f4e4df9' and day = '2027-01-03' and title = 'Hotel → Estación de Kioto';
update public.events set travel_mode = 'metro'
 where trip_id = 'f4215d8a-1df5-492d-aac5-877d8f4e4df9' and day = '2027-01-03' and title = 'Namba → hotel';
update public.events set travel_mode = 'metro'
 where trip_id = 'f4215d8a-1df5-492d-aac5-877d8f4e4df9' and day = '2027-01-04' and title = '→ Shinsekai, Sakaisuji';
update public.events set travel_mode = 'metro'
 where trip_id = 'f4215d8a-1df5-492d-aac5-877d8f4e4df9' and day = '2027-01-04' and title = '→ Namba';
update public.events set travel_mode = 'metro'
 where trip_id = 'f4215d8a-1df5-492d-aac5-877d8f4e4df9' and day = '2027-01-05' and title = 'Kitahama → Kuromon';
update public.events set travel_mode = 'train'
 where trip_id = 'f4215d8a-1df5-492d-aac5-877d8f4e4df9' and day = '2027-01-05' and title = '→ Sumiyoshi, Nankai';
update public.events set travel_mode = 'metro'
 where trip_id = 'f4215d8a-1df5-492d-aac5-877d8f4e4df9' and day = '2027-01-05' and title = 'Shinsaibashi → Umeda';
update public.events set travel_mode = 'metro'
 where trip_id = 'f4215d8a-1df5-492d-aac5-877d8f4e4df9' and day = '2027-01-06' and title = 'A Shin-Osaka, Midosuji';
update public.events set travel_mode = 'shinkansen'
 where trip_id = 'f4215d8a-1df5-492d-aac5-877d8f4e4df9' and day = '2027-01-06' and title = 'Nozomi a Tokio';
update public.events set travel_mode = 'metro'
 where trip_id = 'f4215d8a-1df5-492d-aac5-877d8f4e4df9' and day = '2027-01-06' and title = 'Estación de Tokio → hotel';
update public.events set travel_mode = 'metro'
 where trip_id = 'f4215d8a-1df5-492d-aac5-877d8f4e4df9' and day = '2027-01-07' and title = 'Hotel → Tsukiji';
update public.events set travel_mode = 'metro'
 where trip_id = 'f4215d8a-1df5-492d-aac5-877d8f4e4df9' and day = '2027-01-07' and title = 'Tsukiji → hotel';
update public.events set travel_mode = 'walking'
 where trip_id = 'f4215d8a-1df5-492d-aac5-877d8f4e4df9' and day = '2027-01-07' and title = '→ T-CAT, 8 min';
update public.events set travel_mode = 'bus'
 where trip_id = 'f4215d8a-1df5-492d-aac5-877d8f4e4df9' and day = '2027-01-07' and title = 'Bus a Narita T2';

-- 24 traslados reclasificados.
