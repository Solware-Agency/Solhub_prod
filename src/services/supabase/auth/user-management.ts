import { supabase } from '../config/config'
import type { PostgrestError } from '@supabase/supabase-js'
import { extractLaboratoryId } from '../types/helpers'

export interface UserProfile {
	id: string
	email: string
	role: 'owner' | 'employee' | 'residente' | 'citotecno' | 'patologo' | 'medicowner' | 'medico_tratante' | 'enfermero'
	created_at: string
	updated_at: string
	assigned_branch?: string | null
	display_name?: string | null
	estado?: 'pendiente' | 'aprobado'
	phone?: string | number | null
	laboratory_id?: string | null
}

/* ------------------------------------------------------------------
   Utilidades
-------------------------------------------------------------------*/
const normalizeEmail = (v: string) => v.trim().toLowerCase()

/**
 * Wrapper mínimo para llamar RPCs con tipos sin tener el `Database` generado.
 * Evita TS2345 ("never") y no usa `any`.
 */
type RpcClient = {
	rpc<TArgs extends Record<string, unknown>, TReturn>(
		fn: string,
		args: TArgs,
	): Promise<{ data: TReturn | null; error: PostgrestError | null }>
}
const rpc = (supabase as unknown as RpcClient).rpc.bind(supabase as unknown as RpcClient)

