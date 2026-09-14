-- Forma de pago de cada gasto: 'prepago' (ya pagado o se paga online con
-- tarjeta), 'tarjeta' (se paga allí y aceptan) o 'efectivo' (solo metálico).
-- En Japón todavía hay bastante sitio que no acepta tarjeta, sobre todo
-- templos, puestos de mercado y locales pequeños.
alter table public.events add column if not exists payment_method text;
alter table public.events drop constraint if exists payment_method_check;
alter table public.events add constraint payment_method_check
  check (payment_method is null or payment_method in ('prepago', 'tarjeta', 'efectivo'));

-- Punto de partida: todo lo que cuesta dinero, a tarjeta.
update public.events set payment_method = 'tarjeta'
 where trip_id = 'f4215d8a-1df5-492d-aac5-877d8f4e4df9' and cost > 0;

-- Y ahora lo que no es tarjeta, con el motivo anotado.
update public.events set payment_method = 'prepago',
       note = coalesce(note || ' · ', '') || 'Pago: Ya pagado.'
 where trip_id = 'f4215d8a-1df5-492d-aac5-877d8f4e4df9' and day = '2026-12-24' and title = 'Vuelo Madrid-Tokio';
update public.events set payment_method = 'efectivo',
       note = coalesce(note || ' · ', '') || 'Pago: Ramen de madrugada o konbini; llevad suelto por si acaso.'
 where trip_id = 'f4215d8a-1df5-492d-aac5-877d8f4e4df9' and day = '2026-12-25' and title = 'Cena junto al hotel';
update public.events set payment_method = 'prepago',
       note = coalesce(note || ' · ', '') || 'Pago: Reserva confirmada, cargo a tarjeta.'
 where trip_id = 'f4215d8a-1df5-492d-aac5-877d8f4e4df9' and day = '2026-12-25' and title = 'Minn Nihonbashi Suitengumae';
update public.events set payment_method = 'tarjeta',
       note = coalesce(note || ' · ', '') || 'Pago: La mayoría de restaurantes urbanos acepta tarjeta, pero los locales pequeños no: llevad efectivo de reserva.'
 where trip_id = 'f4215d8a-1df5-492d-aac5-877d8f4e4df9' and day = '2026-12-26' and title = 'Desayuno';
update public.events set payment_method = 'tarjeta',
       note = coalesce(note || ' · ', '') || 'Pago: La mayoría de restaurantes urbanos acepta tarjeta, pero los locales pequeños no: llevad efectivo de reserva.'
 where trip_id = 'f4215d8a-1df5-492d-aac5-877d8f4e4df9' and day = '2026-12-26' and title = 'Comida';
update public.events set payment_method = 'prepago',
       note = coalesce(note || ' · ', '') || 'Pago: Entrada online con tarjeta.'
 where trip_id = 'f4215d8a-1df5-492d-aac5-877d8f4e4df9' and day = '2026-12-26' and title = 'Shibuya Sky';
update public.events set payment_method = 'efectivo',
       note = coalesce(note || ' · ', '') || 'Pago: Omoide Yokocho son puestos diminutos: efectivo.'
 where trip_id = 'f4215d8a-1df5-492d-aac5-877d8f4e4df9' and day = '2026-12-26' and title = 'Cena en Shinjuku';
update public.events set payment_method = 'prepago',
       note = coalesce(note || ' · ', '') || 'Pago: GetYourGuide, con tarjeta.'
 where trip_id = 'f4215d8a-1df5-492d-aac5-877d8f4e4df9' and day = '2026-12-27' and title = 'Taller de palillos';
update public.events set payment_method = 'tarjeta',
       note = coalesce(note || ' · ', '') || 'Pago: La mayoría de restaurantes urbanos acepta tarjeta, pero los locales pequeños no: llevad efectivo de reserva.'
 where trip_id = 'f4215d8a-1df5-492d-aac5-877d8f4e4df9' and day = '2026-12-27' and title = 'Desayuno + metro';
update public.events set payment_method = 'tarjeta',
       note = coalesce(note || ' · ', '') || 'Pago: La mayoría de restaurantes urbanos acepta tarjeta, pero los locales pequeños no: llevad efectivo de reserva.'
 where trip_id = 'f4215d8a-1df5-492d-aac5-877d8f4e4df9' and day = '2026-12-27' and title = 'Comida ligera';
update public.events set payment_method = 'tarjeta',
       note = coalesce(note || ' · ', '') || 'Pago: La mayoría de restaurantes urbanos acepta tarjeta, pero los locales pequeños no: llevad efectivo de reserva.'
 where trip_id = 'f4215d8a-1df5-492d-aac5-877d8f4e4df9' and day = '2026-12-27' and title = 'Cena';
