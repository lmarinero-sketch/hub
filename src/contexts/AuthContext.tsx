import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { fetchAuthorizedSystems } from '../services/systemService';
import { logSessionEvent, getPublicIP, requestGeolocation } from '../services/auditService';
import type { Session } from '@supabase/supabase-js';
import type { HubPerfil, AuthorizedSystem, GeoPosition } from '../types';

interface HubAuthContextType {
  session: Session | null;
  profile: HubPerfil | null;
  systems: AuthorizedSystem[];
  loading: boolean;
  geoPosition: GeoPosition | null;
  isGlobalAdmin: boolean;
  isTyS: boolean;
  isRRHH: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshSystems: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<HubAuthContextType>({
  session: null,
  profile: null,
  systems: [],
  loading: true,
  geoPosition: null,
  isGlobalAdmin: false,
  isTyS: false,
  isRRHH: false,
  login: async () => ({ success: false }),
  logout: async () => {},
  refreshSystems: async () => {},
  refreshProfile: async () => {},
});

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<HubPerfil | null>(null);
  const [systems, setSystems] = useState<AuthorizedSystem[]>([]);
  const [loading, setLoading] = useState(true);
  const [geoPosition, setGeoPosition] = useState<GeoPosition | null>(null);

  // Fetch or create hub profile
  const fetchProfile = async (userId: string, email?: string): Promise<HubPerfil | null> => {
    try {
      const { data, error } = await supabase
        .from('hub_perfiles')
        .select('*, hub_roles(*)')
        .eq('user_id', userId)
        .single();

      if (error && error.code === 'PGRST116') {
        // Profile doesn't exist — create
        const { data: newProfile, error: insertError } = await supabase
          .from('hub_perfiles')
          .insert({
            user_id: userId,
            display_name: email || 'Usuario',
            activo: true,
          })
          .select('*, hub_roles(*)')
          .single();

        if (insertError) {
          console.error('[Hub Auth] Error creating profile:', insertError.message);
          return null;
        }
        return newProfile;
      }

      if (error) {
        console.error('[Hub Auth] Error fetching profile:', error.message);
        return null;
      }

      return data;
    } catch (err) {
      console.error('[Hub Auth] Unexpected:', err);
      return null;
    }
  };

  // Load authorized systems
  const refreshSystems = async () => {
    if (!session?.user?.id) return;
    const authorized = await fetchAuthorizedSystems(session.user.id);
    setSystems(authorized);
  };

  const refreshProfile = async () => {
    if (!session?.user?.id) return;
    const p = await fetchProfile(session.user.id, session.user.email);
    if (p) setProfile(p);
  };

  // Login handler
  const login = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) return { success: false, error: error.message };
      if (!data.session) return { success: false, error: 'No se pudo iniciar sesión' };

      // Request geolocation (mandatory)
      try {
        const geo = await requestGeolocation();
        setGeoPosition(geo);

        // Log successful login with geo
        const ip = await getPublicIP();
        await logSessionEvent(data.session.user.id, 'login', { geo, ip });
      } catch (geoErr: unknown) {
        // Geo denied → force logout
        await supabase.auth.signOut();
        const msg = geoErr instanceof Error ? geoErr.message : 'Error de geolocalización';
        return { success: false, error: msg };
      }

      return { success: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error inesperado';
      return { success: false, error: msg };
    }
  };

  // Logout handler
  const logout = async () => {
    if (session?.user?.id) {
      await logSessionEvent(session.user.id, 'logout');
    }
    await supabase.auth.signOut();
    setProfile(null);
    setSystems([]);
    setGeoPosition(null);
  };

  // Listen to auth state changes
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, currentSession) => {
        console.log('[Hub Auth] Event:', event);
        setSession(currentSession);

        if (currentSession?.user?.id) {
          const userId = currentSession.user.id;
          const userEmail = currentSession.user.email;

          setTimeout(async () => {
            const p = await fetchProfile(userId, userEmail || undefined);
            if (p) setProfile(p);

            const authorized = await fetchAuthorizedSystems(userId);
            setSystems(authorized);

            setLoading(false);
          }, 0);
        } else {
          setProfile(null);
          setSystems([]);
          setLoading(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  // Derive role flags from profile
  const roleName = profile?.hub_roles?.nombre || '';
  const isGlobalAdmin = roleName === 'admin_global';
  const isTyS = roleName === 'tys' || isGlobalAdmin;
  const isRRHH = roleName === 'rrhh' || isGlobalAdmin;

  return (
    <AuthContext.Provider
      value={{
        session,
        profile,
        systems,
        loading,
        geoPosition,
        isGlobalAdmin,
        isTyS,
        isRRHH,
        login,
        logout,
        refreshSystems,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
