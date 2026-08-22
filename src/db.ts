/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { DatabaseState, Teacher, Student, DailyProgress, BillingRecord, Exam, MoneyTransferRecord, TeacherAttendanceRecord, SchoolLocationSettings, LandingPageSettings, Invoice, XawaaladaAccount, XawaaladaTransaction } from './types';

/// Let's create some beautiful, realistic seed data
const DEFAULT_TEACHERS: Teacher[] = [];

const DEFAULT_STUDENTS: Student[] = [];

// Helper to calculate relative date strings
const getDateOffset = (offsetDays: number): string => {
  const d = new Date();
  d.setDate(d.getDate() - offsetDays);
  return d.toISOString().split('T')[0];
};

const DEFAULT_PROGRESS: DailyProgress[] = [];

const DEFAULT_BILLING: BillingRecord[] = [];

const DEFAULT_EXAMS: Exam[] = [];

const DEFAULT_MONEY_TRANSFERS: MoneyTransferRecord[] = [];

export const DEFAULT_XAWAALADA_ACCOUNTS: XawaaladaAccount[] = [
  {
    id: "acc-1",
    name: "Higgaadda",
    accountNumber: "516963",
    openingBalance: 39.4,
    notes: "akoonka higgaadda",
    createdAt: new Date().toISOString()
  },
  {
    id: "acc-2",
    name: "Qur,aan",
    accountNumber: "516962",
    openingBalance: 27.4,
    notes: "akoonka qur'aanka",
    createdAt: new Date().toISOString()
  },
  {
    id: "acc-3",
    name: "Merchant",
    accountNumber: "328958",
    openingBalance: 244.34,
    notes: "akoonka wayn ee merchantga",
    createdAt: new Date().toISOString()
  },
  {
    id: "acc-4",
    name: "Account 4 (Cash Box / Sanduuqa)",
    accountNumber: "CASH-MAIN",
    openingBalance: 1500,
    notes: "Physical cash on hand at office counter",
    createdAt: new Date().toISOString()
  }
];

export const DEFAULT_XAWAALADA_TRANSACTIONS: XawaaladaTransaction[] = [
  {
    id: "TXN-101",
    accountId: "acc-1",
    type: "in",
    amount: 1200,
    clientName: "Cabdi Xasan Maxamed",
    clientPhone: "0615112233",
    referenceNo: "REF-501",
    description: "Deposit for school tuition fee transfer",
    date: new Date().toISOString().split('T')[0],
    time: "09:30",
    createdBy: "yaxyecabdisalanmohamed1234@gmail.com",
    createdAt: new Date().toISOString()
  },
  {
    id: "TXN-102",
    accountId: "acc-1",
    type: "out",
    amount: 450,
    clientName: "Aamina Cali Jaamac",
    clientPhone: "0615445566",
    referenceNo: "REF-502",
    description: "Payout to recipient family in Mogadishu",
    date: new Date().toISOString().split('T')[0],
    time: "10:15",
    createdBy: "yaxyecabdisalanmohamed1234@gmail.com",
    createdAt: new Date().toISOString()
  },
  {
    id: "TXN-103",
    accountId: "acc-2",
    type: "in",
    amount: 2500,
    clientName: "Faarax Cumar Cismaan",
    clientPhone: "0615778899",
    referenceNo: "REF-503",
    description: "Dahabshiil wire transfer deposit from Hargeisa",
    date: new Date().toISOString().split('T')[0],
    time: "11:00",
    createdBy: "yaxyecabdisalanmohamed1234@gmail.com",
    createdAt: new Date().toISOString()
  },
  {
    id: "TXN-104",
    accountId: "acc-2",
    type: "out",
    amount: 1000,
    clientName: "Xaawo Maxamuud Saacid",
    clientPhone: "0615990011",
    referenceNo: "REF-504",
    description: "Teacher monthly salary distribution payout",
    date: new Date().toISOString().split('T')[0],
    time: "11:45",
    createdBy: "yaxyecabdisalanmohamed1234@gmail.com",
    createdAt: new Date().toISOString()
  },
  {
    id: "TXN-105",
    accountId: "acc-3",
    type: "in",
    amount: 800,
    clientName: "Jaamac Axmed Warsame",
    clientPhone: "0615223344",
    referenceNo: "REF-505",
    description: "Premier Bank online deposit",
    date: new Date().toISOString().split('T')[0],
    time: "14:20",
    createdBy: "yaxyecabdisalanmohamed1234@gmail.com",
    createdAt: new Date().toISOString()
  }
];

const LOCAL_STORAGE_KEY = 'banuu_jalaal_db';

const DEFAULT_SUBMISSIONS: any[] = [];

export const DEFAULT_INVOICE_ACCOUNTS_NOTE = "Account Numbers: 516963 Higgaad and 516962 Qur'aan";

