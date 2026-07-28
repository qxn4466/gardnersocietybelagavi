import React from 'react';
import ReactDOM from 'react-dom';
import { Printer, X, CheckCircle } from 'lucide-react';
import PrintHeader from './PrintHeader';
import type { Transaction, OfficeMaster } from '../types';
import { useTranslation } from '../hooks/useTranslation';

// ─── Indian Currency Words Helper ─────────────────────────────────────────────
const ONES = [
  '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
  'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
  'Seventeen', 'Eighteen', 'Nineteen',
];
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

function twoDigitWords(n: number): string {
  if (n < 20) return ONES[n];
  return (TENS[Math.floor(n / 10)] + (n % 10 ? ' ' + ONES[n % 10] : '')).trim();
}

function numberToWords(n: number): string {
  if (n === 0) return 'Zero';
  if (n < 0) return 'Minus ' + numberToWords(-n);
  const parts: string[] = [];
  const crore = Math.floor(n / 10_000_000);
  n %= 10_000_000;
  const lakh = Math.floor(n / 100_000);
  n %= 100_000;
  const thousand = Math.floor(n / 1_000);
  n %= 1_000;
  const hundred = Math.floor(n / 100);
  const remainder = n % 100;
  if (crore)    parts.push(twoDigitWords(crore)    + ' Crore');
  if (lakh)     parts.push(twoDigitWords(lakh)     + ' Lakh');
  if (thousand) parts.push(twoDigitWords(thousand) + ' Thousand');
  if (hundred)  parts.push(ONES[hundred]           + ' Hundred');
  if (remainder) parts.push(twoDigitWords(remainder));
  return parts.join(' ');
}

function amountToWords(total: number): string {
  if (!total || isNaN(total)) return '';
  const rs = Math.floor(total);
  const ps = Math.round((total - rs) * 100);
  const rsWords = rs > 0 ? numberToWords(rs) + ' Rupees' : '';
  const psWords = ps > 0 ? numberToWords(ps) + ' Paise' : '';
  if (rsWords && psWords) return rsWords + ' and ' + psWords + ' Only';
  if (rsWords) return rsWords + ' Only';
  if (psWords) return psWords + ' Only';
  return 'Zero Rupees Only';
}

interface ReceiptModalProps {
  transaction: Transaction | null;
  office?: OfficeMaster | null;
  onClose: () => void;
}

