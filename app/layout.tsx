import type { Metadata } from 'next';
import { Hind_Siliguri } from 'next/font/google';
import { Toaster } from 'sonner';
import './globals.css';

const hindSiliguri = Hind_Siliguri({
  subsets: ['bengali', 'latin'],
  weight: ['300', '400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-bengali',
});

export const metadata: Metadata = {
  title: 'মিল ম্যানেজমেন্ট সিস্টেম - মেস হিসাব পোর্টাল',
  description: 'মেস মিল ম্যানেজমেন্ট সিস্টেম - রিয়েল-টাইম মিল হিসাব, বাজার খরচ, ডিপোজিট ও মাসিক প্রতিবেদন।',
  icons: {
    icon: '/icon.svg',
    shortcut: '/icon.svg',
    apple: '/icon.svg',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="bn" className={hindSiliguri.variable}>
      <body>
        {children}
        <Toaster
          position="top-center"
          richColors
          closeButton
          duration={3000}
          toastOptions={{
            className: 'font-bengali',
            style: { fontFamily: 'var(--font-bengali)' },
          }}
        />
      </body>
    </html>
  );
}
