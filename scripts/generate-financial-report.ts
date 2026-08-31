import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';

interface Transaction {
  id: string;
  accountId: string;
  type: 'in' | 'out';
  amount: number;
  balanceAfter?: number;
  clientName?: string;
  clientPhone?: string;
  referenceNo?: string;
  description: string;
  date: string;
  time?: string;
  createdBy?: string;
  createdAt: string;
}

interface Account {
  id: string;
  name: string;
  accountNumber?: string;
  openingBalance: number;
  notes?: string;
}

interface Database {
  xawaaladaAccounts: Account[];
  xawaaladaTransactions: Transaction[];
  billing: any[];
  invoices: any[];
  students: any[];
  teachers: any[];
}

export function generateMonthlyFinancialWorkbook(db: Database, targetMonth: string = '2026-08') {
  const accounts = db.xawaaladaAccounts || [];
  const allTxns = db.xawaaladaTransactions || [];
  
  // Filter for month
  const monthTxns = allTxns.filter(t => t.date && t.date.startsWith(targetMonth));
  const incomes = monthTxns.filter(t => t.type === 'in');
  const expenses = monthTxns.filter(t => t.type === 'out');

  const totalIncome = incomes.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
  const totalExpense = expenses.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
  const netBalance = totalIncome - totalExpense;

  const getAccountName = (accId: string) => {
    const a = accounts.find(acc => acc.id === accId);
    return a ? `${a.name} (${a.accountNumber || ''})` : accId;
  };

  const categorizeExpense = (desc: string, client: string) => {
    const text = `${desc} ${client}`.toLowerCase();
    if (text.includes('mushahar') || text.includes('musharka') || text.includes('nadaafad') || text.includes('macalin')) {
      return 'Mushaharaadka & Shaqaalaha (Salaries)';
    }
    if (text.includes('kira') || text.includes('kirada') || text.includes('kiray')) {
      return 'Kirada Dhismaha (Building Rent)';
    }
    if (text.includes('baska') || text.includes('gaadiid') || text.includes('dareewal')) {
      return 'Baska & Gaadiidka (Bus Transport)';
    }
    if (text.includes('koronto') || text.includes('nec')) {
      return 'Korontada (Electricity - NEC)';
    }
    if (text.includes('biyo') || text.includes('nuwaco') || text.includes('naciim')) {
      return 'Biyaha (Water - Nuwaco/Naciim)';
    }
    if (text.includes('sabuurad') || text.includes('fayl') || text.includes('qalin') || text.includes('qashin') || text.includes('beder') || text.includes('seed')) {
      return 'Qalabka & Xafiiska (Stationery & Supplies)';
    }
    if (text.includes('ranji') || text.includes('dayactir') || text.includes('rinji')) {
      return 'Dayactirka Dhismaha (Painting & Maintenance)';
    }
    if (text.includes('dhaweeye') || text.includes('xanuun') || text.includes('caafimaad')) {
      return 'Caafimaadka & Gurmadka (Student Health/Emergency)';
    }
    if (text.includes('wicitaan') || text.includes('prepaid') || text.includes('hadal')) {
      return 'Wicitaanka & Isgaarsiinta (Communication/Airtime)';
    }
    if (text.includes('edahab') || text.includes('e-dahab') || text.includes('bakad') || text.includes('merchent') || text.includes('merchant')) {
      return 'Xawaalad / Akoon Weyn (Account Transfer/Routing)';
    }
    return 'Kharash Guud (General Expense)';
  };

  // 1. SUMMARY SHEET DATA
  const summaryData = [
    ['DUGSIGA SUBUC - WARBIXINTA GUUD EE MAALIYADDA (FINANCIAL STATEMENT)'],
    ['Muddada Warbixinta (Report Period):', targetMonth],
    ['Taariikhda La Soo Saaray (Export Date):', new Date().toLocaleString()],
    [''],
    ['KOBOCA MAALIYADDA (FINANCIAL OVERVIEW)', 'CADADKA (AMOUNT USD)', 'FAAHFAAHIN (DESCRIPTION)'],
    ['Wadarta Lacagta Soo Gashay (Total Income)', totalIncome, 'Dhammaan lacagaha ardayda, fiiga, baska & diiwaangelinta'],
    ['Wadarta Lacagta Baxday / Kharashka (Total Expenses/Outcome)', totalExpense, 'Mushaharaadka, kirada, korontada, biyaha, baska & qalabka'],
    ['Haraaga Saafiga Ah ee Bishaan (Net Profit/Balance Remaining)', netBalance, netBalance >= 0 ? 'Faa\'iido / Surplus bishan u haray dugsiga' : 'Deficit / Kharashku wuu ka batay'],
    [''],
    ['KHARASHYADA OO QAYBSAN (EXPENSE BREAKDOWN BY CATEGORY)', 'CADADKA (USD)', 'BOQOLKIBA (%)'],
  ];

  // Group expenses by category
  const expenseByCategory: Record<string, number> = {};
  expenses.forEach(tx => {
    const cat = categorizeExpense(tx.description || '', tx.clientName || '');
    expenseByCategory[cat] = (expenseByCategory[cat] || 0) + (Number(tx.amount) || 0);
  });

  Object.entries(expenseByCategory).sort((a, b) => b[1] - a[1]).forEach(([cat, amt]) => {
    const pct = totalExpense > 0 ? ((amt / totalExpense) * 100).toFixed(1) + '%' : '0%';
    summaryData.push([cat, amt, pct]);
  });

  summaryData.push(['']);
  summaryData.push(['AKAWNNADA & HARAAGAYADA (ACCOUNT BALANCES SUMMARY)', 'OPENING BAL ($)', 'TOTAL IN (+)', 'TOTAL OUT (-)', 'CLOSING BAL ($)']);
  
  accounts.forEach(acc => {
    const accTxns = monthTxns.filter(t => t.accountId === acc.id);
    const accIn = accTxns.filter(t => t.type === 'in').reduce((s, t) => s + (Number(t.amount) || 0), 0);
    const accOut = accTxns.filter(t => t.type === 'out').reduce((s, t) => s + (Number(t.amount) || 0), 0);
    const closing = acc.openingBalance + accIn - accOut;
    summaryData.push([
      `${acc.name} (${acc.accountNumber || 'N/A'})`,
      acc.openingBalance,
      accIn,
      accOut,
      closing
    ]);
  });

  // 2. INCOME SHEET DATA
  const incomeHeaders = [
    'No',
    'Taariikhda (Date)',
    'Wakhtiga (Time)',
    'Reference No',
    'Magaca Bixiyaha / Ardayga (Paid By / Student)',
    'Telefoonka (Phone)',
    'Akoonka Lagu Shubay (Account)',
    'Cadadka ($ USD)',
    'Haraaga Kadib ($ Balance After)',
    'Sababta / Faahfaahinta (Description / Notes)'
  ];

  const incomeRows = incomes.map((tx, idx) => [
    idx + 1,
    tx.date,
    tx.time || '',
    tx.referenceNo || `TX-${tx.id.slice(-6)}`,
    tx.clientName || 'N/A',
    tx.clientPhone || 'N/A',
    getAccountName(tx.accountId),
    Number(tx.amount) || 0,
    tx.balanceAfter !== undefined ? Number(tx.balanceAfter) : '',
    tx.description || 'Lacag soo gashay'
  ]);

  // 3. EXPENSE / OUTCOME SHEET DATA (WHERE DID I PAY THIS MONEY TO)
  const expenseHeaders = [
    'No',
    'Taariikhda (Date)',
    'Wakhtiga (Time)',
    'Reference No',
    'Cidda Lacagta La Siiyay (Paid To / Recipient)',
    'Telefoonka / Akoonka (Phone / Account)',
    'Qaybta Kharashka (Expense Category)',
    'Cadadka ($ USD)',
    'Akoonka Laga Bixiyay (Drawn From Account)',
    'Haraaga Kadib ($ Balance After)',
    'Sababta / Ujeedada Lacag-bixinta (Detailed Purpose / Description)'
  ];

  const expenseRows = expenses.map((tx, idx) => [
    idx + 1,
    tx.date,
    tx.time || '',
    tx.referenceNo || `TX-${tx.id.slice(-6)}`,
    tx.clientName || 'N/A',
    tx.clientPhone || 'N/A',
    categorizeExpense(tx.description || '', tx.clientName || ''),
    Number(tx.amount) || 0,
    getAccountName(tx.accountId),
    tx.balanceAfter !== undefined ? Number(tx.balanceAfter) : '',
    tx.description || 'Kharash baxay'
  ]);

  // Create workbook
  const wb = XLSX.utils.book_new();

  // Create sheets
  const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
  const wsIncome = XLSX.utils.aoa_to_sheet([incomeHeaders, ...incomeRows]);
  const wsExpense = XLSX.utils.aoa_to_sheet([expenseHeaders, ...expenseRows]);

  // Auto-fit column widths
  wsSummary['!cols'] = [{ wch: 45 }, { wch: 22 }, { wch: 45 }, { wch: 15 }, { wch: 18 }];
  wsIncome['!cols'] = [{ wch: 6 }, { wch: 14 }, { wch: 10 }, { wch: 16 }, { wch: 30 }, { wch: 16 }, { wch: 25 }, { wch: 14 }, { wch: 16 }, { wch: 45 }];
  wsExpense['!cols'] = [{ wch: 6 }, { wch: 14 }, { wch: 10 }, { wch: 16 }, { wch: 32 }, { wch: 20 }, { wch: 35 }, { wch: 14 }, { wch: 25 }, { wch: 16 }, { wch: 55 }];

  // Append to workbook
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Warbixinta Guud (Summary)');
  XLSX.utils.book_append_sheet(wb, wsIncome, 'Lacagaha Soo Galay (Income)');
  XLSX.utils.book_append_sheet(wb, wsExpense, 'Lacagaha Baxay (Expenses)');

  return wb;
}

// Execute directly
const dbPath = path.join(process.cwd(), 'database.json');
if (fs.existsSync(dbPath)) {
  const db: Database = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
  
  const publicReportsDir = path.join(process.cwd(), 'public', 'reports');
  if (!fs.existsSync(publicReportsDir)) {
    fs.mkdirSync(publicReportsDir, { recursive: true });
  }

  // Generate for August 2026
  const wbAug = generateMonthlyFinancialWorkbook(db, '2026-08');
  const xlsxPathAug = path.join(publicReportsDir, 'Dugsiga_Subuc_Monthly_Financial_Report_August_2026.xlsx');
  XLSX.writeFile(wbAug, xlsxPathAug);
  console.log(`Generated Excel Report at: ${xlsxPathAug}`);

  // Generate for July 2026
  const wbJul = generateMonthlyFinancialWorkbook(db, '2026-07');
  const xlsxPathJul = path.join(publicReportsDir, 'Dugsiga_Subuc_Monthly_Financial_Report_July_2026.xlsx');
  XLSX.writeFile(wbJul, xlsxPathJul);
  console.log(`Generated Excel Report at: ${xlsxPathJul}`);
}
