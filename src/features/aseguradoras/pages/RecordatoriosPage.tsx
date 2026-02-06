import React, { useMemo, useState, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card } from '@shared/components/ui/card'
import { Button } from '@shared/components/ui/button'
import { Download, Search, ChevronLeft, ChevronRight } from 'lucide-react'
import { exportRowsToExcel } from '@shared/utils/exportToExcel'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@shared/components/ui/select'
import { Input } from '@shared/components/ui/input'
import { getPolizas } from '@services/supabase/aseguradoras/polizas-service'

const daysBetween = (dateStr: string | null) => {
	if (!dateStr) return null
	const today = new Date()
	const date = new Date(dateStr)
	const diff = date.getTime() - today.getTime()
	return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

const RecordatoriosPage = () => {
	const [searchTerm, setSearchTerm] = useState('')
	const [currentPage, setCurrentPage] = useState(1)
	const [itemsPerPage, setItemsPerPage] = useState(16)
	const { data, isLoading, error } = useQuery({
		queryKey: ['polizas-recordatorios'],
		queryFn: () => getPolizas(1, 200),
		staleTime: 1000 * 60 * 5,
	})

	const polizas = useMemo(() => data?.data ?? [], [data])
	const filteredPolizas = useMemo(() => {
		if (!searchTerm.trim()) return polizas
		const q = searchTerm.trim().toLowerCase()
		return polizas.filter((row) =>
			[
				row.numero_poliza,
				row.asegurado?.full_name,
				row.asegurado?.document_id,
			]
				.filter(Boolean)
				.some((value) => String(value).toLowerCase().includes(q)),
		)
	}, [polizas, searchTerm])
	const totalPages = Math.max(1, Math.ceil(filteredPolizas.length / itemsPerPage))
	const pageData = useMemo(() => {
		const from = (currentPage - 1) * itemsPerPage
		return filteredPolizas.slice(from, from + itemsPerPage)
	}, [filteredPolizas, currentPage, itemsPerPage])

	const handleSearch = useCallback((value: string) => {
		setSearchTerm(value)
		setCurrentPage(1)
	}, [])

	const handlePageChange = useCallback((page: number) => {
		setCurrentPage(page)
	}, [])

	const handleItemsPerPage = useCallback((value: string) => {
		const parsed = Number(value)
		if (!Number.isNaN(parsed)) {
			setItemsPerPage(parsed)
			setCurrentPage(1)
		}
	}, [])

	return (
		<div>
			<div className="mb-4 sm:mb-6 flex items-center justify-between gap-3">
				<div>
					<h1 className="text-2xl sm:text-3xl font-bold">Recordatorios</h1>
					<div className="w-16 sm:w-24 h-1 bg-primary mt-2 rounded-full" />
				</div>
				<Button
					variant="outline"
					onClick={() =>
						exportRowsToExcel(
							'vencimientos_polizas',
							polizas.map((row) => ({
								'Número póliza': row.numero_poliza,
								Asegurado: row.asegurado?.full_name || '',
								'Fecha próximo vencimiento': row.fecha_prox_vencimiento || row.fecha_vencimiento,
								'Días restantes': daysBetween(row.fecha_prox_vencimiento || row.fecha_vencimiento) ?? '',
								'Alert_30': row.alert_30_enviada ? 'Sí' : 'No',
								'Alert_14': row.alert_14_enviada ? 'Sí' : 'No',
								'Alert_7': row.alert_7_enviada ? 'Sí' : 'No',
								'Alert_Día': row.alert_dia_enviada ? 'Sí' : 'No',
								'Alert_Post': row.alert_post_enviada ? 'Sí' : 'No',
							})),
						)
					}
					className="gap-2"
				>
					<Download className="w-4 h-4" />
					Exportar
				</Button>
			</div>

			<Card className="overflow-hidden">
				<div className="bg-white dark:bg-black/80 backdrop-blur-[10px] border-b border-gray-200 dark:border-gray-700 px-4 py-3">
					<div className="flex flex-col lg:flex-row lg:items-center gap-3">
						<div className="relative flex-1">
							<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
							<Input
								className="pl-9"
								placeholder="Buscar por póliza o asegurado"
								value={searchTerm}
								onChange={(e) => handleSearch(e.target.value)}
							/>
						</div>
						<div className="flex items-center gap-2 text-sm text-gray-500">
							<span>Filas:</span>
							<Select value={String(itemsPerPage)} onValueChange={handleItemsPerPage}>
								<SelectTrigger className="w-20">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="8">8</SelectItem>
									<SelectItem value="16">16</SelectItem>
									<SelectItem value="32">32</SelectItem>
								</SelectContent>
							</Select>
						</div>
					</div>
				</div>

				<div className="p-4 min-h-[320px]">
					{isLoading && <p className="text-sm text-gray-500">Cargando pólizas...</p>}
					{error && <p className="text-sm text-red-500">Error al cargar pólizas</p>}
					{!isLoading && !error && filteredPolizas.length === 0 && (
						<p className="text-sm text-gray-500">No hay pólizas registradas.</p>
					)}
					<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
						{pageData.map((row) => {
							const days = daysBetween(row.fecha_prox_vencimiento || row.fecha_vencimiento)
							return (
								<Card key={row.id} className="p-3 flex flex-col gap-2">
									<div>
										<p className="font-medium">
											{row.numero_poliza} · {row.asegurado?.full_name || 'Asegurado'}
										</p>
										<p className="text-sm text-gray-600 dark:text-gray-400">
											Vence: {row.fecha_prox_vencimiento || row.fecha_vencimiento} · {days ?? '-'} días
										</p>
										<p className="text-xs text-gray-500">
											30({row.alert_30_enviada ? 'Sí' : 'No'}) · 14({row.alert_14_enviada ? 'Sí' : 'No'}) ·
											7({row.alert_7_enviada ? 'Sí' : 'No'}) · D({row.alert_dia_enviada ? 'Sí' : 'No'}) ·
											Post({row.alert_post_enviada ? 'Sí' : 'No'})
										</p>
									</div>
								</Card>
							)
						})}
					</div>
				</div>

				<div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-gray-700">
					<div className="text-sm text-gray-600 dark:text-gray-400">
						Página {currentPage} de {totalPages}
					</div>
					<div className="flex gap-2">
						<Button
							variant="outline"
							size="sm"
							disabled={currentPage <= 1}
							onClick={() => handlePageChange(currentPage - 1)}
						>
							<ChevronLeft className="w-4 h-4" />
						</Button>
						<Button
							variant="outline"
							size="sm"
							disabled={currentPage >= totalPages}
							onClick={() => handlePageChange(currentPage + 1)}
						>
							<ChevronRight className="w-4 h-4" />
						</Button>
					</div>
				</div>
			</Card>
		</div>
	)
}

export default RecordatoriosPage
