/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Teacher {
  id: string;
  name: string;
  username: string;
  passwordHash: string; // Plaintext for easy login in this local preview app
  classAssigned: string; // The class name they manage (e.g., "Quran memorization")
  className?: string; // Optional for backwards compatibility
  requiredCheckInTime?: string; // e.g., "07:30"
  imageUrl?: string; // profile picture Base64/url
  currentSessionId?: string; // Active session tracking for concurrent device login control
  sessionDeviceInfo?: string; // Information about the client device
  sessionLoginTime?: string; // Timestamp of when the session logged in
  registrationDate?: string; // YYYY-MM-DD when teacher was registered
}

export interface Student {
  id: string;
  name: string;
  parentName: string;
  parentPhone: string;
  teacherId: string; // The teacher assigned to them
  className: string; // Stored here for easier filtering
  monthlyFee: number; // e.g. $50
  busFee?: number; // monthly bus fare (optional, e.g. $15, $20)
  registrationDate: string; // YYYY-MM-DD
  active: boolean; // Is active student
  session?: 'Morning' | 'Afternoon' | 'Both';
  age?: number; // Student age (optional)
  voiceUrl?: string; // URL/Base64 of recorded recitation voice
  voiceDate?: string; // Date (YYYY-MM-DD) recorded voice recitation was captured
  videoUrl?: string; // URL/Base64 of recorded profile/behavior video
  videoDate?: string; // Date (YYYY-MM-DD) recorded media video was captured
  imageUrl?: string; // profile picture Base64/url
  photoDate?: string; // Date (YYYY-MM-DD) primary profile photo was captured
  photos?: string[]; // Array of extra captured/uploaded photos
  voices?: { url: string; date: string; label?: string }[]; // Historical recorded voices
  videos?: { url: string; date: string; label?: string }[]; // Historical recorded videos
}

export type AttendanceType = 'Present' | 'Absent' | 'Late';
export type LessonStatusType = 'Completed' | 'Not Completed';
export type TaskStatusType = 'Completed' | 'Not Completed' | 'N/A';
export type GradeType = 'Excellent' | 'Good' | 'Average' | 'Needs Improvement';

export interface DailyProgress {
  id: string; // unique date + studentId
  date: string; // YYYY-MM-DD
  studentId: string;
  studentName: string;
  teacherId: string;
  className: string;
  attendance: AttendanceType;
  lessonCompleted: LessonStatusType;
  surad: TaskStatusType; // Surad is sometimes completed
  subac: TaskStatusType; // Daily group revision
  dhaqan: GradeType; // Manners / conduct
  nadaafad: GradeType; // Hygiene / cleanliness
  faahfaahin: string; // Extra information / comments
  session?: 'Morning' | 'Afternoon';
  suuradeeMaraya?: string; // Current Surah the student is reading / at
  inteeBog?: string; // How many pages completed (half, 1, 2, 3, 4)
  boggee?: string; // Specific page number
}

export interface BillingRecord {
  id: string; // unique studentId + month
  studentId: string;
  studentName: string;
  className: string;
  month: string; // YYYY-MM (e.g. "2026-05")
  amountPaid: number;
  paymentDate?: string; // YYYY-MM-DD if paid
  receiptNo?: string; // unique receipt number e.g. BJ-REC-260501
  status: 'Paid' | 'Unpaid' | 'Partial';
  amountDue?: number;
  debtAmount?: number;
  notes?: string;
  busFeeDue?: number; // bus fee due for this month (from student profile at creation/payment time)
  busFeePaid?: number; // bus fee paid for this month
}

export interface AppNotification {
  id: string;
  type: 'attendance' | 'exam' | 'student' | 'payment' | 'teacher' | 'class';
  senderId: string;
  senderName: string;
  senderRole: 'admin' | 'teacher';
  message: string;
  timestamp: string; // ISO String
  readBy: string[]; // List of user identities (e.g. 'admin' or teacher.id) who have marked as read
  targetClass?: string; // Optional target class e.g. "Al-Baqarah Memorization"
}

export interface MoneyTransferRecord {
  id: string;
  transNo: string;
  customerPhone: string;
  customerName: string;
  amountSent: number;
  date: string; // YYYY-MM-DD
  notes: string;
  createdBy: string;
  createdAt: string; // ISO string
}

