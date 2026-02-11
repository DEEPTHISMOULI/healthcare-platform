import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';

// Auth Pages
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import ForgotPassword from './pages/auth/ForgotPassword';
import ResetPassword from './pages/auth/ResetPassword';

// Patient Pages
import PatientDashboard from './pages/patient/PatientDashboard';
import PatientProfile from './pages/patient/Profile';
import BookAppointment from './pages/patient/BookAppointment';
import PatientAppointments from './pages/patient/Appointments';
import PatientDocuments from './pages/patient/Documents';
import Consultation from './pages/patient/Consultation';
import PatientPrescriptions from './pages/patient/PatientPrescription';
import PreConsultationForm from './pages/patient/PreConsultationForm';
import PatientReferrals from './pages/patient/Referrals';
import PatientMessages from './pages/patient/Messages';

// Doctor Pages
import DoctorDashboard from './pages/doctor/DoctorDashboard';
import DoctorProfile from './pages/doctor/Profile';
import DoctorAppointments from './pages/doctor/Appointments';
import DoctorConsultation from './pages/doctor/Consultation';
import DoctorPatients from './pages/doctor/Patients';
import DoctorSchedule from './pages/doctor/Schedule';
import DoctorPrescriptions from './pages/doctor/Prescriptions';
import CreateReferral from './pages/doctor/CreateReferral';
import PatientChart from './pages/doctor/PatientChart';
import DoctorMessages from './pages/doctor/Messages';
import AIConsultationNotes from './pages/doctor/AIConsultationNotes';

// Admin Pages
import AdminDashboard from './pages/admin/Dashboard';
import ManageUsers from './pages/admin/ManageUsers';
import ManageAppointments from './pages/admin/ManageAppointments';

// Common Components
import Loading from './components/common/Loading';

// Styles
import './styles/global.css';

// Protected Route Component
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { isAuthenticated, profile, loading } = useAuth();

  if (loading) {
    return <Loading />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(profile?.role)) {
    // Redirect to appropriate dashboard based on role
    if (profile?.role === 'patient') return <Navigate to="/patient/dashboard" replace />;
    if (profile?.role === 'doctor') return <Navigate to="/doctor/dashboard" replace />;
    if (profile?.role === 'admin') return <Navigate to="/admin/dashboard" replace />;
    return <Navigate to="/login" replace />;
  }

  return children;
};

// Public Route (redirect if already logged in)
const PublicRoute = ({ children }) => {
  const { isAuthenticated, profile, loading } = useAuth();

  if (loading) {
    return <Loading />;
  }

  if (isAuthenticated && profile) {
    // Redirect to appropriate dashboard based on role
    if (profile.role === 'patient') return <Navigate to="/patient/dashboard" replace />;
    if (profile.role === 'doctor') return <Navigate to="/doctor/dashboard" replace />;
    if (profile.role === 'admin') return <Navigate to="/admin/dashboard" replace />;
  }

  return children;
};

