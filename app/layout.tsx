import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'মিল ম্যানেজমেন্ট সিস্টেম - মেস হিসাব পোর্টাল',
  description: 'মেস মিল ম্যানেজমেন্ট সিস্টেম - রিয়েল-টাইম মিল হিসাব, বাজার খরচ, ডিপোজিট ও মাসিক প্রতিবেদন।',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="bn">
      <body>{children}</body>
    </html>
  );
}

