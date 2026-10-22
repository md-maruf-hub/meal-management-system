'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useDashboard } from '../../../../lib/DashboardContext';
import { ManagerNote } from '../../../../lib/types';
import {
  StickyNote,
  Plus,
  Pencil,
  Trash2,
  Check,
  X,
  RefreshCw,
  Lock,
  ArrowLeft,
  Calendar,
  Clock,
  User,
} from 'lucide-react';

function formatBanglaDateTime(isoString?: string): string {
  if (!isoString) return '';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleString('bn-BD', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return isoString;
  }
}

export default function ManagerStorePage() {
  const { user, selectedMonth, locks, effectiveRole, isLoading: isDashboardLoading } = useDashboard();

  // State
  const [notes, setNotes] = useState<ManagerNote[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [showAddForm, setShowAddForm] = useState<boolean>(false);

  // New Note Form State
  const [newTitle, setNewTitle] = useState<string>('');
  const [newContent, setNewContent] = useState<string>('');
  const [savingNew, setSavingNew] = useState<boolean>(false);

  // Editing Note State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState<string>('');
  const [editContent, setEditContent] = useState<string>('');
  const [savingEdit, setSavingEdit] = useState<boolean>(false);

  // Feedback State
  const [toastMessage, setToastMessage] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Running manager check
  const currentLock = locks.find((l) => l.yearMonth === selectedMonth);
  const isMonthClosed = currentLock?.status === 'CLOSED' || (currentLock?.status as any) === 'LOCKED';
  const isRunningManager = effectiveRole === 'MANAGER' && !isMonthClosed;

  useEffect(() => {
    if (isRunningManager) {
      fetchNotes();
    }
  }, [isRunningManager]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3000);
  };

  const fetchNotes = async () => {
    setLoading(true);
    setErrorMessage('');
    try {
      const res = await fetch('/api/manager/store');
      const data = await res.json();
      if (res.ok && data.success) {
        setNotes(data.notes || []);
      } else {
        setErrorMessage(data.error || 'নোট লোড করা যায়নি।');
      }
    } catch (err: any) {
      setErrorMessage('নোট লোড করতে সমস্যা হয়েছে।');
    } finally {
      setLoading(false);
    }
  };

  // Create Note
  const handleCreateNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContent.trim()) {
      setErrorMessage('অনুগ্রহ করে নোটের বিবরণ লিখুন।');
      return;
    }

    setSavingNew(true);
    setErrorMessage('');
    try {
      const res = await fetch('/api/manager/store', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTitle.trim(),
          content: newContent.trim(),
        }),
      });

      const data = await res.json();
      if (res.ok && data.success && data.note) {
        setNotes([data.note, ...notes]);
        setNewTitle('');
        setNewContent('');
        setShowAddForm(false);
        showToast('নোট সফলভাবে সংরক্ষণ করা হয়েছে!');
      } else {
        setErrorMessage(data.error || 'নোট সংরক্ষণ করা যায়নি।');
      }
    } catch (err) {
      setErrorMessage('নোট সংরক্ষণ ব্যর্থ হয়েছে।');
    } finally {
      setSavingNew(false);
    }
  };

  // Start Editing Note
  const handleStartEdit = (note: ManagerNote) => {
    setEditingId(note.id);
    setEditTitle(note.title || '');
    setEditContent(note.content || '');
    setErrorMessage('');
  };

  // Cancel Editing Note
  const handleCancelEdit = () => {
    setEditingId(null);
    setEditTitle('');
    setEditContent('');
  };

  // Save Edited Note
  const handleUpdateNote = async (id: string) => {
    if (!editContent.trim()) {
      setErrorMessage('নোটের বিবরণ খালি রাখা যাবে না।');
      return;
    }

    setSavingEdit(true);
    setErrorMessage('');
    try {
      const res = await fetch('/api/manager/store', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          title: editTitle.trim(),
          content: editContent.trim(),
        }),
      });

      const data = await res.json();
      if (res.ok && data.success && data.note) {
        setNotes(notes.map((n) => (n.id === id ? data.note : n)));
        setEditingId(null);
        showToast('নোট সফলভাবে আপডেট করা হয়েছে!');
      } else {
        setErrorMessage(data.error || 'নোট আপডেট করা যায়নি।');
      }
    } catch (err) {
      setErrorMessage('নোট আপডেট করতে সমস্যা হয়েছে।');
    } finally {
      setSavingEdit(false);
    }
  };

  // Delete Note
  const handleDeleteNote = async (id: string) => {
    if (!window.confirm('আপনি কি নিশ্চিত যে এই নোটটি মুছে ফেলতে চান?')) {
      return;
    }

    try {
      const res = await fetch(`/api/manager/store?id=${id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setNotes(notes.filter((n) => n.id !== id));
        showToast('নোট সফলভাবে মুছে ফেলা হয়েছে।');
      } else {
        setErrorMessage(data.error || 'নোট মুছে ফেলা যায়নি।');
      }
    } catch (err) {
      setErrorMessage('নোট মুছে ফেলতে সমস্যা হয়েছে।');
    }
  };

  // 1. Loading State
  if (isDashboardLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="flex items-center space-x-2 text-slate-500 text-sm font-medium">
          <RefreshCw className="w-5 h-5 animate-spin text-emerald-600" />
          <span>লোড হচ্ছে...</span>
        </div>
      </div>
    );
  }

  // 2. Access Restriction: Only active running manager
  if (!isRunningManager) {
    return (
      <div className="max-w-xl mx-auto my-12 p-8 bg-white rounded-3xl border border-slate-200 shadow-sm text-center space-y-4">
        <div className="w-14 h-14 mx-auto bg-amber-50 text-amber-700 rounded-2xl flex items-center justify-center border border-amber-200">
          <Lock className="w-7 h-7" />
        </div>
        <h2 className="text-lg font-bold text-slate-900">শুধুমাত্র রানিং ম্যানেজারের জন্য</h2>
        <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
          এই মেস স্টোর নোটবুকটি শুধুমাত্র চলতি সক্রিয় মাসের ({selectedMonth}) দায়িত্বপ্রাপ্ত রানিং ম্যানেজারের পোর্টালে ব্যবহারের জন্য উন্মুক্ত।
        </p>
        <div className="pt-2">
          <Link
            href="/dashboard"
            className="inline-flex items-center space-x-1.5 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-all shadow-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>ড্যাশবোর্ডে ফিরে যান</span>
          </Link>
        </div>
      </div>
    );
  }

  // 3. Running Manager Notepad View
  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-16">
      {/* Top Header Card */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 sm:p-7 rounded-3xl shadow-lg border border-slate-700/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center space-x-2">
            <span className="p-1.5 bg-emerald-500/20 text-emerald-400 rounded-xl">
              <StickyNote className="w-4 h-4" />
            </span>
            <span className="text-[11px] font-bold text-emerald-400 tracking-wider uppercase">
              রানিং ম্যানেজার পোর্টাল
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
            মেস স্টোর ও নোটবুক
          </h1>
          <p className="text-xs text-slate-300">
            মেসের মালামাল, অবশিষ্ট পণ্য বা যেকোনো জরুরি হিসাব লিখে ও আপডেট রাখুন।
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center space-x-1.5 text-xs text-emerald-200 bg-slate-800/80 px-3 py-2 rounded-2xl border border-slate-700">
            <Calendar className="w-3.5 h-3.5 text-emerald-400" />
            <span className="font-semibold">মাস: {selectedMonth}</span>
          </div>

          <button
            type="button"
            onClick={() => {
              setShowAddForm(!showAddForm);
              setErrorMessage('');
            }}
            className="flex items-center space-x-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm rounded-2xl shadow-md transition-all cursor-pointer"
          >
            {showAddForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            <span>ADD NOTE</span>
          </button>
        </div>
      </div>

      {/* Global Alerts / Toasts */}
      {toastMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-2xl flex items-center space-x-2 shadow-sm transition-all animate-fadeIn">
          <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-medium rounded-2xl flex items-center space-x-2 shadow-sm">
          <X className="w-4 h-4 text-red-500 flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* ADD NOTE Box (Appears when ADD NOTE is clicked) */}
      {showAddForm && (
        <div className="bg-white rounded-3xl border-2 border-emerald-500/40 shadow-lg p-5 sm:p-6 space-y-4 animate-fadeIn">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <h2 className="text-sm sm:text-base font-bold text-slate-800 flex items-center space-x-2">
              <span className="p-1 bg-emerald-100 text-emerald-700 rounded-lg">
                <Plus className="w-4 h-4" />
              </span>
              <span>নতুন নোট তৈরি করুন</span>
            </h2>
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleCreateNote} className="space-y-3.5">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">
                নোটের শিরোনাম (Title)
              </label>
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="যেমন: চাল ও তেল স্টক, অবশিষ্ট মসলা..."
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-100 rounded-xl text-slate-800 text-sm outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">
                নোটের বিবরণ (Note Box) <span className="text-red-500">*</span>
              </label>
              <textarea
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                placeholder="এখানে বিস্তারিত নোট বা হিসাব লিখুন..."
                rows={4}
                required
                className="w-full p-3.5 bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-100 rounded-xl text-slate-800 text-sm leading-relaxed outline-none transition-all resize-y"
              />
            </div>

            <div className="flex items-center space-x-2 pt-1">
              <button
                type="submit"
                disabled={savingNew}
                className="flex items-center space-x-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-400 text-white font-bold text-xs sm:text-sm rounded-xl shadow transition-all cursor-pointer"
              >
                {savingNew ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Check className="w-3.5 h-3.5" />
                )}
                <span>{savingNew ? 'সেভ হচ্ছে...' : 'সেভ করুন'}</span>
              </button>

              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs sm:text-sm rounded-xl transition-colors cursor-pointer"
              >
                বাতিল
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Note Cards Section ("niche card hoye thakbe") */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-xs sm:text-sm font-extrabold text-slate-700 uppercase tracking-wider flex items-center space-x-1.5">
            <span>সংরক্ষিত নোটসমূহ</span>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
              {notes.length} টি
            </span>
          </h2>

          <button
            type="button"
            onClick={fetchNotes}
            title="রিফ্রেশ করুন"
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-emerald-600' : ''}`} />
          </button>
        </div>

        {loading ? (
          <div className="py-16 text-center text-slate-400 text-xs flex items-center justify-center space-x-2 bg-white rounded-3xl border border-slate-200">
            <RefreshCw className="w-4 h-4 animate-spin text-emerald-600" />
            <span>নোট লোড হচ্ছে...</span>
          </div>
        ) : notes.length === 0 ? (
          /* Empty state */
          <div className="bg-white rounded-3xl border border-slate-200/90 p-10 text-center space-y-3">
            <div className="w-12 h-12 mx-auto bg-slate-100 text-slate-400 rounded-2xl flex items-center justify-center">
              <StickyNote className="w-6 h-6" />
            </div>
            <p className="text-sm font-bold text-slate-700">এখনো কোনো নোট যোগ করা হয়নি</p>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              মেসের স্টোর, হিসাব বা যেকোনো তথ্য লিখে রাখতে উপরের <b>ADD NOTE</b> বাটনে ক্লিক করুন।
            </p>
            <button
              type="button"
              onClick={() => setShowAddForm(true)}
              className="inline-flex items-center space-x-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-sm transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>নোট যোগ করুন</span>
            </button>
          </div>
        ) : (
          /* Note Cards List */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {notes.map((note) => {
              const isCurrentEditing = editingId === note.id;

              return (
                <div
                  key={note.id}
                  className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all p-5 flex flex-col justify-between space-y-3 relative group"
                >
                  {isCurrentEditing ? (
                    /* Inline Edit Mode */
                    <div className="space-y-3">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 mb-1">
                          শিরোনাম (Title)
                        </label>
                        <input
                          type="text"
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          placeholder="শিরোনাম..."
                          className="w-full px-3 py-2 bg-slate-50 border border-emerald-400 focus:bg-white rounded-xl text-slate-800 text-sm outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 mb-1">
                          বিবরণ (Content)
                        </label>
                        <textarea
                          value={editContent}
                          onChange={(e) => setEditContent(e.target.value)}
                          rows={4}
                          placeholder="নোট বিবরণ..."
                          className="w-full p-3 bg-slate-50 border border-emerald-400 focus:bg-white rounded-xl text-slate-800 text-sm leading-relaxed outline-none resize-y"
                        />
                      </div>

                      <div className="flex items-center space-x-2 pt-1">
                        <button
                          type="button"
                          onClick={() => handleUpdateNote(note.id)}
                          disabled={savingEdit}
                          className="flex items-center space-x-1 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-400 text-white font-bold text-xs rounded-lg shadow-sm transition-all cursor-pointer"
                        >
                          {savingEdit ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Check className="w-3.5 h-3.5" />
                          )}
                          <span>আপডেট করুন</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleCancelEdit}
                          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-lg transition-colors cursor-pointer"
                        >
                          বাতিল
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Normal Card Display */
                    <>
                      <div className="space-y-2">
                        {/* Card Header */}
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="font-bold text-slate-800 text-sm sm:text-base leading-snug line-clamp-2">
                            {note.title || '📝 নোট'}
                          </h3>
                          <div className="flex items-center space-x-1 flex-shrink-0">
                            <button
                              type="button"
                              onClick={() => handleStartEdit(note)}
                              title="এডিট করুন"
                              className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteNote(note.id)}
                              title="ডিলিট করুন"
                              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Card Content */}
                        <p className="text-slate-600 text-xs sm:text-sm leading-relaxed whitespace-pre-wrap font-normal">
                          {note.content}
                        </p>
                      </div>

                      {/* Card Footer */}
                      <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between text-[11px] text-slate-400 gap-1.5">
                        <div className="flex items-center space-x-1">
                          <Clock className="w-3 h-3 text-slate-400" />
                          <span>{formatBanglaDateTime(note.updatedAt || note.createdAt)}</span>
                        </div>
                        {note.createdBy && (
                          <div className="flex items-center space-x-1 text-slate-500 font-medium">
                            <User className="w-3 h-3 text-slate-400" />
                            <span>{note.createdBy}</span>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
