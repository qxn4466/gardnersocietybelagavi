import React, { useState, useEffect } from 'react';
import { Printer, Save, Plus, Trash2, CheckCircle2, AlertCircle, Banknote, CreditCard } from 'lucide-react';
import { fetchNextRentInvoiceNo, createRentBill, fetchRentBills, deleteRentBill } from '../../api/client';
import type { RentBill, User } from '../../types';
import { RENT_PARTICULARS_OPTIONS } from '../../types';
import { useTranslation } from '../../hooks/useTranslation';
import { ITEM_TRANSLATIONS } from '../../i18n/translations';

interface RentBillFormProps {
  user?: User | null;
}

const numberToWords = (num: number): string => {
  if (isNaN(num) || num === 0) return 'Zero Rupees Only';
  const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const inWords = (n: number): string => {
    if (n < 20) return a[n];
    if (n < 100) return b[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + a[n % 10] : '');
    if (n < 1000) return a[Math.floor(n / 100)] + 'Hundred ' + (n % 100 !== 0 ? 'and ' + inWords(n % 100) : '');
    if (n < 100000) return inWords(Math.floor(n / 1000)) + 'Thousand ' + (n % 1000 !== 0 ? inWords(n % 1000) : '');
    if (n < 10000000) return inWords(Math.floor(n / 100000)) + 'Lakh ' + (n % 100000 !== 0 ? inWords(n % 100000) : '');
    return inWords(Math.floor(n / 10000000)) + 'Crore ' + (n % 10000000 !== 0 ? inWords(n % 10000000) : '');
  };

  const rupees = Math.floor(num);
  const paise = Math.round((num - rupees) * 100);
  let str = inWords(rupees).trim() + ' Rupees';
  if (paise > 0) {
    str += ' and ' + inWords(paise).trim() + ' Paise';
  }
  return str + ' Only';
};

