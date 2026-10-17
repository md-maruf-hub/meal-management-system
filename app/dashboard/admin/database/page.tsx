'use client';

import React, { useState, useEffect } from 'react';
import { Database, CheckCircle, AlertCircle, RefreshCw, Send, ShieldCheck, Link2, Lock, Unlock, Eye, EyeOff, KeyRound } from 'lucide-react';

export default function AdminDatabasePage() {
  // Master Security PIN / Password State
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [unlocking, setUnlocking] = useState(false);
  const [pinError, setPinError] = useState('');

  // Database Connection State
  const [gasUrl, setGasUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [pingResult, setPingResult] = useState<{ success: boolean; duration: number } | null>(null);
  const [pulling, setPulling] = useState(false);
  const [pushing, setPushing] = useState(false);

  useEffect(() => {
    // Check if session was previously unlocked in this browser tab
    if (typeof window !== 'undefined') {
      const unlockedSession = sessionStorage.getItem('admin_db_unlocked') === 'true';
      if (unlockedSession) {
        setIsUnlocked(true);
      }
    }
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/database?t=${Date.now()}`, {
        cache: 'no-store',
        headers: { 'Pragma': 'no-cache', 'Cache-Control': 'no-cache' },
      });
      const data = await res.json();
      if (data.gasUrl) {
        setGasUrl(data.gasUrl);
      }
      setLoading(false);
    } catch (err) {
      setLoading(false);
    }
  };

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pinInput.trim()) return;

    setUnlocking(true);
    setPinError('');

    try {
      const res = await fetch('/api/admin/database', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'verify-pin', pin: pinInput.trim() }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setIsUnlocked(true);
        sessionStorage.setItem('admin_db_unlocked', 'true');
        setPinInput('');
      } else {
        setPinError(data.error || 'ভুল সিকিউরিটি পিন বা পাসওয়ার্ড।');
      }
    } catch (err: any) {
      setPinError('সার্ভারের সাথে যোগাযোগ করা যায়নি।');
    } finally {
      setUnlocking(false);
    }
  };

  const handleLockAgain = () => {
    setIsUnlocked(false);
    sessionStorage.removeItem('admin_db_unlocked');
    setPinInput('');
    setStatusMessage(null);
  };

  const handleTestConnection = async () => {
    if (!gasUrl) return;
    setTesting(true);
    setStatusMessage(null);
    setPingResult(null);

    try {
      const res = await fetch('/api/admin/database', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gasUrl, testOnly: true }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setPingResult({ success: true, duration: data.pingDuration });
        setStatusMessage({
          type: 'success',
          text: `সংযোগ সফল! গুগল অ্যাপস স্ক্রিপ্ট রেসপন্স টাইম: ${data.pingDuration}ms`,
        });
      } else {
        setPingResult({ success: false, duration: 0 });
        setStatusMessage({
          type: 'error',
          text: data.error || 'সংযোগ ব্যর্থ হয়েছে। অনুগ্রহ করে ডেপ্লয়মেন্ট ইউআরএল (Deployment URL) সঠিক আছে কিনা যাচাই করুন।',
        });
      }
      setTesting(false);
    } catch (err: any) {
      setTesting(false);
      setStatusMessage({ type: 'error', text: err.message || 'কানেকশন টেস্ট ব্যর্থ হয়েছে।' });
    }
  };

  const handleSaveAndSync = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gasUrl) return;
    setSaving(true);
    setStatusMessage(null);

    try {
      const res = await fetch('/api/admin/database', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gasUrl, testOnly: false }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        if (data.gasUrl) {
          setGasUrl(data.gasUrl);
        }
        setStatusMessage({
          type: 'success',
          text: `ডাটাবেজ ইউআরএল সংরক্ষিত এবং সফলভাবে সংযুক্ত হয়েছে (${data.pingDuration}ms)!`,
        });
        await fetchConfig();
      } else {
        setStatusMessage({
          type: 'error',
          text: data.error || 'ডাটাবেজ কনফিগারেশন সংরক্ষণ ব্যর্থ হয়েছে।',
        });
      }
      setSaving(false);
    } catch (err: any) {
      setSaving(false);
      setStatusMessage({ type: 'error', text: err.message || 'সংরক্ষণ ব্যর্থ হয়েছে।' });
    }
  };

  const handlePullFromSheets = async () => {
    setPulling(true);
    setStatusMessage(null);
    try {
      const res = await fetch('/api/admin/database', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'pull' }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setStatusMessage({ type: 'success', text: data.message || 'গুগল শিট থেকে ডাটা সফলভাবে রিফ্রেশ করা হয়েছে।' });
      } else {
        setStatusMessage({ type: 'error', text: data.error || 'গুগল শিট থেকে ডাটা আনতে সমস্যা হয়েছে।' });
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'ডাটা আনার অনুরোধ ব্যর্থ হয়েছে।' });
    } finally {
      setPulling(false);
    }
  };

  const handlePushToSheets = async () => {
    if (!confirm('আপনি কি নিশ্চিত যে বর্তমান সমস্ত ডাটা গুগল শিটে পাঠাতে চান? এটি স্প্রেডশিটের ডাটা হালনাগাদ করবে।')) return;
    setPushing(true);
    setStatusMessage(null);
    try {
      const res = await fetch('/api/admin/database', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'push' }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setStatusMessage({ type: 'success', text: data.message || 'গুগল শিটে ডাটা সফলভাবে পাঠানো হয়েছে।' });
      } else {
        setStatusMessage({ type: 'error', text: data.error || 'গুগল শিটে ডাটা পাঠাতে ব্যর্থ হয়েছে।' });
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'ডাটা পাঠানোর অনুরোধ ব্যর্থ হয়েছে।' });
    } finally {
      setPushing(false);
    }
  };

  // If locked, render the Master Security PIN Protection Screen (Option 2)
  if (!isUnlocked) {
    return (
      <div className="max-w-md mx-auto py-12 px-4">
        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-xl space-y-6 text-center">
          <div className="w-16 h-16 bg-amber-50 text-amber-600 rounded-3xl flex items-center justify-center mx-auto border border-amber-200 shadow-sm">
            <Lock className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <h2 className="text-xl font-extrabold text-slate-800">
              🔒 ডাটাবেজ সেকশন সুরক্ষিত
            </h2>
            <p className="text-xs text-slate-500 leading-relaxed">
              মেসের মাস্টার ডাটাবেজ ও গুগল শিট সংযোগের সুরক্ষার্থে এই সেকশনটি লক করা রয়েছে। প্রবেশের জন্য আপনার অ্যাডমিন পাসওয়ার্ড বা মাস্টার পিন দিন।
            </p>
          </div>

          {pinError && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-bold rounded-xl flex items-center justify-center space-x-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{pinError}</span>
            </div>
          )}

          <form onSubmit={handleUnlock} className="space-y-4 text-left">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                মাস্টার সিকিউরিটি পিন / সুপার অ্যাডমিন পাসওয়ার্ড
              </label>
              <div className="relative">
                <input
                  type={showPin ? 'text' : 'password'}
                  required
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value)}
                  placeholder="পিন বা পাসওয়ার্ড লিখুন..."
                  className="w-full pl-10 pr-10 py-3 bg-slate-50 border border-slate-300 rounded-xl text-sm font-mono text-slate-900 focus:outline-none focus:border-amber-500 focus:bg-white transition-all"
                />
                <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <button
                  type="button"
                  onClick={() => setShowPin(!showPin)}
                  className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-600"
                >
                  {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={unlocking || !pinInput.trim()}
              className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-sm rounded-xl shadow-md transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              {unlocking ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>যাচাই হচ্ছে...</span>
                </>
              ) : (
                <>
                  <Unlock className="w-4 h-4" />
                  <span>🔓 আনলক করে প্রবেশ করুন</span>
                </>
              )}
            </button>
          </form>

          <div className="pt-2 border-t border-slate-100">
            <p className="text-[11px] text-slate-400">
              💡 তথ্য: আপনি আপনার সুপার অ্যাডমিন পাসওয়ার্ড অথবা ডিফল্ট মাস্টার পিন <span className="font-bold text-slate-600 font-mono">2026</span> ব্যবহার করতে পারেন।
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Unlocked State: Streamlined, must-have options only (No destructive wipe button)
  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 sm:p-3 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-100 flex-shrink-0">
            <Database className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-lg sm:text-xl font-bold text-slate-800">ডাটাবেজ কানেকশন ও গুগল শিট সিঙ্ক</h2>
              <span className="text-[11px] font-extrabold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                🔓 আনলকড
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              গুগল অ্যাপস স্ক্রিপ্ট (Google Apps Script) লাইভ ডাটাবেজ সংযোগ ও তথ্য সিঙ্ক্রোনাইজেশন।
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={handleLockAgain}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl flex items-center space-x-1.5 transition-all border border-slate-200"
          >
            <Lock className="w-3.5 h-3.5 text-slate-500" />
            <span>লক করুন (Lock)</span>
          </button>
        </div>
      </div>

      {statusMessage && (
        <div
          className={`p-4 rounded-2xl border flex items-center space-x-3 text-sm font-semibold shadow-sm ${
            statusMessage.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}
        >
          {statusMessage.type === 'success' ? (
            <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* 1. Essential Option: Google Sheets Connection & URL */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div>
          <h3 className="text-base font-bold text-slate-800">গুগল অ্যাপস স্ক্রিপ্ট ওয়েব অ্যাপ ইউআরএল (Web App URL)</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            এই এন্ডপয়েন্টটি অ্যাপ্লিকেশনকে আপনার গুগল স্প্রেডশিটের সাথে লাইভ ডাটাবেজ হিসেবে সংযুক্ত রাখে।
          </p>
        </div>

        <form onSubmit={handleSaveAndSync} className="space-y-4">
          <div>
            <div className="relative">
              <input
                type="url"
                required
                value={gasUrl}
                onChange={(e) => setGasUrl(e.target.value)}
                placeholder="https://script.google.com/macros/s/AKfycb.../exec"
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-sm font-mono text-slate-900 focus:outline-none focus:border-emerald-500 focus:bg-white transition-all"
              />
              <Link2 className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
            </div>
            <p className="text-[11px] text-slate-500 mt-1.5 leading-normal">
              💡 <span className="font-semibold text-slate-700">নোট:</span> এটি স্প্রেডশিটের ভিউ লিংক নয়, Apps Script ➔ Deploy ➔ Web app থেকে প্রাপ্ত <span className="font-mono text-emerald-700 font-bold">https://script.google.com/macros/s/.../exec</span> লিংক হতে হবে।
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={testing || saving || !gasUrl}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl flex items-center space-x-2 transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${testing ? 'animate-spin text-emerald-600' : ''}`} />
              <span>{testing ? 'সংযোগ পরীক্ষা করা হচ্ছে...' : '🔍 লাইভ সংযোগ টেস্ট করুন'}</span>
            </button>

            <button
              type="submit"
              disabled={saving || testing || !gasUrl}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl flex items-center space-x-2 shadow-md transition-all disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              <span>{saving ? 'সংরক্ষণ হচ্ছে...' : '💾 সংরক্ষণ ও সংযোগ নিশ্চিত করুন'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* 2. Essential Option: Pull and Push Synchronization */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div>
          <h3 className="text-base font-bold text-slate-800">মাস্টার ডাটাবেজ সিঙ্ক্রোনাইজেশন (Pull & Push)</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            গুগল শিট থেকে নতুন ডাটা রিফ্রেশ করতে অথবা বর্তমান সমস্ত তথ্য গুগল শিটে হালনাগাদ করতে নিচের বাটনগুলো ব্যবহার করুন।
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 sm:gap-4 pt-1">
          <button
            type="button"
            onClick={handlePullFromSheets}
            disabled={pulling || pushing || !gasUrl}
            className="px-4 sm:px-5 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs rounded-xl flex items-center space-x-2 border border-emerald-300 transition-all shadow-sm disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${pulling ? 'animate-spin text-emerald-600' : 'text-emerald-700'}`} />
            <span>{pulling ? 'ডাটা আনা হচ্ছে...' : '🔄 গুগল শিট থেকে ডাটা আনুন (Pull Live Data)'}</span>
          </button>

          <button
            type="button"
            onClick={handlePushToSheets}
            disabled={pulling || pushing || !gasUrl}
            className="px-4 sm:px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl flex items-center space-x-2 transition-all shadow-sm disabled:opacity-50"
          >
            <Send className={`w-4 h-4 ${pushing ? 'animate-pulse text-emerald-400' : ''}`} />
            <span>{pushing ? 'ডাটা পাঠানো হচ্ছে...' : '⬆️ সম্পূর্ণ ডাটাবেজ শিটে পাঠান (Push to Sheet)'}</span>
          </button>
        </div>
      </div>

      {/* 3. Guide Card */}
      <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 text-xs text-slate-600 space-y-2">
        <h4 className="font-bold text-slate-800 text-sm">💡 গুগল অ্যাপস স্ক্রিপ্ট সেটআপ সংক্ষেপ:</h4>
        <p className="leading-relaxed">
          আপনার গুগল স্প্রেডশিটে <span className="font-semibold text-slate-800">Extensions ➔ Apps Script</span>-এ কোড পেস্ট করে <span className="font-semibold text-slate-800">Deploy ➔ New deployment (Web app, Anyone access)</span> নির্বাচন করে полученный URL টি ওপরের বক্সে সংরক্ষণ করুন।
        </p>
      </div>
    </div>
  );
}
