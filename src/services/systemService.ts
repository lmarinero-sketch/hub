import { supabase } from '../lib/supabase';
import type { AuthorizedSystem, HubSistema, HubUsuarioSistema, HubPerfil, HubRol } from '../types';

/**
 * Obtiene los sistemas autorizados para un usuario específico
 */
export async function fetchAuthorizedSystems(userId: string): Promise<AuthorizedSystem[]> {
  const { data, error } = await supabase
    .from('hub_usuario_sistemas')
    .select('*, hub_sistemas(*), hub_roles(*)')
    .eq('user_id', userId)
    .eq('activo', true);

  if (error) {
    console.error('[Systems] Fetch error:', error.message);
    return [];
  }

  return (data || [])
    .filter((row: HubUsuarioSistema) => {
      if (!row.hub_sistemas?.activo) return false;
      if (['liquidaciones', 'osptxt'].includes(row.hub_sistemas.nombre)) return false;
      return true;
    })
    .map((row: HubUsuarioSistema) => ({
      sistema: row.hub_sistemas!,
      rol: row.hub_roles!,
    }));
}

/**
 * Obtiene todos los sistemas registrados (para admin)
 */
export async function fetchAllSystems(): Promise<HubSistema[]> {
  const { data, error } = await supabase
    .from('hub_sistemas')
    .select('*')
    .order('display_name');

  if (error) {
    console.error('[Systems] Fetch all error:', error.message);
    return [];
  }

  return data || [];
}

/**
 * Obtiene todos los roles disponibles
 */
export async function fetchAllRoles(): Promise<HubRol[]> {
  const { data, error } = await supabase
    .from('hub_roles')
    .select('*')
    .order('nivel_acceso', { ascending: false });

  if (error) {
    console.error('[Roles] Fetch error:', error.message);
    return [];
  }

  return data || [];
}

/**
 * Obtiene todos los perfiles de usuario con sus roles (para admin)
 */
export async function fetchAllProfiles(): Promise<HubPerfil[]> {
  const { data, error } = await supabase
    .from('hub_perfiles')
    .select('*, hub_roles(*)')
    .order('display_name');

  if (error) {
    console.error('[Profiles] Fetch error:', error.message);
    return [];
  }

  return data || [];
}

/**
 * Obtiene las asignaciones usuario-sistema (para admin)
 */
export async function fetchAllAssignments(): Promise<HubUsuarioSistema[]> {
  const { data, error } = await supabase
    .from('hub_usuario_sistemas')
    .select('*, hub_sistemas(*), hub_roles(*)')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[Assignments] Fetch error:', error.message);
    return [];
  }

  return data || [];
}

/**
 * Asigna un sistema a un usuario
 */
export async function assignSystemToUser(
  userId: string,
  sistemaId: string,
  rolId: string,
  assignedBy: string
) {
  const { data, error } = await supabase
    .from('hub_usuario_sistemas')
    .upsert(
      {
        user_id: userId,
        sistema_id: sistemaId,
        rol_id: rolId,
        asignado_por: assignedBy,
        activo: true,
      },
      { onConflict: 'user_id,sistema_id' }
    )
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

/**
 * Revoca acceso de un usuario a un sistema
 */
export async function revokeSystemAccess(assignmentId: string) {
  const { error } = await supabase
    .from('hub_usuario_sistemas')
    .update({ activo: false })
    .eq('id', assignmentId);

  if (error) {
    throw new Error(error.message);
  }
}

/**
 * Actualiza el perfil de usuario
 */
export async function updateProfile(profileId: string, updates: Partial<HubPerfil>) {
  const { error } = await supabase
    .from('hub_perfiles')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', profileId);

  if (error) {
    throw new Error(error.message);
  }
}
