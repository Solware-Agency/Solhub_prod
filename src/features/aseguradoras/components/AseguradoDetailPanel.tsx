import React, { useCallback, useEffect, useState } from 'react'
import { Button } from '@shared/components/ui/button'
import { Input } from '@shared/components/ui/input'
import { Label } from '@shared/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@shared/components/ui/select'
import { SideDetailPanel } from './SideDetailPanel'
import type { Asegurado, AseguradoUpdate } from '@services/supabase/aseguradoras/asegurados-service'
import { FileText, Mail, MapPin, Phone, User } from 'lucide-react'

interface AseguradoDetailPanelProps {
	asegurado: Asegurado | null
	isOpen: boolean
	onClose: () => void
	onSave: (payload: AseguradoUpdate) => Promise<boolean>
	saving?: boolean
}

export const AseguradoDetailPanel = ({
	asegurado,
	isOpen,
	onClose,
	onSave,
	saving = false,
}: AseguradoDetailPanelProps) => {
	const [isEditing, setIsEditing] = useState(false)
	const [form, setForm] = useState<AseguradoUpdate>({
		full_name: '',
		document_id: '',
		phone: '',
		email: '',
		address: '',
		notes: '',
		tipo_asegurado: 'Persona natural',
	})

	useEffect(() => {
		if (asegurado) {
			setForm({
				full_name: asegurado.full_name,
				document_id: asegurado.document_id,
				phone: asegurado.phone,
				email: asegurado.email ?? '',
				address: asegurado.address ?? '',
				notes: asegurado.notes ?? '',
				tipo_asegurado: asegurado.tipo_asegurado,
			})
		}
		setIsEditing(false)
	}, [asegurado, isOpen])

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

	if (!asegurado) return null

	const actions = isEditing ? (
		<>
			<Button variant="outline" onClick={() => setIsEditing(false)} disabled={saving}>
				Cancelar
			</Button>
			<Button
				onClick={async () => {
					const ok = await onSave(form)
					if (ok) setIsEditing(false)
				}}
				disabled={saving}
			>
				{saving ? 'Guardando...' : 'Guardar'}
			</Button>
		</>
	) : (
		<Button variant="outline" onClick={() => setIsEditing(true)}>
			Editar
		</Button>
	)

	return (
		<SideDetailPanel
			isOpen={isOpen}
			onClose={onClose}
			title={asegurado.full_name}
			subtitle={asegurado.document_id}
			actions={actions}
		>
			{isEditing ? (
				<div className="space-y-4">
					<InfoSection title="Información del asegurado" icon={User}>
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
								/>
							</div>
							<div className="space-y-2">
								<Label>Documento</Label>
								<Input
									value={form.document_id}
									onChange={(e) => setForm((prev) => ({ ...prev, document_id: e.target.value }))}
								/>
							</div>
						</div>
					</InfoSection>

					<InfoSection title="Contacto" icon={Phone}>
						<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
							<div className="space-y-2">
								<Label>Teléfono</Label>
								<Input value={form.phone} onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))} />
							</div>
							<div className="space-y-2">
								<Label>Email</Label>
								<Input value={form.email} onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))} />
							</div>
						</div>
					</InfoSection>

					<InfoSection title="Dirección" icon={MapPin}>
						<div className="space-y-2">
							<Label>Dirección</Label>
							<Input value={form.address} onChange={(e) => setForm((prev) => ({ ...prev, address: e.target.value }))} />
						</div>
					</InfoSection>

					<InfoSection title="Notas internas" icon={FileText}>
						<div className="space-y-2">
							<Label>Notas</Label>
							<Input value={form.notes} onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))} />
						</div>
					</InfoSection>
				</div>
			) : (
				<div className="space-y-4">
					<div className="flex flex-wrap items-center gap-2">
						<span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
							<User className="w-3 h-3" />
							{asegurado.tipo_asegurado}
						</span>
						<span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-300">
							{asegurado.document_id}
						</span>
						{asegurado.email && (
							<span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300">
								<Mail className="w-3 h-3" />
								Email
							</span>
						)}
					</div>

					<InfoSection title="Información del asegurado" icon={User}>
						<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
							<div>
								<p className="text-xs text-gray-500">Tipo</p>
								<p className="text-sm font-medium">{asegurado.tipo_asegurado}</p>
							</div>
							<div>
								<p className="text-xs text-gray-500">Documento</p>
								<p className="text-sm font-medium">{asegurado.document_id}</p>
							</div>
						</div>
					</InfoSection>

					<InfoSection title="Contacto" icon={Phone}>
						<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
							<div>
								<p className="text-xs text-gray-500">Teléfono</p>
								<p className="text-sm font-medium">{asegurado.phone || 'Sin teléfono'}</p>
							</div>
							<div>
								<p className="text-xs text-gray-500">Email</p>
								<p className="text-sm font-medium">{asegurado.email || 'Sin email'}</p>
							</div>
						</div>
					</InfoSection>

					<InfoSection title="Dirección" icon={MapPin}>
						<p className="text-sm font-medium">{asegurado.address || 'Sin dirección'}</p>
					</InfoSection>

					<InfoSection title="Notas internas" icon={FileText}>
						<p className="text-sm font-medium">{asegurado.notes || 'Sin notas'}</p>
					</InfoSection>
				</div>
			)}
		</SideDetailPanel>
	)
}
