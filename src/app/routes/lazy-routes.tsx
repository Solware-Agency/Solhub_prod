import { lazy } from 'react'

// Auth pages - lazy loaded
export const LoginPage = lazy(() =>
	import('@features/auth/pages/LoginPage').then((module) => ({ default: module.LoginPage })),
)
export const RegisterPage = lazy(() =>
	import('@features/auth/pages/RegisterPage').then((module) => ({ default: module.RegisterPage })),
)
export const ForgotPasswordPage = lazy(() =>
	import('@features/auth/pages/ForgotPasswordPage').then((module) => ({ default: module.ForgotPasswordPage })),
)
export const PasswordResetPage = lazy(() => import('@features/auth/pages/PasswordResetPage'))
export const NewPasswordPage = lazy(() => import('@features/auth/pages/NewPasswordPage'))
export const NotFoundPage = lazy(() =>
	import('@features/auth/pages/NotFoundPage').then((module) => ({ default: module.NotFoundPage })),
)

// Auth other components - lazy loaded
export const EmailVerificationNotice = lazy(() => import('@features/auth/other/EmailVerificationNotice'))
export const PendingApprovalPage = lazy(() => import('@features/auth/other/PendingApprovalPage'))
export const AuthCallback = lazy(() => import('@features/auth/other/AuthCallback'))

// Dashboard pages - lazy loaded
export const Layout = lazy(() => import('@features/dashboard/layouts/Layout'))
export const EmployeeLayout = lazy(() => import('@features/employee/layouts/EmployeeLayout'))
export const AdminLayout = lazy(() => import('@features/admin/layouts/AdminLayout'))

export const HomePage = lazy(() => import('@features/dashboard/home/HomePage'))
export const StatsPage = lazy(() => import('@features/dashboard/stats/StatsPage'))
export const ReceptionistHomePage = lazy(() => import('@features/dashboard/home/ReceptionistHomePage'))
export const ReportsPage = lazy(() => import('@features/dashboard/reports/ReportsPage'))
export const UsersPage = lazy(() => import('@features/dashboard/users/UsersPage'))
export const CasesPage = lazy(() => import('@features/dashboard/cases/CasesPage'))
// export const MyCasesPage = lazy(() => import('@features/dashboard/cases/MyCasesPage'))
export const SettingsPage = lazy(() => import('@features/dashboard/settings/SettingsPage'))
export const ChangelogPage = lazy(() => import('@features/dashboard/changelog/ChangelogPage'))

export const StandaloneChangelogPage = lazy(() => import('@features/dashboard/changelog/StandaloneChangelogPage'))
export const PatientsPage = lazy(() => import('@features/dashboard/patients/PatientsPage'))
export const MedicalForm = lazy(() => import('@features/form/components/MedicalForm'))
export const StandaloneChatPage = lazy(() => import('@features/ChatAI/pages/StandaloneChatPage'))

// Form pages - lazy loaded
export const DoctorsSection = lazy(() =>
	import('@features/form/components/DoctorsSection').then((module) => ({ default: module.DoctorsSection })),
)

// Routes - lazy loaded
export const FormRoute = lazy(() => import('@app/routes/FormRoute'))
export const PrivateRoute = lazy(() => import('@app/routes/PrivateRoute'))
