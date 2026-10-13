'use client';

import React, { useState, useEffect } from 'react';
import { Member } from '../../../../lib/types';
import { useDashboard } from '../../../../lib/DashboardContext';
import { Shield, CheckCircle, Calendar, UserCheck } from 'lucide-react';

export default function ManagerAssignmentPage() {
  const { user, selectedMonth, setSelectedMonth, refreshLocks } = useDashboard();
  const [members, setMembers] = useState<Member[]>([]);
  const [monthManagerMap, setMonthManagerMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchMembers();
  }, [selectedMonth]);

  const fetchMembers = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/managers?yearMonth=${selectedMonth}`);
      const data = await res.json();
      setMembers(data.members || []);
      setMonthManagerMap(data.monthManagerMap || {});
      setLoading(false);
    } catch (err) {
      setLoading(false);
    }
  };

  const handleAssignMonthManager = async (memberId: string) => {
    setMessage('');
    try {
      const res = await fetch('/api/admin/managers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          memberId,
          yearMonth: selectedMonth,
          adminName: user?.name || 'Super Admin',
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setMessage(data.message || `সফলভাবে ${selectedMonth} মাসের মেস ম্যানেজার নিয়োগ সম্পন্ন হয়েছে!`);
        await refreshLocks();
        fetchMembers();
      }
    } catch (err) {}
  };

  const currentMonthManagerId = monthManagerMap[selectedMonth];

  return (
    <div className="space-y-6">
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 sm:p-3 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-100 flex-shrink-0">
            <Shield className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-800">মাসভিত্তিক মেস ম্যানেজার নিয়োগ</h2>
            <p className="text-xs text-slate-500">
              সুপার অ্যাডমিন যেকোনো নির্দিষ্ট মাসের জন্য একক মেস ম্যানেজার নির্ধারণ ও দায়িত্ব হস্তান্তর করতে পারেন।
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

      {message && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs sm:text-sm font-semibold rounded-xl flex items-center space-x-2">
          <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>{message}</span>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="font-bold text-slate-800 text-sm sm:text-base">
            অনুমোদিত সদস্য তালিকা ({members.length})
          </div>
          <div className="text-xs font-semibold text-slate-500">
            নির্বাচিত মাস: <span className="font-bold text-emerald-700">{selectedMonth}</span>
          </div>
        </div>

        <div className="divide-y divide-slate-100 text-sm">
          {loading ? (
            <div className="p-8 text-center text-slate-500">সদস্য তালিকা লোড হচ্ছে...</div>
          ) : members.length === 0 ? (
            <div className="p-8 text-center text-slate-500">কোনো অনুমোদিত সদস্য পাওয়া যায়নি।</div>
          ) : (
            members.map((member) => {
              const isCurrentMonthManager = currentMonthManagerId === member.id;

              return (
                <div key={member.id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50 transition-colors">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-slate-900 text-base">{member.name}</span>
                      <span className="bg-slate-100 text-slate-700 text-xs font-semibold px-2 py-0.5 rounded">
                        রুম {member.roomNo}
                      </span>
                      {isCurrentMonthManager && (
                        <span className="bg-emerald-100 text-emerald-800 text-xs font-extrabold px-2.5 py-0.5 rounded-full border border-emerald-300 flex items-center space-x-1">
                          <UserCheck className="w-3.5 h-3.5" />
                          <span>{selectedMonth} মাসের দায়িত্বে</span>
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500">
                      মেম্বার আইডি: <span className="font-semibold text-slate-700">{member.memberId}</span> • ফোন: {member.phone}
                    </p>
                  </div>

                  <div className="flex-shrink-0">
                    {isCurrentMonthManager ? (
                      <span className="inline-block px-4 py-2 bg-emerald-50 text-emerald-700 font-bold text-xs rounded-xl border border-emerald-200">
                        বর্তমানে দায়িত্বে আছেন
                      </span>
                    ) : (
                      <button
                        onClick={() => handleAssignMonthManager(member.id)}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-xl shadow transition-colors"
                      >
                        {selectedMonth} মাসের ম্যানেজার বানান
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
