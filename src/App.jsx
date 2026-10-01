import { BrowserRouter, Navigate, Route, Routes, useParams } from 'react-router-dom';
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
import TransactionHistoryPage from './pages/TransactionHistoryPage';
import ViewEmployeePage from './pages/ViewEmployeePage';
import FestivalsPage from './pages/FestivalsPage';

// Admin Portal Components & Pages
import AdminProtectedRoute from './admin/components/AdminProtectedRoute';
import Admin403 from './admin/components/Admin403';
import Admin404 from './admin/components/Admin404';
import AdminLoginPage from './admin/pages/AdminLoginPage';
import AdminDashboardPage from './admin/pages/AdminDashboardPage';
import AdminEmployeesPage from './admin/pages/AdminEmployeesPage';
import AdminAttendancePage from './admin/pages/AdminAttendancePage';
import AdminPayrollPage from './admin/pages/AdminPayrollPage';
import AdminBikeTrackingPage from './admin/pages/AdminBikeTrackingPage';
import AdminCRMPage from './admin/pages/AdminCRMPage';
import AdminTransactionsPage from './admin/pages/AdminTransactionsPage';
import AdminQuotationsPage from './admin/pages/AdminQuotationsPage';
import AdminOfferLettersPage from './admin/pages/AdminOfferLettersPage';
import AdminReportsPage from './admin/pages/AdminReportsPage';
import AdminNotificationsPage from './admin/pages/AdminNotificationsPage';
import AdminProfilePage from './admin/pages/AdminProfilePage';
import AdminSettingsPage from './admin/pages/AdminSettingsPage';

// Wrapper helpers for route params
function AdminEmployeeViewWrapper({ subRoute }) {
  const { id } = useParams();
  return <AdminEmployeesPage subRoute={subRoute} employeeId={id} />;
}

function AdminAttendanceEmployeeWrapper() {
  const { id } = useParams();
  return <AdminAttendancePage activeTab="employee" employeeId={id} />;
}

function AdminPayrollViewWrapper() {
  const { id } = useParams();
  return <AdminPayrollPage activeTab="view" payrollId={id} />;
}

function AdminCRMViewWrapper() {
  const { id } = useParams();
  return <AdminCRMPage activeTab="leads" leadId={id} />;
}

function AdminQuotationViewWrapper({ subRoute }) {
  const { id } = useParams();
  return <AdminQuotationsPage subRoute={subRoute} quotationId={id} />;
}

function AdminOfferLetterWrapper({ subRoute }) {
  const { id } = useParams();
  return <AdminOfferLettersPage subRoute={subRoute} offerLetterId={id} />;
}

