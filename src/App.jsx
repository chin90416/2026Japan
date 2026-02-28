import React from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { GlobalProvider, useGlobal } from './contexts/GlobalContext';
import Login from './components/auth/Login';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import BottomNav from './components/layout/BottomNav';
import FloatingRateCalculator from './components/common/FloatingRateCalculator';

import Itinerary from './components/features/Itinerary';
import Expenses from './components/features/Expenses';
import Shopping from './components/features/Shopping';
import Info from './components/features/Info';

function PrivateRoute({ children }) {
  const { currentUser } = useAuth();
  return currentUser ? children : <Login />;
}

function AppContent() {
  const { currentUser } = useAuth();
  const { isGlobalLoading } = useGlobal();

  if (!currentUser) {
    return <Login />;
  }

  if (isGlobalLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: 'var(--bg-color)', color: 'var(--text-secondary)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
          <div className="spinner" style={{ width: '40px', height: '40px', border: '4px solid rgba(0,0,0,0.1)', borderTopColor: 'var(--accent-color)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
          <div>載入行程綁定資料中...</div>
          <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <div className="container">
        {/* Main Content Area */}
        <Routes>
          <Route path="/" element={<Itinerary />} />
          <Route path="/expenses" element={<Expenses />} />
          <Route path="/shopping" element={<Shopping />} />
          <Route path="/info" element={<Info />} />
        </Routes>

        <FloatingRateCalculator />
        <BottomNav />
      </div>
    </Router>
  );
}

function App() {
  return (
    <GlobalProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </GlobalProvider>
  );
}

export default App;
