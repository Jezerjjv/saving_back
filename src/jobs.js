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
    const userIds = await store.getUserIds();
    for (const userId of userIds) {
      const [incomes, expenses, periodicTransfers, interest] = await Promise.all([
        store.applyFixedIncomesForMonth(userId, month, year, day),
        store.applyFixedExpensesForMonth(userId, month, year, day),
        store.applyPeriodicTransfersForMonth(userId, month, year, day),
        store.applyDailyInterest(userId),
      ]);
      if (incomes.length > 0 || expenses.length > 0) {
        console.log(`[Job] Usuario ${userId}: aplicados ${incomes.length} ingreso(s) fijo(s) y ${expenses.length} gasto(s) fijo(s) para el día ${day}.`);
      }
      if (periodicTransfers.length > 0) {
        const accounts = await store.getAccounts(userId);
        const nameById = Object.fromEntries((accounts || []).map((a) => [a.id, a.name]));
        const totalEur = periodicTransfers.reduce((sum, t) => sum + t.amount, 0);
        console.log(`[Job] [${now.toISOString()}] Usuario ${userId}: transferencias periódicas: ${periodicTransfers.length} aplicada(s) para el día ${day} (total: ${totalEur.toFixed(2)} €):`);
        periodicTransfers.forEach((t) => {
          const from = nameById[t.fromAccountId] || `#${t.fromAccountId}`;
          const to = nameById[t.toAccountId] || `#${t.toAccountId}`;
          const desc = t.description ? ` — ${t.description}` : '';
          console.log(`  - ${t.amount.toFixed(2)} €: ${from} → ${to}${desc}`);
        });
      }
      if (interest.skipped && interest.reason === 'already_today') {
        // ya aplicado hoy para este usuario
      } else if (interest.applied > 0) {
        const amount = typeof interest.totalInterest === 'number' ? interest.totalInterest.toFixed(2) : '0.00';
        console.log(`[Job] Usuario ${userId}: intereses diarios +${amount} € aplicados a ${interest.applied} cuenta(s).`);
      }
    }
    if (userIds.length === 0) {
      console.log(`[Job] Sin usuarios.`);
    }

    // Cierre diario cripto por usuario: a las 00:00 registramos el cierre del día anterior
    const hour = now.getHours();
    const minute = now.getMinutes();
    if (hour === 0 && minute < 30) {
      const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().slice(0, 10);
      const userIdsForCrypto = await store.getUserIds();
      for (const uid of userIdsForCrypto) {
        const existing = await store.getCryptoDailyCloseByDate(uid, yesterdayStr);
        if (!existing) {
          try {
            const closeResult = await store.runCryptoDailyClose(uid);
            if (closeResult.inserted) {
              console.log(`[Job] Usuario ${uid} cierre cripto: ${yesterdayStr} — valor EUR ${closeResult.totalEur?.toFixed(2) ?? '—'}, G/P EUR ${closeResult.gainLossEur?.toFixed(2) ?? '—'}.`);
            }
          } catch (cryptoErr) {
            console.error(`[Job] Error cierre diario cripto usuario ${uid}:`, cryptoErr);
          }
        }
      }
    }
  } catch (err) {
    console.error('[Job] Error aplicando fijos/intereses:', err);
  }
}

export function startFixedDailyJob() {
  runFixedDailyJob();
  setInterval(runFixedDailyJob, INTERVAL_MS);
}
