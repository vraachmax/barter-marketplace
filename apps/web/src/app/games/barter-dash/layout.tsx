import type { Metadata, Viewport } from 'next';

export const metadata: Metadata = {
  title: 'Barter Dash',
  appleWebApp: {
    capable: true,
    title: 'Barter Dash',
    statusBarStyle: 'black-translucent',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
  themeColor: '#060914',
  colorScheme: 'dark',
};

export default function BarterDashLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
