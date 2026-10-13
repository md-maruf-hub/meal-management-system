import { readDb, writeDb, DatabaseSchema, getInitialData } from './local-storage';
import { fetchGasData, getGasUrl } from './google-sheets';

let cachedDb: DatabaseSchema | null = null;
let lastFetchTime = 0;
let isRefreshing = false;
let pushQueue: Promise<void> = Promise.resolve();
const CACHE_TTL_MS = 25 * 1000; // 25 seconds cache TTL

async function refreshFromGas(): Promise<DatabaseSchema | null> {
  const gasUrl = getGasUrl();
  if (!gasUrl) return null;

  try {
    const data = (await fetchGasData('getMillData')) as DatabaseSchema;
    if (data && Array.isArray(data.members) && data.members.length > 0) {
      // Preserve local site-only booking and lock states
      const currentLocal = cachedDb || readDb();
      const merged: DatabaseSchema = {
        ...data,
        mealRequests: currentLocal?.mealRequests || [],
        dailyMealLocks: currentLocal?.dailyMealLocks || [],
        config: currentLocal?.config || data.config,
      };
      cachedDb = merged;
      lastFetchTime = Date.now();
      writeDb(merged);
      return merged;
    }
  } catch (err) {
    console.warn("GAS fetch failed, preserving existing cache:", err);
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
          await fetchGasData('syncFullData', { db: data });
        })
        .catch((err) => {
          console.error("GAS background sync error:", err);
        });
    }
  }
}

/**
 * Saves database state locally to disk only, without triggering Google Sheets background sync.
 * Ideal for temporary site-only data like member bookings and meal locks.
 */
export async function saveLocalDatabase(data: DatabaseSchema): Promise<void> {
  return saveDatabase(data, { syncGas: false });
}

/**
 * Explicitly forces a pull from Google Sheets to overwrite local cache with live Sheet data
 */
export async function pullFromGoogleSheets(): Promise<DatabaseSchema> {
  return await getDatabase(true);
}

/**
 * Explicitly pushes local database state to Google Sheets master spreadsheet
 */
export async function pushToGoogleSheets(): Promise<boolean> {
  const db = await getDatabase();
  const gasUrl = getGasUrl();
  if (!gasUrl) throw new Error("GAS_API_URL is not configured");
  await fetchGasData('syncFullData', { db });
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
      console.warn("GAS wipeAllData error:", err);
    }
  }
  return freshDb;
}

