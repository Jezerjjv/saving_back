-- Migración: tipo de producto "Interés" y columna interest_rate_annual
-- Ejecutar para añadir productos con interés capitalizado diariamente

-- 1. Tipo Interés (si no existe)
INSERT INTO product_types (name, slug, icon) VALUES
  ('Interés', 'interest', '💹')
ON CONFLICT (slug) DO NOTHING;

-- 2. Columna interés anual en account_products (solo usada para tipo Interés)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'account_products' AND column_name = 'interest_rate_annual'
  ) THEN
    ALTER TABLE account_products
      ADD COLUMN interest_rate_annual NUMERIC(5, 2) NULL
      CHECK (interest_rate_annual IS NULL OR (interest_rate_annual >= 0 AND interest_rate_annual <= 100));
    COMMENT ON COLUMN account_products.interest_rate_annual IS 'Solo para tipo Interés: % anual; se capitaliza diariamente (cron).';
  END IF;
END $$;
