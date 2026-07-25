import React, { useEffect, useState } from 'react';
import { RefreshCw, BookMarked } from 'lucide-react';
import Header from '../components/Header';
import PrintButton from '../components/PrintButton';
import PrintHeader from '../components/PrintHeader';
import { fetchLedger, fetchAccounts } from '../api/client';
import type { LedgerRow, AccountMaster, User } from '../types';

const months = [
  '', 'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const fmtAmt = (v: number) =>
  v === 0 ? '—' : `₹${Number(v).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

interface GeneralLedgerProps {
  user?: User | null;
  onLogout?: () => void;
}

const GeneralLedger: React.FC<GeneralLedgerProps> = ({ user, onLogout }) => {
  const now = new Date();
  const [month, setMonth] = useState<string>(String(now.getMonth() + 1));
  const [year, setYear] = useState<string>(String(now.getFullYear()));
  const [account, setAccount] = useState<string>('');
  const [rows, setRows] = useState<LedgerRow[]>([]);
  const [accounts, setAccounts] = useState<AccountMaster[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      setError('Could not load Ledger data. Check backend connection.');
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
        title="General Ledger"
        subtitle="The Belagavi Gardeners Co-Op Production"
        level={3}
        actions={<PrintButton label="Print Ledger" />}
        user={user}
        onLogout={onLogout}
      />

      <div className="page-content">
        {/* Stats */}
        <div className="stat-row no-print">
          <div className="stat-card">
            <div className="stat-label">Total Receipt</div>
            <div className="stat-value">₹{totalReceipt.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Total Debit</div>
            <div className="stat-value">₹{totalDebit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Total Payable</div>
            <div className="stat-value">₹{totalPayable.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Total Receivable</div>
            <div className="stat-value">₹{totalRcv.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="filter-bar no-print">
          <div className="filter-group">
            <span className="filter-label">Month</span>
            <select
              id="ledger-month"
              className="filter-select"
              value={month}
              onChange={e => setMonth(e.target.value)}
            >
              <option value="">All Months</option>
              {months.slice(1).map((m, i) => (
                <option key={i+1} value={String(i+1)}>{m}</option>
              ))}
            </select>
          </div>
          <div className="filter-group">
            <span className="filter-label">Year</span>
            <select
              id="ledger-year"
              className="filter-select"
              value={year}
              onChange={e => setYear(e.target.value)}
            >
              <option value="">All Years</option>
              {yearOptions.map(y => (
                <option key={y} value={String(y)}>{y}</option>
              ))}
            </select>
          </div>
          <div className="filter-group">
            <span className="filter-label">Account</span>
            <select
              id="ledger-account"
              className="filter-select"
              value={account}
              onChange={e => setAccount(e.target.value)}
              style={{ minWidth: 200 }}
            >
              <option value="">All Accounts</option>
              {accounts.map(a => (
                <option key={a.id} value={a.account_name}>{a.account_name}</option>
              ))}
            </select>
          </div>
          <button className="btn btn-primary btn-sm" onClick={loadData} id="ledger-refresh">
            <RefreshCw size={14} /> Load
          </button>
        </div>

        {/* Print Header Block */}
        <PrintHeader
          documentTitle="G E N E R A L   L E D G E R"
          subTitle={
            account ? `A/C Account Filter: ${account} | Month: ${month ? months[parseInt(month)] : 'All'} ${year}` : `Monthly Balance Sheet — ${month ? months[parseInt(month)] : 'All'} ${year}`
          }
        />

        {error && (
          <div className="alert alert-error" style={{ marginBottom: 16 }}>{error}</div>
        )}

        {/* Table */}
        <div className="card">
          <div className="table-wrapper">
            {loading ? (
              <div className="loading-overlay">
                <span className="spinner" /> Loading ledger…
              </div>
            ) : rows.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon"><BookMarked /></div>
                <div className="empty-state-title">No ledger entries found</div>
                <div className="empty-state-sub">Adjust the month/year filter or enter transactions via Level 1</div>
              </div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Month &amp; Year</th>
                    <th>A/C Name</th>
                    <th style={{ textAlign: 'right' }}>Receipt</th>
                    <th style={{ textAlign: 'right' }}>Debit</th>
                    <th style={{ textAlign: 'right' }}>Payable</th>
                    <th style={{ textAlign: 'right' }}>Receivable</th>
                    <th>Remarks</th>
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
                    <td colSpan={2} style={{ fontWeight: 700 }}>TOTALS</td>
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
