import React, { useEffect, useState } from 'react';
import { RefreshCw, BookMarked } from 'lucide-react';
import Header from '../components/Header';
import PrintButton from '../components/PrintButton';
import PrintHeader from '../components/PrintHeader';
import { fetchLedger, fetchAccounts } from '../api/client';
import type { LedgerRow, AccountMaster, User } from '../types';
import { useTranslation } from '../hooks/useTranslation';

const months = [
  '', 'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const monthsMr = [
  '', 'जानेवारी', 'फेब्रुवारी', 'मार्च', 'एप्रिल', 'मे', 'जून',
  'जुलै', 'ऑगस्ट', 'सप्टेंबर', 'ऑक्टोबर', 'नोव्हेंबर', 'डिसेंबर'
];

const fmtAmt = (v: number) =>
  v === 0 ? '—' : `₹${Number(v).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

interface GeneralLedgerProps {
  user?: User | null;
  onLogout?: () => void;
  onToggleMobileMenu?: () => void;
}

const GeneralLedger: React.FC<GeneralLedgerProps> = ({ user, onLogout, onToggleMobileMenu }) => {
  const { t, lang } = useTranslation();
  const now = new Date();
  const [month, setMonth] = useState<string>(String(now.getMonth() + 1));
  const [year, setYear] = useState<string>(String(now.getFullYear()));
  const [account, setAccount] = useState<string>('');
  const [rows, setRows] = useState<LedgerRow[]>([]);
  const [accounts, setAccounts] = useState<AccountMaster[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const monthNames = lang === 'mr' ? monthsMr : months;

  useEffect(() => {
    fetchAccounts().then(setAccounts).catch(() => {});
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchLedger(
        month ? parseInt(month) : undefined,
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
  };

  useEffect(() => { loadData(); }, []); // eslint-disable-line

  // Totals
  const totalReceipt = rows.reduce((s, r) => s + Number(r.receipt), 0);
  const totalDebit   = rows.reduce((s, r) => s + Number(r.debit), 0);
  const totalPayable = rows.reduce((s, r) => s + Number(r.payable), 0);
  const totalRcv     = rows.reduce((s, r) => s + Number(r.receivable), 0);

  // Year options: current year ± 5
  const yearOptions = Array.from({ length: 10 }, (_, i) => now.getFullYear() - 5 + i);

  return (
    <div className="page-container">
      <Header
        title={t('ledger_title')}
        subtitle={lang === 'mr'
          ? 'बेळगाव गार्डनर्स को-ऑप उत्पादन'
          : 'The Belagavi Gardeners Co-Op Production'}
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
            <div className="stat-label">{lang === 'mr' ? 'एकूण जमा' : 'Total Receipt'}</div>
            <div className="stat-value">₹{totalReceipt.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">{lang === 'mr' ? 'एकूण नावे' : 'Total Debit'}</div>
            <div className="stat-value">₹{totalDebit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">{lang === 'mr' ? 'एकूण देणे' : 'Total Payable'}</div>
            <div className="stat-value">₹{totalPayable.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">{lang === 'mr' ? 'एकूण घेणे' : 'Total Receivable'}</div>
            <div className="stat-value">₹{totalRcv.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="filter-bar no-print">
          <div className="filter-group">
            <span className="filter-label">{t('lbl_month')}</span>
            <select
              id="ledger-month"
              className="filter-select"
              value={month}
              onChange={e => setMonth(e.target.value)}
            >
              <option value="">{lang === 'mr' ? 'सर्व महिने' : 'All Months'}</option>
              {monthNames.slice(1).map((m, i) => (
                <option key={i+1} value={String(i+1)}>{m}</option>
              ))}
            </select>
          </div>
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
                <option key={a.id} value={a.account_name}>{a.account_name}</option>
              ))}
            </select>
          </div>
          <button className="btn btn-primary btn-sm" onClick={loadData} id="ledger-refresh">
            <RefreshCw size={14} /> {lang === 'mr' ? 'लोड करा' : 'Load'}
          </button>
        </div>

        {/* Print Header Block */}
        <PrintHeader
          documentTitle={lang === 'mr' ? 'सर्वसाधारण खातेवही' : 'G E N E R A L   L E D G E R'}
          subTitle={lang === 'mr'
            ? (account
                ? `खाते फिल्टर: ${account} | महिना: ${month ? monthsMr[parseInt(month)] : 'सर्व'} ${year}`
                : `मासिक शिल्लक पत्रक — ${month ? monthsMr[parseInt(month)] : 'सर्व'} ${year}`)
            : (account
                ? `A/C Account Filter: ${account} | Month: ${month ? months[parseInt(month)] : 'All'} ${year}`
                : `Monthly Balance Sheet — ${month ? months[parseInt(month)] : 'All'} ${year}`)}
        />

        {error && (
          <div className="alert alert-error" style={{ marginBottom: 16 }}>{error}</div>
        )}

        {/* Table */}
        <div className="card">
          <div className="table-wrapper">
            {loading ? (
              <div className="loading-overlay">
                <span className="spinner" /> {lang === 'mr' ? 'खातेवही लोड होत आहे…' : 'Loading ledger…'}
              </div>
            ) : rows.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon"><BookMarked /></div>
                <div className="empty-state-title">{lang === 'mr' ? 'खातेवही नोंदी आढळल्या नाहीत' : 'No ledger entries found'}</div>
                <div className="empty-state-sub">{lang === 'mr' ? 'महिना/वर्ष फिल्टर बदला किंवा स्तर १ मध्ये व्यवहार प्रविष्ट करा' : 'Adjust the month/year filter or enter transactions via Level 1'}</div>
              </div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>{t('ledger_lbl_month_year')}</th>
                    <th>{lang === 'mr' ? 'खाते नाव' : 'A/C Name'}</th>
                    <th style={{ textAlign: 'right' }}>{t('lbl_receipt')}</th>
                    <th style={{ textAlign: 'right' }}>{t('lbl_debit')}</th>
                    <th style={{ textAlign: 'right' }}>{t('ledger_lbl_payable')}</th>
                    <th style={{ textAlign: 'right' }}>{t('ledger_lbl_receivable')}</th>
                    <th>{t('lbl_remarks')}</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, idx) => (
                    <tr key={idx}>
                      <td style={{ fontWeight: 600 }}>{row.month_year_label}</td>
                      <td style={{ color: 'var(--text-brand)', fontWeight: 500 }}>{row.account}</td>
                      <td style={{ textAlign: 'right', fontFamily: 'monospace', color: Number(row.receipt) > 0 ? 'var(--blue-400)' : 'var(--text-muted)' }}>
                        {fmtAmt(Number(row.receipt))}
                      </td>
                      <td style={{ textAlign: 'right', fontFamily: 'monospace', color: Number(row.debit) > 0 ? '#f87171' : 'var(--text-muted)' }}>
                        {fmtAmt(Number(row.debit))}
                      </td>
                      <td style={{ textAlign: 'right', fontFamily: 'monospace', color: Number(row.payable) > 0 ? '#fbbf24' : 'var(--text-muted)' }}>
                        {fmtAmt(Number(row.payable))}
                      </td>
                      <td style={{ textAlign: 'right', fontFamily: 'monospace', color: Number(row.receivable) > 0 ? '#60a5fa' : 'var(--text-muted)' }}>
                        {fmtAmt(Number(row.receivable))}
                      </td>
                      <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{row.remarks ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={2} style={{ fontWeight: 700 }}>{lang === 'mr' ? 'एकूण' : 'TOTALS'}</td>
                    <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>{fmtAmt(totalReceipt)}</td>
                    <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>{fmtAmt(totalDebit)}</td>
                    <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>{fmtAmt(totalPayable)}</td>
                    <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>{fmtAmt(totalRcv)}</td>
                    <td />
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
