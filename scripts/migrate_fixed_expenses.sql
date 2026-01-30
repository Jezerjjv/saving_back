-- Gastos fijos y tipo de gasto en transacciones (ejecutar si ya tenías la BD)
-- 1) Columna expense_type en transactions (para marcar gasto rápido vs fijo)
ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS expense_type VARCHAR(20) CHECK (expense_type IN ('quick', 'fixed'));

-- 2) Tabla fixed_expenses (plantillas: gym, Cursor, etc.)
CREATE TABLE IF NOT EXISTS fixed_expenses (
  id            SERIAL PRIMARY KEY,
  name          VARCHAR(255) NOT NULL,
  category_id   INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  amount        NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  account_id    INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  day_of_month  INTEGER NOT NULL DEFAULT 1 CHECK (day_of_month >= 1 AND day_of_month <= 31)
);

COMMENT ON TABLE fixed_expenses IS 'Plantillas de gastos recurrentes (ej. gym, Cursor) que se aplican un día del mes';