update public.events set payment_method = 'prepago',
       note = coalesce(note || ' · ', '') || 'Pago: GetYourGuide, con tarjeta. El teleférico de allí, en efectivo.'
 where trip_id = 'f4215d8a-1df5-492d-aac5-877d8f4e4df9' and day = '2026-12-28' and title = 'Monte Fuji y los lagos';
update public.events set payment_method = 'tarjeta',
       note = coalesce(note || ' · ', '') || 'Pago: La mayoría de restaurantes urbanos acepta tarjeta, pero los locales pequeños no: llevad efectivo de reserva.'
 where trip_id = 'f4215d8a-1df5-492d-aac5-877d8f4e4df9' and day = '2026-12-28' and title = 'Cena tranquila';
update public.events set payment_method = 'tarjeta',
       note = coalesce(note || ' · ', '') || 'Pago: La mayoría de restaurantes urbanos acepta tarjeta, pero los locales pequeños no: llevad efectivo de reserva.'
 where trip_id = 'f4215d8a-1df5-492d-aac5-877d8f4e4df9' and day = '2026-12-29' and title = 'Desayuno';
update public.events set payment_method = 'efectivo',
       note = coalesce(note || ' · ', '') || 'Pago: La propina se da en mano.'
 where trip_id = 'f4215d8a-1df5-492d-aac5-877d8f4e4df9' and day = '2026-12-29' and title = 'Free tour de Asakusa';
update public.events set payment_method = 'tarjeta',
       note = coalesce(note || ' · ', '') || 'Pago: La mayoría de restaurantes urbanos acepta tarjeta, pero los locales pequeños no: llevad efectivo de reserva.'
 where trip_id = 'f4215d8a-1df5-492d-aac5-877d8f4e4df9' and day = '2026-12-29' and title = 'Cena y maletas';
update public.events set payment_method = 'efectivo',
       note = coalesce(note || ' · ', '') || 'Pago: El plan lo indica: solo efectivo.'
 where trip_id = 'f4215d8a-1df5-492d-aac5-877d8f4e4df9' and day = '2026-12-29' and title = 'Tempura Daikokuya';
update public.events set payment_method = 'efectivo',
       note = coalesce(note || ' · ', '') || 'Pago: El plan lo indica: no acepta tarjeta ni IC.'
 where trip_id = 'f4215d8a-1df5-492d-aac5-877d8f4e4df9' and day = '2026-12-30' and title = 'Kiyomizu-dera';
update public.events set payment_method = 'prepago',
       note = coalesce(note || ' · ', '') || 'Pago: Reserva confirmada, cargo a tarjeta.'
 where trip_id = 'f4215d8a-1df5-492d-aac5-877d8f4e4df9' and day = '2026-12-30' and title = 'APA Hotel Kyoto Gion Excellent';
update public.events set payment_method = 'tarjeta',
       note = coalesce(note || ' · ', '') || 'Pago: La mayoría de restaurantes urbanos acepta tarjeta, pero los locales pequeños no: llevad efectivo de reserva.'
 where trip_id = 'f4215d8a-1df5-492d-aac5-877d8f4e4df9' and day = '2026-12-30' and title = 'Comida';
update public.events set payment_method = 'tarjeta',
       note = coalesce(note || ' · ', '') || 'Pago: La mayoría de restaurantes urbanos acepta tarjeta, pero los locales pequeños no: llevad efectivo de reserva.'
 where trip_id = 'f4215d8a-1df5-492d-aac5-877d8f4e4df9' and day = '2026-12-30' and title = 'Cena';
update public.events set payment_method = 'prepago',
       note = coalesce(note || ' · ', '') || 'Pago: Smart EX: se reserva y se paga online con tarjeta.'
 where trip_id = 'f4215d8a-1df5-492d-aac5-877d8f4e4df9' and day = '2026-12-30' and title = 'Nozomi a Kioto';
update public.events set payment_method = 'efectivo',
       note = coalesce(note || ' · ', '') || 'Pago: Entrada de templo (Tenryu-ji): taquilla en efectivo.'
 where trip_id = 'f4215d8a-1df5-492d-aac5-877d8f4e4df9' and day = '2026-12-31' and title = 'Bosque de bambú';
update public.events set payment_method = 'tarjeta',
       note = coalesce(note || ' · ', '') || 'Pago: La mayoría de restaurantes urbanos acepta tarjeta, pero los locales pequeños no: llevad efectivo de reserva.'
 where trip_id = 'f4215d8a-1df5-492d-aac5-877d8f4e4df9' and day = '2026-12-31' and title = 'Comida en Arashiyama';
update public.events set payment_method = 'efectivo',
       note = coalesce(note || ' · ', '') || 'Pago: Taquilla pequeña de parque: contad con efectivo.'
 where trip_id = 'f4215d8a-1df5-492d-aac5-877d8f4e4df9' and day = '2026-12-31' and title = 'Monos de Iwatayama';
