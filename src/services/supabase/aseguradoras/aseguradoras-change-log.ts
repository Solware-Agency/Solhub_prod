/**
 * Registro de cambios del módulo aseguradoras en change_logs (historial de acciones).
 * Usado por polizas, asegurados, aseguradoras y pagos_poliza.
 */

import { supabase } from '@services/supabase/config/config'
import { formatValueForLog, generateChangeSessionId, hasRealChange } from '@services/supabase/shared/change-log-utils'

export type AseguradorasEntityType = 'poliza' | 'asegurado' | 'aseguradora' | 'pago_poliza'

const ENTITY_FK_KEY: Record<AseguradorasEntityType, 'poliza_id' | 'asegurado_id' | 'aseguradora_id' | 'pago_poliza_id'> = {
	poliza: 'poliza_id',
	asegurado: 'asegurado_id',
	aseguradora: 'aseguradora_id',
	pago_poliza: 'pago_poliza_id',
}

async function getCurrentUserInfo(): Promise<{ userId: string; userEmail: string; userDisplayName: string }> {
	const { data: user } = await supabase.auth.getUser()
	const userId = user?.user?.id ?? ''
	if (!userId) {
		return { userId: '', userEmail: 'sistema', userDisplayName: 'Sistema' }
	}
	const { data: profile } = await supabase
		.from('profiles')
		.select('display_name, email')
		.eq('id', userId)
		.maybeSingle()
	return {
		userId,
		userEmail: profile?.email ?? user?.user?.email ?? 'unknown',
		userDisplayName: profile?.display_name ?? 'Usuario',
	}
}

export interface AseguradorasChangeLogRow {
	field_name: string
	field_label: string
	old_value: string | null
	new_value: string | null
}

/**
 * Inserta en change_logs los cambios de una entidad aseguradoras (poliza, asegurado, aseguradora, pago).
 * No lanza error para no romper el flujo principal; solo registra en consola.
 */
export async function insertAseguradorasChangeLog(
	entityType: AseguradorasEntityType,
	entityId: string,
	laboratoryId: string,
	changes: AseguradorasChangeLogRow[],
): Promise<void> {
	if (changes.length === 0) return
	try {
		const { userId, userEmail, userDisplayName } = await getCurrentUserInfo()
		const changeSessionId = generateChangeSessionId()
		const changedAt = new Date().toISOString()
		const fkKey = ENTITY_FK_KEY[entityType]

		const rows = changes.map((c) => ({
			entity_type: entityType,
			[fkKey]: entityId,
			field_name: c.field_name,
			field_label: c.field_label,
			old_value: c.old_value,
			new_value: c.new_value,
			user_id: userId,
			user_email: userEmail,
			user_display_name: userDisplayName,
			change_session_id: changeSessionId,
			changed_at: changedAt,
			laboratory_id: laboratoryId,
		}))

		const { error } = await supabase.from('change_logs').insert(rows)
		if (error) {
			console.error(`Error registrando historial aseguradoras (${entityType}):`, error)
		} else {
			console.log(`✅ ${rows.length} cambio(s) de ${entityType} registrados en historial`)
		}
	} catch (err) {
		console.error('Error en insertAseguradorasChangeLog:', err)
	}
}

/**
 * Registra la creación de una entidad (una sola fila "created_record").
 */
export async function logAseguradorasCreated(
	entityType: AseguradorasEntityType,
	entityId: string,
	laboratoryId: string,
	description: string,
): Promise<void> {
	await insertAseguradorasChangeLog(entityType, entityId, laboratoryId, [
		{
			field_name: 'created_record',
			field_label: 'Registro creado',
			old_value: null,
			new_value: description,
		},
	])
}

/**
 * Compara objeto anterior y nuevo, genera filas solo para campos que cambiaron.
 * fieldLabels: mapeo de nombre de campo -> etiqueta para mostrar.
 */
export function buildChangeRows<T extends Record<string, unknown>>(
	oldData: T,
	newData: Partial<T>,
	fieldLabels: Record<string, string>,
): AseguradorasChangeLogRow[] {
	const rows: AseguradorasChangeLogRow[] = []
	for (const [field, newVal] of Object.entries(newData)) {
		if (newVal === undefined) continue
		const oldVal = oldData[field]
		if (!hasRealChange(oldVal, newVal)) continue
		rows.push({
			field_name: field,
			field_label: fieldLabels[field] ?? field,
			old_value: formatValueForLog(oldVal),
			new_value: formatValueForLog(newVal),
		})
	}
	return rows
}
