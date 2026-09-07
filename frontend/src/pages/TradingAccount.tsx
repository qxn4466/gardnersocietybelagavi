import React, { useState, useCallback, useEffect } from 'react';
import { Printer, RefreshCw, Globe, Save, FolderOpen } from 'lucide-react';
import Header from '../components/Header';
import { useTranslation } from '../hooks/useTranslation';
import type { User } from '../types';
import { saveAuditReport, listAuditReports, SavedAuditReport } from '../api/client';
import { getFinancialYear, getPreviousFinancialYear } from '../utils/auditReports';

// ─── Types ───────────────────────────────────────────────────────────────────
export interface TradingItem {
  id: string;
  prevAmount: string; // 2024-25
  particulars: string;
  particulars_mr: string;
  currAmount: string; // 2025-26
  isSectionHeader?: boolean;
}

export interface TradingRowPair {
  id: string;
  expense: TradingItem;
  income: TradingItem;
}

interface TradingAccountProps {
  user?: User | null;
  onLogout?: () => void;
  onToggleMobileMenu?: () => void;
}

// ─── Helper: parse & format numbers ───────────────────────────────────────
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
const buildDefaultRows = (): TradingRowPair[] => [
  // Row 1: Section Headers
  {
    id: 'row_1',
    expense: { id: 'exp_head_opening', prevAmount: '', particulars: 'To Opening Stock', particulars_mr: 'प्रारंभिक साठा (Opening Stock)', currAmount: '', isSectionHeader: true },
    income: { id: 'inc_head_sales', prevAmount: '', particulars: 'By Sales', particulars_mr: 'विक्री (By Sales)', currAmount: '', isSectionHeader: true },
  },
  // Row 2
  {
    id: 'row_2',
    expense: { id: 'exp_op_seeds', prevAmount: '15,632.57', particulars: 'Seeds', particulars_mr: 'बियाणे (Seeds)', currAmount: '22,115.79' },
    income: { id: 'inc_sale_seeds', prevAmount: '2,00,709.00', particulars: 'Seeds', particulars_mr: 'बियाणे (Seeds)', currAmount: '1,24,507.00' },
  },
  // Row 3
  {
    id: 'row_3',
    expense: { id: 'exp_op_pest', prevAmount: '1,18,977.11', particulars: 'Pesticides', particulars_mr: 'कीटकनाशके (Pesticides)', currAmount: '81,881.10' },
    income: { id: 'inc_sale_pest', prevAmount: '3,99,866.00', particulars: 'Pesticides', particulars_mr: 'कीटकनाशके (Pesticides)', currAmount: '3,53,608.20' },
  },
  // Row 4
  {
    id: 'row_4',
    expense: { id: 'exp_op_pump', prevAmount: '2,100.00', particulars: 'Spray Pump', particulars_mr: 'स्प्रे पंप (Spray Pump)', currAmount: '' },
    income: { id: 'inc_pest_disc', prevAmount: '1,084.35', particulars: 'Pesticide Discount', particulars_mr: 'कीटकनाशके सवलत (Pesticide Discount)', currAmount: '2,622.25' },
  },
  // Row 5
  {
    id: 'row_5',
    expense: { id: 'exp_head_purchases', prevAmount: '', particulars: 'To Purchases', particulars_mr: 'खरेदी (To Purchases)', currAmount: '', isSectionHeader: true },
    income: { id: 'inc_damage', prevAmount: '', particulars: 'Damage Leakage Expiry Material', particulars_mr: 'नुकसान मुदतबाह्य गळती (Damage/Expiry)', currAmount: '12,537.00' },
  },
  // Row 6
  {
    id: 'row_6',
    expense: { id: 'exp_pur_seeds', prevAmount: '1,97,690.00', particulars: 'Seeds', particulars_mr: 'बियाणे (Seeds)', currAmount: '1,19,880.00' },
    income: { id: 'inc_seed_disc', prevAmount: '300.00', particulars: 'Seeds Discount', particulars_mr: 'बियाणे सवलत (Seeds Discount)', currAmount: '' },
  },
  // Row 7
  {
    id: 'row_7',
    expense: { id: 'exp_pur_pest', prevAmount: '3,33,028.28', particulars: 'Pesticides', particulars_mr: 'कीटकनाशके (Pesticides)', currAmount: '3,18,282.23' },
    income: { id: 'inc_sale_pump', prevAmount: '3,839.30', particulars: 'Spray Pump', particulars_mr: 'स्प्रे पंप (Spray Pump)', currAmount: '' },
  },
  // Row 8
  {
    id: 'row_8',
    expense: { id: 'exp_pur_rent_hamali', prevAmount: '4,365.00', particulars: 'Seeds, Pesticides, Morat Rent Hamali', particulars_mr: 'बियाणे, कीटकनाशके, मोटार भाडे, हमाली', currAmount: '3,850.00' },
    income: { id: 'inc_head_closing', prevAmount: '', particulars: 'By Closing Stock', particulars_mr: 'अंतिम साठा (By Closing Stock)', currAmount: '', isSectionHeader: true },
  },
  // Row 9
  {
    id: 'row_9',
    expense: { id: 'exp_pur_bags', prevAmount: '6,260.00', particulars: 'Seed Section Plastic Bags', particulars_mr: 'बियाणे विभाग प्लास्टिक पिशव्या', currAmount: '2,190.00' },
    income: { id: 'inc_cl_seeds', prevAmount: '22,115.79', particulars: 'Seeds', particulars_mr: 'बियाणे (Seeds)', currAmount: '19,631.22' },
  },
  // Row 10
  {
    id: 'row_10',
    expense: { id: 'exp_pur_spray_pump', prevAmount: '1,920.00', particulars: 'Spray pump', particulars_mr: 'स्प्रे पंप (Spray Pump)', currAmount: '' },
    income: { id: 'inc_cl_pest', prevAmount: '81,881.10', particulars: 'Pesticides', particulars_mr: 'कीटकनाशके (Pesticides)', currAmount: '56,096.41' },
  },
];

