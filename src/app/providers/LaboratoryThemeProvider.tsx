/**
 * LaboratoryThemeProvider
 *
 * Inyecta las variables CSS del laboratorio actual en el :root del documento.
 * Esto permite usar los colores del laboratorio en cualquier parte del CSS global.
 *
 * Variables CSS creadas:
 * - --labPrimaryColor: Color primario del laboratorio
 * - --labSecondaryColor: Color secundario del laboratorio
 * - --labPrimaryColor10: Color primario con 10% de opacidad
 * - --labPrimaryColor20: Color primario con 20% de opacidad
 * - --labPrimaryColor50: Color primario con 50% de opacidad
 * - --labSecondaryColor10: Color secundario con 10% de opacidad
 * - --labSecondaryColor20: Color secundario con 20% de opacidad
 * - --labSecondaryColor50: Color secundario con 50% de opacidad
 */

import { useEffect } from 'react';
import { useLaboratory } from './LaboratoryContext';

const BRANDING_STORAGE_KEY = 'last_lab_branding';

interface LaboratoryThemeProviderProps {
  children: React.ReactNode;
}

export function LaboratoryThemeProvider({
  children,
}: LaboratoryThemeProviderProps) {
  const { laboratory } = useLaboratory();

  useEffect(() => {
    if (laboratory?.branding) {
      const { primaryColor, secondaryColor } = laboratory.branding;

      // Persistir branding en localStorage para que LoginForm lo muestre en el próximo inicio
      // Esto reemplaza el fetch manual que hacía LoginForm después de cada login
      try {
        const brandingData = {
          logo: laboratory.branding.logo || '',
          primaryColor: primaryColor || '#3d84f5',
          laboratoryName: laboratory.name,
          icon: laboratory.branding.icon || laboratory.slug,
        };
        localStorage.setItem(BRANDING_STORAGE_KEY, JSON.stringify(brandingData));
      } catch {
        // Ignorar errores de localStorage
      }

      // Inyectar variables CSS en el :root (formato camelCase)
      document.documentElement.style.setProperty(
        '--labPrimaryColor',
        primaryColor,
      );
      document.documentElement.style.setProperty(
        '--labSecondaryColor',
        secondaryColor,
      );

      // Crear variantes con opacidad (hex + alpha)
      // 1A = 10%, 33 = 20%, 80 = 50%
      document.documentElement.style.setProperty(
        '--labPrimaryColor10',
        `${primaryColor}1A`,
      );
      document.documentElement.style.setProperty(
        '--labPrimaryColor20',
        `${primaryColor}33`,
      );
      document.documentElement.style.setProperty(
        '--labPrimaryColor50',
        `${primaryColor}80`,
      );

      document.documentElement.style.setProperty(
        '--labSecondaryColor10',
        `${secondaryColor}1A`,
      );
      document.documentElement.style.setProperty(
        '--labSecondaryColor20',
        `${secondaryColor}33`,
      );
      document.documentElement.style.setProperty(
        '--labSecondaryColor50',
        `${secondaryColor}80`,
      );

      console.log('🎨 CSS Variables del laboratorio inyectadas:', {
        primary: primaryColor,
        secondary: secondaryColor,
      });
    }
  }, [laboratory]);

  return <>{children}</>;
}
