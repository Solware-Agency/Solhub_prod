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
