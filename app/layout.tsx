import type { Metadata } from 'next';
import { Playfair_Display, Crimson_Pro, Inter } from 'next/font/google';
import './globals.css';
import Navbar from '@/components/Navbar';
import CartSidebar from '@/components/CartSidebar';
import MobileBottomNav from '@/components/MobileBottomNav';

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
});

const crimson = Crimson_Pro({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-body',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'HYOSS_ART - Galería de Arte',
  description: 'Descubre y adquiere obras únicas de Yosmar Hernández. Catálogo curado de pinturas, abstracciones y arte moderno.',
  keywords: ['arte', 'galería', 'pintura', 'comprar arte'],
  icons: {
    icon: [
      { url: '/images/logo.png', type: 'image/png' },
    ],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className={`${playfair.variable} ${crimson.variable} ${inter.variable}`}>
      <body className="font-body antialiased">
        <Navbar />
        <main className="pt-16 sm:pt-20 pb-20 lg:pb-8">
          {children}
        </main>
        <CartSidebar />
        <MobileBottomNav />
      </body>
    </html>
  );
}
