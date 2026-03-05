-- Tabla rápida: gastos/ingresos sin cuenta (solo para anotar en esta tabla, no descuenta de ninguna cuenta)
CREATE TABLE IF NOT EXISTS quick_log_entries (
  id          SERIAL PRIMARY KEY,
  user_id     INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name        VARCHAR(255) NOT NULL,
  amount      NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  type        VARCHAR(20) NOT NULL CHECK (type IN ('expense', 'income')),
  category_id INT NULL REFERENCES categories(id) ON DELETE SET NULL,
  date        DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quick_log_entries_user ON quick_log_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_quick_log_entries_date ON quick_log_entries(date);

COMMENT ON TABLE quick_log_entries IS 'Anotaciones rápidas de gastos/ingresos; solo para la vista Tabla rápida, no afectan saldos de cuentas';

-- Añadir category_id si la tabla ya existía sin él
ALTER TABLE quick_log_entries ADD COLUMN IF NOT EXISTS category_id INT NULL REFERENCES categories(id) ON DELETE SET NULL;
