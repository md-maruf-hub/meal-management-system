'use client';

import React, { useState, useEffect } from 'react';
import { BazarEntry } from '../../../../lib/types';
import { useDashboard } from '../../../../lib/DashboardContext';
import { ShoppingBag, Plus, Pencil, Trash2, X, Check } from 'lucide-react';
import DataLoader from '../../../../components/ui/DataLoader';

export default function BazarPage() {
  const { user, selectedMonth } = useDashboard();
  const [bazarEntries, setBazarEntries] = useState<BazarEntry[]>([]);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [shopperName, setShopperName] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');

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
      const res = await fetch(`/api/expenses?yearMonth=${selectedMonth}`);
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
    setMessage('');

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
        setMessage('বাজার খরচ সফলভাবে যুক্ত হয়েছে!');
        setAmount('');
        setDescription('');
        setShopperName('');
        fetchBazar();
      }
      setSubmitting(false);
    } catch (err) {
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
        setMessage('বাজার খরচ সফলভাবে আপডেট করা হয়েছে!');
        setEditingId(null);
        fetchBazar();
      }
    } catch (err) {}
  };

  const handleDeleteBazar = async (id: string, desc: string) => {
    if (!confirm(`আপনি কি নিশ্চিত যে "${desc || 'এই বাজার এন্ট্রিটি'}" মুছে ফেলতে চান?`)) return;

    try {
      const res = await fetch(`/api/expenses?id=${id}&type=BAZAR`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setMessage('বাজার খরচ সফলভাবে মুছে ফেলা হয়েছে!');
        fetchBazar();
      }
    } catch (err) {}
  };

  const totalBazar = bazarEntries.reduce((sum, b) => sum + (b.amount || 0), 0);

  return (
    <div className="space-y-6">
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <ShoppingBag className="w-6 h-6 text-emerald-600 flex-shrink-0" />
          <div>
            <h2 className="text-xl font-bold text-slate-800">বাজার খরচ এন্ট্রি ও হিসাব</h2>
            <p className="text-xs text-slate-500">{selectedMonth} মাসের মেসের দৈনিক বাজার খরচের হিসাব রাখুন ও পরিচালনা করুন</p>
          </div>
        </div>
        <div className="text-right">
          <span className="text-xs text-slate-500 block">মোট বাজার খরচ (চলতি মাস)</span>
          <span className="text-2xl font-extrabold text-emerald-600">৳ {totalBazar.toFixed(2)}</span>
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
            <span>নতুন বাজার খরচ যুক্ত করুন</span>
          </h3>

          <form onSubmit={handleAddBazar} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">তারিখ *</label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm"
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
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-semibold"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">বাজারকারীর নাম (কে বাজার করেছে?)</label>
              <input
                type="text"
                placeholder="যেমন: তানভীর / মেহেদী / রফিক"
                value={shopperName}
                onChange={(e) => setShopperName(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">বাজারের বিবরণ / কি কি কেনা হয়েছে</label>
              <input
                type="text"
                placeholder="যেমন: মাছ, মুরগি, সবজি, চাল"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl shadow transition-colors"
            >
              {submitting ? 'সংরক্ষণ হচ্ছে...' : 'বাজার খরচ যুক্ত করুন'}
            </button>
          </form>
        </div>

        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-200 font-bold text-slate-800 text-base">
            বাজার খরচের তালিকা ({selectedMonth})
          </div>
          <div className="divide-y divide-slate-100 text-sm">
            {loading ? (
              <DataLoader text="বাজার খরচের তালিকা লোড হচ্ছে..." variant="table" />
            ) : bazarEntries.length === 0 ? (
              <div className="p-8 text-center text-slate-500">এই মাসে কোনো বাজার খরচের রেকর্ড পাওয়া যায়নি।</div>
            ) : (
              bazarEntries.map((b) => (
                <div key={b.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50">
                  {editingId === b.id ? (
                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-4 gap-2">
                      <input
                        type="date"
                        value={editDate}
                        onChange={(e) => setEditDate(e.target.value)}
                        className="p-1.5 border border-slate-300 rounded text-xs"
                      />
                      <input
                        type="text"
                        placeholder="বাজারকারীর নাম"
                        value={editShopperName}
                        onChange={(e) => setEditShopperName(e.target.value)}
                        className="p-1.5 border border-slate-300 rounded text-xs"
                      />
                      <input
                        type="text"
                        placeholder="বিবরণ"
                        value={editDescription}
                        onChange={(e) => setEditDescription(e.target.value)}
                        className="p-1.5 border border-slate-300 rounded text-xs"
                      />
                      <div className="flex items-center space-x-2">
                        <input
                          type="number"
                          value={editAmount}
                          onChange={(e) => setEditAmount(e.target.value)}
                          className="w-20 p-1.5 border border-slate-300 rounded text-xs font-bold"
                        />
                        <button
                          onClick={() => handleUpdateBazar(b.id)}
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
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                          <span className="font-bold text-slate-800 text-sm">{b.description || 'বাজার খরচ'}</span>
                          {b.shopperName && (
                            <span className="text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-0.5 rounded-full inline-flex items-center space-x-1">
                              <span>🛒 বাজারকারী:</span>
                              <span className="font-extrabold">{b.shopperName}</span>
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-slate-500 block">{b.date}</span>
                      </div>
                      <div className="flex items-center space-x-4">
                        <span className="font-bold text-slate-900 text-base">৳ {b.amount.toFixed(2)}</span>
                        <div className="flex items-center space-x-1">
                          <button
                            onClick={() => startEdit(b)}
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Edit Record"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteBazar(b.id, b.description)}
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
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
