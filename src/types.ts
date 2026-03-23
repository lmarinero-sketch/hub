// Hub Sanatorio Argentino — Type Definitions

export interface HubSistema {
  id: string;
  nombre: string;
  display_name: string;
  descripcion: string | null;
  url: string;
  icono: string | null;
  color: string;
  activo: boolean;
  created_at: string;
}

export interface HubRol {
  id: string;
  nombre: string;
  display_name: string;
  descripcion: string | null;
  nivel_acceso: number;
}

export interface HubUsuarioSistema {
  id: string;
  user_id: string;
  sistema_id: string;
  rol_id: string;
  asignado_por: string | null;
  activo: boolean;
  created_at: string;
  // Joined fields
  hub_sistemas?: HubSistema;
  hub_roles?: HubRol;
}

export interface HubPerfil {
  id: string;
  user_id: string;
  display_name: string | null;
  dni: string | null;
  telefono: string | null;
  sector: string | null;
  cargo: string | null;
  avatar_url: string | null;
  rol_global: string | null;
  activo: boolean;
  created_at: string;
  updated_at: string;
  // Joined fields
  hub_roles?: HubRol;
}

export interface HubLogSesion {
  id: string;
  user_id: string;
  evento: string;
  sistema_id: string | null;
  ip_address: string | null;
  user_agent: string | null;
  latitud: number | null;
  longitud: number | null;
  metadata: Record<string, unknown>;
  created_at: string;
  // Joined fields
  hub_perfiles?: HubPerfil;
  hub_sistemas?: HubSistema;
}

export interface AuthorizedSystem {
  sistema: HubSistema;
  rol: HubRol;
}

export interface GeoPosition {
  latitude: number;
  longitude: number;
}
