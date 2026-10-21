import { readDb, writeDb, DatabaseSchema, getInitialData } from './local-storage';
import { fetchGasData, fetchGasMembers, getGasUrl } from './google-sheets';
import { Member, MealEntry, BazarEntry, ExpenseItem, Deposit, SettlementEntry, MonthLock } from '../types';

let cachedDb: DatabaseSchema | null = null;
let lastFetchTime = 0;
let isRefreshing = false;
let pushQueue: Promise<void> = Promise.resolve();
const CACHE_TTL_MS = 25 * 1000; // 25 seconds cache TTL

// Lightweight in-memory LRU cache for past historical months loaded on-demand from Google Sheets
interface HistoricalCacheEntry {
  data: {
    meals: MealEntry[];
    bazarEntries: BazarEntry[];
    expenses: ExpenseItem[];
    deposits: Deposit[];
    settlements: SettlementEntry[];
  };
  timestamp: number;
}
const historicalCache = new Map<string, HistoricalCacheEntry>();
const HISTORICAL_TTL_MS = 5 * 60 * 1000; // 5 minutes cache for past months

/**
 * Returns active months that must reside in the local Virtual Database (Hot Storage).
 * - Current calendar month (e.g. 2026-10)
 * - If day <= 7 of month (transition buffer), include previous month for seamless dues finalization
 * - Any month with status === 'RUNNING'
 */
export function getActiveYearMonths(db?: DatabaseSchema): string[] {
  const currentYM = new Date().toISOString().substring(0, 7);
  const activeSet = new Set<string>();
  activeSet.add(currentYM);

  // Transition buffer: If today is within day 1-7, also keep immediate previous month active
  const todayDate = new Date().getDate();
  if (todayDate <= 7) {
    const prevDate = new Date();
    prevDate.setDate(0); // last day of prev month
    activeSet.add(prevDate.toISOString().substring(0, 7));
  }

  // Any month currently marked as RUNNING in monthLocks
  const targetDb = db || cachedDb || readDb();
  if (targetDb?.monthLocks) {
    targetDb.monthLocks.forEach((lock) => {
      if (lock.status === 'RUNNING' && lock.yearMonth) {
        activeSet.add(lock.yearMonth);
      }
    });
  }

  return Array.from(activeSet);
}

/**
 * Prunes past closed months' heavy operational records from the local Virtual Database.
 * Members, monthLocks, config, securityTokens, and auditLogs are ALWAYS kept intact!
 */
export function pruneVirtualDatabase(db: DatabaseSchema): { db: DatabaseSchema; removedCount: number } {
  const activeMonths = new Set(getActiveYearMonths(db));

  const initialCount =
    (db.meals?.length || 0) +
    (db.bazarEntries?.length || 0) +
    (db.expenses?.length || 0) +
    (db.deposits?.length || 0) +
    (db.settlements?.length || 0);

  // Retain only records belonging to the active running months in local virtual storage
  db.meals = (db.meals || []).filter((m) => activeMonths.has(m.yearMonth));
  db.bazarEntries = (db.bazarEntries || []).filter((b) => activeMonths.has(b.yearMonth));
  db.expenses = (db.expenses || []).filter((e) => activeMonths.has(e.yearMonth));
  db.deposits = (db.deposits || []).filter((d) => activeMonths.has(d.yearMonth));
  db.settlements = (db.settlements || []).filter((s) => activeMonths.has(s.yearMonth));
  db.mealRequests = (db.mealRequests || []).filter((mr) => activeMonths.has(mr.yearMonth));
  db.dailyMealLocks = (db.dailyMealLocks || []).filter((dml) => activeMonths.has(dml.yearMonth));
  if (Array.isArray(db.auditLogs) && db.auditLogs.length > 50) {
    db.auditLogs = db.auditLogs.slice(-50);
  }

  const finalCount =
    (db.meals?.length || 0) +
    (db.bazarEntries?.length || 0) +
    (db.expenses?.length || 0) +
    (db.deposits?.length || 0) +
    (db.settlements?.length || 0);

  const removedCount = Math.max(0, initialCount - finalCount);
  return { db, removedCount };
}

