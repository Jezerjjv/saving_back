import { query } from './db.js';

/** IDs de todos los usuarios (para jobs que se ejecutan por usuario). */
export async function getUserIds() {
  const { rows } = await query('SELECT id FROM users ORDER BY id');
  return rows.map((r) => r.id);
}

function rowAccount(r) {
  return r ? { id: r.id, name: r.name, balance: Number(r.balance), accountType: r.account_type || 'bank', currency: r.currency || 'EUR' } : null;
}
function rowAccountProduct(r) {
  if (!r) return null;
  return {
    id: r.id,
    accountId: r.account_id,
    name: r.name,
    productTypeId: r.product_type_id,
    productType: r.product_type_name ? { id: r.product_type_id, name: r.product_type_name, slug: r.product_type_slug, icon: r.product_type_icon } : null,
    balance: Number(r.balance),
    interestRateAnnual: r.interest_rate_annual != null ? Number(r.interest_rate_annual) : null,
  };
}
function rowProductType(r) {
  return r ? { id: r.id, name: r.name, slug: r.slug, icon: r.icon || '📦' } : null;
}
function rowCategory(r) {
  return r ? { id: r.id, name: r.name, icon: r.icon } : null;
}
function rowTransaction(r) {
  if (!r) return null;
  return {
    id: r.id,
    name: r.name,
    categoryId: r.category_id,
    amount: Number(r.amount),
    accountId: r.account_id,
    type: r.type,
    incomeType: r.income_type,
    expenseType: r.expense_type,
    date: r.date instanceof Date ? r.date.toISOString() : r.date,
  };
}
function rowFixedIncome(r) {
  return r ? { id: r.id, name: r.name, categoryId: r.category_id, amount: Number(r.amount), accountId: r.account_id, dayOfMonth: r.day_of_month != null ? r.day_of_month : 1 } : null;
}
function rowFixedExpense(r) {
  return r ? { id: r.id, name: r.name, categoryId: r.category_id, amount: Number(r.amount), accountId: r.account_id, dayOfMonth: r.day_of_month != null ? r.day_of_month : 1 } : null;
}
function rowTransfer(r) {
  return r
    ? {
        id: r.id,
        fromAccountId: r.from_account_id,
        toAccountId: r.to_account_id,
        amount: Number(r.amount),
        description: r.description,
        date: r.date instanceof Date ? r.date.toISOString() : r.date,
        periodicTransferId: r.periodic_transfer_id != null ? r.periodic_transfer_id : null,
      }
    : null;
}
function rowPeriodicTransfer(r) {
  return r
    ? {
        id: r.id,
        fromAccountId: r.from_account_id,
        toAccountId: r.to_account_id,
        amount: Number(r.amount),
        description: r.description,
        dayOfMonth: r.day_of_month != null ? r.day_of_month : 1,
      }
    : null;
}
function rowQuickTemplate(r) {
  return r ? { id: r.id, type: r.type, name: r.name, icon: r.icon || '📁', categoryId: r.category_id, amount: Number(r.amount), accountId: r.account_id, showInQuick: r.show_in_quick } : null;
}

// --- Accounts (por usuario) ---
export async function getAccounts(userId) {
  const { rows } = await query(
    'SELECT id, name, balance, account_type, currency FROM accounts WHERE user_id = $1 ORDER BY id',
    [userId]
  );
  return rows.map(rowAccount);
}

export async function getAccount(userId, id) {
  const { rows } = await query(
    'SELECT id, name, balance, account_type, currency FROM accounts WHERE id = $1 AND user_id = $2',
    [id, userId]
  );
  return rowAccount(rows[0]);
}

export async function createAccount(userId, { name, balance = 0, accountType = 'bank', currency = 'EUR' }) {
  const type = accountType === 'cash' ? 'cash' : 'bank';
  const curr = currency === 'USD' ? 'USD' : 'EUR';
  const { rows } = await query(
    'INSERT INTO accounts (user_id, name, balance, account_type, currency) VALUES ($1, $2, $3, $4, $5) RETURNING id, name, balance, account_type, currency',
    [userId, name.trim(), Number(balance) || 0, type, curr]
  );
  return rowAccount(rows[0]);
}

export async function updateAccount(userId, id, { name, balance, accountType, currency }) {
  const updates = [];
  const params = [];
  let n = 1;
  if (name !== undefined) {
    updates.push(`name = $${n++}`);
    params.push(String(name).trim());
  }
  if (balance !== undefined) {
    updates.push(`balance = $${n++}`);
    params.push(Number(balance));
  }
  if (accountType !== undefined) {
    updates.push(`account_type = $${n++}`);
    params.push(accountType === 'cash' ? 'cash' : 'bank');
  }
  if (currency !== undefined) {
    updates.push(`currency = $${n++}`);
    params.push(currency === 'USD' ? 'USD' : 'EUR');
  }
  if (updates.length === 0) return getAccount(userId, id);
  params.push(id, userId);
  const { rows } = await query(
    `UPDATE accounts SET ${updates.join(', ')} WHERE id = $${n} AND user_id = $${n + 1} RETURNING id, name, balance, account_type, currency`,
    params
  );
  return rowAccount(rows[0]);
}

export async function deleteAccount(userId, id) {
  const { rowCount } = await query('DELETE FROM accounts WHERE id = $1 AND user_id = $2', [id, userId]);
  return rowCount > 0;
}

// --- Product types (tabla extensible) ---
export async function getProductTypes() {
  const { rows } = await query('SELECT id, name, slug, icon FROM product_types ORDER BY id');
  return rows.map(rowProductType);
}

export async function getProductType(id) {
  const { rows } = await query('SELECT id, name, slug, icon FROM product_types WHERE id = $1', [id]);
  return rowProductType(rows[0]);
}

function slugFromName(name) {
  const base = (name || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '')
    .slice(0, 45) || 'other';
  return base;
}

export async function createProductType({ name, icon }) {
  const iconVal = (icon && String(icon).trim()) || '📦';
  let slug = slugFromName(name);
  const { rows: existing } = await query('SELECT slug FROM product_types WHERE slug = $1 OR slug LIKE $2', [slug, slug + '_%']);
  const used = new Set(existing.map((r) => r.slug));
  let suffix = 0;
  while (used.has(slug)) {
    suffix += 1;
    slug = slugFromName(name) + '_' + suffix;
  }
  const { rows } = await query(
    'INSERT INTO product_types (name, slug, icon) VALUES ($1, $2, $3) RETURNING id, name, slug, icon',
    [name.trim(), slug, iconVal]
  );
  return rowProductType(rows[0]);
}

export async function updateProductType(id, { name, icon }) {
  const updates = [];
  const params = [];
  let n = 1;
  if (name !== undefined) {
    updates.push(`name = $${n++}`);
    params.push(name.trim());
  }
  if (icon !== undefined) {
    updates.push(`icon = $${n++}`);
    params.push((icon && String(icon).trim()) || '📦');
  }
  if (updates.length === 0) return getProductType(id);
  params.push(id);
  const { rows } = await query(
    `UPDATE product_types SET ${updates.join(', ')} WHERE id = $${n} RETURNING id, name, slug, icon`,
    params
  );
  return rowProductType(rows[0]);
}

export async function deleteProductType(id) {
  const { rowCount } = await query('DELETE FROM product_types WHERE id = $1', [id]);
  return rowCount > 0;
}

// --- Account products (solo para cuentas bancarias; cuenta ya es del usuario) ---
export async function getAccountProducts(userId, accountId) {
  const { rows } = await query(
    `SELECT ap.id, ap.account_id, ap.name, ap.product_type_id, ap.balance, ap.interest_rate_annual,
            pt.name AS product_type_name, pt.slug AS product_type_slug, pt.icon AS product_type_icon
     FROM account_products ap
     JOIN product_types pt ON pt.id = ap.product_type_id
     JOIN accounts a ON a.id = ap.account_id AND a.user_id = $1
     WHERE ap.account_id = $2 ORDER BY ap.id`,
    [userId, accountId]
  );
  return rows.map(rowAccountProduct);
}

export async function getAccountProduct(userId, id) {
  const { rows } = await query(
    `SELECT ap.id, ap.account_id, ap.name, ap.product_type_id, ap.balance, ap.interest_rate_annual,
            pt.name AS product_type_name, pt.slug AS product_type_slug, pt.icon AS product_type_icon
     FROM account_products ap
     JOIN product_types pt ON pt.id = ap.product_type_id
     JOIN accounts a ON a.id = ap.account_id AND a.user_id = $1
     WHERE ap.id = $2`,
    [userId, id]
  );
  return rowAccountProduct(rows[0]);
}

