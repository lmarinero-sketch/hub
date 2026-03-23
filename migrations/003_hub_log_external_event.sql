-- ==========================================
-- Migración 003: RPC para logging de sistemas externos
-- 
-- Sistemas afectados que YA FUNCIONAN y NO deben romperse:
--   ✅ Hub           → insert directo con auth.uid()
--   ✅ Calidad        → insert directo con auth.uid()  
--   ✅ Contact Center → insert directo con auth.uid()
--   ✅ RRHH           → insert directo con auth.uid()
--
-- Sistemas que NECESITAN esta migración:
--   ❌ ADM-QUI        → usa RPC (auth propia, no Supabase Auth)
--   ❌ Enfermería     → usa RPC (auth propia, no Supabase Auth)
--
-- PRINCIPIO: Solo AGREGAR, nunca modificar ni eliminar lo existente.
-- ==========================================

-- -----------------------------------------------
-- PASO 1: Agregar columnas opcionales (no rompe nada)
-- Las columnas nuevas son nullable, los inserts existentes
-- simplemente no las incluyen y quedan como NULL → OK
-- -----------------------------------------------
ALTER TABLE hub_logs_sesion 
  ADD COLUMN IF NOT EXISTS external_identifier TEXT;

ALTER TABLE hub_logs_sesion 
  ADD COLUMN IF NOT EXISTS display_name_snapshot TEXT;

CREATE INDEX IF NOT EXISTS idx_hub_logs_ext_identifier 
  ON hub_logs_sesion(external_identifier) 
  WHERE external_identifier IS NOT NULL;

-- -----------------------------------------------
-- PASO 2: Hacer user_id nullable (no rompe nada)
-- Los inserts existentes siguen enviando user_id normalmente.
-- Solo los logs de sistemas externos lo dejarán NULL.
-- La FK REFERENCES auth.users(id) se mantiene intacta:
--   → si user_id es NOT NULL, debe existir en auth.users ✓
--   → si user_id es NULL, la FK no se evalúa ✓
-- -----------------------------------------------
ALTER TABLE hub_logs_sesion 
  ALTER COLUMN user_id DROP NOT NULL;

-- -----------------------------------------------
-- PASO 3: Crear la función RPC
-- SECURITY DEFINER = se ejecuta con los privilegios del OWNER
-- (bypasea RLS automáticamente, NO necesitamos tocar policies)
--
-- Las policies existentes NO SE TOCAN:
--   "Users can insert own logs" → sigue funcionando para
--     Hub, Calidad, Contact Center, RRHH
--   "Admin/TyS can view all logs" → sigue funcionando
--     para el MonitorPage
-- -----------------------------------------------
CREATE OR REPLACE FUNCTION hub_log_external_event(
  p_user_identifier TEXT,
  p_evento TEXT,
  p_sistema_id UUID,
  p_ip TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL,
  p_latitud DOUBLE PRECISION DEFAULT NULL,
  p_longitud DOUBLE PRECISION DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER  -- Bypasea RLS → no hay que tocar policies existentes
SET search_path = public
AS $$
DECLARE
  v_auth_user_id UUID;
  v_display_name TEXT;
  v_ip INET;
  v_uuid_attempt UUID;
BEGIN
  -- PASO A: Intentar interpretar el identificador como UUID
  -- (sistemas con Supabase Auth: Contact Center, Calidad, RRHH)
  BEGIN
    v_uuid_attempt := p_user_identifier::UUID;
    -- Si es un UUID válido, buscar directamente en hub_perfiles
    SELECT hp.user_id, hp.display_name
    INTO v_auth_user_id, v_display_name
    FROM hub_perfiles hp
    WHERE hp.user_id = v_uuid_attempt;

    -- Si encontró el perfil, usar ese user_id
    IF v_auth_user_id IS NOT NULL THEN
      -- Verificar que existe en auth.users (FK)
      NULL; -- ya lo tenemos por la relacion
    ELSE
      -- UUID válido pero sin perfil -> Verificar si existe en auth.users
      IF EXISTS (SELECT 1 FROM auth.users WHERE id = v_uuid_attempt) THEN
        v_auth_user_id := v_uuid_attempt;
      ELSE
        -- No existe en auth.users, dejarlo como NULL para evitar error de foreign key
        v_auth_user_id := NULL;
        v_uuid_attempt := NULL; -- Para que pase al PASO B
      END IF;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    -- No es un UUID → es un username (ADM-QUI, Enfermería)
    v_uuid_attempt := NULL;
  END;

  -- PASO B: Si no se resolvió como UUID, buscar por display_name
  IF v_auth_user_id IS NULL AND v_uuid_attempt IS NULL THEN
    SELECT hp.user_id, hp.display_name
    INTO v_auth_user_id, v_display_name
    FROM hub_perfiles hp
    WHERE LOWER(hp.display_name) LIKE '%' || LOWER(p_user_identifier) || '%'
    LIMIT 1;
  END IF;

  -- Parsear IP de forma segura (si es inválida, queda NULL)
  BEGIN
    v_ip := p_ip::INET;
  EXCEPTION WHEN OTHERS THEN
    v_ip := NULL;
  END;

  -- Insertar el log
  INSERT INTO hub_logs_sesion (
    user_id,
    evento,
    sistema_id,
    ip_address,
    user_agent,
    latitud,
    longitud,
    metadata,
    external_identifier,
    display_name_snapshot
  ) VALUES (
    v_auth_user_id,                                              -- UUID o NULL
    p_evento,
    p_sistema_id,
    v_ip,
    p_user_agent,
    p_latitud,
    p_longitud,
    COALESCE(p_metadata, '{}'::JSONB) || 
      jsonb_build_object('external_user', p_user_identifier),    -- trazabilidad
    p_user_identifier,                                           -- UUID o username
    COALESCE(v_display_name, p_user_identifier)                  -- nombre resuelto o raw
  );
END;
$$;

-- -----------------------------------------------
-- PASO 4: Permisos de ejecución
-- anon: ADM-QUI y Enfermería usan la anon key (no hay sesión auth)
-- authenticated: por si en el futuro algún sistema mixto lo llama
-- -----------------------------------------------
GRANT EXECUTE ON FUNCTION hub_log_external_event TO anon;
GRANT EXECUTE ON FUNCTION hub_log_external_event TO authenticated;

-- ==========================================
-- FIN — Nada existente fue modificado ni eliminado.
-- Las únicas operaciones son:
--   ADD COLUMN (nullable) → inserts existentes no se rompen
--   DROP NOT NULL en user_id → inserts existentes siguen pasando user_id
--   CREATE FUNCTION → nueva, no existía
--   GRANT → permisos nuevos sobre función nueva
-- ==========================================
