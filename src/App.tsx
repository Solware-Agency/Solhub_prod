import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Suspense } from 'react'
import { Toaster } from '@shared/components/ui/toaster'
import { DateRangeProvider } from '@app/providers/DateRangeContext'
import {
	NotFoundPage,
	Layout,
	HomePage,
	ReceptionistHomePage,
	StatsPage,
	ReportsPage,
	UsersPage,
	CasesPage,
	SettingsPage,
	ChangelogPage,
	PatientsPage,
	PrivateRoute,
	DoctorsSection,
	MedicalForm,
	StandaloneChatPage,
} from '@app/routes/lazy-routes'
import RoleSelectorPage from '@features/auth/pages/RoleSelectorPage'

// Loading component for Suspense fallback
const LoadingSpinner = () => (
	<div className="flex items-center justify-center min-h-screen">
		<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
	</div>
)

// Create a client instance
const queryClient = new QueryClient()

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
					<DateRangeProvider>
						<Toaster />
						<Suspense fallback={<LoadingSpinner />}>
							<Routes>
								{/* Role Selector - Main entry point */}
								<Route path="/" element={<RoleSelectorPage />} />

								{/* Protected owner routes */}
								<Route
									path="/dashboard"
									element={
										<PrivateRoute requiredRole={['owner', 'medicowner']}>
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
											<Layout />
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
											<Layout />
										</PrivateRoute>
									}
								>
									{/* Nested routes that will render in the Outlet */}
									<Route index element={<CasesPage />} />
									<Route path="cases" element={<CasesPage />} />
									<Route path="settings" element={<SettingsPage />} />
								</Route>

								<Route
									path="/cito"
									element={
										<PrivateRoute requiredRole={'citotecno'}>
											<Layout />
										</PrivateRoute>
									}
								>
									{/* Nested routes that will render in the Outlet */}
									<Route index element={<CasesPage />} />
									<Route path="cases" element={<CasesPage />} />
									<Route path="settings" element={<SettingsPage />} />
								</Route>

								<Route
									path="/patolo"
									element={
										<PrivateRoute requiredRole={'patologo'}>
											<Layout />
										</PrivateRoute>
									}
								>
									{/* Nested routes that will render in the Outlet */}
									<Route index element={<CasesPage />} />
									<Route path="cases" element={<CasesPage />} />
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
					</DateRangeProvider>
				</div>
			</BrowserRouter>
		</QueryClientProvider>
	)
}

export default App
