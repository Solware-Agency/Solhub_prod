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
import {
	defaultAseguradoraListFilters,
	type AseguradoraListFilters,
} from '@services/supabase/aseguradoras/aseguradoras-service'

const ACTIVO_OPTIONS: { value: AseguradoraListFilters['activo']; label: string }[] = [
	{ value: 'activas', label: 'Solo activas (en listado)' },
	{ value: 'inactivas', label: 'Solo inactivas (eliminadas)' },
	{ value: 'all', label: 'Todas' },
]

export interface AseguradoraFiltersModalProps {
	isOpen: boolean
	onOpenChange: (open: boolean) => void
	appliedFilters: AseguradoraListFilters
	onApply: (filters: AseguradoraListFilters) => void
}

export const AseguradoraFiltersModal: React.FC<AseguradoraFiltersModalProps> = ({
	isOpen,
	onOpenChange,
	appliedFilters,
	onApply,
}) => {
	const [draft, setDraft] = useState<AseguradoraListFilters>(appliedFilters)

	useEffect(() => {
		if (isOpen) {
			setDraft({ ...appliedFilters })
		}
	}, [isOpen, appliedFilters])

	const handleClear = () => {
		setDraft(defaultAseguradoraListFilters())
	}

	const handleApply = () => {
		onApply({ ...draft })
		onOpenChange(false)
	}

	return (
		<Dialog open={isOpen} onOpenChange={onOpenChange}>
			<DialogContent
				className="w-[calc(100vw-2rem)] max-w-md max-h-[90dvh] flex flex-col rounded-2xl sm:rounded-xl p-4 sm:p-6 gap-0 bg-white/80 dark:bg-background/50 backdrop-blur-[2px] dark:backdrop-blur-[10px]"
				overlayClassName="bg-black/60"
			>
				<DialogHeader className="shrink-0 pb-2">
					<DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
						<Filter className="h-5 w-5 shrink-0" />
						Filtros de aseguradoras
					</DialogTitle>
				</DialogHeader>
				<div className="overflow-y-auto min-h-0 py-4 flex-1">
					<div className="space-y-2">
						<Label>Estado de registro</Label>
						<Select
							value={draft.activo}
							onValueChange={(v) => setDraft((d) => ({ ...d, activo: v as AseguradoraListFilters['activo'] }))}
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
				</div>
				<DialogFooter className="shrink-0 pt-2 flex-row justify-end gap-2 sm:gap-2">
					<Button variant="outline" onClick={handleClear} className="gap-2">
						<RotateCcw className="h-4 w-4" />
						Resetear
					</Button>
					<Button onClick={handleApply} className="gap-2">
						<Filter className="h-4 w-4" />
						Aplicar filtros
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}
