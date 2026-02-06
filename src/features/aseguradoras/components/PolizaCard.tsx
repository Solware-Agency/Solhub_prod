import React from 'react'
import type { Poliza } from '@services/supabase/aseguradoras/polizas-service'
import { FileText, ShieldCheck, CalendarDays } from 'lucide-react'

interface PolizaCardProps {
	poliza: Poliza
	onClick: () => void
}

const PolizaCard = ({ poliza, onClick }: PolizaCardProps) => {
	return (
		<div
			className="relative bg-white dark:bg-background rounded-lg p-2.5 sm:p-3 border border-gray-200 dark:border-gray-700 hover:border-primary/70 dark:hover:border-primary/60 transition-colors duration-200 cursor-pointer"
			onClick={onClick}
		>
			<div className="flex flex-wrap gap-1.5 mb-1.5 pr-8">
				{poliza.codigo && (
					<span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300">
						{poliza.codigo}
					</span>
				)}
				<span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
					<ShieldCheck className="w-3 h-3" />
					{poliza.estatus_poliza}
				</span>
				<span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-300">
					{poliza.estatus_pago || 'Pendiente'}
				</span>
			</div>

			<div className="grid grid-cols-1 gap-1.5 mb-1.5">
				<div className="flex items-center gap-2">
					<FileText className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
					<div className="min-w-0">
						<p className="font-medium text-gray-900 dark:text-gray-100 text-sm truncate">{poliza.numero_poliza}</p>
					</div>
				</div>
			</div>

			<div className="grid grid-cols-1 gap-1.5 mb-1.5">
				<div>
					<p className="text-xs text-gray-500 dark:text-gray-400">Asegurado</p>
					<p className="text-sm text-gray-900 dark:text-gray-100 truncate">{poliza.asegurado?.full_name || 'Asegurado'}</p>
				</div>
			</div>

			<div className="grid grid-cols-2 gap-1.5 mb-1.5">
				<div>
					<p className="text-xs text-gray-500 dark:text-gray-400">Compañía</p>
					<p className="text-sm text-gray-900 dark:text-gray-100 truncate">{poliza.aseguradora?.nombre || 'Aseguradora'}</p>
				</div>
				<div>
					<p className="text-xs text-gray-500 dark:text-gray-400">Vencimiento</p>
					<p className="text-sm text-gray-900 dark:text-gray-100 truncate flex items-center gap-1">
						<CalendarDays className="w-3 h-3 text-gray-400" />
						{poliza.fecha_vencimiento || 'Sin fecha'}
					</p>
				</div>
			</div>
		</div>
	)
}

export default PolizaCard
