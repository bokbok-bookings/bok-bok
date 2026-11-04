import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import localFont from 'next/font/local'
import { SiteHeader } from '@/components/layout/site-header'
import { SiteFooter } from '@/components/layout/site-footer'
import { LanguageProvider } from '@/lib/i18n/language-context'
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
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){
              try {
                var p = window.location.pathname;
                var isAr = p === '/ar' || p.indexOf('/ar/') === 0 || document.cookie.indexOf('bok_lang=ar') !== -1;
                if (isAr) {
                  document.documentElement.lang = 'ar';
                  document.documentElement.dir = 'rtl';
                }
              } catch(e) {}
            })()`,
          }}
        />
      </head>
      <body
        className={`antialiased bg-background text-foreground ${fontHeading.variable} ${fontSubheading.variable} ${fontBody.variable}`}
      >
        <LanguageProvider>
          <SiteHeader />
          {children}
          <SiteFooter />
        </LanguageProvider>
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