export const DEFAULT_LANDING_SETTINGS: LandingPageSettings = {
  schoolName: "Dugsiga Subuc",
  logoUrl: "/logo.png",
  heroTitle: "Ku Korinta Maskaxda Nuurka Qur'aanka Kariimka ah",
  heroSub: "Ku soo dhowow Dugsiga Subuc & Akadeemiyada Tajweedka. Waxaan dhiirigelinaynaa xifdin tayo sare leh, dabeecad suuban (Dhaqan), iyo akhris aqoon ku dhabaysan.",
  aboutText: "Dugsiga Subuc waxaa loo aas-aasay inuu u adeego bulshada ardayda ah isagoo siinaya waxbarasho Qur'aan oo heerkeedu sarreeyo. Warbixinnada maalinlaha ah, xiriirka waalidiinta, iyo nidaamka joogitaanka ardayda waxay xaqiijinayaan hufnaan buuxda.",
  whatWeDo: "Waxaan bixinaa dariiqooyin waxbarasho oo dhammaystiran oo ay hagayaan macallimiin khubaro ah si loo kobciyo qiyamka Islaamka, xifdinta saxda ah, iyo xeerarka Tajwiidka.",
  contactEmail: "info@dugsigasubuc.edu",
  contactPhone: "0904819955",
  contactAddress: "Somalia, Puntland, Garowe, aga gaarka jaamacadda frontier",
  cards: [
    {
      id: "C-1",
      title: "Hifdiga & Xifdinta",
      description: "Hagid talaabo-talaabo ah oo adeegsanaysa hababka Subucda ee classical-ka ah si loo dhammaystiro xifdiga.",
      iconName: "BookOpen"
    },
    {
      id: "C-2",
      title: "Tajwiid la Aqoonsan yahay",
      description: "Manhaj diiradda saaraya ku dhawaaqista saxda ah ee xarfaha, dhibcaha ka soo baxa dhuunta iyo xeerarka dheeraynta.",
      iconName: "Award"
    },
    {
      id: "C-3",
      title: "Dhisidda Dabeecadda",
      description: "Ku beeridda dhaqanka Islaamka ee suuban, asluubta (Dhaqan), nadaafadda, iyo mas'uuliyadda bulshada maalin kasta.",
      iconName: "Heart"
    },
    {
      id: "C-4",
      title: "Hufnaanta Waalidiinta",
      description: "La socodka tooska ah ee warbixinnada la daabici karo, rasiidka lacag bixinta, iyo warbixinnada maalinlaha ah ee macallimiinta.",
      iconName: "ShieldCheck"
    }
  ],
  pictures: [
    {
      id: "P-1",
      url: "https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=800&q=80",
      caption: "Kulamada waxbarasho ee is-dhexgalka ah iyo xoogga saarista kuceliska"
    },
    {
      id: "P-2",
      url: "https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&w=800&q=80",
      caption: "Xarun agab gaar ah u leh iyo maktabad tixraac"
    },
    {
      id: "P-3",
      url: "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&w=800&q=80",
      caption: "Qalin-jebinta sannadlaha ah ee lagu sharfayo ardayda dhammaysata xifdiga"
    }
  ],
  heroBadge: "Xoojinta Barashada Qur'aanka ee Casriga ah",
  showSpiritualWisdom: true,
  ayatArabic: "إِنَّ هَٰذَا الْقُرْآنَ يَهْدِي لِلَّتِي هِيَ أَقْوَمُ",
  ayatSomali: "Xaqiiqdii, Qur'aankan wuxuu ku hidaynayaa jidka ugu toosan uguna wanaagsan.",
  ayatSource: "Suurat Al-Israa: 9",
  hadithArabic: "خَيْرُكُمْ مَنْ تَعَلَّمَ الْقُرْآنَ وَعَلَّمَهُ",
  hadithSomali: "Kan idiinku khayrka badan waa kan barta Qur'aanka kariimka ah, dadka kalena bara.",
  hadithSource: "Saxiixul Al-Bukhari",
  hikmahArabic: "الصَّاحِبُ بِالْقُرْآنِ لَا يَشْقَىٰ أَبَدًا",
  hikmahSomali: "Wehelka Qur'aanku waligii ma dhibaatoodo, aduun iyo aakhiraba waa mid ay weheliso barako iyo xasillooni qalbi.",
  hikmahSource: "Xikmadii Salafkii",
  heroSlides: [
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
  ],
  regStepTitle: "Tallaabooyinka Diiwaangelinta",
  regStepText: "Si loo ilaaliyo amniga loonana hortago farriimaha spam-ka, waxaan u samaynaa diiwaangelinta cusub si toos ah fasallada dhexdiisa si aan ilmaha u qiimayno.",
  regStep1Title: "Qiimaynta Heerka Akhriska",
  regStep1Text: "Keen ilmahaaga xarunta si loo qiimeeyo heerka xifdiga Qur'aanka iyo Tajwiidka.",
  regStep2Title: "Hubinta Khidmadda & Aqoonsiga",
  regStep2Text: "Kala saar arrimaha diiwaangelinta, harna qaado kaarka aqoonsiga ee ardayga u gaarka ah.",
  regStep3Title: "Bilaabista Casharada",
  regStep3Text: "Ardayga wuxuu si toos ah ugu birayaa fasalkiisa isagoo raacaya jadwalkiisa u qorshaysan. Su'aalaha kale kala xiriir call: 0904819955.",
  regOfficeHours: "Sabti - Khamiis: 7:30 subax - 5:30 galabnimo"
};