export async function createAccountProduct(userId, { accountId, name, productTypeId, balance = 0, interestRateAnnual }) {
  const typeId = Number(productTypeId);
  const rate = interestRateAnnual != null && interestRateAnnual !== '' ? Number(interestRateAnnual) : null;
  await query(
    `INSERT INTO account_products (account_id, name, product_type_id, balance, interest_rate_annual)
     SELECT $1, $2, $3, $4, $5 FROM accounts WHERE id = $1 AND user_id = $6`,
    [accountId, name.trim(), typeId, Number(balance) || 0, rate, userId]
  );
  const { rows } = await query(
    `SELECT ap.id, ap.account_id, ap.name, ap.product_type_id, ap.balance, ap.interest_rate_annual,
            pt.name AS product_type_name, pt.slug AS product_type_slug, pt.icon AS product_type_icon
     FROM account_products ap
     JOIN product_types pt ON pt.id = ap.product_type_id
     WHERE ap.account_id = $1 ORDER BY ap.id DESC LIMIT 1`,
    [accountId]
  );
  return rowAccountProduct(rows[0]);
}

export async function updateAccountProduct(userId, id, { name, productTypeId, balance, interestRateAnnual }) {
  const updates = [];
  const params = [];
  let n = 1;
  if (name !== undefined) {
    updates.push(`name = $${n++}`);
    params.push(String(name).trim());
  }
  if (productTypeId !== undefined) {
    updates.push(`product_type_id = $${n++}`);
    params.push(Number(productTypeId));
  }
  if (balance !== undefined) {
    updates.push(`balance = $${n++}`);
    params.push(Number(balance));
  }
  if (interestRateAnnual !== undefined) {
    updates.push(`interest_rate_annual = $${n++}`);
    params.push(interestRateAnnual != null && interestRateAnnual !== '' ? Number(interestRateAnnual) : null);
  }
  if (updates.length === 0) return getAccountProduct(userId, id);
  params.push(id, userId);
  await query(
    `UPDATE account_products SET ${updates.join(', ')} WHERE id = $${n} AND account_id IN (SELECT id FROM accounts WHERE user_id = $${n + 1})`,
    params
  );
  return getAccountProduct(userId, id);
}

export async function deleteAccountProduct(userId, id) {
  const { rowCount } = await query(
    'DELETE FROM account_products WHERE id = $1 AND account_id IN (SELECT id FROM accounts WHERE user_id = $2)',
    [id, userId]
  );
  return rowCount > 0;
}

/**
 * Aplica intereses diarios a cuentas que tienen un producto tipo "Interés" (por usuario).
 */
export async function applyDailyInterest(userId) {
  const today = new Date().toISOString().slice(0, 10);
  const settings = await getAppSettings(userId);
  if (settings.lastInterestRunDate === today) {
    return { applied: 0, totalInterest: 0, skipped: true, reason: 'already_today' };
  }

  const interestTypeId = await query(
    "SELECT id FROM product_types WHERE slug = 'interest' LIMIT 1"
  );
  if (!interestTypeId.rows?.length) {
    return { applied: 0, totalInterest: 0, skipped: false, reason: 'no_accounts' };
  }

  const { rows: toUpdate } = await query(
    `SELECT DISTINCT ON (a.id) a.id AS account_id, a.balance,
            POWER(1 + ap.interest_rate_annual / 100.0, 1.0 / 365.0) AS multiplier
     FROM accounts a
     JOIN account_products ap ON ap.account_id = a.id
     WHERE a.user_id = $1 AND ap.product_type_id = $2
       AND ap.interest_rate_annual IS NOT NULL AND ap.interest_rate_annual > 0
     ORDER BY a.id, ap.id`,
    [userId, interestTypeId.rows[0].id]
  );

  const byAccount = new Map();
  for (const r of toUpdate) {
    if (!byAccount.has(r.account_id)) {
      byAccount.set(r.account_id, { balance: Number(r.balance), multiplier: Number(r.multiplier) });
    }
  }

  let totalInterest = 0;
  for (const { balance, multiplier } of byAccount.values()) {
    totalInterest += balance * (multiplier - 1);
  }

  if (byAccount.size === 0) {
    return { applied: 0, totalInterest: 0, skipped: false, reason: 'no_accounts' };
  }

  const { rowCount } = await query(
    `UPDATE accounts a
     SET balance = a.balance * sub.multiplier
     FROM (
       SELECT DISTINCT ON (ap.account_id) ap.account_id,
              POWER(1 + ap.interest_rate_annual / 100.0, 1.0 / 365.0) AS multiplier
       FROM account_products ap
       JOIN accounts a2 ON a2.id = ap.account_id AND a2.user_id = $1
       WHERE ap.product_type_id = (SELECT id FROM product_types WHERE slug = 'interest' LIMIT 1)
         AND ap.interest_rate_annual IS NOT NULL AND ap.interest_rate_annual > 0
       ORDER BY ap.account_id, ap.id
     ) sub
     WHERE a.id = sub.account_id AND a.user_id = $1`,
    [userId]
  );
  const applied = rowCount ?? 0;

  if (applied > 0) {
    await updateAppSettings(userId, { lastInterestRunDate: today });
    for (const [accountId, { balance, multiplier }] of byAccount) {
      const amount = Math.round(balance * (multiplier - 1) * 100) / 100;
      if (amount < 0.01) continue;
      await query(
        `INSERT INTO interest_history (user_id, date, account_id, amount) VALUES ($1, $2, $3, $4)`,
        [userId, today, accountId, amount]
      );
    }
  }
  return {
    applied,
    totalInterest: Math.round(totalInterest * 100) / 100,
    skipped: false,
    reason: applied > 0 ? 'ok' : 'no_accounts',
  };
}

/** True si hay al menos una cuenta con un producto de tipo interés (slug = 'interest') para el usuario. */
export async function hasInterestProduct(userId) {
  const { rows } = await query(
    `SELECT 1 FROM account_products ap
     JOIN accounts a ON a.id = ap.account_id AND a.user_id = $1
     JOIN product_types pt ON pt.id = ap.product_type_id
     WHERE pt.slug = 'interest' AND ap.interest_rate_annual IS NOT NULL AND ap.interest_rate_annual > 0
     LIMIT 1`,
    [userId]
  );
  return (rows?.length ?? 0) > 0;
}

/** Historial de intereses: lista { date, accountId, amount } opcionalmente filtrado por año/mes. */
export async function getInterestHistory(userId, year, month) {
  let sql = `
    SELECT ih.date, ih.account_id AS account_id, ih.amount
    FROM interest_history ih
    WHERE ih.user_id = $1
  `;
  const params = [userId];
  let n = 2;
  if (year != null && month != null) {
    sql += ` AND EXTRACT(YEAR FROM ih.date) = $${n++} AND EXTRACT(MONTH FROM ih.date) = $${n++}`;
    params.push(year, month);
  } else if (year != null) {
    sql += ` AND EXTRACT(YEAR FROM ih.date) = $${n++}`;
    params.push(year);
  }
  sql += ' ORDER BY ih.date DESC, ih.account_id';
  const { rows } = await query(sql, params);
  return rows.map((r) => ({
    date: r.date instanceof Date ? r.date.toISOString().slice(0, 10) : r.date,
    accountId: r.account_id,
    amount: Number(r.amount),
  }));
}

// --- Icons (para categorías y productos) ---
function rowIcon(r) {
  return r ? { id: r.id, symbol: r.symbol, name: r.name || null } : null;
}

export async function getIcons() {
  const { rows } = await query('SELECT id, symbol, name FROM icons ORDER BY id');
  return rows.map(rowIcon);
}

export async function getIcon(id) {
  const { rows } = await query('SELECT id, symbol, name FROM icons WHERE id = $1', [id]);
  return rowIcon(rows[0]);
}

export async function createIcon({ symbol, name }) {
  const sym = String(symbol).trim().slice(0, 20);
  if (!sym) throw new Error('El símbolo del icono es obligatorio');
  const { rows } = await query(
    'INSERT INTO icons (symbol, name) VALUES ($1, $2) ON CONFLICT (symbol) DO NOTHING RETURNING id, symbol, name',
    [sym, name ? String(name).trim().slice(0, 100) : null]
  );
  if (!rows.length) throw new Error('Ese icono ya existe');
  return rowIcon(rows[0]);
}

export async function updateIcon(id, { symbol, name }) {
  const updates = [];
  const params = [];
  let n = 1;
  if (symbol !== undefined) {
    updates.push(`symbol = $${n++}`);
    params.push(String(symbol).trim().slice(0, 20));
  }
  if (name !== undefined) {
    updates.push(`name = $${n++}`);
    params.push(name == null ? null : String(name).trim().slice(0, 100));
  }
  if (updates.length === 0) return getIcon(id);
  params.push(id);
  const { rows } = await query(
    `UPDATE icons SET ${updates.join(', ')} WHERE id = $${n} RETURNING id, symbol, name`,
    params
  );
  return rowIcon(rows[0]);
}

