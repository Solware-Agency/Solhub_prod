import React, { useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { X, Building2, FileText, MapPin, Phone, Edit, Globe, Send } from 'lucide-react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { Aseguradora } from '@services/supabase/aseguradoras/aseguradoras-service'
import { getAseguradosByIds } from '@services/supabase/aseguradoras/asegurados-service'
import type { Asegurado } from '@services/supabase/aseguradoras/asegurados-service'
import { getPolizasByAseguradoraId, type Poliza } from '@services/supabase/aseguradoras/polizas-service'
import { useBodyScrollLock } from '@shared/hooks/useBodyScrollLock'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@shared/components/ui/tabs'
import PolizaCard from '@features/aseguradoras/components/PolizaCard'
import AseguradoCard from '@features/aseguradoras/components/AseguradoCard'
import { PolizaDetailPanel } from '@features/aseguradoras/components/PolizaDetailPanel'
import { AseguradoHistoryModal } from '@features/aseguradoras/components/AseguradoHistoryModal'
import WhatsAppIcon from '@shared/components/icons/WhatsAppIcon'
import { EditAseguradoraModal } from '@features/aseguradoras/components/EditAseguradoraModal'

interface AseguradoraHistoryModalProps {
	isOpen: boolean
	onClose: () => void
	aseguradora: Aseguradora | null
	onAseguradoraUpdated?: (updated: Aseguradora) => void
}

/** Formatea teléfono para enlace WhatsApp: solo dígitos, código país 58 si son 10 dígitos */
const formatPhoneForWhatsApp = (phone: string | null | undefined): string => {
	if (!phone || !phone.trim()) return ''
	const digits = phone.replace(/\D/g, '')
	if (digits.length === 10) return '58' + digits
	if (digits.length === 11 && digits.startsWith('0')) return '58' + digits.slice(1)
	return digits
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

export const AseguradoraHistoryModal: React.FC<AseguradoraHistoryModalProps> = ({
	isOpen,
	onClose,
	aseguradora,
	onAseguradoraUpdated,
}) => {
	const [selectedPoliza, setSelectedPoliza] = React.useState<Poliza | null>(null)
	const [polizaPanelOpen, setPolizaPanelOpen] = React.useState(false)
	const [isEditModalOpen, setIsEditModalOpen] = React.useState(false)
	const [selectedAsegurado, setSelectedAsegurado] = React.useState<Asegurado | null>(null)
	const [aseguradoHistoryOpen, setAseguradoHistoryOpen] = React.useState(false)
	const queryClient = useQueryClient()

	useBodyScrollLock(isOpen)

	const { data: polizas = [], isLoading: loadingPolizas } = useQuery({
		queryKey: ['polizas-by-aseguradora', aseguradora?.id],
		queryFn: () => (aseguradora?.id ? getPolizasByAseguradoraId(aseguradora.id) : []),
		enabled: isOpen && !!aseguradora?.id,
		staleTime: 1000 * 60 * 2,
	})

	const uniqueAseguradoIds = useMemo(() => {
		const ids = new Set<string>()
		polizas.forEach((p) => {
			if (p.asegurado?.id) ids.add(p.asegurado.id)
		})
		return Array.from(ids)
	}, [polizas])

	const { data: aseguradosFull = [], isLoading: loadingAsegurados } = useQuery({
		queryKey: ['asegurados-by-ids', uniqueAseguradoIds],
		queryFn: () => getAseguradosByIds(uniqueAseguradoIds),
		enabled: isOpen && uniqueAseguradoIds.length > 0,
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

	const openAseguradoHistory = useCallback((asegurado: Asegurado) => {
		setSelectedAsegurado(asegurado)
		setAseguradoHistoryOpen(true)
	}, [])

	const closeAseguradoHistory = useCallback(() => {
		setAseguradoHistoryOpen(false)
		setSelectedAsegurado(null)
	}, [])

	const handleWhatsApp = useCallback(() => {
		const raw = aseguradora?.telefono
		if (!raw?.trim()) return
		const num = formatPhoneForWhatsApp(raw)
		if (!num) return
		window.open(`https://wa.me/${num}`, '_blank', 'noopener,noreferrer')
	}, [aseguradora?.telefono])

	const handleSendEmail = useCallback(() => {
		const email = aseguradora?.email?.trim()
		if (!email) return
		window.location.href = `mailto:${email}`
	}, [aseguradora?.email])

	if (!aseguradora) return null

	return (
		<AnimatePresence>
			{isOpen && (
				<div key="aseguradora-history-modal" className="fixed inset-0 flex items-center justify-center p-4 z-[10000000000000000]">
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
						<div className="sticky top-0 bg-white/80 dark:bg-background/50 backdrop-blur-[2px] dark:backdrop-blur-[10px] border-b border-input p-4 sm:p-6 z-10 rounded-t-lg">
							<div className="flex items-center justify-between">
								<div>
									<h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">
										Historial de la aseguradora
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

						<div className="flex-1 overflow-y-auto flex flex-col">
							<div className="p-4 sm:p-6 flex-shrink-0">
								<div className="flex flex-wrap items-center gap-2 mb-4">
									<span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300">
										{aseguradora.codigo || 'Sin código'}
									</span>
									{aseguradora.activo ? (
										<span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300">
											Activa
										</span>
									) : (
										<span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300">
											No disponible
										</span>
									)}
									<button
										type="button"
										onClick={() => setIsEditModalOpen(true)}
										title="Editar aseguradora"
										className="inline-flex items-center justify-center p-1.5 sm:p-2 text-xs font-semibold rounded-md bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-800/40 transition-colors duration-200 cursor-pointer"
										aria-label="Editar aseguradora"
									>
										<Edit className="w-4 h-4" />
									</button>
									<button
										type="button"
										onClick={handleWhatsApp}
										disabled={!aseguradora.telefono?.trim()}
										title="Escribir por WhatsApp"
										className="inline-flex items-center justify-center p-1.5 sm:p-2 text-xs font-semibold rounded-md bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-800/40 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
										aria-label="WhatsApp"
									>
										<WhatsAppIcon className="w-4 h-4" />
									</button>
									<button
										type="button"
										onClick={handleSendEmail}
										disabled={!aseguradora.email?.trim()}
										title="Enviar correo"
										className="inline-flex items-center justify-center p-1.5 sm:p-2 text-xs font-semibold rounded-md bg-slate-100 text-slate-800 dark:bg-slate-900/30 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800/40 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
										aria-label="Enviar correo"
									>
										<Send className="w-4 h-4" />
									</button>
								</div>

								<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
									<InfoSection title="Información general" icon={Building2}>
										<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
											<div>
												<p className="text-xs text-gray-500 dark:text-gray-400">Nombre</p>
												<p className="text-sm font-medium text-gray-900 dark:text-gray-100">{aseguradora.nombre}</p>
											</div>
											<div>
												<p className="text-xs text-gray-500 dark:text-gray-400">RIF</p>
												<p className="text-sm font-medium text-gray-900 dark:text-gray-100">{aseguradora.rif || 'Sin RIF'}</p>
											</div>
											<div>
												<p className="text-xs text-gray-500 dark:text-gray-400">Código interno</p>
												<p className="text-sm font-medium text-gray-900 dark:text-gray-100">{aseguradora.codigo_interno || 'Sin código'}</p>
											</div>
										</div>
									</InfoSection>
									<InfoSection title="Contacto" icon={Phone}>
										<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
											<div>
												<p className="text-xs text-gray-500 dark:text-gray-400">Teléfono</p>
												<p className="text-sm font-medium text-gray-900 dark:text-gray-100">{aseguradora.telefono || 'Sin teléfono'}</p>
											</div>
											<div>
												<p className="text-xs text-gray-500 dark:text-gray-400">Email</p>
												<p className="text-sm font-medium text-gray-900 dark:text-gray-100">{aseguradora.email || 'Sin email'}</p>
											</div>
											<div>
												<p className="text-xs text-gray-500 dark:text-gray-400">Web</p>
												<p className="text-sm font-medium text-gray-900 dark:text-gray-100">{aseguradora.web || 'Sin web'}</p>
											</div>
										</div>
									</InfoSection>
									<InfoSection title="Dirección" icon={MapPin}>
										<p className="text-sm font-medium text-gray-900 dark:text-gray-100">{aseguradora.direccion || 'Sin dirección'}</p>
									</InfoSection>
									<InfoSection title="Estado" icon={Globe}>
										<p className="text-sm font-medium text-gray-900 dark:text-gray-100">{aseguradora.activo ? 'Activa' : 'No disponible'}</p>
									</InfoSection>
								</div>
							</div>

							<div className="p-4 sm:p-6 pt-0 flex-1 min-h-0">
								<Tabs defaultValue="polizas" className="flex-1 flex flex-col min-h-0">
									<TabsList className="w-full sm:w-auto grid grid-cols-2 mb-3">
										<TabsTrigger value="polizas" className="gap-1.5">
											<FileText className="w-4 h-4" />
											Pólizas
										</TabsTrigger>
										<TabsTrigger value="asegurados">
											Asegurados
										</TabsTrigger>
									</TabsList>
									<TabsContent value="polizas" className="flex-1 mt-0 min-h-0 overflow-auto">
										{loadingPolizas && <p className="text-sm text-gray-500">Cargando pólizas...</p>}
										{!loadingPolizas && polizas.length === 0 && (
											<p className="text-sm text-gray-500">No hay pólizas con esta aseguradora.</p>
										)}
										{!loadingPolizas && polizas.length > 0 && (
											<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
												{polizas.map((poliza) => (
													<PolizaCard key={poliza.id} poliza={poliza} onClick={() => openPolizaDetail(poliza)} />
												))}
											</div>
										)}
									</TabsContent>
									<TabsContent value="asegurados" className="flex-1 mt-0 min-h-0 overflow-auto">
										{(loadingPolizas || loadingAsegurados) && <p className="text-sm text-gray-500">Cargando...</p>}
										{!loadingPolizas && !loadingAsegurados && uniqueAseguradoIds.length === 0 && (
											<p className="text-sm text-gray-500">No hay asegurados con pólizas en esta compañía.</p>
										)}
										{!loadingPolizas && !loadingAsegurados && aseguradosFull.length > 0 && (
											<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
												{aseguradosFull.map((asegurado) => (
													<AseguradoCard
														key={asegurado.id}
														asegurado={asegurado}
														onClick={() => openAseguradoHistory(asegurado)}
													/>
												))}
											</div>
										)}
									</TabsContent>
								</Tabs>
							</div>
						</div>
					</motion.div>
				</div>
			)}

			<PolizaDetailPanel key="poliza-detail-panel" poliza={selectedPoliza} isOpen={polizaPanelOpen} onClose={closePolizaDetail} />

			<EditAseguradoraModal
				key="edit-aseguradora-modal"
				isOpen={isEditModalOpen}
				onClose={() => setIsEditModalOpen(false)}
				aseguradora={aseguradora}
				onSave={(updated) => {
					onAseguradoraUpdated?.(updated)
					setIsEditModalOpen(false)
				}}
			/>

			<AseguradoHistoryModal
				key="asegurado-history-modal"
				isOpen={aseguradoHistoryOpen}
				onClose={closeAseguradoHistory}
				asegurado={selectedAsegurado}
				onAseguradoUpdated={(updated) => {
					setSelectedAsegurado(updated)
					queryClient.invalidateQueries({ queryKey: ['asegurados-by-ids', uniqueAseguradoIds] })
				}}
			/>
		</AnimatePresence>
	)
}
