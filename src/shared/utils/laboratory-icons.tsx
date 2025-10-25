/**
 * Mapeador de íconos de laboratorios
 *
 * Uso:
 * 1. En Supabase, guarda solo el nombre: "conspat", "solhub", etc.
 * 2. Este archivo automáticamente renderiza el ícono correcto
 */

import ConspatIcon from '@shared/components/icons/ConspatIcon';
import SolHubIcon from '@shared/components/icons/SolHubIcon';

// Tipos de íconos disponibles
export type LaboratoryIconType = 'conspat' | 'solhub' | 'default';

// Mapa de íconos: nombre -> componente
export const LABORATORY_ICONS = {
  conspat: ConspatIcon,
  solhub: SolHubIcon,
  default: SolHubIcon, // Ícono por defecto si no se encuentra
} as const;

/**
 * Obtiene el componente de ícono según el nombre
 * @param iconName - Nombre del ícono guardado en Supabase
 * @returns Componente del ícono
 */
export function getLaboratoryIcon(iconName?: string | null) {
  if (!iconName) return LABORATORY_ICONS.default;

  const normalizedName = iconName.toLowerCase() as LaboratoryIconType;
  return LABORATORY_ICONS[normalizedName] || LABORATORY_ICONS.default;
}

/**
 * Componente para renderizar el ícono del laboratorio
 * @param iconName - Nombre del ícono
 * @param fill - Color de relleno
 * @param className - Clases CSS
 */
interface LaboratoryIconProps {
  iconName?: string | null;
  fill?: string;
  className?: string;
}

export function LaboratoryIcon({
  iconName,
  fill = '#fff',
  className = '',
}: LaboratoryIconProps) {
  const IconComponent = getLaboratoryIcon(iconName);
  return <IconComponent fill={fill} className={className} />;
}
