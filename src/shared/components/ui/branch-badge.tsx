import { cn } from '@shared/lib/cn'

interface BranchBadgeProps {
	branch: string
	className?: string
}

export function BranchBadge({ branch, className }: BranchBadgeProps) {
	const getBranchColor = (branchName: string) => {
		if (!branchName) {
			return 'bg-gray-200 dark:bg-gray-900/60 text-gray-900 dark:text-gray-100'
		}

		// Normalizar el nombre de la sede para comparación (sin espacios, en minúsculas)
		const normalizedBranch = branchName.trim().toLowerCase()

		// Mapeo de sedes conocidas con sus colores únicos
		// Para Salud para Todos (SPT) - 4 sedes con colores diferentes y distintivos
		const branchColorMap: Record<string, string> = {
			// Códigos cortos (compatibilidad hacia atrás)
			'stx': 'bg-pink-600 text-white',
			'pmg': 'bg-purple-600 text-white',
			'mcy': 'bg-green-500 text-white',
			'cpc': 'bg-yellow-500 text-white',
			'cnx': 'bg-blue-500 text-white',
			
			// Nombres completos de sedes comunes - Colores distintivos para las 4 sedes principales
			'paseo el hatillo': 'bg-blue-600 text-white',        // Azul
			'paseoelhatillo': 'bg-blue-600 text-white',
			'ambulatorio': 'bg-green-600 text-white',            // Verde
			'principal': 'bg-purple-600 text-white',             // Morado
			'centro': 'bg-orange-500 text-white',                // Naranja
			'sucursal': 'bg-indigo-600 text-white',              // Índigo
			'sucursal 1': 'bg-indigo-600 text-white',
			'sucursal 2': 'bg-pink-600 text-white',              // Rosa
			'sucursal 3': 'bg-teal-600 text-white',             // Verde azulado
			'sucursal 4': 'bg-red-600 text-white',              // Rojo
		}

		// Buscar coincidencia exacta primero
		if (branchColorMap[normalizedBranch]) {
			return branchColorMap[normalizedBranch]
		}

		// Si no hay coincidencia exacta, asignar color basado en hash del nombre
		// Esto asegura que cada sede tenga un color consistente y distintivo
		// Los primeros 4 colores son muy diferentes para las sedes principales
		const colors = [
			'bg-blue-600 text-white',      // Azul - Sede 1
			'bg-green-600 text-white',     // Verde - Sede 2
			'bg-purple-600 text-white',    // Morado - Sede 3
			'bg-orange-500 text-white',    // Naranja - Sede 4
			'bg-pink-600 text-white',      // Rosa
			'bg-indigo-600 text-white',    // Índigo
			'bg-teal-600 text-white',      // Verde azulado
			'bg-red-600 text-white',       // Rojo
			'bg-amber-600 text-white',     // Ámbar
			'bg-cyan-600 text-white',     // Cian
		]

		// Generar un hash simple del nombre para asignar color de manera consistente
		let hash = 0
		for (let i = 0; i < normalizedBranch.length; i++) {
			hash = ((hash << 5) - hash) + normalizedBranch.charCodeAt(i)
			hash = hash & hash // Convertir a entero de 32 bits
		}
		
		// Usar el valor absoluto del hash para seleccionar un color
		const colorIndex = Math.abs(hash) % colors.length
		return colors[colorIndex]
	}

	return (
		<div
			className={cn(
				'inline-flex w-fit items-center border border-gray-500/30 dark:border-gray-700/50 rounded-lg px-4 py-1 text-xs font-medium',
				getBranchColor(branch),
				className,
			)}
		>
			{branch}
		</div>
	)
}
