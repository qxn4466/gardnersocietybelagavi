import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import CreditAccountForm from './pages/CreditAccountForm';
import CashBook from './pages/CashBook';
import DebitBook from './pages/DebitBook';
import GeneralLedger from './pages/GeneralLedger';
import SavingsAccounts from './pages/SavingsAccounts';
import AuditPackage from './pages/AuditPackage';
import MeetingNoticePage from './pages/MeetingNoticePage';
import CashierDashboard from './pages/CashierDashboard';
import ShopkeeperDashboard from './pages/ShopkeeperDashboard';
import LandingPage from './pages/LandingPage';
import Login from './pages/Login';
import { Keyboard } from 'lucide-react';
import MarathiKeyboard from './components/MarathiKeyboard';
import type { User } from './types';
import { LanguageProvider } from './contexts/LanguageContext';
import './index.css';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('user');
    return saved ? JSON.parse(saved) : null;
  });

  const [showLoginScreen, setShowLoginScreen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLoginSuccess = (loggedInUser: User) => {
    localStorage.setItem('user', JSON.stringify(loggedInUser));
    setUser(loggedInUser);
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    setUser(null);
    setShowLoginScreen(false);
  };

  const toggleSidebar = () => setSidebarOpen(prev => !prev);
  const closeSidebar = () => setSidebarOpen(false);

  if (!user) {
    return (
      <LanguageProvider>
        {showLoginScreen ? (
          <Login onLoginSuccess={handleLoginSuccess} onBackToLanding={() => setShowLoginScreen(false)} />
        ) : (
          <LandingPage onOpenLogin={() => setShowLoginScreen(true)} />
        )}
      </LanguageProvider>
    );
  }

  const defaultRedirect = "/";

  const [showGlobalKeyboard, setShowGlobalKeyboard] = useState(false);

  return (
    <LanguageProvider>
      <BrowserRouter>
        <div className="app-layout" style={{ position: 'relative' }}>
          <Sidebar user={user} isOpen={sidebarOpen} onClose={closeSidebar} />
          <main className="main-content">
            <Routes>
              <Route
                path="/"
                element={
                  <CreditAccountForm user={user} onLogout={handleLogout} onToggleMobileMenu={toggleSidebar} />
                }
              />
              <Route
                path="/shopkeeper"
                element={<ShopkeeperDashboard user={user} onLogout={handleLogout} onToggleMobileMenu={toggleSidebar} />}
              />
              <Route
                path="/cashier"
                element={<CashierDashboard user={user} onLogout={handleLogout} onToggleMobileMenu={toggleSidebar} />}
              />
              <Route
                path="/savings-accounts"
                element={<SavingsAccounts user={user} onLogout={handleLogout} onToggleMobileMenu={toggleSidebar} />}
              />
              <Route
                path="/creditbook"
                element={<CashBook user={user} onLogout={handleLogout} onToggleMobileMenu={toggleSidebar} />}
              />
              <Route
                path="/cashbook"
                element={<CashBook user={user} onLogout={handleLogout} onToggleMobileMenu={toggleSidebar} />}
              />
              <Route
                path="/debitbook"
                element={<DebitBook user={user} onLogout={handleLogout} onToggleMobileMenu={toggleSidebar} />}
              />
              <Route
                path="/ledger"
                element={<GeneralLedger user={user} onLogout={handleLogout} onToggleMobileMenu={toggleSidebar} />}
              />
              <Route
                path="/audit-package"
                element={<AuditPackage user={user} onLogout={handleLogout} onToggleMobileMenu={toggleSidebar} />}
              />
              <Route
                path="/meeting-notice"
                element={<MeetingNoticePage user={user} onLogout={handleLogout} onToggleMobileMenu={toggleSidebar} />}
              />
              <Route path="*" element={<Navigate to={defaultRedirect} replace />} />
            </Routes>
          </main>

          {/* Persistent Floating Marathi Keypad Launcher Widget */}
          <button
            type="button"
            onClick={() => setShowGlobalKeyboard(!showGlobalKeyboard)}
            className="no-print"
            style={{
              position: 'fixed',
              bottom: 24,
              right: 24,
              zIndex: 99999,
              background: showGlobalKeyboard ? '#1e40af' : '#2563eb',
              color: '#ffffff',
              border: '2px solid #ffffff',
              borderRadius: 30,
              padding: '10px 18px',
              fontSize: 13,
              fontWeight: 800,
              boxShadow: '0 8px 24px rgba(37, 99, 235, 0.4)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              transition: 'all 0.2s ease',
            }}
            title="मराठी टायपिंग कीबोर्ड उघडा / बंद करा (Toggle Marathi Touch Keypad)"
          >
            <Keyboard size={18} color="#ffffff" />
            <span>⌨️ मराठी कीबोर्ड</span>
          </button>

          <MarathiKeyboard
            isOpen={showGlobalKeyboard}
            onClose={() => setShowGlobalKeyboard(false)}
          />
        </div>
      </BrowserRouter>
    </LanguageProvider>
  );
};

export default App;
