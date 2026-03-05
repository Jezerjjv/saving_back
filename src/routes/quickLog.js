// Tabla rápida: gastos/ingresos sin cuenta (solo anotación)
import { Router } from 'express';
import * as store from '../store.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const list = await store.getQuickLogEntries(req.userId);
    res.json(list);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { name, amount, type, categoryId, date } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'El concepto es obligatorio' });
    if (type !== 'expense' && type !== 'income') return res.status(400).json({ error: 'type debe ser expense o income' });
    const entry = await store.createQuickLogEntry(req.userId, { name: name.trim(), amount, type, categoryId, date });
    res.status(201).json(entry);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const entry = await store.getQuickLogEntry(req.userId, id);
    if (!entry) return res.status(404).json({ error: 'Entrada no encontrada' });
    res.json(entry);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const existing = await store.getQuickLogEntry(req.userId, id);
    if (!existing) return res.status(404).json({ error: 'Entrada no encontrada' });
    const { name, amount, type, categoryId, date } = req.body;
    const entry = await store.updateQuickLogEntry(req.userId, id, {
      name: name !== undefined ? String(name).trim() : undefined,
      amount: amount !== undefined ? Number(amount) : undefined,
      type: type !== undefined ? type : undefined,
      categoryId: categoryId !== undefined ? categoryId : undefined,
      date: date !== undefined ? String(date).slice(0, 10) : undefined,
    });
    res.json(entry);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const deleted = await store.deleteQuickLogEntry(req.userId, id);
    if (!deleted) return res.status(404).json({ error: 'Entrada no encontrada' });
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
