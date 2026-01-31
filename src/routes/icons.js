import { Router } from 'express';
import * as store from '../store.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const icons = await store.getIcons();
    res.json(icons);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const icon = await store.getIcon(id);
    if (!icon) return res.status(404).json({ error: 'Icono no encontrado' });
    res.json(icon);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { symbol, name } = req.body;
    if (!symbol?.trim()) return res.status(400).json({ error: 'El símbolo del icono es obligatorio' });
    const icon = await store.createIcon({ symbol: symbol.trim(), name: name?.trim() || null });
    res.status(201).json(icon);
  } catch (err) {
    if (err.message === 'Ese icono ya existe') return res.status(409).json({ error: err.message });
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const existing = await store.getIcon(id);
    if (!existing) return res.status(404).json({ error: 'Icono no encontrado' });
    const { symbol, name } = req.body;
    const icon = await store.updateIcon(id, { symbol, name });
    res.json(icon);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const deleted = await store.deleteIcon(id);
    if (!deleted) return res.status(404).json({ error: 'Icono no encontrado' });
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
