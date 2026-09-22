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
          {/* Public Super Admin Login */}
          <Route path="/login" element={<LoginPage />} />

          {/* Protected Super Admin Role Portals & Modules (UNTOUCHED) */}
          <Route path="/admin-portal" element={<ProtectedRoute permissionKey="dashboard"><AdminPortalPage /></ProtectedRoute>} />
          <Route path="/manager-portal" element={<ProtectedRoute permissionKey="dashboard"><ManagerPortalPage /></ProtectedRoute>} />
          <Route path="/staff-portal" element={<ProtectedRoute permissionKey="dashboard"><StaffPortalPage /></ProtectedRoute>} />
          <Route path="/admin-panel" element={<ProtectedRoute permissionKey="dashboard"><DashboardPage /></ProtectedRoute>} />
          <Route path="/dashboard" element={<ProtectedRoute permissionKey="dashboard"><DashboardPage /></ProtectedRoute>} />
          <Route path="/tasks" element={<ProtectedRoute permissionKey="tasks"><TaskManagementPage /></ProtectedRoute>} />
          <Route path="/super-admin/admin-access" element={<ProtectedRoute superAdminOnly={true}><AdminAccessPage /></ProtectedRoute>} />
          <Route path="/employees" element={<ProtectedRoute permissionKey="administration"><EmployeesPage /></ProtectedRoute>} />
          <Route path="/attendance" element={<ProtectedRoute permissionKey="attendance"><AttendancePage /></ProtectedRoute>} />
          <Route path="/locations" element={<ProtectedRoute permissionKey="attendance"><LocationsPage /></ProtectedRoute>} />
          <Route path="/payroll" element={<ProtectedRoute permissionKey="salary"><PayrollPage /></ProtectedRoute>} />
          <Route path="/crm" element={<ProtectedRoute permissionKey="crm"><CRMPage /></ProtectedRoute>} />
          <Route path="/transactions" element={<ProtectedRoute permissionKey="transactions"><TransactionHistoryPage /></ProtectedRoute>} />
          <Route path="/quotations" element={<ProtectedRoute permissionKey="quotation"><QuotationsPage /></ProtectedRoute>} />
          <Route path="/projects" element={<ProtectedRoute permissionKey="projects"><ProjectsManagementPage /></ProtectedRoute>} />
          <Route path="/finance" element={<ProtectedRoute permissionKey="reports"><FinancePage /></ProtectedRoute>} />
          <Route path="/reports" element={<ProtectedRoute permissionKey="reports"><ReportsPage /></ProtectedRoute>} />
          <Route path="/administration" element={<ProtectedRoute permissionKey="administration"><AdministrationPage /></ProtectedRoute>} />
          <Route path="/employees/add" element={<ProtectedRoute permissionKey="administration"><AddEmployeePage /></ProtectedRoute>} />
          <Route path="/employees/:id" element={<ProtectedRoute permissionKey="administration"><ViewEmployeePage /></ProtectedRoute>} />
          <Route path="/employees/:id/edit" element={<ProtectedRoute permissionKey="administration"><EditEmployeePage /></ProtectedRoute>} />

          {/* ───────────────────────────────────────────────────────────────── */}
          {/* SEPARATE ADMIN PORTAL ROUTES (/admin/*)                          */}
          {/* ───────────────────────────────────────────────────────────────── */}

          {/* Admin Login */}
          <Route path="/admin/login" element={<AdminLoginPage />} />

          {/* Admin Dashboard */}
          <Route path="/admin/dashboard" element={<AdminProtectedRoute permissionKey="dashboard"><AdminDashboardPage /></AdminProtectedRoute>} />

          {/* Admin Employees */}
          <Route path="/admin/employees" element={<AdminProtectedRoute permissionKey="employees" altPermissionKey="administration"><AdminEmployeesPage subRoute="list" /></AdminProtectedRoute>} />
          <Route path="/admin/employees/add" element={<AdminProtectedRoute permissionKey="employees" altPermissionKey="administration"><AdminEmployeesPage subRoute="add" /></AdminProtectedRoute>} />
          <Route path="/admin/employees/:id" element={<AdminProtectedRoute permissionKey="employees" altPermissionKey="administration"><AdminEmployeeViewWrapper subRoute="view" /></AdminProtectedRoute>} />
          <Route path="/admin/employees/:id/edit" element={<AdminProtectedRoute permissionKey="employees" altPermissionKey="administration"><AdminEmployeeViewWrapper subRoute="edit" /></AdminProtectedRoute>} />

          {/* Admin Attendance */}
          <Route path="/admin/attendance" element={<AdminProtectedRoute permissionKey="attendance"><AdminAttendancePage activeTab="daily" /></AdminProtectedRoute>} />
          <Route path="/admin/attendance/daily" element={<AdminProtectedRoute permissionKey="attendance"><AdminAttendancePage activeTab="daily" /></AdminProtectedRoute>} />
          <Route path="/admin/attendance/employee/:id" element={<AdminProtectedRoute permissionKey="attendance"><AdminAttendanceEmployeeWrapper /></AdminProtectedRoute>} />
          <Route path="/admin/attendance/reports" element={<AdminProtectedRoute permissionKey="attendance"><AdminAttendancePage activeTab="reports" /></AdminProtectedRoute>} />

          {/* Admin Payroll */}
          <Route path="/admin/payroll" element={<AdminProtectedRoute permissionKey="payroll" altPermissionKey="salary"><AdminPayrollPage activeTab="overview" /></AdminProtectedRoute>} />
          <Route path="/admin/payroll/calculate" element={<AdminProtectedRoute permissionKey="payroll" altPermissionKey="salary"><AdminPayrollPage activeTab="calculate" /></AdminProtectedRoute>} />
          <Route path="/admin/payroll/history" element={<AdminProtectedRoute permissionKey="payroll" altPermissionKey="salary"><AdminPayrollPage activeTab="history" /></AdminProtectedRoute>} />
          <Route path="/admin/payroll/:id" element={<AdminProtectedRoute permissionKey="payroll" altPermissionKey="salary"><AdminPayrollViewWrapper /></AdminProtectedRoute>} />

          {/* Admin Bike Tracking */}
          <Route path="/admin/bike-tracking" element={<AdminProtectedRoute permissionKey="tracking"><AdminBikeTrackingPage activeTab="live" /></AdminProtectedRoute>} />
          <Route path="/admin/bike-tracking/live" element={<AdminProtectedRoute permissionKey="tracking"><AdminBikeTrackingPage activeTab="live" /></AdminProtectedRoute>} />
          <Route path="/admin/bike-tracking/history" element={<AdminProtectedRoute permissionKey="tracking"><AdminBikeTrackingPage activeTab="history" /></AdminProtectedRoute>} />

          {/* Admin Transactions */}
          <Route path="/admin/transactions" element={<AdminProtectedRoute permissionKey="transactions"><AdminTransactionsPage /></AdminProtectedRoute>} />

          {/* Admin CRM */}
          <Route path="/admin/crm" element={<AdminProtectedRoute permissionKey="crm"><AdminCRMPage activeTab="leads" /></AdminProtectedRoute>} />
          <Route path="/admin/crm/leads" element={<AdminProtectedRoute permissionKey="crm"><AdminCRMPage activeTab="leads" /></AdminProtectedRoute>} />
          <Route path="/admin/crm/followups" element={<AdminProtectedRoute permissionKey="crm"><AdminCRMPage activeTab="followups" /></AdminProtectedRoute>} />
          <Route path="/admin/crm/:id" element={<AdminProtectedRoute permissionKey="crm"><AdminCRMViewWrapper /></AdminProtectedRoute>} />

          {/* Admin Quotations */}
          <Route path="/admin/quotations" element={<AdminProtectedRoute permissionKey="quotations" altPermissionKey="quotation"><AdminQuotationsPage subRoute="list" /></AdminProtectedRoute>} />
          <Route path="/admin/quotations/create" element={<AdminProtectedRoute permissionKey="quotations" altPermissionKey="quotation"><AdminQuotationsPage subRoute="create" /></AdminProtectedRoute>} />
          <Route path="/admin/quotations/:id" element={<AdminProtectedRoute permissionKey="quotations" altPermissionKey="quotation"><AdminQuotationViewWrapper subRoute="view" /></AdminProtectedRoute>} />
          <Route path="/admin/quotations/:id/edit" element={<AdminProtectedRoute permissionKey="quotations" altPermissionKey="quotation"><AdminQuotationViewWrapper subRoute="edit" /></AdminProtectedRoute>} />

          {/* Admin Offer Letters */}
          <Route path="/admin/offer-letters" element={<AdminProtectedRoute permissionKey="offer_letters" altPermissionKey="offerLetters"><AdminOfferLettersPage subRoute="list" /></AdminProtectedRoute>} />
          <Route path="/admin/offer-letters/create" element={<AdminProtectedRoute permissionKey="offer_letters" altPermissionKey="offerLetters"><AdminOfferLettersPage subRoute="create" /></AdminProtectedRoute>} />
          <Route path="/admin/offer-letters/:id" element={<AdminProtectedRoute permissionKey="offer_letters" altPermissionKey="offerLetters"><AdminOfferLetterWrapper subRoute="view" /></AdminProtectedRoute>} />
          <Route path="/admin/offer-letters/:id/edit" element={<AdminProtectedRoute permissionKey="offer_letters" altPermissionKey="offerLetters"><AdminOfferLetterWrapper subRoute="edit" /></AdminProtectedRoute>} />

          {/* Admin Reports */}
          <Route path="/admin/reports" element={<AdminProtectedRoute permissionKey="reports"><AdminReportsPage /></AdminProtectedRoute>} />

          {/* Admin Notifications */}
          <Route path="/admin/notifications" element={<AdminProtectedRoute permissionKey="notifications"><AdminNotificationsPage /></AdminProtectedRoute>} />

          {/* Admin Profile */}
          <Route path="/admin/profile" element={<AdminProtectedRoute permissionKey="profile"><AdminProfilePage /></AdminProtectedRoute>} />

          {/* Admin Settings */}
          <Route path="/admin/settings" element={<AdminProtectedRoute permissionKey="settings" altPermissionKey="administration"><AdminSettingsPage /></AdminProtectedRoute>} />

          {/* Admin Error Pages */}
          <Route path="/admin/403" element={<Admin403 />} />
          <Route path="/admin/*" element={<Admin404 />} />

          {/* Default redirect for Super Admin / Root */}
          <Route path="/" element={<Navigate to="/admin-panel" replace />} />
          <Route path="*" element={<Navigate to="/admin-panel" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
