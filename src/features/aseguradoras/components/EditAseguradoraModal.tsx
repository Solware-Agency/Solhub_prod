import { motion, AnimatePresence } from 'motion/react'
import { ArrowLeftFromLine, Save, Building2, Phone } from 'lucide-react'
import { useState, useEffect } from 'react'
import { Input } from '@shared/components/ui/input'
import { Button } from '@shared/components/ui/button'
import { Label } from '@shared/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@shared/components/ui/select'
import { useToast } from '@shared/hooks/use-toast'
import type { Aseguradora } from '@services/supabase/aseguradoras/aseguradoras-service'
import { updateAseguradora } from '@services/supabase/aseguradoras/aseguradoras-service'

interface EditAseguradoraModalProps {
	isOpen: boolean
	onClose: () => void
	aseguradora: Aseguradora | null
	onSave?: (updated: Aseguradora) => void
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

const parseRif = (rif: string): string => {
	const t = (rif ?? '').trim()
	if (!t) return ''
	if (t.startsWith('J-')) return t.slice(2).replace(/\D/g, '')
	return t.replace(/\D/g, '')
}

const buildRif = (numero: string): string => {
	const n = numero.replace(/\D/g, '')
	if (!n) return ''
	if (n.length === 9) return `J-${n.slice(0, 8)}-${n.slice(8)}`
	return `J-${n}`
}

export const EditAseguradoraModal = ({ isOpen, onClose, aseguradora, onSave }: EditAseguradoraModalProps) => {
	const { toast } = useToast()
	const [isLoading, setIsLoading] = useState(false)
	const [form, setForm] = useState({
		nombre: '',
		codigo_interno: '',
		rif_numero: '',
		telefono: '',
		email: '',
		web: '',
		direccion: '',
		activo: true,
	})

	useEffect(() => {
		if (aseguradora) {
			setForm({
				nombre: aseguradora.nombre,
				codigo_interno: aseguradora.codigo_interno ?? '',
				rif_numero: parseRif(aseguradora.rif ?? ''),
				telefono: (aseguradora.telefono ?? '').replace(/\D/g, ''),
				email: aseguradora.email ?? '',
				web: aseguradora.web ?? '',
				direccion: aseguradora.direccion ?? '',
				activo: aseguradora.activo,
			})
		}
	}, [aseguradora, isOpen])

	const isValidEmailChar = (char: string) => /[a-zA-Z0-9@._+-]/.test(char)
	const isValidEmail = (value: string): boolean => {
		const t = (value ?? '').trim()
		if (!t) return true
		if (!t.includes('@')) return false
		return /^[a-zA-Z0-9._+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(t)
	}

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()
		if (!aseguradora) return
		const email = (form.email ?? '').trim()
		if (email && !form.email?.includes('@')) {
			toast({ title: 'Email debe contener @', variant: 'destructive' })
			return
		}
		if (email && !isValidEmail(form.email ?? '')) {
			toast({ title: 'Email con formato inválido', variant: 'destructive' })
			return
		}
		if (!form.rif_numero?.trim()) {
			toast({ title: 'RIF es obligatorio', variant: 'destructive' })
			return
		}
		setIsLoading(true)
		try {
			const rif = buildRif(form.rif_numero)
			const updated = await updateAseguradora(aseguradora.id, {
				nombre: form.nombre,
				codigo_interno: form.codigo_interno,
				rif,
				telefono: form.telefono,
				email: form.email || null,
				web: form.web || null,
				direccion: form.direccion || null,
				activo: form.activo,
			})
			toast({ title: 'Aseguradora actualizada' })
			onSave?.(updated)
			onClose()
		} catch (err) {
			console.error(err)
			toast({ title: 'Error al guardar aseguradora', variant: 'destructive' })
		} finally {
			setIsLoading(false)
		}
	}

	if (!aseguradora) return null
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
							<div className="sticky top-0 bg-white/80 dark:bg-background/50 backdrop-blur-[2px] dark:backdrop-blur-[10px] border-b border-input p-4 sm:p-6 z-10">
								<div className="flex items-center justify-between">
									<div>
										<h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-gray-100">
											Editando Aseguradora: {aseguradora.nombre}
										</h2>
										{aseguradora.codigo_interno && (
											<p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Código: {aseguradora.codigo_interno}</p>
										)}
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
									<CardSection title="Información general" icon={Building2}>
										<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
											<div className="space-y-2">
												<Label>Nombre</Label>
												<Input
													value={form.nombre}
													onChange={(e) => setForm((prev) => ({ ...prev, nombre: e.target.value }))}
													required
												/>
											</div>
											<div className="space-y-2">
												<Label>Código interno</Label>
												<Input
													value={form.codigo_interno ?? ''}
													onChange={(e) => setForm((prev) => ({ ...prev, codigo_interno: e.target.value || null }))}
												/>
											</div>
											<div className="space-y-2">
												<Label>RIF</Label>
												<div className="flex gap-2">
													<div className="flex h-10 w-12 shrink-0 items-center justify-center rounded-md border border-input bg-background px-3 py-2 text-sm font-medium ring-offset-background">
														J
													</div>
													<Input
														placeholder="12345678-9"
														value={form.rif_numero}
														onChange={(e) => {
															const onlyNumbers = e.target.value.replace(/\D/g, '')
															setForm((prev) => ({ ...prev, rif_numero: onlyNumbers }))
														}}
														inputMode="numeric"
														maxLength={9}
														className="flex-1"
														required
													/>
												</div>
											</div>
											<div className="space-y-2">
												<Label>Estado</Label>
												<Select
													value={form.activo ? 'true' : 'false'}
													onValueChange={(value) => setForm((prev) => ({ ...prev, activo: value === 'true' }))}
												>
													<SelectTrigger>
														<SelectValue />
													</SelectTrigger>
													<SelectContent>
														<SelectItem value="true">Activo</SelectItem>
														<SelectItem value="false">Inactivo</SelectItem>
													</SelectContent>
												</Select>
											</div>
										</div>
									</CardSection>

									<CardSection title="Contacto" icon={Phone}>
										<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
											<div className="space-y-2">
												<Label>Teléfono</Label>
												<Input
													value={form.telefono ?? ''}
													onChange={(e) => {
														const onlyNumbers = e.target.value.replace(/\D/g, '')
														setForm((prev) => ({ ...prev, telefono: onlyNumbers }))
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
											<div className="space-y-2">
												<Label>Web</Label>
												<Input
													value={form.web ?? ''}
													onChange={(e) => setForm((prev) => ({ ...prev, web: e.target.value || null }))}
												/>
											</div>
											<div className="space-y-2">
												<Label>Dirección</Label>
												<Input
													value={form.direccion ?? ''}
													onChange={(e) => setForm((prev) => ({ ...prev, direccion: e.target.value || null }))}
												/>
											</div>
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
