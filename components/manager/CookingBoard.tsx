'use client';

import React, { useState, useEffect } from 'react';
import {
  Utensils,
  Lock,
  Unlock,
  CheckCircle,
  AlertCircle,
  Users,
  Search,
  RefreshCw,
  Save,
  Sliders,
  Plus,
  Minus,
  FileSpreadsheet,
  ChevronDown,
  ChevronUp,
  Check,
  X,
  Settings2,
  Sparkles,
} from 'lucide-react';

interface CookingBoardProps {
  selectedMonth: string;
  onSyncComplete?: () => void;
}

export default function CookingBoard({ selectedMonth, onSyncComplete }: CookingBoardProps) {
  const getTodayStr = () => new Date().toISOString().split('T')[0];
  const getTomorrowStr = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  };

  const today = getTodayStr();
  const tomorrow = getTomorrowStr();

  const [date, setDate] = useState<string>(() => {
    return today.startsWith(selectedMonth) ? today : `${selectedMonth}-01`;
  });

  const [data, setData] = useState<any>(null);
  const [membersState, setMembersState] = useState<any[]>([]);
  const [dirtyMap, setDirtyMap] = useState<Record<string, boolean>>({});
  const [savingRowId, setSavingRowId] = useState<string | null>(null);
  const [savingBulk, setSavingBulk] = useState(false);

  // Google Sheets Sync State
  const [isAddedToSheet, setIsAddedToSheet] = useState<boolean>(false);
  const [sheetMealCount, setSheetMealCount] = useState<number>(0);
  const [syncingToSheet, setSyncingToSheet] = useState<boolean>(false);

  // Configurable Meal Values/Weights
  const [bWeight, setBWeight] = useState<number>(0.5);
  const [lWeight, setLWeight] = useState<number>(1.0);
  const [dWeight, setDWeight] = useState<number>(1.0);

  // Configurable Guest Meal Values/Weights
  const [guestBWeight, setGuestBWeight] = useState<number>(0.5);
  const [guestLWeight, setGuestLWeight] = useState<number>(1.0);
  const [guestDWeight, setGuestDWeight] = useState<number>(1.0);
  const [showCustomGuestWeights, setShowCustomGuestWeights] = useState<boolean>(false);

  // Expandable Weights Setting Drawer
  const [isWeightSettingsOpen, setIsWeightSettingsOpen] = useState<boolean>(false);

  // Guest Breakdown Modal State
  const [guestModalMember, setGuestModalMember] = useState<any | null>(null);
  const [modalGuestB, setModalGuestB] = useState<number>(0);
  const [modalGuestL, setModalGuestL] = useState<number>(0);
  const [modalGuestD, setModalGuestD] = useState<number>(0);

  const [loading, setLoading] = useState(true);
  const [processingLock, setProcessingLock] = useState(false);
  const [breakfastLocked, setBreakfastLocked] = useState(false);
  const [lunchLocked, setLunchLocked] = useState(false);
  const [dinnerLocked, setDinnerLocked] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | 'EATING' | 'OFF'>('ALL');
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchCookingData();
  }, [date]);

  const fetchCookingData = async () => {
    setLoading(true);
    setToastMessage(null);
    try {
      const res = await fetch(`/api/manager/cooking-board?date=${date}`);
      const resData = await res.json();
      if (res.ok && resData.success) {
        setData(resData);
        setMembersState(resData.membersList || []);
        setBreakfastLocked(Boolean(resData.breakfastLocked));
        setLunchLocked(Boolean(resData.lunchLocked));
        setDinnerLocked(Boolean(resData.dinnerLocked));

        const bVal = typeof resData.bValue === 'number' ? resData.bValue : 0.5;
        const lVal = typeof resData.lValue === 'number' ? resData.lValue : 1.0;
        const dVal = typeof resData.dValue === 'number' ? resData.dValue : 1.0;
        setBWeight(bVal);
        setLWeight(lVal);
        setDWeight(dVal);

        const gbVal = typeof resData.gbValue === 'number' ? resData.gbValue : bVal;
        const glVal = typeof resData.glValue === 'number' ? resData.glValue : lVal;
        const gdVal = typeof resData.gdValue === 'number' ? resData.gdValue : dVal;
        setGuestBWeight(gbVal);
        setGuestLWeight(glVal);
        setGuestDWeight(gdVal);

        const hasCustom = Boolean(resData.hasCustomGuestWeights) || gbVal !== bVal || glVal !== lVal || gdVal !== dVal;
        setShowCustomGuestWeights(hasCustom);

        setIsAddedToSheet(Boolean(resData.isAddedToSheet));
        setSheetMealCount(Number(resData.sheetTotalMealCount) || 0);

        setDirtyMap({});
      }
      setLoading(false);
    } catch (err) {
      setLoading(false);
    }
  };

  const handleAddToSheet = async () => {
    setSyncingToSheet(true);
    setToastMessage(null);
    try {
      const res = await fetch('/api/manager/cooking-board', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date,
          action: 'ADD_TO_SHEET',
          bValue: bWeight,
          lValue: lWeight,
          dValue: dWeight,
          gbValue: showCustomGuestWeights ? guestBWeight : bWeight,
          glValue: showCustomGuestWeights ? guestLWeight : lWeight,
          gdValue: showCustomGuestWeights ? guestDWeight : dWeight,
        }),
      });

      const resData = await res.json();
      if (res.ok && resData.success) {
        setToastMessage({
          type: 'success',
          text: resData.message || `তারিখ ${date}-এর মিল সফলভাবে গুগল শিটে যোগ ও সেভ করা হয়েছে!`,
        });
        await fetchCookingData();
        if (onSyncComplete) onSyncComplete();
      } else {
        setToastMessage({
          type: 'error',
          text: resData.error || 'শিটে যোগ করতে সমস্যা হয়েছে।',
        });
      }
    } catch (err: any) {
      setToastMessage({
        type: 'error',
        text: err.message || 'রিকোয়েস্ট ব্যর্থ হয়েছে।',
      });
    } finally {
      setSyncingToSheet(false);
    }
  };

  const handleRemoveFromSheet = async () => {
    if (!confirm(`তারিখ ${date}-এর মিল কি গুগল শিট থেকে মুছে ফেলতে চান?`)) return;
    setSyncingToSheet(true);
    setToastMessage(null);
    try {
      const res = await fetch('/api/manager/cooking-board', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date,
          action: 'REMOVE_FROM_SHEET',
        }),
      });

      const resData = await res.json();
      if (res.ok && resData.success) {
        setToastMessage({
          type: 'success',
          text: resData.message || `তারিখ ${date}-এর মিল গুগল শিট থেকে মুছে ফেলা হয়েছে!`,
        });
        await fetchCookingData();
        if (onSyncComplete) onSyncComplete();
      } else {
        setToastMessage({
          type: 'error',
          text: resData.error || 'শিট থেকে মুছতে সমস্যা হয়েছে।',
        });
      }
    } catch (err: any) {
      setToastMessage({
        type: 'error',
        text: err.message || 'রিকোয়েস্ট ব্যর্থ হয়েছে।',
      });
    } finally {
      setSyncingToSheet(false);
    }
  };

  const handleToggleSessionLock = async (mealType: 'breakfast' | 'lunch' | 'dinner', shouldLock: boolean) => {
    setProcessingLock(true);
    setToastMessage(null);

    try {
      const res = await fetch('/api/manager/cooking-board', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date,
          action: shouldLock ? 'LOCK_SESSION' : 'UNLOCK_SESSION',
          mealType,
          bValue: bWeight,
          lValue: lWeight,
          dValue: dWeight,
          gbValue: showCustomGuestWeights ? guestBWeight : bWeight,
          glValue: showCustomGuestWeights ? guestLWeight : lWeight,
          gdValue: showCustomGuestWeights ? guestDWeight : dWeight,
        }),
      });

      const resData = await res.json();
      if (res.ok && resData.success) {
        setToastMessage({
          type: 'success',
          text: resData.message || 'সফল হয়েছে!',
        });
        await fetchCookingData();
        if (onSyncComplete) onSyncComplete();
      } else {
        setToastMessage({
          type: 'error',
          text: resData.error || 'অ্যাকশন সম্পন্ন করতে সমস্যা হয়েছে।',
        });
      }
      setProcessingLock(false);
    } catch (err: any) {
      setProcessingLock(false);
      setToastMessage({
        type: 'error',
        text: err.message || 'রিকোয়েস্ট ব্যর্থ হয়েছে।',
      });
    }
  };

  const handleToggleMeal = (memberId: string, mealType: 'breakfast' | 'lunch' | 'dinner') => {
    setMembersState((prev) =>
      prev.map((m) => {
        if (m.memberId !== memberId) return m;
        return { ...m, [mealType]: !m[mealType] };
      })
    );
    setDirtyMap((prev) => ({ ...prev, [memberId]: true }));
  };

  const openGuestModal = (m: any) => {
    setGuestModalMember(m);
    setModalGuestB(Number(m.guestBreakfast) || 0);
    setModalGuestL(Number(m.guestLunch) || 0);
    setModalGuestD(Number(m.guestDinner) || 0);
  };

  const handleSaveGuestModal = () => {
    if (!guestModalMember) return;
    const targetId = guestModalMember.memberId;
    const totalG = modalGuestB + modalGuestL + modalGuestD;

    setMembersState((prev) =>
      prev.map((m) => {
        if (m.memberId !== targetId) return m;
        return {
          ...m,
          guestBreakfast: modalGuestB,
          guestLunch: modalGuestL,
          guestDinner: modalGuestD,
          guestCount: totalG,
        };
      })
    );
    setDirtyMap((prev) => ({ ...prev, [targetId]: true }));
    setGuestModalMember(null);
  };

  const calculateMemberMealTotal = (m: any) => {
    const gb = Number(m.guestBreakfast) || 0;
    const gl = Number(m.guestLunch) || 0;
    const gd = Number(m.guestDinner) || 0;
    const hasDetailedGuests = m.guestBreakfast !== undefined || m.guestLunch !== undefined || m.guestDinner !== undefined;

    const effGuestBWeight = showCustomGuestWeights ? guestBWeight : bWeight;
    const effGuestLWeight = showCustomGuestWeights ? guestLWeight : lWeight;
    const effGuestDWeight = showCustomGuestWeights ? guestDWeight : dWeight;

    const guestMealPoints = hasDetailedGuests
      ? (gb * effGuestBWeight + gl * effGuestLWeight + gd * effGuestDWeight)
      : (Number(m.guestCount) || 0) * effGuestLWeight;

    const total =
      (m.breakfast ? bWeight : 0) +
      (m.lunch ? lWeight : 0) +
      (m.dinner ? dWeight : 0) +
      guestMealPoints;

    return Math.round(total * 10) / 10;
  };

  // 1-Click Save for an individual member
  const handleSaveMember = async (memberId: string) => {
    const memberObj = membersState.find((m) => m.memberId === memberId);
    if (!memberObj) return;

    setSavingRowId(memberId);
    setToastMessage(null);

    try {
      const res = await fetch('/api/manager/cooking-board', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date,
          action: 'UPDATE_MEMBER_MEAL',
          memberId,
          breakfast: memberObj.breakfast,
          lunch: memberObj.lunch,
          dinner: memberObj.dinner,
          guestBreakfast: Number(memberObj.guestBreakfast) || 0,
          guestLunch: Number(memberObj.guestLunch) || 0,
          guestDinner: Number(memberObj.guestDinner) || 0,
          guestCount: memberObj.guestCount,
          note: memberObj.note,
          bValue: bWeight,
          lValue: lWeight,
          dValue: dWeight,
          gbValue: showCustomGuestWeights ? guestBWeight : bWeight,
          glValue: showCustomGuestWeights ? guestLWeight : lWeight,
          gdValue: showCustomGuestWeights ? guestDWeight : dWeight,
        }),
      });

      const resData = await res.json();
      if (res.ok && resData.success) {
        setToastMessage({
          type: 'success',
          text: `✅ ${memberObj.name}-এর মিল মান সফলভাবে আপডেট হয়েছে!`,
        });
        setDirtyMap((prev) => {
          const next = { ...prev };
          delete next[memberId];
          return next;
        });
        if (onSyncComplete) onSyncComplete();
      } else {
        setToastMessage({
          type: 'error',
          text: resData.error || 'আপডেট করতে সমস্যা হয়েছে।',
        });
      }
      setSavingRowId(null);
    } catch (err: any) {
      setSavingRowId(null);
      setToastMessage({ type: 'error', text: err.message || 'রিকোয়েস্ট ব্যর্থ হয়েছে।' });
    }
  };

  // Bulk Save all modified rows
  const handleSaveAllDirty = async () => {
    const dirtyIds = Object.keys(dirtyMap);
    if (dirtyIds.length === 0) return;

    setSavingBulk(true);
    setToastMessage(null);

    const updates = membersState
      .filter((m) => dirtyMap[m.memberId])
      .map((m) => ({
        memberId: m.memberId,
        breakfast: m.breakfast,
        lunch: m.lunch,
        dinner: m.dinner,
        guestBreakfast: Number(m.guestBreakfast) || 0,
        guestLunch: Number(m.guestLunch) || 0,
        guestDinner: Number(m.guestDinner) || 0,
        guestCount: m.guestCount,
        note: m.note,
      }));

    try {
      const res = await fetch('/api/manager/cooking-board', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date,
          action: 'UPDATE_BULK_MEALS',
          updates,
          bValue: bWeight,
          lValue: lWeight,
          dValue: dWeight,
          gbValue: showCustomGuestWeights ? guestBWeight : bWeight,
          glValue: showCustomGuestWeights ? guestLWeight : lWeight,
          gdValue: showCustomGuestWeights ? guestDWeight : dWeight,
        }),
      });

      const resData = await res.json();
      if (res.ok && resData.success) {
        setToastMessage({
          type: 'success',
          text: `✅ ${updates.length} জন মেম্বারের মিল মান সফলভাবে সংরক্ষিত হয়েছে!`,
        });
        setDirtyMap({});
        if (onSyncComplete) onSyncComplete();
      } else {
        setToastMessage({
          type: 'error',
          text: resData.error || 'সংরক্ষণ ব্যর্থ হয়েছে।',
        });
      }
      setSavingBulk(false);
    } catch (err: any) {
      setSavingBulk(false);
      setToastMessage({ type: 'error', text: err.message || 'রিকোয়েস্ট ব্যর্থ হয়েছে।' });
    }
  };

  // Apply current B, L, D weights to all members and save
  const handleApplyWeightsToAll = async () => {
    setSavingBulk(true);
    setToastMessage(null);

    const updates = membersState.map((m) => ({
      memberId: m.memberId,
      breakfast: m.breakfast,
      lunch: m.lunch,
      dinner: m.dinner,
      guestBreakfast: Number(m.guestBreakfast) || 0,
      guestLunch: Number(m.guestLunch) || 0,
      guestDinner: Number(m.guestDinner) || 0,
      guestCount: m.guestCount,
      note: m.note,
    }));

    try {
      const res = await fetch('/api/manager/cooking-board', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date,
          action: 'UPDATE_BULK_MEALS',
          updates,
          bValue: bWeight,
          lValue: lWeight,
          dValue: dWeight,
          gbValue: showCustomGuestWeights ? guestBWeight : bWeight,
          glValue: showCustomGuestWeights ? guestLWeight : lWeight,
          gdValue: showCustomGuestWeights ? guestDWeight : dWeight,
        }),
      });

      const resData = await res.json();
      if (res.ok && resData.success) {
        const customMsg = showCustomGuestWeights
          ? `✅ মিলের নতুন মান সংরক্ষিত হয়েছে! (সদস্য: B=${bWeight}, L=${lWeight}, D=${dWeight} | গেস্ট: B=${guestBWeight}, L=${guestLWeight}, D=${guestDWeight})`
          : `✅ সকাল (${bWeight}), দুপুর (${lWeight}), ও রাত (${dWeight})-এর নতুন মান সব মেম্বারদের জন্য সফলভাবে সংরক্ষিত হয়েছে!`;
        setToastMessage({
          type: 'success',
          text: customMsg,
        });
        setDirtyMap({});
        setIsWeightSettingsOpen(false);
        if (onSyncComplete) onSyncComplete();
      } else {
        setToastMessage({
          type: 'error',
          text: resData.error || 'সংরক্ষণ ব্যর্থ হয়েছে।',
        });
      }
      setSavingBulk(false);
    } catch (err: any) {
      setSavingBulk(false);
      setToastMessage({ type: 'error', text: err.message || 'রিকোয়েস্ট ব্যর্থ হয়েছে।' });
    }
  };

  const handleToggleLock = async (action: 'LOCK_AND_SYNC' | 'UNLOCK') => {
    setProcessingLock(true);
    setToastMessage(null);

    try {
      const res = await fetch('/api/manager/cooking-board', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date,
          action,
          bValue: bWeight,
          lValue: lWeight,
          dValue: dWeight,
          gbValue: showCustomGuestWeights ? guestBWeight : bWeight,
          glValue: showCustomGuestWeights ? guestLWeight : lWeight,
          gdValue: showCustomGuestWeights ? guestDWeight : dWeight,
        }),
      });

      const resData = await res.json();
      if (res.ok && resData.success) {
        setToastMessage({
          type: 'success',
          text: resData.message || (action === 'LOCK_AND_SYNC' ? 'সব বেলার মিল সাইটে সফলভাবে লক করা হয়েছে!' : 'সব বেলার মিল আনলক করা হয়েছে।'),
        });
        await fetchCookingData();
        if (onSyncComplete) onSyncComplete();
      } else {
        setToastMessage({
          type: 'error',
          text: resData.error || 'অ্যাকশন সম্পন্ন করতে সমস্যা হয়েছে।',
        });
      }
      setProcessingLock(false);
    } catch (err: any) {
      setProcessingLock(false);
      setToastMessage({
        type: 'error',
        text: err.message || 'রিকোয়েস্ট ব্যর্থ হয়েছে।',
      });
    }
  };

  const isAllLocked = Boolean(data?.isLocked || (breakfastLocked && lunchLocked && dinnerLocked));
  const isPartiallyLocked = (breakfastLocked || lunchLocked || dinnerLocked) && !isAllLocked;

  // Dynamic live summary based on membersState (Regular + Guests combined into each meal session)
  const liveBreakfastRegular = membersState.filter((m) => m.breakfast).length;
  const liveBreakfastGuests = membersState.reduce((sum, m) => sum + (Number(m.guestBreakfast) || 0), 0);
  const liveTotalBreakfast = liveBreakfastRegular + liveBreakfastGuests;

  const liveLunchRegular = membersState.filter((m) => m.lunch).length;
  const liveLunchGuests = membersState.reduce((sum, m) => sum + (Number(m.guestLunch) || 0), 0);
  const liveTotalLunch = liveLunchRegular + liveLunchGuests;

  const liveDinnerRegular = membersState.filter((m) => m.dinner).length;
  const liveDinnerGuests = membersState.reduce((sum, m) => sum + (Number(m.guestDinner) || 0), 0);
  const liveTotalDinner = liveDinnerRegular + liveDinnerGuests;

  const dirtyCount = Object.keys(dirtyMap).length;

  const eatingCount = membersState.filter((m) => m.breakfast || m.lunch || m.dinner || (Number(m.guestCount) || 0) > 0).length;
  const offCount = membersState.length - eatingCount;

  const filteredMembers = membersState.filter((m) => {
    const matchesSearch =
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.roomNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.memberCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.phone.includes(searchQuery);

    if (!matchesSearch) return false;

    const isEatingAny = m.breakfast || m.lunch || m.dinner || (Number(m.guestCount) || 0) > 0;
    if (filterType === 'EATING') return isEatingAny;
    if (filterType === 'OFF') return !isEatingAny;

    return true;
  });

  return (
    <div className="space-y-6">
      {/* 1. Header Banner & Date Selector */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 text-white p-6 sm:p-7 rounded-3xl shadow-xl border border-slate-700/60 relative overflow-hidden">
        {/* Subtle decorative glow */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold border border-emerald-500/30">
              <Utensils className="w-3.5 h-3.5" />
              <span>কুকিং বোর্ড ও কিচেন কন্ট্রোল</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              কোন বেলায় কত মিল রান্না হবে?
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 max-w-xl">
              তারিখ নির্বাচন করে সকাল, দুপুর ও রাতের সঠিক মিল হিসাব দেখুন (রেগুলার ও মেহমান একসাথে), এবং রান্নার পূর্বে সেশন লক করুন।
            </p>
          </div>

          {/* Quick Date Switcher & Refresh */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            <div className="flex items-center space-x-1.5 bg-slate-800/90 p-1.5 rounded-2xl border border-slate-700 backdrop-blur shadow-inner">
              <button
                type="button"
                onClick={() => setDate(today)}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                  date === today
                    ? 'bg-emerald-500 text-slate-950 shadow-md font-extrabold'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
                }`}
              >
                আজ
              </button>
              <button
                type="button"
                onClick={() => setDate(tomorrow)}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                  date === tomorrow
                    ? 'bg-emerald-500 text-slate-950 shadow-md font-extrabold'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
                }`}
              >
                আগামীকাল
              </button>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="bg-slate-900 text-white text-xs px-3 py-2 rounded-xl border border-slate-700 focus:outline-none focus:border-emerald-400 cursor-pointer font-medium"
              />
            </div>

            <button
              onClick={fetchCookingData}
              title="রিফ্রেশ করুন"
              className="p-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-2xl border border-slate-700 transition-colors flex items-center justify-center shadow-sm"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Toast Feedback */}
      {toastMessage && (
        <div
          className={`p-4 rounded-2xl text-xs font-bold flex items-center space-x-2.5 shadow-sm animate-in fade-in slide-in-from-top-2 duration-150 ${
            toastMessage.type === 'success'
              ? 'bg-emerald-50 border border-emerald-300 text-emerald-900'
              : 'bg-red-50 border border-red-300 text-red-900'
          }`}
        >
          {toastMessage.type === 'success' ? (
            <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
          )}
          <span className="flex-1">{toastMessage.text}</span>
          <button
            onClick={() => setToastMessage(null)}
            className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 2. Unified Master Lock & Google Sheet Sync Command Bar */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Master Lock Bar */}
        <div className={`p-4 sm:p-5 rounded-3xl border shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 transition-all ${
          isAllLocked
            ? 'bg-gradient-to-r from-amber-50 to-orange-50 border-amber-300'
            : isPartiallyLocked
            ? 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-300'
            : 'bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-300'
        }`}>
          <div className="flex items-center space-x-3">
            <div className={`p-2.5 rounded-2xl border flex-shrink-0 ${
              isAllLocked
                ? 'bg-amber-100 text-amber-800 border-amber-300'
                : isPartiallyLocked
                ? 'bg-blue-100 text-blue-800 border-blue-300'
                : 'bg-emerald-100 text-emerald-800 border-emerald-300'
            }`}>
              {isAllLocked ? <Lock className="w-5 h-5" /> : <Unlock className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h4 className="font-bold text-slate-900 text-sm">মিল লক স্থিতি ({date})</h4>
                <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border ${
                  isAllLocked
                    ? 'bg-amber-200 text-amber-900 border-amber-300'
                    : isPartiallyLocked
                    ? 'bg-blue-200 text-blue-900 border-blue-300'
                    : 'bg-emerald-200 text-emerald-900 border-emerald-300'
                }`}>
                  {isAllLocked ? '🔒 সব বেলা লকড' : isPartiallyLocked ? '⚠️ আংশিক লকড' : '🟢 সব উন্মুক্ত'}
                </span>
              </div>
              <p className="text-[11px] text-slate-600 mt-0.5">
                {isAllLocked
                  ? 'সব বেলার মিল সাইটে লক করা আছে।'
                  : isPartiallyLocked
                  ? 'কিছু বেলা লকড, কিছু বেলা উন্মুক্ত রয়েছে।'
                  : 'সকল মেম্বারদের মিল উন্মুক্ত রয়েছে।'}
              </p>
            </div>
          </div>

          {/* Master Lock/Unlock Action Button */}
          <div className="flex-shrink-0 self-end sm:self-auto">
            {isAllLocked ? (
              <button
                type="button"
                onClick={() => handleToggleLock('UNLOCK')}
                disabled={processingLock}
                className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-800 font-bold text-xs rounded-xl border border-slate-300 shadow-sm transition-all flex items-center space-x-1.5"
              >
                <Unlock className="w-3.5 h-3.5 text-slate-600" />
                <span>{processingLock ? 'আনলক হচ্ছে...' : 'সব আনলক করুন'}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleToggleLock('LOCK_AND_SYNC')}
                disabled={processingLock}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center space-x-1.5"
              >
                <Lock className="w-3.5 h-3.5 text-emerald-400" />
                <span>{processingLock ? 'লক হচ্ছে...' : '🔒 সব বেলা লক করুন'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Google Sheet Sync Bar */}
        <div className={`p-4 sm:p-5 rounded-3xl border shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 transition-all ${
          isAddedToSheet
            ? 'bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-300'
            : 'bg-gradient-to-r from-slate-50 to-blue-50 border-slate-200'
        }`}>
          <div className="flex items-center space-x-3">
            <div className={`p-2.5 rounded-2xl border flex-shrink-0 ${
              isAddedToSheet ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-slate-100 text-slate-700 border-slate-300'
            }`}>
              <FileSpreadsheet className="w-5 h-5 text-emerald-700" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h4 className="font-bold text-slate-900 text-sm">গুগল শিট মিল হিসাব</h4>
                <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border ${
                  isAddedToSheet
                    ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                    : 'bg-amber-100 text-amber-900 border-amber-300'
                }`}>
                  {isAddedToSheet ? `✅ শিটে যুক্ত (${sheetMealCount} মিল)` : '⏳ শিটে পাঠানো হয়নি'}
                </span>
              </div>
              <p className="text-[11px] text-slate-600 mt-0.5">
                {isAddedToSheet ? 'গুগল শিট ও মাসিক প্রতিবেদনে মিল সংরক্ষিত আছে।' : 'চূড়ান্ত হিসাব গুগল শিটে পাঠাতে বাটনে চাপুন।'}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 flex-shrink-0 self-end sm:self-auto">
            <button
              type="button"
              onClick={handleAddToSheet}
              disabled={syncingToSheet}
              className={`px-4 py-2 rounded-xl font-bold text-xs shadow transition-all flex items-center space-x-1.5 ${
                isAddedToSheet
                  ? 'bg-emerald-700 hover:bg-emerald-600 text-white'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>{syncingToSheet ? 'প্রসেসিং...' : isAddedToSheet ? '🔄 শিট আপডেট' : '➕ শিটে যোগ করুন'}</span>
            </button>

            {isAddedToSheet && (
              <button
                type="button"
                onClick={handleRemoveFromSheet}
                disabled={syncingToSheet}
                className="px-3 py-2 rounded-xl font-bold text-xs bg-white hover:bg-red-50 text-red-700 border border-red-300 shadow-sm transition-all"
                title="গুগল শিট থেকে মুছুন"
              >
                মুছুন
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 3. The 3 Clean Meal KPI Cards (3 Sessions: Breakfast, Lunch, Dinner - Guests Counted Together) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Breakfast Card */}
        <div className={`p-5 rounded-3xl border shadow-sm transition-all flex flex-col justify-between space-y-4 ${
          breakfastLocked
            ? 'bg-gradient-to-b from-amber-50/70 to-white border-amber-300'
            : 'bg-white border-slate-200 hover:border-amber-300'
        }`}>
          <div>
            <div className="flex items-center justify-between text-slate-500 mb-1.5">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-800 flex items-center space-x-1.5">
                <span>🍳 সকালের নাস্তা</span>
              </span>
              <div className="flex items-center space-x-1.5">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-200">
                  {bWeight} pt
                </span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  breakfastLocked ? 'bg-amber-200 text-amber-900' : 'bg-emerald-100 text-emerald-800'
                }`}>
                  {breakfastLocked ? '🔒 লকড' : '🟢 উন্মুক্ত'}
                </span>
              </div>
            </div>

            <div className="mt-2">
              <span className="text-3xl sm:text-4xl font-extrabold text-amber-600 tracking-tight">
                {loading ? '...' : liveTotalBreakfast}
              </span>
              <span className="text-sm font-bold text-slate-500 ml-1.5">মিল</span>
            </div>

            <p className="text-xs text-slate-500 mt-1">
              রেগুলার: <span className="font-bold text-slate-700">{liveBreakfastRegular}</span>
              {liveBreakfastGuests > 0 ? (
                <> + গেস্ট: <span className="font-bold text-purple-700">{liveBreakfastGuests}</span></>
              ) : (
                ' (গেস্ট ০)'
              )}
            </p>
          </div>

          {/* Embedded Lock Button */}
          <button
            type="button"
            disabled={processingLock}
            onClick={() => handleToggleSessionLock('breakfast', !breakfastLocked)}
            className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1.5 ${
              breakfastLocked
                ? 'bg-white hover:bg-amber-100 text-amber-900 border border-amber-300 shadow-sm'
                : 'bg-amber-600 hover:bg-amber-500 text-white shadow-sm'
            }`}
          >
            {breakfastLocked ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
            <span>{breakfastLocked ? 'নাস্তা আনলক করুন' : 'সকালের নাস্তা লক করুন'}</span>
          </button>
        </div>

        {/* Lunch Card */}
        <div className={`p-5 rounded-3xl border shadow-sm transition-all flex flex-col justify-between space-y-4 ${
          lunchLocked
            ? 'bg-gradient-to-b from-blue-50/70 to-white border-blue-300'
            : 'bg-white border-slate-200 hover:border-blue-300'
        }`}>
          <div>
            <div className="flex items-center justify-between text-slate-500 mb-1.5">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-800 flex items-center space-x-1.5">
                <span>🍛 দুপুরের খাবার</span>
              </span>
              <div className="flex items-center space-x-1.5">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-900 border border-blue-200">
                  {lWeight} pt
                </span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  lunchLocked ? 'bg-blue-200 text-blue-900' : 'bg-emerald-100 text-emerald-800'
                }`}>
                  {lunchLocked ? '🔒 লকড' : '🟢 উন্মুক্ত'}
                </span>
              </div>
            </div>

            <div className="mt-2">
              <span className="text-3xl sm:text-4xl font-extrabold text-blue-600 tracking-tight">
                {loading ? '...' : liveTotalLunch}
              </span>
              <span className="text-sm font-bold text-slate-500 ml-1.5">মিল</span>
            </div>

            <p className="text-xs text-slate-500 mt-1">
              রেগুলার: <span className="font-bold text-slate-700">{liveLunchRegular}</span>
              {liveLunchGuests > 0 ? (
                <> + গেস্ট: <span className="font-bold text-purple-700">{liveLunchGuests}</span></>
              ) : (
                ' (গেস্ট ০)'
              )}
            </p>
          </div>

          {/* Embedded Lock Button */}
          <button
            type="button"
            disabled={processingLock}
            onClick={() => handleToggleSessionLock('lunch', !lunchLocked)}
            className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1.5 ${
              lunchLocked
                ? 'bg-white hover:bg-blue-100 text-blue-900 border border-blue-300 shadow-sm'
                : 'bg-blue-600 hover:bg-blue-500 text-white shadow-sm'
            }`}
          >
            {lunchLocked ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
            <span>{lunchLocked ? 'দুপুর আনলক করুন' : 'দুপুরের খাবার লক করুন'}</span>
          </button>
        </div>

        {/* Dinner Card */}
        <div className={`p-5 rounded-3xl border shadow-sm transition-all flex flex-col justify-between space-y-4 ${
          dinnerLocked
            ? 'bg-gradient-to-b from-purple-50/70 to-white border-purple-300'
            : 'bg-white border-slate-200 hover:border-purple-300'
        }`}>
          <div>
            <div className="flex items-center justify-between text-slate-500 mb-1.5">
              <span className="text-xs font-bold uppercase tracking-wider text-purple-800 flex items-center space-x-1.5">
                <span>🍲 রাতের খাবার</span>
              </span>
              <div className="flex items-center space-x-1.5">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-900 border border-purple-200">
                  {dWeight} pt
                </span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  dinnerLocked ? 'bg-purple-200 text-purple-900' : 'bg-emerald-100 text-emerald-800'
                }`}>
                  {dinnerLocked ? '🔒 লকড' : '🟢 উন্মুক্ত'}
                </span>
              </div>
            </div>

            <div className="mt-2">
              <span className="text-3xl sm:text-4xl font-extrabold text-purple-600 tracking-tight">
                {loading ? '...' : liveTotalDinner}
              </span>
              <span className="text-sm font-bold text-slate-500 ml-1.5">মিল</span>
            </div>

            <p className="text-xs text-slate-500 mt-1">
              রেগুলার: <span className="font-bold text-slate-700">{liveDinnerRegular}</span>
              {liveDinnerGuests > 0 ? (
                <> + গেস্ট: <span className="font-bold text-purple-700">{liveDinnerGuests}</span></>
              ) : (
                ' (গেস্ট ০)'
              )}
            </p>
          </div>

          {/* Embedded Lock Button */}
          <button
            type="button"
            disabled={processingLock}
            onClick={() => handleToggleSessionLock('dinner', !dinnerLocked)}
            className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1.5 ${
              dinnerLocked
                ? 'bg-white hover:bg-purple-100 text-purple-900 border border-purple-300 shadow-sm'
                : 'bg-purple-600 hover:bg-purple-500 text-white shadow-sm'
            }`}
          >
            {dinnerLocked ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
            <span>{dinnerLocked ? 'রাত আনলক করুন' : 'রাতের খাবার লক করুন'}</span>
          </button>
        </div>
      </div>

      {/* 4. Meal Point Weights Drawer (Clean & Collapsible) */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden transition-all">
        <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/60">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-indigo-50 text-indigo-700 rounded-2xl border border-indigo-200">
              <Settings2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h4 className="font-bold text-slate-900 text-sm">মিলের পয়েন্ট সেটিংস (Meal Point Values)</h4>
                <span className="text-[10px] font-semibold text-slate-500">
                  সকাল: <b className="text-amber-800">{bWeight} pt</b> | দুপুর: <b className="text-blue-800">{lWeight} pt</b> | রাত: <b className="text-purple-800">{dWeight} pt</b>
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                সকাল, দুপুর বা রাতের মিলের হিসাব পয়েন্ট (ওজন) পরিবর্তন করতে পারেন।
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsWeightSettingsOpen(!isWeightSettingsOpen)}
            className="px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-800 font-bold text-xs rounded-xl border border-slate-300 shadow-sm transition-all flex items-center justify-center space-x-1.5 self-start sm:self-auto"
          >
            <Sliders className="w-3.5 h-3.5 text-indigo-600" />
            <span>{isWeightSettingsOpen ? 'পয়েন্ট বক্স লুকান' : 'পয়েন্ট পরিবর্তন করুন'}</span>
            {isWeightSettingsOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* Collapsible Weights Form */}
        {isWeightSettingsOpen && (
          <div className="p-5 border-t border-slate-200 bg-white space-y-4 animate-in fade-in duration-150">
            <div>
              <h5 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-3 flex items-center space-x-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>প্রতি বেলার মিল পয়েন্ট নির্ধারণ করুন:</span>
              </h5>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* B */}
                <div className="p-3 bg-amber-50/60 rounded-2xl border border-amber-200 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-amber-900 block">🍳 সকালের নাস্তা (B)</span>
                    <span className="text-[10px] text-slate-500">ডিফল্ট: ০.৫ pt</span>
                  </div>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={bWeight}
                    onChange={(e) => {
                      const val = Math.max(0, parseFloat(e.target.value) || 0);
                      setBWeight(val);
                      if (!showCustomGuestWeights) setGuestBWeight(val);
                    }}
                    className="w-16 text-center py-1 bg-white border border-amber-300 rounded-xl font-black text-amber-900 text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none shadow-inner"
                  />
                </div>

                {/* L */}
                <div className="p-3 bg-blue-50/60 rounded-2xl border border-blue-200 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-blue-900 block">🍛 দুপুরের খাবার (L)</span>
                    <span className="text-[10px] text-slate-500">ডিফল্ট: ১.০ pt</span>
                  </div>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={lWeight}
                    onChange={(e) => {
                      const val = Math.max(0, parseFloat(e.target.value) || 0);
                      setLWeight(val);
                      if (!showCustomGuestWeights) setGuestLWeight(val);
                    }}
                    className="w-16 text-center py-1 bg-white border border-blue-300 rounded-xl font-black text-blue-900 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none shadow-inner"
                  />
                </div>

                {/* D */}
                <div className="p-3 bg-purple-50/60 rounded-2xl border border-purple-200 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-purple-900 block">🍲 রাতের খাবার (D)</span>
                    <span className="text-[10px] text-slate-500">ডিফল্ট: ১.০ pt</span>
                  </div>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={dWeight}
                    onChange={(e) => {
                      const val = Math.max(0, parseFloat(e.target.value) || 0);
                      setDWeight(val);
                      if (!showCustomGuestWeights) setGuestDWeight(val);
                    }}
                    className="w-16 text-center py-1 bg-white border border-purple-300 rounded-xl font-black text-purple-900 text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none shadow-inner"
                  />
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={handleApplyWeightsToAll}
                disabled={savingBulk}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center space-x-1.5"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{savingBulk ? 'সংরক্ষণ হচ্ছে...' : 'নতুন পয়েন্ট সেভ করুন'}</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 5. Member Meal Table Section */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden space-y-0">
        {/* Table Toolbar */}
        <div className="p-4 sm:p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/50">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <h3 className="font-extrabold text-slate-900 text-base">
                মেম্বারদের বিস্তারিত মিল তালিকা
              </h3>
              <span className="text-xs font-extrabold px-2.5 py-0.5 rounded-full bg-slate-200 text-slate-700">
                {filteredMembers.length} জন
              </span>
            </div>
            <p className="text-xs text-slate-500">
              যেকোনো বেলার মিল এক ক্লিকে অন/অফ করুন বা মেহমান যোগ করুন এবং পরিবর্তন শেষে সেভ করুন।
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Filter Tabs */}
            <div className="flex items-center space-x-1 bg-slate-200/70 p-1 rounded-2xl">
              <button
                type="button"
                onClick={() => setFilterType('ALL')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  filterType === 'ALL' ? 'bg-white text-slate-900 shadow-sm font-extrabold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                সবাই ({membersState.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterType('EATING')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  filterType === 'EATING' ? 'bg-white text-emerald-700 shadow-sm font-extrabold' : 'text-slate-600 hover:text-emerald-700'
                }`}
              >
                মিল খাবে ({eatingCount})
              </button>
              <button
                type="button"
                onClick={() => setFilterType('OFF')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  filterType === 'OFF' ? 'bg-white text-red-700 shadow-sm font-extrabold' : 'text-slate-600 hover:text-red-700'
                }`}
              >
                মিল অফ ({offCount})
              </button>
            </div>

            {/* Search Box */}
            <div className="relative w-full sm:w-56">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="নাম, রুম বা কোড..."
                className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-500 shadow-sm"
              />
            </div>

            {/* Save All Button (when dirty) */}
            {dirtyCount > 0 && (
              <button
                type="button"
                onClick={handleSaveAllDirty}
                disabled={savingBulk}
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow transition-all flex items-center space-x-1.5 animate-pulse"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{savingBulk ? 'সেভ হচ্ছে...' : `সব সেভ (${dirtyCount})`}</span>
              </button>
            )}
          </div>
        </div>

        {/* Member Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">রুম নং</th>
                <th className="py-3 px-4">সদস্যের নাম ও বিবরণ</th>
                <th className="py-3 px-3 text-center">
                  <div className="flex flex-col items-center">
                    <span className="font-extrabold text-slate-800 text-xs">🍳 সকাল</span>
                    <span className="text-[10px] text-amber-700 font-semibold">{bWeight} pt</span>
                  </div>
                </th>
                <th className="py-3 px-3 text-center">
                  <div className="flex flex-col items-center">
                    <span className="font-extrabold text-slate-800 text-xs">🍛 দুপুর</span>
                    <span className="text-[10px] text-blue-700 font-semibold">{lWeight} pt</span>
                  </div>
                </th>
                <th className="py-3 px-3 text-center">
                  <div className="flex flex-col items-center">
                    <span className="font-extrabold text-slate-800 text-xs">🍲 রাত</span>
                    <span className="text-[10px] text-purple-700 font-semibold">{dWeight} pt</span>
                  </div>
                </th>
                <th className="py-3 px-3 text-center">👥 মেহমান</th>
                <th className="py-3 px-3 text-center">📊 মোট মিল</th>
                <th className="py-3 px-4">বার্তা / নোট</th>
                <th className="py-3 px-4 text-center">অ্যাকশন</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <RefreshCw className="w-6 h-6 animate-spin text-emerald-600" />
                      <span className="text-xs font-bold">রান্নার ডেটা লোড হচ্ছে...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredMembers.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-10 text-center text-slate-500">
                    <div className="max-w-xs mx-auto space-y-1">
                      <p className="font-bold text-slate-700">কোনো মেম্বার পাওয়া যায়নি।</p>
                      <p className="text-xs text-slate-400">ফিল্টার বা সার্চ কিওয়ার্ড পরিবর্তন করে দেখুন।</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredMembers.map((m) => {
                  const isOffAll = !m.breakfast && !m.lunch && !m.dinner && (Number(m.guestCount) || 0) === 0;
                  const isDirty = Boolean(dirtyMap[m.memberId]);
                  const rowMealTotal = calculateMemberMealTotal(m);
                  const totalGuests = (Number(m.guestBreakfast) || 0) + (Number(m.guestLunch) || 0) + (Number(m.guestDinner) || 0) || (Number(m.guestCount) || 0);

                  return (
                    <tr
                      key={m.memberId}
                      className={`hover:bg-slate-50 transition-colors ${
                        isDirty
                          ? 'bg-amber-50/50'
                          : isOffAll
                          ? 'bg-red-50/20 text-slate-400'
                          : ''
                      }`}
                    >
                      {/* Room */}
                      <td className="py-3.5 px-4">
                        <span className="inline-block px-2.5 py-1 rounded-xl bg-slate-100 border border-slate-200 text-slate-800 font-bold text-xs shadow-xs">
                          {m.roomNo ? `রুম ${m.roomNo}` : 'রুম -'}
                        </span>
                      </td>

                      {/* Name & Phone */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 text-sm flex items-center space-x-1.5">
                          <span>{m.name}</span>
                          {isOffAll && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-red-100 text-red-700 font-bold">
                              মিল অফ
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center space-x-1.5 mt-0.5">
                          <span className="font-medium">{m.memberCode}</span>
                          <span>•</span>
                          <span>{m.phone}</span>
                        </div>
                      </td>

                      {/* Breakfast Toggle */}
                      <td className="py-3.5 px-3 text-center">
                        <div className="flex flex-col items-center justify-center space-y-1">
                          <button
                            type="button"
                            onClick={() => handleToggleMeal(m.memberId, 'breakfast')}
                            className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all shadow-xs flex items-center justify-center space-x-1 min-w-[72px] mx-auto ${
                              m.breakfast
                                ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-amber-500/20'
                                : 'bg-slate-100 text-slate-400 hover:bg-slate-200 border border-slate-200'
                            }`}
                            title="সকালের মিল অন/অফ করতে ক্লিক করুন"
                          >
                            <span>{m.breakfast ? '✓' : '✕'}</span>
                            <span>{m.breakfast ? `${bWeight}` : 'অফ'}</span>
                          </button>
                          {Number(m.guestBreakfast) > 0 && (
                            <button
                              type="button"
                              onClick={() => openGuestModal(m)}
                              className="text-[10px] font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 px-1.5 py-0.5 rounded-md border border-amber-200 transition-colors"
                              title={`সকালে ${m.guestBreakfast} গেস্ট`}
                            >
                              +{m.guestBreakfast} গেস্ট
                            </button>
                          )}
                        </div>
                      </td>

                      {/* Lunch Toggle */}
                      <td className="py-3.5 px-3 text-center">
                        <div className="flex flex-col items-center justify-center space-y-1">
                          <button
                            type="button"
                            onClick={() => handleToggleMeal(m.memberId, 'lunch')}
                            className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all shadow-xs flex items-center justify-center space-x-1 min-w-[72px] mx-auto ${
                              m.lunch
                                ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/20'
                                : 'bg-slate-100 text-slate-400 hover:bg-slate-200 border border-slate-200'
                            }`}
                            title="দুপুরের মিল অন/অফ করতে ক্লিক করুন"
                          >
                            <span>{m.lunch ? '✓' : '✕'}</span>
                            <span>{m.lunch ? `${lWeight}` : 'অফ'}</span>
                          </button>
                          {Number(m.guestLunch) > 0 && (
                            <button
                              type="button"
                              onClick={() => openGuestModal(m)}
                              className="text-[10px] font-bold text-blue-800 bg-blue-50 hover:bg-blue-100 px-1.5 py-0.5 rounded-md border border-blue-200 transition-colors"
                              title={`দুপুরে ${m.guestLunch} গেস্ট`}
                            >
                              +{m.guestLunch} গেস্ট
                            </button>
                          )}
                        </div>
                      </td>

                      {/* Dinner Toggle */}
                      <td className="py-3.5 px-3 text-center">
                        <div className="flex flex-col items-center justify-center space-y-1">
                          <button
                            type="button"
                            onClick={() => handleToggleMeal(m.memberId, 'dinner')}
                            className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all shadow-xs flex items-center justify-center space-x-1 min-w-[72px] mx-auto ${
                              m.dinner
                                ? 'bg-purple-600 hover:bg-purple-700 text-white shadow-purple-500/20'
                                : 'bg-slate-100 text-slate-400 hover:bg-slate-200 border border-slate-200'
                            }`}
                            title="রাতের মিল অন/অফ করতে ক্লিক করুন"
                          >
                            <span>{m.dinner ? '✓' : '✕'}</span>
                            <span>{m.dinner ? `${dWeight}` : 'অফ'}</span>
                          </button>
                          {Number(m.guestDinner) > 0 && (
                            <button
                              type="button"
                              onClick={() => openGuestModal(m)}
                              className="text-[10px] font-bold text-purple-800 bg-purple-50 hover:bg-purple-100 px-1.5 py-0.5 rounded-md border border-purple-200 transition-colors"
                              title={`রাতে ${m.guestDinner} গেস্ট`}
                            >
                              +{m.guestDinner} গেস্ট
                            </button>
                          )}
                        </div>
                      </td>

                      {/* Guest Button / Trigger */}
                      <td className="py-3.5 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => openGuestModal(m)}
                          className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all border flex items-center justify-center space-x-1 mx-auto ${
                            totalGuests > 0
                              ? 'bg-purple-50 hover:bg-purple-100 text-purple-800 border-purple-200 shadow-xs'
                              : 'bg-white hover:bg-slate-100 text-slate-600 border-slate-200'
                          }`}
                          title="মেহমান মিল যোগ বা পরিবর্তন করুন"
                        >
                          <Users className="w-3 h-3 text-purple-600" />
                          <span>{totalGuests > 0 ? `${totalGuests} মেহমান` : '+ গেস্ট'}</span>
                        </button>
                      </td>

                      {/* Total Points */}
                      <td className="py-3.5 px-3 text-center">
                        <span className={`inline-block px-2.5 py-1 rounded-xl border font-black text-xs ${
                          rowMealTotal > 0
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200 shadow-xs'
                            : 'bg-slate-100 text-slate-400 border-slate-200'
                        }`}>
                          {rowMealTotal} pt
                        </span>
                      </td>

                      {/* Member Note */}
                      <td className="py-3.5 px-4 text-slate-600 max-w-xs truncate">
                        {m.note ? (
                          <span className="italic text-slate-800 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-100 block truncate" title={m.note}>
                            "{m.note}"
                          </span>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>

                      {/* Row Action */}
                      <td className="py-3.5 px-4 text-center">
                        {isDirty ? (
                          <button
                            type="button"
                            disabled={savingRowId === m.memberId}
                            onClick={() => handleSaveMember(m.memberId)}
                            className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center space-x-1 mx-auto"
                          >
                            <Save className="w-3 h-3" />
                            <span>{savingRowId === m.memberId ? '...' : 'সেভ'}</span>
                          </button>
                        ) : (
                          <span className="text-[11px] text-emerald-600 font-bold flex items-center justify-center space-x-0.5">
                            <Check className="w-3 h-3" />
                            <span>সেভড</span>
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 6. Sticky Floating Unsaved Changes Notification */}
      {dirtyCount > 0 && (
        <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-40 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-2xl border border-slate-700 flex items-center space-x-4 animate-in slide-in-from-bottom-3 duration-200">
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping"></span>
            <span className="text-xs font-bold text-slate-200">
              ⚠️ {dirtyCount} জন মেম্বারের মিল পরিবর্তন করা হয়েছে (সংরক্ষণ বাকি)।
            </span>
          </div>
          <button
            type="button"
            onClick={handleSaveAllDirty}
            disabled={savingBulk}
            className="px-4 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-extrabold rounded-xl shadow transition-all flex items-center space-x-1.5"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{savingBulk ? 'সেভ হচ্ছে...' : 'সব সেভ করুন (Save All)'}</span>
          </button>
        </div>
      )}

      {/* 7. Guest Breakdown Modal */}
      {guestModalMember && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-extrabold text-slate-900 text-base">বেলা অনুযায়ী মেহমান মিল</h3>
                <p className="text-xs text-slate-500 font-medium">
                  {guestModalMember.name} ({guestModalMember.roomNo ? `রুম ${guestModalMember.roomNo}` : guestModalMember.memberCode})
                </p>
              </div>
              <span className="p-2.5 bg-purple-100 text-purple-700 rounded-2xl">
                <Users className="w-5 h-5" />
              </span>
            </div>

            <div className="space-y-3.5">
              {/* Breakfast Guest */}
              <div className="flex items-center justify-between p-3.5 bg-amber-50/60 rounded-2xl border border-amber-200">
                <div className="flex items-center space-x-2.5">
                  <span className="text-xl">🍳</span>
                  <div>
                    <h5 className="font-bold text-xs text-slate-800">সকালের নাস্তায় মেহমান</h5>
                    <span className="text-[10px] text-slate-500">
                      {bWeight} pt/জন {modalGuestB > 0 ? `→ ${(modalGuestB * bWeight).toFixed(1)} pt` : ''}
                    </span>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    disabled={modalGuestB <= 0}
                    onClick={() => setModalGuestB(Math.max(0, modalGuestB - 1))}
                    className="w-7 h-7 flex items-center justify-center rounded-xl bg-white border border-slate-300 hover:bg-slate-100 disabled:opacity-40 font-bold transition-colors"
                  >
                    <Minus className="w-3.5 h-3.5 text-slate-700" />
                  </button>
                  <span className="w-6 text-center font-black text-sm text-slate-900">{modalGuestB}</span>
                  <button
                    type="button"
                    disabled={modalGuestB >= 20}
                    onClick={() => setModalGuestB(modalGuestB + 1)}
                    className="w-7 h-7 flex items-center justify-center rounded-xl bg-white border border-slate-300 hover:bg-slate-100 disabled:opacity-40 font-bold transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5 text-slate-700" />
                  </button>
                </div>
              </div>

              {/* Lunch Guest */}
              <div className="flex items-center justify-between p-3.5 bg-blue-50/60 rounded-2xl border border-blue-200">
                <div className="flex items-center space-x-2.5">
                  <span className="text-xl">🍛</span>
                  <div>
                    <h5 className="font-bold text-xs text-slate-800">দুপুরের খাবারে মেহমান</h5>
                    <span className="text-[10px] text-slate-500">
                      {lWeight} pt/জন {modalGuestL > 0 ? `→ ${(modalGuestL * lWeight).toFixed(1)} pt` : ''}
                    </span>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    disabled={modalGuestL <= 0}
                    onClick={() => setModalGuestL(Math.max(0, modalGuestL - 1))}
                    className="w-7 h-7 flex items-center justify-center rounded-xl bg-white border border-slate-300 hover:bg-slate-100 disabled:opacity-40 font-bold transition-colors"
                  >
                    <Minus className="w-3.5 h-3.5 text-slate-700" />
                  </button>
                  <span className="w-6 text-center font-black text-sm text-slate-900">{modalGuestL}</span>
                  <button
                    type="button"
                    disabled={modalGuestL >= 20}
                    onClick={() => setModalGuestL(modalGuestL + 1)}
                    className="w-7 h-7 flex items-center justify-center rounded-xl bg-white border border-slate-300 hover:bg-slate-100 disabled:opacity-40 font-bold transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5 text-slate-700" />
                  </button>
                </div>
              </div>

              {/* Dinner Guest */}
              <div className="flex items-center justify-between p-3.5 bg-purple-50/60 rounded-2xl border border-purple-200">
                <div className="flex items-center space-x-2.5">
                  <span className="text-xl">🍲</span>
                  <div>
                    <h5 className="font-bold text-xs text-slate-800">রাতের খাবারে মেহমান</h5>
                    <span className="text-[10px] text-slate-500">
                      {dWeight} pt/জন {modalGuestD > 0 ? `→ ${(modalGuestD * dWeight).toFixed(1)} pt` : ''}
                    </span>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    disabled={modalGuestD <= 0}
                    onClick={() => setModalGuestD(Math.max(0, modalGuestD - 1))}
                    className="w-7 h-7 flex items-center justify-center rounded-xl bg-white border border-slate-300 hover:bg-slate-100 disabled:opacity-40 font-bold transition-colors"
                  >
                    <Minus className="w-3.5 h-3.5 text-slate-700" />
                  </button>
                  <span className="w-6 text-center font-black text-sm text-slate-900">{modalGuestD}</span>
                  <button
                    type="button"
                    disabled={modalGuestD >= 20}
                    onClick={() => setModalGuestD(modalGuestD + 1)}
                    className="w-7 h-7 flex items-center justify-center rounded-xl bg-white border border-slate-300 hover:bg-slate-100 disabled:opacity-40 font-bold transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5 text-slate-700" />
                  </button>
                </div>
              </div>
            </div>

            {/* Total Guest Summary */}
            <div className="p-3.5 bg-purple-50/70 rounded-2xl border border-purple-200 flex items-center justify-between text-xs font-bold text-slate-800">
              <div>
                <span>মোট মেহমান: </span>
                <span className="text-purple-700 text-sm font-black">{modalGuestB + modalGuestL + modalGuestD} জন</span>
              </div>
              <div>
                <span className="text-slate-500">পয়েন্ট: </span>
                <span className="text-emerald-700 text-sm font-black">
                  {(
                    modalGuestB * bWeight +
                    modalGuestL * lWeight +
                    modalGuestD * dWeight
                  ).toFixed(1)} pt
                </span>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setGuestModalMember(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors"
              >
                বাতিল
              </button>
              <button
                type="button"
                onClick={handleSaveGuestModal}
                className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow-md transition-colors"
              >
                প্রয়োগ করুন (Apply)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
