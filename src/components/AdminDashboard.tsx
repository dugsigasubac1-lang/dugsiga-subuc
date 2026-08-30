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
  Cloud,
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
  FileText,
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
  Bus,
  Eye,
  Info,
  CheckCircle2,
  Sun,
  Moon,
  Sunrise,
  ShieldAlert,
  Crown,
  ShieldCheck,
  CheckSquare,
  Square
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
  InvoiceItem,
  TeacherAttendanceRecord
} from '../types';
import { MoneyTransferTab } from './MoneyTransferTab';
import { WeeklyAssessmentTab } from './WeeklyAssessmentTab';
import { LandingControlTab } from './LandingControlTab';
import StudentMediaModal from './StudentMediaModal';
import { DugsigaSubucLogo } from './Logo';
import { ChangeWebsiteLogoModal } from './ChangeWebsiteLogoModal';
import { SyncDiagnosticTool } from './SyncDiagnosticTool';
import {
  ActiveStudentsModal,
  ParentsModal,
  TuitionInvoicedModal,
  CollectedFeesModal,
  PendingFeesModal,
  BusInvoicedModal,
  ActiveRidersModal,
  BusCollectedModal,
  PendingBusModal
} from './DashboardModals';
import { 
  generateDailyTextReport, 
  generateAttendanceSummaryReport,
  generateStudentAttendanceHistoryReport,
  generateTeacherAttendanceReport,
  generateStudentBehaviorCommentsReport,
  generateStudentBehaviorCommentsCSV,
  triggerFileDownload, 
  triggerBackupDownload,
  DEFAULT_INVOICE_ACCOUNTS_NOTE
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

// IndexedDB Directory Handle persistence helpers for automated D:\system_updates backups
const getStoredBackupDirHandle = async (): Promise<FileSystemDirectoryHandle | null> => {
  return new Promise((resolve) => {
    const request = indexedDB.open("DugsigaBackupDB", 1);
    request.onupgradeneeded = (e: any) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains("handles")) {
        db.createObjectStore("handles");
      }
    };
    request.onsuccess = (e: any) => {
      const db = e.target.result;
      try {
        const transaction = db.transaction("handles", "readonly");
        const store = transaction.objectStore("handles");
        const getRequest = store.get("backupDir");
        getRequest.onsuccess = () => resolve(getRequest.result || null);
        getRequest.onerror = () => resolve(null);
      } catch (err) {
        resolve(null);
      }
    };
    request.onerror = () => resolve(null);
  });
};

const storeBackupDirHandle = async (handle: FileSystemDirectoryHandle): Promise<void> => {
  return new Promise((resolve) => {
    const request = indexedDB.open("DugsigaBackupDB", 1);
    request.onupgradeneeded = (e: any) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains("handles")) {
        db.createObjectStore("handles");
      }
    };
    request.onsuccess = (e: any) => {
      const db = e.target.result;
      try {
        const transaction = db.transaction("handles", "readwrite");
        const store = transaction.objectStore("handles");
        store.put(handle, "backupDir");
        transaction.oncomplete = () => resolve();
      } catch (err) {
        resolve();
      }
    };
    request.onerror = () => resolve();
  });
};

export const getStudentsForTeacher = (teacher: Teacher, students: Student[]): Student[] => {
  if (!teacher || !students) return [];
  const tId = (teacher.id || '').trim();
  const tName = (teacher.name || '').trim().toLowerCase();
  const tClass = (teacher.classAssigned || teacher.className || '').trim().toLowerCase();
  const cleanTName = tName.replace(/sh\.\s+|malm\.\s+|sheikh\.\s+|macallin\.\s+/gi, '').trim();

  return students.filter(s => {
    if (!s) return false;
    const isAct = s.active === true || String(s.active) === 'true' || s.active === undefined;
    if (!isAct) return false;

    // Direct ID match (primary or secondary)
    if (tId && (s.teacherId === tId || s.secondTeacherId === tId)) return true;

    // Direct Name match
    if (tName) {
      if (s.teacherId && s.teacherId.toLowerCase() === tName) return true;
      if (s.secondTeacherId && s.secondTeacherId.toLowerCase() === tName) return true;
      if (cleanTName.length > 2) {
        if (s.teacherId && s.teacherId.toLowerCase().includes(cleanTName)) return true;
        if (s.secondTeacherId && s.secondTeacherId.toLowerCase().includes(cleanTName)) return true;
      }
    }

    // Class assignment match
    if (tClass && s.className && s.className.toLowerCase() === tClass) return true;

    return false;
  });
};

interface AdminDashboardProps {
  database: DatabaseState;
  onSaveDatabase: (
    updatedDb: DatabaseState,
    options?: {
      userRole?: 'admin' | 'teacher' | null;
      explicitDeletedStudentIds?: string[];
      explicitDeletedTeacherIds?: string[];
      explicitDeletedExamIds?: string[];
      explicitDeletedInvoiceIds?: string[];
    }
  ) => void;
  onLogout: () => void;
}

