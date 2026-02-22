import { lazy } from 'react'

/**
 * Utility para retry en lazy loading
 * Reintenta cargar un módulo si falla (útil para errores de red o chunks)
 */
const lazyRetry = (
  componentImport: () => Promise<any>,
  name: string,
  retries = 3,
  interval = 1500
) => {
  return new Promise<any>((resolve, reject) => {
    const attemptLoad = (attemptsLeft: number) => {
      componentImport()
        .then(resolve)
        .catch((error) => {
          console.warn(`⚠️ Failed to load ${name}, attempts left: ${attemptsLeft}`, error)
          
          if (attemptsLeft === 0) {
            reject(error)
            return
          }

          setTimeout(() => {
            attemptLoad(attemptsLeft - 1)
          }, interval)
        })
    }

    attemptLoad(retries)
  })
}

// Auth pages - lazy loaded
export const LoginPage = lazy(() =>
  lazyRetry(
    () => import('@features/auth/pages/LoginPage').then((module) => ({ default: module.LoginPage })),
    'LoginPage'
  )
)
export const RegisterPage = lazy(() =>
  lazyRetry(
    () => import('@features/auth/pages/RegisterPage').then((module) => ({ default: module.RegisterPage })),
    'RegisterPage'
  )
)
export const ForgotPasswordPage = lazy(() =>
  lazyRetry(
    () => import('@features/auth/pages/ForgotPasswordPage').then((module) => ({ default: module.ForgotPasswordPage })),
    'ForgotPasswordPage'
  )
)
export const PasswordResetPage = lazy(() => 
  lazyRetry(
    () => import('@features/auth/pages/PasswordResetPage'),
    'PasswordResetPage'
  )
)
export const NewPasswordPage = lazy(() => 
  lazyRetry(
    () => import('@features/auth/pages/NewPasswordPage'),
    'NewPasswordPage'
  )
)
export const NotFoundPage = lazy(() =>
  lazyRetry(
    () => import('@features/auth/pages/NotFoundPage').then((module) => ({ default: module.NotFoundPage })),
    'NotFoundPage'
  )
)

// Auth other components - lazy loaded
export const EmailVerificationNotice = lazy(() => 
  lazyRetry(
    () => import('@features/auth/other/EmailVerificationNotice'),
    'EmailVerificationNotice'
  )
)
export const PendingApprovalPage = lazy(() => 
  lazyRetry(
    () => import('@features/auth/other/PendingApprovalPage'),
    'PendingApprovalPage'
  )
)
export const AuthCallback = lazy(() => 
  lazyRetry(
    () => import('@features/auth/other/AuthCallback'),
    'AuthCallback'
  )
)

// Dashboard pages - lazy loaded
export const Layout = lazy(() => 
  lazyRetry(
    () => import('@shared/components/layout/Layout'),
    'Layout'
  )
)

export const HomePage = lazy(() => 
  lazyRetry(
    () => import('@features/dashboard/components/HomePage'),
    'HomePage'
  )
)
export const StatsPage = lazy(() => 
  lazyRetry(
    () => import('@features/stats/pages/StatsPage'),
    'StatsPage'
  )
)
export const ReceptionistHomePage = lazy(() => 
  lazyRetry(
    () => import('@features/dashboard/components/ReceptionistHomePage'),
    'ReceptionistHomePage'
  )
)
export const ReportsPage = lazy(() => 
  lazyRetry(
    () => import('@features/reports/pages/ReportsPage'),
    'ReportsPage'
  )
)
export const UsersPage = lazy(() => 
  lazyRetry(
    () => import('@features/users/pages/UsersPage'),
    'UsersPage'
  )
)
export const CasesPage = lazy(() => 
  lazyRetry(
    () => import('@features/cases/pages/CasesPage'),
    'CasesPage'
  )
)
export const SettingsPage = lazy(() => 
  lazyRetry(
    () => import('@features/settings/pages/SettingsPage'),
    'SettingsPage'
  )
)
export const ChangelogPage = lazy(() => 
  lazyRetry(
    () => import('@features/changelog/pages/ChangelogPage'),
    'ChangelogPage'
  )
)

