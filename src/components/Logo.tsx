import React from 'react';

interface LogoProps {
  className?: string;
  size?: number;
}

export function DugsigaSubucLogo({ className = "", size }: LogoProps) {
  return (
    <img 
      src="/logo.png" 
      alt="Dugsiga Subuc Logo" 
      className={`rounded-full object-cover bg-white border border-emerald-600/20 shadow-sm aspect-square ${className}`}
      style={size ? { width: size, height: size } : undefined}
      referrerPolicy="no-referrer"
    />
  );
}

export function DugsigaSubucFullLogo({ className = "" }: LogoProps) {
  return (
    <div className={`flex flex-col items-center justify-center select-none ${className}`} id="dugsiga-subuc-brand-group">
      <img 
        src="/logo.png" 
        alt="Dugsiga Subuc Full Logo" 
        className="w-full h-auto object-contain max-h-[180px] hover:scale-[1.03] transition-transform duration-300"
        referrerPolicy="no-referrer"
      />
    </div>
  );
}

