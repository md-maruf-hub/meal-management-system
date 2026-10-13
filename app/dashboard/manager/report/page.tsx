'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useDashboard } from '../../../../lib/DashboardContext';
import { MonthlyReport, BazarEntry, ExpenseItem, Deposit } from '../../../../lib/types';
import {
  DollarSign,
  ShoppingBag,
  Utensils,
  TrendingUp,
  Users,
  Wallet,
  Receipt,
  Scale,
  Printer,
  Download,
  Search,
  CheckCircle,
  AlertCircle,
  Clock,
  ArrowUpRight,
  ArrowDownLeft,
  Calendar,
  Lock,
  Unlock,
  RefreshCw,
  Sliders,
  ChevronRight,
  FileSpreadsheet,
} from 'lucide-react';

export default function ManagerTotalReportPage() {
  const { selectedMonth, setSelectedMonth, locks, user } = useDashboard();

  // Local state
  const [report, setReport] = useState<MonthlyReport | null>(null);
  const [bazarList, setBazarList] = useState<BazarEntry[]>([]);
  const [utilityList, setUtilityList] = useState<ExpenseItem[]>([]);
  const [depositsList, setDepositsList] = useState<Deposit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Active Tab: 'MEMBERS' | 'BAZAR' | 'DEPOSITS' | 'UTILITIES'
  const [activeTab, setActiveTab] = useState<'MEMBERS' | 'BAZAR' | 'DEPOSITS' | 'UTILITIES'>('MEMBERS');

  // Search & Filter for Member Table
  const [memberSearch, setMemberSearch] = useState('');
  const [memberFilter, setMemberFilter] = useState<'ALL' | 'DUE' | 'REFUND' | 'ZERO_MEAL'>('ALL');

  // Search for Bazar
  const [bazarSearch, setBazarSearch] = useState('');

  // Search for Deposits
  const [depositSearch, setDepositSearch] = useState('');

  // Lock status
  const currentLock = locks.find((l) => l.yearMonth === selectedMonth);
  const isMonthClosed = currentLock?.status === 'CLOSED' || (currentLock?.status as any) === 'LOCKED';

  useEffect(() => {
    fetchAllData();
  }, [selectedMonth]);

  const fetchAllData = async () => {
    setLoading(true);
    setError('');

    try {
      // 1. Fetch calculated monthly report
      const repPromise = fetch(`/api/reports?yearMonth=${selectedMonth}`).then((r) => r.json());
      // 2. Fetch bazar & utility expenses
      const expPromise = fetch(`/api/expenses?yearMonth=${selectedMonth}`).then((r) => r.json());
      // 3. Fetch deposits
      const depPromise = fetch(`/api/deposits?yearMonth=${selectedMonth}`).then((r) => r.json());

      const [repData, expData, depData] = await Promise.all([repPromise, expPromise, depPromise]);

      if (repData.report) {
        setReport(repData.report);
      } else {
        setReport(null);
      }

      setBazarList(expData.bazarEntries || []);
      setUtilityList(expData.expenses || []);
      setDepositsList(depData.deposits || []);

      setLoading(false);
    } catch (err: any) {
      setError('তথ্য লোড করতে সমস্যা হয়েছে। দয়া করে আবার চেষ্টা করুন।');
      setLoading(false);
    }
  };

  // Calculations for KPI Cards
  const totalActiveMembers = report?.memberCalculations?.length || 0;
  const eatingMembers = (report?.memberCalculations || []).filter((m) => (m.meals || 0) > 0);
  const eatingMembersCount = eatingMembers.length;
  const zeroMealMembersCount = totalActiveMembers - eatingMembersCount;

  // Filtered Members List
  const filteredMembers = (report?.memberCalculations || []).filter((m) => {
    const matchesSearch =
      m.memberName.toLowerCase().includes(memberSearch.toLowerCase()) ||
      m.roomNo.toLowerCase().includes(memberSearch.toLowerCase()) ||
      m.memberId.toLowerCase().includes(memberSearch.toLowerCase());

    if (!matchesSearch) return false;

    const due = m.dueAmount ?? m.giveBalance ?? 0;
    const refund = m.refundAmount ?? m.receiveBalance ?? 0;

    if (memberFilter === 'DUE') return due > 0;
    if (memberFilter === 'REFUND') return refund > 0;
    if (memberFilter === 'ZERO_MEAL') return (m.meals || 0) === 0;

    return true;
  });

  // Filtered Bazar List
  const filteredBazar = bazarList.filter((b) => {
    if (!bazarSearch) return true;
    const term = bazarSearch.toLowerCase();
    return (
      b.description.toLowerCase().includes(term) ||
      b.date.includes(term) ||
      String(b.amount).includes(term)
    );
  });

  // Filtered Deposits List
  const filteredDeposits = depositsList.filter((d) => {
    if (!depositSearch) return true;
    const term = depositSearch.toLowerCase();
    const memName = report?.memberCalculations.find((m) => m.memberId === d.memberId)?.memberName || '';
    return (
      memName.toLowerCase().includes(term) ||
      d.date.includes(term) ||
      String(d.amount).includes(term) ||
      (d.note && d.note.toLowerCase().includes(term))
    );
  });

  // 1-Click Print
  const handlePrint = () => {
    window.print();
  };

  // 1-Click CSV Export
  const handleExportCSV = () => {
    if (!report) return;

    const headers = [
      'Room No',
      'Member Name',
      'Total Meals',
      'Mill Rate',
      'Meal Cost (TK)',
      'Khala Bill (TK)',
      'Gas Bill (TK)',
      'Extra Cost (TK)',
      'Fridge Bill (TK)',
      'Total Utility (TK)',
      'Total Cost (TK)',
      'Total Deposit (TK)',
      'Due / Payable (TK)',
      'Refund / Surplus (TK)',
    ];

    const rows = report.memberCalculations.map((m) => {
      const rec = m.refundAmount ?? m.receiveBalance ?? 0;
      const give = m.dueAmount ?? m.giveBalance ?? 0;
      const utilityTotal = (m.khalaBill || 0) + (m.gasBill || 0) + (m.extraCost || 0) + (m.fridgeBill || 0);

      return [
        m.roomNo,
        `"${m.memberName}"`,
        m.meals,
        report.millRate.toFixed(3),
        m.mealCost.toFixed(2),
        (m.khalaBill || 0).toFixed(2),
        (m.gasBill || 0).toFixed(2),
        (m.extraCost || 0).toFixed(2),
        (m.fridgeBill || 0).toFixed(2),
        utilityTotal.toFixed(2),
        m.totalCost.toFixed(2),
        m.deposit.toFixed(2),
        give.toFixed(2),
        rec.toFixed(2),
      ];
    });

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Manager_Total_Report_${selectedMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header Card */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 sm:p-8 rounded-3xl shadow-xl border border-slate-700/60 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <span className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl">
              <FileSpreadsheet className="w-5 h-5" />
            </span>
            <span className="text-xs font-bold text-emerald-400 tracking-wider uppercase">
              Manager Operations • Executive Overview
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            📊 সর্বমোট হিসাব ও সামগ্রিক রিপোর্ট
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 max-w-2xl">
            চলতি মাসের মোট জমা, বর্তমান ক্যাশ ব্যালেন্স, বাজার খরচ, মিল সংখ্যা ও মিল রেটের সম্পূর্ণ রিয়েল-টাইম তথ্য।
          </p>
        </div>

        {/* Action Buttons & Month Selector */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center space-x-2 bg-slate-800/90 p-1.5 rounded-2xl border border-slate-700">
            <Calendar className="w-4 h-4 text-emerald-400 ml-2" />
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-transparent text-white font-bold text-xs sm:text-sm px-2 py-1.5 focus:outline-none cursor-pointer"
            >
              <option value="2026-07" className="bg-slate-900 text-white">২০২৬ জুলাই (2026-07)</option>
              <option value="2026-08" className="bg-slate-900 text-white">২০২৬ আগস্ট (2026-08)</option>
              <option value="2026-09" className="bg-slate-900 text-white">২০২৬ সেপ্টেম্বর (2026-09)</option>
              <option value="2026-10" className="bg-slate-900 text-white">২০২৬ অক্টোবর (2026-10)</option>
            </select>
          </div>

          <button
            onClick={fetchAllData}
            title="রিফ্রেশ করুন"
            className="p-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-2xl border border-slate-700 transition-colors shadow-sm"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={handleExportCSV}
            title="CSV এক্সপোর্ট করুন"
            className="flex items-center space-x-1.5 px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-2xl border border-slate-700 transition-colors shadow-sm"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            <span className="hidden sm:inline">CSV এক্সপোর্ট</span>
          </button>

          <button
            onClick={handlePrint}
            title="প্রিন্ট / PDF"
            className="flex items-center space-x-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-2xl shadow-md transition-all"
          >
            <Printer className="w-4 h-4" />
            <span>প্রিন্ট / PDF</span>
          </button>
        </div>
      </div>

      {/* Month Status & Quick Shortcuts Banner */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className={`p-2.5 rounded-xl border ${
            isMonthClosed ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
          }`}>
            {isMonthClosed ? <Lock className="w-5 h-5" /> : <Unlock className="w-5 h-5" />}
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-extrabold text-slate-800 text-sm">
                মাস: {selectedMonth}
              </span>
              <span className={`text-[11px] font-extrabold px-2.5 py-0.5 rounded-full border ${
                isMonthClosed ? 'bg-amber-100 text-amber-800 border-amber-300' : 'bg-emerald-100 text-emerald-800 border-emerald-300'
              }`}>
                {isMonthClosed ? '🔒 মাস বন্ধ / ক্লোজড' : '🟢 মাস চলমান (Active)'}
              </span>
            </div>
            <p className="text-xs text-slate-500">
              {report?.assignedManagerName ? `দায়িত্বপ্রাপ্ত ম্যানেজার: ${report.assignedManagerName}` : 'ম্যানেজার পোর্টাল'}
            </p>
          </div>
        </div>

        {/* Quick Operations Links */}
        <div className="flex flex-wrap items-center gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
          <Link
            href="/dashboard/manager/meals"
            className="flex items-center space-x-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors"
          >
            <Utensils className="w-3.5 h-3.5 text-emerald-600" />
            <span>মিল বোর্ড</span>
          </Link>
          <Link
            href="/dashboard/manager/bazar"
            className="flex items-center space-x-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors"
          >
            <ShoppingBag className="w-3.5 h-3.5 text-blue-600" />
            <span>বাজার এন্ট্রি</span>
          </Link>
          <Link
            href="/dashboard/manager/deposits"
            className="flex items-center space-x-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors"
          >
            <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
            <span>জমা গ্রহণ</span>
          </Link>
          <Link
            href="/dashboard/manager/utilities"
            className="flex items-center space-x-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors"
          >
            <Receipt className="w-3.5 h-3.5 text-purple-600" />
            <span>ইউটিলিটি বিল</span>
          </Link>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-800 text-xs font-bold rounded-2xl flex items-center space-x-2">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* 8 MAJOR EXECUTIVE KPI CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Total Deposit */}
        <div className="bg-white p-5 rounded-3xl border-2 border-emerald-200/80 shadow-sm space-y-2 hover:border-emerald-400 transition-all">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-800">
              💰 মোট জমা টাকা
            </span>
            <span className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <DollarSign className="w-4 h-4" />
            </span>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-slate-900">
            {loading ? '...' : `৳ ${(report?.totalDeposits || 0).toLocaleString()}`}
          </p>
          <p className="text-xs text-slate-500 font-medium">
            {depositsList.length} টি জমার এন্ট্রির সর্বমোট হিসেব
          </p>
        </div>

        {/* 2. Cash In Hand (Remaining Money) */}
        <div className={`p-5 rounded-3xl border-2 shadow-sm space-y-2 transition-all ${
          (report?.cashInHand || 0) >= 0
            ? 'bg-white border-blue-200/80 hover:border-blue-400'
            : 'bg-red-50/50 border-red-300 hover:border-red-400'
        }`}>
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-extrabold uppercase tracking-wider text-blue-800">
              💵 বর্তমান ক্যাশ ব্যালেন্স
            </span>
            <span className={`p-2 rounded-xl ${
              (report?.cashInHand || 0) >= 0 ? 'bg-blue-50 text-blue-600' : 'bg-red-100 text-red-600'
            }`}>
              <Wallet className="w-4 h-4" />
            </span>
          </div>
          <p className={`text-2xl sm:text-3xl font-black ${
            (report?.cashInHand || 0) >= 0 ? 'text-blue-900' : 'text-red-700'
          }`}>
            {loading ? '...' : `৳ ${(report?.cashInHand || 0).toLocaleString()}`}
          </p>
          <div className="flex items-center justify-between text-[11px] font-semibold">
            <span className="text-slate-500">
              {(report?.cashInHand || 0) >= 0 ? '🟢 উদ্বৃত্ত (হাতে জমা আছে)' : '🔴 ঘাটতি (মেসের খরচ বেশি)'}
            </span>
          </div>
        </div>

        {/* 3. Total Bazar */}
        <div className="bg-white p-5 rounded-3xl border-2 border-amber-200/80 shadow-sm space-y-2 hover:border-amber-400 transition-all">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-extrabold uppercase tracking-wider text-amber-800">
              🛒 মোট বাজার খরচ
            </span>
            <span className="p-2 bg-amber-50 text-amber-600 rounded-xl">
              <ShoppingBag className="w-4 h-4" />
            </span>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-slate-900">
            {loading ? '...' : `৳ ${(report?.totalBazar || 0).toLocaleString()}`}
          </p>
          <p className="text-xs text-slate-500 font-medium">
            চলতি মাসে {bazarList.length} টি বাজারের মোট খরচ
          </p>
        </div>

        {/* 4. Current Meal Rate */}
        <div className="bg-white p-5 rounded-3xl border-2 border-purple-200/80 shadow-sm space-y-2 hover:border-purple-400 transition-all">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-extrabold uppercase tracking-wider text-purple-800">
              📈 বর্তমান মিল রেট
            </span>
            <span className="p-2 bg-purple-50 text-purple-600 rounded-xl">
              <TrendingUp className="w-4 h-4" />
            </span>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-purple-900">
            {loading ? '...' : `৳ ${(report?.millRate || 0).toFixed(3)}`}
          </p>
          <p className="text-xs text-slate-500 font-medium">
            (মোট বাজার ÷ মোট ভুক্ত মিল)
          </p>
        </div>

        {/* 5. Total Meals */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-2 hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-extrabold uppercase tracking-wider text-slate-700">
              🍽️ সর্বমোট ভুক্ত মিল
            </span>
            <span className="p-2 bg-slate-100 text-slate-600 rounded-xl">
              <Utensils className="w-4 h-4" />
            </span>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-slate-900">
            {loading ? '...' : `${report?.totalMeals || 0} টি`}
          </p>
          <p className="text-xs text-slate-500 font-medium">
            মেম্বার ও মেহমানদের খাওয়া সব মিল
          </p>
        </div>

        {/* 6. Active Eating Members */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-2 hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-extrabold uppercase tracking-wider text-slate-700">
              👥 মিল খাওয়া মেম্বার
            </span>
            <span className="p-2 bg-slate-100 text-slate-600 rounded-xl">
              <Users className="w-4 h-4" />
            </span>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-emerald-700">
            {loading ? '...' : `${eatingMembersCount} জন`}
          </p>
          <p className="text-xs text-slate-500 font-medium">
            মোট {totalActiveMembers} জনের মধ্যে {eatingMembersCount} জন মিল খেয়েছে
          </p>
        </div>

        {/* 7. Total Utilities */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-2 hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-extrabold uppercase tracking-wider text-slate-700">
              ⚡ ইউটিলিটি ও অন্যান্য
            </span>
            <span className="p-2 bg-slate-100 text-slate-600 rounded-xl">
              <Receipt className="w-4 h-4" />
            </span>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-slate-900">
            {loading ? '...' : `৳ ${(report?.totalUtilities || 0).toLocaleString()}`}
          </p>
          <p className="text-xs text-slate-500 font-medium truncate">
            খালা: ৳{report?.totalKhala || 0} • গ্যাস: ৳{report?.totalGas || 0}
          </p>
        </div>

        {/* 8. Total Due vs Total Refund */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-2 hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-extrabold uppercase tracking-wider text-slate-700">
              ⚖️ দেনা-পাওনা সারসংক্ষেপ
            </span>
            <span className="p-2 bg-slate-100 text-slate-600 rounded-xl">
              <Scale className="w-4 h-4" />
            </span>
          </div>
          <div className="flex items-center justify-between pt-1">
            <div>
              <span className="text-[10px] text-red-600 font-bold block uppercase">মেসের পাওনা</span>
              <span className="text-lg font-black text-red-700">৳ {(report?.overallGive || 0).toLocaleString()}</span>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-emerald-600 font-bold block uppercase">ফেরতযোগ্য</span>
              <span className="text-lg font-black text-emerald-700">৳ {(report?.overallReceive || 0).toLocaleString()}</span>
            </div>
          </div>
          <p className="text-[11px] text-slate-400 font-medium">
            মেম্বারদের বকেয়া বনাম অতিরিক্ত জমা
          </p>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 bg-slate-50/70">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setActiveTab('MEMBERS')}
              className={`flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                activeTab === 'MEMBERS'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>মেম্বারদের বিস্তারিত দেনা-পাওনা ({report?.memberCalculations?.length || 0})</span>
            </button>

            <button
              onClick={() => setActiveTab('BAZAR')}
              className={`flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                activeTab === 'BAZAR'
                  ? 'bg-amber-600 text-white shadow-md'
                  : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <ShoppingBag className="w-4 h-4" />
              <span>বাজার খরচের তালিকা ({bazarList.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('DEPOSITS')}
              className={`flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                activeTab === 'DEPOSITS'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <DollarSign className="w-4 h-4" />
              <span>জমার তালিকা ({depositsList.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('UTILITIES')}
              className={`flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                activeTab === 'UTILITIES'
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <Receipt className="w-4 h-4" />
              <span>ইউটিলিটি বিল বন্টন</span>
            </button>
          </div>
        </div>

        {/* TAB 1: MEMBER-BY-MEMBER LEDGER */}
        {activeTab === 'MEMBERS' && (
          <div className="p-4 sm:p-6 space-y-4">
            {/* Filter & Search Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setMemberFilter('ALL')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    memberFilter === 'ALL' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
                  }`}
                >
                  সবাই ({totalActiveMembers})
                </button>
                <button
                  type="button"
                  onClick={() => setMemberFilter('DUE')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    memberFilter === 'DUE' ? 'bg-white text-red-700 shadow-sm' : 'text-slate-600'
                  }`}
                >
                  বকেয়া পাওনা ({report?.memberCalculations.filter((m) => (m.dueAmount ?? m.giveBalance ?? 0) > 0).length})
                </button>
                <button
                  type="button"
                  onClick={() => setMemberFilter('REFUND')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    memberFilter === 'REFUND' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-600'
                  }`}
                >
                  ফেরত পাবে ({report?.memberCalculations.filter((m) => (m.refundAmount ?? m.receiveBalance ?? 0) > 0).length})
                </button>
                <button
                  type="button"
                  onClick={() => setMemberFilter('ZERO_MEAL')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    memberFilter === 'ZERO_MEAL' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-600'
                  }`}
                >
                  মিল ০ ({zeroMealMembersCount})
                </button>
              </div>

              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                <input
                  type="text"
                  value={memberSearch}
                  onChange={(e) => setMemberSearch(e.target.value)}
                  placeholder="নাম বা রুম দিয়ে খুঁজুন..."
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-emerald-500 shadow-sm"
                />
              </div>
            </div>

            {/* Members Ledger Table */}
            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100 text-slate-700 font-extrabold uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-3">রুম</th>
                    <th className="py-3 px-4">সদস্যের নাম</th>
                    <th className="py-3 px-3 text-center">মোট মিল</th>
                    <th className="py-3 px-3 text-right">মিল খরচ (৳)</th>
                    <th className="py-3 px-3 text-right">ইউটিলিটি (৳)</th>
                    <th className="py-3 px-3 text-right">মোট খরচ (৳)</th>
                    <th className="py-3 px-3 text-right font-black text-emerald-800">মোট জমা (৳)</th>
                    <th className="py-3 px-4 text-right">ব্যালেন্স / অবস্থা</th>
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
                    filteredMembers.map((m, idx) => {
                      const due = m.dueAmount ?? m.giveBalance ?? 0;
                      const refund = m.refundAmount ?? m.receiveBalance ?? 0;
                      const utilityTotal = (m.khalaBill || 0) + (m.gasBill || 0) + (m.extraCost || 0) + (m.fridgeBill || 0);

                      return (
                        <tr
                          key={m.memberId}
                          className={`hover:bg-slate-50/80 transition-colors ${
                            idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'
                          }`}
                        >
                          <td className="py-3 px-3 font-extrabold text-slate-700">
                            {m.roomNo}
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-extrabold text-slate-900 text-sm">{m.memberName}</div>
                            <div className="text-[11px] text-slate-400">{m.memberId}</div>
                          </td>
                          <td className="py-3 px-3 text-center font-extrabold text-slate-800">
                            <span className="px-2 py-0.5 rounded-lg bg-slate-100 border border-slate-200">
                              {m.meals}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-right font-bold text-slate-700">
                            ৳ {m.mealCost.toFixed(2)}
                          </td>
                          <td className="py-3 px-3 text-right font-medium text-slate-600">
                            ৳ {utilityTotal.toFixed(2)}
                          </td>
                          <td className="py-3 px-3 text-right font-black text-slate-900">
                            ৳ {m.totalCost.toFixed(2)}
                          </td>
                          <td className="py-3 px-3 text-right font-black text-emerald-700">
                            ৳ {m.deposit.toFixed(2)}
                          </td>
                          <td className="py-3 px-4 text-right">
                            {due > 0 ? (
                              <div className="inline-flex flex-col items-end">
                                <span className="px-2.5 py-0.5 rounded-full bg-red-100 text-red-800 border border-red-200 font-black text-[11px]">
                                  দেনা: ৳ {due.toFixed(2)}
                                </span>
                                <span className="text-[10px] text-red-600 font-semibold mt-0.5">বকেয়া পাওনা</span>
                              </div>
                            ) : refund > 0 ? (
                              <div className="inline-flex flex-col items-end">
                                <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 font-black text-[11px]">
                                  ফেরত পাবে: ৳ {refund.toFixed(2)}
                                </span>
                                <span className="text-[10px] text-emerald-600 font-semibold mt-0.5">উদ্বৃত্ত জমা</span>
                              </div>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 font-bold text-[11px]">
                                সমাপনী ০.০০
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>

                {/* Table Footer Totals */}
                {report && (
                  <tfoot className="bg-slate-800 text-white font-black text-xs border-t-2 border-slate-700">
                    <tr>
                      <td colSpan={2} className="py-3.5 px-4 uppercase tracking-wider">
                        সর্বমোট যোগফল ({report.memberCalculations.length} জন)
                      </td>
                      <td className="py-3.5 px-3 text-center text-amber-300 font-black">
                        {report.totalMeals} টি
                      </td>
                      <td className="py-3.5 px-3 text-right text-slate-200">
                        ৳ {(report.totalBazar || 0).toLocaleString()}
                      </td>
                      <td className="py-3.5 px-3 text-right text-slate-200">
                        ৳ {(report.totalUtilities || 0).toLocaleString()}
                      </td>
                      <td className="py-3.5 px-3 text-right text-amber-400">
                        ৳ {(report.totalCost || 0).toLocaleString()}
                      </td>
                      <td className="py-3.5 px-3 text-right text-emerald-400 font-black">
                        ৳ {(report.totalDeposits || 0).toLocaleString()}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <span className="text-emerald-300 font-bold">
                          ক্যাশ: ৳ {(report.cashInHand || 0).toLocaleString()}
                        </span>
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: BAZAR EXPENSES LIST */}
        {activeTab === 'BAZAR' && (
          <div className="p-4 sm:p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-extrabold text-slate-800 text-sm">
                  চলতি মাসের বাজার খরচের বিবরণী ({bazarList.length} টি এন্ট্রি)
                </h3>
                <p className="text-xs text-slate-500">
                  মোট বাজার খরচ: <span className="font-black text-amber-700">৳ {(report?.totalBazar || 0).toLocaleString()}</span>
                </p>
              </div>

              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                <input
                  type="text"
                  value={bazarSearch}
                  onChange={(e) => setBazarSearch(e.target.value)}
                  placeholder="তারিখ বা বর্ণনা দিয়ে খুঁজুন..."
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-amber-500 shadow-sm"
                />
              </div>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100 text-slate-700 font-extrabold uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4 w-28">তারিখ</th>
                    <th className="py-3 px-4">বাজারের বিবরণ / আইটেমসমূহ</th>
                    <th className="py-3 px-4">বাজারকারী</th>
                    <th className="py-3 px-4 text-right font-black">টাকার পরিমাণ (৳)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredBazar.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-8 text-center text-slate-500">
                        কোনো বাজারের রেকর্ড পাওয়া যায়নি।
                      </td>
                    </tr>
                  ) : (
                    filteredBazar.map((b, idx) => (
                      <tr
                        key={b.id}
                        className={`hover:bg-slate-50/80 transition-colors ${
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
                            <span className="font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-md text-[11px] inline-flex items-center gap-1">
                              <span>👤</span> {b.shopperName}
                            </span>
                          ) : (
                            <span className="text-slate-400 text-xs">—</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right font-black text-amber-800 text-sm">
                          ৳ {b.amount.toLocaleString()}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                <tfoot className="bg-amber-100/70 text-amber-950 font-black text-xs border-t-2 border-amber-300">
                  <tr>
                    <td colSpan={3} className="py-3.5 px-4 uppercase tracking-wider">
                      মোট বাজার খরচ ({filteredBazar.length} টি এন্ট্রি)
                    </td>
                    <td className="py-3.5 px-4 text-right text-base text-amber-900 font-black">
                      ৳ {filteredBazar.reduce((sum, b) => sum + (b.amount || 0), 0).toLocaleString()}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}


        {/* TAB 3: DEPOSITS LIST */}
        {activeTab === 'DEPOSITS' && (
          <div className="p-4 sm:p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-extrabold text-slate-800 text-sm">
                  চলতি মাসের জমার তালিকা ({depositsList.length} টি এন্ট্রি)
                </h3>
                <p className="text-xs text-slate-500">
                  মোট জমা: <span className="font-black text-emerald-700">৳ {(report?.totalDeposits || 0).toLocaleString()}</span>
                </p>
              </div>

              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                <input
                  type="text"
                  value={depositSearch}
                  onChange={(e) => setDepositSearch(e.target.value)}
                  placeholder="মেম্বারের নাম বা তারিখ খুঁজুন..."
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-blue-500 shadow-sm"
                />
              </div>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100 text-slate-700 font-extrabold uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4 w-28">তারিখ</th>
                    <th className="py-3 px-4">মেম্বারের নাম</th>
                    <th className="py-3 px-4">নোট / মন্তব্য</th>
                    <th className="py-3 px-4 text-right font-black text-emerald-800">জমার পরিমাণ (৳)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredDeposits.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-8 text-center text-slate-500">
                        কোনো জমার রেকর্ড পাওয়া যায়নি।
                      </td>
                    </tr>
                  ) : (
                    filteredDeposits.map((d, idx) => {
                      const mem = report?.memberCalculations.find((m) => m.memberId === d.memberId);
                      return (
                        <tr
                          key={d.id}
                          className={`hover:bg-slate-50/80 transition-colors ${
                            idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'
                          }`}
                        >
                          <td className="py-3 px-4 font-bold text-slate-700 whitespace-nowrap">
                            {d.date}
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-extrabold text-slate-900 text-sm">
                              {mem ? mem.memberName : d.memberId}
                            </span>
                            {mem && <span className="text-slate-400 text-[11px] block">Room {mem.roomNo}</span>}
                          </td>
                          <td className="py-3 px-4 text-slate-600 italic">
                            {d.note || '-'}
                          </td>
                          <td className="py-3 px-4 text-right font-black text-emerald-700 text-sm">
                            ৳ {d.amount.toLocaleString()}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
                <tfoot className="bg-emerald-100/70 text-emerald-950 font-black text-xs border-t-2 border-emerald-300">
                  <tr>
                    <td colSpan={3} className="py-3.5 px-4 uppercase tracking-wider">
                      মোট জমা ({filteredDeposits.length} টি এন্ট্রি)
                    </td>
                    <td className="py-3.5 px-4 text-right text-base text-emerald-900 font-black">
                      ৳ {filteredDeposits.reduce((sum, d) => sum + (d.amount || 0), 0).toLocaleString()}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        {/* TAB 4: UTILITY BILLS BREAKDOWN */}
        {activeTab === 'UTILITIES' && (
          <div className="p-4 sm:p-6 space-y-6">
            <div>
              <h3 className="font-extrabold text-slate-800 text-base">
                ইউটিলিটি ও ফিক্সড খরচের বিশ্লেষণ
              </h3>
              <p className="text-xs text-slate-500">
                এই খরচগুলো মেম্বারদের মাঝে ভাগ করে মোট ব্যালেন্সে যোগ করা হয়।
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Khala Bill */}
              <div className="p-5 bg-purple-50/80 rounded-2xl border-2 border-purple-200 space-y-2">
                <span className="text-xs font-black text-purple-800 uppercase tracking-wider block">
                  🧹 খালা বিল (Cook Bill)
                </span>
                <p className="text-2xl font-black text-purple-900">
                  ৳ {(report?.totalKhala || 0).toLocaleString()}
                </p>
                <p className="text-[11px] text-purple-700 font-medium">
                  মাথা পিছু: ৳ {totalActiveMembers > 0 ? ((report?.totalKhala || 0) / totalActiveMembers).toFixed(2) : 0}
                </p>
              </div>

              {/* Gas Bill */}
              <div className="p-5 bg-blue-50/80 rounded-2xl border-2 border-blue-200 space-y-2">
                <span className="text-xs font-black text-blue-800 uppercase tracking-wider block">
                  🔥 গ্যাস বিল (Gas Bill)
                </span>
                <p className="text-2xl font-black text-blue-900">
                  ৳ {(report?.totalGas || 0).toLocaleString()}
                </p>
                <p className="text-[11px] text-blue-700 font-medium">
                  মাথা পিছু: ৳ {totalActiveMembers > 0 ? ((report?.totalGas || 0) / totalActiveMembers).toFixed(2) : 0}
                </p>
              </div>

              {/* Fridge Bill */}
              <div className="p-5 bg-cyan-50/80 rounded-2xl border-2 border-cyan-200 space-y-2">
                <span className="text-xs font-black text-cyan-800 uppercase tracking-wider block">
                  ❄️ ফ্রিজ বিল (Fridge Bill)
                </span>
                <p className="text-2xl font-black text-cyan-900">
                  ৳ {(report?.totalFridge || 0).toLocaleString()}
                </p>
                <p className="text-[11px] text-cyan-700 font-medium">
                  মাথা পিছু: ৳ {totalActiveMembers > 0 ? ((report?.totalFridge || 0) / totalActiveMembers).toFixed(2) : 0}
                </p>
              </div>

              {/* Extra Costs */}
              <div className="p-5 bg-slate-50 rounded-2xl border-2 border-slate-200 space-y-2">
                <span className="text-xs font-black text-slate-800 uppercase tracking-wider block">
                  📦 অন্যান্য / এক্সট্রা খরচ
                </span>
                <p className="text-2xl font-black text-slate-900">
                  ৳ {(report?.totalExtra || 0).toLocaleString()}
                </p>
                <p className="text-[11px] text-slate-600 font-medium">
                  মাথা পিছু: ৳ {totalActiveMembers > 0 ? ((report?.totalExtra || 0) / totalActiveMembers).toFixed(2) : 0}
                </p>
              </div>
            </div>

            {/* Itemized Expenses Table */}
            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100 text-slate-700 font-extrabold uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">ক্যাটেগরি</th>
                    <th className="py-3 px-4">বিবরণ / শিরোনাম</th>
                    <th className="py-3 px-4">নির্দিষ্ট মেম্বার</th>
                    <th className="py-3 px-4 text-right font-black">টাকার পরিমাণ (৳)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {utilityList.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-8 text-center text-slate-500">
                        কোনো ইউটিলিটি খরচের রেকর্ড পাওয়া যায়নি।
                      </td>
                    </tr>
                  ) : (
                    utilityList.map((item, idx) => (
                      <tr
                        key={item.id}
                        className={`hover:bg-slate-50/80 transition-colors ${
                          idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'
                        }`}
                      >
                        <td className="py-3 px-4 font-bold text-slate-800">
                          {item.category}
                        </td>
                        <td className="py-3 px-4 font-medium text-slate-700">
                          {item.description || item.category}
                        </td>
                        <td className="py-3 px-4 text-slate-500">
                          {item.memberId ? `Member ${item.memberId}` : 'সবার মাঝে বন্টন (Shared)'}
                        </td>
                        <td className="py-3 px-4 text-right font-black text-purple-900 text-sm">
                          ৳ {item.amount.toLocaleString()}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                <tfoot className="bg-purple-100/70 text-purple-950 font-black text-xs border-t-2 border-purple-300">
                  <tr>
                    <td colSpan={3} className="py-3.5 px-4 uppercase tracking-wider">
                      সর্বমোট ইউটিলিটি খরচ
                    </td>
                    <td className="py-3.5 px-4 text-right text-base text-purple-900 font-black">
                      ৳ {(report?.totalUtilities || 0).toLocaleString()}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
