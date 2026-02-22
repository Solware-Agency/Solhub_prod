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
import { Plus, Download, Search, ChevronLeft, ChevronRight } from 'lucide-react'
import { exportRowsToExcel } from '@shared/utils/exportToExcel'
import AseguradoraCard from '@features/aseguradoras/components/AseguradoraCard'
import { AseguradoraHistoryModal } from '@features/aseguradoras/components/AseguradoraHistoryModal'
import {
	createAseguradora,
	getAseguradoras,
	type Aseguradora,
} from '@services/supabase/aseguradoras/aseguradoras-service'

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
		rif: '',
		telefono: '',
		email: '',
		web: '',
		direccion: '',
		activo: true,
	})
	const [saving, setSaving] = useState(false)

	const { data, isLoading, error } = useQuery({
		queryKey: ['aseguradoras-catalogo'],
		queryFn: getAseguradoras,
		staleTime: 1000 * 60 * 5,
	})

	const catalogo = useMemo(() => data ?? [], [data])
	const filteredCatalogo = useMemo(() => {
		if (!searchTerm.trim()) return catalogo
		const q = searchTerm.trim().toLowerCase()
		return catalogo.filter(
			(row) =>
				row.nombre.toLowerCase().includes(q) ||
				(row.codigo_interno || '').toLowerCase().includes(q) ||
				(row.email || '').toLowerCase().includes(q) ||
				(row.rif || '').toLowerCase().includes(q),
		)
	}, [catalogo, searchTerm])
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

	const handleItemsPerPage = useCallback((value: string) => {
		const parsed = Number(value)
		if (!Number.isNaN(parsed)) {
			setItemsPerPage(parsed)
			setCurrentPage(1)
		}
	}, [])

	const resetForm = () => {
		setForm({
			nombre: '',
			codigo_interno: '',
			rif: '',
			telefono: '',
			email: '',
			web: '',
			direccion: '',
			activo: true,
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

	const isValidEmail = (value: string): boolean =>
		/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())

	const getValidationErrors = (): string[] => {
		const err: string[] = []
		if (!form.nombre?.trim()) err.push('Nombre')
		if (!form.codigo_interno?.trim()) err.push('Código interno')
		if (!form.rif?.trim()) err.push('RIF')
		if (!form.telefono?.trim()) err.push('Teléfono')
		if (!form.email?.trim()) {
			err.push('Email')
		} else if (!isValidEmail(form.email)) {
			err.push('Email (formato inválido; use ej: nombre@dominio.com)')
		}
		if (!form.web?.trim()) err.push('Web')
		if (!form.direccion?.trim()) err.push('Dirección')
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
			await createAseguradora(form)
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
							<span>Filas:</span>
							<Select value={String(itemsPerPage)} onValueChange={handleItemsPerPage}>
								<SelectTrigger className="w-20">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="8">8</SelectItem>
									<SelectItem value="16">16</SelectItem>
									<SelectItem value="32">32</SelectItem>
								</SelectContent>
							</Select>
							<Button
								variant="outline"
								size="sm"
								onClick={() =>
									exportRowsToExcel(
										'aseguradoras',
										filteredCatalogo.map((row) => ({
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
								}
								className="gap-1.5 sm:gap-2 shrink-0"
								title="Exportar"
							>
								<Download className="w-4 h-4 shrink-0" />
								<span className="hidden sm:inline">Exportar</span>
							</Button>
							<Button size="sm" onClick={openNewModal} className="gap-1.5 sm:gap-2 shrink-0" title="Nueva aseguradora">
								<Plus className="w-4 h-4 shrink-0" />
								<span className="hidden sm:inline">Nueva aseguradora</span>
							</Button>
						</div>
					</div>
				</div>

				<div className="p-4 min-h-[320px]">
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
					className="w-[calc(100vw-2rem)] max-w-xl max-h-[90dvh] flex flex-col p-4 sm:p-6 bg-white/80 dark:bg-background/50 backdrop-blur-[2px] dark:backdrop-blur-[10px]"
					overlayClassName="bg-black/60"
				>
					<DialogHeader className="shrink-0">
						<DialogTitle className="text-base sm:text-lg">Nueva aseguradora</DialogTitle>
					</DialogHeader>
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 overflow-y-auto min-h-0 py-1">
						<div className="space-y-2">
							<Label>Nombre <span className="text-destructive">*</span></Label>
							<Input
								placeholder="Ej: Seguros La Previsora C.A."
								value={form.nombre}
								onChange={(e) => setForm((prev) => ({ ...prev, nombre: e.target.value }))}
							/>
						</div>
						<div className="space-y-2">
							<Label>Código interno <span className="text-destructive">*</span></Label>
							<Input
								placeholder="Ej: PREV-01"
								value={form.codigo_interno}
								onChange={(e) => setForm((prev) => ({ ...prev, codigo_interno: e.target.value }))}
							/>
						</div>
						<div className="space-y-2">
							<Label>RIF <span className="text-destructive">*</span></Label>
							<Input
								placeholder="Ej: J-12345678-9"
								value={form.rif}
								onChange={(e) => setForm((prev) => ({ ...prev, rif: e.target.value }))}
							/>
						</div>
						<div className="space-y-2">
							<Label>Teléfono <span className="text-destructive">*</span></Label>
							<Input
								placeholder="Ej: 0212-1234567"
								value={form.telefono}
								onChange={(e) => setForm((prev) => ({ ...prev, telefono: e.target.value }))}
							/>
						</div>
						<div className="space-y-2">
							<Label>Email <span className="text-destructive">*</span></Label>
							<Input
								type="email"
								autoComplete="email"
								placeholder="ej: nombre@dominio.com"
								value={form.email}
								onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
							/>
						</div>
						<div className="space-y-2">
							<Label>Web <span className="text-destructive">*</span></Label>
							<Input
								placeholder="Ej: https://www.aseguradora.com"
								value={form.web}
								onChange={(e) => setForm((prev) => ({ ...prev, web: e.target.value }))}
							/>
						</div>
						<div className="space-y-2 sm:col-span-2">
							<Label>Dirección <span className="text-destructive">*</span></Label>
							<Input
								placeholder="Ej: Av. Principal, Torre Corporativa, piso 5"
								value={form.direccion}
								onChange={(e) => setForm((prev) => ({ ...prev, direccion: e.target.value }))}
							/>
						</div>
						<div className="space-y-2">
							<Label>Activo <span className="text-destructive">*</span></Label>
							<Select
								value={form.activo ? 'true' : 'false'}
								onValueChange={(value) =>
									setForm((prev) => ({ ...prev, activo: value === 'true' }))
								}
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
