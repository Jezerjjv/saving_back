-- Añadir USDT como moneda en crypto_holdings (para pares tipo XRP/USDT vs XRP/USD)
-- currency era VARCHAR(3); USDT tiene 4 caracteres
ALTER TABLE crypto_holdings ALTER COLUMN currency TYPE VARCHAR(10);
ALTER TABLE crypto_holdings DROP CONSTRAINT IF EXISTS crypto_holdings_currency_check;
ALTER TABLE crypto_holdings ADD CONSTRAINT crypto_holdings_currency_check
  CHECK (currency IN ('EUR', 'USD', 'USDT'));
13