export async function deleteIcon(id) {
  const { rowCount } = await query('DELETE FROM icons WHERE id = $1', [id]);
  return rowCount > 0;
}

// --- Categories (por usuario) ---
export async function getCategories(userId) {
  const { rows } = await query(
    'SELECT id, name, icon FROM categories WHERE user_id = $1 ORDER BY id',
    [userId]
  );
  return rows.map(rowCategory);
}

export async function getCategory(userId, id) {
  const { rows } = await query(
    'SELECT id, name, icon FROM categories WHERE id = $1 AND user_id = $2',
    [id, userId]
  );
  return rowCategory(rows[0]);
}

export async function createCategory(userId, { name, icon = '📁' }) {
  const { rows } = await query(
    'INSERT INTO categories (user_id, name, icon) VALUES ($1, $2, $3) RETURNING id, name, icon',
    [userId, name.trim(), String(icon).trim() || '📁']
  );
  return rowCategory(rows[0]);
}

export async function updateCategory(userId, id, { name, icon }) {
  const updates = [];
  const params = [];
  let n = 1;
  if (name !== undefined) {
    updates.push(`name = $${n++}`);
    params.push(String(name).trim());
  }
  if (icon !== undefined) {
    updates.push(`icon = $${n++}`);
    params.push(String(icon).trim());
  }
  if (updates.length === 0) return getCategory(userId, id);
  params.push(id, userId);
  const { rows } = await query(
    `UPDATE categories SET ${updates.join(', ')} WHERE id = $${n} AND user_id = $${n + 1} RETURNING id, name, icon`,
    params
  );
  return rowCategory(rows[0]);
}

export async function deleteCategory(userId, id) {
  const { rowCount } = await query('DELETE FROM categories WHERE id = $1 AND user_id = $2', [id, userId]);
  return rowCount > 0;
}

// --- Transactions (por usuario) ---
export async function getTransactions(userId) {
  const { rows } = await query(
    'SELECT id, name, category_id, amount, account_id, type, income_type, expense_type, date FROM transactions WHERE user_id = $1 ORDER BY date DESC',
    [userId]
  );
  return rows.map(rowTransaction);
}

export async function getTransaction(userId, id) {
  const { rows } = await query(
    'SELECT id, name, category_id, amount, account_id, type, income_type, expense_type, date FROM transactions WHERE id = $1 AND user_id = $2',
    [id, userId]
  );
  return rowTransaction(rows[0]);
}

export async function getTransactionsGrouped(userId, month, year) {
  const categories = await getCategories(userId);
  let sql = `
    SELECT id, name, category_id, amount, account_id, type, income_type, expense_type, date
    FROM transactions WHERE user_id = $1
  `;
  const params = [userId];
  let n = 2;
  if (month != null && year != null) {
    sql += ` AND EXTRACT(MONTH FROM date AT TIME ZONE 'UTC') = $${n++} AND EXTRACT(YEAR FROM date AT TIME ZONE 'UTC') = $${n++}`;
    params.push(month, year);
  }
  sql += ' ORDER BY date DESC';
  const { rows } = await query(sql, params);
  const list = rows.map(rowTransaction);
  const byDay = {};
  for (const t of list) {
    const day = t.date.split('T')[0];
    if (!byDay[day]) byDay[day] = {};
    const catId = t.categoryId ?? 0;
    if (!byDay[day][catId]) byDay[day][catId] = [];
    byDay[day][catId].push(t);
  }
  return Object.entries(byDay).map(([date, cats]) => ({
    date,
    categories: Object.entries(cats).map(([catId, items]) => ({
      categoryId: Number(catId),
      categoryName: categories.find((c) => c.id === Number(catId))?.name ?? 'Sin categoría',
      categoryIcon: categories.find((c) => c.id === Number(catId))?.icon ?? '📁',
      items,
    })),
  }));
}

/** Gastos del mes agrupados por categoría (para resumen mensual). */
export async function getExpensesByCategory(userId, month, year) {
  const m = month != null ? Number(month) : new Date().getMonth() + 1;
  const y = year != null ? Number(year) : new Date().getFullYear();
  const { rows } = await query(
    `SELECT
       t.category_id AS category_id,
       COALESCE(c.name, 'Sin categoría') AS category_name,
       COALESCE(c.icon, '📁') AS category_icon,
       SUM(t.amount) AS total
     FROM transactions t
     LEFT JOIN categories c ON c.id = t.category_id AND c.user_id = t.user_id
     WHERE t.user_id = $1 AND t.type = 'expense'
       AND EXTRACT(MONTH FROM t.date AT TIME ZONE 'UTC') = $2
       AND EXTRACT(YEAR FROM t.date AT TIME ZONE 'UTC') = $3
     GROUP BY t.category_id, c.name, c.icon
     ORDER BY total DESC`,
    [userId, m, y]
  );
  return rows.map((r) => ({
    categoryId: r.category_id,
    categoryName: r.category_name,
    categoryIcon: r.category_icon,
    total: Number(r.total),
  }));
}

/** Ingresos del mes agrupados por categoría (para resumen mensual). */
export async function getIncomesByCategory(userId, month, year) {
  const m = month != null ? Number(month) : new Date().getMonth() + 1;
  const y = year != null ? Number(year) : new Date().getFullYear();
  const { rows } = await query(
    `SELECT
       t.category_id AS category_id,
       COALESCE(c.name, 'Sin categoría') AS category_name,
       COALESCE(c.icon, '📁') AS category_icon,
       SUM(t.amount) AS total
     FROM transactions t
     LEFT JOIN categories c ON c.id = t.category_id AND c.user_id = t.user_id
     WHERE t.user_id = $1 AND t.type = 'income'
       AND EXTRACT(MONTH FROM t.date AT TIME ZONE 'UTC') = $2
       AND EXTRACT(YEAR FROM t.date AT TIME ZONE 'UTC') = $3
     GROUP BY t.category_id, c.name, c.icon
     ORDER BY total DESC`,
    [userId, m, y]
  );
  return rows.map((r) => ({
    categoryId: r.category_id,
    categoryName: r.category_name,
    categoryIcon: r.category_icon,
    total: Number(r.total),
  }));
}

export async function getMonthlySummary(userId, year) {
  const y = year != null ? Number(year) : new Date().getFullYear();
  const { rows } = await query(
    `SELECT
       EXTRACT(MONTH FROM date AT TIME ZONE 'UTC')::int AS month,
       SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) AS income,
       SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) AS expense
     FROM transactions
     WHERE user_id = $1 AND EXTRACT(YEAR FROM date AT TIME ZONE 'UTC') = $2
     GROUP BY EXTRACT(MONTH FROM date AT TIME ZONE 'UTC')
     ORDER BY month`,
    [userId, y]
  );
  const byMonth = {};
  for (let m = 1; m <= 12; m++) {
    byMonth[m] = { month: m, year: y, income: 0, expense: 0, balance: 0 };
  }
  for (const r of rows) {
    const m = r.month;
    const income = Number(r.income) || 0;
    const expense = Number(r.expense) || 0;
    byMonth[m] = { month: m, year: y, income, expense, balance: income - expense };
  }
  return Object.values(byMonth);
}

/** Por cada día del año con transacciones: si hay ingresos y/o gastos (para indicadores en calendario). */
export async function getDailyIndicators(userId, year) {
  const y = year != null ? Number(year) : new Date().getFullYear();
  const { rows } = await query(
    `SELECT
       EXTRACT(MONTH FROM date AT TIME ZONE 'UTC')::int AS month,
       EXTRACT(DAY FROM date AT TIME ZONE 'UTC')::int AS day,
       MAX(CASE WHEN type = 'income' THEN 1 ELSE 0 END) AS has_income,
       MAX(CASE WHEN type = 'expense' THEN 1 ELSE 0 END) AS has_expense
     FROM transactions
     WHERE user_id = $1 AND EXTRACT(YEAR FROM date AT TIME ZONE 'UTC') = $2
     GROUP BY EXTRACT(MONTH FROM date AT TIME ZONE 'UTC'), EXTRACT(DAY FROM date AT TIME ZONE 'UTC')`,
    [userId, y]
  );
  return rows.map((r) => ({
    month: r.month,
    day: r.day,
    hasIncome: Number(r.has_income) === 1,
    hasExpense: Number(r.has_expense) === 1,
  }));
}

