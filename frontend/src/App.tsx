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

  const userRole = user.role?.toUpperCase() || '';
  const username = user.username?.toLowerCase() || '';

  const isCashier = userRole === 'CASHIER' || username === 'cashier';
  const isShopkeeper = userRole === 'SHOPKEEPER' || username === 'shopkeeper';

  const defaultRedirect = isShopkeeper ? "/shopkeeper" : isCashier ? "/cashier" : "/";

  return (
    <LanguageProvider>
      <BrowserRouter>
        <div className="app-layout">
          <Sidebar user={user} isOpen={sidebarOpen} onClose={closeSidebar} />
          <main className="main-content">
            <Routes>
              <Route
                path="/"
                element={
                  isShopkeeper ? (
                    <Navigate to="/shopkeeper" replace />
                  ) : isCashier ? (
                    <Navigate to="/cashier" replace />
                  ) : (
                    <CreditAccountForm user={user} onLogout={handleLogout} onToggleMobileMenu={toggleSidebar} />
                  )
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
        </div>
      </BrowserRouter>
    </LanguageProvider>
  );
};

export default App;
