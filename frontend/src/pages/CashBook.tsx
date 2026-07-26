import React, { useEffect, useState } from 'react';
import { RefreshCw, TrendingUp, Edit3, Trash2, Printer } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import PrintButton from '../components/PrintButton';
import PrintHeader from '../components/PrintHeader';
import ReceiptModal from '../components/ReceiptModal';
import { fetchCashBook, deleteTransaction, fetchTransaction, fetchOffice } from '../api/client';
import type { CashBookRow, User, Transaction, OfficeMaster } from '../types';
import { CREDIT_BOOK_COLUMNS } from '../types';

const fmt = (v: number) =>
  v === 0 ? <span className="amount-cell zero">—</span> : (
    <span className="amount-cell">₹{Number(v).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
  );

interface CashBookProps {
  user?: User | null;
  onLogout?: () => void;
  onToggleMobileMenu?: () => void;
}

const CashBook: React.FC<CashBookProps> = ({ user, onLogout, onToggleMobileMenu }) => {
  const navigate = useNavigate();
  const today = new Date().toISOString().split('T')[0];
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [rows, setRows] = useState<CashBookRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [office, setOffice] = useState<OfficeMaster | null>(null);
  const [printingTxn, setPrintingTxn] = useState<Transaction | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchCashBook(startDate, endDate, 'CREDIT');
      setRows(data);
    } catch {
      setError('Could not load Credit Book data. Check backend connection.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    fetchOffice().then(setOffice).catch(() => { });
  }, []); // eslint-disable-line

  const handleDelete = async (id: number, memoNo: string) => {
    if (!window.confirm(`Are you sure you want to delete transaction ${memoNo}?`)) return;
    try {
      await deleteTransaction(id);
      loadData();
    } catch {
      alert('Failed to delete transaction.');
    }
  };

  const handleEdit = (id: number) => {
    navigate(`/?edit=${id}`);
  };

  const handlePrintReceipt = async (id: number) => {
    try {
      const txn = await fetchTransaction(id);
      setPrintingTxn(txn);
    } catch {
      alert('Could not load transaction receipt.');
    }
  };

  // Column totals
  const totals = CREDIT_BOOK_COLUMNS.reduce((acc, col) => {
    acc[col.key as string] = rows.reduce((s, r) => s + (Number(r[col.key]) || 0), 0);
    return acc;
  }, {} as Record<string, number>);
  const grandTotal = rows.reduce((s, r) => s + Number(r.total), 0);

  // Stats
  const txnCount = rows.length;
  const uniqueNames = new Set(rows.map(r => r.name)).size;
  const [showAllColumns, setShowAllColumns] = useState(false);
  const [expandedParticularId, setExpandedParticularId] = useState<number | null>(null);

  // Active columns (columns with non-zero amounts in currently displayed rows)
  const activeColumns = CREDIT_BOOK_COLUMNS.filter(col =>
    rows.some(r => Number(r[col.key]) !== 0)
  );

  const visibleColumns = showAllColumns || activeColumns.length === 0 ? CREDIT_BOOK_COLUMNS : activeColumns;

  return (
    <div className="page-container">
      <Header
        title="Credit Book"
        subtitle="Receipts & Credit Transactions · Supp and Sale Society Ltd. Belagavi"
        level={2}
        actions={<PrintButton label="Print Credit Book Sheet" />}
        user={user}
        onLogout={onLogout}
        onToggleMobileMenu={onToggleMobileMenu}
      />

      <div className="page-content">
        {/* Stats */}
        <div className="stat-row no-print">
          <div className="stat-card">
            <div className="stat-label">Credit Transactions</div>
            <div className="stat-value">{txnCount}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Unique Customers</div>
            <div className="stat-value">{uniqueNames}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Total Credit Amount</div>
            <div className="stat-value">₹{grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
          </div>
        </div>

        {/* Filters */}
        <div className="filter-bar no-print">
          <div className="filter-group">
            <span className="filter-label">From</span>
            <input
              id="cb-start"
              type="date"
              className="filter-input"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
            />
          </div>
          <div className="filter-group">
            <span className="filter-label">To</span>
            <input
              id="cb-end"
              type="date"
              className="filter-input"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
            />
          </div>
          <button className="btn btn-primary btn-sm" onClick={loadData} id="cb-refresh">
            <RefreshCw size={14} /> Load Credit Book
          </button>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => { setStartDate(today); setEndDate(today); }}
            id="cb-today"
          >
            Today
          </button>
        </div>

        {/* Print Header Block */}
        <PrintHeader
          documentTitle="C R E D I T   B O O K"
          subTitle={`Receipts & Credit Transactions — ${startDate === endDate ? startDate : `${startDate} to ${endDate}`}`}
        />

        {error && (
          <div className="alert alert-error" style={{ marginBottom: 16 }}>{error}</div>
        )}

        {/* Table */}
        <div className="card">
          {/* Column View Mode Controls */}
          {rows.length > 0 && (
            <div className="no-print" style={{ padding: '12px 20px', borderBottom: '1px solid var(--border-subtle)', background: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 600 }}>
                {visibleColumns.length < CREDIT_BOOK_COLUMNS.length ? (
                  <span>Showing <strong style={{ color: 'var(--blue-700)' }}>{visibleColumns.length} Active Columns</strong> ({CREDIT_BOOK_COLUMNS.length - visibleColumns.length} empty zero columns hidden)</span>
                ) : (
                  <span>Showing All <strong>16 Credit Book Spreadsheet Columns</strong></span>
                )}
              </div>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setShowAllColumns(!showAllColumns)}
                style={{ fontSize: 12, fontWeight: 700 }}
              >
                {showAllColumns ? '👁️ Compact Active Columns' : `↔️ Expand All 16 Columns (${CREDIT_BOOK_COLUMNS.length - visibleColumns.length} Hidden)`}
              </button>
            </div>
          )}

          <div className="table-wrapper">
            {loading ? (
              <div className="loading-overlay">
                <span className="spinner" /> Loading credit book entries…
              </div>
            ) : rows.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon"><TrendingUp /></div>
                <div className="empty-state-title">No credit transactions found</div>
                <div className="empty-state-sub">Enter transactions in the Credit-Debit Account Form (Level 1)</div>
              </div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Customer ID</th>
                    <th>Date</th>
                    <th>L.F No</th>
                    <th>Name</th>
                    <th>Particulars</th>
                    {visibleColumns.map(col => (
                      <th key={col.key}>{col.label}</th>
                    ))}
                    <th>Total</th>
                    <th>Memo No.</th>
                    <th className="no-print">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(row => (
                    <tr key={row.id}>
                      <td style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--blue-700)', fontSize: 12 }}>
                        {row.customer_id || '—'}
                      </td>
                      <td>{new Date(row.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</td>
                      <td>{row.lf_no}</td>
                      <td style={{ maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: 600 }}>{row.name}</td>
                      <td
                        style={{ maxWidth: expandedParticularId === row.id ? 300 : 180, fontSize: 12, cursor: 'pointer' }}
                        onClick={() => setExpandedParticularId(expandedParticularId === row.id ? null : row.id)}
                      >
                        <div style={{
                          whiteSpace: expandedParticularId === row.id ? 'normal' : 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          color: 'var(--text-primary)',
                        }} title={row.particulars || '—'}>
                          {row.particulars || '—'}
                        </div>
                        {row.particulars && row.particulars.length > 25 && (
                          <span style={{ fontSize: 10, color: 'var(--blue-700)', fontWeight: 700, display: 'block', marginTop: 2 }}>
                            {expandedParticularId === row.id ? '▲ Collapse' : '▼ Expand Items'}
                          </span>
                        )}
                      </td>
                      {visibleColumns.map(col => (
                        <td key={col.key} style={{ textAlign: 'right' }}>
                          {fmt(Number(row[col.key]))}
                        </td>
                      ))}
                      <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--text-brand)' }}>
                        ₹{Number(row.total).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{row.cash_memo_no}</td>
                      <td className="no-print" style={{ whiteSpace: 'nowrap' }}>
                        <button
                          type="button"
                          onClick={() => handlePrintReceipt(row.id)}
                          style={{ background: 'none', border: 'none', color: 'var(--blue-600)', cursor: 'pointer', padding: 4, marginRight: 6 }}
                          title="Print Bill Receipt"
                        >
                          <Printer size={15} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleEdit(row.id)}
                          style={{ background: 'none', border: 'none', color: 'var(--blue-600)', cursor: 'pointer', padding: 4, marginRight: 6 }}
                          title="Edit Transaction"
                        >
                          <Edit3 size={15} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(row.id, row.cash_memo_no)}
                          style={{ background: 'none', border: 'none', color: 'var(--red-600)', cursor: 'pointer', padding: 4 }}
                          title="Delete Transaction"
                        >
                          <Trash2 size={15} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={5} style={{ fontWeight: 700 }}>CREDIT TOTALS</td>
                    {visibleColumns.map(col => (
                      <td key={col.key} style={{ textAlign: 'right', fontFamily: 'monospace' }}>
                        {totals[col.key as string] > 0
                          ? `₹${totals[col.key as string].toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
                          : '—'}
                      </td>
                    ))}
                    <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>
                      ₹{grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td />
                    <td className="no-print" />
                  </tr>
                </tfoot>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Printable Receipt Modal */}
      <ReceiptModal
        transaction={printingTxn}
        office={office}
        onClose={() => setPrintingTxn(null)}
      />
    </div>
  );
};

export default CashBook;
