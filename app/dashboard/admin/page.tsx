'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Member, MonthlyReport } from '../../../lib/types';
import { useDashboard } from '../../../lib/DashboardContext';
import { Shield, UserCheck, Lock, ArrowRight, CheckCircle, Trash2, Database } from 'lucide-react';
import DataLoader from '../../../components/ui/DataLoader';

export default function AdminDashboard() {
  const { user, selectedMonth } = useDashboard();
  const [report, setReport] = useState<MonthlyReport | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [loadingMembers, setLoadingMembers] = useState(true);
  const [roleMessage, setRoleMessage] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, [selectedMonth]);

  const fetchData = async () => {
    fetch(`/api/reports?yearMonth=${selectedMonth}`)
      .then((res) => res.json())
      .then((data) => setReport(data.report))
      .catch(() => {});

    fetch('/api/admin/approvals')
      .then((res) => res.json())
      .then((data) => setPendingCount((data.pendingMembers || []).length))
      .catch(() => {});

    setLoadingMembers(true);
    fetch(`/api/admin/managers?yearMonth=${selectedMonth}`)
      .then((res) => res.json())
      .then((data) => {
        setMembers(data.members || []);
        setLoadingMembers(false);
      })
      .catch(() => setLoadingMembers(false));
  };

  const handleToggleManagerRole = async (memberId: string, currentRole: string) => {
    setRoleMessage('');
    setUpdatingId(memberId);
    const newRole = currentRole === 'MANAGER' ? 'MEMBER' : 'MANAGER';

    try {
      const res = await fetch('/api/admin/managers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          memberId,
          newRole,
          adminName: user?.name || 'Super Admin',
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setRoleMessage(
          newRole === 'MANAGER'
            ? `✅ ${data.member?.name}-কে সফলভাবে মেস ম্যানেজার নিয়োগ দেওয়া হয়েছে!`
            : `ℹ️ ${data.member?.name}-এর দায়িত্ব সাধারণ সদস্যে ফিরিয়ে নেওয়া হয়েছে।`
        );
        fetchData();
      }
      setUpdatingId(null);
    } catch (err) {
      setUpdatingId(null);
    }
  };

  const handleDeleteMember = async (memberId: string, name: string) => {
    if (!confirm(`আপনি কি নিশ্চিত যে সদস্য ${name}-কে মুছে ফেলতে চান? তাকে পরবর্তী মাসসমূহ থেকে বাদ দেওয়া হবে।`)) return;

    setRoleMessage('');
    setUpdatingId(memberId);

    try {
      const res = await fetch(`/api/admin/managers?memberId=${memberId}&adminName=${encodeURIComponent(user?.name || 'Super Admin')}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (res.ok) {
        setRoleMessage(`🗑️ সদস্য ${name}-কে সফলভাবে মুছে ফেলা হয়েছে।`);
        fetchData();
      }
      setUpdatingId(null);
    } catch (err) {
      setUpdatingId(null);
    }
  };

  return (
    <div className="space-y-8">
      {/* Super Admin Welcome Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white p-6 sm:p-8 rounded-3xl shadow-xl border border-slate-700/60 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-3 py-1 rounded-full">
              সুপার অ্যাডমিন কন্ট্রোল
            </span>
            <span className="text-xs text-slate-400">সিস্টেম নিয়ন্ত্রণ পোর্টাল</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            স্বাগতম, {user?.name || 'সুপার অ্যাডমিন'}!
          </h2>
          <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
            সম্পূর্ণ প্রশাসনিক নিয়ন্ত্রণ। মেস ম্যানেজার নিয়োগ, নতুন মেম্বার নিবন্ধন অনুমোদন, মাসিক হিসাব লক এবং ডাটাবেজ পর্যবেক্ষণ করুন।
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <Link
            href="/dashboard/admin/approvals"
            className="flex items-center space-x-2 px-5 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm rounded-2xl shadow-lg hover:shadow-emerald-600/30 transition-all"
          >
            <UserCheck className="w-4 h-4" />
            <span>অপেক্ষমাণ অনুমোদন ({pendingCount})</span>
          </Link>
        </div>
      </div>

      {/* Financial Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-2 hover:border-emerald-300 transition-colors">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">মোট মিল ({selectedMonth})</span>
          <p className="text-3xl font-extrabold text-slate-900">{report?.totalMeals || 0} টি</p>
          <p className="text-xs text-emerald-600 font-semibold">
            মিল রেট: ৳ {report?.millRate.toFixed(3) || '0.000'} / মিল
          </p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-2 hover:border-emerald-300 transition-colors">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">মোট বাজার খরচ</span>
          <p className="text-3xl font-extrabold text-slate-900">৳ {report?.totalBazar.toFixed(2) || '0.00'}</p>
          <p className="text-xs text-slate-500">চলতি মাসের বাজার হিসাব</p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-2 hover:border-emerald-300 transition-colors">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">মোট ক্যাশ জমা</span>
          <p className="text-3xl font-extrabold text-emerald-600">৳ {report?.totalDeposits.toFixed(2) || '0.00'}</p>
          <p className="text-xs text-slate-500">মেম্বারদের নিকট থেকে সংগৃহীত</p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-2 hover:border-emerald-300 transition-colors">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">সক্রিয় মেস সদস্য</span>
          <p className="text-3xl font-extrabold text-slate-900">{report?.memberCalculations.length || 0} জন</p>
          <p className="text-xs text-slate-500">সুপার অ্যাডমিন ব্যতীত</p>
        </div>
      </div>

      {/* Manager Role & Member Management Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden space-y-0">
        <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/50">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-lg">সদস্য তালিকা ও ম্যানেজার নিয়োগ</h3>
              <p className="text-xs text-slate-500">
                মেম্বারদের ম্যানেজার দায়িত্ব প্রদান করুন অথবা সদস্য তালিকা পরিচালনা করুন।
              </p>
            </div>
          </div>
        </div>

        {roleMessage && (
          <div className="mx-6 mt-4 p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-2xl flex items-center space-x-2 shadow-sm">
            <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>{roleMessage}</span>
          </div>
        )}

        <div className="divide-y divide-slate-100 text-sm">
          {loadingMembers ? (
            <DataLoader text="মেসের সদস্য তালিকা ও রোল লোড হচ্ছে..." variant="cards" />
          ) : members.length === 0 ? (
            <div className="p-8 text-center text-slate-500">কোনো সক্রিয় সদস্য পাওয়া যায়নি।</div>
          ) : (
            members.map((m) => (
              <div
                key={m.id}
                className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50 transition-colors"
              >
                <div className="space-y-1">
                  <div className="flex items-center space-x-3">
                    <span className="font-bold text-slate-900 text-base">{m.name}</span>
                    <span className="bg-slate-100 text-slate-700 text-xs font-bold px-2.5 py-0.5 rounded-lg border border-slate-200">
                      রুম {m.roomNo}
                    </span>
                    <span
                      className={`text-xs font-extrabold px-3 py-1 rounded-full border ${
                        m.role === 'MANAGER'
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                          : 'bg-slate-100 text-slate-600 border-slate-200'
                      }`}
                    >
                      {m.role === 'MANAGER' ? '👑 মেস ম্যানেজার' : '👤 সদস্য'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    আইডি: <span className="font-semibold text-slate-700">{m.memberId}</span> • ফোন: {m.phone}
                  </p>
                </div>

                <div className="flex items-center space-x-3">
                  {m.role === 'MANAGER' ? (
                    <button
                      onClick={() => handleToggleManagerRole(m.id, m.role)}
                      disabled={updatingId === m.id}
                      className="px-4 py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold text-xs rounded-xl border border-amber-300 transition-all shadow-sm"
                    >
                      {updatingId === m.id ? 'আপডেট হচ্ছে...' : 'ম্যানেজার রোল প্রত্যাহার'}
                    </button>
                  ) : (
                    <button
                      onClick={() => handleToggleManagerRole(m.id, m.role)}
                      disabled={updatingId === m.id}
                      className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow transition-all"
                    >
                      {updatingId === m.id ? 'আপডেট হচ্ছে...' : 'ম্যানেজার নিয়োগ দিন 👑'}
                    </button>
                  )}

                  <button
                    onClick={() => handleDeleteMember(m.id, m.name)}
                    disabled={updatingId === m.id}
                    className="p-2.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl border border-red-200 transition-colors"
                    title="সদস্য মুছে ফেলুন"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Shortcut Action Navigation Cards for 4 Core Responsibilities */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <Link
          href="/dashboard/admin/approvals"
          className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:border-emerald-500 transition-all space-y-3 group"
        >
          <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <UserCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-800 text-base group-hover:text-emerald-600 transition-colors">
              সদস্য অনুমোদন
            </h3>
            <p className="text-xs text-slate-500 mt-1">অপেক্ষমাণ মেম্বার নিবন্ধন অনুমোদন ও মেম্বার আইডি প্রদান করুন।</p>
          </div>
          <div className="flex items-center text-xs font-bold text-emerald-600 space-x-1">
            <span>অনুমোদন দেখুন</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </Link>

        <Link
          href="/dashboard/admin/managers"
          className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:border-emerald-500 transition-all space-y-3 group"
        >
          <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-800 text-base group-hover:text-emerald-600 transition-colors">
              ম্যানেজার নিয়োগ
            </h3>
            <p className="text-xs text-slate-500 mt-1">নির্দিষ্ট মাসের কার্যক্রম পরিচালনার জন্য ম্যানেজার নির্বাচন করুন।</p>
          </div>
          <div className="flex items-center text-xs font-bold text-emerald-600 space-x-1">
            <span>রোল পরিচালনা</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </Link>

        <Link
          href="/dashboard/admin/monthly-lock"
          className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:border-emerald-500 transition-all space-y-3 group"
        >
          <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-800 text-base group-hover:text-emerald-600 transition-colors">
              মাসিক লক ও নতুন মাস
            </h3>
            <p className="text-xs text-slate-500 mt-1">নতুন মাসের হিসাব শুরু করুন অথবা সমাপ্ত মাস লক করুন।</p>
          </div>
          <div className="flex items-center text-xs font-bold text-emerald-600 space-x-1">
            <span>লক ও শুরু করুন</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </Link>

        <Link
          href="/dashboard/admin/database"
          className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:border-emerald-500 transition-all space-y-3 group"
        >
          <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-800 text-base group-hover:text-emerald-600 transition-colors">
              ডাটাবেজ কানেকশন
            </h3>
            <p className="text-xs text-slate-500 mt-1">গুগল শিট কানেকশন ইউআরএল কনফিগার ও সিঙ্ক করুন।</p>
          </div>
          <div className="flex items-center text-xs font-bold text-emerald-600 space-x-1">
            <span>ডাটাবেজ সেটআপ</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </Link>
      </div>
    </div>
  );
}
