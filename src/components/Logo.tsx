import React, { useState, useEffect } from 'react';
import { Camera, BookOpen } from 'lucide-react';

interface LogoProps {
  className?: string;
  size?: number;
  logoUrl?: string;
  onClick?: () => void;
  title?: string;
  editable?: boolean;
}

// Built-in high quality SVG emblem component used as a reliable fallback whenever an image fails or is empty
export function DugsigaSubucEmblemSvg({ 
  size = 48, 
  className = "" 
}: { 
  size?: number; 
  className?: string; 
}) {
  return (
    <svg 
      viewBox="0 0 100 100" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={`select-none ${className}`}
      style={{ width: size, height: size }}
    >
      <defs>
        <linearGradient id="subucEmeraldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#1b4d3e" />
          <stop offset="50%" stopColor="#0f3427" />
          <stop offset="100%" stopColor="#082018" />
        </linearGradient>
        <linearGradient id="subucGoldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#f6d365" />
          <stop offset="50%" stopColor="#fda085" />
          <stop offset="100%" stopColor="#ca9258" />
        </linearGradient>
        <radialGradient id="subucGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#256d55" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#0d281e" stopOpacity="1" />
        </radialGradient>
      </defs>

      {/* Outer Golden Geometric Ring */}
      <circle cx="50" cy="50" r="47" fill="url(#subucEmeraldGrad)" stroke="url(#subucGoldGrad)" strokeWidth="2.5" />
      <circle cx="50" cy="50" r="43" fill="url(#subucGlow)" stroke="#ca9258" strokeWidth="0.75" strokeDasharray="2 1.5" />

      {/* Decorative Star points */}
      <polygon points="50,9 52,14 50,13 48,14" fill="#f6d365" />
      <polygon points="50,91 52,86 50,87 48,86" fill="#f6d365" />
      <polygon points="9,50 14,52 13,50 14,48" fill="#f6d365" />
      <polygon points="91,50 86,52 87,50 86,48" fill="#f6d365" />

      {/* Quran Open Book / Crescent Illustration */}
      <g transform="translate(50, 48)">
        {/* Glowing aura */}
        <circle cx="0" cy="0" r="22" fill="#ca9258" fillOpacity="0.15" />
        
        {/* Quran Open Book base */}
        <path 
          d="M -16,4 C -10,0 -4,1 0,6 C 4,1 10,0 16,4 L 14,-10 C 9,-13 4,-12 0,-8 C -4,-12 -9,-13 -14,-10 Z" 
          fill="#ffffff" 
          stroke="#ca9258" 
          strokeWidth="1.2"
        />
        {/* Book pages spine & detail */}
        <path d="M 0,-8 L 0,6" stroke="#ca9258" strokeWidth="1.2" />
        <path d="M -11,-6 C -7,-8 -3,-7 0,-4" stroke="#0f3427" strokeWidth="0.8" />
        <path d="M 11,-6 C 7,-8 3,-7 0,-4" stroke="#0f3427" strokeWidth="0.8" />
        <path d="M -11,-3 C -7,-5 -3,-4 0,-1" stroke="#0f3427" strokeWidth="0.8" />
        <path d="M 11,-3 C 7,-5 3,-4 0,-1" stroke="#0f3427" strokeWidth="0.8" />

        {/* Crescent on top */}
        <path 
          d="M -3,-13 C -3,-18 3,-18 3,-13 C 2,-15 -2,-15 -3,-13 Z" 
          fill="#f6d365" 
        />
        <circle cx="0" cy="-17" r="1.2" fill="#f6d365" />
      </g>

      {/* School Name Typography (Arabic Calligraphy & Latin) */}
      <text 
        x="50" 
        y="78" 
        textAnchor="middle" 
        fill="#f6d365" 
        fontSize="7.5" 
        fontWeight="bold" 
        fontFamily="'Space Grotesk', sans-serif"
        letterSpacing="0.5"
      >
        DUGSIGA SUBUC
      </text>
      <text 
        x="50" 
        y="87" 
        textAnchor="middle" 
        fill="#ffffff" 
        fontSize="6" 
        fontFamily="sans-serif"
        fontWeight="bold"
        opacity="0.9"
      >
        مدرسة السبع
      </text>
    </svg>
  );
}

