import { lazy } from 'react'

// Auth pages - lazy loaded
export const NotFoundPage = lazy(() =>
	import('@features/auth/pages/NotFoundPage').then((module) => ({ default: module.NotFoundPage })),
)

// Dashboard pages - lazy loaded
export const Layout = lazy(() => import('@shared/components/layout/Layout'))

export const HomePage = lazy(() => import('@features/dashboard/components/HomePage'))
export const StatsPage = lazy(() => import('@features/stats/pages/StatsPage'))
export const ReceptionistHomePage = lazy(() => import('@features/dashboard/components/ReceptionistHomePage'))
export const ReportsPage = lazy(() => import('@features/reports/pages/ReportsPage'))
export const UsersPage = lazy(() => import('@features/users/pages/UsersPage'))
export const CasesPage = lazy(() => import('@features/cases/pages/CasesPage'))
export const SettingsPage = lazy(() => import('@features/settings/pages/SettingsPage'))
export const ChangelogPage = lazy(() => import('@features/changelog/pages/ChangelogPage'))

export const PatientsPage = lazy(() => import('@features/patients/pages/PatientsPage'))
export const MedicalForm = lazy(() => import('@features/form/components/MedicalForm'))
export const StandaloneChatPage = lazy(() => import('@features/ChatAI/pages/StandaloneChatPage'))

// Form pages - lazy loaded
export const DoctorsSection = lazy(() =>
	import('@features/form/components/DoctorsSection').then((module) => ({ default: module.DoctorsSection })),
)

// Routes - lazy loaded
export const FormRoute = lazy(() => import('@app/routes/FormRoute'))
export const PrivateRoute = lazy(() => import('@app/routes/PrivateRoute'))
