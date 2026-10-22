'use client';

import React, { useState, useEffect } from 'react';
import { useDashboard } from '../../../../lib/DashboardContext';
import { ManagerNote } from '../../../../lib/types';
import {
  StickyNote,
  Plus,
  Pin,
  Trash2,
  Pencil,
  Search,
  Check,
  Copy,
  Clock,
  Sparkles,
  X,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';

const COLOR_MAP: Record<string, { bg: string; border: string; badge: string; ring: string }> = {
  yellow: {
    bg: 'bg-amber-50/80 hover:bg-amber-50',
    border: 'border-amber-200',
    badge: 'bg-amber-200/80 text-amber-900',
    ring: 'focus:ring-amber-400',
  },
  blue: {
    bg: 'bg-blue-50/80 hover:bg-blue-50',
    border: 'border-blue-200',
    badge: 'bg-blue-200/80 text-blue-900',
    ring: 'focus:ring-blue-400',
  },
  green: {
    bg: 'bg-emerald-50/80 hover:bg-emerald-50',
    border: 'border-emerald-200',
    badge: 'bg-emerald-200/80 text-emerald-900',
    ring: 'focus:ring-emerald-400',
  },
  purple: {
    bg: 'bg-purple-50/80 hover:bg-purple-50',
    border: 'border-purple-200',
    badge: 'bg-purple-200/80 text-purple-900',
    ring: 'focus:ring-purple-400',
  },
  slate: {
    bg: 'bg-slate-50/80 hover:bg-slate-50',
    border: 'border-slate-200',
    badge: 'bg-slate-200 text-slate-800',
    ring: 'focus:ring-slate-400',
  },
};

export default function ManagerStorePage() {
  const { user } = useDashboard();
  const [notes, setNotes] = useState<ManagerNote[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // New Note Form State
  const [newTitle, setNewTitle] = useState<string>('');
  const [newContent, setNewContent] = useState<string>('');
  const [newColor, setNewColor] = useState<'yellow' | 'blue' | 'green' | 'purple' | 'slate'>('yellow');
  const [newIsPinned, setNewIsPinned] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Edit Modal State
  const [editingNote, setEditingNote] = useState<ManagerNote | null>(null);
  const [editTitle, setEditTitle] = useState<string>('');
  const [editContent, setEditContent] = useState<string>('');
  const [editColor, setEditColor] = useState<'yellow' | 'blue' | 'green' | 'purple' | 'slate'>('yellow');
  const [editIsPinned, setEditIsPinned] = useState<boolean>(false);
  const [isUpdating, setIsUpdating] = useState<boolean>(false);

  // Toast / Status Message
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    fetchNotes();
  }, []);

  const fetchNotes = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/manager/store');
      const data = await res.json();
      if (res.ok && data.success) {
        setNotes(data.notes || []);
      }
    } catch (err) {
      // Ignored
    } finally {
      setLoading(false);
    }
  };

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  };

  const handleCreateNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContent.trim()) {
      showToast('error', 'নোটের বিস্তারিত বিবরণ লিখুন।');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/manager/store', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTitle,
          content: newContent,
          color: newColor,
          isPinned: newIsPinned,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setNotes((prev) => [data.note, ...prev]);
        setNewTitle('');
        setNewContent('');
        setNewColor('yellow');
        setNewIsPinned(false);
        showToast('success', 'নোট সফলভাবে সংরক্ষণ করা হয়েছে!');
      } else {
        showToast('error', data.error || 'নোট সংরক্ষণ করা যায়নি।');
      }
    } catch (err: any) {
      showToast('error', err.message || 'সংরক্ষণ ব্যর্থ হয়েছে।');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTogglePin = async (note: ManagerNote) => {
    const updatedPinned = !note.isPinned;
    // Optimistic UI update
    setNotes((prev) =>
      prev
        .map((n) => (n.id === note.id ? { ...n, isPinned: updatedPinned } : n))
        .sort((a, b) => {
          if (a.isPinned && !b.isPinned) return -1;
          if (!a.isPinned && b.isPinned) return 1;
          return new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime();
        })
    );

    try {
      await fetch('/api/manager/store', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: note.id, isPinned: updatedPinned }),
      });
      showToast('success', updatedPinned ? '📌 নোট পিন করা হয়েছে!' : 'নোট আনপিন করা হয়েছে।');
    } catch (_) {
      fetchNotes();
    }
  };

  const handleDeleteNote = async (id: string) => {
    if (!confirm('আপনি কি নিশ্চিত যে এই নোটটি মুছে ফেলতে চান?')) return;

    // Optimistic UI update
    setNotes((prev) => prev.filter((n) => n.id !== id));

    try {
      const res = await fetch(`/api/manager/store?id=${id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast('success', 'নোট মুছে ফেলা হয়েছে।');
      } else {
        showToast('error', data.error || 'নোট মোছা যায়নি।');
        fetchNotes();
      }
    } catch (_) {
      fetchNotes();
    }
  };

  const openEditModal = (note: ManagerNote) => {
    setEditingNote(note);
    setEditTitle(note.title || '');
    setEditContent(note.content || '');
    setEditColor(note.color || 'yellow');
    setEditIsPinned(Boolean(note.isPinned));
  };

  const handleUpdateNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingNote) return;
    if (!editContent.trim()) {
      showToast('error', 'নোটের বিবরণ খালি রাখা যাবে না।');
      return;
    }

    setIsUpdating(true);
    try {
      const res = await fetch('/api/manager/store', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingNote.id,
          title: editTitle,
          content: editContent,
          color: editColor,
          isPinned: editIsPinned,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setNotes((prev) =>
          prev
            .map((n) => (n.id === editingNote.id ? data.note : n))
            .sort((a, b) => {
              if (a.isPinned && !b.isPinned) return -1;
              if (!a.isPinned && b.isPinned) return 1;
              return new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime();
            })
        );
        setEditingNote(null);
        showToast('success', 'নোট সফলভাবে আপডেট করা হয়েছে!');
      } else {
        showToast('error', data.error || 'আপডেট ব্যর্থ হয়েছে।');
      }
    } catch (err: any) {
      showToast('error', err.message || 'আপডেট করতে সমস্যা হয়েছে।');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCopyNote = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
    showToast('success', 'নোট কপি করা হয়েছে!');
  };

  const formatBanglaDate = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      return d.toLocaleDateString('bn-BD', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
      });
    } catch (_) {
      return isoStr;
    }
  };

  // Filter notes by search query
  const filteredNotes = notes.filter((n) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (n.title || '').toLowerCase().includes(q) || n.content.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* 1. Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white p-6 sm:p-8 rounded-3xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 border border-slate-800">
        <div className="space-y-1.5">
          <div className="flex items-center space-x-2.5">
            <span className="p-2.5 bg-emerald-500/20 text-emerald-400 rounded-2xl border border-emerald-500/30">
              <StickyNote className="w-6 h-6" />
            </span>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight">
              মেস স্টোর ও নোটবুক (Store & Notes)
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-300">
            মেসের যেকোনো দরকারি হিসাব, জিনিসপত্রের নোট বা জরুরি বার্তা সহজে লিখে রাখুন। যেকোনো ডিভাইস থেকে তাৎক্ষণিক দৃশ্যমান।
          </p>
        </div>

        {/* Quick Stats Pill */}
        <div className="flex items-center space-x-2 self-start md:self-auto bg-white/10 backdrop-blur-md px-3.5 py-2 rounded-2xl border border-white/15 text-xs font-bold">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>মোট সংরক্ষিত নোট: <b className="text-emerald-300 font-mono text-sm">{notes.length} টি</b></span>
        </div>
      </div>

      {/* Toast Alert */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 p-4 rounded-2xl text-xs font-bold flex items-center space-x-2 shadow-xl border animate-in slide-in-from-top-2 duration-150 ${
            toast.type === 'success'
              ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
              : 'bg-red-50 border-red-300 text-red-900'
          }`}
        >
          {toast.type === 'success' ? (
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          )}
          <span>{toast.message}</span>
        </div>
      )}

      {/* 2. Quick Note Creation Card */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-5 sm:p-6 space-y-4">
        <div className="flex items-center space-x-2 text-slate-800 border-b border-slate-100 pb-3">
          <Sparkles className="w-4 h-4 text-emerald-600" />
          <h2 className="font-extrabold text-sm sm:text-base">নতুন নোট লিখুন (Quick Note Writer)</h2>
        </div>

        <form onSubmit={handleCreateNote} className="space-y-3.5">
          {/* Optional Title Input */}
          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="শিরোনাম (ঐচ্ছিক — যেমন: আলুর বস্তা ও তেলের হিসাব, রাঁধুনির ছুটির দিন...)"
            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-bold text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
          />

          {/* Main Content Textarea */}
          <textarea
            rows={3}
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            placeholder="এখানে আপনার নোট বা বিস্তারিত তথ্য লিখে রাখুন..."
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs sm:text-sm font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 resize-y"
          />

          {/* Color Selector, Pin Checkbox & Save Button */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
            <div className="flex items-center space-x-3">
              {/* Color choices */}
              <div className="flex items-center space-x-1.5 bg-slate-100 p-1.5 rounded-xl border border-slate-200">
                {(['yellow', 'blue', 'green', 'purple', 'slate'] as const).map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setNewColor(c)}
                    className={`w-5 h-5 rounded-lg border transition-transform cursor-pointer ${
                      c === 'yellow'
                        ? 'bg-amber-300 border-amber-400'
                        : c === 'blue'
                        ? 'bg-blue-300 border-blue-400'
                        : c === 'green'
                        ? 'bg-emerald-300 border-emerald-400'
                        : c === 'purple'
                        ? 'bg-purple-300 border-purple-400'
                        : 'bg-slate-300 border-slate-400'
                    } ${newColor === c ? 'scale-125 ring-2 ring-slate-800 shadow-sm' : 'opacity-70 hover:opacity-100'}`}
                    title={c}
                  />
                ))}
              </div>

              {/* Pin checkbox */}
              <label className="flex items-center space-x-1.5 cursor-pointer text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200/70 px-3 py-1.5 rounded-xl border border-slate-200 transition-colors">
                <input
                  type="checkbox"
                  checked={newIsPinned}
                  onChange={(e) => setNewIsPinned(e.target.checked)}
                  className="w-3.5 h-3.5 text-emerald-600 rounded focus:ring-emerald-500 cursor-pointer"
                />
                <span className="flex items-center gap-1">
                  <Pin className="w-3.5 h-3.5 text-amber-600" />
                  <span>পিন করুন</span>
                </span>
              </label>
            </div>

            <button
              type="submit"
              disabled={isSubmitting || !newContent.trim()}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs sm:text-sm rounded-xl shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center space-x-1.5 disabled:opacity-50 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>{isSubmitting ? 'সংরক্ষণ হচ্ছে...' : 'নোট সেভ করুন'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* 3. Search Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 transform -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="নোট খুঁজুন (শিরোনাম বা টেক্সট লিখে সার্চ করুন)..."
            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-2xl text-xs sm:text-sm font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 shadow-sm"
          />
        </div>

        <span className="text-xs font-semibold text-slate-500">
          প্রদর্শিত নোট: <b className="text-slate-800 font-bold">{filteredNotes.length} টি</b>
        </span>
      </div>

      {/* 4. Notes Grid */}
      {loading ? (
        <div className="py-16 text-center text-slate-400 space-y-2">
          <Clock className="w-8 h-8 mx-auto animate-spin text-emerald-600" />
          <p className="text-xs font-bold">নোট লোড হচ্ছে...</p>
        </div>
      ) : filteredNotes.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center space-y-3 shadow-xs">
          <div className="w-14 h-14 bg-slate-100 text-slate-400 rounded-3xl flex items-center justify-center mx-auto">
            <StickyNote className="w-7 h-7" />
          </div>
          <h3 className="font-extrabold text-slate-800 text-base">
            {searchQuery ? 'কোনো নোট খুঁজে পাওয়া যায়নি!' : 'এখনো কোনো নোট সংরক্ষণ করা হয়নি।'}
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {searchQuery
              ? 'অন্য কোনো শব্দ লিখে সার্চ করে দেখতে পারেন।'
              : 'মেসের জিনিসপত্রের স্টক, আগামী বাজারের লিস্ট বা যে কোনো জরুরি বার্তা উপরে লিখে সংরক্ষণ করুন।'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredNotes.map((note) => {
            const colorConf = COLOR_MAP[note.color || 'yellow'] || COLOR_MAP.yellow;
            return (
              <div
                key={note.id}
                className={`p-5 rounded-3xl border transition-all flex flex-col justify-between space-y-3.5 shadow-sm hover:shadow-md relative group ${colorConf.bg} ${colorConf.border}`}
              >
                {/* Note Header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1 flex-1 pr-1">
                    {note.title ? (
                      <h4 className="font-extrabold text-slate-900 text-sm sm:text-base leading-snug break-words">
                        {note.title}
                      </h4>
                    ) : (
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                        সাধারণ নোট
                      </span>
                    )}
                    <span className="text-[10px] text-slate-500 flex items-center gap-1 font-medium">
                      <Clock className="w-3 h-3 text-slate-400" />
                      <span>{formatBanglaDate(note.updatedAt || note.createdAt)}</span>
                    </span>
                  </div>

                  {/* Pin Button */}
                  <button
                    type="button"
                    onClick={() => handleTogglePin(note)}
                    className={`p-1.5 rounded-xl border transition-colors cursor-pointer ${
                      note.isPinned
                        ? 'bg-amber-200 text-amber-900 border-amber-300 shadow-xs'
                        : 'bg-white/70 text-slate-400 border-slate-200 hover:text-slate-700'
                    }`}
                    title={note.isPinned ? 'আনপিন করতে ক্লিক করুন' : 'পিন করতে ক্লিক করুন'}
                  >
                    <Pin className={`w-3.5 h-3.5 ${note.isPinned ? 'fill-amber-600' : ''}`} />
                  </button>
                </div>

                {/* Note Content */}
                <div className="text-xs sm:text-sm text-slate-800 font-medium whitespace-pre-wrap break-words leading-relaxed max-h-64 overflow-y-auto">
                  {note.content}
                </div>

                {/* Note Footer with Actions */}
                <div className="pt-2 border-t border-slate-900/10 flex items-center justify-between text-xs text-slate-500">
                  <span className="text-[10px] font-semibold text-slate-500 truncate max-w-[120px]">
                    {note.createdBy ? `লিখেছেন: ${note.createdBy}` : ''}
                  </span>

                  <div className="flex items-center space-x-1">
                    {/* Copy Button */}
                    <button
                      type="button"
                      onClick={() => handleCopyNote(note.id, `${note.title ? note.title + '\n\n' : ''}${note.content}`)}
                      className="p-1.5 rounded-lg hover:bg-black/5 text-slate-600 transition-colors cursor-pointer"
                      title="নোট কপি করুন"
                    >
                      {copiedId === note.id ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>

                    {/* Edit Button */}
                    <button
                      type="button"
                      onClick={() => openEditModal(note)}
                      className="p-1.5 rounded-lg hover:bg-black/5 text-blue-700 transition-colors cursor-pointer"
                      title="নোট এডিট করুন"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>

                    {/* Delete Button */}
                    <button
                      type="button"
                      onClick={() => handleDeleteNote(note.id)}
                      className="p-1.5 rounded-lg hover:bg-red-100 text-red-600 transition-colors cursor-pointer"
                      title="নোট মুছে ফেলুন"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 5. Edit Modal */}
      {editingNote && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <Pencil className="w-4 h-4 text-emerald-600" />
                <h3 className="font-extrabold text-slate-900 text-base">নোট এডিট করুন</h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingNote(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateNote} className="space-y-3.5">
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                placeholder="শিরোনাম (ঐচ্ছিক)"
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-bold text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />

              <textarea
                rows={5}
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                placeholder="নোটের বিস্তারিত বিবরণ..."
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs sm:text-sm font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 resize-y"
              />

              {/* Color & Pin selection */}
              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center space-x-1.5 bg-slate-100 p-1.5 rounded-xl border border-slate-200">
                  {(['yellow', 'blue', 'green', 'purple', 'slate'] as const).map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setEditColor(c)}
                      className={`w-5 h-5 rounded-lg border transition-transform cursor-pointer ${
                        c === 'yellow'
                          ? 'bg-amber-300 border-amber-400'
                          : c === 'blue'
                          ? 'bg-blue-300 border-blue-400'
                          : c === 'green'
                          ? 'bg-emerald-300 border-emerald-400'
                          : c === 'purple'
                          ? 'bg-purple-300 border-purple-400'
                          : 'bg-slate-300 border-slate-400'
                      } ${editColor === c ? 'scale-125 ring-2 ring-slate-800 shadow-sm' : 'opacity-70 hover:opacity-100'}`}
                      title={c}
                    />
                  ))}
                </div>

                <label className="flex items-center space-x-1.5 cursor-pointer text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200/70 px-3 py-1.5 rounded-xl border border-slate-200 transition-colors">
                  <input
                    type="checkbox"
                    checked={editIsPinned}
                    onChange={(e) => setEditIsPinned(e.target.checked)}
                    className="w-3.5 h-3.5 text-emerald-600 rounded focus:ring-emerald-500 cursor-pointer"
                  />
                  <span className="flex items-center gap-1">
                    <Pin className="w-3.5 h-3.5 text-amber-600" />
                    <span>পিন করুন</span>
                  </span>
                </label>
              </div>

              {/* Modal Buttons */}
              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingNote(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={isUpdating || !editContent.trim()}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs rounded-xl shadow-md transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isUpdating ? 'আপডেট হচ্ছে...' : 'আপডেট সেভ করুন'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
