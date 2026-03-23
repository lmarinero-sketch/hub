-- ==========================================
-- Hub Sanatorio Argentino
-- Migration 006: Importar usuarios preexistentes del Contact Center
-- ==========================================
-- Este script injecta manualmente cuentas en la base de datos central.
-- Requisitos de inserción:
-- 1. Crear el auth.users con la password bcypt ('123456')
-- 2. Crear el hub_perfiles 
-- 3. Crear el hub_usuario_sistemas con el rol base del sistema

DO $$
DECLARE
  v_sistema_cc UUID;
  v_rol_base_hub UUID;
  v_rol_agente_cc UUID;
  
  -- Variables de iteración
  v_id UUID;
  v_email TEXT;
  v_nombre TEXT;
  
  -- Credencial (Hash Bcrypt de "123456")
  v_hash TEXT := crypt('123456', gen_salt('bf'));
BEGIN

  -- 1. Obtener los IDs necesarios para no hardcodearlos
  SELECT id INTO v_sistema_cc FROM hub_sistemas WHERE nombre = 'contact-center';
  SELECT id INTO v_rol_base_hub FROM hub_roles WHERE nombre = 'usuario' LIMIT 1;
  SELECT id INTO v_rol_agente_cc FROM hub_roles_sistema WHERE sistema_id = v_sistema_cc AND nombre = 'agente' LIMIT 1;

  -- Bucle por cada usuario
  FOR v_email IN 
    SELECT unnest(ARRAY['antonella@contactcenter.com', 'sofia@contactcenter.com', 'daniela@contactcenter.com'])
  LOOP
    -- Si el email ya existe, lo ignoramos para no causar error de duplicación
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = v_email) THEN
      
      -- Generamos ID fresco
      v_id := gen_random_uuid();
      v_nombre := initcap(split_part(v_email, '@', 1)); -- Ej: antonella@ -> Antonella

      -- A) Inyectar en auth.users (Backbone central)
      INSERT INTO auth.users (
        id, instance_id, aud, role, email, encrypted_password, 
        email_confirmed_at, raw_app_meta_data, raw_user_meta_data, 
        created_at, updated_at, confirmation_token, recovery_token, 
        email_change_token_new, email_change
      ) VALUES (
        v_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 
        v_email, v_hash, now(), 
        '{"provider":"email","providers":["email"]}', '{}', 
        now(), now(), '', '', '', ''
      );

      -- B) Inyectar en hub_perfiles (Perfil Visible RRHH)
      INSERT INTO hub_perfiles (user_id, display_name, email, activo)
      VALUES (v_id, v_nombre, v_email, true);

      -- C) Inyectar acceso autorizado en hub_usuario_sistemas
      INSERT INTO hub_usuario_sistemas (user_id, sistema_id, rol_id, rol_sistema_id, activo)
      VALUES (v_id, v_sistema_cc, v_rol_base_hub, v_rol_agente_cc, true);
    
    END IF;
  END LOOP;
  
END $$;
