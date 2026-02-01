import { Router } from 'express';
import * as store from '../store.js';

const router = Router();

router.get('/holdings', async (req, res) => {
  try {
    const list = await store.getStockHoldings();
    res.json(list);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/holdings/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const item = await store.getStockHolding(id);
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
    const item = await store.createStockHolding({
      symbol: String(symbol).trim().toUpperCase(),
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
    const item = await store.updateStockHolding(id, {
      symbol: symbol != null ? String(symbol).trim().toUpperCase() : undefined,
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
    const deleted = await store.deleteStockHolding(id);
    if (!deleted) return res.status(404).json({ error: 'Posición no encontrada' });
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/prices', async (req, res) => {
  try {
    const symbolsParam = req.query.symbols;
    const symbols = symbolsParam ? String(symbolsParam).split(',').map((s) => s.trim()).filter(Boolean) : [];
    const prices = await store.getStockPrices(symbols);
    res.json(prices);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/eligible', async (req, res) => {
  try {
    const eligible = await store.hasStockHoldings();
    res.json({ eligible });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