export function sanitizeLocalDatabase(parsed: DatabaseState): DatabaseState {
  if (parsed && parsed.teachers && Array.isArray(parsed.teachers)) {
    let corrected = false;
    parsed.teachers = parsed.teachers.map((t: any) => {
      if (t) {
        if (!t.registrationDate) {
          t.registrationDate = '2026-05-15';
        }
        if (t.username === 'caac' && t.id === 'T-08') {
          corrected = true;
          return { ...t, id: 'T-10' };
        }
      }
      return t;
    });
    if (corrected) {
      console.log('[Local Sanitizer] Corrected teacher "caac" duplicate ID from T-08 to T-10 in client.');
    }
  }

  if (parsed && parsed.students && Array.isArray(parsed.students)) {
    parsed.students.forEach((s: any) => {
      if (s && !s.registrationDate) {
        s.registrationDate = '2026-05-15';
      }
    });
  }

  // Auto-prune system notifications older than 24 hours (86,400,000 ms) to keep the db clean every day
  if (parsed && parsed.notifications && Array.isArray(parsed.notifications)) {
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    const initialCount = parsed.notifications.length;
    parsed.notifications = parsed.notifications.filter((n: any) => {
      if (!n || !n.timestamp) return false;
      try {
        const time = new Date(n.timestamp).getTime();
        return !isNaN(time) && time > oneDayAgo;
      } catch (e) {
        return false;
      }
    });
    if (parsed.notifications.length !== initialCount) {
      console.log(`[Local Sanitizer] Automatically pruned ${initialCount - parsed.notifications.length} notifications older than 24 hours.`);
    }
  }

  // Deduplicate and sanitize teacherAttendance records so each teacher has only one clean record per date
  if (parsed && parsed.teacherAttendance && Array.isArray(parsed.teacherAttendance)) {
    const seenTeacherDates = new Set<string>();
    const sanitizedTeacherAtt: any[] = [];
    parsed.teacherAttendance.forEach((rec: any) => {
      if (rec && rec.teacherId && rec.date) {
        const key = `${rec.teacherId}_${rec.date}`;
        if (!seenTeacherDates.has(key)) {
          seenTeacherDates.add(key);
          sanitizedTeacherAtt.push(rec);
        }
      }
    });
    parsed.teacherAttendance = sanitizedTeacherAtt;
  }

  // Auto-translate old Somali item descriptions dynamically and ensure account numbers exist in invoice notes
  if (parsed && parsed.invoices && Array.isArray(parsed.invoices)) {
    parsed.invoices.forEach((inv: any) => {
      if (inv && Array.isArray(inv.items)) {
        inv.items.forEach((item: any) => {
          if (item && item.description) {
            const d = item.description.trim().toLowerCase();
            if (d === 'lacagta fiiga quranka' || d === 'lacagta fiiga ee quranka' || d === "lacagta fiiga ee qur'anka" || d === 'fiiga quranka') {
              item.description = "lacagta bisha ee qur'aanka";
            } else if (d === 'lacagta fiiga higgaadda' || d === 'lacagta fiiga ee higgaadda' || d === 'lacagta fiiga ardada higgaadda' || d === 'fiiga higgaadda') {
              item.description = "lacagta bisha ee higgaadda";
            } else if (d === 'lacagta faylasha arday kasta' || d === 'faylasha lagu kaydiyo xogta ardayga' || d === 'faylasha ardayga' || d === 'faylasha' || d === 'faylalka lagu kaydiyo xogta ardayga') {
              item.description = "lacagta faylasha";
            } else if (d === 'lacagta diiwan galinta arday kasta' || d === 'lacagta diiwan-galinta arday kasta' || d === 'diiwan galinta' || d === 'diiwangelinta' || d === 'diiwan-gelinta' || d === 'diiwan galinta ardayga') {
              item.description = "lacagta diiwan galinta ardayga";
            }
          }
        });
      }

      if (inv) {
        if (!inv.notes || inv.notes.trim() === '') {
          inv.notes = DEFAULT_INVOICE_ACCOUNTS_NOTE;
        } else if (!inv.notes.includes('516963') && !inv.notes.includes('516962')) {
          inv.notes = `${inv.notes.trim()}\n${DEFAULT_INVOICE_ACCOUNTS_NOTE}`;
        }
      }
    });
  }

  // Auto-migrate old student IDs to DS001, DS002, etc. sorted by registration date
  if (parsed && parsed.students && Array.isArray(parsed.students)) {
    const hasOldIds = parsed.students.some((s: any) => s && s.id && s.id.startsWith('BJ-'));
    if (hasOldIds) {
      console.log('[Local Migration] Migrating student IDs on the fly...');
      // Sort students: ascending by registrationDate.
      // If equal, stable sort via array indices to guarantee "which one got registered first".
      const sortedStudents = [...parsed.students].sort((a: any, b: any) => {
        const dateA = a.registrationDate || '';
        const dateB = b.registrationDate || '';
        if (dateA !== dateB) {
          return dateA.localeCompare(dateB);
        }
        const indexA = parsed.students.indexOf(a);
        const indexB = parsed.students.indexOf(b);
        return indexA - indexB;
      });

      // Build ID mapping dictionary
      const idMap: Record<string, string> = {};
      sortedStudents.forEach((student: any, index: number) => {
        const oldId = student.id;
        const newId = `DS${String(index + 1).padStart(3, '0')}`;
        idMap[oldId] = newId;
        student.id = newId;
      });

      // 1. Update DailyProgress
      if (Array.isArray(parsed.progress)) {
        parsed.progress.forEach((p: any) => {
          if (p && p.studentId && idMap[p.studentId]) {
            const oldId = p.studentId;
            const newId = idMap[oldId];
            p.studentId = newId;
            if (p.id && typeof p.id === 'string') {
              p.id = p.id.replace(oldId, newId);
            }
          }
        });
      }

      // 2. Update BillingRecord
      if (Array.isArray(parsed.billing)) {
        parsed.billing.forEach((b: any) => {
          if (b && b.studentId && idMap[b.studentId]) {
            const oldId = b.studentId;
            const newId = idMap[oldId];
            b.studentId = newId;
            if (b.id && typeof b.id === 'string') {
              b.id = b.id.replace(oldId, newId);
            }
            if (b.receiptNo && typeof b.receiptNo === 'string') {
              const oldNum = oldId.replace('BJ-', '');
              const newNum = newId.replace('DS', '');
              b.receiptNo = b.receiptNo.replace(oldNum, newNum);
            }
          }
        });
      }

      // 3. Update Exam Scores
      if (Array.isArray(parsed.exams)) {
        parsed.exams.forEach((ex: any) => {
          if (ex && Array.isArray(ex.scores)) {
            ex.scores.forEach((sc: any) => {
              if (sc && sc.studentId && idMap[sc.studentId]) {
                sc.studentId = idMap[sc.studentId];
              }
            });
          }
        });
      }

      // 4. Update Invoices
      if (Array.isArray(parsed.invoices)) {
        parsed.invoices.forEach((inv: any) => {
          if (inv && inv.studentId && typeof inv.studentId === 'string') {
            Object.keys(idMap).forEach((oldId) => {
              const regex = new RegExp(oldId, 'g');
              inv.studentId = inv.studentId.replace(regex, idMap[oldId]);
            });
          }
        });
      }

      // 5. Update Teacher Submissions
      if (Array.isArray(parsed.submissions)) {
        parsed.submissions.forEach((sub: any) => {
          if (sub && Array.isArray(sub.studentsDetail)) {
            sub.studentsDetail.forEach((stud: any) => {
              if (stud && stud.studentId && idMap[stud.studentId]) {
                stud.studentId = idMap[stud.studentId];
              }
            });
          }
        });
      }

      parsed.students = sortedStudents;
      console.log('[Local Migration] Successfully migrated student IDs. Map:', idMap);
    }
  }

  // 6. Generic Sweep of any remaining old BJ- prefixes in the state to ensure DS uniformity
  if (parsed && typeof parsed === 'object') {
    const fixPrefix = (val: any): any => {
      if (typeof val === 'string') {
        return val.replace(/BJ-/g, 'DS');
      }
      return val;
    };

    if (Array.isArray(parsed.progress)) {
      parsed.progress.forEach((p: any) => {
        if (p) {
          if (p.studentId) p.studentId = fixPrefix(p.studentId);
          if (p.id) p.id = fixPrefix(p.id);
        }
      });
    }
    if (Array.isArray(parsed.billing)) {
      parsed.billing.forEach((b: any) => {
        if (b) {
          if (b.studentId) b.studentId = fixPrefix(b.studentId);
          if (b.id) b.id = fixPrefix(b.id);
        }
      });
    }
    if (Array.isArray(parsed.exams)) {
      parsed.exams.forEach((ex: any) => {
        if (ex && Array.isArray(ex.scores)) {
          ex.scores.forEach((sc: any) => {
            if (sc && sc.studentId) sc.studentId = fixPrefix(sc.studentId);
          });
        }
      });
    }
    if (Array.isArray(parsed.invoices)) {
      parsed.invoices.forEach((inv: any) => {
        if (inv) {
          if (inv.studentId) inv.studentId = fixPrefix(inv.studentId);
        }
      });
    }
    if (Array.isArray(parsed.submissions)) {
      parsed.submissions.forEach((sub: any) => {
        if (sub && Array.isArray(sub.studentsDetail)) {
          sub.studentsDetail.forEach((stud: any) => {
            if (stud && stud.studentId) stud.studentId = fixPrefix(stud.studentId);
          });
        }
      });
    }
  }

  return parsed;
}