export function DugsigaSubucLogo({ 
  className = "", 
  size, 
  logoUrl, 
  onClick, 
  title, 
  editable = false 
}: LogoProps) {
  const [hasError, setHasError] = useState(false);
  const rawUrl = logoUrl && typeof logoUrl === 'string' ? logoUrl.trim() : '';

  // Reset error when logoUrl changes
  useEffect(() => {
    setHasError(false);
  }, [rawUrl]);

  // Determine final image source candidate
  const candidateSrc = rawUrl || "/logo.png";
  const showFallback = hasError || (!rawUrl && candidateSrc === "");

  return (
    <div 
      className={`relative inline-block group shrink-0 ${onClick ? 'cursor-pointer z-10' : ''}`}
      onClick={onClick}
      title={title || (editable ? "Guji si aad u beddesho sawirka astaanta website-ka (Click to change website profile photo)" : "Dugsiga Subuc Logo")}
    >
      {showFallback ? (
        <div 
          className={`rounded-full shadow-sm aspect-square flex items-center justify-center bg-[#0d281e] border border-[#ca9258]/50 overflow-hidden transition-all duration-300 group-hover:scale-105 group-hover:ring-2 group-hover:ring-emerald-500/50 ${className}`}
          style={size ? { width: size, height: size } : undefined}
        >
          <DugsigaSubucEmblemSvg size={size || 48} className="w-full h-full" />
        </div>
      ) : (
        <img 
          src={candidateSrc} 
          alt="Dugsiga Subuc Logo" 
          onError={() => setHasError(true)}
          className={`rounded-full object-cover bg-white border border-emerald-600/25 shadow-sm aspect-square transition-all duration-300 group-hover:scale-105 group-hover:ring-2 group-hover:ring-sky-500/50 ${className}`}
          style={size ? { width: size, height: size } : undefined}
          referrerPolicy="no-referrer"
        />
      )}

      {editable && (
        <div className="absolute inset-0 rounded-full bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white backdrop-blur-[1px] pointer-events-none">
          <Camera className="w-4 h-4 text-amber-300 drop-shadow-md" />
        </div>
      )}
    </div>
  );
}

export function DugsigaSubucFullLogo({ 
  className = "", 
  logoUrl, 
  onClick, 
  title, 
  editable = false 
}: LogoProps) {
  const [hasError, setHasError] = useState(false);
  const rawUrl = logoUrl && typeof logoUrl === 'string' ? logoUrl.trim() : '';

  useEffect(() => {
    setHasError(false);
  }, [rawUrl]);

  const candidateSrc = rawUrl || "/logo.png";
  const showFallback = hasError;

  return (
    <div 
      className={`relative group flex flex-col items-center justify-center select-none ${onClick ? 'cursor-pointer z-10' : ''} ${className}`} 
      id="dugsiga-subuc-brand-group"
      onClick={onClick}
      title={title || (editable ? "Guji si aad u beddesho sawirka astaanta website-ka (Click to change website profile photo)" : "Dugsiga Subuc Full Logo")}
    >
      {showFallback ? (
        <div className="flex flex-col items-center justify-center p-4 bg-gradient-to-b from-[#0e2c21] to-[#081b14] rounded-3xl border border-[#ca9258]/40 shadow-xl w-full max-w-[280px]">
          <DugsigaSubucEmblemSvg size={80} className="w-20 h-20 drop-shadow-md" />
          <h2 className="mt-3 text-lg font-black tracking-tight text-white font-sans">
            Dugsiga Subuc
          </h2>
          <p className="text-xs font-bold text-[#ca9258] uppercase font-mono tracking-widest mt-0.5">
            مدرسة السبع القرآنية
          </p>
        </div>
      ) : (
        <img 
          src={candidateSrc} 
          alt="Dugsiga Subuc Full Logo" 
          onError={() => setHasError(true)}
          className="w-full h-auto object-contain max-h-[180px] hover:scale-[1.03] transition-transform duration-300 rounded-2xl bg-white/5 p-1"
          referrerPolicy="no-referrer"
        />
      )}

      {editable && (
        <div className="absolute inset-0 rounded-2xl bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white font-bold text-xs gap-1.5 backdrop-blur-[1px] pointer-events-none">
          <Camera className="w-4 h-4 text-amber-300 drop-shadow-sm" />
          <span>Beddel Sawirka Astaanta</span>
        </div>
      )}
    </div>
  );
}
