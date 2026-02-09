import React, { useCallback } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { X, User, FileText, MapPin, Phone, Edit, Send } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import type { Asegurado } from '@services/supabase/aseguradoras/asegurados-service'
import { findAseguradoraById } from '@services/supabase/aseguradoras/aseguradoras-service'
import type { Aseguradora } from '@services/supabase/aseguradoras/aseguradoras-service'
import { getPolizasByAseguradoId, type Poliza } from '@services/supabase/aseguradoras/polizas-service'
import { useBodyScrollLock } from '@shared/hooks/useBodyScrollLock'
import WhatsAppIcon from '@shared/components/icons/WhatsAppIcon'
import PolizaCard from '@features/aseguradoras/components/PolizaCard'
import { PolizaDetailPanel } from '@features/aseguradoras/components/PolizaDetailPanel'
import { AseguradoraHistoryModal } from '@features/aseguradoras/components/AseguradoraHistoryModal'
import { EditAseguradoModal } from '@features/aseguradoras/components/EditAseguradoModal'

interface AseguradoHistoryModalProps {
	isOpen: boolean
	onClose: () => void
	asegurado: Asegurado | null
	/** Tras guardar en el modal de edición, actualizar el asegurado en el padre */
	onAseguradoUpdated?: (updated: Asegurado) => void
}

const InfoSection = ({
	title,
	icon: Icon,
	children,
}: {
	title: string
	icon: React.ComponentType<{ className?: string }>
	children: React.ReactNode
}) => (
	<div className="bg-white/60 dark:bg-background/30 backdrop-blur-[5px] rounded-lg p-4 border border-input shadow-sm">
		<div className="flex items-center gap-2 mb-3">
			<Icon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
			<h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
		</div>
		{children}
	</div>
)

/** Formatea teléfono para enlace WhatsApp: solo dígitos, código país 58 si son 10 dígitos */
const formatPhoneForWhatsApp = (phone: string | null | undefined): string => {
	if (!phone || !phone.trim()) return ''
	const digits = phone.replace(/\D/g, '')
	if (digits.length === 10) return '58' + digits
	if (digits.length === 11 && digits.startsWith('0')) return '58' + digits.slice(1)
	return digits
}