export async function createTransaction(userId, { name, categoryId, amount, accountId, type, incomeType, expenseType, date }) {
  const dateVal = date ? new Date(date).toISOString().split('T')[0] + 'T12:00:00.000Z' : new Date().toISOString();
  const incomeTypeVal = type === 'income' ? (incomeType ?? null) : null;
  const expenseTypeVal = type === 'expense' ? (expenseType ?? null) : null;
  const { rows } = await query(
    `INSERT INTO transactions (user_id, name, category_id, amount, account_id, type, income_type, expense_type, date)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING id, name, category_id, amount, account_id, type, income_type, expense_type, date`,
    [userId, name.trim(), categoryId != null ? categoryId : null, amount, accountId, type, incomeTypeVal, expenseTypeVal, dateVal]
  );
  const tx = rowTransaction(rows[0]);
  const delta = type === 'expense' ? -Number(amount) : Number(amount);
  await query('UPDATE accounts SET balance = balance + $1 WHERE id = $2 AND user_id = $3', [delta, accountId, userId]);
  return tx;
}

export async function updateTransaction(userId, id, { name, categoryId, amount, accountId, type, incomeType, expenseType, date }) {
  const old = await getTransaction(userId, id);
  if (!old) return null;
  const prevDelta = old.type === 'expense' ? old.amount : -old.amount;
  await query('UPDATE accounts SET balance = balance + $1 WHERE id = $2 AND user_id = $3', [prevDelta, old.accountId, userId]);
  const newAmount = amount !== undefined ? Number(amount) : old.amount;
  const newAccountId = accountId !== undefined ? accountId : old.accountId;
  const newType = type || old.type;
  const newIncomeType = incomeType !== undefined ? incomeType : old.incomeType;
  const newExpenseType = expenseType !== undefined ? expenseType : old.expenseType;
  const newDate = date ? new Date(date).toISOString() : old.date;
  const { rows } = await query(
    `UPDATE transactions SET name = COALESCE($2, name), category_id = $3, amount = $4, account_id = $5, type = $6, income_type = $7, expense_type = $8, "date" = $9
     WHERE id = $1 AND user_id = $10 RETURNING id, name, category_id, amount, account_id, type, income_type, expense_type, date`,
    [id, name !== undefined ? name.trim() : null, categoryId !== undefined ? categoryId : null, newAmount, newAccountId, newType, newType === 'income' ? newIncomeType : null, newType === 'expense' ? newExpenseType : null, newDate, userId]
  );
  if (!rows[0]) return null;
  const tx = rowTransaction(rows[0]);
  const newDelta = newType === 'expense' ? -newAmount : newAmount;
  await query('UPDATE accounts SET balance = balance + $1 WHERE id = $2 AND user_id = $3', [newDelta, newAccountId, userId]);
  return tx;
}

export async function deleteTransaction(userId, id) {
  const tx = await getTransaction(userId, id);
  if (!tx) return false;
  const delta = tx.type === 'expense' ? tx.amount : -tx.amount;
  await query('UPDATE accounts SET balance = balance + $1 WHERE id = $2 AND user_id = $3', [delta, tx.accountId, userId]);
  const { rowCount } = await query('DELETE FROM transactions WHERE id = $1 AND user_id = $2', [id, userId]);
  return rowCount > 0;
}

// --- Fixed incomes (por usuario) ---
export async function getFixedIncomes(userId) {
  const { rows } = await query(
    'SELECT id, name, category_id, amount, account_id, day_of_month FROM fixed_incomes WHERE user_id = $1 ORDER BY id',
    [userId]
  );
  return rows.map(rowFixedIncome);
}

export async function getFixedIncome(userId, id) {
  const { rows } = await query(
    'SELECT id, name, category_id, amount, account_id, day_of_month FROM fixed_incomes WHERE id = $1 AND user_id = $2',
    [id, userId]
  );
  return rowFixedIncome(rows[0]);
}

function dateForDayOfMonth(year, month, day) {
  const lastDay = new Date(year, month, 0).getDate();
  const d = Math.min(day, lastDay);
  return `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}T12:00:00.000Z`;
}

export async function createFixedIncome(userId, { name, categoryId, amount, accountId, dayOfMonth = 1 }) {
  const day = Math.min(31, Math.max(1, Number(dayOfMonth) || 1));
  const { rows } = await query(
    'INSERT INTO fixed_incomes (user_id, name, category_id, amount, account_id, day_of_month) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, name, category_id, amount, account_id, day_of_month',
    [userId, name.trim(), categoryId != null ? categoryId : null, Number(amount), accountId, day]
  );
  return rowFixedIncome(rows[0]);
}

export async function updateFixedIncome(userId, id, { name, categoryId, amount, accountId, dayOfMonth }) {
  const updates = [];
  const params = [];
  let n = 1;
  if (name !== undefined) {
    updates.push(`name = $${n++}`);
    params.push(name.trim());
  }
  if (categoryId !== undefined) {
    updates.push(`category_id = $${n++}`);
    params.push(categoryId == null ? null : categoryId);
  }
  if (amount !== undefined) {
    updates.push(`amount = $${n++}`);
    params.push(Number(amount));
  }
  if (accountId !== undefined) {
    updates.push(`account_id = $${n++}`);
    params.push(accountId);
  }
  if (dayOfMonth !== undefined) {
    updates.push(`day_of_month = $${n++}`);
    params.push(Math.min(31, Math.max(1, Number(dayOfMonth) || 1)));
  }
  if (updates.length === 0) return getFixedIncome(userId, id);
  params.push(id, userId);
  const { rows } = await query(
    `UPDATE fixed_incomes SET ${updates.join(', ')} WHERE id = $${n} AND user_id = $${n + 1} RETURNING id, name, category_id, amount, account_id, day_of_month`,
    params
  );
  return rowFixedIncome(rows[0]);
}

export async function deleteFixedIncome(userId, id) {
  const { rowCount } = await query('DELETE FROM fixed_incomes WHERE id = $1 AND user_id = $2', [id, userId]);
  return rowCount > 0;
}

/** Aplica ingresos fijos para un mes (por usuario). */
export async function applyFixedIncomesForMonth(userId, month, year, dayFilter = null) {
  let fixedList = await getFixedIncomes(userId);
  const m = month != null ? Number(month) : new Date().getMonth() + 1;
  const y = year != null ? Number(year) : new Date().getFullYear();
  if (dayFilter != null) {
    const d = Math.min(31, Math.max(1, Number(dayFilter)));
    fixedList = fixedList.filter((fi) => (fi.dayOfMonth != null ? fi.dayOfMonth : 1) === d);
  }
  const nextMonth = m === 12 ? 1 : m + 1;
  const nextYear = m === 12 ? y + 1 : y;
  const endDate = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`;
  const existing = await query(
    `SELECT name FROM transactions WHERE user_id = $1 AND type = 'income' AND income_type = 'fixed' AND date >= $2 AND date < $3`,
    [userId, `${y}-${String(m).padStart(2, '0')}-01`, endDate]
  );
  const existingNames = new Set(existing.rows.map((r) => r.name));
  const created = [];
  for (const fi of fixedList) {
    if (existingNames.has(fi.name)) continue;
    const day = fi.dayOfMonth != null ? fi.dayOfMonth : 1;
    const dateStr = dateForDayOfMonth(y, m, day);
    const tx = await createTransaction(userId, {
      name: fi.name,
      categoryId: fi.categoryId,
      amount: fi.amount,
      accountId: fi.accountId,
      type: 'income',
      incomeType: 'fixed',
      date: dateStr,
    });
    created.push(tx);
    existingNames.add(fi.name);
  }
  return created;
}

/** Aplica un solo ingreso fijo por id para el mes/año indicado. */
export async function applySingleFixedIncome(userId, id, month, year) {
  const fi = await getFixedIncome(userId, id);
  if (!fi) return null;
  const m = month != null ? Number(month) : new Date().getMonth() + 1;
  const y = year != null ? Number(year) : new Date().getFullYear();
  const nextMonth = m === 12 ? 1 : m + 1;
  const nextYear = m === 12 ? y + 1 : y;
  const endDate = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`;
  const existing = await query(
    `SELECT id FROM transactions WHERE user_id = $1 AND type = 'income' AND income_type = 'fixed' AND name = $2 AND date >= $3 AND date < $4`,
    [userId, fi.name, `${y}-${String(m).padStart(2, '0')}-01`, endDate]
  );
  if (existing.rows.length > 0) return null;
  const day = fi.dayOfMonth != null ? fi.dayOfMonth : 1;
  const dateStr = dateForDayOfMonth(y, m, day);
  return createTransaction(userId, {
    name: fi.name,
    categoryId: fi.categoryId,
    amount: fi.amount,
    accountId: fi.accountId,
    type: 'income',
    incomeType: 'fixed',
    date: dateStr,
  });
}

// --- Fixed expenses (por usuario) ---
export async function getFixedExpenses(userId) {
  const { rows } = await query(
    'SELECT id, name, category_id, amount, account_id, day_of_month FROM fixed_expenses WHERE user_id = $1 ORDER BY id',
    [userId]
  );
  return rows.map(rowFixedExpense);
}