function AppRoutes() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
      <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
      <Route path="/forgot-password" element={<PublicRoute><ForgotPassword /></PublicRoute>} />
      <Route path="/reset-password" element={<ResetPassword />} />

      {/* Patient Routes */}
      <Route path="/patient/dashboard" element={
        <ProtectedRoute allowedRoles={['patient']}>
          <PatientDashboard />
        </ProtectedRoute>
      } />
      <Route path="/patient/profile" element={
        <ProtectedRoute allowedRoles={['patient']}>
          <PatientProfile />
        </ProtectedRoute>
      } />
      <Route path="/patient/book-appointment" element={
        <ProtectedRoute allowedRoles={['patient']}>
          <BookAppointment />
        </ProtectedRoute>
      } />
      <Route path="/patient/appointments" element={
        <ProtectedRoute allowedRoles={['patient']}>
          <PatientAppointments />
        </ProtectedRoute>
      } />
      <Route path="/patient/documents" element={
        <ProtectedRoute allowedRoles={['patient']}>
          <PatientDocuments />
        </ProtectedRoute>
      } />
      <Route path="/patient/consultation/:appointmentId" element={
        <ProtectedRoute allowedRoles={['patient']}>
          <Consultation />
        </ProtectedRoute>
      } />
      <Route path="/patient/prescriptions" element={
        <ProtectedRoute allowedRoles={['patient']}>
          <PatientPrescriptions />
        </ProtectedRoute>
      } />
      <Route path="/patient/pre-consultation/:appointmentId" element={
        <ProtectedRoute allowedRoles={['patient']}>
          <PreConsultationForm />
        </ProtectedRoute>
      } />

      <Route path="/patient/referrals" element={
         <ProtectedRoute allowedRoles={['patient']}>
           <PatientReferrals />
        </ProtectedRoute>
      } />
      <Route path="/patient/messages" element={
        <ProtectedRoute allowedRoles={['patient']}>
          <PatientMessages />
        </ProtectedRoute>
      } />

      {/* Doctor Routes */}
      <Route path="/doctor/dashboard" element={
        <ProtectedRoute allowedRoles={['doctor']}>
          <DoctorDashboard />
        </ProtectedRoute>
      } />
      <Route path="/doctor/profile" element={
        <ProtectedRoute allowedRoles={['doctor']}>
          <DoctorProfile />
        </ProtectedRoute>
      } />
      <Route path="/doctor/appointments" element={
        <ProtectedRoute allowedRoles={['doctor']}>
          <DoctorAppointments />
        </ProtectedRoute>
      } />
      <Route path="/doctor/consultation/:appointmentId" element={
        <ProtectedRoute allowedRoles={['doctor']}>
          <DoctorConsultation />
        </ProtectedRoute>
      } />
      <Route path="/doctor/patients" element={
        <ProtectedRoute allowedRoles={['doctor']}>
          <DoctorPatients />
        </ProtectedRoute>
      } />
      <Route path="/doctor/schedule" element={
        <ProtectedRoute allowedRoles={['doctor']}>
          <DoctorSchedule />
        </ProtectedRoute>
      } />
      <Route path="/doctor/prescriptions" element={
        <ProtectedRoute allowedRoles={['doctor']}>
          <DoctorPrescriptions />
        </ProtectedRoute>
      } />

      <Route path="/doctor/referral/:appointmentId" element={
        <ProtectedRoute allowedRoles={['doctor']}>
          <CreateReferral />
        </ProtectedRoute>
      } />

      <Route path="/doctor/patient-chart/:patientId" element={
        <ProtectedRoute allowedRoles={['doctor']}>
          <PatientChart />
        </ProtectedRoute>
      } />
      <Route path="/doctor/messages" element={
       <ProtectedRoute allowedRoles={['doctor']}>
          <DoctorMessages />
        </ProtectedRoute>
      } />

      <Route path="/doctor/ai-notes/:appointmentId" element={
        <ProtectedRoute allowedRoles={['doctor']}>
          <AIConsultationNotes />
        </ProtectedRoute>
      } />

      {/* Admin Routes */}
      <Route path="/admin/dashboard" element={
        <ProtectedRoute allowedRoles={['admin']}>
          <AdminDashboard />
        </ProtectedRoute>
      } />
      <Route path="/admin/users" element={
        <ProtectedRoute allowedRoles={['admin']}>
          <ManageUsers />
        </ProtectedRoute>
      } />
      <Route path="/admin/appointments" element={
        <ProtectedRoute allowedRoles={['admin']}>
          <ManageAppointments />
        </ProtectedRoute>
      } />

      {/* 404 - Not Found */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppRoutes />
        <Toaster 
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#333',
              color: '#fff',
            },
            success: {
              style: {
                background: '#22c55e',
              },
            },
            error: {
              style: {
                background: '#ef4444',
              },
            },
          }}
        />
      </Router>
    </AuthProvider>
  );
}

export default App;