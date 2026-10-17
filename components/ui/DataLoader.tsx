import React from 'react';
import { RefreshCw, Utensils, Database } from 'lucide-react';

interface DataLoaderProps {
  text?: string;
  subtext?: string;
  variant?: 'spinner' | 'table' | 'cards' | 'inline';
  className?: string;
}

export default function DataLoader({
  text = 'ডাটা লোড হচ্ছে...',
  subtext = 'সার্ভার ও গুগল শিট থেকে তথ্য সংগ্রহ করা হচ্ছে, অনুগ্রহ করে অপেক্ষা করুন...',
  variant = 'spinner',
  className = '',
}: DataLoaderProps) {
  if (variant === 'inline') {
    return (
      <div className={`flex items-center justify-center space-x-2 py-4 text-emerald-700 text-xs font-bold ${className}`}>
        <RefreshCw className="w-4 h-4 animate-spin text-emerald-600" />
        <span>{text}</span>
      </div>
    );
  }

  if (variant === 'cards') {
    return (
      <div className={`space-y-4 py-4 ${className}`}>
        {/* Animated Status Header */}
        <div className="flex items-center justify-center space-x-2.5 p-3 bg-emerald-50/80 border border-emerald-200/80 rounded-2xl text-emerald-800 text-xs font-bold shadow-sm animate-pulse">
          <RefreshCw className="w-4 h-4 animate-spin text-emerald-600 flex-shrink-0" />
          <span>{text}</span>
        </div>

        {/* Shimmer Skeleton Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3 relative overflow-hidden"
            >
              <div className="flex items-center justify-between">
                <div className="h-3 w-20 bg-slate-200 rounded-full animate-pulse" />
                <div className="w-7 h-7 bg-slate-100 rounded-lg animate-pulse" />
              </div>
              <div className="h-7 w-28 bg-emerald-100 rounded-lg animate-pulse" />
              <div className="h-2.5 w-36 bg-slate-100 rounded-full animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (variant === 'table') {
    return (
      <div className={`space-y-4 py-4 ${className}`}>
        {/* Animated Status Header */}
        <div className="flex items-center justify-between p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-xs font-bold shadow-sm">
          <div className="flex items-center space-x-2.5">
            <RefreshCw className="w-4 h-4 animate-spin text-emerald-600 flex-shrink-0" />
            <span>{text}</span>
          </div>
          <span className="text-[11px] text-emerald-600 font-normal hidden sm:inline">লাইভ সিঙ্ক্রোনাইজেশন হচ্ছে</span>
        </div>

        {/* Shimmer Skeleton Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-4 space-y-3">
          <div className="h-9 bg-slate-100 rounded-xl animate-pulse" />
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center space-x-3 py-2 border-b border-slate-50 last:border-0">
              <div className="w-8 h-8 rounded-xl bg-slate-200 animate-pulse flex-shrink-0" />
              <div className="h-4 flex-1 bg-slate-100 rounded-lg animate-pulse" />
              <div className="h-4 w-20 bg-slate-200 rounded-lg animate-pulse hidden sm:block" />
              <div className="h-4 w-16 bg-emerald-100 rounded-lg animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Default: Prominent Animated Spinner Card
  return (
    <div className={`p-8 sm:p-12 bg-white rounded-3xl border border-slate-200 shadow-sm text-center max-w-lg mx-auto space-y-4 my-6 ${className}`}>
      {/* Outer Pulse Ring */}
      <div className="relative w-16 h-16 mx-auto flex items-center justify-center">
        <div className="absolute inset-0 rounded-full bg-emerald-400 opacity-20 animate-ping" />
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-lg shadow-emerald-500/30">
          <RefreshCw className="w-7 h-7 animate-spin" />
        </div>
      </div>

      <div className="space-y-1.5">
        <h3 className="text-base sm:text-lg font-extrabold text-slate-800 tracking-tight">
          {text}
        </h3>
        {subtext && (
          <p className="text-xs text-slate-500 leading-relaxed max-w-xs mx-auto">
            {subtext}
          </p>
        )}
      </div>

      <div className="inline-flex items-center space-x-1.5 px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-[11px] font-semibold border border-slate-200">
        <Database className="w-3.5 h-3.5 text-emerald-600" />
        <span>রিয়েল-টাইম তথ্য হালনাগাদ</span>
      </div>
    </div>
  );
}