export interface TeacherSubmissionStudentDetail {
  studentId: string;
  studentName: string;
  attendanceSent?: string;
  lessonSent?: string;
  notesSent?: string;
  scoresSent?: Record<string, number>;
  averageScoreSent?: number;
  gradeSent?: string;
}

export interface TeacherSubmission {
  id: string; // TS-timestamp
  teacherId: string;
  teacherName: string;
  className: string;
  type: 'attendance' | 'exam';
  timestamp: string; // ISO string
  title: string; // e.g., "Logged Attendance & Progress"
  studentCount: number;
  summary: string;
  studentsDetail?: TeacherSubmissionStudentDetail[];
}

export interface TeacherAttendanceRecord {
  id: string; // TAR-timestamp
  teacherId: string;
  teacherName: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM:SS
  latitude: number;
  longitude: number;
  distanceFromSchool: number; // in meters
  status: 'Present' | 'Late';
  notes?: string;
}

export interface SchoolLocationSettings {
  latitude: number;
  longitude: number;
  name: string;
  radiusMeters: number;
  allowSimulation?: boolean;
}

export interface LandingCard {
  id: string;
  title: string;
  description: string;
  iconName: string; // "BookOpen" | "Award" | "Clock" | "Heart" | "ShieldCheck" | "Users" etc
}

export interface SchoolImage {
  id: string;
  url: string;
  caption: string;
}

export interface LandingPageSettings {
  schoolName: string;
  heroTitle: string;
  heroSub: string;
  aboutText: string;
  whatWeDo: string; // intro paragraph
  contactEmail: string;
  contactPhone: string;
  contactAddress: string;
  cards: LandingCard[];
  pictures: SchoolImage[];
  heroBadge?: string;
  showSpiritualWisdom?: boolean;
  ayatArabic?: string;
  ayatSomali?: string;
  ayatSource?: string;
  hadithArabic?: string;
  hadithSomali?: string;
  hadithSource?: string;
  hikmahArabic?: string;
  hikmahSomali?: string;
  hikmahSource?: string;
  heroSlides?: SchoolImage[];
  regStepTitle?: string;
  regStepText?: string;
  regStep1Title?: string;
  regStep1Text?: string;
  regStep2Title?: string;
  regStep2Text?: string;
  regStep3Title?: string;
  regStep3Text?: string;
  regOfficeHours?: string;
}

export interface ContactMessage {
  id: string;
  name: string;
  email: string;
  phone?: string;
  message: string;
  timestamp: string; // ISO string
  read: boolean;
}

export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface Invoice {
  id: string;
  invoiceNo: string; // BJ-INV-1001, etc.
  recipientType: 'parent' | 'business';
  recipientName: string;
  recipientPhone: string;
  recipientEmail?: string;
  studentId?: string; // Optional if parent
  studentName?: string; // Optional if parent
  date: string; // YYYY-MM-DD
  dueDate: string; // YYYY-MM-DD
  items: InvoiceItem[];
  totalAmount: number;
  amountPaid: number;
  status: 'Paid' | 'Unpaid' | 'Partial';
  notes?: string;
  createdBy: string;
  createdAt: string; // ISO string
}

export interface DatabaseState {
  teachers: Teacher[];
  students: Student[];
  progress: DailyProgress[];
  billing: BillingRecord[];
  classes?: string[];
  exams?: Exam[];
  notifications?: AppNotification[];
  moneyTransfers?: MoneyTransferRecord[];
  submissions?: TeacherSubmission[];
  teacherAttendance?: TeacherAttendanceRecord[];
  schoolLocation?: SchoolLocationSettings;
  landingPageSettings?: LandingPageSettings;
  contactMessages?: ContactMessage[];
  adminSessionId?: string; // Active session tracking for concurrent device login control
  invoices?: Invoice[];
}

export interface ExamScore {
  studentId: string;
  studentName: string;
  scores: Record<string, number>; // subject -> score (e.g., { "Quran": 95, "Tajweed": 88 })
  averageScore: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  comment?: string; // Optional weekly feedback/remarks in Somali
}

export interface Exam {
  id: string; // Unique exam identifier (e.g. EX-timestamp)
  heading: string; // Title / Heading of the exam
  date: string; // YYYY-MM-DD
  className: string;
  teacherId: string;
  teacherName: string;
  subjects: string[]; // List of subjects for this exam
  scores: ExamScore[]; // Scores per student
  assessmentType?: 'weekly' | 'monthly' | 'custom';
  weekNumber?: number;
  month?: string; // YYYY-MM format
}