export default function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AuthProvider>
        <Routes>
          {/* ───────────────────────────────────────────────────────────────── */}
          {/* 1. SUPER ADMIN PANEL ROUTES (/super-admin/*)                      */}
          {/* ───────────────────────────────────────────────────────────────── */}

          {/* Super Admin Login */}
          <Route path="/super-admin/login" element={<LoginPage />} />
          <Route path="/login" element={<Navigate to="/super-admin/login" replace />} />

          {/* Super Admin Master Controls */}
          <Route path="/super-admin" element={<Navigate to="/super-admin/dashboard" replace />} />
          <Route path="/super-admin/dashboard" element={<ProtectedRoute permissionKey="dashboard"><DashboardPage /></ProtectedRoute>} />
          <Route path="/super-admin/admins" element={<ProtectedRoute superAdminOnly={true}><AdminAccessPage /></ProtectedRoute>} />
          <Route path="/super-admin/admin-access" element={<ProtectedRoute superAdminOnly={true}><AdminAccessPage /></ProtectedRoute>} />
          <Route path="/super-admin/employees" element={<ProtectedRoute permissionKey="employees"><EmployeesPage /></ProtectedRoute>} />
          <Route path="/super-admin/employees/add" element={<ProtectedRoute permissionKey="employees"><AddEmployeePage /></ProtectedRoute>} />
          <Route path="/super-admin/employees/:id" element={<ProtectedRoute permissionKey="employees"><ViewEmployeePage /></ProtectedRoute>} />
          <Route path="/super-admin/employees/:id/edit" element={<ProtectedRoute permissionKey="employees"><EditEmployeePage /></ProtectedRoute>} />
          <Route path="/super-admin/attendance" element={<ProtectedRoute permissionKey="attendance"><AttendancePage /></ProtectedRoute>} />
          <Route path="/super-admin/locations" element={<ProtectedRoute permissionKey="attendance"><LocationsPage /></ProtectedRoute>} />
          <Route path="/super-admin/bike-tracking" element={<ProtectedRoute permissionKey="tracking"><AdminBikeTrackingPage activeTab="live" /></ProtectedRoute>} />
          <Route path="/super-admin/bike-tracking/live" element={<ProtectedRoute permissionKey="tracking"><AdminBikeTrackingPage activeTab="live" /></ProtectedRoute>} />
          <Route path="/super-admin/bike-tracking/history" element={<ProtectedRoute permissionKey="tracking"><AdminBikeTrackingPage activeTab="history" /></ProtectedRoute>} />
          <Route path="/super-admin/payroll" element={<ProtectedRoute permissionKey="payroll"><PayrollPage /></ProtectedRoute>} />
          <Route path="/super-admin/tasks" element={<ProtectedRoute permissionKey="tasks"><TaskManagementPage /></ProtectedRoute>} />
          <Route path="/super-admin/crm" element={<ProtectedRoute permissionKey="crm"><CRMPage /></ProtectedRoute>} />
          <Route path="/super-admin/transactions" element={<ProtectedRoute permissionKey="transactions"><TransactionHistoryPage /></ProtectedRoute>} />
          <Route path="/super-admin/quotations" element={<ProtectedRoute permissionKey="quotation"><QuotationsPage /></ProtectedRoute>} />
          <Route path="/super-admin/offer-letters" element={<ProtectedRoute permissionKey="offerLetters"><AdminOfferLettersPage subRoute="list" /></ProtectedRoute>} />
          <Route path="/super-admin/offer-letters/create" element={<ProtectedRoute permissionKey="offerLetters"><AdminOfferLettersPage subRoute="create" /></ProtectedRoute>} />
          <Route path="/super-admin/offer-letters/:id" element={<ProtectedRoute permissionKey="offerLetters"><AdminOfferLetterWrapper subRoute="view" /></ProtectedRoute>} />
          <Route path="/super-admin/offer-letters/:id/edit" element={<ProtectedRoute permissionKey="offerLetters"><AdminOfferLetterWrapper subRoute="edit" /></ProtectedRoute>} />
          <Route path="/super-admin/notifications" element={<ProtectedRoute permissionKey="notifications"><AdminNotificationsPage /></ProtectedRoute>} />
          <Route path="/super-admin/projects" element={<ProtectedRoute permissionKey="projects"><ProjectsManagementPage /></ProtectedRoute>} />
          <Route path="/super-admin/finance" element={<ProtectedRoute permissionKey="reports"><FinancePage /></ProtectedRoute>} />
          <Route path="/super-admin/reports" element={<ProtectedRoute permissionKey="reports"><ReportsPage /></ProtectedRoute>} />
          <Route path="/super-admin/settings" element={<ProtectedRoute permissionKey="administration"><AdministrationPage /></ProtectedRoute>} />
          <Route path="/super-admin/festivals" element={<ProtectedRoute><FestivalsPage /></ProtectedRoute>} />

          {/* Legacy Super Admin aliases for seamless navigation */}
          <Route path="/admin-panel" element={<Navigate to="/super-admin/dashboard" replace />} />
          <Route path="/admin-portal" element={<ProtectedRoute permissionKey="dashboard"><AdminPortalPage /></ProtectedRoute>} />
          <Route path="/manager-portal" element={<ProtectedRoute permissionKey="dashboard"><ManagerPortalPage /></ProtectedRoute>} />
          <Route path="/staff-portal" element={<ProtectedRoute permissionKey="dashboard"><StaffPortalPage /></ProtectedRoute>} />
          <Route path="/dashboard" element={<Navigate to="/super-admin/dashboard" replace />} />
          <Route path="/tasks" element={<ProtectedRoute permissionKey="tasks"><TaskManagementPage /></ProtectedRoute>} />
          <Route path="/employees" element={<ProtectedRoute superAdminOnly={true} permissionKey="administration"><EmployeesPage /></ProtectedRoute>} />
          <Route path="/attendance" element={<ProtectedRoute permissionKey="attendance"><AttendancePage /></ProtectedRoute>} />
          <Route path="/locations" element={<ProtectedRoute permissionKey="attendance"><LocationsPage /></ProtectedRoute>} />
          <Route path="/payroll" element={<ProtectedRoute superAdminOnly={true} permissionKey="salary"><PayrollPage /></ProtectedRoute>} />
          <Route path="/crm" element={<ProtectedRoute permissionKey="crm"><CRMPage /></ProtectedRoute>} />
          <Route path="/transactions" element={<ProtectedRoute permissionKey="transactions"><TransactionHistoryPage /></ProtectedRoute>} />
          <Route path="/quotations" element={<ProtectedRoute permissionKey="quotation"><QuotationsPage /></ProtectedRoute>} />
          <Route path="/projects" element={<ProtectedRoute permissionKey="projects"><ProjectsManagementPage /></ProtectedRoute>} />
          <Route path="/finance" element={<ProtectedRoute permissionKey="reports"><FinancePage /></ProtectedRoute>} />
          <Route path="/reports" element={<ProtectedRoute permissionKey="reports"><ReportsPage /></ProtectedRoute>} />
          <Route path="/administration" element={<ProtectedRoute permissionKey="administration"><AdministrationPage /></ProtectedRoute>} />

          {/* ───────────────────────────────────────────────────────────────── */}
          {/* 2. LEGACY ADMIN PANEL ROUTES (/admin/*) Redirecting to unified    */}
          {/* ───────────────────────────────────────────────────────────────── */}
          <Route path="/admin/login" element={<Navigate to="/super-admin/login" replace />} />
          <Route path="/admin/*" element={<Navigate to="/super-admin/dashboard" replace />} />

          {/* Admin Settings */}
          <Route path="/admin/settings" element={<AdminProtectedRoute permissionKey="settings" altPermissionKey="administration"><AdminSettingsPage /></AdminProtectedRoute>} />

          {/* Admin Error Pages */}
          <Route path="/admin/403" element={<Admin403 />} />
          <Route path="/admin/*" element={<Admin404 />} />

          {/* Default redirect to Super Admin Panel */}
          <Route path="/" element={<Navigate to="/super-admin/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/super-admin/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
