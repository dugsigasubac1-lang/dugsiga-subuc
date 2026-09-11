import React, { useState, useMemo } from 'react';
import {
  CalendarRange,
  Users,
  Search,
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
  Download,
  FileSpreadsheet,
  FileText,
  Save,
  Check,
  Filter,
  UserCheck,
  ChevronDown
} from 'lucide-react';
import { DatabaseState, Student, DailyProgress, AttendanceType } from '../types';
import jsPDF from 'jspdf';

interface StudentAttendanceTabProps {
  database: DatabaseState;
  onSaveDatabase: (
    updatedDb: DatabaseState,
    options?: {
      userRole?: 'admin' | 'teacher' | null;
      explicitDeletedStudentIds?: string[];
      preferIncomingMeta?: boolean;
    }
  ) => void;
}

export function StudentAttendanceTab({ database, onSaveDatabase }: StudentAttendanceTabProps) {
  const todayStr = useMemo(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }, []);

  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [selectedClass, setSelectedClass] = useState<string>('All');
  const [selectedSession, setSelectedSession] = useState<'All' | 'Morning' | 'Afternoon' | 'Both'>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string>('');

  // Get active students
  const activeStudents = useMemo(() => {
    return (database.students || []).filter(
      s => s.active !== false && (s.status === undefined || s.status === 'Active' || s.status === 'active')
    );
  }, [database.students]);

  // Classes list
  const classesList = useMemo(() => {
    const fromClasses = (database.classes || []).map(c => typeof c === 'string' ? c : (c as any).name || String(c));
    const fromStudents = activeStudents.map(s => s.className).filter(Boolean);
    return Array.from(new Set([...fromClasses, ...fromStudents]));
  }, [database.classes, activeStudents]);

  // Filtered students for selected class & session & search
  const filteredStudents = useMemo(() => {
    return activeStudents.filter(s => {
      const matchClass = selectedClass === 'All' || s.className === selectedClass;
      const matchSession =
        selectedSession === 'All' ||
        s.session === selectedSession ||
        (s as any).shift === selectedSession ||
        s.session === 'Both';
      const matchSearch =
        !searchQuery ||
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (s.parentPhone && s.parentPhone.includes(searchQuery));
      return matchClass && matchSession && matchSearch;
    });
  }, [activeStudents, selectedClass, selectedSession, searchQuery]);

  // Existing progress records for the selected date
  const recordsMap = useMemo(() => {
    const map = new Map<string, DailyProgress>();
    (database.progress || []).forEach(p => {
      if (p.date === selectedDate) {
        map.set(p.studentId, p);
      }
    });
    return map;
  }, [database.progress, selectedDate]);

  // Metrics for the selected date and class
  const metrics = useMemo(() => {
    let present = 0;
    let late = 0;
    let absent = 0;
    let excused = 0;
    let unlogged = 0;

    filteredStudents.forEach(s => {
      const rec = recordsMap.get(s.id);
      if (!rec || !rec.attendance) {
        unlogged++;
      } else if (rec.attendance === 'Present') {
        present++;
      } else if (rec.attendance === 'Late') {
        late++;
      } else if (rec.attendance === 'Absent') {
        absent++;
      } else if (rec.attendance === 'Excused') {
        excused++;
      }
    });

    return { total: filteredStudents.length, present, late, absent, excused, unlogged };
  }, [filteredStudents, recordsMap]);

  // Toggle or set student attendance status
  const handleSetStatus = (studentId: string, status: AttendanceType) => {
    const student = activeStudents.find(s => s.id === studentId);
    if (!student) return;

    const existingIndex = (database.progress || []).findIndex(
      p => p.studentId === studentId && p.date === selectedDate
    );

    let newProgressList = [...(database.progress || [])];

    if (existingIndex >= 0) {
      newProgressList[existingIndex] = {
        ...newProgressList[existingIndex],
        attendance: status
      };
    } else {
      const newRec: DailyProgress = {
        id: `DP-${selectedDate}-${studentId}`,
        studentId: student.id,
        studentName: student.name,
        teacherId: student.teacherId || '',
        className: student.className,
        date: selectedDate,
        attendance: status,
        lessonCompleted: 'Completed',
        surad: 'Completed',
        subac: 'Completed',
        dhaqan: 'Good',
        nadaafad: 'Good',
        faahfaahin: '',
        suuradeeMaraya: ''
      };
      newProgressList.push(newRec);
    }

    onSaveDatabase({
      ...database,
      progress: newProgressList
    });
  };

  // Update Surah / Lesson text for a student
  const handleUpdateLesson = (studentId: string, surahText: string) => {
    const student = activeStudents.find(s => s.id === studentId);
    if (!student) return;

    const existingIndex = (database.progress || []).findIndex(
      p => p.studentId === studentId && p.date === selectedDate
    );

    let newProgressList = [...(database.progress || [])];

    if (existingIndex >= 0) {
      newProgressList[existingIndex] = {
        ...newProgressList[existingIndex],
        suuradeeMaraya: surahText
      };
    } else {
      const newRec: DailyProgress = {
        id: `DP-${selectedDate}-${studentId}`,
        studentId: student.id,
        studentName: student.name,
        teacherId: student.teacherId || '',
        className: student.className,
        date: selectedDate,
        attendance: 'Present',
        lessonCompleted: 'Completed',
        surad: 'Completed',
        subac: 'Completed',
        dhaqan: 'Good',
        nadaafad: 'Good',
        faahfaahin: '',
        suuradeeMaraya: surahText
      };
      newProgressList.push(newRec);
    }

    onSaveDatabase({
      ...database,
      progress: newProgressList
    });
  };

  // Bulk mark all filtered students as Present
  const handleMarkAllPresent = () => {
    let newProgressList = [...(database.progress || [])];

    filteredStudents.forEach(student => {
      const existingIndex = newProgressList.findIndex(
        p => p.studentId === student.id && p.date === selectedDate
      );
      if (existingIndex >= 0) {
        newProgressList[existingIndex] = {
          ...newProgressList[existingIndex],
          attendance: 'Present'
        };
      } else {
        newProgressList.push({
          id: `DP-${selectedDate}-${student.id}`,
          studentId: student.id,
          studentName: student.name,
          teacherId: student.teacherId || '',
          className: student.className,
          date: selectedDate,
          attendance: 'Present',
          lessonCompleted: 'Completed',
          surad: 'Completed',
          subac: 'Completed',
          dhaqan: 'Good',
          nadaafad: 'Good',
          faahfaahin: '',
          suuradeeMaraya: ''
        });
      }
    });

    onSaveDatabase({
      ...database,
      progress: newProgressList
    });

    setSaveSuccessMsg(`Dhammaan ardayda (${filteredStudents.length}) waxaa loo calaamadeeyay 'Jooga' (Present)!`);
    setTimeout(() => setSaveSuccessMsg(''), 4000);
  };

  // Export Attendance PDF
  const handleDownloadPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text('DUGSIGA SUBUC - WARBIXINTA JOOGITAANKA ARDAYDA', 14, 18);
    doc.setFontSize(10);
    doc.text(`Taariikhda: ${selectedDate} | Fasalka: ${selectedClass} | Xilliga: ${selectedSession}`, 14, 26);
    doc.text(
      `Wadarta: ${metrics.total} | Jooga: ${metrics.present} | Soo Daahay: ${metrics.late} | Maqan: ${metrics.absent} | Fasax: ${metrics.excused}`,
      14,
      32
    );

    let y = 42;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('#', 14, y);
    doc.text('Magaca Ardayga', 24, y);
    doc.text('Fasalka', 95, y);
    doc.text('Xaaladda', 135, y);
    doc.text('Dersiga / Suurada', 165, y);
    y += 6;
    doc.setFont('helvetica', 'normal');

    filteredStudents.forEach((st, idx) => {
      if (y > 280) {
        doc.addPage();
        y = 20;
      }
      const rec = recordsMap.get(st.id);
      const status = rec?.attendance || 'Lama Qorin';
      const surah = rec?.surah || '-';

      doc.text(`${idx + 1}`, 14, y);
      doc.text(st.name.substring(0, 32), 24, y);
      doc.text((st.className || '-').substring(0, 20), 95, y);
      doc.text(status, 135, y);
      doc.text(surah.substring(0, 20), 165, y);
      y += 6;
    });

    doc.save(`Joogitaanka_Ardayda_${selectedDate}_${selectedClass.replace(/\s+/g, '_')}.pdf`);
  };

  // Export Attendance TXT
  const handleDownloadTXT = () => {
    let content = `========================================================\n`;
    content += `         DUGSIGA SUBUC - JOOGITAANKA ARDAYDA\n`;
    content += `========================================================\n`;
    content += `Taariikhda: ${selectedDate}\n`;
    content += `Fasalka:    ${selectedClass}\n`;
    content += `Xilliga:    ${selectedSession}\n`;
    content += `Wadarta:    ${metrics.total} | Jooga: ${metrics.present} | Soo Daahay: ${metrics.late} | Maqan: ${metrics.absent} | Fasax: ${metrics.excused}\n`;
    content += `--------------------------------------------------------\n`;
    content += `ID       | MAGACA ARDAYGA                  | FASALKA              | JOOGITAANKA | DERSIGA\n`;
    content += `--------------------------------------------------------\n`;

    filteredStudents.forEach(st => {
      const rec = recordsMap.get(st.id);
      const status = rec?.attendance || 'Lama Qorin';
      const surah = rec?.surah || '-';
      content += `${st.id.padEnd(8)} | ${st.name.padEnd(30)} | ${(st.className || '').padEnd(20)} | ${status.padEnd(11)} | ${surah}\n`;
    });

    content += `========================================================\n`;

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Joogitaanka_${selectedDate}_${selectedClass}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 animate-fade-in" id="portal-student-attendance">
      {/* Header Banner */}
      <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <span className="p-2 bg-emerald-50 text-emerald-600 rounded-xl inline-flex">
              <CalendarRange className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-black text-slate-900">Joogitaanka Ardayda Maalinlaha ah</h2>
          </div>
          <p className="text-xs text-slate-500 font-medium">
            Diwaangeli oo la soco imaanshaha ardayda fasal kasta taariikh ahaan.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={handleMarkAllPresent}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-extrabold flex items-center gap-2 shadow-sm transition-all cursor-pointer"
          >
            <UserCheck className="w-4 h-4" />
            <span>Dhammaan Jooga (Mark All Present)</span>
          </button>
          <button
            type="button"
            onClick={handleDownloadPDF}
            className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-extrabold flex items-center gap-2 shadow-sm transition-all cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Export PDF</span>
          </button>
          <button
            type="button"
            onClick={handleDownloadTXT}
            className="px-3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <FileText className="w-4 h-4 text-slate-500" />
            <span>TXT</span>
          </button>
        </div>
      </div>

      {saveSuccessMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-bold flex items-center gap-2 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{saveSuccessMsg}</span>
        </div>
      )}

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
          <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block">Wadarta</span>
          <span className="text-2xl font-black text-slate-900 mt-1 block">{metrics.total}</span>
          <span className="text-[10px] text-slate-400 font-semibold mt-0.5 block">Arday</span>
        </div>
        <div className="bg-emerald-50/70 p-4 rounded-2xl border border-emerald-100 shadow-sm">
          <span className="text-[10px] font-extrabold text-emerald-700 uppercase tracking-widest block">Jooga</span>
          <span className="text-2xl font-black text-emerald-800 mt-1 block">{metrics.present}</span>
          <span className="text-[10px] text-emerald-600 font-semibold mt-0.5 block">
            {metrics.total ? Math.round((metrics.present / metrics.total) * 100) : 0}% heerka
          </span>
        </div>
        <div className="bg-amber-50/70 p-4 rounded-2xl border border-amber-100 shadow-sm">
          <span className="text-[10px] font-extrabold text-amber-700 uppercase tracking-widest block">Soo Daahay</span>
          <span className="text-2xl font-black text-amber-800 mt-1 block">{metrics.late}</span>
          <span className="text-[10px] text-amber-600 font-semibold mt-0.5 block">Arday</span>
        </div>
        <div className="bg-rose-50/70 p-4 rounded-2xl border border-rose-100 shadow-sm">
          <span className="text-[10px] font-extrabold text-rose-700 uppercase tracking-widest block">Maqan</span>
          <span className="text-2xl font-black text-rose-800 mt-1 block">{metrics.absent}</span>
          <span className="text-[10px] text-rose-600 font-semibold mt-0.5 block">Arday</span>
        </div>
        <div className="bg-blue-50/70 p-4 rounded-2xl border border-blue-100 shadow-sm">
          <span className="text-[10px] font-extrabold text-blue-700 uppercase tracking-widest block">Fasax</span>
          <span className="text-2xl font-black text-blue-800 mt-1 block">{metrics.excused}</span>
          <span className="text-[10px] text-blue-600 font-semibold mt-0.5 block">Arday</span>
        </div>
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest block">Lama Qorin</span>
          <span className="text-2xl font-black text-slate-700 mt-1 block">{metrics.unlogged}</span>
          <span className="text-[10px] text-slate-400 font-semibold mt-0.5 block">Arday</span>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Date Picker */}
          <div>
            <label className="text-[11px] font-extrabold text-slate-600 uppercase tracking-wider block mb-1.5">
              Taariikhda
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Class Filter */}
          <div>
            <label className="text-[11px] font-extrabold text-slate-600 uppercase tracking-wider block mb-1.5">
              Fasalka
            </label>
            <select
              value={selectedClass}
              onChange={e => setSelectedClass(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="All">Dhammaan Fasallada ({activeStudents.length})</option>
              {classesList.map(c => (
                <option key={c} value={c}>
                  {c} ({activeStudents.filter(s => s.className === c).length})
                </option>
              ))}
            </select>
          </div>

          {/* Session Filter */}
          <div>
            <label className="text-[11px] font-extrabold text-slate-600 uppercase tracking-wider block mb-1.5">
              Xilliga (Shift)
            </label>
            <select
              value={selectedSession}
              onChange={e => setSelectedSession(e.target.value as any)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="All">Dhammaan Xilliyada</option>
              <option value="Morning">Subax (Morning)</option>
              <option value="Afternoon">Galab (Afternoon)</option>
              <option value="Both">Labada Xilli (Both)</option>
            </select>
          </div>

          {/* Search Box */}
          <div>
            <label className="text-[11px] font-extrabold text-slate-600 uppercase tracking-wider block mb-1.5">
              Raadi Arday
            </label>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Magaca, ID, ama Taleefanka..."
                className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder:text-slate-400"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Attendance Matrix Table */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-emerald-600" />
            <h3 className="font-extrabold text-slate-900 text-sm">
              Liiska Ardayda ({filteredStudents.length})
            </h3>
          </div>
          <span className="text-xs text-slate-400 font-semibold">
            Taariikhda: <span className="font-bold text-slate-700">{selectedDate}</span>
          </span>
        </div>

        {filteredStudents.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="font-bold text-sm text-slate-600">Arday laguma helin xulashadaan</p>
            <p className="text-xs mt-1">Fadlan hubi fasalka ama shaandhada aad dooratay.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 text-slate-500 font-extrabold border-b border-slate-100">
                  <th className="p-3.5 pl-6 w-12">#</th>
                  <th className="p-3.5">Ardayga & ID</th>
                  <th className="p-3.5">Fasalka</th>
                  <th className="p-3.5 text-center min-w-[280px]">Joogitaanka Maanta</th>
                  <th className="p-3.5 min-w-[200px] pr-6">Dersiga / Suurada Maanta</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                {filteredStudents.map((st, idx) => {
                  const rec = recordsMap.get(st.id);
                  const currentStatus = rec?.attendance;
                  const surahVal = rec?.suuradeeMaraya || (rec as any)?.surah || '';

                  return (
                    <tr key={st.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="p-3.5 pl-6 font-mono text-slate-400">{idx + 1}</td>
                      <td className="p-3.5">
                        <div className="flex items-center gap-3">
                          {st.imageUrl || (st as any).profilePhoto ? (
                            <img
                              src={st.imageUrl || (st as any).profilePhoto}
                              alt={st.name}
                              className="w-8 h-8 rounded-full object-cover border border-slate-200 shrink-0"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-700 font-black text-xs flex items-center justify-center shrink-0">
                              {st.name.charAt(0)}
                            </div>
                          )}
                          <div>
                            <span className="font-black text-slate-900 block">{st.name}</span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {st.id} {st.parentPhone ? `• ${st.parentPhone}` : ''}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="p-3.5 font-bold text-slate-600">{st.className}</td>
                      <td className="p-3.5">
                        <div className="flex items-center justify-center gap-1.5 bg-slate-50/80 p-1 rounded-xl border border-slate-200/60">
                          {/* Present */}
                          <button
                            type="button"
                            onClick={() => handleSetStatus(st.id, 'Present')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-extrabold flex items-center gap-1 transition-all cursor-pointer ${
                              currentStatus === 'Present'
                                ? 'bg-emerald-600 text-white shadow-sm'
                                : 'text-slate-600 hover:bg-emerald-50 hover:text-emerald-700'
                            }`}
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Jooga</span>
                          </button>

                          {/* Late */}
                          <button
                            type="button"
                            onClick={() => handleSetStatus(st.id, 'Late')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-extrabold flex items-center gap-1 transition-all cursor-pointer ${
                              currentStatus === 'Late'
                                ? 'bg-amber-500 text-white shadow-sm'
                                : 'text-slate-600 hover:bg-amber-50 hover:text-amber-700'
                            }`}
                          >
                            <Clock className="w-3.5 h-3.5" />
                            <span>Daahay</span>
                          </button>

                          {/* Absent */}
                          <button
                            type="button"
                            onClick={() => handleSetStatus(st.id, 'Absent')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-extrabold flex items-center gap-1 transition-all cursor-pointer ${
                              currentStatus === 'Absent'
                                ? 'bg-rose-600 text-white shadow-sm'
                                : 'text-slate-600 hover:bg-rose-50 hover:text-rose-700'
                            }`}
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            <span>Maqan</span>
                          </button>
                        </div>
                      </td>
                      <td className="p-3.5 pr-6">
                        <input
                          type="text"
                          defaultValue={surahVal}
                          onBlur={e => handleUpdateLesson(st.id, e.target.value)}
                          placeholder="Qor suurat / casharka..."
                          className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder:text-slate-400"
                        />
                      </td>
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
}
