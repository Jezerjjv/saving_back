-- Migración: moneda por cuenta (EUR / USD)
-- Ejecutar en BBDD existente

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'accounts' AND column_name = 'currency'
  ) THEN
    ALTER TABLE accounts
      ADD COLUMN currency VARCHAR(3) NOT NULL DEFAULT 'EUR'
      CHECK (currency IN ('EUR', 'USD'));
    COMMENT ON COLUMN accounts.currency IS 'Moneda de la cuenta (EUR o USD); el saldo se muestra siempre en esta moneda';
  END IF;
END $$;
