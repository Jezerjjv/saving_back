-- Cuentas rápidas: solo existen en la vista Cuentas rápida, independientes de las cuentas bancarias
CREATE TABLE IF NOT EXISTS quick_accounts (
  id          SERIAL PRIMARY KEY,
  user_id     INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name        VARCHAR(255) NOT NULL,
  balance     NUMERIC(14, 2) NOT NULL DEFAULT 0,
  currency    VARCHAR(3) NOT NULL DEFAULT 'EUR',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quick_accounts_user ON quick_accounts(user_id);

COMMENT ON TABLE quick_accounts IS 'Cuentas solo para la vista Cuentas rápida; no son cuentas bancarias ni afectan movimientos';