const ReceiptModal: React.FC<ReceiptModalProps> = ({ transaction, office, onClose }) => {
  const { lang } = useTranslation();
  React.useEffect(() => {
    if (transaction) {
      document.body.classList.add('receipt-open');
    } else {
      document.body.classList.remove('receipt-open');
    }
    return () => { document.body.classList.remove('receipt-open'); };
  }, [transaction]);

  if (!transaction) return null;

  const totalAmt = Number(transaction.amount_rs) + Number(transaction.amount_ps) / 100;
  const rsPart = Math.floor(totalAmt);
  const psPart = Math.round((totalAmt - rsPart) * 100);

  // Parse itemized particulars
  const rawParts = transaction.particulars ? transaction.particulars.split(' — ')[0].split(' | ') : [];
  const parsedItems = rawParts.map(pStr => {
    const colonIdx = pStr.indexOf(': Rs.');
    if (colonIdx !== -1) {
      const desc = pStr.substring(0, colonIdx).trim();
      const amtStr = pStr.substring(colonIdx + 5).trim();
      const [rsStr, psStr] = amtStr.split('.');
      return { desc, rs: rsStr || '0', ps: psStr || '00' };
    }
    return { desc: pStr, rs: String(Math.floor(totalAmt)), ps: String(psPart).padStart(2, '0') };
  });

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
      {/* Printable Receipt Container */}
      <div className="printable-receipt-card card" style={{
        background: '#ffffff',
        border: '1px solid #cbd5e1',
        borderRadius: 16,
        width: '100%',
        maxWidth: 720,
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        overflow: 'hidden',
      }}>

        {/* Modal Toolbar (hidden during print) */}
        <div className="no-print" style={{
          padding: '14px 20px', background: '#f1f5f9',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 8 }}>
            <CheckCircle size={18} color="#2563eb" />
            {lang === 'mr' ? 'रोख मेमो पावती पूर्वावलोकन' : 'Cash Memo Receipt Preview'} ({transaction.cash_memo_no})
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <button className="btn btn-primary btn-sm" onClick={handlePrint} id="modal-print-btn">
              <Printer size={15} /> {lang === 'mr' ? 'पावती मुद्रित करा' : 'Print Receipt'}
            </button>
            <button
              onClick={onClose}
              style={{ background: 'none', border: 'none', color: '#64748b', fontSize: 22, cursor: 'pointer', padding: '0 4px' }}
              title="Close Preview"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Receipt Content Area */}
        <div className="receipt-print-area" style={{ padding: 28, overflowY: 'auto', flex: 1, background: '#ffffff', color: '#0f172a' }}>

          {/* Org Banner Header */}
          <PrintHeader
            documentTitle={lang === 'mr' ? 'रोख  मेमो  पावती' : 'C A S H   M E M O   R E C E I P T'}
            subTitle={lang === 'mr' ? `रोख मेमो क्र: ${transaction.cash_memo_no}` : `Cash Memo No: ${transaction.cash_memo_no}`}
          />

          {/* Transaction Metadata Grid */}
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14,
            marginBottom: 20, padding: 14, background: '#f8fafc',
            border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 13,
          }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>{lang === 'mr' ? 'खातेधारकाचे नाव' : 'ACCOUNT HOLDER NAME'}</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', marginTop: 2 }}>{transaction.customer_name}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>{lang === 'mr' ? 'व्यवहाराची तारीख' : 'TRANSACTION DATE'}</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', marginTop: 2 }}>{transaction.date}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>{lang === 'mr' ? 'व्यवहाराचा प्रकार' : 'TRANSACTION TYPE'}</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#1d4ed8', marginTop: 2 }}>
                {transaction.transaction_type?.name || (lang === 'mr' ? 'समभाग / ठेव' : 'Shares / Deposit')}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>{lang === 'mr' ? 'स्थिती' : 'STATUS'}</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: transaction.status === 'POSTED' ? '#15803d' : '#b45309', marginTop: 2 }}>
                {transaction.status === 'POSTED' ? (lang === 'mr' ? 'नोंदवले' : 'POSTED') : transaction.status || 'POSTED'}
              </div>
            </div>
          </div>

          {/* Particulars Items Table */}
          <div style={{ border: '1px solid #cbd5e1', borderRadius: 8, overflow: 'hidden', marginBottom: 20 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#f1f5f9', borderBottom: '1px solid #cbd5e1' }}>
                  <th style={{ padding: '8px 12px', textAlign: 'left', fontSize: 11, color: '#1e40af', fontWeight: 700, textTransform: 'uppercase' }}>
                    {lang === 'mr' ? 'तपशील / वस्तू वर्णन' : 'Particulars / Item Description'}
                  </th>
                  <th style={{ padding: '8px 12px', textAlign: 'right', fontSize: 11, color: '#1e40af', fontWeight: 700, textTransform: 'uppercase', width: 100 }}>
                    {lang === 'mr' ? 'रु.' : 'Rs.'}
                  </th>
                  <th style={{ padding: '8px 12px', textAlign: 'right', fontSize: 11, color: '#1e40af', fontWeight: 700, textTransform: 'uppercase', width: 80 }}>
                    {lang === 'mr' ? 'पै.' : 'Ps.'}
                  </th>
                </tr>
              </thead>
              <tbody>
                {parsedItems.map((item, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #e2e8f0', background: i % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
                    <td style={{ padding: '8px 12px', color: '#0f172a' }}>{item.desc}</td>
                    <td style={{ padding: '8px 12px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 600 }}>{item.rs}</td>
                    <td style={{ padding: '8px 12px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 600 }}>{item.ps}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ background: '#eff6ff', borderTop: '2px solid #93c5fd' }}>
                  <td style={{ padding: '10px 12px', fontWeight: 800, color: '#0f172a', textTransform: 'uppercase', fontSize: 12 }}>
                    {lang === 'mr' ? 'एकूण रक्कम' : 'TOTAL AMOUNT'}
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 800, fontSize: 16, color: '#1d4ed8' }}>
                    {rsPart.toLocaleString('en-IN')}
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 800, fontSize: 16, color: '#1d4ed8' }}>
                    {String(psPart).padStart(2, '0')}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Amount in Words */}
          <div style={{
            padding: '10px 14px', background: '#f0f9ff', border: '1px solid #bae6fd',
            borderRadius: 8, fontSize: 13, marginBottom: 24, display: 'flex', gap: 8, alignItems: 'center',
          }}>
            <span style={{ fontSize: 11, fontWeight: 800, color: '#0369a1', textTransform: 'uppercase' }}>
              {lang === 'mr' ? '₹ अक्षरी:' : '₹ IN WORDS:'}
            </span>
            <span style={{ fontWeight: 600, color: '#0f172a' }}>{amountToWords(totalAmt)}</span>
          </div>

          {/* Signatures & Footer */}
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 20,
            paddingTop: 24, borderTop: '1px dashed #cbd5e1', alignItems: 'end',
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ borderTop: '1px solid #cbd5e1', paddingTop: 4, fontSize: 11, color: '#475569', fontWeight: 600 }}>
                {lang === 'mr' ? 'खातेधारकाची स्वाक्षरी' : 'Signature of Account Holder'}
              </div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ borderTop: '1px solid #cbd5e1', paddingTop: 4, fontSize: 11, color: '#475569', fontWeight: 600 }}>
                {lang === 'mr' ? 'लेखापाल / कारकून' : 'Accountant / Clerk'}
              </div>
            </div>
            <div style={{ textAlign: 'center', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: 10 }}>
              <div style={{ fontSize: 10, color: '#1e40af', fontWeight: 700 }}>{lang === 'mr' ? 'एकूण बेरीज' : 'GRAND TOTAL'}</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#1d4ed8', fontFamily: 'monospace' }}>
                ₹ {totalAmt.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );

  return ReactDOM.createPortal(modalJSX, document.body);
};

export default ReceiptModal;
