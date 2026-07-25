import React, { useEffect, useState } from 'react';
import { RefreshCw, TrendingDown, Edit3, Trash2, Printer } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import PrintButton from '../components/PrintButton';
import PrintHeader from '../components/PrintHeader';
import ReceiptModal from '../components/ReceiptModal';
import { fetchCashBook, deleteTransaction, fetchTransaction, fetchOffice } from '../api/client';
import type { CashBookRow, User, Transaction, OfficeMaster } from '../types';
import { DEBIT_BOOK_COLUMNS } from '../types';

const fmt = (v: number) =>
  v === 0 ? <span className="amount-cell zero">—</span> : (
    <span className="amount-cell" style={{ color: '#b91c1c' }}>₹{Number(v).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
  );

interface DebitBookProps {
  user?: User | null;
  onLogout?: () => void;
}

const DebitBook: React.FC<DebitBookProps> = ({ user, onLogout }) => {
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
      const data = await fetchCashBook(startDate, endDate, 'DEBIT');
      setRows(data);
    } catch {
      setError('Could not load Debit Book data. Check backend connection.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    fetchOffice().then(setOffice).catch(() => {});
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
  const totals = DEBIT_BOOK_COLUMNS.reduce((acc, col) => {
    acc[col.key as string] = rows.reduce((s, r) => s + (Number(r[col.key]) || 0), 0);
    return acc;
  }, {} as Record<string, number>);
  const grandTotal = rows.reduce((s, r) => s + Number(r.total), 0);

  // Stats
  const txnCount = rows.length;
  const uniqueNames = new Set(rows.map(r => r.name)).size;

  return (
    <div className="page-container">
      <Header
        title="Debit Book"
        subtitle="Payments & Debit Transactions · Supp and Sale Society Ltd. Belagavi"
        level={2}
        actions={<PrintButton label="Print Debit Book Sheet" />}
        user={user}
        onLogout={onLogout}
      />

      <div className="page-content">
        {/* Stats */}
        <div className="stat-row no-print">
          <div className="stat-card" style={{ borderColor: '#fca5a5', background: '#fff5f5' }}>
            <div className="stat-label" style={{ color: '#991b1b' }}>Debit Transactions</div>
            <div className="stat-value" style={{ color: '#b91c1c' }}>{txnCount}</div>
          </div>
          <div className="stat-card" style={{ borderColor: '#fca5a5', background: '#fff5f5' }}>
            <div className="stat-label" style={{ color: '#991b1b' }}>Unique Customers</div>
            <div className="stat-value" style={{ color: '#b91c1c' }}>{uniqueNames}</div>
          </div>
          <div className="stat-card" style={{ borderColor: '#fca5a5', background: '#fff5f5' }}>
            <div className="stat-label" style={{ color: '#991b1b' }}>Total Debit Amount</div>
            <div className="stat-value" style={{ color: '#b91c1c' }}>₹{grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="filter-bar no-print">
          <div className="filter-group">
            <span className="filter-label">From</span>
            <input
              id="db-start"
              type="date"
              className="filter-input"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
            />
          </div>
          <div className="filter-group">
            <span className="filter-label">To</span>
            <input
              id="db-end"
              type="date"
              className="filter-input"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
            />
          </div>
          <button className="btn btn-primary btn-sm" onClick={loadData} id="db-refresh" style={{ background: '#b91c1c', borderColor: '#991b1b' }}>
            <RefreshCw size={14} /> Load Debit Book
          </button>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => { setStartDate(today); setEndDate(today); }}
            id="db-today"
          >
            Today
          </button>
        </div>

        {/* Print Header Block */}
        <PrintHeader
          documentTitle="D E B I T   B O O K"
          subTitle={`Payments & Debit Transactions — ${startDate === endDate ? startDate : `${startDate} to ${endDate}`}`}
        />

        {error && (
          <div className="alert alert-error" style={{ marginBottom: 16 }}>{error}</div>
        )}

        {/* Table */}
        <div className="card">
          <div className="table-wrapper">
            {loading ? (
              <div className="loading-overlay">
                <span className="spinner" /> Loading debit book entries…
              </div>
            ) : rows.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon"><TrendingDown color="#b91c1c" /></div>
                <div className="empty-state-title">No debit transactions found</div>
                <div className="empty-state-sub">Enter transactions in the Credit-Debit Account Form (Level 1)</div>
              </div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr style={{ background: '#fef2f2' }}>
                    <th>Date</th>
                    <th>L.F No</th>
                    <th>Name</th>
                    {DEBIT_BOOK_COLUMNS.map(col => (
                      <th key={col.key} style={{ color: '#991b1b' }}>{col.label}</th>
                    ))}
                    <th style={{ color: '#991b1b' }}>Total</th>
                    <th>Memo No.</th>
                    <th className="no-print">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(row => (
                    <tr key={row.id}>
                      <td>{new Date(row.date).toLocaleDateString('en-IN', { day:'2-digit', month:'short' })}</td>
                      <td>{row.lf_no}</td>
                      <td style={{ maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis' }}>{row.name}</td>
                      {DEBIT_BOOK_COLUMNS.map(col => (
                        <td key={col.key} style={{ textAlign: 'right' }}>
                          {fmt(Number(row[col.key]))}
                        </td>
                      ))}
                      <td style={{ textAlign: 'right', fontWeight: 700, color: '#b91c1c' }}>
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
                  <tr style={{ background: '#fff5f5', borderTop: '2px solid #fca5a5' }}>
                    <td colSpan={3} style={{ fontWeight: 700, color: '#991b1b' }}>DEBIT TOTALS</td>
                    {DEBIT_BOOK_COLUMNS.map(col => (
                      <td key={col.key} style={{ textAlign: 'right', fontFamily: 'monospace', color: '#991b1b', fontWeight: 700 }}>
                        {totals[col.key as string] > 0
                          ? `₹${totals[col.key as string].toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
                          : '—'}
                      </td>
                    ))}
                    <td style={{ textAlign: 'right', fontFamily: 'monospace', color: '#b91c1c', fontWeight: 800 }}>
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

export default DebitBook;
