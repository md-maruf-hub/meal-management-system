'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useDashboard } from '../../lib/DashboardContext';

export default function DashboardPage() {
  const router = useRouter();
  const { user } = useDashboard();

  useEffect(() => {
    if (!user) return;
    if (user.role === 'SUPER_ADMIN') {
      router.push('/dashboard/admin');
    } else if (user.role === 'MANAGER') {
      router.push('/dashboard/manager/report');
    } else {
      router.push('/dashboard/member');
    }
  }, [user, router]);

  return (
    <div className="flex items-center justify-center h-64 text-slate-500 font-semibold text-sm">
      ড্যাশবোর্ড লোড হচ্ছে...
    </div>
  );
}
