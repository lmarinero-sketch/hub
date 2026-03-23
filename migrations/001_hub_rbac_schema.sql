-- ==========================================
-- Hub Sanatorio Argentino — RBAC Schema
-- Ejecutar en Supabase SQL Editor
-- ==========================================

-- 1. Catálogo de subsistemas registrados
CREATE TABLE IF NOT EXISTS hub_sistemas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  descripcion TEXT,
  url TEXT NOT NULL,
  icono TEXT,
  color TEXT DEFAULT '#3b82f6',
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Catálogo de roles globales
CREATE TABLE IF NOT EXISTS hub_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  descripcion TEXT,
  nivel_acceso INT DEFAULT 0
);

-- 3. Tabla pivote: usuario ↔ sistema (con rol)
CREATE TABLE IF NOT EXISTS hub_usuario_sistemas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sistema_id UUID NOT NULL REFERENCES hub_sistemas(id) ON DELETE CASCADE,
  rol_id UUID NOT NULL REFERENCES hub_roles(id),
  asignado_por UUID REFERENCES auth.users(id),
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, sistema_id)
);

-- 4. Perfil extendido del Hub
CREATE TABLE IF NOT EXISTS hub_perfiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  dni TEXT,
  telefono TEXT,
  sector TEXT,
  cargo TEXT,
  avatar_url TEXT,
  rol_global UUID REFERENCES hub_roles(id),
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Logs de sesión (auditoría de ciberseguridad)
CREATE TABLE IF NOT EXISTS hub_logs_sesion (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  evento TEXT NOT NULL,
  sistema_id UUID REFERENCES hub_sistemas(id),
  ip_address INET,
  user_agent TEXT,
  latitud DOUBLE PRECISION,
  longitud DOUBLE PRECISION,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_hub_usuario_sistemas_user ON hub_usuario_sistemas(user_id);
CREATE INDEX IF NOT EXISTS idx_hub_logs_sesion_user ON hub_logs_sesion(user_id);
CREATE INDEX IF NOT EXISTS idx_hub_logs_sesion_created ON hub_logs_sesion(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_hub_perfiles_user ON hub_perfiles(user_id);

-- ==========================================
-- SEED DATA: Roles iniciales
-- ==========================================
INSERT INTO hub_roles (nombre, display_name, descripcion, nivel_acceso) VALUES
  ('admin_global', 'Administrador Global', 'Acceso total a todos los sistemas y al panel de administración', 100),
  ('tys', 'Tecnología y Sistemas', 'Acceso al monitor de sesiones y al portfolio de sistemas', 90),
  ('rrhh', 'Recursos Humanos', 'Acceso al panel de administración de usuarios y portfolio', 80),
  ('directivo', 'Directivo', 'Acceso a los sistemas directivos asignados', 50),
  ('responsable', 'Responsable de Sector', 'Acceso a los sistemas de su sector', 30),
  ('usuario', 'Usuario', 'Acceso básico a los sistemas asignados', 10)
ON CONFLICT (nombre) DO NOTHING;

-- ==========================================
-- SEED DATA: Sistemas existentes
-- (Reemplazar las URLs con las de producción)
-- ==========================================
INSERT INTO hub_sistemas (nombre, display_name, descripcion, url, icono, color) VALUES
  ('calidad', 'Sistema de Calidad', 'Gestión de hallazgos, acciones correctivas y ciclo de mejora continua', 'https://calidad.sanatorioargentino.com', 'clipboard-list', '#2563eb'),
  ('adm-qui', 'ADM-QUI (Quirófano)', 'Sistema de admisión quirúrgica — Internaciones y prácticas', 'https://adm-qui.sanatorioargentino.com', 'stethoscope', '#7c3aed'),
  ('enfermeria', 'Enfermería', 'Fichadas, calendario, agenda y gestión de enfermería', 'https://enfermeria.sanatorioargentino.com', 'activity', '#06b6d4'),
  ('contact-center', 'Contact Center', 'Analytics de conversaciones y gestión de tickets', 'https://contactcenter.sanatorioargentino.com', 'phone', '#f59e0b'),
  ('liquidaciones', 'Liquidaciones', 'Administración de guardias y liquidaciones de personal', 'https://liquidaciones.sanatorioargentino.com', 'file-text', '#16a34a'),
  ('rrhh-organigrama', 'Organigrama Digital', 'Visualización interactiva de la estructura institucional', 'https://organigrama.sanatorioargentino.com', 'building-2', '#64748b'),
  ('osptxt', 'OSP-TXT', 'Gestión de prestaciones y obras sociales', 'https://osptxt.sanatorioargentino.com', 'bar-chart-3', '#dc2626'),
  ('transcriptor', 'Transcriptor IA', 'Transcripción y análisis de reuniones con IA — Resumen, actas y presentaciones automáticas', 'https://reuniones-psi.vercel.app', 'mic', '#00548B')
ON CONFLICT (nombre) DO NOTHING;

-- ==========================================
-- RLS Policies
-- ==========================================

-- hub_perfiles: usuarios ven solo su propio perfil
ALTER TABLE hub_perfiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON hub_perfiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile"
  ON hub_perfiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
  ON hub_perfiles FOR UPDATE
  USING (auth.uid() = user_id);

-- Admin global puede ver todos los perfiles
CREATE POLICY "Admin can view all profiles"
  ON hub_perfiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM hub_perfiles hp
      JOIN hub_roles hr ON hp.rol_global = hr.id
      WHERE hp.user_id = auth.uid()
      AND hr.nombre IN ('admin_global', 'rrhh', 'tys')
    )
  );

-- hub_usuario_sistemas: usuarios ven sus asignaciones
ALTER TABLE hub_usuario_sistemas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own assignments"
  ON hub_usuario_sistemas FOR SELECT
  USING (auth.uid() = user_id);

-- Admin puede ver y gestionar todas las asignaciones
CREATE POLICY "Admin can manage all assignments"
  ON hub_usuario_sistemas FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM hub_perfiles hp
      JOIN hub_roles hr ON hp.rol_global = hr.id
      WHERE hp.user_id = auth.uid()
      AND hr.nombre IN ('admin_global', 'rrhh')
    )
  );

-- hub_sistemas: todos pueden leer (catálogo público dentro del Hub)
ALTER TABLE hub_sistemas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view systems"
  ON hub_sistemas FOR SELECT
  USING (auth.role() = 'authenticated');

-- hub_roles: todos pueden leer
ALTER TABLE hub_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view roles"
  ON hub_roles FOR SELECT
  USING (auth.role() = 'authenticated');

-- hub_logs_sesion: todos pueden insertar su propio log
ALTER TABLE hub_logs_sesion ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own logs"
  ON hub_logs_sesion FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- TyS/Admin puede ver todos los logs
CREATE POLICY "Admin/TyS can view all logs"
  ON hub_logs_sesion FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM hub_perfiles hp
      JOIN hub_roles hr ON hp.rol_global = hr.id
      WHERE hp.user_id = auth.uid()
      AND hr.nombre IN ('admin_global', 'tys')
    )
  );
