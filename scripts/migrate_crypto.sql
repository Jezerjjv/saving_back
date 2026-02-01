-- Criptomonedas: posiciones, caché de precios y cierre diario
-- Fuente precios: CoinGecko API (gratis, límite peticiones/min → usamos caché)

-- 1. Posiciones (moneda, dinero invertido, precio de compra)
CREATE TABLE IF NOT EXISTS crypto_holdings (
  id              SERIAL PRIMARY KEY,
  symbol          VARCHAR(30) NOT NULL,
  amount_invested NUMERIC(18, 8) NOT NULL CHECK (amount_invested >= 0),
  price_bought    NUMERIC(18, 8) NOT NULL CHECK (price_bought > 0),
  currency        VARCHAR(3) NOT NULL DEFAULT 'EUR' CHECK (currency IN ('EUR', 'USD')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE crypto_holdings IS 'Posiciones en cripto: symbol (id CoinGecko: bitcoin, ethereum...), dinero invertido y precio de compra';

-- 2. Caché de precios (último valor cuando API no permite más peticiones)
CREATE TABLE IF NOT EXISTS crypto_price_cache (
  symbol    VARCHAR(30) PRIMARY KEY,
  price_eur NUMERIC(18, 8) NOT NULL,
  price_usd NUMERIC(18, 8) NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE crypto_price_cache IS 'Último precio por moneda; se actualiza al llamar a CoinGecko; si rate limit, se usa este valor';

-- 3. Cierre diario (histórico como intereses: cada día a 00:00 se registra ganancia/pérdida del día)
CREATE TABLE IF NOT EXISTS crypto_daily_close (
  id             SERIAL PRIMARY KEY,
  date           DATE NOT NULL UNIQUE,
  total_value_eur NUMERIC(18, 4) NOT NULL,
  total_value_usd NUMERIC(18, 4) NOT NULL,
  gain_loss_eur  NUMERIC(18, 4) NOT NULL,
  gain_loss_usd  NUMERIC(18, 4) NOT NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_crypto_daily_close_date ON crypto_daily_close(date);
COMMENT ON TABLE crypto_daily_close IS 'Cierre diario a 00:00: valor total y ganancia/pérdida del día (histórico)';
