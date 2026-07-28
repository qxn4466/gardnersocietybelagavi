import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import CreditAccountForm from './pages/CreditAccountForm';
import CashBook from './pages/CashBook';
import DebitBook from './pages/DebitBook';
import GeneralLedger from './pages/GeneralLedger';
import SavingsAccounts from './pages/SavingsAccounts';
import AuditPackage from './pages/AuditPackage';
import Login from './pages/Login';
import type { User } from './types';
import { LanguageProvider } from './contexts/LanguageContext';
import './index.css';


const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('user');
    return saved ? JSON.parse(saved) : null;
  });

  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLoginSuccess = (loggedInUser: User) => {
    localStorage.setItem('user', JSON.stringify(loggedInUser));
    setUser(loggedInUser);
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    setUser(null);
  };

  const toggleSidebar = () => setSidebarOpen(prev => !prev);
  const closeSidebar = () => setSidebarOpen(false);

  if (!user) {
    return (
      <LanguageProvider>
        <Login onLoginSuccess={handleLoginSuccess} />
      </LanguageProvider>
    );
  }

  return (
    <LanguageProvider>
      <BrowserRouter>
        <div className="app-layout">
          <Sidebar isOpen={sidebarOpen} onClose={closeSidebar} />
          <main className="main-content">
            <Routes>
              <Route
                path="/"
                element={<CreditAccountForm user={user} onLogout={handleLogout} onToggleMobileMenu={toggleSidebar} />}
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
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </div>
      </BrowserRouter>
    </LanguageProvider>
  );
};

export default App;
