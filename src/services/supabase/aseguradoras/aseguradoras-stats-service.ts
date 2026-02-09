import { supabase } from '@services/supabase/config/config'
import { getUserLaboratoryId } from './aseguradoras-utils'

export interface PagoPorMes {
	month: string
	monthShort: string
	monthIndex: number
	count: number
	monto: number
}

export interface ProximoVencimiento {
	id: string
	numero_poliza: string
	asegurado_nombre: string
	fecha_prox_vencimiento: string
}

export interface TopAseguradora {
	id: string
	nombre: string
	polizas: number
}

export interface AseguradorasStats {
	asegurados: number
	aseguradoras: number
	polizas: number
	porVencer: number
	vencidas: number
	vigentes: number
	pagos: number
	totalCobradoMes: number
	totalCobrado12M: number
	pagosPorMes: PagoPorMes[]
	proximosVencimientos: ProximoVencimiento[]
	topAseguradorasPorPolizas: TopAseguradora[]
}

const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

export const getAseguradorasStats = async (): Promise<AseguradorasStats> => {
	const laboratoryId = await getUserLaboratoryId()
	const today = new Date()
	const todayStr = today.toISOString().slice(0, 10)
	const in30Days = new Date(today)
	in30Days.setDate(in30Days.getDate() + 30)
	const in30DaysStr = in30Days.toISOString().slice(0, 10)

	const [{ count: asegurados }, { count: aseguradoras }, { count: polizas }, { count: pagos }] = await Promise.all([
		supabase.from('asegurados').select('*', { count: 'exact', head: true }).eq('laboratory_id', laboratoryId).eq('activo', true),
		supabase.from('aseguradoras').select('*', { count: 'exact', head: true }).eq('laboratory_id', laboratoryId).eq('activo', true),
		supabase.from('polizas').select('*', { count: 'exact', head: true }).eq('laboratory_id', laboratoryId).eq('activo', true),
		supabase.from('pagos_poliza').select('*', { count: 'exact', head: true }).eq('laboratory_id', laboratoryId),
	])

	// Clasificación por estado: usamos fecha_prox_vencimiento y, si es null, fecha_vencimiento
	const { data: polizasFechas } = await supabase
		.from('polizas')
		.select('fecha_prox_vencimiento, fecha_vencimiento')
		.eq('laboratory_id', laboratoryId)
		.eq('activo', true)

	let vigentes = 0
	let porVencer = 0
	let vencidas = 0
	const _today = todayStr
	const _in30 = in30DaysStr
	;(polizasFechas || []).forEach((p: { fecha_prox_vencimiento: string | null; fecha_vencimiento: string | null }) => {
		const fecha = (p.fecha_prox_vencimiento || p.fecha_vencimiento || '').slice(0, 10)
		if (!fecha) return
		if (fecha > _in30) vigentes += 1
		else if (fecha >= _today && fecha <= _in30) porVencer += 1
		else if (fecha < _today) vencidas += 1
	})

	// Últimos 12 meses: pagos agrupados por mes
	const startMonth = new Date(today.getFullYear(), today.getMonth() - 11, 1)
	const { data: pagosRaw } = await supabase
		.from('pagos_poliza')
		.select('fecha_pago, monto')
		.eq('laboratory_id', laboratoryId)
		.gte('fecha_pago', startMonth.toISOString().slice(0, 10))

	const byMonth: Record<string, { count: number; monto: number }> = {}
	for (let i = 0; i < 12; i++) {
		const d = new Date(today.getFullYear(), today.getMonth() - 11 + i, 1)
		const key = d.toISOString().slice(0, 7)
		byMonth[key] = { count: 0, monto: 0 }
	}
	;(pagosRaw || []).forEach((p: { fecha_pago: string; monto: number }) => {
		const key = (p.fecha_pago || '').slice(0, 7)
		if (byMonth[key]) {
			byMonth[key].count += 1
			byMonth[key].monto += Number(p.monto || 0)
		}
	})
	const orderedMonths = Object.keys(byMonth).sort()
	const pagosPorMes: PagoPorMes[] = orderedMonths.map((key) => {
		const d = new Date(key + '-01')
		return {
			month: d.toLocaleDateString('es', { month: 'long', year: 'numeric' }),
			monthShort: MESES[d.getMonth()],
			monthIndex: d.getMonth(),
			count: byMonth[key].count,
			monto: byMonth[key].monto,
		}
	})

	const currentMonthKey = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0')
	const totalCobradoMes = byMonth[currentMonthKey]?.monto ?? 0
	const totalCobrado12M = pagosPorMes.reduce((s, m) => s + m.monto, 0)

	// Próximos 5 vencimientos (fecha_prox_vencimiento ascendente)
	const { data: proximosRaw } = await supabase
		.from('polizas')
		.select('id, numero_poliza, fecha_prox_vencimiento, asegurado:asegurados(full_name)')
		.eq('laboratory_id', laboratoryId)
		.eq('activo', true)
		.gte('fecha_prox_vencimiento', todayStr)
		.order('fecha_prox_vencimiento', { ascending: true })
		.limit(5)
	const proximosVencimientos: ProximoVencimiento[] = (proximosRaw || []).map((p: any) => ({
		id: p.id,
		numero_poliza: p.numero_poliza || '',
		asegurado_nombre: p.asegurado?.full_name || '—',
		fecha_prox_vencimiento: p.fecha_prox_vencimiento || '',
	}))

	// Top 5 aseguradoras por cantidad de pólizas
	const { data: polizasByAseguradora } = await supabase
		.from('polizas')
		.select('aseguradora_id')
		.eq('laboratory_id', laboratoryId)
		.eq('activo', true)
	const countByAseguradora: Record<string, number> = {}
	;(polizasByAseguradora || []).forEach((p: any) => {
		if (p.aseguradora_id) {
			countByAseguradora[p.aseguradora_id] = (countByAseguradora[p.aseguradora_id] || 0) + 1
		}
	})
	const topIds = Object.entries(countByAseguradora)
		.sort((a, b) => b[1] - a[1])
		.slice(0, 5)
		.map(([id]) => id)
	const { data: aseguradorasData } = topIds.length
		? await supabase.from('aseguradoras').select('id, nombre').in('id', topIds)
		: { data: [] }
	const aseguradorasMap = (aseguradorasData || []).reduce((acc: Record<string, { nombre: string }>, a: any) => {
		acc[a.id] = { nombre: a.nombre || '' }
		return acc
	}, {})
	const topAseguradorasPorPolizas: TopAseguradora[] = topIds.map((id) => ({
		id,
		nombre: aseguradorasMap[id]?.nombre || '—',
		polizas: countByAseguradora[id] || 0,
	}))

	return {
		asegurados: asegurados || 0,
		aseguradoras: aseguradoras || 0,
		polizas: polizas || 0,
		porVencer: porVencer || 0,
		vencidas: vencidas || 0,
		vigentes: vigentes || 0,
		pagos: pagos || 0,
		totalCobradoMes,
		totalCobrado12M,
		pagosPorMes,
		proximosVencimientos,
		topAseguradorasPorPolizas,
	}
}
