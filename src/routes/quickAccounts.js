// Cuentas rápidas: solo en la vista Cuentas rápida (independientes de cuentas bancarias)
import { Router } from 'express';
import * as store from '../store.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const list = await store.getQuickAccounts(req.userId);
    res.json(list);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { name, balance, currency } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'El nombre es obligatorio' });
    const account = await store.createQuickAccount(req.userId, {
      name: name.trim(),
      balance: balance != null ? Number(balance) : 0,
      currency: currency || 'EUR',
    });
    res.status(201).json(account);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const account = await store.getQuickAccount(req.userId, id);
    if (!account) return res.status(404).json({ error: 'Cuenta no encontrada' });
    res.json(account);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const existing = await store.getQuickAccount(req.userId, id);
    if (!existing) return res.status(404).json({ error: 'Cuenta no encontrada' });
    const { name, balance, currency } = req.body;
    const account = await store.updateQuickAccount(req.userId, id, {
      name: name !== undefined ? String(name).trim() : undefined,
      balance: balance !== undefined ? Number(balance) : undefined,
      currency: currency !== undefined ? (currency || 'EUR') : undefined,
    });
    res.json(account);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const deleted = await store.deleteQuickAccount(req.userId, id);
    if (!deleted) return res.status(404).json({ error: 'Cuenta no encontrada' });
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
