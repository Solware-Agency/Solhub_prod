import React, { useCallback, useState } from 'react'
import { format } from 'date-fns'
import { useQueryClient } from '@tanstack/react-query'
import { SideDetailPanel } from './SideDetailPanel'
import { deactivatePoliza, type Poliza } from '@services/supabase/aseguradoras/polizas-service'
import { useToast } from '@shared/hooks/use-toast'
import { CalendarDays, Edit, FileText, ShieldCheck, Trash2, User } from 'lucide-react'

interface PolizaDetailPanelProps {
	poliza: Poliza | null
	isOpen: boolean
	onClose: () => void
	/** Al hacer clic en el nombre del asegurado (requiere asegurado_id) */
	onAseguradoClick?: (aseguradoId: string) => void
	/** Al hacer clic en el nombre de la compañía (requiere aseguradora_id) */
	onAseguradoraClick?: (aseguradoraId: string) => void
	/** Al hacer clic en Editar póliza (abre modal de edición en el padre) */
	onEditClick?: (poliza: Poliza) => void
}

const formatDate = (value?: string | null) => {
	if (!value) return 'Sin fecha'
	const parsed = new Date(`${value}T00:00:00`)
	return Number.isNaN(parsed.getTime()) ? value : format(parsed, 'dd/MM/yyyy')
}

