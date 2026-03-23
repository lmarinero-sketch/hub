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
-- PASO 4: RPC — Crear usuario en ADM-QUI desde el Hub
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
  v_new_id UUID;
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

  -- Crear en admqui_usuarios
  INSERT INTO admqui_usuarios (usuario, nombre, password_hash, iniciales)
  VALUES (
    LOWER(TRIM(p_usuario)),
    TRIM(p_nombre),
    crypt(p_password, gen_salt('bf')),
    COALESCE(p_iniciales, UPPER(LEFT(TRIM(p_nombre), 1)))
  )
  RETURNING id INTO v_new_id;

  -- Registrar en hub_usuario_sistemas
  SELECT id INTO v_sistema_id FROM hub_sistemas WHERE nombre = 'adm-qui';
  SELECT id INTO v_default_rol_sistema FROM hub_roles_sistema 
    WHERE sistema_id = v_sistema_id AND es_default = true LIMIT 1;
  SELECT id INTO v_default_rol_hub FROM hub_roles WHERE nombre = 'usuario' LIMIT 1;

  INSERT INTO hub_usuario_sistemas (
    user_id, sistema_id, rol_id, rol_sistema_id, asignado_por, activo
  ) VALUES (
    -- Usamos un UUID "virtual" basado en el ID de admqui_usuarios
    v_new_id, v_sistema_id, v_default_rol_hub, v_default_rol_sistema, auth.uid(), true
  ) ON CONFLICT (user_id, sistema_id) DO UPDATE SET activo = true;

  RETURN v_new_id;
END;
$$;

-- -----------------------------------------------
-- PASO 5: RPC — Crear usuario en Enfermería desde el Hub
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
  v_new_id UUID;
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

  -- Crear en enf_usuarios
  INSERT INTO enf_usuarios (nombre, apellido, email, password_hash, rol)
  VALUES (
    TRIM(p_nombre),
    TRIM(p_apellido),
    LOWER(TRIM(p_email)),
    p_password,  -- Enfermería usa plain text actualmente
    p_rol
  )
  RETURNING id INTO v_new_id;

  -- Registrar en hub_usuario_sistemas
  SELECT id INTO v_sistema_id FROM hub_sistemas WHERE nombre = 'enfermeria';
  SELECT id INTO v_rol_sistema FROM hub_roles_sistema 
    WHERE sistema_id = v_sistema_id AND nombre = p_rol LIMIT 1;
  SELECT id INTO v_default_rol_hub FROM hub_roles WHERE nombre = 'usuario' LIMIT 1;

  INSERT INTO hub_usuario_sistemas (
    user_id, sistema_id, rol_id, rol_sistema_id, asignado_por, activo
  ) VALUES (
    v_new_id, v_sistema_id, v_default_rol_hub, v_rol_sistema, auth.uid(), true
  ) ON CONFLICT (user_id, sistema_id) DO UPDATE SET activo = true;

  RETURN v_new_id;
END;
$$;

-- -----------------------------------------------
-- PASO 6: RPC — Listar usuarios de un sistema específico
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
      au.id AS user_id,
      au.usuario AS username,
      au.nombre AS display_name,
      NULL::TEXT AS email,
      'usuario'::TEXT AS rol,
      au.activo,
      au.ultimo_login,
      au.created_at,
      COALESCE(hus.activo, true) AS hub_access_enabled
    FROM admqui_usuarios au
    LEFT JOIN hub_usuario_sistemas hus ON hus.user_id = au.id AND hus.sistema_id = v_sistema_id
    ORDER BY au.nombre;

  ELSIF p_sistema_nombre = 'enfermeria' THEN
    RETURN QUERY
    SELECT 
      eu.id AS user_id,
      eu.email AS username,
      (eu.nombre || ' ' || eu.apellido) AS display_name,
      eu.email,
      eu.rol,
      eu.activo,
      NULL::TIMESTAMPTZ AS ultimo_login,
      eu.created_at,
      COALESCE(hus.activo, true) AS hub_access_enabled
    FROM enf_usuarios eu
    LEFT JOIN hub_usuario_sistemas hus ON hus.user_id = eu.id AND hus.sistema_id = v_sistema_id
    ORDER BY eu.nombre;

  ELSIF p_sistema_nombre = 'contact-center' THEN
    -- CC usa Supabase Auth en OTRO proyecto → no podemos leer desde acá
    -- Retornamos solo lo que tenemos registrado en hub_usuario_sistemas
    RETURN QUERY
    SELECT 
      hus.user_id,
      hp.email AS username,
      COALESCE(hp.display_name, hp.email) AS display_name,
      hp.email,
      COALESCE(hrs.nombre, 'agente') AS rol,
      hus.activo,
      NULL::TIMESTAMPTZ AS ultimo_login,
      hus.created_at,
      hus.activo AS hub_access_enabled
    FROM hub_usuario_sistemas hus
    LEFT JOIN hub_perfiles hp ON hp.user_id = hus.user_id
    LEFT JOIN hub_roles_sistema hrs ON hrs.id = hus.rol_sistema_id
    WHERE hus.sistema_id = v_sistema_id
    ORDER BY hp.display_name;

  ELSIF p_sistema_nombre = 'rrhh-organigrama' THEN
    -- RRHH usa Supabase Auth en la misma DB
    RETURN QUERY
    SELECT 
      au.id AS user_id,
      au.email::TEXT AS username,
      COALESCE(hp.display_name, split_part(au.email::TEXT, '@', 1)) AS display_name,
      au.email::TEXT,
      'usuario'::TEXT AS rol,
      COALESCE(hp.activo, true) AS activo,
      au.last_sign_in_at AS ultimo_login,
      au.created_at,
      COALESCE(hus.activo, true) AS hub_access_enabled
    FROM auth.users au
    LEFT JOIN hub_perfiles hp ON hp.user_id = au.id
    LEFT JOIN hub_usuario_sistemas hus ON hus.user_id = au.id AND hus.sistema_id = v_sistema_id
    ORDER BY hp.display_name NULLS LAST;

  END IF;
END;
$$;

-- -----------------------------------------------
-- PASO 7: RPC — Activar/desactivar usuario en un sistema
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

  -- Sistemas con auth propia: actualizar SOLO en su tabla
  -- (sus UUIDs NO están en auth.users → FK impide usar hub_usuario_sistemas)
  IF p_sistema_nombre = 'adm-qui' THEN
    UPDATE admqui_usuarios SET activo = p_activo, updated_at = now()
    WHERE id = p_target_user_id;
    RETURN;

  ELSIF p_sistema_nombre = 'enfermeria' THEN
    UPDATE enf_usuarios SET activo = p_activo, updated_at = now()
    WHERE id = p_target_user_id;
    RETURN;
  END IF;

  -- Sistemas con Supabase Auth (CC, RRHH, Calidad): usar hub_usuario_sistemas
  -- (sus UUIDs SÍ están en auth.users)
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
