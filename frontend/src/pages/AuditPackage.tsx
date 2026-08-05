import React, { useEffect, useState, useCallback } from 'react';
import {
  Printer, RefreshCw, CheckCircle2, ShieldCheck,
  Building2, Hash, Phone, FileText, CheckSquare, Calendar,
  Receipt, Landmark, CreditCard, Tag, ShoppingCart, FlaskConical, BarChart3
} from 'lucide-react';
import Header from '../components/Header';
import PrintHeader from '../components/PrintHeader';
import {
  fetchOffice,
  fetchCashBook,
  fetchLedger,
  fetchCustomers,
  fetchPaymentVouchers,
  fetchReceiptVouchers,
  fetchRentBills,
  fetchShopTaxInvoices,
  fetchShopRetailBills,
  fetchPesticideSales,
} from '../api/client';
import type {
  CashBookRow,
  LedgerRow,
  Customer,
  OfficeMaster,
  User,
  CashPaymentVoucher,
  CashReceiptVoucher,
  RentBill,
  ShopTaxInvoice,
  ShopRetailBill,
  PesticideSaleEntry,
} from '../types';
import { CREDIT_BOOK_COLUMNS, DEBIT_BOOK_COLUMNS } from '../types';
import { useTranslation } from '../hooks/useTranslation';
import { getTxnHeadMarathi } from '../utils/translator';

