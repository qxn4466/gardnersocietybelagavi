import React, { useState, useEffect } from 'react';
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
import './index.css';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('user');
    return saved ? JSON.parse(saved) : null;
  });

  const handleLoginSuccess = (loggedInUser: User) => {
    localStorage.setItem('user', JSON.stringify(loggedInUser));
    setUser(loggedInUser);
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    setUser(null);
  };

  if (!user) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <BrowserRouter>
      <div className="app-layout">
        <Sidebar />
        <main className="main-content">
          <Routes>
            <Route
              path="/"
              element={<CreditAccountForm user={user} onLogout={handleLogout} />}
            />
            <Route
              path="/savings-accounts"
              element={<SavingsAccounts user={user} onLogout={handleLogout} />}
            />
            <Route
              path="/creditbook"
              element={<CashBook user={user} onLogout={handleLogout} />}
            />
            <Route
              path="/cashbook"
              element={<CashBook user={user} onLogout={handleLogout} />}
            />
            <Route
              path="/debitbook"
              element={<DebitBook user={user} onLogout={handleLogout} />}
            />
            <Route
              path="/ledger"
              element={<GeneralLedger user={user} onLogout={handleLogout} />}
            />
            <Route
              path="/audit-package"
              element={<AuditPackage user={user} onLogout={handleLogout} />}
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
};

export default App;