export async function getFixedExpense(userId, id) {
  const { rows } = await query(
    'SELECT id, name, category_id, amount, account_id, day_of_month FROM fixed_expenses WHERE id = $1 AND user_id = $2',
    [id, userId]
  );
  return rowFixedExpense(rows[0]);
}

export async function createFixedExpense(userId, { name, categoryId, amount, accountId, dayOfMonth = 1 }) {
  const day = Math.min(31, Math.max(1, Number(dayOfMonth) || 1));
  const { rows } = await query(
    'INSERT INTO fixed_expenses (user_id, name, category_id, amount, account_id, day_of_month) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, name, category_id, amount, account_id, day_of_month',
    [userId, name.trim(), categoryId != null ? categoryId : null, Number(amount), accountId, day]
  );
  return rowFixedExpense(rows[0]);
}

export async function updateFixedExpense(userId, id, { name, categoryId, amount, accountId, dayOfMonth }) {
  const updates = [];
  const params = [];
  let n = 1;
  if (name !== undefined) {
    updates.push(`name = $${n++}`);
    params.push(name.trim());
  }
  if (categoryId !== undefined) {
    updates.push(`category_id = $${n++}`);
    params.push(categoryId == null ? null : categoryId);
  }
  if (amount !== undefined) {
    updates.push(`amount = $${n++}`);
    params.push(Number(amount));
  }
  if (accountId !== undefined) {
    updates.push(`account_id = $${n++}`);
    params.push(accountId);
  }
  if (dayOfMonth !== undefined) {
    updates.push(`day_of_month = $${n++}`);
    params.push(Math.min(31, Math.max(1, Number(dayOfMonth) || 1)));
  }
  if (updates.length === 0) return getFixedExpense(userId, id);
  params.push(id, userId);
  const { rows } = await query(
    `UPDATE fixed_expenses SET ${updates.join(', ')} WHERE id = $${n} AND user_id = $${n + 1} RETURNING id, name, category_id, amount, account_id, day_of_month`,
    params
  );
  return rowFixedExpense(rows[0]);
}

export async function deleteFixedExpense(userId, id) {
  const { rowCount } = await query('DELETE FROM fixed_expenses WHERE id = $1 AND user_id = $2', [id, userId]);
  return rowCount > 0;
}

/** Aplica gastos fijos para un mes (por usuario). */
export async function applyFixedExpensesForMonth(userId, month, year, dayFilter = null) {
  let fixedList = await getFixedExpenses(userId);
  const m = month != null ? Number(month) : new Date().getMonth() + 1;
  const y = year != null ? Number(year) : new Date().getFullYear();
  if (dayFilter != null) {
    const d = Math.min(31, Math.max(1, Number(dayFilter)));
    fixedList = fixedList.filter((fe) => (fe.dayOfMonth != null ? fe.dayOfMonth : 1) === d);
  }
  const nextMonth = m === 12 ? 1 : m + 1;
  const nextYear = m === 12 ? y + 1 : y;
  const endDate = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`;
  const existing = await query(
    `SELECT name FROM transactions WHERE user_id = $1 AND type = 'expense' AND expense_type = 'fixed' AND date >= $2 AND date < $3`,
    [userId, `${y}-${String(m).padStart(2, '0')}-01`, endDate]
  );
  const existingNames = new Set(existing.rows.map((r) => r.name));
  const created = [];
  for (const fe of fixedList) {
    if (existingNames.has(fe.name)) continue;
    const day = fe.dayOfMonth != null ? fe.dayOfMonth : 1;
    const dateStr = dateForDayOfMonth(y, m, day);
    const tx = await createTransaction(userId, {
      name: fe.name,
      categoryId: fe.categoryId,
      amount: fe.amount,
      accountId: fe.accountId,
      type: 'expense',
      expenseType: 'fixed',
      date: dateStr,
    });
    created.push(tx);
    existingNames.add(fe.name);
  }
  return created;
}

/** Aplica un solo gasto fijo por id para el mes/año indicado. */
export async function applySingleFixedExpense(userId, id, month, year) {
  const fe = await getFixedExpense(userId, id);
  if (!fe) return null;
  const m = month != null ? Number(month) : new Date().getMonth() + 1;
  const y = year != null ? Number(year) : new Date().getFullYear();
  const nextMonth = m === 12 ? 1 : m + 1;
  const nextYear = m === 12 ? y + 1 : y;
  const endDate = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`;
  const existing = await query(
    `SELECT id FROM transactions WHERE user_id = $1 AND type = 'expense' AND expense_type = 'fixed' AND name = $2 AND date >= $3 AND date < $4`,
    [userId, fe.name, `${y}-${String(m).padStart(2, '0')}-01`, endDate]
  );
  if (existing.rows.length > 0) return null;
  const day = fe.dayOfMonth != null ? fe.dayOfMonth : 1;
  const dateStr = dateForDayOfMonth(y, m, day);
  return createTransaction(userId, {
    name: fe.name,
    categoryId: fe.categoryId,
    amount: fe.amount,
    accountId: fe.accountId,
    type: 'expense',
    expenseType: 'fixed',
    date: dateStr,
  });
}

// --- Quick templates (por usuario) ---
export async function getQuickTemplates(userId, { type, showInQuick } = {}) {
  let sql = 'SELECT id, type, name, icon, category_id, amount, account_id, show_in_quick FROM quick_templates WHERE user_id = $1';
  const params = [userId];
  let n = 2;
  if (type) {
    sql += ` AND type = $${n++}`;
    params.push(type);
  }
  if (showInQuick !== undefined) {
    sql += ` AND show_in_quick = $${n++}`;
    params.push(!!showInQuick);
  }
  sql += ' ORDER BY name';
  const { rows } = await query(sql, params);
  return rows.map(rowQuickTemplate);
}

export async function getQuickTemplate(userId, id) {
  const { rows } = await query(
    'SELECT id, type, name, icon, category_id, amount, account_id, show_in_quick FROM quick_templates WHERE id = $1 AND user_id = $2',
    [id, userId]
  );
  return rowQuickTemplate(rows[0]);
}

export async function createQuickTemplate(userId, { type, name, icon = '📁', categoryId, amount, accountId, showInQuick = true }) {
  const iconVal = (icon && String(icon).trim()) ? String(icon).trim().slice(0, 50) : '📁';
  const { rows } = await query(
    'INSERT INTO quick_templates (user_id, type, name, icon, category_id, amount, account_id, show_in_quick) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id, type, name, icon, category_id, amount, account_id, show_in_quick',
    [userId, type, name.trim(), iconVal, categoryId != null ? categoryId : null, Number(amount), accountId, !!showInQuick]
  );
  return rowQuickTemplate(rows[0]);
}

export async function updateQuickTemplate(userId, id, { name, icon, categoryId, amount, accountId, showInQuick }) {
  const updates = [];
  const params = [];
  let n = 1;
  if (name !== undefined) {
    updates.push(`name = $${n++}`);
    params.push(name.trim());
  }
  if (icon !== undefined) {
    updates.push(`icon = $${n++}`);
    params.push((icon && String(icon).trim()) ? String(icon).trim().slice(0, 50) : '📁');
  }
  if (categoryId !== undefined) {
    updates.push(`category_id = $${n++}`);
    params.push(categoryId == null ? null : categoryId);
  }
  if (amount !== undefined) {
    updates.push(`amount = $${n++}`);
    params.push(Number(amount));
  }
  if (accountId !== undefined) {
    updates.push(`account_id = $${n++}`);
    params.push(accountId);
  }
  if (showInQuick !== undefined) {
    updates.push(`show_in_quick = $${n++}`);
    params.push(!!showInQuick);
  }
  if (updates.length === 0) return getQuickTemplate(userId, id);
  params.push(id, userId);
  const { rows } = await query(
    `UPDATE quick_templates SET ${updates.join(', ')} WHERE id = $${n} AND user_id = $${n + 1} RETURNING id, type, name, icon, category_id, amount, account_id, show_in_quick`,
    params
  );
  return rowQuickTemplate(rows[0]);
}

export async function deleteQuickTemplate(userId, id) {
  const { rowCount } = await query('DELETE FROM quick_templates WHERE id = $1 AND user_id = $2', [id, userId]);
  return rowCount > 0;
}

// --- Transfers (por usuario) ---
export async function getTransfers(userId) {
  const { rows } = await query(
    'SELECT id, from_account_id, to_account_id, amount, description, date, periodic_transfer_id FROM transfers WHERE user_id = $1 ORDER BY date DESC',
    [userId]
  );
  return rows.map(rowTransfer);
}

