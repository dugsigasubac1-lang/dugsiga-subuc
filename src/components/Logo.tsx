import React from 'react';

interface LogoProps {
  className?: string;
  size?: number;
}

export function DugsigaSubucLogo({ className = "w-24 h-24", size }: LogoProps) {
  // Brand Color Palette:
  // Primary Forest Green: #3b5e4a (Exact Olive-Forest tone)
  // Wood Ochre Gold: #ca9258 / #dca873
  // Dark Chocolate: #362214
  // Off-white Ivory Background: #faf8f5 / #eae7de
  return (
    <svg
      viewBox="0 0 500 500"
      className={className}
      style={size ? { width: size, height: size } : undefined}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      id="dugsiga-subuc-vector-seal"
    >
      <defs>
        {/* Soft elegant drop shadow for the wooden board */}
        <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="2" dy="5" stdDeviation="4" floodColor="#362214" floodOpacity="0.15" />
        </filter>
        
        {/* Linear gradient for high fidelity wood texture */}
        <linearGradient id="woodGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#e2b47d" />
          <stop offset="40%" stopColor="#d29e64" />
          <stop offset="75%" stopColor="#ca9258" />
          <stop offset="100%" stopColor="#a5713c" />
        </linearGradient>

        {/* Linear gradient for the feather of the bird */}
        <linearGradient id="featherGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#3d6350" />
          <stop offset="50%" stopColor="#2c4739" />
          <stop offset="100%" stopColor="#1e3026" />
        </linearGradient>

        {/* Circular Calligraphy Gradient */}
        <radialGradient id="calligraphyGold" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#fdf7ed" />
          <stop offset="100%" stopColor="#eae0ce" />
        </radialGradient>
      </defs>

      {/* 1. OFF-WHITE IVORY BACKGROUND SEAL WITH DOUBLE GREEN BORDERS */}
      {/* Outer Dark Green Circle */}
      <circle cx="250" cy="250" r="215" fill="#faf8f5" stroke="#3b5e4a" strokeWidth="12" />
      
      {/* Inner Thin Elegant Concentric Green Circle */}
      <circle cx="250" cy="250" r="192" stroke="#3b5e4a" strokeWidth="3" fill="none" />

      {/* 2. ISLAMIC OCTAGRAM STARS (RUB-EL-HIZB) DECORATIONS */}
      {/* Left Octagram */}
      <g transform="translate(85, 250) scale(1.1)">
        <rect x="-12" y="-12" width="24" height="24" stroke="#3b5e4a" strokeWidth="3" fill="none" />
        <rect x="-12" y="-12" width="24" height="24" stroke="#3b5e4a" strokeWidth="3" fill="none" transform="rotate(45)" />
        <circle cx="0" cy="0" r="4.5" fill="#ca9258" />
      </g>
      
      {/* Right Octagram */}
      <g transform="translate(415, 250) scale(1.1)">
        <rect x="-12" y="-12" width="24" height="24" stroke="#3b5e4a" strokeWidth="3" fill="none" />
        <rect x="-12" y="-12" width="24" height="24" stroke="#3b5e4a" strokeWidth="3" fill="none" transform="rotate(45)" />
        <circle cx="0" cy="0" r="4.5" fill="#ca9258" />
      </g>

      {/* 3. SYMMETRIC DECORTIVE LEAVES / OLIVE BRANCH WREATHS */}
      {/* Left Branch */}
      <g stroke="#3b5e4a" fill="#3b5e4a" strokeWidth="1">
        {/* Main curved branch stem */}
        <path d="M 148,360 C 105,320 100,240 142,150" stroke="#3b5e4a" strokeWidth="6" strokeLinecap="round" fill="none" />
        
        {/* Leaf pairs up the left branch */}
        <path d="M 146,350 C 122,345 118,365 146,350 Z" />
        <path d="M 137,330 C 110,320 108,340 137,330 Z" />
        <path d="M 125,302 C 95,295 90,312 125,302 Z" />
        <path d="M 119,275 C 88,265 82,285 119,275 Z" />
        <path d="M 115,245 C 85,235 80,255 115,245 Z" />
        <path d="M 118,212 C 86,200 82,220 118,212 Z" />
        <path d="M 122,185 C 92,170 88,190 122,185 Z" />
        <path d="M 131,160 C 105,142 100,162 131,160 Z" />
        <path d="M 142,150 C 122,125 115,145 142,150 Z" />
      </g>

      {/* Right Branch */}
      <g stroke="#3b5e4a" fill="#3b5e4a" strokeWidth="1">
        {/* Main curved branch stem */}
        <path d="M 352,360 C 395,320 400,240 358,150" stroke="#3b5e4a" strokeWidth="6" strokeLinecap="round" fill="none" />
        
        {/* Leaf pairs up the right branch */}
        <path d="M 354,350 C 378,345 382,365 354,350 Z" />
        <path d="M 363,330 C 390,320 392,340 363,330 Z" />
        <path d="M 375,302 C 405,295 410,312 375,302 Z" />
        <path d="M 381,275 C 412,265 418,285 381,275 Z" />
        <path d="M 385,245 C 415,235 420,255 385,245 Z" />
        <path d="M 382,212 C 414,200 418,220 382,212 Z" />
        <path d="M 378,185 C 408,170 412,190 378,185 Z" />
        <path d="M 369,160 C 395,142 400,162 369,160 Z" />
        <path d="M 358,150 C 378,125 385,145 358,150 Z" />
      </g>

      {/* 4. PERFECT TRADITIONAL SOMALI QUR'ANIC WOODEN BOARD (LOX) */}
      <g filter="url(#shadow)" id="quran-wooden-board">
        {/* The Dark Outline Shadow Rim */}
        <path
          d="M 225,100 C 225,82 235,70 250,70 C 265,70 275,82 275,100 L 275,115 C 275,125 310,135 318,150 L 318,375 C 318,395 288,405 250,405 C 212,405 182,395 182,375 L 182,150 C 190,135 225,125 225,115 Z"
          fill="#362214"
          stroke="#362214"
          strokeWidth="6"
          strokeLinejoin="round"
        />

        {/* The Main Wooden Body */}
        <path
          d="M 228,103 C 228,87 236,74 250,74 C 264,74 272,87 272,103 L 272,117 C 272,127 305,137 313,152 L 313,371 C 313,389 285,398 250,398 C 215,398 187,389 187,371 L 187,152 C 195,137 228,127 228,117 Z"
          fill="url(#woodGrad)"
          stroke="#4e331f"
          strokeWidth="3.5"
          strokeLinejoin="round"
        />

        {/* Handle Hole/Hanger in the top head center of the lox */}
        <circle cx="250" cy="103" r="10" fill="#faf8f5" stroke="#362214" strokeWidth="4.5" />

        {/* Natural subtle artistic wood fiber lines */}
        <path d="M 205,160 Q 212,250 205,340" stroke="#9d6433" strokeWidth="1.8" fill="none" opacity="0.45" />
        <path d="M 295,165 Q 288,255 295,345" stroke="#9d6433" strokeWidth="1.8" fill="none" opacity="0.45" />
        <path d="M 218,180 Q 224,270 216,360" stroke="#9d6433" strokeWidth="1.2" fill="none" opacity="0.35" />
        <path d="M 282,180 Q 276,270 284,360" stroke="#9d6433" strokeWidth="1.2" fill="none" opacity="0.35" />

        {/* 5. ARABIC CALLIGRAPHY SEAL: AL-QUR'AN AL-KARIIM (القرآن الكريم) */}
        {/* Seal Outer Boundaries */}
        <circle cx="250" cy="225" r="54" fill="#362214" stroke="#dca873" strokeWidth="4" />
        <circle cx="250" cy="225" r="48" fill="url(#calligraphyGold)" />
        <circle cx="250" cy="225" r="44" fill="none" stroke="#362214" strokeWidth="1.5" strokeDasharray="5,2.5" />

        {/* Real Circular Arabic Calligraphy Artwork of (القرآن الكريم) */}
        <g stroke="#362214" strokeLinecap="round" strokeLinejoin="round" fill="none">
          {/* Main Calligraphy Ribbons and Swashes */}
          {/* Alif and Lam vertical accents */}
          <path d="M 226,204 L 226,220" strokeWidth="3.5" />
          <path d="M 233,197 L 233,214" strokeWidth="3.2" />
          <path d="M 242,192 L 242,212" strokeWidth="3.0" />
          
          {/* Circular letters loops representing Qaf, Ra, Ba, Noon (القرآن) */}
          <path d="M 226,220 C 220,230 224,242 238,245" strokeWidth="4.2" />
          <path d="M 238,245 C 255,248 274,242 278,228" strokeWidth="4.5" />
          <path d="M 248,224 C 238,222 236,212 250,208 C 262,205 268,214 266,222" strokeWidth="3.5" />
          <path d="M 222,228 C 230,235 248,236 256,228" strokeWidth="3.2" />

          {/* Calligraphic letter swoops for "الكريم" */}
          <path d="M 242,212 C 248,198 266,196 274,206" strokeWidth="3.8" />
          <path d="M 252,218 C 262,218 268,225 268,232 C 268,242 248,252 235,248" strokeWidth="4" />
          <path d="M 258,224 C 264,220 270,224 274,228 L 278,236" strokeWidth="3.5" />

          {/* Diacritics and Tashkeel marks (Daf, Fatha, Kasra, Shadda, etc.) */}
          {/* Wave Damma & Fatha */}
          <path d="M 221,212 Q 224,208 227,212" strokeWidth="2" />
          <path d="M 244,198 L 249,194" strokeWidth="2.5" />
          <path d="M 256,198 L 261,194" strokeWidth="2.5" />
          <path d="M 264,210 Q 268,206 270,210" strokeWidth="1.8" />
          
          {/* Shadda hook */}
          <path d="M 249,203 Q 251,200 253,203 Q 255,200 257,203" strokeWidth="1.8" />
          
          {/* Calligraphy Dots (Nuqat) */}
          <circle cx="230" cy="241" r="2.5" fill="#362214" stroke="none" />
          <circle cx="236" cy="243" r="2.5" fill="#362214" stroke="none" />
          <circle cx="261" cy="212" r="2" fill="#362214" stroke="none" />
          <circle cx="265" cy="214" r="2" fill="#362214" stroke="none" />
          <circle cx="251" cy="238" r="2" fill="#362214" stroke="none" />
          <circle cx="256" cy="239" r="2" fill="#362214" stroke="none" />
        </g>
      </g>

      {/* 6. BIRD FRINGED FEATHER PEN & MODERN QUILL INK TRAIL */}
      <g id="feather-quill-and-ink" transform="translate(0, 5)">
        {/* Dynamic handdrawn ink flourish flowing beneath the feather */}
        <path
          d="M 215,315 C 235,340 262,336 280,326"
          stroke="#362214"
          strokeWidth="3.2"
          strokeLinecap="round"
          fill="none"
        />
        
        {/* The Plumage Feather Body (Deep Green gradient) */}
        <path
          d="M 205,290 C 228,284 256,303 283,332 C 264,335 233,328 205,290 Z"
          fill="url(#featherGrad)"
          stroke="#1d3025"
          strokeWidth="1.5"
        />

        {/* Artistic precise slit lines of the bird feather */}
        <path d="M 218,294 L 210,298" stroke="#101d16" strokeWidth="1.8" />
        <path d="M 232,299 L 222,306" stroke="#101d16" strokeWidth="1.8" />
        <path d="M 244,306 L 234,316" stroke="#101d16" strokeWidth="1.8" />
        <path d="M 255,313 L 244,325" stroke="#101d16" strokeWidth="1.8" />
        <path d="M 268,321 L 256,334" stroke="#101d16" strokeWidth="1.8" />

        {/* White center shining shaft (The spine of the quill pen) */}
        <path
          d="M 201,286 Q 238,304 282,333"
          stroke="#faf8f5"
          strokeWidth="3.5"
          strokeLinecap="round"
          fill="none"
        />
        {/* Shadow layer of the spine */}
        <path
          d="M 201,286 Q 238,304 282,333"
          stroke="#1d3025"
          strokeWidth="1"
          strokeLinecap="round"
          fill="none"
          opacity="0.5"
        />
      </g>
    </svg>
  );
}

