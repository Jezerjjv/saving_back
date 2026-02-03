-- Historial diario por posición de acciones/ETFs: G/P al cierre de cada día.
-- A las 00:00 se guarda para cada holding su G/P acumulado; la G/P del día = cierre hoy - cierre ayer.

CREATE TABLE IF NOT EXISTS stock_holding_daily (
  id             SERIAL PRIMARY KEY,
  holding_id     INTEGER NOT NULL REFERENCES stock_holdings(id) ON DELETE CASCADE,
  date           DATE NOT NULL,
  gain_loss_eur  NUMERIC(18, 4) NOT NULL,
  gain_loss_usd  NUMERIC(18, 4) NOT NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (holding_id, date)
);

CREATE INDEX IF NOT EXISTS idx_stock_holding_daily_holding_date ON stock_holding_daily(holding_id, date);
COMMENT ON TABLE stock_holding_daily IS 'G/P acumulado por holding de acciones al cierre de cada día; la G/P del día = diferencia con el día anterior';
