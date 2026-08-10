import React, { useEffect, useState } from 'react';
import { Lock, Unlock, TrendingUp, TrendingDown, Wallet, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { fetchDailyBalance, setInitialOpeningBalance } from '../api/client';
import type { DailyBalanceSummary } from '../types';
import { useTranslation } from '../hooks/useTranslation';

interface DailyBalanceBarProps {
  selectedDate?: string;
  onBalanceUpdate?: (summary: DailyBalanceSummary) => void;
}

export const DailyBalanceBar: React.FC<DailyBalanceBarProps> = ({ selectedDate, onBalanceUpdate }) => {
  const { lang } = useTranslation();
  const today = new Date().toISOString().split('T')[0];
  const currentDate = selectedDate || today;

  const [summary, setSummary] = useState<DailyBalanceSummary | null>(null);
  const [initialInput, setInitialInput] = useState<string>('0');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  const loadBalance = async () => {
    try {
      const data = await fetchDailyBalance(currentDate);
      setSummary(data);
      if (!data.is_locked) {
        setInitialInput(data.initial_opening_balance ? data.initial_opening_balance.toString() : '0');
      } else {
        setInitialInput(data.initial_opening_balance.toString());
      }
      if (onBalanceUpdate) onBalanceUpdate(data);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    loadBalance();
  }, [currentDate]);

  const handleSaveInitialBalance = async () => {
    const val = parseFloat(initialInput);
    if (isNaN(val) || val < 0) {
      setMsg({
        type: 'error',
        text: lang === 'mr' ? 'कृपया योग्य प्रारंभिक शिल्लक प्रविष्ट करा.' : 'Please enter a valid Initial Opening Balance.'
      });
      return;
    }

    const confirmMsg = lang === 'mr'
      ? `तुम्ही प्रारंभिक शिल्लक ₹${val.toFixed(2)} म्हणून जतन करू इच्छिता का? हे एकदाच भरता येईल व नंतर कायमस्वरूपी लॉक होईल!`
      : `Save ₹${val.toFixed(2)} as the Initial Opening Balance? This can only be set ONCE and will be permanently locked!`;

    if (!window.confirm(confirmMsg)) return;

    setSaving(true);
    setMsg(null);
    try {
      const updated = await setInitialOpeningBalance({
        initial_opening_balance: val,
        date: currentDate
      });
      setSummary(updated);
      setInitialInput(updated.initial_opening_balance.toString());
      setMsg({
        type: 'success',
        text: lang === 'mr'
          ? 'प्रारंभिक शिल्लक जतन केली आणि कायमस्वरूपी लॉक झाली!'
          : 'Initial Opening Balance saved and permanently locked!'
      });
      if (onBalanceUpdate) onBalanceUpdate(updated);
    } catch (err: any) {
      setMsg({
        type: 'error',
        text: err?.response?.data?.detail || (lang === 'mr' ? 'प्रारंभिक शिल्लक जतन करताना त्रुटी.' : 'Error saving Initial Opening Balance.')
      });
    } finally {
      setSaving(false);
    }
  };

  if (!summary) {
    return (
      <div className="no-print" style={{ background: '#f8fafc', padding: '14px 20px', borderRadius: 10, border: '1px solid #e2e8f0', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 10, color: '#64748b', fontSize: 13 }}>
        <Loader2 size={16} className="spinner" /> {lang === 'mr' ? 'आरंभिक शिल्लक लोड होत आहे...' : 'Loading Daily Opening Balance...'}
      </div>
    );
  }

  return (
    <div className="no-print" style={{ background: '#f8fafc', padding: '16px 20px', borderRadius: 10, border: '1px solid #e2e8f0', marginBottom: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
      {msg && (
        <div className={`alert ${msg.type === 'info' ? 'alert-info' : msg.type === 'success' ? 'alert-success' : 'alert-error'}`} style={{ marginBottom: 14, fontSize: 13 }}>
          {msg.type === 'info' ? <Loader2 size={16} className="spinner" /> : msg.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          {msg.text}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16, marginBottom: 14, borderBottom: '1px dashed #cbd5e1', paddingBottom: 12 }}>
        {/* Initial Opening Balance Setting (One-Time Editable, then Disabled) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#334155', display: 'flex', alignItems: 'center', gap: 6 }}>
            {summary.is_locked ? <Lock size={15} color="#dc2626" /> : <Unlock size={15} color="#16a34a" />}
            {lang === 'mr' ? 'सिस्टम प्रारंभिक शिल्लक (Initial Opening Balance):' : 'Initial System Opening Balance:'}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>₹</span>
            <input
              type="number"
              step="0.01"
              className="form-input"
              style={{
                width: 140,
                fontSize: 14,
                fontWeight: 700,
                padding: '4px 8px',
                background: summary.is_locked ? '#f1f5f9' : '#ffffff',
                color: summary.is_locked ? '#64748b' : '#0f172a',
                borderColor: summary.is_locked ? '#cbd5e1' : '#16a34a',
                cursor: summary.is_locked ? 'not-allowed' : 'text'
              }}
              disabled={summary.is_locked || saving}
              value={initialInput}
              onChange={e => setInitialInput(e.target.value)}
              placeholder="0.00"
            />
            {!summary.is_locked ? (
              <button
                type="button"
                className="btn btn-success btn-sm"
                onClick={handleSaveInitialBalance}
                disabled={saving}
                style={{ padding: '4px 10px', fontSize: 12, fontWeight: 700 }}
              >
                {saving ? (lang === 'mr' ? 'जतन होत आहे...' : 'Saving...') : (lang === 'mr' ? '🔒 जतन करा व लॉक करा' : '🔒 Save & Lock Permanently')}
              </button>
            ) : (
              <span className="badge badge-success" style={{ fontSize: 11, padding: '4px 8px', background: '#dcfce7', color: '#15803d', border: '1px solid #86efac' }}>
                ✓ {lang === 'mr' ? 'कायमस्वरूपी लॉक' : 'Permanently Saved & Locked'}
              </span>
            )}
          </div>
        </div>

        <div style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>
          📅 {lang === 'mr' ? 'दिनांक:' : 'Date:'} <span style={{ color: '#0f172a' }}>{currentDate}</span>
        </div>
      </div>

      {/* 4-Card Daily Balance Roll-Forward Display */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
        {/* Card 1: Opening Balance */}
        <div style={{ background: '#eff6ff', padding: 12, borderRadius: 8, border: '1px solid #bfdbfe' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#1d4ed8', textTransform: 'uppercase', marginBottom: 4 }}>
            🏦 {lang === 'mr' ? 'आजची प्रारंभिक शिल्लक' : 'Today Opening Balance'}
          </div>
          <div style={{ fontSize: 18, fontWeight: 800, color: '#1e40af', fontFamily: 'monospace' }}>
            ₹{Number(summary.opening_balance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div style={{ fontSize: 10, color: '#60a5fa', marginTop: 2 }}>
            {lang === 'mr' ? '(कालच्या अखेरच्या शिल्लकवरून)' : '(Rolls from prev day closing)'}
          </div>
        </div>

        {/* Card 2: Today's Receipts / Credits */}
        <div style={{ background: '#f0fdf4', padding: 12, borderRadius: 8, border: '1px solid #bbf7d0' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#15803d', textTransform: 'uppercase', marginBottom: 4 }}>
            📈 {lang === 'mr' ? 'आजची एकूण जमा (Credits)' : "Today's Total Receipts"}
          </div>
          <div style={{ fontSize: 18, fontWeight: 800, color: '#166534', fontFamily: 'monospace' }}>
            + ₹{Number(summary.today_receipts).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div style={{ fontSize: 10, color: '#4ade80', marginTop: 2 }}>
            {lang === 'mr' ? '(आज जमा झालेले व्यवहार)' : "(All receipts & credits)"}
          </div>
        </div>

        {/* Card 3: Today's Payments / Debits */}
        <div style={{ background: '#fef2f2', padding: 12, borderRadius: 8, border: '1px solid #fecaca' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#b91c1c', textTransform: 'uppercase', marginBottom: 4 }}>
            📉 {lang === 'mr' ? 'आजची एकूण नावे (Debits)' : "Today's Total Payments"}
          </div>
          <div style={{ fontSize: 18, fontWeight: 800, color: '#991b1b', fontFamily: 'monospace' }}>
            - ₹{Number(summary.today_payments).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div style={{ fontSize: 10, color: '#f87171', marginTop: 2 }}>
            {lang === 'mr' ? '(आज झालेले खर्च व नावे)' : "(All payments & debits)"}
          </div>
        </div>

        {/* Card 4: Closing Balance (EOD) */}
        <div style={{ background: '#faf5ff', padding: 12, borderRadius: 8, border: '1px solid #e9d5ff' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#7e22ce', textTransform: 'uppercase', marginBottom: 4 }}>
            💰 {lang === 'mr' ? 'आजची अंतिम शिल्लक (EOD)' : 'Today Closing Balance'}
          </div>
          <div style={{ fontSize: 18, fontWeight: 800, color: '#6b21a8', fontFamily: 'monospace' }}>
            ₹{Number(summary.closing_balance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div style={{ fontSize: 10, color: '#c084fc', marginTop: 2 }}>
            {lang === 'mr' ? '(उद्याच्या सुरुवातीची शिल्लक होईल)' : '(Becomes tomorrow opening)'}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DailyBalanceBar;
