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
  Printer,
  Filter,
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
  const [bazarSearch, setBazarSearch] = useState('');
  const [depositSearch, setDepositSearch] = useState('');

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

  const dueVal = rawDue > 0.01 ? rawDue : 0;
  const refundVal = rawRefund > 0.01 ? rawRefund : 0;
  const isSettled = Boolean(memberData?.isSettled && dueVal === 0 && refundVal === 0);

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
              dueVal > 0
                ? 'bg-red-50 border-red-200'
                : refundVal > 0
                ? 'bg-emerald-50 border-emerald-200'
                : isSettled || settled > 0
                ? 'bg-blue-50 border-blue-200'
                : 'bg-slate-50 border-slate-200'
            }`}>
              <div className="flex items-center justify-between text-slate-600">
                <span className="text-xs font-bold uppercase">ব্যালেন্স ও স্থিতি</span>
                {dueVal > 0 ? (
                  <ArrowUpRight className="w-5 h-5 text-red-600" />
                ) : refundVal > 0 ? (
                  <ArrowDownLeft className="w-5 h-5 text-emerald-600" />
                ) : (
                  <ArrowDownLeft className="w-5 h-5 text-blue-600" />
                )}
              </div>
              {dueVal > 0 ? (
                <div>
                  <p className="text-2xl font-extrabold text-red-700">
                    ৳ {dueVal.toFixed(2)}
                  </p>
                  <span className="inline-block text-xs font-bold text-red-800 uppercase tracking-wider">
                    মেসে বকেয়া পরিশোধযোগ্য (DUE)
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
              ) : isSettled || settled > 0 ? (
                <div>
                  <p className="text-2xl font-extrabold text-blue-700">
                    ৳ {settled.toFixed(2)}
                  </p>
                  <span className="inline-block text-xs font-bold text-blue-800 uppercase tracking-wider">
                    পরিশোধিত / সমন্বিত (SETTLED)
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
              {/* CARD 1: PERSONAL FINANCIAL STATEMENT & VOUCHER */}
              <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                {/* Header */}
                <div className="p-5 sm:p-6 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30">
                        <FileText className="w-5 h-5" />
                      </span>
                      <div>
                        <h3 className="font-extrabold text-lg sm:text-xl tracking-tight text-white">
                          ব্যক্তিগত মাসিক আর্থিক বিবরণী (Monthly Statement)
                        </h3>
                        <p className="text-xs text-slate-300">
                          {selectedMonth} মাসের মিল ও যৌথ খরচের আইটেমাইজড লেজার ভাউচার
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
                    <div className="bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/15 text-xs font-bold text-emerald-300 flex items-center space-x-1.5">
                      <span>মিল রেট:</span>
                      <span className="font-mono text-sm text-white">৳ {report?.millRate.toFixed(3) || '0.000'}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => window.print()}
                      className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center space-x-1.5 cursor-pointer"
                      title="ভাউচার প্রিন্ট করুন"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>প্রিন্ট ভাউচার</span>
                    </button>
                  </div>
                </div>

                {/* Quick KPI Strip inside voucher */}
                <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-y sm:divide-y-0 divide-slate-100 bg-slate-50/80 border-b border-slate-200 text-xs">
                  <div className="p-3.5 sm:p-4 text-center">
                    <span className="text-[11px] font-bold text-slate-500 block uppercase">মোট মিল সংখ্যা</span>
                    <span className="text-lg font-black text-slate-800">{memberData.meals} টি</span>
                  </div>
                  <div className="p-3.5 sm:p-4 text-center">
                    <span className="text-[11px] font-bold text-slate-500 block uppercase">মিল বাবদ খরচ</span>
                    <span className="text-lg font-black text-emerald-700">৳ {memberData.mealCost.toFixed(2)}</span>
                  </div>
                  <div className="p-3.5 sm:p-4 text-center">
                    <span className="text-[11px] font-bold text-slate-500 block uppercase">শেয়ার্ড ইউটিলিটি</span>
                    <span className="text-lg font-black text-purple-700">
                      ৳ {(memberData.khalaBill + memberData.gasBill + memberData.extraCost + memberData.fridgeBill).toFixed(2)}
                    </span>
                  </div>
                  <div className="p-3.5 sm:p-4 text-center">
                    <span className="text-[11px] font-bold text-slate-500 block uppercase">মোট রেকর্ডকৃত জমা</span>
                    <span className="text-lg font-black text-blue-700">৳ {memberData.deposit.toFixed(2)}</span>
                  </div>
                </div>

                {/* Statement Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs sm:text-sm border-collapse">
                    <thead>
                      <tr className="bg-slate-100/80 text-slate-700 font-extrabold uppercase text-[11px] border-b border-slate-200">
                        <th className="py-3 px-4 sm:px-6">খাত / খরচের বিবরণ</th>
                        <th className="py-3 px-4 hidden sm:table-cell">ক্যালকুলেশন মেথড</th>
                        <th className="py-3 px-4 sm:px-6 text-right font-black">টাকার পরিমাণ (৳)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      <tr className="hover:bg-slate-50 transition-colors">
                        <td className="py-3 px-4 sm:px-6">
                          <div className="flex items-center space-x-2.5">
                            <span className="p-1.5 bg-emerald-100 text-emerald-700 rounded-lg text-sm">🍽️</span>
                            <div>
                              <span className="font-bold text-slate-800 block">মিল খরচ (Meal Cost)</span>
                              <span className="text-xs text-slate-400 sm:hidden">
                                {memberData.meals} টি মিল × ৳{report?.millRate.toFixed(3)}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-xs text-slate-600 hidden sm:table-cell font-medium">
                          {memberData.meals} টি মিল × ৳ {report?.millRate.toFixed(3)}
                        </td>
                        <td className="py-3 px-4 sm:px-6 text-right font-bold font-mono text-slate-800">
                          ৳ {memberData.mealCost.toFixed(2)}
                        </td>
                      </tr>

                      <tr className="hover:bg-slate-50 transition-colors">
                        <td className="py-3 px-4 sm:px-6">
                          <div className="flex items-center space-x-2.5">
                            <span className="p-1.5 bg-amber-100 text-amber-700 rounded-lg text-sm">👩‍🍳</span>
                            <div>
                              <span className="font-bold text-slate-800 block">খালা বিল শেয়ার (Cook Bill)</span>
                              <span className="text-xs text-slate-400 sm:hidden">রান্নার বুয়ার মাসিক বেতন শেয়ার</span>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-xs text-slate-600 hidden sm:table-cell font-medium">
                          মেসের সকল সক্রিয় সদস্যের সমান শেয়ার
                        </td>
                        <td className="py-3 px-4 sm:px-6 text-right font-bold font-mono text-slate-800">
                          ৳ {memberData.khalaBill.toFixed(2)}
                        </td>
                      </tr>

                      <tr className="hover:bg-slate-50 transition-colors">
                        <td className="py-3 px-4 sm:px-6">
                          <div className="flex items-center space-x-2.5">
                            <span className="p-1.5 bg-orange-100 text-orange-700 rounded-lg text-sm">🔥</span>
                            <div>
                              <span className="font-bold text-slate-800 block">গ্যাস বিল শেয়ার (Gas Cylinder/Line)</span>
                              <span className="text-xs text-slate-400 sm:hidden">সিলিন্ডার বা লাইন গ্যাস খরচ শেয়ার</span>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-xs text-slate-600 hidden sm:table-cell font-medium">
                          মেসের সক্রিয় সদস্যদের সমান শেয়ার
                        </td>
                        <td className="py-3 px-4 sm:px-6 text-right font-bold font-mono text-slate-800">
                          ৳ {memberData.gasBill.toFixed(2)}
                        </td>
                      </tr>

                      <tr className="hover:bg-slate-50 transition-colors">
                        <td className="py-3 px-4 sm:px-6">
                          <div className="flex items-center space-x-2.5">
                            <span className="p-1.5 bg-cyan-100 text-cyan-700 rounded-lg text-sm">❄️</span>
                            <div>
                              <span className="font-bold text-slate-800 block">ফ্রিজ বিল শেয়ার (Refrigerator Charge)</span>
                              <span className="text-xs text-slate-400 sm:hidden">ফ্রিজ সার্ভিসিং ও ব্যবহার চার্জ</span>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-xs text-slate-600 hidden sm:table-cell font-medium">
                          মেসের সক্রিয় সদস্যদের সমান শেয়ার
                        </td>
                        <td className="py-3 px-4 sm:px-6 text-right font-bold font-mono text-slate-800">
                          ৳ {memberData.fridgeBill.toFixed(2)}
                        </td>
                      </tr>

                      <tr className="hover:bg-slate-50 transition-colors">
                        <td className="py-3 px-4 sm:px-6">
                          <div className="flex items-center space-x-2.5">
                            <span className="p-1.5 bg-indigo-100 text-indigo-700 rounded-lg text-sm">📦</span>
                            <div>
                              <span className="font-bold text-slate-800 block">বিবিধ / এক্সট্রা খরচ শেয়ার (Extra Cost)</span>
                              <span className="text-xs text-slate-400 sm:hidden">মসলা, তেল, ওয়াইফাই ও অন্যান্য যৌথ খরচ</span>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-xs text-slate-600 hidden sm:table-cell font-medium">
                          মেসের সকল সদস্যের যৌথ শেয়ার
                        </td>
                        <td className="py-3 px-4 sm:px-6 text-right font-bold font-mono text-slate-800">
                          ৳ {memberData.extraCost.toFixed(2)}
                        </td>
                      </tr>
                    </tbody>

                    {/* Summary Footer */}
                    <tfoot className="divide-y divide-slate-200 border-t-2 border-slate-300 bg-slate-50/70">
                      {/* Subtotal Row */}
                      <tr className="font-bold text-slate-900">
                        <td className="py-3 px-4 sm:px-6">সর্বমোট ব্যক্তিগত খরচ (Total Personal Cost)</td>
                        <td className="py-3 px-4 hidden sm:table-cell text-xs text-slate-500 font-normal">
                          মিল খরচ + সকল শেয়ার্ড ইউটিলিটি
                        </td>
                        <td className="py-3 px-4 sm:px-6 text-right font-black font-mono text-slate-900 text-base">
                          ৳ {memberData.totalCost.toFixed(2)}
                        </td>
                      </tr>

                      {/* Deposit Row */}
                      <tr className="font-bold text-emerald-800 bg-emerald-50/50">
                        <td className="py-3 px-4 sm:px-6">
                          বাদ: আপনার মোট পরিশোধিত জমা (Total Deposit Paid)
                        </td>
                        <td className="py-3 px-4 hidden sm:table-cell text-xs text-emerald-700 font-normal">
                          ক্যাশ বা বিকাশ মারফত ম্যানেজারের কাছে জমা
                        </td>
                        <td className="py-3 px-4 sm:px-6 text-right font-black font-mono text-emerald-700 text-base">
                          - ৳ {memberData.deposit.toFixed(2)}
                        </td>
                      </tr>

                      {/* Net Final Balance Row */}
                      <tr className={
                        dueVal > 0
                          ? 'bg-red-50 text-red-900 font-black'
                          : refundVal > 0
                          ? 'bg-emerald-100 text-emerald-950 font-black'
                          : isSettled || settled > 0
                          ? 'bg-blue-50 text-blue-950 font-black'
                          : 'bg-slate-100 text-slate-900 font-black'
                      }>
                        <td className="py-4 px-4 sm:px-6">
                          <div className="flex items-center space-x-2">
                            <span>
                              {dueVal > 0
                                ? '⚠️ নেট প্রদেয় বকেয়া (DUE PAYABLE)'
                                : refundVal > 0
                                ? '💵 মেস থেকে আপনার ফেরত প্রাপ্য (REFUND)'
                                : isSettled || settled > 0
                                ? '✅ সেটেলমেন্ট সম্পন্ন (SETTLED)'
                                : '✓ ব্যালেন্সড অবস্থা (BALANCED)'}
                            </span>
                          </div>
                        </td>
                        <td className="py-4 px-4 hidden sm:table-cell text-xs font-normal">
                          {dueVal > 0
                            ? 'ম্যানেজারকে এই টাকা পরিশোধ করতে হবে'
                            : refundVal > 0
                            ? 'মেসের ফান্ড থেকে এই টাকা আপনাকে ফেরত দেওয়া হবে'
                            : isSettled || settled > 0
                            ? 'চলতি মাসের দেনা-পাওনা পরিশোধিত ও সমন্বিত'
                            : 'কোনো বকেয়া বা ফেরত অবশিষ্ট নেই'}
                        </td>
                        <td className="py-4 px-4 sm:px-6 text-right font-black font-mono text-lg sm:text-xl">
                          {dueVal > 0
                            ? `৳ ${dueVal.toFixed(2)}`
                            : refundVal > 0
                            ? `৳ ${refundVal.toFixed(2)}`
                            : isSettled || settled > 0
                            ? `৳ ${settled.toFixed(2)}`
                            : `৳ 0.00`}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* CARD 2: TRANSPARENT MESS LEDGER & ACTIVITY HUB */}
              <div className="bg-white p-5 sm:p-7 rounded-3xl border border-slate-200 shadow-sm space-y-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-5">
                  <div>
                    <h3 className="font-extrabold text-slate-900 text-lg sm:text-xl flex items-center gap-2">
                      <span className="p-2 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-200">
                        <History className="w-5 h-5" />
                      </span>
                      <span>মেসের খরচের খতিয়ান ও লেনদেন রেকর্ড ({selectedMonth})</span>
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-500 mt-1">
                      মেসের সামগ্রিক বাজার, ইউটিলিটি বিল এবং আপনার ব্যক্তিগত জমার সম্পূর্ণ স্বচ্ছ বিবরণী
                    </p>
                  </div>

                  <div className="flex items-center space-x-2 self-start sm:self-auto bg-slate-100 text-slate-700 px-3 py-1.5 rounded-xl text-xs font-bold border border-slate-200">
                    <Wallet className="w-4 h-4 text-slate-500" />
                    <span>মেসের ক্যাশ ইন হ্যান্ড:</span>
                    <span className="font-mono font-black text-emerald-700">
                      ৳ {report?.cashInHand !== undefined ? report.cashInHand.toFixed(2) : '0.00'}
                    </span>
                  </div>
                </div>

                {/* 3 Executive Summary Pills */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                  {/* Total Bazar Card */}
                  <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-50/30 rounded-2xl border border-blue-200 space-y-1 shadow-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-extrabold uppercase text-blue-800 flex items-center gap-1.5">
                        <ShoppingBag className="w-4 h-4 text-blue-600" />
                        <span>মেসের মোট বাজার</span>
                      </span>
                      <span className="text-[11px] font-bold bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                        {bazarList.length} টি
                      </span>
                    </div>
                    <p className="text-2xl font-black text-blue-950 font-mono">
                      ৳ {bazarList.reduce((sum, b) => sum + (Number(b.amount) || 0), 0).toLocaleString()}
                    </p>
                    <p className="text-[11px] font-medium text-blue-700">চলতি মাসের সমস্ত বাজারের সম্মিলিত যোগফল</p>
                  </div>

                  {/* Total Utility Card */}
                  <div className="p-4 bg-gradient-to-br from-purple-50 to-purple-50/30 rounded-2xl border border-purple-200 space-y-1 shadow-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-extrabold uppercase text-purple-800 flex items-center gap-1.5">
                        <Receipt className="w-4 h-4 text-purple-600" />
                        <span>মোট ইউটিলিটি বিল</span>
                      </span>
                      <span className="text-[11px] font-bold bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full">
                        {utilityList.length} টি খাত
                      </span>
                    </div>
                    <p className="text-2xl font-black text-purple-950 font-mono">
                      ৳ {utilityList.reduce((sum, u) => sum + (Number(u.amount) || 0), 0).toLocaleString()}
                    </p>
                    <p className="text-[11px] font-medium text-purple-700">খালা, গ্যাস, ফ্রিজ ও বিবিধ যৌথ বিল</p>
                  </div>

                  {/* My Personal Deposit Card */}
                  <div className="p-4 bg-gradient-to-br from-emerald-50 to-emerald-50/30 rounded-2xl border border-emerald-300 space-y-1 shadow-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-extrabold uppercase text-emerald-800 flex items-center gap-1.5">
                        <DollarSign className="w-4 h-4 text-emerald-600" />
                        <span>আপনার মোট জমা</span>
                      </span>
                      <span className="text-[11px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                        {myDeposits.length} টি
                      </span>
                    </div>
                    <p className="text-2xl font-black text-emerald-950 font-mono">
                      ৳ {myDeposits.reduce((sum, d) => sum + (Number(d.amount) || 0), 0).toLocaleString()}
                    </p>
                    <p className="text-[11px] font-medium text-emerald-700 flex items-center gap-1">
                      <Lock className="w-3 h-3 text-emerald-600" />
                      <span>গোপনীয়: শুধুমাত্র আপনার ব্যক্তিগত ডিপোজিট</span>
                    </p>
                  </div>
                </div>

                {/* Sub-Tab Navigation (Segmented Switcher) */}
                <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
                  <button
                    type="button"
                    onClick={() => setActivitySubTab('MY_DEPOSITS')}
                    className={`flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                      activitySubTab === 'MY_DEPOSITS'
                        ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    <DollarSign className="w-4 h-4" />
                    <span>আমার জমা খাতা ({myDeposits.length})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActivitySubTab('BAZAR')}
                    className={`flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                      activitySubTab === 'BAZAR'
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    <ShoppingBag className="w-4 h-4" />
                    <span>বাজারের তালিকা ({bazarList.length})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActivitySubTab('UTILITY')}
                    className={`flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                      activitySubTab === 'UTILITY'
                        ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    <Receipt className="w-4 h-4" />
                    <span>ইউটিলিটি তালিকা ({utilityList.length})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActivitySubTab('FEED')}
                    className={`flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                      activitySubTab === 'FEED'
                        ? 'bg-slate-900 text-white shadow-md shadow-slate-900/20'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    <History className="w-4 h-4" />
                    <span>টাইমলাইন ফিড ({activities.length})</span>
                  </button>
                </div>

                {/* SUB-TAB 1: MY PERSONAL DEPOSITS */}
                {activitySubTab === 'MY_DEPOSITS' && (
                  <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-emerald-50/70 p-3.5 rounded-2xl border border-emerald-200 text-xs">
                      <div className="flex items-center space-x-2 text-emerald-900 font-semibold">
                        <Lock className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                        <span>
                          শতভাগ গোপনীয়তা: শুধুমাত্র আপনার অ্যাকাউন্টে ম্যানেজার কর্তৃক প্রদত্ত জমার রেকর্ড এখানে দেখা যাচ্ছে।
                        </span>
                      </div>
                      {myDeposits.length > 2 && (
                        <div className="relative w-full sm:w-56">
                          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                          <input
                            type="text"
                            placeholder="তারিখ বা নোট দিয়ে খুঁজুন..."
                            value={depositSearch}
                            onChange={(e) => setDepositSearch(e.target.value)}
                            className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          />
                        </div>
                      )}
                    </div>

                    <div className="overflow-x-auto rounded-2xl border border-slate-200">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead className="bg-slate-100 text-slate-700 font-extrabold uppercase border-b border-slate-200 text-[11px]">
                          <tr>
                            <th className="py-3 px-4 w-32">তারিখ</th>
                            <th className="py-3 px-4">পেমেন্ট বিবরণ / নোট</th>
                            <th className="py-3 px-4 text-right font-black">জমার পরিমাণ (৳)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {myDeposits.length === 0 ? (
                            <tr>
                              <td colSpan={3} className="p-8 text-center text-slate-500 font-medium">
                                এই মাসে আপনার কোনো জমার রেকর্ড পাওয়া যায়নি।
                              </td>
                            </tr>
                          ) : (
                            myDeposits
                              .filter((d) => {
                                if (!depositSearch.trim()) return true;
                                const term = depositSearch.toLowerCase();
                                return (
                                  (d.note || '').toLowerCase().includes(term) ||
                                  (d.date || '').includes(term) ||
                                  String(d.amount || '').includes(term)
                                );
                              })
                              .map((d, idx) => (
                                <tr
                                  key={d.id}
                                  className={`hover:bg-slate-50 transition-colors ${
                                    idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'
                                  }`}
                                >
                                  <td className="py-3 px-4 font-bold text-slate-700 whitespace-nowrap">
                                    {d.date}
                                  </td>
                                  <td className="py-3 px-4 font-semibold text-slate-800">
                                    {d.note || 'ম্যানেজার কর্তৃক জমা রেকর্ড'}
                                  </td>
                                  <td
                                    className={`py-3 px-4 text-right font-black text-xs sm:text-sm font-mono ${
                                      d.amount < 0 ? 'text-red-600' : 'text-emerald-700'
                                    }`}
                                  >
                                    {d.amount < 0 ? `- ৳ ${Math.abs(d.amount).toFixed(2)}` : `৳ ${d.amount.toFixed(2)}`}
                                  </td>
                                </tr>
                              ))
                          )}
                        </tbody>
                        <tfoot className="bg-emerald-50 text-emerald-950 font-black text-xs border-t-2 border-emerald-300">
                          <tr>
                            <td colSpan={2} className="py-3 px-4 uppercase">
                              শুধুমাত্র আপনার মোট জমা ({myDeposits.length} টি এন্ট্রি)
                            </td>
                            <td className="py-3 px-4 text-right font-black text-sm text-emerald-900 font-mono">
                              ৳ {myDeposits.reduce((sum, d) => sum + (Number(d.amount) || 0), 0).toFixed(2)}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                )}

                {/* SUB-TAB 2: BAZAR LIST */}
                {activitySubTab === 'BAZAR' && (
                  <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="relative flex-1 max-w-sm">
                        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          placeholder="বাজারের আইটেম, বিবরণ বা তারিখ দিয়ে খুঁজুন..."
                          value={bazarSearch}
                          onChange={(e) => setBazarSearch(e.target.value)}
                          className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                        />
                      </div>

                      <span className="text-xs font-extrabold text-blue-700 bg-blue-50 px-3 py-1.5 rounded-xl border border-blue-200 self-start sm:self-auto font-mono">
                        মোট বাজার: ৳ {bazarList.reduce((sum, b) => sum + (Number(b.amount) || 0), 0).toLocaleString()}
                      </span>
                    </div>

                    <div className="overflow-x-auto rounded-2xl border border-slate-200">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead className="bg-slate-100 text-slate-700 font-extrabold uppercase border-b border-slate-200 text-[11px]">
                          <tr>
                            <th className="py-3 px-4 w-28">তারিখ</th>
                            <th className="py-3 px-4">বাজারের বিবরণ / কি কি কেনা হয়েছে</th>
                            <th className="py-3 px-4 w-36">বাজারকারী</th>
                            <th className="py-3 px-4 text-right font-black w-28">খরচ (৳)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {bazarList.length === 0 ? (
                            <tr>
                              <td colSpan={4} className="p-8 text-center text-slate-500 font-medium">
                                এই মাসে কোনো বাজারের এন্ট্রি নেই।
                              </td>
                            </tr>
                          ) : (
                            bazarList
                              .filter((b) => {
                                if (!bazarSearch.trim()) return true;
                                const term = bazarSearch.toLowerCase();
                                return (
                                  (b.description || '').toLowerCase().includes(term) ||
                                  (b.shopperName || '').toLowerCase().includes(term) ||
                                  (b.date || '').includes(term) ||
                                  String(b.amount || '').includes(term)
                                );
                              })
                              .map((b, idx) => (
                                <tr
                                  key={b.id}
                                  className={`hover:bg-slate-50 transition-colors ${
                                    idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'
                                  }`}
                                >
                                  <td className="py-3 px-4 font-bold text-slate-700 whitespace-nowrap">
                                    {b.date}
                                  </td>
                                  <td className="py-3 px-4 font-semibold text-slate-800">
                                    {b.description || 'দৈনিক বাজার'}
                                  </td>
                                  <td className="py-3 px-4 text-slate-700">
                                    {b.shopperName ? (
                                      <span className="font-bold text-slate-800 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md text-[11px] inline-flex items-center gap-1">
                                        <span>👤</span> {b.shopperName}
                                      </span>
                                    ) : (
                                      <span className="text-slate-400 text-xs">—</span>
                                    )}
                                  </td>
                                  <td className="py-3 px-4 text-right font-black text-blue-900 text-xs sm:text-sm font-mono whitespace-nowrap">
                                    ৳ {b.amount.toLocaleString()}
                                  </td>
                                </tr>
                              ))
                          )}
                        </tbody>
                        <tfoot className="bg-blue-50 text-blue-950 font-black text-xs border-t-2 border-blue-200">
                          <tr>
                            <td colSpan={3} className="py-3 px-4 uppercase">
                              সর্বমোট বাজার ({bazarList.length} টি রেকর্ড)
                            </td>
                            <td className="py-3 px-4 text-right font-black text-sm text-blue-900 font-mono whitespace-nowrap">
                              ৳ {bazarList.reduce((sum, b) => sum + (Number(b.amount) || 0), 0).toLocaleString()}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                )}

                {/* SUB-TAB 3: UTILITY LIST */}
                {activitySubTab === 'UTILITY' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-600">
                        চলতি মাসের ইউটিলিটি ও ফিক্সড যৌথ খরচের বিভাজন:
                      </span>
                      <span className="text-xs font-extrabold text-purple-700 bg-purple-50 px-3 py-1.5 rounded-xl border border-purple-200 font-mono">
                        মোট: ৳ {utilityList.reduce((sum, u) => sum + (Number(u.amount) || 0), 0).toLocaleString()}
                      </span>
                    </div>

                    <div className="overflow-x-auto rounded-2xl border border-slate-200">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead className="bg-slate-100 text-slate-700 font-extrabold uppercase border-b border-slate-200 text-[11px]">
                          <tr>
                            <th className="py-3 px-4 w-44">ক্যাটেগরি ও খাত</th>
                            <th className="py-3 px-4">বিবরণ</th>
                            <th className="py-3 px-4 text-right font-black w-36">টাকার পরিমাণ (৳)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {utilityList.length === 0 ? (
                            <tr>
                              <td colSpan={3} className="p-8 text-center text-slate-500 font-medium">
                                এই মাসে কোনো ইউটিলিটি খরচের রেকর্ড নেই।
                              </td>
                            </tr>
                          ) : (
                            utilityList.map((u, idx) => {
                              const meta = (() => {
                                switch (u.category) {
                                  case 'KHALA_BILL':
                                    return { name: 'বাবুর্চি / খালা বিল', icon: '👩‍🍳', badge: 'bg-amber-100 text-amber-800' };
                                  case 'GAS_BILL':
                                    return { name: 'গ্যাস সিলিন্ডার / লাইন বিল', icon: '🔥', badge: 'bg-orange-100 text-orange-800' };
                                  case 'FRIDGE_BILL':
                                    return { name: 'ফ্রিজ সার্ভিসিং ও ব্যবহার', icon: '❄️', badge: 'bg-cyan-100 text-cyan-800' };
                                  case 'EXTRA_COST':
                                    return { name: 'বিবিধ / মেস এক্সট্রা খরচ', icon: '📦', badge: 'bg-indigo-100 text-indigo-800' };
                                  default:
                                    return { name: u.category, icon: '⚡', badge: 'bg-slate-100 text-slate-800' };
                                }
                              })();

                              return (
                                <tr
                                  key={u.id}
                                  className={`hover:bg-slate-50 transition-colors ${
                                    idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'
                                  }`}
                                >
                                  <td className="py-3 px-4 font-bold text-slate-800">
                                    <span className="inline-flex items-center gap-1.5">
                                      <span>{meta.icon}</span>
                                      <span>{meta.name}</span>
                                    </span>
                                  </td>
                                  <td className="py-3 px-4 font-semibold text-slate-700">
                                    {u.description || 'মেসের সকল সক্রিয় সদস্যের মাঝে সমানভাবে বিভাজ্য'}
                                  </td>
                                  <td className="py-3 px-4 text-right font-black text-purple-900 text-xs sm:text-sm font-mono whitespace-nowrap">
                                    ৳ {u.amount.toLocaleString()}
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                        <tfoot className="bg-purple-50 text-purple-950 font-black text-xs border-t-2 border-purple-200">
                          <tr>
                            <td colSpan={2} className="py-3 px-4 uppercase">
                              সর্বমোট ইউটিলিটি ({utilityList.length} টি খাত)
                            </td>
                            <td className="py-3 px-4 text-right font-black text-sm text-purple-900 font-mono whitespace-nowrap">
                              ৳ {utilityList.reduce((sum, u) => sum + (Number(u.amount) || 0), 0).toLocaleString()}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                )}

                {/* SUB-TAB 4: TIMELINE FEED */}
                {activitySubTab === 'FEED' && (
                  <div className="space-y-3">
                    {activities.length === 0 && myDeposits.length === 0 && bazarList.length === 0 ? (
                      <div className="p-10 text-center text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                        <Clock className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                        <p className="text-sm font-medium">{selectedMonth} মাসের কোনো অ্যাক্টিভিটি রেকর্ড নেই।</p>
                      </div>
                    ) : (
                      activities.map((act) => {
                        const isMyDeposit = act.targetMemberId === user?.id || (user?.memberId && act.targetMemberId === user.memberId);
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
              </div>
            </div>
          )}
      </>
    )}
  </div>
);
}
