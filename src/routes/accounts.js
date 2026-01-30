import { Router } from 'express';
import * as store from '../store.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const accounts = await store.getAccounts();
    res.json(accounts);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { name, balance = 0 } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'El nombre es obligatorio' });
    const account = await store.createAccount({ name: name.trim(), balance });
    res.status(201).json(account);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const account = await store.getAccount(id);
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
    const existing = await store.getAccount(id);
    if (!existing) return res.status(404).json({ error: 'Cuenta no encontrada' });
    const { name, balance } = req.body;
    const account = await store.updateAccount(id, { name, balance });
    res.json(account);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const deleted = await store.deleteAccount(id);
    if (!deleted) return res.status(404).json({ error: 'Cuenta no encontrada' });
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
