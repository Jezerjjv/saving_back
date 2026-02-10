-- Campo is_admin en users: solo los admin pueden ver el menú "Mis apps".
-- Por defecto todos son false; asignar manualmente en BD al usuario admin.
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT false;

-- Opcional: marcar el primer usuario (o uno por email) como admin:
-- UPDATE users SET is_admin = true WHERE email = 'tu-admin@ejemplo.com';
