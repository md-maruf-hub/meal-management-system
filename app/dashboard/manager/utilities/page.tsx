'use client';

import React, { useState, useEffect } from 'react';
import { ExpenseItem, MemberCalculation } from '../../../../lib/types';
import { useDashboard } from '../../../../lib/DashboardContext';
import { Receipt, Plus, Users, User, Pencil, Trash2, Check, X } from 'lucide-react';

export default function UtilitiesPage() {
  const { user, selectedMonth } = useDashboard();
  const [expenses, setExpenses] = useState<ExpenseItem[]>([]);
  const [members, setMembers] = useState<Array<{ id: string; name: string; roomNo: string }>>([]);
  const [category, setCategory] = useState<'KHALA_BILL' | 'GAS_BILL' | 'EXTRA_COST' | 'FRIDGE_BILL'>('KHALA_BILL');
  const [splitType, setSplitType] = useState<'SHARED' | 'CUSTOM'>('SHARED');
  const [memberId, setMemberId] = useState('');
  const [amount, setAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  // Editing State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState('');
  const [editMemberId, setEditMemberId] = useState<string>('');

  useEffect(() => {
    fetchData();
  }, [selectedMonth]);

  const fetchData = async () => {
    try {
      const res = await fetch(`/api/expenses?yearMonth=${selectedMonth}`);
      const data = await res.json();
      setExpenses(data.expenses || []);

      if (data.members && Array.isArray(data.members) && data.members.length > 0) {
        setMembers(data.members);
        if (!memberId) setMemberId(data.members[0].id);
      } else {
        const repRes = await fetch(`/api/reports?yearMonth=${selectedMonth}`);
        const repData = await repRes.json();
        const memList = (repData.report?.memberCalculations || []).map((m: MemberCalculation) => ({
          id: m.memberId,
          name: m.memberName,
          roomNo: m.roomNo,
        }));
        setMembers(memList);
        if (memList.length > 0 && !memberId) setMemberId(memList[0].id);
      }
    } catch (err) {}
  };

  const handleAddUtility = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount) return;
    setSubmitting(true);
    setMessage('');

    try {
      const res = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'UTILITY',
          yearMonth: selectedMonth,
          data: {
            category,
            amount: Number(amount),
            memberId: splitType === 'CUSTOM' ? memberId : null,
          },
        }),
      });

      if (res.ok) {
        setMessage('ইউটিলিটি খরচ সফলভাবে আপডেট করা হয়েছে!');
        setAmount('');
        fetchData();
      }
      setSubmitting(false);
    } catch (err) {
      setSubmitting(false);
    }
  };

  const startEdit = (e: ExpenseItem) => {
    setEditingId(e.id);
    setEditAmount(String(e.amount));
    setEditMemberId(e.memberId || '');
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const handleUpdateUtility = async (id: string) => {
    try {
      const res = await fetch('/api/expenses', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'UTILITY',
          id,
          data: {
            amount: editAmount,
            memberId: editMemberId ? editMemberId : null,
          },
        }),
      });

      if (res.ok) {
        setMessage('ইউটিলিটি খরচ সফলভাবে আপডেট করা হয়েছে!');
        setEditingId(null);
        fetchData();
      }
    } catch (err) {}
  };

  const handleDeleteUtility = async (id: string, catName: string) => {
    if (!confirm(`আপনি কি নিশ্চিত যে এই ইউটিলিটি রেকর্ডটি মুছে ফেলতে চান?`)) return;

    try {
      const res = await fetch(`/api/expenses?id=${id}&type=UTILITY`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setMessage('ইউটিলিটি রেকর্ড সফলভাবে মুছে ফেলা হয়েছে!');
        fetchData();
      }
    } catch (err) {}
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <Receipt className="w-6 h-6 text-emerald-600 flex-shrink-0" />
          <div>
            <h2 className="text-xl font-bold text-slate-800">ইউটিলিটি ও ফিক্সড বিল এন্ট্রি</h2>
            <p className="text-xs text-slate-500">{selectedMonth} মাসের খালা বিল, গ্যাস বিল, মেসের এক্সট্রা খরচ ও ফ্রিজ বিল পরিচালনা করুন</p>
          </div>
        </div>
      </div>

      {message && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-xl">
          {message}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <h3 className="font-bold text-slate-800 text-base flex items-center space-x-2">
            <Plus className="w-4 h-4 text-emerald-600" />
            <span>নতুন ইউটিলিটি বিল যুক্ত করুন</span>
          </h3>

          <form onSubmit={handleAddUtility} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">ইউটিলিটি ক্যাটেগরি</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-semibold"
              >
                <option value="KHALA_BILL">খালা বিল (রান্না)</option>
                <option value="GAS_BILL">গ্যাস বিল</option>
                <option value="EXTRA_COST">মেসের এক্সট্রা খরচ</option>
                <option value="FRIDGE_BILL">ফ্রিজ বিল</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">বণ্টন পদ্ধতি</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setSplitType('SHARED')}
                  className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center space-x-1 border ${
                    splitType === 'SHARED'
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : 'bg-slate-50 text-slate-600 border-slate-200'
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>সবার মাঝে সমান</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSplitType('CUSTOM')}
                  className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center space-x-1 border ${
                    splitType === 'CUSTOM'
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : 'bg-slate-50 text-slate-600 border-slate-200'
                  }`}
                >
                  <User className="w-3.5 h-3.5" />
                  <span>নির্দিষ্ট মেম্বার</span>
                </button>
              </div>
            </div>

            {splitType === 'CUSTOM' && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">নির্দিষ্ট মেম্বার</label>
                <select
                  value={memberId}
                  onChange={(e) => setMemberId(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm"
                >
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} (রুম {m.roomNo})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">মোট বিলের পরিমাণ (টাকা) *</label>
              <input
                type="number"
                step="0.01"
                required
                placeholder="যেমন: ৯২২.৬৮"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-semibold"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl shadow transition-colors"
            >
              {submitting ? 'সংরক্ষণ হচ্ছে...' : 'ইউটিলিটি রেকর্ড যুক্ত করুন'}
            </button>
          </form>
        </div>

        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-200 font-bold text-slate-800 text-base">
            রেকর্ডকৃত ইউটিলিটি বিল ({selectedMonth})
          </div>
          <div className="divide-y divide-slate-100 text-sm">
            {expenses.length === 0 ? (
              <div className="p-8 text-center text-slate-500">এই মাসে কোনো ইউটিলিটি খরচের রেকর্ড নেই।</div>
            ) : (
              expenses.map((e) => {
                const targetMember = members.find((m) => m.id === e.memberId || (m as any).memberId === e.memberId);
                return (
                  <div key={e.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50 transition-colors">
                    <div>
                      <span className="font-semibold text-slate-800 block text-sm">
                        {e.category === 'KHALA_BILL' ? 'খালা বিল (Cook)' : e.category === 'GAS_BILL' ? 'গ্যাস বিল' : e.category === 'FRIDGE_BILL' ? 'ফ্রিজ বিল' : 'মেসের এক্সট্রা খরচ'}
                      </span>
                      <div className="mt-1 flex items-center gap-2">
                        {e.memberId ? (
                          <span className="text-xs bg-amber-50 text-amber-800 font-semibold px-2.5 py-1 rounded-lg border border-amber-200 inline-flex items-center gap-1.5 shadow-sm">
                            <User className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                            <span>নির্দিষ্ট মেম্বার বণ্টন: <strong className="text-slate-900">{targetMember ? `${targetMember.name} (রুম ${targetMember.roomNo})` : e.memberId}</strong></span>
                          </span>
                        ) : (
                          <span className="text-xs bg-emerald-50 text-emerald-800 font-semibold px-2.5 py-1 rounded-lg border border-emerald-200 inline-flex items-center gap-1.5 shadow-sm">
                            <Users className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                            <span>সকল মেম্বারদের মাঝে সমান বণ্টন</span>
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center space-x-3">
                      {editingId === e.id ? (
                        <div className="flex flex-wrap items-center gap-2 bg-slate-100 p-2 rounded-xl border border-slate-200">
                          <input
                            type="number"
                            step="0.01"
                            value={editAmount}
                            onChange={(ev) => setEditAmount(ev.target.value)}
                            className="w-24 p-1.5 border border-slate-300 rounded-lg text-xs font-bold bg-white"
                          />
                          <select
                            value={editMemberId}
                            onChange={(ev) => setEditMemberId(ev.target.value)}
                            className="p-1.5 border border-slate-300 rounded-lg text-xs font-semibold bg-white"
                          >
                            <option value="">সবার মাঝে সমান</option>
                            {members.map((m) => (
                              <option key={m.id} value={m.id}>
                                {m.name} (রুম {m.roomNo})
                              </option>
                            ))}
                          </select>
                          <button
                            onClick={() => handleUpdateUtility(e.id)}
                            className="p-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 shadow-sm transition-colors"
                            title="সংরক্ষণ করুন"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={cancelEdit}
                            className="p-1.5 bg-slate-200 text-slate-600 rounded-lg hover:bg-slate-300 transition-colors"
                            title="বাতিল করুন"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <span className="font-bold text-slate-900 text-base">৳ {e.amount.toFixed(2)}</span>
                          <div className="flex items-center space-x-1">
                            <button
                              onClick={() => startEdit(e)}
                              className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="সম্পাদনা করুন"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteUtility(e.id, e.category)}
                              className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="মুছে ফেলুন"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
