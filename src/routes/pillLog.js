import { Router } from 'express';
import * as store from '../store.js';

const router = Router();

/** Lista de tipos de pastilla (nombre + color) */
router.get('/types', async (req, res) => {
  try {
    const list = await store.getPillTypes(req.userId);
    res.json(list);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/types', async (req, res) => {
  try {
    const { name, color } = req.body;
    const created = await store.createPillType(req.userId, {
      name: name?.trim() || 'Pastilla',
      color: color || '#3498db',
    });
    if (!created) return res.status(500).json({ error: 'Error al crear' });
    res.status(201).json(created);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.put('/types/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { name, color } = req.body;
    const updated = await store.updatePillType(req.userId, id, { name, color });
    if (!updated) return res.status(404).json({ error: 'Tipo no encontrado' });
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.delete('/types/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const deleted = await store.deletePillType(req.userId, id);
    if (!deleted) return res.status(404).json({ error: 'Tipo no encontrado' });
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

/** Log del mes: { "YYYY-MM-DD": [ { id, name, color }, ... ], ... } */
router.get('/', async (req, res) => {
  try {
    const { year, month } = req.query;
    const y = year != null ? Number(year) : new Date().getFullYear();
    const m = month != null ? Number(month) : new Date().getMonth() + 1;
    const byDate = await store.getPillLogForMonth(req.userId, y, m);
    res.json(byDate);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

/** Marcar: añadir este tipo de pastilla a este día */
router.post('/', async (req, res) => {
  try {
    const { date, pillTypeId } = req.body;
    if (!date || pillTypeId == null) return res.status(400).json({ error: 'date y pillTypeId son obligatorios' });
    await store.setPillLogDay(req.userId, date, pillTypeId, true);
    res.status(201).json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

/** Desmarcar: quitar este tipo de pastilla de este día */
router.delete('/', async (req, res) => {
  try {
    const { date, pillTypeId } = req.query;
    if (!date || !pillTypeId) return res.status(400).json({ error: 'date y pillTypeId son obligatorios' });
    await store.setPillLogDay(req.userId, date, Number(pillTypeId), false);
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
