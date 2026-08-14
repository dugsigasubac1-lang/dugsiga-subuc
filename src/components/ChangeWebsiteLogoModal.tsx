import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Upload, Link as LinkIcon, RefreshCw, Check, X, Camera, Sparkles, AlertCircle, CheckCircle2, Image as ImageIcon } from 'lucide-react';
import { DugsigaSubucEmblemSvg } from './Logo';

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
  const defaultLogo = "/logo.png";
  const initialLogo = currentLogoUrl && currentLogoUrl.trim() ? currentLogoUrl.trim() : defaultLogo;

  const [activeTab, setActiveTab] = useState<'upload' | 'url'>('upload');
  const [previewUrl, setPreviewUrl] = useState<string>(initialLogo);
  const [urlInput, setUrlInput] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [previewError, setPreviewError] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync state whenever modal opens or currentLogoUrl changes
  useEffect(() => {
    if (isOpen) {
      const activeLogo = currentLogoUrl && currentLogoUrl.trim() ? currentLogoUrl.trim() : defaultLogo;
      setPreviewUrl(activeLogo);
      setPreviewError(false);
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

  // Process and optimize image file to base64 DataURL (high quality, safe for storage)
  const processImageFile = (file: File, autoSave: boolean = false) => {
    setIsProcessing(true);
    setErrorMsg('');
    setPreviewError(false);

    const reader = new FileReader();
    reader.onload = (event) => {
      const rawResult = event.target?.result as string;
      if (!rawResult) {
        setErrorMsg('Faylka lama akhrin karo.');
        setIsProcessing(false);
        return;
      }

      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const MAX_DIM = 400; // Optimal 400x400 for ultra-sharp rendering on Retina displays & fast loading
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_DIM) {
              height *= MAX_DIM / width;
              width = MAX_DIM;
            }
          } else {
            if (height > MAX_DIM) {
              width *= MAX_DIM / height;
              height = MAX_DIM;
            }
          }

          canvas.width = Math.round(width);
          canvas.height = Math.round(height);
          const ctx = canvas.getContext('2d');

          if (ctx) {
            // Keep transparent background for PNG/WebP or draw smooth transparent background
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            
            // Generate PNG data url if transparent or JPEG if solid
            const outputDataUrl = canvas.toDataURL('image/png', 0.95);
            setPreviewUrl(outputDataUrl);
            setSuccessMsg('Sawirka waa la habeeyay! Guji "Kaydi Sawirka Cusub" si aad u xaqiijiso.');

            if (autoSave) {
              onSaveLogo(outputDataUrl);
              setSuccessMsg('Astaanta website-ka si toos ah ayaa loo beddelay oo loo kaydiyay!');
              setTimeout(() => {
                onClose();
              }, 600);
            }
          } else {
            setPreviewUrl(rawResult);
            if (autoSave) {
              onSaveLogo(rawResult);
              onClose();
            }
          }
        } catch (canvasErr) {
          // If canvas tainted or fails, fallback to direct data url
          setPreviewUrl(rawResult);
          if (autoSave) {
            onSaveLogo(rawResult);
            onClose();
          }
        } finally {
          setIsProcessing(false);
        }
      };

      img.onerror = () => {
        setErrorMsg('Sawirka lama furi karo. Fadlan hubi inuu yahay fayl sawir sax ah.');
        setIsProcessing(false);
      };

      img.src = rawResult;
    };

    reader.onerror = () => {
      setErrorMsg('Khalad ayaa dhacay intii lagu guda jiray akhrinta faylka.');
      setIsProcessing(false);
    };

    reader.readAsDataURL(file);
  };

  // Handle device file upload
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 15 * 1024 * 1024) {
      setErrorMsg('Xajmiga sawirka waa inuu ka yaryahay 15MB');
      return;
    }

    processImageFile(file, false);
    e.target.value = ''; // Reset input for re-selection
  };

  // Handle image URL input submission
  const handleApplyUrl = (autoSave: boolean = false) => {
    const trimmed = urlInput.trim();
    if (!trimmed) {
      setErrorMsg('Fadlan geli Link-ka sawirka (URL).');
      return;
    }
    if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://') && !trimmed.startsWith('data:image/')) {
      setErrorMsg('Fadlan geli Link sax ah (oo ka bilaabma https:// ama http://)');
      return;
    }
    setErrorMsg('');
    setPreviewError(false);
    setPreviewUrl(trimmed);
    setSuccessMsg('Link-ka sawirka waa la diyaariyay! Guji "Kaydi Sawirka Cusub" si aad u xaqiijiso.');

    if (autoSave) {
      onSaveLogo(trimmed);
      setSuccessMsg('Astaanta website-ka waa la kaydiyay!');
      setTimeout(() => {
        onClose();
      }, 500);
    }
  };

  // Handle resetting back to default logo
  const handleResetToDefault = () => {
    setPreviewUrl(defaultLogo);
    setPreviewError(false);
    setUrlInput('');
    setErrorMsg('');
    setSuccessMsg('Astaantii asalka ahayd waa la soo celiyay. Guji "Kaydi Sawirka Cusub" si aad u xaqiijiso.');
  };

  // Save the new logo URL to database
  const handleSave = () => {
    if (!previewUrl || previewUrl.trim() === '') {
      setErrorMsg('Fadlan dooro ama soo geli sawir marka hore.');
      return;
    }
    onSaveLogo(previewUrl.trim());
    setSuccessMsg('Astaanta website-ka waa la beddelay oo si sugan ayaa loo kaydiyay!');
    setTimeout(() => {
      onClose();
    }, 450);
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
          className="bg-white rounded-3xl shadow-2xl border border-slate-100 max-w-lg w-full overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="p-5 bg-gradient-to-r from-[#143d2f] via-[#1b503e] to-[#0f3125] text-white flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-700/50 rounded-2xl border border-emerald-500/30">
                <Camera className="w-5 h-5 text-amber-300" />
              </div>
              <div>
                <h3 className="text-base font-extrabold tracking-tight">Beddel Sawirka Astaanta Website-ka</h3>
                <p className="text-[11px] text-emerald-200 mt-0.5 font-medium">Website Profile Photo / Official School Logo</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-emerald-200 hover:text-white hover:bg-emerald-700/50 rounded-xl transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Modal Scrollable Body */}
          <div className="p-6 space-y-5 overflow-y-auto">

            {/* Live Interactive Preview Card */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 flex flex-col items-center justify-center gap-3">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                Muuqaalka Astaanta Hadda (Live Preview)
              </span>

              <div className="flex items-center justify-center gap-6 py-2">
                {/* Circular Badge Preview (Header style) */}
                <div className="flex flex-col items-center gap-1.5">
                  <div className="relative p-1 bg-white rounded-full shadow-md border border-emerald-500/30 w-18 h-18 flex items-center justify-center overflow-hidden">
                    {previewError ? (
                      <DugsigaSubucEmblemSvg size={64} className="w-full h-full" />
                    ) : (
                      <img 
                        src={previewUrl} 
                        alt="Logo Circular Preview" 
                        className="w-16 h-16 rounded-full object-cover bg-white"
                        onError={() => setPreviewError(true)}
                      />
                    )}
                  </div>
                  <span className="text-[10px] font-bold text-slate-600">Header / Navbar</span>
                </div>

                {/* Full Branding Preview (Dark background style) */}
                <div className="flex flex-col items-center gap-1.5">
                  <div className="p-3 bg-[#0d281e] rounded-2xl shadow-md border border-[#ca9258]/40 flex items-center justify-center w-32 h-20 overflow-hidden">
                    {previewError ? (
                      <div className="flex items-center gap-2 text-white">
                        <DugsigaSubucEmblemSvg size={40} className="w-10 h-10" />
                        <span className="text-[10px] font-extrabold text-[#ca9258]">Dugsiga Subuc</span>
                      </div>
                    ) : (
                      <img 
                        src={previewUrl} 
                        alt="Logo Full Preview" 
                        className="max-h-14 max-w-full object-contain rounded-lg"
                        onError={() => setPreviewError(true)}
                      />
                    )}
                  </div>
                  <span className="text-[10px] font-bold text-slate-600">Dark Mode / Portal</span>
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
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
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
                <span>Soo Geli Device-ka (Upload File)</span>
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
                <span>Link-ka Sawirka (URL Link)</span>
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
                  className="border-2 border-dashed border-emerald-300 hover:border-emerald-500 bg-emerald-50/40 hover:bg-emerald-50/80 p-6 rounded-2xl flex flex-col items-center justify-center gap-2 cursor-pointer transition-all text-center group"
                >
                  <div className="p-3.5 bg-white rounded-full shadow-md border border-emerald-100 text-emerald-600 group-hover:scale-110 transition-transform">
                    <Upload className="w-7 h-7" />
                  </div>
                  <p className="text-xs font-black text-slate-800 mt-1">
                    Guji halkan si aad sawir uga soo doorato Taleefankaaga ama Computer-kaaga
                  </p>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Waxay taageertaa dhammaan noocyada sawirrada (PNG, JPG, JPEG, WEBP)
                  </p>
                </div>
              </div>
            )}

            {/* Tab 2: Web URL */}
            {activeTab === 'url' && (
              <div className="space-y-3">
                <label className="block text-xs font-bold text-slate-700">
                  Geli Link-ka tooska ah ee sawirka (Direct Image URL):
                </label>
                <div className="flex gap-2">
                  <input 
                    type="url"
                    placeholder="https://example.com/school-logo.png"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    className="flex-1 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-sky-500 focus:border-sky-500 font-mono text-slate-800"
                  />
                  <button
                    type="button"
                    onClick={() => handleApplyUrl(false)}
                    className="px-4 py-2.5 bg-sky-600 hover:bg-sky-700 text-white font-extrabold text-xs rounded-xl transition-all cursor-pointer shadow-sm active:scale-95 whitespace-nowrap"
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
                className="text-xs font-bold text-amber-800 hover:text-amber-900 flex items-center gap-1.5 transition-colors cursor-pointer bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-200"
                title="Soo celi sawirkii hore ee asalka ahaa"
              >
                <RefreshCw className="w-3.5 h-3.5 text-amber-700" />
                <span>Soo celi Sawirkii Asalka ahaa (Reset Default)</span>
              </button>

              <span className="text-[10px] text-slate-400 font-mono">Auto-crop & optimized</span>
            </div>

          </div>

          {/* Footer Buttons */}
          <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-3 shrink-0">
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
              className="px-6 py-2.5 bg-gradient-to-r from-emerald-800 to-teal-800 hover:from-emerald-700 hover:to-teal-700 text-white font-black text-xs rounded-xl shadow-lg transition-all cursor-pointer flex items-center gap-2 active:scale-95 disabled:opacity-50"
            >
              <Check className="w-4 h-4 text-amber-300" />
              <span>Kaydi Sawirka Cusub (Save Logo Now)</span>
            </button>
          </div>

        </motion.div>
      </div>
    </AnimatePresence>
  );
}
