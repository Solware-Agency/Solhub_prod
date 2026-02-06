import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { useBodyScrollLock } from '@shared/hooks/useBodyScrollLock';
import type { WaitingRoomCase } from '@/services/supabase/waiting-room/waiting-room-service';
import { X } from 'lucide-react';

export type WaitingRoomStatCardType =
  | 'total'
  | 'pendiente_triaje'
  | 'esperando_consulta'
  | 'tiempo_triaje'
  | 'tiempo_consulta';

function formatWaitingTime(minutes: number): string {
  if (minutes < 1) return '< 1 min';
  if (minutes < 60) return `${Math.round(minutes)} min`;
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return m > 0 ? `${h} h ${m} min` : `${h} h`;
}

function getMinutesInRoom(c: WaitingRoomCase): number {
  return (Date.now() - new Date(c.created_at).getTime()) / (1000 * 60);
}

function getDistribution(cases: WaitingRoomCase[]): { label: string; count: number }[] {
  const buckets = [0, 15, 30, 60, Infinity];
  const counts = [0, 0, 0, 0];
  cases.forEach((c) => {
    const min = getMinutesInRoom(c);
    for (let i = 0; i < buckets.length - 1; i++) {
      if (min >= buckets[i] && min < buckets[i + 1]) {
        counts[i]++;
        break;
      }
    }
    if (min >= 60) counts[3]++;
  });
  return [
    { label: '< 15 min', count: counts[0] },
    { label: '15-30 min', count: counts[1] },
    { label: '30-60 min', count: counts[2] },
    { label: '> 60 min', count: counts[3] },
  ];
}

function getAverageMinutes(cases: WaitingRoomCase[]): number | null {
  if (cases.length === 0) return null;
  const sum = cases.reduce((acc, c) => acc + getMinutesInRoom(c), 0);
  return sum / cases.length;
}

function getMinMinutes(cases: WaitingRoomCase[]): number | null {
  if (cases.length === 0) return null;
  return Math.min(...cases.map(getMinutesInRoom));
}
function getMaxMinutes(cases: WaitingRoomCase[]): number | null {
  if (cases.length === 0) return null;
  return Math.max(...cases.map(getMinutesInRoom));
}

interface WaitingRoomStatDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  cardType: WaitingRoomStatCardType | null;
  stats: { total: number; pendiente_triaje: number; esperando_consulta: number } | null;
  cases: WaitingRoomCase[];
  pendienteTriaje: WaitingRoomCase[];
  esperandoConsulta: WaitingRoomCase[];
}

