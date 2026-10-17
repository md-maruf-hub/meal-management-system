'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { MonthlyReport } from '@/lib/types';
import { Printer, Download, ArrowLeft } from 'lucide-react';

export default function MainReportPage() {
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().toISOString().substring(0, 7));
  const [report, setReport] = useState<MonthlyReport | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReport();
  }, [selectedMonth]);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/reports?yearMonth=${selectedMonth}`);
      const data = await res.json();
      setReport(data.report || null);
      setLoading(false);
    } catch (err) {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    if (!report) return;

    const headers = [
      'Room No',
      'Member Name',
      'Meals',
      'Mill Rate',
      'Meal Cost',
      'Khala Bill',
      'Gas Bill',
      'Extra Cost',
      'Fridge Bill',
      'Total Cost',
      'Deposit',
      'RECEIVE (Refundable)',
      'GIVE (Payable)',
    ];

    const rows = report.memberCalculations.map((m) => {
      const rec = m.refundAmount ?? m.receiveBalance ?? 0;
      const give = m.dueAmount ?? m.giveBalance ?? 0;
      return [
        m.roomNo,
        `"${m.memberName}"`,
        m.meals,
        report.millRate.toFixed(3),
        m.mealCost.toFixed(2),
        m.khalaBill.toFixed(2),
        m.gasBill.toFixed(2),
        m.extraCost.toFixed(2),
        m.fridgeBill.toFixed(2),
        m.totalCost.toFixed(2),
        m.deposit.toFixed(2),
        rec.toFixed(2),
        give.toFixed(2),
      ];
    });

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Mill_Report_${selectedMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 p-3 sm:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Top Control Bar (Hidden on print) */}
        <div className="no-print bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <Link
              href="/dashboard"
              className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-slate-800">মাসিক মূল হিসাব বিবরণী</h2>
              <p className="text-xs text-slate-500">মেসের পূর্ণাঙ্গ হিসাব ও ক্যালকুলেশন শীট</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold focus:outline-none"
            />
            <button
              onClick={handleExportCSV}
              className="flex items-center space-x-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs rounded-xl shadow transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>সিএসভি এক্সপোর্ট (CSV)</span>
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center space-x-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-xl shadow transition-colors"
            >
              <Printer className="w-4 h-4" />
              <span>প্রিন্ট / পিডিএফ ডাউনলোড</span>
            </button>
          </div>
        </div>

        {/* Printable Main Report Sheet */}
        <div className="bg-white p-4 sm:p-8 rounded-2xl border border-slate-200 shadow-lg space-y-6">
          {/* Header */}
          <div className="border-b border-slate-200 pb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                মিল ম্যানেজমেন্ট সিস্টেম
              </h1>
              <p className="text-xs sm:text-sm font-medium text-emerald-700 mt-1">
                মাসিক মূল হিসাব ও সমন্বয় বিবরণী — {selectedMonth}
              </p>
              {report?.assignedManagers && report.assignedManagers.length > 0 ? (
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <span className="text-[11px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                    👑 চলতি দায়িত্বে ({report.assignedManagers.length}/৩ জন):
                  </span>
                  {report.assignedManagers.map((mgr) => (
                    <span
                      key={mgr.id}
                      className="text-[11px] font-extrabold px-2.5 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-300"
                    >
                      {mgr.name} {mgr.roomNo ? `(রুম ${mgr.roomNo})` : ''}
                    </span>
                  ))}
                </div>
              ) : report?.assignedManagerName ? (
                <p className="text-xs text-slate-600 mt-1 font-semibold">
                  👑 দায়িত্বপ্রাপ্ত ম্যানেজার: {report.assignedManagerName}
                </p>
              ) : null}
            </div>

            <div className="bg-slate-50 p-3.5 sm:p-4 rounded-xl border border-slate-200 text-left sm:text-right space-y-1 w-full sm:w-auto">
              <div className="text-xs text-slate-500">
                মোট মিল: <span className="font-bold text-slate-800">{report?.totalMeals || 0}</span>
              </div>
              <div className="text-xs text-slate-500">
                মোট বাজার খরচ: <span className="font-bold text-slate-800">৳ {report?.totalBazar.toFixed(2) || '0.00'}</span>
              </div>
              <div className="text-sm font-extrabold text-emerald-600">
                মিল রেট: ৳ {report?.millRate.toFixed(3) || '0.000'} / মিল
              </div>
              <div className="text-xs font-bold text-slate-700 pt-1 border-t border-slate-200">
                ম্যানেজারের হাতে জমা ক্যাশ:{' '}
                <span className={report?.cashInHand !== undefined && report.cashInHand >= 0 ? 'text-emerald-700 font-extrabold' : 'text-red-700 font-extrabold'}>
                  ৳ {report?.cashInHand !== undefined ? report.cashInHand.toFixed(2) : '0.00'}
                </span>
              </div>
            </div>
          </div>

          {/* Main Statement Table */}
          {loading ? (
            <div className="p-12 text-center text-slate-500">হিসাব বিবরণী তৈরি হচ্ছে...</div>
          ) : !report ? (
            <div className="p-8 text-center text-slate-500">এই মাসের কোনো হিসাব তথ্য পাওয়া যায়নি।</div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-xs text-left border-collapse min-w-[900px]">
                <thead>
                  <tr className="bg-slate-800 text-white uppercase text-[10px] tracking-wider">
                    <th className="p-3 text-center border-r border-slate-700">রুম</th>
                    <th className="p-3 border-r border-slate-700">সদস্যের নাম</th>
                    <th className="p-3 text-center border-r border-slate-700">মিল</th>
                    <th className="p-3 text-right border-r border-slate-700">মিল খরচ</th>
                    <th className="p-3 text-right border-r border-slate-700">খালা বিল</th>
                    <th className="p-3 text-right border-r border-slate-700">গ্যাস বিল</th>
                    <th className="p-3 text-right border-r border-slate-700">এক্সট্রা খরচ</th>
                    <th className="p-3 text-right border-r border-slate-700">ফ্রিজ বিল</th>
                    <th className="p-3 text-right bg-slate-900 border-r border-slate-700 font-bold">মোট খরচ</th>
                    <th className="p-3 text-right border-r border-slate-700 text-emerald-400 font-bold">জমা (ডিপোজিট)</th>
                    <th className="p-3 text-right text-emerald-400 font-extrabold border-r border-slate-700">পাবে (ফেরত)</th>
                    <th className="p-3 text-right text-red-400 font-extrabold">দেবে (বকেয়া)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {report.memberCalculations.map((m, idx) => {
                    const rec = m.refundAmount ?? m.receiveBalance ?? 0;
                    const give = m.dueAmount ?? m.giveBalance ?? 0;
                    return (
                      <tr key={m.memberId} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}>
                        <td className="p-3 text-center font-bold text-slate-700 border-r border-slate-200">
                          {m.roomNo}
                        </td>
                        <td className="p-3 font-semibold text-slate-900 border-r border-slate-200">
                          <div className="flex items-center justify-between gap-2">
                            <span>{m.memberName}</span>
                            {m.isSettled && (
                              <span className="text-[9px] bg-blue-100 text-blue-800 font-extrabold px-1.5 py-0.5 rounded border border-blue-200 uppercase tracking-wider flex-shrink-0">
                                সমন্বিত
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-3 text-center font-bold text-slate-800 border-r border-slate-200">
                          {m.meals}
                        </td>
                        <td className="p-3 text-right text-slate-700 border-r border-slate-200 font-mono">
                          ৳ {m.mealCost.toFixed(2)}
                        </td>
                        <td className="p-3 text-right text-slate-700 border-r border-slate-200 font-mono">
                          ৳ {m.khalaBill.toFixed(2)}
                        </td>
                        <td className="p-3 text-right text-slate-700 border-r border-slate-200 font-mono">
                          ৳ {m.gasBill.toFixed(2)}
                        </td>
                        <td className="p-3 text-right text-slate-700 border-r border-slate-200 font-mono">
                          ৳ {m.extraCost.toFixed(2)}
                        </td>
                        <td className="p-3 text-right text-slate-700 border-r border-slate-200 font-mono">
                          ৳ {m.fridgeBill.toFixed(2)}
                        </td>
                        <td className="p-3 text-right font-bold text-slate-900 bg-slate-100/70 border-r border-slate-200 font-mono">
                          ৳ {m.totalCost.toFixed(2)}
                        </td>
                        <td className="p-3 text-right font-bold text-emerald-600 border-r border-slate-200 font-mono">
                          ৳ {m.deposit.toFixed(2)}
                        </td>
                        <td className="p-3 text-right font-extrabold text-emerald-700 border-r border-slate-200 font-mono">
                          {rec > 0 ? `৳ ${rec.toFixed(2)}` : '-'}
                        </td>
                        <td className="p-3 text-right font-extrabold text-red-700 font-mono">
                          {give > 0 ? `৳ ${give.toFixed(2)}` : '-'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-900 text-white font-bold text-xs">
                    <td colSpan={2} className="p-3 text-right border-r border-slate-800">
                      সর্বমোট হিসাব
                    </td>
                    <td className="p-3 text-center border-r border-slate-800 text-emerald-400">
                      {report.totalMeals}
                    </td>
                    <td className="p-3 text-right border-r border-slate-800 font-mono">
                      ৳ {(report.totalCost - report.totalKhala - report.totalGas - report.totalExtra - report.totalFridge).toFixed(2)}
                    </td>
                    <td className="p-3 text-right border-r border-slate-800 font-mono">
                      ৳ {report.totalKhala.toFixed(2)}
                    </td>
                    <td className="p-3 text-right border-r border-slate-800 font-mono">
                      ৳ {report.totalGas.toFixed(2)}
                    </td>
                    <td className="p-3 text-right border-r border-slate-800 font-mono">
                      ৳ {report.totalExtra.toFixed(2)}
                    </td>
                    <td className="p-3 text-right border-r border-slate-800 font-mono">
                      ৳ {report.totalFridge.toFixed(2)}
                    </td>
                    <td className="p-3 text-right bg-slate-950 border-r border-slate-800 font-mono text-white text-sm">
                      ৳ {report.totalCost.toFixed(2)}
                    </td>
                    <td className="p-3 text-right border-r border-slate-800 font-mono text-emerald-400 text-sm">
                      ৳ {report.totalDeposits.toFixed(2)}
                    </td>
                    <td className="p-3 text-right border-r border-slate-800 font-mono text-emerald-400 font-extrabold">
                      ৳ {report.overallReceive.toFixed(2)}
                    </td>
                    <td className="p-3 text-right font-mono text-red-400 font-extrabold">
                      ৳ {report.overallGive.toFixed(2)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}

          {/* Footer Note */}
          <div className="pt-6 border-t border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-3 text-[11px] text-slate-500">
            <div>
              <p>মিল ম্যানেজমেন্ট সিস্টেম কর্তৃক প্রস্তুতকৃত স্বয়ংক্রিয় হিসাব বিবরণী</p>
              <p>সূত্র: মিল রেট = মোট বাজার খরচ ÷ মোট মিল | ব্যালেন্স = মোট জমা − মোট খরচ</p>
            </div>
            <div className="text-left sm:text-right">
              <p className="font-semibold text-slate-700">
                {report?.assignedManagers && report.assignedManagers.length > 1
                  ? 'ম্যানেজারগণের স্বাক্ষর: __________________'
                  : 'ম্যানেজারের স্বাক্ষর: __________________'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