update public.events set payment_method = 'efectivo',
       note = coalesce(note || ' · ', '') || 'Pago: Puesto de santuario en Nochevieja: solo efectivo.'
 where trip_id = 'f4215d8a-1df5-492d-aac5-877d8f4e4df9' and day = '2026-12-31' and title = 'Okera mairi en Yasaka';
update public.events set payment_method = 'efectivo',
       note = coalesce(note || ' · ', '') || 'Pago: Local pequeño y noche de fin de año: contad con efectivo.'
 where trip_id = 'f4215d8a-1df5-492d-aac5-877d8f4e4df9' and day = '2026-12-31' and title = 'Toshikoshi soba';
update public.events set payment_method = 'efectivo',
       note = coalesce(note || ' · ', '') || 'Pago: Año Nuevo: konbini y cadenas, y muchas cajas solo en metálico.'
 where trip_id = 'f4215d8a-1df5-492d-aac5-877d8f4e4df9' and day = '2027-01-01' and title = 'Comida';
update public.events set payment_method = 'tarjeta',
       note = coalesce(note || ' · ', '') || 'Pago: La mayoría de restaurantes urbanos acepta tarjeta, pero los locales pequeños no: llevad efectivo de reserva.'
 where trip_id = 'f4215d8a-1df5-492d-aac5-877d8f4e4df9' and day = '2027-01-01' and title = 'Desayuno largo';
update public.events set payment_method = 'efectivo',
       note = coalesce(note || ' · ', '') || 'Pago: Entradas de templo: taquilla en efectivo.'
 where trip_id = 'f4215d8a-1df5-492d-aac5-877d8f4e4df9' and day = '2027-01-01' and title = 'Kinkaku-ji y Ryoan-ji';
update public.events set payment_method = 'tarjeta',
       note = coalesce(note || ' · ', '') || 'Pago: La mayoría de restaurantes urbanos acepta tarjeta, pero los locales pequeños no: llevad efectivo de reserva.'
 where trip_id = 'f4215d8a-1df5-492d-aac5-877d8f4e4df9' and day = '2027-01-01' and title = 'Cena';
update public.events set payment_method = 'tarjeta',
       note = coalesce(note || ' · ', '') || 'Pago: La mayoría de restaurantes urbanos acepta tarjeta, pero los locales pequeños no: llevad efectivo de reserva.'
 where trip_id = 'f4215d8a-1df5-492d-aac5-877d8f4e4df9' and day = '2027-01-02' and title = 'Cena';
update public.events set payment_method = 'tarjeta',
       note = coalesce(note || ' · ', '') || 'Pago: La mayoría de restaurantes urbanos acepta tarjeta, pero los locales pequeños no: llevad efectivo de reserva.'
 where trip_id = 'f4215d8a-1df5-492d-aac5-877d8f4e4df9' and day = '2027-01-02' and title = 'Comida';
update public.events set payment_method = 'efectivo',
       note = coalesce(note || ' · ', '') || 'Pago: Entrada de templo: taquilla en efectivo.'
 where trip_id = 'f4215d8a-1df5-492d-aac5-877d8f4e4df9' and day = '2027-01-02' and title = 'Sanjusangendo';
update public.events set payment_method = 'tarjeta',
       note = coalesce(note || ' · ', '') || 'Pago: La mayoría de restaurantes urbanos acepta tarjeta, pero los locales pequeños no: llevad efectivo de reserva.'
 where trip_id = 'f4215d8a-1df5-492d-aac5-877d8f4e4df9' and day = '2027-01-02' and title = 'Desayuno';
update public.events set payment_method = 'tarjeta',
       note = coalesce(note || ' · ', '') || 'Pago: La mayoría de restaurantes urbanos acepta tarjeta, pero los locales pequeños no: llevad efectivo de reserva.'
 where trip_id = 'f4215d8a-1df5-492d-aac5-877d8f4e4df9' and day = '2027-01-03' and title = 'Cena en Dotonbori';
update public.events set payment_method = 'prepago',
       note = coalesce(note || ' · ', '') || 'Pago: Reserva confirmada, cargo a tarjeta.'
 where trip_id = 'f4215d8a-1df5-492d-aac5-877d8f4e4df9' and day = '2027-01-03' and title = 'Sotetsu Fresa Inn Kitahama';
update public.events set payment_method = 'tarjeta',
       note = coalesce(note || ' · ', '') || 'Pago: La mayoría de restaurantes urbanos acepta tarjeta, pero los locales pequeños no: llevad efectivo de reserva.'
 where trip_id = 'f4215d8a-1df5-492d-aac5-877d8f4e4df9' and day = '2027-01-03' and title = 'Comida';
