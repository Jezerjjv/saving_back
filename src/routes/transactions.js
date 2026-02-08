// (marcador cambios - borrar si quieres)
import { Router } from 'express';
import * as store from '../store.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const transactions = await store.getTransactions(req.userId);
    res.json(transactions);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/grouped', async (req, res) => {
  try {
    const { month, year } = req.query;
    const result = await store.getTransactionsGrouped(
      req.userId,
      month ? Number(month) : null,
      year ? Number(year) : null
    );
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/monthly-summary', async (req, res) => {
  try {
    const { year, accountId } = req.query;
    const result = await store.getMonthlySummary(
      req.userId,
      year ? Number(year) : null,
      accountId != null && accountId !== '' ? Number(accountId) : null
    );
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/daily-indicators', async (req, res) => {
  try {
    const { year, accountId } = req.query;
    const result = await store.getDailyIndicators( 
      req.userId,
      year ? Number(year) : null,
      accountId != null && accountId !== '' ? Number(accountId) : null
    );
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/expenses-by-category', async (req, res) => {
  try {
    const { month, year, accountId } = req.query;
    const result = await store.getExpensesByCategory(
      req.userId,
      month ? Number(month) : null,
      year ? Number(year) : null,
      accountId != null && accountId !== '' ? Number(accountId) : null
    );
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/incomes-by-category', async (req, res) => {
  try {
    const { month, year, accountId } = req.query;
    const result = await store.getIncomesByCategory(
      req.userId,
      month ? Number(month) : null,
      year ? Number(year) : null,
      accountId != null && accountId !== '' ? Number(accountId) : null
    );
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { name, categoryId, amount, accountId, type, incomeType, expenseType, date } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'El nombre es obligatorio' });
    if (type !== 'expense' && type !== 'income') return res.status(400).json({ error: 'type debe ser expense o income' });
    const acc = await store.getAccount(req.userId, Number(accountId));
    if (!acc) return res.status(400).json({ error: 'Cuenta no encontrada' });
    const amt = Number(amount) || 0;
    if (amt <= 0) return res.status(400).json({ error: 'El monto debe ser positivo' });
    const tx = await store.createTransaction(req.userId, {
      name: name.trim(),
      categoryId: categoryId != null ? Number(categoryId) : null,
      amount: amt,
      accountId: Number(accountId),
      type,
      incomeType: type === 'income' ? (incomeType ?? null) : undefined,
      expenseType: type === 'expense' ? (expenseType ?? null) : undefined,
      date,
    });
    res.status(201).json(tx);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const tx = await store.getTransaction(id);
    if (!tx) return res.status(404).json({ error: 'Transacción no encontrada' });
    res.json(tx);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const old = await store.getTransaction(req.userId, id);
    if (!old) return res.status(404).json({ error: 'Transacción no encontrada' });
    const { name, categoryId, amount, accountId, type, incomeType, expenseType, date } = req.body;
    const newAccountId = accountId !== undefined ? Number(accountId) : old.accountId;
    const newAcc = await store.getAccount(req.userId, newAccountId);
    if (!newAcc) return res.status(400).json({ error: 'Cuenta no encontrada' });
    const tx = await store.updateTransaction(req.userId, id, {
      name,
      categoryId: categoryId !== undefined ? (categoryId == null ? null : Number(categoryId)) : undefined,
      amount,
      accountId: accountId !== undefined ? Number(accountId) : undefined,
      type,
      incomeType,
      expenseType,
      date,
    });
    if (!tx) return res.status(500).json({ error: 'Error al actualizar' });
    res.json(tx);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const deleted = await store.deleteTransaction(req.userId, id);
    if (!deleted) return res.status(404).json({ error: 'Transacción no encontrada' });
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
