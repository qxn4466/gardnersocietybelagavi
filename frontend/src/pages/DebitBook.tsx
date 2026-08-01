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
import { useTranslation } from '../hooks/useTranslation';
import { useTranslateData } from '../hooks/useTranslateData';

const fmt = (v: number) =>
  v === 0 ? <span className="amount-cell zero">—</span> : (
    <span className="amount-cell" style={{ color: '#b91c1c' }}>₹{Number(v).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
  );

interface DebitBookProps {
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

const DebitBook: React.FC<DebitBookProps> = ({ user, onLogout, onToggleMobileMenu }) => {
  const navigate = useNavigate();
  const { t, lang } = useTranslation();
  const today = new Date().toISOString().split('T')[0];
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [rows, setRows] = useState<CashBookRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [office, setOffice] = useState<OfficeMaster | null>(null);
  const [printingTxn, setPrintingTxn] = useState<Transaction | null>(null);

  // Collect dynamic texts for translation
  const dynamicTexts = [
    ...rows.map(r => r.name),
    ...rows.map(r => r.particulars || '').filter(Boolean),
  ];
  const { tr } = useTranslateData(dynamicTexts);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchCashBook(startDate, endDate, 'DEBIT');
      setRows(data);
    } catch {
      setError(lang === 'mr'
        ? 'नावे वही डेटा लोड होऊ शकला नाही. बॅकएंड कनेक्शन तपासा.'
        : 'Could not load Debit Book data. Check backend connection.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    fetchOffice().then(setOffice).catch(() => {});
  }, []); // eslint-disable-line

  const handleDelete = async (id: number, memoNo: string) => {
    if (!window.confirm(lang === 'mr'
      ? `व्यवहार ${memoNo} हटवायचा आहे का?`
      : `Are you sure you want to delete transaction ${memoNo}?`)) return;
    try {
      await deleteTransaction(id);
      loadData();
    } catch {
      alert(lang === 'mr' ? 'व्यवहार हटवण्यात अयशस्वी.' : 'Failed to delete transaction.');
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
      alert(lang === 'mr' ? 'पावती लोड होऊ शकली नाही.' : 'Could not load transaction receipt.');
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
  const [showAllColumns, setShowAllColumns] = useState(false);
  const [expandedParticularId, setExpandedParticularId] = useState<number | null>(null);

  // Active columns (columns with non-zero amounts in currently displayed rows)
  const activeColumns = DEBIT_BOOK_COLUMNS.filter(col =>
    rows.some(r => Number(r[col.key]) !== 0)
  );

  const visibleColumns = showAllColumns || activeColumns.length === 0 ? DEBIT_BOOK_COLUMNS : activeColumns;

  const getColLabel = (key: string, enLabel: string) =>
    lang === 'mr' ? (COLUMN_LABELS_MR[key] || enLabel) : enLabel;

  return (
    <div className="page-container">
      <Header
        title={t('debitbook_title')}
        subtitle={lang === 'mr'
          ? 'नावे व्यवहार · सप्ल. अँड सेल सोसायटी लि. बेळगाव'
          : 'Payments & Debit Transactions · Supp and Sale Society Ltd. Belgaum'}
        level={2}
        actions={<PrintButton label={lang === 'mr' ? 'नावे वही मुद्रित करा' : 'Print Debit Book Sheet'} />}
        user={user}
        onLogout={onLogout}
        onToggleMobileMenu={onToggleMobileMenu}
      />

      <div className="page-content">
        {/* Stats */}
        <div className="stat-row no-print">
          <div className="stat-card" style={{ borderColor: '#fca5a5', background: '#fff5f5' }}>
            <div className="stat-label" style={{ color: '#991b1b' }}>{lang === 'mr' ? 'नावे व्यवहार' : 'Debit Transactions'}</div>
            <div className="stat-value" style={{ color: '#b91c1c' }}>{txnCount}</div>
          </div>
          <div className="stat-card" style={{ borderColor: '#fca5a5', background: '#fff5f5' }}>
            <div className="stat-label" style={{ color: '#991b1b' }}>{lang === 'mr' ? 'अद्वितीय ग्राहक' : 'Unique Customers'}</div>
            <div className="stat-value" style={{ color: '#b91c1c' }}>{uniqueNames}</div>
          </div>
          <div className="stat-card" style={{ borderColor: '#fca5a5', background: '#fff5f5' }}>
            <div className="stat-label" style={{ color: '#991b1b' }}>{lang === 'mr' ? 'एकूण नावे रक्कम' : 'Total Debit Amount'}</div>
            <div className="stat-value" style={{ color: '#b91c1c' }}>₹{grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="filter-bar no-print">
          <div className="filter-group">
            <span className="filter-label">{t('lbl_from_date')}</span>
            <input id="db-start" type="date" className="filter-input" value={startDate} onChange={e => setStartDate(e.target.value)} />
          </div>
          <div className="filter-group">
            <span className="filter-label">{t('lbl_to_date')}</span>
            <input id="db-end" type="date" className="filter-input" value={endDate} onChange={e => setEndDate(e.target.value)} />
          </div>
          <button className="btn btn-primary btn-sm" onClick={loadData} id="db-refresh" style={{ background: '#b91c1c', borderColor: '#991b1b' }}>
            <RefreshCw size={14} /> {lang === 'mr' ? 'नावे वही लोड करा' : 'Load Debit Book'}
          </button>
          <button className="btn btn-secondary btn-sm" onClick={() => { setStartDate(today); setEndDate(today); }} id="db-today">
            {lang === 'mr' ? 'आज' : 'Today'}
          </button>
        </div>

        {/* Print Header Block */}
        <PrintHeader
          documentTitle={lang === 'mr' ? 'नावे वही' : 'D E B I T   B O O K'}
          subTitle={lang === 'mr'
            ? `नावे व्यवहार — ${startDate === endDate ? startDate : `${startDate} ते ${endDate}`}`
            : `Payments & Debit Transactions — ${startDate === endDate ? startDate : `${startDate} to ${endDate}`}`}
        />

        {error && (
          <div className="alert alert-error" style={{ marginBottom: 16 }}>{error}</div>
        )}

        {/* Table */}
        <div className="card" style={{ borderTop: '4px solid #b91c1c', boxShadow: '0 4px 14px rgba(185, 28, 28, 0.08)' }}>
          {/* Column View Mode Controls */}
          {rows.length > 0 && (
            <div className="no-print" style={{ padding: '12px 20px', borderBottom: '1px solid #fee2e2', background: '#fff5f5', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
              <div style={{ fontSize: 13, color: '#991b1b', fontWeight: 600 }}>
                {visibleColumns.length < DEBIT_BOOK_COLUMNS.length ? (
                  <span>
                    {lang === 'mr'
                      ? <><strong style={{ color: '#b91c1c' }}>{visibleColumns.length} सक्रिय नावे स्तंभ</strong> दाखवत आहे ({DEBIT_BOOK_COLUMNS.length - visibleColumns.length} रिकामे स्तंभ लपवले)</>
                      : <>Showing <strong style={{ color: '#b91c1c' }}>{visibleColumns.length} Active Columns</strong> ({DEBIT_BOOK_COLUMNS.length - visibleColumns.length} empty zero columns hidden)</>}
                  </span>
                ) : (
                  <span>
                    {lang === 'mr'
                      ? <>सर्व <strong>{DEBIT_BOOK_COLUMNS.length} नावे वही स्तंभ</strong> दाखवत आहे</>
                      : <>Showing All <strong>{DEBIT_BOOK_COLUMNS.length} Debit Book Spreadsheet Columns</strong></>}
                  </span>
                )}
              </div>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setShowAllColumns(!showAllColumns)}
                style={{ fontSize: 12, fontWeight: 700, borderColor: '#fca5a5', color: '#991b1b' }}
              >
                {showAllColumns
                  ? (lang === 'mr' ? '👁️ संक्षिप्त स्तंभ' : '👁️ Compact Active Columns')
                  : (lang === 'mr' ? `↔️ सर्व ${DEBIT_BOOK_COLUMNS.length} स्तंभ दाखवा` : `↔️ Expand All Columns (${DEBIT_BOOK_COLUMNS.length - visibleColumns.length} Hidden)`)}
              </button>
            </div>
          )}

          <div className="table-wrapper">
            {loading ? (
              <div className="loading-overlay">
                <span className="spinner" /> {lang === 'mr' ? 'नावे वही लोड होत आहे…' : 'Loading debit book entries…'}
              </div>
            ) : rows.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon"><TrendingDown color="#b91c1c" /></div>
                <div className="empty-state-title">{lang === 'mr' ? 'नावे व्यवहार आढळले नाहीत' : 'No debit transactions found'}</div>
                <div className="empty-state-sub">{lang === 'mr' ? 'जमा-नावे खाते फॉर्म (स्तर १) मध्ये नावे व्यवहार प्रविष्ट करा' : 'Enter transactions in the Credit-Debit Account Form (Level 1)'}</div>
              </div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr style={{ background: '#fef2f2' }}>
                    <th>{t('lbl_customer_id')}</th>
                    <th>{t('lbl_date')}</th>
                    <th>{t('cashbook_lbl_lf_no')}</th>
                    <th>{t('lbl_name')}</th>
                    <th>{t('lbl_particulars')}</th>
                    {visibleColumns.map(col => (
                      <th key={col.key} style={{ color: '#991b1b' }}>{getColLabel(col.key as string, col.label)}</th>
                    ))}
                    <th style={{ color: '#991b1b' }}>{t('lbl_total')}</th>
                    <th>{t('lbl_memo_no')}</th>
                    <th className="no-print">{t('lbl_actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(row => (
                    <tr key={row.id}>
                      <td style={{ fontFamily: 'monospace', fontWeight: 700, color: '#b91c1c', fontSize: 12 }}>
                        {row.customer_id || '—'}
                      </td>
                      <td>{new Date(row.date).toLocaleDateString(lang === 'mr' ? 'mr-IN' : 'en-IN', { day:'2-digit', month:'short' })}</td>
                      <td>{row.lf_no}</td>
                      <td style={{ maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: 600 }}>{tr(row.name)}</td>
                      <td
                        style={{ maxWidth: expandedParticularId === row.id ? 300 : 180, fontSize: 12, cursor: 'pointer' }}
                        onClick={() => setExpandedParticularId(expandedParticularId === row.id ? null : row.id)}
                      >
                        <div style={{
                          whiteSpace: expandedParticularId === row.id ? 'normal' : 'nowrap',
                          overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--text-primary)',
                        }} title={row.particulars || '—'}>
                          {row.particulars ? tr(row.particulars) : '—'}
                        </div>
                        {row.particulars && row.particulars.length > 25 && (
                          <span style={{ fontSize: 10, color: '#b91c1c', fontWeight: 700, display: 'block', marginTop: 2 }}>
                            {expandedParticularId === row.id
                              ? (lang === 'mr' ? '▲ संकुचित करा' : '▲ Collapse')
                              : (lang === 'mr' ? '▼ विस्तारित करा' : '▼ Expand Items')}
                          </span>
                        )}
                      </td>
                      {visibleColumns.map(col => (
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
                    <td colSpan={5} style={{ fontWeight: 700, color: '#991b1b' }}>{lang === 'mr' ? 'नावे एकूण' : 'DEBIT TOTALS'}</td>
                    {visibleColumns.map(col => (
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