export async function getTransfer(userId, id) {
  const { rows } = await query(
    'SELECT id, from_account_id, to_account_id, amount, description, date, periodic_transfer_id FROM transfers WHERE id = $1 AND user_id = $2',
    [id, userId]
  );
  return rowTransfer(rows[0]);
}

export async function createTransfer(userId, { fromAccountId, toAccountId, amount, description, periodicTransferId }) {
  const amt = Number(amount) || 0;
  const { rows } = await query(
    `INSERT INTO transfers (user_id, from_account_id, to_account_id, amount, description, periodic_transfer_id) VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, from_account_id, to_account_id, amount, description, date, periodic_transfer_id`,
    [userId, fromAccountId, toAccountId, amt, description ? description.trim() : null, periodicTransferId ?? null]
  );
  await query('UPDATE accounts SET balance = balance - $1 WHERE id = $2 AND user_id = $3', [amt, fromAccountId, userId]);
  await query('UPDATE accounts SET balance = balance + $1 WHERE id = $2 AND user_id = $3', [amt, toAccountId, userId]);
  return rowTransfer(rows[0]);
}

// --- Periodic transfers (por usuario) ---
export async function getPeriodicTransfers(userId) {
  const { rows } = await query(
    'SELECT id, from_account_id, to_account_id, amount, description, day_of_month FROM periodic_transfers WHERE user_id = $1 ORDER BY id',
    [userId]
  );
  return rows.map(rowPeriodicTransfer);
}

export async function getPeriodicTransfer(userId, id) {
  const { rows } = await query(
    'SELECT id, from_account_id, to_account_id, amount, description, day_of_month FROM periodic_transfers WHERE id = $1 AND user_id = $2',
    [id, userId]
  );
  return rowPeriodicTransfer(rows[0]);
}

export async function createPeriodicTransfer(userId, { fromAccountId, toAccountId, amount, description, dayOfMonth = 1 }) {
  const day = Math.min(31, Math.max(1, Number(dayOfMonth) || 1));
  const { rows } = await query(
    `INSERT INTO periodic_transfers (user_id, from_account_id, to_account_id, amount, description, day_of_month) VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, from_account_id, to_account_id, amount, description, day_of_month`,
    [userId, fromAccountId, toAccountId, Number(amount), description ? description.trim() : null, day]
  );
  return rowPeriodicTransfer(rows[0]);
}

export async function updatePeriodicTransfer(userId, id, { fromAccountId, toAccountId, amount, description, dayOfMonth }) {
  const updates = [];
  const params = [];
  let n = 1;
  if (fromAccountId !== undefined) {
    updates.push(`from_account_id = $${n++}`);
    params.push(fromAccountId);
  }
  if (toAccountId !== undefined) {
    updates.push(`to_account_id = $${n++}`);
    params.push(toAccountId);
  }
  if (amount !== undefined) {
    updates.push(`amount = $${n++}`);
    params.push(Number(amount));
  }
  if (description !== undefined) {
    updates.push(`description = $${n++}`);
    params.push(description ? description.trim() : null);
  }
  if (dayOfMonth !== undefined) {
    updates.push(`day_of_month = $${n++}`);
    params.push(Math.min(31, Math.max(1, Number(dayOfMonth) || 1)));
  }
  if (updates.length === 0) return getPeriodicTransfer(userId, id);
  params.push(id, userId);
  const { rows } = await query(
    `UPDATE periodic_transfers SET ${updates.join(', ')} WHERE id = $${n} AND user_id = $${n + 1} RETURNING id, from_account_id, to_account_id, amount, description, day_of_month`,
    params
  );
  return rowPeriodicTransfer(rows[0]);
}

export async function deletePeriodicTransfer(userId, id) {
  const { rowCount } = await query('DELETE FROM periodic_transfers WHERE id = $1 AND user_id = $2', [id, userId]);
  return rowCount > 0;
}

/** Aplica transferencias periódicas para un mes (por usuario). */
export async function applyPeriodicTransfersForMonth(userId, month, year, dayFilter = null) {
  let list = await getPeriodicTransfers(userId);
  const m = month != null ? Number(month) : new Date().getMonth() + 1;
  const y = year != null ? Number(year) : new Date().getFullYear();
  if (dayFilter != null) {
    const d = Math.min(31, Math.max(1, Number(dayFilter)));
    list = list.filter((pt) => (pt.dayOfMonth != null ? pt.dayOfMonth : 1) === d);
  }
  const startDate = `${y}-${String(m).padStart(2, '0')}-01`;
  const nextMonth = m === 12 ? 1 : m + 1;
  const nextYear = m === 12 ? y + 1 : y;
  const endDate = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`;
  const existing = await query(
    'SELECT periodic_transfer_id FROM transfers WHERE user_id = $1 AND periodic_transfer_id IS NOT NULL AND date >= $2 AND date < $3',
    [userId, startDate, endDate]
  );
  const appliedIds = new Set(existing.rows.map((r) => r.periodic_transfer_id));
  const created = [];
  for (const pt of list) {
    if (appliedIds.has(pt.id)) continue;
    const day = pt.dayOfMonth != null ? pt.dayOfMonth : 1;
    const lastDay = new Date(y, m, 0).getDate();
    const d = Math.min(day, lastDay);
    const dateStr = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}T12:00:00.000Z`;
    const t = await createTransfer(userId, {
      fromAccountId: pt.fromAccountId,
      toAccountId: pt.toAccountId,
      amount: pt.amount,
      description: pt.description || undefined,
      periodicTransferId: pt.id,
    });
    await query('UPDATE transfers SET date = $1 WHERE id = $2 AND user_id = $3', [dateStr, t.id, userId]);
    created.push({ ...t, date: dateStr });
    appliedIds.add(pt.id);
  }
  return created;
}

/** Aplica una sola transferencia periódica por id para el mes/año indicado. */
export async function applySinglePeriodicTransfer(userId, id, month, year) {
  const pt = await getPeriodicTransfer(userId, id);
  if (!pt) return null;
  const m = month != null ? Number(month) : new Date().getMonth() + 1;
  const y = year != null ? Number(year) : new Date().getFullYear();
  const startDate = `${y}-${String(m).padStart(2, '0')}-01`;
  const nextMonth = m === 12 ? 1 : m + 1;
  const nextYear = m === 12 ? y + 1 : y;
  const endDate = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`;
  const existing = await query(
    'SELECT id FROM transfers WHERE user_id = $1 AND periodic_transfer_id = $2 AND date >= $3 AND date < $4',
    [userId, id, startDate, endDate]
  );
  if (existing.rows.length > 0) return null;
  const day = pt.dayOfMonth != null ? pt.dayOfMonth : 1;
  const lastDay = new Date(y, m, 0).getDate();
  const d = Math.min(day, lastDay);
  const dateStr = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}T12:00:00.000Z`;
  const t = await createTransfer(userId, {
    fromAccountId: pt.fromAccountId,
    toAccountId: pt.toAccountId,
    amount: pt.amount,
    description: pt.description || undefined,
    periodicTransferId: pt.id,
  });
  await query('UPDATE transfers SET date = $1 WHERE id = $2 AND user_id = $3', [dateStr, t.id, userId]);
  return { ...t, date: dateStr };
}

export async function deleteTransfer(userId, id) {
  const t = await getTransfer(userId, id);
  if (!t) return false;
  await query('UPDATE accounts SET balance = balance + $1 WHERE id = $2 AND user_id = $3', [t.amount, t.fromAccountId, userId]);
  await query('UPDATE accounts SET balance = balance - $1 WHERE id = $2 AND user_id = $3', [t.amount, t.toAccountId, userId]);
  const { rowCount } = await query('DELETE FROM transfers WHERE id = $1 AND user_id = $2', [id, userId]);
  return rowCount > 0;
}

// --- App settings (key-value por usuario) ---
export async function getAppSettings(userId) {
  const { rows } = await query('SELECT key, value FROM app_settings WHERE user_id = $1', [userId]);
  const out = {};
  for (const row of rows) {
    try {
      out[row.key] = JSON.parse(row.value ?? 'null');
    } catch {
      out[row.key] = row.value;
    }
  }
  return out;
}

export async function updateAppSettings(userId, patch) {
  if (!patch || typeof patch !== 'object') return getAppSettings(userId);
  for (const [key, value] of Object.entries(patch)) {
    const val = JSON.stringify(value === undefined ? null : value);
    await query(
      'INSERT INTO app_settings (user_id, key, value) VALUES ($1, $2, $3) ON CONFLICT (user_id, key) DO UPDATE SET value = $3',
      [userId, key, val]
    );
  }
  return getAppSettings(userId);
}

// --- Crypto: holdings, price cache (CoinGecko), daily close ---
const COINGECKO_BASE = 'https://api.coingecko.com/api/v3';
const COINGECKO_MIN_MS = 60 * 1000; // no llamar más de 1 vez por minuto para respetar rate limit

