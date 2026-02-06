import { supabase } from '@services/supabase/config/config'
import { getUserLaboratoryId } from './aseguradoras-utils'

export interface AseguradorasStats {
	asegurados: number
	polizas: number
	porVencer: number
	vencidas: number
	pagos: number
}

export const getAseguradorasStats = async (): Promise<AseguradorasStats> => {
	const laboratoryId = await getUserLaboratoryId()
	const today = new Date()
	const todayStr = today.toISOString().slice(0, 10)
	const in30Days = new Date(today)
	in30Days.setDate(in30Days.getDate() + 30)
	const in30DaysStr = in30Days.toISOString().slice(0, 10)

	const [{ count: asegurados }, { count: polizas }, { count: pagos }] = await Promise.all([
		supabase.from('asegurados').select('*', { count: 'exact', head: true }).eq('laboratory_id', laboratoryId),
		supabase.from('polizas').select('*', { count: 'exact', head: true }).eq('laboratory_id', laboratoryId),
		supabase.from('pagos_poliza').select('*', { count: 'exact', head: true }).eq('laboratory_id', laboratoryId),
	])

	const { count: porVencer } = await supabase
		.from('polizas')
		.select('*', { count: 'exact', head: true })
		.eq('laboratory_id', laboratoryId)
		.gte('fecha_prox_vencimiento', todayStr)
		.lte('fecha_prox_vencimiento', in30DaysStr)

	const { count: vencidas } = await supabase
		.from('polizas')
		.select('*', { count: 'exact', head: true })
		.eq('laboratory_id', laboratoryId)
		.lt('fecha_prox_vencimiento', todayStr)

	return {
		asegurados: asegurados || 0,
		polizas: polizas || 0,
		porVencer: porVencer || 0,
		vencidas: vencidas || 0,
		pagos: pagos || 0,
	}
}
