-- ==========================================
-- Hub Sanatorio Argentino
-- Migration 005: Legacy User Sync & Identity Unification
-- ==========================================
-- Esta migración no borra nada. 
-- Su único propósito es ACTUALIZAR las RPCs para auto-migrar
-- usuarios antiguos de ADM-QUI y Enfermería hacia la base central 
-- del Hub (auth.users) al asignarles permisos.
-- Ocurre totalmente por detrás ('behind the scenes').

-- -----------------------------------------------
-- 1. Actualizar RPC — Crear usuario en ADM-QUI desde el Hub (Identidad Unificada)
-- -----------------------------------------------
CREATE OR REPLACE FUNCTION hub_create_admqui_user(
  p_usuario TEXT,
  p_nombre TEXT,
  p_password TEXT,
  p_iniciales TEXT DEFAULT NULL
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
  -- Verificar permisos (admin_global, rrhh, tys)
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
    email_confirmed_at, recovery_sent_at, last_sign_in_at, 
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at, 
    confirmation_token, email_change, email_change_token_new, recovery_token
  ) VALUES (
    v_new_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 
    LOWER(TRIM(p_usuario)) || '@sanatorioargentino.com.ar', 
    extensions.crypt(p_password, extensions.gen_salt('bf'::text)), now(), null, null, 
    '{"provider":"email","providers":["email"]}', '{}', now(), now(), 
    '', '', '', ''
  );

  -- 2. Crear perfil central en el Hub
  INSERT INTO hub_perfiles (user_id, display_name, activo)
  VALUES (v_new_id, TRIM(p_nombre), true);

  -- 3. Crear en admqui_usuarios (forzando el mismo ID)
  INSERT INTO admqui_usuarios (id, usuario, nombre, password_hash, iniciales)
  VALUES (
    v_new_id,
    LOWER(TRIM(p_usuario)),
    TRIM(p_nombre),
    extensions.crypt(p_password, extensions.gen_salt('bf'::text)),
    COALESCE(p_iniciales, UPPER(LEFT(TRIM(p_nombre), 1)))
  );

  -- 4. Registrar en hub_usuario_sistemas
  SELECT id INTO v_sistema_id FROM hub_sistemas WHERE nombre = 'adm-qui';
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

