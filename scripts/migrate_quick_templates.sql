-- Plantillas rápidas (ej. Café, Propina): si show_in_quick = true aparecen como botón en la pestaña
CREATE TABLE IF NOT EXISTS quick_templates (
  id            SERIAL PRIMARY KEY,
  type          VARCHAR(20) NOT NULL CHECK (type IN ('expense', 'income')),
  name          VARCHAR(255) NOT NULL,
  category_id   INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  amount        NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  account_id    INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  show_in_quick BOOLEAN NOT NULL DEFAULT true
);

COMMENT ON TABLE quick_templates IS 'Plantillas rápidas: si show_in_quick = true aparecen como botón bajo mes/año en Gastos o Ingresos';