export function getDatabase(): DatabaseState {
  try {
    const data = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!data) {
      // First initiation: Return default starting state
      const initial: DatabaseState = {
        teachers: [],
        students: [],
        progress: [],
        billing: [],
        exams: [],
        moneyTransfers: DEFAULT_MONEY_TRANSFERS,
        submissions: [],
        classes: [
          'Al-Baqarah Memorization',
          'Juz Amma Preparatory',
          'Advanced Quran Tajweed'
        ],
        notifications: [],
        schoolLocation: {
          latitude: 8.398573,
          longitude: 48.480370,
          name: "Banuu Jalaal School Campus",
          radiusMeters: 200,
          allowSimulation: false
        },
        landingPageSettings: DEFAULT_LANDING_SETTINGS,
        contactMessages: [],
        teacherAttendance: [],
        invoices: []
      };
      saveDatabase(initial);
      return initial;
    }
    const parsed = JSON.parse(data);
    if (!parsed.schoolLocation) {
      parsed.schoolLocation = {
        latitude: 8.398573,
        longitude: 48.480370,
        name: "Banuu Jalaal School Campus",
        radiusMeters: 200,
        allowSimulation: false
      };
      saveDatabase(parsed);
    } else {
      // Force correction to updated Dugsi coordinates requested by the user
      parsed.schoolLocation.latitude = 8.398573;
      parsed.schoolLocation.longitude = 48.480370;
      saveDatabase(parsed);
    }
    if (!parsed.teacherAttendance) {
      parsed.teacherAttendance = [];
      saveDatabase(parsed);
    }
    if (!parsed.landingPageSettings) {
      parsed.landingPageSettings = DEFAULT_LANDING_SETTINGS;
      saveDatabase(parsed);
    }
    if (!parsed.notifications) {
      parsed.notifications = [];
      saveDatabase(parsed);
    }
    if (!parsed.submissions) {
      parsed.submissions = [];
      saveDatabase(parsed);
    }
    if (!parsed.classes) {
      parsed.classes = [
        'Al-Baqarah Memorization',
        'Juz Amma Preparatory',
        'Advanced Quran Tajweed'
      ];
    }
    if (!parsed.exams) {
      parsed.exams = [];
      saveDatabase(parsed);
    }
    if (!parsed.moneyTransfers) {
      parsed.moneyTransfers = [...DEFAULT_MONEY_TRANSFERS];
      saveDatabase(parsed);
    }
    if (!parsed.contactMessages) {
      parsed.contactMessages = [];
      saveDatabase(parsed);
    }
    if (!parsed.invoices) {
      parsed.invoices = [];
      saveDatabase(parsed);
    }
    if (!parsed.xawaaladaAccounts || parsed.xawaaladaAccounts.length === 0) {
      parsed.xawaaladaAccounts = [...DEFAULT_XAWAALADA_ACCOUNTS];
      saveDatabase(parsed);
    }
    if (!parsed.xawaaladaTransactions) {
      parsed.xawaaladaTransactions = [...DEFAULT_XAWAALADA_TRANSACTIONS];
      saveDatabase(parsed);
    }
    return sanitizeLocalDatabase(parsed);
  } catch (e) {
    console.error("Error reading database from localStorage, loading fallback seeds", e);
    return {
      teachers: [],
      students: [],
      progress: [],
      billing: [],
      exams: [],
      moneyTransfers: DEFAULT_MONEY_TRANSFERS,
      contactMessages: [],
      classes: [
        'Al-Baqarah Memorization',
        'Juz Amma Preparatory',
        'Advanced Quran Tajweed'
      ],
      invoices: []
    };
  }
}

export function saveDatabase(db: DatabaseState): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(db));
  } catch (e) {
    console.error("Failed to save database to localStorage", e);
  }
}

export function mergeSeedRemittances(parsed: DatabaseState): { updated: DatabaseState, changed: boolean } {
  let changed = false;
  if (!parsed) return { updated: parsed, changed };
  if (!parsed.moneyTransfers) {
    parsed.moneyTransfers = [...DEFAULT_MONEY_TRANSFERS];
    changed = true;
  }
  if (!parsed.xawaaladaAccounts || parsed.xawaaladaAccounts.length === 0) {
    parsed.xawaaladaAccounts = [...DEFAULT_XAWAALADA_ACCOUNTS];
    changed = true;
  }
  if (!parsed.xawaaladaTransactions) {
    parsed.xawaaladaTransactions = [...DEFAULT_XAWAALADA_TRANSACTIONS];
    changed = true;
  }

  // Bidirectional sync: ensure all xawaaladaTransactions and moneyTransfers are mirrored seamlessly
  const existingTransNos = new Set((parsed.moneyTransfers || []).map(m => m.transNo || m.id));
  const existingTxRefs = new Set((parsed.xawaaladaTransactions || []).map(x => x.referenceNo || x.id));

  // 1. xawaaladaTransactions -> moneyTransfers
  (parsed.xawaaladaTransactions || []).forEach(tx => {
    const key = tx.referenceNo || tx.id;
    if (!existingTransNos.has(key)) {
      parsed.moneyTransfers.push({
        id: tx.id,
        transNo: tx.referenceNo || tx.id,
        customerName: tx.clientName || 'N/A',
        customerPhone: tx.clientPhone || 'N/A',
        amountSent: tx.amount,
        date: tx.date,
        notes: tx.description || '',
        createdBy: tx.createdBy || 'yaxyecabdisalanmohamed1234@gmail.com',
        createdAt: tx.createdAt || new Date().toISOString()
      });
      existingTransNos.add(key);
      changed = true;
    }
  });

  // 2. moneyTransfers -> xawaaladaTransactions
  (parsed.moneyTransfers || []).forEach(m => {
    const key = m.transNo || m.id;
    if (!existingTxRefs.has(key)) {
      parsed.xawaaladaTransactions.push({
        id: m.id.startsWith('TXN-') ? m.id : `TXN-${m.id.replace('MT-', '')}`,
        accountId: 'acc-4',
        type: 'out',
        amount: m.amountSent,
        clientName: m.customerName || 'N/A',
        clientPhone: m.customerPhone || '',
        referenceNo: m.transNo || `REF-${m.id}`,
        description: m.notes || 'Xawaalad / Bixin',
        date: m.date || new Date().toISOString().split('T')[0],
        time: '12:00',
        createdBy: m.createdBy || 'yaxyecabdisalanmohamed1234@gmail.com',
        createdAt: m.createdAt || new Date().toISOString()
      });
      existingTxRefs.add(key);
      changed = true;
    }
  });

  return { updated: sanitizeLocalDatabase(parsed), changed };
}