export const AseguradoHistoryModal: React.FC<AseguradoHistoryModalProps> = ({
	isOpen,
	onClose,
	asegurado,
	onAseguradoUpdated,
}) => {
	const [selectedPoliza, setSelectedPoliza] = React.useState<Poliza | null>(null)
	const [polizaPanelOpen, setPolizaPanelOpen] = React.useState(false)
	const [isEditModalOpen, setIsEditModalOpen] = React.useState(false)
	const [aseguradoraHistoryOpen, setAseguradoraHistoryOpen] = React.useState(false)
	const [selectedAseguradoraForHistory, setSelectedAseguradoraForHistory] = React.useState<Aseguradora | null>(null)

	useBodyScrollLock(isOpen)

	const { data: polizas = [], isLoading: loadingPolizas } = useQuery({
		queryKey: ['polizas-by-asegurado', asegurado?.id],
		queryFn: () => (asegurado?.id ? getPolizasByAseguradoId(asegurado.id) : []),
		enabled: isOpen && !!asegurado?.id,
		staleTime: 1000 * 60 * 2,
	})

	const openPolizaDetail = useCallback((poliza: Poliza) => {
		setSelectedPoliza(poliza)
		setPolizaPanelOpen(true)
	}, [])

	const closePolizaDetail = useCallback(() => {
		setPolizaPanelOpen(false)
		setSelectedPoliza(null)
	}, [])

	const handleAseguradoClickFromPoliza = useCallback(
		(_aseguradoId: string) => {
			// Ya estamos en el historial de este asegurado; cerrar el panel de póliza para volver a la vista del asegurado
			closePolizaDetail()
		},
		[closePolizaDetail],
	)

	const handleAseguradoraClickFromPoliza = useCallback(async (aseguradoraId: string) => {
		const a = await findAseguradoraById(aseguradoraId)
		if (a) {
			setSelectedAseguradoraForHistory(a)
			setPolizaPanelOpen(false)
			setAseguradoraHistoryOpen(true)
		}
	}, [])

	const handleWhatsApp = useCallback(() => {
		const raw = asegurado?.phone
		if (!raw?.trim()) return
		const num = formatPhoneForWhatsApp(raw)
		if (!num) return
		window.open(`https://wa.me/${num}`, '_blank', 'noopener,noreferrer')
	}, [asegurado?.phone])

	const handleSendEmail = useCallback(() => {
		const email = asegurado?.email?.trim()
		if (!email) return
		window.location.href = `mailto:${email}`
	}, [asegurado?.email])

	if (!asegurado) return null

	return (
		<AnimatePresence>
			{isOpen && (
				<div className="fixed inset-0 flex items-center justify-center p-4 z-[10000000000000000]">
					<motion.div
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						transition={{ duration: 0.2 }}
						className="fixed inset-0 bg-black/50"
						onClick={onClose}
					/>
					<motion.div
						initial={{ scale: 0.95 }}
						animate={{ scale: 1 }}
						exit={{ scale: 0.95 }}
						transition={{ type: 'spring', damping: 25, stiffness: 200 }}
						className="bg-white/80 dark:bg-background/50 backdrop-blur-[2px] dark:backdrop-blur-[10px] rounded-lg shadow-2xl w-full max-w-4xl h-[90vh] flex flex-col border border-input relative z-10"
						onClick={(e) => e.stopPropagation()}
					>
						{/* Header */}
						<div className="sticky top-0 bg-white/80 dark:bg-background/50 backdrop-blur-[2px] dark:backdrop-blur-[10px] border-b border-input p-4 sm:p-6 z-10 rounded-t-lg">
							<div className="flex items-center justify-between">
								<div>
									<h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">
										Historial del asegurado
									</h2>
								</div>
								<button
									onClick={onClose}
									className="p-1.5 sm:p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-none"
								>
									<X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
								</button>
							</div>
						</div>

						{/* Content */}
						<div className="flex-1 overflow-y-auto flex flex-col">
							{/* Asegurado info - top */}
							<div className="p-4 sm:p-6 flex-shrink-0">
								<div className="flex flex-wrap items-center gap-2 mb-4">
									<span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
										{asegurado.tipo_asegurado === 'Persona natural' ? 'Natural' : 'Jurídica'}
									</span>
									{asegurado.codigo && (
										<span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300">
											{asegurado.codigo}
										</span>
									)}
									<button
										type="button"
										onClick={() => setIsEditModalOpen(true)}
										title="Editar asegurado"
										className="inline-flex items-center justify-center p-1.5 sm:p-2 text-xs font-semibold rounded-md bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-800/40 transition-colors duration-200 cursor-pointer"
										aria-label="Editar asegurado"
									>
										<Edit className="w-4 h-4" />
									</button>
									<button
										type="button"
										onClick={handleWhatsApp}
										disabled={!asegurado.phone?.trim()}
										title="Escribir por WhatsApp"
										className="inline-flex items-center justify-center p-1.5 sm:p-2 text-xs font-semibold rounded-md bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-800/40 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
										aria-label="WhatsApp"
									>
										<WhatsAppIcon className="w-4 h-4" />
									</button>
									<button
										type="button"
										onClick={handleSendEmail}
										disabled={!asegurado.email?.trim()}
										title="Enviar correo"
										className="inline-flex items-center justify-center p-1.5 sm:p-2 text-xs font-semibold rounded-md bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-800/40 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
										aria-label="Enviar correo"
									>
										<Send className="w-4 h-4" />
									</button>
								</div>

								<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
									<InfoSection title="Información del asegurado" icon={User}>
										<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
											<div>
												<p className="text-xs text-gray-500 dark:text-gray-400">Nombre</p>
												<p className="text-sm font-medium text-gray-900 dark:text-gray-100">{asegurado.full_name}</p>
											</div>
											<div>
												<p className="text-xs text-gray-500 dark:text-gray-400">Documento</p>
												<p className="text-sm font-medium text-gray-900 dark:text-gray-100">{asegurado.document_id}</p>
											</div>
										</div>
									</InfoSection>

									<InfoSection title="Contacto" icon={Phone}>
										<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
											<div>
												<p className="text-xs text-gray-500 dark:text-gray-400">Teléfono</p>
												<p className="text-sm font-medium text-gray-900 dark:text-gray-100">{asegurado.phone || 'Sin teléfono'}</p>
											</div>
											<div>
												<p className="text-xs text-gray-500 dark:text-gray-400">Email</p>
												<p className="text-sm font-medium text-gray-900 dark:text-gray-100">{asegurado.email || 'Sin email'}</p>
											</div>
										</div>
									</InfoSection>

									<InfoSection title="Dirección" icon={MapPin}>
										<p className="text-sm font-medium text-gray-900 dark:text-gray-100">{asegurado.address || 'Sin dirección'}</p>
									</InfoSection>

									<InfoSection title="Notas internas" icon={FileText}>
										<p className="text-sm font-medium text-gray-900 dark:text-gray-100">{asegurado.notes || 'Sin notas'}</p>
									</InfoSection>
								</div>
							</div>

							{/* Pólizas - below */}
							<div className="p-4 sm:p-6 pt-0 flex-1 min-h-0">
								<h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
									<FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
									Pólizas
								</h3>
								{loadingPolizas && (
									<p className="text-sm text-gray-500 dark:text-gray-400">Cargando pólizas...</p>
								)}
								{!loadingPolizas && polizas.length === 0 && (
									<p className="text-sm text-gray-500 dark:text-gray-400">No hay pólizas registradas para este asegurado.</p>
								)}
								{!loadingPolizas && polizas.length > 0 && (
									<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
										{polizas.map((poliza) => (
											<PolizaCard
												key={poliza.id}
												poliza={poliza}
												onClick={() => openPolizaDetail(poliza)}
											/>
										))}
									</div>
								)}
							</div>
						</div>
					</motion.div>
				</div>
			)}

			<PolizaDetailPanel
				poliza={selectedPoliza}
				isOpen={polizaPanelOpen}
				onClose={closePolizaDetail}
				onAseguradoClick={handleAseguradoClickFromPoliza}
				onAseguradoraClick={handleAseguradoraClickFromPoliza}
			/>

			<AseguradoraHistoryModal
				isOpen={aseguradoraHistoryOpen}
				onClose={() => setAseguradoraHistoryOpen(false)}
				aseguradora={selectedAseguradoraForHistory}
			/>

			<EditAseguradoModal
				isOpen={isEditModalOpen}
				onClose={() => setIsEditModalOpen(false)}
				asegurado={asegurado}
				onSave={(updated) => {
					onAseguradoUpdated?.(updated)
					setIsEditModalOpen(false)
				}}
			/>
		</AnimatePresence>
	)
}