/** Panel lateral que entra desde la derecha (igual que StatDetailPanel en Stats). */
export const WaitingRoomStatDetailModal: React.FC<WaitingRoomStatDetailModalProps> = ({
  isOpen,
  onClose,
  cardType,
  stats,
  cases,
  pendienteTriaje,
  esperandoConsulta,
}) => {
  useBodyScrollLock(isOpen);

  // Bloquear el scroll del main content (Layout: el scroll está en un div con data-main-scroll, no en body)
  useEffect(() => {
    if (!isOpen) return;
    const el = document.querySelector<HTMLElement>('[data-main-scroll]');
    if (!el) return;
    const scrollTop = el.scrollTop;
    el.style.overflow = 'hidden';
    el.style.touchAction = 'none'; // evita scroll por gestos en móvil
    return () => {
      const target = document.querySelector<HTMLElement>('[data-main-scroll]');
      if (target) {
        target.style.overflow = '';
        target.style.touchAction = '';
        target.scrollTop = scrollTop;
      }
    };
  }, [isOpen]);

  const byBranch = React.useMemo(() => {
    const map = new Map<string, number>();
    cases.forEach((c) => {
      const b = c.branch || 'Sin sede';
      map.set(b, (map.get(b) || 0) + 1);
    });
    return Array.from(map.entries()).map(([branch, count]) => ({ branch, count }));
  }, [cases]);

  const avgTriaje = getAverageMinutes(pendienteTriaje);
  const avgConsulta = getAverageMinutes(esperandoConsulta);
  const minTriaje = getMinMinutes(pendienteTriaje);
  const maxTriaje = getMaxMinutes(pendienteTriaje);
  const minConsulta = getMinMinutes(esperandoConsulta);
  const maxConsulta = getMaxMinutes(esperandoConsulta);
  const distTriaje = getDistribution(pendienteTriaje);
  const distConsulta = getDistribution(esperandoConsulta);

  const titleMap: Record<WaitingRoomStatCardType, string> = {
    total: 'Total en sala',
    pendiente_triaje: 'Pendiente de triaje',
    esperando_consulta: 'Esperando consulta',
    tiempo_triaje: 'Tiempos en triaje',
    tiempo_consulta: 'Tiempos esperando consulta',
  };

  const sectionClass = 'bg-white/60 dark:bg-background/30 backdrop-blur-[5px] rounded-lg p-6 border border-input';
  const sectionTitleClass = 'text-xl font-bold mb-4 text-gray-900 dark:text-gray-100';
  const tableHeaderClass = 'bg-background border-b border-gray-200 dark:border-gray-700 sticky top-0 z-[1]';
  const tableRowClass = 'border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50';

  const renderContent = () => {
    switch (cardType) {
      case 'total': {
        return (
          <div className="space-y-6">
            <div className={sectionClass}>
              <h3 className={sectionTitleClass}>Resumen por estado</h3>
              <div className="flex flex-wrap gap-3">
                <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg border border-red-200 dark:border-red-800">
                  <p className="text-sm text-gray-500 dark:text-gray-400">En triaje</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stats?.pendiente_triaje ?? 0}</p>
                </div>
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                  <p className="text-sm text-gray-500 dark:text-gray-400">Esperando consulta</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stats?.esperando_consulta ?? 0}</p>
                </div>
              </div>
            </div>
            {byBranch.length > 0 && (
              <div className={sectionClass}>
                <h3 className={sectionTitleClass}>Por sede</h3>
                <div className="space-y-4">
                  {byBranch.map(({ branch, count }, index) => {
                    const colors = ['bg-blue-500', 'bg-green-500', 'bg-orange-500', 'bg-red-500', 'bg-purple-500'];
                    return (
                      <div key={branch} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 ${colors[index % colors.length]} rounded-full`} />
                          <span className="text-sm text-gray-600 dark:text-gray-400">{branch}</span>
                        </div>
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            <div className={sectionClass}>
              <h3 className={sectionTitleClass}>Casos recientes (hasta 15)</h3>
              <div className="max-h-64 overflow-y-auto rounded-lg border border-gray-200 dark:border-gray-700">
                <table className="w-full">
                  <thead className={tableHeaderClass}>
                    <tr>
                      <th className="text-left p-3 text-sm font-semibold text-gray-700 dark:text-gray-300">Código</th>
                      <th className="text-left p-3 text-sm font-semibold text-gray-700 dark:text-gray-300">Paciente</th>
                      <th className="text-left p-3 text-sm font-semibold text-gray-700 dark:text-gray-300">Sede</th>
                      <th className="text-left p-3 text-sm font-semibold text-gray-700 dark:text-gray-300">Estado</th>
                      <th className="text-right p-3 text-sm font-semibold text-gray-700 dark:text-gray-300">Tiempo en sala</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cases.slice(0, 15).map((c) => (
                      <tr key={c.id} className={tableRowClass}>
                        <td className="p-3 text-sm text-gray-600 dark:text-gray-400">{c.code || '—'}</td>
                        <td className="p-3 text-sm text-gray-900 dark:text-gray-100">{c.nombre}</td>
                        <td className="p-3 text-sm text-gray-600 dark:text-gray-400">{c.branch || '—'}</td>
                        <td className="p-3 text-sm">{c.estado_spt === 'pendiente_triaje' ? 'Triaje' : 'Consulta'}</td>
                        <td className="p-3 text-sm text-right font-medium text-gray-700 dark:text-gray-300">{formatWaitingTime(getMinutesInRoom(c))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {cases.length > 15 && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">Mostrando los 15 más recientes</p>
              )}
            </div>
          </div>
        );
      }

      case 'pendiente_triaje': {
        return (
          <div className="space-y-6">
            <div className={sectionClass}>
              <h3 className={sectionTitleClass}>Métricas</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg border border-red-200 dark:border-red-800">
                  <p className="text-sm text-gray-500 dark:text-gray-400">Cantidad</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{pendienteTriaje.length}</p>
                </div>
                <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-lg border border-amber-200 dark:border-amber-800">
                  <p className="text-sm text-gray-500 dark:text-gray-400">Promedio</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{avgTriaje != null ? formatWaitingTime(avgTriaje) : '—'}</p>
                </div>
                <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-lg border border-orange-200 dark:border-orange-800">
                  <p className="text-sm text-gray-500 dark:text-gray-400">Mayor</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{maxTriaje != null ? formatWaitingTime(maxTriaje) : '—'}</p>
                </div>
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                  <p className="text-sm text-gray-500 dark:text-gray-400">Menor</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{minTriaje != null ? formatWaitingTime(minTriaje) : '—'}</p>
                </div>
              </div>
            </div>
            <div className={sectionClass}>
              <h3 className={sectionTitleClass}>Distribución por tiempo en cola</h3>
              <div className="space-y-4">
                {distTriaje.map(({ label, count }) => (
                  <div key={label} className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">{label}</span>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{count} casos</span>
                  </div>
                ))}
              </div>
            </div>
            <div className={sectionClass}>
              <h3 className={sectionTitleClass}>Listado</h3>
              <div className="max-h-64 overflow-y-auto rounded-lg border border-gray-200 dark:border-gray-700">
                <table className="w-full">
                  <thead className={tableHeaderClass}>
                    <tr>
                      <th className="text-left p-3 text-sm font-semibold text-gray-700 dark:text-gray-300">Código</th>
                      <th className="text-left p-3 text-sm font-semibold text-gray-700 dark:text-gray-300">Paciente</th>
                      <th className="text-right p-3 text-sm font-semibold text-gray-700 dark:text-gray-300">Tiempo en cola</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendienteTriaje.map((c) => (
                      <tr key={c.id} className={tableRowClass}>
                        <td className="p-3 text-sm text-gray-600 dark:text-gray-400">{c.code || '—'}</td>
                        <td className="p-3 text-sm text-gray-900 dark:text-gray-100">{c.nombre}</td>
                        <td className="p-3 text-sm text-right font-medium text-gray-700 dark:text-gray-300">{formatWaitingTime(getMinutesInRoom(c))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );
      }

      case 'esperando_consulta': {
        return (
          <div className="space-y-6">
            <div className={sectionClass}>
              <h3 className={sectionTitleClass}>Métricas</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                  <p className="text-sm text-gray-500 dark:text-gray-400">Cantidad</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{esperandoConsulta.length}</p>
                </div>
                <div className="bg-cyan-50 dark:bg-cyan-900/20 p-4 rounded-lg border border-cyan-200 dark:border-cyan-800">
                  <p className="text-sm text-gray-500 dark:text-gray-400">Promedio</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{avgConsulta != null ? formatWaitingTime(avgConsulta) : '—'}</p>
                </div>
                <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-lg border border-indigo-200 dark:border-indigo-800">
                  <p className="text-sm text-gray-500 dark:text-gray-400">Mayor</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{maxConsulta != null ? formatWaitingTime(maxConsulta) : '—'}</p>
                </div>
                <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
                  <p className="text-sm text-gray-500 dark:text-gray-400">Menor</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{minConsulta != null ? formatWaitingTime(minConsulta) : '—'}</p>
                </div>
              </div>
            </div>
            <div className={sectionClass}>
              <h3 className={sectionTitleClass}>Distribución por tiempo esperando</h3>
              <div className="space-y-4">
                {distConsulta.map(({ label, count }) => (
                  <div key={label} className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">{label}</span>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{count} casos</span>
                  </div>
                ))}
              </div>
            </div>
            <div className={sectionClass}>
              <h3 className={sectionTitleClass}>Listado</h3>
              <div className="max-h-64 overflow-y-auto rounded-lg border border-gray-200 dark:border-gray-700">
                <table className="w-full">
                  <thead className={tableHeaderClass}>
                    <tr>
                      <th className="text-left p-3 text-sm font-semibold text-gray-700 dark:text-gray-300">Código</th>
                      <th className="text-left p-3 text-sm font-semibold text-gray-700 dark:text-gray-300">Paciente</th>
                      <th className="text-right p-3 text-sm font-semibold text-gray-700 dark:text-gray-300">Tiempo esperando</th>
                    </tr>
                  </thead>
                  <tbody>
                    {esperandoConsulta.map((c) => (
                      <tr key={c.id} className={tableRowClass}>
                        <td className="p-3 text-sm text-gray-600 dark:text-gray-400">{c.code || '—'}</td>
                        <td className="p-3 text-sm text-gray-900 dark:text-gray-100">{c.nombre}</td>
                        <td className="p-3 text-sm text-right font-medium text-gray-700 dark:text-gray-300">{formatWaitingTime(getMinutesInRoom(c))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );
      }

      case 'tiempo_triaje': {
        return (
          <div className="space-y-6">
            <div className={sectionClass}>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                Tiempos calculados desde el registro en sala hasta ahora.
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-lg border border-amber-200 dark:border-amber-800">
                  <p className="text-sm text-gray-500 dark:text-gray-400">Mayor</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{maxTriaje != null ? formatWaitingTime(maxTriaje) : '—'}</p>
                </div>
                <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-lg border border-orange-200 dark:border-orange-800">
                  <p className="text-sm text-gray-500 dark:text-gray-400">Promedio</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{avgTriaje != null ? formatWaitingTime(avgTriaje) : '—'}</p>
                </div>
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                  <p className="text-sm text-gray-500 dark:text-gray-400">Menor</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{minTriaje != null ? formatWaitingTime(minTriaje) : '—'}</p>
                </div>
                <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg border border-red-200 dark:border-red-800">
                  <p className="text-sm text-gray-500 dark:text-gray-400">Casos</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{pendienteTriaje.length}</p>
                </div>
              </div>
            </div>
            <div className={sectionClass}>
              <h3 className={sectionTitleClass}>Distribución</h3>
              <div className="space-y-4">
                {distTriaje.map(({ label, count }) => (
                  <div key={label} className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">{label}</span>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{count} casos</span>
                  </div>
                ))}
              </div>
            </div>
            <div className={sectionClass}>
              <h3 className={sectionTitleClass}>Detalle por caso</h3>
              <div className="max-h-64 overflow-y-auto rounded-lg border border-gray-200 dark:border-gray-700">
                <table className="w-full">
                  <thead className={tableHeaderClass}>
                    <tr>
                      <th className="text-left p-3 text-sm font-semibold text-gray-700 dark:text-gray-300">Código</th>
                      <th className="text-left p-3 text-sm font-semibold text-gray-700 dark:text-gray-300">Paciente</th>
                      <th className="text-right p-3 text-sm font-semibold text-gray-700 dark:text-gray-300">Tiempo en triaje</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendienteTriaje.map((c) => (
                      <tr key={c.id} className={tableRowClass}>
                        <td className="p-3 text-sm text-gray-600 dark:text-gray-400">{c.code || '—'}</td>
                        <td className="p-3 text-sm text-gray-900 dark:text-gray-100">{c.nombre}</td>
                        <td className="p-3 text-sm text-right font-medium text-gray-700 dark:text-gray-300">{formatWaitingTime(getMinutesInRoom(c))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );
      }

      case 'tiempo_consulta': {
        return (
          <div className="space-y-6">
            <div className={sectionClass}>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                Tiempos calculados desde el registro en sala hasta ahora.
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                  <p className="text-sm text-gray-500 dark:text-gray-400">Mayor</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{maxConsulta != null ? formatWaitingTime(maxConsulta) : '—'}</p>
                </div>
                <div className="bg-cyan-50 dark:bg-cyan-900/20 p-4 rounded-lg border border-cyan-200 dark:border-cyan-800">
                  <p className="text-sm text-gray-500 dark:text-gray-400">Promedio</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{avgConsulta != null ? formatWaitingTime(avgConsulta) : '—'}</p>
                </div>
                <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
                  <p className="text-sm text-gray-500 dark:text-gray-400">Menor</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{minConsulta != null ? formatWaitingTime(minConsulta) : '—'}</p>
                </div>
                <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-lg border border-indigo-200 dark:border-indigo-800">
                  <p className="text-sm text-gray-500 dark:text-gray-400">Casos</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{esperandoConsulta.length}</p>
                </div>
              </div>
            </div>
            <div className={sectionClass}>
              <h3 className={sectionTitleClass}>Distribución</h3>
              <div className="space-y-4">
                {distConsulta.map(({ label, count }) => (
                  <div key={label} className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">{label}</span>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{count} casos</span>
                  </div>
                ))}
              </div>
            </div>
            <div className={sectionClass}>
              <h3 className={sectionTitleClass}>Detalle por caso</h3>
              <div className="max-h-64 overflow-y-auto rounded-lg border border-gray-200 dark:border-gray-700">
                <table className="w-full">
                  <thead className={tableHeaderClass}>
                    <tr>
                      <th className="text-left p-3 text-sm font-semibold text-gray-700 dark:text-gray-300">Código</th>
                      <th className="text-left p-3 text-sm font-semibold text-gray-700 dark:text-gray-300">Paciente</th>
                      <th className="text-right p-3 text-sm font-semibold text-gray-700 dark:text-gray-300">Tiempo esperando consulta</th>
                    </tr>
                  </thead>
                  <tbody>
                    {esperandoConsulta.map((c) => (
                      <tr key={c.id} className={tableRowClass}>
                        <td className="p-3 text-sm text-gray-600 dark:text-gray-400">{c.code || '—'}</td>
                        <td className="p-3 text-sm text-gray-900 dark:text-gray-100">{c.nombre}</td>
                        <td className="p-3 text-sm text-right font-medium text-gray-700 dark:text-gray-300">{formatWaitingTime(getMinutesInRoom(c))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );
      }

      default:
        return null;
    }
  };

  const modalContent = (
    <AnimatePresence>
      {isOpen && cardType && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 z-[99999998]"
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 h-full w-full sm:w-2/3 lg:w-1/2 xl:w-2/5 bg-white/80 dark:bg-background/50 backdrop-blur-[10px] shadow-2xl z-[99999999] overflow-y-auto rounded-lg border-l border-input flex flex-col"
          >
            <div className="sticky top-0 bg-white/80 dark:bg-background/50 backdrop-blur-[10px] border-b border-input p-3 sm:p-6 z-10">
              <div className="flex items-center justify-between">
                <h2 className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {titleMap[cardType!]}
                </h2>
                <button
                  onClick={onClose}
                  className="p-1.5 sm:p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-none"
                  aria-label="Cerrar"
                >
                  <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                </button>
              </div>
            </div>
            <div className="p-3 sm:p-6 overflow-y-auto flex-1">{renderContent()}</div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
};
