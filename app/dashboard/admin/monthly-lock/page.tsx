'use client';

import React, { useState, useEffect } from 'react';
import { MonthLock, MonthStatus, Member } from '../../../../lib/types';
import { useDashboard } from '../../../../lib/DashboardContext';
import {
  Lock,
  Unlock,
  CheckCircle,
  Clock,
  CalendarPlus,
  Shield,
  Users,
  UserMinus,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Calendar,
} from 'lucide-react';

export default function MonthlyLockPage() {
  const { user, selectedMonth, setSelectedMonth, refreshLocks, availableMonths } = useDashboard();
  const [locks, setLocks] = useState<MonthLock[]>([]);
  const [approvedMembers, setApprovedMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Next Month Calculation Helper
  const getNextMonthStr = () => {
    const now = new Date();
    const next = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const y = next.getFullYear();
    const m = String(next.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
  };

  const [newMonthValue, setNewMonthValue] = useState(getNextMonthStr());
  const [selectedManagerId, setSelectedManagerId] = useState('');
  const [removedMemberIds, setRemovedMemberIds] = useState<string[]>([]);
  const [showRosterReview, setShowRosterReview] = useState(false);
  const [creatingMonth, setCreatingMonth] = useState(false);

  useEffect(() => {
    fetchLocksAndMembers();
  }, []);

  const fetchLocksAndMembers = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/lock-month`);
      const data = await res.json();
      setLocks(data.monthLocks || []);
      const members: Member[] = data.approvedMembers || [];
      setApprovedMembers(members);

      // Default manager to first approved member if not selected yet
      if (members.length > 0 && !selectedManagerId) {
        setSelectedManagerId(members[0].id);
      }
      setLoading(false);
    } catch (err) {
      setLoading(false);
    }
  };

  const handleSetStatus = async (targetMonth: string, status: MonthStatus) => {
    setMessage(null);
    try {
      const res = await fetch('/api/admin/lock-month', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          yearMonth: targetMonth,
          status,
          adminName: user?.name || 'Super Admin',
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setMessage({
          type: 'success',
          text: `মাস ${targetMonth} এর স্ট্যাটাস সফলভাবে '${status === 'CLOSED' ? 'লক (CLOSED)' : 'চালু (RUNNING)'}' করা হয়েছে।`,
        });
        await refreshLocks();
        fetchLocksAndMembers();
      } else {
        setMessage({
          type: 'error',
          text: data.error || 'স্ট্যাটাস পরিবর্তন ব্যর্থ হয়েছে।',
        });
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'রিকোয়েস্ট ব্যর্থ হয়েছে।' });
    }
  };

  const toggleRemoveMember = (memberId: string) => {
    setRemovedMemberIds((prev) => {
      if (prev.includes(memberId)) {
        return prev.filter((id) => id !== memberId);
      } else {
        // If the removed member was selected as manager, switch manager to another member
        if (selectedManagerId === memberId) {
          const alternative = approvedMembers.find((m) => m.id !== memberId && !prev.includes(m.id));
          if (alternative) setSelectedManagerId(alternative.id);
        }
        return [...prev, memberId];
      }
    });
  };

  const handleCreateNewMonth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMonthValue) return;

    setCreatingMonth(true);
    setMessage(null);

    try {
      const res = await fetch('/api/admin/lock-month', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          yearMonth: newMonthValue,
          status: 'RUNNING',
          managerId: selectedManagerId || undefined,
          removedMemberIds,
          adminName: user?.name || 'Super Admin',
        }),
      });

      const data = await res.json();
      if (res.ok) {
        const mgrObj = approvedMembers.find((m) => m.id === selectedManagerId);
        const mgrText = mgrObj ? ` (ম্যানেজার: ${mgrObj.name})` : '';
        const removedCountText = removedMemberIds.length > 0 ? ` [${removedMemberIds.length} জন সদস্য মেস ত্যাগ করায় নতুন মাস থেকে বাদ দেওয়া হয়েছে]` : '';

        setMessage({
          type: 'success',
          text: `নতুন মাস ${newMonthValue} সফলভাবে চালু হয়েছে${mgrText}! মেম্বার শিট ও ডাটাবেজ সিঙ্ক সম্পন্ন হয়েছে${removedCountText}।`,
        });

        setSelectedMonth(newMonthValue);
        await refreshLocks();
        await fetchLocksAndMembers();
        setRemovedMemberIds([]);
        setShowRosterReview(false);
      } else {
        setMessage({
          type: 'error',
          text: data.error || 'নতুন মাস তৈরি করতে সমস্যা হয়েছে।',
        });
      }
      setCreatingMonth(false);
    } catch (err: any) {
      setCreatingMonth(false);
      setMessage({ type: 'error', text: err.message || 'রিকোয়েস্ট ব্যর্থ হয়েছে।' });
    }
  };

  const currentLock = locks.find((l) => l.yearMonth === selectedMonth);
  const currentStatus: MonthStatus = currentLock ? ((currentLock.status as any) === 'LOCKED' ? 'CLOSED' : currentLock.status) : 'RUNNING';

  const activeRosterCount = approvedMembers.length - removedMemberIds.length;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-emerald-50 text-emerald-700 rounded-2xl border border-emerald-100 flex-shrink-0">
            <Lock className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-extrabold text-slate-800">নতুন মাস চালু ও মাস লক নিয়ন্ত্রণ</h2>
            <p className="text-xs text-slate-500">
              নতুন মাসের হিসাব চক্র শুরু করুন, ম্যানেজার নির্বাচন করুন এবং মেম্বার তালিকা পরিচালনা করুন।
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 bg-slate-100 px-3.5 py-2 rounded-2xl border border-slate-200 self-start sm:self-auto">
          <Clock className="w-4 h-4 text-emerald-600" />
          <span className="text-xs font-semibold text-slate-600">হিসাবের মাস:</span>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="bg-transparent text-sm font-bold text-slate-800 focus:outline-none cursor-pointer"
          >
            {(availableMonths && availableMonths.length > 0 ? availableMonths : [selectedMonth]).map((ym) => (
              <option key={ym} value={ym}>
                {ym} {locks.find((l) => l.yearMonth === ym)?.status === 'CLOSED' ? '🔒' : '🟢'}
              </option>
            ))}
          </select>
        </div>
      </div>

      {message && (
        <div
          className={`p-4 rounded-2xl text-xs sm:text-sm font-bold flex items-center space-x-2.5 shadow-sm ${
            message.type === 'success'
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* SECTION 1: START A NEW MONTH WITH MANAGER & MEMBER ROSTER */}
      <div className="bg-white p-6 sm:p-7 rounded-3xl border border-slate-200 shadow-sm space-y-5">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 bg-emerald-100 text-emerald-800 rounded-xl">
            <CalendarPlus className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-extrabold text-slate-800 text-base">১. নতুন মাসের হিসাব চক্র ও শিট শুরু করুন</h3>
            <p className="text-xs text-slate-500">
              মাসের নাম দিন, ম্যানেজার নির্ধারণ করুন এবং মেস ত্যাগী কোনো সদস্য থাকলে তাকে বাদ দিয়ে নতুন মাস চালু করুন।
            </p>
          </div>
        </div>

        <form onSubmit={handleCreateNewMonth} className="space-y-4 pt-1">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Field A: Year-Month input */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center space-x-1.5">
                <Calendar className="w-4 h-4 text-slate-500" />
                <span>হিসাবের নতুন মাস:</span>
              </label>
              <input
                type="month"
                required
                value={newMonthValue}
                onChange={(e) => setNewMonthValue(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:border-emerald-500 shadow-inner"
              />
            </div>

            {/* Field B: Month Manager selection */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center space-x-1.5">
                <Shield className="w-4 h-4 text-emerald-600" />
                <span>এই মাসের মেস ম্যানেজার:</span>
              </label>
              <select
                value={selectedManagerId}
                onChange={(e) => setSelectedManagerId(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-bold text-slate-800 focus:outline-none focus:border-emerald-500 shadow-inner"
              >
                {approvedMembers
                  .filter((m) => !removedMemberIds.includes(m.id))
                  .map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} (রুম {m.roomNo} • {m.memberId})
                    </option>
                  ))}
              </select>
            </div>
          </div>

          {/* Field C: Member Roster Review & Exclude Options */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center space-x-2">
                <Users className="w-4 h-4 text-purple-600" />
                <span className="text-xs font-bold text-slate-800">
                  নতুন মাসের সদস্য তালিকা: <span className="text-emerald-700 font-extrabold">{activeRosterCount} জন</span>
                  {removedMemberIds.length > 0 && (
                    <span className="text-red-600 ml-1 font-bold">({removedMemberIds.length} জন বাদ দেওয়া হয়েছে)</span>
                  )}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowRosterReview(!showRosterReview)}
                className="text-xs font-bold text-purple-700 hover:text-purple-900 flex items-center space-x-1 self-start sm:self-auto"
              >
                <span>{showRosterReview ? 'তালিকা লুকান' : 'মেম্বার তালিকা দেখুন / বাদ দিন'}</span>
                {showRosterReview ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
            </div>

            {showRosterReview && (
              <div className="mt-3 divide-y divide-slate-200 border-t border-slate-200 pt-2 max-h-64 overflow-y-auto pr-1">
                {approvedMembers.length === 0 ? (
                  <p className="text-xs text-slate-400 py-3 text-center">কোনো অনুমোদিত সদস্য পাওয়া যায়নি।</p>
                ) : (
                  approvedMembers.map((m) => {
                    const isRemoved = removedMemberIds.includes(m.id);
                    const isManager = selectedManagerId === m.id;

                    return (
                      <div key={m.id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                        <div>
                          <div className="font-bold text-slate-800 flex items-center gap-1.5">
                            <span>{m.name}</span>
                            {isManager && (
                              <span className="text-[10px] bg-amber-100 text-amber-900 font-extrabold px-1.5 py-0.2 rounded border border-amber-300">
                                নির্বাচিত ম্যানেজার
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-slate-500">
                            রুম {m.roomNo} • {m.memberId} • {m.phone}
                          </span>
                        </div>

                        <div>
                          {isRemoved ? (
                            <div className="flex items-center space-x-2">
                              <span className="text-[10px] font-bold text-red-700 bg-red-100 px-2 py-0.5 rounded-lg border border-red-200">
                                ❌ নতুন মাস থেকে বাদ
                              </span>
                              <button
                                type="button"
                                onClick={() => toggleRemoveMember(m.id)}
                                className="px-2 py-1 bg-white hover:bg-slate-100 text-slate-700 font-bold rounded-lg border border-slate-300 shadow-sm flex items-center space-x-1"
                                title="পুনরায় তালিকায় অন্তর্ভুক্ত করুন"
                              >
                                <RotateCcw className="w-3 h-3 text-emerald-600" />
                                <span>পূর্বাবস্থায় আনুন</span>
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => toggleRemoveMember(m.id)}
                              className="px-2.5 py-1 bg-white hover:bg-red-50 text-red-700 font-bold rounded-lg border border-red-200 shadow-sm flex items-center space-x-1 transition-colors"
                              title="মেস ছেড়ে দিলে নতুন মাস থেকে বাদ দিন (বিগত মাসের ডাটা নিরাপদ থাকবে)"
                            >
                              <UserMinus className="w-3.5 h-3.5 text-red-500" />
                              <span>বাদ দিন (Remove)</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={creatingMonth || !newMonthValue || activeRosterCount <= 0}
              className="w-full sm:w-auto px-7 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs rounded-xl shadow-lg transition-all disabled:opacity-50 flex items-center justify-center space-x-2"
            >
              <CalendarPlus className="w-4 h-4" />
              <span>{creatingMonth ? 'নতুন মাস তৈরি ও সিঙ্ক হচ্ছে...' : '🚀 নতুন মাস তৈরি ও মেম্বার শিট সিঙ্ক'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* SECTION 2: LOCK / RUNNING STATUS FOR SELECTED MONTH */}
      <div className="bg-white p-6 sm:p-7 rounded-3xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">বর্তমানে নিয়ন্ত্রিত মাস</span>
          <h3 className="text-2xl font-extrabold text-slate-900 mt-0.5">{selectedMonth}</h3>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-slate-500">বর্তমান অবস্থা:</span>
            <span
              className={`font-extrabold uppercase px-3 py-0.5 rounded-full text-xs border ${
                currentStatus === 'CLOSED'
                  ? 'bg-red-50 text-red-700 border-red-200'
                  : 'bg-emerald-50 text-emerald-700 border-emerald-200'
              }`}
            >
              {currentStatus === 'CLOSED' ? '🔒 বন্ধ (CLOSED)' : '🟢 চালু (RUNNING)'}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2.5 sm:gap-3">
          <button
            onClick={() => handleSetStatus(selectedMonth, 'RUNNING')}
            className={`px-4 sm:px-5 py-2.5 text-xs font-bold rounded-xl transition-all shadow-sm ${
              currentStatus === 'RUNNING'
                ? 'bg-emerald-600 text-white shadow-emerald-600/30'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            🟢 হিসাব উন্মুক্ত রাখুন (RUNNING)
          </button>
          <button
            onClick={() => handleSetStatus(selectedMonth, 'CLOSED')}
            className={`px-4 sm:px-5 py-2.5 text-xs font-bold rounded-xl transition-all shadow-sm ${
              currentStatus === 'CLOSED'
                ? 'bg-red-600 text-white shadow-red-600/30'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            🔒 মাস সম্পূর্ণ লক করুন (CLOSED)
          </button>
        </div>
      </div>

      {/* SECTION 3: MONTH AUDIT HISTORY */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 font-extrabold text-slate-800 text-base">
          সকল মাসের হিসাব ও ম্যানেজার ইতিহাস
        </div>
        <div className="divide-y divide-slate-100 text-sm">
          {locks.length === 0 ? (
            <div className="p-8 text-center text-slate-400">এখনও কোনো মাসের লক তথ্য সংরক্ষিত নেই।</div>
          ) : (
            locks.map((lock) => {
              const mgr = approvedMembers.find((m) => m.id === lock.managerId || m.memberId === lock.managerId);
              const isClosed = lock.status === 'CLOSED' || (lock.status as any) === 'LOCKED';

              return (
                <div key={lock.id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50 transition-colors">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-extrabold text-slate-900 text-base">{lock.yearMonth}</span>
                      {mgr && (
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-lg bg-amber-50 text-amber-900 border border-amber-200">
                          ম্যানেজার: {mgr.name} (রুম {mgr.roomNo})
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-slate-400 mt-0.5 block">
                      অ্যাডমিন: {lock.lockedBy} • তারিখ: {new Date(lock.lockedAt).toLocaleDateString('bn-BD')}
                    </span>
                  </div>

                  <div className="flex items-center space-x-3">
                    <span
                      className={`px-3 py-1 text-xs font-extrabold rounded-full border ${
                        isClosed ? 'bg-red-50 text-red-700 border-red-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      }`}
                    >
                      {isClosed ? '🔒 বন্ধ (CLOSED)' : '🟢 চালু (RUNNING)'}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedMonth(lock.yearMonth);
                        handleSetStatus(lock.yearMonth, isClosed ? 'RUNNING' : 'CLOSED');
                      }}
                      className="text-xs text-slate-600 hover:text-slate-900 font-bold underline transition-colors"
                    >
                      {isClosed ? 'চালু করুন' : 'লক করুন'}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
