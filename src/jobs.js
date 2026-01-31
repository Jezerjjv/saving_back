/**
 * Job de gastos/ingresos fijos:
 * - Se ejecuta al arrancar el servidor y luego cada 30 minutos.
 * - Aplica los fijos cuyo day_of_month coincide con el día actual (1-31).
 * - No hay hora fija tipo cron: la primera ejecución es al iniciar; las siguientes cada 30 min.
 * - Si añades un gasto fijo para "hoy" después de que el servidor llevara tiempo encendido,
 *   se aplicará en la siguiente pasada (máx. 30 min).
 * - Los duplicados en el mes se evitan en el store (por nombre en el mes).
 */
import * as store from './store.js';

const INTERVAL_MS = 30 * 60 * 1000; // 30 minutos

export async function runFixedDailyJob() {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  const day = now.getDate();
  try {
    const [incomes, expenses, periodicTransfers, interest] = await Promise.all([
      store.applyFixedIncomesForMonth(month, year, day),
      store.applyFixedExpensesForMonth(month, year, day),
      store.applyPeriodicTransfersForMonth(month, year, day),
      store.applyDailyInterest(),
    ]);
    if (incomes.length > 0 || expenses.length > 0) {
      console.log(`[Job] Aplicados ${incomes.length} ingreso(s) fijo(s) y ${expenses.length} gasto(s) fijo(s) para el día ${day}.`);
    }
    if (periodicTransfers.length > 0) {
      const accounts = await store.getAccounts();
      const nameById = Object.fromEntries((accounts || []).map((a) => [a.id, a.name]));
      const totalEur = periodicTransfers.reduce((sum, t) => sum + t.amount, 0);
      console.log(`[Job] [${now.toISOString()}] Transferencias periódicas: ${periodicTransfers.length} aplicada(s) para el día ${day} (total: ${totalEur.toFixed(2)} €):`);
      periodicTransfers.forEach((t) => {
        const from = nameById[t.fromAccountId] || `#${t.fromAccountId}`;
        const to = nameById[t.toAccountId] || `#${t.toAccountId}`;
        const desc = t.description ? ` — ${t.description}` : '';
        console.log(`  - ${t.amount.toFixed(2)} €: ${from} → ${to}${desc}`);
      });
    } else {
      console.log(`[Job] [${now.toISOString()}] Transferencias periódicas: 0 para el día ${day} (ninguna pendiente con día ${day}).`);
    }
    if (interest.skipped && interest.reason === 'already_today') {
      console.log(`[Job] Intereses diarios: ya aplicados hoy (se ejecutan 1 vez al día).`);
    } else if (interest.applied > 0) {
      const amount = typeof interest.totalInterest === 'number' ? interest.totalInterest.toFixed(2) : '0.00';
      console.log(`[Job] Intereses diarios: +${amount} € aplicados a ${interest.applied} cuenta(s).`);
    } else {
      console.log(`[Job] Intereses diarios: 0 cuentas con producto Interés (añade un producto tipo Interés con % anual).`);
    }
  } catch (err) {
    console.error('[Job] Error aplicando fijos/intereses:', err);
  }
}

export function startFixedDailyJob() {
  runFixedDailyJob();
  setInterval(runFixedDailyJob, INTERVAL_MS);
}