const TradingAccount: React.FC<TradingAccountProps> = ({ user, onLogout, onToggleMobileMenu }) => {
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
      const list = await listAuditReports('TRADING');
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
        report_type: 'TRADING',
        financial_year: finYear,
        from_date: fromDate,
        to_date: toDate,
        header_title_en: 'TRADING ACCOUNT',
        header_title_mr: 'व्यापार खाते',
        header_period_text: periodDateText,
        data_json: JSON.stringify({
          rows,
          profitPrev: fmtNum(prevBalance),
          profitCurr: fmtNum(currBalance),
          prevResult: prevIsProfit ? 'PROFIT' : 'LOSS',
          currResult: currIsProfit ? 'PROFIT' : 'LOSS',
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
        if (parsed.rows) setRows(parsed.rows);
        if (parsed.profitPrev) setProfitPrev(parsed.profitPrev);
        if (parsed.profitCurr) setProfitCurr(parsed.profitCurr);
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

  const [rows, setRows] = useState<TradingRowPair[]>(buildDefaultRows);

  // Editable Profit values (override or auto-calc fallback)
  const [profitPrev, setProfitPrev] = useState('29,822.58');
  const [profitCurr, setProfitCurr] = useState('20,802.96');

  // Total override / defaults
  const [totalPrev, setTotalPrev] = useState('7,09,796');
  const [totalCurr, setTotalCurr] = useState('5,69,002.08');

  // Update cell values
  const updateExpenseCell = useCallback((rowId: string, field: 'prevAmount' | 'particulars' | 'currAmount', val: string) => {
    setRows(prev => prev.map(r => {
      if (r.id !== rowId) return r;
      return { ...r, expense: { ...r.expense, [field]: val } };
    }));
  }, []);

  const updateIncomeCell = useCallback((rowId: string, field: 'prevAmount' | 'particulars' | 'currAmount', val: string) => {
    setRows(prev => prev.map(r => {
      if (r.id !== rowId) return r;
      return { ...r, income: { ...r.income, [field]: val } };
    }));
  }, []);

  const handleReset = useCallback(() => {
    if (!window.confirm(lang === 'mr'
      ? 'सर्व मूल्ये डिफॉल्टवर परत आणायचे आहेत का?'
      : 'Reset all values to screenshot defaults?')) return;
    setRows(buildDefaultRows());
    setProfitPrev('29,822.58');
    setProfitCurr('20,802.96');
    setTotalPrev('7,09,796');
    setTotalCurr('5,69,002.08');
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

  // Recalculate totals dynamically for display
  const calcSumCurrIncomes = rows.reduce((acc, r) => acc + (r.income.isSectionHeader ? 0 : parseNum(r.income.currAmount)), 0);
  const calcSumCurrExpenses = rows.reduce((acc, r) => acc + (r.expense.isSectionHeader ? 0 : parseNum(r.expense.currAmount)), 0);
  const calcSumPrevIncomes = rows.reduce((acc, r) => acc + (r.income.isSectionHeader ? 0 : parseNum(r.income.prevAmount)), 0);
  const calcSumPrevExpenses = rows.reduce((acc, r) => acc + (r.expense.isSectionHeader ? 0 : parseNum(r.expense.prevAmount)), 0);
  const prevIsProfit = calcSumPrevIncomes >= calcSumPrevExpenses;
  const currIsProfit = calcSumCurrIncomes >= calcSumCurrExpenses;
  const prevBalance = Math.abs(calcSumPrevIncomes - calcSumPrevExpenses);
  const currBalance = Math.abs(calcSumCurrIncomes - calcSumCurrExpenses);
  const calculatedTotalPrev = Math.max(calcSumPrevIncomes, calcSumPrevExpenses);
  const calculatedTotalCurr = Math.max(calcSumCurrIncomes, calcSumCurrExpenses);

  const inputStyle: React.CSSProperties = {
    width: '100%',
    border: '1px solid transparent',
    background: 'transparent',
    fontFamily: 'inherit',
    fontSize: 12.5,
    padding: '3px 4px',
    boxSizing: 'border-box',
  };

  return (
    <>
      <style>{`
        @media print {
          .ta-no-print { display: none !important; }
          .ta-print-area { padding: 0 !important; max-width: 100% !important; margin: 0 !important; }
          body { background: white !important; }
          .main-content, .app-layout { background: white !important; }
          .ta-table-wrapper { box-shadow: none !important; border-radius: 0 !important; border: 1px solid #333 !important; }
          .ta-input { border: none !important; background: transparent !important; padding: 0 2px !important; font-size: 8.5pt !important; }
          .ta-table th, .ta-table td { padding: 3px 4px !important; font-size: 8.5pt !important; border: 1px solid #333 !important; }
          .ta-section-header td { font-size: 9pt !important; font-weight: 800 !important; background: #f8fafc !important; color: #000 !important; }
          @page { margin: 8mm; size: A4 landscape; }
        }
        .ta-input { transition: background 0.15s; cursor: text; }
        .ta-input:hover { background: rgba(99,102,241,0.08) !important; }
        .ta-input:focus { outline: 2px solid #6366f1; border-radius: 3px; background: rgba(238,242,255,0.9) !important; }
        .ta-data-row:hover td { background: rgba(99,102,241,0.03) !important; }
        .ta-data-row:nth-child(even) td { background: rgba(248,250,252,0.6) !important; }
      `}</style>

      {/* Screen header */}
      <div className="ta-no-print">
        <Header
          title={lang === 'mr' ? 'व्यापार खाते (Trading Account)' : 'Trading Account'}
          user={user}
          onLogout={onLogout}
          onToggleMobileMenu={onToggleMobileMenu}
        />
      </div>

      <div style={{
        padding: '20px 16px',
        paddingTop: 'calc(var(--header-h) + 32px)',
        maxWidth: 1200,
        margin: '0 auto',
        fontFamily: "'Inter', 'Segoe UI', sans-serif",
      }} className="audit-report-page ta-print-area">

        {/* Controls Bar */}
        <div className="ta-no-print" style={{
          display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 18,
          background: 'linear-gradient(135deg, rgba(16,185,129,0.08), rgba(99,102,241,0.06))',
          border: '1px solid rgba(16,185,129,0.2)', borderRadius: 12, padding: '12px 16px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, flexWrap: 'wrap' }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: '#334155' }}>
              {lang === 'mr' ? 'दिनांक पासून:' : 'From:'}
            </label>
            <input type="date" value={fromDate} onChange={e => {
              const val = e.target.value;
              setFromDate(val);
              if (val && toDate) setFinYear(getFinancialYear(val, toDate));
              if (val && toDate) {
                const f = new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
                setPeriodDateText(`FROM ${f.format(new Date(val)).toUpperCase()} TO ${f.format(new Date(toDate)).toUpperCase()}`);
              }
            }} style={{
              border: '1.5px solid #a7f3d0', borderRadius: 7, padding: '5px 10px',
              fontSize: 13, fontWeight: 500, color: '#1e293b', background: 'white',
            }} />
            <label style={{ fontSize: 13, fontWeight: 600, color: '#334155' }}>
              {lang === 'mr' ? 'पर्यंत:' : 'To:'}
            </label>
            <input type="date" value={toDate} onChange={e => {
              const val = e.target.value;
              setToDate(val);
              if (fromDate && val) setFinYear(getFinancialYear(fromDate, val));
              if (fromDate && val) {
                const f = new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
                setPeriodDateText(`FROM ${f.format(new Date(fromDate)).toUpperCase()} TO ${f.format(new Date(val)).toUpperCase()}`);
              }
            }} style={{
              border: '1.5px solid #a7f3d0', borderRadius: 7, padding: '5px 10px',
              fontSize: 13, fontWeight: 500, color: '#1e293b', background: 'white',
            }} />

            <label style={{ fontSize: 13, fontWeight: 600, color: '#334155' }}>
              {lang === 'mr' ? 'आर्थिक वर्ष:' : 'Financial Year:'}
            </label>
            <input value={finYear} onChange={e => setFinYear(e.target.value)} placeholder="2025-26" style={{
              width: 92, border: '1.5px solid #a7f3d0', borderRadius: 7, padding: '5px 8px',
              fontSize: 13, fontWeight: 700, color: '#1e293b', background: 'white',
            }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 6 }}>
                <FolderOpen size={15} style={{ color: '#10b981' }} />
                <select
                  value={selectedReportId}
                  onChange={e => handleLoadReport(e.target.value)}
                  disabled={savedReports.length === 0}
                  style={{
                    border: '1.5px solid #a7f3d0', borderRadius: 7, padding: '5px 8px',
                    fontSize: 12.5, fontWeight: 600, color: '#1e293b', background: 'white',
                  }}
                >
                  <option value="">{savedReports.length === 0
                    ? (lang === 'mr' ? 'सेव्ह केलेले अहवाल नाहीत' : 'No saved reports')
                    : (lang === 'mr' ? '-- मागील अहवाल निवडा --' : '-- Select Previous Year --')}</option>
                  {savedReports.map(r => (
                    <option key={r.id} value={r.id}>
                      {r.financial_year} ({r.from_date} ~ {r.to_date})
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
              borderRadius: 8, border: '1.5px solid #10b981', background: 'white',
              color: '#059669', fontWeight: 600, fontSize: 13, cursor: 'pointer',
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
              background: 'linear-gradient(135deg, #10b981, #059669)',
              color: 'white', fontWeight: 700, fontSize: 13, cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(16,185,129,0.3)',
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
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            fontSize: 14, fontWeight: 800, color: '#065f46',
            letterSpacing: '0.08em', textTransform: 'uppercase', marginTop: 5, flexWrap: 'wrap'
          }}>
            <span>{lang === 'mr' ? 'व्यापार खाते' : 'TRADING ACCOUNT'}</span>
            <input
              type="text"
              className="ta-input"
              value={periodDateText}
              onChange={e => setPeriodDateText(e.target.value)}
              style={{
                fontSize: 14,
                fontWeight: 800,
                color: '#065f46',
                borderBottom: '1.5px dashed #10b981',
                background: 'transparent',
                textAlign: 'center',
                width: '390px',
                fontFamily: 'inherit',
                letterSpacing: '0.05em',
                padding: '1px 4px',
              }}
              title={lang === 'mr' ? 'तारीख मथळा संपादित करण्यासाठी येथे क्लिक करा' : 'Click to edit date text'}
            />
          </div>
        </div>

        {/* Trading Account Table */}
        <div className="ta-table-wrapper" style={{
          background: 'white', borderRadius: 10, overflow: 'hidden',
          boxShadow: '0 4px 20px rgba(0,0,0,0.08)', border: '1.5px solid #0f172a',
        }}>
          <table className="ta-table" style={{
            width: '100%', borderCollapse: 'collapse',
            fontSize: 12.5, fontFamily: "'Inter', 'Segoe UI', sans-serif",
            tableLayout: 'fixed',
          }}>
            <colgroup>
              <col style={{ width: '13%' }} />
              <col style={{ width: '25%' }} />
              <col style={{ width: '12%' }} />
              <col style={{ width: '13%' }} />
              <col style={{ width: '25%' }} />
              <col style={{ width: '12%' }} />
            </colgroup>
            <thead>
              <tr style={{ background: '#0f172a', color: 'white' }}>
                <th style={{ padding: '8px 6px', textAlign: 'right', fontWeight: 700, fontSize: 11, letterSpacing: '0.05em', borderRight: '1px solid rgba(255,255,255,0.15)' }}>
                  {getPreviousFinancialYear(finYear)}
                </th>
                <th style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 700, fontSize: 11, letterSpacing: '0.05em', textTransform: 'uppercase', borderRight: '1px solid rgba(255,255,255,0.15)' }}>
                  {lang === 'mr' ? 'खर्च (EXPENSES)' : 'EXPENSES'}
                </th>
                <th style={{ padding: '8px 6px', textAlign: 'right', fontWeight: 700, fontSize: 11, letterSpacing: '0.05em', textTransform: 'uppercase', borderRight: '2px solid #38bdf8' }}>
                  {lang === 'mr' ? 'रक्कम (AMOUNT)' : 'AMOUNT'}
                </th>
                <th style={{ padding: '8px 6px', textAlign: 'right', fontWeight: 700, fontSize: 11, letterSpacing: '0.05em', borderRight: '1px solid rgba(255,255,255,0.15)' }}>
                  {getPreviousFinancialYear(finYear)}
                </th>
                <th style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 700, fontSize: 11, letterSpacing: '0.05em', textTransform: 'uppercase', borderRight: '1px solid rgba(255,255,255,0.15)' }}>
                  {lang === 'mr' ? 'उत्पन्न (INCOMES)' : 'INCOMES'}
                </th>
                <th style={{ padding: '8px 6px', textAlign: 'right', fontWeight: 700, fontSize: 11, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                  {lang === 'mr' ? 'रक्कम (AMOUNT)' : 'AMOUNT'}
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => {
                const isExpHeader = r.expense.isSectionHeader;
                const isIncHeader = r.income.isSectionHeader;

                return (
                  <tr key={r.id} className="ta-data-row" style={{ borderBottom: '1px solid #e2e8f0' }}>
                    {/* EXPENSES SIDE */}
                    {/* 2024-25 */}
                    <td style={{ padding: '2px 4px', borderRight: '1px solid #e2e8f0', background: isExpHeader ? '#f8fafc' : 'transparent' }}>
                      {!isExpHeader && (
                        <input
                          className="ta-input"
                          value={r.expense.prevAmount}
                          onChange={e => updateExpenseCell(r.id, 'prevAmount', e.target.value)}
                          style={{ ...inputStyle, textAlign: 'right', color: '#475569' }}
                        />
                      )}
                    </td>
                    {/* EXPENSES Particulars */}
                    <td style={{ padding: '2px 6px', borderRight: '1px solid #e2e8f0', background: isExpHeader ? '#f8fafc' : 'transparent' }}>
                      <input
                        className="ta-input"
                        value={lang === 'mr' ? r.expense.particulars_mr : r.expense.particulars}
                        onChange={e => updateExpenseCell(r.id, 'particulars', e.target.value)}
                        style={{
                          ...inputStyle,
                          textAlign: 'left',
                          fontWeight: isExpHeader ? 800 : 500,
                          color: isExpHeader ? '#0f172a' : '#1e293b',
                          fontSize: isExpHeader ? 13 : 12,
                        }}
                      />
                    </td>
                    {/* EXPENSES Amount (Current Year) */}
                    <td style={{ padding: '2px 4px', borderRight: '2px solid #0f172a', background: isExpHeader ? '#f8fafc' : 'transparent' }}>
                      {!isExpHeader && (
                        <input
                          className="ta-input"
                          value={r.expense.currAmount}
                          onChange={e => updateExpenseCell(r.id, 'currAmount', e.target.value)}
                          style={{ ...inputStyle, textAlign: 'right', color: '#dc2626', fontWeight: 600 }}
                        />
                      )}
                    </td>

                    {/* INCOMES SIDE */}
                    {/* 2024-25 */}
                    <td style={{ padding: '2px 4px', borderRight: '1px solid #e2e8f0', background: isIncHeader ? '#f8fafc' : 'transparent' }}>
                      {!isIncHeader && (
                        <input
                          className="ta-input"
                          value={r.income.prevAmount}
                          onChange={e => updateIncomeCell(r.id, 'prevAmount', e.target.value)}
                          style={{ ...inputStyle, textAlign: 'right', color: '#475569' }}
                        />
                      )}
                    </td>
                    {/* INCOMES Particulars */}
                    <td style={{ padding: '2px 6px', borderRight: '1px solid #e2e8f0', background: isIncHeader ? '#f8fafc' : 'transparent' }}>
                      <input
                        className="ta-input"
                        value={lang === 'mr' ? r.income.particulars_mr : r.income.particulars}
                        onChange={e => updateIncomeCell(r.id, 'particulars', e.target.value)}
                        style={{
                          ...inputStyle,
                          textAlign: 'left',
                          fontWeight: isIncHeader ? 800 : 500,
                          color: isIncHeader ? '#0f172a' : '#1e293b',
                          fontSize: isIncHeader ? 13 : 12,
                        }}
                      />
                    </td>
                    {/* INCOMES Amount (Current Year) */}
                    <td style={{ padding: '2px 4px', background: isIncHeader ? '#f8fafc' : 'transparent' }}>
                      {!isIncHeader && (
                        <input
                          className="ta-input"
                          value={r.income.currAmount}
                          onChange={e => updateIncomeCell(r.id, 'currAmount', e.target.value)}
                          style={{ ...inputStyle, textAlign: 'right', color: '#047857', fontWeight: 600 }}
                        />
                      )}
                    </td>
                  </tr>
                );
              })}

              {/* Special Row: PROFIT */}
              <tr style={{ borderBottom: '2px solid #0f172a', background: 'rgba(236, 253, 245, 0.5)' }}>
                {/* Exp Prev Profit */}
                <td style={{ padding: '4px', borderRight: '1px solid #e2e8f0', textAlign: 'right' }}>
                  <input
                    className="ta-input"
                    value={prevIsProfit ? fmtNum(prevBalance) : ''}
                    readOnly
                    style={{ ...inputStyle, textAlign: 'right', color: '#047857', fontWeight: 700 }}
                  />
                </td>
                {/* Exp Profit Particulars */}
                <td style={{ padding: '4px 8px', borderRight: '1px solid #e2e8f0', fontWeight: 800, color: '#047857', fontSize: 13 }}>
                  {(prevIsProfit || currIsProfit) ? (lang === 'mr' ? 'नफा (PROFIT)' : 'PROFIT') : ''}
                </td>
                {/* Exp Curr Profit */}
                <td style={{ padding: '4px', borderRight: '2px solid #0f172a', textAlign: 'right' }}>
                  <input
                    className="ta-input"
                    value={currIsProfit ? fmtNum(currBalance) : ''}
                    readOnly
                    style={{ ...inputStyle, textAlign: 'right', color: '#047857', fontWeight: 800, fontSize: 13 }}
                  />
                </td>

                <td style={{ padding: '4px', borderRight: '1px solid #e2e8f0' }}>
                  <input className="ta-input" value={!prevIsProfit ? fmtNum(prevBalance) : ''} readOnly style={{ ...inputStyle, textAlign: 'right', color: '#dc2626', fontWeight: 700 }} />
                </td>
                <td style={{ padding: '4px 8px', borderRight: '1px solid #e2e8f0', fontWeight: 800, color: '#dc2626', fontSize: 13 }}>
                  {(!prevIsProfit || !currIsProfit) ? (lang === 'mr' ? 'तोटा (LOSS)' : 'LOSS') : ''}
                </td>
                <td style={{ padding: '4px' }}>
                  <input className="ta-input" value={!currIsProfit ? fmtNum(currBalance) : ''} readOnly style={{ ...inputStyle, textAlign: 'right', color: '#dc2626', fontWeight: 800 }} />
                </td>
              </tr>

              {/* TOTAL ROW */}
              <tr style={{
                background: '#0f172a', color: 'white', fontWeight: 800,
                borderTop: '3px double #10b981', fontSize: 13,
              }}>
                {/* Exp Prev Total */}
                <td style={{ padding: '8px 6px', textAlign: 'right', borderRight: '1px solid rgba(255,255,255,0.15)' }}>
                  <input
                    className="ta-input"
                    value={fmtNum(calculatedTotalPrev)}
                    readOnly
                    style={{ ...inputStyle, textAlign: 'right', color: 'white', fontWeight: 800 }}
                  />
                </td>
                {/* TOTAL label */}
                <td style={{ padding: '8px 10px', textAlign: 'left', letterSpacing: '0.06em', borderRight: '1px solid rgba(255,255,255,0.15)' }}>
                  {lang === 'mr' ? 'एकूण (TOTAL)' : 'TOTAL'}
                </td>
                {/* Exp Curr Total */}
                <td style={{ padding: '8px 6px', textAlign: 'right', borderRight: '2px solid #38bdf8' }}>
                  <input
                    className="ta-input"
                    value={fmtNum(calculatedTotalCurr)}
                    readOnly
                    style={{ ...inputStyle, textAlign: 'right', color: '#38bdf8', fontWeight: 800 }}
                  />
                </td>

                {/* Inc Prev Total */}
                <td style={{ padding: '8px 6px', textAlign: 'right', borderRight: '1px solid rgba(255,255,255,0.15)' }}>
                  <input
                    className="ta-input"
                    value={fmtNum(calculatedTotalPrev)}
                    readOnly
                    style={{ ...inputStyle, textAlign: 'right', color: 'white', fontWeight: 800 }}
                  />
                </td>
                {/* TOTAL label */}
                <td style={{ padding: '8px 10px', textAlign: 'left', letterSpacing: '0.06em', borderRight: '1px solid rgba(255,255,255,0.15)' }}>
                  {lang === 'mr' ? 'एकूण (TOTAL)' : 'TOTAL'}
                </td>
                {/* Inc Curr Total */}
                <td style={{ padding: '8px 6px', textAlign: 'right' }}>
                  <input
                    className="ta-input"
                    value={fmtNum(calculatedTotalCurr)}
                    readOnly
                    style={{ ...inputStyle, textAlign: 'right', color: '#38bdf8', fontWeight: 800 }}
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Footer Note */}
        <div className="ta-no-print" style={{ marginTop: 14, fontSize: 11.5, color: '#64748b', textAlign: 'center' }}>
          {lang === 'mr'
            ? '* सर्व रक्कम रुपयांमध्ये. सर्व मूल्ये थेट संपादनयोग्य आहेत आणि स्वयंचलितरित्या संतुलित होतात.'
            : '* All amounts in ₹. Interactive inputs matching exact paper statement records, fully editable and printable.'}
        </div>
      </div>
    </>
  );
};

export default TradingAccount;
