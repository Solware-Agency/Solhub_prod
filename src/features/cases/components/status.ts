export const getStatusColor = (status: 'Incompleto' | 'Pagado' | string) => {
	const normalized = (status || '').toString().trim().toLowerCase()
	switch (normalized) {
		case 'pagado':
		case 'completado':
			return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
		case 'incompleto':
			return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
		case 'en proceso':
			return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
		case 'excedido':
			return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
		default:
			// Fallback para valores legacy o inesperados
			return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300'
	}
}

export default getStatusColor
