import React from 'react';
import type { WaitingRoomCase, EstadoSpt } from '@/services/supabase/waiting-room/waiting-room-service';
import { Badge } from '@shared/components/ui/badge';
import { BranchBadge } from '@shared/components/ui/branch-badge';
import { Card } from '@shared/components/ui/card';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Clock } from 'lucide-react';
import { cn } from '@shared/lib/cn';

interface WaitingRoomCaseCardProps {
  case_: WaitingRoomCase;
  onClick?: () => void;
}

/**
 * Obtener el color del badge según el estado
 */
const getEstadoBadgeVariant = (estado: EstadoSpt | null): 'default' | 'secondary' | 'destructive' | 'outline' => {
  switch (estado) {
    case 'pendiente_triaje':
      return 'destructive'; // Rojo - necesita atención
    case 'esperando_consulta':
      return 'secondary'; // Gris/Azul - en proceso
    case 'finalizado':
      return 'default'; // Verde - completado (aunque no debería aparecer)
    default:
      return 'outline';
  }
};

/**
 * Obtener el texto del estado en español
 */
const getEstadoText = (estado: EstadoSpt | null): string => {
  switch (estado) {
    case 'pendiente_triaje':
      return 'Pendiente por triaje';
    case 'esperando_consulta':
      return 'Esperando por consulta';
    case 'finalizado':
      return 'Finalizado';
    default:
      return 'Sin estado';
  }
};

/**
 * Calcular tiempo de espera desde la creación del caso
 */
const getWaitingTime = (createdAt: string): string => {
  const now = new Date();
  const created = new Date(createdAt);
  const diffMs = now.getTime() - created.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 0) {
    return `${diffDays} día${diffDays > 1 ? 's' : ''}`;
  }
  if (diffHours > 0) {
    return `${diffHours} hora${diffHours > 1 ? 's' : ''}`;
  }
  if (diffMins > 0) {
    return `${diffMins} minuto${diffMins > 1 ? 's' : ''}`;
  }
  return 'Recién registrado';
};

export const WaitingRoomCaseCard: React.FC<WaitingRoomCaseCardProps> = ({
  case_,
  onClick,
}) => {
  const waitingTime = getWaitingTime(case_.created_at);
  const formattedDate = format(new Date(case_.created_at), 'HH:mm', { locale: es });

  return (
    <Card
      className={cn(
        'p-3 sm:p-4 cursor-pointer transition-all duration-200',
        'hover:shadow-lg hover:border-primary/50 hover:-translate-y-0.5',
        onClick && 'hover:bg-accent/50'
      )}
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-2 sm:gap-3 md:gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2 sm:mb-3">
            <h3 className="font-semibold text-base sm:text-lg truncate">{case_.nombre}</h3>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
            <Badge variant={getEstadoBadgeVariant(case_.estado_spt)} className="text-xs sm:text-sm">
              {getEstadoText(case_.estado_spt)}
            </Badge>

            {case_.code && (
              <span className="inline-flex items-center gap-0.5 sm:gap-1 px-1.5 sm:px-2 py-0.5 sm:py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300">
                {case_.code}
              </span>
            )}

            {case_.branch && (
              <BranchBadge branch={case_.branch} />
            )}
          </div>
        </div>

        <div className="flex flex-col items-end gap-0.5 sm:gap-1 text-xs sm:text-sm text-muted-foreground shrink-0">
          <div className="flex items-center gap-0.5 sm:gap-1">
            <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span>{formattedDate}</span>
          </div>
          <span className="text-[10px] sm:text-xs">{waitingTime}</span>
        </div>
      </div>
    </Card>
  );
};
