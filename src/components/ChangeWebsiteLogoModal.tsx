import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Upload, Link as LinkIcon, RefreshCw, Check, X, Camera, Sparkles, AlertCircle } from 'lucide-react';

interface ChangeWebsiteLogoModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentLogoUrl?: string;
  onSaveLogo: (newLogoUrl: string) => void;
}

export function ChangeWebsiteLogoModal({
  isOpen,
  onClose,
  currentLogoUrl,
  onSaveLogo
}: ChangeWebsiteLogoModalProps) {
  const defaultLogo = "/logo.png?v=3";
  const initialLogo = currentLogoUrl || defaultLogo;

  const [activeTab, setActiveTab] = useState<'upload' | 'url'>('upload');
  const [previewUrl, setPreviewUrl] = useState<string>(initialLogo);
  const [urlInput, setUrlInput] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync state when modal opens
  React.useEffect(() => {
    if (isOpen) {
      const activeLogo = currentLogoUrl || defaultLogo;
      setPreviewUrl(activeLogo);
      if (currentLogoUrl && currentLogoUrl.startsWith('http')) {
        setUrlInput(currentLogoUrl);
      } else {
        setUrlInput('');
      }
      setErrorMsg('');
      setSuccessMsg('');
    }
  }, [isOpen, currentLogoUrl]);

  if (!isOpen) return null;

  // Handle device file upload with image compression
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMsg('Fadlan soo geli fayl sawir ah oo keliya (JPEG, PNG, WEBP, GIF)');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setErrorMsg('Xajmiga sawirka waa inuu ka yaryahay 10MB');
      return;
    }

    setIsProcessing(true);
    setErrorMsg('');

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        // Compress and resize image to optimal size (max 300x300) for fast loading & small Firestore footprint
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 300;
        const MAX_HEIGHT = 300;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = Math.round(width);
        canvas.height = Math.round(height);
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.85);
          setPreviewUrl(compressedDataUrl);
          setSuccessMsg('Sawirka waa la habeeyay! Guji "Kaydi Sawirka" si aad u xaqiijiso.');
        } else {
          setPreviewUrl(event.target?.result as string);
        }
        setIsProcessing(false);
      };
      img.onerror = () => {
        setErrorMsg('Waa lagu guuldarraystay akhrinta sawirka.');
        setIsProcessing(false);
      };
      img.src = event.target?.result as string;
    };
    reader.onerror = () => {
      setErrorMsg('Faylka lama akhrin karo.');
      setIsProcessing(false);
    };
    reader.readAsDataURL(file);
  };

  // Handle image URL input submission
  const handleApplyUrl = () => {
    const trimmed = urlInput.trim();
    if (!trimmed) {
      setErrorMsg('Fadlan geli Link-ka sawirka.');
      return;
    }
    if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://') && !trimmed.startsWith('data:image/')) {
      setErrorMsg('Fadlan geli Link sax ah (ee ka bilaabma https:// ama http://)');
      return;
    }
    setErrorMsg('');
    setPreviewUrl(trimmed);
    setSuccessMsg('Link-ka sawirka waa la diyaariyay! Guji "Kaydi Sawirka" si aad u xaqiijiso.');
  };

  // Handle resetting back to default logo
  const handleResetToDefault = () => {
    setPreviewUrl(defaultLogo);
    setUrlInput('');
    setErrorMsg('');
    setSuccessMsg('Astaantii hore waa lagu soo celiyay. Guji "Kaydi Sawirka" si aad u xaqiijiso.');
  };

  // Save the new logo URL to database
  const handleSave = () => {
    onSaveLogo(previewUrl);
    setSuccessMsg('Astaanta website-ka waa la beddelay oo waa la kaydiyay!');
    setTimeout(() => {
      onClose();
    }, 400);
  };

  return (
    <AnimatePresence>
      <div 
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in"
        id="change-logo-modal-bg"
        onClick={(e) => {
          if ((e.target as HTMLElement).id === 'change-logo-modal-bg') {
            onClose();
          }
        }}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 10 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 10 }}
          className="bg-white rounded-3xl shadow-2xl border border-slate-100 max-w-lg w-full overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="p-6 bg-gradient-to-r from-emerald-900 via-emerald-800 to-teal-900 text-white flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-700/50 rounded-2xl border border-emerald-500/30">
                <Camera className="w-5 h-5 text-amber-300" />
              </div>
              <div>
                <h3 className="text-base font-extrabold tracking-tight">Beddel Sawirka Astaanta Website-ka</h3>
                <p className="text-[11px] text-emerald-200 mt-0.5">Change Website Profile Photo / Logo</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-emerald-200 hover:text-white hover:bg-emerald-700/50 rounded-xl transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Modal Content */}
          <div className="p-6 space-y-6">

            {/* Live Interactive Preview Card */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-150 flex flex-col items-center justify-center gap-3">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-500" />
                Daawo Muuqaalka Cusub (Live Preview)
              </span>

              <div className="flex items-center justify-center gap-6 py-2">
                {/* Circular Badge Preview */}
                <div className="flex flex-col items-center gap-1.5">
                  <div className="relative p-1 bg-white rounded-full shadow-md border border-emerald-500/30">
                    <img 
                      src={previewUrl} 
                      alt="Logo Circular Preview" 
                      className="w-16 h-16 rounded-full object-cover bg-white"
                      onError={() => setErrorMsg('Muuqaalka sawirka la geliyay ma shaqaynayo. Fadlan hubi link-ka ama faylka.')}
                    />
                  </div>
                  <span className="text-[10px] font-bold text-slate-500">Astaanta Yar (Header)</span>
                </div>

                {/* Full Branding Preview */}
                <div className="flex flex-col items-center gap-1.5">
                  <div className="p-3 bg-emerald-950 rounded-2xl shadow-md border border-emerald-800 flex items-center justify-center w-28 h-20">
                    <img 
                      src={previewUrl} 
                      alt="Logo Full Preview" 
                      className="max-h-14 max-w-full object-contain rounded-lg"
                    />
                  </div>
                  <span className="text-[10px] font-bold text-slate-500">Astaanta Buuxda (Dark Mode)</span>
                </div>
              </div>
            </div>

            {/* Notification Messages */}
            {errorMsg && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-bold flex items-center gap-2 animate-fade-in">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{errorMsg}</span>
              </div>
            )}
            {successMsg && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-2 animate-fade-in">
                <Check className="w-4 h-4 shrink-0 text-emerald-600" />
                <span>{successMsg}</span>
              </div>
            )}

            {/* Tab Controls: File Upload vs Web URL */}
            <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200/80">
              <button
                type="button"
                onClick={() => { setActiveTab('upload'); setErrorMsg(''); setSuccessMsg(''); }}
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  activeTab === 'upload' 
                    ? 'bg-white text-slate-900 shadow-sm' 
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Upload className="w-3.5 h-3.5 text-emerald-600" />
                <span>Soo Geli Device-ka</span>
              </button>
              <button
                type="button"
                onClick={() => { setActiveTab('url'); setErrorMsg(''); setSuccessMsg(''); }}
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  activeTab === 'url' 
                    ? 'bg-white text-slate-900 shadow-sm' 
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <LinkIcon className="w-3.5 h-3.5 text-sky-600" />
                <span>Link-ka Sawirka (URL)</span>
              </button>
            </div>

            {/* Tab 1: Upload from Device */}
            {activeTab === 'upload' && (
              <div className="space-y-3">
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileChange} 
                  accept="image/*" 
                  className="hidden" 
                />
                
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-emerald-300 hover:border-emerald-500 bg-emerald-50/40 hover:bg-emerald-50 p-6 rounded-2xl flex flex-col items-center justify-center gap-2 cursor-pointer transition-all text-center group"
                >
                  <div className="p-3 bg-white rounded-full shadow-sm border border-emerald-100 text-emerald-600 group-hover:scale-110 transition-transform">
                    <Upload className="w-6 h-6" />
                  </div>
                  <p className="text-xs font-extrabold text-slate-800 mt-1">
                    Guji si aad sawir uga soo xorayso Device-kaaga
                  </p>
                  <p className="text-[10px] text-slate-400 font-medium">
                    (Supports PNG, JPG, WEBP, GIF - Max 10MB)
                  </p>
                </div>
              </div>
            )}

            {/* Tab 2: Web URL */}
            {activeTab === 'url' && (
              <div className="space-y-3">
                <label className="block text-xs font-bold text-slate-700">
                  Geli ama soo dhaan Link-ka sawirka (Image URL):
                </label>
                <div className="flex gap-2">
                  <input 
                    type="url"
                    placeholder="https://example.com/logo.png"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    className="flex-1 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-sky-500 focus:border-sky-500 font-mono"
                  />
                  <button
                    type="button"
                    onClick={handleApplyUrl}
                    className="px-4 py-2.5 bg-sky-600 hover:bg-sky-700 text-white font-extrabold text-xs rounded-xl transition-all cursor-pointer shadow-sm active:scale-95"
                  >
                    Daawo (Apply)
                  </button>
                </div>
              </div>
            )}

            {/* Action Bar: Reset Default */}
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
              <button
                type="button"
                onClick={handleResetToDefault}
                className="text-xs font-bold text-amber-700 hover:text-amber-800 flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Soo celi sawirkii hore ee asalka ahaa"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Soo celi Sawirkii Hore (Reset)</span>
              </button>

              <span className="text-[10px] text-slate-400 font-mono">Auto-fit & optimized</span>
            </div>

          </div>

          {/* Footer Buttons */}
          <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:text-slate-800 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition-all cursor-pointer"
            >
              Kansal (Cancel)
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isProcessing}
              className="px-5 py-2.5 bg-gradient-to-r from-emerald-800 to-teal-800 hover:from-emerald-700 hover:to-teal-700 text-white font-extrabold text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-2 active:scale-95 disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              <span>Kaydi Sawirka Cusub</span>
            </button>
          </div>

        </motion.div>
      </div>
    </AnimatePresence>
  );
}