async function refreshFromGas(): Promise<DatabaseSchema | null> {
  const gasUrl = getGasUrl();
  if (!gasUrl) return null;

  try {
    const data = (await fetchGasData('getMillData')) as DatabaseSchema;
    if (data && Array.isArray(data.members) && data.members.length > 0) {
      const currentLocal = cachedDb || readDb();
      const merged: DatabaseSchema = {
        ...data,
        mealRequests: currentLocal?.mealRequests || [],
        dailyMealLocks: currentLocal?.dailyMealLocks || [],
        config: currentLocal?.config || data.config,
      };

      // Prune past months from local virtual database so it stays super light
      const { db: prunedDb } = pruneVirtualDatabase(merged);

      cachedDb = prunedDb;
      lastFetchTime = Date.now();
      writeDb(prunedDb);
      return prunedDb;
    }
  } catch (err) {
    console.warn('GAS fetch failed, preserving existing cache:', err);
  }
  return null;
}

export async function getDatabase(forceRefresh = false): Promise<DatabaseSchema> {
  const now = Date.now();

  // 1. If forceRefresh is requested (e.g. manual Admin pull), await fresh GAS fetch
  if (forceRefresh) {
    const fresh = await refreshFromGas();
    if (fresh) return fresh;
    if (cachedDb) return cachedDb;
    const local = readDb();
    cachedDb = local;
    return local;
  }

  // 2. If memory cache exists:
  if (cachedDb) {
    // If cache is stale, trigger non-blocking background revalidation
    if (now - lastFetchTime >= CACHE_TTL_MS && !isRefreshing) {
      isRefreshing = true;
      refreshFromGas().finally(() => {
        isRefreshing = false;
      });
    }
    return cachedDb;
  }

  // 3. Cold start: instantly read local disk cache (1-2ms), then revalidate in background
  const localDb = readDb();
  cachedDb = localDb;
  lastFetchTime = Date.now();

  if (!isRefreshing) {
    isRefreshing = true;
    refreshFromGas().finally(() => {
      isRefreshing = false;
    });
  }

  return localDb;
}

export async function saveDatabase(data: DatabaseSchema, options: { syncGas?: boolean } = { syncGas: true }): Promise<void> {
  cachedDb = data;
  lastFetchTime = Date.now();
  // Immediately persist to local high-speed disk cache
  writeDb(data);

  if (options.syncGas !== false) {
    const gasUrl = getGasUrl();
    if (gasUrl) {
      // Serialize background pushes so updates execute strictly in order
      pushQueue = pushQueue
        .then(async () => {
          await pushToGoogleSheets();
        })
        .catch((err) => {
          console.error('GAS background sync error:', err);
        });
    }
  }
}

/**
 * Saves database state locally to disk only, without triggering Google Sheets background sync.
 */
export async function saveLocalDatabase(data: DatabaseSchema): Promise<void> {
  return saveDatabase(data, { syncGas: false });
}

/**
 * Fetches data for a specific yearMonth:
 * - If running month: served instantly from Virtual Database (Hot Storage).
 * - If past closed month: queried on-demand directly from Google Sheets (Cold Storage),
 *   cached temporarily in-memory without polluting local database.json.
 */
