import { Router } from 'express';
import * as store from '../store.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const { year, month } = req.query;
    const y = year != null ? Number(year) : null;
    const m = month != null ? Number(month) : null;
    const [eligible, history] = await Promise.all([
      store.hasInterestProduct(req.userId),
      store.getInterestHistory(req.userId, y, m),
    ]);
    res.json({ eligible, history });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
