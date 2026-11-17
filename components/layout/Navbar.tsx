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
          badgeClass: 'bg-purple-600 text-white',
          avatarRing: 'ring-purple-400 bg-purple-50 text-purple-700',
          icon: <Crown className="w-3.5 h-3.5" />,
        };
      case 'MANAGER':
        return {
          label: `ম্যানেজার`,
          badgeClass: 'bg-amber-500 text-white',
          avatarRing: 'ring-amber-400 bg-amber-50 text-amber-700',
          icon: <Sparkles className="w-3.5 h-3.5" />,
        };
      default:
        return {
          label: 'সদস্য',
          badgeClass: 'bg-emerald-600 text-white',
          avatarRing: 'ring-emerald-400 bg-emerald-50 text-emerald-700',
          icon: <ShieldCheck className="w-3.5 h-3.5" />,
        };
    }
  };

  const roleConfig = getRoleConfig();
  const userInitial = user?.name ? user.name.trim().charAt(0).toUpperCase() : 'U';

  return (
    <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-lg border-b border-slate-200/60 shadow-sm">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-2 sm:gap-4">
        
        {/* Left: Hamburger + Logo + Role */}
        <div className="flex items-center space-x-2 sm:space-x-3 min-w-0">
          <button
            onClick={onToggleMobileMenu}
            className="md:hidden p-2 -ml-1 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-all btn-press"
            aria-label="Toggle menu"
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          <Link href="/dashboard" className="flex items-center space-x-2 group flex-shrink-0">
            <div className="p-1 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-600 text-white shadow-sm group-hover:scale-105 transition-transform">
              <Logo size="sm" showText={false} />
            </div>
            <div className="hidden xs:block leading-tight">
              <span className="font-bold text-slate-800 text-sm sm:text-base block group-hover:text-emerald-600 transition-colors">
                মিল ম্যানেজমেন্ট
              </span>
            </div>
          </Link>

          {/* Role Badge */}
          <div className="hidden md:flex items-center">
            <span className={`badge text-xs ${roleConfig.badgeClass}`}>
              {roleConfig.icon}
              <span>{roleConfig.label}</span>
            </span>
          </div>
        </div>

        {/* Right: Month Selector + Profile */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          
          {/* Month Selector */}
          <div className="relative flex items-center bg-slate-100 hover:bg-slate-200/80 border border-slate-200 rounded-xl p-1 sm:px-2.5 sm:py-1.5 transition-all">
            <div className="w-7 h-7 rounded-lg bg-white flex items-center justify-center text-emerald-600 shadow-sm flex-shrink-0 mr-1">
              <Calendar className="w-3.5 h-3.5" />
            </div>
            <select
              value={selectedMonth}
              onChange={(e) => onMonthChange(e.target.value)}
              className="bg-transparent font-bold text-slate-700 text-xs sm:text-sm focus:outline-none cursor-pointer pr-5 appearance-none"
              title="হিসাবের মাস নির্বাচন করুন"
            >
              {(availableMonths && availableMonths.length > 0 ? availableMonths : [selectedMonth]).map((ym) => {
                const lock = locks.find((l) => l.yearMonth === ym);
                const isClosed = lock?.status === 'CLOSED';
                return (
                  <option key={ym} value={ym} className="font-semibold text-slate-800 bg-white">
                    {ym} {isClosed ? '🔒' : '🟢'}
                  </option>
                );
              })}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 pointer-events-none absolute right-2 top-1/2 -translate-y-1/2" />
          </div>

          {/* Profile */}
          {user && (
            <div className="relative" ref={profileRef}>
              <button
                type="button"
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                className="flex items-center space-x-2 p-1 sm:pr-2 sm:pl-1 rounded-xl hover:bg-slate-100 border border-transparent hover:border-slate-200 transition-all btn-press"
              >
                <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center font-bold text-sm ring-2 ${roleConfig.avatarRing} shadow-sm`}>
                  {userInitial}
                </div>
                <div className="text-left hidden lg:block leading-tight">
                  <p className="text-xs font-bold text-slate-700 truncate max-w-[100px]">{user.name}</p>
                  <p className="text-xs text-slate-400">রুম: {user.roomNo}</p>
                </div>
                <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform hidden sm:block ${isProfileOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Dropdown */}
              {isProfileOpen && (
                <div className="absolute right-0 mt-2 w-60 bg-white rounded-2xl border border-slate-200 shadow-xl py-2 px-2 z-50">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 mb-2">
                    <p className="text-sm font-bold text-slate-800 truncate">{user.name}</p>
                    <p className="text-xs text-slate-500 mt-0.5">আইডি: <span className="font-bold text-slate-600">{user.memberId}</span></p>
                    <p className="text-xs text-slate-500">রুম: <span className="font-bold text-slate-600">{user.roomNo}</span></p>
                    <div className="mt-2 pt-2 border-t border-slate-200/60 flex items-center justify-between">
                      <span className="text-xs text-slate-400 font-bold uppercase">রোল</span>
                      <span className={`badge text-xs ${roleConfig.badgeClass}`}>
                        {roleConfig.label}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center space-x-2.5 px-3 py-2.5 text-red-600 hover:bg-red-50 rounded-xl transition-colors text-xs font-bold btn-press"
                  >
                    <div className="p-1.5 rounded-lg bg-red-100 text-red-600">
                      <LogOut className="w-3.5 h-3.5" />
                    </div>
                    <span>লগআউট করুন</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