export async function getMonthScopedData(yearMonth: string): Promise<{
  yearMonth: string;
  source: 'VIRTUAL_DB' | 'HISTORICAL_CACHE' | 'GOOGLE_SHEET';
  members: Member[];
  meals: MealEntry[];
  bazarEntries: BazarEntry[];
  expenses: ExpenseItem[];
  deposits: Deposit[];
  settlements: SettlementEntry[];
  monthLock?: MonthLock;
}> {
  const db = await getDatabase();
  const members = db.members || [];
  const monthLock = (db.monthLocks || []).find((l) => l.yearMonth === yearMonth);
  const activeMonths = new Set(getActiveYearMonths(db));

  // 1. If it's an active running month or virtual DB already contains records for this month:
  const hasLocalMeals = (db.meals || []).some((m) => m.yearMonth === yearMonth);
  const hasLocalBazar = (db.bazarEntries || []).some((b) => b.yearMonth === yearMonth);
  const hasLocalDeposits = (db.deposits || []).some((d) => d.yearMonth === yearMonth);

  if (activeMonths.has(yearMonth) || hasLocalMeals || hasLocalBazar || hasLocalDeposits) {
    return {
      yearMonth,
      source: 'VIRTUAL_DB',
      members,
      meals: (db.meals || []).filter((m) => m.yearMonth === yearMonth),
      bazarEntries: (db.bazarEntries || []).filter((b) => b.yearMonth === yearMonth),
      expenses: (db.expenses || []).filter((e) => e.yearMonth === yearMonth),
      deposits: (db.deposits || []).filter((d) => d.yearMonth === yearMonth),
      settlements: (db.settlements || []).filter((s) => s.yearMonth === yearMonth),
      monthLock,
    };
  }

  // 2. Past closed month: Check in-memory historical cache
  const cachedHistorical = historicalCache.get(yearMonth);
  if (cachedHistorical && Date.now() - cachedHistorical.timestamp < HISTORICAL_TTL_MS) {
    return {
      yearMonth,
      source: 'HISTORICAL_CACHE',
      members,
      ...cachedHistorical.data,
      monthLock,
    };
  }

  // 3. Past closed month: Query directly on-demand from Google Sheets cold storage
  try {
    const gasUrl = getGasUrl();
    if (gasUrl) {
      const fullRemoteData = (await fetchGasData('getMillData')) as DatabaseSchema;
      if (fullRemoteData) {
        const pastMeals = (fullRemoteData.meals || []).filter((m) => m.yearMonth === yearMonth);
        const pastBazar = (fullRemoteData.bazarEntries || []).filter((b) => b.yearMonth === yearMonth);
        const pastExpenses = (fullRemoteData.expenses || []).filter((e) => e.yearMonth === yearMonth);
        const pastDeposits = (fullRemoteData.deposits || []).filter((d) => d.yearMonth === yearMonth);
        const pastSettlements = (fullRemoteData.settlements || []).filter((s) => s.yearMonth === yearMonth);

        const historicalData = {
          meals: pastMeals,
          bazarEntries: pastBazar,
          expenses: pastExpenses,
          deposits: pastDeposits,
          settlements: pastSettlements,
        };

        // Cache in memory for 5 mins (does NOT write to database.json disk)
        historicalCache.set(yearMonth, {
          data: historicalData,
          timestamp: Date.now(),
        });

        return {
          yearMonth,
          source: 'GOOGLE_SHEET',
          members: fullRemoteData.members && fullRemoteData.members.length > 0 ? fullRemoteData.members : members,
          ...historicalData,
          monthLock: (fullRemoteData.monthLocks || []).find((l) => l.yearMonth === yearMonth) || monthLock,
        };
      }
    }
  } catch (err) {
    console.error(`Error loading historical month ${yearMonth} from Google Sheets:`, err);
  }

  // Fallback to local empty
  return {
    yearMonth,
    source: 'VIRTUAL_DB',
    members,
    meals: (db.meals || []).filter((m) => m.yearMonth === yearMonth),
    bazarEntries: (db.bazarEntries || []).filter((b) => b.yearMonth === yearMonth),
    expenses: (db.expenses || []).filter((e) => e.yearMonth === yearMonth),
    deposits: (db.deposits || []).filter((d) => d.yearMonth === yearMonth),
    settlements: (db.settlements || []).filter((s) => s.yearMonth === yearMonth),
    monthLock,
  };
}

/**
 * Pushes all current data to Google Sheets, then prunes non-active months from virtual database.
 */
export async function syncAndPruneMonthTransition(): Promise<{ synced: boolean; removedCount: number }> {
  const db = await getDatabase();
  await pushToGoogleSheets();

  const { db: prunedDb, removedCount } = pruneVirtualDatabase(db);
  cachedDb = prunedDb;
  lastFetchTime = Date.now();
  writeDb(prunedDb);
  historicalCache.clear();

  return { synced: true, removedCount };
}

