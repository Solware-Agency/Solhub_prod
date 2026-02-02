import React, { useEffect, useMemo, useState } from 'react'
import { SlidersHorizontal, CheckSquare, Square } from 'lucide-react'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from './dialog'
import { Button } from './button'
import { Checkbox } from './checkbox'
import { cn } from '@shared/lib/cn'

export interface ExportColumnOptionItem {
	key: string
	label: string
	group: string
}

interface ExportColumnsModalProps {
	open: boolean
	onOpenChange: (open: boolean) => void
	columnOptions: ExportColumnOptionItem[]
	selectedKeys: string[] | null
	onApply: (keys: string[]) => void
}

export const ExportColumnsModal: React.FC<ExportColumnsModalProps> = ({
	open,
	onOpenChange,
	columnOptions,
	selectedKeys,
	onApply,
}) => {
	const allKeys = useMemo(() => columnOptions.map((c) => c.key), [columnOptions])
	const [localSelected, setLocalSelected] = useState<string[]>(allKeys)

	useEffect(() => {
		if (open) {
			setLocalSelected(selectedKeys === null ? [...allKeys] : [...selectedKeys])
		}
	}, [open, selectedKeys, allKeys])

	const grouped = useMemo(() => {
		const map = new Map<string, ExportColumnOptionItem[]>()
		for (const opt of columnOptions) {
			const list = map.get(opt.group) ?? []
			list.push(opt)
			map.set(opt.group, list)
		}
		return Array.from(map.entries())
	}, [columnOptions])

	const allSelected = localSelected.length === allKeys.length
	const noneSelected = localSelected.length === 0

	const toggleKey = (key: string) => {
		setLocalSelected((prev) =>
			prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
		)
	}

	const selectAll = () => setLocalSelected([...allKeys])
	const selectNone = () => setLocalSelected([])

	const handleApply = () => {
		onApply(localSelected)
		onOpenChange(false)
	}

	const handleCancel = () => {
		onOpenChange(false)
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-lg bg-white/80 dark:bg-background/50 backdrop-blur-[2px] dark:backdrop-blur-[10px] max-h-[85vh] flex flex-col">
				<DialogHeader>
					<div className="flex items-center gap-3 mb-2">
						<div className="w-12 h-12 rounded-full flex items-center justify-center bg-blue-100 dark:bg-blue-900/20">
							<SlidersHorizontal className="w-6 h-6 text-blue-600 dark:text-blue-400" />
						</div>
						<div>
							<DialogTitle className="text-xl font-semibold">Personalizar columnas</DialogTitle>
							<DialogDescription className="text-sm text-muted-foreground mt-1">
								Selecciona las columnas que quieres incluir en el archivo Excel.
							</DialogDescription>
						</div>
					</div>
				</DialogHeader>

				<div className="flex gap-2 py-2 border-b border-border">
					<Button
						type="button"
						variant="outline"
						size="sm"
						onClick={selectAll}
						disabled={allSelected}
						className="flex items-center gap-1.5"
					>
						<CheckSquare className="w-4 h-4" />
						Seleccionar todo
					</Button>
					<Button
						type="button"
						variant="outline"
						size="sm"
						onClick={selectNone}
						disabled={noneSelected}
						className="flex items-center gap-1.5"
					>
						<Square className="w-4 h-4" />
						Quitar todo
					</Button>
				</div>

				<div className="flex-1 overflow-y-auto min-h-0 py-3 space-y-4">
					{grouped.map(([groupName, options]) => (
						<div key={groupName}>
							<h3 className="text-sm font-semibold text-foreground mb-2 sticky top-0 bg-background/95 dark:bg-background/95 py-1">
								{groupName}
							</h3>
							<ul className="space-y-2">
								{options.map((opt) => (
									<li key={opt.key} className="flex items-center gap-2">
										<Checkbox
											id={`export-col-${opt.key}`}
											checked={localSelected.includes(opt.key)}
											onCheckedChange={() => toggleKey(opt.key)}
										/>
										<label
											htmlFor={`export-col-${opt.key}`}
											className={cn(
												'text-sm cursor-pointer select-none',
												'text-muted-foreground hover:text-foreground',
											)}
										>
											{opt.label}
										</label>
									</li>
								))}
							</ul>
						</div>
					))}
				</div>

				<p className="text-xs text-muted-foreground">
					{localSelected.length} de {allKeys.length} columnas seleccionadas
				</p>

				<DialogFooter className="gap-2 border-t border-border pt-4">
					<Button variant="outline" onClick={handleCancel} className="flex-1 sm:flex-none">
						Cancelar
					</Button>
					<Button
						onClick={handleApply}
						disabled={localSelected.length === 0}
						className="flex-1 sm:flex-none bg-blue-600 hover:bg-blue-700 text-white"
					>
						Aplicar
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}
