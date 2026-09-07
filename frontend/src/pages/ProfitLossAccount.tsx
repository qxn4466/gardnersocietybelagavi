import React, { useState, useCallback, useEffect } from 'react';
import { Printer, RefreshCw, Globe, Save, FolderOpen } from 'lucide-react';
import Header from '../components/Header';
import { useTranslation } from '../hooks/useTranslation';
import type { User } from '../types';
import { saveAuditReport, listAuditReports, SavedAuditReport } from '../api/client';
import { getFinancialYear, getPreviousFinancialYear } from '../utils/auditReports';

// ─── Types ───────────────────────────────────────────────────────────────────
export interface PLItem {
  id: string;
  prevAmount: string; // 2024-25
  particulars: string;
  particulars_mr: string;
  currAmount: string; // 2025-26
}

interface ProfitLossAccountProps {
  user?: User | null;
  onLogout?: () => void;
  onToggleMobileMenu?: () => void;
}

// ─── Helper: Parse & Format Numbers ─────────────────────────────────────────
const parseNum = (s: string): number => {
  if (!s) return 0;
  const n = parseFloat(s.replace(/,/g, ''));
  return isNaN(n) ? 0 : n;
};

const fmtNum = (n: number): string => {
  if (n === 0) return '';
  return n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

// ─── Initial Default Data (Exact values from screenshot) ───────────────────
const buildDefaultExpenses = (): PLItem[] => [
  { id: 'exp_1', prevAmount: '2500', particulars: 'Proffessional Tax renewal Fee', particulars_mr: 'व्यावसायिक कर नूतनीकरण शुल्क', currAmount: '3150' },
  { id: 'exp_2', prevAmount: '', particulars: 'Onion Market Godown Expence', particulars_mr: 'कांदा बाजार गोदाम खर्च', currAmount: '1500' },
  { id: 'exp_3', prevAmount: '6,000', particulars: 'Administrative Charges', particulars_mr: 'प्रशासकीय आकार', currAmount: '6010' },
  { id: 'exp_4', prevAmount: '4,820', particulars: 'Annual General Meeting Expenses', particulars_mr: 'वार्षिक सर्वसाधारण सभा खर्च', currAmount: '3,820.00' },
  { id: 'exp_5', prevAmount: '99,936', particulars: 'T.D.S. A/c', particulars_mr: 'टी.डी.एस. खाते', currAmount: '1,33,136.00' },
  { id: 'exp_6', prevAmount: '', particulars: 'Jai Kisan Veget market Corporation Tax', particulars_mr: 'जय किसान भाजीपाला बाजार महामंडळ कर', currAmount: '25,000.00' },
  { id: 'exp_7', prevAmount: '62,865', particulars: 'Onion Market Godown Corporation Tax', particulars_mr: 'कांदा बाजार गोदाम महामंडळ कर', currAmount: '62,118.00' },
  { id: 'exp_8', prevAmount: '2,16,829', particulars: 'Cold Storage Building Corporation Tax', particulars_mr: 'शीतगृह इमारत महामंडळ कर', currAmount: '2,23,319.00' },
  { id: 'exp_9', prevAmount: '59,647', particulars: 'Head office Building Corporation Tax', particulars_mr: 'मुख्य कार्यालय इमारत महामंडळ कर', currAmount: '58,939.00' },
  { id: 'exp_10', prevAmount: '26,098', particulars: 'Contingency A/c', particulars_mr: 'आकस्मिक खर्च खाते', currAmount: '17,461.69' },
  { id: 'exp_11', prevAmount: '', particulars: 'Bank Interest', particulars_mr: 'बँक व्याज', currAmount: '1,129.50' },
  { id: 'exp_12', prevAmount: '19,002', particulars: 'ESI & Other Contibution', particulars_mr: 'ई.एस.आय. व इतर योगदान', currAmount: '13,383.00' },
  { id: 'exp_13', prevAmount: '57503', particulars: 'Electric Power', particulars_mr: 'विद्युत शक्ती', currAmount: '30,704.00' },
  { id: 'exp_14', prevAmount: '21497', particulars: 'Insurance', particulars_mr: 'विमा', currAmount: '21,505.00' },
  { id: 'exp_15', prevAmount: '2400', particulars: 'Honerium', particulars_mr: 'मानधन', currAmount: '2,400.00' },
  { id: 'exp_16', prevAmount: '2658', particulars: 'Insurance fund', particulars_mr: 'विमा निधी', currAmount: '2,109.00' },
  { id: 'exp_17', prevAmount: '29483', particulars: 'Interest On C.C. Loan', particulars_mr: 'चालू कर्जावरील व्याज', currAmount: '29,817.00' },
  { id: 'exp_18', prevAmount: '19500', particulars: 'Legal Fee', particulars_mr: 'कायदेशीर शुल्क', currAmount: '51,915.00' },
  { id: 'exp_19', prevAmount: '22000', particulars: 'Meeting Allowance', particulars_mr: 'सभा भत्ता', currAmount: '15,400.00' },
  { id: 'exp_20', prevAmount: '25400', particulars: 'Monthly Allowance', particulars_mr: 'मासिक भत्ता', currAmount: '11,000.00' },
  { id: 'exp_21', prevAmount: '70147', particulars: 'PF & Other Contibution', particulars_mr: 'पी.एफ. व इतर योगदान', currAmount: '49,396.00' },
  { id: 'exp_22', prevAmount: '910', particulars: 'Postage A/c', particulars_mr: 'टपाल खाते', currAmount: '655.00' },
  { id: 'exp_23', prevAmount: '', particulars: 'Cold Storage Electric Expence', particulars_mr: 'शीतगृह वीज खर्च', currAmount: '3,588.00' },
  { id: 'exp_24', prevAmount: '11840', particulars: 'Riksha Charges', particulars_mr: 'रिक्षा खर्च', currAmount: '9,846.00' },
  { id: 'exp_25', prevAmount: '39330', particulars: 'Sou Laxmi Pigmy Deposit Loan Interest', particulars_mr: 'सौ. लक्ष्मी पिगमी ठेव कर्ज व्याज', currAmount: '36,480.00' },
  { id: 'exp_26', prevAmount: '161928', particulars: 'Sou Laxmi Pigmy Deposit Commision', particulars_mr: 'सौ. लक्ष्मी पिगमी ठेव कमिशन', currAmount: '1,79,105.00' },
  { id: 'exp_27', prevAmount: '', particulars: 'Audit Fee', particulars_mr: 'लेखापरीक्षण शुल्क', currAmount: '44,000.00' },
  { id: 'exp_28', prevAmount: '21600', particulars: 'G.S.T. Filing Fee', particulars_mr: 'जी.एस.टी. दाखल शुल्क', currAmount: '25,400.00' },
  { id: 'exp_29', prevAmount: '189596', particulars: 'Depreciation A/c', particulars_mr: 'घसारा खाते', currAmount: '2,40,118.00' },
  { id: 'exp_30', prevAmount: '12000', particulars: 'Incharge Allowance', particulars_mr: 'प्रभारी भत्ता', currAmount: '10,000.00' },
  { id: 'exp_31', prevAmount: '244578', particulars: 'Daily Wages pay', particulars_mr: 'दैनिक मजुरी वेतन', currAmount: '1,68,301.00' },
  { id: 'exp_32', prevAmount: '2400', particulars: 'Mobile recharge', particulars_mr: 'मोबाईल रिचार्ज', currAmount: '2,200.00' },
  { id: 'exp_33', prevAmount: '71685.36', particulars: 'Printing & Stationery', particulars_mr: 'मुद्रण व लेखन सामग्री', currAmount: '35,364.00' },
  { id: 'exp_34', prevAmount: '46171', particulars: 'Cartage', particulars_mr: 'वाहतूक खर्च', currAmount: '' },
  { id: 'exp_35', prevAmount: '11090', particulars: 'Licence Renewal Fee', particulars_mr: 'परवाना नूतनीकरण शुल्क', currAmount: '' },
  { id: 'exp_36', prevAmount: '', particulars: 'C G.S.T. 9%', particulars_mr: 'केंद्रीय जी.एस.टी. ९%', currAmount: '31,182.92' },
  { id: 'exp_37', prevAmount: '', particulars: 'S G.S.T. 9%', particulars_mr: 'राज्य जी.एस.टी. ९%', currAmount: '31,182.92' },
  { id: 'exp_38', prevAmount: '', particulars: 'C G.S.T. 2.5%', particulars_mr: 'केंद्रीय जी.एस.टी. २.५%', currAmount: '856.73' },
  { id: 'exp_39', prevAmount: '', particulars: 'S G.S.T. 2.5%', particulars_mr: 'राज्य जी.एस.टी. २.५%', currAmount: '856.73' },
  { id: 'exp_40', prevAmount: '4915.46', particulars: 'Bank Commission', particulars_mr: 'बँक कमिशन', currAmount: '10,754.21' },
  { id: 'exp_41', prevAmount: '', particulars: 'Cold Storage Shutter Repairy', particulars_mr: 'शीतगृह शटर दुरुस्ती', currAmount: '7,750.00' },
  { id: 'exp_42', prevAmount: '6671.21', particulars: 'Govt Of India G.S.T. Paid', particulars_mr: 'भारत सरकार जी.एस.टी. भरलेले', currAmount: '1,35,750.50' },
  { id: 'exp_43', prevAmount: '6671.21', particulars: 'Govt Of Karnataka G.S.T. Paid', particulars_mr: 'कर्नाटक सरकार जी.एस.टी. भरलेले', currAmount: '1,35,750.50' },
  { id: 'exp_44', prevAmount: '590782', particulars: 'Pay A/c (Salary)', particulars_mr: 'वेतन खाते (पगार)', currAmount: '4,15,018.00' },
  { id: 'exp_45', prevAmount: '60746', particulars: 'FD Interest (paid)', particulars_mr: 'मुदत ठेव व्याज (दिलेले)', currAmount: '2,53,706.00' },
  { id: 'exp_46', prevAmount: '4797', particulars: 'ESI, PF & GST Online Expenses', particulars_mr: 'ईएसआय, पीएफ व जीएसटी ऑनलाईन खर्च', currAmount: '3,922.00' },
  { id: 'exp_47', prevAmount: '104469', particulars: 'Mortgage Loan Interest', particulars_mr: 'तारण कर्ज व्याज', currAmount: '51,683.00' },
  { id: 'exp_48', prevAmount: '', particulars: 'Deepavali Pooja Expences', particulars_mr: 'दीपावली पूजा खर्च', currAmount: '1,680.00' },
  { id: 'exp_49', prevAmount: '', particulars: 'Cold Storage Board Market Yard', particulars_mr: 'शीतगृह बोर्ड मार्केट यार्ड', currAmount: '7,530.00' },
  { id: 'exp_50', prevAmount: '13540', particulars: 'Pooja Expences', particulars_mr: 'पूजा खर्च', currAmount: '3,915.00' },
  { id: 'exp_51', prevAmount: '1050', particulars: 'Electric Fitting Expences', particulars_mr: 'विद्युत फिटिंग खर्च', currAmount: '550.00' },
  { id: 'exp_52', prevAmount: '14000', particulars: 'Income Tax Filling Expences', particulars_mr: 'आयकर दाखल खर्च', currAmount: '' },
  { id: 'exp_53', prevAmount: '11590', particulars: 'T. Stanes Colour office', particulars_mr: 'टी. स्टेन्स कलर कार्यालय', currAmount: '' },
  { id: 'exp_54', prevAmount: '7200', particulars: 'Head office Cleaning', particulars_mr: 'मुख्य कार्यालय स्वच्छता', currAmount: '' },
  { id: 'exp_55', prevAmount: '3500', particulars: 'Head Office Shutter Repairy', particulars_mr: 'मुख्य कार्यालय शटर दुरुस्ती', currAmount: '' },
];

const buildDefaultIncomes = (): PLItem[] => [
  { id: 'inc_1', prevAmount: '29,822.58', particulars: 'Trading Profit & Loss A/c', particulars_mr: 'व्यापार खात्याचा नफा (Trading Gross Profit)', currAmount: '20,802.96' },
  { id: 'inc_2', prevAmount: '3,00,000.00', particulars: 'Cold Storage Charges', particulars_mr: 'शीतगृह शुल्क', currAmount: '3,00,000.00' },
  { id: 'inc_3', prevAmount: '14,375.00', particulars: 'Dividend on Shares', particulars_mr: 'समभागांवरील लाभांश', currAmount: '11,346.00' },
  { id: 'inc_4', prevAmount: '', particulars: 'T.D.S.', particulars_mr: 'टी.डी.एस.', currAmount: '500.00' },
  { id: 'inc_5', prevAmount: '7,52,885.00', particulars: 'Vegetable Commission', particulars_mr: 'भाजीपाला कमिशन', currAmount: '2,70,646.00' },
  { id: 'inc_6', prevAmount: '1,756.00', particulars: 'Staff Personal Interest', particulars_mr: 'कर्मचारी वैयक्तिक व्याज', currAmount: '377.00' },
  { id: 'inc_7', prevAmount: '', particulars: 'Electrical Power A/c', particulars_mr: 'विद्युत शक्ती खाते जमा', currAmount: '8,682.00' },
  { id: 'inc_8', prevAmount: '82,033.00', particulars: 'Interest on S.B. & R.F.D. D C C Bank', particulars_mr: 'डी.सी.सी. बँक बचत व मुदत ठेव व्याज', currAmount: '81,035.00' },
  { id: 'inc_9', prevAmount: '1,55,400.00', particulars: 'Head Office Building Rent', particulars_mr: 'मुख्य कार्यालय इमारत भाडे', currAmount: '1,80,000.00' },
  { id: 'inc_10', prevAmount: '4,17,312.00', particulars: 'Onion Market Godown Rent', particulars_mr: 'कांदा बाजार गोदाम भाडे', currAmount: '4,37,312.00' },
  { id: 'inc_11', prevAmount: '', particulars: 'Sou. Laxmi Pigmy Deposit Loan Interest', particulars_mr: 'सौ. लक्ष्मी पिगमी ठेव कर्ज व्याज', currAmount: '6,430.00' },
  { id: 'inc_12', prevAmount: '', particulars: 'Sou. Laxmi Pigmy Deposit Commission', particulars_mr: 'सौ. लक्ष्मी पिगमी ठेव कमिशन', currAmount: '16,705.00' },
  { id: 'inc_13', prevAmount: '3,72,600.00', particulars: 'under Godown Rent', particulars_mr: 'गोदाम खालील भाडे', currAmount: '3,84,000.00' },
  { id: 'inc_14', prevAmount: '', particulars: 'C G.S.T. 9 %', particulars_mr: 'केंद्रीय जी.एस.टी. ९%', currAmount: '1,72,196.36' },
  { id: 'inc_15', prevAmount: '', particulars: 'S G.S.T. 9 %', particulars_mr: 'राज्य जी.एस.टी. ९%', currAmount: '1,72,196.36' },
  { id: 'inc_16', prevAmount: '', particulars: 'C G.S.T. 2.5 %', particulars_mr: 'केंद्रीय जी.एस.टी. २.५%', currAmount: '1,029.54' },
  { id: 'inc_17', prevAmount: '', particulars: 'S G.S.T. 2.5 %', particulars_mr: 'राज्य जी.एस.टी. २.५%', currAmount: '1,029.54' },
  { id: 'inc_18', prevAmount: '', particulars: 'Cold Storage Building Shop Rent', particulars_mr: 'शीतगृह इमारत दुकान भाडे', currAmount: '50,000.00' },
  { id: 'inc_19', prevAmount: '2,42,400.00', particulars: 'Cold Storage Building Godown Rent', particulars_mr: 'शीतगृह इमारत गोदाम भाडे', currAmount: '3,53,480.00' },
  { id: 'inc_20', prevAmount: '', particulars: 'F.D. Interest', particulars_mr: 'मुदत ठेव व्याज', currAmount: '9,363.00' },
  { id: 'inc_21', prevAmount: '86,500.00', particulars: 'Income Tax Refund', particulars_mr: 'आयकर परतावा', currAmount: '89,110.00' },
  { id: 'inc_22', prevAmount: '12,720.00', particulars: 'Member Loan & Kind Loan Interest', particulars_mr: 'सभासद कर्ज व वस्तू कर्ज व्याज', currAmount: '' },
];

const ProfitLossAccount: React.FC<ProfitLossAccountProps> = ({ user, onLogout, onToggleMobileMenu }) => {
  const { lang, setLang } = useTranslation();

  const [fromDate, setFromDate] = useState('2025-04-01');
  const [toDate, setToDate] = useState('2026-03-31');
  const [periodDateText, setPeriodDateText] = useState('FROM 01 APRIL 2025 TO 31 MARCH 2026');
  const [finYear, setFinYear] = useState('2025-26');

  const [savedReports, setSavedReports] = useState<SavedAuditReport[]>([]);
  const [selectedReportId, setSelectedReportId] = useState<string>('');
  const [saveStatus, setSaveStatus] = useState<string>('');

  const loadSavedReportsList = useCallback(async () => {
    try {
      const list = await listAuditReports('PROFIT_LOSS');
      setSavedReports(list);
    } catch {
      // Suppress error
    }
  }, []);

  useEffect(() => {
    loadSavedReportsList();
  }, [loadSavedReportsList]);

  const handleSaveReport = async () => {
    if (!finYear.trim() || !fromDate || !toDate || fromDate > toDate) {
      setSaveStatus(lang === 'mr' ? 'चुकीची तारीख' : 'Invalid date range');
      window.setTimeout(() => setSaveStatus(''), 3000);
      return;
    }
    try {
      setSaveStatus('Saving...');
      const saved = await saveAuditReport({
        report_type: 'PROFIT_LOSS',
        financial_year: finYear,
        from_date: fromDate,
        to_date: toDate,
        header_title_en: 'PROFIT AND LOSS ACCOUNT',
        header_title_mr: 'नफा आणि तोटा खाते',
        header_period_text: periodDateText,
        data_json: JSON.stringify({
          expenses,
          incomes,
          subtotalExpCurr: fmtNum(currExpenses),
          subtotalIncCurr: fmtNum(currIncomes),
          netProfitPrev: prevIsProfit ? fmtNum(prevBalance) : '',
          netLossPrev: !prevIsProfit ? fmtNum(prevBalance) : '',
          netProfitCurr: currIsProfit ? fmtNum(currBalance) : '',
          netLossCurr: !currIsProfit ? fmtNum(currBalance) : '',
          totalPrev: fmtNum(calculatedTotalPrev),
          totalCurr: fmtNum(calculatedTotalCurr),
        }),
        created_by: user?.full_name || 'Accountant',
      });
      setSelectedReportId(String(saved.id));
      setSaveStatus('Saved!');
      loadSavedReportsList();
      setTimeout(() => setSaveStatus(''), 3000);
    } catch {
      setSaveStatus('Save Failed');
      setTimeout(() => setSaveStatus(''), 3000);
    }
  };

  const handleLoadReport = (reportIdStr: string) => {
    setSelectedReportId(reportIdStr);
    if (!reportIdStr) return;
    const report = savedReports.find(r => r.id === parseInt(reportIdStr, 10));
    if (report) {
      try {
        const parsed = JSON.parse(report.data_json);
        if (parsed.expenses) setExpenses(parsed.expenses);
        if (parsed.incomes) setIncomes(parsed.incomes);
        if (parsed.subtotalExpCurr) setSubtotalExpCurr(parsed.subtotalExpCurr);
        if (parsed.subtotalIncCurr) setSubtotalIncCurr(parsed.subtotalIncCurr);
        if (parsed.netProfitPrev) setNetProfitPrev(parsed.netProfitPrev);
        if (parsed.netLossCurr) setNetLossCurr(parsed.netLossCurr);
        if (parsed.totalPrev) setTotalPrev(parsed.totalPrev);
        if (parsed.totalCurr) setTotalCurr(parsed.totalCurr);
        setFromDate(report.from_date);
        setToDate(report.to_date);
        if (report.header_period_text) setPeriodDateText(report.header_period_text);
        if (report.financial_year) setFinYear(report.financial_year);
      } catch {
        alert('Could not parse report data.');
      }
    }
  };

  const [expenses, setExpenses] = useState<PLItem[]>(buildDefaultExpenses);
  const [incomes, setIncomes] = useState<PLItem[]>(buildDefaultIncomes);

  // Subtotal & Net Profit / Loss override states (with exact screenshot defaults)
  const [subtotalExpCurr, setSubtotalExpCurr] = useState('26,10,357.70');
  const [subtotalIncCurr, setSubtotalIncCurr] = useState('25,66,240.76');
  const [netProfitPrev, setNetProfitPrev] = useState('76,458.34');
  const [netLossCurr, setNetLossCurr] = useState('44,116.94');
  const [totalPrev, setTotalPrev] = useState('24,67,803.58');
  const [totalCurr, setTotalCurr] = useState('26,10,357.70');

  const updateExpenseCell = useCallback((id: string, field: 'prevAmount' | 'particulars' | 'currAmount', val: string) => {
    setExpenses(prev => prev.map(item => item.id === id ? { ...item, [field]: val } : item));
  }, []);

  const updateIncomeCell = useCallback((id: string, field: 'prevAmount' | 'particulars' | 'currAmount', val: string) => {
    setIncomes(prev => prev.map(item => item.id === id ? { ...item, [field]: val } : item));
  }, []);

  const handleReset = useCallback(() => {
    if (!window.confirm(lang === 'mr'
      ? 'सर्व मूल्ये डिफॉल्टवर परत आणायचे आहेत का?'
      : 'Reset all values to screenshot defaults?')) return;
    setExpenses(buildDefaultExpenses());
    setIncomes(buildDefaultIncomes());
    setSubtotalExpCurr('26,10,357.70');
    setSubtotalIncCurr('25,66,240.76');
    setNetProfitPrev('76,458.34');
    setNetLossCurr('44,116.94');
    setTotalPrev('24,67,803.58');
    setTotalCurr('26,10,357.70');
  }, [lang]);

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  const formatPeriodEn = () => {
    const opts: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'long', year: 'numeric' };
    const f = new Intl.DateTimeFormat('en-IN', opts);
    return `FROM ${f.format(new Date(fromDate)).toUpperCase()} TO ${f.format(new Date(toDate)).toUpperCase()}`;
  };

  const formatPeriodMr = () => {
    const opts: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'long', year: 'numeric' };
    const f = new Intl.DateTimeFormat('mr-IN', opts);
    return `${f.format(new Date(fromDate))} ते ${f.format(new Date(toDate))}`;
  };

  const prevExpenses = expenses.reduce((sum, item) => sum + parseNum(item.prevAmount), 0);
  const currExpenses = expenses.reduce((sum, item) => sum + parseNum(item.currAmount), 0);
  const prevIncomes = incomes.reduce((sum, item) => sum + parseNum(item.prevAmount), 0);
  const currIncomes = incomes.reduce((sum, item) => sum + parseNum(item.currAmount), 0);
  const prevIsProfit = prevIncomes >= prevExpenses;
  const currIsProfit = currIncomes >= currExpenses;
  const prevBalance = Math.abs(prevIncomes - prevExpenses);
  const currBalance = Math.abs(currIncomes - currExpenses);
  const calculatedTotalPrev = Math.max(prevExpenses, prevIncomes);
  const calculatedTotalCurr = Math.max(currExpenses, currIncomes);

  // Determine row count to match table sides evenly
  const maxRows = Math.max(expenses.length, incomes.length);

  const inputStyle: React.CSSProperties = {
    width: '100%',
    border: '1px solid transparent',
    background: 'transparent',
    fontFamily: 'inherit',
    fontSize: 12,
    padding: '2px 4px',
    boxSizing: 'border-box',
  };

  return (
    <>
      <style>{`
        @media print {
          .pl-no-print { display: none !important; }
          .pl-print-area { padding: 0 !important; max-width: 100% !important; margin: 0 !important; }
          body { background: white !important; }
          .main-content, .app-layout { background: white !important; }
          .pl-table-wrapper { box-shadow: none !important; border-radius: 0 !important; border: 1px solid #333 !important; }
          .pl-input { border: none !important; background: transparent !important; padding: 0 2px !important; font-size: 8pt !important; }
          .pl-table th, .pl-table td { padding: 2px 3px !important; font-size: 8pt !important; border: 1px solid #333 !important; }
          @page { margin: 6mm; size: A4 landscape; }
        }
        .pl-input { transition: background 0.15s; cursor: text; }
          .pl-input:hover { background: rgba(99,102,241,0.08) !important; }
          .pl-input:focus { outline: 2px solid #6366f1; border-radius: 3px; background: rgba(238,242,255,0.9) !important; }
          .pl-period-input { border: 1px solid transparent; border-bottom: 1px dashed transparent; }
          .pl-period-input:hover { border-bottom-color: #dc2626; background: #fff7f7 !important; }
          .pl-period-input:focus { outline: none; border-bottom-color: #dc2626; background: #fff7f7 !important; }
          .pl-data-row:hover td { background: rgba(99,102,241,0.03) !important; }
        .pl-data-row:nth-child(even) td { background: rgba(248,250,252,0.6) !important; }
      `}</style>

      {/* Screen header */}
      <div className="pl-no-print">
        <Header
          title={lang === 'mr' ? 'नफा आणि तोटा खाते (Profit & Loss A/c)' : 'Profit & Loss Account'}
          user={user}
          onLogout={onLogout}
          onToggleMobileMenu={onToggleMobileMenu}
        />
      </div>

      <div style={{
        padding: '20px 16px',
        paddingTop: 'calc(var(--header-h) + 32px)',
        maxWidth: 1280,
        margin: '0 auto',
        fontFamily: "'Inter', 'Segoe UI', sans-serif",
      }} className="audit-report-page pl-print-area">

        {/* Controls Bar */}
        <div className="pl-no-print" style={{
          display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 18,
          background: 'linear-gradient(135deg, rgba(239,68,68,0.08), rgba(99,102,241,0.06))',
          border: '1px solid rgba(239,68,68,0.2)', borderRadius: 12, padding: '12px 16px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, flexWrap: 'wrap' }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: '#334155' }}>
              {lang === 'mr' ? 'दिनांक पासून:' : 'From:'}
            </label>
            <input type="date" value={fromDate} onChange={e => {
              setFromDate(e.target.value);
              if (e.target.value && toDate) setFinYear(getFinancialYear(e.target.value, toDate));
              if (e.target.value && toDate) {
                const f = new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
                setPeriodDateText(`FROM ${f.format(new Date(`${e.target.value}T00:00:00`)).toUpperCase()} TO ${f.format(new Date(`${toDate}T00:00:00`)).toUpperCase()}`);
              }
            }} style={{
              border: '1.5px solid #fca5a5', borderRadius: 7, padding: '5px 10px',
              fontSize: 13, fontWeight: 500, color: '#1e293b', background: 'white',
            }} />
            <label style={{ fontSize: 13, fontWeight: 600, color: '#334155' }}>
              {lang === 'mr' ? 'पर्यंत:' : 'To:'}
            </label>
            <input type="date" value={toDate} onChange={e => {
              setToDate(e.target.value);
              if (fromDate && e.target.value) setFinYear(getFinancialYear(fromDate, e.target.value));
              if (fromDate && e.target.value) {
                const f = new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
                setPeriodDateText(`FROM ${f.format(new Date(`${fromDate}T00:00:00`)).toUpperCase()} TO ${f.format(new Date(`${e.target.value}T00:00:00`)).toUpperCase()}`);
              }
            }} style={{
              border: '1.5px solid #fca5a5', borderRadius: 7, padding: '5px 10px',
              fontSize: 13, fontWeight: 500, color: '#1e293b', background: 'white',
            }} />
            <label style={{ fontSize: 13, fontWeight: 600, color: '#334155' }}>
              {lang === 'mr' ? 'आर्थिक वर्ष:' : 'Financial Year:'}
            </label>
            <input value={finYear} onChange={e => setFinYear(e.target.value)} placeholder="2025-26" style={{
              width: 92, border: '1.5px solid #fca5a5', borderRadius: 7, padding: '5px 8px',
              fontSize: 13, fontWeight: 700, color: '#1e293b', background: 'white',
            }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 6 }}>
                <FolderOpen size={15} style={{ color: '#dc2626' }} />
                <select
                  value={selectedReportId}
                  onChange={e => handleLoadReport(e.target.value)}
                  disabled={savedReports.length === 0}
                  style={{
                    border: '1.5px solid #fca5a5', borderRadius: 7, padding: '5px 8px',
                    fontSize: 12.5, fontWeight: 600, color: '#1e293b', background: 'white',
                  }}
                >
                  <option value="">{savedReports.length === 0
                    ? (lang === 'mr' ? 'सेव्ह केलेले अहवाल नाहीत' : 'No saved reports')
                    : (lang === 'mr' ? '-- मागील अहवाल निवडा --' : '-- Select Previous Year --')}</option>
                  {savedReports.map(report => (
                    <option key={report.id} value={report.id}>
                      {report.financial_year} ({report.from_date} ~ {report.to_date})
                    </option>
                  ))}
                </select>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <button onClick={handleSaveReport} style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px',
              borderRadius: 8, border: 'none', background: 'linear-gradient(135deg, #10b981, #059669)',
              color: 'white', fontWeight: 700, fontSize: 13, cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(16,185,129,0.3)',
            }}>
              <Save size={14} />
              {saveStatus || (lang === 'mr' ? 'सेव्ह करा' : 'Save Report')}
            </button>
            <button onClick={() => setLang(lang === 'mr' ? 'en' : 'mr')} style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px',
              borderRadius: 8, border: '1.5px solid #ef4444', background: 'white',
              color: '#dc2626', fontWeight: 600, fontSize: 13, cursor: 'pointer',
            }}>
              <Globe size={14} />
              {lang === 'mr' ? 'English' : 'मराठी'}
            </button>
            <button onClick={handleReset} style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px',
              borderRadius: 8, border: '1.5px solid #e2e8f0', background: 'white',
              color: '#64748b', fontWeight: 600, fontSize: 13, cursor: 'pointer',
            }}>
              <RefreshCw size={14} />
              {lang === 'mr' ? 'रीसेट' : 'Reset'}
            </button>
            <button onClick={handlePrint} style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px',
              borderRadius: 8, border: 'none',
              background: 'linear-gradient(135deg, #ef4444, #dc2626)',
              color: 'white', fontWeight: 700, fontSize: 13, cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(239,68,68,0.3)',
            }}>
              <Printer size={14} />
              {lang === 'mr' ? 'प्रिंट' : 'Print'}
            </button>
          </div>
        </div>

        {/* Form Title Banner */}
        <div style={{
          textAlign: 'center', marginBottom: 14,
          borderBottom: '2px solid #0f172a', paddingBottom: 10,
        }}>
          <div style={{
            fontFamily: "'Times New Roman', serif",
            fontSize: 18, fontWeight: 900, color: '#0f172a',
            textTransform: 'uppercase', letterSpacing: '0.04em', lineHeight: 1.3,
          }}>
            {lang === 'mr'
              ? 'बेळगाव बागायतदार सहकारी खरेदी-विक्री संस्था, बेळगाव'
              : 'THE BELAGAVI GARDENER CO-OP SOCIETY NI, BELAGAVI'}
          </div>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            gap: 24, maxWidth: 900, margin: '6px auto 0', padding: '0 18px',
            fontSize: 13, fontWeight: 800, color: '#991b1b',
            letterSpacing: '0.08em', textTransform: 'uppercase', flexWrap: 'wrap',
          }}>
            <span style={{ whiteSpace: 'nowrap' }}>
              {lang === 'mr' ? 'नफा आणि तोटा खाते (PROFIT AND LOSS ACCOUNT)' : 'PROFIT AND LOSS ACCOUNT'}
            </span>
            <input
              type="text"
              className="pl-period-input"
              value={periodDateText}
              onChange={e => setPeriodDateText(e.target.value)}
              style={{
                width: 390, maxWidth: '100%', padding: '2px 4px',
                background: 'transparent', color: '#991b1b',
                fontFamily: 'inherit', fontSize: 12, fontWeight: 800,
                letterSpacing: '0.06em', textAlign: 'center', textTransform: 'uppercase',
              }}
              aria-label="Profit and Loss Account period heading"
              title={lang === 'mr' ? 'तारीख मथळा संपादित करण्यासाठी येथे क्लिक करा' : 'Click to edit the period heading'}
            />
          </div>
        </div>

        {/* Profit and Loss Table */}
        <div className="pl-table-wrapper" style={{
          background: 'white', borderRadius: 10, overflow: 'hidden',
          boxShadow: '0 4px 20px rgba(0,0,0,0.08)', border: '1.5px solid #0f172a',
        }}>
          <table className="pl-table" style={{
            width: '100%', borderCollapse: 'collapse',
            fontSize: 12, fontFamily: "'Inter', 'Segoe UI', sans-serif",
            tableLayout: 'fixed',
          }}>
            <colgroup>
              <col style={{ width: '12%' }} />
              <col style={{ width: '26%' }} />
              <col style={{ width: '12%' }} />
              <col style={{ width: '12%' }} />
              <col style={{ width: '26%' }} />
              <col style={{ width: '12%' }} />
            </colgroup>
            <thead>
              <tr style={{ background: '#0f172a', color: 'white' }}>
                <th style={{ padding: '8px 6px', textAlign: 'right', fontWeight: 700, fontSize: 11, borderRight: '1px solid rgba(255,255,255,0.15)' }}>
                  {getPreviousFinancialYear(finYear)}
                </th>
                <th style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 700, fontSize: 11, textTransform: 'uppercase', borderRight: '1px solid rgba(255,255,255,0.15)' }}>
                  {lang === 'mr' ? 'खर्च (EXPENSES)' : 'EXPENSES'}
                </th>
                <th style={{ padding: '8px 6px', textAlign: 'right', fontWeight: 700, fontSize: 11, borderRight: '2px solid #ef4444' }}>
                  {finYear}
                </th>
                <th style={{ padding: '8px 6px', textAlign: 'right', fontWeight: 700, fontSize: 11, borderRight: '1px solid rgba(255,255,255,0.15)' }}>
                  {getPreviousFinancialYear(finYear)}
                </th>
                <th style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 700, fontSize: 11, textTransform: 'uppercase', borderRight: '1px solid rgba(255,255,255,0.15)' }}>
                  {lang === 'mr' ? 'उत्पन्न (INCOMES)' : 'INCOMES'}
                </th>
                <th style={{ padding: '8px 6px', textAlign: 'right', fontWeight: 700, fontSize: 11 }}>
                  {finYear}
                </th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: maxRows }).map((_, idx) => {
                const exp = expenses[idx];
                const inc = incomes[idx];

                return (
                  <tr key={idx} className="pl-data-row" style={{ borderBottom: '1px solid #f1f5f9' }}>
                    {/* EXPENSES SIDE */}
                    <td style={{ padding: '2px 4px', borderRight: '1px solid #e2e8f0' }}>
                      {exp && (
                        <input
                          className="pl-input"
                          value={exp.prevAmount}
                          onChange={e => updateExpenseCell(exp.id, 'prevAmount', e.target.value)}
                          style={{ ...inputStyle, textAlign: 'right', color: '#64748b' }}
                        />
                      )}
                    </td>
                    <td style={{ padding: '2px 6px', borderRight: '1px solid #e2e8f0' }}>
                      {exp && (
                        <input
                          className="pl-input"
                          value={lang === 'mr' ? exp.particulars_mr : exp.particulars}
                          onChange={e => updateExpenseCell(exp.id, 'particulars', e.target.value)}
                          style={{ ...inputStyle, textAlign: 'left', color: '#1e293b', fontWeight: 500 }}
                        />
                      )}
                    </td>
                    <td style={{ padding: '2px 4px', borderRight: '2px solid #0f172a' }}>
                      {exp && (
                        <input
                          className="pl-input"
                          value={exp.currAmount}
                          onChange={e => updateExpenseCell(exp.id, 'currAmount', e.target.value)}
                          style={{ ...inputStyle, textAlign: 'right', color: '#dc2626', fontWeight: 600 }}
                        />
                      )}
                    </td>

                    {/* INCOMES SIDE */}
                    <td style={{ padding: '2px 4px', borderRight: '1px solid #e2e8f0' }}>
                      {inc && (
                        <input
                          className="pl-input"
                          value={inc.prevAmount}
                          onChange={e => updateIncomeCell(inc.id, 'prevAmount', e.target.value)}
                          style={{ ...inputStyle, textAlign: 'right', color: '#64748b' }}
                        />
                      )}
                    </td>
                    <td style={{ padding: '2px 6px', borderRight: '1px solid #e2e8f0' }}>
                      {inc && (
                        <input
                          className="pl-input"
                          value={lang === 'mr' ? inc.particulars_mr : inc.particulars}
                          onChange={e => updateIncomeCell(inc.id, 'particulars', e.target.value)}
                          style={{ ...inputStyle, textAlign: 'left', color: '#1e293b', fontWeight: 500 }}
                        />
                      )}
                    </td>
                    <td style={{ padding: '2px 4px' }}>
                      {inc && (
                        <input
                          className="pl-input"
                          value={inc.currAmount}
                          onChange={e => updateIncomeCell(inc.id, 'currAmount', e.target.value)}
                          style={{ ...inputStyle, textAlign: 'right', color: '#047857', fontWeight: 600 }}
                        />
                      )}
                    </td>
                  </tr>
                );
              })}

              {/* Subtotal Row */}
              <tr style={{ borderTop: '2px solid #0f172a', background: '#f8fafc', fontWeight: 700 }}>
                <td style={{ padding: '4px', borderRight: '1px solid #cbd5e1' }}></td>
                <td style={{ padding: '4px 8px', borderRight: '1px solid #cbd5e1', fontSize: 12, color: '#475569' }}>
                  {lang === 'mr' ? 'एकूण खर्च (Subtotal Expenses)' : 'Subtotal Expenses'}
                </td>
                <td style={{ padding: '4px', borderRight: '2px solid #0f172a', textAlign: 'right' }}>
                  <input
                    className="pl-input"
                    value={fmtNum(currExpenses)}
                    readOnly
                    style={{ ...inputStyle, textAlign: 'right', color: '#dc2626', fontWeight: 700 }}
                  />
                </td>

                <td style={{ padding: '4px', borderRight: '1px solid #cbd5e1' }}></td>
                <td style={{ padding: '4px 8px', borderRight: '1px solid #cbd5e1', fontSize: 12, color: '#475569' }}>
                  {lang === 'mr' ? 'एकूण उत्पन्न (Subtotal Incomes)' : 'Subtotal Incomes'}
                </td>
                <td style={{ padding: '4px', textAlign: 'right' }}>
                  <input
                    className="pl-input"
                    value={fmtNum(currIncomes)}
                    readOnly
                    style={{ ...inputStyle, textAlign: 'right', color: '#047857', fontWeight: 700 }}
                  />
                </td>
              </tr>

              {/* Net Profit / Net Loss Balancing Row */}
              <tr style={{ background: 'rgba(254, 242, 242, 0.6)', borderBottom: '2px solid #0f172a' }}>
                {/* Exp side Net Profit 2024-25 */}
                <td style={{ padding: '4px', borderRight: '1px solid #cbd5e1', textAlign: 'right' }}>
                  <input
                    className="pl-input"
                    value={prevIsProfit ? fmtNum(prevBalance) : ''}
                    readOnly
                    style={{ ...inputStyle, textAlign: 'right', color: '#047857', fontWeight: 800 }}
                  />
                </td>
                <td style={{ padding: '4px 8px', borderRight: '1px solid #cbd5e1', fontWeight: 800, color: '#047857', fontSize: 12.5 }}>
                  {(prevIsProfit || currIsProfit) ? (lang === 'mr' ? 'निव्वळ नफा (NET PROFIT)' : 'NET PROFIT') : ''}
                </td>
                <td style={{ padding: '4px', borderRight: '2px solid #0f172a' }}>
                  <input className="pl-input" value={currIsProfit ? fmtNum(currBalance) : ''} readOnly style={{ ...inputStyle, textAlign: 'right', color: '#047857', fontWeight: 800 }} />
                </td>

                {/* Income side Net Loss 2025-26 */}
                <td style={{ padding: '4px', borderRight: '1px solid #cbd5e1' }}>
                  <input className="pl-input" value={!prevIsProfit ? fmtNum(prevBalance) : ''} readOnly style={{ ...inputStyle, textAlign: 'right', color: '#dc2626', fontWeight: 800 }} />
                </td>
                <td style={{ padding: '4px 8px', borderRight: '1px solid #cbd5e1', fontWeight: 800, color: '#dc2626', fontSize: 12.5 }}>
                  {(!prevIsProfit || !currIsProfit) ? (lang === 'mr' ? 'निव्वळ तोटा (NET LOSS)' : 'NET LOSS') : ''}
                </td>
                <td style={{ padding: '4px', textAlign: 'right' }}>
                  <input
                    className="pl-input"
                    value={!currIsProfit ? fmtNum(currBalance) : ''}
                    readOnly
                    style={{ ...inputStyle, textAlign: 'right', color: '#dc2626', fontWeight: 800, fontSize: 12.5 }}
                  />
                </td>
              </tr>

              {/* Grand TOTAL Row */}
              <tr style={{
                background: '#0f172a', color: 'white', fontWeight: 800,
                borderTop: '3px double #ef4444', fontSize: 13,
              }}>
                <td style={{ padding: '8px 6px', textAlign: 'right', borderRight: '1px solid rgba(255,255,255,0.15)' }}>
                  <input
                    className="pl-input"
                    value={fmtNum(calculatedTotalPrev)}
                    readOnly
                    style={{ ...inputStyle, textAlign: 'right', color: 'white', fontWeight: 800 }}
                  />
                </td>
                <td style={{ padding: '8px 10px', textAlign: 'left', letterSpacing: '0.06em', borderRight: '1px solid rgba(255,255,255,0.15)' }}>
                  {lang === 'mr' ? 'एकूण (TOTAL)' : 'TOTAL'}
                </td>
                <td style={{ padding: '8px 6px', textAlign: 'right', borderRight: '2px solid #ef4444' }}>
                  <input
                    className="pl-input"
                    value={fmtNum(calculatedTotalCurr)}
                    readOnly
                    style={{ ...inputStyle, textAlign: 'right', color: '#fca5a5', fontWeight: 800 }}
                  />
                </td>

                <td style={{ padding: '8px 6px', textAlign: 'right', borderRight: '1px solid rgba(255,255,255,0.15)' }}>
                  <input
                    className="pl-input"
                    value={fmtNum(calculatedTotalPrev)}
                    readOnly
                    style={{ ...inputStyle, textAlign: 'right', color: 'white', fontWeight: 800 }}
                  />
                </td>
                <td style={{ padding: '8px 10px', textAlign: 'left', letterSpacing: '0.06em', borderRight: '1px solid rgba(255,255,255,0.15)' }}>
                  {lang === 'mr' ? 'एकूण (TOTAL)' : 'TOTAL'}
                </td>
                <td style={{ padding: '8px 6px', textAlign: 'right' }}>
                  <input
                    className="pl-input"
                    value={fmtNum(calculatedTotalCurr)}
                    readOnly
                    style={{ ...inputStyle, textAlign: 'right', color: '#fca5a5', fontWeight: 800 }}
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Footer Note */}
        <div className="pl-no-print" style={{ marginTop: 14, fontSize: 11.5, color: '#64748b', textAlign: 'center' }}>
          {lang === 'mr'
            ? '* सर्व रक्कम रुपयांमध्ये. सर्व मूल्ये थेट संपादनयोग्य आहेत आणि कागदपत्र नोंदणीनुसार संतुलित होतात.'
            : '* All amounts in ₹. Interactive inputs matching exact paper statement records, fully editable and printable.'}
        </div>
      </div>
    </>
  );
};

export default ProfitLossAccount;
