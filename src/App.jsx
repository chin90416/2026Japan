import React from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { GlobalProvider } from './contexts/GlobalContext';
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

  if (!currentUser) {
    return <Login />;
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
