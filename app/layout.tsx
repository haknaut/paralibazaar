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
// family and would reject it. The Noto faces are still pulled through next/font
// and sit behind it in the stack, so Hindi and Punjabi — which Google Sans
// does not cover — fall through to a face that has those glyphs.
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
  themeColor: '#0f62fe',
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
      </head>
      <body className="min-h-dvh bg-canvas font-sans antialiased">
        <I18nProvider>
          <ToastProvider>
          <Header />
          {/* Bottom padding clears the mobile tab bar; the tab bar is hidden
              from `lg` up, so the reserved space stops there too. */}
          {/* Full-bleed on desktop: the content fills the viewport width
              instead of floating in a narrow centred column. */}
          <main className="w-full px-4 pt-4 pb-28 sm:px-6 sm:pb-16 lg:px-16 lg:pb-12">
            {children}
          </main>
          <BottomNav />
          </ToastProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
