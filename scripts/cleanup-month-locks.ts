import { readDb, writeDb, DatabaseSchema } from '../lib/db/local-storage';
import { pushToGoogleSheets } from '../lib/db';
import { MonthLock } from '../lib/types';

/**
 * Daily cleanup job that removes data for month locks that have been CLOSED for more than 30 days.
 * It also pushes a fast‑path deletion to Google Sheets via pushToGoogleSheets with `targetYM`.
 */
async function cleanupOldMonthLocks() {
  const db: DatabaseSchema = readDb();
  const now = Date.now();
  const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

  const keepLocks: MonthLock[] = [];
  const removeYMs: string[] = [];

  db.monthLocks?.forEach((lock) => {
    if (lock.status !== 'CLOSED' || !lock.lockedAt) {
      keepLocks.push(lock);
      return;
    }
    const lockedAtMs = new Date(lock.lockedAt).getTime();
    if (now - lockedAtMs > THIRTY_DAYS_MS) {
      if (lock.yearMonth) removeYMs.push(lock.yearMonth);
    } else {
      keepLocks.push(lock);
    }
  });

  if (removeYMs.length === 0) {
    console.log('No expired monthLocks to clean up.');
    return;
  }

  // Helper to filter out records belonging to removed months
  const filterByYM = <T extends { yearMonth?: string }>(arr?: T[]): T[] => {
    if (!arr) return [];
    return arr.filter((rec) => !removeYMs.includes(rec.yearMonth || ''));
  };

  db.meals = filterByYM(db.meals);
  db.bazarEntries = filterByYM(db.bazarEntries);
  db.expenses = filterByYM(db.expenses);
  db.deposits = filterByYM(db.deposits);
  db.settlements = filterByYM(db.settlements);
  db.monthLocks = keepLocks;

  writeDb(db);
  console.log(`Cleaned up data for months: ${removeYMs.join(', ')}`);

  // Notify Google Sheets – fast‑path update for each month
  for (const ym of removeYMs) {
    try {
      await pushToGoogleSheets(ym);
      console.log(`Pushed month ${ym} cleanup to Google Sheets`);
    } catch (e) {
      console.warn(`Failed to push cleanup for ${ym}:`, e);
    }
  }
}

cleanupOldMonthLocks().catch((err) => console.error('Month lock cleanup failed:', err));
