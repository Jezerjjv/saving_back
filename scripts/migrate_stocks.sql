-- Acciones / ETFs: posiciones y caché de precios (símbolos como SPY, AAPL).
-- Precios: Yahoo Finance (chart API) o caché local.

CREATE TABLE IF NOT EXISTS stock_holdings (
  id              SERIAL PRIMARY KEY,
  symbol          VARCHAR(20) NOT NULL,
  amount_invested NUMERIC(18, 8) NOT NULL CHECK (amount_invested >= 0),
  price_bought    NUMERIC(18, 8) NOT NULL CHECK (price_bought > 0),
  currency        VARCHAR(10) NOT NULL DEFAULT 'USD' CHECK (currency IN ('EUR', 'USD', 'USDT')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE stock_holdings IS 'Posiciones en acciones/ETFs: símbolo (SPY, AAPL...), invertido y precio de compra';

CREATE TABLE IF NOT EXISTS stock_price_cache (
  symbol     VARCHAR(20) PRIMARY KEY,
  price_usd  NUMERIC(18, 8) NOT NULL,
  price_eur  NUMERIC(18, 8) NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE stock_price_cache IS 'Último precio por acción/ETF; se actualiza al consultar Yahoo Finance';
