-- ============================================
-- Multi-usuario: tabla users y user_id en tablas
-- Ejecutar en tu base de datos (ej. Supabase SQL Editor).
-- Requiere extensión pgcrypto (CREATE EXTENSION pgcrypto).
--
-- Usuario inicial para datos existentes:
--   Email: migrate@local.dev
--   Contraseña: ChangeMe123
-- (cámbiala tras el primer acceso o crea tu usuario desde Registro)
-- ============================================

-- 1) Tabla de usuarios
CREATE TABLE IF NOT EXISTS users (
  id         SERIAL PRIMARY KEY,
  email      VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  name       VARCHAR(255) NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- 2) Usuario inicial para datos existentes (contraseña: ChangeMe123)
-- Requiere extensión pgcrypto
CREATE EXTENSION IF NOT EXISTS pgcrypto;
INSERT INTO users (email, password_hash, name)
VALUES ('migrate@local.dev', crypt('ChangeMe123', gen_salt('bf')), 'Usuario inicial')
ON CONFLICT (email) DO NOTHING;

-- Obtenemos el id del usuario migrado (si ya existían filas, usamos el primero)
-- Usamos delimitador etiquetado $body$ para evitar errores en algunos clientes SQL
DO $body$
DECLARE
  uid INT;
BEGIN
  SELECT id INTO uid FROM users WHERE email = 'migrate@local.dev' LIMIT 1;
  IF uid IS NULL THEN
    RETURN;
  END IF;

  -- 3) accounts
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'accounts' AND column_name = 'user_id') THEN
    ALTER TABLE accounts ADD COLUMN user_id INT REFERENCES users(id) ON DELETE CASCADE;
    UPDATE accounts SET user_id = uid WHERE user_id IS NULL;
    ALTER TABLE accounts ALTER COLUMN user_id SET NOT NULL;
    CREATE INDEX IF NOT EXISTS idx_accounts_user ON accounts(user_id);
  END IF;

  -- 4) categories
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'categories' AND column_name = 'user_id') THEN
    ALTER TABLE categories ADD COLUMN user_id INT REFERENCES users(id) ON DELETE CASCADE;
    UPDATE categories SET user_id = uid WHERE user_id IS NULL;
    ALTER TABLE categories ALTER COLUMN user_id SET NOT NULL;
    CREATE INDEX IF NOT EXISTS idx_categories_user ON categories(user_id);
  END IF;

  -- 5) transactions (depende de accounts que ya tiene user_id)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transactions' AND column_name = 'user_id') THEN
    ALTER TABLE transactions ADD COLUMN user_id INT REFERENCES users(id) ON DELETE CASCADE;
    UPDATE transactions t SET user_id = (SELECT user_id FROM accounts a WHERE a.id = t.account_id LIMIT 1) WHERE t.user_id IS NULL;
    UPDATE transactions SET user_id = uid WHERE user_id IS NULL;
    ALTER TABLE transactions ALTER COLUMN user_id SET NOT NULL;
    CREATE INDEX IF NOT EXISTS idx_transactions_user ON transactions(user_id);
  END IF;

  -- 6) fixed_incomes
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'fixed_incomes' AND column_name = 'user_id') THEN
    ALTER TABLE fixed_incomes ADD COLUMN user_id INT REFERENCES users(id) ON DELETE CASCADE;
    UPDATE fixed_incomes fi SET user_id = (SELECT user_id FROM accounts a WHERE a.id = fi.account_id LIMIT 1) WHERE fi.user_id IS NULL;
    UPDATE fixed_incomes SET user_id = uid WHERE user_id IS NULL;
    ALTER TABLE fixed_incomes ALTER COLUMN user_id SET NOT NULL;
    CREATE INDEX IF NOT EXISTS idx_fixed_incomes_user ON fixed_incomes(user_id);
  END IF;

  -- 7) fixed_expenses
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'fixed_expenses' AND column_name = 'user_id') THEN
    ALTER TABLE fixed_expenses ADD COLUMN user_id INT REFERENCES users(id) ON DELETE CASCADE;
    UPDATE fixed_expenses fe SET user_id = (SELECT user_id FROM accounts a WHERE a.id = fe.account_id LIMIT 1) WHERE fe.user_id IS NULL;
    UPDATE fixed_expenses SET user_id = uid WHERE user_id IS NULL;
    ALTER TABLE fixed_expenses ALTER COLUMN user_id SET NOT NULL;
    CREATE INDEX IF NOT EXISTS idx_fixed_expenses_user ON fixed_expenses(user_id);
  END IF;

  -- 8) quick_templates
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'quick_templates' AND column_name = 'user_id') THEN
    ALTER TABLE quick_templates ADD COLUMN user_id INT REFERENCES users(id) ON DELETE CASCADE;
    UPDATE quick_templates qt SET user_id = (SELECT user_id FROM accounts a WHERE a.id = qt.account_id LIMIT 1) WHERE qt.user_id IS NULL;
    UPDATE quick_templates SET user_id = uid WHERE user_id IS NULL;
    ALTER TABLE quick_templates ALTER COLUMN user_id SET NOT NULL;
    CREATE INDEX IF NOT EXISTS idx_quick_templates_user ON quick_templates(user_id);
  END IF;

  -- 9) periodic_transfers
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'periodic_transfers' AND column_name = 'user_id') THEN
    ALTER TABLE periodic_transfers ADD COLUMN user_id INT REFERENCES users(id) ON DELETE CASCADE;
    UPDATE periodic_transfers pt SET user_id = (SELECT user_id FROM accounts a WHERE a.id = pt.from_account_id LIMIT 1) WHERE pt.user_id IS NULL;
    UPDATE periodic_transfers SET user_id = uid WHERE user_id IS NULL;
    ALTER TABLE periodic_transfers ALTER COLUMN user_id SET NOT NULL;
    CREATE INDEX IF NOT EXISTS idx_periodic_transfers_user ON periodic_transfers(user_id);
  END IF;

  -- 10) transfers
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transfers' AND column_name = 'user_id') THEN
    ALTER TABLE transfers ADD COLUMN user_id INT REFERENCES users(id) ON DELETE CASCADE;
    UPDATE transfers tr SET user_id = (SELECT user_id FROM accounts a WHERE a.id = tr.from_account_id LIMIT 1) WHERE tr.user_id IS NULL;
    UPDATE transfers SET user_id = uid WHERE user_id IS NULL;
    ALTER TABLE transfers ALTER COLUMN user_id SET NOT NULL;
    CREATE INDEX IF NOT EXISTS idx_transfers_user ON transfers(user_id);
  END IF;

  -- 11) interest_history
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'interest_history' AND column_name = 'user_id') THEN
    ALTER TABLE interest_history ADD COLUMN user_id INT REFERENCES users(id) ON DELETE CASCADE;
    UPDATE interest_history ih SET user_id = (SELECT user_id FROM accounts a WHERE a.id = ih.account_id LIMIT 1) WHERE ih.user_id IS NULL;
    UPDATE interest_history SET user_id = uid WHERE user_id IS NULL;
    ALTER TABLE interest_history ALTER COLUMN user_id SET NOT NULL;
    CREATE INDEX IF NOT EXISTS idx_interest_history_user ON interest_history(user_id);
  END IF;

  -- 12) crypto_holdings
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'crypto_holdings' AND column_name = 'user_id') THEN
    ALTER TABLE crypto_holdings ADD COLUMN user_id INT REFERENCES users(id) ON DELETE CASCADE;
    UPDATE crypto_holdings SET user_id = uid WHERE user_id IS NULL;
    ALTER TABLE crypto_holdings ALTER COLUMN user_id SET NOT NULL;
    CREATE INDEX IF NOT EXISTS idx_crypto_holdings_user ON crypto_holdings(user_id);
  END IF;

  -- 13) crypto_daily_close (por usuario: user_id + date único)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'crypto_daily_close' AND column_name = 'user_id') THEN
    ALTER TABLE crypto_daily_close ADD COLUMN user_id INT REFERENCES users(id) ON DELETE CASCADE;
    UPDATE crypto_daily_close SET user_id = uid WHERE user_id IS NULL;
    ALTER TABLE crypto_daily_close ALTER COLUMN user_id SET NOT NULL;
    ALTER TABLE crypto_daily_close DROP CONSTRAINT IF EXISTS crypto_daily_close_date_key;
    CREATE UNIQUE INDEX IF NOT EXISTS idx_crypto_daily_close_user_date ON crypto_daily_close(user_id, date);
    CREATE INDEX IF NOT EXISTS idx_crypto_daily_close_user ON crypto_daily_close(user_id);
  END IF;

  -- 14) stock_holdings
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'stock_holdings' AND column_name = 'user_id') THEN
    ALTER TABLE stock_holdings ADD COLUMN user_id INT REFERENCES users(id) ON DELETE CASCADE;
    UPDATE stock_holdings SET user_id = uid WHERE user_id IS NULL;
    ALTER TABLE stock_holdings ALTER COLUMN user_id SET NOT NULL;
    CREATE INDEX IF NOT EXISTS idx_stock_holdings_user ON stock_holdings(user_id);
  END IF;

  -- 15) app_settings: clave (user_id, key)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'app_settings' AND column_name = 'user_id') THEN
    ALTER TABLE app_settings ADD COLUMN user_id INT REFERENCES users(id) ON DELETE CASCADE;
    UPDATE app_settings SET user_id = uid WHERE user_id IS NULL;
    ALTER TABLE app_settings ALTER COLUMN user_id SET NOT NULL;
    ALTER TABLE app_settings DROP CONSTRAINT IF EXISTS app_settings_pkey;
    CREATE UNIQUE INDEX IF NOT EXISTS idx_app_settings_user_key ON app_settings(user_id, key);
    ALTER TABLE app_settings ADD PRIMARY KEY (user_id, key);
  END IF;

END $body$;

COMMENT ON TABLE users IS 'Usuarios de la app; cada uno ve solo sus cuentas, movimientos e inversiones';
