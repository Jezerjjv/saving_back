import { Router } from 'express';
import * as store from '../store.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const categories = await store.getCategories();
    res.json(categories);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { name, icon = '📁' } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'El nombre es obligatorio' });
    const category = await store.createCategory({ name: name.trim(), icon });
    res.status(201).json(category);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const category = await store.getCategory(id);
    if (!category) return res.status(404).json({ error: 'Categoría no encontrada' });
    res.json(category);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const existing = await store.getCategory(id);
    if (!existing) return res.status(404).json({ error: 'Categoría no encontrada' });
    const { name, icon } = req.body;
    const category = await store.updateCategory(id, { name, icon });
    res.json(category);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const deleted = await store.deleteCategory(id);
    if (!deleted) return res.status(404).json({ error: 'Categoría no encontrada' });
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
