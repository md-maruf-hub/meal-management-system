'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Lock, Phone, ArrowRight, Mail, KeyRound, CheckCircle, X } from 'lucide-react';
import Logo from '../../components/ui/Logo';

export default function LoginPage() {
  const router = useRouter();
  const [phoneOrId, setPhoneOrId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Forgot password modal state
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [step, setStep] = useState<'EMAIL' | 'VERIFY'>('EMAIL');
  const [forgotMsg, setForgotMsg] = useState('');
  const [forgotErr, setForgotErr] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneOrId, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'লগইন ব্যর্থ হয়েছে। ফোন, আইডি বা পাসওয়ার্ড সঠিক দিন।');
        setLoading(false);
        return;
      }

      router.push('/dashboard');
    } catch (err) {
      setError('সার্ভারে সমস্যা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।');
      setLoading(false);
    }
  };

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotErr('');
    setForgotMsg('');
    setForgotLoading(true);

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail }),
      });

      const data = await res.json();
      if (!res.ok) {
        setForgotErr(data.error || 'ওটিপি কোড পাঠানো সম্ভব হয়নি।');
        setForgotLoading(false);
        return;
      }

      setForgotMsg(data.message || 'আপনার ইমেইলে ওটিপি কোড পাঠানো হয়েছে। ইনবক্স চেক করুন।');
      setStep('VERIFY');
      setForgotLoading(false);
    } catch (err) {
      setForgotErr('নেটওয়ার্ক সমস্যা। অনুগ্রহ করে আবার চেষ্টা করুন।');
      setForgotLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotErr('');
    setForgotMsg('');
    setForgotLoading(true);

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: forgotEmail,
          code: otpCode,
          newPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setForgotErr(data.error || 'পাসওয়ার্ড রিসেট ব্যর্থ হয়েছে।');
        setForgotLoading(false);
        return;
      }

      setForgotMsg('পাসওয়ার্ড সফলভাবে পরিবর্তন হয়েছে! এখন নতুন পাসওয়ার্ড দিয়ে লগইন করুন।');
      setTimeout(() => {
        setShowForgotModal(false);
        setStep('EMAIL');
      }, 2000);
      setForgotLoading(false);
    } catch (err) {
      setForgotErr('নেটওয়ার্ক সমস্যা। অনুগ্রহ করে আবার চেষ্টা করুন।');
      setForgotLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white/[0.07] backdrop-blur-xl border border-white/10 rounded-3xl p-7 sm:p-10 shadow-2xl space-y-7">
        <div className="text-center space-y-3">
          <div className="flex justify-center">
            <Logo size="xl" showText={false} />
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">মিল ম্যানেজমেন্ট সিস্টেম</h2>
          <p className="text-xs text-slate-400">মেম্বার আইডি, ফোন নম্বর অথবা নিবন্ধিত ইমেইল দিয়ে প্রবেশ করুন</p>
        </div>

        {error && (
          <div className="p-3.5 bg-red-500/10 border border-red-500/20 text-red-300 text-xs font-semibold rounded-xl text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              ফোন নম্বর, ইমেইল অথবা মেম্বার আইডি
            </label>
            <div className="relative">
              <input
                type="text"
                required
                placeholder="যেমন: 01700000000 অথবা user@email.com"
                value={phoneOrId}
                onChange={(e) => setPhoneOrId(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-white/[0.06] border border-white/10 rounded-xl text-sm text-white placeholder-white/30 focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400/30 transition-colors"
              />
              <Phone className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-medium text-slate-300">
                পাসওয়ার্ড
              </label>
              <button
                type="button"
                onClick={() => {
                  setShowForgotModal(true);
                  setStep('EMAIL');
                  setForgotErr('');
                  setForgotMsg('');
                }}
                className="text-xs text-emerald-400 hover:text-emerald-300 hover:underline transition-colors"
              >
                পাসওয়ার্ড ভুলে গেছেন?
              </button>
            </div>
            <div className="relative">
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-white/[0.06] border border-white/10 rounded-xl text-sm text-white placeholder-white/30 focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400/30 transition-colors"
              />
              <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl shadow-lg shadow-emerald-600/20 transition-all btn-press flex items-center justify-center space-x-2 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span>লগইন হচ্ছে...</span>
            ) : (
              <>
                <span>লগইন করুন</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="text-center pt-5 border-t border-white/10">
          <Link href="/register" className="text-sm text-emerald-400 hover:text-emerald-300 hover:underline font-medium transition-colors">
            অ্যাকাউন্ট নেই? নতুন সদস্য নিবন্ধনের আবেদন করুন
          </Link>
        </div>
      </div>

      {/* Forgot Password OTP Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white/[0.07] backdrop-blur-xl border border-white/10 w-full max-w-md rounded-3xl p-7 shadow-2xl relative space-y-5 text-white">
            <button
              onClick={() => setShowForgotModal(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-3">
              <KeyRound className="w-6 h-6 text-emerald-400" />
              <h3 className="text-lg font-bold">ইমেইল ওটিপি দিয়ে পাসওয়ার্ড রিসেট</h3>
            </div>

            {forgotErr && (
              <div className="p-3.5 bg-red-500/10 border border-red-500/20 text-red-300 text-xs font-semibold rounded-xl">
                {forgotErr}
              </div>
            )}
            {forgotMsg && (
              <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-semibold rounded-xl flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>{forgotMsg}</span>
              </div>
            )}

            {step === 'EMAIL' ? (
              <form onSubmit={handleSendOTP} className="space-y-4">
                <p className="text-xs text-slate-400">
                  আপনার নিবন্ধিত ইমেইল ঠিকানা দিন। আপনার ইনবক্সে ৬ সংখ্যার ওটিপি কোড পাঠানো হবে।
                </p>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">নিবন্ধিত ইমেইল</label>
                  <div className="relative">
                    <input
                      type="email"
                      required
                      placeholder="যেমন: member@gmail.com"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-white/[0.06] border border-white/10 rounded-xl text-sm text-white placeholder-white/30 focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400/30 transition-colors"
                    />
                    <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={forgotLoading}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 font-semibold text-sm rounded-xl shadow-lg shadow-emerald-600/20 transition-all btn-press disabled:opacity-60"
                >
                  {forgotLoading ? 'ওটিপি পাঠানো হচ্ছে...' : 'ওটিপি কোড পাঠান'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleResetPassword} className="space-y-4">
                <p className="text-xs text-slate-400">
                  <span className="font-bold text-white">{forgotEmail}</span> ঠিকানায় পাঠানো ৬ সংখ্যার ওটিপি কোড দিন এবং নতুন পাসওয়ার্ড সেট করুন।
                </p>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">৬ সংখ্যার ওটিপি কোড</label>
                  <input
                    type="text"
                    required
                    placeholder="যেমন: 582914"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                    className="w-full px-4 py-3 bg-white/[0.06] border border-white/10 rounded-xl text-sm text-white font-mono tracking-widest placeholder-white/30 focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400/30 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">নতুন পাসওয়ার্ড</label>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-4 py-3 bg-white/[0.06] border border-white/10 rounded-xl text-sm text-white placeholder-white/30 focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400/30 transition-colors"
                  />
                </div>
                <button
                  type="submit"
                  disabled={forgotLoading}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 font-semibold text-sm rounded-xl shadow-lg shadow-emerald-600/20 transition-all btn-press disabled:opacity-60"
                >
                  {forgotLoading ? 'যাচাই ও রিসেট হচ্ছে...' : 'ওটিপি যাচাই করে পাসওয়ার্ড রিসেট করুন'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
