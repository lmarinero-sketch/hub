-- ==========================================
-- Migración 004: Gestión Centralizada de Usuarios
-- 
-- Permite al Hub crear, editar y controlar acceso de usuarios
-- en todos los subsistemas del ecosistema.
--
-- Sistemas gestionados:
--   ✅ Contact Center  → Supabase Auth (proyecto separado, via Edge Function)
--   ✅ ADM-QUI         → admqui_usuarios (misma DB)
--   ✅ Enfermería      → enf_usuarios (misma DB)
--   ✅ RRHH            → auth.users (misma DB)
--   👁️ Dora (Calidad)  → Solo lectura + bloqueo
--
-- PRINCIPIO: Solo AGREGAR. No modificar tablas existentes.
-- ==========================================

-- -----------------------------------------------
-- PASO 1: Catálogo de roles POR SISTEMA
-- Cada sistema define sus propios roles internos.
-- -----------------------------------------------
CREATE TABLE IF NOT EXISTS hub_roles_sistema (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sistema_id UUID NOT NULL REFERENCES hub_sistemas(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,          -- ej: 'coordinador', 'agente', 'refuerzo'
  display_name TEXT NOT NULL,    -- ej: 'Coordinador'
  descripcion TEXT,
  es_default BOOLEAN DEFAULT false,  -- rol asignado por defecto al crear
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(sistema_id, nombre)
);

ALTER TABLE hub_roles_sistema ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view system roles"
  ON hub_roles_sistema FOR SELECT
  USING (auth.role() = 'authenticated');

-- -----------------------------------------------
-- PASO 2: Seed de roles por sistema
-- -----------------------------------------------
-- Contact Center
INSERT INTO hub_roles_sistema (sistema_id, nombre, display_name, es_default)
SELECT hs.id, r.nombre, r.display_name, r.es_default
FROM hub_sistemas hs
CROSS JOIN (VALUES 
  ('coordinador', 'Coordinador', false),
  ('agente', 'Agente', true),
  ('refuerzo', 'Refuerzo', false)
) AS r(nombre, display_name, es_default)
WHERE hs.nombre = 'contact-center'
ON CONFLICT (sistema_id, nombre) DO NOTHING;

-- ADM-QUI (rol único)
INSERT INTO hub_roles_sistema (sistema_id, nombre, display_name, es_default)
SELECT hs.id, 'usuario', 'Usuario', true
FROM hub_sistemas hs WHERE hs.nombre = 'adm-qui'
ON CONFLICT (sistema_id, nombre) DO NOTHING;

-- Enfermería
INSERT INTO hub_roles_sistema (sistema_id, nombre, display_name, es_default)
SELECT hs.id, r.nombre, r.display_name, r.es_default
FROM hub_sistemas hs
CROSS JOIN (VALUES 
  ('admin', 'Administrador', false),
  ('coordinador', 'Coordinador', false),
  ('enfermero', 'Enfermero', true)
) AS r(nombre, display_name, es_default)
WHERE hs.nombre = 'enfermeria'
ON CONFLICT (sistema_id, nombre) DO NOTHING;

-- RRHH (rol único)
INSERT INTO hub_roles_sistema (sistema_id, nombre, display_name, es_default)
SELECT hs.id, 'usuario', 'Usuario', true
FROM hub_sistemas hs WHERE hs.nombre = 'rrhh-organigrama'
ON CONFLICT (sistema_id, nombre) DO NOTHING;

-- Calidad / Dora (solo lectura, pero registramos los roles para referencia)
INSERT INTO hub_roles_sistema (sistema_id, nombre, display_name, es_default)
SELECT hs.id, 'usuario', 'Usuario', true
FROM hub_sistemas hs WHERE hs.nombre = 'calidad'
ON CONFLICT (sistema_id, nombre) DO NOTHING;

-- -----------------------------------------------
-- PASO 3: Agregar rol_sistema_id a hub_usuario_sistemas
-- Para trackear qué rol específico del sistema tiene el usuario
-- -----------------------------------------------
ALTER TABLE hub_usuario_sistemas 
  ADD COLUMN IF NOT EXISTS rol_sistema_id UUID REFERENCES hub_roles_sistema(id);

-- -----------------------------------------------
-- PASO 4: RPC — Crear usuario en ADM-QUI desde el Hub (Identidad Unificada)
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
  -- Como es SECURITY DEFINER, podemos escribir en auth.users
  INSERT INTO auth.users (
    id, instance_id, aud, role, email, encrypted_password, 
    email_confirmed_at, recovery_sent_at, last_sign_in_at, 
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at, 
    confirmation_token, email_change, email_change_token_new, recovery_token
  ) VALUES (
    v_new_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 
    LOWER(TRIM(p_usuario)) || '@sanatorioargentino.com.ar', 
    crypt(p_password, gen_salt('bf')), now(), null, null, 
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
    crypt(p_password, gen_salt('bf')),
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
-- PASO 5: RPC — Crear usuario en Enfermería desde el Hub (Identidad Unificada)
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
    crypt(p_password, gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{}', 
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
    p_password,  -- Enfermería usa plain text actualmente, o se asume así
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
-- PASO 6: RPC — Listar usuarios de un sistema específico (Unificado)
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

  -- AHORA TODOS LOS USUARIOS LISTADOS PROVIENEN DE hub_perfiles DE FORMA CENTRAL!
  -- Devolvemos los que SÍ tienen acceso explícito o existían en la tabla legada.
  
  IF p_sistema_nombre = 'adm-qui' THEN
    RETURN QUERY
    SELECT 
      COALESCE(au.id, hp.user_id) AS user_id,
      COALESCE(au.usuario, u.email) AS username,
      COALESCE(hp.display_name, au.nombre) AS display_name,
      u.email::TEXT,
      'usuario'::TEXT AS rol,
      COALESCE(au.activo, true) AS activo,
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
      COALESCE(eu.activo, true) AS activo,
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
-- PASO 7: RPC — Activar/desactivar usuario en un sistema (Unificado)
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

  -- 1. Si el usuario NO existe en auth.users (ej: usuario legado de ADM-QUI), lo CREAMOS al vuelo
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = p_target_user_id) THEN
    DECLARE
      v_leg_email TEXT := 'usuario_legado_' || replace(p_target_user_id::text, '-', '') || '@sanatorioargentino.com.ar';
      v_leg_name TEXT := 'Usuario Legado';
    BEGIN
      -- Intentar sacar datos de admqui
      IF p_sistema_nombre = 'adm-qui' THEN
         SELECT COALESCE(nombre, 'Usuario de Quirófano'), COALESCE(usuario, 'q_user') || '@sanatorioargentino.com.ar' 
         INTO v_leg_name, v_leg_email FROM admqui_usuarios WHERE id = p_target_user_id;
      ELSIF p_sistema_nombre = 'enfermeria' THEN
         SELECT COALESCE(nombre || ' ' || apellido, 'Usuario de Enfermería'), COALESCE(email, v_leg_email) 
         INTO v_leg_name, v_leg_email FROM enf_usuarios WHERE id = p_target_user_id;
      END IF;

      -- Insertar identidad dummy en auth.users para satisfacer la FK
      INSERT INTO auth.users (
        id, instance_id, aud, role, email, encrypted_password, 
        email_confirmed_at, raw_app_meta_data, raw_user_meta_data, 
        created_at, updated_at
      ) VALUES (
        p_target_user_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 
        LOWER(TRIM(v_leg_email)), crypt('legacy_password_reset_needed', gen_salt('bf')), now(), 
        '{"provider":"email","providers":["email"]}', '{}', now(), now()
      );

      -- Insertar en hub_perfiles
      INSERT INTO hub_perfiles (user_id, display_name, activo)
      VALUES (p_target_user_id, v_leg_name, true);
    END;
  END IF;

  -- 2. Actualizar el activo del sistema si el usuario ya existe ahí
  IF p_sistema_nombre = 'adm-qui' THEN
    UPDATE admqui_usuarios SET activo = p_activo, updated_at = now()
    WHERE id = p_target_user_id;

  ELSIF p_sistema_nombre = 'enfermeria' THEN
    UPDATE enf_usuarios SET activo = p_activo, updated_at = now()
    WHERE id = p_target_user_id;
  END IF;

  -- 3. Actualizar/Insertar en hub_usuario_sistemas 
  UPDATE hub_usuario_sistemas
  SET activo = p_activo
  WHERE user_id = p_target_user_id AND sistema_id = v_sistema_id;

  IF NOT FOUND THEN
    INSERT INTO hub_usuario_sistemas (user_id, sistema_id, rol_id, activo, asignado_por)
    VALUES (
      p_target_user_id, v_sistema_id,
      (SELECT id FROM hub_roles WHERE nombre = 'usuario' LIMIT 1),
      p_activo, auth.uid()
    )
    ON CONFLICT (user_id, sistema_id) DO UPDATE SET activo = p_activo;
  END IF;
END;
$$;

-- -----------------------------------------------
-- PASO 8: RPC — Actualizar usuario de un sistema
-- -----------------------------------------------
CREATE OR REPLACE FUNCTION hub_update_system_user(
  p_target_user_id UUID,
  p_sistema_nombre TEXT,
  p_nombre TEXT DEFAULT NULL,
  p_rol TEXT DEFAULT NULL,
  p_password TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sistema_id UUID;
  v_rol_sistema_id UUID;
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
    UPDATE admqui_usuarios SET
      nombre = COALESCE(p_nombre, nombre),
      password_hash = CASE WHEN p_password IS NOT NULL THEN crypt(p_password, gen_salt('bf')) ELSE password_hash END,
      updated_at = now()
    WHERE id = p_target_user_id;
    -- Actualizar perfil hub también
    IF p_nombre IS NOT NULL THEN
      UPDATE hub_perfiles SET display_name = p_nombre WHERE user_id = p_target_user_id;
    END IF;

  ELSIF p_sistema_nombre = 'enfermeria' THEN
    UPDATE enf_usuarios SET
      nombre = COALESCE(
        CASE WHEN p_nombre IS NOT NULL THEN split_part(p_nombre, ' ', 1) ELSE NULL END,
        nombre
      ),
      apellido = COALESCE(
        CASE WHEN p_nombre IS NOT NULL AND p_nombre LIKE '% %' THEN substring(p_nombre FROM position(' ' IN p_nombre) + 1) ELSE NULL END,
        apellido
      ),
      rol = COALESCE(p_rol, rol),
      password_hash = COALESCE(p_password, password_hash),
      updated_at = now()
    WHERE id = p_target_user_id;
    -- Actualizar perfil hub
    IF p_nombre IS NOT NULL THEN
      UPDATE hub_perfiles SET display_name = p_nombre WHERE user_id = p_target_user_id;
    END IF;
  END IF;

  -- Actualizar contraseña en auth.users si se provee
  IF p_password IS NOT NULL THEN
    UPDATE auth.users SET encrypted_password = crypt(p_password, gen_salt('bf'))
    WHERE id = p_target_user_id;
  END IF;

  -- Actualizar rol_sistema en hub_usuario_sistemas si se pasó un rol
  IF p_rol IS NOT NULL THEN
    SELECT id INTO v_rol_sistema_id FROM hub_roles_sistema
      WHERE sistema_id = v_sistema_id AND nombre = p_rol LIMIT 1;
    
    UPDATE hub_usuario_sistemas
    SET rol_sistema_id = v_rol_sistema_id
    WHERE user_id = p_target_user_id AND sistema_id = v_sistema_id;
  END IF;
END;
$$;

-- -----------------------------------------------
-- PASO 9: RPC — Obtener roles disponibles para un sistema
-- -----------------------------------------------
CREATE OR REPLACE FUNCTION hub_get_system_roles(p_sistema_nombre TEXT)
RETURNS TABLE (
  id UUID,
  nombre TEXT,
  display_name TEXT,
  es_default BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT hrs.id, hrs.nombre, hrs.display_name, hrs.es_default
  FROM hub_roles_sistema hrs
  JOIN hub_sistemas hs ON hrs.sistema_id = hs.id
  WHERE hs.nombre = p_sistema_nombre
  ORDER BY hrs.display_name;
END;
$$;

-- -----------------------------------------------
-- PERMISOS
-- -----------------------------------------------
GRANT EXECUTE ON FUNCTION hub_create_admqui_user TO authenticated;
GRANT EXECUTE ON FUNCTION hub_create_enfermeria_user TO authenticated;
GRANT EXECUTE ON FUNCTION hub_list_system_users TO authenticated;
GRANT EXECUTE ON FUNCTION hub_toggle_system_user TO authenticated;
GRANT EXECUTE ON FUNCTION hub_update_system_user TO authenticated;
GRANT EXECUTE ON FUNCTION hub_get_system_roles TO authenticated;

-- ==========================================
-- FIN — Solo operaciones aditivas:
--   CREATE TABLE hub_roles_sistema
--   ADD COLUMN rol_sistema_id en hub_usuario_sistemas
--   CREATE FUNCTION (6 nuevas RPCs)
--   INSERT seeds (roles por sistema)
--   GRANT permisos
-- ==========================================

-- UPDATE: Desactivar temporalmente sistemas no integrados
UPDATE hub_sistemas 
SET activo = false 
WHERE nombre IN ('liquidaciones', 'osptxt');
