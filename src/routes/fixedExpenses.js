import { Router } from 'express';
import * as store from '../store.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const list = await store.getFixedExpenses();
    res.json(list);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { name, categoryId, amount, accountId, dayOfMonth } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'El nombre es obligatorio' });
    const acc = await store.getAccount(Number(accountId));
    if (!acc) return res.status(400).json({ error: 'Cuenta no encontrada' });
    const amt = Number(amount) || 0;
    if (amt <= 0) return res.status(400).json({ error: 'El monto debe ser positivo' });
    const fixed = await store.createFixedExpense({
      name: name.trim(),
      categoryId: categoryId != null ? Number(categoryId) : null,
      amount: amt,
      accountId: Number(accountId),
      dayOfMonth: dayOfMonth != null ? Number(dayOfMonth) : 1,
    });
    res.status(201).json(fixed);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const existing = await store.getFixedExpense(id);
    if (!existing) return res.status(404).json({ error: 'Gasto fijo no encontrado' });
    const { name, categoryId, amount, accountId, dayOfMonth } = req.body;
    const fixed = await store.updateFixedExpense(id, {
      name: name !== undefined ? String(name).trim() : undefined,
      categoryId: categoryId !== undefined ? (categoryId == null ? null : Number(categoryId)) : undefined,
      amount: amount !== undefined ? Number(amount) : undefined,
      accountId: accountId !== undefined ? Number(accountId) : undefined,
      dayOfMonth: dayOfMonth !== undefined ? Number(dayOfMonth) : undefined,
    });
    res.json(fixed);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const deleted = await store.deleteFixedExpense(id);
    if (!deleted) return res.status(404).json({ error: 'Gasto fijo no encontrado' });
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/apply-month', async (req, res) => {
  try {
    const { month, year, day } = req.body;
    const now = new Date();
    const m = month != null ? Number(month) : now.getMonth() + 1;
    const y = year != null ? Number(year) : now.getFullYear();
    const dayFilter = day != null ? Number(day) : null;
    const created = await store.applyFixedExpensesForMonth(m, y, dayFilter);
    res.json({ applied: created.length, transactions: created });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/apply', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const existing = await store.getFixedExpense(id);
    if (!existing) return res.status(404).json({ error: 'Gasto fijo no encontrado' });
    const { month, year } = req.body;
    const tx = await store.applySingleFixedExpense(id, month, year);
    if (!tx) return res.status(400).json({ error: 'Este gasto fijo ya está aplicado en el mes indicado' });
    res.json({ applied: 1, transaction: tx });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
