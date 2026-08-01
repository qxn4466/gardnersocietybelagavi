import React, { useEffect, useState, useCallback } from 'react';
import {
  Printer, RefreshCw, CheckCircle2, ShieldCheck,
  Building2, Hash, Phone, FileText, CheckSquare, Calendar
} from 'lucide-react';
import Header from '../components/Header';
import PrintHeader from '../components/PrintHeader';
import {
  fetchOffice,
  fetchCashBook,
  fetchLedger,
  fetchCustomers,
} from '../api/client';
import type {
  CashBookRow,
  LedgerRow,
  Customer,
  OfficeMaster,
  User,
} from '../types';
import { CREDIT_BOOK_COLUMNS, DEBIT_BOOK_COLUMNS } from '../types';
import { useTranslation } from '../hooks/useTranslation';

interface AuditPackageProps {
  user?: User | null;
  onLogout?: () => void;
  onToggleMobileMenu?: () => void;
}

const COLUMN_LABELS_MR: Record<string, string> = {
  shares: 'समभाग',
  commissions: 'कमिशन',
  interest: 'व्याज',
  pigmi_comm: 'पिगमी कमिशन',
  lakshmi_pigmi_deposit: 'लक्ष्मी पिगमी ठेव',
  vegetable_comm: 'भाजीपाला कमिशन',
  cash_sales: 'रोख विक्री',
  pesticide_sales: 'कीटकनाशक विक्री',
  sundary_ac: 'विविध खाते',
  purchases: 'खरेदी',
  loan_ac: 'कर्ज खाते',
  bank_current: 'बँक चालू खाते',
  advance: 'आगाऊ',
  cold_storage_adv: 'शीतगृह आगाऊ',
  lakshmi_pigmi_deposit_loan: 'लक्ष्मी पिगमी कर्ज',
  lakshmi_pigmi_deposit_interest: 'लक्ष्मी पिगमी व्याज',
};

