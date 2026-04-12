import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeSync } from "@/components/theme-sync";
import { GlobalChatWidget } from "@/components/global-chat-widget";
import { MobileBottomNav } from "@/components/mobile-bottom-nav";
import { PresenceProvider } from "@/components/presence-provider";
import { AuthProvider } from "@/components/auth-provider";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "cyrillic"],
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
  themeColor: '#0097A7',
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
        className={`${inter.variable} antialiased`}
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
