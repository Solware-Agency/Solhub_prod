import { useLaboratory } from '@/app/providers/LaboratoryContext';
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

  if (!laboratory?.features[feature]) {
    return <>{fallback}</>;
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
