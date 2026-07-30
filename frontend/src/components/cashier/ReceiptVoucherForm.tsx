import React, { useState, useEffect } from 'react';
import { Printer, Save, Plus, Trash2, CheckCircle2, AlertCircle, Upload, Eye, Download, Banknote, CreditCard, Zap } from 'lucide-react';
import { fetchNextReceiptBillNo, createReceiptVoucher, fetchReceiptVouchers, deleteReceiptVoucher, fetchOffice, uploadCashierReceipt, getFileUrl, generate30DaysCashierTestData, delete30DaysCashierTestData } from '../../api/client';
import type { CashReceiptVoucher, User, OfficeMaster } from '../../types';
import { RECEIPT_PARTICULARS_OPTIONS } from '../../types';
import { useTranslation } from '../../hooks/useTranslation';
import { ITEM_TRANSLATIONS } from '../../i18n/translations';
import { translateToMarathi } from '../../utils/translator';



interface ReceiptVoucherFormProps {
  user?: User | null;
}

const ReceiptVoucherForm: React.FC<ReceiptVoucherFormProps> = ({ user }) => {
  const { lang } = useTranslation();
  const today = new Date().toISOString().split('T')[0];

  const [date, setDate] = useState(today);
  const [billNo, setBillNo] = useState('');
  const [gstNo, setGstNo] = useState('29AAAAT4655K1Z1');
  const [phoneNo, setPhoneNo] = useState('2460554');
  const [receivedFrom, setReceivedFrom] = useState('');
  const [particularsSelect, setParticularsSelect] = useState(RECEIPT_PARTICULARS_OPTIONS[0]);
  const [customParticulars, setCustomParticulars] = useState('');
  const [loanAmount, setLoanAmount] = useState<string>('0');
  const [interestAmount, setInterestAmount] = useState<string>('0');
  const [totalAmount, setTotalAmount] = useState<number>(0);

  const [paymentMode, setPaymentMode] = useState<'CASH' | 'CHEQUE'>('CASH');
  const [chequeNo, setChequeNo] = useState('');
  const [chequeDate, setChequeDate] = useState(today);
  const [bankName, setBankName] = useState('');

  const [receiptDocPath, setReceiptDocPath] = useState('');
  const [uploading, setUploading] = useState(false);

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [history, setHistory] = useState<CashReceiptVoucher[]>([]);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<CashReceiptVoucher | null>(null);

  useEffect(() => {
    loadNextBillNo(date);
    loadHistory();
    loadOfficeDetails();
  }, [date]);

  useEffect(() => {
    const l = parseFloat(loanAmount) || 0;
    const i = parseFloat(interestAmount) || 0;
    setTotalAmount(l + i);
  }, [loanAmount, interestAmount]);

  const loadOfficeDetails = async () => {
    try {
      const off: OfficeMaster = await fetchOffice();
      if (off) {
        if (off.gst_no) setGstNo(off.gst_no);
        if (off.phone1) setPhoneNo(off.phone1);
      }
    } catch {
      // ignore
    }
  };

  const loadNextBillNo = async (d: string) => {
    try {
      const res = await fetchNextReceiptBillNo(d);
      setBillNo(res.bill_no);
    } catch {
      // ignore
    }
  };

  const loadHistory = async () => {
    try {
      const data = await fetchReceiptVouchers();
      setHistory(data);
    } catch {
      // ignore
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const res = await uploadCashierReceipt(file);
      setReceiptDocPath(res.filepath);
      setMsg({ type: 'success', text: lang === 'mr' ? 'पावती फाइल यशस्वीरित्या अपलोड झाली!' : 'Receipt document uploaded successfully!' });
    } catch {
      setMsg({ type: 'error', text: lang === 'mr' ? 'फाइल अपलोड अपयशी ठरले.' : 'File upload failed.' });
    } finally {
      setUploading(false);
    }
  };

  const handleReset = () => {
    setDate(today);
    setReceivedFrom('');
    setParticularsSelect(RECEIPT_PARTICULARS_OPTIONS[0]);
    setCustomParticulars('');
    setLoanAmount('0');
    setInterestAmount('0');
    setPaymentMode('CASH');
    setChequeNo('');
    setChequeDate(today);
    setBankName('');
    setReceiptDocPath('');
    setMsg(null);
    loadNextBillNo(today);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!receivedFrom.trim()) {
      setMsg({ type: 'error', text: lang === 'mr' ? 'कृपया जमा देणाऱ्या व्यक्तीचे नाव प्रविष्ट करा.' : 'Please enter Received From name.' });
      return;
    }
    if (totalAmount <= 0) {
      setMsg({ type: 'error', text: lang === 'mr' ? 'कृपया कर्जाची रक्कम किंवा व्याजाची रक्कम प्रविष्ट करा.' : 'Please enter Loan Amount or Interest Amount.' });
      return;
    }
    if (paymentMode === 'CHEQUE' && !chequeNo.trim()) {
      setMsg({ type: 'error', text: lang === 'mr' ? 'कृपया चेक क्रमांक प्रविष्ट करा.' : 'Please enter Cheque Number for cheque receipt.' });
      return;
    }

    const finalParticulars = customParticulars.trim()
      ? `${particularsSelect} - ${customParticulars.trim()}`
      : particularsSelect;

    setLoading(true);
    setMsg(null);
    try {
      const created = await createReceiptVoucher({
        date,
        bill_no: billNo,
        gst_no: gstNo,
        phone_no: phoneNo,
        received_from: receivedFrom.trim(),
        particulars: finalParticulars,
        loan_amount: parseFloat(loanAmount) || 0,
        interest_amount: parseFloat(interestAmount) || 0,
        total_amount: totalAmount,
        receipt_doc_path: receiptDocPath || undefined,
        payment_mode: paymentMode,
        cheque_no: paymentMode === 'CHEQUE' ? chequeNo.trim() : undefined,
        cheque_date: paymentMode === 'CHEQUE' ? chequeDate : undefined,
        bank_name: paymentMode === 'CHEQUE' ? bankName.trim() : undefined,
        created_by: user?.username || 'cashier',
      });

      const modeNote = paymentMode === 'CHEQUE'
        ? (lang === 'mr' ? ' स्क्रोल पुस्तक व चेक बुकमध्ये स्वयंचलित नोंदवली!' : ' Auto-updated in Cash Scroll & Cheque Issue Book!')
        : (lang === 'mr' ? ' स्क्रोल पुस्तक (जमा/Received) मध्ये स्वयंचलित नोंदवली!' : ' Auto-updated in Cash Scroll Book!');

      setMsg({
        type: 'success',
        text: (lang === 'mr' ? `पावती बिल क्र. ${created.bill_no} जतन केले!` : `Cash Receipt Voucher ${created.bill_no} saved!`) + modeNote
      });
      setSelectedReceipt(created);
      loadHistory();
      handleReset();
    } catch {
      setMsg({ type: 'error', text: lang === 'mr' ? 'पावती जतन करताना त्रुटी आली.' : 'Error saving receipt voucher.' });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm(lang === 'mr' ? 'तुम्हाला ही पावती हटवायची आहे का?' : 'Are you sure you want to delete this receipt voucher?')) return;
    try {
      await deleteReceiptVoucher(id);
      loadHistory();
    } catch {
      // ignore
    }
  };

  const handlePrint = (r: CashReceiptVoucher) => {
    setSelectedReceipt(r);
    setShowPrintModal(true);
  };

  return (
    <div className="card" style={{ padding: 24, marginBottom: 30 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, borderBottom: '1px solid var(--border-subtle)', paddingBottom: 12 }}>
        <div>
          <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>
            2. {lang === 'mr' ? 'रोख पावती व्हाऊचर / कॅश मेमो (Receipt Voucher)' : 'Cash Receipt Voucher (Receipt Voucher)'}
          </h3>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            {lang === 'mr' ? 'प्राप्त रोख/चेक रकमेचा कॅश मेमो (स्क्रोल पुस्तक व चेक बुकमध्ये ऑटो-अपडेट)' : 'Create cash receipt memo (Auto-posts to Cash Scroll & Cheque Book)'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            style={{ background: '#fef3c7', color: '#92400e', borderColor: '#fde68a', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}
            onClick={async () => {
              if (!window.confirm(lang === 'mr' ? 'मागील ३० दिवसांचा कॅशियर चाचणी डेटा तयार करायचा आहे का?' : 'Generate 30 days cashier test data?')) return;
              setLoading(true);
              try {
                const res = await generate30DaysCashierTestData();
                setMsg({
                  type: 'success',
                  text: (lang === 'mr' ? '३० दिवसांचा कॅशियर डेटा यशस्वीरित्या जोडला गेला! ' : 'Successfully generated 30 days cashier test data! ') + res.message
                });
                loadHistory();
              } catch {
                setMsg({ type: 'error', text: lang === 'mr' ? 'चाचणी डेटा तयार करताना त्रुटी आली.' : 'Error generating test data.' });
              } finally {
                setLoading(false);
              }
            }}
          >
            <Zap size={14} color="#d97706" />
            {lang === 'mr' ? '⚡ ३० दिवसांचा चाचणी डेटा जोडा' : '⚡ Generate 30 Days Test Data'}
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            style={{ background: '#fee2e2', color: '#991b1b', borderColor: '#fca5a5', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}
            onClick={async () => {
              if (!window.confirm(lang === 'mr' ? 'सर्व कॅशियर चाचणी डेटा हटवायचा आहे का?' : 'Delete generated cashier test data?')) return;
              setLoading(true);
              try {
                const res = await delete30DaysCashierTestData();
                setMsg({
                  type: 'success',
                  text: (lang === 'mr' ? 'सर्व चाचणी डेटा हटवला गेला! ' : 'Successfully deleted test data! ') + res.message
                });
                loadHistory();
              } catch {
                setMsg({ type: 'error', text: lang === 'mr' ? 'चाचणी डेटा हटवताना त्रुटी आली.' : 'Error deleting test data.' });
              } finally {
                setLoading(false);
              }
            }}
          >
            {lang === 'mr' ? '🗑️ चाचणी डेटा हटवा' : '🗑️ Delete Test Data'}
          </button>
          {history.length > 0 && (
            <button className="btn btn-primary btn-sm" onClick={() => handlePrint(history[0])}>
              <Printer size={14} /> {lang === 'mr' ? 'पावती प्रिंट करा' : 'Print Receipt'}
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
            <label className="form-label">{lang === 'mr' ? 'बिल क्र. (Bill No.)' : 'Bill No.'}</label>
            <input type="text" className="form-input" value={billNo} onChange={e => setBillNo(e.target.value)} required />
          </div>
          <div className="form-group">
            <label className="form-label">{lang === 'mr' ? 'दिनांक (Date)' : 'Date'}</label>
            <input type="date" className="form-input" value={date} onChange={e => setDate(e.target.value)} required />
          </div>
          <div className="form-group">
            <label className="form-label">{lang === 'mr' ? 'GST No.' : 'GST No.'}</label>
            <input type="text" className="form-input" value={gstNo} onChange={e => setGstNo(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">{lang === 'mr' ? 'फोन क्र. (Phone No.)' : 'Phone No.'}</label>
            <input type="text" className="form-input" value={phoneNo} onChange={e => setPhoneNo(e.target.value)} />
          </div>
        </div>

        <div className="form-group" style={{ marginBottom: 16 }}>
          <label className="form-label">{lang === 'mr' ? 'कडून मिळाले (Received From - Name)' : 'Received From (Name)'}</label>
          <input
            type="text"
            className="form-input"
            placeholder={lang === 'mr' ? 'ज्या ग्राहकाकडून/सदस्याकडून रोख मिळाले त्यांचे नाव' : 'Name of customer / member paying cash'}
            value={receivedFrom}
            onChange={e => setReceivedFrom(e.target.value)}
            required
          />
        </div>

        {/* Payment Mode (CASH vs CHEQUE) */}
        <div style={{ background: '#f1f5f9', padding: 14, borderRadius: 8, border: '1px solid #cbd5e1', marginBottom: 16 }}>
          <label className="form-label" style={{ fontWeight: 700, marginBottom: 8, display: 'block' }}>
            {lang === 'mr' ? 'प्राप्ती प्रकार (Payment Mode):' : 'Payment Mode:'}
          </label>
          <div style={{ display: 'flex', gap: 20, marginBottom: paymentMode === 'CHEQUE' ? 12 : 0 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontWeight: 600, fontSize: 14 }}>
              <input
                type="radio"
                name="paymentModeReceipt"
                value="CASH"
                checked={paymentMode === 'CASH'}
                onChange={() => setPaymentMode('CASH')}
              />
              <Banknote size={16} color="#16a34a" />
              {lang === 'mr' ? 'रोख (Cash) → स्क्रोल बुकात (Received) जमा होईल' : 'Cash → Updates Cash Scroll (Received)'}
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontWeight: 600, fontSize: 14 }}>
              <input
                type="radio"
                name="paymentModeReceipt"
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
                  placeholder="e.g. CHQ-99102"
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
                  placeholder="e.g. Canara Bank Belagavi"
                  value={bankName}
                  onChange={e => setBankName(e.target.value)}
                />
              </div>
            </div>
          )}
        </div>

        {/* Dropdown for Receipt Particulars (7 Items) */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
          <div className="form-group">
            <label className="form-label">{lang === 'mr' ? 'तपशील खाते (Particulars Dropdown)' : 'Particulars Dropdown'}</label>
            <select
              className="form-input"
              value={particularsSelect}
              onChange={e => setParticularsSelect(e.target.value)}
            >
              {RECEIPT_PARTICULARS_OPTIONS.map(opt => (
                <option key={opt} value={opt}>
                  {lang === 'mr' ? (ITEM_TRANSLATIONS[opt] || opt) : opt}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">{lang === 'mr' ? 'अतिरिक्त शेरा / संदर्भ (Additional Remarks)' : 'Additional Remarks / Ref'}</label>
            <input
              type="text"
              className="form-input"
              placeholder={lang === 'mr' ? 'उदा. खाते क्र., रसीद क्र. किंवा पावती तपशील' : 'e.g. A/C No, Receipt Note'}
              value={customParticulars}
              onChange={e => setCustomParticulars(e.target.value)}
            />
          </div>
        </div>

        {/* Amount Breakdown Box matching Image #4 */}
        <div style={{ background: 'var(--surface-subtle)', padding: 16, borderRadius: 8, border: '1px solid var(--border-subtle)', marginBottom: 20 }}>
          <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, color: 'var(--text-primary)' }}>
            {lang === 'mr' ? 'रक्कम तपशील (Amount Details)' : 'Amount Details'}
          </h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
            <div className="form-group">
              <label className="form-label">{lang === 'mr' ? 'कर्ज रक्कम ₹ (Loan Amount)' : 'Loan Amount (₹)'}</label>
              <input
                type="number"
                step="0.01"
                className="form-input"
                value={loanAmount}
                onChange={e => setLoanAmount(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">{lang === 'mr' ? 'व्याज रक्कम ₹ (Interest Amount)' : 'Interest Amount (₹)'}</label>
              <input
                type="number"
                step="0.01"
                className="form-input"
                value={interestAmount}
                onChange={e => setInterestAmount(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 700 }}>{lang === 'mr' ? 'एकूण रक्कम ₹ (Total Amount)' : 'Total Amount (₹)'}</label>
              <input
                type="number"
                step="0.01"
                className="form-input"
                style={{ fontWeight: 700, color: '#16a34a', background: '#f0fdf4' }}
                value={totalAmount.toFixed(2)}
                readOnly
              />
            </div>
          </div>
        </div>

        {/* Receipt Document Upload Section */}
        <div style={{ background: '#f8fafc', border: '1px dashed #cbd5e1', padding: 16, borderRadius: 8, marginBottom: 20 }}>
          <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700 }}>
            <Upload size={16} color="var(--blue-600)" />
            {lang === 'mr' ? 'पावती / मेमो फाइल अपलोड करा (Upload Scanned Receipt / Memo)' : 'Upload Scanned Receipt / Memo Document'}
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8 }}>
            <input
              type="file"
              accept="image/*,application/pdf"
              onChange={handleFileUpload}
              disabled={uploading}
              style={{ fontSize: 13 }}
            />
            {uploading && <span className="spinner" />}
            {receiptDocPath && (
              <a
                href={getFileUrl(receiptDocPath)}
                target="_blank"
                rel="noreferrer"
                className="btn btn-secondary btn-sm"
                style={{ color: 'var(--blue-600)' }}
              >
                <Eye size={13} /> {lang === 'mr' ? 'अपलोड केलेली फाइल पाहा' : 'View Uploaded Document'}
              </a>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            <Save size={16} /> {loading ? (lang === 'mr' ? 'जतन होत आहे...' : 'Saving...') : (lang === 'mr' ? 'पावती मेमो जतन करा' : 'Save Cash Memo')}
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            style={{ background: '#dbeafe', color: '#1e40af', borderColor: '#93c5fd', fontWeight: 600 }}
            onClick={async () => {
              if (receivedFrom) setReceivedFrom(await translateToMarathi(receivedFrom));
              if (customParticulars) setCustomParticulars(await translateToMarathi(customParticulars));
              if (bankName) setBankName(await translateToMarathi(bankName));
            }}
          >
            🌐 {lang === 'mr' ? 'मराठीत भाषांतर करा (Translate to Marathi)' : 'Translate to Marathi'}
          </button>
          <button type="button" className="btn btn-secondary" onClick={handleReset}>
            {lang === 'mr' ? 'रीसेट' : 'Reset'}
          </button>
        </div>
      </form>

      {/* History Register */}
      <div style={{ marginTop: 30, borderTop: '1px solid var(--border-subtle)', paddingTop: 20 }}>
        <h4 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>
          {lang === 'mr' ? 'अलीकडील रोख पावती नोंदी (Cash Memos)' : 'Recent Cash Receipt Vouchers (Cash Memos)'}
        </h4>
        {history.length === 0 ? (
          <div style={{ fontSize: 13, color: 'var(--text-muted)', fontStyle: 'italic' }}>
            {lang === 'mr' ? 'कोणत्याही पावती नोंदी आढळल्या नाहीत.' : 'No receipt vouchers found.'}
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table" style={{ width: '100%', fontSize: 13 }}>
              <thead>
                <tr>
                  <th>{lang === 'mr' ? 'बिल क्र.' : 'Bill No.'}</th>
                  <th>{lang === 'mr' ? 'दिनांक' : 'Date'}</th>
                  <th>{lang === 'mr' ? 'कडून मिळाले' : 'Received From'}</th>
                  <th>{lang === 'mr' ? 'प्रकार' : 'Mode'}</th>
                  <th>{lang === 'mr' ? 'तपशील' : 'Particulars'}</th>
                  <th>{lang === 'mr' ? 'पावती फाइल' : 'Receipt Doc'}</th>
                  <th style={{ textAlign: 'right' }}>{lang === 'mr' ? 'एकूण ₹' : 'Total (₹)'}</th>
                  <th style={{ textAlign: 'center' }}>{lang === 'mr' ? 'कृती' : 'Action'}</th>
                </tr>
              </thead>
              <tbody>
                {history.map(row => (
                  <tr key={row.id}>
                    <td style={{ fontWeight: 600 }}>{row.bill_no}</td>
                    <td>{row.date}</td>
                    <td>{row.received_from}</td>
                    <td>
                      <span className={`badge ${row.payment_mode === 'CHEQUE' ? 'badge-primary' : 'badge-secondary'}`}>
                        {row.payment_mode || 'CASH'} {row.cheque_no ? `(${row.cheque_no})` : ''}
                      </span>
                    </td>
                    <td>{lang === 'mr' ? (ITEM_TRANSLATIONS[row.particulars || ''] || row.particulars) : row.particulars}</td>
                    <td>
                      {row.receipt_doc_path ? (
                        <a href={getFileUrl(row.receipt_doc_path)} target="_blank" rel="noreferrer" className="btn btn-secondary btn-sm" title="Download Receipt">
                          <Download size={12} /> Doc
                        </a>
                      ) : (
                        <span style={{ fontSize: 11, color: '#94a3b8' }}>None</span>
                      )}
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 700, color: '#16a34a' }}>₹{Number(row.total_amount).toFixed(2)}</td>
                    <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                      <button className="btn btn-secondary btn-sm" onClick={() => handlePrint(row)} style={{ marginRight: 6 }}>
                        <Printer size={13} /> {lang === 'mr' ? 'मेमो' : 'Memo'}
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

      {/* Printable Memo View matching Image #4 */}
      {(showPrintModal || selectedReceipt) && selectedReceipt && (
        <div className="modal-backdrop" style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999
        }}>
          <div className="modal-content" style={{ background: '#fff', width: '90%', maxWidth: 650, padding: 30, borderRadius: 8, boxShadow: '0 20px 40px rgba(0,0,0,0.3)', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
              <h4 style={{ fontWeight: 700 }}>{lang === 'mr' ? 'कॅश मेमो पूर्वावलोकन व मुद्रण' : 'Cash Memo Preview & Print'}</h4>
              <div>
                <button className="btn btn-primary btn-sm" onClick={() => window.print()} style={{ marginRight: 8 }}>
                  <Printer size={14} /> {lang === 'mr' ? 'प्रिंट' : 'Print'}
                </button>
                <button className="btn btn-secondary btn-sm" onClick={() => { setShowPrintModal(false); setSelectedReceipt(null); }}>
                  {lang === 'mr' ? 'बंद करा' : 'Close'}
                </button>
              </div>
            </div>

            {/* Print Container matching Image #4 layout */}
            <div className="printable-receipt" style={{ border: '2px solid #000', padding: 24, fontFamily: 'sans-serif', background: '#fff', color: '#000' }}>
              <div style={{ textAlign: 'center', borderBottom: '2px solid #000', paddingBottom: 10, marginBottom: 14 }}>
                <div style={{ fontSize: 16, fontWeight: 'bold' }}>
                  BELAGAVI GARDENERS CO-OPERATIVE PRODUCTION SUPPLY AND SALE SOCIETY LTD., BELAGAVI
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginTop: 6 }}>
                  <div>GST No.: {selectedReceipt.gst_no || '29AAAAT4655K1Z1'}</div>
                  <div>Phone No.: {selectedReceipt.phone_no || '2460554'}</div>
                </div>
                <div style={{ fontSize: 16, fontWeight: 'bold', marginTop: 8, letterSpacing: '0.05em' }}>
                  CASH MEMO
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12, fontSize: 13 }}>
                <div><strong>Bill No.:</strong> {selectedReceipt.bill_no}</div>
                <div><strong>Date:</strong> {selectedReceipt.date}</div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12, fontSize: 13, borderBottom: '1px solid #ddd', paddingBottom: 6 }}>
                <div><strong>Received From (Name):</strong> {selectedReceipt.received_from}</div>
                <div><strong>Mode:</strong> {selectedReceipt.payment_mode || 'CASH'} {selectedReceipt.cheque_no ? `(Chq: ${selectedReceipt.cheque_no})` : ''}</div>
              </div>

              <div style={{ marginBottom: 16 }}>
                <strong style={{ fontSize: 13 }}>Particulars:</strong>
                <div style={{ border: '1px dashed #666', minHeight: 60, padding: 8, marginTop: 4, fontSize: 13 }}>
                  {selectedReceipt.particulars || 'Cash Received'}
                </div>
              </div>

              <div style={{ border: '1px solid #000', padding: 12, marginBottom: 30, background: '#fdfdfd' }}>
                <div style={{ fontWeight: 'bold', fontSize: 13, borderBottom: '1px solid #000', paddingBottom: 4, marginBottom: 8 }}>
                  Amount Details:
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                  <span>Loan Amount:</span>
                  <span>₹ {Number(selectedReceipt.loan_amount).toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                  <span>Interest Amount:</span>
                  <span>₹ {Number(selectedReceipt.interest_amount).toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, fontWeight: 'bold', borderTop: '1px solid #000', paddingTop: 6, marginTop: 6 }}>
                  <span>Total:</span>
                  <span>₹ {Number(selectedReceipt.total_amount).toFixed(2)}</span>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', textAlign: 'center', fontSize: 12, fontWeight: 'bold', marginTop: 40 }}>
                <div>Signature of Payer<br /><br />_______________</div>
                <div>Accountant's Signature<br /><br />_______________</div>
                <div>Cashier's Signature<br /><br />_______________</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReceiptVoucherForm;
