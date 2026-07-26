import React, { useEffect, useState, useCallback } from 'react';
import {
  UserPlus, Search, CheckCircle, XCircle, Hash, Phone, MapPin,
  Upload, Eye, ShieldCheck, RefreshCw, ArrowRight, X, Image as ImageIcon,
  Camera, FileText, User as UserIcon, Wallet, CreditCard, Sparkles
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import {
  fetchCustomers,
  fetchNextCustomerId,
  createCustomer,
  updateCustomer,
  uploadCustomerDocument,
  getFileUrl,
} from '../api/client';
import type { Customer, CustomerCreate, User } from '../types';

interface SavingsAccountsProps {
  user?: User | null;
  onLogout?: () => void;
  onToggleMobileMenu?: () => void;
}

const getDocFileName = (docPath: string | null | undefined, defaultName: string): string => {
  if (!docPath) return '';
  if (docPath.startsWith('data:application/pdf') || docPath.toLowerCase().includes('.pdf')) return `${defaultName}.pdf`;
  if (docPath.startsWith('data:image/png') || docPath.toLowerCase().includes('.png')) return `${defaultName}.png`;
  if (docPath.startsWith('data:image/jpeg') || docPath.startsWith('data:image/jpg') || docPath.toLowerCase().includes('.jpg') || docPath.toLowerCase().includes('.jpeg')) return `${defaultName}.jpg`;
  if (docPath.startsWith('data:')) return `${defaultName}_scan`;
  const parts = docPath.split('/');
  const lastPart = parts[parts.length - 1];
  return lastPart || defaultName;
};

const INITIAL_FORM: CustomerCreate = {
  customer_id: '',
  salutation: 'Mr.',
  first_name: '',
  middle_name: '',
  last_name: '',
  mobile_no: '',
  address: '',
  aadhaar_no: '',
  aadhaar_doc_path: '',
  aadhaar_back_doc_path: '',
  pan_no: '',
  pan_doc_path: '',
  opening_balance: 0,
  status: 'ACTIVE',
};

const SavingsAccounts: React.FC<SavingsAccountsProps> = ({ user, onLogout, onToggleMobileMenu }) => {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [form, setForm] = useState<CustomerCreate>(INITIAL_FORM);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploadingAadhaarFront, setUploadingAadhaarFront] = useState(false);
  const [uploadingAadhaarBack, setUploadingAadhaarBack] = useState(false);
  const [uploadingPan, setUploadingPan] = useState(false);
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [docFileNames, setDocFileNames] = useState<{
    aadhaar_front?: string;
    aadhaar_back?: string;
    pan?: string;
  }>({});
  
  const [previewDocUrl, setPreviewDocUrl] = useState<{
    url: string;
    title: string;
    customer?: Customer;
    docType?: 'aadhaar_front' | 'aadhaar_back' | 'pan';
  } | null>(null);

  // Fetch unique 10-digit random customer ID
  const loadNextId = useCallback(async () => {
    try {
      const res = await fetchNextCustomerId();
      setForm(prev => ({ ...prev, customer_id: res.customer_id }));
    } catch {
      // ignore
    }
  }, []);

  const loadCustomers = useCallback(async (q?: string) => {
    setLoading(true);
    try {
      const list = await fetchCustomers(q);
      setCustomers(list);
    } catch {
      setAlert({ type: 'error', msg: 'Could not load customer accounts list.' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCustomers();
    loadNextId();
  }, [loadCustomers, loadNextId]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadCustomers(searchQuery);
  };

  const handleInputChange = (field: keyof CustomerCreate, value: unknown) => {
    setForm(prev => ({ ...prev, [field]: value }));
    setAlert(null);
  };

  // Specific formatters & validators
  const handleMobileChange = (val: string) => {
    const cleaned = val.replace(/\D/g, '').slice(0, 10);
    handleInputChange('mobile_no', cleaned);
  };

  const handleAadhaarChange = (val: string) => {
    const cleaned = val.replace(/\D/g, '').slice(0, 12);
    handleInputChange('aadhaar_no', cleaned);
  };

  const handlePanChange = (val: string) => {
    const cleaned = val.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10);
    handleInputChange('pan_no', cleaned);
  };

  // Auto-compose full name live preview
  const composedFullName = [
    form.salutation,
    form.first_name,
    form.middle_name,
    form.last_name,
  ].filter(Boolean).join(' ').trim();

  // Compress image or encode PDF/document to Base64 Data URL for permanent 100% DB persistence
  const compressImageToDataUrl = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const fileType = file.type || '';
      const fileName = file.name.toLowerCase();

      if (fileType === 'application/pdf' || fileName.endsWith('.pdf') || !fileType.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
        return;
      }

      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(url);
        const canvas = document.createElement('canvas');
        let { width, height } = img;
        const maxDim = 1400;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL(fileType === 'image/png' ? 'image/png' : 'image/jpeg', 0.85));
        } else {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        }
      };
      img.onerror = () => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      };
      img.src = url;
    });
  };

  // Document Upload Handlers (3 Documents: Aadhaar Front, Aadhaar Back, PAN)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, docType: 'aadhaar_front' | 'aadhaar_back' | 'pan') => {
    const file = e.target.files?.[0];
    if (!file) return;

    setDocFileNames(prev => ({ ...prev, [docType]: file.name }));

    if (docType === 'aadhaar_front') setUploadingAadhaarFront(true);
    if (docType === 'aadhaar_back') setUploadingAadhaarBack(true);
    if (docType === 'pan') setUploadingPan(true);

    try {
      const dataUrl = await compressImageToDataUrl(file);
      uploadCustomerDocument(file, docType).catch(() => null);

      if (docType === 'aadhaar_front') {
        setForm(prev => ({ ...prev, aadhaar_doc_path: dataUrl }));
        setAlert({ type: 'success', msg: 'Aadhaar Card (Front Scan) attached successfully!' });
      } else if (docType === 'aadhaar_back') {
        setForm(prev => ({ ...prev, aadhaar_back_doc_path: dataUrl }));
        setAlert({ type: 'success', msg: 'Aadhaar Card (Back Scan) attached successfully!' });
      } else {
        setForm(prev => ({ ...prev, pan_doc_path: dataUrl }));
        setAlert({ type: 'success', msg: 'PAN Card scan attached successfully!' });
      }
    } catch {
      setAlert({ type: 'error', msg: `Failed to attach ${docType.toUpperCase()} document.` });
    } finally {
      if (docType === 'aadhaar_front') setUploadingAadhaarFront(false);
      if (docType === 'aadhaar_back') setUploadingAadhaarBack(false);
      if (docType === 'pan') setUploadingPan(false);
    }
  };

  // Replace/Upload Scan Photo Directly in Preview Modal
  const handleModalPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !previewDocUrl) return;

    if (previewDocUrl.docType) {
      setDocFileNames(prev => ({ ...prev, [previewDocUrl.docType!]: file.name }));
    }

    try {
      const dataUrl = await compressImageToDataUrl(file);
      uploadCustomerDocument(file, previewDocUrl.docType || 'aadhaar_front').catch(() => null);

      if (previewDocUrl.customer && previewDocUrl.docType) {
        const cust = previewDocUrl.customer;
        const fieldMap = {
          aadhaar_front: 'aadhaar_doc_path',
          aadhaar_back: 'aadhaar_back_doc_path',
          pan: 'pan_doc_path',
        };
        const fieldName = fieldMap[previewDocUrl.docType];
        const updatePayload: CustomerCreate = {
          customer_id: cust.customer_id,
          salutation: cust.salutation || 'Mr.',
          first_name: cust.first_name,
          middle_name: cust.middle_name || undefined,
          last_name: cust.last_name,
          mobile_no: cust.mobile_no || undefined,
          address: cust.address || undefined,
          aadhaar_no: cust.aadhaar_no || undefined,
          aadhaar_doc_path: cust.aadhaar_doc_path || undefined,
          aadhaar_back_doc_path: cust.aadhaar_back_doc_path || undefined,
          pan_no: cust.pan_no || undefined,
          pan_doc_path: cust.pan_doc_path || undefined,
          opening_balance: cust.opening_balance || 0,
          status: cust.status || 'ACTIVE',
          [fieldName]: dataUrl,
        };
        await updateCustomer(cust.id, updatePayload);
        loadCustomers();
      } else if (previewDocUrl.docType) {
        const fieldMap = {
          aadhaar_front: 'aadhaar_doc_path',
          aadhaar_back: 'aadhaar_back_doc_path',
          pan: 'pan_doc_path',
        };
        const fieldName = fieldMap[previewDocUrl.docType] as keyof CustomerCreate;
        setForm(prev => ({ ...prev, [fieldName]: dataUrl }));
      }

      setPreviewDocUrl(prev => prev ? { ...prev, url: dataUrl } : null);
      setAlert({ type: 'success', msg: 'Document scan photo updated and saved!' });
    } catch {
      setAlert({ type: 'error', msg: 'Failed to update document photo.' });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.first_name.trim() || !form.last_name.trim()) {
      setAlert({ type: 'error', msg: 'First name and Last name are required.' });
      return;
    }

    if (form.mobile_no && form.mobile_no.trim().length !== 10) {
      setAlert({ type: 'error', msg: 'Mobile number must be exactly 10 digits.' });
      return;
    }

    if (form.aadhaar_no && form.aadhaar_no.trim().length !== 12) {
      setAlert({ type: 'error', msg: 'Aadhaar number must be exactly 12 digits.' });
      return;
    }

    const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
    if (form.pan_no && form.pan_no.trim() && !panRegex.test(form.pan_no.trim())) {
      setAlert({ type: 'error', msg: 'PAN number must follow format 5 Letters + 4 Digits + 1 Letter (e.g. ABCDE1234F).' });
      return;
    }

    setLoading(true);
    try {
      if (editingId) {
        await updateCustomer(editingId, form);
        setAlert({ type: 'success', msg: `Customer account ${form.customer_id} updated successfully!` });
      } else {
        const created = await createCustomer(form);
        setAlert({ type: 'success', msg: `Savings Account created! Customer ID: ${created.customer_id}` });
      }
      handleReset();
      loadCustomers();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || 'Operation failed.';
      setAlert({ type: 'error', msg });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (cust: Customer) => {
    setEditingId(cust.id);
    setForm({
      customer_id: cust.customer_id,
      salutation: cust.salutation || 'Mr.',
      first_name: cust.first_name,
      middle_name: cust.middle_name || '',
      last_name: cust.last_name,
      mobile_no: cust.mobile_no || '',
      address: cust.address || '',
      aadhaar_no: cust.aadhaar_no || '',
      aadhaar_doc_path: cust.aadhaar_doc_path || '',
      aadhaar_back_doc_path: cust.aadhaar_back_doc_path || '',
      pan_no: cust.pan_no || '',
      pan_doc_path: cust.pan_doc_path || '',
      opening_balance: cust.opening_balance || 0,
      status: cust.status || 'ACTIVE',
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setAlert({ type: 'success', msg: `Editing Customer ${cust.customer_id}` });
  };

  const handleReset = () => {
    setForm(INITIAL_FORM);
    setEditingId(null);
    setAlert(null);
    loadNextId();
  };

  const handleNewTransactionForCustomer = (cust: Customer) => {
    navigate(`/?customer_id=${cust.customer_id}&customer_name=${encodeURIComponent(cust.full_name)}`);
  };

  return (
    <div className="page-container">
      <Header
        title="Customer Savings Accounts"
        subtitle="Manage customer profiles, 10-Digit IDs, Aadhaar Front/Back &amp; PAN card scans"
        level={1}
        user={user}
        onLogout={onLogout}
        onToggleMobileMenu={onToggleMobileMenu}
      />

      <div className="page-content">

        {/* ── Alert Banner ── */}
        {alert && (
          <div
            className={`alert alert-${alert.type}`}
            style={
              alert.type === 'success'
                ? { background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#15803d', fontWeight: 700 }
                : { background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', fontWeight: 700 }
            }
          >
            {alert.type === 'success' ? <CheckCircle size={18} color="#16a34a" /> : <XCircle size={18} color="#dc2626" />}
            <span style={{ color: alert.type === 'success' ? '#15803d' : '#b91c1c' }}>{alert.msg}</span>
          </div>
        )}

        {/* ── Overhauled Modern Savings Account Form ── */}
        <div className="card" style={{ marginBottom: 32, border: '1px solid #cbd5e1', boxShadow: '0 8px 30px rgba(0,0,0,0.06)' }}>
          <div className="card-header" style={{ background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)', color: '#ffffff', borderRadius: '12px 12px 0 0', padding: '16px 24px' }}>
            <div>
              <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#ffffff', fontSize: 18 }}>
                <UserPlus size={22} color="#60a5fa" />
                {editingId ? `Edit Customer Profile (${form.customer_id})` : 'New Savings Account Registration Form'}
              </div>
              <div className="card-subtitle" style={{ color: '#94a3b8', fontSize: 12, marginTop: 4 }}>
                Fill out the member identity details and attach 3-Document KYC Scans
              </div>
            </div>

            {editingId && (
              <button className="btn btn-secondary btn-sm" onClick={handleReset} style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', border: '1px solid rgba(255,255,255,0.3)' }}>
                + Reset &amp; Register New Account
              </button>
            )}
          </div>

          <div className="card-body" style={{ padding: '24px' }}>
            <form onSubmit={handleSubmit}>
              
              {/* ── Section 1: Account Identity & Deposit ── */}
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, padding: 18, marginBottom: 20 }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: '#1e293b', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Hash size={18} color="var(--blue-700)" />
                  <span>1. Account Identity &amp; Initial Deposit</span>
                </div>

                <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
                  
                  {/* Customer ID */}
                  <div className="form-group">
                    <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 700 }}>10-Digit Customer ID <span className="required">*</span></span>
                      <button
                        type="button"
                        onClick={loadNextId}
                        style={{ background: '#eff6ff', border: '1px solid #bfdbfe', color: 'var(--blue-700)', borderRadius: 4, padding: '2px 8px', fontSize: 11, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
                      >
                        <Sparkles size={11} /> Auto-Generate
                      </button>
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: 16, color: 'var(--blue-800)', letterSpacing: '0.08em', background: '#ffffff' }}
                      value={form.customer_id || ''}
                      onChange={e => handleInputChange('customer_id', e.target.value.replace(/\D/g, '').slice(0, 10))}
                      placeholder="e.g. 5839204192"
                      required
                    />
                    <div style={{ fontSize: 10, color: '#64748b', marginTop: 4 }}>Unique 10-digit random account identifier</div>
                  </div>

                  {/* Mobile Number (10 digits only) */}
                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: 700 }}>
                      <Phone size={13} style={{ display: 'inline', marginRight: 4 }} />
                      Mobile Number (10 Digits)
                    </label>
                    <input
                      type="tel"
                      className="form-input"
                      placeholder="10-digit mobile number"
                      value={form.mobile_no || ''}
                      onChange={e => handleMobileChange(e.target.value)}
                      maxLength={10}
                      style={{ background: '#ffffff' }}
                    />
                    <div style={{ fontSize: 10, color: form.mobile_no && form.mobile_no.length !== 10 ? '#b91c1c' : '#64748b', marginTop: 4, fontWeight: form.mobile_no && form.mobile_no.length !== 10 ? 700 : 400 }}>
                      {form.mobile_no ? `${form.mobile_no.length}/10 digits entered` : 'Exactly 10 digits required'}
                    </div>
                  </div>

                  {/* Opening Savings Balance */}
                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: 700 }}>
                      <Wallet size={13} style={{ display: 'inline', marginRight: 4 }} />
                      Opening Savings Deposit (₹)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      className="form-input"
                      placeholder="0.00"
                      value={form.opening_balance || ''}
                      onChange={e => handleInputChange('opening_balance', parseFloat(e.target.value) || 0)}
                      style={{ background: '#ffffff' }}
                    />
                    <div style={{ fontSize: 10, color: '#64748b', marginTop: 4 }}>Initial savings balance credited</div>
                  </div>

                </div>
              </div>

              {/* ── Section 2: Member Personal Profile ── */}
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, padding: 18, marginBottom: 20 }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: '#1e293b', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <UserIcon size={18} color="var(--blue-700)" />
                  <span>2. Member Personal Profile</span>
                </div>

                <div className="form-grid" style={{ gridTemplateColumns: '120px 1fr 1fr 1fr', gap: 14, marginBottom: 14 }}>
                  
                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: 700 }}>Salutation</label>
                    <select
                      className="form-select"
                      value={form.salutation || 'Mr.'}
                      onChange={e => handleInputChange('salutation', e.target.value)}
                      style={{ background: '#ffffff' }}
                    >
                      <option value="Mr.">Mr.</option>
                      <option value="Smt.">Smt.</option>
                      <option value="Sri.">Sri.</option>
                      <option value="Dr.">Dr.</option>
                      <option value="M/s.">M/s.</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: 700 }}>First Name <span className="required">*</span></label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="First name"
                      value={form.first_name || ''}
                      onChange={e => handleInputChange('first_name', e.target.value)}
                      style={{ background: '#ffffff' }}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: 700 }}>Middle Name</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Middle name"
                      value={form.middle_name || ''}
                      onChange={e => handleInputChange('middle_name', e.target.value)}
                      style={{ background: '#ffffff' }}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: 700 }}>Last Name <span className="required">*</span></label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Last / Surname"
                      value={form.last_name || ''}
                      onChange={e => handleInputChange('last_name', e.target.value)}
                      style={{ background: '#ffffff' }}
                      required
                    />
                  </div>

                </div>

                {/* Full Name Preview Banner */}
                {composedFullName && (
                  <div style={{
                    padding: '10px 16px', background: '#eff6ff', border: '1px solid #bfdbfe',
                    borderRadius: 8, fontSize: 13, display: 'flex', alignItems: 'center', gap: 10
                  }}>
                    <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--blue-800)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>FULL NAME:</span>
                    <span style={{ fontWeight: 800, color: '#0f172a', fontSize: 15 }}>{composedFullName}</span>
                  </div>
                )}
              </div>

              {/* ── Section 3: Residential Address ── */}
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, padding: 18, marginBottom: 20 }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: '#1e293b', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <MapPin size={18} color="var(--blue-700)" />
                  <span>3. Residential Address</span>
                </div>

                <div className="form-group">
                  <input
                    type="text"
                    className="form-input"
                    placeholder="House/Plot No., Village / Town, Taluka, Belagavi District, Pin Code"
                    value={form.address || ''}
                    onChange={e => handleInputChange('address', e.target.value)}
                    style={{ background: '#ffffff' }}
                  />
                </div>
              </div>

              {/* ── Section 4: 3-Document KYC Verification (With Camera Scan & File Upload) ── */}
              <div style={{
                background: '#f8fafc', border: '1px solid #e2e8f0',
                borderRadius: 12, padding: 18, marginBottom: 24
              }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: '#1e293b', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <ShieldCheck size={18} color="var(--blue-700)" />
                  <span>4. 3-Document KYC Verification (Camera Scan &amp; File Upload)</span>
                </div>

                <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
                  
                  {/* Doc 1: Aadhaar Front Upload Box */}
                  <div style={{ background: '#ffffff', padding: 16, border: '1px solid #cbd5e1', borderRadius: 10, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 800, color: '#1e293b', marginBottom: 8, display: 'flex', justifyContent: 'space-between' }}>
                        <span>1. Aadhaar Card (Front)</span>
                        <span style={{ fontSize: 10, color: '#64748b' }}>12 Digits</span>
                      </div>
                      
                      <input
                        type="text"
                        className="form-input"
                        placeholder="12-digit Aadhaar Number"
                        value={form.aadhaar_no || ''}
                        onChange={e => handleAadhaarChange(e.target.value)}
                        maxLength={12}
                        style={{ marginBottom: 10, fontSize: 13, fontFamily: 'monospace', fontWeight: 700 }}
                      />
                      <div style={{ fontSize: 10, color: form.aadhaar_no && form.aadhaar_no.length !== 12 ? '#b91c1c' : '#64748b', marginBottom: 10, fontWeight: form.aadhaar_no && form.aadhaar_no.length !== 12 ? 700 : 400 }}>
                        {form.aadhaar_no ? `${form.aadhaar_no.length}/12 digits` : '12-digit number'}
                      </div>
                    </div>

                    <div>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 6 }}>
                        {/* Option 1: Mobile Camera Scan */}
                        <label className="btn btn-secondary btn-sm" style={{ cursor: 'pointer', margin: 0, fontSize: 11, padding: '5px 8px', flex: 1, justifyContent: 'center' }}>
                          <Camera size={13} color="#2563eb" /> Camera
                          <input
                            type="file"
                            accept="image/*"
                            capture="environment"
                            style={{ display: 'none' }}
                            onChange={e => handleFileUpload(e, 'aadhaar_front')}
                          />
                        </label>

                        {/* Option 2: File Upload (PDF/Image) */}
                        <label className="btn btn-secondary btn-sm" style={{ cursor: 'pointer', margin: 0, fontSize: 11, padding: '5px 8px', flex: 1, justifyContent: 'center' }}>
                          <Upload size={13} /> Upload File
                          <input
                            type="file"
                            accept="image/*,.pdf,.doc,.docx"
                            style={{ display: 'none' }}
                            onChange={e => handleFileUpload(e, 'aadhaar_front')}
                          />
                        </label>

                        {form.aadhaar_doc_path && (
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => setPreviewDocUrl({ url: getFileUrl(form.aadhaar_doc_path), title: 'Aadhaar Card (Front Scan)', docType: 'aadhaar_front' })}
                            style={{ color: 'var(--blue-700)', borderColor: '#bfdbfe', fontSize: 11, padding: '5px 8px' }}
                          >
                            <Eye size={13} /> View
                          </button>
                        )}
                      </div>

                      {form.aadhaar_doc_path && (
                        <div style={{ fontSize: 11, color: '#15803d', fontWeight: 700, marginTop: 6, display: 'flex', flexDirection: 'column', gap: 2 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <CheckCircle size={12} color="#16a34a" /> Front Scan attached
                          </div>
                          <div style={{ fontSize: 10, color: '#475569', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            📄 {docFileNames.aadhaar_front || getDocFileName(form.aadhaar_doc_path, 'Aadhaar_Front_Scan')}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Doc 2: Aadhaar Back Upload Box */}
                  <div style={{ background: '#ffffff', padding: 16, border: '1px solid #cbd5e1', borderRadius: 10, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 800, color: '#1e293b', marginBottom: 8 }}>2. Aadhaar Card (Back)</div>
                      <div style={{ fontSize: 11, color: '#64748b', marginBottom: 12 }}>Address &amp; QR Code Side Scan</div>
                    </div>

                    <div>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 6 }}>
                        {/* Option 1: Mobile Camera Scan */}
                        <label className="btn btn-secondary btn-sm" style={{ cursor: 'pointer', margin: 0, fontSize: 11, padding: '5px 8px', flex: 1, justifyContent: 'center' }}>
                          <Camera size={13} color="#2563eb" /> Camera
                          <input
                            type="file"
                            accept="image/*"
                            capture="environment"
                            style={{ display: 'none' }}
                            onChange={e => handleFileUpload(e, 'aadhaar_back')}
                          />
                        </label>

                        {/* Option 2: File Upload (PDF/Image) */}
                        <label className="btn btn-secondary btn-sm" style={{ cursor: 'pointer', margin: 0, fontSize: 11, padding: '5px 8px', flex: 1, justifyContent: 'center' }}>
                          <Upload size={13} /> Upload File
                          <input
                            type="file"
                            accept="image/*,.pdf,.doc,.docx"
                            style={{ display: 'none' }}
                            onChange={e => handleFileUpload(e, 'aadhaar_back')}
                          />
                        </label>

                        {form.aadhaar_back_doc_path && (
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => setPreviewDocUrl({ url: getFileUrl(form.aadhaar_back_doc_path), title: 'Aadhaar Card (Back Scan)', docType: 'aadhaar_back' })}
                            style={{ color: 'var(--blue-700)', borderColor: '#bfdbfe', fontSize: 11, padding: '5px 8px' }}
                          >
                            <Eye size={13} /> View
                          </button>
                        )}
                      </div>

                      {form.aadhaar_back_doc_path && (
                        <div style={{ fontSize: 11, color: '#15803d', fontWeight: 700, marginTop: 6, display: 'flex', flexDirection: 'column', gap: 2 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <CheckCircle size={12} color="#16a34a" /> Back Scan attached
                          </div>
                          <div style={{ fontSize: 10, color: '#475569', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            📄 {docFileNames.aadhaar_back || getDocFileName(form.aadhaar_back_doc_path, 'Aadhaar_Back_Scan')}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Doc 3: PAN Card Upload Box */}
                  <div style={{ background: '#ffffff', padding: 16, border: '1px solid #cbd5e1', borderRadius: 10, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 800, color: '#1e293b', marginBottom: 8, display: 'flex', justifyContent: 'space-between' }}>
                        <span>3. PAN Card Scan</span>
                        <span style={{ fontSize: 10, color: '#64748b' }}>ABCDE1234F</span>
                      </div>
                      
                      <input
                        type="text"
                        className="form-input"
                        placeholder="e.g. ABCDE1234F"
                        value={form.pan_no || ''}
                        onChange={e => handlePanChange(e.target.value)}
                        maxLength={10}
                        style={{ marginBottom: 10, fontSize: 13, fontFamily: 'monospace', fontWeight: 700, textTransform: 'uppercase' }}
                      />
                      <div style={{ fontSize: 10, color: form.pan_no && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(form.pan_no) ? '#b91c1c' : '#64748b', marginBottom: 10, fontWeight: form.pan_no && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(form.pan_no) ? 700 : 400 }}>
                        {form.pan_no ? `Format: 5 Letters + 4 Digits + 1 Letter` : '10-character PAN'}
                      </div>
                    </div>

                    <div>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 6 }}>
                        {/* Option 1: Mobile Camera Scan */}
                        <label className="btn btn-secondary btn-sm" style={{ cursor: 'pointer', margin: 0, fontSize: 11, padding: '5px 8px', flex: 1, justifyContent: 'center' }}>
                          <Camera size={13} color="#2563eb" /> Camera
                          <input
                            type="file"
                            accept="image/*"
                            capture="environment"
                            style={{ display: 'none' }}
                            onChange={e => handleFileUpload(e, 'pan')}
                          />
                        </label>

                        {/* Option 2: File Upload (PDF/Image) */}
                        <label className="btn btn-secondary btn-sm" style={{ cursor: 'pointer', margin: 0, fontSize: 11, padding: '5px 8px', flex: 1, justifyContent: 'center' }}>
                          <Upload size={13} /> Upload File
                          <input
                            type="file"
                            accept="image/*,.pdf,.doc,.docx"
                            style={{ display: 'none' }}
                            onChange={e => handleFileUpload(e, 'pan')}
                          />
                        </label>

                        {form.pan_doc_path && (
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => setPreviewDocUrl({ url: getFileUrl(form.pan_doc_path), title: 'PAN Card Scan', docType: 'pan' })}
                            style={{ color: 'var(--blue-700)', borderColor: '#bfdbfe', fontSize: 11, padding: '5px 8px' }}
                          >
                            <Eye size={13} /> View
                          </button>
                        )}
                      </div>

                      {form.pan_doc_path && (
                        <div style={{ fontSize: 11, color: '#15803d', fontWeight: 700, marginTop: 6, display: 'flex', flexDirection: 'column', gap: 2 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <CheckCircle size={12} color="#16a34a" /> PAN Card scan attached
                          </div>
                          <div style={{ fontSize: 10, color: '#475569', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            📄 {docFileNames.pan || getDocFileName(form.pan_doc_path, 'PAN_Card_Scan')}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                </div>
              </div>

              {/* Submit Buttons */}
              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                {editingId && (
                  <button type="button" className="btn btn-secondary btn-lg" onClick={handleReset}>
                    Cancel Edit
                  </button>
                )}
                <button type="submit" className="btn btn-primary btn-lg" disabled={loading} style={{ padding: '12px 24px', fontSize: 15, fontWeight: 800 }}>
                  {loading ? <span className="spinner" /> : <UserPlus size={20} />}
                  {editingId ? 'Update Customer Savings Account' : 'Register Customer Savings Account'}
                </button>
              </div>

            </form>
          </div>
        </div>

        {/* ── Registered Customers List Table ── */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Customer Savings Accounts Directory</div>
              <div className="card-subtitle">Showing all registered member accounts &amp; 3-document KYC scans</div>
            </div>

            {/* Search Bar */}
            <form onSubmit={handleSearch} style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
                <input
                  type="text"
                  className="filter-input"
                  placeholder="Search by ID, Name, Mobile, Aadhaar, PAN…"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  style={{ width: '100%', paddingLeft: 30 }}
                />
                <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              </div>

              <button type="submit" className="btn btn-primary btn-sm">
                Search
              </button>

              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => { setSearchQuery(''); loadCustomers(''); }}
              >
                <RefreshCw size={14} /> Reset
              </button>
            </form>
          </div>

          {/* Table */}
          <div className="table-wrapper">
            {loading ? (
              <div className="loading-overlay">
                <span className="spinner" /> Loading customer accounts…
              </div>
            ) : customers.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon"><UserPlus /></div>
                <div className="empty-state-title">No customer savings accounts found</div>
                <div className="empty-state-sub">Create a new customer account using the registration form above</div>
              </div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Customer ID</th>
                    <th>Full Name</th>
                    <th>Mobile Number</th>
                    <th>Residential Address</th>
                    <th>Aadhaar No / 2 Scans</th>
                    <th>PAN No / Scan</th>
                    <th style={{ textAlign: 'right' }}>Opening Balance</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {customers.map(c => (
                    <tr key={c.id}>
                      <td style={{ fontFamily: 'monospace', fontWeight: 800, color: 'var(--blue-800)', fontSize: 13 }}>
                        {c.customer_id}
                      </td>
                      <td style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                        {c.full_name}
                      </td>
                      <td>{c.mobile_no || '—'}</td>
                      <td style={{ fontSize: 12, maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {c.address || '—'}
                      </td>
                      <td>
                        <div style={{ fontSize: 12 }}>
                          <div>{c.aadhaar_no || '—'}</div>
                          <div style={{ display: 'flex', gap: 4, marginTop: 4, flexWrap: 'wrap' }}>
                            {c.aadhaar_doc_path && (
                              <button
                                onClick={() => setPreviewDocUrl({ url: getFileUrl(c.aadhaar_doc_path), title: `Aadhaar Front - ${c.full_name}`, customer: c, docType: 'aadhaar_front' })}
                                style={{ display: 'inline-flex', alignItems: 'center', gap: 3, background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', borderRadius: 4, padding: '2px 6px', fontSize: 10, cursor: 'pointer', fontWeight: 700 }}
                                title={getDocFileName(c.aadhaar_doc_path, 'Aadhaar_Front')}
                              >
                                <ImageIcon size={10} /> {getDocFileName(c.aadhaar_doc_path, 'Front Scan')}
                              </button>
                            )}
                            {c.aadhaar_back_doc_path && (
                              <button
                                onClick={() => setPreviewDocUrl({ url: getFileUrl(c.aadhaar_back_doc_path), title: `Aadhaar Back - ${c.full_name}`, customer: c, docType: 'aadhaar_back' })}
                                style={{ display: 'inline-flex', alignItems: 'center', gap: 3, background: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0', borderRadius: 4, padding: '2px 6px', fontSize: 10, cursor: 'pointer', fontWeight: 700 }}
                                title={getDocFileName(c.aadhaar_back_doc_path, 'Aadhaar_Back')}
                              >
                                <ImageIcon size={10} /> {getDocFileName(c.aadhaar_back_doc_path, 'Back Scan')}
                              </button>
                            )}
                          </div>
                        </div>
                      </td>
                      <td>
                        <div style={{ fontSize: 12 }}>
                          <div>{c.pan_no || '—'}</div>
                          {c.pan_doc_path && (
                            <button
                              onClick={() => setPreviewDocUrl({ url: getFileUrl(c.pan_doc_path), title: `PAN - ${c.full_name}`, customer: c, docType: 'pan' })}
                              style={{ display: 'inline-flex', alignItems: 'center', gap: 3, marginTop: 4, background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', borderRadius: 4, padding: '2px 6px', fontSize: 10, cursor: 'pointer', fontWeight: 700 }}
                              title={getDocFileName(c.pan_doc_path, 'PAN_Scan')}
                            >
                              <ImageIcon size={10} /> {getDocFileName(c.pan_doc_path, 'PAN Scan')}
                            </button>
                          )}
                        </div>
                      </td>
                      <td style={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, color: 'var(--blue-700)' }}>
                        ₹ {Number(c.opening_balance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button
                            className="btn btn-secondary btn-sm"
                            style={{ fontSize: 11, padding: '4px 8px' }}
                            onClick={() => handleEdit(c)}
                            title="Edit Customer Profile"
                          >
                            Edit Profile
                          </button>
                          <button
                            className="btn btn-primary btn-sm"
                            style={{ fontSize: 11, padding: '4px 8px' }}
                            onClick={() => handleNewTransactionForCustomer(c)}
                            title="Create Credit Account Transaction for this Customer"
                          >
                            Entry <ArrowRight size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* ── Enhanced Document Preview Modal with Camera & File Upload ── */}
        {previewDocUrl && (
          <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(15,23,42,0.75)', backdropFilter: 'blur(5px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 100000, padding: 20,
          }}>
            <div style={{
              background: '#ffffff', border: '1px solid var(--border-muted)',
              borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: 780,
              maxHeight: '90vh', display: 'flex', flexDirection: 'column',
              boxShadow: '0 20px 50px rgba(0,0,0,0.3)', overflow: 'hidden'
            }}>
              <div style={{
                padding: '14px 20px', background: '#f1f5f9', borderBottom: '1px solid #e2e8f0',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                flexWrap: 'wrap', gap: 10,
              }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a' }}>
                  {previewDocUrl.title}
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  {/* Option 1: Take Camera Photo */}
                  <label className="btn btn-primary btn-sm" style={{ cursor: 'pointer', margin: 0, fontSize: 11, padding: '4px 10px' }}>
                    <Camera size={12} /> Camera
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      style={{ display: 'none' }}
                      onChange={handleModalPhotoUpload}
                    />
                  </label>

                  {/* Option 2: Upload File */}
                  <label className="btn btn-secondary btn-sm" style={{ cursor: 'pointer', margin: 0, fontSize: 11, padding: '4px 10px' }}>
                    <Upload size={12} /> Upload File
                    <input
                      type="file"
                      accept="image/*,.pdf,.doc,.docx"
                      style={{ display: 'none' }}
                      onChange={handleModalPhotoUpload}
                    />
                  </label>

                  {previewDocUrl.url && !previewDocUrl.url.startsWith('data:') && (
                    <a
                      href={previewDocUrl.url}
                      target="_blank"
                      rel="noreferrer"
                      className="btn btn-secondary btn-sm"
                      style={{ fontSize: 11, padding: '4px 10px' }}
                    >
                      Open Link ↗
                    </a>
                  )}
                  <button
                    onClick={() => setPreviewDocUrl(null)}
                    style={{ background: 'none', border: 'none', color: '#64748b', fontSize: 22, cursor: 'pointer' }}
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>

              <div style={{ padding: 20, overflowY: 'auto', textAlign: 'center', background: '#f8fafc', flex: 1 }}>
                {(() => {
                  const urlLower = previewDocUrl.url.toLowerCase();
                  const isPdf =
                    urlLower.includes('application/pdf') ||
                    urlLower.includes('application/x-pdf') ||
                    urlLower.endsWith('.pdf') ||
                    urlLower.includes('.pdf');

                  if (isPdf) {
                    return (
                      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', alignItems: 'center' }}>
                        <div style={{
                          width: '100%',
                          background: '#ffffff',
                          border: '1px solid #cbd5e1',
                          borderRadius: 8,
                          padding: 16,
                          marginBottom: 16,
                          boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                        }}>
                          <object
                            data={previewDocUrl.url}
                            type="application/pdf"
                            style={{ width: '100%', height: '500px', borderRadius: 6, border: 'none' }}
                          >
                            <iframe
                              src={previewDocUrl.url}
                              style={{ width: '100%', height: '500px', border: 'none', borderRadius: 6 }}
                              title="PDF Preview"
                            />
                          </object>
                        </div>

                        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                          <button
                            type="button"
                            className="btn btn-primary btn-sm"
                            onClick={() => {
                              if (previewDocUrl.url.startsWith('data:')) {
                                try {
                                  const parts = previewDocUrl.url.split(',');
                                  const mimeMatch = parts[0].match(/:(.*?);/);
                                  const mime = mimeMatch ? mimeMatch[1] : 'application/pdf';
                                  const bstr = atob(parts[1]);
                                  let n = bstr.length;
                                  const u8arr = new Uint8Array(n);
                                  while (n--) {
                                    u8arr[n] = bstr.charCodeAt(n);
                                  }
                                  const blob = new Blob([u8arr], { type: mime });
                                  const blobUrl = URL.createObjectURL(blob);
                                  const win = window.open(blobUrl, '_blank');
                                  if (!win) {
                                    const a = document.createElement('a');
                                    a.href = blobUrl;
                                    a.download = `${previewDocUrl.title.replace(/[^a-z0-9]/gi, '_')}.pdf`;
                                    a.click();
                                  }
                                } catch {
                                  const a = document.createElement('a');
                                  a.href = previewDocUrl.url;
                                  a.download = `${previewDocUrl.title.replace(/[^a-z0-9]/gi, '_')}.pdf`;
                                  a.click();
                                }
                              } else {
                                window.open(previewDocUrl.url, '_blank');
                              }
                            }}
                            style={{ fontSize: 13, padding: '8px 18px' }}
                          >
                            Open / Download PDF Document ↗
                          </button>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div>
                      <img
                        src={previewDocUrl.url}
                        alt="Document Scan Preview"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                          const fallbackDiv = document.getElementById('modal-fallback-card');
                          if (fallbackDiv) fallbackDiv.style.display = 'block';
                        }}
                        style={{ maxWidth: '100%', maxHeight: '600px', borderRadius: 8, boxShadow: '0 4px 20px rgba(0,0,0,0.12)' }}
                      />

                      {/* Interactive Fallback Container with Camera & Upload Actions */}
                      <div
                        id="modal-fallback-card"
                        style={{
                          display: 'none',
                          background: '#ffffff',
                          border: '2px dashed #cbd5e1',
                          borderRadius: 12,
                          padding: 32,
                          maxWidth: 480,
                          margin: '20px auto',
                        }}
                      >
                        <div style={{ fontSize: 16, fontWeight: 700, color: '#1e293b', marginBottom: 8 }}>
                          Document Scan Attached &amp; Saved
                        </div>
                        <div style={{ fontSize: 13, color: '#64748b', marginBottom: 20 }}>
                          Select your scan photo or PDF below to attach and view directly!
                        </div>
                        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                          <label className="btn btn-primary btn-lg" style={{ cursor: 'pointer', margin: 0 }}>
                            <Camera size={18} /> Take Camera Photo
                            <input
                              type="file"
                              accept="image/*"
                              capture="environment"
                              style={{ display: 'none' }}
                              onChange={handleModalPhotoUpload}
                            />
                          </label>
                          <label className="btn btn-secondary btn-lg" style={{ cursor: 'pointer', margin: 0 }}>
                            <Upload size={18} /> Upload File
                            <input
                              type="file"
                              accept="image/*,.pdf,.doc,.docx"
                              style={{ display: 'none' }}
                              onChange={handleModalPhotoUpload}
                            />
                          </label>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default SavingsAccounts;
