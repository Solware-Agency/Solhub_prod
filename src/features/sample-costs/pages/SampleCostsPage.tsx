import React, { useEffect, useState, useCallback, useMemo } from 'react'
import { useLaboratory } from '@/app/providers/LaboratoryContext'
import { useUserProfile } from '@shared/hooks/useUserProfile'
import {
	getSampleTypeCostsByLaboratory,
	updateSampleTypeCost,
	createSampleTypeCost,
	deleteSampleTypeCost,
	type SampleTypeCost,
} from '@services/supabase/laboratories/sample-type-costs-service'
import { updateLaboratoryConfig } from '@services/supabase/laboratories/laboratories-service'
import { Card, CardContent, CardHeader, CardTitle } from '@shared/components/ui/card'
import { Button } from '@shared/components/ui/button'
import { Input } from '@shared/components/ui/input'
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogFooter,
} from '@shared/components/ui/dialog'
import { Label } from '@shared/components/ui/label'
import { useToast } from '@shared/hooks/use-toast'
import { Loader2, Save, Plus, Trash2, Percent, Search, Download, FileText } from 'lucide-react'
import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

const DEFAULT_CONVENIO_PCT = 5
const DEFAULT_DESCUENTO_PCT = 10

const SampleCostsPage: React.FC = () => {
	const { laboratory, refreshLaboratory } = useLaboratory()
	const { profile } = useUserProfile()
	const { toast } = useToast()
	const hasSampleTypeCosts = !!laboratory?.features?.hasSampleTypeCosts
	const canEdit =
		(profile?.role === 'owner' || profile?.role === 'prueba') && hasSampleTypeCosts && !!laboratory?.id
	const isOwner = profile?.role === 'owner'

	const convenioDiscountPercent = laboratory?.config?.convenioDiscountPercent ?? DEFAULT_CONVENIO_PCT
	const descuentoDiscountPercent = laboratory?.config?.descuentoDiscountPercent ?? DEFAULT_DESCUENTO_PCT
	const factorConvenios = (100 - convenioDiscountPercent) / 100
	const factorDescuento = (100 - descuentoDiscountPercent) / 100

	const [costs, setCosts] = useState<SampleTypeCost[]>([])
	const [loading, setLoading] = useState(true)
	const [editing, setEditing] = useState<Record<string, { taquilla: string }>>({})
	const [savingAll, setSavingAll] = useState(false)
	const [deletingCode, setDeletingCode] = useState<string | null>(null)
	const [openAddModal, setOpenAddModal] = useState(false)
	const [addCode, setAddCode] = useState('')
	const [addName, setAddName] = useState('')
	const [addTaquilla, setAddTaquilla] = useState('')
	const [addOnlyTaquilla, setAddOnlyTaquilla] = useState(false)
	const [savingNew, setSavingNew] = useState(false)
	const [openPercentModal, setOpenPercentModal] = useState(false)
	const [editConvenioPct, setEditConvenioPct] = useState(String(convenioDiscountPercent))
	const [editDescuentoPct, setEditDescuentoPct] = useState(String(descuentoDiscountPercent))
	const [savingPercent, setSavingPercent] = useState(false)
	const [searchTerm, setSearchTerm] = useState('')
	const [openExportModal, setOpenExportModal] = useState(false)

	const filteredCosts = useMemo(() => {
		if (!searchTerm.trim()) return costs
		const q = searchTerm.trim().toLowerCase()
		return costs.filter(
			(row) =>
				(row.code?.toLowerCase() ?? '').includes(q) || (row.name?.toLowerCase() ?? '').includes(q),
		)
	}, [costs, searchTerm])

	const loadCosts = useCallback(() => {
		if (!laboratory?.id) return
		setLoading(true)
		getSampleTypeCostsByLaboratory(laboratory.id).then((res) => {
			setLoading(false)
			if (res.success && res.data) setCosts(res.data)
			else setCosts([])
		})
	}, [laboratory?.id])

	useEffect(() => {
		loadCosts()
	}, [loadCosts])

	const round2 = (value: number) => Number(value.toFixed(2))

	const setEdit = (code: string, value: string) => {
		setEditing((prev) => {
			return {
				...prev,
				[code]: { ...prev[code], taquilla: value },
			}
		})
	}

	const hasRowPriceChanged = (row: SampleTypeCost): boolean => {
		const ed = editing[row.code]
		if (!ed || ed.taquilla === undefined || ed.taquilla === '') return false
		const newVal = parseFloat(ed.taquilla)
		if (isNaN(newVal)) return false
		const original = row.price_taquilla
		if (original == null) return true
		return round2(newVal) !== round2(original)
	}

	const getDisplayValue = (row: SampleTypeCost, field: 'taquilla' | 'convenios' | 'descuento') => {
		const ed = editing[row.code]
		const onlyTaquilla = row.price_convenios == null && row.price_descuento == null
		if (field === 'taquilla') {
			if (ed && ed.taquilla !== undefined && ed.taquilla !== '') return ed.taquilla
			return row.price_taquilla != null ? String(row.price_taquilla) : ''
		}
		if (onlyTaquilla) return ''
		const base = ed?.taquilla !== undefined && ed.taquilla !== '' ? parseFloat(ed.taquilla) : row.price_taquilla
		if (base == null || isNaN(base)) return ''
		const calc = field === 'convenios' ? round2(base * factorConvenios) : round2(base * factorDescuento)
		return String(calc)
	}

	const rowsWithChanges = costs.filter((row) => hasRowPriceChanged(row))
	const hasAnyChanges = rowsWithChanges.length > 0

	const handleSaveAll = async () => {
		if (!laboratory?.id || !hasAnyChanges) return
		setSavingAll(true)
		let ok = 0
		let err = false
		for (const row of rowsWithChanges) {
			const ed = editing[row.code]
			const taquilla = ed?.taquilla !== undefined && ed.taquilla !== '' ? parseFloat(ed.taquilla) : undefined
			const onlyTaquilla = row.price_convenios == null && row.price_descuento == null
			if (taquilla === undefined || isNaN(taquilla)) continue
			const convenios = onlyTaquilla ? null : round2(taquilla * factorConvenios)
			const descuento = onlyTaquilla ? null : round2(taquilla * factorDescuento)
			const res = await updateSampleTypeCost(laboratory.id, row.code, {
				price_taquilla: taquilla,
				...(onlyTaquilla ? {} : { price_convenios: convenios, price_descuento: descuento }),
			})
			if (res.success) {
				ok++
				setEditing((prev) => {
					const next = { ...prev }
					delete next[row.code]
					return next
				})
			} else {
				err = true
				toast({ title: 'Error', description: res.error ?? `No se pudo guardar ${row.name}.`, variant: 'destructive' })
			}
		}
		setSavingAll(false)
		if (ok > 0) {
			toast({ title: 'Guardado', description: ok === 1 ? 'Costos actualizados.' : `${ok} tipos de muestra actualizados.` })
			loadCosts()
		}
		if (!err && ok === 0 && hasAnyChanges) {
			toast({ title: 'Sin cambios', description: 'Edite al menos un monto para guardar.', variant: 'default' })
		}
	}

	const handleDeleteRow = async (row: SampleTypeCost) => {
		if (!laboratory?.id) return
		if (!window.confirm(`¿Eliminar el tipo de muestra "${row.name}" (${row.code})? Esta acción no se puede deshacer.`)) return
		setDeletingCode(row.code)
		const res = await deleteSampleTypeCost(laboratory.id, row.code)
		setDeletingCode(null)
		if (res.success) {
			toast({ title: 'Eliminado', description: `${row.name} ha sido eliminado.` })
			setEditing((prev) => {
				const next = { ...prev }
				delete next[row.code]
				return next
			})
			loadCosts()
		} else {
			toast({ title: 'Error', description: res.error ?? 'No se pudo eliminar.', variant: 'destructive' })
		}
	}

	if (!hasSampleTypeCosts || !(profile?.role === 'owner' || profile?.role === 'prueba')) {
		return (
			<div className="p-4 sm:p-6">
				<Card>
					<CardHeader>
						<CardTitle>Estructura de costos</CardTitle>
					</CardHeader>
					<CardContent>
						<p className="text-muted-foreground">
							Esta página solo está disponible para laboratorios con la feature habilitada (roles Owner o Prueba).
						</p>
					</CardContent>
				</Card>
			</div>
		)
	}

	if (loading) {
		return (
			<div className="p-4 sm:p-6 flex items-center justify-center min-h-[200px]">
				<Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
			</div>
		)
	}

	const resetAddModal = () => {
		setAddCode('')
		setAddName('')
		setAddTaquilla('')
		setAddOnlyTaquilla(false)
		setOpenAddModal(false)
	}

	const handleAddSubmit = async () => {
		if (!laboratory?.id) return
		const code = addCode.trim()
		const name = addName.trim()
		const taquilla = parseFloat(addTaquilla)
		if (!code || !name || isNaN(taquilla) || taquilla < 0) {
			toast({ title: 'Datos incompletos', description: 'Complete código, nombre y precio taquilla.', variant: 'destructive' })
			return
		}
		setSavingNew(true)
		const res = await createSampleTypeCost(laboratory.id, {
			code,
			name,
			price_taquilla: taquilla,
			only_taquilla: addOnlyTaquilla,
			convenioDiscountPercent,
			descuentoDiscountPercent,
		})
		setSavingNew(false)
		if (res.success) {
			toast({ title: 'Agregado', description: `${res.data?.name} creado.` })
			resetAddModal()
			loadCosts()
		} else {
			toast({ title: 'Error', description: res.error ?? 'No se pudo crear.', variant: 'destructive' })
		}
	}

	const handleSavePercent = async () => {
		if (!laboratory?.id) return
		const convenio = parseFloat(editConvenioPct)
		const descuento = parseFloat(editDescuentoPct)
		if (isNaN(convenio) || convenio < 0 || convenio > 100 || isNaN(descuento) || descuento < 0 || descuento > 100) {
			toast({ title: 'Datos inválidos', description: 'Los porcentajes deben ser números entre 0 y 100.', variant: 'destructive' })
			return
		}
		setSavingPercent(true)
		const res = await updateLaboratoryConfig(laboratory.id, {
			convenioDiscountPercent: convenio,
			descuentoDiscountPercent: descuento,
		})
		setSavingPercent(false)
		if (res.success) {
			toast({ title: 'Guardado', description: 'Porcentajes de descuento actualizados.' })
			setOpenPercentModal(false)
			await refreshLaboratory()
		} else {
			toast({ title: 'Error', description: res.error ?? 'No se pudo guardar.', variant: 'destructive' })
		}
	}

	const handleExportToExcel = () => {
		if (filteredCosts.length === 0) {
			toast({
				title: 'Sin datos para exportar',
				description: searchTerm.trim()
					? `No hay resultados para "${searchTerm}". Exporta sin filtro o limpia la búsqueda.`
					: 'No hay datos de costos para este laboratorio.',
				variant: 'destructive',
			})
			return
		}
		try {
			const toNum = (s: string) => {
				const n = parseFloat(s)
				return s !== '' && !isNaN(n) ? n : ''
			}
			const rows = filteredCosts.map((row) => ({
				Código: row.code ?? '',
				'Tipo de muestra': row.name ?? '',
				'Taquilla ($)': toNum(getDisplayValue(row, 'taquilla')),
				'Convenios ($)': toNum(getDisplayValue(row, 'convenios')),
				'Descuento ($)': toNum(getDisplayValue(row, 'descuento')),
			}))
			const wb = XLSX.utils.book_new()
			const ws = XLSX.utils.json_to_sheet(rows)
			ws['!cols'] = [{ wch: 10 }, { wch: 35 }, { wch: 14 }, { wch: 14 }, { wch: 14 }]
			XLSX.utils.book_append_sheet(wb, ws, 'Estructura de costos')
			const dateStr = new Date().toISOString().split('T')[0]
			const fileName = `estructura_costos_${dateStr}.xlsx`
			XLSX.writeFile(wb, fileName)
			toast({
				title: 'Exportación exitosa',
				description: `Se exportaron ${rows.length} filas a ${fileName}`,
			})
		} catch (error) {
			console.error('Error al exportar Excel:', error)
			toast({
				title: 'Error en la exportación',
				description: 'No se pudo generar el archivo Excel. Intenta de nuevo.',
				variant: 'destructive',
			})
		}
	}

	const handleExportToPdf = () => {
		if (filteredCosts.length === 0) {
			toast({
				title: 'Sin datos para exportar',
				description: searchTerm.trim()
					? `No hay resultados para "${searchTerm}". Exporta sin filtro o limpia la búsqueda.`
					: 'No hay datos de costos para este laboratorio.',
				variant: 'destructive',
			})
			return
		}
		try {
			const toStr = (s: string) => {
				const n = parseFloat(s)
				return s !== '' && !isNaN(n) ? String(n) : '—'
			}
			const head = [['Código', 'Tipo de muestra', 'Taquilla ($)', 'Convenios ($)', 'Descuento ($)']]
			const body = filteredCosts.map((row) => [
				row.code ?? '',
				row.name ?? '',
				toStr(getDisplayValue(row, 'taquilla')),
				toStr(getDisplayValue(row, 'convenios')),
				toStr(getDisplayValue(row, 'descuento')),
			])
			const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
			doc.setFontSize(14)
			doc.text('Estructura de costos', 14, 12)
			doc.setFontSize(9)
			doc.text(`Laboratorio: ${laboratory?.name ?? 'N/A'} · ${filteredCosts.length} fila(s) · ${new Date().toLocaleDateString('es-ES')}`, 14, 18)
			autoTable(doc, {
				head,
				body,
				startY: 22,
				theme: 'grid',
				styles: { fontSize: 9 },
				headStyles: { fillColor: [71, 85, 105], textColor: 255 },
				columnStyles: {
					0: { cellWidth: 22 },
					1: { cellWidth: 100 },
					2: { cellWidth: 28, halign: 'right' },
					3: { cellWidth: 28, halign: 'right' },
					4: { cellWidth: 28, halign: 'right' },
				},
				margin: { left: 14 },
			})
			const dateStr = new Date().toISOString().split('T')[0]
			doc.save(`estructura_costos_${dateStr}.pdf`)
			toast({
				title: 'Exportación exitosa',
				description: `Se exportaron ${body.length} filas a PDF.`,
			})
		} catch (error) {
			console.error('Error al exportar PDF:', error)
			toast({
				title: 'Error en la exportación',
				description: 'No se pudo generar el PDF. Intenta de nuevo.',
				variant: 'destructive',
			})
		}
	}

	return (
		<div className="p-4 sm:p-6 space-y-4">
			<Card>
				<CardHeader className="flex flex-row items-center justify-between gap-2">
					<CardTitle>Estructura de costos</CardTitle>
					<div className="flex items-center gap-2">
						<Button
							type="button"
							variant="outline"
							size="lg"
							onClick={() => setOpenExportModal(true)}
							disabled={filteredCosts.length === 0}
							aria-label="Exportar"
						>
							<Download className="h-4 w-4 mr-1" />
							Exportar
						</Button>
						{canEdit && (
							<Button
								type="button"
								variant="outline"
								size="icon"
								onClick={handleSaveAll}
								disabled={!hasAnyChanges || savingAll}
								aria-label="Guardar cambios"
							>
								{savingAll ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
							</Button>
						)}
						{isOwner && (
							<Button
								type="button"
								variant="outline"
								size="icon"
								onClick={() => {
									setEditConvenioPct(String(convenioDiscountPercent))
									setEditDescuentoPct(String(descuentoDiscountPercent))
									setOpenPercentModal(true)
								}}
								aria-label="Editar porcentajes de descuento"
							>
								<Percent className="h-4 w-4" />
							</Button>
						)}
						{canEdit && (
							<Button type="button" variant="outline" size="icon" onClick={() => setOpenAddModal(true)} aria-label="Agregar tipo de muestra">
								<Plus className="h-4 w-4" />
							</Button>
						)}
					</div>
				</CardHeader>
				<CardContent>
					<p className="text-sm text-muted-foreground mb-4 hidden sm:block">
						Edite el monto de Taquilla; los demás se calculan automáticamente.
					</p>
					<div className="relative mb-4 max-w-sm">
						<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
						<Input
							type="search"
							placeholder="Buscar por código o tipo de muestra..."
							value={searchTerm}
							onChange={(e) => setSearchTerm(e.target.value)}
							className="pl-9"
							aria-label="Buscar en estructura de costos"
						/>
					</div>
					<div className="overflow-x-auto">
						<table className="w-full border-collapse text-sm">
							<thead>
								<tr className="border-b">
									<th className="text-left p-2 font-medium">Código</th>
									<th className="text-left p-2 font-medium">Tipo de muestra</th>
									<th className="text-left p-2 font-medium">Taquilla ($)</th>
									<th className="text-left p-2 font-medium">Convenios ($)</th>
									<th className="text-left p-2 font-medium">Descuento ($)</th>
									{canEdit && <th className="p-2 w-20">Acción</th>}
								</tr>
							</thead>
							<tbody>
								{filteredCosts.map((row) => (
									<tr key={row.id} className="border-b hover:bg-muted/30">
										<td className="p-2 font-mono">{row.code}</td>
										<td className="p-2">{row.name}</td>
										<td className="p-2">
											<Input
												type="number"
												step="0.01"
												min="0"
												value={getDisplayValue(row, 'taquilla')}
												onChange={(e) => setEdit(row.code, e.target.value)}
												disabled={!canEdit}
												className="w-24 h-8 text-right font-mono"
											/>
										</td>
										<td className="p-2">
											<Input
												type="number"
												step="0.01"
												min="0"
												placeholder="N/A"
												value={getDisplayValue(row, 'convenios')}
												readOnly
												disabled
												className="w-24 h-8 text-right font-mono opacity-70"
											/>
										</td>
										<td className="p-2">
											<Input
												type="number"
												step="0.01"
												min="0"
												placeholder="N/A"
												value={getDisplayValue(row, 'descuento')}
												readOnly
												disabled
												className="w-24 h-8 text-right font-mono opacity-70"
											/>
										</td>
										{canEdit && (
											<td className="p-2">
												<Button
													size="icon"
													variant="outline"
													onClick={() => handleDeleteRow(row)}
													disabled={deletingCode === row.code}
													className="h-8 w-8 shrink-0 text-destructive hover:text-destructive hover:bg-destructive/10"
													aria-label="Eliminar"
												>
													{deletingCode === row.code ? (
														<Loader2 className="h-4 w-4 animate-spin" />
													) : (
														<Trash2 className="h-4 w-4" />
													)}
												</Button>
											</td>
										)}
									</tr>
								))}
							</tbody>
						</table>
					</div>
					{costs.length === 0 && (
						<p className="text-muted-foreground text-sm mt-4">No hay datos de costos para este laboratorio.</p>
					)}
					{costs.length > 0 && filteredCosts.length === 0 && (
						<p className="text-muted-foreground text-sm mt-4">No hay resultados para &quot;{searchTerm}&quot;.</p>
					)}
				</CardContent>
			</Card>

			<Dialog open={openExportModal} onOpenChange={setOpenExportModal}>
				<DialogContent className="sm:max-w-sm bg-white/80 dark:bg-background/50 backdrop-blur-[2px] dark:backdrop-blur-[10px]">
					<DialogHeader>
						<DialogTitle>Exportar estructura de costos</DialogTitle>
					</DialogHeader>
					<p className="text-sm text-muted-foreground py-1">
						Elige el formato de exportación. Se exportarán {filteredCosts.length} fila(s) según el filtro actual.
					</p>
					<div className="flex flex-col gap-2 pt-2">
						<Button
							type="button"
							variant="outline"
							className="justify-start"
							onClick={() => {
								handleExportToExcel()
								setOpenExportModal(false)
							}}
						>
							<Download className="h-4 w-4 mr-2" />
							Exportar a Excel (.xlsx)
						</Button>
						<Button
							type="button"
							variant="outline"
							className="justify-start"
							onClick={() => {
								handleExportToPdf()
								setOpenExportModal(false)
							}}
						>
							<FileText className="h-4 w-4 mr-2" />
							Exportar a PDF
						</Button>
					</div>
				</DialogContent>
			</Dialog>

			<Dialog open={openAddModal} onOpenChange={(open) => !open && resetAddModal()}>
				<DialogContent className="sm:max-w-md bg-white/80 dark:bg-background/50 backdrop-blur-[2px] dark:backdrop-blur-[10px]">
					<DialogHeader>
						<DialogTitle>Agregar tipo de muestra</DialogTitle>
					</DialogHeader>
					<div className="space-y-4 py-2">
						<div className="space-y-2">
							<Label htmlFor="add-code">Código</Label>
							<Input
								id="add-code"
								value={addCode}
								onChange={(e) => setAddCode(e.target.value)}
								placeholder="ej. A04"
								className="font-mono"
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="add-name">Tipo de muestra</Label>
							<Input
								id="add-name"
								value={addName}
								onChange={(e) => setAddName(e.target.value)}
								placeholder="Nombre del tipo"
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="add-taquilla">Precio taquilla ($)</Label>
							<Input
								id="add-taquilla"
								type="number"
								step="0.01"
								min="0"
								value={addTaquilla}
								onChange={(e) => setAddTaquilla(e.target.value)}
								placeholder="0,00"
								className="font-mono"
							/>
						</div>
						<div className="flex flex-row items-center gap-2">
							<input
								type="checkbox"
								id="add-only-taquilla"
								checked={addOnlyTaquilla}
								onChange={(e) => setAddOnlyTaquilla(e.target.checked)}
								className="rounded border-input"
							/>
							<Label htmlFor="add-only-taquilla" className="cursor-pointer font-normal">
								Solo taquilla (sin convenios/descuento)
							</Label>
						</div>
					</div>
					<DialogFooter>
						<Button type="button" variant="outline" onClick={resetAddModal} disabled={savingNew}>
							Cancelar
						</Button>
						<Button
							type="button"
							disabled={
								savingNew ||
								!addCode.trim() ||
								!addName.trim() ||
								!addTaquilla ||
								isNaN(parseFloat(addTaquilla)) ||
								parseFloat(addTaquilla) < 0
							}
							onClick={handleAddSubmit}
						>
							{savingNew ? (
								<Loader2 className="h-4 w-4 animate-spin" />
							) : (
								<>
									<Save className="h-4 w-4 mr-1" />
									Guardar
								</>
							)}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			<Dialog open={openPercentModal} onOpenChange={setOpenPercentModal}>
				<DialogContent className="sm:max-w-md bg-white/80 dark:bg-background/50 backdrop-blur-[2px] dark:backdrop-blur-[10px]">
					<DialogHeader>
						<DialogTitle>Editar porcentajes de descuento</DialogTitle>
					</DialogHeader>
					<p className="text-sm text-muted-foreground">
						Porcentaje aplicado sobre Taquilla para calcular Convenios (2º precio) y Descuento (3º precio).
					</p>
					<div className="grid gap-4 py-2">
						<div className="space-y-2">
							<Label htmlFor="edit-convenio-pct">Convenios (% descuento)</Label>
							<Input
								id="edit-convenio-pct"
								type="number"
								min="0"
								max="100"
								step="0.5"
								value={editConvenioPct}
								onChange={(e) => setEditConvenioPct(e.target.value)}
								placeholder="5"
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="edit-descuento-pct">Descuento (% descuento)</Label>
							<Input
								id="edit-descuento-pct"
								type="number"
								min="0"
								max="100"
								step="0.5"
								value={editDescuentoPct}
								onChange={(e) => setEditDescuentoPct(e.target.value)}
								placeholder="10"
							/>
						</div>
					</div>
					<DialogFooter>
						<Button type="button" variant="outline" onClick={() => setOpenPercentModal(false)} disabled={savingPercent}>
							Cancelar
						</Button>
						<Button
							type="button"
							disabled={
								savingPercent ||
								editConvenioPct === '' ||
								editDescuentoPct === '' ||
								isNaN(parseFloat(editConvenioPct)) ||
								isNaN(parseFloat(editDescuentoPct)) ||
								parseFloat(editConvenioPct) < 0 ||
								parseFloat(editConvenioPct) > 100 ||
								parseFloat(editDescuentoPct) < 0 ||
								parseFloat(editDescuentoPct) > 100
							}
							onClick={handleSavePercent}
						>
							{savingPercent ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Save className="h-4 w-4 mr-1" /> Guardar</>}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	)
}

export default SampleCostsPage
