import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import localFont from 'next/font/local'
import { SiteHeader } from '@/components/layout/site-header'
import './globals.css'

const fontHeading = localFont({
  src: '../public/fonts/StackSansNotch.ttf',
  variable: '--font-heading',
  display: 'swap',
})

const fontSubheading = localFont({
  src: '../public/fonts/Bricolage.ttf',
  variable: '--font-subheading',
  display: 'swap',
})

const fontBody = localFont({
  src: '../public/fonts/Outfit.ttf',
  variable: '--font-body',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Bok Bok — Find your right expert',
  description: 'Connect with trusted experts, book a focused session, and leave with a plan.',
  generator: 'v0.app',
  icons: {
    icon: '/testFavsmall.png',
    apple: '/testFavsmall.png',
    shortcut: '/testFavsmall.png',
  },
}

export const viewport: Viewport = {
  colorScheme: 'light',
  themeColor: '#fbfaf7',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="light" style={{ colorScheme: 'light' }}>
      <body
        className={`antialiased bg-[#fbfaf7] text-[#14243b] ${fontHeading.variable} ${fontSubheading.variable} ${fontBody.variable}`}
      >
        <SiteHeader />
        {children}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
