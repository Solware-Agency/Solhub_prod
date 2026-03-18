import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/services/supabase/config/config';
import { useAuth } from './AuthContext';
import { useUserProfile } from '@/shared/hooks/useUserProfile';
import type { Laboratory } from '@/shared/types/types';
import { updateFavicon } from '@/shared/utils/favicon-utils';

interface LaboratoryContextType {
  laboratory: Laboratory | null;
  isLoading: boolean;
  refreshLaboratory: () => Promise<void>;
}

const LaboratoryContext = createContext<LaboratoryContextType | undefined>(
  undefined,
);

export function LaboratoryProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = useAuth();
  // Reutiliza el perfil ya cacheado por React Query (useUserProfile en useSecureRedirect/LoginForm)
  // para obtener laboratory_id sin hacer un fetch extra a Supabase
  const { profile, isLoading: profileLoading } = useUserProfile();
  const [laboratory, setLaboratory] = useState<Laboratory | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  // Guard: evita recargar el laboratorio si ya está cargado para el mismo ID
  const loadedForLabIdRef = useRef<string | null>(null);

  const loadLaboratory = async (laboratoryId: string) => {
    loadedForLabIdRef.current = laboratoryId;
    try {
      const { data: lab, error: labError } = await supabase
        .from('laboratories' as never)
        .select('*')
        .eq('id', laboratoryId)
        .single();

      if (labError || !lab) {
        console.error('Error loading laboratory:', labError);
        setLaboratory(null);
        return;
      }

      setLaboratory(lab as unknown as Laboratory);

      const labData = lab as unknown as Laboratory;
      console.log('🏥 Laboratory loaded:', labData?.name, '(', labData?.slug, ')');
      console.log('🎯 Features:', labData?.features);
      console.log('💬 hasChatbot:', labData?.features?.hasChatbot);

      const faviconUrl = labData?.branding?.favicon || labData?.branding?.logo;
      if (faviconUrl) {
        updateFavicon(faviconUrl);
      } else {
        console.warn('⚠️ No favicon or logo found in laboratory branding');
      }
    } catch (error) {
      console.error('Unexpected error loading laboratory:', error);
      setLaboratory(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!user?.id) {
      loadedForLabIdRef.current = null;
      setLaboratory(null);
      setIsLoading(false);
      return;
    }

    // Esperar a que el perfil esté disponible (viene del caché de React Query)
    if (profileLoading) return;

    const laboratoryId = (profile as any)?.laboratory_id as string | undefined;

    if (!laboratoryId) {
      // Perfil cargado pero sin laboratory_id (perfil eliminado u otro error)
      setLaboratory(null);
      setIsLoading(false);
      return;
    }

    // Si el ref ya apunta a este mismo laboratoryId, el lab está siendo cargado o ya fue cargado.
    // Evita re-fetches innecesarios causados por background refetches de React Query
    // que cambian la referencia del objeto profile sin cambiar el laboratory_id.
    if (loadedForLabIdRef.current === laboratoryId) {
      return;
    }

    loadLaboratory(laboratoryId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, profileLoading, (profile as any)?.laboratory_id]);

  const refreshLaboratory = useCallback(async () => {
    const laboratoryId = (profile as any)?.laboratory_id as string | undefined;
    if (!laboratoryId) return;
    // Resetear el guard para forzar un re-fetch en recarga explícita
    loadedForLabIdRef.current = null;
    setIsLoading(true);
    await loadLaboratory(laboratoryId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [(profile as any)?.laboratory_id]);

  // useMemo evita que los consumidores de useLaboratory() re-rendericen cuando
  // LaboratoryContext re-renderiza por razones internas (ej: React Query subscription)
  // pero laboratory/isLoading no han cambiado realmente.
  const contextValue = useMemo(
    () => ({ laboratory, isLoading, refreshLaboratory }),
    [laboratory, isLoading, refreshLaboratory],
  );

  return (
    <LaboratoryContext.Provider
      value={contextValue}
    >
      {children}
    </LaboratoryContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components -- hook exportado junto al provider
export function useLaboratory() {
  const context = useContext(LaboratoryContext);
  if (!context) {
    throw new Error('useLaboratory must be used within LaboratoryProvider');
  }
  return context;
}
