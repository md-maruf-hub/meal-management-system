'use client';

import React, { useState, useEffect } from 'react';
import {
  Utensils,
  Lock,
  CheckCircle,
  AlertCircle,
  Calendar as CalendarIcon,
  Plus,
  Minus,
  UserCheck,
  Clock,
  Coffee,
  Sun,
  Moon,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Info,
} from 'lucide-react';

interface MealBookingWidgetProps {
  userId?: string;
  selectedMonth: string;
}

export default function MealBookingWidget({ selectedMonth }: MealBookingWidgetProps) {
  const getTodayStr = () => new Date().toISOString().split('T')[0];
  const getTomorrowStr = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  };

  const today = getTodayStr();
  const tomorrow = getTomorrowStr();

  const [targetDate, setTargetDate] = useState<string>(today);
  const [breakfast, setBreakfast] = useState(true);
  const [lunch, setLunch] = useState(true);
  const [dinner, setDinner] = useState(true);
  const [guestBreakfast, setGuestBreakfast] = useState(0);
  const [guestLunch, setGuestLunch] = useState(0);
  const [guestDinner, setGuestDinner] = useState(0);
  const [guestCount, setGuestCount] = useState(0);
  const [note, setNote] = useState('');

  const [isLocked, setIsLocked] = useState(false);
  const [breakfastLocked, setBreakfastLocked] = useState(false);
  const [lunchLocked, setLunchLocked] = useState(false);
  const [dinnerLocked, setDinnerLocked] = useState(false);
  const [lockedBy, setLockedBy] = useState<string | null>(null);
  const [isMonthClosed, setIsMonthClosed] = useState(false);
  const [isInherited, setIsInherited] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchStatusForDate(targetDate);
  }, [targetDate]);

  const fetchStatusForDate = async (date: string) => {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/member/meal-declaration?date=${date}`);
      const data = await res.json();

      if (res.ok && data.success) {
        setIsMonthClosed(Boolean(data.isMonthClosed));

        const dailyLock = (data.locks || []).find((l: any) => l.date === date);
        const bLocked = Boolean(dailyLock?.breakfastLocked ?? dailyLock?.isLocked);
        const lLocked = Boolean(dailyLock?.lunchLocked ?? dailyLock?.isLocked);
        const dLocked = Boolean(dailyLock?.dinnerLocked ?? dailyLock?.isLocked);
        const allLocked = Boolean(dailyLock?.isLocked || (bLocked && lLocked && dLocked));

        setIsLocked(allLocked);
        setBreakfastLocked(bLocked);
        setLunchLocked(lLocked);
        setDinnerLocked(dLocked);
        setLockedBy(dailyLock?.lockedBy || null);

        const currentReq = (data.requests || []).find((r: any) => r.date === date);
        if (currentReq) {
          setIsInherited(Boolean(currentReq.isInherited));
          setBreakfast(Boolean(currentReq.breakfast));
          setLunch(Boolean(currentReq.lunch));
          setDinner(Boolean(currentReq.dinner));
          const gb = Number(currentReq.guestBreakfast) || 0;
          const gl = Number(currentReq.guestLunch) || 0;
          const gd = Number(currentReq.guestDinner) || 0;
          const totalG =
            currentReq.guestBreakfast !== undefined ||
            currentReq.guestLunch !== undefined ||
            currentReq.guestDinner !== undefined
              ? gb + gl + gd
              : Number(currentReq.guestCount) || 0;

          setGuestBreakfast(gb);
          setGuestLunch(gl);
          setGuestDinner(gd);
          setGuestCount(totalG);
          setNote(currentReq.note || '');
        } else {
          // Default: all meals ON, no guests
          setIsInherited(false);
          setBreakfast(true);
          setLunch(true);
          setDinner(true);
          setGuestBreakfast(0);
          setGuestLunch(0);
          setGuestDinner(0);
          setGuestCount(0);
          setNote('');
        }
      }
      setLoading(false);
    } catch (err) {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const isAllLocked = Boolean(isLocked || (breakfastLocked && lunchLocked && dinnerLocked));
    if (isAllLocked || isMonthClosed) return;

    setSaving(true);
    setMessage(null);

    const totalG = guestBreakfast + guestLunch + guestDinner;

    try {
      const res = await fetch('/api/member/meal-declaration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: targetDate,
          breakfast,
          lunch,
          dinner,
          guestBreakfast,
          guestLunch,
          guestDinner,
          guestCount: totalG,
          note,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setGuestCount(totalG);
        setMessage({ type: 'success', text: '✅ আপনার মিল ও গেস্ট মিল পছন্দ সফলভাবে সংরক্ষিত হয়েছে!' });
        await fetchStatusForDate(targetDate);
      } else {
        setMessage({ type: 'error', text: data.error || 'সংরক্ষণ ব্যর্থ হয়েছে।' });
        if (res.status === 403) {
          await fetchStatusForDate(targetDate);
        }
      }
      setSaving(false);
    } catch (err: any) {
      setSaving(false);
      setMessage({ type: 'error', text: err.message || 'সংরক্ষণ করতে সমস্যা হয়েছে।' });
    }
  };

  // 1-Click Preset handlers
  const handlePresetAllOn = () => {
    if (!isMonthClosed) {
      if (!breakfastLocked) setBreakfast(true);
      if (!lunchLocked) setLunch(true);
      if (!dinnerLocked) setDinner(true);
    }
  };

  const handlePresetAllOff = () => {
    if (!isMonthClosed) {
      if (!breakfastLocked) setBreakfast(false);
      if (!lunchLocked) setLunch(false);
      if (!dinnerLocked) setDinner(false);
    }
  };

  const handlePresetLunchDinner = () => {
    if (!isMonthClosed) {
      if (!breakfastLocked) setBreakfast(false);
      if (!lunchLocked) setLunch(true);
      if (!dinnerLocked) setDinner(true);
    }
  };

  const quickNoteChips = [
    'দেরিতে খাব, খাবার তুলে রাখবেন',
    'পার্সেল করে বক্সে রাখবেন',
    'দুপুরে মেহমান সাথে খাবে',
    'রাতে দেরিতে ফিরব',
  ];

  const handleAddNoteChip = (chipText: string) => {
    if (note.trim().length === 0) {
      setNote(chipText);
    } else if (!note.includes(chipText)) {
      setNote(`${note}, ${chipText}`);
    }
  };

  // Format date to Bengali long string
  const formatBengaliDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr + 'T00:00:00');
      return d.toLocaleDateString('bn-BD', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    } catch (e) {
      return dateStr;
    }
  };

  // Generate 7-day quick strip starting from today
  const getUpcomingDays = () => {
    const days = [];
    const base = new Date();
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(base.getDate() + i);
      const dateStr = d.toISOString().split('T')[0];
      const dayNum = d.getDate();
      const dayLabel = i === 0 ? 'আজ' : i === 1 ? 'আগামীকাল' : d.toLocaleDateString('bn-BD', { weekday: 'short' });
      days.push({ dateStr, dayNum, dayLabel });
    }
    return days;
  };

  const upcomingDays = getUpcomingDays();

  // Calculate day total
  const memberMealTotal = (breakfast ? 0.5 : 0) + (lunch ? 1.0 : 0) + (dinner ? 1.0 : 0);
  const totalGuestMeal = guestBreakfast + guestLunch + guestDinner;
  const dayGrandTotal = memberMealTotal + totalGuestMeal;

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden space-y-6">
      {/* 1. Header Banner */}
      <div className="p-6 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <span className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30">
              <Utensils className="w-5 h-5" />
            </span>
            <h3 className="text-lg sm:text-xl font-extrabold tracking-tight">
              আমার মিল বুকিং ও শিডিউল (Meal Booking Slip)
            </h3>
          </div>
          <p className="text-xs text-slate-300">
            আগাম জানিয়ে দিন আপনি কোন বেলায় খাবেন। রান্নার বাজার ও প্রস্তুতির আগে পরিবর্তনযোগ্য।
          </p>
        </div>

        {/* Selected Date Indicator & Picker */}
        <div className="flex items-center space-x-2 self-start md:self-auto bg-white/10 backdrop-blur-md p-1.5 rounded-2xl border border-white/15">
          <CalendarIcon className="w-4 h-4 text-emerald-300 ml-2" />
          <input
            type="date"
            value={targetDate}
            onChange={(e) => setTargetDate(e.target.value)}
            className="bg-transparent text-white font-bold text-xs px-2 py-1 focus:outline-none cursor-pointer"
          />
        </div>
      </div>

      <div className="px-5 sm:px-8 pb-8 space-y-6">
        {/* 2. 7-Day Quick Horizontal Calendar Strip */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-700 flex items-center gap-1.5">
              <CalendarIcon className="w-4 h-4 text-emerald-600" />
              <span>তারিখ নির্বাচন করুন (৭ দিনের কুইক স্ট্রিপ):</span>
            </span>
            <span className="text-slate-400 font-medium">ক্লিক করে যেকোনো দিনের মিল পরিবর্তন করুন</span>
          </div>

          <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
            {upcomingDays.map((d) => {
              const isSelected = d.dateStr === targetDate;
              return (
                <button
                  key={d.dateStr}
                  type="button"
                  onClick={() => setTargetDate(d.dateStr)}
                  className={`p-2.5 sm:p-3 rounded-2xl border text-center transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-600/20 scale-[1.02]'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                  }`}
                >
                  <span
                    className={`text-[10px] font-extrabold block uppercase tracking-wider ${
                      isSelected ? 'text-emerald-100' : 'text-slate-500'
                    }`}
                  >
                    {d.dayLabel}
                  </span>
                  <span className={`text-base sm:text-lg font-black block mt-0.5 ${isSelected ? 'text-white' : 'text-slate-800'}`}>
                    {d.dayNum}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 3. Date & Lock Status Banner */}
        <div className="bg-slate-50 rounded-2xl border border-slate-200 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-0.5">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">নির্বাচিত তারিখ</span>
            <h4 className="text-base sm:text-lg font-black text-slate-900">{formatBengaliDate(targetDate)}</h4>
          </div>

          <div>
            {loading ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-200 text-slate-600 rounded-xl text-xs font-bold">
                <Clock className="w-3.5 h-3.5 animate-spin" />
                <span>লোড হচ্ছে...</span>
              </span>
            ) : isMonthClosed ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-100 text-red-800 border border-red-200 rounded-xl text-xs font-bold">
                <Lock className="w-3.5 h-3.5 text-red-600" />
                <span>🔒 মাস সমাপ্ত (CLOSED)</span>
              </span>
            ) : breakfastLocked && lunchLocked && dinnerLocked ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-100 text-amber-900 border border-amber-300 rounded-xl text-xs font-bold">
                <Lock className="w-3.5 h-3.5 text-amber-600" />
                <span>🔒 সব বেলা রান্নার জন্য লকড</span>
              </span>
            ) : breakfastLocked || lunchLocked || dinnerLocked ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 text-amber-800 border border-amber-200 rounded-xl text-xs font-bold">
                <Lock className="w-3.5 h-3.5 text-amber-600" />
                <span>⚠️ নির্দিষ্ট বেলা লকড (বাকি বেলা উন্মুক্ত)</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-100 text-emerald-900 border border-emerald-200 rounded-xl text-xs font-bold">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                <span>🟢 মিল উন্মুক্ত — পরিবর্তনযোগ্য</span>
              </span>
            )}
          </div>
        </div>

        {/* Feedback Alert Messages */}
        {message && (
          <div
            className={`p-4 rounded-2xl text-xs font-bold flex items-center space-x-2 ${
              message.type === 'success'
                ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                : 'bg-red-50 border border-red-200 text-red-800'
            }`}
          >
            {message.type === 'success' ? (
              <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
            )}
            <span>{message.text}</span>
          </div>
        )}

        {isInherited && (
          <div className="p-3.5 bg-blue-50 border border-blue-200 text-blue-900 rounded-2xl text-xs flex items-center space-x-2.5 font-medium shadow-sm">
            <Info className="w-4 h-4 text-blue-600 flex-shrink-0" />
            <span>পূর্বের দিনের মিল পছন্দ স্বয়ংক্রিয়ভাবে বহাল রয়েছে। প্রয়োজনে নিচে পরিবর্তন করে সেভ করুন।</span>
          </div>
        )}

        {/* 4. 1-Click Quick Preset Buttons */}
        {!isMonthClosed && !(breakfastLocked && lunchLocked && dinnerLocked) && (
          <div className="space-y-1.5">
            <span className="text-xs font-bold text-slate-600">১-ক্লিক কুইক অ্যাকশন:</span>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handlePresetAllOn}
                className="px-3.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <span>⚡ সব বেলা চালু (All ON)</span>
              </button>
              <button
                type="button"
                onClick={handlePresetLunchDinner}
                className="px-3.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <span>🍛 শুধু দুপুর ও রাত (Lunch & Dinner)</span>
              </button>
              <button
                type="button"
                onClick={handlePresetAllOff}
                className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <span>🛑 সব বেলা বন্ধ (All OFF)</span>
              </button>
            </div>
          </div>
        )}

        {/* 5. Booking Form */}
        <form onSubmit={handleSave} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
            {/* Breakfast Card */}
            <div
              className={`p-5 rounded-3xl border-2 transition-all flex flex-col justify-between space-y-4 ${
                breakfast
                  ? 'bg-gradient-to-br from-amber-50/70 to-amber-50/30 border-amber-300 shadow-sm'
                  : 'bg-slate-50 border-slate-200'
              } ${breakfastLocked || isMonthClosed ? 'opacity-80 bg-slate-100/90 border-slate-300' : ''}`}
            >
              {/* Member meal toggle */}
              <div
                onClick={() => !breakfastLocked && !isMonthClosed && setBreakfast(!breakfast)}
                className={`flex items-start justify-between cursor-pointer select-none pb-3 border-b border-slate-200/80 ${
                  breakfastLocked || isMonthClosed ? 'cursor-not-allowed' : 'hover:opacity-90'
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="p-2 bg-amber-100 text-amber-800 rounded-xl text-base">
                      <Coffee className="w-5 h-5" />
                    </span>
                    <div>
                      <h4 className="font-extrabold text-slate-900 text-base">সকালের নাস্তা</h4>
                      <span className="text-[11px] font-semibold text-slate-500 block">০.৫ মিল ইউনিট</span>
                    </div>
                  </div>
                  <div className="pt-1">
                    {breakfastLocked ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-md">
                        <Lock className="w-3 h-3" /> লকড (লক করেছেন {lockedBy || 'ম্যানেজার'})
                      </span>
                    ) : (
                      <span
                        className={`inline-block text-[11px] font-extrabold px-2 py-0.5 rounded-md ${
                          breakfast ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                        }`}
                      >
                        {breakfast ? '✓ মিল চালু (ON)' : '✕ মিল বন্ধ (OFF)'}
                      </span>
                    )}
                  </div>
                </div>

                {/* Switch Graphic */}
                <div
                  className={`w-12 h-7 flex items-center rounded-full p-1 transition-colors ${
                    breakfast ? 'bg-emerald-600 justify-end' : 'bg-slate-300 justify-start'
                  }`}
                >
                  <div className="w-5 h-5 bg-white rounded-full shadow-md"></div>
                </div>
              </div>

              {/* Breakfast Guest Counter */}
              <div className="pt-2 flex items-center justify-between bg-white/70 p-3 rounded-2xl border border-slate-200/80">
                <div>
                  <span className="text-xs font-bold text-slate-800 block">সকালে মেহমান মিল</span>
                  <span className="text-[11px] text-slate-500">গেস্ট নাস্তা সংখ্যা</span>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    disabled={guestBreakfast <= 0 || breakfastLocked || isMonthClosed}
                    onClick={() => {
                      const nextVal = Math.max(0, guestBreakfast - 1);
                      setGuestBreakfast(nextVal);
                      setGuestCount(nextVal + guestLunch + guestDinner);
                    }}
                    className="w-8 h-8 flex items-center justify-center rounded-xl bg-white border border-slate-300 hover:bg-slate-100 disabled:opacity-40 transition-colors shadow-sm cursor-pointer"
                  >
                    <Minus className="w-4 h-4 text-slate-700" />
                  </button>
                  <span className="font-mono font-black text-base text-slate-900 w-6 text-center">
                    {guestBreakfast}
                  </span>
                  <button
                    type="button"
                    disabled={guestBreakfast >= 20 || breakfastLocked || isMonthClosed}
                    onClick={() => {
                      const nextVal = guestBreakfast + 1;
                      setGuestBreakfast(nextVal);
                      setGuestCount(nextVal + guestLunch + guestDinner);
                    }}
                    className="w-8 h-8 flex items-center justify-center rounded-xl bg-white border border-slate-300 hover:bg-slate-100 disabled:opacity-40 transition-colors shadow-sm cursor-pointer"
                  >
                    <Plus className="w-4 h-4 text-slate-700" />
                  </button>
                </div>
              </div>
            </div>

            {/* Lunch Card */}
            <div
              className={`p-5 rounded-3xl border-2 transition-all flex flex-col justify-between space-y-4 ${
                lunch
                  ? 'bg-gradient-to-br from-orange-50/70 to-orange-50/30 border-orange-300 shadow-sm'
                  : 'bg-slate-50 border-slate-200'
              } ${lunchLocked || isMonthClosed ? 'opacity-80 bg-slate-100/90 border-slate-300' : ''}`}
            >
              {/* Member meal toggle */}
              <div
                onClick={() => !lunchLocked && !isMonthClosed && setLunch(!lunch)}
                className={`flex items-start justify-between cursor-pointer select-none pb-3 border-b border-slate-200/80 ${
                  lunchLocked || isMonthClosed ? 'cursor-not-allowed' : 'hover:opacity-90'
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="p-2 bg-orange-100 text-orange-800 rounded-xl text-base">
                      <Sun className="w-5 h-5" />
                    </span>
                    <div>
                      <h4 className="font-extrabold text-slate-900 text-base">দুপুরের খাবার</h4>
                      <span className="text-[11px] font-semibold text-slate-500 block">১.০ মিল ইউনিট</span>
                    </div>
                  </div>
                  <div className="pt-1">
                    {lunchLocked ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-md">
                        <Lock className="w-3 h-3" /> লকড (লক করেছেন {lockedBy || 'ম্যানেজার'})
                      </span>
                    ) : (
                      <span
                        className={`inline-block text-[11px] font-extrabold px-2 py-0.5 rounded-md ${
                          lunch ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                        }`}
                      >
                        {lunch ? '✓ মিল চালু (ON)' : '✕ মিল বন্ধ (OFF)'}
                      </span>
                    )}
                  </div>
                </div>

                {/* Switch Graphic */}
                <div
                  className={`w-12 h-7 flex items-center rounded-full p-1 transition-colors ${
                    lunch ? 'bg-emerald-600 justify-end' : 'bg-slate-300 justify-start'
                  }`}
                >
                  <div className="w-5 h-5 bg-white rounded-full shadow-md"></div>
                </div>
              </div>

              {/* Lunch Guest Counter */}
              <div className="pt-2 flex items-center justify-between bg-white/70 p-3 rounded-2xl border border-slate-200/80">
                <div>
                  <span className="text-xs font-bold text-slate-800 block">দুপুরে মেহমান মিল</span>
                  <span className="text-[11px] text-slate-500">গেস্ট লাঞ্চ সংখ্যা</span>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    disabled={guestLunch <= 0 || lunchLocked || isMonthClosed}
                    onClick={() => {
                      const nextVal = Math.max(0, guestLunch - 1);
                      setGuestLunch(nextVal);
                      setGuestCount(guestBreakfast + nextVal + guestDinner);
                    }}
                    className="w-8 h-8 flex items-center justify-center rounded-xl bg-white border border-slate-300 hover:bg-slate-100 disabled:opacity-40 transition-colors shadow-sm cursor-pointer"
                  >
                    <Minus className="w-4 h-4 text-slate-700" />
                  </button>
                  <span className="font-mono font-black text-base text-slate-900 w-6 text-center">
                    {guestLunch}
                  </span>
                  <button
                    type="button"
                    disabled={guestLunch >= 20 || lunchLocked || isMonthClosed}
                    onClick={() => {
                      const nextVal = guestLunch + 1;
                      setGuestLunch(nextVal);
                      setGuestCount(guestBreakfast + nextVal + guestDinner);
                    }}
                    className="w-8 h-8 flex items-center justify-center rounded-xl bg-white border border-slate-300 hover:bg-slate-100 disabled:opacity-40 transition-colors shadow-sm cursor-pointer"
                  >
                    <Plus className="w-4 h-4 text-slate-700" />
                  </button>
                </div>
              </div>
            </div>

            {/* Dinner Card */}
            <div
              className={`p-5 rounded-3xl border-2 transition-all flex flex-col justify-between space-y-4 ${
                dinner
                  ? 'bg-gradient-to-br from-indigo-50/70 to-indigo-50/30 border-indigo-300 shadow-sm'
                  : 'bg-slate-50 border-slate-200'
              } ${dinnerLocked || isMonthClosed ? 'opacity-80 bg-slate-100/90 border-slate-300' : ''}`}
            >
              {/* Member meal toggle */}
              <div
                onClick={() => !dinnerLocked && !isMonthClosed && setDinner(!dinner)}
                className={`flex items-start justify-between cursor-pointer select-none pb-3 border-b border-slate-200/80 ${
                  dinnerLocked || isMonthClosed ? 'cursor-not-allowed' : 'hover:opacity-90'
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="p-2 bg-indigo-100 text-indigo-800 rounded-xl text-base">
                      <Moon className="w-5 h-5" />
                    </span>
                    <div>
                      <h4 className="font-extrabold text-slate-900 text-base">রাতের খাবার</h4>
                      <span className="text-[11px] font-semibold text-slate-500 block">১.০ মিল ইউনিট</span>
                    </div>
                  </div>
                  <div className="pt-1">
                    {dinnerLocked ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-md">
                        <Lock className="w-3 h-3" /> লকড (লক করেছেন {lockedBy || 'ম্যানেজার'})
                      </span>
                    ) : (
                      <span
                        className={`inline-block text-[11px] font-extrabold px-2 py-0.5 rounded-md ${
                          dinner ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                        }`}
                      >
                        {dinner ? '✓ মিল চালু (ON)' : '✕ মিল বন্ধ (OFF)'}
                      </span>
                    )}
                  </div>
                </div>

                {/* Switch Graphic */}
                <div
                  className={`w-12 h-7 flex items-center rounded-full p-1 transition-colors ${
                    dinner ? 'bg-emerald-600 justify-end' : 'bg-slate-300 justify-start'
                  }`}
                >
                  <div className="w-5 h-5 bg-white rounded-full shadow-md"></div>
                </div>
              </div>

              {/* Dinner Guest Counter */}
              <div className="pt-2 flex items-center justify-between bg-white/70 p-3 rounded-2xl border border-slate-200/80">
                <div>
                  <span className="text-xs font-bold text-slate-800 block">রাতে মেহমান মিল</span>
                  <span className="text-[11px] text-slate-500">গেস্ট ডিনার সংখ্যা</span>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    disabled={guestDinner <= 0 || dinnerLocked || isMonthClosed}
                    onClick={() => {
                      const nextVal = Math.max(0, guestDinner - 1);
                      setGuestDinner(nextVal);
                      setGuestCount(guestBreakfast + guestLunch + nextVal);
                    }}
                    className="w-8 h-8 flex items-center justify-center rounded-xl bg-white border border-slate-300 hover:bg-slate-100 disabled:opacity-40 transition-colors shadow-sm cursor-pointer"
                  >
                    <Minus className="w-4 h-4 text-slate-700" />
                  </button>
                  <span className="font-mono font-black text-base text-slate-900 w-6 text-center">
                    {guestDinner}
                  </span>
                  <button
                    type="button"
                    disabled={guestDinner >= 20 || dinnerLocked || isMonthClosed}
                    onClick={() => {
                      const nextVal = guestDinner + 1;
                      setGuestDinner(nextVal);
                      setGuestCount(guestBreakfast + guestLunch + nextVal);
                    }}
                    className="w-8 h-8 flex items-center justify-center rounded-xl bg-white border border-slate-300 hover:bg-slate-100 disabled:opacity-40 transition-colors shadow-sm cursor-pointer"
                  >
                    <Plus className="w-4 h-4 text-slate-700" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* 6. Real-Time Daily Meal Calculation Ribbon */}
          <div className="p-4 bg-gradient-to-r from-emerald-50 via-teal-50 to-blue-50 rounded-2xl border border-emerald-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="flex items-center space-x-3">
              <span className="p-2.5 bg-emerald-600 text-white rounded-xl shadow-sm">
                <UserCheck className="w-5 h-5" />
              </span>
              <div>
                <span className="font-extrabold text-slate-900 text-sm block">
                  এই দিনের মোট মিল: <span className="text-emerald-700 font-mono text-base">{dayGrandTotal} টি</span>
                </span>
                <span className="text-slate-600 font-medium">
                  আপনার নিজস্ব মিল: {memberMealTotal} টি • মোট মেহমান মিল: {totalGuestMeal} টি
                  (সকালে {guestBreakfast} | দুপুরে {guestLunch} | রাতে {guestDinner})
                </span>
              </div>
            </div>

            {totalGuestMeal > 0 && (
              <span className="px-3 py-1 bg-emerald-600 text-white font-extrabold rounded-full text-xs shadow-sm self-start sm:self-auto">
                +{totalGuestMeal} টি গেস্ট মিল যুক্ত
              </span>
            )}
          </div>

          {/* 7. Special Note to Manager with Clickable Quick Chips */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              ম্যানেজার ও বাবুর্চির জন্য বার্তা / নোট (ঐচ্ছিক):
            </label>
            <input
              type="text"
              disabled={(breakfastLocked && lunchLocked && dinnerLocked) || isMonthClosed}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="যেমন: দুপুরের খাবার বেলা ২টায় খাব, খাবার বক্সে তুলে রাখবেন..."
              className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs sm:text-sm font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 disabled:opacity-60"
            />

            {/* Quick Chips */}
            {!isMonthClosed && !(breakfastLocked && lunchLocked && dinnerLocked) && (
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-[11px] font-bold text-slate-500">কুইক ট্যাগস:</span>
                {quickNoteChips.map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => handleAddNoteChip(chip)}
                    className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer border border-slate-200"
                  >
                    + {chip}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 8. Save Button */}
          <div className="flex items-center justify-end pt-2">
            <button
              type="submit"
              disabled={saving || (breakfastLocked && lunchLocked && dinnerLocked) || isMonthClosed}
              className="w-full sm:w-auto px-8 py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm rounded-2xl shadow-lg shadow-emerald-600/25 transition-all disabled:opacity-50 flex items-center justify-center space-x-2 cursor-pointer"
            >
              {isMonthClosed ? (
                <>
                  <Lock className="w-4 h-4" />
                  <span>মাসটি সমাপ্ত (CLOSED)</span>
                </>
              ) : breakfastLocked && lunchLocked && dinnerLocked ? (
                <>
                  <Lock className="w-4 h-4" />
                  <span>সব বেলা লক করা আছে</span>
                </>
              ) : saving ? (
                <span>সংরক্ষণ হচ্ছে...</span>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  <span>মিল বুকিং সংরক্ষণ করুন (Save Meal Schedule)</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
