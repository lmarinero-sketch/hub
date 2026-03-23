-- ==========================================
-- Hub Sanatorio Argentino
-- Migration 007: RRHH Organigrama (Same DB) Unification
-- ==========================================

-- -----------------------------------------------
-- 1. RPC — Crear usuario en RRHH Organigrama desde el Hub
-- -----------------------------------------------
CREATE OR REPLACE FUNCTION hub_create_rrhh_user(
  p_email TEXT,
  p_nombre TEXT,
  p_apellido TEXT,
  p_password TEXT,
  p_cargo TEXT DEFAULT NULL,
  p_sector TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_id UUID := gen_random_uuid();
  v_sistema_id UUID;
  v_default_rol_sistema UUID;
  v_default_rol_hub UUID;
BEGIN
  -- Verificar permisos
  IF NOT EXISTS (
    SELECT 1 FROM hub_perfiles hp
    JOIN hub_roles hr ON hp.rol_global = hr.id
    WHERE hp.user_id = auth.uid()
    AND hr.nombre IN ('admin_global', 'rrhh', 'tys')
  ) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- 1. Crear identidad central (auth.users)
  INSERT INTO auth.users (
    id, instance_id, aud, role, email, encrypted_password, 
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data, 
    created_at, updated_at, confirmation_token, email_change, 
    email_change_token_new, recovery_token
  ) VALUES (
    v_new_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 
    LOWER(TRIM(p_email)), 
    extensions.crypt(p_password, extensions.gen_salt('bf'::text)), now(), '{"provider":"email","providers":["email"]}', '{}', 
    now(), now(), '', '', '', ''
  );

  -- 2. Crear perfil central en el Hub (Aprovechado por RRHH)
  INSERT INTO hub_perfiles (user_id, display_name, email, cargo, sector, activo)
  VALUES (
    v_new_id, 
    TRIM(p_nombre) || ' ' || TRIM(p_apellido), 
    LOWER(TRIM(p_email)),
    p_cargo,
    p_sector,
    true
  );

  -- 3. No hay tabla nativa de RRHH porque RRHH usa hub_perfiles directo!
  
  -- 4. Registrar en hub_usuario_sistemas
  SELECT id INTO v_sistema_id FROM hub_sistemas WHERE nombre = 'rrhh-organigrama';
  SELECT id INTO v_default_rol_sistema FROM hub_roles_sistema 
    WHERE sistema_id = v_sistema_id AND es_default = true LIMIT 1;
  SELECT id INTO v_default_rol_hub FROM hub_roles WHERE nombre = 'usuario' LIMIT 1;

  INSERT INTO hub_usuario_sistemas (
    user_id, sistema_id, rol_id, rol_sistema_id, asignado_por, activo
  ) VALUES (
    v_new_id, v_sistema_id, v_default_rol_hub, v_default_rol_sistema, auth.uid(), true
  );

  RETURN v_new_id;
END;
$$;
