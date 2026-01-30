# Saving Back - API de gestión financiera

API REST para la app de gestión financiera personal. Usa **PostgreSQL** (p. ej. Supabase).

## Base de datos

1. Crea las tablas ejecutando el script en tu base de datos:
   - En Supabase: **SQL Editor** → pega el contenido de `scripts/schema.sql` → Run.
2. Configura el `.env` con las variables de conexión (ver `scripts/README.md`).

Variables necesarias en `.env`:

- `DB_HOST`, `DB_PORT` (6543 para Supabase pooler), `DB_USER`, `DB_PASSWORD`, `DB_NAME`
- Opcional: `DB_SSL=false` para desactivar SSL en local.

## Inicio

```bash
npm install
npm run dev
```

Servidor en `http://localhost:3001`.

## Endpoints

- **GET/POST** `/api/accounts` - Cuentas bancarias
- **GET/POST** `/api/categories` - Categorías (nombre, icono)
- **GET/POST** `/api/transactions` - Gastos e ingresos
- **GET** `/api/transactions/grouped?month=&year=` - Transacciones agrupadas por día y categoría
- **GET/POST** `/api/fixed-incomes` - Ingresos fijos (plantillas)
- **POST** `/api/fixed-incomes/apply-month` - Aplicar ingresos fijos al mes (body: `{ month, year }`)
- **GET/POST** `/api/transfers` - Transferencias entre cuentas
