import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  getWaitingRoomCases,
  getActiveBranches,
  getWaitingRoomStats,
} from '@/services/supabase/waiting-room/waiting-room-service';
import { WaitingRoomCaseCard } from '../components/WaitingRoomCaseCard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@shared/components/ui/tabs';
import { Card } from '@shared/components/ui/card';
import { Badge } from '@shared/components/ui/badge';
import { Loader2, Users, Clock } from 'lucide-react';
import { useToast } from '@shared/hooks/use-toast';
import { useLaboratory } from '@/app/providers/LaboratoryContext';

const WaitingRoomPage: React.FC = () => {
  const [selectedBranch, setSelectedBranch] = useState<string | null>(null);
  const { laboratory } = useLaboratory();
  const { toast } = useToast();

  // Verificar que es SPT
  const isSpt = laboratory?.slug === 'spt';

  // Obtener sedes activas
  const {
    data: branches = [],
    isLoading: branchesLoading,
  } = useQuery({
    queryKey: ['waiting-room-branches'],
    queryFn: getActiveBranches,
    enabled: isSpt,
    staleTime: 1000 * 60 * 5, // 5 minutos
    onSuccess: (data) => {
      console.log('✅ Sedes cargadas:', data);
    },
    onError: (error) => {
      console.error('❌ Error cargando sedes:', error);
    },
  });

  // Obtener casos de sala de espera
  const {
    data: cases = [],
    isLoading: casesLoading,
    error: casesError,
    refetch: refetchCases,
  } = useQuery({
    queryKey: ['waiting-room-cases', selectedBranch],
    queryFn: () => getWaitingRoomCases(selectedBranch || undefined),
    enabled: isSpt,
    refetchInterval: 30000, // Refrescar cada 30 segundos
    staleTime: 1000 * 15, // 15 segundos
  });

  // Obtener estadísticas
  const {
    data: stats,
    isLoading: statsLoading,
  } = useQuery({
    queryKey: ['waiting-room-stats', selectedBranch],
    queryFn: () => getWaitingRoomStats(selectedBranch || undefined),
    enabled: isSpt,
    staleTime: 1000 * 30, // 30 segundos
  });

  // Si no es SPT, no mostrar nada
  if (!isSpt) {
    return (
      <div className="container mx-auto p-6">
        <Card className="p-6 text-center">
          <p className="text-muted-foreground">
            Esta funcionalidad solo está disponible para el laboratorio SPT.
          </p>
        </Card>
      </div>
    );
  }

  // Separar casos por estado
  const pendienteTriaje = cases.filter((c) => c.estado_spt === 'pendiente_triaje');
  const esperandoConsulta = cases.filter((c) => c.estado_spt === 'esperando_consulta');

  const handleCaseClick = (caseId: string) => {
    // TODO: Navegar a detalles del caso o abrir modal
    console.log('Caso clickeado:', caseId);
  };

  if (casesError) {
    toast({
      title: 'Error',
      description: 'No se pudieron cargar los casos de la sala de espera',
      variant: 'destructive',
    });
  }

  return (
    <div className="container mx-auto p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-5 md:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold">Sala de Espera</h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">
            Monitoreo en tiempo real de casos activos
          </p>
        </div>

        {/* Estadísticas */}
        {!statsLoading && stats && (
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 md:gap-4">
            <Card className="px-3 py-1.5 sm:px-4 sm:py-2">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
                <span className="text-xs sm:text-sm font-medium">Total: {stats.total}</span>
              </div>
            </Card>
            <Card className="px-3 py-1.5 sm:px-4 sm:py-2">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <Badge variant="destructive" className="text-xs sm:text-sm mr-1 sm:mr-2">
                  {stats.pendiente_triaje}
                </Badge>
                <span className="text-xs sm:text-sm">Pendiente triaje</span>
              </div>
            </Card>
            <Card className="px-3 py-1.5 sm:px-4 sm:py-2">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <Badge variant="secondary" className="text-xs sm:text-sm mr-1 sm:mr-2">
                  {stats.esperando_consulta}
                </Badge>
                <span className="text-xs sm:text-sm">Esperando consulta</span>
              </div>
            </Card>
          </div>
        )}
      </div>

      {/* Tabs por sede */}
      <Tabs
        value={selectedBranch || 'todas'}
        onValueChange={(value) => setSelectedBranch(value === 'todas' ? null : value)}
      >
        <TabsList>
          <TabsTrigger value="todas">Todas las sedes</TabsTrigger>
          {branchesLoading ? (
            <TabsTrigger value="loading" disabled>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Cargando...
            </TabsTrigger>
          ) : (
            branches.map((branch) => (
              <TabsTrigger key={branch} value={branch}>
                {branch}
              </TabsTrigger>
            ))
          )}
        </TabsList>

        <TabsContent value={selectedBranch || 'todas'} className="space-y-4 sm:space-y-5 md:space-y-6 mt-4 sm:mt-5 md:mt-6">
          {/* Pendiente por triaje */}
          <Card className="p-3 sm:p-4 md:p-6 overflow-visible">
            <div className="flex items-center gap-2 mb-3 sm:mb-4">
              <Badge variant="destructive" className="text-xs sm:text-sm px-2 sm:px-3 py-0.5 sm:py-1">
                {pendienteTriaje.length}
              </Badge>
              <h2 className="text-lg sm:text-xl md:text-xl font-semibold">Pendiente por triaje</h2>
            </div>

            {casesLoading ? (
              <div className="flex items-center justify-center py-8 sm:py-10 md:py-12">
                <Loader2 className="h-6 w-6 sm:h-8 sm:w-8 animate-spin text-muted-foreground" />
              </div>
            ) : pendienteTriaje.length === 0 ? (
              <div className="p-6 sm:p-8 text-center text-muted-foreground">
                <Clock className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-3 sm:mb-4 opacity-50" />
                <p className="text-sm sm:text-base">No hay casos pendientes de triaje</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 max-h-[none] sm:max-h-[400px] md:max-h-[340px] overflow-visible p-0.5 sm:p-1">
                {pendienteTriaje.slice(0, 6).map((case_) => (
                  <WaitingRoomCaseCard
                    key={case_.id}
                    case_={case_}
                    onClick={() => handleCaseClick(case_.id)}
                  />
                ))}
              </div>
            )}
          </Card>

          {/* Esperando por consulta */}
          <Card className="p-3 sm:p-4 md:p-6 overflow-visible">
            <div className="flex items-center gap-2 mb-3 sm:mb-4">
              <Badge variant="secondary" className="text-xs sm:text-sm px-2 sm:px-3 py-0.5 sm:py-1">
                {esperandoConsulta.length}
              </Badge>
              <h2 className="text-lg sm:text-xl md:text-xl font-semibold">Esperando por consulta</h2>
            </div>

            {casesLoading ? (
              <div className="flex items-center justify-center py-8 sm:py-10 md:py-12">
                <Loader2 className="h-6 w-6 sm:h-8 sm:w-8 animate-spin text-muted-foreground" />
              </div>
            ) : esperandoConsulta.length === 0 ? (
              <div className="p-6 sm:p-8 text-center text-muted-foreground">
                <Clock className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-3 sm:mb-4 opacity-50" />
                <p className="text-sm sm:text-base">No hay casos esperando consulta</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 max-h-[none] sm:max-h-[400px] md:max-h-[340px] overflow-visible p-0.5 sm:p-1">
                {esperandoConsulta.slice(0, 6).map((case_) => (
                  <WaitingRoomCaseCard
                    key={case_.id}
                    case_={case_}
                    onClick={() => handleCaseClick(case_.id)}
                  />
                ))}
              </div>
            )}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default WaitingRoomPage;
