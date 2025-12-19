import { Navigate } from 'react-router-dom';
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

  // Si está cargando, mostrar loading
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Si no hay feature requerida, mostrar el componente directamente
  if (!feature) {
    return <>{children}</>;
  }

  const { profile } = useUserProfile()

  // Si no hay laboratorio o la feature no está habilitada
  if (!laboratory?.features[feature]) {
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

  return <>{children}</>;
}

