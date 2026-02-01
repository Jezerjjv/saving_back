import { Router } from 'express';
import * as store from '../store.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const transfers = await store.getTransfers(req.userId);
    res.json(transfers);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { fromAccountId, toAccountId, amount, description } = req.body;
    const fromId = Number(fromAccountId);
    const toId = Number(toAccountId);
    if (fromId === toId) return res.status(400).json({ error: 'Origen y destino deben ser distintas' });
    const from = await store.getAccount(fromId);
    const to = await store.getAccount(toId);
    if (!from) return res.status(400).json({ error: 'Cuenta origen no encontrada' });
    if (!to) return res.status(400).json({ error: 'Cuenta destino no encontrada' });
    const amt = Number(amount) || 0;
    if (amt <= 0) return res.status(400).json({ error: 'El monto debe ser positivo' });
    if (from.balance < amt) return res.status(400).json({ error: 'Saldo insuficiente en la cuenta origen' });
    const transfer = await store.createTransfer({
      fromAccountId: fromId,
      toAccountId: toId,
      amount: amt,
      description: description ? String(description).trim() : null,
    });
    res.status(201).json(transfer);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const t = await store.getTransfer(req.userId, id);
    if (!t) return res.status(404).json({ error: 'Transferencia no encontrada' });
    res.json(t);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const deleted = await store.deleteTransfer(req.userId, id);
    if (!deleted) return res.status(404).json({ error: 'Transferencia no encontrada' });
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
