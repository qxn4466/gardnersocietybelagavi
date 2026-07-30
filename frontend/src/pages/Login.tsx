import React, { useState } from 'react';
import { Lock, User as UserIcon, Shield, LogIn, Leaf, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { loginUser } from '../api/client';
import type { User } from '../types';
import { useTranslation } from '../hooks/useTranslation';

interface LoginProps {
  onLoginSuccess: (user: User) => void;
}

const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const { lang } = useTranslation();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError(lang === 'mr' ? 'कृपया वापरकर्ता आयडी आणि पासवर्ड दोन्ही प्रविष्ट करा.' : 'Please enter both User ID and Password.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const user = await loginUser(username.trim(), password);
      onLoginSuccess(user);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        (lang === 'mr' ? 'लॉगिन अपयशी. अमान्य वापरकर्ता आयडी किंवा पासवर्ड.' : 'Login failed. Invalid User ID or Password.');
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleFillDemo = (u: string, p: string) => {
    setUsername(u);
    setPassword(p);
    setError(null);
  };

  return (
    <div style={{
      height: '100vh',
      width: '100vw',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'radial-gradient(ellipse at 50% 30%, #eff6ff 0%, #f8fafc 80%)',
    }}>
      <div className="card" style={{ width: '100%', maxWidth: 440, padding: 0, overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.08)' }}>
        <div style={{
          padding: '32px 32px 24px',
          background: 'linear-gradient(180deg, #eff6ff 0%, #ffffff 100%)',
          borderBottom: '1px solid var(--border-subtle)',
          textAlign: 'center',
        }}>
          <div style={{
            width: 54, height: 54, borderRadius: 16,
            background: 'var(--accent-gradient)',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: 12, boxShadow: 'var(--shadow-brand)',
          }}>
            <Leaf size={28} color="white" />
          </div>
          <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: 22, fontWeight: 700, color: 'var(--text-primary)' }}>
            {lang === 'mr' ? 'बेळगाव बागायतदार सह. खरेदी विक्री संघ मर्यादित' : 'Belagavi Gardeners Co-Op'}
          </h2>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
            {lang === 'mr' ? '३-स्तरीय लेखा प्रणाली · सुरक्षित लॉगिन' : '3-Level Accounting System · Secure Login'}
          </p>
        </div>

        <div className="card-body" style={{ padding: 32 }}>
          {error && (
            <div className="alert alert-error" style={{ marginBottom: 20 }}>
              <AlertCircle size={18} />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group" style={{ marginBottom: 18 }}>
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <UserIcon size={14} color="var(--blue-400)" /> {lang === 'mr' ? 'वापरकर्ता आयडी / वापरकर्ता नाव' : 'User ID / Username'}
              </label>
              <input
                id="login-username"
                type="text"
                className="form-input"
                placeholder={lang === 'mr' ? 'वापरकर्ता आयडी प्रविष्ट करा (उदा. accountant)' : 'Enter User ID (e.g. accountant)'}
                value={username}
                onChange={e => setUsername(e.target.value)}
                autoFocus
                required
              />
            </div>

            <div className="form-group" style={{ marginBottom: 24 }}>
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Lock size={14} color="var(--blue-400)" /> {lang === 'mr' ? 'पासवर्ड' : 'Password'}
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  className="form-input"
                  placeholder={lang === 'mr' ? 'पासवर्ड प्रविष्ट करा' : 'Enter Password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  style={{ paddingRight: 40 }}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(prev => !prev)}
                  style={{
                    position: 'absolute',
                    right: 10,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: showPassword ? 'var(--blue-600)' : 'var(--text-muted)',
                    cursor: 'pointer',
                    padding: 4,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  title={showPassword ? (lang === 'mr' ? 'पासवर्ड लपवा' : 'Hide password') : (lang === 'mr' ? 'पासवर्ड दाखवा' : 'Show password')}
                  id="toggle-password-visibility"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-lg"
              style={{ width: '100%', justifyContent: 'center' }}
              disabled={loading}
              id="login-submit-btn"
            >
              {loading ? <span className="spinner" /> : <LogIn size={18} />}
              {loading ? (lang === 'mr' ? 'पडताळणी होत आहे…' : 'Authenticating…') : (lang === 'mr' ? 'साइन इन करा' : 'Sign In')}
            </button>
          </form>

          {/* Quick Demo Login Helpers */}
          <div style={{ marginTop: 28, paddingTop: 20, borderTop: '1px dashed var(--border-muted)' }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 10 }}>
              {lang === 'mr' ? 'प्रात्यक्षिक जलद लॉगिन (भरण्यासाठी क्लिक करा)' : 'Demo Quick Logins (Click to Fill)'}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => handleFillDemo('accountant', 'pass123')}
                style={{ fontSize: 11, justifyContent: 'flex-start', padding: '6px 8px' }}
              >
                <Shield size={12} color="var(--blue-400)" /> {lang === 'mr' ? 'लेखापाल' : 'Accountant'}
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => handleFillDemo('cashier', 'pass123')}
                style={{ fontSize: 11, justifyContent: 'flex-start', padding: '6px 8px' }}
              >
                <Shield size={12} color="var(--amber-400)" /> {lang === 'mr' ? 'कॅशियर' : 'Cashier'}
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => handleFillDemo('shopkeeper', 'pass123')}
                style={{ fontSize: 11, justifyContent: 'flex-start', padding: '6px 8px' }}
              >
                <Shield size={12} color="var(--emerald-500)" /> {lang === 'mr' ? 'दुकानदार' : 'Shop Keeper'}
              </button>
            </div>
          </div>


        </div>
      </div>
    </div>
  );
};

export default Login;
