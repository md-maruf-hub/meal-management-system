'use client';

import React, { useState, useEffect } from 'react';
import { Member } from '../../../../lib/types';
import { useDashboard } from '../../../../lib/DashboardContext';
import { UserCheck, Check, X, ShieldAlert } from 'lucide-react';

export default function ApprovalsPage() {
  const { user } = useDashboard();
  const [pendingMembers, setPendingMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionMessage, setActionMessage] = useState('');

  useEffect(() => {
    fetchPending();
  }, []);

  const fetchPending = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/approvals`);
      const data = await res.json();
      setPendingMembers(data.pendingMembers || []);
      setLoading(false);
    } catch (err) {
      setLoading(false);
    }
  };

  const handleAction = async (memberId: string, action: 'APPROVE' | 'REJECT') => {
    setActionMessage('');
    try {
      const res = await fetch('/api/admin/approvals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          memberId,
          action,
          adminName: user?.name || 'Super Admin',
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setActionMessage(
          action === 'APPROVE'
            ? `সদস্য সফলভাবে অনুমোদিত হয়েছে এবং মেম্বার আইডি প্রদান করা হয়েছে: ${data.member?.memberId}`
            : 'সদস্য নিবন্ধনের আবেদন বাতিল করা হয়েছে।'
        );
        fetchPending();
      }
    } catch (err) {}
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 sm:p-3 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-100 flex-shrink-0">
            <UserCheck className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-800">নতুন সদস্য নিবন্ধন অনুমোদন</h2>
            <p className="text-xs text-slate-500">
              নতুন সদস্যদের অ্যাকাউন্ট যাচাই ও অনুমোদন করুন। অনুমোদন পেলে স্বয়ংক্রিয় ইউনিক মেম্বার আইডি (যেমন MLL-2026-001) তৈরি হবে।
            </p>
          </div>
        </div>
      </div>

      {actionMessage && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs sm:text-sm font-semibold rounded-xl">
          {actionMessage}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-200 font-bold text-slate-800 text-sm sm:text-base">
          অপেক্ষমান সদস্য আবেদন ({pendingMembers.length})
        </div>

        <div className="divide-y divide-slate-100 text-sm">
          {loading ? (
            <div className="p-8 text-center text-slate-500">অপেক্ষমান আবেদন তালিকা লোড হচ্ছে...</div>
          ) : pendingMembers.length === 0 ? (
            <div className="p-8 text-center text-slate-500 flex flex-col items-center space-y-2">
              <ShieldAlert className="w-8 h-8 text-slate-400" />
              <span>বর্তমানে কোনো নতুন নিবন্ধন আবেদন অপেক্ষমান নেই।</span>
            </div>
          ) : (
            pendingMembers.map((member) => (
              <div key={member.id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50 transition-colors">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-slate-900 text-base">{member.name}</span>
                    <span className="bg-amber-100 text-amber-800 text-xs font-semibold px-2 py-0.5 rounded">
                      রুম {member.roomNo}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    ফোন: <span className="font-semibold text-slate-700">{member.phone}</span> • ইমেইল: {member.email || 'নেই'} • আবেদনের তারিখ: {member.joinDate}
                  </p>
                  {member.address && (
                    <p className="text-xs text-slate-500">ঠিকানা: {member.address}</p>
                  )}
                </div>

                <div className="flex items-center space-x-2 flex-shrink-0">
                  <button
                    onClick={() => handleAction(member.id, 'APPROVE')}
                    className="flex items-center space-x-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-xl shadow transition-colors"
                  >
                    <Check className="w-4 h-4" />
                    <span>অনুমোদন ও আইডি প্রদান</span>
                  </button>
                  <button
                    onClick={() => handleAction(member.id, 'REJECT')}
                    className="flex items-center space-x-1.5 px-3.5 py-2 bg-red-100 hover:bg-red-200 text-red-700 font-semibold text-xs rounded-xl transition-colors"
                  >
                    <X className="w-4 h-4" />
                    <span>বাতিল</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
