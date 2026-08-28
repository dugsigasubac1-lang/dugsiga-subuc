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
  Notebook,
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  LayoutGrid,
  ListFilter,
  CheckCircle2,
  Building2,
  DollarSign,
  Plus,
  Receipt
} from 'lucide-react';
import { DatabaseState, MoneyTransferRecord, XawaaladaAccount, XawaaladaTransaction } from '../types';
import { DEFAULT_XAWAALADA_ACCOUNTS, DEFAULT_XAWAALADA_TRANSACTIONS, triggerFileDownload } from '../db';

interface MoneyTransferTabProps {
  database: DatabaseState;
  onSaveDatabase: (updatedDb: DatabaseState) => void;
}

export function MoneyTransferTab({ database, onSaveDatabase }: MoneyTransferTabProps) {
  // Accounts and Transactions state from database with fallback defaults
  const accounts: XawaaladaAccount[] = useMemo(() => {
    if (database.xawaaladaAccounts && database.xawaaladaAccounts.length > 0) {
      return database.xawaaladaAccounts;
    }
    return DEFAULT_XAWAALADA_ACCOUNTS;
  }, [database.xawaaladaAccounts]);

  const transactions: XawaaladaTransaction[] = useMemo(() => {
    if (database.xawaaladaTransactions && database.xawaaladaTransactions.length >= 0) {
      return database.xawaaladaTransactions;
    }
    return DEFAULT_XAWAALADA_TRANSACTIONS;
  }, [database.xawaaladaTransactions]);

  // Current local date formatting
  const todayDateStr = useMemo(() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }, []);

  const currentYearStr = useMemo(() => new Date().getFullYear().toString(), []);
  const currentMonthStr = useMemo(() => String(new Date().getMonth() + 1).padStart(2, '0'), []);

  // Primary View Mode: 'board' (Sketched Prototype Layout) | 'list' (Flat Table) | 'summary'
  const [viewMode, setViewMode] = useState<'board' | 'list' | 'summary'>('board');

  // Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAccountId, setSelectedAccountId] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState(''); // Specific YYYY-MM-DD
  const [monthFilter, setMonthFilter] = useState(currentMonthStr); // YYYY-MM or MM
  const [yearFilter, setYearFilter] = useState(currentYearStr);

  // Modals UI state
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<XawaaladaAccount | null>(null);

  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<XawaaladaTransaction | null>(null);

  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [receiptTransaction, setReceiptTransaction] = useState<XawaaladaTransaction | null>(null);

  // Form state for Account
  const [accName, setAccName] = useState('');
  const [accNumber, setAccNumber] = useState('');
  const [accOpening, setAccOpening] = useState<number | ''>('');
  const [accNotes, setAccNotes] = useState('');
  const [accError, setAccError] = useState('');

  // Form state for Transaction
  const [txAccountId, setTxAccountId] = useState('');
  const [txType, setTxType] = useState<'in' | 'out'>('in');
  const [txAmount, setTxAmount] = useState<number | ''>('');
  const [txClientName, setTxClientName] = useState('');
  const [txClientPhone, setTxClientPhone] = useState('');
  const [txRefNo, setTxRefNo] = useState('');
  const [txDescription, setTxDescription] = useState('');
  const [txDate, setTxDate] = useState(todayDateStr);
  const [txTime, setTxTime] = useState('12:00');
  const [txError, setTxError] = useState('');

  // Report filters state
  const [reportMonth, setReportMonth] = useState(`${currentYearStr}-${currentMonthStr}`);
  const [reportType, setReportType] = useState<'monthly' | 'custom'>('monthly');
  const [reportStartDate, setReportStartDate] = useState(todayDateStr);
  const [reportEndDate, setReportEndDate] = useState(todayDateStr);

  // Report custom comment / remarks state with monthly sync and persistence
  const [reportComment, setReportComment] = useState<string>(() => {
    const currentKey = `${currentYearStr}-${currentMonthStr}`;
    return database.xawaaladaSettings?.reportComments?.[currentKey] || 
           database.xawaaladaSettings?.reportComment || 
           localStorage.getItem(`xawaalada_comment_${currentKey}`) || 
           '';
  });

  // Keep reportComment synchronized whenever selected reportMonth or database changes
  React.useEffect(() => {
    if (reportMonth) {
      const saved = database.xawaaladaSettings?.reportComments?.[reportMonth] ?? 
                    database.xawaaladaSettings?.reportComment ?? 
                    localStorage.getItem(`xawaalada_comment_${reportMonth}`) ?? 
                    '';
      setReportComment(saved);
    }
  }, [reportMonth, database.xawaaladaSettings]);

  const handleSaveReportComment = (newComment: string) => {
    setReportComment(newComment);
    const targetKey = reportMonth || `${currentYearStr}-${currentMonthStr}`;
    try {
      localStorage.setItem(`xawaalada_comment_${targetKey}`, newComment);
    } catch (e) {}

    const updatedSettings = {
      ...(database.xawaaladaSettings || {}),
      reportComment: newComment,
      reportComments: {
        ...(database.xawaaladaSettings?.reportComments || {}),
        [targetKey]: newComment
      }
    };

    onSaveDatabase({
      ...database,
      xawaaladaSettings: updatedSettings
    });
    triggerFeedback('Faallada / Qoraalka Warbixinta waa la kaydiyay!');
  };

  // Feedback notifications
  const [feedback, setFeedback] = useState('');
  const triggerFeedback = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(''), 4000);
  };

  // Custom confirmation modal
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    accentColor?: 'rose' | 'indigo' | 'amber' | 'emerald';
    onConfirm: () => void;
  } | null>(null);

  // Autocomplete suggestions for customers
  const uniqueClients = useMemo(() => {
    const list: { name: string; phone: string }[] = [];
    const seen = new Set<string>();
    transactions.forEach(t => {
      const name = (t.clientName || '').trim();
      const phone = (t.clientPhone || '').trim();
      if (name && !seen.has(name.toLowerCase())) {
        seen.add(name.toLowerCase());
        list.push({ name, phone });
      }
    });
    return list;
  }, [transactions]);

  const [showNameSuggestions, setShowNameSuggestions] = useState(false);

  const filteredClients = useMemo(() => {
    if (!txClientName.trim()) return [];
    const q = txClientName.toLowerCase().trim();
    return uniqueClients.filter(c => c.name.toLowerCase().includes(q)).slice(0, 5);
  }, [txClientName, uniqueClients]);

  // Helper generator for reference numbers
  const generateRefNo = () => {
    const nextNum = transactions.length + 101;
    return `REF-${nextNum}`;
  };

  // Filtered transactions list
  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      // Search
      const search = searchTerm.toLowerCase().trim();
      const matchSearch = !search ||
        (t.clientName && t.clientName.toLowerCase().includes(search)) ||
        (t.clientPhone && t.clientPhone.toLowerCase().includes(search)) ||
        (t.referenceNo && t.referenceNo.toLowerCase().includes(search)) ||
        (t.description && t.description.toLowerCase().includes(search));

      // Account filter
      const matchAccount = selectedAccountId === 'all' || t.accountId === selectedAccountId;

      // Date specific
      const matchDate = !dateFilter || t.date === dateFilter;

      // Month specific
      const matchMonth = !monthFilter || t.date.split('-')[1] === monthFilter;

      // Year specific
      const matchYear = !yearFilter || t.date.split('-')[0] === yearFilter;

      return matchSearch && matchAccount && matchDate && matchMonth && matchYear;
    }).sort((a, b) => {
      const dCompare = b.date.localeCompare(a.date);
      if (dCompare !== 0) return dCompare;
      return b.createdAt.localeCompare(a.createdAt);
    });
  }, [transactions, searchTerm, selectedAccountId, dateFilter, monthFilter, yearFilter]);

  // Chronological running balances (Haraaga) map for every transaction in every account
  const runningBalances = useMemo(() => {
    const map = new Map<string, number>(); // tx.id -> balanceAfter
    const prevMap = new Map<string, number>(); // tx.id -> balanceBefore
    const accountCurrentMap = new Map<string, number>(); // accountId -> all-time latest balance

    const txByAccount: Record<string, XawaaladaTransaction[]> = {};
    accounts.forEach(acc => {
      txByAccount[acc.id] = [];
    });

    transactions.forEach(tx => {
      if (!txByAccount[tx.accountId]) {
        txByAccount[tx.accountId] = [];
      }
      txByAccount[tx.accountId].push(tx);
    });

    accounts.forEach(acc => {
      const list = [...(txByAccount[acc.id] || [])];
      // Sort chronologically (oldest first)
      list.sort((a, b) => {
        const dateCmp = (a.date || '').localeCompare(b.date || '');
        if (dateCmp !== 0) return dateCmp;
        const timeCmp = (a.time || '').localeCompare(b.time || '');
        if (timeCmp !== 0) return timeCmp;
        const createCmp = (a.createdAt || '').localeCompare(b.createdAt || '');
        if (createCmp !== 0) return createCmp;
        return (a.id || '').localeCompare(b.id || '');
      });

      let currentRunningBal = Number(acc.openingBalance || 0);
      list.forEach(tx => {
        prevMap.set(tx.id, currentRunningBal);
        const amt = Number(tx.amount || 0);
        if (tx.type === 'in') {
          currentRunningBal += amt;
        } else {
          currentRunningBal -= amt;
        }
        map.set(tx.id, currentRunningBal);
      });
      accountCurrentMap.set(acc.id, currentRunningBal);
    });

    return { map, prevMap, accountCurrentMap };
  }, [accounts, transactions]);

  // Accounting Ledger calculations per account
  const accountCalculations = useMemo(() => {
    const map: Record<string, {
      account: XawaaladaAccount;
      openingBalance: number;
      totalIn: number;
      totalOut: number;
      netChange: number;
      currentBalance: number;
      filteredTxns: XawaaladaTransaction[];
    }> = {};

    let grandOpening = 0;
    let grandIn = 0;
    let grandOut = 0;
    let grandCurrent = 0;

    accounts.forEach(acc => {
      // Filtered transactions for this account subject to date/month filters
      const accTxns = transactions.filter(t => {
        if (t.accountId !== acc.id) return false;

        const matchDate = !dateFilter || t.date === dateFilter;
        const matchMonth = !monthFilter || t.date.split('-')[1] === monthFilter;
        const matchYear = !yearFilter || t.date.split('-')[0] === yearFilter;

        return matchDate && matchMonth && matchYear;
      });

      const totalIn = accTxns.filter(t => t.type === 'in').reduce((sum, t) => sum + Number(t.amount || 0), 0);
      const totalOut = accTxns.filter(t => t.type === 'out').reduce((sum, t) => sum + Number(t.amount || 0), 0);
      const netChange = totalIn - totalOut;
      const currentBalance = acc.openingBalance + totalIn - totalOut;

      map[acc.id] = {
        account: acc,
        openingBalance: acc.openingBalance,
        totalIn,
        totalOut,
        netChange,
        currentBalance,
        filteredTxns: accTxns.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      };

      grandOpening += acc.openingBalance;
      grandIn += totalIn;
      grandOut += totalOut;
      grandCurrent += currentBalance;
    });

    const isBalanced = Math.abs((grandOpening + grandIn - grandOut) - grandCurrent) < 0.01;

    return {
      perAccount: map,
      grandOpening,
      grandIn,
      grandOut,
      grandCurrent,
      isBalanced
    };
  }, [accounts, transactions, dateFilter, monthFilter, yearFilter]);

  // Handle Account Form Submission (Create or Edit)
  const handleAccountSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAccError('');

    if (!accName.trim()) {
      setAccError('Mgaca Akawnku waa maqan yahay (Account Name is required).');
      return;
    }

    const openingNum = typeof accOpening === 'number' ? accOpening : 0;

    let updatedAccounts: XawaaladaAccount[] = [];

    if (editingAccount) {
      updatedAccounts = accounts.map(a => a.id === editingAccount.id ? {
        ...a,
        name: accName.trim(),
        accountNumber: accNumber.trim(),
        openingBalance: openingNum,
        notes: accNotes.trim()
      } : a);
      triggerFeedback(`Akawnka ${accName} waa la cusbooneysiiyay!`);
    } else {
      const newAcc: XawaaladaAccount = {
        id: `acc-${Date.now()}`,
        name: accName.trim(),
        accountNumber: accNumber.trim() || `ACC-${accounts.length + 1}`,
        openingBalance: openingNum,
        notes: accNotes.trim(),
        createdAt: new Date().toISOString()
      };
      updatedAccounts = [...accounts, newAcc];
      triggerFeedback(`Akawnka cusub ee ${accName} waa la abuuray!`);
    }

    onSaveDatabase({
      ...database,
      xawaaladaAccounts: updatedAccounts
    });

    setIsAccountModalOpen(false);
    setEditingAccount(null);
    setAccName('');
    setAccNumber('');
    setAccOpening('');
    setAccNotes('');
  };

  // Delete Account
  const handleDeleteAccount = (acc: XawaaladaAccount) => {
    setConfirmModal({
      isOpen: true,
      title: `Tirtir Akawnka (${acc.name})?`,
      message: `Ma hubtaa inaad tirtirto akawnkan? Dhammaan xawilaadaha ku jira akawnkan ayaa iyagana la tirtiri doonaa!`,
      accentColor: 'rose',
      onConfirm: () => {
        const updatedAccounts = accounts.filter(a => a.id !== acc.id);
        const updatedTxns = transactions.filter(t => t.accountId !== acc.id);
        onSaveDatabase({
          ...database,
          xawaaladaAccounts: updatedAccounts,
          xawaaladaTransactions: updatedTxns
        });
        triggerFeedback(`Akawnka ${acc.name} waa la tirtiray.`);
        setConfirmModal(null);
      }
    });
  };

  // Open Transaction Modal
  const openNewTransaction = (preAccountId?: string, preType?: 'in' | 'out') => {
    setEditingTransaction(null);
    setTxAccountId(preAccountId || (accounts[0]?.id || ''));
    setTxType(preType || 'in');
    setTxAmount('');
    setTxClientName('');
    setTxClientPhone('');
    setTxRefNo(generateRefNo());
    setTxDescription('');
    setTxDate(todayDateStr);
    setTxTime(new Date().toTimeString().slice(0, 5));
    setTxError('');
    setIsTransactionModalOpen(true);
  };

  const openEditTransaction = (tx: XawaaladaTransaction) => {
    setEditingTransaction(tx);
    setTxAccountId(tx.accountId);
    setTxType(tx.type);
    setTxAmount(tx.amount);
    setTxClientName(tx.clientName || '');
    setTxClientPhone(tx.clientPhone || '');
    setTxRefNo(tx.referenceNo || '');
    setTxDescription(tx.description || '');
    setTxDate(tx.date);
    setTxTime(tx.time || '12:00');
    setTxError('');
    setIsTransactionModalOpen(true);
  };

  // Submit Transaction Form
  const handleTransactionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setTxError('');

    if (!txAccountId) {
      setTxError('Fadlan dooro Akawnka (Please select an account).');
      return;
    }
    if (!txAmount || typeof txAmount !== 'number' || txAmount <= 0) {
      setTxError('Fadlan geli lacag sax ah oo ka weyn $0 (Please enter a valid amount).');
      return;
    }

    // Calculate current balance before this new transaction to compute snapshot balanceAfter
    const currentAccBal = runningBalances.accountCurrentMap.get(txAccountId) ?? 
      (accounts.find(a => a.id === txAccountId)?.openingBalance ?? 0);
    const calculatedBalanceAfter = txType === 'in' ? currentAccBal + Number(txAmount) : currentAccBal - Number(txAmount);

    let updatedTxns: XawaaladaTransaction[] = [];

    if (editingTransaction) {
      updatedTxns = transactions.map(t => t.id === editingTransaction.id ? {
        ...t,
        accountId: txAccountId,
        type: txType,
        amount: Number(txAmount),
        balanceAfter: calculatedBalanceAfter,
        clientName: txClientName.trim(),
        clientPhone: txClientPhone.trim(),
        referenceNo: txRefNo.trim(),
        description: txDescription.trim() || (txType === 'in' ? 'Money In Deposit' : 'Money Out Payout'),
        date: txDate,
        time: txTime
      } : t);
      triggerFeedback(`Diiwaanka lacagta waa la cusbooneysiiyay!`);
    } else {
      const newTx: XawaaladaTransaction = {
        id: `TXN-${Date.now()}`,
        accountId: txAccountId,
        type: txType,
        amount: Number(txAmount),
        balanceAfter: calculatedBalanceAfter,
        clientName: txClientName.trim(),
        clientPhone: txClientPhone.trim(),
        referenceNo: txRefNo.trim() || generateRefNo(),
        description: txDescription.trim() || (txType === 'in' ? 'Money In Deposit' : 'Money Out Payout'),
        date: txDate,
        time: txTime,
        createdBy: 'yaxyecabdisalanmohamed1234@gmail.com',
        createdAt: new Date().toISOString()
      };
      updatedTxns = [newTx, ...transactions];
      triggerFeedback(`Lacagta $${txAmount} (${txType === 'in' ? 'Money In' : 'Money Out'}) waa la diiwaangeliyay! Haraaga Cusub: $${calculatedBalanceAfter.toFixed(2)}`);
    }

    const updatedMoneyTransfers = updatedTxns.map(tx => ({
      id: tx.id,
      transNo: tx.referenceNo || tx.id,
      customerName: tx.clientName || 'N/A',
      customerPhone: tx.clientPhone || 'N/A',
      amountSent: tx.amount,
      date: tx.date,
      notes: tx.description || '',
      createdBy: tx.createdBy || 'yaxyecabdisalanmohamed1234@gmail.com',
      createdAt: tx.createdAt || new Date().toISOString()
    }));

    onSaveDatabase({
      ...database,
      xawaaladaTransactions: updatedTxns,
      moneyTransfers: updatedMoneyTransfers
    });

    setIsTransactionModalOpen(false);
  };

  // Delete Transaction
  const handleDeleteTransaction = (tx: XawaaladaTransaction) => {
    setConfirmModal({
      isOpen: true,
      title: `Tirtir Diiwaanka Lacagta ($${tx.amount})?`,
      message: `Ma hubtaa inaad tirtirto diiwaankan? Tallaabadan dib looma soo celin karo.`,
      accentColor: 'rose',
      onConfirm: () => {
        const updatedTxns = transactions.filter(t => t.id !== tx.id);
        const updatedMoneyTransfers = updatedTxns.map(t => ({
          id: t.id,
          transNo: t.referenceNo || t.id,
          customerName: t.clientName || 'N/A',
          customerPhone: t.clientPhone || 'N/A',
          amountSent: t.amount,
          date: t.date,
          notes: t.description || '',
          createdBy: t.createdBy || 'yaxyecabdisalanmohamed1234@gmail.com',
          createdAt: t.createdAt || new Date().toISOString()
        }));
        onSaveDatabase({
          ...database,
          xawaaladaTransactions: updatedTxns,
          moneyTransfers: updatedMoneyTransfers
        });
        triggerFeedback(`Diiwaanka lacagta waa la tirtiray.`);
        setConfirmModal(null);
      }
    });
  };

  // Generate TXT Monthly Ledger Report
  const downloadTxtReport = () => {
    let text = `========================================================================\n`;
    text += `         DUGSIGA SUBUC & XAWAALLADA - MONTHLY ACCOUNT LEDGER REPORT\n`;
    text += `========================================================================\n`;
    text += `Report Period: ${reportMonth || 'All Months'}\n`;
    text += `Generated At : ${new Date().toLocaleString()}\n`;
    text += `Status Check : ${accountCalculations.isBalanced ? '🟢 SYSTEM BALANCED & RECONCILED' : '⚠️ UNBALANCED'}\n`;
    text += `------------------------------------------------------------------------\n\n`;

    text += `SUMMARY OF ACCOUNTS & BALANCES:\n`;
    text += `------------------------------------------------------------------------------------------------------------------------\n`;
    text += `ACCOUNT NAME                     | OPENING BAL   | TOTAL IN (+)  | TOTAL OUT (-) | NET CHANGE    | CLOSING BALANCE\n`;
    text += `------------------------------------------------------------------------------------------------------------------------\n`;

    accounts.forEach(acc => {
      const calc = accountCalculations.perAccount[acc.id];
      const nameCol = (acc.name).padEnd(32, ' ');
      const openCol = (`$${calc.openingBalance.toFixed(2)}`).padEnd(15, ' ');
      const inCol = (`+$${calc.totalIn.toFixed(2)}`).padEnd(15, ' ');
      const outCol = (`-$${calc.totalOut.toFixed(2)}`).padEnd(15, ' ');
      const netCol = (`${calc.netChange >= 0 ? '+' : ''}$${calc.netChange.toFixed(2)}`).padEnd(15, ' ');
      const closeCol = (`$${calc.currentBalance.toFixed(2)}`);

      text += `${nameCol} | ${openCol} | ${inCol} | ${outCol} | ${netCol} | ${closeCol}\n`;
    });

    text += `------------------------------------------------------------------------------------------------------------------------\n`;
    text += `GRAND TOTALS                     | $${accountCalculations.grandOpening.toFixed(2).padEnd(13, ' ')} | +$${accountCalculations.grandIn.toFixed(2).padEnd(12, ' ')} | -$${accountCalculations.grandOut.toFixed(2).padEnd(12, ' ')} | ${accountCalculations.grandIn - accountCalculations.grandOut >= 0 ? '+' : ''}$${(accountCalculations.grandIn - accountCalculations.grandOut).toFixed(2).padEnd(12, ' ')} | $${accountCalculations.grandCurrent.toFixed(2)}\n`;
    text += `================================================================================----------------------------------------\n\n`;

    text += `DETAILED TRANSACTION JOURNAL PER ACCOUNT:\n`;
    text += `========================================================================\n\n`;

    accounts.forEach(acc => {
      const calc = accountCalculations.perAccount[acc.id];
      text += `>>> ACCOUNT: ${acc.name} (${acc.accountNumber || 'N/A'})\n`;
      text += `    Starting Balance: $${calc.openingBalance.toFixed(2)}\n`;
      text += `    --------------------------------------------------------------------\n`;

      if (calc.filteredTxns.length === 0) {
        text += `    (No transactions recorded for this period)\n\n`;
      } else {
        calc.filteredTxns.forEach((tx, idx) => {
          const typeStr = tx.type === 'in' ? '[MONEY IN +]' : '[MONEY OUT -]';
          const balAfter = runningBalances.map.get(tx.id) ?? tx.balanceAfter ?? 0;
          text += `    ${idx + 1}. ${tx.date} ${tx.time || ''} ${typeStr} $${tx.amount.toFixed(2)} | Haraaga (Bal After): $${balAfter.toFixed(2)} | Ref: ${tx.referenceNo || 'N/A'}\n`;
          text += `       Client: ${tx.clientName || 'N/A'} (${tx.clientPhone || 'N/A'})\n`;
          text += `       Note  : ${tx.description}\n`;
        });
        text += `    --------------------------------------------------------------------\n`;
        text += `    ACCOUNT CLOSING BALANCE: $${calc.currentBalance.toFixed(2)}\n\n`;
      }
    });

    if (reportComment && reportComment.trim()) {
      text += `========================================================================\n`;
      text += `3. FAALLADA MAAMULKA / AUDITOR REMARKS & NOTES (REPORT COMMENT):\n`;
      text += `------------------------------------------------------------------------\n`;
      text += `${reportComment.trim()}\n`;
      text += `========================================================================\n\n`;
    }

    triggerFileDownload(`xawaallada_monthly_report_${reportMonth}.txt`, text);
    triggerFeedback('Warbixinta Billeedka ah ee Xawaallada waa la soo dejiyay (.TXT)!');
  };

  // Generate CSV Monthly Ledger Report
  const downloadCsvReport = () => {
    let csv = `Account Name,Account Number,Opening Balance ($),Total Money In (+),Total Money Out (-),Net Change ($),Closing Balance ($)\n`;

    accounts.forEach(acc => {
      const calc = accountCalculations.perAccount[acc.id];
      csv += `"${acc.name.replace(/"/g, '""')}","${(acc.accountNumber || '').replace(/"/g, '""')}",${calc.openingBalance.toFixed(2)},${calc.totalIn.toFixed(2)},${calc.totalOut.toFixed(2)},${calc.netChange.toFixed(2)},${calc.currentBalance.toFixed(2)}\n`;
    });

    csv += `\n"GRAND TOTALS","--",${accountCalculations.grandOpening.toFixed(2)},${accountCalculations.grandIn.toFixed(2)},${accountCalculations.grandOut.toFixed(2)},${(accountCalculations.grandIn - accountCalculations.grandOut).toFixed(2)},${accountCalculations.grandCurrent.toFixed(2)}\n\n`;

    csv += `Transaction ID,Account Name,Date,Time,Type,Amount ($),Haraaga (Balance After $),Client Name,Client Phone,Reference No,Description\n`;

    transactions.forEach(tx => {
      const acc = accounts.find(a => a.id === tx.accountId);
      const accName = acc ? acc.name : 'Unknown';
      const balAfter = runningBalances.map.get(tx.id) ?? tx.balanceAfter ?? 0;
      csv += `"${tx.id}","${accName.replace(/"/g, '""')}","${tx.date}","${tx.time || ''}","${tx.type === 'in' ? 'Money In (+)' : 'Money Out (-)'}",${tx.amount.toFixed(2)},${balAfter.toFixed(2)},"${(tx.clientName || '').replace(/"/g, '""')}","${(tx.clientPhone || '').replace(/"/g, '""')}","${(tx.referenceNo || '').replace(/"/g, '""')}","${(tx.description || '').replace(/"/g, '""')}"\n`;
    });

    if (reportComment && reportComment.trim()) {
      csv += `\n"FAALLADA MAAMULKA / AUDITOR REMARKS & NOTES","${reportComment.replace(/"/g, '""')}"\n`;
    }

    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `xawaallada_monthly_ledger_${reportMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    triggerFeedback('Warbixinta Excel (.CSV) waa la soo dejiyay!');
  };

  // Generate PDF Monthly Ledger Report using jsPDF
  const downloadPdfReport = () => {
    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      let y = 15;

      const checkAddPage = (needed: number) => {
        if (y + needed > pageHeight - 15) {
          doc.addPage();
          y = 15;
        }
      };

      // Header Banner
      doc.setFillColor(33, 84, 61); // #21543d
      doc.rect(14, y, pageWidth - 28, 18, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(13);
      doc.text("DUGSIGA SUBUC & XAWAALLADA", 18, y + 7);

      doc.setFontSize(8.5);
      doc.setFont('Helvetica', 'normal');
      doc.text("MONTHLY ACCOUNT AUDIT LEDGER STATEMENT & RECONCILIATION REPORT", 18, y + 13);

      y += 24;

      // Metadata Summary Box
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(14, y, pageWidth - 28, 14, 2, 2, 'F');
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(14, y, pageWidth - 28, 14, 2, 2, 'S');

      doc.setTextColor(51, 65, 85);
      doc.setFontSize(8.5);
      doc.setFont('Helvetica', 'bold');
      doc.text(`Period / Bisha: ${reportMonth || 'All Months'}`, 18, y + 6);
      doc.text(`Generated: ${new Date().toLocaleDateString()}`, 90, y + 6);
      doc.text(`Status: ${accountCalculations.isBalanced ? 'RECONCILED & BALANCED' : 'UNBALANCED'}`, 150, y + 6);

      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(8);
      doc.text(`Total Accounts: ${accounts.length} | Grand Current Liquidity: $${accountCalculations.grandCurrent.toFixed(2)}`, 18, y + 11);

      y += 20;

      // Section 1: Summary of Accounts
      doc.setFontSize(10);
      doc.setFont('Helvetica', 'bold');
      doc.setTextColor(33, 84, 61);
      doc.text("1. SUMMARY OF ACCOUNTS & BALANCING CALCULATIONS", 14, y);
      y += 5;

      // Table Header
      doc.setFillColor(241, 245, 249);
      doc.rect(14, y, pageWidth - 28, 7, 'F');
      doc.setFontSize(8);
      doc.setFont('Helvetica', 'bold');
      doc.setTextColor(15, 23, 42);

      doc.text("Account Name", 17, y + 5);
      doc.text("Acc No", 62, y + 5);
      doc.text("Opening ($)", 92, y + 5, { align: 'right' });
      doc.text("Total In (+)", 122, y + 5, { align: 'right' });
      doc.text("Total Out (-)", 152, y + 5, { align: 'right' });
      doc.text("Closing Bal ($)", 193, y + 5, { align: 'right' });
      y += 7;

      doc.setFont('Helvetica', 'normal');
      accounts.forEach((acc, i) => {
        checkAddPage(7);
        const calc = accountCalculations.perAccount[acc.id];
        if (i % 2 === 1) {
          doc.setFillColor(248, 250, 252);
          doc.rect(14, y, pageWidth - 28, 6, 'F');
        }
        doc.setTextColor(15, 23, 42);
        doc.text(acc.name.length > 24 ? acc.name.substring(0, 24) + '...' : acc.name, 17, y + 4.5);
        doc.text(acc.accountNumber || '-', 62, y + 4.5);
        doc.text(`$${calc.openingBalance.toFixed(2)}`, 92, y + 4.5, { align: 'right' });

        doc.setTextColor(16, 185, 129);
        doc.text(`+$${calc.totalIn.toFixed(2)}`, 122, y + 4.5, { align: 'right' });

        doc.setTextColor(225, 29, 72);
        doc.text(`-$${calc.totalOut.toFixed(2)}`, 152, y + 4.5, { align: 'right' });

        doc.setTextColor(15, 23, 42);
        doc.setFont('Helvetica', 'bold');
        doc.text(`$${calc.currentBalance.toFixed(2)}`, 193, y + 4.5, { align: 'right' });
        doc.setFont('Helvetica', 'normal');

        y += 6;
      });

      // Grand Totals Row
      checkAddPage(8);
      doc.setFillColor(33, 84, 61);
      doc.rect(14, y, pageWidth - 28, 7, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('Helvetica', 'bold');
      doc.text("GRAND TOTALS", 17, y + 5);
      doc.text(`$${accountCalculations.grandOpening.toFixed(2)}`, 92, y + 5, { align: 'right' });
      doc.text(`+$${accountCalculations.grandIn.toFixed(2)}`, 122, y + 5, { align: 'right' });
      doc.text(`-$${accountCalculations.grandOut.toFixed(2)}`, 152, y + 5, { align: 'right' });
      doc.text(`$${accountCalculations.grandCurrent.toFixed(2)}`, 193, y + 5, { align: 'right' });

      y += 12;

      // Section 2: Detailed Transaction Journal Stream
      checkAddPage(15);
      doc.setFontSize(10);
      doc.setFont('Helvetica', 'bold');
      doc.setTextColor(33, 84, 61);
      doc.text("2. DETAILED TRANSACTION JOURNAL PER ACCOUNT", 14, y);
      y += 6;

      accounts.forEach(acc => {
        const calc = accountCalculations.perAccount[acc.id];
        checkAddPage(15);
        doc.setFontSize(8.5);
        doc.setFont('Helvetica', 'bold');
        doc.setTextColor(30, 41, 59);
        doc.text(`Account: ${acc.name} (${acc.accountNumber || 'N/A'})`, 14, y);
        doc.setFont('Helvetica', 'normal');
        doc.setTextColor(100, 116, 139);
        doc.text(`Starting Balance: $${calc.openingBalance.toFixed(2)} | Closing Balance: $${calc.currentBalance.toFixed(2)}`, 105, y);
        y += 4;

        if (calc.filteredTxns.length === 0) {
          doc.setFontSize(7.5);
          doc.text("   (No transactions recorded for this period)", 18, y);
          y += 6;
        } else {
          doc.setFillColor(241, 245, 249);
          doc.rect(14, y, pageWidth - 28, 5, 'F');
          doc.setFontSize(7.5);
          doc.setFont('Helvetica', 'bold');
          doc.setTextColor(15, 23, 42);
          doc.text("Date & Time", 16, y + 3.5);
          doc.text("Type", 45, y + 3.5);
          doc.text("Client Name / Phone", 70, y + 3.5);
          doc.text("Ref No / Note", 115, y + 3.5);
          doc.text("Amount ($)", 165, y + 3.5, { align: 'right' });
          doc.text("Haraaga ($)", 193, y + 3.5, { align: 'right' });
          y += 5;

          calc.filteredTxns.forEach(tx => {
            checkAddPage(6);
            doc.setFontSize(7.5);
            doc.setFont('Helvetica', 'normal');
            doc.setTextColor(51, 65, 85);
            doc.text(`${tx.date} ${tx.time || ''}`, 16, y + 3.5);

            if (tx.type === 'in') {
              doc.setTextColor(16, 185, 129);
              doc.text("Money In (+)", 45, y + 3.5);
            } else {
              doc.setTextColor(225, 29, 72);
              doc.text("Money Out (-)", 45, y + 3.5);
            }

            doc.setTextColor(15, 23, 42);
            const clientStr = `${tx.clientName || 'N/A'} ${tx.clientPhone ? `(${tx.clientPhone})` : ''}`;
            doc.text(clientStr.length > 22 ? clientStr.substring(0, 22) + '..' : clientStr, 70, y + 3.5);

            const descStr = `${tx.referenceNo ? `[${tx.referenceNo}] ` : ''}${tx.description}`;
            doc.text(descStr.length > 28 ? descStr.substring(0, 28) + '..' : descStr, 115, y + 3.5);

            doc.setFont('Helvetica', 'bold');
            if (tx.type === 'in') {
              doc.setTextColor(16, 185, 129);
              doc.text(`+$${tx.amount.toFixed(2)}`, 165, y + 3.5, { align: 'right' });
            } else {
              doc.setTextColor(225, 29, 72);
              doc.text(`-$${tx.amount.toFixed(2)}`, 165, y + 3.5, { align: 'right' });
            }

            const balAfter = runningBalances.map.get(tx.id) ?? tx.balanceAfter ?? 0;
            doc.setTextColor(30, 41, 59);
            doc.text(`$${balAfter.toFixed(2)}`, 193, y + 3.5, { align: 'right' });

            y += 5;
          });
          y += 3;
        }
      });

      // Section 3: Faallada & Qoraalka Maamulka (Report Remarks / Auditor Notes)
      if (reportComment && reportComment.trim()) {
        checkAddPage(25);
        y += 4;
        doc.setFontSize(9.5);
        doc.setFont('Helvetica', 'bold');
        doc.setTextColor(33, 84, 61);
        doc.text("3. FAALLADA MAAMULKA & XISAABIYAHA / AUDITOR REMARKS & NOTES", 14, y);
        y += 5;

        const commentLines = doc.splitTextToSize(reportComment.trim(), pageWidth - 36);
        const boxHeight = Math.max(14, commentLines.length * 4.5 + 8);
        checkAddPage(boxHeight + 5);

        doc.setFillColor(254, 243, 199); // light amber box
        doc.roundedRect(14, y, pageWidth - 28, boxHeight, 2, 2, 'F');
        doc.setDrawColor(245, 158, 11);
        doc.setLineWidth(0.3);
        doc.roundedRect(14, y, pageWidth - 28, boxHeight, 2, 2, 'S');

        doc.setTextColor(120, 53, 15);
        doc.setFontSize(8.5);
        doc.setFont('Helvetica', 'normal');
        doc.text(commentLines, 18, y + 6);
        y += boxHeight + 8;
      }

      // Signatures Section
      checkAddPage(30);
      y += 5;
      doc.setDrawColor(203, 213, 225);
      doc.setLineWidth(0.3);
      doc.line(14, y, pageWidth - 14, y);
      y += 8;

      doc.setFontSize(8);
      doc.setFont('Helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text("Insaabka & Xisaabiyaha (Prepared By Accountant):", 14, y);
      doc.text("Oggolaanshaha Maamulka (Approved By Director):", 120, y);

      y += 12;
      doc.line(14, y, 70, y);
      doc.line(120, y, 175, y);

      y += 4;
      doc.setFontSize(7);
      doc.setFont('Helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      doc.text("Sainka & Taariikhda", 14, y);
      doc.text("Sainka & Shaambada", 120, y);

      doc.save(`xawaallada_audit_statement_${reportMonth || 'all'}.pdf`);
      triggerFeedback('Warbixinta PDF-ka ee Xawaallada waa la soo dejiyay!');
    } catch (err) {
      console.error('PDF generation error:', err);
      triggerFeedback('Qalad ayaa dhacay meesha PDF-ka lagu samaynayay.');
    }
  };

  // Robust Print Handler
  const handlePrintStatement = () => {
    const printArea = document.getElementById('print-area');
    if (printArea) {
      const printWindow = window.open('', '_blank', 'width=900,height=850');
      if (printWindow) {
        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>Xawaallada Audit Ledger Statement - ${reportMonth}</title>
              <style>
                body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #0f172a; padding: 24px; line-height: 1.4; }
                h1 { font-size: 20px; font-weight: 900; margin: 0 0 4px 0; color: #1e293b; text-transform: uppercase; }
                p { margin: 0; font-size: 12px; color: #64748b; }
                table { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 12px; }
                th, td { border: 1px solid #cbd5e1; padding: 8px; text-align: left; }
                th { background-color: #f1f5f9; font-weight: 800; color: #1e293b; }
                .text-right { text-align: right; }
                .font-mono { font-family: monospace; }
                .text-emerald-700 { color: #047857; }
                .text-rose-700 { color: #be123c; }
                .bg-slate-900 { background-color: #0f172a; color: white; }
                .bg-amber-50 { background-color: #fffbeb !important; }
                .border-amber-200 { border: 1px solid #fde68a !important; }
                .text-amber-900, .text-amber-950 { color: #78350f !important; }
                .rounded-2xl { border-radius: 12px; }
                .p-4 { padding: 14px; }
                .whitespace-pre-wrap { white-space: pre-wrap; }
                .break-inside-avoid { break-inside: avoid; }
                @media print {
                  @page { size: A4; margin: 12mm; }
                  body { padding: 0; }
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
        return;
      }
    }
    window.print();
  };

  // Receipt Voucher Print Handler
  const handlePrintReceipt = () => {
    const printArea = document.getElementById('receipt-print-area');
    if (printArea) {
      const printWindow = window.open('', '_blank', 'width=700,height=750');
      if (printWindow) {
        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>Rasiidka Xawaallada - ${receiptTransaction?.referenceNo || receiptTransaction?.id || 'Receipt'}</title>
              <style>
                body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #0f172a; padding: 24px; line-height: 1.5; background: #fff; }
                .receipt-container { border: 2px dashed #94a3b8; border-radius: 16px; padding: 24px; max-width: 520px; margin: 0 auto; }
                h1 { font-size: 18px; font-weight: 900; margin: 0 0 2px 0; color: #0f172a; text-transform: uppercase; text-align: center; }
                .subtitle { font-size: 11px; color: #64748b; text-align: center; margin-bottom: 16px; }
                .badge { padding: 4px 12px; border-radius: 9999px; font-weight: 800; font-size: 11px; text-transform: uppercase; display: inline-block; }
                .badge-in { background-color: #d1fae5; color: #065f46; }
                .badge-out { background-color: #ffe4e6; color: #9f1239; }
                .highlight-box { background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px; margin: 16px 0; }
                .amount { font-size: 24px; font-weight: 900; font-family: monospace; }
                .haraa-box { background-color: #e0e7ff; border: 1px solid #c7d2fe; border-radius: 10px; padding: 10px 14px; display: flex; justify-content: space-between; align-items: center; margin-top: 10px; }
                .haraa-title { font-weight: 800; font-size: 12px; color: #312e81; }
                .haraa-amount { font-weight: 900; font-size: 16px; font-family: monospace; color: #1e1b4b; }
                .row { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px dashed #e2e8f0; font-size: 12px; }
                .row-label { color: #64748b; font-weight: 600; }
                .row-val { font-weight: 700; color: #0f172a; }
                .signatures { display: flex; justify-content: space-between; margin-top: 28px; font-size: 11px; font-weight: 600; }
                .sig-line { border-bottom: 1px solid #94a3b8; width: 140px; margin-top: 36px; margin-bottom: 4px; }
                @media print {
                  @page { margin: 10mm; }
                  body { padding: 0; }
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
        return;
      }
    }
    window.print();
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Toast Feedback Notification */}
      <AnimatePresence>
        {feedback && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-5 right-5 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-2xl border border-slate-700 flex items-center gap-3"
          >
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <span className="text-xs font-bold">{feedback}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Banner & Header */}
      <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-black uppercase tracking-wider">
              <CircleDollarSign className="w-3.5 h-3.5 text-indigo-400" />
              Nidaamka Xawaallada & Xisaabaadka Akawnnada
            </div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Xawaallada & Multi-Account Ledger Board
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              Maamul akawnno badan oo mid kasta leeyahay lacag bilow ah (Opening Balance). Geli lacagaha soo gala (+) ama baxa (-), nidaamku si toos ah ayuu u samaynayaa xisaabinta, isu-dheelli-tirka (Balancing), iyo warbixinnada billeedka ah.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => {
                setEditingAccount(null);
                setAccName('');
                setAccNumber('');
                setAccOpening('');
                setAccNotes('');
                setAccError('');
                setIsAccountModalOpen(true);
              }}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs rounded-xl shadow-lg transition-all flex items-center gap-2 cursor-pointer border border-indigo-400/30"
            >
              <PlusCircle className="w-4 h-4" />
              + Add Account
            </button>

            <button
              type="button"
              onClick={() => openNewTransaction()}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs rounded-xl shadow-lg transition-all flex items-center gap-2 cursor-pointer border border-emerald-400/30"
            >
              <Plus className="w-4 h-4" />
              Add Money (+/-)
            </button>

            <button
              type="button"
              onClick={() => setIsReportModalOpen(true)}
              className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white font-extrabold text-xs rounded-xl transition-all flex items-center gap-2 cursor-pointer backdrop-blur-md border border-white/10"
            >
              <Download className="w-4 h-4 text-amber-300" />
              End-of-Month Reports
            </button>
          </div>
        </div>

        {/* Global Summary Metrics Bar */}
        <div className="mt-8 pt-6 border-t border-slate-800 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-4">
          <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-3.5 border border-white/10">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase block mb-1">Total Opening Balance</span>
            <span className="text-lg font-black text-slate-100 font-mono">${accountCalculations.grandOpening.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
          </div>

          <div className="bg-emerald-500/10 backdrop-blur-sm rounded-2xl p-3.5 border border-emerald-500/20">
            <span className="text-[10px] font-extrabold text-emerald-400 uppercase block mb-1 flex items-center gap-1">
              <ArrowDownLeft className="w-3 h-3 text-emerald-400" />
              Total Money In (+)
            </span>
            <span className="text-lg font-black text-emerald-300 font-mono">+${accountCalculations.grandIn.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
          </div>

          <div className="bg-rose-500/10 backdrop-blur-sm rounded-2xl p-3.5 border border-rose-500/20">
            <span className="text-[10px] font-extrabold text-rose-400 uppercase block mb-1 flex items-center gap-1">
              <ArrowUpRight className="w-3 h-3 text-rose-400" />
              Total Money Out (-)
            </span>
            <span className="text-lg font-black text-rose-300 font-mono">-${accountCalculations.grandOut.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
          </div>

          <div className="bg-amber-500/10 backdrop-blur-sm rounded-2xl p-3.5 border border-amber-500/20">
            <span className="text-[10px] font-extrabold text-amber-300 uppercase block mb-1">Current Total Net Liquidity</span>
            <span className="text-lg font-black text-amber-200 font-mono">${accountCalculations.grandCurrent.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
          </div>

          <div className="col-span-2 sm:col-span-4 lg:col-span-1 bg-white/5 backdrop-blur-sm rounded-2xl p-3.5 border border-white/10 flex flex-col justify-center">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase block mb-1">Balancing Status</span>
            {accountCalculations.isBalanced ? (
              <span className="inline-flex items-center gap-1.5 text-xs font-black text-emerald-400">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                Balanced & Reconciled
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-xs font-black text-amber-400">
                <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                Unbalanced Entry
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Control Bar: Filters & View Switcher */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 shadow-sm border border-slate-200/80 flex flex-col lg:flex-row items-center justify-between gap-4">
        {/* Left: View Switcher */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-2xl w-full sm:w-auto shrink-0">
          <button
            type="button"
            onClick={() => setViewMode('board')}
            className={`flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
              viewMode === 'board'
                ? 'bg-white text-indigo-950 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <LayoutGrid className="w-4 h-4 text-indigo-600" />
            Ledger Board (Prototype Sketch)
          </button>

          <button
            type="button"
            onClick={() => setViewMode('list')}
            className={`flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
              viewMode === 'list'
                ? 'bg-white text-indigo-950 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ListFilter className="w-4 h-4 text-teal-600" />
            All Transactions List
          </button>
        </div>

        {/* Right: Date / Month / Search Controls (Matching "date/month" on handwritten prototype top right) */}
        <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto justify-end">
          <div className="relative flex-1 sm:flex-none min-w-[180px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search client, ref, note..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium outline-none focus:border-indigo-500 focus:bg-white transition-all"
            />
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider hidden sm:inline">Date/Month:</span>
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-indigo-500 cursor-pointer"
              title="Specific Date Filter"
            />

            <select
              value={monthFilter}
              onChange={(e) => setMonthFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-indigo-500 cursor-pointer"
            >
              <option value="">Dhamaan Bilaha (All Months)</option>
              <option value="01">Jan (01)</option>
              <option value="02">Feb (02)</option>
              <option value="03">Mar (03)</option>
              <option value="04">Apr (04)</option>
              <option value="05">May (05)</option>
              <option value="06">Jun (06)</option>
              <option value="07">Jul (07)</option>
              <option value="08">Aug (08)</option>
              <option value="09">Sep (09)</option>
              <option value="10">Oct (10)</option>
              <option value="11">Nov (11)</option>
              <option value="12">Dec (12)</option>
            </select>

            {(dateFilter || monthFilter || searchTerm || selectedAccountId !== 'all') && (
              <button
                type="button"
                onClick={() => {
                  setDateFilter('');
                  setMonthFilter('');
                  setSearchTerm('');
                  setSelectedAccountId('all');
                }}
                className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all cursor-pointer"
                title="Reset Filters"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Quick Report Comment / Auditor Remarks Banner */}
      <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5 flex-1 w-full">
          <div className="p-2 bg-amber-100 rounded-xl text-amber-800 shrink-0">
            <FileText className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-amber-950 uppercase text-[10px] tracking-wider">
                Faallada Warbixinta Billeedka ah ({reportMonth}):
              </span>
              {reportComment ? (
                <span className="text-[9px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded">
                  Active
                </span>
              ) : (
                <span className="text-[9px] bg-slate-200 text-slate-600 font-bold px-1.5 py-0.5 rounded">
                  Empty
                </span>
              )}
            </div>
            <p className="text-xs text-amber-900 truncate font-medium">
              {reportComment || 'Wax faallo ah laguma darin wali (Qor faallo si ay ugu soo baxdo gunta PDF-ka iyo Print-ka).'}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setIsReportModalOpen(true)}
          className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-black text-xs rounded-xl transition-all cursor-pointer whitespace-nowrap shadow-xs"
        >
          {reportComment ? 'Beddel Faallada' : '+ Ku dar Faallo'}
        </button>
      </div>

      {/* VIEW 1: MULTI-COLUMN LEDGER BOARD (PROTOTYPE SKETCH LAYOUT!) */}
      {viewMode === 'board' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold px-2">
            <span>Showing <strong className="text-slate-900">{accounts.length}</strong> Accounts in Multi-Column Ledger Grid.</span>
            <span className="text-slate-400 italic">Scroll horizontally if necessary to see all accounts side-by-side.</span>
          </div>

          <div className="overflow-x-auto pb-6">
            <div className="flex items-start gap-5 min-w-max">
              {accounts.map((acc, index) => {
                const calc = accountCalculations.perAccount[acc.id] || {
                  openingBalance: acc.openingBalance,
                  totalIn: 0,
                  totalOut: 0,
                  netChange: 0,
                  currentBalance: acc.openingBalance,
                  filteredTxns: []
                };

                return (
                  <div
                    key={acc.id}
                    className="w-80 sm:w-96 bg-white rounded-3xl border border-slate-200/90 shadow-sm flex flex-col shrink-0 overflow-hidden"
                  >
                    {/* Account Column Header (Matching "Account 1 (name)" in sketch) */}
                    <div className="bg-gradient-to-r from-slate-900 to-indigo-950 p-4 text-white space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-extrabold uppercase tracking-widest text-indigo-300">
                          Account {index + 1}
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingAccount(acc);
                              setAccName(acc.name);
                              setAccNumber(acc.accountNumber || '');
                              setAccOpening(acc.openingBalance);
                              setAccNotes(acc.notes || '');
                              setAccError('');
                              setIsAccountModalOpen(true);
                            }}
                            className="p-1 text-slate-300 hover:text-white hover:bg-white/10 rounded-lg transition-all cursor-pointer"
                            title="Edit Account Details"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          {accounts.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleDeleteAccount(acc)}
                              className="p-1 text-slate-400 hover:text-rose-300 hover:bg-rose-500/20 rounded-lg transition-all cursor-pointer"
                              title="Delete Account"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      <h3 className="text-base font-black tracking-tight text-white line-clamp-1">
                        {acc.name}
                      </h3>
                      {acc.accountNumber && (
                        <p className="text-[11px] text-slate-300 font-mono">
                          Acc No: {acc.accountNumber}
                        </p>
                      )}
                    </div>

                    {/* Opening Balance Subheader (Matching "opening balance" in sketch) */}
                    <div className="bg-slate-50 p-3.5 border-b border-slate-200/80 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] font-extrabold text-slate-400 uppercase block">Opening Balance</span>
                        <span className="text-sm font-black text-slate-800 font-mono">${calc.openingBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] font-extrabold text-slate-400 uppercase block">Entries Count</span>
                        <span className="text-xs font-black text-slate-700">{calc.filteredTxns.length} txns</span>
                      </div>
                    </div>

                    {/* Account Quick Add Buttons */}
                    <div className="p-3 bg-slate-100/60 border-b border-slate-200/80 grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => openNewTransaction(acc.id, 'in')}
                        className="py-1.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1 shadow-xs"
                      >
                        <ArrowDownLeft className="w-3.5 h-3.5" />
                        + Money In
                      </button>

                      <button
                        type="button"
                        onClick={() => openNewTransaction(acc.id, 'out')}
                        className="py-1.5 px-3 bg-rose-600 hover:bg-rose-700 text-white font-black text-xs rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1 shadow-xs"
                      >
                        <ArrowUpRight className="w-3.5 h-3.5" />
                        - Money Out
                      </button>
                    </div>

                    {/* Column Transactions Journal Stream */}
                    <div className="p-3 space-y-2.5 max-h-[420px] overflow-y-auto min-h-[220px] bg-slate-50/50">
                      {calc.filteredTxns.length === 0 ? (
                        <div className="py-12 text-center text-slate-400 space-y-2">
                          <Notebook className="w-8 h-8 mx-auto opacity-30 text-slate-400" />
                          <p className="text-xs font-semibold">Ma jiraan lacago lagu diiwaangeliyay akawnkan muddadani.</p>
                        </div>
                      ) : (
                        calc.filteredTxns.map((tx) => (
                          <div
                            key={tx.id}
                            className={`p-3 rounded-2xl border transition-all hover:shadow-md ${
                              tx.type === 'in'
                                ? 'bg-emerald-50/60 border-emerald-200/80'
                                : 'bg-rose-50/60 border-rose-200/80'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <span className="text-[10px] font-bold text-slate-400 block font-mono">
                                  {tx.date} {tx.time ? `• ${tx.time}` : ''}
                                </span>
                                {tx.clientName && (
                                  <h4 className="text-xs font-black text-slate-900 mt-0.5">
                                    {tx.clientName}
                                  </h4>
                                )}
                                {tx.clientPhone && (
                                  <span className="text-[10px] text-slate-500 font-semibold block">
                                    📞 {tx.clientPhone}
                                  </span>
                                )}
                              </div>

                              <div className="text-right shrink-0">
                                <span
                                  className={`text-sm font-black font-mono block ${
                                    tx.type === 'in' ? 'text-emerald-700' : 'text-rose-700'
                                  }`}
                                >
                                  {tx.type === 'in' ? '+' : '-'}${tx.amount.toFixed(2)}
                                </span>
                                {tx.referenceNo && (
                                  <span className="text-[9px] font-mono text-slate-400 block mt-0.5">
                                    {tx.referenceNo}
                                  </span>
                                )}
                              </div>
                            </div>

                            <p className="text-[11px] text-slate-600 mt-1.5 font-medium leading-relaxed italic border-t border-slate-200/60 pt-1.5">
                              {tx.description}
                            </p>

                            {/* Remaining Balance (Haraaga) & Point-in-time calculation breakdown */}
                            <div className="mt-2.5 p-2 bg-white/90 rounded-xl border border-indigo-200/90 shadow-2xs space-y-1.5 text-[11px]">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1.5 text-indigo-950 font-black">
                                  <Wallet className="w-3.5 h-3.5 text-indigo-600" />
                                  <span>Haraaga (Balance):</span>
                                </div>
                                <span className="font-mono font-black text-xs text-indigo-900 bg-indigo-50 px-2 py-0.5 rounded-lg border border-indigo-200">
                                  ${(runningBalances.map.get(tx.id) ?? tx.balanceAfter ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                </span>
                              </div>

                              <div className="grid grid-cols-3 gap-1 pt-1 border-t border-slate-100 text-[10px] text-slate-500">
                                <div className="text-left">
                                  <span className="block text-[9px] font-semibold text-slate-400">Hore:</span>
                                  <span className="font-mono font-bold text-slate-700">
                                    ${(runningBalances.prevMap.get(tx.id) ?? 0).toFixed(2)}
                                  </span>
                                </div>
                                <div className="text-center">
                                  <span className="block text-[9px] font-semibold text-slate-400">Dhaqdhaqaaq:</span>
                                  <span className={`font-mono font-bold ${tx.type === 'in' ? 'text-emerald-600' : 'text-rose-600'}`}>
                                    {tx.type === 'in' ? '+' : '-'}${tx.amount.toFixed(2)}
                                  </span>
                                </div>
                                <div className="text-right">
                                  <span className="block text-[9px] font-black text-indigo-900">Haraa Ka Dib:</span>
                                  <span className="font-mono font-black text-indigo-950">
                                    ${(runningBalances.map.get(tx.id) ?? tx.balanceAfter ?? 0).toFixed(2)}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center justify-end gap-2 mt-2 pt-1">
                              <button
                                type="button"
                                onClick={() => setReceiptTransaction(tx)}
                                className="text-[10px] font-bold text-slate-600 hover:text-indigo-700 cursor-pointer flex items-center gap-0.5 transition-colors"
                                title="Fiiri / Daabac Rasiidka (View Receipt)"
                              >
                                <Receipt className="w-3 h-3 text-indigo-500" />
                                Rasiid
                              </button>
                              <span className="text-slate-300">•</span>
                              <button
                                type="button"
                                onClick={() => openEditTransaction(tx)}
                                className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 cursor-pointer transition-colors"
                              >
                                Edit
                              </button>
                              <span className="text-slate-300">•</span>
                              <button
                                type="button"
                                onClick={() => handleDeleteTransaction(tx)}
                                className="text-[10px] font-bold text-rose-500 hover:text-rose-700 cursor-pointer transition-colors"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    {/* Column Footer: Total = (Matching "Total =" in sketch bottom) */}
                    <div className="bg-slate-900 p-4 text-white border-t border-slate-800 space-y-2 mt-auto">
                      <div className="flex items-center justify-between text-xs text-slate-400">
                        <span>Total Money In (+):</span>
                        <span className="font-mono font-bold text-emerald-400">+${calc.totalIn.toFixed(2)}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-slate-400">
                        <span>Total Money Out (-):</span>
                        <span className="font-mono font-bold text-rose-400">-${calc.totalOut.toFixed(2)}</span>
                      </div>
                      <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                        <span className="text-xs font-black uppercase text-amber-300">Total Balance =</span>
                        <span className="text-base font-black font-mono text-white">${calc.currentBalance.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Add Account Card Button in Grid */}
              <button
                type="button"
                onClick={() => {
                  setEditingAccount(null);
                  setAccName('');
                  setAccNumber('');
                  setAccOpening('');
                  setAccNotes('');
                  setAccError('');
                  setIsAccountModalOpen(true);
                }}
                className="w-80 sm:w-96 rounded-3xl border-2 border-dashed border-slate-300 hover:border-indigo-500 p-8 flex flex-col items-center justify-center text-center space-y-3 transition-all hover:bg-indigo-50/50 cursor-pointer group shrink-0 min-h-[450px]"
              >
                <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center group-hover:scale-110 transition-all">
                  <PlusCircle className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-slate-900 group-hover:text-indigo-600">
                    + Ku dar Akawn Cusub
                  </h4>
                  <p className="text-xs text-slate-500 mt-1 max-w-xs">
                    Add another bank, mobile wallet, or cash box account with its custom opening balance.
                  </p>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: FLAT TRANSACTIONS TABLE LIST */}
      {viewMode === 'list' && (
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-200 flex items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-black text-slate-900">Dhamaan Diiwaanka Xawaallada (All Transactions Stream)</h3>
              <p className="text-xs text-slate-500">Filtered total count: <strong className="text-slate-900">{filteredTransactions.length}</strong> items.</p>
            </div>

            <button
              type="button"
              onClick={() => openNewTransaction()}
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              + Add Transaction
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-black uppercase text-slate-400 tracking-wider">
                  <th className="p-3.5 pl-5">Date & Time</th>
                  <th className="p-3.5">Account Name</th>
                  <th className="p-3.5">Type</th>
                  <th className="p-3.5">Client / Phone</th>
                  <th className="p-3.5">Ref No</th>
                  <th className="p-3.5">Description</th>
                  <th className="p-3.5 text-right">Amount ($)</th>
                  <th className="p-3.5 text-right">Haraaga (Bal After $)</th>
                  <th className="p-3.5 text-right pr-5">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-slate-400 font-semibold">
                      Ma jiraan xawilaado la helay oo u dhigma raadintaada.
                    </td>
                  </tr>
                ) : (
                  filteredTransactions.map(tx => {
                    const acc = accounts.find(a => a.id === tx.accountId);
                    const balAfter = runningBalances.map.get(tx.id) ?? tx.balanceAfter ?? 0;
                    return (
                      <tr key={tx.id} className="hover:bg-slate-50/80 transition-colors font-medium text-slate-800">
                        <td className="p-3.5 pl-5 font-mono text-slate-500">
                          {tx.date} <span className="text-[10px] text-slate-400">{tx.time}</span>
                        </td>
                        <td className="p-3.5 font-bold text-slate-900">
                          {acc?.name || 'Unknown Account'}
                        </td>
                        <td className="p-3.5">
                          <span
                            className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wide inline-flex items-center gap-1 ${
                              tx.type === 'in'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {tx.type === 'in' ? <ArrowDownLeft className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
                            {tx.type === 'in' ? 'Money In' : 'Money Out'}
                          </span>
                        </td>
                        <td className="p-3.5">
                          <span className="font-bold block text-slate-900">{tx.clientName || 'N/A'}</span>
                          {tx.clientPhone && <span className="text-[10px] font-mono text-slate-400 block">{tx.clientPhone}</span>}
                        </td>
                        <td className="p-3.5 font-mono text-slate-500">
                          {tx.referenceNo || '-'}
                        </td>
                        <td className="p-3.5 text-slate-600 max-w-xs truncate">
                          {tx.description}
                        </td>
                        <td className={`p-3.5 text-right font-mono font-black text-sm ${
                          tx.type === 'in' ? 'text-emerald-600' : 'text-rose-600'
                        }`}>
                          {tx.type === 'in' ? '+' : '-'}${tx.amount.toFixed(2)}
                        </td>
                        <td className="p-3.5 text-right font-mono font-bold">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50/90 text-indigo-950 border border-indigo-200/70 text-xs font-black shadow-2xs">
                            <Wallet className="w-3 h-3 text-indigo-500" />
                            ${balAfter.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </span>
                        </td>
                        <td className="p-3.5 text-right pr-5">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => setReceiptTransaction(tx)}
                              className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all cursor-pointer"
                              title="Fiiri / Daabac Rasiidka (View Receipt)"
                            >
                              <Receipt className="w-3.5 h-3.5 text-indigo-600" />
                            </button>
                            <button
                              type="button"
                              onClick={() => openEditTransaction(tx)}
                              className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all cursor-pointer"
                              title="Edit"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteTransaction(tx)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all cursor-pointer"
                              title="Delete"
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
      )}

      {/* MODAL 1: ADD / EDIT ACCOUNT */}
      {isAccountModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-[20000] animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="bg-gradient-to-r from-slate-900 to-indigo-950 p-5 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Wallet className="w-5 h-5 text-indigo-400" />
                <h3 className="font-extrabold text-base">
                  {editingAccount ? 'Wax ka bixi Akawnka' : 'Ku dar Akawn Cusub'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAccountModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAccountSubmit} className="p-6 space-y-4">
              {accError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{accError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-black uppercase text-slate-500 mb-1">
                  Magaca Akawnka (Account Name) *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Account 1 (Zaad Service), Dahabshiil, Premier Bank"
                  value={accName}
                  onChange={(e) => setAccName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:border-indigo-500 focus:bg-white transition-all"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-black uppercase text-slate-500 mb-1">
                  Nambarka Akawnka / ID (Account Number/ID)
                </label>
                <input
                  type="text"
                  placeholder="e.g. 0615551234, DAHAB-1002"
                  value={accNumber}
                  onChange={(e) => setAccNumber(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:border-indigo-500 focus:bg-white transition-all font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-black uppercase text-slate-500 mb-1">
                  Lacagta Bilowga ah (Starting Opening Balance $) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="e.g. 5000.00"
                  value={accOpening}
                  onChange={(e) => setAccOpening(e.target.value === '' ? '' : parseFloat(e.target.value))}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-black font-mono text-slate-900 outline-none focus:border-indigo-500 focus:bg-white transition-all"
                  required
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Kani waa hantida bilowga ah ee lagu furayo akawnkan.
                </span>
              </div>

              <div>
                <label className="block text-xs font-black uppercase text-slate-500 mb-1">
                  Faahfaahin Qoraal ah (Notes)
                </label>
                <textarea
                  rows={2}
                  placeholder="Ku dar faahfaahin dheeraad ah oo ku saabsan akawnkan..."
                  value={accNotes}
                  onChange={(e) => setAccNotes(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium outline-none focus:border-indigo-500 focus:bg-white transition-all"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAccountModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 rounded-xl"
                >
                  Kansal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl shadow-md transition-all cursor-pointer"
                >
                  {editingAccount ? 'Cusbooneysii Akawnka' : 'Kaydi Akawnka'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: ADD / EDIT TRANSACTION (MONEY IN / MONEY OUT) */}
      {isTransactionModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-[20000] animate-fade-in overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden my-8">
            <div
              className={`p-5 text-white flex items-center justify-between ${
                txType === 'in' ? 'bg-gradient-to-r from-emerald-900 to-teal-950' : 'bg-gradient-to-r from-rose-900 to-amber-950'
              }`}
            >
              <div className="flex items-center gap-2">
                {txType === 'in' ? <ArrowDownLeft className="w-5 h-5 text-emerald-400" /> : <ArrowUpRight className="w-5 h-5 text-rose-400" />}
                <h3 className="font-extrabold text-base">
                  {editingTransaction ? 'Wax ka bixi Diiwaanka Lacagta' : txType === 'in' ? 'Geli Lacag Cusub (+ Money In)' : 'Bixi Lacag (- Money Out)'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsTransactionModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleTransactionSubmit} className="p-6 space-y-4">
              {txError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{txError}</span>
                </div>
              )}

              {/* Transaction Type Radio Selector */}
              <div>
                <label className="block text-xs font-black uppercase text-slate-500 mb-1">
                  Nooca Diiwaanka (Transaction Type)
                </label>
                <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-2xl">
                  <button
                    type="button"
                    onClick={() => setTxType('in')}
                    className={`py-2 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      txType === 'in' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <ArrowDownLeft className="w-4 h-4" />
                    + Money In (Lacag Soo Gashay)
                  </button>

                  <button
                    type="button"
                    onClick={() => setTxType('out')}
                    className={`py-2 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      txType === 'out' ? 'bg-rose-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <ArrowUpRight className="w-4 h-4" />
                    - Money Out (Lacag Baxday)
                  </button>
                </div>
              </div>

              {/* Target Account */}
              <div>
                <label className="block text-xs font-black uppercase text-slate-500 mb-1">
                  Dooro Akawnka (Select Account) *
                </label>
                <select
                  value={txAccountId}
                  onChange={(e) => setTxAccountId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-indigo-500 focus:bg-white transition-all cursor-pointer"
                  required
                >
                  {accounts.map(acc => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} (Opening: ${acc.openingBalance})
                    </option>
                  ))}
                </select>
              </div>

              {/* Amount */}
              <div>
                <label className="block text-xs font-black uppercase text-slate-500 mb-1">
                  Lacagta ($ Amount) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="e.g. 250.00"
                  value={txAmount}
                  onChange={(e) => setTxAmount(e.target.value === '' ? '' : parseFloat(e.target.value))}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-black font-mono text-slate-900 outline-none focus:border-indigo-500 focus:bg-white transition-all"
                  required
                />
              </div>

              {/* Live Balance Impact Preview (Haraaga Hadda & Ka Dib) */}
              {(() => {
                const selAcc = accounts.find(a => a.id === txAccountId);
                if (!selAcc) return null;
                const currentAccBal = runningBalances.accountCurrentMap.get(txAccountId) ?? selAcc.openingBalance;
                const numAmt = typeof txAmount === 'number' && txAmount > 0 ? txAmount : 0;
                const projectedBal = txType === 'in' ? currentAccBal + numAmt : currentAccBal - numAmt;
                return (
                  <div className="p-3 bg-indigo-50/70 border border-indigo-200/80 rounded-2xl space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-extrabold text-indigo-950 flex items-center gap-1.5">
                        <Wallet className="w-3.5 h-3.5 text-indigo-600" />
                        Xisaabinta Haraaga ({selAcc.name}):
                      </span>
                      <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800">
                        Live Balance Impact
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 pt-1 text-center">
                      <div className="bg-white p-2 rounded-xl border border-indigo-100 shadow-2xs">
                        <span className="text-[9px] font-black text-slate-400 block uppercase">Haraaga Hadda</span>
                        <span className="text-xs font-black font-mono text-slate-700">
                          ${currentAccBal.toFixed(2)}
                        </span>
                      </div>
                      <div className="bg-white p-2 rounded-xl border border-indigo-100 shadow-2xs">
                        <span className="text-[9px] font-black text-slate-400 block uppercase">Dhaqdhaqaaqa</span>
                        <span className={`text-xs font-black font-mono ${txType === 'in' ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {txType === 'in' ? '+' : '-'}${numAmt.toFixed(2)}
                        </span>
                      </div>
                      <div className={`p-2 rounded-xl border shadow-2xs ${txType === 'in' ? 'bg-emerald-100/90 border-emerald-300 text-emerald-950' : 'bg-rose-100/90 border-rose-300 text-rose-950'}`}>
                        <span className="text-[9px] font-black uppercase block">Haraaga Ka Dib</span>
                        <span className="text-xs font-black font-mono">
                          ${projectedBal.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Client Name with Autocomplete */}
              <div className="relative">
                <label className="block text-xs font-black uppercase text-slate-500 mb-1">
                  Magaca Macmiilka / Qofka (Client Name)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Cabdi Xasan Maxamed"
                  value={txClientName}
                  onChange={(e) => {
                    setTxClientName(e.target.value);
                    setShowNameSuggestions(true);
                  }}
                  onFocus={() => setShowNameSuggestions(true)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:border-indigo-500 focus:bg-white transition-all"
                />

                {/* Autocomplete dropdown */}
                {showNameSuggestions && filteredClients.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-20 overflow-hidden divide-y divide-slate-100">
                    {filteredClients.map((c, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => {
                          setTxClientName(c.name);
                          setTxClientPhone(c.phone);
                          setShowNameSuggestions(false);
                        }}
                        className="w-full px-3.5 py-2 text-left hover:bg-indigo-50 text-xs font-medium text-slate-800 flex items-center justify-between"
                      >
                        <span>{c.name}</span>
                        <span className="text-[10px] font-mono text-slate-400">{c.phone}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Client Phone & Reference No */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-black uppercase text-slate-500 mb-1">
                    Telefoonka (Phone)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 0615112233"
                    value={txClientPhone}
                    onChange={(e) => setTxClientPhone(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-semibold outline-none focus:border-indigo-500 focus:bg-white transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black uppercase text-slate-500 mb-1">
                    Nambarka Tixraaca (Ref No)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. REF-101"
                    value={txRefNo}
                    onChange={(e) => setTxRefNo(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-700 outline-none focus:border-indigo-500 focus:bg-white transition-all"
                  />
                </div>
              </div>

              {/* Date & Time */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-black uppercase text-slate-500 mb-1">
                    Taariikhda (Date)
                  </label>
                  <input
                    type="date"
                    value={txDate}
                    onChange={(e) => setTxDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-indigo-500 focus:bg-white cursor-pointer"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black uppercase text-slate-500 mb-1">
                    Waqtiga (Time)
                  </label>
                  <input
                    type="time"
                    value={txTime}
                    onChange={(e) => setTxTime(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-indigo-500 focus:bg-white cursor-pointer"
                  />
                </div>
              </div>

              {/* Description / Notes */}
              <div>
                <label className="block text-xs font-black uppercase text-slate-500 mb-1">
                  Faahfaahinta Diiwaanka (Description / Reason)
                </label>
                <textarea
                  rows={2}
                  placeholder="Geli faahfaahinta lacagtan (t.g. Bixinta khidmadda, lacag loo soo diray macmiil, shidaal, iwm)..."
                  value={txDescription}
                  onChange={(e) => setTxDescription(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium outline-none focus:border-indigo-500 focus:bg-white transition-all"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsTransactionModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 rounded-xl"
                >
                  Kansal
                </button>
                <button
                  type="submit"
                  className={`px-5 py-2.5 text-white font-extrabold text-xs rounded-xl shadow-md transition-all cursor-pointer ${
                    txType === 'in' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
                  }`}
                >
                  {editingTransaction ? 'Cusbooneysii Diiwaanka' : 'Kaydi Diiwaanka Lacagta'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: END-OF-MONTH REPORT DOWNLOAD OPTIONS */}
      {isReportModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-[20000] animate-fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="bg-gradient-to-r from-slate-900 to-indigo-950 p-5 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-amber-400" />
                <h3 className="font-extrabold text-base">Warbixinnada Billeedka ah ee Xawaallada</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsReportModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              <div>
                <label className="block text-xs font-black uppercase text-slate-500 mb-1">
                  Dooro Bisha Warbixinta (Select Month)
                </label>
                <input
                  type="month"
                  value={reportMonth}
                  onChange={(e) => setReportMonth(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-indigo-500 cursor-pointer"
                />
              </div>

              {/* Status summary preview */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-2 text-xs">
                <span className="text-[10px] font-black uppercase text-slate-400 block">Warbixinta Bisha: {reportMonth}</span>
                <div className="grid grid-cols-2 gap-2 text-slate-700 font-bold">
                  <div>Akawnnado Guud: <span className="font-mono text-indigo-700">{accounts.length}</span></div>
                  <div>Status Check: <span className="text-emerald-700 font-mono font-black">Reconciled</span></div>
                  <div>Grand In (+): <span className="text-emerald-600 font-mono">+${accountCalculations.grandIn.toFixed(2)}</span></div>
                  <div>Grand Out (-): <span className="text-rose-600 font-mono">-${accountCalculations.grandOut.toFixed(2)}</span></div>
                </div>
              </div>

              {/* Report Comment / Auditor Remarks Input */}
              <div className="space-y-2 bg-amber-50/60 p-4 rounded-2xl border border-amber-200/80">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black uppercase text-amber-900 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-amber-700" />
                    Faallada / Qoraalka Warbixinta (Report Comment)
                  </label>
                  <span className="text-[10px] font-bold text-amber-700 bg-amber-100/80 px-2 py-0.5 rounded-md">
                    Waxay ka soo muuqanaysaa hoose (PDF/Print/TXT/CSV)
                  </span>
                </div>
                <textarea
                  rows={3}
                  value={reportComment}
                  onChange={(e) => setReportComment(e.target.value)}
                  placeholder="Geli faallo ama qoraal rasmi ah oo ku saabsan xisaab-xirka bishan (t.g. Dhammaan xisaabaadka bishan waa la xaqiijiyay oo waa sax)..."
                  className="w-full px-3.5 py-2 bg-white border border-amber-300 rounded-xl text-xs font-medium text-slate-900 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                />
                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center gap-1 flex-wrap">
                    <button
                      type="button"
                      onClick={() => handleSaveReportComment("Dhammaan xisaabaadka bishan waa la xaqiijiyay, xisaab-xir rasmi ah oo sax ah.")}
                      className="text-[10px] font-bold text-amber-800 bg-amber-100/80 hover:bg-amber-200 px-2 py-1 rounded-lg transition-colors cursor-pointer"
                    >
                      + Xisaab-xir Sax Ah
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSaveReportComment("Xisaab-xirka bishan waa la dhammaystiray, wax farqi ah ama cillad ah lama helin.")}
                      className="text-[10px] font-bold text-amber-800 bg-amber-100/80 hover:bg-amber-200 px-2 py-1 rounded-lg transition-colors cursor-pointer"
                    >
                      + La Dhammaystiray
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleSaveReportComment(reportComment)}
                    className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white font-black text-xs rounded-lg transition-all cursor-pointer shadow-xs"
                  >
                    Kaydi Faallada
                  </button>
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    downloadPdfReport();
                    setIsReportModalOpen(false);
                  }}
                  className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl transition-all cursor-pointer flex items-center justify-between shadow-md"
                >
                  <span className="flex items-center gap-2">
                    <Download className="w-4 h-4 text-indigo-200" />
                    Soo deji Warbixinta PDF (.PDF Document)
                  </span>
                  <ChevronRight className="w-4 h-4 text-indigo-200" />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    downloadTxtReport();
                    setIsReportModalOpen(false);
                  }}
                  className="w-full py-3 px-4 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs rounded-xl transition-all cursor-pointer flex items-center justify-between"
                >
                  <span className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-amber-400" />
                    Soo deji Warbixinta TXT (.TXT Text Report)
                  </span>
                  <Download className="w-4 h-4 text-slate-400" />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    downloadCsvReport();
                    setIsReportModalOpen(false);
                  }}
                  className="w-full py-3 px-4 bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold text-xs rounded-xl transition-all cursor-pointer flex items-center justify-between"
                >
                  <span className="flex items-center gap-2">
                    <FileSpreadsheet className="w-4 h-4 text-emerald-300" />
                    Soo deji xaashida Excel (.CSV Spreadsheet)
                  </span>
                  <Download className="w-4 h-4 text-emerald-200" />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsReportModalOpen(false);
                    setIsPrintModalOpen(true);
                  }}
                  className="w-full py-3 px-4 bg-slate-800 hover:bg-slate-700 text-white font-extrabold text-xs rounded-xl transition-all cursor-pointer flex items-center justify-between"
                >
                  <span className="flex items-center gap-2">
                    <Printer className="w-4 h-4 text-indigo-300" />
                    Baraarug / Daabac Warbixinta Formatted (.PDF Print)
                  </span>
                  <ChevronRight className="w-4 h-4 text-indigo-200" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: PRINTABLE MONTHLY STATEMENT AUDIT MODAL */}
      {isPrintModalOpen && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 z-[20000] animate-fade-in overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-4xl w-full shadow-2xl border border-slate-200 overflow-hidden my-8">
            <div className="bg-slate-900 p-4 text-white flex items-center justify-between no-print">
              <span className="text-xs font-black uppercase text-indigo-300 tracking-wider">
                Monthly Xawaallada Audit Ledger Statement
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => downloadPdfReport()}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
                >
                  <Download className="w-3.5 h-3.5" />
                  Soo deji PDF
                </button>
                <button
                  type="button"
                  onClick={() => handlePrintStatement()}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Daabac (Print)
                </button>
                <button
                  type="button"
                  onClick={() => setIsPrintModalOpen(false)}
                  className="text-slate-400 hover:text-white p-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Quick Comment Bar (Visible in UI before printing) */}
            <div className="p-4 bg-amber-50/80 border-b border-amber-200 no-print flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs">
              <div className="flex-1 w-full space-y-1">
                <label className="font-extrabold text-amber-950 flex items-center gap-1.5 uppercase text-[11px]">
                  <FileText className="w-3.5 h-3.5 text-amber-700" />
                  Qor ama Beddel Faallada Warbixinta (Report Comment / Remarks)
                </label>
                <input
                  type="text"
                  value={reportComment}
                  onChange={(e) => setReportComment(e.target.value)}
                  placeholder="Geli qoraal ama faallo rasmi ah oo ka soo muuqanaya gunta warbixinta..."
                  className="w-full px-3 py-1.5 bg-white border border-amber-300 rounded-xl text-xs font-medium text-slate-900 outline-none focus:border-amber-500"
                />
              </div>
              <button
                type="button"
                onClick={() => handleSaveReportComment(reportComment)}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-black rounded-xl text-xs whitespace-nowrap cursor-pointer shadow-xs self-end md:self-auto"
              >
                Kaydi Faallada
              </button>
            </div>

            <div className="p-8 space-y-6 text-slate-900 bg-white" id="print-area">
              {/* Header Citation */}
              <div className="border-b border-slate-200 pb-5 flex items-center justify-between">
                <div>
                  <h1 className="text-xl font-black text-slate-950 uppercase">DUGSIGA SUBUC & XAWAALLADA</h1>
                  <p className="text-xs text-slate-500 font-semibold">Monthly Account Balancing & Reconciliation Report</p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 font-black uppercase block">Bisha:</span>
                  <span className="text-sm font-black font-mono text-indigo-900">{reportMonth}</span>
                </div>
              </div>

              {/* Status Banner */}
              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-bold">
                <span className="text-slate-600">Reconciliation Status:</span>
                <span className="text-emerald-700 font-black flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  🟢 SYSTEM BALANCED & RECONCILED
                </span>
              </div>

              {/* Accounts Summary Grid */}
              <div className="space-y-2">
                <h4 className="text-xs font-black uppercase text-slate-500 tracking-wider">1. Summary of Accounts & Balancing Calculations</h4>
                <div className="overflow-x-auto border border-slate-200 rounded-2xl">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-100 font-black text-slate-700 border-b border-slate-200">
                        <th className="p-2.5">Account Name</th>
                        <th className="p-2.5">Acc Number</th>
                        <th className="p-2.5 text-right">Opening Bal ($)</th>
                        <th className="p-2.5 text-right">Total In (+)</th>
                        <th className="p-2.5 text-right">Total Out (-)</th>
                        <th className="p-2.5 text-right">Closing Balance ($)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {accounts.map(acc => {
                        const calc = accountCalculations.perAccount[acc.id];
                        return (
                          <tr key={acc.id}>
                            <td className="p-2.5 font-bold text-slate-900">{acc.name}</td>
                            <td className="p-2.5 font-mono text-slate-500">{acc.accountNumber || '-'}</td>
                            <td className="p-2.5 text-right font-mono">${calc.openingBalance.toFixed(2)}</td>
                            <td className="p-2.5 text-right font-mono text-emerald-700">+${calc.totalIn.toFixed(2)}</td>
                            <td className="p-2.5 text-right font-mono text-rose-700">-${calc.totalOut.toFixed(2)}</td>
                            <td className="p-2.5 text-right font-mono font-black">${calc.currentBalance.toFixed(2)}</td>
                          </tr>
                        );
                      })}
                      <tr className="bg-slate-900 text-white font-black">
                        <td className="p-2.5">GRAND TOTALS</td>
                        <td className="p-2.5 font-mono">--</td>
                        <td className="p-2.5 text-right font-mono">${accountCalculations.grandOpening.toFixed(2)}</td>
                        <td className="p-2.5 text-right font-mono text-emerald-400">+${accountCalculations.grandIn.toFixed(2)}</td>
                        <td className="p-2.5 text-right font-mono text-rose-400">-${accountCalculations.grandOut.toFixed(2)}</td>
                        <td className="p-2.5 text-right font-mono text-amber-300">${accountCalculations.grandCurrent.toFixed(2)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Detailed Transactions Stream */}
              <div className="space-y-4 pt-4 border-t border-slate-200">
                <h4 className="text-xs font-black uppercase text-slate-500 tracking-wider">2. Detailed Transaction Journal Stream</h4>
                {accounts.map(acc => {
                  const calc = accountCalculations.perAccount[acc.id];
                  if (calc.filteredTxns.length === 0) return null;
                  return (
                    <div key={acc.id} className="space-y-2">
                      <div className="flex items-center justify-between text-xs font-bold bg-slate-100 p-2 rounded-xl text-slate-800">
                        <span>Akawnka: {acc.name} ({acc.accountNumber || 'N/A'})</span>
                        <span className="font-mono text-slate-600">Closing: ${calc.currentBalance.toFixed(2)}</span>
                      </div>
                      <table className="w-full text-left text-[11px] border border-slate-200 rounded-xl overflow-hidden">
                        <thead>
                          <tr className="bg-slate-50 font-bold text-slate-600 border-b border-slate-200">
                            <th className="p-2">Date & Time</th>
                            <th className="p-2">Type</th>
                            <th className="p-2">Client / Phone</th>
                            <th className="p-2">Ref No / Note</th>
                            <th className="p-2 text-right">Amount ($)</th>
                            <th className="p-2 text-right">Haraaga ($)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {calc.filteredTxns.map(tx => {
                            const balAfter = runningBalances.map.get(tx.id) ?? tx.balanceAfter ?? 0;
                            return (
                              <tr key={tx.id}>
                                <td className="p-2 text-slate-500">{tx.date} {tx.time || ''}</td>
                                <td className="p-2 font-bold">
                                  {tx.type === 'in' ? (
                                    <span className="text-emerald-700">Money In (+)</span>
                                  ) : (
                                    <span className="text-rose-700">Money Out (-)</span>
                                  )}
                                </td>
                                <td className="p-2 font-semibold text-slate-800">{tx.clientName || 'N/A'} {tx.clientPhone ? `(${tx.clientPhone})` : ''}</td>
                                <td className="p-2 text-slate-600">{tx.referenceNo ? `[${tx.referenceNo}] ` : ''}{tx.description}</td>
                                <td className="p-2 text-right font-mono font-bold">
                                  {tx.type === 'in' ? (
                                    <span className="text-emerald-700">+${tx.amount.toFixed(2)}</span>
                                  ) : (
                                    <span className="text-rose-700">-${tx.amount.toFixed(2)}</span>
                                  )}
                                </td>
                                <td className="p-2 text-right font-mono font-black text-indigo-950">
                                  ${balAfter.toFixed(2)}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  );
                })}
              </div>

              {/* 3. Faallada & Qoraalka Maamulka (Report Remarks / Auditor Notes) */}
              {reportComment && reportComment.trim() && (
                <div className="space-y-2 pt-4 border-t border-slate-200 break-inside-avoid">
                  <h4 className="text-xs font-black uppercase text-amber-900 tracking-wider flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-amber-700" />
                    <span>3. Faallada Maamulka & Xisaabiyaha (Report Remarks & Auditor Notes)</span>
                  </h4>
                  <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-950">
                    <p className="text-xs whitespace-pre-wrap font-medium leading-relaxed">
                      {reportComment}
                    </p>
                  </div>
                </div>
              )}

              {/* Signatures & Approval block */}
              <div className="pt-8 grid grid-cols-2 gap-8 text-xs font-semibold border-t border-dashed border-slate-300">
                <div className="space-y-8">
                  <p>Insaabka & Xisaabiyaha (Prepared By Accountant):</p>
                  <div className="border-b border-slate-400 w-48" />
                  <p className="text-[10px] text-slate-400">Sainka & Taariikhda</p>
                </div>

                <div className="space-y-8 text-right">
                  <p>Oggolaanshaha Maamulka (Approved By Director):</p>
                  <div className="border-b border-slate-400 w-48 ml-auto" />
                  <p className="text-[10px] text-slate-400">Sainka & Shaambada</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: TRANSACTION RECEIPT / VOUCHER (RASIID) */}
      {receiptTransaction && (() => {
        const tx = receiptTransaction;
        const acc = accounts.find(a => a.id === tx.accountId);
        const balAfter = runningBalances.map.get(tx.id) ?? tx.balanceAfter ?? 0;
        const balBefore = runningBalances.prevMap.get(tx.id) ?? (tx.type === 'in' ? balAfter - tx.amount : balAfter + tx.amount);

        return (
          <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 z-[20000] animate-fade-in overflow-y-auto">
            <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden my-6">
              <div className="bg-slate-900 p-4 text-white flex items-center justify-between no-print">
                <span className="text-xs font-black uppercase text-indigo-300 tracking-wider flex items-center gap-1.5">
                  <Receipt className="w-4 h-4 text-indigo-400" />
                  Rasiidka Diiwaanka Xawaallada (Voucher)
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handlePrintReceipt}
                    className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    Daabac Rasiidka
                  </button>
                  <button
                    type="button"
                    onClick={() => setReceiptTransaction(null)}
                    className="text-slate-400 hover:text-white p-1"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Printable Receipt Container */}
              <div id="receipt-print-area" className="p-6">
                <div className="border-2 border-dashed border-slate-300 rounded-2xl p-6 bg-slate-50/50 space-y-4">
                  {/* Header */}
                  <div className="text-center pb-3 border-b border-slate-200">
                    <h2 className="text-lg font-black text-slate-900 tracking-tight uppercase">
                      DUGSIGA SUBUC & XAWAALLADA
                    </h2>
                    <p className="text-[11px] text-slate-500 font-semibold mt-0.5">
                      Rasiidka Diiwaangelinta Lacagta & Haraaga (Transaction Receipt)
                    </p>
                    <div className="mt-2 inline-flex items-center gap-2">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                        tx.type === 'in'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : 'bg-rose-100 text-rose-800 border border-rose-300'
                      }`}>
                        {tx.type === 'in' ? 'Money In (Lacag Soo Gashay)' : 'Money Out (Lacag Baxday)'}
                      </span>
                    </div>
                  </div>

                  {/* Transaction Metadata */}
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="space-y-0.5">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Tixraac (Ref No)</span>
                      <span className="font-mono font-bold text-slate-800">{tx.referenceNo || tx.id}</span>
                    </div>
                    <div className="space-y-0.5 text-right">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Taariikhda & Waqtiga</span>
                      <span className="font-mono font-bold text-slate-800">{tx.date} {tx.time || ''}</span>
                    </div>
                  </div>

                  {/* Account & Client Details */}
                  <div className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-2 text-xs">
                    <div className="flex justify-between border-b border-slate-100 pb-1.5">
                      <span className="text-slate-500 font-medium">Akawnka (Account):</span>
                      <span className="font-bold text-slate-900">{acc?.name || 'N/A'} {acc?.accountNumber ? `(${acc.accountNumber})` : ''}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-100 pb-1.5">
                      <span className="text-slate-500 font-medium">Macmiilka (Client Name):</span>
                      <span className="font-bold text-slate-900">{tx.clientName || 'N/A'}</span>
                    </div>
                    {tx.clientPhone && (
                      <div className="flex justify-between border-b border-slate-100 pb-1.5">
                        <span className="text-slate-500 font-medium">Telefoonka (Phone):</span>
                        <span className="font-mono font-bold text-slate-700">{tx.clientPhone}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-medium">Ujeeddada (Note):</span>
                      <span className="font-medium text-slate-800 text-right max-w-[240px] truncate">{tx.description}</span>
                    </div>
                  </div>

                  {/* Transaction Amount Box */}
                  <div className="text-center p-3.5 bg-white rounded-xl border border-slate-200">
                    <span className="text-[10px] font-black uppercase text-slate-400 block mb-1">
                      Lacagta Diiwaangashan (Amount)
                    </span>
                    <span className={`text-2xl font-black font-mono ${
                      tx.type === 'in' ? 'text-emerald-600' : 'text-rose-600'
                    }`}>
                      {tx.type === 'in' ? '+' : '-'}${tx.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  {/* EXACT HARAA / REMAINING BALANCE HIGHLIGHT BOX */}
                  <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black uppercase text-indigo-950 flex items-center gap-1.5">
                        <Wallet className="w-4 h-4 text-indigo-600" />
                        Haraaga Akawnka Waqtigaas (Remaining Balance):
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 pt-1 border-t border-indigo-200/60 text-xs">
                      <div>
                        <span className="text-[10px] font-semibold text-slate-500 block">Haraagii Hore (Before):</span>
                        <span className="font-mono font-bold text-slate-700">${balBefore.toFixed(2)}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] font-black text-indigo-900 block uppercase">Haraaga Cusub (Haraa Ka Dib):</span>
                        <span className="font-mono font-black text-base text-indigo-950">${balAfter.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Signatures */}
                  <div className="pt-6 grid grid-cols-2 gap-6 text-[11px] font-semibold border-t border-slate-200">
                    <div>
                      <p className="text-slate-600">Qasnajiga / Shaqaalaha:</p>
                      <div className="border-b border-slate-400 w-32 mt-6 mb-1" />
                      <p className="text-[9px] text-slate-400 font-mono">Diiwaangeliyay</p>
                    </div>
                    <div className="text-right">
                      <p className="text-slate-600">Macmiilka / Qofka:</p>
                      <div className="border-b border-slate-400 w-32 ml-auto mt-6 mb-1" />
                      <p className="text-[9px] text-slate-400 font-mono">Saxiixa</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end no-print">
                <button
                  type="button"
                  onClick={() => setReceiptTransaction(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 rounded-xl"
                >
                  Xir (Close)
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* CONFIRMATION DIALOG MODAL */}
      {confirmModal && confirmModal.isOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-[20000] animate-fade-in">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-2xl border border-slate-200">
            <h3 className="text-base font-black text-slate-900">{confirmModal.title}</h3>
            <p className="text-xs text-slate-600 leading-relaxed">{confirmModal.message}</p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setConfirmModal(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 rounded-xl"
              >
                Kansal
              </button>
              <button
                type="button"
                onClick={confirmModal.onConfirm}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs rounded-xl shadow-md cursor-pointer"
              >
                Haa, Tirtir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
