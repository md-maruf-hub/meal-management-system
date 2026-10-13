'use client';

import React, { useState, useEffect } from 'react';
import {
  Utensils,
  Lock,
  Unlock,
  CheckCircle,
  AlertCircle,
  Calendar,
  Users,
  Search,
  RefreshCw,
  Phone,
  MessageSquare,
  Clock,
  Save,
  Sliders,
  Plus,
  Minus,
  FileSpreadsheet,
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

  // Google Sheets Sync State (Add to Sheet on demand)
  const [isAddedToSheet, setIsAddedToSheet] = useState<boolean>(false);
  const [sheetMealCount, setSheetMealCount] = useState<number>(0);
  const [syncingToSheet, setSyncingToSheet] = useState<boolean>(false);

  // Configurable Meal Values/Weights
  const [bWeight, setBWeight] = useState<number>(0.5);
  const [lWeight, setLWeight] = useState<number>(1.0);
  const [dWeight, setDWeight] = useState<number>(1.0);

  // Configurable Guest Meal Values/Weights (Optional / On-Demand)
  const [guestBWeight, setGuestBWeight] = useState<number>(0.5);
  const [guestLWeight, setGuestLWeight] = useState<number>(1.0);
  const [guestDWeight, setGuestDWeight] = useState<number>(1.0);
  const [showCustomGuestWeights, setShowCustomGuestWeights] = useState<boolean>(false);

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

  const handleGuestCountChange = (memberId: string, delta: number) => {
    setMembersState((prev) =>
      prev.map((m) => {
        if (m.memberId !== memberId) return m;
        const newCount = Math.max(0, (m.guestCount || 0) + delta);
        // Distribute to lunch if no breakdown exists
        return {
          ...m,
          guestCount: newCount,
          guestLunch: newCount,
        };
      })
    );
    setDirtyMap((prev) => ({ ...prev, [memberId]: true }));
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

  // Apply current B, L, D weights to all members and save to Daily Matrix
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
          text: resData.message || (action === 'LOCK_AND_SYNC' ? 'মিল সাইটে সফলভাবে লক করা হয়েছে। শিটে পাঠাতে "শিটে যোগ করুন" চাপুন।' : 'মিল আনলক করা হয়েছে।'),
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
  const isLocked = isAllLocked;

  // Dynamic live summary based on membersState
  const liveBreakfastRegular = membersState.filter((m) => m.breakfast).length;
  const liveBreakfastGuests = membersState.reduce((sum, m) => sum + (Number(m.guestBreakfast) || 0), 0);
  const liveTotalBreakfast = liveBreakfastRegular + liveBreakfastGuests;

  const liveLunchRegular = membersState.filter((m) => m.lunch).length;
  const liveLunchGuests = membersState.reduce((sum, m) => sum + (Number(m.guestLunch) || 0), 0);
  const liveTotalLunch = liveLunchRegular + liveLunchGuests;

  const liveDinnerRegular = membersState.filter((m) => m.dinner).length;
  const liveDinnerGuests = membersState.reduce((sum, m) => sum + (Number(m.guestDinner) || 0), 0);
  const liveTotalDinner = liveDinnerRegular + liveDinnerGuests;

  const liveGuests = membersState.reduce((sum, m) => {
    const totalG = (m.guestBreakfast !== undefined || m.guestLunch !== undefined || m.guestDinner !== undefined)
      ? ((Number(m.guestBreakfast) || 0) + (Number(m.guestLunch) || 0) + (Number(m.guestDinner) || 0))
      : (Number(m.guestCount) || 0);
    return sum + totalG;
  }, 0);

  const effGuestB = showCustomGuestWeights ? guestBWeight : bWeight;
  const effGuestL = showCustomGuestWeights ? guestLWeight : lWeight;
  const effGuestD = showCustomGuestWeights ? guestDWeight : dWeight;

  const liveGuestPoints = membersState.reduce((sum, m) => {
    const gb = Number(m.guestBreakfast) || 0;
    const gl = Number(m.guestLunch) || 0;
    const gd = Number(m.guestDinner) || 0;
    const hasDetailedGuests = m.guestBreakfast !== undefined || m.guestLunch !== undefined || m.guestDinner !== undefined;
    return sum + (hasDetailedGuests ? (gb * effGuestB + gl * effGuestL + gd * effGuestD) : (Number(m.guestCount) || 0) * effGuestL);
  }, 0);

  const dirtyCount = Object.keys(dirtyMap).length;

  const filteredMembers = membersState.filter((m) => {
    const matchesSearch =
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.roomNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.memberCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.phone.includes(searchQuery);

    if (!matchesSearch) return false;

    const isEatingAny = m.breakfast || m.lunch || m.dinner || m.guestCount > 0;
    if (filterType === 'EATING') return isEatingAny;
    if (filterType === 'OFF') return !isEatingAny;

    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white p-6 sm:p-8 rounded-3xl shadow-xl border border-slate-700/60 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <span className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl">
              <Utensils className="w-5 h-5" />
            </span>
            <span className="text-xs font-bold text-emerald-400 tracking-wider uppercase">
              রান্নার লাইভ হিসাব ও মিল কন্ট্রোল বোর্ড
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            কোন বেলায় কত মিল রান্না হবে?
          </h2>
          <p className="text-xs sm:text-sm text-slate-300">
            তারিখ নির্বাচন করুন, মেম্বারদের মিল অন/অফ বা মান সেট করুন এবং রান্নার আগে লক করুন।
          </p>
        </div>

        {/* Date Selector & Settings Toggle */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="flex items-center space-x-2 bg-slate-800/90 p-1.5 rounded-2xl border border-slate-700 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setDate(today)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                date === today
                  ? 'bg-emerald-500 text-slate-950 shadow'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              আজ (Today)
            </button>
            <button
              type="button"
              onClick={() => setDate(tomorrow)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                date === tomorrow
                  ? 'bg-emerald-500 text-slate-950 shadow'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              আগামীকাল (Tomorrow)
            </button>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="bg-slate-900 text-white text-xs px-3 py-2 rounded-xl border border-slate-700 focus:outline-none focus:border-emerald-400 cursor-pointer"
            />
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={fetchCookingData}
              title="রিফ্রেশ করুন"
              className="p-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-2xl border border-slate-700 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {toastMessage && (
        <div
          className={`p-4 rounded-2xl text-xs font-bold flex items-center space-x-2 shadow-sm ${
            toastMessage.type === 'success'
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}
        >
          {toastMessage.type === 'success' ? (
            <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
          )}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* 4 Clean KPI Cooking Cards (Display Only) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Breakfast */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-2 hover:border-amber-300 transition-colors">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">🍳 সকালের নাস্তা</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 font-bold border border-amber-200">
              {bWeight} pt {showCustomGuestWeights && guestBWeight !== bWeight ? `(গেস্ট ${guestBWeight})` : ''}
            </span>
          </div>
          <p className="text-3xl sm:text-4xl font-extrabold text-amber-600">
            {loading ? '...' : liveTotalBreakfast} <span className="text-base font-semibold text-slate-500">মিল</span>
          </p>
          <p className="text-xs text-slate-500">
            রেগুলার: {liveBreakfastRegular} + গেস্ট: {liveBreakfastGuests}
          </p>
        </div>

        {/* Lunch */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-2 hover:border-blue-300 transition-colors">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">🍛 দুপুরের খাবার</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-800 font-bold border border-blue-200">
              {lWeight} pt {showCustomGuestWeights && guestLWeight !== lWeight ? `(গেস্ট ${guestLWeight})` : ''}
            </span>
          </div>
          <p className="text-3xl sm:text-4xl font-extrabold text-blue-600">
            {loading ? '...' : liveTotalLunch}{' '}
            <span className="text-base font-semibold text-slate-500">মিল</span>
          </p>
          <p className="text-xs text-slate-500">
            রেগুলার: {liveLunchRegular} + গেস্ট: {liveLunchGuests}
          </p>
        </div>

        {/* Dinner */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-2 hover:border-purple-300 transition-colors">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">🍲 রাতের খাবার</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-purple-50 text-purple-800 font-bold border border-purple-200">
              {dWeight} pt {showCustomGuestWeights && guestDWeight !== dWeight ? `(গেস্ট ${guestDWeight})` : ''}
            </span>
          </div>
          <p className="text-3xl sm:text-4xl font-extrabold text-purple-600">
            {loading ? '...' : liveTotalDinner}{' '}
            <span className="text-base font-semibold text-slate-500">মিল</span>
          </p>
          <p className="text-xs text-slate-500">
            রেগুলার: {liveDinnerRegular} + গেস্ট: {liveDinnerGuests}
          </p>
        </div>

        {/* Guest Meals */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-2 hover:border-indigo-300 transition-colors">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">👥 গেস্ট / অতিরিক্ত মিল</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-800 font-bold border border-indigo-200">
              {Math.round(liveGuestPoints * 10) / 10} Pt
            </span>
          </div>
          <p className="text-3xl sm:text-4xl font-extrabold text-indigo-600">
            {loading ? '...' : liveGuests}{' '}
            <span className="text-base font-semibold text-slate-500">টি</span>
          </p>
          <p className="text-xs text-slate-500">
            সকালে {liveBreakfastGuests} | দুপুরে {liveLunchGuests} | রাতে {liveDinnerGuests}
          </p>
        </div>
      </div>

      {/* ONE Single Dedicated Meal Lock Control Center */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
        {/* Banner Header: Title, Status Badge & Master Lock/Unlock Button */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="flex items-center space-x-3">
            <div
              className={`p-3 rounded-2xl border flex-shrink-0 ${
                isAllLocked
                  ? 'bg-amber-100 text-amber-800 border-amber-300'
                  : (breakfastLocked || lunchLocked || dinnerLocked)
                  ? 'bg-blue-100 text-blue-800 border-blue-300'
                  : 'bg-emerald-100 text-emerald-800 border-emerald-300'
              }`}
            >
              {isAllLocked ? <Lock className="w-5 h-5" /> : <Unlock className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-bold text-slate-900 text-base">
                  মিল লক কন্ট্রোল বোর্ড
                </h3>
                <span
                  className={`text-xs font-extrabold px-3 py-0.5 rounded-full border ${
                    isAllLocked
                      ? 'bg-amber-100 text-amber-800 border-amber-300'
                      : (breakfastLocked || lunchLocked || dinnerLocked)
                      ? 'bg-blue-100 text-blue-800 border-blue-300'
                      : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                  }`}
                >
                  {isAllLocked
                    ? '🔒 সব বেলা লকড'
                    : (breakfastLocked || lunchLocked || dinnerLocked)
                    ? '⚠️ আংশিক লকড'
                    : '🟢 সব উন্মুক্ত (OPEN)'}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                রান্নার প্রস্তুতির সুবিধার্থে সকাল, দুপুর বা রাতের মিল আলাদা করে অথবা সব বেলা একসাথে লক করুন।
              </p>
            </div>
          </div>

          {/* Master Lock/Unlock All Button */}
          <div className="flex-shrink-0">
            {isAllLocked ? (
              <button
                type="button"
                onClick={() => handleToggleLock('UNLOCK')}
                disabled={processingLock}
                className="w-full md:w-auto px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl border border-slate-300 shadow-sm transition-all flex items-center justify-center space-x-2"
              >
                <Unlock className="w-4 h-4 text-slate-600" />
                <span>{processingLock ? 'আনলক হচ্ছে...' : 'সব বেলা আনলক করুন'}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleToggleLock('LOCK_AND_SYNC')}
                disabled={processingLock}
                className="w-full md:w-auto px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center space-x-2"
              >
                <Lock className="w-4 h-4" />
                <span>{processingLock ? 'লক হচ্ছে...' : '🔒 সব বেলা একসাথে লক করুন'}</span>
              </button>
            )}
          </div>
        </div>

        {/* 3 Interactive Session Lock Toggles in ONE clean row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Breakfast Session Lock Card */}
          <div className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between ${
            breakfastLocked
              ? 'bg-amber-50/70 border-amber-300 text-amber-950'
              : 'bg-slate-50 border-slate-200 text-slate-800'
          }`}>
            <div className="flex items-center space-x-2.5">
              <span className="text-xl">🍳</span>
              <div>
                <div className="font-bold text-xs flex items-center gap-1.5">
                  <span>সকালের নাস্তা</span>
                  <span className={`text-[10px] font-extrabold px-1.5 py-0.2 rounded-md ${
                    breakfastLocked ? 'bg-amber-200 text-amber-900' : 'bg-emerald-100 text-emerald-800'
                  }`}>
                    {breakfastLocked ? 'লকড' : 'উন্মুক্ত'}
                  </span>
                </div>
                <span className="text-[11px] text-slate-500">
                  {liveTotalBreakfast} মিল (রেগুলার {liveBreakfastRegular} + গেস্ট {liveBreakfastGuests})
                </span>
              </div>
            </div>
            <button
              type="button"
              disabled={processingLock}
              onClick={() => handleToggleSessionLock('breakfast', !breakfastLocked)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-1 ${
                breakfastLocked
                  ? 'bg-white hover:bg-amber-100 text-amber-900 border border-amber-300 shadow-sm'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm'
              }`}
            >
              {breakfastLocked ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
              <span>{breakfastLocked ? 'আনলক' : 'লক করুন'}</span>
            </button>
          </div>

          {/* Lunch Session Lock Card */}
          <div className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between ${
            lunchLocked
              ? 'bg-blue-50/70 border-blue-300 text-blue-950'
              : 'bg-slate-50 border-slate-200 text-slate-800'
          }`}>
            <div className="flex items-center space-x-2.5">
              <span className="text-xl">🍛</span>
              <div>
                <div className="font-bold text-xs flex items-center gap-1.5">
                  <span>দুপুরের খাবার</span>
                  <span className={`text-[10px] font-extrabold px-1.5 py-0.2 rounded-md ${
                    lunchLocked ? 'bg-blue-200 text-blue-900' : 'bg-emerald-100 text-emerald-800'
                  }`}>
                    {lunchLocked ? 'লকড' : 'উন্মুক্ত'}
                  </span>
                </div>
                <span className="text-[11px] text-slate-500">
                  {liveTotalLunch} মিল (রেগুলার {liveLunchRegular} + গেস্ট {liveLunchGuests})
                </span>
              </div>
            </div>
            <button
              type="button"
              disabled={processingLock}
              onClick={() => handleToggleSessionLock('lunch', !lunchLocked)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-1 ${
                lunchLocked
                  ? 'bg-white hover:bg-blue-100 text-blue-950 border border-blue-300 shadow-sm'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm'
              }`}
            >
              {lunchLocked ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
              <span>{lunchLocked ? 'আনলক' : 'লক করুন'}</span>
            </button>
          </div>

          {/* Dinner Session Lock Card */}
          <div className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between ${
            dinnerLocked
              ? 'bg-purple-50/70 border-purple-300 text-purple-950'
              : 'bg-slate-50 border-slate-200 text-slate-800'
          }`}>
            <div className="flex items-center space-x-2.5">
              <span className="text-xl">🍲</span>
              <div>
                <div className="font-bold text-xs flex items-center gap-1.5">
                  <span>রাতের খাবার</span>
                  <span className={`text-[10px] font-extrabold px-1.5 py-0.2 rounded-md ${
                    dinnerLocked ? 'bg-purple-200 text-purple-900' : 'bg-emerald-100 text-emerald-800'
                  }`}>
                    {dinnerLocked ? 'লকড' : 'উন্মুক্ত'}
                  </span>
                </div>
                <span className="text-[11px] text-slate-500">
                  {liveTotalDinner} মিল (রেগুলার {liveDinnerRegular} + গেস্ট {liveDinnerGuests})
                </span>
              </div>
            </div>
            <button
              type="button"
              disabled={processingLock}
              onClick={() => handleToggleSessionLock('dinner', !dinnerLocked)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-1 ${
                dinnerLocked
                  ? 'bg-white hover:bg-purple-100 text-purple-900 border border-purple-300 shadow-sm'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm'
              }`}
            >
              {dinnerLocked ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
              <span>{dinnerLocked ? 'আনলক' : 'লক করুন'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Dedicated Google Sheet Sync Card */}
      <div className={`p-6 rounded-3xl border shadow-sm transition-all flex flex-col md:flex-row md:items-center justify-between gap-5 ${
        isAddedToSheet
          ? 'bg-gradient-to-r from-emerald-50 via-teal-50 to-white border-emerald-300'
          : 'bg-gradient-to-r from-blue-50 via-indigo-50 to-white border-blue-200'
      }`}>
        <div className="flex items-start sm:items-center space-x-3.5">
          <div className={`p-3 rounded-2xl border flex-shrink-0 ${
            isAddedToSheet ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-blue-100 text-blue-800 border-blue-300'
          }`}>
            <FileSpreadsheet className="w-6 h-6" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-bold text-slate-900 text-base">
                গুগল শিট মিল হিসাব ({date})
              </h3>
              <span className={`text-xs font-extrabold px-3 py-0.5 rounded-full border ${
                isAddedToSheet
                  ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                  : 'bg-amber-100 text-amber-800 border-amber-300'
              }`}>
                {isAddedToSheet ? `✅ শিটে যুক্ত করা হয়েছে (${sheetMealCount} মিল)` : '⏳ শিটে এখনও যোগ করা হয়নি (সাইট ড্রাফট)'}
              </span>
            </div>
            <p className="text-xs text-slate-600 mt-1">
              {isAddedToSheet
                ? 'এই তারিখের মিল গুগল শিটের Meals টেবিল এবং মাসিক রিপোর্টে সংরক্ষিত আছে। বুকিং বা লক পরিবর্তন হলে শিট আপডেট করতে পারেন।'
                : 'মেম্বারদের বুকিং ও লক সাইটে সংরক্ষিত আছে। রান্নার চূড়ান্ত মিল গুগল শিটে যোগ করতে "শিটে যোগ করুন" বাটনে চাপুন।'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 flex-shrink-0">
          <button
            type="button"
            onClick={handleAddToSheet}
            disabled={syncingToSheet}
            className={`px-5 py-2.5 rounded-xl font-bold text-xs shadow-md transition-all flex items-center space-x-2 ${
              isAddedToSheet
                ? 'bg-emerald-700 hover:bg-emerald-600 text-white'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white ring-2 ring-emerald-400/40'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>{syncingToSheet ? 'শিটে যোগ হচ্ছে...' : isAddedToSheet ? '🔄 শিট আপডেট করুন (Update Sheet)' : '➕ শিটে যোগ করুন (Add to Sheet)'}</span>
          </button>

          {isAddedToSheet && (
            <button
              type="button"
              onClick={handleRemoveFromSheet}
              disabled={syncingToSheet}
              className="px-4 py-2.5 rounded-xl font-bold text-xs bg-white hover:bg-red-50 text-red-700 border border-red-300 shadow-sm transition-all flex items-center space-x-1.5"
            >
              <span>🗑️ শিট থেকে সরান</span>
            </button>
          )}
        </div>
      </div>

      {/* Unsaved Changes Banner */}
      {dirtyCount > 0 && (
        <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 shadow-md">
          <div className="flex items-center space-x-2 text-emerald-900 text-xs font-bold">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></span>
            <span>⚠️ {dirtyCount} জন মেম্বারের মিলের মান পরিবর্তন করা হয়েছে (সংরক্ষণ বাকি)।</span>
          </div>
          <button
            onClick={handleSaveAllDirty}
            disabled={savingBulk}
            className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow transition-all flex items-center space-x-1.5"
          >
            <Save className="w-4 h-4" />
            <span>{savingBulk ? 'সংরক্ষণ হচ্ছে...' : 'সব পরিবর্তন সংরক্ষণ করুন (Save All)'}</span>
          </button>
        </div>
      )}

      {/* Member Breakdown Table with Manager Controls */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden space-y-0">
        <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/50">
          <div>
            <h3 className="font-bold text-slate-800 text-base">
              মেম্বারদের বিস্তারিত মিল তালিকা ({filteredMembers.length})
            </h3>
            <p className="text-xs text-slate-500">
              ম্যানেজার সরাসরি যেকোনো মেম্বারের মিল অন/অফ করতে পারেন বা গেস্ট সংখ্যা পরিবর্তন করতে পারেন।
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3">
            {/* Filter Buttons */}
            <div className="flex items-center space-x-1 bg-slate-200/70 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setFilterType('ALL')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  filterType === 'ALL' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
                }`}
              >
                সবাই
              </button>
              <button
                type="button"
                onClick={() => setFilterType('EATING')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  filterType === 'EATING' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-600'
                }`}
              >
                মিল খাবে
              </button>
              <button
                type="button"
                onClick={() => setFilterType('OFF')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  filterType === 'OFF' ? 'bg-white text-red-700 shadow-sm' : 'text-slate-600'
                }`}
              >
                মিল অফ
              </button>
            </div>

            {/* Guest weights toggle button */}
            <button
              type="button"
              onClick={() => {
                const next = !showCustomGuestWeights;
                setShowCustomGuestWeights(next);
                if (!next) {
                  setGuestBWeight(bWeight);
                  setGuestLWeight(lWeight);
                  setGuestDWeight(dWeight);
                }
              }}
              className={`px-3 py-2 rounded-xl font-bold text-xs shadow-sm transition-all flex items-center space-x-1.5 whitespace-nowrap border ${
                showCustomGuestWeights
                  ? 'bg-purple-100 text-purple-900 border-purple-300 ring-2 ring-purple-200'
                  : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-300'
              }`}
              title="প্রয়োজন হলে প্রতি বেলার গেস্ট মিলের আলাদা পয়েন্ট সেট করুন"
            >
              <Sliders className="w-3.5 h-3.5 text-purple-600" />
              <span>{showCustomGuestWeights ? '👥 গেস্টের আলাদা মান (চালু)' : '👥 গেস্টের আলাদা মান'}</span>
            </button>

            {/* Save weights button */}
            <button
              type="button"
              onClick={handleApplyWeightsToAll}
              disabled={savingBulk}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl shadow-sm transition-all flex items-center space-x-1.5 whitespace-nowrap"
              title="টেবিল হেডারের নতুন মান সবার জন্য সংরক্ষণ করুন"
            >
              <Save className="w-3.5 h-3.5 text-emerald-400" />
              <span>{savingBulk ? 'সংরক্ষণ হচ্ছে...' : 'নতুন মান সেভ করুন'}</span>
            </button>

            {/* Search Input */}
            <div className="relative w-full sm:w-60">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="নাম বা রুম খুঁজুন..."
                className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-500 shadow-sm"
              />
            </div>
          </div>
        </div>

        {/* Table with Clickable Toggles */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">রুম নং</th>
                <th className="py-3 px-4">সদস্যের নাম</th>
                <th className="py-3 px-3 text-center">
                  <div className="flex flex-col items-center justify-center space-y-1">
                    <span className="font-extrabold text-slate-800 text-xs">🍳 সকাল (B)</span>
                    <div className="flex items-center space-x-1" title="সকালের মিলের মান সেট করুন">
                      <span className="text-[10px] text-slate-400 font-semibold">{showCustomGuestWeights ? 'সদস্য:' : 'মান:'}</span>
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
                        className="w-14 text-center py-0.5 px-1 bg-white border border-amber-400 rounded-lg font-black text-amber-900 text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none shadow-inner"
                      />
                    </div>
                    {showCustomGuestWeights && (
                      <div className="flex items-center space-x-1 animate-in fade-in duration-150" title="সকালে গেস্ট মিলের আলাদা মান সেট করুন">
                        <span className="text-[10px] text-purple-700 font-bold">গেস্ট:</span>
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          value={guestBWeight}
                          onChange={(e) => setGuestBWeight(Math.max(0, parseFloat(e.target.value) || 0))}
                          className="w-14 text-center py-0.5 px-1 bg-purple-50 border border-purple-400 rounded-lg font-black text-purple-900 text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none shadow-inner"
                        />
                      </div>
                    )}
                  </div>
                </th>
                <th className="py-3 px-3 text-center">
                  <div className="flex flex-col items-center justify-center space-y-1">
                    <span className="font-extrabold text-slate-800 text-xs">🍛 দুপুর (L)</span>
                    <div className="flex items-center space-x-1" title="দুপুরের মিলের মান সেট করুন">
                      <span className="text-[10px] text-slate-400 font-semibold">{showCustomGuestWeights ? 'সদস্য:' : 'মান:'}</span>
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
                        className="w-14 text-center py-0.5 px-1 bg-white border border-blue-400 rounded-lg font-black text-blue-900 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none shadow-inner"
                      />
                    </div>
                    {showCustomGuestWeights && (
                      <div className="flex items-center space-x-1 animate-in fade-in duration-150" title="দুপুরে গেস্ট মিলের আলাদা মান সেট করুন">
                        <span className="text-[10px] text-purple-700 font-bold">গেস্ট:</span>
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          value={guestLWeight}
                          onChange={(e) => setGuestLWeight(Math.max(0, parseFloat(e.target.value) || 0))}
                          className="w-14 text-center py-0.5 px-1 bg-purple-50 border border-purple-400 rounded-lg font-black text-purple-900 text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none shadow-inner"
                        />
                      </div>
                    )}
                  </div>
                </th>
                <th className="py-3 px-3 text-center">
                  <div className="flex flex-col items-center justify-center space-y-1">
                    <span className="font-extrabold text-slate-800 text-xs">🍲 রাত (D)</span>
                    <div className="flex items-center space-x-1" title="রাতের মিলের মান সেট করুন">
                      <span className="text-[10px] text-slate-400 font-semibold">{showCustomGuestWeights ? 'সদস্য:' : 'মান:'}</span>
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
                        className="w-14 text-center py-0.5 px-1 bg-white border border-purple-400 rounded-lg font-black text-purple-900 text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none shadow-inner"
                      />
                    </div>
                    {showCustomGuestWeights && (
                      <div className="flex items-center space-x-1 animate-in fade-in duration-150" title="রাতে গেস্ট মিলের আলাদা মান সেট করুন">
                        <span className="text-[10px] text-purple-700 font-bold">গেস্ট:</span>
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          value={guestDWeight}
                          onChange={(e) => setGuestDWeight(Math.max(0, parseFloat(e.target.value) || 0))}
                          className="w-14 text-center py-0.5 px-1 bg-purple-50 border border-purple-400 rounded-lg font-black text-purple-900 text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none shadow-inner"
                        />
                      </div>
                    )}
                  </div>
                </th>
                <th className="py-3 px-3 text-center">📊 মোট মিল</th>
                <th className="py-3 px-4">বার্তা / নোট</th>
                <th className="py-3 px-4 text-center">অ্যাকশন</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-500">
                    লোড হচ্ছে...
                  </td>
                </tr>
              ) : filteredMembers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-500">
                    কোনো সদস্য পাওয়া যায়নি।
                  </td>
                </tr>
              ) : (
                filteredMembers.map((m) => {
                  const isOffAll = !m.breakfast && !m.lunch && !m.dinner && m.guestCount === 0;
                  const isDirty = Boolean(dirtyMap[m.memberId]);
                  const rowMealTotal = calculateMemberMealTotal(m);

                  return (
                    <tr
                      key={m.memberId}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        isDirty ? 'bg-amber-50/40' : isOffAll ? 'bg-red-50/20 text-slate-400' : ''
                      }`}
                    >
                      {/* Room */}
                      <td className="py-3.5 px-4 font-bold text-slate-800">
                        Room {m.roomNo}
                      </td>

                      {/* Name & Phone */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 text-sm">{m.name}</div>
                        <div className="text-[11px] text-slate-500 flex items-center space-x-1">
                          <span>{m.memberCode}</span>
                          <span>•</span>
                          <span>{m.phone}</span>
                          <span>•</span>
                          <button
                            type="button"
                            onClick={() => openGuestModal(m)}
                            className="text-purple-600 hover:text-purple-800 hover:underline font-bold text-[10px]"
                            title="বেলা অনুযায়ী মেহমান মিল পরিবর্তন করুন"
                          >
                            +গেস্ট
                          </button>
                        </div>
                      </td>

                      {/* Breakfast Toggle Button */}
                      <td className="py-3.5 px-3 text-center">
                        <div className="flex flex-col items-center justify-center space-y-1">
                          <button
                            type="button"
                            onClick={() => handleToggleMeal(m.memberId, 'breakfast')}
                            className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all shadow-sm flex items-center justify-center space-x-1 mx-auto min-w-[72px] ${
                              m.breakfast
                                ? 'bg-amber-500 text-white hover:bg-amber-600'
                                : 'bg-slate-100 text-slate-500 hover:bg-slate-200 border border-slate-200'
                            }`}
                            title="ক্লিক করে সকালের মিল অন/অফ করুন"
                          >
                            <span>{m.breakfast ? '✅' : '❌'}</span>
                            <span>{m.breakfast ? `${bWeight}` : '০'}</span>
                          </button>
                          {Number(m.guestBreakfast) > 0 && (
                            <button
                              type="button"
                              onClick={() => openGuestModal(m)}
                              className="text-[10px] font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 px-1.5 py-0.5 rounded border border-amber-200 transition-colors"
                              title={`সকালে ${m.guestBreakfast} গেস্ট × ${effGuestB} = ${(Number(m.guestBreakfast) * effGuestB).toFixed(1)} পয়েন্ট`}
                            >
                              +{m.guestBreakfast} গেস্ট
                            </button>
                          )}
                        </div>
                      </td>

                      {/* Lunch Toggle Button */}
                      <td className="py-3.5 px-3 text-center">
                        <div className="flex flex-col items-center justify-center space-y-1">
                          <button
                            type="button"
                            onClick={() => handleToggleMeal(m.memberId, 'lunch')}
                            className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all shadow-sm flex items-center justify-center space-x-1 mx-auto min-w-[72px] ${
                              m.lunch
                                ? 'bg-blue-600 text-white hover:bg-blue-700'
                                : 'bg-slate-100 text-slate-500 hover:bg-slate-200 border border-slate-200'
                            }`}
                            title="ক্লিক করে দুপুরের মিল অন/অফ করুন"
                          >
                            <span>{m.lunch ? '✅' : '❌'}</span>
                            <span>{m.lunch ? `${lWeight}` : '০'}</span>
                          </button>
                          {Number(m.guestLunch) > 0 && (
                            <button
                              type="button"
                              onClick={() => openGuestModal(m)}
                              className="text-[10px] font-bold text-blue-800 bg-blue-50 hover:bg-blue-100 px-1.5 py-0.5 rounded border border-blue-200 transition-colors"
                              title={`দুপুরে ${m.guestLunch} গেস্ট × ${effGuestL} = ${(Number(m.guestLunch) * effGuestL).toFixed(1)} পয়েন্ট`}
                            >
                              +{m.guestLunch} গেস্ট
                            </button>
                          )}
                        </div>
                      </td>

                      {/* Dinner Toggle Button */}
                      <td className="py-3.5 px-3 text-center">
                        <div className="flex flex-col items-center justify-center space-y-1">
                          <button
                            type="button"
                            onClick={() => handleToggleMeal(m.memberId, 'dinner')}
                            className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all shadow-sm flex items-center justify-center space-x-1 mx-auto min-w-[72px] ${
                              m.dinner
                                ? 'bg-purple-600 text-white hover:bg-purple-700'
                                : 'bg-slate-100 text-slate-500 hover:bg-slate-200 border border-slate-200'
                            }`}
                            title="ক্লিক করে রাতের মিল অন/অফ করুন"
                          >
                            <span>{m.dinner ? '✅' : '❌'}</span>
                            <span>{m.dinner ? `${dWeight}` : '০'}</span>
                          </button>
                          {Number(m.guestDinner) > 0 && (
                            <button
                              type="button"
                              onClick={() => openGuestModal(m)}
                              className="text-[10px] font-bold text-purple-800 bg-purple-50 hover:bg-purple-100 px-1.5 py-0.5 rounded border border-purple-200 transition-colors"
                              title={`রাতে ${m.guestDinner} গেস্ট × ${effGuestD} = ${(Number(m.guestDinner) * effGuestD).toFixed(1)} পয়েন্ট`}
                            >
                              +{m.guestDinner} গেস্ট
                            </button>
                          )}
                        </div>
                      </td>

                      {/* Total Calculated Meal Value */}
                      <td className="py-3.5 px-3 text-center font-extrabold text-sm text-slate-900">
                        <span className={`px-2.5 py-0.5 rounded-lg border ${
                          rowMealTotal > 0
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : 'bg-slate-100 text-slate-400 border-slate-200'
                        }`}>
                          {rowMealTotal}
                        </span>
                      </td>

                      {/* Member Note */}
                      <td className="py-3.5 px-4 text-slate-600 italic">
                        {m.note ? (
                          <span className="text-slate-800 font-medium">"{m.note}"</span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>

                      {/* Action */}
                      <td className="py-3.5 px-4 text-center">
                        {isDirty ? (
                          <button
                            type="button"
                            disabled={savingRowId === m.memberId}
                            onClick={() => handleSaveMember(m.memberId)}
                            className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] rounded-lg shadow-sm transition-all flex items-center space-x-1 mx-auto"
                          >
                            <Save className="w-3 h-3" />
                            <span>{savingRowId === m.memberId ? '...' : 'সেভ'}</span>
                          </button>
                        ) : (
                          <span className="text-[10px] text-slate-400 font-semibold">
                            সেভড
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

      {/* Guest Breakdown Modal */}
      {guestModalMember && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-extrabold text-slate-900 text-base">বেলা অনুযায়ী মেহমান মিল</h3>
                <p className="text-xs text-slate-500 font-medium">{guestModalMember.name} (রুম {guestModalMember.roomNo})</p>
              </div>
              <span className="p-2 bg-purple-100 text-purple-700 rounded-xl">
                <Users className="w-5 h-5" />
              </span>
            </div>

            <div className="space-y-4">
              {/* Breakfast Guest */}
              <div className="flex items-center justify-between p-3 bg-amber-50/60 rounded-2xl border border-amber-200">
                <div className="flex items-center space-x-2">
                  <span className="text-lg">🍳</span>
                  <div>
                    <h5 className="font-bold text-xs text-slate-800">সকালের নাস্তায় মেহমান</h5>
                    <span className="text-[10px] text-slate-500">
                      {effGuestB} pt/জন {modalGuestB > 0 ? `→ ${(modalGuestB * effGuestB).toFixed(1)} pt` : ''}
                    </span>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    disabled={modalGuestB <= 0}
                    onClick={() => setModalGuestB(Math.max(0, modalGuestB - 1))}
                    className="w-7 h-7 flex items-center justify-center rounded-lg bg-white border border-slate-300 hover:bg-slate-100 disabled:opacity-40 font-bold"
                  >
                    <Minus className="w-3.5 h-3.5 text-slate-700" />
                  </button>
                  <span className="w-6 text-center font-black text-sm text-slate-900">{modalGuestB}</span>
                  <button
                    type="button"
                    disabled={modalGuestB >= 20}
                    onClick={() => setModalGuestB(modalGuestB + 1)}
                    className="w-7 h-7 flex items-center justify-center rounded-lg bg-white border border-slate-300 hover:bg-slate-100 disabled:opacity-40 font-bold"
                  >
                    <Plus className="w-3.5 h-3.5 text-slate-700" />
                  </button>
                </div>
              </div>

              {/* Lunch Guest */}
              <div className="flex items-center justify-between p-3 bg-blue-50/60 rounded-2xl border border-blue-200">
                <div className="flex items-center space-x-2">
                  <span className="text-lg">🍛</span>
                  <div>
                    <h5 className="font-bold text-xs text-slate-800">দুপুরের খাবারে মেহমান</h5>
                    <span className="text-[10px] text-slate-500">
                      {effGuestL} pt/জন {modalGuestL > 0 ? `→ ${(modalGuestL * effGuestL).toFixed(1)} pt` : ''}
                    </span>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    disabled={modalGuestL <= 0}
                    onClick={() => setModalGuestL(Math.max(0, modalGuestL - 1))}
                    className="w-7 h-7 flex items-center justify-center rounded-lg bg-white border border-slate-300 hover:bg-slate-100 disabled:opacity-40 font-bold"
                  >
                    <Minus className="w-3.5 h-3.5 text-slate-700" />
                  </button>
                  <span className="w-6 text-center font-black text-sm text-slate-900">{modalGuestL}</span>
                  <button
                    type="button"
                    disabled={modalGuestL >= 20}
                    onClick={() => setModalGuestL(modalGuestL + 1)}
                    className="w-7 h-7 flex items-center justify-center rounded-lg bg-white border border-slate-300 hover:bg-slate-100 disabled:opacity-40 font-bold"
                  >
                    <Plus className="w-3.5 h-3.5 text-slate-700" />
                  </button>
                </div>
              </div>

              {/* Dinner Guest */}
              <div className="flex items-center justify-between p-3 bg-purple-50/60 rounded-2xl border border-purple-200">
                <div className="flex items-center space-x-2">
                  <span className="text-lg">🍲</span>
                  <div>
                    <h5 className="font-bold text-xs text-slate-800">রাতের খাবারে মেহমান</h5>
                    <span className="text-[10px] text-slate-500">
                      {effGuestD} pt/জন {modalGuestD > 0 ? `→ ${(modalGuestD * effGuestD).toFixed(1)} pt` : ''}
                    </span>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    disabled={modalGuestD <= 0}
                    onClick={() => setModalGuestD(Math.max(0, modalGuestD - 1))}
                    className="w-7 h-7 flex items-center justify-center rounded-lg bg-white border border-slate-300 hover:bg-slate-100 disabled:opacity-40 font-bold"
                  >
                    <Minus className="w-3.5 h-3.5 text-slate-700" />
                  </button>
                  <span className="w-6 text-center font-black text-sm text-slate-900">{modalGuestD}</span>
                  <button
                    type="button"
                    disabled={modalGuestD >= 20}
                    onClick={() => setModalGuestD(modalGuestD + 1)}
                    className="w-7 h-7 flex items-center justify-center rounded-lg bg-white border border-slate-300 hover:bg-slate-100 disabled:opacity-40 font-bold"
                  >
                    <Plus className="w-3.5 h-3.5 text-slate-700" />
                  </button>
                </div>
              </div>
            </div>

            {/* Total Guest Summary */}
            <div className="p-3 bg-purple-50/70 rounded-2xl border border-purple-200 flex items-center justify-between text-xs font-bold text-slate-800">
              <div>
                <span>মোট মেহমান: </span>
                <span className="text-purple-700 text-sm font-black">{modalGuestB + modalGuestL + modalGuestD} টি</span>
              </div>
              <div>
                <span className="text-slate-500">মোট পয়েন্ট: </span>
                <span className="text-emerald-700 text-sm font-black">
                  {(
                    modalGuestB * effGuestB +
                    modalGuestL * effGuestL +
                    modalGuestD * effGuestD
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
                ঠিক আছে (Apply)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
