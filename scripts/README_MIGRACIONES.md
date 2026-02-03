# Migraciones de la base de datos

Ejecutar en este orden si partes de cero o te faltan tablas:

1. **migrate_users.sql** – multi-usuario (users, user_id en tablas)
2. **migrate_users_pin_bio.sql** – PIN y biometría (pin_enabled, bio_enabled, pin_hash)
3. **migrate_crypto.sql** – cripto (crypto_holdings, crypto_daily_close, etc.)
4. **migrate_crypto_holding_daily.sql** – histórico diario por posición (crypto_holding_daily)
5. **migrate_stocks.sql** – acciones (stock_holdings, stock_price_cache)
6. **migrate_stock_holding_daily.sql** – histórico diario por posición de acciones (stock_holding_daily)

## Crear solo la tabla que falta (crypto_holding_daily)

Desde la raíz del backend:

```bash
cd saving_back
psql "postgresql://USUARIO:PASSWORD@HOST:PORT/DB_NAME?sslmode=require" -f scripts/migrate_crypto_holding_daily.sql
```

O desde Supabase: SQL Editor → pegar el contenido de `scripts/migrate_crypto_holding_daily.sql` → Run.
