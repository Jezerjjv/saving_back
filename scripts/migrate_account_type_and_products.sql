-- Migración: tipo de cuenta (bank/cash) y productos de cuentas bancarias
-- Ejecutar en BBDD existente después de tener la tabla accounts

-- Añadir tipo de cuenta si no existe (cuentas existentes = bancarias)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'accounts' AND column_name = 'account_type'
  ) THEN
    ALTER TABLE accounts
      ADD COLUMN account_type VARCHAR(20) NOT NULL DEFAULT 'bank'
      CHECK (account_type IN ('bank', 'cash'));
  END IF;
END $$;

-- Tabla de productos dentro de cuentas bancarias
CREATE TABLE IF NOT EXISTS account_products (
  id            SERIAL PRIMARY KEY,
  account_id    INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  name          VARCHAR(255) NOT NULL,
  product_type  VARCHAR(50) NOT NULL DEFAULT 'other' CHECK (product_type IN ('pension_plan', 'investment', 'savings', 'other')),
  balance       NUMERIC(12, 2) NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_account_products_account ON account_products(account_id);

COMMENT ON TABLE account_products IS 'Productos dentro de cuentas bancarias (plan de pensiones, inversiones, etc.)';
