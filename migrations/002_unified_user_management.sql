-- ======================================
-- Hub Sanatorio Argentino
-- Migration 002: Admin User Functions
-- ======================================
-- Creates PostgreSQL functions that allow admins to manage auth.users
-- from the frontend via Supabase RPC calls.

-- 1. Extend hub_perfiles with email (synced from auth.users)
ALTER TABLE hub_perfiles ADD COLUMN IF NOT EXISTS email TEXT;

-- 2. Function: List all auth users with their hub profile
CREATE OR REPLACE FUNCTION hub_list_users()
RETURNS TABLE (
  user_id UUID,
  email TEXT,
  auth_created_at TIMESTAMPTZ,
  last_sign_in_at TIMESTAMPTZ,
  display_name TEXT,
  sector TEXT,
  cargo TEXT,
  activo BOOLEAN,
  rol_global_id UUID,
  rol_nombre TEXT,
  rol_display TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only admin_global, rrhh, tys can call this
  IF NOT EXISTS (
    SELECT 1 FROM hub_perfiles hp
    JOIN hub_roles hr ON hp.rol_global = hr.id
    WHERE hp.user_id = auth.uid()
    AND hr.nombre IN ('admin_global', 'rrhh', 'tys')
  ) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  RETURN QUERY
  SELECT
    au.id AS user_id,
    au.email::TEXT,
    au.created_at AS auth_created_at,
    au.last_sign_in_at,
    hp.display_name,
    hp.sector,
    hp.cargo,
    COALESCE(hp.activo, true) AS activo,
    hp.rol_global AS rol_global_id,
    hr.nombre AS rol_nombre,
    hr.display_name AS rol_display
  FROM auth.users au
  LEFT JOIN hub_perfiles hp ON au.id = hp.user_id
  LEFT JOIN hub_roles hr ON hp.rol_global = hr.id
  ORDER BY hp.display_name ASC NULLS LAST, au.email ASC;
END;
$$;

-- 3. Function: Get system assignments for a specific user
CREATE OR REPLACE FUNCTION hub_get_user_systems(target_user_id UUID)
RETURNS TABLE (
  sistema_id UUID,
  sistema_nombre TEXT,
  sistema_display TEXT,
  sistema_color TEXT,
  sistema_url TEXT,
  assigned BOOLEAN,
  rol_id UUID,
  rol_nombre TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM hub_perfiles hp
    JOIN hub_roles hr ON hp.rol_global = hr.id
    WHERE hp.user_id = auth.uid()
    AND hr.nombre IN ('admin_global', 'rrhh', 'tys')
  ) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  RETURN QUERY
  SELECT
    hs.id AS sistema_id,
    hs.nombre AS sistema_nombre,
    hs.display_name AS sistema_display,
    hs.color AS sistema_color,
    hs.url AS sistema_url,
    (hus.id IS NOT NULL AND hus.activo = true) AS assigned,
    hus.rol_id,
    hr.display_name AS rol_nombre
  FROM hub_sistemas hs
  LEFT JOIN hub_usuario_sistemas hus ON hs.id = hus.sistema_id AND hus.user_id = target_user_id
  LEFT JOIN hub_roles hr ON hus.rol_id = hr.id
  WHERE hs.activo = true
  ORDER BY hs.display_name;
END;
$$;

-- 4. Function: Toggle system assignment for a user
CREATE OR REPLACE FUNCTION hub_toggle_system(
  p_target_user_id UUID,
  p_sistema_id UUID,
  p_assign BOOLEAN,
  p_rol_id UUID DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_default_rol UUID;
BEGIN
  -- Only admin_global, rrhh can modify
  IF NOT EXISTS (
    SELECT 1 FROM hub_perfiles hp
    JOIN hub_roles hr ON hp.rol_global = hr.id
    WHERE hp.user_id = auth.uid()
    AND hr.nombre IN ('admin_global', 'rrhh')
  ) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- Get default role (usuario) if none specified
  IF p_rol_id IS NULL THEN
    SELECT id INTO v_default_rol FROM hub_roles WHERE nombre = 'usuario' LIMIT 1;
  ELSE
    v_default_rol := p_rol_id;
  END IF;

  IF p_assign THEN
    -- Assign: upsert
    INSERT INTO hub_usuario_sistemas (user_id, sistema_id, rol_id, asignado_por, activo)
    VALUES (p_target_user_id, p_sistema_id, v_default_rol, auth.uid(), true)
    ON CONFLICT (user_id, sistema_id)
    DO UPDATE SET activo = true, rol_id = v_default_rol, asignado_por = auth.uid();
  ELSE
    -- Unassign: soft delete
    UPDATE hub_usuario_sistemas
    SET activo = false
    WHERE user_id = p_target_user_id AND sistema_id = p_sistema_id;
  END IF;
END;
$$;

-- 5. Function: Update user profile (create or update)
CREATE OR REPLACE FUNCTION hub_upsert_profile(
  p_target_user_id UUID,
  p_display_name TEXT DEFAULT NULL,
  p_sector TEXT DEFAULT NULL,
  p_cargo TEXT DEFAULT NULL,
  p_rol_global_id UUID DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM hub_perfiles hp
    JOIN hub_roles hr ON hp.rol_global = hr.id
    WHERE hp.user_id = auth.uid()
    AND hr.nombre IN ('admin_global', 'rrhh')
  ) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  INSERT INTO hub_perfiles (user_id, display_name, sector, cargo, rol_global, email)
  VALUES (
    p_target_user_id,
    p_display_name,
    p_sector,
    p_cargo,
    p_rol_global_id,
    (SELECT email FROM auth.users WHERE id = p_target_user_id)
  )
  ON CONFLICT (user_id) DO UPDATE SET
    display_name = COALESCE(p_display_name, hub_perfiles.display_name),
    sector = COALESCE(p_sector, hub_perfiles.sector),
    cargo = COALESCE(p_cargo, hub_perfiles.cargo),
    rol_global = COALESCE(p_rol_global_id, hub_perfiles.rol_global),
    updated_at = now();
END;
$$;
