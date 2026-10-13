'use client';

import React, { useState, useEffect } from 'react';
import { Utensils, Lock, CheckCircle, AlertCircle, Calendar, Plus, Minus, UserCheck, Clock } from 'lucide-react';

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
          const totalG = (currentReq.guestBreakfast !== undefined || currentReq.guestLunch !== undefined || currentReq.guestDinner !== undefined)
            ? (gb + gl + gd)
            : (Number(currentReq.guestCount) || 0);

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

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="p-6 bg-gradient-to-r from-slate-900 to-slate-800 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <span className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl">
              <Utensils className="w-5 h-5" />
            </span>
            <h3 className="text-lg font-bold">আমার মিল বুকিং ও শিডিউল (Meal Declaration)</h3>
          </div>
          <p className="text-xs text-slate-300">
            আগাম জানিয়ে দিন আপনি কোন বেলায় খাবেন। ম্যানেজার রান্নার হিসাব চূড়ান্ত করার আগ পর্যন্ত পরিবর্তন করা যাবে।
          </p>
        </div>

        {/* Quick Date Switcher */}
        <div className="flex items-center space-x-2 bg-slate-800/80 p-1.5 rounded-2xl border border-slate-700">
          <button
            type="button"
            onClick={() => setTargetDate(today)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              targetDate === today
                ? 'bg-emerald-500 text-slate-950 shadow'
                : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
            }`}
          >
            আজ (Today)
          </button>
          <button
            type="button"
            onClick={() => setTargetDate(tomorrow)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              targetDate === tomorrow
                ? 'bg-emerald-500 text-slate-950 shadow'
                : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
            }`}
          >
            আগামীকাল (Tomorrow)
          </button>
          <input
            type="date"
            value={targetDate}
            onChange={(e) => setTargetDate(e.target.value)}
            className="bg-slate-900 text-white text-xs px-2.5 py-1.5 rounded-xl border border-slate-700 focus:outline-none focus:border-emerald-400 cursor-pointer"
          />
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Status Alert Banner */}
        {loading ? (
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-500 flex items-center space-x-2">
            <Clock className="w-4 h-4 animate-spin text-slate-400" />
            <span>মিল স্ট্যাটাস লোড হচ্ছে...</span>
          </div>
        ) : isMonthClosed ? (
          <div className="p-4 bg-red-50 border border-red-200 text-red-800 rounded-2xl text-xs font-bold flex items-center space-x-3">
            <Lock className="w-5 h-5 text-red-600 flex-shrink-0" />
            <div>
              <p className="font-extrabold text-sm">মাসটি বন্ধ (CLOSED)</p>
              <p className="text-red-700 font-normal mt-0.5">
                এই মাসটি সমাপ্ত হয়েছে। কোনো মিলের এন্ট্রি বা বুকিং পরিবর্তন সম্ভব নয়।
              </p>
            </div>
          </div>
        ) : (breakfastLocked && lunchLocked && dinnerLocked) ? (
          <div className="p-4 bg-amber-50 border border-amber-300 text-amber-900 rounded-2xl text-xs font-bold flex items-center space-x-3 shadow-sm">
            <div className="p-2 bg-amber-200 text-amber-900 rounded-xl flex-shrink-0">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <p className="font-extrabold text-sm text-amber-950 flex items-center gap-1.5">
                <span>🔒 ম্যানেজার রান্নার জন্য সব বেলার মিল লক করেছেন</span>
              </p>
              <p className="text-amber-800 font-normal mt-0.5">
                {targetDate} তারিখের সব বেলার রান্নার হিসাব চূড়ান্ত হয়েছে {lockedBy ? `(${lockedBy} লক করেছেন)` : ''}। কোনো বেলার মিল আর পরিবর্তন করা যাবে না।
              </p>
            </div>
          </div>
        ) : (breakfastLocked || lunchLocked || dinnerLocked) ? (
          <div className="p-4 bg-amber-50 border border-amber-300 text-amber-900 rounded-2xl text-xs font-bold flex items-center space-x-3 shadow-sm">
            <div className="p-2 bg-amber-200 text-amber-900 rounded-xl flex-shrink-0">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <p className="font-extrabold text-sm text-amber-950 flex items-center gap-1.5">
                <span>⚠️ নির্দিষ্ট বেলার মিল লক করা হয়েছে</span>
              </p>
              <p className="text-amber-800 font-normal mt-0.5">
                {[
                  breakfastLocked ? '🍳 সকাল' : null,
                  lunchLocked ? '🍛 দুপুর' : null,
                  dinnerLocked ? '🍲 রাত' : null,
                ]
                  .filter(Boolean)
                  .join(' ও ')} রান্নার জন্য লক করা হয়েছে। বাকি বেলার মিল আপনি পরিবর্তন করে নিচে সেভ করতে পারবেন।
              </p>
            </div>
          </div>
        ) : (
          <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-2xl text-xs font-bold flex items-center space-x-3">
            <div className="p-2 bg-emerald-100 text-emerald-800 rounded-xl flex-shrink-0">
              <CheckCircle className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="font-extrabold text-sm text-emerald-950">
                🟢 মিল উন্মুক্ত (Open) - {targetDate}
              </p>
              <p className="text-emerald-700 font-normal mt-0.5">
                ম্যানেজার এখনও রান্নার হিসাব লক করেননি। আপনি আপনার পছন্দমতো যেকোনো বেলার মিল অন/অফ করতে পারবেন।
              </p>
            </div>
          </div>
        )}

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
            <Clock className="w-4 h-4 text-blue-600 flex-shrink-0" />
            <span>পূর্বের দিনের মিল ও গেস্ট সংখ্যা স্বয়ংক্রিয়ভাবে বহাল রয়েছে। পরিবর্তন করতে চাইলে নিচে এডিট করে সেভ করুন।</span>
          </div>
        )}

        {/* Booking Form */}
        <form onSubmit={handleSave} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Breakfast Card */}
            <div
              className={`p-4 rounded-2xl border-2 transition-all flex flex-col justify-between ${
                breakfast
                  ? 'bg-emerald-50/70 border-emerald-500 shadow-sm'
                  : 'bg-slate-50 border-slate-200'
              } ${breakfastLocked || isMonthClosed ? 'opacity-75 bg-slate-100/90 border-slate-300' : ''}`}
            >
              {/* Member meal toggle */}
              <div
                onClick={() => !breakfastLocked && !isMonthClosed && setBreakfast(!breakfast)}
                className={`flex items-center justify-between cursor-pointer select-none pb-3 border-b border-slate-200/80 ${
                  breakfastLocked || isMonthClosed ? 'cursor-not-allowed' : 'hover:opacity-90'
                }`}
              >
                <div className="space-y-0.5">
                  <div className="flex items-center space-x-2">
                    <span className="text-2xl">🍳</span>
                    <h4 className="font-bold text-slate-900 text-sm">সকালের নাস্তা</h4>
                    {breakfastLocked && (
                      <span className="text-[10px] bg-amber-100 text-amber-900 border border-amber-300 font-bold px-1.5 py-0.5 rounded-md flex items-center gap-0.5">
                        <Lock className="w-2.5 h-2.5" /> লকড
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500">আমার মিল: {breakfast ? 'চালু (ON)' : 'বন্ধ (OFF)'}</p>
                </div>
                <div
                  className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
                    breakfast ? 'bg-emerald-600 justify-end' : 'bg-slate-300 justify-start'
                  }`}
                >
                  <div className="w-4 h-4 bg-white rounded-full shadow-md"></div>
                </div>
              </div>

              {/* Breakfast Guest Counter */}
              <div className="pt-3 flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-slate-700 block">সকালে মেহমান (Guest)</span>
                  <span className="text-[11px] text-slate-400">মেহমান মিল সংখ্যা</span>
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
                    className="w-7 h-7 flex items-center justify-center rounded-lg bg-white border border-slate-300 hover:bg-slate-100 disabled:opacity-40 transition-colors shadow-sm"
                  >
                    <Minus className="w-3.5 h-3.5 text-slate-700" />
                  </button>
                  <span className="font-bold text-sm text-slate-900 w-6 text-center">{guestBreakfast}</span>
                  <button
                    type="button"
                    disabled={guestBreakfast >= 20 || breakfastLocked || isMonthClosed}
                    onClick={() => {
                      const nextVal = guestBreakfast + 1;
                      setGuestBreakfast(nextVal);
                      setGuestCount(nextVal + guestLunch + guestDinner);
                    }}
                    className="w-7 h-7 flex items-center justify-center rounded-lg bg-white border border-slate-300 hover:bg-slate-100 disabled:opacity-40 transition-colors shadow-sm"
                  >
                    <Plus className="w-3.5 h-3.5 text-slate-700" />
                  </button>
                </div>
              </div>
            </div>

            {/* Lunch Card */}
            <div
              className={`p-4 rounded-2xl border-2 transition-all flex flex-col justify-between ${
                lunch
                  ? 'bg-emerald-50/70 border-emerald-500 shadow-sm'
                  : 'bg-slate-50 border-slate-200'
              } ${lunchLocked || isMonthClosed ? 'opacity-75 bg-slate-100/90 border-slate-300' : ''}`}
            >
              {/* Member meal toggle */}
              <div
                onClick={() => !lunchLocked && !isMonthClosed && setLunch(!lunch)}
                className={`flex items-center justify-between cursor-pointer select-none pb-3 border-b border-slate-200/80 ${
                  lunchLocked || isMonthClosed ? 'cursor-not-allowed' : 'hover:opacity-90'
                }`}
              >
                <div className="space-y-0.5">
                  <div className="flex items-center space-x-2">
                    <span className="text-2xl">🍛</span>
                    <h4 className="font-bold text-slate-900 text-sm">দুপুরের খাবার</h4>
                    {lunchLocked && (
                      <span className="text-[10px] bg-amber-100 text-amber-900 border border-amber-300 font-bold px-1.5 py-0.5 rounded-md flex items-center gap-0.5">
                        <Lock className="w-2.5 h-2.5" /> লকড
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500">আমার মিল: {lunch ? 'চালু (ON)' : 'বন্ধ (OFF)'}</p>
                </div>
                <div
                  className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
                    lunch ? 'bg-emerald-600 justify-end' : 'bg-slate-300 justify-start'
                  }`}
                >
                  <div className="w-4 h-4 bg-white rounded-full shadow-md"></div>
                </div>
              </div>

              {/* Lunch Guest Counter */}
              <div className="pt-3 flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-slate-700 block">দুপুরে মেহমান (Guest)</span>
                  <span className="text-[11px] text-slate-400">মেহমান মিল সংখ্যা</span>
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
                    className="w-7 h-7 flex items-center justify-center rounded-lg bg-white border border-slate-300 hover:bg-slate-100 disabled:opacity-40 transition-colors shadow-sm"
                  >
                    <Minus className="w-3.5 h-3.5 text-slate-700" />
                  </button>
                  <span className="font-bold text-sm text-slate-900 w-6 text-center">{guestLunch}</span>
                  <button
                    type="button"
                    disabled={guestLunch >= 20 || lunchLocked || isMonthClosed}
                    onClick={() => {
                      const nextVal = guestLunch + 1;
                      setGuestLunch(nextVal);
                      setGuestCount(guestBreakfast + nextVal + guestDinner);
                    }}
                    className="w-7 h-7 flex items-center justify-center rounded-lg bg-white border border-slate-300 hover:bg-slate-100 disabled:opacity-40 transition-colors shadow-sm"
                  >
                    <Plus className="w-3.5 h-3.5 text-slate-700" />
                  </button>
                </div>
              </div>
            </div>

            {/* Dinner Card */}
            <div
              className={`p-4 rounded-2xl border-2 transition-all flex flex-col justify-between ${
                dinner
                  ? 'bg-emerald-50/70 border-emerald-500 shadow-sm'
                  : 'bg-slate-50 border-slate-200'
              } ${dinnerLocked || isMonthClosed ? 'opacity-75 bg-slate-100/90 border-slate-300' : ''}`}
            >
              {/* Member meal toggle */}
              <div
                onClick={() => !dinnerLocked && !isMonthClosed && setDinner(!dinner)}
                className={`flex items-center justify-between cursor-pointer select-none pb-3 border-b border-slate-200/80 ${
                  dinnerLocked || isMonthClosed ? 'cursor-not-allowed' : 'hover:opacity-90'
                }`}
              >
                <div className="space-y-0.5">
                  <div className="flex items-center space-x-2">
                    <span className="text-2xl">🍲</span>
                    <h4 className="font-bold text-slate-900 text-sm">রাতের খাবার</h4>
                    {dinnerLocked && (
                      <span className="text-[10px] bg-amber-100 text-amber-900 border border-amber-300 font-bold px-1.5 py-0.5 rounded-md flex items-center gap-0.5">
                        <Lock className="w-2.5 h-2.5" /> লকড
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500">আমার মিল: {dinner ? 'চালু (ON)' : 'বন্ধ (OFF)'}</p>
                </div>
                <div
                  className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
                    dinner ? 'bg-emerald-600 justify-end' : 'bg-slate-300 justify-start'
                  }`}
                >
                  <div className="w-4 h-4 bg-white rounded-full shadow-md"></div>
                </div>
              </div>

              {/* Dinner Guest Counter */}
              <div className="pt-3 flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-slate-700 block">রাতে মেহমান (Guest)</span>
                  <span className="text-[11px] text-slate-400">মেহমান মিল সংখ্যা</span>
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
                    className="w-7 h-7 flex items-center justify-center rounded-lg bg-white border border-slate-300 hover:bg-slate-100 disabled:opacity-40 transition-colors shadow-sm"
                  >
                    <Minus className="w-3.5 h-3.5 text-slate-700" />
                  </button>
                  <span className="font-bold text-sm text-slate-900 w-6 text-center">{guestDinner}</span>
                  <button
                    type="button"
                    disabled={guestDinner >= 20 || dinnerLocked || isMonthClosed}
                    onClick={() => {
                      const nextVal = guestDinner + 1;
                      setGuestDinner(nextVal);
                      setGuestCount(guestBreakfast + guestLunch + nextVal);
                    }}
                    className="w-7 h-7 flex items-center justify-center rounded-lg bg-white border border-slate-300 hover:bg-slate-100 disabled:opacity-40 transition-colors shadow-sm"
                  >
                    <Plus className="w-3.5 h-3.5 text-slate-700" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Guest Meals Summary Bar */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="flex items-center space-x-2.5">
              <div className="p-2 bg-emerald-100 text-emerald-700 rounded-xl">
                <UserCheck className="w-4 h-4" />
              </div>
              <div>
                <span className="font-bold text-slate-800">মোট মেহমান মিল (Guest Meals):</span>{' '}
                <span className="font-extrabold text-emerald-600 text-sm">
                  {guestBreakfast + guestLunch + guestDinner} টি
                </span>
                <span className="text-slate-500 ml-2">
                  (সকালে {guestBreakfast} | দুপুরে {guestLunch} | রাতে {guestDinner})
                </span>
              </div>
            </div>
            {(guestBreakfast > 0 || guestLunch > 0 || guestDinner > 0) && (
              <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 font-semibold rounded-full border border-emerald-200">
                গেস্ট মিল প্রযোজ্য
              </span>
            )}
          </div>

          {/* Optional Note */}
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
              ম্যানেজারের জন্য বিশেষ বার্তা / নোট (ঐচ্ছিক)
            </label>
            <input
              type="text"
              disabled={(breakfastLocked && lunchLocked && dinnerLocked) || isMonthClosed}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="যেমন: দুপুরের খাবার বেলা ২টায় খাব, ১টি গেস্ট মিল থাকবে..."
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-500 disabled:opacity-60"
            />
          </div>

          {/* Submit Action */}
          <div className="flex items-center justify-end space-x-3 pt-2">
            <button
              type="submit"
              disabled={saving || (breakfastLocked && lunchLocked && dinnerLocked) || isMonthClosed}
              className="px-8 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md transition-all disabled:opacity-50 flex items-center space-x-2"
            >
              {isMonthClosed ? (
                <>
                  <Lock className="w-4 h-4" />
                  <span>মাসটি সমাপ্ত (CLOSED)</span>
                </>
              ) : (breakfastLocked && lunchLocked && dinnerLocked) ? (
                <>
                  <Lock className="w-4 h-4" />
                  <span>সব বেলা লক করা আছে</span>
                </>
              ) : saving ? (
                <span>সংরক্ষণ হচ্ছে...</span>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  <span>মিল পছন্দ সংরক্ষণ করুন (Save Preference)</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
