-- ==========================================
-- Hub Sanatorio Argentino
-- Migration 009: Añadir Recepciones a las RPC del Hub
-- ==========================================

-- 1. Actualizar hub_list_system_users para incluir recepciones apuntando a admqui_usuarios
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

  IF p_sistema_nombre IN ('adm-qui', 'recepciones') THEN
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


-- 2. Actualizar hub_toggle_system_user para incluir recepciones
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

  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = p_target_user_id) THEN
    DECLARE
      v_leg_email TEXT := 'usuario_legado_' || replace(p_target_user_id::text, '-', '') || '@sanatorioargentino.com.ar';
      v_leg_name TEXT := 'Usuario Legado';
    BEGIN
      IF p_sistema_nombre IN ('adm-qui', 'recepciones') THEN
         SELECT COALESCE(nombre, 'Usuario Asistente'), COALESCE(usuario, 'q_user') || '@sanatorioargentino.com.ar' 
         INTO v_leg_name, v_leg_email FROM admqui_usuarios WHERE id = p_target_user_id;
      ELSIF p_sistema_nombre = 'enfermeria' THEN
         SELECT COALESCE(nombre || ' ' || apellido, 'Usuario de Enfermería'), COALESCE(email, v_leg_email) 
         INTO v_leg_name, v_leg_email FROM enf_usuarios WHERE id = p_target_user_id;
      END IF;

      INSERT INTO auth.users (
        id, instance_id, aud, role, email, encrypted_password, 
        email_confirmed_at, raw_app_meta_data, raw_user_meta_data, 
        created_at, updated_at
      ) VALUES (
        p_target_user_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 
        LOWER(TRIM(v_leg_email)), extensions.crypt('legacy_password_reset_needed', extensions.gen_salt('bf'::text)), now(), 
        '{"provider":"email","providers":["email"]}', '{}', now(), now()
      );

      INSERT INTO hub_perfiles (user_id, display_name, activo)
      VALUES (p_target_user_id, v_leg_name, true);
    END;
  END IF;

  -- Actualizar el activo del sistema nativo
  IF p_sistema_nombre IN ('adm-qui', 'recepciones') THEN
    UPDATE admqui_usuarios SET activo = p_activo, updated_at = now()
    WHERE id = p_target_user_id;
  ELSIF p_sistema_nombre = 'enfermeria' THEN
    UPDATE enf_usuarios SET activo = p_activo, updated_at = now()
    WHERE id = p_target_user_id;
  END IF;

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
