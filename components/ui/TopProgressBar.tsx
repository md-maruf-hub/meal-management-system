'use client';

import React from 'react';

interface TopProgressBarProps {
  isLoading?: boolean;
}

export default function TopProgressBar({ isLoading = false }: TopProgressBarProps) {
  if (!isLoading) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 h-1 bg-slate-200/50 overflow-hidden">
      <div className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-600 animate-indeterminate shadow-sm" />
      <style jsx>{`
        @keyframes indeterminate {
          0% {
            transform: translateX(-100%) scaleX(0.2);
          }
          50% {
            transform: translateX(0%) scaleX(0.6);
          }
          100% {
            transform: translateX(100%) scaleX(0.2);
          }
        }
        .animate-indeterminate {
          animation: indeterminate 1.4s infinite ease-in-out;
          transform-origin: 0% 50%;
        }
      `}</style>
    </div>
  );
}