export const PolizaDetailPanel = ({ poliza, isOpen, onClose, onAseguradoClick, onAseguradoraClick, onEditClick }: PolizaDetailPanelProps) => {
	const queryClient = useQueryClient()
	const { toast } = useToast()
	const [isDeleting, setIsDeleting] = useState(false)

	const handleEliminarPoliza = useCallback(async () => {
		if (!poliza?.id) return
		const confirmar = window.confirm(
			'¿Eliminar esta póliza? Dejará de mostrarse en listados. Los datos se conservan.',
		)
		if (!confirmar) return
		setIsDeleting(true)
		try {
			await deactivatePoliza(poliza.id)
			toast({ title: 'Póliza eliminada', description: 'Ya no aparecerá en la lista de pólizas.' })
			onClose()
			await queryClient.invalidateQueries({ queryKey: ['polizas'] })
			await queryClient.invalidateQueries({ queryKey: ['aseguradoras-stats'] })
			if (poliza.asegurado_id) {
				await queryClient.invalidateQueries({ queryKey: ['polizas-by-asegurado', poliza.asegurado_id] })
			}
			if (poliza.aseguradora_id) {
				await queryClient.invalidateQueries({ queryKey: ['polizas-by-aseguradora', poliza.aseguradora_id] })
			}
		} catch (err) {
			console.error(err)
			toast({
				title: 'Error',
				description: 'No se pudo eliminar la póliza.',
				variant: 'destructive',
			})
		} finally {
			setIsDeleting(false)
		}
	}, [poliza?.id, poliza?.asegurado_id, poliza?.aseguradora_id, onClose, queryClient, toast])

	const InfoSection = useCallback(
		({
			title,
			icon: Icon,
			children,
		}: {
			title: string
			icon: React.ComponentType<{ className?: string }>
			children: React.ReactNode
		}) => (
			<div className="bg-white/60 dark:bg-background/30 backdrop-blur-[5px] rounded-lg p-4 border border-input shadow-sm hover:shadow-md transition-shadow duration-200">
				<div className="flex items-center gap-2 mb-3">
					<Icon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
					<h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
				</div>
				{children}
			</div>
		),
		[],
	)

	if (!poliza) return null

	return (
		<SideDetailPanel
			isOpen={isOpen}
			onClose={onClose}
			title={poliza.numero_poliza}
		>
			<div className="space-y-4">
				<div className="flex flex-wrap items-center gap-2">
					<span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
						{poliza.estatus_poliza}
					</span>
					<span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-300">
						{poliza.estatus_pago || 'Pendiente'}
					</span>
					<span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
						{poliza.modalidad_pago}
					</span>
					{onEditClick && (
						<button
							type="button"
							onClick={() => onEditClick(poliza)}
							title="Editar póliza"
							className="inline-flex items-center justify-center p-1.5 sm:p-2 text-xs font-semibold rounded-md bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-800/40 transition-colors duration-200 cursor-pointer"
							aria-label="Editar póliza"
						>
							<Edit className="w-4 h-4" />
							<span className="ml-1 hidden sm:inline">Editar</span>
						</button>
					)}
					<div className="flex-1 min-w-[2rem]" />
					<button
						type="button"
						onClick={handleEliminarPoliza}
						disabled={isDeleting}
						title="Eliminar póliza"
						className="inline-flex items-center justify-center p-1.5 sm:p-2 text-xs font-semibold rounded-md bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-800/40 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
						aria-label="Eliminar póliza"
					>
						<Trash2 className="w-4 h-4" />
						<span className="ml-1 hidden sm:inline">Eliminar póliza</span>
					</button>
				</div>

				<InfoSection title="Asegurado y compañía" icon={User}>
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
						<div>
							<p className="text-xs text-gray-500">Asegurado</p>
							{onAseguradoClick && poliza.asegurado_id ? (
								<button
									type="button"
									onClick={() => onAseguradoClick(poliza.asegurado_id)}
									className="text-sm font-medium text-primary hover:underline cursor-pointer text-left"
								>
									{poliza.asegurado?.full_name || 'Asegurado'}
								</button>
							) : (
								<p className="text-sm font-medium">{poliza.asegurado?.full_name || 'Asegurado'}</p>
							)}
						</div>
						<div>
							<p className="text-xs text-gray-500">Compañía</p>
							{onAseguradoraClick && poliza.aseguradora_id ? (
								<button
									type="button"
									onClick={() => onAseguradoraClick(poliza.aseguradora_id)}
									className="text-sm font-medium text-primary hover:underline cursor-pointer text-left"
								>
									{poliza.aseguradora?.nombre || 'Aseguradora'}
								</button>
							) : (
								<p className="text-sm font-medium">{poliza.aseguradora?.nombre || 'Aseguradora'}</p>
							)}
						</div>
					</div>
				</InfoSection>

				<InfoSection title="Información de póliza" icon={ShieldCheck}>
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
						<div>
							<p className="text-xs text-gray-500">Ramo</p>
							<p className="text-sm font-medium">{poliza.ramo || 'Sin ramo'}</p>
						</div>
						<div>
							<p className="text-xs text-gray-500">Suma asegurada</p>
							<p className="text-sm font-medium">{poliza.suma_asegurada ?? 'Sin monto'}</p>
						</div>
						<div>
							<p className="text-xs text-gray-500">Agente / Productor</p>
							<p className="text-sm font-medium">{poliza.agente_nombre || 'Sin agente'}</p>
						</div>
					</div>
				</InfoSection>

				<InfoSection title="Fechas" icon={CalendarDays}>
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
						<div>
							<p className="text-xs text-gray-500">Fecha de emisión</p>
							<p className="text-sm font-medium">{formatDate(poliza.fecha_inicio)}</p>
						</div>
						<div>
							<p className="text-xs text-gray-500">Fecha vencimiento</p>
							<p className="text-sm font-medium">{formatDate(poliza.fecha_vencimiento)}</p>
						</div>
						<div>
							<p className="text-xs text-gray-500">Día vencimiento</p>
							<p className="text-sm font-medium">{poliza.dia_vencimiento ?? 'Sin día'}</p>
						</div>
						<div>
							<p className="text-xs text-gray-500">Próximo pago</p>
							<p className="text-sm font-medium">{formatDate(poliza.fecha_prox_vencimiento)}</p>
						</div>
					</div>
				</InfoSection>

				<InfoSection title="Documento póliza" icon={FileText}>
					{poliza.pdf_url ? (
						<a className="text-sm text-primary underline" href={poliza.pdf_url} target="_blank" rel="noreferrer">
							Ver PDF
						</a>
					) : (
						<p className="text-sm font-medium">Sin documento</p>
					)}
				</InfoSection>

				<InfoSection title="Notas" icon={FileText}>
					<p className="text-sm font-medium">{poliza.notas || 'Sin notas'}</p>
				</InfoSection>
			</div>
		</SideDetailPanel>
	)
}
