import React from 'react';
import DataLoader from '../../components/ui/DataLoader';

export default function DashboardLoading() {
  return (
    <div className="space-y-6 max-w-7xl mx-auto py-4">
      {/* Top Banner Skeleton */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-4 w-32 bg-emerald-100 rounded-full animate-pulse" />
          <div className="h-7 w-48 bg-slate-200 rounded-xl animate-pulse" />
        </div>
        <div className="h-9 w-28 bg-slate-100 rounded-xl animate-pulse hidden sm:block" />
      </div>

      {/* Main Content Loading Feedback */}
      <DataLoader
        text="ড্যাশবোর্ড ও মেস হিসাব প্রস্তুত হচ্ছে..."
        subtext="দয়া করে অপেক্ষা করুন, সাম্প্রতিক তথ্য লোড করা হচ্ছে..."
        variant="cards"
      />
    </div>
  );
}
