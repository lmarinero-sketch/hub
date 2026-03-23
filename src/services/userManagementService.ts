/**
 * userManagementService.ts
 * Servicio centralizado para gestionar usuarios de todos los subsistemas
 * desde el Hub de Sanatorio Argentino.
 */
import { supabase } from '../lib/supabase';

// ─── Tipos ───────────────────────────────────────────────
export interface SystemUser {
  user_id: string;
  username: string;
  display_name: string;
  email: string | null;
  rol: string;
  activo: boolean;
  ultimo_login: string | null;
  created_at: string;
  hub_access_enabled: boolean;
}

export interface SystemRole {
  id: string;
  nombre: string;
  display_name: string;
  es_default: boolean;
}

export interface SystemInfo {
  id: string;
  nombre: string;
  display_name: string;
  color: string;
  url: string;
  // Qué operaciones soporta desde el Hub
  canCreate: boolean;
  canEdit: boolean;
  canToggle: boolean;
  isReadOnly: boolean;
}

// ─── Configuración de sistemas ───────────────────────────
export const SYSTEM_CONFIG: Record<string, Partial<SystemInfo>> = {
  'contact-center': {
    canCreate: false,   // Supabase Auth en otro proyecto → requiere Edge Function
    canEdit: false,
    canToggle: true,    // Podemos bloquear via hub_usuario_sistemas
    isReadOnly: false,
  },
  'adm-qui': {
    canCreate: true,
    canEdit: true,
    canToggle: true,
    isReadOnly: false,
  },
  'enfermeria': {
    canCreate: true,
    canEdit: true,
    canToggle: true,
    isReadOnly: false,
  },
  'rrhh-organigrama': {
    canCreate: false,   // Usa Supabase Auth → se crea desde Supabase dashboard
    canEdit: false,
    canToggle: true,
    isReadOnly: false,
  },
  'calidad': {
    canCreate: false,
    canEdit: false,
    canToggle: true,    // Solo bloquear acceso
    isReadOnly: true,
  },
};

// Sistemas que NO gestionamos (excluir del panel)
const EXCLUDED_SYSTEMS = ['liquidaciones', 'osptxt'];

// ─── API ─────────────────────────────────────────────────

/**
 * Obtiene la lista de sistemas gestionables (excluyendo liquidaciones y osptxt)
 */
export async function fetchManagedSystems(): Promise<SystemInfo[]> {
  const { data, error } = await supabase
    .from('hub_sistemas')
    .select('id, nombre, display_name, color, url')
    .eq('activo', true)
    .order('display_name');

  if (error) throw error;

  return (data || [])
    .filter(s => !EXCLUDED_SYSTEMS.includes(s.nombre))
    .map(s => ({
      ...s,
      ...(SYSTEM_CONFIG[s.nombre] || {
        canCreate: false,
        canEdit: false,
        canToggle: false,
        isReadOnly: true,
      }),
    })) as SystemInfo[];
}

/**
 * Lista usuarios de un sistema específico
 */
export async function fetchSystemUsers(sistemaNombre: string): Promise<SystemUser[]> {
  const { data, error } = await supabase.rpc('hub_list_system_users', {
    p_sistema_nombre: sistemaNombre,
  });

  if (error) throw error;
  return data || [];
}

/**
 * Obtiene los roles disponibles para un sistema
 */
export async function fetchSystemRoles(sistemaNombre: string): Promise<SystemRole[]> {
  const { data, error } = await supabase.rpc('hub_get_system_roles', {
    p_sistema_nombre: sistemaNombre,
  });

  if (error) throw error;
  return data || [];
}

/**
 * Activa/desactiva un usuario en un sistema
 */
export async function toggleSystemUser(
  userId: string,
  sistemaNombre: string,
  activo: boolean
): Promise<void> {
  const { error } = await supabase.rpc('hub_toggle_system_user', {
    p_target_user_id: userId,
    p_sistema_nombre: sistemaNombre,
    p_activo: activo,
  });

  if (error) throw error;
}

/**
 * Crea un usuario en ADM-QUI
 */
export async function createAdmQuiUser(
  usuario: string,
  nombre: string,
  password: string,
  iniciales?: string
): Promise<string> {
  const { data, error } = await supabase.rpc('hub_create_admqui_user', {
    p_usuario: usuario,
    p_nombre: nombre,
    p_password: password,
    p_iniciales: iniciales || null,
  });

  if (error) throw error;
  return data;
}

/**
 * Crea un usuario en Enfermería
 */
export async function createEnfermeriaUser(
  nombre: string,
  apellido: string,
  email: string,
  password: string,
  rol: string = 'enfermero'
): Promise<string> {
  const { data, error } = await supabase.rpc('hub_create_enfermeria_user', {
    p_nombre: nombre,
    p_apellido: apellido,
    p_email: email,
    p_password: password,
    p_rol: rol,
  });

  if (error) throw error;
  return data;
}

/**
 * Actualiza un usuario de un sistema
 */
export async function updateSystemUser(
  userId: string,
  sistemaNombre: string,
  updates: { nombre?: string; rol?: string; password?: string }
): Promise<void> {
  const { error } = await supabase.rpc('hub_update_system_user', {
    p_target_user_id: userId,
    p_sistema_nombre: sistemaNombre,
    p_nombre: updates.nombre || null,
    p_rol: updates.rol || null,
    p_password: updates.password || null,
  });

  if (error) throw error;
}
