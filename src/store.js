import { query } from './db.js';

function rowAccount(r) {
  return r ? { id: r.id, name: r.name, balance: Number(r.balance) } : null;
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
      }
    : null;
}
function rowQuickTemplate(r) {
  return r ? { id: r.id, type: r.type, name: r.name, icon: r.icon || '📁', categoryId: r.category_id, amount: Number(r.amount), accountId: r.account_id, showInQuick: r.show_in_quick } : null;
}

// --- Accounts ---
export async function getAccounts() {
  const { rows } = await query('SELECT id, name, balance FROM accounts ORDER BY id');
  return rows.map(rowAccount);
}

export async function getAccount(id) {
  const { rows } = await query('SELECT id, name, balance FROM accounts WHERE id = $1', [id]);
  return rowAccount(rows[0]);
}

export async function createAccount({ name, balance = 0 }) {
  const { rows } = await query(
    'INSERT INTO accounts (name, balance) VALUES ($1, $2) RETURNING id, name, balance',
    [name.trim(), Number(balance) || 0]
  );
  return rowAccount(rows[0]);
}

export async function updateAccount(id, { name, balance }) {
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
  if (updates.length === 0) return getAccount(id);
  params.push(id);
  const { rows } = await query(
    `UPDATE accounts SET ${updates.join(', ')} WHERE id = $${n} RETURNING id, name, balance`,
    params
  );
  return rowAccount(rows[0]);
}

export async function deleteAccount(id) {
  const { rowCount } = await query('DELETE FROM accounts WHERE id = $1', [id]);
  return rowCount > 0;
}

// --- Categories ---
export async function getCategories() {
  const { rows } = await query('SELECT id, name, icon FROM categories ORDER BY id');
  return rows.map(rowCategory);
}

export async function getCategory(id) {
  const { rows } = await query('SELECT id, name, icon FROM categories WHERE id = $1', [id]);
  return rowCategory(rows[0]);
}

export async function createCategory({ name, icon = '📁' }) {
  const { rows } = await query(
    'INSERT INTO categories (name, icon) VALUES ($1, $2) RETURNING id, name, icon',
    [name.trim(), String(icon).trim() || '📁']
  );
  return rowCategory(rows[0]);
}

export async function updateCategory(id, { name, icon }) {
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
  if (updates.length === 0) return getCategory(id);
  params.push(id);
  const { rows } = await query(
    `UPDATE categories SET ${updates.join(', ')} WHERE id = $${n} RETURNING id, name, icon`,
    params
  );
  return rowCategory(rows[0]);
}

export async function deleteCategory(id) {
  const { rowCount } = await query('DELETE FROM categories WHERE id = $1', [id]);
  return rowCount > 0;
}

// --- Transactions ---
export async function getTransactions() {
  const { rows } = await query(
    'SELECT id, name, category_id, amount, account_id, type, income_type, expense_type, date FROM transactions ORDER BY date DESC'
  );
  return rows.map(rowTransaction);
}

export async function getTransaction(id) {
  const { rows } = await query(
    'SELECT id, name, category_id, amount, account_id, type, income_type, expense_type, date FROM transactions WHERE id = $1',
    [id]
  );
  return rowTransaction(rows[0]);
}

