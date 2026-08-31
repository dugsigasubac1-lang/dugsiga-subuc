import React, { useState, useMemo } from 'react';
import { 
  X, 
  Users, 
  Search, 
  Download, 
  BookOpen, 
  CircleDollarSign, 
  AlertCircle, 
  Bus, 
  Phone, 
  MessageSquare, 
  CheckCircle2, 
  Clock, 
  ExternalLink,
  ChevronRight,
  Filter,
  UserCheck,
  Calculator,
  ArrowRight,
  ShieldCheck,
  Send
} from 'lucide-react';
import { DatabaseState, Student, Invoice } from '../types';

interface DashboardModalBaseProps {
  database: DatabaseState;
  onNavigateTab: (tab: any, subtab?: any) => void;
  onClose: () => void;
}

// 1. ACTIVE STUDENTS MODAL
export function ActiveStudentsModal({
  database,
  onNavigateTab,
  onClose
}: DashboardModalBaseProps) {
  const [search, setSearch] = useState('');
  const [classFilter, setClassFilter] = useState('all');
  const [sessionFilter, setSessionFilter] = useState('all');

  const students = useMemo(() => {
    return (database.students || []).filter(s => s.active !== false && (s.status === undefined || s.status === 'Active' || s.status === 'active'));
  }, [database.students]);

  const classes = useMemo(() => {
    return database.classes || [];
  }, [database.classes]);

  const filtered = useMemo(() => {
    return students.filter(s => {
      const matchSearch = !search || 
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        s.id.toLowerCase().includes(search.toLowerCase()) ||
        (s.parentName && s.parentName.toLowerCase().includes(search.toLowerCase())) ||
        (s.parentPhone && s.parentPhone.includes(search));
      
      const matchClass = classFilter === 'all' || s.className === classFilter;
      const matchSession = sessionFilter === 'all' || (s as any).session === sessionFilter || (s as any).shift === sessionFilter;

      return matchSearch && matchClass && matchSession;
    });
  }, [students, search, classFilter, sessionFilter]);

  const handleExportCSV = () => {
    const headers = ['ID', 'Magaca Ardayga', 'Fasalka', 'Waalidka', 'Telefoonka', 'Fiiga Bisha', 'Baska'];
    const rows = filtered.map(s => [
      `"${s.id}"`,
      `"${s.name}"`,
      `"${s.className || '-'}"`,
      `"${s.parentName || '-'}"`,
      `"${s.parentPhone || '-'}"`,
      `"$${s.monthlyFee || 0}"`,
      `"${s.hasBusService ? 'Haa ($' + (s.busFee || 0) + ')' : 'Maya'}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Ardayda_Firfircoon_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-fade-in">
      <div className="bg-white rounded-3xl p-5 sm:p-7 max-w-4xl w-full shadow-2xl space-y-5 border border-slate-100 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-2xl">
              <UserCheck className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
                Liiska Ardayda Firfircoon (Active Enrolled Students)
                <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-2.5 py-0.5 rounded-full">
                  {students.length} Arday
                </span>
              </h3>
              <p className="text-slate-400 text-xs mt-0.5">
                Kormeer dhammaystiran oo ku saabsan dhammaan ardayda hadda diiwaangashan
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filters and Search Bar */}
        <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between shrink-0">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Raadi arday, ID, waalid ama tel..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200/80 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <select
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200/80 rounded-xl text-xs font-bold text-slate-700 outline-none cursor-pointer"
            >
              <option value="all">Dhammaan Fasallada</option>
              {classes.map(c => (
                <option key={c.id} value={c.name}>{c.name}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={handleExportCSV}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              CSV
            </button>
          </div>
        </div>

        {/* Table Content */}
        <div className="flex-1 overflow-y-auto min-h-0 border border-slate-100 rounded-2xl">
          {filtered.length === 0 ? (
            <div className="p-10 text-center text-slate-400 text-xs">
              Wax arday ah oo shuruudahan buuxiyay lama helin.
            </div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead className="sticky top-0 bg-slate-100 border-b border-slate-200 text-slate-600 font-bold z-10">
                <tr>
                  <th className="p-3">ID</th>
                  <th className="p-3">Magaca Ardayga</th>
                  <th className="p-3">Fasalka</th>
                  <th className="p-3">Waalidka & Tel</th>
                  <th className="p-3 text-right">Fiiga</th>
                  <th className="p-3 text-center">Baska</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filtered.map(s => (
                  <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-3 font-mono font-bold text-slate-700">{s.id}</td>
                    <td className="p-3 font-bold text-slate-900">{s.name}</td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 font-bold rounded-md">
                        {s.className || 'Lama qoondayn'}
                      </span>
                    </td>
                    <td className="p-3 text-slate-600">
                      <div className="flex flex-col">
                        <span className="font-semibold text-slate-800">{s.parentName || '-'}</span>
                        <span className="text-[11px] text-slate-400 font-mono">{s.parentPhone || '-'}</span>
                      </div>
                    </td>
                    <td className="p-3 text-right font-extrabold text-emerald-700 font-mono">
                      ${s.monthlyFee || 0}
                    </td>
                    <td className="p-3 text-center">
                      {s.hasBusService ? (
                        <span className="px-2 py-0.5 bg-sky-50 text-sky-700 font-bold rounded-md text-[10px]">
                          Haa (${s.busFee || 0})
                        </span>
                      ) : (
                        <span className="text-slate-300 text-[10px]">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer with Quick Navigation Jump */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-100 shrink-0">
          <span className="text-xs text-slate-500 font-medium">
            Muujinaya <strong>{filtered.length}</strong> oo ka mid ah {students.length} arday
          </span>
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={() => {
                onClose();
                onNavigateTab('students');
              }}
              className="py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
            >
              <Users className="w-4 h-4" />
              Aad Qaybta Maamulka Ardayda (Go to Students Tab)
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              Xir
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// 2. PARENTS DIRECTORY MODAL
export function ParentsModal({
  database,
  onNavigateTab,
  onClose
}: DashboardModalBaseProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'Active' | 'Suspended'>('all');

  const parentsList = useMemo(() => {
    const map = new Map<string, {
      parentName: string;
      parentPhone: string;
      children: Student[];
      status: 'Active' | 'Suspended';
    }>();

    (database.students || []).forEach(s => {
      const phoneKey = (s.parentPhone || '').trim() || (s.parentName || '').trim() || s.id;
      if (!phoneKey) return;

      const isStudentActive = s.active !== false && s.status !== 'suspended' && s.status !== 'inactive';
      const existing = map.get(phoneKey);
      if (!existing) {
        map.set(phoneKey, {
          parentName: s.parentName || 'Waalid',
          parentPhone: s.parentPhone || '',
          children: [s],
          status: isStudentActive ? 'Active' : 'Suspended'
        });
      } else {
        existing.children.push(s);
        if (isStudentActive) {
          existing.status = 'Active';
        }
      }
    });

    return Array.from(map.values());
  }, [database.students]);

  const filtered = useMemo(() => {
    return parentsList.filter(p => {
      const matchSearch = !search ||
        p.parentName.toLowerCase().includes(search.toLowerCase()) ||
        p.parentPhone.includes(search) ||
        p.children.some(c => c.name.toLowerCase().includes(search.toLowerCase()));

      const matchStatus = statusFilter === 'all' || p.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [parentsList, search, statusFilter]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-fade-in">
      <div className="bg-white rounded-3xl p-5 sm:p-7 max-w-4xl w-full shadow-2xl space-y-5 border border-slate-100 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-2xl">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
                Xogta & Xaaladda Waalidiinta (Parents Directory)
                <span className="text-xs bg-indigo-100 text-indigo-800 font-bold px-2.5 py-0.5 rounded-full">
                  {parentsList.length} Waalid
                </span>
              </h3>
              <p className="text-slate-400 text-xs mt-0.5">
                Liiska waalidiinta carruurtoodu dhigtaan dugsiga iyo xiriirkooda tooska ah
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter controls */}
        <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between shrink-0">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Raadi magaca waalidka, taleefanka, ama magaca ilmaha..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200/80 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                statusFilter === 'all'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Dhammaan ({parentsList.length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('Active')}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                statusFilter === 'Active'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Active ({parentsList.filter(p => p.status === 'Active').length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('Suspended')}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                statusFilter === 'Suspended'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Suspended ({parentsList.filter(p => p.status === 'Suspended').length})
            </button>
          </div>
        </div>

        {/* Directory List */}
        <div className="flex-1 overflow-y-auto min-h-0 border border-slate-100 rounded-2xl divide-y divide-slate-100">
          {filtered.length === 0 ? (
            <div className="p-10 text-center text-slate-400 text-xs">
              Wax waalid ah oo shuruudahan buuxiyay lama helin.
            </div>
          ) : (
            filtered.map((p, idx) => (
              <div key={idx} className="p-4 hover:bg-slate-50/80 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-slate-900 text-sm">{p.parentName}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      p.status === 'Active' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                    }`}>
                      {p.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-500 font-medium">
                    <span className="font-mono flex items-center gap-1 text-slate-700">
                      <Phone className="w-3 h-3 text-slate-400" />
                      {p.parentPhone || 'Telefoon lama hayo'}
                    </span>
                    <span>•</span>
                    <span>Carruurta: <strong>{p.children.map(c => c.name).join(', ')}</strong></span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {p.parentPhone && (
                    <a
                      href={`https://wa.me/${p.parentPhone.replace(/[^0-9]/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="py-1.5 px-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition-all"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      WhatsApp
                    </a>
                  )}
                  {p.parentPhone && (
                    <a
                      href={`tel:${p.parentPhone}`}
                      className="py-1.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition-all"
                    >
                      <Phone className="w-3.5 h-3.5" />
                      Wac
                    </a>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-100 shrink-0">
          <span className="text-xs text-slate-500 font-medium">
            Waalidiinta la helay: <strong>{filtered.length}</strong>
          </span>
          <button
            type="button"
            onClick={onClose}
            className="py-2.5 px-5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
          >
            Xir
          </button>
        </div>
      </div>
    </div>
  );
}

// 3. TUITION INVOICED MODAL
export function TuitionInvoicedModal({
  database,
  currentMonth,
  onNavigateTab,
  onClose
}: DashboardModalBaseProps & { currentMonth: string }) {
  const [search, setSearch] = useState('');

  const activeStudents = useMemo(() => {
    return (database.students || []).filter(s => s.active !== false && (s.status === undefined || s.status === 'Active' || s.status === 'active'));
  }, [database.students]);

  const totalTuition = useMemo(() => {
    return activeStudents.reduce((sum, s) => sum + (Number(s.monthlyFee) || 0), 0);
  }, [activeStudents]);

  const classBreakdown = useMemo(() => {
    const map = new Map<string, { count: number; tuition: number }>();
    activeStudents.forEach(s => {
      const cls = s.className || 'Unassigned';
      const cur = map.get(cls) || { count: 0, tuition: 0 };
      cur.count += 1;
      cur.tuition += Number(s.monthlyFee) || 0;
      map.set(cls, cur);
    });
    return Array.from(map.entries()).map(([name, data]) => ({ name, ...data }));
  }, [activeStudents]);

  const filtered = useMemo(() => {
    return activeStudents.filter(s => {
      return !search ||
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        s.id.toLowerCase().includes(search.toLowerCase()) ||
        (s.className && s.className.toLowerCase().includes(search.toLowerCase()));
    });
  }, [activeStudents, search]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-fade-in">
      <div className="bg-white rounded-3xl p-5 sm:p-7 max-w-4xl w-full shadow-2xl space-y-5 border border-slate-100 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-50 text-emerald-700 rounded-2xl">
              <Calculator className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
                Kashifida Lacagta Waxbarashada (Tuition Invoiced) - {currentMonth}
                <span className="text-xs bg-emerald-100 text-emerald-800 font-black px-2.5 py-0.5 rounded-full font-mono">
                  ${totalTuition.toFixed(2)}
                </span>
              </h3>
              <p className="text-slate-400 text-xs mt-0.5">
                Wadarta lacagta waxbarashada ee ardayda firfircoon looga filayo bishan
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 shrink-0">
          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Wadarta Ardayda</span>
            <span className="text-xl font-black text-slate-900 mt-1 block">{activeStudents.length} Arday</span>
          </div>
          <div className="p-3.5 bg-emerald-50/60 rounded-2xl border border-emerald-200/80">
            <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">Wadarta Dues-ka</span>
            <span className="text-xl font-black text-emerald-800 mt-1 block font-mono">${totalTuition.toFixed(2)}</span>
          </div>
          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Celcelis / Arday</span>
            <span className="text-xl font-black text-slate-900 mt-1 block font-mono">
              ${activeStudents.length ? (totalTuition / activeStudents.length).toFixed(2) : '0.00'}
            </span>
          </div>
        </div>

        {/* Search */}
        <div className="relative shrink-0">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Raadi arday, ID ama fasal..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200/80 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500/20"
          />
        </div>

        {/* Student Fee List */}
        <div className="flex-1 overflow-y-auto min-h-0 border border-slate-100 rounded-2xl">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="sticky top-0 bg-slate-100 border-b border-slate-200 text-slate-600 font-bold z-10">
              <tr>
                <th className="p-3">ID</th>
                <th className="p-3">Magaca Ardayga</th>
                <th className="p-3">Fasalka</th>
                <th className="p-3">Waalidka</th>
                <th className="p-3 text-right">Fiiga Waxbarashada</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filtered.map(s => (
                <tr key={s.id} className="hover:bg-slate-50">
                  <td className="p-3 font-mono font-bold text-slate-700">{s.id}</td>
                  <td className="p-3 font-bold text-slate-900">{s.name}</td>
                  <td className="p-3 text-slate-600">{s.className || '-'}</td>
                  <td className="p-3 text-slate-600">{s.parentName || '-'}</td>
                  <td className="p-3 text-right font-black text-emerald-700 font-mono">${s.monthlyFee || 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-100 shrink-0">
          <span className="text-xs text-slate-500">
            Ardayda liiska ku jirta: <strong>{filtered.length}</strong>
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                onClose();
                onNavigateTab('billing', 'fees');
              }}
              className="py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
            >
              <CircleDollarSign className="w-4 h-4" />
              Aad Qaybta Lacag-bixinta (Go to Billing Tab)
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              Xir
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// 4. COLLECTED FEES BREAKDOWN MODAL
export function CollectedFeesModal({
  database,
  currentMonth,
  onNavigateTab,
  onClose
}: DashboardModalBaseProps & { currentMonth: string }) {
  const [search, setSearch] = useState('');

  const paidInvoices = useMemo(() => {
    return (database.invoices || []).filter(inv => {
      const matchMonth = !currentMonth || currentMonth === 'All' || inv.date.startsWith(currentMonth);
      const paid = Number(inv.amountPaid ?? inv.paidAmount ?? 0);
      const isPaid = inv.status === 'Paid' || paid > 0;
      return matchMonth && isPaid;
    });
  }, [database.invoices, currentMonth]);

  const totalCollected = useMemo(() => {
    return paidInvoices.reduce((sum, inv) => {
      const paid = Number(inv.amountPaid ?? inv.paidAmount ?? (inv.status === 'Paid' ? Number(inv.totalAmount) || 0 : 0));
      return sum + paid;
    }, 0);
  }, [paidInvoices]);

  const filtered = useMemo(() => {
    return paidInvoices.filter(inv => {
      return !search ||
        inv.recipientName.toLowerCase().includes(search.toLowerCase()) ||
        inv.invoiceNo.toLowerCase().includes(search.toLowerCase()) ||
        (inv.recipientPhone && inv.recipientPhone.includes(search));
    });
  }, [paidInvoices, search]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-fade-in">
      <div className="bg-white rounded-3xl p-5 sm:p-7 max-w-4xl w-full shadow-2xl space-y-5 border border-slate-100 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-teal-50 text-teal-700 rounded-2xl">
              <CircleDollarSign className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
                Faahfaahinta Lacagaha La Qabtay (Collected Fees) - {currentMonth}
                <span className="text-xs bg-teal-100 text-teal-800 font-black px-2.5 py-0.5 rounded-full font-mono">
                  ${totalCollected.toFixed(2)}
                </span>
              </h3>
              <p className="text-slate-400 text-xs mt-0.5">
                Rasiidhada iyo biilasha la bixiyay bishan gudaheeda
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div className="relative shrink-0">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Raadi rasiidh, magaca bixiyaha, tel..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200/80 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:bg-white focus:ring-2 focus:ring-teal-500/20"
          />
        </div>

        {/* Invoices List */}
        <div className="flex-1 overflow-y-auto min-h-0 border border-slate-100 rounded-2xl">
          {filtered.length === 0 ? (
            <div className="p-10 text-center text-slate-400 text-xs">
              Wax lacag-bixin ah oo la helay ma jiraan.
            </div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead className="sticky top-0 bg-slate-100 border-b border-slate-200 text-slate-600 font-bold z-10">
                <tr>
                  <th className="p-3">Rasiidh #</th>
                  <th className="p-3">Taariikhda</th>
                  <th className="p-3">Bixiyaha / Ardayga</th>
                  <th className="p-3">Qaabka Bixinta</th>
                  <th className="p-3 text-right">Lacagta La Bixiyay</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filtered.map(inv => {
                  const paid = Number(inv.paidAmount) || (inv.status === 'Paid' ? Number(inv.totalAmount) || 0 : 0);
                  return (
                    <tr key={inv.id} className="hover:bg-slate-50">
                      <td className="p-3 font-mono font-bold text-teal-700">{inv.invoiceNo}</td>
                      <td className="p-3 text-slate-500">{inv.date}</td>
                      <td className="p-3">
                        <span className="font-bold text-slate-900 block">{inv.recipientName}</span>
                        {inv.recipientPhone && (
                          <span className="text-[10.5px] text-slate-400 font-mono">{inv.recipientPhone}</span>
                        )}
                      </td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-700 font-bold rounded-md text-[10.5px]">
                          {(inv as any).paymentMethod || 'Cash'}
                        </span>
                      </td>
                      <td className="p-3 text-right font-black text-teal-700 font-mono text-sm">
                        ${paid.toFixed(2)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-100 shrink-0">
          <span className="text-xs text-slate-500">
            Wadarta rasiidhada: <strong>{filtered.length}</strong> (Wadarta: <strong>${totalCollected.toFixed(2)}</strong>)
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                onClose();
                onNavigateTab('billing', 'fees');
              }}
              className="py-2.5 px-4 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
            >
              <CircleDollarSign className="w-4 h-4" />
              Aad Qaybta Lacag-bixinta (Go to Billing Tab)
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              Xir
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// 5. PENDING BALANCE MODAL (UNPAID STUDENTS)
export function PendingFeesModal({
  database,
  currentMonth,
  onNavigateTab,
  onClose
}: DashboardModalBaseProps & { currentMonth: string }) {
  const [search, setSearch] = useState('');
  const [classFilter, setClassFilter] = useState('all');

  const classes = useMemo(() => database.classes || [], [database.classes]);

  const unpaidList = useMemo(() => {
    // Find students whose invoices for currentMonth are unpaid or missing
    const activeStudents = (database.students || []).filter(s => s.active !== false && (s.status === undefined || s.status === 'Active' || s.status === 'active'));
    const invoices = database.invoices || [];

    return activeStudents.map(s => {
      const studentInvoices = invoices.filter(inv => 
        (inv.studentId === s.id || inv.recipientName?.toLowerCase() === s.name?.toLowerCase()) &&
        (!currentMonth || currentMonth === 'All' || inv.date.startsWith(currentMonth))
      );

      const fee = Number(s.monthlyFee) || 0;
      const isBusRider = Boolean(s.hasBusService || (s.busFee && s.busFee > 0));
      const bus = isBusRider ? Number(s.busFee) || 0 : 0;
      const totalDue = fee + bus;

      const paid = studentInvoices.reduce((sum, inv) => {
        return sum + (Number(inv.amountPaid ?? inv.paidAmount ?? (inv.status === 'Paid' ? Number(inv.totalAmount) || 0 : 0)));
      }, 0);

      const pending = Math.max(0, totalDue - paid);

      return {
        student: s,
        fee,
        bus,
        totalDue,
        paid,
        pending
      };
    }).filter(item => item.pending > 0);
  }, [database.students, database.invoices, currentMonth]);

  const totalPending = useMemo(() => {
    return unpaidList.reduce((sum, item) => sum + item.pending, 0);
  }, [unpaidList]);

  const filtered = useMemo(() => {
    return unpaidList.filter(item => {
      const matchSearch = !search ||
        item.student.name.toLowerCase().includes(search.toLowerCase()) ||
        item.student.id.toLowerCase().includes(search.toLowerCase()) ||
        (item.student.parentName && item.student.parentName.toLowerCase().includes(search.toLowerCase())) ||
        (item.student.parentPhone && item.student.parentPhone.includes(search));

      const matchClass = classFilter === 'all' || item.student.className === classFilter;
      return matchSearch && matchClass;
    });
  }, [unpaidList, search, classFilter]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-fade-in">
      <div className="bg-white rounded-3xl p-5 sm:p-7 max-w-4xl w-full shadow-2xl space-y-5 border border-slate-100 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-rose-50 text-rose-600 rounded-2xl">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
                Ardayda aan Bixin Lacagta (Pending Balance) - {currentMonth}
                <span className="text-xs bg-rose-100 text-rose-800 font-black px-2.5 py-0.5 rounded-full font-mono">
                  ${totalPending.toFixed(2)}
                </span>
              </h3>
              <p className="text-slate-400 text-xs mt-0.5">
                Liiska ardayda lacagtu ku harsan tahay iyo fariin toos ah oo loo diri karo waalidka
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between shrink-0">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Raadi arday, waalid ama tel..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200/80 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:bg-white focus:ring-2 focus:ring-rose-500/20"
            />
          </div>
          <select
            value={classFilter}
            onChange={(e) => setClassFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200/80 rounded-xl text-xs font-bold text-slate-700 outline-none cursor-pointer"
          >
            <option value="all">Dhammaan Fasallada</option>
            {classes.map(c => (
              <option key={c.id} value={c.name}>{c.name}</option>
            ))}
          </select>
        </div>

        {/* Unpaid List Table */}
        <div className="flex-1 overflow-y-auto min-h-0 border border-slate-100 rounded-2xl">
          {filtered.length === 0 ? (
            <div className="p-10 text-center text-emerald-600 font-bold text-xs">
              🎉 Ma jiraan arday lacag lagu leeyahay shuruudahan hoos yimaada!
            </div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead className="sticky top-0 bg-slate-100 border-b border-slate-200 text-slate-600 font-bold z-10">
                <tr>
                  <th className="p-3">Ardayga</th>
                  <th className="p-3">Fasalka</th>
                  <th className="p-3">Waalidka & Tel</th>
                  <th className="p-3 text-right">Lacagta Dhiman</th>
                  <th className="p-3 text-center">Fariin WhatsApp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filtered.map((item, idx) => {
                  const s = item.student;
                  const waText = encodeURIComponent(
                    `Asc ${s.parentName || 'Waalid'}, waxaan si xushmad leh kuugu xasuusinaynaa lacagta bisha (${currentMonth}) ee ardayga (${s.name}) oo ah $${item.pending}. Fadlan ku soo dir xisaabta Dugsiga Subuc. Mahadsanid.`
                  );
                  return (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="p-3">
                        <span className="font-bold text-slate-900 block">{s.name}</span>
                        <span className="text-[10px] text-slate-400 font-mono">{s.id}</span>
                      </td>
                      <td className="p-3 text-slate-600">{s.className || '-'}</td>
                      <td className="p-3 text-slate-600">
                        <div className="flex flex-col">
                          <span className="font-semibold text-slate-800">{s.parentName || '-'}</span>
                          <span className="text-[11px] text-slate-400 font-mono">{s.parentPhone || '-'}</span>
                        </div>
                      </td>
                      <td className="p-3 text-right font-black text-rose-600 font-mono text-sm">
                        ${item.pending.toFixed(2)}
                      </td>
                      <td className="p-3 text-center">
                        {s.parentPhone ? (
                          <a
                            href={`https://wa.me/${s.parentPhone.replace(/[^0-9]/g, '')}?text=${waText}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="py-1.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[11px] font-bold inline-flex items-center gap-1.5 shadow-sm transition-all"
                          >
                            <Send className="w-3 h-3" />
                            Xasuusin
                          </a>
                        ) : (
                          <span className="text-slate-300 text-[10px]">Tel la'aan</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-100 shrink-0">
          <span className="text-xs text-slate-500">
            Ardayda dhiman: <strong>{filtered.length}</strong> (Wadarta: <strong>${totalPending.toFixed(2)}</strong>)
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                onClose();
                onNavigateTab('billing', 'fees');
              }}
              className="py-2.5 px-4 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
            >
              <CircleDollarSign className="w-4 h-4" />
              Aad Qaybta Lacag-bixinta (Go to Billing Tab)
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              Xir
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// 6. BUS INVOICED MODAL
export function BusInvoicedModal({
  database,
  currentMonth,
  onNavigateTab,
  onClose
}: DashboardModalBaseProps & { currentMonth: string }) {
  const [search, setSearch] = useState('');

  const busRiders = useMemo(() => {
    return (database.students || []).filter(s => s.active !== false && (s.status === undefined || s.status === 'Active' || s.status === 'active') && Boolean(s.hasBusService || (s.busFee && s.busFee > 0)));
  }, [database.students]);

  const totalBusInvoiced = useMemo(() => {
    return busRiders.reduce((sum, s) => sum + (Number(s.busFee) || 0), 0);
  }, [busRiders]);

  const filtered = useMemo(() => {
    return busRiders.filter(s => {
      return !search ||
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        s.id.toLowerCase().includes(search.toLowerCase()) ||
        (s.className && s.className.toLowerCase().includes(search.toLowerCase())) ||
        (s.parentPhone && s.parentPhone.includes(search));
    });
  }, [busRiders, search]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-fade-in">
      <div className="bg-white rounded-3xl p-5 sm:p-7 max-w-4xl w-full shadow-2xl space-y-5 border border-slate-100 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-sky-50 text-sky-700 rounded-2xl">
              <Bus className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
                Kashifida Lacagta Baska (Bus Invoiced) - {currentMonth}
                <span className="text-xs bg-sky-100 text-sky-800 font-black px-2.5 py-0.5 rounded-full font-mono">
                  ${totalBusInvoiced.toFixed(2)}
                </span>
              </h3>
              <p className="text-slate-400 text-xs mt-0.5">
                Wadarta lacagta adeegga baska ee ardayda raaca looga filayo bishan
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div className="relative shrink-0">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Raadi ardayga baska raaca, ID, fasal..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200/80 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:bg-white focus:ring-2 focus:ring-sky-500/20"
          />
        </div>

        {/* Riders Table */}
        <div className="flex-1 overflow-y-auto min-h-0 border border-slate-100 rounded-2xl">
          {filtered.length === 0 ? (
            <div className="p-10 text-center text-slate-400 text-xs">
              Wax arday baska raaca ah lama helin.
            </div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead className="sticky top-0 bg-slate-100 border-b border-slate-200 text-slate-600 font-bold z-10">
                <tr>
                  <th className="p-3">ID</th>
                  <th className="p-3">Magaca Ardayga</th>
                  <th className="p-3">Fasalka</th>
                  <th className="p-3">Waalidka & Tel</th>
                  <th className="p-3 text-right">Fiiga Baska</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filtered.map(s => (
                  <tr key={s.id} className="hover:bg-slate-50">
                    <td className="p-3 font-mono font-bold text-slate-700">{s.id}</td>
                    <td className="p-3 font-bold text-slate-900">{s.name}</td>
                    <td className="p-3 text-slate-600">{s.className || '-'}</td>
                    <td className="p-3 text-slate-600">{s.parentName || '-'} ({s.parentPhone || '-'})</td>
                    <td className="p-3 text-right font-black text-sky-700 font-mono text-sm">${s.busFee || 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-100 shrink-0">
          <span className="text-xs text-slate-500">
            Rakaabka baska: <strong>{filtered.length}</strong> (Wadarta: <strong>${totalBusInvoiced.toFixed(2)}</strong>)
          </span>
          <button
            type="button"
            onClick={onClose}
            className="py-2.5 px-5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
          >
            Xir
          </button>
        </div>
      </div>
    </div>
  );
}

// 7. ACTIVE RIDERS MODAL
export function ActiveRidersModal({
  database,
  onNavigateTab,
  onClose
}: DashboardModalBaseProps) {
  return (
    <BusInvoicedModal
      database={database}
      currentMonth="All"
      onNavigateTab={onNavigateTab}
      onClose={onClose}
    />
  );
}

// 8. BUS COLLECTED MODAL
export function BusCollectedModal({
  database,
  currentMonth,
  onNavigateTab,
  onClose
}: DashboardModalBaseProps & { currentMonth: string }) {
  return (
    <CollectedFeesModal
      database={database}
      currentMonth={currentMonth}
      onNavigateTab={onNavigateTab}
      onClose={onClose}
    />
  );
}

// 9. PENDING BUS MODAL
export function PendingBusModal({
  database,
  currentMonth,
  onNavigateTab,
  onClose
}: DashboardModalBaseProps & { currentMonth: string }) {
  return (
    <PendingFeesModal
      database={database}
      currentMonth={currentMonth}
      onNavigateTab={onNavigateTab}
      onClose={onClose}
    />
  );
}