function rowCryptoHolding(r) {
  if (!r) return null;
  const amountInvested = Number(r.amount_invested);
  const priceBought = Number(r.price_bought);
  return {
    id: r.id,
    symbol: r.symbol,
    amountInvested,
    priceBought,
    amountCoins: priceBought > 0 ? amountInvested / priceBought : 0,
    currency: r.currency || 'EUR',
    createdAt: r.created_at instanceof Date ? r.created_at.toISOString() : r.created_at,
  };
}

export async function getCryptoHoldings(userId) {
  const { rows } = await query(
    'SELECT id, symbol, amount_invested, price_bought, currency, created_at FROM crypto_holdings WHERE user_id = $1 ORDER BY id',
    [userId]
  );
  return rows.map(rowCryptoHolding);
}

export async function getCryptoHolding(userId, id) {
  const { rows } = await query(
    'SELECT id, symbol, amount_invested, price_bought, currency, created_at FROM crypto_holdings WHERE id = $1 AND user_id = $2',
    [id, userId]
  );
  return rowCryptoHolding(rows[0]);
}

function cryptoCurrency(currency) {
  if (currency === 'USD' || currency === 'USDT') return currency;
  return 'EUR';
}

export async function createCryptoHolding(userId, { symbol, amountInvested, priceBought, currency = 'EUR' }) {
  const curr = cryptoCurrency(currency);
  const { rows } = await query(
    'INSERT INTO crypto_holdings (user_id, symbol, amount_invested, price_bought, currency) VALUES ($1, $2, $3, $4, $5) RETURNING id, symbol, amount_invested, price_bought, currency, created_at',
    [userId, String(symbol).trim().toLowerCase(), Number(amountInvested) || 0, Number(priceBought) || 0, curr]
  );
  return rowCryptoHolding(rows[0]);
}

export async function updateCryptoHolding(userId, id, { symbol, amountInvested, priceBought, currency }) {
  const updates = [];
  const params = [];
  let n = 1;
  if (symbol !== undefined) {
    updates.push(`symbol = $${n++}`);
    params.push(String(symbol).trim().toLowerCase());
  }
  if (amountInvested !== undefined) {
    updates.push(`amount_invested = $${n++}`);
    params.push(Number(amountInvested) || 0);
  }
  if (priceBought !== undefined) {
    updates.push(`price_bought = $${n++}`);
    params.push(Number(priceBought) || 0);
  }
  if (currency !== undefined) {
    updates.push(`currency = $${n++}`);
    params.push(cryptoCurrency(currency));
  }
  if (updates.length === 0) return getCryptoHolding(userId, id);
  params.push(id, userId);
  const { rows } = await query(
    `UPDATE crypto_holdings SET ${updates.join(', ')} WHERE id = $${n} AND user_id = $${n + 1} RETURNING id, symbol, amount_invested, price_bought, currency, created_at`,
    params
  );
  return rowCryptoHolding(rows[0]);
}

export async function deleteCryptoHolding(userId, id) {
  const { rowCount } = await query('DELETE FROM crypto_holdings WHERE id = $1 AND user_id = $2', [id, userId]);
  return rowCount > 0;
}

export async function getCryptoPriceCache(symbols) {
  if (!symbols || symbols.length === 0) return {};
  const { rows } = await query(
    'SELECT symbol, price_eur, price_usd, updated_at FROM crypto_price_cache WHERE symbol = ANY($1)',
    [symbols]
  );
  const out = {};
  for (const r of rows) {
    out[r.symbol] = {
      priceEur: Number(r.price_eur),
      priceUsd: Number(r.price_usd),
      updatedAt: r.updated_at instanceof Date ? r.updated_at.toISOString() : r.updated_at,
    };
  }
  return out;
}

export async function saveCryptoPriceCache(symbol, priceEur, priceUsd) {
  await query(
    `INSERT INTO crypto_price_cache (symbol, price_eur, price_usd, updated_at) VALUES ($1, $2, $3, NOW())
     ON CONFLICT (symbol) DO UPDATE SET price_eur = $2, price_usd = $3, updated_at = NOW()`,
    [symbol, Number(priceEur), Number(priceUsd)]
  );
}

/** Llama a CoinGecko; si rate limit (429) o error, devuelve null y usamos caché. */
export async function fetchCryptoPricesFromApi(symbols) {
  if (!symbols || symbols.length === 0) return {};
  const ids = [...new Set(symbols.map((s) => String(s).trim().toLowerCase()))];
  const url = `${COINGECKO_BASE}/simple/price?ids=${ids.join(',')}&vs_currencies=eur,usd`;
  try {
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    if (res.status === 429) return null;
    if (!res.ok) return null;
    const data = await res.json();
    const out = {};
    for (const [id, prices] of Object.entries(data)) {
      if (prices && typeof prices.eur === 'number' && typeof prices.usd === 'number') {
        out[id] = { priceEur: prices.eur, priceUsd: prices.usd };
      }
    }
    return out;
  } catch {
    return null;
  }
}

/** Obtiene precios: intenta API y actualiza caché; si falla, devuelve caché. */
export async function getCryptoPrices(symbols) {
  if (!symbols || symbols.length === 0) return {};
  const fromApi = await fetchCryptoPricesFromApi(symbols);
  if (fromApi && Object.keys(fromApi).length > 0) {
    for (const [sym, p] of Object.entries(fromApi)) {
      await saveCryptoPriceCache(sym, p.priceEur, p.priceUsd);
    }
    return fromApi;
  }
  const fromCache = await getCryptoPriceCache(symbols);
  return Object.fromEntries(
    Object.entries(fromCache).map(([k, v]) => [k, { priceEur: v.priceEur, priceUsd: v.priceUsd }])
  );
}

/** Cierre diario por usuario: se ejecuta a 00:00. Inserta fila con la fecha del día que acaba de terminar (ayer). */
export async function runCryptoDailyClose(userId) {
  const holdings = await getCryptoHoldings(userId);
  if (holdings.length === 0) return { inserted: false, reason: 'no_holdings' };
  const symbols = [...new Set(holdings.map((h) => h.symbol))];
  const prices = await getCryptoPrices(symbols);
  const settings = await getAppSettings(userId);
  const rate = Number(settings.exchangeRateUsdToEur) || 0.92;

  let totalEur = 0;
  let totalUsd = 0;
  for (const h of holdings) {
    const p = prices[h.symbol];
    if (p) {
      const coins = h.amountCoins;
      totalEur += coins * p.priceEur;
      totalUsd += coins * p.priceUsd;
    }
  }
  const now = new Date();
  const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  const dateStr = yesterday.toISOString().slice(0, 10);
  const prev = await query(
    'SELECT total_value_eur, total_value_usd FROM crypto_daily_close WHERE user_id = $1 AND date < $2 ORDER BY date DESC LIMIT 1',
    [userId, dateStr]
  );
  const prevEur = prev.rows[0] ? Number(prev.rows[0].total_value_eur) : 0;
  const prevUsd = prev.rows[0] ? Number(prev.rows[0].total_value_usd) : 0;
  const gainLossEur = totalEur - prevEur;
  const gainLossUsd = totalUsd - prevUsd;
  await query(
    `INSERT INTO crypto_daily_close (user_id, date, total_value_eur, total_value_usd, gain_loss_eur, gain_loss_usd)
     VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (user_id, date) DO UPDATE SET
     total_value_eur = $3, total_value_usd = $4, gain_loss_eur = $5, gain_loss_usd = $6`,
    [userId, dateStr, totalEur, totalUsd, gainLossEur, gainLossUsd]
  );

  for (const h of holdings) {
    const p = prices[h.symbol];
    const currentEur = p ? h.amountCoins * p.priceEur : 0;
    const currentUsd = p ? h.amountCoins * p.priceUsd : 0;
    const investedEur = h.currency === 'EUR' ? h.amountInvested : h.amountInvested * rate;
    const investedUsd = h.currency === 'EUR' ? h.amountInvested / rate : h.amountInvested;
    const glEur = currentEur - investedEur;
    const glUsd = currentUsd - investedUsd;
    await query(
      `INSERT INTO crypto_holding_daily (holding_id, date, gain_loss_eur, gain_loss_usd)
       VALUES ($1, $2, $3, $4) ON CONFLICT (holding_id, date) DO UPDATE SET gain_loss_eur = $3, gain_loss_usd = $4`,
      [h.id, dateStr, glEur, glUsd]
    );
  }

  return { inserted: true, date: dateStr, totalEur, totalUsd, gainLossEur, gainLossUsd };
}

