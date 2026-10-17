'use client';

import React, { useState, useEffect } from 'react';
import { Member } from '../../../../lib/types';
import { useDashboard } from '../../../../lib/DashboardContext';
import { Shield, CheckCircle, Calendar, UserCheck, UserMinus, Plus, AlertCircle, Users, Crown, Search } from 'lucide-react';
import DataLoader from '../../../../components/ui/DataLoader';

export default function ManagerAssignmentPage() {
  const { user, selectedMonth, setSelectedMonth, refreshLocks } = useDashboard();
  const [members, setMembers] = useState<Member[]>([]);
  const [assignedManagers, setAssignedManagers] = useState<Member[]>([]);
  const [currentManagerIds, setCurrentManagerIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchManagersData();
  }, [selectedMonth]);

  const fetchManagersData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/managers?yearMonth=${selectedMonth}&t=${Date.now()}`, {
        cache: 'no-store',
      });
      const data = await res.json();
      setMembers(data.members || []);
      setAssignedManagers(data.assignedManagers || []);
      setCurrentManagerIds(data.currentManagerIds || []);
      setLoading(false);
    } catch (err) {
      setLoading(false);
    }
  };

  const handleAddManager = async (memberId: string) => {
    setMessage(null);
    setActionLoadingId(memberId);
    try {
      const res = await fetch('/api/admin/managers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          memberId,
          action: 'ADD',
          yearMonth: selectedMonth,
          adminName: user?.name || 'Super Admin',
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setMessage({ type: 'success', text: data.message });
        await refreshLocks();
        await fetchManagersData();
      } else {
        setMessage({ type: 'error', text: data.error || 'ম্যানেজার নিয়োগ ব্যর্থ হয়েছে।' });
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: 'সার্ভারের সাথে যোগাযোগ করা যায়নি।' });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleRemoveManager = async (memberId: string, memberName: string) => {
    if (!confirm(`আপনি কি নিশ্চিত যে ${selectedMonth} মাসের দায়িত্ব থেকে "${memberName}" কে রিমুভ করতে চান?`)) {
      return;
    }

    setMessage(null);
    setActionLoadingId(memberId);
    try {
      const res = await fetch('/api/admin/managers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          memberId,
          action: 'REMOVE',
          yearMonth: selectedMonth,
          adminName: user?.name || 'Super Admin',
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setMessage({ type: 'success', text: data.message });
        await refreshLocks();
        await fetchManagersData();
      } else {
        setMessage({ type: 'error', text: data.error || 'ম্যানেজার রিমুভ ব্যর্থ হয়েছে।' });
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: 'সার্ভারের সাথে যোগাযোগ করা যায়নি।' });
    } finally {
      setActionLoadingId(null);
    }
  };

  const isMaxReached = assignedManagers.length >= 3;

  const filteredMembers = members.filter((m) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      m.name.toLowerCase().includes(q) ||
      m.memberId.toLowerCase().includes(q) ||
      m.roomNo.toLowerCase().includes(q) ||
      m.phone.includes(q)
    );
  });

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* 1. Header with Month Selector */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 sm:p-3 bg-emerald-50 text-emerald-700 rounded-2xl border border-emerald-100 flex-shrink-0">
            <Crown className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-lg sm:text-xl font-bold text-slate-800">মাসিক ম্যানেজার নিয়োগ ও ব্যবস্থাপনা</h2>
              <span className="text-[11px] font-extrabold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                সর্বোচ্চ ৩ জন
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              যে মাসে যাদের দায়িত্ব দেওয়া হবে, তারা সেই মাসের মিল ও বাজার হিসাব পরিচালনা করবেন। মূল মেম্বার শিটে কোনো পরিবর্তন করতে হবে না।
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 bg-slate-100 px-3.5 py-2 rounded-xl border border-slate-200 self-start sm:self-auto">
          <Calendar className="w-4 h-4 text-slate-500" />
          <span className="text-xs font-semibold text-slate-600">হিসাবের মাস:</span>
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="bg-transparent text-sm font-bold text-slate-800 focus:outline-none cursor-pointer"
          />
        </div>
      </div>

      {/* 2. Notification Message */}
      {message && (
        <div
          className={`p-4 rounded-2xl border flex items-center space-x-3 text-xs sm:text-sm font-semibold shadow-sm ${
            message.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-red-50 border-red-200 text-red-800'
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

      {/* 3. Hero Section: Active Manager Slots for Selected Month (Max 3) */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-6 rounded-3xl text-white shadow-xl space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-700/80 pb-4">
          <div className="flex items-center space-x-2.5">
            <span className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30">
              <Users className="w-5 h-5" />
            </span>
            <div>
              <h3 className="text-base sm:text-lg font-extrabold text-white">
                {selectedMonth} মাসের দায়িত্বপ্রাপ্ত ম্যানেজারবৃন্দ
              </h3>
              <p className="text-xs text-slate-400">
                এই সদস্যরা {selectedMonth} মাসের জন্য মিল, বাজার ও রান্নার দায়িত্ব পালন করতে পারবেন।
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <span className={`px-3 py-1 rounded-full text-xs font-extrabold border ${
              isMaxReached
                ? 'bg-amber-400/20 text-amber-300 border-amber-400/40'
                : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
            }`}>
              {assignedManagers.length} / ৩ জন নিয়োজিত
            </span>
          </div>
        </div>

        {/* 3 Slots Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[0, 1, 2].map((index) => {
            const manager = assignedManagers[index];
            const isAssigned = Boolean(manager);

            if (isAssigned) {
              return (
                <div
                  key={manager.id}
                  className="bg-slate-800/90 border border-emerald-500/40 rounded-2xl p-4 space-y-3 relative overflow-hidden shadow-lg hover:border-emerald-400 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase tracking-wider font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded-full flex items-center space-x-1">
                      <Crown className="w-3 h-3" />
                      <span>ম্যানেজার স্লট #{index + 1}</span>
                    </span>
                    <button
                      onClick={() => handleRemoveManager(manager.id, manager.name)}
                      disabled={actionLoadingId === manager.id}
                      className="text-xs text-red-400 hover:text-red-300 font-bold flex items-center space-x-1 p-1 rounded-lg hover:bg-red-500/10 transition-colors"
                      title="দায়িত্ব থেকে অব্যাহতি দিন"
                    >
                      <UserMinus className="w-3.5 h-3.5" />
                      <span>{actionLoadingId === manager.id ? '...' : 'রিমুভ'}</span>
                    </button>
                  </div>

                  <div>
                    <h4 className="text-base font-extrabold text-white truncate">{manager.name}</h4>
                    <p className="text-xs text-slate-300 mt-0.5">
                      রুম {manager.roomNo} • <span className="font-mono text-emerald-300">{manager.memberId}</span>
                    </p>
                    <p className="text-[11px] text-slate-400 font-mono mt-0.5">{manager.phone}</p>
                  </div>

                  <div className="pt-2 border-t border-slate-700/60 flex items-center justify-between text-[11px] text-emerald-400 font-semibold">
                    <span>স্ট্যাটাস: সক্রিয় দায়িত্ব</span>
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  </div>
                </div>
              );
            }

            return (
              <div
                key={index}
                className="border-2 border-dashed border-slate-700 rounded-2xl p-6 text-center flex flex-col items-center justify-center space-y-2 bg-slate-800/30"
              >
                <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-500 font-bold text-sm">
                  #{index + 1}
                </div>
                <div className="space-y-0.5">
                  <p className="text-xs font-bold text-slate-400">স্লট #{index + 1} খালি</p>
                  <p className="text-[11px] text-slate-500">নিচের তালিকা থেকে সদস্য যুক্ত করুন</p>
                </div>
              </div>
            );
          })}
        </div>

        {isMaxReached && (
          <div className="p-3 bg-amber-950/60 border border-amber-800/80 text-amber-200 text-xs rounded-xl flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0" />
            <span>
              এই মাসের সর্বোচ্চ ৩ জন ম্যানেজার পূর্ণ হয়েছে। অন্য কাউকে দায়িত্ব দিতে চাইলে উপরের যেকোনো ১ জনকে "রিমুভ" করুন।
            </span>
          </div>
        )}
      </div>

      {/* 4. Member Directory for Assignment */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-slate-800 text-base">অনুমোদিত মেম্বার তালিকা ({filteredMembers.length})</h3>
            <p className="text-xs text-slate-500">যেকোনো সদস্যকে এক ক্লিকে {selectedMonth} মাসের ম্যানেজার নিযুক্ত করুন</p>
          </div>

          <div className="relative w-full sm:w-64">
            <input
              type="text"
              placeholder="নাম, আইডি বা রুম দিয়ে খুঁজুন..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-emerald-500 focus:bg-white"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          </div>
        </div>

        <div className="divide-y divide-slate-100 text-sm">
          {loading ? (
            <DataLoader text="মেম্বার তালিকা লোড হচ্ছে..." variant="cards" />
          ) : filteredMembers.length === 0 ? (
            <div className="p-10 text-center text-slate-500 text-xs">কোনো সদস্য পাওয়া যায়নি।</div>
          ) : (
            filteredMembers.map((member) => {
              const isAssigned = currentManagerIds.includes(member.id) || currentManagerIds.includes(member.memberId);
              const isLoadingThis = actionLoadingId === member.id;

              return (
                <div
                  key={member.id}
                  className={`p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
                    isAssigned ? 'bg-emerald-50/50 hover:bg-emerald-50' : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-slate-900 text-base">{member.name}</span>
                      <span className="bg-slate-100 text-slate-700 text-xs font-semibold px-2 py-0.5 rounded-lg border border-slate-200">
                        রুম {member.roomNo}
                      </span>
                      {isAssigned && (
                        <span className="bg-emerald-100 text-emerald-800 text-xs font-extrabold px-2.5 py-0.5 rounded-full border border-emerald-300 flex items-center space-x-1">
                          <Crown className="w-3.5 h-3.5 text-emerald-600" />
                          <span>{selectedMonth} মাসের দায়িত্বে</span>
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500">
                      মেম্বার আইডি: <span className="font-semibold text-slate-700">{member.memberId}</span> • ফোন: {member.phone}
                    </p>
                  </div>

                  <div className="flex-shrink-0">
                    {isAssigned ? (
                      <button
                        onClick={() => handleRemoveManager(member.id, member.name)}
                        disabled={isLoadingThis}
                        className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-700 font-bold text-xs rounded-xl border border-red-200 transition-all flex items-center space-x-1.5 shadow-sm"
                      >
                        <UserMinus className="w-3.5 h-3.5" />
                        <span>{isLoadingThis ? 'প্রসেসিং...' : 'দায়িত্ব প্রত্যাহার করুন'}</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => handleAddManager(member.id)}
                        disabled={isMaxReached || isLoadingThis}
                        className={`px-4 py-2 font-bold text-xs rounded-xl transition-all flex items-center space-x-1.5 shadow-sm ${
                          isMaxReached
                            ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                            : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20'
                        }`}
                        title={isMaxReached ? 'সর্বোচ্চ ৩ জন পূর্ণ হয়েছে' : 'ম্যানেজার নিযুক্ত করুন'}
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>
                          {isLoadingThis
                            ? 'যুক্ত হচ্ছে...'
                            : isMaxReached
                            ? 'স্লট পূর্ণ (৩/৩)'
                            : `${selectedMonth} এর ম্যানেজার বানান`}
                        </span>
                      </button>
                    )}
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
