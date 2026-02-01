import React, { useEffect, useState, useCallback } from 'react'
import { useLaboratory } from '@/app/providers/LaboratoryContext'
import { useUserProfile } from '@shared/hooks/useUserProfile'
import {
	getSampleTypeCostsByLaboratory,
	updateSampleTypeCost,
	type SampleTypeCost,
} from '@services/supabase/laboratories/sample-type-costs-service'
import { Card, CardContent, CardHeader, CardTitle } from '@shared/components/ui/card'
import { Button } from '@shared/components/ui/button'
import { Input } from '@shared/components/ui/input'
import { useToast } from '@shared/hooks/use-toast'
import { Loader2, Save, DollarSign } from 'lucide-react'

const SampleCostsPage: React.FC = () => {
	const { laboratory } = useLaboratory()
	const { profile } = useUserProfile()
	const { toast } = useToast()
	const isMarihorgen =
		laboratory?.slug?.toLowerCase() === 'marihorgen' || laboratory?.slug?.toLowerCase() === 'lm'
	const canEdit =
		(profile?.role === 'owner' || profile?.role === 'prueba') && isMarihorgen && !!laboratory?.id

	const [costs, setCosts] = useState<SampleTypeCost[]>([])
	const [loading, setLoading] = useState(true)
	const [editing, setEditing] = useState<Record<string, { taquilla: string; convenios: string; descuento: string }>>({})
	const [savingCode, setSavingCode] = useState<string | null>(null)

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

	const setEdit = (code: string, field: 'taquilla' | 'convenios' | 'descuento', value: string) => {
		setEditing((prev) => {
			const row = costs.find((c) => c.code === code)
			const base = row
				? {
						taquilla: row.price_taquilla != null ? String(row.price_taquilla) : '',
						convenios: row.price_convenios != null ? String(row.price_convenios) : '',
						descuento: row.price_descuento != null ? String(row.price_descuento) : '',
					}
				: { taquilla: '', convenios: '', descuento: '' }
			return {
				...prev,
				[code]: { ...base, ...prev[code], [field]: value },
			}
		})
	}

	const getDisplayValue = (row: SampleTypeCost, field: 'taquilla' | 'convenios' | 'descuento') => {
		const ed = editing[row.code]
		if (ed && ed[field] !== undefined && ed[field] !== '') return ed[field]
		const v = field === 'taquilla' ? row.price_taquilla : field === 'convenios' ? row.price_convenios : row.price_descuento
		return v != null ? String(v) : ''
	}

	const handleSaveRow = async (row: SampleTypeCost) => {
		if (!laboratory?.id) return
		const ed = editing[row.code]
		const taquilla = ed?.taquilla !== undefined && ed.taquilla !== '' ? parseFloat(ed.taquilla) : undefined
		const convenios =
			ed?.convenios !== undefined && ed.convenios !== ''
				? (parseFloat(ed.convenios) as number | null)
				: undefined
		const descuento =
			ed?.descuento !== undefined && ed.descuento !== ''
				? (parseFloat(ed.descuento) as number | null)
				: undefined
		if (taquilla === undefined && convenios === undefined && descuento === undefined) {
			toast({ title: 'Sin cambios', description: 'Edite al menos un monto para guardar.', variant: 'default' })
			return
		}
		setSavingCode(row.code)
		const res = await updateSampleTypeCost(laboratory.id, row.code, {
			...(taquilla !== undefined && { price_taquilla: taquilla }),
			...(convenios !== undefined && { price_convenios: convenios }),
			...(descuento !== undefined && { price_descuento: descuento }),
		})
		setSavingCode(null)
		if (res.success) {
			toast({ title: 'Guardado', description: `Costos de ${row.name} actualizados.` })
			setEditing((prev) => {
				const next = { ...prev }
				delete next[row.code]
				return next
			})
			loadCosts()
		} else {
			toast({ title: 'Error', description: res.error ?? 'No se pudo guardar.', variant: 'destructive' })
		}
	}

	if (!isMarihorgen || !(profile?.role === 'owner' || profile?.role === 'prueba')) {
		return (
			<div className="p-4 sm:p-6">
				<Card>
					<CardHeader>
						<CardTitle>Estructura de costos</CardTitle>
					</CardHeader>
					<CardContent>
						<p className="text-muted-foreground">
							Esta página solo está disponible para el laboratorio Marihorgen (roles Owner o Prueba).
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

	return (
		<div className="p-4 sm:p-6 space-y-4">
			<Card>
				<CardHeader className="flex flex-row items-center gap-2">
					<DollarSign className="h-5 w-5" />
					<CardTitle>Estructura de costos (Marihorgen)</CardTitle>
				</CardHeader>
				<CardContent>
					<p className="text-sm text-muted-foreground mb-4">
						Edite los montos por tipo de muestra. Taquilla = Costo 1, Convenios = Costo 2, Descuento = Costo 3 (10%).
					</p>
					<div className="overflow-x-auto">
						<table className="w-full border-collapse text-sm">
							<thead>
								<tr className="border-b">
									<th className="text-left p-2 font-medium">Código</th>
									<th className="text-left p-2 font-medium">Tipo de muestra</th>
									<th className="text-left p-2 font-medium">Taquilla ($)</th>
									<th className="text-left p-2 font-medium">Convenios ($)</th>
									<th className="text-left p-2 font-medium">Descuento ($)</th>
									{canEdit && <th className="p-2 w-24">Acción</th>}
								</tr>
							</thead>
							<tbody>
								{costs.map((row) => (
									<tr key={row.id} className="border-b hover:bg-muted/30">
										<td className="p-2 font-mono">{row.code}</td>
										<td className="p-2">{row.name}</td>
										<td className="p-2">
											<Input
												type="number"
												step="0.01"
												min="0"
												value={getDisplayValue(row, 'taquilla')}
												onChange={(e) => setEdit(row.code, 'taquilla', e.target.value)}
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
												onChange={(e) => setEdit(row.code, 'convenios', e.target.value)}
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
												value={getDisplayValue(row, 'descuento')}
												onChange={(e) => setEdit(row.code, 'descuento', e.target.value)}
												disabled={!canEdit}
												className="w-24 h-8 text-right font-mono"
											/>
										</td>
										{canEdit && (
											<td className="p-2">
												<Button
													size="sm"
													variant="outline"
													onClick={() => handleSaveRow(row)}
													disabled={savingCode === row.code}
												>
													{savingCode === row.code ? (
														<Loader2 className="h-4 w-4 animate-spin" />
													) : (
														<>
															<Save className="h-4 w-4 mr-1" />
															Guardar
														</>
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
				</CardContent>
			</Card>
		</div>
	)
}

export default SampleCostsPage
