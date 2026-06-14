/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Save, 
  RotateCcw, 
  PlusCircle, 
  Trash2, 
  Sparkles, 
  HelpCircle, 
  BookOpen, 
  Award, 
  Heart, 
  ShieldCheck, 
  Users, 
  Clock, 
  Image as ImageIcon,
  Edit2,
  CheckCircle2,
  AlertCircle,
  MessageSquare,
  Mail,
  Check,
  Inbox,
  Printer,
  Download,
  Phone,
  Upload
} from 'lucide-react';
import { DatabaseState, LandingPageSettings, LandingCard, SchoolImage, ContactMessage } from '../types';
import { DEFAULT_LANDING_SETTINGS } from '../db';
import { motion } from 'motion/react';

const VALID_ICONS = ["BookOpen", "Award", "Heart", "ShieldCheck", "Users", "Clock", "Sparkles"];

interface LandingControlTabProps {
  database: DatabaseState;
  onSaveDatabase: (updatedDb: DatabaseState) => void;
}

export function LandingControlTab({ database, onSaveDatabase }: LandingControlTabProps) {
  // Safe extraction of settings
  const settings: LandingPageSettings = database.landingPageSettings || DEFAULT_LANDING_SETTINGS;

  // General Fields States
  const [schoolName, setSchoolName] = useState(settings.schoolName);
  const [heroTitle, setHeroTitle] = useState(settings.heroTitle);
  const [heroSub, setHeroSub] = useState(settings.heroSub);
  const [aboutText, setAboutText] = useState(settings.aboutText);
  const [whatWeDo, setWhatWeDo] = useState(settings.whatWeDo);
  const [contactEmail, setContactEmail] = useState(settings.contactEmail);
  const [contactPhone, setContactPhone] = useState(settings.contactPhone);
  const [contactAddress, setContactAddress] = useState(settings.contactAddress);

  // Cards List States
  const [cards, setCards] = useState<LandingCard[]>(settings.cards || []);
  const [newCardTitle, setNewCardTitle] = useState('');
  const [newCardDesc, setNewCardDesc] = useState('');
  const [newCardIcon, setNewCardIcon] = useState('BookOpen');
  const [editingCardId, setEditingCardId] = useState<string | null>(null);

  // Pictures List States
  const [pictures, setPictures] = useState<SchoolImage[]>(settings.pictures || []);
  const [newPicUrl, setNewPicUrl] = useState('');
  const [newPicCaption, setNewPicCaption] = useState('');

  // Hero badge & spiritual wisdom states
  const [heroBadge, setHeroBadge] = useState(settings.heroBadge || "Xoojinta Barashada Qur'aanka ee Casriga ah");
  const [showSpiritualWisdom, setShowSpiritualWisdom] = useState(settings.showSpiritualWisdom !== false);
  const [ayatArabic, setAyatArabic] = useState(settings.ayatArabic || "إِنَّ هَٰذَا الْقُرْآنَ يَهْدِي لِلَّتِي هِيَ أَقْوَمُ");
  const [ayatSomali, setAyatSomali] = useState(settings.ayatSomali || "Xaqiiqdii, Qur'aankan wuxuu ku hidaynayaa jidka ugu toosan uguna wanaagsan.");
  const [ayatSource, setAyatSource] = useState(settings.ayatSource || "Suurat Al-Israa: 9");
  const [hadithArabic, setHadithArabic] = useState(settings.hadithArabic || "خَيْرُكُمْ مَنْ تَعَلَّمَ الْقُرْآنَ وَعَلَّمَهُ");
  const [hadithSomali, setHadithSomali] = useState(settings.hadithSomali || "Kan idiinku khayrka badan waa kan barta Qur'aanka kariimka ah, dadka kalena bara.");
  const [hadithSource, setHadithSource] = useState(settings.hadithSource || "Saxiixul Al-Bukhari");
  const [hikmahArabic, setHikmahArabic] = useState(settings.hikmahArabic || "الصَّاحِبُ بِالْقُرْآنِ لَا يَشْقَىٰ أَبَدًا");
  const [hikmahSomali, setHikmahSomali] = useState(settings.hikmahSomali || "Wehelka Qur'aanku waligii ma dhibaatoodo, aduun iyo aakhiraba waa mid ay weheliso barako iyo xasillooni qalbi.");
  const [hikmahSource, setHikmahSource] = useState(settings.hikmahSource || "Xikmadii Salafkii");

  // Hero rotating slides states
  const [heroSlides, setHeroSlides] = useState<SchoolImage[]>(settings.heroSlides || []);
  const [newSlideUrl, setNewSlideUrl] = useState('');
  const [newSlideCaption, setNewSlideCaption] = useState('');

  // Registration steps states
  const [regStepTitle, setRegStepTitle] = useState(settings.regStepTitle || "Diiwaangelin Qof ahaaneed ah");
  const [regStepText, setRegStepText] = useState(settings.regStepText || "Si loo ilaaliyo amniga loonana hortago farriimaha spam-ka, waxaan u samaynaa diiwaangelinta cusub si toos ah fasallada dhexdiisa si aan ilmaha u qiimayno.");
  const [regStep1Title, setRegStep1Title] = useState(settings.regStep1Title || "Qiimaynta Heerka Akhriska");
  const [regStep1Text, setRegStep1Text] = useState(settings.regStep1Text || "Keen ilmahaaga xarunta si loo qiimeeyo heerka xifdiga Qur'aanka iyo Tajwiidka.");
  const [regStep2Title, setRegStep2Title] = useState(settings.regStep2Title || "Hubinta Khidmadda & Aqoonsiga");
  const [regStep2Text, setRegStep2Text] = useState(settings.regStep2Text || "Kala saar arrimaha diiwaangelinta, harna qaado kaarka aqoonsiga ee ardayga u gaarka ah.");
  const [regStep3Title, setRegStep3Title] = useState(settings.regStep3Title || "Bilaabista Casharada");
  const [regStep3Text, setRegStep3Text] = useState(settings.regStep3Text || "Ardayga wuxuu si toos ah ugu birayaa fasalkiisa isagoo raacaya jadwalkiisa u qorshaysan. Su'aalaha kale kala xiriir call: 0904819955.");
  const [regOfficeHours, setRegOfficeHours] = useState(settings.regOfficeHours || "Sabti - Khamiis: 7:30 subax - 5:30 galabnimo");

  // Status feedback
  const [savedFeedback, setSavedFeedback] = useState<string | null>(null);

  // Custom confirmation modal state to bypass iframe modal blockages
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    accentColor?: 'rose' | 'indigo' | 'amber' | 'teal';
    onConfirm: () => void;
  } | null>(null);

  const [printTarget, setPrintTarget] = useState<ContactMessage | 'all' | null>(null);
  const [compressingImage, setCompressingImage] = useState(false);

  // Helper to read and compress image from device
  const handleDeviceImageUpload = (file: File | null, target: 'gallery' | 'hero') => {
    if (!file) return;
    setCompressingImage(true);
    
    // Check if the file is genuinely an image
    if (!file.type.startsWith('image/')) {
      alert("Fadlan dooro sawir sax ah (JPG, PNG, WebP)!");
      setCompressingImage(false);
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.src = e.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        // We compress the image to max 1200x800 for high resolution landing slide display while staying lightweight
        const MAX_WIDTH = 1200;
        const MAX_HEIGHT = 800;
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

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          try {
            ctx.drawImage(img, 0, 0, width, height);
            // Compress heavily to keep Firestore values small and prevent exceeded sizes
            const base64 = canvas.toDataURL('image/jpeg', 0.82);
            if (target === 'gallery') {
              setNewPicUrl(base64);
              triggerFeedback("Gallery image uploaded from your device!");
            } else {
              setNewSlideUrl(base64);
              triggerFeedback("Hero slideshow image uploaded from your device!");
            }
          } catch (err) {
            console.error("Canvas compression failed, falling back to original base64:", err);
            const rawBase64 = e.target?.result as string;
            if (target === 'gallery') {
              setNewPicUrl(rawBase64);
            } else {
              setNewSlideUrl(rawBase64);
            }
          }
        }
        setCompressingImage(false);
      };
      img.onerror = () => {
        setCompressingImage(false);
        alert("Waan ka pahoobnaa, ku guuldareysatay in la akhriyo sawirka.");
      };
    };
    reader.onerror = () => {
      setCompressingImage(false);
      alert("Cilad ayaa ka dhacday akhrinta file-ka.");
    };
    reader.readAsDataURL(file);
  };

  // Prune expired messages older than 24 hours on mount to avoid database overflow
  React.useEffect(() => {
    const rawMessages = database.contactMessages || [];
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    const activeMessages = rawMessages.filter(msg => {
      const msgTime = new Date(msg.timestamp).getTime();
      return !isNaN(msgTime) && msgTime > oneDayAgo;
    });

    if (activeMessages.length !== rawMessages.length) {
      onSaveDatabase({
        ...database,
        contactMessages: activeMessages
      });
    }
  }, []);

  // Bulk CSV Export of messages
  const handleExportCSV = () => {
    const freshMessages = database.contactMessages || [];
    if (freshMessages.length === 0) {
      alert("No messages to export!");
      return;
    }
    const headers = ["ID", "Magaca (Name)", "Taleefanka (Phone)", "Farriinta (What they need)", "Taariikhda (Timestamp)", "Read Status"];
    const rows = freshMessages.map(msg => [
      `"${msg.id}"`,
      `"${msg.name.replace(/"/g, '""')}"`,
      `"${(msg.phone || '').replace(/"/g, '""')}"`,
      `"${msg.message.replace(/"/g, '""')}"`,
      `"${new Date(msg.timestamp).toLocaleString()}"`,
      msg.read ? '"Read"' : '"Unread"'
    ]);
    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" 
      + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Dugsiga_Subuc_Inquiries_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    triggerFeedback("Contact report CSV downloaded!");
  };

  // Download a single message slip as standard TXT format
  const handleDownloadTXT = (msg: ContactMessage) => {
    const text = `
===================================================
         DUGSIGA SUBUC & INTEGRATED ACADEMY
          VISITOR INQUIRY SLIP REPORT
===================================================
Voucher Reference ID: ${msg.id}
Magaca Booqandaha (Name): ${msg.name}
Taleefanka (Phone): ${msg.phone || 'N/A'}
Email: ${msg.email || 'N/A'}
Taariikhda la soo gudbiyay (Submitted): ${new Date(msg.timestamp).toLocaleString()}

FARRIINTA CODSI / SAAXADA WAALIDKA:
---------------------------------------------------
"${msg.message}"

---------------------------------------------------
Fariintaan waxaa la tirtirayaa 24 saac ka dib si loo ilaaliyo bedqabka iyo fudeydka database-ka nidaamka.
===================================================
`;
    const element = document.createElement("a");
    const file = new Blob([text], {type: 'text/plain;charset=utf-8'});
    element.href = URL.createObjectURL(file);
    element.download = `Inquiry_Slip_${msg.name.replace(/\s+/g, '_')}_${msg.id}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    triggerFeedback("Inquiry Slip downloaded as TXT!");
  };

  const messages = database.contactMessages || [];
  const unreadCount = messages.filter(m => !m.read).length;

  const handleToggleRead = (msgId: string) => {
    const updatedMessages = messages.map(m => m.id === msgId ? { ...m, read: !m.read } : m);
    onSaveDatabase({
      ...database,
      contactMessages: updatedMessages
    });
    triggerFeedback("Message read status updated successfully!");
  };

  const handleDeleteMessage = (msgId: string) => {
    setConfirmModal({
      isOpen: true,
      title: "Delete Message Forever?",
      message: "Are you sure you want to delete this inbox message forever?",
      accentColor: 'rose',
      onConfirm: () => {
        const updatedMessages = messages.filter(m => m.id !== msgId);
        onSaveDatabase({
          ...database,
          contactMessages: updatedMessages
        });
        triggerFeedback("Message deleted from inbox.");
        setConfirmModal(null);
      }
    });
  };

  const getCurrentSettings = (overrides?: Partial<LandingPageSettings>): LandingPageSettings => {
    return {
      schoolName: schoolName.trim(),
      heroTitle: heroTitle.trim(),
      heroSub: heroSub.trim(),
      aboutText: aboutText.trim(),
      whatWeDo: whatWeDo.trim(),
      contactEmail: contactEmail.trim(),
      contactPhone: contactPhone.trim(),
      contactAddress: contactAddress.trim(),
      cards,
      pictures,
      heroBadge: heroBadge.trim(),
      showSpiritualWisdom,
      ayatArabic: ayatArabic.trim(),
      ayatSomali: ayatSomali.trim(),
      ayatSource: ayatSource.trim(),
      hadithArabic: hadithArabic.trim(),
      hadithSomali: hadithSomali.trim(),
      hadithSource: hadithSource.trim(),
      hikmahArabic: hikmahArabic.trim(),
      hikmahSomali: hikmahSomali.trim(),
      hikmahSource: hikmahSource.trim(),
      heroSlides,
      regStepTitle: regStepTitle.trim(),
      regStepText: regStepText.trim(),
      regStep1Title: regStep1Title.trim(),
      regStep1Text: regStep1Text.trim(),
      regStep2Title: regStep2Title.trim(),
      regStep2Text: regStep2Text.trim(),
      regStep3Title: regStep3Title.trim(),
      regStep3Text: regStep3Text.trim(),
      regOfficeHours: regOfficeHours.trim(),
      ...overrides
    };
  };

  // Reset to static templates
  const handleRestoreDefaults = () => {
    setConfirmModal({
      isOpen: true,
      title: "Restore Standard Templates?",
      message: "Are you sure you want to restore the landing page back to the original Dugsiga Subuc standard templates? Any customized copywriting will be overwritten.",
      accentColor: 'amber',
      onConfirm: () => {
        setSchoolName(DEFAULT_LANDING_SETTINGS.schoolName);
        setHeroTitle(DEFAULT_LANDING_SETTINGS.heroTitle);
        setHeroSub(DEFAULT_LANDING_SETTINGS.heroSub);
        setAboutText(DEFAULT_LANDING_SETTINGS.aboutText);
        setWhatWeDo(DEFAULT_LANDING_SETTINGS.whatWeDo);
        setContactEmail(DEFAULT_LANDING_SETTINGS.contactEmail);
        setContactPhone(DEFAULT_LANDING_SETTINGS.contactPhone);
        setContactAddress(DEFAULT_LANDING_SETTINGS.contactAddress);
        setCards(DEFAULT_LANDING_SETTINGS.cards);
        setPictures(DEFAULT_LANDING_SETTINGS.pictures);
        setHeroBadge(DEFAULT_LANDING_SETTINGS.heroBadge || "Xoojinta Barashada Qur'aanka ee Casriga ah");
        setShowSpiritualWisdom(DEFAULT_LANDING_SETTINGS.showSpiritualWisdom !== false);
        setAyatArabic(DEFAULT_LANDING_SETTINGS.ayatArabic || "إِنَّ هَٰذَا الْقُرْآنَ يَهْدِي لِلَّتِي هِيَ أَقْوَمُ");
        setAyatSomali(DEFAULT_LANDING_SETTINGS.ayatSomali || "Xaqiiqdii, Qur'aankan wuxuu ku hidaynayaa jidka ugu toosan uguna wanaagsan.");
        setAyatSource(DEFAULT_LANDING_SETTINGS.ayatSource || "Suurat Al-Israa: 9");
        setHadithArabic(DEFAULT_LANDING_SETTINGS.hadithArabic || "خَيْرُكُمْ مَنْ تَعَلَّمَ الْقُرْآنَ وَعَلَّمَهُ");
        setHadithSomali(DEFAULT_LANDING_SETTINGS.hadithSomali || "Kan idiinku khayrka badan waa kan barta Qur'aanka kariimka ah, dadka kalena bara.");
        setHadithSource(DEFAULT_LANDING_SETTINGS.hadithSource || "Saxiixul Al-Bukhari");
        setHikmahArabic(DEFAULT_LANDING_SETTINGS.hikmahArabic || "الصَّاحِبُ بِالْقُرْآنِ لَا يَشْقَىٰ أَبَدًا");
        setHikmahSomali(DEFAULT_LANDING_SETTINGS.hikmahSomali || "Wehelka Qur'aanku waligii ma dhibaatoodo, aduun iyo aakhiraba waa mid ay weheliso barako iyo xasillooni qalbi.");
        setHikmahSource(DEFAULT_LANDING_SETTINGS.hikmahSource || "Xikmadii Salafkii");
        setHeroSlides(DEFAULT_LANDING_SETTINGS.heroSlides || []);
        
        setRegStepTitle(DEFAULT_LANDING_SETTINGS.regStepTitle || "Diiwaangelin Qof ahaaneed ah");
        setRegStepText(DEFAULT_LANDING_SETTINGS.regStepText || "Si loo ilaaliyo amniga loonana hortago farriimaha spam-ka, waxaan u samaynaa diiwaangelinta cusub si toos ah fasallada dhexdiisa si aan ilmaha u qiimayno.");
        setRegStep1Title(DEFAULT_LANDING_SETTINGS.regStep1Title || "Qiimaynta Heerka Akhriska");
        setRegStep1Text(DEFAULT_LANDING_SETTINGS.regStep1Text || "Keen ilmahaaga xarunta si loo qiimeeyo heerka xifdiga Qur'aanka iyo Tajwiidka.");
        setRegStep2Title(DEFAULT_LANDING_SETTINGS.regStep2Title || "Hubinta Khidmadda & Aqoonsiga");
        setRegStep2Text(DEFAULT_LANDING_SETTINGS.regStep2Text || "Kala saar arrimaha diiwaangelinta, harna qaado kaarka aqoonsiga ee ardayga u gaarka ah.");
        setRegStep3Title(DEFAULT_LANDING_SETTINGS.regStep3Title || "Bilaabista Casharada");
        setRegStep3Text(DEFAULT_LANDING_SETTINGS.regStep3Text || "Ardayga wuxuu si toos ah ugu birayaa fasalkiisa isagoo raacaya jadwalkiisa u qorshaysan. Su'aalaha kale kala xiriir call: 0904819955.");
        setRegOfficeHours(DEFAULT_LANDING_SETTINGS.regOfficeHours || "Sabti - Khamiis: 7:30 subax - 5:30 galabnimo");

        const updatedSettings: LandingPageSettings = {
          schoolName: DEFAULT_LANDING_SETTINGS.schoolName,
          heroTitle: DEFAULT_LANDING_SETTINGS.heroTitle,
          heroSub: DEFAULT_LANDING_SETTINGS.heroSub,
          aboutText: DEFAULT_LANDING_SETTINGS.aboutText,
          whatWeDo: DEFAULT_LANDING_SETTINGS.whatWeDo,
          contactEmail: DEFAULT_LANDING_SETTINGS.contactEmail,
          contactPhone: DEFAULT_LANDING_SETTINGS.contactPhone,
          contactAddress: DEFAULT_LANDING_SETTINGS.contactAddress,
          cards: DEFAULT_LANDING_SETTINGS.cards,
          pictures: DEFAULT_LANDING_SETTINGS.pictures,
          heroBadge: DEFAULT_LANDING_SETTINGS.heroBadge,
          showSpiritualWisdom: DEFAULT_LANDING_SETTINGS.showSpiritualWisdom,
          ayatArabic: DEFAULT_LANDING_SETTINGS.ayatArabic,
          ayatSomali: DEFAULT_LANDING_SETTINGS.ayatSomali,
          ayatSource: DEFAULT_LANDING_SETTINGS.ayatSource,
          hadithArabic: DEFAULT_LANDING_SETTINGS.hadithArabic,
          hadithSomali: DEFAULT_LANDING_SETTINGS.hadithSomali,
          hadithSource: DEFAULT_LANDING_SETTINGS.hadithSource,
          hikmahArabic: DEFAULT_LANDING_SETTINGS.hikmahArabic,
          hikmahSomali: DEFAULT_LANDING_SETTINGS.hikmahSomali,
          hikmahSource: DEFAULT_LANDING_SETTINGS.hikmahSource,
          heroSlides: DEFAULT_LANDING_SETTINGS.heroSlides,
          regStepTitle: DEFAULT_LANDING_SETTINGS.regStepTitle,
          regStepText: DEFAULT_LANDING_SETTINGS.regStepText,
          regStep1Title: DEFAULT_LANDING_SETTINGS.regStep1Title,
          regStep1Text: DEFAULT_LANDING_SETTINGS.regStep1Text,
          regStep2Title: DEFAULT_LANDING_SETTINGS.regStep2Title,
          regStep2Text: DEFAULT_LANDING_SETTINGS.regStep2Text,
          regStep3Title: DEFAULT_LANDING_SETTINGS.regStep3Title,
          regStep3Text: DEFAULT_LANDING_SETTINGS.regStep3Text,
          regOfficeHours: DEFAULT_LANDING_SETTINGS.regOfficeHours
        };

        onSaveDatabase({
          ...database,
          landingPageSettings: updatedSettings
        });
        triggerFeedback("Successfully restored default text copy templates!");
        setConfirmModal(null);
      }
    });
  };

  const triggerFeedback = (msg: string) => {
    setSavedFeedback(msg);
    setTimeout(() => setSavedFeedback(null), 4000);
  };

  // General Form Savior
  const handleSaveGeneral = (e: React.FormEvent) => {
    e.preventDefault();

    onSaveDatabase({
      ...database,
      landingPageSettings: getCurrentSettings()
    });

    triggerFeedback("General branding & contact settings updated successfully!");
  };

  // -------------------------------------------------------------
  // CARD MANAGEMENT OPERATIONS
  // -------------------------------------------------------------
  const handleAddCard = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCardTitle.trim() || !newCardDesc.trim()) {
      alert("Please fill in card title and details!");
      return;
    }

    if (editingCardId) {
      // Editing existing
      const updatedCards = cards.map(c => {
        if (c.id === editingCardId) {
          return {
            ...c,
            title: newCardTitle.trim(),
            description: newCardDesc.trim(),
            iconName: newCardIcon
          };
        }
        return c;
      });
      setCards(updatedCards);
      setEditingCardId(null);
      saveCardsState(updatedCards);
      triggerFeedback("Information card modified successfully.");
    } else {
      // Adding new
      const nextId = `C-${Date.now()}`;
      const newCard: LandingCard = {
        id: nextId,
        title: newCardTitle.trim(),
        description: newCardDesc.trim(),
        iconName: newCardIcon
      };
      const updatedCards = [...cards, newCard];
      setCards(updatedCards);
      saveCardsState(updatedCards);
      triggerFeedback("New service card appended successfully!");
    }

    // Reset inputs
    setNewCardTitle('');
    setNewCardDesc('');
    setNewCardIcon('BookOpen');
  };

  const handleEditCardStart = (card: LandingCard) => {
    setEditingCardId(card.id);
    setNewCardTitle(card.title);
    setNewCardDesc(card.description);
    setNewCardIcon(card.iconName);
    
    // Smooth scroll to card form
    const formEl = document.getElementById('card-form-anchor');
    if (formEl) {
      formEl.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleDeleteCard = (cardId: string) => {
    setConfirmModal({
      isOpen: true,
      title: "Delete Content Card?",
      message: "Are you sure you want to delete this informational card from public school landing page?",
      accentColor: 'rose',
      onConfirm: () => {
        const updated = cards.filter(c => c.id !== cardId);
        setCards(updated);
        saveCardsState(updated);
        triggerFeedback("Card removed.");
        setConfirmModal(null);
      }
    });
  };

  const saveCardsState = (currCards: LandingCard[]) => {
    onSaveDatabase({
      ...database,
      landingPageSettings: getCurrentSettings({ cards: currCards })
    });
  };

  // -------------------------------------------------------------
  // GALLERY PICTURE OPERATIONS
  // -------------------------------------------------------------
  const handleAddPicture = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPicUrl.trim() || !newPicCaption.trim()) {
      alert("Provide a valid web image URL and description caption!");
      return;
    }

    const newPic: SchoolImage = {
      id: `P-${Date.now()}`,
      url: newPicUrl.trim(),
      caption: newPicCaption.trim()
    };

    const updatedPics = [...pictures, newPic];
    setPictures(updatedPics);
    savePicsState(updatedPics);

    setNewPicUrl('');
    setNewPicCaption('');
    triggerFeedback("Saved picture to the official landing gallery!");
  };

  const handleDeletePicture = (picId: string) => {
    setConfirmModal({
      isOpen: true,
      title: "Delete Gallery Image?",
      message: "Remove this picture from the landing gallery?",
      accentColor: 'rose',
      onConfirm: () => {
        const updated = pictures.filter(p => p.id !== picId);
        setPictures(updated);
        savePicsState(updated);
        triggerFeedback("Image removed.");
        setConfirmModal(null);
      }
    });
  };

  const savePicsState = (currPics: SchoolImage[]) => {
    onSaveDatabase({
      ...database,
      landingPageSettings: getCurrentSettings({ pictures: currPics })
    });
  };

  // -------------------------------------------------------------
  // HERO ROTATING SLIDESHOW OPERATIONS
  // -------------------------------------------------------------
  const handleAddHeroSlide = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSlideUrl.trim() || !newSlideCaption.trim()) {
      alert("Fadlan geli sawir URL sax ah iyo faahfaahintiisa slideshow-ga!");
      return;
    }

    const newSlide: SchoolImage = {
      id: `HS-${Date.now()}`,
      url: newSlideUrl.trim(),
      caption: newSlideCaption.trim()
    };

    const updatedSlides = [...heroSlides, newSlide];
    setHeroSlides(updatedSlides);
    saveHeroSlidesState(updatedSlides);

    setNewSlideUrl('');
    setNewSlideCaption('');
    triggerFeedback("Sawirka slideshow-ga bogga hore si guul leh ayaa loo kaydiyay!");
  };

  const handleDeleteHeroSlide = (slideId: string) => {
    setConfirmModal({
      isOpen: true,
      title: "Ma tirtirtaa Sawirka Slideshow-ga?",
      message: "Ma hubtaa inaad rabto inaad sawirkaan ka saarto bandhiga is-bedbeddela ee bogga hore?",
      accentColor: 'rose',
      onConfirm: () => {
        const updated = heroSlides.filter(s => s.id !== slideId);
        setHeroSlides(updated);
        saveHeroSlidesState(updated);
        triggerFeedback("Sawirka waa la tirtiray.");
        setConfirmModal(null);
      }
    });
  };

  const saveHeroSlidesState = (currSlides: SchoolImage[]) => {
    onSaveDatabase({
      ...database,
      landingPageSettings: getCurrentSettings({ heroSlides: currSlides })
    });
  };

  return (
    <div className="space-y-8 animate-fade-in" id="landing-config-portal">
      
      {/* Upper Status Notifications */}
      {savedFeedback && (
        <div className="p-4 bg-emerald-50 border border-emerald-150 rounded-2xl flex items-center gap-3 shadow-sm select-none" id="save-feedback-banner">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <p className="text-xs font-bold text-emerald-850">{savedFeedback}</p>
        </div>
      )}

      {/* Main Grid: Left General Settings, Right Cards & Pictures Management */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        
        {/* COLUMN 1: General Messaging Controls */}
        <div className="xl:col-span-7 space-y-8">
          <div className="bg-white p-7 rounded-3xl border border-slate-100 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-teal-500 to-indigo-500" />
            
            <div className="flex items-center justify-between border-b border-slate-100 pb-5 mb-5">
              <div className="flex items-center gap-2.5">
                <span className="p-2 bg-teal-50 text-teal-600 rounded-xl"><Sparkles className="w-4.5 h-4.5" /></span>
                <div>
                  <h4 className="font-extrabold text-slate-900 text-sm">Public Branding & General Copy</h4>
                  <p className="text-[10px] text-slate-400 mt-0.5 font-semibold">Customize main hero, about us section and info details.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleRestoreDefaults}
                className="py-1.5 px-3 bg-slate-50 hover:bg-rose-50 border border-slate-150 hover:border-rose-100 text-[10px] uppercase tracking-wider font-extrabold text-slate-500 hover:text-rose-600 rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
                title="Restore original Seeds"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Defaults
              </button>
            </div>

            <form onSubmit={handleSaveGeneral} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1.5 pl-0.5">School Official Name *</label>
                <input
                  type="text"
                  required
                  value={schoolName}
                  onChange={(e) => setSchoolName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:border-teal-500 focus:bg-white rounded-xl text-xs font-semibold text-slate-800 outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1.5 pl-0.5">Hero Headline / Slogan *</label>
                  <input
                    type="text"
                    required
                    value={heroTitle}
                    onChange={(e) => setHeroTitle(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:border-teal-500 focus:bg-white rounded-xl text-xs font-semibold text-slate-800 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1.5 pl-0.5">Hero Badge Slogan (Golden Top Text) *</label>
                  <input
                    type="text"
                    required
                    value={heroBadge}
                    onChange={(e) => setHeroBadge(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:border-teal-500 focus:bg-white rounded-xl text-xs font-semibold text-slate-800 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1.5 pl-0.5">Hero Subtitle / Introduction *</label>
                <textarea
                  required
                  rows={2}
                  value={heroSub}
                  onChange={(e) => setHeroSub(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:border-teal-500 focus:bg-white rounded-xl text-xs font-semibold text-slate-800 outline-none resize-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1.5 pl-0.5">About Us Summary Text *</label>
                  <textarea
                    required
                    rows={4}
                    value={aboutText}
                    onChange={(e) => setAboutText(e.target.value)}
                    className="w-full h-32 px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:border-teal-500 focus:bg-white rounded-xl text-xs font-semibold text-slate-800 outline-none resize-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1.5 pl-0.5">What the School Does (Programs Intro) *</label>
                  <textarea
                    required
                    rows={4}
                    value={whatWeDo}
                    onChange={(e) => setWhatWeDo(e.target.value)}
                    className="w-full h-32 px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:border-teal-500 focus:bg-white rounded-xl text-xs font-semibold text-slate-800 outline-none resize-none"
                  />
                </div>
              </div>

              {/* Contacts Block */}
              <div className="border-t border-slate-100/85 pt-4 space-y-4">
                <h5 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider mb-2">Registrar Contact Us Info</h5>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1.5 pl-0.5">Email *</label>
                    <input
                      type="email"
                      required
                      value={contactEmail}
                      onChange={(e) => setContactEmail(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:border-teal-500 focus:bg-white rounded-xl text-xs font-semibold text-slate-800 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1.5 pl-0.5">Phone Call Center *</label>
                    <input
                      type="text"
                      required
                      value={contactPhone}
                      onChange={(e) => setContactPhone(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:border-teal-500 focus:bg-white rounded-xl text-xs font-semibold text-slate-800 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1.5 pl-0.5">Physical Campus Address *</label>
                  <input
                    type="text"
                    required
                    value={contactAddress}
                    onChange={(e) => setContactAddress(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:border-teal-500 focus:bg-white rounded-xl text-xs font-semibold text-slate-800 outline-none"
                  />
                </div>
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  className="w-full py-3.5 px-4 bg-teal-600 hover:bg-teal-700 active:bg-teal-850 text-white font-bold text-xs uppercase tracking-wider rounded-xl cursor-pointer shadow-lg shadow-teal-600/10 transition-all flex items-center justify-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  Save Public Branding & Text Details
                </button>
              </div>
            </form>
          </div>

          {/* Customizable In-Person Registration (Diiwaangelin Qof ahaaneed) Panel */}
          <div className="bg-white p-7 rounded-3xl border border-slate-100 shadow-sm relative overflow-hidden" id="in-person-registration-control-card">
            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-teal-500 to-emerald-500" />
            
            <div className="flex items-center justify-between border-b border-slate-100 pb-5 mb-5">
              <div className="flex items-center gap-2.5">
                <span className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                  <ShieldCheck className="w-4.5 h-4.5" />
                </span>
                <div>
                  <h4 className="font-extrabold text-slate-900 text-sm">Diiwaangelin Qof Ahaaneed ah Controls</h4>
                  <p className="text-[10px] text-slate-400 mt-0.5 font-semibold">
                    Kala soco ama wax ka beddel macluumaadka iyo talaabooyinka diiwaangelinta qof ahaaneed ee ka muuqda bogga hore.
                  </p>
                </div>
              </div>
            </div>

            <form onSubmit={(e) => {
              e.preventDefault();
              onSaveDatabase({
                ...database,
                landingPageSettings: getCurrentSettings()
              });
              triggerFeedback("In-person registration settings updated successfully!");
            }} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1.5 pl-0.5">
                    Muddada / Office Open Hours *
                  </label>
                  <input
                    type="text"
                    required
                    value={regOfficeHours}
                    onChange={(e) => setRegOfficeHours(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:bg-white rounded-xl text-xs font-semibold text-slate-800 outline-none"
                    placeholder="e.g. Sabti - Khamiis: 7:30 subax - 5:30 galabnimo"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1.5 pl-0.5">
                    Sumadda Qaybta / Section Badge Text *
                  </label>
                  <input
                    type="text"
                    required
                    value={regStepTitle}
                    onChange={(e) => setRegStepTitle(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:bg-white rounded-xl text-xs font-semibold text-slate-800 outline-none"
                    placeholder="e.g. Diiwaangelin Qof ahaaneed ah"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1.5 pl-0.5">
                  Hordhaca Qaybta / Section Intro *
                </label>
                <textarea
                  required
                  rows={2}
                  value={regStepText}
                  onChange={(e) => setRegStepText(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:bg-white rounded-xl text-xs font-semibold text-slate-800 outline-none resize-none"
                  placeholder="Si loo ilaaliyo amniga loonana hortago farriimaha spam-ka..."
                />
              </div>

              {/* Step 1 */}
              <div className="p-4 bg-slate-50/55 rounded-2xl border border-slate-100 space-y-3">
                <span className="text-[9px] uppercase font-black text-emerald-600 tracking-wider">Talaabada 1aad (Step 1)</span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-1">
                    <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Cinwaanka 1aad *</label>
                    <input
                      type="text"
                      required
                      value={regStep1Title}
                      onChange={(e) => setRegStep1Title(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 focus:border-emerald-500 rounded-lg text-xs font-semibold text-slate-800 outline-none"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Faahfaahinta *</label>
                    <input
                      type="text"
                      required
                      value={regStep1Text}
                      onChange={(e) => setRegStep1Text(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 focus:border-emerald-500 rounded-lg text-xs font-semibold text-slate-800 outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Step 2 */}
              <div className="p-4 bg-slate-50/55 rounded-2xl border border-slate-100 space-y-3">
                <span className="text-[9px] uppercase font-black text-emerald-600 tracking-wider">Talaabada 2aad (Step 2)</span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-1">
                    <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Cinwaanka 2aad *</label>
                    <input
                      type="text"
                      required
                      value={regStep2Title}
                      onChange={(e) => setRegStep2Title(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 focus:border-emerald-500 rounded-lg text-xs font-semibold text-slate-800 outline-none"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Faahfaahinta *</label>
                    <input
                      type="text"
                      required
                      value={regStep2Text}
                      onChange={(e) => setRegStep2Text(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 focus:border-emerald-500 rounded-lg text-xs font-semibold text-slate-800 outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Step 3 */}
              <div className="p-4 bg-slate-50/55 rounded-2xl border border-slate-100 space-y-3">
                <span className="text-[9px] uppercase font-black text-emerald-600 tracking-wider">Talaabada 3aad (Step 3)</span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-1">
                    <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Cinwaanka 3aad *</label>
                    <input
                      type="text"
                      required
                      value={regStep3Title}
                      onChange={(e) => setRegStep3Title(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 focus:border-emerald-500 rounded-lg text-xs font-semibold text-slate-800 outline-none"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Faahfaahinta *</label>
                    <input
                      type="text"
                      required
                      value={regStep3Text}
                      onChange={(e) => setRegStep3Text(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 focus:border-emerald-500 rounded-lg text-xs font-semibold text-slate-800 outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-850 text-white font-black text-xs uppercase tracking-wider rounded-xl cursor-pointer shadow-lg shadow-emerald-600/10 transition-all flex items-center justify-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  Save In-Person Registration Controls
                </button>
              </div>
            </form>
          </div>

          {/* Spiritual Wisdom panel */}
          <div className="bg-white p-7 rounded-3xl border border-slate-100 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-500" />
            <div className="flex items-center justify-between border-b border-slate-100 pb-5 mb-5">
              <div className="flex items-center gap-2.5">
                <span className="p-2 bg-emerald-50 text-emerald-600 rounded-xl"><BookOpen className="w-4.5 h-4.5" /></span>
                <div>
                  <h4 className="font-extrabold text-slate-900 text-sm">Nuurka Qur'aanka (Spiritual Wisdom)</h4>
                  <p className="text-[10px] text-slate-400 mt-0.5 font-semibold">Customize verses, translations and spiritual quotes displayed on the landing page.</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer select-none">
                <input 
                  type="checkbox" 
                  checked={showSpiritualWisdom} 
                  onChange={(e) => {
                    setShowSpiritualWisdom(e.target.checked);
                    // Auto-save this state
                    onSaveDatabase({
                      ...database,
                      landingPageSettings: getCurrentSettings({ showSpiritualWisdom: e.target.checked })
                    });
                    triggerFeedback(`Spiritual Wisdom section is now ${e.target.checked ? 'Visible' : 'Hidden'}!`);
                  }}
                  className="sr-only peer" 
                />
                <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
                <span className="ml-2 text-[10px] font-black text-slate-500 uppercase tracking-wider">{showSpiritualWisdom ? 'Muuqda' : 'Qarsoon'}</span>
              </label>
            </div>

            {showSpiritualWisdom && (
              <div className="space-y-6">
                {/* AYAAD */}
                <div className="p-4 bg-slate-50/55 rounded-2xl border border-slate-100 space-y-3.5">
                  <span className="text-[9px] uppercase font-black text-[#ca9258] tracking-widest font-mono">📖 1. AAYADDA QUR'AANKA</span>
                  <div>
                    <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Aayadda (Arabic) *</label>
                    <input 
                      type="text" 
                      value={ayatArabic} 
                      onChange={(e) => setAyatArabic(e.target.value)} 
                      className="w-full px-3 py-2 bg-white border border-slate-200 focus:border-teal-500 rounded-lg text-xs font-semibold text-slate-800 outline-none text-right font-serif" dir="rtl"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="col-span-2">
                      <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Fasirka (Somali) *</label>
                      <input 
                        type="text" 
                        value={ayatSomali} 
                        onChange={(e) => setAyatSomali(e.target.value)} 
                        className="w-full px-3 py-2 bg-white border border-slate-200 focus:border-teal-500 rounded-lg text-xs font-semibold text-slate-800 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Tixraaca (Source) *</label>
                      <input 
                        type="text" 
                        value={ayatSource} 
                        onChange={(e) => setAyatSource(e.target.value)} 
                        className="w-full px-3 py-2 bg-white border border-slate-200 focus:border-teal-500 rounded-lg text-xs font-semibold text-slate-800 outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* HADITH */}
                <div className="p-4 bg-slate-50/55 rounded-2xl border border-slate-100 space-y-3.5">
                  <span className="text-[9px] uppercase font-black text-[#ca9258] tracking-widest font-mono">🕌 2. XADIISKA NEBIGA (NNKH)</span>
                  <div>
                    <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Xadiiska (Arabic) *</label>
                    <input 
                      type="text" 
                      value={hadithArabic} 
                      onChange={(e) => setHadithArabic(e.target.value)} 
                      className="w-full px-3 py-2 bg-white border border-slate-200 focus:border-teal-500 rounded-lg text-xs font-semibold text-slate-800 outline-none text-right font-serif" dir="rtl"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="col-span-2">
                      <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Fasirka (Somali) *</label>
                      <input 
                        type="text" 
                        value={hadithSomali} 
                        onChange={(e) => setHadithSomali(e.target.value)} 
                        className="w-full px-3 py-2 bg-white border border-slate-200 focus:border-teal-500 rounded-lg text-xs font-semibold text-slate-800 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Tixraaca (Source) *</label>
                      <input 
                        type="text" 
                        value={hadithSource} 
                        onChange={(e) => setHadithSource(e.target.value)} 
                        className="w-full px-3 py-2 bg-white border border-slate-200 focus:border-teal-500 rounded-lg text-xs font-semibold text-slate-800 outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* HIKMAH */}
                <div className="p-4 bg-slate-50/55 rounded-2xl border border-slate-100 space-y-3.5">
                  <span className="text-[9px] uppercase font-black text-[#ca9258] tracking-widest font-mono">🌿 3. MURTIDA & XIKMADDA</span>
                  <div>
                    <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Murtida (Arabic) *</label>
                    <input 
                      type="text" 
                      value={hikmahArabic} 
                      onChange={(e) => setHikmahArabic(e.target.value)} 
                      className="w-full px-3 py-2 bg-white border border-slate-200 focus:border-teal-500 rounded-lg text-xs font-semibold text-slate-800 outline-none text-right font-serif" dir="rtl"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="col-span-2">
                      <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Macnaha (Somali) *</label>
                      <input 
                        type="text" 
                        value={hikmahSomali} 
                        onChange={(e) => setHikmahSomali(e.target.value)} 
                        className="w-full px-3 py-2 bg-white border border-slate-200 focus:border-teal-500 rounded-lg text-xs font-semibold text-slate-800 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Tixraaca (Source) *</label>
                      <input 
                        type="text" 
                        value={hikmahSource} 
                        onChange={(e) => setHikmahSource(e.target.value)} 
                        className="w-full px-3 py-2 bg-white border border-slate-200 focus:border-teal-500 rounded-lg text-xs font-semibold text-slate-800 outline-none"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-2">
                  <button 
                    type="button" 
                    onClick={handleSaveGeneral}
                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-black text-xs uppercase tracking-wider rounded-xl cursor-pointer shadow-md transition-all flex items-center justify-center gap-1.5"
                  >
                    <Save className="w-3.5 h-3.5" />
                    Save Spiritual Wisdom Copy
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* COLUMN 2: Managed elements (Info Cards, Picture Gallery) */}
        <div className="xl:col-span-5 space-y-8">
          
          {/* A. Info Cards Customization */}
          <div className="bg-white p-7 rounded-3xl border border-slate-150 shadow-sm relative" id="card-config-module">
            <h4 className="font-extrabold text-slate-900 text-sm mb-1">What the School Does: Information Cards</h4>
            <p className="text-[10px] text-slate-400 font-semibold mb-5 pl-0.5">Add or remove visual bento cards appearing on the public page.</p>

            {/* List of active cards */}
            <div className="divide-y divide-slate-100 max-h-56 overflow-y-auto mb-6 pr-2 border border-slate-100 rounded-xl p-3 bg-slate-50/50">
              {cards.length === 0 ? (
                <p className="text-center py-6 text-slate-400 text-xs font-bold">No active cards found. Add some below!</p>
              ) : (
                cards.map(card => (
                  <div key={card.id} className="py-2.5 flex items-start justify-between gap-3 text-left">
                    <div className="min-w-0">
                      <span className="inline-flex px-1.5 py-0.5 rounded-md text-[9px] font-mono font-bold bg-teal-50 text-teal-700 border border-teal-100/60 mb-1">{card.iconName}</span>
                      <h5 className="font-bold text-xs text-slate-805 truncate">{card.title}</h5>
                      <p className="text-[10px] text-slate-400 truncate leading-normal">{card.description}</p>
                    </div>
                    <div className="flex gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleEditCardStart(card)}
                        className="p-1 px-1.5 hover:bg-indigo-50 border border-transparent hover:border-indigo-100 text-indigo-500 rounded-md cursor-pointer transition-colors"
                        title="Edit Card contents"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteCard(card.id)}
                        className="p-1 px-1.5 hover:bg-rose-50 border border-transparent hover:border-rose-150 text-rose-600 rounded-md cursor-pointer transition-colors"
                        title="Delete Card"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Add / Edit Form */}
            <form onSubmit={handleAddCard} className="p-4 bg-slate-50 border border-slate-100 rounded-2xl space-y-3" id="card-form-anchor">
              <span className="text-[9px] uppercase font-black text-indigo-600 tracking-wider flex items-center gap-1">
                {editingCardId ? "✓ Edit Selected Card" : "⊕ Append Educational Card"}
              </span>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-[9px] font-black text-slate-400 uppercase mb-1">Card Title *</label>
                  <input
                    type="text"
                    required
                    value={newCardTitle}
                    onChange={(e) => setNewCardTitle(e.target.value)}
                    placeholder="e.g. Hifdh Program"
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 focus:border-teal-500 rounded-lg text-xs outline-none font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-black text-slate-400 uppercase mb-1">Icon *</label>
                  <select
                    value={newCardIcon}
                    onChange={(e) => setNewCardIcon(e.target.value)}
                    className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs outline-none cursor-pointer"
                  >
                    {VALID_ICONS.map(i => (
                      <option key={i} value={i}>{i}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[9px] font-black text-slate-400 uppercase mb-1">Brief Description *</label>
                <textarea
                  required
                  rows={2}
                  value={newCardDesc}
                  onChange={(e) => setNewCardDesc(e.target.value)}
                  placeholder="Summarize the value this card is showing. Keep it around 15 words."
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-205 focus:border-teal-500 rounded-lg text-xs outline-none resize-none font-semibold leading-normal"
                />
              </div>

              <div className="flex gap-2 justify-end">
                {editingCardId && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingCardId(null);
                      setNewCardTitle('');
                      setNewCardDesc('');
                      setNewCardIcon('BookOpen');
                    }}
                    className="px-3 py-1.5 bg-white border border-slate-200 text-slate-500 hover:text-slate-800 rounded-lg text-xs font-bold cursor-pointer"
                  >
                    Cancel
                  </button>
                )}
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-indigo-650 hover:bg-indigo-700 active:scale-95 text-white font-bold text-xs rounded-lg transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  {editingCardId ? "Modify Card" : "Add Card"}
                </button>
              </div>
            </form>
          </div>

          {/* B. Gallery Image Upload */}
          <div className="bg-white p-7 rounded-3xl border border-slate-150 shadow-sm relative" id="photo-config-module">
            <h4 className="font-extrabold text-slate-900 text-sm mb-1">Campus Life Gallery Photos</h4>
            <p className="text-[10px] text-slate-400 font-semibold mb-5 pl-0.5">Insert live images with web URLs to show photos of the school.</p>

            {/* Picture Items */}
            <div className="grid grid-cols-1 gap-3.5 mb-6 max-h-56 overflow-y-auto pr-1 border border-slate-100 rounded-xl p-3 bg-slate-50/50">
              {pictures.length === 0 ? (
                <p className="text-center py-6 text-slate-400 text-xs font-bold">No active gallery pictures found.</p>
              ) : (
                pictures.map(p => (
                  <div key={p.id} className="p-2 border border-slate-100 bg-white rounded-xl flex items-center gap-3">
                    <div className="w-14 h-10 rounded-lg overflow-hidden bg-slate-100 border shrink-0">
                      <img src={p.url} alt={p.caption} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0 pr-1 text-left">
                      <p className="text-[11px] text-slate-800 font-bold truncate leading-none">{p.caption}</p>
                      <p className="text-[9px] text-slate-400 truncate mt-1 leading-none">{p.url}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeletePicture(p.id)}
                      className="p-1 px-1.5 hover:bg-rose-50 border border-transparent hover:border-rose-150 text-rose-600 rounded-md cursor-pointer transition-colors shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Quick Upload Form */}
            <form onSubmit={handleAddPicture} className="p-4 bg-slate-50 border border-slate-100 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[9px] uppercase font-black text-indigo-600 tracking-wider flex items-center gap-1">
                  <ImageIcon className="w-3.5 h-3.5" /> Link Photo
                </span>
                
                {/* Device upload label trigger */}
                <label className="text-[9.5px] font-black text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-2 py-1 rounded border border-indigo-150 transition-all cursor-pointer flex items-center gap-1 select-none">
                  <Upload className="w-3 h-3 text-indigo-600" /> Choose File from Device
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files ? e.target.files[0] : null;
                      handleDeviceImageUpload(file, 'gallery');
                    }}
                  />
                </label>
              </div>

              {compressingImage && (
                <div className="p-2 text-center text-[10px] font-bold text-indigo-650 animate-pulse bg-indigo-50 border border-indigo-100 rounded-lg animate-bounce">
                  Processing image, please wait...
                </div>
              )}

              {newPicUrl && (
                <div className="p-2 border border-slate-150 rounded-xl bg-white flex items-center gap-2">
                  <div className="w-10 h-7 rounded bg-slate-100 overflow-hidden border shrink-0">
                    <img src={newPicUrl} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[9px] font-black text-emerald-600 uppercase">Image Loaded</p>
                    <p className="text-[8.5px] text-slate-400 truncate font-mono">{newPicUrl.substring(0, 50)}...</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setNewPicUrl('')}
                    className="p-1 px-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded text-[9.5px] font-bold"
                  >
                    Clear
                  </button>
                </div>
              )}

              <div>
                <label className="block text-[9px] font-black text-slate-400 uppercase mb-1">Image URL (or upload from device above) *</label>
                <input
                  type="text"
                  required
                  value={newPicUrl}
                  onChange={(e) => setNewPicUrl(e.target.value)}
                  placeholder="https://images.unsplash.com/photo-... ama Base64"
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-200 focus:border-teal-500 rounded-lg text-xs outline-none"
                />
              </div>

              <div>
                <label className="block text-[9px] font-black text-slate-400 uppercase mb-1">Picture Caption *</label>
                <input
                  type="text"
                  required
                  value={newPicCaption}
                  onChange={(e) => setNewPicCaption(e.target.value)}
                  placeholder="e.g. Traditional school recitation block"
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-201 focus:border-teal-500 rounded-lg text-xs outline-none font-semibold"
                />
              </div>

              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-indigo-650 hover:bg-indigo-700 active:scale-95 text-white font-bold text-xs rounded-lg transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  Add to Gallery
                </button>
              </div>
            </form>
          </div>

          {/* C. Hero Rotating Slideshow Manager */}
          <div className="bg-white p-7 rounded-3xl border border-slate-150 shadow-sm relative" id="hero-slideshow-config-module">
            <h4 className="font-extrabold text-slate-900 text-sm mb-1">Hero Slideshow (Sawirrada Is-bedbeddela)</h4>
            <p className="text-[10px] text-slate-400 font-semibold mb-5 pl-0.5">La soco slide-yada is-bedbeddela ee masraxa ugu sareeya ee bogga hore ee dugsiga.</p>

            {/* Slide list */}
            <div className="grid grid-cols-1 gap-3.5 mb-6 max-h-56 overflow-y-auto pr-1 border border-slate-100 rounded-xl p-3 bg-slate-50/50">
              {heroSlides.length === 0 ? (
                <div className="p-4 text-center">
                  <p className="text-slate-400 text-xs font-bold mb-1">Ma jiraan slide-yo gooni ah oo loo habeeyay.</p>
                  <p className="text-[9px] text-slate-450 font-semibold">Boggu wuxuu si otomaatig ah u adeegsanayaa sawirrada asalka ah ee dugsiga.</p>
                </div>
              ) : (
                heroSlides.map(s => (
                  <div key={s.id} className="p-2 border border-slate-100 bg-white rounded-xl flex items-center gap-3">
                    <div className="w-14 h-10 rounded-lg overflow-hidden bg-slate-100 border shrink-0">
                      <img src={s.url} alt={s.caption} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0 pr-1 text-left">
                      <p className="text-[11px] text-slate-800 font-bold truncate leading-none">{s.caption}</p>
                      <p className="text-[9px] text-slate-400 truncate mt-1 leading-none">{s.url}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteHeroSlide(s.id)}
                      className="p-1 px-1.5 hover:bg-rose-50 border border-transparent hover:border-rose-150 text-rose-600 rounded-md cursor-pointer transition-colors shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Quick slide additions */}
            <form onSubmit={handleAddHeroSlide} className="p-4 bg-slate-50 border border-slate-100 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[9px] uppercase font-black text-emerald-600 tracking-wider flex items-center gap-1">
                  <ImageIcon className="w-3.5 h-3.5" /> Geli Sawir Cusub
                </span>

                {/* Device slide upload trigger */}
                <label className="text-[9.5px] font-black text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2 py-1 rounded border border-emerald-150 transition-all cursor-pointer flex items-center gap-1 select-none">
                  <Upload className="w-3 h-3 text-emerald-600" /> Choose File from Device
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files ? e.target.files[0] : null;
                      handleDeviceImageUpload(file, 'hero');
                    }}
                  />
                </label>
              </div>

              {compressingImage && (
                <div className="p-2 text-center text-[10px] font-bold text-emerald-650 animate-pulse bg-emerald-50 border border-emerald-100 rounded-lg animate-bounce">
                  Processing slide, please wait...
                </div>
              )}

              {newSlideUrl && (
                <div className="p-2 border border-slate-150 rounded-xl bg-white flex items-center gap-2">
                  <div className="w-10 h-7 rounded bg-slate-100 overflow-hidden border shrink-0">
                    <img src={newSlideUrl} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[9px] font-black text-emerald-600 uppercase">Slide Image Loaded</p>
                    <p className="text-[8.5px] text-slate-400 truncate font-mono">{newSlideUrl.substring(0, 50)}...</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setNewSlideUrl('')}
                    className="p-1 px-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded text-[9.5px] font-bold"
                  >
                    Clear
                  </button>
                </div>
              )}

              <div>
                <label className="block text-[9px] font-black text-slate-400 uppercase mb-1">Sawirka URL (or upload from device above) *</label>
                <input
                  type="text"
                  required
                  value={newSlideUrl}
                  onChange={(e) => setNewSlideUrl(e.target.value)}
                  placeholder="https://images.unsplash.com/... ama Base64"
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-200 focus:border-teal-500 rounded-lg text-xs outline-none font-semibold"
                />
              </div>

              <div>
                <label className="block text-[9px] font-black text-slate-400 uppercase mb-1">Faahfaahinta / Caption *</label>
                <input
                  type="text"
                  required
                  value={newSlideCaption}
                  onChange={(e) => setNewSlideCaption(e.target.value)}
                  placeholder="t.g. Ardayda fasalka dhexdiisa ku baranayso Qur'aanka."
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-200 focus:border-teal-500 rounded-lg text-xs outline-none font-semibold"
                />
              </div>

              <div className="pt-1.5">
                <button
                  type="submit"
                  className="w-full py-2 px-4 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  Ku dar Slideshow-ga
                </button>
              </div>
            </form>
          </div>

        </div>

      </div>

      {/* ----------------- INBOX & MESSAGES SECTION ----------------- */}
      <div className="bg-white p-7 rounded-3xl border border-slate-100 shadow-sm relative overflow-hidden mt-8" id="landing-portal-messages">
        <div className="absolute top-0 inset-x-0 h-1.5 bg-[#1e5ee6]" />
        
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-5 mb-5">
          <div className="flex items-center gap-2.5">
            <span className="p-2 bg-blue-50 text-[#1e5ee6] rounded-xl">
              <MessageSquare className="w-5 h-5" />
            </span>
            <div>
              <h4 className="font-extrabold text-slate-900 text-sm">Public Contact Inbox Messages</h4>
              <p className="text-[10px] text-slate-400 mt-0.5 font-semibold">Read inquiries and registrations submitted from the school landing page.</p>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-2.5 justify-start lg:justify-end">
            <span className="px-2.5 py-1 bg-red-100 text-red-700 text-[10px] font-black rounded-full uppercase tracking-wider">
              {unreadCount} Unread
            </span>
            <span className="px-2.5 py-1 bg-slate-100 text-slate-600 text-[10px] font-black rounded-full uppercase tracking-wider">
              {messages.length} Total
            </span>
            
            {messages.length > 0 && (
              <div className="flex items-center gap-2 border-l border-slate-200 pl-2.5 ml-1">
                <button
                  type="button"
                  onClick={handleExportCSV}
                  className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-150 rounded-xl text-[10px] font-extrabold uppercase tracking-wider flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Download all messages in Excel-ready CSV format"
                >
                  <Download className="w-3.5 h-3.5" />
                  Excel CSV
                </button>
                <button
                  type="button"
                  onClick={() => setPrintTarget('all')}
                  className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-150 rounded-xl text-[10px] font-extrabold uppercase tracking-wider flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Print summary list of all current messages"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Print List
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Dynamic Anti-accumulation Warning Card */}
        <div className="bg-emerald-50/70 border border-emerald-200/80 p-4 rounded-2xl flex items-start gap-3.5 mb-6 text-slate-700">
          <span className="p-1.5 bg-emerald-100 rounded-lg text-emerald-800 font-bold shrink-0 text-xs">💬</span>
          <div>
            <h5 className="font-extrabold text-xs text-emerald-950 leading-none mb-1">Public Visitor Message Box Active with Auto-Pruning</h5>
            <p className="text-[10px] font-semibold text-slate-600 leading-relaxed">
              We have integrated a secure visitor contact form on the responsive public school landing page. To completely prevent backend server overloading and database clutter, an automated anti-accumulation system is active: **all incoming messages auto-expire and tirtirmayaan exactly 24 hours (1 day) after submission.**
            </p>
          </div>
        </div>

        {messages.length === 0 ? (
          <div className="py-12 text-center text-slate-400 max-w-sm mx-auto">
            <div className="w-12 h-12 bg-slate-50 text-slate-350 rounded-2xl flex items-center justify-center mx-auto mb-3 border border-slate-100">
              <Inbox className="w-6 h-6" />
            </div>
            <p className="text-xs font-black">No messages received yet.</p>
            <p className="text-[10px] mt-1 text-slate-400 font-semibold leading-normal">Recent submissions will appear here. No action is required; expired entries prune automatically.</p>
          </div>
        ) : (
          <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
            {messages.map((msg) => {
              // Calculate time remaining until 24 hours expiry
              const msgTime = new Date(msg.timestamp).getTime();
              const diffMs = (msgTime + 24 * 60 * 60 * 1000) - Date.now();
              const minutesLeft = Math.max(0, Math.floor(diffMs / (1000 * 60)));
              const hoursLeft = Math.floor(minutesLeft / 60);
              const remainingMinutesLabel = minutesLeft % 60;
              const countdownText = minutesLeft > 0 
                ? `Expires in: ${hoursLeft}h ${remainingMinutesLabel}m`
                : "Expiring soon";

              return (
                <div 
                  key={msg.id} 
                  className={`p-5 rounded-2xl border transition-all flex flex-col lg:flex-row lg:items-start justify-between gap-4 ${
                    !msg.read 
                      ? 'bg-blue-50/20 border-blue-150 shadow-sm' 
                      : 'bg-white border-slate-100 hover:border-slate-200'
                  }`}
                >
                  <div className="space-y-2 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-slate-900 text-xs sm:text-sm">{msg.name}</span>
                      
                      {msg.phone && (
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-750 text-[10px] font-bold rounded-lg border border-slate-200 flex items-center gap-1">
                          <Phone className="w-3 h-3 text-[#ca9258]" /> {msg.phone}
                        </span>
                      )}

                      {msg.email && (
                        <a 
                          href={`mailto:${msg.email}`} 
                          className="text-[10px] font-mono text-slate-400 font-bold hover:text-[#1e5ee6] hover:underline flex items-center gap-1"
                        >
                          <Mail className="w-3 h-3" /> {msg.email}
                        </a>
                      )}

                      {!msg.read && (
                        <span className="px-1.5 py-0.5 bg-rose-100 text-rose-700 text-[8px] font-black uppercase tracking-wider rounded-md animate-pulse">
                          New Message
                        </span>
                      )}

                      <span className="px-2 py-0.5 bg-amber-50 text-amber-700 text-[9px] font-black uppercase tracking-wider rounded-lg border border-amber-100 flex items-center gap-1 font-mono">
                        <Clock className="w-2.5 h-2.5" /> {countdownText}
                      </span>
                    </div>

                    <p className="text-slate-600 text-xs leading-relaxed font-semibold break-words whitespace-pre-wrap">
                      {msg.message}
                    </p>

                    <p className="text-[9px] font-mono text-slate-450 font-bold">
                      Submitted: {new Date(msg.timestamp).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 self-end lg:self-start shrink-0">
                    <button
                      type="button"
                      onClick={() => handleToggleRead(msg.id)}
                      className={`px-3 py-1.5 text-[9px] font-black uppercase tracking-wider rounded-lg border transition-all cursor-pointer flex items-center gap-1.5 ${
                        msg.read
                          ? 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-500'
                          : 'bg-[#1e5ee6] hover:bg-blue-700 border-blue-500 text-white shadow-sm'
                      }`}
                    >
                      {msg.read ? (
                        <>Mark Unread</>
                      ) : (
                        <>
                          <Check className="w-3 h-3" /> Mark Read
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDownloadTXT(msg)}
                      className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-50 border border-slate-150 rounded-lg transition-colors cursor-pointer"
                      title="Download inquiry as separate TXT file"
                    >
                      <Download className="w-4 h-4 text-slate-500" />
                    </button>

                    <button
                      type="button"
                      onClick={() => setPrintTarget(msg)}
                      className="p-1.5 text-slate-450 hover:text-blue-700 hover:bg-blue-50 border border-slate-150 rounded-lg transition-colors cursor-pointer"
                      title="Print voucher ticket slip"
                    >
                      <Printer className="w-4 h-4 text-blue-600" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteMessage(msg.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-605 hover:bg-rose-50 border border-rose-150 rounded-lg transition-colors cursor-pointer"
                      title="Delete message"
                    >
                      <Trash2 className="w-4 h-4 text-rose-600" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Reusable Custom Confirmation Modal to bypass iframe window.confirm block */}
      {confirmModal && confirmModal.isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs text-slate-800" id="landing-custom-confirm-modal">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            className="w-full max-w-sm bg-white rounded-3xl border border-slate-150 shadow-2xl overflow-hidden"
          >
            {/* Modal colored header bar */}
            <div className={`h-1.5 w-full ${
              confirmModal.accentColor === 'rose' ? 'bg-rose-500' :
              confirmModal.accentColor === 'amber' ? 'bg-amber-500' :
              confirmModal.accentColor === 'teal' ? 'bg-teal-500' :
              'bg-indigo-600'
            }`} />

            <div className="p-5">
              <div className="flex items-start gap-4">
                <div className={`p-2.5 rounded-xl shrink-0 ${
                  confirmModal.accentColor === 'rose' ? 'bg-rose-50 text-rose-600 border border-rose-100' :
                  confirmModal.accentColor === 'amber' ? 'bg-amber-50 text-amber-600 border border-amber-100' :
                  confirmModal.accentColor === 'teal' ? 'bg-teal-50 text-teal-600 border border-teal-100' :
                  'bg-indigo-50 text-indigo-600 border border-indigo-100'
                }`}>
                  <span className="text-sm font-black leading-none flex items-center justify-center w-5 h-5">
                    {confirmModal.accentColor === 'rose' ? '🗑️' : confirmModal.accentColor === 'amber' ? '⚠️' : '❓'}
                  </span>
                </div>
                
                <div className="space-y-1 flex-1">
                  <h4 className="text-slate-900 font-extrabold text-xs sm:text-sm leading-snug">
                    {confirmModal.title}
                  </h4>
                  <p className="text-slate-500 text-[11px] leading-relaxed font-semibold">
                    {confirmModal.message}
                  </p>
                </div>
              </div>

              {/* Actions Area */}
              <div className="flex items-center justify-end gap-2 mt-5 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setConfirmModal(null)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-150 text-slate-700 font-bold text-[10px] tracking-wider uppercase rounded-xl cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmModal.onConfirm}
                  className={`px-3.5 py-1.5 text-white font-extrabold text-[10px] tracking-wider uppercase rounded-xl cursor-pointer transition-all shadow-md ${
                    confirmModal.accentColor === 'rose' ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/10' :
                    confirmModal.accentColor === 'amber' ? 'bg-amber-600 hover:bg-amber-750 shadow-amber-600/10' :
                    confirmModal.accentColor === 'teal' ? 'bg-teal-600 hover:bg-teal-700 shadow-teal-600/10' :
                    'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/15'
                  }`}
                >
                  Verify & Action
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Dynamic Printing & Export Document Modal overlay (supports sandbox print and visibility hiding overrides) */}
      {printTarget && (
        <div className="fixed inset-0 z-[99999] flex flex-col md:items-center md:justify-center p-4 bg-slate-900/80 backdrop-blur-md overflow-y-auto no-print">
          <style dangerouslySetInnerHTML={{__html: `
            @media print {
              /* Completely blank out every single screen element */
              body * {
                visibility: hidden !important;
                background-color: transparent !important;
              }
              /* Force the specific print layout template to render on the A4 canvas */
              #printable-overlay-area, #printable-overlay-area * {
                visibility: visible !important;
              }
              #printable-overlay-area {
                position: absolute !important;
                left: 0 !important;
                top: 0 !important;
                width: 100% !important;
                background: white !important;
                color: black !important;
                font-family: monospace !important;
              }
              /* Hide modal actions when active in print spool */
              .no-print {
                display: none !important;
              }
            }
          `}} />

          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col my-auto transition-all text-slate-850"
          >
            {/* Modal header row */}
            <div className="p-5 bg-slate-50 border-b border-slate-100 flex items-center justify-between no-print">
              <div className="flex items-center gap-2">
                <span className="p-2 bg-blue-100 text-[#1e5ee6] rounded-xl">
                  <Printer className="w-4 h-4" />
                </span>
                <div>
                  <h4 className="text-sm font-black text-slate-805 uppercase tracking-tight">Print Layout Preview</h4>
                  <p className="text-[10px] text-slate-400 font-semibold">Verify A4 spacing and visual margin metrics before compiling print</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPrintTarget(null)}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-xs font-bold transition-all cursor-pointer"
              >
                Close Preview
              </button>
            </div>

            {/* Document body area */}
            <div className="p-6 md:p-8 overflow-y-auto max-h-[60vh] bg-slate-100/50 flex-1 flex justify-center">
              <div 
                id="printable-overlay-area" 
                className="w-full max-w-xl bg-white border border-slate-300 p-6 md:p-8 text-black font-sans shadow-sm rounded-xl text-left"
              >
                {printTarget === 'all' ? (
                  <div className="space-y-6">
                    <div className="text-center pb-4 border-b-2 border-dashed border-slate-900">
                      <h2 className="text-md font-black uppercase tracking-wider">DUGSIGA SUBUC & ACADEMY</h2>
                      <p className="text-[10px] uppercase tracking-widest font-bold text-slate-500 mt-0.5">PUBLIC INQUIRIES & MESSAGING AUDIT LIST</p>
                      <p className="text-[9px] font-mono text-slate-400 mt-2 font-bold">Report Generated: {new Date().toLocaleString()}</p>
                    </div>
                    
                    <table className="w-full border-collapse text-left text-[10px]">
                      <thead>
                        <tr className="border-b border-slate-800 font-extrabold text-slate-700">
                          <th className="py-2 pr-2">Magaca (Name)</th>
                          <th className="py-2 pr-2">Taleefanka (Phone)</th>
                          <th className="py-2 pr-2">Taariikhda (Submitted)</th>
                          <th className="py-2">Farriinta (Inquiry request)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {messages.map((m) => (
                          <tr key={m.id} className="align-top">
                            <td className="py-2 pr-2 font-bold text-slate-900">{m.name}</td>
                            <td className="py-2 pr-2 font-mono text-slate-800 font-semibold">{m.phone || 'N/A'}</td>
                            <td className="py-2 pr-2 font-mono text-slate-450 text-[9px]">{new Date(m.timestamp).toLocaleDateString()}</td>
                            <td className="py-2 text-slate-755 italic">"{m.message}"</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    <div className="pt-6 mt-6 border-t-2 border-dashed border-slate-900 text-center text-[9px] text-slate-400 font-extrabold">
                      Total Active Messages: {messages.length} | Dhamaan fariimaha waxaa la tirtiraa mar walba 24 saac ka dib.
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="text-center pb-4 border-b-2 border-dashed border-slate-900">
                      <h2 className="text-lg font-black uppercase tracking-wider text-slate-900 leading-none">DUGSIGA SUBUC</h2>
                      <p className="text-[9px] uppercase tracking-widest font-extrabold text-slate-500 mt-1">VISITOR INQUIRY TICKET SLIP</p>
                      <p className="text-[9px] font-mono text-slate-400 mt-1.5 font-bold">VOUCHER ID: {printTarget.id}</p>
                    </div>

                    <div className="space-y-3.5 text-xs text-slate-800">
                      <div className="flex justify-between border-b border-slate-100 pb-1.5">
                        <span className="font-bold text-slate-400 uppercase tracking-wider text-[9px]">Magaca Booqandaha:</span>
                        <span className="font-black text-slate-900 text-sm">{printTarget.name}</span>
                      </div>
                      <div className="flex justify-between border-b border-slate-100 pb-1.5">
                        <span className="font-bold text-slate-400 uppercase tracking-wider text-[9px]">Taleefanka (Phone):</span>
                        <span className="font-mono text-slate-900 font-extrabold text-sm">{printTarget.phone || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between border-b border-slate-100 pb-1.5">
                        <span className="font-bold text-slate-400 uppercase tracking-wider text-[9px]">Taariikhda la xiriiray:</span>
                        <span className="font-mono text-slate-500 font-bold">{new Date(printTarget.timestamp).toLocaleString()}</span>
                      </div>
                      {printTarget.email && (
                        <div className="flex justify-between border-b border-slate-100 pb-1.5">
                          <span className="font-bold text-slate-400 uppercase tracking-wider text-[9px]">Email:</span>
                          <span className="font-mono text-slate-700 font-bold">{printTarget.email}</span>
                        </div>
                      )}
                      
                      <div className="pt-2">
                        <span className="font-extrabold block text-slate-450 uppercase tracking-wider text-[9px] mb-1.5">Farriinta uu ka tagay (Message):</span>
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-150 leading-relaxed italic text-slate-800 text-[11px] font-semibold break-words">
                          "{printTarget.message}"
                        </div>
                      </div>
                    </div>

                    <div className="pt-6 mt-6 border-t-2 border-dashed border-slate-900 text-center text-[9px] text-slate-450 font-black leading-relaxed">
                      Waa la tirtiraa fariintan 24 saac gudahood si keydku u ahaado mid madhan.
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Modal actions footer bar */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3 no-print">
              <button
                type="button"
                onClick={() => setPrintTarget(null)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-750 font-bold text-xs rounded-xl transition-all cursor-pointer"
              >
                Cancel
              </button>
              
              {printTarget !== 'all' && (
                <button
                  type="button"
                  onClick={() => handleDownloadTXT(printTarget)}
                  className="px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-150 font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center gap-1"
                >
                  <Download className="w-4 h-4" /> Export TXT Slip
                </button>
              )}

              <button
                type="button"
                 onClick={() => { window.focus(); window.print(); }}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-blue-500/10 transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Printer className="w-4 h-4" /> Trigger System Print
              </button>
            </div>
          </motion.div>
        </div>
      )}

    </div>
  );
}
