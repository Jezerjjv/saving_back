-- Transferencias periódicas (se ejecutan un día del mes, como los gastos fijos)
CREATE TABLE IF NOT EXISTS periodic_transfers (
  id                SERIAL PRIMARY KEY,
  from_account_id   INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  to_account_id     INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  amount            NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  description       VARCHAR(500),
  day_of_month      INTEGER NOT NULL DEFAULT 1 CHECK (day_of_month >= 1 AND day_of_month <= 31),
  CONSTRAINT chk_periodic_different_accounts CHECK (from_account_id <> to_account_id)
);

COMMENT ON TABLE periodic_transfers IS 'Plantillas de transferencias recurrentes que se aplican un día del mes';

-- Referencia en transfers para saber qué ejecución periódica generó cada transferencia
ALTER TABLE transfers ADD COLUMN IF NOT EXISTS periodic_transfer_id INTEGER REFERENCES periodic_transfers(id) ON DELETE SET NULL;