/**
 * Explicitly forces a pull from Google Sheets to overwrite local cache with live Sheet data
 */
export async function pullFromGoogleSheets(): Promise<DatabaseSchema> {
  historicalCache.clear();
  return await getDatabase(true);
}

/**
 * Directly queries Google Sheets Members sheet and synchronizes local member list.
 * Used for instant, zero-delay login verification matching directly against Google Sheets.
 */
export async function syncMembersFromGoogleSheet(): Promise<DatabaseSchema> {
  const members = await fetchGasMembers();
  const db = cachedDb || readDb();
  if (members && Array.isArray(members) && members.length > 0) {
    db.members = members;
    cachedDb = db;
    lastFetchTime = Date.now();
    writeDb(db);
  }
  return db;
}

/**
 * Explicitly pushes local database state to Google Sheets master spreadsheet,
 * merging with remote historical cold storage so past months are never lost.
 */
export async function pushToGoogleSheets(): Promise<boolean> {
  const db = cachedDb || readDb();
  const gasUrl = getGasUrl();
  if (!gasUrl) throw new Error('GAS_API_URL is not configured');

  let payloadDb: DatabaseSchema = db;
  try {
    const remoteData = (await fetchGasData('getMillData')) as DatabaseSchema;
    if (remoteData) {
      const localMealMonths = new Set((db.meals || []).map((m) => m.yearMonth));
      const localBazarMonths = new Set((db.bazarEntries || []).map((b) => b.yearMonth));
      const localExpenseMonths = new Set((db.expenses || []).map((e) => e.yearMonth));
      const localDepositMonths = new Set((db.deposits || []).map((d) => d.yearMonth));
      const localSettlementMonths = new Set((db.settlements || []).map((s) => s.yearMonth));
      const localLockMonths = new Set((db.monthLocks || []).map((l) => l.yearMonth));

      // Retain past closed months' records from Google Sheets cold storage
      const preservedMeals = (remoteData.meals || []).filter((m) => !localMealMonths.has(m.yearMonth));
      const preservedBazar = (remoteData.bazarEntries || []).filter((b) => !localBazarMonths.has(b.yearMonth));
      const preservedExpenses = (remoteData.expenses || []).filter((e) => !localExpenseMonths.has(e.yearMonth));
      const preservedDeposits = (remoteData.deposits || []).filter((d) => !localDepositMonths.has(d.yearMonth));
      const preservedSettlements = (remoteData.settlements || []).filter((s) => !localSettlementMonths.has(s.yearMonth));
      const preservedLocks = (remoteData.monthLocks || []).filter((l) => !localLockMonths.has(l.yearMonth));

      payloadDb = {
        ...db,
        meals: [...preservedMeals, ...(db.meals || [])],
        bazarEntries: [...preservedBazar, ...(db.bazarEntries || [])],
        expenses: [...preservedExpenses, ...(db.expenses || [])],
        deposits: [...preservedDeposits, ...(db.deposits || [])],
        settlements: [...preservedSettlements, ...(db.settlements || [])],
        monthLocks: [...preservedLocks, ...(db.monthLocks || [])],
      };
    }
  } catch (err) {
    console.warn('Historical merge before GAS sync warning:', err);
  }

  await fetchGasData('syncFullData', { db: payloadDb });
  historicalCache.clear();
  return true;
}

/**
 * Completely wipes local database cache and remote Google Sheet tabs,
 * resetting to clean initial Super Admin state.
 */
export async function wipeDatabase(preserveConfig = true): Promise<DatabaseSchema> {
  const currentDb = readDb();
  const freshDb = getInitialData();
  if (preserveConfig && currentDb?.config) {
    freshDb.config = currentDb.config;
  }
  cachedDb = freshDb;
  lastFetchTime = Date.now();
  writeDb(freshDb);

  const gasUrl = getGasUrl();
  if (gasUrl) {
    try {
      await fetchGasData('wipeAllData', { db: freshDb });
    } catch (err) {
      console.warn('GAS wipeAllData error:', err);
    }
  }
  return freshDb;
}
