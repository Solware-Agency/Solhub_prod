import React, { useCallback, useEffect, useState } from 'react'
import { Button } from '@shared/components/ui/button'
import { Input } from '@shared/components/ui/input'
import { Label } from '@shared/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@shared/components/ui/select'
import { SideDetailPanel } from './SideDetailPanel'
import type { Aseguradora, AseguradoraUpdate } from '@services/supabase/aseguradoras/aseguradoras-service'
import { Building2, Globe, Mail, MapPin, Phone } from 'lucide-react'

interface AseguradoraDetailPanelProps {
	aseguradora: Aseguradora | null
	isOpen: boolean
	onClose: () => void
	onSave: (payload: AseguradoraUpdate) => Promise<boolean>
	saving?: boolean
}

export const AseguradoraDetailPanel = ({
	aseguradora,
	isOpen,
	onClose,
	onSave,
	saving = false,
}: AseguradoraDetailPanelProps) => {
	const [isEditing, setIsEditing] = useState(false)
	const [form, setForm] = useState<AseguradoraUpdate>({
		nombre: '',
		codigo_interno: '',
		rif: '',
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
				rif: aseguradora.rif ?? '',
				telefono: aseguradora.telefono ?? '',
				email: aseguradora.email ?? '',
				web: aseguradora.web ?? '',
				direccion: aseguradora.direccion ?? '',
				activo: aseguradora.activo,
			})
		}
		setIsEditing(false)
	}, [aseguradora, isOpen])

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

	if (!aseguradora) return null

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
			title={aseguradora.nombre}
			subtitle={aseguradora.codigo_interno || 'Sin código interno'}
			actions={actions}
		>
			{isEditing ? (
				<div className="space-y-4">
					<InfoSection title="Información general" icon={Building2}>
						<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
							<div className="space-y-2">
								<Label>Nombre</Label>
								<Input value={form.nombre} onChange={(e) => setForm((prev) => ({ ...prev, nombre: e.target.value }))} />
							</div>
							<div className="space-y-2">
								<Label>Código interno</Label>
								<Input
									value={form.codigo_interno}
									onChange={(e) => setForm((prev) => ({ ...prev, codigo_interno: e.target.value }))}
								/>
							</div>
							<div className="space-y-2">
								<Label>RIF</Label>
								<Input value={form.rif} onChange={(e) => setForm((prev) => ({ ...prev, rif: e.target.value }))} />
							</div>
						</div>
					</InfoSection>

					<InfoSection title="Contacto" icon={Phone}>
						<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
							<div className="space-y-2">
								<Label>Teléfono</Label>
								<Input value={form.telefono} onChange={(e) => setForm((prev) => ({ ...prev, telefono: e.target.value }))} />
							</div>
							<div className="space-y-2">
								<Label>Email</Label>
								<Input value={form.email} onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))} />
							</div>
							<div className="space-y-2">
								<Label>Web</Label>
								<Input value={form.web} onChange={(e) => setForm((prev) => ({ ...prev, web: e.target.value }))} />
							</div>
						</div>
					</InfoSection>

					<InfoSection title="Dirección" icon={MapPin}>
						<div className="space-y-2">
							<Label>Dirección</Label>
							<Input value={form.direccion} onChange={(e) => setForm((prev) => ({ ...prev, direccion: e.target.value }))} />
						</div>
					</InfoSection>

					<InfoSection title="Estado" icon={Globe}>
						<div className="space-y-2">
							<Label>Activo</Label>
							<Select
								value={form.activo ? 'true' : 'false'}
								onValueChange={(value) => setForm((prev) => ({ ...prev, activo: value === 'true' }))}
							>
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="true">Activa</SelectItem>
									<SelectItem value="false">No disponible</SelectItem>
								</SelectContent>
							</Select>
						</div>
					</InfoSection>
				</div>
			) : (
				<div className="space-y-4">
					<div className="flex flex-wrap items-center gap-2">
						<span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
							<Building2 className="w-3 h-3" />
							{aseguradora.codigo_interno || 'Sin código'}
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
						{aseguradora.rif && (
							<span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-300">
								{aseguradora.rif}
							</span>
						)}
					</div>

					<InfoSection title="Información general" icon={Building2}>
						<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
							<div>
								<p className="text-xs text-gray-500">Código interno</p>
								<p className="text-sm font-medium">{aseguradora.codigo_interno || 'Sin código'}</p>
							</div>
							<div>
								<p className="text-xs text-gray-500">RIF</p>
								<p className="text-sm font-medium">{aseguradora.rif || 'Sin RIF'}</p>
							</div>
						</div>
					</InfoSection>

					<InfoSection title="Contacto" icon={Phone}>
						<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
							<div>
								<p className="text-xs text-gray-500">Teléfono</p>
								<p className="text-sm font-medium">{aseguradora.telefono || 'Sin teléfono'}</p>
							</div>
							<div>
								<p className="text-xs text-gray-500">Email</p>
								<p className="text-sm font-medium">{aseguradora.email || 'Sin email'}</p>
							</div>
							<div>
								<p className="text-xs text-gray-500">Web</p>
								<p className="text-sm font-medium">{aseguradora.web || 'Sin web'}</p>
							</div>
						</div>
					</InfoSection>

					<InfoSection title="Dirección" icon={MapPin}>
						<p className="text-sm font-medium">{aseguradora.direccion || 'Sin dirección'}</p>
					</InfoSection>

					<InfoSection title="Estado" icon={Globe}>
						<p className="text-sm font-medium">{aseguradora.activo ? 'Activa' : 'No disponible'}</p>
					</InfoSection>
				</div>
			)}
		</SideDetailPanel>
	)
}