/* ------------------------------------------------------------------
   Updates sobre profiles
-------------------------------------------------------------------*/
export const updateUserRole = async (
  userId: string,
  newRole:
    | 'owner'
    | 'employee'
    | 'residente'
    | 'citotecno'
    | 'patologo'
    | 'medicowner'
    | 'medico_tratante'
    | 'enfermero',
): Promise<{
  data: UserProfile | null;
  error: PostgrestError | Error | null;
}> => {
  try {
    console.log(`Updating user ${userId} role to ${newRole}`);

    // 🔐 MULTI-TENANT: Obtener laboratory_id del usuario actual
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('Usuario no autenticado');
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('laboratory_id')
      .eq('id', user.id)
      .single() as { data: { laboratory_id?: string } | null; error: PostgrestError | null };

    const laboratoryId = extractLaboratoryId(profile);

    if (profileError || !laboratoryId) {
      throw new Error('Usuario no tiene laboratorio asignado');
    }

    // 🔐 MULTI-TENANT: Validar laboratory_id antes de actualizar
    const { data, error } = await supabase
      .from('profiles')
      .update({
        role: newRole,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
      .eq('laboratory_id', laboratoryId) // 🔐 VALIDACIÓN MULTI-TENANT
      .select();

    if (error) {
      console.error('Error updating user role:', error);
      return { data: null, error };
    }
    if (!data || data.length === 0) {
      const noProfileError = new Error(
        `No profile found for user ID: ${userId}`,
      );
      console.error('No profile found for update:', noProfileError);
      return { data: null, error: noProfileError };
    }

    console.log('User role updated successfully:', data[0]);
    return { data: data[0] as UserProfile, error: null };
  } catch (error) {
    console.error('Unexpected error updating user role:', error);
    return { data: null, error: error as Error };
  }
};

export const updateUserBranch = async (
  userId: string,
  branch: string | null,
): Promise<{
  data: UserProfile | null;
  error: PostgrestError | Error | null;
}> => {
  try {
    console.log(`Updating user ${userId} branch to ${branch || 'none'}`);

    // 🔐 MULTI-TENANT: Obtener laboratory_id del usuario actual
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('Usuario no autenticado');
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('laboratory_id')
      .eq('id', user.id)
      .single() as { data: { laboratory_id?: string } | null; error: PostgrestError | null };

    if (profileError || !profile?.laboratory_id) {
      throw new Error('Usuario no tiene laboratorio asignado');
    }

    // 🔐 MULTI-TENANT: Validar laboratory_id antes de actualizar
    const { data, error } = await supabase
      .from('profiles')
      .update({
        assigned_branch: branch,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
      .eq('laboratory_id', profile.laboratory_id) // 🔐 VALIDACIÓN MULTI-TENANT
      .select();

    if (error) {
      console.error('Error updating user branch:', error);
      return { data: null, error };
    }
    if (!data || data.length === 0) {
      const noProfileError = new Error(
        `No profile found for user ID: ${userId}`,
      );
      console.error('No profile found for update:', noProfileError);
      return { data: null, error: noProfileError };
    }

    console.log('User branch updated successfully:', data[0]);
    return { data: data[0] as UserProfile, error: null };
  } catch (error) {
    console.error('Unexpected error updating user branch:', error);
    return { data: null, error: error as Error };
  }
};

export const updateUserApprovalStatus = async (
  userId: string,
  estado: 'pendiente' | 'aprobado',
): Promise<{
  data: UserProfile | null;
  error: PostgrestError | Error | null;
}> => {
  try {
    console.log(`Updating user ${userId} approval status to ${estado}`);

    // 🔐 MULTI-TENANT: Obtener laboratory_id del usuario actual (quien aprueba)
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('Usuario no autenticado');
    }

    const { data: currentUserProfile, error: currentProfileError } = await supabase
      .from('profiles')
      .select('laboratory_id')
      .eq('id', user.id)
      .single() as { data: { laboratory_id?: string } | null; error: PostgrestError | null };

    if (currentProfileError || !currentUserProfile?.laboratory_id) {
      throw new Error('Usuario no tiene laboratorio asignado');
    }

    // 🔐 MULTI-TENANT: Obtener el perfil del usuario a aprobar (para validar que pertenece al mismo lab)
    const { data: targetUserProfile, error: targetProfileError } = await supabase
      .from('profiles')
      .select('id, laboratory_id, email, estado')
      .eq('id', userId)
      .single() as { data: { id: string; laboratory_id?: string; email: string; estado?: string } | null; error: PostgrestError | null };

    if (targetProfileError || !targetUserProfile) {
      console.error('Error fetching target user profile:', targetProfileError);
      return {
        data: null,
        error: new Error('No se encontró el perfil del usuario a aprobar'),
      };
    }

    // Validar que el usuario a aprobar tiene laboratory_id
    if (!targetUserProfile.laboratory_id) {
      console.error('Target user has no laboratory_id:', targetUserProfile);
      return {
        data: null,
        error: new Error('El usuario a aprobar no tiene laboratorio asignado. Contacta al administrador.'),
      };
    }

    // 🔐 MULTI-TENANT: Validar que ambos usuarios pertenecen al mismo laboratorio
    if (targetUserProfile.laboratory_id !== currentUserProfile.laboratory_id) {
      console.error('Laboratory mismatch:', {
        currentUser: currentUserProfile.laboratory_id,
        targetUser: targetUserProfile.laboratory_id,
      });
      return {
        data: null,
        error: new Error('No puedes aprobar usuarios de otro laboratorio'),
      };
    }

    // 🔐 MULTI-TENANT: Actualizar estado
    // RLS ya garantiza que solo podemos actualizar usuarios del mismo laboratorio
    // No necesitamos .eq('laboratory_id') porque RLS lo maneja automáticamente
    console.log('Attempting to update user:', {
      userId,
      estado,
      currentUserLab: currentUserProfile.laboratory_id,
      targetUserLab: targetUserProfile.laboratory_id,
      currentUserRole: 'checking...', // Se obtiene del perfil actual
    });

    const { data, error } = await supabase
      .from('profiles')
      .update({
        estado,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
      // ⚠️ NO usar .eq('laboratory_id') aquí - RLS ya filtra por laboratory_id
      // Si usamos .eq('laboratory_id'), puede causar conflictos con RLS
      .select();

    if (error) {
      console.error('Error updating user approval status:', error);
      return { data: null, error };
    }
    if (!data || data.length === 0) {
      const noProfileError = new Error(
        `No se pudo actualizar el perfil del usuario. Verifica que el usuario pertenezca a tu laboratorio.`,
      );
      console.error('No profile found for update:', noProfileError);
      return { data: null, error: noProfileError };
    }

    console.log('User approval status updated successfully:', data[0]);
    return { data: data[0] as UserProfile, error: null };
  } catch (error) {
    console.error('Unexpected error updating user approval status:', error);
    return { data: null, error: error as Error };
  }
};

/* ------------------------------------------------------------------
   Reads sobre profiles
-------------------------------------------------------------------*/
export const getAllUserProfiles = async (): Promise<{
  data: UserProfile[] | null;
  error: PostgrestError | null;
}> => {
  try {
    // 🔐 MULTI-TENANT: Obtener laboratory_id del usuario actual
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('Usuario no autenticado');
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('laboratory_id')
      .eq('id', user.id)
      .single() as { data: { laboratory_id?: string } | null; error: PostgrestError | null };

    if (profileError || !profile?.laboratory_id) {
      console.error(
        'Error obteniendo laboratory_id del usuario:',
        profileError,
      );
      throw new Error('Usuario no tiene laboratorio asignado');
    }

    // 🔐 MULTI-TENANT: Filtrar perfiles por laboratory_id
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('laboratory_id', profile.laboratory_id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching user profiles:', error);
      return { data: null, error };
    }
    return { data: data as UserProfile[], error: null };
  } catch (error) {
    console.error('Unexpected error fetching user profiles:', error);
    return { data: null, error: error as PostgrestError };
  }
};

export const getUserProfileById = async (
  userId: string,
): Promise<{ data: UserProfile | null; error: PostgrestError | null }> => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Error fetching user profile:', error);
      return { data: null, error };
    }
    return { data: data as UserProfile, error: null };
  } catch (error) {
    console.error('Unexpected error fetching user profile:', error);
    return { data: null, error: error as PostgrestError };
  }
};

/**
 * ¿El usuario actual puede gestionar otros usuarios?
 */
export const canManageUsers = async (
  currentUserId: string,
): Promise<boolean> => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', currentUserId)
      .single();

    if (error || !data) {
      console.error('Error checking user permissions:', error);
      return false;
    }
    return data.role === 'owner';
  } catch (error) {
    console.error('Unexpected error checking user permissions:', error);
    return false;
  }
};

