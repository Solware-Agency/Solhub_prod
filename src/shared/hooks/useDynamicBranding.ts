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
    console.log('🔍 [Branding] Cargando branding desde localStorage...');
    try {
      const savedBranding = localStorage.getItem(BRANDING_STORAGE_KEY);
      console.log('🔍 [Branding] Valor en localStorage:', savedBranding);
      
      if (savedBranding) {
        const parsed = JSON.parse(savedBranding) as BrandingConfig;
        setBranding(parsed);
        console.log('✅ [Branding] Branding cargado:', parsed.laboratoryName);
      } else {
        console.log('⚠️ [Branding] No hay branding guardado');
      }
    } catch (error) {
      console.error('❌ [Branding] Error cargando branding desde localStorage:', error);
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
    console.log('💾 [Branding] Intentando guardar branding:', config);
    try {
      const jsonString = JSON.stringify(config);
      console.log('💾 [Branding] JSON a guardar:', jsonString);
      
      localStorage.setItem(BRANDING_STORAGE_KEY, jsonString);
      setBranding(config);
      
      // Verificar que se guardó correctamente
      const verification = localStorage.getItem(BRANDING_STORAGE_KEY);
      console.log('✅ [Branding] Verificación - Guardado correctamente:', verification === jsonString);
      console.log('✅ [Branding] Branding guardado para:', config.laboratoryName);
    } catch (error) {
      console.error('❌ [Branding] Error guardando branding en localStorage:', error);
    }
  };

  /**
   * Limpia el branding guardado y vuelve al branding genérico
   * Útil para computadoras compartidas o cuando el usuario quiere cambiar de laboratorio
   */
  const clearBranding = () => {
    console.log('🧹 [Branding] Limpiando branding...');
    try {
      localStorage.removeItem(BRANDING_STORAGE_KEY);
      setBranding(null);
      console.log('✅ [Branding] Branding limpiado exitosamente');
    } catch (error) {
      console.error('❌ [Branding] Error limpiando branding:', error);
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
