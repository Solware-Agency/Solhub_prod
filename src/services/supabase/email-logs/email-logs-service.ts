import { supabase } from '@/services/supabase/config/config';

export interface EmailSendLog {
  id: string;
  case_id: string;
  recipient_email: string;
  cc_emails?: string[];
  bcc_emails?: string[];
  sent_at: string;
  sent_by_user_id: string | null;
  status: 'success' | 'failed';
  error_message: string | null;
  laboratory_id: string;
  created_at: string | null;
  // Datos unidos de otras tablas
  sent_by_user_name?: string;
}

export interface LogEmailSendParams {
  case_id: string;
  recipient_email: string;
  cc_emails?: string[];
  bcc_emails?: string[];
  laboratory_id: string;
  status: 'success' | 'failed';
  error_message?: string | null;
}

/**
 * Registrar un envío de email en la tabla email_send_logs
 */
export const logEmailSend = async (
  params: LogEmailSendParams,
): Promise<{ success: boolean; error?: string }> => {
  try {
    // Obtener el usuario actual de auth
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { error } = await supabase.from('email_send_logs').insert({
      case_id: params.case_id,
      recipient_email: params.recipient_email,
      sent_at: new Date().toISOString(),
      sent_by_user_id: user?.id || null,
      status: params.status,
      error_message: params.error_message || null,
      laboratory_id: params.laboratory_id,
    });

    if (error) {
      console.error('Error logging email send:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Unexpected error logging email send:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

/**
 * Obtener historial de envíos de email para un caso específico
 */
export const getEmailSendHistory = async (
  caseId: string,
): Promise<{ data: EmailSendLog[] | null; error: any }> => {
  try {
    const { data, error } = await supabase
      .from('email_send_logs')
      .select(
        `
        *,
        sent_by_user:profiles!email_send_logs_sent_by_user_id_fkey(
          display_name
        )
      `,
      )
      .eq('case_id', caseId)
      .order('sent_at', { ascending: false });

    if (error) {
      console.error('Error fetching email send history:', error);
      return { data: null, error };
    }

    // Transformar los datos para incluir el nombre del usuario
    const transformedData = (data || []).map((log: any) => ({
      ...log,
      sent_by_user_name: log.sent_by_user?.display_name || 'Usuario desconocido',
    }));

    return { data: transformedData, error: null };
  } catch (error) {
    console.error('Unexpected error fetching email send history:', error);
    return { data: null, error };
  }
};

/**
 * Obtener el último envío de email para un caso
 */
export const getLastEmailSend = async (
  caseId: string,
): Promise<{ data: EmailSendLog | null; error: any }> => {
  try {
    const { data, error } = await supabase
      .from('email_send_logs')
      .select(
        `
        *,
        sent_by_user:profiles!email_send_logs_sent_by_user_id_fkey(
          display_name
        )
      `,
      )
      .eq('case_id', caseId)
      .order('sent_at', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      // Si no hay registros, no es un error
      if (error.code === 'PGRST116') {
        return { data: null, error: null };
      }
      console.error('Error fetching last email send:', error);
      return { data: null, error };
    }

    // Transformar los datos
    const transformedData: EmailSendLog = {
      ...data,
      status: data.status as 'success' | 'failed',
      sent_by_user_name: (data as any).sent_by_user?.display_name || 'Usuario desconocido',
    };

    return { data: transformedData, error: null };
  } catch (error) {
    console.error('Unexpected error fetching last email send:', error);
    return { data: null, error };
  }
};

/**
 * Obtener conteo de envíos de email para un caso
 */
export const getEmailSendCount = async (
  caseId: string,
): Promise<{ count: number; error: any }> => {
  try {
    const { count, error } = await supabase
      .from('email_send_logs')
      .select('*', { count: 'exact', head: true })
      .eq('case_id', caseId)
      .eq('status', 'success');

    if (error) {
      console.error('Error fetching email send count:', error);
      return { count: 0, error };
    }

    return { count: count || 0, error: null };
  } catch (error) {
    console.error('Unexpected error fetching email send count:', error);
    return { count: 0, error };
  }
};