export async function getTransactionsGrouped(month, year) {
  const categories = await getCategories();
  let sql = `
    SELECT id, name, category_id, amount, account_id, type, income_type, expense_type, date
    FROM transactions
  `;
  const params = [];
  if (month != null && year != null) {
    sql += ` WHERE EXTRACT(MONTH FROM date AT TIME ZONE 'UTC') = $1 AND EXTRACT(YEAR FROM date AT TIME ZONE 'UTC') = $2`;
    params.push(month, year);
  }
  sql += ' ORDER BY date DESC';
  const { rows } = await query(sql, params.length ? params : undefined);
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
export async function getExpensesByCategory(month, year) {
  const m = month != null ? Number(month) : new Date().getMonth() + 1;
  const y = year != null ? Number(year) : new Date().getFullYear();
  const { rows } = await query(
    `SELECT
       t.category_id AS category_id,
       COALESCE(c.name, 'Sin categoría') AS category_name,
       COALESCE(c.icon, '📁') AS category_icon,
       SUM(t.amount) AS total
     FROM transactions t
     LEFT JOIN categories c ON c.id = t.category_id
     WHERE t.type = 'expense'
       AND EXTRACT(MONTH FROM t.date AT TIME ZONE 'UTC') = $1
       AND EXTRACT(YEAR FROM t.date AT TIME ZONE 'UTC') = $2
     GROUP BY t.category_id, c.name, c.icon
     ORDER BY total DESC`,
    [m, y]
  );
  return rows.map((r) => ({
    categoryId: r.category_id,
    categoryName: r.category_name,
    categoryIcon: r.category_icon,
    total: Number(r.total),
  }));
}

export async function getMonthlySummary(year) {
  const y = year != null ? Number(year) : new Date().getFullYear();
  const { rows } = await query(
    `SELECT
       EXTRACT(MONTH FROM date AT TIME ZONE 'UTC')::int AS month,
       SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) AS income,
       SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) AS expense
     FROM transactions
     WHERE EXTRACT(YEAR FROM date AT TIME ZONE 'UTC') = $1
     GROUP BY EXTRACT(MONTH FROM date AT TIME ZONE 'UTC')
     ORDER BY month`,
    [y]
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

export async function createTransaction({ name, categoryId, amount, accountId, type, incomeType, expenseType, date }) {
  const dateVal = date ? new Date(date).toISOString().split('T')[0] + 'T12:00:00.000Z' : new Date().toISOString();
  const incomeTypeVal = type === 'income' ? (incomeType ?? null) : null;
  const expenseTypeVal = type === 'expense' ? (expenseType ?? null) : null;
  const { rows } = await query(
    `INSERT INTO transactions (name, category_id, amount, account_id, type, income_type, expense_type, date)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING id, name, category_id, amount, account_id, type, income_type, expense_type, date`,
    [name.trim(), categoryId != null ? categoryId : null, amount, accountId, type, incomeTypeVal, expenseTypeVal, dateVal]
  );
  const tx = rowTransaction(rows[0]);
  const delta = type === 'expense' ? -Number(amount) : Number(amount);
  await query('UPDATE accounts SET balance = balance + $1 WHERE id = $2', [delta, accountId]);
  return tx;
}

export async function updateTransaction(id, { name, categoryId, amount, accountId, type, incomeType, expenseType, date }) {
  const old = await getTransaction(id);
  if (!old) return null;
  const prevDelta = old.type === 'expense' ? old.amount : -old.amount;
  await query('UPDATE accounts SET balance = balance + $1 WHERE id = $2', [prevDelta, old.accountId]);
  const newAmount = amount !== undefined ? Number(amount) : old.amount;
  const newAccountId = accountId !== undefined ? accountId : old.accountId;
  const newType = type || old.type;
  const newIncomeType = incomeType !== undefined ? incomeType : old.incomeType;
  const newExpenseType = expenseType !== undefined ? expenseType : old.expenseType;
  const newDate = date ? new Date(date).toISOString() : old.date;
  const { rows } = await query(
    `UPDATE transactions SET name = COALESCE($2, name), category_id = $3, amount = $4, account_id = $5, type = $6, income_type = $7, expense_type = $8, "date" = $9
     WHERE id = $1 RETURNING id, name, category_id, amount, account_id, type, income_type, expense_type, date`,
    [id, name !== undefined ? name.trim() : null, categoryId !== undefined ? categoryId : null, newAmount, newAccountId, newType, newType === 'income' ? newIncomeType : null, newType === 'expense' ? newExpenseType : null, newDate]
  );
  if (!rows[0]) return null;
  const tx = rowTransaction(rows[0]);
  const newDelta = newType === 'expense' ? -newAmount : newAmount;
  await query('UPDATE accounts SET balance = balance + $1 WHERE id = $2', [newDelta, newAccountId]);
  return tx;
}

export async function deleteTransaction(id) {
  const tx = await getTransaction(id);
  if (!tx) return false;
  const delta = tx.type === 'expense' ? tx.amount : -tx.amount;
  await query('UPDATE accounts SET balance = balance + $1 WHERE id = $2', [delta, tx.accountId]);
  const { rowCount } = await query('DELETE FROM transactions WHERE id = $1', [id]);
  return rowCount > 0;
}

// --- Fixed incomes ---
export async function getFixedIncomes() {
  const { rows } = await query('SELECT id, name, category_id, amount, account_id, day_of_month FROM fixed_incomes ORDER BY id');
  return rows.map(rowFixedIncome);
}

export async function getFixedIncome(id) {
  const { rows } = await query('SELECT id, name, category_id, amount, account_id, day_of_month FROM fixed_incomes WHERE id = $1', [id]);
  return rowFixedIncome(rows[0]);
}

function dateForDayOfMonth(year, month, day) {
  const lastDay = new Date(year, month, 0).getDate();
  const d = Math.min(day, lastDay);
  return `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}T12:00:00.000Z`;
}

export async function createFixedIncome({ name, categoryId, amount, accountId, dayOfMonth = 1 }) {
  const day = Math.min(31, Math.max(1, Number(dayOfMonth) || 1));
  const { rows } = await query(
    'INSERT INTO fixed_incomes (name, category_id, amount, account_id, day_of_month) VALUES ($1, $2, $3, $4, $5) RETURNING id, name, category_id, amount, account_id, day_of_month',
    [name.trim(), categoryId != null ? categoryId : null, Number(amount), accountId, day]
  );
  return rowFixedIncome(rows[0]);
}

export async function updateFixedIncome(id, { name, categoryId, amount, accountId, dayOfMonth }) {
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
  if (updates.length === 0) return getFixedIncome(id);
  params.push(id);
  const { rows } = await query(
    `UPDATE fixed_incomes SET ${updates.join(', ')} WHERE id = $${n} RETURNING id, name, category_id, amount, account_id, day_of_month`,
    params
  );
  return rowFixedIncome(rows[0]);
}

export async function deleteFixedIncome(id) {
  const { rowCount } = await query('DELETE FROM fixed_incomes WHERE id = $1', [id]);
  return rowCount > 0;
}

/** Aplica ingresos fijos para un mes. Si day (1-31) se indica, solo aplica los que tienen day_of_month === day (para el job diario). */
export async function applyFixedIncomesForMonth(month, year, dayFilter = null) {
  let fixedList = await getFixedIncomes();
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
    `SELECT name FROM transactions WHERE type = 'income' AND income_type = 'fixed' AND date >= $1 AND date < $2`,
    [`${y}-${String(m).padStart(2, '0')}-01`, endDate]
  );
  const existingNames = new Set(existing.rows.map((r) => r.name));
  const created = [];
  for (const fi of fixedList) {
    if (existingNames.has(fi.name)) continue;
    const day = fi.dayOfMonth != null ? fi.dayOfMonth : 1;
    const dateStr = dateForDayOfMonth(y, m, day);
    const tx = await createTransaction({
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

/** Aplica un solo ingreso fijo por id para el mes/año indicado. Devuelve la transacción creada o null si ya existía en el mes. */
export async function applySingleFixedIncome(id, month, year) {
  const fi = await getFixedIncome(id);
  if (!fi) return null;
  const m = month != null ? Number(month) : new Date().getMonth() + 1;
  const y = year != null ? Number(year) : new Date().getFullYear();
  const nextMonth = m === 12 ? 1 : m + 1;
  const nextYear = m === 12 ? y + 1 : y;
  const endDate = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`;
  const existing = await query(
    `SELECT id FROM transactions WHERE type = 'income' AND income_type = 'fixed' AND name = $1 AND date >= $2 AND date < $3`,
    [fi.name, `${y}-${String(m).padStart(2, '0')}-01`, endDate]
  );
  if (existing.rows.length > 0) return null;
  const day = fi.dayOfMonth != null ? fi.dayOfMonth : 1;
  const dateStr = dateForDayOfMonth(y, m, day);
  return createTransaction({
    name: fi.name,
    categoryId: fi.categoryId,
    amount: fi.amount,
    accountId: fi.accountId,
    type: 'income',
    incomeType: 'fixed',
    date: dateStr,
  });
}

// --- Fixed expenses ---
export async function getFixedExpenses() {
  const { rows } = await query('SELECT id, name, category_id, amount, account_id, day_of_month FROM fixed_expenses ORDER BY id');
  return rows.map(rowFixedExpense);
}

export async function getFixedExpense(id) {
  const { rows } = await query('SELECT id, name, category_id, amount, account_id, day_of_month FROM fixed_expenses WHERE id = $1', [id]);
  return rowFixedExpense(rows[0]);
}

export async function createFixedExpense({ name, categoryId, amount, accountId, dayOfMonth = 1 }) {
  const day = Math.min(31, Math.max(1, Number(dayOfMonth) || 1));
  const { rows } = await query(
    'INSERT INTO fixed_expenses (name, category_id, amount, account_id, day_of_month) VALUES ($1, $2, $3, $4, $5) RETURNING id, name, category_id, amount, account_id, day_of_month',
    [name.trim(), categoryId != null ? categoryId : null, Number(amount), accountId, day]
  );
  return rowFixedExpense(rows[0]);
}

export async function updateFixedExpense(id, { name, categoryId, amount, accountId, dayOfMonth }) {
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
  if (updates.length === 0) return getFixedExpense(id);
  params.push(id);
  const { rows } = await query(
    `UPDATE fixed_expenses SET ${updates.join(', ')} WHERE id = $${n} RETURNING id, name, category_id, amount, account_id, day_of_month`,
    params
  );
  return rowFixedExpense(rows[0]);
}

export async function deleteFixedExpense(id) {
  const { rowCount } = await query('DELETE FROM fixed_expenses WHERE id = $1', [id]);
  return rowCount > 0;
}

/** Aplica gastos fijos para un mes. Si day (1-31) se indica, solo aplica los que tienen day_of_month === day (para el job diario). */
export async function applyFixedExpensesForMonth(month, year, dayFilter = null) {
  let fixedList = await getFixedExpenses();
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
    `SELECT name FROM transactions WHERE type = 'expense' AND expense_type = 'fixed' AND date >= $1 AND date < $2`,
    [`${y}-${String(m).padStart(2, '0')}-01`, endDate]
  );
  const existingNames = new Set(existing.rows.map((r) => r.name));
  const created = [];
  for (const fe of fixedList) {
    if (existingNames.has(fe.name)) continue;
    const day = fe.dayOfMonth != null ? fe.dayOfMonth : 1;
    const dateStr = dateForDayOfMonth(y, m, day);
    const tx = await createTransaction({
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

/** Aplica un solo gasto fijo por id para el mes/año indicado. Devuelve la transacción creada o null si ya existía en el mes. */
export async function applySingleFixedExpense(id, month, year) {
  const fe = await getFixedExpense(id);
  if (!fe) return null;
  const m = month != null ? Number(month) : new Date().getMonth() + 1;
  const y = year != null ? Number(year) : new Date().getFullYear();
  const nextMonth = m === 12 ? 1 : m + 1;
  const nextYear = m === 12 ? y + 1 : y;
  const endDate = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`;
  const existing = await query(
    `SELECT id FROM transactions WHERE type = 'expense' AND expense_type = 'fixed' AND name = $1 AND date >= $2 AND date < $3`,
    [fe.name, `${y}-${String(m).padStart(2, '0')}-01`, endDate]
  );
  if (existing.rows.length > 0) return null;
  const day = fe.dayOfMonth != null ? fe.dayOfMonth : 1;
  const dateStr = dateForDayOfMonth(y, m, day);
  return createTransaction({
    name: fe.name,
    categoryId: fe.categoryId,
    amount: fe.amount,
    accountId: fe.accountId,
    type: 'expense',
    expenseType: 'fixed',
    date: dateStr,
  });
}

// --- Quick templates (plantillas rápidas: solo las con show_in_quick aparecen como botón) ---
export async function getQuickTemplates({ type, showInQuick } = {}) {
  let sql = 'SELECT id, type, name, icon, category_id, amount, account_id, show_in_quick FROM quick_templates WHERE 1=1';
  const params = [];
  let n = 1;
  if (type) {
    sql += ` AND type = $${n++}`;
    params.push(type);
  }
  if (showInQuick !== undefined) {
    sql += ` AND show_in_quick = $${n++}`;
    params.push(!!showInQuick);
  }
  sql += ' ORDER BY name';
  const { rows } = await query(sql, params.length ? params : undefined);
  return rows.map(rowQuickTemplate);
}

export async function getQuickTemplate(id) {
  const { rows } = await query('SELECT id, type, name, icon, category_id, amount, account_id, show_in_quick FROM quick_templates WHERE id = $1', [id]);
  return rowQuickTemplate(rows[0]);
}

export async function createQuickTemplate({ type, name, icon = '📁', categoryId, amount, accountId, showInQuick = true }) {
  const iconVal = (icon && String(icon).trim()) ? String(icon).trim().slice(0, 50) : '📁';
  const { rows } = await query(
    'INSERT INTO quick_templates (type, name, icon, category_id, amount, account_id, show_in_quick) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id, type, name, icon, category_id, amount, account_id, show_in_quick',
    [type, name.trim(), iconVal, categoryId != null ? categoryId : null, Number(amount), accountId, !!showInQuick]
  );
  return rowQuickTemplate(rows[0]);
}

export async function updateQuickTemplate(id, { name, icon, categoryId, amount, accountId, showInQuick }) {
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
  if (updates.length === 0) return getQuickTemplate(id);
  params.push(id);
  const { rows } = await query(
    `UPDATE quick_templates SET ${updates.join(', ')} WHERE id = $${n} RETURNING id, type, name, icon, category_id, amount, account_id, show_in_quick`,
    params
  );
  return rowQuickTemplate(rows[0]);
}

export async function deleteQuickTemplate(id) {
  const { rowCount } = await query('DELETE FROM quick_templates WHERE id = $1', [id]);
  return rowCount > 0;
}

// --- Transfers ---
export async function getTransfers() {
  const { rows } = await query(
    'SELECT id, from_account_id, to_account_id, amount, description, date FROM transfers ORDER BY date DESC'
  );
  return rows.map(rowTransfer);
}

export async function getTransfer(id) {
  const { rows } = await query(
    'SELECT id, from_account_id, to_account_id, amount, description, date FROM transfers WHERE id = $1',
    [id]
  );
  return rowTransfer(rows[0]);
}

export async function createTransfer({ fromAccountId, toAccountId, amount, description }) {
  const amt = Number(amount) || 0;
  const { rows } = await query(
    `INSERT INTO transfers (from_account_id, to_account_id, amount, description) VALUES ($1, $2, $3, $4)
     RETURNING id, from_account_id, to_account_id, amount, description, date`,
    [fromAccountId, toAccountId, amt, description ? description.trim() : null]
  );
  await query('UPDATE accounts SET balance = balance - $1 WHERE id = $2', [amt, fromAccountId]);
  await query('UPDATE accounts SET balance = balance + $1 WHERE id = $2', [amt, toAccountId]);
  return rowTransfer(rows[0]);
}

export async function deleteTransfer(id) {
  const t = await getTransfer(id);
  if (!t) return false;
  await query('UPDATE accounts SET balance = balance + $1 WHERE id = $2', [t.amount, t.fromAccountId]);
  await query('UPDATE accounts SET balance = balance - $1 WHERE id = $2', [t.amount, t.toAccountId]);
  const { rowCount } = await query('DELETE FROM transfers WHERE id = $1', [id]);
  return rowCount > 0;
}

// --- App settings (key-value, extensible) ---
export async function getAppSettings() {
  const { rows } = await query('SELECT key, value FROM app_settings');
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

export async function updateAppSettings(patch) {
  if (!patch || typeof patch !== 'object') return getAppSettings();
  for (const [key, value] of Object.entries(patch)) {
    const val = JSON.stringify(value === undefined ? null : value);
    await query(
      'INSERT INTO app_settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = $2',
      [key, val]
    );
  }
  return getAppSettings();
}
