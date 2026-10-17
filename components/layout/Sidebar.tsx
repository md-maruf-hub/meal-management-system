'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  UtensilsCrossed,
  ShoppingBag,
  DollarSign,
  Receipt,
  FileText,
  UserCheck,
  Lock,
  History,
  User,
  Shield,
  X,
  Database,
  BarChart3,
} from 'lucide-react';
import { UserRole } from '../../lib/types';
import { useDashboard } from '../../lib/DashboardContext';
import Logo from '../ui/Logo';

interface SidebarProps {
  role: UserRole;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export default function Sidebar({ role, isMobileOpen = false, onCloseMobile }: SidebarProps) {
  const pathname = usePathname();
  const { selectedMonth, setSelectedMonth, locks, assignedMonths, user } = useDashboard();

  const isLinkActive = (path: string) => pathname === path;

  const handleNavClick = () => {
    if (onCloseMobile) onCloseMobile();
  };

  const handleManagerNavClick = () => {
    if (onCloseMobile) onCloseMobile();
  };

  const currentLock = locks.find((l) => l.yearMonth === selectedMonth);
  const isMonthClosed = currentLock?.status === 'CLOSED' || (currentLock?.status as any) === 'LOCKED';
  const isManagerForCurrentMonth = role === 'MANAGER';

  const navContent = (
    <div className="space-y-6">
      {/* Mobile Drawer Header */}
      <div className="md:hidden flex items-center justify-between pb-4 border-b border-slate-800">
        <div className="flex items-center space-x-2.5">
          <Logo size="sm" showText={false} />
          <span className="font-bold text-white text-base">মিল ম্যানেজমেন্ট</span>
        </div>
        <button onClick={onCloseMobile} className="p-1.5 text-slate-400 hover:text-white">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Reports & Member Statement */}
      <div>
        <p className="px-3 text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
          {role === 'SUPER_ADMIN' ? 'রিপোর্ট পোর্টাল' : 'মেম্বার পোর্টাল'}
        </p>
        <nav className="space-y-1">
          {role !== 'SUPER_ADMIN' && (
            <Link
              href="/dashboard/member"
              onClick={handleNavClick}
              className={`flex items-center space-x-3 px-3.5 py-2.5 rounded-xl font-semibold text-sm transition-all ${
                isLinkActive('/dashboard/member')
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'hover:bg-slate-800 text-slate-300'
              }`}
            >
              <User className="w-4 h-4" />
              <span>ব্যক্তিগত হিসাব বিবরণী</span>
            </Link>
          )}
          <Link
            href="/reports"
            onClick={handleNavClick}
            className={`flex items-center space-x-3 px-3.5 py-2.5 rounded-xl font-semibold text-sm transition-all ${
              isLinkActive('/reports')
                ? 'bg-emerald-600 text-white shadow-md'
                : 'hover:bg-slate-800 text-slate-300'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>মাসিক মূল রিপোর্ট</span>
          </Link>
        </nav>
      </div>

      {/* Shortcut button to user's assigned manager months if currently viewing another month as a regular member */}
      {role !== 'MANAGER' && role !== 'SUPER_ADMIN' && assignedMonths && assignedMonths.length > 0 && (
        <div className="mx-2 p-3 bg-amber-500/10 border border-amber-500/30 rounded-2xl space-y-2">
          <div className="flex items-center space-x-1.5">
            <span className="text-xs">👑</span>
            <p className="text-[11px] font-bold text-amber-300">
              আপনার দায়িত্বপ্রাপ্ত মাসসমূহ
            </p>
          </div>
          <div className="flex flex-col gap-1.5">
            {assignedMonths.map((m) => (
              <Link
                key={m}
                href={`/dashboard/manager/report?month=${m}`}
                onClick={() => {
                  setSelectedMonth(m);
                  if (onCloseMobile) onCloseMobile();
                }}
                className="w-full text-left px-2.5 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/40 font-semibold text-xs rounded-xl transition-all flex items-center justify-between"
              >
                <span>{m} মাস</span>
                <span className="text-[10px] bg-amber-500 text-slate-950 font-bold px-1.5 py-0.5 rounded">
                  ম্যানেজার প্যানেল ➔
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Manager Operations: ONLY visible if the user is the designated Manager for this currently selected month */}
      {isManagerForCurrentMonth && (
        <div>
          <div className="flex items-center justify-between px-3 mb-2">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              ম্যানেজার কার্যক্রম ({selectedMonth})
            </p>
            {isMonthClosed && (
              <span className="text-[10px] font-extrabold text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded-md border border-amber-800">
                🔒 লক করা
              </span>
            )}
          </div>

          <nav className="space-y-1">
            <Link
              href={`/dashboard/manager/report?month=${selectedMonth}`}
              onClick={handleManagerNavClick}
              className={`flex items-center space-x-3 px-3.5 py-2.5 rounded-xl font-semibold text-sm transition-all ${
                isLinkActive('/dashboard/manager/report')
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'hover:bg-slate-800 text-slate-300'
              }`}
            >
              <BarChart3 className="w-4 h-4 text-emerald-400" />
              <span>📊 সর্বমোট রিপোর্ট ও ওভারভিউ</span>
            </Link>

            {/* When month is locked, show ONLY Report & Settlements */}
            {!isMonthClosed ? (
              <>
                <Link
                  href={`/dashboard/manager/meals?month=${selectedMonth}`}
                  onClick={handleManagerNavClick}
                  className={`flex items-center space-x-3 px-3.5 py-2.5 rounded-xl font-semibold text-sm transition-all ${
                    isLinkActive('/dashboard/manager/meals')
                      ? 'bg-emerald-600 text-white shadow-md'
                      : 'hover:bg-slate-800 text-slate-300'
                  }`}
                >
                  <UtensilsCrossed className="w-4 h-4" />
                  <span>দৈনিক মিল তালিকা</span>
                </Link>
                <Link
                  href={`/dashboard/manager/bazar?month=${selectedMonth}`}
                  onClick={handleManagerNavClick}
                  className={`flex items-center space-x-3 px-3.5 py-2.5 rounded-xl font-semibold text-sm transition-all ${
                    isLinkActive('/dashboard/manager/bazar')
                      ? 'bg-emerald-600 text-white shadow-md'
                      : 'hover:bg-slate-800 text-slate-300'
                  }`}
                >
                  <ShoppingBag className="w-4 h-4" />
                  <span>বাজার খরচ এন্ট্রি</span>
                </Link>
                <Link
                  href={`/dashboard/manager/deposits?month=${selectedMonth}`}
                  onClick={handleManagerNavClick}
                  className={`flex items-center space-x-3 px-3.5 py-2.5 rounded-xl font-semibold text-sm transition-all ${
                    isLinkActive('/dashboard/manager/deposits')
                      ? 'bg-emerald-600 text-white shadow-md'
                      : 'hover:bg-slate-800 text-slate-300'
                  }`}
                >
                  <DollarSign className="w-4 h-4" />
                  <span>সদস্য জমা (ডিপোজিট)</span>
                </Link>
                <Link
                  href={`/dashboard/manager/utilities?month=${selectedMonth}`}
                  onClick={handleManagerNavClick}
                  className={`flex items-center space-x-3 px-3.5 py-2.5 rounded-xl font-semibold text-sm transition-all ${
                    isLinkActive('/dashboard/manager/utilities')
                      ? 'bg-emerald-600 text-white shadow-md'
                      : 'hover:bg-slate-800 text-slate-300'
                  }`}
                >
                  <Receipt className="w-4 h-4" />
                  <span>ইউটিলিটি ও অন্যান্য বিল</span>
                </Link>
              </>
            ) : (
              /* Month is locked: ONLY show Settlements & Deposits page */
              <Link
                href={`/dashboard/manager/deposits?month=${selectedMonth}`}
                onClick={handleManagerNavClick}
                className={`flex items-center space-x-3 px-3.5 py-2.5 rounded-xl font-semibold text-sm transition-all ${
                  isLinkActive('/dashboard/manager/deposits')
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'hover:bg-slate-800 text-slate-300'
                }`}
              >
                <DollarSign className="w-4 h-4 text-amber-400" />
                <span>⚖️ সেটেলমেন্ট ও ডিপোজিট</span>
              </Link>
            )}
          </nav>
        </div>
      )}


      {/* Super Admin Control: strictly Approvals, Managers, Month Lock, Database */}
      {role === 'SUPER_ADMIN' && (
        <div>
          <p className="px-3 text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
            সুপার অ্যাডমিন কন্ট্রোল
          </p>
          <nav className="space-y-1">
            <Link
              href="/dashboard/admin"
              onClick={handleNavClick}
              className={`flex items-center space-x-3 px-3.5 py-2.5 rounded-xl font-semibold text-sm transition-all ${
                isLinkActive('/dashboard/admin')
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'hover:bg-slate-800 text-slate-300'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>অ্যাডমিন কমান্ড সেন্টার</span>
            </Link>
            <Link
              href="/dashboard/admin/approvals"
              onClick={handleNavClick}
              className={`flex items-center space-x-3 px-3.5 py-2.5 rounded-xl font-semibold text-sm transition-all ${
                isLinkActive('/dashboard/admin/approvals')
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'hover:bg-slate-800 text-slate-300'
              }`}
            >
              <UserCheck className="w-4 h-4" />
              <span>নতুন সদস্য অনুমোদন</span>
            </Link>
            <Link
              href="/dashboard/admin/managers"
              onClick={handleNavClick}
              className={`flex items-center space-x-3 px-3.5 py-2.5 rounded-xl font-semibold text-sm transition-all ${
                isLinkActive('/dashboard/admin/managers')
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'hover:bg-slate-800 text-slate-300'
              }`}
            >
              <Shield className="w-4 h-4" />
              <span>ম্যানেজার নিয়োগ</span>
            </Link>
            <Link
              href="/dashboard/admin/monthly-lock"
              onClick={handleNavClick}
              className={`flex items-center space-x-3 px-3.5 py-2.5 rounded-xl font-semibold text-sm transition-all ${
                isLinkActive('/dashboard/admin/monthly-lock')
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'hover:bg-slate-800 text-slate-300'
              }`}
            >
              <Lock className="w-4 h-4" />
              <span>মাসিক লক ও নতুন মাস</span>
            </Link>
            <Link
              href="/dashboard/admin/database"
              onClick={handleNavClick}
              className={`flex items-center space-x-3 px-3.5 py-2.5 rounded-xl font-semibold text-sm transition-all ${
                isLinkActive('/dashboard/admin/database')
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'hover:bg-slate-800 text-slate-300'
              }`}
            >
              <Database className="w-4 h-4" />
              <span>ডাটাবেজ কানেকশন</span>
            </Link>
          </nav>
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:block w-64 bg-slate-900 text-slate-300 min-h-[calc(100vh-61px)] p-4 flex-col justify-between flex-shrink-0">
        {navContent}
        <div className="pt-4 border-t border-slate-800 text-xs text-slate-500">
          <p className="font-semibold text-slate-400">মিল ম্যানেজমেন্ট সিস্টেম</p>
          <p>ভার্সন ১.০ (রেসপন্সিভ)</p>
        </div>
      </aside>

      {/* Mobile Drawer */}
      {isMobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm"
            onClick={onCloseMobile}
          />
          <div className="relative w-4/5 max-w-xs bg-slate-900 text-slate-300 min-h-full p-5 flex flex-col justify-between shadow-2xl z-10 overflow-y-auto">
            {navContent}
            <div className="pt-4 border-t border-slate-800 text-xs text-slate-500">
              <p className="font-semibold text-slate-400">মিল ম্যানেজমেন্ট সিস্টেম</p>
              <p>মোবাইল মেনু</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
