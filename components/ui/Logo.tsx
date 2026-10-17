import React from 'react';

interface LogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | number;
  showText?: boolean;
  title?: string;
  subtitle?: string;
  textClassName?: string;
  className?: string;
}

const SIZE_MAP = {
  xs: 24,
  sm: 32,
  md: 40,
  lg: 48,
  xl: 64,
  '2xl': 80,
};

export default function Logo({
  size = 'md',
  showText = false,
  title = 'মিল ম্যানেজমেন্ট',
  subtitle,
  textClassName = '',
  className = '',
}: LogoProps) {
  const pixelSize = typeof size === 'number' ? size : SIZE_MAP[size] || 40;

  return (
    <div className={`inline-flex items-center space-x-2.5 ${className}`}>
      {/* Crisp Vector SVG Mark */}
      <div
        style={{ width: pixelSize, height: pixelSize }}
        className="flex-shrink-0 relative select-none transition-transform hover:scale-105"
      >
        <svg
          viewBox="0 0 120 120"
          width="100%"
          height="100%"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full drop-shadow-md"
        >
          <defs>
            <linearGradient id="logo-bg" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#10B981" />
              <stop offset="55%" stopColor="#059669" />
              <stop offset="100%" stopColor="#047857" />
            </linearGradient>

            <linearGradient id="logo-gold" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FDE68A" />
              <stop offset="45%" stopColor="#F59E0B" />
              <stop offset="100%" stopColor="#D97706" />
            </linearGradient>

            <linearGradient id="logo-cloche" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FFFFFF" />
              <stop offset="60%" stopColor="#F8FAFC" />
              <stop offset="100%" stopColor="#E2E8F0" />
            </linearGradient>

            <linearGradient id="logo-glass" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.28" />
              <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.0" />
            </linearGradient>

            <filter id="logo-shadow" x="-10%" y="-10%" width="130%" height="130%">
              <feDropShadow dx="0" dy="5" stdDeviation="5" floodColor="#064E3B" floodOpacity="0.4" />
            </filter>
          </defs>

          {/* Container Squircle Background */}
          <rect x="6" y="6" width="108" height="108" rx="28" fill="url(#logo-bg)" filter="url(#logo-shadow)" />

          {/* Glass Arc Top Reflection */}
          <path
            d="M 6 34 C 6 18.5 18.5 6 34 6 L 86 6 C 101.5 6 114 18.5 114 34 L 114 54 C 80 66 40 66 6 54 Z"
            fill="url(#logo-glass)"
          />

          {/* Crisp Inner Border */}
          <rect
            x="7"
            y="7"
            width="106"
            height="106"
            rx="27"
            fill="none"
            stroke="#FFFFFF"
            strokeWidth="2"
            strokeOpacity="0.22"
          />

          {/* Golden Aroma / Steam Swirls */}
          <path
            d="M 48 26 C 45 22 51 18 48 14"
            fill="none"
            stroke="url(#logo-gold)"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <path
            d="M 60 24 C 57 19 63 15 60 10"
            fill="none"
            stroke="url(#logo-gold)"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <path
            d="M 72 26 C 69 22 75 18 72 14"
            fill="none"
            stroke="url(#logo-gold)"
            strokeWidth="2.5"
            strokeLinecap="round"
          />

          {/* Cloche Handle / Knob */}
          <circle cx="60" cy="35" r="4.5" fill="url(#logo-gold)" />
          <rect x="58" y="38" width="4" height="3" rx="1" fill="url(#logo-gold)" />

          {/* Cloche Dome (Serving Lid) */}
          <path d="M 28 64 C 28 44 42 39 60 39 C 78 39 92 44 92 64 Z" fill="url(#logo-cloche)" />

          {/* Cloche Interior Lighting Highlight Arc */}
          <path
            d="M 37 60 C 38 48 48 44 60 43 C 51 44 41 49 39 60 Z"
            fill="#CBD5E1"
            fillOpacity="0.5"
          />

          {/* Cloche Gold Rim */}
          <rect x="23" y="64" width="74" height="5" rx="2.5" fill="url(#logo-gold)" />

          {/* Serving Tray / Base Platter */}
          <ellipse cx="60" cy="75" rx="35" ry="7.5" fill="url(#logo-cloche)" />
          <ellipse cx="60" cy="74.5" rx="28" ry="4.5" fill="#047857" fillOpacity="0.15" />

          {/* Base Pedestal Foot */}
          <path d="M 44 80 L 76 80 C 74 86 68 88 60 88 C 52 88 46 86 44 80 Z" fill="url(#logo-gold)" />

          {/* Tiny Gold Star / Accent on Cloche Dome */}
          <circle cx="76" cy="48" r="1.5" fill="url(#logo-gold)" />
        </svg>
      </div>

      {/* Optional Brand Text */}
      {showText && (
        <div className="flex flex-col">
          <span className={`font-bold tracking-tight text-slate-900 leading-tight ${textClassName}`}>
            {title}
          </span>
          {subtitle && (
            <span className="text-[10px] text-slate-500 font-medium tracking-wider uppercase">
              {subtitle}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
