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
      const ts = Date.now();
      const [repRes, mealRes, actRes] = await Promise.all([
        fetch(`/api/reports?yearMonth=${selectedMonth}&t=${ts}`, { cache: 'no-store' }).then((r) => r.json()),
        fetch(`/api/meals?yearMonth=${selectedMonth}&t=${ts}`, { cache: 'no-store' }).then((r) => r.json()),
        fetch(`/api/member/activity?yearMonth=${selectedMonth}&t=${ts}`, { cache: 'no-store' }).then((r) => r.json()),
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
    (m) =>
      m.memberId === user?.id ||
      (Boolean(user?.memberId) && m.memberId === user?.memberId) ||
      (Boolean(m.memberName && user?.name) && m.memberName.trim().toLowerCase() === user?.name.trim().toLowerCase())
  );

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
    <div className="space-y-5 page-enter">
      {/* Header */}
      <div className="card p-4 sm:p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="badge bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs">
              ব্যক্তিগত সদস্য হিসাব
            </span>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-800 mt-1.5">
              স্বাগতম, {user?.name || 'সদস্য'}!
            </h2>
            <p className="text-sm text-slate-500 mt-0.5">
              আইডি: <span className="font-semibold text-slate-600">{user?.memberId}</span> • রুম {user?.roomNo}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Manager Badge */}
            {report?.assignedManagers && report.assignedManagers.length > 0 ? (
              <div className="flex items-center space-x-2 bg-amber-50 text-amber-900 border border-amber-200 px-3 py-2 rounded-xl text-xs">
                <span>👑</span>
                <div>
                  <span className="text-xs text-amber-600 font-bold block">ম্যানেজার</span>
                  <span className="font-bold text-slate-700">
                    {report.assignedManagers.map((mgr) => mgr.name).join(', ')}
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex items-center space-x-2 bg-slate-50 text-slate-500 border border-slate-200 px-3 py-2 rounded-xl text-xs">
                <span>👑</span>
                <span>ম্যানেজার: নির্ধারিত নেই</span>
              </div>
            )}

            {/* Cash Balance */}
            <div className="flex items-center space-x-2 bg-emerald-50 text-emerald-800 border border-emerald-200 px-3 py-2 rounded-xl text-xs font-bold">
              <Wallet className="w-4 h-4 text-emerald-600" />
              <div>
                <span className="text-xs text-emerald-600 block font-bold">ক্যাশ ব্যালেন্স</span>
                <span>৳ {report?.cashInHand !== undefined ? report.cashInHand.toFixed(2) : '0.00'}</span>
              </div>
            </div>

            {/* Month Selector */}
            <div className="flex items-center space-x-2 bg-slate-100 p-2 rounded-xl border border-slate-200">
              <CalendarIcon className="w-4 h-4 text-slate-400" />
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="bg-transparent text-sm font-bold text-slate-700 focus:outline-none cursor-pointer"
              />
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <DataLoader
          text="হিসাব লোড হচ্ছে..."
          subtext="গুগল শিট থেকে তথ্য সংগ্রহ করা হচ্ছে..."
          variant="cards"
        />
      ) : !memberData ? (
        <div className="card p-6 bg-amber-50 border-amber-200 text-amber-800 text-sm flex items-center space-x-3">
          <ShieldAlert className="w-5 h-5 flex-shrink-0" />
          <span>{selectedMonth} মাসে আপনার কোনো হিসাব রেকর্ড পাওয়া যায়নি।</span>
        </div>
      ) : (
        <>
          {/* Summary Cards – 2×2 on mobile, 4 cols on desktop */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="card p-4 space-y-1">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-xs font-medium">মোট মিল</span>
                <Utensils className="w-4 h-4 text-emerald-500" />
              </div>
              <p className="stat-value text-slate-800">{memberData.meals} <span className="text-sm font-medium">টি</span></p>
              <p className="text-xs text-slate-400">রেট: ৳ {report?.millRate.toFixed(3) || '0.000'}</p>
            </div>

            <div className="card p-4 space-y-1">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-xs font-medium">খরচের অংশ</span>
                <Receipt className="w-4 h-4 text-emerald-500" />
              </div>
              <p className="stat-value text-slate-800">৳ {memberData.totalCost.toFixed(0)}</p>
              <p className="text-xs text-slate-400">মিল + ইউটিলিটি</p>
            </div>

            <div className="card p-4 space-y-1">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-xs font-medium">মোট জমা</span>
                <DollarSign className="w-4 h-4 text-emerald-500" />
              </div>
              <p className="stat-value text-emerald-600">৳ {memberData.deposit.toFixed(0)}</p>
              <p className="text-xs text-slate-400">ম্যানেজারে জমা</p>
            </div>

            <div className={`card p-4 space-y-1 ${
              dueVal > 0 ? 'bg-red-50 border-red-200' : refundVal > 0 ? 'bg-emerald-50 border-emerald-200' : isSettled || settled > 0 ? 'bg-blue-50 border-blue-200' : ''
            }`}>
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-xs font-bold">ব্যালেন্স</span>
                {dueVal > 0 ? <ArrowUpRight className="w-4 h-4 text-red-500" /> : <ArrowDownLeft className="w-4 h-4 text-emerald-500" />}
              </div>
              {dueVal > 0 ? (
                <div>
                  <p className="stat-value text-red-600">৳ {dueVal.toFixed(0)}</p>
                  <span className="text-xs font-bold text-red-700">বকেয়া (DUE)</span>
                </div>
              ) : refundVal > 0 ? (
                <div>
                  <p className="stat-value text-emerald-600">৳ {refundVal.toFixed(0)}</p>
                  <span className="text-xs font-bold text-emerald-700">ফেরত (REFUND)</span>
                </div>
              ) : isSettled || settled > 0 ? (
                <div>
                  <p className="stat-value text-blue-600">৳ 0</p>
                  <span className="text-xs font-bold text-blue-700">✅ পরিশোধিত</span>
                </div>
              ) : (
                <div>
                  <p className="stat-value text-slate-600">৳ 0</p>
                  <span className="text-xs font-bold text-slate-500">সমান</span>
                </div>
              )}
            </div>
          </div>

          {/* Tab Navigation – scrollable on mobile */}
          <div className="tab-scroll border-b border-slate-200 pb-0">
            {[
              { key: 'BOOKING' as const, icon: <Utensils className="w-4 h-4" />, label: 'মিল বুকিং' },
              { key: 'MATRIX' as const, icon: <CalendarIcon className="w-4 h-4" />, label: 'মিল উপস্থিতি' },
              { key: 'FINANCIAL_ACTIVITY' as const, icon: <FileText className="w-4 h-4" />, label: 'আর্থিক বিবরণী' },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center space-x-1.5 pb-3 text-sm font-bold border-b-2 whitespace-nowrap transition-all btn-press ${
                  activeTab === tab.key
                    ? 'border-emerald-600 text-emerald-600'
                    : 'border-transparent text-slate-400 hover:text-slate-600'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          {/* TAB: MEAL BOOKING */}
          {activeTab === 'BOOKING' && (
            <MealBookingWidget userId={user?.id} selectedMonth={selectedMonth} />
          )}

          {/* TAB: MEAL MATRIX */}
          {activeTab === 'MATRIX' && (
            <div className="card p-4 sm:p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-slate-800 text-base">দৈনিক মিল উপস্থিতি</h3>
                <span className="text-xs font-bold text-emerald-600">
                  মোট: {memberData.meals} টি মিল
                </span>
              </div>

              <div className="grid grid-cols-5 sm:grid-cols-7 lg:grid-cols-10 gap-2">
                {Array.from({ length: 31 }, (_, idx) => idx + 1).map((day) => {
                  const count = memberMealMap[day] || 0;
                  return (
                    <div
                      key={day}
                      className={`p-2.5 rounded-xl border text-center transition-all ${
                        count > 0
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                          : 'bg-slate-50 border-slate-100 text-slate-300'
                      }`}
                    >
                      <span className="text-xs font-medium text-slate-400 block">{day}</span>
                      <span className={`text-lg font-bold block ${count > 0 ? 'text-emerald-600' : 'text-slate-200'}`}>
                        {count}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB: FINANCIAL ACTIVITY */}
          {activeTab === 'FINANCIAL_ACTIVITY' && (
            <div className="space-y-5">
              {/* Financial Statement Card */}
              <div className="card overflow-hidden">
                {/* Header */}
                <div className="p-4 sm:p-5 bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center space-x-2">
                    <span className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl">
                      <FileText className="w-5 h-5" />
                    </span>
                    <div>
                      <h3 className="font-bold text-base sm:text-lg text-white">
                        মাসিক আর্থিক বিবরণী
                      </h3>
                      <p className="text-xs text-slate-400">{selectedMonth} মাসের লেজার ভাউচার</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <span className="bg-white/10 px-3 py-1.5 rounded-xl border border-white/10 text-xs font-bold text-emerald-300">
                      রেট: <span className="text-white font-mono">৳ {report?.millRate.toFixed(3) || '0.000'}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => window.print()}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all btn-press flex items-center space-x-1"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>প্রিন্ট</span>
                    </button>
                  </div>
                </div>

                {/* Quick KPI Strip */}
                <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-y sm:divide-y-0 divide-slate-100 bg-slate-50 border-b border-slate-200 text-xs">
                  {[
                    { label: 'মোট মিল', value: `${memberData.meals} টি`, color: 'text-slate-800' },
                    { label: 'মিল খরচ', value: `৳ ${memberData.mealCost.toFixed(0)}`, color: 'text-emerald-700' },
                    { label: 'ইউটিলিটি', value: `৳ ${(memberData.khalaBill + memberData.gasBill + memberData.extraCost + memberData.fridgeBill).toFixed(0)}`, color: 'text-purple-700' },
                    { label: 'মোট জমা', value: `৳ ${memberData.deposit.toFixed(0)}`, color: 'text-blue-700' },
                  ].map((item, idx) => (
                    <div key={idx} className="p-3 sm:p-4 text-center">
                      <span className="text-xs font-bold text-slate-400 block uppercase">{item.label}</span>
                      <span className={`text-base sm:text-lg font-bold ${item.color}`}>{item.value}</span>
                    </div>
                  ))}
                </div>

                {/* Statement Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs sm:text-sm border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-slate-600 font-bold uppercase text-xs border-b border-slate-200">
                        <th className="py-3 px-4 sm:px-5">খাত</th>
                        <th className="py-3 px-4 hidden sm:table-cell">বিবরণ</th>
                        <th className="py-3 px-4 sm:px-5 text-right">টাকা (৳)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {[
                        { icon: '🍽️', name: 'মিল খরচ', desc: `${memberData.meals} টি × ৳${report?.millRate.toFixed(3)}`, amount: memberData.mealCost, bg: 'bg-emerald-100 text-emerald-700' },
                        { icon: '👩‍🍳', name: 'খালা বিল', desc: 'সমান শেয়ার', amount: memberData.khalaBill, bg: 'bg-amber-100 text-amber-700' },
                        { icon: '🔥', name: 'গ্যাস বিল', desc: 'সমান শেয়ার', amount: memberData.gasBill, bg: 'bg-orange-100 text-orange-700' },
                        { icon: '❄️', name: 'ফ্রিজ বিল', desc: 'সমান শেয়ার', amount: memberData.fridgeBill, bg: 'bg-cyan-100 text-cyan-700' },
                        { icon: '📦', name: 'বিবিধ খরচ', desc: 'যৌথ শেয়ার', amount: memberData.extraCost, bg: 'bg-indigo-100 text-indigo-700' },
                      ].map((row, idx) => (
                        <tr key={idx} className="hover:bg-slate-50 transition-colors">
                          <td className="py-3 px-4 sm:px-5">
                            <div className="flex items-center space-x-2">
                              <span className={`p-1.5 rounded-lg text-sm ${row.bg}`}>{row.icon}</span>
                              <div>
                                <span className="font-bold text-slate-700 block">{row.name}</span>
                                <span className="text-xs text-slate-400 sm:hidden">{row.desc}</span>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-xs text-slate-500 hidden sm:table-cell">{row.desc}</td>
                          <td className="py-3 px-4 sm:px-5 text-right font-bold font-mono text-slate-700">৳ {row.amount.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>

                    <tfoot className="divide-y divide-slate-200 border-t-2 border-slate-300 bg-slate-50">
                      <tr className="font-bold text-slate-800">
                        <td className="py-3 px-4 sm:px-5">সর্বমোট খরচ</td>
                        <td className="py-3 px-4 hidden sm:table-cell text-xs text-slate-400">মিল + ইউটিলিটি</td>
                        <td className="py-3 px-4 sm:px-5 text-right font-bold font-mono text-base">৳ {memberData.totalCost.toFixed(2)}</td>
                      </tr>
                      <tr className="font-bold text-emerald-800 bg-emerald-50/50">
                        <td className="py-3 px-4 sm:px-5">বাদ: মোট জমা</td>
                        <td className="py-3 px-4 hidden sm:table-cell text-xs text-emerald-600">ম্যানেজারে জমা</td>
                        <td className="py-3 px-4 sm:px-5 text-right font-bold font-mono text-base">- ৳ {memberData.deposit.toFixed(2)}</td>
                      </tr>
                      <tr className={`font-bold ${
                        dueVal > 0 ? 'bg-red-50 text-red-800' : refundVal > 0 ? 'bg-emerald-100 text-emerald-900' : isSettled || settled > 0 ? 'bg-blue-50 text-blue-800' : 'bg-slate-100 text-slate-800'
                      }`}>
                        <td className="py-3.5 px-4 sm:px-5">
                          {dueVal > 0 ? '⚠️ বকেয়া (DUE)' : refundVal > 0 ? '💵 ফেরত (REFUND)' : isSettled || settled > 0 ? '✅ পরিশোধিত (SETTLED)' : '✓ সমান'}
                        </td>
                        <td className="py-3.5 px-4 hidden sm:table-cell text-xs font-normal">
                          {dueVal > 0 ? 'ম্যানেজারকে দিতে হবে' : refundVal > 0 ? 'মেস থেকে ফেরত পাবেন' : isSettled || settled > 0 ? (settled > 0 ? `সমন্বিত: ৳ ${settled.toFixed(2)}` : 'পরিশোধিত') : 'বকেয়া নেই'}
                        </td>
                        <td className="py-3.5 px-4 sm:px-5 text-right font-bold font-mono text-lg">
                          {dueVal > 0 ? `৳ ${dueVal.toFixed(2)}` : refundVal > 0 ? `৳ ${refundVal.toFixed(2)}` : '৳ 0.00'}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Activity Hub */}
              <div className="card p-4 sm:p-6 space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="p-2 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-200">
                      <History className="w-5 h-5" />
                    </span>
                    <div>
                      <h3 className="font-bold text-slate-800 text-base">খরচের খতিয়ান ও লেনদেন</h3>
                      <p className="text-xs text-slate-400">{selectedMonth} মাসের বিস্তারিত</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 bg-slate-100 text-slate-600 px-3 py-1.5 rounded-xl text-xs font-bold border border-slate-200">
                    <Wallet className="w-4 h-4 text-slate-400" />
                    <span>ক্যাশ:</span>
                    <span className="font-mono font-bold text-emerald-600">
                      ৳ {report?.cashInHand !== undefined ? report.cashInHand.toFixed(2) : '0.00'}
                    </span>
                  </div>
                </div>

                {/* Summary Pills */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-3 bg-blue-50 rounded-2xl border border-blue-200 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-blue-700 flex items-center gap-1">
                        <ShoppingBag className="w-3.5 h-3.5" /> মোট বাজার
                      </span>
                      <span className="badge bg-blue-100 text-blue-700">{bazarList.length}</span>
                    </div>
                    <p className="text-xl font-bold text-blue-900 font-mono">
                      ৳ {bazarList.reduce((sum, b) => sum + (Number(b.amount) || 0), 0).toLocaleString()}
                    </p>
                  </div>

                  <div className="p-3 bg-purple-50 rounded-2xl border border-purple-200 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-purple-700 flex items-center gap-1">
                        <Receipt className="w-3.5 h-3.5" /> ইউটিলিটি
                      </span>
                      <span className="badge bg-purple-100 text-purple-700">{utilityList.length}</span>
                    </div>
                    <p className="text-xl font-bold text-purple-900 font-mono">
                      ৳ {utilityList.reduce((sum, u) => sum + (Number(u.amount) || 0), 0).toLocaleString()}
                    </p>
                  </div>

                  <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                        <DollarSign className="w-3.5 h-3.5" /> আমার জমা
                      </span>
                      <span className="badge bg-emerald-100 text-emerald-700">{myDeposits.length}</span>
                    </div>
                    <p className="text-xl font-bold text-emerald-900 font-mono">
                      ৳ {myDeposits.reduce((sum, d) => sum + (Number(d.amount) || 0), 0).toLocaleString()}
                    </p>
                  </div>
                </div>

                {/* Sub-Tab Switcher – scrollable */}
                <div className="tab-scroll border-b border-slate-200 pb-0">
                  {[
                    { key: 'MY_DEPOSITS' as const, icon: <DollarSign className="w-3.5 h-3.5" />, label: `জমা (${myDeposits.length})`, color: 'emerald' },
                    { key: 'BAZAR' as const, icon: <ShoppingBag className="w-3.5 h-3.5" />, label: `বাজার (${bazarList.length})`, color: 'blue' },
                    { key: 'UTILITY' as const, icon: <Receipt className="w-3.5 h-3.5" />, label: `ইউটিলিটি (${utilityList.length})`, color: 'purple' },
                    { key: 'FEED' as const, icon: <History className="w-3.5 h-3.5" />, label: `ফিড (${activities.length})`, color: 'slate' },
                  ].map((tab) => (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => setActivitySubTab(tab.key)}
                      className={`flex items-center space-x-1 px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all btn-press ${
                        activitySubTab === tab.key
                          ? `bg-${tab.color}-600 text-white shadow-md`
                          : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                      }`}
                    >
                      {tab.icon}
                      <span>{tab.label}</span>
                    </button>
                  ))}
                </div>

                {/* MY DEPOSITS */}
                {activitySubTab === 'MY_DEPOSITS' && (
                  <div className="space-y-3">
                    {myDeposits.length > 2 && (
                      <div className="relative max-w-sm">
                        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          placeholder="তারিখ বা নোট দিয়ে খুঁজুন..."
                          value={depositSearch}
                          onChange={(e) => setDepositSearch(e.target.value)}
                          className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        />
                      </div>
                    )}

                    {/* Mobile: Card layout / Desktop: Table */}
                    <div className="hidden sm:block overflow-x-auto rounded-2xl border border-slate-200">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead className="bg-slate-50 text-slate-600 font-bold uppercase border-b border-slate-200">
                          <tr>
                            <th className="py-3 px-4 w-28">তারিখ</th>
                            <th className="py-3 px-4">বিবরণ</th>
                            <th className="py-3 px-4 text-right">জমা (৳)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {myDeposits.length === 0 ? (
                            <tr><td colSpan={3} className="p-8 text-center text-slate-400">কোনো জমার রেকর্ড নেই।</td></tr>
                          ) : (
                            myDeposits
                              .filter((d) => !depositSearch.trim() || (d.note || '').toLowerCase().includes(depositSearch.toLowerCase()) || (d.date || '').includes(depositSearch) || String(d.amount || '').includes(depositSearch))
                              .map((d) => (
                                <tr key={d.id} className="hover:bg-slate-50 transition-colors">
                                  <td className="py-3 px-4 font-bold text-slate-600">{d.date}</td>
                                  <td className="py-3 px-4 text-slate-700">{d.note || 'ম্যানেজার কর্তৃক জমা'}</td>
                                  <td className={`py-3 px-4 text-right font-bold font-mono ${d.amount < 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                                    {d.amount < 0 ? `- ৳ ${Math.abs(d.amount).toFixed(2)}` : `৳ ${d.amount.toFixed(2)}`}
                                  </td>
                                </tr>
                              ))
                          )}
                        </tbody>
                        <tfoot className="bg-emerald-50 text-emerald-900 font-bold text-xs border-t-2 border-emerald-300">
                          <tr>
                            <td colSpan={2} className="py-3 px-4">মোট জমা ({myDeposits.length} এন্ট্রি)</td>
                            <td className="py-3 px-4 text-right font-bold font-mono">৳ {myDeposits.reduce((sum, d) => sum + (Number(d.amount) || 0), 0).toFixed(2)}</td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>

                    {/* Mobile cards */}
                    <div className="sm:hidden space-y-2">
                      {myDeposits.length === 0 ? (
                        <div className="empty-state py-8">
                          <DollarSign className="w-8 h-8 text-slate-200 mb-2" />
                          <p className="text-sm">কোনো জমার রেকর্ড নেই</p>
                        </div>
                      ) : (
                        myDeposits
                          .filter((d) => !depositSearch.trim() || (d.note || '').toLowerCase().includes(depositSearch.toLowerCase()) || (d.date || '').includes(depositSearch))
                          .map((d) => (
                            <div key={d.id} className="card p-3 flex items-center justify-between">
                              <div>
                                <p className="text-xs font-bold text-slate-600">{d.date}</p>
                                <p className="text-xs text-slate-400 mt-0.5">{d.note || 'জমা'}</p>
                              </div>
                              <span className={`font-bold font-mono text-sm ${d.amount < 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                                ৳ {Math.abs(d.amount).toFixed(0)}
                              </span>
                            </div>
                          ))
                      )}
                    </div>
                  </div>
                )}

                {/* BAZAR LIST */}
                {activitySubTab === 'BAZAR' && (
                  <div className="space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="relative flex-1 max-w-sm">
                        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          placeholder="বাজারের আইটেম বা তারিখ দিয়ে খুঁজুন..."
                          value={bazarSearch}
                          onChange={(e) => setBazarSearch(e.target.value)}
                          className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                      <span className="badge bg-blue-50 text-blue-700 border border-blue-200 font-mono">
                        মোট: ৳ {bazarList.reduce((sum, b) => sum + (Number(b.amount) || 0), 0).toLocaleString()}
                      </span>
                    </div>

                    {/* Desktop table */}
                    <div className="hidden sm:block overflow-x-auto rounded-2xl border border-slate-200">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead className="bg-slate-50 text-slate-600 font-bold uppercase border-b border-slate-200">
                          <tr>
                            <th className="py-3 px-4 w-28">তারিখ</th>
                            <th className="py-3 px-4">বিবরণ</th>
                            <th className="py-3 px-4 w-32">বাজারকারী</th>
                            <th className="py-3 px-4 text-right w-28">খরচ (৳)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {bazarList.length === 0 ? (
                            <tr><td colSpan={4} className="p-8 text-center text-slate-400">কোনো বাজার এন্ট্রি নেই।</td></tr>
                          ) : (
                            bazarList
                              .filter((b) => !bazarSearch.trim() || (b.description || '').toLowerCase().includes(bazarSearch.toLowerCase()) || (b.shopperName || '').toLowerCase().includes(bazarSearch.toLowerCase()) || (b.date || '').includes(bazarSearch))
                              .map((b, idx) => (
                                <tr key={b.id} className={`hover:bg-slate-50 transition-colors ${idx % 2 ? 'bg-slate-50/40' : ''}`}>
                                  <td className="py-3 px-4 font-bold text-slate-600">{b.date}</td>
                                  <td className="py-3 px-4 text-slate-700">{b.description || 'দৈনিক বাজার'}</td>
                                  <td className="py-3 px-4 text-slate-500">
                                    {b.shopperName ? (
                                      <span className="badge bg-slate-100 text-slate-700 border border-slate-200">👤 {b.shopperName}</span>
                                    ) : '—'}
                                  </td>
                                  <td className="py-3 px-4 text-right font-bold font-mono text-blue-800">৳ {b.amount.toLocaleString()}</td>
                                </tr>
                              ))
                          )}
                        </tbody>
                        <tfoot className="bg-blue-50 text-blue-900 font-bold text-xs border-t-2 border-blue-200">
                          <tr>
                            <td colSpan={3} className="py-3 px-4">সর্বমোট বাজার ({bazarList.length} রেকর্ড)</td>
                            <td className="py-3 px-4 text-right font-bold font-mono">৳ {bazarList.reduce((sum, b) => sum + (Number(b.amount) || 0), 0).toLocaleString()}</td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>

                    {/* Mobile cards */}
                    <div className="sm:hidden space-y-2">
                      {bazarList.length === 0 ? (
                        <div className="empty-state py-8">
                          <ShoppingBag className="w-8 h-8 text-slate-200 mb-2" />
                          <p className="text-sm">কোনো বাজার এন্ট্রি নেই</p>
                        </div>
                      ) : (
                        bazarList
                          .filter((b) => !bazarSearch.trim() || (b.description || '').toLowerCase().includes(bazarSearch.toLowerCase()) || (b.date || '').includes(bazarSearch))
                          .map((b) => (
                            <div key={b.id} className="card p-3 flex items-center justify-between">
                              <div className="min-w-0 flex-1">
                                <p className="text-xs font-bold text-slate-600">{b.date}</p>
                                <p className="text-xs text-slate-500 truncate">{b.description || 'দৈনিক বাজার'}</p>
                                {b.shopperName && <p className="text-xs text-slate-400">👤 {b.shopperName}</p>}
                              </div>
                              <span className="font-bold font-mono text-sm text-blue-700 ml-2">৳ {b.amount.toLocaleString()}</span>
                            </div>
                          ))
                      )}
                    </div>
                  </div>
                )}

                {/* UTILITY LIST */}
                {activitySubTab === 'UTILITY' && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-500">যৌথ খরচের বিভাজন</span>
                      <span className="badge bg-purple-50 text-purple-700 border border-purple-200 font-mono">
                        মোট: ৳ {utilityList.reduce((sum, u) => sum + (Number(u.amount) || 0), 0).toLocaleString()}
                      </span>
                    </div>

                    <div className="space-y-2">
                      {utilityList.length === 0 ? (
                        <div className="empty-state py-8">
                          <Receipt className="w-8 h-8 text-slate-200 mb-2" />
                          <p className="text-sm">কোনো ইউটিলিটি রেকর্ড নেই</p>
                        </div>
                      ) : (
                        utilityList.map((u) => {
                          const meta = (() => {
                            switch (u.category) {
                              case 'KHALA_BILL': return { name: 'খালা বিল', icon: '👩‍🍳', bg: 'bg-amber-50 border-amber-200' };
                              case 'GAS_BILL': return { name: 'গ্যাস বিল', icon: '🔥', bg: 'bg-orange-50 border-orange-200' };
                              case 'FRIDGE_BILL': return { name: 'ফ্রিজ বিল', icon: '❄️', bg: 'bg-cyan-50 border-cyan-200' };
                              case 'EXTRA_COST': return { name: 'বিবিধ খরচ', icon: '📦', bg: 'bg-indigo-50 border-indigo-200' };
                              default: return { name: u.category, icon: '⚡', bg: 'bg-slate-50 border-slate-200' };
                            }
                          })();
                          return (
                            <div key={u.id} className={`card p-3 flex items-center justify-between ${meta.bg}`}>
                              <div className="flex items-center gap-2">
                                <span className="text-lg">{meta.icon}</span>
                                <div>
                                  <p className="text-sm font-bold text-slate-700">{meta.name}</p>
                                  <p className="text-xs text-slate-400">{u.description || 'সদস্যদের সমান শেয়ার'}</p>
                                </div>
                              </div>
                              <span className="font-bold font-mono text-purple-800">৳ {u.amount.toLocaleString()}</span>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}

                {/* TIMELINE FEED */}
                {activitySubTab === 'FEED' && (
                  <div className="space-y-2">
                    {activities.length === 0 ? (
                      <div className="empty-state py-8">
                        <Clock className="w-8 h-8 text-slate-200 mb-2" />
                        <p className="text-sm">{selectedMonth} মাসের কোনো অ্যাক্টিভিটি নেই</p>
                      </div>
                    ) : (
                      activities.map((act) => {
                        const isMyDeposit = act.targetMemberId === user?.id || (user?.memberId && act.targetMemberId === user.memberId);
                        const isBazar = act.action === 'BAZAR_LOGGED';
                        const isUtility = act.action === 'UTILITY_LOGGED';
                        const isMeals = act.action === 'MEALS_UPDATED' || act.action === 'LOCK_AND_SYNC_MEALS';

                        const getConfig = () => {
                          if (isMyDeposit) return { bg: 'bg-emerald-50 border-emerald-200', iconBg: 'bg-emerald-600', icon: <DollarSign className="w-3.5 h-3.5" />, tag: 'জমা', tagBg: 'bg-emerald-600' };
                          if (isBazar) return { bg: 'bg-blue-50 border-blue-200', iconBg: 'bg-blue-600', icon: <ShoppingBag className="w-3.5 h-3.5" />, tag: 'বাজার', tagBg: 'bg-blue-600' };
                          if (isUtility) return { bg: 'bg-purple-50 border-purple-200', iconBg: 'bg-purple-600', icon: <Receipt className="w-3.5 h-3.5" />, tag: 'ইউটিলিটি', tagBg: 'bg-purple-600' };
                          if (isMeals) return { bg: 'bg-slate-50 border-slate-200', iconBg: 'bg-slate-700', icon: <Utensils className="w-3.5 h-3.5" />, tag: 'মিল', tagBg: 'bg-slate-600' };
                          return { bg: 'bg-slate-50 border-slate-200', iconBg: 'bg-slate-600', icon: <History className="w-3.5 h-3.5" />, tag: 'অন্যান্য', tagBg: 'bg-slate-500' };
                        };

                        const cfg = getConfig();

                        return (
                          <div key={act.id} className={`card p-3 flex items-start gap-3 ${cfg.bg}`}>
                            <div className={`p-2 rounded-xl ${cfg.iconBg} text-white flex-shrink-0 mt-0.5`}>
                              {cfg.icon}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-wrap items-center justify-between gap-1 mb-0.5">
                                <span className="flex items-center gap-1.5">
                                  <span className={`text-xs font-bold text-white px-1.5 py-0.5 rounded ${cfg.tagBg}`}>{cfg.tag}</span>
                                  <span className="text-xs text-slate-500">{act.userName || 'ম্যানেজার'}</span>
                                </span>
                                <span className="text-xs text-slate-400">
                                  {new Date(act.timestamp).toLocaleString('bn-BD', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                              <p className="text-xs sm:text-sm text-slate-700 leading-snug">{act.details}</p>
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
