import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  getWaitingRoomCases,
  getActiveBranches,
  getWaitingRoomStats,
} from '@/services/supabase/waiting-room/waiting-room-service';
import type { WaitingRoomCase } from '@/services/supabase/waiting-room/waiting-room-service';
import { WaitingRoomCaseCard } from '../components/WaitingRoomCaseCard';
import {
  WaitingRoomStatDetailModal,
  type WaitingRoomStatCardType,
} from '../components/WaitingRoomStatDetailModal';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@shared/components/ui/tabs';
import { Card } from '@shared/components/ui/card';
import { Badge } from '@shared/components/ui/badge';
import { Loader2, Users, Clock, Timer, Stethoscope } from 'lucide-react';
import { useToast } from '@shared/hooks/use-toast';
import { useLaboratory } from '@/app/providers/LaboratoryContext';
import { useUserProfile } from '@shared/hooks/useUserProfile';

/** Formatea minutos a "X min" o "X h Y min" */
function formatWaitingTime(minutes: number): string {
  if (minutes < 1) return '< 1 min';
  if (minutes < 60) return `${Math.round(minutes)} min`;
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return m > 0 ? `${h} h ${m} min` : `${h} h`;
}

/** Dado un array de casos, devuelve los minutos del más antiguo (desde created_at hasta ahora) */
function getOldestWaitingMinutes(cases: WaitingRoomCase[]): number | null {
  if (cases.length === 0) return null;
  const oldest = cases.reduce((prev, curr) =>
    new Date(curr.created_at).getTime() < new Date(prev.created_at).getTime() ? curr : prev
  );
  return (Date.now() - new Date(oldest.created_at).getTime()) / (1000 * 60);
}

