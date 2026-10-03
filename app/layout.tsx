import type { Metadata, Viewport } from 'next';
import { Noto_Sans_Devanagari, Noto_Sans_Gurmukhi } from 'next/font/google';
import './globals.css';
import { I18nProvider } from '@/lib/i18n';
import { NO_FLASH_SCRIPT } from '@/lib/theme';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { ToastProvider } from '@/components/Toast';

// Google Sans is self-hosted from `public/fonts` (see the @font-face block in
// globals.css) because `next/font/google`'s bundled font list predates the
// family and would reject it. It renders all three scripts itself (measured),
// so the two Noto faces below are a safety fallback that never paints.
const notoDevanagari = Noto_Sans_Devanagari({
  subsets: ['devanagari'],
  variable: '--font-noto-deva',
  display: 'swap',
});

const notoGurmukhi = Noto_Sans_Gurmukhi({
  subsets: ['gurmukhi'],
  variable: '--font-noto-gurmukhi',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'ParaliBazaar — Don\'t burn it. Sell it.',
  description:
    'A marketplace connecting Punjab farmers with buyers of paddy stubble, so parali is collected instead of burned. UN SDG 13: Climate Action.',
};

export const viewport: Viewport = {
  themeColor: '#166b3a',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      // The inline script below writes data-theme onto this element before
      // paint, so the server's markup cannot know it. This is the one case
      // where that mismatch is intended.
      suppressHydrationWarning
      className={`${notoDevanagari.variable} ${notoGurmukhi.variable}`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: NO_FLASH_SCRIPT }} />
        {/* Above-the-fold type: the UI font + the icon font. Everything else
            loads on demand; without this the first paint waits on discovery. */}
        <link rel="preload" href="/fonts/GoogleSans-Regular.ttf" as="font" type="font/ttf" crossOrigin="anonymous" />
        <link rel="preload" href="/fonts/MaterialSymbolsRounded-Regular.ttf" as="font" type="font/ttf" crossOrigin="anonymous" />
      </head>
      <body className="min-h-dvh bg-canvas font-sans antialiased">
        <I18nProvider>
          <ToastProvider>
          <Header />
          {/* Bottom padding clears the mobile tab bar; the tab bar is hidden
              from `lg` up, so the reserved space stops there too. */}
          {/* Full-bleed on desktop: the content fills the viewport width
              instead of floating in a narrow centred column. */}
          <main className="w-full px-6 pt-4 pb-28 sm:px-10 sm:pb-16 lg:px-16 lg:pb-12">
            {children}
          </main>
          <BottomNav />
          </ToastProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
