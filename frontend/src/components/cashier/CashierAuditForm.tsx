import React, { useState, useEffect, useCallback } from 'react';
import { Printer, RefreshCw, CheckCircle2, ShieldCheck, FileText, CheckSquare, Calendar, Building2 } from 'lucide-react';
import { fetchCashierAuditSummary, fetchPaymentVouchers, fetchReceiptVouchers, fetchRentBills, fetchCashScrollEntries, fetchChequeIssueEntries, fetchOffice } from '../../api/client';
import type { CashierAuditSummary, CashPaymentVoucher, CashReceiptVoucher, RentBill, CashScrollBookEntry, ChequeIssueBookEntry, OfficeMaster, User } from '../../types';
import { useTranslation } from '../../hooks/useTranslation';

interface CashierAuditFormProps {
  user?: User | null;
}

const CashierAuditForm: React.FC<CashierAuditFormProps> = ({ user }) => {
  const { lang } = useTranslation();
  const today = new Date().toISOString().split('T')[0];

  const [startDate, setStartDate] = useState('2026-06-01');
  const [endDate, setEndDate] = useState('2026-06-30');

  const [office, setOffice] = useState<OfficeMaster | null>(null);
  const [summary, setSummary] = useState<CashierAuditSummary | null>(null);
  const [paymentVouchers, setPaymentVouchers] = useState<CashPaymentVoucher[]>([]);
  const [receiptVouchers, setReceiptVouchers] = useState<CashReceiptVoucher[]>([]);
  const [rentBills, setRentBills] = useState<RentBill[]>([]);
  const [scrollEntries, setScrollEntries] = useState<CashScrollBookEntry[]>([]);
  const [chequeEntries, setChequeEntries] = useState<ChequeIssueBookEntry[]>([]);

  const [loading, setLoading] = useState(false);

  // Section Print Toggles
  const [includePayments, setIncludePayments] = useState(true);
  const [includeReceipts, setIncludeReceipts] = useState(true);
  const [includeRent, setIncludeRent] = useState(true);
  const [includeScroll, setIncludeScroll] = useState(true);
  const [includeCheques, setIncludeCheques] = useState(true);

  const loadAuditData = useCallback(async () => {
    setLoading(true);
    try {
      const [off, sum, pv, rv, rb, cs, ci] = await Promise.all([
        fetchOffice().catch(() => null),
        fetchCashierAuditSummary(startDate, endDate).catch(() => null),
        fetchPaymentVouchers(startDate, endDate).catch(() => []),
        fetchReceiptVouchers(startDate, endDate).catch(() => []),
        fetchRentBills(startDate, endDate).catch(() => []),
        fetchCashScrollEntries(startDate, endDate).catch(() => []),
        fetchChequeIssueEntries(startDate, endDate).catch(() => []),
      ]);

      setOffice(off);
      setSummary(sum);
      setPaymentVouchers(pv);
      setReceiptVouchers(rv);
      setRentBills(rb);
      setScrollEntries(cs);
      setChequeEntries(ci);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    loadAuditData();
  }, [loadAuditData]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="card" style={{ padding: 24, marginBottom: 30 }}>
      {/* Header controls */}
      <div className="no-print" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginBottom: 20, borderBottom: '1px solid var(--border-subtle)', paddingBottom: 16 }}>
        <div>
          <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <ShieldCheck size={20} color="var(--blue-600)" />
            6. {lang === 'mr' ? 'कॅशियर लेखापरीक्षा फॉर्म (Cashier Audit Package)' : 'Cashier Audit Form'}
          </h3>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            {lang === 'mr' ? 'कॅशियर सर्व व्हाऊचर, बिल, स्क्रोल व चेक नोंदींचे लेखापरीक्षण अहवाल बाइंडर' : 'Comprehensive Cashier binder & auditor verification package'}
          </p>
        </div>
        <button className="btn btn-primary" onClick={handlePrint}>
          <Printer size={16} /> {lang === 'mr' ? 'कॅशियर ऑडिट बाइंडर प्रिंट करा' : 'Print Cashier Audit Binder'}
        </button>
      </div>

      {/* Date Filter & Options */}
      <div className="no-print" style={{ background: 'var(--surface-subtle)', padding: 16, borderRadius: 8, border: '1px solid var(--border-subtle)', marginBottom: 24 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 16, marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Calendar size={16} color="var(--blue-500)" />
            <label style={{ fontSize: 13, fontWeight: 600 }}>{lang === 'mr' ? 'कालावधी निवडा:' : 'Select Period:'}</label>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <input type="date" className="form-input" style={{ padding: '4px 8px', fontSize: 13 }} value={startDate} onChange={e => setStartDate(e.target.value)} />
            <span style={{ fontSize: 13 }}>to</span>
            <input type="date" className="form-input" style={{ padding: '4px 8px', fontSize: 13 }} value={endDate} onChange={e => setEndDate(e.target.value)} />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-secondary btn-sm" onClick={() => { setStartDate('2026-06-01'); setEndDate('2026-06-30'); }}>
              {lang === 'mr' ? 'जून २०२६' : 'June 2026'}
            </button>
            <button className="btn btn-secondary btn-sm" onClick={() => { setStartDate(today); setEndDate(today); }}>
              {lang === 'mr' ? 'आज' : 'Today'}
            </button>
            <button className="btn btn-secondary btn-sm" onClick={loadAuditData} disabled={loading}>
              <RefreshCw size={13} className={loading ? 'spinner' : ''} /> {lang === 'mr' ? 'ताजे करा' : 'Refresh'}
            </button>
          </div>
        </div>

        {/* Section Toggles */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, paddingTop: 10, borderTop: '1px dashed var(--border-muted)', fontSize: 12 }}>
          <span style={{ fontWeight: 600, color: 'var(--text-muted)' }}>Include in Print:</span>
          <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
            <input type="checkbox" checked={includePayments} onChange={e => setIncludePayments(e.target.checked)} />
            Payment Vouchers
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
            <input type="checkbox" checked={includeReceipts} onChange={e => setIncludeReceipts(e.target.checked)} />
            Receipt Vouchers
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
            <input type="checkbox" checked={includeRent} onChange={e => setIncludeRent(e.target.checked)} />
            Rent Bills
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
            <input type="checkbox" checked={includeScroll} onChange={e => setIncludeScroll(e.target.checked)} />
            Cash Scroll Book
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
            <input type="checkbox" checked={includeCheques} onChange={e => setIncludeCheques(e.target.checked)} />
            Cheque Issue Book
          </label>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 24 }}>
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: 14 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#991b1b' }}>1. Payment Vouchers</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#dc2626', marginTop: 4 }}>
            ₹{Number(summary?.total_payment_amount || 0).toFixed(2)}
          </div>
          <div style={{ fontSize: 11, color: '#b91c1c', marginTop: 2 }}>{summary?.total_payment_vouchers_count || 0} Vouchers Recorded</div>
        </div>

        <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: 14 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#166534' }}>2. Receipt Vouchers</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#16a34a', marginTop: 4 }}>
            ₹{Number(summary?.total_receipt_amount || 0).toFixed(2)}
          </div>
          <div style={{ fontSize: 11, color: '#15803d', marginTop: 2 }}>{summary?.total_receipt_vouchers_count || 0} Cash Memos</div>
        </div>

        <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: 14 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#1e40af' }}>3. Rent Bills</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#2563eb', marginTop: 4 }}>
            ₹{Number(summary?.total_rent_bill_amount || 0).toFixed(2)}
          </div>
          <div style={{ fontSize: 11, color: '#1d4ed8', marginTop: 2 }}>{summary?.total_rent_bills_count || 0} Tax Invoices</div>
        </div>

        <div style={{ background: '#faf5ff', border: '1px solid #e9d5ff', borderRadius: 8, padding: 14 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#6b21a8' }}>4. Cash Scroll Totals</div>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#7e22ce', marginTop: 4 }}>
            Rec: ₹{Number(summary?.total_scroll_received || 0).toFixed(2)}
          </div>
          <div style={{ fontSize: 11, color: '#9333ea', marginTop: 2 }}>Paid: ₹{Number(summary?.total_scroll_paid || 0).toFixed(2)}</div>
        </div>

        <div style={{ background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 8, padding: 14 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#9a3412' }}>5. Cheques Issued</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#ea580c', marginTop: 4 }}>
            ₹{Number(summary?.total_cheques_issued_amount || 0).toFixed(2)}
          </div>
          <div style={{ fontSize: 11, color: '#c2410c', marginTop: 2 }}>{summary?.total_cheques_issued_count || 0} Cheques Issued</div>
        </div>
      </div>

      {/* Printable Cashier Audit Binder */}
      <div className="printable-audit-binder" style={{ border: '2px solid #000', padding: 24, background: '#fff', color: '#000', fontFamily: 'serif' }}>
        {/* Audit Cover */}
        <div style={{ textAlign: 'center', borderBottom: '3px double #000', paddingBottom: 14, marginBottom: 20 }}>
          <h2 style={{ fontSize: 20, fontWeight: 'bold', margin: 0 }}>
            {office?.office_name || 'BELAGAVI GARDENERS CO-OPERATIVE PRODUCTION SUPPLY AND SALE SOCIETY LTD., BELAGAVI'}
          </h2>
          <div style={{ fontSize: 13, marginTop: 4 }}>
            {office?.address || '930/1A Zanda Chowk Market, Belagavi - 590002'} | GST: {office?.gst_no || '29AAAAT4655K1Z1'}
          </div>
          <div style={{ fontSize: 16, fontWeight: 'bold', marginTop: 10, textDecoration: 'underline' }}>
            CASHIER FINANCIAL AUDIT BINDER & VERIFICATION REPORT
          </div>
          <div style={{ fontSize: 13, fontStyle: 'italic', marginTop: 4 }}>
            Audit Period: {startDate} to {endDate}
          </div>
        </div>

        {/* Section 1: Payment Vouchers Schedule */}
        {includePayments && (
          <div style={{ marginBottom: 24, pageBreakInside: 'avoid' }}>
            <h4 style={{ fontSize: 14, fontWeight: 'bold', borderBottom: '1px solid #000', paddingBottom: 4, marginBottom: 8 }}>
              Schedule 1: Cash Payment Vouchers
            </h4>
            <table className="table" style={{ width: '100%', fontSize: 11, borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f1f5f9' }}>
                  <th style={{ border: '1px solid #000', padding: 4 }}>Voucher No.</th>
                  <th style={{ border: '1px solid #000', padding: 4 }}>Date</th>
                  <th style={{ border: '1px solid #000', padding: 4 }}>Paid To</th>
                  <th style={{ border: '1px solid #000', padding: 4 }}>Purpose</th>
                  <th style={{ border: '1px solid #000', padding: 4, textAlign: 'right' }}>Amount (₹)</th>
                </tr>
              </thead>
              <tbody>
                {paymentVouchers.length === 0 ? (
                  <tr><td colSpan={5} style={{ textAlign: 'center', padding: 8, fontStyle: 'italic' }}>No vouchers found</td></tr>
                ) : (
                  paymentVouchers.map(r => (
                    <tr key={r.id}>
                      <td style={{ border: '1px solid #000', padding: 4 }}>{r.voucher_no}</td>
                      <td style={{ border: '1px solid #000', padding: 4 }}>{r.date}</td>
                      <td style={{ border: '1px solid #000', padding: 4 }}>{r.paid_to}</td>
                      <td style={{ border: '1px solid #000', padding: 4 }}>{r.purpose_remarks || '-'}</td>
                      <td style={{ border: '1px solid #000', padding: 4, textAlign: 'right' }}>₹{Number(r.amount_rs).toFixed(2)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Section 2: Receipt Vouchers Schedule */}
        {includeReceipts && (
          <div style={{ marginBottom: 24, pageBreakInside: 'avoid' }}>
            <h4 style={{ fontSize: 14, fontWeight: 'bold', borderBottom: '1px solid #000', paddingBottom: 4, marginBottom: 8 }}>
              Schedule 2: Cash Receipt Vouchers (Cash Memos)
            </h4>
            <table className="table" style={{ width: '100%', fontSize: 11, borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f1f5f9' }}>
                  <th style={{ border: '1px solid #000', padding: 4 }}>Bill No.</th>
                  <th style={{ border: '1px solid #000', padding: 4 }}>Date</th>
                  <th style={{ border: '1px solid #000', padding: 4 }}>Received From</th>
                  <th style={{ border: '1px solid #000', padding: 4, textAlign: 'right' }}>Loan (₹)</th>
                  <th style={{ border: '1px solid #000', padding: 4, textAlign: 'right' }}>Interest (₹)</th>
                  <th style={{ border: '1px solid #000', padding: 4, textAlign: 'right' }}>Total (₹)</th>
                </tr>
              </thead>
              <tbody>
                {receiptVouchers.length === 0 ? (
                  <tr><td colSpan={6} style={{ textAlign: 'center', padding: 8, fontStyle: 'italic' }}>No receipts found</td></tr>
                ) : (
                  receiptVouchers.map(r => (
                    <tr key={r.id}>
                      <td style={{ border: '1px solid #000', padding: 4 }}>{r.bill_no}</td>
                      <td style={{ border: '1px solid #000', padding: 4 }}>{r.date}</td>
                      <td style={{ border: '1px solid #000', padding: 4 }}>{r.received_from}</td>
                      <td style={{ border: '1px solid #000', padding: 4, textAlign: 'right' }}>₹{Number(r.loan_amount).toFixed(2)}</td>
                      <td style={{ border: '1px solid #000', padding: 4, textAlign: 'right' }}>₹{Number(r.interest_amount).toFixed(2)}</td>
                      <td style={{ border: '1px solid #000', padding: 4, textAlign: 'right', fontWeight: 'bold' }}>₹{Number(r.total_amount).toFixed(2)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Section 3: Rent Bills Schedule */}
        {includeRent && (
          <div style={{ marginBottom: 24, pageBreakInside: 'avoid' }}>
            <h4 style={{ fontSize: 14, fontWeight: 'bold', borderBottom: '1px solid #000', paddingBottom: 4, marginBottom: 8 }}>
              Schedule 3: Rent Bills (Tax Invoices)
            </h4>
            <table className="table" style={{ width: '100%', fontSize: 11, borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f1f5f9' }}>
                  <th style={{ border: '1px solid #000', padding: 4 }}>Invoice No.</th>
                  <th style={{ border: '1px solid #000', padding: 4 }}>Date</th>
                  <th style={{ border: '1px solid #000', padding: 4 }}>Rentee / Consignee</th>
                  <th style={{ border: '1px solid #000', padding: 4, textAlign: 'right' }}>Base Amount (₹)</th>
                  <th style={{ border: '1px solid #000', padding: 4, textAlign: 'right' }}>SGST+CGST (₹)</th>
                  <th style={{ border: '1px solid #000', padding: 4, textAlign: 'right' }}>Total Invoice (₹)</th>
                </tr>
              </thead>
              <tbody>
                {rentBills.length === 0 ? (
                  <tr><td colSpan={6} style={{ textAlign: 'center', padding: 8, fontStyle: 'italic' }}>No rent bills found</td></tr>
                ) : (
                  rentBills.map(r => (
                    <tr key={r.id}>
                      <td style={{ border: '1px solid #000', padding: 4 }}>{r.invoice_no}</td>
                      <td style={{ border: '1px solid #000', padding: 4 }}>{r.date}</td>
                      <td style={{ border: '1px solid #000', padding: 4 }}>{r.consignee_name}</td>
                      <td style={{ border: '1px solid #000', padding: 4, textAlign: 'right' }}>₹{Number(r.amount).toFixed(2)}</td>
                      <td style={{ border: '1px solid #000', padding: 4, textAlign: 'right' }}>₹{(Number(r.sgst_amount) + Number(r.cgst_amount)).toFixed(2)}</td>
                      <td style={{ border: '1px solid #000', padding: 4, textAlign: 'right', fontWeight: 'bold' }}>₹{Number(r.total_amount).toFixed(2)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Section 4 & 5: Scroll & Cheques */}
        {includeScroll && (
          <div style={{ marginBottom: 24, pageBreakInside: 'avoid' }}>
            <h4 style={{ fontSize: 14, fontWeight: 'bold', borderBottom: '1px solid #000', paddingBottom: 4, marginBottom: 8 }}>
              Schedule 4: Cash Scroll Book Entries
            </h4>
            <table className="table" style={{ width: '100%', fontSize: 11, borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f1f5f9' }}>
                  <th style={{ border: '1px solid #000', padding: 4 }}>Date</th>
                  <th style={{ border: '1px solid #000', padding: 4 }}>Page / V. No.</th>
                  <th style={{ border: '1px solid #000', padding: 4 }}>Particulars</th>
                  <th style={{ border: '1px solid #000', padding: 4, textAlign: 'right' }}>Received (₹)</th>
                  <th style={{ border: '1px solid #000', padding: 4, textAlign: 'right' }}>Paid (₹)</th>
                  <th style={{ border: '1px solid #000', padding: 4, textAlign: 'right' }}>Cheque (₹)</th>
                </tr>
              </thead>
              <tbody>
                {scrollEntries.length === 0 ? (
                  <tr><td colSpan={6} style={{ textAlign: 'center', padding: 8, fontStyle: 'italic' }}>No scroll entries found</td></tr>
                ) : (
                  scrollEntries.map(r => (
                    <tr key={r.id}>
                      <td style={{ border: '1px solid #000', padding: 4 }}>{r.date}</td>
                      <td style={{ border: '1px solid #000', padding: 4 }}>{r.page_no || r.voucher_no || '-'}</td>
                      <td style={{ border: '1px solid #000', padding: 4 }}>{r.from_received_paid}</td>
                      <td style={{ border: '1px solid #000', padding: 4, textAlign: 'right' }}>₹{Number(r.received_amount).toFixed(2)}</td>
                      <td style={{ border: '1px solid #000', padding: 4, textAlign: 'right' }}>₹{Number(r.paid_amount).toFixed(2)}</td>
                      <td style={{ border: '1px solid #000', padding: 4, textAlign: 'right' }}>₹{Number(r.cheque_amount).toFixed(2)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {includeCheques && (
          <div style={{ marginBottom: 24, pageBreakInside: 'avoid' }}>
            <h4 style={{ fontSize: 14, fontWeight: 'bold', borderBottom: '1px solid #000', paddingBottom: 4, marginBottom: 8 }}>
              Schedule 5: Cheque Issue Book Entries
            </h4>
            <table className="table" style={{ width: '100%', fontSize: 11, borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f1f5f9' }}>
                  <th style={{ border: '1px solid #000', padding: 4 }}>Date</th>
                  <th style={{ border: '1px solid #000', padding: 4 }}>Name to whom Issued</th>
                  <th style={{ border: '1px solid #000', padding: 4, textAlign: 'center' }}>Cheque No.</th>
                  <th style={{ border: '1px solid #000', padding: 4, textAlign: 'right' }}>Amount (₹)</th>
                </tr>
              </thead>
              <tbody>
                {chequeEntries.length === 0 ? (
                  <tr><td colSpan={4} style={{ textAlign: 'center', padding: 8, fontStyle: 'italic' }}>No cheque issues found</td></tr>
                ) : (
                  chequeEntries.map(r => (
                    <tr key={r.id}>
                      <td style={{ border: '1px solid #000', padding: 4 }}>{r.issue_date}</td>
                      <td style={{ border: '1px solid #000', padding: 4 }}>{r.name_to_whom_issued}</td>
                      <td style={{ border: '1px solid #000', padding: 4, textAlign: 'center' }}>{r.cheque_no}</td>
                      <td style={{ border: '1px solid #000', padding: 4, textAlign: 'right', fontWeight: 'bold' }}>₹{Number(r.amount_rs).toFixed(2)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Audit Signatures */}
        <div style={{ marginTop: 40, borderTop: '2px solid #000', paddingTop: 16, pageBreakInside: 'avoid' }}>
          <div style={{ fontSize: 12, fontStyle: 'italic', marginBottom: 24 }}>
            "Certified that all payment vouchers, receipt vouchers, rent tax invoices, cash scroll records, and cheque issue registers have been verified against physical vouchers and society bank books."
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', textAlign: 'center', fontSize: 12, fontWeight: 'bold' }}>
            <div>Cashier Signature<br /><br />_______________</div>
            <div>Internal Auditor<br /><br />_______________</div>
            <div>Accountant Officer<br /><br />_______________</div>
            <div>Managing Director<br /><br />_______________</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CashierAuditForm;
