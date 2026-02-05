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
import {
	createAsegurado,
	getAsegurados,
	updateAsegurado,
	type Asegurado,
} from '@services/supabase/aseguradoras/asegurados-service'
import { AseguradoDetailPanel } from '@features/aseguradoras/components/AseguradoDetailPanel'

const AseguradosPage = () => {
	const queryClient = useQueryClient()
	const { toast } = useToast()
	const [searchTerm, setSearchTerm] = useState('')
	const [currentPage, setCurrentPage] = useState(1)
	const [itemsPerPage, setItemsPerPage] = useState(32)
	const [openModal, setOpenModal] = useState(false)
	const [selectedAsegurado, setSelectedAsegurado] = useState<Asegurado | null>(null)
	const [panelOpen, setPanelOpen] = useState(false)
	const [panelSaving, setPanelSaving] = useState(false)
	const [form, setForm] = useState({
		full_name: '',
		document_id: '',
		phone: '',
		email: '',
		address: '',
		notes: '',
		tipo_asegurado: 'Persona natural' as 'Persona natural' | 'Persona jurídica',
	})
	const [saving, setSaving] = useState(false)

	const { data, isLoading, error } = useQuery({
		queryKey: ['asegurados', searchTerm, currentPage, itemsPerPage],
		queryFn: () => getAsegurados(currentPage, itemsPerPage, searchTerm),
		staleTime: 1000 * 60 * 5,
	})

	const asegurados = useMemo(() => data?.data ?? [], [data])
	const totalPages = data?.totalPages ?? 1

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
			full_name: '',
			document_id: '',
			phone: '',
			email: '',
			address: '',
			notes: '',
			tipo_asegurado: 'Persona natural',
		})
	}

	const openNewModal = () => {
		resetForm()
		setOpenModal(true)
	}

	const openDetailPanel = (row: Asegurado) => {
		setSelectedAsegurado(row)
		setPanelOpen(true)
	}

	const handlePanelSave = async (payload: Parameters<typeof updateAsegurado>[1]) => {
		if (!selectedAsegurado) return false
		setPanelSaving(true)
		try {
			const updated = await updateAsegurado(selectedAsegurado.id, payload)
			setSelectedAsegurado(updated)
			queryClient.invalidateQueries({ queryKey: ['asegurados'] })
			toast({ title: 'Asegurado actualizado' })
			return true
		} catch (err) {
			console.error(err)
			toast({ title: 'Error al guardar asegurado', variant: 'destructive' })
			return false
		} finally {
			setPanelSaving(false)
		}
	}

	const handleSave = async () => {
		setSaving(true)
		try {
			await createAsegurado(form)
			toast({ title: 'Asegurado creado' })
			queryClient.invalidateQueries({ queryKey: ['asegurados'] })
			setOpenModal(false)
			resetForm()
		} catch (err) {
			console.error(err)
			toast({ title: 'Error al guardar asegurado', variant: 'destructive' })
		} finally {
			setSaving(false)
		}
	}

	return (
		<div>
			<div className="mb-4 sm:mb-6 flex items-center justify-between gap-3">
				<div>
					<h1 className="text-2xl sm:text-3xl font-bold">Asegurados</h1>
					<div className="w-16 sm:w-24 h-1 bg-primary mt-2 rounded-full" />
				</div>
				<div className="flex gap-2">
					<Button
						variant="outline"
						onClick={() =>
							exportRowsToExcel(
								'asegurados',
								asegurados.map((row) => ({
									Nombre: row.full_name,
									Documento: row.document_id,
									Teléfono: row.phone,
									Email: row.email ?? '',
									Tipo: row.tipo_asegurado,
								})),
							)
						}
						className="gap-2"
					>
						<Download className="w-4 h-4" />
						Exportar
					</Button>
					<Button onClick={openNewModal} className="gap-2">
						<Plus className="w-4 h-4" />
						Nuevo asegurado
					</Button>
				</div>
			</div>

			<Card className="overflow-hidden">
				<div className="bg-white dark:bg-black/80 backdrop-blur-[10px] border-b border-gray-200 dark:border-gray-700 px-4 py-3">
					<div className="flex flex-col lg:flex-row lg:items-center gap-3">
						<div className="relative flex-1">
							<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
							<Input
								className="pl-9"
								placeholder="Buscar por nombre o documento"
								value={searchTerm}
								onChange={(e) => handleSearch(e.target.value)}
							/>
						</div>
						<div className="flex items-center gap-2 text-sm text-gray-500">
							<span>Filas:</span>
							<Select value={String(itemsPerPage)} onValueChange={handleItemsPerPage}>
								<SelectTrigger className="w-20">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="16">16</SelectItem>
									<SelectItem value="32">32</SelectItem>
									<SelectItem value="50">50</SelectItem>
								</SelectContent>
							</Select>
						</div>
					</div>
				</div>

				<div className="p-4 min-h-[320px]">
					{isLoading && <p className="text-sm text-gray-500">Cargando asegurados...</p>}
					{error && <p className="text-sm text-red-500">Error al cargar asegurados</p>}
					{!isLoading && !error && asegurados.length === 0 && (
						<p className="text-sm text-gray-500">No hay asegurados registrados.</p>
					)}
					<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
						{asegurados.map((row) => (
							<Card
								key={row.id}
								className="p-3 flex flex-col gap-2 cursor-pointer hover:border-primary hover:shadow-lg hover:shadow-primary/10 transition"
								onClick={() => openDetailPanel(row)}
							>
								<div>
									<p className="font-medium">{row.full_name}</p>
									<p className="text-sm text-gray-600 dark:text-gray-400">
										{row.document_id} · {row.phone}
									</p>
									<p className="text-xs text-gray-500">{row.email || 'Sin email'}</p>
								</div>
							</Card>
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
					className="max-w-xl bg-white/80 dark:bg-background/50 backdrop-blur-[2px] dark:backdrop-blur-[10px]"
					overlayClassName="bg-black/60"
				>
					<DialogHeader>
						<DialogTitle>Nuevo asegurado</DialogTitle>
					</DialogHeader>
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
						<div className="space-y-2">
							<Label>Tipo de asegurado</Label>
							<Select
								value={form.tipo_asegurado}
								onValueChange={(value) =>
									setForm((prev) => ({ ...prev, tipo_asegurado: value as 'Persona natural' | 'Persona jurídica' }))
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
						<div className="space-y-2">
							<Label>Teléfono</Label>
							<Input value={form.phone} onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))} />
						</div>
						<div className="space-y-2">
							<Label>Email</Label>
							<Input value={form.email} onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))} />
						</div>
						<div className="space-y-2 sm:col-span-2">
							<Label>Dirección</Label>
							<Input
								value={form.address}
								onChange={(e) => setForm((prev) => ({ ...prev, address: e.target.value }))}
							/>
						</div>
						<div className="space-y-2 sm:col-span-2">
							<Label>Notas internas</Label>
							<Input value={form.notes} onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))} />
						</div>
					</div>
					<DialogFooter>
						<Button variant="outline" onClick={() => setOpenModal(false)}>
							Cancelar
						</Button>
						<Button onClick={handleSave} disabled={saving}>
							{saving ? 'Guardando...' : 'Guardar'}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			<AseguradoDetailPanel
				asegurado={selectedAsegurado}
				isOpen={panelOpen}
				onClose={() => setPanelOpen(false)}
				onSave={handlePanelSave}
				saving={panelSaving}
			/>
		</div>
	)
}

export default AseguradosPage
