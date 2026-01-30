-- Configuración de la app (key-value, extensible para futuras opciones)
CREATE TABLE IF NOT EXISTS app_settings (
  key   VARCHAR(255) PRIMARY KEY,
  value TEXT NOT NULL DEFAULT 'null'
);

COMMENT ON TABLE app_settings IS 'Preferencias de la app (ej. blurBalance). key en camelCase, value en JSON.';