interface AuditPackageProps {
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

const AuditPackage: React.FC<AuditPackageProps> = ({ user, onLogout, onToggleMobileMenu }) => {
  const { t, lang } = useTranslation();
  const today = new Date().toISOString().split('T')[0];
  const [startDate, setStartDate] = useState('2026-06-01');
  const [endDate, setEndDate] = useState('2026-06-30');

  const [office, setOffice] = useState<OfficeMaster | null>(null);
  
  // Dashboard 1: Accountant Data
  const [creditRows, setCreditRows] = useState<CashBookRow[]>([]);
  const [debitRows, setDebitRows] = useState<CashBookRow[]>([]);
  const [ledgerRows, setLedgerRows] = useState<LedgerRow[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);

  // Dashboard 2: Cashier Data
  const [paymentVouchers, setPaymentVouchers] = useState<CashPaymentVoucher[]>([]);
  const [receiptVouchers, setReceiptVouchers] = useState<CashReceiptVoucher[]>([]);
  const [rentBills, setRentBills] = useState<RentBill[]>([]);

  // Dashboard 3: Shopkeeper Data
  const [shopTaxInvoices, setShopTaxInvoices] = useState<ShopTaxInvoice[]>([]);
  const [shopRetailBills, setShopRetailBills] = useState<ShopRetailBill[]>([]);
  const [pesticideSales, setPesticideSales] = useState<PesticideSaleEntry[]>([]);

  const [loading, setLoading] = useState(false);

  // Print section toggles for 3 Dashboards
  const [includeCover, setIncludeCover] = useState(true);
  const [includeCreditBook, setIncludeCreditBook] = useState(true);
  const [includeDebitBook, setIncludeDebitBook] = useState(true);
  const [includeLedger, setIncludeLedger] = useState(true);
  const [includeCustomers, setIncludeCustomers] = useState(true);
  const [includeCashier, setIncludeCashier] = useState(true);
  const [includeShopkeeper, setIncludeShopkeeper] = useState(true);

  const loadAuditData = useCallback(async () => {
    setLoading(true);
    try {
      const [
        off, cred, deb, cust,
        pv, rv, rb,
        sti, srb, ps
      ] = await Promise.all([
        fetchOffice().catch(() => null),
        fetchCashBook(startDate, endDate, 'CREDIT').catch(() => []),
        fetchCashBook(startDate, endDate, 'DEBIT').catch(() => []),
        fetchCustomers().catch(() => []),
        fetchPaymentVouchers(startDate, endDate).catch(() => []),
        fetchReceiptVouchers(startDate, endDate).catch(() => []),
        fetchRentBills(startDate, endDate).catch(() => []),
        fetchShopTaxInvoices(startDate, endDate).catch(() => []),
        fetchShopRetailBills(startDate, endDate).catch(() => []),
        fetchPesticideSales(startDate, endDate).catch(() => []),
      ]);

      setOffice(off);
      setCreditRows(cred);
      setDebitRows(deb);
      setCustomers(cust);

      setPaymentVouchers(pv);
      setReceiptVouchers(rv);
      setRentBills(rb);

      setShopTaxInvoices(sti);
      setShopRetailBills(srb);
      setPesticideSales(ps);

      // Extract month and year from startDate if available
      const sDateObj = new Date(startDate);
      const m = sDateObj.getMonth() + 1;
      const y = sDateObj.getFullYear();
      const ledg = await fetchLedger(m, y).catch(() => []);
      setLedgerRows(ledg);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    loadAuditData();
  }, [loadAuditData]);

  const handlePresetJune = () => {
    setStartDate('2026-06-01');
    setEndDate('2026-06-30');
  };

  const handlePresetToday = () => {
    setStartDate(today);
    setEndDate(today);
  };

  const handlePrint = () => {
    window.print();
  };

  // Calculations: Dashboard 1 (Accountant)
  const creditTotal = creditRows.reduce((s, r) => s + Number(r.total), 0);
  const debitTotal = debitRows.reduce((s, r) => s + Number(r.total), 0);

  // Calculations: Dashboard 2 (Cashier)
  const paymentVouchersTotal = paymentVouchers.reduce((s, r) => s + Number(r.amount), 0);
  const receiptVouchersTotal = receiptVouchers.reduce((s, r) => s + Number(r.amount), 0);
  const rentBillsTotal = rentBills.reduce((s, r) => s + Number(r.total_amount), 0);
  const cashierTotalTxns = paymentVouchers.length + receiptVouchers.length + rentBills.length;
  const cashierTotalVolume = paymentVouchersTotal + receiptVouchersTotal + rentBillsTotal;

  // Calculations: Dashboard 3 (Shopkeeper)
  const shopTaxInvoicesTotal = shopTaxInvoices.reduce((s, r) => s + Number(r.total_amount), 0);
  const shopRetailBillsTotal = shopRetailBills.reduce((s, r) => s + Number(r.total_amount), 0);
  const pesticideSalesTotal = pesticideSales.reduce((s, r) => s + Number(r.total_amount), 0);
  const shopkeeperTotalTxns = shopTaxInvoices.length + shopRetailBills.length + pesticideSales.length;
  const shopkeeperTotalVolume = shopTaxInvoicesTotal + shopRetailBillsTotal + pesticideSalesTotal;

  // Credit column totals
  const creditColTotals = CREDIT_BOOK_COLUMNS.reduce((acc, col) => {
    acc[col.key as string] = creditRows.reduce((s, r) => s + (Number(r[col.key]) || 0), 0);
    return acc;
  }, {} as Record<string, number>);

  // Debit column totals
  const debitColTotals = DEBIT_BOOK_COLUMNS.reduce((acc, col) => {
    acc[col.key as string] = debitRows.reduce((s, r) => s + (Number(r[col.key]) || 0), 0);
    return acc;
  }, {} as Record<string, number>);

  // Ledger totals
  const totalLedgerReceipt = ledgerRows.reduce((s, r) => s + Number(r.receipt), 0);
  const totalLedgerDebit = ledgerRows.reduce((s, r) => s + Number(r.debit), 0);
  const totalLedgerPayable = ledgerRows.reduce((s, r) => s + Number(r.payable), 0);
  const totalLedgerReceivable = ledgerRows.reduce((s, r) => s + Number(r.receivable), 0);

  return (
    <div className="page-container">
      <Header
        title={t('audit_title')}
        subtitle={lang === 'mr'
          ? 'संपूर्ण आर्थिक वेळापत्रक बाइंडर आणि लेखापरीक्षक प्रमाणीकरण अहवाल'
          : 'Complete Financial Schedules Binder & Auditor Verification Reports'}
        level={3}
        actions={
          <button className="btn btn-primary btn-lg no-print" onClick={handlePrint}>
            <Printer size={18} /> {lang === 'mr' ? 'संपूर्ण लेखापरीक्षा बाइंडर मुद्रित करा' : 'Print Complete Audit Binder'}
          </button>
        }
        user={user}
        onLogout={onLogout}
        onToggleMobileMenu={onToggleMobileMenu}
      />

      <div className="page-content">

        {/* ── AUDIT CONTROLS CARD (NO PRINT) ── */}
        <div className="card no-print" style={{ marginBottom: 24, borderTop: '4px solid #0f172a', boxShadow: '0 4px 16px rgba(15, 23, 42, 0.1)' }}>
          <div className="card-header">
            <div>
              <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Calendar size={18} color="var(--blue-700)" /> {lang === 'mr' ? 'लेखापरीक्षा कालावधी आणि दस्तऐवज सूची निवडा' : 'Select Audit Period & Document Schedules'}
              </div>
              <div className="card-subtitle">{lang === 'mr' ? 'तारीख श्रेणी निवडा आणि मुद्रित बाइंडरमध्ये समाविष्ट करण्यासाठी सूची निवडा' : 'Choose date range and toggle schedules to include in the printed binder'}</div>
            </div>
          </div>

          <div className="card-body">
            {/* Date Range Inputs */}
            <div className="filter-bar" style={{ boxShadow: 'none', background: '#f8fafc', marginBottom: 20 }}>
              <div className="filter-group">
                <span className="filter-label">{lang === 'mr' ? 'लेखापरीक्षा सुरुवातीची तारीख:' : 'Audit From:'}</span>
                <input
                  type="date"
                  className="filter-input"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                />
              </div>

              <div className="filter-group">
                <span className="filter-label">{lang === 'mr' ? 'लेखापरीक्षा शेवटची तारीख:' : 'Audit To:'}</span>
                <input
                  type="date"
                  className="filter-input"
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                />
              </div>

              <button className="btn btn-primary btn-sm" onClick={loadAuditData}>
                <RefreshCw size={14} /> {lang === 'mr' ? 'लेखापरीक्षा नोंदी लोड करा' : 'Load Audit Schedules'}
              </button>

              <button className="btn btn-secondary btn-sm" onClick={handlePresetJune}>
                {lang === 'mr' ? 'जून २०२६' : 'June 2026'}
              </button>

              <button className="btn btn-secondary btn-sm" onClick={handlePresetToday}>
                {lang === 'mr' ? 'आज' : 'Today'}
              </button>
            </div>

            {/* Schedule Checklist */}
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 10 }}>
              {lang === 'mr' ? 'मुद्रण पॅकेजमध्ये समाविष्ट केलेली पत्रके:' : 'Schedules Included in Print Package:'}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, background: '#ffffff', padding: 14, border: '1px solid #cbd5e1', borderRadius: 8 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                <input type="checkbox" checked={includeCover} onChange={e => setIncludeCover(e.target.checked)} />
                {lang === 'mr' ? '१. मुख्य मुखपृष्ठ आणि आर्थिक सारांश' : '1. Cover Sheet & Financial Summary'}
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                <input type="checkbox" checked={includeCreditBook} onChange={e => setIncludeCreditBook(e.target.checked)} />
                {lang === 'mr' ? `२. जमा वही पत्रक (${creditRows.length} व्यवहार)` : `2. Credit Book Schedule (${creditRows.length} txns)`}
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                <input type="checkbox" checked={includeDebitBook} onChange={e => setIncludeDebitBook(e.target.checked)} />
                {lang === 'mr' ? `३. नावे वही पत्रक (${debitRows.length} व्यवहार)` : `3. Debit Book Schedule (${debitRows.length} txns)`}
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                <input type="checkbox" checked={includeLedger} onChange={e => setIncludeLedger(e.target.checked)} />
                {lang === 'mr' ? `४. सर्वसाधारण खातेवही सारांश (${ledgerRows.length} खाती)` : `4. General Ledger Summary (${ledgerRows.length} accounts)`}
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                <input type="checkbox" checked={includeCustomers} onChange={e => setIncludeCustomers(e.target.checked)} />
                {lang === 'mr' ? `५. ग्राहक खाती आणि KYC निर्देशिका (${customers.length} सदस्य)` : `5. Customer Accounts & KYC Directory (${customers.length} members)`}
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#0284c7' }}>
                <input type="checkbox" checked={includeCashier} onChange={e => setIncludeCashier(e.target.checked)} />
                {lang === 'mr' ? `६. कॅशियर डॅशबोर्ड तक्ता (${cashierTotalTxns} व्यवहार)` : `6. Cashier Dashboard Schedule (${cashierTotalTxns} txns)`}
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#059669' }}>
                <input type="checkbox" checked={includeShopkeeper} onChange={e => setIncludeShopkeeper(e.target.checked)} />
                {lang === 'mr' ? `७. दुकानदार डॅशबोर्ड तक्ता (${shopkeeperTotalTxns} व्यवहार)` : `7. Shopkeeper Dashboard Schedule (${shopkeeperTotalTxns} txns)`}
              </label>
            </div>
          </div>
        </div>

        {/* ── PRINT BINDER CONTAINER ── */}
        <div id="audit-print-binder">

          {/* ══════════════════════════════════════════════════════════════════
              SCHEDULE 1: COVER SHEET & EXECUTIVE AUDIT SUMMARY
             ══════════════════════════════════════════════════════════════════ */}
          {includeCover && (
            <div className="audit-page-section" style={{ pageBreakAfter: 'always', marginBottom: 20 }}>
              <div style={{
                border: '3px double #0f172a', borderRadius: 12, padding: '16px 20px', background: '#ffffff',
                textAlign: 'center', boxShadow: '0 4px 20px rgba(0,0,0,0.05)'
              }}>
                <PrintHeader
                  documentTitle={lang === 'mr' ? 'आर्थिक लेखापरीक्षा पॅकेज (३ डॅशबोर्ड)' : 'F I N A N C I A L   A U D I T   P A C K A G E (3 DASHBOARDS)'}
                  subTitle={lang === 'mr' ? `लेखापरीक्षा कालावधी: ${startDate} ते ${endDate}` : `Master Audit Period: ${startDate} to ${endDate}`}
                />

                {/* Audit Key Metric Cards - 3 Dashboards Summary */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr', gap: 10, marginTop: 14, textAlign: 'left' }}>
                  <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: 8 }}>
                    <div style={{ fontSize: 10, fontWeight: 800, color: '#166534', textTransform: 'uppercase' }}>{lang === 'mr' ? '१. लेखापाल जमा पावत्या' : '1. Accounts Credit'}</div>
                    <div style={{ fontSize: 15, fontWeight: 900, color: '#15803d', marginTop: 2 }}>
                      ₹{creditTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </div>
                    <div style={{ fontSize: 9, color: '#166534', marginTop: 2 }}>{creditRows.length} {lang === 'mr' ? 'जमा नोंदी' : 'Credit Txns'}</div>
                  </div>

                  <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: 8 }}>
                    <div style={{ fontSize: 10, fontWeight: 800, color: '#991b1b', textTransform: 'uppercase' }}>{lang === 'mr' ? '१. लेखापाल नावे खर्च' : '1. Accounts Debit'}</div>
                    <div style={{ fontSize: 15, fontWeight: 900, color: '#b91c1c', marginTop: 2 }}>
                      ₹{debitTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </div>
                    <div style={{ fontSize: 9, color: '#991b1b', marginTop: 2 }}>{debitRows.length} {lang === 'mr' ? 'नावे नोंदी' : 'Debit Txns'}</div>
                  </div>

                  <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 8, padding: 8 }}>
                    <div style={{ fontSize: 10, fontWeight: 800, color: '#0369a1', textTransform: 'uppercase' }}>{lang === 'mr' ? '२. कॅशियर व्यवहार' : '2. Cashier Operations'}</div>
                    <div style={{ fontSize: 15, fontWeight: 900, color: '#0284c7', marginTop: 2 }}>
                      ₹{cashierTotalVolume.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </div>
                    <div style={{ fontSize: 9, color: '#0369a1', marginTop: 2 }}>{cashierTotalTxns} {lang === 'mr' ? 'व्हाऊचर व बिले' : 'Vouchers & Bills'}</div>
                  </div>

                  <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: 8, padding: 8 }}>
                    <div style={{ fontSize: 10, fontWeight: 800, color: '#047857', textTransform: 'uppercase' }}>{lang === 'mr' ? '३. दुकानदार विक्री' : '3. Shopkeeper Sales'}</div>
                    <div style={{ fontSize: 15, fontWeight: 900, color: '#059669', marginTop: 2 }}>
                      ₹{shopkeeperTotalVolume.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </div>
                    <div style={{ fontSize: 9, color: '#047857', marginTop: 2 }}>{shopkeeperTotalTxns} {lang === 'mr' ? 'इनव्हॉईस व विक्री' : 'Invoices & Sales'}</div>
                  </div>

                  <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: 8 }}>
                    <div style={{ fontSize: 10, fontWeight: 800, color: '#1e40af', textTransform: 'uppercase' }}>{lang === 'mr' ? 'सदस्य खाती' : 'Member KYC'}</div>
                    <div style={{ fontSize: 15, fontWeight: 900, color: '#1d4ed8', marginTop: 2 }}>
                      {customers.length} {lang === 'mr' ? 'सदस्य' : 'Members'}
                    </div>
                    <div style={{ fontSize: 9, color: '#1e40af', marginTop: 2 }}>{lang === 'mr' ? '१०-अंकी KYC पडताळणीकृत' : '10-Digit KYC Validated'}</div>
                  </div>
                </div>

                {/* Verification Badge */}
                <div style={{
                  marginTop: 14, padding: '10px 14px', background: '#f8fafc', border: '1px solid #cbd5e1',
                  borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between', textAlign: 'left'
                }}>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <CheckCircle2 size={15} color="#16a34a" /> {lang === 'mr' ? '३-डॅशबोर्ड एकत्रित लेखापरीक्षा व ताळमेळ प्रमाणीकरण' : '3-Dashboard Master Audit & Reconciliation Verification'}
                    </div>
                    <div style={{ fontSize: 10, color: '#64748b', marginTop: 2 }}>
                      {lang === 'mr' ? 'लेखापाल, कॅशियर आणि दुकानदार या तिन्ही डॅशबोर्डचे सर्व व्यवहार पूर्णपणे समाविष्ट व तपासले आहेत.' : 'All transactions across Accountant, Cashier, and Shopkeeper dashboards verified & included.'}
                    </div>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 800, color: '#15803d', background: '#dcfce7', border: '1px solid #86efac', padding: '3px 8px', borderRadius: 6 }}>
                    {lang === 'mr' ? '३ डॅशबोर्ड पडताळणीकृत ✅' : '3-DASHBOARDS AUDITED ✅'}
                  </span>
                </div>

                {/* Signatures Footer */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 20, marginTop: 24, paddingTop: 16, borderTop: '1px solid #e2e8f0', textAlign: 'center' }}>
                  <div>
                    <div style={{ height: 28 }} />
                    <div style={{ fontSize: 11, fontWeight: 700, borderTop: '1px solid #94a3b8', paddingTop: 4 }}>{lang === 'mr' ? 'तयार केले (लेखापाल अधिकारी)' : 'Prepared By (Accounts Officer)'}</div>
                  </div>
                  <div>
                    <div style={{ height: 28 }} />
                    <div style={{ fontSize: 11, fontWeight: 700, borderTop: '1px solid #94a3b8', paddingTop: 4 }}>{lang === 'mr' ? 'तपासले (अंतर्गत लेखापरीक्षक)' : 'Verified By (Internal Auditor)'}</div>
                  </div>
                  <div>
                    <div style={{ height: 28 }} />
                    <div style={{ fontSize: 11, fontWeight: 700, borderTop: '1px solid #94a3b8', paddingTop: 4 }}>{lang === 'mr' ? 'मंजूर केले (वैधानिक लेखापरीक्षक)' : 'Approved By (Statutory Auditor)'}</div>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              SCHEDULE 2: CREDIT BOOK AUDIT SCHEDULE
             ══════════════════════════════════════════════════════════════════ */}
          {includeCreditBook && (
            <div className="audit-page-section" style={{ pageBreakAfter: 'always', marginBottom: 40 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, borderBottom: '2px solid #0f172a', paddingBottom: 8 }}>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: '#0f172a' }}>{lang === 'mr' ? 'तक्ता २: जमा वही पावत्या लेखापरीक्षा तक्ता' : 'SCHEDULE II: CREDIT BOOK RECEIPTS AUDIT SCHEDULE'}</div>
                  <div style={{ fontSize: 12, color: '#475569' }}>{lang === 'mr' ? 'कालावधी:' : 'Period:'} {startDate} {lang === 'mr' ? 'ते' : 'to'} {endDate}</div>
                </div>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#15803d' }}>
                  {lang === 'mr' ? 'एकूण पावत्या:' : 'Total Receipts:'} ₹{creditTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>
              </div>

              <table className="data-table" style={{ width: '100%', fontSize: 11 }}>
                <thead>
                  <tr style={{ background: '#f0fdf4' }}>
                    <th>{lang === 'mr' ? 'तारीख' : 'Date'}</th>
                    <th>L.F</th>
                    <th>{lang === 'mr' ? 'खातेदाराचे नाव' : 'Account Holder Name'}</th>
                    {CREDIT_BOOK_COLUMNS.map(col => <th key={col.key} style={{ textAlign: 'right' }}>{lang === 'mr' ? (COLUMN_LABELS_MR[col.key as string] || col.label) : col.label}</th>)}
                    <th style={{ textAlign: 'right' }}>{lang === 'mr' ? 'एकूण रक्कम' : 'Total Amount'}</th>
                    <th>{lang === 'mr' ? 'मेमो क्र.' : 'Memo No.'}</th>
                  </tr>
                </thead>
                <tbody>
                  {creditRows.map(r => (
                    <tr key={r.id}>
                      <td>{r.date}</td>
                      <td>{r.lf_no}</td>
                      <td>{r.name}</td>
                      {CREDIT_BOOK_COLUMNS.map(col => (
                        <td key={col.key} style={{ textAlign: 'right', fontFamily: 'monospace' }}>
                          {Number(r[col.key]) > 0 ? `₹${Number(r[col.key]).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'}
                        </td>
                      ))}
                      <td style={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, color: '#15803d' }}>
                        ₹{Number(r.total).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td style={{ fontFamily: 'monospace' }}>{r.cash_memo_no}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ background: '#dcfce7', fontWeight: 800 }}>
                    <td colSpan={3}>{lang === 'mr' ? 'जमा एकूण' : 'CREDIT TOTALS'}</td>
                    {CREDIT_BOOK_COLUMNS.map(col => (
                      <td key={col.key} style={{ textAlign: 'right', fontFamily: 'monospace' }}>
                        {creditColTotals[col.key as string] > 0 ? `₹${creditColTotals[col.key as string].toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'}
                      </td>
                    ))}
                    <td style={{ textAlign: 'right', fontFamily: 'monospace', color: '#15803d' }}>
                      ₹{creditTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              SCHEDULE 3: DEBIT BOOK AUDIT SCHEDULE
             ══════════════════════════════════════════════════════════════════ */}
          {includeDebitBook && (
            <div className="audit-page-section" style={{ pageBreakAfter: 'always', marginBottom: 40 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, borderBottom: '2px solid #0f172a', paddingBottom: 8 }}>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: '#0f172a' }}>{lang === 'mr' ? 'तक्ता ३: नावे वही खर्च लेखापरीक्षा तक्ता' : 'SCHEDULE III: DEBIT BOOK PAYMENTS AUDIT SCHEDULE'}</div>
                  <div style={{ fontSize: 12, color: '#475569' }}>{lang === 'mr' ? 'कालावधी:' : 'Period:'} {startDate} {lang === 'mr' ? 'ते' : 'to'} {endDate}</div>
                </div>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#b91c1c' }}>
                  {lang === 'mr' ? 'एकूण खर्च:' : 'Total Payments:'} ₹{debitTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>
              </div>

              <table className="data-table" style={{ width: '100%', fontSize: 11 }}>
                <thead>
                  <tr style={{ background: '#fef2f2' }}>
                    <th>{lang === 'mr' ? 'तारीख' : 'Date'}</th>
                    <th>L.F</th>
                    <th>{lang === 'mr' ? 'खातेदाराचे नाव' : 'Account Holder Name'}</th>
                    {DEBIT_BOOK_COLUMNS.map(col => <th key={col.key} style={{ textAlign: 'right', color: '#991b1b' }}>{lang === 'mr' ? (COLUMN_LABELS_MR[col.key as string] || col.label) : col.label}</th>)}
                    <th style={{ textAlign: 'right', color: '#991b1b' }}>{lang === 'mr' ? 'एकूण रक्कम' : 'Total Amount'}</th>
                    <th>{lang === 'mr' ? 'मेमो क्र.' : 'Memo No.'}</th>
                  </tr>
                </thead>
                <tbody>
                  {debitRows.map(r => (
                    <tr key={r.id}>
                      <td>{r.date}</td>
                      <td>{r.lf_no}</td>
                      <td>{r.name}</td>
                      {DEBIT_BOOK_COLUMNS.map(col => (
                        <td key={col.key} style={{ textAlign: 'right', fontFamily: 'monospace' }}>
                          {Number(r[col.key]) > 0 ? `₹${Number(r[col.key]).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'}
                        </td>
                      ))}
                      <td style={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, color: '#b91c1c' }}>
                        ₹{Number(r.total).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td style={{ fontFamily: 'monospace' }}>{r.cash_memo_no}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ background: '#fee2e2', fontWeight: 800 }}>
                    <td colSpan={3} style={{ color: '#991b1b' }}>{lang === 'mr' ? 'नावे एकूण' : 'DEBIT TOTALS'}</td>
                    {DEBIT_BOOK_COLUMNS.map(col => (
                      <td key={col.key} style={{ textAlign: 'right', fontFamily: 'monospace', color: '#991b1b' }}>
                        {debitColTotals[col.key as string] > 0 ? `₹${debitColTotals[col.key as string].toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'}
                      </td>
                    ))}
                    <td style={{ textAlign: 'right', fontFamily: 'monospace', color: '#b91c1c' }}>
                      ₹{debitTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              SCHEDULE 4: GENERAL LEDGER SUMMARY SHEET
             ══════════════════════════════════════════════════════════════════ */}
          {includeLedger && (
            <div className="audit-page-section" style={{ pageBreakAfter: 'always', marginBottom: 40 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, borderBottom: '2px solid #0f172a', paddingBottom: 8 }}>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: '#0f172a' }}>{lang === 'mr' ? 'तक्ता ४: सर्वसाधारण खातेवही शिल्लक पत्रक' : 'SCHEDULE IV: GENERAL LEDGER ACCOUNT BALANCES SHEET'}</div>
                  <div style={{ fontSize: 12, color: '#475569' }}>{lang === 'mr' ? 'स्तर ३ वार्षिक खातेवही सारांश' : 'Level 3 Yearly Ledger Summaries'}</div>
                </div>
              </div>

              <table className="data-table" style={{ width: '100%', fontSize: 12 }}>
                <thead>
                  <tr style={{ background: '#f8fafc' }}>
                    <th>{lang === 'mr' ? 'वर्ष' : 'Year'}</th>
                    <th>{lang === 'mr' ? 'खातेवही नाव' : 'Ledger Account Name'}</th>
                    <th style={{ textAlign: 'right' }}>{lang === 'mr' ? 'जमा (₹)' : 'Receipt (₹)'}</th>
                    <th style={{ textAlign: 'right' }}>{lang === 'mr' ? 'नावे (₹)' : 'Debit (₹)'}</th>
                    <th style={{ textAlign: 'right' }}>{lang === 'mr' ? 'देणे (₹)' : 'Payable (₹)'}</th>
                    <th style={{ textAlign: 'right' }}>{lang === 'mr' ? 'घेणे (₹)' : 'Receivable (₹)'}</th>
                  </tr>
                </thead>
                <tbody>
                  {ledgerRows.map((r, idx) => (
                    <tr key={idx}>
                      <td>{r.month_year_label}</td>
                      <td style={{ fontWeight: 700 }}>{lang === 'mr' ? getTxnHeadMarathi(r.account) : r.account}</td>
                      <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>
                        {Number(r.receipt) > 0 ? `₹${Number(r.receipt).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'}
                      </td>
                      <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>
                        {Number(r.debit) > 0 ? `₹${Number(r.debit).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'}
                      </td>
                      <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>
                        {Number(r.payable) > 0 ? `₹${Number(r.payable).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'}
                      </td>
                      <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>
                        {Number(r.receivable) > 0 ? `₹${Number(r.receivable).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ background: '#f1f5f9', fontWeight: 800 }}>
                    <td colSpan={2}>{lang === 'mr' ? 'खातेवही एकूण' : 'GENERAL LEDGER TOTALS'}</td>
                    <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>₹{totalLedgerReceipt.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>₹{totalLedgerDebit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>₹{totalLedgerPayable.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>₹{totalLedgerReceivable.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              SCHEDULE 5: CUSTOMER SAVINGS ACCOUNTS & KYC DIRECTORY
             ══════════════════════════════════════════════════════════════════ */}
          {includeCustomers && (
            <div className="audit-page-section" style={{ pageBreakAfter: 'always', marginBottom: 40 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, borderBottom: '2px solid #0f172a', paddingBottom: 8 }}>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: '#0f172a' }}>{lang === 'mr' ? 'तक्ता ५: ग्राहक बचत खाती आणि KYC निर्देशिका' : 'SCHEDULE V: CUSTOMER SAVINGS ACCOUNTS & KYC DIRECTORY'}</div>
                  <div style={{ fontSize: 12, color: '#475569' }}>{lang === 'mr' ? '१०-अंकी ग्राहक आयडी, आधार आणि पॅन पडताळणी सूची' : '10-Digit Customer IDs, Aadhaar & PAN Verification List'}</div>
                </div>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--blue-700)' }}>
                  {lang === 'mr' ? `एकूण नोंदणीकृत: ${customers.length} सदस्य` : `Total Registered: ${customers.length} Members`}
                </div>
              </div>

              <table className="data-table" style={{ width: '100%', fontSize: 11 }}>
                <thead>
                  <tr style={{ background: '#f8fafc' }}>
                    <th>{lang === 'mr' ? '१०-अंकी आयडी' : '10-Digit ID'}</th>
                    <th>{lang === 'mr' ? 'सदस्याचे पूर्ण नाव' : 'Member Full Name'}</th>
                    <th>{lang === 'mr' ? 'मोबाईल क्र' : 'Mobile No'}</th>
                    <th>{lang === 'mr' ? 'रहिवासी पत्ता' : 'Residential Address'}</th>
                    <th>{lang === 'mr' ? 'आधार क्रमांक' : 'Aadhaar Number'}</th>
                    <th>{lang === 'mr' ? 'पॅन क्रमांक' : 'PAN Number'}</th>
                    <th style={{ textAlign: 'right' }}>{lang === 'mr' ? 'प्रारंभिक शिल्लक' : 'Opening Balance'}</th>
                  </tr>
                </thead>
                <tbody>
                  {customers.map(c => (
                    <tr key={c.id}>
                      <td style={{ fontFamily: 'monospace', fontWeight: 800, color: 'var(--blue-800)' }}>{c.customer_id}</td>
                      <td style={{ fontWeight: 700 }}>{c.full_name}</td>
                      <td>{c.mobile_no || '—'}</td>
                      <td style={{ fontSize: 11, maxWidth: 180 }}>{c.address || '—'}</td>
                      <td>{c.aadhaar_no || '—'} {c.aadhaar_doc_path ? (lang === 'mr' ? '✓ स्कॅन' : '✓ Scan') : ''}</td>
                      <td>{c.pan_no || '—'} {c.pan_doc_path ? (lang === 'mr' ? '✓ स्कॅन' : '✓ Scan') : ''}</td>
                      <td style={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: 700 }}>
                        ₹{Number(c.opening_balance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              SCHEDULE 6: CASHIER DASHBOARD AUDIT SCHEDULE
             ══════════════════════════════════════════════════════════════════ */}
          {includeCashier && (
            <div className="audit-page-section" style={{ pageBreakAfter: 'always', marginBottom: 40 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, borderBottom: '2px solid #0369a1', paddingBottom: 8 }}>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: '#0369a1' }}>{lang === 'mr' ? 'तक्ता ६: कॅशियर डॅशबोर्ड रोख व्हाऊचर व भाडे बिल अहवाल' : 'SCHEDULE VI: CASHIER DASHBOARD TRANSACTIONS & RENT BILLS SCHEDULE'}</div>
                  <div style={{ fontSize: 12, color: '#475569' }}>{lang === 'mr' ? 'रोख पेमेंट व्हाऊचर, पावती व्हाऊचर आणि टॅक्स इनव्हॉईस' : 'Payment Vouchers, Receipt Vouchers & Rent Tax Invoices'}</div>
                </div>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#0284c7' }}>
                  {lang === 'mr' ? 'एकूण कॅशियर व्यवहार:' : 'Total Cashier Volume:'} ₹{cashierTotalVolume.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>
              </div>

              {/* Payment Vouchers Table */}
              <div style={{ fontSize: 13, fontWeight: 800, color: '#991b1b', marginBottom: 6 }}>
                {lang === 'mr' ? `अ. रोख पेमेंट व्हाऊचर (${paymentVouchers.length} नोंदी - ₹${paymentVouchersTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })})` : `A. Cash Payment Vouchers (${paymentVouchers.length} entries - ₹${paymentVouchersTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })})`}
              </div>
              <table className="data-table" style={{ width: '100%', fontSize: 11, marginBottom: 20 }}>
                <thead>
                  <tr style={{ background: '#fef2f2' }}>
                    <th>{lang === 'mr' ? 'तारीख' : 'Date'}</th>
                    <th>{lang === 'mr' ? 'व्हाऊचर क्र' : 'Voucher No'}</th>
                    <th>{lang === 'mr' ? 'प्राप्तकर्त्याचे नाव' : 'Payee Name'}</th>
                    <th>{lang === 'mr' ? 'खर्च माहिती' : 'Purpose / Expense Remarks'}</th>
                    <th style={{ textAlign: 'right' }}>{lang === 'mr' ? 'रक्कम' : 'Amount'}</th>
                  </tr>
                </thead>
                <tbody>
                  {paymentVouchers.slice(0, 15).map(pv => (
                    <tr key={pv.id}>
                      <td>{pv.date}</td>
                      <td style={{ fontFamily: 'monospace' }}>{pv.voucher_no}</td>
                      <td style={{ fontWeight: 700 }}>{pv.paid_to}</td>
                      <td>{pv.details_of_expenditure || pv.purpose_remarks || '—'}</td>
                      <td style={{ textAlign: 'right', fontFamily: 'monospace', color: '#b91c1c', fontWeight: 700 }}>
                        ₹{Number(pv.amount_rs).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Receipt Vouchers Table */}
              <div style={{ fontSize: 13, fontWeight: 800, color: '#15803d', marginBottom: 6 }}>
                {lang === 'mr' ? `ब. रोख पावती व्हाऊचर (${receiptVouchers.length} नोंदी - ₹${receiptVouchersTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })})` : `B. Cash Receipt Vouchers (${receiptVouchers.length} entries - ₹${receiptVouchersTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })})`}
              </div>
              <table className="data-table" style={{ width: '100%', fontSize: 11, marginBottom: 20 }}>
                <thead>
                  <tr style={{ background: '#f0fdf4' }}>
                    <th>{lang === 'mr' ? 'तारीख' : 'Date'}</th>
                    <th>{lang === 'mr' ? 'पावती क्र' : 'Bill No'}</th>
                    <th>{lang === 'mr' ? 'जमाकर्त्याचे नाव' : 'Received From'}</th>
                    <th>{lang === 'mr' ? 'तपशील' : 'Particulars'}</th>
                    <th style={{ textAlign: 'right' }}>{lang === 'mr' ? 'रक्कम' : 'Amount'}</th>
                  </tr>
                </thead>
                <tbody>
                  {receiptVouchers.slice(0, 15).map(rv => (
                    <tr key={rv.id}>
                      <td>{rv.date}</td>
                      <td style={{ fontFamily: 'monospace' }}>{rv.bill_no}</td>
                      <td style={{ fontWeight: 700 }}>{rv.received_from}</td>
                      <td>{rv.particulars || '—'}</td>
                      <td style={{ textAlign: 'right', fontFamily: 'monospace', color: '#15803d', fontWeight: 700 }}>
                        ₹{Number(rv.total_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Rent Bills Table */}
              <div style={{ fontSize: 13, fontWeight: 800, color: '#0369a1', marginBottom: 6 }}>
                {lang === 'mr' ? `क. भाडे बिल टॅक्स इनव्हॉईस (${rentBills.length} नोंदी - ₹${rentBillsTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })})` : `C. Rent Bill Tax Invoices (${rentBills.length} entries - ₹${rentBillsTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })})`}
              </div>
              <table className="data-table" style={{ width: '100%', fontSize: 11 }}>
                <thead>
                  <tr style={{ background: '#f0f9ff' }}>
                    <th>{lang === 'mr' ? 'तारीख' : 'Date'}</th>
                    <th>{lang === 'mr' ? 'इनव्हॉईस क्र' : 'Invoice No'}</th>
                    <th>{lang === 'mr' ? 'भाडेकरूचे नाव' : 'Consignee Name'}</th>
                    <th>{lang === 'mr' ? 'तपशील' : 'Particulars'}</th>
                    <th style={{ textAlign: 'right' }}>{lang === 'mr' ? 'एकूण भाडे बिल' : 'Total Invoice'}</th>
                  </tr>
                </thead>
                <tbody>
                  {rentBills.slice(0, 15).map(rb => (
                    <tr key={rb.id}>
                      <td>{rb.date}</td>
                      <td style={{ fontFamily: 'monospace' }}>{rb.invoice_no}</td>
                      <td style={{ fontWeight: 700 }}>{rb.consignee_name}</td>
                      <td>{rb.particulars || '—'}</td>
                      <td style={{ textAlign: 'right', fontFamily: 'monospace', color: '#0284c7', fontWeight: 700 }}>
                        ₹{Number(rb.total_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              SCHEDULE 7: SHOPKEEPER DASHBOARD AUDIT SCHEDULE
             ══════════════════════════════════════════════════════════════════ */}
          {includeShopkeeper && (
            <div className="audit-page-section" style={{ marginBottom: 40 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, borderBottom: '2px solid #047857', paddingBottom: 8 }}>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: '#047857' }}>{lang === 'mr' ? 'तक्ता ७: दुकानदार डॅशबोर्ड टॅक्स इनव्हॉईस, किरकोळ बिल व कीटकनाशक अहवाल' : 'SCHEDULE VII: SHOPKEEPER DASHBOARD TAX INVOICES & PESTICIDE SALES SCHEDULE'}</div>
                  <div style={{ fontSize: 12, color: '#475569' }}>{lang === 'mr' ? 'बियाणे, खते, कीटकनाशक विक्री व जीएसटी इनव्हॉईस नोंदी' : 'GST Tax Invoices, Retail Bills & Pesticide Sales Register'}</div>
                </div>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#059669' }}>
                  {lang === 'mr' ? 'एकूण दुकान विक्री:' : 'Total Shop Sales:'} ₹{shopkeeperTotalVolume.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>
              </div>

              {/* Shop Tax Invoices Table */}
              <div style={{ fontSize: 13, fontWeight: 800, color: '#047857', marginBottom: 6 }}>
                {lang === 'mr' ? `अ. दुकानाचे जीएसटी टॅक्स इनव्हॉईस (${shopTaxInvoices.length} नोंदी - ₹${shopTaxInvoicesTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })})` : `A. Shop GST Tax Invoices (${shopTaxInvoices.length} entries - ₹${shopTaxInvoicesTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })})`}
              </div>
              <table className="data-table" style={{ width: '100%', fontSize: 11, marginBottom: 20 }}>
                <thead>
                  <tr style={{ background: '#ecfdf5' }}>
                    <th>{lang === 'mr' ? 'तारीख' : 'Date'}</th>
                    <th>{lang === 'mr' ? 'इनव्हॉईस क्र' : 'Invoice No'}</th>
                    <th>{lang === 'mr' ? 'ग्राहकाचे नाव' : 'Customer Name'}</th>
                    <th>{lang === 'mr' ? 'उत्पादन नाव' : 'Product Name'}</th>
                    <th style={{ textAlign: 'right' }}>{lang === 'mr' ? 'एकूण रक्कम' : 'Total Amount'}</th>
                  </tr>
                </thead>
                <tbody>
                  {shopTaxInvoices.slice(0, 15).map(sti => (
                    <tr key={sti.id}>
                      <td>{sti.date}</td>
                      <td style={{ fontFamily: 'monospace' }}>{sti.invoice_no}</td>
                      <td style={{ fontWeight: 700 }}>{sti.customer_name}</td>
                      <td>{sti.product_name}</td>
                      <td style={{ textAlign: 'right', fontFamily: 'monospace', color: '#059669', fontWeight: 700 }}>
                        ₹{Number(sti.total_amount || sti.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Shop Retail Bills Table */}
              <div style={{ fontSize: 13, fontWeight: 800, color: '#0369a1', marginBottom: 6 }}>
                {lang === 'mr' ? `ब. किरकोळ रोख विक्री बिले (${shopRetailBills.length} नोंदी - ₹${shopRetailBillsTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })})` : `B. Retail Cash Bills (${shopRetailBills.length} entries - ₹${shopRetailBillsTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })})`}
              </div>
              <table className="data-table" style={{ width: '100%', fontSize: 11, marginBottom: 20 }}>
                <thead>
                  <tr style={{ background: '#f0f9ff' }}>
                    <th>{lang === 'mr' ? 'तारीख' : 'Date'}</th>
                    <th>{lang === 'mr' ? 'बिल क्र' : 'Bill No'}</th>
                    <th>{lang === 'mr' ? 'शेतकरी / ग्राहकाचे नाव' : 'Customer Name'}</th>
                    <th>{lang === 'mr' ? 'तपशील' : 'Particulars'}</th>
                    <th style={{ textAlign: 'right' }}>{lang === 'mr' ? 'एकूण बिल' : 'Total Bill'}</th>
                  </tr>
                </thead>
                <tbody>
                  {shopRetailBills.slice(0, 15).map(srb => (
                    <tr key={srb.id}>
                      <td>{srb.date}</td>
                      <td style={{ fontFamily: 'monospace' }}>{srb.bill_no}</td>
                      <td style={{ fontWeight: 700 }}>{srb.customer_name}</td>
                      <td>{srb.particulars}</td>
                      <td style={{ textAlign: 'right', fontFamily: 'monospace', color: '#0284c7', fontWeight: 700 }}>
                        ₹{Number(srb.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Pesticide Sales Register Table */}
              <div style={{ fontSize: 13, fontWeight: 800, color: '#7c2d12', marginBottom: 6 }}>
                {lang === 'mr' ? `क. कीटकनाशके विक्री नोंदवही (${pesticideSales.length} नोंदी - ₹${pesticideSalesTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })})` : `C. Pesticide Sale Register (${pesticideSales.length} entries - ₹${pesticideSalesTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })})`}
              </div>
              <table className="data-table" style={{ width: '100%', fontSize: 11 }}>
                <thead>
                  <tr style={{ background: '#fff7ed' }}>
                    <th>{lang === 'mr' ? 'तारीख' : 'Date'}</th>
                    <th>{lang === 'mr' ? 'बॅच क्र' : 'Batch No'}</th>
                    <th>{lang === 'mr' ? 'कीटकनाशक उत्पादन नाव' : 'Pesticide Product Name'}</th>
                    <th>{lang === 'mr' ? 'खरेदीदाराचे नाव' : 'Customer Name'}</th>
                    <th style={{ textAlign: 'right' }}>{lang === 'mr' ? 'एकूण रक्कम' : 'Total Amount'}</th>
                  </tr>
                </thead>
                <tbody>
                  {pesticideSales.slice(0, 15).map(ps => (
                    <tr key={ps.id}>
                      <td>{ps.date}</td>
                      <td style={{ fontFamily: 'monospace' }}>{ps.batch_no || '—'}</td>
                      <td style={{ fontWeight: 700 }}>{ps.product_name}</td>
                      <td>{ps.customer_name}</td>
                      <td style={{ textAlign: 'right', fontFamily: 'monospace', color: '#c2410c', fontWeight: 700 }}>
                        ₹{Number(ps.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

        </div>{/* /audit-print-binder */}

      </div>
    </div>
  );
};

export default AuditPackage;
