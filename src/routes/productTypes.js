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

export default router;
