import React, { useRef, useState, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@lib/supabase/config'
import { useToast } from '@shared/hooks/use-toast'
import { Loader2 } from 'lucide-react'
import { formatCurrency } from '@shared/utils/number-utils'

interface ImmunoRequest {
	id: string
	case_id: string
	inmunorreacciones: string
	n_reacciones: number
	precio_unitario: number
	total: number
	pagado: boolean
	created_at: string
	updated_at: string
	medical_records_clean?: {
		code: string | null
		patient_id: string | null
		patients?: {
			nombre: string
			cedula: string
		}
	}
}

const ReactionsTable: React.FC = () => {
	const reportRef = useRef<HTMLDivElement>(null)
	const { toast } = useToast()
	const [selectAll, setSelectAll] = useState(false)
	const [editingPrices, setEditingPrices] = useState<Record<string, string>>({})
	const queryClient = useQueryClient()

	// Realtime subscription for immuno_requests
	useEffect(() => {
		const channel = supabase
			.channel('realtime-immuno-requests')
			.on(
				'postgres_changes',
				{
					event: '*',
					schema: 'public',
					table: 'immuno_requests',
				},
				() => {
					// Invalidate and refetch the immuno requests query
					queryClient.invalidateQueries({ queryKey: ['immuno-requests'] })
				},
			)
			.subscribe()

		return () => {
			supabase.removeChannel(channel)
		}
	}, [queryClient])

	// Query to fetch immuno requests
	const {
		data: immunoRequests,
		isLoading,
		error,
		refetch,
	} = useQuery({
		queryKey: ['immuno-requests'],
		queryFn: async () => {
			try {
				const { data, error } = await supabase
					.from('immuno_requests')
					.select(
						`
						*,
						medical_records_clean!inner(
							code,
							patient_id,
							patients!inner(
								nombre,
								cedula
							)
						)
					`,
					)
					.order('created_at', { ascending: false })

				if (error) {
					console.error('Error fetching immuno requests:', error)
					throw error
				}

				console.log('✅ Immuno requests loaded:', data?.length || 0)
				return (data || []) as ImmunoRequest[]
			} catch (error) {
				console.error('Error in immuno requests query:', error)
				throw error
			}
		},
		staleTime: 1000 * 60 * 5, // 5 minutes
	})

	const handlePaymentToggle = async (requestId: string, currentStatus: boolean) => {
		try {
			const { error } = await supabase.from('immuno_requests').update({ pagado: !currentStatus }).eq('id', requestId)

			if (error) {
				throw error
			}

			// Refetch data to update UI
			refetch()

			toast({
				title: !currentStatus ? '✅ Marcado como pagado' : '⏳ Marcado como pendiente',
				description: `El estado de pago ha sido actualizado.`,
				className: !currentStatus
					? 'bg-green-100 border-green-400 text-green-800'
					: 'bg-orange-100 border-orange-400 text-orange-800',
			})
		} catch (error) {
			console.error('Error updating payment status:', error)
			toast({
				title: '❌ Error al actualizar',
				description: 'Hubo un problema al actualizar el estado de pago.',
				variant: 'destructive',
			})
		}
	}

	const handleSelectAll = () => {
		// This would require updating all records at once
		// For now, we'll just toggle the selectAll state for UI purposes
		setSelectAll(!selectAll)
	}

	const handlePriceChange = async (requestId: string, newPrice: string) => {
		const price = parseFloat(newPrice)
		if (isNaN(price) || price <= 0) {
			toast({
				title: '❌ Precio inválido',
				description: 'El precio debe ser un número mayor a 0.',
				variant: 'destructive',
			})
			return
		}

		try {
			// Find the request to get n_reacciones
			const request = immunoRequests?.find((r) => r.id === requestId)
			if (!request) return

			const newTotal = request.n_reacciones * price

			const { error } = await supabase
				.from('immuno_requests')
				.update({
					precio_unitario: price,
					total: newTotal,
				})
				.eq('id', requestId)

			if (error) {
				throw error
			}

			// Clear editing state
			setEditingPrices((prev) => {
				const newState = { ...prev }
				delete newState[requestId]
				return newState
			})

			// Refetch data to update UI
			refetch()

			toast({
				title: '✅ Precio actualizado',
				description: `El precio unitario ha sido actualizado a $${price.toFixed(2)}.`,
				className: 'bg-green-100 border-green-400 text-green-800',
			})
		} catch (error) {
			console.error('Error updating price:', error)
			toast({
				title: '❌ Error al actualizar precio',
				description: 'Hubo un problema al actualizar el precio.',
				variant: 'destructive',
			})
		}
	}

	const startEditingPrice = (requestId: string, currentPrice: number) => {
		setEditingPrices((prev) => ({
			...prev,
			[requestId]: currentPrice.toString(),
		}))
	}

	const cancelEditingPrice = (requestId: string) => {
		setEditingPrices((prev) => {
			const newState = { ...prev }
			delete newState[requestId]
			return newState
		})
	}

	if (isLoading) {
		return (
			<div className="p-3 sm:p-6 overflow-x-hidden max-w-full" ref={reportRef}>
				<div className="flex items-center justify-center py-12">
					<div className="flex items-center gap-3">
						<Loader2 className="w-6 h-6 animate-spin text-primary" />
						<span className="text-lg">Cargando solicitudes de inmunorreacciones...</span>
					</div>
				</div>
			</div>
		)
	}

	if (error) {
		return (
			<div className="p-3 sm:p-6 overflow-x-hidden max-w-full" ref={reportRef}>
				<div className="text-center py-12">
					<div className="text-red-500 dark:text-red-400">
						<p className="text-lg font-medium">Error al cargar las solicitudes</p>
						<p className="text-sm mt-2">Verifica tu conexión a internet o contacta al administrador</p>
						<button
							onClick={() => refetch()}
							className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-none"
						>
							Reintentar
						</button>
					</div>
				</div>
			</div>
		)
	}

	return (
		<div className="p-3 sm:p-6 overflow-x-hidden max-w-full" ref={reportRef}>
			<div className="mb-4">
				<h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">Solicitudes de Inmunorreacciones</h2>
				<p className="text-sm text-gray-600 dark:text-gray-400">
					Gestiona las solicitudes de inmunorreacciones y su estado de pago
				</p>
			</div>

			<table className="w-full border-collapse rounded-lg overflow-hidden shadow-sm bg-background">
				{/* Encabezado */}
				<thead className="bg-card">
					<tr className="text-gray-700 dark:text-gray-300 text-sm">
						<th className="py-3 px-4 text-center border-b border-gray-200 dark:border-gray-700 w-12">
							<div className="flex justify-center items-center">
								<input
									type="checkbox"
									checked={selectAll}
									onChange={handleSelectAll}
									className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded dark:bg-gray-700 dark:border-gray-600 cursor-pointer"
								/>
							</div>
						</th>
						<th className="py-3 px-4 text-center border-b border-gray-200 dark:border-gray-700">Nº DE CASO</th>
						<th className="py-3 px-4 text-center border-b border-gray-200 dark:border-gray-700 w-[60%]">
							INMUNORREACCIONES
						</th>
						<th className="py-3 px-4 text-center border-b border-gray-200 dark:border-gray-700">Nº DE REACCIONES</th>
						<th className="py-3 px-4 text-center border-b border-gray-200 dark:border-gray-700">PRECIO UNITARIO</th>
						<th className="py-3 px-4 text-center border-b border-gray-200 dark:border-gray-700">TOTAL EN DIVISAS</th>
					</tr>
				</thead>

				{/* Cuerpo */}
				<tbody className="divide-y divide-gray-200 dark:divide-gray-800">
					{immunoRequests && immunoRequests.length > 0 ? (
						immunoRequests.map((request) => {
							const caseCode = request.medical_records_clean?.code || request.case_id.slice(-6).toUpperCase()
							const isEditingPrice = editingPrices[request.id] !== undefined

							return (
								<tr
									key={request.id}
									className={`hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-none ${
										request.pagado ? 'bg-green-50/50 dark:bg-green-900/20' : ''
									}`}
								>
									<td className="py-3 px-4 text-center">
										<div className="flex justify-center items-center">
											<input
												type="checkbox"
												checked={request.pagado}
												onChange={() => handlePaymentToggle(request.id, request.pagado)}
												className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded dark:bg-gray-700 dark:border-gray-600 cursor-pointer"
											/>
										</div>
									</td>
									<td className="py-3 px-4 text-center text-gray-800 dark:text-gray-200">{caseCode}</td>
									<td className="py-3 px-4 text-center text-gray-700 dark:text-gray-300">
										{request.inmunorreacciones}
									</td>
									<td className="py-3 px-4 text-center text-gray-700 dark:text-gray-300">{request.n_reacciones}</td>
									<td className="py-3 px-4 text-center text-gray-700 dark:text-gray-300">
										{isEditingPrice ? (
											<div className="flex items-center justify-center gap-2">
												<input
													type="number"
													step="0.01"
													min="0"
													value={editingPrices[request.id]}
													onChange={(e) =>
														setEditingPrices((prev) => ({
															...prev,
															[request.id]: e.target.value,
														}))
													}
													className="w-20 px-2 py-1 text-center border border-gray-300 rounded text-sm"
													onKeyDown={(e) => {
														if (e.key === 'Enter') {
															handlePriceChange(request.id, editingPrices[request.id])
														} else if (e.key === 'Escape') {
															cancelEditingPrice(request.id)
														}
													}}
													autoFocus
												/>
												<button
													onClick={() => handlePriceChange(request.id, editingPrices[request.id])}
													className="text-green-600 hover:text-green-800 text-xs"
												>
													✓
												</button>
												<button
													onClick={() => cancelEditingPrice(request.id)}
													className="text-red-600 hover:text-red-800 text-xs"
												>
													✕
												</button>
											</div>
										) : (
											<button
												onClick={() => startEditingPrice(request.id, request.precio_unitario)}
												className="text-blue-600 hover:text-blue-800 hover:underline"
											>
												{formatCurrency(request.precio_unitario)}
											</button>
										)}
									</td>
									<td
										className={`py-3 px-4 text-center font-medium ${
											request.pagado
												? 'text-green-800 dark:text-green-300 line-through'
												: 'text-green-600 dark:text-green-400'
										}`}
									>
										{formatCurrency(request.total)}
									</td>
								</tr>
							)
						})
					) : (
						<tr>
							<td colSpan={6} className="py-8 text-center text-gray-500 dark:text-gray-400">
								<p className="text-lg font-medium">No hay solicitudes de inmunorreacciones</p>
								<p className="text-sm">Las solicitudes aparecerán aquí cuando los médicos las generen</p>
							</td>
						</tr>
					)}
				</tbody>

				{/* Pie de tabla */}
				<tfoot className="bg-card">
					<tr>
						<td colSpan={5} className="py-3 px-4 text-left font-medium text-gray-900 dark:text-gray-200">
							Total
						</td>
						<td className="py-3 px-4 text-center font-bold text-green-700 dark:text-green-300">
							{immunoRequests ? (
								<>
									{immunoRequests.every((r) => r.pagado) ? (
										<span className="line-through">
											${immunoRequests.reduce((sum, r) => sum + r.total, 0).toFixed(2)}
										</span>
									) : (
										`$${immunoRequests.reduce((sum, r) => sum + r.total, 0).toFixed(2)}`
									)}
								</>
							) : (
								'$0.00'
							)}
						</td>
					</tr>
				</tfoot>
			</table>

			{/* Estado de pagos */}
			<div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
				{immunoRequests ? (
					<>
						{immunoRequests.filter((r) => r.pagado).length} de {immunoRequests.length} pagos pagados
					</>
				) : (
					'0 de 0 pagos pagados'
				)}
			</div>
		</div>
	)
}

export default ReactionsTable
