-- Migración: tabla product_types y account_products.product_type_id
-- Ejecutar si ya tienes account_products con columna product_type (VARCHAR)

-- 1. Tabla de tipos de producto
CREATE TABLE IF NOT EXISTS product_types (
  id    SERIAL PRIMARY KEY,
  name  VARCHAR(100) NOT NULL,
  slug  VARCHAR(50) NOT NULL UNIQUE,
  icon  VARCHAR(20) NOT NULL DEFAULT '📦'
);

INSERT INTO product_types (name, slug, icon) VALUES
  ('Plan de pensiones', 'pension_plan', '🏛️'),
  ('Inversiones', 'investment', '📈'),
  ('Ahorro', 'savings', '🐷'),
  ('Otro', 'other', '📦')
ON CONFLICT (slug) DO NOTHING;

-- 2. Si account_products existe con product_type (VARCHAR), migrar a product_type_id
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'account_products')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'account_products' AND column_name = 'product_type')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'account_products' AND column_name = 'product_type_id')
  THEN
    ALTER TABLE account_products ADD COLUMN product_type_id INTEGER REFERENCES product_types(id) ON DELETE RESTRICT;
    UPDATE account_products ap
    SET product_type_id = (SELECT id FROM product_types pt WHERE pt.slug = ap.product_type LIMIT 1);
    UPDATE account_products SET product_type_id = (SELECT id FROM product_types WHERE slug = 'other' LIMIT 1) WHERE product_type_id IS NULL;
    ALTER TABLE account_products ALTER COLUMN product_type_id SET NOT NULL;
    ALTER TABLE account_products DROP COLUMN product_type;
    CREATE INDEX IF NOT EXISTS idx_account_products_type ON account_products(product_type_id);
  END IF;
END $$;

COMMENT ON TABLE product_types IS 'Tipos de producto bancario (extensible)';
