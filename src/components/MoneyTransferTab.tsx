import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { jsPDF } from 'jspdf';
import {
  CircleDollarSign,
  Search,
  PlusCircle,
  Download,
  Printer,
  Trash2,
  Calendar,
  Edit,
  X,
  TrendingUp,
  Eye,
  ArrowLeftRight,
  FileSpreadsheet,
  FileText,
  Phone,
  User,
  RotateCcw,
  Check,
  AlertCircle,
  Clock,
  ChevronRight,
  History,
  Notebook
} from 'lucide-react';
import { DatabaseState, MoneyTransferRecord } from '../types';

const formatDateTime = (isoString: string) => {
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}`;
  } catch (e) {
    return isoString;
  }
};

const formatRecordDate = (dateStr: string) => {
  if (!dateStr) return "-";
  if (dateStr.includes('-')) {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const [year, month, day] = parts;
      return `${day}/${month}/${year}`;
    }
  }
  return dateStr;
};

interface MoneyTransferTabProps {
  database: DatabaseState;
  onSaveDatabase: (updatedDb: DatabaseState) => void;
}

export function MoneyTransferTab({ database, onSaveDatabase }: MoneyTransferTabProps) {
  // Grab records
  const records = useMemo(() => database.moneyTransfers || [], [database.moneyTransfers]);

  // Current times
  const todayDateStr = useMemo(() => {
    // Current local time: 2026-05-30 based on system metadata
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }, []);

  const currentYearStr = useMemo(() => new Date().getFullYear().toString(), []);
  const currentMonthStr = useMemo(() => String(new Date().getMonth() + 1).padStart(2, '0'), []);

  // Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [monthFilter, setMonthFilter] = useState('');
  const [yearFilter, setYearFilter] = useState('');

  // UI Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<MoneyTransferRecord | null>(null);

  // Form States (for Add & Edit)
  const [formName, setFormName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formAmount, setFormAmount] = useState<number | ''>('');
  const [formNotes, setFormNotes] = useState('');
  const [formDate, setFormDate] = useState('');
  const [formError, setFormError] = useState('');

  // Active Report Generation States
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportType, setReportType] = useState<'daily' | 'monthly' | 'range'>('daily');
  const [reportDate, setReportDate] = useState(todayDateStr);
  const [reportMonth, setReportMonth] = useState(currentMonthStr);
  const [reportYear, setReportYear] = useState(currentYearStr);
  const [reportStartDate, setReportStartDate] = useState(todayDateStr);
  const [reportEndDate, setReportEndDate] = useState(todayDateStr);

  // Success Feedbacks
  const [feedback, setFeedback] = useState('');

  // Autocomplete support state
  const [showNameSuggestions, setShowNameSuggestions] = useState(false);
  const [showPhoneSuggestions, setShowPhoneSuggestions] = useState(false);

  // Extract unique previous clients sorted by most recent
  const uniqueCustomers = useMemo(() => {
    const sorted = [...records].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const result: { name: string; phone: string }[] = [];
    const seenNames = new Set<string>();

    for (const r of sorted) {
      const normName = r.customerName.trim().toLowerCase();
      if (normName && !seenNames.has(normName)) {
        seenNames.add(normName);
        result.push({
          name: r.customerName.trim(),
          phone: r.customerPhone.trim()
        });
      }
    }
    return result;
  }, [records]);

  // Name autocomplete suggestions
  const nameSuggestions = useMemo(() => {
    if (!formName.trim()) return [];
    const query = formName.trim().toLowerCase();
    return uniqueCustomers.filter(c => 
      c.name.toLowerCase().includes(query)
    ).slice(0, 5);
  }, [formName, uniqueCustomers]);

  // Phone autocomplete suggestions
  const phoneSuggestions = useMemo(() => {
    if (!formPhone.trim()) return [];
    const query = formPhone.trim().toLowerCase();
    return uniqueCustomers.filter(c => 
      c.phone.toLowerCase().includes(query)
    ).slice(0, 5);
  }, [formPhone, uniqueCustomers]);

  const handleSelectCustomer = (c: { name: string; phone: string }) => {
    setFormName(c.name);
    setFormPhone(c.phone);
    setShowNameSuggestions(false);
    setShowPhoneSuggestions(false);
  };

  // Custom confirmation modal state to bypass iframe modal blockages
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    accentColor?: 'rose' | 'indigo' | 'amber' | 'teal';
    onConfirm: () => void;
  } | null>(null);

  const triggerFeedback = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(''), 4000);
  };

  // Autogen helper
  const generateNextTransNo = () => {
    const list = database.moneyTransfers || [];
    const lastNum = list.length > 0 ? Math.max(...list.map(r => {
      const match = r.transNo.match(/\d+/);
      return match ? parseInt(match[0], 10) : 10000;
    })) : 10000;
    return `TX-${lastNum + 1}`;
  };

  // Dashboard Stats
  const stats = useMemo(() => {
    let todayTotal = 0;
    let monthlyTotal = 0;
    const currentYearNum = new Date().getFullYear();
    const currentMonthNum = new Date().getMonth() + 1; // 1-12
    const currentYrMo = `${currentYearNum}-${String(currentMonthNum).padStart(2, '0')}`;

    records.forEach(r => {
      if (r.date === todayDateStr) {
        todayTotal += r.amountSent;
      }
      if (r.date.startsWith(currentYrMo)) {
        monthlyTotal += r.amountSent;
      }
    });

    return {
      todayTotal,
      monthlyTotal,
      totalCount: records.length
    };
  }, [records, todayDateStr]);

  // Main Filtered results
  const filteredRecords = useMemo(() => {
    return records.filter(r => {
      // Search
      const text = searchTerm.toLowerCase().trim();
      const matchSearch = text === '' ||
        r.customerName.toLowerCase().includes(text) ||
        r.customerPhone.toLowerCase().includes(text) ||
        r.transNo.toLowerCase().includes(text);

      // Date Specific
      const matchDate = dateFilter === '' || r.date === dateFilter;

      // Month
      const matchMonth = monthFilter === '' || r.date.split('-')[1] === monthFilter;

      // Year
      const matchYear = yearFilter === '' || r.date.split('-')[0] === yearFilter;

      return matchSearch && matchDate && matchMonth && matchYear;
    }).sort((a, b) => {
      const dateCompare = b.date.localeCompare(a.date);
      if (dateCompare !== 0) return dateCompare;
      return b.createdAt.localeCompare(a.createdAt);
    });
  }, [records, searchTerm, dateFilter, monthFilter, yearFilter]);

  // Customer History Lookup (if search term matches or customer name is clicked)
  const historyLookup = useMemo(() => {
    const cleanSearch = searchTerm.toLowerCase().trim();
    if (cleanSearch.length < 2) return null;

    // Filter to find all transactions matching exactly this phone number or part of name
    const matches = records.filter(r => 
      r.customerPhone.toLowerCase().includes(cleanSearch) || 
      r.customerName.toLowerCase().includes(cleanSearch)
    ).sort((a,b) => b.date.localeCompare(a.date));

    if (matches.length === 0) return null;

    const totalSent = matches.reduce((sum, r) => sum + r.amountSent, 0);

    return {
      matches,
      totalSent,
      count: matches.length
    };
  }, [records, searchTerm]);

  // Handle Add Submit
  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!formName.trim()) return setFormError('Customer Name is required.');
    if (!formPhone.trim()) return setFormError('Customer Phone Number is required.');
    if (!formAmount || typeof formAmount !== 'number' || formAmount <= 0) {
      return setFormError('Amount Sent must be a valid number greater than 0.');
    }

    const nextNo = generateNextTransNo();
    const newRecord: MoneyTransferRecord = {
      id: `MT-${Date.now()}`,
      transNo: nextNo,
      customerName: formName.trim(),
      customerPhone: formPhone.trim(),
      amountSent: formAmount,
      date: formDate || todayDateStr,
      notes: formNotes.trim(),
      createdBy: 'yaxyecabdisalanmohamed1234@gmail.com',// Admin email from user session metadata
      createdAt: new Date().toISOString()
    };

    const updatedTransfers = [newRecord, ...records];
    onSaveDatabase({
      ...database,
      moneyTransfers: updatedTransfers
    });

    setIsAddModalOpen(false);
    // Reset Form
    setFormName('');
    setFormPhone('');
    setFormAmount('');
    setFormNotes('');
    setFormDate('');
    triggerFeedback(`Successfully logged Money Transfer ${nextNo} for $${formAmount}!`);
  };

  // Open Edit Dialog
  const openEditDialog = (record: MoneyTransferRecord) => {
    setSelectedRecord(record);
    setFormName(record.customerName);
    setFormPhone(record.customerPhone);
    setFormAmount(record.amountSent);
    setFormDate(record.date || todayDateStr);
    setFormNotes(record.notes);
    setFormError('');
    setIsEditModalOpen(true);
  };

  // Handle Edit Submit
  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRecord) return;
    setFormError('');

    if (!formName.trim()) return setFormError('Customer Name is required.');
    if (!formPhone.trim()) return setFormError('Customer Phone Number is required.');
    if (!formAmount || typeof formAmount !== 'number' || formAmount <= 0) {
      return setFormError('Amount Sent must be a valid number greater than 0.');
    }

    const updatedTransfers = records.map(r => {
      if (r.id === selectedRecord.id) {
        return {
          ...r,
          customerName: formName.trim(),
          customerPhone: formPhone.trim(),
          amountSent: formAmount,
          date: formDate || r.date,
          notes: formNotes.trim()
        };
      }
      return r;
    });

    onSaveDatabase({
      ...database,
      moneyTransfers: updatedTransfers
    });

    setIsEditModalOpen(false);
    setFormDate('');
    triggerFeedback(`Successfully updated Money Transfer ${selectedRecord.transNo}!`);
  };

  // Handle Delete
  const handleDeleteRecord = (id: string, transNo: string) => {
    const record = records.find(r => r.id === id);
    const details = record ? `for customer "${record.customerName}" ($${record.amountSent})` : `Record ${transNo}`;
    setConfirmModal({
      isOpen: true,
      title: `Delete Transfer ${transNo}?`,
      message: `Are you absolutely sure you want to delete Money Transfer Record ${transNo} ${details}? This action is irreversible.`,
      accentColor: 'rose',
      onConfirm: () => {
        const updatedTransfers = records.filter(r => r.id !== id);
        onSaveDatabase({
          ...database,
          moneyTransfers: updatedTransfers
        });
        triggerFeedback(`Money Transfer Record ${transNo} was permanently deleted.`);
        setConfirmModal(null);
      }
    });
  };

  const handleDeleteAllTransfers = () => {
    setConfirmModal({
      isOpen: true,
      title: "Ma hubtaa inaad tirtirto dhammaan xawaaladaha?",
      message: "Tallaabadan dib looma soo celin karo! Dhammaan xogta xawaaladaha (remittances) waa la masixi doonaa. Ma hubtaa?",
      accentColor: 'rose',
      onConfirm: () => {
        onSaveDatabase({
          ...database,
          moneyTransfers: []
        });
        triggerFeedback("Dhammaan diiwaanka xawaaladaha si buuxda ayaa loo tirtiray.");
        setConfirmModal(null);
      }
    });
  };

  // Reset Filters
  const resetFilters = () => {
    setSearchTerm('');
    setDateFilter('');
    setMonthFilter('');
    setYearFilter('');
  };

  // Fetch all transactions for a specific customer detail
  const getCustomerTransactions = (name: string, phone: string) => {
    return records.filter(r => r.customerName === name || r.customerPhone === phone)
      .sort((a, b) => b.date.localeCompare(a.date));
  };

  // Compute Active Report Records in state
  const reportRecords = useMemo(() => {
    return records.filter(r => {
      if (reportType === 'daily') {
        return r.date === reportDate;
      } else if (reportType === 'monthly') {
        const [yr, mo] = r.date.split('-');
        return yr === reportYear && mo === reportMonth;
      } else {
        return r.date >= reportStartDate && r.date <= reportEndDate;
      }
    }).sort((a,b) => a.date.localeCompare(b.date));
  }, [records, reportType, reportDate, reportMonth, reportYear, reportStartDate, reportEndDate]);

  const reportTotalAmount = useMemo(() => {
    return reportRecords.reduce((sum, r) => sum + r.amountSent, 0);
  }, [reportRecords]);

  // Report title
  const reportTitle = reportType === 'daily'
    ? `Money Transfer Daily Report - ${reportDate}`
    : reportType === 'monthly'
      ? `Money Transfer Monthly Report - ${reportYear}-${reportMonth}`
      : `Money Transfer Custom Range Report (${reportStartDate} to ${reportEndDate})`;

  // PRINT Trigger helper
  const handlePrintReport = () => {
    // Check if we already have a temp clone, clean it up just in case
    const existingContainer = document.getElementById('print-temp-container');
    if (existingContainer) {
      existingContainer.parentNode?.removeChild(existingContainer);
    }
    const existingStyle = document.getElementById('print-temp-style');
    if (existingStyle) {
      existingStyle.parentNode?.removeChild(existingStyle);
    }

    try {
      const container = document.createElement('div');
      container.id = 'print-temp-container';
      
      container.innerHTML = `
        <div style="font-family: 'Helvetica Neue', Arial, sans-serif; color: #1e293b; padding: 40px; background: white !important;">
          <h1 style="font-size: 24px; margin-bottom: 5px; color: #0f172a; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px;">${reportTitle}</h1>
          <div style="font-size: 13px; color: #64748b; margin-bottom: 30px;">
            Generated on: ${new Date().toLocaleString()} | Created by System Admin
          </div>
          
          <div style="display: flex; gap: 20px; margin-bottom: 35px;">
            <div style="background: #f8fafc; border: 1px solid #edf2f7; border-radius: 8px; padding: 15px 20px; min-width: 150px; flex: 1;">
              <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; font-weight: bold;">Total Sent</div>
              <div style="font-size: 20px; font-weight: bold; color: #0f172a; margin-top: 5px;">$${reportTotalAmount.toLocaleString()}</div>
            </div>
            <div style="background: #f8fafc; border: 1px solid #edf2f7; border-radius: 8px; padding: 15px 20px; min-width: 150px; flex: 1;">
              <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; font-weight: bold;">Transactions Logged</div>
              <div style="font-size: 20px; font-weight: bold; color: #0f172a; margin-top: 5px;">${reportRecords.length}</div>
            </div>
          </div>

          <table style="width: 100%; border-collapse: collapse; margin-bottom: 40px;">
            <thead>
              <tr>
                <th style="text-align: left; padding: 12px 10px; border-bottom: 2px solid #cbd5e1; font-size: 11px; text-transform: uppercase; color: #475569; letter-spacing: 0.05em;">Trans Number</th>
                <th style="text-align: left; padding: 12px 10px; border-bottom: 2px solid #cbd5e1; font-size: 11px; text-transform: uppercase; color: #475569; letter-spacing: 0.05em;">Record Date</th>
                <th style="text-align: left; padding: 12px 10px; border-bottom: 2px solid #cbd5e1; font-size: 11px; text-transform: uppercase; color: #475569; letter-spacing: 0.05em;">Customer Name</th>
                <th style="text-align: left; padding: 12px 10px; border-bottom: 2px solid #cbd5e1; font-size: 11px; text-transform: uppercase; color: #475569; letter-spacing: 0.05em;">Phone Number</th>
                <th style="text-align: left; padding: 12px 10px; border-bottom: 2px solid #cbd5e1; font-size: 11px; text-transform: uppercase; color: #475569; letter-spacing: 0.05em;">Amount</th>
                <th style="text-align: left; padding: 12px 10px; border-bottom: 2px solid #cbd5e1; font-size: 11px; text-transform: uppercase; color: #475569; letter-spacing: 0.05em;">Description/Notes</th>
              </tr>
            </thead>
            <tbody>
              ${reportRecords.map(r => `
                <tr>
                  <td style="padding: 12px 10px; border-bottom: 1px solid #edf2f7; font-size: 12px;"><strong>${r.transNo}</strong></td>
                  <td style="padding: 12px 10px; border-bottom: 1px solid #edf2f7; font-size: 12px;">${formatRecordDate(r.date)}</td>
                  <td style="padding: 12px 10px; border-bottom: 1px solid #edf2f7; font-size: 12px;">${r.customerName}</td>
                  <td style="padding: 12px 10px; border-bottom: 1px solid #edf2f7; font-size: 12px;">${r.customerPhone}</td>
                  <td style="padding: 12px 10px; border-bottom: 1px solid #edf2f7; font-size: 12px;"><strong>$${r.amountSent}</strong></td>
                  <td style="padding: 12px 10px; border-bottom: 1px solid #edf2f7; font-size: 12px; color: #64748b; font-style: italic; max-width: 250px;">${r.notes || '-'}</td>
                </tr>
              `).join('')}
              ${reportRecords.length === 0 ? `
                <tr>
                  <td colspan="6" style="text-align: center; color: #cbd5e1; padding: 30px;">
                    No money transfer records found for the selected period.
                  </td>
                </tr>
              ` : ''}
            </tbody>
          </table>

          <div style="font-size: 10px; color: #94a3b8; border-top: 1px dashed #e2e8f0; padding-top: 15px; margin-top: 50px; text-align: center;">
            Dugsiga Subuc - Money Transfer Records System Admin Portal Ledger Page.
          </div>
        </div>
      `;
      
      document.body.appendChild(container);

      const style = document.createElement('style');
      style.id = 'print-temp-style';
      style.innerHTML = `
        @media print {
          body > :not(#print-temp-container) {
            display: none !important;
          }
          #print-temp-container {
            display: block !important;
            visibility: visible !important;
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            min-height: 100% !important;
            background: white !important;
            color: black !important;
          }
        }
      `;
      document.head.appendChild(style);

      setTimeout(() => {
        window.focus();
        window.print();
        setTimeout(() => {
          if (document.body.contains(container)) {
            document.body.removeChild(container);
          }
          if (document.head.contains(style)) {
            document.head.removeChild(style);
          }
        }, 1000);
      }, 150);
    } catch (err) {
      console.error("Print creation failed", err);
      window.focus();
      window.print();
    }
  };

  // EXCEL download helper with custom column widths
  const handleExportExcel = () => {
    const cleanFileNameStr = reportTitle.toLowerCase().replace(/[^a-z0-9]+/g, '_');
    
    let html = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <!--[if gte mso 9]>
        <xml>
          <x:ExcelWorkbook>
            <x:ExcelWorksheets>
              <x:ExcelWorksheet>
                <x:Name>Money Transfers Ledger</x:Name>
                <x:WorksheetOptions>
                  <x:DisplayGridlines/>
                </x:WorksheetOptions>
              </x:ExcelWorksheet>
            </x:ExcelWorksheets>
          </x:ExcelWorkbook>
        </xml>
        <![endif]-->
        <style>
          table { border-collapse: collapse; font-family: Arial, sans-serif; }
          th { background-color: #0f172a; color: #ffffff; font-weight: bold; text-align: left; padding: 10px; border: 1px solid #cbd5e1; }
          td { padding: 10px; border: 1px solid #edf2f7; font-size: 11pt; }
          .amount { font-weight: bold; color: #10b981; }
          .trans-id { font-weight: bold; }
        </style>
      </head>
      <body>
        <h2>${reportTitle}</h2>
        <p>Generated: ${new Date().toLocaleString()} | Created by System Admin</p>
        <p>Total Sent: $${reportTotalAmount.toLocaleString()} | Records Count: ${reportRecords.length}</p>
        <br/>
        <table>
          <thead>
            <tr>
              <th style="width: 130px;">Transaction Number</th>
              <th style="width: 140px;">Record Date</th>
              <th style="width: 180px;">Customer Name</th>
              <th style="width: 130px;">Phone Number</th>
              <th style="width: 100px;">Amount Sent ($)</th>
              <th style="width: 250px;">Notes / Description</th>
              <th style="width: 180px;">Created By</th>
            </tr>
          </thead>
          <tbody>
    `;

    reportRecords.forEach(r => {
      html += `
        <tr>
          <td class="trans-id">${r.transNo}</td>
          <td>${formatRecordDate(r.date)}</td>
          <td>${r.customerName}</td>
          <td style="mso-number-format:'\\@';">${r.customerPhone}</td>
          <td class="amount">$${r.amountSent}</td>
          <td>${r.notes || '-'}</td>
          <td>${r.createdBy}</td>
        </tr>
      `;
    });

    html += `
          </tbody>
        </table>
      </body>
      </html>
    `;

    const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `money_transfers_${cleanFileNameStr}.xls`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    triggerFeedback("Excel ledger sheet exported with auto-set column dimensions!");
  };

  // PDF Download triggers using jsPDF
  const handleExportPDF = () => {
    const doc = new jsPDF();
    
    // Header Style
    doc.setFillColor(15, 23, 42); // slate-900
    doc.rect(0, 0, 210, 40, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont("Helvetica", "bold");
    doc.text("Dugsiga Subuc Management Ledger", 15, 18);
    
    doc.setFontSize(10);
    doc.setFont("Helvetica", "normal");
    doc.text(`MONEY TRANSFER FINANCE STATEMENT — ACCESS: LEVEL 4 ADMIN`, 15, 28);
    
    // Report Info
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(14);
    doc.setFont("Helvetica", "bold");
    doc.text(reportTitle.toUpperCase(), 15, 55);
    
    // Metadata block
    doc.setFontSize(9);
    doc.setFont("Helvetica", "normal");
    doc.setTextColor(100, 116, 139);
    doc.text(`Statement Period: ${reportType === 'daily' ? reportDate : reportType === 'monthly' ? (reportYear + '-' + reportMonth) : (reportStartDate + ' to ' + reportEndDate)}`, 15, 63);
    doc.text(`Generated On: ${new Date().toLocaleString()}`, 15, 68);
    doc.text(`Authorizing User: yaxyecabdisalanmohamed1234@gmail.com`, 15, 73);
    
    // Draw Stats box
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.rect(15, 80, 180, 20, 'FD');
    
    doc.setTextColor(71, 85, 105);
    doc.setFontSize(8);
    doc.text("TOTAL DISBURSED AMOUNT", 25, 88);
    doc.text("TRANSACTION LEDGER COUNT", 125, 88);
    
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(14);
    doc.setFont("Helvetica", "bold");
    doc.text(`$${reportTotalAmount.toLocaleString()}`, 25, 95);
    doc.text(`${reportRecords.length} records`, 125, 95);
    
    // Table Headers
    let y = 115;
    doc.setFillColor(241, 245, 249);
    doc.rect(15, y - 6, 180, 8, 'F');
    
    doc.setFontSize(8);
    doc.setFont("Helvetica", "bold");
    doc.setTextColor(71, 85, 105);
    doc.text("TRANS ID", 17, y - 1);
    doc.text("CREATED AT", 38, y - 1);
    doc.text("CUSTOMER NAME", 72, y - 1);
    doc.text("PHONE", 115, y - 1);
    doc.text("AMOUNT", 147, y - 1);
    doc.text("NOTES", 167, y - 1);
    
    // List Items
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    
    reportRecords.forEach((r, idx) => {
      y += idx === 0 ? 5 : 8;
      
      // Page buffer expansion
      if (y > 275) {
        doc.addPage();
        y = 30;
        // Reprint table header on new page
        doc.setFillColor(241, 245, 249);
        doc.rect(15, y - 6, 180, 8, 'F');
        doc.setFont("Helvetica", "bold");
        doc.setTextColor(71, 85, 105);
        doc.text("TRANS ID", 17, y - 1);
        doc.text("RECORD DATE", 38, y - 1);
        doc.text("CUSTOMER NAME", 72, y - 1);
        doc.text("PHONE", 115, y - 1);
        doc.text("AMOUNT", 147, y - 1);
        doc.text("NOTES", 167, y - 1);
        doc.setFont("Helvetica", "normal");
        doc.setTextColor(15, 23, 42);
        y += 5;
      }
      
      // Zebra shading
      if (idx % 2 === 1) {
        doc.setFillColor(250, 250, 250);
        doc.rect(15, y - 4.5, 180, 6, 'F');
      }
      
      doc.text(r.transNo, 17, y);
      doc.text(formatRecordDate(r.date), 38, y);
      
      // Name truncation to prevent clipping
      const cleanName = r.customerName.length > 20 ? r.customerName.slice(0, 18) + ".." : r.customerName;
      doc.text(cleanName, 72, y);
      doc.text(r.customerPhone, 115, y);
      doc.text(`$${r.amountSent}`, 147, y);
      
      const cleanNotes = (r.notes || '').length > 15 ? (r.notes || '').slice(0, 13) + ".." : (r.notes || '-');
      doc.text(cleanNotes, 167, y);
    });
    
    if (reportRecords.length === 0) {
      doc.setTextColor(168, 85, 247);
      doc.text("No transactions registered inside this operational boundary.", 55, y + 10);
    }
    
    // Save
    const cleanFN = reportTitle.toLowerCase().replace(/[^a-z0-9]+/g, '_');
    doc.save(`money_transfers_${cleanFN}.pdf`);
    triggerFeedback("PDF Statement downloaded successfully!");
  };

  return (
    <div className="space-y-6" id="money-transfers-viewport">
      
      {/* Banner Succes Confirmation */}
      <AnimatePresence>
        {feedback && (
          <motion.div
            initial={{ opacity: 0, y: -15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center gap-3 shadow-sm text-emerald-950 text-xs font-semibold"
            id="money-transfer-toast"
          >
            <Check className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{feedback}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-slate-50 p-6 rounded-3xl border border-slate-200/50">
        <div>
          <h3 className="text-xl font-extrabold text-[#020617] tracking-tight flex items-center gap-2.5">
            <ArrowLeftRight className="w-6 h-6 text-[#1e5ee6]" />
            <span>Money Transfer Records</span>
          </h3>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Admin console replacing standard Excel tracking ledger for client cash remittances.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => {
              const d = new Date();
              const firstDayStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
              setReportStartDate(firstDayStr);
              setReportEndDate(todayDateStr);
              setReportDate(todayDateStr);
              setReportMonth(currentMonthStr);
              setReportYear(currentYearStr);
              setReportType('daily');
              setShowReportModal(true);
            }}
            className="py-2.5 px-4 text-xs font-extrabold uppercase tracking-wider bg-white hover:bg-slate-50 text-slate-700 transition-all rounded-xl border border-slate-200 flex items-center gap-2 cursor-pointer shadow-sm shadow-slate-100"
            id="btn-generate-reports"
          >
            <Notebook className="w-4 h-4 text-[#1e5ee6]" />
            <span>Generate Ledger Reports</span>
          </button>

          {records.length > 0 && (
            <button
              type="button"
              onClick={handleDeleteAllTransfers}
              className="py-2.5 px-4 text-xs font-extrabold uppercase tracking-wider bg-rose-50 hover:bg-rose-100 text-rose-700 transition-all rounded-xl border border-rose-200 flex items-center gap-2 cursor-pointer shadow-sm shadow-rose-100"
              id="btn-delete-all-transfers"
            >
              <Trash2 className="w-4 h-4 text-rose-600" />
              <span>Futa Dhammaan (Delete All)</span>
            </button>
          )}
          
          <button
            type="button"
            onClick={() => {
              setFormError('');
              setFormName('');
              setFormPhone('');
              setFormAmount('');
              setFormNotes('');
              setFormDate(todayDateStr);
              setIsAddModalOpen(true);
            }}
            className="py-2.5 px-4 text-xs font-extrabold uppercase bg-[#1e5ee6] hover:bg-blue-700 text-white transition-all rounded-xl shadow-md shadow-blue-500/10 flex items-center gap-2 cursor-pointer"
            id="btn-add-transfer-record"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Add New Record</span>
          </button>
        </div>
      </div>

      {/* 2. DASHBOARD SUMMARY CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6" id="transfer-dashboard-widgets">
        
        {/* Widget 1 */}
        <div className="bg-white border border-slate-150 p-6 rounded-3xl shadow-sm hover:shadow-md transition-all relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-full blur-3xl -z-10 translate-x-8 -translate-y-8" />
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] bg-blue-50 text-[#1e5ee6] px-2.5 py-1 rounded-full font-bold uppercase tracking-wider">Remittances Today</span>
            <div className="p-2 bg-blue-50 border border-blue-100 rounded-xl">
              <Clock className="w-5 h-5 text-[#1e5ee6]" />
            </div>
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block leading-none">Today's Remitted Sum</span>
            <h4 className="text-3xl font-black text-slate-900 tracking-tight mt-2.5">${stats.todayTotal.toLocaleString()}</h4>
          </div>
        </div>

        {/* Widget 2 */}
        <div className="bg-white border border-slate-150 p-6 rounded-3xl shadow-sm hover:shadow-md transition-all relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-full blur-3xl -z-10 translate-x-8 -translate-y-8" />
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] bg-emerald-50 text-emerald-600 px-2.5 py-1 rounded-full font-bold uppercase tracking-wider">Remittances This Month</span>
            <div className="p-2 bg-emerald-50 border border-emerald-100 rounded-xl">
              <TrendingUp className="w-5 h-5 text-emerald-600" />
            </div>
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block leading-none">Monthly Total Sent</span>
            <h4 className="text-3xl font-black text-slate-900 tracking-tight mt-2.5">${stats.monthlyTotal.toLocaleString()}</h4>
          </div>
        </div>

        {/* Widget 3 */}
        <div className="bg-white border border-slate-150 p-6 rounded-3xl shadow-sm hover:shadow-md transition-all relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 right-0 w-32 h-32 bg-purple-50 rounded-full blur-3xl -z-10 translate-x-8 -translate-y-8" />
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] bg-purple-50 text-purple-600 px-2.5 py-1 rounded-full font-bold uppercase tracking-wider">All Transactions</span>
            <div className="p-2 bg-purple-50 border border-purple-100 rounded-xl">
              <CircleDollarSign className="w-5 h-5 text-purple-600" />
            </div>
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block leading-none">Total Ledgers Logged</span>
            <h4 className="text-3xl font-black text-slate-900 tracking-tight mt-2.5">{stats.totalCount} txs</h4>
          </div>
        </div>

      </div>

      {/* 3. FILTERS BAR & ACTIVE GRAPH CONTROLLER */}
      <div className="bg-white border border-slate-150 rounded-3xl p-6 shadow-sm space-y-5" id="transfer-filters-container">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4 text-slate-400" />
            <h4 className="text-xs font-bold uppercase text-slate-400 tracking-wider">Queries & Search Filter Boundary</h4>
          </div>
          {(searchTerm || dateFilter || monthFilter || yearFilter) && (
            <button
              type="button"
              onClick={resetFilters}
              className="text-xs font-semibold text-rose-600 hover:text-rose-800 transition-colors flex items-center gap-1.5 cursor-pointer bg-rose-50 border border-rose-100 rounded-xl px-3 py-1.5 hover:bg-rose-100"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Clear Filter Queries</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          
          {/* Search Term */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
              <span>Search Ledger</span>
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="Search Client, Phone, TX ID.."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs font-medium rounded-xl border border-slate-200 bg-slate-50/50 focus:border-[#1e5ee6] focus:bg-white transition-all text-slate-800"
              />
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            </div>
          </div>

          {/* Date Picker Filter */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Date</label>
            <div className="relative">
              <input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs font-medium rounded-xl border border-slate-200 bg-slate-50/50 focus:border-[#1e5ee6] focus:bg-white transition-all text-slate-800 cursor-pointer"
              />
              <Calendar className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            </div>
          </div>

          {/* Month Dropdown */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Month</label>
            <select
              value={monthFilter}
              onChange={(e) => setMonthFilter(e.target.value)}
              className="w-full px-3.5 py-2 text-xs font-medium rounded-xl border border-slate-200 bg-slate-50/50 focus:border-[#1e5ee6] focus:bg-white transition-all text-slate-800 cursor-pointer"
            >
              <option value="">All Months</option>
              <option value="01">January</option>
              <option value="02">February</option>
              <option value="03">March</option>
              <option value="04">April</option>
              <option value="05">May</option>
              <option value="06">June</option>
              <option value="07">July</option>
              <option value="08">August</option>
              <option value="09">September</option>
              <option value="10">October</option>
              <option value="11">November</option>
              <option value="12">December</option>
            </select>
          </div>

          {/* Year Dropdown */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Year</label>
            <select
              value={yearFilter}
              onChange={(e) => setYearFilter(e.target.value)}
              className="w-full px-3.5 py-2 text-xs font-medium rounded-xl border border-slate-200 bg-slate-50/50 focus:border-[#1e5ee6] focus:bg-white transition-all text-slate-800 cursor-pointer"
            >
              <option value="">All Years</option>
              <option value="2025">2025</option>
              <option value="2026">2026</option>
              <option value="2027">2027</option>
            </select>
          </div>

        </div>

        {/* CUSTOMER HISTORY PREVIEW BLOCK (Triggers when searching) */}
        {historyLookup && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-5 bg-blue-50/40 border border-blue-100 rounded-2xl flex flex-col md:flex-row md:items-center md:justify-between gap-4"
          >
            <div className="flex items-start gap-3">
              <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-xl mt-0.5 shrink-0">
                <History className="w-5 h-5 text-blue-600 animate-pulse" />
              </div>
              <div>
                <span className="text-[10px] font-extrabold uppercase bg-blue-100 text-[#1e5ee6] px-2 py-0.5 rounded-md text-center">
                  Matched Customer Transactions Archive
                </span>
                <h5 className="text-sm font-black text-slate-800 tracking-tight mt-1.5">
                  Transactions logged for: "{searchTerm}"
                </h5>
                <p className="text-xs text-slate-500 font-semibold mt-1">
                  Found <strong className="text-slate-800">{historyLookup.count}</strong> historic money transfer statements totaling <strong className="text-[#10b981]">${historyLookup.totalSent.toLocaleString()}</strong>.
                </p>
              </div>
            </div>
            
            <button
              type="button"
              onClick={() => {
                // Focus only on pre-found transactions in records
                // By filtering date/month to none, keep current query matching
              }}
              className="py-2 px-3 bg-[#1e5ee6] text-white font-extrabold text-[10px] uppercase tracking-wider rounded-lg transition-all hover:bg-blue-700 max-w-[180px] text-center cursor-pointer"
            >
              Scroll down to view list
            </button>
          </motion.div>
        )}
      </div>

      {/* 4. TRANSACTION LOG LIST TABLE CONTAINER */}
      <div className="bg-white border border-slate-150 rounded-3xl shadow-sm overflow-hidden" id="transfers-data-table-panel">
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/55">
          <div className="flex items-center gap-2">
            <Notebook className="w-4.5 h-4.5 text-slate-500" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600">Remittances Registry Table</h4>
          </div>
          <span className="text-[10.5px] font-bold text-slate-400 uppercase tracking-widest">{filteredRecords.length} records matched</span>
        </div>

        <div className="overflow-x-auto min-w-full">
          <table className="min-w-full divide-y divide-slate-100">
            <thead className="bg-slate-50/30">
              <tr>
                <th scope="col" className="px-6 py-3.5 text-left text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Trans Number</th>
                <th scope="col" className="px-6 py-3.5 text-left text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Customer Name</th>
                <th scope="col" className="px-6 py-3.5 text-left text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Phone Number</th>
                <th scope="col" className="px-6 py-3.5 scope-col text-left text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Amount Sent</th>
                <th scope="col" className="px-6 py-3.5 text-left text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Record Date</th>
                <th scope="col" className="px-6 py-3.5 text-left text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Notes</th>
                <th scope="col" className="px-6 py-3.5 text-right text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-100 text-slate-800">
              {filteredRecords.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-xs font-extrabold text-slate-900 tracking-tight">
                    {r.transNo}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-xs font-bold text-slate-800">
                    {r.customerName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-500 font-semibold font-mono">
                    {r.customerPhone}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-xs font-extrabold text-[#11b981]">
                    ${r.amountSent.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-800 font-bold font-mono">
                    <span className="bg-blue-50 text-blue-700 px-2.5 py-1 rounded-lg border border-blue-100/60 block w-fit shadow-xs">
                      {formatRecordDate(r.date)}
                    </span>
                    <span className="text-[9.5px] text-slate-400 font-normal font-sans block mt-1.5 opacity-90">
                      Logged: {formatDateTime(r.createdAt)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-xs text-slate-400 font-medium max-w-[200px] truncate" title={r.notes}>
                    {r.notes || <span className="text-slate-200">-</span>}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-xs font-semibold space-x-2">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedRecord(r);
                        setIsViewModalOpen(true);
                      }}
                      className="p-1.5 hover:bg-blue-50 text-blue-600 rounded-lg hover:text-blue-800 transition-colors cursor-pointer"
                      title="View Details & Previous Remittances Log"
                    >
                      <Eye className="w-4.5 h-4.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => openEditDialog(r)}
                      className="p-1.5 hover:bg-indigo-50 text-indigo-600 rounded-lg hover:text-indigo-800 transition-colors cursor-pointer"
                      title="Edit Record Parameters"
                    >
                      <Edit className="w-4.5 h-4.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteRecord(r.id, r.transNo)}
                      className="p-1.5 hover:bg-rose-50 text-rose-600 rounded-lg hover:text-rose-800 transition-colors cursor-pointer"
                      title="Delete Record"
                    >
                      <Trash2 className="w-4.5 h-4.5" />
                    </button>
                  </td>
                </tr>
              ))}
              {filteredRecords.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-400 text-xs font-bold uppercase tracking-wider">
                    Empty Boundary! No matching money transfer records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ==================================== MODAL: ADD NEW RECORD ==================================== */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl w-full max-w-lg overflow-hidden border border-slate-200"
            >
              <div className="px-6 py-5 bg-[#020617] text-white flex items-center justify-between">
                <div>
                  <h4 className="text-base font-black tracking-tight flex items-center gap-2">
                    <PlusCircle className="w-5 h-5 text-[#1e5ee6]" />
                    <span>Disburse New Remittance</span>
                  </h4>
                  <p className="text-[10px] text-slate-400 font-medium">Auto generating ID: {generateNextTransNo()} and Date: {todayDateStr}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleAddSubmit} className="p-6 space-y-4">
                {formError && (
                  <div className="p-3 bg-rose-50 border border-rose-100 text-rose-700 text-xs font-bold rounded-xl flex items-center gap-2">
                    <AlertCircle className="w-4.5 h-4.5 shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 gap-4">
                  {/* Customer Name */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Customer Name *</label>
                    <div className="relative">
                      <input
                        type="text"
                        required
                        placeholder="John Doe"
                        value={formName}
                        onChange={(e) => {
                          setFormName(e.target.value);
                          setShowNameSuggestions(true);
                        }}
                        onFocus={() => setShowNameSuggestions(true)}
                        onBlur={() => setTimeout(() => setShowNameSuggestions(false), 250)}
                        className="w-full pl-9 pr-4 py-2.5 text-xs font-semibold rounded-xl border border-slate-200 focus:border-[#1e5ee6] transition-all text-slate-800"
                        autoComplete="off"
                      />
                      <User className="absolute left-3 top-3 w-4 h-4 text-slate-400" />

                      {/* Name Suggestions Dropdown */}
                      <AnimatePresence>
                        {showNameSuggestions && nameSuggestions.length > 0 && (
                          <motion.div
                            initial={{ opacity: 0, y: -5 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -5 }}
                            className="absolute z-50 left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-48 overflow-y-auto overflow-x-hidden divide-y divide-slate-100"
                          >
                            <div className="px-3 py-1.5 bg-slate-50/50 border-b border-slate-100 text-[9px] font-bold text-slate-400 tracking-wider uppercase">
                              Matching Customers ({nameSuggestions.length})
                            </div>
                            {nameSuggestions.map((sug, idx) => (
                              <button
                                key={idx}
                                type="button"
                                onMouseDown={() => handleSelectCustomer(sug)}
                                className="w-full text-left px-4 py-2 hover:bg-slate-50 flex items-center justify-between transition-colors cursor-pointer"
                              >
                                <div className="flex flex-col">
                                  <span className="text-xs font-bold text-slate-700">{sug.name}</span>
                                  <span className="text-[10px] text-slate-400 font-medium font-mono">Phone: {sug.phone}</span>
                                </div>
                                <div className="text-[9px] px-2 py-0.5 rounded-md font-bold bg-blue-50 text-blue-600 border border-blue-100/60 uppercase">
                                  Use Customer
                                </div>
                              </button>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>

                  {/* Customer Phone */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Customer Phone Number *</label>
                    <div className="relative">
                      <input
                        type="text"
                        required
                        placeholder="+252 ... or 061..."
                        value={formPhone}
                        onChange={(e) => {
                          setFormPhone(e.target.value);
                          setShowPhoneSuggestions(true);
                        }}
                        onFocus={() => setShowPhoneSuggestions(true)}
                        onBlur={() => setTimeout(() => setShowPhoneSuggestions(false), 250)}
                        className="w-full pl-9 pr-4 py-2.5 text-xs font-semibold rounded-xl border border-slate-200 focus:border-[#1e5ee6] transition-all text-slate-800"
                        autoComplete="off"
                      />
                      <Phone className="absolute left-3 top-3 w-4 h-4 text-slate-400" />

                      {/* Phone Suggestions Dropdown */}
                      <AnimatePresence>
                        {showPhoneSuggestions && phoneSuggestions.length > 0 && (
                          <motion.div
                            initial={{ opacity: 0, y: -5 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -5 }}
                            className="absolute z-50 left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-48 overflow-y-auto overflow-x-hidden divide-y divide-slate-100"
                          >
                            <div className="px-3 py-1.5 bg-slate-50/50 border-b border-slate-100 text-[9px] font-bold text-slate-400 tracking-wider uppercase">
                              Matching Phone Numbers ({phoneSuggestions.length})
                            </div>
                            {phoneSuggestions.map((sug, idx) => (
                              <button
                                key={idx}
                                type="button"
                                onMouseDown={() => handleSelectCustomer(sug)}
                                className="w-full text-left px-4 py-2 hover:bg-slate-50 flex items-center justify-between transition-colors cursor-pointer"
                              >
                                <div className="flex flex-col">
                                  <span className="text-[11px] font-bold text-slate-700 font-mono">{sug.phone}</span>
                                  <span className="text-[9.5px] text-slate-400 font-medium font-sans">Name: {sug.name}</span>
                                </div>
                                <div className="text-[9px] px-2 py-0.5 rounded-md font-bold bg-blue-50 text-blue-600 border border-blue-100/60 uppercase">
                                  Use Customer
                                </div>
                              </button>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>

                  {/* Amount Sent */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Amount Sent ($) *</label>
                    <div className="relative">
                      <input
                        type="number"
                        required
                        min="0.01"
                        step="any"
                        placeholder="150"
                        value={formAmount}
                        onChange={(e) => setFormAmount(e.target.value === '' ? '' : Number(e.target.value))}
                        className="w-full pl-9 pr-4 py-2.5 text-xs font-semibold rounded-xl border border-slate-200 focus:border-[#1e5ee6] transition-all text-slate-800"
                      />
                      <CircleDollarSign className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                    </div>
                  </div>

                  {/* Record Date */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Record Date *</label>
                    <div className="relative">
                      <input
                        type="date"
                        required
                        value={formDate}
                        onChange={(e) => setFormDate(e.target.value)}
                        className="w-full pl-9 pr-4 py-2.5 text-xs font-semibold rounded-xl border border-slate-200 focus:border-[#1e5ee6] transition-all text-slate-800"
                      />
                      <Calendar className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                    </div>
                  </div>

                  {/* Notes */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 font-mono">Description / Notes</label>
                    <textarea
                      rows={3}
                      placeholder="Enter optional description rules, transfer objectives, and customer notes.."
                      value={formNotes}
                      onChange={(e) => setFormNotes(e.target.value)}
                      className="w-full px-4 py-2.5 text-xs font-semibold rounded-xl border border-slate-200 focus:border-[#1e5ee6] transition-all text-slate-800"
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="py-2.5 px-4 bg-slate-50 hover:bg-slate-100 text-slate-550 border border-slate-200 font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="py-2.5 px-5 bg-[#1e5ee6] hover:bg-blue-700 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-md cursor-pointer"
                  >
                    Save Transfer
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ==================================== MODAL: EDIT RECORD ==================================== */}
      <AnimatePresence>
        {isEditModalOpen && selectedRecord && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl w-full max-w-lg overflow-hidden border border-slate-200"
            >
              <div className="px-6 py-5 bg-[#020617] text-white flex items-center justify-between">
                <div>
                  <h4 className="text-base font-black tracking-tight flex items-center gap-2">
                    <Edit className="w-5 h-5 text-[#1e5ee6]" />
                    <span>Edit Remittance Parameters</span>
                  </h4>
                  <p className="text-[10px] text-slate-400 font-medium font-mono">Modifying standard ledger {selectedRecord.transNo}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleEditSubmit} className="p-6 space-y-4">
                {formError && (
                  <div className="p-3 bg-rose-50 border border-rose-100 text-rose-700 text-xs font-bold rounded-xl flex items-center gap-2">
                    <AlertCircle className="w-4.5 h-4.5 shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 gap-4">
                  {/* Customer Name */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Customer Name *</label>
                    <div className="relative">
                      <input
                        type="text"
                        required
                        placeholder="John Doe"
                        value={formName}
                        onChange={(e) => {
                          setFormName(e.target.value);
                          setShowNameSuggestions(true);
                        }}
                        onFocus={() => setShowNameSuggestions(true)}
                        onBlur={() => setTimeout(() => setShowNameSuggestions(false), 250)}
                        className="w-full pl-9 pr-4 py-2.5 text-xs font-semibold rounded-xl border border-slate-200 focus:border-[#1e5ee6] transition-all text-slate-800"
                        autoComplete="off"
                      />
                      <User className="absolute left-3 top-3 w-4 h-4 text-slate-400" />

                      {/* Name Suggestions Dropdown */}
                      <AnimatePresence>
                        {showNameSuggestions && nameSuggestions.length > 0 && (
                          <motion.div
                            initial={{ opacity: 0, y: -5 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -5 }}
                            className="absolute z-50 left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-48 overflow-y-auto overflow-x-hidden divide-y divide-slate-100"
                          >
                            <div className="px-3 py-1.5 bg-slate-50/50 border-b border-slate-100 text-[9px] font-bold text-slate-400 tracking-wider uppercase">
                              Matching Customers ({nameSuggestions.length})
                            </div>
                            {nameSuggestions.map((sug, idx) => (
                              <button
                                key={idx}
                                type="button"
                                onMouseDown={() => handleSelectCustomer(sug)}
                                className="w-full text-left px-4 py-2 hover:bg-slate-50 flex items-center justify-between transition-colors cursor-pointer"
                              >
                                <div className="flex flex-col">
                                  <span className="text-xs font-bold text-slate-700">{sug.name}</span>
                                  <span className="text-[10px] text-slate-400 font-medium font-mono">Phone: {sug.phone}</span>
                                </div>
                                <div className="text-[9px] px-2 py-0.5 rounded-md font-bold bg-blue-50 text-blue-600 border border-blue-100/60 uppercase">
                                  Use Customer
                                </div>
                              </button>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>

                  {/* Customer Phone */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Customer Phone Number *</label>
                    <div className="relative">
                      <input
                        type="text"
                        required
                        placeholder="+252"
                        value={formPhone}
                        onChange={(e) => {
                          setFormPhone(e.target.value);
                          setShowPhoneSuggestions(true);
                        }}
                        onFocus={() => setShowPhoneSuggestions(true)}
                        onBlur={() => setTimeout(() => setShowPhoneSuggestions(false), 250)}
                        className="w-full pl-9 pr-4 py-2.5 text-xs font-semibold rounded-xl border border-slate-200 focus:border-[#1e5ee6] transition-all text-slate-800"
                        autoComplete="off"
                      />
                      <Phone className="absolute left-3 top-3 w-4 h-4 text-slate-400" />

                      {/* Phone Suggestions Dropdown */}
                      <AnimatePresence>
                        {showPhoneSuggestions && phoneSuggestions.length > 0 && (
                          <motion.div
                            initial={{ opacity: 0, y: -5 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -5 }}
                            className="absolute z-50 left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-48 overflow-y-auto overflow-x-hidden divide-y divide-slate-100"
                          >
                            <div className="px-3 py-1.5 bg-slate-50/50 border-b border-slate-100 text-[9px] font-bold text-slate-400 tracking-wider uppercase">
                              Matching Phone Numbers ({phoneSuggestions.length})
                            </div>
                            {phoneSuggestions.map((sug, idx) => (
                              <button
                                key={idx}
                                type="button"
                                onMouseDown={() => handleSelectCustomer(sug)}
                                className="w-full text-left px-4 py-2 hover:bg-slate-50 flex items-center justify-between transition-colors cursor-pointer"
                              >
                                <div className="flex flex-col">
                                  <span className="text-[11px] font-bold text-slate-700 font-mono">{sug.phone}</span>
                                  <span className="text-[9.5px] text-slate-400 font-medium font-sans">Name: {sug.name}</span>
                                </div>
                                <div className="text-[9px] px-2 py-0.5 rounded-md font-bold bg-blue-50 text-blue-600 border border-blue-100/60 uppercase">
                                  Use Customer
                                </div>
                              </button>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>

                  {/* Amount Sent */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 font-mono">Amount Sent ($) *</label>
                    <div className="relative">
                      <input
                        type="number"
                        required
                        min="0.01"
                        step="any"
                        placeholder="150"
                        value={formAmount}
                        onChange={(e) => setFormAmount(e.target.value === '' ? '' : Number(e.target.value))}
                        className="w-full pl-9 pr-4 py-2.5 text-xs font-semibold rounded-xl border border-slate-200 focus:border-[#1e5ee6] transition-all text-slate-800"
                      />
                      <CircleDollarSign className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                    </div>
                  </div>

                  {/* Record Date */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Record Date *</label>
                    <div className="relative">
                      <input
                        type="date"
                        required
                        value={formDate}
                        onChange={(e) => setFormDate(e.target.value)}
                        className="w-full pl-9 pr-4 py-2.5 text-xs font-semibold rounded-xl border border-slate-200 focus:border-[#1e5ee6] transition-all text-slate-800"
                      />
                      <Calendar className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                    </div>
                  </div>

                  {/* Notes */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Description / Notes</label>
                    <textarea
                      rows={3}
                      value={formNotes}
                      onChange={(e) => setFormNotes(e.target.value)}
                      className="w-full px-4 py-2.5 text-xs font-semibold rounded-xl border border-slate-200 focus:border-[#1e5ee6] transition-all text-slate-800"
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsEditModalOpen(false)}
                    className="py-2.5 px-4 bg-slate-50 hover:bg-slate-100 text-slate-550 border border-slate-200 font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="py-2.5 px-5 bg-[#1e5ee6] hover:bg-blue-700 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-md cursor-pointer"
                  >
                    Apply Parameters
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ==================================== MODAL: VIEW DETAILS & CUSTOMER HISTORY ==================================== */}
      <AnimatePresence>
        {isViewModalOpen && selectedRecord && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden border border-slate-200 shadow-2xl"
            >
              <div className="px-6 py-5 bg-[#020617] text-white flex items-center justify-between">
                <div>
                  <h4 className="text-base font-black tracking-tight flex items-center gap-2">
                    <Eye className="w-5 h-5 text-[#1e5ee6]" />
                    <span>Transaction Ledger {selectedRecord.transNo}</span>
                  </h4>
                  <p className="text-[10px] text-slate-400 font-semibold font-mono">Detailed audit trail and client transaction pattern mapping</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsViewModalOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto" id="audit-trail-container">
                
                {/* Visual Receipt Card */}
                <div className="bg-slate-50 border border-dashed border-slate-300 rounded-2xl p-5 space-y-4">
                  <div className="flex justify-between border-b border-slate-200 pb-3">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block leading-none">Dugsiga Subuc Finance Remittance Statement</span>
                      <h5 className="text-base font-black text-slate-900 tracking-tight mt-1">{selectedRecord.transNo}</h5>
                    </div>
                    <div className="text-right">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block leading-none">Status</span>
                      <h5 className="text-xs font-bold text-emerald-600 tracking-tight mt-1 flex items-center gap-1 bg-emerald-50 border border-emerald-100 rounded-lg px-2 py-0.5">
                        <Check className="w-3.5 h-3.5" />
                        <span>Remitted Successfully</span>
                      </h5>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <p className="text-[10px] uppercase font-bold text-slate-400">Customer Name</p>
                      <p className="font-extrabold text-slate-800 mt-1">{selectedRecord.customerName}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase font-bold text-slate-400">Phone Number</p>
                      <p className="font-bold text-slate-800 mt-1 font-mono">{selectedRecord.customerPhone}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase font-bold text-slate-400">Amount Transferred</p>
                      <p className="font-black text-emerald-600 mt-1 text-sm">${selectedRecord.amountSent}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase font-bold text-slate-400">Record Date</p>
                      <p className="font-bold text-blue-700 bg-blue-50/70 border border-blue-100/40 px-2 py-0.5 rounded-lg w-fit mt-1 font-mono">{formatRecordDate(selectedRecord.date)}</p>
                    </div>
                  </div>

                  {selectedRecord.notes && (
                    <div className="bg-white border border-slate-200/60 rounded-xl p-3">
                      <p className="text-[10px] uppercase font-bold text-slate-400">Description / Ledger Notes</p>
                      <p className="text-xs text-slate-650 font-medium leading-relaxed mt-1 whitespace-pre-line">{selectedRecord.notes}</p>
                    </div>
                  )}

                  <div className="flex justify-between items-center pt-2 text-[10px] text-slate-400 font-semibold border-t border-slate-200/60 font-mono">
                    <span>Authorized by: {selectedRecord.createdBy}</span>
                    <span>Logged at: {new Date(selectedRecord.createdAt).toLocaleString()}</span>
                  </div>
                </div>

                {/* HISTORICAL REMITTANCES LEDGER CHART (Customer History Requirement) */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                    <History className="w-4 h-4 text-blue-600" />
                    <h5 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                      Remittance Ledger History for: "{selectedRecord.customerName}"
                    </h5>
                  </div>

                  <div className="bg-slate-50/50 p-4 border border-slate-200 rounded-2xl">
                    {(() => {
                      const prevList = getCustomerTransactions(selectedRecord.customerName, selectedRecord.customerPhone);
                      const totalSent = prevList.reduce((acc, curr) => acc + curr.amountSent, 0);

                      return (
                        <div className="space-y-4">
                          <div className="flex items-center justify-between text-xs font-semibold bg-white p-3 rounded-xl border border-slate-100">
                            <div>
                              <p className="text-[10px] uppercase text-slate-400 font-bold">Total Disbursed Sum</p>
                              <p className="text-base font-black text-emerald-600 mt-0.5">${totalSent.toLocaleString()}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-[10px] uppercase text-slate-400 font-bold">Total remits count</p>
                              <p className="text-base font-black text-slate-800 mt-0.5">{prevList.length} transfers</p>
                            </div>
                          </div>

                          <div className="max-h-[180px] overflow-y-auto border border-slate-100 rounded-xl bg-white divide-y divide-slate-50">
                            {prevList.map(h => (
                              <div key={h.id} className="p-2 px-3 flex items-center justify-between text-xs hover:bg-slate-50 transition-all">
                                <div>
                                  <p className="font-extrabold text-slate-800">{h.transNo}</p>
                                  <p className="text-[10px] text-blue-600 font-mono mt-0.5">{formatRecordDate(h.date)} <span className="text-slate-400 font-sans text-[9px] font-normal ml-1.5">(Logged: {formatDateTime(h.createdAt)})</span></p>
                                </div>
                                <div className="text-right">
                                  <span className="font-black text-emerald-600">${h.amountSent}</span>
                                  {h.notes && <p className="text-[9px] text-slate-400 truncate max-w-[150px] font-medium leading-none mt-1">{h.notes}</p>}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsViewModalOpen(false)}
                    className="py-2.5 px-6 bg-[#020617] text-white font-extrabold text-xs uppercase tracking-wider rounded-xl hover:bg-slate-900 transition-all cursor-pointer"
                  >
                    Dismiss Audit Details
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ==================================== MODAL: GENERATE REPORTS ==================================== */}
      <AnimatePresence>
        {showReportModal && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl w-full max-w-lg overflow-hidden border border-slate-200"
            >
              <div className="px-6 py-5 bg-[#020617] text-white flex items-center justify-between">
                <div>
                  <h4 className="text-base font-black tracking-tight flex items-center gap-2">
                    <Notebook className="w-5 h-5 text-[#1e5ee6]" />
                    <span>Generate Financial Ledger Reports</span>
                  </h4>
                  <p className="text-[10px] text-slate-400 font-medium font-sans">Daily or Monthly remittances report export panel</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowReportModal(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-6">
                
                {/* Mode Selector */}
                <div className="flex bg-slate-100 p-1.5 rounded-2xl gap-2">
                  <button
                    type="button"
                    onClick={() => setReportType('daily')}
                    className={`flex-1 py-2.5 rounded-xl font-bold text-xs uppercase transition-all tracking-wider ${
                      reportType === 'daily' ? 'bg-white text-[#020617] shadow-sm' : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Daily Report
                  </button>
                  <button
                    type="button"
                    onClick={() => setReportType('monthly')}
                    className={`flex-1 py-2.5 rounded-xl font-bold text-xs uppercase transition-all tracking-wider ${
                      reportType === 'monthly' ? 'bg-white text-[#020617] shadow-sm' : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Monthly Report
                  </button>
                  <button
                    type="button"
                    onClick={() => setReportType('range')}
                    className={`flex-1 py-2.5 rounded-xl font-bold text-xs uppercase transition-all tracking-wider ${
                      reportType === 'range' ? 'bg-white text-[#020617] shadow-sm' : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Custom Range
                  </button>
                </div>

                {/* Parameter Selection Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 border border-slate-100 rounded-2xl">
                  {reportType === 'daily' ? (
                    <div className="flex flex-col gap-1.5 md:col-span-2">
                      <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Select Day Ledger *</label>
                      <input
                        type="date"
                        value={reportDate}
                        onChange={(e) => setReportDate(e.target.value)}
                        className="w-full px-4 py-2 text-xs font-semibold rounded-xl border border-slate-200 bg-white"
                      />
                    </div>
                  ) : reportType === 'monthly' ? (
                    <>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Select Month *</label>
                        <select
                          value={reportMonth}
                          onChange={(e) => setReportMonth(e.target.value)}
                          className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 bg-white cursor-pointer"
                        >
                          <option value="01">January</option>
                          <option value="02">February</option>
                          <option value="03">March</option>
                          <option value="04">April</option>
                          <option value="05">May</option>
                          <option value="06">June</option>
                          <option value="07">July</option>
                          <option value="08">August</option>
                          <option value="09">September</option>
                          <option value="10">October</option>
                          <option value="11">November</option>
                          <option value="12">December</option>
                        </select>
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Select Year *</label>
                        <select
                          value={reportYear}
                          onChange={(e) => setReportYear(e.target.value)}
                          className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 bg-white cursor-pointer"
                        >
                          <option value="2025">2025</option>
                          <option value="2026">2026</option>
                          <option value="2027">2027</option>
                        </select>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Start Date *</label>
                        <input
                          type="date"
                          value={reportStartDate}
                          onChange={(e) => setReportStartDate(e.target.value)}
                          className="w-full px-4 py-2 text-xs font-semibold rounded-xl border border-slate-200 bg-white"
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">End Date *</label>
                        <input
                          type="date"
                          value={reportEndDate}
                          onChange={(e) => setReportEndDate(e.target.value)}
                          className="w-full px-4 py-2 text-xs font-semibold rounded-xl border border-slate-200 bg-white"
                        />
                      </div>
                    </>
                  )}
                </div>

                {/* Report Live Preview Ledger Summary */}
                <div className="border border-slate-200 rounded-2xl overflow-hidden bg-slate-50/20">
                  <div className="px-5 py-3 bg-slate-100 border-b border-slate-200 flex justify-between items-center">
                    <span className="text-[10px] uppercase font-bold text-slate-500">Instant Report Profile</span>
                    <span className="text-[10px] font-mono text-slate-600 bg-white px-2 py-0.5 border border-slate-250 rounded-lg">{reportRecords.length} statements found</span>
                  </div>
                  <div className="p-5 space-y-4">
                    <div className="flex items-center justify-between text-slate-700 text-xs">
                      <div>
                        <p className="text-[10px] uppercase font-bold text-slate-400">Total Remitted Funds</p>
                        <p className="text-xl font-black text-emerald-600 mt-1">${reportTotalAmount.toLocaleString()}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] uppercase font-bold text-slate-400">Ledger Count</p>
                        <p className="text-base font-bold text-slate-800 mt-1">{reportRecords.length} cashouts</p>
                      </div>
                    </div>

                    <div className="max-h-[150px] overflow-y-auto border border-slate-100 rounded-xl bg-white divide-y divide-slate-100">
                      {reportRecords.map(rec => (
                        <div key={rec.id} className="p-2.5 px-3.5 flex items-center justify-between text-xs font-medium">
                          <div>
                            <span className="font-extrabold text-slate-800">{rec.transNo}</span>
                            <span className="text-[10px] text-blue-600 bg-blue-50/70 border border-blue-100/40 px-1.5 py-0.5 rounded-md font-mono ml-3">{formatRecordDate(rec.date)}</span>
                          </div>
                          <div className="text-right">
                            <span className="font-semibold text-slate-700">{rec.customerName}</span>
                            <span className="font-black text-emerald-600 ml-4">${rec.amountSent}</span>
                          </div>
                        </div>
                      ))}
                      {reportRecords.length === 0 && (
                        <div className="p-6 text-center text-slate-400 text-xs font-semibold">
                          No transactions recorded for this select boundary.
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions Row */}
                <div className="pt-4 border-t border-slate-150 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <span className="text-[10px] text-slate-400 font-semibold font-mono">AUTHORIZED ACCESS LEVEL 4 — REPORT CONTROLLER</span>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      disabled={reportRecords.length === 0}
                      onClick={handlePrintReport}
                      className="py-2.5 px-3 text-xs bg-slate-150 hover:bg-slate-205 text-slate-700 font-bold uppercase rounded-xl flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <Printer className="w-4 h-4 text-blue-600" />
                      <span>Print Page</span>
                    </button>
                    <button
                      type="button"
                      disabled={reportRecords.length === 0}
                      onClick={handleExportExcel}
                      className="py-2.5 px-3 text-xs bg-slate-150 hover:bg-slate-205 text-slate-700 font-bold uppercase rounded-xl flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                      <span>Excel (CSV)</span>
                    </button>
                    <button
                      type="button"
                      disabled={reportRecords.length === 0}
                      onClick={handleExportPDF}
                      className="py-2.5 px-4 text-xs bg-[#1e5ee6] hover:bg-blue-700 text-white font-extrabold uppercase rounded-xl flex items-center gap-1.5 shadow-md transition-all cursor-pointer disabled:opacity-40 disabled:disabled:cursor-not-allowed"
                    >
                      <FileText className="w-4 h-4" />
                      <span>Export PDF</span>
                    </button>
                  </div>
                </div>

              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Reusable Custom Confirmation Modal to bypass iframe window.confirm block */}
      {confirmModal && confirmModal.isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in" id="transfers-custom-confirm-modal">
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

    </div>
  );
}