// Generate reports content for downloading
export function generateDailyTextReport(date: string, db: DatabaseState): string {
  const progressForDate = db.progress.filter(p => p.date === date);
  const activeStudentsCount = db.students.filter(s => s.active).length;
  
  let content = `BANUU JALAAL MANAGEMENT SYSTEM\n`;
  content += `DAILY COMPREHENSIVE REPORT\n`;
  content += `=========================================================\n`;
  content += `Date: ${date}\n`;
  content += `Total Enrolled Active Students: ${activeStudentsCount}\n`;
  content += `Total Progress Forms Logged Today: ${progressForDate.length}\n`;
  content += `=========================================================\n\n`;

  // Group by Class
  const classes = Array.from(new Set(db.students.map(s => s.className)));
  
  classes.forEach(cls => {
    const clsProgress = progressForDate.filter(p => p.className === cls);
    const clsTeachers = Array.from(new Set(db.students.filter(s => s.className === cls).map(s => {
      const t = db.teachers.find(tr => tr.id === s.teacherId);
      return t ? t.name : 'Unknown';
    })));
    
    content += `CLASS: ${cls.toUpperCase()}\n`;
    content += `Assigned Teacher(s): ${clsTeachers.join(', ')}\n`;
    content += `---------------------------------------------------------\n`;
    
    if (clsProgress.length === 0) {
      content += `No daily record uploaded for this class yet.\n\n`;
      return;
    }

    content += String("").padEnd(15) + " | Attendance | Lesson    | Surad   | Subac   | Dhaqan (Manners) | Nadaafad (Clean)\n";
    content += `-----------------------------------------------------------------------------------------\n`;
    
    clsProgress.forEach(p => {
      const studentShort = p.studentName.length > 15 ? p.studentName.slice(0, 15) : p.studentName.padEnd(15);
      const att = p.attendance.padEnd(10);
      const les = p.lessonCompleted.padEnd(9);
      const sur = p.surad.padEnd(7);
      const sub = p.subac.padEnd(7);
      const dhaq = p.dhaqan.padEnd(16);
      const nad = p.nadaafad.padEnd(12);
      
      content += `${studentShort} | ${att} | ${les} | ${sur} | ${sub} | ${dhaq} | ${nad}\n`;
      if (p.faahfaahin) {
        content += `   [Notes/Faahfaahin]: ${p.faahfaahin}\n`;
      }
    });
    content += `\n=========================================================\n\n`;
  });

  content += `Report generated at ${new Date().toLocaleString()} (Local Time)\n`;
  return content;
}

// Downloads progress report to browser download folder, acting as the bridge to let the user save to their D:\ folder
export function triggerFileDownload(filename: string, text: string) {
  const element = document.createElement("a");
  const file = new Blob([text], {type: 'text/plain;charset=utf-8'});
  element.href = URL.createObjectURL(file);
  element.download = filename;
  document.body.appendChild(element);
  element.click();
  document.body.removeChild(element);
}

// Generate reports content for downloading - Comprehensive Attendance Summary
export function generateAttendanceSummaryReport(startDate: string, endDate: string, classSelection: string, db: DatabaseState): string {
  const filteredProgress = db.progress.filter(p => p.date >= startDate && p.date <= endDate && (classSelection === 'All' ? true : p.className === classSelection));
  const targetStudents = db.students.filter(s => s.active && (classSelection === 'All' ? true : s.className === classSelection));

  let content = `BANUU JALAAL MANAGEMENT SYSTEM\n`;
  content += `COMPREHENSIVE ATTENDANCE SUMMARY REPORT\n`;
  content += `=========================================================\n`;
  content += `Date Range: ${startDate} to ${endDate}\n`;
  content += `Target Class: ${classSelection}\n`;
  content += `Total Active Enrolled Students: ${targetStudents.length}\n`;
  content += `=========================================================\n\n`;

  content += `Student ID | Name            | Present | Late | Absent | Rate (Present + Late)\n`;
  content += `-----------------------------------------------------------------------------\n`;

  targetStudents.forEach(s => {
    const studentLogs = filteredProgress.filter(p => p.studentId === s.id);
    const totalDays = studentLogs.length;
    const presentCount = studentLogs.filter(p => p.attendance === 'Present').length;
    const lateCount = studentLogs.filter(p => p.attendance === 'Late').length;
    const absentCount = studentLogs.filter(p => p.attendance === 'Absent').length;
    
    const rate = totalDays > 0 ? Math.round(((presentCount + lateCount) / totalDays) * 100) : 0;
    
    content += `${s.id.padEnd(10)} | ${s.name.padEnd(15).slice(0, 15)} | ${String(presentCount).padEnd(7)} | ${String(lateCount).padEnd(4)} | ${String(absentCount).padEnd(6)} | ${rate}%\n`;
  });

  content += `\n=========================================================\n`;
  content += `Report generated at ${new Date().toLocaleString()} (Local Time)\n`;
  return content;
}

// Generate reports content for downloading - Individual Student Attendance History
export function generateStudentAttendanceHistoryReport(studentId: string, startDate: string, endDate: string, db: DatabaseState): string {
  const student = db.students.find(s => s.id === studentId);
  if (!student) return `Student with ID ${studentId} not found.`;

  const studentLogs = db.progress.filter(p => p.studentId === studentId && p.date >= startDate && p.date <= endDate).sort((a,b) => a.date.localeCompare(b.date));

  let content = `BANUU JALAAL MANAGEMENT SYSTEM\n`;
  content += `INDIVIDUAL STUDENT ATTENDANCE & PERFORMANCE JOURNAL\n`;
  content += `=========================================================\n`;
  content += `Student ID: ${student.id}\n`;
  content += `Student Name: ${student.name}\n`;
  content += `Class Assigned: ${student.className}\n`;
  content += `Date Range: ${startDate} to ${endDate}\n`;
  content += `=========================================================\n\n`;

  const totalDays = studentLogs.length;
  const presentCount = studentLogs.filter(p => p.attendance === 'Present').length;
  const lateCount = studentLogs.filter(p => p.attendance === 'Late').length;
  const absentCount = studentLogs.filter(p => p.attendance === 'Absent').length;
  const attendanceRate = totalDays > 0 ? Math.round(((presentCount + lateCount) / totalDays) * 100) : 0;

  content += `SUMMARY:\n`;
  content += `Total Logged Sessions: ${totalDays}\n`;
  content += `Present Days: ${presentCount}\n`;
  content += `Late Days: ${lateCount}\n`;
  content += `Absent Days: ${absentCount}\n`;
  content += `Overall Attendance Compliance: ${attendanceRate}%\n`;
  content += `=========================================================\n\n`;

  content += `Date       | Attendance | Lesson State | Surad   | Subac   | Dhaqan / Nadaafad | Notes\n`;
  content += `-----------------------------------------------------------------------------------------\n`;

  studentLogs.forEach(l => {
    const dt = l.date.padEnd(10);
    const att = l.attendance.padEnd(10);
    const les = l.lessonCompleted.padEnd(12);
    const sur = l.surad.padEnd(7);
    const sub = l.subac.padEnd(7);
    const behavior = `${l.dhaqan.slice(0,3)}/${l.nadaafad.slice(0,3)}`.padEnd(17);
    const notes = l.faahfaahin || '-';

    content += `${dt} | ${att} | ${les} | ${sur} | ${sub} | ${behavior} | ${notes}\n`;
  });

  content += `\n=========================================================\n`;
  content += `Report generated at ${new Date().toLocaleString()} (Local Time)\n`;
  return content;
}

