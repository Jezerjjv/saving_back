import { Router } from 'express';
import * as store from '../store.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const types = await store.getProductTypes();
    res.json(types);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const type = await store.getProductType(id);
    if (!type) return res.status(404).json({ error: 'Tipo de producto no encontrado' });
    res.json(type);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { name, icon } = req.body;
    if (!name || !String(name).trim()) {
      return res.status(400).json({ error: 'El nombre es obligatorio' });
    }
    const type = await store.createProductType({ name: String(name).trim(), icon });
    res.status(201).json(type);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { name, icon } = req.body;
    const type = await store.updateProductType(id, { name, icon });
    if (!type) return res.status(404).json({ error: 'Tipo de producto no encontrado' });
    res.json(type);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const deleted = await store.deleteProductType(id);
    if (!deleted) return res.status(404).json({ error: 'Tipo de producto no encontrado' });
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
