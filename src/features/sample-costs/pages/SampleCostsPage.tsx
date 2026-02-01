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
	const [editing, setEditing] = useState<Record<string, { taquilla: string }>>({})
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

	const round2 = (value: number) => Number(value.toFixed(2))

	const setEdit = (code: string, value: string) => {
		setEditing((prev) => {
			return {
				...prev,
				[code]: { ...prev[code], taquilla: value },
			}
		})
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
		const calc = field === 'convenios' ? round2(base * 0.95) : round2(base * 0.9)
		return String(calc)
	}

	const handleSaveRow = async (row: SampleTypeCost) => {
		if (!laboratory?.id) return
		const ed = editing[row.code]
		const taquilla = ed?.taquilla !== undefined && ed.taquilla !== '' ? parseFloat(ed.taquilla) : undefined
		const onlyTaquilla = row.price_convenios == null && row.price_descuento == null
		if (taquilla === undefined || isNaN(taquilla)) {
			toast({ title: 'Sin cambios', description: 'Edite al menos un monto para guardar.', variant: 'default' })
			return
		}
		const convenios = onlyTaquilla ? null : round2(taquilla * 0.95)
		const descuento = onlyTaquilla ? null : round2(taquilla * 0.9)
		setSavingCode(row.code)
		const res = await updateSampleTypeCost(laboratory.id, row.code, {
			price_taquilla: taquilla,
			...(onlyTaquilla ? {} : { price_convenios: convenios, price_descuento: descuento }),
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
				<CardHeader>
					<CardTitle>Estructura de costos</CardTitle>
				</CardHeader>
				<CardContent>
					<p className="text-sm text-muted-foreground mb-4">
						Edite el monto de Taquilla; los demás se calculan automáticamente.
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
