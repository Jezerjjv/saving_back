# Scripts de base de datos

## Uso con Supabase

1. Entra en tu proyecto en [Supabase](https://supabase.com) → **SQL Editor**.
2. Crea una nueva query y pega el contenido de `schema.sql`.
3. Ejecuta la query para crear las tablas.

## Archivos

- **schema.sql**: Crea las tablas `accounts`, `categories`, `transactions`, `fixed_incomes`, `transfers`. Ejecutar una vez.
- **migrate_day_of_month.sql**: Si ya tenías la tabla `fixed_incomes` sin la columna `day_of_month`, ejecuta este script.
- **migrate_fixed_expenses.sql**: Añade la columna `expense_type` a `transactions` y crea la tabla `fixed_expenses`. Ejecutar si ya tenías la BD creada antes.
- **migrate_quick_templates.sql**: Crea la tabla `quick_templates` (plantillas rápidas con "Mostrar en rápidos"). Ejecutar si ya tenías la BD sin esta tabla.
- **migrate_quick_templates_icon.sql**: Añade la columna `icon` a `quick_templates` (igual que en categorías). Ejecutar si ya tenías `quick_templates` sin icono.
- **drop.sql**: Borra todas las tablas. Solo si quieres empezar de cero.

## Variables de entorno (.env)

El backend usa estas variables para conectarse a PostgreSQL/Supabase:

```
DB_HOST=tu-host.pooler.supabase.com
DB_PORT=6543
DB_USER=postgres.xxxxx
DB_PASSWORD=tu-password
DB_NAME=postgres
```

El puerto **6543** es el connection pooler de Supabase (recomendado para serverless/Node). Si usas conexión directa, el puerto suele ser **5432**.
