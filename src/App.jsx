import { Suspense, lazy } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useParams } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import LoadingSpinner from './components/LoadingSpinner';
import { AuthProvider } from './context/AuthContext';
import { ConfigProvider } from './context/ConfigContext';

// Super Admin Pages (Lazy Loaded for high performance and minimal initial bundle size)
const AddEmployeePage = lazy(() => import('./pages/AddEmployeePage'));
const AdminAccessPage = lazy(() => import('./pages/AdminAccessPage'));
const AdministrationPage = lazy(() => import('./pages/AdministrationPage'));
const AdminPortalPage = lazy(() => import('./pages/AdminPortalPage'));
const AttendancePage = lazy(() => import('./pages/AttendancePage'));
const CRMPage = lazy(() => import('./pages/CRMPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const EditEmployeePage = lazy(() => import('./pages/EditEmployeePage'));
const EmployeesPage = lazy(() => import('./pages/EmployeesPage'));
const FinancePage = lazy(() => import('./pages/FinancePage'));
const LocationsPage = lazy(() => import('./pages/LocationsPage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage'));
const ManagerPortalPage = lazy(() => import('./pages/ManagerPortalPage'));
const PayrollPage = lazy(() => import('./pages/PayrollPage'));
const ProjectsManagementPage = lazy(() => import('./pages/ProjectsManagementPage'));
const QuotationsPage = lazy(() => import('./pages/QuotationsPage'));
const ReportsPage = lazy(() => import('./pages/ReportsPage'));
const StaffPortalPage = lazy(() => import('./pages/StaffPortalPage'));
const TaskManagementPage = lazy(() => import('./pages/TaskManagementPage'));
const TransactionHistoryPage = lazy(() => import('./pages/TransactionHistoryPage'));
const ViewEmployeePage = lazy(() => import('./pages/ViewEmployeePage'));
const FestivalsPage = lazy(() => import('./pages/FestivalsPage'));

// Admin Portal Components & Pages (Lazy Loaded)
import AdminProtectedRoute from './admin/components/AdminProtectedRoute';
import Admin403 from './admin/components/Admin403';
import Admin404 from './admin/components/Admin404';

const AdminLoginPage = lazy(() => import('./admin/pages/AdminLoginPage'));
const AdminDashboardPage = lazy(() => import('./admin/pages/AdminDashboardPage'));
const AdminEmployeesPage = lazy(() => import('./admin/pages/AdminEmployeesPage'));
const AdminAttendancePage = lazy(() => import('./admin/pages/AdminAttendancePage'));
const AdminPayrollPage = lazy(() => import('./admin/pages/AdminPayrollPage'));
const AdminBikeTrackingPage = lazy(() => import('./admin/pages/AdminBikeTrackingPage'));
const AdminCRMPage = lazy(() => import('./admin/pages/AdminCRMPage'));
const AdminTransactionsPage = lazy(() => import('./admin/pages/AdminTransactionsPage'));
const AdminQuotationsPage = lazy(() => import('./admin/pages/AdminQuotationsPage'));
const AdminOfferLettersPage = lazy(() => import('./admin/pages/AdminOfferLettersPage'));
const AdminReportsPage = lazy(() => import('./admin/pages/AdminReportsPage'));
const AdminNotificationsPage = lazy(() => import('./admin/pages/AdminNotificationsPage'));
const AdminProfilePage = lazy(() => import('./admin/pages/AdminProfilePage'));
const AdminSettingsPage = lazy(() => import('./admin/pages/AdminSettingsPage'));

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
      <ConfigProvider>
        <AuthProvider>
          <Suspense fallback={<LoadingSpinner message="Loading Portal..." />}>
            <Routes>
          {/* ───────────────────────────────────────────────────────────────── */}
          {/* 1. SUPER ADMIN PANEL ROUTES (/super-admin/*)                      */}
          {/* ───────────────────────────────────────────────────────────────── */}

          {/* Super Admin Login */}
          <Route path="/super-admin/login" element={<LoginPage />} />
          <Route path="/login" element={<Navigate to="/super-admin/login" replace />} />
          <Route path="/super-admin/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/admin/forgot-password" element={<ForgotPasswordPage />} />

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
          {/* 2. ADMIN PANEL ROUTES (/admin/*)                                  */}
          {/* ───────────────────────────────────────────────────────────────── */}
          <Route path="/admin/login" element={<AdminLoginPage />} />
          <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="/admin/dashboard" element={<AdminProtectedRoute permissionKey="dashboard"><AdminDashboardPage /></AdminProtectedRoute>} />
          <Route path="/admin/employees" element={<AdminProtectedRoute permissionKey="employees" altPermissionKey="administration"><AdminEmployeesPage /></AdminProtectedRoute>} />
          <Route path="/admin/employees/:id" element={<AdminProtectedRoute permissionKey="employees" altPermissionKey="administration"><AdminEmployeeViewWrapper subRoute="view" /></AdminProtectedRoute>} />
          <Route path="/admin/employees/:id/edit" element={<AdminProtectedRoute permissionKey="employees" altPermissionKey="administration"><AdminEmployeeViewWrapper subRoute="edit" /></AdminProtectedRoute>} />
          <Route path="/admin/attendance" element={<AdminProtectedRoute permissionKey="attendance"><AdminAttendancePage /></AdminProtectedRoute>} />
          <Route path="/admin/attendance/:id" element={<AdminProtectedRoute permissionKey="attendance"><AdminAttendanceEmployeeWrapper /></AdminProtectedRoute>} />
          <Route path="/admin/bike-tracking" element={<AdminProtectedRoute permissionKey="tracking"><AdminBikeTrackingPage activeTab="live" /></AdminProtectedRoute>} />
          <Route path="/admin/bike-tracking/live" element={<AdminProtectedRoute permissionKey="tracking"><AdminBikeTrackingPage activeTab="live" /></AdminProtectedRoute>} />
          <Route path="/admin/bike-tracking/history" element={<AdminProtectedRoute permissionKey="tracking"><AdminBikeTrackingPage activeTab="history" /></AdminProtectedRoute>} />
          <Route path="/admin/payroll" element={<AdminProtectedRoute permissionKey="payroll" altPermissionKey="salary"><AdminPayrollPage /></AdminProtectedRoute>} />
          <Route path="/admin/payroll/:id" element={<AdminProtectedRoute permissionKey="payroll" altPermissionKey="salary"><AdminPayrollViewWrapper /></AdminProtectedRoute>} />
          <Route path="/admin/tasks" element={<AdminProtectedRoute permissionKey="tasks"><TaskManagementPage /></AdminProtectedRoute>} />
          <Route path="/admin/crm" element={<AdminProtectedRoute permissionKey="crm"><AdminCRMPage activeTab="leads" /></AdminProtectedRoute>} />
          <Route path="/admin/crm/leads" element={<AdminProtectedRoute permissionKey="crm_leads" altPermissionKey="crm"><AdminCRMPage activeTab="leads" /></AdminProtectedRoute>} />
          <Route path="/admin/crm/clients" element={<AdminProtectedRoute permissionKey="crm_customers" altPermissionKey="crm"><AdminCRMPage activeTab="clients" /></AdminProtectedRoute>} />
          <Route path="/admin/crm/customers" element={<AdminProtectedRoute permissionKey="crm_customers" altPermissionKey="crm"><AdminCRMPage activeTab="clients" /></AdminProtectedRoute>} />
          <Route path="/admin/crm/followups" element={<AdminProtectedRoute permissionKey="crm_followups" altPermissionKey="crm"><AdminCRMPage activeTab="followups" /></AdminProtectedRoute>} />
          <Route path="/admin/crm/pipeline" element={<AdminProtectedRoute permissionKey="crm_pipeline" altPermissionKey="crm"><AdminCRMPage activeTab="pipeline" /></AdminProtectedRoute>} />
          <Route path="/admin/crm/:id" element={<AdminProtectedRoute permissionKey="crm"><AdminCRMViewWrapper /></AdminProtectedRoute>} />
          <Route path="/admin/transactions" element={<AdminProtectedRoute permissionKey="transactions"><AdminTransactionsPage /></AdminProtectedRoute>} />
          <Route path="/admin/quotations" element={<AdminProtectedRoute permissionKey="quotations" altPermissionKey="quotation"><AdminQuotationsPage /></AdminProtectedRoute>} />
          <Route path="/admin/quotations/:id" element={<AdminProtectedRoute permissionKey="quotations" altPermissionKey="quotation"><AdminQuotationViewWrapper subRoute="view" /></AdminProtectedRoute>} />
          <Route path="/admin/offer-letters" element={<AdminProtectedRoute permissionKey="offer_letters" altPermissionKey="offerLetters"><AdminOfferLettersPage subRoute="list" /></AdminProtectedRoute>} />
          <Route path="/admin/offer-letters/create" element={<AdminProtectedRoute permissionKey="offer_letters" altPermissionKey="offerLetters"><AdminOfferLettersPage subRoute="create" /></AdminProtectedRoute>} />
          <Route path="/admin/offer-letters/:id" element={<AdminProtectedRoute permissionKey="offer_letters" altPermissionKey="offerLetters"><AdminOfferLetterWrapper subRoute="view" /></AdminProtectedRoute>} />
          <Route path="/admin/reports" element={<AdminProtectedRoute permissionKey="reports"><AdminReportsPage /></AdminProtectedRoute>} />
          <Route path="/admin/notifications" element={<AdminProtectedRoute permissionKey="notifications"><AdminNotificationsPage /></AdminProtectedRoute>} />
          <Route path="/admin/profile" element={<AdminProtectedRoute><AdminProfilePage /></AdminProtectedRoute>} />
          <Route path="/admin/settings" element={<AdminProtectedRoute permissionKey="settings" altPermissionKey="administration"><AdminSettingsPage /></AdminProtectedRoute>} />

          {/* Admin Error Pages */}
          <Route path="/admin/403" element={<Admin403 />} />
          <Route path="/admin/*" element={<Admin404 />} />

          {/* Default redirect to Super Admin Panel */}
          <Route path="/" element={<Navigate to="/super-admin/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/super-admin/dashboard" replace />} />
        </Routes>
        </Suspense>
        </AuthProvider>
      </ConfigProvider>
    </BrowserRouter>
  );
}
