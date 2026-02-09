import React from 'react'
import type { Aseguradora } from '@services/supabase/aseguradoras/aseguradoras-service'
import { Building2, Mail, Phone, IdCard } from 'lucide-react'

interface AseguradoraCardProps {
	aseguradora: Aseguradora
	onClick: () => void
}

const AseguradoraCard = ({ aseguradora, onClick }: AseguradoraCardProps) => {
	return (
		<div
			className="relative bg-white dark:bg-background rounded-lg p-2.5 sm:p-3 border border-gray-200 dark:border-gray-700 hover:border-primary/70 dark:hover:border-primary/60 transition-colors duration-200 cursor-pointer"
			onClick={onClick}
		>
			<div className="flex flex-wrap gap-1.5 mb-1.5 pr-8">
				{aseguradora.codigo && (
					<span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300">
						{aseguradora.codigo}
					</span>
				)}
				<span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
					{aseguradora.activo ? 'Activa' : 'No disponible'}
				</span>
			</div>

			<div className="grid grid-cols-1 gap-1.5 mb-1.5">
				<div className="flex items-center gap-2">
					<Building2 className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
					<div className="min-w-0">
						<p className="font-medium text-gray-900 dark:text-gray-100 text-sm truncate">{aseguradora.nombre}</p>
					</div>
				</div>
			</div>

			<div className="grid grid-cols-2 gap-1.5 mb-1.5">
				<div>
					<p className="text-xs text-gray-500 dark:text-gray-400">Código interno</p>
					<p className="text-sm text-gray-900 dark:text-gray-100 truncate flex items-center gap-1">
						<IdCard className="w-3 h-3 text-gray-400" />
						{aseguradora.codigo_interno || 'Sin código'}
					</p>
				</div>
				<div>
					<p className="text-xs text-gray-500 dark:text-gray-400">Teléfono</p>
					<p className="text-sm text-gray-900 dark:text-gray-100 truncate flex items-center gap-1">
						<Phone className="w-3 h-3 text-gray-400" />
						{aseguradora.telefono || 'Sin teléfono'}
					</p>
				</div>
			</div>

			<div>
				<p className="text-xs text-gray-500 dark:text-gray-400">Email</p>
				<p className="text-sm text-gray-900 dark:text-gray-100 truncate flex items-center gap-1">
					<Mail className="w-3 h-3 text-gray-400" />
					{aseguradora.email || 'Sin email'}
				</p>
			</div>
		</div>
	)
}

export default AseguradoraCard
