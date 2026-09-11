import React, { useState, useMemo } from 'react';
import {
  CircleDollarSign,
  Receipt,
  Printer,
  Plus,
  Search,
  Download,
  Trash2,
  Edit2,
  FileText,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Clock,
  ExternalLink,
  ChevronDown,
  X,
  Building2,
  Users,
  Calendar,
  Save,
  Check,
  Send,
  Bus,
  ShieldCheck,
  Filter
} from 'lucide-react';
import { DatabaseState, Student, BillingRecord, Invoice, InvoiceItem } from '../types';
import { DEFAULT_INVOICE_ACCOUNTS_NOTE, triggerFileDownload } from '../db';
import jsPDF from 'jspdf';
import { DugsigaSubucLogo } from './Logo';

interface BillingTabProps {
  database: DatabaseState;
  onSaveDatabase: (
    updatedDb: DatabaseState,
    options?: {
      userRole?: 'admin' | 'teacher' | null;
      explicitDeletedInvoiceIds?: string[];
      preferIncomingMeta?: boolean;
    }
  ) => void;
  initialSubTab?: 'fees' | 'custom_invoices';
  isReceiptsHistoryOnly?: boolean;
}

export function BillingTab({
  database,
  onSaveDatabase,
  initialSubTab = 'fees',
  isReceiptsHistoryOnly = false
}: BillingTabProps) {
  // Current active subtab: 'fees' | 'custom_invoices' | 'receipts_history'
  const [activeSubTab, setActiveSubTab] = useState<'fees' | 'custom_invoices' | 'receipts_history'>(() => {
    if (isReceiptsHistoryOnly) return 'receipts_history';
    return initialSubTab;
  });

  // Current month string formatted like "2026-09"
  const currentMonthStr = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }, []);

  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthStr);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedClass, setSelectedClass] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Paid' | 'Partial' | 'Unpaid'>('All');

  // Modals state
  const [payModalStudent, setPayModalStudent] = useState<Student | null>(null);
  const [payAmountDue, setPayAmountDue] = useState<number>(35);
  const [payAmountPaid, setPayAmountPaid] = useState<number>(35);
  const [payBusFeeDue, setPayBusFeeDue] = useState<number>(0);
  const [payBusFeePaid, setPayBusFeePaid] = useState<number>(0);
  const [payNotes, setPayNotes] = useState<string>('');

  const [showInvoiceModal, setShowInvoiceModal] = useState<boolean>(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [invRecipientType, setInvRecipientType] = useState<'parent' | 'business'>('parent');
  const [invRecipientName, setInvRecipientName] = useState<string>('');
  const [invRecipientPhone, setInvRecipientPhone] = useState<string>('');
  const [invRecipientEmail, setInvRecipientEmail] = useState<string>('');
  const [invStudentIds, setInvStudentIds] = useState<string[]>([]);
  const [invDate, setInvDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [invDueDate, setInvDueDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 10);
    return d.toISOString().split('T')[0];
  });
  const [invItems, setInvItems] = useState<InvoiceItem[]>([
    { id: '1', description: 'Bisha ' + currentMonthStr + ' - Waxbarashada Dugsiga', quantity: 1, unitPrice: 35, total: 35 }
  ]);
  const [invNotes, setInvNotes] = useState<string>(DEFAULT_INVOICE_ACCOUNTS_NOTE);
  const [invStatus, setInvStatus] = useState<'Paid' | 'Unpaid' | 'Partial'>('Unpaid');
  const [invAmountPaid, setInvAmountPaid] = useState<number>(0);

  const [viewReceiptRecord, setViewReceiptRecord] = useState<BillingRecord | null>(null);
  const [viewInvoiceRecord, setViewInvoiceRecord] = useState<Invoice | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<string>('');

  // Active students
  const activeStudents = useMemo(() => {
    return (database.students || []).filter(
      s => s.active !== false && (s.status === undefined || s.status === 'Active' || s.status === 'active')
    );
  }, [database.students]);

  // Unique classes
  const classesList = useMemo(() => {
    const fromClasses = (database.classes || []).map(c => typeof c === 'string' ? c : (c as any).name || String(c));
    const fromStudents = activeStudents.map(s => s.className).filter(Boolean);
    return Array.from(new Set([...fromClasses, ...fromStudents]));
  }, [database.classes, activeStudents]);

  // Unique months available in billing records
  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    months.add(currentMonthStr);
    (database.billing || []).forEach(b => {
      if (b.month) months.add(b.month);
    });
    return Array.from(months).sort().reverse();
  }, [database.billing, currentMonthStr]);

  // Combined student fee calculation for selected month
  const studentFeeRows = useMemo(() => {
    return activeStudents.map(student => {
      const keyId = `B-${selectedMonth}-${student.id}`;
      const rec = (database.billing || []).find(
        b => b.id === keyId || (b.studentId === student.id && b.month === selectedMonth)
      );

      const due = rec ? rec.amountDue : (student.monthlyFee || 35);
      const paid = rec ? rec.amountPaid : 0;
      const busDue = rec?.busFeeDue ?? (student.busFee || 0);
      const busPaid = rec?.busFeePaid ?? 0;
      const debt = rec?.debtAmount ?? Math.max(0, due - paid);
      const status = rec ? rec.status : paid >= due && due > 0 ? 'Paid' : paid > 0 ? 'Partial' : 'Unpaid';

      return {
        student,
        record: rec,
        month: selectedMonth,
        amountDue: due,
        amountPaid: paid,
        busFeeDue: busDue,
        busFeePaid: busPaid,
        debtAmount: debt,
        status: status as 'Paid' | 'Partial' | 'Unpaid',
        paymentDate: rec?.paymentDate || null,
        receiptNo: rec?.receiptNo || null
      };
    });
  }, [activeStudents, database.billing, selectedMonth]);

  // Filtered student fee rows
  const filteredFeeRows = useMemo(() => {
    return studentFeeRows.filter(row => {
      const matchClass = selectedClass === 'All' || row.student.className === selectedClass;
      const matchStatus = statusFilter === 'All' || row.status === statusFilter;
      const matchSearch =
        !searchQuery ||
        row.student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        row.student.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (row.student.parentPhone && row.student.parentPhone.includes(searchQuery));
      return matchClass && matchStatus && matchSearch;
    });
  }, [studentFeeRows, selectedClass, statusFilter, searchQuery]);

  // KPI Metrics for selected month
  const feeMetrics = useMemo(() => {
    let totalInvoiced = 0;
    let totalCollected = 0;
    let totalDebt = 0;
    let totalBusInvoiced = 0;
    let totalBusCollected = 0;

    studentFeeRows.forEach(row => {
      totalInvoiced += row.amountDue;
      totalCollected += row.amountPaid;
      totalDebt += row.debtAmount;
      totalBusInvoiced += row.busFeeDue;
      totalBusCollected += row.busFeePaid;
    });

    return { totalInvoiced, totalCollected, totalDebt, totalBusInvoiced, totalBusCollected };
  }, [studentFeeRows]);

  // All receipts from billing records
  const allReceipts = useMemo(() => {
    return (database.billing || [])
      .filter(b => b.amountPaid > 0 || b.receiptNo)
      .sort((a, b) => (b.paymentDate || '').localeCompare(a.paymentDate || '') || (b.receiptNo || '').localeCompare(a.receiptNo || ''));
  }, [database.billing]);

  // Filtered receipts
  const filteredReceipts = useMemo(() => {
    return allReceipts.filter(r => {
      const matchMonth = selectedMonth === 'All' || r.month === selectedMonth;
      const matchSearch =
        !searchQuery ||
        (r.studentName && r.studentName.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (r.receiptNo && r.receiptNo.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (r.studentId && r.studentId.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchMonth && matchSearch;
    });
  }, [allReceipts, selectedMonth, searchQuery]);

  // Invoices list
  const invoicesList = useMemo(() => {
    return [...(database.invoices || [])].sort((a, b) => b.date.localeCompare(a.date));
  }, [database.invoices]);

  const filteredInvoices = useMemo(() => {
    return invoicesList.filter(inv => {
      const matchSearch =
        !searchQuery ||
        inv.invoiceNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
        inv.recipientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (inv.recipientPhone && inv.recipientPhone.includes(searchQuery));
      const matchStatus = statusFilter === 'All' || inv.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [invoicesList, searchQuery, statusFilter]);

  // Open Payment Modal
  const handleOpenPayModal = (student: Student) => {
    const keyId = `B-${selectedMonth}-${student.id}`;
    const rec = (database.billing || []).find(
      b => b.id === keyId || (b.studentId === student.id && b.month === selectedMonth)
    );

    setPayModalStudent(student);
    setPayAmountDue(rec ? rec.amountDue : student.monthlyFee || 35);
    setPayAmountPaid(rec ? rec.amountPaid : student.monthlyFee || 35);
    setPayBusFeeDue(rec ? (rec.busFeeDue ?? student.busFee ?? 0) : student.busFee || 0);
    setPayBusFeePaid(rec ? (rec.busFeePaid ?? student.busFee ?? 0) : student.busFee || 0);
    setPayNotes(rec ? rec.notes || '' : '');
  };

  // Save payment details
  const handleSavePayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!payModalStudent) return;

    const student = payModalStudent;
    const keyId = `B-${selectedMonth}-${student.id}`;
    const dateToday = new Date().toISOString().split('T')[0];
    const receiptNo = `REC-${selectedMonth.replace('-', '')}-${student.id.replace('BJ-', '').replace('ST-', '')}`;

    const debt = Math.max(0, payAmountDue - payAmountPaid);
    const status: 'Paid' | 'Partial' | 'Unpaid' =
      payAmountPaid >= payAmountDue && payAmountDue > 0 ? 'Paid' : payAmountPaid > 0 ? 'Partial' : 'Unpaid';

    const existingIndex = (database.billing || []).findIndex(
      b => b.id === keyId || (b.studentId === student.id && b.month === selectedMonth)
    );

    const billingRecord: BillingRecord = {
      id: keyId,
      studentId: student.id,
      studentName: student.name,
      className: student.className || 'General',
      month: selectedMonth,
      amountDue: payAmountDue,
      amountPaid: payAmountPaid,
      debtAmount: debt,
      busFeeDue: payBusFeeDue,
      busFeePaid: payBusFeePaid,
      status: status,
      paymentDate: dateToday,
      receiptNo: receiptNo,
      notes: payNotes
    };

    let newBilling = [...(database.billing || [])];
    if (existingIndex >= 0) {
      newBilling[existingIndex] = billingRecord;
    } else {
      newBilling.push(billingRecord);
    }

    onSaveDatabase({
      ...database,
      billing: newBilling
    });

    setFeedbackMsg(`Lacag-bixinta ardayga ${student.name} waa la keydiyay (Rasiidh: ${receiptNo})`);
    setTimeout(() => setFeedbackMsg(''), 4000);
    setPayModalStudent(null);
  };

  // Delete billing record
  const handleDeleteBilling = (recordId: string, studentName: string) => {
    if (!window.confirm(`Ma hubtaa inaad tirtirto diwaanka lacag-bixinta ee ${studentName}?`)) return;
    const newBilling = (database.billing || []).filter(b => b.id !== recordId);
    onSaveDatabase({
      ...database,
      billing: newBilling
    });
  };

  // Open Create Invoice Modal
  const handleOpenCreateInvoice = () => {
    setEditingInvoice(null);
    setInvRecipientType('parent');
    setInvRecipientName('');
    setInvRecipientPhone('');
    setInvRecipientEmail('');
    setInvStudentIds([]);
    setInvDate(new Date().toISOString().split('T')[0]);
    const d = new Date();
    d.setDate(d.getDate() + 10);
    setInvDueDate(d.toISOString().split('T')[0]);
    setInvItems([
      { id: '1', description: `Waxbarashada Bisha ${selectedMonth}`, quantity: 1, unitPrice: 35, total: 35 }
    ]);
    setInvNotes(DEFAULT_INVOICE_ACCOUNTS_NOTE);
    setInvStatus('Unpaid');
    setInvAmountPaid(0);
    setShowInvoiceModal(true);
  };

  // Open Edit Invoice Modal
  const handleOpenEditInvoice = (inv: Invoice) => {
    setEditingInvoice(inv);
    setInvRecipientType(inv.recipientType || 'parent');
    setInvRecipientName(inv.recipientName);
    setInvRecipientPhone(inv.recipientPhone || '');
    setInvRecipientEmail(inv.recipientEmail || '');
    setInvStudentIds(inv.studentId ? [inv.studentId] : []);
    setInvDate(inv.date);
    setInvDueDate(inv.dueDate);
    setInvItems(inv.items && inv.items.length > 0 ? inv.items : [{ id: '1', description: 'Fee', quantity: 1, unitPrice: (inv as any).totalAmount || 0, total: (inv as any).totalAmount || 0 }]);
    setInvNotes(inv.notes || DEFAULT_INVOICE_ACCOUNTS_NOTE);
    setInvStatus((inv as any).status || 'Unpaid');
    setInvAmountPaid((inv as any).amountPaid || 0);
    setShowInvoiceModal(true);
  };

  // Save Invoice
  const handleSaveInvoice = (e: React.FormEvent) => {
    e.preventDefault();
    const totalAmount = invItems.reduce((acc, item) => acc + (item.quantity * item.unitPrice), 0);
    const invoiceNo = editingInvoice ? editingInvoice.invoiceNo : `INV-${Date.now().toString().slice(-6)}`;
    const id = editingInvoice ? editingInvoice.id : `INV-${Date.now()}`;

    const newInvoice: Invoice = {
      id,
      invoiceNo,
      recipientType: invRecipientType,
      recipientName: invRecipientName || 'Macaamilka Dugsiga',
      recipientPhone: invRecipientPhone,
      recipientEmail: invRecipientEmail,
      studentId: invStudentIds[0] || undefined,
      studentName: invStudentIds[0] ? activeStudents.find(s => s.id === invStudentIds[0])?.name : undefined,
      date: invDate,
      dueDate: invDueDate,
      items: invItems,
      totalAmount,
      amountPaid: invAmountPaid,
      status: invStatus,
      notes: invNotes,
      createdBy: 'Admin',
      createdAt: editingInvoice?.createdAt || new Date().toISOString()
    };

    let newInvoices = [...(database.invoices || [])];
    if (editingInvoice) {
      const idx = newInvoices.findIndex(i => i.id === editingInvoice.id);
      if (idx >= 0) newInvoices[idx] = newInvoice;
    } else {
      newInvoices.unshift(newInvoice);
    }

    onSaveDatabase({
      ...database,
      invoices: newInvoices
    });

    setShowInvoiceModal(false);
    setFeedbackMsg(`Invoice #${invoiceNo} si guul leh ayaa loo keydiyay!`);
    setTimeout(() => setFeedbackMsg(''), 4000);
  };

  // Delete Invoice
  const handleDeleteInvoice = (id: string, invoiceNo: string) => {
    if (!window.confirm(`Ma hubtaa inaad tirtirto Invoice #${invoiceNo}?`)) return;
    const newInvoices = (database.invoices || []).filter(i => i.id !== id);
    onSaveDatabase(
      {
        ...database,
        invoices: newInvoices
      },
      {
        explicitDeletedInvoiceIds: [id]
      }
    );
  };

  // PDF Export for Receipt
  const handleDownloadReceiptPDF = (record: BillingRecord) => {
    const student = activeStudents.find(s => s.id === record.studentId);
    const doc = new jsPDF();

    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('DUGSIGA SUBUC (مدرسة السبع)', 105, 20, { align: 'center' });
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text('Rasiidha Lacag-bixinta / Official Fee Payment Receipt', 105, 28, { align: 'center' });
    doc.text('Wadada Taleex, Muqdisho, Soomaaliya | Tel: +252 61 5000000', 105, 34, { align: 'center' });

    doc.setDrawColor(200, 200, 200);
    doc.line(14, 40, 196, 40);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(`Rasiidh No: ${record.receiptNo || 'N/A'}`, 14, 48);
    doc.text(`Taariikhda: ${record.paymentDate || record.month}`, 140, 48);

    doc.setFont('helvetica', 'normal');
    doc.text(`Magaca Ardayga: ${record.studentName}`, 14, 56);
    doc.text(`ID-ga Ardayga: ${record.studentId}`, 140, 56);
    doc.text(`Fasalka: ${student?.className || '-'}`, 14, 64);
    doc.text(`Bisha Lacagta: ${record.month}`, 140, 64);
    if (student?.parentPhone) {
      doc.text(`Taleefanka Waalidka: ${student.parentPhone}`, 14, 72);
    }

    doc.line(14, 78, 196, 78);

    // Items table
    doc.setFont('helvetica', 'bold');
    doc.text('Faahfaahinta Lacagta', 14, 86);
    doc.text('Lacagta Lagu Leeyahay', 110, 86);
    doc.text('Lacagta La Bixiyay', 155, 86);

    doc.setFont('helvetica', 'normal');
    let y = 96;
    doc.text(`1. Khidmadda Waxbarashada (Tuition Fee)`, 14, y);
    doc.text(`$${record.amountDue.toFixed(2)}`, 110, y);
    doc.text(`$${record.amountPaid.toFixed(2)}`, 155, y);

    if (record.busFeeDue && record.busFeeDue > 0) {
      y += 8;
      doc.text(`2. Khidmadda Gaadiidka (Bus Transport)`, 14, y);
      doc.text(`$${(record.busFeeDue || 0).toFixed(2)}`, 110, y);
      doc.text(`$${(record.busFeePaid || 0).toFixed(2)}`, 155, y);
    }

    y += 12;
    doc.line(14, y, 196, y);
    y += 8;

    const totalDue = record.amountDue + (record.busFeeDue || 0);
    const totalPaid = record.amountPaid + (record.busFeePaid || 0);
    const totalDebt = record.debtAmount ?? Math.max(0, totalDue - totalPaid);

    doc.setFont('helvetica', 'bold');
    doc.text('Wadarta Guud:', 14, y);
    doc.text(`$${totalDue.toFixed(2)}`, 110, y);
    doc.text(`$${totalPaid.toFixed(2)}`, 155, y);

    y += 8;
    doc.text(`Haraaga Lagu Leeyahay (Remaining Debt): $${totalDebt.toFixed(2)}`, 14, y);

    y += 16;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text('Mahadsanid! Waad ku mahadsan tahay bixinta khidmadda dugsiga.', 105, y, { align: 'center' });

    y += 20;
    doc.text('Saxiixa Maamulka: _______________________', 14, y);
    doc.text('Shaambada Dugsiga: [ OFFICIAL STAMP ]', 130, y);

    doc.save(`Rasiidh_${record.receiptNo || record.studentId}.pdf`);
  };

  // PDF Export for Invoice
  const handleDownloadInvoicePDF = (inv: Invoice) => {
    const doc = new jsPDF();

    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('DUGSIGA SUBUC (مدرسة السبع)', 105, 20, { align: 'center' });
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text('INVOICE / BIILKA WAXBARASHADA', 105, 28, { align: 'center' });
    doc.text('Wadada Taleex, Muqdisho, Soomaaliya | Tel: +252 61 5000000', 105, 34, { align: 'center' });

    doc.line(14, 40, 196, 40);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(`Invoice No: ${inv.invoiceNo}`, 14, 48);
    doc.text(`Taariikhda: ${inv.date}`, 140, 48);
    doc.text(`Muddada Bixinta (Due Date): ${inv.dueDate}`, 140, 56);

    doc.setFont('helvetica', 'normal');
    doc.text(`Ku Socota (Bill To): ${inv.recipientName}`, 14, 56);
    if (inv.recipientPhone) doc.text(`Taleefan: ${inv.recipientPhone}`, 14, 64);
    if (inv.recipientEmail) doc.text(`Email: ${inv.recipientEmail}`, 14, 72);

    doc.line(14, 78, 196, 78);

    // Items table
    doc.setFont('helvetica', 'bold');
    doc.text('#', 14, 86);
    doc.text('Faahfaahinta Adeegga / Waxbarashada', 26, 86);
    doc.text('Tirada', 120, 86);
    doc.text('Qiimaha', 145, 86);
    doc.text('Wadarta', 170, 86);

    doc.line(14, 90, 196, 90);
    doc.setFont('helvetica', 'normal');

    let y = 98;
    (inv.items || []).forEach((item, idx) => {
      doc.text(`${idx + 1}`, 14, y);
      doc.text(item.description.substring(0, 45), 26, y);
      doc.text(`${item.quantity}`, 120, y);
      doc.text(`$${item.unitPrice.toFixed(2)}`, 145, y);
      doc.text(`$${(item.quantity * item.unitPrice).toFixed(2)}`, 170, y);
      y += 8;
    });

    doc.line(14, y, 196, y);
    y += 8;

    doc.setFont('helvetica', 'bold');
    doc.text(`Wadarta Guud (Total Due): $${inv.totalAmount.toFixed(2)}`, 130, y);
    y += 7;
    doc.text(`Lacagta La Bixiyay (Paid): $${(inv.amountPaid || 0).toFixed(2)}`, 130, y);
    y += 7;
    const debt = Math.max(0, inv.totalAmount - (inv.amountPaid || 0));
    doc.text(`Haraaga (Balance Due): $${debt.toFixed(2)}`, 130, y);

    if (inv.notes) {
      y += 14;
      doc.setFontSize(8);
      doc.setFont('helvetica', 'italic');
      const splitNotes = doc.splitTextToSize(inv.notes, 180);
      doc.text(splitNotes, 14, y);
    }

    doc.save(`Invoice_${inv.invoiceNo}.pdf`);
  };

  return (
    <div className="space-y-6 animate-fade-in" id="portal-billing">
      {/* Subtab Switcher Header */}
      <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <span className="p-2 bg-indigo-50 text-indigo-600 rounded-xl inline-flex">
              <CircleDollarSign className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-black text-slate-900">
              {activeSubTab === 'fees'
                ? 'Maamulka Lacag-bixinta & Khidmadaha'
                : activeSubTab === 'custom_invoices'
                ? 'Samee & Maamul Biilasha (Invoices)'
                : 'Rasiidhadii Hore & Taariikhda'}
            </h2>
          </div>
          <p className="text-xs text-slate-500 font-medium">
            Maamul khidmadaha bisha ee ardayda, samee biilal iyo rasiidho rasmi ah.
          </p>
        </div>

        {/* Subtab Toggle Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveSubTab('fees')}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold flex items-center gap-2 transition-all cursor-pointer ${
              activeSubTab === 'fees'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
            }`}
          >
            <CircleDollarSign className="w-4 h-4" />
            <span>Khidmadaha Bishaan</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('custom_invoices')}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold flex items-center gap-2 transition-all cursor-pointer ${
              activeSubTab === 'custom_invoices'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Receipt className="w-4 h-4" />
            <span>Biilasha (Invoices)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('receipts_history')}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold flex items-center gap-2 transition-all cursor-pointer ${
              activeSubTab === 'receipts_history'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Printer className="w-4 h-4" />
            <span>Taariikhda Rasiidhada</span>
          </button>
        </div>
      </div>

      {feedbackMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-bold flex items-center gap-2 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{feedbackMsg}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. FEES SUBTAB (Khidmadaha Bishaan) */}
      {/* ========================================================================= */}
      {activeSubTab === 'fees' && (
        <div className="space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
            <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block">
                Total Invoiced
              </span>
              <span className="text-2xl font-black text-slate-900 mt-1 block">
                ${feeMetrics.totalInvoiced.toFixed(0)}
              </span>
              <span className="text-[10px] text-slate-400 font-semibold mt-0.5 block">
                Bisha {selectedMonth}
              </span>
            </div>

            <div className="bg-emerald-50/70 p-4 rounded-2xl border border-emerald-100 shadow-sm">
              <span className="text-[10px] font-extrabold text-emerald-700 uppercase tracking-widest block">
                Total Collected
              </span>
              <span className="text-2xl font-black text-emerald-800 mt-1 block">
                ${feeMetrics.totalCollected.toFixed(0)}
              </span>
              <span className="text-[10px] text-emerald-600 font-semibold mt-0.5 block">
                {feeMetrics.totalInvoiced > 0
                  ? Math.round((feeMetrics.totalCollected / feeMetrics.totalInvoiced) * 100)
                  : 0}
                % la helay
              </span>
            </div>

            <div className="bg-rose-50/70 p-4 rounded-2xl border border-rose-100 shadow-sm">
              <span className="text-[10px] font-extrabold text-rose-700 uppercase tracking-widest block">
                Outstanding Debt
              </span>
              <span className="text-2xl font-black text-rose-800 mt-1 block">
                ${feeMetrics.totalDebt.toFixed(0)}
              </span>
              <span className="text-[10px] text-rose-600 font-semibold mt-0.5 block">Haraaga dhiman</span>
            </div>

            <div className="bg-amber-50/70 p-4 rounded-2xl border border-amber-100 shadow-sm">
              <span className="text-[10px] font-extrabold text-amber-700 uppercase tracking-widest block">
                Bus Fees Invoiced
              </span>
              <span className="text-2xl font-black text-amber-800 mt-1 block">
                ${feeMetrics.totalBusInvoiced.toFixed(0)}
              </span>
              <span className="text-[10px] text-amber-600 font-semibold mt-0.5 block">Gaadiidka</span>
            </div>

            <div className="bg-indigo-50/70 p-4 rounded-2xl border border-indigo-100 shadow-sm">
              <span className="text-[10px] font-extrabold text-indigo-700 uppercase tracking-widest block">
                Bus Collected
              </span>
              <span className="text-2xl font-black text-indigo-800 mt-1 block">
                ${feeMetrics.totalBusCollected.toFixed(0)}
              </span>
              <span className="text-[10px] text-indigo-600 font-semibold mt-0.5 block">La bixiyay</span>
            </div>
          </div>

          {/* Filters Bar */}
          <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Month Selector */}
              <div>
                <label className="text-[11px] font-extrabold text-slate-600 uppercase tracking-wider block mb-1.5">
                  Bisha Lacagta
                </label>
                <select
                  value={selectedMonth}
                  onChange={e => setSelectedMonth(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {availableMonths.map(m => (
                    <option key={m} value={m}>
                      Bisha {m}
                    </option>
                  ))}
                </select>
              </div>

              {/* Class Filter */}
              <div>
                <label className="text-[11px] font-extrabold text-slate-600 uppercase tracking-wider block mb-1.5">
                  Fasalka
                </label>
                <select
                  value={selectedClass}
                  onChange={e => setSelectedClass(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="All">Dhammaan Fasallada</option>
                  {classesList.map(c => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              {/* Status Filter */}
              <div>
                <label className="text-[11px] font-extrabold text-slate-600 uppercase tracking-wider block mb-1.5">
                  Xaaladda Bixinta
                </label>
                <select
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="All">Dhammaan Xaaladaha</option>
                  <option value="Paid">La Bixiyay (Paid)</option>
                  <option value="Partial">Qayb Bixiyay (Partial)</option>
                  <option value="Unpaid">Lama Bixin (Unpaid)</option>
                </select>
              </div>

              {/* Search */}
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
                    className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-slate-400"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Fees Table */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-extrabold text-slate-900 text-sm">
                Liiska Khidmadaha Ardayda ({filteredFeeRows.length})
              </h3>
              <span className="text-xs text-slate-400 font-semibold">
                Bisha: <span className="font-bold text-slate-700">{selectedMonth}</span>
              </span>
            </div>

            {filteredFeeRows.length === 0 ? (
              <div className="p-12 text-center text-slate-400">
                <CircleDollarSign className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="font-bold text-sm text-slate-600">Arday laguma helin xulashadan</p>
                <p className="text-xs mt-1">Fadlan bedel bisha ama shaandhada aad dooratay.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50/80 text-slate-500 font-extrabold border-b border-slate-100">
                      <th className="p-3.5 pl-6 w-12">#</th>
                      <th className="p-3.5">Ardayga & ID</th>
                      <th className="p-3.5">Fasalka</th>
                      <th className="p-3.5">Khidmadda</th>
                      <th className="p-3.5">La Bixiyay</th>
                      <th className="p-3.5">Haraaga</th>
                      <th className="p-3.5">Xaaladda</th>
                      <th className="p-3.5 text-right pr-6">Tallaabooyinka</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                    {filteredFeeRows.map((row, idx) => (
                      <tr key={row.student.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="p-3.5 pl-6 font-mono text-slate-400">{idx + 1}</td>
                        <td className="p-3.5">
                          <span className="font-black text-slate-900 block">{row.student.name}</span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {row.student.id} {row.student.parentPhone ? `• ${row.student.parentPhone}` : ''}
                          </span>
                        </td>
                        <td className="p-3.5 font-bold text-slate-600">{row.student.className}</td>
                        <td className="p-3.5 font-mono font-bold text-slate-800">
                          ${row.amountDue.toFixed(2)}
                          {row.busFeeDue > 0 ? (
                            <span className="text-[10px] text-amber-600 block">
                              +${row.busFeeDue} Bus
                            </span>
                          ) : null}
                        </td>
                        <td className="p-3.5 font-mono font-bold text-emerald-700">
                          ${row.amountPaid.toFixed(2)}
                        </td>
                        <td className="p-3.5 font-mono font-bold text-rose-600">
                          ${row.debtAmount.toFixed(2)}
                        </td>
                        <td className="p-3.5">
                          <span
                            className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold ${
                              row.status === 'Paid'
                                ? 'bg-emerald-100 text-emerald-800'
                                : row.status === 'Partial'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {row.status === 'Paid' ? 'La Bixiyay' : row.status === 'Partial' ? 'Qayb' : 'Lama Bixin'}
                          </span>
                        </td>
                        <td className="p-3.5 text-right pr-6">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleOpenPayModal(row.student)}
                              className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-extrabold flex items-center gap-1 shadow-sm transition-all cursor-pointer"
                            >
                              <CircleDollarSign className="w-3.5 h-3.5" />
                              <span>Dhiib</span>
                            </button>
                            {row.record && row.amountPaid > 0 && (
                              <button
                                type="button"
                                onClick={() => setViewReceiptRecord(row.record!)}
                                className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-all cursor-pointer"
                                title="Daabac Rasiidh"
                              >
                                <Printer className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {row.record && (
                              <button
                                type="button"
                                onClick={() => handleDeleteBilling(row.record!.id, row.student.name)}
                                className="p-1.5 hover:bg-rose-50 text-rose-500 hover:text-rose-700 rounded-lg transition-all cursor-pointer"
                                title="Tirtir Diwaanka"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. CUSTOM INVOICES SUBTAB */}
      {/* ========================================================================= */}
      {activeSubTab === 'custom_invoices' && (
        <div className="space-y-6">
          <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Raadi Invoice No, Magaca..."
                  className="pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-slate-400 w-64"
                />
              </div>

              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value as any)}
                className="px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="All">Dhammaan Xaaladaha</option>
                <option value="Paid">La Bixiyay (Paid)</option>
                <option value="Partial">Qayb (Partial)</option>
                <option value="Unpaid">Lama Bixin (Unpaid)</option>
              </select>
            </div>

            <button
              type="button"
              onClick={handleOpenCreateInvoice}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-extrabold flex items-center gap-2 shadow-sm transition-all cursor-pointer self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              <span>Samee Invoice Cusub (+ New Invoice)</span>
            </button>
          </div>

          {/* Invoices List */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-extrabold text-slate-900 text-sm">
                Liiska Biilasha / Invoices ({filteredInvoices.length})
              </h3>
            </div>

            {filteredInvoices.length === 0 ? (
              <div className="p-12 text-center text-slate-400">
                <Receipt className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="font-bold text-sm text-slate-600">Biilal laguma helin</p>
                <p className="text-xs mt-1">Guji badhanka sare si aad u samayso Invoice cusub.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50/80 text-slate-500 font-extrabold border-b border-slate-100">
                      <th className="p-3.5 pl-6">Invoice #</th>
                      <th className="p-3.5">Ku Socota (Recipient)</th>
                      <th className="p-3.5">Taariikhda</th>
                      <th className="p-3.5">Muddada (Due)</th>
                      <th className="p-3.5">Wadarta</th>
                      <th className="p-3.5">La Bixiyay</th>
                      <th className="p-3.5">Xaaladda</th>
                      <th className="p-3.5 text-right pr-6">Tallaabooyinka</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                    {filteredInvoices.map(inv => (
                      <tr key={inv.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="p-3.5 pl-6 font-mono font-bold text-indigo-900">{inv.invoiceNo}</td>
                        <td className="p-3.5">
                          <span className="font-bold text-slate-900 block">{inv.recipientName}</span>
                          {inv.recipientPhone && (
                            <span className="text-[10px] text-slate-400 font-mono">{inv.recipientPhone}</span>
                          )}
                        </td>
                        <td className="p-3.5 font-mono text-slate-600">{inv.date}</td>
                        <td className="p-3.5 font-mono text-slate-600">{inv.dueDate}</td>
                        <td className="p-3.5 font-mono font-bold text-slate-900">
                          ${inv.totalAmount.toFixed(2)}
                        </td>
                        <td className="p-3.5 font-mono font-bold text-emerald-700">
                          ${(inv.amountPaid || 0).toFixed(2)}
                        </td>
                        <td className="p-3.5">
                          <span
                            className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold ${
                              inv.status === 'Paid'
                                ? 'bg-emerald-100 text-emerald-800'
                                : inv.status === 'Partial'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {inv.status}
                          </span>
                        </td>
                        <td className="p-3.5 text-right pr-6">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => setViewInvoiceRecord(inv)}
                              className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-all cursor-pointer"
                              title="Daabac / Fiiri"
                            >
                              <Printer className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDownloadInvoicePDF(inv)}
                              className="p-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg transition-all cursor-pointer"
                              title="Soo Dejiso PDF"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenEditInvoice(inv)}
                              className="p-1.5 hover:bg-slate-100 text-slate-600 rounded-lg transition-all cursor-pointer"
                              title="Wax ka beddel"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteInvoice(inv.id, inv.invoiceNo)}
                              className="p-1.5 hover:bg-rose-50 text-rose-500 hover:text-rose-700 rounded-lg transition-all cursor-pointer"
                              title="Tirtir"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. RECEIPTS HISTORY SUBTAB */}
      {/* ========================================================================= */}
      {activeSubTab === 'receipts_history' && (
        <div className="space-y-6">
          <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Raadi Rasiidh No, Magaca..."
                  className="pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-slate-400 w-64"
                />
              </div>

              <select
                value={selectedMonth}
                onChange={e => setSelectedMonth(e.target.value)}
                className="px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="All">Dhammaan Bilaha</option>
                {availableMonths.map(m => (
                  <option key={m} value={m}>
                    Bisha {m}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Receipts Table */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-extrabold text-slate-900 text-sm">
                Taariikhda Rasiidhada ({filteredReceipts.length})
              </h3>
            </div>

            {filteredReceipts.length === 0 ? (
              <div className="p-12 text-center text-slate-400">
                <Printer className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="font-bold text-sm text-slate-600">Rasiidho laguma helin</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50/80 text-slate-500 font-extrabold border-b border-slate-100">
                      <th className="p-3.5 pl-6">Rasiidh #</th>
                      <th className="p-3.5">Ardayga & ID</th>
                      <th className="p-3.5">Bisha</th>
                      <th className="p-3.5">Taariikhda Bixinta</th>
                      <th className="p-3.5">Lacagta La Bixiyay</th>
                      <th className="p-3.5">Haraaga</th>
                      <th className="p-3.5 text-right pr-6">Tallaabooyinka</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                    {filteredReceipts.map(rec => (
                      <tr key={rec.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="p-3.5 pl-6 font-mono font-bold text-emerald-900">
                          {rec.receiptNo || 'REC-' + rec.id}
                        </td>
                        <td className="p-3.5">
                          <span className="font-black text-slate-900 block">{rec.studentName}</span>
                          <span className="text-[10px] text-slate-400 font-mono">{rec.studentId}</span>
                        </td>
                        <td className="p-3.5 font-bold text-slate-600">{rec.month}</td>
                        <td className="p-3.5 font-mono text-slate-500">{rec.paymentDate || '-'}</td>
                        <td className="p-3.5 font-mono font-bold text-emerald-700">
                          ${rec.amountPaid.toFixed(2)}
                        </td>
                        <td className="p-3.5 font-mono font-bold text-rose-600">
                          ${(rec.debtAmount || 0).toFixed(2)}
                        </td>
                        <td className="p-3.5 text-right pr-6">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => setViewReceiptRecord(rec)}
                              className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-all cursor-pointer"
                              title="Fiiri Rasiidh"
                            >
                              <Printer className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDownloadReceiptPDF(rec)}
                              className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg transition-all cursor-pointer"
                              title="Soo Dejiso PDF"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: RECORD PAYMENT MODAL */}
      {/* ========================================================================= */}
      {payModalStudent && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-100 overflow-hidden animate-scale-up">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-2xl">
                  <CircleDollarSign className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-lg">Dhiib Lacagta (Record Payment)</h3>
                  <p className="text-xs text-slate-500 font-medium">
                    {payModalStudent.name} • {payModalStudent.className}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPayModalStudent(null)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePayment} className="p-6 space-y-4">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/60 space-y-1">
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block">
                  Bisha Lacagta
                </span>
                <span className="font-black text-slate-800 text-base">{selectedMonth}</span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] font-extrabold text-slate-600 uppercase tracking-wider block mb-1">
                    Khidmadda Dugsiga ($)
                  </label>
                  <input
                    type="number"
                    value={payAmountDue}
                    onChange={e => setPayAmountDue(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-black text-slate-900 focus:ring-2 focus:ring-emerald-500"
                    required
                  />
                </div>
                <div>
                  <label className="text-[11px] font-extrabold text-slate-600 uppercase tracking-wider block mb-1">
                    Lacagta La Bixiyay ($)
                  </label>
                  <input
                    type="number"
                    value={payAmountPaid}
                    onChange={e => setPayAmountPaid(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-sm font-black text-emerald-800 focus:ring-2 focus:ring-emerald-500"
                    required
                  />
                </div>
              </div>

              {/* Bus fee row */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] font-extrabold text-slate-600 uppercase tracking-wider block mb-1">
                    Khidmadda Baska ($)
                  </label>
                  <input
                    type="number"
                    value={payBusFeeDue}
                    onChange={e => setPayBusFeeDue(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-black text-slate-900 focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-extrabold text-slate-600 uppercase tracking-wider block mb-1">
                    Baska La Bixiyay ($)
                  </label>
                  <input
                    type="number"
                    value={payBusFeePaid}
                    onChange={e => setPayBusFeePaid(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 bg-amber-50 border border-amber-200 rounded-xl text-sm font-black text-amber-800 focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-extrabold text-slate-600 uppercase tracking-wider block mb-1">
                  Faahfaahin / Xusuusin (Notes)
                </label>
                <textarea
                  value={payNotes}
                  onChange={e => setPayNotes(e.target.value)}
                  placeholder="Qor qoraal xusuusin ah..."
                  rows={2}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setPayModalStudent(null)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  Ka Noqo
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-md transition-all cursor-pointer flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  <span>Keydi Lacagta</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: CUSTOM INVOICE MODAL */}
      {/* ========================================================================= */}
      {showInvoiceModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-100 overflow-hidden animate-scale-up my-8">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-2xl">
                  <Receipt className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-lg">
                    {editingInvoice ? `Wax ka beddel Invoice #${editingInvoice.invoiceNo}` : 'Samee Invoice Cusub'}
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">U samee biil rasmi ah waalid ama ganacsi</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowInvoiceModal(false)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveInvoice} className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-[11px] font-extrabold text-slate-600 uppercase tracking-wider block mb-1">
                    Nooca Macaamilka
                  </label>
                  <select
                    value={invRecipientType}
                    onChange={e => setInvRecipientType(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                  >
                    <option value="parent">Waalid (Parent)</option>
                    <option value="business">Ganacsi (Business / Sponsor)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-extrabold text-slate-600 uppercase tracking-wider block mb-1">
                    Magaca Macaamilka
                  </label>
                  <input
                    type="text"
                    value={invRecipientName}
                    onChange={e => setInvRecipientName(e.target.value)}
                    placeholder="Tusaale: Axmed Cali"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                    required
                  />
                </div>

                <div>
                  <label className="text-[11px] font-extrabold text-slate-600 uppercase tracking-wider block mb-1">
                    Taleefanka
                  </label>
                  <input
                    type="text"
                    value={invRecipientPhone}
                    onChange={e => setInvRecipientPhone(e.target.value)}
                    placeholder="061XXXXXXX"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] font-extrabold text-slate-600 uppercase tracking-wider block mb-1">
                    Taariikhda Bixinta (Issue Date)
                  </label>
                  <input
                    type="date"
                    value={invDate}
                    onChange={e => setInvDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-extrabold text-slate-600 uppercase tracking-wider block mb-1">
                    Muddada Ugu Dambeysa (Due Date)
                  </label>
                  <input
                    type="date"
                    value={invDueDate}
                    onChange={e => setInvDueDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                  />
                </div>
              </div>

              {/* Itemized Lines */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-extrabold text-slate-600 uppercase tracking-wider">
                    Adeegyada / Items
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setInvItems([
                        ...invItems,
                        { id: Date.now().toString(), description: '', quantity: 1, unitPrice: 0, total: 0 }
                      ])
                    }
                    className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Ku dar shay</span>
                  </button>
                </div>

                {invItems.map((item, idx) => (
                  <div key={item.id || idx} className="grid grid-cols-12 gap-2 items-center bg-slate-50 p-2.5 rounded-xl">
                    <div className="col-span-6">
                      <input
                        type="text"
                        value={item.description}
                        onChange={e => {
                          const updated = [...invItems];
                          updated[idx].description = e.target.value;
                          setInvItems(updated);
                        }}
                        placeholder="Faahfaahin..."
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium"
                        required
                      />
                    </div>
                    <div className="col-span-2">
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={e => {
                          const updated = [...invItems];
                          updated[idx].quantity = Number(e.target.value);
                          updated[idx].total = updated[idx].quantity * updated[idx].unitPrice;
                          setInvItems(updated);
                        }}
                        placeholder="Tirada"
                        className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-center"
                      />
                    </div>
                    <div className="col-span-3">
                      <input
                        type="number"
                        min="0"
                        value={item.unitPrice}
                        onChange={e => {
                          const updated = [...invItems];
                          updated[idx].unitPrice = Number(e.target.value);
                          updated[idx].total = updated[idx].quantity * updated[idx].unitPrice;
                          setInvItems(updated);
                        }}
                        placeholder="Qiimaha"
                        className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-right"
                      />
                    </div>
                    <div className="col-span-1 text-center">
                      {invItems.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setInvItems(invItems.filter((_, i) => i !== idx))}
                          className="text-rose-500 hover:text-rose-700 p-1"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}

                <div className="p-3 bg-indigo-50/70 rounded-2xl flex items-center justify-between">
                  <span className="text-xs font-black text-indigo-950">Wadarta Guud (Total):</span>
                  <span className="text-lg font-black text-indigo-900 font-mono">
                    ${invItems.reduce((acc, it) => acc + it.quantity * it.unitPrice, 0).toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Status & Amount Paid */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] font-extrabold text-slate-600 uppercase tracking-wider block mb-1">
                    Xaaladda Bixinta
                  </label>
                  <select
                    value={invStatus}
                    onChange={e => setInvStatus(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                  >
                    <option value="Unpaid">Lama Bixin (Unpaid)</option>
                    <option value="Partial">Qayb Bixiyay (Partial)</option>
                    <option value="Paid">La Bixiyay (Paid)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-extrabold text-slate-600 uppercase tracking-wider block mb-1">
                    Lacagta La Bixiyay Hadda ($)
                  </label>
                  <input
                    type="number"
                    value={invAmountPaid}
                    onChange={e => setInvAmountPaid(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-extrabold text-slate-600 uppercase tracking-wider block mb-1">
                  Xisaabaadka & Xusuusinta (Notes & Bank Details)
                </label>
                <textarea
                  value={invNotes}
                  onChange={e => setInvNotes(e.target.value)}
                  rows={3}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-700"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowInvoiceModal(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  Ka Noqo
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black shadow-md transition-all cursor-pointer flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  <span>Keydi Invoice</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: VIEW & PRINT OFFICIAL RECEIPT */}
      {/* ========================================================================= */}
      {viewReceiptRecord && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full shadow-2xl border border-slate-100 overflow-hidden animate-scale-up my-8">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <span className="text-xs font-black text-slate-700">Rasiidha Rasmiga ah ee Dugsiga</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleDownloadReceiptPDF(viewReceiptRecord)}
                  className="px-3 py-1.5 bg-emerald-600 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewReceiptRecord(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-8 space-y-6 text-slate-800" id="receipt-print-area">
              {/* Header */}
              <div className="text-center border-b border-slate-200 pb-4">
                <h2 className="text-2xl font-black text-slate-900">DUGSIGA SUBUC</h2>
                <h3 className="text-sm font-bold text-slate-600">مدرسة السبع لتحفيظ القرآن الكريم</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Wadada Taleex, Muqdisho, Soomaaliya • Tel: +252 61 5000000
                </p>
                <span className="inline-block mt-2 px-3 py-1 bg-emerald-100 text-emerald-800 text-[10px] font-extrabold rounded-full">
                  RASIIDHKA LACAG-BIXINTA / OFFICIAL RECEIPT
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-slate-400 block font-semibold">Rasiidh No:</span>
                  <span className="font-mono font-black text-slate-900">
                    {viewReceiptRecord.receiptNo || 'REC-' + viewReceiptRecord.id}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-slate-400 block font-semibold">Taariikhda:</span>
                  <span className="font-mono font-bold text-slate-900">
                    {viewReceiptRecord.paymentDate || viewReceiptRecord.month}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block font-semibold">Ardayga:</span>
                  <span className="font-black text-slate-900 text-sm">{viewReceiptRecord.studentName}</span>
                </div>
                <div className="text-right">
                  <span className="text-slate-400 block font-semibold">ID-ga Ardayga:</span>
                  <span className="font-mono font-bold text-slate-900">{viewReceiptRecord.studentId}</span>
                </div>
              </div>

              {/* Items Table */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 font-bold border-b border-slate-200">
                    <tr>
                      <th className="p-3">Adeegga</th>
                      <th className="p-3 text-right">Lagu Leeyahay</th>
                      <th className="p-3 text-right">La Bixiyay</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    <tr>
                      <td className="p-3 font-medium">Khidmadda Dugsiga (Bisha {viewReceiptRecord.month})</td>
                      <td className="p-3 text-right font-mono">${viewReceiptRecord.amountDue.toFixed(2)}</td>
                      <td className="p-3 text-right font-mono font-bold text-emerald-700">
                        ${viewReceiptRecord.amountPaid.toFixed(2)}
                      </td>
                    </tr>
                    {viewReceiptRecord.busFeeDue && viewReceiptRecord.busFeeDue > 0 ? (
                      <tr>
                        <td className="p-3 font-medium">Khidmadda Gaadiidka (Bus Transport)</td>
                        <td className="p-3 text-right font-mono">
                          ${(viewReceiptRecord.busFeeDue || 0).toFixed(2)}
                        </td>
                        <td className="p-3 text-right font-mono font-bold text-amber-700">
                          ${(viewReceiptRecord.busFeePaid || 0).toFixed(2)}
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                  <tfoot className="bg-slate-50 font-black border-t border-slate-200">
                    <tr>
                      <td className="p-3">Wadarta Guud</td>
                      <td className="p-3 text-right font-mono">
                        $
                        {(
                          viewReceiptRecord.amountDue + (viewReceiptRecord.busFeeDue || 0)
                        ).toFixed(2)}
                      </td>
                      <td className="p-3 text-right font-mono text-emerald-800">
                        $
                        {(
                          viewReceiptRecord.amountPaid + (viewReceiptRecord.busFeePaid || 0)
                        ).toFixed(2)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              <div className="p-3 bg-rose-50 rounded-2xl border border-rose-100 flex items-center justify-between text-xs">
                <span className="font-extrabold text-rose-900">Haraaga Lagu Leeyahay (Remaining Debt):</span>
                <span className="font-mono font-black text-rose-700 text-sm">
                  ${(viewReceiptRecord.debtAmount || 0).toFixed(2)}
                </span>
              </div>

              <div className="pt-8 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
                <div>
                  <span>Saxiixa Maamulka: ___________________</span>
                </div>
                <div>
                  <span>Shaambada: [ OFFICIAL STAMP ]</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: VIEW & PRINT INVOICE */}
      {/* ========================================================================= */}
      {viewInvoiceRecord && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full shadow-2xl border border-slate-100 overflow-hidden animate-scale-up my-8">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <span className="text-xs font-black text-slate-700">Invoice #{viewInvoiceRecord.invoiceNo}</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleDownloadInvoicePDF(viewInvoiceRecord)}
                  className="px-3 py-1.5 bg-indigo-600 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewInvoiceRecord(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-8 space-y-6 text-slate-800">
              <div className="text-center border-b border-slate-200 pb-4">
                <h2 className="text-2xl font-black text-slate-900">DUGSIGA SUBUC</h2>
                <h3 className="text-sm font-bold text-slate-600">INVOICE / BIILKA WAXBARASHADA</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Wadada Taleex, Muqdisho, Soomaaliya • Tel: +252 61 5000000
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-slate-400 block font-semibold">Ku Socota (Bill To):</span>
                  <span className="font-black text-slate-900 text-sm">{viewInvoiceRecord.recipientName}</span>
                  {viewInvoiceRecord.recipientPhone && (
                    <span className="text-slate-500 block font-mono">{viewInvoiceRecord.recipientPhone}</span>
                  )}
                </div>
                <div className="text-right">
                  <span className="text-slate-400 block font-semibold">Invoice No:</span>
                  <span className="font-mono font-black text-indigo-900">{viewInvoiceRecord.invoiceNo}</span>
                  <span className="text-slate-500 block">Taariikh: {viewInvoiceRecord.date}</span>
                  <span className="text-rose-600 block font-bold">Due: {viewInvoiceRecord.dueDate}</span>
                </div>
              </div>

              <div className="border border-slate-200 rounded-2xl overflow-hidden">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 font-bold border-b border-slate-200">
                    <tr>
                      <th className="p-3">Faahfaahin</th>
                      <th className="p-3 text-center">Tirada</th>
                      <th className="p-3 text-right">Qiimaha</th>
                      <th className="p-3 text-right">Wadarta</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(viewInvoiceRecord.items || []).map((it, idx) => (
                      <tr key={idx}>
                        <td className="p-3 font-medium">{it.description}</td>
                        <td className="p-3 text-center font-mono">{it.quantity}</td>
                        <td className="p-3 text-right font-mono">${it.unitPrice.toFixed(2)}</td>
                        <td className="p-3 text-right font-mono font-bold">
                          ${(it.quantity * it.unitPrice).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-50 font-black border-t border-slate-200">
                    <tr>
                      <td colSpan={3} className="p-3 text-right">Wadarta Guud:</td>
                      <td className="p-3 text-right font-mono text-indigo-900 text-sm">
                        ${viewInvoiceRecord.totalAmount.toFixed(2)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {viewInvoiceRecord.notes && (
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-600 font-mono whitespace-pre-wrap">
                  {viewInvoiceRecord.notes}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