/**
 * Stats básicas de profiles
 */
export const getUserStats = async (): Promise<{
  data: {
    total: number;
    owners: number;
    medicowners: number;
    employees: number;
    residents: number;
    citotecnos: number;
    patologos: number;
    withBranch: number;
    approved: number;
    pending: number;
  } | null;
  error: PostgrestError | null;
}> => {
  try {
    // 🔐 MULTI-TENANT: Obtener laboratory_id del usuario actual
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('Usuario no autenticado');
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('laboratory_id')
      .eq('id', user.id)
      .single() as { data: { laboratory_id?: string } | null; error: PostgrestError | null };

    if (profileError || !profile?.laboratory_id) {
      console.error(
        'Error obteniendo laboratory_id del usuario:',
        profileError,
      );
      throw new Error('Usuario no tiene laboratorio asignado');
    }

    // 🔐 MULTI-TENANT: Filtrar stats por laboratory_id
    const { data, error } = await supabase
      .from('profiles')
      .select('role, assigned_branch, estado')
      .eq('laboratory_id', profile.laboratory_id);

    if (error) {
      console.error('Error fetching user stats:', error);
      return { data: null, error };
    }

    const stats = {
      total: data?.length || 0,
      owners: data?.filter((u) => u.role === 'owner').length || 0,
      medicowners: data?.filter((u) => u.role === 'medicowner').length || 0,
      employees: data?.filter((u) => u.role === 'employee').length || 0,
      residents: data?.filter((u) => u.role === 'residente').length || 0,
      citotecnos: data?.filter((u) => u.role === 'citotecno').length || 0,
      patologos: data?.filter((u) => u.role === 'patologo').length || 0,
      medicosTratantes: data?.filter((u) => u.role === 'medico_tratante').length || 0,
      enfermeros: data?.filter((u) => u.role === 'enfermero').length || 0,
      withBranch: data?.filter((u) => u.assigned_branch).length || 0,
      approved: data?.filter((u) => u.estado === 'aprobado').length || 0,
      pending: data?.filter((u) => u.estado === 'pendiente').length || 0,
    };

    return { data: stats, error: null };
  } catch (error) {
    console.error('Unexpected error fetching user stats:', error);
    return { data: null, error: error as PostgrestError };
  }
};

/* ------------------------------------------------------------------
   Pre-check de email contra auth.users (RPC SECURITY DEFINER)
-------------------------------------------------------------------*/
export async function emailExists(email: string): Promise<{ exists: boolean; error: PostgrestError | null }> {
	try {
		const cleaned = normalizeEmail(email)
		if (!cleaned) return { exists: false, error: null }

		// wrapper tipado evita TS2345 sin Database types
		const { data, error } = await rpc<{ p_email: string }, boolean>('email_exists_auth', {
			p_email: cleaned,
		})
		if (error) return { exists: false, error }
		return { exists: Boolean(data), error: null }
	} catch (err) {
		return { exists: false, error: err as PostgrestError }
	}
}

/* ------------------------------------------------------------------
   Promoción a admin por email
   (busca el perfil para obtener el ID, luego actualiza role)
-------------------------------------------------------------------*/
export const updateUserToAdmin = async (
	email: string,
): Promise<{ success: boolean; error: PostgrestError | Error | null }> => {
	try {
		const cleaned = normalizeEmail(email)

		// 1) Buscar el perfil para obtener el id
		const { data: profile, error: profileErr } = await supabase
			.from('profiles')
			.select('id')
			.eq('email_lower', cleaned)
			.maybeSingle()

		if (profileErr) {
			console.error('Error finding profile by email:', profileErr)
			return { success: false, error: profileErr }
		}
		if (!profile) {
			return { success: false, error: new Error('User not found') }
		}

		// 2) Actualizar rol
		const { error: updateErr } = await updateUserRole(profile.id, 'residente')
		if (updateErr) {
			console.error('Error updating user to admin role:', updateErr)
			return { success: false, error: updateErr }
		}

		console.log(`User ${email} successfully updated to admin role`)
		return { success: true, error: null }
	} catch (error) {
		console.error('Unexpected error updating user to admin:', error)
		return { success: false, error: error as Error }
	}
}
