import React, { useEffect, useState, useCallback, useRef } from 'react';
import { RefreshCw, BookMarked, TrendingUp, TrendingDown, ArrowRightLeft, Wallet, ChevronDown, ChevronRight } from 'lucide-react';
import Header from '../components/Header';
import PrintButton from '../components/PrintButton';
import PrintHeader from '../components/PrintHeader';
import { fetchLedger, fetchAccounts, fetchDailyBalance, fetchLedgerEntries } from '../api/client';
import type { LedgerRow, LedgerEntry, AccountMaster, User, DailyBalanceSummary } from '../types';
import { useTranslation } from '../hooks/useTranslation';
import { getTxnHeadMarathi } from '../utils/translator';
import DailyBalanceBar from '../components/DailyBalanceBar';

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

const LedgerEntriesPanel: React.FC<{ state: LedgerEntry[] | 'loading'; lang: string }> = ({ state, lang }) => {
  if (state === 'loading') {
    return (
      <tr style={{ background: '#f0fdf4', fontSize: 12 }}>
        <td />
        <td colSpan={6} style={{ paddingLeft: 44, fontStyle: 'italic', color: '#64748b' }}>
          {lang === 'mr' ? 'नोंदी लोड होत आहेत…' : 'Loading entries…'}
        </td>
      </tr>
    );
  }
  return (
    <React.Fragment>
      {(state || []).map((e, ei) => (
        <tr key={`entry-${ei}`} style={{ background: '#f0fdf4', fontSize: 11, borderLeft: '3px solid #86efac' }}>
          <td />
          <td colSpan={5} style={{ paddingLeft: 44, paddingRight: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            <span style={{ fontFamily: 'monospace', color: '#166534', fontWeight: 700 }}>
              {e.date}
            </span>
            <span style={{ fontFamily: 'monospace', color: '#1d4ed8', marginLeft: 8, fontWeight: 700 }}>
              {e.bill_no ? `B.No. ${e.bill_no}` : e.voucher_no ? `V.No. ${e.voucher_no}` : e.cash_memo_no}
            </span>
            <span style={{ color: '#334155', marginLeft: 8, fontWeight: 600 }}>
              {e.customer_name}
            </span>
            <span style={{ color: '#64748b', marginLeft: 8 }}>
              {e.particulars || ''}
            </span>
          </td>
          <td style={{ textAlign: 'right', fontFamily: 'monospace', color: e.nature === 'DEBIT' ? '#b91c1c' : '#15803d' }}>
            {e.nature === 'DEBIT' ? '-' : '+'}{fmtPos(e.amount)}
          </td>
        </tr>
      ))}
    </React.Fragment>
  );
};

const GeneralLedger: React.FC<GeneralLedgerProps> = ({ user, onLogout, onToggleMobileMenu }) => {
  const { t, lang } = useTranslation();
  const now = new Date();
  const [year, setYear] = useState<string>(String(now.getFullYear()));
  const [account, setAccount] = useState<string>('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const hasDateFilter = Boolean(fromDate || toDate);
  const invalidRange = Boolean(fromDate && toDate && fromDate > toDate);
  const filterYear = year && !hasDateFilter ? Number(year) : undefined;
  const filterPeriod = hasDateFilter
    ? [fromDate && `${lang === 'mr' ? 'पासून' : 'From'} ${fromDate}`, toDate && `${lang === 'mr' ? 'पर्यंत' : 'To'} ${toDate}`].filter(Boolean).join(' · ')
    : year ? `${lang === 'mr' ? 'वर्ष' : 'Year'} ${year}` : lang === 'mr' ? 'सर्व वर्षे' : 'All Years';
  const entryPeriod = JSON.stringify([filterYear, fromDate, toDate]);
  const latestRequest = useRef(0);
  const [rows, setRows] = useState<LedgerRow[]>([]);
  const [accounts, setAccounts] = useState<AccountMaster[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedAccount, setExpandedAccount] = useState<string | null>(null);
  const [entries, setEntries] = useState<Record<string, LedgerEntry[] | 'loading'>>({});

  const toggleAccount = (grp: AccountGroup) => {
    const key = `${grp.account}|${entryPeriod}`;
    if (expandedAccount === grp.account) {
      setExpandedAccount(null);
      return;
    }
    setExpandedAccount(grp.account);
    if (!entries[key]) {
      setEntries(prev => ({ ...prev, [key]: 'loading' }));
      fetchLedgerEntries(grp.account, filterYear, fromDate || undefined, toDate || undefined)
        .then(list => setEntries(prev => ({ ...prev, [key]: list })))
        .catch(() => setEntries(prev => ({ ...prev, [key]: [] })));
    }
  };

  useEffect(() => {
    fetchAccounts().then(setAccounts).catch(() => {});
  }, []);

  const [dailyBal, setDailyBal] = useState<DailyBalanceSummary | null>(null);

  const loadData = useCallback(async () => {
    const request = ++latestRequest.current;
    setExpandedAccount(null);
    setRows([]);
    if (invalidRange) {
      setLoading(false);
      setError(lang === 'mr'
        ? 'सुरुवातीची तारीख शेवटच्या तारखेला किंवा त्यापूर्वी असावी.'
        : 'From Date must be on or before To Date.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await fetchLedger(
        undefined,
        filterYear,
        account || undefined,
        fromDate || undefined,
        toDate || undefined
      );
      if (request !== latestRequest.current) return;
      setRows(data);
      fetchDailyBalance().then(setDailyBal).catch(() => {});
    } catch {
      if (request !== latestRequest.current) return;
      setError(lang === 'mr'
        ? 'खातेवही डेटा लोड होऊ शकला नाही. बॅकएंड कनेक्शन तपासा.'
        : 'Could not load Ledger data. Check backend connection.');
    } finally {
      if (request === latestRequest.current) setLoading(false);
    }
  }, [filterYear, account, fromDate, toDate, invalidRange, lang]);

  // Auto-load whenever a ledger filter changes.
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
  const closingBalanceLabel = lang === 'mr' ? 'अंतिम शिल्लक (Closing Balance)' : 'Closing Balance';
  const closingBalanceDate = hasDateFilter && dailyBal ? ` (${dailyBal.selected_date})` : '';
  const closingBalance = dailyBal
    ? `₹${Number(dailyBal.closing_balance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
    : hasDateFilter ? '—' : `₹${netBalance >= 0 ? '+' : '-'}${fmtPos(netBalance)}`;

  const yearOptions = Array.from({ length: 10 }, (_, i) => now.getFullYear() - 5 + i);

  return (
    <div className="page-container">
      <Header
        title={t('ledger_title')}
        subtitle={lang === 'mr'
          ? `सर्वसाधारण खातेवही — ${filterPeriod}`
          : `General Ledger — ${filterPeriod}`}
        level={3}
        actions={<PrintButton label={lang === 'mr' ? 'खातेवही मुद्रित करा' : 'Print Ledger'} />}
        user={user}
        onLogout={onLogout}
        onToggleMobileMenu={onToggleMobileMenu}
      />

      <div className="page-content">
        <DailyBalanceBar onBalanceUpdate={setDailyBal} />

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
              {lang === 'mr' ? 'निव्वळ व्यवहार बदल' : 'Net Txn Change'}
            </div>
            <div className="stat-value" style={{ color: netBalance >= 0 ? '#1d4ed8' : '#b91c1c' }}>
              {netBalance >= 0 ? '+' : '-'}{fmtPos(netBalance)}
            </div>
          </div>
          <div className="stat-card" style={{ borderColor: '#c084fc', background: '#faf5ff' }}>
            <div className="stat-label" style={{ color: '#7e22ce', fontWeight: 700 }}>
              <Wallet size={14} style={{ display: 'inline', marginRight: 4 }} />
              {closingBalanceLabel}{closingBalanceDate}
            </div>
            <div className="stat-value" style={{ color: '#6b21a8', fontWeight: 800 }}>
              {closingBalance}
            </div>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="filter-bar no-print">
          <div className="filter-group">
            <span className="filter-label">{lang === 'mr' ? 'वर्ष' : 'Year'}</span>
            <select id="ledger-year" className="filter-select" value={hasDateFilter ? '' : year}
              disabled={hasDateFilter} onChange={e => setYear(e.target.value)}>
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
          <div className="filter-group">
            <label className="filter-label" htmlFor="ledger-from-date">{lang === 'mr' ? 'पासून तारीख' : 'From Date'}</label>
            <input id="ledger-from-date" type="date" className="filter-input" value={fromDate}
              max={toDate || undefined} onChange={e => setFromDate(e.target.value)} />
          </div>
          <div className="filter-group">
            <label className="filter-label" htmlFor="ledger-to-date">{lang === 'mr' ? 'पर्यंत तारीख' : 'To Date'}</label>
            <input id="ledger-to-date" type="date" className="filter-input" value={toDate}
              min={fromDate || undefined} onChange={e => setToDate(e.target.value)} />
          </div>
          <button className="btn btn-primary btn-sm" onClick={loadData} id="ledger-refresh" disabled={invalidRange}>
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
            ? `खाते शिल्लक — ${filterPeriod}`
            : `Account Balance — ${filterPeriod}`}
        />

        {error && <div className="alert alert-error" style={{ marginBottom: 16 }}>{error}</div>}

        {/* Ledger Table */}
        <div className="card" style={{ borderTop: '4px solid #4f46e5', boxShadow: '0 4px 24px rgba(79,70,229,0.1)', overflow: 'hidden' }}>
          <div className="table-wrapper">
            {loading ? (
              <div className="loading-overlay">
                <span className="spinner" /> {lang === 'mr' ? 'खातेवही लोड होत आहे…' : 'Loading ledger…'}
              </div>
            ) : error ? null : accountGroups.length === 0 ? (
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
                          onClick={() => toggleAccount(grp)}
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

                        {/* Expanded: individual entries with Bill/Voucher numbers */}
                        {isOpen && <LedgerEntriesPanel state={entries[`${grp.account}|${entryPeriod}`] || 'loading'} lang={lang} />}
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
                        ? `एकूण — ${filterPeriod} (${accountGroups.length} खाती)`
                        : `TOTAL — ${filterPeriod} (${accountGroups.length} accounts)`}
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

                  {/* Closing Balance Row */}
                  <tr style={{
                    background: '#faf5ff',
                    borderTop: '2px solid #c084fc',
                    fontWeight: 800,
                    fontSize: 14,
                  }}>
                    <td />
                    <td style={{ color: '#6b21a8', padding: '10px 8px', fontWeight: 800 }}>
                      💰 {lang === 'mr' ? closingBalanceLabel : 'CLOSING BALANCE'}{closingBalanceDate}
                    </td>
                    <td colSpan={4} style={{ textAlign: 'right', color: '#7e22ce', fontSize: 12 }}>
                      {lang === 'mr' ? '(प्रारंभिक शिल्लक + एकूण जमा - एकूण नावे)' : '(Opening Balance + Total Receipts - Total Payments)'}
                    </td>
                    <td style={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: 800, fontSize: 15, color: '#6b21a8' }}>
                      {closingBalance}
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
