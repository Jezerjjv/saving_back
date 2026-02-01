import { Router } from 'express';
import * as store from '../store.js';

const router = Router();

router.get('/holdings', async (req, res) => {
  try {
    const list = await store.getCryptoHoldings(req.userId);
    res.json(list);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/holdings/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const item = await store.getCryptoHolding(req.userId, id);
    if (!item) return res.status(404).json({ error: 'Posición no encontrada' });
    res.json(item);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/holdings', async (req, res) => {
  try {
    const { symbol, amountInvested, priceBought, currency } = req.body;
    if (!symbol || !String(symbol).trim()) {
      return res.status(400).json({ error: 'symbol es obligatorio' });
    }
    const item = await store.createCryptoHolding(req.userId, {
      symbol: String(symbol).trim().toLowerCase(),
      amountInvested: Number(amountInvested) || 0,
      priceBought: Number(priceBought) || 0,
      currency: currency === 'USDT' ? 'USDT' : (currency === 'USD' ? 'USD' : 'EUR'),
    });
    res.status(201).json(item);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.put('/holdings/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { symbol, amountInvested, priceBought, currency } = req.body;
    const item = await store.updateCryptoHolding(req.userId, id, {
      symbol: symbol != null ? String(symbol).trim().toLowerCase() : undefined,
      amountInvested: amountInvested != null ? Number(amountInvested) : undefined,
      priceBought: priceBought != null ? Number(priceBought) : undefined,
      currency: currency !== undefined ? (currency === 'USDT' ? 'USDT' : (currency === 'USD' ? 'USD' : 'EUR')) : undefined,
    });
    if (!item) return res.status(404).json({ error: 'Posición no encontrada' });
    res.json(item);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.delete('/holdings/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const deleted = await store.deleteCryptoHolding(id);
    if (!deleted) return res.status(404).json({ error: 'Posición no encontrada' });
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

/** Precios actuales (CoinGecko + caché). Query: symbols=bitcoin,ethereum */
router.get('/prices', async (req, res) => {
  try {
    const symbolsParam = req.query.symbols;
    const symbols = symbolsParam ? String(symbolsParam).split(',').map((s) => s.trim()).filter(Boolean) : [];
    const prices = await store.getCryptoPrices(symbols);
    res.json(prices);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

/** Historial de cierres diarios. Query: year, month (opcionales). */
router.get('/daily-close', async (req, res) => {
  try {
    const { year, month } = req.query;
    const y = year != null ? Number(year) : null;
    const m = month != null ? Number(month) : null;
    const history = await store.getCryptoDailyCloseHistory(req.userId, y, m);
    res.json(history);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

/** Historial diario de G/P de una posición. Query: year, month (opcionales). */
router.get('/holdings/:id/daily-history', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const holding = await store.getCryptoHolding(req.userId, id);
    if (!holding) return res.status(404).json({ error: 'Posición no encontrada' });
    const { year, month } = req.query;
    const y = year != null ? Number(year) : null;
    const m = month != null ? Number(month) : null;
    const history = await store.getCryptoHoldingDailyHistory(id, y, m);
    res.json(history);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

/** Para el menú: ¿hay posiciones? */
router.get('/eligible', async (req, res) => {
  try {
    const eligible = await store.hasCryptoHoldings(req.userId);
    res.json({ eligible });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
