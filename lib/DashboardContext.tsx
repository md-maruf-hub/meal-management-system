'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { AuthSession, UserRole, MonthLock } from './types';

interface DashboardContextType {
  user: AuthSession['user'] | null;
  selectedMonth: string;
  setSelectedMonth: (month: string) => void;
  effectiveRole: UserRole;
  refreshLocks: () => Promise<void>;
  locks: MonthLock[];
  isLoading: boolean;
  assignedMonths: string[];
  availableMonths: string[];
}

const getCurrentYearMonth = () => new Date().toISOString().substring(0, 7);

const DashboardContext = createContext<DashboardContextType>({
  user: null,
  selectedMonth: getCurrentYearMonth(),
  setSelectedMonth: () => {},
  effectiveRole: 'MEMBER',
  refreshLocks: async () => {},
  locks: [],
  isLoading: true,
  assignedMonths: [],
  availableMonths: [],
});

export function DashboardProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthSession['user'] | null>(null);
  const [selectedMonth, setSelectedMonthState] = useState<string>(getCurrentYearMonth());
  const [locks, setLocks] = useState<MonthLock[]>([]);
  const [availableMonths, setAvailableMonths] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize selectedMonth from URL search param or localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const urlMonth = urlParams.get('month') || urlParams.get('yearMonth');
      if (urlMonth && /^\d{4}-\d{2}$/.test(urlMonth)) {
        setSelectedMonthState(urlMonth);
        localStorage.setItem('mess_selected_month', urlMonth);
        return;
      }

      const saved = localStorage.getItem('mess_selected_month');
      if (saved && /^\d{4}-\d{2}$/.test(saved)) {
        setSelectedMonthState(saved);
      }
    }
  }, []);

  const setSelectedMonth = (month: string) => {
    setSelectedMonthState(month);
    if (typeof window !== 'undefined') {
      localStorage.setItem('mess_selected_month', month);
    }
  };


  const refreshLocks = async () => {
    try {
      const res = await fetch('/api/admin/lock-month');
      const data = await res.json();
      setLocks(data.monthLocks || []);
      if (Array.isArray(data.availableMonths)) {
        setAvailableMonths(data.availableMonths);
      }
    } catch (err) {}
  };

  useEffect(() => {
    let isMounted = true;
    Promise.all([
      fetch('/api/auth/me').then((res) => (res.ok ? res.json() : { user: null })).catch(() => ({ user: null })),
      fetch('/api/admin/lock-month').then((res) => (res.ok ? res.json() : { monthLocks: [], availableMonths: [] })).catch(() => ({ monthLocks: [], availableMonths: [] })),
    ]).then(([authData, lockData]) => {
      if (!isMounted) return;
      if (authData?.user) {
        setUser(authData.user);
      }
      if (lockData?.monthLocks) {
        setLocks(lockData.monthLocks);
      }
      if (Array.isArray(lockData?.availableMonths)) {
        setAvailableMonths(lockData.availableMonths);
      }
      setIsLoading(false);
    });

    return () => {
      isMounted = false;
    };
  }, []);

  // Compute all months where this user was or is manager (supporting both managerId and managerIds)
  const assignedMonths = user && locks.length > 0
    ? locks
        .filter((l) => {
          const ids = l.managerIds && l.managerIds.length > 0 ? l.managerIds : (l.managerId ? [l.managerId] : []);
          return ids.includes(user.id) || ids.includes(user.memberId);
        })
        .map((l) => l.yearMonth)
    : [];

  // Dynamically compute effective role depending on month manager assignment
  let effectiveRole: UserRole = 'MEMBER';
  if (user) {
    if (user.role === 'SUPER_ADMIN') {
      effectiveRole = 'SUPER_ADMIN';
    } else {
      const currentLock = locks.find((l) => l.yearMonth === selectedMonth);
      const ids = currentLock?.managerIds && currentLock.managerIds.length > 0 
        ? currentLock.managerIds 
        : (currentLock?.managerId ? [currentLock.managerId] : []);
      const isAssignedManager = ids.includes(user.id) || ids.includes(user.memberId);
      effectiveRole = isAssignedManager ? 'MANAGER' : 'MEMBER';
    }
  }

  const computedAvailableMonths = Array.from(
    new Set([
      ...availableMonths,
      ...locks.map((l) => l.yearMonth),
      selectedMonth,
      getCurrentYearMonth(),
    ].filter(Boolean))
  ).sort().reverse();

  return (
    <DashboardContext.Provider
      value={{
        user,
        selectedMonth,
        setSelectedMonth,
        effectiveRole,
        refreshLocks,
        locks,
        isLoading,
        assignedMonths,
        availableMonths: computedAvailableMonths,
      }}
    >
      {children}
    </DashboardContext.Provider>
  );
}

export function useDashboard() {
  return useContext(DashboardContext);
}
