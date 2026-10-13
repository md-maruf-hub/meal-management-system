'use client';

import React, { useState, useEffect } from 'react';
import { Database, CheckCircle, AlertCircle, RefreshCw, Send, ShieldCheck, Link2, Trash2 } from 'lucide-react';

export default function AdminDatabasePage() {
  const [gasUrl, setGasUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [pingResult, setPingResult] = useState<{ success: boolean; duration: number } | null>(null);
  const [pulling, setPulling] = useState(false);
  const [pushing, setPushing] = useState(false);
  const [wiping, setWiping] = useState(false);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/database');
      const data = await res.json();
      if (data.gasUrl) {
        setGasUrl(data.gasUrl);
      }
      setLoading(false);
    } catch (err) {
      setLoading(false);
    }
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
        setStatusMessage({
          type: 'success',
          text: `ডাটাবেজ ইউআরএল সংরক্ষিত এবং সফলভাবে সিঙ্ক সম্পন্ন হয়েছে (${data.pingDuration}ms)!`,
        });
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

  const handleWipeDatabase = async () => {
    if (!confirm('⚠️ সতর্কতা: আপনি কি নিশ্চিত যে সমস্ত টেস্ট ডাটা মুছে ডাটাবেজ সম্পূর্ণ ফ্রেশ/ক্লিন করতে চান?\n\nএতে শুধুমাত্র সুপার অ্যাডমিন অ্যাকাউন্ট বহাল থাকবে এবং বাকি সব মিল, বাজার, জমা, মেম্বার ও পুরনো মাসের শিট মুছে যাবে।')) return;
    setWiping(true);
    setStatusMessage(null);
    try {
      const res = await fetch('/api/admin/database', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'wipe' }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setStatusMessage({ type: 'success', text: data.message || 'ডাটাবেজ এবং গুগল শিট সম্পূর্ণ ফ্রেশ করা হয়েছে।' });
      } else {
        setStatusMessage({ type: 'error', text: data.error || 'ডাটাবেজ ফ্রেশ করতে সমস্যা হয়েছে।' });
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'ডাটাবেজ ফ্রেশ করার অনুরোধ ব্যর্থ হয়েছে।' });
    } finally {
      setWiping(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 sm:p-3 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-100 flex-shrink-0">
            <Database className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-800">ডাটাবেজ কানেকশন ও গুগল শিট সিঙ্ক</h2>
            <p className="text-xs text-slate-500">
              সিস্টেমের গুগল অ্যাপস স্ক্রিপ্ট (Google Apps Script) ওয়েব অ্যাপ ডাটাবেজ ব্যাকএন্ড কনফিগার ও সিঙ্ক্রোনাইজ করুন।
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl text-xs font-bold text-emerald-800 self-start sm:self-auto">
          <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>সুপার অ্যাডমিন অ্যাক্সেস</span>
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

      {/* Main Configuration Card */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
        <div>
          <h3 className="text-base font-bold text-slate-800">গুগল অ্যাপস স্ক্রিপ্ট ওয়েব অ্যাপ ইউআরএল (Web App URL)</h3>
          <p className="text-xs text-slate-500 mt-1">
            এই এন্ডপয়েন্টটি ওয়েব অ্যাপ্লিকেশনকে আপনার গুগল স্প্রেডশিটের সাথে লাইভ ডাটাবেজ হিসেবে সংযুক্ত রাখে।
          </p>
        </div>

        <form onSubmit={handleSaveAndSync} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              ডেপ্লয়মেন্ট এক্সিকিউটেবল ইউআরএল (Deployment URL) *
            </label>
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
            <p className="text-[11px] text-slate-500 mt-1.5">
              নিশ্চিত করুন যে Google Apps Script এ Deploy করার সময় Who has access: <span className="font-semibold text-slate-700">"Anyone"</span> নির্ধারণ করা আছে।
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={testing || saving || !gasUrl}
              className="px-4 sm:px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl flex items-center space-x-2 transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${testing ? 'animate-spin text-emerald-600' : ''}`} />
              <span>{testing ? 'সংযোগ পরীক্ষা করা হচ্ছে...' : '🔍 লাইভ সংযোগ টেস্ট করুন'}</span>
            </button>

            <button
              type="submit"
              disabled={saving || testing || !gasUrl}
              className="px-5 sm:px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl flex items-center space-x-2 shadow-md hover:shadow-emerald-600/30 transition-all disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              <span>{saving ? 'সংরক্ষণ ও সিঙ্ক হচ্ছে...' : '💾 সংরক্ষণ ও ডাটাবেজ সংযোগ করুন'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Live Data Operations Card */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div>
          <h3 className="text-base font-bold text-slate-800">সরাসরি গুগল শিট সিঙ্ক্রোনাইজেশন</h3>
          <p className="text-xs text-slate-500 mt-1">
            গুগল শিট হচ্ছে এই সিস্টেমের মূল মাস্টার ডাটাবেজ। আপনি যেকোনো সময় শিট থেকে নতুন ডাটা রিফ্রেশ (Pull) করতে পারেন বা বর্তমান ডাটা শিটে পাঠাতে (Push) পারেন।
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 sm:gap-4 pt-1">
          <button
            type="button"
            onClick={handlePullFromSheets}
            disabled={pulling || pushing || !gasUrl}
            className="px-4 sm:px-5 py-2.5 sm:py-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs rounded-xl flex items-center space-x-2 border border-emerald-300 transition-all shadow-sm disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${pulling ? 'animate-spin text-emerald-600' : 'text-emerald-700'}`} />
            <span>{pulling ? 'ডাটা আনা হচ্ছে...' : '🔄 গুগল শিট থেকে ডাটা আনুন (Pull Live Data)'}</span>
          </button>

          <button
            type="button"
            onClick={handlePushToSheets}
            disabled={pulling || pushing || !gasUrl}
            className="px-4 sm:px-5 py-2.5 sm:py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl flex items-center space-x-2 transition-all shadow-sm disabled:opacity-50"
          >
            <Send className={`w-4 h-4 ${pushing ? 'animate-pulse text-emerald-400' : ''}`} />
            <span>{pushing ? 'ডাটা পাঠানো হচ্ছে...' : '⬆️ সম্পূর্ণ ডাটাবেজ শিটে পাঠান (Push to Sheet)'}</span>
          </button>
        </div>
      </div>

      {/* Fresh / Reset Database Card */}
      <div className="bg-red-50/50 p-5 sm:p-6 rounded-2xl border border-red-200 shadow-sm space-y-4">
        <div>
          <div className="flex items-center space-x-2 text-red-700 font-bold text-base">
            <Trash2 className="w-5 h-5 flex-shrink-0" />
            <span>সিস্টেম ও ডাটাবেজ সম্পূর্ণ ফ্রেশ / রিসেট করুন (Clean & Reset)</span>
          </div>
          <p className="text-xs text-slate-600 mt-1">
            টেস্টিং শুরু করার আগে বা পুরনো সমস্ত টেস্ট ডাটা (মিল, বাজার, জমা, মেম্বার ইত্যাদি) এক ক্লিকে মুছে সিস্টেমকে সম্পূর্ণ নতুন অবস্থায় নিতে এই বাটনটি ব্যবহার করুন। শুধুমাত্র সুপার অ্যাডমিন অ্যাকাউন্ট বহাল থাকবে।
          </p>
        </div>

        <div>
          <button
            type="button"
            onClick={handleWipeDatabase}
            disabled={wiping || pulling || pushing}
            className="px-4 sm:px-5 py-2.5 sm:py-3 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl flex items-center space-x-2 transition-all shadow-sm disabled:opacity-50"
          >
            <Trash2 className={`w-4 h-4 ${wiping ? 'animate-spin' : ''}`} />
            <span>{wiping ? 'ডাটা মুছে ফ্রেশ করা হচ্ছে...' : '🧹 সম্পূর্ণ ডাটাবেজ ফ্রেশ ও রিসেট করুন'}</span>
          </button>
        </div>
      </div>

      {/* Guide Card */}
      <div className="bg-slate-50 p-5 sm:p-6 rounded-2xl border border-slate-200 text-xs text-slate-600 space-y-3">
        <h4 className="font-bold text-slate-800 text-sm">💡 কিভাবে গুগল অ্যাপস স্ক্রিপ্ট ইউআরএল তৈরি বা আপডেট করবেন:</h4>
        <ol className="list-decimal list-inside space-y-2 text-slate-600 leading-relaxed">
          <li>আপনার গুগল স্প্রেডশিট ওপেন করে উপরের মেনু থেকে <span className="font-semibold text-slate-800">Extensions ➔ Apps Script</span> এ ক্লিক করুন।</li>
          <li>প্রজেক্টের <span className="font-mono text-emerald-700 font-semibold">lib/gas/Code.gs</span> ফাইলের সমস্ত কোড কপি করে স্ক্রিপ্ট এডিটরে পেস্ট করুন।</li>
          <li>উপরের ডানপাশে <span className="font-semibold text-slate-800">Deploy ➔ New deployment</span> এ ক্লিক করুন।</li>
          <li>ধরন (type) হিসেবে <span className="font-semibold text-slate-800">Web app</span> সিলেক্ট করুন, Execute as: <span className="font-semibold text-slate-800">Me</span> দিন, এবং Who has access: <span className="font-semibold text-emerald-700">Anyone</span> নির্ধারণ করুন।</li>
          <li><span className="font-semibold text-slate-800">Deploy</span> বাটনে ক্লিক করে তৈরি হওয়া Web App URL টি কপি করে ওপরের বক্সে সংরক্ষণ করুন!</li>
        </ol>
      </div>
    </div>
  );
}
