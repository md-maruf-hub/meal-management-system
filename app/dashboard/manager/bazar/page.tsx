'use client';

import React, { useState, useEffect } from 'react';
import { BazarEntry } from '../../../../lib/types';
import { useDashboard } from '../../../../lib/DashboardContext';
import { ShoppingBag, Plus, Pencil, Trash2, X, Check } from 'lucide-react';
import DataLoader from '../../../../components/ui/DataLoader';
import { toast } from 'sonner';

export default function BazarPage() {
  const { user, selectedMonth } = useDashboard();
  const [bazarEntries, setBazarEntries] = useState<BazarEntry[]>([]);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [shopperName, setShopperName] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Editing state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDate, setEditDate] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editShopperName, setEditShopperName] = useState('');

  useEffect(() => {
    fetchBazar();
  }, [selectedMonth]);

  const fetchBazar = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/expenses?yearMonth=${selectedMonth}&t=${Date.now()}`, { cache: 'no-store' });
      const data = await res.json();
      setBazarEntries(data.bazarEntries || []);
      setLoading(false);
    } catch (err) {
      setLoading(false);
    }
  };

  const handleAddBazar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount) return;
    setSubmitting(true);

    try {
      const res = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'BAZAR',
          yearMonth: selectedMonth,
          managerId: user?.id,
          data: { date, amount, description, shopperName },
        }),
      });

      if (res.ok) {
        toast.success('বাজার খরচ সফলভাবে যুক্ত হয়েছে!');
        setAmount('');
        setDescription('');
        setShopperName('');
        fetchBazar();
      } else {
        toast.error('বাজার খরচ যুক্ত করতে সমস্যা হয়েছে।');
      }
      setSubmitting(false);
    } catch (err) {
      toast.error('নেটওয়ার্ক সমস্যা। আবার চেষ্টা করুন।');
      setSubmitting(false);
    }
  };

  const startEdit = (entry: BazarEntry) => {
    setEditingId(entry.id);
    setEditDate(entry.date);
    setEditAmount(String(entry.amount));
    setEditDescription(entry.description || '');
    setEditShopperName(entry.shopperName || '');
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const handleUpdateBazar = async (id: string) => {
    try {
      const res = await fetch('/api/expenses', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'BAZAR',
          id,
          data: {
            date: editDate,
            amount: editAmount,
            description: editDescription,
            shopperName: editShopperName,
          },
        }),
      });

      if (res.ok) {
        toast.success('বাজার খরচ সফলভাবে আপডেট করা হয়েছে!');
        setEditingId(null);
        fetchBazar();
      } else {
        toast.error('আপডেট ব্যর্থ হয়েছে।');
      }
    } catch (err) {
      toast.error('নেটওয়ার্ক ত্রুটি।');
    }
  };

  const handleDeleteBazar = async (id: string, desc: string) => {
    if (!confirm(`আপনি কি নিশ্চিত যে "${desc || 'এই বাজার এন্ট্রিটি'}" মুছে ফেলতে চান?`)) return;

    try {
      const res = await fetch(`/api/expenses?id=${id}&type=BAZAR`, {
        method: 'DELETE',
      });

      if (res.ok) {
        toast.success('বাজার খরচ সফলভাবে মুছে ফেলা হয়েছে!');
        fetchBazar();
      } else {
        toast.error('মুছতে ব্যর্থ হয়েছে।');
      }
    } catch (err) {
      toast.error('নেটওয়ার্ক ত্রুটি।');
    }
  };

  const totalBazar = bazarEntries.reduce((sum, b) => sum + (b.amount || 0), 0);

  return (
    <div className="space-y-5 page-enter">
      {/* Header Banner */}
      <div className="card p-4 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200">
            <ShoppingBag className="w-6 h-6 flex-shrink-0" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800">বাজার খরচ এন্ট্রি ও হিসাব</h2>
            <p className="text-xs text-slate-500">{selectedMonth} মাসের মেসের দৈনিক বাজার খরচের হিসাব রাখুন</p>
          </div>
        </div>
        <div className="text-left sm:text-right bg-slate-50 p-2.5 px-4 rounded-xl border border-slate-200">
          <span className="text-xs text-slate-500 block">মোট বাজার খরচ ({selectedMonth})</span>
          <span className="text-xl sm:text-2xl font-bold text-emerald-600 font-mono">৳ {totalBazar.toFixed(2)}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Entry Form */}
        <div className="card p-4 sm:p-6 space-y-4">
          <h3 className="font-bold text-slate-800 text-base flex items-center space-x-2">
            <Plus className="w-4 h-4 text-emerald-600" />
            <span>নতুন বাজার খরচ যুক্ত করুন</span>
          </h3>

          <form onSubmit={handleAddBazar} className="space-y-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">তারিখ *</label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">টাকার পরিমাণ (টাকা) *</label>
              <input
                type="number"
                step="0.01"
                required
                placeholder="যেমন: ২৫০০"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">বাজারকারীর নাম</label>
              <input
                type="text"
                placeholder="যেমন: তানভীর / মেহেদী"
                value={shopperName}
                onChange={(e) => setShopperName(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">বাজারের বিবরণ / কি কি কেনা হয়েছে</label>
              <input
                type="text"
                placeholder="যেমন: মাছ, মুরগি, সবজি, চাল"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl shadow-sm transition-all btn-press disabled:opacity-60"
            >
              {submitting ? 'সংরক্ষণ হচ্ছে...' : 'বাজার খরচ যুক্ত করুন'}
            </button>
          </form>
        </div>

        {/* Entries List */}
        <div className="lg:col-span-2 card overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-slate-200 font-bold text-slate-800 text-base flex items-center justify-between">
            <span>বাজার খরচের তালিকা ({selectedMonth})</span>
            <span className="badge bg-emerald-50 text-emerald-700 border border-emerald-200 font-mono">
              {bazarEntries.length} টি রেকর্ড
            </span>
          </div>

          <div className="divide-y divide-slate-100 text-sm">
            {loading ? (
              <DataLoader text="বাজার খরচের তালিকা লোড হচ্ছে..." variant="table" />
            ) : bazarEntries.length === 0 ? (
              <div className="empty-state py-12">
                <ShoppingBag className="w-10 h-10 text-slate-300 mb-2" />
                <p className="text-sm">এই মাসে কোনো বাজার খরচের রেকর্ড পাওয়া যায়নি।</p>
              </div>
            ) : (
              bazarEntries.map((b) => (
                <div key={b.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50 transition-colors">
                  {editingId === b.id ? (
                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-4 gap-2">
                      <input
                        type="date"
                        value={editDate}
                        onChange={(e) => setEditDate(e.target.value)}
                        className="p-1.5 border border-slate-300 rounded-lg text-xs"
                      />
                      <input
                        type="text"
                        placeholder="বাজারকারীর নাম"
                        value={editShopperName}
                        onChange={(e) => setEditShopperName(e.target.value)}
                        className="p-1.5 border border-slate-300 rounded-lg text-xs"
                      />
                      <input
                        type="text"
                        placeholder="বিবরণ"
                        value={editDescription}
                        onChange={(e) => setEditDescription(e.target.value)}
                        className="p-1.5 border border-slate-300 rounded-lg text-xs"
                      />
                      <div className="flex items-center space-x-2">
                        <input
                          type="number"
                          value={editAmount}
                          onChange={(e) => setEditAmount(e.target.value)}
                          className="w-20 p-1.5 border border-slate-300 rounded-lg text-xs font-bold"
                        />
                        <button
                          onClick={() => handleUpdateBazar(b.id)}
                          className="p-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 btn-press"
                          title="সংরক্ষণ"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="p-1.5 bg-slate-200 text-slate-600 rounded-lg hover:bg-slate-300 btn-press"
                          title="বাতিল"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                          <span className="font-bold text-slate-800 text-sm">{b.description || 'বাজার খরচ'}</span>
                          {b.shopperName && (
                            <span className="badge bg-emerald-50 text-emerald-800 border border-emerald-200">
                              🛒 {b.shopperName}
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-slate-400 block">{b.date}</span>
                      </div>
                      <div className="flex items-center justify-between sm:justify-end space-x-4">
                        <span className="font-bold text-slate-900 font-mono text-base">৳ {b.amount.toFixed(2)}</span>
                        <div className="flex items-center space-x-1">
                          <button
                            onClick={() => startEdit(b)}
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors btn-press"
                            title="সম্পাদনা"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteBazar(b.id, b.description)}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors btn-press"
                            title="মুছে ফেলুন"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