export async function getCryptoDailyCloseByDate(userId, dateStr) {
  const { rows } = await query('SELECT date FROM crypto_daily_close WHERE user_id = $1 AND date = $2', [userId, dateStr]);
  return rows[0] || null;
}

/** Historial diario de G/P por holding. Devuelve cierres ordenados por fecha DESC; G/P del día = cierre - cierre anterior. */
export async function getCryptoHoldingDailyHistory(holdingId, year, month) {
  let sql = 'SELECT date, gain_loss_eur, gain_loss_usd FROM crypto_holding_daily WHERE holding_id = $1';
  const params = [holdingId];
  if (year != null && month != null) {
    sql += ' AND EXTRACT(YEAR FROM date) = $2 AND EXTRACT(MONTH FROM date) = $3';
    params.push(year, month);
  } else if (year != null) {
    sql += ' AND EXTRACT(YEAR FROM date) = $2';
    params.push(year);
  }
  sql += ' ORDER BY date ASC';
  const { rows } = await query(sql, params.length > 1 ? params : [holdingId]);
  const list = rows.map((r) => ({
    date: r.date instanceof Date ? r.date.toISOString().slice(0, 10) : r.date,
    gainLossEur: Number(r.gain_loss_eur),
    gainLossUsd: Number(r.gain_loss_usd),
  }));
  for (let i = list.length - 1; i >= 0; i--) {
    const prev = i > 0 ? list[i - 1] : null;
    list[i].dailyEur = prev != null ? list[i].gainLossEur - prev.gainLossEur : list[i].gainLossEur;
    list[i].dailyUsd = prev != null ? list[i].gainLossUsd - prev.gainLossUsd : list[i].gainLossUsd;
  }
  return list.reverse();
}

export async function getCryptoDailyCloseHistory(userId, year, month) {
  let sql = 'SELECT date, total_value_eur, total_value_usd, gain_loss_eur, gain_loss_usd FROM crypto_daily_close WHERE user_id = $1';
  const params = [userId];
  let n = 2;
  if (year != null && month != null) {
    sql += ` AND EXTRACT(YEAR FROM date) = $${n++} AND EXTRACT(MONTH FROM date) = $${n++}`;
    params.push(year, month);
  } else if (year != null) {
    sql += ` AND EXTRACT(YEAR FROM date) = $${n++}`;
    params.push(year);
  }
  sql += ' ORDER BY date DESC';
  const { rows } = await query(sql, params);
  return rows.map((r) => ({
    date: r.date instanceof Date ? r.date.toISOString().slice(0, 10) : r.date,
    totalValueEur: Number(r.total_value_eur),
    totalValueUsd: Number(r.total_value_usd),
    gainLossEur: Number(r.gain_loss_eur),
    gainLossUsd: Number(r.gain_loss_usd),
  }));
}

/** True si hay al menos una posición en crypto para el usuario (para mostrar menú). */
export async function hasCryptoHoldings(userId) {
  const { rows } = await query('SELECT 1 FROM crypto_holdings WHERE user_id = $1 LIMIT 1', [userId]);
  return (rows?.length ?? 0) > 0;
}

// --- Stocks / Acciones (ETFs, acciones; precios vía Yahoo Finance chart API) ---

function rowStockHolding(r) {
  if (!r) return null;
  const amountInvested = Number(r.amount_invested);
  const priceBought = Number(r.price_bought);
  return {
    id: r.id,
    symbol: String(r.symbol).toUpperCase(),
    amountInvested,
    priceBought,
    amountShares: priceBought > 0 ? amountInvested / priceBought : 0,
    currency: r.currency || 'USD',
    createdAt: r.created_at instanceof Date ? r.created_at.toISOString() : r.created_at,
  };
}

export async function getStockHoldings(userId) {
  const { rows } = await query(
    'SELECT id, symbol, amount_invested, price_bought, currency, created_at FROM stock_holdings WHERE user_id = $1 ORDER BY id',
    [userId]
  );
  return rows.map(rowStockHolding);
}

export async function getStockHolding(userId, id) {
  const { rows } = await query(
    'SELECT id, symbol, amount_invested, price_bought, currency, created_at FROM stock_holdings WHERE id = $1 AND user_id = $2',
    [id, userId]
  );
  return rowStockHolding(rows[0]);
}

function stockCurrency(currency) {
  if (currency === 'USD' || currency === 'USDT' || currency === 'EUR') return currency;
  return 'USD';
}

export async function createStockHolding({ symbol, amountInvested, priceBought, currency = 'USD' }) {
  const curr = stockCurrency(currency);
  const { rows } = await query(
    'INSERT INTO stock_holdings (symbol, amount_invested, price_bought, currency) VALUES ($1, $2, $3, $4) RETURNING id, symbol, amount_invested, price_bought, currency, created_at',
    [String(symbol).trim().toUpperCase(), Number(amountInvested) || 0, Number(priceBought) || 0, curr]
  );
  return rowStockHolding(rows[0]);
}

export async function updateStockHolding(id, { symbol, amountInvested, priceBought, currency }) {
  const updates = [];
  const params = [];
  let n = 1;
  if (symbol !== undefined) {
    updates.push(`symbol = $${n++}`);
    params.push(String(symbol).trim().toUpperCase());
  }
  if (amountInvested !== undefined) {
    updates.push(`amount_invested = $${n++}`);
    params.push(Number(amountInvested) || 0);
  }
  if (priceBought !== undefined) {
    updates.push(`price_bought = $${n++}`);
    params.push(Number(priceBought) || 0);
  }
  if (currency !== undefined) {
    updates.push(`currency = $${n++}`);
    params.push(stockCurrency(currency));
  }
  if (updates.length === 0) return getStockHolding(id);
  params.push(id);
  const { rows } = await query(
    `UPDATE stock_holdings SET ${updates.join(', ')} WHERE id = $${n} RETURNING id, symbol, amount_invested, price_bought, currency, created_at`,
    params
  );
  return rowStockHolding(rows[0]);
}

export async function deleteStockHolding(id) {
  const { rowCount } = await query('DELETE FROM stock_holdings WHERE id = $1', [id]);
  return rowCount > 0;
}

export async function getStockPriceCache(symbols) {
  if (!symbols || symbols.length === 0) return {};
  const { rows } = await query(
    'SELECT symbol, price_usd, price_eur, updated_at FROM stock_price_cache WHERE symbol = ANY($1)',
    [symbols]
  );
  const out = {};
  for (const r of rows) {
    out[r.symbol] = {
      priceUsd: Number(r.price_usd),
      priceEur: Number(r.price_eur),
      updatedAt: r.updated_at instanceof Date ? r.updated_at.toISOString() : r.updated_at,
    };
  }
  return out;
}

export async function saveStockPriceCache(symbol, priceUsd, priceEur) {
  await query(
    `INSERT INTO stock_price_cache (symbol, price_usd, price_eur, updated_at) VALUES ($1, $2, $3, NOW())
     ON CONFLICT (symbol) DO UPDATE SET price_usd = $2, price_eur = $3, updated_at = NOW()`,
    [symbol, Number(priceUsd), Number(priceEur)]
  );
}

/** Yahoo Finance chart API (precio actual en USD). Sin API key. */
export async function fetchStockPriceFromApi(symbol) {
  const sym = String(symbol).trim().toUpperCase();
  if (!sym) return null;
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?interval=1d&range=1d`;
  try {
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!res.ok) return null;
    const data = await res.json();
    const result = data?.chart?.result?.[0];
    const price = result?.meta?.regularMarketPrice ?? result?.meta?.previousClose ?? null;
    if (price == null || typeof price !== 'number') return null;
    return { priceUsd: price, priceEur: price * 0.92 };
  } catch {
    return null;
  }
}

export async function getStockPrices(symbols, userId = null) {
  if (!symbols || symbols.length === 0) return {};
  const unique = [...new Set(symbols.map((s) => String(s).trim().toUpperCase()).filter(Boolean))];
  const out = {};
  const rate = userId != null ? Number((await getAppSettings(userId)).exchangeRateUsdToEur) || 0.92 : 0.92;
  for (const sym of unique) {
    const fromApi = await fetchStockPriceFromApi(sym);
    if (fromApi) {
      const priceEur = fromApi.priceUsd * rate;
      await saveStockPriceCache(sym, fromApi.priceUsd, priceEur);
      out[sym] = { priceUsd: fromApi.priceUsd, priceEur };
    } else {
      const cache = await getStockPriceCache([sym]);
      if (cache[sym]) out[sym] = { priceUsd: cache[sym].priceUsd, priceEur: cache[sym].priceEur };
    }
  }
  return out;
}

export async function hasStockHoldings(userId) {
  const { rows } = await query('SELECT 1 FROM stock_holdings WHERE user_id = $1 LIMIT 1', [userId]);
  return (rows?.length ?? 0) > 0;
}
