import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

import LoginPage        from './pages/LoginPage';
import DashboardPage    from './pages/DashboardPage';
import EmployeesPage    from './pages/EmployeesPage';
import AddEmployeePage  from './pages/AddEmployeePage';
import ViewEmployeePage from './pages/ViewEmployeePage';
import EditEmployeePage from './pages/EditEmployeePage';
import AttendancePage   from './pages/AttendancePage';
import LocationsPage    from './pages/LocationsPage';
import PayrollPage      from './pages/PayrollPage';
import CRMPage          from './pages/CRMPage';
import QuotationsPage   from './pages/QuotationsPage';
import ProjectsManagementPage from './pages/ProjectsManagementPage';
import FinancePage      from './pages/FinancePage';
import ReportsPage      from './pages/ReportsPage';
import AdministrationPage from './pages/AdministrationPage';

export default function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AuthProvider>
        <Routes>
          {/* Public */}
          <Route path="/login" element={<LoginPage />} />

          {/* Protected */}
          <Route
            path="/dashboard"
            element={<ProtectedRoute><DashboardPage /></ProtectedRoute>}
          />
          <Route
            path="/employees"
            element={<ProtectedRoute><EmployeesPage /></ProtectedRoute>}
          />
          <Route
            path="/attendance"
            element={<ProtectedRoute><AttendancePage /></ProtectedRoute>}
          />
          <Route
            path="/locations"
            element={<ProtectedRoute><LocationsPage /></ProtectedRoute>}
          />
          <Route
            path="/payroll"
            element={<ProtectedRoute><PayrollPage /></ProtectedRoute>}
          />
          <Route
            path="/crm"
            element={<ProtectedRoute><CRMPage /></ProtectedRoute>}
          />
          <Route
            path="/quotations"
            element={<ProtectedRoute><QuotationsPage /></ProtectedRoute>}
          />
          <Route
            path="/projects"
            element={<ProtectedRoute><ProjectsManagementPage /></ProtectedRoute>}
          />
          <Route
            path="/finance"
            element={<ProtectedRoute><FinancePage /></ProtectedRoute>}
          />
          <Route
            path="/reports"
            element={<ProtectedRoute><ReportsPage /></ProtectedRoute>}
          />
          <Route
            path="/administration"
            element={<ProtectedRoute><AdministrationPage /></ProtectedRoute>}
          />
          <Route
            path="/employees/add"
            element={<ProtectedRoute><AddEmployeePage /></ProtectedRoute>}
          />
          <Route
            path="/employees/:id"
            element={<ProtectedRoute><ViewEmployeePage /></ProtectedRoute>}
          />
          <Route
            path="/employees/:id/edit"
            element={<ProtectedRoute><EditEmployeePage /></ProtectedRoute>}
          />

          {/* Default redirect */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
