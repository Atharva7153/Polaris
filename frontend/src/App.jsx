import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { StationProvider } from './contexts/StationContext';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import Assets from './pages/Assets';
import DigitalTwin from './pages/DigitalTwin';
import Alerts from './pages/Alerts';
import Analytics from './pages/Analytics';
import DecisionCenter from './pages/DecisionCenter';
import Settings from './pages/Settings';
import Telemetry from './pages/Telemetry';

function ProtectedRoute({ children }) {
    const { user, loading } = useAuth();
    if (loading) return <div className="h-screen bg-background text-navy flex items-center justify-center font-bold">Loading Auth...</div>;
    if (!user) return <Navigate to="/login" replace />;
    return children;
}

import { useEffect } from 'react';
import { Toaster, toast } from 'react-hot-toast';
import { io } from 'socket.io-client';

// Initialize socket outside component so it persists
// VITE_API_URL includes '/api', but Socket.IO needs the root URL
const backendUrl = (import.meta.env.VITE_API_URL || 'http://localhost:5001/api').replace('/api', '');
const socket = io(backendUrl);

function App() {
  useEffect(() => {
    const handleToast = (alert) => {
      toast.error(
        <div>
          <strong>New Operational Alert: {alert.assetName || alert.assetId}</strong><br/>
          {alert.severity} - {alert.message}
        </div>,
        { duration: 8000, position: 'top-right' }
      );
    };

    socket.on('alert:created', handleToast);
    
    return () => {
      socket.off('alert:created', handleToast);
    };
  }, []);

  return (
    <AuthProvider>
      <StationProvider>
        <Router>
          <Toaster 
            position="top-right" 
            toastOptions={{ 
              style: { zIndex: 999999, minWidth: '350px' } 
            }} 
          />
          <Routes>
            <Route path="/login" element={<Login />} />
            
            <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="decision-center" element={<DecisionCenter />} />
              <Route path="assets" element={<Assets />} />
              <Route path="telemetry" element={<Telemetry />} />
              <Route path="digital-twin" element={<DigitalTwin />} />
              <Route path="alerts" element={<Alerts />} />
              <Route path="analytics" element={<Analytics />} />
              <Route path="settings" element={<Settings />} />
            </Route>
          </Routes>
        </Router>
      </StationProvider>
    </AuthProvider>
  );
}

export { socket };
export default App;
