-- Permitir income_type = 'interest' para que los intereses diarios aparezcan como ingresos en Movimientos
ALTER TABLE transactions
  DROP CONSTRAINT IF EXISTS transactions_income_type_check;

ALTER TABLE transactions
  ADD CONSTRAINT transactions_income_type_check
  CHECK (income_type IS NULL OR income_type IN ('quick', 'fixed', 'interest'));