// Generate reports content for downloading - Teacher Attendance Summary History
export function generateTeacherAttendanceReport(teacherId: string, startDate: string, endDate: string, db: DatabaseState): string {
  const teacher = db.teachers.find(t => t.id === teacherId);
  if (!teacher) return `Teacher with ID ${teacherId} not found.`;

  const logs = (db.teacherAttendance || [])
    .filter(a => a.teacherId === teacherId && a.date >= startDate && a.date <= endDate)
    .sort((a,b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));

  let content = `BANUU JALAAL MANAGEMENT SYSTEM\n`;
  content += `TEACHER ATTENDANCE HISTORY REPORT\n`;
  content += `=========================================================\n`;
  content += `Teacher ID: ${teacher.id}\n`;
  content += `Teacher Name: ${teacher.name}\n`;
  content += `Class Assigned: ${teacher.classAssigned}\n`;
  content += `Date Range: ${startDate} to ${endDate}\n`;
  content += `=========================================================\n\n`;

  const totalDays = logs.length;
  const presentCount = logs.filter(l => l.status === 'Present').length;
  const lateCount = logs.filter(l => l.status === 'Late').length;

  content += `SUMMARY:\n`;
  content += `Total Recorded Arrivals: ${totalDays}\n`;
  content += `On-Time Arrivals (<= 07:30 AM): ${presentCount}\n`;
  content += `Late Arrivals (> 07:30 AM): ${lateCount}\n`;
  content += `=========================================================\n\n`;

  content += `Date       | Time     | Proximity    | Status\n`;
  content += `---------------------------------------------------------\n`;

  logs.forEach(l => {
    const dt = l.date.padEnd(10);
    const tm = l.time.padEnd(8);
    const prox = `${Math.round(l.distanceFromSchool)} meters`.padEnd(12);
    const st = l.status;

    content += `${dt} | ${tm} | ${prox} | ${st}\n`;
  });

  content += `\n=========================================================\n`;
  content += `Report generated at ${new Date().toLocaleString()} (Local Time)\n`;
  return content;
}

// Generate report of student behavior comments and notes with dates
export function generateStudentBehaviorCommentsReport(
  startDateOrDb: string | DatabaseState,
  endDate: string = '',
  classSelection: string = 'All',
  dbParam?: DatabaseState
): string {
  let db: DatabaseState;
  let startDate = '';
  if (typeof startDateOrDb === 'object') {
    db = startDateOrDb;
    startDate = '';
  } else {
    startDate = startDateOrDb || '';
    db = dbParam!;
  }

  const filteredProgress = (db?.progress || []).filter(p => {
    const dateMatch = (!startDate || p.date >= startDate) && (!endDate || p.date <= endDate);
    const classMatch = !classSelection || classSelection === 'All' ? true : p.className === classSelection;
    const hasCommentOrBehavior = (p.faahfaahin && p.faahfaahin.trim() !== '') || (p.behaviorRemark && p.behaviorRemark.trim() !== '');
    return dateMatch && classMatch && hasCommentOrBehavior;
  });

  // Sort by date descending
  filteredProgress.sort((a, b) => b.date.localeCompare(a.date));

  let content = `DUGSIGA SUBUC - DIIWAANKA FAAHFAAHINTA IYO DHAQANKA ARDAYDA\n`;
  content += `STUDENT BEHAVIOR & COMMENTS JOURNAL REPORT\n`;
  content += `=========================================================\n`;
  content += `Report Period: ${startDate || 'Beginning'} to ${endDate || 'Latest'}\n`;
  content += `Selected Class: ${!classSelection || classSelection === 'All' ? 'Dhamaan Fasalada (All Classes)' : classSelection}\n`;
  content += `Total Comments Logged: ${filteredProgress.length}\n`;
  content += `Generated Date: ${new Date().toLocaleString()}\n`;
  content += `=========================================================\n\n`;

  if (filteredProgress.length === 0) {
    content += `No behavior remarks or comments found for the selected filter period.\n`;
    return content;
  }

  filteredProgress.forEach((p, idx) => {
    content += `${idx + 1}. DATE: ${p.date} | STUDENT: ${p.studentName.toUpperCase()}\n`;
    content += `   Class: ${p.className} | Session: ${p.session || 'N/A'} | Attendance: ${p.attendance}\n`;
    if (p.behaviorRemark) {
      content += `   ⚠️ DHAQANKA & ANSHAXA (Behavior Remark): ${p.behaviorRemark}\n`;
    }
    if (p.faahfaahin) {
      content += `   📝 FAAHFAAHIN (General Notes): ${p.faahfaahin}\n`;
    }
    content += `---------------------------------------------------------\n`;
  });

  content += `\n=========================================================\n`;
  content += `Subuc Management System - Report Complete\n`;
  return content;
}

export function generateStudentBehaviorCommentsCSV(
  startDateOrDb: string | DatabaseState,
  endDateOrClassSelection?: string,
  classSelection: string = 'All',
  dbParam?: DatabaseState
): string {
  let db: DatabaseState;
  let startDate = '';
  let endDate = '';
  if (typeof startDateOrDb === 'object') {
    db = startDateOrDb;
    startDate = '';
    endDate = '';
    classSelection = endDateOrClassSelection || 'All';
  } else {
    startDate = startDateOrDb || '';
    endDate = endDateOrClassSelection || '';
    db = dbParam!;
  }

  const filteredProgress = (db?.progress || []).filter(p => {
    const dateMatch = (!startDate || p.date >= startDate) && (!endDate || p.date <= endDate);
    const classMatch = !classSelection || classSelection === 'All' ? true : p.className === classSelection;
    const hasCommentOrBehavior = (p.faahfaahin && p.faahfaahin.trim() !== '') || (p.behaviorRemark && p.behaviorRemark.trim() !== '');
    return dateMatch && classMatch && hasCommentOrBehavior;
  });

  filteredProgress.sort((a, b) => b.date.localeCompare(a.date));

  const rows = [
    ['Date', 'Student Name', 'Class', 'Session', 'Attendance', 'Lesson Status', 'Behavior Remark (Dhaqanka)', 'General Notes (Faahfaahin)']
  ];

  filteredProgress.forEach(p => {
    rows.push([
      `"${p.date}"`,
      `"${(p.studentName || '').replace(/"/g, '""')}"`,
      `"${(p.className || '').replace(/"/g, '""')}"`,
      `"${(p.session || '').replace(/"/g, '""')}"`,
      `"${(p.attendance || '').replace(/"/g, '""')}"`,
      `"${(p.lessonCompleted || '').replace(/"/g, '""')}"`,
      `"${(p.behaviorRemark || '').replace(/"/g, '""')}"`,
      `"${(p.faahfaahin || '').replace(/"/g, '""')}"`
    ]);
  });

  return rows.map(r => r.join(',')).join('\n');
}

