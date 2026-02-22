import { useLaboratory } from '@/app/providers/LaboratoryContext';
import { useUserProfile } from '@shared/hooks/useUserProfile';
import type { LaboratoryFeatures } from '@/shared/types/types';

interface FeatureGuardProps {
  feature: keyof LaboratoryFeatures;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function FeatureGuard({
  feature,
  children,
  fallback = null,
}: FeatureGuardProps) {
  const { laboratory } = useLaboratory();
  const { profile } = useUserProfile();

  // El rol "prueba" respeta las features del laboratorio igual que otros roles
  // Solo tiene bypass en rutas protegidas por roles (PrivateRoute)
  if (!laboratory?.features[feature]) {
    return <>{fallback}</>;
  }

  // Call Center: solo owner, prueba y call_center ven el menú
  if (feature === 'hasCallCenter') {
    const allowedRoles = ['owner', 'prueba', 'call_center'];
    if (!profile?.role || !allowedRoles.includes(profile.role)) {
      return <>{fallback}</>;
    }
  }

  return <>{children}</>;
}

// Ejemplo de uso:
// <FeatureGuard feature="hasChatAI">
//   <ChatButton />
// </FeatureGuard>

// <FeatureGuard feature="hasInmunoRequests" fallback={<div>Feature no disponible</div>}>
//   <InmunoRequestsSection />
// </FeatureGuard>
