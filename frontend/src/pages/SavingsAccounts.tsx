import React, { useEffect, useState, useCallback } from 'react';
import {
  UserPlus, Search, CheckCircle, XCircle, Hash, Phone, MapPin,
  FileCheck, Upload, Eye, CreditCard, ShieldCheck, RefreshCw, ArrowRight, X, Image as ImageIcon
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
}

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

const SavingsAccounts: React.FC<SavingsAccountsProps> = ({ user, onLogout }) => {
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
  
  const [previewDocUrl, setPreviewDocUrl] = useState<{
    url: string;
    title: string;
    customer?: Customer;
    docType?: 'aadhaar_front' | 'aadhaar_back' | 'pan';
  } | null>(null);

  // Fetch next 10-digit customer ID
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

      // If PDF or non-image document, read as Data URL directly without canvas compression
      if (fileType === 'application/pdf' || fileName.endsWith('.pdf') || !fileType.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
        return;
      }

      // If JPEG, PNG, JPG, WEBP, GIF, SVG etc., compress via canvas
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

    try {
      const dataUrl = await compressImageToDataUrl(file);
      uploadCustomerDocument(file, previewDocUrl.docType || 'aadhaar_front').catch(() => null);

      // If viewing from an existing customer record, save directly to database!
      if (previewDocUrl.customer && previewDocUrl.docType) {
        const cust = previewDocUrl.customer;
        const fieldMap = {
          aadhaar_front: 'aadhaar_doc_path',
          aadhaar_back: 'aadhaar_back_doc_path',
          pan: 'pan_doc_path',
        };
        const fieldName = fieldMap[previewDocUrl.docType];
        await updateCustomer(cust.id, {
          ...cust,
          [fieldName]: dataUrl,
        });
        loadCustomers();
      } else if (previewDocUrl.docType) {
        // If in form creation
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

        {/* ── Create / Edit Customer Form Card ── */}
        <div className="card" style={{ marginBottom: 32 }}>
          <div className="card-header">
            <div>
              <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <UserPlus size={20} color="var(--blue-700)" />
                {editingId ? `Edit Savings Account (${form.customer_id})` : 'New Savings Account Registration'}
              </div>
              <div className="card-subtitle">Auto-generated 10-Digit Customer ID &amp; 3-Document Verification</div>
            </div>

            {editingId && (
              <button className="btn btn-secondary btn-sm" onClick={handleReset}>
                + New Customer Account
              </button>
            )}
          </div>

          <div className="card-body">
            <form onSubmit={handleSubmit}>
              
              {/* Row 1: Customer ID & Opening Balance */}
              <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr 1fr', marginBottom: 16 }}>
                
                <div className="form-group">
                  <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>10-Digit Customer ID <span className="required">*</span></span>
                    <button
                      type="button"
                      onClick={loadNextId}
                      style={{ background: 'none', border: 'none', color: 'var(--blue-700)', cursor: 'pointer', fontSize: 11, fontWeight: 700 }}
                    >
                      Auto-Generate
                    </button>
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="text"
                      className="form-input"
                      style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: 16, color: 'var(--blue-800)', letterSpacing: '0.08em' }}
                      value={form.customer_id || ''}
                      onChange={e => handleInputChange('customer_id', e.target.value)}
                      placeholder="1000000001"
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Mobile Number</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="10-digit mobile number"
                    value={form.mobile_no || ''}
                    onChange={e => handleInputChange('mobile_no', e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Opening Savings Balance (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    className="form-input"
                    placeholder="0.00"
                    value={form.opening_balance || ''}
                    onChange={e => handleInputChange('opening_balance', parseFloat(e.target.value) || 0)}
                  />
                </div>

              </div>

              {/* Row 2: Name Parts */}
              <div className="form-grid" style={{ gridTemplateColumns: '120px 1fr 1fr 1fr', marginBottom: 16 }}>
                
                <div className="form-group">
                  <label className="form-label">Salutation</label>
                  <select
                    className="form-select"
                    value={form.salutation || 'Mr.'}
                    onChange={e => handleInputChange('salutation', e.target.value)}
                  >
                    <option value="Mr.">Mr.</option>
                    <option value="Smt.">Smt.</option>
                    <option value="Sri.">Sri.</option>
                    <option value="Dr.">Dr.</option>
                    <option value="M/s.">M/s.</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">First Name <span className="required">*</span></label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="First name"
                    value={form.first_name || ''}
                    onChange={e => handleInputChange('first_name', e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Middle Name</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Middle name"
                    value={form.middle_name || ''}
                    onChange={e => handleInputChange('middle_name', e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Last Name <span className="required">*</span></label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Last / Surname"
                    value={form.last_name || ''}
                    onChange={e => handleInputChange('last_name', e.target.value)}
                    required
                  />
                </div>

              </div>

              {/* Full Name Preview Banner */}
              {composedFullName && (
                <div style={{
                  padding: '8px 14px', background: '#eff6ff', border: '1px solid #bfdbfe',
                  borderRadius: 'var(--radius-md)', fontSize: 13, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8
                }}>
                  <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--blue-800)', textTransform: 'uppercase' }}>FULL NAME PREVIEW:</span>
                  <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{composedFullName}</span>
                </div>
              )}

              {/* Address */}
              <div className="form-group" style={{ marginBottom: 20 }}>
                <label className="form-label">Residential Address</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Full residential address, Village / Town, Belagavi"
                  value={form.address || ''}
                  onChange={e => handleInputChange('address', e.target.value)}
                />
              </div>

              {/* 3 KYC Document Scans / Uploads Section */}
              <div style={{
                background: '#f8fafc', border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)', padding: 18, marginBottom: 24
              }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <ShieldCheck size={16} color="var(--blue-700)" /> 3-Document KYC Verification (Aadhaar Front, Aadhaar Back &amp; PAN Card)
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
                  
                  {/* Doc 1: Aadhaar Front Upload Box */}
                  <div style={{ background: '#ffffff', padding: 14, border: '1px solid #cbd5e1', borderRadius: 8 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 6 }}>1. Aadhaar Card (Front)</div>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="12-digit Aadhaar Number"
                      value={form.aadhaar_no || ''}
                      onChange={e => handleInputChange('aadhaar_no', e.target.value)}
                      style={{ marginBottom: 10, fontSize: 13 }}
                    />
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <label className="btn btn-secondary btn-sm" style={{ cursor: 'pointer', margin: 0, fontSize: 12, padding: '5px 10px' }}>
                        <Upload size={13} />
                        {uploadingAadhaarFront ? 'Uploading…' : form.aadhaar_doc_path ? 'Change Front' : 'Scan Front'}
                        <input
                          type="file"
                          accept="image/*,.pdf"
                          style={{ display: 'none' }}
                          onChange={e => handleFileUpload(e, 'aadhaar_front')}
                        />
                      </label>

                      {form.aadhaar_doc_path && (
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => setPreviewDocUrl({ url: getFileUrl(form.aadhaar_doc_path), title: 'Aadhaar Card (Front Scan)', docType: 'aadhaar_front' })}
                          style={{ color: 'var(--blue-700)', borderColor: '#bfdbfe', fontSize: 12, padding: '5px 10px' }}
                        >
                          <Eye size={13} /> View
                        </button>
                      )}
                    </div>
                    {form.aadhaar_doc_path && (
                      <div style={{ fontSize: 11, color: '#15803d', fontWeight: 700, marginTop: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <CheckCircle size={12} color="#16a34a" /> Front Scan attached
                      </div>
                    )}
                  </div>

                  {/* Doc 2: Aadhaar Back Upload Box */}
                  <div style={{ background: '#ffffff', padding: 14, border: '1px solid #cbd5e1', borderRadius: 8 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 6 }}>2. Aadhaar Card (Back)</div>
                    <div style={{ fontSize: 11, color: '#64748b', marginBottom: 10 }}>Address &amp; QR Code Side Scan</div>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <label className="btn btn-secondary btn-sm" style={{ cursor: 'pointer', margin: 0, fontSize: 12, padding: '5px 10px' }}>
                        <Upload size={13} />
                        {uploadingAadhaarBack ? 'Uploading…' : form.aadhaar_back_doc_path ? 'Change Back' : 'Scan Back'}
                        <input
                          type="file"
                          accept="image/*,.pdf"
                          style={{ display: 'none' }}
                          onChange={e => handleFileUpload(e, 'aadhaar_back')}
                        />
                      </label>

                      {form.aadhaar_back_doc_path && (
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => setPreviewDocUrl({ url: getFileUrl(form.aadhaar_back_doc_path), title: 'Aadhaar Card (Back Scan)', docType: 'aadhaar_back' })}
                          style={{ color: 'var(--blue-700)', borderColor: '#bfdbfe', fontSize: 12, padding: '5px 10px' }}
                        >
                          <Eye size={13} /> View
                        </button>
                      )}
                    </div>
                    {form.aadhaar_back_doc_path && (
                      <div style={{ fontSize: 11, color: '#15803d', fontWeight: 700, marginTop: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <CheckCircle size={12} color="#16a34a" /> Back Scan attached
                      </div>
                    )}
                  </div>

                  {/* Doc 3: PAN Card Upload Box */}
                  <div style={{ background: '#ffffff', padding: 14, border: '1px solid #cbd5e1', borderRadius: 8 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 6 }}>3. PAN Card Scan</div>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="10-char PAN (e.g. ABCDE1234F)"
                      value={form.pan_no || ''}
                      onChange={e => handleInputChange('pan_no', e.target.value.toUpperCase())}
                      style={{ marginBottom: 10, fontSize: 13 }}
                    />

                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <label className="btn btn-secondary btn-sm" style={{ cursor: 'pointer', margin: 0, fontSize: 12, padding: '5px 10px' }}>
                        <Upload size={13} />
                        {uploadingPan ? 'Uploading…' : form.pan_doc_path ? 'Change PAN' : 'Scan PAN'}
                        <input
                          type="file"
                          accept="image/*,.pdf"
                          style={{ display: 'none' }}
                          onChange={e => handleFileUpload(e, 'pan')}
                        />
                      </label>

                      {form.pan_doc_path && (
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => setPreviewDocUrl({ url: getFileUrl(form.pan_doc_path), title: 'PAN Card Scan', docType: 'pan' })}
                          style={{ color: 'var(--blue-700)', borderColor: '#bfdbfe', fontSize: 12, padding: '5px 10px' }}
                        >
                          <Eye size={13} /> View
                        </button>
                      )}
                    </div>
                    {form.pan_doc_path && (
                      <div style={{ fontSize: 11, color: '#15803d', fontWeight: 700, marginTop: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <CheckCircle size={12} color="#16a34a" /> PAN Card scan attached
                      </div>
                    )}
                  </div>

                </div>
              </div>

              {/* Submit Buttons */}
              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                {editingId && (
                  <button type="button" className="btn btn-secondary" onClick={handleReset}>
                    Cancel Edit
                  </button>
                )}
                <button type="submit" className="btn btn-primary btn-lg" disabled={loading}>
                  {loading ? <span className="spinner" /> : <UserPlus size={18} />}
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
            <form onSubmit={handleSearch} style={{ display: 'flex', gap: 8 }}>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  className="filter-input"
                  placeholder="Search by ID, Name, Mobile, Aadhaar, PAN…"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  style={{ width: 280, paddingLeft: 30 }}
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
                          <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
                            {c.aadhaar_doc_path && (
                              <button
                                onClick={() => setPreviewDocUrl({ url: getFileUrl(c.aadhaar_doc_path), title: `Aadhaar Front - ${c.full_name}`, customer: c, docType: 'aadhaar_front' })}
                                style={{ display: 'inline-flex', alignItems: 'center', gap: 3, background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', borderRadius: 4, padding: '2px 6px', fontSize: 10, cursor: 'pointer', fontWeight: 700 }}
                              >
                                <ImageIcon size={10} /> Front
                              </button>
                            )}
                            {c.aadhaar_back_doc_path && (
                              <button
                                onClick={() => setPreviewDocUrl({ url: getFileUrl(c.aadhaar_back_doc_path), title: `Aadhaar Back - ${c.full_name}`, customer: c, docType: 'aadhaar_back' })}
                                style={{ display: 'inline-flex', alignItems: 'center', gap: 3, background: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0', borderRadius: 4, padding: '2px 6px', fontSize: 10, cursor: 'pointer', fontWeight: 700 }}
                              >
                                <ImageIcon size={10} /> Back
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
                            >
                              <ImageIcon size={10} /> PAN Scan
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

        {/* ── Enhanced Document Preview Modal with Instant Photo Upload ── */}
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
              }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a' }}>
                  {previewDocUrl.title}
                </div>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  {/* Upload / Replace Photo Button directly inside Modal */}
                  <label className="btn btn-primary btn-sm" style={{ cursor: 'pointer', margin: 0, fontSize: 11, padding: '4px 10px' }}>
                    <Upload size={12} /> Upload / Update Scan Photo
                    <input
                      type="file"
                      accept="image/*,.pdf"
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
                  const isPdf = urlLower.startsWith('data:application/pdf') || urlLower.endsWith('.pdf') || urlLower.includes('.pdf?');
                  
                  if (isPdf) {
                    return (
                      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', alignItems: 'center' }}>
                        <object
                          data={previewDocUrl.url}
                          type="application/pdf"
                          style={{ width: '100%', height: '540px', borderRadius: 8, border: '1px solid #cbd5e1' }}
                        >
                          <iframe
                            src={previewDocUrl.url}
                            style={{ width: '100%', height: '540px', border: 'none', borderRadius: 8 }}
                            title="PDF Preview"
                          />
                        </object>
                        <div style={{ marginTop: 12 }}>
                          <a
                            href={previewDocUrl.url}
                            download={`${previewDocUrl.title.replace(/[^a-z0-9]/gi, '_')}.pdf`}
                            target="_blank"
                            rel="noreferrer"
                            className="btn btn-secondary btn-sm"
                            style={{ fontSize: 12, padding: '6px 14px' }}
                          >
                            Download / Open PDF Document ↗
                          </a>
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

                      {/* Interactive Fallback Container with Upload Action */}
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
                          File path linked in database. Select or update the scan photo/PDF below to view directly!
                        </div>
                        <label className="btn btn-primary btn-lg" style={{ cursor: 'pointer', margin: '0 auto' }}>
                          <Upload size={18} /> Select &amp; Upload Scan (Image / PDF)
                          <input
                            type="file"
                            accept="image/*,.pdf,.png,.jpg,.jpeg,.webp,.gif"
                            style={{ display: 'none' }}
                            onChange={handleModalPhotoUpload}
                          />
                        </label>
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
