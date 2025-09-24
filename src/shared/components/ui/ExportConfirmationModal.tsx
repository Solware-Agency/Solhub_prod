import React from 'react'
import { Download, FileSpreadsheet, AlertCircle } from 'lucide-react'
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
}

export const ExportConfirmationModal: React.FC<ExportConfirmationModalProps> = ({
	isOpen,
	onOpenChange,
	onConfirm,
	onCancel,
	casesCount,
	isLoading = false,
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
			return 'No hay casos que coincidan con los filtros actuales para exportar.'
		}
		return `¿Confirmar exportación de ${casesCount} casos filtrados?`
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
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<div className="flex items-center gap-3 mb-2">
						<div className={cn('w-12 h-12 rounded-full flex items-center justify-center', getIconBgColor())}>
							{getIcon()}
						</div>
						<div>
							<DialogTitle className="text-xl font-semibold">Confirmar Exportación</DialogTitle>
							<DialogDescription className="text-sm text-muted-foreground mt-1">
								{isLoading ? 'Preparando exportación...' : 'Se generará un archivo Excel con los datos filtrados'}
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
								<span className="font-medium">El archivo incluirá:</span>
							</div>
							<ul className="mt-2 text-xs text-blue-700 dark:text-blue-400 space-y-1 ml-6">
								<li>• Información del paciente y caso médico</li>
								<li>• Estado de pagos y montos</li>
								<li>• Datos de citología y EXCEL</li>
								<li>• Filtros aplicados en el nombre del archivo</li>
							</ul>
						</div>
					)}
				</div>

				<DialogFooter className="gap-2">
					<Button variant="outline" onClick={handleCancel} disabled={isLoading} className="flex-1 sm:flex-none">
						Cancelar
					</Button>
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
