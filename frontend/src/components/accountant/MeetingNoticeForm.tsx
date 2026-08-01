import React, { useState, useEffect } from 'react';
import { Printer, Save, Trash2, Edit, Calendar, Search, FileText, Languages, Zap, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import {
  fetchNextMeetingNoticeNo,
  fetchMeetingNotices,
  createMeetingNotice,
  updateMeetingNotice,
  deleteMeetingNotice,
  generate30DaysMeetingNoticesTestData,
  delete30DaysMeetingNoticesTestData
} from '../../api/client';
import type { MeetingNotice, User } from '../../types';
import { useTranslation } from '../../hooks/useTranslation';
import { translateToMarathi } from '../../utils/translator';

interface MeetingNoticeFormProps {
  user?: User | null;
}

const MeetingNoticeForm: React.FC<MeetingNoticeFormProps> = ({ user }) => {
  const { lang } = useTranslation();
  const today = new Date().toISOString().split('T')[0];
  const firstDay = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];

  const [editingId, setEditingId] = useState<number | null>(null);

  const [noticeNo, setNoticeNo] = useState('');
  const [meetingDate, setMeetingDate] = useState(today);
  const [meetingTime, setMeetingTime] = useState('11:00 AM');
  const [timeOfDay, setTimeOfDay] = useState(lang === 'mr' ? 'सकाळी' : 'Morning');
  const [recipientName, setRecipientName] = useState('');
  const [meetingType, setMeetingType] = useState(
    lang === 'mr' ? 'सर्व्ह सोसायटीची मॅ. कमिटी मिटिंग' : 'Managing Committee Meeting'
  );
  const [agendaSubjects, setAgendaSubjects] = useState(
    lang === 'mr'
      ? '१. वार्षिक अंदाजपत्रक व अहवाल मंजुरीबाबत\n२. खते व औषधे खरेदी दरपत्रक आढावा\n३. अध्यक्षांच्या परवानगीने येणारे एनवेळचे विषय'
      : '1. Annual budget and financial review\n2. Fertilizer & pesticide purchasing rates\n3. Other subjects with permission of Chair'
  );
  const [docPath, setDocPath] = useState('');

  // Search & Filter
  const [startDate, setStartDate] = useState(firstDay);
  const [endDate, setEndDate] = useState(today);
  const [searchTerm, setSearchTerm] = useState('');

  const [loading, setLoading] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  const [history, setHistory] = useState<MeetingNotice[]>([]);
  const [selectedNoticeForPrint, setSelectedNoticeForPrint] = useState<MeetingNotice | null>(null);

  useEffect(() => {
    loadHistory();
    loadNextNoticeNo();
  }, [startDate, endDate]);

  const loadNextNoticeNo = async () => {
    try {
      const data = await fetchNextMeetingNoticeNo();
      if (data && data.notice_no && !editingId) {
        setNoticeNo(data.notice_no);
      }
    } catch {
      // ignore
    }
  };

  const loadHistory = async () => {
    try {
      const data = await fetchMeetingNotices(startDate, endDate);
      setHistory(data);
    } catch {
      // ignore
    }
  };

  const handleReset = () => {
    setEditingId(null);
    setMeetingDate(today);
    setMeetingTime('11:00 AM');
    setTimeOfDay(lang === 'mr' ? 'सकाळी' : 'Morning');
    setRecipientName('');
    setMeetingType(lang === 'mr' ? 'सर्व्ह सोसायटीची मॅ. कमिटी मिटिंग' : 'Managing Committee Meeting');
    setAgendaSubjects(
      lang === 'mr'
        ? '१. वार्षिक अंदाजपत्रक व अहवाल मंजुरीबाबत\n२. खते व औषधे खरेदी दरपत्रक आढावा\n३. अध्यक्षांच्या परवानगीने येणारे एनवेळचे विषय'
        : '1. Annual budget and financial review\n2. Fertilizer & pesticide purchasing rates\n3. Other subjects with permission of Chair'
    );
    setDocPath('');
    setMsg(null);
    loadNextNoticeNo();
  };

  const handleEdit = (entry: MeetingNotice) => {
    setEditingId(entry.id);
    setNoticeNo(entry.notice_no);
    setMeetingDate(entry.meeting_date);
    setMeetingTime(entry.meeting_time);
    setTimeOfDay(entry.time_of_day);
    setRecipientName(entry.recipient_name);
    setMeetingType(entry.meeting_type);
    setAgendaSubjects(entry.agenda_subjects);
    setDocPath(entry.doc_path || '');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm(lang === 'mr' ? 'तुम्हाला ही मिटिंग नोटीस नक्की हटवायची आहे का?' : 'Are you sure you want to delete this meeting notice?')) return;
    try {
      await deleteMeetingNotice(id);
      setMsg({ type: 'success', text: lang === 'mr' ? 'मिटिंग नोटीस हटवली!' : 'Meeting notice deleted successfully!' });
      loadHistory();
      if (editingId === id) handleReset();
    } catch {
      setMsg({ type: 'error', text: lang === 'mr' ? 'हटवताना त्रुटी आली.' : 'Error deleting meeting notice.' });
    }
  };

  const handleTranslateAllFields = async () => {
    setTranslating(true);
    setMsg({
      type: 'info',
      text: lang === 'mr' ? '⏳ मराठीत भाषांतर करत आहे, कृपया वाट पहा...' : '⏳ Translating text to Marathi, please wait...'
    });
    try {
      if (recipientName) {
        const transRec = await translateToMarathi(recipientName);
        setRecipientName(transRec);
      }
      if (agendaSubjects) {
        const transAgenda = await translateToMarathi(agendaSubjects);
        setAgendaSubjects(transAgenda);
      }
      if (meetingType) {
        const transType = await translateToMarathi(meetingType);
        setMeetingType(transType);
      }
      setMsg({
        type: 'success',
        text: lang === 'mr' ? 'मराठीत भाषांतर यशस्वीरित्या पूर्ण झाले!' : 'Successfully translated to Marathi!'
      });
    } catch {
      setMsg({
        type: 'error',
        text: lang === 'mr' ? 'भाषांतर करताना अडचण आली.' : 'Translation failed.'
      });
    } finally {
      setTranslating(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipientName.trim()) {
      setMsg({ type: 'error', text: lang === 'mr' ? 'कृपया सदस्याचे / व्यक्तीचे नाव प्रविष्ट करा.' : 'Please enter Recipient Name.' });
      return;
    }
    if (!agendaSubjects.trim()) {
      setMsg({ type: 'error', text: lang === 'mr' ? 'कृपया सभेचे विषय प्रविष्ट करा.' : 'Please enter Subject / Agenda topics.' });
      return;
    }

    setLoading(true);
    setMsg(null);
    try {
      const payload = {
        notice_no: noticeNo,
        meeting_date: meetingDate,
        meeting_time: meetingTime,
        time_of_day: timeOfDay,
        recipient_name: recipientName.trim(),
        meeting_type: meetingType.trim(),
        agenda_subjects: agendaSubjects.trim(),
        doc_path: docPath || undefined,
        created_by: user?.username || 'accountant',
      };

      if (editingId) {
        await updateMeetingNotice(editingId, payload);
        setMsg({
          type: 'success',
          text: lang === 'mr' ? 'मिटिंग नोटीस यशस्वीरित्या अपडेट केली!' : 'Meeting notice updated successfully!'
        });
      } else {
        await createMeetingNotice(payload);
        setMsg({
          type: 'success',
          text: lang === 'mr' ? 'मिटिंग नोटीस यशस्वीरित्या जतन केली!' : 'Meeting notice saved successfully!'
        });
      }
      loadHistory();
      handleReset();
    } catch {
      setMsg({ type: 'error', text: lang === 'mr' ? 'नोटीस जतन करताना त्रुटी आली.' : 'Error saving meeting notice.' });
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateTestData = async () => {
    setLoading(true);
    try {
      const res = await generate30DaysMeetingNoticesTestData();
      setMsg({ type: 'success', text: res.message });
      loadHistory();
    } catch {
      setMsg({ type: 'error', text: 'Error generating 30 days test data.' });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTestData = async () => {
    setLoading(true);
    try {
      const res = await delete30DaysMeetingNoticesTestData();
      setMsg({ type: 'success', text: res.message });
      loadHistory();
    } catch {
      setMsg({ type: 'error', text: 'Error deleting test data.' });
    } finally {
      setLoading(false);
    }
  };

  const filteredHistory = history.filter(row => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      row.recipient_name.toLowerCase().includes(term) ||
      row.notice_no.toLowerCase().includes(term) ||
      row.agenda_subjects.toLowerCase().includes(term)
    );
  });

  return (
    <div className="card" style={{ maxWidth: 1100, margin: '0 auto 30px auto', padding: 24, borderTop: '4px solid #6d28d9', boxShadow: '0 4px 16px rgba(109, 40, 217, 0.09)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 20, borderBottom: '1px solid var(--border-subtle)', paddingBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ background: '#ede9fe', padding: 10, borderRadius: 8, color: '#5b21b6' }}>
            <FileText size={22} />
          </div>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
              {lang === 'mr' ? 'मिटिंग नोटीस फॉर्म' : 'Meeting Notice Form'}
            </h2>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '2px 0 0' }}>
              {lang === 'mr'
                ? 'बेळगाव गार्डनर्स को-ऑप सोसायटीच्या मॅनेजिंग कमिटी सभेची नोटीस तयार करा, जतन करा, संपादन करा व प्रिंट करा.'
                : 'Create, store, edit, and print official Managing Committee Meeting Notices.'}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            style={{ background: '#eff6ff', color: '#1d4ed8', borderColor: '#bfdbfe', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}
            onClick={handleGenerateTestData}
          >
            <Zap size={14} /> {lang === 'mr' ? '⚡ ३० दिवसांचा डेटा तयार करा' : '⚡ 30 Days Test Data'}
          </button>
          <button
            type="button"
            className="btn btn-danger btn-sm"
            style={{ padding: '4px 10px', fontSize: 12 }}
            onClick={handleDeleteTestData}
          >
            <Trash2 size={13} /> {lang === 'mr' ? 'डेटा हटवा' : 'Delete Test Data'}
          </button>
        </div>
      </div>

      {msg && (
        <div className={`alert ${msg.type === 'info' ? 'alert-info' : msg.type === 'success' ? 'alert-success' : 'alert-error'}`} style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
          {msg.type === 'info' ? <Loader2 size={16} className="spinner" /> : msg.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          <span>{msg.text}</span>
        </div>
      )}

      {/* Form Input Area */}
      <form onSubmit={handleSubmit} style={{ background: '#f8fafc', padding: 20, borderRadius: 8, border: '1px solid #cbd5e1', marginBottom: 30 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 16 }}>
          <div className="form-group">
            <label className="form-label" style={{ fontWeight: 600 }}>
              {lang === 'mr' ? 'नोटीस क्र.:' : 'Notice No.:'}
            </label>
            <input
              type="text"
              className="form-input"
              style={{ fontWeight: 700, color: '#1e3a8a', background: '#eff6ff' }}
              value={noticeNo}
              onChange={e => setNoticeNo(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" style={{ fontWeight: 600 }}>
              {lang === 'mr' ? 'चार तारीख / सभा दिनांक:' : 'Meeting Date:'}
            </label>
            <input
              type="date"
              className="form-input"
              value={meetingDate}
              onChange={e => setMeetingDate(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" style={{ fontWeight: 600 }}>
              {lang === 'mr' ? 'सकाळी / संध्याकाळी:' : 'Session / Time of Day:'}
            </label>
            <select
              className="form-input"
              value={timeOfDay}
              onChange={e => setTimeOfDay(e.target.value)}
            >
              <option value={lang === 'mr' ? 'सकाळी' : 'Morning'}>{lang === 'mr' ? 'सकाळी' : 'Morning'}</option>
              <option value={lang === 'mr' ? 'संध्याकाळी' : 'Evening'}>{lang === 'mr' ? 'संध्याकाळी' : 'Evening'}</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label" style={{ fontWeight: 600 }}>
              {lang === 'mr' ? 'सभा वेळ (वाजता):' : 'Meeting Time:'}
            </label>
            <input
              type="text"
              className="form-input"
              placeholder={lang === 'mr' ? 'उदा. ११:०० वाजता / 11:00 AM' : 'e.g. 11:00 AM'}
              value={meetingTime}
              onChange={e => setMeetingTime(e.target.value)}
              required
            />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, marginBottom: 16 }}>
          <div className="form-group">
            <label className="form-label" style={{ fontWeight: 600 }}>
              {lang === 'mr' ? 'रा. रा. (प्रति):' : 'To (Recipient Name):'}
            </label>
            <input
              type="text"
              className="form-input"
              style={{ fontWeight: 600, fontSize: 14 }}
              placeholder={lang === 'mr' ? 'प्रति सभासद / व्यक्तीचे नाव (उदा. श्री रमेश पाटील)' : 'Recipient Name e.g. Shri Ramesh Patil'}
              value={recipientName}
              onChange={e => setRecipientName(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" style={{ fontWeight: 600 }}>
              {lang === 'mr' ? 'सभा प्रकार:' : 'Meeting Type:'}
            </label>
            <input
              type="text"
              className="form-input"
              value={meetingType}
              onChange={e => setMeetingType(e.target.value)}
              required
            />
          </div>
        </div>

        {/* Agenda / Subjects Field */}
        <div className="form-group" style={{ marginBottom: 16 }}>
          <label className="form-label" style={{ fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span>{lang === 'mr' ? 'विषय / सभेचे कामकाज:' : 'Subject & Agenda Topics:'}</span>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{lang === 'mr' ? 'प्रत्येक ओळीवर एक विषय लिहा' : 'One topic per line'}</span>
          </label>
          <textarea
            className="form-input"
            rows={4}
            style={{ fontFamily: 'monospace', fontSize: 13, lineHeight: 1.5 }}
            placeholder={lang === 'mr' ? '१. वार्षिक अंदाजपत्रक मंजुरीबाबत&#10;२. खते व औषधे खरेदी दरपत्रक आढावा&#10;३. नवीन सभासद अर्ज मंजुरी' : '1. Annual budget approval&#10;2. Pesticides rate review'}
            value={agendaSubjects}
            onChange={e => setAgendaSubjects(e.target.value)}
            required
          />
        </div>

        {/* Scan & Upload Attachment */}
        <div style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12, background: '#fff', padding: 10, borderRadius: 6, border: '1px solid #cbd5e1' }}>
          <label style={{ fontSize: 13, fontWeight: 600, margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
            📷 {lang === 'mr' ? 'कागदपत्र / नोटीस प्रत स्कॅन किंवा अपलोड करा:' : 'Scan & Upload Attachment Document:'}
          </label>
          <input
            type="file"
            accept="image/*,.pdf"
            className="form-input"
            style={{ width: 'auto', padding: '3px 6px', fontSize: 12 }}
            onChange={e => {
              const file = e.target.files?.[0];
              if (file) setDocPath(file.name);
            }}
          />
          {docPath && <span style={{ fontSize: 12, color: '#16a34a', fontWeight: 600 }}>Attached: {docPath}</span>}
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <button type="submit" className="btn btn-primary" disabled={loading} style={{ background: '#1d4ed8', borderColor: '#1d4ed8' }}>
            <Save size={16} /> {loading ? (lang === 'mr' ? 'जतन होत आहे...' : 'Saving...') : (editingId ? (lang === 'mr' ? 'अपडेट करा' : 'Update Notice') : (lang === 'mr' ? 'मिटिंग नोटीस जतन करा' : 'Save Meeting Notice'))}
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            style={{ background: '#dbeafe', color: '#1e40af', borderColor: '#bfdbfe', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}
            onClick={handleTranslateAllFields}
            disabled={translating || loading}
          >
            {translating ? (
              <>
                <Loader2 size={16} className="spinner" />
                {lang === 'mr' ? 'मराठीत भाषांतर करत आहे, कृपया वाट पहा...' : 'Translating to Marathi, please wait...'}
              </>
            ) : (
              <>
                <Languages size={16} /> {lang === 'mr' ? 'मराठीत भाषांतर करा (Translate to Marathi)' : 'Translate to Marathi'}
              </>
            )}
          </button>
          <button type="button" className="btn btn-secondary" onClick={handleReset}>
            {lang === 'mr' ? 'रीसेट' : 'Reset'}
          </button>
        </div>
      </form>

      {/* History & Filter Section */}
      <div style={{ marginTop: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14, marginBottom: 16, background: '#f8fafc', padding: 14, borderRadius: 8, border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Calendar size={16} color="#1d4ed8" />
            <label style={{ fontSize: 13, fontWeight: 600 }}>{lang === 'mr' ? 'कालावधी / तारीख शिफारस:' : 'Filter Date Range:'}</label>
            <input type="date" className="form-input" style={{ width: 'auto', padding: '4px 8px', fontSize: 13 }} value={startDate} onChange={e => setStartDate(e.target.value)} />
            <span style={{ fontSize: 13 }}>{lang === 'mr' ? 'ते' : 'to'}</span>
            <input type="date" className="form-input" style={{ width: 'auto', padding: '4px 8px', fontSize: 13 }} value={endDate} onChange={e => setEndDate(e.target.value)} />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Search size={16} color="var(--text-muted)" />
            <input
              type="text"
              className="form-input"
              style={{ width: 240, padding: '4px 10px', fontSize: 13 }}
              placeholder={lang === 'mr' ? 'प्रति, नोटीस क्र. किंवा विषय शोधा...' : 'Search Recipient, Notice No, Agenda...'}
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {filteredHistory.length === 0 ? (
          <div style={{ fontSize: 13, color: 'var(--text-muted)', fontStyle: 'italic', padding: 16 }}>
            {lang === 'mr' ? 'निवडलेल्या कालावधीसाठी कोणत्याही मिटिंग नोटीस आढळल्या नाहीत.' : 'No meeting notices found for selected date range.'}
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table" style={{ width: '100%', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#eff6ff' }}>
                  <th>{lang === 'mr' ? 'नोटीस क्र.' : 'Notice No.'}</th>
                  <th>{lang === 'mr' ? 'सभा दिनांक' : 'Date'}</th>
                  <th>{lang === 'mr' ? 'वेळ / सत्राची वेळ' : 'Time & Session'}</th>
                  <th>{lang === 'mr' ? 'रा. रा. (प्रति)' : 'To (Recipient)'}</th>
                  <th>{lang === 'mr' ? 'विषय / विषयपत्रिका' : 'Agenda Subjects'}</th>
                  <th>{lang === 'mr' ? 'कागदपत्र' : 'Attachment'}</th>
                  <th style={{ textAlign: 'center' }}>{lang === 'mr' ? 'कृती' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody>
                {filteredHistory.map(row => (
                  <tr key={row.id}>
                    <td style={{ fontWeight: 700, color: '#1e3a8a' }}>{row.notice_no}</td>
                    <td>{row.meeting_date}</td>
                    <td>{row.meeting_time} ({row.time_of_day})</td>
                    <td style={{ fontWeight: 600 }}>{row.recipient_name}</td>
                    <td style={{ fontSize: 12, maxWidth: 260, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {row.agenda_subjects}
                    </td>
                    <td>
                      {row.doc_path ? (
                        <a href={`#`} onClick={(e) => { e.preventDefault(); alert(`Downloading attachment: ${row.doc_path}`); }} className="btn btn-secondary btn-sm" style={{ fontSize: 11, padding: '2px 6px' }}>
                          📎 Doc
                        </a>
                      ) : (
                        <span style={{ fontSize: 11, color: '#94a3b8' }}>None</span>
                      )}
                    </td>
                    <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                      <button className="btn btn-secondary btn-sm" onClick={() => handleEdit(row)} style={{ marginRight: 4, padding: '4px 6px', background: '#fef3c7', color: '#92400e', borderColor: '#fde68a' }} title="Edit Notice">
                        <Edit size={13} /> {lang === 'mr' ? 'संपादित करा' : 'Edit'}
                      </button>
                      <button className="btn btn-primary btn-sm" onClick={() => setSelectedNoticeForPrint(row)} style={{ marginRight: 4, padding: '4px 8px', background: '#1d4ed8', borderColor: '#1d4ed8' }} title="Print Notice">
                        <Printer size={13} /> {lang === 'mr' ? 'प्रिंट' : 'Print'}
                      </button>
                      <button className="btn btn-danger btn-sm" onClick={() => handleDelete(row.id)} style={{ padding: '4px 6px' }}>
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

      {/* Single Meeting Notice Printable Modal (Exact Match to Physical Document Photo) */}
      {selectedNoticeForPrint && (
        <div className="modal-backdrop" style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999
        }}>
          <div className="modal-content" style={{ background: '#fff', width: '92%', maxWidth: 780, padding: 26, borderRadius: 8, boxShadow: '0 20px 40px rgba(0,0,0,0.3)', maxHeight: '92vh', overflowY: 'auto' }}>
            <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
              <h4 style={{ fontWeight: 700, margin: 0 }}>
                {lang === 'mr' ? `मिटिंग नोटीस प्रिंट #${selectedNoticeForPrint.notice_no}` : `Meeting Notice Print #${selectedNoticeForPrint.notice_no}`}
              </h4>
              <div>
                <button className="btn btn-primary btn-sm" onClick={() => window.print()} style={{ marginRight: 8, background: '#1d4ed8', borderColor: '#1d4ed8' }}>
                  <Printer size={14} /> {lang === 'mr' ? 'प्रिंट काढा' : 'Print Notice'}
                </button>
                <button className="btn btn-secondary btn-sm" onClick={() => setSelectedNoticeForPrint(null)}>
                  {lang === 'mr' ? 'बंद करा' : 'Close'}
                </button>
              </div>
            </div>

            {/* Printable Document Matching Physical Form Layout */}
            <div className="printable-meeting-notice" style={{ border: '2px solid #000', padding: 30, fontFamily: 'Noto Sans Devanagari, serif', background: '#fff', color: '#000', lineHeight: 1.6 }}>
              {/* Header */}
              <div style={{ textAlign: 'center', borderBottom: '2px solid #000', paddingBottom: 12, marginBottom: 16 }}>
                <h2 style={{ fontSize: 17, fontWeight: 'bold', margin: 0 }}>
                  दि बेळगांव गार्डनर्स को-ऑप. प्रॉ. सप्लाय अँड सेल सोसायटी लिमिटेड, बेळगांव.
                </h2>
                <div style={{ fontSize: 13, fontWeight: 'bold', margin: '4px 0', textTransform: 'uppercase' }}>
                  THE BELGAUM GARDENERS CO-OPERATIVE PRODUCTION SUPPLY AND SALE SOCIETY LTD., BELGAUM
                </div>
                <div style={{ fontSize: 11, margin: '2px 0' }}>
                  📍 Address: Belgaum, Karnataka - 590001 | 📞 Phone: 0831-2401234 / 0831-2401235 | 🆔 GSTN: 29AAATB1234C1Z5
                </div>
                <h3 style={{ fontSize: 18, fontWeight: 'bold', marginTop: 10, marginBottom: 0, textDecoration: 'underline', letterSpacing: '0.05em' }}>
                  {lang === 'mr' ? 'मिटिंग नोटीस' : 'MEETING NOTICE'}
                </h3>
              </div>

              {/* Notice Recipient Line */}
              <div style={{ fontSize: 14, marginBottom: 14, fontWeight: 'bold', display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', gap: 6 }}>
                <span>{lang === 'mr' ? 'रा. रा.' : 'To,'}</span>
                <span style={{ borderBottom: '1px solid #000', flex: 1, padding: '0 8px', minWidth: 200 }}>{selectedNoticeForPrint.recipient_name}</span>
                {lang === 'mr' && <span>यांना</span>}
              </div>

              {/* Notice Body Paragraph (Exact Marathi Text as document photo) */}
              {lang === 'mr' ? (
                <div style={{ fontSize: 13.5, textIndent: 30, textAlign: 'justify', marginBottom: 16, lineHeight: 1.8 }}>
                  सदरी सोसायटीची मॅ. कमिटी मिटिंग <strong>{selectedNoticeForPrint.meeting_date}</strong> रोजी <strong>{selectedNoticeForPrint.time_of_day} {selectedNoticeForPrint.meeting_time}</strong> वाजता सदरी सोसायटीच्या ऑफिसात बोलावलेली आहे. तरी आपण वेळेवर येण्याची कृपा करावी कळावे ता.
                </div>
              ) : (
                <div style={{ fontSize: 13.5, textIndent: 30, textAlign: 'justify', marginBottom: 16, lineHeight: 1.8 }}>
                  You are hereby informed that the Managing Committee Meeting of the Society has been scheduled on Date: <strong>{selectedNoticeForPrint.meeting_date}</strong> at <strong>{selectedNoticeForPrint.meeting_time} ({selectedNoticeForPrint.time_of_day})</strong> in the office of the Society. You are requested to attend the meeting on time.
                </div>
              )}

              {/* Subject Oval Pill Header (Exact match to 'विषय' oval pill in photo) */}
              <div style={{ textAlign: 'center', margin: '20px 0 16px' }}>
                <span style={{
                  display: 'inline-block',
                  border: '2px solid #000',
                  borderRadius: 24,
                  padding: '4px 34px',
                  fontSize: 17,
                  fontWeight: 'bold',
                  background: '#fff'
                }}>
                  {lang === 'mr' ? 'विषय' : 'Subject / Agenda'}
                </span>
              </div>

              {/* Ruled Lines Container Rendering Agenda Topics */}
              <div style={{ borderTop: '1px solid #000', minHeight: 220, paddingTop: 10 }}>
                {selectedNoticeForPrint.agenda_subjects.split('\n').map((line, idx) => (
                  <div key={idx} style={{
                    borderBottom: '1px solid #000',
                    padding: '8px 4px',
                    fontSize: 13.5,
                    fontWeight: 600,
                    minHeight: 32
                  }}>
                    {line}
                  </div>
                ))}
                {/* Additional empty ruled lines to complete physical page look */}
                {Array.from({ length: Math.max(0, 6 - selectedNoticeForPrint.agenda_subjects.split('\n').length) }).map((_, i) => (
                  <div key={`empty-${i}`} style={{ borderBottom: '1px solid #000', height: 32 }} />
                ))}
              </div>

              {/* Signatures */}
              <div style={{ display: 'flex', justifyContent: 'space-between', textAlign: 'center', fontSize: 13, fontWeight: 'bold', marginTop: 45 }}>
                <div>
                  {lang === 'mr' ? 'हिशोबनीस स्वाक्षरी' : 'Accountant Signature'}<br /><br />
                  _______________
                </div>
                <div>
                  {lang === 'mr' ? 'व्यवस्थापक स्वाक्षरी' : 'Manager Signature'}<br /><br />
                  _______________
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MeetingNoticeForm;
