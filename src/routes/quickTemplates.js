// (marcador cambios - borrar si quieres)
import { Router } from 'express';
import * as store from '../store.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const { type, showInQuick } = req.query;
    const list = await store.getQuickTemplates(req.userId, {
      type: type || undefined,
      showInQuick: showInQuick === 'true' ? true : showInQuick === 'false' ? false : undefined,
    });
    res.json(list);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { type, name, icon, categoryId, amount, accountId, showInQuick } = req.body;
    if (!type || !name?.trim()) return res.status(400).json({ error: 'type y name son obligatorios' });
    if (type !== 'expense' && type !== 'income') return res.status(400).json({ error: 'type debe ser expense o income' });
    const acc = await store.getAccount(req.userId, Number(accountId));
    if (!acc) return res.status(400).json({ error: 'Cuenta no encontrada' });
    const amt = Number(amount) || 0;
    if (amt <= 0) return res.status(400).json({ error: 'El monto debe ser positivo' });
    const t = await store.createQuickTemplate(req.userId, {
      type,
      name: name.trim(),
      icon: icon != null ? icon : '📁',
      categoryId: categoryId != null ? Number(categoryId) : null,
      amount: amt,
      accountId: Number(accountId),
      showInQuick: showInQuick !== false,
    });
    res.status(201).json(t);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const existing = await store.getQuickTemplate(req.userId, id);
    if (!existing) return res.status(404).json({ error: 'Plantilla no encontrada' });
    const { name, icon, categoryId, amount, accountId, showInQuick } = req.body;
    const t = await store.updateQuickTemplate(req.userId, id, { 
      name: name !== undefined ? String(name).trim() : undefined,
      icon: icon !== undefined ? icon : undefined,
      categoryId: categoryId !== undefined ? (categoryId == null ? null : Number(categoryId)) : undefined,
      amount: amount !== undefined ? Number(amount) : undefined,
      accountId: accountId !== undefined ? Number(accountId) : undefined,
      showInQuick: showInQuick !== undefined ? !!showInQuick : undefined,
    });
    res.json(t);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const deleted = await store.deleteQuickTemplate(req.userId, id);
    if (!deleted) return res.status(404).json({ error: 'Plantilla no encontrada' });
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
