import React from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { GlobalProvider, useGlobal } from './contexts/GlobalContext';
import Login from './components/auth/Login';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import BottomNav from './components/layout/BottomNav';
import FloatingRateCalculator from './components/common/FloatingRateCalculator';

const Itinerary = React.lazy(() => import('./components/features/Itinerary'));
const Expenses = React.lazy(() => import('./components/features/Expenses'));
const Shopping = React.lazy(() => import('./components/features/Shopping'));
const Info = React.lazy(() => import('./components/features/Info'));

// 封裝 Suspense 載入中的畫面
function LoadingSpinner() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: 'var(--bg-color)', color: 'var(--text-secondary)' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
        <div className="spinner" style={{ width: '40px', height: '40px', border: '4px solid rgba(0,0,0,0.1)', borderTopColor: 'var(--accent-color)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
        <div>畫面載入中...</div>
        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  );
}

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


  return (
    <Router>
      <div className="container">
        {/* Main Content Area */}
        <React.Suspense fallback={<LoadingSpinner />}>
          <Routes>
            <Route path="/" element={<Itinerary />} />
            <Route path="/expenses" element={<Expenses />} />
            <Route path="/shopping" element={<Shopping />} />
            <Route path="/info" element={<Info />} />
          </Routes>
        </React.Suspense>

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
