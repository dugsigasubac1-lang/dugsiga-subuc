import React from 'react';
import { Camera } from 'lucide-react';

interface LogoProps {
  className?: string;
  size?: number;
  logoUrl?: string;
  onClick?: () => void;
  title?: string;
  editable?: boolean;
}

export function DugsigaSubucLogo({ 
  className = "", 
  size, 
  logoUrl, 
  onClick, 
  title, 
  editable = false 
}: LogoProps) {
  const finalSrc = logoUrl || "/logo.png?v=3";

  return (
    <div 
      className={`relative inline-block group shrink-0 ${onClick ? 'cursor-pointer z-10' : ''}`}
      onClick={onClick}
      title={title || (editable ? "Guji si aad u beddesho sawirka astaanta website-ka (Click to change website profile photo)" : "Dugsiga Subuc Logo")}
    >
      <img 
        src={finalSrc} 
        alt="Dugsiga Subuc Logo" 
        className={`rounded-full object-cover bg-white border border-emerald-600/20 shadow-sm aspect-square transition-all duration-300 group-hover:scale-105 group-hover:ring-2 group-hover:ring-sky-500/50 ${className}`}
        style={size ? { width: size, height: size } : undefined}
        referrerPolicy="no-referrer"
      />
      {editable && (
        <div className="absolute inset-0 rounded-full bg-slate-900/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white backdrop-blur-[1px] pointer-events-none">
          <Camera className="w-4 h-4 text-white drop-shadow-sm" />
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
  const finalSrc = logoUrl || "/logo.png?v=3";

  return (
    <div 
      className={`relative group flex flex-col items-center justify-center select-none ${onClick ? 'cursor-pointer z-10' : ''} ${className}`} 
      id="dugsiga-subuc-brand-group"
      onClick={onClick}
      title={title || (editable ? "Guji si aad u beddesho sawirka astaanta website-ka (Click to change website profile photo)" : "Dugsiga Subuc Full Logo")}
    >
      <img 
        src={finalSrc} 
        alt="Dugsiga Subuc Full Logo" 
        className="w-full h-auto object-contain max-h-[180px] hover:scale-[1.03] transition-transform duration-300 rounded-2xl"
        referrerPolicy="no-referrer"
      />
      {editable && (
        <div className="absolute inset-0 rounded-2xl bg-slate-900/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white font-bold text-xs gap-1.5 backdrop-blur-[1px] pointer-events-none">
          <Camera className="w-4 h-4 text-white drop-shadow-sm" />
          <span>Beddel Sawirka Astaanta</span>
        </div>
      )}
    </div>
  );
}


