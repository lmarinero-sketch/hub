import { supabase } from '../lib/supabase';
import type { GeoPosition } from '../types';

/**
 * Obtiene la IP pública del usuario
 */
export async function getPublicIP(): Promise<string | null> {
  try {
    const res = await fetch('https://api.ipify.org?format=json');
    const data = await res.json();
    return data.ip || null;
  } catch {
    console.warn('[Audit] Could not fetch IP');
    return null;
  }
}

/**
 * Solicita la geolocalización del navegador
 */
export function requestGeolocation(): Promise<GeoPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocalización no soportada'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        });
      },
      (err) => {
        reject(new Error(
          err.code === 1
            ? 'Permiso de ubicación denegado. Es obligatorio para ingresar al sistema.'
            : 'Error al obtener la ubicación.'
        ));
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      }
    );
  });
}

/**
 * Registra un evento de auditoría en hub_logs_sesion
 */
export async function logSessionEvent(
  userId: string,
  evento: string,
  options: {
    sistemaId?: string;
    geo?: GeoPosition;
    ip?: string | null;
    metadata?: Record<string, unknown>;
  } = {}
) {
  try {
    const { error } = await supabase.from('hub_logs_sesion').insert({
      user_id: userId,
      evento,
      sistema_id: options.sistemaId || null,
      ip_address: options.ip || null,
      user_agent: navigator.userAgent,
      latitud: options.geo?.latitude || null,
      longitud: options.geo?.longitude || null,
      metadata: options.metadata || {},
    });

    if (error) {
      console.error('[Audit] Log error:', error.message);
    }
  } catch (err) {
    console.error('[Audit] Unexpected error:', err);
  }
}

/**
 * Obtiene los logs de sesión recientes (para el monitor TyS)
 */
export async function fetchRecentLogs(hours: number = 24, limit: number = 200) {
  const since = new Date();
  since.setHours(since.getHours() - hours);

  // Fetch logs without JOINs (FK points to auth.users, not hub_perfiles)
  const { data: logs, error } = await supabase
    .from('hub_logs_sesion')
    .select('*')
    .gte('created_at', since.toISOString())
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('[Audit] Fetch logs error:', error.message);
    return [];
  }

  if (!logs || logs.length === 0) return [];

  // Get unique user IDs and system IDs
  const userIds = [...new Set(logs.map(l => l.user_id).filter(Boolean))];
  const systemIds = [...new Set(logs.map(l => l.sistema_id).filter(Boolean))];

  // Resolve user names from hub_perfiles
  let profileMap: Record<string, { display_name: string; sector: string; cargo: string }> = {};
  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from('hub_perfiles')
      .select('user_id, display_name, sector, cargo')
      .in('user_id', userIds);
    if (profiles) {
      for (const p of profiles) {
        profileMap[p.user_id] = p;
      }
    }
  }

  // Resolve system names from hub_sistemas
  let systemMap: Record<string, { display_name: string }> = {};
  if (systemIds.length > 0) {
    const { data: systems } = await supabase
      .from('hub_sistemas')
      .select('id, display_name')
      .in('id', systemIds);
    if (systems) {
      for (const s of systems) {
        systemMap[s.id] = s;
      }
    }
  }

  // Enrich logs with resolved names
  return logs.map(log => ({
    ...log,
    hub_perfiles: profileMap[log.user_id] || (log.display_name_snapshot ? {
      display_name: log.display_name_snapshot,
      sector: '',
      cargo: '',
    } : (log.external_identifier ? {
      display_name: log.external_identifier,
      sector: '',
      cargo: '',
    } : null)),
    hub_sistemas: systemMap[log.sistema_id] || null,
  }));
}
