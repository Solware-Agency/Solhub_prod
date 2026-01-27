import {
  BrowserRouter,
  Routes,
  Route,
  useLocation,
  useNavigate,
} from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Suspense } from 'react';
import { Toaster } from '@shared/components/ui/toaster';
import { DateRangeProvider } from '@app/providers/DateRangeContext';
import { ErrorBoundary } from '@shared/components/ErrorBoundary';
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
  HomePage,
  ReceptionistHomePage,
  CasesPage,
  PrivateRoute,
  StandaloneChatPage,
} from '@app/routes/lazy-routes';
import { imagenologiaRoutes } from '@app/routes/route-config';
import { FeatureRoute } from '@shared/components/FeatureRoute';
import {
  dashboardRoutes,
  employeeRoutes,
  medicRoutes,
  citotecnoRoutes,
  patologoRoutes,
  medicoTratanteRoutes,
  enfermeroRoutes,
  callCenterRoutes,
  pruebaRoutes,
} from '@app/routes/route-config';

// Loading component for Suspense fallback
const LoadingSpinner = () => (
  <div className='flex items-center justify-center min-h-screen'>
    <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-primary'></div>
  </div>
);

// Create a client instance
const queryClient = new QueryClient();

function RecoveryGate() {
  const location = useLocation();
  const navigate = useNavigate();

  // Redirige a /auth/callback si detecta tipo recovery en query o en hash
  if (typeof window !== 'undefined') {
    const isOnCallback = location.pathname === '/auth/callback';
    const isOnNewPassword = location.pathname === '/new-password';

    if (!isOnCallback && !isOnNewPassword) {
      const searchParams = new URLSearchParams(location.search);
      const typeQuery = searchParams.get('type');
      const tokenQuery = searchParams.get('token') || searchParams.get('code');

      const rawHash = window.location.hash.startsWith('#')
        ? window.location.hash.slice(1)
        : window.location.hash;
      const hashParams = new URLSearchParams(rawHash);
      const typeHash = hashParams.get('type');
      const tokenHash =
        hashParams.get('token') ||
        hashParams.get('code') ||
        hashParams.get('access_token');

      if (
        typeQuery === 'recovery' ||
        typeHash === 'recovery' ||
        tokenQuery ||
        tokenHash
      ) {
        const nextUrl = `/auth/callback${location.search || ''}${
          location.hash || ''
        }`;
        navigate(nextUrl, { replace: true });
      }
    }
  }

  return null;
}

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter
          future={{
            v7_startTransition: true,
            v7_relativeSplatPath: true,
          }}
        >
          <div className='App'>
            <DateRangeProvider>
              <Toaster />
              <Suspense fallback={<LoadingSpinner />}>
                <RecoveryGate />
                <Routes>
                {/* Public routes */}
                <Route path='/' element={<LoginPage />} />
                <Route path='/register' element={<RegisterPage />} />
                <Route
                  path='/forgot-password'
                  element={<ForgotPasswordPage />}
                />
                <Route path='/reset-password' element={<PasswordResetPage />} />
                <Route path='/new-password' element={<NewPasswordPage />} />
                <Route
                  path='/email-verification-notice'
                  element={<EmailVerificationNotice />}
                />
                <Route
                  path='/pending-approval'
                  element={<PendingApprovalPage />}
                />

                {/* Auth callback route for email verification and password reset */}
                <Route path='/auth/callback' element={<AuthCallback />} />

                {/* Protected owner routes */}
                <Route
                  path='/dashboard'
                  element={
                    <PrivateRoute requiredRole={['owner', 'medicowner']}>
                      <Layout />
                    </PrivateRoute>
                  }
                >
                  {/* Nested routes that will render in the Outlet */}
                  <Route
                    index
                    element={
                      <FeatureRoute
                        feature='hasStats'
                        fallbackPath='/dashboard/home'
                      >
                        <HomePage />
                      </FeatureRoute>
                    }
                  />
                  {dashboardRoutes.map((routeConfig) => {
                    const Component = routeConfig.component;
                    return (
                      <Route
                        key={routeConfig.path}
                        path={routeConfig.path}
                        element={
                          <FeatureRoute
                            feature={routeConfig.feature}
                            fallbackPath='/dashboard/home'
                          >
                            <Component />
                          </FeatureRoute>
                        }
                      />
                    );
                  })}
                </Route>

                {/* Protected employee routes */}
                <Route
                  path='/employee'
                  element={
                    <PrivateRoute requiredRole={'employee'}>
                      <Layout />
                    </PrivateRoute>
                  }
                >
                  {/* Nested routes that will render in the Outlet */}
                  <Route index element={<ReceptionistHomePage />} />
                  {employeeRoutes.map((routeConfig) => {
                    const Component = routeConfig.component;
                    return (
                      <Route
                        key={routeConfig.path}
                        path={routeConfig.path}
                        element={
                          <FeatureRoute
                            feature={routeConfig.feature}
                            fallbackPath='/employee/home'
                          >
                            <Component />
                          </FeatureRoute>
                        }
                      />
                    );
                  })}
                </Route>

                <Route
                  path='/medic'
                  element={
                    <PrivateRoute requiredRole={'residente'}>
                      <Layout />
                    </PrivateRoute>
                  }
                >
                  {/* Nested routes that will render in the Outlet */}
                  <Route index element={<ReceptionistHomePage />} />
                  {medicRoutes.map((routeConfig) => {
                    const Component = routeConfig.component;
                    return (
                      <Route
                        key={routeConfig.path}
                        path={routeConfig.path}
                        element={
                          <FeatureRoute
                            feature={routeConfig.feature}
                            fallbackPath='/medic/home'
                          >
                            <Component />
                          </FeatureRoute>
                        }
                      />
                    );
                  })}
                </Route>

                <Route
                  path='/cito'
                  element={
                    <PrivateRoute requiredRole={'citotecno'}>
                      <Layout />
                    </PrivateRoute>
                  }
                >
                  {/* Nested routes that will render in the Outlet */}
                  <Route index element={<ReceptionistHomePage />} />
                  {citotecnoRoutes.map((routeConfig) => {
                    const Component = routeConfig.component;
                    return (
                      <Route
                        key={routeConfig.path}
                        path={routeConfig.path}
                        element={
                          <FeatureRoute
                            feature={routeConfig.feature}
                            fallbackPath='/cito/cases'
                          >
                            <Component />
                          </FeatureRoute>
                        }
                      />
                    );
                  })}
                </Route>

                <Route
                  path='/patolo'
                  element={
                    <PrivateRoute requiredRole={'patologo'}>
                      <Layout />
                    </PrivateRoute>
                  }
                >
                  {/* Nested routes that will render in the Outlet */}
                  <Route index element={<ReceptionistHomePage />} />
                  {patologoRoutes.map((routeConfig) => {
                    const Component = routeConfig.component;
                    return (
                      <Route
                        key={routeConfig.path}
                        path={routeConfig.path}
                        element={
                          <FeatureRoute
                            feature={routeConfig.feature}
                            fallbackPath='/patolo/home'
                          >
                            <Component />
                          </FeatureRoute>
                        }
                      />
                    );
                  })}
                </Route>

                <Route
                  path='/imagenologia'
                  element={
                    <PrivateRoute requiredRole={'imagenologia'}>
                      <Layout />
                    </PrivateRoute>
                  }
                >
                  {/* Nested routes for imagenologia */}
                  <Route index element={<ReceptionistHomePage />} />
                  {imagenologiaRoutes.map((routeConfig) => {
                    const Component = routeConfig.component;
                    return (
                      <Route
                        key={routeConfig.path}
                        path={routeConfig.path}
                        element={
                          <FeatureRoute
                            feature={routeConfig.feature}
                            fallbackPath='/imagenologia/cases'
                          >
                            <Component />
                          </FeatureRoute>
                        }
                      />
                    );
                  })}
                </Route>

                <Route
                  path='/medico-tratante'
                  element={
                    <PrivateRoute requiredRole={'medico_tratante'}>
                      <Layout />
                    </PrivateRoute>
                  }
                >
                  {/* Nested routes that will render in the Outlet */}
                  <Route index element={<ReceptionistHomePage />} />
                  {medicoTratanteRoutes.map((routeConfig) => {
                    const Component = routeConfig.component;
                    return (
                      <Route
                        key={routeConfig.path}
                        path={routeConfig.path}
                        element={
                          <FeatureRoute
                            feature={routeConfig.feature}
                            fallbackPath='/medico-tratante/home'
                          >
                            <Component />
                          </FeatureRoute>
                        }
                      />
                    );
                  })}
                </Route>

                <Route
                  path='/enfermero'
                  element={
                    <PrivateRoute requiredRole={'enfermero'}>
                      <Layout />
                    </PrivateRoute>
                  }
                >
                  {/* Nested routes that will render in the Outlet */}
                  <Route index element={<CasesPage />} />
                  {enfermeroRoutes.map((routeConfig) => {
                    const Component = routeConfig.component;
                    return (
                      <Route
                        key={routeConfig.path}
                        path={routeConfig.path}
                        element={
                          <FeatureRoute
                            feature={routeConfig.feature}
                            fallbackPath='/enfermero/cases'
                          >
                            <Component />
                          </FeatureRoute>
                        }
                      />
                    );
                  })}
                </Route>

                <Route
                  path='/call-center'
                  element={
                    <PrivateRoute requiredRole={'call_center'}>
                      <Layout />
                    </PrivateRoute>
                  }
                >
                  {/* Nested routes that will render in the Outlet */}
                  <Route index element={<ReceptionistHomePage />} />
                  {callCenterRoutes.map((routeConfig) => {
                    const Component = routeConfig.component;
                    return (
                      <Route
                        key={routeConfig.path}
                        path={routeConfig.path}
                        element={
                          <FeatureRoute
                            feature={routeConfig.feature}
                            fallbackPath='/call-center/home'
                          >
                            <Component />
                          </FeatureRoute>
                        }
                      />
                    );
                  })}
                </Route>

                <Route
                  path='/prueba'
                  element={
                    <PrivateRoute requiredRole={'prueba'}>
                      <Layout />
                    </PrivateRoute>
                  }
                >
                  {/* Nested routes that will render in the Outlet */}
                  <Route
                    index
                    element={
                      <FeatureRoute
                        feature='hasStats'
                        fallbackPath='/prueba/home'
                      >
                        <HomePage />
                      </FeatureRoute>
                    }
                  />
                  {pruebaRoutes.map((routeConfig) => {
                    const Component = routeConfig.component;
                    return (
                      <Route
                        key={routeConfig.path}
                        path={routeConfig.path}
                        element={
                          <FeatureRoute
                            feature={routeConfig.feature}
                            fallbackPath='/prueba/home'
                          >
                            <Component />
                          </FeatureRoute>
                        }
                      />
                    );
                  })}
                </Route>

                {/* Standalone Chat Route - For Owner and Admin */}
                <Route
                  path='/chat'
                  element={
                    <PrivateRoute requiredRole={['owner', 'residente']}>
                      <FeatureRoute
                        feature='hasChatAI'
                        fallbackPath='/dashboard/home'
                      >
                        <StandaloneChatPage />
                      </FeatureRoute>
                    </PrivateRoute>
                  }
                />

                {/* 404 Route - Must be last */}
                <Route path='*' element={<NotFoundPage />} />
              </Routes>
            </Suspense>
          </DateRangeProvider>
        </div>
      </BrowserRouter>
    </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
