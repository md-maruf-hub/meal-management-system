'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ManagerRootPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/dashboard/manager/report');
  }, [router]);

  return (
    <div className="flex items-center justify-center h-64 text-slate-500 text-sm">
      ম্যানেজার রিপোর্ট পেজে নিয়ে যাওয়া হচ্ছে...
    </div>
  );
}
