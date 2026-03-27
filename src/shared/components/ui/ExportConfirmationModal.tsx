import React from 'react'
import { Download, FileSpreadsheet, AlertCircle, SlidersHorizontal } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './dialog'
import { Button } from './button'
import { cn } from '@shared/lib/cn'

interface ExportConfirmationModalProps {
	isOpen: boolean
	onOpenChange: (open: boolean) => void
	onConfirm: () => void
	onCancel: () => void
	casesCount: number
	isLoading?: boolean
	onPersonalize?: () => void
	selectedColumnCount?: number | null
	/** Texto después del número: singular (1) / plural (≠1). Por defecto caso(s) filtrado(s). */
	recordsNoun?: { singular: string; plural: string }
	/** Líneas del recuadro azul. `undefined` = bullets por defecto (casos médicos); `[]` = ocultar lista. */
	summaryBullets?: string[] | undefined
}

const DEFAULT_RECORDS_NOUN = { singular: 'caso filtrado', plural: 'casos filtrados' }

const DEFAULT_SUMMARY_BULLETS = [
	'Información del paciente y caso médico',
	'Estado de pagos y montos',
	'Datos de citología y EXCEL',
	'Filtros aplicados en el nombre del archivo',
]

export const ExportConfirmationModal: React.FC<ExportConfirmationModalProps> = ({
	isOpen,
	onOpenChange,
	onConfirm,
	onCancel,
	casesCount,
	isLoading = false,
	onPersonalize,
	selectedColumnCount,
	recordsNoun = DEFAULT_RECORDS_NOUN,
	summaryBullets,
}) => {
	const handleConfirm = () => {
		onConfirm()
		onOpenChange(false)
	}

	const handleCancel = () => {
		onCancel()
		onOpenChange(false)
	}

	const getMessage = () => {
		if (casesCount === 0) {
			return `No hay ${recordsNoun.plural} que coincidan con los filtros actuales para exportar.`
		}
		const noun = casesCount === 1 ? recordsNoun.singular : recordsNoun.plural
		return `¿Confirmar exportación de ${casesCount} ${noun}?`
	}

	const getIcon = () => {
		if (casesCount === 0) {
			return <AlertCircle className="w-6 h-6 text-amber-600 dark:text-amber-400" />
		}
		return <FileSpreadsheet className="w-6 h-6 text-blue-600 dark:text-blue-400" />
	}

	const getIconBgColor = () => {
		if (casesCount === 0) {
			return 'bg-amber-100 dark:bg-amber-900/20'
		}
		return 'bg-blue-100 dark:bg-blue-900/20'
	}

	return (
		<Dialog open={isOpen} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-md bg-white/80 dark:bg-background/50 backdrop-blur-[2px] dark:backdrop-blur-[10px]">
				<DialogHeader>
					<div className="flex items-center gap-3 mb-2">
						<div className={cn('w-12 h-12 rounded-full flex items-center justify-center', getIconBgColor())}>
							{getIcon()}
						</div>
						<div>
							<DialogTitle className="text-xl font-semibold">Confirmar Exportación</DialogTitle>
							<DialogDescription className="text-sm text-muted-foreground mt-1">
								{isLoading
									? 'Preparando exportación...'
									: selectedColumnCount != null
										? `Se generará un archivo Excel con ${selectedColumnCount} columnas seleccionadas.`
										: 'Se generará un archivo Excel con los datos filtrados'}
							</DialogDescription>
						</div>
					</div>
				</DialogHeader>

				<div className="py-4">
					<p className="text-gray-700 dark:text-gray-300 leading-relaxed">{getMessage()}</p>

					{casesCount > 0 && (
						<div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
							<div className="flex items-center gap-2 text-sm text-blue-800 dark:text-blue-300">
								<Download className="w-4 h-4" />
								<span className="font-medium">
									{selectedColumnCount != null
										? `Exportación personalizada: ${selectedColumnCount} columnas seleccionadas`
										: 'El archivo incluirá:'}
								</span>
							</div>
							{selectedColumnCount == null &&
								(summaryBullets === undefined ? DEFAULT_SUMMARY_BULLETS : summaryBullets).length >
									0 && (
								<ul className="mt-2 text-xs text-blue-700 dark:text-blue-400 space-y-1 ml-6">
									{(summaryBullets === undefined ? DEFAULT_SUMMARY_BULLETS : summaryBullets).map(
										(line) => (
											<li key={line}>• {line}</li>
										),
									)}
								</ul>
							)}
						</div>
					)}
				</div>

				<DialogFooter className="gap-2 flex-wrap">
					<Button variant="outline" onClick={handleCancel} disabled={isLoading} className="flex-1 sm:flex-none">
						Cancelar
					</Button>
					{casesCount > 0 && onPersonalize && (
						<Button
							variant="outline"
							onClick={onPersonalize}
							disabled={isLoading}
							className="flex-1 sm:flex-none"
						>
							<SlidersHorizontal className="w-4 h-4 mr-2" />
							Personalizar
						</Button>
					)}
					<Button
						onClick={handleConfirm}
						disabled={isLoading || casesCount === 0}
						className="flex-1 sm:flex-none bg-blue-600 hover:bg-blue-700 text-white"
					>
						{isLoading ? (
							<>
								<div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
								Exportando...
							</>
						) : (
							<>
								<Download className="w-4 h-4 mr-2" />
								Exportar
							</>
						)}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}
