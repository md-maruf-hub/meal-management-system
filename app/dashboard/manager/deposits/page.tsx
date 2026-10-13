'use client';

import React, { useState, useEffect } from 'react';
import { Deposit, MemberCalculation, MonthlyReport } from '../../../../lib/types';
import { useDashboard } from '../../../../lib/DashboardContext';
import { DollarSign, Plus, Pencil, Trash2, Check, X, ShieldAlert, CheckCircle, ArrowRight, DollarSign as CashIcon } from 'lucide-react';

export default function DepositPage() {
  const { user, selectedMonth } = useDashboard();
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [report, setReport] = useState<MonthlyReport | null>(null);
  const [monthStatus, setMonthStatus] = useState<'RUNNING' | 'CLOSED'>('RUNNING');
  const [monthManagerId, setMonthManagerId] = useState<string | null>(null);
  const [members, setMembers] = useState<Array<{ id: string; name: string; roomNo: string }>>([]);
  
  // Deposit Form State
  const [memberId, setMemberId] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  // Settlement Quick Payment Modal/Action State
  const [settlingMember, setSettlingMember] = useState<MemberCalculation | null>(null);
  const [settleAmount, setSettleAmount] = useState('');
  const [settleNote, setSettleNote] = useState('');

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDate, setEditDate] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [editNote, setEditNote] = useState('');

  useEffect(() => {
    fetchData();
  }, [selectedMonth]);

  const fetchData = async () => {
    try {
      // 1. Fetch Month Lock Status
      const lockRes = await fetch(`/api/admin/lock-month`);
      const lockData = await lockRes.json();
      const currentLock = lockData.monthLocks?.find((l: any) => l.yearMonth === selectedMonth);
      const isClosed = currentLock?.status === 'CLOSED' || currentLock?.status === 'LOCKED';
      setMonthStatus(isClosed ? 'CLOSED' : 'RUNNING');
      setMonthManagerId(currentLock?.managerId || null);

      // 2. Fetch Deposits
      const depRes = await fetch(`/api/deposits?yearMonth=${selectedMonth}`);
      const depData = await depRes.json();
      setDeposits(depData.deposits || []);

      // 3. Fetch Monthly Report
      const repRes = await fetch(`/api/reports?yearMonth=${selectedMonth}`);
      const repData = await repRes.json();
      setReport(repData.report || null);

      const memList = (repData.report?.memberCalculations || []).map((m: MemberCalculation) => ({
        id: m.memberId,
        name: m.memberName,
        roomNo: m.roomNo,
      }));
      setMembers(memList);
      if (memList.length > 0) setMemberId(memList[0].id);
    } catch (err) {}
  };

  const isMonthManager = Boolean(
    monthManagerId && (monthManagerId === user?.id || monthManagerId === user?.memberId)
  );
  const canSettle = user?.role === 'SUPER_ADMIN' || isMonthManager;

  const handleAddDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !memberId) return;
    setSubmitting(true);
    setMessage('');

    try {
      const res = await fetch('/api/deposits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          yearMonth: selectedMonth,
          memberId,
          amount,
          date,
          note,
        }),
      });

      if (res.ok) {
        setMessage('সদস্যের জমা সফলভাবে রেকর্ড করা হয়েছে!');
        setAmount('');
        setNote('');
        fetchData();
      }
      setSubmitting(false);
    } catch (err) {
      setSubmitting(false);
    }
  };

  const startSettlement = (m: MemberCalculation) => {
    setSettlingMember(m);
    const targetAmt = m.dueAmount > 0 ? m.dueAmount : m.refundAmount;
    setSettleAmount(targetAmt.toFixed(2));
    setSettleNote(m.dueAmount > 0 ? 'মাস শেষের বকেয়া আদায়' : 'মাস শেষের ফেরত প্রদান');
  };

  const handleExecuteSettlement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settlingMember || !settleAmount) return;

    if (!canSettle) {
      setMessage('অননুমোদিত: শুধুমাত্র এই মাসের দায়িত্বপ্রাপ্ত বিগত ম্যানেজার বা সুপার এডমিন সেটেলমেন্ট করতে পারবেন।');
      return;
    }

    setSubmitting(true);
    setMessage('');

    const type = settlingMember.dueAmount > 0 ? 'DUE_COLLECTION' : 'REFUND_PAYOUT';

    try {
      const res = await fetch('/api/settlements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          yearMonth: selectedMonth,
          memberId: settlingMember.memberId,
          type,
          amount: settleAmount,
          date,
          recordedBy: user?.name || 'Ex-Manager',
          note: settleNote,
        }),
      });

      if (res.ok) {
        setMessage(`সেটেলমেন্ট (${type === 'DUE_COLLECTION' ? 'বকেয়া গ্রহণ' : 'ফেরত প্রদান'}) সফলভাবে সম্পন্ন হয়েছে!`);
        setSettlingMember(null);
        fetchData();
      }
      setSubmitting(false);
    } catch (err) {
      setSubmitting(false);
    }
  };

  const startEdit = (dep: Deposit) => {
    setEditingId(dep.id);
    setEditDate(dep.date);
    setEditAmount(String(dep.amount));
    setEditNote(dep.note || '');
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const handleUpdateDeposit = async (id: string) => {
    try {
      const res = await fetch('/api/deposits', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          amount: editAmount,
          date: editDate,
          note: editNote,
        }),
      });

      if (res.ok) {
        setMessage('জমা এন্ট্রি সফলভাবে আপডেট করা হয়েছে!');
        setEditingId(null);
        fetchData();
      }
    } catch (err) {}
  };

  const handleDeleteDeposit = async (id: string, memName: string) => {
    if (!confirm(`আপনি কি নিশ্চিত যে ${memName}-এর জমা রেকর্ডটি মুছে ফেলতে চান?`)) return;

    try {
      const res = await fetch(`/api/deposits?id=${id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setMessage('জমা রেকর্ড সফলভাবে মুছে ফেলা হয়েছে!');
        fetchData();
      }
    } catch (err) {}
  };

  const totalDeposits = deposits.reduce((sum, d) => sum + (d.amount || 0), 0);

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Banner */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <DollarSign className="w-6 h-6 text-emerald-600 flex-shrink-0" />
          <div>
            <h2 className="text-xl font-bold text-slate-800">সদস্য জমা (ডিপোজিট) ও সেটেলমেন্ট খাতা</h2>
            <p className="text-xs text-slate-500">{selectedMonth} মাসের ক্যাশ জমা, অগ্রিম প্রদান এবং মাস শেষের বকেয়া/ফেরত সমন্বয় করুন</p>
          </div>
        </div>
        <div className="text-right">
          <span className="text-xs text-slate-500 block">মোট রেকর্ডকৃত জমা</span>
          <span className="text-2xl font-extrabold text-emerald-600">৳ {totalDeposits.toFixed(2)}</span>
        </div>
      </div>

      {/* Month Closed Banner Notice */}
      {monthStatus === 'CLOSED' && (
        <div className="p-4 bg-amber-50 border-2 border-amber-300 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-amber-900">
          <div className="flex items-center space-x-3">
            <ShieldAlert className="w-6 h-6 text-amber-600 flex-shrink-0" />
            <div>
              <h4 className="font-extrabold text-sm">{selectedMonth} মাসটি বন্ধ ও লক করা হয়েছে (LOCKED)</h4>
              <p className="text-xs text-amber-700">দৈনিক মিল ও বাজার এন্ট্রি লক করা রয়েছে। দায়িত্বপ্রাপ্ত ম্যানেজারের সেটেলমেন্ট ড্যাশবোর্ড নিচে সক্রিয়।</p>
            </div>
          </div>
          <span className="px-3 py-1 bg-amber-600 text-white font-bold text-xs rounded-xl shadow self-start sm:self-auto">সেটেলমেন্ট মোড</span>
        </div>
      )}

      {message && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-xl flex items-center space-x-2">
          <CheckCircle className="w-4 h-4 text-emerald-600" />
          <span>{message}</span>
        </div>
      )}

      {/* SECTION 1: EX-MANAGER POST-CLOSURE SETTLEMENT ACTION DASHBOARD */}
      {monthStatus === 'CLOSED' && report && report.memberCalculations && report.memberCalculations.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-md overflow-hidden">
          <div className="p-5 border-b border-slate-200 bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center space-x-2">
              <CashIcon className="w-5 h-5 text-emerald-400" />
              <h3 className="font-bold text-base">বকেয়া আদায় ও ফেরত সমন্বয় টেবিল ({selectedMonth})</h3>
            </div>
            {canSettle ? (
              <span className="text-xs text-emerald-300 font-bold bg-emerald-950/80 px-2.5 py-1 rounded-lg border border-emerald-700">
                👑 আপনি এই মাসের বিগত দায়িত্বপ্রাপ্ত ম্যানেজার (সেটেলমেন্ট সক্রিয়)
              </span>
            ) : (
              <span className="text-xs text-amber-300 font-bold bg-amber-950/80 px-2.5 py-1 rounded-lg border border-amber-700">
                🔒 সেটেলমেন্ট শুধুমাত্র দায়িত্বপ্রাপ্ত বিগত ম্যানেজার বা সুপার এডমিন করতে পারবেন
              </span>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-bold uppercase text-[11px] border-b border-slate-200">
                  <th className="p-3 pl-5">রুম / সদস্যের নাম</th>
                  <th className="p-3 text-right">মোট খরচ</th>
                  <th className="p-3 text-right">জমা</th>
                  <th className="p-3 text-center">ব্যালেন্স অবস্থা</th>
                  <th className="p-3 text-center pr-5">সেটেলমেন্ট অ্যাকশন</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {report.memberCalculations.map((m) => {
                  const due = m.dueAmount || 0;
                  const refund = m.refundAmount || 0;
                  return (
                    <tr key={m.memberId} className="hover:bg-slate-50">
                      <td className="p-3 pl-5 font-bold text-slate-800">
                        {m.memberName} <span className="text-slate-400 text-[11px] font-normal">(রুম {m.roomNo})</span>
                      </td>
                      <td className="p-3 text-right text-slate-700 font-mono">৳ {m.totalCost.toFixed(2)}</td>
                      <td className="p-3 text-right text-emerald-700 font-mono font-bold">৳ {m.deposit.toFixed(2)}</td>
                      <td className="p-3 text-center">
                        {m.isSettled ? (
                          <span className="px-2.5 py-1 bg-blue-100 text-blue-800 font-extrabold rounded-full text-[11px]">
                            ✓ পরিশোধিত
                          </span>
                        ) : due > 0 ? (
                          <span className="px-2.5 py-1 bg-red-100 text-red-800 font-extrabold rounded-full text-[11px]">
                            বকেয়া: ৳ {due.toFixed(2)}
                          </span>
                        ) : refund > 0 ? (
                          <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 font-extrabold rounded-full text-[11px]">
                            ফেরত: ৳ {refund.toFixed(2)}
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 bg-slate-100 text-slate-600 font-bold rounded-full text-[11px]">
                            ব্যালেন্সড
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-center pr-5">
                        {m.isSettled ? (
                          <span className="text-xs text-slate-400 font-medium">সম্পূর্ণ</span>
                        ) : !canSettle ? (
                          <span className="text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-1 rounded-md border border-amber-200">
                            🔒 শুধু বিগত ম্যানেজার
                          </span>
                        ) : due > 0 ? (
                          <button
                            onClick={() => startSettlement(m)}
                            className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white font-bold text-xs rounded-xl shadow transition-all flex items-center space-x-1 mx-auto"
                          >
                            <span>বকেয়া গ্রহণ</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        ) : refund > 0 ? (
                          <button
                            onClick={() => startSettlement(m)}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow transition-all flex items-center space-x-1 mx-auto"
                          >
                            <span>ফেরত দিন</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <span className="text-xs text-slate-400 font-medium">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SETTLEMENT MODAL ACTION FORM */}
      {settlingMember && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 max-w-md w-full rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="font-bold text-slate-900 text-base">
                {settlingMember.dueAmount > 0 ? 'সদস্যের বকেয়া টাকা আদায় রেকর্ড' : 'সদস্যের ফেরত টাকা পরিশোধ রেকর্ড'}
              </h3>
              <button onClick={() => setSettlingMember(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleExecuteSettlement} className="space-y-4">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
                <div>সদস্যের নাম: <span className="font-bold text-slate-900">{settlingMember.memberName}</span></div>
                <div>রুম নম্বর: <span className="font-bold text-slate-900">{settlingMember.roomNo}</span></div>
                <div>
                  চলতি নেট স্থিতি:{' '}
                  <span className={`font-extrabold ${settlingMember.dueAmount > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                    {settlingMember.dueAmount > 0 ? `বকেয়া ৳ ${settlingMember.dueAmount.toFixed(2)}` : `ফেরত ৳ ${settlingMember.refundAmount.toFixed(2)}`}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">সেটেলমেন্ট পরিমাণ (টাকা) *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={settleAmount}
                  onChange={(e) => setSettleAmount(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">পদ্ধতি / নোট (যেমন: বিকাশ / ক্যাশ)</label>
                <input
                  type="text"
                  value={settleNote}
                  onChange={(e) => setSettleNote(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSettlingMember(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className={`px-5 py-2 text-xs font-bold text-white rounded-xl shadow transition-colors ${
                    settlingMember.dueAmount > 0 ? 'bg-red-600 hover:bg-red-500' : 'bg-emerald-600 hover:bg-emerald-500'
                  }`}
                >
                  {submitting ? 'প্রসেসিং...' : settlingMember.dueAmount > 0 ? 'বকেয়া গ্রহণ সংরক্ষণ করুন' : 'ফেরত প্রদান সংরক্ষণ করুন'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SECTION 2: REGULAR DEPOSIT ENTRY FORM & HISTORY */}
      <div className={monthStatus === 'CLOSED' ? "w-full" : "grid grid-cols-1 lg:grid-cols-3 gap-6"}>
        {monthStatus !== 'CLOSED' && (
          <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="font-bold text-slate-800 text-base flex items-center space-x-2">
              <Plus className="w-4 h-4 text-emerald-600" />
              <span>নতুন ক্যাশ জমা রেকর্ড করুন</span>
            </h3>

            <form onSubmit={handleAddDeposit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">সদস্য নির্বাচন করুন *</label>
                <select
                  value={memberId}
                  onChange={(e) => setMemberId(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium"
                >
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} (রুম {m.roomNo})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">জমার তারিখ</label>
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">জমার পরিমাণ (টাকা) *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="যেমন: ২৫০০"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">পদ্ধতি / নোট (যেমন: বিকাশ / ক্যাশ)</label>
                <input
                  type="text"
                  placeholder="যেমন: বিকাশ / নগদ টাকা জমা"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl shadow transition-colors"
              >
                {submitting ? 'সংরক্ষণ হচ্ছে...' : 'জমা রেকর্ড সংরক্ষণ করুন'}
              </button>
            </form>
          </div>
        )}

        <div className={monthStatus === 'CLOSED' ? "w-full bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden" : "lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden"}>
          <div className="p-5 border-b border-slate-200 font-bold text-slate-800 text-base">
            জমার খতিয়ান ও ইতিহাস ({selectedMonth})
          </div>
          <div className="divide-y divide-slate-100 text-sm">
            {deposits.length === 0 ? (
              <div className="p-8 text-center text-slate-500">No deposit records found for this month.</div>
            ) : (
              deposits.map((d) => {
                const member = members.find((m) => m.id === d.memberId);
                const memName = member?.name || 'Member';
                return (
                  <div key={d.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50">
                    {editingId === d.id ? (
                      <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <input
                          type="date"
                          value={editDate}
                          onChange={(e) => setEditDate(e.target.value)}
                          className="p-1.5 border border-slate-300 rounded text-xs"
                        />
                        <input
                          type="text"
                          value={editNote}
                          onChange={(e) => setEditNote(e.target.value)}
                          className="p-1.5 border border-slate-300 rounded text-xs"
                        />
                        <div className="flex items-center space-x-2">
                          <input
                            type="number"
                            value={editAmount}
                            onChange={(e) => setEditAmount(e.target.value)}
                            className="w-24 p-1.5 border border-slate-300 rounded text-xs font-bold"
                          />
                          <button
                            onClick={() => handleUpdateDeposit(d.id)}
                            className="p-1.5 bg-emerald-600 text-white rounded hover:bg-emerald-500"
                            title="Save Update"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={cancelEdit}
                            className="p-1.5 bg-slate-200 text-slate-600 rounded hover:bg-slate-300"
                            title="Cancel"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div>
                          <span className="font-semibold text-slate-800 block">
                            {memName} (Room {member?.roomNo || '-'})
                          </span>
                          <span className="text-xs text-slate-500">{d.date} • {d.note || 'Cash Deposit'}</span>
                        </div>
                        <div className="flex items-center space-x-4">
                          <span className={`font-bold text-base ${d.amount < 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                            {d.amount < 0 ? `- ৳ ${Math.abs(d.amount).toFixed(2)}` : `৳ ${d.amount.toFixed(2)}`}
                          </span>
                          <div className="flex items-center space-x-1">
                            <button
                              onClick={() => startEdit(d)}
                              className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Edit Record"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteDeposit(d.id, memName)}
                              className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Delete Record"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </>
                    )}
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
