import { BrowserRouter, Routes, Route, useLocation, useNavigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Suspense } from 'react'
import { Toaster } from '@shared/components/ui/toaster'
import {
	LoginPage,
	RegisterPage,
	ForgotPasswordPage,
	PasswordResetPage,
	NewPasswordPage,
	EmailVerificationNotice,
	PendingApprovalPage,
	AuthCallback,
	NotFoundPage,
	Layout,
	EmployeeLayout,
	HomePage,
	ReceptionistHomePage,
	StatsPage,
	ReportsPage,
	UsersPage,
	CasesPage,
	// MyCasesPage,
	SettingsPage,
	ChangelogPage,
	// StandaloneChangelogPage,
	PatientsPage,
	// FormRoute,
	PrivateRoute,
	DoctorsSection,
	MedicalForm,
	StandaloneChatPage,
	AdminLayout,
} from '@app/routes/lazy-routes'

// Loading component for Suspense fallback
const LoadingSpinner = () => (
	<div className="flex items-center justify-center min-h-screen">
		<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
	</div>
)

// Create a client instance
const queryClient = new QueryClient()

function RecoveryGate() {
	const location = useLocation()
	const navigate = useNavigate()

	// Redirige a /auth/callback si detecta tipo recovery en query o en hash
	if (typeof window !== 'undefined') {
		const isOnCallback = location.pathname === '/auth/callback'
		const isOnNewPassword = location.pathname === '/new-password'

		if (!isOnCallback && !isOnNewPassword) {
			const searchParams = new URLSearchParams(location.search)
			const typeQuery = searchParams.get('type')
			const tokenQuery = searchParams.get('token') || searchParams.get('code')

			const rawHash = window.location.hash.startsWith('#') ? window.location.hash.slice(1) : window.location.hash
			const hashParams = new URLSearchParams(rawHash)
			const typeHash = hashParams.get('type')
			const tokenHash = hashParams.get('token') || hashParams.get('code') || hashParams.get('access_token')

			if (typeQuery === 'recovery' || typeHash === 'recovery' || tokenQuery || tokenHash) {
				const nextUrl = `/auth/callback${location.search || ''}${location.hash || ''}`
				navigate(nextUrl, { replace: true })
			}
		}
	}

	return null
}

function App() {
	return (
		<QueryClientProvider client={queryClient}>
			<BrowserRouter
				future={{
					v7_startTransition: true,
					v7_relativeSplatPath: true,
				}}
			>
				<div className="App">
					<Toaster />
					<Suspense fallback={<LoadingSpinner />}>
						<RecoveryGate />
						<Routes>
							{/* Public routes */}
							<Route path="/" element={<LoginPage />} />
							<Route path="/register" element={<RegisterPage />} />
							<Route path="/forgot-password" element={<ForgotPasswordPage />} />
							<Route path="/reset-password" element={<PasswordResetPage />} />
							<Route path="/new-password" element={<NewPasswordPage />} />
							<Route path="/email-verification-notice" element={<EmailVerificationNotice />} />
							<Route path="/pending-approval" element={<PendingApprovalPage />} />

							{/* Auth callback route for email verification and password reset */}
							<Route path="/auth/callback" element={<AuthCallback />} />

							{/* Protected owner routes */}
							<Route
								path="/dashboard"
								element={
									<PrivateRoute requiredRole={'owner'}>
										<Layout />
									</PrivateRoute>
								}
							>
								{/* Nested routes that will render in the Outlet */}
								<Route index element={<HomePage />} />
								<Route path="home" element={<HomePage />} />
								<Route path="stats" element={<StatsPage />} />
								<Route path="reports" element={<ReportsPage />} />
								<Route path="users" element={<UsersPage />} />
								<Route path="cases" element={<CasesPage />} />
								{/* <Route path="my-cases" element={<MyCasesPage />} /> */}
								<Route path="patients" element={<PatientsPage />} />
								<Route path="changelog" element={<ChangelogPage />} />
								<Route path="doctors" element={<DoctorsSection />} />
								<Route path="medical-form" element={<MedicalForm />} />
								<Route path="settings" element={<SettingsPage />} />
							</Route>

							{/* Protected employee routes */}
							<Route
								path="/employee"
								element={
									<PrivateRoute requiredRole={'employee'}>
										<EmployeeLayout />
									</PrivateRoute>
								}
							>
								{/* Nested routes that will render in the Outlet */}
								<Route index element={<ReceptionistHomePage />} />
								<Route path="home" element={<ReceptionistHomePage />} />
								<Route path="form" element={<MedicalForm />} />
								<Route path="records" element={<CasesPage />} />
								<Route path="patients" element={<PatientsPage />} />
								<Route path="changelogpage" element={<ChangelogPage />} />
								<Route path="settings" element={<SettingsPage />} />
							</Route>

							<Route
								path="/medic"
								element={
									<PrivateRoute requiredRole={'residente'}>
										<AdminLayout />
									</PrivateRoute>
								}
							>
								{/* Nested routes that will render in the Outlet */}
								<Route index element={<CasesPage />} />
								<Route path="form" element={<MedicalForm />} />
								<Route path="cases" element={<CasesPage />} />
								{/* <Route path="my-cases" element={<MyCasesPage />} /> */}
								<Route path="users" element={<UsersPage />} />
								<Route path="settings" element={<SettingsPage />} />
							</Route>

							{/* Standalone Chat Route - For Owner and Admin */}
							<Route
								path="/chat"
								element={
									<PrivateRoute requiredRole={['owner', 'residente']}>
										<StandaloneChatPage />
									</PrivateRoute>
								}
							/>

							{/* 404 Route - Must be last */}
							<Route path="*" element={<NotFoundPage />} />
						</Routes>
					</Suspense>
				</div>
			</BrowserRouter>
		</QueryClientProvider>
	)
}

export default App
