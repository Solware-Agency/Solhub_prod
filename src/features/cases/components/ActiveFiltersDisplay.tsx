import React from 'react';
import { format } from 'date-fns';
import type { DateRange } from 'react-day-picker';
import { useLaboratory } from '@/app/providers/LaboratoryContext';

interface ActiveFiltersDisplayProps {
  // Filtros básicos
  statusFilter: string;
  branchFilter: string[];
  dateRange: DateRange | undefined;
  showPdfReadyOnly: boolean;
  selectedDoctors: string[];
  selectedOrigins?: string[];

  // Filtros de citología
  citologyPositiveFilter: boolean;
  citologyNegativeFilter: boolean;

  // Nuevos filtros
  pendingCasesFilter: string;
  pdfStatusFilter: string;
  examTypeFilter: string;
  consultaFilter: string;
  documentStatusFilter: string;
  emailSentStatusFilter?: string;

  // Conteo de casos filtrados
  totalFilteredCases?: number;
}

const ActiveFiltersDisplay: React.FC<ActiveFiltersDisplayProps> = ({
  statusFilter,
  branchFilter,
  dateRange,
  showPdfReadyOnly,
  selectedDoctors,
  selectedOrigins,
  citologyPositiveFilter,
  citologyNegativeFilter,
  pendingCasesFilter,
  pdfStatusFilter,
  examTypeFilter,
  consultaFilter,
  documentStatusFilter,
  emailSentStatusFilter,
  // totalFilteredCases,
}) => {
  const { laboratory } = useLaboratory();
  const isSpt = laboratory?.slug === 'spt';

  // Check if there are any active filters
  const hasActiveFilters =
    statusFilter !== 'all' ||
    branchFilter.length > 0 ||
    showPdfReadyOnly ||
    selectedDoctors.length > 0 ||
    (selectedOrigins && selectedOrigins.length > 0) ||
    dateRange?.from ||
    dateRange?.to ||
    citologyPositiveFilter ||
    citologyNegativeFilter ||
    pendingCasesFilter !== 'all' ||
    pdfStatusFilter !== 'all' ||
    examTypeFilter !== 'all' ||
    consultaFilter !== 'all' ||
    documentStatusFilter !== 'all' ||
    (emailSentStatusFilter && emailSentStatusFilter !== 'all');

  if (!hasActiveFilters) {
    return null;
  }

  // Helper para formatear el conteo

  return (
      <div className='flex flex-wrap gap-2 my-4'>
        {statusFilter !== 'all' && (
          <span className='inline-flex items-center gap-1 px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 text-sm rounded-full'>
            Estado: {statusFilter}
          </span>
        )}

        {branchFilter.length > 0 && (
          <span className='inline-flex items-center gap-1 px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 text-sm rounded-full'>
            Sedes: {branchFilter.length} seleccionada{branchFilter.length !== 1 ? 's' : ''}
          </span>
        )}

        {(dateRange?.from || dateRange?.to) && (
          <span className='inline-flex items-center gap-1 px-3 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 text-sm rounded-full'>
            Rango:{' '}
            {dateRange?.from && dateRange?.to
              ? `${format(dateRange.from, 'dd/MM/yyyy')} - ${format(
                  dateRange.to,
                  'dd/MM/yyyy',
                )}`
              : dateRange?.from
              ? `Desde ${format(dateRange.from, 'dd/MM/yyyy')}`
              : `Hasta ${format(dateRange.to!, 'dd/MM/yyyy')}`}
          </span>
        )}

        {selectedDoctors.length > 0 && (
          <span className='inline-flex items-center gap-1 px-3 py-1 bg-teal-100 dark:bg-teal-900/30 text-teal-800 dark:text-teal-300 text-sm rounded-full'>
            Médicos: {selectedDoctors.length} seleccionado
            {selectedDoctors.length > 1 ? 's' : ''}
          </span>
        )}

        {selectedOrigins && selectedOrigins.length > 0 && (
          <span className='inline-flex items-center gap-1 px-3 py-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-300 text-sm rounded-full'>
            Procedencia: {selectedOrigins.length} seleccionada
            {selectedOrigins.length > 1 ? 's' : ''}
          </span>
        )}

        {showPdfReadyOnly && (
          <span className='inline-flex items-center gap-1 px-3 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300 text-sm rounded-full'>
            PDF Disponibles
          </span>
        )}

        {citologyPositiveFilter && (
          <span className='inline-flex items-center gap-1 px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 text-sm rounded-full'>
            Citología Positiva
          </span>
        )}

        {citologyNegativeFilter && (
          <span className='inline-flex items-center gap-1 px-3 py-1 bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 text-sm rounded-full'>
            Citología Negativa
          </span>
        )}

        {pendingCasesFilter !== 'all' && (
          <span className='inline-flex items-center gap-1 px-3 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 text-sm rounded-full'>
            Casos:{' '}
            {pendingCasesFilter === 'pagados' ? 'Pagados' : 'Incompletos'}
          </span>
        )}

        {pdfStatusFilter !== 'all' && (
          <span className='inline-flex items-center gap-1 px-3 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300 text-sm rounded-full'>
            PDF: {isSpt 
              ? (pdfStatusFilter === 'faltantes' ? 'Generados' : 'Faltantes')
              : (pdfStatusFilter === 'pendientes' ? 'Pendientes' : 'Faltantes')
            }
          </span>
        )}

        {examTypeFilter !== 'all' && (
          <span className='inline-flex items-center gap-1 px-3 py-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-300 text-sm rounded-full'>
            Tipo: {examTypeFilter}
          </span>
        )}

        {consultaFilter !== 'all' && (
          <span className='inline-flex items-center gap-1 px-3 py-1 bg-violet-100 dark:bg-violet-900/30 text-violet-800 dark:text-violet-300 text-sm rounded-full'>
            Consulta: {consultaFilter}
          </span>
        )}

        {documentStatusFilter !== 'all' && (
          <span className='inline-flex items-center gap-1 px-3 py-1 bg-cyan-100 dark:bg-cyan-900/30 text-cyan-800 dark:text-cyan-300 text-sm rounded-full'>
            Doc:{' '}
            {documentStatusFilter === 'faltante'
              ? 'Faltante'
              : documentStatusFilter === 'pendiente'
              ? 'Pendiente'
              : documentStatusFilter === 'aprobado'
              ? 'Aprobado'
              : 'Rechazado'}
          </span>
        )}

        {emailSentStatusFilter && emailSentStatusFilter !== 'all' && (
          <span className='inline-flex items-center gap-1 px-3 py-1 bg-teal-100 dark:bg-teal-900/30 text-teal-800 dark:text-teal-300 text-sm rounded-full'>
            Caso: {emailSentStatusFilter === 'true' ? 'Enviado' : 'No Enviado'}
          </span>
        )}
      </div>
  );
};

export default ActiveFiltersDisplay;
