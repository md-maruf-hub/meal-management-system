'use client';

import React, { useState, useEffect } from 'react';
import { MonthlyReport, MemberCalculation, MealEntry, AuditLog, BazarEntry, ExpenseItem, Deposit } from '../../../lib/types';
import { useDashboard } from '../../../lib/DashboardContext';
import DataLoader from '../../../components/ui/DataLoader';
import {
  Utensils,
  Receipt,
  DollarSign,
  ArrowUpRight,
  ArrowDownLeft,
  ShieldAlert,
  Calendar as CalendarIcon,
  FileText,
  History,
  ShoppingBag,
  Clock,
  Wallet,
  Lock,
  Search,
  CheckCircle,
} from 'lucide-react';
import MealBookingWidget from '../../../components/member/MealBookingWidget';

export default function MemberDashboard() {
  const { user, selectedMonth, setSelectedMonth } = useDashboard();
  const [report, setReport] = useState<MonthlyReport | null>(null);
  const [meals, setMeals] = useState<MealEntry[]>([]);
  const [activities, setActivities] = useState<AuditLog[]>([]);
  const [bazarList, setBazarList] = useState<BazarEntry[]>([]);
  const [utilityList, setUtilityList] = useState<ExpenseItem[]>([]);
  const [myDeposits, setMyDeposits] = useState<Deposit[]>([]);
  const [loading, setLoading] = useState(true);
  const [activitySubTab, setActivitySubTab] = useState<'FEED' | 'BAZAR' | 'UTILITY' | 'MY_DEPOSITS'>('MY_DEPOSITS');
  const [activeTab, setActiveTab] = useState<'BOOKING' | 'MATRIX' | 'FINANCIAL_ACTIVITY'>('BOOKING');

  useEffect(() => {
    fetchData();
  }, [selectedMonth]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [repRes, mealRes, actRes] = await Promise.all([
        fetch(`/api/reports?yearMonth=${selectedMonth}`).then((r) => r.json()),
        fetch(`/api/meals?yearMonth=${selectedMonth}`).then((r) => r.json()),
        fetch(`/api/member/activity?yearMonth=${selectedMonth}`).then((r) => r.json()),
      ]);

      setReport(repRes.report || null);
      setMeals(mealRes.meals || []);
      setActivities(actRes.activities || []);
      setBazarList(actRes.bazarEntries || []);
      setUtilityList(actRes.utilities || []);
      setMyDeposits(actRes.myDeposits || []);
      setLoading(false);
    } catch (err) {
      setLoading(false);
    }
  };

  const memberData: MemberCalculation | undefined = report?.memberCalculations.find(
    (m) => m.memberId === user?.id || m.memberName.toLowerCase() === user?.name.toLowerCase()
  );

  // Map member daily meals for day 1..31
  const memberMealMap: Record<number, number> = {};
  if (user) {
    meals
      .filter((m) => m.memberId === user.id)
      .forEach((m) => {
        memberMealMap[m.day] = m.mealCount;
      });
  }

  const rawDue = memberData ? (memberData.dueAmount ?? memberData.giveBalance ?? 0) : 0;
  const rawRefund = memberData ? (memberData.refundAmount ?? memberData.receiveBalance ?? 0) : 0;
  const settled = memberData ? (memberData.settledAmount ?? 0) : 0;
  const isSettled = memberData ? memberData.isSettled : false;

  const dueVal = isSettled ? 0 : Math.max(0, rawDue - settled);
  const refundVal = isSettled ? 0 : Math.max(0, rawRefund - settled);

  return (
    <div className="space-y-6">
      {/* Header Banner with Month Selection & Mess Cash-In-Hand */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
            ব্যক্তিগত সদস্য হিসাব ও লেজার
          </span>
          <h2 className="text-2xl font-bold text-slate-800 mt-1">
            স্বাগতম, {user?.name || 'সদস্য'}!
          </h2>
          <p className="text-sm text-slate-500">
            সদস্য আইডি: <span className="font-semibold text-slate-700">{user?.memberId}</span> • রুম {user?.roomNo}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center space-x-2 bg-emerald-50 text-emerald-800 border border-emerald-200 px-3 py-2 rounded-xl text-xs font-bold">
            <Wallet className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <div>
              <span className="text-[10px] text-emerald-600 block uppercase font-extrabold">মেসের মোট ক্যাশ ব্যালেন্স</span>
              <span>৳ {report?.cashInHand !== undefined ? report.cashInHand.toFixed(2) : '0.00'}</span>
            </div>
          </div>

          <div className="flex items-center space-x-2 bg-slate-100 p-2.5 rounded-xl border border-slate-200">
            <CalendarIcon className="w-4 h-4 text-slate-500" />
            <span className="text-xs font-semibold text-slate-600">মাস:</span>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-transparent text-sm font-bold text-slate-800 focus:outline-none cursor-pointer"
            />
          </div>
        </div>
      </div>

      {loading ? (
        <DataLoader
          text="ব্যক্তিগত মিল ও মেস হিসাব লোড হচ্ছে..."
          subtext="গুগল শিট থেকে আপনার মিল, বাজার ও জমার তথ্য সংগ্রহ করা হচ্ছে..."
          variant="cards"
        />
      ) : !memberData ? (
        <div className="p-8 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-sm flex items-center space-x-3">
          <ShieldAlert className="w-5 h-5 flex-shrink-0" />
          <span>{selectedMonth} মাসে আপনার কোনো হিসাব রেকর্ড পাওয়া যায়নি। মেস ম্যানেজারের সাথে যোগাযোগ করুন।</span>
        </div>
      ) : (
        <>
          {/* Quick Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-1">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-xs font-semibold uppercase">মোট মিল ({selectedMonth})</span>
                <Utensils className="w-4 h-4 text-emerald-600" />
              </div>
              <p className="text-2xl font-bold text-slate-800">{memberData.meals} টি মিল</p>
              <p className="text-xs text-slate-500">
                মিল রেট: ৳ {report?.millRate.toFixed(3) || '0.000'}
              </p>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-1">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-xs font-semibold uppercase">মোট খরচের অংশ</span>
                <Receipt className="w-4 h-4 text-emerald-600" />
              </div>
              <p className="text-2xl font-bold text-slate-800">৳ {memberData.totalCost.toFixed(2)}</p>
              <p className="text-xs text-slate-500">মিল খরচ + শেয়ার্ড ইউটিলিটি</p>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-1">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-xs font-semibold uppercase">আমার মোট জমা</span>
                <DollarSign className="w-4 h-4 text-emerald-600" />
              </div>
              <p className="text-2xl font-bold text-emerald-600">৳ {memberData.deposit.toFixed(2)}</p>
              <p className="text-xs text-slate-500">ম্যানেজারের কাছে জমা দেওয়া হয়েছে</p>
            </div>

            <div className={`p-5 rounded-xl border shadow-sm space-y-1 ${
              isSettled
                ? 'bg-blue-50 border-blue-200'
                : refundVal > 0
                ? 'bg-emerald-50 border-emerald-200'
                : dueVal > 0
                ? 'bg-red-50 border-red-200'
                : 'bg-slate-50 border-slate-200'
            }`}>
              <div className="flex items-center justify-between text-slate-600">
                <span className="text-xs font-bold uppercase">ব্যালেন্স ও স্থিতি</span>
                {isSettled ? (
                  <ArrowDownLeft className="w-5 h-5 text-blue-600" />
                ) : refundVal > 0 ? (
                  <ArrowDownLeft className="w-5 h-5 text-emerald-600" />
                ) : (
                  <ArrowUpRight className="w-5 h-5 text-red-600" />
                )}
              </div>
              {isSettled ? (
                <div>
                  <p className="text-2xl font-extrabold text-blue-700">
                    ৳ {settled.toFixed(2)}
                  </p>
                  <span className="inline-block text-xs font-bold text-blue-800 uppercase tracking-wider">
                    পরিশোধিত / সমন্বিত (SETTLED)
                  </span>
                </div>
              ) : refundVal > 0 ? (
                <div>
                  <p className="text-2xl font-extrabold text-emerald-700">
                    ৳ {refundVal.toFixed(2)}
                  </p>
                  <span className="inline-block text-xs font-bold text-emerald-800 uppercase tracking-wider">
                    মেস থেকে ফেরত পাবেন (REFUND)
                  </span>
                </div>
              ) : dueVal > 0 ? (
                <div>
                  <p className="text-2xl font-extrabold text-red-700">
                    ৳ {dueVal.toFixed(2)}
                  </p>
                  <span className="inline-block text-xs font-bold text-red-800 uppercase tracking-wider">
                    মেসে বকেয়া পরিশোধযোগ্য (DUE)
                  </span>
                </div>
              ) : (
                <p className="text-xl font-bold text-slate-700">৳ 0.00 (ব্যালেন্সড)</p>
              )}
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex flex-wrap border-b border-slate-200 gap-4">
            <button
              onClick={() => setActiveTab('BOOKING')}
              className={`pb-3 text-sm font-bold border-b-2 flex items-center space-x-2 transition-all ${
                activeTab === 'BOOKING'
                  ? 'border-emerald-600 text-emerald-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <Utensils className="w-4 h-4" />
              <span>আমার মিল বুকিং</span>
            </button>
            <button
              onClick={() => setActiveTab('MATRIX')}
              className={`pb-3 text-sm font-bold border-b-2 flex items-center space-x-2 transition-all ${
                activeTab === 'MATRIX'
                  ? 'border-emerald-600 text-emerald-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <CalendarIcon className="w-4 h-4" />
              <span>দৈনিক মিল উপস্থিতি</span>
            </button>
            <button
              onClick={() => setActiveTab('FINANCIAL_ACTIVITY')}
              className={`pb-3 text-sm font-bold border-b-2 flex items-center space-x-2 transition-all ${
                activeTab === 'FINANCIAL_ACTIVITY'
                  ? 'border-emerald-600 text-emerald-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>💰 আর্থিক বিবরণী ও অ্যাক্টিভিটি</span>
              {activities.length > 0 && (
                <span className="bg-emerald-100 text-emerald-800 text-[10px] font-extrabold px-1.5 py-0.5 rounded-full">
                  {activities.length}
                </span>
              )}
            </button>
          </div>

          {/* TAB 0: MEAL BOOKING & DECLARATION */}
          {activeTab === 'BOOKING' && (
            <MealBookingWidget
              userId={user?.id}
              selectedMonth={selectedMonth}
            />
          )}

          {/* TAB 1: VISUAL DAILY MEAL MATRIX */}
          {activeTab === 'MATRIX' && (
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-slate-800 text-lg">দৈনিক মিল উপস্থিতি চার্ট</h3>
                <span className="text-xs font-semibold text-slate-500">
                  মাসের মোট মিল: <span className="font-bold text-emerald-600">{memberData.meals} টি</span>
                </span>
              </div>

              <div className="grid grid-cols-4 sm:grid-cols-7 lg:grid-cols-10 gap-2">
                {Array.from({ length: 31 }, (_, idx) => idx + 1).map((day) => {
                  const count = memberMealMap[day] || 0;
                  return (
                    <div
                      key={day}
                      className={`p-3 rounded-xl border text-center transition-all ${
                        count > 0
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-900 shadow-sm'
                          : 'bg-slate-50 border-slate-100 text-slate-400'
                      }`}
                    >
                      <span className="text-[10px] font-bold uppercase block text-slate-500">{day} তারিখ</span>
                      <span className={`text-lg font-extrabold block ${count > 0 ? 'text-emerald-700' : 'text-slate-300'}`}>
                        {count}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: UNIFIED FINANCIAL STATEMENT & RECENT ACTIVITY */}
          {activeTab === 'FINANCIAL_ACTIVITY' && (
            <div className="space-y-6">
              {/* SECTION A: DETAILED FINANCIAL STATEMENT & COST BREAKDOWN */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* 1. Itemized Personal Expense Breakdown */}
                <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="p-5 bg-gradient-to-r from-slate-900 to-slate-800 text-white flex items-center justify-between">
                    <div>
                      <h3 className="font-extrabold text-base flex items-center gap-2">
                        <FileText className="w-5 h-5 text-emerald-400" />
                        <span>ব্যক্তিগত খরচের হিসাব বিবরণী (Financial Ledger)</span>
                      </h3>
                      <p className="text-xs text-slate-300">
                        {selectedMonth} মাসের মিল ও যৌথ খরচের সম্পূর্ণ বিভাজন
                      </p>
                    </div>
                    <span className="text-xs font-bold bg-white/10 px-2.5 py-1 rounded-lg border border-white/20">
                      মিল রেট: ৳ {report?.millRate.toFixed(3) || '0.000'}
                    </span>
                  </div>

                  <div className="divide-y divide-slate-100 text-sm">
                    <div className="p-4 flex items-center justify-between hover:bg-slate-50">
                      <div className="flex items-center space-x-2">
                        <Utensils className="w-4 h-4 text-emerald-600" />
                        <span className="text-slate-700 font-semibold">
                          মিল খরচ ({memberData.meals} টি মিল × ৳{report?.millRate.toFixed(3)})
                        </span>
                      </div>
                      <span className="font-bold text-slate-900">৳ {memberData.mealCost.toFixed(2)}</span>
                    </div>

                    <div className="p-4 flex items-center justify-between hover:bg-slate-50">
                      <span className="text-slate-600 font-medium pl-6">খালা বিল শেয়ার (Cook)</span>
                      <span className="font-semibold text-slate-800">৳ {memberData.khalaBill.toFixed(2)}</span>
                    </div>

                    <div className="p-4 flex items-center justify-between hover:bg-slate-50">
                      <span className="text-slate-600 font-medium pl-6">গ্যাস বিল শেয়ার (Gas)</span>
                      <span className="font-semibold text-slate-800">৳ {memberData.gasBill.toFixed(2)}</span>
                    </div>

                    <div className="p-4 flex items-center justify-between hover:bg-slate-50">
                      <span className="text-slate-600 font-medium pl-6">মেসের এক্সট্রা খরচ শেয়ার (Extra)</span>
                      <span className="font-semibold text-slate-800">৳ {memberData.extraCost.toFixed(2)}</span>
                    </div>

                    <div className="p-4 flex items-center justify-between hover:bg-slate-50">
                      <span className="text-slate-600 font-medium pl-6">ফ্রিজ বিল শেয়ার (Fridge)</span>
                      <span className="font-semibold text-slate-800">৳ {memberData.fridgeBill.toFixed(2)}</span>
                    </div>

                    <div className="p-4 flex items-center justify-between bg-slate-50 font-extrabold text-base text-slate-900 border-t-2 border-slate-200">
                      <span>সর্বমোট মেম্বার খরচ (Total Member Cost)</span>
                      <span className="text-emerald-700">৳ {memberData.totalCost.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {/* 2. Personal Balance & Settlement Card */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-col justify-between space-y-4">
                  <div>
                    <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2 mb-3 pb-2 border-b border-slate-100">
                      <Wallet className="w-4 h-4 text-emerald-600" />
                      <span>জমা ও চূড়ান্ত ব্যালেন্স অবস্থা</span>
                    </h4>

                    <div className="space-y-3">
                      <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                        <span className="text-xs text-emerald-800 font-semibold block">আপনার মোট জমা (Total Deposit)</span>
                        <span className="text-2xl font-black text-emerald-900">৳ {memberData.deposit.toFixed(2)}</span>
                      </div>

                      <div className={`p-3 rounded-xl border ${
                        isSettled
                          ? 'bg-blue-50 border-blue-200'
                          : refundVal > 0
                          ? 'bg-emerald-50 border-emerald-200'
                          : dueVal > 0
                          ? 'bg-red-50 border-red-200'
                          : 'bg-slate-50 border-slate-200'
                      }`}>
                        <span className="text-xs font-semibold block text-slate-600">চলতি নেট দেনা / পাওনা</span>
                        {isSettled ? (
                          <div className="mt-1">
                            <span className="text-xl font-black text-blue-700 block">৳ {settled.toFixed(2)}</span>
                            <span className="text-[10px] font-extrabold text-blue-800 uppercase bg-blue-100 px-2 py-0.5 rounded-full inline-block mt-1">
                              ✅ সম্পূর্ণ পরিশোধিত / সমন্বিত (SETTLED)
                            </span>
                          </div>
                        ) : refundVal > 0 ? (
                          <div className="mt-1">
                            <span className="text-xl font-black text-emerald-700 block">৳ {refundVal.toFixed(2)}</span>
                            <span className="text-[10px] font-extrabold text-emerald-800 uppercase bg-emerald-100 px-2 py-0.5 rounded-full inline-block mt-1">
                              💵 মেস থেকে ফেরত পাবেন (REFUND)
                            </span>
                          </div>
                        ) : dueVal > 0 ? (
                          <div className="mt-1">
                            <span className="text-xl font-black text-red-700 block">৳ {dueVal.toFixed(2)}</span>
                            <span className="text-[10px] font-extrabold text-red-800 uppercase bg-red-100 px-2 py-0.5 rounded-full inline-block mt-1">
                              ⚠️ মেসে বকেয়া পরিশোধযোগ্য (DUE)
                            </span>
                          </div>
                        ) : (
                          <div className="mt-1">
                            <span className="text-xl font-black text-slate-800 block">৳ 0.00</span>
                            <span className="text-[10px] font-bold text-slate-600 uppercase bg-slate-200 px-2 py-0.5 rounded-full inline-block mt-1">
                              সম্পূর্ণ ব্যালেন্সড
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 text-xs text-slate-500 flex items-center justify-between">
                    <span>মেসের ক্যাশ ইন হ্যান্ড:</span>
                    <span className="font-bold text-slate-800">৳ {report?.cashInHand !== undefined ? report.cashInHand.toFixed(2) : '0.00'}</span>
                  </div>
                </div>
              </div>

              {/* SECTION B: RECENT ACTIVITIES, BAZAR, UTILITIES & MY DEPOSITS */}
              <div className="bg-white p-4 sm:p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                  <div>
                    <h3 className="font-extrabold text-slate-900 text-lg sm:text-xl flex items-center gap-2">
                      <History className="w-5 h-5 text-emerald-600" />
                      <span>মেসের রিসেন্ট অ্যাক্টিভিটি ও লেনদেন ({selectedMonth})</span>
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-500">
                      ম্যানেজার চলতি মাসে যেসব বাজার, ইউটিলিটি এবং শুধুমাত্র আপনার অ্যাকাউন্টে যেসব জমা এন্ট্রি দিয়েছেন তার লাইভ হিসাব
                    </p>
                  </div>
                  <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-200 self-start sm:self-auto flex items-center gap-1.5">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                    <span>লাইভ আপডেট সক্রিয়</span>
                  </span>
                </div>

              {/* 3 Executive Summary Cards for Member */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                {/* 1. Month's Total Bazar */}
                <div className="p-4 bg-blue-50/70 rounded-2xl border-2 border-blue-200 space-y-1.5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase text-blue-800">
                      🛒 এই মাসের মোট বাজার
                    </span>
                    <ShoppingBag className="w-4 h-4 text-blue-600" />
                  </div>
                  <p className="text-2xl font-black text-blue-950">
                    ৳ {bazarList.reduce((sum, b) => sum + (b.amount || 0), 0).toLocaleString()}
                  </p>
                  <p className="text-[11px] font-semibold text-blue-700">
                    মোট {bazarList.length} টি বাজারের এন্ট্রি
                  </p>
                </div>

                {/* 2. Month's Utilities */}
                <div className="p-4 bg-purple-50/70 rounded-2xl border-2 border-purple-200 space-y-1.5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase text-purple-800">
                      ⚡ মোট ইউটিলিটি বিল
                    </span>
                    <Receipt className="w-4 h-4 text-purple-600" />
                  </div>
                  <p className="text-2xl font-black text-purple-950">
                    ৳ {utilityList.reduce((sum, u) => sum + (u.amount || 0), 0).toLocaleString()}
                  </p>
                  <p className="text-[11px] font-semibold text-purple-700">
                    খালা, গ্যাস, ফ্রিজ ও অন্যান্য ফিক্সড খরচ
                  </p>
                </div>

                {/* 3. My Personal Deposit */}
                <div className="p-4 bg-emerald-50/70 rounded-2xl border-2 border-emerald-300 space-y-1.5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase text-emerald-800">
                      💰 শুধুমাত্র আপনার জমা
                    </span>
                    <DollarSign className="w-4 h-4 text-emerald-600" />
                  </div>
                  <p className="text-2xl font-black text-emerald-950">
                    ৳ {myDeposits.reduce((sum, d) => sum + (d.amount || 0), 0).toLocaleString()}
                  </p>
                  <p className="text-[11px] font-semibold text-emerald-700 flex items-center gap-1">
                    <Lock className="w-3 h-3 text-emerald-600" />
                    <span>গোপনীয়: শুধু আপনার {myDeposits.length} টি জমা</span>
                  </p>
                </div>
              </div>

              {/* Sub-Tab Navigation */}
              <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
                <button
                  type="button"
                  onClick={() => setActivitySubTab('FEED')}
                  className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                    activitySubTab === 'FEED'
                      ? 'bg-slate-900 text-white shadow'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <History className="w-4 h-4" />
                  <span>টাইমলাইন ফিড</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActivitySubTab('BAZAR')}
                  className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                    activitySubTab === 'BAZAR'
                      ? 'bg-blue-600 text-white shadow'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <ShoppingBag className="w-4 h-4" />
                  <span>বাজার তালিকা ({bazarList.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActivitySubTab('UTILITY')}
                  className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                    activitySubTab === 'UTILITY'
                      ? 'bg-purple-600 text-white shadow'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <Receipt className="w-4 h-4" />
                  <span>ইউটিলিটি তালিকা ({utilityList.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActivitySubTab('MY_DEPOSITS')}
                  className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                    activitySubTab === 'MY_DEPOSITS'
                      ? 'bg-emerald-600 text-white shadow'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <DollarSign className="w-4 h-4" />
                  <span>আমার নিজের জমা ({myDeposits.length})</span>
                </button>
              </div>

              {/* SUB-TAB 1: TIMELINE FEED */}
              {activitySubTab === 'FEED' && (
                <div className="space-y-3">
                  {activities.length === 0 && myDeposits.length === 0 && bazarList.length === 0 ? (
                    <div className="p-10 text-center text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                      <Clock className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                      <p className="text-sm font-medium">{selectedMonth} মাসের কোনো অ্যাক্টিভিটি রেকর্ড নেই।</p>
                    </div>
                  ) : (
                    activities.map((act) => {
                      const isMyDeposit = act.targetMemberId === user?.id;
                      const isBazar = act.action === 'BAZAR_LOGGED';
                      const isUtility = act.action === 'UTILITY_LOGGED';
                      const isMeals = act.action === 'MEALS_UPDATED' || act.action === 'LOCK_AND_SYNC_MEALS';

                      return (
                        <div
                          key={act.id}
                          className={`p-4 rounded-2xl border transition-all flex items-start gap-3.5 ${
                            isMyDeposit
                              ? 'bg-emerald-50/70 border-emerald-300 shadow-sm'
                              : isBazar
                              ? 'bg-blue-50/40 border-blue-200'
                              : isUtility
                              ? 'bg-purple-50/40 border-purple-200'
                              : 'bg-slate-50 border-slate-200'
                          }`}
                        >
                          <div
                            className={`p-2.5 rounded-xl flex-shrink-0 mt-0.5 ${
                              isMyDeposit
                                ? 'bg-emerald-600 text-white'
                                : isBazar
                                ? 'bg-blue-600 text-white'
                                : isUtility
                                ? 'bg-purple-600 text-white'
                                : 'bg-slate-700 text-white'
                            }`}
                          >
                            {isMyDeposit ? (
                              <DollarSign className="w-4 h-4" />
                            ) : isBazar ? (
                              <ShoppingBag className="w-4 h-4" />
                            ) : isUtility ? (
                              <Receipt className="w-4 h-4" />
                            ) : isMeals ? (
                              <Utensils className="w-4 h-4" />
                            ) : (
                              <History className="w-4 h-4" />
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center justify-between gap-1 mb-1">
                              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                                {isMyDeposit ? (
                                  <span className="bg-emerald-600 text-white text-[10px] font-black px-2 py-0.5 rounded-md">
                                    💰 আমার জমা এন্ট্রি
                                  </span>
                                ) : isBazar ? (
                                  <span className="bg-blue-600 text-white text-[10px] font-black px-2 py-0.5 rounded-md">
                                    🛒 মেসের দৈনিক বাজার
                                  </span>
                                ) : isUtility ? (
                                  <span className="bg-purple-600 text-white text-[10px] font-black px-2 py-0.5 rounded-md">
                                    ⚡ ইউটিলিটি বিল
                                  </span>
                                ) : (
                                  <span className="bg-slate-600 text-white text-[10px] font-black px-2 py-0.5 rounded-md">
                                    🍽️ মিল এন্ট্রি
                                  </span>
                                )}
                                <span className="text-slate-600 font-semibold">{act.userName || 'ম্যানেজার'}</span>
                              </span>
                              <span className="text-[11px] text-slate-400 font-medium">
                                {new Date(act.timestamp).toLocaleString('bn-BD', {
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>
                            </div>
                            <p className="text-xs sm:text-sm font-semibold text-slate-800 leading-snug">
                              {act.details}
                            </p>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              {/* SUB-TAB 2: BAZAR TABLE */}
              {activitySubTab === 'BAZAR' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-600">
                      চলতি মাসের বাজার খরচের আইটেমাইজড তালিকা:
                    </span>
                    <span className="text-xs font-black text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200">
                      মোট: ৳ {bazarList.reduce((sum, b) => sum + (b.amount || 0), 0).toLocaleString()}
                    </span>
                  </div>

                  <div className="overflow-x-auto rounded-2xl border border-slate-200">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-slate-100 text-slate-700 font-extrabold uppercase border-b border-slate-200">
                        <tr>
                          <th className="py-2.5 px-3 w-28">তারিখ</th>
                          <th className="py-2.5 px-4">বাজারের বিবরণ / কি কি কেনা হয়েছে</th>
                          <th className="py-2.5 px-3">বাজারকারী</th>
                          <th className="py-2.5 px-3 text-right font-black">খরচ (৳)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {bazarList.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="p-8 text-center text-slate-500">
                              এই মাসে কোনো বাজারের এন্ট্রি নেই।
                            </td>
                          </tr>
                        ) : (
                          bazarList.map((b, idx) => (
                            <tr
                              key={b.id}
                              className={`hover:bg-slate-50 transition-colors ${
                                idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'
                              }`}
                            >
                              <td className="py-2.5 px-3 font-bold text-slate-700 whitespace-nowrap">
                                {b.date}
                              </td>
                              <td className="py-2.5 px-4 font-semibold text-slate-800">
                                {b.description || 'দৈনিক বাজার'}
                              </td>
                              <td className="py-2.5 px-3 text-slate-700">
                                {b.shopperName ? (
                                  <span className="font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md text-[11px] inline-flex items-center gap-1">
                                    <span>👤</span> {b.shopperName}
                                  </span>
                                ) : (
                                  <span className="text-slate-400 text-xs">—</span>
                                )}
                              </td>
                              <td className="py-2.5 px-3 text-right font-black text-blue-900 text-xs sm:text-sm">
                                ৳ {b.amount.toLocaleString()}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>

                      <tfoot className="bg-blue-50 text-blue-950 font-black text-xs border-t-2 border-blue-200">
                        <tr>
                          <td colSpan={2} className="py-3 px-4 uppercase">
                            সর্বমোট বাজার ({bazarList.length} টি)
                          </td>
                          <td className="py-3 px-3 text-right font-black text-sm text-blue-900">
                            ৳ {bazarList.reduce((sum, b) => sum + (b.amount || 0), 0).toLocaleString()}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              )}

              {/* SUB-TAB 3: UTILITY TABLE */}
              {activitySubTab === 'UTILITY' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-600">
                      চলতি মাসের ইউটিলিটি খরচের তালিকা:
                    </span>
                    <span className="text-xs font-black text-purple-700 bg-purple-50 px-2.5 py-1 rounded-lg border border-purple-200">
                      মোট: ৳ {utilityList.reduce((sum, u) => sum + (u.amount || 0), 0).toLocaleString()}
                    </span>
                  </div>

                  <div className="overflow-x-auto rounded-2xl border border-slate-200">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-slate-100 text-slate-700 font-extrabold uppercase border-b border-slate-200">
                        <tr>
                          <th className="py-2.5 px-3 w-36">ক্যাটেগরি</th>
                          <th className="py-2.5 px-4">বিবরণ</th>
                          <th className="py-2.5 px-3 text-right font-black">টাকার পরিমাণ (৳)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {utilityList.length === 0 ? (
                          <tr>
                            <td colSpan={3} className="p-8 text-center text-slate-500">
                              এই মাসে কোনো ইউটিলিটি খরচের রেকর্ড নেই।
                            </td>
                          </tr>
                        ) : (
                          utilityList.map((u, idx) => (
                            <tr
                              key={u.id}
                              className={`hover:bg-slate-50 transition-colors ${
                                idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'
                              }`}
                            >
                              <td className="py-2.5 px-3 font-bold text-slate-800">
                                {u.category}
                              </td>
                              <td className="py-2.5 px-4 font-semibold text-slate-700">
                                {u.description || u.category}
                              </td>
                              <td className="py-2.5 px-3 text-right font-black text-purple-900 text-xs sm:text-sm">
                                ৳ {u.amount.toLocaleString()}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                      <tfoot className="bg-purple-50 text-purple-950 font-black text-xs border-t-2 border-purple-200">
                        <tr>
                          <td colSpan={2} className="py-3 px-4 uppercase">
                            সর্বমোট ইউটিলিটি ({utilityList.length} টি)
                          </td>
                          <td className="py-3 px-3 text-right font-black text-sm text-purple-900">
                            ৳ {utilityList.reduce((sum, u) => sum + (u.amount || 0), 0).toLocaleString()}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              )}

              {/* SUB-TAB 4: ONLY MY DEPOSITS */}
              {activitySubTab === 'MY_DEPOSITS' && (
                <div className="space-y-3">
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center space-x-2 text-emerald-900 text-xs font-semibold">
                    <Lock className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    <span>
                      🔒 গোপনীয়তা রক্ষা: আপনার একাউন্টে ম্যানেজার যে টাকা জমা দিয়েছেন শুধুমাত্র সেটাই এখানে দেখা যাচ্ছে। অন্য কোনো মেম্বারের জমা প্রদর্শন করা হয় না।
                    </span>
                  </div>

                  <div className="overflow-x-auto rounded-2xl border border-slate-200">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-slate-100 text-slate-700 font-extrabold uppercase border-b border-slate-200">
                        <tr>
                          <th className="py-2.5 px-3 w-28">তারিখ</th>
                          <th className="py-2.5 px-4">পেমেন্ট বিবরণ / নোট</th>
                          <th className="py-2.5 px-3 text-right font-black">জমার পরিমাণ (৳)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {myDeposits.length === 0 ? (
                          <tr>
                            <td colSpan={3} className="p-8 text-center text-slate-500">
                              এই মাসে আপনার কোনো জমা এন্ট্রি পাওয়া যায়নি।
                            </td>
                          </tr>
                        ) : (
                          myDeposits.map((d, idx) => (
                            <tr
                              key={d.id}
                              className={`hover:bg-slate-50 transition-colors ${
                                idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'
                              }`}
                            >
                              <td className="py-2.5 px-3 font-bold text-slate-700 whitespace-nowrap">
                                {d.date}
                              </td>
                              <td className="py-2.5 px-4 font-semibold text-slate-800">
                                {d.note || 'ম্যানেজার কর্তৃক জমা রেকর্ড'}
                              </td>
                              <td className={`py-2.5 px-3 text-right font-black text-xs sm:text-sm ${d.amount < 0 ? 'text-red-600' : 'text-emerald-800'}`}>
                                {d.amount < 0 ? `- ৳ ${Math.abs(d.amount).toLocaleString()}` : `৳ ${d.amount.toLocaleString()}`}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                      <tfoot className="bg-emerald-50 text-emerald-950 font-black text-xs border-t-2 border-emerald-300">
                        <tr>
                          <td colSpan={2} className="py-3 px-4 uppercase">
                            শুধুমাত্র আপনার মোট জমা ({myDeposits.length} টি)
                          </td>
                          <td className="py-3 px-3 text-right font-black text-sm text-emerald-900">
                            ৳ {myDeposits.reduce((sum, d) => sum + (d.amount || 0), 0).toLocaleString()}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </>
    )}
  </div>
);
}
