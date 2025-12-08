import { Navigate } from 'react-router-dom';
import { useLaboratory } from '@/app/providers/LaboratoryContext';
import type { LaboratoryFeatures } from '@/shared/types/types';

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

  // Si no hay laboratorio o la feature no está habilitada, redirigir
  if (!laboratory?.features[feature]) {
    return <Navigate to={fallbackPath} replace />;
  }

  return <>{children}</>;
}

