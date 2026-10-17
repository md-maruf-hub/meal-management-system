'use client';

import React, { useState, useEffect } from 'react';
import { MealEntry } from '../../../../lib/types';
import { useDashboard } from '../../../../lib/DashboardContext';
import { Save, Lock, CheckCircle, AlertCircle, Calendar, ChevronLeft, ChevronRight, Grid, List, Settings, Utensils } from 'lucide-react';
import CookingBoard from '../../../../components/manager/CookingBoard';
import DataLoader from '../../../../components/ui/DataLoader';

interface DailyMemberMealState {
  memberId: string;
  name: string;
  roomNo: string;
  b: boolean; // Breakfast
  l: boolean; // Lunch
  d: boolean; // Dinner
  g: number;  // Guest / Extra meals
}

export default function DailyMealsMatrix() {
  const { user, selectedMonth } = useDashboard();

  // View Mode: 'COOKING_BOARD' vs 'DAILY_BLDG' vs 'MONTHLY_MATRIX'
  const [viewMode, setViewMode] = useState<'COOKING_BOARD' | 'DAILY_BLDG' | 'MONTHLY_MATRIX'>('COOKING_BOARD');

  // Configurable Meal Values for B, L, D (Default: B=0.5, L=1.0, D=1.0)
  const [bValue, setBValue] = useState<number>(0.5);
  const [lValue, setLValue] = useState<number>(1.0);
  const [dValue, setDValue] = useState<number>(1.0);

  // Selected date for Daily Entry View (e.g. "2026-08-18")
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date().toISOString().split('T')[0];
    return today.startsWith(selectedMonth) ? today : `${selectedMonth}-01`;
  });

  const [meals, setMeals] = useState<Record<string, Record<number, number>>>({});
  const [dailyState, setDailyState] = useState<DailyMemberMealState[]>([]);
  const [assignedManagers, setAssignedManagers] = useState<Array<{ id: string; name: string; memberId: string; roomNo: string }>>([]);
  const [isLocked, setIsLocked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const daysInMonth = 31;
  const currentDayNum = parseInt(selectedDate.split('-')[2] || '1', 10);

  useEffect(() => {
    fetchData();
  }, [selectedMonth]);

  useEffect(() => {
    if (!selectedDate.startsWith(selectedMonth)) {
      setSelectedDate(`${selectedMonth}-01`);
    }
  }, [selectedMonth]);

  const fetchData = async () => {
    setLoading(true);
    setMessage('');
    setError('');

    try {
      // 1. Fetch Lock status
      const lockRes = await fetch(`/api/admin/lock-month`);
      const lockData = await lockRes.json();
      const monthLock = lockData.monthLocks?.find(
        (l: { yearMonth: string; status: string }) => l.yearMonth === selectedMonth && (l.status === 'CLOSED' || l.status === 'LOCKED')
      );
      setIsLocked(Boolean(monthLock));

      // 2. Fetch Meals
      const mealsRes = await fetch(`/api/meals?yearMonth=${selectedMonth}`);
      const mealsData = await mealsRes.json();

      const matrixMap: Record<string, Record<number, number>> = {};
      (mealsData.meals || []).forEach((m: MealEntry) => {
        if (!matrixMap[m.memberId]) matrixMap[m.memberId] = {};
        matrixMap[m.memberId][m.day] = m.mealCount;
      });

      setMeals(matrixMap);

      // 3. Fetch Members & Managers
      const repRes = await fetch(`/api/reports?yearMonth=${selectedMonth}`);
      const repData = await repRes.json();
      setAssignedManagers(repData.report?.assignedManagers || []);
      const activeMembers = repData.report?.memberCalculations || [];

      // Initialize daily B/L/D/G state for currentDayNum
      const initDaily: DailyMemberMealState[] = activeMembers.map((m: any) => {
        const total = matrixMap[m.memberId]?.[currentDayNum] || 0;
        let b = false;
        let l = false;
        let d = false;
        let g = 0;

        const bVal = bValue || 0.5;
        const lVal = lValue || 1.0;
        const dVal = dValue || 1.0;
        const fullDay = bVal + lVal + dVal;

        if (total >= fullDay) {
          b = true; l = true; d = true; g = roundDec(total - fullDay);
        } else if (total >= (lVal + dVal)) {
          b = false; l = true; d = true; g = roundDec(total - (lVal + dVal));
        } else if (total >= lVal) {
          b = false; l = true; d = false; g = roundDec(total - lVal);
        } else if (total >= bVal) {
          b = true; l = false; d = false; g = roundDec(total - bVal);
        }

        return {
          memberId: m.memberId,
          name: m.memberName,
          roomNo: m.roomNo,
          b,
          l,
          d,
          g,
        };
      });

      setDailyState(initDaily);
      setLoading(false);
    } catch (err) {
      setError('Failed to load meal matrix data.');
      setLoading(false);
    }
  };

  useEffect(() => {
    if (Object.keys(meals).length === 0) return;
    setDailyState((prev) =>
      prev.map((item) => {
        const total = meals[item.memberId]?.[currentDayNum] || 0;
        let b = false;
        let l = false;
        let d = false;
        let g = 0;

        const bVal = bValue || 0.5;
        const lVal = lValue || 1.0;
        const dVal = dValue || 1.0;
        const fullDay = bVal + lVal + dVal;

        if (total >= fullDay) {
          b = true; l = true; d = true; g = roundDec(total - fullDay);
        } else if (total >= (lVal + dVal)) {
          b = false; l = true; d = true; g = roundDec(total - (lVal + dVal));
        } else if (total >= lVal) {
          b = false; l = true; d = false; g = roundDec(total - lVal);
        } else if (total >= bVal) {
          b = true; l = false; d = false; g = roundDec(total - bVal);
        }

        return { ...item, b, l, d, g };
      })
    );
  }, [selectedDate, bValue, lValue, dValue, meals]);

  function roundDec(val: number) {
    return Math.max(0, Math.round((val + Number.EPSILON) * 10) / 10);
  }

  const calculateRowTotal = (row: DailyMemberMealState) => {
    const bVal = row.b ? (bValue || 0.5) : 0;
    const lVal = row.l ? (lValue || 1.0) : 0;
    const dVal = row.d ? (dValue || 1.0) : 0;
    return roundDec(bVal + lVal + dVal + (Number(row.g) || 0));
  };

  const handleDailyCheckChange = (memberId: string, field: 'b' | 'l' | 'd', checked: boolean) => {
    if (isLocked) return;
    setDailyState((prev) =>
      prev.map((row) => {
        if (row.memberId !== memberId) return row;
        const updated = { ...row, [field]: checked };
        const newTotal = calculateRowTotal(updated);

        setMeals((mPrev) => ({
          ...mPrev,
          [memberId]: {
            ...(mPrev[memberId] || {}),
            [currentDayNum]: newTotal,
          },
        }));

        return updated;
      })
    );
  };

  const handleDailyGuestChange = (memberId: string, val: string) => {
    if (isLocked) return;
    const gCount = parseFloat(val) || 0;
    setDailyState((prev) =>
      prev.map((row) => {
        if (row.memberId !== memberId) return row;
        const updated = { ...row, g: gCount };
        const newTotal = calculateRowTotal(updated);

        setMeals((mPrev) => ({
          ...mPrev,
          [memberId]: {
            ...(mPrev[memberId] || {}),
            [currentDayNum]: newTotal,
          },
        }));

        return updated;
      })
    );
  };

  const handleMatrixCellChange = (memberId: string, day: number, value: string) => {
    if (isLocked) return;
    const count = parseFloat(value) || 0;
    setMeals((prev) => ({
      ...prev,
      [memberId]: {
        ...(prev[memberId] || {}),
        [day]: count,
      },
    }));
  };

  const handleSave = async () => {
    if (isLocked) return;
    setSaving(true);
    setMessage('');
    setError('');

    const updates: Array<{ memberId: string; day: number; mealCount: number }> = [];

    Object.keys(meals).forEach((memberId) => {
      Object.keys(meals[memberId]).forEach((dayStr) => {
        const day = parseInt(dayStr, 10);
        updates.push({
          memberId,
          day,
          mealCount: meals[memberId][day],
        });
      });
    });

    try {
      const res = await fetch('/api/meals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          yearMonth: selectedMonth,
          updates,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to save meals.');
        setSaving(false);
        return;
      }

      setMessage('Daily Mill Entry saved successfully!');
      setSaving(false);
    } catch (err) {
      setError('Error saving meals.');
      setSaving(false);
    }
  };

  const totalBCount = dailyState.filter((r) => r.b).length;
  const totalLCount = dailyState.filter((r) => r.l).length;
  const totalDCount = dailyState.filter((r) => r.d).length;

  const navigateDate = (dir: -1 | 1) => {
    const current = new Date(selectedDate);
    current.setDate(current.getDate() + dir);
    const iso = current.toISOString().split('T')[0];
    if (iso.startsWith(selectedMonth)) {
      setSelectedDate(iso);
    }
  };

  const getMemberTotal = (memberId: string) => {
    const memberDays = meals[memberId] || {};
    return Object.values(memberDays).reduce((sum, count) => sum + (count || 0), 0);
  };

  const getDayTotal = (day: number) => {
    let sum = 0;
    Object.keys(meals).forEach((memberId) => {
      sum += meals[memberId]?.[day] || 0;
    });
    return sum;
  };

  const getOverallTotal = () => {
    let sum = 0;
    Object.keys(meals).forEach((memberId) => {
      sum += getMemberTotal(memberId);
    });
    return sum;
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Month Active Managers Banner */}
      {assignedManagers.length > 0 && (
        <div className="bg-slate-900 text-white px-4 py-3 rounded-2xl border border-slate-700/60 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-extrabold text-emerald-400 flex items-center space-x-1.5">
              <span>👑 {selectedMonth} মাসের দায়িত্বে ({assignedManagers.length}/৩ জন):</span>
            </span>
            {assignedManagers.map((m) => (
              <span
                key={m.id}
                className="bg-slate-800 text-slate-200 px-3 py-1 rounded-xl border border-slate-700 font-bold flex items-center space-x-1 shadow-sm"
              >
                <span>{m.name}</span>
                {m.roomNo && <span className="text-[11px] text-emerald-300 font-semibold">(রুম {m.roomNo})</span>}
              </span>
            ))}
          </div>
          <span className="text-[11px] text-slate-400 font-medium self-end sm:self-auto">
            রিয়েল-টাইম ম্যানেজার তালিকা
          </span>
        </div>
      )}

      {/* View Switcher & Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 sm:p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setViewMode('COOKING_BOARD')}
            className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
              viewMode === 'COOKING_BOARD'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Utensils className="w-4 h-4" />
            <span>🍳 রান্নার লাইভ বোর্ড</span>
          </button>
          <button
            onClick={() => setViewMode('DAILY_BLDG')}
            className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
              viewMode === 'DAILY_BLDG'
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <List className="w-4 h-4" />
            <span>📋 দৈনিক চেকলিস্ট ভিউ</span>
          </button>
          <button
            onClick={() => setViewMode('MONTHLY_MATRIX')}
            className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
              viewMode === 'MONTHLY_MATRIX'
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Grid className="w-4 h-4" />
            <span>📊 ৩১ দিনের পূর্ণ ছক</span>
          </button>
        </div>

        <div>
          {isLocked ? (
            <div className="flex items-center space-x-1.5 bg-amber-50 text-amber-800 border border-amber-300 px-3 py-1.5 rounded-xl text-xs font-bold">
              <Lock className="w-3.5 h-3.5 text-amber-600" />
              <span>🔒 মাস ক্লোজড</span>
            </div>
          ) : viewMode !== 'COOKING_BOARD' ? (
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-2 rounded-xl shadow transition-colors text-xs sm:text-sm"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'সংরক্ষণ হচ্ছে...' : 'মিলের হিসাব সংরক্ষণ করুন'}</span>
            </button>
          ) : null}
        </div>
      </div>

      {message && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-2xl flex items-center space-x-2">
          <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>{message}</span>
        </div>
      )}

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-800 text-xs font-bold rounded-2xl flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <DataLoader
          text="মিলের হিসাব ও রান্নার বোর্ড লোড হচ্ছে..."
          subtext="গুগল শিট ও ডাটাবেজ থেকে সদস্যদের মিল ম্যাট্রিক্স সংগ্রহ করা হচ্ছে..."
          variant="table"
        />
      ) : (
        <>
          {/* VIEW MODE 0: KITCHEN COOKING BOARD */}
          {viewMode === 'COOKING_BOARD' && (
        <CookingBoard
          selectedMonth={selectedMonth}
          onSyncComplete={fetchData}
        />
      )}

      {/* VIEW MODE 1: DAILY B/L/D/G ENTRY VIEW */}
      {viewMode === 'DAILY_BLDG' && (
        <div className="space-y-5">
          {/* Header Banner */}
          <div className="bg-blue-600 text-white p-5 rounded-2xl sm:rounded-3xl text-center shadow-lg space-y-1">
            <div className="flex items-center justify-center space-x-2">
              <span className="text-xl sm:text-2xl">🍽️</span>
              <h1 className="text-xl sm:text-2xl font-extrabold tracking-wide">
                দৈনিক মিল এন্ট্রি
              </h1>
            </div>
            <div className="flex items-center justify-center space-x-3 text-xs sm:text-sm font-semibold opacity-95 pt-1">
              <button
                onClick={() => navigateDate(-1)}
                className="p-1 hover:bg-blue-700 rounded-lg transition-colors"
                title="পূর্ববর্তী দিন"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <div className="flex items-center space-x-1.5 bg-blue-700/60 px-3 py-1 rounded-xl">
                <Calendar className="w-4 h-4 text-blue-200" />
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="bg-transparent text-white font-bold focus:outline-none cursor-pointer text-center"
                />
              </div>
              <button
                onClick={() => navigateDate(1)}
                className="p-1 hover:bg-blue-700 rounded-lg transition-colors"
                title="পরবর্তী দিন"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Interactive B, L, D Configurable Value Box Row */}
          <div className="bg-white p-4 rounded-2xl border border-blue-200 shadow-sm space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-500 font-bold">
              <span className="flex items-center space-x-1">
                <Settings className="w-3.5 h-3.5 text-blue-600" />
                <span>মিলের মান কনফিগারেশন (B, L, D বক্স)</span>
              </span>
              <span className="text-[11px] text-blue-600 font-semibold">সকাল, দুপুর ও রাতের মিলের পয়েন্ট বা মান পরিবর্তন করুন</span>
            </div>

            <div className="grid grid-cols-3 gap-3 sm:gap-6">
              {/* B Box */}
              <div className="bg-blue-50/70 p-3 rounded-2xl border-2 border-blue-400 text-center space-y-1">
                <span className="text-xs font-extrabold text-blue-700 uppercase tracking-wider block">
                  B (সকালের নাস্তা)
                </span>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  disabled={isLocked}
                  value={bValue}
                  onChange={(e) => setBValue(parseFloat(e.target.value) || 0)}
                  className="w-full max-w-[100px] text-center font-extrabold text-slate-900 bg-white border border-blue-300 rounded-xl py-1 text-sm sm:text-base focus:ring-2 focus:ring-blue-500 focus:outline-none shadow-inner"
                />
                <span className="text-[11px] font-bold text-slate-500 block">
                  চিহ্নিত মিল: {totalBCount} জন
                </span>
              </div>

              {/* L Box */}
              <div className="bg-blue-50/70 p-3 rounded-2xl border-2 border-blue-400 text-center space-y-1">
                <span className="text-xs font-extrabold text-blue-700 uppercase tracking-wider block">
                  L (দুপুরের খাবার)
                </span>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  disabled={isLocked}
                  value={lValue}
                  onChange={(e) => setLValue(parseFloat(e.target.value) || 0)}
                  className="w-full max-w-[100px] text-center font-extrabold text-slate-900 bg-white border border-blue-300 rounded-xl py-1 text-sm sm:text-base focus:ring-2 focus:ring-blue-500 focus:outline-none shadow-inner"
                />
                <span className="text-[11px] font-bold text-slate-500 block">
                  চিহ্নিত মিল: {totalLCount} জন
                </span>
              </div>

              {/* D Box */}
              <div className="bg-blue-50/70 p-3 rounded-2xl border-2 border-blue-400 text-center space-y-1">
                <span className="text-xs font-extrabold text-blue-700 uppercase tracking-wider block">
                  D (রাতের খাবার)
                </span>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  disabled={isLocked}
                  value={dValue}
                  onChange={(e) => setDValue(parseFloat(e.target.value) || 0)}
                  className="w-full max-w-[100px] text-center font-extrabold text-slate-900 bg-white border border-blue-300 rounded-xl py-1 text-sm sm:text-base focus:ring-2 focus:ring-blue-500 focus:outline-none shadow-inner"
                />
                <span className="text-[11px] font-bold text-slate-500 block">
                  চিহ্নিত মিল: {totalDCount} জন
                </span>
              </div>
            </div>
          </div>

          {/* Member B/L/D/G Table */}
          <div className="bg-white rounded-2xl border border-blue-200 shadow-md overflow-x-auto">
            <table className="w-full text-xs sm:text-sm text-left border-collapse min-w-[500px]">
              <thead>
                <tr className="bg-blue-600 text-white font-extrabold uppercase text-xs">
                  <th className="p-3.5 pl-6 w-1/3">সদস্যের নাম</th>
                  <th className="p-3.5 text-center w-20">B ({bValue})</th>
                  <th className="p-3.5 text-center w-20">L ({lValue})</th>
                  <th className="p-3.5 text-center w-20">D ({dValue})</th>
                  <th className="p-3.5 text-center w-20">গেস্ট (G)</th>
                  <th className="p-3.5 text-center pr-6 w-20">মোট মিল</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-blue-100">
                {dailyState.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-500">
                      সদস্যদের মিল তালিকা লোড হচ্ছে...
                    </td>
                  </tr>
                ) : (
                  dailyState.map((row, idx) => {
                    const rowTotal = calculateRowTotal(row);
                    return (
                      <tr
                        key={row.memberId}
                        className={idx % 2 === 0 ? 'bg-blue-50/30' : 'bg-white'}
                      >
                        <td className="p-3.5 pl-6 font-extrabold text-blue-900 tracking-wide uppercase">
                          {row.name}
                        </td>

                        <td className="p-3.5 text-center">
                          <div className="flex flex-col items-center">
                            <input
                              type="checkbox"
                              disabled={isLocked}
                              checked={row.b}
                              onChange={(e) => handleDailyCheckChange(row.memberId, 'b', e.target.checked)}
                              className="w-5 h-5 text-blue-600 border-2 border-blue-400 rounded focus:ring-blue-500 cursor-pointer disabled:opacity-50"
                            />
                          </div>
                        </td>

                        <td className="p-3.5 text-center">
                          <div className="flex flex-col items-center">
                            <input
                              type="checkbox"
                              disabled={isLocked}
                              checked={row.l}
                              onChange={(e) => handleDailyCheckChange(row.memberId, 'l', e.target.checked)}
                              className="w-5 h-5 text-blue-600 border-2 border-blue-400 rounded focus:ring-blue-500 cursor-pointer disabled:opacity-50"
                            />
                          </div>
                        </td>

                        <td className="p-3.5 text-center">
                          <div className="flex flex-col items-center">
                            <input
                              type="checkbox"
                              disabled={isLocked}
                              checked={row.d}
                              onChange={(e) => handleDailyCheckChange(row.memberId, 'd', e.target.checked)}
                              className="w-5 h-5 text-blue-600 border-2 border-blue-400 rounded focus:ring-blue-500 cursor-pointer disabled:opacity-50"
                            />
                          </div>
                        </td>

                        <td className="p-3.5 text-center">
                          <input
                            type="number"
                            step="0.5"
                            min="0"
                            disabled={isLocked}
                            value={row.g || 0}
                            onChange={(e) => handleDailyGuestChange(row.memberId, e.target.value)}
                            className="w-12 py-1 text-center font-bold text-slate-800 border-2 border-blue-400 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                          />
                        </td>

                        <td className="p-3.5 text-center pr-6 font-extrabold text-slate-900 text-base">
                          {rowTotal}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW MODE 2: 31-DAY FULL MONTH MATRIX VIEW */}
      {viewMode === 'MONTHLY_MATRIX' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse min-w-[1100px]">
            <thead>
              <tr className="bg-slate-800 text-white font-semibold">
                <th className="p-3 sticky left-0 z-20 bg-slate-800 border-r border-slate-700 w-12 text-center">রুম</th>
                <th className="p-3 sticky left-12 z-20 bg-slate-800 border-r border-slate-700 w-36">সদস্যের নাম</th>
                {Array.from({ length: daysInMonth }).map((_, idx) => (
                  <th key={idx + 1} className="p-2 border-r border-slate-700 text-center w-9">
                    {idx + 1}
                  </th>
                ))}
                <th className="p-3 bg-emerald-700 text-white text-center font-bold sticky right-0 z-20 w-16">মোট</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {Object.keys(meals).length === 0 ? (
                <tr>
                  <td colSpan={34} className="p-8 text-center text-slate-500">
                    মিলের তালিকা লোড হচ্ছে...
                  </td>
                </tr>
              ) : (
                Object.keys(meals).map((memberId, rowIdx) => {
                  const memberTotal = getMemberTotal(memberId);
                  const memberObj = dailyState.find((d) => d.memberId === memberId);
                  return (
                    <tr key={memberId} className={rowIdx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                      <td className="p-2 sticky left-0 z-10 bg-white border-r border-slate-200 text-center font-bold text-slate-700">
                        {memberObj?.roomNo || '১০১'}
                      </td>
                      <td className="p-2 sticky left-12 z-10 bg-white border-r border-slate-200 font-semibold text-slate-800 truncate max-w-[140px]">
                        {memberObj?.name || memberId}
                      </td>
                      {Array.from({ length: daysInMonth }).map((_, idx) => {
                        const day = idx + 1;
                        const count = meals[memberId]?.[day] ?? '';
                        return (
                          <td key={day} className="p-1 border-r border-slate-200 text-center">
                            <input
                              type="number"
                              step="0.5"
                              min="0"
                              disabled={isLocked}
                              value={count}
                              onChange={(e) => handleMatrixCellChange(memberId, day, e.target.value)}
                              className="w-8 py-1 text-center font-semibold text-slate-800 bg-slate-50 border border-slate-200 rounded hover:bg-emerald-50 focus:bg-emerald-100 disabled:opacity-50 touch-manipulation"
                            />
                          </td>
                        );
                      })}
                      <td className="p-2 sticky right-0 z-10 bg-emerald-50 font-bold text-emerald-800 text-center border-l border-emerald-200">
                        {memberTotal}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            <tfoot>
              <tr className="bg-slate-900 text-white font-bold">
                <td colSpan={2} className="p-3 text-right sticky left-0 z-20 bg-slate-900 border-r border-slate-800">
                  দৈনিক মোট মিল
                </td>
                {Array.from({ length: daysInMonth }).map((_, idx) => {
                  const day = idx + 1;
                  return (
                    <td key={day} className="p-2 text-center border-r border-slate-800 text-emerald-400">
                      {getDayTotal(day)}
                    </td>
                  );
                })}
                <td className="p-3 sticky right-0 z-20 bg-emerald-600 text-white text-center font-extrabold text-sm">
                  {getOverallTotal()}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
        </>
      )}
    </div>
  );
}
