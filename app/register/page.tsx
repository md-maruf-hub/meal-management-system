'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { User, Phone, Home, Mail, Lock, PhoneCall, CheckCircle } from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    roomNo: '',
    email: '',
    address: '',
    emergencyContact: '',
    password: '',
  });

  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'নিবন্ধন ব্যর্থ হয়েছে। সঠিক তথ্য প্রদান করুন।');
        setLoading(false);
        return;
      }

      setMessage('নিবন্ধন আবেদন সফলভাবে জমা হয়েছে! সুপার অ্যাডমিনের অনুমোদনের অপেক্ষা করুন।');
      setLoading(false);
      setTimeout(() => {
        router.push('/login');
      }, 2500);
    } catch (err) {
      setError('একটি সমস্যা দেখা দিয়েছে। দয়া করে আবার চেষ্টা করুন।');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="max-w-lg w-full bg-slate-800 border border-slate-700 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold text-white tracking-tight">নতুন সদস্য নিবন্ধন</h2>
          <p className="text-sm text-slate-400">মেস মেম্বারশিপের জন্য নিচের তথ্যগুলো পূরণ করুন</p>
        </div>

        {message && (
          <div className="p-3 bg-emerald-950/80 border border-emerald-800 text-emerald-300 text-xs font-semibold rounded-lg text-center flex items-center justify-center space-x-2">
            <CheckCircle className="w-4 h-4" />
            <span>{message}</span>
          </div>
        )}

        {error && (
          <div className="p-3 bg-red-950/80 border border-red-800 text-red-300 text-xs font-semibold rounded-lg text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">পূর্ণ নাম *</label>
              <div className="relative">
                <input
                  type="text"
                  required
                  placeholder="যেমন: নূর-আলম"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
                <User className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">ফোন নম্বর *</label>
              <div className="relative">
                <input
                  type="text"
                  required
                  placeholder="01700000000"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
                <Phone className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">রুম নম্বর *</label>
              <div className="relative">
                <input
                  type="text"
                  required
                  placeholder="১০১"
                  value={formData.roomNo}
                  onChange={(e) => setFormData({ ...formData, roomNo: e.target.value })}
                  className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
                <Home className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">ইমেইল (ঐচ্ছিক)</label>
              <div className="relative">
                <input
                  type="email"
                  placeholder="member@gmail.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
                <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">জরুরি যোগাযোগ নম্বর</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="01900000000"
                  value={formData.emergencyContact}
                  onChange={(e) => setFormData({ ...formData, emergencyContact: e.target.value })}
                  className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
                <PhoneCall className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">পাসওয়ার্ড *</label>
              <div className="relative">
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
                <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">স্থায়ী ঠিকানা / বিবরণ</label>
            <textarea
              rows={2}
              placeholder="ঢাকা, বাংলাদেশ"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-lg shadow-lg transition-colors"
          >
            {loading ? 'আবেদন জমা হচ্ছে...' : 'নিবন্ধনের আবেদন জমা দিন'}
          </button>
        </form>

        <div className="text-center pt-2">
          <Link href="/login" className="text-xs text-slate-400 hover:text-white">
            ইতিমধ্যে অ্যাকাউন্ট আছে? <span className="text-emerald-400 underline">লগইন করুন</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