-- -----------------------------------------------
-- 2. Actualizar RPC — Crear usuario en Enfermería desde el Hub (Identidad Unificada)
-- -----------------------------------------------
CREATE OR REPLACE FUNCTION hub_create_enfermeria_user(
  p_nombre TEXT,
  p_apellido TEXT,
  p_email TEXT,
  p_password TEXT,
  p_rol TEXT DEFAULT 'enfermero'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_id UUID := gen_random_uuid();
  v_sistema_id UUID;
  v_rol_sistema UUID;
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

  -- 2. Crear perfil central en el Hub
  INSERT INTO hub_perfiles (user_id, display_name, activo)
  VALUES (v_new_id, TRIM(p_nombre) || ' ' || TRIM(p_apellido), true);

  -- 3. Crear en enf_usuarios (forzando el mismo ID)
  INSERT INTO enf_usuarios (id, nombre, apellido, email, password_hash, rol)
  VALUES (
    v_new_id,
    TRIM(p_nombre),
    TRIM(p_apellido),
    LOWER(TRIM(p_email)),
    p_password, 
    p_rol
  );

  -- 4. Registrar en hub_usuario_sistemas
  SELECT id INTO v_sistema_id FROM hub_sistemas WHERE nombre = 'enfermeria';
  SELECT id INTO v_rol_sistema FROM hub_roles_sistema 
    WHERE sistema_id = v_sistema_id AND nombre = p_rol LIMIT 1;
  SELECT id INTO v_default_rol_hub FROM hub_roles WHERE nombre = 'usuario' LIMIT 1;

  INSERT INTO hub_usuario_sistemas (
    user_id, sistema_id, rol_id, rol_sistema_id, asignado_por, activo
  ) VALUES (
    v_new_id, v_sistema_id, v_default_rol_hub, v_rol_sistema, auth.uid(), true
  );

  RETURN v_new_id;
END;
$$;

-- -----------------------------------------------
-- 3. Actualizar RPC — Listar usuarios (Cruza legados con auth centrales)
-- -----------------------------------------------
CREATE OR REPLACE FUNCTION hub_list_system_users(p_sistema_nombre TEXT)
RETURNS TABLE (
  user_id UUID,
  username TEXT,
  display_name TEXT,
  email TEXT,
  rol TEXT,
  activo BOOLEAN,
  ultimo_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  hub_access_enabled BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sistema_id UUID;
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

  SELECT id INTO v_sistema_id FROM hub_sistemas WHERE nombre = p_sistema_nombre;

  IF p_sistema_nombre = 'adm-qui' THEN
    RETURN QUERY
    SELECT 
      COALESCE(au.id, hp.user_id) AS user_id,
      COALESCE(au.usuario, u.email) AS username,
      COALESCE(hp.display_name, au.nombre) AS display_name,
      u.email::TEXT,
      'usuario'::TEXT AS rol,
      COALESCE(hus.activo, au.activo, false) AS activo,
      au.ultimo_login,
      COALESCE(hp.created_at, au.created_at),
      COALESCE(hus.activo, false) AS hub_access_enabled
    FROM hub_perfiles hp
    JOIN auth.users u ON u.id = hp.user_id
    LEFT JOIN hub_usuario_sistemas hus ON hus.user_id = hp.user_id AND hus.sistema_id = v_sistema_id
    LEFT JOIN admqui_usuarios au ON au.id = hp.user_id
    WHERE hus.id IS NOT NULL OR au.id IS NOT NULL
    ORDER BY hp.display_name;

  ELSIF p_sistema_nombre = 'enfermeria' THEN
    RETURN QUERY
    SELECT 
      COALESCE(eu.id, hp.user_id) AS user_id,
      COALESCE(eu.email, u.email) AS username,
      COALESCE(hp.display_name, eu.nombre || ' ' || eu.apellido) AS display_name,
      COALESCE(eu.email, u.email)::TEXT,
      COALESCE(eu.rol, 'enfermero') AS rol,
      COALESCE(hus.activo, eu.activo, false) AS activo,
      NULL::TIMESTAMPTZ AS ultimo_login,
      COALESCE(hp.created_at, eu.created_at),
      COALESCE(hus.activo, false) AS hub_access_enabled
    FROM hub_perfiles hp
    JOIN auth.users u ON u.id = hp.user_id
    LEFT JOIN hub_usuario_sistemas hus ON hus.user_id = hp.user_id AND hus.sistema_id = v_sistema_id
    LEFT JOIN enf_usuarios eu ON eu.id = hp.user_id
    WHERE hus.id IS NOT NULL OR eu.id IS NOT NULL
    ORDER BY hp.display_name;

  ELSIF p_sistema_nombre = 'contact-center' THEN
    RETURN QUERY
    SELECT 
      hp.user_id,
      u.email::TEXT AS username,
      hp.display_name,
      u.email::TEXT,
      COALESCE(hrs.nombre, 'agente') AS rol,
      COALESCE(hus.activo, false) AS activo,
      NULL::TIMESTAMPTZ AS ultimo_login,
      hp.created_at,
      COALESCE(hus.activo, false) AS hub_access_enabled
    FROM hub_perfiles hp
    JOIN auth.users u ON u.id = hp.user_id
    JOIN hub_usuario_sistemas hus ON hus.user_id = hp.user_id AND hus.sistema_id = v_sistema_id
    LEFT JOIN hub_roles_sistema hrs ON hrs.id = hus.rol_sistema_id
    ORDER BY hp.display_name;

  ELSIF p_sistema_nombre = 'rrhh-organigrama' THEN
    RETURN QUERY
    SELECT 
      hp.user_id,
      u.email::TEXT AS username,
      hp.display_name,
      u.email::TEXT,
      'usuario'::TEXT AS rol,
      hp.activo,
      u.last_sign_in_at AS ultimo_login,
      hp.created_at,
      COALESCE(hus.activo, false) AS hub_access_enabled
    FROM hub_perfiles hp
    JOIN auth.users u ON u.id = hp.user_id
    LEFT JOIN hub_usuario_sistemas hus ON hus.user_id = hp.user_id AND hus.sistema_id = v_sistema_id
    WHERE hus.id IS NOT NULL
    ORDER BY hp.display_name NULLS LAST;

  END IF;
END;
$$;

-- -----------------------------------------------
-- 4. Actualizar RPC — Mágia de Auto-migración (Identity Sync al encender/apagar)
-- -----------------------------------------------
CREATE OR REPLACE FUNCTION hub_toggle_system_user(
  p_target_user_id UUID,
  p_sistema_nombre TEXT,
  p_activo BOOLEAN
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sistema_id UUID;
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

  SELECT id INTO v_sistema_id FROM hub_sistemas WHERE nombre = p_sistema_nombre;

  -- AUTO-MIGRACIÓN: Si el usuario NO existe en auth.users (es un usuario viejo), lo incorporamos 
  -- silenciosamente a la base centralizada del Hub. No pierde permisos, solo se integra.
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = p_target_user_id) THEN
    DECLARE
      v_leg_email TEXT := 'usuario_legado_' || replace(p_target_user_id::text, '-', '') || '@sanatorioargentino.com.ar';
      v_leg_name TEXT := 'Usuario Legado';
    BEGIN
      IF p_sistema_nombre = 'adm-qui' THEN
         SELECT COALESCE(nombre, 'Usuario de Quirófano'), COALESCE(usuario, 'q_user') || '@sanatorioargentino.com.ar' 
         INTO v_leg_name, v_leg_email FROM admqui_usuarios WHERE id = p_target_user_id;
      ELSIF p_sistema_nombre = 'enfermeria' THEN
         SELECT COALESCE(nombre || ' ' || apellido, 'Usuario de Enfermería'), COALESCE(email, v_leg_email) 
         INTO v_leg_name, v_leg_email FROM enf_usuarios WHERE id = p_target_user_id;
      END IF;

      -- Insertar identidad en auth.users
      INSERT INTO auth.users (
        id, instance_id, aud, role, email, encrypted_password, 
        email_confirmed_at, raw_app_meta_data, raw_user_meta_data, 
        created_at, updated_at
      ) VALUES (
        p_target_user_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 
        LOWER(TRIM(v_leg_email)), extensions.crypt('legacy_password_reset_needed', extensions.gen_salt('bf'::text)), now(), 
        '{"provider":"email","providers":["email"]}', '{}', now(), now()
      );

      -- Insertar en hub_perfiles
      INSERT INTO hub_perfiles (user_id, display_name, activo)
      VALUES (p_target_user_id, v_leg_name, true);
    END;
  END IF;

  -- Actualizar el activo del sistema nativo si es ADM-QUI o ENFERMERÍA
  IF p_sistema_nombre = 'adm-qui' THEN
    UPDATE admqui_usuarios SET activo = p_activo, updated_at = now()
    WHERE id = p_target_user_id;
  ELSIF p_sistema_nombre = 'enfermeria' THEN
    UPDATE enf_usuarios SET activo = p_activo, updated_at = now()
    WHERE id = p_target_user_id;
  END IF;

  -- Actualizar/Insertar en hub_usuario_sistemas (El core centralizado del Hub)
  UPDATE hub_usuario_sistemas
  SET activo = p_activo
  WHERE user_id = p_target_user_id AND sistema_id = v_sistema_id;

  IF NOT FOUND THEN
    INSERT INTO hub_usuario_sistemas (user_id, sistema_id, rol_id, rol_sistema_id, activo, asignado_por)
    VALUES (
      p_target_user_id, v_sistema_id,
      (SELECT id FROM hub_roles WHERE nombre = 'usuario' LIMIT 1),
      (SELECT id FROM hub_roles_sistema WHERE sistema_id = v_sistema_id AND es_default = true LIMIT 1),
      p_activo, auth.uid()
    )
    ON CONFLICT (user_id, sistema_id) DO UPDATE SET activo = p_activo;
  END IF;
END;
$$;
