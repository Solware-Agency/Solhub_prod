// =====================================================================
// SERVICIO DE REGISTROS DEL CALL CENTER (SPT)
// =====================================================================

import { supabase } from '@/services/supabase/config/config'

export interface CallCenterRegistro {
  id: string
  laboratory_id: string
  nombre_apellido: string
  telefono: string | null
  motivo_llamada: string
  respuesta_observaciones: string | null
  referido_sede: string | null
  atendido_por: string | null
  created_at: string
  created_by: string | null
}

export interface CreateCallCenterRegistroParams {
  nombre_apellido: string
  telefono?: string
  motivo_llamada: string
  respuesta_observaciones?: string
  referido_sede?: string
  atendido_por?: string
}

export interface CreateCallCenterRegistroResult {
  success: boolean
  data?: CallCenterRegistro
  error?: string
}

export interface GetCallCenterRegistrosResult {
  success: boolean
  data?: CallCenterRegistro[]
  error?: string
}

/**
 * Crea un nuevo registro de llamada del call center.
 */
export async function createCallCenterRegistro(
  laboratoryId: string,
  params: CreateCallCenterRegistroParams,
  userId?: string
): Promise<CreateCallCenterRegistroResult> {
  try {
    const { data: user } = await supabase.auth.getUser()
    const createdBy = userId ?? user.data?.user?.id ?? null

    const { data, error } = await supabase
      .from('call_center_registros')
      .insert({
        laboratory_id: laboratoryId,
        nombre_apellido: params.nombre_apellido.trim(),
        telefono: params.telefono?.trim() || null,
        motivo_llamada: params.motivo_llamada.trim(),
        respuesta_observaciones: params.respuesta_observaciones?.trim() || null,
        referido_sede: params.referido_sede?.trim() || null,
        atendido_por: params.atendido_por?.trim() || null,
        created_by: createdBy,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating call center registro:', error)
      return { success: false, error: error.message }
    }

    return { success: true, data: data as CallCenterRegistro }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error desconocido'
    console.error('createCallCenterRegistro:', message)
    return { success: false, error: message }
  }
}

/**
 * Obtiene los registros del call center para un laboratorio (ordenados por fecha desc).
 */
export async function getCallCenterRegistros(
  laboratoryId: string
): Promise<GetCallCenterRegistrosResult> {
  try {
    const { data, error } = await supabase
      .from('call_center_registros')
      .select('*')
      .eq('laboratory_id', laboratoryId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching call center registros:', error)
      return { success: false, error: error.message }
    }

    return { success: true, data: (data ?? []) as CallCenterRegistro[] }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error desconocido'
    console.error('getCallCenterRegistros:', message)
    return { success: false, error: message }
  }
}

/** Estadísticas del call center para un período (total de llamadas y top por atendido_por) */
export interface CallCenterStats {
  totalCalls: number
  topByAtendidoPor: Array<{ name: string; calls: number }>
  /** Conteo por motivo_llamada */
  byMotivo: Array<{ name: string; calls: number }>
  /** Conteo por referido_sede */
  bySede: Array<{ name: string; calls: number }>
}

export interface GetCallCenterStatsResult {
  success: boolean
  data?: CallCenterStats
  error?: string
}

/**
 * Obtiene estadísticas del call center para un laboratorio en un rango de fechas.
 * Incluye total de llamadas y top operadores (atendido_por) por cantidad de llamadas.
 */
export async function getCallCenterStats(
  laboratoryId: string,
  dateFrom: Date,
  dateTo: Date
): Promise<GetCallCenterStatsResult> {
  try {
    const fromStr = dateFrom.toISOString()
    const toStr = dateTo.toISOString()

    const { data, error } = await supabase
      .from('call_center_registros')
      .select('atendido_por, motivo_llamada, referido_sede')
      .eq('laboratory_id', laboratoryId)
      .gte('created_at', fromStr)
      .lte('created_at', toStr)

    if (error) {
      console.error('Error fetching call center stats:', error)
      return { success: false, error: error.message }
    }

    const registros = (data ?? []) as Array<{
      atendido_por: string | null
      motivo_llamada: string | null
      referido_sede: string | null
    }>
    const totalCalls = registros.length

    const countByKey = (getKey: (r: (typeof registros)[0]) => string) => {
      const counts: Record<string, number> = {}
      registros.forEach((r) => {
        const key = getKey(r)
        counts[key] = (counts[key] || 0) + 1
      })
      return Object.entries(counts)
        .map(([name, calls]) => ({ name, calls }))
        .sort((a, b) => b.calls - a.calls)
    }

    // Agrupar por atendido_por (quien atendió la llamada)
    const topByAtendidoPor = countByKey((r) => (r.atendido_por || '').trim() || 'Sin asignar')

    const byMotivo = countByKey((r) => (r.motivo_llamada || '').trim() || 'Sin motivo')
    const bySede = countByKey((r) => (r.referido_sede || '').trim() || 'Sin sede')

    return {
      success: true,
      data: { totalCalls, topByAtendidoPor, byMotivo, bySede },
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error desconocido'
    console.error('getCallCenterStats:', message)
    return { success: false, error: message }
  }
}
