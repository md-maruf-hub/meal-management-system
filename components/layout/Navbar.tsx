'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LogOut, Calendar, Menu, X } from 'lucide-react';
import { AuthSession } from '../../lib/types';

import { useDashboard } from '../../lib/DashboardContext';

interface NavbarProps {
  user: AuthSession['user'] | null;
  selectedMonth: string;
  onMonthChange: (month: string) => void;
  effectiveRole?: string;
  isMobileMenuOpen?: boolean;
  onToggleMobileMenu?: () => void;
}

export default function Navbar({
  user,
  selectedMonth,
  onMonthChange,
  effectiveRole,
  isMobileMenuOpen = false,
  onToggleMobileMenu,
}: NavbarProps) {
  const router = useRouter();
  const { availableMonths, locks } = useDashboard();

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  };

  const currentRole = effectiveRole || user?.role || 'GUEST';

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 px-4 py-3 shadow-sm">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Left: Mobile Drawer Trigger + Brand */}
        <div className="flex items-center space-x-3">
          <button
            onClick={onToggleMobileMenu}
            className="md:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
            title="মেনু খুলুন/বন্ধ করুন"
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>

          <Link href="/dashboard" className="flex items-center space-x-2">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 flex items-center justify-center text-white font-bold text-lg shadow">
              ম
            </div>
            <span className="font-bold text-slate-800 text-lg sm:inline">
              মিল ম্যানেজমেন্ট
            </span>
          </Link>

          <span className={`hidden sm:inline-block text-xs font-bold px-2.5 py-0.5 rounded-full border ${
            currentRole === 'MANAGER'
              ? 'bg-amber-100 text-amber-900 border-amber-300'
              : currentRole === 'SUPER_ADMIN'
              ? 'bg-purple-100 text-purple-900 border-purple-300'
              : 'bg-emerald-100 text-emerald-800 border-emerald-300'
          }`}>
            {currentRole === 'MANAGER' ? `👔 ম্যানেজার (${selectedMonth})` : currentRole === 'SUPER_ADMIN' ? '👑 সুপার অ্যাডমিন' : '👤 সদস্য'}
          </span>

        </div>

        {/* Right: Month Selector + User Profile + Logout */}
        <div className="flex items-center space-x-2 sm:space-x-4">
          <div className="flex items-center space-x-1.5 bg-slate-100 hover:bg-slate-200/80 transition-colors px-2.5 py-1.5 rounded-xl border border-slate-300 text-xs sm:text-sm shadow-sm">
            <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600 flex-shrink-0" />
            <select
              value={selectedMonth}
              onChange={(e) => onMonthChange(e.target.value)}
              className="bg-transparent font-bold text-slate-800 focus:outline-none cursor-pointer text-xs sm:text-sm py-0.5 pr-1"
              title="হিসাবের মাস নির্বাচন করুন"
            >
              {(availableMonths && availableMonths.length > 0 ? availableMonths : [selectedMonth]).map((ym) => {
                const lock = locks.find((l) => l.yearMonth === ym);
                const isClosed = lock?.status === 'CLOSED';
                return (
                  <option key={ym} value={ym} className="font-semibold text-slate-800 bg-white">
                    {ym} {isClosed ? '🔒 (লকড)' : '🟢 (চালু)'}
                  </option>
                );
              })}
            </select>
          </div>

          {user && (
            <div className="flex items-center space-x-2 sm:space-x-3 border-l border-slate-200 pl-2 sm:pl-4">
              <div className="text-right hidden sm:block">
                <p className="text-xs sm:text-sm font-bold text-slate-800">{user.name}</p>
                <p className="text-[10px] sm:text-xs text-slate-500">
                  {user.memberId} • রুম {user.roomNo}
                </p>
              </div>
              <button
                onClick={handleLogout}
                title="লগআউট"
                className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
              >
                <LogOut className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
