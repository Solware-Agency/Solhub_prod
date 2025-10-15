import React, { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { X, Microscope, Loader2, Heart, Activity } from 'lucide-react'
import { Button } from '@shared/components/ui/button'
import { TagInput } from '@shared/components/ui/tag-input'
import { useToast } from '@shared/hooks/use-toast'
import { useAuth } from '@app/providers/MockAuthContext'
import { useUserProfile } from '@shared/hooks/useUserProfile'
import { updateMedicalCase } from '@/services/supabase/cases/medical-cases-service'
import { createOrUpdateImmunoRequest } from '@/services/legacy/supabase-service'
import type { MedicalRecord } from '@shared/types/types'
import { useBodyScrollLock } from '@shared/hooks/useBodyScrollLock'
import { useGlobalOverlayOpen } from '@shared/hooks/useGlobalOverlayOpen'

interface GenerateCaseModalProps {
	case_: MedicalRecord | null
	isOpen: boolean
	onClose: () => void
	onSuccess: () => void
}

const RequestCaseModal: React.FC<GenerateCaseModalProps> = ({ case_, isOpen, onClose, onSuccess }) => {
	const [inmunorreacciones, setInmunorreacciones] = useState<string[]>([])
	const [isRequestingImmuno, setIsRequestingImmuno] = useState(false)
	const { toast } = useToast()
	const { user } = useAuth()
	const { profile } = useUserProfile()
	useBodyScrollLock(isOpen)
	useGlobalOverlayOpen(isOpen)

	// Determine case type from exam_type
	const getCaseType = (examType: string): 'biopsia' | 'inmunohistoquimica' | 'citologia' => {
		const type = examType.toLowerCase().trim()
		if (type.includes('inmuno')) return 'inmunohistoquimica'
		if (type.includes('citolog')) return 'citologia'
		return 'biopsia'
	}

	const caseType = case_ ? getCaseType(case_.exam_type) : 'biopsia'

	const handleRequestImmunoreactions = async () => {
		if (!case_ || !user || inmunorreacciones.length === 0) {
			toast({
				title: '❌ Error',
				description: 'Debe agregar al menos una inmunorreacción.',
				variant: 'destructive',
			})
			return
		}

		setIsRequestingImmuno(true)

		try {
			// 1. Actualizar la columna ims en medical_records_clean
			const imsString = inmunorreacciones.join(',')
			await updateMedicalCase(case_.id!, { ims: imsString }, user.id)

			// 2. Crear/actualizar registro en immuno_requests
			const { error: immunoError } = await createOrUpdateImmunoRequest(
				case_.id!,
				inmunorreacciones,
				18.0, // Precio unitario por defecto
			)

			if (immunoError) {
				throw immunoError
			}

			toast({
				title: '✅ Inmunorreacciones solicitadas',
				description: `Se han solicitado ${inmunorreacciones.length} inmunorreacciones para este caso.`,
				className: 'bg-green-100 border-green-400 text-green-800',
			})

			// Limpiar las inmunorreacciones del estado local
			setInmunorreacciones([])

			// Actualizar el caso en el estado padre
			onSuccess()
		} catch (error) {
			console.error('Error requesting immunoreactions:', error)
			toast({
				title: '❌ Error al solicitar inmunorreacciones',
				description: 'Hubo un problema al procesar la solicitud. Inténtalo de nuevo.',
				variant: 'destructive',
			})
		} finally {
			setIsRequestingImmuno(false)
		}
	}

	const getCaseTypeIcon = (type: string) => {
		switch (type) {
			case 'inmunohistoquimica':
				return <Heart className="w-5 h-5 text-purple-600 dark:text-purple-400" />
			case 'citologia':
				return <Activity className="w-5 h-5 text-blue-600 dark:text-blue-400" />
			default:
				return <Microscope className="w-5 h-5 text-green-600 dark:text-green-400" />
		}
	}

	const getCaseTypeTitle = (type: string) => {
		switch (type) {
			case 'inmunohistoquimica':
				return 'Inmunohistoquímica'
			case 'citologia':
				return 'Citología'
			default:
				return 'Biopsia'
		}
	}

	if (!case_) return null

	return (
		<AnimatePresence>
			{isOpen && (
				<>
					{/* Backdrop */}
					<motion.div
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						onClick={onClose}
						className="fixed inset-0 bg-black/50 z-[99999999999999999]"
					/>

					{/* Main Modal */}
					<motion.div
						initial={{ x: '100%' }}
						animate={{ x: 0 }}
						exit={{ x: '100%' }}
						transition={{ type: 'spring', damping: 25, stiffness: 200 }}
						className="fixed right-0 top-0 h-full w-full sm:w-2/3 lg:w-1/2 xl:w-2/5 bg-white/80 dark:bg-background/50 backdrop-blur-[10px] shadow-2xl z-[99999999999999999] overflow-y-auto border-l border-input flex flex-col"
					>
						{/* Header */}
						<div className="sticky top-0 bg-white/80 dark:bg-background/50 backdrop-blur-[10px] border-b border-input p-3 sm:p-6 z-10">
							<div className="flex items-center justify-between">
								<div>
									<div>
										<h2 className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
											{getCaseTypeIcon(caseType)}
											Generar Caso de {getCaseTypeTitle(caseType)}
										</h2>
									</div>
									<div className="flex items-center gap-1.5 sm:gap-2 mt-1 sm:mt-2">
										<p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
											{case_.code || case_.id?.slice(-6).toUpperCase()}
										</p>
										<p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
											• {case_.nombre || case_.full_name}
										</p>
									</div>
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
						<div className="p-3 sm:p-6 overflow-y-auto flex-1">
							<div className="space-y-4 sm:space-y-6">
								{caseType === 'inmunohistoquimica' && (
									<div className="space-y-4">
										{/* Sección de Inmunorreacciones - Para Residentes y Owners */}
										{(profile?.role === 'residente' || profile?.role === 'owner') && (
											<div className="space-y-4 p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
												<div className="flex items-center gap-2 mb-3">
													<Heart className="w-5 h-5 text-purple-600 dark:text-purple-400" />
													<h4 className="font-semibold text-purple-800 dark:text-purple-300">
														Solicitar Inmunorreacciones
													</h4>
												</div>

												<div className="space-y-3">
													<div>
														<label
															htmlFor="request-inmuno-reactions"
															className="block text-sm font-medium text-purple-700 dark:text-purple-300 mb-2"
														>
															Agregar Inmunorreacciones
														</label>
														<TagInput
															id="request-inmuno-reactions"
															value={inmunorreacciones ?? []}
															onChange={setInmunorreacciones}
															placeholder="Escribir inmunorreacción y presionar Enter"
															maxTags={20}
															allowDuplicates={false}
															className="bg-white dark:bg-gray-800"
														/>
														<p className="text-xs text-purple-600 dark:text-purple-400 mt-1">
															Ejemplo: RE, RP, CK7, CK20, etc. Presiona Enter después de cada una.
														</p>
													</div>

													<Button
														type="button"
														onClick={handleRequestImmunoreactions}
														disabled={inmunorreacciones.length === 0 || isRequestingImmuno}
														className="w-full bg-purple-600 hover:bg-purple-700 text-white"
													>
														{isRequestingImmuno ? (
															<>
																<Loader2 className="w-4 h-4 mr-2 animate-spin" />
																Solicitando...
															</>
														) : (
															<>
																<Heart className="w-4 h-4 mr-2" />
																Solicitar inmunorreacciones ({inmunorreacciones.length})
															</>
														)}
													</Button>
												</div>
											</div>
										)}
									</div>
								)}
							</div>
						</div>
					</motion.div>
				</>
			)}
		</AnimatePresence>
	)
}

export default RequestCaseModal
