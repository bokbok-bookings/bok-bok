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

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://bokbok.io'

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: {
    default: 'Bok Bok | Find Verified Industry Experts & Book Sessions',
    template: '%s | Bok Bok',
  },
  description:
    'Book 1-on-1 consultations, hands-on workshops, and live webinars with vetted practitioners across Egypt and MENA. Safe payment and guaranteed sessions.',
  keywords: [
    'experts Egypt',
    'business consultations Cairo',
    'workshops Egypt',
    'webinars MENA',
    'mentorship Egypt',
    'استشارات خبراء',
    'ورش عمل مصر',
    'جلسات استشارية',
    'خبراء تقنية وتسويق',
  ],
  authors: [{ name: 'Bok Bok', url: baseUrl }],
  creator: 'Bok Bok',
  publisher: 'Bok Bok',
  icons: {
    icon: '/testFavsmall.png',
    apple: '/testFavsmall.png',
    shortcut: '/testFavsmall.png',
  },
  openGraph: {
    type: 'website',
    locale: 'ar_EG',
    alternateLocale: ['en_US'],
    url: baseUrl,
    siteName: 'Bok Bok',
    title: 'Bok Bok | Find Verified Industry Experts & Book Sessions',
    description:
      'Book 1-on-1 consultations, hands-on workshops, and live webinars with vetted practitioners across Egypt and MENA.',
    images: [
      {
        url: '/testFavsmall.png',
        width: 512,
        height: 512,
        alt: 'Bok Bok Logo',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Bok Bok | Find Verified Industry Experts & Book Sessions',
    description:
      'Book 1-on-1 consultations, hands-on workshops, and live webinars with vetted practitioners across Egypt and MENA.',
    images: ['/testFavsmall.png'],
  },
  alternates: {
    canonical: '/',
    languages: {
      'ar-EG': '/ar',
      'en-EG': '/en',
      'x-default': '/',
    },
  },
  other: {
    'geo.region': 'EG',
    'geo.placename': 'Cairo, Egypt',
    'geo.position': '30.0444;31.2357',
    ICBM: '30.0444, 31.2357',
  },
}

export const viewport: Viewport = {
  colorScheme: 'light',
  themeColor: '#fbfaf7',
}

const organizationSchema = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      '@id': `${baseUrl}/#organization`,
      name: 'Bok Bok',
      url: baseUrl,
      logo: `${baseUrl}/testFavsmall.png`,
      description:
        'Vetted expert consultations, interactive workshops, and live webinars across Egypt and the MENA region.',
      address: {
        '@type': 'PostalAddress',
        addressLocality: 'Cairo',
        addressCountry: 'EG',
      },
    },
    {
      '@type': 'WebSite',
      '@id': `${baseUrl}/#website`,
      url: baseUrl,
      name: 'Bok Bok',
      publisher: { '@id': `${baseUrl}/#organization` },
      potentialAction: {
        '@type': 'SearchAction',
        target: `${baseUrl}/experts?q={search_term_string}`,
        'query-input': 'required name=search_term_string',
      },
    },
  ],
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
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(organizationSchema),
          }}
        />
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
