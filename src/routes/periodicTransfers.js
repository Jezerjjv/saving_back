import { Router } from 'express';
import * as store from '../store.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const list = await store.getPeriodicTransfers();
    res.json(list);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { fromAccountId, toAccountId, amount, description, dayOfMonth } = req.body;
    const fromId = Number(fromAccountId);
    const toId = Number(toAccountId);
    if (fromId === toId) return res.status(400).json({ error: 'Las cuentas deben ser distintas' });
    const fromAcc = await store.getAccount(fromId);
    const toAcc = await store.getAccount(toId);
    if (!fromAcc || !toAcc) return res.status(400).json({ error: 'Cuenta no encontrada' });
    const amt = Number(amount) || 0;
    if (amt <= 0) return res.status(400).json({ error: 'El monto debe ser positivo' });
    const pt = await store.createPeriodicTransfer({
      fromAccountId: fromId,
      toAccountId: toId,
      amount: amt,
      description: description?.trim() || null,
      dayOfMonth: dayOfMonth != null ? Number(dayOfMonth) : 1,
    });
    res.status(201).json(pt);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const existing = await store.getPeriodicTransfer(id);
    if (!existing) return res.status(404).json({ error: 'Transferencia periódica no encontrada' });
    const { fromAccountId, toAccountId, amount, description, dayOfMonth } = req.body;
    if (fromAccountId !== undefined && toAccountId !== undefined && Number(fromAccountId) === Number(toAccountId)) {
      return res.status(400).json({ error: 'Las cuentas deben ser distintas' });
    }
    const pt = await store.updatePeriodicTransfer(id, {
      fromAccountId: fromAccountId !== undefined ? Number(fromAccountId) : undefined,
      toAccountId: toAccountId !== undefined ? Number(toAccountId) : undefined,
      amount: amount !== undefined ? Number(amount) : undefined,
      description: description !== undefined ? (description?.trim() || null) : undefined,
      dayOfMonth: dayOfMonth !== undefined ? Number(dayOfMonth) : undefined,
    });
    res.json(pt);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const deleted = await store.deletePeriodicTransfer(id);
    if (!deleted) return res.status(404).json({ error: 'Transferencia periódica no encontrada' });
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/apply-month', async (req, res) => {
  try {
    const { month, year } = req.body;
    const now = new Date();
    const m = month != null ? Number(month) : now.getMonth() + 1;
    const y = year != null ? Number(year) : now.getFullYear();
    const created = await store.applyPeriodicTransfersForMonth(m, y);
    res.json({ applied: created.length, transfers: created });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/apply', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const existing = await store.getPeriodicTransfer(id);
    if (!existing) return res.status(404).json({ error: 'Transferencia periódica no encontrada' });
    const { month, year } = req.body;
    const now = new Date();
    const m = month != null ? Number(month) : now.getMonth() + 1;
    const y = year != null ? Number(year) : now.getFullYear();
    const t = await store.applySinglePeriodicTransfer(id, m, y);
    if (!t) return res.status(400).json({ error: 'Esta transferencia periódica ya está aplicada en el mes indicado' });
    res.json({ applied: 1, transfer: t });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
