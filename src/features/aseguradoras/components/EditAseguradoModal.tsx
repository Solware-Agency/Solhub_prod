import { motion, AnimatePresence } from 'motion/react'
import { ArrowLeftFromLine, Save, User, Phone, MapPin, FileText } from 'lucide-react'
import { useState, useEffect } from 'react'
import { Input } from '@shared/components/ui/input'
import { Button } from '@shared/components/ui/button'
import { Label } from '@shared/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@shared/components/ui/select'
import { useToast } from '@shared/hooks/use-toast'
import type { Asegurado } from '@services/supabase/aseguradoras/asegurados-service'
import { updateAsegurado } from '@services/supabase/aseguradoras/asegurados-service'

interface EditAseguradoModalProps {
	isOpen: boolean
	onClose: () => void
	asegurado: Asegurado | null
	onSave?: (updated: Asegurado) => void
}

const CardSection = ({
	title,
	icon: Icon,
	children,
}: {
	title: string
	icon: React.ComponentType<{ className?: string }>
	children: React.ReactNode
}) => (
	<div className="bg-white/60 dark:bg-background/30 backdrop-blur-[5px] border border-input rounded-lg p-4 hover:shadow-md transition-shadow">
		<div className="flex items-center gap-2 mb-3">
			<Icon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
			<h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
		</div>
		{children}
	</div>
)

const parseDocumentId = (documentId: string): { tipo: 'V' | 'J'; numero: string } => {
	const trimmed = (documentId ?? '').trim()
	if (trimmed.startsWith('V-')) {
		return { tipo: 'V', numero: trimmed.slice(2).replace(/\D/g, '') }
	}
	if (trimmed.startsWith('J-')) {
		return { tipo: 'J', numero: trimmed.slice(2).replace(/\D/g, '') }
	}
	return { tipo: 'V', numero: trimmed.replace(/\D/g, '') }
}

const buildDocumentId = (tipo: 'V' | 'J', numero: string): string => {
	const n = numero.replace(/\D/g, '')
	if (!n) return ''
	if (tipo === 'J' && n.length === 9) return `J-${n.slice(0, 8)}-${n.slice(8)}`
	return `${tipo}-${n}`
}