export function AdminDashboard({ database, onSaveDatabase, onLogout }: AdminDashboardProps) {
  const [activeTab, setActiveTab ] = useState<'overview' | 'students' | 'teachers' | 'classes' | 'reports' | 'billing' | 'backup' | 'exams' | 'moneyTransfers' | 'submissions' | 'teacherAttendance' | 'landing' | 'studentAttendance' | 'receiptsHistory'>('overview');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showNotifPopup, setShowNotifPopup] = useState(false);
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  const [exportSelectedClass, setExportSelectedClass] = useState<string>('All');
  const [exportSelectedTeacher, setExportSelectedTeacher] = useState<string>('All');
  const [showLogoModal, setShowLogoModal] = useState(false);
  const [backupSubTab, setBackupSubTab] = useState<'diagnostics' | 'backups'>('diagnostics');

  const handleSaveLogo = (newLogoUrl: string) => {
    const cleanUrl = newLogoUrl ? newLogoUrl.trim() : "";
    const updatedSettings = {
      ...(database.landingPageSettings || {
        schoolName: "Dugsiga Subuc",
        heroTitle: "",
        heroSub: "",
        aboutText: "",
        whatWeDo: "",
        contactEmail: "",
        contactPhone: "",
        contactAddress: "",
        cards: [],
        pictures: []
      }),
      logoUrl: cleanUrl
    };
    onSaveDatabase({
      ...database,
      landingPageSettings: updatedSettings
    });
    setFeedbackMsg("Astaanta cusub ee website-ka si toos ah ayaa loo kaydiyay!");
  };
  
  // Student Attendance filter and details states
  const [studAttClass, setStudAttClass] = useState<string>('All');
  const [studAttTeacher, setStudAttTeacher] = useState<string>('All');
  const [studAttDate, setStudAttDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [studAttSearch, setStudAttSearch] = useState<string>('');
  const [studAttStatusFilter, setStudAttStatusFilter] = useState<'All' | 'Present' | 'Late' | 'Absent' | 'Unlogged'>('All');
  const [selectedAttendanceDetail, setSelectedAttendanceDetail] = useState<DailyProgress | null>(null);
  
  // Custom confirmation modal state to bypass iframe modal blockages
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    accentColor?: 'rose' | 'indigo' | 'amber' | 'teal';
    confirmText?: string;
    onConfirm: () => void;
  } | null>(null);

  // Cloud Backups States
  interface BackupChanges {
    summary: string;
    newStudents?: any[];
    removedStudents?: any[];
    updatedStudents?: any[];
    newBilling?: any[];
    newInvoices?: any[];
    newTeachers?: any[];
    newTransfers?: any[];
  }

  interface CloudBackupMeta {
    id: string;
    timestamp: string;
    studentCount: number;
    teacherCount: number;
    invoiceCount: number;
    size: number;
    status: 'success' | 'failed';
    storageType: string;
    changes?: BackupChanges | null;
  }
  const [cloudBackups, setCloudBackups] = useState<CloudBackupMeta[]>([]);
  const [isLoadingBackups, setIsLoadingBackups] = useState<boolean>(false);
  const [isTriggeringBackup, setIsTriggeringBackup] = useState<boolean>(false);

  const fetchCloudBackups = async () => {
    setIsLoadingBackups(true);
    try {
      const res = await fetch('/api/backups');
      const data = await res.json();
      if (data.success && Array.isArray(data.backups)) {
        setCloudBackups(data.backups);
      }
    } catch (err) {
      console.error('Failed to fetch cloud backups:', err);
    } finally {
      setIsLoadingBackups(false);
    }
  };

  const handleTriggerCloudBackup = async () => {
    setIsTriggeringBackup(true);
    try {
      const res = await fetch('/api/backups/trigger', {
        method: 'POST'
      });
      const data = await res.json();
      if (data.success) {
        setFeedbackMsg("Muuqaal cusub oo Cloud Backup ah ayaa si guul leh loo sameeyay! (New cloud backup snapshot generated successfully!)");
        fetchCloudBackups();
      } else {
        setFeedbackMsg("Cilad baa dhacday: " + (data.error || 'Failed to trigger backup'));
      }
    } catch (err: any) {
      setFeedbackMsg("Cilad xiriirka ah: " + err.message);
    } finally {
      setIsTriggeringBackup(false);
    }
  };

  const handleRestoreCloudBackup = (backupId: string) => {
    setConfirmModal({
      isOpen: true,
      title: "Cusboonaysiinta iyo Soo-celinta Xogta (Restore Cloud Backup)",
      message: `Ma hubtaa inaad rabto inaad dib u soo celiso backup-ka "${backupId}"? Tani waxay gabi ahaanba beddeli doontaa xogta hadda jirta. (Are you sure you want to restore the backup snapshot "${backupId}"? This will overwrite your active live system state with the backup copy.)`,
      accentColor: 'teal',
      confirmText: 'Haa, Soo celi (Yes, Restore)',
      onConfirm: async () => {
        setConfirmModal(null);
        setIsLoadingBackups(true);
        try {
          const res = await fetch(`/api/backups/${backupId}/restore`, {
            method: 'POST'
          });
          const data = await res.json();
          if (data.success && data.state) {
            onSaveDatabase(data.state);
            setFeedbackMsg(`Xogta waxaa si guul leh loogu soo celiyay backup-kii: ${backupId}!`);
            fetchCloudBackups();
          } else {
            setFeedbackMsg("Cilad baa dhacday intii la soo celinayay xogta: " + (data.error || 'Unknown error'));
          }
        } catch (err: any) {
          setFeedbackMsg("Xiriirku waa guuldaystay: " + err.message);
        } finally {
          setIsLoadingBackups(false);
        }
      }
    });
  };

  const handleDeleteCloudBackup = (backupId: string) => {
    setConfirmModal({
      isOpen: true,
      title: "Masaxidda Backup-ka (Delete Cloud Backup)",
      message: `Ma hubtaa inaad rabto inaad si joogto ah u tirtirto backup-ka "${backupId}" ee ku jira Google Cloud Storage? (Are you sure you want to permanently delete the backup snapshot "${backupId}" from Google Cloud Storage?)`,
      accentColor: 'rose',
      confirmText: 'Haa, Masax (Yes, Delete)',
      onConfirm: async () => {
        setConfirmModal(null);
        setIsLoadingBackups(true);
        try {
          const res = await fetch(`/api/backups/${backupId}`, {
            method: 'DELETE'
          });
          const data = await res.json();
          if (data.success) {
            setFeedbackMsg("Backup-kii waa la masaxay si guul leh. (Backup snapshot was deleted successfully.)");
            fetchCloudBackups();
          } else {
            setFeedbackMsg("Cilad tirtirka ah: " + (data.error || 'Unknown error'));
          }
        } catch (err: any) {
          setFeedbackMsg("Xiriirka tirtirka waa go'ay: " + err.message);
        } finally {
          setIsLoadingBackups(false);
        }
      }
    });
  };

  useEffect(() => {
    if (activeTab === 'backup') {
      fetchCloudBackups();
    }
  }, [activeTab]);

  // Teacher Attendance and Geofencing reporting states
  const [attendanceSubTab, setAttendanceSubTab] = useState<'dashboard' | 'checklist' | 'reports' | 'all_logs'>('dashboard');
  const [selectedReportTeacherId, setSelectedReportTeacherId] = useState<string>('');
  const [teacherReportStartDate, setTeacherReportStartDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [teacherReportEndDate, setTeacherReportEndDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  
  // Teacher attendance record editing and adding state
  const [editingTeacherAtt, setEditingTeacherAtt] = useState<{
    id: string;
    teacherId: string;
    date: string;
    time: string;
    status: 'Present' | 'Late';
  } | null>(null);
  const [showAddTeacherAttModal, setShowAddTeacherAttModal] = useState(false);
  const [newTeacherAttRecord, setNewTeacherAttRecord] = useState({
    teacherId: '',
    date: new Date().toISOString().split('T')[0],
    time: '07:25',
    status: 'Present' as 'Present' | 'Late'
  });
  const [searchTeacherAttQuery, setSearchTeacherAttQuery] = useState('');
  const [filterTeacherAttStatus, setFilterTeacherAttStatus] = useState<'All' | 'Present' | 'Late'>('All');
  const [filterTeacherAttTeacherId, setFilterTeacherAttTeacherId] = useState<string>('All');

  const handleSaveEditedTeacherAtt = () => {
    if (!editingTeacherAtt) return;
    const teacher = database.teachers.find(t => t.id === editingTeacherAtt.teacherId);
    const updated = (database.teacherAttendance || []).map(a => {
      if (a.id === editingTeacherAtt.id) {
        return {
          ...a,
          teacherId: editingTeacherAtt.teacherId,
          teacherName: teacher ? teacher.name : a.teacherName,
          date: editingTeacherAtt.date,
          time: editingTeacherAtt.time,
          status: editingTeacherAtt.status
        };
      }
      return a;
    });

    onSaveDatabase({
      ...database,
      teacherAttendance: updated
    });
    setEditingTeacherAtt(null);
    setFeedbackMsg("Diiwaanka imaanshaha macallinka si guul ah ayaa loo cusboonaysiiyay!");
    setTimeout(() => setFeedbackMsg(''), 4000);
  };

  const handleDeleteTeacherAtt = (recId: string, teacherId: string, date: string) => {
    if (!confirm("Ma hubtaa inaad tirtirto diiwaankan imaanshaha?")) return;
    const updated = (database.teacherAttendance || []).filter(a => {
      if (recId && a.id === recId) return false;
      if (a.teacherId === teacherId && a.date === date) return false;
      return true;
    });

    onSaveDatabase({
      ...database,
      teacherAttendance: updated
    });
    setFeedbackMsg("Diiwaanka imaanshaha macallinka waa la tirtiray!");
    setTimeout(() => setFeedbackMsg(''), 4000);
  };

  const handleAddNewTeacherAtt = () => {
    if (!newTeacherAttRecord.teacherId) {
      alert("Fadlan dooro macallin!");
      return;
    }
    const teacher = database.teachers.find(t => t.id === newTeacherAttRecord.teacherId);
    const newRecord: TeacherAttendanceRecord = {
      id: `tatt-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      teacherId: newTeacherAttRecord.teacherId,
      teacherName: teacher ? teacher.name : 'Teacher',
      date: newTeacherAttRecord.date,
      time: newTeacherAttRecord.time,
      status: newTeacherAttRecord.status,
      distanceFromSchool: 15,
      latitude: campusLat,
      longitude: campusLon
    };

    // Remove any existing duplicate for that teacher on that date first
    const filtered = (database.teacherAttendance || []).filter(
      a => !(a.teacherId === newTeacherAttRecord.teacherId && a.date === newTeacherAttRecord.date)
    );

    onSaveDatabase({
      ...database,
      teacherAttendance: [newRecord, ...filtered]
    });
    setShowAddTeacherAttModal(false);
    setFeedbackMsg("Diiwaanka imaanshaha cusub si guul leh ayaa loo kaydiyay!");
    setTimeout(() => setFeedbackMsg(''), 4000);
  };
  
  const [campusName, setCampusName] = useState<string>(database.schoolLocation?.name || "Banuu Jalaal School Campus");
  const [campusLat, setCampusLat] = useState<number>(database.schoolLocation?.latitude || 8.398573);
  const [campusLon, setCampusLon] = useState<number>(database.schoolLocation?.longitude || 48.480370);
  const [campusRadius, setCampusRadius] = useState<number>(database.schoolLocation?.radiusMeters || 200);
  const [campusAllowSimulation, setCampusAllowSimulation] = useState<boolean>(database.schoolLocation?.allowSimulation || false);
  const [locationSuccessMsg, setLocationSuccessMsg] = useState<string>('');
  const [locationErrorMsg, setLocationErrorMsg] = useState<string>('');
  const [isCapturingLocation, setIsCapturingLocation] = useState<boolean>(false);
  const todayDateStr = new Date().toISOString().split('T')[0];

  // 3-Day Laptop D:\system_updates Backup Helper Calculations
  const getDaysSinceLastBackup = () => {
    const savedDateStr = database.lastBackupDownloadDate || localStorage.getItem('dugsi_last_backup_date');
    if (!savedDateStr) return null;
    try {
      const lastDate = new Date(savedDateStr);
      const today = new Date();
      lastDate.setHours(0, 0, 0, 0);
      today.setHours(0, 0, 0, 0);
      const diffTime = Math.abs(today.getTime() - lastDate.getTime());
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      return diffDays;
    } catch (e) {
      return null;
    }
  };

  const daysSinceLastBackup = getDaysSinceLastBackup();
  const isBackupDue = daysSinceLastBackup === null || daysSinceLastBackup >= 3;

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
    behaviorSent?: string;
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

  const handleRevokeOtherDevicesClick = () => {
    setConfirmModal({
      isOpen: true,
      title: "Ka Saar Aaladaha Kale (Logout Other Devices)",
      message: "Ma hubtaa inaad ka saarto dhammaan aaladaha kale ee uu maamuluhu hadda kaga furan yahay? Aaladdan aad hadda isticmaalayso kaliya ayaa furan doonta oo sii shaqayn doonta.",
      accentColor: "amber",
      confirmText: "Haa, Ka Saar Aaladaha Kale",
      onConfirm: () => {
        const now = Date.now();
        let currentDeviceSessionId = localStorage.getItem('dugsi_session_id');
        if (!currentDeviceSessionId) {
          currentDeviceSessionId = 'admin_sess_' + Math.random().toString(36).substring(2, 11) + '_' + now;
          localStorage.setItem('dugsi_session_id', currentDeviceSessionId);
        }
        localStorage.setItem('dugsi_admin_login_at', String(now));
        onSaveDatabase({
          ...database,
          adminAllowedSessionId: currentDeviceSessionId,
          adminSessionId: currentDeviceSessionId,
          adminRevokeTime: now
        }, { userRole: 'admin' });
        setFeedbackMsg("Dhammaan aaladaha kale ee maamulaha waa laga saaray! Aaladdan kaliya ayaa hadda furan.");
        setConfirmModal(null);
      }
    });
  };

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
  const [showActiveStudentsModal, setShowActiveStudentsModal] = useState<boolean>(false);
  const [showParentsModal, setShowParentsModal] = useState<boolean>(false);
  const [parentsModalSearchQuery, setParentsModalSearchQuery] = useState<string>('');
  const [parentsModalStatusFilter, setParentsModalStatusFilter] = useState<'all' | 'active' | 'suspended' | 'partial'>('all');
  const [parentsModalSessionFilter, setParentsModalSessionFilter] = useState<'all' | 'morning' | 'afternoon' | 'both'>('all');
  const [showTuitionInvoicedModal, setShowTuitionInvoicedModal] = useState<boolean>(false);
  const [tuitionInvoicedSearchQuery, setTuitionInvoicedSearchQuery] = useState<string>('');
  const [tuitionInvoicedClassFilter, setTuitionInvoicedClassFilter] = useState<string>('all');
  const [tuitionInvoicedStatusFilter, setTuitionInvoicedStatusFilter] = useState<'all' | 'paid' | 'partial' | 'pending'>('all');
  const [showActiveRidersModal, setShowActiveRidersModal] = useState<boolean>(false);
  const [activeRidersSearchQuery, setActiveRidersSearchQuery] = useState<string>('');
  const [showBusInvoicedModal, setShowBusInvoicedModal] = useState<boolean>(false);
  const [busInvoicedSearchQuery, setBusInvoicedSearchQuery] = useState<string>('');
  const [invoiceCategoryModal, setInvoiceCategoryModal] = useState<'fee' | 'bus' | null>(null);
  const [categoryModalSearch, setCategoryModalSearch] = useState<string>('');
  const [categoryModalFilter, setCategoryModalFilter] = useState<'all' | 'collected' | 'outstanding'>('all');
  const [showCollectedFeesBreakdownMonth, setShowCollectedFeesBreakdownMonth] = useState<string | null>(null);
  const [showPendingFeesBreakdownMonth, setShowPendingFeesBreakdownMonth] = useState<string | null>(null);
  const [pendingFeesSearchQuery, setPendingFeesSearchQuery] = useState<string>('');
  const [pendingFeesClassFilter, setPendingFeesClassFilter] = useState<string>('all');
  const [showPendingBusBreakdownMonth, setShowPendingBusBreakdownMonth] = useState<string | null>(null);
  const [pendingBusSearchQuery, setPendingBusSearchQuery] = useState<string>('');
  const [pendingBusClassFilter, setPendingBusClassFilter] = useState<string>('all');
  const [selectedInvoiceFeeDetail, setSelectedInvoiceFeeDetail] = useState<{
    invoiceId?: string;
    invoiceNo: string;
    recipientName: string;
    recipientPhone?: string;
    recipientType?: 'parent' | 'business';
    recipientEmail?: string;
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
    paidAmount: number;
    date: string;
    dueDate?: string;
    status?: 'Paid' | 'Unpaid' | 'Partial';
    studentId?: string;
    studentName?: string;
    className?: string;
    teacherName?: string;
    notes?: string;
    invoiceTotalAmount?: number;
    invoiceAmountPaid?: number;
    createdBy?: string;
    rawInvoice?: Invoice;
    rawItem?: InvoiceItem;
  } | null>(null);
  const [showBusCollectedBreakdownMonth, setShowBusCollectedBreakdownMonth] = useState<string | null>(null);
  const [showReceiptModal, setShowReceiptModal] = useState<BillingRecord | null>(null);
  const [selectedReceiptsMonth, setSelectedReceiptsMonth] = useState<string>('2026-06');
  const [receiptsSearch, setReceiptsSearch] = useState<string>('');
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

  // Cache Recovery, Backup Preview & CSV Importer states
  const [foundCacheBackups, setFoundCacheBackups] = useState<Array<{ key: string, origin: 'localStorage' | 'sessionStorage', studentCount: number, timestamp: string, state: DatabaseState }>>([]);
  const [hasScannedCache, setHasScannedCache] = useState(false);
  const [csvPreviewStudents, setCsvPreviewStudents] = useState<Array<any>>([]);
  const [csvError, setCsvError] = useState<string>('');

  // Backup Inspection & Safe Preview States
  const [previewBackupData, setPreviewBackupData] = useState<{
    sourceName: string;
    timestamp?: string;
    state: DatabaseState;
    changes?: BackupChanges | null;
  } | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState<boolean>(false);
  const [previewActiveTab, setPreviewActiveTab] = useState<'changes' | 'overview' | 'students' | 'teachers' | 'billing' | 'xawaalada'>('changes');
  const [previewSearchTerm, setPreviewSearchTerm] = useState<string>('');

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

  const getBillingStatusForStudent = (student: Student, monthString: string): BillingRecord => {
    // 1. First, check if there is a manual payment in database.billing
    const keyId = `B-${monthString}-${student.id}`;
    const manualRecord = database.billing.find(b => b.id === keyId || (b.studentId === student.id && b.month === monthString));
    if (manualRecord) {
      return manualRecord;
    }

    // 2. Default Unpaid Record Object
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
    if (!database.invoices) return { registration: 0, files: 0, other: 0, total: 0 };
    let regTotal = 0;
    let filesTotal = 0;
    let otherTotal = 0;
    
    const monthInvoices = database.invoices.filter(inv => {
      const invMonth = inv.date ? inv.date.slice(0, 7) : (inv.createdAt ? inv.createdAt.slice(0, 7) : '');
      return invMonth === month;
    });
    
    for (const inv of monthInvoices) {
      if (inv.totalAmount <= 0 || inv.amountPaid <= 0) continue;
      const paidFraction = inv.amountPaid / inv.totalAmount;
      
      for (const item of inv.items) {
        const desc = item.description.toLowerCase();
        const isTuition = desc.includes('bisha') || desc.includes('bish') || desc.includes('monthly') || desc.includes('tuition') || desc.includes('fee') || desc.includes('quraan') || desc.includes('school') || desc.includes('waxbarasho') || desc.includes('dugsi') || desc.includes('fasal');
        const isBus = desc.includes('baska') || desc.includes('bus') || desc.includes('gaari') || desc.includes('transport');
        
        if (isTuition || isBus) {
          continue;
        }
        
        const isReg = desc.includes('diiwan') || desc.includes('diwan') || desc.includes('regis');
        const isFile = desc.includes('fayl') || desc.includes('file');
        
        const itemTotal = item.quantity * item.unitPrice;
        const itemPaid = itemTotal * paidFraction;
        
        if (isReg) {
          regTotal += itemPaid;
        } else if (isFile) {
          filesTotal += itemPaid;
        } else {
          otherTotal += itemPaid;
        }
      }
    }
    
    return {
      registration: Number(regTotal.toFixed(2)),
      files: Number(filesTotal.toFixed(2)),
      other: Number(otherTotal.toFixed(2)),
      total: Number((regTotal + filesTotal + otherTotal).toFixed(2))
    };
  };

  const getInvoiceInvoicedForMonth = (month: string) => {
    if (!database.invoices) return { registration: 0, files: 0, other: 0, total: 0 };
    let regTotal = 0;
    let filesTotal = 0;
    let otherTotal = 0;
    
    const monthInvoices = database.invoices.filter(inv => {
      const invMonth = inv.date ? inv.date.slice(0, 7) : (inv.createdAt ? inv.createdAt.slice(0, 7) : '');
      return invMonth === month;
    });
    
    for (const inv of monthInvoices) {
      for (const item of inv.items) {
        const desc = item.description.toLowerCase();
        const isTuition = desc.includes('bisha') || desc.includes('bish') || desc.includes('monthly') || desc.includes('tuition') || desc.includes('fee') || desc.includes('quraan') || desc.includes('school') || desc.includes('waxbarasho') || desc.includes('dugsi') || desc.includes('fasal');
        const isBus = desc.includes('baska') || desc.includes('bus') || desc.includes('gaari') || desc.includes('transport');
        
        if (isTuition || isBus) {
          continue;
        }
        
        const isReg = desc.includes('diiwan') || desc.includes('diwan') || desc.includes('regis');
        const isFile = desc.includes('fayl') || desc.includes('file');
        
        const itemTotal = item.quantity * item.unitPrice;
        
        if (isReg) {
          regTotal += itemTotal;
        } else if (isFile) {
          filesTotal += itemTotal;
        } else {
          otherTotal += itemTotal;
        }
      }
    }
    
    return {
      registration: Number(regTotal.toFixed(2)),
      files: Number(filesTotal.toFixed(2)),
      other: Number(otherTotal.toFixed(2)),
      total: Number((regTotal + filesTotal + otherTotal).toFixed(2))
    };
  };

  const syncInvoiceToBilling = (inv: Invoice, currentBilling: BillingRecord[], students: Student[]): BillingRecord[] => {
    // We do not sync parent invoices to tuition/bus billing records as tuition is paid separately and has its own receipt.
    // We only consider the registration fee and other balances on invoices for general reporting.
    if (inv && students) {
      return currentBilling;
    }
    return currentBilling;
  };

  const [currentMonthFilter, setCurrentMonthFilter] = useState(() => {
    return calendarMonth;
  });
  
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

  const getDashboardAvailableMonths = () => {
    const monthsSet = new Set<string>();
    
    // Add current calendar month
    const now = new Date();
    const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    monthsSet.add(currentMonthStr);
    
    // Add other months of the current year so they can select any month of this year
    for (let m = 1; m <= 12; m++) {
      monthsSet.add(`${now.getFullYear()}-${String(m).padStart(2, '0')}`);
    }
    
    // Also add months from billing records
    if (database.billing) {
      database.billing.forEach(b => {
        if (b.month) monthsSet.add(b.month);
      });
    }
    
    // Also add months from invoices
    if (database.invoices) {
      database.invoices.forEach(inv => {
        const invMonth = inv.date ? inv.date.slice(0, 7) : (inv.createdAt ? inv.createdAt.slice(0, 7) : '');
        if (invMonth) monthsSet.add(invMonth);
      });
    }
    
    return Array.from(monthsSet).sort((a, b) => b.localeCompare(a)); // Sort descending (newest first)
  };

  // Student Tuition Fee Statistics Calculations
  const currentMonthTuitionInvoiced = activeStudents.reduce((sum, s) => sum + Number(s.monthlyFee || 0), 0);
  const currentMonthResolvedRecords = (database.students || []).map(s => getBillingStatusForStudent(s, currentMonthFilter));
  const currentMonthTuitionCollected = currentMonthResolvedRecords.reduce((sum, r) => sum + Number(r.amountPaid || 0), 0);
  const currentMonthTuitionPending = Math.max(0, currentMonthTuitionInvoiced - currentMonthTuitionCollected);

  // General Invoices Totals
  const currentMonthInvoiceData = getInvoiceInvoicedForMonth(currentMonthFilter);
  const currentMonthInvoicePayments = getInvoicePaymentsForMonth(currentMonthFilter);

  // Total Invoiced & Collections (Tuition + General Invoices)
  const currentMonthInvoiced = currentMonthTuitionInvoiced + currentMonthInvoiceData.total;
  const currentMonthPaidAmount = currentMonthTuitionCollected + currentMonthInvoicePayments.total;
  const currentMonthUnpaidAmount = Math.max(0, currentMonthInvoiced - currentMonthPaidAmount);

  // Bus Fare Statistics Calculations
  const busRiders = (database.students || []).filter(s => s.active && s.busFee && Number(s.busFee) > 0);
  const totalBusRidersCount = busRiders.length;
  const currentMonthBusInvoiced = busRiders.reduce((sum, s) => sum + Number(s.busFee || 0), 0);
  const currentMonthBusCollected = currentMonthResolvedRecords.reduce((sum, r) => sum + Number(r.busFeePaid || 0), 0);
  const currentMonthBusPending = Math.max(0, currentMonthBusInvoiced - currentMonthBusCollected);

  const allTimeBusInvoiced = (database.billing || []).reduce((sum, r) => sum + Number(r.busFeeDue || 0), 0);
  const allTimeBusCollected = (database.billing || []).reduce((sum, r) => sum + Number(r.busFeePaid || 0), 0);
  const allTimeBusOutstanding = Math.max(0, allTimeBusInvoiced - allTimeBusCollected);

  // All-time Tuition Invoiced & Collected
  const allTimeTuitionInvoiced = (database.billing || []).reduce((sum, r) => sum + Number(r.amountDue || 0), 0);
  const allTimeTuitionCollected = (database.billing || []).reduce((sum, r) => sum + Number(r.amountPaid || 0), 0);

  // Total Combined Expected Revenue (Student Tuition Fees + Bus Fare)
  const currentMonthTotalExpectedRevenue = currentMonthTuitionInvoiced + currentMonthBusInvoiced;
  const currentMonthTotalCombinedCollected = currentMonthTuitionCollected + currentMonthBusCollected;
  const currentMonthTotalCombinedPending = Math.max(0, currentMonthTotalExpectedRevenue - currentMonthTotalCombinedCollected);

  const billingOverviewData = [
    { name: 'Collected Fees', value: currentMonthPaidAmount, color: '#0d9488' }, // Teal 600
    { name: 'Pending Fees', value: currentMonthUnpaidAmount, color: '#cbd5e1' }  // Slate 300
  ];
  
  const currentMonthName = getFriendlyMonthName(currentMonthFilter);

  // -------------------------------------------------------------
  // TAB 2: STUDENT MANAGEMENT DATASTORE
  // -------------------------------------------------------------
  const classSelectionList = database.classes && database.classes.length > 0
    ? database.classes
    : ['Al-Baqarah Memorization', 'Juz Amma Preparatory', 'Advanced Quran Tajweed'];

  const [studentSearch, setStudentSearch] = useState('');
  const [studentClassFilter, setStudentClassFilter] = useState('All');
  const [studentTeacherFilter, setStudentTeacherFilter] = useState('All');
  const [studentSessionFilter, setStudentSessionFilter] = useState<'All' | 'Morning' | 'Afternoon' | 'Both'>('All');
  const [expandedComments, setExpandedComments] = useState<Record<string, boolean>>({});
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  
  // Register Student Fields
  const [newStudentName, setNewStudentName] = useState('');
  const [newStudentParent, setNewStudentParent] = useState('');
  const [newStudentPhone, setNewStudentPhone] = useState('');
  const [newStudentClass, setNewStudentClass] = useState('Al-Baqarah Memorization');
  const [newStudentFee, setNewStudentFee] = useState(35);
  const [newStudentBusFee, setNewStudentBusFee] = useState<number>(0);
  const [newStudentTeacher, setNewStudentTeacher] = useState('T-01');
  const [newStudentSecondTeacher, setNewStudentSecondTeacher] = useState<string>('');
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
    setNewStudentSecondTeacher(student.secondTeacherId || '');
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
    setNewStudentSecondTeacher('');
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
    const matchQuery = s.name.toLowerCase().includes(sSearch) || 
      s.id.toLowerCase().includes(sSearch) || 
      s.parentName.toLowerCase().includes(sSearch) ||
      (s.parentPhone && s.parentPhone.toLowerCase().includes(sSearch));
    const matchClass = studentClassFilter === 'All' ? true : s.className === studentClassFilter;
    const matchTeacher = studentTeacherFilter === 'All' ? true : (s.teacherId === studentTeacherFilter || s.secondTeacherId === studentTeacherFilter);
    const sSession = s.session || 'Both';
    const matchSession = studentSessionFilter === 'All' ? true : sSession === studentSessionFilter;
    return matchQuery && matchClass && matchTeacher && matchSession;
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
            secondTeacherId: newStudentSecondTeacher || undefined,
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
      // Allocate the next available sequential student ID e.g. DS001, DS002
      const existingIds = new Set((database.students || []).map(s => s.id));
      let nextNum = 1;
      while (existingIds.has(`DS${String(nextNum).padStart(3, '0')}`)) {
        nextNum++;
      }
      const nextId = `DS${String(nextNum).padStart(3, '0')}`;

      const newStudent: Student = {
        id: nextId,
        name: newStudentName.trim(),
        parentName: newStudentParent.trim(),
        parentPhone: newStudentPhone.trim(),
        teacherId: newStudentTeacher,
        secondTeacherId: newStudentSecondTeacher || undefined,
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

  const handleToggleSelectStudent = (studentId: string) => {
    setSelectedStudentIds(prev =>
      prev.includes(studentId)
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId]
    );
  };

  const handleToggleSelectAllStudents = () => {
    const currentFilteredIds = filteredStudents.map(s => s.id);
    if (currentFilteredIds.length === 0) return;
    const allSelected = currentFilteredIds.every(id => selectedStudentIds.includes(id));

    if (allSelected) {
      setSelectedStudentIds(prev => prev.filter(id => !currentFilteredIds.includes(id)));
    } else {
      setSelectedStudentIds(prev => Array.from(new Set([...prev, ...currentFilteredIds])));
    }
  };

  const handleClearSelectedStudents = () => {
    setSelectedStudentIds([]);
  };

  const handleDeleteSelectedStudents = () => {
    if (selectedStudentIds.length === 0) return;
    const count = selectedStudentIds.length;
    const selectedList = database.students.filter(s => selectedStudentIds.includes(s.id));
    const sampleNames = selectedList.slice(0, 3).map(s => s.name).join(', ');
    const extraSuffix = count > 3 ? ` iyo ${count - 3} arday oo kale` : '';

    setConfirmModal({
      isOpen: true,
      title: `Tirtir ${count} Arday oo La Doortay?`,
      message: `Ma hubtaa inaad hal mar nidaamka ka wada tirtirto ${count} arday (${sampleNames}${extraSuffix})? Dhammaan diiwaanka xogtooda, xaadiradooda, iyo xisaabaadkooda gebi ahaanba waa la tirtirayaa. Tani dib looma soo celin karo.`,
      accentColor: 'rose',
      onConfirm: () => {
        const deleteSet = new Set(selectedStudentIds);
        const filteredStudentsList = database.students.filter(s => !deleteSet.has(s.id));
        const filteredProgressList = (database.progress || []).filter(p => !deleteSet.has(p.studentId));
        const filteredBillingList = (database.billing || []).filter(b => !deleteSet.has(b.studentId));

        onSaveDatabase(
          {
            ...database,
            students: filteredStudentsList,
            progress: filteredProgressList,
            billing: filteredBillingList
          },
          { explicitDeletedStudentIds: Array.from(selectedStudentIds) }
        );

        setSelectedStudentIds([]);
        setFeedbackMsg(`Si guul leh ayaa loo tirtiray ${count} arday oo la doortay.`);
        setTimeout(() => setFeedbackMsg(''), 4000);
        setConfirmModal(null);
      }
    });
  };

  const handleDeleteStudent = (studentId: string) => {
    const student = database.students.find(s => s.id === studentId);
    const studentName = student ? student.name : studentId;
    setConfirmModal({
      isOpen: true,
      title: `Permanently Delete "${studentName}"?`,
      message: `Are you absolutely sure you want to permanently delete the student record for "${studentName}"? This will delete all their details, attendance journals and graded score sheets from database servers. This is irreversible.`,
      accentColor: 'rose',
      onConfirm: () => {
        const filteredStudents = database.students.filter(s => s.id !== studentId);
        const filteredProgress = (database.progress || []).filter(p => p.studentId !== studentId);
        const filteredBilling = (database.billing || []).filter(b => b.studentId !== studentId);
        onSaveDatabase(
          {
            ...database,
            students: filteredStudents,
            progress: filteredProgress,
            billing: filteredBilling
          },
          { explicitDeletedStudentIds: [studentId] }
        );
        setSelectedStudentIds(prev => prev.filter(id => id !== studentId));
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
  const [newTeacherIsAdmin, setNewTeacherIsAdmin] = useState<boolean>(false);

  const [newClassNameInput, setNewClassNameInput] = useState('');

  // Edit Teacher State
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const [editTeacherName, setEditTeacherName] = useState('');
  const [editTeacherClass, setEditTeacherClass] = useState('');
  const [editTeacherUser, setEditTeacherUser] = useState('');
  const [editTeacherPassword, setEditTeacherPassword] = useState('');
  const [editTeacherTime, setEditTeacherTime] = useState('07:30');
  const [editTeacherRegDate, setEditTeacherRegDate] = useState<string>('');
  const [editTeacherIsAdmin, setEditTeacherIsAdmin] = useState<boolean>(false);

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
      registrationDate: newTeacherRegDate || new Date().toISOString().split('T')[0],
      isAdmin: newTeacherIsAdmin
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
    setNewTeacherIsAdmin(false);
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
    setEditTeacherIsAdmin(Boolean(teacher.isAdmin));
    
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
          registrationDate: editTeacherRegDate || t.registrationDate || new Date().toISOString().split('T')[0],
          isAdmin: editTeacherIsAdmin
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
    setEditTeacherIsAdmin(false);
    setFeedbackMsg(`Successfully updated credentials for Sh. ${editTeacherName}`);
    setTimeout(() => setFeedbackMsg(''), 4000);
  };

  const handleToggleTeacherAdmin = (teacherId: string, makeAdmin: boolean) => {
    const teacher = database.teachers.find(t => t.id === teacherId);
    if (!teacher) return;
    const teacherName = `Sh. ${teacher.name}`;

    const updatedTeachers = database.teachers.map(t => {
      if (t.id === teacherId) {
        return {
          ...t,
          isAdmin: makeAdmin
        };
      }
      return t;
    });

    onSaveDatabase({
      ...database,
      teachers: updatedTeachers
    });

    setFeedbackMsg(
      makeAdmin
        ? `ðŸ‘‘ ${teacherName} si guul ah ayaa looga dhigay Maamule (Admin)! Hadda wuxuu geli karaa nidaamka Maamulka.`
        : `ðŸ›¡ï¸ Doorkii Maamulaha (Admin) waa laga qaaday ${teacherName}. Wuxuu hadda yahay Macallin caadi ah.`
    );
    setTimeout(() => setFeedbackMsg(''), 5000);
  };

  const handleDeleteTeacher = (teacherId: string) => {
    const teacher = database.teachers.find(t => t.id === teacherId);
    const teacherName = teacher ? `Sh. ${teacher.name}` : `this teacher`;
    const assignedStudents = database.students.filter(s => (s.teacherId === teacherId || s.secondTeacherId === teacherId) && s.active);
    
    let confirmMsg = `Are you sure you want to dismiss/delete ${teacherName}? They will no longer have dashboard access.`;
    let shouldUnassign = false;

    if (assignedStudents.length > 0) {
      confirmMsg = `${teacherName} is currently assigned to ${assignedStudents.length} active student(s). Dismissing ${teacherName} will automatically set their active students as "Unassigned" so you can reassign them in class settings. Do you want to proceed and unassign their students?`;
      shouldUnassign = true;
    }

    setConfirmModal({
      isOpen: true,
      title: `Confirm Dismissal of ${teacherName}?`,
      message: confirmMsg,
      accentColor: 'rose',
      onConfirm: () => {
        let updatedStudents = [...database.students];
        if (shouldUnassign) {
          updatedStudents = database.students.map(s => {
            let updated = { ...s };
            if (s.teacherId === teacherId) updated.teacherId = '';
            if (s.secondTeacherId === teacherId) updated.secondTeacherId = undefined;
            return updated;
          });
        }

        const updatedTeachers = database.teachers.filter(t => t.id !== teacherId);
        onSaveDatabase({
          ...database,
          teachers: updatedTeachers,
          students: updatedStudents
        });

        setFeedbackMsg(`${teacherName} record successfully dismissed and deleted from the database.`);
        setTimeout(() => setFeedbackMsg(''), 4000);
        setConfirmModal(null);
      }
    });
  };

  const handleDeleteSubmission = (submissionId: string) => {
    const submission = (database.submissions || []).find(s => s.id === submissionId);
    const subDate = submission?.timestamp ? submission.timestamp.split('T')[0] : '';
    const submissionDesc = submission 
      ? `submission by Sh. ${submission.teacherName} on ${subDate} (${submission.className || 'No Class'})` 
      : "this teacher submission record";

    setConfirmModal({
      isOpen: true,
      title: "Delete Audit Record?",
      message: `Are you absolutely sure you want to permanently delete the audit record for the ${submissionDesc}? This will delete the entry from the auditing panel.`,
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
      behaviorSent?: string;
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
          notesSent: fields.notesSent,
          behaviorSent: fields.behaviorSent
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
            faahfaahin: fields.notesSent,
            behaviorRemark: fields.behaviorSent
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
            behaviorRemark: fields.behaviorSent,
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
      return { trend: 'No Data', icon: 'âž–', diff: 0 };
    }

    const latest = studentScoresList[studentScoresList.length - 1];
    const previous = studentScoresList[studentScoresList.length - 2];
    const diff = latest - previous;

    if (diff > 1) {
      return { trend: 'Improving', icon: 'ðŸ“ˆ', diff };
    } else if (diff < -1) {
      return { trend: 'Declining', icon: 'ðŸ“‰', diff };
    } else {
      return { trend: 'Stable', icon: 'âž–', diff };
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
    
    const classStudents = database.students.filter(s => s.active && (s.teacherId === teacherObj.id || s.secondTeacherId === teacherObj.id));
    
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
        const matchT = examFilterTeacher === 'All' ? true : (s.teacherId === examFilterTeacher || s.secondTeacherId === examFilterTeacher);
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
  const [invoiceMonthFilter, setInvoiceMonthFilter] = useState<string>('all');

  // Interactive Form States
  const [invFormRecipientType, setInvFormRecipientType] = useState<'parent' | 'business'>('parent');
  const [selectedParent, setSelectedParent] = useState<{ name: string; phone: string } | null>(null);
  const [parentSearchTerm, setParentSearchTerm] = useState<string>('');
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
  const [invFormNotes, setInvFormNotes] = useState<string>(DEFAULT_INVOICE_ACCOUNTS_NOTE);
  const [invFormStatus, setInvFormStatus] = useState<'Paid' | 'Unpaid' | 'Partial'>('Unpaid');
  const [invFormAmountPaid, setInvFormAmountPaid] = useState<number>(0);

  const uniqueParents = React.useMemo(() => {
    const parentMap: { [key: string]: { name: string; phone: string; students: Student[] } } = {};
    activeStudents.forEach(student => {
      const pName = (student.parentName || '').trim();
      const pPhone = (student.parentPhone || '').trim();
      if (!pName) return;
      const key = `${pName.toLowerCase()}|||${pPhone.toLowerCase()}`;
      if (!parentMap[key]) {
        parentMap[key] = {
          name: pName,
          phone: pPhone,
          students: []
        };
      }
      parentMap[key].students.push(student);
    });
    return Object.values(parentMap).sort((a, b) => a.name.localeCompare(b.name));
  }, [activeStudents]);

  // Master parents list including all students (active, suspended, partial)
  const allParentsWithStatus = React.useMemo(() => {
    const parentMap: { 
      [key: string]: { 
        id: string;
        name: string; 
        phone: string; 
        students: Student[];
        activeCount: number;
        suspendedCount: number;
        status: 'Active' | 'Suspended';
        isPartiallySuspended: boolean;
        totalMonthlyFee: number;
        morningCount: number;
        afternoonCount: number;
        bothCount: number;
        parentSessionCategory: 'Morning' | 'Afternoon' | 'Both';
      } 
    } = {};

    (database.students || []).forEach(student => {
      const pName = (student.parentName || '').trim();
      const pPhone = (student.parentPhone || '').trim();
      // Generate clean grouping key
      const key = pPhone ? `${pPhone.toLowerCase()}|||${pName.toLowerCase()}` : (pName ? pName.toLowerCase() : student.id);
      
      if (!parentMap[key]) {
        parentMap[key] = {
          id: key,
          name: pName || `Waalidka (${student.name})`,
          phone: pPhone || 'Lama hayo',
          students: [],
          activeCount: 0,
          suspendedCount: 0,
          status: 'Suspended',
          isPartiallySuspended: false,
          totalMonthlyFee: 0,
          morningCount: 0,
          afternoonCount: 0,
          bothCount: 0,
          parentSessionCategory: 'Morning'
        };
      }

      parentMap[key].students.push(student);
      if (student.active) {
        parentMap[key].activeCount += 1;
        parentMap[key].totalMonthlyFee += Number(student.monthlyFee || 0);
      } else {
        parentMap[key].suspendedCount += 1;
      }

      // Track session distribution
      const rawSession = (student.session || 'Morning').toLowerCase();
      if (rawSession === 'afternoon') {
        parentMap[key].afternoonCount += 1;
      } else if (rawSession === 'both') {
        parentMap[key].bothCount += 1;
      } else {
        parentMap[key].morningCount += 1;
      }
    });

    return Object.values(parentMap).map(p => {
      // RULE: if at least ONE student is active, parent is ACTIVE.
      // If ALL students are suspended (activeCount === 0), parent is SUSPENDED.
      // isPartiallySuspended = true when parent has >1 students AND activeCount > 0 AND suspendedCount > 0
      const isActive = p.activeCount > 0;
      const isPartial = p.activeCount > 0 && p.suspendedCount > 0;

      // Determine parent's overall session category:
      // 'Both' if:
      //   - Parent has any student enrolled with session === 'Both', OR
      //   - Parent has students in both Morning AND Afternoon shifts
      // 'Morning' if parent only has Morning students
      // 'Afternoon' if parent only has Afternoon students
      let sessionCategory: 'Morning' | 'Afternoon' | 'Both' = 'Morning';
      if (p.bothCount > 0 || (p.morningCount > 0 && p.afternoonCount > 0)) {
        sessionCategory = 'Both';
      } else if (p.afternoonCount > 0 && p.morningCount === 0) {
        sessionCategory = 'Afternoon';
      } else {
        sessionCategory = 'Morning';
      }

      return {
        ...p,
        status: (isActive ? 'Active' : 'Suspended') as 'Active' | 'Suspended',
        isPartiallySuspended: isPartial,
        parentSessionCategory: sessionCategory
      };
    }).sort((a, b) => a.name.localeCompare(b.name));
  }, [database.students]);

  const invoiceMonths = React.useMemo(() => {
    const monthsSet = new Set<string>();
    
    // Add current calendar month
    const now = new Date();
    const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    monthsSet.add(currentMonthStr);
    
    // Add last month
    const lastMonthDate = new Date();
    lastMonthDate.setMonth(lastMonthDate.getMonth() - 1);
    const lastMonthStr = `${lastMonthDate.getFullYear()}-${String(lastMonthDate.getMonth() + 1).padStart(2, '0')}`;
    monthsSet.add(lastMonthStr);
    
    // Add months from existing invoices
    if (database.invoices) {
      database.invoices.forEach(inv => {
        if (inv.date) {
          const parts = inv.date.split('-');
          if (parts.length >= 2) {
            monthsSet.add(`${parts[0]}-${parts[1]}`);
          }
        }
      });
    }
    
    return Array.from(monthsSet).sort().reverse(); // Newest first
  }, [database.invoices]);

  const handleOpenCreateInvoice = () => {
    setEditingInvoice(null);
    setInvFormRecipientType('parent');
    setSelectedParent(null);
    setParentSearchTerm('');
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
    setInvFormNotes(DEFAULT_INVOICE_ACCOUNTS_NOTE);
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
    setParentSearchTerm('');
    if (invoice.recipientType === 'parent') {
      const firstStudent = database.students.find(s => ids.includes(s.id));
      if (firstStudent) {
        setSelectedParent({
          name: firstStudent.parentName || invoice.recipientName,
          phone: firstStudent.parentPhone || invoice.recipientPhone
        });
      } else {
        setSelectedParent({
          name: invoice.recipientName,
          phone: invoice.recipientPhone
        });
      }
    } else {
      setSelectedParent(null);
    }
    setInvFormDate(invoice.date);
    setInvFormDueDate(invoice.dueDate);
    setInvFormItems(invoice.items.map(item => ({
      id: item.id,
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unitPrice
    })));
    setInvFormNotes(invoice.notes || DEFAULT_INVOICE_ACCOUNTS_NOTE);
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

      onSaveDatabase({
        ...database,
        billing: database.billing,
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

      onSaveDatabase({
        ...database,
        billing: database.billing,
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

  const handleOpenReceiptForRecord = (record: any) => {
    // Check if there is an invoice with invoiceNo matching or mentioned in notes
    const invoiceNoMatch = record.notes?.match(/BJ-INV-\d+/);
    const invoiceNo = record.receiptNo?.startsWith('BJ-INV') ? record.receiptNo : (invoiceNoMatch ? invoiceNoMatch[0] : null);
    
    const matchingInvoice = invoiceNo ? database.invoices?.find(inv => inv.invoiceNo === invoiceNo) : null;
    
    if (matchingInvoice) {
      setShowInvoiceReceipt(matchingInvoice);
    } else if (record.invoiceLinked) {
      setShowInvoiceReceipt(record.invoiceLinked);
    } else {
      setShowReceiptModal(record);
    }
  };

  const handleOpenPayModal = (student: Student) => {
    const record = getBillingStatusForStudent(student, selectedBillingMonth);
    if (record.id.startsWith('INV-B-')) {
      const invNo = record.receiptNo || '';
      setConfirmModal({
        isOpen: true,
        title: "Biilka lala xiriiriyay (Invoice-linked Payment)",
        message: `Lacag-bixintan waxay si toos ah ula xiriirtaa Invoice-ka Waalidka${invNo ? ` (${invNo})` : ''}. Si aad u bedesho ama u maamusho, fadlan guji 'Verify & Action' si lagugu geeyo qaybta 'Parent & Business Invoices' ee bishan si aad wax uga beddesho biilkaas.`,
        accentColor: 'indigo',
        onConfirm: () => {
          setConfirmModal(null);
          if (invNo) {
            setInvoiceSearch(invNo);
          }
          setBillingSubTab('custom_invoices');
          setActiveTab('billing');
        }
      });
      return;
    }
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
    if (recordId.startsWith('INV-B-')) {
      const match = recordId.match(/^INV-B-(\d{4}-\d{2})-(.+)$/);
      let invNo = '';
      if (match) {
        const month = match[1];
        const studentId = match[2];
        const matchingInvoice = database.invoices?.find(inv => {
          if (inv.recipientType !== 'parent' || !inv.studentId) return false;
          const ids = inv.studentId.split(',').map(id => id.trim()).filter(Boolean);
          if (!ids.includes(studentId)) return false;
          const invMonth = inv.date ? inv.date.slice(0, 7) : (inv.createdAt ? inv.createdAt.slice(0, 7) : '');
          return invMonth === month;
        });
        if (matchingInvoice) {
          invNo = matchingInvoice.invoiceNo;
        }
      }

      setConfirmModal({
        isOpen: true,
        title: "Biilka lala xiriiriyay (Invoice-linked Payment)",
        message: `Lacag-bixintan waxay si toos ah ula xiriirtaa Invoice-ka Waalidka${invNo ? ` (${invNo})` : ''}. Si aad u tirtirto ama aad u bedesho, fadlan guji 'Verify & Action' si lagugu geeyo qaybta 'Parent & Business Invoices' ee bishan si aad wax uga beddesho biilkaas.`,
        accentColor: 'indigo',
        onConfirm: () => {
          setConfirmModal(null);
          if (invNo) {
            setInvoiceSearch(invNo);
          }
          setBillingSubTab('custom_invoices');
          setActiveTab('billing');
        }
      });
      return;
    }
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

  const handleDeleteAllInvoices = () => {
    setConfirmModal({
      isOpen: true,
      title: "Ma hubaal baa inaad tirtirto dhammaan Invoices-ka?",
      message: "Ma hubtaa inaad rabto inaad tirtirto dhammaan biilasha/invoices-ka gaarka ah? Tallaabadan dib looma soo celin karo!",
      accentColor: 'rose',
      onConfirm: () => {
        onSaveDatabase({
          ...database,
          invoices: []
        });
        setConfirmModal(null);
        setFeedbackMsg("Dhammaan invoices-ka si guul ah ayaa loo tirtiray.");
        setTimeout(() => setFeedbackMsg(''), 4050);
      }
    });
  };

  const handleDeleteAllBilling = () => {
    setConfirmModal({
      isOpen: true,
      title: "Ma hubaal baa inaad tirtirto dhammaan Lacag-bixinta?",
      message: "Ma hubtaa inaad rabto inaad tirtirto dhammaan diiwaanka lacag-bixinta ardayda (Student Tuition Billing)? Tallaabadan dib looma soo celin karo!",
      accentColor: 'rose',
      onConfirm: () => {
        onSaveDatabase({
          ...database,
          billing: []
        });
        setConfirmModal(null);
        setFeedbackMsg("Dhammaan diiwaanka lacag-bixinta ardayda si guul ah ayaa loo tirtiray.");
        setTimeout(() => setFeedbackMsg(''), 4050);
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
        const val = sc.scores[sub] !== undefined ? `${sc.scores[sub]}%` : "â€”";
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
                .print-receipt-item {
                  box-shadow: none !important;
                  border: 2px dashed #475569 !important;
                  border-radius: 12px !important;
                  max-width: 440px !important;
                  margin: 15px auto !important;
                  padding: 24px !important;
                  display: block !important;
                  background: white !important;
                  page-break-after: always !important;
                  box-sizing: border-box !important;
                }
                .print-receipt-item:last-child {
                  page-break-after: avoid !important;
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
  // STUDENTS MULTI-FORMAT EXPORT SYSTEM (PDF, Excel, Word)
  // Excludes inactive/suspended students automatically
  // -------------------------------------------------------------
  const handleExportStudentsExcel = (list: Student[], exportTypeLabel: string) => {
    const activeList = (list || []).filter(s => s && (s.active === true || String(s.active) === 'true' || s.active === undefined));
    if (activeList.length === 0) {
      alert("Ma jiraan arday firfircoon (active) oo la soo dejiyo!");
      return;
    }
    const headers = [
      "Student ID",
      "Full Name (Ardayga)",
      "Class (Fasalka)",
      "Session (Shift)",
      "Parent Name (Waalidka)",
      "Parent Phone (Telka Waalidka)",
      "Monthly Tuition Fee ($)",
      "Monthly Bus Fee ($)",
      "Status",
      "Registration Date (Taariikhda Diiwaangelinta)"
    ];

    const rows = activeList.map(s => [
      s.id,
      s.name,
      s.className || 'None',
      s.session || 'Both',
      s.parentName || 'N/A',
      s.parentPhone || 'N/A',
      s.monthlyFee,
      s.busFee || 0,
      'Active',
      s.registrationDate || '2026-05-15'
    ]);

    const csvContent = "\uFEFF" + [
      headers.join(","),
      ...rows.map(row => row.map(val => {
        const cell = val === null || val === undefined ? '' : String(val);
        if (cell.includes('"') || cell.includes(',') || cell.includes('\n')) {
          return `"${cell.replace(/"/g, '""')}"`;
        }
        return `"${cell}"`;
      }).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `dugsiga_subuc_${exportTypeLabel.toLowerCase()}_active_students_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    setFeedbackMsg(`Ardayda firfircoon (${activeList.length}) waxaa loo soo dejiyay Excel (.csv) ahaan si guul ah!`);
    setTimeout(() => setFeedbackMsg(''), 4000);
  };

  const handleExportStudentsWord = (list: Student[], exportTypeLabel: string) => {
    const activeList = (list || []).filter(s => s && (s.active === true || String(s.active) === 'true' || s.active === undefined));
    if (activeList.length === 0) {
      alert("Ma jiraan arday firfircoon (active) oo la soo dejiyo!");
      return;
    }
    
    let html = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
<head>
  <meta charset="utf-8">
  <title>Dugsiga Subuc - Students Directory</title>
  <style>
    body {
      font-family: 'Segoe UI', Arial, sans-serif;
      color: #334155;
    }
    h2 {
      color: #21543d;
      font-size: 18pt;
      margin-bottom: 5px;
    }
    p {
      font-size: 10pt;
      color: #64748b;
      margin-top: 0;
    }
    table {
      border-collapse: collapse;
      width: 100%;
      margin-top: 20px;
    }
    th {
      background-color: #21543d;
      color: #ffffff;
      text-align: left;
      font-weight: bold;
      font-size: 10pt;
      padding: 10px;
      border: 1px solid #cbd5e1;
    }
    td {
      padding: 10px;
      border: 1px solid #cbd5e1;
      font-size: 9.5pt;
    }
    .status-active {
      color: #166534;
      font-weight: bold;
    }
  </style>
</head>
<body>
  <h2>DUGSIGA SUBUC</h2>
  <p><b>Liiska Ardayda Firfircoon (${exportTypeLabel}) / Active Student Directory</b><br/>
  Total Active: ${activeList.length} Students<br/>
  Taariikhda la soo saaray: ${new Date().toLocaleDateString()}</p>
  
  <table>
    <thead>
      <tr>
        <th>Student ID</th>
        <th>Full Name (Ardayga)</th>
        <th>Class (Fasalka)</th>
        <th>Session (Shift)</th>
        <th>Parent Name (Waalidka)</th>
        <th>Parent Phone (Telka Waalidka)</th>
        <th>Registration Date (Taariikhda)</th>
        <th>Tuition ($)</th>
        <th>Bus Fee ($)</th>
        <th>Status</th>
      </tr>
    </thead>
    <tbody>`;

    activeList.forEach(s => {
      html += `
        <tr>
          <td><b>${s.id}</b></td>
          <td>${s.name}</td>
          <td>${s.className || 'None'}</td>
          <td>${s.session || 'Both'}</td>
          <td>${s.parentName || 'N/A'}</td>
          <td>${s.parentPhone || 'N/A'}</td>
          <td><b>${s.registrationDate || '2026-05-15'}</b></td>
          <td>$${Number(s.monthlyFee || 0).toFixed(2)}</td>
          <td>$${Number(s.busFee || 0).toFixed(2)}</td>
          <td>
            <span class="status-active">
              Active
            </span>
          </td>
        </tr>`;
    });

    html += `
      </tbody>
    </table>
  </body>
  </html>`;

    const blob = new Blob(['\ufeff' + html], { type: 'application/msword;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `dugsiga_subuc_${exportTypeLabel.toLowerCase()}_active_students_${new Date().toISOString().slice(0, 10)}.doc`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setFeedbackMsg(`Ardayda firfircoon (${activeList.length}) waxaa loo soo dejiyay Word (.doc) ahaan si guul ah!`);
    setTimeout(() => setFeedbackMsg(''), 4000);
  };

  const handleExportStudentsPDF = (list: Student[], exportTypeLabel: string) => {
    const activeList = (list || []).filter(s => s && (s.active === true || String(s.active) === 'true' || s.active === undefined));
    if (activeList.length === 0) {
      alert("Ma jiraan arday firfircoon (active) oo la soo dejiyo!");
      return;
    }

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    doc.setProperties({
      title: 'Dugsiga Subuc - Students Directory',
      author: 'Dugsiga Subuc'
    });

    let pageNumber = 1;

    const drawHeader = (pageNum: number) => {
      // Header Title
      doc.setTextColor(33, 84, 61); // deep green (#21543d)
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(20);
      doc.text("DUGSIGA SUBUC", 12, 20);

      // Subtitle
      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139); // slate-500
      doc.text(`ACTIVE STUDENTS DIRECTORY (${exportTypeLabel})  |  Diiwaanka Ardayda Firfircoon`, 12, 26);

      // Divider
      doc.setDrawColor(203, 213, 225);
      doc.setLineWidth(0.5);
      doc.line(12, 30, 198, 30);

      // Page metadata
      doc.setFont("Helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184); // slate-400
      doc.text(`Printed: ${new Date().toLocaleDateString()}  |  Total Active: ${activeList.length} Students`, 12, 35);
      doc.text(`Page ${pageNum}`, 198, 35, { align: 'right' });
    };

    drawHeader(pageNumber);

    // Table Headers
    let y = 43;
    
    const drawTableHeaders = (startY: number) => {
      doc.setFillColor(241, 245, 249); // light grey
      doc.rect(12, startY, 186, 8, "F");
      doc.setDrawColor(203, 213, 225);
      doc.rect(12, startY, 186, 8, "S");

      doc.setFont("Helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(51, 65, 85); // slate-700

      doc.text("ID", 14, startY + 5.5);
      doc.text("Student Name (Ardayga)", 27, startY + 5.5);
      doc.text("Class", 76, startY + 5.5);
      doc.text("Reg. Date", 102, startY + 5.5);
      doc.text("Parent Name", 126, startY + 5.5);
      doc.text("Parent Phone", 158, startY + 5.5);
      doc.text("Fee", 195, startY + 5.5, { align: 'right' });
    };

    drawTableHeaders(y);
    y += 8;

    doc.setFont("Helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(30, 41, 59);

    activeList.forEach((s, index) => {
      if (y > 275) {
        doc.addPage();
        pageNumber += 1;
        drawHeader(pageNumber);
        y = 43;
        drawTableHeaders(y);
        y += 8;
      }

      // Row zebra stripes
      if (index % 2 === 1) {
        doc.setFillColor(248, 250, 252);
        doc.rect(12, y, 186, 8, "F");
      }

      // Border line bottom
      doc.setDrawColor(241, 245, 249);
      doc.setLineWidth(0.3);
      doc.line(12, y + 8, 198, y + 8);

      doc.setFont("Helvetica", "bold");
      doc.text(s.id || '', 14, y + 5.5);

      doc.setFont("Helvetica", "normal");
      let displayName = s.name || '';
      if (displayName.length > 25) displayName = displayName.substring(0, 23) + '..';
      doc.text(displayName, 27, y + 5.5);

      let displayClass = s.className || 'None';
      if (displayClass.length > 16) displayClass = displayClass.substring(0, 14) + '..';
      doc.text(displayClass, 76, y + 5.5);
      
      doc.text(s.registrationDate || '2026-05-15', 102, y + 5.5);

      let displayParent = s.parentName || 'N/A';
      if (displayParent.length > 18) displayParent = displayParent.substring(0, 16) + '..';
      doc.text(displayParent, 126, y + 5.5);

      doc.text(s.parentPhone || 'N/A', 158, y + 5.5);

      doc.setFont("Helvetica", "bold");
      doc.text(`$${Number(s.monthlyFee || 0).toFixed(0)}`, 195, y + 5.5, { align: 'right' });

      y += 8;
    });

    doc.save(`dugsiga_subuc_${exportTypeLabel.toLowerCase()}_active_students_${new Date().toISOString().slice(0, 10)}.pdf`);
    
    setFeedbackMsg(`Ardayda firfircoon (${activeList.length}) waxaa loo soo dejiyay PDF ahaan si guul ah!`);
    setTimeout(() => setFeedbackMsg(''), 4000);
  };

  const handleExportAllClassesSeparately = (format: 'excel' | 'pdf' | 'word') => {
    const classes = classSelectionList;
    if (classes.length === 0) {
      alert("Ma jiraan fasalo la soo dejiyo!");
      return;
    }
    let count = 0;
    classes.forEach(cls => {
      const classStudents = database.students.filter(s => s.className === cls && s.active);
      if (classStudents.length > 0) {
        count++;
        const safeLabel = `Fasalka_${cls.replace(/\s+/g, '_')}`;
        if (format === 'excel') handleExportStudentsExcel(classStudents, safeLabel);
        else if (format === 'word') handleExportStudentsWord(classStudents, safeLabel);
        else if (format === 'pdf') handleExportStudentsPDF(classStudents, safeLabel);
      }
    });
    setFeedbackMsg(`Sida guusha leh waxaa loo soo dejiyay ${count} fasal oo ardayda firfircoon ah (${format.toUpperCase()})!`);
    setTimeout(() => setFeedbackMsg(''), 4000);
  };

  // -------------------------------------------------------------
  // TAB 6: D: DRIVE BACKUP SYSTEM
  // -------------------------------------------------------------
  const handleBackupExport = () => {
    triggerBackupDownload(database);
    const todayStr = new Date().toISOString().split('T')[0];
    localStorage.setItem('dugsi_last_backup_date', todayStr);
    onSaveDatabase({
      ...database,
      lastBackupDownloadDate: todayStr
    });
    setFeedbackMsg(`Successfully generated backup and logged save event to D:\\system_updates!`);
    setTimeout(() => setFeedbackMsg(''), 5000);
  };

  // Preview a JSON backup file uploaded by user without altering live database
  const handlePreviewJsonFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fileReader = new FileReader();
    fileReader.readAsText(file, "UTF-8");
    fileReader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed && (parsed.students || parsed.teachers || parsed.classes)) {
          const sanitized: DatabaseState = {
            classes: parsed.classes || [],
            progress: parsed.progress || [],
            teacherAttendance: parsed.teacherAttendance || [],
            submissions: parsed.submissions || [],
            invoices: parsed.invoices || [],
            moneyTransfers: parsed.moneyTransfers || [],
            xawaaladaAccounts: parsed.xawaaladaAccounts || [],
            xawaaladaTransactions: parsed.xawaaladaTransactions || [],
            billing: parsed.billing || [],
            exams: parsed.exams || [],
            teachers: parsed.teachers || [],
            schoolLocation: parsed.schoolLocation || null,
            landingPageSettings: parsed.landingPageSettings || {},
            contactMessages: parsed.contactMessages || [],
            students: parsed.students || [],
            notifications: parsed.notifications || []
          };
          setPreviewBackupData({
            sourceName: `Uploaded File: ${file.name}`,
            timestamp: file.lastModified ? new Date(file.lastModified).toLocaleString() : new Date().toLocaleString(),
            state: sanitized
          });
          setPreviewActiveTab('overview');
          setPreviewSearchTerm('');
        } else {
          alert("Faylka aad soo dooratay ma laha xogta ardayda ama macallimiinta. (Uploaded file does not contain valid database tables.)");
        }
      } catch (error) {
        alert("Cilad ayaa ka dhacday akhrinta faylka JSON. (Error parsing JSON backup file.)");
      }
      e.target.value = '';
    };
  };

  // Download an automated Cloud Backup snapshot JSON
  const handleDownloadCloudBackup = async (backupId: string) => {
    try {
      const res = await fetch(`/api/backups/${backupId}`);
      const data = await res.json();
      if (data.success && data.backup && data.backup.state) {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data.backup.state, null, 2));
        const downloadAnchor = document.createElement('a');
        downloadAnchor.setAttribute("href", dataStr);
        downloadAnchor.setAttribute("download", `${backupId}.json`);
        document.body.appendChild(downloadAnchor);
        downloadAnchor.click();
        downloadAnchor.remove();
      } else {
        alert("Cilad ayaa ka dhacday soo dejinta backup-ka: " + (data.error || 'Failed to download'));
      }
    } catch (err: any) {
      alert("Xiriirka waa uu fashilmay: " + err.message);
    }
  };

  // Preview an automated Cloud Backup snapshot
  const handlePreviewCloudBackup = async (backupId: string) => {
    setIsPreviewLoading(true);
    try {
      const res = await fetch(`/api/backups/${backupId}`);
      const data = await res.json();
      if (data.success && data.backup && data.backup.state) {
        setPreviewBackupData({
          sourceName: `Cloud Snapshot: ${backupId}`,
          timestamp: data.backup.timestamp ? new Date(data.backup.timestamp).toLocaleString() : undefined,
          state: data.backup.state,
          changes: data.backup.changes || null
        });
        setPreviewActiveTab('changes');
        setPreviewSearchTerm('');
      } else {
        alert("Cilad ayaa ka dhacday soo helida backup-ka cloud-ka: " + (data.error || 'Unknown error'));
      }
    } catch (err: any) {
      alert("Xiriirka waa uu fashilmay: " + err.message);
    } finally {
      setIsPreviewLoading(false);
    }
  };

  // Preview a Browser Cache backup snapshot
  const handlePreviewCacheBackup = (b: any) => {
    if (!b || !b.state) return;
    setPreviewBackupData({
      sourceName: `Browser Cache: ${b.key} (${b.origin})`,
      timestamp: b.timestamp,
      state: b.state
    });
    setPreviewActiveTab('overview');
    setPreviewSearchTerm('');
  };

  // Confirm and Restore the previewed backup
  const handleRestoreFromPreview = () => {
    if (!previewBackupData) return;
    setConfirmModal({
      isOpen: true,
      title: "Waafaqidda dib u soo celinta Backup-ka",
      message: `Ma hubtaa inaad rabto inaad dib u soo celiso backup-kan (${previewBackupData.sourceName})? Tani waxay gabi ahaanba beddeli doontaa xogta hadda ee live-ka ah ku dhowaad ${previewBackupData.state.students?.length || 0} arday. (Are you sure you want to restore this backup snapshot to your live database?)`,
      accentColor: 'teal',
      confirmText: 'Haa, Dib U Soo Celi Now ðŸ”„',
      onConfirm: async () => {
        setConfirmModal(null);
        setFeedbackMsg("Xogta dib ayaa loo soo celinayaa, fadlan sug... (Restoring backup state...)");
        try {
          await onSaveDatabase(previewBackupData.state);
          setPreviewBackupData(null);
          alert("Xogta si guul leh ayaa loo soo celiyay! (Database successfully restored and synchronized!)");
          window.location.reload();
        } catch (saveErr) {
          console.error("Cloud save failed during preview restoration:", saveErr);
          alert("Cilad ayaa ka dhacday kaydinta xogta: " + String(saveErr));
        }
      }
    });
  };

  const handleBackupImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    if (e.target.files && e.target.files[0]) {
      fileReader.readAsText(e.target.files[0], "UTF-8");
      fileReader.onload = async (event) => {
        try {
          const parsed = JSON.parse(event.target?.result as string);
          if (parsed.students || parsed.teachers || parsed.classes) {
            const restoredDb = {
              classes: parsed.classes || database.classes || [],
              progress: parsed.progress || database.progress || [],
              teacherAttendance: parsed.teacherAttendance || database.teacherAttendance || [],
              submissions: parsed.submissions || database.submissions || [],
              invoices: parsed.invoices || database.invoices || [],
              moneyTransfers: parsed.moneyTransfers || database.moneyTransfers || [],
              xawaaladaAccounts: parsed.xawaaladaAccounts || database.xawaaladaAccounts || [],
              xawaaladaTransactions: parsed.xawaaladaTransactions || database.xawaaladaTransactions || [],
              billing: parsed.billing || database.billing || [],
              exams: parsed.exams || database.exams || [],
              teachers: parsed.teachers || database.teachers || [],
              schoolLocation: parsed.schoolLocation || database.schoolLocation || null,
              landingPageSettings: parsed.landingPageSettings || database.landingPageSettings || {},
              contactMessages: parsed.contactMessages || database.contactMessages || [],
              students: parsed.students || database.students || [],
              notifications: parsed.notifications || database.notifications || []
            };
            
            setFeedbackMsg("Restoring database to cloud, please wait... (Xogta waxaa lagu shubayaa daruuraha...)");
            try {
              await onSaveDatabase(restoredDb);
              alert("Database restored and synchronized successfully! Missing tables were merged with existing records.");
              window.location.reload();
            } catch (saveErr) {
              console.error("Cloud save failed during backup restoration:", saveErr);
              alert("Xogta dib loo soo celiyay waa ku guulaysatay laakiin ku kaydinta daruuraha ayaa fashilantay. Fadlan isku day markale. (Database restored but cloud save failed. Please retry.)");
            }
          } else {
            alert("Verification failed. The uploaded file does not contain student, teacher, or class tables.");
          }
        } catch (error) {
          alert("Error parsing JSON backup file. Ensure the document is uncorrupted.");
        }
      };
    }
  };

  // Scan all localStorage and sessionStorage for any hidden/old backups
  const handleScanBrowserCache = () => {
    const backups: any[] = [];
    const keysToTry = ['banuu_jalaal_db', 'dugsiga_subuc_db', 'dugsi_db', 'database', 'state'];
    
    // Scan localStorage
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key) continue;
        try {
          const item = localStorage.getItem(key);
          if (item && item.startsWith('{')) {
            const parsed = JSON.parse(item);
            if (parsed && (parsed.students || parsed.teachers)) {
              backups.push({
                key,
                origin: 'localStorage',
                studentCount: (parsed.students || []).length,
                timestamp: parsed.lastUpdated || new Date().toLocaleString(),
                state: parsed
              });
            }
          }
        } catch (e) {}
      }
    } catch (e) {}

    // Scan sessionStorage
    try {
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (!key) continue;
        try {
          const item = sessionStorage.getItem(key);
          if (item && item.startsWith('{')) {
            const parsed = JSON.parse(item);
            if (parsed && (parsed.students || parsed.teachers)) {
              backups.push({
                key,
                origin: 'sessionStorage',
                studentCount: (parsed.students || []).length,
                timestamp: new Date().toLocaleString(),
                state: parsed
              });
            }
          }
        } catch (e) {}
      }
    } catch (e) {}

    setFoundCacheBackups(backups);
    setHasScannedCache(true);
    if (backups.length > 0) {
      setFeedbackMsg(`Scanned successfully! Found ${backups.length} browser cache backups!`);
    } else {
      setFeedbackMsg(`Scan completed. No older caches found in this browser instance.`);
    }
    setTimeout(() => setFeedbackMsg(''), 5000);
  };

  const handleRestoreCacheBackup = (backupState: DatabaseState) => {
    setConfirmModal({
      isOpen: true,
      title: "Restore Selected Browser Cache?",
      message: `Are you sure you want to restore this browser cache backup with ${backupState.students?.length || 0} students? This will overwrite the current live database.`,
      accentColor: 'indigo',
      onConfirm: async () => {
        setFeedbackMsg("Restoring database from browser cache...");
        try {
          await onSaveDatabase(backupState);
          alert("Database successfully restored from browser cache!");
          window.location.reload();
        } catch (saveErr) {
          console.error("Cloud save failed during cache restoration:", saveErr);
          alert("Failed to restore from browser cache: " + String(saveErr));
        }
      }
    });
  };

  // Generate and download a CSV template for batch importing students
  const handleDownloadCsvTemplate = () => {
    const headers = "Name,Parent Name,Parent Phone,Class Name,Monthly Fee,Bus Fee,Age,Session,Active\n";
    const row1 = "Ahmed Ali,Ali Ahmed,615123456,Al-Baqarah Memorization,35,10,12,Both,true\n";
    const row2 = "Muno Omar,Omar Farah,615789123,Juz Amma Preparatory,35,0,9,Morning,true\n";
    const row3 = "Farah Yusuf,Yusuf Ahmed,615999888,Advanced Quran Tajweed,35,15,11,Afternoon,true\n";
    const csvContent = "data:text/csv;charset=utf-8," + encodeURIComponent(headers + row1 + row2 + row3);
    
    const link = document.createElement("a");
    link.setAttribute("href", csvContent);
    link.setAttribute("download", "dugsiga_subuc_students_import_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    setFeedbackMsg("CSV Import Template downloaded successfully!");
    setTimeout(() => setFeedbackMsg(''), 4000);
  };

  // Parse CSV file for student batch imports
  const handleCsvImportChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCsvError('');
    setCsvPreviewStudents([]);
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        if (!text) {
          setCsvError("File content is empty.");
          return;
        }

        const lines = text.split(/\r?\n/);
        if (lines.length < 2) {
          setCsvError("CSV must have a header row and at least one student row.");
          return;
        }

        // Parse student rows
        const previewList: any[] = [];
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;

          // Simple CSV line parser handling commas
          const values = line.split(",").map(v => v.trim());
          if (values.length < 3) continue;

          const studentObj: any = {
            name: values[0] || "",
            parentName: values[1] || "Somali Parent",
            parentPhone: values[2] || "615000000",
            className: values[3] || "Al-Baqarah Memorization",
            monthlyFee: isNaN(Number(values[4])) ? 35 : Number(values[4]),
            busFee: isNaN(Number(values[5])) ? 0 : Number(values[5]),
            age: values[6] ? (isNaN(Number(values[6])) ? undefined : Number(values[6])) : undefined,
            session: values[7] || "Both",
            active: values[8] ? (values[8].toLowerCase() === 'true' || values[8] === '1') : true
          };

          if (!studentObj.name) {
            setCsvError(`Row ${i + 1} is missing the student Name.`);
            return;
          }

          previewList.push(studentObj);
        }

        if (previewList.length === 0) {
          setCsvError("No valid student rows found in CSV.");
        } else {
          setCsvPreviewStudents(previewList);
        }
      } catch (err) {
        setCsvError("Failed to parse CSV file. Ensure it is formatted correctly as a comma-separated file.");
      }
    };
    reader.readAsText(file);
  };

  // Perform bulk student import
  const handleBulkImportStudents = () => {
    if (csvPreviewStudents.length === 0) return;

    // Determine highest current ID
    const currentMaxIdNum = database.students.reduce((max, s) => {
      const digits = (s.id || "").replace(/^\D+/g, "");
      const parsed = parseInt(digits, 10);
      return !isNaN(parsed) && parsed > max ? parsed : max;
    }, 0);

    let nextIdNum = currentMaxIdNum + 1;
    const newStudentsList: Student[] = [];

    for (const item of csvPreviewStudents) {
      const nextId = `DS${String(nextIdNum).padStart(3, "0")}`;
      // Map teacherId based on class name or default to empty string if not found
      const assignedTeacher = database.teachers.find(
        (t) => t.classAssigned === item.className || t.className === item.className
      );
      const teacherId = assignedTeacher ? assignedTeacher.id : "";

      newStudentsList.push({
        id: nextId,
        name: item.name,
        parentName: item.parentName || "Somali Parent",
        parentPhone: item.parentPhone || "615000000",
        className: item.className || "Al-Baqarah Memorization",
        teacherId: teacherId,
        monthlyFee: Number(item.monthlyFee ?? 35),
        busFee: Number(item.busFee ?? 0),
        registrationDate: new Date().toISOString().split("T")[0],
        active: item.active !== false,
        session: item.session || "Both",
        age: item.age
      });
      nextIdNum++;
    }

    const updatedStudents = [...database.students, ...newStudentsList];

    // Create a batch notification
    const batchNotification: AppNotification = {
      id: `noti-${Date.now()}`,
      type: "student",
      senderId: "admin",
      senderName: "Admin",
      senderRole: "admin",
      message: `Admin imported ${newStudentsList.length} students in bulk via CSV.`,
      timestamp: new Date().toISOString(),
      readBy: ["admin"]
    };

    const updatedNotifs = [batchNotification, ...(database.notifications || [])].slice(0, 100);

    onSaveDatabase({
      ...database,
      students: updatedStudents,
      notifications: updatedNotifs
    });

    setFeedbackMsg(`Bulk Imported ${newStudentsList.length} students successfully into the database!`);
    setCsvPreviewStudents([]);
    setTimeout(() => setFeedbackMsg(""), 5000);
    alert(`Successfully imported ${newStudentsList.length} students into the database!`);
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
          label: 'Rasiidhadii June & Last Month',
          icon: Printer,
          checkActive: () => activeTab === 'receiptsHistory',
          onClick: () => setActiveTab('receiptsHistory')
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
          label: 'Baadhista Sync-ka & Xogta',
          icon: Activity,
          checkActive: () => activeTab === 'backup' && backupSubTab === 'diagnostics',
          onClick: () => {
            setActiveTab('backup');
            setBackupSubTab('diagnostics');
          }
        },
        {
          label: 'Kaydka & Nuqullada',
          icon: Cloud,
          checkActive: () => activeTab === 'backup' && backupSubTab === 'backups',
          onClick: () => {
            setActiveTab('backup');
            setBackupSubTab('backups');
          }
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
            <DugsigaSubucLogo 
              className="w-10 h-10 shadow-md border-emerald-500/20" 
              logoUrl={database.landingPageSettings?.logoUrl}
              editable={true}
              onClick={() => setShowLogoModal(true)}
              title="Guji si aad u beddesho sawirka astaanta (Click to change website profile logo)"
            />
            <div className="flex flex-col">
              <span className="font-extrabold text-white text-base tracking-tight leading-none" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Dugsiga Subuc</span>
              <span className="text-[10px] font-medium text-emerald-400 mt-1.5 leading-none font-mono">Ù…Ø¯Ø±Ø³Ø© Ø§Ù„Ø³Ø¨Ø¹</span>
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
      <div className="pt-6 mt-6 border-t border-slate-900/60 space-y-3 shrink-0">
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
          onClick={handleRevokeOtherDevicesClick}
          className="w-full py-2 px-3 bg-amber-950/20 hover:bg-amber-900/40 text-amber-300 font-semibold text-xs tracking-wide rounded-xl transition-all inline-flex items-center gap-2.5 cursor-pointer border border-amber-500/20"
          title="Ka saar dhammaan aaladaha kale ee uu maamuluhu kaga furan yahay"
        >
          <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
          <span className="truncate">Ka saar aaladaha kale</span>
        </button>

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
            onClick={handleRevokeOtherDevicesClick}
            className="p-2 rounded-xl text-amber-400 hover:text-amber-300 hover:bg-slate-900/55 transition-colors cursor-pointer"
            title="Ka saar dhammaan aaladaha kale ee maamulaha"
          >
            <ShieldAlert className="w-5 h-5" />
          </button>

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
                                    <span className="text-[9px] font-mono text-slate-400">â€¢</span>
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
              type="button"
              onClick={handleRevokeOtherDevicesClick}
              className="py-2.5 px-3.5 bg-amber-50 hover:bg-amber-100 text-amber-900 font-bold text-xs uppercase tracking-wider rounded-xl transition-all duration-200 border border-amber-300 flex items-center gap-2 cursor-pointer shadow-sm"
              title="Ka saar dhammaan aaladaha kale ee uu maamuluhu kaga furan yahay"
            >
              <ShieldAlert className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span className="hidden sm:inline">Ka saar aaladaha kale</span>
              <span className="sm:hidden">Aaladaha</span>
            </button>

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
            
            {/* --- GOOGLE CLOUD AUTOMATED BACKUP BANNER --- */}
            <div className="p-5 rounded-3xl border border-emerald-100 bg-emerald-50/45 text-emerald-950 shadow-sm relative overflow-hidden transition-all duration-300">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
                <div className="flex gap-4 items-center">
                  <div className="p-2.5 rounded-2xl bg-emerald-100 text-emerald-700 shrink-0">
                    <Cloud className="w-6 h-6 animate-pulse" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black uppercase tracking-wider flex items-center gap-2 text-emerald-900">
                      Cloud Backup System Active â­â­â­â­â­
                      <span className="text-[10px] bg-emerald-200 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
                        âœ“ Protected (Toos u Shaqaynaya)
                      </span>
                    </h4>
                    <p className="text-xs text-emerald-700/85 mt-0.5 leading-relaxed">
                      Dhammaan xogta ardayda, macallimiinta iyo lacag-bixinta waxaa si toos ah maalin kasta loogu kaydiyaa Google Cloud Storage. (All your students, classes, and billing records are automatically protected in Google Cloud Storage every day.)
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('backup')}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all self-start sm:self-center cursor-pointer"
                >
                  Manage Backups ðŸ“
                </button>
              </div>
            </div>

            {/* Dashboard Month/Year Selector */}
            <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
                  <CalendarRange className="w-6 h-6 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    Muddada Dashboard-ka (Dashboard Period)
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">Xulo bisha aad rabto in warbixinta dashboard-ka laguu muujiyo</p>
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-xs font-bold text-slate-600">Dooro Bisha (Select Month):</span>
                <select
                  value={currentMonthFilter}
                  onChange={(e) => setCurrentMonthFilter(e.target.value)}
                  className="bg-slate-50 border border-slate-200/80 rounded-2xl px-4 py-2.5 text-xs font-extrabold text-slate-800 outline-none focus:bg-white focus:ring-4 focus:ring-emerald-500/10 cursor-pointer shadow-sm transition-all"
                  id="dashboard-month-selector"
                >
                  {getDashboardAvailableMonths().map(m => (
                    <option key={m} value={m}>
                      {getFriendlyMonthName(m)} ({m})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Core Stats Counter Deck */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4 gap-4">
              
              {/* 1. Active Students Card */}
              <div 
                role="button"
                tabIndex={0}
                onClick={() => setShowActiveStudentsModal(true)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setShowActiveStudentsModal(true); }}
                className="bg-white p-5 rounded-3xl border border-slate-200 hover:border-emerald-500 shadow-xs hover:shadow-lg transition-all duration-200 cursor-pointer active:scale-[0.98] group flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                title="Guji si aad u aragto liiska ardayda firfircoon (Click to view active enrolled students)"
                id="overview-active-students-card"
              >
                <div>
                  <p className="text-slate-500 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                    Active Students
                    <span className="text-[10px] text-emerald-700 font-extrabold bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-md group-hover:bg-emerald-600 group-hover:text-white transition-colors">Kormeer ðŸ”</span>
                  </p>
                  <p className="text-2xl lg:text-3xl font-black text-slate-900 mt-2 group-hover:text-emerald-700 transition-colors">{activeStudents.length}</p>
                  <p className="text-[11px] text-slate-400 mt-1 font-medium">Ardayda diiwaangashan</p>
                </div>
                <div className="p-3.5 bg-emerald-50 text-emerald-600 rounded-2xl group-hover:bg-emerald-600 group-hover:text-white transition-colors shrink-0 shadow-xs">
                  <UserCheck className="w-6 h-6" />
                </div>
              </div>

              {/* 2. Parents Card */}
              <div 
                role="button"
                tabIndex={0}
                onClick={() => {
                  setParentsModalStatusFilter('all');
                  setParentsModalSessionFilter('all');
                  setParentsModalSearchQuery('');
                  setShowParentsModal(true);
                }}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setShowParentsModal(true); }}
                className="bg-white p-5 rounded-3xl border border-slate-200 hover:border-indigo-500 shadow-xs hover:shadow-lg transition-all duration-200 cursor-pointer active:scale-[0.98] group flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                title="Guji si aad u aragto dhammaan waalidiinta iyo xaaladdooda (Click to view all parents & status)"
                id="overview-parents-card"
              >
                <div>
                  <p className="text-slate-500 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                    Parents (Waalidiinta)
                    <span className="text-[10px] text-indigo-700 font-extrabold bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 rounded-md group-hover:bg-indigo-600 group-hover:text-white transition-colors">Xogta ðŸ”</span>
                  </p>
                  <p className="text-2xl lg:text-3xl font-black text-indigo-700 mt-2 group-hover:text-indigo-900 transition-colors">{allParentsWithStatus.length}</p>
                  <p className="text-[11px] text-slate-400 mt-1 font-medium">
                    <strong className="text-emerald-600 font-bold">{allParentsWithStatus.filter(p => p.status === 'Active').length} Active</strong> â€¢ {allParentsWithStatus.filter(p => p.status === 'Suspended').length} Suspended
                  </p>
                </div>
                <div className="p-3.5 bg-indigo-50 text-indigo-600 rounded-2xl group-hover:bg-indigo-600 group-hover:text-white transition-colors shrink-0 shadow-xs">
                  <Users className="w-6 h-6" />
                </div>
              </div>

              {/* 3. Teachers Card */}
              <div 
                role="button"
                tabIndex={0}
                onClick={() => setActiveTab('teachers')}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setActiveTab('teachers'); }}
                className="bg-white p-5 rounded-3xl border border-slate-200 hover:border-violet-500 shadow-xs hover:shadow-lg transition-all duration-200 cursor-pointer active:scale-[0.98] group flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-violet-500/30"
                title="Guji si aad u aado qaybta macallimiinta (Click to go to Teachers)"
                id="overview-teachers-card"
              >
                <div>
                  <p className="text-slate-500 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                    Teachers (Macallimiinta)
                    <span className="text-[10px] text-violet-700 font-extrabold bg-violet-50 border border-violet-200 px-1.5 py-0.5 rounded-md group-hover:bg-violet-600 group-hover:text-white transition-colors">Aad âž¡ï¸</span>
                  </p>
                  <p className="text-2xl lg:text-3xl font-black text-violet-700 mt-2 group-hover:text-violet-900 transition-colors">{(database.teachers || []).length}</p>
                  <p className="text-[11px] text-slate-400 mt-1 font-medium">Macallimiinta dugsiga</p>
                </div>
                <div className="p-3.5 bg-violet-50 text-violet-600 rounded-2xl group-hover:bg-violet-600 group-hover:text-white transition-colors shrink-0 shadow-xs">
                  <GraduationCap className="w-6 h-6" />
                </div>
              </div>

              {/* 4. Classes Card */}
              <div 
                role="button"
                tabIndex={0}
                onClick={() => setActiveTab('classes')}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setActiveTab('classes'); }}
                className="bg-white p-5 rounded-3xl border border-slate-200 hover:border-amber-500 shadow-xs hover:shadow-lg transition-all duration-200 cursor-pointer active:scale-[0.98] group flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                title="Guji si aad u aado fasallada (Click to go to Classes)"
                id="overview-classes-card"
              >
                <div>
                  <p className="text-slate-500 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                    Classes (Fasallada)
                    <span className="text-[10px] text-amber-700 font-extrabold bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-md group-hover:bg-amber-600 group-hover:text-white transition-colors">Aad âž¡ï¸</span>
                  </p>
                  <p className="text-2xl lg:text-3xl font-black text-amber-700 mt-2 group-hover:text-amber-900 transition-colors">{(database.classes || []).length}</p>
                  <p className="text-[11px] text-slate-400 mt-1 font-medium">Fasallada shaqaynaya</p>
                </div>
                <div className="p-3.5 bg-amber-50 text-amber-600 rounded-2xl group-hover:bg-amber-600 group-hover:text-white transition-colors shrink-0 shadow-xs">
                  <Building2 className="w-6 h-6" />
                </div>
              </div>

              {/* 5. Tuition Invoiced Card */}
              <div 
                role="button"
                tabIndex={0}
                onClick={() => setShowTuitionInvoicedModal(true)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setShowTuitionInvoicedModal(true); }}
                className="bg-white p-5 rounded-3xl border border-slate-200 hover:border-emerald-500 shadow-xs hover:shadow-lg transition-all duration-200 cursor-pointer active:scale-[0.98] group flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                title="Guji si aad u aragto kashifida lacagta waxbarashada ee ardayda (Click to view expected student tuition dues)"
                id="overview-tuition-invoiced-card"
              >
                <div>
                  <p className="text-slate-500 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                    Tuition Invoiced
                    <span className="text-[10px] text-emerald-700 font-extrabold bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-md group-hover:bg-emerald-600 group-hover:text-white transition-colors">Details ðŸ”</span>
                  </p>
                  <p className="text-2xl lg:text-3xl font-black text-emerald-700 mt-2 font-mono">${Number(currentMonthTuitionInvoiced).toFixed(2)}</p>
                  <p className="text-[11px] text-slate-400 mt-1 font-medium">Lacagta waxbarashada ({currentMonthName})</p>
                </div>
                <div className="p-3.5 bg-emerald-50 text-emerald-600 rounded-2xl group-hover:bg-emerald-600 group-hover:text-white transition-colors shrink-0 shadow-xs">
                  <BookOpen className="w-6 h-6" />
                </div>
              </div>

              {/* 6. Bus Invoiced Card */}
              <div 
                role="button"
                tabIndex={0}
                onClick={() => setShowBusInvoicedModal(true)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setShowBusInvoicedModal(true); }}
                className="bg-white p-5 rounded-3xl border border-slate-200 hover:border-sky-500 shadow-xs hover:shadow-lg transition-all duration-200 cursor-pointer active:scale-[0.98] group flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-sky-500/30"
                title="Guji si aad u aragto faahfaahinta kashifida baska (Click to view expected bus dues)"
                id="overview-bus-invoiced-card"
              >
                <div>
                  <p className="text-slate-500 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                    Bus Invoiced
                    <span className="text-[10px] text-sky-700 font-extrabold bg-sky-50 border border-sky-200 px-1.5 py-0.5 rounded-md group-hover:bg-sky-600 group-hover:text-white transition-colors">Details ðŸ”</span>
                  </p>
                  <p className="text-2xl lg:text-3xl font-black text-sky-700 mt-2 font-mono">${Number(currentMonthBusInvoiced).toFixed(2)}</p>
                  <p className="text-[11px] text-slate-400 mt-1 font-medium">Fiiga baska ({currentMonthName})</p>
                </div>
                <div className="p-3.5 bg-sky-50 text-sky-600 rounded-2xl group-hover:bg-sky-600 group-hover:text-white transition-colors shrink-0 shadow-xs">
                  <Bus className="w-6 h-6" />
                </div>
              </div>

              {/* 7. Collected Fees Card */}
              <div 
                role="button"
                tabIndex={0}
                onClick={() => setShowCollectedFeesBreakdownMonth(currentMonthFilter)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setShowCollectedFeesBreakdownMonth(currentMonthFilter); }}
                className="bg-white p-5 rounded-3xl border border-slate-200 hover:border-teal-500 shadow-xs hover:shadow-lg transition-all duration-200 cursor-pointer active:scale-[0.98] group flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-teal-500/30" 
                id="overview-revenue-paid"
                title="Guji si aad u aragto halka ay lacagtu ka timid (Click to view breakdown)"
              >
                <div>
                  <p className="text-slate-500 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                    Collected Fees
                    <span className="text-[10px] text-teal-700 font-extrabold bg-teal-50 border border-teal-200 px-1.5 py-0.5 rounded-md group-hover:bg-teal-600 group-hover:text-white transition-colors">Details ðŸ”</span>
                  </p>
                  <p className="text-2xl lg:text-3xl font-black text-teal-700 mt-2 font-mono">${Number(currentMonthPaidAmount).toFixed(2)}</p>
                  <p className="text-[11px] text-slate-400 mt-1 font-medium">Wadarta la qabtay ({currentMonthName})</p>
                </div>
                <div className="p-3.5 bg-teal-50 text-teal-600 rounded-2xl group-hover:bg-teal-600 group-hover:text-white transition-colors shrink-0 shadow-xs">
                  <CircleDollarSign className="w-6 h-6" />
                </div>
              </div>

              {/* 8. Pending Balance Card */}
              <div 
                role="button"
                tabIndex={0}
                onClick={() => setShowPendingFeesBreakdownMonth(currentMonthFilter)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setShowPendingFeesBreakdownMonth(currentMonthFilter); }}
                className="bg-white p-5 rounded-3xl border border-slate-200 hover:border-rose-500 shadow-xs hover:shadow-lg transition-all duration-200 cursor-pointer active:scale-[0.98] group flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-rose-500/30" 
                id="overview-revenue-unpaid"
                title="Guji si aad u aragto ardayda aan bixin lacagta (Click to see students who haven't paid fees)"
              >
                <div>
                  <p className="text-slate-500 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                    Pending Balance
                    <span className="text-[10px] text-rose-700 font-extrabold bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded-md group-hover:bg-rose-600 group-hover:text-white transition-colors">Unpaid ðŸ”</span>
                  </p>
                  <p className="text-2xl lg:text-3xl font-black text-rose-600 mt-2 font-mono">${Number(currentMonthUnpaidAmount).toFixed(2)}</p>
                  <p className="text-[11px] text-slate-400 mt-1 font-medium">Lacagaha dhiman ({currentMonthName})</p>
                </div>
                <div className="p-3.5 bg-rose-50 text-rose-600 rounded-2xl group-hover:bg-rose-600 group-hover:text-white transition-colors shrink-0 shadow-xs">
                  <AlertCircle className="w-6 h-6" />
                </div>
              </div>

            </div>

            {/* Student Tuition & Fees Statistics Deck */}
            <div className="bg-gradient-to-r from-emerald-50/50 via-teal-50/40 to-slate-50 p-6 rounded-3xl border border-emerald-100 shadow-sm space-y-5" id="student-tuition-statistics-deck">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-emerald-100/60 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-emerald-700 text-white rounded-xl">
                    <BookOpen className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-slate-900 text-base">Adeegga Lacagta Waxbarashada (Student Tuition & Fees Services)</h3>
                    <p className="text-slate-500 text-xs mt-0.5">Statistical insights for monthly student tuition fees, invoices, and revenue realization</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] uppercase font-black text-emerald-800 bg-white border border-emerald-200 px-3 py-1 rounded-full">{currentMonthName}</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                
                <div 
                  onClick={() => setShowActiveStudentsModal(true)}
                  className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between cursor-pointer hover:shadow-md hover:border-emerald-200 transition-all active:scale-[0.99] group"
                  title="Guji si aad u aragto faahfaahinta fasallada (Click to view class breakdown)"
                >
                  <div>
                    <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider group-hover:text-emerald-600 transition-colors">Active Enrolled Students</p>
                    <p className="text-2xl font-black text-slate-900 mt-1">{activeStudents.length}</p>
                    <p className="text-[10px] text-slate-400 mt-1">Students registered in classes</p>
                  </div>
                  <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl group-hover:bg-emerald-600 group-hover:text-white transition-all">
                    <Users className="w-5 h-5" />
                  </div>
                </div>

                <div 
                  onClick={() => setShowTuitionInvoicedModal(true)}
                  className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between cursor-pointer hover:shadow-md hover:border-emerald-300 transition-all active:scale-[0.99] group"
                  title="Guji si aad u aragto kashifida lacagta waxbarashada (Click to view expected tuition dues breakdown)"
                >
                  <div>
                    <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider group-hover:text-emerald-600 transition-colors">Tuition Invoiced ({currentMonthName})</p>
                    <p className="text-2xl font-black text-slate-900 mt-1">${Number(currentMonthTuitionInvoiced).toFixed(2)}</p>
                    <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                      Total expected student dues
                      <span className="text-[9px] text-emerald-600 opacity-0 group-hover:opacity-100 transition-opacity font-bold bg-emerald-50 px-1 rounded-sm">View details ðŸ”</span>
                    </p>
                  </div>
                  <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl group-hover:bg-emerald-600 group-hover:text-white transition-all">
                    <Calculator className="w-5 h-5" />
                  </div>
                </div>

                <div 
                  onClick={() => setShowCollectedFeesBreakdownMonth(currentMonthFilter)}
                  className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between cursor-pointer hover:shadow-md hover:border-teal-200 transition-all active:scale-[0.99] group"
                  title="Guji si aad u aragto faahfaahinta lacagta waxbarashada ee la qabtay (Click to view breakdown)"
                >
                  <div>
                    <p className="text-teal-605 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                      Tuition Collected ({currentMonthName})
                      <span className="text-[9px] text-teal-600 opacity-0 group-hover:opacity-100 transition-opacity font-bold bg-teal-50 px-1 rounded-sm">View details ðŸ”</span>
                    </p>
                    <p className="text-2xl font-black text-teal-700 mt-1">${Number(currentMonthTuitionCollected).toFixed(2)}</p>
                    <p className="text-[10px] text-slate-400 mt-1">Click to see detail transaction breakdown</p>
                  </div>
                  <div className="p-3 bg-teal-50 text-teal-600 rounded-xl group-hover:bg-teal-600 group-hover:text-white transition-colors">
                    <CircleDollarSign className="w-5 h-5" />
                  </div>
                </div>

                <div 
                  onClick={() => setShowPendingFeesBreakdownMonth(currentMonthFilter)}
                  className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between cursor-pointer hover:shadow-md hover:border-rose-200 transition-all active:scale-[0.99] group"
                  title="Guji si aad u aragto ardayda aan bixin lacagta waxbarashada (Click to see students who haven't paid fees)"
                >
                  <div>
                    <p className="text-rose-605 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                      Pending Tuition Balance
                      <span className="text-[9px] text-rose-600 opacity-0 group-hover:opacity-100 transition-opacity font-bold bg-rose-50 px-1 rounded-sm">View unpaid ðŸ”</span>
                    </p>
                    <p className="text-2xl font-black text-rose-600 mt-1">${Number(currentMonthTuitionPending).toFixed(2)}</p>
                    <p className="text-[10px] text-slate-400 mt-1">Click to see who still didn't pay</p>
                  </div>
                  <div className="p-3 bg-rose-50 text-rose-600 rounded-xl group-hover:bg-rose-600 group-hover:text-white transition-colors">
                    <AlertCircle className="w-5 h-5" />
                  </div>
                </div>

              </div>

              {/* Progress and lifetime insights */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white/70 p-4 rounded-2xl border border-emerald-100/30 text-xs">
                <div className="space-y-1">
                  <span className="font-extrabold text-slate-700 block text-xs">Heerka Realization-ka ee Waxbarashada (Tuition Collection Efficiency):</span>
                  <p className="text-slate-500 text-[10.5px]">
                    Current month tuition realization rate is <span className="font-extrabold text-emerald-700">{currentMonthTuitionInvoiced > 0 ? Math.round((currentMonthTuitionCollected / currentMonthTuitionInvoiced) * 100) : 0}%</span>. 
                    Total expected monthly revenue (Tuition + Bus) is <span className="font-bold text-slate-900">${Number(currentMonthTotalExpectedRevenue).toFixed(2)}</span> (${Number(currentMonthTuitionInvoiced).toFixed(2)} Tuition + ${Number(currentMonthBusInvoiced).toFixed(2)} Bus).
                  </p>
                </div>
                <div className="w-full sm:w-48 bg-slate-100 rounded-full h-2 overflow-hidden shrink-0">
                  <div 
                    className="bg-emerald-600 h-full rounded-full transition-all duration-500" 
                    style={{ width: `${currentMonthTuitionInvoiced > 0 ? Math.round((currentMonthTuitionCollected / currentMonthTuitionInvoiced) * 100) : 0}%` }}
                  />
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
                
                <div 
                  onClick={() => setShowActiveRidersModal(true)}
                  className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between cursor-pointer hover:shadow-md hover:border-indigo-200 transition-all active:scale-[0.99] group"
                  title="Guji si aad u aragto oo u soo dejiso liiska rakaabka (Click to view and download riders list)"
                >
                  <div>
                    <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider group-hover:text-indigo-600 transition-colors">Active Riders (Baska)</p>
                    <p className="text-2xl font-black text-slate-900 mt-1">{totalBusRidersCount}</p>
                    <p className="text-[10px] text-slate-400 mt-1">Students registered for transit</p>
                  </div>
                  <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl group-hover:bg-indigo-600 group-hover:text-white transition-all">
                    <Users className="w-5 h-5" />
                  </div>
                </div>

                <div 
                  onClick={() => setShowBusInvoicedModal(true)}
                  className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between cursor-pointer hover:shadow-md hover:border-sky-300 transition-all active:scale-[0.99] group"
                  title="Guji si aad u aragto faahfaahinta kashifida baska (Click to view expected bus dues breakdown)"
                >
                  <div>
                    <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider group-hover:text-sky-600 transition-colors">Bus Invoiced ({currentMonthName})</p>
                    <p className="text-2xl font-black text-slate-900 mt-1">${Number(currentMonthBusInvoiced).toFixed(2)}</p>
                    <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                      Total expected baska dues
                      <span className="text-[9px] text-sky-600 opacity-0 group-hover:opacity-100 transition-opacity font-bold bg-sky-50 px-1 rounded-sm">View details ðŸ”</span>
                    </p>
                  </div>
                  <div className="p-3 bg-sky-50 text-sky-600 rounded-xl group-hover:bg-sky-600 group-hover:text-white transition-all">
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
                      <span className="text-[9px] text-teal-600 opacity-0 group-hover:opacity-100 transition-opacity font-bold bg-teal-50 px-1 rounded-sm">View details ðŸ”</span>
                    </p>
                    <p className="text-2xl font-black text-teal-700 mt-1">${Number(currentMonthBusCollected).toFixed(2)}</p>
                    <p className="text-[10px] text-slate-400 mt-1">Click to see detail transaction breakdown</p>
                  </div>
                  <div className="p-3 bg-teal-50 text-teal-600 rounded-xl group-hover:bg-teal-600 group-hover:text-white transition-colors">
                    <CircleDollarSign className="w-5 h-5" />
                  </div>
                </div>

                <div 
                  onClick={() => setShowPendingBusBreakdownMonth(currentMonthFilter)}
                  className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between cursor-pointer hover:shadow-md hover:border-rose-200 transition-all active:scale-[0.99] group"
                  title="Guji si aad u aragto ardayda aan bixin lacagta baska (Click to see students who haven't paid bus fare)"
                >
                  <div>
                    <p className="text-rose-605 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                      Pending Bus Balance
                      <span className="text-[9px] text-rose-600 opacity-0 group-hover:opacity-100 transition-opacity font-bold bg-rose-50 px-1 rounded-sm">View unpaid ðŸ”</span>
                    </p>
                    <p className="text-2xl font-black text-rose-600 mt-1">${Number(currentMonthBusPending).toFixed(2)}</p>
                    <p className="text-[10px] text-slate-400 mt-1">Click to see who still didn't pay bus</p>
                  </div>
                  <div className="p-3 bg-rose-50 text-rose-600 rounded-xl group-hover:bg-rose-600 group-hover:text-white transition-colors">
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
                
                <div className="h-72 w-full relative min-w-0 min-h-0">
                  <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
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

                <div className="h-44 w-full flex items-center justify-center relative min-w-0 min-h-0">
                  <div className="absolute inset-0 min-w-0 min-h-0">
                    <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
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
                  </div>
                  
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
                  <div 
                    onClick={() => setShowCollectedFeesBreakdownMonth(currentMonthFilter)}
                    className="flex justify-between items-center bg-slate-50 hover:bg-teal-50 hover:border-teal-200 p-2.5 rounded-xl border border-slate-100 text-xs cursor-pointer transition-all group"
                    title="Guji si aad u aragto lacagta la bixiyay (Click to see collected breakdown)"
                  >
                    <span className="flex items-center gap-2 font-semibold text-slate-600 group-hover:text-teal-900">
                      <span className="w-2.5 h-2.5 rounded-full bg-teal-600 inline-block" />
                      Collected Fees
                    </span>
                    <span className="font-extrabold text-slate-800 group-hover:text-teal-900">${Number(currentMonthPaidAmount).toFixed(2)}</span>
                  </div>
                  <div 
                    onClick={() => setShowPendingFeesBreakdownMonth(currentMonthFilter)}
                    className="flex justify-between items-center bg-slate-50 hover:bg-rose-50 hover:border-rose-200 p-2.5 rounded-xl border border-slate-100 text-xs cursor-pointer transition-all group"
                    title="Guji si aad u aragto ardayda aan bixin (Click to see unpaid students)"
                  >
                    <span className="flex items-center gap-2 font-semibold text-slate-600 group-hover:text-rose-900">
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-400 inline-block" />
                      Unpaid Balances
                    </span>
                    <span className="font-extrabold text-slate-800 group-hover:text-rose-700">${Number(currentMonthUnpaidAmount).toFixed(2)}</span>
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
                              const senderInfo = item.name ? `${item.name} (${item.email || 'No email'})` : (item.email || 'unknown sender');
                              setConfirmModal({
                                isOpen: true,
                                title: `Delete Message from "${item.name || 'Inbox'}"?`,
                                message: `Are you sure you want to permanently delete the inbox message from "${senderInfo}" from the overview audit list? This is irreversible.`,
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
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 pl-0.5">Primary Instructor / Macallinka 1-aad (Subax) *</label>
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
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 pl-0.5">Second Instructor / Macallinka 2-aad (Galab - Dual Session)</label>
                    <select
                      value={newStudentSecondTeacher}
                      onChange={(e) => setNewStudentSecondTeacher(e.target.value)}
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white outline-none cursor-pointer"
                    >
                      <option value="">-- Diman / No Second Instructor --</option>
                      {database.teachers.map(t => (
                        <option key={t.id} value={t.id}>{t.name} ({t.classAssigned})</option>
                      ))}
                    </select>
                    <p className="text-[10px] text-slate-400 mt-1 font-medium">Fadlan dooro macallinka 2-aad haddii ardaygu dhamaynayo laba galmaad (Subax iyo Galab).</p>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 pl-0.5 font-medium">Assigned Shift / Session *</label>
                    <select
                      value={newStudentSession}
                      onChange={(e) => setNewStudentSession(e.target.value as 'Morning' | 'Afternoon' | 'Both')}
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white outline-none cursor-pointer"
                    >
                      <option value="Both">Both (Morning & Afternoon)</option>
                      <option value="Morning">Morning Session Only ðŸŒ…</option>
                      <option value="Afternoon">Afternoon Session Only ðŸŒ™</option>
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

                      <select
                        value={studentSessionFilter}
                        onChange={(e) => setStudentSessionFilter(e.target.value as 'All' | 'Morning' | 'Afternoon' | 'Both')}
                        className="px-3 py-2 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-xl text-xs font-bold text-purple-900 outline-none cursor-pointer"
                        title="Filter students and parents by shift/session"
                      >
                        <option value="All">All Shifts / Waqtiyada</option>
                        <option value="Morning">Morning Shift (Subax ðŸŒ…)</option>
                        <option value="Afternoon">Afternoon Shift (Galab ðŸŒ™)</option>
                        <option value="Both">Both Shifts (Labada Galin â˜€ï¸ðŸŒ™)</option>
                      </select>

                      {/* --- DOWNLOAD DIRECTORY MULTI-FORMAT TRIGGER --- */}
                      <div className="relative z-30">
                        <button
                          type="button"
                          onClick={() => setShowExportDropdown(!showExportDropdown)}
                          className="px-3 py-2 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-xl text-xs font-bold text-indigo-900 flex items-center gap-1.5 transition-all outline-none cursor-pointer active:scale-95"
                          title="Guji si aad u soo degto liiska ardayda (Download Students List)"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>La soo deg (Download)</span>
                          <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${showExportDropdown ? 'rotate-180' : ''}`} />
                        </button>
                        
                        {showExportDropdown && (
                          <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-slate-100 z-50 p-4 space-y-3.5 animate-fade-in text-left">
                            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                              <span className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                                <Download className="w-4 h-4 text-indigo-600" />
                                Soo Dejinta Ardayda / Export Options
                              </span>
                              <button 
                                type="button"
                                onClick={() => setShowExportDropdown(false)}
                                className="text-slate-400 hover:text-slate-600 font-bold text-xs p-1"
                              >
                                âœ•
                              </button>
                            </div>

                            {/* Section 1: All Active Students */}
                            <div className="space-y-1.5">
                              <div className="flex items-center justify-between text-[10px] font-black text-indigo-700 uppercase tracking-wider">
                                <span>Dhamaan Ardayda Firfircoon</span>
                                <span className="bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded font-bold">{database.students.filter(s => s.active).length} Arday</span>
                              </div>
                              <div className="grid grid-cols-3 gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => {
                                    handleExportStudentsPDF(database.students, "Dhamaan_All");
                                    setShowExportDropdown(false);
                                  }}
                                  className="py-2 px-1 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-[10px] rounded-xl border border-rose-200/60 flex flex-col items-center justify-center gap-0.5 transition-all cursor-pointer active:scale-95"
                                  title="Download all students as PDF"
                                >
                                  <span className="text-xs">ðŸ“•</span>
                                  PDF
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    handleExportStudentsExcel(database.students, "Dhamaan_All");
                                    setShowExportDropdown(false);
                                  }}
                                  className="py-2 px-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-[10px] rounded-xl border border-emerald-200/60 flex flex-col items-center justify-center gap-0.5 transition-all cursor-pointer active:scale-95"
                                  title="Download all students as Excel (CSV)"
                                >
                                  <span className="text-xs">ðŸ“—</span>
                                  Excel
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    handleExportStudentsWord(database.students, "Dhamaan_All");
                                    setShowExportDropdown(false);
                                  }}
                                  className="py-2 px-1 bg-sky-50 hover:bg-sky-100 text-sky-700 font-bold text-[10px] rounded-xl border border-sky-200/60 flex flex-col items-center justify-center gap-0.5 transition-all cursor-pointer active:scale-95"
                                  title="Download all students as Word"
                                >
                                  <span className="text-xs">ðŸ“˜</span>
                                  Word
                                </button>
                              </div>
                            </div>

                            {/* Section 2: Download by Class Separately */}
                            <div className="space-y-2 pt-2.5 border-t border-slate-100">
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-black text-teal-700 uppercase tracking-wider">
                                  Fasal Gaar Ah (Class Separately)
                                </span>
                              </div>
                              <div className="space-y-1.5">
                                <select
                                  value={exportSelectedClass}
                                  onChange={(e) => setExportSelectedClass(e.target.value)}
                                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 outline-none cursor-pointer"
                                >
                                  <option value="All">--- Dooro Fasal (Select Class) ---</option>
                                  {classSelectionList.map(cls => {
                                    const count = database.students.filter(s => s.className === cls && s.active).length;
                                    return (
                                      <option key={cls} value={cls}>
                                        {cls} ({count} Arday)
                                      </option>
                                    );
                                  })}
                                </select>

                                {exportSelectedClass !== 'All' ? (
                                  <div className="grid grid-cols-3 gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const list = database.students.filter(s => s.className === exportSelectedClass && s.active);
                                        handleExportStudentsPDF(list, `Fasalka_${exportSelectedClass.replace(/\s+/g, '_')}`);
                                        setShowExportDropdown(false);
                                      }}
                                      className="py-2 px-1 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-[10px] rounded-xl border border-rose-200 flex flex-col items-center justify-center gap-0.5 transition-all cursor-pointer active:scale-95"
                                    >
                                      <span className="text-xs">ðŸ“•</span>
                                      PDF
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const list = database.students.filter(s => s.className === exportSelectedClass && s.active);
                                        handleExportStudentsExcel(list, `Fasalka_${exportSelectedClass.replace(/\s+/g, '_')}`);
                                        setShowExportDropdown(false);
                                      }}
                                      className="py-2 px-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-[10px] rounded-xl border border-emerald-200 flex flex-col items-center justify-center gap-0.5 transition-all cursor-pointer active:scale-95"
                                    >
                                      <span className="text-xs">ðŸ“—</span>
                                      Excel
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const list = database.students.filter(s => s.className === exportSelectedClass && s.active);
                                        handleExportStudentsWord(list, `Fasalka_${exportSelectedClass.replace(/\s+/g, '_')}`);
                                        setShowExportDropdown(false);
                                      }}
                                      className="py-2 px-1 bg-sky-50 hover:bg-sky-100 text-sky-700 font-bold text-[10px] rounded-xl border border-sky-200 flex flex-col items-center justify-center gap-0.5 transition-all cursor-pointer active:scale-95"
                                    >
                                      <span className="text-xs">ðŸ“˜</span>
                                      Word
                                    </button>
                                  </div>
                                ) : (
                                  <div className="p-2 bg-teal-50/70 border border-teal-100 rounded-xl flex flex-col gap-1">
                                    <div className="text-[10px] font-extrabold text-teal-800">
                                      âš¡ Deji Dhamaan Fasalada Mid Mid (Export All Classes Separately):
                                    </div>
                                    <div className="grid grid-cols-3 gap-1">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          handleExportAllClassesSeparately('pdf');
                                          setShowExportDropdown(false);
                                        }}
                                        className="py-1.5 px-1 bg-white hover:bg-rose-50 text-rose-700 font-extrabold text-[9.5px] rounded-lg border border-rose-200 text-center transition-all cursor-pointer"
                                      >
                                        ðŸ“• All PDF
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          handleExportAllClassesSeparately('excel');
                                          setShowExportDropdown(false);
                                        }}
                                        className="py-1.5 px-1 bg-white hover:bg-emerald-50 text-emerald-700 font-extrabold text-[9.5px] rounded-lg border border-emerald-200 text-center transition-all cursor-pointer"
                                      >
                                        ðŸ“— All Excel
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          handleExportAllClassesSeparately('word');
                                          setShowExportDropdown(false);
                                        }}
                                        className="py-1.5 px-1 bg-white hover:bg-sky-50 text-sky-700 font-extrabold text-[9.5px] rounded-lg border border-sky-200 text-center transition-all cursor-pointer"
                                      >
                                        ðŸ“˜ All Word
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Section 2.5: Download by Teacher Separately (Including Mohamed and all shifts) */}
                            <div className="space-y-2 pt-2.5 border-t border-slate-100">
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-black text-indigo-700 uppercase tracking-wider">
                                  Macallin Gaar Ah (Teacher Separately)
                                </span>
                              </div>
                              <div className="space-y-1.5">
                                <select
                                  value={exportSelectedTeacher}
                                  onChange={(e) => setExportSelectedTeacher(e.target.value)}
                                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 outline-none cursor-pointer"
                                >
                                  <option value="All">--- Dooro Macallin (Select Teacher) ---</option>
                                  {database.teachers.map(tch => {
                                    const assigned = getStudentsForTeacher(tch, database.students);
                                    return (
                                      <option key={tch.id} value={tch.id}>
                                        {tch.name} ({assigned.length} Arday)
                                      </option>
                                    );
                                  })}
                                </select>

                                {exportSelectedTeacher !== 'All' && (() => {
                                  const tchObj = database.teachers.find(t => t.id === exportSelectedTeacher);
                                  const tchName = tchObj ? tchObj.name : 'Macallin';
                                  const tchList = tchObj ? getStudentsForTeacher(tchObj, database.students) : [];
                                  return (
                                    <div className="grid grid-cols-3 gap-1.5">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          handleExportStudentsPDF(tchList, `Macallin_${tchName.replace(/\s+/g, '_')}`);
                                          setShowExportDropdown(false);
                                        }}
                                        disabled={tchList.length === 0}
                                        className="py-2 px-1 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-[10px] rounded-xl border border-rose-200 flex flex-col items-center justify-center gap-0.5 transition-all cursor-pointer active:scale-95 disabled:opacity-40"
                                      >
                                        <span className="text-xs">ðŸ“•</span>
                                        PDF ({tchList.length})
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          handleExportStudentsExcel(tchList, `Macallin_${tchName.replace(/\s+/g, '_')}`);
                                          setShowExportDropdown(false);
                                        }}
                                        disabled={tchList.length === 0}
                                        className="py-2 px-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-[10px] rounded-xl border border-emerald-200 flex flex-col items-center justify-center gap-0.5 transition-all cursor-pointer active:scale-95 disabled:opacity-40"
                                      >
                                        <span className="text-xs">ðŸ“—</span>
                                        Excel ({tchList.length})
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          handleExportStudentsWord(tchList, `Macallin_${tchName.replace(/\s+/g, '_')}`);
                                          setShowExportDropdown(false);
                                        }}
                                        disabled={tchList.length === 0}
                                        className="py-2 px-1 bg-sky-50 hover:bg-sky-100 text-sky-700 font-bold text-[10px] rounded-xl border border-sky-200 flex flex-col items-center justify-center gap-0.5 transition-all cursor-pointer active:scale-95 disabled:opacity-40"
                                      >
                                        <span className="text-xs">ðŸ“˜</span>
                                        Word ({tchList.length})
                                      </button>
                                    </div>
                                  );
                                })()}
                              </div>
                            </div>

                            {/* Section 3: Filtered Students Section */}
                            {filteredStudents.length !== database.students.length && (
                              <div className="space-y-1.5 pt-2.5 border-t border-slate-100">
                                <div className="flex items-center justify-between text-[10px] font-black text-amber-600 uppercase tracking-wider">
                                  <span>Kaliya kuwa la shaandheeyay</span>
                                  <span className="bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded font-bold">{filteredStudents.filter(s => s.active).length} Arday</span>
                                </div>
                                <div className="grid grid-cols-3 gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      handleExportStudentsPDF(filteredStudents, "Shaandheeyay_Filtered");
                                      setShowExportDropdown(false);
                                    }}
                                    className="py-2 px-1 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-[10px] rounded-xl border border-rose-200 flex flex-col items-center justify-center gap-0.5 transition-all cursor-pointer active:scale-95"
                                    title="Download filtered list as PDF"
                                  >
                                    <span className="text-xs">ðŸ“•</span>
                                    PDF
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      handleExportStudentsExcel(filteredStudents, "Shaandheeyay_Filtered");
                                      setShowExportDropdown(false);
                                    }}
                                    className="py-2 px-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-[10px] rounded-xl border border-emerald-200 flex flex-col items-center justify-center gap-0.5 transition-all cursor-pointer active:scale-95"
                                    title="Download filtered list as Excel"
                                  >
                                    <span className="text-xs">ðŸ“—</span>
                                    Excel
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      handleExportStudentsWord(filteredStudents, "Shaandheeyay_Filtered");
                                      setShowExportDropdown(false);
                                    }}
                                    className="py-2 px-1 bg-sky-50 hover:bg-sky-100 text-sky-700 font-bold text-[10px] rounded-xl border border-sky-200 flex flex-col items-center justify-center gap-0.5 transition-all cursor-pointer active:scale-95"
                                    title="Download filtered list as Word"
                                  >
                                    <span className="text-xs">ðŸ“˜</span>
                                    Word
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Multi-Select Bulk Action Banner */}
                  {selectedStudentIds.length > 0 && (
                    <div className="mb-4 p-4 bg-gradient-to-r from-rose-50 via-amber-50 to-rose-50 border-2 border-rose-300 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 shadow-md animate-fade-in" id="students-multi-select-banner">
                      <div className="flex items-center gap-3 w-full sm:w-auto">
                        <span className="w-9 h-9 rounded-xl bg-rose-600 text-white flex items-center justify-center font-black text-sm shrink-0 shadow-sm">
                          {selectedStudentIds.length}
                        </span>
                        <div>
                          <div className="font-black text-xs text-rose-950 flex items-center gap-1.5 flex-wrap">
                            <span>{selectedStudentIds.length} Arday ayaa la doortay</span>
                            <span className="text-slate-500 font-medium">({selectedStudentIds.length} students selected)</span>
                          </div>
                          <p className="text-[11px] text-rose-800/80 font-medium mt-0.5">
                            Waxaad hal mar wada tirtiri kartaa ama la soo degi kartaa dhammaan ardayda aad calaamadeysay.
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 w-full sm:w-auto justify-end flex-wrap">
                        <button
                          type="button"
                          onClick={handleDeleteSelectedStudents}
                          className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white text-xs font-black rounded-xl shadow-md shadow-rose-600/20 flex items-center gap-2 transition-all cursor-pointer"
                          id="delete-selected-students-bulk-btn"
                        >
                          <Trash2 className="w-4 h-4" />
                          <span>Tirtir Kuwa La Doortay ({selectedStudentIds.length})</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            const selectedList = database.students.filter(s => selectedStudentIds.includes(s.id));
                            handleExportStudentsExcel(selectedList, "Ardayda_La_Doortay_Selected");
                          }}
                          className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                          title="La soo deg Excel ahaan kuwa la doortay"
                        >
                          <span>ðŸ“— Excel</span>
                        </button>

                        <button
                          type="button"
                          onClick={handleClearSelectedStudents}
                          className="px-3 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold rounded-xl flex items-center gap-1 transition-all cursor-pointer"
                          title="Ka noqo dhammaan xulashada"
                        >
                          <X className="w-3.5 h-3.5" />
                          <span>Ka Noqo</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Search query input & quick select toolbar */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-5">
                    <div className="relative flex-1">
                      <Search className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 w-5 h-5 pointer-events-none" />
                      <input
                        type="text"
                        placeholder="Search students by full name, ID, or parental fields..."
                        value={studentSearch}
                        onChange={(e) => setStudentSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:border-teal-500 focus:bg-white outline-none"
                      />
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={handleToggleSelectAllStudents}
                        className={`px-3 py-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5 ${
                          filteredStudents.length > 0 && filteredStudents.every(s => selectedStudentIds.includes(s.id))
                            ? 'bg-teal-600 text-white border-teal-700 shadow-xs'
                            : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                        }`}
                        title="Dooro dhammaan ardayda shaandheynta ku jira"
                      >
                        {filteredStudents.length > 0 && filteredStudents.every(s => selectedStudentIds.includes(s.id)) ? (
                          <>
                            <CheckSquare className="w-3.5 h-3.5" />
                            <span>Dhammaan Waa La Doortay</span>
                          </>
                        ) : (
                          <>
                            <Square className="w-3.5 h-3.5" />
                            <span>Dooro Dhammaan ({filteredStudents.length})</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Students Table */}
                  <div className="overflow-x-auto rounded-2xl border border-slate-100 scrollbar-thin">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-50 text-slate-400 font-bold border-b border-slate-150 uppercase tracking-wider">
                          <th className="py-3 px-3 w-10 text-center">
                            <input
                              type="checkbox"
                              checked={filteredStudents.length > 0 && filteredStudents.every(s => selectedStudentIds.includes(s.id))}
                              onChange={handleToggleSelectAllStudents}
                              className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500 border-slate-300 cursor-pointer accent-teal-600"
                              title={
                                filteredStudents.length > 0 && filteredStudents.every(s => selectedStudentIds.includes(s.id))
                                  ? "Ka noqo xulashada dhammaan"
                                  : "Dooro dhammaan ardayda liiska ku jira"
                              }
                            />
                          </th>
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
                            <td colSpan={9} className="py-12 text-center text-slate-450 font-medium">No student matching filter criteria found.</td>
                          </tr>
                        ) : (
                          filteredStudents.map(student => {
                            const isSelected = selectedStudentIds.includes(student.id);
                            return (
                            <tr 
                              key={student.id} 
                              className={`transition-colors ${
                                isSelected 
                                  ? 'bg-rose-50/70 hover:bg-rose-100/60' 
                                  : 'hover:bg-slate-50/50'
                              }`}
                            >
                              <td className="py-3.5 px-3 text-center">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => handleToggleSelectStudent(student.id)}
                                  className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500 border-slate-300 cursor-pointer accent-rose-600"
                                />
                              </td>
                              <td className="py-3.5 px-4 font-bold text-slate-800">
                                <span className={isSelected ? 'text-rose-900 font-black' : ''}>{student.id}</span>
                              </td>
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
                                    <span 
                                      className="font-extrabold text-slate-905 cursor-pointer hover:text-indigo-600 hover:underline select-none"
                                      onDoubleClick={() => handleSelectEditStudent(student)}
                                      title="Double-click to edit student details"
                                    >
                                      {student.name}
                                    </span>
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
                                  const teach1 = database.teachers.find(t => t.id === student.teacherId);
                                  const teach2 = student.secondTeacherId ? database.teachers.find(t => t.id === student.secondTeacherId) : null;
                                  return (
                                    <div className="flex flex-col gap-1">
                                      {teach1 ? (
                                        <div>
                                          <span className="font-extrabold text-slate-800">{teach1.name}</span>
                                          <span className="text-[9px] text-indigo-600 font-bold ml-1">(T1/Subax)</span>
                                        </div>
                                      ) : (
                                        <span className="text-amber-600 font-black italic bg-amber-50 border border-amber-100 px-1.5 py-0.5 rounded text-[9px]">unassigned</span>
                                      )}
                                      {teach2 && (
                                        <div className="text-[10px] font-bold text-teal-700 bg-teal-50 px-1.5 py-0.5 rounded border border-teal-200/60 flex items-center gap-1 w-fit">
                                          <span>2nd: {teach2.name}</span>
                                          <span className="text-[9px] text-teal-600">(Galab)</span>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })()}
                              </td>
                              <td className="py-3.5 px-4 text-teal-700 font-extrabold">
                                <div>${student.monthlyFee}</div>
                                {student.busFee ? (
                                  <div className="text-[9px] text-indigo-700 font-bold bg-indigo-50 border border-indigo-150 rounded px-1 mt-0.5 inline-block whitespace-nowrap">
                                    + ${student.busFee} Bus ðŸšŒ
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
                                    Info â„¹ï¸
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setMediaStudentTarget(student)}
                                    className="px-2 py-1.5 rounded-xl text-[10px] bg-rose-50 border border-rose-150 text-rose-700 hover:bg-rose-100 font-extrabold cursor-pointer transition-all shrink-0 flex items-center gap-1"
                                    title="Student Media Hub: Record voice, video or update picture files"
                                  >
                                    Media ðŸŽ¥
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
                                    Badge ðŸªª
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
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-slate-400 font-semibold" id="student-catalogue-pager">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span>Showing {filteredStudents.length} of {database.students.length} Total records</span>
                    {selectedStudentIds.length > 0 && (
                      <span className="px-2 py-0.5 bg-rose-100 text-rose-800 font-black rounded-full text-[10px]">
                        {selectedStudentIds.length} la doortay (selected)
                      </span>
                    )}
                  </div>
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
                          placeholder="â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢"
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

                    {/* Admin Privileges Toggle */}
                    <div>
                      <label className="flex items-center gap-2.5 p-3 bg-amber-50/70 hover:bg-amber-50 border border-amber-200/80 rounded-xl cursor-pointer transition-colors">
                        <input
                          type="checkbox"
                          checked={editTeacherIsAdmin}
                          onChange={(e) => setEditTeacherIsAdmin(e.target.checked)}
                          className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 border-amber-300 cursor-pointer"
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
                            <Crown className="w-3.5 h-3.5 text-amber-600" />
                            Awoodda Maamulaha (Admin Privileges)
                          </div>
                          <p className="text-[10px] text-amber-700/80">U ogolow macallinkan inuu galo qaybta Maamulka (Admin Dashboard)</p>
                        </div>
                      </label>
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
                          placeholder="â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢"
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

                    {/* Admin Privileges Toggle */}
                    <div>
                      <label className="flex items-center gap-2.5 p-3 bg-amber-50/70 hover:bg-amber-50 border border-amber-200/80 rounded-xl cursor-pointer transition-colors">
                        <input
                          type="checkbox"
                          checked={newTeacherIsAdmin}
                          onChange={(e) => setNewTeacherIsAdmin(e.target.checked)}
                          className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 border-amber-300 cursor-pointer"
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
                            <Crown className="w-3.5 h-3.5 text-amber-600" />
                            Awoodda Maamulaha (Admin Privileges)
                          </div>
                          <p className="text-[10px] text-amber-700/80">U ogolow macallinkan inuu galo qaybta Maamulka (Admin Dashboard)</p>
                        </div>
                      </label>
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
                    // Count all students assigned (both primary, secondary/afternoon/both shifts, name and class matching)
                    const assignedStudents = getStudentsForTeacher(teacher, database.students);
                    const studentCount = assignedStudents.length;

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
                        className={`bg-white p-6 rounded-3xl border transition-all duration-300 flex flex-col justify-between group ${
                          teacher.isAdmin ? 'border-amber-200/80 hover:border-amber-300 shadow-amber-100/30' : 'border-slate-100 hover:border-teal-100'
                        } hover:shadow-lg hover:shadow-slate-100/80`} 
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
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="text-[10px] font-black text-slate-400 tracking-wider">ID: {teacher.id}</span>
                                  {teacher.isAdmin && (
                                    <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-amber-500 text-white shadow-xs flex items-center gap-1">
                                      <Crown className="w-2.5 h-2.5" /> Admin Staff
                                    </span>
                                  )}
                                </div>
                                <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full shrink-0 ${
                                  studentCount > 0 
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                                    : 'bg-amber-50 text-amber-600 border border-amber-100'
                                }`}>
                                  {studentCount} Students
                                </span>
                              </div>
                              <h4 className="font-extrabold text-slate-800 text-sm mt-1 truncate group-hover:text-teal-650 transition-colors flex items-center gap-1.5">
                                {teacher.name}
                                {teacher.isAdmin && <Crown className="w-3.5 h-3.5 text-amber-500 shrink-0" />}
                              </h4>
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

                            {/* Direct Download Action Bar for this Teacher's Students */}
                            <div className="pt-2 mt-1 border-t border-slate-200/60 flex flex-wrap items-center justify-between gap-1.5">
                              <span className="text-[9.5px] font-extrabold text-slate-600 uppercase tracking-wider flex items-center gap-1">
                                <Download className="w-3 h-3 text-teal-600" />
                                Deji Ardayda ({assignedStudents.length}):
                              </span>
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleExportStudentsPDF(assignedStudents, `Macallin_${teacher.name.replace(/\s+/g, '_')}`)}
                                  disabled={assignedStudents.length === 0}
                                  className="px-2 py-1 text-[9px] bg-rose-50 hover:bg-rose-100 text-rose-700 font-extrabold rounded-lg border border-rose-200 transition-colors cursor-pointer disabled:opacity-40"
                                  title={`Soo deji ardayda ${teacher.name} oo PDF ah`}
                                >
                                  ðŸ“• PDF
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleExportStudentsExcel(assignedStudents, `Macallin_${teacher.name.replace(/\s+/g, '_')}`)}
                                  disabled={assignedStudents.length === 0}
                                  className="px-2 py-1 text-[9px] bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-extrabold rounded-lg border border-emerald-200 transition-colors cursor-pointer disabled:opacity-40"
                                  title={`Soo deji ardayda ${teacher.name} oo Excel ah`}
                                >
                                  ðŸ“— Excel
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleExportStudentsWord(assignedStudents, `Macallin_${teacher.name.replace(/\s+/g, '_')}`)}
                                  disabled={assignedStudents.length === 0}
                                  className="px-2 py-1 text-[9px] bg-sky-50 hover:bg-sky-100 text-sky-700 font-extrabold rounded-lg border border-sky-200 transition-colors cursor-pointer disabled:opacity-40"
                                  title={`Soo deji ardayda ${teacher.name} oo Word ah`}
                                >
                                  ðŸ“˜ Word
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="pt-4 mt-4 border-t border-slate-100 flex flex-wrap gap-2 justify-end">
                          <button
                            type="button"
                            onClick={() => handleToggleTeacherAdmin(teacher.id, !teacher.isAdmin)}
                            className={`flex-1 sm:flex-initial px-3 py-2 text-[10px] font-extrabold uppercase rounded-xl border shadow-xs transition-all duration-250 flex items-center justify-center gap-1.5 cursor-pointer ${
                              teacher.isAdmin
                                ? 'bg-amber-500 hover:bg-amber-600 text-white border-amber-600'
                                : 'bg-amber-50 hover:bg-amber-500 text-amber-800 hover:text-white border-amber-200'
                            }`}
                            title={teacher.isAdmin ? "Ka qaad awoodda Maamulaha (Make regular teacher)" : "Ka dhig Maamule (Make admin with one click)"}
                          >
                            <Crown className="w-3.5 h-3.5" />
                            {teacher.isAdmin ? 'Ka Qaad Admin' : 'Ka Dhig Admin ðŸ‘‘'}
                          </button>
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
                            Badge ðŸªª
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
        {activeTab === 'teacherAttendance' && null}
        {false && (() => {
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
                    className={`px-4 py-2 text-[10.5px] font-black uppercase tracking-wider rounded-xl transition-all duration-200 cursor-pointer flex items-center gap-1.5 ${
                      attendanceSubTab === 'reports'
                        ? 'bg-white text-slate-800 shadow-xs'
                        : 'text-slate-450 hover:text-slate-705'
                    }`}
                  >
                    <Download className="w-3.5 h-3.5 text-blue-500" />
                    Range Reports
                  </button>
                  <button
                    type="button"
                    onClick={() => setAttendanceSubTab('all_logs')}
                    className={`px-4 py-2 text-[10.5px] font-black uppercase tracking-wider rounded-xl transition-all duration-200 cursor-pointer flex items-center gap-1.5 ${
                      attendanceSubTab === 'all_logs'
                        ? 'bg-white text-slate-800 shadow-xs'
                        : 'text-slate-450 hover:text-slate-705'
                    }`}
                  >
                    <CalendarRange className="w-3.5 h-3.5 text-teal-600" />
                    Dhammaan Diiwaannada (All Logs & Edit)
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
                        
                        <div className="h-44 w-full flex items-center justify-center relative min-w-0 min-h-0">
                          <div className="absolute inset-0 min-w-0 min-h-0">
                            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
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
                          </div>
                          
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

                        <div className="h-44 w-full mt-2 relative min-w-0 min-h-0">
                          <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
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
                                    <span>ðŸ“ Coordinates:</span>
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
                                          <span className="font-extrabold text-slate-900 text-xs">ðŸ“… {log.date}</span>
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
                                          <span>ðŸ“ Coordinates:</span>
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

              {/* SUB TAB 4: ALL TEACHER ATTENDANCE RECORDS & MANAGEMENT */}
              {attendanceSubTab === 'all_logs' && (
                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-6 animate-fade-in" id="teacher-all-logs-view">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
                    <div>
                      <h3 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-2">
                        <CalendarRange className="w-4 h-4 text-teal-600" />
                        Dhammaan Diiwaannada Imaanshaha Macallimiinta (All Teacher Attendance)
                      </h3>
                      <p className="text-slate-450 text-xs font-semibold mt-0.5">
                        Diiwaanada maalin walba, wax ka bedel (edit), tirtir (delete), ama ku dar diiwaan cusub.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setShowAddTeacherAttModal(true)}
                      className="px-4 py-2.5 bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white font-extrabold text-xs rounded-xl shadow-sm transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
                    >
                      <PlusCircle className="w-4 h-4" />
                      + Ku Dar Diiwaan Cusub
                    </button>
                  </div>

                  {/* Filters Bar */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 bg-slate-50/75 p-4 rounded-2xl border border-slate-100">
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Raadi Macallin / Search</label>
                      <input
                        type="text"
                        value={searchTeacherAttQuery}
                        onChange={(e) => setSearchTeacherAttQuery(e.target.value)}
                        placeholder="Magaca ama ID-ga..."
                        className="w-full text-xs py-2 px-3 bg-white border border-slate-200 rounded-xl font-bold text-slate-800 outline-none focus:border-teal-500"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Dooro Macallin / Teacher</label>
                      <select
                        value={filterTeacherAttTeacherId}
                        onChange={(e) => setFilterTeacherAttTeacherId(e.target.value)}
                        className="w-full text-xs py-2 px-3 bg-white border border-slate-200 rounded-xl font-bold text-slate-800 outline-none cursor-pointer"
                      >
                        <option value="All">Dhammaan Macallimiinta (All)</option>
                        {database.teachers.map(t => (
                          <option key={t.id} value={t.id}>{t.name} (ID: {t.id})</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Xaaladda / Status</label>
                      <select
                        value={filterTeacherAttStatus}
                        onChange={(e) => setFilterTeacherAttStatus(e.target.value as 'All' | 'Present' | 'Late')}
                        className="w-full text-xs py-2 px-3 bg-white border border-slate-200 rounded-xl font-bold text-slate-800 outline-none cursor-pointer"
                      >
                        <option value="All">Dhammaan Xaaladaha (All)</option>
                        <option value="Present">Waqtiga Yimid (Present/On-Time)</option>
                        <option value="Late">Soo Dahooy (Late)</option>
                      </select>
                    </div>

                    <div className="flex items-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          const logs = (database.teacherAttendance || []).filter(log => {
                            const teacher = database.teachers.find(t => t.id === log.teacherId);
                            const tName = teacher ? teacher.name.toLowerCase() : (log.teacherName || '').toLowerCase();
                            if (searchTeacherAttQuery && !tName.includes(searchTeacherAttQuery.toLowerCase()) && !log.teacherId.toLowerCase().includes(searchTeacherAttQuery.toLowerCase())) return false;
                            if (filterTeacherAttTeacherId !== 'All' && log.teacherId !== filterTeacherAttTeacherId) return false;
                            if (filterTeacherAttStatus !== 'All' && log.status !== filterTeacherAttStatus) return false;
                            return true;
                          });

                          // Format for Excel download
                          const headers = ["ID", "Macallin (Teacher Name)", "Teacher ID", "Taariikh (Date)", "Waqti (Time)", "Xaalad (Status)", "Masaafo (Distance meters)", "Latitude", "Longitude"];
                          const rows = logs.map(l => {
                            const tObj = database.teachers.find(t => t.id === l.teacherId);
                            return [
                              l.id,
                              `"${(tObj ? tObj.name : l.teacherName || 'Teacher').replace(/"/g, '""')}"`,
                              l.teacherId,
                              l.date,
                              l.time,
                              l.status,
                              Math.round(l.distanceFromSchool || 0),
                              (l.latitude || 0).toFixed(5),
                              (l.longitude || 0).toFixed(5)
                            ].join(',');
                          });
                          const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + [headers.join(','), ...rows].join('\n');
                          const encodedUri = encodeURI(csvContent);
                          const link = document.createElement("a");
                          link.setAttribute("href", encodedUri);
                          link.setAttribute("download", `Diiwaanka_Imaanshaha_Macallimiinta_${new Date().toISOString().split('T')[0]}.csv`);
                          document.body.appendChild(link);
                          link.click();
                          document.body.removeChild(link);
                        }}
                        className="flex-1 py-2 px-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-extrabold text-[10px] rounded-xl border border-emerald-200 transition-colors flex items-center justify-center gap-1 cursor-pointer"
                        title="Soo deji Excel"
                      >
                        ðŸ“— Excel
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const logs = (database.teacherAttendance || []).filter(log => {
                            const teacher = database.teachers.find(t => t.id === log.teacherId);
                            const tName = teacher ? teacher.name.toLowerCase() : (log.teacherName || '').toLowerCase();
                            if (searchTeacherAttQuery && !tName.includes(searchTeacherAttQuery.toLowerCase()) && !log.teacherId.toLowerCase().includes(searchTeacherAttQuery.toLowerCase())) return false;
                            if (filterTeacherAttTeacherId !== 'All' && log.teacherId !== filterTeacherAttTeacherId) return false;
                            if (filterTeacherAttStatus !== 'All' && log.status !== filterTeacherAttStatus) return false;
                            return true;
                          });

                          let tableRows = '';
                          logs.forEach((l, idx) => {
                            const tObj = database.teachers.find(t => t.id === l.teacherId);
                            tableRows += `<tr>
                              <td style="border:1px solid #ccc;padding:6px;text-align:center;">${idx + 1}</td>
                              <td style="border:1px solid #ccc;padding:6px;font-weight:bold;">${tObj ? tObj.name : l.teacherName || 'Teacher'}</td>
                              <td style="border:1px solid #ccc;padding:6px;text-align:center;">${l.date}</td>
                              <td style="border:1px solid #ccc;padding:6px;text-align:center;">${l.time}</td>
                              <td style="border:1px solid #ccc;padding:6px;text-align:center;">${l.status === 'Present' ? 'On-Time (Present)' : 'Late'}</td>
                              <td style="border:1px solid #ccc;padding:6px;text-align:center;">${Math.round(l.distanceFromSchool || 0)}m</td>
                            </tr>`;
                          });

                          const htmlContent = `<!DOCTYPE html>
                            <html>
                            <head>
                              <meta charset="utf-8">
                              <title>Diiwaanka Imaanshaha Macallimiinta</title>
                              <style>
                                body { font-family: Arial, sans-serif; margin: 20px; }
                                h2 { text-align: center; color: #0d9488; }
                                table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 12px; }
                                th { background-color: #f1f5f9; border: 1px solid #ccc; padding: 8px; font-weight: bold; }
                              </style>
                            </head>
                            <body>
                              <h2>BANUU JALAAL SCHOOL CAMPUS</h2>
                              <h3 style="text-align:center;color:#64748b;font-size:13px;">Diiwaanka Guud Ee Imaanshaha Macallimiinta (Teacher Attendance)</h3>
                              <p style="text-align:center;font-size:11px;color:#94a3b8;">Taariikhda: ${new Date().toLocaleDateString()}</p>
                              <table>
                                <thead>
                                  <tr>
                                    <th>#</th>
                                    <th>Magaca Macallinka</th>
                                    <th>Taariikhda</th>
                                    <th>Waqtiga</th>
                                    <th>Xaaladda</th>
                                    <th>Masaafada</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  ${tableRows}
                                </tbody>
                              </table>
                            </body>
                            </html>`;

                          const blob = new Blob(['\ufeff' + htmlContent], { type: 'application/msword' });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `Diiwaanka_Imaanshaha_Macallimiinta_${new Date().toISOString().split('T')[0]}.doc`;
                          document.body.appendChild(a);
                          a.click();
                          document.body.removeChild(a);
                          URL.revokeObjectURL(url);
                        }}
                        className="flex-1 py-2 px-2 bg-sky-50 hover:bg-sky-100 text-sky-700 font-extrabold text-[10px] rounded-xl border border-sky-200 transition-colors flex items-center justify-center gap-1 cursor-pointer"
                        title="Soo deji Word"
                      >
                        ðŸ“˜ Word
                      </button>
                    </div>
                  </div>

                  {/* Filtered Logs Table */}
                  {(() => {
                    const allLogs = (database.teacherAttendance || []).filter(log => {
                      const teacher = database.teachers.find(t => t.id === log.teacherId);
                      const tName = teacher ? teacher.name.toLowerCase() : (log.teacherName || '').toLowerCase();
                      if (searchTeacherAttQuery && !tName.includes(searchTeacherAttQuery.toLowerCase()) && !log.teacherId.toLowerCase().includes(searchTeacherAttQuery.toLowerCase())) return false;
                      if (filterTeacherAttTeacherId !== 'All' && log.teacherId !== filterTeacherAttTeacherId) return false;
                      if (filterTeacherAttStatus !== 'All' && log.status !== filterTeacherAttStatus) return false;
                      return true;
                    }).sort((a, b) => b.date.localeCompare(a.date) || b.time.localeCompare(a.time));

                    if (allLogs.length === 0) {
                      return (
                        <div className="text-center py-16 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                          <Clock className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                          <p className="text-xs font-bold text-slate-500">Wax diiwaan ah lama helin oo ku habboon shaandhayntaada.</p>
                          <p className="text-[10px] text-slate-400 mt-1">Guji "+ Ku Dar Diiwaan Cusub" si aad u geliso imaanshaha macallinka.</p>
                        </div>
                      );
                    }

                    return (
                      <div className="overflow-x-auto border border-slate-100 rounded-2xl">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="bg-slate-50 text-slate-500 font-black border-b border-slate-100 uppercase tracking-wider text-[9.5px]">
                              <th className="py-3 px-4">#</th>
                              <th className="py-3 px-4">Macallinka (Teacher)</th>
                              <th className="py-3 px-4">Fasalka</th>
                              <th className="py-3 px-4">Taariikhda (Date)</th>
                              <th className="py-3 px-4">Waqtiga (Time)</th>
                              <th className="py-3 px-4 text-center">Xaaladda (Status)</th>
                              <th className="py-3 px-4">Masaafada GPS</th>
                              <th className="py-3 px-4 text-center">Wax Ka Bedel / Tirtir</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                            {allLogs.map((log, idx) => {
                              const teacher = database.teachers.find(t => t.id === log.teacherId);
                              const tName = teacher ? teacher.name : (log.teacherName || 'Teacher');
                              const tClass = teacher ? (teacher.classAssigned || teacher.className) : 'N/A';
                              return (
                                <tr key={log.id} className="hover:bg-slate-50/40 transition-colors">
                                  <td className="py-3 px-4 font-mono text-[10px] text-slate-400">{idx + 1}</td>
                                  <td className="py-3 px-4">
                                    <div className="flex items-center gap-2">
                                      <div className="w-7 h-7 rounded-lg bg-teal-50 text-teal-700 font-bold flex items-center justify-center text-xs shrink-0 border border-teal-100">
                                        {tName.charAt(0).toUpperCase()}
                                      </div>
                                      <div>
                                        <span className="font-extrabold text-slate-800 block text-xs">{tName}</span>
                                        <span className="text-[9.5px] text-slate-400 font-mono">ID: {log.teacherId}</span>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="py-3 px-4 text-slate-600 font-medium">{tClass}</td>
                                  <td className="py-3 px-4 font-mono font-bold text-slate-800">{log.date}</td>
                                  <td className="py-3 px-4 font-mono text-slate-600">{log.time}</td>
                                  <td className="py-3 px-4 text-center">
                                    <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider border ${
                                      log.status === 'Present'
                                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                        : 'bg-amber-50 text-amber-700 border-amber-200'
                                    }`}>
                                      {log.status === 'Present' ? 'Waqtiga Yimid' : 'Soo Dahooy'}
                                    </span>
                                  </td>
                                  <td className="py-3 px-4 font-mono text-[10.5px] text-slate-500">
                                    {Math.round(log.distanceFromSchool || 0)}m
                                  </td>
                                  <td className="py-3 px-4 text-center">
                                    <div className="flex items-center justify-center gap-1.5">
                                      <button
                                        type="button"
                                        onClick={() => setEditingTeacherAtt({
                                          id: log.id,
                                          teacherId: log.teacherId,
                                          date: log.date,
                                          time: log.time,
                                          status: log.status
                                        })}
                                        className="p-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg transition-colors cursor-pointer"
                                        title="Wax ka bedel diiwaankan"
                                      >
                                        <Edit2 className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleDeleteTeacherAtt(log.id, log.teacherId, log.date)}
                                        className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg transition-colors cursor-pointer"
                                        title="Tirtir diiwaankan"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    );
                  })()}

                  {/* Modal: Edit Teacher Attendance Record */}
                  {editingTeacherAtt && (
                    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
                      <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-100 space-y-4 animate-scale-up">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                          <h4 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                            <Edit2 className="w-4 h-4 text-indigo-600" />
                            Wax Ka Bedel Diiwaanka Imaanshaha
                          </h4>
                          <button
                            type="button"
                            onClick={() => setEditingTeacherAtt(null)}
                            className="text-slate-400 hover:text-slate-600 text-sm font-bold cursor-pointer"
                          >
                            âœ•
                          </button>
                        </div>

                        <div className="space-y-3 text-xs">
                          <div>
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Macallinka</label>
                            <select
                              value={editingTeacherAtt.teacherId}
                              onChange={(e) => setEditingTeacherAtt({ ...editingTeacherAtt, teacherId: e.target.value })}
                              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 outline-none"
                            >
                              {database.teachers.map(t => (
                                <option key={t.id} value={t.id}>{t.name} (ID: {t.id})</option>
                              ))}
                            </select>
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Taariikhda (Date)</label>
                              <input
                                type="date"
                                value={editingTeacherAtt.date}
                                onChange={(e) => setEditingTeacherAtt({ ...editingTeacherAtt, date: e.target.value })}
                                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold font-mono text-slate-800 outline-none"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Waqtiga (Time)</label>
                              <input
                                type="time"
                                value={editingTeacherAtt.time}
                                onChange={(e) => setEditingTeacherAtt({ ...editingTeacherAtt, time: e.target.value })}
                                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold font-mono text-slate-800 outline-none"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Xaaladda Imaanshaha</label>
                            <select
                              value={editingTeacherAtt.status}
                              onChange={(e) => setEditingTeacherAtt({ ...editingTeacherAtt, status: e.target.value as 'Present' | 'Late' })}
                              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 outline-none"
                            >
                              <option value="Present">Waqtiga Yimid (On-Time / Present)</option>
                              <option value="Late">Soo Dahooy (Late Arrival)</option>
                            </select>
                          </div>
                        </div>

                        <div className="flex gap-2 pt-2 border-t border-slate-100">
                          <button
                            type="button"
                            onClick={() => setEditingTeacherAtt(null)}
                            className="flex-1 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
                          >
                            Ka Noqo (Cancel)
                          </button>
                          <button
                            type="button"
                            onClick={handleSaveEditedTeacherAtt}
                            className="flex-1 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl shadow-sm transition-colors cursor-pointer"
                          >
                            Keydi Isbedelka (Save)
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Modal: Add New Teacher Attendance Record */}
                  {showAddTeacherAttModal && (
                    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
                      <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-100 space-y-4 animate-scale-up">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                          <h4 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                            <PlusCircle className="w-4 h-4 text-teal-600" />
                            Geli Diiwaan Imaansho Cusub (Add Teacher Attendance)
                          </h4>
                          <button
                            type="button"
                            onClick={() => setShowAddTeacherAttModal(false)}
                            className="text-slate-400 hover:text-slate-600 text-sm font-bold cursor-pointer"
                          >
                            âœ•
                          </button>
                        </div>

                        <div className="space-y-3 text-xs">
                          <div>
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Dooro Macallinka *</label>
                            <select
                              value={newTeacherAttRecord.teacherId}
                              onChange={(e) => setNewTeacherAttRecord({ ...newTeacherAttRecord, teacherId: e.target.value })}
                              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 outline-none"
                            >
                              <option value="">-- Dooro Macallin --</option>
                              {database.teachers.map(t => (
                                <option key={t.id} value={t.id}>{t.name} (ID: {t.id})</option>
                              ))}
                            </select>
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Taariikhda (Date) *</label>
                              <input
                                type="date"
                                value={newTeacherAttRecord.date}
                                onChange={(e) => setNewTeacherAttRecord({ ...newTeacherAttRecord, date: e.target.value })}
                                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold font-mono text-slate-800 outline-none"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Waqtiga (Time) *</label>
                              <input
                                type="time"
                                value={newTeacherAttRecord.time}
                                onChange={(e) => setNewTeacherAttRecord({ ...newTeacherAttRecord, time: e.target.value })}
                                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold font-mono text-slate-800 outline-none"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Xaaladda Imaanshaha</label>
                            <select
                              value={newTeacherAttRecord.status}
                              onChange={(e) => setNewTeacherAttRecord({ ...newTeacherAttRecord, status: e.target.value as 'Present' | 'Late' })}
                              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 outline-none"
                            >
                              <option value="Present">Waqtiga Yimid (On-Time / Present)</option>
                              <option value="Late">Soo Dahooy (Late Arrival)</option>
                            </select>
                          </div>
                        </div>

                        <div className="flex gap-2 pt-2 border-t border-slate-100">
                          <button
                            type="button"
                            onClick={() => setShowAddTeacherAttModal(false)}
                            className="flex-1 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
                          >
                            Ka Noqo (Cancel)
                          </button>
                          <button
                            type="button"
                            onClick={handleAddNewTeacherAtt}
                            className="flex-1 py-2.5 px-4 bg-teal-600 hover:bg-teal-700 text-white font-extrabold text-xs rounded-xl shadow-sm transition-colors cursor-pointer"
                          >
                            Kaydi Diiwaanka (Save Record)
                          </button>
                        </div>
                      </div>
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
                        <h4 className="font-bold text-slate-705 mt-0.5">{teacherReportStartDate} âž” {teacherReportEndDate}</h4>
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

                          {/* Quick Export options per class */}
                          <div className="flex items-center justify-between gap-1.5 pt-2 border-t border-slate-200/40">
                            <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                              <Download className="w-3 h-3 text-emerald-600" />
                              Export:
                            </span>
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => {
                                  const classStudents = database.students.filter(s => s.className === cls);
                                  handleExportStudentsPDF(classStudents, `Fasalka_${cls.replace(/\s+/g, '_')}`);
                                }}
                                className="px-2 py-1 text-[9.5px] bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded-lg border border-rose-100 transition-colors cursor-pointer"
                                title="Download Class PDF"
                              >
                                ðŸ“• PDF
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  const classStudents = database.students.filter(s => s.className === cls);
                                  handleExportStudentsExcel(classStudents, `Fasalka_${cls.replace(/\s+/g, '_')}`);
                                }}
                                className="px-2 py-1 text-[9.5px] bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold rounded-lg border border-emerald-100 transition-colors cursor-pointer"
                                title="Download Class Excel"
                              >
                                ðŸ“— Excel
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  const classStudents = database.students.filter(s => s.className === cls);
                                  handleExportStudentsWord(classStudents, `Fasalka_${cls.replace(/\s+/g, '_')}`);
                                }}
                                className="px-2 py-1 text-[9.5px] bg-sky-50 hover:bg-sky-100 text-sky-700 font-bold rounded-lg border border-sky-100 transition-colors cursor-pointer"
                                title="Download Class Word"
                              >
                                ðŸ“˜ Word
                              </button>
                            </div>
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
                          {filteredPayReportStudents.length === 0 xœì}ksÛ8²è÷ó+0¾©XÞdÇ‰3Û)?ï8N6r6Ùš3µDXâ˜">bk½®:¿åþ´ûK. I@P?2QíN,Šx5ºýB÷+Ôú/døl9î7Ô÷pâÙ^_µŸu6ÐxÒ^G1¹ŠÛWÿ7òpLÚÏ×ÖÐyàÓ¯däöÏAnŒ=·Ïßé?&áÒÎi€F8î]€¢8qèãˆ6K|gk•Ž·c˜Ñ
Ú¬™ñ¹ëÑAˆóO>qÆ]1B'¢!­µ'èåJg„Ç­mï kcgõ?Š‘íƒˆøhE×AÛÛÛh\àØùïš¾B'¡_3ølõ’8üÚ÷º “ík˜ÒÅËñdL·÷½dñ~à¿’ˆ—þöukÅ\ü‘¸þc§Ó\©ƒ‘¶ƒ.Áaø÷„„Ú“O±Ñ¾¯î0¸¬ô—$Š]º¿­sìEvÝÝØÀ9§—ë/—íóÄó8þ{ä<F*
ßH¸Ù*z
Tä‘+J<d	²A$t¶ç“vÄ—„¢bb?raí~àa„ÙíN†Ì¯Ð2Óõw´7ÖøtÄ×ŸSJ*^¦T·,‘yöãˆ8n2Z¶Ü—zÈ™?ý”ƒü€°dÓí#c¿Ð	¬…./ÄŒg±•þöôigc|õûÒÎ5G·›­Uh7å¢Ï5Ú£’aŽ?`CQRFÿAûÐrÑïYÆ¯e£éç:Ã…ÇÑÖþô/äI_2T²ÿÊÈñbmm	­îÔïèÖ*ç6us©¡½›Ó‘ Ÿ†švÚ6Š÷Å»•ç×«AûÁDî7‚Æ!=“Úí­¢×aŒÑQ M÷pˆþ²ªèØ„å(m²¿ÃàÒÌ"xÜ~ŽÆq{õ‚Ð!a;NÿÈ9Í(n¯/!×Ù^
ŒÚ˜Í´M'§$¨­qÄîy˜"U2“°#l«AOþö¥Kç¡às0éu4öÚkAW¨+$tP 6ënHÛ_ÒEév¾Òûî&=‰÷¢ÀKb‚\ßs}Ò]26.¸y²
qøÊBÉˆ„ØsØ¢ƒ1î»ñ¤ý3¼™bõ«G.Œ%V&¹AiÑ8ñ7öÓ‚	Ý­a{“ØícºFŽˆ\Á¿úN¶VÇ

h‚ÂlÃ)‡À¥?]¶qj¤dü$Òìí5û.¹|8„ÉiË—ÃÀ#Ëô´Ó	^[zöT/‰Ù
U¿OåÏ‹íë!ö	U^€O0¹Ý8&¾ƒý>1±TYŸ0ˆQYbp!&Ø¦œì	ÓŒ$/‡”Â2Lºò2Á#;áQ4ÄNpÙe¥}®>]+à£’áH¤ûÎŠ\4ÁtGûIa{¸ì­ò>‹YGëå$µ§¿#Øío$}¶Öùå—ßMÀÝØ£`9ØüŸƒd¹ÜMzIŸË{Ñÿè[šÎ¥­t‹Š'âsJ„Ïáô34=d4ƒÎ(”gSz4Þ&òq)>‰Cº!H”Z°×2Ë#JQ›)9=1¾Å8Œ(KÝ|¤›>0·£T ·:ä_Ím²ÝI[1Ù©K<Â8†¡íAt0‘?á~‘é?z9ÁÝsê2ÒC!:jca0j
Ñý®þlªs@˜îü$pÜ÷<âl_ÿ$ˆƒá*q2UÙ„–šsD´½'Iº¼ÍTz¾ö O—Åž’
]÷ã˜˜fÎáIiõ^3Ë»žW;3°lfeHÞ×sÉL¾™Vg<«ÄÎ-ä¸º/çQÕ¦Ý€à‹Ò{<Ñ>`@Î®âVµë'²	{ðã¡ô’%{4%5ü8Ê*Ÿ«;÷EÛ™BÏt‚9þGÿ
ì2MØfÂYÐV…é³ìeG®Ou{ˆïäü5Õ®kLëÊÇŠ‡•G¥tÌìo°À·ÛmÔ=ûxpxz†vÏÎOvO÷ÑÙîûI¶»_ó9Ã½‚ª˜kSËà ‘Oé²y3¢FÚ“ö”“Ï±CÚ®Ï­˜ dzLˆ~Û8ë¸dÈ,wKÑžãù˜öœâú3ŠìÜŒ_µæôŽF(ÑóŠ­ÔÞ4Kÿ¶p0ˆIôª³÷Ãó	(mÉÃgun¹œ/p—ê`içoA0pcŒýŒvCOŒZ‚7¡|)ªÜ('+[«Ãg–ŽÜ™‘r—QÌŸñW×ýÃEH£c>úä`<tøË@°ÃWJntg†˜þ)×ñÂÃ3W&¡!ÕžUý&j‡ád­?SK‡¢îðãñUŒ¶Ñ€ø$¤€ËßMF#Šs£d@cJR}a&< cŒ{Øàšçƒö¼€Ò-òÉ%Ú£¶~£³øý	ºf‹žëÕ±‡]ÿ¿ûCÒc};‰ÏÛ/—éédî9	=ÚñÇ'~Hèßõþ ZýÞ‚1kcÚÔ	ú	ˆ¢ý¡Gà[k/kãÎ0$ç´-\ÿŽ“JkÛèKÎMþq8ÿëÑµÖ›È}_}Øß–fBšˆ‡ÒÉçöó9IÝÚs9=ˆsg<’Uè¬qƒM#û
©W`¶ò¸Ó¦¯†WB×AðàÕQû)°èüësÎ‘›°\÷ˆW8r¼ ‘Æ@¬±is$®¸A÷Tã×¥Ø?êÁ^-íœaºîÅ˜2 #å¾lHåd\œ¨…Î§(C j.õ{	Ù.`½Ž›A §ìŒdB~Þ¨E:Tì¸Ã:Ô¯ê€¸Ž$¸n¬)Oèu
2#îKàA7HbF~à!aª–¯ÀPÃ1r'hp„#ìÑ#²ÅX»	"f*³ØeÖUãmf­îÿ>OÏÌ‚14á°Z¢ªÝÒÎÁS.…}Ä¶ÁÃ@Œôºüe7½_ð¤Pé‰Nö=:©5Z‰	°ØDúîMºmð÷û¯yÜöÀãþãúg*ãa‡K¡8Næ„í¼¯#ÞÚéåÆ%ÜG8¢:Ëä{'úÄ¡@"3ú•Z¿IDå®gÐ=ßkh§ÔÉ	\;T-ÀÔ:áç`ƒö»=>‡·ø+¥âÿjìâáËŒ—knl"•’(”†Ké‚ÄxÄ°B¤+Ç©e_ Û~†â`Ü~¦•ûBJ*¦@ÿ:ÃÕCúdHEÂí¥·x€ûToat|ÐéttJœ€-LgW3qÖÐîì+’¾×þÃyÑv;`:qG)ðÌË¼dgŽifŠUèÜ£ƒQ€øµ™ìý+§XT†Í"n—ÍÅ|¨^àáq¤¦’­xH°£Áó8,-=Ûï4@:'|äiGù¡Þ^¤ØŒtÌTœÿ³µ›4&³­4í@È°M›eâ€d¨jÚÇ!¬$ŠŠ©ãá9¥|´Š>'Q’D®¯ï„þªIL‹0[q/p&òÀ©év·'Hü‘S†`º ÎÔìÓI/iÚáw}ê.ò¸ç¨%kè'0ñ‚ËŒºR„=ûA~s%½²Ã.ˆècÔ¥8‹]1^”áæ¡¯(Œ7êÄÁIpIÂ}ºt5&ï'~+¡Ø¨ãú}Â,j}]Åý÷	ô¯Ø®OïÂíã0Ñ6×ï3]¢=A®sUs¹ˆCl*|E`WKQ$}FqÁwZcèfÜÉœUÌšÏnlQ`Œ;`>àrß h>jÄ„F:f:Ô«NnpCÿùZþè{Á`@œe;‘Dñ*ò‘$,”ßÍ6Ë§|þ¿õ~T‹[fÀÚó›c2Í–œmk«/×ª7jîÙlÅN‰åw\Ôw¨,°´sMñ ý=¥Úa¬9“ô#Ô^ý©ÐMÎùÒÅUeßùj•·#ÒË>,åÛT½[çâÝST¸ŠVºø•Š>Þ ,ô§Ê€Å5¬ÂÅ¦º™ZÜ{º]Ñš¦eà™ ÄD&‹{z)Óö Îeq_/¿øÁ;M¿Ó½YF›z=4ízTK;åß¦è’k¦i§aå#ûbÙå²)åÔ]7¼ùrcƒ€—´|›ÉªaZPöw#Á±¨ó³»˜' 1EÆå»¢yS^ïƒÖÖu~”zLžÝFcÄÄaçi»fQ³N”q/}„¯Ú—ì{˜ø}f¤±Ÿûy.TÓiçÏ{dˆ¿¹AøŒpx1—%érþÑÊ0êèÚÈê*U™©•ŠÅøtxøëÉ?Ñn·{Øí¾…¨ŒUtøy÷m×*$ƒ\áQ4§0ŒKB.¼I›¶¢û5b†µâê>±v³ßa©È¹é'7(ð»ø9È~)~¿)Ú),@tv¸»ÿæðê~Ü{{Üí¿;í¢ÝÇgè1::<<°^Iz#7Šàfû¼ÂVòÄ«ÈÏ§ŠWùbL7ô{î•ëûàŽy‹ûØóÜ‘ëúôÇÖÁý!]@7‡ü|ÂV2Oãº—ô_6¸Ã+_]Š˜=ÀFÒÌ$NÏPx6ˆ`™‡wûÙýónw‡jÎt™mg&oO¶ãé•|>º.þ¬^ÏqYx>3ûBÌ!1cElíöŒ™b-¶”}Ù¡ÿ0µ„qÑGØô q>qnj¦õÐ£§AÐÇˆó¿ÖÙdl™ŠVh§3
mÿg¥Ø‰eh@©#9žUÇlå€Í:ioiçx»Wé!µŠþžK­C¿+ÿgKXŽÿ\P¾ö¯Aˆ±ÇÜ TŸò¼ÀÂ*‘n–ª‘KTÕÁ×¨µkTI:ETÉe£S7ª2Üu+÷úH½RÝù·ß«„Ìó“ôtŽfq×	B%»{ÒKÏùc‡›ßuë=&šq)Y(MŸª4,CdJr=©šÙ¸ x,_
Ím„§F¯TmŸÜE·ÍÖ%¹æÀˆ²¼2C¿"N7íYJOÙ/sÀ@ Î6iþÙW1lýVªXÑ»¦ð«	ZÒÓºÓÒt†‡Wcü‡‚ƒˆ?sbNýfL®2©!ï¼iÝ8Û}wD5<£W,ŸEÓ~àP†»O´=[ìæ+°ˆ@ãþ9¶#Jÿ–Ñ³ÅXwj±yß(ÍÍL`ÄÐ³¬ÂÈó3O,v—@žm˜¥> CáÓ5*<ÍÏ¤u
œÚ[qegTçÖÈ3Raéj•Ù¯ñ‚y©
_˜]µî€kÓÌ¶ö)¾Ò¯!»È\”¥ 5ÞˆItz[G®GX½uÍK&p­P'œß˜ö‚P¡Ÿáó†6­hvŽ€c~Ül­ŸOå†AjM¤JN ’ 5rnH['dåˆI•¡¹¸UTDyyuK°rZRUÁôÁË
Ye¯ˆï/çæj3Í1SÙl„Š7'¯V=Ñ41^‹ïý¿ÿý¿|UBŠ¸QÚA­g¢K#™ý>Ò¶I)lŸ¸zQþP!E´$9ã[¡[ÌOgã­ðòí²§ü^ø³"?(…ª¬ë#¦¸eÖüfYú©A8†¶×À,ÿ‡.Ê#ôbÌHá(	‹­À»†”®ßÂÀÿ8.JYZ×ôôïÁ=8Ã›æ#¬>ÕëB‘P¤!àGÎ±°ÕßºI±ž±“dß^”°lZ¤É2ž¹aì†è€;g.°5¨vâh¸®0ÿÔ¤¨ßI#?3s3?…œFy»žúi‡
aƒxˆvÐZÙ¥Y½œ°>Î~Šä·õ‘ÖR×õ1×æÀÖ¼#}ÔµüVX9œ„\ Ž¹~nŒ¹–Bú6ôÖ…IÉb½&äÚÜ4»Þ1m–ÁÓæNDõôäÙ¦sÔ†x£„V×‡¯(h‹[œ'(:‘¸%
²RG
·¥"4ôQRj…Š žum)S[Gš»WX_¡ûl™Bµ™v)sÔ+5Te
0yË: Typ¤Pæ.¤ËX@À¡q(»DC,¡ÕðVj
ÿ\W&jSñÁVäoNŸE˜c% cOÏytÀb±lvÃÔó>?»Ð‡:P­ðŠ*dM~až5 TfØ’ËcŠÈ¸½ã““ãÓ×è1:>ýÇ»ãýC»¸ž'ƒ9y‰ÞJü	¦xŒÁÕÓöñ7zx27m£gæ­©ãÈì¢Ç¬´g½ºR§¤Tõã=]
Fº}­åsB¢e%öX~–YE«Êr!Ð˜™Lsôäq„b³ÒJñ,xQÌçRIŠ(½·º®åÒ›ú8ïJ_Õ‘ª²ŒŠvOpÚ,â.–E%p”öö’QTý*†L.‹C‘>%Œ`ô/×ÿ¸ýûˆ-å	~¯ˆs,(âºàCŒ~bAÆ¯¡5²¨õâkÀª5Þ9 7™¼Ÿ¥§+5#Z1ßÓ\ò4..ã“2â½G)ÝÚ,Ò¥ï	Ð~B(ë=WËÅVÇ‡iêá,®°+tBœ:B5_&hhÇ­h1ÎÒæN,ˆ<YÚÉìnêÓBïÐÒ…fÒ‚þl(I´ X­šh-›x-eÄÖÈ2qE¯•b¹1u…:RkOnj¡eŒÑºÛ-MŒ–Aí0‡oÙó|³V¨†²³§ÎÁ’ZgC½OÙ+Ä|›e°Ð5j”ÅB×‰E&]SÆ)KÜs)¦ÔZAU=ìä4MÃ4‘Fó¶Âhä†ñÒÎ|é°‡Z¼"_ MvŒëí|ì¶Öé0àc™>ÃVàÊæ¤ðÉ£íW¤ãÞfò
ø˜ÍLI,X'¦*”’YÀGdË(-‹Ìµ,^®x¼•yCŠ,Å;¿ûòèšuÕ¡çâå£ÿ¤ÛÒZ¹i?º‘vÙ¯¬Õ8ÿŠž®tÆP6‡qký	Z^£
¦6G¬<¼Øú¤OùKö›Ð<[E
Öà(MÖjnôC‘åâPÂmú‚:H0ÿX–[^p2>„uBŒFi0Ô}Û9W˜CÛ¿eJ_CñPçý*°=Ÿˆ}Y¶Æb!x§	4àÓ$‰‡bZ°¡$²˜â£ë"ÍãV|X¬oêYÏÈ >tz”ëBö/e_o¾€™ªîâÿ,3Ÿ
Mo1‰	|/·ñ$€ƒY{ù®óI}Â É^¹ÈÔ¥üðœï‰ïP„\±ØÈ[ 1Y†kÃºé*-#„EÏ±\ùÇ>ª+ÿ(ã»ÀXùOx!ž¨Æ˜ô…²a:;ð%Ä´6bÎü•~lÔ¯‰çr•ÝVYVaçŸ”:ŒaV¥áÂtØ`ÀzVwAÆ85Z…3ÄGn%ìtXÂ (
cªöÑ¹®3´mn‹ftch1¡¶(Ò­ölŽB`}°‚QqÑ¹2F0bf¼°©ª)¸úp^ÄÁ(whýðTG™Òs rž`tà†xòÃmº„Kù	vÌ}0Âý˜A´žÆ‡p,7ýáC¨<þáCPþ~ÿ}©_z*_Â[N{\ã&s¦3Ìç5~¦iý	;8„¤¦òeüI½y¾„4ND—,!ÿ¤ÞÚÂÎ?Pà¸Mü…†Søhût]§A› ÞIß»":ûaùèô-bî3+5ƒÌBìÔF+µ!4¾°WVVë©LYM-Ö´°¶—2¬£d¦êÂÓÃ\klJ"1îÇ–&ìé€©¶hÒ]ó…{¬SîS‰÷ bìí2Óíñá.›°ÊŠ?j^÷%ª‡±‹½ÅÞ“°´ž^ç“³1l[]’ŸÉm-¡‹²ƒ6±|5·z©o¸ŠZ•Bò{pÄŽ;+—ê¢ë´¶­Ù-YÂŠÕä?\D×bÓÐÒ@­.êÙÔxÕÄpuØ öÏCÇMÜ‡Ž
Ÿð¢êHPmQ«úÊK\ ­×ˆÀ/¾Kh@¥Ä'¨ ›Í€·{>|)~ŽØ º¿8t˜“¤Wg£Ö_¦»+#´<‹[p÷ßŸuÑ›ãîÙ»ÿ´ºrEôÆâ œÌé.\Úk{È»ý‘õ\~>UÖs©´pW±T³ÂÁ!±sÎr¦C¹.ò
!ý„Ð¨'|ÿ±˜ÂÐ»y^sÅ#;Œy …MfÔ?cÁ¦ÍX¤tÓFi˜õIŸÒ´‰àö8Î7ë¡ `qGó]¬-(þšµ¥fO–+¶WÕÛÍêèYGõÏ¤:úþt‹	!mnàaËk’	Ãvâ/²ÞG+<¯©KÆ°NAÿ<¦v~šAŠ<JLyŒ'P&æ Í_j‘%a‹†zÑD±°­¡Ë­Õ#êâh}]tÕ£VNò{ÒS+œ•Öˆú¹ÔŒøeRtU$î¤(ÔÛw§‡TÒÿ°{Ú=:üÐE­Ï»ŸvwOvvW¬ Ê-Èä6üœ„ó*xÄ:mÇi¯eñÿ­<æmÕ†ÚÛÝÿõã{ôíŸ¼ûx ÚÒ»R-é1êþótï¾>}×=;Þ·LB%ªd<¯Ü!¬3}êºft:MöËÉ:PÕbµúK11cÝX˜±ús&U+[{53TEB•4ŸƒãâPÍ¬¯Ìå 92ÔÙ“ºâû'w§$ôWh™]ÒgÁ*Mbìu½œ/¢6·C4RÏoóvæ§LQRR³³ˆM¼:Ýòn)˜$D|sãIñ\ÐçØÃØãFÝ‰ßo_@A0Q ƒl{)ž"'IùúÉ%]ûP%Óâ¤ÝyQ`‚†Ç‰Å¼òƒçVH‚cõ\È!íêŽI!OIþ§¥„}/H[28M¾R4KktÐâpLxÊ®ÇÑ0ˆ+‰yÔb’:É†‘*RmlæD4XÅQ~·ñ zø+(.G’cð½WdÅëÈyH¢!«—Àšn_ãCK{»g€ƒstNX%

ÇŒ<¯Hâ³à¦e](¾ÄôÐ¬´VíT§}S~TÚqUXòVUhxC0ÚÑßÊ=ÈBû8tj%‡9Xb7¾oK¬¢²ƒÉÝ­"gVÒ \‚A«ùüŠ';Þö°Óƒ(`°¾fG]D'"Ñ:hOe”™‹mX9É&Iˆ‡¹”îâ $¬æa“ƒ€g{fã+|î:Š\tÁN‚F8D—Øëa”Ðã‰­4è(×`kZžB.VÛhÖ‚zA)YÔYè$”¸ƒÚà¸hÎöµ‰6®?0µ(e˜âFƒçs½¢5¯<SÙê6Ê4¨Ô×ÞXkP„¯Yþ)v#«Bi 1ÕÄÇŒ;‹þá©ªÄ,Sz¡±Ê«‹&#Ã\Q†Ïçð
tÅ¦[/ÉSÙÎ‹gw±ñ6Y}bÞh„9€@˜¿ußB‘C ™šö®R¯°Óû•²M¾c ^#Y2…à>ÜŽä<é XsÃ…#ù¹ë¹÷ûdo/uþˆôæÕü*ŠL
|Vµ…—Où¢¦ÎŸ¦xdƒšÌ¬°w‘¼£èñÍ%—è5Ôe.Ë^Õói–òÍec¸ì.”í::‹ÎKµ—È>ðOÈh:„,«Û…„ËR¼¯ª>¦pI•ºÏŒÎëR!¡²Ê¿QQùwôcèo•@H©uYŠ˜YŽTÂUSú¹³©/)!¢„±
ŠzÊ¸J2a!ÇC”ê— Ù]Pi•{[ÂÉR„›'jÏ%«k›_¨É…b0jpÃFÃè]â9¬všVÏD@}]ZÝæ— Qp	æâ~¦|Ðox@˜Úùü‰ñ€1¨×E	Å…Q3a(p¡7H·JáägCˆGYü¶ö»\‡²ôSMMJžþcˆ'&çÇ|¢A¡ÝÝ$€‹;¨hcEw»¤oåUy ¶‘gó´4¯c8ÛˆtùÚÂ6râº`W 	;Ã™lgÈm-Ýþï†ý!eR[‰òÒùì¶’·IòªtƒèÂÌÈIPV&¹ÌXKð¨,ž§ô	_aª]!ÕQ©F@
cŒŸ HDÿGÒ3 ?Çí¡„ýÚñBü¶“ÊíR*æÕzÊI v³ñý’ÂÇB.f‹êŸsàÅŒV“˜Á÷û—…;_RìzT=–R8ƒÓz--Ý|¹ÑäCºý$ê'‘ë6Ò¾ªYb²LÝ"
ýªºžÇ‘B&fÖý5…C%w¼ä+v.åìŒWr¹â/Ê\ÉF#rªQT«\¨FJÍž²O0ò8Û¼HÙ¦“rÊN§Aè.õ‹æ3KÑÎÁÑòô² §Þ
Åa“n–à^ÞÐko#l7ªgÃÈ ‰½Åè7ÄŒqÃVˆ€û_R¦MÏ ÍP6ûOO¡§K;¯“?\°¨Y^ö!=\Ø)‡	=ÀÈOeÕ„ÊªÃ ™¬ªF“ªû Måw`(73ú¼Ï,Fñú :nïNýÃÜÖ=;¿Vy)õQêjëEË‹#æ.hC1Œ ÑmX`1ï b‹ë-‡ ^R{ÜÞ(T~ü¹"è“×@Œ²ÌºJ[^ô½A.èÓ¿-Ò/)× N× ŸÛÚOÑÈõÛ—mSÂŒùøÒ²ÞÊ
l)¦¹Tq§¨mäŠ˜ú^º.›>b­ø©Ç¶„ÚËÙ:ÃÂS“Y¡nn™N.&iPÅç<ûReySeô¢EUN ‘-»f¯“ÄC«Âˆ4Ã:êjƒ§{Ýg~& Ÿ¤5Êëò9Ú)FŒ÷Ë§µäŒË1"wÒqžc…çyúÕk<|³.^t—+ò7QÄºhëõñ¬g^¦[I‹:Ü5W>åð^«}0ÆÂÊT9e.ã
­XT©ê(Tëjh¢Ì?¢’Î&2YÜ)ÙICÄ¯óå [Õ[Lù–çŽ\n©®-&¸?¤’àƒ\[šÎ°º,q±üž.KN{cu\Fî¿	ÚAO×ÖŸ£¿°ŒÍË÷}Ý’[¯¢–Ô|Ž´#÷Š8­õ•ôvïKM‡›Ðá[;l…¥®Y—7è×=EÝ:	‚vŠñGK)¬ž5e×0ŸÚ»L¶÷˜”w˜Þ‡<Ø’ÖÊ¤#£€!ke¢a‹1µRáry¯${g’‡dCQž‰¦T’sÔ×h—–&ºlkx‚†_¹QWXƒ¹.ÎŒ Š#ð–?·æê;5r‡Ã	iª#òO:Ã–ØJ}Z¶ú»WÆØ4p¨9ÊN‡|¹í·iÓ¹¢žšey‚Îñ’VBŒÏ”ˆ4[n 4Nëþ"ÑîÔžÝ3Ó’¾<Hœ;ùy,ï”¨£1‰7ÁˆP»¿¸Ã3	ÍuÖ¹ª]b@ÕuÕ“=žžùÌ‰Þâ_egÚ”83}Â¡:l0ˆsú*öŠmT[B-Ê×BZyÐnÜ§<¹Íx„EgÍYp<BÅ:øRòÁë#•»½G×ÑeðÍxŒ˜)-Û¥U¼a€À†m€À¯õ0™SˆrÚAâ@CO®x1jò	
‚rÐ »]'”9·<=wÇŒ›_À­©!Èú?Újæ €y•Òîö±/6‚íCóJÚëU/ý³¢¤ör±™eí)OÁ=ÀÀƒ½%;e¬¢^|H¡è}âôWL/{o™{Qå¼9ð²ž¬]Ãl §¦cŠ1eßiF
ý6Põ‰x”rÊÑd¦Òù¬T«6;ü5Ëg¬~Ï*ŒÇ3U;W7f‹r™åÊ^)`¾šët“ºÿé”,ì½wNNy’ýÿºßëÐ…Z˜ƒUv-ˆ±Ô™n7Öì­Wàkìu‚Ð¸>¯œ˜™Xá‡‚Y•V¤O3§‹9“ËÌ†îÙâ­¤^n'áMj,ÊQŸ"ýÙnægõÑf«žgna$©A	›´—·´_©–[Ø/–ßËTÔ…ô»6ª{+ûS«:ÂÇ.w‘j?ëÒŒêµ™”rÃâ“š£éŸi
“ÝÓƒãÓ×èýîëC´ÿîôìÃ»«d9f5 ç”-GôÖ†Z aà•³ðŸ÷ù¯J/¤üeku„Ý<ùG
¶Ý“ôúäÝÞî	zûî`÷¤›ÁKzñi}"½ˆâ$ˆUh”€zM%öKø…ÿP ä¿%'Úg/Ip#HF¶]ìDÞ|àÀ!K5Ò•_m±‚tÙà•¡—ƒ¶#¶ç=.‰cúgôªãñ×ŠCÄ¡}&þ‹ïù[Ù.¬€µÞA,ÕÏ 'ÔÀboðT0+¬àg¢²?]y{ýD(½À•ÖE(\å¾z°õ8a0¦Êi‚üZÂä<é¤šSÔ*Í)¨û,6é%á«öeû9O×Ä
žqârZMè«:£ t1lÿöËÚ·áïÅ ¤š¤½â¨Q÷×;·Ji²ÄÚ€ {¡H~Î>!O>‡Ùõ®O8L“á¶
Ø¨ñ‘¨²/Ì+/PWï-Ÿb„15ÐRþëW•´6¥´ä*i¬‰>¬Ø“ÏŠÝ0&W*>­Ï,‚ÜJ”‡¦»CVN¿IIœÑ(§·qH˜7·‚{J–ÔáGäå0ð	ƒ^¡ñ©è“Ý8&¾ƒý>éò8ÞOKÙ/•áB–Nó	RþN{2üšîIvtV~›ÙÌº\GÊ'(rQ›'ÈÚ;,ßç²f"ÖËÈ¦Yoqm^ÊäÇyÚ™XeXÕq²;&ï,qAã{,¹4®°•ÍHðŸÝe©ªb•Öj5‹ŽaÃ÷GM`gŸHÃ9Û´#'ý+xu}vVÛ4«F–Qƒ‚«	;Ö>(|-
uÏ:ˆçÈEïy:`X'ª—·âÝûi¥¹‹lJo‘ËÊoK;yAö¬¾@«ˆšºV·1¥(ÎÌñR@¥Ž™¸Q«øÐunVæbµb=OF/&ðC~+›¬°’Â§`.žòb£Q˜t^]€•&ðyåU]æ]šŽ¼’³Ê®%Š6ñd7O¸®xOU®ù½Ü¨uÊÆ(WmVÚ¡Šáþ<¥f§pfº(§’ÀªN³”ADÛK¢#BÐOT¤†éœÓQ8)T/í 5½§Kéµ»5¼ÂbcB+bÕ£–Œ\{:äÒ¢WÞ¬	zÝ/S&ÒÙVïãùœDIQ±£uP•ÓÀv kÕ}¾|óY'˜
{ß¦ü{¡výÆÃsú:íB!MÍzðÖn_¯ß{rÁ<”âÑ‚5ÐÅ*žä‘û©pþŠÑið5¸MeLÙBt= 1v=™é×Ä…f\E”zžƒ>ùu]ª>F¿’‰Sv¬Í]C|Î4D¨§¢VÅß·zH5©£.ÐŸ"Â´ÏÒ"zEµó–Mö2ÂþP÷òe¾hj—Ï#Z«æùÚW9	Åc]Ðª:³Hó<Y`§^Ú9øøº{üzu?î}ÜWÇ’ÖG’ò 	H9âsÔÅWT…´ÛŸÝsÇEÝd€}k†ŠÔçöTßq—n³‹¢›ºX(uè˜B¦6™dJ…ÔTÜêZºÌcç>,’Ù<³Î´rÝ\×¨‘šiP¡úYž»Î\¸O½REI{ÐT³i>ªÂ¤PmÏ0ßÒÑôd¼ŸŠÇg·xK.¼†.®¹)Í\óÕJîµ—k£éñâ`„D­y´!ZE‡Ž(uñö÷­Û¬Ï-’É4·{¨ù(Î—kB±Áõ)š¼BËŸðØ2öˆã/Å©rE†QPº¢’{waÊŒª’`ã2ÖŠBU)$úöaaµœåW_­THú3êGö·÷ÌÖîÄò¨@ù`F®ëAJÿéý0¸ÑûáúßŽ‚pDOKwì¦j„µäXÑÚÆ4~ß| %c½ØKŒ=n®¢¯Áù…ÎVoë@¹C”:#9ÿ–‘éý‚}zlbÍ¿tZ{ñôŠfÄ µó÷Á3¼3ŒC×½:3a'TE´ÁN–lŒ“,ÛàÄÄÀ›Þ&Žià÷Ò §ƒ„°ìŽ39þ­±!!Ó!o÷=ã„žÛÜÓ_òŸ?FiÀ,ž±ÿ¼ÿÇR›0^üÒ•Â—R£ÈÏ×ÖH?ß»ûÿþ¨u÷Ó¸wGQ”Í!V_±p¡Ð‚ ÔBQÍX1W;ÿ€µíçNZÎóØÆ¤æµÇ¨‹ÏIzK«jmóx;¸zæ¶»0·mÌÃÜ¶^wqP*I]—Òhw
­ò(¨’Ñ—[æe#
~i)es%=A->ó|jKH+mÙMEÜ™òK47sŠ	i	kQÝº¥ Òô¥®jµÂ£–'ÊIÊó¤Ø…MÑ¥(j—¢¼Ê":Q„}¢· MS7ræJSŠyf™K ûn®|n¢G¦—yæ“/`iÖ”t{“ôD†@EÚÒR)ªÙÒM-ôþÅû2þ¼Q9¬ŽmÒC§ø:Ã½ÈŽyÓ™·!Û±5¥|ýŠøýÙó‘•1b7MhÑZC/×\ ¸þ’)75š¬1×¢Þ‹úH% Sm¦4a~½8´†£½BËÅKŽ’T˜¥Ô5ÞdmÅrÚ»ª£EVn%W¬)Z Iœvõ˜×ŒUÝk¸ççP°”¥z·Y'ÄW¶|Î|GÂ²@ÔŽV¡Ù]#™Å²+Ñd›~U±KÁBOð$HbV«»n½Ng„CÔJ«}ßÒ¥fîˆx1%‹ºŸ¸“Íø¡âÎÇˆ„êo‰,s¨¥&!WõÉsxöÄÿü­ÝÜ=v‰j»²?Tìzb'Á £}<n‚e…Â*\K!tßp­çÒÙûƒ‡ƒjé„*¦í»a	© vÝßÙÒJ7T²v¾È€rÂº~ïPî
CìÒåS~¨h·†Áå	9?¸ƒaÜé>§kšøÛ(ðÉävâ|J.§S‘¹ùx/p&V
²"U~ueŠRŒÃöoÏÖÖØÕŽ²*ùâßìž¾>ì²Ì‹Š¢Çf4æ¦ê´uü™êmaë.´ÓU®“MªZ“ãóŠYLQ-Rôù‹ÞÁ.íHÜŠúaVUhˆH¤ÜZÑ%}WZë5þ $o!²v+²ºƒ+›]€<(Ÿôðdù¦iu^À~•P‡ƒ<7Š«¦"&)&ç“K‘õ+2"”übJtÚ´*ì‘BÐ7XaÃ"ê¤¿­q‡9Xê3u«
6+pI.l©å×¦] Tëó²xt»ËŠé‡)<¼’ŸàA‚pHŸµþj·[b*L/›«¶ätó`«‘#}}V›¨Úr,—zo"ìOXBõMÄ3]Ô$VG†ÔêR)u©>^å¾a¥æim-ÙF÷¡bžˆhá	Ña$×éÌéßY7s(Í©M=U¥•†l)$#zº:v¬©ôò´ìITã©ò¦J	ž¹3&6ÂL\é³–%¥u…,øÑQ{áJ.t1çGmûmz˜<©¼ˆ»äKl³~0%ÝÏwË”èá•©Ãu²Rúâ´Ì¨ç%jfÄ~X(3b#LÍŒ”é$vÄz¯cG˜¹„T'•€}+üg6!(›1c6®ÿíN¸Û‰Û åµkêøQm™f<‹†²gùV÷š•Á¨Â¨uØñËºê/Úe+ck±)ÄAŒ=žýÛ7î?û´Ì¹úë»~øÇñá§fÆÌ5¹G‰ä×‹$ÿ\X¦ê«œ’Ü†¼ÞT¢À‹˜ôç“	b†‡1NXfSO‚rm?¥]Ää3MÀ„£ú§Î-Â^í$úsÁþG˜	oî¬›²£äÏö\€æ^&ïÁ¯vTMýêmÁ ÑU·…?.Kó’ÜÍê&˜ž]„1÷öis¨ñq^HÒxSn’ä,-÷|P&Ð¸Ÿ29ôkf…^D÷jRÌ*y‰DáPm‚yÇ¡&‹O‘Ç`§7ZêùØ™¡Þ#˜š
‰‡¯ˆ>¡b©l˜¯ù5'Ñ%¾Âº=á!Æ~£‹q‹¾ËJ³Æ‹àÙ!+-ó‡§+<q]x—}ŸdU”;è;íyQ·®^‡dá8àÕ0ap™–…Š°=Œ‡N Š»e Qûšãq9®{öñàðô¬¡+j&Ç©‰ ü6ì2Œ¦£˜.Áa¨ÕPsfF15ðªGyä<fîË8 
ðê:j3g0{qôt¤¿ãY#=ÏðËÈ'~FÂ‘NŽW¦û-7¶»ïYºN÷â&E{f'lñÜOÐñÁÄÒ¼¢¹Ÿ¤Y˜þØƒ{ã0u¼Oye°p/ð<è'ÑfÑ	‰Î”“Rn—5WÏ<¿WÜókwØ¦7mžm(=Âb¨÷Êœ<¿Ù ˆ˜­^×‡q¤CwèrHŠ9”¨‚ß¿˜0l^+ÞÄÓfL,…HÀ¿iC“E(*k<,ž—Ï ýÞÖj<lÚJ$¼y
§éA ò4M?¥i6£3â5ïAØê!h‚ÎÃu¢&¹'ú«¸Ð’n»)zê Í‚â8•ÔÚ$þÐßJÍ?×­:ý„¬ß~×YäàÓ9w½˜„™Íø–Ñ”òS…ÒAŒ-„íûU'N‚K¨I‘Ö
ûeÔªtX|qÅ¢×YXï-ÙˆÎj Hß§Ô´#ÆÝ’Ý#µ6JFþÜH)¼Â•b6Lˆ–væ”é&Ï«ÔI~N},íb¬%‡º”©$%ŸÊT=Y*ïOö–Ì­Ó1…•E¡´—Yœô9KQ“þ°2Ë°Œ™t³G0*ËêM r‡ÐÀêF4ñ9ø˜›ŒÏéÄbvØ.F0>;ÜÝsø¡¡`œE87ŒÕž=wN‡Ü™u-Mç‡
-yÉè&æ‡¢¦«¹&\ç5{,îÜl`éÍ· ¹F)ù±ÔR5“Ißpoö©þ&³:Ÿ‚7`Óóaœô—§³¨H²õìŸœ@…êFÄ“Æl/–vR3RvRžõ0ÓwG?ÍuótÓqš‚g5i&¢Re•’ù¬‚0Va	ÒÉWèúKj™-Úey÷€±IÄ¨c	RO/¡W¨˜®š¹â7ÅÃÌN¸tóåfGêazx.ŠA|Þý´»{²{°ÛŒEäö‹eÅ8õ«58gGßãAKÕg™“Ixl‚ŽÆŒu§ìÂH:€éß3óŠºuËdFIžÉóÀw‰ÁÏ…xïžå—Ž‚ žKr—».³<Uö‡û™œêŽj,s_9
ƒ‘ ¦%ð^Ü^úõ…çŸÿ 3ßï_*œšKL¼Žä¡gž¤ÔÁÅ³äøt+ÿÜGôpÐîxìM u£ÛKÚ•DZ@Ý/:HËk•LY}þk–“^þÞq£wcJÓ÷"Uýâ«2Ï«â–ÚgkƒJ£C¸gÊ?¥w¿ 3x¡L1£JÐÓ8ST»:±{pä–SA©r.êò&½B+®Ýâp#Ex@ªW¬JòFJQûÒ‚îAv«Y8@Ÿò¯MÀ–Ñ\5öd¦šiŸs8šŠ+_ÎèÀÌvóã'èÌc7TT˜s!”Ÿ;ˆ+Y(»®£,|Â_JßQÕ?Q¼!ÍˆÊêJ®m_§ÉKüSüÍPL¦º%úÆ%=ú¯"	*¥ªü¦8¼RLeêž£o3Œ3û“'—W 9—-»IzãÈÜ'Ç$¸Ri$ÅrEÖ¼íªæ/;è=³Ýk`-~TYþé{†®¼N[°þÒAg	#Êô
‚£†¯x+}IgÕ+Öð¦ì fÿ<%”›IßŽ˜³¨\~ZÎWø ÷K/Û}{ºÖA{IT³iôÓ†•þ±YúÍ*ÃÊz£ž‚*ây¤Ó]:"$B{!ÁôtT¨%°iÙÛðrö.ƒciÿ
oÎ²ƒ5Ã>ð­3¬¬,\ê6qž>T*¦b·ÕŠwk7PzoÖíÓùÀ7O».Û­{–	k ,Û(ªñ7ô‚šôû÷,HTkÍìžóS)gx5„B_ÎÞ5RŠüâ¬¤¢ôï›~a¶Ä²‘ó9ØG;6Gß´árôµ91¹Ê€|ßtË2íƒlª¢Òoþëÿ  ÿÿ qZñ