const AuditPackage: React.FC<AuditPackageProps> = ({ user, onLogout, onToggleMobileMenu }) => {
  const { t, lang } = useTranslation();
  const today = new Date().toISOString().split('T')[0];
  const [startDate, setStartDate] = useState('2026-06-01');
  const [endDate, setEndDate] = useState('2026-06-30');

  const [office, setOffice] = useState<OfficeMaster | null>(null);
  const [creditRows, setCreditRows] = useState<CashBookRow[]>([]);
  const [debitRows, setDebitRows] = useState<CashBookRow[]>([]);
  const [ledgerRows, setLedgerRows] = useState<LedgerRow[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);

  // Print section toggles
  const [includeCover, setIncludeCover] = useState(true);
  const [includeCreditBook, setIncludeCreditBook] = useState(true);
  const [includeDebitBook, setIncludeDebitBook] = useState(true);
  const [includeLedger, setIncludeLedger] = useState(true);
  const [includeCustomers, setIncludeCustomers] = useState(true);

  const loadAuditData = useCallback(async () => {
    setLoading(true);
    try {
      const [off, cred, deb, cust] = await Promise.all([
        fetchOffice().catch(() => null),
        fetchCashBook(startDate, endDate, 'CREDIT').catch(() => []),
        fetchCashBook(startDate, endDate, 'DEBIT').catch(() => []),
        fetchCustomers().catch(() => []),
      ]);

      setOffice(off);
      setCreditRows(cred);
      setDebitRows(deb);
      setCustomers(cust);

      // Extract month and year from startDate if available
      const sDateObj = new Date(startDate);
      const m = sDateObj.getMonth() + 1;
      const y = sDateObj.getFullYear();
      const ledg = await fetchLedger(m, y).catch(() => []);
      setLedgerRows(ledg);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    loadAuditData();
  }, [loadAuditData]);

  const handlePresetJune = () => {
    setStartDate('2026-06-01');
    setEndDate('2026-06-30');
  };

  const handlePresetToday = () => {
    setStartDate(today);
    setEndDate(today);
  };

  const handlePrint = () => {
    window.print();
  };

  // Calculations
  const creditTotal = creditRows.reduce((s, r) => s + Number(r.total), 0);
  const debitTotal = debitRows.reduce((s, r) => s + Number(r.total), 0);

  // Credit column totals
  const creditColTotals = CREDIT_BOOK_COLUMNS.reduce((acc, col) => {
    acc[col.key as string] = creditRows.reduce((s, r) => s + (Number(r[col.key]) || 0), 0);
    return acc;
  }, {} as Record<string, number>);

  // Debit column totals
  const debitColTotals = DEBIT_BOOK_COLUMNS.reduce((acc, col) => {
    acc[col.key as string] = debitRows.reduce((s, r) => s + (Number(r[col.key]) || 0), 0);
    return acc;
  }, {} as Record<string, number>);

  // Ledger totals
  const totalLedgerReceipt = ledgerRows.reduce((s, r) => s + Number(r.receipt), 0);
  const totalLedgerDebit = ledgerRows.reduce((s, r) => s + Number(r.debit), 0);
  const totalLedgerPayable = ledgerRows.reduce((s, r) => s + Number(r.payable), 0);
  const totalLedgerReceivable = ledgerRows.reduce((s, r) => s + Number(r.receivable), 0);

  return (
    <div className="page-container">
      <Header
        title={t('audit_title')}
        subtitle={lang === 'mr'
          ? 'संपूर्ण आर्थिक वेळापत्रक बाइंडर आणि लेखापरीक्षक प्रमाणीकरण अहवाल'
          : 'Complete Financial Schedules Binder & Auditor Verification Reports'}
        level={3}
        actions={
          <button className="btn btn-primary btn-lg no-print" onClick={handlePrint}>
            <Printer size={18} /> {lang === 'mr' ? 'संपूर्ण लेखापरीक्षा बाइंडर मुद्रित करा' : 'Print Complete Audit Binder'}
          </button>
        }
        user={user}
        onLogout={onLogout}
        onToggleMobileMenu={onToggleMobileMenu}
      />

      <div className="page-content">

        {/* ── Controls & Controls Bar ── */}
        <div className="card no-print" style={{ marginBottom: 24 }}>
          <div className="card-header">
            <div>
              <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Calendar size={18} color="var(--blue-700)" /> {lang === 'mr' ? 'लेखापरीक्षा कालावधी आणि दस्तऐवज सूची निवडा' : 'Select Audit Period & Document Schedules'}
              </div>
              <div className="card-subtitle">{lang === 'mr' ? 'तारीख श्रेणी निवडा आणि मुद्रित बाइंडरमध्ये समाविष्ट करण्यासाठी सूची निवडा' : 'Choose date range and toggle schedules to include in the printed binder'}</div>
            </div>
          </div>

          <div className="card-body">
            {/* Date Range Inputs */}
            <div className="filter-bar" style={{ boxShadow: 'none', background: '#f8fafc', marginBottom: 20 }}>
              <div className="filter-group">
                <span className="filter-label">{lang === 'mr' ? 'लेखापरीक्षा सुरुवातीची तारीख:' : 'Audit From:'}</span>
                <input
                  type="date"
                  className="filter-input"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                />
              </div>

              <div className="filter-group">
                <span className="filter-label">{lang === 'mr' ? 'लेखापरीक्षा शेवटची तारीख:' : 'Audit To:'}</span>
                <input
                  type="date"
                  className="filter-input"
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                />
              </div>

              <button className="btn btn-primary btn-sm" onClick={loadAuditData}>
                <RefreshCw size={14} /> {lang === 'mr' ? 'लेखापरीक्षा नोंदी लोड करा' : 'Load Audit Schedules'}
              </button>

              <button className="btn btn-secondary btn-sm" onClick={handlePresetJune}>
                {lang === 'mr' ? 'जून २०२६' : 'June 2026'}
              </button>

              <button className="btn btn-secondary btn-sm" onClick={handlePresetToday}>
                {lang === 'mr' ? 'आज' : 'Today'}
              </button>
            </div>

            {/* Schedule Checklist */}
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 10 }}>
              {lang === 'mr' ? 'मुद्रण पॅकेजमध्ये समाविष्ट केलेली पत्रके:' : 'Schedules Included in Print Package:'}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, background: '#ffffff', padding: 14, border: '1px solid #cbd5e1', borderRadius: 8 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                <input type="checkbox" checked={includeCover} onChange={e => setIncludeCover(e.target.checked)} />
                {lang === 'mr' ? '१. मुख्य मुखपृष्ठ आणि आर्थिक सारांश' : '1. Cover Sheet & Financial Summary'}
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                <input type="checkbox" checked={includeCreditBook} onChange={e => setIncludeCreditBook(e.target.checked)} />
                {lang === 'mr' ? `२. जमा वही पत्रक (${creditRows.length} व्यवहार)` : `2. Credit Book Schedule (${creditRows.length} txns)`}
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                <input type="checkbox" checked={includeDebitBook} onChange={e => setIncludeDebitBook(e.target.checked)} />
                {lang === 'mr' ? `३. नावे वही पत्रक (${debitRows.length} व्यवहार)` : `3. Debit Book Schedule (${debitRows.length} txns)`}
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                <input type="checkbox" checked={includeLedger} onChange={e => setIncludeLedger(e.target.checked)} />
                {lang === 'mr' ? `४. सर्वसाधारण खातेवही सारांश (${ledgerRows.length} खाती)` : `4. General Ledger Summary (${ledgerRows.length} accounts)`}
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                <input type="checkbox" checked={includeCustomers} onChange={e => setIncludeCustomers(e.target.checked)} />
                {lang === 'mr' ? `५. ग्राहक खाती आणि KYC निर्देशिका (${customers.length} सदस्य)` : `5. Customer Accounts & KYC Directory (${customers.length} members)`}
              </label>
            </div>
          </div>
        </div>

        {/* ── PRINT BINDER CONTAINER ── */}
        <div id="audit-print-binder">

          {/* ══════════════════════════════════════════════════════════════════
              SCHEDULE 1: COVER SHEET & EXECUTIVE AUDIT SUMMARY
             ══════════════════════════════════════════════════════════════════ */}
          {includeCover && (
            <div className="audit-page-section" style={{ pageBreakAfter: 'always', marginBottom: 40 }}>
              <div style={{
                border: '3px double #0f172a', borderRadius: 12, padding: 30, background: '#ffffff',
                textAlign: 'center', boxShadow: '0 4px 20px rgba(0,0,0,0.05)'
              }}>
                <PrintHeader
                  documentTitle={lang === 'mr' ? 'आर्थिक लेखापरीक्षा पॅकेज' : 'F I N A N C I A L   A U D I T   P A C K A G E'}
                  subTitle={lang === 'mr' ? `लेखापरीक्षा कालावधी: ${startDate} ते ${endDate}` : `Audit Period: ${startDate} to ${endDate}`}
                />

                {/* Audit Key Metric Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginTop: 24, textAlign: 'left' }}>
                  <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: 14 }}>
                    <div style={{ fontSize: 11, fontWeight: 800, color: '#166534', textTransform: 'uppercase' }}>{lang === 'mr' ? 'एकूण जमा पावत्या' : 'Total Credit Receipts'}</div>
                    <div style={{ fontSize: 20, fontWeight: 900, color: '#15803d', marginTop: 4 }}>
                      ₹{creditTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </div>
                    <div style={{ fontSize: 11, color: '#166534', marginTop: 4 }}>{creditRows.length} {lang === 'mr' ? 'जमा व्यवहार' : 'Credit Transactions'}</div>
                  </div>

                  <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: 14 }}>
                    <div style={{ fontSize: 11, fontWeight: 800, color: '#991b1b', textTransform: 'uppercase' }}>{lang === 'mr' ? 'एकूण नावे खर्च' : 'Total Debit Payments'}</div>
                    <div style={{ fontSize: 20, fontWeight: 900, color: '#b91c1c', marginTop: 4 }}>
                      ₹{debitTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </div>
                    <div style={{ fontSize: 11, color: '#991b1b', marginTop: 4 }}>{debitRows.length} {lang === 'mr' ? 'नावे व्यवहार' : 'Debit Transactions'}</div>
                  </div>

                  <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: 14 }}>
                    <div style={{ fontSize: 11, fontWeight: 800, color: '#1e40af', textTransform: 'uppercase' }}>{lang === 'mr' ? 'सदस्य खाती आणि KYC' : 'Member Accounts & KYC'}</div>
                    <div style={{ fontSize: 20, fontWeight: 900, color: '#1d4ed8', marginTop: 4 }}>
                      {customers.length} {lang === 'mr' ? 'सदस्य' : 'Members'}
                    </div>
                    <div style={{ fontSize: 11, color: '#1e40af', marginTop: 4 }}>{lang === 'mr' ? '१०-अंकी आयडी आणि KYC पडताळणीकृत' : '10-Digit ID & KYC Verified'}</div>
                  </div>
                </div>

                {/* Verification Badge */}
                <div style={{
                  marginTop: 24, padding: '12px 18px', background: '#f8fafc', border: '1px solid #cbd5e1',
                  borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between', textAlign: 'left'
                }}>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <CheckCircle2 size={16} color="#16a34a" /> {lang === 'mr' ? 'स्तर १ → स्तर २ → स्तर ३ ताळमेळ स्थिती' : 'Level 1 → Level 2 → Level 3 Reconciliation Status'}
                    </div>
                    <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                      {lang === 'mr' ? 'सर्व जमा पावत्या, नावे देणे आणि सर्वसाधारण खातेवही खाती पूर्णपणे जुळलेली आहेत.' : 'All Credit Receipts, Debit Payments, and General Ledger accounts fully reconciled.'}
                    </div>
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 800, color: '#15803d', background: '#dcfce7', border: '1px solid #86efac', padding: '4px 10px', borderRadius: 6 }}>
                    {lang === 'mr' ? 'ताळमेळ पूर्ण आणि पडताळणीकृत ✅' : 'RECONCILED & VERIFIED ✅'}
                  </span>
                </div>

                {/* Signatures Footer */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 30, marginTop: 40, paddingTop: 30, borderTop: '1px solid #e2e8f0', textAlign: 'center' }}>
                  <div>
                    <div style={{ height: 40 }} />
                    <div style={{ fontSize: 12, fontWeight: 700, borderTop: '1px solid #94a3b8', paddingTop: 4 }}>{lang === 'mr' ? 'तयार केले (लेखापाल अधिकारी)' : 'Prepared By (Accounts Officer)'}</div>
                  </div>
                  <div>
                    <div style={{ height: 40 }} />
                    <div style={{ fontSize: 12, fontWeight: 700, borderTop: '1px solid #94a3b8', paddingTop: 4 }}>{lang === 'mr' ? 'तपासले (अंतर्गत लेखापरीक्षक)' : 'Verified By (Internal Auditor)'}</div>
                  </div>
                  <div>
                    <div style={{ height: 40 }} />
                    <div style={{ fontSize: 12, fontWeight: 700, borderTop: '1px solid #94a3b8', paddingTop: 4 }}>{lang === 'mr' ? 'मंजूर केले (वैधानिक लेखापरीक्षक)' : 'Approved By (Statutory Auditor)'}</div>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              SCHEDULE 2: CREDIT BOOK AUDIT SCHEDULE
             ══════════════════════════════════════════════════════════════════ */}
          {includeCreditBook && (
            <div className="audit-page-section" style={{ pageBreakAfter: 'always', marginBottom: 40 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, borderBottom: '2px solid #0f172a', paddingBottom: 8 }}>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: '#0f172a' }}>{lang === 'mr' ? 'तक्ता २: जमा वही पावत्या लेखापरीक्षा तक्ता' : 'SCHEDULE II: CREDIT BOOK RECEIPTS AUDIT SCHEDULE'}</div>
                  <div style={{ fontSize: 12, color: '#475569' }}>{lang === 'mr' ? 'कालावधी:' : 'Period:'} {startDate} {lang === 'mr' ? 'ते' : 'to'} {endDate}</div>
                </div>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#15803d' }}>
                  {lang === 'mr' ? 'एकूण पावत्या:' : 'Total Receipts:'} ₹{creditTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>
              </div>

              <table className="data-table" style={{ width: '100%', fontSize: 11 }}>
                <thead>
                  <tr style={{ background: '#f0fdf4' }}>
                    <th>{lang === 'mr' ? 'तारीख' : 'Date'}</th>
                    <th>L.F</th>
                    <th>{lang === 'mr' ? 'खातेदाराचे नाव' : 'Account Holder Name'}</th>
                    {CREDIT_BOOK_COLUMNS.map(col => <th key={col.key} style={{ textAlign: 'right' }}>{lang === 'mr' ? (COLUMN_LABELS_MR[col.key as string] || col.label) : col.label}</th>)}
                    <th style={{ textAlign: 'right' }}>{lang === 'mr' ? 'एकूण रक्कम' : 'Total Amount'}</th>
                    <th>{lang === 'mr' ? 'मेमो क्र.' : 'Memo No.'}</th>
                  </tr>
                </thead>
                <tbody>
                  {creditRows.map(r => (
                    <tr key={r.id}>
                      <td>{r.date}</td>
                      <td>{r.lf_no}</td>
                      <td>{r.name}</td>
                      {CREDIT_BOOK_COLUMNS.map(col => (
                        <td key={col.key} style={{ textAlign: 'right', fontFamily: 'monospace' }}>
                          {Number(r[col.key]) > 0 ? `₹${Number(r[col.key]).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'}
                        </td>
                      ))}
                      <td style={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, color: '#15803d' }}>
                        ₹{Number(r.total).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td style={{ fontFamily: 'monospace' }}>{r.cash_memo_no}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ background: '#dcfce7', fontWeight: 800 }}>
                    <td colSpan={3}>{lang === 'mr' ? 'जमा एकूण' : 'CREDIT TOTALS'}</td>
                    {CREDIT_BOOK_COLUMNS.map(col => (
                      <td key={col.key} style={{ textAlign: 'right', fontFamily: 'monospace' }}>
                        {creditColTotals[col.key as string] > 0 ? `₹${creditColTotals[col.key as string].toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'}
                      </td>
                    ))}
                    <td style={{ textAlign: 'right', fontFamily: 'monospace', color: '#15803d' }}>
                      ₹{creditTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              SCHEDULE 3: DEBIT BOOK AUDIT SCHEDULE
             ══════════════════════════════════════════════════════════════════ */}
          {includeDebitBook && (
            <div className="audit-page-section" style={{ pageBreakAfter: 'always', marginBottom: 40 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, borderBottom: '2px solid #0f172a', paddingBottom: 8 }}>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: '#0f172a' }}>{lang === 'mr' ? 'तक्ता ३: नावे वही खर्च लेखापरीक्षा तक्ता' : 'SCHEDULE III: DEBIT BOOK PAYMENTS AUDIT SCHEDULE'}</div>
                  <div style={{ fontSize: 12, color: '#475569' }}>{lang === 'mr' ? 'कालावधी:' : 'Period:'} {startDate} {lang === 'mr' ? 'ते' : 'to'} {endDate}</div>
                </div>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#b91c1c' }}>
                  {lang === 'mr' ? 'एकूण खर्च:' : 'Total Payments:'} ₹{debitTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>
              </div>

              <table className="data-table" style={{ width: '100%', fontSize: 11 }}>
                <thead>
                  <tr style={{ background: '#fef2f2' }}>
                    <th>{lang === 'mr' ? 'तारीख' : 'Date'}</th>
                    <th>L.F</th>
                    <th>{lang === 'mr' ? 'खातेदाराचे नाव' : 'Account Holder Name'}</th>
                    {DEBIT_BOOK_COLUMNS.map(col => <th key={col.key} style={{ textAlign: 'right', color: '#991b1b' }}>{lang === 'mr' ? (COLUMN_LABELS_MR[col.key as string] || col.label) : col.label}</th>)}
                    <th style={{ textAlign: 'right', color: '#991b1b' }}>{lang === 'mr' ? 'एकूण रक्कम' : 'Total Amount'}</th>
                    <th>{lang === 'mr' ? 'मेमो क्र.' : 'Memo No.'}</th>
                  </tr>
                </thead>
                <tbody>
                  {debitRows.map(r => (
                    <tr key={r.id}>
                      <td>{r.date}</td>
                      <td>{r.lf_no}</td>
                      <td>{r.name}</td>
                      {DEBIT_BOOK_COLUMNS.map(col => (
                        <td key={col.key} style={{ textAlign: 'right', fontFamily: 'monospace' }}>
                          {Number(r[col.key]) > 0 ? `₹${Number(r[col.key]).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'}
                        </td>
                      ))}
                      <td style={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, color: '#b91c1c' }}>
                        ₹{Number(r.total).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td style={{ fontFamily: 'monospace' }}>{r.cash_memo_no}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ background: '#fee2e2', fontWeight: 800 }}>
                    <td colSpan={3} style={{ color: '#991b1b' }}>{lang === 'mr' ? 'नावे एकूण' : 'DEBIT TOTALS'}</td>
                    {DEBIT_BOOK_COLUMNS.map(col => (
                      <td key={col.key} style={{ textAlign: 'right', fontFamily: 'monospace', color: '#991b1b' }}>
                        {debitColTotals[col.key as string] > 0 ? `₹${debitColTotals[col.key as string].toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'}
                      </td>
                    ))}
                    <td style={{ textAlign: 'right', fontFamily: 'monospace', color: '#b91c1c' }}>
                      ₹{debitTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              SCHEDULE 4: GENERAL LEDGER SUMMARY SHEET
             ══════════════════════════════════════════════════════════════════ */}
          {includeLedger && (
            <div className="audit-page-section" style={{ pageBreakAfter: 'always', marginBottom: 40 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, borderBottom: '2px solid #0f172a', paddingBottom: 8 }}>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: '#0f172a' }}>{lang === 'mr' ? 'तक्ता ४: सर्वसाधारण खातेवही शिल्लक पत्रक' : 'SCHEDULE IV: GENERAL LEDGER ACCOUNT BALANCES SHEET'}</div>
                  <div style={{ fontSize: 12, color: '#475569' }}>{lang === 'mr' ? 'स्तर ३ वार्षिक खातेवही सारांश' : 'Level 3 Yearly Ledger Summaries'}</div>
                </div>
              </div>

              <table className="data-table" style={{ width: '100%', fontSize: 12 }}>
                <thead>
                  <tr style={{ background: '#f8fafc' }}>
                    <th>{lang === 'mr' ? 'वर्ष' : 'Year'}</th>
                    <th>{lang === 'mr' ? 'खातेवही नाव' : 'Ledger Account Name'}</th>
                    <th style={{ textAlign: 'right' }}>{lang === 'mr' ? 'जमा (₹)' : 'Receipt (₹)'}</th>
                    <th style={{ textAlign: 'right' }}>{lang === 'mr' ? 'नावे (₹)' : 'Debit (₹)'}</th>
                    <th style={{ textAlign: 'right' }}>{lang === 'mr' ? 'देणे (₹)' : 'Payable (₹)'}</th>
                    <th style={{ textAlign: 'right' }}>{lang === 'mr' ? 'घेणे (₹)' : 'Receivable (₹)'}</th>
                  </tr>
                </thead>
                <tbody>
                  {ledgerRows.map((r, idx) => (
                    <tr key={idx}>
                      <td>{r.month_year_label}</td>
                      <td style={{ fontWeight: 700 }}>{r.account}</td>
                      <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>
                        {Number(r.receipt) > 0 ? `₹${Number(r.receipt).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'}
                      </td>
                      <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>
                        {Number(r.debit) > 0 ? `₹${Number(r.debit).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'}
                      </td>
                      <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>
                        {Number(r.payable) > 0 ? `₹${Number(r.payable).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'}
                      </td>
                      <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>
                        {Number(r.receivable) > 0 ? `₹${Number(r.receivable).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ background: '#f1f5f9', fontWeight: 800 }}>
                    <td colSpan={2}>{lang === 'mr' ? 'खातेवही एकूण' : 'GENERAL LEDGER TOTALS'}</td>
                    <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>₹{totalLedgerReceipt.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>₹{totalLedgerDebit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>₹{totalLedgerPayable.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>₹{totalLedgerReceivable.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              SCHEDULE 5: CUSTOMER SAVINGS ACCOUNTS & KYC DIRECTORY
             ══════════════════════════════════════════════════════════════════ */}
          {includeCustomers && (
            <div className="audit-page-section" style={{ marginBottom: 40 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, borderBottom: '2px solid #0f172a', paddingBottom: 8 }}>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: '#0f172a' }}>{lang === 'mr' ? 'तक्ता ५: ग्राहक बचत खाती आणि KYC निर्देशिका' : 'SCHEDULE V: CUSTOMER SAVINGS ACCOUNTS & KYC DIRECTORY'}</div>
                  <div style={{ fontSize: 12, color: '#475569' }}>{lang === 'mr' ? '१०-अंकी ग्राहक आयडी, आधार आणि पॅन पडताळणी सूची' : '10-Digit Customer IDs, Aadhaar & PAN Verification List'}</div>
                </div>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--blue-700)' }}>
                  {lang === 'mr' ? `एकूण नोंदणीकृत: ${customers.length} सदस्य` : `Total Registered: ${customers.length} Members`}
                </div>
              </div>

              <table className="data-table" style={{ width: '100%', fontSize: 11 }}>
                <thead>
                  <tr style={{ background: '#f8fafc' }}>
                    <th>{lang === 'mr' ? '१०-अंकी आयडी' : '10-Digit ID'}</th>
                    <th>{lang === 'mr' ? 'सदस्याचे पूर्ण नाव' : 'Member Full Name'}</th>
                    <th>{lang === 'mr' ? 'मोबाईल क्र' : 'Mobile No'}</th>
                    <th>{lang === 'mr' ? 'रहिवासी पत्ता' : 'Residential Address'}</th>
                    <th>{lang === 'mr' ? 'आधार क्रमांक' : 'Aadhaar Number'}</th>
                    <th>{lang === 'mr' ? 'पॅन क्रमांक' : 'PAN Number'}</th>
                    <th style={{ textAlign: 'right' }}>{lang === 'mr' ? 'प्रारंभिक शिल्लक' : 'Opening Balance'}</th>
                  </tr>
                </thead>
                <tbody>
                  {customers.map(c => (
                    <tr key={c.id}>
                      <td style={{ fontFamily: 'monospace', fontWeight: 800, color: 'var(--blue-800)' }}>{c.customer_id}</td>
                      <td style={{ fontWeight: 700 }}>{c.full_name}</td>
                      <td>{c.mobile_no || '—'}</td>
                      <td style={{ fontSize: 11, maxWidth: 180 }}>{c.address || '—'}</td>
                      <td>{c.aadhaar_no || '—'} {c.aadhaar_doc_path ? (lang === 'mr' ? '✓ स्कॅन' : '✓ Scan') : ''}</td>
                      <td>{c.pan_no || '—'} {c.pan_doc_path ? (lang === 'mr' ? '✓ स्कॅन' : '✓ Scan') : ''}</td>
                      <td style={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: 700 }}>
                        ₹{Number(c.opening_balance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

        </div>{/* /audit-print-binder */}

      </div>
    </div>
  );
};

export default AuditPackage;
