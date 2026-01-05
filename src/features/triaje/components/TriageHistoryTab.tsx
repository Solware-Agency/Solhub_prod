import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Activity, Calendar, Heart, Thermometer, Gauge, Wind, Droplets, Scale, Ruler, FileText, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { getTriageHistoryByPatient, getLatestTriageRecord } from '@/services/supabase/triage/triage-service';
import type { TriageRecord } from '@/services/supabase/triage/triage-service';
import { supabase } from '@/services/supabase/config/config';

interface TriageHistoryTabProps {
  patientId: string;
  isOpen: boolean;
}

const TriageHistoryTab: React.FC<TriageHistoryTabProps> = ({ patientId, isOpen }) => {
  // Fetch latest triage record
  const { data: latestTriage, isLoading: isLoadingLatest, error: errorLatest, refetch: refetchLatest } = useQuery({
    queryKey: ['latest-triage', patientId],
    queryFn: async () => {
      if (!patientId) return null;
      return await getLatestTriageRecord(patientId);
    },
    enabled: isOpen && !!patientId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Fetch triage history
  const { data: triageHistory, isLoading, error, refetch } = useQuery({
    queryKey: ['triage-history', patientId],
    queryFn: async () => {
      if (!patientId) return [];
      return await getTriageHistoryByPatient(patientId);
    },
    enabled: isOpen && !!patientId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Realtime: actualizar automáticamente el historial de triaje
  React.useEffect(() => {
    if (!isOpen || !patientId) return;

    const channel = supabase
      .channel(`realtime-triage-history-${patientId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'triaje_records',
          filter: `patient_id=eq.${patientId}`,
        },
        () => {
          refetch();
          refetchLatest();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isOpen, patientId, refetch, refetchLatest]);

  if (isLoading || isLoadingLatest) {
    return (
      <div className='flex items-center justify-center py-12'>
        <div className='flex items-center gap-3'>
          <div className='animate-spin rounded-full h-6 w-6 border-b-2 border-primary'></div>
          <span className='text-lg text-gray-700 dark:text-gray-300'>
            Cargando historial de triaje...
          </span>
        </div>
      </div>
    );
  }

  if (error || errorLatest) {
    return (
      <div className='text-center py-12'>
        <div className='text-red-500 dark:text-red-400'>
          <p className='text-lg font-medium'>
            Error al cargar el historial de triaje
          </p>
          <p className='text-sm mt-2'>
            Verifica tu conexión a internet o contacta al administrador
          </p>
        </div>
      </div>
    );
  }

  // Componente para renderizar un registro de triaje
  const renderTriageRecord = (record: TriageRecord, isLatest: boolean = false) => (
    <div
      key={record.id}
      className={`bg-white/60 dark:bg-background/30 backdrop-blur-[5px] border rounded-lg p-4 transition-all duration-200 cursor-pointer hover:shadow-lg hover:shadow-primary/10 dark:hover:shadow-primary/20 hover:border-primary/50 hover:bg-white/80 dark:hover:bg-background/50 hover:scale-[1.01] ${
        isLatest ? 'border-primary border-2 shadow-lg' : 'border-input'
      }`}
    >
      {/* Header con fecha y código del caso */}
      <div className='flex items-center justify-between mb-4 pb-3 border-b border-gray-200 dark:border-gray-700'>
        <div className='flex items-center gap-2'>
          <Calendar className='h-4 w-4 text-gray-500 dark:text-gray-400' />
          <span className='text-sm font-medium text-gray-900 dark:text-gray-100'>
            {format(new Date(record.measurement_date), 'dd/MM/yyyy', { locale: es })}
          </span>
          <span className='text-xs text-gray-500 dark:text-gray-400'>
            {format(new Date(record.measurement_date), 'HH:mm', { locale: es })}
          </span>
          {record.case_code && (
            <>
              <span className='text-xs text-gray-400 dark:text-gray-500 mx-1'>•</span>
              <span className='text-xs font-medium text-primary dark:text-primary'>
                {record.case_code}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Grid de signos vitales */}
      <div className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4'>
        {/* Altura */}
        {record.height_cm && (
          <div className='flex items-start gap-2'>
            <Ruler className='h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0' />
            <div>
              <p className='text-xs text-gray-500 dark:text-gray-400'>Altura</p>
              <p className='text-sm font-medium'>{record.height_cm} cm</p>
            </div>
          </div>
        )}

        {/* Peso */}
        {record.weight_kg && (
          <div className='flex items-start gap-2'>
            <Scale className='h-4 w-4 text-purple-500 mt-0.5 flex-shrink-0' />
            <div>
              <p className='text-xs text-gray-500 dark:text-gray-400'>Peso</p>
              <p className='text-sm font-medium'>{record.weight_kg} kg</p>
            </div>
          </div>
        )}

        {/* IMC */}
        {record.bmi && (
          <div className='flex items-start gap-2'>
            <Activity className='h-4 w-4 text-green-500 mt-0.5 flex-shrink-0' />
            <div>
              <p className='text-xs text-gray-500 dark:text-gray-400'>IMC</p>
              <p className='text-sm font-medium'>{record.bmi}</p>
            </div>
          </div>
        )}

        {/* Presión arterial */}
        {record.blood_pressure && (
          <div className='flex items-start gap-2'>
            <Gauge className='h-4 w-4 text-red-500 mt-0.5 flex-shrink-0' />
            <div>
              <p className='text-xs text-gray-500 dark:text-gray-400'>Presión</p>
              <p className='text-sm font-medium'>{record.blood_pressure} mmHg</p>
            </div>
          </div>
        )}

        {/* Frecuencia cardíaca */}
        {record.heart_rate && (
          <div className='flex items-start gap-2'>
            <Heart className='h-4 w-4 text-pink-500 mt-0.5 flex-shrink-0' />
            <div>
              <p className='text-xs text-gray-500 dark:text-gray-400'>FC</p>
              <p className='text-sm font-medium'>{record.heart_rate} lpm</p>
            </div>
          </div>
        )}

        {/* Frecuencia respiratoria */}
        {record.respiratory_rate && (
          <div className='flex items-start gap-2'>
            <Wind className='h-4 w-4 text-cyan-500 mt-0.5 flex-shrink-0' />
            <div>
              <p className='text-xs text-gray-500 dark:text-gray-400'>FR</p>
              <p className='text-sm font-medium'>{record.respiratory_rate} rpm</p>
            </div>
          </div>
        )}

        {/* Saturación de oxígeno */}
        {record.oxygen_saturation !== null && record.oxygen_saturation !== undefined && (
          <div className='flex items-start gap-2'>
            <Droplets className='h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0' />
            <div>
              <p className='text-xs text-gray-500 dark:text-gray-400'>SpO₂</p>
              <p className='text-sm font-medium'>{record.oxygen_saturation}%</p>
            </div>
          </div>
        )}

        {/* Temperatura */}
        {record.temperature_celsius && (
          <div className='flex items-start gap-2'>
            <Thermometer className='h-4 w-4 text-orange-500 mt-0.5 flex-shrink-0' />
            <div>
              <p className='text-xs text-gray-500 dark:text-gray-400'>Temp</p>
              <p className='text-sm font-medium'>{record.temperature_celsius}°C</p>
            </div>
          </div>
        )}
      </div>

      {/* Información clínica (si existe) */}
      {(record.reason || record.personal_background || record.family_history || record.psychobiological_habits) && (
        <div className='mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 grid grid-cols-2 gap-4'>
          {record.reason && (
            <div>
              <p className='text-xs text-gray-500 dark:text-gray-400 mb-1'>Motivo de consulta</p>
              <p className='text-sm'>{record.reason}</p>
            </div>
          )}
          {record.personal_background && (
            <div>
              <p className='text-xs text-gray-500 dark:text-gray-400 mb-1'>Antecedentes personales</p>
              <p className='text-sm'>{record.personal_background}</p>
            </div>
          )}
          {record.family_history && (
            <div>
              <p className='text-xs text-gray-500 dark:text-gray-400 mb-1'>Antecedentes familiares</p>
              <p className='text-sm'>{record.family_history}</p>
            </div>
          )}
          {record.psychobiological_habits && (
            <div>
              <p className='text-xs text-gray-500 dark:text-gray-400 mb-1'>Hábitos psicobiológicos</p>
              <p className='text-sm'>{record.psychobiological_habits}</p>
            </div>
          )}
        </div>
      )}

      {/* Examen físico y comentarios */}
      {(record.examen_fisico || record.comment) && (
        <div className='mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 space-y-2 grid grid-cols-2 gap-4'>
          {record.examen_fisico && (
            <div>
              <p className='text-xs text-gray-500 dark:text-gray-400 mb-1 flex items-center gap-1'>
                <FileText className='h-3 w-3' />
                Examen físico
              </p>
              <p className='text-sm'>{record.examen_fisico}</p>
            </div>
          )}
          {record.comment && (
            <div>
              <p className='text-xs text-gray-500 dark:text-gray-400 mb-1'>Comentarios</p>
              <p className='text-sm'>{record.comment}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );

  // Si no hay registros
  if (!triageHistory || triageHistory.length === 0) {
    return (
      <div className='text-center py-12'>
        <div className='text-gray-500 dark:text-gray-400'>
          <Activity className='h-12 w-12 mx-auto mb-4 opacity-50' />
          <p className='text-lg font-medium'>
            No hay registros de triaje
          </p>
          <p className='text-sm mt-2'>
            Este paciente no tiene registros de triaje aún
          </p>
        </div>
      </div>
    );
  }

  // Filtrar historial (excluir el último si existe)
  const historyWithoutLatest = latestTriage
    ? triageHistory.filter((record) => record.id !== latestTriage.id)
    : triageHistory;

  return (
    <div className='space-y-6'>
      {/* Último Triaje - Vista destacada */}
      {latestTriage && (
        <div>
          <h3 className='text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2'>
            <Clock className='h-5 w-5 text-primary' />
            Último Triaje
          </h3>
          {renderTriageRecord(latestTriage, true)}
        </div>
      )}

      {/* Historial Completo */}
      {historyWithoutLatest.length > 0 && (
        <div>
          <div className='space-y-4'>
            {historyWithoutLatest.map((record: TriageRecord) =>
              renderTriageRecord(record, false),
            )}
          </div>
        </div>
      )}

      {/* Si solo hay un registro (el último), no mostrar sección de historial */}
      {historyWithoutLatest.length === 0 && latestTriage && (
        <div className='text-center py-8 text-sm text-gray-500 dark:text-gray-400'>
          Este es el único registro de triaje del paciente
        </div>
      )}
    </div>
  );
};

export default TriageHistoryTab;

