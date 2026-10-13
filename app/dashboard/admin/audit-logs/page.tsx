'use client';

import React, { useState, useEffect } from 'react';
import { AuditLog } from '../../../../lib/types';
import { History, ShieldCheck } from 'lucide-react';

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/audit-logs`);
      const data = await res.json();
      setLogs(data.logs || []);
      setLoading(false);
    } catch (err) {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 sm:p-3 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-100 flex-shrink-0">
            <History className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-800">সিস্টেম অডিট ট্রেইল (নিরাপত্তা রেকর্ড)</h2>
            <p className="text-xs text-slate-500">
              সংবেদনশীল কার্যক্রম, সদস্য অনুমোদন ও মাসিক হিসাব ক্লোজ করার অপরিবর্তনীয় নিরাপত্তা লগ।
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-200 font-bold text-slate-800 text-sm sm:text-base flex items-center space-x-2">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>নিরাপত্তা অডিট লগ ({logs.length})</span>
        </div>

        <div className="divide-y divide-slate-100 text-sm">
          {loading ? (
            <div className="p-8 text-center text-slate-500">অডিট হিস্ট্রি লোড হচ্ছে...</div>
          ) : logs.length === 0 ? (
            <div className="p-8 text-center text-slate-500">কোনো অডিট রেকর্ড পাওয়া যায়নি।</div>
          ) : (
            logs.map((log) => (
              <div key={log.id} className="p-4 space-y-1 hover:bg-slate-50 transition-colors">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <span className="font-bold text-slate-800 text-sm">{log.action}</span>
                  <span className="text-xs text-slate-500">{new Date(log.timestamp).toLocaleString('bn-BD')}</span>
                </div>
                <p className="text-xs text-slate-600">{log.details}</p>
                <p className="text-[11px] text-slate-400">সম্পাদন করেছেন: <span className="font-semibold text-slate-600">{log.userName}</span></p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
