-- Historial de intereses diarios (para mostrar en la sección Intereses, sin duplicar en movimientos)
CREATE TABLE IF NOT EXISTS interest_history (
  id          SERIAL PRIMARY KEY,
  date        DATE NOT NULL,
  account_id  INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  amount      NUMERIC(12, 2) NOT NULL CHECK (amount >= 0)
);

CREATE INDEX IF NOT EXISTS idx_interest_history_date ON interest_history(date);
CREATE INDEX IF NOT EXISTS idx_interest_history_account ON interest_history(account_id);

COMMENT ON TABLE interest_history IS 'Registro de intereses diarios aplicados por cuenta (solo historial, no son transacciones)';
