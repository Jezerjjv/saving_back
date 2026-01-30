-- Añadir icono a plantillas rápidas (igual que categorías)
ALTER TABLE quick_templates
  ADD COLUMN IF NOT EXISTS icon VARCHAR(50) NOT NULL DEFAULT '📁';

COMMENT ON COLUMN quick_templates.icon IS 'Emoji/icono para mostrar en la barra de rápidos';
