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
import type { User } from './types';
import { LanguageProvider } from './contexts/LanguageContext';
import './index.css';

const AppContent: React.FC = () => {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem('user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [showLoginScreen, setShowLoginScreen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLoginSuccess = (loggedInUser: User) => {
    localStorage.setItem('user', JSON.stringify(loggedInUser));
    setUser(loggedInUser);
    setShowLoginScreen(false);
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    setUser(null);
    setShowLoginScreen(false);
  };

  const toggleSidebar = () => setSidebarOpen(prev => !prev);
  const closeSidebar = () => setSidebarOpen(false);

  if (!user) {
    if (showLoginScreen) {
      return (
        <Login
          onLoginSuccess={handleLoginSuccess}
          onBackToLanding={() => setShowLoginScreen(false)}
        />
      );
    }
    return <LandingPage onOpenLogin={() => setShowLoginScreen(true)} />;
  }

  return (
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
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <LanguageProvider>
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </LanguageProvider>
  );
};

export default App;
