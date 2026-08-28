import React, { useState, useMemo } from 'react';
import { DatabaseState, Student, Teacher, Exam, ExamScore } from '../types';
import { 
  Award, 
  Calendar, 
  CheckCircle2, 
  Download, 
  Edit3, 
  FileText, 
  Filter, 
  GraduationCap, 
  Plus, 
  Printer, 
  Search, 
  Trash2, 
  UserCheck, 
  Users, 
  X,
  Sparkles,
  BookOpen,
  ChevronDown,
  ChevronUp,
  BarChart3,
  Layers,
  ArrowUpDown,
  FileSpreadsheet
} from 'lucide-react';
import jsPDF from 'jspdf';

interface WeeklyAssessmentTabProps {
  database: DatabaseState;
  onSaveDatabase: (updatedDb: DatabaseState) => void;
  currentTeacher?: Teacher; // When opened from TeacherDashboard
}

export function WeeklyAssessmentTab({ database, onSaveDatabase, currentTeacher }: WeeklyAssessmentTabProps) {
  // Helper: Find closest Thursday date (or current date)
  const getDefaultThursdayDate = () => {
    const d = new Date();
    const day = d.getDay(); // 0 = Sunday, 4 = Thursday
    const diff = (4 - day + 7) % 7; // days until next/current Thursday
    const thursday = new Date(d);
    thursday.setDate(d.getDate() + (day === 4 ? 0 : diff === 0 ? 0 : (day > 4 ? -(day - 4) : diff)));
    const year = thursday.getFullYear();
    const month = String(thursday.getMonth() + 1).padStart(2, '0');
    const dayOfMonth = String(thursday.getDate()).padStart(2, '0');
    return `${year}-${month}-${dayOfMonth}`;
  };

  const todayStr = useMemo(() => {
    const d = new Date();
    return d.toISOString().split('T')[0];
  }, []);

  // UI Modes: 'list' (History of Weekly Exams) | 'create' (New Weekly Exam) | 'edit' | 'print'
  const [viewMode, setViewMode] = useState<'list' | 'create' | 'edit'>('list');
  const [selectedExamForPrint, setSelectedExamForPrint] = useState<Exam | null>(null);

  // Filter States for Exam History
  const [filterClass, setFilterClass] = useState<string>('All');
  const [filterTeacher, setFilterTeacher] = useState<string>(currentTeacher?.id || 'All');
  const [filterSearch, setFilterSearch] = useState<string>('');
  const [filterStartDate, setFilterStartDate] = useState<string>('');
  const [filterEndDate, setFilterEndDate] = useState<string>('');

  // Form State for Creating / Editing a Weekly Exam
  const [editingExamId, setEditingExamId] = useState<string | null>(null);
  const [examHeading, setExamHeading] = useState<string>('Imtixaanka Toddobaadka (End of Week Exam)');
  const [examDate, setExamDate] = useState<string>(getDefaultThursdayDate());
  const [selectedClass, setSelectedClass] = useState<string>('All');
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>(currentTeacher?.id || (database.teachers[0]?.id || ''));
  const [weekNumber, setWeekNumber] = useState<number>(() => {
    const currentDay = new Date().getDate();
    return Math.min(Math.max(Math.ceil(currentDay / 7), 1), 5);
  });
  const [examNotes, setExamNotes] = useState<string>('');

  // Dynamic Headings / Subjects for this Weekly Assessment
  const [headings, setHeadings] = useState<string[]>([
    "Qur'aan (Akhris & Xifdi)",
    "Tajweed & Qawaacid",
    "Fahamka & Luuqadda",
    "Anshaxa & Nadaafadda"
  ]);
  const [newHeadingInput, setNewHeadingInput] = useState<string>('');

  // Student list in current exam: mapping of studentId -> ExamScore
  const [examScores, setExamScores] = useState<ExamScore[]>([]);

  // Feedback Notification
  const [feedback, setFeedback] = useState<string>('');
  const triggerFeedback = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(''), 4000);
  };

  // Confirmation Modal
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    accentColor?: 'rose' | 'indigo' | 'amber' | 'emerald';
    onConfirm: () => void;
  } | null>(null);

  // Student selection modal (to add extra students to the test)
  const [isAddStudentModalOpen, setIsAddStudentModalOpen] = useState(false);
  const [studentSearchQuery, setStudentSearchQuery] = useState('');

  // List of unique classes in school
  const uniqueClasses = useMemo(() => {
    const classes = Array.from(new Set(database.students.map(s => s.className))).filter(Boolean);
    return classes.length > 0 ? classes : ["Al-Baqarah", "Juz Camma", "Higgaadda"];
  }, [database.students]);

  // Teachers lookup map
  const teachersMap = useMemo(() => {
    const map = new Map<string, Teacher>();
    database.teachers.forEach(t => map.set(t.id, t));
    return map;
  }, [database.teachers]);

  // Students lookup map
  const studentsMap = useMemo(() => {
    const map = new Map<string, Student>();
    database.students.forEach(s => map.set(s.id, s));
    return map;
  }, [database.students]);

  // Exams sorted by date descending
  const examsList = useMemo(() => {
    const all = database.exams || [];
    return all.filter(ex => {
      // Show weekly exams
      const matchClass = filterClass === 'All' ? true : ex.className === filterClass;
      const matchTeacher = filterTeacher === 'All' ? true : ex.teacherId === filterTeacher;
      const matchStart = filterStartDate ? ex.date >= filterStartDate : true;
      const matchEnd = filterEndDate ? ex.date <= filterEndDate : true;
      const search = filterSearch.toLowerCase().trim();
      const matchSearch = !search || 
        ex.heading.toLowerCase().includes(search) || 
        ex.className.toLowerCase().includes(search) ||
        ex.teacherName.toLowerCase().includes(search) ||
        ex.scores.some(sc => sc.studentName.toLowerCase().includes(search));

      return matchClass && matchTeacher && matchStart && matchEnd && matchSearch;
    }).sort((a, b) => b.date.localeCompare(a.date));
  }, [database.exams, filterClass, filterTeacher, filterStartDate, filterEndDate, filterSearch]);

  // Initialize/Populate Student Scores when Class or Teacher is chosen for a new exam
  const handleInitializeStudentsForExam = (targetClass: string, targetTeacherId: string) => {
    let pool = database.students.filter(s => s.active);

    if (targetClass !== 'All') {
      pool = pool.filter(s => s.className === targetClass);
    }
    if (targetTeacherId !== 'All' && targetTeacherId) {
      pool = pool.filter(s => s.teacherId === targetTeacherId || s.secondTeacherId === targetTeacherId);
    }

    const initialScores: ExamScore[] = pool.map(s => {
      // Find latest daily progress for this student to pre-fill their current level
      const studentProgress = (database.progress || []).filter(p => p.studentId === s.id);
      const latestProg = studentProgress.sort((a, b) => b.date.localeCompare(a.date))[0];
      
      let levelGuess = s.className || "Higgaad";
      if (latestProg?.suuradeeMaraya) {
        levelGuess = `${latestProg.suuradeeMaraya}${latestProg.boggee ? ` (Bogga ${latestProg.boggee})` : ''}`;
      }

      const defaultSubjectScores: Record<string, number> = {};
      const defaultHeadingContents: Record<string, string> = {};
      headings.forEach(h => {
        defaultSubjectScores[h] = 85; // Default score
        defaultHeadingContents[h] = '';
      });

      return {
        studentId: s.id,
        studentName: s.name,
        registrationDate: s.registrationDate || todayStr,
        currentLevel: levelGuess,
        scores: defaultSubjectScores,
        headingContents: defaultHeadingContents,
        averageScore: 85,
        grade: 'B',
        comment: 'Dadaal wanaagsan'
      };
    });

    setExamScores(initialScores);
  };

  // Open Create Exam Mode
  const startCreateExam = () => {
    setEditingExamId(null);
    setExamHeading('Imtixaanka Toddobaadka (End of Week Exam)');
    setExamDate(getDefaultThursdayDate());
    setSelectedClass('All');
    setSelectedTeacherId(currentTeacher?.id || (database.teachers[0]?.id || 'All'));
    setExamNotes('');
    
    const defaultHeadings = [
      "Qur'aan (Akhris & Xifdi)",
      "Tajweed & Qawaacid",
      "Fahamka & Luuqadda",
      "Anshaxa & Nadaafadda"
    ];
    setHeadings(defaultHeadings);
    
    // Populate students
    handleInitializeStudentsForExam('All', currentTeacher?.id || (database.teachers[0]?.id || 'All'));
    setViewMode('create');
  };

  // Open Edit Exam Mode
  const startEditExam = (exam: Exam) => {
    setEditingExamId(exam.id);
    setExamHeading(exam.heading);
    setExamDate(exam.date);
    setSelectedClass(exam.className);
    setSelectedTeacherId(exam.teacherId);
    setWeekNumber(exam.weekNumber || 1);
    setExamNotes(exam.notes || '');
    setHeadings(exam.subjects && exam.subjects.length > 0 ? exam.subjects : [
      "Qur'aan (Akhris & Xifdi)",
      "Tajweed & Qawaacid"
    ]);

    // Ensure all scores have registrationDate and currentLevel mapped if missing
    const enrichedScores = (exam.scores || []).map(sc => {
      const st = studentsMap.get(sc.studentId);
      return {
        ...sc,
        registrationDate: sc.registrationDate || st?.registrationDate || todayStr,
        currentLevel: sc.currentLevel || st?.className || 'Qur\'aan',
        scores: sc.scores || {},
        headingContents: sc.headingContents || {},
        averageScore: sc.averageScore || 0,
        grade: sc.grade || 'B',
        comment: sc.comment || ''
      };
    });

    setExamScores(enrichedScores);
    setViewMode('edit');
  };

  // Grade calculation helper
  const calculateGrade = (avg: number): 'A' | 'B' | 'C' | 'D' | 'F' => {
    if (avg >= 90) return 'A';
    if (avg >= 80) return 'B';
    if (avg >= 70) return 'C';
    if (avg >= 60) return 'D';
    return 'F';
  };

  const getSomaliGradeLabel = (grade: string) => {
    switch (grade) {
      case 'A': return 'A (Mumtaaz / 90-100)';
      case 'B': return 'B (Aad u Fiican / 80-89)';
      case 'C': return 'C (Fiican / 70-79)';
      case 'D': return 'D (Dhexdhexaad / 60-69)';
      default: return 'F (Liita / <60)';
    }
  };

  // Update specific student score
  const handleUpdateScore = (studentId: string, heading: string, value: number) => {
    setExamScores(prev => prev.map(sc => {
      if (sc.studentId !== studentId) return sc;

      const newScores = { ...sc.scores, [heading]: Math.min(Math.max(Number(value) || 0, 0), 100) };
      const values: number[] = Object.values(newScores);
      const avg = values.length > 0 ? Math.round(values.reduce((a: number, b: number) => a + b, 0) / values.length) : 0;
      const grade = calculateGrade(avg);

      return {
        ...sc,
        scores: newScores,
        averageScore: avg,
        grade
      };
    }));
  };

  // Update specific student heading content/notes
  const handleUpdateHeadingContent = (studentId: string, heading: string, text: string) => {
    setExamScores(prev => prev.map(sc => {
      if (sc.studentId !== studentId) return sc;
      return {
        ...sc,
        headingContents: {
          ...(sc.headingContents || {}),
          [heading]: text
        }
      };
    }));
  };

  // Update student level for this week
  const handleUpdateStudentLevel = (studentId: string, levelText: string) => {
    setExamScores(prev => prev.map(sc => {
      if (sc.studentId !== studentId) return sc;
      return {
        ...sc,
        currentLevel: levelText
      };
    }));
  };

  // Update student general comment
  const handleUpdateStudentComment = (studentId: string, commentText: string) => {
    setExamScores(prev => prev.map(sc => {
      if (sc.studentId !== studentId) return sc;
      return {
        ...sc,
        comment: commentText
      };
    }));
  };

  // Remove a student from this exam sheet (e.g. absent on Thursday)
  const handleRemoveStudentFromExam = (studentId: string) => {
    setExamScores(prev => prev.filter(sc => sc.studentId !== studentId));
    triggerFeedback('Ardayga waa laga saaray warqadda imtixaanka toddobaadkan.');
  };

  // Add extra student to current exam sheet
  const handleAddStudentToExam = (student: Student) => {
    if (examScores.some(sc => sc.studentId === student.id)) {
      triggerFeedback('Ardaygani mar hore ayuu ku jiray liiska.');
      return;
    }

    const defaultSubjectScores: Record<string, number> = {};
    const defaultHeadingContents: Record<string, string> = {};
    headings.forEach(h => {
      defaultSubjectScores[h] = 85;
      defaultHeadingContents[h] = '';
    });

    const newScore: ExamScore = {
      studentId: student.id,
      studentName: student.name,
      registrationDate: student.registrationDate || todayStr,
      currentLevel: student.className || 'Qur\'aan',
      scores: defaultSubjectScores,
      headingContents: defaultHeadingContents,
      averageScore: 85,
      grade: 'B',
      comment: 'Dadaal wanaagsan'
    };

    setExamScores(prev => [...prev, newScore]);
    setIsAddStudentModalOpen(false);
    triggerFeedback(`${student.name} waa lagu daray liiska imtixaanka.`);
  };

  // Add custom heading / subject
  const handleAddHeading = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newHeadingInput.trim();
    if (!clean) return;
    if (headings.includes(clean)) {
      triggerFeedback('Cinwaankani mar hore ayuu jiray.');
      return;
    }

    setHeadings(prev => [...prev, clean]);
    // Initialize this new heading in all current student scores
    setExamScores(prev => prev.map(sc => ({
      ...sc,
      scores: { ...sc.scores, [clean]: 85 },
      headingContents: { ...(sc.headingContents || {}), [clean]: '' }
    })));
    setNewHeadingInput('');
    triggerFeedback(`Cinwaanka "${clean}" waa lagu daray.`);
  };

  // Remove a heading
  const handleRemoveHeading = (headingName: string) => {
    if (headings.length <= 1) {
      triggerFeedback('Ugu yaraan hal cinwaan waa inuu ku jiraa imtixaanka.');
      return;
    }
    setHeadings(prev => prev.filter(h => h !== headingName));
    setExamScores(prev => prev.map(sc => {
      const updatedScores = { ...sc.scores };
      delete updatedScores[headingName];
      const updatedContents = { ...(sc.headingContents || {}) };
      delete updatedContents[headingName];
      const values: number[] = Object.values(updatedScores);
      const avg = values.length > 0 ? Math.round(values.reduce((a: number, b: number) => a + b, 0) / values.length) : 0;
      return {
        ...sc,
        scores: updatedScores,
        headingContents: updatedContents,
        averageScore: avg,
        grade: calculateGrade(avg)
      };
    }));
  };

  // Save Exam (Create or Update)
  const handleSaveExam = (e: React.FormEvent) => {
    e.preventDefault();
    if (examScores.length === 0) {
      triggerFeedback('Waa inaad arday ugu yaraan hal arday ku darto imtixaanka.');
      return;
    }

    const teacherObj = teachersMap.get(selectedTeacherId);
    const teacherName = teacherObj?.name || 'Maamulka Dugsiga';
    const month = examDate.substring(0, 7);

    const examId = editingExamId || `EX-WEEKLY-${Date.now()}`;
    const newExam: Exam = {
      id: examId,
      heading: examHeading.trim() || 'Imtixaanka Toddobaadka (End of Week Exam)',
      date: examDate,
      className: selectedClass,
      teacherId: selectedTeacherId,
      teacherName: teacherName,
      subjects: headings,
      scores: examScores,
      assessmentType: 'weekly',
      weekNumber: weekNumber,
      month: month,
      notes: examNotes
    };

    let updatedExams: Exam[] = [];
    if (editingExamId) {
      updatedExams = (database.exams || []).map(ex => ex.id === editingExamId ? newExam : ex);
    } else {
      updatedExams = [newExam, ...(database.exams || [])];
    }

    onSaveDatabase({
      ...database,
      exams: updatedExams
    });

    triggerFeedback(`Natiijada Imtixaanka Toddobaadka ee (${examDate}) si guul leh ayaa loo kaydiyay!`);
    setViewMode('list');
  };

  // Delete Exam Record
  const handleDeleteExam = (examId: string) => {
    const ex = (database.exams || []).find(e => e.id === examId);
    setConfirmModal({
      isOpen: true,
      title: 'Ma tirtiraysaa Diiwaanka Imtixaankan?',
      message: `Ma hubtaa inaad gabi ahaanba tirtirto imtixaankii "${ex?.heading || 'Weekly Exam'}" ee taariikhdu ahayd ${ex?.date}? Ficilkan dib looma soo celin karo.`,
      accentColor: 'rose',
      onConfirm: () => {
        const updatedExams = (database.exams || []).filter(e => e.id !== examId);
        onSaveDatabase({
          ...database,
          exams: updatedExams
        });
        setConfirmModal(null);
        triggerFeedback('Diiwaanka imtixaanka waa la tirtiray.');
      }
    });
  };

  // Export & Download PDF Report
  const handleDownloadPDF = (exam: Exam) => {
    try {
      const doc = new jsPDF('p', 'mm', 'a4');
      const pageWidth = doc.internal.pageSize.getWidth();

      // Header Banner
      doc.setFillColor(15, 23, 42); // slate-900
      doc.rect(0, 0, pageWidth, 28, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.text('DUGSIGA SUBUC & QUR\'AANKA KARIIMKA AH', pageWidth / 2, 11, { align: 'center' });
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text('WARBIXINTA IMTIXAANKA TODDOBAADLAHA AH (WEEKLY ASSESSMENT REPORT)', pageWidth / 2, 18, { align: 'center' });

      // Metadata Box
      doc.setTextColor(30, 41, 59);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      
      let y = 36;
      doc.setDrawColor(226, 232, 240);
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(14, y - 4, pageWidth - 28, 22, 2, 2, 'FD');

      doc.text(`Imtixaanka: ${exam.heading}`, 18, y + 2);
      doc.text(`Fasalka: ${exam.className}`, 18, y + 8);
      doc.text(`Macalinka: ${exam.teacherName}`, 18, y + 14);

      doc.text(`Taariikhda Imtixaanka: ${exam.date}`, pageWidth / 2 + 10, y + 2);
      doc.text(`Toddobaadka: Week ${exam.weekNumber || 1}`, pageWidth / 2 + 10, y + 8);
      doc.text(`Wadarta Ardayda: ${exam.scores.length} Arday`, pageWidth / 2 + 10, y + 14);

      // Table Header
      y += 28;
      doc.setFillColor(79, 70, 229); // Indigo
      doc.rect(14, y, pageWidth - 28, 8, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');

      doc.text('#', 16, y + 5.5);
      doc.text('Magaca Ardayga (Name)', 23, y + 5.5);
      doc.text('Diiwaangelinta', 72, y + 5.5);
      doc.text('Heerka Todobaadkan (Level)', 96, y + 5.5);
      doc.text('Celcelis', 148, y + 5.5);
      doc.text('Darajo', 164, y + 5.5);
      doc.text('Faallo (Remark)', 178, y + 5.5);

      // Table Rows
      y += 8;
      doc.setTextColor(15, 23, 42);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);

      exam.scores.forEach((sc, idx) => {
        if (y > 270) {
          doc.addPage();
          y = 20;
        }

        if (idx % 2 === 1) {
          doc.setFillColor(248, 250, 252);
          doc.rect(14, y, pageWidth - 28, 7, 'F');
        }

        doc.text(`${idx + 1}`, 16, y + 4.5);
        doc.text(sc.studentName.substring(0, 26), 23, y + 4.5);
        doc.text(sc.registrationDate || 'N/A', 72, y + 4.5);
        doc.text((sc.currentLevel || 'N/A').substring(0, 24), 96, y + 4.5);
        doc.setFont('helvetica', 'bold');
        doc.text(`${sc.averageScore}%`, 148, y + 4.5);
        doc.text(sc.grade, 164, y + 4.5);
        doc.setFont('helvetica', 'normal');
        doc.text((sc.comment || '').substring(0, 18), 178, y + 4.5);

        y += 7;
      });

      // Overall Class Average Summary
      y += 6;
      if (y > 260) {
        doc.addPage();
        y = 20;
      }
      const totalAvg = exam.scores.length > 0
        ? (exam.scores.reduce((sum, s) => sum + s.averageScore, 0) / exam.scores.length).toFixed(1)
        : '0';

      doc.setFillColor(241, 245, 249);
      doc.roundedRect(14, y, pageWidth - 28, 12, 2, 2, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.text(`CELCELISKA GUUD EE FASALKA (CLASS AVERAGE): ${totalAvg}%`, 18, y + 7.5);

      // Signatures
      y += 24;
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
      doc.setFontSize(8);
      doc.text('Saxiixa Macalinka Fasalka: _______________________', 18, y);
      doc.text('Saxiixa Maamulka Dugsiga: _______________________', pageWidth / 2 + 10, y);

      doc.save(`Weekly-Exam-${exam.className}-${exam.date}.pdf`);
      triggerFeedback('Warbixinta PDF si guul leh ayaa loo soo dejiyay!');
    } catch (err) {
      console.error(err);
      triggerFeedback('Khalad ayaa dhacay xilligii PDF la soo dejinayay.');
    }
  };

  // Export to CSV / Excel
  const handleDownloadCSV = (exam: Exam) => {
    const headers = [
      "Number",
      "Magaca Ardayga (Student Name)",
      "Taariikhda Diiwaangelinta (Registration Date)",
      "Fasalka (Class)",
      "Macalinka (Teacher)",
      "Heerka Todobaadkan (Current Level)",
      ...exam.subjects.map(sub => `Imtixaan: ${sub}`),
      "Celcelis (Average %)",
      "Darajo (Grade)",
      "Faallada (Remarks)"
    ];

    const rows = exam.scores.map((sc, idx) => [
      idx + 1,
      `"${sc.studentName.replace(/"/g, '""')}"`,
      sc.registrationDate || '',
      `"${exam.className}"`,
      `"${exam.teacherName}"`,
      `"${(sc.currentLevel || '').replace(/"/g, '""')}"`,
      ...exam.subjects.map(sub => sc.scores[sub] ?? ''),
      sc.averageScore,
      sc.grade,
      `"${(sc.comment || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + 
      [headers.join(','), ...rows.map(r => r.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Weekly_Assessment_${exam.className}_${exam.date}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    triggerFeedback('Warbixinta Excel/CSV waa la soo dejiyay!');
  };

  // Handle Printable Sheet Launch
  const handlePrintExamSheet = (exam: Exam) => {
    setSelectedExamForPrint(exam);
    setTimeout(() => {
      const printArea = document.getElementById('exam-printable-voucher');
      if (printArea) {
        const printWindow = window.open('', '_blank', 'width=900,height=800');
        if (printWindow) {
          printWindow.document.write(`
            <!DOCTYPE html>
            <html>
              <head>
                <title>Warbixinta Imtixaanka Toddobaadlaha ah - ${exam.heading} (${exam.date})</title>
                <style>
                  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #0f172a; padding: 24px; line-height: 1.4; background: #fff; }
                  .container { max-width: 850px; margin: 0 auto; border: 2px solid #0f172a; border-radius: 12px; padding: 24px; }
                  .header { text-align: center; border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 16px; }
                  h1 { margin: 0 0 4px 0; font-size: 20px; font-weight: 900; text-transform: uppercase; }
                  h2 { margin: 0; font-size: 13px; color: #475569; font-weight: 700; text-transform: uppercase; }
                  .meta-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; background: #f8fafc; padding: 12px; border-radius: 8px; font-size: 12px; margin-bottom: 16px; border: 1px solid #e2e8f0; }
                  .meta-item { display: flex; justify-content: space-between; padding: 3px 0; }
                  .label { font-weight: 700; color: #64748b; }
                  .val { font-weight: 800; color: #0f172a; }
                  table { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 11px; }
                  th { background: #0f172a; color: #fff; text-align: left; padding: 8px 6px; font-weight: 800; border: 1px solid #0f172a; }
                  td { padding: 6px; border: 1px solid #cbd5e1; }
                  tr:nth-child(even) { background-color: #f8fafc; }
                  .badge { font-weight: 800; padding: 2px 6px; border-radius: 4px; display: inline-block; font-size: 10px; }
                  .badge-A { background: #dcfce7; color: #166534; }
                  .badge-B { background: #dbeafe; color: #1e40af; }
                  .badge-C { background: #fef9c3; color: #854d0e; }
                  .badge-D { background: #ffedd5; color: #9a3412; }
                  .badge-F { background: #fee2e2; color: #991b1b; }
                  .summary-box { margin-top: 16px; background: #e0e7ff; border: 1px solid #c7d2fe; padding: 10px 16px; border-radius: 8px; display: flex; justify-content: space-between; font-weight: 800; font-size: 12px; }
                  .signatures { display: flex; justify-content: space-between; margin-top: 36px; padding-top: 12px; font-size: 12px; font-weight: 700; }
                  .sig-line { border-bottom: 1px solid #0f172a; width: 180px; margin-top: 32px; margin-bottom: 4px; }
                  @media print {
                    body { padding: 0; }
                    .container { border: none; padding: 0; }
                    .no-print { display: none !important; }
                  }
                </style>
              </head>
              <body>
                ${printArea.innerHTML}
                <script>
                  window.onload = function() {
                    setTimeout(function() {
                      window.print();
                    }, 200);
                  };
                </script>
              </body>
            </html>
          `);
          printWindow.document.close();
        }
      }
    }, 100);
  };

  return (
    <div className="space-y-6 pb-12 animate-fade-in" id="weekly-assessment-portal">
      {/* Toast Feedback */}
      {feedback && (
        <div className="fixed top-5 right-5 z-[20000] bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-2xl border border-slate-700 flex items-center gap-3 animate-fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="text-xs font-bold">{feedback}</span>
        </div>
      )}

      {/* Top Banner */}
      <div className="bg-gradient-to-br from-indigo-950 via-slate-900 to-indigo-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-black uppercase tracking-wider">
              <Calendar className="w-3.5 h-3.5 text-indigo-400" />
              Qiimeynta & Imtixaanka Toddobaadlaha ah (Thursday Tests)
            </div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Weekly Assessment & Examination Center
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              Diiwaangeli oo maamul imtixaannada toddobaadlaha ah (Khamiisyada). Ku qiimee ardayda fasallada iyo macallimiinta kala duwan, ku dar heerka ardaygu marayo toddobaadkan, cinwaanno gaar ah, oo soo saar warbixin buuxda oo la daabici karo ama PDF/Excel laga dhigi karo.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {viewMode === 'list' ? (
              <button
                type="button"
                onClick={startCreateExam}
                className="px-5 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs sm:text-sm rounded-2xl shadow-xl transition-all flex items-center gap-2 cursor-pointer border border-indigo-400/40 hover:scale-105 active:scale-95"
              >
                <Plus className="w-4 h-4" />
                + Diiwaangeli Imtixaan Cusub (Weekly Test)
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white font-extrabold text-xs rounded-xl transition-all flex items-center gap-2 cursor-pointer backdrop-blur-md border border-white/10"
              >
                <X className="w-4 h-4" />
                Ku Noqo Liiska Imtixaannada
              </button>
            )}
          </div>
        </div>

        {/* Aggregate Stats */}
        <div className="mt-8 pt-6 border-t border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-4 border border-white/10">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase block mb-1">Wadarta Imtixaannada</span>
            <span className="text-xl font-black text-slate-100 font-mono">{(database.exams || []).length} Records</span>
          </div>

          <div className="bg-indigo-500/10 backdrop-blur-sm rounded-2xl p-4 border border-indigo-500/20">
            <span className="text-[10px] font-extrabold text-indigo-300 uppercase block mb-1">Ardayda La Qiimeeyay</span>
            <span className="text-xl font-black text-indigo-200 font-mono">
              {(database.exams || []).reduce((sum, e) => sum + (e.scores?.length || 0), 0)} Graded
            </span>
          </div>

          <div className="bg-emerald-500/10 backdrop-blur-sm rounded-2xl p-4 border border-emerald-500/20">
            <span className="text-[10px] font-extrabold text-emerald-400 uppercase block mb-1">Fasallada Dugsiga</span>
            <span className="text-xl font-black text-emerald-300 font-mono">{uniqueClasses.length} Fasallo</span>
          </div>

          <div className="bg-amber-500/10 backdrop-blur-sm rounded-2xl p-4 border border-amber-500/20">
            <span className="text-[10px] font-extrabold text-amber-300 uppercase block mb-1">Macallimiinta</span>
            <span className="text-xl font-black text-amber-200 font-mono">{database.teachers.length} Macallimiin</span>
          </div>
        </div>
      </div>

      {/* VIEW MODE 1: EXAM CREATION / EDITING FORM STUDIO */}
      {(viewMode === 'create' || viewMode === 'edit') && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200 space-y-8 animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-150">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-black uppercase mb-1">
                <Edit3 className="w-3.5 h-3.5" />
                {viewMode === 'create' ? 'Diiwaangelinta Imtixaanka Toddobaadka' : 'Wax-ka-beddelka Imtixaanka'}
              </div>
              <h3 className="text-xl font-black text-slate-900">
                Foomka Natiijooyinka Imtixaanka Toddobaadka (End of Week Test Sheet)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Xulo taariikhda imtixaanku dhacay (sida Khamiista), fasalka, macalinka, ardayda, heerka ay marayaan, iyo buundooyinka.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all cursor-pointer"
              >
                Kansal garee
              </button>
              <button
                type="button"
                onClick={handleSaveExam}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-black rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                Kaydi Natiijada (Save Exam Sheet)
              </button>
            </div>
          </div>

          {/* Form Meta Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-5 bg-slate-50 rounded-2xl border border-slate-200">
            {/* Exam Title */}
            <div>
              <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">
                Cinwaanka Imtixaanka (Heading)
              </label>
              <input
                type="text"
                value={examHeading}
                onChange={e => setExamHeading(e.target.value)}
                placeholder="e.g. Imtixaanka Toddobaadka - Khamiis"
                className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Date the test happened */}
            <div>
              <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                <span>Taariikhda Imtixaanka</span>
                <span className="text-[10px] text-indigo-600 font-bold">(e.g. Khamiis)</span>
              </label>
              <input
                type="date"
                value={examDate}
                onChange={e => setExamDate(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 font-mono"
              />
            </div>

            {/* Target Class */}
            <div>
              <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">
                Fasalka (Class)
              </label>
              <select
                value={selectedClass}
                onChange={e => {
                  const newClass = e.target.value;
                  setSelectedClass(newClass);
                  handleInitializeStudentsForExam(newClass, selectedTeacherId);
                }}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500"
              >
                <option value="All">Dhammaan Fasallada (All Classes)</option>
                {uniqueClasses.map(cls => (
                  <option key={cls} value={cls}>{cls}</option>
                ))}
              </select>
            </div>

            {/* Assigned Teacher */}
            <div>
              <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">
                Macalinka (Assigned Teacher)
              </label>
              <select
                value={selectedTeacherId}
                onChange={e => {
                  const newT = e.target.value;
                  setSelectedTeacherId(newT);
                  handleInitializeStudentsForExam(selectedClass, newT);
                }}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500"
              >
                <option value="All">Dhammaan Macallimiinta (All Teachers)</option>
                {database.teachers.map(t => (
                  <option key={t.id} value={t.id}>{t.name} ({t.classAssigned})</option>
                ))}
              </select>
            </div>
          </div>

          {/* Dynamic Headings / Subjects Manager */}
          <div className="p-5 bg-indigo-50/60 rounded-2xl border border-indigo-150 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="text-xs font-black uppercase text-indigo-950 flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-indigo-600" />
                  Cinwaannada & Qeybaha Imtixaanka (Exam Headings & Subjects)
                </h4>
                <p className="text-[11px] text-slate-600 mt-0.5">
                  Ku dar ama ka saar cinwaannada aad ku qiimaynayso ardayda toddobaadkan.
                </p>
              </div>

              {/* Add Custom Heading Input */}
              <form onSubmit={handleAddHeading} className="flex items-center gap-2">
                <input
                  type="text"
                  value={newHeadingInput}
                  onChange={e => setNewHeadingInput(e.target.value)}
                  placeholder="Cinwaan cusub (e.g. Higgaad, Xusuus)..."
                  className="px-3.5 py-2 bg-white border border-indigo-200 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 w-52"
                />
                <button
                  type="submit"
                  className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1 cursor-pointer shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Ku dar
                </button>
              </form>
            </div>

            {/* List of active headings pills */}
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-indigo-200/60">
              {headings.map((h, i) => (
                <span
                  key={h}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-indigo-200 text-indigo-950 font-black text-xs shadow-2xs"
                >
                  <span className="text-indigo-600 font-mono text-[10px]">{i + 1}.</span>
                  <span>{h}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveHeading(h)}
                    className="text-slate-400 hover:text-rose-600 ml-1 p-0.5 rounded-full hover:bg-rose-50 cursor-pointer"
                    title="Ka saar cinwaankan"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* Student Grading Sheet Table */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <Users className="w-4 h-4 text-indigo-600" />
                  Liiska Ardayda Imtixaanka ({examScores.length} Arday)
                </h4>
                <p className="text-xs text-slate-500">
                  Arday kasta wuxuu leeyahay taariikhda diiwaangelintiisa, heerka uu marayo toddobaadkan, buundooyinka, iyo faallo.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setStudentSearchQuery('');
                  setIsAddStudentModalOpen(true);
                }}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
              >
                <Plus className="w-3.5 h-3.5 text-emerald-400" />
                + Ku dar Arday Kale (Add Student)
              </button>
            </div>

            {examScores.length === 0 ? (
              <div className="text-center py-12 px-4 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-300">
                <Users className="w-10 h-10 text-slate-400 mx-auto mb-2" />
                <p className="text-xs font-bold text-slate-600">Wax arday ah kuma jiraan liiska imtixaankan.</p>
                <p className="text-[11px] text-slate-400 mt-1">Guji badhanka kore si aad arday ugu darto.</p>
              </div>
            ) : (
              <div className="overflow-x-auto border border-slate-200 rounded-2xl shadow-xs">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-900 text-white text-[11px] font-black uppercase tracking-wider">
                    <tr>
                      <th className="py-3 px-3 w-10 text-center">#</th>
                      <th className="py-3 px-3 min-w-[200px]">Ardayga (Student Details)</th>
                      <th className="py-3 px-3 min-w-[160px]">Heerka Todobaadkan (Level)</th>
                      {headings.map(h => (
                        <th key={h} className="py-3 px-3 min-w-[120px] text-center">
                          {h}
                        </th>
                      ))}
                      <th className="py-3 px-3 min-w-[100px] text-center">Celcelis (Avg)</th>
                      <th className="py-3 px-3 min-w-[100px] text-center">Darajo</th>
                      <th className="py-3 px-3 min-w-[180px]">Faallo / Remarks</th>
                      <th className="py-3 px-3 w-16 text-center">Tirtir</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {examScores.map((sc, index) => {
                      const st = studentsMap.get(sc.studentId);
                      return (
                        <tr key={sc.studentId} className="hover:bg-indigo-50/30 transition-colors">
                          {/* # Index */}
                          <td className="py-3 px-3 text-center font-mono font-bold text-slate-400 text-[11px]">
                            {index + 1}
                          </td>

                          {/* Student Name + Reg Date + Class */}
                          <td className="py-3 px-3">
                            <div className="font-extrabold text-slate-900 text-xs">
                              {sc.studentName}
                            </div>
                            <div className="flex flex-wrap items-center gap-2 mt-1 text-[10px]">
                              <span className="text-slate-500 font-semibold flex items-center gap-1">
                                <Calendar className="w-3 h-3 text-slate-400" />
                                Diiwaangashan: <strong className="font-mono text-slate-700">{sc.registrationDate || st?.registrationDate || 'N/A'}</strong>
                              </span>
                              {st?.className && (
                                <span className="px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded font-bold">
                                  {st.className}
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Level in this exact week */}
                          <td className="py-3 px-3">
                            <input
                              type="text"
                              value={sc.currentLevel || ''}
                              onChange={e => handleUpdateStudentLevel(sc.studentId, e.target.value)}
                              placeholder="e.g. Higgaad / Juz Camma..."
                              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 focus:bg-white focus:ring-1 focus:ring-indigo-500"
                            />
                          </td>

                          {/* Subject Scores / Headings */}
                          {headings.map(h => (
                            <td key={h} className="py-3 px-3 text-center">
                              <div className="space-y-1">
                                <input
                                  type="number"
                                  min="0"
                                  max="100"
                                  value={sc.scores[h] ?? ''}
                                  onChange={e => handleUpdateScore(sc.studentId, h, Number(e.target.value))}
                                  className="w-20 px-2 py-1 bg-slate-50 border border-slate-300 rounded-lg text-center text-xs font-mono font-black text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500"
                                />
                                <input
                                  type="text"
                                  value={sc.headingContents?.[h] || ''}
                                  onChange={e => handleUpdateHeadingContent(sc.studentId, h, e.target.value)}
                                  placeholder="Qoraal/Xusuus..."
                                  className="w-24 px-1.5 py-0.5 bg-transparent border-b border-dashed border-slate-200 text-[10px] text-slate-600 placeholder:text-slate-300 focus:outline-hidden focus:border-indigo-500"
                                />
                              </div>
                            </td>
                          ))}

                          {/* Average Score */}
                          <td className="py-3 px-3 text-center">
                            <span className="font-mono font-black text-xs px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-950 border border-indigo-200 inline-block">
                              {sc.averageScore}%
                            </span>
                          </td>

                          {/* Somali Grade Badge */}
                          <td className="py-3 px-3 text-center">
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider inline-block ${
                              sc.grade === 'A' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' :
                              sc.grade === 'B' ? 'bg-blue-100 text-blue-800 border border-blue-300' :
                              sc.grade === 'C' ? 'bg-amber-100 text-amber-800 border border-amber-300' :
                              sc.grade === 'D' ? 'bg-orange-100 text-orange-800 border border-orange-300' :
                              'bg-rose-100 text-rose-800 border border-rose-300'
                            }`}>
                              {sc.grade}
                            </span>
                          </td>

                          {/* Remarks / Comment */}
                          <td className="py-3 px-3">
                            <input
                              type="text"
                              value={sc.comment || ''}
                              onChange={e => handleUpdateStudentComment(sc.studentId, e.target.value)}
                              placeholder="Faallo..."
                              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 focus:bg-white focus:ring-1 focus:ring-indigo-500"
                            />
                          </td>

                          {/* Delete/Exclude from this test */}
                          <td className="py-3 px-3 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveStudentFromExam(sc.studentId)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all cursor-pointer"
                              title="Ka saar ardaygan imtixaankan"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Bottom Save Action Bar */}
          <div className="pt-6 border-t border-slate-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className="px-5 py-2.5 text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all cursor-pointer"
            >
              Kansal garee
            </button>
            <button
              type="button"
              onClick={handleSaveExam}
              className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-black rounded-xl shadow-lg transition-all flex items-center gap-2 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              Kaydi Imtixaanka Toddobaadka (Save Weekly Exam)
            </button>
          </div>
        </div>
      )}

      {/* VIEW MODE 2: EXAMS HISTORY & LEDGER LIST */}
      {viewMode === 'list' && (
        <div className="space-y-6">
          {/* Filters Bar */}
          <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-200/80 flex flex-col lg:flex-row items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
              {/* Search */}
              <div className="relative flex-1 sm:w-64">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={filterSearch}
                  onChange={e => setFilterSearch(e.target.value)}
                  placeholder="Raadi imtixaan ama arday..."
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Class Filter */}
              <select
                value={filterClass}
                onChange={e => setFilterClass(e.target.value)}
                className="px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500"
              >
                <option value="All">Dhammaan Fasallada (All Classes)</option>
                {uniqueClasses.map(cls => (
                  <option key={cls} value={cls}>{cls}</option>
                ))}
              </select>

              {/* Teacher Filter */}
              <select
                value={filterTeacher}
                onChange={e => setFilterTeacher(e.target.value)}
                className="px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500"
              >
                <option value="All">Dhammaan Macallimiinta (All Teachers)</option>
                {database.teachers.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2 self-end lg:self-auto">
              <span className="text-xs font-bold text-slate-400">
                {examsList.length} Imtixaan la helay
              </span>
            </div>
          </div>

          {/* Exams Grid Feed */}
          {examsList.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border-2 border-dashed border-slate-200 space-y-3">
              <GraduationCap className="w-12 h-12 text-indigo-400 mx-auto" />
              <h4 className="text-base font-black text-slate-800">Ma jiraan imtixaanno toddobaadle ah oo la diiwaangeliyay</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Guji badhanka hoose si aad u diiwaangeliso imtixaanka toddobaadka (sida Khamiista).
              </p>
              <button
                type="button"
                onClick={startCreateExam}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs rounded-xl shadow-md transition-all inline-flex items-center gap-2 cursor-pointer mt-2"
              >
                <Plus className="w-4 h-4" />
                Diiwaangeli Imtixaan Cusub
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {examsList.map(exam => {
                const avgScore = exam.scores.length > 0
                  ? (exam.scores.reduce((sum, sc) => sum + sc.averageScore, 0) / exam.scores.length).toFixed(1)
                  : '0';

                return (
                  <div
                    key={exam.id}
                    className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200/90 hover:shadow-md transition-all flex flex-col justify-between space-y-4 group"
                  >
                    <div>
                      {/* Top Badges */}
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <span className="px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-indigo-500" />
                          {exam.date}
                        </span>
                        <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-black">
                          Week {exam.weekNumber || 1}
                        </span>
                      </div>

                      <h4 className="text-base font-black text-slate-900 group-hover:text-indigo-600 transition-colors">
                        {exam.heading}
                      </h4>

                      <div className="mt-3 space-y-1.5 text-xs text-slate-600">
                        <div className="flex justify-between">
                          <span className="text-slate-400 font-semibold">Fasalka:</span>
                          <span className="font-bold text-slate-800">{exam.className}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400 font-semibold">Macalinka:</span>
                          <span className="font-bold text-slate-800">{exam.teacherName}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400 font-semibold">Ardayda:</span>
                          <span className="font-mono font-bold text-slate-800">{exam.scores.length} arday</span>
                        </div>
                        <div className="flex justify-between pt-1 border-t border-slate-100">
                          <span className="text-indigo-900 font-bold">Celceliska Guud:</span>
                          <span className="font-mono font-black text-indigo-600 text-sm">{avgScore}%</span>
                        </div>
                      </div>

                      {/* Subjects tags */}
                      <div className="flex flex-wrap gap-1 mt-3.5">
                        {exam.subjects.map(sub => (
                          <span key={sub} className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-bold">
                            {sub}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Actions bar */}
                    <div className="pt-4 border-t border-slate-150 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handlePrintExamSheet(exam)}
                          className="p-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl transition-all cursor-pointer"
                          title="Daabac Rasiid / Warbixin"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDownloadPDF(exam)}
                          className="p-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl transition-all cursor-pointer"
                          title="Soo deji PDF"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDownloadCSV(exam)}
                          className="p-2 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-xl transition-all cursor-pointer"
                          title="Soo deji Excel / CSV"
                        >
                          <FileSpreadsheet className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => startEditExam(exam)}
                          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center gap-1"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          Wax ka beddel
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteExam(exam.id)}
                          className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all cursor-pointer"
                          title="Tirtir imtixaankan"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* MODAL 1: ADD STUDENT TO EXAM SHEET */}
      {isAddStudentModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-[20000] animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="bg-slate-900 p-5 text-white flex items-center justify-between">
              <div>
                <h4 className="text-sm font-black uppercase text-indigo-300 tracking-wide">
                  Ku dar Arday Imtixaanka
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  Xulo ardayga aad rabto inaad ku darto liiska qiimeynta.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsAddStudentModalOpen(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={studentSearchQuery}
                  onChange={e => setStudentSearchQuery(e.target.value)}
                  placeholder="Raadi magaca ardayga..."
                  className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="max-h-60 overflow-y-auto space-y-2 divide-y divide-slate-100">
                {database.students
                  .filter(s => s.active && !examScores.some(sc => sc.studentId === s.id))
                  .filter(s => !studentSearchQuery || s.name.toLowerCase().includes(studentSearchQuery.toLowerCase()))
                  .map(s => (
                    <div
                      key={s.id}
                      onClick={() => handleAddStudentToExam(s)}
                      className="p-3 hover:bg-indigo-50 rounded-xl cursor-pointer flex items-center justify-between transition-colors pt-2"
                    >
                      <div>
                        <div className="font-extrabold text-slate-900 text-xs">{s.name}</div>
                        <div className="text-[10px] text-slate-500 mt-0.5">
                          Fasalka: {s.className} • Diiwaangashan: {s.registrationDate}
                        </div>
                      </div>
                      <span className="px-2.5 py-1 bg-indigo-600 text-white rounded-lg text-[10px] font-black">
                        + Xulo
                      </span>
                    </div>
                  ))}
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={() => setIsAddStudentModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 rounded-xl"
              >
                Xir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: CONFIRMATION DIALOG */}
      {confirmModal && confirmModal.isOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-[20000] animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 p-6 space-y-4">
            <h4 className="text-base font-black text-slate-900">{confirmModal.title}</h4>
            <p className="text-xs text-slate-600 leading-relaxed">{confirmModal.message}</p>
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-150">
              <button
                type="button"
                onClick={() => setConfirmModal(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 rounded-xl cursor-pointer"
              >
                Kansal garee
              </button>
              <button
                type="button"
                onClick={confirmModal.onConfirm}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-black rounded-xl shadow-sm transition-all cursor-pointer"
              >
                Haa, Tirtir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* HIDDEN PRINTABLE CONTAINER FOR PRINT WINDOW */}
      {selectedExamForPrint && (
        <div id="exam-printable-voucher" className="hidden">
          <div className="container">
            <div className="header">
              <h1>DUGSIGA SUBUC & QUR'AANKA KARIIMKA AH</h1>
              <h2>WARBIXINTA IMTIXAANKA TODDOBAADLAHA AH (WEEKLY ASSESSMENT REPORT)</h2>
            </div>

            <div className="meta-grid">
              <div className="meta-item">
                <span className="label">Imtixaanka:</span>
                <span className="val">{selectedExamForPrint.heading}</span>
              </div>
              <div className="meta-item">
                <span className="label">Taariikhda:</span>
                <span className="val">{selectedExamForPrint.date}</span>
              </div>
              <div className="meta-item">
                <span className="label">Fasalka:</span>
                <span className="val">{selectedExamForPrint.className}</span>
              </div>
              <div className="meta-item">
                <span className="label">Macalinka:</span>
                <span className="val">{selectedExamForPrint.teacherName}</span>
              </div>
              <div className="meta-item">
                <span className="label">Toddobaadka:</span>
                <span className="val">Week {selectedExamForPrint.weekNumber || 1}</span>
              </div>
              <div className="meta-item">
                <span className="label">Wadarta Ardayda:</span>
                <span className="val">{selectedExamForPrint.scores.length} Arday</span>
              </div>
            </div>

            <table>
              <thead>
                <tr>
                  <th style={{ width: '24px', textAlign: 'center' }}>#</th>
                  <th>Magaca Ardayga (Student Name)</th>
                  <th>Diiwaangelinta</th>
                  <th>Heerka Todobaadkan (Level)</th>
                  {selectedExamForPrint.subjects.map(sub => (
                    <th key={sub} style={{ textAlign: 'center' }}>{sub}</th>
                  ))}
                  <th style={{ textAlign: 'center' }}>Celcelis</th>
                  <th style={{ textAlign: 'center' }}>Darajo</th>
                  <th>Faallo</th>
                </tr>
              </thead>
              <tbody>
                {selectedExamForPrint.scores.map((sc, idx) => (
                  <tr key={sc.studentId}>
                    <td style={{ textAlign: 'center', fontWeight: 'bold' }}>{idx + 1}</td>
                    <td><strong>{sc.studentName}</strong></td>
                    <td style={{ fontFamily: 'monospace' }}>{sc.registrationDate || 'N/A'}</td>
                    <td>{sc.currentLevel || 'N/A'}</td>
                    {selectedExamForPrint.subjects.map(sub => (
                      <td key={sub} style={{ textAlign: 'center', fontFamily: 'monospace' }}>
                        {sc.scores[sub] ?? '-'}{sc.headingContents?.[sub] ? ` (${sc.headingContents[sub]})` : ''}
                      </td>
                    ))}
                    <td style={{ textAlign: 'center', fontWeight: 'bold', fontFamily: 'monospace' }}>
                      {sc.averageScore}%
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span className={`badge badge-${sc.grade}`}>{sc.grade}</span>
                    </td>
                    <td>{sc.comment || ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="summary-box">
              <span>WADARTA ARDAYDA: {selectedExamForPrint.scores.length}</span>
              <span>
                CELCELISKA GUUD EE FASALKA:{' '}
                {selectedExamForPrint.scores.length > 0
                  ? (selectedExamForPrint.scores.reduce((s, sc) => s + sc.averageScore, 0) / selectedExamForPrint.scores.length).toFixed(1)
                  : '0'}%
              </span>
            </div>

            <div className="signatures">
              <div>
                <p>Saxiixa Macalinka Fasalka:</p>
                <div className="sig-line" />
                <p style={{ fontSize: '10px', color: '#64748b' }}>Macalinka</p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p>Saxiixa Maamulka Dugsiga:</p>
                <div className="sig-line" style={{ marginLeft: 'auto' }} />
                <p style={{ fontSize: '10px', color: '#64748b' }}>Maamulaha</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
