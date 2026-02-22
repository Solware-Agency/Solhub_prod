import React, { useState } from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts'
import { formatCurrency, formatNumber } from '@shared/utils/number-utils'

interface PieChartData {
  branch: string | null;
  revenue: number;
  percentage: number;
}

interface CustomPieChartProps {
  data: PieChartData[];
  total: number;
  isLoading?: boolean;
  /** 'revenue' = mostrar montos; 'cases' = mostrar casos (SPT) */
  valueMode?: 'revenue' | 'cases';
}

// Colores hex alineados con branch-badge.tsx (SPT y laboratorios)
const BRANCH_COLOR_MAP: Record<string, string> = {
  // Códigos cortos
  stx: '#db2777', // Pink
  pmg: '#9333ea', // Purple
  mcy: '#22c55e', // Verde
  cpc: '#eab308', // Yellow
  cnx: '#3b82f6', // Blue
  // Nombres completos SPT y comunes
  'paseo el hatillo': '#2563eb', // Blue
  'paseoelhatillo': '#2563eb',
  ambulatorio: '#16a34a', // Green
  principal: '#9333ea', // Purple
  centro: '#f97316', // Orange
  sucursal: '#4f46e5', // Indigo
  'sucursal 1': '#4f46e5',
  'sucursal 2': '#db2777', // Pink
  'sucursal 3': '#0d9488', // Teal
  'sucursal 4': '#dc2626', // Red
};

const DEFAULT_COLOR = '#6B7280'; // Gris

export const CustomPieChart: React.FC<CustomPieChartProps> = ({
  data,
  total,
  isLoading,
  valueMode = 'revenue',
}) => {
  const formatValue = valueMode === 'cases' ? formatNumber : formatCurrency
  const totalLabel = valueMode === 'cases' ? 'Casos del Mes' : 'Total del Mes'
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // Colores por sede - alineado con branch-badge (normalizar nombre para comparación)
  const getBranchColor = (branchName: string | null | undefined) => {
    if (!branchName) return DEFAULT_COLOR;
    const normalized = branchName.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const exact = BRANCH_COLOR_MAP[normalized];
    if (exact) return exact;
    const byCode = BRANCH_COLOR_MAP[normalized.substring(0, 3)];
    if (byCode) return byCode;
    // Hash para sedes desconocidas - color consistente
    let hash = 0;
    for (let i = 0; i < normalized.length; i++) {
      hash = ((hash << 5) - hash) + normalized.charCodeAt(i);
      hash = hash & hash;
    }
    const colors = ['#2563eb', '#16a34a', '#9333ea', '#f97316', '#db2777', '#4f46e5', '#0d9488', '#dc2626'];
    return colors[Math.abs(hash) % colors.length];
  };

  if (isLoading) {
    return (
      <div className='flex items-center justify-center h-48 sm:h-56'>
        <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-primary'></div>
      </div>
    );
  }

  return (
    <div className='w-full lg:grid grid-cols-2 gap-4 justify-center items-center'>
      {/* Donut Chart */}
      <div className='h-48 sm:h-56 relative'>
        <ResponsiveContainer width='100%' height='100%'>
          <PieChart>
            <Pie
              data={data}
              cx='50%'
              cy='50%'
              labelLine={false}
              label={false} // Sin porcentajes dentro del donut
              outerRadius={70}
              innerRadius={40} // Esto crea el efecto donut
              fill='#8884d8'
              dataKey='percentage'
              strokeWidth={0} // Sin borde blanco
              strokeLinecap='round' // Bordes redondeados
              paddingAngle={0} // Espacio adicional entre segmentos
            >
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={getBranchColor(entry.branch)}
                  className='cursor-pointer'
                  strokeWidth={0}
                  style={{
                    opacity:
                      hoveredIndex === index || hoveredIndex === null ? 1 : 0.6,
                    filter:
                      hoveredIndex === index
                        ? 'drop-shadow(0 4px 8px rgba(0,0,0,0.15))'
                        : 'none',
                    transform:
                      hoveredIndex === index ? 'scale(1.05)' : 'scale(1)',
                    transformOrigin: 'center',
                    transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
                  }}
                  onMouseEnter={() => setHoveredIndex(index)}
                  onMouseLeave={() => setHoveredIndex(null)}
                />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>

        {/* Total en el centro del donut */}
        <div className='absolute inset-0 flex items-center justify-center pointer-events-none'>
          <div className='bg-white/60 dark:bg-background/30 backdrop-blur-[5px] border border-input rounded-full size-24 sm:size-28 flex flex-col items-center justify-center'>
            <p className='text-lg sm:text-xl font-bold text-gray-700 dark:text-gray-300'>
              {formatValue(total)}
            </p>
            <p className='text-xs sm:text-sm text-gray-500 dark:text-gray-400'>
              {totalLabel}
            </p>
          </div>
        </div>
      </div>

      {/* Leyenda personalizada - Estilo original del SVG */}
      <div className='flex flex-col'>
        {data.map((entry, index) => (
          <div
            key={entry.branch || `branch-${index}`}
            className={`flex items-center justify-between transition-all duration-300 cursor-pointer p-2 rounded-lg ${
              hoveredIndex === index ? 'scale-105' : ''
            }`}
            onMouseEnter={() => setHoveredIndex(index)}
            onMouseLeave={() => setHoveredIndex(null)}
          >
            <div className='flex items-center gap-2'>
              <div
                className={`w-3 h-3 rounded-full transition-all duration-300 ${
                  hoveredIndex === index ? 'scale-125' : ''
                }`}
                style={{ backgroundColor: getBranchColor(entry.branch) }}
              />
              <span
                className={`text-sm transition-all duration-300 ${
                  hoveredIndex === index
                    ? 'text-gray-900 dark:text-gray-100 font-medium'
                    : 'text-gray-600 dark:text-gray-400'
                }`}
              >
                {entry.branch || 'Sin Sede'}
              </span>
            </div>
            <span
              className={`text-sm transition-all duration-300 ${
                hoveredIndex === index
                  ? 'text-gray-900 dark:text-gray-100 font-semibold'
                  : 'text-gray-700 dark:text-gray-300 font-medium'
              }`}
            >
              {Math.round(entry.percentage)}% ({formatValue(entry.revenue)})
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
