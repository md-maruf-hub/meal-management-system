'use client';

import React, { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Navbar from '../../components/layout/Navbar';
import Sidebar from '../../components/layout/Sidebar';
import { DashboardProvider, useDashboard } from '../../lib/DashboardContext';
import TopProgressBar from '../../components/ui/TopProgressBar';

function DashboardShell({ children }: { children: React.ReactNode }) {
  const { user, selectedMonth, setSelectedMonth, effectiveRole, isLoading, assignedMonths } = useDashboard();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  // Redirect guard: strictly route users to their designated role portals per selected month
  useEffect(() => {
    if (isLoading || !user) return;

    // Manager operations are strictly limited to the month's assigned Manager or Super Admin
    if (pathname.includes('/dashboard/manager')) {
      if (user.role === 'SUPER_ADMIN') return;

      if (effectiveRole === 'MANAGER') return;

      // If user is a past manager who is trying to access manager operations, auto-switch to their assigned month
      if (assignedMonths && assignedMonths.length > 0) {
        setSelectedMonth(assignedMonths[0]);
        return;
      }

      // Plain member who never managed any month
      router.push('/dashboard/member');
      return;
    }

    if (pathname.includes('/dashboard/member') && effectiveRole === 'SUPER_ADMIN') {
      router.push('/dashboard/admin');
      return;
    }
    if (pathname.includes('/dashboard/admin') && effectiveRole !== 'SUPER_ADMIN') {
      router.push('/dashboard/member');
      return;
    }
  }, [pathname, effectiveRole, user, isLoading, assignedMonths, setSelectedMonth, router]);



  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      <TopProgressBar isLoading={isLoading} />
      <Navbar
        user={user}
        selectedMonth={selectedMonth}
        onMonthChange={setSelectedMonth}
        effectiveRole={effectiveRole}
        isMobileMenuOpen={isMobileMenuOpen}
        onToggleMobileMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
      />
      <div className="flex flex-1 relative">
        <Sidebar
          role={effectiveRole}
          isMobileOpen={isMobileMenuOpen}
          onCloseMobile={() => setIsMobileMenuOpen(false)}
        />
        <main className="flex-1 p-3 sm:p-6 max-w-7xl mx-auto w-full overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardProvider>
      <DashboardShell>{children}</DashboardShell>
    </DashboardProvider>
  );
}