// Create complete DB restore from selected backup file
export function triggerBackupDownload(db: DatabaseState) {
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(db, null, 2));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute("href",     dataStr);
  downloadAnchor.setAttribute("download", `banuu_jalaal_db_backup_${new Date().toISOString().split('T')[0]}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.removeChild(downloadAnchor);
}

export interface MergeOptions {
  userRole?: 'admin' | 'teacher' | null;
  explicitDeletedStudentIds?: string[];
  explicitDeletedTeacherIds?: string[];
  explicitDeletedExamIds?: string[];
  explicitDeletedInvoiceIds?: string[];
  preferIncomingMeta?: boolean;
}

/**
 * Intelligent conflict-free state merge:
 * 1. Guarantees that students, teachers, billing and invoices are NEVER lost or dropped when
 *    a teacher logs in, submits attendance, or syncs from another device.
 * 2. Merges progress records, submissions, teacher attendance and exams by ID without wiping existing entries.
 * 3. Honors intentional admin deletions only when explicitly requested in options.
 */
export function safeMergeDatabaseStates(
  current: DatabaseState | null | undefined,
  incoming: DatabaseState | null | undefined,
  options: MergeOptions = {}
): DatabaseState {
  if (!current && !incoming) return getDatabase();
  if (!current) return sanitizeLocalDatabase(incoming!);
  if (!incoming) return sanitizeLocalDatabase(current);

  const isTeacher = options.userRole === 'teacher';

  // 1. STUDENTS:
  // If incoming is from a teacher, NEVER allow modification of students array. Always preserve current students!
  // If incoming is from an admin, union students by ID, preserving ALL existing and incoming students
  // unless explicitly listed in explicitDeletedStudentIds.
  let mergedStudents: Student[] = [];
  if (isTeacher) {
    mergedStudents = Array.isArray(current.students) ? [...current.students] : [];
  } else {
    const deletedSet = new Set(options.explicitDeletedStudentIds || []);
    const incomingStudentMap = new Map<string, Student>();
    (incoming.students || []).forEach(s => {
      if (s && s.id && !deletedSet.has(s.id)) {
        incomingStudentMap.set(s.id, s);
      }
    });

    const currentStudentMap = new Map<string, Student>();
    (current.students || []).forEach(s => {
      if (s && s.id && !deletedSet.has(s.id)) {
        currentStudentMap.set(s.id, s);
      }
    });

    const allUsedIds = new Set<string>();
    const allStudentIds = new Set([...Array.from(currentStudentMap.keys()), ...Array.from(incomingStudentMap.keys())]);

    allStudentIds.forEach(id => {
      if (deletedSet.has(id)) return;
      const inc = incomingStudentMap.get(id);
      const cur = currentStudentMap.get(id);

      if (inc && cur) {
        // Check if they represent the same individual student
        const curName = (cur.name || '').trim().toLowerCase();
        const incName = (inc.name || '').trim().toLowerCase();
        const curParent = (cur.parentName || '').trim().toLowerCase();
        const incParent = (inc.parentName || '').trim().toLowerCase();
        const curPhone = (cur.parentPhone || '').replace(/\D/g, '');
        const incPhone = (inc.parentPhone || '').replace(/\D/g, '');

        const isSameStudent = 
          !curName || !incName || 
          curName === incName || 
          (curPhone && incPhone && curPhone === incPhone) ||
          (curParent && incParent && curParent === incParent && curName.includes(incName.split(' ')[0]));

        if (isSameStudent) {
          // Cleanly merge student fields
          const mergedItem = options.preferIncomingMeta ? { ...cur, ...inc } : { ...inc, ...cur };
          mergedStudents.push(mergedItem);
          allUsedIds.add(id);
        } else {
          // ID Collision: Two distinct students were registered concurrently on different devices with the same auto-generated sequential ID!
          // Preserve current student with their ID
          mergedStudents.push(cur);
          allUsedIds.add(cur.id);

          // Find guaranteed new unique ID for the incoming student
          let counter = 1;
          let newId = `DS${String(counter).padStart(3, '0')}`;
          while (
            allUsedIds.has(newId) || 
            incomingStudentMap.has(newId) || 
            currentStudentMap.has(newId) ||
            allStudentIds.has(newId)
          ) {
            counter++;
            newId = `DS${String(counter).padStart(3, '0')}`;
          }

          const rekeyedStudent = { ...inc, id: newId };
          mergedStudents.push(rekeyedStudent);
          allUsedIds.add(newId);
          console.warn(`[SafeMerge Resolver] Resolved concurrent student ID collision for "${inc.name}". Assigned unique ID: ${newId} (was ${id}).`);
        }
      } else if (inc) {
        mergedStudents.push(inc);
        allUsedIds.add(inc.id);
      } else if (cur) {
        mergedStudents.push(cur);
        allUsedIds.add(cur.id);
      }
    });
  }

  // 2. TEACHERS:
  let mergedTeachers: Teacher[] = [];
  if (isTeacher) {
    // Preserve teacher roster, only allow session meta update for the active teacher
    mergedTeachers = (current.teachers || []).map(t => {
      const inc = (incoming.teachers || []).find(it => it && it.id === t.id);
      if (inc) {
        return {
          ...t,
          sessionDeviceInfo: inc.sessionDeviceInfo || t.sessionDeviceInfo,
          currentSessionId: inc.currentSessionId || t.currentSessionId,
          sessionLoginTime: inc.sessionLoginTime || t.sessionLoginTime
        };
      }
      return t;
    });
  } else {
    const deletedTeacherSet = new Set(options.explicitDeletedTeacherIds || []);
    const incTeacherMap = new Map<string, Teacher>();
    (incoming.teachers || []).forEach(t => {
      if (t && t.id && !deletedTeacherSet.has(t.id)) incTeacherMap.set(t.id, t);
    });
    const curTeacherMap = new Map<string, Teacher>();
    (current.teachers || []).forEach(t => {
      if (t && t.id && !deletedTeacherSet.has(t.id)) curTeacherMap.set(t.id, t);
    });
    const allTIds = new Set([...Array.from(curTeacherMap.keys()), ...Array.from(incTeacherMap.keys())]);
    allTIds.forEach(id => {
      if (deletedTeacherSet.has(id)) return;
      const inc = incTeacherMap.get(id);
      const cur = curTeacherMap.get(id);
      if (inc && cur) mergedTeachers.push({ ...cur, ...inc });
      else if (inc) mergedTeachers.push(inc);
      else if (cur) mergedTeachers.push(cur);
    });
  }

  // 3. CLASSES:
  const mergedClasses = Array.from(new Set([
    ...(current.classes || []),
    ...(isTeacher ? [] : (incoming.classes || []))
  ])).filter(Boolean);

  // 4. PROGRESS: Union & Update by ID
  const progressMap = new Map<string, DailyProgress>();
  (current.progress || []).forEach(p => { if (p && p.id) progressMap.set(p.id, p); });
  (incoming.progress || []).forEach(p => {
    if (p && p.id) {
      const curP = progressMap.get(p.id);
      progressMap.set(p.id, curP ? { ...curP, ...p } : p);
    }
  });
  const mergedProgress = Array.from(progressMap.values());

  // 5. EXAMS: Union by ID
  const deletedExamSet = new Set(options.explicitDeletedExamIds || []);
  const examMap = new Map<string, Exam>();
  (current.exams || []).forEach(ex => { if (ex && ex.id && !deletedExamSet.has(ex.id)) examMap.set(ex.id, ex); });
  (incoming.exams || []).forEach(ex => {
    if (ex && ex.id && !deletedExamSet.has(ex.id)) {
      examMap.set(ex.id, ex);
    }
  });
  const mergedExams = Array.from(examMap.values());

  // 6. SUBMISSIONS: Union by ID
  const subMap = new Map<string, any>();
  (current.submissions || []).forEach(sub => { if (sub && sub.id) subMap.set(sub.id, sub); });
  (incoming.submissions || []).forEach(sub => { if (sub && sub.id) subMap.set(sub.id, sub); });
  const mergedSubmissions = Array.from(subMap.values());

  // 7. TEACHER ATTENDANCE: Union by ID / teacher+date key
  const tAttMap = new Map<string, TeacherAttendanceRecord>();
  (current.teacherAttendance || []).forEach(ta => {
    if (ta) {
      const key = ta.id || `${ta.teacherId}_${ta.date}`;
      tAttMap.set(key, ta);
    }
  });
  (incoming.teacherAttendance || []).forEach(ta => {
    if (ta) {
      const key = ta.id || `${ta.teacherId}_${ta.date}`;
      tAttMap.set(key, ta);
    }
  });
  const mergedTeacherAttendance = Array.from(tAttMap.values());

  // 8. BILLING & INVOICES & FINANCIALS:
  let mergedBilling = current.billing || [];
  let mergedInvoices = current.invoices || [];
  let mergedMoneyTransfers = current.moneyTransfers || [];
  let mergedXawaaladaAccounts = current.xawaaladaAccounts || [];
  let mergedXawaaladaTransactions = current.xawaaladaTransactions || [];
  let mergedXawaaladaSettings = current.xawaaladaSettings || null;

  if (!isTeacher) {
    const deletedInvSet = new Set(options.explicitDeletedInvoiceIds || []);
    // Invoices merge
    const invMap = new Map<string, Invoice>();
    (current.invoices || []).forEach(inv => { if (inv && inv.id && !deletedInvSet.has(inv.id)) invMap.set(inv.id, inv); });
    (incoming.invoices || []).forEach(inv => { if (inv && inv.id && !deletedInvSet.has(inv.id)) invMap.set(inv.id, inv); });
    mergedInvoices = Array.from(invMap.values());

    // Billing merge
    const billMap = new Map<string, BillingRecord>();
    (current.billing || []).forEach(b => { if (b && b.id) billMap.set(b.id, b); });
    (incoming.billing || []).forEach(b => { if (b && b.id) billMap.set(b.id, b); });
    mergedBilling = Array.from(billMap.values());

    // Money transfers merge
    const mtMap = new Map<string, MoneyTransferRecord>();
    (current.moneyTransfers || []).forEach(m => { if (m && m.id) mtMap.set(m.id, m); });
    (incoming.moneyTransfers || []).forEach(m => { if (m && m.id) mtMap.set(m.id, m); });
    mergedMoneyTransfers = Array.from(mtMap.values());

    // Xawaalada accounts merge
    const xAccMap = new Map<string, XawaaladaAccount>();
    (current.xawaaladaAccounts || []).forEach(a => { if (a && a.id) xAccMap.set(a.id, a); });
    (incoming.xawaaladaAccounts || []).forEach(a => { if (a && a.id) xAccMap.set(a.id, a); });
    mergedXawaaladaAccounts = Array.from(xAccMap.values());

    // Xawaalada transactions merge
    const xTxMap = new Map<string, XawaaladaTransaction>();
    (current.xawaaladaTransactions || []).forEach(t => { if (t && t.id) xTxMap.set(t.id, t); });
    (incoming.xawaaladaTransactions || []).forEach(t => { if (t && t.id) xTxMap.set(t.id, t); });
    mergedXawaaladaTransactions = Array.from(xTxMap.values());

    mergedXawaaladaSettings = incoming.xawaaladaSettings || current.xawaaladaSettings || null;
  }

  // 9. NOTIFICATIONS: Union by ID & merge readBy
  const notifMap = new Map<string, any>();
  (current.notifications || []).forEach(n => { if (n && n.id) notifMap.set(n.id, n); });
  (incoming.notifications || []).forEach(n => {
    if (n && n.id) {
      const curN = notifMap.get(n.id);
      if (curN) {
        const readByUnion = Array.from(new Set([...(curN.readBy || []), ...(n.readBy || [])]));
        notifMap.set(n.id, { ...curN, ...n, readBy: readByUnion });
      } else {
        notifMap.set(n.id, n);
      }
    }
  });
  const mergedNotifications = Array.from(notifMap.values());

  const lastUpdatedTime = Math.max(current.lastUpdatedTime || 0, incoming.lastUpdatedTime || 0, Date.now());

  const mergedResult: DatabaseState = {
    teachers: mergedTeachers,
    students: mergedStudents,
    classes: mergedClasses,
    schoolLocation: isTeacher ? current.schoolLocation : (incoming.schoolLocation || current.schoolLocation),
    landingPageSettings: isTeacher ? current.landingPageSettings : (incoming.landingPageSettings || current.landingPageSettings),
    contactMessages: Array.from(new Set([...(current.contactMessages || []), ...(incoming.contactMessages || [])])),
    adminSessionId: incoming.adminSessionId || current.adminSessionId,
    adminAllowedSessionId: incoming.adminAllowedSessionId !== undefined ? incoming.adminAllowedSessionId : current.adminAllowedSessionId,
    adminRevokeTime: incoming.adminRevokeTime || current.adminRevokeTime,
    lastUpdatedTime,
    lastBackupDownloadDate: incoming.lastBackupDownloadDate || current.lastBackupDownloadDate,
    progress: mergedProgress,
    billing: mergedBilling,
    invoices: mergedInvoices,
    moneyTransfers: mergedMoneyTransfers,
    xawaaladaAccounts: mergedXawaaladaAccounts,
    xawaaladaTransactions: mergedXawaaladaTransactions,
    xawaaladaSettings: mergedXawaaladaSettings,
    submissions: mergedSubmissions,
    teacherAttendance: mergedTeacherAttendance,
    notifications: mergedNotifications,
    exams: mergedExams
  };

  return sanitizeLocalDatabase(mergedResult);
}
