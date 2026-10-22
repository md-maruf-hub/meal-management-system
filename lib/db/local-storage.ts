import fs from 'fs';
import path from 'path';
import { Member, MealEntry, BazarEntry, ExpenseItem, Deposit, MonthLock, SettlementEntry, SecurityToken, AuditLog, MealRequest, DailyMealLock, ManagerNote, StoreNote } from '../types';

const DB_FILE = process.env.VERCEL
  ? path.join('/tmp', 'database.json')
  : path.join(process.cwd(), 'database.json');

export interface DatabaseSchema {
  members: Member[];
  meals: MealEntry[];
  bazarEntries: BazarEntry[];
  expenses: ExpenseItem[];
  deposits: Deposit[];
  monthLocks: MonthLock[];
  settlements?: SettlementEntry[];
  securityTokens?: SecurityToken[];
  auditLogs: AuditLog[];
  mealRequests?: MealRequest[];
  dailyMealLocks?: DailyMealLock[];
  managerNotes?: ManagerNote[];
  storeNote?: StoreNote;
  config?: {
    gasUrl?: string;
    gasApiKey?: string;
    masterPin?: string;
  };
}

export function getInitialData(): DatabaseSchema {
  return {
    members: [
      {
        id: 'user-superadmin',
        memberId: 'ADM-2026-000',
        name: 'Super Admin',
        phone: '01700000000',
        email: 'admin@mess.com',
        roomNo: '000',
        role: 'SUPER_ADMIN',
        status: 'APPROVED',
        joinDate: new Date().toISOString().split('T')[0],
        passwordHash: 'admin123',
        createdAt: new Date().toISOString(),
      },
    ],
    meals: [],
    bazarEntries: [],
    expenses: [],
    deposits: [],
    monthLocks: [],
    settlements: [],
    securityTokens: [],
    mealRequests: [],
    dailyMealLocks: [],
    auditLogs: [
      {
        id: 'audit-1',
        userId: 'user-superadmin',
        userName: 'Super Admin',
        action: 'SYSTEM_INITIALIZATION',
        details: 'System initialized cleanly without mills overhead.',
        timestamp: new Date().toISOString(),
      },
    ],
    config: {
      gasUrl: process.env.GAS_API_URL || '',
      gasApiKey: process.env.GAS_API_KEY || 'MILL_SECRET_KEY_2026',
      masterPin: '2026',
    },
  };
}

export function readDb(): DatabaseSchema {
  try {
    if (!fs.existsSync(DB_FILE)) {
      const initial = getInitialData();
      writeDb(initial);
      return initial;
    }
    const data = fs.readFileSync(DB_FILE, 'utf-8');
    const parsed = JSON.parse(data);
    if (!parsed.settlements) parsed.settlements = [];
    if (!parsed.securityTokens) parsed.securityTokens = [];
    if (!parsed.mealRequests) parsed.mealRequests = [];
    if (!parsed.dailyMealLocks) parsed.dailyMealLocks = [];
    if (!parsed.config) {
      parsed.config = {
        gasUrl: process.env.GAS_API_URL || '',
        gasApiKey: process.env.GAS_API_KEY || 'MILL_SECRET_KEY_2026',
        masterPin: '2026',
      };
    }
    return parsed;
  } catch (error) {
    return getInitialData();
  }
}

export function writeDb(data: DatabaseSchema): void {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (error) {
    console.error('Error writing database file:', error);
  }
}
