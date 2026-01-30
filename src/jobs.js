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
    const [incomes, expenses] = await Promise.all([
      store.applyFixedIncomesForMonth(month, year, day),
      store.applyFixedExpensesForMonth(month, year, day),
    ]);
    if (incomes.length > 0 || expenses.length > 0) {
      console.log(`[Job] Aplicados ${incomes.length} ingreso(s) fijo(s) y ${expenses.length} gasto(s) fijo(s) para el día ${day}.`);
    }
  } catch (err) {
    console.error('[Job] Error aplicando fijos:', err);
  }
}

export function startFixedDailyJob() {
  runFixedDailyJob();
  setInterval(runFixedDailyJob, INTERVAL_MS);
}
