import React from 'react'
import { Card } from '@shared/components/ui/card'
import { Stethoscope, Info } from 'lucide-react'

export const DoctorsSection: React.FC = () => {
  return (
		<div>
			<div className="mb-4 sm:mb-6">
				<div>
					<h2 className="text-2xl sm:text-3xl font-bold">Médicos Tratantes</h2>
					<div className="w-16 sm:w-24 h-1 bg-primary mt-2 rounded-full"></div>
				</div>
			</div>
			<div className="grid grid-cols-1 gap-6">
				<Card className="hover:border-primary hover:shadow-lg hover:shadow-primary/20">
					<div className="p-6">
						<div className="flex items-center gap-2 mb-4">
							<Stethoscope className="text-primary size-6" />
							<h2 className="text-xl font-semibold">Información de Médicos</h2>
						</div>

						<div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800 mb-6">
							<div className="flex items-start gap-2">
								<Info className="text-blue-500 size-5 mt-0.5 flex-shrink-0" />
								<div>
									<p className="text-blue-800 dark:text-blue-300 font-medium mb-2">Sección en desarrollo</p>
									<p className="text-blue-700 dark:text-blue-400 text-sm">
										El módulo de gestión de médicos tratantes está actualmente en desarrollo. Próximamente, esta sección
										permitirá:
									</p>
									<ul className="list-disc list-inside mt-2 space-y-1 text-sm text-blue-700 dark:text-blue-400">
										<li>Registrar nuevos médicos tratantes</li>
										<li>Gestionar especialidades médicas</li>
										<li>Ver estadísticas de casos por médico</li>
										<li>Establecer relaciones con centros médicos</li>
									</ul>
								</div>
							</div>
						</div>

						<div className="grid md:grid-cols-2 gap-4 pb-6 border-b border-gray-200 dark:border-gray-700">
							<div className="flex flex-col p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
								<p className="text-gray-500 dark:text-gray-400 text-sm">Total de Médicos Registrados</p>
								<p className="text-2xl font-bold mt-2">--</p>
							</div>

							<div className="flex flex-col p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
								<p className="text-gray-500 dark:text-gray-400 text-sm">Especialidades</p>
								<p className="text-2xl font-bold mt-2">--</p>
							</div>
						</div>

						<div className="text-center py-12 text-gray-500 dark:text-gray-400">
							<Stethoscope className="w-12 h-12 mx-auto mb-4 opacity-50" />
							<p className="text-lg font-medium">No hay datos disponibles</p>
							<p className="text-sm">Esta sección estará disponible próximamente</p>
						</div>
					</div>
				</Card>
			</div>
		</div>
	)
}