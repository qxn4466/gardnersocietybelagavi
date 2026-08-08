import React, { useEffect, useState, useCallback } from 'react';
import { RefreshCw, BookMarked, TrendingUp, TrendingDown, ArrowRightLeft, Wallet, ChevronDown, ChevronRight } from 'lucide-react';
import Header from '../components/Header';
import PrintButton from '../components/PrintButton';
import PrintHeader from '../components/PrintHeader';
import { fetchLedger, fetchAccounts } from '../api/client';
import type { LedgerRow, AccountMaster, User } from '../types';
import { useTranslation } from '../hooks/useTranslation';
import { getTxnHeadMarathi } from '../utils/translator';

const MONTH_NAMES = [
  '', 'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const MONTH_NAMES_MR = [
  '', 'जानेवारी', 'फेब्रुवारी', 'मार्च', 'एप्रिल', 'मे', 'जून',
  'जुलै', 'ऑगस्ट', 'सप्टेंबर', 'ऑक्टोबर', 'नोव्हेंबर', 'डिसेंबर',
];

const fmt = (v: number) =>
  v === 0 ? '—' : `₹${Number(v).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

const fmtPos = (v: number) =>
  `₹${Math.abs(Number(v)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

interface GeneralLedgerProps {
  user?: User | null;
  onLogout?: () => void;
  onToggleMobileMenu?: () => void;
}

// ── Account group: one row per ledger account for the year ───────────────────
type AccountGroup = {
  account: string;
  monthRows: LedgerRow[];           // month-by-month detail
  totalReceipt: number;
  totalDebit: number;
  totalPayable: number;
  totalReceivable: number;
};

const GeneralLedger: React.FC<GeneralLedgerProps> = ({ user, onLogout, onToggleMobileMenu }) => {
  const { t, lang } = useTranslation();
  const now = new Date();
  const [year, setYear] = useState<string>(String(now.getFullYear()));
  const [account, setAccount] = useState<string>('');
  const [rows, setRows] = useState<LedgerRow[]>([]);
  const [accounts, setAccounts] = useState<AccountMaster[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedAccount, setExpandedAccount] = useState<string | null>(null);

  useEffect(() => {
    fetchAccounts().then(setAccounts).catch(() => {});
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchLedger(
        undefined,
        year ? parseInt(year) : undefined,
        account || undefined
      );
      setRows(data);
    } catch {
      setError(lang === 'mr'
        ? 'खातेवही डेटा लोड होऊ शकला नाही. बॅकएंड कनेक्शन तपासा.'
        : 'Could not load Ledger data. Check backend connection.');
    } finally {
      setLoading(false);
    }
  }, [year, account, lang]);

  // Auto-load whenever year / account filter changes
  useEffect(() => { loadData(); }, [loadData]);

  // ── Group by account (account-first, month detail inside) ─────────────────
  const accountGroups: AccountGroup[] = [];
  const accountMap = new Map<string, AccountGroup>();

  for (const r of rows) {
    if (!accountMap.has(r.account)) {
      const grp: AccountGroup = {
        account: r.account,
        monthRows: [],
        totalReceipt: 0,
        totalDebit: 0,
        totalPayable: 0,
        totalReceivable: 0,
      };
      accountMap.set(r.account, grp);
      accountGroups.push(grp);
    }
    const grp = accountMap.get(r.account)!;
    grp.monthRows.push(r);
    grp.totalReceipt    += Number(r.receipt);
    grp.totalDebit      += Number(r.debit);
    grp.totalPayable    += Number(r.payable);
    grp.totalReceivable += Number(r.receivable);
  }

  // Sort: credit accounts first, then debit
  accountGroups.sort((a, b) => {
    const aIsCredit = a.totalReceipt > 0 && a.totalDebit === 0;
    const bIsCredit = b.totalReceipt > 0 && b.totalDebit === 0;
    if (aIsCredit && !bIsCredit) return -1;
    if (!aIsCredit && bIsCredit) return 1;
    return a.account.localeCompare(b.account);
  });

  // Grand totals
  const totalReceipt  = accountGroups.reduce((s, g) => s + g.totalReceipt, 0);
  const totalDebit    = accountGroups.reduce((s, g) => s + g.totalDebit, 0);
  const totalPayable  = accountGroups.reduce((s, g) => s + g.totalPayable, 0);
  const totalRcv      = accountGroups.reduce((s, g) => s + g.totalReceivable, 0);
  const netBalance    = totalReceipt - totalDebit;

  const yearOptions = Array.from({ length: 10 }, (_, i) => now.getFullYear() - 5 + i);

  return (
    <div className="page-container">
      <Header
        title={t('ledger_title')}
        subtitle={lang === 'mr'
          ? `सर्वसाधारण खातेवही — ${year ? `वर्ष ${year}` : 'सर्व वर्षे'}`
          : `General Ledger — ${year ? `Year ${year}` : 'All Years'}`}
        level={3}
        actions={<PrintButton label={lang === 'mr' ? 'खातेवही मुद्रित करा' : 'Print Ledger'} />}
        user={user}
        onLogout={onLogout}
        onToggleMobileMenu={onToggleMobileMenu}
      />

      <div className="page-content">
        {/* Stats */}
        <div className="stat-row no-print">
          <div className="stat-card">
            <div className="stat-label" style={{ color: '#15803d' }}>
              <TrendingUp size={14} style={{ display: 'inline', marginRight: 4 }} />
              {lang === 'mr' ? 'एकूण जमा' : 'Total Receipts'}
            </div>
            <div className="stat-value" style={{ color: '#15803d' }}>
              ₹{totalReceipt.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-label" style={{ color: '#b91c1c' }}>
              <TrendingDown size={14} style={{ display: 'inline', marginRight: 4 }} />
              {lang === 'mr' ? 'एकूण नावे' : 'Total Payments'}
            </div>
            <div className="stat-value" style={{ color: '#b91c1c' }}>
              ₹{totalDebit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-label" style={{ color: netBalance >= 0 ? '#1d4ed8' : '#b91c1c' }}>
              <ArrowRightLeft size={14} style={{ display: 'inline', marginRight: 4 }} />
              {lang === 'mr' ? 'निव्वळ शिल्लक' : 'Net Balance'}
            </div>
            <div className="stat-value" style={{ color: netBalance >= 0 ? '#1d4ed8' : '#b91c1c' }}>
              {netBalance >= 0 ? '+' : '-'}{fmtPos(netBalance)}
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-label">
              <Wallet size={14} style={{ display: 'inline', marginRight: 4 }} />
              {lang === 'mr' ? 'देणे / घेणे' : 'Payable / Receivable'}
            </div>
            <div className="stat-value" style={{ fontSize: 14 }}>
              <span style={{ color: '#f59e0b' }}>₹{totalPayable.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              {' / '}
              <span style={{ color: '#0284c7' }}>₹{totalRcv.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="filter-bar no-print">
          <div className="filter-group">
            <span className="filter-label">{lang === 'mr' ? 'वर्ष' : 'Year'}</span>
            <select id="ledger-year" className="filter-select" value={year} onChange={e => setYear(e.target.value)}>
              <option value="">{lang === 'mr' ? 'सर्व वर्षे' : 'All Years'}</option>
              {yearOptions.map(y => <option key={y} value={String(y)}>{y}</option>)}
            </select>
          </div>
          <div className="filter-group">
            <span className="filter-label">{lang === 'mr' ? 'खाते' : 'Account'}</span>
            <select id="ledger-account" className="filter-select" value={account}
              onChange={e => setAccount(e.target.value)} style={{ minWidth: 200 }}>
              <option value="">{lang === 'mr' ? 'सर्व खाती' : 'All Accounts'}</option>
              {accounts.map(a => (
                <option key={a.id} value={a.account_name}>
                  {lang === 'mr' ? getTxnHeadMarathi(a.account_name) : a.account_name}
                </option>
              ))}
            </select>
          </div>
          <button className="btn btn-primary btn-sm" onClick={loadData} id="ledger-refresh">
            <RefreshCw size={14} /> {lang === 'mr' ? 'ताजे करा' : 'Refresh'}
          </button>
          {accountGroups.length > 0 && (
            <span style={{ fontSize: 12, color: 'var(--text-muted)', alignSelf: 'center', marginLeft: 8 }}>
              {lang === 'mr'
                ? `${accountGroups.length} खाते · ${rows.length} व्यवहार`
                : `${accountGroups.length} accounts · ${rows.length} entries`}
            </span>
          )}
        </div>

        {/* Print Header */}
        <PrintHeader
          documentTitle={lang === 'mr' ? 'सर्वसाधारण खातेवही' : 'G E N E R A L   L E D G E R'}
          subTitle={lang === 'mr'
            ? `वार्षिक खाते शिल्लक — ${year ? `वर्ष ${year}` : 'सर्व वर्षे'}`
            : `Annual Account Balance — ${year ? `Year ${year}` : 'All Years'}`}
        />

        {error && <div className="alert alert-error" style={{ marginBottom: 16 }}>{error}</div>}

        {/* Ledger Table */}
        <div className="card" style={{ borderTop: '4px solid #4f46e5', boxShadow: '0 4px 24px rgba(79,70,229,0.1)', overflow: 'hidden' }}>
          <div className="table-wrapper">
            {loading ? (
              <div className="loading-overlay">
                <span className="spinner" /> {lang === 'mr' ? 'खातेवही लोड होत आहे…' : 'Loading ledger…'}
              </div>
            ) : accountGroups.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon"><BookMarked /></div>
                <div className="empty-state-title">
                  {lang === 'mr' ? 'खातेवही नोंदी आढळल्या नाहीत' : 'No ledger entries found'}
                </div>
                <div className="empty-state-sub">
                  {lang === 'mr'
                    ? 'जमा/नावे फॉर्ममध्ये व्यवहार प्रविष्ट करा — ते येथे आपोआप दिसतील'
                    : 'Enter transactions via Credit/Debit Form — they will appear here automatically'}
                </div>
              </div>
            ) : (
              <table className="data-table" style={{ tableLayout: 'fixed', width: '100%' }}>
                <colgroup>
                  <col style={{ width: 32 }} />
                  <col style={{ width: '28%' }} />
                  <col style={{ width: '14%' }} />
                  <col style={{ width: '14%' }} />
                  <col style={{ width: '14%' }} />
                  <col style={{ width: '14%' }} />
                  <col style={{ width: '14%' }} />
                </colgroup>
                <thead>
                  <tr>
                    <th />
                    <th>{lang === 'mr' ? 'खाते (Account Head)' : 'Account Head'}</th>
                    <th style={{ textAlign: 'right', color: '#15803d' }}>
                      {lang === 'mr' ? 'जमा (Dr.)' : 'Credit / Receipt'}
                    </th>
                    <th style={{ textAlign: 'right', color: '#b91c1c' }}>
                      {lang === 'mr' ? 'नावे (Cr.)' : 'Debit / Payment'}
                    </th>
                    <th style={{ textAlign: 'right', color: '#f59e0b' }}>
                      {lang === 'mr' ? 'देणे' : 'Payable'}
                    </th>
                    <th style={{ textAlign: 'right', color: '#0284c7' }}>
                      {lang === 'mr' ? 'घेणे' : 'Receivable'}
                    </th>
                    <th style={{ textAlign: 'right' }}>
                      {lang === 'mr' ? 'शिल्लक' : 'Balance'}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {accountGroups.map((grp, gi) => {
                    const isOpen   = expandedAccount === grp.account;
                    const balance  = grp.totalReceipt - grp.totalDebit;
                    const isCredit = grp.totalReceipt > 0 && grp.totalDebit === 0;
                    const isDebit  = grp.totalDebit > 0 && grp.totalReceipt === 0;

                    return (
                      <React.Fragment key={grp.account}>
                        {/* Account summary row */}
                        <tr
                          onClick={() => setExpandedAccount(isOpen ? null : grp.account)}
                          style={{
                            cursor: 'pointer',
                            background: gi % 2 === 0 ? '#ffffff' : '#f8fafc',
                            fontWeight: 600,
                            borderLeft: isCredit
                              ? '3px solid #15803d'
                              : isDebit
                              ? '3px solid #b91c1c'
                              : '3px solid #6366f1',
                          }}
                        >
                          <td style={{ textAlign: 'center', color: 'var(--text-muted)', paddingLeft: 8 }}>
                            {isOpen
                              ? <ChevronDown size={14} />
                              : <ChevronRight size={14} />}
                          </td>
                          <td style={{ fontWeight: 700, color: 'var(--text-primary)', paddingLeft: 4 }}>
                            {lang === 'mr' ? getTxnHeadMarathi(grp.account) : grp.account}
                            <span style={{ fontSize: 10, color: 'var(--text-muted)', marginLeft: 6, fontWeight: 400 }}>
                              ({grp.monthRows.length} {lang === 'mr' ? 'महिना' : 'month'}{grp.monthRows.length !== 1 ? 's' : ''})
                            </span>
                          </td>
                          <td style={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, color: grp.totalReceipt > 0 ? '#15803d' : 'var(--text-muted)' }}>
                            {fmt(grp.totalReceipt)}
                          </td>
                          <td style={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, color: grp.totalDebit > 0 ? '#b91c1c' : 'var(--text-muted)' }}>
                            {fmt(grp.totalDebit)}
                          </td>
                          <td style={{ textAlign: 'right', fontFamily: 'monospace', color: grp.totalPayable > 0 ? '#f59e0b' : 'var(--text-muted)' }}>
                            {fmt(grp.totalPayable)}
                          </td>
                          <td style={{ textAlign: 'right', fontFamily: 'monospace', color: grp.totalReceivable > 0 ? '#0284c7' : 'var(--text-muted)' }}>
                            {fmt(grp.totalReceivable)}
                          </td>
                          <td style={{
                            textAlign: 'right', fontFamily: 'monospace', fontWeight: 700,
                            color: balance > 0 ? '#15803d' : balance < 0 ? '#b91c1c' : 'var(--text-muted)'
                          }}>
                            {balance > 0 ? '+' : balance < 0 ? '-' : ''}{balance !== 0 ? fmtPos(balance) : '—'}
                          </td>
                        </tr>

                        {/* Expanded: month-by-month detail for this account */}
                        {isOpen && grp.monthRows.map((r, mi) => (
                          <tr key={mi} style={{
                            background: '#f0f9ff',
                            fontSize: 12,
                            borderLeft: '3px solid #bae6fd',
                          }}>
                            <td />
                            <td style={{ paddingLeft: 28, color: '#0369a1', fontStyle: 'italic' }}>
                              └ {lang === 'mr'
                                ? `${MONTH_NAMES_MR[r.month]} ${r.year}`
                                : `${MONTH_NAMES[r.month]} ${r.year}`}
                            </td>
                            <td style={{ textAlign: 'right', fontFamily: 'monospace', color: Number(r.receipt) > 0 ? '#15803d' : 'var(--text-muted)' }}>
                              {fmt(Number(r.receipt))}
                            </td>
                            <td style={{ textAlign: 'right', fontFamily: 'monospace', color: Number(r.debit) > 0 ? '#b91c1c' : 'var(--text-muted)' }}>
                              {fmt(Number(r.debit))}
                            </td>
                            <td style={{ textAlign: 'right', fontFamily: 'monospace', color: Number(r.payable) > 0 ? '#f59e0b' : 'var(--text-muted)' }}>
                              {fmt(Number(r.payable))}
                            </td>
                            <td style={{ textAlign: 'right', fontFamily: 'monospace', color: Number(r.receivable) > 0 ? '#0284c7' : 'var(--text-muted)' }}>
                              {fmt(Number(r.receivable))}
                            </td>
                            <td />
                          </tr>
                        ))}
                      </React.Fragment>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr style={{
                    background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)',
                    color: '#fff', fontWeight: 800, fontSize: 13,
                  }}>
                    <td />
                    <td style={{ color: '#c7d2fe', padding: '10px 8px', fontWeight: 700 }}>
                      {lang === 'mr'
                        ? `वार्षिक एकूण — ${year || 'सर्व वर्षे'} (${accountGroups.length} खाती)`
                        : `YEARLY TOTAL — ${year || 'All Years'} (${accountGroups.length} accounts)`}
                    </td>
                    <td style={{ textAlign: 'right', fontFamily: 'monospace', color: '#86efac', fontSize: 14, fontWeight: 800 }}>
                      {fmt(totalReceipt)}
                    </td>
                    <td style={{ textAlign: 'right', fontFamily: 'monospace', color: '#fca5a5', fontSize: 14, fontWeight: 800 }}>
                      {fmt(totalDebit)}
                    </td>
                    <td style={{ textAlign: 'right', fontFamily: 'monospace', color: '#fde68a' }}>
                      {fmt(totalPayable)}
                    </td>
                    <td style={{ textAlign: 'right', fontFamily: 'monospace', color: '#93c5fd' }}>
                      {fmt(totalRcv)}
                    </td>
                    <td style={{
                      textAlign: 'right', fontFamily: 'monospace', fontWeight: 800, fontSize: 14,
                      color: netBalance >= 0 ? '#86efac' : '#fca5a5'
                    }}>
                      {netBalance >= 0 ? '+' : '-'}{fmtPos(netBalance)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GeneralLedger;
