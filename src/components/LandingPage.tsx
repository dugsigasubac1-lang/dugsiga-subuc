/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BookOpen, 
  Award, 
  Heart, 
  ShieldCheck, 
  Users, 
  Clock, 
  MapPin, 
  Phone, 
  Mail, 
  Sparkles, 
  Send,
  CheckCircle2,
  Lock,
  ArrowRight,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  Sun,
  Moon
} from 'lucide-react';
import { DatabaseState, LandingPageSettings, ContactMessage, AppNotification } from '../types';
import { DugsigaSubucLogo } from './Logo';

// Map icon string names from the admin settings tab to actual Lucide Icon components
const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  BookOpen: BookOpen,
  Award: Award,
  Heart: Heart,
  ShieldCheck: ShieldCheck,
  Users: Users,
  Clock: Clock,
  Sparkles: Sparkles
};

interface LandingPageProps {
  database: DatabaseState;
  onEnterLogin: () => void;
  onSaveDatabase: (updatedDb: DatabaseState) => void;
}

export function LandingPage({ database, onEnterLogin, onSaveDatabase }: LandingPageProps) {
  // Use DB landing settings with local hard fallback defaults just in case
  const settings: LandingPageSettings = database.landingPageSettings || {
    schoolName: "Dugsiga Subuc",
    heroTitle: "Ku Korinta Maskaxda Nuurka Qur'aanka Kariimka ah",
    heroSub: "Ku soo dhowow Dugsiga Subuc & Akadeemiyada Tajweedka. Waxaan dhiirigelinaynaa xifdin tayo sare leh, dabeecad suuban (Dhaqan), iyo akhris aqoon ku dhabaysan.",
    aboutText: "Dugsiga Subuc waxaa loo aas-aasay inuu u adeego bulshada ardayda ah isagoo siinaya waxbarasho Qur'aan oo heerkeedu sarreeyo. Warbixinnada maalinlaha ah, xiriirka waalidiinta, iyo nidaamka joogitaanka ardayda waxay xaqiijinayaan hufnaan buuxda.",
    whatWeDo: "Waxaan bixinaa dariiqooyin waxbarasho oo dhammaystiran oo ay hagayaan macallimiin khubaro ah si loo kobciyo qiyamka Islaamka, xifdinta saxda ah, iyo xeerarka Tajwiidka.",
    contactEmail: "info@dugsigasubuc.edu",
    contactPhone: "0904819955",
    contactAddress: "Somalia, Puntland, Garowe, aga gaarka jaamacadda frontier",
    cards: [],
    pictures: []
  };

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isNightMode, setIsNightMode] = useState(false);

  // States for visitor messaging
  const [activeFormTab, setActiveFormTab] = useState<'steps' | 'message'>('steps');
  const [visitorName, setVisitorName] = useState('');
  const [visitorPhone, setVisitorPhone] = useState('');
  const [visitorMessage, setVisitorMessage] = useState('');
  const [msgSuccess, setMsgSuccess] = useState('');
  const [msgError, setMsgError] = useState('');

  // Prune expired messages older than 1 day upon loading
  React.useEffect(() => {
    const messages = database.contactMessages || [];
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    const freshMessages = messages.filter(msg => {
      const msgTime = new Date(msg.timestamp).getTime();
      return !isNaN(msgTime) && msgTime > oneDayAgo;
    });

    if (freshMessages.length !== messages.length) {
      onSaveDatabase({
        ...database,
        contactMessages: freshMessages
      });
    }
  }, []);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!visitorName.trim() || !visitorPhone.trim() || !visitorMessage.trim()) {
      setMsgError("Fadlan buuxi dhammaan meelaha bannaan.");
      return;
    }

    const newMessage: ContactMessage = {
      id: `msg-${Date.now()}`,
      name: visitorName.trim(),
      email: '',
      phone: visitorPhone.trim(),
      message: visitorMessage.trim(),
      timestamp: new Date().toISOString(),
      read: false
    };

    const currentMessages = database.contactMessages || [];
    
    // Prune existing messages older than 24h as well, keeping the state ultra-clean
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    const prunedExisting = currentMessages.filter(msg => {
      const msgTime = new Date(msg.timestamp).getTime();
      return !isNaN(msgTime) && msgTime > oneDayAgo;
    });

    const updatedMessages = [...prunedExisting, newMessage];

    onSaveDatabase({
      ...database,
      contactMessages: updatedMessages
    });

    setVisitorName('');
    setVisitorPhone('');
    setVisitorMessage('');
    setMsgError('');
    setMsgSuccess("Farriintaada waa la gudbiyay si guul leh! Waa la tirtiri doonaa 24 saac ka dib.");
    setTimeout(() => setMsgSuccess(''), 6000);
  };

  // Dynamic Theme Classes based on school's brand design system
  const bgClass = isNightMode 
    ? "bg-[#030612] text-slate-100 selection:bg-[#ca9258] selection:text-white" 
    : "bg-[#fbfaf6] text-[#123626] selection:bg-[#21543d] selection:text-white";
  const headerClass = isNightMode 
    ? "bg-[#020617]/95 border-b border-[#21543d]/25 shadow-lg shadow-black/25" 
    : "bg-[#fbfaf6]/95 border-[#21543d]/15 shadow-sm shadow-[#21543d]/5";
  const cardClass = isNightMode 
    ? "bg-[#0c101f] border-[#21543d]/20" 
    : "bg-white border-slate-200 shadow-sm shadow-[#21543d]/5";
  const titleClass = isNightMode 
    ? "text-white" 
    : "text-[#122e21]";
  const mutedClass = isNightMode 
    ? "text-slate-400" 
    : "text-[#54655c]/95 font-semibold";
  const bodyTextClass = isNightMode 
    ? "text-slate-300" 
    : "text-[#2c3e34] font-medium";
  const sectionBorderClass = isNightMode 
    ? "border-indigo-950/20" 
    : "border-slate-200/90";
  const navLinkClass = isNightMode 
    ? "text-slate-400 hover:text-[#ca9258]" 
    : "text-[#4d5e53] hover:text-[#21543d]";
  
  // 3-second Auto Slide images array from settings or fallback
  const heroSlides = settings.heroSlides && settings.heroSlides.length > 0 
    ? settings.heroSlides 
    : [
        {
          id: "hero-slide-1",
          url: "https://images.unsplash.com/photo-1609599006353-e629f1d29718?auto=format&fit=crop&w=1200&q=80",
          caption: "Mushaafyada sharafta leh ee akhriska iyo xifdiga maalinlaha ah ee Dugsiga Subuc."
        },
        {
          id: "hero-slide-2",
          url: "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1200&q=80",
          caption: "Dugsiga oo bixiya jawi xasilloon, iftiin leh oo ku habboon barashada."
        },
        {
          id: "hero-slide-3",
          url: "https://images.unsplash.com/photo-1564507592333-c60657eea523?auto=format&fit=crop&w=1200&q=80",
          caption: "Ku barashada xeerarka Tajwiidka, dhibco-baxa xarfaha iyo xifdiga."
        },
        {
          id: "hero-slide-4",
          url: "https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=1200&q=80",
          caption: "Kobcinta dabeecadda suuban ee ardayda (Dhaqanka iyo Akhlaaqda)."
        }
      ];

  const [currentSlide, setCurrentSlide] = useState(0);

  const handleNextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % heroSlides.length);
  };

  const handlePrevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + heroSlides.length) % heroSlides.length);
  };

  React.useEffect(() => {
    if (heroSlides.length <= 1) {
      setCurrentSlide(0);
      return;
    }
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % heroSlides.length);
    }, 3000);
    return () => clearInterval(timer);
  }, [heroSlides.length]);

  return (
    <div className={`min-h-screen font-sans ${bgClass}`} id="public-landing">
      
      {/* 1. Header & Navigation Bar (Styled in match with logo colors logo palette) */}
      <header className={`sticky top-0 z-50 backdrop-blur-md transition-all duration-300 ${headerClass}`} id="landing-header">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
          
          <div className="flex items-center gap-2.5">
            <div className="flex flex-col">
              <span className={`font-extrabold text-sm sm:text-base tracking-tight leading-none transition-colors ${titleClass}`} style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                {settings.schoolName}
              </span>
              <span className="text-[9px] font-black tracking-wider text-[#ca9258] mt-1 uppercase font-mono">مدرسة السبع</span>
            </div>
          </div>

          {/* Desktop Nav Links with brand and theme matched styles */}
          <nav className="hidden md:flex items-center gap-7 text-xs font-black uppercase tracking-widest">
            <a href="#about" className={`transition-all ${navLinkClass}`}>Ku Saabsan</a>
            <a href="#features" className={`transition-all ${navLinkClass}`}>Barnaamijyada</a>
            <a href="#pictures" className={`transition-all ${navLinkClass}`}>Sawirrada</a>
            <a href="#contact" className={`transition-all ${navLinkClass}`}>Xiriirka</a>
          </nav>

          {/* Call to Action: Portal Login & Theme Mode Switcher */}
          <div className="flex items-center gap-3">
            {/* Day and Night Theme Switch option */}
            <button
              onClick={() => setIsNightMode(!isNightMode)}
              className={`p-2.5 rounded-xl border flex items-center justify-center transition-all active:scale-95 cursor-pointer ${
                isNightMode 
                  ? "bg-[#0c101f] border-[#21543d]/45 text-amber-400 hover:text-amber-300 hover:bg-slate-900" 
                  : "bg-white border-[#21543d]/20 text-[#21543d] hover:bg-emerald-50"
              }`}
              title={isNightMode ? "Dooro Maalinnimo (Day Mode)" : "Dooro Habeennimo (Night Mode)"}
            >
              {isNightMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            <button
              onClick={onEnterLogin}
              className="px-5 py-2.5 bg-gradient-to-r from-[#21543d] to-[#123626] hover:from-[#2a684b] hover:to-[#1a4b35] text-white font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-lg border border-[#ca9258]/35 hover:border-[#ca9258] active:scale-95 cursor-pointer transition-all flex items-center gap-2"
              id="landing-portal-login-btn"
            >
              <Lock className="w-3.5 h-3.5 text-[#ca9258]" />
              Login
            </button>

            {/* Mobile menu trigger */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2.5 bg-slate-900 border border-slate-800 text-slate-300 hover:text-white rounded-xl md:hidden cursor-pointer"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

      {/* Mobile Navigation Panel */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className={`md:hidden border-t ${isNightMode ? 'border-[#21543d]/25 bg-[#0c101f]' : 'border-[#21543d]/15 bg-white'} shadow-inner overflow-hidden`}
          >
            <div className={`p-5 flex flex-col gap-4 text-xs font-black uppercase tracking-wider ${isNightMode ? 'text-slate-300' : 'text-[#21543d]'}`}>
              <a 
                href="#about" 
                onClick={() => setMobileMenuOpen(false)}
                className={`px-3 py-2.5 rounded-lg ${isNightMode ? 'hover:bg-slate-950 hover:text-[#ca9258]' : 'hover:bg-emerald-55 hover:text-[#ca9258]'}`}
              >
                Ku Saabsan
              </a>
              <a 
                href="#features" 
                onClick={() => setMobileMenuOpen(false)}
                className={`px-3 py-2.5 rounded-lg ${isNightMode ? 'hover:bg-slate-950 hover:text-[#ca9258]' : 'hover:bg-emerald-55 hover:text-[#ca9258]'}`}
              >
                Barnaamijyada
              </a>
              <a 
                href="#pictures" 
                onClick={() => setMobileMenuOpen(false)}
                className={`px-3 py-2.5 rounded-lg ${isNightMode ? 'hover:bg-slate-950 hover:text-[#ca9258]' : 'hover:bg-emerald-55 hover:text-[#ca9258]'}`}
              >
                Sawirrada
              </a>
              <a 
                href="#contact" 
                onClick={() => setMobileMenuOpen(false)}
                className={`px-3 py-2.5 rounded-lg ${isNightMode ? 'hover:bg-slate-950 hover:text-[#ca9258]' : 'hover:bg-emerald-55 hover:text-[#ca9258]'}`}
              >
                Xiriirka
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>

    {/* 2. Hero Section - Compact 3s Auto-rotating split-layout */}
    <section className={`relative overflow-hidden py-12 lg:py-16 border-b transition-all duration-300 ${isNightMode ? "bg-gradient-to-b from-[#020617] via-[#040e1b] to-[#020617] border-slate-950" : "bg-gradient-to-b from-[#f2efe9] via-[#f7f5f1] to-[#fbfaf6] border-slate-200"}`} id="hero">
      <div className={`absolute top-10 right-20 w-80 h-80 rounded-full blur-3xl pointer-events-none transition-opacity duration-300 ${isNightMode ? 'bg-[#21543d]/10' : 'bg-[#21543d]/5'}`} />
      <div className="absolute bottom-10 left-10 w-80 h-80 bg-[#ca9258]/5 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
        
        {/* Left Panel: Hero Call to Action text */}
        <div className="lg:col-span-7 space-y-6 text-left">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[#ca9258] text-[10px] font-black uppercase tracking-widest shadow-sm border transition-colors ${isNightMode ? 'bg-[#0c101f] border-[#21543d]/30' : 'bg-white border-[#21543d]/15'}`}
          >
            <Sparkles className="w-3.5 h-3.5 text-[#ca9258] animate-pulse" />
            {settings.heroBadge || "Xoojinta Barashada Qur'aanka ee Casriga ah"}
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className={`text-3xl sm:text-4xl md:text-5xl font-black tracking-tight leading-[1.15] transition-colors ${titleClass}`}
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            <span className="block text-[#ca9258] mb-2 text-lg sm:text-xl uppercase tracking-widest font-extrabold font-mono">
              Akadeemiyada Dugsiga Subuc
            </span>
            {settings.heroTitle}
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className={`text-xs sm:text-sm max-w-xl leading-relaxed transition-colors ${bodyTextClass}`}
          >
            {settings.heroSub}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="pt-2 flex flex-wrap items-center gap-3.5"
          >
            <button
              onClick={onEnterLogin}
              className="px-6 py-3 bg-gradient-to-r from-[#21543d] to-[#123626] hover:from-[#2a684b] hover:to-[#1a4b35] text-white font-extrabold text-xs uppercase tracking-wider rounded-xl border border-[#ca9258]/35 hover:border-[#ca9258] shadow-lg shadow-black/30 active:scale-95 cursor-pointer transition-all flex items-center gap-1.5"
            >
              Login Portal-ka
              <ArrowRight className="w-3.5 h-3.5 text-[#ca9258]" />
            </button>
            <a
              href="#about"
              className={`px-6 py-3 border font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all inline-flex items-center ${
                isNightMode 
                  ? 'bg-[#0c101f] border-slate-800 text-slate-300 hover:text-white hover:bg-slate-950/80 hover:border-[#21543d]/55' 
                  : 'bg-white border-[#21543d]/20 text-[#21543d] hover:bg-emerald-50'
              }`}
            >
              Aqri faahfaahinta
            </a>
          </motion.div>
        </div>

        {/* Right Panel: Auto Sliding changing images (every 3 seconds) with custom gold indicator dot and arrows */}
        <div className="lg:col-span-5 relative" id="hero-slider-panel">
          <div className="relative aspect-video sm:aspect-[4/3] bg-slate-950 rounded-3xl border border-[#21543d]/30 overflow-hidden shadow-2xl flex items-center justify-center group">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentSlide}
                initial={{ opacity: 0, scale: 1.02 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.5 }}
                className="absolute inset-0 size-full"
              >
                <img
                  src={heroSlides[currentSlide].url}
                  alt={heroSlides[currentSlide].caption}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
                {/* Dark bottom gradients over active slide */}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent" />
              </motion.div>
            </AnimatePresence>

            {/* Left Navigation Arrow */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                handlePrevSlide();
              }}
              className="absolute left-3 z-20 p-2 bg-black/60 hover:bg-[#ca9258] text-white rounded-full transition-all cursor-pointer shadow-md select-none hover:scale-105 active:scale-90"
              title="Muuqaalkii Hore"
            >
              <ChevronLeft className="w-4.5 h-4.5" />
            </button>

            {/* Right Navigation Arrow */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleNextSlide();
              }}
              className="absolute right-3 z-20 p-2 bg-black/60 hover:bg-[#ca9258] text-white rounded-full transition-all cursor-pointer shadow-md select-none hover:scale-105 active:scale-90"
              title="Muuqaalka Xiga"
            >
              <ChevronRight className="w-4.5 h-4.5" />
            </button>

            {/* Progress and Caption Indicator bar overlay */}
            <div className="absolute bottom-4 left-4 right-4 z-10 flex flex-col gap-1.5">
              <p className="text-[10px] text-white/95 font-extrabold font-sans text-center drop-shadow-md line-clamp-1 leading-relaxed">
                {heroSlides[currentSlide].caption}
              </p>
              
              {/* Visual Navigation slides indicators */}
              <div className="flex items-center justify-center gap-1.5">
                {heroSlides.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentSlide(i)}
                    className={`h-1 rounded-full transition-all duration-300 ${
                      i === currentSlide ? "w-6 bg-[#ca9258]" : "w-1.5 bg-white/40 hover:bg-white"
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
          
          {/* Ambient indicator badge */}
          <div className="absolute -bottom-3 -right-2 bg-[#122e21] border border-[#ca9258] text-white px-3 py-1.5 rounded-xl shadow-xl z-10 flex items-center gap-2">
            <div className="w-2 h-2 bg-[#ca9258] rounded-full animate-ping shrink-0" />
            <span className="text-[9px] font-black tracking-wider uppercase font-mono">DIIWAANGELIN SAAXID</span>
          </div>
        </div>

      </div>
    </section>

      {/* 3. About Section */}
      <section className={`py-12 border-b transition-all duration-300 ${isNightMode ? 'bg-[#020617] border-indigo-950/20' : 'bg-white border-slate-200'}`} id="about">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            
            {/* Left Graphic */}
            <div className="lg:col-span-5 relative" id="about-graphic">
              <div className="absolute -top-4 -left-4 w-72 h-72 bg-[#21543d]/10 rounded-3xl -z-10 rounded-tl-[80px] blur-xl" />
              <div className={`p-7 rounded-3xl border transition-all duration-300 ${cardClass}`}>
                <blockquote className={`italic font-bold text-sm leading-relaxed font-mono ${isNightMode ? 'text-slate-300' : 'text-[#21543d]'}`}>
                  "Kan idiinku khayrka badan waa kan barta Qur'aanka kariimka ah, dadka kalena bara."
                </blockquote>
                <p className="text-[10px] font-black text-[#ca9258] mt-4 tracking-wider uppercase font-mono">— Nebi Muxammad (NNKH)</p>
                
                <div className="mt-6 border-t border-slate-200/50 pt-5 flex items-center gap-4">
                  <div className="shrink-0 w-11 h-11 bg-[#122e21] text-[#ca9258] rounded-xl flex items-center justify-center font-black text-sm border border-[#21543d]/50">✓</div>
                  <div>
                    <h4 className={`font-extrabold text-xs ${titleClass}`}>Joogitaanka oo la Hubiyo</h4>
                    <p className={`text-[11px] mt-0.5 leading-normal ${mutedClass}`}>Galitaanka is-diiwaangelinta ee goobta juqraafiyeed ee dugsiga ee macallimiinta.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Information Text */}
            <div className="lg:col-span-7 space-y-5">
              <span className="text-[10px] uppercase font-black text-[#ca9258] tracking-widest block font-mono">KU SAABSAN DUGSIGA SUBUC</span>
              <h2 className={`text-2xl sm:text-3xl font-black tracking-tight ${titleClass}`} style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                Ka Go'naanshaha Xifdi Tayo leh & Koboc Ruuxi ah
              </h2>
              <div className={`text-xs sm:text-sm leading-relaxed space-y-4 ${bodyTextClass}`}>
                <p>
                  {settings.aboutText}
                </p>
                
                <div className={`p-4 rounded-2xl border-l-4 border-[#ca9258] bg-[#21543d]/5 text-xs ${isNightMode ? 'bg-[#21543d]/5 border-[#ca9258]' : 'bg-[#21543d]/5'}`}>
                  <span className="block font-black uppercase text-[#ca9258] tracking-wider mb-1 px-1 font-mono text-[9px]">Sifaadka Guud & Diinta</span>
                  <p className="leading-relaxed px-1">
                    <strong>Dugsiga Subuc</strong> oo ku yaal magaalada <strong>Garowe, Puntland, Somalia</strong> waa akadeemiyada ugu tayada sarreysa ee bixisa <strong>Xifdinta Qur'aanka Kariimka ah</strong> iyo barashada <strong>Higaadda Carabiga</strong>. Waxaan mar walba ku khidmaynaa halheyska ah: <strong className="text-[#ca9258] italic font-serif">"Xaraf Saxan iyo Xifdi Sugan"</strong>.
                  </p>
                </div>
              </div>
              
              <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className={`p-4 rounded-2xl border transition-all ${cardClass} flex gap-3`}>
                  <CheckCircle2 className="w-5 h-5 text-[#ca9258] shrink-0 mt-0.5" />
                  <div>
                    <h4 className={`font-black text-xs ${titleClass}`}>Subuc Qadiimi ah & Waxbarasho</h4>
                    <p className={`text-[11px] mt-1 leading-relaxed ${mutedClass}`}>Iilaalinta hababka dhaqameed ee kuceliska ardayda (Subuc) iyadoo la hagaajinayo kaydinta.</p>
                  </div>
                </div>
                <div className={`p-4 rounded-2xl border transition-all ${cardClass} flex gap-3`}>
                  <CheckCircle2 className="w-5 h-5 text-[#ca9258] shrink-0 mt-0.5" />
                  <div>
                    <h4 className={`font-black text-xs ${titleClass}`}>Nidaamyo Dijitaal ah oo Sugan</h4>
                    <p className={`text-[11px] mt-1 leading-relaxed ${mutedClass}`}>Joogitaanka fasalka, xogta xifdiga, imtixaanada maalinlaha ah, iyo biilacha oo ku dhex jira hal nidaam.</p>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 4. Features Section (Info Cards controlled by Admin) */}
      <section className={`py-12 border-b transition-all duration-300 ${isNightMode ? "bg-[#04091a] border-indigo-950/20" : "bg-[#f5f3ef] border-slate-200"}`} id="features">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <span className="text-[10px] uppercase font-black text-[#ca9258] tracking-widest block font-mono mb-2">Barnaamijyada & Qiyamka</span>
            <h3 className={`text-xl sm:text-3xl font-black tracking-tight ${titleClass}`} style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              Nidaamka Waxbarasho ee Dugsiga
            </h3>
            <p className={`text-xs sm:text-sm mt-2.5 leading-relaxed ${mutedClass}`}>
              {settings.whatWeDo}
            </p>
          </div>

          {settings.cards && settings.cards.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6" id="landing-cards-grid">
              {settings.cards.map((card, idx) => {
                const IconComponent = ICON_MAP[card.iconName] || BookOpen;
                return (
                  <motion.div
                    key={card.id || idx}
                    initial={{ opacity: 0, y: 15 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: idx * 0.1 }}
                    className={`p-5 rounded-2.5xl border hover:border-[#ca9258]/60 shadow-lg hover:shadow-2xl hover:shadow-[#ca9258]/5 hover:-translate-y-0.5 transition-all duration-300 flex flex-col justify-between ${cardClass}`}
                  >
                    <div>
                      <span className="p-3 bg-[#122e21] border border-[#21543d]/45 text-[#ca9258] rounded-xl inline-flex mb-4">
                        <IconComponent className="w-5 h-5" />
                      </span>
                      <h4 className={`font-extrabold text-sm tracking-tight mb-2 ${titleClass}`}>
                        {card.title}
                      </h4>
                      <p className={`text-xs leading-relaxed ${mutedClass}`}>
                        {card.description}
                      </p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          ) : (
            <div className={`text-center py-10 rounded-2xl border ${isNightMode ? 'bg-[#0c101f] border-[#21543d]/15' : 'bg-white border-slate-200 shadow-sm'}`}>
              <p className={`text-xs font-bold font-sans ${mutedClass}`}>Liiska barnaamijyada waxaa laga cusboonaysiin karaa dashboard-ka maamulka ee dugsiga.</p>
            </div>
          )}
        </div>
      </section>

      {/* 5. School Pictures Section (Gallery controlled by Admin) */}
      <section className={`py-12 border-b transition-all duration-300 ${isNightMode ? "bg-[#020617] border-indigo-950/20" : "bg-white border-slate-200"}`} id="pictures">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <span className="text-[10px] uppercase font-black text-[#ca9258] tracking-widest block font-mono mb-2">Sawirrada Dugsiga</span>
            <h3 className={`text-xl sm:text-3xl font-black tracking-tight ${titleClass}`} style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              Muuqaallada Nolosha Dugsiga
            </h3>
            <p className={`text-[#54655c]/95 text-xs sm:text-sm mt-2.5 font-semibold ${mutedClass}`}>
              Kula soco daqiiqadaha waxbarasho, kulamada tacliimeed, iyo munaasabadaha taariikhiga ah ee Dugsiga Subuc.
            </p>
          </div>

          {(() => {
            const displayedPics = settings.pictures && settings.pictures.length > 0 ? settings.pictures : [
              {
                id: "quran-pic-1",
                url: "https://images.unsplash.com/photo-1609599006353-e629f1d29718?auto=format&fit=crop&w=800&q=80",
                caption: "Mushaafyada Sharafta leh ee loo adeegsado akhriska iyo xifdiga maalinlaha ah ee Dugsiga Subuc."
              },
              {
                id: "quran-pic-2",
                url: "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=800&q=80",
                caption: "Dugsiga Subuc oo bixiya jawi xasilloon, iftiin leh, oo ku habboon barashada cilmiga diiniga ah."
              },
              {
                id: "quran-pic-3",
                url: "https://images.unsplash.com/photo-1564507592333-c60657eea523?auto=format&fit=crop&w=800&q=80",
                caption: "Barashada xeerarka Tajwiidka, dhibco-baxa xarfaha, iyo xifdin tayo leh oo maalin walba ah."
              }
            ];

            // Replicate pictures to allow flawless infinite horizontal loop
            const duplicatedPics = [...displayedPics, ...displayedPics, ...displayedPics, ...displayedPics];

            return (
              <div className="relative w-full overflow-hidden py-3 select-none" id="landing-gallery-marquee">
                {/* Visual fade boundaries on left and right sides for modern UI feeling */}
                <div className={`absolute left-0 top-0 bottom-0 w-20 z-10 pointer-events-none bg-gradient-to-r ${isNightMode ? 'from-[#020617]' : 'from-white'} to-transparent`} />
                <div className={`absolute right-0 top-0 bottom-0 w-20 z-10 pointer-events-none bg-gradient-to-l ${isNightMode ? 'from-[#020617]' : 'from-white'} to-transparent`} />

                <motion.div
                  className="flex gap-4 w-max"
                  animate={{ x: ["-50%", "0%"] }}
                  transition={{
                    ease: "linear",
                    duration: 30,
                    repeat: Infinity,
                  }}
                >
                  {duplicatedPics.map((pic, idx) => (
                    <div
                      key={idx}
                      className={`w-64 h-44 rounded-2xl overflow-hidden border transition-all duration-300 flex flex-col shrink-0 ${cardClass}`}
                    >
                      <div className="h-28 w-full overflow-hidden bg-slate-950 relative group">
                        <img 
                          src={pic.url} 
                          alt={pic.caption} 
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-505"
                        />
                      </div>
                      <div className="p-3 flex-grow flex items-center justify-center text-center border-t border-slate-205/10">
                        <p className={`text-[10px] font-black leading-tight line-clamp-2 ${titleClass}`}>
                          {pic.caption}
                        </p>
                      </div>
                    </div>
                  ))}
                </motion.div>
              </div>
            );
          })()}
        </div>
      </section>

      {/* 6. Contact Us Section */}
      <section className={`py-12 border-b transition-all duration-300 ${isNightMode ? "bg-[#05091b] border-indigo-950/20" : "bg-[#faf9f6] border-slate-200"}`} id="contact">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* Left Contact Details (Column 1 - lg:col-span-4) */}
            <div className="lg:col-span-4 space-y-6">
              <div>
                <span className="text-[10px] uppercase font-black text-[#ca9258] tracking-widest block font-mono mb-2">Naga Hel</span>
                <h3 className={`text-xl sm:text-2xl font-black tracking-tight ${titleClass}`} style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  Nala Soo Xiriir
                </h3>
                <p className={`text-xs leading-relaxed mt-2.5 ${mutedClass}`}>
                  Ma qabtaa su'aalo ku saabsan diiwaangelinta, jadwalka fasalka, ama khidmadaha gelidda? La xiriir kooxdayada maamulka dugsiga directly.
                </p>
              </div>

              {/* Quick Action Contact Hub buttons */}
              <div className="flex flex-col sm:flex-row gap-3">
                <a
                  href="tel:0904819955"
                  className={`flex-1 py-2.5 px-4 border font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2 shadow-md select-none ${isNightMode ? 'bg-[#0c101f] border-[#21543d]/30 text-slate-300 hover:text-white hover:border-[#ca9258]' : 'bg-white border-slate-200 text-[#21543d] hover:bg-slate-50 hover:border-[#ca9258]'}`}
                >
                  <Phone className="w-3.5 h-3.5 text-[#ca9258]" />
                  Wicitaan (0904819955)
                </a>
                <a
                  href="https://wa.me/252904820531"
                  target="_blank"
                  rel="noreferrer"
                  className={`flex-1 py-2.5 px-4 border font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2 shadow-md select-none ${isNightMode ? 'bg-[#0c101f] border-[#21543d]/30 text-slate-300 hover:text-white hover:border-[#ca9258]' : 'bg-white border-slate-200 text-[#21543d] hover:bg-slate-50 hover:border-[#ca9258]'}`}
                >
                  <span className="w-2 h-2 bg-emerald-500 rounded-full animate-ping shrink-0" />
                  WhatsApp (0904820531)
                </a>
              </div>

              <div className="space-y-4" id="contact-info-list" style={{ fontFamily: "sans-serif" }}>
                <div className="flex gap-4 items-start">
                  <span className="p-2.5 bg-[#122e21] border border-[#21543d]/45 text-[#ca9258] rounded-xl mt-0.5"><MapPin className="w-4 h-4" /></span>
                  <div>
                    <h5 className={`font-extrabold text-xs ${titleClass}`}>Ciwaankayaga Gaarka Ah</h5>
                    <p className={`text-xs mt-1 font-semibold ${mutedClass}`}>Somalia, Puntland, Garowe, aga gaarka jaamacadda frontier (Aga gaarka Jamacada Frontier)</p>
                  </div>
                </div>
                <div className="flex gap-4 items-start">
                  <span className="p-2.5 bg-[#122e21] border border-[#21543d]/45 text-[#ca9258] rounded-xl mt-0.5"><Phone className="w-4 h-4" /></span>
                  <div>
                    <h5 className={`font-extrabold text-xs ${titleClass}`}>Saldhigga Wicitaanka</h5>
                    <p className={`text-xs mt-1 font-mono font-black ${mutedClass}`}>0904819955 (Khadka Maamulka)</p>
                  </div>
                </div>
                <div className="flex gap-4 items-start">
                  <span className="p-2.5 bg-[#122e21] border border-[#21543d]/45 text-[#ca9258] rounded-xl mt-0.5"><Mail className="w-4 h-4" /></span>
                  <div>
                    <h5 className={`font-extrabold text-xs ${titleClass}`}>Isgaarsiinta Email-ka</h5>
                    <p className={`text-xs mt-1 font-semibold ${mutedClass}`}>{settings.contactEmail}</p>
                  </div>
                </div>
              </div>

              {/* Interactive Google Map Finder Card */}
              <div className={`p-4 rounded-3xl border shadow-xl space-y-3 transition-colors ${isNightMode ? 'bg-[#0a0d1a] border-[#21543d]/15 shadow-black/40' : 'bg-white border-slate-200 shadow-slate-100'}`}>
                <div className="flex items-center gap-3 justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-[#ca9258] rounded-full animate-bounce shrink-0" />
                    <span className={`text-[9px] uppercase font-black tracking-widest font-mono ${mutedClass}`}>MAP GPS COORDINATES</span>
                  </div>
                  <span className={`text-[10px] font-mono font-bold ${mutedClass}`}>8.395525, 48.479865</span>
                </div>
                
                {/* Visual Map Grid Mockup */}
                <div className={`relative h-24 rounded-2xl border overflow-hidden flex items-center justify-center p-4 ${isNightMode ? 'bg-[#020617] border-[#21543d]/20' : 'bg-slate-50 border-slate-200'}`}>
                  <div className="absolute inset-0 size-full opacity-25" style={{ backgroundImage: 'radial-gradient(#21543d 1px, transparent 1px)', backgroundSize: '16px 16px' }} />
                  
                  {/* Pin Circle */}
                  <div className="relative flex flex-col items-center">
                    <span className="absolute -top-1 w-3 h-3 bg-red-500 rounded-full animate-ping" />
                    <div className="p-2 bg-[#21543d] text-white rounded-full shadow-lg relative z-10 border border-[#ca9258]/35">
                      <MapPin className="w-4 h-4 text-[#ca9258]" />
                    </div>
                    <span className={`text-[9px] font-black tracking-wide bg-slate-950 px-2 py-0.5 rounded-md border mt-1.5 ${isNightMode ? 'text-white border-[#21543d]/30' : 'text-slate-100 border-[#21543d]'}`}>Dugsiga Subuc</span>
                  </div>
                  
                  <div className={`absolute top-2 left-3 border px-2 py-0.5 rounded-lg text-[9px] font-bold ${isNightMode ? 'bg-[#0c101f]/90 border-[#21543d]/20 text-slate-300' : 'bg-white/90 border-slate-200 text-[#21543d]'}`}>
                    Frontier University Area
                  </div>
                </div>

                <a
                  href="https://www.google.com/maps/dir/?api=1&destination=8.395525,48.479865"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2.5 px-4 bg-[#122e21] hover:bg-[#1b4431] border border-[#21543d]/55 text-[#ca9258] hover:text-white font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer select-none"
                >
                  <MapPin className="w-3.5 h-3.5 animate-pulse" />
                  Ka Raac Khariidada Google Maps (Tilmaamaha Goobta)
                </a>
              </div>
            </div>

            {/* Center Column: Registration Steps Details (Column 2 - lg:col-span-4) */}
            <div className="lg:col-span-4" id="registration-instructions-card">
              <div className={`p-6 rounded-3xl border shadow-2xl space-y-5 h-full relative overflow-hidden transition-all duration-300 ${cardClass}`}>
                <div className="absolute top-0 right-0 w-32 h-32 bg-[#21543d]/5 rounded-full blur-3xl pointer-events-none" />
                
                <div>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#122e21] border border-[#21543d]/45 text-[#ca9258] text-[9.5px] font-black uppercase tracking-wider mb-2">
                    <ShieldCheck className="w-3 h-3 text-[#ca9258]" />
                    {settings.regStepTitle || "Diiwaangelin Qof ahaaneed ah"}
                  </div>
                  <h4 className={`font-extrabold text-base tracking-tight ${titleClass}`} style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                    Tallaabooyinka Diiwaangelinta
                  </h4>
                  <p className={`text-xs mt-1.5 leading-relaxed ${mutedClass}`}>
                    {settings.regStepText || "Si loo ilaaliyo amniga loonana hortago farriimaha spam-ka, waxaan u samaynaa diiwaangelinta cusub si toos ah fasallada dhexdiisa si aan ilmaha u qiimayno."}
                  </p>
                </div>

                <div className="border-t border-slate-200/40 pt-4 space-y-3">
                  {/* Step 1 */}
                  <div className="flex gap-4">
                    <div className="w-6 h-6 rounded bg-[#122e21] text-[#ca9258] font-mono text-[11px] font-black flex items-center justify-center shrink-0 border border-[#21543d]/40 mt-0.5">
                      1
                    </div>
                    <div>
                      <h5 className={`text-xs font-black ${titleClass}`}>{settings.regStep1Title || "Qiimaynta Heerka Akhriska"}</h5>
                      <p className={`text-[10.5px] mt-0.5 leading-relaxed ${mutedClass}`}>
                        {settings.regStep1Text || "Keen ilmahaaga xarunta si loo qiimeeyo heerka xifdiga Qur'aanka iyo Tajwiidka."}
                      </p>
                    </div>
                  </div>

                  {/* Step 2 */}
                  <div className="flex gap-4">
                    <div className="w-6 h-6 rounded bg-[#122e21] text-[#ca9258] font-mono text-[11px] font-black flex items-center justify-center shrink-0 border border-[#21543d]/40 mt-0.5">
                      2
                    </div>
                    <div>
                      <h5 className={`text-xs font-black ${titleClass}`}>{settings.regStep2Title || "Hubinta Khidmadda & Aqoonsiga"}</h5>
                      <p className={`text-[10.5px] mt-0.5 leading-relaxed ${mutedClass}`}>
                        {settings.regStep2Text || "Kala saar arrimaha diiwaangelinta, harna qaado kaarka aqoonsiga ee ardayga u gaarka ah."}
                      </p>
                    </div>
                  </div>

                  {/* Step 3 */}
                  <div className="flex gap-4">
                    <div className="w-6 h-6 rounded bg-[#122e21] text-[#ca9258] font-mono text-[11px] font-black flex items-center justify-center shrink-0 border border-[#21543d]/40 mt-0.5">
                      3
                    </div>
                    <div>
                      <h5 className={`text-xs font-black ${titleClass}`}>{settings.regStep3Title || "Bilaabista Casharada"}</h5>
                      <p className={`text-[10.5px] mt-0.5 leading-relaxed ${mutedClass}`}>
                        {settings.regStep3Text || "Ardayga wuxuu si toos ah ugu birayaa fasalkiisa isagoo raacaya jadwalkiisa u qorshaysan. Su'aalaha kale kala xiriir call: 0904819955."}
                      </p>
                    </div>
                  </div>
                </div>

                <div className={`p-3 rounded-2xl border flex items-center justify-between gap-4 mt-auto ${isNightMode ? 'bg-[#05091b] border-[#21543d]/15' : 'bg-slate-50 border-slate-200'}`}>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-[#ca9258] shrink-0" />
                    <div>
                      <h6 className="text-[#ca9258] text-[9px] font-black uppercase font-mono leading-none">Office Open</h6>
                      <p className={`text-[9px] mt-0.5 font-bold leading-normal ${titleClass}`}>{settings.regOfficeHours || "Sabti - Khamiis: 7:30 subax - 5:30 galabnimo"}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Dynamic public Live message box (Column 3 - lg:col-span-4) - ALWAYS DIRECTLY VISIBLE */}
            <div className="lg:col-span-4" id="visitor-messaging-card">
              <div className={`p-6 rounded-3xl border shadow-2xl h-full flex flex-col justify-between space-y-4 relative overflow-hidden transition-all duration-300 ${cardClass}`}>
                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
                
                <div className="space-y-4">
                  <div>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#122e21] border border-[#21543d]/45 text-emerald-400 text-[9px] font-black uppercase tracking-wider mb-2">
                      <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping" />
                      Farriin Toos Ah / Contact Form
                    </span>
                    <h4 className={`font-extrabold text-base tracking-tight ${titleClass}`} style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                      Noo Soo Qor Farriin / Live Inquiry
                    </h4>
                    <p className={`text-xs mt-1.5 leading-relaxed ${mutedClass}`}>
                      Fadlan nala wadaag magacaaga, taleefankaaga iyo faahfaahinta waxaad u baahan tahay. Kooxdayada maamulka ayaa si toos ah u arki doona fariintaan.
                    </p>
                  </div>

                  <form onSubmit={handleSendMessage} className="space-y-3">
                    <div>
                      <label className={`block text-[9px] font-black uppercase mb-1 tracking-wider ${mutedClass}`}>Magacaaga / Full Name</label>
                      <input
                        type="text"
                        required
                        value={visitorName}
                        onChange={(e) => setVisitorName(e.target.value)}
                        placeholder="Musa Cabdi..."
                        className={`w-full px-3.5 py-2 rounded-xl text-xs font-bold outline-none border transition-all ${
                          isNightMode 
                            ? "bg-[#05091b] border-[#21543d]/30 text-white focus:border-[#ca9258]" 
                            : "bg-slate-50 border-slate-200 text-slate-800 focus:border-[#ca9258]"
                        }`}
                      />
                    </div>
                    
                    <div>
                      <label className={`block text-[9px] font-black uppercase mb-1 tracking-wider ${mutedClass}`}>Taleefankaaga / Contact Number</label>
                      <input
                        type="tel"
                        required
                        value={visitorPhone}
                        onChange={(e) => setVisitorPhone(e.target.value)}
                        placeholder="E.g. 0904819955"
                        className={`w-full px-3.5 py-2 rounded-xl text-xs font-bold outline-none border transition-all ${
                          isNightMode 
                            ? "bg-[#05091b] border-[#21543d]/30 text-white focus:border-[#ca9258]" 
                            : "bg-slate-50 border-slate-200 text-slate-800 focus:border-[#ca9258]"
                        }`}
                      />
                    </div>

                    <div>
                      <label className={`block text-[9px] font-black uppercase mb-1 tracking-wider ${mutedClass}`}>Maxaad u Baahan Tahay? / What do you need?</label>
                      <textarea
                        required
                        rows={3}
                        value={visitorMessage}
                        onChange={(e) => setVisitorMessage(e.target.value)}
                        placeholder="Qor waxyaabaha aad rabto inaad na waydiiso..."
                        className={`w-full px-3.5 py-2 rounded-xl text-xs font-bold outline-none border transition-all resize-none ${
                          isNightMode 
                            ? "bg-[#05091b] border-[#21543d]/30 text-white focus:border-[#ca9258]" 
                            : "bg-slate-50 border-slate-200 text-slate-800 focus:border-[#ca9258]"
                        }`}
                      />
                    </div>

                    {msgSuccess && (
                      <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-[10px] font-black text-emerald-500 flex items-center gap-1.5">
                        ✓ {msgSuccess}
                      </div>
                    )}

                    {msgError && (
                      <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-[10px] font-black text-rose-500 flex items-center gap-1.5">
                        ⚠️ {msgError}
                      </div>
                    )}

                    <button
                      type="submit"
                      className="w-full py-2.5 bg-[#ca9258] hover:bg-[#b07d47] text-[#122e21] font-black text-xs uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md select-none"
                    >
                      <Send className="w-3.5 h-3.5" />
                      Dir Farriinta (Send Message)
                    </button>
                  </form>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 7. Footer */}
      <footer className={`py-10 border-t transition-all duration-300 ${isNightMode ? "bg-[#020617] text-slate-500 border-[#21543d]/10" : "bg-[#dfd9ce] text-[#21543d] border-slate-300"}`} id="landing-footer">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="flex flex-col">
              <span className={`font-extrabold text-xs tracking-tight ${isNightMode ? 'text-white' : 'text-[#21543d]'}`} style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                {settings.schoolName}
              </span>
              <span className="text-[8px] font-black text-[#ca9258] mt-1 font-mono">مدرسة السبع • Dhammaan xuquuqaha waa dhowran yihiin</span>
            </div>
          </div>

          <div className={`text-[11px] font-extrabold tracking-wide ${isNightMode ? 'text-slate-500' : 'text-[#21543d]/85'}`}>
            © {new Date().getFullYear()} Nidaamka Portal Dugsiga. Waxaa si sugan u maamula diiwaangeliyaha.
          </div>
        </div>
      </footer>
    </div>
  );
}