const RentBillForm: React.FC<RentBillFormProps> = ({ user }) => {
  const { lang } = useTranslation();
  const today = new Date().toISOString().split('T')[0];

  const [date, setDate] = useState(today);
  const [invoiceNo, setInvoiceNo] = useState('');
  const [consigneeName, setConsigneeName] = useState('');
  const [consigneeAddress, setConsigneeAddress] = useState('');
  const [particularsSelect, setParticularsSelect] = useState(RENT_PARTICULARS_OPTIONS[0]);
  const [customParticulars, setCustomParticulars] = useState('');
  const [hsnSac, setHsnSac] = useState('997212');
  const [gstRate, setGstRate] = useState<number>(18);
  const [qty, setQty] = useState<string>('1');
  const [rate, setRate] = useState<string>('');
  const [per, setPer] = useState('Month');

  const [paymentMode, setPaymentMode] = useState<'CASH' | 'CHEQUE'>('CASH');
  const [chequeNo, setChequeNo] = useState('');
  const [chequeDate, setChequeDate] = useState(today);
  const [bankName, setBankName] = useState('');

  // Calculated fields
  const [baseAmount, setBaseAmount] = useState<number>(0);
  const [sgstAmount, setSgstAmount] = useState<number>(0);
  const [cgstAmount, setCgstAmount] = useState<number>(0);
  const [igstAmount, setIgstAmount] = useState<number>(0);
  const [totalAmount, setTotalAmount] = useState<number>(0);
  const [taxWords, setTaxWords] = useState('');

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [history, setHistory] = useState<RentBill[]>([]);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [selectedBill, setSelectedBill] = useState<RentBill | null>(null);

  useEffect(() => {
    loadNextInvoiceNo(date);
    loadHistory();
  }, [date]);

  useEffect(() => {
    const q = parseFloat(qty) || 0;
    const r = parseFloat(rate) || 0;
    const base = q * r;
    setBaseAmount(base);

    const sgst = base * 0.09;
    const cgst = base * 0.09;
    setSgstAmount(sgst);
    setCgstAmount(cgst);
    setIgstAmount(0);

    const grand = base + sgst + cgst;
    setTotalAmount(grand);
    setTaxWords(numberToWords(grand));
  }, [qty, rate, gstRate]);

  const loadNextInvoiceNo = async (d: string) => {
    try {
      const res = await fetchNextRentInvoiceNo(d);
      setInvoiceNo(res.invoice_no);
    } catch {
      // ignore
    }
  };

  const loadHistory = async () => {
    try {
      const data = await fetchRentBills();
      setHistory(data);
    } catch {
      // ignore
    }
  };

  const handleReset = () => {
    setDate(today);
    setConsigneeName('');
    setConsigneeAddress('');
    setParticularsSelect(RENT_PARTICULARS_OPTIONS[0]);
    setCustomParticulars('');
    setRate('');
    setPaymentMode('CASH');
    setChequeNo('');
    setChequeDate(today);
    setBankName('');
    setMsg(null);
    loadNextInvoiceNo(today);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!consigneeName.trim()) {
      setMsg({ type: 'error', text: lang === 'mr' ? 'कृपया भाडेकरू / ग्राहक नाव प्रविष्ट करा.' : 'Please enter Consignee / Rentee Name.' });
      return;
    }
    if (baseAmount <= 0) {
      setMsg({ type: 'error', text: lang === 'mr' ? 'अमान्य भाडे रक्कम.' : 'Invalid Rent Rate / Amount.' });
      return;
    }
    if (paymentMode === 'CHEQUE' && !chequeNo.trim()) {
      setMsg({ type: 'error', text: lang === 'mr' ? 'कृपया चेक क्रमांक प्रविष्ट करा.' : 'Please enter Cheque Number for cheque payment.' });
      return;
    }

    const finalParticulars = customParticulars.trim()
      ? `${particularsSelect} - ${customParticulars.trim()}`
      : particularsSelect;

    setLoading(true);
    setMsg(null);
    try {
      const created = await createRentBill({
        date,
        invoice_no: invoiceNo,
        consignee_name: consigneeName.trim(),
        consignee_address: consigneeAddress.trim(),
        particulars: finalParticulars,
        hsn_sac: hsnSac,
        gst_rate: gstRate,
        qty: parseFloat(qty) || 1,
        rate: parseFloat(rate) || 0,
        per,
        amount: baseAmount,
        igst_amount: igstAmount,
        sgst_amount: sgstAmount,
        cgst_amount: cgstAmount,
        total_amount: totalAmount,
        tax_amount_words: taxWords,
        payment_mode: paymentMode,
        cheque_no: paymentMode === 'CHEQUE' ? chequeNo.trim() : undefined,
        cheque_date: paymentMode === 'CHEQUE' ? chequeDate : undefined,
        bank_name: paymentMode === 'CHEQUE' ? bankName.trim() : undefined,
        created_by: user?.username || 'cashier',
      });

      const modeNote = paymentMode === 'CHEQUE'
        ? (lang === 'mr' ? ' स्क्रोल पुस्तक व चेक बुकमध्ये स्वयंचलित नोंदवली!' : ' Auto-updated in Cash Scroll & Cheque Book!')
        : (lang === 'mr' ? ' स्क्रोल पुस्तक (जमा/Received) मध्ये स्वयंचलित नोंदवली!' : ' Auto-updated in Cash Scroll Book!');

      setMsg({
        type: 'success',
        text: (lang === 'mr' ? `भाडे बिल टॅक्स इनव्हॉईस ${created.invoice_no} जतन केले!` : `Rent Bill Tax Invoice ${created.invoice_no} saved!`) + modeNote
      });
      setSelectedBill(created);
      loadHistory();
      handleReset();
    } catch {
      setMsg({ type: 'error', text: lang === 'mr' ? 'भाडे बिल जतन करताना त्रुटी आली.' : 'Error saving rent bill invoice.' });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm(lang === 'mr' ? 'तुम्हाला हे भाडे बिल हटवायचे आहे का?' : 'Are you sure you want to delete this rent bill?')) return;
    try {
      await deleteRentBill(id);
      loadHistory();
    } catch {
      // ignore
    }
  };

  const handlePrint = (b: RentBill) => {
    setSelectedBill(b);
    setShowPrintModal(true);
  };

  return (
    <div className="card" style={{ padding: 24, marginBottom: 30 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, borderBottom: '1px solid var(--border-subtle)', paddingBottom: 12 }}>
        <div>
          <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>
            3. {lang === 'mr' ? 'भाडे बिल फॉर्म / टॅक्स इनव्हॉईस (Rent Bill Form)' : 'Rent Bill Form (Tax Invoice)'}
          </h3>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            {lang === 'mr' ? 'गाळा/दुकान भाड्याचे जीएसटी इनव्हॉईस (स्क्रोल व चेक बुकमध्ये ऑटो-अपडेट)' : 'Create GST Tax Invoice (Auto-posts to Cash Scroll & Cheque Book)'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {history.length > 0 && (
            <button className="btn btn-primary btn-sm" onClick={() => handlePrint(history[0])}>
              <Printer size={14} /> {lang === 'mr' ? 'प्रिंट करा' : 'Print'}
            </button>
          )}
          <button className="btn btn-secondary btn-sm" onClick={handleReset}>
            <Plus size={14} /> {lang === 'mr' ? 'नवीन फॉर्म' : 'New Form'}
          </button>
        </div>
      </div>

      {msg && (
        <div className={`alert ${msg.type === 'success' ? 'alert-success' : 'alert-error'}`} style={{ marginBottom: 16 }}>
          {msg.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          {msg.text}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 16 }}>
          <div className="form-group">
            <label className="form-label">{lang === 'mr' ? 'इनव्हॉईस क्र. (Invoice No.)' : 'Invoice No.'}</label>
            <input type="text" className="form-input" value={invoiceNo} onChange={e => setInvoiceNo(e.target.value)} required />
          </div>
          <div className="form-group">
            <label className="form-label">{lang === 'mr' ? 'दिनांक (Date)' : 'Date'}</label>
            <input type="date" className="form-input" value={date} onChange={e => setDate(e.target.value)} required />
          </div>
          <div className="form-group" style={{ gridColumn: 'span 2' }}>
            <label className="form-label">{lang === 'mr' ? 'भाडेकरूचे नाव (Consignee / Rentee Name)' : 'Consignee / Rentee Name'}</label>
            <input
              type="text"
              className="form-input"
              placeholder={lang === 'mr' ? 'भाडेकरू व्यक्तीचे/कंपनीचे नाव' : 'Name of shop / stall rentee'}
              value={consigneeName}
              onChange={e => setConsigneeName(e.target.value)}
              required
            />
          </div>
        </div>

        {/* Payment Mode (CASH vs CHEQUE) */}
        <div style={{ background: '#f1f5f9', padding: 14, borderRadius: 8, border: '1px solid #cbd5e1', marginBottom: 16 }}>
          <label className="form-label" style={{ fontWeight: 700, marginBottom: 8, display: 'block' }}>
            {lang === 'mr' ? 'भाडे स्वीकार प्रकार (Payment Mode):' : 'Payment Mode:'}
          </label>
          <div style={{ display: 'flex', gap: 20, marginBottom: paymentMode === 'CHEQUE' ? 12 : 0 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontWeight: 600, fontSize: 14 }}>
              <input
                type="radio"
                name="paymentModeRent"
                value="CASH"
                checked={paymentMode === 'CASH'}
                onChange={() => setPaymentMode('CASH')}
              />
              <Banknote size={16} color="#16a34a" />
              {lang === 'mr' ? 'रोख (Cash) → स्क्रोल बुकात जमा होईल' : 'Cash → Updates Cash Scroll (Received)'}
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontWeight: 600, fontSize: 14 }}>
              <input
                type="radio"
                name="paymentModeRent"
                value="CHEQUE"
                checked={paymentMode === 'CHEQUE'}
                onChange={() => setPaymentMode('CHEQUE')}
              />
              <CreditCard size={16} color="#2563eb" />
              {lang === 'mr' ? 'चेक (Cheque) → स्क्रोल व चेक बुकमध्ये ऑटो-अपडेट' : 'Cheque → Updates Scroll & Cheque Book'}
            </label>
          </div>

          {paymentMode === 'CHEQUE' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginTop: 10, paddingTop: 10, borderTop: '1px dashed #cbd5e1' }}>
              <div className="form-group">
                <label className="form-label" style={{ fontSize: 12 }}>{lang === 'mr' ? 'चेक क्र. (Cheque No.)' : 'Cheque No.'}</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. CHQ-77201"
                  value={chequeNo}
                  onChange={e => setChequeNo(e.target.value)}
                  required={paymentMode === 'CHEQUE'}
                />
              </div>
              <div className="form-group">
                <label className="form-label" style={{ fontSize: 12 }}>{lang === 'mr' ? 'चेक दिनांक' : 'Cheque Date'}</label>
                <input
                  type="date"
                  className="form-input"
                  value={chequeDate}
                  onChange={e => setChequeDate(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label" style={{ fontSize: 12 }}>{lang === 'mr' ? 'बँकेचे नाव' : 'Bank Name'}</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. SBI Belagavi"
                  value={bankName}
                  onChange={e => setBankName(e.target.value)}
                />
              </div>
            </div>
          )}
        </div>

        <div className="form-group" style={{ marginBottom: 16 }}>
          <label className="form-label">{lang === 'mr' ? 'पत्ता (Consignee Address)' : 'Consignee Address'}</label>
          <input
            type="text"
            className="form-input"
            placeholder={lang === 'mr' ? 'गाळा क्र. / मार्केट परिसर पत्ता' : 'Stall / Shop No. & Address'}
            value={consigneeAddress}
            onChange={e => setConsigneeAddress(e.target.value)}
          />
        </div>

        {/* Dropdown for Rent Bill Particulars (7 Required Items) */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
          <div className="form-group">
            <label className="form-label">{lang === 'mr' ? 'भाडे प्रकार / तपशील (Rent Category Particulars)' : 'Rent Category Particulars'}</label>
            <select
              className="form-input"
              value={particularsSelect}
              onChange={e => setParticularsSelect(e.target.value)}
            >
              {RENT_PARTICULARS_OPTIONS.map(opt => (
                <option key={opt} value={opt}>
                  {lang === 'mr' ? (ITEM_TRANSLATIONS[opt] || opt) : opt}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">{lang === 'mr' ? 'कालावधी / गाळा क्र. (Month / Stall Ref)' : 'Month / Stall Ref'}</label>
            <input
              type="text"
              className="form-input"
              placeholder={lang === 'mr' ? 'उदा. जून २०२६ - गाळा क्र. १२' : 'e.g. June 2026 - Stall No. 12'}
              value={customParticulars}
              onChange={e => setCustomParticulars(e.target.value)}
            />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
          <div className="form-group">
            <label className="form-label">HSN / SAC</label>
            <input type="text" className="form-input" value={hsnSac} onChange={e => setHsnSac(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">{lang === 'mr' ? 'प्रमाण (Qty)' : 'Qty'}</label>
            <input type="number" step="0.1" className="form-input" value={qty} onChange={e => setQty(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">{lang === 'mr' ? 'दर ₹ (Rate)' : 'Rate (₹)'}</label>
            <input type="number" step="0.01" className="form-input" placeholder="0.00" value={rate} onChange={e => setRate(e.target.value)} required />
          </div>
          <div className="form-group">
            <label className="form-label">{lang === 'mr' ? 'प्रति (Per)' : 'Per'}</label>
            <input type="text" className="form-input" value={per} onChange={e => setPer(e.target.value)} />
          </div>
        </div>

        {/* GST Calculation Table Box matching Image #1 */}
        <div style={{ background: 'var(--surface-subtle)', padding: 16, borderRadius: 8, border: '1px solid var(--border-subtle)', marginBottom: 20 }}>
          <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, color: 'var(--text-primary)' }}>
            {lang === 'mr' ? 'जीएसटी कर व एकूण बेरीज (Tax & Grand Total Calculations)' : 'Tax & Grand Total Calculations'}
          </h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, fontSize: 13 }}>
            <div>
              <span style={{ color: 'var(--text-secondary)' }}>Subtotal:</span>
              <div style={{ fontWeight: 700 }}>₹{baseAmount.toFixed(2)}</div>
            </div>
            <div>
              <span style={{ color: 'var(--text-secondary)' }}>SGST (9%):</span>
              <div style={{ fontWeight: 600 }}>₹{sgstAmount.toFixed(2)}</div>
            </div>
            <div>
              <span style={{ color: 'var(--text-secondary)' }}>CGST (9%):</span>
              <div style={{ fontWeight: 600 }}>₹{cgstAmount.toFixed(2)}</div>
            </div>
            <div>
              <span style={{ color: 'var(--text-secondary)' }}>Grand Total:</span>
              <div style={{ fontWeight: 700, fontSize: 16, color: '#16a34a' }}>₹{totalAmount.toFixed(2)}</div>
            </div>
          </div>
          <div style={{ marginTop: 10, fontSize: 12, fontStyle: 'italic', color: 'var(--text-muted)' }}>
            {taxWords}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12 }}>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            <Save size={16} /> {loading ? (lang === 'mr' ? 'जतन होत आहे...' : 'Saving...') : (lang === 'mr' ? 'भाडे बिल इनव्हॉईस जतन करा' : 'Save Rent Invoice')}
          </button>
          <button type="button" className="btn btn-secondary" onClick={handleReset}>
            {lang === 'mr' ? 'रीसेट' : 'Reset'}
          </button>
        </div>
      </form>

      {/* History Register */}
      <div style={{ marginTop: 30, borderTop: '1px solid var(--border-subtle)', paddingTop: 20 }}>
        <h4 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>
          {lang === 'mr' ? 'अलीकडील भाडे बिल टॅक्स इनव्हॉईस नोंदी' : 'Recent Rent Bill Tax Invoices'}
        </h4>
        {history.length === 0 ? (
          <div style={{ fontSize: 13, color: 'var(--text-muted)', fontStyle: 'italic' }}>
            {lang === 'mr' ? 'कोणत्याही भाडे बिल नोंदी आढळल्या नाहीत.' : 'No rent bills found.'}
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table" style={{ width: '100%', fontSize: 13 }}>
              <thead>
                <tr>
                  <th>{lang === 'mr' ? 'इनव्हॉईस क्र.' : 'Invoice No.'}</th>
                  <th>{lang === 'mr' ? 'दिनांक' : 'Date'}</th>
                  <th>{lang === 'mr' ? 'भाडेकरू' : 'Consignee / Rentee'}</th>
                  <th>{lang === 'mr' ? 'प्रकार' : 'Mode'}</th>
                  <th>{lang === 'mr' ? 'तपशील' : 'Particulars'}</th>
                  <th style={{ textAlign: 'right' }}>{lang === 'mr' ? 'मूलभूत रक्कम ₹' : 'Base Amt (₹)'}</th>
                  <th style={{ textAlign: 'right' }}>{lang === 'mr' ? 'एकूण इनव्हॉईस ₹' : 'Total Invoice (₹)'}</th>
                  <th style={{ textAlign: 'center' }}>{lang === 'mr' ? 'कृती' : 'Action'}</th>
                </tr>
              </thead>
              <tbody>
                {history.map(row => (
                  <tr key={row.id}>
                    <td style={{ fontWeight: 600 }}>{row.invoice_no}</td>
                    <td>{row.date}</td>
                    <td>{row.consignee_name}</td>
                    <td>
                      <span className={`badge ${row.payment_mode === 'CHEQUE' ? 'badge-primary' : 'badge-secondary'}`}>
                        {row.payment_mode || 'CASH'} {row.cheque_no ? `(${row.cheque_no})` : ''}
                      </span>
                    </td>
                    <td>{lang === 'mr' ? (ITEM_TRANSLATIONS[row.particulars || ''] || row.particulars) : row.particulars}</td>
                    <td style={{ textAlign: 'right' }}>₹{Number(row.amount).toFixed(2)}</td>
                    <td style={{ textAlign: 'right', fontWeight: 700, color: '#16a34a' }}>₹{Number(row.total_amount).toFixed(2)}</td>
                    <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                      <button className="btn btn-secondary btn-sm" onClick={() => handlePrint(row)} style={{ marginRight: 6 }}>
                        <Printer size={13} /> {lang === 'mr' ? 'इनव्हॉईस' : 'Invoice'}
                      </button>
                      <button className="btn btn-danger btn-sm" onClick={() => handleDelete(row.id)}>
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Printable Invoice View matching Image #1 */}
      {(showPrintModal || selectedBill) && selectedBill && (
        <div className="modal-backdrop" style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999
        }}>
          <div className="modal-content" style={{ background: '#fff', width: '90%', maxWidth: 750, padding: 30, borderRadius: 8, boxShadow: '0 20px 40px rgba(0,0,0,0.3)', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
              <h4 style={{ fontWeight: 700 }}>{lang === 'mr' ? 'भाडे बिल पूर्वावलोकन व मुद्रण' : 'Rent Bill Tax Invoice Preview & Print'}</h4>
              <div>
                <button className="btn btn-primary btn-sm" onClick={() => window.print()} style={{ marginRight: 8 }}>
                  <Printer size={14} /> {lang === 'mr' ? 'प्रिंट' : 'Print'}
                </button>
                <button className="btn btn-secondary btn-sm" onClick={() => { setShowPrintModal(false); setSelectedBill(null); }}>
                  {lang === 'mr' ? 'बंद करा' : 'Close'}
                </button>
              </div>
            </div>

            {/* Print Container matching Image #1 layout */}
            <div className="printable-tax-invoice" style={{ border: '2px solid #000', padding: 24, fontFamily: 'sans-serif', background: '#fff', color: '#000' }}>
              <div style={{ textAlign: 'center', borderBottom: '2px solid #000', paddingBottom: 8, marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontWeight: 'bold' }}>
                  <span>GSTIN : 29AAAAT4655K1Z1</span>
                  <span>TAX INVOICE</span>
                  <span>H.O. : 2460554</span>
                </div>
                <h3 style={{ fontSize: 15, fontWeight: 'bold', margin: '4px 0' }}>
                  THE BELGAUM GARDENERS CO-OP. PRODUCTION SUPPLY AND SALE SOCIETY LTD., BELGAUM.
                </h3>
                <div style={{ fontSize: 12 }}>
                  930/1A Zanda Chowk Market, BELAGAVI - 590 002.
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10, fontSize: 13 }}>
                <div><strong>No.:</strong> {selectedBill.invoice_no}</div>
                <div><strong>Date:</strong> {selectedBill.date}</div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14, fontSize: 13, borderBottom: '1px solid #000', paddingBottom: 8 }}>
                <div><strong>Consignee:</strong> {selectedBill.consignee_name} {selectedBill.consignee_address ? `(${selectedBill.consignee_address})` : ''}</div>
                <div><strong>Mode:</strong> {selectedBill.payment_mode || 'CASH'} {selectedBill.cheque_no ? `(Chq: ${selectedBill.cheque_no})` : ''}</div>
              </div>

              {/* Items Table */}
              <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 14, fontSize: 12 }}>
                <thead>
                  <tr style={{ borderTop: '1px solid #000', borderBottom: '1px solid #000', background: '#f5f5f5' }}>
                    <th style={{ border: '1px solid #000', padding: 6 }}>Sl. NO.</th>
                    <th style={{ border: '1px solid #000', padding: 6 }}>Particulars</th>
                    <th style={{ border: '1px solid #000', padding: 6 }}>HSN / SAC</th>
                    <th style={{ border: '1px solid #000', padding: 6 }}>GST Rate</th>
                    <th style={{ border: '1px solid #000', padding: 6 }}>Qty</th>
                    <th style={{ border: '1px solid #000', padding: 6 }}>Rate</th>
                    <th style={{ border: '1px solid #000', padding: 6 }}>Per</th>
                    <th style={{ border: '1px solid #000', padding: 6, textAlign: 'right' }}>AMOUNT</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ minHeight: 60 }}>
                    <td style={{ border: '1px solid #000', padding: 6, textAlign: 'center' }}>1</td>
                    <td style={{ border: '1px solid #000', padding: 6 }}>{selectedBill.particulars || 'Shop Rent'}</td>
                    <td style={{ border: '1px solid #000', padding: 6, textAlign: 'center' }}>{selectedBill.hsn_sac || '997212'}</td>
                    <td style={{ border: '1px solid #000', padding: 6, textAlign: 'center' }}>{selectedBill.gst_rate}%</td>
                    <td style={{ border: '1px solid #000', padding: 6, textAlign: 'center' }}>{selectedBill.qty}</td>
                    <td style={{ border: '1px solid #000', padding: 6, textAlign: 'right' }}>₹{Number(selectedBill.rate).toFixed(2)}</td>
                    <td style={{ border: '1px solid #000', padding: 6, textAlign: 'center' }}>{selectedBill.per || 'Month'}</td>
                    <td style={{ border: '1px solid #000', padding: 6, textAlign: 'right', fontWeight: 'bold' }}>₹{Number(selectedBill.amount).toFixed(2)}</td>
                  </tr>
                </tbody>
              </table>

              {/* Bottom Totals */}
              <div style={{ display: 'flex', justifyContent: 'space-between', border: '1px solid #000', padding: 10, fontSize: 12, marginBottom: 12 }}>
                <div style={{ width: '55%' }}>
                  <strong>Bank Details:</strong><br />
                  Current A/c No: __________________<br />
                  Branch: Belagavi<br />
                  IFSC Code: __________________
                </div>
                <div style={{ width: '40%', borderLeft: '1px solid #000', paddingLeft: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                    <span>TOTAL:</span>
                    <span>₹{Number(selectedBill.amount).toFixed(2)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                    <span>SGST 9%:</span>
                    <span>₹{Number(selectedBill.sgst_amount).toFixed(2)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                    <span>CGST 9%:</span>
                    <span>₹{Number(selectedBill.cgst_amount).toFixed(2)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', borderTop: '1px solid #000', paddingTop: 4, marginTop: 4 }}>
                    <span>GRAND TOTAL:</span>
                    <span>₹{Number(selectedBill.total_amount).toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <div style={{ fontSize: 12, marginBottom: 30 }}>
                <strong>Tax Amount (in words):</strong> {selectedBill.tax_amount_words}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', textAlign: 'center', fontSize: 12, fontWeight: 'bold', marginTop: 30 }}>
                <div>Manager<br /><br />_______________</div>
                <div>Cashier<br /><br />_______________</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RentBillForm;