update public.events set payment_method = 'efectivo',
       note = coalesce(note || ' · ', '') || 'Pago: Galletas de vendedor callejero: monedas.'
 where trip_id = 'f4215d8a-1df5-492d-aac5-877d8f4e4df9' and day = '2027-01-03' and title = 'Kofuku-ji y los ciervos';
update public.events set payment_method = 'efectivo',
       note = coalesce(note || ' · ', '') || 'Pago: Entrada de templo: taquilla en efectivo.'
 where trip_id = 'f4215d8a-1df5-492d-aac5-877d8f4e4df9' and day = '2027-01-03' and title = 'Todai-ji';
update public.events set payment_method = 'efectivo',
       note = coalesce(note || ' · ', '') || 'Pago: El plan lo indica: Daruma es solo efectivo.'
 where trip_id = 'f4215d8a-1df5-492d-aac5-877d8f4e4df9' and day = '2027-01-04' and title = 'Kushikatsu en Shinsekai';
update public.events set payment_method = 'tarjeta',
       note = coalesce(note || ' · ', '') || 'Pago: La mayoría de restaurantes urbanos acepta tarjeta, pero los locales pequeños no: llevad efectivo de reserva.'
 where trip_id = 'f4215d8a-1df5-492d-aac5-877d8f4e4df9' and day = '2027-01-04' and title = 'Cena en Namba';
update public.events set payment_method = 'tarjeta',
       note = coalesce(note || ' · ', '') || 'Pago: La mayoría de restaurantes urbanos acepta tarjeta, pero los locales pequeños no: llevad efectivo de reserva.'
 where trip_id = 'f4215d8a-1df5-492d-aac5-877d8f4e4df9' and day = '2027-01-05' and title = 'Comida en Namba';
update public.events set payment_method = 'tarjeta',
       note = coalesce(note || ' · ', '') || 'Pago: La mayoría de restaurantes urbanos acepta tarjeta, pero los locales pequeños no: llevad efectivo de reserva.'
 where trip_id = 'f4215d8a-1df5-492d-aac5-877d8f4e4df9' and day = '2027-01-05' and title = 'Cena en Umeda';
update public.events set payment_method = 'efectivo',
       note = coalesce(note || ' · ', '') || 'Pago: Puestos de mercado: mayoritariamente efectivo.'
 where trip_id = 'f4215d8a-1df5-492d-aac5-877d8f4e4df9' and day = '2027-01-05' and title = 'Kuromon Ichiba';
update public.events set payment_method = 'tarjeta',
       note = coalesce(note || ' · ', '') || 'Pago: La mayoría de restaurantes urbanos acepta tarjeta, pero los locales pequeños no: llevad efectivo de reserva.'
 where trip_id = 'f4215d8a-1df5-492d-aac5-877d8f4e4df9' and day = '2027-01-06' and title = 'Comida';
update public.events set payment_method = 'prepago',
       note = coalesce(note || ' · ', '') || 'Pago: Smart EX: se reserva y se paga online con tarjeta.'
 where trip_id = 'f4215d8a-1df5-492d-aac5-877d8f4e4df9' and day = '2027-01-06' and title = 'Nozomi a Tokio';
update public.events set payment_method = 'prepago',
       note = coalesce(note || ' · ', '') || 'Pago: Reserva confirmada, cargo a tarjeta.'
 where trip_id = 'f4215d8a-1df5-492d-aac5-877d8f4e4df9' and day = '2027-01-06' and title = 'Minn Nihonbashi Suitengumae';
update public.events set payment_method = 'prepago',
       note = coalesce(note || ' · ', '') || 'Pago: Entrada online con tarjeta.'
 where trip_id = 'f4215d8a-1df5-492d-aac5-877d8f4e4df9' and day = '2027-01-06' and title = 'teamLab Borderless';
update public.events set payment_method = 'tarjeta',
       note = coalesce(note || ' · ', '') || 'Pago: La mayoría de restaurantes urbanos acepta tarjeta, pero los locales pequeños no: llevad efectivo de reserva.'
 where trip_id = 'f4215d8a-1df5-492d-aac5-877d8f4e4df9' and day = '2027-01-06' and title = 'Cena de despedida';
update public.events set payment_method = 'tarjeta',
       note = coalesce(note || ' · ', '') || 'Pago: La mayoría de restaurantes urbanos acepta tarjeta, pero los locales pequeños no: llevad efectivo de reserva.'
 where trip_id = 'f4215d8a-1df5-492d-aac5-877d8f4e4df9' and day = '2027-01-07' and title = 'Desayuno';
update public.events set payment_method = 'prepago',
       note = coalesce(note || ' · ', '') || 'Pago: Ya pagado.'
 where trip_id = 'f4215d8a-1df5-492d-aac5-877d8f4e4df9' and day = '2027-01-07' and title = 'Vuelo Tokio-Madrid';

-- 52 gastos clasificados.
