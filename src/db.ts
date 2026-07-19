/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { DatabaseState, Teacher, Student, DailyProgress, BillingRecord, Exam, MoneyTransferRecord, TeacherAttendanceRecord, SchoolLocationSettings, LandingPageSettings, Invoice } from './types';

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

const DEFAULT_MONEY_TRANSFERS: MoneyTransferRecord[] = [
  {
    id: "MT-seed-1",
    transNo: "9006454571",
    customerName: "guul madoobe",
    customerPhone: "9006454571",
    amountSent: 70,
    date: "2026-05-24",
    notes: "",
    createdBy: "yaxyecabdisalanmohamed1234@gmail.com",
    createdAt: "2026-05-24T08:00:00.000Z"
  },
  {
    id: "MT-seed-2",
    transNo: "518462",
    customerName: "global business center",
    customerPhone: "518462",
    amountSent: 3,
    date: "2026-05-24",
    notes: "iskoobe",
    createdBy: "yaxyecabdisalanmohamed1234@gmail.com",
    createdAt: "2026-05-24T08:30:00.000Z"
  },
  {
    id: "MT-seed-3",
    transNo: "518462",
    customerName: "global business center",
    customerPhone: "518462",
    amountSent: 2,
    date: "2026-05-24",
    notes: "qashin aruuriye",
    createdBy: "yaxyecabdisalanmohamed1234@gmail.com",
    createdAt: "2026-05-24T09:00:00.000Z"
  },
  {
    id: "MT-seed-4",
    transNo: "339383",
    customerName: "bilkhayr",
    customerPhone: "339383",
    amountSent: 14,
    date: "2026-05-25",
    notes: "tuubo waraab",
    createdBy: "yaxyecabdisalanmohamed1234@gmail.com",
    createdAt: "2026-05-25T08:00:00.000Z"
  },
  {
    id: "MT-seed-5",
    transNo: "6294444",
    customerName: "maxamed Ibrahim",
    customerPhone: "6294444",
    amountSent: 10,
    date: "2026-05-25",
    notes: "shaqo koronto",
    createdBy: "yaxyecabdisalanmohamed1234@gmail.com",
    createdAt: "2026-05-25T09:00:00.000Z"
  },
  {
    id: "MT-seed-6",
    transNo: "6189600",
    customerName: "yaxye cabdisalan",
    customerPhone: "6189600",
    amountSent: 5,
    date: "2026-05-25",
    notes: "wiilka dariska baa igu dirsaday oo naga cawinayay beerta",
    createdBy: "yaxyecabdisalanmohamed1234@gmail.com",
    createdAt: "2026-05-25T10:00:00.000Z"
  },
  {
    id: "MT-seed-7",
    transNo: "7237474",
    customerName: "fadumo cabdi yusuf",
    customerPhone: "7237474",
    amountSent: 20,
    date: "2026-05-28",
    notes: "gabadha shaqalaha hormaris ahan baa loo siiyay",
    createdBy: "yaxyecabdisalanmohamed1234@gmail.com",
    createdAt: "2026-05-28T11:00:00.000Z"
  },
  {
    id: "MT-seed-8",
    transNo: "400019",
    customerName: "new vision",
    customerPhone: "400019",
    amountSent: 4,
    date: "2026-05-30",
    notes: "waa xargaha daabacada",
    createdBy: "yaxyecabdisalanmohamed1234@gmail.com",
    createdAt: "2026-05-30T08:00:00.000Z"
  },
  {
    id: "MT-seed-9",
    transNo: "400974",
    customerName: "five star",
    customerPhone: "400974",
    amountSent: 46.5,
    date: "2026-05-30",
    notes: "daabacada",
    createdBy: "yaxyecabdisalanmohamed1234@gmail.com",
    createdAt: "2026-05-30T08:30:00.000Z"
  },
  {
    id: "MT-seed-10",
    transNo: "7655343",
    customerName: "maxamed cali xasan",
    customerPhone: "7655343",
    amountSent: 20,
    date: "2026-05-30",
    notes: "kurasta macaliminta",
    createdBy: "yaxyecabdisalanmohamed1234@gmail.com",
    createdAt: "2026-05-30T09:00:00.000Z"
  },
  {
    id: "MT-seed-11",
    transNo: "502595",
    customerName: "shariqa",
    customerPhone: "502595",
    amountSent: 30,
    date: "2026-05-30",
    notes: "baaldiyasha nadafada",
    createdBy: "yaxyecabdisalanmohamed1234@gmail.com",
    createdAt: "2026-05-30T09:30:00.000Z"
  },
  {
    id: "MT-seed-12",
    transNo: "377640",
    customerName: "maktabada alxarameyn",
    customerPhone: "377640",
    amountSent: 10,
    date: "2026-05-30",
    notes: "laba kutub quran",
    createdBy: "yaxyecabdisalanmohamed1234@gmail.com",
    createdAt: "2026-05-30T10:00:00.000Z"
  },
  {
    id: "MT-seed-13",
    transNo: "509575",
    customerName: "national electronic",
    customerPhone: "509575",
    amountSent: 60,
    date: "2026-05-30",
    notes: "huufar",
    createdBy: "yaxyecabdisalanmohamed1234@gmail.com",
    createdAt: "2026-05-30T10:30:00.000Z"
  },
  {
    id: "MT-seed-14",
    transNo: "510678",
    customerName: "horn agrovet",
    customerPhone: "510678",
    amountSent: 5,
    date: "2026-05-30",
    notes: "yaambo",
    createdBy: "yaxyecabdisalanmohamed1234@gmail.com",
    createdAt: "2026-05-30T11:00:00.000Z"
  },
  {
    id: "MT-seed-15",
    transNo: "510678",
    customerName: "horn agrovet",
    customerPhone: "510678",
    amountSent: 1,
    date: "2026-05-30",
    notes: "galoofis",
    createdBy: "yaxyecabdisalanmohamed1234@gmail.com",
    createdAt: "2026-05-30T11:15:00.000Z"
  },
  {
    id: "MT-seed-16",
    transNo: "400019",
    customerName: "new vision",
    customerPhone: "400019",
    amountSent: 18,
    date: "2026-05-30",
    notes: "khada daabacada",
    createdBy: "yaxyecabdisalanmohamed1234@gmail.com",
    createdAt: "2026-05-30T11:30:00.000Z"
  },
  {
    id: "MT-seed-17",
    transNo: "509563",
    customerName: "fadhisame electronic",
    customerPhone: "509563",
    amountSent: 51.5,
    date: "2026-05-30",
    notes: "5 kursi iyo Sali",
    createdBy: "yaxyecabdisalanmohamed1234@gmail.com",
    createdAt: "2026-05-30T12:00:00.000Z"
  },
  {
    id: "MT-seed-18",
    transNo: "509563",
    customerName: "fadhisame electronic",
    customerPhone: "509563",
    amountSent: 15,
    date: "2026-05-30",
    notes: "qaybiso iyo adapter",
    createdBy: "yaxyecabdisalanmohamed1234@gmail.com",
    createdAt: "2026-05-30T12:15:00.000Z"
  },
  {
    id: "MT-seed-19",
    transNo: "507949",
    customerName: "anfac",
    customerPhone: "507949",
    amountSent: 8.5,
    date: "2026-05-30",
    notes: "qaybiso iyo adapter",
    createdBy: "yaxyecabdisalanmohamed1234@gmail.com",
    createdAt: "2026-05-30T12:30:00.000Z"
  },
  {
    id: "MT-seed-20",
    transNo: "509563",
    customerName: "fadhisame electronic",
    customerPhone: "509563",
    amountSent: 7.5,
    date: "2026-05-30",
    notes: "miis shaah",
    createdBy: "yaxyecabdisalanmohamed1234@gmail.com",
    createdAt: "2026-05-30T12:45:00.000Z"
  },
  {
    id: "MT-seed-21",
    transNo: "525521",
    customerName: "nasteex",
    customerPhone: "525521",
    amountSent: 8.5,
    date: "2026-05-30",
    notes: "caleen iyo koobab",
    createdBy: "yaxyecabdisalanmohamed1234@gmail.com",
    createdAt: "2026-05-30T13:00:00.000Z"
  },
  {
    id: "MT-seed-22",
    transNo: "478101",
    customerName: "super tailor",
    customerPhone: "478101",
    amountSent: 5,
    date: "2026-05-31",
    notes: "galka fadhiga macaliminta",
    createdBy: "yaxyecabdisalanmohamed1234@gmail.com",
    createdAt: "2026-05-31T08:00:00.000Z"
  },
  {
    id: "MT-seed-23",
    transNo: "514436",
    customerName: "xaliye farm agriculture",
    customerPhone: "514436",
    amountSent: 14,
    date: "2026-06-02",
    notes: "maqas beer",
    createdBy: "yaxyecabdisalanmohamed1234@gmail.com",
    createdAt: "2026-06-02T08:00:00.000Z"
  },
  {
    id: "MT-seed-24",
    transNo: "6057789",
    customerName: "yuusuf cabdulahi jibril adan",
    customerPhone: "6057789",
    amountSent: 4,
    date: "2026-06-02",
    notes: "ninka bulaacadaa furay",
    createdBy: "yaxyecabdisalanmohamed1234@gmail.com",
    createdAt: "2026-06-02T08:30:00.000Z"
  },
  {
    id: "MT-seed-25",
    transNo: "7025452",
    customerName: "cabdilahi maxamed bixi",
    customerPhone: "7025452",
    amountSent: 1.3,
    date: "2026-06-02",
    notes: "mootada keentay shamiitada",
    createdBy: "yaxyecabdisalanmohamed1234@gmail.com",
    createdAt: "2026-06-02T09:00:00.000Z"
  },
  {
    id: "MT-seed-26",
    transNo: "5449021",
    customerName: "al baraka ee dhismaha",
    customerPhone: "5449021",
    amountSent: 14,
    date: "2026-06-02",
    notes: "kish shamiito",
    createdBy: "yaxyecabdisalanmohamed1234@gmail.com",
    createdAt: "2026-06-02T09:30:00.000Z"
  },
  {
    id: "MT-seed-27",
    transNo: "7740097",
    customerName: "xirsi farax",
    customerPhone: "7740097",
    amountSent: 40,
    date: "2026-06-03",
    notes: "ciid iyo digo",
    createdBy: "yaxyecabdisalanmohamed1234@gmail.com",
    createdAt: "2026-06-03T08:00:00.000Z"
  },
  {
    id: "MT-seed-28",
    transNo: "6850008",
    customerName: "gobaad market",
    customerPhone: "6850008",
    amountSent: 33,
    date: "2026-06-03",
    notes: "adeega nadafada sida shambada",
    createdBy: "yaxyecabdisalanmohamed1234@gmail.com",
    createdAt: "2026-06-03T09:00:00.000Z"
  },
  {
    id: "MT-seed-29",
    transNo: "5163928",
    customerName: "deeq cabdulahi",
    customerPhone: "5163928",
    amountSent: 44,
    date: "2026-06-04",
    notes: "ninkii roogaga dhigay",
    createdBy: "yaxyecabdisalanmohamed1234@gmail.com",
    createdAt: "2026-06-04T08:00:00.000Z"
  },
  {
    id: "MT-seed-30",
    transNo: "5068144",
    customerName: "bulsho company",
    customerPhone: "5068144",
    amountSent: 3,
    date: "2026-06-06",
    notes: "qalab tuuboyin oo yara",
    createdBy: "yaxyecabdisalanmohamed1234@gmail.com",
    createdAt: "2026-06-06T08:00:00.000Z"
  },
  {
    id: "MT-seed-31",
    transNo: "408330",
    customerName: "carwo al mumtas",
    customerPhone: "408330",
    amountSent: 6,
    date: "2026-06-06",
    notes: "dabqaad",
    createdBy: "yaxyecabdisalanmohamed1234@gmail.com",
    createdAt: "2026-06-06T08:30:00.000Z"
  },
  {
    id: "MT-seed-32",
    transNo: "6462301",
    customerName: "shariqa branch1",
    customerPhone: "6462301",
    amountSent: 5,
    date: "2026-06-06",
    notes: "caga saar",
    createdBy: "yaxyecabdisalanmohamed1234@gmail.com",
    createdAt: "2026-06-06T09:00:00.000Z"
  },
  {
    id: "MT-seed-33",
    transNo: "525542",
    customerName: "carwo ogaal",
    customerPhone: "525542",
    amountSent: 12,
    date: "2026-06-06",
    notes: "dhuxusha dabqadka iyo qarxadiisa",
    createdBy: "yaxyecabdisalanmohamed1234@gmail.com",
    createdAt: "2026-06-06T09:30:00.000Z"
  },
  {
    id: "MT-seed-34",
    transNo: "6057789",
    customerName: "yuusuf cabdulahi jibril",
    customerPhone: "6057789",
    amountSent: 10,
    date: "2026-06-06",
    notes: "shaqo tuubo",
    createdBy: "yaxyecabdisalanmohamed1234@gmail.com",
    createdAt: "2026-06-06T10:00:00.000Z"
  },
  {
    id: "MT-seed-35",
    transNo: "515427",
    customerName: "maktabada saxansaxo",
    customerPhone: "515427",
    amountSent: 24,
    date: "2026-06-06",
    notes: "dustpin and shelfs",
    createdBy: "yaxyecabdisalanmohamed1234@gmail.com",
    createdAt: "2026-06-06T10:30:00.000Z"
  },
  {
    id: "MT-seed-36",
    transNo: "7782266",
    customerName: "deeq cabdi maxamed",
    customerPhone: "7782266",
    amountSent: 52,
    date: "2026-06-06",
    notes: "lacag koronto lagu xiray",
    createdBy: "yaxyecabdisalanmohamed1234@gmail.com",
    createdAt: "2026-06-06T11:00:00.000Z"
  },
  {
    id: "MT-seed-37",
    transNo: "6189600",
    customerName: "yaxye cabdisalan",
    customerPhone: "6189600",
    amountSent: 20,
    date: "2026-06-09",
    notes: "10 waa domainka lagu gaday , 10ka kale waa dhalinyaro koronto xiraysay ban sii siyay",
    createdBy: "yaxyecabdisalanmohamed1234@gmail.com",
    createdAt: "2026-06-09T10:00:00.000Z"
  },
  {
    id: "MT-seed-38",
    transNo: "7743407",
    customerName: "cabdishakuur",
    customerPhone: "7743407",
    amountSent: 40,
    date: "2026-06-09",
    notes: "alxanka albaabka shabaqa ah ee irida",
    createdBy: "yaxyecabdisalanmohamed1234@gmail.com",
    createdAt: "2026-06-09T10:30:00.000Z"
  },
  {
    id: "MT-seed-39",
    transNo: "7044513",
    customerName: "cabdirixman axmed yusuf",
    customerPhone: "7044513",
    amountSent: 5,
    date: "2026-06-11",
    notes: "geedaha la beeray",
    createdBy: "yaxyecabdisalanmohamed1234@gmail.com",
    createdAt: "2026-06-11T10:00:00.000Z"
  },
  {
    id: "MT-seed-40",
    transNo: "4345399",
    customerName: "amal production sales",
    customerPhone: "4345399",
    amountSent: 20,
    date: "2026-06-11",
    notes: "geedaha la beeray",
    createdBy: "yaxyecabdisalanmohamed1234@gmail.com",
    createdAt: "2026-06-11T10:30:00.000Z"
  }
];

const LOCAL_STORAGE_KEY = 'banuu_jalaal_db';

const DEFAULT_SUBMISSIONS: any[] = [];

export const DEFAULT_LANDING_SETTINGS: LandingPageSettings = {
  schoolName: "Dugsiga Subuc",
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

  // Auto-translate old Somali item descriptions dynamically to guarantee standardized names during print / download
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
    // Force a absolute reset of old test seeds to ensure a starting clean state as requested
    if (localStorage.getItem('did_clear_test_data_v5') !== 'true') {
      localStorage.removeItem(LOCAL_STORAGE_KEY);
      localStorage.setItem('did_clear_test_data_v5', 'true');
    }

    const data = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!data) {
      // First initiation: Save defaults (completely empty starting state!)
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
