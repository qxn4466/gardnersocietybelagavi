import React, { useEffect, useState, useCallback } from 'react';
import { RefreshCw, BookMarked, TrendingUp, TrendingDown, ArrowRightLeft, Wallet } from 'lucide-react';
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

interface GeneralLedgerProps {
  user?: User | null;
  onLogout?: () => void;
  onToggleMobileMenu?: () => void;
}

const GeneralLedger: React.FC<GeneralLedgerProps> = ({ user, onLogout, onToggleMobileMenu }) => {
  const { t, lang } = useTranslation();
  const now = new Date();
  const [year, setYear] = useState<string>(String(now.getFullYear()));
  const [account, setAccount] = useState<string>('');
  const [rows, setRows] = useState<LedgerRow[]>([]);
  const [accounts, setAccounts] = useState<AccountMaster[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  // Auto-load on filter change
  useEffect(() => { loadData(); }, [loadData]);

  // Aggregate totals
  const totalReceipt  = rows.reduce((s, r) => s + Number(r.receipt), 0);
  const totalDebit    = rows.reduce((s, r) => s + Number(r.debit), 0);
  const totalPayable  = rows.reduce((s, r) => s + Number(r.payable), 0);
  const totalRcv      = rows.reduce((s, r) => s + Number(r.receivable), 0);
  const netBalance    = totalReceipt - totalDebit;

  // Group rows by month for a collapsed monthly view
  type MonthGroup = {
    mo: number;
    yr: number;
    label: string;
    entries: LedgerRow[];
    creditTotal: number;
    debitTotal: number;
  };

  const monthGroups: MonthGroup[] = [];
  const seen = new Map<string, MonthGroup>();
  for (const r of rows) {
    const key = `${r.year}-${r.month}`;
    if (!seen.has(key)) {
      const grp: MonthGroup = {
        mo: r.month,
        yr: r.year,
        label: r.month_year_label,
        entries: [],
        creditTotal: 0,
        debitTotal: 0,
      };
      seen.set(key, grp);
      monthGroups.push(grp);
    }
    const grp = seen.get(key)!;
    grp.entries.push(r);
    grp.creditTotal += Number(r.receipt);
    grp.debitTotal  += Number(r.debit);
  }

  const [expandedMonth, setExpandedMonth] = useState<string | null>(null);

  const yearOptions = Array.from({ length: 10 }, (_, i) => now.getFullYear() - 5 + i);

  return (
    <div className="page-container">
      <Header
        title={t('ledger_title')}
        subtitle={lang === 'mr'
          ? 'बेळगाव गार्डनर्स को-ऑप उत्पादन · सर्वसाधारण खातेवही'
          : 'The Belgaum Gardeners Co-Op Production · General Ledger'}
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
              {lang === 'mr' ? 'एकूण जमा (Credit)' : 'Total Receipts (Credit)'}
            </div>
            <div className="stat-value" style={{ color: '#15803d' }}>
              ₹{totalReceipt.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-label" style={{ color: '#b91c1c' }}>
              <TrendingDown size={14} style={{ display: 'inline', marginRight: 4 }} />
              {lang === 'mr' ? 'एकूण नावे (Debit)' : 'Total Payments (Debit)'}
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
              {netBalance >= 0 ? '+' : ''}₹{Math.abs(netBalance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-label">
              <Wallet size={14} style={{ display: 'inline', marginRight: 4 }} />
              {lang === 'mr' ? 'एकूण देणे / घेणे' : 'Payable / Receivable'}
            </div>
            <div className="stat-value" style={{ fontSize: 15 }}>
              <span style={{ color: '#f59e0b' }}>₹{totalPayable.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              {' / '}
              <span style={{ color: '#0284c7' }}>₹{totalRcv.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="filter-bar no-print">
          <div className="filter-group">
            <span className="filter-label">{t('lbl_year')}</span>
            <select
              id="ledger-year"
              className="filter-select"
              value={year}
              onChange={e => setYear(e.target.value)}
            >
              <option value="">{lang === 'mr' ? 'सर्व वर्षे' : 'All Years'}</option>
              {yearOptions.map(y => (
                <option key={y} value={String(y)}>{y}</option>
              ))}
            </select>
          </div>
          <div className="filter-group">
            <span className="filter-label">{t('ledger_lbl_account')}</span>
            <select
              id="ledger-account"
              className="filter-select"
              value={account}
              onChange={e => setAccount(e.target.value)}
              style={{ minWidth: 200 }}
            >
              <option value="">{lang === 'mr' ? 'सर्व खाती' : 'All Accounts'}</option>
              {accounts.map(a => (
                <option key={a.id} value={a.account_name}>
                  {lang === 'mr' ? getTxnHeadMarathi(a.account_name) : a.account_name}
                </option>
              ))}
            </select>
          </div>
          <button className="btn btn-primary btn-sm" onClick={loadData} id="ledger-refresh">
            <RefreshCw size={14} /> {lang === 'mr' ? 'लोड करा' : 'Refresh'}
          </button>
        </div>

        {/* Print Header Block */}
        <PrintHeader
          documentTitle={lang === 'mr' ? 'सर्वसाधारण खातेवही' : 'G E N E R A L   L E D G E R'}
          subTitle={lang === 'mr'
            ? (account
                ? `खाते: ${getTxnHeadMarathi(account)} | वर्ष: ${year || 'सर्व'}`
                : `वार्षिक शिल्लक — ${year ? `वर्ष ${year}` : 'सर्व वर्षे'}`)
            : (account
                ? `Account: ${account} | Year: ${year || 'All'}`
                : `Yearly Balance Sheet — ${year ? `Year ${year}` : 'All Years'}`)}
        />

        {error && (
          <div className="alert alert-error" style={{ marginBottom: 16 }}>{error}</div>
        )}

        {/* Table */}
        <div className="card" style={{ borderTop: '4px solid #4f46e5', boxShadow: '0 4px 16px rgba(79, 70, 229, 0.09)' }}>
          <div className="table-wrapper">
            {loading ? (
              <div className="loading-overlay">
                <span className="spinner" /> {lang === 'mr' ? 'खातेवही लोड होत आहे…' : 'Loading ledger…'}
              </div>
            ) : rows.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon"><BookMarked /></div>
                <div className="empty-state-title">
                  {lang === 'mr' ? 'खातेवही नोंदी आढळल्या नाहीत' : 'No ledger entries found'}
                </div>
                <div className="empty-state-sub">
                  {lang === 'mr'
                    ? 'वर्ष फिल्टर बदला किंवा क्रेडिट/डेबिट फॉर्ममध्ये व्यवहार प्रविष्ट करा'
                    : 'Change the year filter or enter transactions via the Credit/Debit Form'}
                </div>
              </div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ minWidth: 130 }}>{t('ledger_lbl_month_year')}</th>
                    <th style={{ minWidth: 200 }}>{lang === 'mr' ? 'खाते / व्यवहार प्रकार' : 'Account / Type'}</th>
                    <th style={{ textAlign: 'right', color: '#15803d', minWidth: 120 }}>
                      {lang === 'mr' ? 'जमा (Receipt)' : 'Credit / Receipt'}
                    </th>
                    <th style={{ textAlign: 'right', color: '#b91c1c', minWidth: 120 }}>
                      {lang === 'mr' ? 'नावे (Payment)' : 'Debit / Payment'}
                    </th>
                    <th style={{ textAlign: 'right', color: '#f59e0b', minWidth: 110 }}>
                      {t('ledger_lbl_payable')}
                    </th>
                    <th style={{ textAlign: 'right', color: '#0284c7', minWidth: 110 }}>
                      {t('ledger_lbl_receivable')}
                    </th>
                    <th style={{ minWidth: 80 }}>{lang === 'mr' ? 'शिल्लक' : 'Balance'}</th>
                  </tr>
                </thead>
                <tbody>
                  {monthGroups.map(grp => {
                    const key   = `${grp.yr}-${grp.mo}`;
                    const isOpen = expandedMonth === key;
                    const balance = grp.creditTotal - grp.debitTotal;

                    return (
                      <React.Fragment key={key}>
                        {/* Month summary row */}
                        <tr
                          onClick={() => setExpandedMonth(isOpen ? null : key)}
                          style={{
                            cursor: 'pointer',
                            background: isOpen ? 'var(--bg-elevated)' : undefined,
                            fontWeight: 700,
                          }}
                        >
                          <td style={{ fontWeight: 800, color: 'var(--text-brand)', fontSize: 13 }}>
                            {lang === 'mr'
                              ? `${MONTH_NAMES_MR[grp.mo]} ${grp.yr}`
                              : `${MONTH_NAMES[grp.mo]} ${grp.yr}`}
                            <span style={{ fontSize: 10, marginLeft: 6, color: 'var(--text-muted)', fontWeight: 400 }}>
                              {isOpen ? '▲' : '▼'} ({grp.entries.length} {lang === 'mr' ? 'खाती' : 'accounts'})
                            </span>
                          </td>
                          <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                            {lang === 'mr' ? 'मासिक एकूण' : 'Monthly Total'}
                          </td>
                          <td style={{ textAlign: 'right', fontFamily: 'monospace', color: '#15803d', fontWeight: 800 }}>
                            {grp.creditTotal > 0 ? fmt(grp.creditTotal) : '—'}
                          </td>
                          <td style={{ textAlign: 'right', fontFamily: 'monospace', color: '#b91c1c', fontWeight: 800 }}>
                            {grp.debitTotal > 0 ? fmt(grp.debitTotal) : '—'}
                          </td>
                          <td />
                          <td />
                          <td style={{
                            textAlign: 'right', fontFamily: 'monospace', fontWeight: 800,
                            color: balance >= 0 ? '#1d4ed8' : '#b91c1c', fontSize: 12
                          }}>
                            {balance >= 0 ? '+' : ''}{fmt(Math.abs(balance))}
                          </td>
                        </tr>
                        {/* Expanded account detail rows */}
                        {isOpen && grp.entries.map((row, idx) => (
                          <tr key={idx} style={{ background: 'var(--bg-subtle, #f8fafc)', fontSize: 13 }}>
                            <td style={{ paddingLeft: 28, color: 'var(--text-muted)', fontStyle: 'italic', fontSize: 12 }}>
                              └ {lang === 'mr'
                                ? `${MONTH_NAMES_MR[grp.mo]} ${grp.yr}`
                                : `${MONTH_NAMES[grp.mo]} ${grp.yr}`}
                            </td>
                            <td style={{ color: 'var(--text-brand)', fontWeight: 600 }}>
                              {lang === 'mr' ? getTxnHeadMarathi(row.account) : row.account}
                            </td>
                            <td style={{ textAlign: 'right', fontFamily: 'monospace', color: Number(row.receipt) > 0 ? '#15803d' : 'var(--text-muted)' }}>
                              {fmt(Number(row.receipt))}
                            </td>
                            <td style={{ textAlign: 'right', fontFamily: 'monospace', color: Number(row.debit) > 0 ? '#b91c1c' : 'var(--text-muted)' }}>
                              {fmt(Number(row.debit))}
                            </td>
                            <td style={{ textAlign: 'right', fontFamily: 'monospace', color: Number(row.payable) > 0 ? '#f59e0b' : 'var(--text-muted)' }}>
                              {fmt(Number(row.payable))}
                            </td>
                            <td style={{ textAlign: 'right', fontFamily: 'monospace', color: Number(row.receivable) > 0 ? '#0284c7' : 'var(--text-muted)' }}>
                              {fmt(Number(row.receivable))}
                            </td>
                            <td style={{ textAlign: 'right', fontFamily: 'monospace', fontSize: 12, color: 'var(--text-muted)' }}>
                              {row.remarks ?? '—'}
                            </td>
                          </tr>
                        ))}
                      </React.Fragment>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr style={{ background: 'var(--bg-elevated)', fontWeight: 800, borderTop: '2px solid var(--border-color)' }}>
                    <td colSpan={2} style={{ fontWeight: 800, fontSize: 14 }}>
                      {lang === 'mr' ? `वार्षिक एकूण — ${year || 'सर्व वर्षे'}` : `YEARLY TOTAL — ${year || 'All Years'}`}
                    </td>
                    <td style={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: 800, fontSize: 14, color: '#15803d' }}>
                      {fmt(totalReceipt)}
                    </td>
                    <td style={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: 800, fontSize: 14, color: '#b91c1c' }}>
                      {fmt(totalDebit)}
                    </td>
                    <td style={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: 800, color: '#f59e0b' }}>
                      {fmt(totalPayable)}
                    </td>
                    <td style={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: 800, color: '#0284c7' }}>
                      {fmt(totalRcv)}
                    </td>
                    <td style={{
                      textAlign: 'right', fontFamily: 'monospace', fontWeight: 800, fontSize: 14,
                      color: netBalance >= 0 ? '#1d4ed8' : '#b91c1c'
                    }}>
                      {netBalance >= 0 ? '+' : ''}{fmt(Math.abs(netBalance))}
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
