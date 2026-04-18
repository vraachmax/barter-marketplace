import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { ThemeSync } from "@/components/theme-sync";
import { GlobalChatWidget } from "@/components/global-chat-widget";
import { MobileBottomNav } from "@/components/mobile-bottom-nav";
import { PresenceProvider } from "@/components/presence-provider";
import { AuthProvider } from "@/components/auth-provider";

// Golos Text — brand font (Paratype). Cyrillic-first grotesque used across the product.
// Source: docs/design-system/project/fonts/
const golosText = localFont({
  variable: "--font-sans",
  display: "swap",
  preload: true,
  fallback: ["-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
  src: [
    { path: "../fonts/golos/GolosText-Regular.ttf",    weight: "400", style: "normal" },
    { path: "../fonts/golos/GolosText-Medium.ttf",     weight: "500", style: "normal" },
    { path: "../fonts/golos/GolosText-SemiBold.ttf",   weight: "600", style: "normal" },
    { path: "../fonts/golos/GolosText-Bold.ttf",       weight: "700", style: "normal" },
    { path: "../fonts/golos/GolosText-ExtraBold.ttf",  weight: "800", style: "normal" },
    { path: "../fonts/golos/GolosText-Black.ttf",      weight: "900", style: "normal" },
  ],
});

const SITE_NAME = 'Barter — маркетплейс объявлений';
const SITE_DESC = 'Покупайте и продавайте легко: электроника, авто, недвижимость, услуги и многое другое. Бесплатные объявления по всей России.';

export const metadata: Metadata = {
  title: {
    default: SITE_NAME,
    template: `%s | Barter`,
  },
  description: SITE_DESC,
  keywords: ['объявления', 'маркетплейс', 'купить', 'продать', 'бартер', 'электроника', 'авто', 'недвижимость'],
  openGraph: {
    type: 'website',
    locale: 'ru_RU',
    siteName: 'Barter',
    title: SITE_NAME,
    description: SITE_DESC,
  },
  twitter: {
    card: 'summary_large_image',
    title: SITE_NAME,
    description: SITE_DESC,
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#00AAFF',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/manifest.json" />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var p=localStorage.getItem('barter_theme_pref');var r='light';if(p==='DARK')r='dark';else if(p==='LIGHT')r='light';else if(p==='SYSTEM'&&window.matchMedia('(prefers-color-scheme: dark)').matches)r='dark';var el=document.documentElement;el.setAttribute('data-theme',r);el.classList.toggle('dark',r==='dark');el.setAttribute('data-theme-pref',p||'LIGHT');}catch(e){}})();`,
          }}
        />
      </head>
      <body
        className={`${golosText.variable} antialiased`}
      >
        <ThemeSync />
        <AuthProvider>
          <PresenceProvider>
            <GlobalChatWidget />
            {children}
            <MobileBottomNav />
          </PresenceProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
