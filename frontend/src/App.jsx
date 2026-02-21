import React, { useEffect, useCallback } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/store';
import { authAPI, doctorAuthAPI } from './services/api';

// Pages
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import DoctorLogin from './pages/DoctorLogin';
import DoctorRegister from './pages/DoctorRegister';
import Dashboard from './pages/Dashboard';
import Analysis from './pages/Analysis';
import DoctorDashboard from './pages/DoctorDashboard';
import FitnessTracking from './pages/FitnessTracking';
import Medications from './pages/Medications';
import HealthChatbot from './pages/HealthChatbot';
import DoctorPatientHistory from './pages/DoctorPatientHistory';
import HealthHistory from './pages/HealthHistory';
import DoctorPatientChat from './pages/DoctorPatientChat';
import PatientChat from './pages/PatientChat';
import Appointments from './pages/Appointments';

// Components
import Navbar from './components/Navbar';
import MedicationAlertSystem from './components/MedicationAlertSystem';

// Protected Route Component
function ProtectedRoute({ children }) {
  const { token, role } = useAuthStore();
  
  if (!token) {
    return <Navigate to={role === 'doctor' ? '/doctor-login' : '/login'} replace />;
  }
  
  return children;
}

function RoleRoute({ allowedRoles, children }) {
  const { role } = useAuthStore();
  if (allowedRoles.includes(role)) {
    return children;
  }
  return <Navigate to="/" replace />;
}

export default function App() {
  const { token, role, setUser } = useAuthStore();

  const verifyToken = useCallback(async () => {
    try {
      if (role === 'doctor') {
        const response = await doctorAuthAPI.getProfile();
        setUser(response.data);
      } else {
        const response = await authAPI.getCurrentPatient();
        setUser(response.data);
      }
    } catch (err) {
      console.error('Token verification failed:', err);
      useAuthStore.setState({ token: null, user: null, role: null });
    }
  }, [role, setUser]);

  useEffect(() => {
    // Verify token and load user on app mount
    if (token) {
      verifyToken();
    }
  }, [token, verifyToken]);

  return (
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <div className="min-h-screen bg-light">
        <Navbar />
        {token && role === 'patient' && <MedicationAlertSystem />}
        <main>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<Home />} />
            <Route path="/login" element={token && role !== 'doctor' ? <Navigate to="/dashboard" /> : <Login />} />
            <Route path="/register" element={token && role !== 'doctor' ? <Navigate to="/dashboard" /> : <Register />} />
            <Route path="/doctor-login" element={token && role === 'doctor' ? <Navigate to="/doctor-dashboard" /> : <DoctorLogin />} />
            <Route path="/doctor-register" element={token && role === 'doctor' ? <Navigate to="/doctor-dashboard" /> : <DoctorRegister />} />

            {/* Protected Routes */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/doctor-dashboard"
              element={
                <ProtectedRoute>
                  <RoleRoute allowedRoles={["doctor"]}>
                    <DoctorDashboard />
                  </RoleRoute>
                </ProtectedRoute>
              }
            />
            <Route
              path="/analysis"
              element={
                <ProtectedRoute>
                  <Analysis />
                </ProtectedRoute>
              }
            />
            <Route
              path="/health-history"
              element={
                <ProtectedRoute>
                  <RoleRoute allowedRoles={["patient"]}>
                    <HealthHistory />
                  </RoleRoute>
                </ProtectedRoute>
              }
            />
            <Route
              path="/doctor-patient/:patientId/history"
              element={
                <ProtectedRoute>
                  <RoleRoute allowedRoles={["doctor"]}>
                    <HealthHistory />
                  </RoleRoute>
                </ProtectedRoute>
              }
            />
            <Route
              path="/medications/:patientId"
              element={
                <ProtectedRoute>
                  <RoleRoute allowedRoles={["doctor", "patient"]}>
                    <Medications />
                  </RoleRoute>
                </ProtectedRoute>
              }
            />
            {/* Route for patients accessing their own medications without patientId in URL */}
            <Route
              path="/medications"
              element={
                <ProtectedRoute>
                  <RoleRoute allowedRoles={["patient"]}>
                    <Medications />
                  </RoleRoute>
                </ProtectedRoute>
              }
            />
            <Route
              path="/health-chatbot/:patientId"
              element={
                <ProtectedRoute>
                  <RoleRoute allowedRoles={["doctor", "patient"]}>
                    <HealthChatbot />
                  </RoleRoute>
                </ProtectedRoute>
              }
            />
            <Route
              path="/fitness-tracking/:patientId"
              element={
                <ProtectedRoute>
                  <RoleRoute allowedRoles={["doctor", "patient"]}>
                    <FitnessTracking />
                  </RoleRoute>
                </ProtectedRoute>
              }
            />
            <Route
              path="/doctor-patient/:patientId/videos"
              element={
                <ProtectedRoute>
                  <RoleRoute allowedRoles={["doctor"]}>
                    <DoctorPatientHistory />
                  </RoleRoute>
                </ProtectedRoute>
              }
            />

            <Route
              path="/chat/:patientId"
              element={
                <ProtectedRoute>
                  <RoleRoute allowedRoles={["doctor", "patient"]}>
                    <DoctorPatientChat />
                  </RoleRoute>
                </ProtectedRoute>
              }
            />

            <Route
              path="/patient-chat"
              element={
                <ProtectedRoute>
                  <RoleRoute allowedRoles={["patient"]}>
                    <PatientChat />
                  </RoleRoute>
                </ProtectedRoute>
              }
            />

            <Route
              path="/appointments"
              element={
                <ProtectedRoute>
                  <RoleRoute allowedRoles={["patient", "doctor"]}>
                    <Appointments />
                  </RoleRoute>
                </ProtectedRoute>
              }
            />

            {/* Catch all */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}
