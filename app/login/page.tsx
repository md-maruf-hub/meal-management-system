'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Lock, Phone, ArrowRight, Mail, KeyRound, CheckCircle, X } from 'lucide-react';

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
        setError(data.error || 'লগইন ব্যর্থ হয়েছে। ফোন, আইডি বা পাসওয়ার্ড সঠিক দিন।');
        setLoading(false);
        return;
      }

      router.push('/dashboard');
    } catch (err) {
      setError('সার্ভারে সমস্যা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।');
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
        setForgotErr(data.error || 'ওটিপি কোড পাঠানো সম্ভব হয়নি।');
        setForgotLoading(false);
        return;
      }

      setForgotMsg(data.message || 'আপনার ইমেইলে ওটিপি কোড পাঠানো হয়েছে। ইনবক্স চেক করুন।');
      setStep('VERIFY');
      setForgotLoading(false);
    } catch (err) {
      setForgotErr('নেটওয়ার্ক সমস্যা। অনুগ্রহ করে আবার চেষ্টা করুন।');
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
        setForgotErr(data.error || 'পাসওয়ার্ড রিসেট ব্যর্থ হয়েছে।');
        setForgotLoading(false);
        return;
      }

      setForgotMsg('পাসওয়ার্ড সফলভাবে পরিবর্তন হয়েছে! এখন নতুন পাসওয়ার্ড দিয়ে লগইন করুন।');
      setTimeout(() => {
        setShowForgotModal(false);
        setStep('EMAIL');
      }, 2000);
      setForgotLoading(false);
    } catch (err) {
      setForgotErr('নেটওয়ার্ক সমস্যা। অনুগ্রহ করে আবার চেষ্টা করুন।');
      setForgotLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-slate-800 border border-slate-700 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-slate-900 font-extrabold text-2xl flex items-center justify-center mx-auto shadow-lg">
            ম
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">মিল ম্যানেজমেন্ট সিস্টেম</h2>
          <p className="text-xs text-slate-400">মেম্বার আইডি, ফোন নম্বর অথবা নিবন্ধিত ইমেইল দিয়ে প্রবেশ করুন</p>
        </div>

        {error && (
          <div className="p-3 bg-red-950/80 border border-red-800 text-red-300 text-xs font-semibold rounded-lg text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              ফোন নম্বর, ইমেইল অথবা মেম্বার আইডি
            </label>
            <div className="relative">
              <input
                type="text"
                required
                placeholder="যেমন: 01700000000 অথবা user@email.com"
                value={phoneOrId}
                onChange={(e) => setPhoneOrId(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
              <Phone className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-medium text-slate-300">
                পাসওয়ার্ড
              </label>
              <button
                type="button"
                onClick={() => {
                  setShowForgotModal(true);
                  setStep('EMAIL');
                  setForgotErr('');
                  setForgotMsg('');
                }}
                className="text-xs text-emerald-400 hover:underline"
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
                className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
              <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-lg shadow-lg transition-colors flex items-center justify-center space-x-2"
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

        <div className="text-center pt-4 border-t border-slate-700">
          <Link href="/register" className="text-xs text-emerald-400 hover:underline font-medium">
            অ্যাকাউন্ট নেই? নতুন সদস্য নিবন্ধনের আবেদন করুন
          </Link>
        </div>
      </div>

      {/* Forgot Password OTP Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-700 w-full max-w-md rounded-2xl p-6 shadow-2xl relative space-y-4 text-white">
            <button
              onClick={() => setShowForgotModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-3">
              <KeyRound className="w-6 h-6 text-emerald-400" />
              <h3 className="text-lg font-bold">ইমেইল ওটিপি দিয়ে পাসওয়ার্ড রিসেট</h3>
            </div>

            {forgotErr && (
              <div className="p-3 bg-red-950/80 border border-red-800 text-red-300 text-xs font-semibold rounded-lg">
                {forgotErr}
              </div>
            )}
            {forgotMsg && (
              <div className="p-3 bg-emerald-950/80 border border-emerald-800 text-emerald-300 text-xs font-semibold rounded-lg flex items-center space-x-2">
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
                  <label className="block text-xs font-medium text-slate-300 mb-1">নিবন্ধিত ইমেইল</label>
                  <div className="relative">
                    <input
                      type="email"
                      required
                      placeholder="যেমন: member@gmail.com"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-emerald-500"
                    />
                    <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={forgotLoading}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 font-semibold text-sm rounded-lg shadow transition-colors"
                >
                  {forgotLoading ? 'ওটিপি পাঠানো হচ্ছে...' : 'ওটিপি কোড পাঠান'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleResetPassword} className="space-y-4">
                <p className="text-xs text-slate-400">
                  <span className="font-bold text-white">{forgotEmail}</span> ঠিকানায় পাঠানো ৬ সংখ্যার ওটিপি কোড দিন এবং নতুন পাসওয়ার্ড সেট করুন।
                </p>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">৬ সংখ্যার ওটিপি কোড</label>
                  <input
                    type="text"
                    required
                    placeholder="যেমন: 582914"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white font-mono tracking-widest focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">নতুন পাসওয়ার্ড</label>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <button
                  type="submit"
                  disabled={forgotLoading}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 font-semibold text-sm rounded-lg shadow transition-colors"
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
