import { hashPassword } from '../lib/password';
import { DatabaseSchema, writeDb } from '../lib/db/local-storage';

const GAS_API_URL = "https://script.google.com/macros/s/AKfycbzQt3CgFoPdf0VzmhvMR21b4ChoJtS1QwcsC-SSPgTIxIerZH8JYbBeqdrn8z8FRSGoag/exec";
const GAS_API_KEY = "MILL_SECRET_KEY_2026";

async function seedMultiMonthData() {
  console.log("=== Populating Multi-Month Data (2026-07 & 2026-08) & Syncing to Google Sheets ===");

  const passHash = hashPassword('password123');
  const adminHash = hashPassword('admin123');
  const managerHash = hashPassword('manager123');

  const memberList = [
    { name: 'NUR-ALAM', roomNo: '101', phone: '01700000001', memberId: 'MLL-2026-001' },
    { name: 'JIHAD', roomNo: '102', phone: '01700000002', memberId: 'MLL-2026-002' },
    { name: 'MUHAIMINUL', roomNo: '103', phone: '01700000003', memberId: 'MLL-2026-003' },
    { name: 'REZAUL', roomNo: '104', phone: '01700000004', memberId: 'MLL-2026-004' },
    { name: 'SHAWON', roomNo: '105', phone: '01700000005', memberId: 'MLL-2026-005' },
    { name: 'MASUD', roomNo: '106', phone: '01700000006', memberId: 'MLL-2026-006' },
    { name: 'RAJON', roomNo: '107', phone: '01700000007', memberId: 'MLL-2026-007' },
    { name: 'MARUF', roomNo: '108', phone: '01700000008', memberId: 'MLL-2026-008' },
    { name: 'NIROB', roomNo: '109', phone: '01700000009', memberId: 'MLL-2026-009' },
    { name: 'SAKHAWAT', roomNo: '110', phone: '01700000010', memberId: 'MLL-2026-010' },
  ];

  const membersData = [
    {
      id: 'user-superadmin',
      memberId: 'ADM-2026-000',
      name: 'Super Admin',
      phone: '01700000000',
      email: 'admin@mess.com',
      roomNo: '000',
      role: 'SUPER_ADMIN' as const,
      status: 'APPROVED' as const,
      joinDate: '2026-07-01',
      passwordHash: adminHash,
      createdAt: new Date().toISOString(),
    },
    ...memberList.map((m, idx) => ({
      id: `mem-${idx + 1}`,
      memberId: m.memberId,
      name: m.name,
      phone: m.phone,
      email: `${m.name.toLowerCase()}@mess.com`,
      roomNo: m.roomNo,
      role: idx === 0 ? ('MANAGER' as const) : ('MEMBER' as const),
      status: 'APPROVED' as const,
      joinDate: '2026-07-01',
      passwordHash: idx === 0 ? managerHash : passHash,
      createdAt: new Date().toISOString(),
    })),
  ];

  const mealsData: any[] = [];
  const months = ['2026-07', '2026-08'];

  months.forEach((ym) => {
    memberList.forEach((m, idx) => {
      const memberId = `mem-${idx + 1}`;
      const daysCount = ym === '2026-07' ? 31 : 18;
      for (let day = 1; day <= daysCount; day++) {
        const count = (day % 3 === 0) ? 2.5 : (day % 2 === 0) ? 2.0 : 1.5;
        mealsData.push({
          id: `meal-${ym}-${memberId}-${day}`,
          memberId,
          yearMonth: ym,
          day,
          mealCount: count,
          updatedAt: new Date().toISOString(),
        });
      }
    });
  });

  const bazarEntries = [
    {
      id: 'bazar-jul-1',
      yearMonth: '2026-07',
      date: '2026-07-05',
      amount: 5200,
      description: 'July Rice, Oil & Spices',
      managerId: 'mem-1',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'bazar-jul-2',
      yearMonth: '2026-07',
      date: '2026-07-18',
      amount: 6800,
      description: 'July Beef, Chicken & Fish',
      managerId: 'mem-1',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'bazar-aug-1',
      yearMonth: '2026-08',
      date: '2026-08-02',
      amount: 4500,
      description: 'August Rice, Oil, Spices & Onions',
      managerId: 'mem-1',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'bazar-aug-2',
      yearMonth: '2026-08',
      date: '2026-08-08',
      amount: 5800,
      description: 'August Chicken, Fish & Vegetables',
      managerId: 'mem-1',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'bazar-aug-3',
      yearMonth: '2026-08',
      date: '2026-08-15',
      amount: 6648,
      description: 'August Beef, Fish & Gas Refill',
      managerId: 'mem-1',
      createdAt: new Date().toISOString(),
    },
  ];

  const expenses = [
    { id: 'exp-jul-1', yearMonth: '2026-07', category: 'KHALA_BILL' as const, amount: 3000, updatedAt: new Date().toISOString() },
    { id: 'exp-jul-2', yearMonth: '2026-07', category: 'GAS_BILL' as const, amount: 1400, updatedAt: new Date().toISOString() },
    { id: 'exp-aug-1', yearMonth: '2026-08', category: 'KHALA_BILL' as const, amount: 3000, updatedAt: new Date().toISOString() },
    { id: 'exp-aug-2', yearMonth: '2026-08', category: 'GAS_BILL' as const, amount: 1500, updatedAt: new Date().toISOString() },
    { id: 'exp-aug-3', yearMonth: '2026-08', category: 'EXTRA_COST' as const, amount: 800, updatedAt: new Date().toISOString() },
  ];

  const deposits: any[] = [];
  months.forEach((ym) => {
    memberList.forEach((m, idx) => {
      deposits.push({
        id: `dep-${ym}-${idx + 1}`,
        memberId: `mem-${idx + 1}`,
        yearMonth: ym,
        date: ym === '2026-07' ? '2026-07-02' : '2026-08-03',
        amount: idx % 2 === 0 ? 3000 : 2500,
        note: `Mess Deposit for ${ym}`,
        createdAt: new Date().toISOString(),
      });
    });
  });

  const fullDb: DatabaseSchema = {
    members: membersData,
    meals: mealsData,
    bazarEntries,
    expenses,
    deposits,
    monthLocks: [
      {
        id: 'lock-jul-1',
        yearMonth: '2026-07',
        status: 'CLOSED',
        managerId: 'mem-1',
        lockedBy: 'user-superadmin',
        lockedAt: '2026-08-01T00:00:00.000Z',
      },
    ],
    settlements: [],
    securityTokens: [],
    auditLogs: [
      {
        id: 'audit-multimonth-1',
        userId: 'user-superadmin',
        userName: 'Super Admin',
        action: 'MULTI_MONTH_SYNC',
        details: `Populated multi-month data for 2026-07 (CLOSED) and 2026-08 (RUNNING) with month-specific visual tabs in Google Sheets.`,
        timestamp: new Date().toISOString(),
      },
    ],
  };

  writeDb(fullDb);
  console.log("Local database.json updated with multi-month dataset.");

  try {
    console.log("Syncing multi-month data and generating dynamic monthly tabs in Google Sheets...");
    const res = await fetch(`${GAS_API_URL}?key=${encodeURIComponent(GAS_API_KEY)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        action: 'syncFullData',
        apiKey: GAS_API_KEY,
        db: fullDb,
      }),
    });

    const json = await res.json();
    console.log("Google Sheets Response:", json);
  } catch (err) {
    console.warn("GAS sync skipped/failed.");
  }
}

seedMultiMonthData();
