import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import authRouter from './routes/auth.js';
import accountsRouter from './routes/accounts.js';
import productTypesRouter from './routes/productTypes.js';
import iconsRouter from './routes/icons.js';
import categoriesRouter from './routes/categories.js';
import transactionsRouter from './routes/transactions.js';
import fixedIncomesRouter from './routes/fixedIncomes.js';
import fixedExpensesRouter from './routes/fixedExpenses.js';
import quickTemplatesRouter from './routes/quickTemplates.js';
import transfersRouter from './routes/transfers.js';
import periodicTransfersRouter from './routes/periodicTransfers.js'; 
import interestHistoryRouter from './routes/interestHistory.js';
import cryptoRouter from './routes/crypto.js';
import stocksRouter from './routes/stocks.js';
import settingsRouter from './routes/settings.js';
import pillLogRouter from './routes/pillLog.js';
import { requireAuth } from './middleware/auth.js';
import { startFixedDailyJob } from './jobs.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.get('/api/health', (_, res) => res.json({ ok: true }));
app.use('/api/auth', authRouter);

// Rutas protegidas: requieren token JWT
app.use(requireAuth);
app.use('/api/accounts', accountsRouter);
app.use('/api/product-types', productTypesRouter);
app.use('/api/icons', iconsRouter);
app.use('/api/categories', categoriesRouter);
app.use('/api/transactions', transactionsRouter);
app.use('/api/fixed-incomes', fixedIncomesRouter);
app.use('/api/fixed-expenses', fixedExpensesRouter);
app.use('/api/quick-templates', quickTemplatesRouter);
app.use('/api/transfers', transfersRouter);
app.use('/api/periodic-transfers', periodicTransfersRouter);
app.use('/api/interest-history', interestHistoryRouter);
app.use('/api/crypto', cryptoRouter);
app.use('/api/stocks', stocksRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/pill-log', pillLogRouter);

app.listen(PORT, () => {
  console.log(`Servidor en http://localhost:${PORT}`);
  startFixedDailyJob();
});
