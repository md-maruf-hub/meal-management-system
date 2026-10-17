import { DatabaseSchema, readDb } from './local-storage';

const DEFAULT_GAS_URL = "https://script.google.com/macros/s/AKfycbxBczsU1fa5rBb09jDsNVatRl1FnP_BFaKS-eroESfUoxnJzh0U-TCphCwk8Avqj8WZ/exec";

export function getGasUrl(): string {
  // 1. Check local database config first (persisted dynamically by Super Admin via Dashboard)
  try {
    const db = readDb();
    if (db?.config?.gasUrl && typeof db.config.gasUrl === 'string' && db.config.gasUrl.trim().length > 0) {
      return db.config.gasUrl.trim();
    }
  } catch (err) {
    // ignore read errors, fallback to env
  }

  // 2. Check process.env.GAS_API_URL
  if (process.env.GAS_API_URL && process.env.GAS_API_URL.trim().length > 0) {
    return process.env.GAS_API_URL.trim();
  }

  // 3. Fallback to default
  return DEFAULT_GAS_URL;
}

export function getGasKey(): string {
  // 1. Check local database config first
  try {
    const db = readDb();
    if (db?.config?.gasApiKey && typeof db.config.gasApiKey === 'string' && db.config.gasApiKey.trim().length > 0) {
      return db.config.gasApiKey.trim();
    }
  } catch (err) {
    // ignore read errors, fallback to env
  }

  // 2. Check process.env.GAS_API_KEY
  if (process.env.GAS_API_KEY && process.env.GAS_API_KEY.trim().length > 0) {
    return process.env.GAS_API_KEY.trim();
  }

  // 3. Fallback to default secret key
  return 'MILL_SECRET_KEY_2026';
}

export async function fetchGasData(action: string, payload: Record<string, unknown> = {}): Promise<unknown> {
  const urlStr = getGasUrl();
  const apiKey = getGasKey();

  if (!urlStr) {
    throw new Error("GAS_API_URL environment variable is missing.");
  }

  const url = urlStr.includes('?') 
    ? `${urlStr}&key=${encodeURIComponent(apiKey)}` 
    : `${urlStr}?key=${encodeURIComponent(apiKey)}`;

  const response = await fetch(url, {
    method: 'POST',
    redirect: 'follow',
    headers: {
      'Content-Type': 'text/plain;charset=utf-8',
    },
    body: JSON.stringify({ action, apiKey, ...payload }),
  });

  const rawText = await response.text();
  let json: any;
  try {
    json = JSON.parse(rawText);
  } catch (err) {
    throw new Error(`Invalid JSON from GAS: ${rawText.substring(0, 100)}`);
  }

  if (!json.success) {
    throw new Error(json.error || 'Google Apps Script API returned an error.');
  }

  if (action === 'getMillData' && json.data) {
    return normalizeGasData(json.data);
  }

  return json.data;
}