export const PatientsPage = lazy(() => 
  lazyRetry(
    () => import('@features/patients/pages/PatientsPage'),
    'PatientsPage'
  )
)
export const MedicalForm = lazy(() => 
  lazyRetry(
    () => import('@features/form/components/MedicalForm'),
    'MedicalForm'
  )
)
export const StandaloneChatPage = lazy(() => 
  lazyRetry(
    () => import('@features/ChatAI/pages/StandaloneChatPage'),
    'StandaloneChatPage'
  )
)
export const TriageAnalyticsPage = lazy(() => 
  lazyRetry(
    () => import('@features/stats/components/TriageAnalyticsPage').then(module => ({ default: module.TriageAnalyticsPage })),
    'TriageAnalyticsPage'
  )
)
export const WaitingRoomPage = lazy(() => 
  lazyRetry(
    () => import('@features/waiting-room/pages/WaitingRoomPage').then(module => ({ default: module.default })),
    'WaitingRoomPage'
  )
)
export const SampleCostsPage = lazy(() =>
  lazyRetry(
    () => import('@features/sample-costs/pages/SampleCostsPage').then((module) => ({ default: module.default })),
    'SampleCostsPage'
  )
)

export const CallCenterFormPage = lazy(() =>
  lazyRetry(
    () => import('@features/call-center/pages/CallCenterFormPage').then((module) => ({ default: module.default })),
    'CallCenterFormPage'
  )
)
export const CallCenterRegistrosPage = lazy(() =>
  lazyRetry(
    () => import('@features/call-center/pages/CallCenterRegistrosPage').then((module) => ({ default: module.default })),
    'CallCenterRegistrosPage'
  )
)

// Aseguradoras (Inntegras) pages - lazy loaded
export const AseguradorasHomePage = lazy(() =>
  lazyRetry(
    () => import('@features/aseguradoras/pages/AseguradorasHomePage'),
    'AseguradorasHomePage'
  )
)
export const AseguradosPage = lazy(() =>
  lazyRetry(
    () => import('@features/aseguradoras/pages/AseguradosPage'),
    'AseguradosPage'
  )
)
export const PolizasPage = lazy(() =>
  lazyRetry(
    () => import('@features/aseguradoras/pages/PolizasPage'),
    'PolizasPage'
  )
)
export const PagosPage = lazy(() =>
  lazyRetry(
    () => import('@features/aseguradoras/pages/PagosPage'),
    'PagosPage'
  )
)
export const DocumentosPage = lazy(() =>
  lazyRetry(
    () => import('@features/aseguradoras/pages/DocumentosPage'),
    'DocumentosPage'
  )
)
export const CompaniasPage = lazy(() =>
  lazyRetry(
    () => import('@features/aseguradoras/pages/CompaniasPage'),
    'CompaniasPage'
  )
)

// Form pages - lazy loaded
export const DoctorsSection = lazy(() =>
  lazyRetry(
    () => import('@features/form/components/DoctorsSection').then((module) => ({ default: module.DoctorsSection })),
    'DoctorsSection'
  )
)

// Routes - lazy loaded
export const FormRoute = lazy(() => 
  lazyRetry(
    () => import('@app/routes/FormRoute'),
    'FormRoute'
  )
)
export const PrivateRoute = lazy(() => 
  lazyRetry(
    () => import('@app/routes/PrivateRoute'),
    'PrivateRoute'
  )
)

// Test components - lazy loaded
export const ErrorBoundaryTest = lazy(() =>
  lazyRetry(
    () => import('@features/test/components/ErrorBoundaryTest').then((module) => ({ default: module.ErrorBoundaryTest })),
    'ErrorBoundaryTest'
  )
)
