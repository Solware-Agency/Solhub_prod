import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/services/supabase/config/config';
import { useAuth } from './AuthContext';
import type { Laboratory } from '@/shared/types/types';
import { extractLaboratoryId } from '@/services/supabase/types/helpers';
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
  const [laboratory, setLaboratory] = useState<Laboratory | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadLaboratory = async () => {
    if (!user) {
      setLaboratory(null);
      setIsLoading(false);
      return;
    }

    try {
      // Obtener laboratory_id del perfil del usuario
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('laboratory_id')
        .eq('id', user.id)
        .single();

      const laboratoryId = extractLaboratoryId(profile);

      if (profileError || !laboratoryId) {
        console.error('Error loading user profile:', profileError);
        setLaboratory(null);
        setIsLoading(false);
        return;
      }

      // Cargar datos completos del laboratorio
      const { data: lab, error: labError } = await supabase
        .from('laboratories' as never)
        .select('*')
        .eq('id', laboratoryId)
        .single();

      if (labError || !lab) {
        console.error('Error loading laboratory:', labError);
        setLaboratory(null);
        setIsLoading(false);
        return;
      }

      setLaboratory(lab as unknown as Laboratory);

      // Aplicar favicon si existe en el branding
      const labData = lab as unknown as Laboratory;
      if (labData?.branding?.favicon) {
        updateFavicon(labData.branding.favicon);
      }
    } catch (error) {
      console.error('Unexpected error loading laboratory:', error);
      setLaboratory(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadLaboratory();
  }, [user]);

  const refreshLaboratory = async () => {
    setIsLoading(true);
    await loadLaboratory();
  };

  return (
    <LaboratoryContext.Provider
      value={{ laboratory, isLoading, refreshLaboratory }}
    >
      {children}
    </LaboratoryContext.Provider>
  );
}

export function useLaboratory() {
  const context = useContext(LaboratoryContext);
  if (!context) {
    throw new Error('useLaboratory must be used within LaboratoryProvider');
  }
  return context;
}
