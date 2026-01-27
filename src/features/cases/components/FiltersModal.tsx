import { useLaboratory } from '@/app/providers/LaboratoryContext';
import type { MedicalCaseWithPatient } from '@/services/supabase/cases/medical-cases-service';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { Button } from '@shared/components/ui/button';
import { Calendar as CalendarComponent } from '@shared/components/ui/calendar';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@shared/components/ui/card';
import { CustomDropdown } from '@shared/components/ui/custom-dropdown';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from '@shared/components/ui/dialog';
import {
  Popover as DatePopover,
  PopoverContent as DatePopoverContent,
  PopoverTrigger as DatePopoverTrigger,
} from '@shared/components/ui/popover';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@shared/components/ui/tabs';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Calendar as CalendarIcon,
  CheckCircle,
  Filter,
  MapPin,
  Settings,
  Stethoscope,
  Trash2,
  X,
  XCircle,
} from 'lucide-react';
import React, { useMemo, useState } from 'react';
import type { DateRange } from 'react-day-picker';
import BranchFilterPanel from './BranchFilterPanel';
import DoctorFilterPanel from './DoctorFilterPanel';
import PatientOriginFilterPanel from './PatientOriginFilterPanel';

interface FiltersModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  // Filtros actuales
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
  branchFilter: string[];
  onBranchFilterChange: (value: string[]) => void;
  dateRange: DateRange | undefined;
  onDateRangeChange: (range: DateRange | undefined) => void;
  showPdfReadyOnly: boolean;
  onPdfFilterToggle: () => void;
  selectedDoctors: string[];
  onDoctorFilterChange: (doctors: string[]) => void;
  selectedOrigins?: string[];
  onOriginFilterChange?: (origins: string[]) => void;
  // Filtros de citología
  citologyPositiveFilter: boolean;
  onCitologyPositiveFilterToggle: () => void;
  citologyNegativeFilter: boolean;
  onCitologyNegativeFilterToggle: () => void;
  // Nuevos filtros
  pendingCasesFilter: string;
  onPendingCasesFilterChange: (value: string) => void;
  pdfStatusFilter: string;
  onPdfStatusFilterChange: (value: string) => void;
  examTypeFilter: string;
  onExamTypeFilterChange: (value: string) => void;
  consultaFilter: string;
  onConsultaFilterChange: (value: string) => void;
  documentStatusFilter: string;
  onDocumentStatusFilterChange: (value: string) => void;
  emailSentStatusFilter: string;
  onEmailSentStatusFilterChange: (value: string) => void;
  // Opciones para los dropdowns
  statusOptions: Array<{ value: string; label: string }>;
  branchOptions: Array<{ value: string; label: string }>;
  // Datos para el filtro de doctores
  cases: MedicalCaseWithPatient[];
  // Callbacks
  onApplyFilters: () => void;
  onClearAllFilters: () => void;
}

