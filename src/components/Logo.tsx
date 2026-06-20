import React from 'react';

interface LogoProps {
  className?: string;
  size?: number;
}

export function DugsigaSubucLogo({ className = "", size }: LogoProps) {
  return null;
}

export function DugsigaSubucFullLogo({ className = "" }: LogoProps) {
  return (
    <div className={`flex flex-col items-center gap-2 select-none ${className}`} id="dugsiga-subuc-brand-group">
      <DugsigaSubucLogo className="w-16 h-16" />
      <span 
        className="font-extrabold text-lg uppercase text-[#21543d] tracking-widest block font-sans"
        id="dugsiga-subuc-text-full-logo"
      >
        DUGSIGA SUBUC
      </span>
    </div>
  );
}

