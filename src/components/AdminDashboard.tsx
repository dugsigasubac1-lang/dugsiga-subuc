/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { jsPDF } from 'jspdf';
import {
  Users,
  GraduationCap,
  CircleDollarSign,
  CalendarRange,
  Award,
  HardDriveDownload,
  Search,
  PlusCircle,
  Download,
  Printer,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Menu,
  TrendingUp,
  UserCheck,
  UserX,
  AlertCircle,
  Trash2,
  UserPlus,
  Receipt,
  Check,
  Activity,
  Sparkles,
  RotateCcw,
  UploadCloud,
  FileCheck2,
  MapPin,
  Lock,
  Phone,
  ArrowRight,
  Calculator,
  UserCog,
  FileSpreadsheet,
  BookOpen,
  Clock,
  ArrowLeft,
  ArrowLeftRight,
  X,
  LayoutGrid,
  LogOut,
  Save,
  Bell,
  Inbox,
  Globe,
  Plus,
  Edit2,
  Building2,
  Bus
} from 'lucide-react';
import { 
  DatabaseState, 
  Student, 
  Teacher, 
  DailyProgress, 
  BillingRecord,
  AttendanceType,
  LessonStatusType,
  AppNotification,
  MoneyTransferRecord,
  Exam,
  TeacherSubmission,
  Invoice,
  InvoiceItem
} from '../types';
import { MoneyTransferTab } from './MoneyTransferTab';
import { LandingControlTab } from './LandingControlTab';
import StudentMediaModal from './StudentMediaModal';
import { DugsigaSubucLogo } from './Logo';
import { 
  generateDailyTextReport, 
  generateAttendanceSummaryReport,
  generateStudentAttendanceHistoryReport,
  generateTeacherAttendanceReport,
  triggerFileDownload, 
  triggerBackupDownload 
} from '../db';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';

interface AdminDashboardProps {
  database: DatabaseState;
  onSaveDatabase: (updatedDb: DatabaseState) => void;
  onLogout: () => void;
}

export function AdminDashboard({ database, onSaveDatabase, onLogout }: AdminDashboardProps) {
  const [activeTab, setActiveTab ] = useState<'overview' | 'students' | 'teachers' | 'classes' | 'reports' | 'billing' | 'backup' | 'exams' | 'moneyTransfers' | 'submissions' | 'teacherAttendance' | 'landing' | 'studentAttendance'>('overview');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showNotifPopup, setShowNotifPopup] = useState(false);
  
  // Student Attendance filter and details states
  const [studAttClass, setStudAttClass] = useState<string>('All');
  const [studAttTeacher, setStudAttTeacher] = useState<string>('All');
  const [studAttDate, setStudAttDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [studAttSearch, setStudAttSearch] = useState<string>('');
  const [selectedAttendanceDetail, setSelectedAttendanceDetail] = useState<DailyProgress | null>(null);
  
  // Custom confirmation modal state to bypass iframe modal blockages
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    accentColor?: 'rose' | 'indigo' | 'amber' | 'teal';
    onConfirm: () => void;
  } | null>(null);

  // Teacher Attendance and Geofencing reporting states
  const [attendanceSubTab, setAttendanceSubTab] = useState<'dashboard' | 'checklist' | 'reports'>('dashboard');
  const [selectedReportTeacherId, setSelectedReportTeacherId] = useState<string>('');
  const [teacherReportStartDate, setTeacherReportStartDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [teacherReportEndDate, setTeacherReportEndDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  
  const [campusName, setCampusName] = useState<string>(database.schoolLocation?.name || "Banuu Jalaal School Campus");
  const [campusLat, setCampusLat] = useState<number>(database.schoolLocation?.latitude || 8.398573);
  const [campusLon, setCampusLon] = useState<number>(database.schoolLocation?.longitude || 48.480370);
  const [campusRadius, setCampusRadius] = useState<number>(database.schoolLocation?.radiusMeters || 200);
  const [campusAllowSimulation, setCampusAllowSimulation] = useState<boolean>(database.schoolLocation?.allowSimulation || false);
  const [locationSuccessMsg, setLocationSuccessMsg] = useState<string>('');
  const [locationErrorMsg, setLocationErrorMsg] = useState<string>('');
  const [isCapturingLocation, setIsCapturingLocation] = useState<boolean>(false);
  const todayDateStr = new Date().toISOString().split('T')[0];

  // Teacher submissions filtering and details explorer states
  const [submissionSearchQuery, setSubmissionSearchQuery] = useState('');
  const [submissionSelectedTeacher, setSubmissionSelectedTeacher] = useState('All');
  const [submissionSelectedType, setSubmissionSelectedType] = useState('All');
  const [expandedSubmissionId, setExpandedSubmissionId] = useState<string | null>(null);

  // Student Submission Edit State (Double-clicked to edit)
  const [editingStudentDetail, setEditingStudentDetail] = useState<{
    submissionId: string;
    studentId: string;
    studentName: string;
    attendanceSent: 'Present' | 'Late' | 'Absent';
    lessonSent: 'Completed' | 'Pending';
    notesSent: string;
    type: 'attendance' | 'exam';
  } | null>(null);

  // Notifications state and computations
  const systemNotifications = database.notifications || [];
  
  const adminUnreadNotifications = systemNotifications.filter(
    n => n.senderRole !== 'admin' && !n.readBy.includes('admin')
  );
  const totalUnreadCount = adminUnreadNotifications.length;

  const attendanceUnreadCount = systemNotifications.filter(
    n => n.type === 'attendance' && n.senderRole !== 'admin' && !n.readBy.includes('admin')
  ).length;

  const examsUnreadCount = systemNotifications.filter(
    n => n.type === 'exam' && n.senderRole !== 'admin' && !n.readBy.includes('admin')
  ).length;

  const handleCaptureAdminLocation = () => {
    setIsCapturingLocation(true);
    setLocationErrorMsg('');
    setLocationSuccessMsg('');

    if (!navigator.geolocation) {
      setLocationErrorMsg("Browser location capture is not supported in this client. Please insert the coordinates manually.");
      setIsCapturingLocation(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCampusLat(position.coords.latitude);
        setCampusLon(position.coords.longitude);
        setLocationSuccessMsg(`Successfully captured physical device coordinates! Click "Save Location Geofence Settings" below to lock this location in.`);
        setIsCapturingLocation(false);
      },
      (error) => {
        let errMsg = "Could not locate device coordinates. ";
        if (error.code === error.PERMISSION_DENIED) {
          errMsg += "Location access denied. Please allow location permissions in your browser bar, or enter coordinates manually.";
        } else {
          errMsg += error.message;
        }
        setLocationErrorMsg(errMsg);
        setIsCapturingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const handleSaveGeofencingSettings = () => {
    setLocationErrorMsg('');
    setLocationSuccessMsg('');
    
    if (!campusName.trim()) {
      setLocationErrorMsg("Please enter a descriptive name for the school campus.");
      return;
    }
    if (isNaN(campusLat) || Math.abs(campusLat) > 90) {
      setLocationErrorMsg("Please provide a valid latitude coordinate (-90 to +90).");
      return;
    }
    if (isNaN(campusLon) || Math.abs(campusLon) > 180) {
      setLocationErrorMsg("Please provide a valid longitude coordinate (-180 to +180).");
      return;
    }
    if (isNaN(campusRadius) || campusRadius <= 5) {
      setLocationErrorMsg("Geofence radius must be a positive number greater than 5 meters.");
      return;
    }

    const updatedSettings = {
      name: campusName.trim(),
      latitude: Number(campusLat),
      longitude: Number(campusLon),
      radiusMeters: Number(campusRadius),
      allowSimulation: campusAllowSimulation
    };

    onSaveDatabase({
      ...database,
      schoolLocation: updatedSettings
    });

    setLocationSuccessMsg("Dugsi Geofencing Location parameters successfully saved in application database!");
  };

  const handleDownloadTeacherReport = (teacherId: string) => {
    if (!teacherId) {
      alert("Please select a teacher to download the range report.");
      return;
    }
    const teacher = database.teachers.find(t => t.id === teacherId);
    if (!teacher) return;

    const logs = (database.teacherAttendance || [])
      .filter(a => a.teacherId === teacherId && a.date >= teacherReportStartDate && a.date <= teacherReportEndDate)
      .sort((a,b) => b.date.localeCompare(a.date) || b.time.localeCompare(a.time));

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    doc.setProperties({
      title: `Banuu Jalaal Teacher Attendance Report - ${teacher.name}`,
      subject: 'Teacher Location-Verified Attendance Report',
      author: 'Banuu Jalaal School'
    });

    // Header Title
    doc.setTextColor(33, 84, 61); // deep green (#21543d)
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(22);
    doc.text("DUGSIGA SUBUC", 15, 24);

    // Green subtitle
    doc.setFontSize(9);
    doc.setFont("Helvetica", "bold");
    doc.setTextColor(43, 92, 67); // Green info
    doc.text("GEOLOCATION ATTENDANCE REPORT  |  Xafiiska Maamulka Garowe", 15, 30);

    // Subtitle
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139); // slate-500
    doc.text("Official Coordinate & Distance Verified Staff Logging", 15, 35);

    // Divider
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.5);
    doc.line(15, 40, 195, 40);

    // Profile Metadata
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(15, 44, 180, 26, 2, 2, "F");

    doc.setFont("Helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text("TEACHER PROFILE", 20, 50);
    doc.text("REPORT PERIOD", 110, 50);
    doc.text("GENERATED DATE", 155, 50);

    doc.setFontSize(10);
    doc.setTextColor(30, 41, 59);
    doc.text(`${teacher.name} (ID: ${teacher.id})`, 20, 56);
    doc.text(`${teacherReportStartDate} to ${teacherReportEndDate}`, 110, 56);
    doc.text(new Date().toLocaleDateString(), 155, 56);

    doc.setFont("Helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text(`Class Assigned: ${teacher.classAssigned}`, 20, 62);

    // Summary Box
    doc.setFillColor(243, 244, 246);
    doc.roundedRect(15, 75, 180, 18, 2, 2, "F");

    const totalLogs = logs.length;
    const presentCount = logs.filter(l => l.status === 'Present').length;
    const lateCount = logs.filter(l => l.status === 'Late').length;

    doc.setFont("Helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(30, 41, 59);
    doc.text(`Total Tracked Days: ${totalLogs} Sessions`, 22, 86);
    doc.setTextColor(16, 122, 87); // Emerald
    doc.text(`On-Time Arrivals: ${presentCount} Days`, 82, 86);
    doc.setTextColor(180, 83, 9); // Amber/Late
    doc.text(`Late Incident Days: ${lateCount} Days`, 137, 86);

    // Table Header
    doc.setFillColor(30, 41, 59); // dark slate
    doc.rect(15, 98, 180, 8, "F");

    doc.setFont("Helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(255, 255, 255);
    doc.text("Date", 18, 103);
    doc.text("Arrival Time", 48, 103);
    doc.text("Verification Proximity", 85, 103);
    doc.text("Coordinates", 135, 103);
    doc.text("Status", 175, 103);

    // Table entries
    let currentY = 111;
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(51, 65, 85);

    logs.forEach((log) => {
      if (currentY > 275) {
        doc.addPage();
        currentY = 20;

        doc.setFillColor(30, 41, 59);
        doc.rect(15, currentY, 180, 8, "F");

        doc.setFont("Helvetica", "bold");
        doc.setFontSize(9);
        doc.setTextColor(255, 255, 255);
        doc.text("Date", 18, currentY + 5);
        doc.text("Arrival Time", 48, currentY + 5);
        doc.text("Verification Proximity", 85, currentY + 5);
        doc.text("Coordinates", 135, currentY + 5);
        doc.text("Status", 175, currentY + 5);

        currentY += 13;
        doc.setFont("Helvetica", "normal");
        doc.setFontSize(8.5);
        doc.setTextColor(51, 65, 85);
      }

      doc.text(log.date, 18, currentY);
      doc.text(log.time, 48, currentY);
      doc.text(`${Math.round(log.distanceFromSchool)} meters`, 85, currentY);
      doc.text(`${log.latitude.toFixed(4)}, ${log.longitude.toFixed(4)}`, 135, currentY);
      
      if (log.status === 'Present') {
        doc.setTextColor(16, 122, 87);
        doc.setFont("Helvetica", "bold");
        doc.text("On-Time", 175, currentY);
      } else {
        doc.setTextColor(180, 83, 9);
        doc.setFont("Helvetica", "bold");
        doc.text("Late", 175, currentY);
      }

      doc.setFont("Helvetica", "normal");
      doc.setTextColor(51, 65, 85);

      // line separator
      doc.setDrawColor(241, 245, 249);
      doc.setLineWidth(0.3);
      doc.line(15, currentY + 2.5, 195, currentY + 2.5);

      currentY += 8.5;
    });

    const cleanName = teacher.name.toLowerCase().replace(/\s+/g, '_');
    doc.save(`teacher_attendance_report_${cleanName}_${teacherReportStartDate}_to_${teacherReportEndDate}.pdf`);
  };

  const handleMarkAllNotificationsRead = () => {
    const updated = systemNotifications.map(n => {
      if (n.senderRole !== 'admin' && !n.readBy.includes('admin')) {
        return { ...n, readBy: [...n.readBy, 'admin'] };
      }
      return n;
    });
    onSaveDatabase({
      ...database,
      notifications: updated
    });
  };

  const handleMarkNotificationRead = (notifId: string) => {
    const updated = systemNotifications.map(n => {
      if (n.id === notifId && !n.readBy.includes('admin')) {
        return { ...n, readBy: [...n.readBy, 'admin'] };
      }
      return n;
    });
    onSaveDatabase({
      ...database,
      notifications: updated
    });
  };

  // Prune notifications older than 24 hours automatically on mount or update
  useEffect(() => {
    if (database.notifications && database.notifications.length > 0) {
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const freshNotifs = database.notifications.filter(n => n.timestamp >= oneDayAgo);
      if (freshNotifs.length !== database.notifications.length) {
        onSaveDatabase({
          ...database,
          notifications: freshNotifs
        });
      }
    }
  }, [database.notifications, onSaveDatabase]);

  // Auto-mark notifications as read when relevant tabs are active
  useEffect(() => {
    if ((activeTab === 'submissions' || activeTab === 'reports') && attendanceUnreadCount > 0) {
      const updated = systemNotifications.map(n => {
        if (n.type === 'attendance' && n.senderRole !== 'admin' && !n.readBy.includes('admin')) {
          return { ...n, readBy: [...n.readBy, 'admin'] };
        }
        return n;
      });
      onSaveDatabase({
        ...database,
        notifications: updated
      });
    }
  }, [activeTab, attendanceUnreadCount]);

  useEffect(() => {
    if ((activeTab === 'submissions' || activeTab === 'exams') && examsUnreadCount > 0) {
      const updated = systemNotifications.map(n => {
        if (n.type === 'exam' && n.senderRole !== 'admin' && !n.readBy.includes('admin')) {
          return { ...n, readBy: [...n.readBy, 'admin'] };
        }
        return n;
      });
      onSaveDatabase({
        ...database,
        notifications: updated
      });
    }
  }, [activeTab, examsUnreadCount]);

  // Auto-sync existing parent invoices with student billing on mount
  useEffect(() => {
    if (database.invoices && database.invoices.length > 0) {
      let updatedBilling = [...database.billing];
      let changed = false;
      
      for (const inv of database.invoices) {
        if (inv.recipientType === 'parent' && inv.studentId) {
          const synced = syncInvoiceToBilling(inv, updatedBilling, database.students);
          if (JSON.stringify(synced) !== JSON.stringify(updatedBilling)) {
            updatedBilling = synced;
            changed = true;
          }
        }
      }
      
      if (changed) {
        console.log("Auto-syncing pre-existing invoices to billing on mount...");
        onSaveDatabase({
          ...database,
          billing: updatedBilling
        });
      }
    }
  }, []);

  const navigationTabs = [
    { id: 'overview', label: 'Muuqaalka Guud', icon: LayoutGrid },
    { id: 'students', label: 'Ardayda', icon: Users },
    { id: 'teachers', label: 'Macallimiinta', icon: GraduationCap },
    { id: 'classes', label: 'Fasallada', icon: BookOpen },
    { id: 'reports', label: 'Warbixinnada', icon: CalendarRange },
    { id: 'exams', label: 'Imtixaanada', icon: FileCheck2 },
    { id: 'billing', label: 'Lacag-bixinta', icon: CircleDollarSign },
    { id: 'backup', label: 'Isticmaalayaasha', icon: Users }
  ] as const;
  
  // Dynamic State Modals
  const [showCollectedFeesBreakdownMonth, setShowCollectedFeesBreakdownMonth] = useState<string | null>(null);
  const [showBusCollectedBreakdownMonth, setShowBusCollectedBreakdownMonth] = useState<string | null>(null);
  const [showReceiptModal, setShowReceiptModal] = useState<BillingRecord | null>(null);
  const [showPrintReportModal, setShowPrintReportModal] = useState<{ 
    mode: 'whole' | 'student' | 'payments_range'; 
    startDate: string; 
    endDate: string; 
    className: string; 
    studentId?: string; 
  } | null>(null);

  const [showPrintIDBadge, setShowPrintIDBadge] = useState<{
    id: string;
    name: string;
    role: 'Student' | 'Teacher';
    classNameSelected: string;
    parentOrCheckInTime: string;
    imageUrl: string;
  } | null>(null);

  const [mediaStudentTarget, setMediaStudentTarget] = useState<Student | null>(null);

  const [showPrintExamModal, setShowPrintExamModal] = useState<Exam | null>(null);
  const [showExamTimeframePrintModal, setShowExamTimeframePrintModal] = useState<boolean>(false);
  
  // Feedback Messages
  const [feedbackMsg, setFeedbackMsg] = useState('');

  // Exam Filtering & Management State (Admin Panel)
  const [examFilterClass, setExamFilterClass] = useState<string>('All');
  const [examFilterTeacher, setExamFilterTeacher] = useState<string>('All');
  const [examStudentFilter, setExamStudentFilter] = useState<string>('All');
  const [examStartDate, setExamStartDate] = useState<string>('');
  const [examEndDate, setExamEndDate] = useState<string>('');
  const [expandedAdminExamId, setExpandedAdminExamId] = useState<string | null>(null);

  // States for Admin-driven assessment recording
  const [isCreatingExam, setIsCreatingExam] = useState(false);
  const [examHeading, setExamHeading] = useState('');
  const [examDate, setExamDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [examSubjects, setExamSubjects] = useState<string[]>(['Laxniga', 'Imaanshaha', 'Xifdiga', 'Tajwiidka', 'Akhlaaqda iyo Nadaafada']);
  const [newSubjectInput, setNewSubjectInput] = useState('');
  const [assessmentType, setAssessmentType] = useState<'weekly' | 'monthly' | 'custom'>('weekly');
  const [weekNumber, setWeekNumber] = useState<number>(1);
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  });
  const [studentScores, setStudentScores] = useState<Record<string, Record<string, string>>>({});
  const [studentComments, setStudentComments] = useState<Record<string, string>>({});
  const [examTeacherId, setExamTeacherId] = useState<string>(''); // selected teacher for exams

  // States for compilation/generation of monthly assessment and editing in admin
  const [isCompilingMonthly, setIsCompilingMonthly] = useState(false);
  const [monthlyTeacherId, setMonthlyTeacherId] = useState('');
  const [monthlyMonth, setMonthlyMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [selectedWeeklyExamIds, setSelectedWeeklyExamIds] = useState<string[]>([]);
  const [editingExam, setEditingExam] = useState<Exam | null>(null);

  // Payment Collector states
  const [showPayModal, setShowPayModal] = useState<Student | null>(null);
  const [payAmountDue, setPayAmountDue] = useState<number>(35);
  const [payAmountPaid, setPayAmountPaid] = useState<number>(35);
  const [payBusFeeDue, setPayBusFeeDue] = useState<number>(0);
  const [payBusFeePaid, setPayBusFeePaid] = useState<number>(0);
  const [payNotes, setPayNotes] = useState<string>('');

  // -------------------------------------------------------------
  // TAB 1: OVERVIEW & ANALYTICS WIDGETS
  // -------------------------------------------------------------
  const activeStudents = database.students.filter(s => s.active);
  const inactiveStudents = database.students.filter(s => !s.active);
  const totalTeachers = database.teachers.length;
  
  // Simple Recharts datasets
  // 1. Attendance ratios calculated from last 5 entry dates
  const uniqueDates = Array.from(new Set(database.progress.map(p => p.date))).sort().slice(-5);
  const attendanceTrendData = uniqueDates.map(date => {
    const logs = database.progress.filter(p => p.date === date);
    const present = logs.filter(p => p.attendance === 'Present').length;
    const late = logs.filter(p => p.attendance === 'Late').length;
    const absent = logs.filter(p => p.attendance === 'Absent').length;
    return {
      date,
      Present: present,
      Late: late,
      Absent: absent
    };
  });

  const monthNamesSomali = [
    "Janaayo", "Febraayo", "Maarso", "Abriil", "May", "Juun",
    "Luulyo", "Ogosto", "Sebteembar", "Oktoobar", "Nofeembar", "Diseembar"
  ];

  // Calculate Monthly billing statistics dynamically for the matching active collection month
  const todayDate = new Date();
  const calendarMonth = `${todayDate.getFullYear()}-${String(todayDate.getMonth() + 1).padStart(2, '0')}`;
  
  const getMostActiveBillingMonth = () => {
    if (database.billing && database.billing.length > 0) {
      const months = Array.from(new Set(database.billing.map(b => b.month)));
      months.sort().reverse();
      const currentHasPayments = database.billing.some(b => b.month === calendarMonth && b.amountPaid > 0);
      if (currentHasPayments) return calendarMonth;
      const monthWithPayments = months.find(m => database.billing.some(b => b.month === m && b.amountPaid > 0));
      if (monthWithPayments) return monthWithPayments;
      return months[0] || calendarMonth;
    }
    return calendarMonth;
  };

  const getInvoicePaymentsForMonth = (month: string) => {
    if (!database.invoices) return { registration: 0, files: 0, total: 0 };
    let regTotal = 0;
    let filesTotal = 0;
    
    const monthInvoices = database.invoices.filter(inv => {
      if (!inv.date) return false;
      return inv.date.startsWith(month);
    });
    
    for (const inv of monthInvoices) {
      if (inv.totalAmount <= 0 || inv.amountPaid <= 0) continue;
      const paidFraction = inv.amountPaid / inv.totalAmount;
      
      for (const item of inv.items) {
        const desc = item.description.toLowerCase();
        const isReg = desc.includes('diiwan') || desc.includes('regis');
        const isFile = desc.includes('fayl') || desc.includes('file');
        
        const itemTotal = item.quantity * item.unitPrice;
        const itemPaid = itemTotal * paidFraction;
        
        if (isReg) {
          regTotal += itemPaid;
        } else if (isFile) {
          filesTotal += itemPaid;
        }
      }
    }
    
    return {
      registration: Number(regTotal.toFixed(2)),
      files: Number(filesTotal.toFixed(2)),
      total: Number((regTotal + filesTotal).toFixed(2))
    };
  };

  const getInvoiceInvoicedForMonth = (month: string) => {
    if (!database.invoices) return { registration: 0, files: 0, total: 0 };
    let regTotal = 0;
    let filesTotal = 0;
    
    const monthInvoices = database.invoices.filter(inv => {
      if (!inv.date) return false;
      return inv.date.startsWith(month);
    });
    
    for (const inv of monthInvoices) {
      for (const item of inv.items) {
        const desc = item.description.toLowerCase();
        const isReg = desc.includes('diiwan') || desc.includes('regis');
        const isFile = desc.includes('fayl') || desc.includes('file');
        
        const itemTotal = item.quantity * item.unitPrice;
        
        if (isReg) {
          regTotal += itemTotal;
        } else if (isFile) {
          filesTotal += itemTotal;
        }
      }
    }
    
    return {
      registration: Number(regTotal.toFixed(2)),
      files: Number(filesTotal.toFixed(2)),
      total: Number((regTotal + filesTotal).toFixed(2))
    };
  };

  const syncInvoiceToBilling = (inv: Invoice, currentBilling: BillingRecord[], students: Student[]): BillingRecord[] => {
    if (inv.recipientType !== 'parent' || !inv.studentId) return currentBilling;
    
    const studentIds = inv.studentId.split(',').map(id => id.trim()).filter(Boolean);
    if (studentIds.length === 0) return currentBilling;
    
    const invoiceMonth = inv.date ? inv.date.slice(0, 7) : new Date().toISOString().slice(0, 7);
    const paidFraction = inv.totalAmount > 0 ? (inv.amountPaid / inv.totalAmount) : 0;
    
    const tuitionItems = inv.items.filter(item => {
      const desc = item.description.toLowerCase();
      const isReg = desc.includes('diiwan') || desc.includes('regis');
      const isFile = desc.includes('fayl') || desc.includes('file');
      const isTuition = desc.includes('bisha') || desc.includes('monthly') || desc.includes('tuition') || desc.includes('fee');
      return isTuition && !isReg && !isFile;
    });
    
    let updatedBilling = [...currentBilling];
    
    for (const sId of studentIds) {
      const student = students.find(s => s.id === sId);
      if (!student) continue;
      
      const studentNameLower = student.name.toLowerCase();
      const studentFirstWord = studentNameLower.split(' ')[0] || '';
      
      let matchedItem = tuitionItems.find(item => {
        const desc = item.description.toLowerCase();
        return desc.includes(studentFirstWord) && studentFirstWord.length > 2;
      });
      
      if (!matchedItem && tuitionItems.length > 0) {
        matchedItem = tuitionItems[0];
      }
      
      let itemUnitPrice = student.monthlyFee;
      let itemQuantity = 1;
      
      if (matchedItem) {
        itemUnitPrice = matchedItem.unitPrice;
        itemQuantity = 1; 
      }
      
      const amountDue = itemUnitPrice * itemQuantity;
      const amountPaid = amountDue * paidFraction;
      const debtAmount = Math.max(0, amountDue - amountPaid);
      
      let statusVal: 'Paid' | 'Unpaid' | 'Partial' = 'Unpaid';
      if (amountPaid >= amountDue && amountDue > 0) {
        statusVal = 'Paid';
      } else if (amountPaid > 0) {
        statusVal = 'Partial';
      }
      
      const recordId = `B-${invoiceMonth}-${sId}`;
      const existingIdx = updatedBilling.findIndex(b => b.id === recordId || (b.studentId === sId && b.month === invoiceMonth));
      
      if (existingIdx !== -1) {
        const existing = updatedBilling[existingIdx];
        const busDue = existing.busFeeDue ?? Number(student.busFee || 0);
        const busPaid = existing.busFeePaid ?? (busDue * paidFraction);
        const totalPaidMerged = amountPaid + busPaid;
        const totalDueMerged = amountDue + busDue;
        
        let mergedStatus: 'Paid' | 'Unpaid' | 'Partial' = 'Unpaid';
        if (totalPaidMerged >= totalDueMerged && totalDueMerged > 0) {
          mergedStatus = 'Paid';
        } else if (totalPaidMerged > 0) {
          mergedStatus = 'Partial';
        }
        
        updatedBilling[existingIdx] = {
          ...existing,
          amountDue: amountDue,
          amountPaid: Number(amountPaid.toFixed(2)),
          debtAmount: Number(Math.max(0, totalDueMerged - totalPaidMerged).toFixed(2)),
          status: mergedStatus,
          paymentDate: inv.amountPaid > 0 ? inv.date : existing.paymentDate,
          receiptNo: inv.amountPaid > 0 ? `REC-${invoiceMonth.replace('-', '')}-${sId.replace('BJ-', '').replace('DS', '')}` : existing.receiptNo,
          notes: `Synced from invoice ${inv.invoiceNo}. ` + (existing.notes || '')
        };
      } else {
        const busDue = Number(student.busFee || 0);
        const busPaid = busDue * paidFraction;
        const totalPaidMerged = amountPaid + busPaid;
        const totalDueMerged = amountDue + busDue;
        
        let mergedStatus: 'Paid' | 'Unpaid' | 'Partial' = 'Unpaid';
        if (totalPaidMerged >= totalDueMerged && totalDueMerged > 0) {
          mergedStatus = 'Paid';
        } else if (totalPaidMerged > 0) {
          mergedStatus = 'Partial';
        }

        const newRecord: BillingRecord = {
          id: recordId,
          studentId: sId,
          studentName: student.name,
          className: student.className,
          month: invoiceMonth,
          amountDue: amountDue,
          amountPaid: Number(amountPaid.toFixed(2)),
          debtAmount: Number(Math.max(0, totalDueMerged - totalPaidMerged).toFixed(2)),
          status: mergedStatus,
          busFeeDue: busDue,
          busFeePaid: Number(busPaid.toFixed(2)),
          paymentDate: inv.amountPaid > 0 ? inv.date : undefined,
          receiptNo: inv.amountPaid > 0 ? `REC-${invoiceMonth.replace('-', '')}-${sId.replace('BJ-', '').replace('DS', '')}` : undefined,
          notes: `Synced from invoice ${inv.invoiceNo}.`
        };
        updatedBilling.push(newRecord);
      }
    }
    
    return updatedBilling;
  };

  const currentMonthFilter = getMostActiveBillingMonth();
  
  const getFriendlyMonthName = (monthStr: string) => {
    const parts = monthStr.split('-');
    if (parts.length === 2) {
      const mIdx = parseInt(parts[1], 10) - 1;
      if (mIdx >= 0 && mIdx < 12) {
        return monthNamesSomali[mIdx] + " " + parts[0];
      }
    }
    return monthStr;
  };

  const currentMonthInvoiced = database.students.filter(s => s.active).reduce((sum, s) => sum + s.monthlyFee, 0) + getInvoiceInvoicedForMonth(currentMonthFilter).total;
  const currentMonthPaidRecords = database.billing.filter(b => b.month === currentMonthFilter && (b.status === 'Paid' || b.status === 'Partial'));
  const currentMonthPaidAmount = currentMonthPaidRecords.reduce((sum, r) => sum + r.amountPaid, 0) + getInvoicePaymentsForMonth(currentMonthFilter).total;
  const currentMonthUnpaidAmount = Math.max(0, currentMonthInvoiced - currentMonthPaidAmount);

  // Bus Fare Statistics Calculations
  const busRiders = database.students.filter(s => s.active && s.busFee && Number(s.busFee) > 0);
  const totalBusRidersCount = busRiders.length;
  const currentMonthBusInvoiced = busRiders.reduce((sum, s) => sum + Number(s.busFee || 0), 0);
  const currentMonthBusPaidRecords = database.billing.filter(b => b.month === currentMonthFilter);
  const currentMonthBusCollected = currentMonthBusPaidRecords.reduce((sum, r) => sum + Number(r.busFeePaid || 0), 0);
  const currentMonthBusPending = Math.max(0, currentMonthBusInvoiced - currentMonthBusCollected);

  const allTimeBusInvoiced = database.billing.reduce((sum, r) => sum + Number(r.busFeeDue || 0), 0);
  const allTimeBusCollected = database.billing.reduce((sum, r) => sum + Number(r.busFeePaid || 0), 0);
  const allTimeBusOutstanding = Math.max(0, allTimeBusInvoiced - allTimeBusCollected);

  const billingOverviewData = [
    { name: 'Collected Fees', value: currentMonthPaidAmount, color: '#0d9488' }, // Teal 600
    { name: 'Pending Fees', value: currentMonthUnpaidAmount, color: '#cbd5e1' }  // Slate 300
  ];
  
  const currentMonthName = getFriendlyMonthName(currentMonthFilter);

  // -------------------------------------------------------------
  // TAB 2: STUDENT MANAGEMENT DATASTORE
  // -------------------------------------------------------------
  const [studentSearch, setStudentSearch] = useState('');
  const [studentClassFilter, setStudentClassFilter] = useState('All');
  const [studentTeacherFilter, setStudentTeacherFilter] = useState('All');
  const [expandedComments, setExpandedComments] = useState<Record<string, boolean>>({});
  
  // Register Student Fields
  const [newStudentName, setNewStudentName] = useState('');
  const [newStudentParent, setNewStudentParent] = useState('');
  const [newStudentPhone, setNewStudentPhone] = useState('');
  const [newStudentClass, setNewStudentClass] = useState('Al-Baqarah Memorization');
  const [newStudentFee, setNewStudentFee] = useState(35);
  const [newStudentBusFee, setNewStudentBusFee] = useState<number>(0);
  const [newStudentTeacher, setNewStudentTeacher] = useState('T-01');
  const [newStudentSession, setNewStudentSession] = useState<'Morning' | 'Afternoon' | 'Both'>('Both');
  const [newStudentImage, setNewStudentImage] = useState<string>('');
  const [newStudentRegDate, setNewStudentRegDate] = useState<string>('');
  const [newStudentAge, setNewStudentAge] = useState<number | ''>('');
  const [showStudentDetailModal, setShowStudentDetailModal] = useState<Student | null>(null);

  // Student-Teacher Assignment Management State
  const [assignSelectedStudentId, setAssignSelectedStudentId] = useState('');
  const [assignSelectedTeacherId, setAssignSelectedTeacherId] = useState('');

  const handleAssignTeacher = (studentId: string, teacherId: string) => {
    if (!studentId) {
      alert("Fadlan dooro ardayga!");
      return;
    }
    
    const targetStudent = database.students.find(s => s.id === studentId);
    if (!targetStudent) return;

    let updatedStudents;
    let notiMessage = '';

    if (!teacherId) {
      // Unassign student
      updatedStudents = database.students.map(s => {
        if (s.id === studentId) {
          return { ...s, teacherId: '' };
        }
        return s;
      });
      notiMessage = `Admin unassigned student "${targetStudent.name}".`;
    } else {
      const targetTeacher = database.teachers.find(t => t.id === teacherId);
      if (!targetTeacher) return;

      updatedStudents = database.students.map(s => {
        if (s.id === studentId) {
          return {
            ...s,
            teacherId: teacherId,
            className: targetTeacher.classAssigned
          };
        }
        return s;
      });
      notiMessage = `Admin assigned student "${targetStudent.name}" to teacher "${targetTeacher.name}" (${targetTeacher.classAssigned}).`;
    }

    const assignmentNotification: AppNotification = {
      id: `noti-${Date.now()}`,
      type: 'student',
      senderId: 'admin',
      senderName: 'Admin',
      senderRole: 'admin',
      message: notiMessage,
      timestamp: new Date().toISOString(),
      readBy: ['admin']
    };

    const updatedNotifs = [assignmentNotification, ...(database.notifications || [])].slice(0, 100);

    onSaveDatabase({
      ...database,
      students: updatedStudents,
      notifications: updatedNotifs
    });

    setFeedbackMsg(teacherId ? `Ardayga "${targetStudent.name}" waxaa lagu wareejiyay macallinka mudan.` : `Ardayga "${targetStudent.name}" waa laga saaray macallinkiisii hore.`);
    setAssignSelectedStudentId('');
    setTimeout(() => setFeedbackMsg(''), 4500);
  };

  // Edit Student State
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);

  const handleSelectEditStudent = (student: Student) => {
    setEditingStudent(student);
    setNewStudentName(student.name);
    setNewStudentParent(student.parentName);
    setNewStudentPhone(student.parentPhone);
    setNewStudentClass(student.className);
    setNewStudentFee(student.monthlyFee);
    setNewStudentBusFee(student.busFee || 0);
    setNewStudentTeacher(student.teacherId || 'T-01');
    setNewStudentSession(student.session || 'Both');
    setNewStudentImage(student.imageUrl || '');
    setNewStudentRegDate(student.registrationDate || '');
    setNewStudentAge(student.age ?? '');
  };

  const handleCancelEditStudent = () => {
    setEditingStudent(null);
    setNewStudentName('');
    setNewStudentParent('');
    setNewStudentPhone('');
    setNewStudentClass('Al-Baqarah Memorization');
    setNewStudentFee(35);
    setNewStudentBusFee(0);
    setNewStudentTeacher('T-01');
    setNewStudentSession('Both');
    setNewStudentImage('');
    setNewStudentRegDate('');
    setNewStudentAge('');
  };

  const handleResizeAndCompressImage = (file: File, callback: (base64: string) => void) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 250;
        const MAX_HEIGHT = 250;
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
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.82);
          callback(dataUrl);
        } else {
          callback(event.target?.result as string);
        }
      };
    };
    reader.onerror = (err) => {
      console.error("FileReader failed to process uploaded asset: ", err);
    };
    reader.readAsDataURL(file);
  };

  // Registered Student Filter logic
  const filteredStudents = database.students.filter(s => {
    const sSearch = studentSearch.toLowerCase();
    const matchQuery = s.name.toLowerCase().includes(sSearch) || s.id.toLowerCase().includes(sSearch) || s.parentName.toLowerCase().includes(sSearch);
    const matchClass = studentClassFilter === 'All' ? true : s.className === studentClassFilter;
    const matchTeacher = studentTeacherFilter === 'All' ? true : s.teacherId === studentTeacherFilter;
    return matchQuery && matchClass && matchTeacher;
  });

  const handleRegisterStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudentName.trim() || !newStudentParent.trim() || !newStudentPhone.trim()) {
      alert("Please pre-fill all required fields!");
      return;
    }

    if (editingStudent) {
      const updatedStudents = database.students.map(s => {
        if (s.id === editingStudent.id) {
          return {
            ...s,
            name: newStudentName.trim(),
            parentName: newStudentParent.trim(),
            parentPhone: newStudentPhone.trim(),
            teacherId: newStudentTeacher,
            className: newStudentClass,
            monthlyFee: Number(newStudentFee),
            busFee: Number(newStudentBusFee),
            session: newStudentSession,
            imageUrl: newStudentImage,
            registrationDate: newStudentRegDate || s.registrationDate || new Date().toISOString().split('T')[0],
            age: newStudentAge === '' ? undefined : Number(newStudentAge)
          };
        }
        return s;
      });

      const studentNotification: AppNotification = {
        id: `noti-${Date.now()}`,
        type: 'student',
        senderId: 'admin',
        senderName: 'Admin',
        senderRole: 'admin',
        message: `Admin updated details for student "${newStudentName.trim()}" in class "${newStudentClass}".`,
        timestamp: new Date().toISOString(),
        readBy: ['admin'],
        targetClass: newStudentClass
      };
      
      const updatedNotifs = [studentNotification, ...(database.notifications || [])].slice(0, 100);

      onSaveDatabase({
        ...database,
        students: updatedStudents,
        notifications: updatedNotifs
      });

      setFeedbackMsg(`Student ${newStudentName} updated successfully.`);
      handleCancelEditStudent();
      setTimeout(() => setFeedbackMsg(''), 4000);
    } else {
      // Auto generate ID e.g. DS001
      const currentMaxIdNum = database.students.reduce((max, s) => {
        const digits = (s.id || '').replace(/^\D+/g, ''); // Extract all trailing digits
        const parsed = parseInt(digits, 10);
        return !isNaN(parsed) && parsed > max ? parsed : max;
      }, 0);
      const nextId = `DS${String(currentMaxIdNum + 1).padStart(3, '0')}`;

      const newStudent: Student = {
        id: nextId,
        name: newStudentName.trim(),
        parentName: newStudentParent.trim(),
        parentPhone: newStudentPhone.trim(),
        teacherId: newStudentTeacher,
        className: newStudentClass,
        monthlyFee: Number(newStudentFee),
        busFee: Number(newStudentBusFee),
        registrationDate: newStudentRegDate || new Date().toISOString().split('T')[0],
        active: true,
        session: newStudentSession,
        imageUrl: newStudentImage,
        age: newStudentAge === '' ? undefined : Number(newStudentAge)
      };

      const updatedStudents = [...database.students, newStudent];
      
      const studentNotification: AppNotification = {
        id: `noti-${Date.now()}`,
        type: 'student',
        senderId: 'admin',
        senderName: 'Admin',
        senderRole: 'admin',
        message: `Admin registered a new student: "${newStudent.name}" inside class "${newStudent.className}".`,
        timestamp: new Date().toISOString(),
        readBy: ['admin'],
        targetClass: newStudent.className
      };
      const updatedNotifs = [studentNotification, ...(database.notifications || [])].slice(0, 100);

      onSaveDatabase({
        ...database,
        students: updatedStudents,
        notifications: updatedNotifs
      });

      // Reset Form
      setNewStudentName('');
      setNewStudentParent('');
      setNewStudentPhone('');
      setFeedbackMsg(`Student ${newStudent.name} registered successfully with ID: ${newStudent.id}`);
      setTimeout(() => setFeedbackMsg(''), 4000);
    }
  };

  const handleToggleStudentStatus = (studentId: string) => {
    const updated = database.students.map(s => {
      if (s.id === studentId) {
        return { ...s, active: !s.active };
      }
      return s;
    });
    onSaveDatabase({ ...database, students: updated });
    setFeedbackMsg('Student status has been modified.');
    setTimeout(() => setFeedbackMsg(''), 3000);
  };

  const handleDeleteStudent = (studentId: string) => {
    setConfirmModal({
      isOpen: true,
      title: "Delete Student Record?",
      message: "Are you absolutely sure you want to permanently delete this student record? This will delete all their details, attendance journals and graded score sheets from database servers. This is irreversible.",
      accentColor: 'rose',
      onConfirm: () => {
        const filteredStudents = database.students.filter(s => s.id !== studentId);
        const filteredProgress = (database.progress || []).filter(p => p.studentId !== studentId);
        const filteredBilling = (database.billing || []).filter(b => b.studentId !== studentId);
        onSaveDatabase({
          ...database,
          students: filteredStudents,
          progress: filteredProgress,
          billing: filteredBilling
        });
        setFeedbackMsg('Student record permanently deleted.');
        setTimeout(() => setFeedbackMsg(''), 3000);
        setConfirmModal(null);
      }
    });
  };

  // -------------------------------------------------------------
  // TAB 3: STAFF MANAGEMENT & CLASS SETUPS
  // -------------------------------------------------------------
  const [newTeacherName, setNewTeacherName] = useState('');
  const [newTeacherClass, setNewTeacherClass] = useState('Al-Baqarah Memorization');
  const [newTeacherUser, setNewTeacherUser] = useState('');
  const [newTeacherPassword, setNewTeacherPassword] = useState('');
  const [newTeacherTime, setNewTeacherTime] = useState('07:30');
  const [newTeacherImage, setNewTeacherImage] = useState<string>('');
  const [newTeacherRegDate, setNewTeacherRegDate] = useState<string>('');

  const [newClassNameInput, setNewClassNameInput] = useState('');

  // Edit Teacher State
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const [editTeacherName, setEditTeacherName] = useState('');
  const [editTeacherClass, setEditTeacherClass] = useState('');
  const [editTeacherUser, setEditTeacherUser] = useState('');
  const [editTeacherPassword, setEditTeacherPassword] = useState('');
  const [editTeacherTime, setEditTeacherTime] = useState('07:30');
  const [editTeacherRegDate, setEditTeacherRegDate] = useState<string>('');

  // Edit Class State
  const [editingClass, setEditingClass] = useState<string | null>(null);
  const [editClassNameInput, setEditClassNameInput] = useState('');

  const handleCreateNewClass = (e: React.FormEvent) => {
    e.preventDefault();
    const classNameTrimmed = newClassNameInput.trim();
    if (!classNameTrimmed) return;

    const currentClasses = database.classes || [
      'Al-Baqarah Memorization',
      'Juz Amma Preparatory',
      'Advanced Quran Tajweed'
    ];
    if (currentClasses.some(c => c.toLowerCase() === classNameTrimmed.toLowerCase())) {
      alert("This classroom division already exists!");
      return;
    }

    const updatedClasses = [...currentClasses, classNameTrimmed];
    onSaveDatabase({
      ...database,
      classes: updatedClasses
    });

    setNewClassNameInput('');
    setFeedbackMsg(`Successfully created new class: ${classNameTrimmed}`);
    setTimeout(() => setFeedbackMsg(''), 4000);
  };

  const handleEditClass = (oldClassName: string, newClassName: string) => {
    const trimmedNew = newClassName.trim();
    if (!trimmedNew) return;
    if (trimmedNew.toLowerCase() === oldClassName.toLowerCase()) return;

    const currentClasses = database.classes || [
      'Al-Baqarah Memorization',
      'Juz Amma Preparatory',
      'Advanced Quran Tajweed'
    ];

    if (currentClasses.some(c => c.toLowerCase() === trimmedNew.toLowerCase())) {
      alert("A class with that name already exists!");
      return;
    }

    // Update classes array
    const updatedClasses = currentClasses.map(c => c === oldClassName ? trimmedNew : c);

    // Update students
    const updatedStudents = database.students.map(s => 
      s.className === oldClassName ? { ...s, className: trimmedNew } : s
    );

    // Update teachers
    const updatedTeachers = database.teachers.map(t => {
      let updated = { ...t };
      if (t.classAssigned === oldClassName) {
        updated.classAssigned = trimmedNew;
      }
      if ((t as any).className === oldClassName) {
        (updated as any).className = trimmedNew;
      }
      return updated;
    });

    // Update progress logs
    const updatedProgress = database.progress.map(p => 
      p.className === oldClassName ? { ...p, className: trimmedNew } : p
    );

    // Update billing records
    const updatedBilling = database.billing.map(b => 
      b.className === oldClassName ? { ...b, className: trimmedNew } : b
    );

    onSaveDatabase({
      ...database,
      classes: updatedClasses,
      students: updatedStudents,
      teachers: updatedTeachers,
      progress: updatedProgress,
      billing: updatedBilling
    });

    setFeedbackMsg(`Renamed "${oldClassName}" to "${trimmedNew}" successfully!`);
    setTimeout(() => setFeedbackMsg(''), 4000);
  };

  const handleDeleteClass = (clsName: string) => {
    const hasTeachers = database.teachers.some(t => t.classAssigned === clsName);
    const hasStudents = database.students.some(s => s.className === clsName && s.active);
    
    if (hasTeachers || hasStudents) {
      alert(`Cannot delete class "${clsName}" because it is currently assigned to active students or teachers. Please reassign them first!`);
      return;
    }

    setConfirmModal({
      isOpen: true,
      title: "Delete Class?",
      message: `Are you sure you want to delete the class division "${clsName}"?`,
      accentColor: 'rose',
      onConfirm: () => {
        const currentClasses = database.classes || [
          'Al-Baqarah Memorization',
          'Juz Amma Preparatory',
          'Advanced Quran Tajweed'
        ];

        const updatedClasses = currentClasses.filter(c => c !== clsName);

        onSaveDatabase({
          ...database,
          classes: updatedClasses
        });

        setFeedbackMsg(`Class division "${clsName}" deleted successfully.`);
        setTimeout(() => setFeedbackMsg(''), 4000);
        setConfirmModal(null);
      }
    });
  };

  const handleRegisterTeacher = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeacherName.trim() || !newTeacherClass.trim() || !newTeacherUser.trim() || !newTeacherPassword.trim()) {
      alert("Please fill out all staff fields!");
      return;
    }

    const teacherIdNums = database.teachers.map(t => {
      const match = t.id.match(/^T-(\d+)$/);
      return match ? parseInt(match[1], 10) : 0;
    });
    const maxTeacherIdNum = teacherIdNums.length > 0 ? Math.max(...teacherIdNums) : 0;
    const nextIdNum = maxTeacherIdNum + 1;
    const nextId = `T-${nextIdNum < 10 ? '0' + nextIdNum : nextIdNum}`;

    const newTeacher: Teacher = {
      id: nextId,
      name: newTeacherName.trim(),
      className: newTeacherClass.trim(), // backwards compatibility
      classAssigned: newTeacherClass.trim(),
      username: newTeacherUser.trim(),
      passwordHash: newTeacherPassword.trim(),
      requiredCheckInTime: newTeacherTime || '07:30',
      imageUrl: newTeacherImage,
      registrationDate: newTeacherRegDate || new Date().toISOString().split('T')[0]
    };

    onSaveDatabase({
      ...database,
      teachers: [...database.teachers, newTeacher]
    });

    setNewTeacherName('');
    setNewTeacherClass('Al-Baqarah Memorization');
    setNewTeacherUser('');
    setNewTeacherPassword('');
    setNewTeacherTime('07:30');
    setNewTeacherImage('');
    setNewTeacherRegDate('');
    setFeedbackMsg(`Teacher ${newTeacher.name} successfully certified for class ${newTeacher.classAssigned}!`);
    setTimeout(() => setFeedbackMsg(''), 4000);
  };

  const handleSelectEditTeacher = (teacher: Teacher) => {
    setEditingTeacher(teacher);
    setEditTeacherName(teacher.name);
    setEditTeacherClass(teacher.classAssigned || teacher.className || classSelectionList[0] || 'Al-Baqarah Memorization');
    setEditTeacherUser(teacher.username);
    setEditTeacherPassword(teacher.passwordHash || '');
    setEditTeacherTime(teacher.requiredCheckInTime || '07:30');
    setNewTeacherImage(teacher.imageUrl || '');
    setEditTeacherRegDate(teacher.registrationDate || '');
    
    // Smoothly scroll to the edit form container so the user sees the filled-in details instantly
    setTimeout(() => {
      document.getElementById('teacher-form-container')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
  };

  const handleSaveTeacherEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTeacher) return;

    if (!editTeacherName.trim() || !editTeacherClass.trim() || !editTeacherUser.trim() || !editTeacherPassword.trim()) {
      alert("Please fill out all staff fields!");
      return;
    }

    // Check if the username is taken by another teacher
    const isUsernameTaken = database.teachers.some(t => t.id !== editingTeacher.id && t.username.toLowerCase() === editTeacherUser.trim().toLowerCase());
    if (isUsernameTaken) {
      alert(`The username "${editTeacherUser.trim()}" is already assigned to another teacher. Please provide a unique username!`);
      return;
    }

    const updatedTeachers = database.teachers.map(t => {
      if (t.id === editingTeacher.id) {
        return {
          ...t,
          name: editTeacherName.trim(),
          classAssigned: editTeacherClass.trim(),
          className: editTeacherClass.trim(), // for backwards compatibility
          username: editTeacherUser.trim(),
          passwordHash: editTeacherPassword.trim(),
          requiredCheckInTime: editTeacherTime || '07:30',
          imageUrl: newTeacherImage,
          registrationDate: editTeacherRegDate || t.registrationDate || new Date().toISOString().split('T')[0]
        };
      }
      return t;
    });

    onSaveDatabase({
      ...database,
      teachers: updatedTeachers
    });

    setEditingTeacher(null);
    setNewTeacherImage('');
    setEditTeacherRegDate('');
    setFeedbackMsg(`Successfully updated credentials for Sh. ${editTeacherName}`);
    setTimeout(() => setFeedbackMsg(''), 4000);
  };

  const handleDeleteTeacher = (teacherId: string) => {
    const assignedStudents = database.students.filter(s => s.teacherId === teacherId && s.active);
    
    let confirmMsg = "Are you sure you want to dismiss/delete this teacher? They will no longer have dashboard access.";
    let shouldUnassign = false;

    if (assignedStudents.length > 0) {
      confirmMsg = `This teacher is currently assigned to ${assignedStudents.length} active student(s). Dismissing this teacher will automatically set their active students as "Unassigned" so you can reassign them in class settings. Do you want to proceed and unassign their students?`;
      shouldUnassign = true;
    }

    setConfirmModal({
      isOpen: true,
      title: "Confirm Staff Dismissal?",
      message: confirmMsg,
      accentColor: 'rose',
      onConfirm: () => {
        let updatedStudents = [...database.students];
        if (shouldUnassign) {
          updatedStudents = database.students.map(s => {
            if (s.teacherId === teacherId) {
              return { ...s, teacherId: '' }; // safe unassigned value
            }
            return s;
          });
        }

        const updatedTeachers = database.teachers.filter(t => t.id !== teacherId);
        onSaveDatabase({
          ...database,
          teachers: updatedTeachers,
          students: updatedStudents
        });

        setFeedbackMsg("Teacher record successfully dismissed and deleted from the database.");
        setTimeout(() => setFeedbackMsg(''), 4000);
        setConfirmModal(null);
      }
    });
  };

  const handleDeleteSubmission = (submissionId: string) => {
    setConfirmModal({
      isOpen: true,
      title: "Delete Audit Record?",
      message: "Are you absolutely sure you want to permanently delete this teacher submission record? This will delete the entry from the auditing panel.",
      accentColor: 'rose',
      onConfirm: () => {
        const filteredSubmissions = (database.submissions || []).filter(s => s.id !== submissionId);
        onSaveDatabase({
          ...database,
          submissions: filteredSubmissions
        });
        setFeedbackMsg("Submission record permanently deleted from audit trails!");
        setTimeout(() => setFeedbackMsg(''), 4000);
        setConfirmModal(null);
      }
    });
  };

  const handleSaveSubmissionStudent = (
    subId: string, 
    stuId: string, 
    fields: { 
      attendanceSent: 'Present' | 'Late' | 'Absent'; 
      lessonSent: 'Completed' | 'Pending'; 
      notesSent: string; 
    }
  ) => {
    const updatedSubmissions = (database.submissions || []).map(sub => {
      if (sub.id !== subId) return sub;

      const updatedStudentsDetail = (sub.studentsDetail || []).map(stu => {
        if (stu.studentId !== stuId) return stu;
        return {
          ...stu,
          attendanceSent: fields.attendanceSent,
          lessonSent: fields.lessonSent,
          notesSent: fields.notesSent
        };
      });

      const presentCount = updatedStudentsDetail.filter(stu => stu.attendanceSent === 'Present').length;
      const lateCount = updatedStudentsDetail.filter(stu => stu.attendanceSent === 'Late').length;
      const absentCount = updatedStudentsDetail.filter(stu => stu.attendanceSent === 'Absent').length;
      const newSummary = `${presentCount} Present, ${lateCount} Late, ${absentCount} Absent`;

      return {
        ...sub,
        summary: newSummary,
        studentsDetail: updatedStudentsDetail
      };
    });

    const targetSub = (database.submissions || []).find(s => s.id === subId);
    let updatedProgress = [...(database.progress || [])];

    if (targetSub && targetSub.type === 'attendance') {
      const subDate = (targetSub as any).date;
      const subSession = (targetSub as any).session;
      if (subDate && subSession) {
        const recordId = `P-${subDate}-${subSession.toLowerCase()}-${stuId}`;
        const existingIdx = updatedProgress.findIndex(p => p.id === recordId);
        
        if (existingIdx > -1) {
          updatedProgress[existingIdx] = {
            ...updatedProgress[existingIdx],
            attendance: fields.attendanceSent,
            lessonCompleted: fields.lessonSent === 'Completed' ? 'Completed' : 'Not Completed',
            faahfaahin: fields.notesSent
          };
        } else {
          updatedProgress.push({
            id: recordId,
            date: subDate,
            studentId: stuId,
            studentName: editingStudentDetail?.studentName || '',
            teacherId: targetSub.teacherId,
            className: targetSub.className,
            attendance: fields.attendanceSent,
            lessonCompleted: fields.lessonSent === 'Completed' ? 'Completed' : 'Not Completed',
            faahfaahin: fields.notesSent,
            session: subSession as any,
            surad: 'N/A',
            subac: 'Completed',
            dhaqan: 'Good',
            nadaafad: 'Good'
          });
        }
      }
    }

    onSaveDatabase({
      ...database,
      submissions: updatedSubmissions,
      progress: updatedProgress
    });

    setFeedbackMsg("Attendance records updated & synced successfully!");
    setTimeout(() => setFeedbackMsg(''), 4000);
    setEditingStudentDetail(null);
  };

  // -------------------------------------------------------------
  // TAB 4: COMPREHENSIVE ATTENDANCE HUB
  // -------------------------------------------------------------
  const [reportViewMode, setReportViewMode] = useState<'whole' | 'student' | 'payments_range' | 'registration_dates'>('whole');
  const [reportStartDate, setReportStartDate] = useState(() => {
    // default to first day of current month (e.g. 2026-05-01)
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`;
  });
  const [reportEndDate, setReportEndDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [reportSelectedStudentId, setReportSelectedStudentId] = useState('');
  const [reportClassSelection, setReportClassSelection] = useState('All');
  const [reportStudentSearchQuery, setReportStudentSearchQuery] = useState('');

  // Individual student payments range states
  const [payReportStudentId, setPayReportStudentId] = useState('');
  const [payReportStartMonth, setPayReportStartMonth] = useState(() => {
    const today = new Date();
    return `${today.getFullYear()}-01`;
  });
  const [payReportEndMonth, setPayReportEndMonth] = useState(() => {
    const today = new Date();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    return `${today.getFullYear()}-${mm}`;
  });
  const [payReportStudentSearchQuery, setPayReportStudentSearchQuery] = useState('');
  const [showPayReportStudentSuggestions, setShowPayReportStudentSuggestions] = useState(false);
  const [showReportStudentSuggestions, setShowReportStudentSuggestions] = useState(false);

  useEffect(() => {
    if (reportSelectedStudentId) {
      const student = database.students.find(s => s.id === reportSelectedStudentId);
      if (student && reportStudentSearchQuery !== student.name) {
        setReportStudentSearchQuery(student.name);
      }
    }
  }, [reportSelectedStudentId]);

  useEffect(() => {
    if (payReportStudentId) {
      const student = database.students.find(s => s.id === payReportStudentId);
      if (student && payReportStudentSearchQuery !== student.name) {
        setPayReportStudentSearchQuery(student.name);
      }
    }
  }, [payReportStudentId]);

  // Synchronize subjects based on assessment type for admin creation
  useEffect(() => {
    if (!isCreatingExam) return;
    if (assessmentType === 'weekly') {
      setExamSubjects(['Laxniga', 'Imaanshaha', 'Xifdiga', 'Tajwiidka', 'Akhlaaqda iyo Nadaafada']);
      setExamHeading(`Week ${weekNumber} Assessment - ${selectedMonth}`);
    } else if (assessmentType === 'monthly') {
      setExamSubjects(['Monthly Evaluation Average']);
      setExamHeading(`Monthly Assessment - ${selectedMonth}`);
    }
  }, [assessmentType, weekNumber, selectedMonth, isCreatingExam]);

  // Exam scores state populator helper for admin creation
  useEffect(() => {
    if (isCreatingExam && examTeacherId) {
      const selectedTeacherObj = database.teachers.find(t => t.id === examTeacherId);
      const teacherClassSelected = selectedTeacherObj ? (selectedTeacherObj.classAssigned || selectedTeacherObj.className) : '';
      const classStudents = database.students.filter(s => s.active && s.className === teacherClassSelected);

      setStudentScores(prev => {
        const next = { ...prev };
        classStudents.forEach(s => {
          if (!next[s.id]) {
            next[s.id] = {};
          }
          examSubjects.forEach(sub => {
            if (next[s.id][sub] === undefined || assessmentType === 'monthly') {
              if (assessmentType === 'monthly') {
                const { average } = calculateStudentMonthlyScore(s.id, selectedMonth, teacherClassSelected);
                next[s.id][sub] = String(average);
              } else {
                next[s.id][sub] = '0';
              }
            }
          });
        });
        return next;
      });
    }
  }, [isCreatingExam, examSubjects, examTeacherId, assessmentType, selectedMonth]);

  const filteredPayReportStudents = database.students.filter(s => {
    const q = payReportStudentSearchQuery.toLowerCase().trim();
    if (!q) return true;
    return s.name.toLowerCase().includes(q) || s.id.toLowerCase().includes(q);
  });

  // Target single student filtration
  const filteredReportStudents = database.students.filter(s => {
    const q = reportStudentSearchQuery.toLowerCase().trim();
    if (!q) return true;
    return s.name.toLowerCase().includes(q) || s.id.toLowerCase().includes(q);
  });

  // Unique listed classes in configuration state
  const classSelectionList = database.classes || Array.from(new Set(database.students.map(s => s.className)));

  // Filter progress entries in the date range
  const rangeProgress = database.progress.filter(p => p.date >= reportStartDate && p.date <= reportEndDate);

  // Reusable function to draw a clean vector crest in jsPDF
  const drawPdfLogoCrest = (doc: any, cx: number, cy: number, radius: number = 10) => {
    // Disabled as requested.
  };

  const getMonthsInRange = (start: string, end: string) => {
    const months = [];
    try {
      let [startYr, startMn] = start.split('-').map(Number);
      let [endYr, endMn] = end.split('-').map(Number);
      
      let curYr = startYr;
      let curMn = startMn;
      
      while (curYr < endYr || (curYr === endYr && curMn <= endMn)) {
        const yrStr = curYr;
        const mnStr = String(curMn).padStart(2, '0');
        months.push(`${yrStr}-${mnStr}`);
        
        curMn += 1;
        if (curMn > 12) {
          curMn = 1;
          curYr += 1;
        }
      }
    } catch (e) {
      console.warn(e);
    }
    return months;
  };

  const getStudentPaymentRangeReport = (studentId: string, start: string, end: string) => {
    const student = database.students.find(s => s.id === studentId);
    if (!student) return null;
    
    const months = getMonthsInRange(start, end);
    const records = months.map(m => getBillingStatusForStudent(student, m));
    
    const totalDue = records.reduce((sum, r) => sum + (r.amountDue ?? student.monthlyFee), 0);
    const totalPaid = records.reduce((sum, r) => sum + r.amountPaid, 0);
    const totalDebt = Math.max(0, totalDue - totalPaid);
    
    return {
      student,
      months,
      records,
      totalDue,
      totalPaid,
      totalDebt
    };
  };

  // Helper: get progress trend for a student in admin dashboard
  const getStudentProgressTrend = (studentId: string): { 
    trend: 'Improving' | 'Declining' | 'Stable' | 'No Data'; 
    icon: string;
    diff: number;
  } => {
    const weeklyExams = (database.exams || [])
      .filter(ex => ex.assessmentType === 'weekly')
      .sort((a, b) => a.date.localeCompare(b.date)); // chronological order
    
    const studentScoresList: number[] = [];
    weeklyExams.forEach(ex => {
      const sc = ex.scores.find(s => s.studentId === studentId);
      if (sc) {
        let weeklyTotal = 0;
        const subjectsList = ['Laxniga', 'Imaanshaha', 'Xifdiga', 'Tajwiidka', 'Akhlaaqda iyo Nadaafada'];
        subjectsList.forEach(sub => {
          weeklyTotal += (sc.scores[sub] || 0);
        });
        studentScoresList.push(weeklyTotal);
      }
    });

    if (studentScoresList.length < 2) {
      return { trend: 'No Data', icon: '➖', diff: 0 };
    }

    const latest = studentScoresList[studentScoresList.length - 1];
    const previous = studentScoresList[studentScoresList.length - 2];
    const diff = latest - previous;

    if (diff > 1) {
      return { trend: 'Improving', icon: '📈', diff };
    } else if (diff < -1) {
      return { trend: 'Declining', icon: '📉', diff };
    } else {
      return { trend: 'Stable', icon: '➖', diff };
    }
  };

  // Helper: get student competition group based on final calculated monthly score in admin dashboard
  const getStudentCompetitionGroup = (studentId: string) => {
    // Latest saved monthly assessment
    const isMonthlyExamList = (database.exams || [])
      .filter(ex => ex.assessmentType === 'monthly')
      .sort((a, b) => b.date.localeCompare(a.date));

    let latestScore: number | null = null;
    if (isMonthlyExamList.length > 0) {
      for (const ex of isMonthlyExamList) {
        const sc = ex.scores.find(s => s.studentId === studentId);
        if (sc) {
          latestScore = sc.averageScore;
          break;
        }
      }
    }

    // Dynamic fallback to current month's weeklies
    if (latestScore === null) {
      const weeklyEx = (database.exams || []).filter(ex => ex.assessmentType === 'weekly');
      if (weeklyEx.length > 0) {
        const sorted = [...weeklyEx].sort((a, b) => b.date.localeCompare(a.date));
        const latestMonStr = sorted[0].month;
        if (latestMonStr) {
          const matched = sorted.filter(w => w.month === latestMonStr);
          let sum = 0;
          let count = 0;
          matched.forEach(w => {
            const sc = w.scores.find(s => s.studentId === studentId);
            if (sc) {
              const subjectsList = ['Laxniga', 'Imaanshaha', 'Xifdiga', 'Tajwiidka', 'Akhlaaqda iyo Nadaafada'];
              let weeklyTotal = 0;
              subjectsList.forEach(sub => {
                weeklyTotal += (sc.scores[sub] || 0);
              });
              sum += weeklyTotal;
              count++;
            }
          });
          if (count > 0) {
            latestScore = sum / count;
          }
        }
      }
    }

    if (latestScore === null) {
      return { group: 'Unassigned', score: 0 };
    }

    if (latestScore >= 90) return { group: 'Group A', score: latestScore };
    if (latestScore >= 80) return { group: 'Group B', score: latestScore };
    if (latestScore >= 70) return { group: 'Group C', score: latestScore };
    if (latestScore >= 60) return { group: 'Group D', score: latestScore };
    return { group: 'Group E', score: latestScore };
  };

  const getLastThursdayOfMonth = (year: number, month: number): string => {
    const lastDay = new Date(year, month, 0);
    let dayOfWeek = lastDay.getDay(); // 4 is Thursday
    let targetDate = lastDay.getDate();
    let iter = 0;
    while (dayOfWeek !== 4 && iter < 10) {
      targetDate--;
      const d = new Date(year, month - 1, targetDate);
      dayOfWeek = d.getDay();
      iter++;
    }
    const finalDate = new Date(year, month - 1, targetDate);
    return finalDate.toISOString().split('T')[0];
  };

  const calculateStudentMonthlyScore = (studentId: string, month: string, targetClass: string) => {
    const weeklies = (database.exams || []).filter(ex => 
      ex.className === targetClass &&
      ex.assessmentType === 'weekly' &&
      ex.month === month
    );
    
    let totalScore = 0;
    let count = 0;
    
    weeklies.forEach(ex => {
      const sScore = ex.scores.find(sc => sc.studentId === studentId);
      if (sScore) {
        let weeklyTotal = 0;
        const subjects = ['Laxniga', 'Imaanshaha', 'Xifdiga', 'Tajwiidka', 'Akhlaaqda iyo Nadaafada'];
        subjects.forEach(sub => {
          weeklyTotal += (sScore.scores[sub] || 0);
        });
        totalScore += weeklyTotal;
        count++;
      }
    });

    const average = count > 0 ? parseFloat((totalScore / count).toFixed(2)) : 0;
    
    let grade: 'A' | 'B' | 'C' | 'D' | 'F' = 'F';
    if (average >= 90) grade = 'A';
    else if (average >= 80) grade = 'B';
    else if (average >= 70) grade = 'C';
    else if (average >= 60) grade = 'D';

    return { average, grade, completedWeeks: count };
  };

  const WEEKLY_MAX_SCORES_ADMIN: Record<string, number> = {
    'Laxniga': 30,
    'Imaanshaha': 30,
    'Xifdiga': 20,
    'Tajwiidka': 10,
    'Akhlaaqda iyo Nadaafada': 10
  };

  const handleAdminScoreChange = (studentId: string, subjectName: string, val: string) => {
    if (assessmentType === 'weekly' && WEEKLY_MAX_SCORES_ADMIN[subjectName] !== undefined) {
      const maxAllowed = WEEKLY_MAX_SCORES_ADMIN[subjectName];
      const parsed = parseFloat(val);
      if (!isNaN(parsed) && parsed > maxAllowed) {
        val = String(maxAllowed);
      }
    }
    setStudentScores(prev => ({
      ...prev,
      [studentId]: {
        ...(prev[studentId] || {}),
        [subjectName]: val
      }
    }));
  };

  const getAdminStudentMetrics = (studentId: string, targetClass: string) => {
    const scoresObj = studentScores[studentId] || {};
    
    if (assessmentType === 'weekly') {
      let total = 0;
      const subjects = ['Laxniga', 'Imaanshaha', 'Xifdiga', 'Tajwiidka', 'Akhlaaqda iyo Nadaafada'];
      subjects.forEach(sub => {
        total += parseFloat(scoresObj[sub] || '0') || 0;
      });
      const average = parseFloat(total.toFixed(2));
      
      let grade: 'A' | 'B' | 'C' | 'D' | 'F' = 'F';
      if (average >= 90) grade = 'A';
      else if (average >= 80) grade = 'B';
      else if (average >= 70) grade = 'C';
      else if (average >= 60) grade = 'D';
      
      return { average, grade };
    } else if (assessmentType === 'monthly') {
      const { average, grade } = calculateStudentMonthlyScore(studentId, selectedMonth, targetClass);
      return { average, grade };
    } else {
      let total = 0;
      let count = 0;
      examSubjects.forEach(sub => {
        const val = parseFloat(scoresObj[sub] || '0') || 0;
        total += val;
        count++;
      });
      const average = count > 0 ? parseFloat((total / count).toFixed(1)) : 0;
      
      let grade: 'A' | 'B' | 'C' | 'D' | 'F' = 'F';
      if (average >= 90) grade = 'A';
      else if (average >= 80) grade = 'B';
      else if (average >= 70) grade = 'C';
      else if (average >= 60) grade = 'D';

      return { average, grade };
    }
  };

  const handleSaveAdminCreatedExam = (e: React.FormEvent) => {
    e.preventDefault();
    if (!examHeading.trim()) {
      alert("Please enter a descriptive Heading/Title.");
      return;
    }
    if (!examTeacherId) {
      alert("Please choose a teacher / classroom.");
      return;
    }
    const selectedTeacherObj = database.teachers.find(t => t.id === examTeacherId);
    if (!selectedTeacherObj) {
      alert("Invalid selection of teacher.");
      return;
    }
    const teacherClassSelected = selectedTeacherObj.classAssigned || selectedTeacherObj.className || '';
    const classStudents = database.students.filter(s => s.active && s.className === teacherClassSelected);

    if (examSubjects.length === 0) {
      alert("Please declare or add at least one subject to examine.");
      return;
    }

    const scoresPayload = classStudents.map(s => {
      const { average, grade } = getAdminStudentMetrics(s.id, teacherClassSelected);
      const scoresRecord: Record<string, number> = {};
      
      if (assessmentType === 'monthly') {
        scoresRecord['Monthly Evaluation Average'] = average;
      } else {
        examSubjects.forEach(sub => {
          scoresRecord[sub] = parseFloat(studentScores[s.id]?.[sub] || '0') || 0;
        });
      }

      return {
        studentId: s.id,
        studentName: s.name,
        scores: scoresRecord,
        averageScore: average,
        comment: studentComments[s.id] || '',
        grade
      };
    });

    let savedDate = examDate;
    if (assessmentType === 'monthly') {
      const [yearStr, monthStr] = selectedMonth.slice(0, 7).split('-');
      savedDate = getLastThursdayOfMonth(parseInt(yearStr, 10), parseInt(monthStr, 10));
    }

    const newExam: Exam = {
      id: `EX-${Date.now()}`,
      heading: examHeading.trim(),
      date: savedDate,
      className: teacherClassSelected,
      teacherId: selectedTeacherObj.id,
      teacherName: selectedTeacherObj.name,
      subjects: examSubjects,
      scores: scoresPayload,
      assessmentType,
      weekNumber: assessmentType === 'weekly' ? weekNumber : undefined,
      month: (assessmentType === 'weekly' || assessmentType === 'monthly') ? selectedMonth : undefined
    };

    const updatedExams = [newExam, ...(database.exams || [])];
    
    const examNotification: AppNotification = {
      id: `noti-${Date.now()}`,
      type: 'exam',
      senderId: 'admin',
      senderName: 'SYSTEM ADMIN',
      senderRole: 'admin',
      message: `Admin recorded and graded "${examHeading}" exam for teacher ${selectedTeacherObj.name} (class "${teacherClassSelected}").`,
      timestamp: new Date().toISOString(),
      readBy: ['admin'],
      targetClass: teacherClassSelected
    };

    const updatedNotifications = [examNotification, ...(database.notifications || [])].slice(0, 100);

    const examSubmissionDetail = scoresPayload.map(sp => ({
      studentId: sp.studentId,
      studentName: sp.studentName,
      scoresSent: sp.scores,
      averageScoreSent: sp.averageScore,
      gradeSent: sp.grade
    }));

    const avgScore = scoresPayload.length > 0 
      ? (scoresPayload.reduce((acc, s) => acc + s.averageScore, 0) / scoresPayload.length).toFixed(1)
      : '0.0';

    const examSubmission: TeacherSubmission = {
      id: `TS-${Date.now()}`,
      teacherId: selectedTeacherObj.id,
      teacherName: selectedTeacherObj.name,
      className: teacherClassSelected,
      type: 'exam',
      timestamp: new Date().toISOString(),
      title: `Admin Synced Graded Sheet ("${examHeading}")`,
      studentCount: scoresPayload.length,
      summary: `Recorded by Admin. Subjects: ${examSubjects.join(', ')} (Avg Score: ${avgScore}%)`,
      studentsDetail: examSubmissionDetail
    };

    onSaveDatabase({
      ...database,
      exams: updatedExams,
      notifications: updatedNotifications,
      submissions: [examSubmission, ...(database.submissions || [])]
    });

    setFeedbackMsg(`Exam results for "${examHeading}" registered successfully by Admin!`);
    setIsCreatingExam(false);
    setExamHeading('');
    setExamSubjects(['Laxniga', 'Imaanshaha', 'Xifdiga', 'Tajwiidka', 'Akhlaaqda iyo Nadaafada']);
    setAssessmentType('weekly');
    setWeekNumber(1);
    setStudentScores({});
    setStudentComments({});
    
    setTimeout(() => setFeedbackMsg(''), 5500);
  };

  const handleStartEditExam = (ex: Exam) => {
    setEditingExam(ex);
    
    // Populate student scores and comments
    const initialScores: Record<string, Record<string, string>> = {};
    const initialComments: Record<string, string> = {};
    
    ex.scores.forEach(sc => {
      initialScores[sc.studentId] = {};
      ex.subjects.forEach(sub => {
        initialScores[sc.studentId][sub] = String(sc.scores[sub] !== undefined ? sc.scores[sub] : '0');
      });
      initialComments[sc.studentId] = sc.comment || '';
    });
    
    setStudentScores(initialScores);
    setStudentComments(initialComments);
  };

  const handleUpdateAdminExam = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingExam) return;
    if (!editingExam.heading.trim()) {
      alert("Please enter a heading/title.");
      return;
    }
    
    const updatedScores = editingExam.scores.map(sc => {
      const studentId = sc.studentId;
      const scoresObj = studentScores[studentId] || {};
      
      let average = 0;
      let grade: 'A' | 'B' | 'C' | 'D' | 'F' = 'F';
      
      if (editingExam.assessmentType === 'weekly') {
        let total = 0;
        editingExam.subjects.forEach(sub => {
          total += parseFloat(scoresObj[sub] || '0') || 0;
        });
        average = parseFloat(total.toFixed(2));
      } else if (editingExam.assessmentType === 'monthly') {
        average = parseFloat(parseFloat(scoresObj['Monthly Evaluation Average'] || '0').toFixed(2));
      } else {
        let total = 0;
        let count = 0;
        editingExam.subjects.forEach(sub => {
          total += parseFloat(scoresObj[sub] || '0') || 0;
          count++;
        });
        average = count > 0 ? parseFloat((total / count).toFixed(1)) : 0;
      }
      
      if (average >= 90) grade = 'A';
      else if (average >= 80) grade = 'B';
      else if (average >= 70) grade = 'C';
      else if (average >= 60) grade = 'D';
      
      const scoresRecord: Record<string, number> = {};
      editingExam.subjects.forEach(sub => {
        scoresRecord[sub] = parseFloat(scoresObj[sub] || '0') || 0;
      });
      
      return {
        ...sc,
        scores: scoresRecord,
        averageScore: average,
        comment: studentComments[studentId] || '',
        grade
      };
    });
    
    const updatedExam: Exam = {
      ...editingExam,
      heading: editingExam.heading.trim(),
      date: editingExam.date,
      scores: updatedScores
    };
    
    const updatedExams = (database.exams || []).map(ex => ex.id === editingExam.id ? updatedExam : ex);
    
    onSaveDatabase({
      ...database,
      exams: updatedExams
    });
    
    setEditingExam(null);
    setStudentScores({});
    setStudentComments({});
    setFeedbackMsg("Qiimaynta waa la guulaystay cusboonaysiinteeda! (Assessment updated successfully!)");
    setTimeout(() => setFeedbackMsg(''), 5500);
  };

  const handleCompileMonthlyAssessment = (type: 'admin' | 'teacher', currentTeacherId?: string, currentClass?: string) => {
    const tId = type === 'admin' ? monthlyTeacherId : currentTeacherId;
    const teacherObj = database.teachers.find(t => t.id === tId);
    if (!teacherObj) {
      alert("Instructor not found.");
      return;
    }
    const classAssigned = type === 'admin' ? (teacherObj.classAssigned || teacherObj.className || '') : (currentClass || '');
    if (!classAssigned) {
      alert("This teacher does not have an assigned classroom.");
      return;
    }
    
    if (selectedWeeklyExamIds.length === 0) {
      alert("Fadlan dooro ugu yaraan hal qiimayn toddobaadle ah si aad u samayso qiimaynta bisha. (Please select at least one weekly assessment.)");
      return;
    }
    
    const chosenExams = (database.exams || []).filter(ex => selectedWeeklyExamIds.includes(ex.id));
    if (chosenExams.length === 0) {
      alert("No exams found for the selected IDs.");
      return;
    }
    
    const classStudents = database.students.filter(s => s.active && s.teacherId === teacherObj.id);
    
    const scoresPayload = classStudents.map(s => {
      let totalSum = 0;
      let count = 0;
      
      chosenExams.forEach(ex => {
        const sScore = ex.scores.find(sc => sc.studentId === s.id);
        if (sScore) {
          let weeklyTotal = 0;
          const subjects = ['Laxniga', 'Imaanshaha', 'Xifdiga', 'Tajwiidka', 'Akhlaaqda iyo Nadaafada'];
          subjects.forEach(sub => {
            weeklyTotal += (sScore.scores[sub] || 0);
          });
          totalSum += weeklyTotal;
          count++;
        }
      });
      
      const average = count > 0 ? parseFloat((totalSum / count).toFixed(2)) : 0;
      
      let grade: 'A' | 'B' | 'C' | 'D' | 'F' = 'F';
      if (average >= 90) grade = 'A';
      else if (average >= 80) grade = 'B';
      else if (average >= 70) grade = 'C';
      else if (average >= 60) grade = 'D';
      
      return {
        studentId: s.id,
        studentName: s.name,
        scores: { 'Monthly Evaluation Average': average },
        averageScore: average,
        comment: `Qiimaynta bisha waxaa laga xisaabay ${count} toddobaad oo la doortay.`,
        grade
      };
    });
    
    const monthStr = type === 'admin' ? monthlyMonth : selectedMonth;
    const [yearStr, monthNum] = monthStr.split('-');
    const savedDate = getLastThursdayOfMonth(parseInt(yearStr, 10), parseInt(monthNum, 10));
    
    const monthNames = [
      "Janaayo", "Febraayo", "Maarso", "Abriil", "May", "Juun", 
      "Luulyo", "Agoosto", "Sebtembar", "Oktoobar", "Nofeembar", "Diseembar"
    ];
    const somaliMonthName = monthNames[parseInt(monthNum, 10) - 1] || monthStr;
    
    const newExam: Exam = {
      id: `EX-${Date.now()}`,
      heading: `Qiimaynta Bisha ${somaliMonthName} (${somaliMonthName} Monthly Evaluation) - ${teacherObj.name}`,
      date: savedDate,
      className: classAssigned,
      teacherId: teacherObj.id,
      teacherName: teacherObj.name,
      subjects: ['Monthly Evaluation Average'],
      scores: scoresPayload,
      assessmentType: 'monthly',
      month: monthStr
    };
    
    const updatedExams = [newExam, ...(database.exams || [])];
    
    const examNotification: AppNotification = {
      id: `noti-${Date.now()}`,
      type: 'exam',
      senderId: type === 'admin' ? 'admin' : teacherObj.id,
      senderName: type === 'admin' ? 'SYSTEM ADMIN' : teacherObj.name,
      senderRole: type === 'admin' ? 'admin' : 'teacher',
      message: `Monthly evaluation for "${classAssigned}" compiled and saved from ${selectedWeeklyExamIds.length} weeks.`,
      timestamp: new Date().toISOString(),
      readBy: type === 'admin' ? ['admin'] : [teacherObj.id],
      targetClass: classAssigned
    };
    
    const updatedNotifications = [examNotification, ...(database.notifications || [])].slice(0, 100);
    
    onSaveDatabase({
      ...database,
      exams: updatedExams,
      notifications: updatedNotifications
    });
    
    setIsCompilingMonthly(false);
    setSelectedWeeklyExamIds([]);
    setFeedbackMsg("Qiimaynta bisha waa la guulaystay ku darideeda! (Monthly evaluation compiled and saved!)");
    setTimeout(() => setFeedbackMsg(''), 5500);
  };

  const handleDownloadPaymentRangeTxt = (studentId: string, start: string, end: string) => {
    const report = getStudentPaymentRangeReport(studentId, start, end);
    if (!report) return;
    
    const { student, records, totalDue, totalPaid, totalDebt } = report;
    const lines = [
      "==================================================",
      "                 DUGSIGA SUBUC                    ",
      "        STUDENT FINANCIAL LEDGER STATEMENT        ",
      "           Xaraf Saxan iyo Xifdi Sugan            ",
      "==================================================",
      `Generated Date: ${new Date().toLocaleString()}`,
      `Student Name:   ${student.name}`,
      `Student ID:     ${student.id}`,
      `Assigned Class: ${student.className}`,
      `Month Range:    ${start} to ${end}`,
      "--------------------------------------------------",
      "SUMMARY OF FINANCIAL POSITION:",
      `  Total Tuition Invoiced:  $${totalDue}`,
      `  Total Tuition Deposited: $${totalPaid}`,
      `  Outstanding Due Debt:    $${totalDebt}`,
      "==================================================",
      "MONTH-BY-MONTH DETAILED LEDGER:",
      "--------------------------------------------------",
      "Month      | Status    | Invoice | Paid | Debt  | Ref Receipt",
      "-----------|-----------|---------|------|-------|------------"
    ];
    
    records.forEach(r => {
      const due = r.amountDue ?? student.monthlyFee;
      const debt = r.debtAmount ?? Math.max(0, due - r.amountPaid);
      const row = [
        r.month.padEnd(10),
        r.status.padEnd(9),
        (`$${due}`).padEnd(7),
        (`$${r.amountPaid}`).padEnd(4),
        (`$${debt}`).padEnd(5),
        (r.receiptNo || '-')
      ].join(' | ');
      lines.push(row);
    });
    
    lines.push("==================================================");
    lines.push("Issued by Dugsiga Subuc Accounts & Finance Dept.");
    lines.push("All transactions are backed up on local systems.");
    lines.push("==================================================");
    
    const cleanName = student.name.replace(/\s+/g, '_');
    triggerFileDownload(`dugsiga_subuc_${cleanName}_payment_statement_${start}_to_${end}.txt`, lines.join('\n'));
    setFeedbackMsg(`Tuition statement exported successfully!`);
    setTimeout(() => setFeedbackMsg(''), 4500);
  };

  const handleDownloadExamRangeReportTxt = (matchedExamsList: any[]) => {
    const matchClass = examFilterClass === 'All' ? 'Dhamaan' : examFilterClass;
    const matchTeacherName = examFilterTeacher === 'All' ? 'Dhamaan' : (database.teachers.find(t => t.id === examFilterTeacher)?.name || examFilterTeacher);
    
    const lines = [
      "==========================================================",
      "                WARBIXINTA QIIMAYNTA WAALIDKA             ",
      "               DUGSIGA SUBUC ISLAMIC CENTER               ",
      "==========================================================",
      `Taariikhda la soo saaray: ${new Date().toLocaleString()}`,
      `Muddada Warbixinta:     ${examStartDate || 'Bilowgii'} ilaa ${examEndDate || 'Hadda'}`,
      `Fasalka:               ${matchClass}`,
      `Macallinka:            ${matchTeacherName}`,
      "----------------------------------------------------------"
    ];

    if (examStudentFilter !== 'All') {
      const studentObj = database.students.find(s => s.id === examStudentFilter);
      if (studentObj) {
        lines.push(`Ardayga:               ${studentObj.name} (ID: ${studentObj.id})`);
        lines.push("----------------------------------------------------------");
        lines.push("Dhibcaha Qiimaynta Toddobaadlaha (Weekly Progress):");
        lines.push("");

        let studentTotalScore = 0;
        let studentExamCount = 0;

        matchedExamsList.forEach(ex => {
          const sc = ex.scores.find((scoreSc: any) => scoreSc.studentId === studentObj.id);
          if (sc) {
            lines.push(`Taariikhda: ${ex.date} - ${ex.heading}`);
            lines.push(`Week Toddobaad: ${ex.weekNumber || 'N/A'}`);
            
            // Subjects
            Object.entries(sc.scores).forEach(([sub, score]) => {
              lines.push(`  - ${sub}: ${score}%`);
            });
            
            lines.push(`  Dhibicda Toddobaadka:  ${sc.averageScore}% / 100%`);
            lines.push(`  Darajada (Grade):      Grade ${sc.grade}`);
            if (sc.comment) {
              lines.push(`  Ra'yiga Macallinka:    ${sc.comment}`);
            }
            lines.push("----------------------------------------------------------");
            studentTotalScore += sc.averageScore;
            studentExamCount++;
          }
        });

        if (studentExamCount > 0) {
          const finishedAverage = (studentTotalScore / studentExamCount).toFixed(1);
          lines.push(`CELCELISKA GUUD EE ARDAYGA: ${finishedAverage}%`);
        } else {
          lines.push("Ma jiraan dhibco la helay muddadan la doortay.");
        }
      }
    } else {
      lines.push("DHAMAAN ARDAYDA - SPREADSHEET WARBIXIN GUUD:");
      lines.push("");
      
      const filteredStudents = database.students.filter(s => {
        const matchC = examFilterClass === 'All' ? true : s.className === examFilterClass;
        const matchT = examFilterTeacher === 'All' ? true : s.teacherId === examFilterTeacher;
        return s.active && matchC && matchT;
      });

      filteredStudents.forEach(s => {
        lines.push(`Magaca Ardayga: ${s.name} (ID: ${s.id})`);
        let totalVal = 0;
        let cntVal = 0;
        const commentsList: string[] = [];

        matchedExamsList.forEach(ex => {
          const sc = ex.scores.find((scoreSc: any) => scoreSc.studentId === s.id);
          if (sc) {
            totalVal += sc.averageScore;
            cntVal++;
            if (sc.comment) {
              commentsList.push(`Wiigga ${ex.weekNumber || ''}: ${sc.comment}`);
            }
          }
        });

        if (cntVal > 0) {
          lines.push(`  Celceliska Dhibcaha: ${(totalVal / cntVal).toFixed(1)}%`);
          lines.push(`  Tirada Qiimaynta:    ${cntVal}`);
          if (commentsList.length > 0) {
            lines.push("  Faallooyinka la qoray:");
            commentsList.forEach(c => lines.push(`     * ${c}`));
          }
        } else {
          lines.push("  Ma hayo dhibco ku qoran muddadan.");
        }
        lines.push("----------------------------------------------------------");
      });
    }

    lines.push("");
    lines.push("==========================================================");
    lines.push("Warbixintan waxaa loo soo saaray hab otomaatig ah.");
    lines.push("Subuc Management System - Xarafa Saxan iyo Xifdi Sugan");
    lines.push("==========================================================");

    triggerFileDownload(`Warbixinta_Qiimaynta_${examStudentFilter === 'All' ? 'Dhamaan' : 'Arday'}_${examStartDate || 'bilow'}__${examEndDate || 'dhamaad'}.txt`, lines.join('\n'));
    setFeedbackMsg(`Warbixinta Qiimaynta waa la soo dejiyay! (Download Complete)`);
    setTimeout(() => setFeedbackMsg(''), 4050);
  };

  const handleDownloadPaymentRangePDF = (studentId: string, start: string, end: string) => {
    const report = getStudentPaymentRangeReport(studentId, start, end);
    if (!report) return;
    
    const { student, records, totalDue, totalPaid, totalDebt } = report;
    
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });
    
    doc.setProperties({
      title: `Warbixinta Lacag-bixinta Dugsiga Subuc - ${student.name}`,
      subject: 'Warbixinta Khidmadda Ardayga ee Muddada la doortay',
      author: 'Dugsiga Subuc',
      keywords: 'warbixinta, biilka, deynta, dugsiga subuc'
    });
    
    // Header Title
    doc.setTextColor(33, 84, 61); // deep green (#21543d)
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(22);
    doc.text("DUGSIGA SUBUC", 15, 24);
    
    doc.setFontSize(9);
    doc.setFont("Helvetica", "bold");
    doc.setTextColor(43, 92, 67); // Green motto
    doc.text("XARAF SAXAN IYO XIFDI SUGAN  |  Dugsiga Subuc", 15, 30);
    
    doc.setFontSize(9);
    doc.setFont("Helvetica", "normal");
    doc.setTextColor(100, 116, 139); // slate-500
    doc.text("Diiwaanka Rasmiga ah ee Khidmadda Ardayga ee Muddada la doortay", 15, 35);
    
    // Divider line
    doc.setDrawColor(203, 213, 225); // slate-300
    doc.setLineWidth(0.5);
    doc.line(15, 40, 195, 40);
    
    // Student Metadata Box
    doc.setFillColor(248, 250, 252); // slate-50
    doc.roundedRect(15, 44, 180, 26, 2, 2, "F");
    
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text("MACLUUMAADKA ARDAYGA", 20, 50);
    doc.text("MUDDADA WARBIXINTA", 110, 50);
    doc.text("TAARIIKHDA LA LASOO BAXAY", 155, 50);
    
    doc.setFontSize(10);
    doc.setTextColor(30, 41, 59);
    doc.text(student.name, 20, 56);
    doc.text(`${start} ilaa ${end}`, 110, 56);
    doc.text(new Date().toLocaleDateString(), 155, 56);
    
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text(`Fasalka: ${student.className}`, 20, 62);
    doc.text(`Taleefanka Waalidka: ${student.parentPhone}`, 110, 62);
    
    // Financial Position Summary
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text("KOOBANNAANTA XAALADDA LACAGEED", 15, 80);
    
    // Draw 3 Summary Cards
    // Invoiced Box
    doc.setFillColor(241, 245, 249);
    doc.rect(15, 84, 56, 16, "F");
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text("BIILKA GUUD", 19, 89);
    doc.setFontSize(12);
    doc.setTextColor(30, 41, 59);
    doc.text(`$${Number(totalDue).toFixed(2)}`, 19, 95);
    
    // Deposited Box
    doc.setFillColor(209, 250, 229); // light green
    doc.rect(77, 84, 56, 16, "F");
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(4, 120, 87);
    doc.text("GUUD LA BIXIYAY", 81, 89);
    doc.setFontSize(12);
    doc.setTextColor(5, 150, 105);
    doc.text(`$${Number(totalPaid).toFixed(2)}`, 81, 95);
    
    // Remaining Debt Box
    doc.setFillColor(254, 226, 226); // light red
    doc.rect(139, 84, 56, 16, "F");
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(185, 28, 28);
    doc.text("DEYNTA HASHAY", 143, 89);
    doc.setFontSize(12);
    doc.setTextColor(220, 38, 38);
    doc.text(`$${Number(totalDebt).toFixed(2)}`, 143, 95);
    
    // Detailed Table Title
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text("FAAHFAAHINTA BISHII EE LACAG-BIXINTA", 15, 112);
    
    // Table Headers
    const startTableY = 116;
    doc.setFillColor(22, 101, 52); // Dark Green primary header
    doc.rect(15, startTableY, 180, 8, "F");
    
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(255, 255, 255);
    doc.text("Bisha Xisaabinta", 19, startTableY + 5.5);
    doc.text("Lacagta la rabo", 55, startTableY + 5.5);
    doc.text("La Bixiyay", 85, startTableY + 5.5);
    doc.text("Deynta Hartay", 115, startTableY + 5.5);
    doc.text("Heerka bixinta", 145, startTableY + 5.5);
    doc.text("Tirada Rasiidka", 170, startTableY + 5.5);
    
    let rowY = startTableY + 8;
    
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(9);
    
    records.forEach((r, idx) => {
      const due = r.amountDue ?? student.monthlyFee;
      const debt = r.debtAmount ?? Math.max(0, due - r.amountPaid);
      
      // Zebra striping
      if (idx % 2 === 1) {
        doc.setFillColor(248, 250, 252);
        doc.rect(15, rowY, 180, 7.5, "F");
      }
      
      doc.setDrawColor(241, 245, 249);
      doc.line(15, rowY + 7.5, 195, rowY + 7.5);
      
      doc.setTextColor(15, 23, 42);
      doc.setFont("Helvetica", "bold");
      doc.text(r.month, 19, rowY + 5);
      doc.setFont("Helvetica", "normal");
      doc.text(`$${Number(due).toFixed(2)}`, 55, rowY + 5);
      doc.setTextColor(4, 120, 87);
      doc.text(`$${Number(r.amountPaid).toFixed(2)}`, 85, rowY + 5);
      doc.setTextColor(debt > 0 ? 185 : 15, debt > 0 ? 28 : 23, debt > 0 ? 28 : 42);
      doc.text(`$${Number(debt).toFixed(2)}`, 115, rowY + 5);
      
      // Status Pill
      doc.setFont("Helvetica", "bold");
      if (r.status === 'Paid') {
        doc.setTextColor(4, 120, 87);
        doc.text("La Bixiyay", 145, rowY + 5);
      } else if (r.status === 'Partial') {
        doc.setTextColor(180, 83, 9);
        doc.text("Qeyb Kamid Ah", 145, rowY + 5);
      } else {
        doc.setTextColor(220, 38, 38);
        doc.text("Aan la Bixin", 145, rowY + 5);
      }
      
      doc.setTextColor(100, 116, 139);
      doc.setFont("Helvetica", "normal");
      doc.text(r.receiptNo || '-', 170, rowY + 5);
      
      rowY += 7.5;
    });
    
    // Attestation & Footer
    const certY = Math.max(rowY + 15, 185);
    doc.setDrawColor(203, 213, 225);
    doc.line(15, certY + 15, 90, certY + 15);
    doc.line(120, certY + 15, 195, certY + 15);
    
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text("Hubinta Khasajiga Mas'uulka ah", 15, certY + 19);
    doc.text("Saxiixa Agaasimaha Waxbarashada", 195, certY + 19, { align: "right" });
    
    doc.text("WARBIXINTA RASMIGA AH EE DUGSIGA SUBUC  |  Xafiiska Maamulka Garowe", 105, 285, { align: "center" });
    
    const cleanName = student.name.replace(/\s+/g, '_');
    doc.save(`dugsiga_subuc_${cleanName}_tuition_ledger.pdf`);
    
    setFeedbackMsg(`PDF Statement sheet exported!`);
    setTimeout(() => setFeedbackMsg(''), 4500);
  };

  // Download logic for entire selected class or general attendance summary
  const handleDownloadWholeAttendance = () => {
    const textReport = generateAttendanceSummaryReport(reportStartDate, reportEndDate, reportClassSelection, database);
    triggerFileDownload(`dugsiga_subuc_attendance_summary_${reportStartDate}_to_${reportEndDate}.txt`, textReport);
    setFeedbackMsg(`Attendance summary generated! Please save to your laptop storage folder e.g. D:\\DugsigaSubucReports\\`);
    setTimeout(() => setFeedbackMsg(''), 5000);
  };

  // Download logic for single student history
  const handleDownloadStudentAttendance = () => {
    if (!reportSelectedStudentId) {
      alert("Please select a student first!");
      return;
    }
    const student = database.students.find(s => s.id === reportSelectedStudentId);
    const sName = student ? student.name.replace(/\s+/g, '_') : 'student';
    const textReport = generateStudentAttendanceHistoryReport(reportSelectedStudentId, reportStartDate, reportEndDate, database);
    triggerFileDownload(`dugsiga_subuc_${sName}_attendance_${reportStartDate}_to_${reportEndDate}.txt`, textReport);
    setFeedbackMsg(`Student attendance journal compiled! Save report securely.`);
    setTimeout(() => setFeedbackMsg(''), 5000);
  };

  // -------------------------------------------------------------
  // CUSTOM INVOICE CENTER & RECIPIENT BILLING (PARENTS & BUSINESSES)
  // -------------------------------------------------------------
  const [billingSubTab, setBillingSubTab] = useState<'fees' | 'custom_invoices'>('fees');
  const [showInvoiceModal, setShowInvoiceModal] = useState<boolean>(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [showInvoiceReceipt, setShowInvoiceReceipt] = useState<Invoice | null>(null);
  const [invoiceSearch, setInvoiceSearch] = useState<string>('');
  const [invoiceTypeFilter, setInvoiceTypeFilter] = useState<'all' | 'parent' | 'business'>('all');
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState<'all' | 'Paid' | 'Unpaid' | 'Partial'>('all');

  // Interactive Form States
  const [invFormRecipientType, setInvFormRecipientType] = useState<'parent' | 'business'>('parent');
  const [invFormRecipientName, setInvFormRecipientName] = useState<string>('');
  const [invFormRecipientPhone, setInvFormRecipientPhone] = useState<string>('');
  const [invFormRecipientEmail, setInvFormRecipientEmail] = useState<string>('');
  const [invFormStudentId, setInvFormStudentId] = useState<string>('');
  const [invFormStudentIds, setInvFormStudentIds] = useState<string[]>([]);
  const [invStudentSearchTerm, setInvStudentSearchTerm] = useState<string>('');
  const [invFormDate, setInvFormDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [invFormDueDate, setInvFormDueDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split('T')[0];
  });
  const [invFormItems, setInvFormItems] = useState<{ id: string; description: string; quantity: number; unitPrice: number }[]>([
    { id: '1', description: '', quantity: 1, unitPrice: 0 }
  ]);
  const [invFormNotes, setInvFormNotes] = useState<string>('');
  const [invFormStatus, setInvFormStatus] = useState<'Paid' | 'Unpaid' | 'Partial'>('Unpaid');
  const [invFormAmountPaid, setInvFormAmountPaid] = useState<number>(0);

  const handleOpenCreateInvoice = () => {
    setEditingInvoice(null);
    setInvFormRecipientType('parent');
    setInvFormRecipientName('');
    setInvFormRecipientPhone('');
    setInvFormRecipientEmail('');
    setInvFormStudentId('');
    setInvFormStudentIds([]);
    setInvStudentSearchTerm('');
    setInvFormDate(new Date().toISOString().split('T')[0]);
    const d = new Date();
    d.setDate(d.getDate() + 30);
    setInvFormDueDate(d.toISOString().split('T')[0]);
    setInvFormItems([{ id: '1', description: '', quantity: 1, unitPrice: 0 }]);
    setInvFormNotes('');
    setInvFormStatus('Unpaid');
    setInvFormAmountPaid(0);
    setShowInvoiceModal(true);
  };

  const handleOpenEditInvoice = (invoice: Invoice) => {
    setEditingInvoice(invoice);
    setInvFormRecipientType(invoice.recipientType);
    setInvFormRecipientName(invoice.recipientName);
    setInvFormRecipientPhone(invoice.recipientPhone);
    setInvFormRecipientEmail(invoice.recipientEmail || '');
    setInvFormStudentId(invoice.studentId || '');
    // Parse multiple values if comma-separated
    const ids = invoice.studentId ? invoice.studentId.split(', ').map(s => s.trim()).filter(Boolean) : [];
    setInvFormStudentIds(ids);
    setInvStudentSearchTerm('');
    setInvFormDate(invoice.date);
    setInvFormDueDate(invoice.dueDate);
    setInvFormItems(invoice.items.map(item => ({
      id: item.id,
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unitPrice
    })));
    setInvFormNotes(invoice.notes || '');
    setInvFormStatus(invoice.status);
    setInvFormAmountPaid(invoice.amountPaid);
    setShowInvoiceModal(true);
  };

  const handleSaveInvoice = (e: React.FormEvent) => {
    e.preventDefault();

    if (invFormRecipientType === 'parent' && invFormStudentIds.length === 0) {
      setFeedbackMsg("Fadlan dooro ugu yaraan hal arday! (Please select at least one student)");
      setTimeout(() => setFeedbackMsg(''), 4050);
      return;
    }
    
    // Ensure accurate totals
    const totalAmount = invFormItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
    
    // Auto-resolve status based on paid amount
    let status: 'Paid' | 'Unpaid' | 'Partial' = invFormStatus;
    if (invFormAmountPaid === 0) {
      status = 'Unpaid';
    } else if (invFormAmountPaid >= totalAmount) {
      status = 'Paid';
    } else {
      status = 'Partial';
    }

    // Resolve student info if recipient is parent
    let mappedStudentName = '';
    let mappedStudentId = '';
    if (invFormRecipientType === 'parent' && invFormStudentIds.length > 0) {
      const selectedStuds = database.students.filter(s => invFormStudentIds.includes(s.id));
      mappedStudentName = selectedStuds.map(s => s.name).join(', ');
      mappedStudentId = selectedStuds.map(s => s.id).join(', ');
    }

    const itemsWithTotals = invFormItems.map(item => ({
      ...item,
      total: item.quantity * item.unitPrice
    }));

    if (editingInvoice) {
      // Editing
      const idx = (database.invoices || []).findIndex(inv => inv.id === editingInvoice.id);
      const updatedInv: Invoice = {
        ...editingInvoice,
        recipientType: invFormRecipientType,
        recipientName: invFormRecipientName,
        recipientPhone: invFormRecipientPhone,
        recipientEmail: invFormRecipientEmail || undefined,
        studentId: invFormRecipientType === 'parent' ? (mappedStudentId || undefined) : undefined,
        studentName: invFormRecipientType === 'parent' ? (mappedStudentName || undefined) : undefined,
        date: invFormDate,
        dueDate: invFormDueDate,
        items: itemsWithTotals,
        totalAmount,
        amountPaid: invFormAmountPaid,
        status,
        notes: invFormNotes || undefined,
        createdAt: editingInvoice.createdAt || new Date().toISOString()
      };
      
      const newInvoices = [...(database.invoices || [])];
      if (idx !== -1) {
        newInvoices[idx] = updatedInv;
      } else {
        newInvoices.push(updatedInv);
      }

      const syncedBilling = syncInvoiceToBilling(updatedInv, [...database.billing], database.students);
      onSaveDatabase({
        ...database,
        billing: syncedBilling,
        invoices: newInvoices
      });

      setFeedbackMsg(`Biilka ${updatedInv.invoiceNo} waa la cusboonaysiiyay!`);
    } else {
      // Creating
      const ticketNum = (database.invoices?.length || 0) + 1001;
      const invoiceNo = `BJ-INV-${ticketNum}`;
      const newInv: Invoice = {
        id: `INV-${Date.now()}`,
        invoiceNo,
        recipientType: invFormRecipientType,
        recipientName: invFormRecipientName,
        recipientPhone: invFormRecipientPhone,
        recipientEmail: invFormRecipientEmail || undefined,
        studentId: invFormRecipientType === 'parent' ? (mappedStudentId || undefined) : undefined,
        studentName: invFormRecipientType === 'parent' ? (mappedStudentName || undefined) : undefined,
        date: invFormDate,
        dueDate: invFormDueDate,
        items: itemsWithTotals,
        totalAmount,
        amountPaid: invFormAmountPaid,
        status,
        notes: invFormNotes || undefined,
        createdBy: "yaxyecabdisalanmohamed1234@gmail.com",
        createdAt: new Date().toISOString()
      };

      const syncedBilling = syncInvoiceToBilling(newInv, [...database.billing], database.students);
      onSaveDatabase({
        ...database,
        billing: syncedBilling,
        invoices: [...(database.invoices || []), newInv]
      });

      setFeedbackMsg(`Biilka ${invoiceNo} waa la soo saaray!`);
    }

    setTimeout(() => setFeedbackMsg(''), 4050);
    setShowInvoiceModal(false);
    setEditingInvoice(null);
  };

  const handleDeleteInvoice = (id: string, invoiceNo: string) => {
    setConfirmModal({
      isOpen: true,
      title: "Ma hubaal baa?",
      message: `Ma hubaal baa inaad kobta ka tirtirto biilka/invoice-ka ${invoiceNo}? Kulankan laguma soo celin karo dib!`,
      accentColor: 'rose',
      onConfirm: () => {
        const updated = (database.invoices || []).filter(inv => inv.id !== id);
        const updatedBilling = database.billing.filter(b => {
          return !(b.notes && b.notes.includes(`Synced from invoice ${invoiceNo}`));
        });
        onSaveDatabase({
          ...database,
          billing: updatedBilling,
          invoices: updated
        });
        setConfirmModal(null);
        setFeedbackMsg(`Biilka ${invoiceNo} si guul ah ayaa loo tirtiray.`);
        setTimeout(() => setFeedbackMsg(''), 4050);
      }
    });
  };

  const getFirstNamesOnly = (namesString?: string) => {
    if (!namesString) return '';
    return namesString.split(',').map(name => {
      const trimmed = name.trim();
      return trimmed.split(/\s+/)[0] || trimmed;
    }).join(', ');
  };

  const handleDownloadInvoiceText = (invoice: Invoice) => {
    const lines = [
      "==================================================",
      "                 DUGSIGA SUBUC                    ",
      "             INVOICE / BIIL RASMI AH              ",
      "==================================================",
      `Tirada Invoice-ka:   ${invoice.invoiceNo}`,
      `Taariikhda la soo:  ${invoice.date}`,
      `Nooca Macmiilka:    ${invoice.recipientType === 'parent' ? 'WAALIDKA' : 'SHIRKAD/GANACSI'}`,
      "--------------------------------------------------",
      `Macmiilka:          ${invoice.recipientName}`,
      `Telefoonka:         ${invoice.recipientPhone}`,
      invoice.recipientEmail ? `Email-ka:           ${invoice.recipientEmail}` : '',
      invoice.studentName ? `Ardayga:            ${getFirstNamesOnly(invoice.studentName)}` : '',
      "--------------------------------------------------",
      "WAXAA LAYGU LEEYAHAY:",
      ...invoice.items.map((it, idx) => 
        `${idx + 1}. ${it.description.padEnd(20)} | Tiro: ${it.quantity} | Qiimaha: $${it.unitPrice.toFixed(2)} | Isu-geyn: $${it.total.toFixed(2)}`
      ),
      "--------------------------------------------------",
      `Lacagta Guud:       $${invoice.totalAmount.toFixed(2)}`,
      `Lacagta la bixiyay: $${invoice.amountPaid.toFixed(2)}`,
      `Deynta Hartay:      $${(invoice.totalAmount - invoice.amountPaid).toFixed(2)}`,
      `Heerka Invoice-ka:   ${invoice.status === 'Paid' ? 'WAA LA BIXIYAY' : invoice.status === 'Partial' ? 'QEYB BAA LA BIXIYAY' : 'LAMA BIXIN'}`,
      "--------------------------------------------------",
      invoice.notes ? `Faallooyinka:       ${invoice.notes}` : '',
      "==================================================",
      "Waxaa soo saaray Xafiiska Maamulka Dugsiga Subuc.",
      "Waad ku mahadsan tahay wada-shaqeynta rasmiga ah.",
      "=================================================="
    ].filter(Boolean).join('\n');

    const cleanName = invoice.recipientName.replace(/\s+/g, '_');
    const filename = `subuc_invoice_${invoice.invoiceNo}_${cleanName}.txt`;
    triggerFileDownload(filename, lines);
    
    setFeedbackMsg(`Biilka waxaa loo soo dajiyay TXT ahaan si guul ah.`);
    setTimeout(() => setFeedbackMsg(''), 4050);
  };

  const handleDownloadInvoicePDF = (invoice: Invoice) => {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    doc.setProperties({
      title: `Invoice Dugsiga Subuc - ${invoice.recipientName} - ${invoice.invoiceNo}`,
      subject: 'Custom Invoice',
      author: 'Dugsiga Subuc',
    });

    // Header Title
    doc.setTextColor(33, 84, 61); // deep green (#21543d)
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(22);
    doc.text("DUGSIGA SUBUC", 20, 24);

    // Green subtitle
    doc.setFontSize(9);
    doc.setFont("Helvetica", "bold");
    doc.setTextColor(43, 92, 67); // Green
    doc.text("Xafiiska Maamulka Garowe", 20, 30);

    // Subtitle
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139); // slate-500
    doc.text("INVOICE / BIIL RASMI AH OO QAAS AH", 20, 35);

    // Elegant divider line
    doc.setDrawColor(203, 213, 225); // slate-300
    doc.setLineWidth(0.5);
    doc.line(20, 42, 190, 42);

    // Metadata labels
    doc.setFontSize(9);
    doc.setFont("Helvetica", "bold");
    doc.setTextColor(100, 116, 139); // slate-500
    doc.text("TIRADA INVOICE-KA", 20, 52);
    doc.text("TAARIIKHDA LA SOO SAARAY", 100, 52);

    doc.setFont("Helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(30, 41, 59); // slate-800
    doc.text(invoice.invoiceNo, 20, 58);
    doc.text(invoice.date, 100, 58);

    // Second level metadata (Recipient info)
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text("MAGACA MACMIILKA", 20, 68);
    doc.text("TELEFOONKA", 100, 68);
    doc.text("NOOCA MACMIILKA", 190, 68, { align: "right" });

    doc.setFont("Helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(30, 41, 59);
    doc.text(invoice.recipientName, 20, 74);
    doc.text(invoice.recipientPhone, 100, 74);
    doc.text(invoice.recipientType === 'parent' ? "WAALIDKA" : "SHIRKAD/HERO", 190, 74, { align: "right" });

    // Parent details if applicable
    if (invoice.studentName) {
      doc.setFont("Helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(100, 116, 139);
      doc.text(`Ardayga: ${getFirstNamesOnly(invoice.studentName)}`, 20, 80);
    }

    // Divider
    doc.setDrawColor(241, 245, 249);
    doc.line(20, 85, 190, 85);

    // Table Header
    doc.setFillColor(248, 250, 252); // slate-50
    doc.rect(20, 88, 170, 8, "F");
    
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105); // slate-600
    doc.text("TR", 24, 93);
    doc.text("FAAHFAAHINTA ADEEGA", 40, 93);
    doc.text("TIRO", 125, 93, { align: "right" });
    doc.text("QIIMAHA", 145, 93, { align: "right" });
    doc.text("ISU-GEYN ($)", 180, 93, { align: "right" });

    let currentY = 101;
    invoice.items.forEach((item, index) => {
      // Draw background stripe alternatively
      if (index % 2 === 1) {
        doc.setFillColor(252, 252, 252);
        doc.rect(20, currentY - 4, 170, 7, "F");
      }

      doc.setFont("Helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(30, 41, 59);
      
      doc.text(String(index + 1), 24, currentY);
      doc.text(item.description, 40, currentY);
      doc.text(String(item.quantity), 125, currentY, { align: "right" });
      doc.text(`$${item.unitPrice.toFixed(2)}`, 145, currentY, { align: "right" });
      doc.text(`$${item.total.toFixed(2)}`, 180, currentY, { align: "right" });

      currentY += 7;
    });

    // Subtotal section
    currentY += 5;
    doc.setDrawColor(226, 232, 240); // slate-200
    doc.line(20, currentY, 190, currentY);

    currentY += 7;
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text("LACAGTA GUUD:", 130, currentY);
    doc.setFont("Helvetica", "bold");
    doc.setTextColor(15, 23, 42);
    doc.text(`$${invoice.totalAmount.toFixed(2)}`, 190, currentY, { align: "right" });

    currentY += 6;
    doc.setFont("Helvetica", "normal");
    doc.setTextColor(100, 116, 139);
    doc.text("LA BIXIYAY:", 130, currentY);
    doc.setFont("Helvetica", "bold");
    doc.setTextColor(16, 122, 87); // green-700
    doc.text(`$${invoice.amountPaid.toFixed(2)}`, 190, currentY, { align: "right" });

    currentY += 6;
    doc.setFont("Helvetica", "normal");
    doc.setTextColor(100, 116, 139);
    doc.text("DEYNTA HARTAY:", 130, currentY);
    doc.setFont("Helvetica", "bold");
    doc.setTextColor(185, 28, 28); // red-700
    const balance = invoice.totalAmount - invoice.amountPaid;
    doc.text(`$${balance.toFixed(2)}`, 190, currentY, { align: "right" });

    // Status stamp box
    currentY += 15;
    doc.setDrawColor(148, 163, 184); // slate-400
    doc.setFillColor(255, 255, 255);
    doc.setLineWidth(0.4);
    doc.rect(20, currentY, 40, 15);
    
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text("HEERKA BIILKA", 23, currentY + 4);
    
    doc.setFontSize(9);
    if (invoice.status === 'Paid') {
      doc.setTextColor(16, 122, 87); // Green
      doc.text("WAA LA BIXIYAY", 23, currentY + 10);
    } else if (invoice.status === 'Partial') {
      doc.setTextColor(194, 120, 3); // Amber
      doc.text("QEYB BAA LA BIXIYAY", 23, currentY + 10);
    } else {
      doc.setTextColor(185, 28, 28); // Red
      doc.text("LAMA BIXIN", 23, currentY + 10);
    }

    if (invoice.notes) {
      doc.setFont("Helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(100, 116, 139);
      doc.text(`Faallo: ${invoice.notes}`, 70, currentY + 5, { maxWidth: 110 });
    }

    // Footer
    doc.setDrawColor(241, 245, 249);
    doc.line(20, 268, 190, 268);
    
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text("Waxaa soo saaray Xafiiska Maamulka ee Dugsiga Subuc & Akadeemiyada Tajweedka.", 20, 274);
    doc.text(`Kala xiriir: 0904819955 | ${new Date().toLocaleString()}`, 20, 278);

    const cleanName = invoice.recipientName.replace(/\s+/g, '_');
    doc.save(`subuc_invoice_${invoice.invoiceNo}_${cleanName}.pdf`);

    setFeedbackMsg(`Biilka waxaa loo daabacay PDF ahaan si guul ah.`);
    setTimeout(() => setFeedbackMsg(''), 4050);
  };

  // -------------------------------------------------------------
  // TAB 5: BILLING CENTER & PAYMENT VOUCHERS
  // -------------------------------------------------------------
  const [selectedBillingMonth, setSelectedBillingMonth] = useState(() => {
    const today = new Date();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    return `${today.getFullYear()}-${mm}`;
  });
  const [billingSearch, setBillingSearch] = useState('');

  const getBillingStatusForStudent = (student: Student, monthString: string): BillingRecord => {
    const keyId = `B-${monthString}-${student.id}`;
    const record = database.billing.find(b => b.id === keyId || (b.studentId === student.id && b.month === monthString));
    if (record) return record;

    // Default Unpaid Record Object
    return {
      id: `B-${monthString}-${student.id}`,
      studentId: student.id,
      studentName: student.name,
      className: student.className,
      month: monthString,
      amountPaid: 0,
      amountDue: student.monthlyFee,
      debtAmount: student.monthlyFee,
      status: 'Unpaid',
      busFeeDue: student.busFee || 0,
      busFeePaid: 0
    };
  };

  const handleOpenPayModal = (student: Student) => {
    const record = getBillingStatusForStudent(student, selectedBillingMonth);
    setShowPayModal(student);
    setPayAmountDue(record.amountDue ?? student.monthlyFee);
    setPayAmountPaid(record.status === 'Unpaid' ? (record.amountDue ?? student.monthlyFee) : record.amountPaid);
    setPayBusFeeDue(record.busFeeDue ?? (student.busFee || 0));
    setPayBusFeePaid(record.status === 'Unpaid' ? (record.busFeeDue ?? (student.busFee || 0)) : (record.busFeePaid ?? 0));
    setPayNotes(record.notes ?? '');
  };

  const handleSavePaymentDetails = (e: React.FormEvent) => {
    e.preventDefault();
    if (!showPayModal) return;

    const student = showPayModal;
    const recordId = `B-${selectedBillingMonth}-${student.id}`;
    const dateToday = new Date().toISOString().split('T')[0];
    const serial = `REC-${selectedBillingMonth.replace('-', '')}-${student.id.replace('BJ-', '').replace('DS', '')}`;

    const parsedDue = Number(payAmountDue);
    const parsedPaid = Number(payAmountPaid);
    const parsedBusDue = Number(payBusFeeDue);
    const parsedBusPaid = Number(payBusFeePaid);

    const tuitionDebt = Math.max(0, parsedDue - parsedPaid);
    const busDebt = Math.max(0, parsedBusDue - parsedBusPaid);
    const remainingDebt = tuitionDebt + busDebt;

    const totalDue = parsedDue + parsedBusDue;
    const totalPaid = parsedPaid + parsedBusPaid;

    let statusVal: 'Paid' | 'Unpaid' | 'Partial' = 'Unpaid';
    if (totalPaid >= totalDue && totalDue > 0) {
      statusVal = 'Paid';
    } else if (totalPaid > 0) {
      statusVal = 'Partial';
    }

    const updatedPayment: BillingRecord = {
      id: recordId,
      studentId: student.id,
      studentName: student.name,
      className: student.className,
      month: selectedBillingMonth,
      amountDue: parsedDue,
      amountPaid: parsedPaid,
      debtAmount: remainingDebt,
      busFeeDue: parsedBusDue,
      busFeePaid: parsedBusPaid,
      paymentDate: totalPaid > 0 ? dateToday : undefined,
      receiptNo: totalPaid > 0 ? serial : undefined,
      status: statusVal,
      notes: payNotes.trim()
    };

    const cleanBilling = database.billing.filter(b => b.id !== recordId);

    const paymentNotification: AppNotification = {
      id: `noti-${Date.now()}`,
      type: 'payment',
      senderId: 'admin',
      senderName: 'Admin',
      senderRole: 'admin',
      message: `Admin processing payment for "${student.name}" (Paid $${parsedPaid}, status is "${statusVal}").`,
      timestamp: new Date().toISOString(),
      readBy: ['admin'],
      targetClass: student.className
    };

    const updatedNotifs = [paymentNotification, ...(database.notifications || [])].slice(0, 100);

    onSaveDatabase({
      ...database,
      billing: [...cleanBilling, updatedPayment],
      notifications: updatedNotifs
    });

    setShowPayModal(null);
    setFeedbackMsg(`Payment details processed for ${student.name}: Paid $${parsedPaid}, remaining debt $${remainingDebt}`);
    setTimeout(() => setFeedbackMsg(''), 4050);
  };

  const handleDeleteBillingRecord = (recordId: string, studentName: string) => {
    setConfirmModal({
      isOpen: true,
      title: "Reset Payment Record?",
      message: `Are you sure you want to delete and reset the tuition payment record for ${studentName}? This will revert student status to Unpaid.`,
      accentColor: 'rose',
      onConfirm: () => {
        const updatedBilling = database.billing.filter(b => b.id !== recordId);
        onSaveDatabase({
          ...database,
          billing: updatedBilling
        });
        setFeedbackMsg(`Successfully deleted payment record for ${studentName}.`);
        setTimeout(() => setFeedbackMsg(''), 3000);
        setConfirmModal(null);
      }
    });
  };

  const handleDownloadReceiptText = (record: BillingRecord) => {
    const student = database.students.find(s => s.id === record.studentId);
    const amountDue = record.amountDue ?? (student?.monthlyFee ?? 35);
    const debtAmount = record.debtAmount ?? Math.max(0, amountDue - record.amountPaid);
    const hasBusFee = (Number(record.busFeeDue || 0) > 0 || Number(record.busFeePaid || 0) > 0);
    const totalPaid = Number(record.amountPaid) + Number(record.busFeePaid || 0);

    const invoiceLines = [
      `Lacagta bisha ee laga rabo (Tuition Due):  $${Number(amountDue).toFixed(2)} USD`,
      `Lacagta bisha ee la bixiyay (Tuition Paid): $${Number(record.amountPaid).toFixed(2)} USD`
    ];

    if (hasBusFee) {
      invoiceLines.push(`Lacagta baska ee laga rabo (Bus Due):      $${Number(record.busFeeDue || 0).toFixed(2)} USD`);
      invoiceLines.push(`Lacagta baska ee la bixiyay (Bus Paid):     $${Number(record.busFeePaid || 0).toFixed(2)} USD`);
    }

    invoiceLines.push(`Total Amount Paid (Guud ahaan):        $${Number(totalPaid).toFixed(2)} USD`);
    invoiceLines.push(`Remaining Debt (Haraaga Deynta):       $${Number(debtAmount).toFixed(2)} USD`);
    
    const lines = [
      "==================================================",
      "                 DUGSIGA SUBUC                    ",
      "      Rasiidka Lacag-bixinta Rasmiga ah ee Ardayga ",
      "==================================================",
      `Tirada Rasiidka:    ${record.receiptNo || 'may'}`,
      `Taariikhda Bixinta: ${record.paymentDate || 'may'}`,
      `Muddada Biilka:     ${record.month}`,
      "--------------------------------------------------",
      `Magaca Ardayga:     ${record.studentName}`,
      `ID-ga Ardayga:      ${record.studentId}`,
      `Fasalka:            ${record.className}`,
      "--------------------------------------------------",
      ...invoiceLines,
      `Heerka Rasiidka:    ${record.status === 'Paid' ? 'WAA LA BIXIYAY' : record.status === 'Partial' ? 'QEYB BAA LA BIXIYAY' : 'LAMA BIXIN'}`,
      "--------------------------------------------------",
      `Faallooyinka Maamulka: ${record.notes || 'Ma jiraan'}`,
      "==================================================",
      "Waxaa soo saaray Xafiiska Maamulka Dugsiga Subuc.",
      "Waad ku mahadsan tahay dadaalkaaga waxbarasho.",
      "=================================================="
    ].join('\n');

    const cleanName = record.studentName.replace(/\s+/g, '_');
    const filename = `subuc_receipt_${record.month}_${cleanName}.txt`;
    triggerFileDownload(filename, lines);
    
    setFeedbackMsg(`Receipt exported successfully as ${filename}!`);
    setTimeout(() => setFeedbackMsg(''), 4050);
  };

  const handleDownloadReceiptPDF = (record: BillingRecord) => {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });
    
    const student = database.students.find(s => s.id === record.studentId);
    const amountDue = record.amountDue ?? (student?.monthlyFee ?? 35);
    const debtAmount = record.debtAmount ?? Math.max(0, amountDue - record.amountPaid);
    const hasBusFee = (Number(record.busFeeDue || 0) > 0 || Number(record.busFeePaid || 0) > 0);
    const totalCollected = Number(record.amountPaid) + Number(record.busFeePaid || 0);

    doc.setProperties({
      title: `Dugsiga Subuc Receipt - ${record.studentName} - ${record.month}`,
      subject: 'Payment Receipt',
      author: 'Dugsiga Subuc',
      keywords: 'receipt, payment, dugsiga subuc'
    });

    // Header Title
    doc.setTextColor(33, 84, 61); // deep green (#21543d)
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(22);
    doc.text("DUGSIGA SUBUC", 20, 24);

    // Arabic and tagline
    doc.setFontSize(9);
    doc.setFont("Helvetica", "bold");
    doc.setTextColor(43, 92, 67); // Green motto
    doc.text("Xafiiska Maamulka Garowe", 20, 30);

    // Subtitle
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139); // slate-500
    doc.text("RASIIDKA RASMIGA AH EE LACAG-BIXINTA ARDAYGA", 20, 35);
    doc.text("Xafiiska Maamulka Garowe", 190, 32, { align: "right" });

    // Elegant divider line
    doc.setDrawColor(203, 213, 225); // slate-300
    doc.setLineWidth(0.5);
    doc.line(20, 42, 190, 42);

    // Metadata labels & content
    doc.setFontSize(9);
    doc.setFont("Helvetica", "bold");
    doc.setTextColor(100, 116, 139); // slate-500
    doc.text("TIRADA RASIIDKA", 20, 52);
    doc.text("TAARIIKHDA BIXINTA", 190, 52, { align: "right" });

    doc.setFont("Helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(30, 41, 59); // slate-800
    doc.text(record.receiptNo || "may", 20, 58);
    doc.text(record.paymentDate || "may", 190, 58, { align: "right" });

    // Second level metadata
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139); // slate-500
    doc.text("FAAHFAAHINTA ARDAYGA", 20, 70);
    doc.text("FASALKA", 190, 70, { align: "right" });

    doc.setFont("Helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(30, 41, 59); // slate-800
    doc.text(record.studentName, 20, 76);
    doc.text(record.className, 190, 76, { align: "right" });

    // Grey background box for billing details
    const boxHeight = hasBusFee ? 74 : 54;
    doc.setFillColor(248, 250, 252); // slate-50
    doc.roundedRect(20, 86, 170, boxHeight, 3, 3, "F");
    doc.setDrawColor(241, 245, 249); // slate-100
    doc.roundedRect(20, 86, 170, boxHeight, 3, 3, "S");

    let currentY = 94;
    const lineGap = 6.8;

    // Line 1: Muddada Biilka
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(71, 85, 105); // slate-600
    doc.text("Muddada Biilka (Billing Period):", 25, currentY);
    doc.setFont("Helvetica", "bold");
    doc.setTextColor(15, 23, 42); // slate-900
    doc.text(`Khidmadda ${record.month}`, 190, currentY, { align: "right" });
    currentY += lineGap;

    // Line 2: Heerka Rasiidka
    doc.setFont("Helvetica", "normal");
    doc.setTextColor(71, 85, 105); // slate-600
    doc.text("Heerka Rasiidka (Receipt Status):", 25, currentY);
    doc.setFont("Helvetica", "bold");
    if (record.status === 'Paid') {
      doc.setTextColor(4, 120, 87); // emerald-700
      doc.text("WAA LA BIXIYAY (PAID)", 190, currentY, { align: "right" });
    } else if (record.status === 'Partial') {
      doc.setTextColor(180, 83, 9); // amber-700
      doc.text("QEYB BAA LA BIXIYAY (PARTIAL)", 190, currentY, { align: "right" });
    } else {
      doc.setTextColor(185, 28, 28); // rose-700
      doc.text("LAMA BIXIN (UNPAID)", 190, currentY, { align: "right" });
    }
    currentY += lineGap;

    // Line 3: Tuition Due
    doc.setFont("Helvetica", "normal");
    doc.setTextColor(71, 85, 105);
    doc.text("Lacagta bisha ee laga rabo (Tuition Due):", 25, currentY);
    doc.setFont("Helvetica", "bold");
    doc.setTextColor(15, 23, 42);
    doc.text(`$${Number(amountDue).toFixed(2)} USD`, 190, currentY, { align: "right" });
    currentY += lineGap;

    // Line 4: Tuition Paid
    doc.setFont("Helvetica", "normal");
    doc.setTextColor(71, 85, 105);
    doc.text("Lacagta bisha ee la bixiyay (Tuition Paid):", 25, currentY);
    doc.setFont("Helvetica", "bold");
    doc.setTextColor(4, 120, 87);
    doc.text(`$${Number(record.amountPaid).toFixed(2)} USD`, 190, currentY, { align: "right" });
    currentY += lineGap;

    // Conditionals for Bus Fee
    if (hasBusFee) {
      // Line 5: Bus Fee Due
      doc.setFont("Helvetica", "normal");
      doc.setTextColor(71, 85, 105);
      doc.text("Lacagta baska ee laga rabo (Bus Due):", 25, currentY);
      doc.setFont("Helvetica", "bold");
      doc.setTextColor(15, 23, 42);
      doc.text(`$${Number(record.busFeeDue || 0).toFixed(2)} USD`, 190, currentY, { align: "right" });
      currentY += lineGap;

      // Line 6: Bus Fee Paid
      doc.setFont("Helvetica", "normal");
      doc.setTextColor(71, 85, 105);
      doc.text("Lacagta baska ee la bixiyay (Bus Paid):", 25, currentY);
      doc.setFont("Helvetica", "bold");
      doc.setTextColor(4, 120, 87);
      doc.text(`$${Number(record.busFeePaid || 0).toFixed(2)} USD`, 190, currentY, { align: "right" });
      currentY += lineGap;
    }

    // Line 7: Total Paid
    doc.setFont("Helvetica", "bold");
    doc.setTextColor(15, 23, 42);
    doc.text("Wadar Lacagta La Bixiyay (Total Paid):", 25, currentY);
    doc.setTextColor(4, 120, 87); // emerald-700
    doc.text(`$${Number(totalCollected).toFixed(2)} USD`, 190, currentY, { align: "right" });
    currentY += lineGap;

    // Line 8: Debt amount remaining
    doc.setFont("Helvetica", "bold");
    doc.setTextColor(71, 85, 105);
    doc.text("Haraaga Deynta ee Kugu Haray (Debt):", 25, currentY);
    doc.setTextColor((record.debtAmount || 0) > 0 ? 180 : 15, (record.debtAmount || 0) > 0 ? 83 : 23, (record.debtAmount || 0) > 0 ? 9 : 42);
    doc.text(`$${Number(debtAmount).toFixed(2)} USD`, 190, currentY, { align: "right" });

    // Notes/Remarks if any
    const notesY = 86 + boxHeight + 6;
    let nextBlockY = notesY;
    if (record.notes) {
      doc.setFillColor(254, 252, 232); // amber-50
      doc.setDrawColor(254, 243, 199); // amber-200
      doc.roundedRect(20, notesY, 170, 18, 2, 2, "FD");
      
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(146, 64, 14); // amber-800
      doc.text("FAALLOOYINKA MAAMULKA & QORAALADA DEYNTA:", 24, notesY + 5);

      doc.setFont("Helvetica", "italic");
      doc.setFontSize(9);
      doc.setTextColor(30, 41, 59); // slate-800
      
      const textLines = doc.splitTextToSize(record.notes, 160);
      doc.text(textLines, 24, notesY + 11);
      nextBlockY = notesY + 18 + 6;
    }

    // Signature Block & Bold Amount Box
    const sigY = nextBlockY + 2;
    doc.setDrawColor(203, 213, 225); // slate-300
    doc.setLineWidth(0.5);
    doc.line(20, sigY + 15, 75, sigY + 15);
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139); // slate-500
    doc.text("Saxiixa Khasajiga Rasmiga ah", 20, sigY + 19);

    // Big bold Amount Box on the right
    doc.setFillColor(15, 23, 42); // slate-900
    doc.roundedRect(120, sigY, 70, 22, 2, 2, "F");
    
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184); // slate-400
    doc.text("LACAGTA GUUD EE LA MAAL-GELIYAY", 155, sigY + 5, { align: "center" });
    
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(255, 255, 255); // white
    doc.text(`$${Number(totalCollected).toFixed(2)} USD`, 155, sigY + 14, { align: "center" });

    // Footer divider dashed
    const footerY = sigY + 38;
    doc.setDrawColor(148, 163, 184);
    doc.setLineDashPattern([2, 2], 0);
    doc.line(20, footerY, 190, footerY);

    doc.setFont("Helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105); // slate-600
    doc.text("WAAD KU MAHADSAN TAHAY DADAALKAAGA WAXBARASHO", 105, footerY + 8, { align: "center" });
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184); // slate-400
    doc.text("Xafiiska Maamulka ee Garowe - Sanadka 2026", 105, footerY + 12, { align: "center" });

    const cleanName = record.studentName.replace(/\s+/g, '_');
    doc.save(`bj_receipt_${record.month}_${cleanName}.pdf`);
    
    setFeedbackMsg(`PDF Receipt exported successfully!`);
    setTimeout(() => setFeedbackMsg(''), 4050);
  };

  const handleDownloadExamPDF = (ex: Exam) => {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const examiningTeacher = database.teachers.find(t => t.id === ex.teacherId)?.name || ex.teacherName || 'Assigned Instructor';
    const exAvg = parseFloat((ex.scores.reduce((sum, s) => sum + s.averageScore, 0) / Math.max(ex.scores.length, 1)).toFixed(1));

    doc.setProperties({
      title: `Subuc Weekly Exam - ${ex.heading} - ${ex.className}`,
      subject: 'Weekly Graded Performance Report Card',
      author: 'Dugsiga Subuc'
    });

    // Title
    doc.setTextColor(15, 23, 42); // slate-900
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(18);
    doc.text("DUGSIGA SUBUC ISLAMIC CENTER", 105, 34, { align: 'center' });

    doc.setFontSize(8);
    doc.setFont("Helvetica", "bold");
    doc.setTextColor(43, 92, 67); // Green motto
    doc.text("GRADED STUDENT EXAM PERFORMANCE REPORT CARD", 105, 39, { align: 'center' });

    // Divider
    doc.setDrawColor(203, 213, 225); // slate-300
    doc.setLineWidth(0.5);
    doc.line(15, 45, 195, 45);

    // Exam Metadata Info Box
    doc.setFillColor(248, 250, 252); // slate-50
    doc.roundedRect(15, 50, 180, 26, 2, 2, "F");
    doc.setDrawColor(226, 232, 240); // slate-200
    doc.roundedRect(15, 50, 180, 26, 2, 2, "D");

    doc.setFontSize(8);
    doc.setFont("Helvetica", "bold");
    doc.setTextColor(100, 116, 139); // slate-500
    doc.text("EXAM MAIN TITLE / HEADING:", 20, 56);
    doc.setTextColor(15, 23, 42); // slate-900
    doc.setFontSize(11);
    doc.text(ex.heading, 20, 61);

    doc.setFontSize(8);
    doc.setFont("Helvetica", "bold");
    doc.setTextColor(100, 116, 139);
    doc.text("CLASS ASSIGNED:", 20, 70);
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(9);
    doc.text(ex.className, 20, 74);

    doc.setFontSize(8);
    doc.setFont("Helvetica", "bold");
    doc.setTextColor(100, 116, 139);
    doc.text("EXAMINATE DATE:", 110, 56);
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(9);
    doc.text(ex.date, 110, 60);

    doc.setFontSize(8);
    doc.setFont("Helvetica", "bold");
    doc.setTextColor(100, 116, 139);
    doc.text("EVALUATING SCHOLAR (TEACHER):", 110, 68);
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(9);
    doc.text(`${examiningTeacher} (ID: ${ex.teacherId})`, 110, 72);

    // Table Header
    let startY = 82;
    doc.setFillColor(241, 245, 249); // slate-100
    doc.rect(15, startY, 180, 8, "F");
    doc.setDrawColor(226, 232, 240);
    doc.rect(15, startY, 180, 8, "D");

    doc.setFontSize(7.5);
    doc.setFont("Helvetica", "bold");
    doc.setTextColor(51, 65, 85); // slate-700
    doc.text("Student Name (ID)", 18, startY + 5.5);
    
    // Dynamic Subject Headers
    const maxSub = ex.subjects.slice(0, 4); // limit to 4 subjects visually on A4 portrait
    let subX = 85;
    maxSub.forEach(sub => {
      doc.text(sub, subX, startY + 5.5);
      subX += 18;
    });

    doc.text("Avg", 155, startY + 5.5);
    doc.text("Grade", 166, startY + 5.5);
    doc.text("Remarks / Feedback", 176, startY + 5.5);

    // Table Rows
    let currentY = startY + 8;
    ex.scores.forEach((sc, idx) => {
      // Row Background
      if (idx % 2 === 0) {
        doc.setFillColor(255, 255, 255);
      } else {
        doc.setFillColor(250, 250, 250);
      }
      doc.rect(15, currentY, 180, 8, "F");
      
      // Draw border bottom
      doc.setDrawColor(241, 245, 249);
      doc.line(15, currentY + 8, 195, currentY + 8);

      doc.setFontSize(7.5);
      doc.setFont("Helvetica", "bold");
      doc.setTextColor(15, 23, 42);
      
      const truncName = sc.studentName.length > 24 ? sc.studentName.substring(0, 22) + ".." : sc.studentName;
      doc.text(`${truncName} (${sc.studentId})`, 18, currentY + 5);

      doc.setFont("Helvetica", "normal");
      doc.setTextColor(51, 65, 85);
      let scoreX = 85;
      maxSub.forEach(sub => {
        const val = sc.scores[sub] !== undefined ? `${sc.scores[sub]}%` : "—";
        doc.text(val, scoreX, currentY + 5);
        scoreX += 18;
      });

      doc.setFont("Helvetica", "bold");
      doc.text(`${sc.averageScore}%`, 155, currentY + 5);
      doc.text(sc.grade, 167, currentY + 5);

      doc.setFont("Helvetica", "italic");
      doc.setFontSize(6.5);
      doc.setTextColor(71, 85, 105);
      const commentTxt = sc.comment || "No comment logged";
      const truncComment = commentTxt.length > 25 ? commentTxt.substring(0, 23) + ".." : commentTxt;
      doc.text(truncComment, 176, currentY + 5);

      currentY += 8;
    });

    // Signature Area
    const footerY = Math.max(currentY + 15, 180);
    doc.setDrawColor(203, 213, 225);
    doc.line(20, footerY, 90, footerY);
    doc.line(110, footerY, 180, footerY);

    doc.setFont("Helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text("Assigned Teacher Signature & Date", 55, footerY + 5, { align: 'center' });
    doc.text("Principal Audit Seal / Sign", 145, footerY + 5, { align: 'center' });

    doc.save(`subuc_graded_exam_${ex.id}.pdf`);
    
    setFeedbackMsg(`PDF Exam Report Card downloaded successfully!`);
    setTimeout(() => setFeedbackMsg(''), 4500);
  };

  const handleDownloadExamTimeframePDF = (matchedExamsList: any[]) => {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const matchClass = examFilterClass === 'All' ? 'Dhamaan' : examFilterClass;
    const matchTeacherName = examFilterTeacher === 'All' ? 'Dhamaan' : (database.teachers.find(t => t.id === examFilterTeacher)?.name || examFilterTeacher);

    doc.setProperties({
      title: `Warbixinta Qiimaynta Waalidka - Dugsiga Subuc`,
      subject: 'Qiimaynta Toddobaadlaha ah',
      author: 'Dugsiga Subuc'
    });

    // Headings
    doc.setTextColor(15, 23, 42); // slate-900
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(18);
    doc.text("DUGSIGA SUBUC ISLAMIC CENTER", 105, 34, { align: "center" });

    doc.setFontSize(8);
    doc.setFont("Helvetica", "bold");
    doc.setTextColor(30, 94, 230); // Blue banner
    doc.text("WARBIXINTA QIIMAYNTA WAALIDKA - REER SUBUC", 105, 39, { align: "center" });

    // Divider line
    doc.setDrawColor(203, 213, 225); // slate-300
    doc.setLineWidth(0.5);
    doc.line(15, 43, 195, 43);

    // Metadata Info Box
    doc.setFillColor(248, 250, 252); // slate-50
    doc.roundedRect(15, 47, 180, 22, 2, 2, "F");
    doc.setDrawColor(226, 232, 240); // slate-200
    doc.roundedRect(15, 47, 180, 22, 2, 2, "D");

    doc.setFontSize(8);
    doc.setFont("Helvetica", "bold");
    doc.setTextColor(100, 116, 139);
    doc.text("MUTDADA WARBIXINTA:", 20, 53);
    doc.setTextColor(15, 23, 42);
    doc.text(`${examStartDate || 'Bilowgii'} ilaa ${examEndDate || 'Hadda'}`, 20, 57);

    doc.setFontSize(8);
    doc.setFont("Helvetica", "bold");
    doc.setTextColor(100, 116, 139);
    doc.text("FASALKA (CLASSROOM):", 20, 64);
    doc.setTextColor(15, 23, 42);
    doc.text(matchClass, 20, 68);

    doc.setFontSize(8);
    doc.setFont("Helvetica", "bold");
    doc.setTextColor(100, 116, 139);
    doc.text("MACALLINKA (TEACHER):", 110, 53);
    doc.setTextColor(15, 23, 42);
    doc.text(matchTeacherName, 110, 57);

    let startY = 75;

    if (examStudentFilter !== 'All') {
      const studentObj = database.students.find(s => s.id === examStudentFilter);
      if (studentObj) {
        doc.setFontSize(8);
        doc.setFont("Helvetica", "bold");
        doc.setTextColor(100, 116, 139);
        doc.text("ARDAYGA LA-MUGDO (STUDENT):", 110, 64);
        doc.setTextColor(15, 23, 42);
        doc.text(`${studentObj.name} (ID: ${studentObj.id})`, 110, 68);

        // Header
        doc.setFillColor(241, 245, 249);
        doc.rect(15, startY, 180, 8, "F");
        doc.setDrawColor(226, 232, 240);
        doc.rect(15, startY, 180, 8, "D");

        doc.setFontSize(7.5);
        doc.setFont("Helvetica", "bold");
        doc.setTextColor(51, 65, 85);
        doc.text("Taariikhda", 18, startY + 5.5);
        doc.text("Cinwaanka Qiimaynta", 40, startY + 5.5);
        doc.text("Celcelis", 130, startY + 5.5);
        doc.text("Grade", 145, startY + 5.5);
        doc.text("Faallo", 160, startY + 5.5);

        let currentY = startY + 8;
        let totalSum = 0;
        let count = 0;

        matchedExamsList.forEach((ex, idx) => {
          const sc = ex.scores.find((scoreSc: any) => scoreSc.studentId === studentObj.id);
          if (sc) {
            totalSum += sc.averageScore;
            count++;

            if (idx % 2 === 0) {
              doc.setFillColor(255, 255, 255);
            } else {
              doc.setFillColor(250, 250, 250);
            }
            doc.rect(15, currentY, 180, 8, "F");
            doc.setDrawColor(241, 245, 249);
            doc.line(15, currentY + 8, 195, currentY + 8);

            doc.setFont("Helvetica", "normal");
            doc.setTextColor(15, 23, 42);
            doc.text(ex.date, 18, currentY + 5);
            doc.text(ex.heading, 40, currentY + 5);
            
            doc.setFont("Helvetica", "bold");
            doc.text(`${sc.averageScore}%`, 130, currentY + 5);
            doc.text(sc.grade, 145, currentY + 5);

            doc.setFont("Helvetica", "italic");
            doc.setFontSize(6.5);
            doc.setTextColor(71, 85, 105);
            const commentTxt = sc.comment || "Ok";
            const truncComment = commentTxt.length > 22 ? commentTxt.substring(0, 20) + ".." : commentTxt;
            doc.text(truncComment, 160, currentY + 5);

            currentY += 8;
          }
        });

        // Cumulative Average
        if (count > 0) {
          const finalAvg = parseFloat((totalSum / count).toFixed(1));
          doc.setFillColor(236, 253, 245); // light emerald green
          doc.rect(15, currentY + 3, 180, 10, "F");
          doc.setDrawColor(167, 243, 208);
          doc.rect(15, currentY + 3, 180, 10, "D");

          doc.setFont("Helvetica", "bold");
          doc.setFontSize(9);
          doc.setTextColor(6, 95, 70); // deep emerald
          doc.text(`CELCELISKA GUUD EE ARDAYGA (FINAL CUMULATIVE AVERAGE):   ${finalAvg}%`, 20, currentY + 9.5);
        }
      }
    } else {
      // Multiple students in timeframe
      doc.setFillColor(241, 245, 249);
      doc.rect(15, startY, 180, 8, "F");
      doc.setDrawColor(226, 232, 240);
      doc.rect(15, startY, 180, 8, "D");

      doc.setFontSize(8);
      doc.setFont("Helvetica", "bold");
      doc.setTextColor(51, 65, 85);
      doc.text("Exams Checked In Timeframe", 18, startY + 5.5);
      doc.text("Class Assigned", 80, startY + 5.5);
      doc.text("Date Listed", 120, startY + 5.5);
      doc.text("Subject Counts", 150, startY + 5.5);
      doc.text("Class Avg", 175, startY + 5.5);

      let currentY = startY + 8;
      matchedExamsList.forEach((ex, idx) => {
        const exAvg = parseFloat((ex.scores.reduce((sum: number, s: any) => sum + s.averageScore, 0) / Math.max(ex.scores.length, 1)).toFixed(1));

        if (idx % 2 === 0) {
          doc.setFillColor(255, 255, 255);
        } else {
          doc.setFillColor(250, 250, 250);
        }
        doc.rect(15, currentY, 180, 8, "F");
        doc.setDrawColor(241, 245, 249);
        doc.line(15, currentY + 8, 195, currentY + 8);

        doc.setFont("Helvetica", "bold");
        doc.setTextColor(15, 23, 42);
        doc.text(ex.heading, 18, currentY + 5);

        doc.setFont("Helvetica", "normal");
        doc.setTextColor(51, 65, 85);
        doc.text(ex.className, 80, currentY + 5);
        doc.text(ex.date, 120, currentY + 5);
        doc.text(`${ex.subjects.length} Subjects`, 150, currentY + 5);

        doc.setFont("Helvetica", "bold");
        doc.text(`${exAvg}%`, 175, currentY + 5);

        currentY += 8;
      });
    }

    doc.save(`subuc_weekly_exam_timeframe_report.pdf`);
    setFeedbackMsg(`Weekly assessment report downloaded successfully!`);
    setTimeout(() => setFeedbackMsg(''), 4500);
  };

  const handleDownloadReportPDF = () => {
    if (!showPrintReportModal) return;
    const { mode, startDate, endDate, className, studentId } = showPrintReportModal;

    if (mode === 'payments_range') {
      if (studentId) {
        handleDownloadPaymentRangePDF(studentId, startDate, endDate);
      }
      return;
    }

    const doc = new jsPDF({
      orientation: showPrintReportModal.mode === 'whole' ? 'landscape' : 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const centerX = mode === 'whole' ? 148.5 : 105;
    
    // Headings
    doc.setTextColor(15, 23, 42); // slate-900
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(16);
    doc.text("DIIWAANKA RASMIGA AH EE DUGSIGA SUBUC", centerX, 28, { align: "center" });

    doc.setFontSize(8);
    doc.setFont("Helvetica", "bold");
    doc.setTextColor(43, 92, 67); // Green motto
    doc.text("XARAF SAXAN IYO XIFDI SUGAN  |  Dugsiga Subuc", centerX, 32, { align: "center" });

    doc.setFontSize(8.5);
    doc.setFont("Helvetica", "normal");
    doc.setTextColor(100, 116, 139); // slate-500
    doc.text(`DIIWAANKA JOOGITAANKA IYO HORUMARKA ARDAYDA`, centerX, 36, { align: "center" });
    
    let filterText = `Muddada: ${startDate} ilaa ${endDate}`;
    if (mode === 'whole') {
      filterText += ` | Fasalka: ${className}`;
    } else {
      const studentName = database.students.find(stu => stu.id === studentId)?.name || studentId;
      filterText += ` | Macluumaadka Ardayga: ${studentName} (${studentId})`;
    }
    doc.text(filterText, centerX, 40, { align: "center" });

    doc.setDrawColor(203, 213, 225); // slate-300
    doc.setLineWidth(0.5);
    doc.line(15, 43, mode === 'whole' ? 282 : 195, 43);

    let startY = 49;

    if (mode === 'whole') {
      // Draw landscape table
      const colX = [15, 45, 110, 145, 175, 195, 215, 235, 260];
      const headers = ["ID-ga Ardayga", "Magaca Ardayga", "Fasalka", "Diiwaanka", "Joogid", "Daahid", "Maqnansho", "Heerka Imaanshaha %"];
      
      // Header fill
      doc.setFillColor(241, 245, 249); // slate-100
      doc.rect(15, startY, 267, 8, "F");
      
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(51, 65, 85); // slate-700
      
      for (let i = 0; i < headers.length; i++) {
        if (i === 3 || i === 4 || i === 5 || i === 6) {
          doc.text(headers[i], colX[i] + 10, startY + 5.5, { align: "center" });
        } else if (i === 7) {
          doc.text(headers[i], colX[i] + 15, startY + 5.5, { align: "right" });
        } else {
          doc.text(headers[i], colX[i] + 2, startY + 5.5);
        }
      }

      // Draw horizontal separator
      doc.setDrawColor(148, 163, 184); // slate-400
      doc.line(15, startY + 8, 282, startY + 8);

      let rowY = startY + 8;
      const filteredStudents = database.students.filter(s => s.active && (className === 'All' ? true : s.className === className));

      doc.setFont("Helvetica", "normal");
      doc.setTextColor(30, 41, 59); // slate-800

      filteredStudents.forEach((stu, index) => {
        // Page break if too long
        if (rowY > 180) {
          doc.addPage();
          rowY = 20;
          // Re-draw header
          doc.setFillColor(241, 245, 249);
          doc.rect(15, rowY, 267, 8, "F");
          doc.setFont("Helvetica", "bold");
          for (let i = 0; i < headers.length; i++) {
            if (i === 3 || i === 4 || i === 5 || i === 6) {
              doc.text(headers[i], colX[i] + 10, rowY + 5.5, { align: "center" });
            } else if (i === 7) {
              doc.text(headers[i], colX[i] + 15, rowY + 5.5, { align: "right" });
            } else {
              doc.text(headers[i], colX[i] + 2, rowY + 5.5);
            }
          }
          doc.line(15, rowY + 8, 282, rowY + 8);
          rowY += 8;
          doc.setFont("Helvetica", "normal");
        }

        const progressList = database.progress.filter(p => p.studentId === stu.id && p.date >= startDate && p.date <= endDate);
        const total = progressList.length;
        const present = progressList.filter(p => p.attendance === 'Present').length;
        const late = progressList.filter(p => p.attendance === 'Late').length;
        const absent = progressList.filter(p => p.attendance === 'Absent').length;
        const compliance = total > 0 ? Math.round(((present + late) / total) * 100) : 0;

        // Alternate back color
        if (index % 2 === 1) {
          doc.setFillColor(248, 250, 252); // slate-50
          doc.rect(15, rowY, 267, 7, "F");
        }

        // Draw cells
        doc.setFont("Helvetica", "bold");
        doc.text(stu.id, colX[0] + 2, rowY + 5);
        doc.text(stu.name, colX[1] + 2, rowY + 5);
        doc.setFont("Helvetica", "normal");
        doc.text(stu.className, colX[2] + 2, rowY + 5);
        
        doc.text(String(total), colX[3] + 10, rowY + 5, { align: "center" });
        doc.setTextColor(4, 120, 87); // emerald
        doc.text(String(present), colX[4] + 10, rowY + 5, { align: "center" });
        doc.setTextColor(180, 83, 9); // amber
        doc.text(String(late), colX[5] + 10, rowY + 5, { align: "center" });
        doc.setTextColor(185, 28, 28); // rose
        doc.text(String(absent), colX[6] + 10, rowY + 5, { align: "center" });
        
        doc.setTextColor(15, 23, 42); // slate-900
        doc.setFont("Helvetica", "bold");
        doc.text(total > 0 ? `${compliance}%` : 'may', colX[7] + 15, rowY + 5, { align: "right" });

        doc.setFont("Helvetica", "normal");
        doc.setDrawColor(241, 245, 249); // light divider
        doc.line(15, rowY + 7, 282, rowY + 7);
        rowY += 7;
      });

      // Landscape Signatures
      const sigY = Math.max(rowY + 15, 140);
      doc.setDrawColor(203, 213, 225); // slate-300
      doc.line(15, sigY + 15, 110, sigY + 15);
      doc.line(187, sigY + 15, 282, sigY + 15);
      
      doc.setFont("Helvetica", "normal");
      doc.setFontSize(8);
      doc.text("Saxiixa Hubinta Maamulaha", 15, sigY + 19);
      doc.text("Ogolaanshaha & Shaabadda Maamulka", 282, sigY + 19, { align: "right" });

      doc.save(`bj_class_attendance_summary_${startDate}_to_${endDate}.pdf`);

    } else {
      // Draw Portrait student profile logs
      const student = database.students.find(s => s.id === studentId);
      if (!student) return;

      const logs = database.progress
        .filter(p => p.studentId === student.id && p.date >= startDate && p.date <= endDate)
        .sort((a,b) => a.date.localeCompare(b.date));

      const total = logs.length;
      const present = logs.filter(p => p.attendance === 'Present').length;
      const late = logs.filter(p => p.attendance === 'Late').length;
      const absent = logs.filter(p => p.attendance === 'Absent').length;
      const compliance = total > 0 ? Math.round(((present + late) / total) * 100) : 0;

      const translateAttendance = (val: string) => {
        if (val === 'Present') return 'Joogid';
        if (val === 'Late') return 'Daahid';
        if (val === 'Absent') return 'Maqnansho';
        return val;
      };
      const translateLessonOrSurad = (val: string) => {
        if (val === 'Completed') return 'Kabaxay';
        if (val === 'Not Completed') return 'Kama Bixin';
        if (val === 'N/A') return 'may';
        return val;
      };
      const translateSubac = (val: string) => {
        if (val === 'Completed') return 'Galay';
        if (val === 'Not Completed') return 'Ma Galin';
        if (val === 'N/A') return 'may';
        return val;
      };
      const translateGrade = (val: string) => {
        if (val === 'Excellent') return 'Aad u Fiican';
        if (val === 'Good') return 'Fiican';
        if (val === 'Average') return 'Dhexdhexaad';
        if (val === 'Needs Improvement') return 'Baahan Horumar';
        return val;
      };

      // Student Bio Card
      doc.setFillColor(248, 250, 252); // slate-50
      doc.roundedRect(15, 40, 180, 32, 2, 2, "F");
      doc.setDrawColor(226, 232, 240); // slate-200
      doc.roundedRect(15, 40, 180, 32, 2, 2, "D");

      // Row 1
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184); // slate-400
      doc.setFont("Helvetica", "bold");
      doc.text("MAGACA ARDAYGA", 20, 46);
      doc.text("ID-GA ARDAYGA / FASALKA", 85, 46);

      doc.setFontSize(9.5);
      doc.setTextColor(15, 23, 42); // slate-900
      doc.text(student.name, 20, 52);
      doc.text(`${student.id} / ${student.className}`, 85, 52);

      // Row 2
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184); // slate-400
      doc.setFont("Helvetica", "bold");
      doc.text("WAALIDKA ARDAYGA", 20, 60);
      doc.text("TALEEFANKA WAALIDKA", 85, 60);

      doc.setFontSize(9.5);
      doc.setTextColor(30, 41, 59); // slate-800
      doc.setFont("Helvetica", "normal");
      doc.text(student.parentName, 20, 66);
      doc.text(student.parentPhone, 85, 66);

      // High Performance Compliance Badge (Right side)
      doc.setFillColor(total > 0 ? 240 : 241, total > 0 ? 253 : 245, total > 0 ? 250 : 249); // light emerald-50 or slate-50
      doc.roundedRect(148, 44, 42, 24, 2, 2, "F");
      doc.setDrawColor(total > 0 ? 187 : 226, total > 0 ? 247 : 232, total > 0 ? 208 : 240); // emerald-200 or slate-200
      doc.roundedRect(148, 44, 42, 24, 2, 2, "D");

      doc.setFontSize(7.5);
      doc.setTextColor(total > 0 ? 5 : 100, total > 0 ? 150 : 116, total > 0 ? 105 : 139); // emerald-600 or slate-400
      doc.setFont("Helvetica", "bold");
      doc.text("HEERKA JOOGITAANKA", 169, 51, { align: "center" });

      doc.setFontSize(13);
      doc.setTextColor(total > 0 ? 6 : 71, total > 0 ? 95 : 85, total > 0 ? 70 : 105); // emerald-800 or slate-600
      doc.text(total > 0 ? `${compliance}%` : 'M/J', 169, 61, { align: "center" });

      // Section Heading
      startY = 78;
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(15, 23, 42); // slate-900
      doc.text("DIIWAANKA MAALIN LA HAFKA AH (DAILY PROGRESS JOURNAL)", 15, startY + 5);
      
      doc.setDrawColor(203, 213, 225); // slate-300
      doc.setLineWidth(0.4);
      doc.line(15, startY + 7, 195, startY + 7);

      let rowY = startY + 11;
      doc.setFont("Helvetica", "normal");
      doc.setTextColor(30, 41, 59);

      logs.forEach((lg, index) => {
        const noteText = lg.faahfaahin || '';
        const noteLines: string[] = noteText ? doc.splitTextToSize(noteText, 168) : [];
        const hasComment = noteLines.length > 0;
        const hasSuuradee = !!lg.suuradeeMaraya || !!lg.boggee || (lg.inteeBog && lg.inteeBog !== 'N/A' && lg.inteeBog !== '');
        const suuradeeHeight = hasSuuradee ? 6 : 0;
        
        // Base Card Height calculation:
        // - Header: 7.5mm
        // - Metrics row: 10mm
        // - If comment exists: header label & line (5mm) + (noteLines.length * 3.8) + padding (3.5mm), else 5mm (subtle empty comment label placeholder)
        // - spacing buffer: 4mm
        const commentHeight = hasComment ? (5 + (noteLines.length * 3.8) + 3.5) : 5;
        const cardHeight = 7.5 + 10 + commentHeight + suuradeeHeight + 4;

        // Dynamic page break check using calculated height
        if (rowY + cardHeight > 275) {
          doc.addPage();
          rowY = 20;

          // Re-draw Section Heading on new page for continuous context
          doc.setFont("Helvetica", "bold");
          doc.setFontSize(8.5);
          doc.setTextColor(71, 85, 105);
          doc.text("DIIWAANKA MAALIN LA HAFKA AH (DAILY PROGRESS JOURNAL) - Sii soco", 15, rowY);
          doc.setDrawColor(226, 232, 240);
          doc.line(15, rowY + 2, 195, rowY + 2);
          rowY += 7;
        }

        // 1. Draw Card Background Panel
        doc.setFillColor(248, 250, 252); // slate-50 background
        doc.setDrawColor(226, 232, 240); // slate-200 border
        doc.setLineWidth(0.35);
        doc.roundedRect(15, rowY, 180, cardHeight, 2, 2, "FD");

        // 2. Card Header (Day & Date)
        doc.setFont("Helvetica", "bold");
        doc.setFontSize(8.5);
        doc.setTextColor(15, 23, 42); // slate-900
        doc.text(`Maalinta ${index + 1}  -  ${lg.date}`, 19, rowY + 5);

        // Attendance Badge
        const attText = translateAttendance(lg.attendance);
        if (lg.attendance === 'Present') {
          doc.setFillColor(240, 253, 244); // light green bg
          doc.setDrawColor(187, 247, 208);
          doc.roundedRect(158, rowY + 1.8, 32, 4.5, 1, 1, "FD");
          doc.setTextColor(21, 128, 61); // green text
        } else if (lg.attendance === 'Late') {
          doc.setFillColor(254, 243, 199); // light orange bg
          doc.setDrawColor(253, 230, 138);
          doc.roundedRect(158, rowY + 1.8, 32, 4.5, 1, 1, "FD");
          doc.setTextColor(180, 83, 9); // amber text
        } else {
          doc.setFillColor(254, 226, 226); // light red bg
          doc.setDrawColor(254, 202, 202);
          doc.roundedRect(158, rowY + 1.8, 32, 4.5, 1, 1, "FD");
          doc.setTextColor(185, 28, 28); // rose text
        }
        doc.setFontSize(7.5);
        doc.setFont("Helvetica", "bold");
        doc.text(attText, 174, rowY + 5, { align: "center" });

        // Sub-divider under header block
        doc.setDrawColor(241, 245, 249);
        doc.line(15, rowY + 7.5, 195, rowY + 7.5);

        // 3. Metrics Grid (5 boxes inside card side-by-side)
        // Split 172mm usable width into 5 columns (each column width = 34.4mm)
        const metrics = [
          { label: "1. CASAHRKA", val: translateLessonOrSurad(lg.lessonCompleted), color: lg.lessonCompleted === 'Completed' ? [21, 128, 61] : [100, 116, 139] },
          { label: "2. SUURADDA", val: translateLessonOrSurad(lg.surad), color: lg.surad === 'Completed' ? [79, 70, 229] : [100, 116, 139] },
          { label: "3. KOOXDA SUBAC", val: translateSubac(lg.subac), color: lg.subac === 'Completed' ? [21, 128, 61] : [100, 116, 139] },
          { label: "4. DHAQANKA", val: translateGrade(lg.dhaqan), color: lg.dhaqan === 'Excellent' || lg.dhaqan === 'Good' ? [79, 70, 229] : [100, 116, 139] },
          { label: "5. NADAAFADDA", val: translateGrade(lg.nadaafad), color: lg.nadaafad === 'Excellent' || lg.nadaafad === 'Good' ? [5, 150, 105] : [100, 116, 139] }
        ];

        const gridY = rowY + 8.5;
        const colW = 34.4;

        metrics.forEach((m, colIdx) => {
          const mX = 17 + colIdx * colW;
          doc.setFillColor(255, 255, 255);
          doc.setDrawColor(235, 240, 245);
          doc.roundedRect(mX, gridY, 32.4, 8, 1, 1, "FD");

          doc.setFontSize(5.5);
          doc.setFont("Helvetica", "bold");
          doc.setTextColor(148, 163, 184); // slate-400
          doc.text(m.label, mX + 2, gridY + 2.5);

          doc.setFontSize(7);
          doc.setFont("Helvetica", "bold");
          doc.setTextColor(m.color[0], m.color[1], m.color[2]);
          doc.text(m.val, mX + 2, gridY + 6.2);
        });

        // 4. Suuraduu Marayo & Intee Bog (if exists)
        let suuradeeOffsetY = 0;
        if (hasSuuradee) {
          const sY = rowY + 18.5;
          doc.setFillColor(245, 247, 255); // indigo tinted bg
          doc.setDrawColor(220, 225, 254); // indigo border
          doc.roundedRect(17, sY, 176, 5, 1, 1, "FD");

          doc.setFontSize(6.5);
          doc.setFont("Helvetica", "bold");
          doc.setTextColor(67, 56, 202); // indigo-700
          const surahText = lg.suuradeeMaraya ? lg.suuradeeMaraya.toUpperCase() : "N/A";
          const boggeeText = lg.boggee ? ` | BOGGEE: ${lg.boggee.toUpperCase()}` : "";
          const bogText = (lg.inteeBog && lg.inteeBog !== 'N/A' && lg.inteeBog !== '') ? ` | INTEE BOG: ${lg.inteeBog.toUpperCase()}` : "";
          doc.text(`SUURADUU MARAYO (CURRENT SURAH):  ${surahText}${boggeeText}${bogText}`, 21, sY + 3.5);
          suuradeeOffsetY = 6;
        }

        // 5. Comments area (roomy and beautifully isolated)
        if (hasComment) {
          const comY = rowY + 18.5 + suuradeeOffsetY;
          doc.setFillColor(254, 251, 243); // warm amber backdrop
          doc.setDrawColor(253, 244, 215); // amber border
          doc.roundedRect(17, comY, 176, commentHeight - 3, 1.5, 1.5, "FD");

          doc.setFontSize(6.5);
          doc.setFont("Helvetica", "bold");
          doc.setTextColor(180, 83, 9); // amber-700
          doc.text("XOGTA MACALLINKA (TEACHER COMMENTS):", 21, comY + 4);

          doc.setDrawColor(253, 238, 185);
          doc.line(21, comY + 5.5, 189, comY + 5.5);

          doc.setFont("Helvetica", "normal");
          doc.setFontSize(7.5);
          doc.setTextColor(51, 65, 85); // slate-700
          noteLines.forEach((line, lineIdx) => {
            doc.text(line, 21, comY + 9 + (lineIdx * 3.8));
          });
        } else {
          // If no comment, draw a subtle modern placeholder
          const emptyY = rowY + 18.5 + suuradeeOffsetY;
          doc.setFillColor(250, 250, 250);
          doc.setDrawColor(240, 240, 240);
          doc.roundedRect(17, emptyY, 176, 5, 1, 1, "FD");

          doc.setFont("Helvetica", "oblique");
          doc.setFontSize(6.5);
          doc.setTextColor(160, 160, 160);
          doc.text("Lama qorin wax faallo ah maanta (No comments logged for this day).", 21, emptyY + 3.5);
        }

        rowY += cardHeight + 4; // Add 4mm spacing between beautiful day cards
      });

      // Bottom summaries
      if (rowY > 250) {
        doc.addPage();
        rowY = 20;
      }

      doc.setFillColor(248, 250, 252);
      doc.rect(15, rowY + 2, 180, 8, "F");
      doc.setDrawColor(226, 232, 240);
      doc.rect(15, rowY + 2, 180, 8, "D");
      
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(71, 85, 105);
      doc.text(`KAYDKA GUUD: ${total}   |   JOOGAY: ${present}   |   DAHOODAY: ${late}   |   MA JOOGIN: ${absent}`, 20, rowY + 7.5);

      // Signatures
      const sigY = Math.max(rowY + 22, 230);
      doc.setDrawColor(203, 213, 225);
      doc.line(15, sigY + 15, 85, sigY + 15);
      doc.line(125, sigY + 15, 195, sigY + 15);

      doc.setFont("Helvetica", "normal");
      doc.text("Saxiixa Macallinka", 15, sigY + 19);
      doc.text("Saxiixa iyo Ogolaanshaha Maamulaha", 195, sigY + 19, { align: "right" });

      const cleanName = student.name.replace(/\s+/g, '_');
      doc.save(`bj_journal_${cleanName}_${startDate}_to_${endDate}.pdf`);
    }

    setFeedbackMsg(`PDF Progress report exported successfully!`);
    setTimeout(() => setFeedbackMsg(''), 4050);
  };

  const handlePrintElement = (containerId: string) => {
    const el = document.getElementById(containerId);
    if (!el) {
      console.error(`Print element #${containerId} not found.`);
      return;
    }

    try {
      // 1. Try iframe-resistant popup/new-window approach to bypass browser sandbox print restrictions (useful in dev iframe).
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        // Collect all styling elements from the main document to ensure complete fidelity in the print tab
        const styles = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
          .map(style => style.outerHTML)
          .join('\n');
        
        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>Print Document - Banuu Jalaal</title>
              ${styles}
              <style>
                html, body {
                  background: white !important;
                  color: black !important;
                  height: auto !important;
                  overflow: visible !important;
                  padding: 24px !important;
                }
                #print-temp-clone {
                  display: block !important;
                  visibility: visible !important;
                  width: 100% !important;
                  box-sizing: border-box !important;
                }
                .pointer-print-none, button, .no-print, nav, header {
                  display: none !important;
                }
                .print-only-block {
                  display: block !important;
                }
                #print-temp-clone table {
                  width: 100% !important;
                  border-collapse: collapse !important;
                  page-break-inside: auto !important;
                }
                #print-temp-clone tr {
                  page-break-inside: avoid !important;
                  page-break-after: auto !important;
                }
                #print-temp-clone thead {
                  display: table-header-group !important;
                }
                
                /* Custom styles for ID Badge, receipts, and canvases inside the print window */
                #printable-receipt-card {
                  box-shadow: none !important;
                  border: 2px dashed #475569 !important;
                  border-radius: 12px !important;
                  max-width: 440px !important;
                  margin: 15px auto !important;
                  padding: 24px !important;
                  display: block !important;
                  background: white !important;
                }
                #printable-report-canvas {
                  box-shadow: none !important;
                  border: none !important;
                  max-width: 100% !important;
                  margin: 0 auto !important;
                  padding: 8px !important;
                  display: block !important;
                  background: white !important;
                }
                #printable-id-badge-canvas {
                  border: 2px solid #cbd5e1 !important;
                  border-radius: 16px !important;
                  box-shadow: none !important;
                  width: 288px !important;
                  height: 410px !important;
                  margin: 20px auto !important;
                  display: block !important;
                  background: white !important;
                }
                #printable-invoice-receipt {
                  box-shadow: none !important;
                  border: none !important;
                  max-width: 600px !important;
                  margin: 0 auto !important;
                  padding: 10px !important;
                  display: block !important;
                  background: white !important;
                }
              </style>
            </head>
            <body>
              <div id="print-temp-clone">
                ${el.innerHTML}
              </div>
              <script>
                // Auto print after styles render
                window.addEventListener('load', () => {
                  setTimeout(() => {
                    window.focus();
                    window.print();
                    setTimeout(() => {
                      window.close();
                    }, 500);
                  }, 500);
                });
                // Fallback direct execution in case page load events are skipped
                setTimeout(() => {
                  window.focus();
                  window.print();
                }, 800);
              </script>
            </body>
          </html>
        `);
        printWindow.document.close();
        return;
      }
    } catch (popupErr) {
      console.warn("New tab print popup was blocked or failed, using standard inline fallback...", popupErr);
    }
    
    // Fallback: Standard inline clone-and-print workflow
    const existingClone = document.getElementById('print-temp-clone');
    if (existingClone) {
      existingClone.parentNode?.removeChild(existingClone);
    }
    const existingStyle = document.getElementById('print-temp-style');
    if (existingStyle) {
      existingStyle.parentNode?.removeChild(existingStyle);
    }

    try {
      // Clone the element
      const clone = el.cloneNode(true) as HTMLElement;
      clone.id = 'print-temp-clone';
      
      // Ensure clone is visible
      clone.classList.remove('hidden');
      clone.style.setProperty('display', 'block', 'important');
      
      // Append clone to the body root
      document.body.appendChild(clone);

      // Create a temporary stylesheet to hide everything else on the page during print
      const style = document.createElement('style');
      style.id = 'print-temp-style';
      style.innerHTML = `
        @media print {
          html, body {
            height: auto !important;
            overflow: visible !important;
            display: block !important;
            background: white !important;
          }
          /* Hide all direct children of body except the clone */
          body > :not(#print-temp-clone) {
            display: none !important;
          }
          /* Style our cloned printer container */
          #print-temp-clone {
            display: block !important;
            visibility: visible !important;
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            box-sizing: border-box !important;
            min-height: 100% !important;
            background: white !important;
            color: black !important;
            padding: 24px !important;
            font-family: ui-sans-serif, system-ui, -apple-system, sans-serif !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          #print-temp-clone .pointer-print-none,
          #print-temp-clone button,
          #print-temp-clone .no-print,
          #print-temp-clone nav,
          #print-temp-clone header {
            display: none !important;
          }
          #print-temp-clone .print-only-block {
            display: block !important;
          }
          /* Expand clamps in print */
          #print-temp-clone .line-clamp-2, 
          #print-temp-clone .line-clamp-1, 
          #print-temp-clone .line-clamp-3, 
          #print-temp-clone [class*="line-clamp-"] {
            -webkit-line-clamp: unset !important;
            line-clamp: unset !important;
            display: block !important;
            overflow: visible !important;
          }
          #print-temp-clone table {
            width: 100% !important;
            border-collapse: collapse !important;
            page-break-inside: auto !important;
          }
          #print-temp-clone tr {
            page-break-inside: avoid !important;
            page-break-after: auto !important;
          }
          #print-temp-clone thead {
            display: table-header-group !important;
          }
          #print-temp-clone tfoot {
            display: table-footer-group !important;
          }
          /* Custom styles for ID Badge, receipts, and canvases */
          #print-temp-clone #printable-receipt-card {
            box-shadow: none !important;
            border: 2px dashed #475569 !important;
            border-radius: 12px !important;
            max-width: 440px !important;
            margin: 15px auto !important;
            padding: 24px !important;
            display: block !important;
            background: white !important;
          }
          #print-temp-clone #printable-report-canvas {
            box-shadow: none !important;
            border: none !important;
            max-width: 100% !important;
            margin: 0 auto !important;
            padding: 8px !important;
            display: block !important;
            background: white !important;
          }
          #print-temp-clone #printable-id-badge-canvas {
            border: 2px solid #cbd5e1 !important;
            border-radius: 16px !important;
            box-shadow: none !important;
            width: 288px !important;
            height: 410px !important;
            margin: 20px auto !important;
            display: block !important;
            background: white !important;
            pointer-events: none !important;
          }
        }
      `;
      document.head.appendChild(style);

      // Give browser a short moment to render, then trigger the print dialog
      setTimeout(() => {
        window.focus();
        window.print();
        
        // Cleanup after dialog closes
        setTimeout(() => {
          if (document.body.contains(clone)) {
            document.body.removeChild(clone);
          }
          if (document.head.contains(style)) {
            document.head.removeChild(style);
          }
        }, 1200);
      }, 350);
    } catch (err) {
      console.error("Print cloning failed, calling direct window.print fallback", err);
      window.focus();
      window.print();
    }
  };

  const handleDownloadProfilePhoto = (imageUrl: string, filename: string) => {
    if (!imageUrl) {
      alert("No photograph is associated with this academic profile record.");
      return;
    }
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = `${filename.replace(/\s+/g, '_')}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setFeedbackMsg(`Successfully downloaded ${filename.replace(/_/g, ' ')} photo!`);
    setTimeout(() => setFeedbackMsg(''), 3000);
  };

  // -------------------------------------------------------------
  // TAB 6: D: DRIVE BACKUP SYSTEM
  // -------------------------------------------------------------
  const handleBackupExport = () => {
    triggerBackupDownload(database);
    setFeedbackMsg(`Portable backup string downloaded! Match to your laptop directory: e.g. D:\\Dugsiga_Subuc_Records\\backup.json`);
    setTimeout(() => setFeedbackMsg(''), 5000);
  };

  const handleBackupImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    if (e.target.files && e.target.files[0]) {
      fileReader.readAsText(e.target.files[0], "UTF-8");
      fileReader.onload = (event) => {
        try {
          const parsed = JSON.parse(event.target?.result as string);
          if (parsed.students && parsed.teachers && parsed.progress && parsed.billing) {
            onSaveDatabase(parsed);
            alert("Database synchronized successfully! All records, progress entries, and billing logs are fully restored.");
            window.location.reload();
          } else {
            alert("Verification failed. The uploaded file is missing critical collection tables.");
          }
        } catch (error) {
          alert("Error parsing JSON backup file. Ensure the document is uncorrupted.");
        }
      };
    }
  };

  const sidebarSections = [
    {
      title: 'Guud',
      items: [
        {
          label: 'Muuqaalka Guud',
          icon: LayoutGrid,
          checkActive: () => activeTab === 'overview',
          onClick: () => setActiveTab('overview')
        }
      ]
    },
    {
      title: 'Qaybta Ardayda',
      items: [
        {
          label: 'Ardayda',
          icon: Users,
          checkActive: () => activeTab === 'students',
          onClick: () => setActiveTab('students')
        },
        {
          label: 'Joogitaanka Ardayda',
          icon: CalendarRange,
          checkActive: () => activeTab === 'studentAttendance',
          onClick: () => setActiveTab('studentAttendance')
        },
        {
          label: 'Warbixinnada Ardayda',
          icon: CalendarRange,
          checkActive: () => activeTab === 'reports' && reportViewMode === 'whole',
          onClick: () => {
            setActiveTab('reports');
            setReportViewMode('whole');
          }
        },
        {
          label: 'Qiimaynta Toddobaadlaha',
          icon: FileCheck2,
          checkActive: () => activeTab === 'exams',
          onClick: () => setActiveTab('exams')
        }
      ]
    },
    {
      title: 'Qaybta Macallimiinta',
      items: [
        {
          label: 'Macallimiinta',
          icon: GraduationCap,
          checkActive: () => activeTab === 'teachers',
          onClick: () => setActiveTab('teachers')
        },
        {
          label: 'Joogitaanka Macallimiinta',
          icon: Clock,
          checkActive: () => activeTab === 'teacherAttendance',
          onClick: () => setActiveTab('teacherAttendance')
        },
        {
          label: 'Xogta Macallimiinta',
          icon: Activity,
          checkActive: () => activeTab === 'submissions',
          onClick: () => setActiveTab('submissions'),
          badgeCount: attendanceUnreadCount + examsUnreadCount
        }
      ]
    },
    {
      title: 'Maamulka & Kale',
      items: [
        {
          label: 'Fasallada',
          icon: BookOpen,
          checkActive: () => activeTab === 'classes',
          onClick: () => setActiveTab('classes')
        },
        {
          label: 'Lacag-bixinta',
          icon: CircleDollarSign,
          checkActive: () => activeTab === 'billing' && billingSubTab === 'fees',
          onClick: () => {
            setActiveTab('billing');
            setBillingSubTab('fees');
          }
        },
        {
          label: 'Samee Invoice / Biil',
          icon: Receipt,
          checkActive: () => activeTab === 'billing' && billingSubTab === 'custom_invoices',
          onClick: () => {
            setActiveTab('billing');
            setBillingSubTab('custom_invoices');
            handleOpenCreateInvoice();
          }
        },
        {
          label: 'Xawaaladda',
          icon: ArrowLeftRight,
          checkActive: () => activeTab === 'moneyTransfers',
          onClick: () => setActiveTab('moneyTransfers')
        },
        {
          label: 'Isticmaalayaasha',
          icon: Users,
          checkActive: () => activeTab === 'backup',
          onClick: () => setActiveTab('backup')
        },
        {
          label: 'Maamulka Bogga Hore',
          icon: Globe,
          checkActive: () => activeTab === 'landing',
          onClick: () => setActiveTab('landing'),
          badgeCount: (database.contactMessages || []).filter(m => !m.read).length
        }
      ]
    }
  ];

  const renderSidebarContent = (isMobile = false) => (
    <div className="flex flex-col h-full justify-between p-6 overflow-hidden">
      <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
        {/* Brand Row */}
        <div className="flex items-center justify-between pb-6 border-b border-slate-900/60 mb-6 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex flex-col">
              <span className="font-extrabold text-white text-base tracking-tight leading-none" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Dugsiga Subuc</span>
              <span className="text-[10px] font-medium text-emerald-400 mt-1.5 leading-none font-mono">مدرسة السبع</span>
            </div>
          </div>
          
          {isMobile && (
            <button
              type="button"
              onClick={() => setIsMenuOpen(false)}
              className="p-1.5 hover:bg-slate-900 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Scrollable Container of Items */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
          {sidebarSections.map(section => (
            <div key={section.title} className="space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block px-3 pt-2 mb-1">
                {section.title}
              </span>
              <div className="space-y-1">
                {section.items.map(item => {
                  const Icon = item.icon;
                  const isCurrent = item.checkActive();
                  
                  return (
                    <button
                      key={item.label}
                      type="button"
                      onClick={() => {
                        item.onClick();
                        if (isMobile) {
                          setIsMenuOpen(false);
                        }
                      }}
                      className={`w-full py-2.5 px-4 text-left text-xs font-semibold flex items-center justify-between rounded-2xl transition-all cursor-pointer group ${
                        isCurrent
                          ? 'bg-[#1e5ee6] text-white font-extrabold shadow-lg shadow-blue-600/10'
                          : 'text-slate-400 hover:text-white hover:bg-slate-900/40'
                      }`}
                      id={`menutab-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className={`w-4 h-4 shrink-0 transition-transform ${isCurrent ? 'text-white' : 'text-slate-400 group-hover:text-white'}`} />
                        <span className="normal-case transition-colors">{item.label}</span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {item.badgeCount !== undefined && item.badgeCount > 0 && (
                          <span className="bg-rose-600 text-white rounded-full text-[9px] font-extrabold px-1.5 py-0.5 min-w-[18px] text-center inline-block leading-none mr-1 shadow-sm shadow-rose-600/20">
                            {item.badgeCount}
                          </span>
                        )}
                        {isCurrent && (
                          <ChevronRight className="w-4 h-4 text-white shrink-0" />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer Profile and Sign Out */}
      <div className="pt-6 mt-6 border-t border-slate-900/60 space-y-4 shrink-0">
        <div className="px-3 flex flex-col">
          <span className="font-semibold text-white text-sm tracking-tight truncate leading-tight">
            yaxye cabdisalan mohamed
          </span>
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">
            Admin
          </span>
        </div>

        <button
          type="button"
          onClick={onLogout}
          className="w-full py-2.5 px-3 hover:bg-slate-900/40 text-slate-400 hover:text-white font-semibold text-xs tracking-wide rounded-xl transition-all inline-flex items-center gap-2.5 cursor-pointer"
        >
          <LogOut className="w-4 h-4 text-slate-450" />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col lg:flex-row font-sans relative selection:bg-teal-500 selection:text-white" id="admin-workspace">
      
      {/* Mobile Top Navigation Bar */}
      <header className="lg:hidden bg-[#020617] text-white border-b border-slate-900 px-4 py-3 flex items-center justify-between sticky top-0 z-40" id="admin-mobile-header">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsMenuOpen(true)}
            className="p-2 -ml-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-900 transition-colors cursor-pointer"
            aria-label="Open menu"
          >
            <Menu className="w-6 h-6" />
          </button>
          
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-sm text-white tracking-tight" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Dugsiga Subuc</span>
          </div>
        </div>
        
        <div className="flex items-center gap-1.5 relative">
          <button
            type="button"
            onClick={() => setShowNotifPopup(!showNotifPopup)}
            className={`p-2 rounded-xl transition-all relative flex items-center justify-center ${
              showNotifPopup ? 'text-blue-400 bg-slate-900' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Bell className="w-5 h-5" />
            {totalUnreadCount > 0 && (
              <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-rose-600 rounded-full animate-pulse" />
            )}
          </button>

          <button
            type="button"
            onClick={onLogout}
            className="p-2 rounded-xl text-slate-450 hover:text-rose-400 hover:bg-slate-900/55 transition-colors cursor-pointer"
            title="Sign Out"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Persistent Left Sidebar - Desktop Layout */}
      <aside className="hidden lg:flex w-72 bg-[#020617] border-r border-slate-900 text-slate-300 flex-col h-screen sticky top-0 shrink-0 select-none overflow-hidden" id="admin-desktop-sidebar">
        {renderSidebarContent(false)}
      </aside>

      {/* Dropdown Mobile Slide-out Overlay Drawer */}
      <AnimatePresence>
        {isMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="lg:hidden fixed inset-0 bg-black/60 z-50 transition-opacity"
              onClick={() => setIsMenuOpen(false)}
              id="mobile-sidebar-backdrop"
            />

            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'tween', ease: 'easeInOut', duration: 0.22 }}
              className="lg:hidden fixed inset-y-0 left-0 w-72 bg-[#020617] border-r border-slate-900 text-slate-300 z-50 flex flex-col overflow-hidden"
              id="mobile-sidebar-drawer"
            >
              {renderSidebarContent(true)}
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main Operations Body */}
      <main className="flex-1 flex flex-col min-w-0 min-h-screen" id="admin-main-grid-wrapper">
        {/* Desktop Header Top Bar */}
        <header className="hidden lg:flex bg-white border-b border-slate-105/80 px-8 py-5 items-center justify-between sticky top-0 z-30 shadow-sm shadow-slate-100/45" id="admin-desktop-header">
          <div>
            <h2 className="text-xl font-black text-slate-900 tracking-tight">
              {activeTab === 'reports' ? (
                reportViewMode === 'payments_range'
                  ? 'Student Tuition & Payments Range Reports'
                  : reportViewMode === 'student'
                  ? 'Individual Student Attendance History'
                  : 'Reports & Analytical Tracking'
              ) : (activeTab === 'overview' ? 'Operational Dashboard' : activeTab.slice(0, 1).toUpperCase() + activeTab.slice(1))}
            </h2>
            <p className="text-xs text-emerald-700 font-bold uppercase tracking-wider mt-1 flex items-center gap-1.5 font-mono">
              <span>Dugsiga Subuc</span>
              <span className="text-slate-300">|</span>
              <span className="text-[#c28956] font-serif lowercase italic">Xaraf Saxan iyo Xifdi Sugan</span>
            </p>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-emerald-50 text-emerald-800 border border-emerald-100 px-3.5 py-1.5 rounded-full text-[11px] font-bold shadow-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              <span>Admin Session Online</span>
            </div>

            {/* Real-time Notifications Bell Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowNotifPopup(!showNotifPopup)}
                className={`p-2.5 rounded-xl transition-all duration-200 cursor-pointer border relative flex items-center justify-center ${
                  showNotifPopup 
                    ? 'bg-blue-50 border-blue-200 text-blue-600' 
                    : 'bg-slate-50 border-slate-200/60 text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
                title="Notifications"
                id="admin-bell-button-desktop"
              >
                <Bell className="w-4 h-4" />
                {totalUnreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-600 outline outline-2 outline-white text-white font-extrabold text-[9px] rounded-full flex items-center justify-center animate-bounce">
                    {totalUnreadCount}
                  </span>
                )}
              </button>

              {/* Popover content */}
              <AnimatePresence>
                {showNotifPopup && (
                  <>
                    {/* Click outside backdrop element */}
                    <div className="fixed inset-0 z-40" onClick={() => setShowNotifPopup(false)} />
                    
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 mt-2 w-80 sm:w-96 bg-white border border-slate-150 rounded-2xl shadow-xl z-50 overflow-hidden"
                      id="admin-bell-dropdown"
                    >
                      {/* Header */}
                      <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/55 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Inbox className="w-4 h-4 text-slate-500" />
                          <span className="font-extrabold text-xs text-slate-700 tracking-wide uppercase">Real-time Notifications</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {totalUnreadCount > 0 && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleMarkAllNotificationsRead();
                              }}
                              className="text-[10px] font-extrabold text-blue-600 hover:text-blue-800 transition-colors bg-blue-50 border border-blue-100 rounded-lg px-2 py-1 cursor-pointer hover:bg-blue-100"
                            >
                              Mark read
                            </button>
                          )}
                          {systemNotifications.length > 0 && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (window.confirm("Ma hubtaa inaad tirtirto dhammaan ogeysiisyada? / Delete all notifications?")) {
                                  onSaveDatabase({
                                    ...database,
                                    notifications: []
                                  });
                                }
                              }}
                              className="text-[10px] font-extrabold text-rose-600 hover:text-rose-850 transition-colors bg-rose-50 border border-rose-100 rounded-lg px-2 py-1 cursor-pointer hover:bg-rose-100"
                            >
                              Clear all
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Notification list */}
                      <div className="max-h-[350px] overflow-y-auto divide-y divide-slate-50">
                        {systemNotifications.length === 0 ? (
                          <div className="px-5 py-8 text-center">
                            <p className="text-xs text-slate-400 font-bold">All clear! No current updates.</p>
                          </div>
                        ) : (
                          systemNotifications.map(n => {
                            const isUnread = n.senderRole !== 'admin' && !n.readBy.includes('admin');
                            // Standard time formatting helper
                            const timeAgo = (dateStr: string) => {
                              try {
                                const diffMs = Date.now() - new Date(dateStr).getTime();
                                const diffMins = Math.floor(diffMs / 60000);
                                if (diffMins < 1) return 'Just now';
                                if (diffMins < 60) return `${diffMins}m ago`;
                                const diffHrs = Math.floor(diffMins / 60);
                                if (diffHrs < 24) return `${diffHrs}h ago`;
                                return new Date(dateStr).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
                              } catch (err) {
                                return '';
                              }
                            };

                            return (
                              <div
                                key={n.id}
                                onClick={() => {
                                  handleMarkNotificationRead(n.id);
                                  // Redirect to Teacher Submissions space
                                  if (n.type === 'attendance' || n.type === 'exam') {
                                    setActiveTab('submissions');
                                    if (n.senderId) {
                                      setSubmissionSelectedTeacher(n.senderId);
                                    } else {
                                      setSubmissionSelectedTeacher('All');
                                    }
                                    if (n.type) {
                                      setSubmissionSelectedType(n.type);
                                    } else {
                                      setSubmissionSelectedType('All');
                                    }

                                    // Auto-expand the matched submission payload if found
                                    const matchingSub = (database.submissions || []).find(sub => 
                                      sub.teacherId === n.senderId && 
                                      sub.type === n.type
                                    );
                                    if (matchingSub) {
                                      setExpandedSubmissionId(matchingSub.id);
                                    }
                                  }
                                  setShowNotifPopup(false);
                                }}
                                className={`px-5 py-3.5 text-left transition-colors cursor-pointer flex gap-3 items-start ${
                                  isUnread ? 'bg-blue-50/30 hover:bg-blue-50/60' : 'hover:bg-slate-50'
                                }`}
                              >
                                <span className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${isUnread ? 'bg-rose-600 animate-pulse' : 'bg-transparent'}`} />
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs text-slate-700 font-semibold leading-normal break-words">
                                    {n.message}
                                  </p>
                                  <div className="flex items-center gap-2 mt-1.5">
                                    <span className="text-[9px] font-bold text-slate-400">
                                      by {n.senderName} ({n.senderRole})
                                    </span>
                                    <span className="text-[9px] font-mono text-slate-400">•</span>
                                    <span className="text-[9px] font-medium text-slate-400">
                                      {timeAgo(n.timestamp)}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
            
            <button
              onClick={onLogout}
              className="py-2.5 px-4 bg-slate-50 hover:bg-red-50 text-slate-700 hover:text-red-700 font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all duration-200 border border-slate-200/60 flex items-center gap-2 hover:border-red-200 cursor-pointer shadow-sm"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </header>

        <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8" id="admin-main-grid">
        
        {/* Dynamic Success Feedback Banner */}
        <AnimatePresence>
          {feedbackMsg && (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md">
              <motion.div
                initial={{ scale: 0.85, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.85, opacity: 0 }}
                className="bg-white rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl border border-slate-100 flex flex-col items-center relative overflow-hidden"
                id="admin-alert-banner"
              >
                {/* Visual Accent */}
                <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-teal-400 via-emerald-500 to-teal-500" />
                
                {/* Growing green success circle with tick */}
                <div className="relative mb-6">
                  {/* Ripple Ring Effect */}
                  <div className="absolute inset-0 rounded-full bg-emerald-100 animate-ping opacity-25 scale-125" />
                  <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-600 relative z-10 border-4 border-white shadow-md">
                    <Check className="w-10 h-10 stroke-[3px]" />
                  </div>
                </div>

                <h4 className="text-slate-930 font-black text-lg tracking-tight">System Action Success</h4>
                <p className="text-slate-500 text-xs mt-3 font-semibold leading-relaxed max-w-xs">{feedbackMsg}</p>
                
                <button 
                  onClick={() => setFeedbackMsg('')} 
                  className="mt-6 w-full py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-all cursor-pointer shadow-sm active:scale-95 animate-pulse"
                >
                  Dismiss Message
                </button>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* --- OVERVIEW TAB --- */}
        {activeTab === 'overview' && (
          <div className="space-y-8 animate-fade-in" id="portal-overview">
            
            {/* Core Stats Counter Deck */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              
              <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Active Students</p>
                  <p className="text-3xl font-extrabold text-slate-900 mt-2">{activeStudents.length}</p>
                </div>
                <div className="p-3.5 bg-emerald-50 text-emerald-600 rounded-2xl">
                  <UserCheck className="w-6 h-6" />
                </div>
              </div>

              <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Teachers Engaged</p>
                  <p className="text-3xl font-extrabold text-slate-900 mt-2">{totalTeachers}</p>
                </div>
                <div className="p-3.5 bg-sky-50 text-sky-600 rounded-2xl">
                  <GraduationCap className="w-6 h-6" />
                </div>
              </div>

              <div 
                onClick={() => setShowCollectedFeesBreakdownMonth(currentMonthFilter)}
                className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between cursor-pointer hover:shadow-md hover:border-teal-200 transition-all active:scale-[0.99] group" 
                id="overview-revenue-paid"
                title="Guji si aad u aragto halka ay lacagtu ka timid (Click to view breakdown)"
              >
                <div>
                  <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5">
                    Collected Fees ({currentMonthName})
                    <span className="text-[10px] text-teal-600 opacity-0 group-hover:opacity-100 transition-opacity font-bold bg-teal-50 px-1.5 py-0.5 rounded-md">View details 🔍</span>
                  </p>
                  <p className="text-3xl font-extrabold text-teal-700 mt-2">${Number(currentMonthPaidAmount).toFixed(2)}</p>
                  <p className="text-[10px] text-slate-400 mt-1">Click to see detail transaction breakdown</p>
                </div>
                <div className="p-3.5 bg-teal-50 text-teal-600 rounded-2xl group-hover:bg-teal-600 group-hover:text-white transition-colors">
                  <CircleDollarSign className="w-6 h-6" />
                </div>
              </div>

              <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between" id="overview-revenue-unpaid">
                <div>
                  <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Pending Balance</p>
                  <p className="text-2xl font-extrabold text-slate-500 mt-2">${Number(currentMonthUnpaidAmount).toFixed(2)}</p>
                </div>
                <div className="p-3.5 bg-slate-100 text-slate-600 rounded-2xl">
                  <Calculator className="w-6 h-6" />
                </div>
              </div>

            </div>

            {/* Bus Fare Statistics Deck */}
            <div className="bg-gradient-to-r from-indigo-50/40 to-purple-50/40 p-6 rounded-3xl border border-indigo-100 shadow-sm space-y-5" id="bus-fare-statistics-deck">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-indigo-100/60 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-indigo-600 text-white rounded-xl">
                    <Bus className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-slate-900 text-base">Adeegga Gaadiidka & Baska (Bus Fare Services)</h3>
                    <p className="text-slate-500 text-xs mt-0.5">Statistical insights for school bus transportation and monthly fare collection</p>
                  </div>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-black text-indigo-700 bg-white border border-indigo-100 px-3 py-1 rounded-full">{currentMonthName}</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                
                <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
                  <div>
                    <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Active Riders (Baska)</p>
                    <p className="text-2xl font-black text-slate-900 mt-1">{totalBusRidersCount}</p>
                    <p className="text-[10px] text-slate-400 mt-1">Students registered for transit</p>
                  </div>
                  <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
                    <Users className="w-5 h-5" />
                  </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
                  <div>
                    <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Bus Invoiced ({currentMonthName})</p>
                    <p className="text-2xl font-black text-slate-900 mt-1">${Number(currentMonthBusInvoiced).toFixed(2)}</p>
                    <p className="text-[10px] text-slate-400 mt-1">Total expected baska dues</p>
                  </div>
                  <div className="p-3 bg-sky-50 text-sky-600 rounded-xl">
                    <Calculator className="w-5 h-5" />
                  </div>
                </div>

                <div 
                  onClick={() => setShowBusCollectedBreakdownMonth(currentMonthFilter)}
                  className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between cursor-pointer hover:shadow-md hover:border-teal-200 transition-all active:scale-[0.99] group"
                  title="Guji si aad u aragto faahfaahinta lacagta baska (Click to view breakdown)"
                >
                  <div>
                    <p className="text-teal-605 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                      Bus Collected ({currentMonthName})
                      <span className="text-[9px] text-teal-600 opacity-0 group-hover:opacity-100 transition-opacity font-bold bg-teal-50 px-1 rounded-sm">View details 🔍</span>
                    </p>
                    <p className="text-2xl font-black text-teal-700 mt-1">${Number(currentMonthBusCollected).toFixed(2)}</p>
                    <p className="text-[10px] text-slate-400 mt-1">Click to see detail transaction breakdown</p>
                  </div>
                  <div className="p-3 bg-teal-50 text-teal-600 rounded-xl group-hover:bg-teal-600 group-hover:text-white transition-colors">
                    <CircleDollarSign className="w-5 h-5" />
                  </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
                  <div>
                    <p className="text-rose-605 text-[10px] font-bold uppercase tracking-wider">Pending Bus Balance</p>
                    <p className="text-2xl font-black text-rose-600 mt-1">${Number(currentMonthBusPending).toFixed(2)}</p>
                    <p className="text-[10px] text-slate-400 mt-1">Outstanding bus fees remaining</p>
                  </div>
                  <div className="p-3 bg-rose-50 text-rose-600 rounded-xl">
                    <AlertCircle className="w-5 h-5" />
                  </div>
                </div>

              </div>

              {/* Progress and lifetime insights */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white/70 p-4 rounded-2xl border border-indigo-100/30 text-xs">
                <div className="space-y-1">
                  <span className="font-extrabold text-slate-700 block text-xs">Heerka Realization-ka ee Baska (Bus Collection Efficiency State):</span>
                  <p className="text-slate-500 text-[10.5px]">
                    Current month realization rate is <span className="font-extrabold text-indigo-700">{currentMonthBusInvoiced > 0 ? Math.round((currentMonthBusCollected / currentMonthBusInvoiced) * 100) : 0}%</span>. 
                    All-time invoiced bus fare is <span className="font-semibold text-slate-800">${Number(allTimeBusInvoiced).toFixed(2)}</span> with <span className="font-semibold text-teal-700">${Number(allTimeBusCollected).toFixed(2)}</span> in total deposits.
                  </p>
                </div>
                <div className="w-full sm:w-48 bg-slate-100 rounded-full h-2 overflow-hidden shrink-0">
                  <div 
                    className="bg-indigo-650 h-full rounded-full transition-all duration-500" 
                    style={{ width: `${currentMonthBusInvoiced > 0 ? Math.round((currentMonthBusCollected / currentMonthBusInvoiced) * 100) : 0}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Graphics Stats Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* Daily attendance Trends Chart (Recharts) */}
              <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="font-bold text-slate-800 text-base">Student Attendance Ratios</h3>
                    <p className="text-slate-400 text-xs mt-0.5">Logs for last 5 active sessions</p>
                  </div>
                  <span className="p-1 px-3 bg-slate-100 text-slate-600 text-[10px] font-bold rounded-lg uppercase tracking-wider">Daily Session Drill</span>
                </div>
                
                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={attendanceTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid stroke="#f1f5f9" strokeDasharray="3 3" />
                      <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} fontWeight={600} />
                      <YAxis stroke="#94a3b8" fontSize={11} fontWeight={600} />
                      <Tooltip contentStyle={{ borderRadius: '12px', fontSize: '11px', fontWeight: 650 }} />
                      <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', fontWeight: 500, paddingTop: '10px' }} />
                      <Bar dataKey="Present" fill="#10b981" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Late" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Absent" fill="#ef4444" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Billing pie charts */}
              <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between">
                <div>
                  <h3 className="font-bold text-slate-800 text-base">Monthly Fees Realization</h3>
                  <p className="text-slate-400 text-xs mt-0.5">Payment distribution for current month</p>
                </div>

                <div className="h-44 w-full flex items-center justify-center relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={billingOverviewData}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={75}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {billingOverviewData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  
                  {/* Absolute Center Metric */}
                  <div className="absolute text-center">
                    <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">{currentMonthName} Paid %</p>
                    <p className="text-2xl font-extrabold text-teal-800">
                      {currentMonthInvoiced > 0 
                        ? Math.round((currentMonthPaidAmount / currentMonthInvoiced) * 100) 
                        : 0}%
                    </p>
                  </div>
                </div>

                <div className="space-y-2 pt-2">
                  <div className="flex justify-between items-center bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-xs">
                    <span className="flex items-center gap-2 font-semibold text-slate-600">
                      <span className="w-2.5 h-2.5 rounded-full bg-teal-600 inline-block" />
                      Collected Fees
                    </span>
                    <span className="font-extrabold text-slate-800">${Number(currentMonthPaidAmount).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-xs">
                    <span className="flex items-center gap-2 font-semibold text-slate-600">
                      <span className="w-2.5 h-2.5 rounded-full bg-slate-300 inline-block" />
                      Unpaid Balances
                    </span>
                    <span className="font-extrabold text-slate-800">${Number(currentMonthUnpaidAmount).toFixed(2)}</span>
                  </div>
                </div>
              </div>

            </div>

            {/* Landing Page Web Contact Inbox Quick View */}
            <div className="bg-white p-6 rounded-3xl border border-rose-100 hover:border-indigo-150 transition-all shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500"></span>
                    </span>
                    Public Contact Inbox
                  </h3>
                  <p className="text-slate-400 text-xs mt-0.5 font-semibold">Real-time inquiries submitted by visitors from the academy landing page</p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('landing')}
                  className="px-3.5 py-1.5 bg-slate-100 hover:bg-indigo-650 text-slate-705 hover:text-white font-bold text-xs rounded-xl cursor-pointer transition-all shrink-0 flex items-center gap-1 shadow-sm uppercase tracking-wider"
                >
                  <Globe className="w-3.5 h-3.5" />
                  Manage Landing Control
                </button>
              </div>

              {(() => {
                const messagesList = database.contactMessages || [];
                if (messagesList.length === 0) {
                  return (
                    <div className="p-6 bg-slate-50 rounded-2xl text-center border border-dashed border-slate-205">
                      <p className="text-slate-450 text-xs font-bold uppercase tracking-wider">No landing page messages received yet</p>
                    </div>
                  );
                }

                return (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {messagesList.slice(0, 3).map((item) => (
                      <div 
                        key={item.id} 
                        className={`p-4 rounded-2xl border text-xs flex flex-col justify-between transition-all relative ${
                          !item.read 
                            ? 'bg-rose-50/40 border-rose-100 shadow-md shadow-rose-500/5' 
                            : 'bg-slate-50/50 border-slate-150'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between gap-2.5 mb-2 border-b border-slate-100 pb-1.5">
                            <span className="font-extrabold text-slate-850 tracking-tight shrink-0 truncate max-w-[140px]" title={item.name}>
                              {item.name}
                            </span>
                            <span className="text-[10px] text-slate-400 font-semibold shrink-0">
                              {item.timestamp ? new Date(item.timestamp).toLocaleDateString() : 'Today'}
                            </span>
                          </div>
                          {item.email && (
                            <p className="text-[10px] text-slate-500 font-mono select-all truncate mb-1">
                              Email: {item.email}
                            </p>
                          )}
                          <p className="text-slate-600 leading-relaxed font-semibold italic text-[11px] line-clamp-3 my-1.5">
                            "{item.message}"
                          </p>
                        </div>

                        <div className="mt-3 pt-2.5 border-t border-slate-100/60 flex items-center justify-between gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              // Mark as read/unread toggle
                              const updatedMessages = messagesList.map(m => 
                                m.id === item.id ? { ...m, read: !m.read } : m
                              );
                              onSaveDatabase({
                                ...database,
                                contactMessages: updatedMessages
                              });
                            }}
                            className={`px-2 py-1 rounded text-[9px] font-black uppercase tracking-wider cursor-pointer ${
                              !item.read 
                                ? 'bg-rose-600 text-white shadow-sm shadow-rose-600/10' 
                                : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                            }`}
                          >
                            {!item.read ? 'New (Mark read)' : 'Read'}
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setConfirmModal({
                                isOpen: true,
                                title: "Delete Inbox Message?",
                                message: "Are you sure you want to permanently delete this inbox message from the overview audit list? This is irreversible.",
                                accentColor: 'rose',
                                onConfirm: () => {
                                  const updatedMessages = messagesList.filter(m => m.id !== item.id);
                                  onSaveDatabase({
                                    ...database,
                                    contactMessages: updatedMessages
                                  });
                                  setFeedbackMsg("Contact message deleted successfully!");
                                  setTimeout(() => setFeedbackMsg(''), 2500);
                                  setConfirmModal(null);
                                }
                              });
                            }}
                            className="p-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-100 cursor-pointer hover:text-white hover:bg-rose-600 transition-colors"
                            title="Delete message permanently"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>

          </div>
        )}

        {/* --- STUDENTS TAB --- */}
        {activeTab === 'students' && (
          <div className="space-y-8 animate-fade-in" id="portal-students">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* Left Column: Register Student Card Form */}
              <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm self-start h-auto">
                <div className="flex items-center gap-2.5 mb-5">
                  <span className="p-2 bg-indigo-50 text-indigo-600 rounded-xl inline-flex"><UserPlus className="w-5 h-5" /></span>
                  <h3 className="font-extrabold text-slate-900 text-lg">
                    {editingStudent ? 'Update Profile' : 'Secure Registration'}
                  </h3>
                </div>

                <p className="text-slate-400 text-xs mb-5 leading-normal font-medium">
                  {editingStudent
                    ? `Modifying details for ${editingStudent.name} (ID: ${editingStudent.id}). All changes commit instantly.`
                    : 'Add custom student identities. Registered pupils are automatically assigned to their respective teachers and classroom spaces.'
                  }
                </p>

                <form onSubmit={handleRegisterStudent} className="space-y-4" id="register-new-student-form">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 pl-0.5">Student Full Name *</label>
                    <input
                      type="text"
                      required
                      value={newStudentName}
                      onChange={(e) => setNewStudentName(e.target.value)}
                      placeholder="e.g. Abdirahman Jama Farah"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white rounded-xl text-xs font-semibold text-slate-800 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 pl-0.5">Parent Full Name *</label>
                    <input
                      type="text"
                      required
                      value={newStudentParent}
                      onChange={(e) => setNewStudentParent(e.target.value)}
                      placeholder="e.g. Jama Farah Warsame"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white rounded-xl text-xs font-semibold text-slate-800 outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="col-span-2">
                      <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 pl-0.5">Parent Contact Phone *</label>
                      <input
                        type="text"
                        required
                        value={newStudentPhone}
                        onChange={(e) => setNewStudentPhone(e.target.value)}
                        placeholder="e.g. +252 61 555 1200"
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white rounded-xl text-xs font-semibold text-slate-800 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 pl-0.5">Age / Da'da</label>
                      <input
                        type="number"
                        value={newStudentAge}
                        onChange={(e) => setNewStudentAge(e.target.value === '' ? '' : Number(e.target.value))}
                        placeholder="e.g. 10"
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white rounded-xl text-xs font-bold text-slate-800 outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 pl-0.5">Monthly Tuition ($) *</label>
                      <input
                        type="number"
                        step="any"
                        required
                        value={newStudentFee}
                        onChange={(e) => setNewStudentFee(Number(e.target.value))}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white rounded-xl text-xs font-bold text-slate-800 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 pl-0.5">Monthly Bus Fare ($) *</label>
                      <input
                        type="number"
                        step="any"
                        required
                        value={newStudentBusFee}
                        onChange={(e) => setNewStudentBusFee(Number(e.target.value))}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white rounded-xl text-xs font-bold text-slate-800 outline-none"
                        placeholder="0"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 pl-0.5 font-medium">Assigned Space *</label>
                    <select
                      value={newStudentClass}
                      onChange={(e) => {
                        setNewStudentClass(e.target.value);
                        // Auto match teacher depending on selected class seed
                        const matchT = database.teachers.find(t => t.classAssigned === e.target.value);
                        if (matchT) setNewStudentTeacher(matchT.id);
                      }}
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white outline-none cursor-pointer"
                    >
                      {classSelectionList.map(cls => (
                        <option key={cls} value={cls}>{cls}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 pl-0.5">Assigned Instructor *</label>
                    <select
                      value={newStudentTeacher}
                      onChange={(e) => setNewStudentTeacher(e.target.value)}
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white outline-none cursor-pointer"
                    >
                      {database.teachers.map(t => (
                        <option key={t.id} value={t.id}>{t.name} ({t.classAssigned})</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 pl-0.5 font-medium">Assigned Shift / Session *</label>
                    <select
                      value={newStudentSession}
                      onChange={(e) => setNewStudentSession(e.target.value as 'Morning' | 'Afternoon' | 'Both')}
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white outline-none cursor-pointer"
                    >
                      <option value="Both">Both (Morning & Afternoon)</option>
                      <option value="Morning">Morning Session Only 🌅</option>
                      <option value="Afternoon">Afternoon Session Only 🌙</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 pl-0.5">Registration Date / Taariikhda Diiwangelinta</label>
                    <input
                      type="date"
                      value={newStudentRegDate}
                      onChange={(e) => setNewStudentRegDate(e.target.value)}
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white outline-none cursor-pointer"
                    />
                    <p className="text-[10px] text-slate-400 mt-1">Leave empty to auto-use today's date.</p>
                  </div>

                  {/* Photo Upload Zone */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 pl-0.5">Student Profile Photo</label>
                    <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-200">
                      <div className="w-16 h-16 rounded-xl bg-slate-200 border border-slate-300 flex-shrink-0 overflow-hidden flex items-center justify-center relative group">
                        {newStudentImage ? (
                          <>
                            <img referrerPolicy="no-referrer" src={newStudentImage} alt="Preview" className="w-full h-full object-cover" />
                            <button
                              type="button"
                              onClick={() => setNewStudentImage('')}
                              className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[10px] font-bold"
                            >
                              Remove
                            </button>
                          </>
                        ) : (
                          <span className="text-slate-400 text-xs">No Photo</span>
                        )}
                      </div>
                      
                      <div className="flex-1">
                        <input
                          type="file"
                          accept="image/*"
                          id="student-image-file-input"
                          className="hidden"
                          onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                              handleResizeAndCompressImage(e.target.files[0], (url) => {
                                setNewStudentImage(url);
                              });
                            }
                          }}
                        />
                        <label
                          htmlFor="student-image-file-input"
                          className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-150 cursor-pointer transition-all inline-block shadow-sm"
                        >
                          {newStudentImage ? 'Change Photo' : 'Upload Student Image'}
                        </label>
                        <p className="text-[10px] text-slate-400 mt-1">PNG or JPG. Auto-scales for ID cards.</p>
                      </div>
                    </div>
                  </div>

                  {editingStudent ? (
                    <div className="flex gap-2.5 mt-2">
                      <button
                        type="button"
                        onClick={handleCancelEditStudent}
                        className="w-1/3 py-3 px-3 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs uppercase tracking-wider rounded-xl cursor-pointer transition-all text-center"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="w-2/3 py-3 px-4 bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white font-bold text-xs uppercase tracking-wider rounded-xl cursor-pointer shadow-lg shadow-teal-600/10 transition-all flex items-center justify-center gap-2"
                      >
                        <Save className="w-4 h-4" />
                        Save Changes
                      </button>
                    </div>
                  ) : (
                    <button
                      type="submit"
                      className="w-full py-3 px-4 bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white font-bold text-xs uppercase tracking-wider rounded-xl cursor-pointer shadow-lg shadow-teal-600/10 transition-all flex items-center justify-center gap-2 mt-2"
                    >
                      <UserPlus className="w-4 h-4" />
                      Complete Registration
                    </button>
                  )}
                </form>
              </div>

              {/* Right Column: Searchable database Table */}
              <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                    <div>
                      <h3 className="font-extrabold text-slate-900 text-lg">Student Directory</h3>
                      <p className="text-slate-400 text-xs mt-0.5">Search and edit active / suspended student positions</p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <select
                        value={studentClassFilter}
                        onChange={(e) => setStudentClassFilter(e.target.value)}
                        className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-705 outline-none cursor-pointer"
                      >
                        <option value="All">All Classes</option>
                        {classSelectionList.map(cls => (
                          <option key={cls} value={cls}>{cls}</option>
                        ))}
                      </select>

                      <select
                        value={studentTeacherFilter}
                        onChange={(e) => setStudentTeacherFilter(e.target.value)}
                        className="px-3 py-2 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-xl text-xs font-bold text-amber-900 outline-none cursor-pointer"
                      >
                        <option value="All">All Instructors</option>
                        {database.teachers.map(teach => (
                          <option key={teach.id} value={teach.id}>
                            {teach.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Search query input */}
                  <div className="relative mb-5">
                    <Search className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 w-5 h-5 pointer-events-none" />
                    <input
                      type="text"
                      placeholder="Search students by full name, ID, or parental fields..."
                      value={studentSearch}
                      onChange={(e) => setStudentSearch(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:border-teal-500 focus:bg-white outline-none"
                    />
                  </div>

                  {/* Students Table */}
                  <div className="overflow-x-auto rounded-2xl border border-slate-100 scrollbar-thin">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-50 text-slate-400 font-bold border-b border-slate-150 uppercase tracking-wider">
                          <th className="py-3 px-4">Student ID</th>
                          <th className="py-3 px-4">Full Name</th>
                          <th className="py-3 px-4">Parent details</th>
                          <th className="py-3 px-4">Class</th>
                          <th className="py-3 px-4">Standing Group</th>
                          <th className="py-3 px-4">Instructor</th>
                          <th className="py-3 px-4">Tuition</th>
                          <th className="py-3 px-4 text-center">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredStudents.length === 0 ? (
                          <tr>
                            <td colSpan={8} className="py-12 text-center text-slate-450 font-medium">No student matching filter criteria found.</td>
                          </tr>
                        ) : (
                          filteredStudents.map(student => (
                            <tr key={student.id} className="hover:bg-slate-50/50 transition-colors">
                              <td className="py-3.5 px-4 font-bold text-slate-800">{student.id}</td>
                              <td className="py-3.5 px-4">
                                <div className="flex items-center gap-2.5">
                                  <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 bg-slate-100 border border-slate-200 flex items-center justify-center">
                                    {student.imageUrl ? (
                                      <img referrerPolicy="no-referrer" src={student.imageUrl} alt={student.name} className="w-full h-full object-cover" />
                                    ) : (
                                      <div className="text-[10px] text-slate-450 font-bold tracking-widest">
                                        {student.name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase() || 'ST'}
                                      </div>
                                    )}
                                  </div>
                                  <div className="flex flex-col">
                                    <span className="font-extrabold text-slate-905">{student.name}</span>
                                    <span className="text-[10px] text-slate-400 font-medium">Reg: {student.registrationDate || '2026-05-15'}</span>
                                  </div>
                                </div>
                              </td>
                              <td className="py-3.5 px-4">
                                <div className="font-semibold text-slate-705 text-slate-700">{student.parentName}</div>
                                <div className="text-[10px] text-slate-400 font-medium mt-0.5">{student.parentPhone}</div>
                              </td>
                              <td className="py-3.5 px-4">
                                <div className="font-semibold text-slate-707 text-slate-700">{student.className}</div>
                                <div className="mt-1.5 font-mono text-[9px] text-indigo-600 bg-indigo-50 border border-indigo-100/50 rounded-lg px-2 py-0.5 inline-block">
                                  Shift: {student.session || 'Both'}
                                </div>
                              </td>
                              <td className="py-3.5 px-4">
                                {(() => {
                                  const compGroup = getStudentCompetitionGroup(student.id);
                                  const trend = getStudentProgressTrend(student.id);
                                  return (
                                    <div className="flex flex-col gap-1">
                                      <span className={`px-2.5 py-0.5 rounded text-[10px] font-black border uppercase tracking-wider text-center ${
                                        compGroup.group.includes('Group A') ? 'bg-emerald-50 text-emerald-800 border-emerald-100' :
                                        compGroup.group.includes('Group B') ? 'bg-teal-50 text-teal-800 border-teal-100' :
                                        compGroup.group.includes('Group C') ? 'bg-indigo-50 text-indigo-850 border-indigo-100' :
                                        compGroup.group.includes('Group D') ? 'bg-amber-50 text-amber-800 border-amber-100' :
                                        compGroup.group.includes('Group E') ? 'bg-rose-50 text-rose-800 border-rose-100' :
                                        'bg-slate-550 text-slate-500 border-slate-200'
                                      }`}>
                                        {compGroup.group}
                                      </span>
                                      {trend.trend !== 'No Data' && (
                                        <span className="text-[10px] text-slate-450 font-bold flex items-center justify-center gap-1 mt-0.5">
                                          <span>Outlook:</span>
                                          <span className="font-extrabold text-slate-600">{trend.icon} {trend.trend}</span>
                                        </span>
                                      )}
                                    </div>
                                  );
                                })()}
                              </td>
                              <td className="py-3.5 px-4">
                                {(() => {
                                  const teach = database.teachers.find(t => t.id === student.teacherId);
                                  return teach ? (
                                    <div className="flex flex-col">
                                      <span className="font-extrabold text-slate-800">{teach.name}</span>
                                      <span className="text-[9px] text-indigo-650 font-bold">ID: {teach.id}</span>
                                    </div>
                                  ) : (
                                    <span className="text-amber-600 font-black italic bg-amber-50 border border-amber-100 px-1.5 py-0.5 rounded text-[9px]">unassigned</span>
                                  );
                                })()}
                              </td>
                              <td className="py-3.5 px-4 text-teal-700 font-extrabold">
                                <div>${student.monthlyFee}</div>
                                {student.busFee ? (
                                  <div className="text-[9px] text-indigo-700 font-bold bg-indigo-50 border border-indigo-150 rounded px-1 mt-0.5 inline-block whitespace-nowrap">
                                    + ${student.busFee} Bus 🚌
                                  </div>
                                ) : null}
                              </td>
                              <td className="py-3.5 px-4 text-center">
                                <div className="flex items-center justify-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => setShowStudentDetailModal(student)}
                                    className="px-2 py-1.5 rounded-xl text-[10px] bg-sky-50 border border-sky-150 text-sky-700 hover:bg-sky-100 font-extrabold cursor-pointer transition-all shrink-0 flex items-center gap-1"
                                    title="View Student Full Profile Information"
                                  >
                                    Info ℹ️
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setMediaStudentTarget(student)}
                                    className="px-2 py-1.5 rounded-xl text-[10px] bg-rose-50 border border-rose-150 text-rose-700 hover:bg-rose-100 font-extrabold cursor-pointer transition-all shrink-0 flex items-center gap-1"
                                    title="Student Media Hub: Record voice, video or update picture files"
                                  >
                                    Media 🎥
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setShowPrintIDBadge({
                                      id: student.id,
                                      name: student.name,
                                      role: 'Student',
                                      classNameSelected: student.className,
                                      parentOrCheckInTime: student.parentPhone,
                                      imageUrl: student.imageUrl || ''
                                    })}
                                    className="px-2 py-1.5 rounded-xl text-[10px] bg-teal-50 border border-teal-150 text-teal-700 hover:bg-teal-100 font-extrabold cursor-pointer transition-all shrink-0 flex items-center gap-1"
                                    title="Generate Student ID card badge"
                                  >
                                    Badge 🪪
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleSelectEditStudent(student)}
                                    className="px-2 py-1.5 rounded-xl text-[10px] bg-indigo-50 border border-indigo-100 text-indigo-700 hover:bg-indigo-100 font-extrabold cursor-pointer transition-all shrink-0 flex items-center gap-1"
                                    title="Edit student details"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleToggleStudentStatus(student.id)}
                                    className={`px-2 py-1.5 rounded-xl text-[10px] font-extrabold cursor-pointer transition-all shrink-0 ${
                                      student.active
                                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-100 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-100'
                                        : 'bg-rose-50 text-rose-700 border border-rose-100 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-100'
                                    }`}
                                    title="Click to toggle active status"
                                  >
                                    {student.active ? 'Active' : 'Suspended'}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteStudent(student.id)}
                                    className="p-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-100 cursor-pointer transition-all shrink-0 flex items-center justify-center"
                                    title="Delete Student Record permanently"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400 font-semibold" id="student-catalogue-pager">
                  <span>Showing {filteredStudents.length} of {database.students.length} Total records</span>
                  <span>Active Registered Balance: ${activeStudents.reduce((sum, s) => sum + s.monthlyFee, 0).toFixed(2)}/mo</span>
                </div>
              </div>

            </div>

          </div>
        )}

        {/* --- TEACHERS TAB --- */}
        {activeTab === 'teachers' && (
          <div className="space-y-8 animate-fade-in" id="portal-teachers">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* Left Form: Add Teacher */}
              <div id="teacher-form-container" className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm self-start transition-all duration-300">
                <div className="flex items-center gap-2.5 mb-5">
                  <span className="p-2 bg-indigo-50 text-indigo-600 rounded-xl inline-flex"><UserPlus className="w-5 h-5" /></span>
                  <h3 className="font-extrabold text-slate-900 text-lg">
                    {editingTeacher ? 'Update Staff Info' : 'Staff Accreditation'}
                  </h3>
                </div>

                <p className="text-slate-400 text-xs mb-5 leading-normal font-medium">
                  {editingTeacher
                    ? "Update teacher credentials and classroom assignments. Changes take effect instantly across the system."
                    : "Add custom teacher accounts to delegate management duties. Once registered, staff can sign in using their custom credentials."
                  }
                </p>

                {editingTeacher ? (
                  <form onSubmit={handleSaveTeacherEdit} className="space-y-4" id="edit-teacher-form">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 pl-0.5">Teacher Full Name *</label>
                      <input
                        type="text"
                        required
                        value={editTeacherName}
                        onChange={(e) => setEditTeacherName(e.target.value)}
                        placeholder="e.g. Sh. Hassan Salad"
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white rounded-xl text-xs font-semibold text-slate-800 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 pl-0.5">Assigned Class / Division *</label>
                      <select
                        value={editTeacherClass}
                        onChange={(e) => setEditTeacherClass(e.target.value)}
                        className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white outline-none cursor-pointer"
                      >
                        {classSelectionList.map(cls => (
                          <option key={cls} value={cls}>{cls}</option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 pl-0.5">Username *</label>
                        <input
                          type="text"
                          required
                          value={editTeacherUser}
                          onChange={(e) => setEditTeacherUser(e.target.value)}
                          placeholder="hassan"
                          className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white rounded-xl text-xs font-semibold text-slate-800 outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 pl-0.5 font-bold">Password *</label>
                        <input
                          type="text"
                          required
                          value={editTeacherPassword}
                          onChange={(e) => setEditTeacherPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white rounded-xl text-xs font-bold text-slate-800 outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 pl-0.5 font-semibold">Required Check-In Time (Late threshold) *</label>
                      <input
                        type="time"
                        required
                        value={editTeacherTime}
                        onChange={(e) => setEditTeacherTime(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white rounded-xl text-xs font-semibold text-slate-800 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 pl-0.5 font-bold">Registration Date / Diiwangelinta</label>
                      <input
                        type="date"
                        value={editTeacherRegDate}
                        onChange={(e) => setEditTeacherRegDate(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white rounded-xl text-xs font-semibold text-slate-800 outline-none cursor-pointer"
                      />
                    </div>

                    {/* Teacher Photo Upload Zone */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 pl-0.5">Teacher Profile Photo</label>
                      <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-200">
                        <div className="w-16 h-16 rounded-xl bg-slate-200 border border-slate-300 flex-shrink-0 overflow-hidden flex items-center justify-center relative group">
                          {newTeacherImage ? (
                            <>
                              <img referrerPolicy="no-referrer" src={newTeacherImage} alt="Teacher Preview" className="w-full h-full object-cover" />
                              <button
                                type="button"
                                onClick={() => setNewTeacherImage('')}
                                className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[10px] font-bold"
                              >
                                Remove
                              </button>
                            </>
                          ) : (
                            <span className="text-slate-400 text-xs">No Photo</span>
                          )}
                        </div>
                        
                        <div className="flex-1">
                          <input
                            type="file"
                            accept="image/*"
                            id="teacher-edit-image-file-input"
                            className="hidden"
                            onChange={(e) => {
                              if (e.target.files && e.target.files[0]) {
                                handleResizeAndCompressImage(e.target.files[0], (url) => {
                                  setNewTeacherImage(url);
                                });
                              }
                            }}
                          />
                          <label
                            htmlFor="teacher-edit-image-file-input"
                            className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-150 cursor-pointer transition-all inline-block shadow-sm"
                          >
                            {newTeacherImage ? 'Change Photo' : 'Upload Staff Image'}
                          </label>
                          <p className="text-[10px] text-slate-400 mt-1">PNG or JPG. Auto-scales for ID cards.</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2 pt-2">
                      <button
                        type="submit"
                        className="flex-1 py-3 px-4 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl cursor-pointer shadow-lg shadow-teal-600/10 transition-all flex items-center justify-center gap-2"
                      >
                        Save Details
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingTeacher(null)}
                        className="py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs uppercase tracking-wider rounded-xl cursor-pointer text-center"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : (
                  <form onSubmit={handleRegisterTeacher} className="space-y-4" id="register-new-teacher-form">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 pl-0.5">Teacher Full Name *</label>
                      <input
                        type="text"
                        required
                        value={newTeacherName}
                        onChange={(e) => setNewTeacherName(e.target.value)}
                        placeholder="e.g. Sh. Hassan Salad"
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white rounded-xl text-xs font-semibold text-slate-800 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 pl-0.5">Assigned Class / Division *</label>
                      <select
                        value={newTeacherClass}
                        onChange={(e) => setNewTeacherClass(e.target.value)}
                        className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white outline-none cursor-pointer"
                      >
                        {classSelectionList.map(cls => (
                          <option key={cls} value={cls}>{cls}</option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 pl-0.5">Username *</label>
                        <input
                          type="text"
                          required
                          value={newTeacherUser}
                          onChange={(e) => setNewTeacherUser(e.target.value)}
                          placeholder="hassan"
                          className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white rounded-xl text-xs font-semibold text-slate-800 outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 pl-0.5 font-medium">Password *</label>
                        <input
                          type="password"
                          required
                          value={newTeacherPassword}
                          onChange={(e) => setNewTeacherPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white rounded-xl text-xs font-bold text-slate-800 outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 pl-0.5">Required Check-In Time (Late threshold) *</label>
                      <input
                        type="time"
                        required
                        value={newTeacherTime}
                        onChange={(e) => setNewTeacherTime(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white rounded-xl text-xs font-semibold text-slate-800 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 pl-0.5">Registration Date / Taariikhda Diiwangelinta</label>
                      <input
                        type="date"
                        value={newTeacherRegDate}
                        onChange={(e) => setNewTeacherRegDate(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white rounded-xl text-xs font-semibold text-slate-800 outline-none cursor-pointer"
                      />
                      <p className="text-[10px] text-slate-400 mt-1">Leave empty to auto-use today's date.</p>
                    </div>

                    {/* Teacher Photo Upload Zone */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 pl-0.5">Teacher Profile Photo</label>
                      <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-200">
                        <div className="w-16 h-16 rounded-xl bg-slate-200 border border-slate-300 flex-shrink-0 overflow-hidden flex items-center justify-center relative group">
                          {newTeacherImage ? (
                            <>
                              <img referrerPolicy="no-referrer" src={newTeacherImage} alt="Teacher Preview" className="w-full h-full object-cover" />
                              <button
                                type="button"
                                onClick={() => setNewTeacherImage('')}
                                className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[10px] font-bold"
                              >
                                Remove
                              </button>
                            </>
                          ) : (
                            <span className="text-slate-400 text-xs">No Photo</span>
                          )}
                        </div>
                        
                        <div className="flex-1">
                          <input
                            type="file"
                            accept="image/*"
                            id="teacher-reg-image-file-input"
                            className="hidden"
                            onChange={(e) => {
                              if (e.target.files && e.target.files[0]) {
                                handleResizeAndCompressImage(e.target.files[0], (url) => {
                                  setNewTeacherImage(url);
                                });
                              }
                            }}
                          />
                          <label
                            htmlFor="teacher-reg-image-file-input"
                            className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-150 cursor-pointer transition-all inline-block shadow-sm"
                          >
                            {newTeacherImage ? 'Change Photo' : 'Upload Staff Image'}
                          </label>
                          <p className="text-[10px] text-slate-400 mt-1">PNG or JPG. Auto-scales for ID cards.</p>
                        </div>
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="w-full py-3 px-4 bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white font-bold text-xs uppercase tracking-wider rounded-xl cursor-pointer shadow-lg shadow-teal-600/10 transition-all flex items-center justify-center gap-2 mt-2"
                    >
                      <PlusCircle className="w-4 h-4" />
                      Register certified teacher
                    </button>
                  </form>
                )}
              </div>



              {/* Right: Teachers Directory */}
              <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                <h3 className="font-extrabold text-slate-900 text-lg mb-1">Administrative Staff Directory</h3>
                <p className="text-slate-400 text-xs mb-6">Staff list managing Dugsiga Subuc classroom divisions</p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {database.teachers.map((teacher, idx) => {
                    // Count students assigned
                    const studentCount = database.students.filter(s => s.teacherId === teacher.id && s.active).length;
                    // Extract initials for the avatar
                    const cleanName = teacher.name.replace(/Sh\.\s+|Malm\.\s+|Sheikh\.\s+/gi, '');
                    const nameParts = cleanName.trim().split(/\s+/);
                    const initials = nameParts.length >= 2 
                      ? (nameParts[0][0] + nameParts[1][0]).toUpperCase()
                      : nameParts[0] ? nameParts[0].slice(0, 2).toUpperCase() : 'ST';

                    // Premium gradients for card icons
                    const avatarGradients = [
                      'from-teal-500 to-emerald-400 text-teal-50 shadow-teal-100',
                      'from-indigo-500 to-purple-400 text-indigo-50 shadow-indigo-100',
                      'from-amber-500 to-orange-400 text-amber-50 shadow-amber-100',
                      'from-rose-500 to-pink-400 text-rose-50 shadow-rose-100',
                      'from-blue-500 to-cyan-400 text-blue-50 shadow-blue-100'
                    ];
                    const gradient = avatarGradients[idx % avatarGradients.length];

                    return (
                      <div 
                        key={teacher.id} 
                        className="bg-white p-6 rounded-3xl border border-slate-100 hover:border-teal-100 hover:shadow-lg hover:shadow-slate-100/80 transition-all duration-300 flex flex-col justify-between group" 
                        id={`teacher-card-${teacher.id}`}
                      >
                        <div>
                          <div className="flex items-center gap-4">
                            {/* Stylish Avatar with Photo or initials */}
                            <div className="w-12 h-12 rounded-2xl overflow-hidden shrink-0 shadow-md relative bg-slate-100 border border-slate-205 flex items-center justify-center">
                              {teacher.imageUrl ? (
                                <img referrerPolicy="no-referrer" src={teacher.imageUrl} alt={teacher.name} className="w-full h-full object-cover" />
                              ) : (
                                <div className={`w-full h-full bg-gradient-to-tr ${gradient} flex items-center justify-center text-sm font-black tracking-wider uppercase`}>
                                  {initials}
                                </div>
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-[10px] font-black text-slate-400 tracking-wider">ID: {teacher.id}</span>
                                <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full ${
                                  studentCount > 0 
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                                    : 'bg-amber-50 text-amber-600 border border-amber-100'
                                }`}>
                                  {studentCount} Students
                                </span>
                              </div>
                              <h4 className="font-extrabold text-slate-800 text-sm mt-1 truncate group-hover:text-teal-650 transition-colors">{teacher.name}</h4>
                            </div>
                          </div>

                          <div className="mt-4 space-y-2.5 bg-slate-50/75 p-3 rounded-2xl border border-slate-100/50">
                            <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                              <BookOpen className="w-3.5 h-3.5 text-slate-450 shrink-0" />
                              <span className="truncate">Class: <span className="font-bold text-slate-800">{teacher.classAssigned || teacher.className}</span></span>
                            </div>
                            <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                              <Clock className="w-3.5 h-3.5 text-slate-450 shrink-0" />
                              <span className="truncate">Expected Check-in: <span className="font-mono font-bold text-teal-600">{teacher.requiredCheckInTime || '07:30'}</span></span>
                            </div>
                            <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                              <CalendarRange className="w-3.5 h-3.5 text-slate-450 shrink-0" />
                              <span className="truncate">Certified/Reg: <span className="font-bold text-slate-800">{teacher.registrationDate || '2026-05-15'}</span></span>
                            </div>
                            <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500">
                              <span className="flex items-center gap-1.5 min-w-0">
                                <Lock className="w-3 h-3 text-slate-450 shrink-0" />
                                <span className="truncate">Key: <span className="font-bold text-slate-700">{teacher.username}</span></span>
                              </span>
                              <span className="shrink-0 flex items-center gap-1 text-[10px] text-emerald-600 font-extrabold bg-emerald-50/50 px-1.5 py-0.5 rounded">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Certified
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="pt-4 mt-4 border-t border-slate-100 flex gap-2 justify-end">
                          <button
                            type="button"
                            onClick={() => setShowPrintIDBadge({
                              id: teacher.id,
                              name: teacher.name,
                              role: 'Teacher',
                              classNameSelected: teacher.classAssigned || teacher.className || 'Memorization Instructor',
                              parentOrCheckInTime: teacher.requiredCheckInTime || '07:30',
                              imageUrl: teacher.imageUrl || ''
                            })}
                            className="flex-1 sm:flex-initial px-3 py-2 text-[10px] bg-teal-50 hover:bg-teal-600 text-teal-705 hover:text-white font-extrabold uppercase rounded-xl border border-teal-100 shadow-sm transition-all duration-250 flex items-center justify-center gap-1 cursor-pointer"
                            title="Generate printed ID card for this instructor"
                          >
                            Badge 🪪
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSelectEditTeacher(teacher)}
                            className="flex-1 sm:flex-initial px-3.5 py-2 text-[10px] bg-indigo-50 hover:bg-indigo-650 text-indigo-750 hover:text-white font-bold uppercase rounded-xl border border-indigo-100 shadow-sm transition-all duration-250 flex items-center justify-center gap-1 cursor-pointer"
                          >
                            <UserCog className="w-3.5 h-3.5" />
                            Edit Info
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteTeacher(teacher.id)}
                            className="flex-1 sm:flex-initial px-3.5 py-2 text-[10px] bg-rose-50 hover:bg-rose-600 text-rose-705 hover:text-white font-bold uppercase rounded-xl border border-rose-100 shadow-sm transition-all duration-250 flex items-center justify-center gap-1 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            Dismiss
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>
          </div>
        )}

        {/* --- TEACHER GEOLOCATION ATTENDANCE WORKSPACE --- */}
        {activeTab === 'teacherAttendance' && (() => {
          const todayLogs = (database.teacherAttendance || []).filter(a => a.date === todayDateStr);
          const presentTodayCount = todayLogs.filter(a => a.status === 'Present').length;
          const lateTodayCount = todayLogs.filter(a => a.status === 'Late').length;
          const absentTodayCount = Math.max(0, database.teachers.length - todayLogs.length);

          // Build today distribution data
          const distributionData = [
            { name: 'On-Time (Present)', value: presentTodayCount, color: '#10b981' },
            { name: 'Late', value: lateTodayCount, color: '#f59e0b' },
            { name: 'Absent / Unlogged', value: absentTodayCount, color: '#f87171' }
          ];

          // Build weekly history logs
          const last7DaysTrend = Array.from({ length: 7 }).map((_, idx) => {
            const d = new Date();
            d.setDate(d.getDate() - idx);
            const dateStr = d.toISOString().split('T')[0];
            const dayName = d.toLocaleDateString(undefined, { weekday: 'short' });
            const logsForDay = (database.teacherAttendance || []).filter(a => a.date === dateStr);
            const onTime = logsForDay.filter(a => a.status === 'Present').length;
            const lates = logsForDay.filter(a => a.status === 'Late').length;
            return {
              day: dayName,
              'On-Time': onTime,
              'Late': lates
            };
          }).reverse();

          // Get latest 5 entries from all-time logs
          const sortedAllTimeLogs = [...(database.teacherAttendance || [])]
            .sort((a, b) => b.date.localeCompare(a.date) || b.time.localeCompare(a.time))
            .slice(0, 5);

          return (
            <div className="space-y-6 animate-fade-in" id="portal-teacher-attendance">
              
              {/* Header Title section */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-100/80 shadow-xs" id="teacher-attendance-header-section">
                <div>
                  <h2 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                    <UserCheck className="w-5.5 h-5.5 text-indigo-600" />
                    Teacher Geolocation Attendance Desk
                  </h2>
                  <p className="text-slate-400 text-xs font-semibold mt-1">
                    Manage virtual school campus geofences, track real-time staff arrival coordinates, and download printable logs.
                  </p>
                </div>
                
                {/* Elegant Subtabs header inside container */}
                <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-120/40 gap-1.5 self-start md:self-center" id="attendance-internal-subtabs">
                  <button
                    type="button"
                    onClick={() => setAttendanceSubTab('dashboard')}
                    className={`px-4 py-2 text-[10.5px] font-black uppercase tracking-wider rounded-xl transition-all duration-200 cursor-pointer flex items-center gap-1.5 ${
                      attendanceSubTab === 'dashboard'
                        ? 'bg-white text-slate-800 shadow-xs'
                        : 'text-slate-450 hover:text-slate-700'
                    }`}
                  >
                    <Activity className="w-3.5 h-3.5 text-indigo-500" />
                    Dashboard
                  </button>
                  <button
                    type="button"
                    onClick={() => setAttendanceSubTab('checklist')}
                    className={`px-4 py-2 text-[10.5px] font-black uppercase tracking-wider rounded-xl transition-all duration-200 cursor-pointer flex items-center gap-1.5 ${
                      attendanceSubTab === 'checklist'
                        ? 'bg-white text-slate-800 shadow-xs'
                        : 'text-slate-450 hover:text-slate-700'
                    }`}
                  >
                    <MapPin className="w-3.5 h-3.5 text-emerald-500" />
                    Roster & Settings
                  </button>
                  <button
                    type="button"
                    onClick={() => setAttendanceSubTab('reports')}
                    className={`px-4 py-2 text-[10.5px] font-black uppercase tracking-wider rounded-xl transition-all duration-205 cursor-pointer flex items-center gap-1.5 ${
                      attendanceSubTab === 'reports'
                        ? 'bg-white text-slate-800 shadow-xs'
                        : 'text-slate-450 hover:text-slate-705'
                    }`}
                  >
                    <Download className="w-3.5 h-3.5 text-blue-500" />
                    Range Reports
                  </button>
                </div>
              </div>

              {/* Top Stat Ribbon - Globally visible on Teacher Attendance */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5" id="attendance-setup-grid-sub">
                
                {/* Box 1: Verified arrivals today */}
                <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-xs flex items-center gap-4" id="admin-t-att-stat-arrived">
                  <div className="p-3.5 bg-emerald-50 text-emerald-600 rounded-xl shrink-0">
                    <UserCheck className="w-5.5 h-5.5" />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Completed arrivals today</span>
                    <h4 className="text-xl font-black text-slate-800 mt-0.5">
                      {presentTodayCount + lateTodayCount} / {database.teachers.length}
                    </h4>
                    <p className="text-[9px] text-emerald-600 font-extrabold mt-0.5 uppercase tracking-wide">verified on-site status</p>
                  </div>
                </div>

                {/* Box 2: Late arrivals */}
                <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-xs flex items-center gap-4" id="admin-t-att-stat-total">
                  <div className="p-3.5 bg-amber-50 text-amber-600 rounded-xl shrink-0">
                    <Clock className="w-5.5 h-5.5" />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Late Arrival Incidents</span>
                    <h4 className="text-xl font-black text-slate-800 mt-0.5">
                      {lateTodayCount}
                    </h4>
                    <p className="text-[9px] text-slate-400 font-bold mt-0.5 uppercase tracking-wide font-sans">Logged post 07:30 AM</p>
                  </div>
                </div>

                {/* Box 3: Total logs tracked */}
                <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-xs flex items-center gap-4" id="admin-t-att-stat-unregistered">
                  <div className="p-3.5 bg-[#eff5ff] text-[#1e5ee6] rounded-xl shrink-0">
                    <Activity className="w-5.5 h-5.5" />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Historical Entries Logs</span>
                    <h4 className="text-xl font-black text-slate-800 mt-0.5">
                      {(database.teacherAttendance || []).length} Records
                    </h4>
                    <p className="text-[9px] text-[#1e5ee6] font-bold mt-0.5 uppercase tracking-wide font-sans">Saved in database</p>
                  </div>
                </div>
              </div>

              {/* SUB TAB 1: OVERVIEW DASHBOARD */}
              {attendanceSubTab === 'dashboard' && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fade-in" id="attendance-dashboard-subview">
                  
                  {/* Left Insights block (8 cols) */}
                  <div className="lg:col-span-8 space-y-6">
                    
                    {/* Charts grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      
                      {/* Today's breakdown pie chart */}
                      <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-xs flex flex-col justify-between h-[300px]" id="today-pie-breakdown-card">
                        <div>
                          <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                            Today's Arrival Share
                          </h3>
                          <p className="text-[10px] text-slate-405 block mt-0.5">Proportion breakdown of registered attendance today</p>
                        </div>
                        
                        <div className="h-44 w-full flex items-center justify-center relative">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={distributionData}
                                cx="50%"
                                cy="50%"
                                innerRadius={45}
                                outerRadius={60}
                                paddingAngle={3}
                                dataKey="value"
                              >
                                {distributionData.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                              </Pie>
                            </PieChart>
                          </ResponsiveContainer>
                          
                          {/* Inner Label */}
                          <div className="absolute text-center">
                            <p className="text-[18px] font-black text-slate-800 tracking-tight leading-none">
                              {Math.round(((presentTodayCount + lateTodayCount) / (database.teachers.length || 1)) * 100)}%
                            </p>
                            <p className="text-[8px] uppercase font-bold text-slate-400 tracking-wide mt-0.5">Present today</p>
                          </div>
                        </div>

                        {/* Custom Legend */}
                        <div className="flex justify-around text-[10px] font-bold text-slate-605 border-t border-slate-50 pt-2 shrink-0">
                          {distributionData.map((item, idx) => (
                            <span key={item.name} className="flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: item.color }} />
                              {item.name}: <span className="text-slate-800">{item.value}</span>
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Weekly trend bar chart */}
                      <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-xs flex flex-col justify-between h-[300px]" id="weekly-bar-history-card">
                        <div>
                          <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-1.5">
                            <Activity className="w-3.5 h-3.5 text-[#1e5ee6]" />
                            Weekly Attendance Trends
                          </h3>
                          <p className="text-[10px] text-slate-405 block mt-0.5">Presents vs Lates over the last 7 calendar days</p>
                        </div>

                        <div className="h-44 w-full mt-2">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={last7DaysTrend} margin={{ top: 5, right: 10, left: -25, bottom: 5 }}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                              <XAxis dataKey="day" stroke="#94a3b8" fontSize={9} tickLine={false} axisLine={false} />
                              <YAxis stroke="#94a3b8" fontSize={9} tickLine={false} axisLine={false} allowDecimals={false} />
                              <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ fontSize: '10px', borderRadius: '8px', border: '1px solid #e2e8f0' }} />
                              <Bar dataKey="On-Time" fill="#10b981" radius={[4, 4, 0, 0]} />
                              <Bar dataKey="Late" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>

                        <div className="flex justify-center gap-4 text-[10px] font-bold text-slate-500 border-t border-slate-50 pt-2 shrink-0">
                          <span className="flex items-center gap-1"><span className="w-2.5 h-1 rounded-sm bg-emerald-500" /> On-Time Early</span>
                          <span className="flex items-center gap-1"><span className="w-2.5 h-1 rounded-sm bg-amber-500" /> Late Arrival</span>
                        </div>
                      </div>
                    </div>

                    {/* Quick Overview Card */}
                    <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-xs" id="teacher-overview-quick-stats-grid">
                      <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest mb-4">Verification Activity Insights</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="p-4 bg-slate-50/75 border border-slate-100/60 rounded-2xl">
                          <span className="text-[10px] text-slate-404 font-extrabold uppercase tracking-wide">Total Registered Staff</span>
                          <p className="text-sm font-black text-slate-800 mt-1">{database.teachers.length} Active Teachers</p>
                        </div>
                        <div className="p-4 bg-slate-50/75 border border-slate-100/60 rounded-2xl">
                          <span className="text-[10px] text-slate-404 font-extrabold uppercase tracking-wide">Geofence Accuracy Status</span>
                          <p className="text-sm font-black text-emerald-600 mt-1 flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            GPS Core Active
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right feed and geofence block (4 cols) */}
                  <div className="lg:col-span-4 space-y-6">
                    
                    {/* Geofence target widget */}
                    <div className="bg-linear-to-b from-slate-900 to-slate-950 p-6 rounded-3xl border border-slate-800 text-white shadow-xl flex flex-col justify-between min-h-[180px]" id="geofence-parameters-dashboard-card">
                      <div>
                        <span className="bg-indigo-500/25 border border-indigo-500/30 text-indigo-300 text-[9px] font-extrabold px-2.5 py-1 rounded-lg uppercase tracking-widest inline-block">
                          Active Anchor
                        </span>
                        <h4 className="text-base font-black text-white mt-3 truncate">{campusName}</h4>
                        <p className="text-[11px] text-slate-400 font-mono tracking-wider mt-1">{campusLat.toFixed(5)}, {campusLon.toFixed(5)}</p>
                        <p className="text-indigo-400 text-xs font-bold mt-2 font-mono">Permitted radius check: {campusRadius} meters</p>
                      </div>

                      <button
                        type="button"
                        onClick={() => setAttendanceSubTab('checklist')}
                        className="w-full mt-6 py-2 px-4 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black uppercase tracking-wider rounded-xl cursor-pointer shadow-md shadow-indigo-600/10 transition-all text-center select-none"
                      >
                        Adjust Coordinates & Radius
                      </button>
                    </div>

                    {/* Live arrival feed tracker */}
                    <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-xs flex flex-col justify-between min-h-[300px]" id="live-arrival-feed-dashboard-card">
                      <div>
                        <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#1e5ee6] animate-pulse" />
                          Recent Arrival Logs
                        </h3>
                        <p className="text-[10px] text-slate-450 block mt-0.5">Last 5 physically verified check-ins at school</p>
                      </div>

                      <div className="divide-y divide-slate-100 mt-4 flex-1">
                        {sortedAllTimeLogs.length === 0 ? (
                          <div className="py-12 text-center flex flex-col justify-center items-center h-full">
                            <Clock className="w-8 h-8 text-slate-200 mb-2 animate-spin" />
                            <p className="text-[10px] text-slate-400 font-bold font-sans">No attendance records generated yet</p>
                          </div>
                        ) : (
                          sortedAllTimeLogs.map(log => {
                            const name = database.teachers.find(t => t.id === log.teacherId)?.name || 'Teacher';
                            return (
                              <div key={log.id} className="py-2.5 flex justify-between items-center text-xs">
                                <div>
                                  <span className="font-extrabold text-slate-800 block text-xs">{name}</span>
                                  <span className="text-[9px] text-slate-400 font-mono tracking-wider">{log.date} @ {log.time}</span>
                                </div>
                                <div className="text-right shrink-0">
                                  <span className={`px-2 py-0.5 rounded text-[8.5px] font-bold inline-block leading-none ${
                                    log.status === 'Present' ? 'bg-emerald-50 text-emerald-700 font-bold' : 'bg-amber-50 text-amber-700 font-bold'
                                  }`}>
                                    {log.status === 'Present' ? 'On-Time' : 'Late'}
                                  </span>
                                  <span className="block text-[8.5px] text-slate-400 tracking-wider font-mono mt-1 pr-1">Dist: {Math.round(log.distanceFromSchool)}m</span>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* SUB TAB 2: ROSTER & GEOFENCE SETTINGS */}
              {attendanceSubTab === 'checklist' && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-fade-in" id="attendance-controls-parent">
                  
                  {/* Left Column: Today's live check-in monitor */}
                  <div className="lg:col-span-8 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col min-h-[480px]" id="today-teacher-attendance-tracking">
                    <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 pb-4 border-b border-slate-100 mb-5">
                      <div>
                        <h3 className="text-sm font-black text-slate-800 tracking-tight flex items-center gap-2">
                          <Clock className="w-4 h-4 text-[#1e5ee6]" />
                          Today's Verified Arrival Roster
                        </h3>
                        <p className="text-slate-400 text-xs font-semibold mt-0.5">Logs showing physical arrival metrics for {todayDateStr}.</p>
                      </div>
                      <span className="self-start sm:self-center bg-indigo-50 text-indigo-700 text-[10px] font-extrabold px-2.5 py-1 rounded-xl border border-indigo-100 uppercase tracking-wider">
                        live tracking desk
                      </span>
                    </div>

                    {database.teachers.length === 0 ? (
                      <div className="flex-1 flex flex-col justify-center items-center text-center py-12">
                        <GraduationCap className="w-12 h-12 text-slate-200 mb-2 animate-bounce" />
                        <p className="text-xs font-bold text-slate-450">No teachers found in registry</p>
                        <p className="text-[10px] text-slate-400 mt-1">Please insert teacher credentials first.</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto" id="today-checks-table-container">
                        <table className="w-full text-left border-collapse text-xs hidden md:table" id="today-attendance-teachers-table">
                          <thead>
                            <tr className="bg-slate-50 text-slate-400 font-black border-b border-slate-100 uppercase tracking-wider text-[9px]">
                              <th className="py-3 px-4">Teacher Name</th>
                              <th className="py-3 px-4">Class Target</th>
                              <th className="py-3 px-4">Log Arrival</th>
                              <th className="py-3 px-4">Geofence accuracy</th>
                              <th className="py-3 px-4">Co-ordinates</th>
                              <th className="py-3 px-4 text-center">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                            {database.teachers.map(teacher => {
                              const todayLog = (database.teacherAttendance || []).find(
                                a => a.teacherId === teacher.id && a.date === todayDateStr
                              );
                              return (
                                <tr key={teacher.id} className="hover:bg-slate-50/20" id={`today-row-${teacher.id}`}>
                                  <td className="py-3.5 px-4 animate-fade-in">
                                    <div className="flex items-center gap-2.5">
                                      <span className="w-7 h-7 bg-indigo-50 text-indigo-600 font-bold rounded-lg text-[10px] flex items-center justify-center shrink-0 border border-indigo-100">
                                        {teacher.name.charAt(0).toUpperCase()}
                                      </span>
                                      <div>
                                        <span className="font-extrabold text-slate-800 block text-xs">{teacher.name}</span>
                                        <span className="text-[10px] text-slate-400 font-mono tracking-wider">ID: {teacher.id}</span>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="py-3.5 px-4 font-bold text-slate-500">{teacher.classAssigned || 'N/A'}</td>
                                  <td className="py-3.5 px-4">
                                    {todayLog ? (
                                      <span className="font-mono text-slate-800 bg-slate-50 border border-slate-120 px-2.5 py-1 rounded-lg">
                                        {todayLog.time}
                                      </span>
                                    ) : (
                                      <span className="text-slate-450 font-bold italic tracking-wide">Not logged yet</span>
                                    )}
                                  </td>
                                  <td className="py-3.5 px-4">
                                    {todayLog ? (
                                      <span className="text-slate-700 font-mono font-bold">
                                        {Math.round(todayLog.distanceFromSchool)} meters from centroid
                                      </span>
                                    ) : (
                                      <span className="text-slate-400 font-semibold">-</span>
                                    )}
                                  </td>
                                  <td className="py-3.5 px-4">
                                    {todayLog ? (
                                      <span className="text-slate-400 font-mono text-[10px] bg-slate-50 px-1.5 py-0.5 rounded">
                                        {todayLog.latitude.toFixed(5)}, {todayLog.longitude.toFixed(5)}
                                      </span>
                                    ) : (
                                      <span className="text-slate-400 font-semibold">-</span>
                                    )}
                                  </td>
                                  <td className="py-3.5 px-4 text-center">
                                    {todayLog ? (
                                      <span className={`px-2.5 py-1 rounded-xl text-[9px] font-extrabold tracking-wider uppercase border ${
                                        todayLog.status === 'Present'
                                          ? 'bg-emerald-50 text-emerald-700 border-emerald-100 font-bold'
                                          : 'bg-amber-50 text-amber-700 border-amber-100/80 font-bold'
                                      }`}>
                                        {todayLog.status === 'Present' ? 'On-time' : 'Late Arrival'}
                                      </span>
                                    ) : (
                                      <span className="px-2.5 py-1 rounded-xl text-[9px] font-extrabold bg-rose-50 border border-rose-100 text-rose-600 tracking-wider uppercase font-bold">
                                        Absent
                                      </span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>

                        {/* Mobile view Cards to preserve space and avoid scrolling */}
                        <div className="md:hidden divide-y divide-slate-100" id="today-checks-mobile-list">
                          {database.teachers.map(teacher => {
                            const todayLog = (database.teacherAttendance || []).find(
                              a => a.teacherId === teacher.id && a.date === todayDateStr
                            );
                            return (
                              <div key={teacher.id} className="p-4 space-y-3" id={`today-mobile-card-${teacher.id}`}>
                                <div className="flex justify-between items-start gap-2">
                                  <div className="flex items-center gap-2.5">
                                    <span className="w-8 h-8 bg-indigo-50 text-indigo-600 font-extrabold rounded-lg text-xs flex items-center justify-center shrink-0 border border-indigo-100">
                                      {teacher.name.charAt(0).toUpperCase()}
                                    </span>
                                    <div>
                                      <span className="font-extrabold text-slate-855 block text-xs">{teacher.name}</span>
                                      <span className="text-[10px] text-slate-400 font-semibold">{teacher.classAssigned || 'N/A'} (ID: {teacher.id})</span>
                                    </div>
                                  </div>

                                  {todayLog ? (
                                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-black tracking-wider uppercase border ${
                                      todayLog.status === 'Present'
                                        ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                                        : 'bg-amber-50 text-amber-700 border-amber-100/80'
                                    }`}>
                                      {todayLog.status === 'Present' ? 'On-time' : 'Late'}
                                    </span>
                                  ) : (
                                    <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-rose-50 border border-rose-100 text-rose-605 tracking-wider uppercase">
                                      Absent
                                    </span>
                                  )}
                                </div>

                                {todayLog ? (
                                  <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                                    <div>
                                      <span className="text-[9px] text-slate-400 font-extrabold uppercase tracking-wide block">Logged Arrival</span>
                                      <span className="font-bold text-slate-800 font-mono text-xs">{todayLog.time}</span>
                                    </div>
                                    <div>
                                      <span className="text-[9px] text-slate-400 font-extrabold uppercase tracking-wide block">Gps Accuracy</span>
                                      <span className="font-bold text-slate-800 font-mono text-xs">
                                        {Math.round(todayLog.distanceFromSchool)}m dev
                                      </span>
                                    </div>
                                  </div>
                                ) : (
                                  <p className="text-[10px] text-slate-400 italic">No entry registered at terminal desk today.</p>
                                )}

                                {todayLog && (
                                  <div className="text-[10px] text-slate-450 font-mono pt-1.5 border-t border-slate-100 flex items-center gap-1.5">
                                    <span>📍 Coordinates:</span>
                                    <span className="font-bold">{todayLog.latitude.toFixed(5)}, {todayLog.longitude.toFixed(5)}</span>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Right Column: School Geofencing coordinate parameters */}
                  <div className="lg:col-span-4 space-y-6" id="geofencing-configurations-widget">
                    
                    {/* Coordinates Setup Form */}
                    <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm" id="geofence-form-card">
                      <div className="border-b border-slate-100 pb-3 mb-5">
                        <h3 className="text-sm font-black text-slate-800 tracking-tight flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-[#1e5ee6]" />
                          School Location Settings
                        </h3>
                        <p className="text-slate-400 text-[10px] font-bold whitespace-normal leading-relaxed mt-1">Configure target coordinate anchors forcing physical on-site arrivals check.</p>
                      </div>

                      {locationSuccessMsg && (
                        <div className="p-3.5 bg-emerald-50 border border-emerald-100 text-emerald-800 text-[11px] rounded-xl font-bold font-sans mb-4">
                          {locationSuccessMsg}
                        </div>
                      )}
                      
                      {locationErrorMsg && (
                        <div className="p-3.5 bg-rose-50 border border-rose-100 text-rose-800 text-[11px] rounded-xl font-bold font-sans mb-4">
                          {locationErrorMsg}
                        </div>
                      )}

                      <form onSubmit={(e) => { e.preventDefault(); handleSaveGeofencingSettings(); }} className="space-y-4 text-xs font-semibold">
                        <div>
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Campus Name Anchor</label>
                          <input
                            type="text"
                            value={campusName}
                            onChange={(e) => { setCampusName(e.target.value); setLocationSuccessMsg(''); }}
                            className="w-full text-xs font-bold font-sans text-slate-700 p-2.5 border border-slate-150 rounded-xl bg-slate-50 focus:bg-white focus:outline-indigo-600"
                            placeholder="Enter campus boundary name..."
                          />
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Latitude Centroid</label>
                            <input
                              type="number"
                              step="any"
                              value={campusLat}
                              onChange={(e) => { setCampusLat(Number(e.target.value)); setLocationSuccessMsg(''); }}
                              className="w-full text-xs font-bold font-mono text-slate-700 p-2.5 border border-slate-150 rounded-xl bg-slate-50 focus:bg-white focus:outline-indigo-600"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Longitude Centroid</label>
                            <input
                              type="number"
                              step="any"
                              value={campusLon}
                              onChange={(e) => { setCampusLon(Number(e.target.value)); setLocationSuccessMsg(''); }}
                              className="w-full text-xs font-bold font-mono text-slate-700 p-2.5 border border-slate-150 rounded-xl bg-slate-50 focus:bg-white focus:outline-indigo-600"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Geofence Radius Limit (meters)</label>
                          <input
                            type="number"
                            value={campusRadius}
                            onChange={(e) => { setCampusRadius(Number(e.target.value)); setLocationSuccessMsg(''); }}
                            className="w-full text-xs font-bold font-mono text-slate-700 p-2.5 border border-slate-150 rounded-xl bg-slate-50 focus:bg-white focus:outline-indigo-600"
                          />
                        </div>

                        <div className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-150 rounded-xl">
                          <div className="flex flex-col pr-2">
                            <span className="text-[11px] font-extrabold text-slate-850">Enable Teacher GPS Simulator</span>
                            <span className="text-[9px] text-slate-400 font-bold leading-normal">Allows testing arrivals in iframe/browser preview. If off, teachers must stand on-premises.</span>
                          </div>
                          <input
                            type="checkbox"
                            checked={campusAllowSimulation}
                            onChange={(e) => {
                              setCampusAllowSimulation(e.target.checked);
                              setLocationSuccessMsg('');
                            }}
                            className="w-4.5 h-4.5 rounded text-indigo-600 cursor-pointer focus:ring-0 accent-indigo-600"
                          />
                        </div>

                        <div className="pt-2 flex flex-col gap-2">
                          <button
                            type="button"
                            onClick={handleCaptureAdminLocation}
                            disabled={isCapturingLocation}
                            className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold transition-all duration-200 uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer border ${
                              isCapturingLocation 
                                ? 'bg-indigo-50 text-indigo-400 border-indigo-120' 
                                : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border-indigo-100'
                            }`}
                          >
                            <MapPin className="w-3.5 h-3.5" />
                            {isCapturingLocation ? "Locating..." : "Detect My Phone Location GPS"}
                          </button>

                          <button
                            type="submit"
                            className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-all uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                          >
                            <Save className="w-3.5 h-3.5" />
                            Save Anchor Settings
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                </div>
              )}

              {/* SUB TAB 3: HISTORIC RANGE REFORTS DESK */}
              {attendanceSubTab === 'reports' && (
                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-6 animate-fade-in" id="teacher-historic-reports-view">
                  
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end border-b border-slate-100 pb-6" id="analytics-filter-options-box">
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Select Target Teacher</label>
                      <select
                        value={selectedReportTeacherId}
                        onChange={(e) => setSelectedReportTeacherId(e.target.value)}
                        className="w-full text-xs py-2 px-3 bg-slate-50 border border-slate-150 rounded-xl font-bold text-slate-700 cursor-pointer"
                      >
                        <option value="">-- select a teacher --</option>
                        {database.teachers.map(t => (
                          <option key={t.id} value={t.id}>{t.name} (ID: {t.id})</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Start Date</label>
                      <input
                        type="date"
                        value={teacherReportStartDate}
                        onChange={(e) => setTeacherReportStartDate(e.target.value)}
                        className="w-full text-xs py-2 px-3 bg-slate-50 border border-slate-150 rounded-xl font-bold text-slate-700 font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">End Date</label>
                      <input
                        type="date"
                        value={teacherReportEndDate}
                        onChange={(e) => setTeacherReportEndDate(e.target.value)}
                        className="w-full text-xs py-2 px-3 bg-slate-50 border border-slate-150 rounded-xl font-bold text-slate-700 font-mono"
                      />
                    </div>

                    <div className="flex gap-2 mb-0.5" id="report-download-triggers">
                      <button
                        type="button"
                        onClick={() => handleDownloadTeacherReport(selectedReportTeacherId)}
                        disabled={!selectedReportTeacherId}
                        className="flex-1 py-1.5 px-2 bg-indigo-50 hover:bg-indigo-100 disabled:opacity-40 rounded-xl text-indigo-700 text-[10px] font-black uppercase tracking-wide flex items-center justify-center gap-1 border border-indigo-100 cursor-pointer select-none transition-all duration-200"
                      >
                        <Download className="w-3 h-3 text-[#1e5ee6]" />
                        Download PDF
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (!selectedReportTeacherId) return;
                          handlePrintElement('printable-teacher-attendance-report');
                        }}
                        disabled={!selectedReportTeacherId}
                        className="flex-1 py-1.5 px-2 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 rounded-xl text-slate-700 text-[10px] font-black uppercase tracking-wide flex items-center justify-center gap-1 border border-slate-155 cursor-pointer select-none transition-all duration-200"
                      >
                        <Printer className="w-3 h-3" />
                        Print Report
                      </button>
                    </div>
                  </div>

                  {/* Display Result Grid */}
                  {!selectedReportTeacherId ? (
                    <div className="text-center py-16 bg-slate-50/25 rounded-2xl border border-dashed border-slate-200" id="analytic-panel-init">
                      <CalendarRange className="w-10 h-10 text-slate-350 mx-auto mb-2 animate-pulse" />
                      <p className="text-xs font-bold text-slate-450 leading-relaxed font-sans">No Teacher Selected</p>
                      <p className="text-[10px] text-slate-400 mt-0.5 font-sans">Please choose a teacher from the dropdown list above to compile their historic report.</p>
                    </div>
                  ) : (
                    <div className="space-y-6" id="teacher-report-compiled-panel animate-fade-in">
                      {/* Stats Ribbon */}
                      {(() => {
                        const matchedLogs = (database.teacherAttendance || [])
                          .filter(a => a.teacherId === selectedReportTeacherId && a.date >= teacherReportStartDate && a.date <= teacherReportEndDate)
                          .sort((a,b) => b.date.localeCompare(a.date) || b.time.localeCompare(a.time));
                        const totalLogsInRange = matchedLogs.length;
                        const onTimeCount = matchedLogs.filter(l => l.status === 'Present').length;
                        const lateCount = matchedLogs.filter(l => l.status === 'Late').length;

                        return (
                          <>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4" id="stats-ribbon-report-active">
                              <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl text-center">
                                <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider font-sans">Total days record logs</span>
                                <span className="block text-xl font-extrabold text-slate-800 mt-1">{totalLogsInRange} sessions</span>
                              </div>
                              <div className="p-4 bg-emerald-50/50 border border-emerald-100/60 rounded-2xl text-center">
                                <span className="text-[9px] uppercase font-bold text-emerald-600 tracking-wider font-sans">On-Time Count (Present)</span>
                                <span className="block text-xl font-extrabold text-[#111827] mt-1">{onTimeCount} Days</span>
                              </div>
                              <div className="p-4 bg-amber-50/50 border border-amber-100/60 rounded-2xl text-center">
                                <span className="text-[9px] uppercase font-bold text-amber-600 tracking-wider font-sans">Late Arrivals</span>
                                <span className="block text-xl font-extrabold text-[#111827] mt-1">{lateCount} Days</span>
                              </div>
                            </div>

                            {/* List Table */}
                            <div className="border border-slate-100 rounded-2xl overflow-hidden" id="report-table-box">
                              {totalLogsInRange === 0 ? (
                                <div className="text-center py-10" id="report-empty-stat">
                                  <p className="text-xs font-bold text-slate-400 font-sans">No arrival records found in selected dates range.</p>
                                </div>
                              ) : (
                                <>
                                  <table className="w-full text-left border-collapse text-xs hidden md:table" id="range-report-teachers-table-detail">
                                    <thead>
                                      <tr className="bg-slate-50 text-slate-400 font-extrabold border-b border-slate-100 uppercase tracking-wider text-[9px]">
                                        <th className="py-3 px-5">Shift Date</th>
                                        <th className="py-3 px-5">Arrival time</th>
                                        <th className="py-3 px-5">Deviation proximity</th>
                                        <th className="py-3 px-5">Matched Co-ordinates</th>
                                        <th className="py-3 px-5 text-center">Status</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                                      {matchedLogs.map(log => (
                                        <tr key={log.id} className="hover:bg-slate-50/20" id={`compiled-row-${log.id}`}>
                                          <td className="py-3 px-5 font-bold text-slate-900">{log.date}</td>
                                          <td className="py-3 px-5 font-mono text-slate-600">{log.time}</td>
                                          <td className="py-3 px-5 font-mono text-slate-500">{Math.round(log.distanceFromSchool)} meters</td>
                                          <td className="py-3 px-5 font-mono text-[10px] text-slate-400">{log.latitude.toFixed(5)}, {log.longitude.toFixed(5)}</td>
                                          <td className="py-3 px-5 text-center flex justify-center">
                                            <span className={`px-2.5 py-0.5 rounded-lg text-[9px] font-bold border ${
                                              log.status === 'Present'
                                                ? 'bg-emerald-50 text-emerald-700 border-emerald-100 font-bold'
                                                : 'bg-amber-50 text-amber-707 border-amber-100 font-bold'
                                            }`}>
                                              {log.status === 'Present' ? 'On-Time' : 'Late'}
                                            </span>
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>

                                  {/* Mobile Cards View for Historic Reports */}
                                  <div className="md:hidden divide-y divide-slate-100" id="range-report-teachers-mobile-list">
                                    {matchedLogs.map(log => (
                                      <div key={log.id} className="p-4 space-y-3" id={`report-mobile-card-${log.id}`}>
                                        <div className="flex justify-between items-center">
                                          <span className="font-extrabold text-slate-900 text-xs">📅 {log.date}</span>
                                          <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black border uppercase tracking-wider ${
                                            log.status === 'Present'
                                              ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                                              : 'bg-amber-50 text-amber-700 border-amber-100'
                                          }`}>
                                            {log.status === 'Present' ? 'On-time' : 'Late'}
                                          </span>
                                        </div>
                                        
                                        <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                                          <div>
                                            <span className="text-[9px] text-slate-400 font-black uppercase tracking-wide block">Arrival Time</span>
                                            <span className="font-bold text-slate-800 font-mono text-xs">{log.time}</span>
                                          </div>
                                          <div>
                                            <span className="text-[9px] text-slate-400 font-black uppercase tracking-wide block">Proximity</span>
                                            <span className="font-bold text-slate-800 font-mono text-xs">
                                              {Math.round(log.distanceFromSchool)} meters
                                            </span>
                                          </div>
                                        </div>

                                        <div className="text-[10px] text-slate-450 font-mono flex items-center gap-1.5 pt-0.5">
                                          <span>📍 Coordinates:</span>
                                          <span className="font-bold text-slate-600">{log.latitude.toFixed(5)}, {log.longitude.toFixed(5)}</span>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </>
                              )}
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  )}
                </div>
              )}

              {/* HIDDEN PRINT PREVIEW SHEET CANVAS FOR TEACHER ATTENDANCE */}
              {selectedReportTeacherId && (
                <div className="hidden">
                  <div id="printable-teacher-attendance-report" className="p-8 bg-white text-slate-850 font-sans" style={{ fontFamily: "sans-serif" }}>
                    <div className="text-center border-b-2 border-dashed border-indigo-600 pb-5 mb-5">
                      <h1 className="text-2xl font-black tracking-tight text-slate-900 font-sans">BANUU JALAAL SCHOOL CAMPUS</h1>
                      <h2 className="text-xs uppercase tracking-wider text-[#1e5ee6] font-bold mt-1 font-sans">Teacher Geolocation Verified Attendance History Document</h2>
                      <p className="text-[10px] text-slate-450 mt-1 font-mono">Generated: {new Date().toLocaleString()}</p>
                    </div>

                    <div className="bg-slate-50 p-4 rounded-xl mb-6 grid grid-cols-2 gap-4 text-xs border border-slate-100">
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase font-sans">Teacher Information</p>
                        <h4 className="font-extrabold text-slate-800 text-sm mt-0.5">
                          {database.teachers.find(t => t.id === selectedReportTeacherId)?.name || 'Unknown Teacher'}
                        </h4>
                        <p className="text-slate-550 font-mono text-[10px] mt-0.5">ID: {selectedReportTeacherId}</p>
                        <p className="text-slate-550 font-sans mt-0.5">Class Target: {database.teachers.find(t => t.id === selectedReportTeacherId)?.classAssigned || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase font-sans">Report Scope Timeframe</p>
                        <h4 className="font-bold text-slate-705 mt-0.5">{teacherReportStartDate} ➔ {teacherReportEndDate}</h4>
                        <p className="text-slate-450 text-[10px] mt-1">Location anchor verification radius: {database.schoolLocation?.radiusMeters || 200} meters</p>
                      </div>
                    </div>

                    {/* Stats */}
                    {(() => {
                      const matchedLogs = (database.teacherAttendance || [])
                        .filter(a => a.teacherId === selectedReportTeacherId && a.date >= teacherReportStartDate && a.date <= teacherReportEndDate)
                        .sort((a,b) => b.date.localeCompare(a.date) || b.time.localeCompare(a.time));
                      const totalLogsInRange = matchedLogs.length;
                      const onTimeCount = matchedLogs.filter(l => l.status === 'Present').length;
                      const lateCount = matchedLogs.filter(l => l.status === 'Late').length;

                      return (
                        <>
                          <div className="grid grid-cols-3 gap-4 mb-6 text-center">
                            <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                              <span className="text-[9px] uppercase font-bold text-slate-400 block font-sans">Total Days Recorded</span>
                              <span className="text-lg font-black text-slate-800 font-sans">{totalLogsInRange}</span>
                            </div>
                            <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-100/40">
                              <span className="text-[9px] uppercase font-bold text-emerald-600 block font-sans">On-Time (Present)</span>
                              <span className="text-lg font-black text-emerald-700 font-sans">{onTimeCount}</span>
                            </div>
                            <div className="p-3 bg-amber-50 rounded-lg border border-amber-100/40">
                              <span className="text-[9px] uppercase font-bold text-amber-500 block font-sans">Late Incident Count</span>
                              <span className="text-lg font-black text-amber-700 font-sans">{lateCount}</span>
                            </div>
                          </div>

                          <table className="w-full text-left border-collapse text-xs">
                            <thead>
                              <tr className="bg-slate-100 text-slate-650 font-bold border-b border-slate-200 uppercase text-[9px]">
                                <th className="py-2.5 px-3">Shift Date</th>
                                <th className="py-2.5 px-3">Arrival Time</th>
                                <th className="py-2.5 px-3">Verification Distance</th>
                                <th className="py-2.5 px-3">Anchor Map Co-ordinates</th>
                                <th className="py-2.5 px-3 text-center">Arrival Status</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-slate-700 font-semibold">
                              {matchedLogs.map(log => (
                                <tr key={log.id}>
                                  <td className="py-2 px-3 font-bold text-slate-900">{log.date}</td>
                                  <td className="py-2 px-3 font-mono">{log.time}</td>
                                  <td className="py-2 px-3 font-mono">{Math.round(log.distanceFromSchool)} meters</td>
                                  <td className="py-2 px-3 font-mono text-slate-400 text-[10px]">{log.latitude.toFixed(5)}, {log.longitude.toFixed(5)}</td>
                                  <td className="py-2 px-3 text-center">
                                    <span style={{ fontSize: '10px' }} className="px-2 py-0.5 rounded font-bold bg-slate-50 text-slate-800">
                                      {log.status === 'Present' ? 'On-Time' : 'Late'}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </>
                      );
                    })()}
                  </div>
                </div>
              )}

            </div>
          );
        })()}

        {/* --- CLASSES TAB (NEW SEPARATE CLASS REGISTRATION & EDITING) --- */}
        {activeTab === 'classes' && (
          <div className="space-y-8 animate-fade-in" id="portal-classes">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Left: Create / Rename Class Form */}
              <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm self-start">
                <div className="flex items-center gap-2.5 mb-5">
                  <span className="p-2 bg-indigo-50 text-indigo-600 rounded-xl inline-flex">
                    <BookOpen className="w-5 h-5" />
                  </span>
                  <h3 className="font-extrabold text-slate-900 text-lg">
                    {editingClass ? 'Rename Division' : 'Classroom Divisions'}
                  </h3>
                </div>

                <p className="text-slate-400 text-xs mb-5 leading-normal font-medium">
                  {editingClass 
                    ? `Update the name of the classroom division. All student profiles, teacher assignments, progress records, and billing statements will reflect this change seamlessly.`
                    : `Register custom classroom spaces and memorization groups. Created divisions will instantly propagate across registration screens and filters.`
                  }
                </p>

                {editingClass ? (
                  <form onSubmit={(e) => {
                    e.preventDefault();
                    if (editingClass) {
                      handleEditClass(editingClass, editClassNameInput);
                      setEditingClass(null);
                      setEditClassNameInput('');
                    }
                  }} className="space-y-4" id="edit-class-form">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 pl-0.5">Edit Class Name *</label>
                      <input
                        type="text"
                        required
                        value={editClassNameInput}
                        onChange={(e) => setEditClassNameInput(e.target.value)}
                        placeholder="e.g. Juz Amma Memorization"
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white rounded-xl text-xs font-semibold text-slate-800 outline-none"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="submit"
                        className="flex-1 py-2.5 px-4 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl cursor-pointer text-center"
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingClass(null);
                          setEditClassNameInput('');
                        }}
                        className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs uppercase tracking-wider rounded-xl cursor-pointer text-center"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : (
                  <form onSubmit={handleCreateNewClass} className="space-y-4" id="add-new-class-form-tab">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 pl-0.5">New Class Name *</label>
                      <input
                        type="text"
                        required
                        value={newClassNameInput}
                        onChange={(e) => setNewClassNameInput(e.target.value)}
                        placeholder="e.g. Juz Tabarak Memorization"
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white rounded-xl text-xs font-semibold text-slate-800 outline-none mb-3"
                      />
                      <button
                        type="submit"
                        className="w-full py-2.5 px-4 bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white font-bold text-xs uppercase tracking-wider rounded-xl cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <PlusCircle className="w-4 h-4" />
                        Create New Space
                      </button>
                    </div>
                  </form>
                )}
              </div>

              {/* Right: Classes Metrics Directory */}
              <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                <h3 className="font-extrabold text-slate-900 text-lg mb-1">Academic Divisions Catalogue</h3>
                <p className="text-slate-400 text-xs mb-6">List of active memorization spaces and registered participants</p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {classSelectionList.map((cls) => {
                    const teacherAssignedCount = database.teachers.filter(t => t.classAssigned === cls).length;
                    const studentEnrollCount = database.students.filter(s => s.className === cls && s.active).length;
                    
                    return (
                      <div key={cls} className="p-5 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-[10px] font-extrabold bg-teal-50 border border-teal-100 text-teal-700 px-2 py-0.5 rounded-md">CLASSROOM</span>
                            <span className="text-[10px] text-slate-400 font-semibold">{studentEnrollCount} active students</span>
                          </div>
                          <h4 className="font-bold text-slate-800 text-sm mt-1 mb-2 truncate" title={cls}>{cls}</h4>
                        </div>
                        
                        <div className="pt-3 mt-3 border-t border-slate-200/50 flex flex-col gap-3">
                          <div className="flex justify-between items-center text-[10px] text-slate-400 font-medium">
                            <span>Teachers: <span className="font-bold text-slate-600">{teacherAssignedCount} Staff</span></span>
                            <span className="text-[9px] bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded-md border border-indigo-100">Official Division</span>
                          </div>
                          
                          <div className="flex gap-2 justify-end mt-1">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingClass(cls);
                                setEditClassNameInput(cls);
                              }}
                              className="px-2.5 py-1.5 text-[10px] bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold uppercase rounded-lg border border-indigo-100 transition-colors inline-flex items-center gap-1 cursor-pointer"
                            >
                              <UserCog className="w-3.5 h-3.5" />
                              Rename Class
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteClass(cls)}
                              className="px-2.5 py-1.5 text-[10px] bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold uppercase rounded-lg border border-rose-100 transition-colors inline-flex items-center gap-1 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                              Dismiss Class
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* --- REPORTS & ATTENDANCE TAB --- */}
        {activeTab === 'reports' && (
          <div className="space-y-8 animate-fade-in" id="portal-reports">
            {/* Filter Control Board */}
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-5">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-5">
                <div>
                  <h3 className="font-extrabold text-slate-900 text-lg">
                    {reportViewMode === 'payments_range' ? 'Student Tuition & Financial Report Ledger' : 'Attendance & Reporting Center'}
                  </h3>
                  <p className="text-slate-400 text-xs mt-0.5">
                    {reportViewMode === 'payments_range'
                      ? 'Detailed payment statement logs, customized monthly invoice range reports, and historic receipts for parent verification.'
                      : 'Track general aggregates, verify teacher submissions, or query individual progress journals over custom dates.'}
                  </p>
                </div>
                
                {/* Mode Selector Option tabs */}
                <div className="flex bg-slate-100 p-1 rounded-xl self-start lg:self-center" id="report-mode-switch">
                  <button
                    type="button"
                    onClick={() => {
                      setReportViewMode('whole');
                    }}
                    className={`py-1.5 px-3.5 text-xs font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
                      reportViewMode === 'whole'
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    All Classes / Class View
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setReportViewMode('student');
                      if (database.students.length > 0 && !reportSelectedStudentId) {
                        setReportSelectedStudentId(database.students[0].id);
                      }
                    }}
                    className={`py-1.5 px-3.5 text-xs font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
                      reportViewMode === 'student'
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Single Student History
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setReportViewMode('payments_range');
                      if (database.students.length > 0 && !payReportStudentId) {
                        setPayReportStudentId(database.students[0].id);
                      }
                    }}
                    className={`py-1.5 px-3.5 text-xs font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
                      reportViewMode === 'payments_range'
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Student Payment Range
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setReportViewMode('registration_dates');
                    }}
                    className={`py-1.5 px-3.5 text-xs font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
                      reportViewMode === 'registration_dates'
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Registration Log / Diiwangelinta
                  </button>
                </div>
              </div>

              <div className="space-y-6">
                {/* 3-Column Spacious Input Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6" id="reports-filters-grid">
                  {reportViewMode !== 'payments_range' ? (
                    <>
                      {/* Start Date */}
                      <div>
                        <label className="block text-[10.5px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 pl-0.5">Start Date</label>
                        <input
                          type="date"
                          value={reportStartDate}
                          onChange={(e) => setReportStartDate(e.target.value)}
                          className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none w-full focus:bg-white focus:border-indigo-500 transition-all"
                        />
                      </div>

                      {/* End Date */}
                      <div>
                        <label className="block text-[10.5px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 pl-0.5">End Date</label>
                        <input
                          type="date"
                          value={reportEndDate}
                          onChange={(e) => setReportEndDate(e.target.value)}
                          className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none w-full focus:bg-white focus:border-indigo-500 transition-all"
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      {/* Start Month */}
                      <div>
                        <label className="block text-[10.5px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 pl-0.5">Start Year & Month</label>
                        <div className="grid grid-cols-2 gap-2">
                          <select
                            value={payReportStartMonth.split('-')[0] || '2026'}
                            onChange={(e) => {
                              const month = payReportStartMonth.split('-')[1] || '01';
                              setPayReportStartMonth(`${e.target.value}-${month}`);
                            }}
                            className="w-full px-2 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs text-slate-800 outline-none cursor-pointer focus:bg-white transition-colors"
                          >
                            {['2024', '2025', '2026', '2027', '2028', '2029', '2030', '2031', '2032'].map(yy => (
                              <option key={yy} value={yy}>{yy}</option>
                            ))}
                          </select>
                          <select
                            value={payReportStartMonth.split('-')[1] || '01'}
                            onChange={(e) => {
                              const year = payReportStartMonth.split('-')[0] || '2026';
                              setPayReportStartMonth(`${year}-${e.target.value}`);
                            }}
                            className="w-full px-2 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs text-slate-800 outline-none cursor-pointer focus:bg-white transition-colors"
                          >
                            {[
                              { val: '01', label: '01 - Jan' },
                              { val: '02', label: '02 - Feb' },
                              { val: '03', label: '03 - Mar' },
                              { val: '04', label: '04 - Apr' },
                              { val: '05', label: '05 - May' },
                              { val: '06', label: '06 - Jun' },
                              { val: '07', label: '07 - Jul' },
                              { val: '08', label: '08 - Aug' },
                              { val: '09', label: '09 - Sep' },
                              { val: '10', label: '10 - Oct' },
                              { val: '11', label: '11 - Nov' },
                              { val: '12', label: '12 - Dec' },
                            ].map(m => (
                              <option key={m.val} value={m.val}>{m.label}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* End Month */}
                      <div>
                        <label className="block text-[10.5px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 pl-0.5">End Year & Month</label>
                        <div className="grid grid-cols-2 gap-2">
                          <select
                            value={payReportEndMonth.split('-')[0] || '2026'}
                            onChange={(e) => {
                              const month = payReportEndMonth.split('-')[1] || '05';
                              setPayReportEndMonth(`${e.target.value}-${month}`);
                            }}
                            className="w-full px-2 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs text-slate-800 outline-none cursor-pointer focus:bg-white transition-colors"
                          >
                            {['2024', '2025', '2026', '2027', '2028', '2029', '2030', '2031', '2032'].map(yy => (
                              <option key={yy} value={yy}>{yy}</option>
                            ))}
                          </select>
                          <select
                            value={payReportEndMonth.split('-')[1] || '05'}
                            onChange={(e) => {
                              const year = payReportEndMonth.split('-')[0] || '2026';
                              setPayReportEndMonth(`${year}-${e.target.value}`);
                            }}
                            className="w-full px-2 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs text-slate-800 outline-none cursor-pointer focus:bg-white transition-colors"
                          >
                            {[
                              { val: '01', label: '01 - Jan' },
                              { val: '02', label: '02 - Feb' },
                              { val: '03', label: '03 - Mar' },
                              { val: '04', label: '04 - Apr' },
                              { val: '05', label: '05 - May' },
                              { val: '06', label: '06 - Jun' },
                              { val: '07', label: '07 - Jul' },
                              { val: '08', label: '08 - Aug' },
                              { val: '09', label: '09 - Sep' },
                              { val: '10', label: '10 - Oct' },
                              { val: '11', label: '11 - Nov' },
                              { val: '12', label: '12 - Dec' },
                            ].map(m => (
                              <option key={m.val} value={m.val}>{m.label}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </>
                  )}

                  {/* Conditional Fields based on reportViewMode */}
                  {reportViewMode === 'whole' ? (
                    <div>
                      <label className="block text-[10.5px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 pl-0.5">Filter by Class</label>
                      <select
                        value={reportClassSelection}
                        onChange={(e) => setReportClassSelection(e.target.value)}
                        className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none w-full cursor-pointer focus:bg-white focus:border-indigo-500 transition-all"
                      >
                        <option value="All">All Classrooms</option>
                        {classSelectionList.map(cls => (
                          <option key={cls} value={cls}>{cls}</option>
                        ))}
                      </select>
                    </div>
                  ) : reportViewMode === 'student' ? (
                    <div className="relative w-full" id="report-student-autocomplete-container">
                      <label className="block text-[10.5px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 pl-0.5">Search Student</label>
                      <div className="relative">
                        <Search className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 w-4 h-4 pointer-events-none mt-2.5" />
                        <input
                          type="text"
                          placeholder="Search student Name or ID..."
                          value={reportStudentSearchQuery}
                          onFocus={() => setShowReportStudentSuggestions(true)}
                          onBlur={() => setTimeout(() => setShowReportStudentSuggestions(false), 250)}
                          onChange={(e) => {
                            const val = e.target.value;
                            setReportStudentSearchQuery(val);
                            if (!val) {
                              setReportSelectedStudentId('');
                            }
                          }}
                          className="w-full pl-8 pr-8 py-2.5 bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white rounded-xl text-xs font-semibold text-slate-800 outline-none transition-all"
                        />
                        {reportStudentSearchQuery && (
                          <button
                            type="button"
                            onClick={() => {
                              setReportStudentSearchQuery('');
                              setReportSelectedStudentId('');
                            }}
                            className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      {/* Floating Autocomplete Suggestions */}
                      {showReportStudentSuggestions && (
                        <div className="absolute left-0 right-0 mt-1.5 max-h-56 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-xl z-50 py-1.5 scrollbar-thin">
                          {filteredReportStudents.length === 0 ? (
                            <div className="px-3.5 py-2 text-xs text-slate-400 font-semibold italic text-center">No matching students found</div>
                          ) : (
                            filteredReportStudents.slice(0, 8).map(s => {
                              const isChosen = s.id === reportSelectedStudentId;
                              return (
                                <button
                                  key={s.id}
                                  type="button"
                                  onMouseDown={() => {
                                    setReportSelectedStudentId(s.id);
                                    setReportStudentSearchQuery(s.name);
                                    setShowReportStudentSuggestions(false);
                                  }}
                                  className={`w-full text-left px-3.5 py-2 text-xs hover:bg-slate-100 flex items-center justify-between transition-colors ${
                                    isChosen ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-slate-700 font-medium'
                                  }`}
                                >
                                  <div className="flex flex-col">
                                    <span className="font-extrabold text-[11.5px]">{s.name}</span>
                                    <span className="text-[10px] text-slate-400 font-mono">{s.id} | Class: {s.className}</span>
                                  </div>
                                  {isChosen && <Check className="w-3.5 h-3.5 text-indigo-600" />}
                                </button>
                              );
                            })
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="relative w-full" id="payreport-student-autocomplete-container">
                      <label className="block text-[10.5px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 pl-0.5">Search Student</label>
                      <div className="relative">
                        <Search className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 w-4 h-4 pointer-events-none mt-2.5" />
                        <input
                          type="text"
                          placeholder="Search student Name or ID..."
                          value={payReportStudentSearchQuery}
                          onFocus={() => setShowPayReportStudentSuggestions(true)}
                          onBlur={() => setTimeout(() => setShowPayReportStudentSuggestions(false), 250)}
                          onChange={(e) => {
                            const val = e.target.value;
                            setPayReportStudentSearchQuery(val);
                            if (!val) {
                              setPayReportStudentId('');
                            }
                          }}
                          className="w-full pl-8 pr-8 py-2.5 bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white rounded-xl text-xs font-semibold text-slate-800 outline-none transition-all"
                        />
                        {payReportStudentSearchQuery && (
                          <button
                            type="button"
                            onClick={() => {
                              setPayReportStudentSearchQuery('');
                              setPayReportStudentId('');
                            }}
                            className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      {/* Floating Autocomplete Suggestions */}
                      {showPayReportStudentSuggestions && (
                        <div className="absolute left-0 right-0 mt-1.5 max-h-56 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-xl z-50 py-1.5 scrollbar-thin">
                          {filteredPayReportStudents.length === 0 ? (
                            <div className="px-3.5 py-2 text-xs text-slate-400 font-semibold italic text-center">No matching students found</div>
                          ) : (
                            filteredPayReportStudents.slice(0, 8).map(s => {
                              const isChosen = s.id === payReportStudentId;
                              return (
                                <button
                                  key={s.id}
                                  type="button"
                                  onMouseDown={() => {
                                    setPayReportStudentId(s.id);
                                    setPayReportStudentSearchQuery(s.name);
                                    setShowPayReportStudentSuggestions(false);
                                  }}
                                  className={`w-full text-left px-3.5 py-2 text-xs hover:bg-slate-100 flex items-center justify-between transition-colors ${
                                    isChosen ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-slate-700 font-medium'
                                  }`}
                                >
                                  <div className="flex flex-col">
                                    <span className="font-extrabold text-[11.5px]">{s.name}</span>
                                    <span className="text-[10px] text-slate-400 font-mono">{s.id} | Class: {s.className}</span>
                                  </div>
                                  {isChosen && <Check className="w-3.5 h-3.5 text-indigo-600" />}
                                </button>
                              );
                            })
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Cohesive premium Action Group Footer bar */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-5 border-t border-slate-100 mt-2" id="reports-action-bar">
                  <p className="text-[10px] text-slate-400 font-black uppercase tracking-wider flex items-center gap-2 pl-0.5">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    <span>Ready for analytical reports export</span>
                  </p>

                  <div className="flex flex-col sm:flex-row gap-2.5 w-full sm:w-auto" id="reports-action-buttons">
                    {reportViewMode === 'whole' ? (
                      <>
                        <button
                          type="button"
                          onClick={handleDownloadWholeAttendance}
                          className="py-2.5 px-5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold shadow-md shadow-teal-600/10 inline-flex items-center justify-center gap-1.5 transition-all cursor-pointer w-full sm:w-auto hover:scale-[1.01] active:scale-[0.99]"
                          title="D:\DugsigaSubucReports\"
                        >
                          <Download className="w-4 h-4" />
                          Export Text
                        </button>

                        <button
                          type="button"
                          onClick={() => setShowPrintReportModal({
                            mode: 'whole',
                            startDate: reportStartDate,
                            endDate: reportEndDate,
                            className: reportClassSelection
                          })}
                          className="py-2.5 px-5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-md inline-flex items-center justify-center gap-1.5 transition-all cursor-pointer w-full sm:w-auto hover:scale-[1.01] active:scale-[0.99]"
                        >
                          <Printer className="w-4 h-4" />
                          Print View
                        </button>
                      </>
                    ) : reportViewMode === 'student' ? (
                      <>
                        <button
                          type="button"
                          disabled={!reportSelectedStudentId}
                          onClick={handleDownloadStudentAttendance}
                          className="py-2.5 px-5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold disabled:opacity-40 shadow-md shadow-teal-600/10 inline-flex items-center justify-center gap-1.5 transition-all cursor-pointer w-full sm:w-auto hover:scale-[1.01] active:scale-[0.99]"
                        >
                          <Download className="w-4 h-4" />
                          Export Journal
                        </button>

                        <button
                          type="button"
                          disabled={!reportSelectedStudentId}
                          onClick={() => setShowPrintReportModal({
                            mode: 'student',
                            startDate: reportStartDate,
                            endDate: reportEndDate,
                            className: 'All',
                            studentId: reportSelectedStudentId
                          })}
                          className="py-2.5 px-5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold disabled:opacity-40 shadow-md inline-flex items-center justify-center gap-1.5 transition-all cursor-pointer w-full sm:w-auto hover:scale-[1.01] active:scale-[0.99]"
                        >
                          <Printer className="w-4 h-4" />
                          Print Student
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          disabled={!payReportStudentId}
                          onClick={() => handleDownloadPaymentRangeTxt(payReportStudentId, payReportStartMonth, payReportEndMonth)}
                          className="py-2.5 px-5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold disabled:opacity-40 shadow-md shadow-teal-600/10 inline-flex items-center justify-center gap-1.5 transition-all cursor-pointer w-full sm:w-auto hover:scale-[1.01] active:scale-[0.99]"
                        >
                          <Download className="w-4 h-4" />
                          Export Txt
                        </button>

                        <button
                          type="button"
                          disabled={!payReportStudentId}
                          onClick={() => setShowPrintReportModal({
                            mode: 'payments_range',
                            startDate: payReportStartMonth,
                            endDate: payReportEndMonth,
                            className: 'All',
                            studentId: payReportStudentId
                          })}
                          className="py-2.5 px-5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold disabled:opacity-40 shadow-md inline-flex items-center justify-center gap-1.5 transition-all cursor-pointer w-full sm:w-auto hover:scale-[1.01] active:scale-[0.99]"
                        >
                          <Printer className="w-4 h-4" />
                          Print statement
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Attendance Analytics & Logs Master List */}
            {reportViewMode === 'whole' ? (
              <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-6">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <div>
                    <h3 className="font-extrabold text-slate-900 text-lg">Compiled Attendance Aggregates</h3>
                    <p className="text-slate-400 text-xs mt-0.5">Showing performance compliance from {reportStartDate} to {reportEndDate}</p>
                  </div>
                  <div className="text-xs font-extrabold text-teal-600 bg-teal-50 px-3 py-1.5 rounded-xl border border-teal-100 uppercase">
                    Range: {reportStartDate} to {reportEndDate}
                  </div>
                </div>

                {/* Table Body */}
                <div className="overflow-x-auto rounded-2xl border border-slate-100 scrollbar-thin">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 text-slate-400 font-bold border-b border-slate-150 uppercase tracking-wider">
                        <th className="py-3 px-4">ID-ga Ardayga</th>
                        <th className="py-3 px-4">Magaca Ardayga</th>
                        <th className="py-3 px-4">Fasalka</th>
                        <th className="py-3 px-4 text-center">Kulamada Guud</th>
                        <th className="py-3 px-4 text-center text-emerald-700">Joogid</th>
                        <th className="py-3 px-4 text-center text-amber-700">Daahid</th>
                        <th className="py-3 px-4 text-center text-rose-700">Maqnansho</th>
                        <th className="py-3 px-4 text-right hover:text-slate-500">Heerka Joogitaanka</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {database.students
                        .filter(s => s.active && (reportClassSelection === 'All' ? true : s.className === reportClassSelection))
                        .map(stu => {
                          const studentLogs = rangeProgress.filter(p => p.studentId === stu.id);
                          const totalDays = studentLogs.length;
                          const presentCount = studentLogs.filter(p => p.attendance === 'Present').length;
                          const lateCount = studentLogs.filter(p => p.attendance === 'Late').length;
                          const absentCount = studentLogs.filter(p => p.attendance === 'Absent').length;

                          const compliance = totalDays > 0 ? Math.round(((presentCount + lateCount) / totalDays) * 100) : 0;

                          return (
                            <tr key={stu.id} className="hover:bg-slate-50/50 transition-colors">
                              <td className="py-3.5 px-4 font-bold text-slate-800">{stu.id}</td>
                              <td className="py-3.5 px-4 font-extrabold text-slate-900">{stu.name}</td>
                              <td className="py-3.5 px-4 text-slate-400 font-medium">{stu.className}</td>
                              <td className="py-3.5 px-4 text-center font-bold text-slate-600">{totalDays}</td>
                              <td className="py-3.5 px-4 text-center font-extrabold text-emerald-600">{presentCount}</td>
                              <td className="py-3.5 px-4 text-center font-extrabold text-amber-600">{lateCount}</td>
                              <td className="py-3.5 px-4 text-center font-extrabold text-rose-600">{absentCount}</td>
                              <td className="py-3.5 px-4 text-right">
                                <span className={`px-2.5 py-1 rounded-lg text-xs font-black border ${
                                  compliance >= 85 ? 'bg-emerald-55 bg-emerald-50 text-emerald-700 border-emerald-100' :
                                  compliance >= 50 ? 'bg-amber-55 bg-amber-50 text-amber-700 border-amber-100' :
                                  'bg-rose-55 bg-rose-50 text-rose-700 border-rose-100'
                                }`}>
                                  {totalDays > 0 ? `${compliance}%` : 'may'}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : reportViewMode === 'student' ? (
              <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-6">
                {/* Single Student Attendance compliance details */}
                {(() => {
                  const s = database.students.find(st => st.id === reportSelectedStudentId);
                  if (!s) {
                    return (
                      <div className="text-center py-10 text-slate-400">
                        Please select an active student.
                      </div>
                    );
                  }

                  const studentLogs = rangeProgress.filter(p => p.studentId === s.id).sort((a,b) => a.date.localeCompare(b.date));
                  const totalDays = studentLogs.length;
                  const presentCount = studentLogs.filter(p => p.attendance === 'Present').length;
                  const lateCount = studentLogs.filter(p => p.attendance === 'Late').length;
                  const absentCount = studentLogs.filter(p => p.attendance === 'Absent').length;

                  const compliance = totalDays > 0 ? Math.round(((presentCount + lateCount) / totalDays) * 100) : 0;

                  return (
                    <div className="space-y-6">
                      {/* Metric widgets block */}
                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                          <span className="text-[10px] text-slate-400 uppercase font-bold">Total Sessions</span>
                          <span className="block text-2xl font-black text-slate-800 mt-1">{totalDays}</span>
                        </div>
                        <div className="bg-emerald-50 text-emerald-700 p-4 rounded-2xl border border-emerald-100">
                          <span className="text-[10px] uppercase font-bold">Present Days</span>
                          <span className="block text-2xl font-black mt-1 text-emerald-800">{presentCount}</span>
                        </div>
                        <div className="bg-amber-50 text-amber-700 p-4 rounded-2xl border border-amber-100">
                          <span className="text-[10px] uppercase font-bold">Late Days</span>
                          <span className="block text-2xl font-black mt-1 text-amber-800">{lateCount}</span>
                        </div>
                        <div className="bg-rose-50 text-rose-700 p-4 rounded-2xl border border-rose-100">
                          <span className="text-[10px] uppercase font-bold text-rose-600">Compliance Rate</span>
                          <span className="block text-2xl font-black mt-1 text-rose-800">{totalDays > 0 ? `${compliance}%` : 'may'}</span>
                        </div>
                      </div>

                      {/* We insert the student's Academic Performance & Assessment history here */}
                      {(() => {
                        const studentWeeklyExams = (database.exams || []).filter(ex => 
                          ex.assessmentType === 'weekly' &&
                          ex.scores.some(sc => sc.studentId === s.id)
                        ).sort((a,b) => b.date.localeCompare(a.date));

                        // Get unique months from weekly exams to compute monthly averages dynamically
                        const uniqueMonths = Array.from(new Set(studentWeeklyExams.map(ex => ex.month).filter(Boolean))) as string[];
                        uniqueMonths.sort((a, b) => b.localeCompare(a));

                        const studentMonthlyExams = uniqueMonths.map(m => {
                          const res = calculateStudentMonthlyScore(s.id, m, s.className);
                          return {
                            id: `computed-monthly-${m}`,
                            month: m,
                            heading: `Celceliska Bisha (${m})`,
                            averageScore: res.average,
                            grade: res.grade,
                            completedWeeks: res.completedWeeks
                          };
                        }).filter(report => report.completedWeeks > 0);

                        const currentComp = getStudentCompetitionGroup(s.id);
                        const currentTrend = getStudentProgressTrend(s.id);

                        return (
                          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden" id="admin-assessments-timeline">
                            <div className="p-5 border-b border-slate-100 bg-slate-50/25" id="admin-assessments-header">
                              <h4 className="font-extrabold text-xs uppercase text-slate-700 tracking-wider flex items-center gap-2">
                                <span>🎓</span> Xogta Waxbarashada & Qiimaynta Toddobaadlaha (Academic & Assessment History)
                              </h4>
                            </div>
                            <div className="p-5 space-y-6">
                              {/* Standings, Level, Trend, and Competition Group Profile Cards */}
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div className="bg-teal-50/50 p-4 rounded-2xl border border-teal-100 shadow-3xs flex flex-col justify-between">
                                  <div>
                                    <span className="text-[9px] text-teal-800 uppercase font-black tracking-widest font-mono">🏆 Competition Standing</span>
                                    <span className="block text-lg font-black text-teal-900 mt-1">
                                      {currentComp.group}
                                    </span>
                                  </div>
                                  <span className="text-[10px] font-semibold text-teal-650 mt-2 block border-t border-teal-100/50 pt-1.5">
                                    Latest Monthly Score: <b className="text-teal-900">{currentComp.score.toFixed(1)}%</b>
                                  </span>
                                </div>
                                <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-105 shadow-3xs flex flex-col justify-between">
                                  <div>
                                    <span className="text-[9px] text-[#2563eb] uppercase font-black tracking-widest font-mono">📈 Progress Outlook</span>
                                    <span className="block text-lg font-black text-blue-900 mt-1 flex items-center gap-1.5">
                                      {currentTrend.icon} {currentTrend.trend}
                                    </span>
                                  </div>
                                  <span className="text-[10px] font-semibold text-blue-500 mt-2 block border-t border-blue-100/50 pt-1.5">
                                    {currentTrend.diff !== 0 ? (
                                      <span>Weekly change of {currentTrend.diff > 0 ? '+' : ''}{currentTrend.diff.toFixed(1)} mks</span>
                                    ) : (
                                      <span>Stable / No recent logs</span>
                                    )}
                                  </span>
                                </div>
                                <div className="bg-purple-50/50 p-4 rounded-2xl border border-purple-100 shadow-3xs flex flex-col justify-between">
                                  <div>
                                    <span className="text-[9px] text-purple-805 uppercase font-black tracking-widest font-mono">💪 Program Syllabus</span>
                                    <span className="block text-md font-black text-purple-900 mt-1 leading-tight truncate">
                                      {s.className}
                                    </span>
                                  </div>
                                  <span className="text-[10px] font-semibold text-purple-600 mt-2 block border-t border-purple-100/50 pt-1.5">
                                    Current Classroom Level
                                  </span>
                                </div>
                              </div>

                              {/* 1. Weekly History Card Block */}
                              <div className="border border-slate-150 rounded-2xl p-4 bg-slate-50/20">
                                <h5 className="font-extrabold text-slate-800 text-[11px] uppercase tracking-wider mb-3">📅 Weekly Performance Record Table ({studentWeeklyExams.length} logs)</h5>
                                {studentWeeklyExams.length === 0 ? (
                                  <p className="text-slate-400 text-xs italic bg-white p-4 rounded-xl border border-slate-100 text-center">No weekly evaluations logged yet for this student.</p>
                                ) : (
                                  <div className="overflow-x-auto rounded-xl border border-slate-150 bg-white shadow-3xs">
                                    <table className="w-full text-xs text-left border-collapse">
                                      <thead>
                                        <tr className="bg-slate-50 border-b border-slate-150 font-black text-slate-500 font-mono tracking-wide text-[10px] uppercase">
                                          <th className="py-3 px-4">Evaluation</th>
                                          <th className="py-3 px-2">Laxniga</th>
                                          <th className="py-3 px-2">Imaanshaha</th>
                                          <th className="py-3 px-2">Xifdiga</th>
                                          <th className="py-3 px-2">Tajwiid</th>
                                          <th className="py-3 px-2">Akhlaaq</th>
                                          <th className="py-3 px-4">Total Score</th>
                                          <th className="py-3 px-4 text-center">Grade</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                                        {studentWeeklyExams.map(ex => {
                                          const sc = ex.scores.find(scoreSc => scoreSc.studentId === s.id);
                                          if (!sc) return null;
                                          return (
                                            <tr key={ex.id} className="hover:bg-slate-50/50">
                                              <td className="py-3 px-4 font-bold text-slate-800">
                                                <span>Week {ex.weekNumber}</span>
                                                <span className="text-[9.5px] text-slate-400 font-bold font-mono block mt-0.5">{ex.date}</span>
                                              </td>
                                              <td className="py-3 px-2 text-slate-500">{sc.scores['Laxniga'] !== undefined ? sc.scores['Laxniga'] : (sc.scores['Laxniga-old'] || 0)}/30</td>
                                              <td className="py-3 px-2 text-slate-500">{(sc.scores['Imaanshaha'] !== undefined ? sc.scores['Imaanshaha'] : ((sc.scores['Higgaadda'] || 0) + (sc.scores['Far-Qurxinta'] || 0))) || 0}/30</td>
                                              <td className="py-3 px-2 text-slate-500">{sc.scores['Xifdiga'] !== undefined ? sc.scores['Xifdiga'] : 0}/20</td>
                                              <td className="py-3 px-2 text-slate-500">{sc.scores['Tajwiidka'] !== undefined ? sc.scores['Tajwiidka'] : 0}/10</td>
                                              <td className="py-3 px-2 text-slate-500">{sc.scores['Akhlaaqda iyo Nadaafada'] !== undefined ? sc.scores['Akhlaaqda iyo Nadaafada'] : 0}/10</td>
                                              <td className="py-3 px-4 font-black">
                                                <span className="px-2 py-0.5 bg-teal-50 text-teal-800 border border-teal-100 rounded text-[11px]">
                                                  {sc.averageScore} / 100
                                                </span>
                                              </td>
                                              <td className="py-3 px-4 text-center">
                                                <span className={`px-2.5 py-0.5 rounded font-black text-[10px] ${
                                                  sc.grade === 'A' ? 'bg-emerald-50 text-emerald-700' :
                                                  sc.grade === 'B' ? 'bg-teal-50 text-teal-700' :
                                                  sc.grade === 'C' ? 'bg-blue-50 text-blue-700' :
                                                  'bg-slate-100 text-slate-700'
                                                }`}>
                                                  Grade {sc.grade}
                                                </span>
                                              </td>
                                            </tr>
                                          );
                                        })}
                                      </tbody>
                                    </table>
                                  </div>
                                )}
                              </div>

                              {/* 2. Monthly History Card Block */}
                              <div className="border border-slate-150 rounded-2xl p-4 bg-slate-50/20">
                                <h5 className="font-extrabold text-slate-800 text-[11px] uppercase tracking-wider mb-3">⚙️ Monthly Evaluations (System Auto-Calculated) ({studentMonthlyExams.length} months)</h5>
                                {studentMonthlyExams.length === 0 ? (
                                  <p className="text-slate-400 text-xs italic bg-white p-4 rounded-xl border border-slate-100 text-center">Nidaamku wuxuu xisaabin doonaa dhibcaha bisha marka aad toddobaadka hore diiwaangeliso.</p>
                                ) : (
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {studentMonthlyExams.map(ex => {
                                      return (
                                        <div key={ex.id} className="bg-white border border-slate-150 rounded-xl p-3 shadow-3xs flex items-center justify-between">
                                          <div>
                                            <span className="text-[10px] text-indigo-700 font-extrabold font-mono uppercase block">{ex.month}</span>
                                            <span className="text-xs font-black text-slate-800 mt-1 block">{ex.heading}</span>
                                            <span className="text-[9.5px] text-slate-400 font-bold font-mono mt-0.5 block">Count: {ex.completedWeeks} active weeks</span>
                                          </div>
                                          <div className="text-right flex flex-col items-end gap-1.5 shrink-0">
                                            <span className="text-xs font-black text-teal-705 bg-teal-50 px-2 py-0.5 rounded border border-teal-100 font-mono">
                                              {ex.averageScore}%
                                            </span>
                                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-black border ${
                                              ex.grade === 'A' ? 'bg-emerald-50 text-emerald-800 border-teal-100' :
                                              ex.grade === 'B' ? 'bg-teal-50 text-teal-800 border-teal-100' :
                                              'bg-slate-50 text-slate-705 border-slate-200'
                                            }`}>
                                              Grade {ex.grade}
                                            </span>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })()}

                      {/* Detail journal list */}
                      <div>
                        <h4 className="font-extrabold text-xs uppercase text-slate-705 text-slate-500 mb-4 tracking-wider">Diiwaanka Kulamada Fasalka ee Maalinlaha ah</h4>
                        {studentLogs.length === 0 ? (
                          <div className="text-center py-12 bg-slate-50 rounded-2xl border border-slate-100">
                            <CalendarRange className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                            <p className="text-xs text-slate-500 font-bold">Diiwaan mada dhexdeeda laga helin muddadan</p>
                            <p className="text-[11px] text-slate-455 mt-1">Hubi in macallimiintu galiyeen xogta inta u dhaxeysa {reportStartDate} iyo {reportEndDate}.</p>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            {studentLogs.map((log, idx) => (
                              <div key={log.id} className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 shadow-3xs hover:border-indigo-200 transition-all duration-300">
                                {/* Flex alignment showing date & status badge */}
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/80 pb-2.5 mb-3">
                                  <div className="flex items-center gap-2">
                                    <span className="text-base">📅</span>
                                    <span className="font-extrabold text-[#111827] text-xs sm:text-sm">{log.date}</span>
                                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider font-mono">Diiwaanka {idx + 1}</span>
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest font-mono">Joogitaanka:</span>
                                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${
                                      log.attendance === 'Present' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                                      log.attendance === 'Absent' ? 'bg-rose-50 text-rose-700 border border-rose-100' :
                                      'bg-amber-50 text-amber-700 border border-amber-100'
                                    }`}>
                                      {log.attendance === 'Present' ? 'Joogid' : log.attendance === 'Absent' ? 'Maqnansho' : 'Daahid'}
                                    </span>
                                  </div>
                                </div>

                                {/* Suuraduu marayo Badge if present */}
                                {(log.suuradeeMaraya || log.boggee || (log.inteeBog && log.inteeBog !== 'N/A' && log.inteeBog !== '')) && (
                                  <div className="mb-3 bg-indigo-50/50 border border-indigo-105 rounded-xl p-2.5 px-3.5 text-xs flex items-center justify-between shadow-3xs">
                                    <div className="flex items-center gap-2">
                                      <span className="text-sm">📖</span>
                                      <span className="font-extrabold text-slate-800">Casharka:</span>
                                    </div>
                                    <div className="flex items-center gap-2 flex-wrap">
                                      {log.suuradeeMaraya && (
                                        <span className="font-black text-indigo-700 bg-white px-3 py-1 rounded-lg border border-indigo-100 shadow-3xs">Surada: {log.suuradeeMaraya}</span>
                                      )}
                                      {log.boggee && (
                                        <span className="font-black text-purple-700 bg-purple-50 px-3 py-1 rounded-lg border border-purple-100 shadow-3xs">Boggee: {log.boggee}</span>
                                      )}
                                      {log.inteeBog && log.inteeBog !== 'N/A' && log.inteeBog !== '' && (
                                        <span className="font-black text-violet-700 bg-violet-50/50 px-3 py-1 rounded-lg border border-violet-100 shadow-3xs">Intee Bog: {log.inteeBog}</span>
                                      )}
                                    </div>
                                  </div>
                                )}

                                {/* Matrix grid */}
                                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                                  <div className="bg-white p-2.5 rounded-xl border border-slate-100 flex flex-col justify-center shadow-3xs">
                                    <span className="text-[9px] text-slate-400 font-extrabold uppercase tracking-widest font-mono">Casharka</span>
                                    <span className="text-xs font-black text-slate-800 mt-1">
                                      {log.lessonCompleted === 'Completed' ? '✅ Kabaxay' : '❌ Kama Bixin'}
                                    </span>
                                  </div>
                                  <div className="bg-white p-2.5 rounded-xl border border-slate-100 flex flex-col justify-center shadow-3xs">
                                    <span className="text-[9px] text-slate-400 font-extrabold uppercase tracking-widest font-mono">Suurad</span>
                                    <span className="text-xs font-black text-slate-800 mt-1">
                                      {log.surad === 'Completed' ? '✅ Kabaxay' : log.surad === 'N/A' ? 'may' : '❌ Kama Bixin'}
                                    </span>
                                  </div>
                                  <div className="bg-white p-2.5 rounded-xl border border-slate-100 flex flex-col justify-center shadow-3xs">
                                    <span className="text-[9px] text-slate-400 font-extrabold uppercase tracking-widest font-mono">Subac</span>
                                    <span className="text-xs font-black text-slate-800 mt-1">
                                      {log.subac === 'Completed' ? '✅ Galay' : '❌ Ma Galin'}
                                    </span>
                                  </div>
                                  <div className="bg-white p-2.5 rounded-xl border border-slate-100 flex flex-col justify-center shadow-3xs">
                                    <span className="text-[9px] text-slate-400 font-extrabold uppercase tracking-widest font-mono">Dhaqanka</span>
                                    <span className="text-xs font-black text-indigo-700 mt-1">
                                      {log.dhaqan === 'Excellent' ? '✨ Aad u Fiican' : log.dhaqan === 'Good' ? '👍 Fiican' : log.dhaqan === 'Average' ? 'Dhexdhexaad' : log.dhaqan === 'Needs Improvement' ? '⚠️ Baahan' : log.dhaqan}
                                    </span>
                                  </div>
                                  <div className="bg-white p-2.5 rounded-xl border border-slate-100 flex flex-col justify-center shadow-3xs">
                                    <span className="text-[9px] text-slate-400 font-extrabold uppercase tracking-widest font-mono">Nadaafadda</span>
                                    <span className="text-xs font-black text-emerald-700 mt-1">
                                      {log.nadaafad === 'Excellent' ? '✨ Aad u Fiican' : log.nadaafad === 'Good' ? '👍 Fiican' : log.nadaafad === 'Average' ? 'Dhexdhexaad' : log.nadaafad === 'Needs Improvement' ? '⚠️ Baahan' : log.nadaafad}
                                    </span>
                                  </div>
                                </div>

                                {/* Full width comment section below */}
                                {log.faahfaahin ? (
                                  <div 
                                    onClick={() => setExpandedComments(prev => ({ ...prev, [log.id]: !prev[log.id] }))}
                                    className="mt-3 bg-amber-50 hover:bg-amber-100/60 text-amber-905 border border-amber-200/60 rounded-xl p-3 text-[11px] font-bold leading-relaxed flex flex-col cursor-pointer select-none transition-all duration-300 shadow-3xs"
                                    title="Guji si aad u ballaariso ama u yarayso / Click to expand or collapse"
                                  >
                                    <div className="flex items-center gap-1.5 mb-1 bg-amber-100/50 pb-1 rounded px-1.5 w-fit">
                                      <span className="text-xs select-none">📝</span>
                                      <span className="text-[9.5px] text-amber-800 font-black uppercase tracking-widest font-mono">Xogta Macallinka:</span>
                                    </div>
                                    <p className={`font-semibold text-slate-850 mt-1 text-xs px-1 ${expandedComments[log.id] ? '' : 'line-clamp-2'}`}>
                                      {log.faahfaahin}
                                    </p>
                                  </div>
                                ) : (
                                  <div className="mt-2.5 text-[10px] text-slate-400 italic bg-white rounded-xl p-2.5 border border-slate-150/40">
                                    Lama qorin wax faallo ah (No comments logged).
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>
            ) : reportViewMode === 'payments_range' ? (
              <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-6 animate-fade-in">
                {/* Single Student Tuition range history statements */}
                {(() => {
                  const s = database.students.find(st => st.id === payReportStudentId);
                  if (!s) {
                    return (
                      <div className="text-center py-12 text-slate-400">
                        Please select an active student to inspect financial statement logs.
                      </div>
                    );
                  }

                  const stats = getStudentPaymentRangeReport(s.id, payReportStartMonth, payReportEndMonth);
                  if (!stats) return <p className="text-rose-500 font-bold">Error compiling payment ranges statement.</p>;

                  const { records, totalDue, totalPaid, totalDebt } = stats;

                  return (
                    <div className="space-y-6">
                      {/* Brand Label block with crest logo */}
                      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50 p-5 rounded-2xl border border-slate-100">
                        <div className="flex items-center gap-3">
                          <div>
                            <h4 className="font-extrabold text-slate-900 text-sm">{s.name} ({s.id})</h4>
                            <p className="text-xs text-slate-400 font-semibold mt-0.5">Tuition Ledger Range Statement ({payReportStartMonth} to {payReportEndMonth})</p>
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <span className="text-[11px] text-slate-500 font-bold uppercase bg-slate-200 border border-slate-300 px-3 py-1.5 rounded-xl">
                            Parent: {s.parentName} ({s.parentPhone})
                          </span>
                        </div>
                      </div>

                      {/* 3 Metric cards for Financial Position */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                          <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Total Tuition Invoiced</span>
                          <span className="block text-2xl font-black text-slate-800">${Number(totalDue).toFixed(2)}</span>
                        </div>
                        <div className="bg-emerald-50 text-emerald-700 p-4 rounded-2xl border border-emerald-100">
                          <span className="text-[10px] uppercase font-bold block mb-1">Total Tuition Deposited</span>
                          <span className="block text-2xl font-black text-emerald-800">${Number(totalPaid).toFixed(2)}</span>
                        </div>
                        <div className="bg-rose-50 text-rose-700 p-4 rounded-2xl border border-rose-100">
                          <span className="text-[10px] uppercase font-bold block mb-1">Outstanding Balance Debt</span>
                          <span className="block text-2xl font-black text-rose-800">${Number(totalDebt).toFixed(2)}</span>
                        </div>
                      </div>
                      
                      {/* Detail transactions list */}
                      <div>
                        <h4 className="font-extrabold text-xs uppercase text-slate-500 mb-4 tracking-wider">Tuition Journal Invoice Records</h4>
                        {records.length === 0 ? (
                          <div className="text-center py-12 bg-slate-50 rounded-2xl border border-slate-100">
                            <CircleDollarSign className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                            <p className="text-xs text-slate-550 font-bold">No Records Found for the Selected Month Range</p>
                          </div>
                        ) : (
                          <div className="overflow-x-auto rounded-2xl border border-slate-100 scrollbar-thin">
                            <table className="w-full text-left border-collapse text-xs">
                              <thead>
                                <tr className="bg-slate-50 text-slate-400 font-bold border-b border-slate-150 uppercase tracking-wider font-extrabold">
                                  <th className="py-3 px-4">Billing Cycle Month</th>
                                  <th className="py-3 px-4">Invoiced Amount</th>
                                  <th className="py-3 px-4 text-emerald-700">Deposited Amount</th>
                                  <th className="py-3 px-4 text-rose-700">Accrued Debt</th>
                                  <th className="py-3 px-4 text-center">Payment Status</th>
                                  <th className="py-3 px-4">Receipt Serial</th>
                                  <th className="py-3 px-4">Receipt Notes</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                                {records.map(r => {
                                  const feeAmt = r.amountDue ?? s.monthlyFee;
                                  const curDebt = r.debtAmount ?? Math.max(0, feeAmt - r.amountPaid);
                                  return (
                                    <tr key={r.month} className="hover:bg-slate-50/50 transition-colors">
                                      <td className="py-3.5 px-4 font-bold text-slate-900">{r.month}</td>
                                      <td className="py-3.5 px-4">${Number(feeAmt).toFixed(2)}</td>
                                      <td className="py-3.5 px-4 text-emerald-700">${Number(r.amountPaid).toFixed(2)}</td>
                                      <td className="py-3.5 px-4 text-rose-700">${Number(curDebt).toFixed(2)}</td>
                                      <td className="py-3.5 px-4 text-center">
                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                                          r.status === 'Paid' ? 'bg-emerald-50 text-emerald-800 border border-emerald-100' :
                                          r.status === 'Partial' ? 'bg-amber-50 text-amber-850 border border-amber-100' :
                                          'bg-rose-50 text-rose-800 border border-rose-100'
                                        }`}>
                                          {r.status}
                                        </span>
                                      </td>
                                      <td className="py-3.5 px-4 text-slate-500">{r.receiptNo || '-'}</td>
                                      <td className="py-3.5 px-4 text-[11px] font-medium text-slate-650 italic" title={r.notes}>{r.notes || '-'}</td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>
            ) : (
              <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-6 animate-fade-in">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
                  <div>
                    <h3 className="font-extrabold text-slate-900 text-lg">Registration Log & Chronicle / Diiwaanka Diiwangelinta</h3>
                    <p className="text-slate-400 text-xs mt-0.5">Chronological audit list of all registered teachers, instructors, and students in the academy.</p>
                  </div>
                </div>

                {(() => {
                  const studentLogItems = database.students.map(s => ({
                    id: s.id,
                    name: s.name,
                    role: 'Student',
                    details: `${s.className} (${s.session || 'Both'} Session)`,
                    registrationDate: s.registrationDate || '2026-05-15',
                    active: s.active
                  }));

                  const teacherLogItems = database.teachers.map(t => ({
                    id: t.id,
                    name: t.name,
                    role: 'Teacher/Staff',
                    details: `Assigned Division: ${t.classAssigned || t.className || 'General'}`,
                    registrationDate: t.registrationDate || '2026-05-15',
                    active: true
                  }));

                  const combinedChronicle = [...studentLogItems, ...teacherLogItems].sort((a, b) => b.registrationDate.localeCompare(a.registrationDate));

                  return (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                          <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Total Students Registered</span>
                          <span className="block text-2xl font-black text-indigo-700">{studentLogItems.length}</span>
                        </div>
                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                          <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Total Staff Certified</span>
                          <span className="block text-2xl font-black text-teal-700">{teacherLogItems.length}</span>
                        </div>
                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                          <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Combined Registrations</span>
                          <span className="block text-2xl font-black text-slate-800">{combinedChronicle.length}</span>
                        </div>
                      </div>

                      <div className="overflow-x-auto rounded-2xl border border-slate-150 bg-white shadow-3xs">
                        <table className="w-full text-xs text-left border-collapse">
                          <thead>
                            <tr className="bg-slate-50 border-b border-slate-150 font-black text-slate-500 font-mono tracking-wide text-[10px] uppercase">
                              <th className="py-3.5 px-4">Registration Date</th>
                              <th className="py-3.5 px-4">ID</th>
                              <th className="py-3.5 px-4">Name / Member</th>
                              <th className="py-3.5 px-4 text-center">Role</th>
                              <th className="py-3.5 px-4">Class Assignment / Details</th>
                              <th className="py-3.5 px-4 text-center">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                            {combinedChronicle.map((item, index) => (
                              <tr key={`${item.id}-${index}`} className="hover:bg-slate-50/50 transition-colors">
                                <td className="py-4 px-4 font-mono font-bold text-indigo-600 shrink-0">{item.registrationDate}</td>
                                <td className="py-4 px-4 font-bold text-slate-500">{item.id}</td>
                                <td className="py-4 px-4 font-extrabold text-[#111827]">{item.name}</td>
                                <td className="py-4 px-4 text-center">
                                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-black border ${
                                    item.role === 'Student' 
                                      ? 'bg-blue-50 text-blue-700 border-blue-100' 
                                      : 'bg-teal-50 text-teal-700 border-teal-100'
                                  }`}>
                                    {item.role}
                                  </span>
                                </td>
                                <td className="py-4 px-4 text-slate-500">{item.details}</td>
                                <td className="py-4 px-4 text-center">
                                  <span className={`px-2 py-0.5 rounded text-[9px] font-black ${
                                    item.active 
                                      ? 'bg-emerald-50 text-emerald-700' 
                                      : 'bg-slate-50 text-slate-450'
                                  }`}>
                                    {item.active ? 'Active' : 'Inactive'}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        )}

        {/* --- EXAMS CENTER ADMINISTRATIVE REPORTS --- */}
        {activeTab === 'exams' && (() => {
          // Computations for filtering
          const uniqueClasses = Array.from(new Set(database.students.map(s => s.className))).filter(Boolean);
          const matchedExams = (database.exams || []).filter(ex => {
            const matchClass = examFilterClass === 'All' ? true : ex.className === examFilterClass;
            const matchTeacher = examFilterTeacher === 'All' ? true : ex.teacherId === examFilterTeacher;
            const matchStart = examStartDate ? ex.date >= examStartDate : true;
            const matchEnd = examEndDate ? ex.date <= examEndDate : true;
            return matchClass && matchTeacher && matchStart && matchEnd;
          });

          // Summary aggregates
          const totalExamsUploaded = matchedExams.length;
          const totalGradedCount = matchedExams.reduce((sum, ex) => sum + ex.scores.length, 0);
          const overallClassAverageSum = matchedExams.reduce((sum, ex) => {
            const exAvg = ex.scores.reduce((sSum, sc) => sSum + sc.averageScore, 0) / Math.max(ex.scores.length, 1);
            return sum + exAvg;
          }, 0);
          const computedTotalScoreAverage = totalExamsUploaded > 0 ? (overallClassAverageSum / totalExamsUploaded).toFixed(1) : '0';

          const handleDeleteAdminExam = (examId: string) => {
            setConfirmModal({
              isOpen: true,
              title: "Delete Exam Record?",
              message: "Are you sure you want to permanently delete this exam score sheet from servers? This operation is irreversible.",
              accentColor: 'rose',
              onConfirm: () => {
                const updatedExams = (database.exams || []).filter(ex => ex.id !== examId);
                onSaveDatabase({
                  ...database,
                  exams: updatedExams
                });
                setFeedbackMsg("Exam record successfully deleted from catalog!");
                setTimeout(() => setFeedbackMsg(''), 4050);
                setConfirmModal(null);
              }
            });
          };

          return (
            <div className="space-y-8 animate-fade-in" id="portal-exams">
              {/* Top Banner explaining Admin & Teacher dual rights */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-gradient-to-r from-teal-50 to-indigo-50/50 p-6 rounded-3xl border border-slate-150/60 shadow-sm">
                <div>
                  <h3 className="font-extrabold text-[#113d3c] text-sm flex items-center gap-2">
                    <span className="text-lg">📊</span> Graded Evaluation Forms & Report Sheets
                  </h3>
                  <p className="text-xs text-slate-500 font-bold mt-1">
                    Both administrators and classroom teachers can compile, grade, and record weekly or monthly assessments.
                  </p>
                </div>
                {!isCreatingExam && !isCompilingMonthly && !editingExam && (
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setIsCompilingMonthly(true);
                        if (database.teachers.length > 0) {
                          setMonthlyTeacherId(database.teachers[0].id);
                        }
                      }}
                      className="py-3 px-5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/10 shrink-0 border-0 outline-none"
                    >
                      <Sparkles className="w-4 h-4" />
                      Sami Qiimaynta Bisha (Generate Monthly)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsCreatingExam(true);
                        if (database.teachers.length > 0) {
                          setExamTeacherId(database.teachers[0].id);
                        }
                      }}
                      className="py-3 px-5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-teal-600/10 shrink-0 border-0 outline-none"
                    >
                      <Plus className="w-4 h-4" />
                      Record New Assessment
                    </button>
                  </div>
                )}
              </div>

              {isCreatingExam ? (
                /* Create/Fill Score Sheet Form for Admin */
                <form onSubmit={handleSaveAdminCreatedExam} className="space-y-6">
                  <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-6">
                    <div className="flex items-center justify-between border-b border-slate-150 pb-4">
                      <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                        <Plus className="w-4 h-4 text-teal-600" />
                        Record New Assessment / Exam Score Sheet (Admin Mode)
                      </h3>
                      <button
                        type="button"
                        onClick={() => {
                          setIsCreatingExam(false);
                          setAssessmentType('weekly');
                          setStudentScores({});
                          setStudentComments({});
                        }}
                        className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold rounded-xl transition-all cursor-pointer border-0 outline-none"
                      >
                        Cancel Entry
                      </button>
                    </div>

                    {/* Teacher & Class Selector */}
                    <div className="bg-teal-50/30 p-5 rounded-2xl border border-teal-100/50">
                      <label className="block text-[10px] font-extrabold text-teal-800 uppercase tracking-widest mb-2 pl-0.5">Select Class Instructor & Classroom</label>
                      <select
                        value={examTeacherId}
                        onChange={e => {
                          setExamTeacherId(e.target.value);
                          setStudentScores({});
                          setStudentComments({});
                        }}
                        className="w-full px-4 py-3 bg-white border border-teal-200 rounded-xl text-xs font-bold text-slate-800 focus:border-teal-500 outline-none cursor-pointer"
                        required
                      >
                        <option value="" disabled>-- Dooro Macallinka & Fasalka --</option>
                        {database.teachers.map(t => (
                          <option key={t.id} value={t.id}>
                            Macallin: {t.name} (Fasalka: {t.classAssigned || 'N/A'} - ID: {t.id})
                          </option>
                        ))}
                      </select>
                      <p className="text-[10px] text-slate-400 font-bold mt-2 italic pl-0.5">
                        * Marks entered below will be logged under the selected instructor and their assigned classroom automatically.
                      </p>
                    </div>

                    {/* Assessment Type Selector */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-1.5 bg-slate-50 rounded-2xl border border-slate-200">
                      <button
                        type="button"
                        onClick={() => setAssessmentType('weekly')}
                        className={`py-3 px-4 rounded-xl text-xs font-extrabold uppercase tracking-wide transition-all border-0 outline-none cursor-pointer ${
                          assessmentType === 'weekly'
                            ? 'bg-teal-600 text-white shadow-md shadow-teal-600/10'
                            : 'text-slate-600 hover:text-slate-800 hover:bg-slate-100 bg-transparent'
                        }`}
                      >
                        📅 Weekly Assessment
                      </button>
                      <button
                        type="button"
                        onClick={() => setAssessmentType('custom')}
                        className={`py-3 px-4 rounded-xl text-xs font-extrabold uppercase tracking-wide transition-all border-0 outline-none cursor-pointer ${
                          assessmentType === 'custom'
                            ? 'bg-slate-850 text-white shadow-md'
                            : 'text-slate-600 hover:text-slate-800 hover:bg-slate-100 bg-transparent'
                        }`}
                      >
                        📝 Custom (Traditional) Exam
                      </button>
                    </div>

                    <div className="text-[11px] font-bold text-teal-700 bg-teal-50/50 rounded-xl px-4 py-2 border border-teal-100/65">
                      💡 <b>FIIRO rasmiga ah:</b> Maamulow, waxaad halkan ku diiwaangeliyaa qiimaynta toddobaadlaha ah (Weekly). Nidaamka ayaa kuu xisaabin doona celceliska bisha (Monthly average) si toos ah oo dynamic ah, adigoon u baahnayn inaad adigu gacanta ku geliso!
                    </div>

                    {/* Mode Specific Inputs */}
                    {assessmentType === 'weekly' && (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-emerald-50/30 p-5 rounded-2xl border border-emerald-100">
                        <div>
                          <label className="block text-[10px] font-extrabold text-teal-800 uppercase tracking-widest mb-2">Week Number</label>
                          <select
                            value={weekNumber}
                            onChange={e => setWeekNumber(parseInt(e.target.value, 10))}
                            className="w-full px-4 py-3 bg-white border border-teal-200 rounded-xl text-xs font-bold text-slate-800 focus:border-teal-500 outline-none cursor-pointer"
                          >
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20].map(wk => (
                              <option key={wk} value={wk}>Week {wk} Assessment</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] font-extrabold text-teal-800 uppercase tracking-widest mb-2">Evaluation Month</label>
                          <input
                            type="month"
                            value={selectedMonth}
                            onChange={e => {
                              setSelectedMonth(e.target.value);
                            }}
                            className="w-full px-4 py-3 bg-white border border-teal-200 rounded-xl text-xs font-bold text-slate-800 focus:border-teal-500 outline-none"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-extrabold text-teal-800 uppercase tracking-widest mb-2">Conducting Date</label>
                          <input
                            type="date"
                            value={examDate}
                            onChange={e => setExamDate(e.target.value)}
                            className="w-full px-4 py-3 bg-white border border-teal-200 rounded-xl text-xs font-bold text-slate-800 focus:border-teal-500 outline-none"
                            required
                          />
                        </div>
                      </div>
                    )}

                    {assessmentType === 'monthly' && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-indigo-50/30 p-5 rounded-2xl border border-indigo-100">
                        <div>
                          <label className="block text-[10px] font-extrabold text-indigo-800 uppercase tracking-widest mb-2">Select Month</label>
                          <input
                            type="month"
                            value={selectedMonth}
                            onChange={e => {
                              setSelectedMonth(e.target.value);
                            }}
                            className="w-full px-4 py-3 bg-white border border-indigo-200 rounded-xl text-xs font-bold text-slate-800 focus:border-indigo-500 outline-none"
                            required
                          />
                        </div>
                        <div className="flex flex-col justify-center">
                          <span className="text-[11px] font-extrabold text-indigo-850 uppercase tracking-wide">Last Thursday Auto-Scheduled Date:</span>
                          <span className="text-sm font-black text-slate-800 mt-1 font-mono">
                            📅 {selectedMonth ? getLastThursdayOfMonth(parseInt(selectedMonth.split('-')[0], 10), parseInt(selectedMonth.split('-')[1], 10)) : 'N/A'}
                          </span>
                        </div>
                      </div>
                    )}

                    {assessmentType === 'custom' && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-6">
                        <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Exam Heading / Title</label>
                          <input
                            type="text"
                            placeholder="e.g. Surat Al-Mulk Memorization Test, Term 1 Final"
                            value={examHeading}
                            onChange={e => setExamHeading(e.target.value)}
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:border-indigo-500 focus:bg-white outline-none"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Examining Date</label>
                          <input
                            type="date"
                            value={examDate}
                            onChange={e => setExamDate(e.target.value)}
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:border-indigo-500 focus:bg-white outline-none"
                            required
                          />
                        </div>
                      </div>
                    )}

                    {/* Mode Information & Categorization Display */}
                    {assessmentType === 'weekly' && (
                      <div className="border border-teal-100 rounded-2xl p-5 bg-teal-50/10 space-y-3">
                        <h4 className="text-xs font-extrabold text-teal-800 uppercase tracking-wider flex items-center gap-2">
                          📖 Weekly Qur'anic Evaluation Categories & Maximum Marks
                        </h4>
                        <p className="text-[11px] text-slate-500 leading-relaxed font-semibold">
                          The score scoreboard below lists the five official assessment categories. Standard entry enforces maximum marks allocation limits which automatically sums up out of 100 on submittal.
                        </p>
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 pt-1">
                          <div className="bg-white p-3 rounded-xl border border-slate-150 flex flex-col items-center">
                            <span className="text-[10px] text-slate-400 font-extrabold uppercase">1. Laxniga</span>
                            <span className="text-xs font-black text-teal-700 mt-1">Max: 30 dhibcood</span>
                          </div>
                          <div className="bg-white p-3 rounded-xl border border-slate-150 flex flex-col items-center">
                            <span className="text-[10px] text-slate-400 font-extrabold uppercase">2. Imaanshaha</span>
                            <span className="text-xs font-black text-teal-700 mt-1">Max: 30 dhibcood</span>
                          </div>
                          <div className="bg-white p-3 rounded-xl border border-slate-150 flex flex-col items-center">
                            <span className="text-[10px] text-slate-400 font-extrabold uppercase">3. Xifdiga</span>
                            <span className="text-xs font-black text-teal-700 mt-1">Max: 20 dhibcood</span>
                          </div>
                          <div className="bg-white p-3 rounded-xl border border-slate-150 flex flex-col items-center">
                            <span className="text-[10px] text-slate-400 font-extrabold uppercase">4. Tajwiidka</span>
                            <span className="text-xs font-black text-teal-700 mt-1">Max: 10 dhibcood</span>
                          </div>
                          <div className="bg-white p-3 rounded-xl border border-slate-150 flex flex-col items-center">
                            <span className="text-[10px] text-slate-400 font-extrabold uppercase text-center leading-tight">5. Akhlaaq / Nadaafad</span>
                            <span className="text-xs font-black text-teal-700 mt-1">Max: 10 dhibcood</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {assessmentType === 'monthly' && (
                      <div className="border border-indigo-100 rounded-2xl p-5 bg-indigo-50/15 space-y-2">
                        <h4 className="text-xs font-extrabold text-indigo-800 uppercase tracking-wider">
                          🏆 Automated Monthly Evaluation Engine
                        </h4>
                        <p className="text-[11px] text-slate-500 leading-relaxed font-semibold">
                          Monthly assessments are calculated automatically by calculating the average of all logged weekly assessments within the selected month. If you modify any scores manually, they will be saved as custom monthly overrides.
                        </p>
                      </div>
                    )}

                    {assessmentType === 'custom' && (
                      <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200 space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-200">
                          <div>
                            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-widest">Custom Grading Subjects Checklist</h4>
                            <p className="text-[10px] text-slate-400 font-bold mt-0.5">Manage list of subjects that compose this custom exam paper.</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={newSubjectInput}
                              onChange={e => setNewSubjectInput(e.target.value)}
                              placeholder="Add Subject e.g. Tafsiir"
                              className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none"
                            />
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                if (newSubjectInput.trim()) {
                                  if (!examSubjects.includes(newSubjectInput.trim())) {
                                    setExamSubjects([...examSubjects, newSubjectInput.trim()]);
                                  }
                                  setNewSubjectInput('');
                                }
                              }}
                              className="px-3 py-1.5 bg-slate-800 hover:bg-black text-white text-xs font-bold rounded-xl transition-all border-0 outline-none uppercase tracking-widest cursor-pointer"
                            >
                              Add
                            </button>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          {examSubjects.map(sub => (
                            <span key={sub} className="inline-flex items-center gap-1.5 bg-white text-slate-700 pl-3 pr-2 py-1.5 rounded-xl border border-slate-200 text-xs font-bold">
                              {sub}
                              <button
                                type="button"
                                onClick={() => setExamSubjects(examSubjects.filter(s => s !== sub))}
                                className="w-4 h-4 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-full flex items-center justify-center font-bold text-[10px] cursor-pointer border-0 outline-none"
                              >
                                &times;
                              </button>
                            </span>
                          ))}
                          {examSubjects.length === 0 && (
                            <p className="text-xs text-rose-500 font-black italic">No subjects added. Add custom subjects above to proceed.</p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Students Marks Scoreboard Table */}
                    <div>
                      <h4 className="text-xs font-extrabold text-slate-600 uppercase tracking-widest mb-4">
                        🎯 Students Academic Marks Scoreboard
                      </h4>
                      
                      {!examTeacherId ? (
                        <div className="text-center py-12 bg-slate-50 border border-slate-150 rounded-2xl">
                          <p className="text-xs text-slate-450 font-bold italic">Please select a class instructor above to display student roster list.</p>
                        </div>
                      ) : (() => {
                        const selectedTeacherObj = database.teachers.find(t => t.id === examTeacherId);
                        const teacherClassSelected = selectedTeacherObj ? (selectedTeacherObj.classAssigned || selectedTeacherObj.className || '') : '';
                        const classStudents = database.students.filter(s => s.active && s.className === teacherClassSelected);

                        if (classStudents.length === 0) {
                          return (
                            <div className="text-center py-12 bg-slate-50 border border-dashed border-slate-200 rounded-2xl">
                              <p className="text-xs text-slate-500 font-extrabold">No active students found in Fasalka: "{teacherClassSelected || 'N/A'}"</p>
                              <p className="text-[10px] text-slate-400 font-bold mt-1">Assign active students to this classroom to grade assessments.</p>
                            </div>
                          );
                        }

                        return (
                          <div className="overflow-x-auto rounded-3xl border border-slate-100 shadow-sm">
                            <table className="w-full text-left border-collapse text-xs">
                              <thead>
                                <tr className="bg-slate-50 font-extrabold text-slate-500 uppercase tracking-wider border-b border-slate-150 text-[10px]">
                                  <th className="py-4 px-5">Student Full Name</th>
                                  {examSubjects.map(sub => (
                                    <th key={sub} className="py-4 px-5 text-center min-w-[95px] uppercase">
                                      {sub}
                                      {assessmentType === 'weekly' && WEEKLY_MAX_SCORES_ADMIN[sub] !== undefined && (
                                        <span className="block text-[8px] text-slate-400 font-bold tracking-normal mt-0.5 lowercase">
                                          max: {WEEKLY_MAX_SCORES_ADMIN[sub]}m
                                        </span>
                                      )}
                                    </th>
                                  ))}
                                  <th className="py-4 px-5 font-bold text-slate-500">Faallo (Comments)</th>
                                  <th className="py-4 px-5 text-right font-black text-slate-700 pr-5">Avg/Total Marks</th>
                                  <th className="py-4 px-5 text-center font-black text-slate-700 min-w-[70px]">Grade</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 font-medium text-slate-700 bg-white">
                                {classStudents.map(student => {
                                  const metrics = getAdminStudentMetrics(student.id, teacherClassSelected);
                                  const scoresObj = studentScores[student.id] || {};

                                  return (
                                    <tr key={student.id} className="hover:bg-slate-50/40">
                                      <td className="py-3 px-5 font-bold text-slate-900 border-r border-slate-100/50">
                                        {student.name}
                                        <p className="text-[9px] font-extrabold text-slate-400 mt-0.5">ID: {student.id}</p>
                                      </td>
                                      {examSubjects.map(sub => {
                                        const maxMarksVal = assessmentType === 'weekly' ? WEEKLY_MAX_SCORES_ADMIN[sub] : 100;
                                        return (
                                          <td key={sub} className="py-3 px-5 text-center border-r border-slate-100/50">
                                            <div className="flex items-center justify-center gap-1.5">
                                              <input
                                                type="number"
                                                step="any"
                                                disabled={assessmentType === 'monthly'}
                                                min={0}
                                                max={maxMarksVal}
                                                value={scoresObj[sub] !== undefined ? scoresObj[sub] : '0'}
                                                onChange={e => handleAdminScoreChange(student.id, sub, e.target.value)}
                                                className="w-16 px-1.5 py-1 text-center bg-slate-50 hover:bg-slate-100 disabled:opacity-60 focus:bg-white border border-slate-200 outline-none text-xs font-black rounded-lg text-slate-800 focus:border-teal-500"
                                              />
                                              {assessmentType !== 'monthly' && (
                                                <span className="text-[10px] font-bold text-slate-400">/{maxMarksVal}</span>
                                              )}
                                            </div>
                                          </td>
                                        );
                                      })}
                                      <td className="py-3 px-5 min-w-[180px] border-r border-slate-100/50">
                                        <input
                                          type="text"
                                          placeholder="Ku qor faallo halkan (t.s. ku fiican subaca)..."
                                          value={studentComments[student.id] || ''}
                                          onChange={e => setStudentComments(prev => ({ ...prev, [student.id]: e.target.value }))}
                                          className="w-full px-3 py-1.5 border rounded-lg text-xs bg-slate-50 border-slate-200 focus:border-indigo-500 focus:bg-white text-slate-800 font-medium"
                                        />
                                      </td>
                                      <td className="py-3 px-5 text-right font-black text-slate-900 border-r border-slate-100/50 pr-5">
                                        {metrics.average}%
                                      </td>
                                      <td className="py-3 px-5 text-center">
                                        <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-black border ${
                                          metrics.grade === 'A' ? 'bg-emerald-50 text-emerald-850 border-emerald-100' :
                                          metrics.grade === 'B' ? 'bg-teal-50 text-teal-850 border-teal-100' :
                                          metrics.grade === 'C' ? 'bg-indigo-50 text-indigo-850 border-indigo-100' :
                                          metrics.grade === 'D' ? 'bg-amber-50 text-amber-800 border-amber-100' :
                                          'bg-rose-50 text-rose-800 border-rose-100'
                                        }`}>
                                          {metrics.grade}
                                        </span>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        );
                      })()}
                    </div>

                    {/* Form submissions footer action buttons */}
                    <div className="flex flex-col sm:flex-row items-center sm:justify-end gap-3 border-t border-slate-150 pt-6">
                      <button
                        type="button"
                        onClick={() => {
                          setIsCreatingExam(false);
                          setAssessmentType('weekly');
                        }}
                        className="w-full sm:w-auto py-3 px-6 bg-slate-150 hover:bg-slate-200 text-slate-700 text-xs font-extrabold uppercase tracking-wider rounded-xl transition-all cursor-pointer border-0 outline-none"
                      >
                        Abort Assessment Logbook
                      </button>
                      <button
                        type="submit"
                        disabled={!examTeacherId || examSubjects.length === 0}
                        className="w-full sm:w-auto py-3 px-8 bg-teal-600 hover:bg-teal-700 disabled:opacity-40 text-white text-xs font-extrabold uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-teal-600/15 border-0 outline-none"
                      >
                        <Save className="w-4 h-4" />
                        Compile & Synchronize Results
                      </button>
                    </div>
                  </div>
                </form>
              ) : isCompilingMonthly ? (
                /* Compile Monthly Assessment view */
                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-6">
                  <div className="flex items-center justify-between border-b border-slate-150 pb-4">
                    <h3 className="font-bold text-slate-800 text-sm flex items-center gap-4">
                      <Sparkles className="w-5 h-5 text-indigo-600" />
                      Sami Qiimaynta Bisha (Generate Monthly Assessment from Chosen Weeks)
                    </h3>
                    <button
                      type="button"
                      onClick={() => {
                        setIsCompilingMonthly(false);
                        setSelectedWeeklyExamIds([]);
                      }}
                      className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold rounded-xl transition-all cursor-pointer border-0 outline-none"
                    >
                      Baji (Cancel)
                    </button>
                  </div>

                  {/* Instructor Selector */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-indigo-50/30 p-5 rounded-2xl border border-indigo-150/50">
                    <div>
                      <label className="block text-[10px] font-extrabold text-indigo-800 uppercase tracking-widest mb-2 pl-0.5">Select Class Instructor</label>
                      <select
                        value={monthlyTeacherId}
                        onChange={e => {
                          setMonthlyTeacherId(e.target.value);
                          setSelectedWeeklyExamIds([]); // Reset selected weeks when teacher changes
                        }}
                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                      >
                        <option value="">-- Choose Instructor --</option>
                        {database.teachers.map(t => (
                          <option key={t.id} value={t.id}>
                            {t.name} ({t.classAssigned || t.className || 'No Class'})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-extrabold text-indigo-800 uppercase tracking-widest mb-2 pl-0.5">Select Assessment Month</label>
                      <input
                        type="month"
                        value={monthlyMonth}
                        onChange={e => {
                          setMonthlyMonth(e.target.value);
                          setSelectedWeeklyExamIds([]);
                        }}
                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                  </div>

                  {/* List of Weeks */}
                  <div>
                    <h4 className="font-extrabold text-slate-700 text-xs uppercase tracking-wider mb-3">Choose the Weeks to Compile:</h4>
                    {(() => {
                      const teacherObj = database.teachers.find(t => t.id === monthlyTeacherId);
                      const className = teacherObj ? (teacherObj.classAssigned || teacherObj.className || '') : '';
                      const weeklyExams = (database.exams || []).filter(ex => 
                        ex.teacherId === teacherObj.id && 
                        ex.assessmentType === 'weekly' &&
                        ex.month === monthlyMonth
                      );

                      if (!monthlyTeacherId) {
                        return (
                          <div className="p-8 text-center bg-slate-50 border border-dashed border-slate-200 rounded-2xl">
                            <p className="text-xs text-slate-400 font-bold">Fadlan marka hore dooro macallinka bixiyay qiimaynta. (Please choose an instructor first.)</p>
                          </div>
                        );
                      }

                      if (weeklyExams.length === 0) {
                        return (
                          <div className="p-8 text-center bg-slate-50 border border-dashed border-slate-200 rounded-2xl">
                            <BookOpen className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                            <p className="text-xs text-slate-500 font-bold">Lama helin wax qiimayn toddobaadle ah bishaan ee fasalka barahan. (No weekly assessments found for this month of this teacher's class.)</p>
                          </div>
                        );
                      }

                      return (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                          {weeklyExams.map(ex => {
                            const isChecked = selectedWeeklyExamIds.includes(ex.id);
                            return (
                              <label
                                key={ex.id}
                                className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-all ${
                                  isChecked 
                                    ? 'bg-indigo-50/50 border-indigo-200 ring-2 ring-indigo-500/10' 
                                    : 'bg-white border-slate-200 hover:bg-slate-50'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={e => {
                                    if (e.target.checked) {
                                      setSelectedWeeklyExamIds([...selectedWeeklyExamIds, ex.id]);
                                    } else {
                                      setSelectedWeeklyExamIds(selectedWeeklyExamIds.filter(id => id !== ex.id));
                                    }
                                  }}
                                  className="mt-0.5 h-4 w-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-305 accent-indigo-650"
                                />
                                <div className="text-left">
                                  <p className="font-extrabold text-slate-800 text-xs">{ex.heading}</p>
                                  <p className="text-[10px] font-bold text-slate-400 mt-1">Date: {ex.date}</p>
                                  <p className="text-[10px] font-bold text-indigo-600 mt-0.5">Students Checked: {ex.scores.length}</p>
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => {
                        setIsCompilingMonthly(false);
                        setSelectedWeeklyExamIds([]);
                      }}
                      className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold rounded-xl transition-all cursor-pointer border-0 outline-none"
                    >
                      Baji (Cancel)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCompileMonthlyAssessment('admin')}
                      disabled={selectedWeeklyExamIds.length === 0}
                      className="py-2.5 px-5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-md shadow-indigo-600/10 border-0 outline-none"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      Kici Qiimaynta Bisha (Compile & Save)
                    </button>
                  </div>
                </div>
              ) : editingExam ? (
                /* Edit weekly assessment form */
                <form onSubmit={handleUpdateAdminExam} className="space-y-6">
                  <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-6">
                    <div className="flex items-center justify-between border-b border-slate-150 pb-4">
                      <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                        <Plus className="w-4 h-4 text-indigo-600" />
                        Wax ka beddel Qiimaynta (Edit Assessment Sheet)
                      </h3>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingExam(null);
                          setStudentScores({});
                          setStudentComments({});
                        }}
                        className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold rounded-xl transition-all cursor-pointer border-0 outline-none"
                      >
                        Baji (Cancel)
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 p-5 rounded-2xl border border-slate-205/50">
                      <div>
                        <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-widest mb-1.5 pl-0.5">Assessment Heading / Title *</label>
                        <input
                          type="text"
                          required
                          value={editingExam.heading}
                          onChange={e => setEditingExam({ ...editingExam, heading: e.target.value })}
                          className="w-full px-4 py-2.5 bg-white border border-slate-205 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-widest mb-1.5 pl-0.5">Evaluation Recorded Date</label>
                        <input
                          type="date"
                          required
                          value={editingExam.date}
                          onChange={e => setEditingExam({ ...editingExam, date: e.target.value })}
                          className="w-full px-4 py-2.5 bg-white border border-slate-205 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-indigo-500"
                        />
                      </div>
                    </div>

                    {/* Student Scores Input Table */}
                    <div className="border border-slate-150 rounded-2xl overflow-hidden shadow-sm">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="bg-slate-100 font-extrabold text-slate-500 uppercase tracking-widest border-b border-slate-200">
                              <th className="py-3 px-5">Student Full Name</th>
                              {editingExam.subjects.map(sub => {
                                const isWk = editingExam.assessmentType === 'weekly';
                                const maxVal = isWk ? WEEKLY_MAX_SCORES_ADMIN[sub] : undefined;
                                return (
                                  <th key={sub} className="py-3 px-5 min-w-[100px]">
                                    {sub}
                                    {maxVal !== undefined && (
                                      <span className="block text-[9px] font-bold text-slate-400 mt-0.5 normal-case">Max: {maxVal}</span>
                                    )}
                                  </th>
                                );
                              })}
                              <th className="py-3 px-5 font-bold text-slate-600">Somali Comments (Talooyin)</th>
                              <th className="py-3 px-5 font-bold text-teal-800 text-right">Average / Total</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 font-bold text-slate-700">
                            {editingExam.scores.map(sc => {
                              const sScoresObj = studentScores[sc.studentId] || {};
                              
                              // recalculate student metrics on the fly
                              let total = 0;
                              let count = 0;
                              editingExam.subjects.forEach(sub => {
                                total += parseFloat(sScoresObj[sub] || '0') || 0;
                                count++;
                              });
                              const avg = count > 0 ? parseFloat((total / (editingExam.assessmentType === 'weekly' ? 1 : count)).toFixed(1)) : 0;

                              return (
                                <tr key={sc.studentId} className="hover:bg-slate-50/30">
                                  <td className="py-3 px-5">
                                    <p className="font-extrabold text-slate-800">{sc.studentName}</p>
                                    <p className="text-[9px] font-bold text-slate-400 mt-0.5">ID: {sc.studentId}</p>
                                  </td>
                                  {editingExam.subjects.map(sub => {
                                    const isWk = editingExam.assessmentType === 'weekly';
                                    const maxVal = isWk ? (WEEKLY_MAX_SCORES_ADMIN[sub] || 100) : 100;
                                    return (
                                      <td key={sub} className="py-2 px-5">
                                        <input
                                          type="number"
                                          step="any"
                                          required
                                          min={0}
                                          max={maxVal}
                                          value={sScoresObj[sub] || '0'}
                                          onChange={e => {
                                            let v = e.target.value;
                                            const num = parseFloat(v);
                                            if (!isNaN(num) && num > maxVal) {
                                              v = String(maxVal);
                                            }
                                            setStudentScores(prev => ({
                                              ...prev,
                                              [sc.studentId]: {
                                                ...(prev[sc.studentId] || {}),
                                                [sub]: v
                                              }
                                            }));
                                          }}
                                          disabled={editingExam.assessmentType === 'monthly'}
                                          className="w-20 px-2 py-1.5 bg-slate-50 border border-slate-205 rounded-lg text-center outline-none focus:bg-white"
                                        />
                                      </td>
                                    );
                                  })}
                                  <td className="py-2 px-5">
                                    <textarea
                                      rows={1}
                                      value={studentComments[sc.studentId] || ''}
                                      onChange={e => {
                                        const v = e.target.value;
                                        setStudentComments(prev => ({
                                          ...prev,
                                          [sc.studentId]: v
                                        }));
                                      }}
                                      className="w-full min-w-[200px] px-3 py-1.5 bg-slate-50 border border-slate-205 rounded-xl outline-none focus:bg-white text-xs"
                                      placeholder="Sii talo ama faallo..."
                                    />
                                  </td>
                                  <td className="py-3 px-5 text-teal-700 font-extrabold font-mono text-sm text-right">
                                    {avg}%
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingExam(null);
                          setStudentScores({});
                          setStudentComments({});
                        }}
                        className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold rounded-xl transition-all cursor-pointer border-0 outline-none"
                      >
                        Baji (Cancel)
                      </button>
                      <button
                        type="submit"
                        className="py-3 px-6 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-lg shadow-indigo-600/10 border-0 outline-none"
                      >
                        Nadiifi / Kaydi Isbeddelada (Save Edits)
                      </button>
                    </div>
                  </div>
                </form>
              ) : (
                <>
                  {/* Header section with Stats widgets */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6" id="exams-summary-widgets">
                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center shrink-0">
                    <FileCheck2 className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Active Exams</p>
                    <p className="text-2xl font-black text-slate-800 mt-1">{totalExamsUploaded} records</p>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                    <Users className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Students Graded Marks</p>
                    <p className="text-2xl font-black text-slate-800 mt-1">{totalGradedCount} entries</p>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Academic General Average</p>
                    <p className="text-2xl font-black text-amber-600 mt-1">{computedTotalScoreAverage}%</p>
                  </div>
                </div>
              </div>

              {/* Master Search & Filter Box */}
              <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-6" id="exams-filter-panel">
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                  {/* Class Filter */}
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-widest mb-1.5 pl-0.5">Dooro Fasalka</label>
                    <select
                      value={examFilterClass}
                      onChange={e => {
                        setExamFilterClass(e.target.value);
                        setExamStudentFilter('All');
                      }}
                      className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none cursor-pointer focus:bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    >
                      <option value="All">🌌 Dhamaan Fasallada</option>
                      {uniqueClasses.map(cls => (
                        <option key={cls} value={cls}>{cls}</option>
                      ))}
                    </select>
                  </div>

                  {/* Teacher Filter */}
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-widest mb-1.5 pl-0.5">Dooro Macalinka</label>
                    <select
                      value={examFilterTeacher}
                      onChange={e => setExamFilterTeacher(e.target.value)}
                      className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none cursor-pointer focus:bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    >
                      <option value="All">👨‍🏫 Dhamaan Macallimiinta</option>
                      {database.teachers.map(t => (
                        <option key={t.id} value={t.id}>{t.name} (ID: {t.id})</option>
                      ))}
                    </select>
                  </div>

                  {/* Student Filter */}
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-widest mb-1.5 pl-0.5">Dooro Ardayga</label>
                    <select
                      value={examStudentFilter}
                      onChange={e => setExamStudentFilter(e.target.value)}
                      className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none cursor-pointer focus:bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    >
                      <option value="All">👨‍🎓 Dhamaan Ardayda</option>
                      {database.students
                        .filter(s => examFilterClass === 'All' ? true : s.className === examFilterClass)
                        .map(s => (
                          <option key={s.id} value={s.id}>{s.name} (ID: {s.id})</option>
                        ))}
                    </select>
                  </div>

                  {/* Start Date */}
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-widest mb-1.5 pl-0.5">Taariikhda Bilowga</label>
                    <input
                      type="date"
                      value={examStartDate}
                      onChange={e => setExamStartDate(e.target.value)}
                      className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>

                  {/* End Date */}
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-widest mb-1.5 pl-0.5">Taariikhda Dhamaadka</label>
                    <input
                      type="date"
                      value={examEndDate}
                      onChange={e => setExamEndDate(e.target.value)}
                      className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                {/* Filter Clear Trigger */}
                {(examFilterClass !== 'All' || examFilterTeacher !== 'All' || examStudentFilter !== 'All' || examStartDate || examEndDate) && (
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        setExamFilterClass('All');
                        setExamFilterTeacher('All');
                        setExamStudentFilter('All');
                        setExamStartDate('');
                        setExamEndDate('');
                      }}
                      className="text-xs font-bold text-teal-600 hover:text-teal-800 flex items-center gap-1 cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Reset Active Filters
                    </button>
                  </div>
                )}
              </div>

              {/* Match list grids */}
              <div className="space-y-4" id="exams-admin-record-cards">
                {matchedExams.length === 0 ? (
                  <div className="bg-white p-12 text-center rounded-3xl border border-dashed border-slate-200" id="no-matched-exams">
                    <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                    <h3 className="text-slate-800 font-bold text-sm">No uploaded exams record match criteria</h3>
                    <p className="text-slate-400 text-xs mt-1">Change timeframe range constraints or filter selections to inspect records.</p>
                  </div>
                ) : (
                  matchedExams.map(ex => {
                    const exAvg = parseFloat((ex.scores.reduce((sum, s) => sum + s.averageScore, 0) / Math.max(ex.scores.length, 1)).toFixed(1));
                    const isExpanded = expandedAdminExamId === ex.id;
                    const examiningTeacher = database.teachers.find(t => t.id === ex.teacherId)?.name || ex.teacherName || 'Assigned Instructor';

                    return (
                      <div key={ex.id} className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden transition-all duration-300" id={`admin-exam-card-${ex.id}`}>
                        <div className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-[10px] font-extrabold text-indigo-700 bg-indigo-50 border border-indigo-150 px-2 py-0.5 rounded-md uppercase">
                                {ex.className}
                              </span>
                              <span className="text-[10px] font-extrabold text-teal-700 bg-teal-50 border border-teal-150 px-2 py-0.5 rounded-md uppercase">
                                Grade Sheet ID: {ex.id}
                              </span>
                              <span className="text-xs text-slate-400 font-semibold">{ex.date}</span>
                            </div>
                            <h4 className="font-extrabold text-slate-800 text-base mt-2">{ex.heading}</h4>
                            <p className="text-xs text-slate-500 font-semibold mt-1">
                              Exam uploaded by: <span className="font-bold text-slate-800">{examiningTeacher}</span> (ID: {ex.teacherId})
                            </p>
                          </div>

                          <div className="flex items-center gap-6">
                            <div className="text-right">
                              <p className="text-[10px] font-bold text-slate-400 uppercase">Class Average</p>
                              <p className="text-xl font-black text-teal-600 mt-1">{exAvg}%</p>
                            </div>
                            <div className="text-right">
                              <p className="text-[10px] font-bold text-slate-400 uppercase">Students Checked</p>
                              <p className="text-xl font-black text-slate-800 mt-1">{ex.scores.length}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              {/* Open detail list ledger */}
                              <button
                                type="button"
                                onClick={() => setExpandedAdminExamId(isExpanded ? null : ex.id)}
                                className="p-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-slate-600 transition-colors cursor-pointer"
                                title="Expand Marks Details"
                              >
                                {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                              </button>
                              {/* Open Print & PDF Download Preview Modal */}
                              <button
                                type="button"
                                onClick={() => setShowPrintExamModal(ex)}
                                className="p-2.5 bg-slate-50 hover:bg-teal-100 hover:text-teal-700 border border-slate-200 rounded-xl text-slate-600 transition-all cursor-pointer flex items-center gap-1.5"
                                title="Print & Download PDF Report Card"
                              >
                                <Printer className="w-4 h-4" />
                              </button>
                              {/* Edit Assessment Sheet button */}
                              {ex.assessmentType === 'weekly' && (
                                <button
                                  type="button"
                                  onClick={() => handleStartEditExam(ex)}
                                  className="p-2.5 bg-indigo-50 hover:bg-indigo-100 border border-indigo-150 rounded-xl text-indigo-600 transition-colors cursor-pointer"
                                  title="Wax ka beddel Qiimaynta (Edit Weekly Assessment)"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                              )}
                              {/* Delete button (satisfies absolute constraint) */}
                              <button
                                type="button"
                                onClick={() => handleDeleteAdminExam(ex.id)}
                                className="p-2.5 bg-rose-50 hover:bg-rose-100 border border-rose-100 rounded-xl text-rose-600 transition-colors cursor-pointer"
                                title="Delete Graded Sheet"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Expandable student ledger list */}
                        {isExpanded && (
                          <div className="border-t border-slate-100 bg-slate-50/50 p-6 overflow-hidden">
                            <h5 className="font-extrabold text-slate-600 text-[10px] uppercase tracking-widest mb-4">Detailed Student Marks Ledger</h5>
                            <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
                              <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse text-xs min-w-[800px]">
                                  <thead>
                                    <tr className="bg-slate-100 font-extrabold text-slate-500 uppercase tracking-widest border-b border-slate-200">
                                      <th className="py-3 px-5">Student Full Name</th>
                                      {ex.subjects.map(sub => (
                                        <th key={sub} className="py-3 px-5">{sub}</th>
                                      ))}
                                      <th className="py-3 px-5 text-indigo-750">Fikir / Faallo</th>
                                      <th className="py-3 px-5 text-teal-800 text-right font-black">Average Marks</th>
                                      <th className="py-3 px-5 text-indigo-800 text-center font-black">Calculated Grade</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                                    {ex.scores.map(sc => (
                                      <tr key={sc.studentId} className="hover:bg-slate-50/30">
                                        <td className="py-3 px-5 font-bold text-slate-900">
                                          {sc.studentName}
                                          <p className="text-[9px] font-bold text-slate-400 mt-0.5">ID: {sc.studentId}</p>
                                        </td>
                                        {ex.subjects.map(sub => (
                                          <td key={sub} className="py-3 px-5 font-bold">{sc.scores[sub] || '0'}%</td>
                                        ))}
                                        <td className="py-3 px-5 text-indigo-950 italic min-w-[200px] max-w-sm">
                                          <div className="whitespace-normal break-words font-semibold text-xs leading-relaxed" title={sc.comment || 'No comment'}>
                                            {sc.comment || <span className="text-slate-300 font-normal">—</span>}
                                          </div>
                                        </td>
                                        <td className="py-3 px-5 text-right font-black text-slate-900">{sc.averageScore}%</td>
                                        <td className="py-3 px-5 text-center">
                                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black ${
                                            sc.grade === 'A' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                                            sc.grade === 'B' ? 'bg-teal-50 text-teal-700 border border-teal-100' :
                                            sc.grade === 'C' ? 'bg-indigo-50 text-indigo-700 border border-indigo-100' :
                                            sc.grade === 'D' ? 'bg-amber-50 text-amber-700 border border-amber-100' :
                                            'bg-rose-50 text-rose-700 border border-rose-100'
                                          }`}>
                                            {sc.grade}
                                          </span>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* PRINT FRIENDLY CANVAS FOR INDIVIDUAL EXAM */}
                        <div className="hidden">
                          <div id={`printable-exam-single-${ex.id}`} className="p-8 max-w-4xl mx-auto bg-white text-slate-800 font-sans" style={{ fontFamily: "sans-serif" }}>
                            <div className="text-center border-b-2 border-dashed border-teal-600 pb-6 mb-6">
                              <h1 className="text-xl font-bold tracking-tight text-teal-800">DUGSIGA SUBUC ISLAMIC CENTER</h1>
                              <p className="text-[11px] uppercase tracking-widest text-slate-500 font-semibold mt-1">Graded Student Exam Performance Report card</p>
                            </div>

                            <div className="grid grid-cols-2 gap-4 text-xs mb-6 bg-slate-50 p-4 rounded-xl border border-slate-200">
                              <div>
                                <p className="font-semibold text-slate-500">EXAM TITLE / HEAD:</p>
                                <p className="font-extrabold text-sm text-slate-800 mt-0.5">{ex.heading}</p>
                                <p className="font-semibold text-slate-500 mt-2">CLASS ASSIGNED:</p>
                                <p className="font-black text-slate-700 mt-0.5">{ex.className}</p>
                              </div>
                              <div className="text-right">
                                <p className="font-semibold text-slate-500">EXAMINING DATE:</p>
                                <p className="font-bold text-slate-800 mt-0.5">{ex.date}</p>
                                <p className="font-semibold text-slate-500 mt-2">EVALUATING SCHOLAR:</p>
                                <p className="font-bold text-slate-700 mt-0.5">{examiningTeacher} (ID: {ex.teacherId})</p>
                              </div>
                            </div>

                            <table className="w-full text-left border-collapse text-xs mb-8">
                              <thead>
                                <tr className="bg-slate-100 font-extrabold text-slate-700 uppercase border-b border-slate-350 text-[10px]">
                                  <th className="py-2 px-3">Student Name</th>
                                  {ex.subjects.map(s => (
                                    <th key={s} className="py-2 px-3">{s}</th>
                                  ))}
                                  <th className="py-2 px-3 text-right">Average</th>
                                  <th className="py-2 px-3 text-center">Grade</th>
                                  <th className="py-2 px-3">Ra'yiga Macallinka / Feedback</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-200">
                                {ex.scores.map(sc => (
                                  <tr key={sc.studentId}>
                                    <td className="py-2 px-3 font-bold text-slate-900">{sc.studentName} ({sc.studentId})</td>
                                    {ex.subjects.map(s => (
                                      <td key={s} className="py-2 px-3 font-semibold">{sc.scores[s] || 0}%</td>
                                    ))}
                                    <td className="py-2 px-3 text-right font-black">{sc.averageScore}%</td>
                                    <td className="py-2 px-3 text-center">
                                      <span className="px-2 py-0.5 bg-slate-100 border border-slate-300 rounded font-black text-[11px]">{sc.grade}</span>
                                    </td>
                                    <td className="py-2 px-3 text-indigo-950 italic text-[11px] max-w-[280px] break-words whitespace-normal font-semibold">
                                      {sc.comment || <span className="text-slate-350 font-normal">—</span>}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>

                            <div className="grid grid-cols-2 gap-8 pt-12 border-t border-slate-200 text-center text-xs">
                              <div>
                                <div className="border-b border-slate-400 h-8"></div>
                                <p className="text-slate-500 mt-2">Assigned Teacher Signature & Date</p>
                              </div>
                              <div>
                                <div className="border-b border-slate-400 h-8"></div>
                                <p className="text-slate-500 mt-2">Principal Audit Seal</p>
                              </div>
                            </div>
                          </div>
                        </div>

                      </div>
                    );
                  })
                )}
              </div>

              {/* TIMEFRAME PRINT PREVIEW SHEET CANVAS (Satisfies: range of time print/download constraint) */}
              <div className="hidden">
                <div id="printable-exams-timeframe-report" className="p-8 bg-white text-slate-800 font-sans" style={{ fontFamily: "sans-serif" }}>
                  <div className="text-center border-b-2 border-dashed border-indigo-600 pb-6 mb-6">
                    <h1 className="text-2xl font-bold tracking-tight text-indigo-900">DUGSIGA SUBUC ISLAMIC CENTER</h1>
                    <h2 className="text-sm font-extrabold text-indigo-700 tracking-wider mt-1 uppercase">WARBIXINTA QIIMAYNTA WAALIDKA - REER SUBUC</h2>
                    <p className="text-xs font-semibold text-slate-400 mt-1">
                      Muddada Warbixinta: {examStartDate || 'Bilowgii'} &nbsp;➔&nbsp; {examEndDate || 'Hadda'}
                    </p>
                  </div>

                  {examStudentFilter !== 'All' ? (() => {
                    const studentObj = database.students.find(s => s.id === examStudentFilter);
                    if (!studentObj) return <p className="text-xs text-rose-500 font-bold">Ardayga lama helin.</p>;

                    return (
                      <div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs mb-6 bg-slate-50 p-4 border border-slate-200 rounded-xl">
                          <div>
                            <p className="font-semibold text-slate-500 uppercase">MAGACA ARDAYGA:</p>
                            <p className="font-extrabold text-slate-800 mt-0.5">{studentObj.name}</p>
                          </div>
                          <div>
                            <p className="font-semibold text-slate-500 uppercase">ID ARDAYGA:</p>
                            <p className="font-extrabold text-slate-800 mt-0.5">{studentObj.id}</p>
                          </div>
                          <div>
                            <p className="font-semibold text-slate-500 uppercase">FASALKA HOOSE:</p>
                            <p className="font-extrabold text-slate-800 mt-0.5">{studentObj.className || 'N/A'}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-slate-500 font-black">CELCELISKA GUUD:</p>
                            {(() => {
                              const rangeScores = matchedExams.map(ex => ex.scores.find(sc => sc.studentId === studentObj.id)).filter(Boolean);
                              if (rangeScores.length > 0) {
                                const avg = parseFloat((rangeScores.reduce((sum, s) => sum + s!!.averageScore, 0) / rangeScores.length).toFixed(1));
                                return <p className="font-black text-indigo-700 text-sm mt-0.5">{avg}%</p>;
                              }
                              return <p className="font-bold text-slate-400 mt-0.5">—</p>;
                            })()}
                          </div>
                        </div>

                        <h3 className="font-extrabold text-indigo-900 text-xs uppercase tracking-wider mb-3">Xogta Toddobaadyada la Qiimeeyay</h3>
                        <table className="w-full text-left border-collapse text-xs mb-8">
                          <thead>
                            <tr className="bg-slate-100 font-extrabold text-slate-700 border-b border-slate-350 uppercase text-[10px]">
                              <th className="py-2 px-3">Taariikhda</th>
                              <th className="py-2 px-3">Cinwaanka Qiimaynta</th>
                              <th className="py-2 px-3">Natiijada Maadooyinka</th>
                              <th className="py-2 px-3 text-right">Celceliska</th>
                              <th className="py-2 px-3 text-center">Darajada</th>
                              <th className="py-2 px-3">Talo & Faallada Macallinka</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-150 font-medium">
                            {matchedExams.map(ex => {
                              const sc = ex.scores.find(scoreSc => scoreSc.studentId === studentObj.id);
                              if (!sc) return null;
                              return (
                                <tr key={ex.id} className="hover:bg-slate-50/50">
                                  <td className="py-2.5 px-3 font-semibold text-slate-500 text-[11px] shrink-0">{ex.date}</td>
                                  <td className="py-2.5 px-3 font-bold text-slate-850">
                                    <p>{ex.heading}</p>
                                    <p className="text-[10px] text-slate-400">Week: {ex.weekNumber || 'N/A'}</p>
                                  </td>
                                  <td className="py-2.5 px-3 text-slate-600">
                                    <div className="flex flex-wrap gap-x-3 gap-y-1 max-w-[280px]">
                                      {Object.entries(sc.scores).map(([sub, val]) => (
                                        <span key={sub} className="text-[10px] bg-slate-50 border border-slate-150 px-1.5 py-0.5 rounded font-black text-slate-700 shrink-0">
                                          {sub}: <strong className="text-slate-900">{val}%</strong>
                                        </span>
                                      ))}
                                    </div>
                                  </td>
                                  <td className="py-2.5 px-3 text-right font-black text-indigo-900">{sc.averageScore}%</td>
                                  <td className="py-2.5 px-3 text-center">
                                    <span className="px-2 py-0.5 bg-indigo-50 border border-indigo-150 rounded text-[10px] font-black text-indigo-850">
                                      {sc.grade}
                                    </span>
                                  </td>
                                  <td className="py-2.5 px-3 text-indigo-950 italic text-[11px] max-w-[200px] break-words">
                                    {sc.comment || <span className="text-slate-350 font-normal">—</span>}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    );
                  })() : (
                    <div>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-xs mb-6 bg-slate-50 p-4 border border-slate-200 rounded-xl">
                        <div>
                          <p className="font-semibold text-slate-500 uppercase">FASALKA DHAMAAN:</p>
                          <p className="font-extrabold text-slate-800 mt-0.5">{examFilterClass === 'All' ? 'Qolalka oo dhan' : examFilterClass}</p>
                        </div>
                        <div>
                          <p className="font-semibold text-slate-500 uppercase">MACALLINKA DUWEYNAYAA:</p>
                          <p className="font-extrabold text-slate-800 mt-0.5">{examFilterTeacher === 'All' ? 'Dhamaan Macallimiinta' : (database.teachers.find(t => t.id === examFilterTeacher)?.name || examFilterTeacher)}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-slate-500 uppercase font-black">CELCELISKA GUUD EE FASALKA:</p>
                          <p className="font-black text-indigo-700 text-sm mt-0.5">{computedTotalScoreAverage}%</p>
                        </div>
                      </div>

                      <h3 className="font-extrabold text-indigo-900 text-xs uppercase tracking-wider mb-3">LIISKA QIIMAYNTA GUUD EE FASALKA (CONSOLIDATED ATTENDANCE & ACADEMICS)</h3>
                      <table className="w-full text-left border-collapse text-xs mb-8">
                        <thead>
                          <tr className="bg-slate-100 font-extrabold text-slate-700 border-b border-slate-350 uppercase text-[10px]">
                            <th className="py-2 px-3">ID</th>
                            <th className="py-2 px-3">Magaca Ardayga</th>
                            <th className="py-2 px-3">Fasalka</th>
                            <th className="py-2 px-3 text-center">Kulamada Qiimaynta</th>
                            <th className="py-2 px-3 text-right">Celcelis dhibco</th>
                            <th className="py-2 px-3">Faallooyinkii u Dambeeyay (Recent Comments)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-150 font-semibold text-slate-700">
                          {database.students
                            .filter(s => {
                              const matchC = examFilterClass === 'All' ? true : s.className === examFilterClass;
                              const matchT = examFilterTeacher === 'All' ? true : s.teacherId === examFilterTeacher;
                              return s.active && matchC && matchT;
                            })
                            .map(s => {
                              let rangeTotal = 0;
                              let rangeCount = 0;
                              const commentsList: string[] = [];

                              matchedExams.forEach(ex => {
                                const sc = ex.scores.find(scoreSc => scoreSc.studentId === s.id);
                                if (sc) {
                                  rangeTotal += sc.averageScore;
                                  rangeCount++;
                                  if (sc.comment) {
                                    commentsList.push(`Wiigga ${ex.weekNumber || ''}: ${sc.comment}`);
                                  }
                                }
                              });

                              if (rangeCount === 0) return null;

                              const finalAvg = (rangeTotal / rangeCount).toFixed(1);

                              return (
                                <tr key={s.id} className="hover:bg-slate-50/50">
                                  <td className="py-2 px-3 font-semibold text-slate-400 text-[10px]">{s.id}</td>
                                  <td className="py-2 px-3 font-bold text-slate-900">{s.name}</td>
                                  <td className="py-2 px-3 text-slate-600">{s.className}</td>
                                  <td className="py-2 px-3 text-center font-bold text-slate-800">{rangeCount} kulan</td>
                                  <td className="py-2 px-3 text-right font-black text-indigo-900">{finalAvg}%</td>
                                  <td className="py-2 px-3 text-indigo-950 italic text-[10px] max-w-[285px] break-words">
                                    {commentsList.length > 0 ? (
                                      <div className="space-y-0.5">
                                        {commentsList.map((str, idx) => (
                                          <p key={idx} className="truncate" title={str}>• {str}</p>
                                        ))}
                                      </div>
                                    ) : (
                                      <span className="text-slate-300 font-normal">—</span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                        </tbody>
                      </table>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-8 pt-12 border-t border-slate-250 text-center text-xs">
                    <div>
                      <div className="border-b border-slate-400 h-8"></div>
                      <p className="text-slate-600 font-bold mt-2">Saxiixa Macallinka Mas'uulka ah (Teacher Signature)</p>
                    </div>
                    <div>
                      <div className="border-b border-slate-400 h-8"></div>
                      <p className="text-slate-605 font-bold mt-2">Ku-simaha Maamulka (Principal Office Approval Seal)</p>
                    </div>
                  </div>
                </div>
              </div>
              </>)}

              {showPrintExamModal && (
                <div 
                  className="fixed inset-0 bg-slate-900/60 flex items-center justify-center p-4 z-50 animate-fade-in overflow-y-auto pointer-print-none" 
                  id="exam-modal-bg"
                  onClick={(e) => {
                    if ((e.target as HTMLElement).id === 'exam-modal-bg') {
                      setShowPrintExamModal(null);
                    }
                  }}
                >
                  <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="w-full max-w-4xl bg-white rounded-3xl shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh] my-auto"
                    id="exam-print-wrapper"
                  >
                    {/* Modal actions */}
                    <div className="p-4 bg-slate-900 text-white flex items-center justify-between shrink-0 pointer-print-none flex-wrap gap-2">
                      <span className="font-bold text-xs uppercase tracking-widest text-slate-400 font-bold">
                        Foomka Qiimaynta Toddobaadka
                      </span>
                      <div className="flex gap-1.5 flex-wrap">
                        <button
                          type="button"
                          onClick={() => setShowPrintExamModal(null)}
                          className="py-1.5 px-3 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-lg cursor-pointer inline-flex items-center gap-1 transition-colors border border-slate-700 font-bold"
                        >
                          <ArrowLeft className="w-3.5 h-3.5" />
                          Gadaal
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDownloadExamPDF(showPrintExamModal)}
                          className="py-1.5 px-3 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-lg inline-flex items-center gap-1 transition-all cursor-pointer font-bold"
                        >
                          <Download className="w-3.5 h-3.5" />
                          La soo deg PDF
                        </button>
                        <button
                          type="button"
                          onClick={() => handlePrintElement('printable-exam-single-modal')}
                          className="py-1.5 px-3 bg-teal-500 hover:bg-teal-600 text-slate-900 font-bold text-xs rounded-lg inline-flex items-center gap-1 transition-all cursor-pointer font-bold"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          Daabac Report-ka
                        </button>
                      </div>
                    </div>

                    {/* printable canvas */}
                    <div className="flex-1 p-8 md:p-12 text-slate-900 bg-white overflow-y-auto" id="printable-exam-single-modal">
                      <div className="text-center border-b-2 border-dashed border-teal-600 pb-6 mb-6">
                        <h1 className="text-xl font-bold tracking-tight text-teal-800 font-lutfey">DUGSIGA SUBUC ISLAMIC CENTER</h1>
                        <p className="text-[11px] uppercase tracking-widest text-slate-500 font-semibold mt-1">Graded Student Exam Performance Report card</p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs mb-6 bg-slate-50 p-4 rounded-xl border border-slate-200">
                        <div>
                          <p className="font-semibold text-slate-500">EXAM TITLE / HEAD:</p>
                          <p className="font-extrabold text-sm text-slate-800 mt-0.5">{showPrintExamModal.heading}</p>
                          <p className="font-semibold text-slate-500 mt-2">CLASS ASSIGNED:</p>
                          <p className="font-black text-slate-700 mt-0.5">{showPrintExamModal.className}</p>
                        </div>
                        <div className="sm:text-right">
                          <p className="font-semibold text-slate-500">EXAMINING DATE:</p>
                          <p className="font-bold text-slate-800 mt-0.5">{showPrintExamModal.date}</p>
                          <p className="font-semibold text-slate-500 mt-2">EVALUATING SCHOLAR:</p>
                          <p className="font-bold text-slate-700 mt-0.5">
                            {database.teachers.find(t => t.id === showPrintExamModal.teacherId)?.name || showPrintExamModal.teacherName || 'Assigned Scholar'} (ID: {showPrintExamModal.teacherId})
                          </p>
                        </div>
                      </div>

                      <div className="overflow-x-auto border border-slate-200 rounded-xl">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="bg-slate-100 font-bold text-slate-700 border-b border-slate-200 uppercase text-[9px] tracking-wider">
                              <th className="py-2.5 px-3">Student Grid (ID)</th>
                              {showPrintExamModal.subjects.map(sub => (
                                <th key={sub} className="py-2.5 px-3">{sub}</th>
                              ))}
                              <th className="py-2.5 px-3 text-teal-700">Average %</th>
                              <th className="py-2.5 px-3 text-teal-700">Grade</th>
                              <th className="py-2.5 px-3 text-slate-600 min-w-[200px]">Class Mentor Feedback (Somali Comments)</th>
                            </tr>
                          </thead>
                          <tbody>
                            {showPrintExamModal.scores.map(sc => (
                              <tr key={sc.studentId} className="border-b border-slate-150 hover:bg-slate-50/50">
                                <td className="py-2.5 px-3 font-extrabold text-slate-800">{sc.studentName} <span className="text-[10px] font-normal text-slate-400 block font-mono">ID: {sc.studentId}</span></td>
                                {showPrintExamModal.subjects.map(sub => (
                                  <td key={sub} className="py-2.5 px-3 font-medium text-slate-600">{sc.scores[sub] !== undefined ? `${sc.scores[sub]}%` : '—'}</td>
                                ))}
                                <td className="py-2.5 px-3 font-bold text-teal-600">{sc.averageScore}%</td>
                                <td className="py-2.5 px-3">
                                  <span className={`px-1.5 py-0.5 text-[9px] font-bold rounded-md ${
                                    sc.grade === 'A' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                                    sc.grade === 'B' ? 'bg-teal-50 text-teal-700 border border-teal-100' :
                                    sc.grade === 'C' ? 'bg-indigo-50 text-indigo-700 border border-indigo-100' :
                                    sc.grade === 'D' ? 'bg-amber-50 text-amber-700 border border-amber-100' :
                                    'bg-rose-50 text-rose-700 border border-rose-100'
                                  }`}>
                                    {sc.grade}
                                  </span>
                                </td>
                                <td className="py-2.5 px-3 text-slate-500 italic max-w-sm break-words leading-relaxed whitespace-pre-wrap">{sc.comment || '—'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Sign-offs */}
                      <div className="pt-16 grid grid-cols-2 gap-16">
                        <div>
                          <span className="text-slate-500 font-semibold block text-xs">Saxiixa Macallinka mas'uulka ah</span>
                          <div className="w-full h-px bg-slate-300 mt-10" />
                        </div>
                        <div className="text-right">
                          <span className="text-slate-500 font-semibold block text-xs font-bold text-slate-700">Ansixinta Maamulaha</span>
                          <div className="w-full h-px bg-slate-300 mt-10" />
                        </div>
                      </div>
                    </div>
                  </motion.div>
                </div>
              )}

              {showExamTimeframePrintModal && (
                <div 
                  className="fixed inset-0 bg-slate-900/60 flex items-center justify-center p-4 z-50 animate-fade-in overflow-y-auto pointer-print-none" 
                  id="timeframe-modal-bg"
                  onClick={(e) => {
                    if ((e.target as HTMLElement).id === 'timeframe-modal-bg') {
                      setShowExamTimeframePrintModal(false);
                    }
                  }}
                >
                  <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="w-full max-w-4xl bg-white rounded-3xl shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh] my-auto"
                    id="timeframe-print-wrapper"
                  >
                    {/* Modal actions */}
                    <div className="p-4 bg-slate-900 text-white flex items-center justify-between shrink-0 pointer-print-none flex-wrap gap-2">
                      <span className="font-bold text-xs uppercase tracking-widest text-slate-400 font-bold">
                        Warbixinta Qiimaynta Waalidka (Timeframe Assessment)
                      </span>
                      <div className="flex gap-1.5 flex-wrap">
                        <button
                          type="button"
                          onClick={() => setShowExamTimeframePrintModal(false)}
                          className="py-1.5 px-3 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-lg cursor-pointer inline-flex items-center gap-1 transition-colors border border-slate-700 font-bold"
                        >
                          <ArrowLeft className="w-3.5 h-3.5" />
                          Gadaal
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDownloadExamTimeframePDF(matchedExams)}
                          className="py-1.5 px-3 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-lg inline-flex items-center gap-1 transition-all cursor-pointer font-bold"
                        >
                          <Download className="w-3.5 h-3.5" />
                          La soo deg PDF
                        </button>
                        <button
                          type="button"
                          onClick={() => handlePrintElement('printable-exams-timeframe-report-modal')}
                          className="py-1.5 px-3 bg-teal-500 hover:bg-teal-600 text-slate-900 font-bold text-xs rounded-lg inline-flex items-center gap-1 transition-all cursor-pointer font-bold"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          Daabac Report-ka
                        </button>
                      </div>
                    </div>

                    {/* printable canvas */}
                    <div className="flex-1 p-8 md:p-12 text-slate-900 bg-white overflow-y-auto" id="printable-exams-timeframe-report-modal">
                      <div className="text-center border-b-2 border-dashed border-indigo-600 pb-6 mb-6">
                        <h1 className="text-2xl font-bold tracking-tight text-indigo-900 font-lutfey">DUGSIGA SUBUC ISLAMIC CENTER</h1>
                        <h2 className="text-sm font-extrabold text-indigo-700 tracking-wider mt-1 uppercase">WARBIXINTA QIIMAYNTA WAALIDKA - REER SUBUC</h2>
                        <p className="text-xs font-semibold text-slate-400 mt-1">
                          Muddada Warbixinta: {examStartDate || 'Bilowgii'} &nbsp;➔&nbsp; {examEndDate || 'Hadda'}
                        </p>
                      </div>

                      {examStudentFilter !== 'All' ? (() => {
                        const studentObj = database.students.find(s => s.id === examStudentFilter);
                        if (!studentObj) return <p className="text-xs text-rose-500 font-bold">Ardayga lama helin.</p>;

                        return (
                          <div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs mb-6 bg-slate-50 p-4 border border-slate-200 rounded-xl">
                              <div>
                                <p className="font-semibold text-slate-500 uppercase">MAGACA ARDAYGA:</p>
                                <p className="font-extrabold text-slate-800 mt-0.5">{studentObj.name}</p>
                              </div>
                              <div>
                                <p className="font-semibold text-slate-500 uppercase">ID ARDAYGA:</p>
                                <p className="font-extrabold text-slate-800 mt-0.5">{studentObj.id}</p>
                              </div>
                              <div>
                                <p className="font-semibold text-slate-500 uppercase">FASALKA HOOSE:</p>
                                <p className="font-extrabold text-slate-800 mt-0.5">{studentObj.className || 'N/A'}</p>
                              </div>
                              <div className="sm:text-right">
                                <p className="font-semibold text-slate-500 font-black">CELCELISKA GUUD:</p>
                                {(() => {
                                  const rangeScores = matchedExams.map(ex => ex.scores.find(sc => sc.studentId === studentObj.id)).filter(Boolean);
                                  if (rangeScores.length > 0) {
                                    const avg = parseFloat((rangeScores.reduce((sum, s) => sum + s!!.averageScore, 0) / rangeScores.length).toFixed(1));
                                    return <p className="font-black text-indigo-700 text-sm mt-0.5">{avg}%</p>;
                                  }
                                  return <p className="font-bold text-slate-400 mt-0.5">—</p>;
                                })()}
                              </div>
                            </div>

                            <h3 className="font-extrabold text-indigo-900 text-xs uppercase tracking-wider mb-3">Xogta Toddobaadyada la Qiimeeyay</h3>
                            <div className="overflow-x-auto border border-slate-200 rounded-xl">
                              <table className="w-full text-left border-collapse text-xs mb-0">
                                <thead>
                                  <tr className="bg-slate-100 font-extrabold text-slate-705 border-b border-slate-300 uppercase text-[10px]">
                                    <th className="py-2 px-3">Taariikhda</th>
                                    <th className="py-2 px-3">Cinwaanka Qiimaynta</th>
                                    <th className="py-2 px-3">Fasalka</th>
                                    {matchedExams[0]?.subjects.map(sub => (
                                      <th key={sub} className="py-2 px-3">{sub}</th>
                                    ))}
                                    <th className="py-2 px-3 text-indigo-755">Celcelis</th>
                                    <th className="py-2 px-3 text-indigo-755">Grade</th>
                                    <th className="py-2 px-3 min-w-[150px]">Faallo / Talobixin (Somali Feedback)</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {matchedExams.map(ex => {
                                    const sc = ex.scores.find(scoreSc => scoreSc.studentId === studentObj.id);
                                    if (!sc) return null;
                                    return (
                                      <tr key={ex.id} className="border-b border-slate-250 hover:bg-slate-55/50">
                                        <td className="py-2 px-3 font-semibold text-slate-600">{ex.date}</td>
                                        <td className="py-2 px-3 font-extrabold text-slate-800">{ex.heading}</td>
                                        <td className="py-2 px-3 font-medium text-slate-650">{ex.className}</td>
                                        {ex.subjects.map(sub => (
                                          <td key={sub} className="py-2 px-3">{sc.scores[sub] !== undefined ? `${sc.scores[sub]}%` : '—'}</td>
                                        ))}
                                        <td className="py-2 px-3 font-extrabold text-indigo-705">{sc.averageScore}%</td>
                                        <td className="py-2 px-3 font-bold">
                                          <span className={`px-1.5 py-0.5 text-[9px] font-bold rounded ${
                                            sc.grade === 'A' ? 'bg-emerald-50 text-emerald-700' :
                                            sc.grade === 'B' ? 'bg-teal-50 text-teal-700' :
                                            sc.grade === 'C' ? 'bg-indigo-50 text-indigo-700' :
                                            sc.grade === 'D' ? 'bg-amber-50 text-amber-700' :
                                            'bg-rose-50 text-rose-705'
                                          }`}>
                                            {sc.grade}
                                          </span>
                                        </td>
                                        <td className="py-2 px-3 text-slate-500 italic whitespace-normal break-words leading-relaxed">{sc.comment || '—'}</td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        );
                      })() : (
                        <div>
                          <h3 className="font-extrabold text-indigo-900 text-xs uppercase tracking-wider mb-3">Xogta Labada Waqti ee la qiimeeyey</h3>
                          <div className="overflow-x-auto border border-slate-200 rounded-xl">
                            <table className="w-full text-left border-collapse text-xs mb-0">
                              <thead>
                                <tr className="bg-slate-100 font-extrabold text-slate-700 border-b border-slate-350 uppercase text-[10px]">
                                  <th className="py-2 px-3">Cinwaanka Imtixaanka</th>
                                  <th className="py-2 px-3">Fasalka</th>
                                  <th className="py-2 px-3">Taariikhda</th>
                                  <th className="py-2 px-3">Maadooyinka la imtixaanay</th>
                                  <th className="py-2 px-3">Celceliska Fasalka</th>
                                </tr>
                              </thead>
                              <tbody>
                                {matchedExams.map(ex => {
                                  const exAvg = parseFloat((ex.scores.reduce((sum, s) => sum + s.averageScore, 0) / Math.max(ex.scores.length, 1)).toFixed(1));
                                  return (
                                    <tr key={ex.id} className="border-b border-slate-200">
                                      <td className="py-2 px-3 font-black text-slate-800">{ex.heading}</td>
                                      <td className="py-2 px-3 font-semibold text-slate-s00">{ex.className}</td>
                                      <td className="py-2 px-3 font-medium text-slate-s00">{ex.date}</td>
                                      <td className="py-2 px-3 max-w-[200px] truncate" title={ex.subjects.join(', ')}>{ex.subjects.join(', ')}</td>
                                      <td className="py-2 px-3 font-black text-teal-650">{exAvg}%</td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </div>
                  </motion.div>
                </div>
              )}
            </div>
          );
        })()}

        {/* --- BILLING TAB --- */}
        {activeTab === 'billing' && (
          <div className="space-y-8 animate-fade-in" id="portal-billing">
            
            {/* Elegant Sub-tab navigation inside Billing Tab */}
            <div className="flex border-b border-slate-200 shrink-0 select-none overflow-x-auto scrollbar-none pointer-print-none" id="billing-sub-tab-nav">
              <button
                type="button"
                onClick={() => setBillingSubTab('fees')}
                className={`py-3.5 px-6 font-extrabold text-xs tracking-wider uppercase border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                  billingSubTab === 'fees'
                    ? 'border-emerald-600 text-emerald-700'
                    : 'border-transparent text-slate-400 hover:text-slate-800'
                }`}
              >
                Kharashrada Ardayda (Student Tuition Fees)
              </button>
              <button
                type="button"
                onClick={() => setBillingSubTab('custom_invoices')}
                className={`py-3.5 px-6 font-extrabold text-xs tracking-wider uppercase border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                  billingSubTab === 'custom_invoices'
                    ? 'border-emerald-600 text-emerald-700'
                    : 'border-transparent text-slate-400 hover:text-slate-800'
                }`}
              >
                Invoices-ka Gaarka ah (Parent & Business Invoices)
              </button>
            </div>

            {billingSubTab === 'fees' && (
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              
              {/* Filter inputs header */}
              <div className="lg:col-span-4 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex flex-col sm:flex-row sm:items-center gap-4 w-full md:w-auto">
                  
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 pl-0.5">Accounting Year & Month</label>
                    <div className="flex gap-2">
                      <select
                        value={selectedBillingMonth.split('-')[0] || '2026'}
                        onChange={(e) => {
                          const month = selectedBillingMonth.split('-')[1] || '05';
                          setSelectedBillingMonth(`${e.target.value}-${month}`);
                        }}
                        className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs text-slate-800 outline-none cursor-pointer focus:bg-white transition-colors"
                      >
                        {['2024', '2025', '2026', '2027', '2028', '2029', '2030', '2031', '2032'].map(yy => (
                          <option key={yy} value={yy}>{yy}</option>
                        ))}
                      </select>
                      <select
                        value={selectedBillingMonth.split('-')[1] || '05'}
                        onChange={(e) => {
                          const year = selectedBillingMonth.split('-')[0] || '2026';
                          setSelectedBillingMonth(`${year}-${e.target.value}`);
                        }}
                        className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs text-slate-800 outline-none cursor-pointer focus:bg-white transition-colors"
                      >
                        {[
                          { val: '01', label: '01 - January' },
                          { val: '02', label: '02 - February' },
                          { val: '03', label: '03 - March' },
                          { val: '04', label: '04 - April' },
                          { val: '05', label: '05 - May' },
                          { val: '06', label: '06 - June' },
                          { val: '07', label: '07 - July' },
                          { val: '08', label: '08 - August' },
                          { val: '09', label: '09 - September' },
                          { val: '10', label: '10 - October' },
                          { val: '11', label: '11 - November' },
                          { val: '12', label: '12 - December' },
                        ].map(m => (
                          <option key={m.val} value={m.val}>{m.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="flex-1 sm:w-64">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 pl-0.5">Quick Search</label>
                    <div className="relative">
                      <Search className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 w-4 h-4 pointer-events-none" />
                      <input
                        type="text"
                        placeholder="Search student billings..."
                        value={billingSearch}
                        onChange={(e) => setBillingSearch(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white outline-none"
                      />
                    </div>
                  </div>

                </div>

                <div className="flex items-center gap-6" id="billing-summary-block">
                  <div className="text-right">
                    <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Month Total Billings</p>
                    <p className="text-sm font-extrabold text-slate-900">
                      ${(activeStudents.reduce((sum, s) => sum + s.monthlyFee, 0) + getInvoiceInvoicedForMonth(selectedBillingMonth).total).toFixed(2)}
                    </p>
                  </div>
                  <div className="w-px h-10 bg-slate-200" />
                  <div className="text-right">
                    <p className="text-[10px] text-emerald-600 uppercase font-bold tracking-wider">Deposited Fees</p>
                    <p className="text-sm font-extrabold text-emerald-700">
                      ${(database.billing.filter(b => b.month === selectedBillingMonth && (b.status === 'Paid' || b.status === 'Partial')).reduce((sum, b) => sum + b.amountPaid, 0) + getInvoicePaymentsForMonth(selectedBillingMonth).total).toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Billing ledger listing */}
              <div className="lg:col-span-4 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                <div className="flex items-center justify-between mb-5 border-b border-slate-50 pb-3" id="ledger-headline">
                  <h3 className="font-extrabold text-slate-900 text-lg">Billing Statement Ledger</h3>
                  <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">{selectedBillingMonth} invoice collection cycle</span>
                </div>

                <div className="overflow-x-auto rounded-2xl border border-slate-100 scrollbar-thin">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 text-slate-400 font-bold border-b border-slate-150 uppercase tracking-wider">
                        <th className="py-3 px-4">Student ID</th>
                        <th className="py-3 px-4">Full Student Name</th>
                        <th className="py-3 px-4">Class Space</th>
                        <th className="py-3 px-4">Invoice Amount</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4">Date Paid</th>
                        <th className="py-3 px-4">Receipt Serial</th>
                        <th className="py-3 px-4 text-center">Action Item</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {activeStudents
                        .filter(s => s.name.toLowerCase().includes(billingSearch.toLowerCase()) || s.id.toLowerCase().includes(billingSearch.toLowerCase()))
                        .map(student => {
                          const record = getBillingStatusForStudent(student, selectedBillingMonth);
                          
                          return (
                            <tr key={student.id} className="hover:bg-slate-50/50 transition-colors">
                              <td className="py-3.5 px-4 font-bold text-slate-900">{student.id}</td>
                              <td className="py-3.5 px-4 animate-fadeIn">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setPayReportStudentId(student.id);
                                    setPayReportStudentSearchQuery(student.name);
                                    setReportViewMode('payments_range');
                                    setActiveTab('reports');
                                  }}
                                  className="text-left group cursor-pointer focus:outline-none block w-full"
                                  title="Click to view, print, or download student's custom payment range ledger"
                                >
                                  <div className="font-extrabold text-indigo-600 hover:text-indigo-800 hover:underline flex items-center gap-1.5 flex-wrap">
                                    <span>{student.name}</span>
                                    <span className="opacity-0 group-hover:opacity-100 transition-opacity text-[9.5px] bg-indigo-50 text-indigo-600 font-bold px-1.5 py-0.5 rounded border border-indigo-100 tracking-wider">
                                      View Range Statement ⎙
                                    </span>
                                  </div>
                                </button>
                                {record.notes && (
                                  <div className="text-[10px] text-indigo-500 font-medium italic mt-0.5 max-w-[200px] truncate" title={record.notes}>
                                    Note: {record.notes}
                                  </div>
                                )}
                              </td>
                              <td className="py-3.5 px-4 text-slate-400 font-medium">{student.className}</td>
                              <td className="py-3.5 px-4">
                                <div className="font-extrabold text-slate-800">${student.monthlyFee}</div>
                                {record.status === 'Partial' && (
                                  <div className="text-[10px] font-bold text-amber-600 mt-0.5 whitespace-nowrap">
                                    Paid: ${record.amountPaid} • Debt: ${record.debtAmount}
                                  </div>
                                )}
                              </td>
                              <td className="py-3.5 px-4">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                  record.status === 'Paid'
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                                    : record.status === 'Partial'
                                    ? 'bg-amber-50 text-amber-700 border-amber-100'
                                    : 'bg-rose-50 text-rose-700 border-rose-100'
                                }`}>
                                  {record.status}
                                </span>
                              </td>
                              <td className="py-3.5 px-4 text-slate-500 font-semibold">{record.paymentDate || '-'}</td>
                              <td className="py-3.5 px-4 font-mono text-slate-400">{record.receiptNo || '-'}</td>
                              <td className="py-3.5 px-4 text-center animate-fade-in">
                                {record.status === 'Paid' ? (
                                  <div className="flex items-center justify-center gap-1.5 text-xs">
                                    <button
                                      type="button"
                                      onClick={() => setShowReceiptModal(record)}
                                      className="px-2 py-1.5 bg-slate-50 hover:bg-slate-150 border border-slate-200 text-slate-750 font-extrabold text-[10px] tracking-wide uppercase rounded-xl inline-flex items-center gap-1 cursor-pointer transition-colors shrink-0"
                                    >
                                      <Receipt className="w-3.5 h-3.5" />
                                      Receipt
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleOpenPayModal(student)}
                                      className="px-2 py-1 text-slate-450 hover:text-indigo-600 font-extrabold text-[10px] tracking-wide uppercase rounded cursor-pointer hover:underline shrink-0"
                                    >
                                      Adjust
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteBillingRecord(record.id, student.name)}
                                      className="p-1.5 rounded-xl bg-rose-50 hover:bg-rose-600/10 text-rose-600 border border-rose-100 cursor-pointer transition-all shrink-0"
                                      title="Delete this payment receipt to mark unpaid"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                ) : record.status === 'Partial' ? (
                                  <div className="flex items-center justify-center gap-1.5 text-xs">
                                    <button
                                      type="button"
                                      onClick={() => setShowReceiptModal(record)}
                                      className="px-2 py-1.5 bg-slate-50 hover:bg-slate-150 border border-slate-200 text-slate-755 font-extrabold text-[10px] tracking-wide uppercase rounded-xl inline-flex items-center gap-1 cursor-pointer transition-colors shrink-0"
                                    >
                                      <Receipt className="w-3.5 h-3.5" />
                                      Receipt
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleOpenPayModal(student)}
                                      className="px-2.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-[10px] tracking-wide uppercase rounded-xl inline-flex items-center gap-1 cursor-pointer transition-colors shadow-sm shadow-amber-500/15 shrink-0"
                                    >
                                      <CircleDollarSign className="w-3.5 h-3.5" />
                                      Collect
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteBillingRecord(record.id, student.name)}
                                      className="p-1.5 rounded-xl bg-rose-50 hover:bg-rose-600/10 text-rose-600 border border-rose-100 cursor-pointer transition-all shrink-0"
                                      title="Delete partial payment record"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => handleOpenPayModal(student)}
                                    className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-[10px] tracking-wider uppercase rounded-xl inline-flex items-center gap-1.5 cursor-pointer shadow-md shadow-teal-600/10 transition-colors"
                                  >
                                    <CircleDollarSign className="w-3 h-3" />
                                    Collect
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}

          {/* Custom Invoices View */}
          {billingSubTab === 'custom_invoices' && (
            <div className="space-y-6 animate-fade-in" id="custom-invoices-pane">
              {/* Metrics Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Total Invoiced */}
                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-5">
                  <span className="p-4 bg-emerald-50 text-emerald-600 rounded-2xl"><CircleDollarSign className="w-6 h-6" /></span>
                  <div>
                    <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest">Guud ahaan Invoices-ka (Total Issued)</p>
                    <p className="text-2xl font-black text-slate-900">
                      ${(database.invoices || []).reduce((sum, inv) => sum + inv.totalAmount, 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">Total Custom Invoices Issued</p>
                  </div>
                </div>

                {/* Total Amount Collected */}
                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-5">
                  <span className="p-4 bg-teal-50 text-teal-600 rounded-2xl"><Check className="w-6 h-6 animate-pulse" /></span>
                  <div>
                    <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest">Lacagta la Qabtay (Total Collected)</p>
                    <p className="text-2xl font-black text-emerald-700">
                      ${(database.invoices || []).reduce((sum, inv) => sum + inv.amountPaid, 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">Total Payments Collected</p>
                  </div>
                </div>

                {/* Outstanding Balance Due */}
                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-5">
                  <span className="p-4 bg-rose-50 text-rose-600 rounded-2xl"><AlertCircle className="w-6 h-6" /></span>
                  <div>
                    <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest">Deynta ka maqan (Total Outstanding)</p>
                    <p className="text-2xl font-black text-rose-600">
                      ${(database.invoices || []).reduce((sum, inv) => sum + (inv.totalAmount - inv.amountPaid), 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">Total Outstanding Balance Due</p>
                  </div>
                </div>
              </div>

              {/* Filter and Quick Actions Header bar */}
              <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col xl:flex-row xl:items-center justify-between gap-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full xl:w-auto flex-1">
                  {/* Search Field */}
                  <div className="relative">
                    <Search className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 w-4 h-4 pointer-events-none" />
                    <input
                      type="text"
                      placeholder="Raadi magac, telefoon..."
                      value={invoiceSearch}
                      onChange={(e) => setInvoiceSearch(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:bg-white transition-all"
                    />
                  </div>

                  {/* Filter Type */}
                  <select
                    value={invoiceTypeFilter}
                    onChange={(e) => setInvoiceTypeFilter(e.target.value as any)}
                    className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs text-slate-700 outline-none cursor-pointer focus:bg-white"
                  >
                    <option value="all">Nooca: Dhammaan Macmiisha (All Recipients)</option>
                    <option value="parent">Nooca: Waalidiinta (Parents only)</option>
                    <option value="business">Nooca: Shirkadaha (Businesses only)</option>
                  </select>

                  {/* Filter Status */}
                  <select
                    value={invoiceStatusFilter}
                    onChange={(e) => setInvoiceStatusFilter(e.target.value as any)}
                    className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs text-slate-705 outline-none cursor-pointer focus:bg-white"
                  >
                    <option value="all">Heerka: Dhammaan (All Statuses)</option>
                    <option value="Paid">Heerka: Waa la bixiyay (Paid)</option>
                    <option value="Partial">Heerka: Qeyb baa la bixiyay (Partial)</option>
                    <option value="Unpaid">Heerka: Lama bixin (Unpaid)</option>
                  </select>
                </div>

                <button
                  type="button"
                  onClick={handleOpenCreateInvoice}
                  className="py-2.5 px-5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wider rounded-xl inline-flex items-center gap-2 cursor-pointer transition-all shrink-0 self-start xl:self-auto shadow-md shadow-emerald-600/10"
                >
                  <Plus className="w-4 h-4" />
                  Biil Cusub (Create custom invoice)
                </button>
              </div>

              {/* Ledger Invoices listing */}
              <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm relative overflow-hidden">
                <div className="overflow-x-auto scrollbar-thin">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100 text-[10px] font-extrabold tracking-widest text-slate-400 uppercase">
                        <th className="pb-4 pt-1 pl-4">Invoice No</th>
                        <th className="pb-4 pt-1">Macmiilka (Recipient Name)</th>
                        <th className="pb-4 pt-1">Nooca</th>
                        <th className="pb-4 pt-1">Diiwaanka Ardayda</th>
                        <th className="pb-4 pt-1">Muddada</th>
                        <th className="pb-4 pt-1 text-right">Lacagta (Total)</th>
                        <th className="pb-4 pt-1 text-right">La bixiyay (Paid)</th>
                        <th className="pb-4 pt-1 text-right">Deynta (Balance)</th>
                        <th className="pb-4 pt-1 text-center">Status</th>
                        <th className="pb-4 pt-1 pr-4 text-center">Tallaabooyin (Actions)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {(() => {
                        const list = database.invoices || [];
                        const filtered = list.filter(inv => {
                          const term = invoiceSearch.toLowerCase();
                          const matchSearch = 
                            inv.invoiceNo.toLowerCase().includes(term) ||
                            inv.recipientName.toLowerCase().includes(term) ||
                            inv.recipientPhone.toLowerCase().includes(term) ||
                            (inv.recipientEmail && inv.recipientEmail.toLowerCase().includes(term)) ||
                            (inv.studentName && inv.studentName.toLowerCase().includes(term));
                          
                          const matchType = invoiceTypeFilter === 'all' || inv.recipientType === invoiceTypeFilter;
                          const matchStatus = invoiceStatusFilter === 'all' || inv.status === invoiceStatusFilter;

                          return matchSearch && matchType && matchStatus;
                        });

                        if (filtered.length === 0) {
                          return (
                            <tr>
                              <td colSpan={10} className="py-12 text-center text-xs text-slate-400 font-semibold italic">
                                Ma jiraan biili weheliya shuruudahan la baaray.
                              </td>
                            </tr>
                          );
                        }

                        return filtered.map(invoice => {
                          const balanceDue = invoice.totalAmount - invoice.amountPaid;
                          return (
                            <tr key={invoice.id} className="hover:bg-slate-50/50 transition-colors text-xs text-slate-800">
                              <td className="py-4 pl-4 font-mono font-extrabold text-slate-600">{invoice.invoiceNo}</td>
                              <td className="py-4">
                                <div className="font-extrabold text-slate-900">{invoice.recipientName}</div>
                                <div className="font-mono text-[10px] text-slate-400 mt-0.5">{invoice.recipientPhone}</div>
                              </td>
                              <td className="py-4">
                                <span className={`px-2 py-0.5 text-[9px] font-black uppercase rounded ${
                                  invoice.recipientType === 'parent' 
                                    ? 'bg-indigo-50 text-indigo-700' 
                                    : 'bg-sky-50 text-sky-750'
                                }`}>
                                  {invoice.recipientType === 'parent' ? 'Waalid' : 'Business'}
                                </span>
                              </td>
                              <td className="py-4 font-semibold text-[11px] text-slate-500">
                                {invoice.studentName ? (
                                  <span>
                                    Aabbe/Hoyo: <span className="font-bold text-slate-700">{invoice.studentName}</span>
                                    <br/><span className="text-[9px] font-mono">ID: {invoice.studentId}</span>
                                  </span>
                                ) : (
                                  <span className="italic text-slate-300">-</span>
                                )}
                              </td>
                              <td className="py-4">
                                <div className="text-[10px] text-slate-400">Issue: <span className="font-mono font-bold text-slate-600">{invoice.date}</span></div>
                                <div className="text-[10px] text-slate-400 mt-0.5">Due: <span className="font-mono font-bold text-slate-600">{invoice.dueDate}</span></div>
                              </td>
                              <td className="py-4 text-right font-black text-slate-900">${invoice.totalAmount.toFixed(2)}</td>
                              <td className="py-4 text-right font-black text-emerald-700">${invoice.amountPaid.toFixed(2)}</td>
                              <td className="py-4 text-right font-black text-rose-600">${balanceDue.toFixed(2)}</td>
                              <td className="py-4 text-center">
                                <span className={`px-2.5 py-1 text-[9px] font-black tracking-wider uppercase rounded-xl inline-block ${
                                  invoice.status === 'Paid'
                                    ? 'bg-emerald-50 text-emerald-700'
                                    : invoice.status === 'Partial'
                                    ? 'bg-amber-50 text-amber-700'
                                    : 'bg-rose-50 text-rose-700'
                                }`}>
                                  {invoice.status === 'Paid' ? 'Paid' : invoice.status === 'Partial' ? 'Partial' : 'Unpaid'}
                                </span>
                              </td>
                              <td className="py-4 text-center pr-4">
                                <div className="flex items-center justify-center gap-1.5">
                                  {/* Edit Button */}
                                  <button
                                    type="button"
                                    onClick={() => handleOpenEditInvoice(invoice)}
                                    className="p-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 cursor-pointer transition-colors"
                                    title="Edit details"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>

                                  {/* Print/View Voucher Receipt Button */}
                                  <button
                                    type="button"
                                    onClick={() => setShowInvoiceReceipt(invoice)}
                                    className="p-1.5 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-700 border border-teal-150 cursor-pointer transition-colors"
                                    title="View / Print Invoice"
                                  >
                                    <Receipt className="w-3.5 h-3.5" />
                                  </button>

                                  {/* Download PDF Quick Action */}
                                  <button
                                    type="button"
                                    onClick={() => handleDownloadInvoicePDF(invoice)}
                                    className="p-1.5 rounded-xl bg-rose-50 hover:bg-rose-100/80 text-rose-700 border border-rose-150 cursor-pointer transition-colors"
                                    title="Download PDF"
                                  >
                                    <Download className="w-3.5 h-3.5" />
                                  </button>

                                  {/* Delete Button */}
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteInvoice(invoice.id, invoice.invoiceNo)}
                                    className="p-1.5 rounded-xl bg-rose-50 hover:bg-rose-600/10 text-rose-600 border border-rose-100 cursor-pointer transition-colors"
                                    title="Delete custom invoice"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        });
                      })()}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}

          </div>
        )}

        {activeTab === 'moneyTransfers' && (
          <MoneyTransferTab 
            database={database} 
            onSaveDatabase={onSaveDatabase} 
          />
        )}

        {/* --- BACKUP TAB (D: DRIVE HUB) --- */}
        {activeTab === 'backup' && (
          <div className="space-y-8 animate-fade-in" id="portal-backup">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              
              {/* Left explanation container */}
              <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-teal-500 to-emerald-500" />
                
                <span className="p-3 bg-teal-50 text-teal-700 rounded-2xl inline-flex mb-5"><HardDriveDownload className="w-6 h-6" /></span>
                <h3 className="font-extrabold text-slate-930 text-xl tracking-tight">Laptop D: Drive Backup Strategy</h3>
                
                <p className="text-slate-500 text-sm mt-3 leading-relaxed">
                  Web browser sandboxes prevent default security permissions from writing or overwriting system files on your partition drives like <span className="font-bold text-slate-800">D:\</span>. 
                </p>

                <p className="text-slate-500 text-sm mt-3 leading-relaxed">
                  We have solved this by creating a highly secure, offline-first portable database package strategy:
                </p>

                <div className="space-y-4 pt-6" id="strategy-bullets">
                  <div className="flex gap-3">
                    <span className="w-6 h-6 shrink-0 bg-teal-600 text-white rounded-full font-bold text-xs flex items-center justify-center">1</span>
                    <p className="text-xs text-slate-600 font-semibold leading-relaxed">
                      Click <span className="font-extrabold text-slate-800">"Generate System Backup (.json)"</span> below. The application bundles 100% of student accounts, progress notes, and payment ledgers.
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <span className="w-6 h-6 shrink-0 bg-teal-600 text-white rounded-full font-bold text-xs flex items-center justify-center">2</span>
                    <p className="text-xs text-slate-600 font-semibold leading-relaxed">
                      Your web browser will prompt you to save the file. Choose or create a dedicated backup directory on your laptop, for example: <span className="font-mono text-xs font-bold text-indigo-600 px-1 bg-slate-50 border border-slate-100 rounded">D:\Dugsiga_Subuc_Backups\</span>.
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <span className="w-6 h-6 shrink-0 bg-teal-600 text-white rounded-full font-bold text-xs flex items-center justify-center">3</span>
                    <p className="text-xs text-slate-600 font-semibold leading-relaxed">
                      To move records onto another computer or restore files after clearing browser caches, use the file selector on the right to import that JSON backup file.
                    </p>
                  </div>
                </div>

                <div className="pt-8 flex flex-col sm:flex-row gap-3">
                  <button
                    type="button"
                    onClick={handleBackupExport}
                    className="flex-1 py-4 px-6 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs uppercase tracking-wider rounded-2xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-teal-600/10"
                    id="export-db-master-btn"
                  >
                    <Download className="w-4 h-4" />
                    Download System Backup (.json)
                  </button>
                </div>
              </div>

              {/* Right Restore Module */}
              <div className="bg-white p-8 rounded-3xl border border-slate-200 border-dashed text-center flex flex-col justify-between" id="restore-block">
                <div>
                  <span className="p-3.5 bg-indigo-50 text-indigo-600 rounded-3xl inline-flex mb-4"><UploadCloud className="w-8 h-8" /></span>
                  <h4 className="font-extrabold text-slate-900 text-lg">Synchronize & Restore Portal</h4>
                  <p className="text-slate-400 text-xs mt-1 leading-relaxed">
                    Import existing backups from your D: drive storage folder to synchronize the system state.
                  </p>
                </div>

                <div className="my-6 p-6 bg-slate-50 rounded-2xl border border-slate-100/80 text-left">
                  <h5 className="font-bold text-slate-800 text-xs uppercase flex items-center gap-1.5 mb-2">
                    <AlertCircle className="w-4 h-4 text-amber-500" />
                    Crucial Data Warning
                  </h5>
                  <p className="text-[11px] text-slate-400 leading-normal font-semibold">
                    Uploading a backup file will override any unsaved entries on this browser instance. Ensure your backup file contains the latest data state.
                  </p>
                </div>

                <div className="relative">
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleBackupImport}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    id="db-backup-file-picker"
                  />
                  <div className="w-full py-4 bg-slate-100 hover:bg-slate-200 font-bold text-slate-705 text-xs uppercase tracking-wider rounded-2xl flex items-center justify-center gap-2 transition-all border border-slate-200 cursor-pointer">
                    <UploadCloud className="w-4 h-4" />
                    Upload Backup JSON File
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* --- LANDING PAGE CONTROL PANEL TAB --- */}
        {activeTab === 'landing' && (
          <LandingControlTab 
            database={database} 
            onSaveDatabase={onSaveDatabase} 
          />
        )}

        {/* --- TEACHER SUBMISSIONS AUDIT LOG TAB --- */}
        {activeTab === 'submissions' && (() => {
          const teacherSubmissions = database.submissions || [];
          
          return (
            <div className="space-y-6 animate-fade-in" id="portal-submissions">
              {/* Header card with metrics */}
              <div className="p-6 bg-white rounded-3xl border border-slate-100 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-violet-500 to-indigo-500" />
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h3 className="font-extrabold text-slate-930 text-xl tracking-tight">Teacher Submissions Audit Trail</h3>
                    <p className="text-slate-500 text-xs mt-1">
                      Monitor real-time academic records, progress reports, and graded examinations uploaded by assigned teachers.
                    </p>
                  </div>
                </div>

                {/* Submissions Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                  <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl">
                    <span className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider">Total Submissions</span>
                    <span className="block text-2xl font-black text-slate-900 mt-1">{teacherSubmissions.length}</span>
                  </div>
                  <div className="p-4 bg-emerald-50/50 border border-emerald-100/50 rounded-2xl">
                    <span className="block text-[10px] uppercase font-bold text-emerald-600 tracking-wider">Daily Work Logs</span>
                    <span className="block text-2xl font-black text-emerald-700 mt-1">
                      {teacherSubmissions.filter(s => s.type === 'attendance').length}
                    </span>
                  </div>
                  <div className="p-4 bg-violet-50/50 border border-violet-100/50 rounded-2xl">
                    <span className="block text-[10px] uppercase font-bold text-violet-600 tracking-wider">Class Exams Graded</span>
                    <span className="block text-2xl font-black text-violet-700 mt-1">
                      {teacherSubmissions.filter(s => s.type === 'exam').length}
                    </span>
                  </div>
                  <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl">
                    <span className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider">Last Sync Status</span>
                    <span className="block text-xs font-bold text-slate-600 mt-2.5 flex items-center gap-1.5 leading-none">
                      <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse inline-block" /> Live Connected
                    </span>
                  </div>
                </div>
              </div>

              {/* Filtering Controls */}
              <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row items-center gap-4">
                <div className="relative w-full md:w-64 shrink-0">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                  <input
                    type="text"
                    value={submissionSearchQuery}
                    onChange={(e) => setSubmissionSearchQuery(e.target.value)}
                    placeholder="Search by teacher or title..."
                    className="w-full pl-10 pr-4 py-2.5 text-xs rounded-xl bg-slate-50 border border-slate-200 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 transition-all font-semibold"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-2 w-full md:justify-end">
                  {/* Teacher filter dropdown */}
                  <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Teacher:</span>
                    <select
                      value={submissionSelectedTeacher}
                      onChange={(e) => setSubmissionSelectedTeacher(e.target.value)}
                      className="text-xs font-bold text-slate-700 bg-transparent focus:outline-none cursor-pointer"
                    >
                      <option value="All">All Staff</option>
                      {database.teachers.map(t => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Type filter dropdown */}
                  <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Category:</span>
                    <select
                      value={submissionSelectedType}
                      onChange={(e) => setSubmissionSelectedType(e.target.value)}
                      className="text-xs font-bold text-slate-700 bg-transparent focus:outline-none cursor-pointer"
                    >
                      <option value="All">All Types</option>
                      <option value="attendance">Daily Attendance Logs</option>
                      <option value="exam">Grades & Exams</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Submissions List */}
              <div className="space-y-4">
                {(() => {
                  const queryLower = submissionSearchQuery.toLowerCase();
                  const filtered = teacherSubmissions.filter(sub => {
                    const matchesSearch = sub.teacherName.toLowerCase().includes(queryLower) ||
                                          sub.title.toLowerCase().includes(queryLower) ||
                                          sub.className.toLowerCase().includes(queryLower);
                    const matchesTeacher = submissionSelectedTeacher === 'All' || sub.teacherId === submissionSelectedTeacher;
                    const matchesType = submissionSelectedType === 'All' || sub.type === submissionSelectedType;
                    return matchesSearch && matchesTeacher && matchesType;
                  });

                  if (filtered.length === 0) {
                    return (
                      <div className="text-center p-12 bg-white rounded-3xl border border-dashed border-slate-200">
                        <span className="text-slate-400 text-sm font-semibold">No matching submissions found system-wide.</span>
                        <p className="text-xs text-slate-400 mt-1">Try softening your search query or choosing alternate filter targets.</p>
                      </div>
                    );
                  }

                  return filtered.map((sub) => {
                    const isExpanded = expandedSubmissionId === sub.id;
                    const dateFormatted = new Date(sub.timestamp).toLocaleString(undefined, {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    });

                    const initials = sub.teacherName
                      .split(' ')
                      .filter(n => !n.startsWith('Sh.') && !n.startsWith('Malm.'))
                      .slice(0, 1)
                      .map(n => n[0])
                      .join('') || sub.teacherName[0];

                    return (
                      <div key={sub.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden transition-all duration-300">
                        {/* Header clickable bar */}
                        <div 
                          onClick={() => setExpandedSubmissionId(isExpanded ? null : sub.id)}
                          className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer hover:bg-slate-50/50 transition-colors"
                        >
                          <div className="flex items-start gap-4">
                            <div className={`w-10 h-10 rounded-xl shrink-0 flex items-center justify-center font-extrabold text-sm ${
                              sub.type === 'attendance' ? 'bg-emerald-50 text-emerald-700' : 'bg-violet-50 text-violet-700'
                            }`}>
                              {initials}
                            </div>
                            
                            <div className="space-y-1">
                              <div className="flex gap-2 flex-wrap items-center">
                                <h4 className="font-extrabold text-slate-900 text-xs leading-none">
                                  {sub.teacherName}
                                </h4>
                                <span className="text-slate-300 text-xs font-light">•</span>
                                <span className="text-[10px] text-slate-400 leading-none font-semibold">
                                  Classroom: <span className="text-slate-700 font-bold">{sub.className}</span>
                                </span>
                              </div>
                              <p className="text-xs font-bold text-slate-800 tracking-tight leading-normal mt-0.5">{sub.title}</p>
                              
                              <div className="flex flex-wrap items-center gap-2 pt-1 font-mono text-[10px] text-slate-400">
                                <span>Timestamp: {dateFormatted}</span>
                                <span>•</span>
                                <span>Log Scale: {sub.studentCount} students logged</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center justify-between md:justify-end gap-3 self-stretch md:self-auto pt-3 md:pt-0 border-t md:border-none border-slate-50" onClick={(e) => e.stopPropagation()}>
                            <div className="text-right">
                              <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold inline-block ${
                                sub.type === 'attendance' ? 'bg-emerald-100 text-emerald-800' : 'bg-violet-100 text-violet-800'
                              }`}>
                                {sub.type === 'attendance' ? 'Progress Record' : 'Exam Scoreboard'}
                              </span>
                              <span className="block text-[10px] font-bold text-slate-500 mt-1.5">{sub.summary}</span>
                            </div>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteSubmission(sub.id);
                              }}
                              className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl border border-rose-100/60 cursor-pointer transition-all inline-flex items-center justify-center shrink-0"
                              title="Delete Submission Audit Log"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                            <ChevronDown 
                              onClick={(e) => {
                                e.stopPropagation();
                                setExpandedSubmissionId(isExpanded ? null : sub.id);
                              }}
                              className="w-5 h-5 text-slate-400 shrink-0 transform transition-transform duration-300 cursor-pointer" 
                              style={{ transform: isExpanded ? 'rotate(180deg)' : 'none' }}
                            />
                          </div>
                        </div>

                        {/* Expandable Inner Table Section */}
                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2 }}
                              className="border-t border-slate-100 bg-slate-50/50"
                            >
                              <div className="p-5 overflow-x-auto">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                                  <h5 className="text-[10px] uppercase font-extrabold text-slate-400 tracking-wider">Record Details Inspect:</h5>
                                  <span className="text-[10px] text-teal-700 font-extrabold bg-teal-50 border border-teal-100/80 px-2.5 py-0.5 rounded-full inline-flex items-center gap-1 shadow-sm shrink-0">
                                    🖱️ Double-click any student row to edit their attendance of that day
                                  </span>
                                </div>
                                
                                <div className="border border-slate-200/50 rounded-xl overflow-hidden bg-white max-w-full">
                                  <table className="min-w-full text-xs text-left text-slate-705 font-medium leading-normal border-collapse">
                                    {sub.type === 'attendance' ? (
                                      <>
                                        <thead className="bg-slate-50 text-[10px] font-extrabold uppercase text-slate-400 tracking-wider border-b border-slate-100">
                                          <tr>
                                            <th className="px-4 py-2.5">ID</th>
                                            <th className="px-4 py-2.5">Student Name</th>
                                            <th className="px-4 py-2.5 text-center">Attendance</th>
                                            <th className="px-4 py-2.5 text-center">Lesson Progress</th>
                                            <th className="px-4 py-2.5">Specific Remarks & Comments</th>
                                          </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                          {(sub.studentsDetail || []).map((stu, i) => (
                                            <tr 
                                              key={i} 
                                              onDoubleClick={() => setEditingStudentDetail({
                                                submissionId: sub.id,
                                                studentId: stu.studentId,
                                                studentName: stu.studentName,
                                                attendanceSent: (stu.attendanceSent as any) || 'Present',
                                                lessonSent: (stu.lessonSent as any) || 'Completed',
                                                notesSent: stu.notesSent || '',
                                                type: 'attendance'
                                              })}
                                              className="hover:bg-teal-50/60 cursor-pointer select-none transition-colors duration-150"
                                              title="Double-click to edit attendance details for this day"
                                            >
                                              <td className="px-4 py-2.5 font-mono text-[10px] text-slate-400 font-bold">{stu.studentId}</td>
                                              <td className="px-4 py-2.5 text-slate-900 font-bold">{stu.studentName}</td>
                                              <td className="px-4 py-2.5 text-center">
                                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                                                  stu.attendanceSent === 'Present' ? 'bg-emerald-50 text-emerald-700' :
                                                  stu.attendanceSent === 'Late' ? 'bg-amber-50 text-amber-700' :
                                                  'bg-rose-50 text-rose-700'
                                                }`}>
                                                  {stu.attendanceSent}
                                                </span>
                                              </td>
                                              <td className="px-4 py-2.5 text-center">
                                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                                  stu.lessonSent === 'Completed' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                                                }`}>
                                                  {stu.lessonSent}
                                                </span>
                                              </td>
                                              <td className="px-4 py-2.5 text-slate-500 italic max-w-xs truncate" title={stu.notesSent}>
                                                {stu.notesSent || <span className="text-slate-300 font-normal">None recorded</span>}
                                              </td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </>
                                    ) : (
                                      <>
                                        <thead className="bg-slate-50 text-[10px] font-extrabold uppercase text-slate-400 tracking-wider border-b border-slate-100">
                                          <tr>
                                            <th className="px-4 py-2.5">ID</th>
                                            <th className="px-4 py-2.5">Student Name</th>
                                            <th className="px-4 py-2.5">Evaluated Subject Scores</th>
                                            <th className="px-4 py-2.5 text-center">Average Progress</th>
                                            <th className="px-4 py-2.5 text-center">Grade</th>
                                          </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                          {(sub.studentsDetail || []).map((stu, i) => (
                                            <tr key={i} className="hover:bg-slate-50/20">
                                              <td className="px-4 py-2.5 font-mono text-[10px] text-slate-400 font-bold">{stu.studentId}</td>
                                              <td className="px-4 py-2.5 text-slate-900 font-bold">{stu.studentName}</td>
                                              <td className="px-4 py-2.5">
                                                <div className="flex flex-wrap gap-1.5">
                                                  {Object.entries(stu.scoresSent || {}).map(([subj, score]) => (
                                                    <span key={subj} className="inline-flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded font-mono text-[10px] text-slate-600 font-medium">
                                                      <span className="font-bold font-sans text-slate-400">{subj}:</span> {score}%
                                                    </span>
                                                  ))}
                                                </div>
                                              </td>
                                              <td className="px-4 py-2.5 text-center text-slate-900 font-black">
                                                {stu.averageScoreSent ? `${stu.averageScoreSent.toFixed(1)}%` : '-'}
                                              </td>
                                              <td className="px-4 py-2.5 text-center">
                                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black font-mono ${
                                                  stu.gradeSent === 'A' ? 'bg-emerald-50 text-emerald-700' :
                                                  stu.gradeSent === 'B' ? 'bg-sky-50 text-sky-700' :
                                                  stu.gradeSent === 'C' ? 'bg-amber-50 text-amber-700' :
                                                  'bg-rose-50 text-rose-700'
                                                }`}>
                                                  {stu.gradeSent}
                                                </span>
                                              </td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </>
                                    )}
                                  </table>
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>
          );
        })()}

        {/* --- STUDENT ATTENDANCE WORKSPACE PANEL TAB --- */}
        {activeTab === 'studentAttendance' && (() => {
          const uniqueClasses = Array.from(new Set(database.students.map(s => s.className))).filter(Boolean);
          const teachers = database.teachers || [];
          
          // Filter active students based on choices
          const filteredStudentsForAttendance = database.students.filter(stud => {
            const matchesClass = studAttClass === 'All' || stud.className === studAttClass;
            let matchesTeacher = true;
            if (studAttTeacher !== 'All') {
              matchesTeacher = stud.teacherId === studAttTeacher;
            }
            const matchesSearch = studAttSearch === '' || 
              stud.name.toLowerCase().includes(studAttSearch.toLowerCase()) ||
              stud.id.toLowerCase().includes(studAttSearch.toLowerCase());
            return matchesClass && matchesTeacher && matchesSearch && stud.active;
          });

          // Calculate stats dynamically for selected day
          let presentCount = 0;
          let lateCount = 0;
          let absentCount = 0;
          let unloggedCount = 0;

          filteredStudentsForAttendance.forEach(stud => {
            const prog = (database.progress || []).find(p => p.studentId === stud.id && p.date === studAttDate);
            if (!prog) {
              unloggedCount++;
            } else if (prog.attendance === 'Present') {
              presentCount++;
            } else if (prog.attendance === 'Late') {
              lateCount++;
            } else if (prog.attendance === 'Absent') {
              absentCount++;
            }
          });

          const handleRowDoubleClick = (student: Student, progressRecord?: DailyProgress) => {
            if (progressRecord) {
              setSelectedAttendanceDetail(progressRecord);
            } else {
              // Construct informational record
              const infoProgress: DailyProgress = {
                id: `mock-${student.id}-${studAttDate}`,
                date: studAttDate,
                studentId: student.id,
                studentName: student.name,
                teacherId: student.teacherId,
                className: student.className,
                attendance: 'Absent', // placeholder
                lessonCompleted: 'Not Completed',
                surad: 'N/A',
                subac: 'N/A',
                dhaqan: 'Average',
                nadaafad: 'Average',
                faahfaahin: 'Diiwaan ma jiro: Macallinku weli ma soo gudbin joogitaanka casharka ee maanta.' // Attendance for this date has not been submitted by the teacher.
              };
              setSelectedAttendanceDetail(infoProgress);
            }
          };

          return (
            <div className="space-y-6 animate-fade-in" id="portal-student-attendance">
              
              {/* Header card with metadata */}
              <div className="p-6 bg-white rounded-3xl border border-slate-100 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-emerald-500 to-indigo-500" />
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h3 className="font-extrabold text-slate-900 text-xl tracking-tight">Joogitaanka Ardayda (Student Attendance Explorer)</h3>
                    <p className="text-slate-400 text-xs mt-1">
                      Monitor classroom attendance histories, check lesson submissions, and verify specific teacher remarks and notes.
                    </p>
                  </div>
                  <div className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-xl self-start flex items-center gap-1.5 animate-pulse">
                    <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full" /> Live Connected
                  </div>
                </div>

                {/* Quick Metrics Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5 mt-6">
                  <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex flex-col justify-between" id="metric-class-students">
                    <span className="text-[10px] uppercase font-bold text-slate-430 tracking-wider">Ardayda Fasalka</span>
                    <div className="flex items-baseline gap-1.5 mt-1">
                      <span className="text-2xl font-black text-slate-900">{filteredStudentsForAttendance.length}</span>
                      <span className="text-[10px] font-bold text-slate-400">Total</span>
                    </div>
                  </div>
                  
                  <div className="p-4 bg-emerald-50/50 border border-emerald-100/50 rounded-2xl flex flex-col justify-between" id="metric-class-present">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase font-bold text-emerald-700 tracking-wider">Halka Jooga</span>
                      <span className="text-xs">🟢</span>
                    </div>
                    <div className="flex items-baseline gap-1.5 mt-1">
                      <span className="text-2xl font-black text-emerald-700">{presentCount}</span>
                      <span className="text-[10px] font-bold text-emerald-600">Present</span>
                    </div>
                  </div>

                  <div className="p-4 bg-amber-50/50 border border-amber-100/50 rounded-2xl flex flex-col justify-between" id="metric-class-late">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase font-bold text-amber-700 tracking-wider">Soo Daahay</span>
                      <span className="text-xs">🟡</span>
                    </div>
                    <div className="flex items-baseline gap-1.5 mt-1">
                      <span className="text-2xl font-black text-amber-700">{lateCount}</span>
                      <span className="text-[10px] font-bold text-amber-600">Late</span>
                    </div>
                  </div>

                  <div className="p-4 bg-rose-50/50 border border-rose-100/50 rounded-2xl flex flex-col justify-between" id="metric-class-absent">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase font-bold text-rose-700 tracking-wider">Ma Jogo</span>
                      <span className="text-xs">🔴</span>
                    </div>
                    <div className="flex items-baseline gap-1.5 mt-1">
                      <span className="text-2xl font-black text-rose-700">{absentCount}</span>
                      <span className="text-[10px] font-bold text-rose-600">Absent</span>
                    </div>
                  </div>

                  <div className="p-4 bg-slate-100 border border-slate-200/50 rounded-2xl col-span-2 lg:col-span-1 flex flex-col justify-between" id="metric-class-unlogged">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Aon Diiwaangashanayn</span>
                      <span className="text-xs">🔘</span>
                    </div>
                    <div className="flex items-baseline gap-1.5 mt-1">
                      <span className="text-2xl font-black text-slate-600">{unloggedCount}</span>
                      <span className="text-[10px] font-bold text-slate-500">Unlogged</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Advanced Filter Toolbar */}
              <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  
                  {/* Date Picker Filter */}
                  <div className="flex flex-col" id="filter-date-wrapper">
                    <label className="text-[10px] uppercase font-extrabold text-slate-400 tracking-wider mb-1.5 pl-0.5">Taariikh / Choose Date</label>
                    <div className="relative">
                      <input
                        type="date"
                        value={studAttDate}
                        onChange={(e) => setStudAttDate(e.target.value)}
                        className="px-4 py-2.5 pl-9 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs text-slate-805 outline-none focus:bg-white focus:border-indigo-500 w-full transition-all"
                      />
                      <CalendarRange className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                    </div>
                  </div>

                  {/* Class Selector Dropdown */}
                  <div className="flex flex-col" id="filter-class-wrapper">
                    <label className="text-[10px] uppercase font-extrabold text-slate-400 tracking-wider mb-1.5 pl-0.5">Fasalka / Select Class</label>
                    <div className="relative">
                      <select
                        value={studAttClass}
                        onChange={(e) => setStudAttClass(e.target.value)}
                        className="px-4 py-2.5 pl-9 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs text-slate-805 outline-none cursor-pointer focus:bg-white focus:border-indigo-500 w-full transition-all appearance-none"
                      >
                        <option value="All">Dhammaan Fasallada (All Classes)</option>
                        {uniqueClasses.map(cls => (
                           <option key={cls} value={cls}>{cls}</option>
                         ))}
                      </select>
                      <BookOpen className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                      <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-3.5 pointer-events-none" />
                    </div>
                  </div>

                  {/* Teacher Selector Dropdown */}
                  <div className="flex flex-col" id="filter-teacher-wrapper">
                    <label className="text-[10px] uppercase font-extrabold text-slate-400 tracking-wider mb-1.5 pl-0.5">Macallinka / Assigned Teacher</label>
                    <div className="relative">
                      <select
                        value={studAttTeacher}
                        onChange={(e) => setStudAttTeacher(e.target.value)}
                        className="px-4 py-2.5 pl-9 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs text-slate-805 outline-none cursor-pointer focus:bg-white focus:border-indigo-500 w-full transition-all appearance-none"
                      >
                        <option value="All">Dhammaan Macallimiinta (All Teachers)</option>
                        {teachers.map(teach => (
                          <option key={teach.id} value={teach.id}>{teach.name}</option>
                        ))}
                      </select>
                      <GraduationCap className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                      <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-3.5 pointer-events-none" />
                    </div>
                  </div>

                  {/* Name Search box */}
                  <div className="flex flex-col" id="filter-search-wrapper">
                    <label className="text-[10px] uppercase font-extrabold text-slate-400 tracking-wider mb-1.5 pl-0.5">Raadi / Search Name or ID</label>
                    <div className="relative">
                      <input
                        type="text"
                        value={studAttSearch}
                        onChange={(e) => setStudAttSearch(e.target.value)}
                        placeholder="E.g. Cabdisalaan, STD-03..."
                        className="px-4 py-2.5 pl-9 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 placeholder-slate-400 outline-none focus:bg-white focus:border-indigo-500 w-full transition-all"
                      />
                      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                      {studAttSearch && (
                        <button 
                          onClick={() => setStudAttSearch('')}
                          className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 cursor-pointer"
                          type="button"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                </div>
              </div>

              {/* Attendance Logs List / Table */}
              <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden" id="attendance-tracking-workspace-table">
                <div className="p-5 border-b border-slate-100 bg-slate-50/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-slate-800">
                   <div>
                     <h4 className="font-extrabold text-sm text-slate-900">Diiwaanka Casharka & Joogitaanka</h4>
                     <p className="text-[11px] text-slate-450">Total filtered: <span className="font-black text-slate-700">{filteredStudentsForAttendance.length}</span> students. Laba-jeer guji magaca si aad u aragto macluumaadka oo dhan.</p>
                   </div>
                </div>

                {filteredStudentsForAttendance.length === 0 ? (
                  <div className="text-center py-16 text-slate-400 italic text-xs font-bold bg-slate-50/20 flex flex-col items-center gap-2">
                    <AlertCircle className="w-8 h-8 text-slate-300" />
                    Eeg shaandheynta: Ma jiraan arday buuxiya shuruudaha shaandheynta ee hadda.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-50 text-[10px] font-extrabold uppercase text-slate-400 tracking-wider border-b border-slate-100">
                          <th className="px-5 py-3">Student ID</th>
                          <th className="px-5 py-3">Student Name</th>
                          <th className="px-5 py-3">Fasalka (Class)</th>
                          <th className="px-5 py-3">Macallinka (Teacher)</th>
                          <th className="px-5 py-3 text-center">Joogitaanka</th>
                          <th className="px-5 py-3 text-center">Natiijada Casharka</th>
                          <th className="px-5 py-3">Xogta Casharka / Note</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredStudentsForAttendance.map(stud => {
                          const prog = (database.progress || []).find(p => p.studentId === stud.id && p.date === studAttDate);
                          const teacherName = teachers.find(t => t.id === stud.teacherId)?.name || 'Unassigned';
                          
                          return (
                            <tr
                              key={stud.id}
                              onDoubleClick={() => handleRowDoubleClick(stud, prog)}
                              className="hover:bg-emerald-50/40 transition-colors duration-150 cursor-pointer select-none"
                              title="Laba-jeer guji si aad u aragto diiwaanka xogta magaca oo dhammaystiran"
                            >
                              <td className="px-5 py-3.5 font-mono text-[10.5px] font-bold text-slate-400">{stud.id}</td>
                              <td className="px-5 py-3.5 text-slate-900 font-extrabold flex items-center gap-2">
                                <div className="w-6 h-6 rounded-lg bg-indigo-50 text-[10px] text-indigo-600 flex items-center justify-center font-black">
                                  🎓
                                </div>
                                {stud.name}
                              </td>
                              <td className="px-5 py-3.5 text-slate-705 font-black">{stud.className}</td>
                              <td className="px-5 py-3.5 text-slate-500 font-bold">{teacherName}</td>
                              <td className="px-5 py-3.5 text-center">
                                {prog ? (
                                  <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wide ${
                                    prog.attendance === 'Present' ? 'bg-emerald-50 text-emerald-700' :
                                    prog.attendance === 'Late' ? 'bg-amber-50 text-amber-700' :
                                    'bg-rose-50 text-rose-700'
                                  }`}>
                                    {prog.attendance === 'Present' ? '🟢 Present' : prog.attendance === 'Late' ? '🟡 Late' : '🔴 Absent'}
                                  </span>
                                ) : (
                                  <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black bg-slate-100 text-slate-500">
                                    🔘 Not Logged
                                  </span>
                                )}
                              </td>
                              <td className="px-5 py-3.5 text-center">
                                {prog ? (
                                  <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                    prog.lessonCompleted === 'Completed' ? 'bg-emerald-100/60 text-emerald-700' : 'bg-rose-50 text-rose-700'
                                  }`}>
                                    {prog.lessonCompleted}
                                  </span>
                                ) : (
                                  <span className="text-slate-300 font-mono">-</span>
                                )}
                              </td>
                              <td className="px-5 py-3.5 text-slate-500 font-medium italic max-w-xs truncate" title={prog?.faahfaahin || ''}>
                                {prog?.faahfaahin ? prog.faahfaahin : <span className="text-slate-300 font-normal">No specific note recorded</span>}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Elegant details modal when double-clicked */}
              <AnimatePresence>
                {selectedAttendanceDetail && (
                  <div 
                    className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4" 
                    id="att-detail-modal-layer"
                    onClick={() => setSelectedAttendanceDetail(null)}
                  >
                    <motion.div 
                      initial={{ opacity: 0, y: 15, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 15, scale: 0.98 }}
                      className="bg-white rounded-3xl border border-slate-100 shadow-2xl max-w-xl w-full overflow-hidden" 
                      id="att-detail-modal-card"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {/* Header styling banner */}
                      <div className="bg-gradient-to-r from-indigo-600 to-blue-600 p-6 text-white flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-11 h-11 rounded-2xl bg-white/20 text-white flex items-center justify-center text-xl shadow-inner">
                            📋
                          </div>
                          <div>
                            <span className="text-[10px] uppercase font-bold tracking-widest opacity-80 block">Xogta Casharka & Joogitaanka</span>
                            <h3 className="text-base font-extrabold tracking-tight mt-0.5">
                              {selectedAttendanceDetail.studentName}
                            </h3>
                          </div>
                        </div>
                        <button 
                          type="button"
                          onClick={() => setSelectedAttendanceDetail(null)}
                          className="w-8 h-8 rounded-full bg-white/15 hover:bg-white/25 text-white flex items-center justify-center transition-all cursor-pointer shadow-xs"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="p-6 space-y-4">
                        {/* Basic Row 1 */}
                        <div className="grid grid-cols-3 gap-3">
                          <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                            <span className="block text-[9px] uppercase font-bold text-slate-400 tracking-wider">Student ID</span>
                            <span className="block text-xs font-black text-slate-700 font-mono mt-0.5">{selectedAttendanceDetail.studentId}</span>
                          </div>
                          <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                            <span className="block text-[9px] uppercase font-bold text-slate-400 tracking-wider">Taariikh / Date</span>
                            <span className="block text-xs font-black text-slate-800 mt-0.5">{selectedAttendanceDetail.date}</span>
                          </div>
                          <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                            <span className="block text-[9px] uppercase font-bold text-slate-400 tracking-wider font-sans">Fasalka / Class</span>
                            <span className="block text-xs font-black text-slate-800 mt-0.5">{selectedAttendanceDetail.className}</span>
                          </div>
                        </div>

                        {/* Basic Row 2 - status displays */}
                        <div className="grid grid-cols-2 gap-4">
                          <div className={`p-4 rounded-2xl border flex items-center gap-3 ${
                            selectedAttendanceDetail.attendance === 'Present' ? 'bg-emerald-50/65 border-emerald-100 text-slate-800' :
                            selectedAttendanceDetail.attendance === 'Late' ? 'bg-amber-50/65 border-amber-100 text-slate-800' :
                            'bg-rose-50/65 border-rose-100 text-slate-800'
                          }`}>
                            <div className="text-xl">
                              {selectedAttendanceDetail.attendance === 'Present' ? '🟢' : selectedAttendanceDetail.attendance === 'Late' ? '🟡' : '🔴'}
                            </div>
                            <div>
                              <span className="block text-[9px] uppercase font-extrabold text-slate-400 tracking-wider">Attendance Status</span>
                              <span className="block text-xs font-black">{selectedAttendanceDetail.attendance}</span>
                            </div>
                          </div>

                          <div className={`p-4 rounded-2xl border flex items-center gap-3 ${
                            selectedAttendanceDetail.lessonCompleted === 'Completed' ? 'bg-emerald-50/65 border-emerald-100 text-slate-800' : 'bg-slate-50 border-slate-100 text-slate-800'
                          }`}>
                            <div className="text-xl">
                              {selectedAttendanceDetail.lessonCompleted === 'Completed' ? '✅' : '⏳'}
                            </div>
                            <div>
                              <span className="block text-[9px] uppercase font-extrabold text-slate-400 tracking-wider">Lesson Progress</span>
                              <span className="block text-xs font-black">{selectedAttendanceDetail.lessonCompleted}</span>
                            </div>
                          </div>
                        </div>

                        {/* Core progress tasks */}
                        <div className="grid grid-cols-2 gap-3.5">
                          <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100 space-y-1">
                            <span className="block text-[9px] uppercase font-extrabold text-slate-400 tracking-wider">Surad (Single Revision)</span>
                            <span className={`inline-block text-[11px] font-black px-2.5 py-0.5 rounded-full ${
                              selectedAttendanceDetail.surad === 'Completed' ? 'bg-emerald-50 text-emerald-700' :
                              selectedAttendanceDetail.surad === 'Not Completed' ? 'bg-rose-50 text-rose-700' :
                              'bg-slate-100 text-slate-600'
                            }`}>{selectedAttendanceDetail.surad}</span>
                          </div>

                          <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100 space-y-1">
                            <span className="block text-[9px] uppercase font-extrabold text-slate-400 tracking-wider">Subac (Group Revision)</span>
                            <span className={`inline-block text-[11px] font-black px-2.5 py-0.5 rounded-full ${
                              selectedAttendanceDetail.subac === 'Completed' ? 'bg-emerald-50 text-emerald-700' :
                              selectedAttendanceDetail.subac === 'Not Completed' ? 'bg-rose-50 text-rose-700' :
                              'bg-slate-100 text-slate-600'
                            }`}>{selectedAttendanceDetail.subac}</span>
                          </div>
                        </div>

                        {/* Performance grades */}
                        <div className="grid grid-cols-2 gap-3.5">
                          <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100 space-y-1">
                            <span className="block text-[9px] uppercase font-extrabold text-slate-400 tracking-wider">Conduct / Dhaqan</span>
                            <span className="block text-xs font-black text-slate-800">⭐️ {selectedAttendanceDetail.dhaqan}</span>
                          </div>

                          <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100 space-y-1">
                            <span className="block text-[9px] uppercase font-extrabold text-slate-400 tracking-wider">Hygene / Nadaafad</span>
                            <span className="block text-xs font-black text-slate-805">✨ {selectedAttendanceDetail.nadaafad}</span>
                          </div>
                        </div>

                        {/* Suuraduu marayo Section */}
                        {(selectedAttendanceDetail.suuradeeMaraya || selectedAttendanceDetail.boggee || (selectedAttendanceDetail.inteeBog && selectedAttendanceDetail.inteeBog !== 'N/A' && selectedAttendanceDetail.inteeBog !== '')) && (
                          <div className="bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100 flex items-center justify-between">
                            <div>
                              <span className="block text-[9px] uppercase font-extrabold text-indigo-400 tracking-wider">Surada</span>
                              <span className="block text-xs font-black text-slate-800">Current Surah & Pages</span>
                            </div>
                            <div className="flex items-center gap-2 flex-wrap justify-end">
                              {selectedAttendanceDetail.suuradeeMaraya && (
                                <span className="text-xs font-black text-indigo-700 bg-white border border-indigo-100 px-3 py-1 rounded-xl shadow-md">
                                  Surada: {selectedAttendanceDetail.suuradeeMaraya}
                                </span>
                              )}
                              {selectedAttendanceDetail.boggee && (
                                <span className="text-xs font-black text-purple-700 bg-purple-50 border border-purple-100 px-3 py-1 rounded-xl shadow-md">
                                  Boggee: {selectedAttendanceDetail.boggee}
                                </span>
                              )}
                              {selectedAttendanceDetail.inteeBog && selectedAttendanceDetail.inteeBog !== 'N/A' && selectedAttendanceDetail.inteeBog !== '' && (
                                <span className="text-xs font-black text-violet-700 bg-violet-50 border border-violet-100 px-3 py-1 rounded-xl shadow-md">
                                  Intee Bog: {selectedAttendanceDetail.inteeBog}
                                </span>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Core Note Section */}
                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-150 space-y-1.5 shadow-inner">
                          <span className="block text-[9px] uppercase font-extrabold text-slate-500 tracking-wider pl-0.5 font-sans">Diiwaanka faahfaahinta / Remarks & Notes</span>
                          <div className="text-xs font-medium text-slate-700 italic bg-white border border-slate-100 p-4 rounded-xl leading-relaxed whitespace-pre-wrap font-sans">
                            {selectedAttendanceDetail.faahfaahin || "No notes coordinates or comments were filled by the teacher for this lesson."}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex justify-end pt-3 border-t border-slate-100">
                          <button 
                            type="button"
                            onClick={() => setSelectedAttendanceDetail(null)}
                            className="px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-[10px] tracking-wider uppercase rounded-xl transition-all cursor-pointer shadow-sm"
                          >
                            Close
                          </button>
                        </div>

                      </div>
                    </motion.div>
                  </div>
                )}
              </AnimatePresence>

            </div>
          );
        })()}

        {/* --- XEERARKA QIIMAYNTA (EVALUATING & GRADING RULES) TAB --- */}
        {false && (
          <div className="space-y-8 animate-fade-in text-slate-800" id="portal-eval-rules">
            <div className="bg-gradient-to-r from-teal-50 to-indigo-50/50 p-6 rounded-3xl border border-slate-150/60 shadow-sm">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h3 className="font-extrabold text-[#113d3c] text-sm flex items-center gap-2">
                    <span className="text-lg">🏆</span> Xeerarka Qiimaynta Imtixaanada & Kooxaha Tartanka
                  </h3>
                  <p className="text-xs text-slate-500 font-bold mt-1">
                    Standardized Weekly & Monthly Qur'anic Grading Scale, Mark Distributions, and Competition Standing Categories.
                  </p>
                </div>
                <div className="text-[10px] font-black text-slate-500 bg-white px-3.5 py-1.5 rounded-xl border border-slate-150 self-start flex items-center gap-1.5 shadow-xs uppercase tracking-wider">
                  <span className="w-2.5 h-2.5 bg-indigo-500 rounded-full animate-pulse" /> Somali & English Standard
                </div>
              </div>
            </div>

            {/* Part 1: Weekly Mark Distributions */}
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-6">
              <div>
                <h4 className="text-xs font-black text-slate-900 border-b border-slate-100 pb-3 uppercase tracking-widest flex items-center gap-2">
                  <span className="text-teal-650">📊</span> 1. Qiimaynta casharada ee toddobaadlaha ah / weekly scoring weight distribution
                </h4>
                <p className="text-[11px] text-slate-400 mt-1 font-semibold">
                  Sida loo qiimeeyo dhibcaha toddobaadlaha ah ee ardayga si loogu soo saaro dhibco dhan 100%. Hoos ka eeg shanta qaybood ee rasmiga ah:
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Rule Item 1 */}
                <div className="p-5 rounded-2xl bg-teal-50/20 border border-teal-100/50 relative overflow-hidden flex flex-col justify-between">
                  <div className="absolute top-0 right-0 w-16 h-16 bg-teal-500/5 rounded-full -mr-4 -mt-4" />
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="bg-teal-600 text-white font-extrabold text-[10px] px-2 py-0.5 rounded-md uppercase">Max: 30 dhibcood</span>
                      <span className="text-lg">🎼</span>
                    </div>
                    <h5 className="font-black text-slate-900 text-xs mt-3">Laxniga / Qaab Akhriska (Melody)</h5>
                    <p className="text-[11px] text-slate-500 leading-relaxed font-semibold mt-1.5">
                      Hubinta joogtaynta akhris xawaare dhexdhexaad ah ah oo deggen. Waxaa dhibcaha lagu koontaroolaa laxan-baxa gariiraya, degdegga weyn ama akhriska qalafsan.
                    </p>
                  </div>
                  <div className="bg-white px-2.5 py-1.5 rounded-xl border border-teal-100/30 mt-4">
                    <span className="text-[10px] text-teal-800 font-extrabold font-mono">Dhegeysiga Qurxoon (30%)</span>
                  </div>
                </div>

                {/* Rule Item 2 */}
                <div className="p-5 rounded-2xl bg-indigo-50/20 border border-indigo-100/50 relative overflow-hidden flex flex-col justify-between">
                  <div className="absolute top-0 right-0 w-16 h-16 bg-indigo-500/5 rounded-full -mr-4 -mt-4" />
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="bg-indigo-600 text-white font-extrabold text-[10px] px-2 py-0.5 rounded-md uppercase">Max: 30 dhibcood</span>
                      <span className="text-lg">📅</span>
                    </div>
                    <h5 className="font-black text-slate-900 text-xs mt-3">Imaanshaha & Joogitaanka (Attendance)</h5>
                    <p className="text-[11px] text-slate-500 leading-relaxed font-semibold mt-1.5">
                      Qiimaynta imaanshaha joogtada ah ee casharka iyo firfircoonida maalinlaha ah inta uu casharku socdo.
                    </p>
                  </div>
                  <div className="bg-white px-2.5 py-1.5 rounded-xl border border-indigo-100/30 mt-4">
                    <span className="text-[10px] text-indigo-800 font-extrabold font-mono">Joogitaanka Casharka (30%)</span>
                  </div>
                </div>

                {/* Rule Item 3 */}
                <div className="p-5 rounded-2xl bg-emerald-50/20 border border-emerald-100/50 relative overflow-hidden flex flex-col justify-between">
                  <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-500/5 rounded-full -mr-4 -mt-4" />
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="bg-emerald-600 text-white font-extrabold text-[10px] px-2 py-0.5 rounded-md uppercase">Max: 20 dhibcood</span>
                      <span className="text-lg">📖</span>
                    </div>
                    <h5 className="font-black text-slate-900 text-xs mt-3">Xifdiga (Memorization Retention)</h5>
                    <p className="text-[11px] text-slate-500 leading-relaxed font-semibold mt-1.5">
                      Hubinta sida uu ardaygu u xifdiyay aayadaha cusub ama qorshaha maalinlaha ah. Dhibcaha waxaa loo jaraa si waafaqsan khaladaadka akhris-hagaajinta iyo hifdiga.
                    </p>
                  </div>
                  <div className="bg-white px-2.5 py-1.5 rounded-xl border border-emerald-100/30 mt-4">
                    <span className="text-[10px] text-emerald-800 font-extrabold font-mono">Qaybta Xifdiga (20%)</span>
                  </div>
                </div>

                {/* Rule Item 4 */}
                <div className="p-5 rounded-2xl bg-amber-50/20 border border-amber-100/50 relative overflow-hidden flex flex-col justify-between">
                  <div className="absolute top-0 right-0 w-16 h-16 bg-amber-500/5 rounded-full -mr-4 -mt-4" />
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="bg-amber-600 text-white font-extrabold text-[10px] px-2 py-0.5 rounded-md uppercase">Max: 10 dhibcood</span>
                      <span className="text-lg">🔊</span>
                    </div>
                    <h5 className="font-black text-slate-900 text-xs mt-3">Tajwiidka (Tajweed Practicality)</h5>
                    <p className="text-[11px] text-slate-500 leading-relaxed font-semibold mt-1.5">
                      Codbixinta saxda ah, ku dhawaaqista xarfaha (Makhraj) iyo fulinta xeerarka asaasiga ah ee Tajwiidka.
                    </p>
                  </div>
                  <div className="bg-white px-2.5 py-1.5 rounded-xl border border-amber-100/30 mt-4">
                    <span className="text-[10px] text-amber-800 font-extrabold font-mono">Xeerarka dhawaaq (10%)</span>
                  </div>
                </div>

                {/* Rule Item 5 */}
                <div className="p-5 rounded-2xl bg-rose-50/20 border border-rose-100/50 relative overflow-hidden flex flex-col justify-between">
                  <div className="absolute top-0 right-0 w-16 h-16 bg-rose-500/5 rounded-full -mr-4 -mt-4" />
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="bg-rose-600 text-white font-extrabold text-[10px] px-2 py-0.5 rounded-md uppercase">Max: 10 dhibcood</span>
                      <span className="text-lg">⭐</span>
                    </div>
                    <h5 className="font-black text-slate-900 text-xs mt-3">Akhlaaqda & Nadaafadda (Conduct)</h5>
                    <p className="text-[11px] text-slate-500 leading-relaxed font-semibold mt-1.5">
                      Akhlaaqda shakhsiga ah ee dugsiga dhexdiisa, ixtiraamka macallimiinta, la dhaqanka ardayda kale, iyo daryeelka nadaafadda jirka & dharka dugsiga.
                    </p>
                  </div>
                  <div className="bg-white px-2.5 py-1.5 rounded-xl border border-rose-100/30 mt-4">
                    <span className="text-[10px] text-rose-800 font-extrabold font-mono">Edaabta & Nadaafada (10%)</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Part 2: Monthly Assessment Calculations & Competition Groups */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Grading Scheme & Formulas */}
              <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
                <div>
                  <h4 className="text-xs font-black text-slate-900 border-b border-slate-100 pb-3 uppercase tracking-widest flex items-center gap-2">
                    <span className="text-indigo-650">🏆</span> 2. Qiimaynta bishii & buundooyinka / monthly evaluation & grade boundaries
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-1 leading-relaxed font-semibold">
                    Dhibcaha imtixaanka ee bishii waxaa lagu xisaabiyaa celceliska xisaabeed (Mathematical Average) ee dhammaan imtixaanadii toddobaad ee la galay bishaas gudaheeda.
                  </p>
                </div>

                <div className="bg-indigo-50/20 p-4 rounded-2xl border border-indigo-100/60 font-mono text-[10px] text-indigo-900 space-y-1 my-3">
                  <div className="font-extrabold underline">Qaab Heereedka Celceliska:</div>
                  <div className="font-bold">Monthly Score % = [Σ (Weekly Totals) ÷ Count of Weeks]</div>
                </div>

                <div className="space-y-2 pt-2">
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                    <span className="font-bold text-slate-800">🎖️ Mumtaas / Grade A</span>
                    <span className="px-2.5 py-0.5 rounded bg-emerald-50 text-emerald-800 font-black border border-emerald-100 text-[10px]">90% – 100%</span>
                  </div>
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                    <span className="font-bold text-slate-800">🥈 Jayid Jiddan / Grade B</span>
                    <span className="px-2.5 py-0.5 rounded bg-teal-50 text-teal-850 font-black border border-teal-100 text-[10px]">80% – 89.9%</span>
                  </div>
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                    <span className="font-bold text-slate-800">🥉 Jayid / Grade C</span>
                    <span className="px-2.5 py-0.5 rounded bg-indigo-50 text-indigo-850 font-black border border-indigo-100 text-[10px]">70% – 79.9%</span>
                  </div>
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                    <span className="font-bold text-slate-800">🎗️ Maqbuul / Grade D</span>
                    <span className="px-2.5 py-0.5 rounded bg-amber-50 text-amber-800 font-black border border-amber-100 text-[10px]">60% – 69.9%</span>
                  </div>
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                    <span className="font-bold text-slate-800">❌ Daciif / Grade F</span>
                    <span className="px-2.5 py-0.5 rounded bg-rose-50 text-rose-800 font-black border border-rose-100 text-[10px]">Hoos ka 60% (Failed)</span>
                  </div>
                </div>
              </div>

              {/* Competition levels & support structures */}
              <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
                <div>
                  <h4 className="text-xs font-black text-slate-900 border-b border-slate-100 pb-3 uppercase tracking-widest flex items-center gap-2">
                    <span className="text-indigo-650">🚩</span> 3. Kooxaha tartanka & daryeelka / competition groupings
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-1 leading-relaxed font-semibold">
                    Marka laga duulo dhibcaha iyo heerka ardayga, nidaamku wuxuu si dabiici ah ugu meeleeyaa kooxaha kala duwan ee guulaha si loo dhiirigeliyo ama loo taageero:
                  </p>
                </div>

                <div className="space-y-3.5 pt-2">
                  <div className="flex items-start gap-3">
                    <span className="px-2 py-0.5 font-black rounded text-[9px] bg-emerald-50 text-emerald-800 border border-emerald-100 font-mono mt-0.5 w-[90px] text-center shrink-0">GROUP A</span>
                    <div className="text-xs">
                      <strong className="text-slate-900 block leading-tight">Elite Standing (Champions)</strong>
                      <span className="text-slate-500 font-bold leading-relaxed">Ardayda ugu horreysa dhibcaha dhexdooda. Waxay xaq u leeyihiin maamuus sare iyo ka qeybgalka tartamada dowladdo ama gobol ka dhici doona oo Subuc matalaya.</span>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <span className="px-2 py-0.5 font-black rounded text-[9px] bg-teal-50 text-teal-800 border border-teal-100 font-mono mt-0.5 w-[90px] text-center shrink-0">GROUP B</span>
                    <div className="text-xs">
                      <strong className="text-slate-900 block leading-tight">Advanced Track (Great Growth)</strong>
                      <span className="text-slate-500 font-bold leading-relaxed">Ardayda dhibcaha aadka u fiican leh, iyagana waxaa loo qaadaa daryeel u sii dhiirigeliya inay Group A gaaraan.</span>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <span className="px-2 py-0.5 font-black rounded text-[9px] bg-indigo-50 text-indigo-850 border border-indigo-100 font-mono mt-0.5 w-[90px] text-center shrink-0">GROUP C</span>
                    <div className="text-xs">
                      <strong className="text-slate-900 block leading-tight">Intermediate Range (Stable Progress)</strong>
                      <span className="text-slate-500 font-bold leading-relaxed">Dhabaha guud ee barashada. Heer xasilon oo lagu kalsoonaan karo balse loo baahan yahay inay sameeyaan dhiirigelin.</span>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <span className="px-2 py-0.5 font-black rounded text-[9px] bg-amber-50 text-amber-800 border border-amber-100 font-mono mt-0.5 w-[90px] text-center shrink-0">GROUP D</span>
                    <div className="text-xs">
                      <strong className="text-slate-900 block leading-tight">Revision Needed (Occasional Support)</strong>
                      <span className="text-slate-500 font-bold leading-relaxed">Waxay u baahan yahiin cashar eegid toddobaadle ah si ay kor ugu soo kacaan dhibcahooda guud soona gaaraan heerarka sare.</span>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <span className="px-2 py-0.5 font-black rounded text-[9px] bg-rose-50 text-rose-800 border border-rose-100 font-mono mt-0.5 w-[90px] text-center shrink-0">GROUP E</span>
                    <div className="text-xs">
                      <strong className="text-slate-900 block leading-tight">Intensive Care (Action Plan Required)</strong>
                      <span className="text-slate-500 font-bold leading-relaxed">Ardayda daciifka ah ee loo qorsheynayo cashar hordhac ah oo gaar ah iyo kulan wada-tashi oo dhexmara Maamulaha, Macallinka iyo Waalidka ardayga.</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        </div>
      </main>

      {/* -------------------------------------------------------------
          MODAL: STUDENT FULL INFORMATION PROFILE
          ------------------------------------------------------------- */}
      {showStudentDetailModal && (
        <div 
          className="fixed inset-0 bg-slate-900/65 flex items-center justify-center p-4 z-50 animate-fade-in overflow-y-auto" 
          id="student-detail-modal-bg"
          onClick={(e) => {
            if ((e.target as HTMLElement).id === 'student-detail-modal-bg') {
              setShowStudentDetailModal(null);
            }
          }}
        >
          <motion.div
            initial={{ scale: 0.96, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh]"
            id="student-detail-modal-wrapper"
          >
            {/* Header */}
            <div className="p-6 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <span className="p-2 bg-indigo-500/20 text-indigo-300 rounded-xl inline-flex">
                  <Users className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="font-extrabold text-base tracking-tight text-white">Student Profile Information</h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Macluumaadka Guud ee Ardayga</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowStudentDetailModal(null)}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center cursor-pointer transition-all"
                title="Close modal"
              >
                ✕
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="p-6 sm:p-8 overflow-y-auto space-y-6">
              {/* Profile Top Row */}
              <div className="flex flex-col sm:flex-row items-center gap-5 pb-5 border-b border-slate-100">
                <div className="w-24 h-24 rounded-2xl overflow-hidden shrink-0 bg-slate-50 border-2 border-slate-200 flex items-center justify-center shadow-inner relative">
                  {showStudentDetailModal.imageUrl ? (
                    <img referrerPolicy="no-referrer" src={showStudentDetailModal.imageUrl} alt={showStudentDetailModal.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="text-xl text-indigo-600 font-black tracking-wider">
                      {showStudentDetailModal.name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase() || 'ST'}
                    </div>
                  )}
                </div>

                <div className="text-center sm:text-left space-y-1.5 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5">
                    <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-none truncate">
                      {showStudentDetailModal.name}
                    </h2>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border uppercase tracking-wider ${
                      showStudentDetailModal.active
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                        : 'bg-rose-50 text-rose-700 border-rose-100'
                    }`}>
                      {showStudentDetailModal.active ? 'Active / Firfircoon' : 'Suspended / Hakad'}
                    </span>
                  </div>

                  <p className="text-xs text-slate-500 font-bold flex items-center justify-center sm:justify-start gap-1">
                    <span className="text-slate-400 font-semibold">Student Identifier:</span> 
                    <span className="font-mono text-slate-700 font-extrabold bg-slate-100 px-1.5 py-0.5 rounded">{showStudentDetailModal.id}</span>
                  </p>

                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 text-xs text-slate-450 font-bold pt-1">
                    <span className="bg-slate-50 border border-slate-150 px-2 py-1 rounded-lg">
                      🗓️ Registered: <span className="text-slate-700 font-extrabold">{showStudentDetailModal.registrationDate || '2026-05-15'}</span>
                    </span>
                    <span className="bg-indigo-50 text-indigo-750 border border-indigo-100 px-2 py-1 rounded-lg">
                      ⏱️ Shift: <span className="font-extrabold uppercase">{showStudentDetailModal.session || 'Both'}</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Grid: Personal & Academic Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-3.5">
                  <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-wider border-b border-slate-200/50 pb-1.5">
                    Academic & Standing Details
                  </h4>
                  <div className="space-y-2.5 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500 font-semibold">Age / Da'da:</span>
                      <span className="text-slate-800 font-extrabold bg-white px-2 py-0.5 rounded border border-slate-200 shadow-3xs">
                        {showStudentDetailModal.age !== undefined ? `${showStudentDetailModal.age} Sannadood` : 'Unspecified'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500 font-semibold">Assigned Class / Fasalka:</span>
                      <span className="text-slate-800 font-black truncate max-w-[150px]">{showStudentDetailModal.className}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500 font-semibold">Instructor / Macallinka:</span>
                      <span className="text-slate-800 font-extrabold">
                        {(() => {
                          const teach = database.teachers.find(t => t.id === showStudentDetailModal.teacherId);
                          return teach ? teach.name : 'Unassigned';
                        })()}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-3.5">
                  <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-wider border-b border-slate-200/50 pb-1.5">
                    Ranking & Outlook Trend
                  </h4>
                  <div className="space-y-2.5 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500 font-semibold">Standing Group:</span>
                      {(() => {
                        const compGroup = getStudentCompetitionGroup(showStudentDetailModal.id);
                        return (
                          <span className={`px-2 py-0.5 rounded text-[10px] font-black border uppercase tracking-wider ${
                            compGroup.group.includes('Group A') ? 'bg-emerald-50 text-emerald-800 border-emerald-100' :
                            compGroup.group.includes('Group B') ? 'bg-teal-50 text-teal-800 border-teal-100' :
                            compGroup.group.includes('Group C') ? 'bg-indigo-50 text-indigo-850 border-indigo-100' :
                            compGroup.group.includes('Group D') ? 'bg-amber-50 text-amber-800 border-amber-100' :
                            compGroup.group.includes('Group E') ? 'bg-rose-50 text-rose-800 border-rose-100' :
                            'bg-slate-100 text-slate-500 border-slate-200'
                          }`}>
                            {compGroup.group}
                          </span>
                        );
                      })()}
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500 font-semibold">Progress Trend:</span>
                      {(() => {
                        const trend = getStudentProgressTrend(showStudentDetailModal.id);
                        return (
                          <span className="font-extrabold text-slate-700 flex items-center gap-1">
                            {trend.icon} {trend.trend}
                          </span>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              </div>

              {/* Parental details */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-3">
                <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-wider border-b border-slate-200/50 pb-1.5">
                  Parent / Guardian Information (Waalidka)
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-slate-400 block font-semibold">Magaca Waalidka / Name:</span>
                    <span className="text-slate-800 font-extrabold text-sm">{showStudentDetailModal.parentName}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-semibold">Taleefanka Waalidka / Contact Phone:</span>
                    <a 
                      href={`tel:${showStudentDetailModal.parentPhone}`}
                      className="text-indigo-600 hover:text-indigo-800 font-mono font-extrabold text-sm hover:underline flex items-center gap-1"
                    >
                      📞 {showStudentDetailModal.parentPhone}
                    </a>
                  </div>
                </div>
              </div>

              {/* Financials */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-3">
                <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-wider border-b border-slate-200/50 pb-1.5">
                  Financial Terms (Lacagaha)
                </h4>
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div className="p-3 bg-white border border-slate-200/60 rounded-xl">
                    <span className="text-slate-450 block font-bold text-[10px] uppercase">Tuition Fee Due / Lacagta Bisha</span>
                    <span className="text-teal-700 font-black text-lg block mt-0.5">${showStudentDetailModal.monthlyFee} USD</span>
                  </div>
                  <div className="p-3 bg-white border border-slate-200/60 rounded-xl">
                    <span className="text-slate-450 block font-bold text-[10px] uppercase">Bus Fare Due / Lacagta Baska</span>
                    <span className="text-indigo-700 font-black text-lg block mt-0.5">
                      {showStudentDetailModal.busFee ? `$${showStudentDetailModal.busFee} USD` : '$0.00 (N/A)'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Media status summary */}
              <div className="bg-indigo-50/40 p-4 rounded-2xl border border-indigo-100/50 space-y-3">
                <h4 className="text-[11px] font-black text-indigo-700 uppercase tracking-wider border-b border-indigo-100/60 pb-1.5">
                  MediaRecitations & Capture Highlights
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="flex items-center gap-2 bg-white/60 p-2.5 rounded-xl border border-indigo-100/30">
                    <span className="text-base">🎙️</span>
                    <div>
                      <span className="block text-[10px] text-slate-400 font-bold uppercase leading-none">Last Audio Recorded</span>
                      <span className="text-slate-700 font-extrabold mt-0.5 block">
                        {showStudentDetailModal.voiceUrl ? `Captured (${showStudentDetailModal.voiceDate || 'Recently'})` : 'No audio recitations on file'}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 bg-white/60 p-2.5 rounded-xl border border-indigo-100/30">
                    <span className="text-base">📹</span>
                    <div>
                      <span className="block text-[10px] text-slate-400 font-bold uppercase leading-none">Last Behavior Video</span>
                      <span className="text-slate-700 font-extrabold mt-0.5 block">
                        {showStudentDetailModal.videoUrl ? `Captured (${showStudentDetailModal.videoDate || 'Recently'})` : 'No videos on file'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setShowStudentDetailModal(null)}
                className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl cursor-pointer transition-all shadow-md"
              >
                Close Profile
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* -------------------------------------------------------------
          MODAL: COLLECTED FEES DETAILED BREAKDOWN
          ------------------------------------------------------------- */}
      {showCollectedFeesBreakdownMonth && (() => {
        const month = showCollectedFeesBreakdownMonth;
        const monthName = getFriendlyMonthName(month);
        
        // Find all regular billing records for this month that are Paid or Partial
        const monthBillingPayments = database.billing.filter(b => b.month === month && (b.status === 'Paid' || b.status === 'Partial'));
        
        // Find all registration and file fees from invoices for this month
        const monthInvoices = (database.invoices || []).filter(inv => inv.date && inv.date.startsWith(month));
        
        const invoicePayments: Array<{
          invoiceNo: string;
          recipientName: string;
          description: string;
          quantity: number;
          unitPrice: number;
          total: number;
          paidAmount: number;
          date: string;
        }> = [];
        
        for (const inv of monthInvoices) {
          if (inv.totalAmount <= 0 || inv.amountPaid <= 0) continue;
          const paidFraction = inv.amountPaid / inv.totalAmount;
          
          for (const item of inv.items) {
            const desc = item.description.toLowerCase();
            const isReg = desc.includes('diiwan') || desc.includes('regis');
            const isFile = desc.includes('fayl') || desc.includes('file');
            
            if (isReg || isFile) {
              const itemTotal = item.quantity * item.unitPrice;
              const itemPaid = itemTotal * paidFraction;
              invoicePayments.push({
                invoiceNo: inv.invoiceNo,
                recipientName: inv.recipientName || inv.studentName || 'N/A',
                description: item.description,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                total: itemTotal,
                paidAmount: Number(itemPaid.toFixed(2)),
                date: inv.date
              });
            }
          }
        }
        
        const totalTuitionPaid = monthBillingPayments.reduce((sum, r) => sum + r.amountPaid, 0);
        const totalRegFilesPaid = invoicePayments.reduce((sum, item) => sum + item.paidAmount, 0);
        const grandTotal = totalTuitionPaid + totalRegFilesPaid;

        return (
          <div 
            className="fixed inset-0 bg-slate-900/60 flex items-center justify-center p-4 z-55 animate-fade-in overflow-y-auto pointer-print-none" 
            id="collected-fees-modal-bg"
            onClick={(e) => {
              if ((e.target as HTMLElement).id === 'collected-fees-modal-bg') {
                setShowCollectedFeesBreakdownMonth(null);
              }
            }}
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white rounded-3xl shadow-xl border border-slate-100 max-w-3xl w-full overflow-hidden flex flex-col max-h-[85vh]"
            >
              {/* Modal Header */}
              <div className="p-6 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                    <CircleDollarSign className="w-5 h-5 text-teal-600" />
                    Lacagaha la Ururiyay (Collected Fees Breakdown)
                  </h3>
                  <p className="text-xs text-slate-500 font-semibold mt-1">Detailed list of payments received in {monthName}</p>
                </div>
                <button 
                  type="button"
                  onClick={() => setShowCollectedFeesBreakdownMonth(null)}
                  className="p-1 px-2 text-xs font-bold text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all"
                >
                  Xir (Close)
                </button>
              </div>

              {/* Scrollable Body */}
              <div className="p-6 overflow-y-auto space-y-6 flex-1 scrollbar-thin">
                
                {/* Visual Summary Widget */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100/60">
                    <span className="text-[10px] text-emerald-800 uppercase font-bold block mb-1">Tuition Fees Collected</span>
                    <span className="block text-2xl font-extrabold text-emerald-900">${totalTuitionPaid.toFixed(2)}</span>
                    <p className="text-[10px] text-emerald-600/80 mt-1 font-semibold">{monthBillingPayments.length} student payments</p>
                  </div>
                  
                  <div className="bg-teal-50/50 p-4 rounded-2xl border border-teal-100/60">
                    <span className="text-[10px] text-teal-800 uppercase font-bold block mb-1">Registration & Files</span>
                    <span className="block text-2xl font-extrabold text-teal-900">${totalRegFilesPaid.toFixed(2)}</span>
                    <p className="text-[10px] text-teal-600/80 mt-1 font-semibold">{invoicePayments.length} registration / file entries</p>
                  </div>

                  <div className="bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100/60">
                    <span className="text-[10px] text-indigo-800 uppercase font-bold block mb-1">Total Month Revenue</span>
                    <span className="block text-2xl font-black text-indigo-950">${grandTotal.toFixed(2)}</span>
                    <p className="text-[10px] text-indigo-600 mt-1 font-semibold">Matched to active dashboard sum</p>
                  </div>
                </div>

                {/* Section 1: Monthly Tuition Fees */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                      1. Khidmadaha Bisha ee Ardayda (Monthly Tuition & Class Fees)
                    </h4>
                    <span className="text-xs font-extrabold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-lg">
                      ${totalTuitionPaid.toFixed(2)}
                    </span>
                  </div>

                  {monthBillingPayments.length === 0 ? (
                    <p className="text-xs text-slate-400 italic text-center py-4 bg-slate-50 rounded-2xl border border-dashed border-slate-150">
                      No tuition payments logged for this month.
                    </p>
                  ) : (
                    <div className="overflow-x-auto rounded-2xl border border-slate-100">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-slate-50 text-slate-400 font-bold border-b border-slate-150 uppercase tracking-wider">
                            <th className="py-2.5 px-3">Student Name (Ardayga)</th>
                            <th className="py-2.5 px-3">Class (Fasalka)</th>
                            <th className="py-2.5 px-3">Date (Taariikh)</th>
                            <th className="py-2.5 px-3">Receipt / Ref</th>
                            <th className="py-2.5 px-3 text-right">Amount (Lacagta)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {monthBillingPayments.map((p, idx) => (
                            <tr key={p.id || idx} className="hover:bg-slate-50/40">
                              <td className="py-2 px-3 font-bold text-slate-800">
                                {p.studentName}
                                <span className="block text-[10px] text-slate-400 font-medium">ID: {p.studentId}</span>
                              </td>
                              <td className="py-2 px-3 font-semibold text-slate-600">{p.className}</td>
                              <td className="py-2 px-3 text-slate-500">{p.paymentDate || 'N/A'}</td>
                              <td className="py-2 px-3 font-mono text-[10px] text-slate-500">
                                {p.receiptNo || (p.notes && p.notes.includes('Synced from') ? p.notes.split('Synced from')[1].trim() : 'Manual Direct')}
                              </td>
                              <td className="py-2 px-3 text-right font-black text-teal-700">${p.amountPaid.toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Section 2: Registration and Files Fees from parent invoices */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-teal-500 inline-block" />
                      2. Lacagaha Diiwaangelinta & Faylasha (Registration & File Fees)
                    </h4>
                    <span className="text-xs font-extrabold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-lg">
                      ${totalRegFilesPaid.toFixed(2)}
                    </span>
                  </div>

                  {invoicePayments.length === 0 ? (
                    <p className="text-xs text-slate-400 italic text-center py-4 bg-slate-50 rounded-2xl border border-dashed border-slate-150">
                      No registration or file payments logged for this month.
                    </p>
                  ) : (
                    <div className="overflow-x-auto rounded-2xl border border-slate-100">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-slate-50 text-slate-400 font-bold border-b border-slate-150 uppercase tracking-wider">
                            <th className="py-2.5 px-3">Parent Name (Waalidka)</th>
                            <th className="py-2.5 px-3">Description (Faahfaahin)</th>
                            <th className="py-2.5 px-3">Date (Taariikh)</th>
                            <th className="py-2.5 px-3">Invoice No</th>
                            <th className="py-2.5 px-3 text-right">Amount (Lacagta)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {invoicePayments.map((item, idx) => (
                            <tr key={idx} className="hover:bg-slate-50/40">
                              <td className="py-2 px-3 font-bold text-slate-800">{item.recipientName}</td>
                              <td className="py-2 px-3 font-semibold text-slate-600">{item.description}</td>
                              <td className="py-2 px-3 text-slate-500">{item.date || 'N/A'}</td>
                              <td className="py-2 px-3 font-mono text-[10px] text-slate-500">{item.invoiceNo}</td>
                              <td className="py-2 px-3 text-right font-black text-teal-700">${item.paidAmount.toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                <p className="text-[10px] text-slate-450 text-center italic mt-4">
                  * Note: School bus transportation fares (Totaling ${Number(currentMonthBusCollected).toFixed(2)} in {monthName}) are tracked separately in the Bus Fare Statistics deck.
                </p>

              </div>

              {/* Modal Footer */}
              <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3 pointer-print-none">
                <button
                  type="button"
                  onClick={() => setShowCollectedFeesBreakdownMonth(null)}
                  className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl cursor-pointer transition-all shadow-md"
                >
                  Xir (Close)
                </button>
              </div>
            </motion.div>
          </div>
        );
      })()}

      {/* -------------------------------------------------------------
          MODAL: BUS COLLECTED FEES DETAILED BREAKDOWN
          ------------------------------------------------------------- */}
      {showBusCollectedBreakdownMonth && (() => {
        const month = showBusCollectedBreakdownMonth;
        const monthName = getFriendlyMonthName(month);
        
        // Find all billing records for this month with bus fee paid > 0
        const monthBusPayments = database.billing.filter(b => b.month === month && Number(b.busFeePaid || 0) > 0);
        
        const totalBusCollected = monthBusPayments.reduce((sum, r) => sum + Number(r.busFeePaid || 0), 0);
        const totalBusInvoiced = database.students.filter(s => s.active && s.busFee && Number(s.busFee) > 0).reduce((sum, s) => sum + Number(s.busFee || 0), 0);
        const totalBusPending = Math.max(0, totalBusInvoiced - totalBusCollected);

        return (
          <div 
            className="fixed inset-0 bg-slate-900/60 flex items-center justify-center p-4 z-55 animate-fade-in overflow-y-auto pointer-print-none" 
            id="bus-collected-fees-modal-bg"
            onClick={(e) => {
              if ((e.target as HTMLElement).id === 'bus-collected-fees-modal-bg') {
                setShowBusCollectedBreakdownMonth(null);
              }
            }}
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white rounded-3xl shadow-xl border border-slate-100 max-w-3xl w-full overflow-hidden flex flex-col max-h-[85vh]"
            >
              {/* Modal Header */}
              <div className="p-6 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                    <CircleDollarSign className="w-5 h-5 text-teal-600" />
                    Faahfaahinta Lacagta Baska (Bus Fare Collected Breakdown)
                  </h3>
                  <p className="text-xs text-slate-500 font-semibold mt-1">Detailed list of bus transit payments received in {monthName}</p>
                </div>
                <button 
                  type="button"
                  onClick={() => setShowBusCollectedBreakdownMonth(null)}
                  className="p-1 px-2 text-xs font-bold text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all"
                >
                  Xir (Close)
                </button>
              </div>

              {/* Scrollable Body */}
              <div className="p-6 overflow-y-auto space-y-6 flex-1 scrollbar-thin">
                
                {/* Visual Summary Widget */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100/60">
                    <span className="text-[10px] text-indigo-800 uppercase font-bold block mb-1">Expected Bus Fare</span>
                    <span className="block text-2xl font-extrabold text-indigo-900">${totalBusInvoiced.toFixed(2)}</span>
                    <p className="text-[10px] text-indigo-600/80 mt-1 font-semibold">Active registered riders dues</p>
                  </div>
                  
                  <div className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100/60">
                    <span className="text-[10px] text-emerald-800 uppercase font-bold block mb-1">Bus Collected</span>
                    <span className="block text-2xl font-extrabold text-emerald-900">${totalBusCollected.toFixed(2)}</span>
                    <p className="text-[10px] text-emerald-600/80 mt-1 font-semibold">{monthBusPayments.length} riders paid</p>
                  </div>

                  <div className="bg-amber-50/50 p-4 rounded-2xl border border-amber-100/60">
                    <span className="text-[10px] text-amber-800 uppercase font-bold block mb-1">Pending Bus Fare</span>
                    <span className="block text-2xl font-black text-amber-950">${totalBusPending.toFixed(2)}</span>
                    <p className="text-[10px] text-amber-600 mt-1 font-semibold">Outstanding transit dues</p>
                  </div>
                </div>

                {/* Section: Bus Transit Payments */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-indigo-500 inline-block" />
                      Liiska Bixiyayaasha (Transit Rider Payments Ledger)
                    </h4>
                    <span className="text-xs font-extrabold text-indigo-900 bg-indigo-50 px-2.5 py-1 rounded-lg">
                      ${totalBusCollected.toFixed(2)} USD
                    </span>
                  </div>

                  {monthBusPayments.length === 0 ? (
                    <p className="text-xs text-slate-400 italic text-center py-6 bg-slate-50 rounded-2xl border border-dashed border-slate-150">
                      No school bus transit payments logged for this month yet.
                    </p>
                  ) : (
                    <div className="overflow-x-auto rounded-2xl border border-slate-100">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-slate-50 text-slate-400 font-bold border-b border-slate-150 uppercase tracking-wider">
                            <th className="py-2.5 px-3">Student Name (Ardayga)</th>
                            <th className="py-2.5 px-3">Class (Fasalka)</th>
                            <th className="py-2.5 px-3">Date (Taariikh)</th>
                            <th className="py-2.5 px-3">Receipt / Ref</th>
                            <th className="py-2.5 px-3 text-right">Bus Fee Due</th>
                            <th className="py-2.5 px-3 text-right">Bus Fee Paid</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {monthBusPayments.map((p, idx) => (
                            <tr key={p.id || idx} className="hover:bg-slate-50/40">
                              <td className="py-2 px-3 font-bold text-slate-800">
                                {p.studentName}
                                <span className="block text-[10px] text-slate-400 font-medium">ID: {p.studentId}</span>
                              </td>
                              <td className="py-2 px-3 font-semibold text-slate-600">{p.className}</td>
                              <td className="py-2 px-3 text-slate-500">{p.paymentDate || 'N/A'}</td>
                              <td className="py-2 px-3 font-mono text-[10px] text-slate-500">
                                {p.receiptNo || (p.notes && p.notes.includes('Synced from') ? p.notes.split('Synced from')[1].trim() : 'Manual Direct')}
                              </td>
                              <td className="py-2 px-3 text-right text-slate-600 font-medium">${Number(p.busFeeDue || 0).toFixed(2)}</td>
                              <td className="py-2 px-3 text-right font-black text-indigo-700">${Number(p.busFeePaid || 0).toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

              </div>

              {/* Modal Footer */}
              <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3 pointer-print-none">
                <button
                  type="button"
                  onClick={() => setShowBusCollectedBreakdownMonth(null)}
                  className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl cursor-pointer transition-all shadow-md"
                >
                  Xir (Close)
                </button>
              </div>
            </motion.div>
          </div>
        );
      })()}

      {/* -------------------------------------------------------------
          MODAL 1: PRINT STUDENT PAYMENT RECEIPT VOUCHER
          ------------------------------------------------------------- */}
      {showReceiptModal && (
        <div 
          className="fixed inset-0 bg-slate-900/60 flex items-center justify-center p-4 z-50 animate-fade-in overflow-y-auto pointer-print-none" 
          id="receipt-modal-bg"
          onClick={(e) => {
            if ((e.target as HTMLElement).id === 'receipt-modal-bg') {
              setShowReceiptModal(null);
            }
          }}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-md bg-white rounded-3xl shadow-2xl relative overflow-hidden flex flex-col max-h-[85vh] sm:max-h-[90vh] my-auto"
            id="receipt-print-wrapper"
          >
            {/* Action Header bar inside modal */}
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between pointer-print-none flex-wrap gap-2">
              <span className="font-bold text-xs uppercase tracking-widest text-slate-400 font-bold">Xarunta Daabacaada Rasiidka</span>
              <div className="flex gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => setShowReceiptModal(null)}
                  className="py-1.5 px-3 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-lg cursor-pointer inline-flex items-center gap-1 transition-colors border border-slate-700 font-bold"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Gadaal
                </button>
                <button
                  type="button"
                  onClick={() => handleDownloadReceiptPDF(showReceiptModal)}
                  className="py-1.5 px-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-lg inline-flex items-center gap-1 transition-all cursor-pointer font-bold"
                >
                  <Download className="w-3.5 h-3.5" />
                  La soo deg PDF
                </button>
                <button
                  type="button"
                  onClick={() => handleDownloadReceiptText(showReceiptModal)}
                  className="py-1.5 px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg inline-flex items-center gap-1 transition-all cursor-pointer font-bold"
                >
                  <Download className="w-3.5 h-3.5" />
                  La soo deg TXT
                </button>
                <button
                  type="button"
                  onClick={() => handlePrintElement('printable-receipt-card')}
                  className="py-1.5 px-2.5 bg-teal-500 hover:bg-teal-600 text-slate-900 font-bold text-xs rounded-lg inline-flex items-center gap-1 transition-all cursor-pointer font-bold"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Daabac Rasiidka
                </button>
              </div>
            </div>

            {/* printable receipt frame */}
            <div className="p-6 md:p-8 text-slate-900 bg-white overflow-y-auto flex-1 scrollbar-thin" id="printable-receipt-card">
              <div className="text-center pb-5 border-b border-dashed border-slate-300">
                <h2 className="text-xl font-black uppercase tracking-tight text-slate-950 font-lutfey">DUGSIGA SUBUC</h2>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Rasiidka Lacag-bixinta Rasmiga ah ee Ardayga</p>
                <p className="text-[9px] text-slate-500 mt-0.5 font-bold">Xafiiska Maamulka Garowe</p>
              </div>

              {/* Details table */}
              <div className="py-5 space-y-4 text-xs font-semibold">
                <div className="grid grid-cols-2 gap-y-3">
                  <div>
                    <span className="block text-[10px] text-slate-400 uppercase font-black">Tirada Rasiidka</span>
                    <span className="text-slate-900 font-mono text-xs">{showReceiptModal.receiptNo || 'may'}</span>
                  </div>
                  <div className="text-right">
                    <span className="block text-[10px] text-slate-400 uppercase font-black">Taariikhda Bixinta</span>
                    <span className="text-slate-900">{showReceiptModal.paymentDate || 'may'}</span>
                  </div>

                  <div>
                    <span className="block text-[10px] text-slate-400 uppercase font-black">Magaca Ardayga</span>
                    <span className="text-slate-900 font-extrabold">{showReceiptModal.studentName}</span>
                    <span className="block text-[10px] text-slate-400 font-mono">ID: {showReceiptModal.studentId}</span>
                  </div>
                  <div className="text-right">
                    <span className="block text-[10px] text-slate-400 uppercase font-black font-medium">Fasalka</span>
                    <span className="text-slate-900 text-xs font-bold">{showReceiptModal.className}</span>
                  </div>
                </div>

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-2 mt-4">
                  <div className="flex justify-between items-center pb-2 border-b border-slate-200/60">
                    <div>
                      <span className="block text-[10px] text-slate-400 uppercase font-bold">Muddada Biilka</span>
                      <span className="text-slate-900 font-bold">Khidmadda {showReceiptModal.month}</span>
                    </div>
                    <div className="text-right">
                      <span className="block text-[10px] text-slate-400 uppercase font-bold mb-0.5">Heerka Rasiidka</span>
                      <span className={`font-black text-[10px] uppercase border px-2 py-0.5 rounded-md ${
                        showReceiptModal.status === 'Paid'
                           ? 'text-emerald-700 bg-emerald-50 border-emerald-100'
                           : showReceiptModal.status === 'Partial'
                           ? 'text-amber-700 bg-amber-50 border-amber-100'
                           : 'text-rose-700 bg-rose-50 border-rose-100'
                      }`}>
                        {showReceiptModal.status === 'Paid' ? 'LA BIXIYAY' : showReceiptModal.status === 'Partial' ? 'QEYB BAA LA BIXIYAY' : 'LAMA BIXIN'}
                      </span>
                    </div>
                  </div>

                  <div className="flex justify-between text-xs font-semibold text-slate-600 pt-1">
                    <span>Lacagta bisha ee laga rabo (Tuition Due):</span>
                    <span className="text-slate-900">${Number(showReceiptModal.amountDue !== undefined ? showReceiptModal.amountDue : showReceiptModal.amountPaid).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-xs font-semibold text-slate-600">
                    <span>Lacagta bisha ee la bixiyay (Tuition Paid):</span>
                    <span className="text-emerald-700 font-semibold">${Number(showReceiptModal.amountPaid).toFixed(2)}</span>
                  </div>

                  {(Number(showReceiptModal.busFeeDue || 0) > 0 || Number(showReceiptModal.busFeePaid || 0) > 0) && (
                    <>
                      <div className="flex justify-between text-xs font-semibold text-slate-600 pt-1.5 border-t border-slate-200/40">
                        <span>Lacagta baska ee laga rabo (Bus Due):</span>
                        <span className="text-slate-900">${Number(showReceiptModal.busFeeDue || 0).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-xs font-semibold text-slate-600">
                        <span>Lacagta baska ee la bixiyay (Bus Paid):</span>
                        <span className="text-emerald-750 font-semibold">${Number(showReceiptModal.busFeePaid || 0).toFixed(2)}</span>
                      </div>
                    </>
                  )}

                  <div className="flex justify-between text-xs font-extrabold text-slate-900 pt-1.5 border-t border-slate-300 mt-1">
                    <span>Total Paid (Guud ahaan La Bixiyay):</span>
                    <span className="text-emerald-800">${Number(Number(showReceiptModal.amountPaid) + Number(showReceiptModal.busFeePaid || 0)).toFixed(2)}</span>
                  </div>

                  <div className="flex justify-between text-xs font-semibold text-slate-600">
                    <span>Remaining Debt (Haraaga Deynta):</span>
                    <span className={`${(showReceiptModal.debtAmount || 0) > 0 ? 'text-amber-600 font-extrabold' : 'text-slate-900'}`}>
                      ${Number(showReceiptModal.debtAmount !== undefined ? showReceiptModal.debtAmount : 0).toFixed(2)}
                    </span>
                  </div>
                </div>

                {showReceiptModal.notes && (
                  <div className="bg-amber-50/55 p-3 rounded-xl border border-amber-100/60 mt-4 text-xs">
                    <span className="block text-[9px] text-amber-800 uppercase font-black mb-1">Faallooyinka Maamulka & Qoraalada Deynta:</span>
                    <p className="text-slate-800 italic font-medium leading-relaxed">{showReceiptModal.notes}</p>
                  </div>
                )}

                <div className="border-t border-slate-200 pt-4 flex justify-between items-center">
                  <div>
                    <span className="text-slate-500 font-semibold block text-xs">Saxiixa Khasajiga Rasmiga ah</span>
                    <div className="w-24 h-px bg-slate-300 mt-8" />
                  </div>
                  <div className="text-right">
                    <span className="block text-[10px] text-slate-400 uppercase font-black">Xaddiga la Qabtay (Total Collected)</span>
                    <span className="text-xl font-extrabold text-slate-950">${Number(Number(showReceiptModal.amountPaid) + Number(showReceiptModal.busFeePaid || 0)).toFixed(2)} USD</span>
                  </div>
                </div>
              </div>

              {/* print layout footer citation */}
              <div className="text-center pt-4 border-t border-dashed border-slate-300 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                Waad ku mahadsan tahay dadaalkaaga waxbarasho
              </div>
            </div>

          </motion.div>
        </div>
      )}

      {/* -------------------------------------------------------------
          MODAL 1C: CREATE OR EDIT CUSTOM INVOICE (PARENTS & OTHER BUSINESSES)
          ------------------------------------------------------------- */}
      {showInvoiceModal && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center p-4 z-50 animate-fade-in pointer-print-none overflow-y-auto" id="invoice-modal-bg">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-3xl bg-white rounded-3xl shadow-2xl relative overflow-hidden flex flex-col max-h-[92vh] my-auto"
          >
            {/* Header */}
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
              <span className="font-extrabold text-xs uppercase tracking-widest text-emerald-400 flex items-center gap-2">
                <CircleDollarSign className="w-4 h-4 text-emerald-500" />
                {editingInvoice ? `Wax ka bedel Biilka: ${editingInvoice.invoiceNo}` : 'Soo saar Biil / Invoice Cusub'}
              </span>
              <button
                type="button"
                onClick={() => { setShowInvoiceModal(false); setEditingInvoice(null); }}
                className="py-1 px-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-lg cursor-pointer transition-colors"
              >
                Gadaal (Cancel)
              </button>
            </div>

            {/* Scrollable form */}
            <form onSubmit={handleSaveInvoice} className="flex flex-col overflow-hidden max-h-full">
              <div className="p-6 overflow-y-auto space-y-6 scrollbar-thin flex-1 max-h-[75vh]">
                
                {/* Recipient Type Switcher */}
                <div className="grid grid-cols-2 gap-4 bg-slate-50 p-2.5 rounded-2xl border border-slate-150">
                  <button
                    type="button"
                    onClick={() => {
                      setInvFormRecipientType('parent');
                      setInvFormRecipientName('');
                      setInvFormRecipientPhone('');
                      setInvFormStudentId('');
                    }}
                    className={`py-2 px-3 text-xs font-black uppercase rounded-xl transition-all cursor-pointer ${
                      invFormRecipientType === 'parent'
                        ? 'bg-emerald-600 text-white'
                        : 'text-slate-500 hover:bg-slate-100'
                    }`}
                  >
                    Waalid Arday (Parent of Student)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setInvFormRecipientType('business');
                      setInvFormRecipientName('');
                      setInvFormRecipientPhone('');
                      setInvFormStudentId('');
                    }}
                    className={`py-2 px-3 text-xs font-black uppercase rounded-xl transition-all cursor-pointer ${
                      invFormRecipientType === 'business'
                        ? 'bg-emerald-600 text-white'
                        : 'text-slate-500 hover:bg-slate-100'
                    }`}
                  >
                    Ganacsi / Shirkad (Other Business)
                  </button>
                </div>

                {/* Parent Auto-Matcher Selection */}
                {invFormRecipientType === 'parent' && (
                  <div className="bg-slate-50/70 p-5 rounded-2xl border border-dashed border-emerald-250 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                      <div>
                        <label className="block text-[11px] font-black text-emerald-800 uppercase tracking-widest pl-0.5">
                          Dooro Ardayda Waalidka u Diwaan-gashan (Select Parent's Student/s) *
                        </label>
                        <p className="text-[10px] text-slate-500 mt-0.5">
                          Waalidka wuxuu yeelan karaa hal ama arday ka badan. Dooro dhamaan ardayda biilka loo soo saarayo.
                        </p>
                      </div>
                      
                      {/* Active count indicator */}
                      <span className="text-[10px] bg-emerald-100 text-emerald-700 font-extrabold px-2 py-1 rounded-lg self-start">
                        {invFormStudentIds.length} la doortay
                      </span>
                    </div>

                    {/* Selected Student Pills display */}
                    {invFormStudentIds.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5 p-2.5 bg-white border border-slate-150 rounded-xl">
                        {invFormStudentIds.map(sid => {
                          const student = database.students.find(s => s.id === sid);
                          return student ? (
                            <div 
                              key={sid} 
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-bold rounded-lg"
                            >
                              <span>{student.name} ({student.className})</span>
                              <button
                                type="button"
                                onClick={() => setInvFormStudentIds(prev => prev.filter(id => id !== sid))}
                                className="w-3.5 h-3.5 rounded-full hover:bg-emerald-200 text-emerald-600 flex items-center justify-center font-black cursor-pointer text-[10px]"
                                title="Remove"
                              >
                                &times;
                              </button>
                            </div>
                          ) : null;
                        })}
                      </div>
                    ) : (
                      <div className="text-center py-2 text-[11px] font-bold text-amber-600 bg-amber-50 rounded-xl border border-amber-100">
                        ⚠️ Fadlan dooro ugu yaraan hal arday hoos ku qoran!
                      </div>
                    )}

                    {/* Live Search bar inside selection container */}
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Ku baar magaca ardayga, fasalka, ama waalidka..."
                        value={invStudentSearchTerm}
                        onChange={(e) => setInvStudentSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-3.5 py-2 bg-white border border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl text-xs font-semibold text-slate-800 outline-none transition-all"
                      />
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                      {invStudentSearchTerm && (
                        <button
                          type="button"
                          onClick={() => setInvStudentSearchTerm('')}
                          className="absolute right-3 top-2 text-[11px] font-bold text-slate-400 hover:text-slate-600"
                        >
                          Clear
                        </button>
                      )}
                    </div>

                    {/* List of active students */}
                    <div className="max-h-52 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100 bg-white scrollbar-thin">
                      {(() => {
                        const filtered = activeStudents.filter(s => {
                          const term = invStudentSearchTerm.toLowerCase().trim();
                          if (!term) return true;
                          return (s.name || '').toLowerCase().includes(term) ||
                                 (s.parentName || '').toLowerCase().includes(term) ||
                                 (s.className || '').toLowerCase().includes(term);
                        });

                        if (filtered.length === 0) {
                          return (
                            <div className="p-4 text-center text-xs text-slate-400 font-semibold italic">
                              Arday dhoos ku qoran laguma helin baadigaas. (No matching active students)
                            </div>
                          );
                        }

                        return filtered.map(student => {
                          const isSelected = invFormStudentIds.includes(student.id);
                          return (
                            <div 
                              key={student.id} 
                              className={`p-2.5 flex items-center justify-between gap-3 text-xs transition-colors hover:bg-slate-50 ${
                                isSelected ? 'bg-emerald-50/20' : ''
                              }`}
                            >
                              <label className="flex items-center gap-2.5 cursor-pointer flex-1 select-none">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => {
                                    if (isSelected) {
                                      setInvFormStudentIds(prev => prev.filter(id => id !== student.id));
                                    } else {
                                      setInvFormStudentIds(prev => [...prev, student.id]);
                                      // If parent info isn't set, auto fill it or help user
                                      if (!invFormRecipientName) {
                                        setInvFormRecipientName(student.parentName || '');
                                      }
                                      if (!invFormRecipientPhone) {
                                        setInvFormRecipientPhone(student.parentPhone || '');
                                      }
                                    }
                                  }}
                                  className="w-3.5 h-3.5 text-emerald-600 border-slate-300 rounded focus:ring-emerald-500 cursor-pointer"
                                />
                                <div>
                                  <span className="font-extrabold text-slate-900 block">{student.name}</span>
                                  <span className="text-[10px] text-slate-500 font-bold">
                                    Fasalka: {student.className} | Waalidka: {student.parentName || 'ma jiro'}
                                  </span>
                                </div>
                              </label>

                              {/* Quick Auto-fill button */}
                              <button
                                type="button"
                                onClick={() => {
                                  setInvFormRecipientName(student.parentName || '');
                                  setInvFormRecipientPhone(student.parentPhone || '');
                                }}
                                className="px-2 py-1 bg-slate-100 hover:bg-emerald-100 border border-slate-200 hover:border-emerald-250 text-[10px] font-bold rounded-lg text-slate-600 hover:text-emerald-700 transition-all shrink-0 cursor-pointer"
                                title="Auto-fill with parent details"
                              >
                                🔗 Copy Parent Info
                              </button>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  </div>
                )}

                {/* Basic Details Fields */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Recipient Name */}
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 pl-0.5">
                      Magaca Macmiilka (Recipient Name) *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Geli magaca..."
                      value={invFormRecipientName}
                      onChange={(e) => setInvFormRecipientName(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:bg-white rounded-xl text-xs font-bold text-slate-800 outline-none transition-all"
                    />
                  </div>

                  {/* Recipient Phone */}
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 pl-0.5">
                      Telefoonka (Phone) *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Geli taleefoonka..."
                      value={invFormRecipientPhone}
                      onChange={(e) => setInvFormRecipientPhone(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:bg-white rounded-xl text-xs font-bold text-slate-800 outline-none transition-all"
                    />
                  </div>

                  {/* Recipient Email */}
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 pl-0.5">
                      Email-ka (Email - Optional)
                    </label>
                    <input
                      type="email"
                      placeholder="customer@example.com"
                      value={invFormRecipientEmail}
                      onChange={(e) => setInvFormRecipientEmail(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:bg-white rounded-xl text-xs font-bold text-slate-800 outline-none transition-all"
                    />
                  </div>
                </div>

                {/* Dates Configuration */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 pl-0.5">
                      Taariikhda la soo saaray (Invoice Date) *
                    </label>
                    <input
                      type="date"
                      required
                      value={invFormDate}
                      onChange={(e) => setInvFormDate(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:bg-white rounded-xl text-xs font-bold text-slate-800 outline-none transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 pl-0.5">
                      Taariikhda ugu dambaysa ee bixinta (Due Date) *
                    </label>
                    <input
                      type="date"
                      required
                      value={invFormDueDate}
                      onChange={(e) => setInvFormDueDate(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:bg-white rounded-xl text-xs font-bold text-slate-800 outline-none transition-all"
                    />
                  </div>
                </div>

                {/* Line Items Box */}
                <div className="p-5 border border-slate-150 rounded-2xl space-y-4 bg-slate-50/20">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">Adeegyada & Baayacmushtarka (Invoice Line Items)</h4>
                    <span className="text-[10px] text-slate-400 font-bold uppercase">Ku dar shey ku jiri doona biilka</span>
                  </div>

                  <div className="space-y-3">
                    {invFormItems.map((item, index) => (
                      <div key={item.id} className="flex flex-col sm:flex-row items-end sm:items-center gap-3">
                        {/* Description */}
                        <div className="flex-1 w-full">
                          {index === 0 && (
                            <label className="block text-[9px] font-black text-slate-400 uppercase mb-1">Faahfaahinta Adeega (Description) *</label>
                          )}
                          <input
                            type="text"
                            required
                            placeholder="t.g. Buugaagta fasalka, Adeeg dheeraad ah..."
                            value={item.description}
                            onChange={(e) => {
                              const updated = [...invFormItems];
                              updated[index].description = e.target.value;
                              setInvFormItems(updated);
                            }}
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:bg-white rounded-xl text-xs font-bold text-slate-800 outline-none transition-all"
                          />
                        </div>

                        {/* Quantity */}
                        <div className="w-24 shrink-0">
                          {index === 0 && (
                            <label className="block text-[9px] font-black text-slate-400 uppercase mb-1">Qty *</label>
                          )}
                          <input
                            type="number"
                            required
                            min="1"
                            step="any"
                            value={item.quantity}
                            onChange={(e) => {
                              const updated = [...invFormItems];
                              updated[index].quantity = Math.max(1, Number(e.target.value));
                              setInvFormItems(updated);
                            }}
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:bg-white rounded-xl text-xs font-bold text-slate-800 outline-none transition-all text-center"
                          />
                        </div>

                        {/* Unit Price */}
                        <div className="w-28 shrink-0">
                          {index === 0 && (
                            <label className="block text-[9px] font-black text-slate-400 uppercase mb-1">Qiimaha ($) *</label>
                          )}
                          <input
                            type="number"
                            required
                            min="0"
                            step="0.01"
                            placeholder="Price ($)"
                            value={item.unitPrice}
                            onChange={(e) => {
                              const updated = [...invFormItems];
                              updated[index].unitPrice = Math.max(0, Number(e.target.value));
                              setInvFormItems(updated);
                            }}
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:bg-white rounded-xl text-xs font-bold text-slate-800 outline-none transition-all text-right"
                          />
                        </div>

                        {/* Row Total display */}
                        <div className="w-20 text-right pr-2">
                          {index === 0 && (
                            <label className="block text-[9px] font-black text-slate-400 uppercase mb-1">Guud</label>
                          )}
                          <span className="text-xs font-black text-slate-600 block py-2">${(item.quantity * item.unitPrice).toFixed(2)}</span>
                        </div>

                        {/* Trash Button for extra items */}
                        {invFormItems.length > 1 && (
                          <button
                            type="button"
                            onClick={() => {
                              const updated = invFormItems.filter((_, idx) => idx !== index);
                              setInvFormItems(updated);
                            }}
                            className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition-all cursor-pointer self-center"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Add Row Button */}
                  <button
                    type="button"
                    onClick={() => {
                      setInvFormItems([
                        ...invFormItems,
                        { id: String(Date.now()), description: '', quantity: 1, unitPrice: 0 }
                      ]);
                    }}
                    className="py-1.5 px-3 border border-dashed border-emerald-500 hover:bg-emerald-50 text-emerald-700 text-[10px] font-black uppercase tracking-wider rounded-xl inline-flex items-center gap-1.5 cursor-pointer transition-all mt-2"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Shey Dheeraad ah (Add service row)
                  </button>
                </div>

                {/* Live math summary and Payment Collector */}
                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-150 grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Notes / Instructions */}
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 pl-0.5">
                      Faallo iyo Farriimo (Invoice Notes)
                    </label>
                    <textarea
                      rows={4}
                      placeholder="Qiimo dhimis, ama dardaaran kale..."
                      value={invFormNotes}
                      onChange={(e) => setInvFormNotes(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 focus:border-emerald-500 focus:bg-white rounded-xl text-xs font-semibold text-slate-700 outline-none transition-all resize-none"
                    />
                  </div>

                  {/* Payment registration & Summary Maths */}
                  <div className="space-y-4">
                    <div className="flex justify-between items-center text-xs pb-2 border-b border-slate-200">
                      <span className="font-bold text-slate-500 uppercase tracking-wider">Lacagta guud ee biilka (Total Invoiced):</span>
                      <span className="text-sm font-black text-slate-900">${invFormItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0).toFixed(2)} USD</span>
                    </div>

                    {/* Registrate quick collected payment */}
                    <div>
                      <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 pl-0.5">
                        Lacagta Hadda la qabtay / la bixiyay (Amount Paid so far) *
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        max={invFormItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0)}
                        required
                        value={invFormAmountPaid}
                        onChange={(e) => setInvFormAmountPaid(Math.max(0, Number(e.target.value)))}
                        className="w-full px-3.5 py-2.5 bg-white border border-slate-200 focus:border-emerald-500 focus:bg-white rounded-xl text-sm font-black text-slate-900 outline-none transition-all text-right"
                      />
                    </div>

                    <div className="flex justify-between items-center text-xs pt-1">
                      <span className="font-bold text-slate-500 uppercase">Deynta Hartay (Remaining Due Balance):</span>
                      <span className="text-sm font-black text-rose-600">
                        ${Math.max(0, invFormItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0) - invFormAmountPaid).toFixed(2)} USD
                      </span>
                    </div>

                    <div className="flex justify-between items-center text-xs pt-1">
                      <span className="font-bold text-slate-500 uppercase">Heerka Biilka (Automated Status):</span>
                      {(() => {
                        const total = invFormItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
                        const paid = invFormAmountPaid;
                        let labelStr = 'LAMA BIXIN (UNPAID)';
                        let colorStr = 'bg-rose-50 text-rose-700 border border-rose-100';
                        if (paid >= total && total > 0) {
                          labelStr = 'WAA LA BIXIYAY (PAID)';
                          colorStr = 'bg-emerald-50 text-emerald-700 border border-emerald-100';
                        } else if (paid > 0) {
                          labelStr = 'QEYB BAA LA BIXIYAY (PARTIAL)';
                          colorStr = 'bg-amber-50 text-amber-700 border border-amber-100';
                        }
                        return (
                          <span className={`px-3 py-1 font-black text-[9px] uppercase tracking-wider rounded-xl ${colorStr}`}>{labelStr}</span>
                        );
                      })()}
                    </div>
                  </div>
                </div>

              </div>

              {/* Footer */}
              <div className="p-4 bg-slate-50 border-t border-slate-150 flex items-center justify-end gap-3 shrink-0 pointer-print-none">
                <button
                  type="button"
                  onClick={() => { setShowInvoiceModal(false); setEditingInvoice(null); }}
                  className="py-2.5 px-5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-extrabold text-xs rounded-xl cursor-pointer transition-colors"
                >
                  Gadaal (Cancel)
                </button>
                <button
                  type="submit"
                  className="py-2.5 px-6 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wider rounded-xl inline-flex items-center gap-1.5 cursor-pointer shadow-md shadow-emerald-600/10 transition-colors"
                >
                  <Save className="w-4 h-4" />
                  {editingInvoice ? 'Cusboonaysii (Update)' : 'Kaydi & Soo Saar (Issue Invoice)'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* -------------------------------------------------------------
          MODAL 1D: PRINT OR PREVIEW CUSTOM CUSTOM INVOICE
          ------------------------------------------------------------- */}
      {showInvoiceReceipt && (
        <div 
          className="fixed inset-0 bg-slate-900/60 flex items-center justify-center p-4 z-50 animate-fade-in overflow-y-auto pointer-print-none" 
          id="invoice-receipt-bg"
          onClick={(e) => {
            if ((e.target as HTMLElement).id === 'invoice-receipt-bg') {
              setShowInvoiceReceipt(null);
            }
          }}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-lg bg-white rounded-3xl shadow-2xl relative overflow-hidden flex flex-col max-h-[85vh] sm:max-h-[90vh] my-auto"
            id="invoice-print-wrapper"
          >
            {/* Header / Actions toolbar inside overlay */}
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between pointer-print-none flex-wrap gap-2">
              <span className="font-bold text-xs uppercase tracking-widest text-slate-400 font-bold">Xafiiska Daabacaada</span>
              <div className="flex gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => setShowInvoiceReceipt(null)}
                  className="py-1.5 px-3 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-lg cursor-pointer inline-flex items-center gap-1 transition-colors border border-slate-700 font-bold"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Gadaal
                </button>
                <button
                  type="button"
                  onClick={() => handleDownloadInvoicePDF(showInvoiceReceipt)}
                  className="py-1.5 px-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-lg inline-flex items-center gap-1 transition-all cursor-pointer font-bold"
                >
                  <Download className="w-3.5 h-3.5" />
                  La soo deg PDF
                </button>
                <button
                  type="button"
                  onClick={() => handleDownloadInvoiceText(showInvoiceReceipt)}
                  className="py-1.5 px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg inline-flex items-center gap-1 transition-all cursor-pointer font-bold"
                >
                  <Download className="w-3.5 h-3.5" />
                  La soo deg TXT
                </button>
                <button
                  type="button"
                  onClick={() => handlePrintElement('printable-invoice-receipt')}
                  className="py-1.5 px-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg inline-flex items-center gap-1 transition-all cursor-pointer font-bold"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Daabac Biilka
                </button>
              </div>
            </div>

            {/* Print paper layout preview */}
            <div id="printable-invoice-receipt" className="p-8 overflow-y-auto space-y-6 scrollbar-thin bg-white flex-1 text-slate-800 printable-canvas font-sans select-text">
              
              {/* Crest logo & Title head */}
              <div className="flex items-center gap-4 border-b border-slate-100 pb-5">
                <div>
                  <h3 className="text-xl font-black text-[#21543d] font-lutfey uppercase tracking-wider">Dugsiga Subuc</h3>
                  <p className="text-[9px] font-black text-[#21543d] uppercase tracking-wider mt-1">Xafiiska Garowe & Akadeemiyada Tajwiidka</p>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Invoice / Biil Rasmi Ah oo Gaar ah</p>
                </div>
              </div>

              {/* Metadata block */}
              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-150 text-[11px] leading-relaxed">
                <div>
                  <span className="block text-[8px] text-slate-400 uppercase font-black">Loo soo saaray:</span>
                  <span className="text-xs font-black text-slate-950">{showInvoiceReceipt.recipientName}</span>
                  <span className="block font-mono text-[10px] text-slate-500 mt-0.5">{showInvoiceReceipt.recipientPhone}</span>
                  {showInvoiceReceipt.studentName && (
                    <span className="block text-[9px] text-indigo-700 font-bold mt-1">
                      Ardayga: {getFirstNamesOnly(showInvoiceReceipt.studentName)}
                    </span>
                  )}
                </div>
                <div className="text-right">
                  <span className="block text-[8px] text-slate-400 uppercase font-black">Invoice No:</span>
                  <span className="text-xs font-mono font-black text-slate-950">{showInvoiceReceipt.invoiceNo}</span>
                  <span className="block text-[10px] text-slate-500 font-mono mt-1">
                    Taariikhda: <span className="font-bold">{showInvoiceReceipt.date}</span>
                  </span>
                </div>
              </div>

              {/* Items tabular grid */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-150 text-[9px] font-black text-slate-500 uppercase">
                      <th className="py-2 pl-3">Tr</th>
                      <th className="py-2">Faahfaahinta Adeega</th>
                      <th className="py-2 text-center">Tiro</th>
                      <th className="py-2 text-right">Qiimaha</th>
                      <th className="py-2 text-right pr-3">Isu-geyn</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {showInvoiceReceipt.items.map((item, idx) => (
                      <tr key={item.id || idx} className="text-slate-800 font-medium">
                        <td className="py-2.5 pl-3 font-mono font-bold text-slate-400">{idx + 1}</td>
                        <td className="py-2.5 font-semibold text-slate-900">{item.description}</td>
                        <td className="py-2.5 text-center font-bold text-slate-600">{item.quantity}</td>
                        <td className="py-2.5 text-right font-semibold text-slate-600">${item.unitPrice.toFixed(2)}</td>
                        <td className="py-2.5 text-right font-extrabold text-slate-950 pr-3">${(item.quantity * item.unitPrice).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Math summaries list */}
              <div className="border-t border-dashed border-slate-250 pt-4 space-y-2 text-xs">
                <div className="flex justify-between items-center text-slate-500 font-semibold">
                  <span>LACAGTA GUUD:</span>
                  <span className="font-black text-slate-950">${showInvoiceReceipt.totalAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center text-emerald-600 font-bold">
                  <span>LA BIXIYAY:</span>
                  <span className="font-black text-emerald-700">${showInvoiceReceipt.amountPaid.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center border-t border-slate-100 pt-2 text-slate-800 font-black">
                  <span>DEYNTA HARTAY:</span>
                  <span className={`text-sm font-extrabold ${showInvoiceReceipt.totalAmount - showInvoiceReceipt.amountPaid > 0 ? 'text-rose-600' : 'text-slate-400'}`}>
                    ${(showInvoiceReceipt.totalAmount - showInvoiceReceipt.amountPaid).toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Status stamp badge */}
              <div className="flex items-center justify-between gap-4 pt-2">
                <div className="px-3.5 py-1.5 rounded-xl border border-dashed border-slate-350 text-center inline-block">
                  <span className="block text-[8px] text-slate-400 font-black uppercase mb-0.5">HEERKA BIILKA</span>
                  <span className={`text-[10px] font-black uppercase tracking-widest ${
                    showInvoiceReceipt.status === 'Paid'
                      ? 'text-emerald-700'
                      : showInvoiceReceipt.status === 'Partial'
                      ? 'text-amber-700'
                      : 'text-rose-700'
                  }`}>
                    {showInvoiceReceipt.status === 'Paid' ? 'Waa la bixiyey' : showInvoiceReceipt.status === 'Partial' ? 'Qeyb baa la bixiyey' : 'Lama bixin'}
                  </span>
                </div>

                {showInvoiceReceipt.notes && (
                  <div className="text-right max-w-[60%]">
                    <span className="block text-[8px] text-slate-400 font-black uppercase mb-0.5">Faallo:</span>
                    <p className="text-[10px] text-slate-500 font-semibold leading-relaxed italic">{showInvoiceReceipt.notes}</p>
                  </div>
                )}
              </div>

              {/* print layout footer citation */}
              <div className="text-center pt-4 border-t border-dashed border-slate-300 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                Waad ku mahadsan tahay wada-shaqeynta rasmiga ah
              </div>
            </div>

          </motion.div>
        </div>
      )}

      {/* -------------------------------------------------------------
          MODAL 1B: SECURE BILLING & DEBT MANAGEMENT COLLECTOR
          ------------------------------------------------------------- */}
      {showPayModal && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center p-4 z-50 animate-fade-in pointer-print-none" id="pay-modal-bg">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh]"
          >
            {/* Header */}
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
              <span className="font-bold text-xs uppercase tracking-widest text-teal-400 flex items-center gap-1.5 font-bold">
                <CircleDollarSign className="w-4 h-4 text-teal-500" />
                Secure Billing Collector
              </span>
              <button
                type="button"
                onClick={() => setShowPayModal(null)}
                className="py-1 px-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-lg cursor-pointer transition-colors"
              >
                Cancel
              </button>
            </div>

            {/* Scrollable content */}
            <div className="p-6 overflow-y-auto space-y-6 scrollbar-thin">
              {/* Student info header bar */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-150 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div>
                  <h4 className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Target Student</h4>
                  <p className="text-slate-900 font-extrabold text-sm">{showPayModal.name}</p>
                  <p className="text-slate-400 font-mono mt-0.5">ID: {showPayModal.id}</p>
                </div>
                <div>
                  <h4 className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Class / Space</h4>
                  <p className="text-slate-800 font-bold mt-0.5">{showPayModal.className}</p>
                </div>
                <div>
                  <h4 className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Monthly Tuition</h4>
                  <p className="text-slate-900 font-extrabold mt-0.5">${showPayModal.monthlyFee}</p>
                </div>
                {showPayModal.busFee ? (
                  <div>
                    <h4 className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Monthly Bus Fare</h4>
                    <p className="text-indigo-850 font-extrabold mt-0.5">${showPayModal.busFee}</p>
                  </div>
                ) : null}
              </div>

              {/* Collector Form and Live Math */}
              <form onSubmit={handleSavePaymentDetails} className="space-y-4">
                {/* Tuition Section */}
                <div className="bg-slate-50/55 p-4 rounded-2xl border border-slate-150 space-y-3">
                  <div className="text-xs font-black text-teal-800 uppercase tracking-wider flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5" />
                    1. Lacagta Waxbarashada (Tuition Fee)
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5 pl-0.5">Fees Expected / Due ($) *</label>
                      <input
                        type="number"
                        step="any"
                        required
                        min="0"
                        value={payAmountDue}
                        onChange={(e) => setPayAmountDue(Number(e.target.value))}
                        className="w-full px-3.5 py-2.5 bg-white border border-slate-200 focus:border-indigo-500 rounded-xl text-xs font-bold text-slate-800 outline-none transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5 pl-0.5">Amount Deposited ($) *</label>
                      <input
                        type="number"
                        step="any"
                        required
                        min="0"
                        value={payAmountPaid}
                        onChange={(e) => setPayAmountPaid(Number(e.target.value))}
                        className="w-full px-3.5 py-2.5 bg-white border border-slate-200 focus:border-indigo-500 rounded-xl text-xs font-bold text-slate-800 outline-none transition-all"
                      />
                    </div>
                  </div>
                </div>

                {/* Bus Section */}
                <div className="bg-indigo-50/30 p-4 rounded-2xl border border-indigo-150/40 space-y-3">
                  <div className="text-xs font-black text-indigo-800 uppercase tracking-wider flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Bus className="w-3.5 h-3.5 text-indigo-600" />
                      2. Lacagta Gaadiidka / Baska (Bus Fare)
                    </span>
                    {showPayModal.busFee ? (
                      <span className="text-[9px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded font-black uppercase tracking-wider">Ardayga Baskuu Raacaa</span>
                    ) : (
                      <span className="text-[9px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded font-black uppercase tracking-wider">Ardaygu Baska kuma qorna</span>
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5 pl-0.5">Bus Fare Due ($) *</label>
                      <input
                        type="number"
                        step="any"
                        required
                        min="0"
                        value={payBusFeeDue}
                        onChange={(e) => setPayBusFeeDue(Number(e.target.value))}
                        className="w-full px-3.5 py-2.5 bg-white border border-slate-200 focus:border-indigo-500 rounded-xl text-xs font-bold text-slate-800 outline-none transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5 pl-0.5">Bus Fare Paid ($) *</label>
                      <input
                        type="number"
                        step="any"
                        required
                        min="0"
                        value={payBusFeePaid}
                        onChange={(e) => setPayBusFeePaid(Number(e.target.value))}
                        className="w-full px-3.5 py-2.5 bg-white border border-slate-200 focus:border-indigo-500 rounded-xl text-xs font-bold text-slate-800 outline-none transition-all"
                      />
                    </div>
                  </div>
                </div>

                {/* Live Debt Feedback Panel */}
                {(() => {
                  const tuitionDebt = Math.max(0, payAmountDue - payAmountPaid);
                  const busDebt = Math.max(0, payBusFeeDue - payBusFeePaid);
                  const calculatedDebt = tuitionDebt + busDebt;
                  return (
                    <div className={`p-4 rounded-xl border flex items-start gap-3 text-xs relative overflow-hidden ${
                      calculatedDebt > 0 
                        ? 'bg-amber-50 text-amber-800 border-amber-100/80' 
                        : 'bg-emerald-50 text-emerald-800 border-emerald-100/80'
                    }`}>
                      <AlertCircle className={`w-4 h-4 mt-0.5 shrink-0 ${calculatedDebt > 0 ? 'text-amber-500' : 'text-emerald-500'}`} />
                      <div>
                        <span className="font-extrabold block">
                          {calculatedDebt > 0 ? `Deyn hadhay oo dhiman oo lagu leeyahay ($${calculatedDebt} remaining)` : 'Dhamaan Lacagtii waa la bixiyay (Fully Paid Settlement)'}
                        </span>
                        <p className="text-[11px] text-slate-550 leading-relaxed mt-0.5 font-semibold text-slate-600">
                          {calculatedDebt > 0 
                            ? `Tuition Debt: $${tuitionDebt} | Bus Fare Debt: $${busDebt}. The database is actively managing these balances.`
                            : 'Perfect matching! Standard tuition and transportation subscription are fully paid for the current month.'}
                        </p>
                      </div>
                    </div>
                  );
                })()}

                {/* Staff Comments / Debt Remarks */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 pl-0.5">Debts Remarks & Staff Comments</label>
                  <textarea
                    rows={2}
                    value={payNotes}
                    onChange={(e) => setPayNotes(e.target.value)}
                    placeholder="e.g. Paid 10 today. Owed 20 to be resolved next Friday."
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white rounded-xl text-xs font-semibold text-slate-800 outline-none transition-all resize-none"
                  />
                </div>

                {/* Submit actions */}
                <div className="flex justify-end gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowPayModal(null)}
                    className="px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs uppercase tracking-wider rounded-xl cursor-pointer transition-colors"
                  >
                    Discard Changes
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-3 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl cursor-pointer transition-all shadow-md shadow-teal-600/10 flex items-center gap-1.5"
                  >
                    <Check className="w-4 h-4" />
                    Confirm & Store Transaction
                  </button>
                </div>
              </form>

              {/* HISTORICAL LEDGER FOR THE PERSON */}
              <div className="pt-4 border-t border-slate-100">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-black text-slate-800 text-xs uppercase tracking-widest flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-indigo-500" />
                    Historic Payment Ledgers & Remarks
                  </h4>
                  <span className="text-[10px] text-slate-400 font-semibold uppercase">Carry-over details log</span>
                </div>

                {(() => {
                  const history = database.billing
                    .filter(b => b.studentId === showPayModal.id)
                    .sort((a,b) => b.month.localeCompare(a.month));

                  if (history.length === 0) {
                    return (
                      <div className="p-4 bg-slate-50 rounded-xl text-center border border-dashed border-slate-200">
                        <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">No historic invoices or remarks logged yet</p>
                      </div>
                    );
                  }

                  return (
                    <div className="overflow-x-auto rounded-xl border border-slate-150 text-left max-h-[180px] scrollbar-thin">
                      <table className="w-full text-[11px] border-collapse">
                        <thead>
                          <tr className="bg-slate-50 text-slate-400 font-bold border-b border-slate-150 uppercase text-[10px]">
                            <th className="py-2 px-3">Billing Month</th>
                            <th className="py-2 px-3">Due</th>
                            <th className="py-2 px-3">Deposited</th>
                            <th className="py-2 px-3">Remaining Debt</th>
                            <th className="py-2 px-3">Status</th>
                            <th className="py-2 px-3">Collector Remarks & Notes</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {history.map(record => (
                            <tr key={record.id} className="hover:bg-slate-50/50">
                              <td className="py-2 px-3 font-bold text-slate-800">{record.month}</td>
                              <td className="py-2 px-3 font-semibold text-slate-600">
                                ${record.amountDue !== undefined ? record.amountDue : (record.amountPaid + (record.debtAmount ?? 0))}
                              </td>
                              <td className="py-2 px-3 font-bold text-emerald-700">${record.amountPaid}</td>
                              <td className="py-2 px-3 font-bold text-amber-600">
                                ${record.debtAmount !== undefined ? record.debtAmount : 0}
                              </td>
                              <td className="py-2 px-3">
                                <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                                  record.status === 'Paid'
                                    ? 'bg-emerald-50 text-emerald-700'
                                    : record.status === 'Partial'
                                    ? 'bg-amber-50 text-amber-700'
                                    : 'bg-rose-50 text-rose-700'
                                }`}>
                                  {record.status}
                                </span>
                              </td>
                              <td className="py-2 px-3 text-slate-500 italic max-w-xs break-words font-semibold">
                                {record.notes || <span className="text-slate-300 font-light">None recorded</span>}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  );
                })()}
              </div>

            </div>
          </motion.div>
        </div>
      )}

      {/* -------------------------------------------------------------
          MODAL 2: PRINT COMPREHENSIVE ATTENDANCE & PERFORMANCE JOURNALS
          ------------------------------------------------------------- */}
       {showPrintReportModal && (
        <div 
          className="fixed inset-0 bg-slate-900/60 flex items-center justify-center p-4 z-50 animate-fade-in overflow-y-auto pointer-print-none" 
          id="report-modal-bg"
          onClick={(e) => {
            if ((e.target as HTMLElement).id === 'report-modal-bg') {
              setShowPrintReportModal(null);
            }
          }}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-4xl bg-white rounded-3xl shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh] my-auto"
            id="report-print-wrapper"
          >
            {/* Modal actions */}
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between shrink-0 pointer-print-none">
              <span className="font-bold text-xs uppercase tracking-widest text-slate-400 font-bold">
                {showPrintReportModal.mode === 'whole'
                  ? 'Diiwaanka Guud ee Joogitaanka'
                  : showPrintReportModal.mode === 'payments_range'
                  ? 'Koobidda Dhaqdhaqaaqa Maaliyadeed ee Ardayga'
                  : 'Diiwaanka Casharada & Horumarka'}
              </span>
              <div className="flex gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => setShowPrintReportModal(null)}
                  className="py-1.5 px-3 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-lg cursor-pointer inline-flex items-center gap-1 transition-colors border border-slate-700 font-bold"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Gadaal
                </button>
                <button
                  type="button"
                  onClick={handleDownloadReportPDF}
                  className="py-1.5 px-3 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-lg inline-flex items-center gap-1 transition-all cursor-pointer font-bold"
                >
                  <Download className="w-3.5 h-3.5" />
                  La soo deg PDF
                </button>
                <button
                  type="button"
                  onClick={() => handlePrintElement('printable-report-canvas')}
                  className="py-1.5 px-3 bg-teal-500 hover:bg-teal-600 text-slate-900 font-bold text-xs rounded-lg inline-flex items-center gap-1 transition-all cursor-pointer font-bold"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Daabac Warbixinta
                </button>
              </div>
            </div>

            {/* printable canvas */}
            <div className="flex-1 p-8 md:p-12 text-slate-900 bg-white overflow-y-auto" id="printable-report-canvas">
              <div className="text-center pb-6 border-b border-slate-300 mb-6 font-semibold">
                <h2 className="text-2xl font-black uppercase tracking-tight text-slate-950 font-lutfey">DUGSIGA SUBUC</h2>
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">
                  {showPrintReportModal.mode === 'payments_range' 
                    ? 'WARBIXINTA GUUD EE LACAGO-BIXINTA ARDAYGA' 
                    : 'DIIWAANKA RASMIGA AH EE JOOGITAANKA IYO HORUMARKA WAXBARASHO'}
                </h3>
                <p className="text-[11px] text-slate-400 mt-1">
                  Muddada: <span className="font-bold text-slate-800">{showPrintReportModal.startDate}</span> ilaa <span className="font-bold text-slate-800">{showPrintReportModal.endDate}</span>
                  {showPrintReportModal.mode === 'whole' ? (
                    <span> • Fasalka: <span className="font-bold text-slate-800">{showPrintReportModal.className}</span></span>
                  ) : (
                    <span> • Macluumaadka Ardayga: <span className="font-bold text-slate-800">
                      {database.students.find(stu => stu.id === showPrintReportModal.studentId)?.name || showPrintReportModal.studentId}
                    </span></span>
                  )}
                </p>
              </div>

              {/* Conditionally render printable views based on mode */}
              {showPrintReportModal.mode === 'whole' ? (
                <div className="space-y-6 text-xs font-semibold">
                  <table className="w-full text-left border-collapse text-xs border border-slate-300">
                    <thead>
                      <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-300 uppercase tracking-wider text-[10px]">
                        <th className="p-2 border border-slate-350">ID-ga Ardayga</th>
                        <th className="p-2 border border-slate-350">Magaca Ardayga</th>
                        <th className="p-2 border border-slate-350 font-bold">Fasalka</th>
                        <th className="p-2 text-center border border-slate-350">Maalmaha Guud</th>
                        <th className="p-2 text-center border border-slate-350 text-emerald-850">Joogid</th>
                        <th className="p-2 text-center border border-slate-350 text-amber-850">Daahid</th>
                        <th className="p-2 text-center border border-slate-350 text-rose-850">Maqnansho</th>
                        <th className="p-2 text-right border border-slate-350">Heerka Imaanshaha %</th>
                      </tr>
                    </thead>
                    <tbody>
                      {database.students
                        .filter(s => s.active && (showPrintReportModal.className === 'All' ? true : s.className === showPrintReportModal.className))
                        .map(stu => {
                          const progressList = database.progress.filter(p => p.studentId === stu.id && p.date >= showPrintReportModal.startDate && p.date <= showPrintReportModal.endDate);
                          const total = progressList.length;
                          const present = progressList.filter(p => p.attendance === 'Present').length;
                          const late = progressList.filter(p => p.attendance === 'Late').length;
                          const absent = progressList.filter(p => p.attendance === 'Absent').length;
                          const compliance = total > 0 ? Math.round(((present + late) / total) * 100) : 0;

                          return (
                            <tr key={stu.id} className="border-b border-slate-200 text-[11px] font-medium text-slate-800">
                              <td className="p-2 border border-slate-200 font-bold">{stu.id}</td>
                              <td className="p-2 border border-slate-200 font-extrabold">{stu.name}</td>
                              <td className="p-2 border border-slate-200">{stu.className}</td>
                              <td className="p-2 text-center border border-slate-200">{total}</td>
                              <td className="p-2 text-center border border-slate-200 text-emerald-700 font-bold">{present}</td>
                              <td className="p-2 text-center border border-slate-200 text-amber-700 font-bold">{late}</td>
                              <td className="p-2 text-center border border-slate-200 text-rose-700 font-bold">{absent}</td>
                              <td className="p-2 text-right border border-slate-200 font-bold">{total > 0 ? `${compliance}%` : 'M/J'}</td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>

                  {/* Director authentications */}
                  <div className="pt-16 grid grid-cols-2 gap-16">
                    <div>
                      <span className="text-slate-500 font-semibold block text-xs">Saxiixa Hubinta Maamulaha</span>
                      <div className="w-full h-px bg-slate-300 mt-10" />
                    </div>
                    <div className="text-right">
                      <span className="text-slate-500 font-semibold block text-xs font-bold text-slate-705">Ogolaanshaha & Shaabadda Maamulka</span>
                      <div className="w-full h-px bg-slate-300 mt-10" />
                    </div>
                  </div>
                </div>
              ) : showPrintReportModal.mode === 'payments_range' ? (
                <div className="space-y-6 text-xs font-semibold">
                  {(() => {
                    const student = database.students.find(s => s.id === showPrintReportModal.studentId);
                    if (!student) return <p className="text-rose-600">Student not found.</p>;

                    const stats = getStudentPaymentRangeReport(student.id, showPrintReportModal.startDate, showPrintReportModal.endDate);
                    if (!stats) return <p className="text-rose-600">Error rendering ledger report.</p>;

                    const { records, totalDue, totalPaid, totalDebt } = stats;

                    return (
                      <div className="space-y-6">
                        {/* Profile Summary Grid */}
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-semibold">
                          <div>
                            <span className="text-[10px] text-slate-400 block font-black uppercase">Warbixinta Ardayga</span>
                            <span className="text-slate-900 font-extrabold text-[13px]">{student.name}</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 block font-black uppercase">ID-ga Ardayga / Fasalka</span>
                            <span className="text-slate-900 font-bold">{student.id} / {student.className}</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 block font-black uppercase">Magaca & Tel-ka Waalidka</span>
                            <span className="text-slate-800 font-bold">{student.parentName} ({student.parentPhone})</span>
                          </div>
                          <div className="text-right">
                            <span className="text-[10px] text-slate-400 block font-black uppercase">Khidmadda Bisha ee Diiwaangashan</span>
                            <span className="text-xs font-black text-slate-900 bg-slate-200/50 border border-slate-300 px-2 py-0.5 rounded">
                              ${Number(student.monthlyFee).toFixed(2)}
                            </span>
                          </div>
                        </div>

                        {/* Top Summaries Block */}
                        <div className="grid grid-cols-3 gap-4">
                          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-left">
                            <span className="text-[9px] text-slate-500 uppercase font-bold block mb-0.5">Biilka Guud</span>
                            <span className="text-lg font-black text-slate-800">${Number(totalDue).toFixed(2)}</span>
                          </div>
                          <div className="bg-emerald-50/70 p-3 rounded-xl border border-emerald-100/70 text-left">
                            <span className="text-[9px] text-emerald-600 uppercase font-bold block mb-0.5">Wixii La Bixiyay</span>
                            <span className="text-lg font-black text-emerald-800">${Number(totalPaid).toFixed(2)}</span>
                          </div>
                          <div className="bg-rose-50/70 p-3 rounded-xl border border-rose-100/70 text-left">
                            <span className="text-[9px] text-rose-600 uppercase font-bold block mb-0.5 font-bold font-semibold text-rose-800">Deynta Lagu Leeyahay</span>
                            <span className="text-lg font-black text-rose-800">${Number(totalDebt).toFixed(2)}</span>
                          </div>
                        </div>

                        {/* Statements list table */}
                        <table className="w-full text-left border-collapse text-xs border border-slate-300">
                          <thead>
                            <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-300 uppercase tracking-wider text-[9px]">
                              <th className="p-2 border border-slate-350">Bisha Biilka</th>
                              <th className="p-2 border border-slate-350">Xaddiga Biilka</th>
                              <th className="p-2 border border-slate-350 text-emerald-800">Xaddiga La Bixiyay</th>
                              <th className="p-2 border border-slate-350 text-rose-800">Deynta Kugu Hartay</th>
                              <th className="p-2 border border-slate-350 text-center">Xaaladda</th>
                              <th className="p-2 border border-slate-350">Tirada Rasiidka</th>
                              <th className="p-2 border border-slate-350 font-bold">Qoraal Xogeed</th>
                            </tr>
                          </thead>
                          <tbody>
                            {records.map(r => {
                                const feeAmt = r.amountDue ?? student.monthlyFee;
                                const curDebt = r.debtAmount ?? Math.max(0, feeAmt - r.amountPaid);
                                return (
                                  <tr key={r.month} className="border-b border-slate-200 text-[10.5px] font-medium text-slate-700">
                                    <td className="p-2 border border-slate-200 font-bold text-slate-900">{r.month}</td>
                                    <td className="p-2 border border-slate-200">${Number(feeAmt).toFixed(2)}</td>
                                    <td className="p-2 border border-slate-200 text-emerald-700 font-bold">${Number(r.amountPaid).toFixed(2)}</td>
                                    <td className="p-2 border border-slate-200 text-rose-700 font-bold">${Number(curDebt).toFixed(2)}</td>
                                  <td className="p-2 border border-slate-200 text-center text-xs font-black">
                                    <span className="text-[10px] font-black uppercase">
                                      {r.status === 'Paid' ? 'LA BIXIYAY' : r.status === 'Partial' ? 'DAHOOD' : 'LAMA BIXIN'}
                                    </span>
                                  </td>
                                  <td className="p-2 border border-slate-200 text-slate-500">{r.receiptNo || '-'}</td>
                                  <td className="p-2 border border-slate-200 font-normal italic text-slate-500 max-w-xs truncate" title={r.notes}>{r.notes || '-'}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>

                        {/* Signatures */}
                        <div className="pt-12 grid grid-cols-2 gap-16">
                          <div>
                            <span className="text-slate-500 font-semibold block text-xs">Saxiixa Maamulaha / Xisaabiyaha</span>
                            <div className="w-full h-px bg-slate-300 mt-10" />
                          </div>
                          <div className="text-right">
                            <span className="text-slate-500 font-semibold block text-xs font-bold text-slate-700">Shaabadda Rasmiga ah ee Khasajiga</span>
                            <div className="w-full h-px bg-slate-300 mt-10" />
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              ) : (
                <div className="space-y-6 text-xs font-semibold">
                  {/* Student bio info card */}
                  {(() => {
                    const student = database.students.find(s => s.id === showPrintReportModal.studentId);
                    if (!student) return <p className="text-rose-600">Student not found.</p>;

                    const logs = database.progress
                      .filter(p => p.studentId === student.id && p.date >= showPrintReportModal.startDate && p.date <= showPrintReportModal.endDate)
                      .sort((a,b) => a.date.localeCompare(b.date));

                    const total = logs.length;
                    const present = logs.filter(p => p.attendance === 'Present').length;
                    const late = logs.filter(p => p.attendance === 'Late').length;
                    const absent = logs.filter(p => p.attendance === 'Absent').length;
                    const compliance = total > 0 ? Math.round(((present + late) / total) * 100) : 0;

                    return (
                      <div className="space-y-6">
                        {/* Student Details Header Card */}
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-250 grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-semibold">
                          <div>
                            <span className="text-[10px] text-slate-400 uppercase font-black block">Warbixinta Ardayga</span>
                            <span className="text-slate-900 font-extrabold text-[13px]">{student.name}</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 uppercase font-black block">ID-ga Ardayga / Fasalka</span>
                            <span className="text-slate-900 font-bold">{student.id} / {student.className}</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 uppercase font-black block">Magaca / Tel-ka Waalidka</span>
                            <span className="text-slate-800">{student.parentName} ({student.parentPhone})</span>
                          </div>
                          <div className="text-right">
                            <span className="text-[10px] text-slate-400 uppercase font-black block">Celceliska Joogitaanka</span>
                            <span className="text-xs font-black text-slate-900 uppercase bg-slate-200/50 border border-slate-300 px-2 py-0.5 rounded">
                              {total > 0 ? `${compliance}% Joogitaan` : 'Diiwaan Ma Jiro'}
                            </span>
                          </div>
                        </div>

                        {/* Beautifully separated day cards instead of a squeezed 8-column table */}
                        <div className="space-y-4 print:space-y-5">
                          {logs.map((lg, idx) => (
                            <div 
                              key={lg.id} 
                              className="bg-slate-50 border border-slate-200 rounded-2xl p-4.5 shadow-3xs transition-all duration-300 hover:border-indigo-200/80 hover:bg-slate-50/80 break-inside-avoid"
                            >
                              {/* Card Header showing Date & Attendance status badge */}
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/80 pb-3 mb-3.5">
                                <div className="flex items-center gap-2">
                                  <span className="text-[14px]">📅</span>
                                  <span className="font-extrabold text-slate-900 text-[13px] tracking-tight">{lg.date}</span>
                                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider pl-1 font-mono">Maalinta {idx + 1}</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest font-mono">Joogitaanka:</span>
                                  <span className={`px-3 py-1 rounded-xl text-[10.5px] font-black uppercase border tracking-wide shadow-3xs ${
                                    lg.attendance === 'Present' 
                                      ? 'bg-emerald-50 text-emerald-850 border-emerald-250' 
                                      : lg.attendance === 'Late' 
                                      ? 'bg-amber-50 text-amber-850 border-amber-250' 
                                      : 'bg-rose-50 text-rose-850 border-rose-250'
                                  }`}>
                                    {lg.attendance === 'Present' ? 'Joogid' : lg.attendance === 'Late' ? 'Daahid' : lg.attendance === 'Absent' ? 'Maqnansho' : lg.attendance}
                                  </span>
                                </div>
                              </div>

                              {/* Suuraduu marayo Badge if present */}
                              {(lg.suuradeeMaraya || lg.boggee || (lg.inteeBog && lg.inteeBog !== 'N/A' && lg.inteeBog !== '')) && (
                                <div className="mb-3.5 bg-indigo-50/50 border border-indigo-105 rounded-xl p-2.5 px-3.5 text-xs flex items-center justify-between shadow-3xs">
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm">📖</span>
                                    <span className="font-extrabold text-slate-800 font-sans">Casharka:</span>
                                  </div>
                                  <div className="flex items-center gap-2 flex-wrap">
                                    {lg.suuradeeMaraya && (
                                      <span className="font-black text-indigo-700 bg-white px-3 py-1 rounded-lg border border-indigo-100 shadow-3xs">Surada: {lg.suuradeeMaraya}</span>
                                    )}
                                    {lg.boggee && (
                                      <span className="font-black text-purple-700 bg-purple-50 px-3 py-1 rounded-lg border border-purple-100 shadow-3xs">Boggee: {lg.boggee}</span>
                                    )}
                                    {lg.inteeBog && lg.inteeBog !== 'N/A' && lg.inteeBog !== '' && (
                                      <span className="font-black text-violet-700 bg-violet-50/50 px-3 py-1 rounded-lg border border-violet-100 shadow-3xs">Intee Bog: {lg.inteeBog}</span>
                                    )}
                                  </div>
                                </div>
                              )}

                              {/* Progress metrics grid layout */}
                              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-slate-700">
                                <div className="bg-white p-3 rounded-xl border border-slate-150 flex flex-col justify-center shadow-3xs">
                                  <span className="text-[9px] text-slate-400 font-extrabold uppercase tracking-widest font-mono">1. Casharka</span>
                                  <span className="text-xs font-black text-slate-800 mt-1 flex items-center gap-1">
                                    {lg.lessonCompleted === 'Completed' ? '✅ Kabaxay' : '❌ Kama Bixin'}
                                  </span>
                                </div>
                                <div className="bg-white p-3 rounded-xl border border-slate-150 flex flex-col justify-center shadow-3xs">
                                  <span className="text-[9px] text-slate-400 font-extrabold uppercase tracking-widest font-mono">2. Suuradda</span>
                                  <span className="text-xs font-black text-slate-800 mt-1 flex items-center gap-1">
                                    {lg.surad === 'Completed' ? '✅ Kabaxay' : lg.surad === 'N/A' ? 'may' : '❌ Kama Bixin'}
                                  </span>
                                </div>
                                <div className="bg-white p-3 rounded-xl border border-slate-150 flex flex-col justify-center shadow-3xs">
                                  <span className="text-[9px] text-slate-400 font-extrabold uppercase tracking-widest font-mono">3. Kooxda Subac</span>
                                  <span className="text-xs font-black text-slate-800 mt-1 flex items-center gap-1">
                                    {lg.subac === 'Completed' ? '✅ Galay' : '❌ Ma Galin'}
                                  </span>
                                </div>
                                <div className="bg-white p-3 rounded-xl border border-slate-150 flex flex-col justify-center shadow-3xs">
                                  <span className="text-[9px] text-slate-400 font-extrabold uppercase tracking-widest font-mono">4. Dhaqanka</span>
                                  <span className="text-xs font-black text-slate-800 mt-1">
                                    {lg.dhaqan === 'Excellent' ? '✨ Aad u Fiican' : lg.dhaqan === 'Good' ? '👍 Fiican' : lg.dhaqan === 'Average' ? 'Dhexdhexaad' : lg.dhaqan === 'Needs Improvement' ? '⚠️ Baahan Horumar' : lg.dhaqan}
                                  </span>
                                </div>
                                <div className="bg-white p-3 rounded-xl border border-slate-150 flex flex-col justify-center shadow-3xs">
                                  <span className="text-[9px] text-slate-400 font-extrabold uppercase tracking-widest font-mono">5. Nadaafadda</span>
                                  <span className="text-xs font-black text-slate-800 mt-1">
                                    {lg.nadaafad === 'Excellent' ? '✨ Aad u Fiican' : lg.nadaafad === 'Good' ? '👍 Fiican' : lg.nadaafad === 'Average' ? 'Dhexdhexaad' : lg.nadaafad === 'Needs Improvement' ? '⚠️ Baahan Horumar' : lg.nadaafad}
                                  </span>
                                </div>
                              </div>

                              {/* Beautifully separated full-width comment section below the grid */}
                              {lg.faahfaahin ? (
                                <div 
                                  onClick={() => setExpandedComments(prev => ({ ...prev, [lg.id]: !prev[lg.id] }))}
                                  className="mt-3.5 bg-amber-50 hover:bg-amber-100/60 text-slate-900 border border-amber-200/70 rounded-xl p-3.5 text-[11px] leading-relaxed flex flex-col cursor-pointer select-none transition-all duration-300 shadow-3xs"
                                  title="Guji si aad u ballaariso ama u yarayso / Click to expand or collapse"
                                >
                                  <div className="flex items-center gap-1.5 mb-1.5 border-b border-amber-200 pb-1.5">
                                    <span className="text-xs select-none">📝</span>
                                    <span className="text-[10px] text-amber-800 font-black uppercase tracking-widest pl-0.5 font-mono">Xogta Macallinka (Instructor Notes):</span>
                                  </div>
                                  <p className={`font-extrabold tracking-wide text-slate-800 pointer-print-none ${expandedComments[lg.id] ? '' : 'line-clamp-2'}`}>
                                    {lg.faahfaahin}
                                  </p>
                                  {/* Always fully visible when printing */}
                                  <p className="hidden print-only-block font-extrabold tracking-wide text-slate-800">
                                    {lg.faahfaahin}
                                  </p>
                                </div>
                              ) : (
                                <div className="mt-3 text-[10px] text-slate-400 italic bg-slate-100/50 rounded-xl p-2.5 border border-slate-200/50">
                                  Lama qorin wax faallo ah maanta (No comments logged for this day).
                                </div>
                              )}
                            </div>
                          ))}
                        </div>

                        {/* Summary metric numbers block */}
                        <div className="bg-slate-50 p-4 rounded-xl border border-dashed border-slate-350 flex justify-between text-xs font-bold font-mono">
                          <div>FAALLOOYIN GUUD: {total}</div>
                          <div>WAA JOOGAY: {present}</div>
                          <div>WAA DAHOODAY: {late}</div>
                          <div>MA JOOGIN: {absent}</div>
                        </div>

                        {/* Sign-offs */}
                        <div className="pt-16 grid grid-cols-2 gap-16">
                          <div>
                            <span className="text-slate-500 font-semibold block text-xs">Saxiixa Macallinka mas'uulka ah</span>
                            <div className="w-full h-px bg-slate-300 mt-10" />
                          </div>
                          <div className="text-right">
                            <span className="text-slate-500 font-semibold block text-xs font-bold text-slate-700">Ansixinta Maamulaha</span>
                            <div className="w-full h-px bg-slate-300 mt-10" />
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}

      {mediaStudentTarget && (
        <StudentMediaModal
          student={mediaStudentTarget}
          onClose={() => setMediaStudentTarget(null)}
          onSave={(updatedStudent) => {
            const updatedStudents = database.students.map(s => 
              s.id === updatedStudent.id ? updatedStudent : s
            );
            const updatedDb = { ...database, students: updatedStudents };
            onSaveDatabase(updatedDb);
            setMediaStudentTarget(updatedStudent);
          }}
        />
      )}

      {showPrintIDBadge && (
        <div 
          className="fixed inset-0 bg-slate-900/70 flex items-center justify-center p-4 z-50 animate-fade-in overflow-y-auto pointer-print-none" 
          id="id-badge-modal-bg"
          onClick={(e) => {
            if ((e.target as HTMLElement).id === 'id-badge-modal-bg') {
              setShowPrintIDBadge(null);
            }
          }}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-sm bg-white rounded-3xl shadow-2xl relative overflow-hidden flex flex-col my-auto"
          >
            {/* Modal actions bar */}
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
              <span className="font-extrabold text-[10px] uppercase tracking-wider text-slate-400">
                School ID Card Creator
              </span>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => setShowPrintIDBadge(null)}
                  className="py-1 px-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-[10px] rounded-lg cursor-pointer transition-colors"
                >
                  Close
                </button>
                {showPrintIDBadge.imageUrl && (
                  <button
                    type="button"
                    onClick={() => handleDownloadProfilePhoto(showPrintIDBadge.imageUrl, `${showPrintIDBadge.id}_photo`)}
                    className="py-1 px-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[10px] rounded-lg cursor-pointer transition-colors"
                  >
                    Download Photo
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handlePrintElement('printable-id-badge-canvas')}
                  className="py-1 px-2.5 bg-teal-505 hover:bg-teal-600 text-slate-950 font-bold text-[10px] rounded-lg cursor-pointer transition-colors animate-pulse"
                >
                  Print Badge
                </button>
              </div>
            </div>

            {/* Printable ID card structure */}
            <div className="p-6 bg-slate-50 flex items-center justify-center">
              <div 
                id="printable-id-badge-canvas" 
                className="w-72 h-[410px] bg-white rounded-2xl border-2 border-slate-300 shadow-lg overflow-hidden flex flex-col justify-between relative text-slate-800 font-sans"
              >
                {/* Header background decoration */}
                <div className="bg-emerald-800 text-white p-3 text-center border-b-[3px] border-amber-500 relative">
                  <div className="flex items-center justify-center gap-1.5">
                    <div className="text-left">
                      <h2 className="text-xs font-black tracking-widest leading-none font-lutfey">DUGSIGA SUBUC</h2>
                      <p className="text-[7.5px] uppercase font-bold tracking-wider text-amber-300 mt-0.5">Quran memorization academy</p>
                    </div>
                  </div>
                </div>

                {/* Card Main Body */}
                <div className="p-4 flex-1 flex flex-col justify-between items-center text-center">
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest leading-none">
                    Official {showPrintIDBadge.role} ID Card
                  </span>
                  
                  {/* Photo Frame */}
                  <div className="my-2.5">
                    {showPrintIDBadge.imageUrl ? (
                      <div className="w-24 h-24 rounded-2xl border-2 border-amber-500 overflow-hidden shadow-md mx-auto bg-slate-100">
                        <img referrerPolicy="no-referrer" src={showPrintIDBadge.imageUrl} alt={showPrintIDBadge.name} className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <div className="w-24 h-24 rounded-2xl border-2 border-dashed border-slate-300 overflow-hidden flex items-center justify-center mx-auto bg-slate-150 text-slate-400 font-extrabold text-xl">
                        No Image
                      </div>
                    )}
                  </div>

                  {/* Profile Name & ID */}
                  <div>
                    <h3 className="text-sm font-black text-slate-800 leading-tight tracking-tight px-1 truncate max-w-[240px]">
                      {showPrintIDBadge.name}
                    </h3>
                    <div className="font-mono text-[11px] font-extrabold text-indigo-700 bg-indigo-50 border border-indigo-150 rounded-md px-2 py-0.5 mt-1 inline-block">
                      ID NO: {showPrintIDBadge.id}
                    </div>
                  </div>

                  {/* Class Info & Session / Check-In Time */}
                  <div className="w-full bg-slate-50/80 p-2 rounded-xl border border-slate-150 text-left text-[10px] font-semibold space-y-1 mt-1 text-slate-650">
                    <div className="truncate">
                      <span className="text-slate-400 uppercase text-[8px] font-bold block leading-none mb-0.5">Assigned Program / Division</span>
                      <span className="font-extrabold text-slate-800 leading-tight block truncate">{showPrintIDBadge.classNameSelected}</span>
                    </div>
                    <div className="flex justify-between items-center pt-1 border-t border-slate-150">
                      <div>
                        {showPrintIDBadge.role === 'Student' ? (
                          <>
                            <span className="text-slate-400 uppercase text-[7.5px] font-bold block leading-none">Parent Contact</span>
                            <span className="font-mono font-bold text-slate-800 text-[9px]">{showPrintIDBadge.parentOrCheckInTime}</span>
                          </>
                        ) : (
                          <>
                            <span className="text-slate-400 uppercase text-[7.5px] font-bold block leading-none">Expected Check-In</span>
                            <span className="font-mono font-bold text-teal-600 text-[9px]">{showPrintIDBadge.parentOrCheckInTime}</span>
                          </>
                        )}
                      </div>
                      <div className="text-right">
                        <span className="text-slate-400 uppercase text-[7.5px] font-bold block leading-none">Status</span>
                        <span className="font-black text-emerald-600 text-[9px]">Active ✅</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card Footer Bar */}
                <div className="bg-slate-900 text-white px-4 py-2 flex items-center justify-between border-t border-slate-200">
                  <div className="flex flex-col items-start leading-none text-left">
                    <span className="text-[6.5px] text-slate-400 uppercase font-bold">Academic Year</span>
                    <span className="text-[8px] font-bold text-white mt-0.5">2026 / 2027</span>
                  </div>
                  {/* Mock Barcode */}
                  <div className="h-6 flex flex-col justify-end items-center opacity-85">
                    <div className="flex gap-px items-stretch h-3">
                      <div className="w-[3px] bg-white h-full" />
                      <div className="w-[1px] bg-white h-full" />
                      <div className="w-[1px] bg-white h-full" />
                      <div className="w-[2px] bg-white h-full" />
                      <div className="w-[1px] bg-white h-full" />
                      <div className="w-[3px] bg-white h-full" />
                      <div className="w-[1px] bg-white h-full" />
                      <div className="w-[2px] bg-white h-full" />
                      <div className="w-[1px] bg-white h-full" />
                    </div>
                    <span className="text-[6px] font-mono tracking-widest text-slate-400 leading-none mt-0.5">{showPrintIDBadge.id}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Print Help Text Area */}
            <div className="p-4 bg-slate-105 border-t border-slate-100 text-center text-[10px] font-semibold text-slate-500">
              💡 Printing Tip: Set scaling to "100%" and layout to "Portrait" in your browser print settings for standard wallet badge size (3.3" x 2.1").
            </div>
          </motion.div>
        </div>
      )}

      {/* Reusable Custom Confirmation Modal to bypass iframe window.confirm block */}
      {confirmModal && confirmModal.isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in" id="portal-custom-confirm-modal">
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
                    confirmModal.accentColor === 'amber' ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/10' :
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

      {/* Student Attendance Record Inline Editing Modal */}
      {editingStudentDetail && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-fade-in" id="portal-student-edit-modal">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="w-full max-w-md bg-white rounded-3xl border border-slate-100 shadow-2xl overflow-hidden text-left"
          >
            {/* Header branding */}
            <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-5 text-white flex items-center justify-between">
              <div>
                <span className="text-[9px] uppercase font-bold tracking-widest text-emerald-100 block">Classroom Student Audit</span>
                <h3 className="text-sm sm:text-base font-extrabold tracking-tight mt-0.5">Edit Student Attendance</h3>
              </div>
              <button 
                type="button"
                onClick={() => setEditingStudentDetail(null)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Student Metadata Card */}
              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-teal-500/10 text-teal-700 flex items-center justify-center font-black text-sm">
                  🎓
                </div>
                <div>
                  <h4 className="text-slate-900 font-extrabold text-xs sm:text-sm">{editingStudentDetail.studentName}</h4>
                  <p className="text-[10px] text-slate-400 font-mono font-bold mt-0.5">ID: {editingStudentDetail.studentId}</p>
                </div>
              </div>

              {/* Form elements with state */}
              <div className="space-y-4">
                {/* 1. Attendance Type */}
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-extrabold text-slate-400 tracking-wider">Attendance Status</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['Present', 'Late', 'Absent'] as const).map(status => {
                      const isActive = editingStudentDetail.attendanceSent === status;
                      return (
                        <button
                          key={status}
                          type="button"
                          onClick={() => setEditingStudentDetail({
                            ...editingStudentDetail,
                            attendanceSent: status
                          })}
                          className={`py-2 rounded-xl border text-xs font-bold transition-all cursor-pointer flex flex-col items-center justify-center gap-1 ${
                            isActive 
                              ? status === 'Present' ? 'bg-emerald-50 border-emerald-500 text-emerald-700 shadow-sm shadow-emerald-500/10'
                                : status === 'Late' ? 'bg-amber-50 border-amber-500 text-amber-700 shadow-sm shadow-amber-500/10'
                                : 'bg-rose-50 border-rose-500 text-rose-700 shadow-sm shadow-rose-500/10'
                              : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          <span className="text-xs">
                            {status === 'Present' ? '🟢' : status === 'Late' ? '🟡' : '🔴'}
                          </span>
                          <span>{status}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 2. Lesson status type */}
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-extrabold text-slate-400 tracking-wider">Daily Lesson Progress</label>
                  <div className="grid grid-cols-2 gap-2">
                    {(['Completed', 'Pending'] as const).map(progress => {
                      const isActive = editingStudentDetail.lessonSent === progress;
                      return (
                        <button
                          key={progress}
                          type="button"
                          onClick={() => setEditingStudentDetail({
                            ...editingStudentDetail,
                            lessonSent: progress
                          })}
                          className={`py-2 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                            isActive
                              ? 'bg-teal-50 border-teal-500 text-teal-700 shadow-sm shadow-teal-500/5'
                              : 'bg-white border-slate-200 text-slate-505 hover:bg-slate-50'
                          }`}
                        >
                          <span>{progress === 'Completed' ? '✅' : '⏳'}</span>
                          <span>{progress}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 3. Remarks textarea */}
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-extrabold text-slate-400 tracking-wider">Specific Remarks & Comments</label>
                  <textarea
                    rows={3}
                    placeholder="E.g. Memorized 5 verses of Surah Yusuf, came late due to rain."
                    value={editingStudentDetail.notesSent}
                    onChange={(e) => setEditingStudentDetail({
                      ...editingStudentDetail,
                      notesSent: e.target.value
                    })}
                    className="w-full text-xs font-medium text-slate-700 bg-white border border-slate-200 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 rounded-xl p-3 outline-none resize-none placeholder-slate-350 transition-all font-sans"
                  />
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingStudentDetail(null)}
                  className="px-4 py-2 bg-slate-50 hover:bg-slate-100 text-slate-500 font-bold text-[10px] tracking-wider uppercase rounded-xl cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveSubmissionStudent(
                    editingStudentDetail.submissionId,
                    editingStudentDetail.studentId,
                    {
                      attendanceSent: editingStudentDetail.attendanceSent,
                      lessonSent: editingStudentDetail.lessonSent,
                      notesSent: editingStudentDetail.notesSent
                    }
                  )}
                  className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-extrabold text-[10px] tracking-wider uppercase rounded-xl cursor-pointer transition-all shadow-md shadow-emerald-500/10 flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  Save Changes
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

    </div>
  );
}
