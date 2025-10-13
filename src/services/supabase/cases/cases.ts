import { supabase } from '@/services/supabase/config/config'

export type DocAprobadoStatus = 'faltante' | 'pendiente' | 'aprobado' | 'rechazado'
export type CitoStatus = 'positivo' | 'negativo' | null

export async function markCaseAsPending(caseId: string) {
	return supabase
		.from('medical_records_clean')
		.update({ doc_aprobado: 'pendiente' as DocAprobadoStatus, updated_at: new Date().toISOString() })
		.eq('id', caseId)
		.select('id, doc_aprobado')
		.single()
}

export async function approveCaseDocument(caseId: string) {
	return supabase
		.from('medical_records_clean')
		.update({ doc_aprobado: 'aprobado' as DocAprobadoStatus, updated_at: new Date().toISOString() })
		.eq('id', caseId)
		.select('id, doc_aprobado')
		.single()
}

export async function rejectCaseDocument(caseId: string) {
	return supabase
		.from('medical_records_clean')
		.update({ doc_aprobado: 'rechazado' as DocAprobadoStatus, updated_at: new Date().toISOString() })
		.eq('id', caseId)
		.select('id, doc_aprobado')
		.single()
}

export async function positiveCaseDocument(caseId: string) {
	return supabase
		.from('medical_records_clean')
		.update({ cito_status: 'positivo' as CitoStatus, doc_aprobado: 'pendiente' as DocAprobadoStatus, updated_at: new Date().toISOString() })
		.eq('id', caseId)
		.select('id, cito_status')
		.single()
}

export async function negativeCaseDocument(caseId: string) {
	return supabase
		.from('medical_records_clean')
		.update({ cito_status: 'negativo' as CitoStatus, doc_aprobado: 'aprobado' as DocAprobadoStatus, updated_at: new Date().toISOString() })
		.eq('id', caseId)
		.select('id, cito_status')
		.single()
}
