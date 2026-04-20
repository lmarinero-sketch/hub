-- 008_add_recepciones_system.sql
-- Agregar Recepciones al Catálogo de Sistemas del Hub

INSERT INTO hub_sistemas (nombre, display_name, descripcion, url, icono, color) VALUES
  ('recepciones', 'Recepciones', 'Admisión, Mensajería y Chequeos Preventivos', 'https://recepciones.sanatorioargentino.com', 'users', '#e11d48') -- Rose color
ON CONFLICT (nombre) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  descripcion = EXCLUDED.descripcion,
  url = EXCLUDED.url,
  icono = EXCLUDED.icono,
  color = EXCLUDED.color;
