import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { ThemeSync } from "@/components/theme-sync";
import { ModeThemeSync } from "@/components/mode-theme-sync";
import { GlobalChatWidget } from "@/components/global-chat-widget";
import { SupportWidget } from "@/components/support-widget";
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

// NB: themeColor намеренно убран — <meta name="theme-color"> управляется
// динамически из ModeThemeSync, чтобы верхний system-bar окрашивался в
// цвет текущего режима (Бартер = #E85D26, Маркет = #00AAFF).
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
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
        {/* Pre-paint mode bootstrap — ставим <html data-mode="..."> и meta[theme-color]
            ДО первого кадра, чтобы не было вспышки не того цвета при загрузке. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var m=localStorage.getItem('barter_mode');if(m!=='barter'&&m!=='market')m='barter';document.documentElement.setAttribute('data-mode',m);var c=m==='barter'?'#E85D26':'#00AAFF';var meta=document.querySelector('meta[name="theme-color"]:not([media])');if(!meta){meta=document.createElement('meta');meta.name='theme-color';document.head.appendChild(meta);}meta.content=c;}catch(e){}})();`,
          }}
        />
      </head>
      <body
        className={`${golosText.variable} antialiased`}
      >
        <ThemeSync />
        <ModeThemeSync />
        <AuthProvider>
          <PresenceProvider>
            <GlobalChatWidget />
            <SupportWidget />
            {children}
            <MobileBottomNav />
          </PresenceProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