const FiltersModal: React.FC<FiltersModalProps> = ({
  isOpen,
  onOpenChange,
  statusFilter,
  onStatusFilterChange,
  branchFilter,
  onBranchFilterChange,
  dateRange,
  onDateRangeChange,
  showPdfReadyOnly,
  onPdfFilterToggle,
  selectedDoctors,
  onDoctorFilterChange,
  selectedOrigins,
  onOriginFilterChange,
  citologyPositiveFilter,
  onCitologyPositiveFilterToggle,
  citologyNegativeFilter,
  onCitologyNegativeFilterToggle,
  pendingCasesFilter,
  onPendingCasesFilterChange,
  pdfStatusFilter,
  onPdfStatusFilterChange,
  examTypeFilter,
  onExamTypeFilterChange,
  consultaFilter,
  onConsultaFilterChange,
  documentStatusFilter,
  onDocumentStatusFilterChange,
  emailSentStatusFilter,
  onEmailSentStatusFilterChange,
  statusOptions,
  branchOptions,
  cases,
  onApplyFilters,
  onClearAllFilters,
}) => {
  const { laboratory } = useLaboratory();
  const isSpt = laboratory?.slug === 'spt';

  const [isDateRangeOpen, setIsDateRangeOpen] = useState(false);
  const [showDoctorFilter, setShowDoctorFilter] = useState(false);
  const [showOriginFilter, setShowOriginFilter] = useState(false);
  const [showBranchFilter, setShowBranchFilter] = useState(false);

  // Obtener tipos de examen del laboratorio
  const examTypeOptions = useMemo(() => {
    const examTypes = laboratory?.config?.examTypes || [];
    if (examTypes.length > 0) {
      return examTypes.map((type) => ({
        value: type,
        label: type,
      }));
    }
    // Fallback por defecto
    return [
      { value: 'Biopsia', label: 'Biopsia' },
      { value: 'Citología', label: 'Citología' },
      { value: 'Inmunohistoquímica', label: 'Inmunohistoquímica' },
    ];
  }, [laboratory?.config?.examTypes]);

  // Opciones de consulta (especialidades) para SPT
  const consultaOptions = useMemo(() => {
    return [
      { value: 'Cardiología', label: 'Cardiología' },
      { value: 'Cirujano Cardiovascular', label: 'Cirujano Cardiovascular' },
      { value: 'Dermatología', label: 'Dermatología' },
      { value: 'Endocrinología', label: 'Endocrinología' },
      { value: 'Gastroenterología', label: 'Gastroenterología' },
      { value: 'Ginecología', label: 'Ginecología' },
      { value: 'Medicina Interna', label: 'Medicina Interna' },
      { value: 'Nefrología', label: 'Nefrología' },
      { value: 'Neumonología', label: 'Neumonología' },
      { value: 'Neurología', label: 'Neurología' },
      { value: 'Neurocirugía', label: 'Neurocirugía' },
      { value: 'Otorrinolaringología', label: 'Otorrinolaringología' },
      { value: 'Pediatría', label: 'Pediatría' },
      { value: 'Psicología', label: 'Psicología' },
      { value: 'Traumatología', label: 'Traumatología' },
      { value: 'Urología', label: 'Urología' },
      { value: 'Oftalmología', label: 'Oftalmología' },
      { value: 'Medicina General', label: 'Medicina General' },
      { value: 'Medicina del Dolor', label: 'Medicina del Dolor' },
      { value: 'Radiólogos', label: 'Radiólogos (Radiología)' },
      { value: 'Fisioterapia', label: 'Fisioterapia' },
      { value: 'Psiquiatría', label: 'Psiquiatría' },
      { value: 'Optometría', label: 'Optometría' },
      { value: 'Odontología', label: 'Odontología' },
    ].sort((a, b) => a.label.localeCompare(b.label, 'es'));
  }, []);

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
    emailSentStatusFilter !== 'all';

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button
          variant={hasActiveFilters ? 'default' : 'outline'}
          className='flex items-center gap-2 cursor-pointer'
          title='Filtros avanzados'
        >
          <Filter className='w-4 h-4' />
          <span>Filtros</span>
          {hasActiveFilters && (
            <span className='bg-white dark:bg-gray-800 text-primary text-xs px-2 py-0.5 rounded-full'>
              {[
                statusFilter !== 'all' ? 1 : 0,
                branchFilter.length > 0 ? 1 : 0,
                showPdfReadyOnly ? 1 : 0,
                selectedDoctors.length,
                selectedOrigins ? selectedOrigins.length : 0,
                dateRange?.from || dateRange?.to ? 1 : 0,
                citologyPositiveFilter ? 1 : 0,
                citologyNegativeFilter ? 1 : 0,
                pendingCasesFilter !== 'all' ? 1 : 0,
                pdfStatusFilter !== 'all' ? 1 : 0,
                examTypeFilter !== 'all' ? 1 : 0,
                consultaFilter !== 'all' ? 1 : 0,
                documentStatusFilter !== 'all' ? 1 : 0,
                emailSentStatusFilter !== 'all' ? 1 : 0,
              ].reduce((a, b) => a + b, 0)}
            </span>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent
        className='max-w-[95vw] sm:max-w-4xl max-h-[95vh] h-[95vh] overflow-hidden flex flex-col w-full bg-white/80 dark:bg-background/50 backdrop-blur-[2px] dark:backdrop-blur-[10px]'
      >
        <DialogTitle className="sr-only">Filtros de Casos</DialogTitle>
        <DialogDescription className="sr-only">
          Configure los filtros para buscar casos específicos
        </DialogDescription>
        {/* Botón X para cerrar */}
        <DialogPrimitive.Close className="absolute right-4 top-4 z-50 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground cursor-pointer">
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </DialogPrimitive.Close>
        <Tabs defaultValue='general' className='w-full overflow-x-hidden flex flex-col flex-1 min-h-0'>
          <TabsList className={`grid w-full ${isSpt ? 'grid-cols-1' : 'grid-cols-2'} gap-2 sm:gap-4 mt-4`}>
            <TabsTrigger
              value='general'
              className='flex items-center gap-2 cursor-pointer'
            >
              <Filter className='w-4 h-4' />
              Filtros Generales
            </TabsTrigger>
            {!isSpt && (
              <TabsTrigger
                value='role-specific'
                className='flex items-center gap-2 cursor-pointer'
              >
                <Settings className='w-4 h-4' />
                Filtros por Rol
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value='general' className='space-y-6 mt-6 overflow-x-hidden overflow-y-auto flex-1 pb-4'>
            {/* Status and Document Status Filters */}
            <div className={`grid grid-cols-1 ${isSpt ? '' : 'md:grid-cols-2'} gap-4 w-full`}>
              {!isSpt && (
                <div className='space-y-3'>
                  <CustomDropdown
                    options={statusOptions}
                    value={statusFilter}
                    placeholder='Estado de Pago'
                    onChange={onStatusFilterChange}
                    data-testid='status-filter'
                  />
                </div>
              )}

              {/* Ocultar Estatus de Documento solo para SPT */}
              {!isSpt && (
                <div className='space-y-3'>
                  <CustomDropdown
                    options={[
                      { value: 'faltante', label: 'Faltante' },
                      { value: 'pendiente', label: 'Pendiente' },
                      { value: 'aprobado', label: 'Aprobado' },
                      { value: 'rechazado', label: 'Rechazado' },
                    ]}
                    value={documentStatusFilter}
                    placeholder='Estatus de Documento'
                    onChange={onDocumentStatusFilterChange}
                    data-testid='document-status-filter'
                  />
                </div>
              )}
            </div>

            {/* New Filters Row 1: PDF Status and Date Range */}
            <div className='grid grid-cols-1 md:grid-cols-2 gap-4 w-full'>
              <div className='space-y-3'>
                <CustomDropdown
                  options={
                    isSpt
                      ? [
                        { value: 'faltantes', label: 'PDF Generados' },
                        { value: 'generados', label: 'PDF Faltantes' },
                      ]
                      : [
                        { value: 'pendientes', label: 'PDF Pendientes' },
                        { value: 'faltantes', label: 'PDF Faltantes' },
                      ]
                  }
                  value={pdfStatusFilter}
                  placeholder='Estado de PDF'
                  onChange={onPdfStatusFilterChange}
                  data-testid='pdf-status-filter'
                />
              </div>

              <div className='space-y-3'>
                <DatePopover
                  open={isDateRangeOpen}
                  onOpenChange={setIsDateRangeOpen}
                  modal={false}
                >
                  <DatePopoverTrigger asChild>
                    <Button
                      variant='outline'
                      className='flex items-center gap-2 w-full justify-start font-bold'
                    >
                      <CalendarIcon className='w-4 h-4' />
                      {dateRange?.from && dateRange?.to
                        ? `${format(dateRange.from, 'dd/MM/yyyy', {
                          locale: es,
                        })} - ${format(dateRange.to, 'dd/MM/yyyy', {
                          locale: es,
                        })}`
                        : dateRange?.from
                          ? `Desde ${format(dateRange.from, 'dd/MM/yyyy', {
                            locale: es,
                          })}`
                          : 'Seleccionar rango de fechas'}
                    </Button>
                  </DatePopoverTrigger>
                  <DatePopoverContent
                    className='w-auto p-0 z-[9999]'
                    side='top'
                    align='start'
                    sideOffset={5}
                    avoidCollisions={true}
                    collisionPadding={20}
                    onOpenAutoFocus={(e) => e.preventDefault()}
                    style={{ position: 'fixed' }}
                  >
                    <CalendarComponent
                      mode='range'
                      selected={dateRange}
                      onSelect={(range) => {
                        onDateRangeChange(range);
                        if (range?.from && range?.to) {
                          setIsDateRangeOpen(false);
                        }
                      }}
                      initialFocus
                      locale={es}
                      toDate={new Date()}
                      disabled={{ after: new Date() }}
                      numberOfMonths={1}
                      className='scale-90'
                    />
                  </DatePopoverContent>
                </DatePopover>
              </div>
            </div>

            {/* New Filters Row 2: Exam Type and Consulta/Email Status */}
            <div className='grid grid-cols-1 md:grid-cols-2 gap-4 w-full'>
              <div className='space-y-3'>
                <CustomDropdown
                  options={examTypeOptions}
                  value={examTypeFilter}
                  placeholder='Tipo de Examen'
                  onChange={onExamTypeFilterChange}
                  data-testid='exam-type-filter'
                />
              </div>

              {isSpt ? (
                <div className='space-y-3'>
                  <CustomDropdown
                    options={consultaOptions}
                    value={consultaFilter}
                    placeholder='Tipo de Consulta'
                    onChange={onConsultaFilterChange}
                    data-testid='consulta-filter'
                  />
                </div>
              ) : (
                <div className='space-y-3'>
                  <CustomDropdown
                    options={[
                      { value: 'true', label: 'Enviado' },
                      { value: 'false', label: 'No Enviado' },
                    ]}
                    value={emailSentStatusFilter}
                    placeholder='Estatus de Email'
                    onChange={onEmailSentStatusFilterChange}
                    data-testid='email-sent-status-filter'
                  />
                </div>
              )}
            </div>

            {/* New Filters Row 3: Email Status for SPT */}
            {isSpt && (
              <div className='grid grid-cols-1 md:grid-cols-2 gap-4 w-full'>
                <div className='space-y-3'>
                  <CustomDropdown
                    options={[
                      { value: 'true', label: 'Enviado' },
                      { value: 'false', label: 'No Enviado' },
                    ]}
                    value={emailSentStatusFilter}
                    placeholder='Estatus de Email'
                    onChange={onEmailSentStatusFilterChange}
                    data-testid='email-sent-status-filter'
                  />
                </div>
                <div className='space-y-3'>
                  {/* Espacio vacío para mantener el grid */}
                </div>
              </div>
            )}

            {/* Branch Filter Row - For SPT, includes Doctor Filter */}
            <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 w-full`}>
              <div className='space-y-3'>
                <Button
                  onClick={() => setShowBranchFilter(!showBranchFilter)}
                  variant={showBranchFilter ? 'default' : 'outline'}
                  className='w-full justify-start font-bold'
                >
                  <MapPin className='w-4 h-4 mr-2' />
                  Filtrar por Sede
                </Button>

                {showBranchFilter && (
                  <BranchFilterPanel
                    branches={branchOptions}
                    selectedBranches={branchFilter}
                    onFilterChange={onBranchFilterChange}
                  />
                )}
              </div>

              {/* Doctor Filter - Only for SPT, in same row as Branch */}
              {isSpt && (
                <div className='space-y-3'>
                  <Button
                    onClick={() => setShowDoctorFilter(!showDoctorFilter)}
                    variant={showDoctorFilter ? 'default' : 'outline'}
                    className='w-full justify-start font-bold'
                  >
                    <Stethoscope className='w-4 h-4 mr-2' />
                    Filtrar por Médico
                  </Button>

                  {showDoctorFilter && (
                    <DoctorFilterPanel
                      cases={cases}
                      onFilterChange={onDoctorFilterChange}
                    />
                  )}
                </div>
              )}
            </div>

            {/* Doctor and Origin Filters - Same line - Only for non-SPT */}
            {!isSpt && (
              <div className='grid grid-cols-1 md:grid-cols-2 gap-4 w-full'>
                {/* Doctor Filter */}
                <div className='space-y-3'>
                  <Button
                    onClick={() => setShowDoctorFilter(!showDoctorFilter)}
                    variant={showDoctorFilter ? 'default' : 'outline'}
                    className='w-full justify-start font-bold'
                  >
                    <Stethoscope className='w-4 h-4 mr-2' />
                    Filtrar por Médico
                  </Button>

                  {showDoctorFilter && (
                    <DoctorFilterPanel
                      cases={cases}
                      onFilterChange={onDoctorFilterChange}
                    />
                  )}
                </div>

                {/* Origin Filter - Oculto para SPT */}
                <div className='space-y-3'>
                  <Button
                    onClick={() => setShowOriginFilter(!showOriginFilter)}
                    variant={showOriginFilter ? 'default' : 'outline'}
                    className='w-full justify-start font-bold'
                    disabled={!onOriginFilterChange}
                  >
                    <MapPin className='w-4 h-4 mr-2' />
                    Filtrar por Procedencia
                  </Button>

                  {showOriginFilter && onOriginFilterChange && (
                    <PatientOriginFilterPanel
                      cases={cases}
                      onFilterChange={onOriginFilterChange}
                    />
                  )}
                </div>
              </div>
            )}

            {/* Active Filters Summary */}
            {hasActiveFilters && (
              <div className='space-y-3'>
                <h3 className='text-lg font-medium'>Filtros Activos</h3>
                <div className='flex flex-wrap gap-2'>
                  {statusFilter !== 'all' && (
                    <span className='inline-flex items-center gap-1 px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 text-sm rounded-full'>
                      Estado: {statusFilter}
                      <button
                        onClick={() => onStatusFilterChange('all')}
                        className='ml-1 hover:text-blue-600 dark:hover:text-blue-200'
                      >
                        <X className='w-3 h-3' />
                      </button>
                    </span>
                  )}

                  {branchFilter.length > 0 && (
                    <span className='inline-flex items-center gap-1 px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 text-sm rounded-full'>
                      Sedes: {branchFilter.length} seleccionada{branchFilter.length !== 1 ? 's' : ''}
                      <button
                        onClick={() => onBranchFilterChange([])}
                        className='ml-1 hover:text-green-600 dark:hover:text-green-200'
                      >
                        <X className='w-3 h-3' />
                      </button>
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
                      <button
                        onClick={() => onDateRangeChange(undefined)}
                        className='ml-1 hover:text-purple-600 dark:hover:text-purple-200'
                      >
                        <X className='w-3 h-3' />
                      </button>
                    </span>
                  )}

                  {selectedOrigins && selectedOrigins.length > 0 && (
                    <span className='inline-flex items-center gap-1 px-3 py-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-300 text-sm rounded-full'>
                      Procedencia: {selectedOrigins.length} seleccionada
                      {selectedOrigins.length > 1 ? 's' : ''}
                      <button
                        onClick={() =>
                          onOriginFilterChange && onOriginFilterChange([])
                        }
                        className='ml-1 hover:text-indigo-600 dark:hover:text-indigo-200'
                      >
                        <X className='w-3 h-3' />
                      </button>
                    </span>
                  )}

                  {showPdfReadyOnly && (
                    <span className='inline-flex items-center gap-1 px-3 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300 text-sm rounded-full'>
                      PDF Disponibles
                      <button
                        onClick={onPdfFilterToggle}
                        className='ml-1 hover:text-orange-600 dark:hover:text-orange-200'
                      >
                        <X className='w-3 h-3' />
                      </button>
                    </span>
                  )}

                  {citologyPositiveFilter && (
                    <span className='inline-flex items-center gap-1 px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 text-sm rounded-full'>
                      Citología Positiva
                      <button
                        onClick={onCitologyPositiveFilterToggle}
                        className='ml-1 hover:text-green-600 dark:hover:text-green-200'
                      >
                        <X className='w-3 h-3' />
                      </button>
                    </span>
                  )}

                  {citologyNegativeFilter && (
                    <span className='inline-flex items-center gap-1 px-3 py-1 bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 text-sm rounded-full'>
                      Citología Negativa
                      <button
                        onClick={onCitologyNegativeFilterToggle}
                        className='ml-1 hover:text-red-600 dark:hover:text-red-200'
                      >
                        <X className='w-3 h-3' />
                      </button>
                    </span>
                  )}

                  {pendingCasesFilter !== 'all' && (
                    <span className='inline-flex items-center gap-1 px-3 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 text-sm rounded-full'>
                      Casos:{' '}
                      {pendingCasesFilter === 'pagados'
                        ? 'Pagados'
                        : 'Incompletos'}
                      <button
                        onClick={() => onPendingCasesFilterChange('all')}
                        className='ml-1 hover:text-amber-600 dark:hover:text-amber-200'
                      >
                        <X className='w-3 h-3' />
                      </button>
                    </span>
                  )}

                  {pdfStatusFilter !== 'all' && (
                    <span className='inline-flex items-center gap-1 px-3 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300 text-sm rounded-full'>
                      PDF:{' '}
                      {isSpt
                        ? (pdfStatusFilter === 'faltantes' ? 'Generados' : 'Faltantes')
                        : (pdfStatusFilter === 'pendientes' ? 'Pendientes' : 'Faltantes')
                      }
                      <button
                        onClick={() => onPdfStatusFilterChange('all')}
                        className='ml-1 hover:text-emerald-600 dark:hover:text-emerald-200'
                      >
                        <X className='w-3 h-3' />
                      </button>
                    </span>
                  )}

                  {examTypeFilter !== 'all' && (
                    <span className='inline-flex items-center gap-1 px-3 py-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-300 text-sm rounded-full'>
                      Tipo: {examTypeFilter}
                      <button
                        onClick={() => onExamTypeFilterChange('all')}
                        className='ml-1 hover:text-indigo-600 dark:hover:text-indigo-200'
                      >
                        <X className='w-3 h-3' />
                      </button>
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
                      <button
                        onClick={() => onDocumentStatusFilterChange('all')}
                        className='ml-1 hover:text-cyan-600 dark:hover:text-cyan-200'
                      >
                        <X className='w-3 h-3' />
                      </button>
                    </span>
                  )}

                  {emailSentStatusFilter !== 'all' && (
                    <span className='inline-flex items-center gap-1 px-3 py-1 bg-teal-100 dark:bg-teal-900/30 text-teal-800 dark:text-teal-300 text-sm rounded-full'>
                      Email:{' '}
                      {emailSentStatusFilter === 'true'
                        ? 'Enviado'
                        : 'No Enviado'}
                      <button
                        onClick={() => onEmailSentStatusFilterChange('all')}
                        className='ml-1 hover:text-teal-600 dark:hover:text-teal-200'
                      >
                        <X className='w-3 h-3' />
                      </button>
                    </span>
                  )}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value='role-specific' className='space-y-6 mt-6 overflow-x-hidden overflow-y-auto flex-1 pb-4'>
            <div className='space-y-4 w-full'>
              <div className='grid grid-cols-1 md:grid-cols-2 gap-4 w-full'>
                {/* Filtro Citología Positiva */}
                <Card
                  className={`cursor-pointer transition-all duration-200 hover:shadow-md ${citologyPositiveFilter
                    ? 'ring-2 ring-green-500 bg-green-50 dark:bg-green-900/20'
                    : 'hover:ring-1 hover:ring-green-300'
                    }`}
                  onClick={() => {
                    if (!citologyPositiveFilter) {
                      onCitologyPositiveFilterToggle();
                      // Si el filtro negativo está activo, desactivarlo
                      if (citologyNegativeFilter) {
                        onCitologyNegativeFilterToggle();
                      }
                    }
                  }}
                >
                  <CardHeader className='pb-3'>
                    <CardTitle className='flex items-center gap-2 text-lg'>
                      <CheckCircle
                        className={`w-5 h-5 ${citologyPositiveFilter
                          ? 'text-green-600'
                          : 'text-gray-400'
                          }`}
                      />
                      Citología Positiva
                    </CardTitle>
                    <CardDescription>
                      Filtra casos con resultado positivo en citología
                    </CardDescription>
                  </CardHeader>
                  <CardContent className='pt-0'>
                    <div className='flex items-center justify-between'>
                      <span className='text-sm text-muted-foreground'>
                        {citologyPositiveFilter
                          ? 'Filtro activo'
                          : 'Hacer clic para activar'}
                      </span>
                      {citologyPositiveFilter && (
                        <div className='w-2 h-2 bg-green-500 rounded-full'></div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Filtro Citología Negativa */}
                <Card
                  className={`cursor-pointer transition-all duration-200 hover:shadow-md ${citologyNegativeFilter
                    ? 'ring-2 ring-red-500 bg-red-50 dark:bg-red-900/20'
                    : 'hover:ring-1 hover:ring-red-300'
                    }`}
                  onClick={() => {
                    if (!citologyNegativeFilter) {
                      onCitologyNegativeFilterToggle();
                      // Si el filtro positivo está activo, desactivarlo
                      if (citologyPositiveFilter) {
                        onCitologyPositiveFilterToggle();
                      }
                    }
                  }}
                >
                  <CardHeader className='pb-3'>
                    <CardTitle className='flex items-center gap-2 text-lg'>
                      <XCircle
                        className={`w-5 h-5 ${citologyNegativeFilter
                          ? 'text-red-600'
                          : 'text-gray-400'
                          }`}
                      />
                      Citología Negativa
                    </CardTitle>
                    <CardDescription>
                      Filtra casos con resultado negativo en citología
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className='flex items-center justify-between'>
                      <span className='text-sm text-muted-foreground'>
                        {citologyNegativeFilter
                          ? 'Filtro activo'
                          : 'Hacer clic para activar'}
                      </span>
                      {citologyNegativeFilter && (
                        <div className='w-2 h-2 bg-red-500 rounded-full'></div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Action Buttons - Fixed at bottom */}
        <div className='flex flex-col sm:flex-row justify-between gap-2 sm:gap-0 pt-4 border-t mt-auto w-full bg-background shrink-0'>
          <Button
            onClick={onClearAllFilters}
            variant='outline'
            disabled={!hasActiveFilters}
            className='font-bold'
          >
            <Trash2 className='w-4 h-4 mr-2' />
            Limpiar
          </Button>

          <Button
            onClick={() => {
              onApplyFilters();
              onOpenChange(false);
            }}
            className='px-6 font-bold'
          >
            Aplicar Filtros
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FiltersModal;
