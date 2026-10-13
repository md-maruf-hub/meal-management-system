import { hashPassword } from '../lib/password';
import { DatabaseSchema, writeDb } from '../lib/db/local-storage';

const GAS_API_URL = "https://script.google.com/macros/s/AKfycbzQt3CgFoPdf0VzmhvMR21b4ChoJtS1QwcsC-SSPgTIxIerZH8JYbBeqdrn8z8FRSGoag/exec";
const GAS_API_KEY = "MILL_SECRET_KEY_2026";

async function clearAllData() {
  console.log("=== Clearing All Data from Google Sheets & Database ===");

  const adminHash = hashPassword('admin123');

  const cleanDb: DatabaseSchema = {
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
        passwordHash: adminHash,
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
    auditLogs: [
      {
        id: 'audit-clear-1',
        userId: 'user-superadmin',
        userName: 'Super Admin',
        action: 'SYSTEM_WIPE',
        details: 'All member records, meal entries, bazar purchases, deposits, and utility expenses cleared upon request.',
        timestamp: new Date().toISOString(),
      },
    ],
  };

  writeDb(cleanDb);
  console.log("Local database.json reset to clean state (Super Admin only).");

  try {
    console.log("Syncing clean state to Google Sheets...");
    const res = await fetch(`${GAS_API_URL}?key=${encodeURIComponent(GAS_API_KEY)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        action: 'syncFullData',
        apiKey: GAS_API_KEY,
        db: cleanDb,
      }),
    });

    const json = await res.json();
    console.log("Google Sheets Reset Response:", json);
  } catch (err) {
    console.warn("Google Sheets sync skipped/failed.");
  }
}

clearAllData();
