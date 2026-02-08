import { useState, useEffect } from 'react';

export interface BrandingConfig {
  logo: string;
  primaryColor: string;
  laboratoryName: string;
  icon?: string;
}

const BRANDING_STORAGE_KEY = 'last_lab_branding';

/**
 * Hook para manejar el branding dinámico en la pantalla de login
 * Persiste el branding del último laboratorio que inició sesión
 */
export function useDynamicBranding() {
  const [branding, setBranding] = useState<BrandingConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Cargar branding desde localStorage al montar el componente
  useEffect(() => {
    try {
      const savedBranding = localStorage.getItem(BRANDING_STORAGE_KEY);
      if (savedBranding) {
        const parsed = JSON.parse(savedBranding) as BrandingConfig;
        setBranding(parsed);
      }
    } catch (error) {
      console.error('Error cargando branding desde localStorage:', error);
      // Si hay error, limpiar el localStorage corrupto
      localStorage.removeItem(BRANDING_STORAGE_KEY);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Guarda el branding del laboratorio en localStorage
   * Se debe llamar después de un login exitoso
   */
  const saveBranding = (config: BrandingConfig) => {
    try {
      localStorage.setItem(BRANDING_STORAGE_KEY, JSON.stringify(config));
      setBranding(config);
    } catch (error) {
      console.error('Error guardando branding en localStorage:', error);
    }
  };

  /**
   * Limpia el branding guardado y vuelve al branding genérico
   * Útil para computadoras compartidas o cuando el usuario quiere cambiar de laboratorio
   */
  const clearBranding = () => {
    try {
      localStorage.removeItem(BRANDING_STORAGE_KEY);
      setBranding(null);
    } catch (error) {
      console.error('Error limpiando branding:', error);
    }
  };

  /**
   * Verifica si hay branding guardado
   */
  const hasBranding = Boolean(branding);

  return {
    branding,
    isLoading,
    hasBranding,
    saveBranding,
    clearBranding,
  };
}
