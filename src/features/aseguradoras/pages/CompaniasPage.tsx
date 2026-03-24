import React, { useMemo, useState, useCallback } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '@shared/components/ui/button'
import { Card } from '@shared/components/ui/card'
import { Input } from '@shared/components/ui/input'
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogFooter,
} from '@shared/components/ui/dialog'
import { Label } from '@shared/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@shared/components/ui/select'
import { useToast } from '@shared/hooks/use-toast'
import { Plus, Download, Search, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'
import { exportRowsToExcel } from '@shared/utils/exportToExcel'
import AseguradoraCard from '@features/aseguradoras/components/AseguradoraCard'
import { AseguradoraHistoryModal } from '@features/aseguradoras/components/AseguradoraHistoryModal'
import {
	createAseguradora,
	getAseguradoras,
	getAllAseguradorasForExport,
	type Aseguradora,
} from '@services/supabase/aseguradoras/aseguradoras-service'

function filterAseguradorasCatalog(rows: Aseguradora[], term: string): Aseguradora[] {
	if (!term.trim()) return rows
	const q = term.trim().toLowerCase()
	return rows.filter(
		(row) =>
			row.nombre.toLowerCase().includes(q) ||
			(row.codigo_interno || '').toLowerCase().includes(q) ||
			(row.email || '').toLowerCase().includes(q) ||
			(row.rif || '').toLowerCase().includes(q),
	)
}

const CompaniasPage = () => {
	const queryClient = useQueryClient()
	const { toast } = useToast()
	const [searchTerm, setSearchTerm] = useState('')
	const [currentPage, setCurrentPage] = useState(1)
	const [itemsPerPage, setItemsPerPage] = useState(16)
	const [openModal, setOpenModal] = useState(false)
	const [selectedAseguradora, setSelectedAseguradora] = useState<Aseguradora | null>(null)
	const [historyModalOpen, setHistoryModalOpen] = useState(false)
	const [form, setForm] = useState({
		nombre: '',
		codigo_interno: '',
		rif_numero: '',
		telefono: '',
		email: '',
		web: '',
		direccion: '',
		estado: '' as '' | 'activo' | 'inactivo',
	})
	const [saving, setSaving] = useState(false)
	const [isExporting, setIsExporting] = useState(false)

	const { data, isLoading, error } = useQuery({
		queryKey: ['aseguradoras-catalogo'],
		queryFn: getAseguradoras,
		staleTime: 1000 * 60 * 5,
	})

	const catalogo = useMemo(() => data ?? [], [data])
	const filteredCatalogo = useMemo(() => filterAseguradorasCatalog(catalogo, searchTerm), [catalogo, searchTerm])
	const totalPages = Math.max(1, Math.ceil(filteredCatalogo.length / itemsPerPage))
	const pageData = useMemo(() => {
		const from = (currentPage - 1) * itemsPerPage
		return filteredCatalogo.slice(from, from + itemsPerPage)
	}, [filteredCatalogo, currentPage, itemsPerPage])

	const handleSearch = useCallback((value: string) => {
		setSearchTerm(value)
		setCurrentPage(1)
	}, [])

	const handlePageChange = useCallback((page: number) => {
		setCurrentPage(page)
	}, [])

	const handleExportExcel = useCallback(async () => {
		setIsExporting(true)
		try {
			const all = await getAllAseguradorasForExport()
			const rows = filterAseguradorasCatalog(all, searchTerm)
			if (rows.length === 0) {
				toast({
					title: 'Sin datos para exportar',
					description: 'No hay compañías que coincidan con la búsqueda.',
				})
				return
			}
			exportRowsToExcel(
				'aseguradoras',
				rows.map((row) => ({
					Código: row.codigo ?? '',
					Nombre: row.nombre,
					'Código interno': row.codigo_interno || '',
					RIF: row.rif || '',
					Teléfono: row.telefono || '',
					Email: row.email || '',
					Web: row.web || '',
					Activo: row.activo ? 'Activo' : 'Inactivo',
				})),
			)
			toast({
				title: 'Exportación lista',
				description: `Se exportaron ${rows.length} compañía${rows.length === 1 ? '' : 's'}.`,
			})
		} catch (e) {
			console.error(e)
			toast({
				title: 'Error al exportar',
				description: 'No se pudo generar el archivo. Inténtalo de nuevo.',
				variant: 'destructive',
			})
		} finally {
			setIsExporting(false)
		}
	}, [searchTerm, toast])

	const resetForm = () => {
		setForm({
			nombre: '',
			codigo_interno: '',
			rif_numero: '',
			telefono: '',
			email: '',
			web: '',
			direccion: '',
			estado: '',
		})
	}

	const openNewModal = () => {
		resetForm()
		setOpenModal(true)
	}

	const openHistoryModal = (row: Aseguradora) => {
		setSelectedAseguradora(row)
		setHistoryModalOpen(true)
	}

	const handleAseguradoraUpdated = useCallback((updated: Aseguradora) => {
		setSelectedAseguradora(updated)
		queryClient.invalidateQueries({ queryKey: ['aseguradoras-catalogo'] })
	}, [queryClient])

	/** Solo caracteres válidos en correo: letras, números, @ . - _ + */
	const isValidEmailChar = (char: string) => /[a-zA-Z0-9@._+-]/.test(char)
	const isValidEmail = (value: string): boolean => {
		const t = value.trim()
		if (!t.includes('@')) return false
		return /^[a-zA-Z0-9._+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(t)
	}

	const buildRif = (): string => {
		const n = form.rif_numero.replace(/\D/g, '')
		if (!n) return ''
		if (n.length === 9) return `J-${n.slice(0, 8)}-${n.slice(8)}`
		return `J-${n}`
	}

	const getValidationErrors = (): string[] => {
		const err: string[] = []
		if (!form.nombre?.trim()) err.push('Nombre')
		if (!form.codigo_interno?.trim()) err.push('Código interno')
		if (!form.rif_numero?.trim()) err.push('RIF')
		if (!form.telefono?.trim()) err.push('Teléfono')
		if (!form.email?.trim()) {
			err.push('Email')
		} else if (!form.email.includes('@')) {
			err.push('Email debe contener @')
		} else if (!isValidEmail(form.email)) {
			err.push('Email con formato inválido')
		}
		if (!form.web?.trim()) err.push('Web')
		if (!form.direccion?.trim()) err.push('Dirección')
		if (!form.estado) err.push('Estado')
		return err
	}

	const handleSave = async () => {
		const errors = getValidationErrors()
		if (errors.length > 0) {
			toast({
				title: 'Campos obligatorios',
				description: `Complete: ${errors.join(', ')}`,
				variant: 'destructive',
			})
			return
		}
		setSaving(true)
		try {
			await createAseguradora({
				nombre: form.nombre,
				codigo_interno: form.codigo_interno,
				rif: buildRif(),
				telefono: form.telefono,
				email: form.email,
				web: form.web,
				direccion: form.direccion,
				activo: form.estado === 'activo',
			})
			toast({ title: 'Aseguradora creada' })
			queryClient.invalidateQueries({ queryKey: ['aseguradoras-catalogo'] })
			setOpenModal(false)
			resetForm()
		} catch (err) {
			console.error(err)
			toast({ title: 'Error al guardar aseguradora', variant: 'destructive' })
		} finally {
			setSaving(false)
		}
	}

	return (
		<div>
			<div className="mb-4 sm:mb-6">
				<h1 className="text-2xl sm:text-3xl font-bold">Compañías aseguradoras</h1>
				<div className="w-16 sm:w-24 h-1 bg-primary mt-2 rounded-full" />
			</div>

			<Card className="overflow-hidden">
				<div className="bg-white dark:bg-black/80 backdrop-blur-[10px] border-b border-gray-200 dark:border-gray-700 px-4 py-3">
					<div className="flex flex-col lg:flex-row lg:items-center gap-3">
						<div className="relative flex-1 min-w-0">
							<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
							<Input
								className="pl-9"
								placeholder="Buscar por nombre, código o RIF"
								value={searchTerm}
								onChange={(e) => handleSearch(e.target.value)}
							/>
						</div>
						<div className="flex items-center gap-2 text-sm text-gray-500 flex-wrap">
							<Button
								variant="outline"
								size="sm"
								onClick={() => void handleExportExcel()}
								disabled={isExporting}
								className="gap-1.5 sm:gap-2 shrink-0"
								title="Exportar todas las compañías activas (según búsqueda)"
							>
								{isExporting ? (
									<Loader2 className="w-4 h-4 shrink-0 animate-spin" />
								) : (
									<Download className="w-4 h-4 shrink-0" />
								)}
								<span className="hidden sm:inline">{isExporting ? 'Exportando…' : 'Exportar'}</span>
							</Button>
							<Button size="sm" onClick={openNewModal} className="gap-1.5 sm:gap-2 shrink-0" title="Nueva aseguradora">
								<Plus className="w-4 h-4 shrink-0" />
								<span className="hidden sm:inline">Nueva aseguradora</span>
							</Button>
						</div>
					</div>
				</div>

				<div className="p-4 min-h-80">
					{isLoading && <p className="text-sm text-gray-500">Cargando catálogo...</p>}
					{error && <p className="text-sm text-red-500">Error al cargar catálogo</p>}
					{!isLoading && !error && filteredCatalogo.length === 0 && (
						<p className="text-sm text-gray-500">No hay aseguradoras registradas.</p>
					)}
					<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
						{pageData.map((row) => (
							<AseguradoraCard key={row.id} aseguradora={row} onClick={() => openHistoryModal(row)} />
						))}
					</div>
				</div>

				<div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-gray-700">
					<div className="text-sm text-gray-600 dark:text-gray-400">
						Página {currentPage} de {totalPages}
					</div>
					<div className="flex gap-2">
						<Button
							variant="outline"
							size="sm"
							disabled={currentPage <= 1}
							onClick={() => handlePageChange(currentPage - 1)}
						>
							<ChevronLeft className="w-4 h-4" />
						</Button>
						<Button
							variant="outline"
							size="sm"
							disabled={currentPage >= totalPages}
							onClick={() => handlePageChange(currentPage + 1)}
						>
							<ChevronRight className="w-4 h-4" />
						</Button>
					</div>
				</div>
			</Card>

			<Dialog open={openModal} onOpenChange={setOpenModal}>
				<DialogContent
					className="w-[calc(100vw-2rem)] max-w-xl max-h-[90dvh] flex flex-col rounded-2xl sm:rounded-xl p-4 sm:p-6 bg-white/80 dark:bg-background/50 backdrop-blur-[2px] dark:backdrop-blur-[10px]"
					overlayClassName="bg-black/60"
				>
					<DialogHeader className="shrink-0">
						<DialogTitle className="text-base sm:text-lg">Nueva aseguradora</DialogTitle>
					</DialogHeader>
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 overflow-y-auto min-h-0 py-1">
						<div className="space-y-2">
							<Label>Nombre <span className="text-destructive">*</span></Label>
							<Input
								placeholder="Seguros La Previsora C.A."
								value={form.nombre}
								onChange={(e) => setForm((prev) => ({ ...prev, nombre: e.target.value }))}
							/>
						</div>
						<div className="space-y-2">
							<Label>Código interno <span className="text-destructive">*</span></Label>
							<Input
								placeholder="PREV-01"
								value={form.codigo_interno}
								onChange={(e) => setForm((prev) => ({ ...prev, codigo_interno: e.target.value }))}
							/>
						</div>
						<div className="space-y-2">
							<Label>RIF <span className="text-destructive">*</span></Label>
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
								/>
							</div>
						</div>
						<div className="space-y-2">
							<Label>Teléfono <span className="text-destructive">*</span></Label>
							<Input
								placeholder="02121234567"
								value={form.telefono}
								onChange={(e) => {
									const onlyNumbers = e.target.value.replace(/\D/g, '')
									setForm((prev) => ({ ...prev, telefono: onlyNumbers }))
								}}
								inputMode="numeric"
							/>
						</div>
						<div className="space-y-2">
							<Label>Email <span className="text-destructive">*</span></Label>
							<Input
								type="email"
								autoComplete="email"
								placeholder="nombre@dominio.com"
								value={form.email}
								onChange={(e) => {
									const filtered = [...e.target.value].filter((c) => isValidEmailChar(c)).join('')
									setForm((prev) => ({ ...prev, email: filtered }))
								}}
							/>
						</div>
						<div className="space-y-2">
							<Label>Web <span className="text-destructive">*</span></Label>
							<Input
								placeholder="https://www.aseguradora.com"
								value={form.web}
								onChange={(e) => setForm((prev) => ({ ...prev, web: e.target.value }))}
							/>
						</div>
						<div className="space-y-2 sm:col-span-2">
							<Label>Dirección <span className="text-destructive">*</span></Label>
							<Input
								placeholder="Av. Principal, Torre Corporativa, piso 5"
								value={form.direccion}
								onChange={(e) => setForm((prev) => ({ ...prev, direccion: e.target.value }))}
							/>
						</div>
						<div className="space-y-2">
							<Label>Estado <span className="text-destructive">*</span></Label>
							<Select
								value={form.estado}
								onValueChange={(value) => setForm((prev) => ({ ...prev, estado: value as 'activo' | 'inactivo' }))}
							>
								<SelectTrigger>
									<SelectValue placeholder="Seleccione" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="activo">Activo</SelectItem>
									<SelectItem value="inactivo">Inactivo</SelectItem>
								</SelectContent>
							</Select>
						</div>
					</div>
					<DialogFooter className="shrink-0 flex-col-reverse sm:flex-row gap-2 pt-2 border-t border-gray-200 dark:border-gray-700 mt-2">
						<Button variant="outline" onClick={() => setOpenModal(false)} className="w-full sm:w-auto">
							Cancelar
						</Button>
						<Button onClick={handleSave} disabled={saving} className="w-full sm:w-auto">
							{saving ? 'Guardando...' : 'Guardar'}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			<AseguradoraHistoryModal
				isOpen={historyModalOpen}
				onClose={() => setHistoryModalOpen(false)}
				aseguradora={selectedAseguradora}
				onAseguradoraUpdated={handleAseguradoraUpdated}
			/>
		</div>
	)
}

export default CompaniasPage
