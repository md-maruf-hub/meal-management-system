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
  User,
  Shield,
  X,
  Database,
  BarChart3,
  StickyNote,
} from 'lucide-react';
import { UserRole } from '../../lib/types';
import { useDashboard } from '../../lib/DashboardContext';
import Logo from '../ui/Logo';

interface SidebarProps {
  role: UserRole;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

interface NavItemProps {
  href: string;
  icon: React.ReactNode;
  label: string;
  isActive: boolean;
  onClick?: () => void;
  accentColor?: string;
}

function NavItem({ href, icon, label, isActive, onClick, accentColor }: NavItemProps) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={`flex items-center space-x-3 px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all btn-press ${
        isActive
          ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/15'
          : 'hover:bg-slate-800/60 text-slate-400 hover:text-slate-200'
      }`}
    >
      <span className={isActive ? 'text-white' : (accentColor || 'text-slate-500')}>{icon}</span>
      <span>{label}</span>
    </Link>
  );
}

export default function Sidebar({ role, isMobileOpen = false, onCloseMobile }: SidebarProps) {
  const pathname = usePathname();
  const { selectedMonth, setSelectedMonth, locks, assignedMonths, user } = useDashboard();

  const isActive = (path: string) => pathname === path;
  const close = () => onCloseMobile?.();

  const currentLock = locks.find((l) => l.yearMonth === selectedMonth);
  const isMonthClosed = currentLock?.status === 'CLOSED' || (currentLock?.status as any) === 'LOCKED';
  const isManagerForCurrentMonth = role === 'MANAGER';

  const navContent = (
    <div className="space-y-6">
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between pb-4 border-b border-slate-700/50">
        <div className="flex items-center space-x-2">
          <Logo size="sm" showText={false} />
          <span className="font-bold text-white text-sm">মিল ম্যানেজমেন্ট</span>
        </div>
        <button onClick={onCloseMobile} className="p-1.5 text-slate-400 hover:text-white btn-press">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Reports / Member Portal */}
      <div>
        <p className="px-3 text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
          {role === 'SUPER_ADMIN' ? 'রিপোর্ট পোর্টাল' : 'মেম্বার পোর্টাল'}
        </p>
        <nav className="space-y-1">
          {role !== 'SUPER_ADMIN' && (
            <NavItem
              href="/dashboard/member"
              icon={<User className="w-4 h-4" />}
              label="ব্যক্তিগত হিসাব বিবরণী"
              isActive={isActive('/dashboard/member')}
              onClick={close}
            />
          )}
          <NavItem
            href="/reports"
            icon={<FileText className="w-4 h-4" />}
            label="মাসিক মূল রিপোর্ট"
            isActive={isActive('/reports')}
            onClick={close}
          />
        </nav>
      </div>

      {/* Manager month shortcut for members */}
      {role !== 'MANAGER' && role !== 'SUPER_ADMIN' && assignedMonths && assignedMonths.length > 0 && (
        <div className="mx-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-2xl space-y-2">
          <p className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
            <span>👑</span> আপনার দায়িত্বপ্রাপ্ত মাসসমূহ
          </p>
          <div className="flex flex-col gap-1.5">
            {assignedMonths.map((m) => (
              <Link
                key={m}
                href={`/dashboard/manager/report?month=${m}`}
                onClick={() => { setSelectedMonth(m); close(); }}
                className="w-full text-left px-2.5 py-1.5 bg-amber-500/15 hover:bg-amber-500/25 text-amber-200 border border-amber-500/30 font-medium text-xs rounded-xl transition-all flex items-center justify-between btn-press"
              >
                <span>{m} মাস</span>
                <span className="text-xs bg-amber-500 text-slate-950 font-bold px-1.5 py-0.5 rounded">
                  ম্যানেজার ➔
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Manager Operations */}
      {isManagerForCurrentMonth && (
        <div>
          <div className="flex items-center justify-between px-3 mb-2">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              ম্যানেজার কার্যক্রম
            </p>
            {isMonthClosed && (
              <span className="text-xs font-bold text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded-lg border border-amber-800/50">
                🔒 লক
              </span>
            )}
          </div>

          <nav className="space-y-1">
            <NavItem
              href={`/dashboard/manager/report?month=${selectedMonth}`}
              icon={<BarChart3 className="w-4 h-4" />}
              label="সর্বমোট রিপোর্ট"
              isActive={isActive('/dashboard/manager/report')}
              onClick={close}
              accentColor="text-emerald-500"
            />

            {!isMonthClosed ? (
              <>
                <NavItem
                  href={`/dashboard/manager/meals?month=${selectedMonth}`}
                  icon={<UtensilsCrossed className="w-4 h-4" />}
                  label="দৈনিক মিল তালিকা"
                  isActive={isActive('/dashboard/manager/meals')}
                  onClick={close}
                />
                <NavItem
                  href={`/dashboard/manager/bazar?month=${selectedMonth}`}
                  icon={<ShoppingBag className="w-4 h-4" />}
                  label="বাজার খরচ এন্ট্রি"
                  isActive={isActive('/dashboard/manager/bazar')}
                  onClick={close}
                />
                <NavItem
                  href={`/dashboard/manager/deposits?month=${selectedMonth}`}
                  icon={<DollarSign className="w-4 h-4" />}
                  label="সদস্য জমা (ডিপোজিট)"
                  isActive={isActive('/dashboard/manager/deposits')}
                  onClick={close}
                />
                <NavItem
                  href={`/dashboard/manager/utilities?month=${selectedMonth}`}
                  icon={<Receipt className="w-4 h-4" />}
                  label="ইউটিলিটি ও বিল"
                  isActive={isActive('/dashboard/manager/utilities')}
                  onClick={close}
                />
                <NavItem
                  href={`/dashboard/manager/store?month=${selectedMonth}`}
                  icon={<StickyNote className="w-4 h-4" />}
                  label="মেস স্টোর নোটবুক"
                  isActive={isActive('/dashboard/manager/store')}
                  onClick={close}
                  accentColor="text-emerald-500"
                />
              </>
            ) : (
              <NavItem
                href={`/dashboard/manager/deposits?month=${selectedMonth}`}
                icon={<DollarSign className="w-4 h-4" />}
                label="সেটেলমেন্ট ও ডিপোজিট"
                isActive={isActive('/dashboard/manager/deposits')}
                onClick={close}
                accentColor="text-amber-400"
              />
            )}
          </nav>
        </div>
      )}

      {/* Super Admin */}
      {role === 'SUPER_ADMIN' && (
        <div>
          <p className="px-3 text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
            সুপার অ্যাডমিন কন্ট্রোল
          </p>
          <nav className="space-y-1">
            <NavItem href="/dashboard/admin" icon={<LayoutDashboard className="w-4 h-4" />} label="অ্যাডমিন কমান্ড সেন্টার" isActive={isActive('/dashboard/admin')} onClick={close} />
            <NavItem href="/dashboard/admin/approvals" icon={<UserCheck className="w-4 h-4" />} label="নতুন সদস্য অনুমোদন" isActive={isActive('/dashboard/admin/approvals')} onClick={close} />
            <NavItem href="/dashboard/admin/managers" icon={<Shield className="w-4 h-4" />} label="ম্যানেজার নিয়োগ" isActive={isActive('/dashboard/admin/managers')} onClick={close} />
            <NavItem href="/dashboard/admin/monthly-lock" icon={<Lock className="w-4 h-4" />} label="মাসিক লক ও নতুন মাস" isActive={isActive('/dashboard/admin/monthly-lock')} onClick={close} />
            <NavItem href="/dashboard/admin/database" icon={<Database className="w-4 h-4" />} label="ডাটাবেজ কানেকশন" isActive={isActive('/dashboard/admin/database')} onClick={close} />
          </nav>
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Desktop */}
      <aside className="hidden md:flex md:flex-col w-60 bg-slate-900 text-slate-300 min-h-[calc(100vh-61px)] p-4 flex-shrink-0 justify-between">
        {navContent}
        <div className="pt-4 border-t border-slate-800 text-xs text-slate-600">
          <p className="font-medium text-slate-500">মিল ম্যানেজমেন্ট সিস্টেম</p>
          <p>ভার্সন ১.০</p>
        </div>
      </aside>

      {/* Mobile Drawer */}
      {isMobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm"
            onClick={onCloseMobile}
          />
          <div className="relative w-4/5 max-w-xs bg-slate-900 text-slate-300 min-h-full p-5 flex flex-col justify-between shadow-2xl z-10 overflow-y-auto">
            {navContent}
            <div className="pt-4 border-t border-slate-800 text-xs text-slate-600">
              <p className="font-medium text-slate-500">মিল ম্যানেজমেন্ট সিস্টেম</p>
              <p>মোবাইল মেনু</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