function normalizeGasData(raw: any): DatabaseSchema {
  const normalizeYearMonth = (val: any): string => {
    if (!val) return new Date().toISOString().substring(0, 7);
    const str = String(val).replace(/^'/, '').trim();
    const match = str.match(/\b(\d{4})-(\d{1,2})\b/);
    if (match) {
      const year = match[1];
      const month = match[2].padStart(2, '0');
      return `${year}-${month}`;
    }
    if (str.length >= 7 && (str.includes('-') || str.includes('/'))) {
      const clean = str.split('T')[0].replace(/\//g, '-');
      const parts = clean.split('-');
      if (parts.length >= 2 && parts[0].length === 4) {
        return `${parts[0]}-${parts[1].padStart(2, '0')}`;
      }
    }
    return new Date().toISOString().substring(0, 7);
  };

  const members = (raw.members || []).map((m: any) => {
    const rawPhone = String(m.phone || '').trim();
    const phone = rawPhone.startsWith('0') ? rawPhone : (rawPhone ? `0${rawPhone}` : '');

    return {
      id: String(m.id),
      memberId: String(m.memberId),
      name: String(m.name),
      phone,
      roomNo: String(m.roomNo),
      email: String(m.email || ''),
      address: String(m.address || ''),
      status: m.status as any,
      role: m.role as any,
      joinDate: String(m.joinDate || ''),
      leaveDate: m.leaveDate ? String(m.leaveDate) : undefined,
      passwordHash: String(m.passwordHash || ''),
      createdAt: String(m.createdAt || new Date().toISOString()),
    };
  });

  const rawExpenses = raw.expenses || [];
  const activeMemCount = (raw.members || []).filter((m: any) => m.status === 'APPROVED' && m.role !== 'SUPER_ADMIN').length || 1;
  const sharedCosts = new Set<number>();
  rawExpenses.forEach((e: any) => {
    const perMem = Math.round(((Number(e.amount) || 0) / activeMemCount) * 100) / 100;
    if (perMem > 0) sharedCosts.add(perMem);
  });

  const meals = (raw.meals || [])
    .filter((m: any) => {
      const count = Number(m.mealCount || 0);
      // Discard invalid counts (meals cannot be > 20 in a single day, or <= 0)
      if (count <= 0 || count > 20) return false;

      // Discard phantom meals produced when Google Sheets financial summary columns are misread as days 3..6
      const day = Number(m.day);
      if (day >= 3 && day <= 6) {
        const roundedCount = Math.round(count * 100) / 100;
        if (sharedCosts.has(roundedCount)) {
          return false;
        }
      }
      return true;
    })
    .map((m: any) => ({
      id: String(m.id),
      memberId: String(m.memberId),
      yearMonth: normalizeYearMonth(m.yearMonth),
      day: Number(m.day),
      mealCount: Number(m.mealCount || 0),
      updatedAt: String(m.updatedAt || new Date().toISOString()),
    }));

  const bazarEntries = (raw.bazarEntries || []).map((b: any) => ({
    id: String(b.id),
    yearMonth: normalizeYearMonth(b.yearMonth),
    date: String(b.date || ''),
    amount: Number(b.amount || 0),
    description: String(b.description || ''),
    shopperName: String(b.shopperName || b.bazarKari || ''),
    managerId: String(b.managerId || ''),
    createdAt: String(b.createdAt || new Date().toISOString()),
  }));


  const expenses = (raw.expenses || []).map((e: any) => ({
    id: String(e.id),
    yearMonth: normalizeYearMonth(e.yearMonth),
    category: e.category as any,
    memberId: e.memberId ? String(e.memberId) : undefined,
    amount: Number(e.amount || 0),
    updatedAt: String(e.updatedAt || new Date().toISOString()),
  }));

  const deposits = (raw.deposits || []).map((d: any) => ({
    id: String(d.id),
    memberId: String(d.memberId),
    yearMonth: normalizeYearMonth(d.yearMonth),
    date: String(d.date || ''),
    amount: Number(d.amount || 0),
    note: String(d.note || ''),
    createdAt: String(d.createdAt || new Date().toISOString()),
  }));

  const monthLocks = (raw.monthLocks || []).map((l: any) => {
    let ids: string[] = [];
    if (Array.isArray(l.managerIds)) {
      ids = l.managerIds.map((id: any) => String(id)).filter(Boolean);
    } else if (l.managerIds && typeof l.managerIds === 'string') {
      ids = l.managerIds.split(',').map((id: string) => id.trim()).filter(Boolean);
    } else if (l.managerId) {
      ids = [String(l.managerId).trim()];
    }

    return {
      id: String(l.id),
      yearMonth: normalizeYearMonth(l.yearMonth),
      status: l.status as any,
      managerId: ids[0] || (l.managerId ? String(l.managerId) : undefined),
      managerIds: ids,
      lockedBy: String(l.lockedBy || ''),
      lockedAt: String(l.lockedAt || new Date().toISOString()),
    };
  });

  const settlements = (raw.settlements || []).map((s: any) => ({
    id: String(s.id),
    memberId: String(s.memberId),
    yearMonth: normalizeYearMonth(s.yearMonth),
    type: s.type as any,
    amount: Number(s.amount || 0),
    date: String(s.date || ''),
    recordedBy: String(s.recordedBy || ''),
    note: String(s.note || ''),
    createdAt: String(s.createdAt || new Date().toISOString()),
  }));

  const securityTokens = (raw.securityTokens || []).map((st: any) => ({
    id: String(st.id),
    email: String(st.email || ''),
    code: String(st.code || ''),
    createdAt: String(st.createdAt || new Date().toISOString()),
    expiresAt: String(st.expiresAt || ''),
    status: st.status as any,
  }));

  const auditLogs = (raw.auditLogs || []).map((a: any) => ({
    id: String(a.id),
    userId: String(a.userId || ''),
    userName: String(a.userName || ''),
    action: String(a.action || ''),
    details: String(a.details || ''),
    timestamp: String(a.timestamp || new Date().toISOString()),
  }));

  const mealRequests = (raw.mealRequests || []).map((mr: any) => ({
    id: String(mr.id),
    memberId: String(mr.memberId),
    yearMonth: normalizeYearMonth(mr.yearMonth),
    date: String(mr.date || ''),
    day: Number(mr.day || 1),
    breakfast: Boolean(mr.breakfast),
    lunch: Boolean(mr.lunch),
    dinner: Boolean(mr.dinner),
    guestCount: Number(mr.guestCount || 0),
    guestBreakfast: mr.guestBreakfast !== undefined ? Number(mr.guestBreakfast) : undefined,
    guestLunch: mr.guestLunch !== undefined ? Number(mr.guestLunch) : undefined,
    guestDinner: mr.guestDinner !== undefined ? Number(mr.guestDinner) : undefined,
    note: String(mr.note || ''),
    updatedAt: String(mr.updatedAt || new Date().toISOString()),
  }));

  const dailyMealLocks = (raw.dailyMealLocks || []).map((dml: any) => ({
    date: String(dml.date || ''),
    yearMonth: normalizeYearMonth(dml.yearMonth),
    isLocked: Boolean(dml.isLocked),
    breakfastLocked: dml.breakfastLocked !== undefined ? Boolean(dml.breakfastLocked) : Boolean(dml.isLocked),
    lunchLocked: dml.lunchLocked !== undefined ? Boolean(dml.lunchLocked) : Boolean(dml.isLocked),
    dinnerLocked: dml.dinnerLocked !== undefined ? Boolean(dml.dinnerLocked) : Boolean(dml.isLocked),
    lockedBy: String(dml.lockedBy || ''),
    lockedAt: String(dml.lockedAt || new Date().toISOString()),
    bValue: dml.bValue !== undefined ? Number(dml.bValue) : undefined,
    lValue: dml.lValue !== undefined ? Number(dml.lValue) : undefined,
    dValue: dml.dValue !== undefined ? Number(dml.dValue) : undefined,
    gbValue: dml.gbValue !== undefined ? Number(dml.gbValue) : undefined,
    glValue: dml.glValue !== undefined ? Number(dml.glValue) : undefined,
    gdValue: dml.gdValue !== undefined ? Number(dml.gdValue) : undefined,
  }));

  return {
    members,
    meals,
    bazarEntries,
    expenses,
    deposits,
    monthLocks,
    settlements,
    securityTokens,
    auditLogs,
    mealRequests,
    dailyMealLocks,
  };
}
