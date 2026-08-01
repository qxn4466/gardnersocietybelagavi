import React, { useEffect } from 'react';
import ReactDOM from 'react-dom';
import { Printer, X, FileText, CheckCircle } from 'lucide-react';
import PrintHeader from './PrintHeader';
import type { Transaction, OfficeMaster } from '../types';
import { useTranslation } from '../hooks/useTranslation';

import { getTxnHeadMarathi } from '../utils/translator';

interface CustomerStatementModalProps {
  isOpen: boolean;
  customerId: string;
  customerName: string;
  startDate: string;
  endDate: string;
  transactions: Transaction[];
  office?: OfficeMaster | null;
  onClose: () => void;
}

const CustomerStatementModal: React.FC<CustomerStatementModalProps> = ({
  isOpen,
  customerId,
  customerName,
  startDate,
  endDate,
  transactions,
  office,
  onClose,
}) => {
  const { lang } = useTranslation();
  useEffect(() => {
    if (isOpen) {
      document.body.classList.add('receipt-open');
    } else {
      document.body.classList.remove('receipt-open');
    }
    return () => { document.body.classList.remove('receipt-open'); };
  }, [isOpen]);

  if (!isOpen) return null;

  const totalAmount = transactions.reduce(
    (sum, t) => sum + Number(t.amount_rs) + Number(t.amount_ps) / 100,
    0
  );

  const handlePrint = () => {
    window.print();
  };

  const modalJSX = (
    <div className="receipt-modal-backdrop" style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 99999, padding: 20,
    }}>
      <div className="printable-receipt-card card" style={{
        background: '#ffffff',
        border: '1px solid #cbd5e1',
        borderRadius: 16,
        width: '100%',
        maxWidth: 850,
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        overflow: 'hidden',
      }}>

        {/* Modal Header Toolbar */}
        <div className="no-print" style={{
          padding: '14px 20px', background: '#f1f5f9',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 8 }}>
            <FileText size={18} color="#2563eb" />
            {lang === 'mr' ? 'ग्राहक मासिक विवरणपत्र' : 'Customer Monthly Statement'} ({customerId || customerName || (lang === 'mr' ? 'सर्व नोंदी' : 'All Records')})
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <button className="btn btn-primary btn-sm" onClick={handlePrint} id="modal-stmt-print-btn">
              <Printer size={15} /> {lang === 'mr' ? 'मासिक विवरणपत्र मुद्रित करा' : 'Print Monthly Statement'}
            </button>
            <button
              onClick={onClose}
              style={{ background: 'none', border: 'none', color: '#64748b', fontSize: 22, cursor: 'pointer', padding: '0 4px' }}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Statement Content */}
        <div className="receipt-print-area" style={{ padding: 28, overflowY: 'auto', flex: 1, background: '#ffffff', color: '#0f172a' }}>

          {/* Header Banner */}
          <PrintHeader
            documentTitle={lang === 'mr' ? 'ग्राहक  मासिक  खाते  विवरणपत्र' : 'C U S T O M E R   M O N T H L Y   A C C O U N T   S T A T E M E N T'}
            subTitle={lang === 'mr' ? `पासबुक विवरणपत्र कालावधी: ${startDate} ते ${endDate}` : `Passbook Statement Period: ${startDate} to ${endDate}`}
          />

          {/* Customer Metadata Bar */}
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14,
            marginBottom: 20, padding: 14, background: '#f8fafc',
            border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 13,
          }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>{lang === 'mr' ? 'ग्राहक आयडी' : 'CUSTOMER ID'}</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#1d4ed8', fontFamily: 'monospace', marginTop: 2 }}>
                {customerId || '—'}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>{lang === 'mr' ? 'ग्राहकाचे नाव' : 'CUSTOMER NAME'}</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', marginTop: 2 }}>
                {customerName || (lang === 'mr' ? 'सर्व ग्राहक' : 'All Customers')}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>{lang === 'mr' ? 'विवरणपत्र कालावधी' : 'STATEMENT PERIOD'}</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', marginTop: 2 }}>
                {startDate} {lang === 'mr' ? 'ते' : 'to'} {endDate}
              </div>
            </div>
          </div>

          {/* Statement Table */}
          <div style={{ border: '1px solid #cbd5e1', borderRadius: 8, overflow: 'hidden', marginBottom: 20 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: '#f1f5f9', borderBottom: '1px solid #cbd5e1' }}>
                  <th style={{ padding: '8px 12px', textAlign: 'left', fontSize: 11, color: '#1e40af', fontWeight: 700 }}>{lang === 'mr' ? 'तारीख' : 'Date'}</th>
                  <th style={{ padding: '8px 12px', textAlign: 'left', fontSize: 11, color: '#1e40af', fontWeight: 700 }}>{lang === 'mr' ? 'मेमो क्र.' : 'Memo No.'}</th>
                  <th style={{ padding: '8px 12px', textAlign: 'left', fontSize: 11, color: '#1e40af', fontWeight: 700 }}>{lang === 'mr' ? 'व्यवहाराचा प्रकार' : 'Transaction Type'}</th>
                  <th style={{ padding: '8px 12px', textAlign: 'left', fontSize: 11, color: '#1e40af', fontWeight: 700 }}>{lang === 'mr' ? 'तपशील' : 'Particulars'}</th>
                  <th style={{ padding: '8px 12px', textAlign: 'center', fontSize: 11, color: '#1e40af', fontWeight: 700 }}>{lang === 'mr' ? 'स्थिती' : 'Status'}</th>
                  <th style={{ padding: '8px 12px', textAlign: 'right', fontSize: 11, color: '#1e40af', fontWeight: 700 }}>{lang === 'mr' ? 'रक्कम (रु.पै)' : 'Amount (Rs.Ps)'}</th>
                </tr>
              </thead>
              <tbody>
                {transactions.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: 30, textAlign: 'center', color: '#64748b' }}>
                      {lang === 'mr' ? 'निवडलेल्या कालावधीत या ग्राहकासाठी कोणतेही व्यवहार आढळले नाहीत.' : 'No transactions found for this customer in the selected period.'}
                    </td>
                  </tr>
                ) : (
                  transactions.map((t, idx) => {
                    const amt = Number(t.amount_rs) + Number(t.amount_ps) / 100;
                    const nature = t.entry_nature || t.transaction_type?.entry_type || 'CREDIT';
                    return (
                      <tr key={t.id} style={{ borderBottom: '1px solid #e2e8f0', background: idx % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
                        <td style={{ padding: '8px 12px', whiteSpace: 'nowrap' }}>{t.date}</td>
                        <td style={{ padding: '8px 12px', fontFamily: 'monospace', fontWeight: 600 }}>{t.cash_memo_no}</td>
                        <td style={{ padding: '8px 12px', fontWeight: 600, color: nature === 'DEBIT' ? '#b91c1c' : '#1d4ed8' }}>
                          {lang === 'mr' ? getTxnHeadMarathi(t.transaction_type?.name) : (t.transaction_type?.name || '—')} ({nature === 'DEBIT' ? (lang === 'mr' ? 'नावे' : 'DEBIT') : (lang === 'mr' ? 'जमा' : 'CREDIT')})
                        </td>
                        <td style={{ padding: '8px 12px', maxWidth: 220, fontSize: 11 }}>{t.particulars || '—'}</td>
                        <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                          <span style={{
                            fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 8,
                            background: t.status === 'POSTED' ? '#dcfce7' : '#fef3c7',
                            color: t.status === 'POSTED' ? '#15803d' : '#b45309',
                          }}>
                            {t.status === 'POSTED' ? (lang === 'mr' ? 'पोस्ट केले' : 'POSTED') : (t.status || 'POSTED')}
                          </span>
                        </td>
                        <td style={{ padding: '8px 12px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, color: '#1d4ed8' }}>
                          ₹ {amt.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
              <tfoot>
                <tr style={{ background: '#eff6ff', borderTop: '2px solid #93c5fd' }}>
                  <td colSpan={5} style={{ padding: '10px 12px', fontWeight: 800, color: '#0f172a', fontSize: 12 }}>
                    {lang === 'mr' ? `विवरणपत्र एकूण रक्कम (${transactions.length} व्यवहार)` : `TOTAL STATEMENT AMOUNT (${transactions.length} Transactions)`}
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 800, fontSize: 16, color: '#1d4ed8' }}>
                    ₹ {totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Footer & Signatures */}
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 20,
            paddingTop: 24, borderTop: '1px dashed #cbd5e1', alignItems: 'end',
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ borderTop: '1px solid #cbd5e1', paddingTop: 4, fontSize: 11, color: '#475569', fontWeight: 600 }}>
                {lang === 'mr' ? 'ग्राहकाची स्वाक्षरी' : 'Signature of Customer'}
              </div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ borderTop: '1px solid #cbd5e1', paddingTop: 4, fontSize: 11, color: '#475569', fontWeight: 600 }}>
                {lang === 'mr' ? 'लेखापाल / अधिकारी' : 'Accountant / Officer'}
              </div>
            </div>
            <div style={{ textAlign: 'center', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: 10 }}>
              <div style={{ fontSize: 10, color: '#1e40af', fontWeight: 700 }}>{lang === 'mr' ? 'विवरणपत्र एकूण' : 'STATEMENT TOTAL'}</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#1d4ed8', fontFamily: 'monospace' }}>
                ₹ {totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );

  return ReactDOM.createPortal(modalJSX, document.body);
};

export default CustomerStatementModal;
