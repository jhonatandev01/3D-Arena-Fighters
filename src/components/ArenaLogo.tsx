import React from 'react';

export interface ArenaLogoProps {
  variant?: 'icon' | 'mark' | 'badge' | 'full' | 'img';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  colorTheme?: 'cyan' | 'amber' | 'purple' | 'emerald' | 'gold' | 'rose';
  className?: string;
  glow?: boolean;
}

const sizeMap = {
  xs: 'w-3.5 h-3.5',
  sm: 'w-4 h-4',
  md: 'w-6 h-6',
  lg: 'w-10 h-10',
  xl: 'w-16 h-16',
};

const themeGradients = {
  cyan: {
    primary: '#38bdf8',
    secondary: '#0284c7',
    glow: 'rgba(56, 189, 248, 0.4)',
  },
  amber: {
    primary: '#fbbf24',
    secondary: '#d97706',
    glow: 'rgba(251, 191, 36, 0.4)',
  },
  purple: {
    primary: '#c084fc',
    secondary: '#7c3aed',
    glow: 'rgba(192, 132, 252, 0.4)',
  },
  emerald: {
    primary: '#34d399',
    secondary: '#059669',
    glow: 'rgba(52, 211, 153, 0.4)',
  },
  gold: {
    primary: '#fcd34d',
    secondary: '#b45309',
    glow: 'rgba(252, 211, 77, 0.5)',
  },
  rose: {
    primary: '#fb7185',
    secondary: '#e11d48',
    glow: 'rgba(251, 113, 133, 0.4)',
  },
};

export const ArenaLogo: React.FC<ArenaLogoProps> = ({
  variant = 'icon',
  size = 'md',
  colorTheme = 'cyan',
  className = '',
  glow = true,
}) => {
  const theme = themeGradients[colorTheme] || themeGradients.cyan;
  const sizeClass = sizeMap[size] || sizeMap.md;

  if (variant === 'img') {
    return (
      <img
        src="/arena-logo.svg"
        alt="3D Arena Fighters Logo"
        referrerPolicy="no-referrer"
        className={`${sizeClass} object-contain ${className} ${glow ? 'drop-shadow-[0_0_8px_rgba(6,182,212,0.6)]' : ''}`}
      />
    );
  }

  if (variant === 'mark') {
    // Ultra-crisp emblem mark specifically tailored for button icons
    return (
      <svg
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`${sizeClass} shrink-0 ${className} ${glow ? 'drop-shadow-sm' : ''}`}
        aria-hidden="true"
      >
        {/* Shield Frame */}
        <polygon
          points="16,3 27,8 24,22 16,29 8,22 5,8"
          fill="#090d16"
          stroke={theme.primary}
          strokeWidth="1.8"
        />
        {/* Crossed Blades */}
        <line x1="9" y1="23" x2="23" y2="9" stroke="#ffffff" strokeWidth="1.4" strokeLinecap="round" />
        <line x1="23" y1="23" x2="9" y2="9" stroke={theme.primary} strokeWidth="1.4" strokeLinecap="round" />
        {/* Central Power Core */}
        <circle cx="16" cy="16" r="3.2" fill={theme.secondary} stroke="#ffffff" strokeWidth="1.2" />
        <circle cx="16" cy="16" r="1.2" fill="#ffffff" />
      </svg>
    );
  }

  if (variant === 'badge') {
    return (
      <div className={`relative flex items-center justify-center ${className}`}>
        <div
          className="absolute inset-0 rounded-2xl blur-md opacity-60"
          style={{ backgroundColor: theme.glow }}
        />
        <div className="relative p-2 rounded-2xl bg-slate-950/80 border border-slate-700/80 flex items-center justify-center shadow-lg">
          <img
            src="/arena-logo.svg"
            alt="3D Arena Crest"
            referrerPolicy="no-referrer"
            className={`${sizeClass} object-contain`}
          />
        </div>
      </div>
    );
  }

  if (variant === 'full') {
    return (
      <div className={`flex items-center gap-3 ${className}`}>
        <div className="relative shrink-0">
          <div
            className="absolute -inset-1 rounded-xl blur-sm opacity-70"
            style={{ backgroundColor: theme.glow }}
          />
          <img
            src="/arena-logo.svg"
            alt="3D Arena Logo"
            referrerPolicy="no-referrer"
            className={`${sizeClass} relative object-contain`}
          />
        </div>
        <div className="flex flex-col">
          <span className="font-black text-white tracking-wider leading-none text-base sm:text-lg flex items-center gap-1.5 font-mono">
            3D ARENA <span style={{ color: theme.primary }}>FIGHTERS</span>
          </span>
          <span className="text-[10px] text-slate-400 font-medium tracking-wide uppercase pt-0.5">
            Real-Time 3D Combat
          </span>
        </div>
      </div>
    );
  }

  // Default 'icon' variant - Vector SVG with full gradients
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`${sizeClass} shrink-0 ${className} ${glow ? 'drop-shadow-[0_0_6px_rgba(56,189,248,0.5)]' : ''}`}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={`grad-${colorTheme}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="50%" stopColor={theme.primary} />
          <stop offset="100%" stopColor={theme.secondary} />
        </linearGradient>
      </defs>

      {/* Cyber Ring */}
      <circle cx="32" cy="32" r="28" stroke={theme.primary} strokeWidth="1.5" strokeDasharray="6 4" opacity="0.6" />

      {/* Shield Silhouette */}
      <polygon
        points="32,6 54,16 48,44 32,58 16,44 10,16"
        fill="#0b0f19"
        stroke={`url(#grad-${colorTheme})`}
        strokeWidth="2.5"
      />

      {/* Crossed Energy Blades */}
      <line x1="18" y1="46" x2="46" y2="18" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="46" y1="46" x2="18" y2="18" stroke={theme.primary} strokeWidth="2.5" strokeLinecap="round" />

      {/* Core Hexagon */}
      <polygon points="32,24 40,29 40,35 32,40 24,35 24,29" fill="#0284c7" stroke="#ffffff" strokeWidth="1.5" />
      <circle cx="32" cy="32" r="2.5" fill="#fcd34d" />
    </svg>
  );
};
