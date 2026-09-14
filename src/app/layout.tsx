import type { Metadata, Viewport } from 'next'
import './globals.css'
import OfflineReady from '@/components/layout/OfflineReady'

export const metadata: Metadata = {
  title: 'Travel Planner',
  description: 'Planificador de viajes familiar',
  // Enlaza el manifest que ya estaba en public/ pero que nadie declaraba:
  // sin esto la app no se puede instalar en la pantalla de inicio.
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    title: 'Travel',
    statusBarStyle: 'default',
  },
  icons: {
    icon: '/favicon.svg',
    apple: '/apple-touch-icon.png',
  },
}

export const viewport: Viewport = {
  themeColor: '#2563EB',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="min-h-screen bg-slate-50">
        {children}
        <OfflineReady />
      </body>
    </html>
  )
}
