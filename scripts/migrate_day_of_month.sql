-- Añadir día del mes a ingresos fijos (ejecutar si ya tenías la tabla sin esta columna)
ALTER TABLE fixed_incomes
  ADD COLUMN IF NOT EXISTS day_of_month INTEGER NOT NULL DEFAULT 1
  CHECK (day_of_month >= 1 AND day_of_month <= 31);

COMMENT ON COLUMN fixed_incomes.day_of_month IS 'Día del mes (1-31) en que se aplica el ingreso fijo';
