import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { useToast } from './hooks/useToast';
import ToastContainer from './components/ToastContainer';
import AppLayout from './components/AppLayout';

import LoginPage      from './pages/LoginPage';
import SignupPage     from './pages/SignupPage';
import FundingForm    from './pages/FundingForm';
import DashboardPage  from './pages/DashboardPage';
import TasksPage      from './pages/TasksPage';
import DocumentsPage  from './pages/DocumentsPage';
import SearchPage     from './pages/SearchPage';
import ApplicationsPage from './pages/ApplicationsPage';
import ActivityPage   from './pages/ActivityPage';
import ProfilePage    from './pages/ProfilePage';
import ApplicationPage from './pages/ApplicationPage';
import PrivacyPage from './pages/PrivacyPage';

export default function App() {
  const toast = useToast();

  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public routes */}
          <Route path="/login"  element={<LoginPage  toast={toast} />} />
          <Route path="/signup" element={<SignupPage toast={toast} />} />
          <Route path="/apply"    element={<FundingForm toast={toast} />} />
          <Route path="/privacy" element={<PrivacyPage />} />

          {/* Protected routes */}
          <Route element={<AppLayout />}>
            <Route path="/dashboard"    element={<DashboardPage  toast={toast} />} />
            <Route path="/tasks"        element={<TasksPage      toast={toast} />} />
            <Route path="/documents"    element={<DocumentsPage  toast={toast} />} />
            <Route path="/search"       element={<SearchPage     toast={toast} />} />
            <Route path="/applications" element={<ApplicationsPage toast={toast} />} />
            <Route path="/application"  element={<ApplicationPage toast={toast} />} />
            <Route path="/activity"     element={<ActivityPage   toast={toast} />} />
            <Route path="/profile"      element={<ProfilePage    toast={toast} />} />
          </Route>

          {/* Default redirect */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>

        <ToastContainer toasts={toast.toasts} />
      </BrowserRouter>
    </AuthProvider>
  );
}