const WaitingRoomPage: React.FC = () => {
  const { profile } = useUserProfile();
  const { laboratory } = useLaboratory();
  const { toast } = useToast();

  // Employee (y roles con sede asignada) solo ven su sede: sin "Todas" y con sede por defecto
  const isRestrictedToBranch = Boolean(
    profile?.role === 'employee' && profile?.assigned_branch
  );
  const defaultBranch = isRestrictedToBranch ? profile!.assigned_branch! : null;
  const [selectedBranch, setSelectedBranch] = useState<string | null>(defaultBranch);
  const [selectedStatCard, setSelectedStatCard] = useState<WaitingRoomStatCardType | null>(null);

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

  // Tiempos del más antiguo en cada estado (para owner/prueba)
  const oldestTriajeMinutes = useMemo(() => getOldestWaitingMinutes(pendienteTriaje), [pendienteTriaje]);
  const oldestConsultaMinutes = useMemo(() => getOldestWaitingMinutes(esperandoConsulta), [esperandoConsulta]);

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
      <div>
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold">Sala de Espera</h1>
        <p className="hidden sm:block text-sm sm:text-base text-muted-foreground mt-1">
          Monitoreo en tiempo real de casos activos
        </p>
      </div>

      {/* Cards de estadísticas (owner / prueba) - hover + click abre modal */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 sm:gap-4">
        {/* Total en sala */}
        <Card
          className="p-3 sm:p-4 bg-white dark:bg-background rounded-xl shadow-lg border cursor-pointer transition-transform duration-300 hover:border-primary hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/20"
          onClick={() => setSelectedStatCard('total')}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="p-1.5 bg-muted rounded-lg">
              <Users className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
            </div>
          </div>
          <h3 className="text-xs sm:text-sm font-medium text-muted-foreground">Total en sala</h3>
          <p className="text-lg sm:text-xl font-bold text-foreground mt-0.5">
            {statsLoading ? '...' : (stats?.total ?? 0)}
          </p>
        </Card>

        {/* Pendiente triaje */}
        <Card
          className="p-3 sm:p-4 bg-white dark:bg-background rounded-xl shadow-lg border cursor-pointer transition-transform duration-300 hover:border-primary hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/20"
          onClick={() => setSelectedStatCard('pendiente_triaje')}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="p-1.5 bg-destructive/10 rounded-lg">
              <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-destructive" />
            </div>
            {!statsLoading && (stats?.pendiente_triaje ?? 0) > 0 && (
              <Badge variant="destructive" className="text-xs">{stats.pendiente_triaje}</Badge>
            )}
          </div>
          <h3 className="text-xs sm:text-sm font-medium text-muted-foreground">Pendiente triaje</h3>
          <p className="text-lg sm:text-xl font-bold text-foreground mt-0.5">
            {statsLoading ? '...' : (stats?.pendiente_triaje ?? 0)}
          </p>
        </Card>

        {/* Esperando consulta */}
        <Card
          className="p-3 sm:p-4 bg-white dark:bg-background rounded-xl shadow-lg border cursor-pointer transition-transform duration-300 hover:border-primary hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/20"
          onClick={() => setSelectedStatCard('esperando_consulta')}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="p-1.5 bg-secondary/50 rounded-lg">
              <Stethoscope className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
            </div>
            {!statsLoading && (stats?.esperando_consulta ?? 0) > 0 && (
              <Badge variant="secondary" className="text-xs">{stats.esperando_consulta}</Badge>
            )}
          </div>
          <h3 className="text-xs sm:text-sm font-medium text-muted-foreground">Esperando consulta</h3>
          <p className="text-lg sm:text-xl font-bold text-foreground mt-0.5">
            {statsLoading ? '...' : (stats?.esperando_consulta ?? 0)}
          </p>
        </Card>

        {/* Mayor tiempo en triaje */}
        <Card
          className="p-3 sm:p-4 bg-white dark:bg-background rounded-xl shadow-lg border cursor-pointer transition-transform duration-300 hover:border-primary hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/20"
          onClick={() => setSelectedStatCard('tiempo_triaje')}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="p-1.5 bg-amber-500/10 rounded-lg">
              <Timer className="h-4 w-4 sm:h-5 sm:w-5 text-amber-600 dark:text-amber-400" />
            </div>
          </div>
          <h3 className="text-xs sm:text-sm font-medium text-muted-foreground">Mayor tiempo en triaje</h3>
          <p className="text-lg sm:text-xl font-bold text-foreground mt-0.5">
            {oldestTriajeMinutes != null ? formatWaitingTime(oldestTriajeMinutes) : '—'}
          </p>
        </Card>

        {/* Mayor tiempo esperando consulta */}
        <Card
          className="p-3 sm:p-4 bg-white dark:bg-background rounded-xl shadow-lg border cursor-pointer transition-transform duration-300 hover:border-primary hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/20"
          onClick={() => setSelectedStatCard('tiempo_consulta')}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="p-1.5 bg-blue-500/10 rounded-lg">
              <Timer className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          <h3 className="text-xs sm:text-sm font-medium text-muted-foreground">Mayor tiempo en consulta</h3>
          <p className="text-lg sm:text-xl font-bold text-foreground mt-0.5">
            {oldestConsultaMinutes != null ? formatWaitingTime(oldestConsultaMinutes) : '—'}
          </p>
        </Card>
      </div>

      {/* Panel lateral (entra desde la derecha, como en Stats) */}
      <WaitingRoomStatDetailModal
        isOpen={selectedStatCard !== null}
        onClose={() => setSelectedStatCard(null)}
        cardType={selectedStatCard}
        stats={stats ?? null}
        cases={cases}
        pendienteTriaje={pendienteTriaje}
        esperandoConsulta={esperandoConsulta}
      />

      {/* Tabs por sede (employee con sede asignada solo ve su sede, sin "Todas") */}
      <Tabs
        value={selectedBranch || 'todas'}
        onValueChange={(value) => setSelectedBranch(value === 'todas' ? null : value)}
      >
        <TabsList className="w-fit sm:w-fit md:w-fit flex-wrap">
          {!isRestrictedToBranch && (
            <TabsTrigger value="todas">
              <span className="hidden sm:inline">Todas las sedes</span>
              <span className="sm:hidden">Todas</span>
            </TabsTrigger>
          )}
          {branchesLoading ? (
            <TabsTrigger value="loading" disabled>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              <span className="hidden sm:inline">Cargando...</span>
              <span className="sm:hidden">...</span>
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
