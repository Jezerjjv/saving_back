-- ============================================
-- Mi Finanzas - Esquema PostgreSQL / Supabase
-- Ejecutar en tu base de datos (ej. Supabase SQL Editor)
-- ============================================

-- Cuentas bancarias
CREATE TABLE IF NOT EXISTS accounts (
  id         SERIAL PRIMARY KEY,
  name       VARCHAR(255) NOT NULL,
  balance    NUMERIC(12, 2) NOT NULL DEFAULT 0
);

-- Categorías (nombre + icono)
CREATE TABLE IF NOT EXISTS categories (
  id         SERIAL PRIMARY KEY,
  name       VARCHAR(255) NOT NULL,
  icon       VARCHAR(50) NOT NULL DEFAULT '📁'
);

-- Transacciones (gastos e ingresos)
CREATE TABLE IF NOT EXISTS transactions (
  id           SERIAL PRIMARY KEY,
  name         VARCHAR(255) NOT NULL,
  category_id   INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  amount       NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  account_id   INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  type         VARCHAR(20) NOT NULL CHECK (type IN ('expense', 'income')),
  income_type  VARCHAR(20) CHECK (income_type IN ('quick', 'fixed')),
  expense_type VARCHAR(20) CHECK (expense_type IN ('quick', 'fixed')),
  date         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
CREATE INDEX IF NOT EXISTS idx_transactions_account ON transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_transactions_month_year ON transactions((date_trunc('month', date AT TIME ZONE 'UTC')));

-- Ingresos fijos (plantillas: nómina, alquiler cobrado, etc. — se aplican el día indicado)
CREATE TABLE IF NOT EXISTS fixed_incomes (
  id            SERIAL PRIMARY KEY,
  name          VARCHAR(255) NOT NULL,
  category_id   INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  amount        NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  account_id    INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  day_of_month  INTEGER NOT NULL DEFAULT 1 CHECK (day_of_month >= 1 AND day_of_month <= 31)
);

-- Gastos fijos (plantillas: gym, Cursor, Netflix, etc. — se aplican el día indicado)
CREATE TABLE IF NOT EXISTS fixed_expenses (
  id            SERIAL PRIMARY KEY,
  name          VARCHAR(255) NOT NULL,
  category_id   INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  amount        NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  account_id    INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  day_of_month  INTEGER NOT NULL DEFAULT 1 CHECK (day_of_month >= 1 AND day_of_month <= 31)
);

-- Plantillas rápidas (ej. Café, Propina): si show_in_quick = true aparecen como botón bajo mes/año
CREATE TABLE IF NOT EXISTS quick_templates (
  id            SERIAL PRIMARY KEY,
  type          VARCHAR(20) NOT NULL CHECK (type IN ('expense', 'income')),
  name          VARCHAR(255) NOT NULL,
  icon          VARCHAR(50) NOT NULL DEFAULT '📁',
  category_id   INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  amount        NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  account_id    INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  show_in_quick BOOLEAN NOT NULL DEFAULT true
);

-- Transferencias entre cuentas
CREATE TABLE IF NOT EXISTS transfers (
  id                SERIAL PRIMARY KEY,
  from_account_id   INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  to_account_id     INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  amount            NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  description       VARCHAR(500),
  date              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_different_accounts CHECK (from_account_id <> to_account_id)
);

CREATE INDEX IF NOT EXISTS idx_transfers_date ON transfers(date);

-- Comentarios opcionales
COMMENT ON TABLE accounts IS 'Cuentas bancarias del usuario';
COMMENT ON TABLE categories IS 'Categorías para clasificar gastos e ingresos';
COMMENT ON TABLE transactions IS 'Gastos e ingresos (rápidos o fijos aplicados)';
COMMENT ON TABLE fixed_incomes IS 'Plantillas de ingresos recurrentes (ej. nómina) que se aplican un día del mes';
COMMENT ON TABLE fixed_expenses IS 'Plantillas de gastos recurrentes (ej. gym, Cursor) que se aplican un día del mes';
COMMENT ON TABLE quick_templates IS 'Plantillas rápidas (ej. Café): si show_in_quick = true aparecen como botón en la pestaña';
COMMENT ON TABLE transfers IS 'Transferencias entre cuentas';