export const EditAseguradoModal = ({ isOpen, onClose, asegurado, onSave }: EditAseguradoModalProps) => {
	const { toast } = useToast()
	const [isLoading, setIsLoading] = useState(false)
	const [form, setForm] = useState({
		full_name: '',
		document_tipo: 'V' as 'V' | 'J',
		document_numero: '',
		phone: '',
		email: '',
		address: '',
		notes: '',
		tipo_asegurado: 'Persona natural' as 'Persona natural' | 'Persona jurídica',
	})

	useEffect(() => {
		if (asegurado) {
			const { tipo, numero } = parseDocumentId(asegurado.document_id)
			setForm({
				full_name: asegurado.full_name,
				document_tipo: tipo,
				document_numero: numero,
				phone: (asegurado.phone ?? '').replace(/\D/g, ''),
				email: asegurado.email ?? '',
				address: asegurado.address ?? '',
				notes: asegurado.notes ?? '',
				tipo_asegurado: asegurado.tipo_asegurado,
			})
		}
	}, [asegurado, isOpen])

	const isValidEmailChar = (char: string) => /[a-zA-Z0-9@._+-]/.test(char)
	const isValidEmail = (value: string): boolean => {
		const t = (value ?? '').trim()
		if (!t) return true
		if (!t.includes('@')) return false
		return /^[a-zA-Z0-9._+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(t)
	}

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()
		if (!asegurado) return
		const email = (form.email ?? '').trim()
		if (email && !form.email?.includes('@')) {
			toast({ title: 'Email debe contener @', variant: 'destructive' })
			return
		}
		if (email && !isValidEmail(form.email ?? '')) {
			toast({ title: 'Email con formato inválido', variant: 'destructive' })
			return
		}
		if (!form.document_numero?.trim()) {
			toast({ title: 'Documento es obligatorio', variant: 'destructive' })
			return
		}
		setIsLoading(true)
		try {
			const document_id = buildDocumentId(form.document_tipo, form.document_numero)
			const updated = await updateAsegurado(asegurado.id, {
				full_name: form.full_name,
				document_id,
				phone: form.phone,
				email: form.email || null,
				address: form.address || null,
				notes: form.notes || null,
				tipo_asegurado: form.tipo_asegurado,
			})
			toast({ title: 'Asegurado actualizado' })
			onSave?.(updated)
			onClose()
		} catch (err) {
			console.error(err)
			toast({ title: 'Error al guardar asegurado', variant: 'destructive' })
		} finally {
			setIsLoading(false)
		}
	}

	if (!asegurado) return null
	if (!isOpen) return null

	return (
		<AnimatePresence>
			{isOpen && (
				<div className="fixed inset-0 z-[10000000000000001] flex items-center justify-center p-4">
					<motion.div
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						transition={{ duration: 0.2 }}
						onClick={onClose}
						className="fixed inset-0 bg-black/50"
					/>
					<motion.div
						initial={{ scale: 0.95 }}
						animate={{ scale: 1 }}
						exit={{ scale: 0.95 }}
						transition={{ type: 'spring', damping: 25, stiffness: 200 }}
						className="relative z-10 w-full max-w-4xl max-h-[90vh] flex flex-col"
					>
						<div
							className="bg-white/80 dark:bg-background/50 backdrop-blur-[2px] dark:backdrop-blur-[10px] rounded-lg shadow-2xl max-h-[90vh] overflow-hidden flex flex-col border border-input"
							onClick={(e) => e.stopPropagation()}
						>
							{/* Header */}
							<div className="sticky top-0 bg-white/80 dark:bg-background/50 backdrop-blur-[2px] dark:backdrop-blur-[10px] border-b border-input p-4 sm:p-6 z-10">
								<div className="flex items-center justify-between">
									<div>
										<h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-gray-100">
											Editando Asegurado: {asegurado.full_name}
										</h2>
										<p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Documento: {asegurado.document_id}</p>
									</div>
									<button
										type="button"
										onClick={onClose}
										className="p-1.5 sm:p-2 rounded-lg transition-none flex items-center gap-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
									>
										<ArrowLeftFromLine className="size-4" />
										Volver
									</button>
								</div>
							</div>

							<form onSubmit={handleSubmit} className="flex-1 overflow-hidden flex flex-col">
								<div className="flex-1 overflow-y-auto p-4 space-y-4">
									<CardSection title="Información del asegurado" icon={User}>
										<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
											<div className="space-y-2">
												<Label>Tipo de asegurado</Label>
												<Select
													value={form.tipo_asegurado}
													onValueChange={(value) =>
														setForm((prev) => ({
															...prev,
															tipo_asegurado: value as 'Persona natural' | 'Persona jurídica',
														}))
													}
												>
													<SelectTrigger>
														<SelectValue />
													</SelectTrigger>
													<SelectContent>
														<SelectItem value="Persona natural">Persona natural</SelectItem>
														<SelectItem value="Persona jurídica">Persona jurídica</SelectItem>
													</SelectContent>
												</Select>
											</div>
											<div className="space-y-2">
												<Label>Nombre / Razón social</Label>
												<Input
													value={form.full_name}
													onChange={(e) => setForm((prev) => ({ ...prev, full_name: e.target.value }))}
													required
												/>
											</div>
											<div className="space-y-2 sm:col-span-2">
												<Label>Documento</Label>
												<div className="flex gap-2">
													<Select
														value={form.document_tipo}
														onValueChange={(value) => setForm((prev) => ({ ...prev, document_tipo: value as 'V' | 'J' }))}
													>
														<SelectTrigger className="w-16 shrink-0">
															<SelectValue />
														</SelectTrigger>
														<SelectContent>
															<SelectItem value="V">V</SelectItem>
															<SelectItem value="J">J</SelectItem>
														</SelectContent>
													</Select>
													<Input
														placeholder={form.document_tipo === 'J' ? '12345678-9' : '12345678'}
														value={form.document_numero}
														onChange={(e) => {
															const onlyNumbers = e.target.value.replace(/\D/g, '')
															setForm((prev) => ({ ...prev, document_numero: onlyNumbers }))
														}}
														inputMode="numeric"
														maxLength={form.document_tipo === 'J' ? 9 : 15}
														className="flex-1"
														required
													/>
												</div>
											</div>
										</div>
									</CardSection>

									<CardSection title="Contacto" icon={Phone}>
										<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
											<div className="space-y-2">
												<Label>Teléfono</Label>
												<Input
													value={form.phone}
													onChange={(e) => {
														const onlyNumbers = e.target.value.replace(/\D/g, '')
														setForm((prev) => ({ ...prev, phone: onlyNumbers }))
													}}
													inputMode="numeric"
												/>
											</div>
											<div className="space-y-2">
												<Label>Email</Label>
												<Input
													type="email"
													value={form.email ?? ''}
													onChange={(e) => {
														const filtered = [...e.target.value].filter((c) => isValidEmailChar(c)).join('')
														setForm((prev) => ({ ...prev, email: filtered || null }))
													}}
												/>
											</div>
										</div>
									</CardSection>

									<CardSection title="Dirección" icon={MapPin}>
										<div className="space-y-2">
											<Label>Dirección</Label>
											<Input
												value={form.address ?? ''}
												onChange={(e) => setForm((prev) => ({ ...prev, address: e.target.value || null }))}
											/>
										</div>
									</CardSection>

									<CardSection title="Notas internas" icon={FileText}>
										<div className="space-y-2">
											<Label>Notas</Label>
											<Input
												value={form.notes ?? ''}
												onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value || null }))}
											/>
										</div>
									</CardSection>
								</div>

								<div className="sticky bottom-0 bg-white/80 dark:bg-background/80 backdrop-blur-[10px] border-t border-input p-4 flex justify-end gap-2">
									<Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
										Cancelar
									</Button>
									<Button type="submit" disabled={isLoading}>
										{isLoading ? (
											<>
												<div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
												Guardando...
											</>
										) : (
											<>
												<Save className="w-4 h-4 mr-2" />
												Guardar Cambios
											</>
										)}
									</Button>
								</div>
							</form>
						</div>
					</motion.div>
				</div>
			)}
		</AnimatePresence>
	)
}
