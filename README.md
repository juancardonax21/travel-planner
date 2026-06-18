# Travel Planner

Planificador familiar de viajes · Next.js + Supabase + Vercel

## Setup

### 1. Supabase
- Ve a tu proyecto en supabase.co
- SQL Editor → New query → pega el contenido de `supabase-schema.sql` → Run
- Settings → API → copia `anon public` key

### 2. Variables de entorno
Copia `.env.example` a `.env.local` y rellena:
```
NEXT_PUBLIC_SUPABASE_URL=https://yqgoaacmxqvsdukptgss.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key-aqui
NEXT_PUBLIC_OWM_KEY=e58f8a6efa887e38af35c05014efffe6
```

### 3. Crear usuarios
En Supabase → Authentication → Users → Add user:
- Crea una cuenta para cada miembro de la familia

### 4. Desarrollo local
```bash
npm install
npm run dev
```

### 5. Deploy en Vercel
```bash
# Conecta el repo de GitHub a Vercel
# Añade las env vars en Vercel Dashboard → Settings → Environment Variables
```

## Stack
- **Next.js 14** App Router
- **Supabase** PostgreSQL + Auth + Storage + RLS
- **Tailwind CSS** estilos
- **Recharts** gráficos de presupuesto
- **Leaflet** mapas interactivos
- **OpenWeatherMap** previsión del tiempo
- **exchangerate-api** tipos de cambio en tiempo real
