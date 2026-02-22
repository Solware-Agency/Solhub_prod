import { Navigate, useLocation } from 'react-router-dom';
import { useLaboratory } from '@/app/providers/LaboratoryContext';
import type { LaboratoryFeatures } from '@/shared/types/types';
import NoPermissionsPage from './NoPermissionsPage';
import { useUserProfile } from '@shared/hooks/useUserProfile';

interface FeatureRouteProps {
  feature?: keyof LaboratoryFeatures;
  children: React.ReactNode;
  fallbackPath?: string;
}

export function FeatureRoute({
  feature,
  children,
  fallbackPath = '/dashboard/home',
}: FeatureRouteProps) {
  const { laboratory, isLoading } = useLaboratory();
  const location = useLocation();
  const pathname = location.pathname;

  // Spinner de carga (mismo componente para no duplicar)
  const loadingSpinner = (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
    </div>
  );

  // Si está cargando, mostrar loading
  if (isLoading) {
    return loadingSpinner;
  }

  // Si no hay feature requerida, mostrar el componente directamente
  if (!feature) {
    return <>{children}</>;
  }

  const { profile } = useUserProfile()

  // El rol "prueba" respeta las features del laboratorio igual que otros roles
  // Solo tiene bypass en rutas protegidas por roles (PrivateRoute)

  // Si no hay laboratorio aún: al recargar en /aseguradoras/* no redirigir a dashboard;
  // seguir mostrando loading hasta que el lab esté cargado (evita redirect prematuro).
  if (!laboratory) {
    if (feature === 'hasAseguradoras' && pathname.startsWith('/aseguradoras')) {
      return loadingSpinner;
    }
    return <Navigate to={fallbackPath} replace />;
  }

  // La feature no está habilitada en el laboratorio
  if (!laboratory.features[feature]) {
    // Para la feature de informes también evaluamos permisos por rol
    if (feature === 'hasReports') {
      // Denegar explícitamente a imagenologia por ahora
      if (profile?.role === 'imagenologia') {
        return (
          <NoPermissionsPage title="Sin permisos" description="No tienes permisos para generar informes." />
        )
      }

      // Si la feature está desactivada por laboratorio, mostramos pantalla genérica
      return (
        <NoPermissionsPage title="Sin permisos" description="No tienes permisos para generar informes." />
      )
    }

    // Por defecto redirigimos al fallbackPath
    return <Navigate to={fallbackPath} replace />;
  }

  // Call Center: solo owner, prueba y call_center pueden acceder
  if (feature === 'hasCallCenter') {
    const allowedRoles = ['owner', 'prueba', 'call_center'];
    if (!profile?.role || !allowedRoles.includes(profile.role)) {
      return <Navigate to={fallbackPath} replace />;
    }
  }

  return <>{children}</>;
}

