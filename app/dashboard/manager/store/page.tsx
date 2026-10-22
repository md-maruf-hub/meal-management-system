'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useDashboard } from '../../../../lib/DashboardContext';
import {
  StickyNote,
  Pencil,
  Check,
  RefreshCw,
  Lock,
  ArrowLeft,
  Calendar,
  User,
  Clock,
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
  const [content, setContent] = useState<string>('');
  const [updatedAt, setUpdatedAt] = useState<string>('');
  const [updatedBy, setUpdatedBy] = useState<string>('');
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [draftContent, setDraftContent] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  // Running manager check
  const currentLock = locks.find((l) => l.yearMonth === selectedMonth);
  const isMonthClosed = currentLock?.status === 'CLOSED' || (currentLock?.status as any) === 'LOCKED';
  const isRunningManager = effectiveRole === 'MANAGER' && !isMonthClosed;

  useEffect(() => {
    if (isRunningManager) {
      fetchNote();
    }
  }, [isRunningManager]);

  const fetchNote = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch('/api/manager/store');
      const data = await res.json();
      if (res.ok && data.success && data.note) {
        const text = data.note.content || '';
        setContent(text);
        setDraftContent(text);
        setUpdatedAt(data.note.updatedAt || '');
        setUpdatedBy(data.note.updatedBy || '');
        if (!text) {
          setIsEditing(true); // Open directly in write mode if empty
        }
      } else {
        setIsEditing(true);
      }
    } catch (err: any) {
      setErrorMsg('নোট লোড করতে সমস্যা হয়েছে।');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setErrorMsg('');
    try {
      const res = await fetch('/api/manager/store', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: draftContent }),
      });
      const data = await res.json();
      if (res.ok && data.success && data.note) {
        setContent(data.note.content || '');
        setDraftContent(data.note.content || '');
        setUpdatedAt(data.note.updatedAt || '');
        setUpdatedBy(data.note.updatedBy || '');
        setIsEditing(false);
        setSavedSuccess(true);
        setTimeout(() => setSavedSuccess(false), 3000);
      } else {
        setErrorMsg(data.error || 'নোট আপডেট করতে সমস্যা হয়েছে।');
      }
    } catch (err: any) {
      setErrorMsg('নোট সংরক্ষণ ব্যর্থ হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setDraftContent(content);
    setIsEditing(false);
    setErrorMsg('');
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

  // 2. Access Restriction: Only the running manager of active month can see/edit
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

  // 3. Simple Running Manager Notepad UI
  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
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
            মেসের মালামাল, অবশিষ্ট বাজারের হিসাব বা যেকোনো প্রয়োজনীয় তথ্য এখানে লিখে ও আপডেট করে রাখুন।
          </p>
        </div>

        <div className="flex items-center space-x-2 text-xs text-emerald-200 bg-slate-800/80 px-3 py-2 rounded-2xl border border-slate-700 self-start sm:self-auto">
          <Calendar className="w-3.5 h-3.5 text-emerald-400" />
          <span className="font-semibold">চলতি মাস: {selectedMonth}</span>
        </div>
      </div>

      {/* Main Simple Note Card */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-5 sm:p-7 space-y-4">
        {/* Card Header Info */}
        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-bold text-slate-700">রানিং নোট</span>
          </div>

          {updatedAt && (
            <div className="flex items-center space-x-3 text-[11px] text-slate-500">
              <div className="flex items-center space-x-1">
                <Clock className="w-3 h-3 text-slate-400" />
                <span>আপডেট: {formatBanglaDateTime(updatedAt)}</span>
              </div>
              {updatedBy && (
                <div className="flex items-center space-x-1 font-medium text-slate-600">
                  <User className="w-3 h-3 text-slate-400" />
                  <span>({updatedBy})</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Error notification */}
        {errorMsg && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-medium rounded-xl">
            {errorMsg}
          </div>
        )}

        {/* Success toast */}
        {savedSuccess && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-xl flex items-center space-x-2 transition-all">
            <Check className="w-4 h-4 text-emerald-600" />
            <span>নোট সফলভাবে আপডেট করা হয়েছে!</span>
          </div>
        )}

        {/* Note Body */}
        {loading ? (
          <div className="py-16 text-center text-slate-400 text-xs flex items-center justify-center space-x-2">
            <RefreshCw className="w-4 h-4 animate-spin text-emerald-600" />
            <span>নোট লোড হচ্ছে...</span>
          </div>
        ) : isEditing ? (
          /* Edit / Update Mode */
          <div className="space-y-4">
            <textarea
              value={draftContent}
              onChange={(e) => setDraftContent(e.target.value)}
              placeholder="মেসের মালামাল, অবশিষ্ট পণ্য বা যেকোনো জরুরি নোট এখানে লিখুন..."
              rows={12}
              autoFocus
              className="w-full p-4 sm:p-5 bg-slate-50/50 border border-emerald-300 focus:border-emerald-600 focus:bg-white focus:ring-4 focus:ring-emerald-50 rounded-2xl text-slate-800 text-sm sm:text-base leading-relaxed outline-none transition-all resize-y shadow-inner"
            />

            <div className="flex flex-wrap items-center gap-2.5 pt-1">
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="flex items-center space-x-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-400 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md transition-all cursor-pointer"
              >
                {saving ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                <span>{saving ? 'সংরক্ষণ হচ্ছে...' : 'আপডেট সংরক্ষণ করুন'}</span>
              </button>

              {content && (
                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={saving}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs sm:text-sm rounded-xl transition-colors cursor-pointer"
                >
                  বাতিল
                </button>
              )}
            </div>
          </div>
        ) : (
          /* View Mode */
          <div className="space-y-5">
            {content ? (
              <div className="p-5 sm:p-6 bg-slate-50/70 border border-slate-200/80 rounded-2xl text-slate-800 text-sm sm:text-base leading-relaxed whitespace-pre-wrap font-normal min-h-[180px]">
                {content}
              </div>
            ) : (
              <div className="py-12 text-center text-slate-400 text-xs">
                কোনো নোট সংরক্ষিত নেই। নিচে বাটনে ক্লিক করে নোট লিখুন।
              </div>
            )}

            <div>
              <button
                type="button"
                onClick={() => {
                  setDraftContent(content);
                  setIsEditing(true);
                }}
                className="inline-flex items-center space-x-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow transition-all cursor-pointer"
              >
                <Pencil className="w-4 h-4" />
                <span>{content ? 'নোট এডিট / আপডেট করুন' : 'নোট লিখুন'}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
