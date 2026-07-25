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
  const [uploadingAadhaar, setUploadingAadhaar] = useState(false);
  const [uploadingPan, setUploadingPan] = useState(false);
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [previewDocUrl, setPreviewDocUrl] = useState<{ url: string; title: string } | null>(null);

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

  // Document Upload Handlers
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, docType: 'aadhaar' | 'pan') => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (docType === 'aadhaar') setUploadingAadhaar(true);
    if (docType === 'pan') setUploadingPan(true);

    try {
      const res = await uploadCustomerDocument(file, docType);
      if (docType === 'aadhaar') {
        setForm(prev => ({ ...prev, aadhaar_doc_path: res.filepath }));
        setAlert({ type: 'success', msg: 'Aadhaar card scan uploaded successfully!' });
      } else {
        setForm(prev => ({ ...prev, pan_doc_path: res.filepath }));
        setAlert({ type: 'success', msg: 'PAN card scan uploaded successfully!' });
      }
    } catch {
      setAlert({ type: 'error', msg: `Failed to upload ${docType.toUpperCase()} document scan.` });
    } finally {
      if (docType === 'aadhaar') setUploadingAadhaar(false);
      if (docType === 'pan') setUploadingPan(false);
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
        subtitle="Manage customer profiles, 10-Digit IDs, Aadhaar & PAN card scans"
        level={1}
        user={user}
        onLogout={onLogout}
      />

      <div className="page-content">

        {/* ── Alert ── */}
        {alert && (
          <div className={`alert alert-${alert.type}`}>
            {alert.type === 'success' ? <CheckCircle size={18} /> : <XCircle size={18} />}
            {alert.msg}
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
              <div className="card-subtitle">Auto-generated 10-Digit Customer ID & Document Verification</div>
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
                      placeholder="e.g. 1000000001"
                      required
                    />
                    <Hash size={16} style={{ position: 'absolute', right: 12, top: 12, color: 'var(--blue-600)' }} />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Mobile Number</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="tel"
                      className="form-input"
                      placeholder="10-digit mobile number"
                      value={form.mobile_no || ''}
                      onChange={e => handleInputChange('mobile_no', e.target.value)}
                    />
                    <Phone size={15} style={{ position: 'absolute', right: 12, top: 12, color: 'var(--text-muted)' }} />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Opening Savings Balance (₹)</label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    className="form-input"
                    placeholder="0.00"
                    value={form.opening_balance || ''}
                    onChange={e => handleInputChange('opening_balance', parseFloat(e.target.value) || 0)}
                  />
                </div>

              </div>

              {/* Row 2: Salutation, First Name, Middle Name, Last Name */}
              <div className="form-grid" style={{ gridTemplateColumns: '90px 1fr 1fr 1fr', marginBottom: 16 }}>
                
                <div className="form-group">
                  <label className="form-label">Title</label>
                  <select
                    className="form-select"
                    value={form.salutation || 'Mr.'}
                    onChange={e => handleInputChange('salutation', e.target.value)}
                  >
                    <option>Mr.</option>
                    <option>Mrs.</option>
                    <option>Ms.</option>
                    <option>Dr.</option>
                    <option>Sri.</option>
                    <option>Smt.</option>
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

              {/* Document Scans / Uploads Section */}
              <div style={{
                background: '#f8fafc', border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)', padding: 18, marginBottom: 24
              }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <ShieldCheck size={16} color="var(--blue-700)" /> KYC Document Verification (Aadhaar &amp; PAN Card Scan)
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                  
                  {/* Aadhaar Upload Box */}
                  <div style={{ background: '#ffffff', padding: 14, border: '1px solid #cbd5e1', borderRadius: 8 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 6 }}>Aadhaar Card Details</div>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="12-digit Aadhaar Number"
                      value={form.aadhaar_no || ''}
                      onChange={e => handleInputChange('aadhaar_no', e.target.value)}
                      style={{ marginBottom: 10, fontSize: 13 }}
                    />
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <label className="btn btn-secondary btn-sm" style={{ cursor: 'pointer', margin: 0 }}>
                        <Upload size={14} />
                        {uploadingAadhaar ? 'Uploading…' : form.aadhaar_doc_path ? 'Change Aadhaar Scan' : 'Scan / Upload Aadhaar Card'}
                        <input
                          type="file"
                          accept="image/*,.pdf"
                          style={{ display: 'none' }}
                          onChange={e => handleFileUpload(e, 'aadhaar')}
                        />
                      </label>

                      {form.aadhaar_doc_path && (
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => setPreviewDocUrl({ url: `http://localhost:8000${form.aadhaar_doc_path}`, title: 'Aadhaar Card Scan' })}
                          style={{ color: 'var(--blue-700)', borderColor: '#bfdbfe' }}
                        >
                          <Eye size={14} /> View Document
                        </button>
                      )}
                    </div>
                    {form.aadhaar_doc_path && (
                      <div style={{ fontSize: 11, color: '#16a34a', fontWeight: 600, marginTop: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <CheckCircle size={12} /> Aadhaar document scan attached
                      </div>
                    )}
                  </div>

                  {/* PAN Card Upload Box */}
                  <div style={{ background: '#ffffff', padding: 14, border: '1px solid #cbd5e1', borderRadius: 8 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 6 }}>PAN Card Details</div>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="10-character PAN Number (e.g. ABCDE1234F)"
                      value={form.pan_no || ''}
                      onChange={e => handleInputChange('pan_no', e.target.value)}
                      style={{ marginBottom: 10, fontSize: 13 }}
                    />

                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <label className="btn btn-secondary btn-sm" style={{ cursor: 'pointer', margin: 0 }}>
                        <Upload size={14} />
                        {uploadingPan ? 'Uploading…' : form.pan_doc_path ? 'Change PAN Scan' : 'Scan / Upload PAN Card'}
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
                          onClick={() => setPreviewDocUrl({ url: `http://localhost:8000${form.pan_doc_path}`, title: 'PAN Card Scan' })}
                          style={{ color: 'var(--blue-700)', borderColor: '#bfdbfe' }}
                        >
                          <Eye size={14} /> View Document
                        </button>
                      )}
                    </div>
                    {form.pan_doc_path && (
                      <div style={{ fontSize: 11, color: '#16a34a', fontWeight: 600, marginTop: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <CheckCircle size={12} /> PAN document scan attached
                      </div>
                    )}
                  </div>

                </div>
              </div>

              {/* Submit Buttons */}
              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={handleReset}>
                  Reset
                </button>
                <button type="submit" className="btn btn-primary btn-lg" disabled={loading}>
                  {loading ? <span className="spinner" /> : <UserPlus size={16} />}
                  {loading ? 'Saving…' : editingId ? 'Update Savings Account' : 'Create Savings Account'}
                </button>
              </div>

            </form>
          </div>
        </div>

        {/* ── Customers Accounts Directory Table ── */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                Customer Accounts Directory ({customers.length})
              </div>
              <div className="card-subtitle">Search by 10-Digit ID, Name, Mobile, Aadhaar or PAN</div>
            </div>
          </div>

          <div className="card-body">
            {/* Search Bar */}
            <form onSubmit={handleSearch} className="filter-bar" style={{ boxShadow: 'none', background: '#f8fafc', marginBottom: 20 }}>
              <div className="filter-group" style={{ flex: 1 }}>
                <span className="filter-label">Search Directory:</span>
                <input
                  type="text"
                  className="filter-input"
                  placeholder="Enter 10-Digit Customer ID, Name, Mobile No, Aadhaar or PAN..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  style={{ width: '100%' }}
                />
              </div>
              <button type="submit" className="btn btn-primary btn-sm">
                <Search size={14} /> Search
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => { setSearchQuery(''); loadCustomers(''); }}
              >
                <RefreshCw size={14} /> Reset
              </button>
            </form>

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
                      <th>Address</th>
                      <th>Aadhaar No / Doc</th>
                      <th>PAN No / Doc</th>
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
                            {c.aadhaar_no || '—'}
                            {c.aadhaar_doc_path && (
                              <button
                                onClick={() => setPreviewDocUrl({ url: `http://localhost:8000${c.aadhaar_doc_path}`, title: `Aadhaar - ${c.full_name}` })}
                                style={{ display: 'inline-flex', alignItems: 'center', gap: 3, marginLeft: 6, background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', borderRadius: 4, padding: '2px 6px', fontSize: 10, cursor: 'pointer' }}
                              >
                                <ImageIcon size={10} /> Scan
                              </button>
                            )}
                          </div>
                        </td>
                        <td>
                          <div style={{ fontSize: 12 }}>
                            {c.pan_no || '—'}
                            {c.pan_doc_path && (
                              <button
                                onClick={() => setPreviewDocUrl({ url: `http://localhost:8000${c.pan_doc_path}`, title: `PAN - ${c.full_name}` })}
                                style={{ display: 'inline-flex', alignItems: 'center', gap: 3, marginLeft: 6, background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', borderRadius: 4, padding: '2px 6px', fontSize: 10, cursor: 'pointer' }}
                              >
                                <ImageIcon size={10} /> Scan
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
        </div>

        {/* ── Document Preview Modal ── */}
        {previewDocUrl && (
          <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(15,23,42,0.75)', backdropFilter: 'blur(5px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 100000, padding: 20,
          }}>
            <div style={{
              background: '#ffffff', border: '1px solid var(--border-muted)',
              borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: 700,
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
                <button
                  onClick={() => setPreviewDocUrl(null)}
                  style={{ background: 'none', border: 'none', color: '#64748b', fontSize: 22, cursor: 'pointer' }}
                >
                  <X size={20} />
                </button>
              </div>

              <div style={{ padding: 20, overflowY: 'auto', textAlign: 'center', background: '#f8fafc', flex: 1 }}>
                {previewDocUrl.url.endsWith('.pdf') ? (
                  <iframe src={previewDocUrl.url} style={{ width: '100%', height: '500px', border: 'none' }} title="PDF Preview" />
                ) : (
                  <img
                    src={previewDocUrl.url}
                    alt="Document Scan Preview"
                    style={{ maxWidth: '100%', maxHeight: '600px', borderRadius: 8, boxShadow: '0 4px 15px rgba(0,0,0,0.1)' }}
                  />
                )}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default SavingsAccounts;
