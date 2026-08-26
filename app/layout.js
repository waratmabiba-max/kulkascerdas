import './globals.css';
import { Inter } from 'next/font/google';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata = {
  title: {
    default: '🧊 Kulkas Cerdas',
    template: '%s | Kulkas Cerdas',
  },
  description: 'Kelola stok makanan keluarga dengan mudah dan efisien.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Kulkas Cerdas',
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    title: '🧊 Kulkas Cerdas',
    description: 'Kelola stok makanan keluarga dengan mudah dan efisien.',
    url: '/',
    siteName: 'Kulkas Cerdas',
    locale: 'id_ID',
    type: 'website',
  },
  icons: {
    icon: '/api/icon?size=32',
    shortcut: '/api/icon?size=192',
    apple: '/api/icon?size=180',
  },
  robots: {
    index: true,
    follow: true,
  },
  themeColor: '#3b82f6',
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="id" className={inter.variable}>
      <head>
        <link rel="manifest" href="/manifest.json" />
  <meta name="apple-mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-status-bar-style" content="default" />
  <meta name="apple-mobile-web-app-title" content="Kulkas Cerdas" />
  <meta name="mobile-web-app-capable" content="yes" />
  <meta name="theme-color" content="#3b82f6" />
  
  {/* Icons untuk semua platform */}
  <link rel="icon" href="/api/icon?size=32" sizes="32x32" />
  <link rel="icon" href="/api/icon?size=192" sizes="192x192" />
  <link rel="apple-touch-icon" href="/api/icon?size=180" />
  
  {/* Microsoft Windows */}
  <meta name="msapplication-TileColor" content="#3b82f6" />
  <meta name="msapplication-TileImage" content="/api/icon?size=144" />
      </head>
      <body className="min-h-screen bg-gray-50 text-gray-900 antialiased">
        <main className="min-h-screen flex flex-col">
          {children}
        </main>

        {/* Service Worker Registration */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', () => {
                  navigator.serviceWorker.register('/sw.js')
                    .then((reg) => {
                      console.log('✅ SW registered:', reg);
                    })
                    .catch((err) => {
                      console.log('❌ SW registration failed:', err);
                    });
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
