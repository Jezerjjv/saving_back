-- Preferencias PIN y biometría en users (persisten aunque se borre el storage del dispositivo).
-- pin_enabled/bio_enabled: si el usuario tiene activada cada opción.
-- pin_hash: hash SHA-256 (hex, 64 chars) del PIN; permite usar el mismo PIN en otro dispositivo
-- tras iniciar sesión con contraseña. El PIN en claro nunca se guarda.

ALTER TABLE users ADD COLUMN IF NOT EXISTS pin_enabled BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS bio_enabled BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS pin_hash VARCHAR(64) NULL;
