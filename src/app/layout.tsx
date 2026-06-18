import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Travel Planner',
  icons: [{ rel: 'icon', url: '/favicon.svg', type: 'image/svg+xml' }],
  description: 'Planificador de viajes familiar',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="min-h-screen bg-slate-50">
        {children}
      </body>
    </html>
  )
}
