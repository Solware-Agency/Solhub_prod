import { supabase } from '@/services/supabase/config/config'

export type UserRole = 'owner' | 'admin' | 'employee' | 'residente' | 'citotecno'

export interface RoleOption {
	value: UserRole
	label: string
	description: string
}

// Mapeo de roles a sus etiquetas y descripciones
export const ROLE_LABELS: Record<UserRole, RoleOption> = {
	owner: {
		value: 'owner',
		label: 'Propietario',
		description: 'Acceso total al sistema y configuración del laboratorio',
	},
	admin: {
		value: 'admin',
		label: 'Administrador',
		description: 'Gestión completa de casos y usuarios',
	},
	employee: {
		value: 'employee',
		label: 'Empleado',
		description: 'Registro y edición de casos médicos',
	},
	residente: {
		value: 'residente',
		label: 'Residente',
		description: 'Visualización de casos y reportes básicos',
	},
	citotecno: {
		value: 'citotecno',
		label: 'Citotecnólogo',
		description: 'Gestión de citologías y análisis técnico',
	},
}

/**
 * Obtiene los roles disponibles para un laboratorio específico
 */
export async function getAvailableRolesForLaboratory(laboratoryId: string): Promise<{
	success: boolean
	roles: RoleOption[]
	error?: string
}> {
	try {
		const { data, error } = await (supabase as any)
			.from('laboratories')
			.select('available_roles')
			.eq('id', laboratoryId)
			.single()

		if (error) {
			console.error('Error fetching laboratory roles:', error)
			return {
				success: false,
				roles: [],
				error: 'No se pudieron obtener los roles del laboratorio',
			}
		}

		// Si no tiene roles configurados, retornar array vacío (sin fallback)
		let availableRoles: UserRole[] = []

		if (data?.available_roles && Array.isArray(data.available_roles) && data.available_roles.length > 0) {
			availableRoles = data.available_roles as UserRole[]
		} else {
			// No hay roles configurados para este laboratorio
			return {
				success: false,
				roles: [],
				error: 'Este laboratorio no tiene roles configurados',
			}
		}

		// Mapear a opciones con etiquetas
		const roleOptions = availableRoles
			.filter((role) => role in ROLE_LABELS)
			.map((role) => ROLE_LABELS[role])

		if (roleOptions.length === 0) {
			return {
				success: false,
				roles: [],
				error: 'No hay roles válidos configurados para este laboratorio',
			}
		}

		return {
			success: true,
			roles: roleOptions,
		}
	} catch (error) {
		console.error('Error in getAvailableRolesForLaboratory:', error)
		return {
			success: false,
			roles: [],
			error: 'Error interno al obtener los roles',
		}
	}
}

/**
 * Valida si un rol está disponible para un laboratorio
 */
export async function isRoleAvailableForLaboratory(
	laboratoryId: string,
	role: UserRole,
): Promise<boolean> {
	const result = await getAvailableRolesForLaboratory(laboratoryId)
	return result.success && result.roles.some((r) => r.value === role)
}
