/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  GraduationCap, 
  Award,
  Calendar, 
  BookOpen, 
  Smile, 
  Sparkle, 
  MessageSquare, 
  CheckCircle2, 
  Clock, 
  LogOut, 
  Users, 
  FileCheck2,
  ChevronRight,
  Sparkles,
  Info,
  Search,
  Filter,
  Plus,
  Edit2,
  Trash2,
  Printer,
  Download,
  ChevronDown,
  ChevronUp,
  Check,
  X,
  Save,
  Sun,
  Moon,
  Menu,
  AlertTriangle,
  Bell,
  Inbox,
  CalendarRange,
  History,
  MapPin,
  Navigation,
  Target,
  Globe,
  Compass
} from 'lucide-react';
import { DatabaseState, Teacher, Student, DailyProgress, AttendanceType, LessonStatusType, TaskStatusType, GradeType, Exam, ExamScore, AppNotification, TeacherSubmission, TeacherAttendanceRecord } from '../types';
import { DugsigaSubucLogo } from './Logo';
import StudentMediaModal from './StudentMediaModal';

interface TeacherDashboardProps {
  teacher: Teacher;
  database: DatabaseState;
  onSaveDatabase: (updatedDb: DatabaseState) => void;
  onLogout: () => void;
}

export function TeacherDashboard({ teacher, database, onSaveDatabase, onLogout }: TeacherDashboardProps) {
  // Filters and states
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [currentSession, setCurrentSession] = useState<'Morning' | 'Afternoon'>('Morning');
  const [searchQuery, setSearchQuery] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [hasJustSubmitted, setHasJustSubmitted] = useState(false);

  // Workspace toggling
  const [activeWorkspace, setActiveWorkspace] = useState<'attendance' | 'exams' | 'studentHistory' | 'myAttendance'>('attendance');
  const [useSimulation, setUseSimulation] = useState<boolean>(false);
  const [simulatedLocation, setSimulatedLocation] = useState<'school' | 'home'>('school');
  const [simulatedTime, setSimulatedTime] = useState<string>('07:20');
  const [checkInLoading, setCheckInLoading] = useState<boolean>(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [checkInSuccess, setCheckInSuccess] = useState<string | null>(null);
  const [showNotifPopup, setShowNotifPopup] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [selectedHistoryStudentId, setSelectedHistoryStudentId] = useState<string | null>(null);
  const [mediaStudentTarget, setMediaStudentTarget] = useState<Student | null>(null);
  const [showStudentDetailModal, setShowStudentDetailModal] = useState<Student | null>(null);
  const [historySearchQuery, setHistorySearchQuery] = useState('');

  // Custom confirmation modal state to bypass iframe modal blockages
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    accentColor?: 'rose' | 'indigo' | 'amber' | 'teal';
    onConfirm: () => void;
  } | null>(null);

  // Helper to calculate geofence distance
  const getDistanceMeters = (lat1: any, lon1: any, lat2: any, lon2: any): number => {
    const p1 = Number(lat1);
    const p2 = Number(lon1);
    const p3 = Number(lat2);
    const p4 = Number(lon2);
    
    if (isNaN(p1) || isNaN(p2) || isNaN(p3) || isNaN(p4)) {
      console.warn("Invalid coordinates provided for distance calculation");
      return Infinity;
    }
    
    const R = 6371e3; // Earth's radius in meters
    const dLat = ((p3 - p1) * Math.PI) / 180;
    const dLon = ((p4 - p2) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((p1 * Math.PI) / 180) *
        Math.cos((p3 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
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

  const todayDateStr = new Date().toISOString().split('T')[0];
  const schoolLoc = database.schoolLocation || {
    latitude: 2.04082,
    longitude: 45.34260,
    name: "Banuu Jalaal School Campus",
    radiusMeters: 200
  };

  // Find if checked-in today
  const myCheckedInLog = (database.teacherAttendance || []).find(
    a => a.teacherId === teacher.id && a.date === todayDateStr
  );

  const handleVerifyAndCheckIn = () => {
    setCheckInLoading(true);
    setGpsError(null);
    setCheckInSuccess(null);

    const checkInWithCoordinates = (lat: number, lon: number) => {
      const distance = getDistanceMeters(lat, lon, schoolLoc.latitude, schoolLoc.longitude);
      
      if (distance > schoolLoc.radiusMeters) {
        setGpsError(`Outside Geofence Bounds: You are calculated to be ${Math.round(distance)} meters away from the registered school coordinates. Authorized radius is ${schoolLoc.radiusMeters} meters. Please move closer to the Dugsi to check-in.`);
        setCheckInLoading(false);
        return;
      }

      // Check-in succeeds!
      const now = new Date();
      let currentHH = now.getHours();
      let currentMM = now.getMinutes();
      let timeStr = now.toTimeString().split(' ')[0]; // HH:MM:SS

      if (useSimulation && schoolLoc.allowSimulation && simulatedTime) {
        const parts = simulatedTime.split(':');
        if (parts.length >= 2) {
          currentHH = parseInt(parts[0], 10);
          currentMM = parseInt(parts[1], 10);
          timeStr = `${simulatedTime.padStart(5, '0')}:00`;
        }
      }
      
      // Parse custom threshold or default to 07:30 AM
      let targetHH = 7;
      let targetMM = 30;
      if (teacher.requiredCheckInTime) {
        const parts = teacher.requiredCheckInTime.split(':');
        if (parts.length === 2) {
          targetHH = parseInt(parts[0], 10);
          targetMM = parseInt(parts[1], 10);
        }
      }

      const isLate = (currentHH > targetHH || (currentHH === targetHH && currentMM > targetMM));
      const status: 'Present' | 'Late' = isLate ? 'Late' : 'Present';

      const newLog: TeacherAttendanceRecord = {
        id: `TAR-${Date.now()}`,
        teacherId: teacher.id,
        teacherName: teacher.name,
        date: todayDateStr,
        time: timeStr,
        latitude: lat,
        longitude: lon,
        distanceFromSchool: distance,
        status: status
      };

      const systemNotifs = database.notifications || [];
      const newNotif = {
        id: `N-TAR-${Date.now()}`,
        type: 'attendance' as const,
        senderId: teacher.id,
        senderName: teacher.name,
        senderRole: 'teacher' as const,
        message: `Arrival Logged: Teacher ${teacher.name} has checked-in successfully on-site at ${timeStr} with geofencing verification (distance: ${Math.round(distance)}m, status: ${status}).`,
        timestamp: new Date().toISOString(),
        readBy: []
      };

      const updatedDb: DatabaseState = {
        ...database,
        teacherAttendance: [newLog, ...(database.teacherAttendance || [])],
        notifications: [newNotif, ...systemNotifs]
      };

      onSaveDatabase(updatedDb);
      setCheckInSuccess(`Check-in complete! You have been logged successfully as "${status}" at ${timeStr}.`);
      setCheckInLoading(false);
    };

    if (useSimulation && schoolLoc.allowSimulation) {
      setTimeout(() => {
        if (simulatedLocation === 'school') {
          // preseed some tiny random offset so it feels dynamic but inside geofence
          const offsetLat = schoolLoc.latitude + (Math.random() - 0.5) * 0.0003;
          const offsetLon = schoolLoc.longitude + (Math.random() - 0.5) * 0.0003;
          checkInWithCoordinates(offsetLat, offsetLon);
        } else {
          // Off-site simulated location
          const offsetLat = schoolLoc.latitude + 0.0354;
          const offsetLon = schoolLoc.longitude - 0.0412;
          checkInWithCoordinates(offsetLat, offsetLon);
        }
      }, 700);
    } else {
      if (!navigator.geolocation) {
        setGpsError("Browser GPS location is not natively supported in this sandbox client. Please activate simulation testing.");
        setCheckInLoading(false);
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (position) => {
          checkInWithCoordinates(
            position.coords.latitude,
            position.coords.longitude
          );
        },
        (error) => {
          let errorMessage = "Could not locate device coordinates. ";
          if (error.code === error.PERMISSION_DENIED) {
            errorMessage += "Permission was denied. Please allow location access in your browser, or switch to simulated testing.";
          } else {
            errorMessage += error.message;
          }
          setGpsError(errorMessage);
          setCheckInLoading(false);
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    }
  };


  // Computations for Teacher Notifications
  const systemNotifications = database.notifications || [];
  
  const teacherNotifications = systemNotifications.filter(
    n => n.senderId !== teacher.id && 
         (!n.targetClass || n.targetClass === teacher.classAssigned || n.targetClass === teacher.className)
  );

  const teacherUnreadNotifications = teacherNotifications.filter(
    n => !n.readBy.includes(teacher.id)
  );

  const totalUnreadCount = teacherUnreadNotifications.length;

  const attendanceTabUnreadCount = teacherUnreadNotifications.filter(
    n => n.type === 'student' || n.type === 'payment' || n.type === 'class'
  ).length;

  const handleMarkAllNotificationsRead = () => {
    const updated = systemNotifications.map(n => {
      const isForMe = n.senderId !== teacher.id && 
                      (!n.targetClass || n.targetClass === teacher.classAssigned || n.targetClass === teacher.className) &&
                      !n.readBy.includes(teacher.id);
      if (isForMe) {
        return { ...n, readBy: [...n.readBy, teacher.id] };
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
      if (n.id === notifId && !n.readBy.includes(teacher.id)) {
        return { ...n, readBy: [...n.readBy, teacher.id] };
      }
      return n;
    });
    onSaveDatabase({
      ...database,
      notifications: updated
    });
  };

  // Auto-mark notifications as read when relevant workspace is active
  useEffect(() => {
    if (activeWorkspace === 'attendance' && attendanceTabUnreadCount > 0) {
      const updated = systemNotifications.map(n => {
        const isForMeAttendance = n.senderId !== teacher.id && 
                                  (!n.targetClass || n.targetClass === teacher.classAssigned || n.targetClass === teacher.className) &&
                                  (n.type === 'student' || n.type === 'payment' || n.type === 'class') &&
                                  !n.readBy.includes(teacher.id);
        if (isForMeAttendance) {
          return { ...n, readBy: [...n.readBy, teacher.id] };
        }
        return n;
      });
      onSaveDatabase({
        ...database,
        notifications: updated
      });
    }
  }, [activeWorkspace, attendanceTabUnreadCount]);

  // Exam creation states
  const [isCreatingExam, setIsCreatingExam] = useState(false);
  const [examHeading, setExamHeading] = useState('');
  const [examDate, setExamDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [examSubjects, setExamSubjects] = useState<string[]>(['Laxniga', 'Imaanshaha', 'Xifdiga', 'Tajwiidka', 'Akhlaaqda iyo Nadaafada']);
  const [newSubjectInput, setNewSubjectInput] = useState('');
  
  // New Assessment Schedule fields
  const [assessmentType, setAssessmentType] = useState<'weekly' | 'monthly' | 'custom'>('weekly');
  const [weekNumber, setWeekNumber] = useState<number>(1);
  const [selectedMonth, setSelectedMonth] = useState<string>(() => new Date().toISOString().slice(0, 7)); // YYYY-MM

  // Helper: get last Thursday of Month
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

  // Helper: calculate student monthly score (sum of weeklies / count of completed)
  const calculateStudentMonthlyScore = (studentId: string, month: string) => {
    const weeklies = (database.exams || []).filter(ex => 
      ex.className === teacher.classAssigned &&
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
  
  // Helper: get progress trend for a student
  const getStudentProgressTrend = (studentId: string, examsList: Exam[]): { 
    trend: 'Improving' | 'Declining' | 'Stable' | 'No Data'; 
    icon: string;
    diff: number;
  } => {
    const weeklyExams = (examsList || [])
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

  // Helper: get student competition group based on final calculated monthly score
  const getStudentCompetitionGroup = (studentId: string, examsList: Exam[]) => {
    // Latest saved monthly assessment
    const isMonthlyExamList = (examsList || [])
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
      const weeklyEx = (examsList || []).filter(ex => ex.assessmentType === 'weekly');
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

  // Student scores template: record of studentId -> subjectName -> score (as string)
  const [studentScores, setStudentScores] = useState<Record<string, Record<string, string>>>({});
  const [studentComments, setStudentComments] = useState<Record<string, string>>({});

  // Expanded cards tracker for exam logs list
  const [expandedExamId, setExpandedExamId] = useState<string | null>(null);

  // States for compiling monthly exams and editing weekly exams in TeacherDashboard
  const [isCompilingMonthly, setIsCompilingMonthly] = useState(false);
  const [selectedWeeklyExamIds, setSelectedWeeklyExamIds] = useState<string[]>([]);
  const [editingExam, setEditingExam] = useState<Exam | null>(null);

  // Get active students assigned to this teacher
  const classStudents = database.students.filter(
    (s) => 
      s.teacherId === teacher.id &&
      (s.active === true || String(s.active) === 'true')
  );

  // Filter students by assigned shift / session
  const sessionStudents = classStudents.filter(
    (s) => {
      const studentSession = s.session || 'Both';
      return studentSession === 'Both' || studentSession === currentSession;
    }
  );

  // Daily logs dictionary state for current selectedDate: keys are studentId
  const [attendanceRecords, setAttendanceRecords] = useState<Record<string, AttendanceType>>({});
  const [lessonRecords, setLessonRecords] = useState<Record<string, LessonStatusType>>({});
  const [suradRecords, setSuradRecords] = useState<Record<string, TaskStatusType>>({});
  const [subacRecords, setSubacRecords] = useState<Record<string, TaskStatusType>>({});
  const [dhaqanRecords, setDhaqanRecords] = useState<Record<string, GradeType>>({});
  const [nadaafadRecords, setNadaafadRecords] = useState<Record<string, GradeType>>({});
  const [commentsRecords, setCommentsRecords] = useState<Record<string, string>>({});
  const [suuradeeMarayaRecords, setSuuradeeMarayaRecords] = useState<Record<string, string>>({});
  const [inteeBogRecords, setInteeBogRecords] = useState<Record<string, string>>({});
  const [boggeeRecords, setBoggeeRecords] = useState<Record<string, string>>({});
  const [openInteeBogStudentId, setOpenInteeBogStudentId] = useState<string | null>(null);
  const [expandedComments, setExpandedComments] = useState<Record<string, boolean>>({});

  const existingProgressForDay = database.progress.filter(p => 
    p.date === selectedDate && 
    p.teacherId === teacher.id &&
    p.className === teacher.classAssigned &&
    (p.session === currentSession || (!p.session && currentSession === 'Morning'))
  );
  const isAlreadyLoggedToday = existingProgressForDay.length > 0;

  // Reset hasJustSubmitted flag when selectedDate or currentSession changes
  useEffect(() => {
    setHasJustSubmitted(false);
  }, [selectedDate, currentSession]);

  // Loading existing logs of the selectedDate if they already exist in the database
  useEffect(() => {
    if (hasJustSubmitted) {
      return;
    }

    const existingProgress = database.progress.filter(p => 
      p.date === selectedDate && 
      p.teacherId === teacher.id &&
      (p.session === currentSession || (!p.session && currentSession === 'Morning'))
    );
    
    // Create mapping or load defaults
    const tempAtt: Record<string, AttendanceType> = {};
    const tempLes: Record<string, LessonStatusType> = {};
    const tempSur: Record<string, TaskStatusType> = {};
    const tempSub: Record<string, TaskStatusType> = {};
    const tempDhaq: Record<string, GradeType> = {};
    const tempNad: Record<string, GradeType> = {};
    const tempComm: Record<string, string> = {};
    const tempSuuradee: Record<string, string> = {};
    const tempInteeBog: Record<string, string> = {};
    const tempBoggee: Record<string, string> = {};

    sessionStudents.forEach(stu => {
      const recorded = existingProgress.find(p => p.studentId === stu.id);
      if (recorded) {
        tempAtt[stu.id] = recorded.attendance;
        tempLes[stu.id] = recorded.lessonCompleted;
        tempSur[stu.id] = recorded.surad;
        tempSub[stu.id] = recorded.subac;
        tempDhaq[stu.id] = recorded.dhaqan;
        tempNad[stu.id] = recorded.nadaafad;
        tempComm[stu.id] = recorded.faahfaahin;
        tempSuuradee[stu.id] = recorded.suuradeeMaraya || '';
        tempInteeBog[stu.id] = recorded.inteeBog || '';
        tempBoggee[stu.id] = recorded.boggee || '';
      } else {
        // Defaults
        tempAtt[stu.id] = 'Present';
        tempLes[stu.id] = 'Completed';
        tempSur[stu.id] = 'N/A'; // Surad is sometimes completed, so N/A by default
        tempSub[stu.id] = 'Completed'; // Daily group revision is standard
        tempDhaq[stu.id] = 'Good';
        tempNad[stu.id] = 'Good';
        tempComm[stu.id] = '';
        tempSuuradee[stu.id] = '';
        tempInteeBog[stu.id] = '';
        tempBoggee[stu.id] = '';
      }
    });

    setAttendanceRecords(tempAtt);
    setLessonRecords(tempLes);
    setSuradRecords(tempSur);
    setSubacRecords(tempSub);
    setDhaqanRecords(tempDhaq);
    setNadaafadRecords(tempNad);
    setCommentsRecords(tempComm);
    setSuuradeeMarayaRecords(tempSuuradee);
    setInteeBogRecords(tempInteeBog);
    setBoggeeRecords(tempBoggee);
    setSuccessMsg('');
    setErrorMsg('');
  }, [selectedDate, currentSession, database, teacher.id, hasJustSubmitted]);

  // Bulk fill helper to fast-track submissions
  const handleBulkFill = () => {
    const tempAtt: Record<string, AttendanceType> = {};
    const tempLes: Record<string, LessonStatusType> = {};
    const tempSur: Record<string, TaskStatusType> = {};
    const tempSub: Record<string, TaskStatusType> = {};
    const tempDhaq: Record<string, GradeType> = {};
    const tempNad: Record<string, GradeType> = {};
    
    sessionStudents.forEach(stu => {
      tempAtt[stu.id] = 'Present';
      tempLes[stu.id] = 'Completed';
      tempSur[stu.id] = 'N/A';
      tempSub[stu.id] = 'Completed';
      tempDhaq[stu.id] = 'Excellent';
      tempNad[stu.id] = 'Excellent';
    });

    setAttendanceRecords(prev => ({ ...prev, ...tempAtt }));
    setLessonRecords(prev => ({ ...prev, ...tempLes }));
    setSuradRecords(prev => ({ ...prev, ...tempSur }));
    setSubacRecords(prev => ({ ...prev, ...tempSub }));
    setDhaqanRecords(prev => ({ ...prev, ...tempDhaq }));
    setNadaafadRecords(prev => ({ ...prev, ...tempNad }));

    setSuccessMsg('Applied "All Present with Outstanding Lessons/Conduct" settings as standard template!');
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  const handleQuickSet = (status: AttendanceType) => {
    const tempAtt: Record<string, AttendanceType> = {};
    sessionStudents.forEach(stu => {
      tempAtt[stu.id] = status;
    });
    setAttendanceRecords(prev => ({ ...prev, ...tempAtt }));
    setSuccessMsg(`All students quick-marked as "${status}" for this session!`);
    setTimeout(() => setSuccessMsg(''), 4050);
  };

  // Synchronize subjects based on assessment type
  useEffect(() => {
    if (assessmentType === 'weekly') {
      setExamSubjects(['Laxniga', 'Imaanshaha', 'Xifdiga', 'Tajwiidka', 'Akhlaaqda iyo Nadaafada']);
      setExamHeading(`Week ${weekNumber} Assessment - ${selectedMonth}`);
    } else if (assessmentType === 'monthly') {
      setExamSubjects(['Monthly Evaluation Average']);
      setExamHeading(`Monthly Assessment - ${selectedMonth}`);
    } else {
      // Use custom fields
    }
  }, [assessmentType, weekNumber, selectedMonth, isCreatingExam]);

  // Exam scores state populator helper
  useEffect(() => {
    if (isCreatingExam) {
      setStudentScores(prev => {
        const next = { ...prev };
        classStudents.forEach(s => {
          if (!next[s.id]) {
            next[s.id] = {};
          }
          examSubjects.forEach(sub => {
            if (next[s.id][sub] === undefined || assessmentType === 'monthly') {
              if (assessmentType === 'monthly') {
                const { average } = calculateStudentMonthlyScore(s.id, selectedMonth);
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
  }, [isCreatingExam, examSubjects, classStudents, assessmentType, selectedMonth]);

  const handleAddSubject = (e: React.FormEvent) => {
    e.preventDefault();
    if (newSubjectInput.trim()) {
      const trimmed = newSubjectInput.trim();
      if (!examSubjects.includes(trimmed)) {
        setExamSubjects([...examSubjects, trimmed]);
      }
      setNewSubjectInput('');
    }
  };

  const handleRemoveSubject = (subToRemove: string) => {
    setExamSubjects(examSubjects.filter(sub => sub !== subToRemove));
  };

  const WEEKLY_MAX_SCORES: Record<string, number> = {
    'Laxniga': 30,
    'Imaanshaha': 30,
    'Xifdiga': 20,
    'Tajwiidka': 10,
    'Akhlaaqda iyo Nadaafada': 10
  };

  const handleScoreChange = (studentId: string, subjectName: string, val: string) => {
    if (assessmentType === 'weekly' && WEEKLY_MAX_SCORES[subjectName] !== undefined) {
      const maxAllowed = WEEKLY_MAX_SCORES[subjectName];
      const parsed = parseFloat(val);
      if (!isNaN(parsed) && parsed > maxAllowed) {
        val = String(maxAllowed);
      }
    }
    // Keep as string to allow seamless input editing in UI (prevents single-digit locking)
    setStudentScores(prev => ({
      ...prev,
      [studentId]: {
        ...(prev[studentId] || {}),
        [subjectName]: val
      }
    }));
  };

  const getStudentMetrics = (studentId: string) => {
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
      const { average, grade } = calculateStudentMonthlyScore(studentId, selectedMonth);
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

  const handleCompileMonthlyAssessment = () => {
    if (selectedWeeklyExamIds.length === 0) {
      alert("Fadlan dooro ugu yaraan hal qiimayn toddobaadle ah si aad u samayso qiimaynta bisha. (Please select at least one weekly assessment.)");
      return;
    }
    
    const chosenExams = (database.exams || []).filter(ex => selectedWeeklyExamIds.includes(ex.id));
    if (chosenExams.length === 0) {
      alert("No exams found for the selected IDs.");
      return;
    }
    
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
    
    const monthStr = selectedMonth;
    const [yearStr, monthNum] = monthStr.split('-');
    const savedDate = getLastThursdayOfMonth(parseInt(yearStr, 10), parseInt(monthNum, 10));
    
    const monthNames = [
      "Janaayo", "Febraayo", "Maarso", "Abriil", "May", "Juun", 
      "Luulyo", "Agoosto", "Sebtembar", "Oktoobar", "Nofeembar", "Diseembar"
    ];
    const somaliMonthName = monthNames[parseInt(monthNum, 10) - 1] || monthStr;
    
    const newExam: Exam = {
      id: `EX-${Date.now()}`,
      heading: `Qiimaynta Bisha ${somaliMonthName} (${somaliMonthName} Monthly Evaluation) - ${teacher.name}`,
      date: savedDate,
      className: teacher.classAssigned,
      teacherId: teacher.id,
      teacherName: teacher.name,
      subjects: ['Monthly Evaluation Average'],
      scores: scoresPayload,
      assessmentType: 'monthly',
      month: monthStr
    };
    
    const updatedExams = [newExam, ...(database.exams || [])];
    
    const examNotification: AppNotification = {
      id: `noti-${Date.now()}`,
      type: 'exam',
      senderId: teacher.id,
      senderName: teacher.name,
      senderRole: 'teacher',
      message: `Monthly evaluation for "${teacher.classAssigned}" compiled and saved from ${selectedWeeklyExamIds.length} weeks.`,
      timestamp: new Date().toISOString(),
      readBy: [teacher.id],
      targetClass: teacher.classAssigned
    };
    
    const updatedNotifications = [examNotification, ...(database.notifications || [])].slice(0, 100);
    
    const examSubmissionDetail = scoresPayload.map(sp => ({
      studentId: sp.studentId,
      studentName: sp.studentName,
      scoresSent: sp.scores,
      averageScoreSent: sp.averageScore,
      gradeSent: sp.grade
    }));

    const examSubmission: TeacherSubmission = {
      id: `TS-${Date.now()}`,
      teacherId: teacher.id,
      teacherName: teacher.name,
      className: teacher.classAssigned,
      type: 'exam',
      timestamp: new Date().toISOString(),
      title: `Qiimaynta Bisha ${somaliMonthName} Compiled`,
      studentCount: scoresPayload.length,
      summary: `Monthly evaluation average from ${selectedWeeklyExamIds.length} weeks`,
      studentsDetail: examSubmissionDetail
    };

    onSaveDatabase({
      ...database,
      exams: updatedExams,
      notifications: updatedNotifications,
      submissions: [examSubmission, ...(database.submissions || [])]
    });
    
    setIsCompilingMonthly(false);
    setSelectedWeeklyExamIds([]);
    setSuccessMsg(`Qiimaynta bisha ee "${newExam.heading}" waa la guulaystay ku darideeda! (Monthly evaluation compiled and saved!)`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setTimeout(() => setSuccessMsg(''), 5500);
  };

  const handleSaveExam = (e: React.FormEvent) => {
    e.preventDefault();
    if (!examHeading.trim()) {
      alert("Please enter a descriptive Heading/Title for the Exam.");
      return;
    }
    if (examSubjects.length === 0) {
      alert("Please declare or add at least one subject to examine.");
      return;
    }

    const scoresPayload = classStudents.map(s => {
      const { average, grade } = getStudentMetrics(s.id);
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
      className: teacher.classAssigned,
      teacherId: teacher.id,
      teacherName: teacher.name,
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
      senderId: teacher.id,
      senderName: teacher.name,
      senderRole: 'teacher',
      message: `Teacher ${teacher.name} completed and graded "${examHeading}" exam for class "${teacher.classAssigned}".`,
      timestamp: new Date().toISOString(),
      readBy: [teacher.id],
      targetClass: teacher.classAssigned
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
      teacherId: teacher.id,
      teacherName: teacher.name,
      className: teacher.classAssigned,
      type: 'exam',
      timestamp: new Date().toISOString(),
      title: `Exam Performance Graded ("${examHeading}")`,
      studentCount: scoresPayload.length,
      summary: `Subjects: ${examSubjects.join(', ')} (Avg Score: ${avgScore}%)`,
      studentsDetail: examSubmissionDetail
    };

    onSaveDatabase({
      ...database,
      exams: updatedExams,
      notifications: updatedNotifications,
      submissions: [examSubmission, ...(database.submissions || [])]
    });

    setSuccessMsg(`Exam results report for "${examHeading}" completed and synced!`);
    setIsCreatingExam(false);
    setExamHeading('');
    setExamSubjects(['Laxniga', 'Imaanshaha', 'Xifdiga', 'Tajwiidka', 'Akhlaaqda iyo Nadaafada']);
    setAssessmentType('weekly');
    setWeekNumber(1);
    setStudentComments({});
    setStudentScores({});
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setTimeout(() => setSuccessMsg(''), 5000);
  };

  const handleDeleteExam = (examId: string) => {
    setConfirmModal({
      isOpen: true,
      title: "Delete Exam Records?",
      message: "Are you sure you want to permanently delete this exam results record? This will remove all student score lists from catalog.",
      accentColor: 'rose',
      onConfirm: () => {
        const updatedExams = (database.exams || []).filter(ex => ex.id !== examId);
        onSaveDatabase({
          ...database,
          exams: updatedExams
        });
        setSuccessMsg("Successfully deleted the exam results record from the cloud.");
        setTimeout(() => setSuccessMsg(''), 4000);
        setConfirmModal(null);
      }
    });
  };

  const handleFieldChange = <T extends string>(

    studentId: string, 
    field: 'attendance' | 'lesson' | 'surad' | 'subac' | 'dhaqan' | 'nadaafad' | 'comment' | 'suuradeeMaraya' | 'inteeBog' | 'boggee', 
    value: T
  ) => {
    if (field === 'attendance') setAttendanceRecords(prev => ({ ...prev, [studentId]: value as unknown as AttendanceType }));
    if (field === 'lesson') setLessonRecords(prev => ({ ...prev, [studentId]: value as unknown as LessonStatusType }));
    if (field === 'surad') setSuradRecords(prev => ({ ...prev, [studentId]: value as unknown as TaskStatusType }));
    if (field === 'subac') setSubacRecords(prev => ({ ...prev, [studentId]: value as unknown as TaskStatusType }));
    if (field === 'dhaqan') setDhaqanRecords(prev => ({ ...prev, [studentId]: value as unknown as GradeType }));
    if (field === 'nadaafad') setNadaafadRecords(prev => ({ ...prev, [studentId]: value as unknown as GradeType }));
    if (field === 'comment') setCommentsRecords(prev => ({ ...prev, [studentId]: value }));
    if (field === 'suuradeeMaraya') setSuuradeeMarayaRecords(prev => ({ ...prev, [studentId]: value }));
    if (field === 'inteeBog') setInteeBogRecords(prev => ({ ...prev, [studentId]: value }));
    if (field === 'boggee') setBoggeeRecords(prev => ({ ...prev, [studentId]: value }));
  };

  const handleSubmitDailyWork = (e: React.FormEvent) => {
    e.preventDefault();

    try {
      // Prepare progress payload
      const updatedProgressList = [...database.progress];

      sessionStudents.forEach(stu => {
        const recordId = `P-${selectedDate}-${currentSession.toLowerCase()}-${stu.id}`;
        const existingIdx = updatedProgressList.findIndex(p => p.id === recordId);

        const dailyRecord: DailyProgress = {
          id: recordId,
          date: selectedDate,
          studentId: stu.id,
          studentName: stu.name,
          teacherId: teacher.id,
          className: teacher.classAssigned,
          attendance: attendanceRecords[stu.id] || 'Present',
          lessonCompleted: lessonRecords[stu.id] || 'Completed',
          surad: suradRecords[stu.id] || 'N/A',
          subac: subacRecords[stu.id] || 'Completed',
          dhaqan: dhaqanRecords[stu.id] || 'Good',
          nadaafad: nadaafadRecords[stu.id] || 'Good',
          faahfaahin: commentsRecords[stu.id] || '',
          session: currentSession,
          suuradeeMaraya: suuradeeMarayaRecords[stu.id] || '',
          inteeBog: inteeBogRecords[stu.id] || '',
          boggee: boggeeRecords[stu.id] || '',
        };

        if (existingIdx > -1) {
          updatedProgressList[existingIdx] = dailyRecord;
        } else {
          updatedProgressList.push(dailyRecord);
        }
      });

      const attNotification: AppNotification = {
        id: `noti-${Date.now()}`,
        type: 'attendance',
        senderId: teacher.id,
        senderName: teacher.name,
        senderRole: 'teacher',
        message: `${teacher.name} logged student attendance & progress (Class "${teacher.classAssigned}" - ${currentSession}) on ${selectedDate}.`,
        timestamp: new Date().toISOString(),
        readBy: [teacher.id],
        targetClass: teacher.classAssigned
      };

      const updatedNotifications = [attNotification, ...(database.notifications || [])].slice(0, 100);

      const progressSubmissionDetail = sessionStudents.map(stu => ({
        studentId: stu.id,
        studentName: stu.name,
        attendanceSent: attendanceRecords[stu.id] || 'Present',
        lessonSent: lessonRecords[stu.id] || 'Completed',
        notesSent: commentsRecords[stu.id] || ''
      }));

      const presentCount = sessionStudents.filter(stu => (attendanceRecords[stu.id] || 'Present') === 'Present').length;
      const lateCount = sessionStudents.filter(stu => (attendanceRecords[stu.id]) === 'Late').length;
      const absentCount = sessionStudents.filter(stu => (attendanceRecords[stu.id]) === 'Absent').length;
      const subSummary = `${presentCount} Present, ${lateCount} Late, ${absentCount} Absent`;

      // Check if there is an existing submission for this teacher, class, date and session
      const updatedSubmissions = [...(database.submissions || [])];
      const existingSubIdx = updatedSubmissions.findIndex(sub => 
        sub.teacherId === teacher.id &&
        sub.className === teacher.classAssigned &&
        sub.type === 'attendance' &&
        (sub as any).date === selectedDate &&
        (sub as any).session === currentSession
      );

      const workSubmission: TeacherSubmission = {
        id: existingSubIdx > -1 ? updatedSubmissions[existingSubIdx].id : `TS-${Date.now()}`,
        teacherId: teacher.id,
        teacherName: teacher.name,
        className: teacher.classAssigned,
        type: 'attendance',
        timestamp: new Date().toISOString(),
        title: `Logged Attendance & Progress (Session: ${currentSession})`,
        studentCount: sessionStudents.length,
        summary: subSummary,
        studentsDetail: progressSubmissionDetail,
        // Custom fields allowed dynamically in TS
        ...( { date: selectedDate, session: currentSession } as any )
      };

      if (existingSubIdx > -1) {
        updatedSubmissions[existingSubIdx] = workSubmission;
      } else {
        updatedSubmissions.unshift(workSubmission);
      }

      onSaveDatabase({
        ...database,
        progress: updatedProgressList,
        notifications: updatedNotifications,
        submissions: updatedSubmissions
      });

      setHasJustSubmitted(true);
      setSuccessMsg(existingSubIdx > -1 
        ? `Successfully updated today's attendance & progress records for the ${currentSession} session in the database!`
        : `Successfully saved attendance & progress records for the ${currentSession} session! (You can update this record at any time today)`
      );
      setErrorMsg('');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      setTimeout(() => setSuccessMsg(''), 6000);
    } catch (error) {
      console.error(error);
      setErrorMsg('Failed to update and sync digital attendance records. Please review the details and try again.');
      setSuccessMsg('');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      setTimeout(() => setErrorMsg(''), 6000);
    }
  };

  const filteredStudents = sessionStudents.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    s.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedStudent = selectedHistoryStudentId 
    ? classStudents.find(s => s.id === selectedHistoryStudentId)
    : null;

  const selectedStudentLogs = selectedHistoryStudentId
    ? database.progress
        .filter(p => p.studentId === selectedHistoryStudentId)
        .sort((a, b) => b.date.localeCompare(a.date))
    : [];

  const totalLogsCount = selectedStudentLogs.length;
  const presentLogsCount = selectedStudentLogs.filter(p => p.attendance === 'Present').length;
  const lateLogsCount = selectedStudentLogs.filter(p => p.attendance === 'Late').length;
  const absentLogsCount = selectedStudentLogs.filter(p => p.attendance === 'Absent').length;
  const attendancePercentage = totalLogsCount > 0 
    ? Math.round(((presentLogsCount + lateLogsCount * 0.5) / totalLogsCount) * 100) 
    : 100;

  const casharCount = selectedStudentLogs.filter(p => p.attendance !== 'Absent' && p.lessonCompleted === 'Completed').length;
  const suradCount = selectedStudentLogs.filter(p => p.attendance !== 'Absent' && p.surad === 'Completed').length;
  const subacCount = selectedStudentLogs.filter(p => p.attendance !== 'Absent' && p.subac === 'Completed').length;

  const getGradeClasses = (grade: GradeType) => {
    if (grade === 'Excellent') return 'bg-emerald-50 text-emerald-800 border-emerald-100 border';
    if (grade === 'Good') return 'bg-blue-50 text-blue-800 border-blue-100 border';
    if (grade === 'Average') return 'bg-slate-50 text-slate-700 border-slate-200 border';
    return 'bg-rose-50 text-rose-800 border-rose-100 border';
  };

  const teacherSidebarSections = [
    {
      title: 'Ardayda',
      items: [
        {
          id: 'attendance' as const,
          label: 'Joogitaanka & Horumarka',
          icon: Clock,
          badgeCount: attendanceTabUnreadCount > 0 ? attendanceTabUnreadCount : undefined,
        },
        {
          id: 'exams' as const,
          label: 'Qiimaynta Toddobaadlaha',
          icon: FileCheck2,
        },
        {
          id: 'studentHistory' as const,
          label: 'Taariikhda Ardayda & Horumarka',
          icon: History,
        }
      ]
    },
    {
      title: 'Macallinka',
      items: [
        {
          id: 'myAttendance' as const,
          label: 'Imaanshahayga (Check-In)',
          icon: MapPin,
        }
      ]
    }
  ];

  const renderSidebarContent = (isMobile = false) => (
    <div className="flex flex-col h-full justify-between p-6 overflow-hidden" id={`teacher-sidebar-content-${isMobile ? 'mobile' : 'desktop'}`}>
      <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
        {/* Brand Header */}
        <div className="flex items-center justify-between pb-6 border-b border-slate-800/80 mb-6 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex flex-col">
              <span className="font-extrabold text-white text-base tracking-tight leading-none font-sans" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Dugsiga Subuc</span>
              <span className="text-[10px] font-medium text-emerald-400 mt-1.5 leading-none font-mono">مدرسة السبع</span>
            </div>
          </div>
          {isMobile && (
            <button
              type="button"
              onClick={() => setIsMenuOpen(false)}
              className="p-1.5 bg-slate-900 border border-slate-800 rounded-xl text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Teacher Profile Card inside Sidebar */}
        <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800/60 flex items-center gap-3 shrink-0 mb-4">
          <span className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 font-extrabold text-sm flex items-center justify-center border border-indigo-500/20 shrink-0 select-none">
            {teacher.name.trim() ? teacher.name.trim().charAt(0).toUpperCase() : 'T'}
          </span>
          <div className="min-w-0 flex-1">
            <h4 className="font-extrabold text-slate-100 text-xs sm:text-sm truncate leading-snug">
              {teacher.name}
            </h4>
            <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider block mt-1 leading-none font-mono">
              Fasalka: {teacher.classAssigned}
            </span>
          </div>
        </div>

        {/* Scrollable Container of Items */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
          {teacherSidebarSections.map(section => (
            <div key={section.title} className="space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block px-3 pt-1 mb-1">
                {section.title}
              </span>
              <div className="space-y-1">
                {section.items.map(item => {
                  const Icon = item.icon;
                  const isCurrent = activeWorkspace === item.id;
                  
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setActiveWorkspace(item.id);
                        if (item.id === 'exams') {
                          setIsCreatingExam(false);
                        }
                        if (isMobile) {
                          setIsMenuOpen(false);
                        }
                      }}
                      className={`w-full py-2.5 px-4 text-left text-xs font-semibold flex items-center justify-between rounded-2xl transition-all cursor-pointer group ${
                        isCurrent
                          ? 'bg-[#1e5ee6] text-white font-extrabold shadow-lg shadow-blue-600/10'
                          : 'text-slate-400 hover:text-white hover:bg-slate-900/40'
                      }`}
                      id={`teacher-menutab-${item.id}`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className={`w-4 h-4 shrink-0 transition-transform ${isCurrent ? 'text-white' : 'text-slate-400 group-hover:text-white'}`} />
                        <span className="normal-case transition-colors">{item.label}</span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {item.badgeCount !== undefined && item.badgeCount > 0 && (
                          <span className="bg-rose-600 text-white rounded-full text-[9px] font-extrabold px-1.5 py-0.5 min-w-[18px] text-center inline-block leading-none shadow-sm shadow-rose-600/20">
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

      {/* Logout Action at Bottom */}
      <div className="pt-6 border-t border-slate-900/50 shrink-0">
        <button
          onClick={onLogout}
          className="w-full py-3 px-4 bg-rose-955/10 hover:bg-rose-955/20 text-rose-450 hover:text-rose-400 text-xs font-bold rounded-2xl border border-rose-900/20 inline-flex items-center justify-center gap-2 transition-all cursor-pointer"
          id="teacher-sidebar-logout-btn"
        >
          <LogOut className="w-4 h-4" />
          Ka Bax Portalka
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50/50 flex flex-col lg:flex-row font-sans animate-fade-in" id="teacher-workspace">
      {/* 1. Desktop Sidebar (Admin-like) */}
      <aside className="hidden lg:flex w-72 bg-[#0c101f] border-r border-slate-800 text-slate-300 flex-col h-screen sticky top-0 shrink-0 select-none overflow-hidden" id="teacher-desktop-sidebar">
        {renderSidebarContent()}
      </aside>

      {/* 2. Mobile Drawer Navigation */}
      <AnimatePresence>
        {isMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMenuOpen(false)}
              className="fixed inset-0 bg-black z-40 lg:hidden cursor-pointer"
              id="teacher-mobile-sidebar-backdrop"
            />
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 w-72 bg-[#0c101f] z-50 text-slate-300 flex flex-col lg:hidden border-r border-[#1e293b] overflow-hidden"
              id="teacher-mobile-sidebar-drawer"
            >
              {renderSidebarContent(true)}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* 3. Main content frame */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto" id="teacher-main-frame">
        <header className="bg-white border-b border-slate-100 sticky top-0 z-20 shrink-0" id="teacher-top-navbar">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between" id="teacher-top-navbar-content">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setIsMenuOpen(true)}
                className="p-2 lg:hidden bg-slate-50 hover:bg-slate-100 border border-slate-200/60 rounded-xl text-slate-600 transition-colors cursor-pointer mr-1"
                id="teacher-mobile-toggle-btn"
                aria-label="Toggle menu"
              >
                <Menu className="w-5 h-5" />
              </button>
              
              <div className="flex items-center gap-2">
                <span className="p-1 px-2.5 bg-indigo-50 text-indigo-700 font-extrabold text-[9px] rounded-lg tracking-wider uppercase border border-indigo-100 hidden sm:inline-block">
                  Portal-ka Macallinka
                </span>
                <span className="text-slate-400 text-xs font-bold hidden sm:inline-block">•</span>
                <h2 className="text-xs sm:text-base font-extrabold text-slate-800 tracking-tight truncate max-w-[170px] sm:max-w-none">
                  {activeWorkspace === 'attendance' 
                    ? 'Joogitaanka & Horumarka' 
                    : activeWorkspace === 'exams' 
                    ? 'Qiimaynta Toddobaadlaha' 
                    : activeWorkspace === 'studentHistory' 
                    ? 'Taariikhda Ardayda' 
                    : 'Imaanshaha Macallinka'}
                </h2>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="w-8 h-8 rounded-xl bg-slate-55 mb-0.5 text-[#1e5ee6] font-extrabold text-xs flex items-center justify-center select-none border border-slate-100 hidden sm:flex">
                {teacher.name.trim() ? teacher.name.trim().charAt(0).toUpperCase() : 'T'}
              </span>
              <button
                onClick={onLogout}
                className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-600 hover:text-rose-700 rounded-xl transition-all cursor-pointer border border-rose-100/50"
                title="Sign out portal"
                id="teacher-compact-logout-btn"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </header>

        {/* Dynamic Success & Error Overlays */}
        <AnimatePresence>
          {successMsg && (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md">
              <motion.div
                initial={{ scale: 0.85, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.85, opacity: 0 }}
                className="bg-white rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl border border-slate-100 flex flex-col items-center relative overflow-hidden"
                id="success-msg-container"
              >
                <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-emerald-400 via-teal-500 to-emerald-500" />
                
                <div className="relative mb-6">
                  <div className="absolute inset-0 rounded-full bg-emerald-100 animate-ping opacity-25 scale-125" />
                  <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-600 relative z-10 border-4 border-white shadow-md">
                    <Check className="w-10 h-10 stroke-[3px]" />
                  </div>
                </div>

                <h4 className="text-slate-930 font-black text-lg tracking-tight">Submission Successful</h4>
                <p className="text-slate-500 text-xs mt-3 font-semibold leading-relaxed max-w-xs">{successMsg}</p>
                
                <button 
                  onClick={() => setSuccessMsg('')} 
                  className="mt-6 w-full py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-all cursor-pointer shadow-sm active:scale-95 animate-pulse"
                >
                  Dismiss
                </button>
              </motion.div>
            </div>
          )}
          {errorMsg && (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md">
              <motion.div
                initial={{ scale: 0.85, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.85, opacity: 0 }}
                className="bg-white rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl border border-slate-100 flex flex-col items-center relative overflow-hidden"
                id="error-msg-container"
              >
                <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-rose-400 via-red-500 to-rose-500" />
                
                <div className="relative mb-6">
                  <div className="absolute inset-0 rounded-full bg-rose-105 animate-ping opacity-25 scale-125" />
                  <div className="w-20 h-20 bg-rose-50 rounded-full flex items-center justify-center text-rose-600 relative z-10 border-4 border-white shadow-md">
                    <AlertTriangle className="w-10 h-10" />
                  </div>
                </div>

                <h4 className="text-slate-930 font-black text-lg tracking-tight">Sync Alert / Error</h4>
                <p className="text-slate-500 text-xs mt-3 font-semibold leading-relaxed max-w-xs">{errorMsg}</p>
                
                <button 
                  onClick={() => setErrorMsg('')} 
                  className="mt-6 w-full py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-all cursor-pointer shadow-sm active:scale-95"
                >
                  Close & Resolve
                </button>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Dynamic Workspace Switcher Main Panel */}
        <main className="flex-1 p-4 md:p-8" id="teacher-workspace-inner">
          {(!myCheckedInLog && (activeWorkspace === 'attendance' || activeWorkspace === 'exams' || activeWorkspace === 'studentHistory')) ? (
            <div className="bg-white max-w-2xl mx-auto p-12 rounded-3xl border border-slate-150 shadow-md text-center space-y-6 my-12" id="attendance-locked-panel">
              <div className="w-20 h-20 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center mx-auto text-amber-600 animate-pulse">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>

              <div className="space-y-2">
                <h3 className="text-xl font-extrabold text-slate-800">Classroom Ledger is Locked</h3>
                <p className="text-xs text-slate-500 font-medium max-w-md mx-auto leading-relaxed">
                  In order to record daily student attendance, log lesson progress, or register test scores, you must first verify your physical arrival coordinates.
                  Attendance logging is secured and restricted strictly to school premises.
                </p>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col gap-2 text-xs text-left max-w-sm mx-auto font-bold text-slate-600">
                <div className="flex justify-between">
                  <span>Registered Campus Location:</span>
                  <span className="font-mono text-slate-800">{schoolLoc.name}</span>
                </div>
                <div className="flex justify-between">
                  <span>Authorized Geofence Radius:</span>
                  <span className="text-slate-800">{schoolLoc.radiusMeters} meters</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setActiveWorkspace('myAttendance')}
                className="py-3 px-6 bg-[#1e5ee6] hover:bg-blue-700 text-white text-xs font-black uppercase tracking-wider rounded-xl cursor-pointer shadow-md select-none transition-all"
              >
                Go to Daily Entrance Desk
              </button>
            </div>
          ) : activeWorkspace === 'attendance' ? (
          <div className="space-y-6">
            {/* Real-time Subtitle & Save All action bar based on screenshot */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/40 backdrop-blur-md p-6 rounded-3xl border border-slate-100 shadow-sm" id="attendance-header-wrapper">
              <div className="flex items-center gap-3">
                <div>
                  <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight" id="mark-attendance-title">Mark Attendance</h2>
                  <p className="text-xs text-slate-500 font-bold tracking-wide mt-1">
                    {sessionStudents.length} students • {sessionStudents.filter(s => attendanceRecords[s.id] === 'Present').length} present • {sessionStudents.filter(s => attendanceRecords[s.id] === 'Absent').length} absent • {sessionStudents.filter(s => attendanceRecords[s.id] === 'Late').length} late
                  </p>
                </div>
              </div>
              
              <button
                type="button"
                onClick={handleSubmitDailyWork}
                className="py-3 px-6 bg-[#1e5ee6] hover:bg-blue-700 active:bg-blue-800 text-white font-black text-xs sm:text-sm rounded-2xl shadow-lg shadow-blue-600/10 hover:shadow-blue-600/25 flex items-center justify-center gap-2 cursor-pointer transition-all shrink-0 select-none uppercase tracking-widest"
                id="save-all-attendance-btn"
              >
                <Save className="w-4 h-4 sm:w-5 sm:h-5 py-0.5" />
                <span>Save All</span>
              </button>
            </div>

            {/* Date and Session Selection Panel based on screenshot */}
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm grid grid-cols-1 md:grid-cols-2 gap-6" id="attendance-date-session-panel">
              {/* Date Column */}
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
                  Date
                </label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 focus:border-[#1e5ee6] focus:bg-white outline-none text-sm transition-all cursor-pointer"
                  id="picture-date-picker"
                />
              </div>

              {/* Session Column with morning and afternoon dual selector */}
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
                  Session
                </label>
                <div className="grid grid-cols-2 bg-slate-50 p-1.5 rounded-2xl gap-2 border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setCurrentSession('Morning')}
                    className={`py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      currentSession === 'Morning'
                        ? 'bg-amber-100 text-amber-900 border border-amber-200 shadow-sm font-extrabold'
                        : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/50'
                    }`}
                  >
                    <Sun className="w-4 h-4 text-amber-500" />
                    <span>Morning 🌅</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrentSession('Afternoon')}
                    className={`py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      currentSession === 'Afternoon'
                        ? 'bg-sky-100 text-sky-900 border border-sky-200 shadow-sm font-extrabold'
                        : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/50'
                    }`}
                  >
                    <Moon className="w-4 h-4 text-sky-500" />
                    <span>Afternoon 🌙</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Quick set Pills based on screenshot */}
            <div className="flex flex-wrap items-center gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200/50" id="attendance-quick-set-bar">
              <span className="text-xs font-black text-slate-400 uppercase tracking-wider">
                Quick set:
              </span>
              <button
                type="button"
                onClick={() => handleQuickSet('Present')}
                className="px-4 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 text-xs font-bold rounded-xl inline-flex items-center gap-1.5 cursor-pointer transition-all"
              >
                <Check className="w-4 h-4 text-emerald-600" />
                <span>All Present</span>
              </button>
              <button
                type="button"
                onClick={() => handleQuickSet('Absent')}
                className="px-4 py-1.5 bg-rose-50 text-rose-700 hover:bg-rose-105 border border-rose-200 text-xs font-bold rounded-xl inline-flex items-center gap-1.5 cursor-pointer transition-all"
              >
                <X className="w-4 h-4 text-rose-600" />
                <span>All Absent</span>
              </button>
              <button
                type="button"
                onClick={() => handleQuickSet('Late')}
                className="px-4 py-1.5 bg-amber-50 text-amber-700 hover:bg-amber-105 border border-amber-200 text-xs font-bold rounded-xl inline-flex items-center gap-1.5 cursor-pointer transition-all"
              >
                <Clock className="w-4 h-4 text-amber-600" />
                <span>All Late</span>
              </button>
            </div>

            {isAlreadyLoggedToday && (
              <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-3xl flex flex-col sm:flex-row items-center justify-between gap-3 text-emerald-900 shadow-sm animate-fade-in" id="already-logged-banner">
                <div className="flex items-center gap-3">
                  <span className="flex h-3.5 w-3.5 relative shrink-0">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500"></span>
                  </span>
                  <div>
                    <p className="text-xs font-black">Attendance & progress records are already stored in the system for this day.</p>
                    <p className="text-[10px] text-emerald-700 font-bold mt-0.5">You can edit any student values and submit to update the previous version at any time today!</p>
                  </div>
                </div>
                <div className="px-3 py-1.5 bg-emerald-600 text-white rounded-xl text-[9px] font-black uppercase tracking-wider select-none shrink-0 border border-emerald-500">
                  Active Record Loaded
                </div>
              </div>
            )}

            {/* Student Records Submission form */}
            <form onSubmit={handleSubmitDailyWork} className="space-y-6" id="teacher-record-sheets">
              {/* Search bar inside records container */}
              <div className="bg-white p-4 rounded-3xl shadow-sm border border-slate-100 flex flex-col sm:flex-row items-center gap-3">
                <div className="relative flex-1 w-full">
                  <Search className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 w-5 h-5 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Search students in your class by name..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-850 focus:border-[#1e5ee6] focus:bg-white outline-none transition-all placeholder:text-slate-400"
                    id="student-search-input"
                  />
                </div>
                <div className="text-slate-450 text-xs font-bold shrink-0">
                  Showing {filteredStudents.length} of {sessionStudents.length} Active Students
                </div>
              </div>

              {/* Student Cards (High Density Roster Grid) */}
              {filteredStudents.length === 0 ? (
                <div className="bg-white p-12 text-center rounded-3xl border border-dashed border-slate-200" id="no-students-matched">
                  <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                  <h3 className="text-slate-800 font-bold text-base">No active students found</h3>
                  <p className="text-slate-400 text-xs mt-1">If this is a new class, register students via admin catalog.</p>
                </div>
              ) : (
                <div className="space-y-4" id="students-progress-form-cards">
                  {/* Desktop Checklist Table View: Space Efficient, Clean & High density */}
                  <div className="hidden lg:block overflow-x-auto bg-white rounded-3xl border border-slate-100 shadow-sm" id="attendance-desktop-table-container">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50/75 border-b border-slate-155 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
                          <th className="py-3 px-4">Student</th>
                          <th className="py-3 px-4 text-center w-36">Attendance</th>
                          <th className="py-3 px-4 text-center w-64">Lessons & Revision Checks</th>
                          <th className="py-3 px-4 text-center w-32">Dhaqan (Behavior)</th>
                          <th className="py-3 px-4 text-center w-32">Nadaafad (Hygiene)</th>
                          <th className="py-3 px-4 text-center w-48">Surada</th>
                          <th className="py-3 px-4 text-center w-32">Boggee</th>
                          <th className="py-3 px-4 text-center w-32">Intee Bog</th>
                          <th className="py-3 px-4 pl-6">Notes / Observations</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredStudents.map((stu) => {
                          const currentAtt = attendanceRecords[stu.id] || 'Present';
                          const currentLes = lessonRecords[stu.id] || 'Completed';
                          const currentSur = suradRecords[stu.id] || 'N/A';
                          const currentSub = subacRecords[stu.id] || 'Completed';
                          const currentDhaq = dhaqanRecords[stu.id] || 'Good';
                          const currentNad = nadaafadRecords[stu.id] || 'Good';
                          const currentComm = commentsRecords[stu.id] || '';
                          const currentSuuradee = suuradeeMarayaRecords[stu.id] || '';
                          const currentInteeBog = inteeBogRecords[stu.id] || '';
                          const currentBoggee = boggeeRecords[stu.id] || '';

                          const isAbsent = currentAtt === 'Absent';
                          const initialLetter = stu.name.trim() ? stu.name.trim().charAt(0).toUpperCase() : 'S';

                          return (
                            <tr 
                              key={stu.id} 
                              className={`hover:bg-slate-50/20 transition-colors ${isAbsent ? 'bg-slate-50/50' : ''}`}
                            >
                              {/* 1. Profile Cell */}
                              <td className="py-2.5 px-4 font-sans">
                                <div className="flex items-center gap-3">
                                  <span className={`w-7 h-7 rounded-lg font-bold text-[11px] flex items-center justify-center shrink-0 border select-none ${
                                    isAbsent ? 'bg-slate-100 text-slate-400 border-slate-200' : 'bg-indigo-50 text-indigo-600 border-indigo-100 shadow-xs'
                                  }`}>
                                    {initialLetter}
                                  </span>
                                  <div className="min-w-0">
                                    <h4 className={`font-black text-xs truncate leading-snug tracking-tight ${isAbsent ? 'text-slate-400 line-through' : 'text-slate-900'}`}>
                                      {stu.name}
                                    </h4>
                                    <div className="flex items-center gap-1 mt-0.5">
                                      <span className="text-[8px] font-mono font-bold text-slate-400 tracking-wider">
                                        ID: {stu.id.replace('BJ-', '')}
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() => setShowStudentDetailModal(stu)}
                                        className="text-[8px] font-black text-sky-600 bg-sky-50 hover:bg-sky-100 hover:text-sky-700 px-1 py-0.5 rounded border border-sky-100 cursor-pointer transition-all shrink-0 inline-flex items-center gap-0.5"
                                        title="View Student Full Profile Information"
                                      >
                                        Info ℹ️
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setMediaStudentTarget(stu)}
                                        className="text-[8px] font-black text-rose-600 bg-rose-50 hover:bg-rose-100 hover:text-rose-700 px-1 py-0.5 rounded border border-rose-100 cursor-pointer transition-all shrink-0 inline-flex items-center gap-0.5"
                                        title="Student Media: Record voice recitation, video, or capture picture files"
                                      >
                                        Media 🎥
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              </td>

                              {/* 2. Attendance Status Toggles */}
                              <td className="py-2.5 px-4 animate-fade-in">
                                <div className="flex bg-slate-100 p-0.5 rounded-xl border border-slate-200/40 max-w-[260px] mx-auto overflow-hidden">
                                  {(['Present', 'Absent', 'Late'] as AttendanceType[]).map((status) => {
                                    const isActive = currentAtt === status;
                                    const styles = 
                                      status === 'Present' 
                                        ? (isActive ? 'bg-emerald-600 text-white font-extrabold shadow-sm' : 'text-slate-550 hover:text-emerald-700 hover:bg-emerald-50/40')
                                        : status === 'Absent'
                                        ? (isActive ? 'bg-rose-600 text-white font-extrabold shadow-sm' : 'text-slate-555 hover:text-rose-700 hover:bg-rose-50/40')
                                        : (isActive ? 'bg-amber-500 text-white font-extrabold shadow-sm' : 'text-slate-555 hover:text-amber-700 hover:bg-amber-50/40');

                                    return (
                                      <button
                                        key={status}
                                        type="button"
                                        onClick={() => handleFieldChange(stu.id, 'attendance', status)}
                                        className={`flex-1 py-1.5 px-2.5 rounded-lg text-[9px] font-black transition-all cursor-pointer select-none ${styles}`}
                                        title={status === 'Present' ? 'Joogid' : status === 'Absent' ? 'Maqnansho' : 'Daahid'}
                                      >
                                        {status === 'Present' ? 'Joogid' : status === 'Absent' ? 'Maqnansho' : 'Daahid'}
                                      </button>
                                    );
                                  })}
                                </div>
                              </td>

                              {/* 3. Conditional rendering logic */}
                              {isAbsent ? (
                                <>
                                  <td colSpan={5} className="py-2.5 px-4 text-center bg-slate-50/30">
                                    <span className="text-[10px] font-extrabold text-rose-500 tracking-widest uppercase flex items-center justify-center gap-1.5 py-1">
                                      <Moon className="w-3.5 h-3.5 text-rose-450 shrink-0" />
                                      Ardaygu waa maqan yahay • Horumarka waa la hakahay
                                    </span>
                                  </td>
                                  {/* 3d. Note Text (allow notes for absent student) */}
                                  <td className="py-2.5 px-4 pl-6">
                                    <input
                                      type="text"
                                      placeholder="Faallo gaaban / Note..."
                                      value={currentComm}
                                      onChange={(e) => handleFieldChange(stu.id, 'comment', e.target.value)}
                                      className={`w-full px-2.5 py-1.5 rounded-lg text-[10px] sm:text-xs font-semibold outline-none transition-all placeholder:text-slate-400 border ${
                                        currentComm
                                          ? 'bg-amber-50 border-amber-300 text-amber-950 font-bold ring-2 ring-amber-100 shadow-sm'
                                          : 'bg-slate-50 hover:bg-slate-105 border-slate-200 text-slate-700 focus:border-blue-500 focus:bg-white'
                                      }`}
                                    />
                                  </td>
                                </>
                              ) : (
                                <>
                                  {/* 3a. Lessons checklists */}
                                  <td className="py-2.5 px-4 text-center">
                                    <div className="flex items-center justify-center gap-1.5">
                                      {/* Cashar Checklist button */}
                                      <button
                                        type="button"
                                        onClick={() => handleFieldChange(stu.id, 'lesson', currentLes === 'Completed' ? 'Not Completed' : 'Completed')}
                                        className={`px-3 py-1 text-[9px] font-black border rounded-lg flex items-center gap-1 cursor-pointer transition-all ${
                                          currentLes === 'Completed'
                                            ? 'bg-emerald-50 text-emerald-700 border-emerald-100 shadow-xs'
                                            : 'bg-white text-slate-400 border-slate-200 hover:bg-slate-50'
                                        }`}
                                        title="Cashar (Today's Lesson)"
                                      >
                                        <Check className="w-2.5 h-2.5" />
                                        <span>Cashar</span>
                                      </button>

                                      {/* Surad Checklist button */}
                                      <button
                                        type="button"
                                        onClick={() => handleFieldChange(stu.id, 'surad', currentSur === 'Completed' ? 'N/A' : 'Completed')}
                                        className={`px-3 py-1 text-[9px] font-black border rounded-lg flex items-center gap-1 cursor-pointer transition-all ${
                                          currentSur === 'Completed'
                                            ? 'bg-indigo-50 text-indigo-700 border-indigo-100 shadow-xs'
                                            : 'bg-white text-slate-400 border-slate-200 hover:bg-slate-50'
                                        }`}
                                        title="Surad (Target Surah Passed)"
                                      >
                                        <Sparkles className="w-2.5 h-2.5 text-indigo-505" />
                                        <span>Surad</span>
                                      </button>

                                      {/* Sabac Checklist button */}
                                      <button
                                        type="button"
                                        onClick={() => handleFieldChange(stu.id, 'subac', currentSub === 'Completed' ? 'Not Completed' : 'Completed')}
                                        className={`px-3 py-1 text-[9px] font-black border rounded-lg flex items-center gap-1 cursor-pointer transition-all ${
                                          currentSub === 'Completed'
                                            ? 'bg-teal-50 text-teal-700 border-teal-100 shadow-xs'
                                            : 'bg-white text-slate-400 border-slate-200 hover:bg-slate-50'
                                        }`}
                                        title="Sabac (Revision Check)"
                                      >
                                        <CheckCircle2 className="w-2.5 h-2.5 text-teal-500" />
                                        <span>Sabac</span>
                                      </button>
                                    </div>
                                  </td>

                                  {/* 3b. Conduct Column */}
                                  <td className="py-2.5 px-4 text-center">
                                    <div className="relative inline-block w-full max-w-[120px] select-container">
                                      <select
                                        value={currentDhaq}
                                        onChange={(e) => handleFieldChange(stu.id, 'dhaqan', e.target.value as GradeType)}
                                        className={`w-full py-1 px-2 border hover:border-slate-300 rounded-lg text-[9px] font-extrabold outline-none cursor-pointer transition-all appearance-none text-center ${getGradeClasses(currentDhaq)}`}
                                        title="Dhaqan (Behavior/Manners)"
                                      >
                                        <option value="Excellent">🌟 Aad u Fiican</option>
                                        <option value="Good">👍 Fiican</option>
                                        <option value="Average">😐 Dhexdhexaad</option>
                                        <option value="Needs Improvement">⚠️ Baahan Horumar</option>
                                      </select>
                                    </div>
                                  </td>

                                  {/* 3c. Nadaafad Column */}
                                  <td className="py-2.5 px-4 text-center">
                                    <div className="relative inline-block w-full max-w-[120px] select-container">
                                      <select
                                        value={currentNad}
                                        onChange={(e) => handleFieldChange(stu.id, 'nadaafad', e.target.value as GradeType)}
                                        className={`w-full py-1 px-2 border hover:border-slate-300 rounded-lg text-[9px] font-extrabold outline-none cursor-pointer transition-all appearance-none text-center ${
                                          currentNad === 'Excellent' ? 'bg-emerald-50 text-emerald-805 border-emerald-100 border' :
                                          currentNad === 'Good' ? 'bg-blue-50 text-blue-805 border-blue-100 border' :
                                          currentNad === 'Average' ? 'bg-slate-50 text-slate-700 border-slate-200 border' :
                                          'bg-rose-50 text-rose-800 border-rose-100 border'
                                        }`}
                                        title="Nadaafad (Hygiene/Cleanliness)"
                                      >
                                        <option value="Excellent">✨ Aad u Fiican</option>
                                        <option value="Good">👍 Fiican</option>
                                        <option value="Average">😐 Dhexdhexaad</option>
                                        <option value="Needs Improvement">⚠️ Baahan Horumar</option>
                                      </select>
                                    </div>
                                  </td>

                                  {/* 3dd. Suuradda uu Marayo Column */}
                                  <td className="py-2.5 px-4 pl-6">
                                    <input
                                      type="text"
                                      placeholder="Surada..."
                                      value={currentSuuradee}
                                      onChange={(e) => handleFieldChange(stu.id, 'suuradeeMaraya', e.target.value)}
                                      className={`w-full px-2.5 py-1.5 rounded-lg text-[10px] sm:text-xs font-semibold outline-none transition-all placeholder:text-slate-400 border ${
                                        currentSuuradee
                                          ? 'bg-indigo-50 border-indigo-300 text-indigo-950 font-bold ring-2 ring-indigo-100 shadow-sm'
                                          : 'bg-slate-50 hover:bg-slate-105 border-slate-200 text-slate-700 focus:border-blue-500 focus:bg-white'
                                      }`}
                                    />
                                  </td>

                                  {/* Boggee Column */}
                                  <td className="py-2.5 px-4 text-center">
                                    <input
                                      type="text"
                                      placeholder="Boggee..."
                                      value={currentBoggee}
                                      onChange={(e) => handleFieldChange(stu.id, 'boggee', e.target.value)}
                                      className={`w-full px-2.5 py-1.5 rounded-lg text-[10px] sm:text-xs font-semibold outline-none transition-all placeholder:text-slate-400 border text-center ${
                                        currentBoggee
                                          ? 'bg-purple-50 border-purple-300 text-purple-950 font-bold ring-2 ring-purple-100 shadow-sm'
                                          : 'bg-slate-50 hover:bg-slate-105 border-slate-200 text-slate-700 focus:border-purple-500 focus:bg-white'
                                      }`}
                                    />
                                  </td>

                                  {/* Intee Bog Column */}
                                  <td className="py-2.5 px-4 text-center">
                                    <div className="relative inline-block w-full text-center">
                                      <div className="relative flex items-center">
                                        <input
                                          type="text"
                                          placeholder="Intee Bog..."
                                          value={currentInteeBog}
                                          onChange={(e) => handleFieldChange(stu.id, 'inteeBog', e.target.value)}
                                          className={`w-full pl-2 pr-7 py-1.5 rounded-lg text-[10px] sm:text-xs font-semibold outline-none transition-all placeholder:text-slate-400 border text-center ${
                                            currentInteeBog
                                              ? 'bg-violet-50 border-violet-300 text-violet-950 font-bold ring-2 ring-violet-100 shadow-sm'
                                              : 'bg-slate-50 hover:bg-slate-105 border-slate-200 text-slate-700 focus:border-violet-500 focus:bg-white'
                                          }`}
                                        />
                                        <button
                                          type="button"
                                          onClick={() => setOpenInteeBogStudentId(openInteeBogStudentId === stu.id ? null : stu.id)}
                                          className="absolute right-1 text-slate-400 hover:text-slate-600 p-1 rounded-md transition-colors"
                                          title="Choose page count"
                                        >
                                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                          </svg>
                                        </button>
                                      </div>

                                      {openInteeBogStudentId === stu.id && (
                                        <>
                                          <div 
                                            className="fixed inset-0 z-40" 
                                            onClick={() => setOpenInteeBogStudentId(null)} 
                                          />
                                          <div className="absolute left-1/2 -translate-x-1/2 mt-1 w-28 bg-white border border-slate-200 shadow-xl rounded-xl py-1 z-50 text-xs text-left animate-fade-in divide-y divide-slate-100">
                                            {[
                                              { label: '🧹 Empty', value: '' },
                                              { label: '½ Page (Half)', value: 'half' },
                                              { label: '1 Page', value: '1' },
                                              { label: '2 Pages', value: '2' },
                                              { label: '3 Pages', value: '3' },
                                              { label: '4 Pages', value: '4' },
                                            ].map((item) => (
                                              <button
                                                key={item.value}
                                                type="button"
                                                onClick={() => {
                                                  handleFieldChange(stu.id, 'inteeBog', item.value);
                                                  setOpenInteeBogStudentId(null);
                                                }}
                                                className="w-full text-left px-3 py-1.5 hover:bg-violet-50 text-slate-700 hover:text-violet-900 font-medium transition-colors"
                                              >
                                                {item.label}
                                              </button>
                                            ))}
                                          </div>
                                        </>
                                      )}
                                    </div>
                                  </td>

                                  {/* 3d. Note Text */}
                                  <td className="py-2.5 px-4 pl-6">
                                    <input
                                      type="text"
                                      placeholder="Brief note..."
                                      value={currentComm}
                                      onChange={(e) => handleFieldChange(stu.id, 'comment', e.target.value)}
                                      className={`w-full px-2.5 py-1.5 rounded-lg text-[10px] sm:text-xs font-semibold outline-none transition-all placeholder:text-slate-400 border ${
                                        currentComm
                                          ? 'bg-amber-50 border-amber-300 text-amber-950 font-bold ring-2 ring-amber-100 shadow-sm'
                                          : 'bg-slate-50 hover:bg-slate-105 border-slate-200 text-slate-700 focus:border-blue-500 focus:bg-white'
                                      }`}
                                    />
                                  </td>
                                </>
                              )}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Compact Cards View: Highly density cards on small screens */}
                  <div className="block lg:hidden space-y-4" id="attendance-mobile-cards-container">
                    {filteredStudents.map((stu) => {
                      const currentAtt = attendanceRecords[stu.id] || 'Present';
                      const currentLes = lessonRecords[stu.id] || 'Completed';
                      const currentSur = suradRecords[stu.id] || 'N/A';
                      const currentSub = subacRecords[stu.id] || 'Completed';
                      const currentDhaq = dhaqanRecords[stu.id] || 'Good';
                      const currentNad = nadaafadRecords[stu.id] || 'Good';
                      const currentComm = commentsRecords[stu.id] || '';
                      const currentSuuradee = suuradeeMarayaRecords[stu.id] || '';
                      const currentInteeBog = inteeBogRecords[stu.id] || '';
                      const currentBoggee = boggeeRecords[stu.id] || '';

                      const isAbsent = currentAtt === 'Absent';
                      const initialLetter = stu.name.trim() ? stu.name.trim().charAt(0).toUpperCase() : 'S';

                      return (
                        <div 
                          key={stu.id}
                          className={`bg-white rounded-2xl p-4 border shadow-xs space-y-3 transition-all ${
                            isAbsent ? 'border-rose-150 bg-rose-50/10 opacity-90' : 'border-slate-100'
                          }`}
                        >
                          {/* Card Header (Profile & Attendance) */}
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2 border-b border-slate-100/60" id={`student-card-header-${stu.id}`}>
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 font-extrabold text-xs flex items-center justify-center border border-indigo-100 shrink-0 select-none">
                                {initialLetter}
                              </span>
                              <div className="min-w-0">
                                <h4 className={`font-extrabold text-slate-900 text-xs truncate leading-tight ${isAbsent ? 'text-slate-400 line-through' : ''}`}>
                                  {stu.name}
                                </h4>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  <p className="text-[9px] text-slate-400 font-bold">ID: {stu.id.replace('BJ-', '')}</p>
                                  <button
                                    type="button"
                                    onClick={() => setShowStudentDetailModal(stu)}
                                    className="text-[8.5px] font-black text-sky-600 bg-sky-50 hover:bg-sky-100 hover:text-sky-750 px-1 py-0.5 rounded border border-sky-100 cursor-pointer transition-all shrink-0 inline-flex items-center gap-0.5"
                                    title="View Student Full Profile Information"
                                  >
                                    Info ℹ️
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setMediaStudentTarget(stu)}
                                    className="text-[8.5px] font-black text-rose-650 bg-rose-50 hover:bg-rose-100 hover:text-rose-750 px-1 py-0.5 rounded border border-rose-100 cursor-pointer transition-all shrink-0 inline-flex items-center gap-0.5"
                                    title="Student Media: Record voice recitation, video, or capture picture files"
                                  >
                                    Media 🎥
                                  </button>
                                </div>
                              </div>
                            </div>

                            {/* Mobile Attendance Toggle */}
                            <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200/50 overflow-hidden w-full sm:w-auto shrink-0 select-none">
                              {(['Present', 'Absent', 'Late'] as AttendanceType[]).map((status) => {
                                const isActive = currentAtt === status;
                                const styles = 
                                  status === 'Present' 
                                    ? (isActive ? 'bg-emerald-600 text-white font-extrabold shadow-sm' : 'text-slate-550 hover:bg-emerald-50/50')
                                    : status === 'Absent'
                                    ? (isActive ? 'bg-rose-600 text-white font-extrabold shadow-sm' : 'text-slate-555 hover:bg-rose-50/50')
                                    : (isActive ? 'bg-amber-500 text-white font-extrabold shadow-sm' : 'text-slate-555 hover:bg-amber-50/50');

                                return (
                                  <button
                                    key={status}
                                    type="button"
                                    onClick={() => handleFieldChange(stu.id, 'attendance', status)}
                                    className={`flex-1 text-center py-1.5 px-2 rounded font-black text-[9px] transition-all cursor-pointer ${styles}`}
                                  >
                                    {status === 'Present' ? 'Joogid' : status === 'Absent' ? 'Maqnansho' : 'Daahid'}
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          {/* Options if Present or Late */}
                          {isAbsent ? (
                            <div className="space-y-2">
                              <div className="p-3 bg-rose-50/30 text-center rounded-xl border border-rose-100/30 flex items-center justify-center gap-2">
                                <Moon className="w-4 h-4 text-rose-500 shrink-0" />
                                <span className="text-[10px] font-extrabold text-rose-600 tracking-wider uppercase">Ardaygu waa maqan yahay • Horumarka waa la hakahay</span>
                              </div>
                              <input
                                type="text"
                                placeholder="Ku dar faallo ku saabsan ardayga maqan..."
                                value={currentComm}
                                onChange={(e) => handleFieldChange(stu.id, 'comment', e.target.value)}
                                className={`w-full px-3 py-1.5 rounded-lg text-[10px] font-semibold outline-none transition-all placeholder:text-slate-400 border ${
                                  currentComm
                                    ? 'bg-amber-50 border-amber-300 text-amber-950 font-bold ring-2 ring-amber-100 shadow-sm'
                                    : 'bg-slate-50 hover:bg-slate-10 border border-slate-200 focus:border-teal-555 focus:bg-white'
                                  }`}
                              />
                            </div>
                          ) : (
                            <div className="space-y-3">
                              {/* Lessons toggles in mobile card */}
                              <div className="grid grid-cols-3 gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleFieldChange(stu.id, 'lesson', currentLes === 'Completed' ? 'Not Completed' : 'Completed')}
                                  className={`py-2 text-[9px] font-black border rounded-lg text-center cursor-pointer transition-all select-none ${
                                    currentLes === 'Completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-100 shadow-xs' : 'bg-slate-50 text-slate-500 border-slate-205'
                                  }`}
                                >
                                  Cashar {currentLes === 'Completed' ? '✓' : '✗'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleFieldChange(stu.id, 'surad', currentSur === 'Completed' ? 'N/A' : 'Completed')}
                                  className={`py-2 text-[9px] font-black border rounded-lg text-center cursor-pointer transition-all select-none ${
                                    currentSur === 'Completed' ? 'bg-indigo-50 text-indigo-700 border-indigo-100 shadow-xs' : 'bg-slate-50 text-slate-550 border-slate-205'
                                  }`}
                                >
                                  Surad {currentSur === 'Completed' ? '✓' : '—'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleFieldChange(stu.id, 'subac', currentSub === 'Completed' ? 'Not Completed' : 'Completed')}
                                  className={`py-2 text-[9px] font-black border rounded-lg text-center cursor-pointer transition-all select-none ${
                                    currentSub === 'Completed' ? 'bg-teal-50 text-teal-700 border-teal-100 shadow-xs' : 'bg-slate-50 text-slate-500 border-slate-205'
                                  }`}
                                >
                                  Sabac {currentSub === 'Completed' ? '✓' : '✗'}
                                </button>
                              </div>

                              {/* Conduct and Hygiene selects in mobile card */}
                              <div className="grid grid-cols-2 gap-2">
                                <div className="space-y-1">
                                  <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wide block pl-0.5">Dhaqanka (Behavior)</span>
                                  <select
                                    value={currentDhaq}
                                    onChange={(e) => handleFieldChange(stu.id, 'dhaqan', e.target.value as GradeType)}
                                    className={`w-full py-1.5 px-2 text-[10px] font-extrabold border rounded-lg outline-none cursor-pointer transition-all select-none ${getGradeClasses(currentDhaq)}`}
                                  >
                                    <option value="Excellent">🌟 Aad u Fiican</option>
                                    <option value="Good">👍 Fiican</option>
                                    <option value="Average">😐 Dhexdhexaad</option>
                                    <option value="Needs Improvement">⚠️ Baahan Horumar</option>
                                  </select>
                                </div>
                                <div className="space-y-1">
                                  <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wide block pl-0.5">Nadaafadda (Hygiene)</span>
                                  <select
                                    value={currentNad}
                                    onChange={(e) => handleFieldChange(stu.id, 'nadaafad', e.target.value as GradeType)}
                                    className={`w-full py-1.5 px-2 text-[10px] font-extrabold border rounded-lg outline-none cursor-pointer transition-all select-none ${
                                      currentNad === 'Excellent' ? 'bg-teal-50 text-teal-850 border-teal-100 border' :
                                      currentNad === 'Good' ? 'bg-blue-50 text-blue-805 border-blue-100 border' :
                                      currentNad === 'Average' ? 'bg-slate-50 text-slate-700 border-slate-200 border' :
                                      'bg-rose-50 text-rose-800 border-rose-100 border'
                                    }`}
                                  >
                                    <option value="Excellent">✨ Aad u Fiican</option>
                                    <option value="Good">👍 Fiican</option>
                                    <option value="Average">😐 Dhexdhexaad</option>
                                    <option value="Needs Improvement">⚠️ Baahan Horumar</option>
                                  </select>
                                </div>
                              </div>

                              {/* Suuradda uu Marayo & Intee Bog Grid in mobile card */}
                              <div className="grid grid-cols-3 gap-2">
                                <div className="space-y-1">
                                  <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wide block pl-0.5">Surada</span>
                                  <input
                                    type="text"
                                    placeholder="Surada..."
                                    value={currentSuuradee}
                                    onChange={(e) => handleFieldChange(stu.id, 'suuradeeMaraya', e.target.value)}
                                    className={`w-full px-2 py-1.5 rounded-lg text-[10px] font-semibold outline-none transition-all placeholder:text-slate-400 border ${
                                      currentSuuradee
                                        ? 'bg-indigo-50 border-indigo-300 text-indigo-950 font-bold ring-2 ring-indigo-100 shadow-sm'
                                        : 'bg-slate-50 hover:bg-slate-10 border border-slate-200 focus:border-indigo-500 focus:bg-white'
                                    }`}
                                  />
                                </div>
                                <div className="space-y-1">
                                  <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wide block pl-0.5">Boggee</span>
                                  <input
                                    type="text"
                                    placeholder="Boggee..."
                                    value={currentBoggee}
                                    onChange={(e) => handleFieldChange(stu.id, 'boggee', e.target.value)}
                                    className={`w-full px-2 py-1.5 rounded-lg text-[10px] font-semibold outline-none transition-all placeholder:text-slate-400 border text-center ${
                                      currentBoggee
                                        ? 'bg-purple-50 border-purple-300 text-purple-950 font-bold ring-2 ring-purple-100 shadow-sm'
                                        : 'bg-slate-50 hover:bg-slate-10 border border-slate-200 focus:border-purple-500 focus:bg-white'
                                    }`}
                                  />
                                </div>
                                <div className="space-y-1">
                                  <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wide block pl-0.5">Intee Bog</span>
                                  <div className="relative inline-block w-full text-center">
                                    <div className="relative flex items-center">
                                      <input
                                        type="text"
                                        placeholder="Intee Bog..."
                                        value={currentInteeBog}
                                        onChange={(e) => handleFieldChange(stu.id, 'inteeBog', e.target.value)}
                                        className={`w-full pl-1.5 pr-6 py-1.5 rounded-lg text-[10px] font-semibold outline-none transition-all placeholder:text-slate-400 border text-center ${
                                          currentInteeBog
                                            ? 'bg-violet-50 border-violet-300 text-violet-950 font-bold ring-2 ring-violet-100 shadow-sm'
                                            : 'bg-slate-50 hover:bg-slate-10 border border-slate-200 focus:border-violet-500 focus:bg-white'
                                        }`}
                                      />
                                      <button
                                        type="button"
                                        onClick={() => setOpenInteeBogStudentId(openInteeBogStudentId === stu.id ? null : stu.id)}
                                        className="absolute right-0.5 text-slate-400 hover:text-slate-600 p-0.5 rounded-md transition-colors"
                                        title="Choose page count"
                                      >
                                        <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                        </svg>
                                      </button>
                                    </div>

                                    {openInteeBogStudentId === stu.id && (
                                      <>
                                        <div 
                                          className="fixed inset-0 z-40" 
                                          onClick={() => setOpenInteeBogStudentId(null)} 
                                        />
                                        <div className="absolute right-0 mt-1 w-28 bg-white border border-slate-200 shadow-xl rounded-xl py-1 z-50 text-[11px] text-left animate-fade-in divide-y divide-slate-100">
                                          {[
                                            { label: '🧹 Empty', value: '' },
                                            { label: '½ Page (Half)', value: 'half' },
                                            { label: '1 Page', value: '1' },
                                            { label: '2 Pages', value: '2' },
                                            { label: '3 Pages', value: '3' },
                                            { label: '4 Pages', value: '4' },
                                          ].map((item) => (
                                            <button
                                              key={item.value}
                                              type="button"
                                              onClick={() => {
                                                handleFieldChange(stu.id, 'inteeBog', item.value);
                                                setOpenInteeBogStudentId(null);
                                              }}
                                              className="w-full text-left px-3 py-1.5 hover:bg-violet-50 text-slate-700 hover:text-violet-900 font-medium transition-colors"
                                            >
                                              {item.label}
                                            </button>
                                          ))}
                                        </div>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* Notes/Comments in mobile card */}
                              <div className="space-y-1">
                                <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wide block pl-0.5">Notes / Observations</span>
                                <input
                                  type="text"
                                  placeholder="Add custom notes..."
                                  value={currentComm}
                                  onChange={(e) => handleFieldChange(stu.id, 'comment', e.target.value)}
                                  className={`w-full px-3 py-1.5 rounded-lg text-[10px] font-semibold outline-none transition-all placeholder:text-slate-400 border ${
                                    currentComm
                                      ? 'bg-amber-50 border-amber-300 text-amber-950 font-bold ring-2 ring-amber-100 shadow-sm'
                                      : 'bg-slate-50 hover:bg-slate-10 border border-slate-200 focus:border-teal-555 focus:bg-white'
                                  }`}
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Submit Buttons footer */}
                  <div className="pt-4 flex items-center justify-end gap-3" id="teacher-form-footer">
                    <p className="text-xs text-slate-505 font-bold hidden sm:block">
                      {isAlreadyLoggedToday 
                        ? "Record is fully updateable by you at any time today." 
                        : "Submit is locked. Only Admin can update historical records once locked."}
                    </p>
                    <button
                      type="submit"
                      className={`py-4 px-8 font-black rounded-2xl shadow-xl flex items-center gap-2 transition-all duration-300 transform hover:-translate-y-0.5 cursor-pointer text-sm tracking-wide ${
                        isAlreadyLoggedToday
                          ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-emerald-600/10 hover:shadow-emerald-600/25'
                          : 'bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white shadow-teal-600/10 hover:shadow-teal-600/20'
                      }`}
                      id="teacher-submit-final-btn"
                    >
                      <FileCheck2 className="w-5 h-5 font-black" />
                      <span>
                        {isAlreadyLoggedToday 
                          ? `Update Today's Records (${filteredStudents.length} Students)` 
                          : `Submit ${filteredStudents.length} Students Records`}
                      </span>
                    </button>
                  </div>
                </div>
              )}
            </form>
          </div>
        ) : activeWorkspace === 'exams' ? (
          /* --- EXAMS CENTER SECTION --- */
          <div className="space-y-6 animate-fade-in" id="teacher-exams-workspace">
            {/* Top Action Bar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
              <div>
                <h2 className="text-lg font-black text-slate-800 tracking-tight flex items-center gap-2">
                  <FileCheck2 className="w-5 h-5 text-teal-600" />
                  Class Exam Sheets Center
                </h2>
                <p className="text-slate-400 text-xs font-semibold mt-1">
                  Class Room: <span className="text-slate-700 font-bold">{teacher.classAssigned}</span> • Teacher: <span className="text-slate-700 font-bold">{teacher.name}</span>
                </p>
              </div>
              {!isCreatingExam && !isCompilingMonthly && (
                <div className="flex flex-wrap items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      setIsCompilingMonthly(true);
                      setSelectedWeeklyExamIds([]);
                    }}
                    className="py-3 px-5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/10 shrink-0 border-0 outline-none"
                  >
                    <Sparkles className="w-4 h-4" />
                    Sami Qiimaynta Bisha
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsCreatingExam(true)}
                    className="py-3 px-5 bg-teal-600 hover:bg-teal-700 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-teal-600/10 shrink-0 border-0 outline-none"
                  >
                    <Plus className="w-4 h-4" />
                    Qiimayn Cusub
                  </button>
                </div>
              )}
            </div>

            {isCreatingExam ? (
              /* Create/Fill Score Sheet Form */
              <form onSubmit={handleSaveExam} className="space-y-6">
                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-6">
                  <div className="flex items-center justify-between border-b border-slate-150 pb-4">
                    <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                      <Plus className="w-4 h-4 text-teal-600" />
                      Record New Assessment / Exam Score Sheet
                    </h3>
                    <button
                      type="button"
                      onClick={() => {
                        setIsCreatingExam(false);
                        setAssessmentType('weekly');
                        setStudentComments({});
                        setStudentScores({});
                      }}
                      className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold rounded-xl transition-all cursor-pointer"
                    >
                      Cancel Entry
                    </button>
                  </div>

                  {/* Assessment Type Selector */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-1.5 bg-slate-50 rounded-2xl border border-slate-200">
                    <button
                      type="button"
                      onClick={() => setAssessmentType('weekly')}
                      className={`py-3 px-4 rounded-xl text-xs font-extrabold uppercase tracking-wide transition-all ${
                        assessmentType === 'weekly'
                          ? 'bg-teal-600 text-white shadow-md shadow-teal-600/10'
                          : 'text-slate-600 hover:text-slate-800 hover:bg-slate-100'
                      }`}
                    >
                      📅 Weekly Assessment
                    </button>
                    <button
                      type="button"
                      onClick={() => setAssessmentType('custom')}
                      className={`py-3 px-4 rounded-xl text-xs font-extrabold uppercase tracking-wide transition-all ${
                        assessmentType === 'custom'
                          ? 'bg-slate-850 text-white shadow-md'
                          : 'text-slate-600 hover:text-slate-800 hover:bg-slate-100'
                      }`}
                    >
                      📝 Custom (Traditional) Exam
                    </button>
                  </div>

                  <div className="text-[11px] font-bold text-teal-700 bg-teal-50/50 rounded-xl px-4 py-2 border border-teal-100/65">
                    💡 <b>FIIRO rasmiga ah:</b> Waxaad halkan ku diiwaangelin kartaa qiimaynta toddobaadlaha ah (Weekly). Nidaamka ayaa kuu samayn doona celceliska bisha (Monthly) si toos ah oo dynamic ah, adigoon u baahnayn inaad adigu gacanta ku geliso!
                  </div>

                  {/* Mode Specific Inputs */}
                  {assessmentType === 'weekly' && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-emerald-50/30 p-5 rounded-2xl border border-emerald-100">
                      <div>
                        <label className="block text-[10px] font-extrabold text-teal-800 uppercase tracking-widest mb-2">Week Number</label>
                        <select
                          value={weekNumber}
                          onChange={e => setWeekNumber(parseInt(e.target.value, 10))}
                          className="w-full px-4 py-3 bg-white border border-teal-200 rounded-xl text-sm font-bold text-slate-800 focus:border-teal-500 outline-none cursor-pointer"
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
                          onChange={e => setSelectedMonth(e.target.value)}
                          className="w-full px-4 py-3 bg-white border border-teal-200 rounded-xl text-sm font-bold text-slate-800 focus:border-teal-500 outline-none"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-extrabold text-teal-800 uppercase tracking-widest mb-2">Conducting Date</label>
                        <input
                          type="date"
                          value={examDate}
                          onChange={e => setExamDate(e.target.value)}
                          className="w-full px-4 py-3 bg-white border border-teal-200 rounded-xl text-sm font-bold text-slate-800 focus:border-teal-500 outline-none"
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
                          onChange={e => setSelectedMonth(e.target.value)}
                          className="w-full px-4 py-3 bg-white border border-indigo-200 rounded-xl text-sm font-bold text-slate-800 focus:border-indigo-500 outline-none"
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
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:border-indigo-500 focus:bg-white outline-none"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Examining Date</label>
                        <input
                          type="date"
                          value={examDate}
                          onChange={e => setExamDate(e.target.value)}
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:border-indigo-500 focus:bg-white outline-none"
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
                          <span className="text-[9px] text-slate-400 font-extrabold uppercase text-center leading-tight">5. Akhlaaqda & Nadaafada</span>
                          <span className="text-xs font-black text-teal-700 mt-1">Max: 10 dhibcood</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {assessmentType === 'monthly' && (
                    <div className="border border-indigo-100 rounded-2xl p-5 bg-indigo-50/10 space-y-3">
                      <h4 className="text-xs font-extrabold text-indigo-800 uppercase tracking-wider">
                        🏆 Monthly Score Calculation Policy
                      </h4>
                      <p className="text-[11px] text-slate-500 leading-relaxed font-semibold">
                        This scoreboard represents the calculated average from all weekly assessments saved for class <span className="font-bold text-slate-700">"{teacher.classAssigned}"</span> in month <span className="font-bold text-slate-700">"{selectedMonth}"</span>. Manual changes are disabled. Missed weeks are dynamically isolated from calculations. Clicking the final record button writes this evaluated average to historic catalog.
                      </p>
                    </div>
                  )}

                  {/* Subjects Manager Section for Custom mode */}
                  {assessmentType === 'custom' && (
                    <div className="border border-slate-150 rounded-2xl p-5 bg-slate-50/50">
                      <label className="block text-xs font-extrabold text-slate-500 uppercase tracking-widest mb-3">Subjects Inspected</label>
                      <div className="flex flex-wrap gap-2 mb-4">
                        {examSubjects.map(sub => (
                          <span key={sub} className="px-3.5 py-1.5 bg-indigo-50 text-indigo-700 text-xs font-bold rounded-xl border border-indigo-100 inline-flex items-center gap-1.5">
                            {sub}
                            <button
                              type="button"
                              onClick={() => handleRemoveSubject(sub)}
                              className="text-indigo-400 hover:text-indigo-800 font-black focus:outline-none"
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                      <div className="flex gap-2 max-w-sm">
                        <input
                          type="text"
                          placeholder="e.g. Quran Hifz, Tajweed Rules"
                          value={newSubjectInput}
                          onChange={e => setNewSubjectInput(e.target.value)}
                          className="flex-1 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:border-teal-500 outline-none"
                        />
                        <button
                          type="button"
                          onClick={handleAddSubject}
                          className="py-2.5 px-4 bg-slate-900 hover:bg-slate-850 text-white font-bold text-xs rounded-xl cursor-pointer"
                        >
                          Add Subject
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Score list ledger */}
                <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                  <div className="p-6 border-b border-slate-150 bg-slate-50/50">
                    <h4 className="font-extrabold text-slate-800 text-xs uppercase tracking-widest">Class Marks Scoreboard Ledger</h4>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-150 bg-slate-50 text-[10px] font-extrabold text-slate-500 uppercase tracking-widest bg-slate-100/50">
                          <th className="py-4 px-6">Student Full Name</th>
                          {examSubjects.map(sub => {
                            const isWk = assessmentType === 'weekly';
                            const maxVal = isWk ? WEEKLY_MAX_SCORES[sub] : undefined;
                            return (
                              <th key={sub} className="py-4 px-6 min-w-[130px]">
                                <span className="block text-slate-700">{sub}</span>
                                {maxVal !== undefined && (
                                  <span className="text-teal-600 lowercase font-extrabold text-[9px] block">({maxVal} max)</span>
                                )}
                              </th>
                            );
                          })}
                          <th className="py-4 px-6 font-bold text-slate-600">Faallo (Comments)</th>
                          <th className="py-4 px-6 font-bold text-teal-800">
                            {assessmentType === 'weekly' ? 'Weekly Total' : assessmentType === 'monthly' ? 'Monthly Average' : 'Average Score'}
                          </th>
                          <th className="py-4 px-6 font-bold text-indigo-800 text-center">Calculated Grade</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {classStudents.map(s => {
                          const { average, grade } = getStudentMetrics(s.id);
                          return (
                            <tr key={s.id} className="hover:bg-slate-50/50 text-slate-700 transition-colors">
                              <td className="py-4 px-6">
                                <p className="font-bold text-slate-800 text-sm">{s.name}</p>
                                <p className="text-[10px] font-bold text-slate-400 mt-0.5">ID: {s.id}</p>
                              </td>
                              {examSubjects.map(sub => {
                                const isWk = assessmentType === 'weekly';
                                const maxVal = isWk ? (WEEKLY_MAX_SCORES[sub] || 100) : 100;
                                const isMonthly = assessmentType === 'monthly';
                                return (
                                  <td key={sub} className="py-4 px-6">
                                    <div className="flex flex-col items-center gap-1">
                                      <input
                                        type="number"
                                        step="any"
                                        min="0"
                                        max={maxVal}
                                        placeholder="0"
                                        value={studentScores[s.id]?.[sub] || '0'}
                                        onChange={e => handleScoreChange(s.id, sub, e.target.value)}
                                        disabled={isMonthly}
                                        className={`w-28 px-4 py-2 border rounded-xl text-xs font-black outline-none text-center transition-all ${
                                          isMonthly
                                            ? 'bg-indigo-50 border-indigo-200 text-indigo-805 cursor-not-allowed select-none'
                                            : 'bg-slate-50 border-slate-200 focus:border-indigo-500 focus:bg-white text-slate-800'
                                        }`}
                                        required
                                      />
                                      {isWk && WEEKLY_MAX_SCORES[sub] !== undefined && (
                                        <span className="text-[10px] text-slate-400 font-extrabold font-mono">Max: {WEEKLY_MAX_SCORES[sub]}</span>
                                      )}
                                    </div>
                                  </td>
                                );
                              })}
                              <td className="py-4 px-6 min-w-[200px]">
                                <input
                                  type="text"
                                  placeholder="Ku qor faallo halkan (t.s. Subac fiican, nadaafad wanaagsan)..."
                                  value={studentComments[s.id] || ''}
                                  onChange={e => setStudentComments(prev => ({ ...prev, [s.id]: e.target.value }))}
                                  className="w-full min-w-[180px] px-3 py-2 border rounded-xl text-xs bg-slate-50 border-slate-200 focus:border-indigo-500 focus:bg-white text-slate-800 font-medium"
                                />
                              </td>
                              <td className="py-4 px-6 font-extrabold text-slate-900">
                                <span className={`px-2.5 py-1 rounded-lg text-xs font-black ${
                                  assessmentType === 'weekly' ? 'bg-teal-50 text-teal-800 border border-teal-100' : 'bg-slate-100 text-slate-800'
                                }`}>
                                  {average} {assessmentType === 'weekly' ? 'Marks' : '%'}
                                </span>
                              </td>
                              <td className="py-4 px-6 text-center">
                                <span className={`px-3 py-1.5 rounded-xl text-xs font-black inline-block border ${
                                  grade === 'A' ? 'bg-emerald-50 text-emerald-700 border-emerald-250' :
                                  grade === 'B' ? 'bg-teal-50 text-teal-700 border-teal-200' :
                                  grade === 'C' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' :
                                  grade === 'D' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                  'bg-rose-50 text-rose-700 border-rose-200'
                                }`}>
                                  Grade {grade}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <div className="p-6 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => setIsCreatingExam(false)}
                      className="py-3 px-6 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs uppercase tracking-wider rounded-xl cursor-pointer"
                    >
                      Go Back
                    </button>
                    <button
                      type="submit"
                      className="py-3.5 px-8 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs uppercase tracking-widest rounded-xl shadow-lg shadow-teal-600/10 cursor-pointer"
                    >
                      Save & Sync Exam Ledger
                    </button>
                  </div>
                </div>
              </form>
            ) : isCompilingMonthly ? (
              /* Compile Monthly Assessment view */
              <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-6">
                <div className="flex items-center justify-between border-b border-slate-150 pb-4">
                  <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-indigo-600 animate-pulse" />
                    Sami Qiimaynta Bisha (Calculate Monthly Assessment)
                  </h3>
                  <button
                    type="button"
                    onClick={() => {
                      setIsCompilingMonthly(false);
                      setSelectedWeeklyExamIds([]);
                    }}
                    className="py-2 px-4 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold rounded-xl transition-all cursor-pointer border-0 outline-none"
                  >
                    Go Back (Laabo)
                  </button>
                </div>

                {/* Read-only assigned class & Month Selector */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 p-5 rounded-2xl border border-slate-150">
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-widest mb-1 pl-0.5 font-sans">Fasalkaaga & Magacaaga</label>
                    <p className="text-xs font-black text-slate-800 py-1.5 pl-0.5 font-sans">
                      {teacher.classAssigned} — Macallin {teacher.name}
                    </p>
                  </div>

                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-widest mb-2 pl-0.5 font-sans">Dooro Bisha (Select Calendar Month)</label>
                    <input
                      type="month"
                      value={selectedMonth}
                      onChange={e => {
                        setSelectedMonth(e.target.value);
                        setSelectedWeeklyExamIds([]);
                      }}
                      className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                {/* List of Weeks for currently logged-in teacher's assigned class */}
                <div>
                  <h4 className="font-extrabold text-slate-700 text-xs uppercase tracking-wider mb-3 pl-1 font-sans">Dooro Toddobaadyada aad isku celcelinayso (Select Weekly Assessments):</h4>
                  {(() => {
                    const weeklyExams = (database.exams || []).filter(ex => 
                      ex.teacherId === teacher.id && 
                      ex.className === teacher.classAssigned &&
                      ex.assessmentType === 'weekly' &&
                      ex.month === selectedMonth
                    );

                    if (weeklyExams.length === 0) {
                      return (
                        <div className="p-8 text-center bg-slate-50 border border-dashed border-slate-200 rounded-2xl">
                          <BookOpen className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                          <p className="text-xs text-slate-500 font-bold font-sans">Lama helin wax qiimayn toddobaadle ah bishaan ee fasalkaaga. (No weekly assessments found for this month.)</p>
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
                                className="mt-0.5 h-4 w-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 accent-indigo-600 cursor-pointer"
                              />
                              <div className="text-left font-sans">
                                <p className="font-extrabold text-slate-800 text-xs">{ex.heading}</p>
                                <p className="text-[10px] font-bold text-slate-400 mt-1">Taariikhda: {ex.date}</p>
                                <p className="text-[10px] font-semibold text-indigo-605 mt-0.5 font-mono">Ardayda la qiimeeyay: {ex.scores.length}</p>
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
                    className="py-2.5 px-4 bg-slate-105 hover:bg-slate-200 text-slate-650 text-xs font-bold rounded-xl transition-all cursor-pointer border-0 outline-none font-sans"
                  >
                    Baji (Cancel)
                  </button>
                  <button
                    type="button"
                    onClick={handleCompileMonthlyAssessment}
                    disabled={selectedWeeklyExamIds.length === 0}
                    className="py-2.5 px-5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-md shadow-indigo-600/10 border-0 outline-none font-sans"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    Xisaabi Qiimaynta Bisha (Compile & Save)
                  </button>
                </div>
              </div>
            ) : (
              /* Exams History Feed */
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Exam Archives for {teacher.classAssigned}</h3>
                
                {(database.exams || []).filter(ex => ex.className === teacher.classAssigned).length === 0 ? (
                  <div className="bg-white p-12 text-center rounded-3xl border border-dashed border-slate-200">
                    <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                    <h4 className="text-slate-800 font-bold text-sm">No exam records uploaded yet</h4>
                    <p className="text-slate-400 text-xs mt-1">Tap "Record New Exam" above to input and calculate results.</p>
                  </div>
                ) : (
                  (database.exams || [])
                    .filter(ex => ex.className === teacher.classAssigned)
                    .map(ex => {
                      const totalClassAvg = parseFloat((ex.scores.reduce((sum, s) => sum + s.averageScore, 0) / Math.max(ex.scores.length, 1)).toFixed(1));
                      const isExpanded = expandedExamId === ex.id;

                      return (
                        <div key={ex.id} className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden transition-all duration-300">
                          <div className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-extrabold text-teal-700 bg-teal-50 border border-teal-100 px-2 py-0.5 rounded uppercase">Teacher Record</span>
                                <span className="text-xs text-slate-400 font-semibold">{ex.date}</span>
                              </div>
                              <h4 className="font-extrabold text-slate-800 text-base mt-2">{ex.heading}</h4>
                              <p className="text-xs text-slate-400 font-semibold mt-1">Subjects Inspected: <span className="font-bold text-slate-600">{ex.subjects.join(', ')}</span></p>
                            </div>

                            <div className="flex items-center gap-6">
                              <div className="text-right">
                                <p className="text-[10px] font-bold text-slate-400 uppercase">Class Average</p>
                                <p className="text-xl font-black text-teal-600 mt-1">{totalClassAvg}%</p>
                              </div>
                              <div className="text-right">
                                <p className="text-[10px] font-bold text-slate-400 uppercase">Students Graded</p>
                                <p className="text-xl font-black text-slate-800 mt-1">{ex.scores.length}</p>
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => setExpandedExamId(isExpanded ? null : ex.id)}
                                  className="p-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-slate-600 transition-colors cursor-pointer"
                                  title="View Result Sheet"
                                >
                                  {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteExam(ex.id)}
                                  className="p-2.5 bg-rose-50 hover:bg-rose-100 border border-rose-100 rounded-xl text-rose-600 transition-colors cursor-pointer"
                                  title="Delete Record Sheet"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          </div>

                          {/* Collapsible Expand Results Sheet */}
                          <AnimatePresence>
                            {isExpanded && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.3 }}
                                className="border-t border-slate-100 bg-slate-50/50 p-6 overflow-hidden"
                              >
                                <div className="flex items-center justify-between mb-4">
                                  <h5 className="font-bold text-slate-700 text-xs uppercase tracking-widest">Detailed Result Sheet Scoreboard</h5>
                                </div>
                                <div id={`printable-teacher-exam-${ex.id}`} className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
                                  <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse text-xs min-w-[800px]">
                                      <thead>
                                        <tr className="bg-slate-100 font-extrabold text-slate-500 uppercase tracking-widest border-b border-slate-200">
                                          <th className="py-3 px-5">Student Name</th>
                                          {ex.subjects.map(sub => (
                                            <th key={sub} className="py-3 px-5">{sub}</th>
                                          ))}
                                          <th className="py-3 px-5 text-slate-650">Faallo (Comment)</th>
                                          <th className="py-3 px-5 text-teal-800 text-right">Average Score</th>
                                          <th className="py-3 px-5 text-center text-indigo-800">Grade</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                                        {ex.scores.map(sc => (
                                          <tr key={sc.studentId} className="hover:bg-slate-50/30">
                                            <td className="py-3 px-5 font-bold text-slate-900">{sc.studentName}</td>
                                            {ex.subjects.map(sub => (
                                              <td key={sub} className="py-3 px-5">{sc.scores[sub]}%</td>
                                            ))}
                                            <td className="py-3 px-5 text-indigo-900 italic max-w-[280px]">
                                              <div className="overflow-x-auto whitespace-nowrap scrollbar-thin pb-1 max-w-[280px] font-semibold text-xs leading-relaxed" title={sc.comment || 'No comment'}>
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

                                {/* PRINT FRIENDLY CANVAS FOR INDIVIDUAL EXAM */}
                                <div className="hidden">
                                  <div id={`printable-exam-single-${ex.id}`} className="p-8 max-w-4xl mx-auto bg-white text-slate-800 font-sans" style={{ fontFamily: "sans-serif" }}>
                                    <div className="text-center border-b-2 border-dashed border-teal-600 pb-6 mb-6">
                                      <h1 className="text-2xl font-black tracking-tight text-teal-800 uppercase">DUGSIGA SUBUC ISLAMIC CENTER</h1>
                                      <p className="text-[12px] uppercase tracking-widest text-[#008080] font-black mt-1">Graded Student Exam Performance Report Card</p>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4 text-xs mb-6 bg-slate-50 p-4 rounded-xl border border-slate-200">
                                      <div>
                                        <p className="font-semibold text-slate-500">EXAM TITLE / HEAD:</p>
                                        <p className="font-extrabold text-sm text-slate-800 mt-0.5">{ex.heading}</p>
                                        <p className="font-semibold text-slate-500 mt-2">CLASS ASSIGNED:</p>
                                        <p className="font-black text-slate-750 mt-0.5">{ex.className}</p>
                                      </div>
                                      <div className="text-right">
                                        <p className="font-semibold text-slate-500">EXAMINING DATE:</p>
                                        <p className="font-bold text-slate-800 mt-0.5">{ex.date}</p>
                                        <p className="font-semibold text-slate-500 mt-2">EVALUATING SCHOLAR (TEACHER):</p>
                                        <p className="font-bold text-slate-750 mt-0.5">{teacher.name} (ID: {teacher.id})</p>
                                      </div>
                                    </div>

                                    <table className="w-full text-left border-collapse text-xs mb-8">
                                      <thead>
                                        <tr className="bg-slate-100 font-extrabold text-slate-700 uppercase border-b2 border-slate-350 text-[10px]">
                                          <th className="py-2.5 px-3">Student Name</th>
                                          {ex.subjects.map(s => (
                                            <th key={s} className="py-2.5 px-3">{s}</th>
                                          ))}
                                          <th className="py-2.5 px-3 text-right">Average</th>
                                          <th className="py-2.5 px-3 text-center">Grade</th>
                                          <th className="py-2.5 px-3">Ra'yiga Macallinka / Feedback</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-slate-200 font-medium text-slate-700">
                                        {ex.scores.map(sc => (
                                          <tr key={sc.studentId}>
                                            <td className="py-2.5 px-3 font-bold text-slate-900">{sc.studentName} ({sc.studentId})</td>
                                            {ex.subjects.map(s => (
                                              <td key={s} className="py-2.5 px-3">{sc.scores[s] || 0}%</td>
                                            ))}
                                            <td className="py-2.5 px-3 text-right font-black">{sc.averageScore}%</td>
                                            <td className="py-2.5 px-3 text-center">
                                              <span className="px-2 py-0.5 bg-slate-50 border border-slate-250 rounded font-black text-[11px]">{sc.grade}</span>
                                            </td>
                                            <td className="py-2.5 px-3 text-indigo-950 italic text-[11px] max-w-[280px] break-words whitespace-normal font-semibold">
                                              {sc.comment || <span className="text-slate-350">—</span>}
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
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      );
                    })
                )}
              </div>
            )}
          </div>
        ) : activeWorkspace === 'studentHistory' ? (
          /* --- STUDENT HISTORY WORKSPACE SECTION --- */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-fade-in" id="student-history-workspace">
            {/* Left Column: Student selection list */}
            <div className="lg:col-span-4 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col h-[320px] lg:h-[700px]" id="history-sidebar-container">
              <h3 className="text-sm font-black text-slate-800 tracking-tight mb-3 flex items-center gap-2" id="history-sidemenu-title">
                <Users className="w-4 h-4 text-[#1e5ee6]" id="icon-history-users" />
                My Students Catalog
              </h3>
              <p className="text-slate-400 text-xs font-semibold mb-4" id="history-sidebar-subtitle">
                Select a student below to inspect their full academic timeline and progress metrics.
              </p>

              {/* Search Box */}
              <div className="relative mb-4" id="history-search-container">
                <Search className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 w-4 h-4 mt-3 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search student by name or ID..."
                  value={historySearchQuery}
                  onChange={(e) => setHistorySearchQuery(e.target.value)}
                  className="w-full pl-9 pr-8 py-2.5 bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white rounded-xl text-xs font-semibold text-slate-800 outline-none transition-all"
                  id="history-search-input-box"
                />
                {historySearchQuery && (
                  <button
                    type="button"
                    onClick={() => setHistorySearchQuery('')}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none"
                    id="clear-history-search-btn"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Student list */}
              <div className="flex-1 overflow-y-auto space-y-2 pr-1 scrollbar-thin" id="history-scrollbar-student-list">
                {classStudents.filter(s => 
                  s.name.toLowerCase().includes(historySearchQuery.toLowerCase()) || 
                  s.id.toLowerCase().includes(historySearchQuery.toLowerCase())
                ).length === 0 ? (
                  <div className="text-center py-12 text-slate-400 italic text-xs font-semibold" id="no-history-students-found">
                    No matching students found
                  </div>
                ) : (
                  classStudents.filter(s => 
                    s.name.toLowerCase().includes(historySearchQuery.toLowerCase()) || 
                    s.id.toLowerCase().includes(historySearchQuery.toLowerCase())
                  ).map(s => {
                    const isSelected = selectedHistoryStudentId === s.id;
                    const initialLetter = s.name.trim().charAt(0).toUpperCase();
                    const logsCount = database.progress.filter(p => p.studentId === s.id).length;

                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => setSelectedHistoryStudentId(s.id)}
                        className={`w-full text-left p-3 rounded-xl border flex items-center gap-3 transition-all cursor-pointer ${
                          isSelected 
                            ? 'bg-blue-50/70 border-blue-200 shadow-xs' 
                            : 'bg-white border-slate-100 hover:bg-slate-50/60'
                        }`}
                        id={`student-sel-btn-${s.id}`}
                      >
                        <span className={`w-8 h-8 rounded-lg font-bold text-xs flex items-center justify-center shrink-0 border select-none ${
                          isSelected ? 'bg-[#1e5ee6] text-white border-blue-500' : 'bg-slate-50 text-slate-650'
                        }`} id={`initials-${s.id}`}>
                          {initialLetter}
                        </span>
                        <div className="flex-1 min-w-0" id={`student-meta-col-${s.id}`}>
                          <p className={`text-xs font-bold truncate leading-snug ${isSelected ? 'text-blue-700' : 'text-slate-850'}`} id={`std-name-${s.id}`}>
                            {s.name}
                          </p>
                          <p className="text-[10px] font-mono font-semibold text-slate-400 mt-0.5 tracking-wide" id={`std-sublogs-${s.id}`}>
                            ID: {s.id.replace('BJ-', '')} • {logsCount} sessions
                          </p>
                        </div>
                        <ChevronRight className={`w-4 h-4 shrink-0 transition-transform ${isSelected ? 'text-[#1e5ee6] translate-x-0.5' : 'text-slate-300'}`} />
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {/* Right Column: Detailed student history view */}
            <div className="lg:col-span-8 space-y-6" id="history-details-section">
              {!selectedStudent ? (
                <div className="bg-white p-12 text-center rounded-3xl border border-dashed border-slate-200 h-[700px] flex flex-col items-center justify-center" id="no-student-selected-banner">
                  <CalendarRange className="w-14 h-14 text-slate-350 mx-auto mb-4 animate-pulse animate-duration-1000" />
                  <h4 className="text-slate-850 font-black text-base" id="progress-ledger-header">Select Student Progress Ledger</h4>
                  <p className="text-slate-400 text-xs font-semibold mt-1 max-w-sm mx-auto leading-relaxed" id="progress-ledger-subtitle">
                    Choose a student from the left panel catalog list to visualize compliance stats, hifz metrics and full daily progress session logs.
                  </p>
                </div>
              ) : (
                <div className="space-y-6 animate-fade-in" id="history-selected-student-wrapper">
                  {/* Student Profile Overview Card */}
                  <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4" id="history-student-badge-profile">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0" id="hist-detail-initials">
                        <span className="font-extrabold text-[#1e5ee6] text-xl">
                          {selectedStudent.name.trim().charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div id="hist-student-details-meta">
                        <h3 className="font-black text-slate-900 text-lg tracking-tight leading-snug">{selectedStudent.name}</h3>
                        <p className="text-xs text-slate-400 font-semibold mt-0.5">
                          Student ID: <span className="font-bold text-slate-700">{selectedStudent.id}</span> • Classroom: <span className="font-bold text-slate-700">{selectedStudent.className}</span>
                        </p>
                        <p className="text-[11px] text-slate-500 font-medium mt-1">
                          Parent: <span className="font-bold text-slate-705">{selectedStudent.parentName} ({selectedStudent.parentPhone})</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex sm:flex-col items-start sm:items-end gap-2 shrink-0" id="hist-sidebar-actionbars">
                      <span className="text-[10px] font-extrabold px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-lg uppercase tracking-wider" id="active-member-label">
                        Active Member
                      </span>
                      <button
                        type="button"
                        onClick={() => handlePrintElement('printable-area-student-progress')}
                        className="py-1.5 px-3 bg-slate-100 hover:bg-slate-200 border border-slate-200 font-black text-[10.5px] text-slate-705 uppercase rounded-xl flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
                        id="print-ledger-btn"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        Print Scorecard
                      </button>
                    </div>
                  </div>

                  {/* Dynamic Metric Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4" id="student-history-stats-dashboard">
                    <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm" id="widget-total-sessions">
                      <span className="text-[10px] text-slate-400 uppercase font-black tracking-wider block mb-1">Total Sessions</span>
                      <span className="block text-2xl font-black text-slate-850">{totalLogsCount}</span>
                      <span className="text-[9px] font-semibold text-slate-400 mt-1 block">Classroom entries</span>
                    </div>
                    
                    <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm" id="widget-present-days">
                      <span className="text-[10px] text-slate-400 uppercase font-black tracking-wider block mb-1">Present Days</span>
                      <span className="block text-2xl font-black text-emerald-600">{presentLogsCount}</span>
                      <span className="text-[9px] font-semibold text-slate-405 mt-1 block">{lateLogsCount} times logged late</span>
                    </div>

                    <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm" id="widget-compliance-rate">
                      <span className="text-[10px] text-slate-400 uppercase font-black tracking-wider block mb-1">Compliance Rate</span>
                      <span className="block text-2xl font-black text-blue-600">{attendancePercentage}%</span>
                      <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2 overflow-hidden">
                         <div className="bg-blue-600 h-full rounded-full" style={{ width: `${attendancePercentage}%` }}></div>
                      </div>
                    </div>

                    <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm" id="widget-hifz-metrics">
                      <span className="text-[10px] text-slate-400 uppercase font-black tracking-wider block mb-1">Hifz / Progress Checks</span>
                      <div className="space-y-1 mt-1.5 text-[10px] text-slate-600 font-bold" id="checks-list-wrapper">
                        <div className="flex justify-between" id="checks-cashar-row">
                          <span>📖 Cashar:</span>
                          <span className="text-slate-900 font-black">{casharCount}</span>
                        </div>
                        <div className="flex justify-between" id="checks-surad-row">
                          <span>🌟 Surad:</span>
                          <span className="text-indigo-600 font-black">{suradCount}</span>
                        </div>
                        <div className="flex justify-between" id="checks-subac-row">
                          <span>✅ Sabac:</span>
                          <span className="text-teal-600 font-black">{subacCount}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Weekly and Monthly Assessments Reports */}
                  {(() => {
                    const studentWeeklyExams = (database.exams || []).filter(ex => 
                      ex.assessmentType === 'weekly' &&
                      ex.scores.some(sc => sc.studentId === selectedStudent.id)
                    ).sort((a,b) => b.date.localeCompare(a.date));

                    // Get unique months from weekly exams to compute monthly averages dynamically
                    const uniqueMonths = Array.from(new Set(studentWeeklyExams.map(ex => ex.month).filter(Boolean))) as string[];
                    uniqueMonths.sort((a, b) => b.localeCompare(a));

                    const studentMonthlyExams = uniqueMonths.map(m => {
                      const res = calculateStudentMonthlyScore(selectedStudent.id, m);
                      return {
                        id: `computed-monthly-${m}`,
                        month: m,
                        heading: `Celceliska Bisha (${m})`,
                        averageScore: res.average,
                        grade: res.grade,
                        completedWeeks: res.completedWeeks
                      };
                    }).filter(report => report.completedWeeks > 0);

                    const currentComp = getStudentCompetitionGroup(selectedStudent.id, database.exams || []);
                    const currentTrend = getStudentProgressTrend(selectedStudent.id, database.exams || []);

                    return (
                      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden" id="assessments-timeline">
                        <div className="p-6 border-b border-slate-100 bg-slate-50/25" id="assessments-header">
                          <h4 className="font-extrabold text-xs uppercase text-slate-700 tracking-wider flex items-center gap-2">
                            <span>🎓</span> Academic Performance & Assessment History
                          </h4>
                        </div>
                        <div className="p-6 space-y-6">
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
                                  {selectedStudent.className}
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
                                      const sc = ex.scores.find(s => s.studentId === selectedStudent.id);
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
                                        <span className="text-xs font-black text-teal-705 bg-teal-50 px-2 py-0.5 rounded border border-teal-100">
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

                  {/* Daily Classroom Sessions Journal timeline table */}
                  <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden" id="printable-area-student-progress">
                    <div className="p-6 border-b border-slate-100 bg-slate-50/25" id="timeline-journal-header">
                      <h4 className="font-extrabold text-xs uppercase text-slate-600 tracking-wider">Classroom Progress Logbook Timeline Diary</h4>
                    </div>
                    {selectedStudentLogs.length === 0 ? (
                      <div className="text-center py-16" id="empty-student-timeline">
                        <Calendar className="w-12 h-12 text-slate-350 mx-auto mb-3" />
                        <p className="text-xs text-slate-605 font-bold">No registered progress journals yet</p>
                        <p className="text-[11px] text-slate-400 mt-1">Submit attendance & lessons details daily to populate stats records.</p>
                      </div>
                    ) : (
                      <div className="p-6 space-y-4" id="timeline-journals-cards-container">
                        {selectedStudentLogs.map((log, idx) => (
                          <div 
                            key={log.id} 
                            className="bg-slate-50 border border-slate-205 rounded-2xl p-4 shadow-3xs hover:border-indigo-200 transition-all duration-300"
                            id={`timeline-card-${log.id}`}
                          >
                            {/* Card Header displaying Session date, Shift, and Attendance state */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-205 pb-2.5 mb-3.5">
                              <div className="flex items-center gap-2">
                                <span className="text-sm">📅</span>
                                <span className="font-extrabold text-[#111827] text-xs sm:text-sm">{log.date}</span>
                                <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest font-mono">
                                  ({log.session || 'Morning'} Shift)
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest font-mono">Joogitaanka:</span>
                                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${
                                  log.attendance === 'Present' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                                  log.attendance === 'Absent' ? 'bg-rose-50 text-rose-700 border border-rose-100' :
                                  'bg-amber-50 text-amber-700 border border-amber-100'
                                }`}>
                                  {log.attendance === 'Present' ? 'Joogid' : log.attendance === 'Absent' ? 'Maqnansho' : 'Daahid'}
                                </span>
                              </div>
                            </div>

                            {/* Suuraduu Marayo & Intee Bog Badge if present */}
                            {(log.suuradeeMaraya || log.boggee || (log.inteeBog && log.inteeBog !== 'N/A' && log.inteeBog !== '')) && (
                              <div className="mb-3.5 bg-indigo-50/50 border border-indigo-105 rounded-xl p-2.5 px-3.5 text-xs flex items-center justify-between shadow-3xs">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm">📖</span>
                                  <span className="font-extrabold text-slate-800 font-sans">Casharka:</span>
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

                            {/* Matrix Grid */}
                            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                              <div className="bg-white p-2.5 rounded-xl border border-slate-150 flex flex-col justify-center shadow-3xs">
                                <span className="text-[9px] text-slate-400 font-extrabold uppercase tracking-widest font-mono">1. Lesson State</span>
                                <span className="text-xs font-black text-slate-800 mt-1">
                                  {log.lessonCompleted === 'Completed' ? '✅ Kabaxay' : '❌ Kama Bixin'}
                                </span>
                              </div>
                              <div className="bg-white p-2.5 rounded-xl border border-slate-150 flex flex-col justify-center shadow-3xs">
                                <span className="text-[9px] text-slate-400 font-extrabold uppercase tracking-widest font-mono">2. Surad</span>
                                <span className="text-xs font-black text-slate-800 mt-1">
                                  {log.surad === 'Completed' ? '✅ Kabaxay' : log.surad === 'N/A' ? 'may' : '❌ Kama Bixin'}
                                </span>
                              </div>
                              <div className="bg-white p-2.5 rounded-xl border border-slate-150 flex flex-col justify-center shadow-3xs">
                                <span className="text-[9px] text-slate-400 font-extrabold uppercase tracking-widest font-mono">3. Subac</span>
                                <span className="text-xs font-black text-slate-800 mt-1">
                                  {log.subac === 'Completed' ? '✅ Galay' : '❌ Ma Galin'}
                                </span>
                              </div>
                              <div className="bg-white p-2.5 rounded-xl border border-slate-150 flex flex-col justify-center shadow-3xs">
                                <span className="text-[9px] text-slate-400 font-extrabold uppercase tracking-widest font-mono">4. Manners</span>
                                <span className={`text-xs font-black mt-1 ${
                                  log.dhaqan === 'Excellent' ? 'text-emerald-600' : log.dhaqan === 'Good' ? 'text-indigo-600' : 'text-slate-700'
                                }`}>
                                  {log.dhaqan === 'Excellent' ? '✨ Aad u Fiican' : log.dhaqan === 'Good' ? '👍 Fiican' : log.dhaqan === 'Average' ? 'Dhexdhexaad' : log.dhaqan === 'Needs Improvement' ? '⚠️ Baahan' : log.dhaqan}
                                </span>
                              </div>
                              <div className="bg-white p-2.5 rounded-xl border border-slate-150 flex flex-col justify-center shadow-3xs">
                                <span className="text-[9px] text-slate-400 font-extrabold uppercase tracking-widest font-mono">5. Hygiene</span>
                                <span className={`text-xs font-black mt-1 ${
                                  log.nadaafad === 'Excellent' ? 'text-emerald-600' : log.nadaafad === 'Good' ? 'text-indigo-600' : 'text-slate-700'
                                }`}>
                                  {log.nadaafad === 'Excellent' ? '✨ Aad u Fiican' : log.nadaafad === 'Good' ? '👍 Fiican' : log.nadaafad === 'Average' ? 'Dhexdhexaad' : log.nadaafad === 'Needs Improvement' ? '⚠️ Baahan' : log.nadaafad}
                                </span>
                              </div>
                            </div>

                            {/* Full width teacher notes block below the metrics */}
                            {log.faahfaahin ? (
                              <div 
                                onClick={() => setExpandedComments(prev => ({ ...prev, [log.id]: !prev[log.id] }))}
                                className="mt-3.5 bg-amber-50 hover:bg-amber-100/60 text-amber-905 border border-amber-200/70 rounded-xl p-3.5 text-[11px] leading-relaxed flex flex-col cursor-pointer select-none transition-all duration-300 shadow-3xs"
                                title="Guji si aad u ballaariso ama u yarayso / Click to expand or collapse"
                              >
                                <div className="flex items-center gap-1.5 mb-1.5 border-b border-amber-200 pb-1.5">
                                  <span className="text-xs select-none">📝</span>
                                  <span className="text-[10px] text-amber-850 font-black uppercase tracking-widest pl-0.5 font-mono">Xogta Macallinka (Your Notes):</span>
                                </div>
                                <p className={`font-semibold text-slate-800 tracking-wide mt-1 text-xs px-0.5 ${expandedComments[log.id] ? '' : 'line-clamp-2'}`}>
                                  {log.faahfaahin}
                                </p>
                              </div>
                            ) : (
                              <div className="mt-3 text-[10px] text-slate-400 italic bg-white rounded-xl p-3 border border-slate-201/50">
                                No session comments recorded for this class daily meet.
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : false ? (
          /* --- XEERARKA QIIMAYNTA (EVALUATING & GRADING RULES) TAB --- */
          <div className="space-y-8 animate-fade-in text-slate-800" id="teacher-eval-rules">
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
                <div className="p-5 rounded-2xl bg-amber-50/20 border border-amber-105/50 relative overflow-hidden flex flex-col justify-between">
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
                    <span className="px-2 py-0.5 font-black rounded text-[9px] bg-[#eef2ff] text-indigo-850 border border-indigo-100 font-mono mt-0.5 w-[90px] text-center shrink-0">GROUP C</span>
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
        ) : (
          /* --- MY ATTENDANCE/CHECK-IN WORKSPACE SECTION --- */
          <div className="max-w-4xl mx-auto space-y-6 animate-fade-in" id="teacher-self-attendance-workspace">
            {/* Main Arrival Registry Card */}
            <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-150 shadow-sm flex flex-col md:flex-row gap-8 items-center justify-between" id="self-attendance-main-card">
              <div className="flex-1 space-y-4 text-center md:text-left">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-50 border border-indigo-100 rounded-full text-indigo-700 text-[10px] font-extrabold uppercase tracking-wider" id="geofence-radar-badge">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-600"></span>
                  </span>
                  Geofencing Verified Registry
                </div>
                
                <h3 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight leading-none" id="attendance-welcome-title">
                  Daily School Entry Desk
                </h3>
                <p className="text-xs text-slate-500 font-medium max-w-lg leading-relaxed" id="attendance-welcome-desc">
                  Self-attendance registry uses device GPS coordinates to verify physical arrival at <strong className="text-slate-700">{schoolLoc.name}</strong>. Attendance is locked to school premises.
                </p>

                {/* Location Settings & Proximity Box */}
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col gap-2.5 text-xs text-slate-650 font-bold" id="geofencing-coords-comparison">
                  <div className="flex justify-between items-center" id="school-coords-row">
                    <span className="text-slate-400 font-semibold flex items-center gap-1.5"><Target className="w-3.5 h-3.5 text-slate-400" /> Campus Location:</span>
                    <span className="text-slate-700 font-mono text-[11px]">{schoolLoc.latitude.toFixed(5)}, {schoolLoc.longitude.toFixed(5)} ({schoolLoc.radiusMeters}m geofence)</span>
                  </div>
                  <div className="w-full h-px bg-slate-100"></div>
                  <div className="flex justify-between items-center" id="required-check-in-row">
                    <span className="text-slate-400 font-semibold flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-teal-600" /> Expected Arrival:</span>
                    <span className="text-teal-700 font-bold text-[11px] bg-teal-50 px-2 py-0.5 rounded-md border border-teal-100/55">Before {teacher.requiredCheckInTime || '07:30'} AM</span>
                  </div>
                  <div className="w-full h-px bg-slate-100"></div>
                  <div className="flex justify-between items-center" id="teacher-status-row">
                    <span className="text-slate-400 font-semibold flex items-center gap-1.5"><Users className="w-3.5 h-3.5 text-slate-400" /> My ID Code:</span>
                    <span className="text-slate-700 font-mono text-[11px]">{teacher.id} ({teacher.classAssigned})</span>
                  </div>
                </div>
              </div>

              {/* Dynamic Action Panel */}
              <div className="w-full md:w-80 shrink-0 bg-slate-50/60 p-6 rounded-3xl border border-slate-100/80 flex flex-col items-center justify-center text-center space-y-4" id="attendance-action-panel">
                <div className="w-16 h-16 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0" id="att-badge-icon-holder animate-pulse">
                  <Clock className="w-8 h-8 text-[#1e5ee6]" />
                </div>

                <div id="date-time-display-box">
                  <h4 className="text-sm font-black text-slate-800" id="current-local-date-title">{new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</h4>
                  <p className="text-[10px] text-slate-400 font-mono mt-0.5" id="current-time-sub">{todayDateStr} • Garowe Shift</p>
                </div>

                {myCheckedInLog ? (
                  <div className="space-y-2 w-full" id="already-checked-in-state-display">
                    <div className="py-2.5 px-4 bg-emerald-50 text-emerald-800 rounded-xl border border-emerald-100 text-xs font-black flex items-center justify-center gap-2" id="success-checked-badge">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      Arrived & Verified
                    </div>
                    <div className="text-[10px] text-slate-450 font-semibold leading-relaxed" id="attendance-logged-stats">
                      Logged today at <span className="font-bold text-slate-700">{myCheckedInLog.time}</span><br />
                      Calculated campus proximity: <span className="font-bold text-slate-700">{Math.round(myCheckedInLog.distanceFromSchool)}m</span><br />
                      Arrival check-in status: <span className="font-extrabold text-emerald-600 uppercase tracking-wide">{myCheckedInLog.status}</span>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4 w-full" id="unlocked-and-unregistered-state">
                    {schoolLoc.allowSimulation ? (
                      /* Simulator Controls for Sandbox */
                      <div className="p-3 bg-white rounded-2xl border border-slate-200/60 shadow-xs space-y-2 text-left" id="sandbox-debugger-geoloc">
                        <div className="flex items-center justify-between" id="simulate-toggle-row">
                          <span className="text-[10px] font-black text-slate-700 flex items-center gap-1.5">
                            <Compass className="w-3.5 h-3.5 text-slate-450" /> Simulate Geolocation
                          </span>
                          <input
                            type="checkbox"
                            checked={useSimulation}
                            onChange={(e) => setUseSimulation(e.target.checked)}
                            className="w-3.5 h-3.5 accent-[#1e5ee6] cursor-pointer"
                          />
                        </div>
                        
                        {useSimulation && (
                          <div className="space-y-2 mt-2" id="simulation-controls-block">
                            <div className="grid grid-cols-2 gap-1.5" id="simulation-radio-boxes">
                              <button
                                type="button"
                                onClick={() => setSimulatedLocation('school')}
                                className={`py-1.5 px-2 border rounded-lg text-[9px] font-mono font-bold uppercase transition-all ${
                                  simulatedLocation === 'school'
                                    ? 'bg-indigo-50 border-indigo-200 text-indigo-700 font-extrabold'
                                    : 'bg-slate-50 border-slate-100 text-slate-400 hover:bg-slate-100/50'
                                }`}
                              >
                                At Campus
                              </button>
                              <button
                                type="button"
                                onClick={() => setSimulatedLocation('home')}
                                className={`py-1.5 px-2 border rounded-lg text-[9px] font-mono font-bold uppercase transition-all ${
                                  simulatedLocation === 'home'
                                    ? 'bg-rose-50 border-rose-200 text-rose-700 font-extrabold'
                                    : 'bg-slate-50 border-slate-100 text-slate-400 hover:bg-slate-100/50'
                                }`}
                              >
                                At Home
                              </button>
                            </div>

                            <div className="pt-2 border-t border-slate-100/75">
                              <label className="block text-[8px] font-black text-slate-400 uppercase tracking-wider mb-1">
                                Simulating Check-In Time
                              </label>
                              <input
                                type="time"
                                value={simulatedTime}
                                onChange={(e) => setSimulatedTime(e.target.value)}
                                className="w-full px-2.5 py-1 text-[11px] font-semibold text-slate-700 bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white rounded-lg outline-none"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      /* Simulation Off State */
                      <div className="p-3 bg-white border border-slate-150 rounded-2xl text-left" id="geolocation-only-active-notice">
                        <div className="flex items-center gap-1.5 text-[10px] font-black text-slate-700">
                          <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600"></span>
                          </span>
                          Physical GPS Lock Active
                        </div>
                        <p className="text-[10px] text-slate-450 font-bold mt-1.5 leading-relaxed">
                          Simulation testing is disabled by school administration. You must physically stand within the authorized {schoolLoc.radiusMeters}m geofence radius to record attendance check-in.
                        </p>
                      </div>
                    )}

                    <button
                      type="button"
                      disabled={checkInLoading}
                      onClick={handleVerifyAndCheckIn}
                      className="w-full py-3 px-4 bg-[#1e5ee6] hover:bg-blue-700 active:bg-blue-800 text-white font-black text-xs uppercase tracking-wide rounded-2xl shadow-md cursor-pointer select-none transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      id="check-in-verified-btn"
                    >
                      {checkInLoading ? (
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                      ) : (
                        <Navigation className="w-3.5 h-3.5 animate-pulse" />
                      )}
                      {checkInLoading ? 'Verifying Coordinates...' : 'Check In Arrival Now'}
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Error and Success Popups */}
            <AnimatePresence mode="wait">
              {gpsError && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="bg-rose-50 border border-rose-200 p-4 rounded-2xl flex items-start gap-3.5 text-xs text-rose-800 font-bold"
                  id="gps-error-popup-banner"
                >
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h5 className="font-extrabold text-rose-900 uppercase tracking-wide mb-0.5">Geofence Out Of Bounds</h5>
                    <p className="font-semibold leading-relaxed text-rose-700">{gpsError}</p>
                  </div>
                  <button type="button" onClick={() => setGpsError(null)} className="text-rose-500 hover:text-rose-700 select-none">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </motion.div>
              )}

              {checkInSuccess && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="bg-emerald-50 border border-emerald-200 p-4 rounded-2xl flex items-start gap-3.5 text-xs text-emerald-800 font-bold"
                  id="gps-success-popup-banner"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h5 className="font-extrabold text-emerald-950 uppercase tracking-wide mb-0.5">Verified Check-in Success</h5>
                    <p className="font-semibold leading-relaxed text-emerald-700">{checkInSuccess}</p>
                  </div>
                  <button type="button" onClick={() => setCheckInSuccess(null)} className="text-emerald-500 hover:text-emerald-700 select-none">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Previous Teacher Attendance Logs Table */}
            <div className="bg-white rounded-3xl border border-slate-150 shadow-sm overflow-hidden" id="teacher-personal-attendance-history-table">
              <div className="p-5 border-b border-slate-100 bg-slate-50/25 flex justify-between items-center" id="personal-history-header">
                <h4 className="font-black text-xs uppercase text-slate-500 tracking-wider">My Verified Arrival Ledger (Previous shift logins)</h4>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                  Verified counts: {(database.teacherAttendance || []).filter(a => a.teacherId === teacher.id).length} Entries
                </span>
              </div>

              {(database.teacherAttendance || []).filter(a => a.teacherId === teacher.id).length === 0 ? (
                <div className="text-center py-12" id="teacher-empty-att-logs-banner">
                  <Clock className="w-10 h-10 text-slate-300 mx-auto mb-2 animate-pulse" />
                  <p className="text-xs font-bold text-slate-450 leading-relaxed font-sans">No registered arrival records cataloged</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Submit check-in above when you arrive physically on campus to start logs.</p>
                </div>
              ) : (
                <div className="overflow-x-auto" id="personal-history-table-container">
                  <table className="w-full text-left border-collapse text-xs hidden md:table" id="personal-history-table">
                    <thead>
                      <tr className="bg-slate-50 text-slate-400 font-black border-b border-slate-100 uppercase tracking-wider text-[9px]">
                        <th className="py-3 px-6">Attendance Date</th>
                        <th className="py-3 px-6">Clock-in Time</th>
                        <th className="py-3 px-6">Distance deviation</th>
                        <th className="py-3 px-6">Logged GPS coordinates</th>
                        <th className="py-3 px-6 text-center">Arrival Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                      {(database.teacherAttendance || [])
                        .filter(a => a.teacherId === teacher.id)
                        .sort((a,b) => b.date.localeCompare(a.date) || b.time.localeCompare(a.time))
                        .map(log => (
                          <tr key={log.id} className="hover:bg-slate-50/30 transition-colors" id={`teacher-personal-row-${log.id}`}>
                            <td className="py-3 px-6 font-bold text-slate-900">{log.date}</td>
                            <td className="py-3 px-6 font-mono text-slate-600">{log.time}</td>
                            <td className="py-3 px-6 font-mono text-slate-500">
                              {Math.round(log.distanceFromSchool) === 0 ? 'Exact (on logo)' : `${Math.round(log.distanceFromSchool)} meters`}
                            </td>
                            <td className="py-3 px-6 font-mono text-[10px] text-slate-450">
                              {log.latitude.toFixed(5)}, {log.longitude.toFixed(5)}
                            </td>
                            <td className="py-3 px-6 text-center">
                              <span className={`px-2.5 py-0.5 rounded-lg text-[9.5px] font-extrabold border ${
                                log.status === 'Present' 
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                                  : 'bg-amber-50 text-amber-700 border-amber-100'
                              }`}>
                                {log.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>

                  {/* Mobile responsive Cards instead of horizontal scrolling table */}
                  <div className="md:hidden divide-y divide-slate-150" id="personal-history-mobile-list">
                    {(database.teacherAttendance || [])
                      .filter(a => a.teacherId === teacher.id)
                      .sort((a,b) => b.date.localeCompare(a.date) || b.time.localeCompare(a.time))
                      .map(log => (
                        <div key={log.id} className="p-4 space-y-3" id={`teacher-personal-card-${log.id}`}>
                          <div className="flex justify-between items-center">
                            <span className="font-extrabold text-slate-900 text-[13px]">📅 {log.date}</span>
                            <span className={`px-2.5 py-1 rounded-full text-[9.5px] font-black border uppercase tracking-wider ${
                              log.status === 'Present' 
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                                : 'bg-amber-50 text-amber-700 border-amber-100'
                            }`}>
                              {log.status === 'Present' ? 'Present' : 'Late'}
                            </span>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                            <div>
                              <span className="text-[9px] text-slate-400 font-extrabold uppercase tracking-wide block">Arrival Time</span>
                              <span className="font-bold text-slate-800 font-mono text-xs">{log.time}</span>
                            </div>
                            <div>
                              <span className="text-[9px] text-slate-400 font-extrabold uppercase tracking-wide block">Hubka Masaafada</span>
                              <span className="font-bold text-slate-800 font-mono text-xs">
                                {Math.round(log.distanceFromSchool) === 0 ? 'Exact' : `${Math.round(log.distanceFromSchool)}m`}
                              </span>
                            </div>
                          </div>

                          <div className="text-[10px] text-slate-450 font-mono flex items-center gap-1.5 pt-0.5">
                            <span>📍 Co-ords:</span>
                            <span className="font-bold">{log.latitude.toFixed(5)}, {log.longitude.toFixed(5)}</span>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Reusable Custom Confirmation Modal to bypass iframe window.confirm block */}
      {confirmModal && confirmModal.isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in" id="teacher-custom-confirm-modal">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            className="w-full max-w-sm bg-white rounded-3xl border border-slate-150 shadow-2xl overflow-hidden text-slate-800"
          >
            {/* Modal colored header bar */}
            <div className={`h-1.5 w-full ${
              confirmModal.accentColor === 'rose' ? 'bg-rose-500' :
              confirmModal.accentColor === 'amber' ? 'bg-amber-500' :
              confirmModal.accentColor === 'teal' ? 'bg-teal-500' :
              'bg-indigo-600'
            }`} />

            <div className="p-5">
              <div className="flex items-start gap-3.5">
                <div className={`p-2 rounded-xl shrink-0 ${
                  confirmModal.accentColor === 'rose' ? 'bg-rose-50 text-rose-600 border border-rose-100' :
                  confirmModal.accentColor === 'amber' ? 'bg-amber-50 text-amber-600 border border-amber-100' :
                  confirmModal.accentColor === 'teal' ? 'bg-teal-50 text-teal-600 border border-teal-100' :
                  'bg-indigo-50 text-indigo-600 border border-indigo-100'
                }`}>
                  <span className="text-xs font-black leading-none flex items-center justify-center w-5 h-5">
                    {confirmModal.accentColor === 'rose' ? '🗑️' : confirmModal.accentColor === 'amber' ? '⚠️' : '❓'}
                  </span>
                </div>
                
                <div className="space-y-1 flex-1">
                  <h4 className="text-slate-900 font-extrabold text-xs sm:text-sm leading-snug">
                    {confirmModal.title}
                  </h4>
                  <p className="text-slate-500 text-[10.5px] leading-relaxed font-semibold">
                    {confirmModal.message}
                  </p>
                </div>
              </div>

              {/* Actions Area */}
              <div className="flex items-center justify-end gap-2 mt-5 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setConfirmModal(null)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-150 text-slate-700 font-bold text-[9.5px] tracking-wider uppercase rounded-xl cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmModal.onConfirm}
                  className={`px-3.5 py-1.5 text-white font-extrabold text-[9.5px] tracking-wider uppercase rounded-xl cursor-pointer transition-all shadow-md ${
                    confirmModal.accentColor === 'rose' ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/10' :
                    confirmModal.accentColor === 'amber' ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/10' :
                    confirmModal.accentColor === 'teal' ? 'bg-teal-600 hover:bg-teal-700 shadow-teal-600/10' :
                    'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/15'
                  }`}
                >
                  Confirm & Action
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

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
                        const compGroup = getStudentCompetitionGroup(showStudentDetailModal.id, database.exams || []);
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
                        const trend = getStudentProgressTrend(showStudentDetailModal.id, database.exams || []);
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
                    <span className="text-slate-455 block font-bold text-[10px] uppercase">Tuition Fee Due / Lacagta Bisha</span>
                    <span className="text-teal-700 font-black text-lg block mt-0.5">${showStudentDetailModal.monthlyFee} USD</span>
                  </div>
                  <div className="p-3 bg-white border border-slate-200/60 rounded-xl">
                    <span className="text-slate-455 block font-bold text-[10px] uppercase">Bus Fare Due / Lacagta Baska</span>
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

    </div>
  </div>
  );
}
