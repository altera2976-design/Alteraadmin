import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import { AuthProvider } from './context/AuthContext';

import AddEmployeePage from './pages/AddEmployeePage';
import AdminAccessPage from './pages/AdminAccessPage';
import AdministrationPage from './pages/AdministrationPage';
import AdminPortalPage from './pages/AdminPortalPage';
import AttendancePage from './pages/AttendancePage';
import CRMPage from './pages/CRMPage';
import DashboardPage from './pages/DashboardPage';
import EditEmployeePage from './pages/EditEmployeePage';
import EmployeesPage from './pages/EmployeesPage';
import FinancePage from './pages/FinancePage';
import LocationsPage from './pages/LocationsPage';
import LoginPage from './pages/LoginPage';
import ManagerPortalPage from './pages/ManagerPortalPage';
import PayrollPage from './pages/PayrollPage';
import ProjectsManagementPage from './pages/ProjectsManagementPage';
import QuotationsPage from './pages/QuotationsPage';
import ReportsPage from './pages/ReportsPage';
import StaffPortalPage from './pages/StaffPortalPage';
import TaskManagementPage from './pages/TaskManagementPage';
import ViewEmployeePage from './pages/ViewEmployeePage';

export default function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AuthProvider>
        <Routes>
          {/* Public */}
          <Route path="/login" element={<LoginPage />} />

          {/* Protected Role Portals */}
          <Route
            path="/admin-portal"
            element={<ProtectedRoute permissionKey="dashboard"><AdminPortalPage /></ProtectedRoute>}
          />
          <Route
            path="/manager-portal"
            element={<ProtectedRoute permissionKey="dashboard"><ManagerPortalPage /></ProtectedRoute>}
          />
          <Route
            path="/staff-portal"
            element={<ProtectedRoute permissionKey="dashboard"><StaffPortalPage /></ProtectedRoute>}
          />

          {/* Protected Standard Dashboards & Modules */}
          <Route
            path="/admin-panel"
            element={<ProtectedRoute permissionKey="dashboard"><DashboardPage /></ProtectedRoute>}
          />
          <Route
            path="/dashboard"
            element={<ProtectedRoute permissionKey="dashboard"><DashboardPage /></ProtectedRoute>}
          />
          <Route
            path="/tasks"
            element={<ProtectedRoute permissionKey="tasks"><TaskManagementPage /></ProtectedRoute>}
          />
          <Route
            path="/super-admin/admin-access"
            element={<ProtectedRoute superAdminOnly={true}><AdminAccessPage /></ProtectedRoute>}
          />
          <Route
            path="/employees"
            element={<ProtectedRoute permissionKey="administration"><EmployeesPage /></ProtectedRoute>}
          />
          <Route
            path="/attendance"
            element={<ProtectedRoute permissionKey="attendance"><AttendancePage /></ProtectedRoute>}
          />
          <Route
            path="/locations"
            element={<ProtectedRoute permissionKey="attendance"><LocationsPage /></ProtectedRoute>}
          />
          <Route
            path="/payroll"
            element={<ProtectedRoute permissionKey="salary"><PayrollPage /></ProtectedRoute>}
          />
          <Route
            path="/crm"
            element={<ProtectedRoute permissionKey="crm"><CRMPage /></ProtectedRoute>}
          />
          <Route
            path="/quotations"
            element={<ProtectedRoute permissionKey="quotation"><QuotationsPage /></ProtectedRoute>}
          />
          <Route
            path="/projects"
            element={<ProtectedRoute permissionKey="projects"><ProjectsManagementPage /></ProtectedRoute>}
          />
          <Route
            path="/finance"
            element={<ProtectedRoute permissionKey="reports"><FinancePage /></ProtectedRoute>}
          />
          <Route
            path="/reports"
            element={<ProtectedRoute permissionKey="reports"><ReportsPage /></ProtectedRoute>}
          />
          <Route
            path="/administration"
            element={<ProtectedRoute permissionKey="administration"><AdministrationPage /></ProtectedRoute>}
          />
          <Route
            path="/employees/add"
            element={<ProtectedRoute permissionKey="administration"><AddEmployeePage /></ProtectedRoute>}
          />
          <Route
            path="/employees/:id"
            element={<ProtectedRoute permissionKey="administration"><ViewEmployeePage /></ProtectedRoute>}
          />
          <Route
            path="/employees/:id/edit"
            element={<ProtectedRoute permissionKey="administration"><EditEmployeePage /></ProtectedRoute>}
          />

          {/* Default redirect */}
          <Route path="/" element={<Navigate to="/admin-panel" replace />} />
          <Route path="*" element={<Navigate to="/admin-panel" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
