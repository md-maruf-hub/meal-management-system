'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  LogOut, 
  Calendar, 
  Menu, 
  X, 
  ChevronDown, 
  Sparkles,
  ShieldCheck,
  User,
  Crown,
  BellRing
} from 'lucide-react';
import { AuthSession } from '../../lib/types';
import { useDashboard } from '../../lib/DashboardContext';
import Logo from '../ui/Logo';

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
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  };

  const currentRole = effectiveRole || user?.role || 'GUEST';

  const getRoleConfig = () => {
    switch (currentRole) {
      case 'SUPER_ADMIN':
        return {
          label: 'সুপার অ্যাডমিন',
          badgeClass: 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-purple-500/25',
          avatarRing: 'ring-purple-400 bg-purple-50 text-purple-700',
          icon: <Crown className="w-3.5 h-3.5 mr-1" />,
        };
      case 'MANAGER':
        return {
          label: `ম্যানেজার (${selectedMonth})`,
          badgeClass: 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-amber-500/25',
          avatarRing: 'ring-amber-400 bg-amber-50 text-amber-700',
          icon: <Sparkles className="w-3.5 h-3.5 mr-1" />,
        };
      default:
        return {
          label: 'সদস্য',
          badgeClass: 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-emerald-500/25',
          avatarRing: 'ring-emerald-400 bg-emerald-50 text-emerald-700',
          icon: <ShieldCheck className="w-3.5 h-3.5 mr-1" />,
        };
    }
  };

  const roleConfig = getRoleConfig();
  const userInitial = user?.name ? user.name.trim().charAt(0).toUpperCase() : 'U';

  return (
    <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-200/80 shadow-sm transition-all">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 h-16 flex items-center justify-between gap-2 sm:gap-4">
        
        {/* Left Side: Mobile Drawer Toggle + Logo + Brand Title + Role Badge */}
        <div className="flex items-center space-x-2.5 sm:space-x-3.5 min-w-0">
          <button
            onClick={onToggleMobileMenu}
            className="md:hidden p-2 -ml-1 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-all focus:outline-none"
            aria-label="Toggle menu"
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>

          <Link href="/dashboard" className="flex items-center space-x-2.5 group flex-shrink-0">
            <div className="p-1.5 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-500/20 group-hover:scale-105 transition-transform">
              <Logo size="sm" showText={false} />
            </div>
            <div className="hidden xs:block leading-tight">
              <span className="font-extrabold text-slate-900 tracking-tight text-base sm:text-lg block group-hover:text-emerald-600 transition-colors">
                মিল ম্যানেজমেন্ট
              </span>
              <span className="text-[10px] text-slate-400 font-medium hidden sm:block">
                ডিজিটাল মেস হিসাব পোর্টাল
              </span>
            </div>
          </Link>

          {/* Dynamic Modern Role Badge */}
          <div className="hidden md:flex items-center">
            <span className={`inline-flex items-center text-xs font-bold px-3 py-1 rounded-full shadow-sm ${roleConfig.badgeClass}`}>
              {roleConfig.icon}
              {roleConfig.label}
            </span>
          </div>
        </div>

        {/* Right Side: Month Switcher Capsule + Profile Card Dropdown */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          
          {/* Modern Month Selector Pill */}
          <div className="relative flex items-center bg-slate-100/90 hover:bg-slate-200/80 border border-slate-200/90 rounded-2xl p-1 sm:px-3 sm:py-1.5 transition-all shadow-inner group">
            <div className="w-7 h-7 sm:w-6 sm:h-6 rounded-xl bg-white flex items-center justify-center text-emerald-600 shadow-sm flex-shrink-0 mr-1 sm:mr-2">
              <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
            <select
              value={selectedMonth}
              onChange={(e) => onMonthChange(e.target.value)}
              className="bg-transparent font-bold text-slate-800 text-xs sm:text-sm focus:outline-none cursor-pointer pr-4 appearance-none"
              title="হিসাবের মাস নির্বাচন করুন"
            >
              {(availableMonths && availableMonths.length > 0 ? availableMonths : [selectedMonth]).map((ym) => {
                const lock = locks.find((l) => l.yearMonth === ym);
                const isClosed = lock?.status === 'CLOSED';
                return (
                  <option key={ym} value={ym} className="font-semibold text-slate-800 bg-white">
                    {ym} {isClosed ? '🔒 (লকড)' : '🟢 (চলমান)'}
                  </option>
                );
              })}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 pointer-events-none absolute right-2 sm:right-2.5 top-1/2 -translate-y-1/2" />
          </div>

          {/* User Profile Capsule with Interactive Dropdown */}
          {user && (
            <div className="relative" ref={profileRef}>
              <button
                type="button"
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                className="flex items-center space-x-2 p-1 sm:pr-2.5 sm:pl-1.5 rounded-2xl hover:bg-slate-100/80 border border-transparent hover:border-slate-200 transition-all focus:outline-none cursor-pointer"
              >
                <div className={`w-9 h-9 rounded-2xl flex items-center justify-center font-extrabold text-sm ring-2 ${roleConfig.avatarRing} shadow-sm`}>
                  {userInitial}
                </div>
                <div className="text-left hidden lg:block leading-tight">
                  <p className="text-xs font-bold text-slate-800 truncate max-w-[120px]">{user.name}</p>
                  <p className="text-[10px] text-slate-400 font-semibold">রুম: {user.roomNo}</p>
                </div>
                <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform hidden sm:block ${isProfileOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Profile Dropdown Menu */}
              {isProfileOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-3xl border border-slate-200/90 shadow-xl shadow-slate-900/10 py-3 px-3 z-50 animate-in fade-in zoom-in-95 duration-150">
                  <div className="p-3 bg-gradient-to-br from-slate-50 to-slate-100/70 rounded-2xl border border-slate-100 mb-2">
                    <p className="text-sm font-extrabold text-slate-900 truncate">{user.name}</p>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">মেম্বার আইডি: <span className="font-bold text-slate-700">{user.memberId}</span></p>
                    <p className="text-xs text-slate-500 font-medium">রুম নং: <span className="font-bold text-slate-700">{user.roomNo}</span></p>
                    <div className="mt-2.5 pt-2 border-t border-slate-200/60 flex items-center justify-between">
                      <span className="text-[10px] uppercase font-extrabold tracking-wider text-slate-400">রোল</span>
                      <span className={`text-[11px] font-extrabold px-2 py-0.5 rounded-full ${roleConfig.badgeClass}`}>
                        {roleConfig.label}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1 text-xs font-bold">
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center space-x-2.5 px-3 py-2.5 text-red-600 hover:bg-red-50 rounded-xl transition-colors cursor-pointer"
                    >
                      <div className="p-1.5 rounded-lg bg-red-100/80 text-red-600">
                        <LogOut className="w-3.5 h-3.5" />
                      </div>
                      <span>লগআউট করুন</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>

      </div>
    </header>
  );
}
