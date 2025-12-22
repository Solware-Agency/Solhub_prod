import { supabase } from '@/services/supabase/config/config'

export type UserRole = 'owner' | 'admin' | 'employee' | 'residente' | 'citotecno' | 'patologo' | 'enfermero' | 'medico_tratante' | 'imagenologia' | 'prueba' | 'call_center'

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
		description: 'Acceso completo sin restricciones a todas las funcionalidades',
	},
	employee: {
		value: 'employee',
		label: 'Recepcionista',
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
	patologo: {
		value: 'patologo',
		label: 'Patólogo',
		description: 'Análisis y diagnóstico de muestras patológicas',
	},
	enfermero: {
		value: 'enfermero',
		label: 'Enfermero',
		description: 'Atención y seguimiento de pacientes',
	},
	medico_tratante: {
		value: 'medico_tratante',
		label: 'Médico Tratante',
		description: 'Médico responsable del tratamiento del paciente',
	},
	imagenologia: {
		value: 'imagenologia',
		label: 'Imagenología',
		description: 'Gestión de estudios de imagen y radiología',
	},
	prueba: {
		value: 'prueba',
		label: 'Prueba (GodMode)',
		description: 'Rol de prueba con acceso completo sin restricciones',
	},
	call_center: {
		value: 'call_center',
		label: 'Call Center',
		description: 'Visualización y envío de casos, edición básica de pacientes (sin formulario de registro)',
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
		console.log('🔍 Buscando roles para laboratorio:', laboratoryId)

		const { data, error } = await (supabase as any)
			.from('laboratories')
			.select('available_roles')
			.eq('id', laboratoryId)
			.single()

		if (error) {
			console.error('❌ Error fetching laboratory roles:', error)
			return {
				success: false,
				roles: [],
				error: 'No se pudieron obtener los roles del laboratorio',
			}
		}

		console.log('📊 Datos recibidos de Supabase:', data)

		// Obtener array de roles disponibles
		let availableRoles: UserRole[] = []

		if (data?.available_roles && Array.isArray(data.available_roles)) {
			availableRoles = data.available_roles as UserRole[]
			console.log('✅ Roles encontrados:', availableRoles)
		} else {
			console.warn('⚠️ No se encontraron roles en available_roles')
			return {
				success: false,
				roles: [],
				error: 'Este laboratorio no tiene roles configurados',
			}
		}

		// Filtrar solo roles válidos que existen en ROLE_LABELS
		const validRoles = availableRoles.filter((role) => role in ROLE_LABELS)

		if (validRoles.length === 0) {
			console.warn('⚠️ No hay roles válidos después de filtrar')
			return {
				success: false,
				roles: [],
				error: 'No hay roles válidos configurados para este laboratorio',
			}
		}

		// Mapear a opciones con etiquetas
		const roleOptions = validRoles.map((role) => ROLE_LABELS[role])

		console.log('✅ Roles mapeados:', roleOptions)

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
