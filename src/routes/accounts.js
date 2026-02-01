import { Router } from 'express';
import * as store from '../store.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const accounts = await store.getAccounts(req.userId);
    res.json(accounts);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { name, balance = 0, accountType = 'bank', currency = 'EUR' } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'El nombre es obligatorio' });
    const account = await store.createAccount(req.userId, { name: name.trim(), balance, accountType, currency });
    res.status(201).json(account);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const account = await store.getAccount(req.userId, id);
    if (!account) return res.status(404).json({ error: 'Cuenta no encontrada' });
    res.json(account);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const existing = await store.getAccount(req.userId, id);
    if (!existing) return res.status(404).json({ error: 'Cuenta no encontrada' });
    const { name, balance, accountType, currency } = req.body;
    const account = await store.updateAccount(req.userId, id, { name, balance, accountType, currency });
    res.json(account);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const deleted = await store.deleteAccount(req.userId, id);
    if (!deleted) return res.status(404).json({ error: 'Cuenta no encontrada' });
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Productos de una cuenta bancaria
router.get('/:id/products', async (req, res) => {
  try {
    const accountId = Number(req.params.id);
    const account = await store.getAccount(req.userId, accountId);
    if (!account) return res.status(404).json({ error: 'Cuenta no encontrada' });
    const products = await store.getAccountProducts(req.userId, accountId);
    res.json(products);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/products', async (req, res) => {
  try {
    const accountId = Number(req.params.id);
    const account = await store.getAccount(req.userId, accountId);
    if (!account) return res.status(404).json({ error: 'Cuenta no encontrada' });
    const { name, productTypeId, balance = 0, interestRateAnnual } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'El nombre del producto es obligatorio' });
    if (!productTypeId) return res.status(400).json({ error: 'El tipo de producto es obligatorio' });
    const product = await store.createAccountProduct(req.userId, { accountId, name: name.trim(), productTypeId, balance, interestRateAnnual });
    res.status(201).json(product);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.put('/:accountId/products/:productId', async (req, res) => {
  try {
    const productId = Number(req.params.productId);
    const product = await store.getAccountProduct(req.userId, productId);
    if (!product) return res.status(404).json({ error: 'Producto no encontrado' });
    if (product.accountId !== Number(req.params.accountId)) return res.status(404).json({ error: 'Producto no pertenece a esta cuenta' });
    const { name, productTypeId, balance, interestRateAnnual } = req.body;
    const updated = await store.updateAccountProduct(req.userId, productId, { name, productTypeId, balance, interestRateAnnual });
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:accountId/products/:productId', async (req, res) => {
  try {
    const productId = Number(req.params.productId);
    const product = await store.getAccountProduct(req.userId, productId);
    if (!product) return res.status(404).json({ error: 'Producto no encontrado' });
    if (product.accountId !== Number(req.params.accountId)) return res.status(404).json({ error: 'Producto no pertenece a esta cuenta' });
    await store.deleteAccountProduct(req.userId, productId);
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
