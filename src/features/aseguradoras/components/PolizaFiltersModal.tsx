import React, { useEffect, useState } from 'react'
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@shared/components/ui/dialog'
import { Button } from '@shared/components/ui/button'
import { Label } from '@shared/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@shared/components/ui/select'
import { Filter, RotateCcw } from 'lucide-react'
import type { Aseguradora } from '@services/supabase/aseguradoras/aseguradoras-service'
import {
	defaultPolizaListFilters,
	type PolizaListFilters,
} from '@services/supabase/aseguradoras/polizas-service'
import { RAMOS_OPCIONES } from '@features/aseguradoras/lib/poliza-form-shared'

const ESTATUS_POLIZA_OPTIONS: { value: string; label: string }[] = [
	{ value: '', label: 'Todos' },
	{ value: 'Activa', label: 'Activa' },
	{ value: 'Anulada', label: 'Anulada' },
	{ value: 'En emisión', label: 'En emisión' },
	{ value: 'Renovación pendiente', label: 'Renovación pendiente' },
	{ value: 'Vencida', label: 'Vencida' },
]

const ESTATUS_PAGO_OPTIONS: { value: string; label: string }[] = [
	{ value: '', label: 'Todos' },
	{ value: 'Pendiente', label: 'Pendiente (incl. sin definir)' },
	{ value: 'Pagado', label: 'Pagado' },
	{ value: 'Parcial', label: 'Parcial' },
	{ value: 'En mora', label: 'En mora' },
]

const MODALIDAD_OPTIONS: { value: string; label: string }[] = [
	{ value: '', label: 'Todas' },
	{ value: 'Mensual', label: 'Mensual' },
	{ value: 'Trimestral', label: 'Trimestral' },
	{ value: 'Semestral', label: 'Semestral' },
	{ value: 'Anual', label: 'Anual' },
]

const ACTIVO_OPTIONS: { value: PolizaListFilters['activo']; label: string }[] = [
	{ value: 'activas', label: 'Solo activas (en listado)' },
	{ value: 'inactivas', label: 'Solo inactivas (eliminadas)' },
	{ value: 'all', label: 'Todas' },
]

export interface PolizaFiltersModalProps {
	isOpen: boolean
	onOpenChange: (open: boolean) => void
	appliedFilters: PolizaListFilters
	onApply: (filters: PolizaListFilters) => void
	aseguradoras: Aseguradora[]
}