export function DugsigaSubucFullLogo({ className = "w-48 h-auto" }: LogoProps) {
  // exact primary color matching #3b5e4a (Forest Green) and #ca9258 (Wood Gold)
  return (
    <div className={`flex flex-col items-center ${className}`} id="dugsiga-subuc-full-logo-container">
      {/* High-fidelity vector badge */}
      <DugsigaSubucLogo className="w-48 h-48 drop-shadow-md select-none transition-transform hover:scale-105" />

      {/* Main Branding Title in premium matching fonts and styling */}
      <div className="text-center mt-5">
        <h2 
          className="text-[#3b5e4a] text-2xl font-black uppercase tracking-[0.06em] leading-none flex items-center justify-center select-none"
          id="logo-txt-somali"
          style={{ fontFamily: "'Space Grotesk', 'Outfit', 'Inter', sans-serif" }}
        >
          DUGS
          <span className="relative inline-block text-[#3b5e4a] mx-[0.5px]">
            I
            {/* Subeic Accent Gold Dot above the I to match traditional Quranic style of the logo */}
            <span 
              className="absolute -top-[5.5px] left-1/2 -translate-x-1/2 w-[6.5px] h-[6.5px] bg-[#ca9258] rounded-full border border-white"
              title="Subeic Olive Dot"
            ></span>
          </span>
          GA SUBUC
        </h2>

        {/* Beautiful Arabic مدرسة السبع heading */}
        <h3 
          className="text-[#3b5e4a] text-[26px] font-extrabold text-center leading-normal mt-[4px] tracking-wide select-none"
          id="logo-txt-arabic"
          dir="rtl"
          style={{ fontFamily: "'Cairo', 'Amiri', 'Georgia', serif" }}
        >
          مدرسة السبع
        </h3>

        {/* Handwritten brand slogan underneath */}
        <p 
          className="text-[#516b5a] text-[15px] italic font-semibold text-center leading-relaxed mt-1 select-none"
          id="logo-txt-motto"
          style={{ fontFamily: "'Caveat', 'Playfair Display', cursive", letterSpacing: '0.02em' }}
        >
          Xaraf Sahan iyo Xifdi Sugan
        </p>
      </div>
    </div>
  );
}