export const PolizaFiltersModal: React.FC<PolizaFiltersModalProps> = ({
	isOpen,
	onOpenChange,
	appliedFilters,
	onApply,
	aseguradoras,
}) => {
	const [draft, setDraft] = useState<PolizaListFilters>(appliedFilters)

	useEffect(() => {
		if (isOpen) {
			setDraft({ ...appliedFilters })
		}
	}, [isOpen, appliedFilters])

	const handleClear = () => {
		setDraft(defaultPolizaListFilters())
	}

	const handleApply = () => {
		onApply({ ...draft })
		onOpenChange(false)
	}

	return (
		<Dialog open={isOpen} onOpenChange={onOpenChange}>
			<DialogContent
				className="w-[calc(100vw-2rem)] max-w-2xl max-h-[90dvh] flex flex-col rounded-2xl sm:rounded-xl p-4 sm:p-6 gap-0 bg-white/80 dark:bg-background/50 backdrop-blur-[2px] dark:backdrop-blur-[10px]"
				overlayClassName="bg-black/60"
			>
				<DialogHeader className="shrink-0 pb-2">
					<DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
						<Filter className="h-5 w-5 shrink-0" />
						Filtros de pólizas
					</DialogTitle>
				</DialogHeader>
				<div className="overflow-y-auto min-h-0 py-2 flex-1">
					<div className="grid grid-cols-2 gap-x-3 sm:gap-x-4 gap-y-4">
					<div className="space-y-2 min-w-0">
						<Label>Registro en listado</Label>
						<Select
							value={draft.activo}
							onValueChange={(v) => setDraft((d) => ({ ...d, activo: v as PolizaListFilters['activo'] }))}
						>
							<SelectTrigger>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{ACTIVO_OPTIONS.map((o) => (
									<SelectItem key={o.value} value={o.value}>
										{o.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					<div className="space-y-2 min-w-0">
						<Label>Compañía (aseguradora)</Label>
						<Select
							value={draft.aseguradora_id || '__all__'}
							onValueChange={(v) => setDraft((d) => ({ ...d, aseguradora_id: v === '__all__' ? '' : v }))}
						>
							<SelectTrigger>
								<SelectValue placeholder="Todas" />
							</SelectTrigger>
							<SelectContent className="max-h-60">
								<SelectItem value="__all__">Todas</SelectItem>
								{aseguradoras.map((a) => (
									<SelectItem key={a.id} value={a.id}>
										{a.nombre}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					<div className="space-y-2 min-w-0">
						<Label>Ramo</Label>
						<Select
							value={draft.ramo || '__all__'}
							onValueChange={(v) => setDraft((d) => ({ ...d, ramo: v === '__all__' ? '' : v }))}
						>
							<SelectTrigger className="min-w-0 w-full max-w-full [&>span]:text-left">
								<SelectValue placeholder="Todos" />
							</SelectTrigger>
							<SelectContent
								className="max-h-60 w-[var(--radix-select-trigger-width)] max-w-[var(--radix-select-trigger-width)] min-w-0"
								position="popper"
							>
								<SelectItem value="__all__" className="whitespace-normal break-words py-2 pr-2">
									Todos
								</SelectItem>
								{RAMOS_OPCIONES.map((r) => (
									<SelectItem key={r} value={r} className="min-w-0 whitespace-normal break-words py-2 pr-2">
										{r}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					<div className="space-y-2 min-w-0">
						<Label>Estatus de póliza</Label>
						<Select
							value={draft.estatus_poliza || '__all__'}
							onValueChange={(v) => setDraft((d) => ({ ...d, estatus_poliza: v === '__all__' ? '' : v }))}
						>
							<SelectTrigger>
								<SelectValue placeholder="Todos" />
							</SelectTrigger>
							<SelectContent>
								{ESTATUS_POLIZA_OPTIONS.map((o) => (
									<SelectItem key={o.value || '__all__'} value={o.value || '__all__'}>
										{o.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					<div className="space-y-2 min-w-0">
						<Label>Estatus de pago</Label>
						<Select
							value={draft.estatus_pago || '__all__'}
							onValueChange={(v) => setDraft((d) => ({ ...d, estatus_pago: v === '__all__' ? '' : v }))}
						>
							<SelectTrigger>
								<SelectValue placeholder="Todos" />
							</SelectTrigger>
							<SelectContent>
								{ESTATUS_PAGO_OPTIONS.map((o) => (
									<SelectItem key={o.value || '__all__'} value={o.value || '__all__'}>
										{o.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					<div className="space-y-2 min-w-0">
						<Label>Modalidad de pago</Label>
						<Select
							value={draft.modalidad_pago || '__all__'}
							onValueChange={(v) => setDraft((d) => ({ ...d, modalidad_pago: v === '__all__' ? '' : v }))}
						>
							<SelectTrigger>
								<SelectValue placeholder="Todas" />
							</SelectTrigger>
							<SelectContent>
								{MODALIDAD_OPTIONS.map((o) => (
									<SelectItem key={o.value || '__all__'} value={o.value || '__all__'}>
										{o.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
					</div>
				</div>
				<DialogFooter className="shrink-0 flex-col sm:flex-row gap-2 pt-4 border-t border-border">
					<Button type="button" variant="outline" size="sm" onClick={handleClear} className="gap-1.5 w-full sm:w-auto">
						<RotateCcw className="h-4 w-4" />
						Limpiar todo
					</Button>
					<div className="flex gap-2 w-full sm:w-auto sm:ml-auto">
						<Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)} className="flex-1 sm:flex-none">
							Cancelar
						</Button>
						<Button type="button" size="sm" onClick={handleApply} className="flex-1 sm:flex-none">
							Aplicar filtros
						</Button>
					</div>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}
