const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

// 33 Bengali Member Names
const MEMBER_NAMES = [
  'Tanvir Ahmed',     // 1: Manager for 2026-07
  'Rafiqul Islam',    // 2: Manager for 2026-08
  'Mehedi Hasan',     // 3: Manager for 2026-09
  'Shakil Mahmud',    // 4
  'Tariqul Islam',    // 5
  'Ashraful Alam',    // 6
  'Arif Hossain',     // 7
  'Kamrul Hasan',     // 8
  'Farhan Sadik',     // 9
  'Sajid Rahman',     // 10
  'Mahmudul Hasan',   // 11
  'Nahid Parvez',     // 12
  'Imran Nazir',      // 13
  'Hasanuzzaman',     // 14
  'Shahriar Kabir',   // 15
  'Zubayer Ahmed',    // 16
  'Mostafa Kamal',    // 17
  'Rayhan Chowdhury', // 18
  'Salman Farsi',     // 19
  'Naimur Rahman',    // 20
  'Fahim Montasir',   // 21
  'Rashedul Karim',   // 22
  'Mahfuzur Rahman',  // 23
  'Enamul Haque',     // 24
  'Saiful Islam',     // 25
  'Ziaur Rahman',     // 26
  'Mizanur Rahman',   // 27
  'Anisur Rahman',    // 28
  'Towhidul Islam',   // 29: Leave in Month 2
  'Golam Rabbani',    // 30: Leave in Month 2
  'Abdullah Al Mamun',// 31: Joined Month 3
  'Zahid Hasan',      // 32: Joined Month 3
  'Kazi Nazrul'       // 33: Joined Month 3
];

const BAZAR_ITEMS = [
  'Beef 4kg & Potatoes', 'Rui Fish 5kg & Vegetables', 'Miniket Rice 50kg',
  'Chicken 6kg & Masala', 'Soybean Oil 5L & Onions', 'Hilsha Fish 3kg & Mustard',
  'Lentils (Dal) 5kg & Eggs 4 Dozen', 'Fresh Vegetables & Green Chilies',
  'Pangash Fish 6kg & Spices', 'Broiler Chicken 8kg & Ginger/Garlic',
  'Mutton 3kg & Polao Rice', 'Rohu Fish 4kg & Tomato/Cucumber',
  'Atta 10kg, Sugar & Tea', 'Egg 5 Dozen & Potato 10kg',
  'Katla Fish 5kg & Coriander', 'Beef 3kg & Lentils 4kg',
  'Chicken 7kg & Salt/Oil', 'Fish & Vegetables Special Bazar'
];

async function generateData() {
  console.log('Generating realistic 3-month dataset...');

  const adminPassword = 'admin123';
  const memberPassword = 'member123';

  // 1. Members
  const members = [
    {
      id: 'user-superadmin',
      memberId: 'ADM-2026-000',
      name: 'Super Admin',
      phone: '01700000000',
      email: 'admin@mess.com',
      roomNo: '000',
      role: 'SUPER_ADMIN',
      status: 'APPROVED',
      joinDate: '2026-06-01',
      passwordHash: adminPassword,
      createdAt: '2026-06-01T00:00:00.000Z'
    }
  ];

  for (let i = 0; i < MEMBER_NAMES.length; i++) {
    const idx = i + 1;
    const pad = String(idx).padStart(3, '0');
    const roomNum = 100 + Math.floor(i / 3) * 10 + ((i % 3) + 1);
    const joinDate = idx <= 30 ? '2026-07-01' : '2026-09-01';
    
    // Active role in system: Member 3 is active manager for September (2026-09)
    const role = idx === 3 ? 'MANAGER' : 'MEMBER';

    members.push({
      id: `user-mem-${pad}`,
      memberId: `MLL-2026-${pad}`,
      name: MEMBER_NAMES[i],
      phone: `01711000${pad}`,
      email: `member${pad}@mess.com`,
      roomNo: String(roomNum),
      role: role,
      status: 'APPROVED',
      joinDate: joinDate,
      passwordHash: memberPassword,
      createdAt: `${joinDate}T00:00:00.000Z`
    });
  }

  // 2. Month Locks with separate managers
  // Month 1 (2026-07): Manager 1 (user-mem-001) - CLOSED
  // Month 2 (2026-08): Manager 2 (user-mem-002) - CLOSED
  // Month 3 (2026-09): Manager 3 (user-mem-003) - RUNNING
  const monthLocks = [
    {
      id: 'lock-2026-07',
      yearMonth: '2026-07',
      status: 'CLOSED',
      managerId: 'user-mem-001',
      lockedBy: 'Super Admin',
      lockedAt: '2026-08-01T00:00:00.000Z'
    },
    {
      id: 'lock-2026-08',
      yearMonth: '2026-08',
      status: 'CLOSED',
      managerId: 'user-mem-002',
      lockedBy: 'Super Admin',
      lockedAt: '2026-09-01T00:00:00.000Z'
    },
    {
      id: 'lock-2026-09',
      yearMonth: '2026-09',
      status: 'RUNNING',
      managerId: 'user-mem-003',
      lockedBy: 'Super Admin',
      lockedAt: '2026-09-01T00:00:00.000Z'
    }
  ];

  const meals = [];
  const bazarEntries = [];
  const expenses = [];
  const deposits = [];
  const settlements = [];

  // Helper for deterministic pseudo-random values
  let seed = 42;
  function pseudoRandom() {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  }

  // ==========================================
  // MONTH 1: 2026-07 (30 members, 31 days)
  // ==========================================
  const month1Members = members.slice(1, 31); // idx 1 to 30 = 30 members
  const m1Days = 31;
  const m1Manager = 'user-mem-001';

  // Meals for Month 1
  for (const mem of month1Members) {
    for (let d = 1; d <= m1Days; d++) {
      const rand = pseudoRandom();
      let count = 2; // base 2 meals (lunch + dinner)
      if (rand < 0.1) count = 0; // skipped
      else if (rand < 0.25) count = 1; // only lunch or dinner
      else if (rand < 0.45) count = 1.5; // breakfast + lunch
      else if (rand < 0.75) count = 2; // lunch + dinner
      else if (rand < 0.92) count = 2.5; // breakfast + lunch + dinner
      else count = 3; // guest meal

      meals.push({
        id: `meal-2026-07-${mem.id}-${d}`,
        memberId: mem.id,
        yearMonth: '2026-07',
        day: d,
        mealCount: count,
        updatedAt: `2026-07-${String(d).padStart(2, '0')}T21:00:00.000Z`
      });
    }
  }

  // Bazar for Month 1 (about 20 purchases totaling ~54,000 BDT)
  const m1BazarDays = [1, 2, 4, 6, 7, 9, 11, 13, 14, 16, 18, 19, 21, 23, 25, 26, 28, 29, 30, 31];
  for (let i = 0; i < m1BazarDays.length; i++) {
    const d = m1BazarDays[i];
    const amount = 1800 + Math.floor(pseudoRandom() * 1900); // 1800 - 3700 BDT
    const desc = BAZAR_ITEMS[i % BAZAR_ITEMS.length];
    bazarEntries.push({
      id: `bazar-2026-07-${i + 1}`,
      yearMonth: '2026-07',
      date: `2026-07-${String(d).padStart(2, '0')}`,
      amount: amount,
      description: desc,
      managerId: m1Manager,
      createdAt: `2026-07-${String(d).padStart(2, '0')}T10:00:00.000Z`
    });
  }

  // Utilities for Month 1 (30 members)
  expenses.push(
    { id: 'exp-2026-07-khala', yearMonth: '2026-07', category: 'KHALA_BILL', amount: 6000, description: 'Khala cooking bill (30 members x 200)', updatedAt: '2026-07-25T00:00:00.000Z' },
    { id: 'exp-2026-07-gas', yearMonth: '2026-07', category: 'GAS_BILL', amount: 3000, description: 'LPG Gas cylinder bill (30 members x 100)', updatedAt: '2026-07-25T00:00:00.000Z' },
    { id: 'exp-2026-07-extra', yearMonth: '2026-07', category: 'EXTRA_COST', amount: 1500, description: 'Trash & maintenance (30 members x 50)', updatedAt: '2026-07-25T00:00:00.000Z' }
  );

  // Deposits for Month 1
  for (let i = 0; i < month1Members.length; i++) {
    const mem = month1Members[i];
    const depositAmt = 2400 + (i % 5) * 150; // 2400 - 3000 BDT
    deposits.push({
      id: `dep-2026-07-${mem.id}-1`,
      memberId: mem.id,
      yearMonth: '2026-07',
      date: '2026-07-03',
      amount: depositAmt,
      note: 'Initial Month Deposit',
      createdAt: '2026-07-03T11:00:00.000Z'
    });
  }

  // ==========================================
  // MONTH 2: 2026-08 (28 members, 31 days)
  // (Members 29 and 30 on full leave: 0 meals, 0 deposits)
  // ==========================================
  const month2Members = members.slice(1, 29); // idx 1 to 28 = 28 members
  const m2Days = 31;
  const m2Manager = 'user-mem-002'; // Rafiqul Islam

  // Meals for Month 2
  for (const mem of month2Members) {
    for (let d = 1; d <= m2Days; d++) {
      const rand = pseudoRandom();
      let count = 2;
      if (rand < 0.1) count = 0;
      else if (rand < 0.25) count = 1;
      else if (rand < 0.45) count = 1.5;
      else if (rand < 0.75) count = 2;
      else if (rand < 0.92) count = 2.5;
      else count = 3;

      meals.push({
        id: `meal-2026-08-${mem.id}-${d}`,
        memberId: mem.id,
        yearMonth: '2026-08',
        day: d,
        mealCount: count,
        updatedAt: `2026-08-${String(d).padStart(2, '0')}T21:00:00.000Z`
      });
    }
  }

  // Bazar for Month 2 (about 20 purchases totaling ~50,000 BDT)
  const m2BazarDays = [1, 3, 4, 6, 8, 9, 11, 13, 15, 16, 18, 20, 22, 23, 25, 27, 28, 29, 30, 31];
  for (let i = 0; i < m2BazarDays.length; i++) {
    const d = m2BazarDays[i];
    const amount = 1700 + Math.floor(pseudoRandom() * 1800); // 1700 - 3500 BDT
    const desc = BAZAR_ITEMS[(i + 4) % BAZAR_ITEMS.length];
    bazarEntries.push({
      id: `bazar-2026-08-${i + 1}`,
      yearMonth: '2026-08',
      date: `2026-08-${String(d).padStart(2, '0')}`,
      amount: amount,
      description: desc,
      managerId: m2Manager,
      createdAt: `2026-08-${String(d).padStart(2, '0')}T10:00:00.000Z`
    });
  }

  // Utilities for Month 2 (28 members)
  expenses.push(
    { id: 'exp-2026-08-khala', yearMonth: '2026-08', category: 'KHALA_BILL', amount: 5600, description: 'Khala cooking bill (28 members x 200)', updatedAt: '2026-08-25T00:00:00.000Z' },
    { id: 'exp-2026-08-gas', yearMonth: '2026-08', category: 'GAS_BILL', amount: 2800, description: 'LPG Gas cylinder bill (28 members x 100)', updatedAt: '2026-08-25T00:00:00.000Z' },
    { id: 'exp-2026-08-extra', yearMonth: '2026-08', category: 'EXTRA_COST', amount: 1400, description: 'Trash & maintenance (28 members x 50)', updatedAt: '2026-08-25T00:00:00.000Z' }
  );

  // Deposits for Month 2
  for (let i = 0; i < month2Members.length; i++) {
    const mem = month2Members[i];
    const depositAmt = 2300 + (i % 5) * 150;
    deposits.push({
      id: `dep-2026-08-${mem.id}-1`,
      memberId: mem.id,
      yearMonth: '2026-08',
      date: '2026-08-02',
      amount: depositAmt,
      note: 'Initial Month Deposit',
      createdAt: '2026-08-02T11:00:00.000Z'
    });
  }

  // ==========================================
  // MONTH 3: 2026-09 (33 members, EXACTLY 15 days elapsed!)
  // ==========================================
  const month3Members = members.slice(1); // all 33 members (idx 1 to 33)
  const m3Days = 15; // EXACTLY 15 DAYS!
  const m3Manager = 'user-mem-003'; // Mehedi Hasan

  // Meals for Month 3 (Days 1 to 15 only)
  for (const mem of month3Members) {
    for (let d = 1; d <= m3Days; d++) {
      const rand = pseudoRandom();
      let count = 2;
      if (rand < 0.1) count = 0;
      else if (rand < 0.25) count = 1;
      else if (rand < 0.45) count = 1.5;
      else if (rand < 0.75) count = 2;
      else if (rand < 0.92) count = 2.5;
      else count = 3;

      meals.push({
        id: `meal-2026-09-${mem.id}-${d}`,
        memberId: mem.id,
        yearMonth: '2026-09',
        day: d,
        mealCount: count,
        updatedAt: `2026-09-${String(d).padStart(2, '0')}T21:00:00.000Z`
      });
    }
  }

  // Bazar for Month 3 (Days 1 to 15 only: 10 purchases totaling ~28,000 BDT)
  const m3BazarDays = [1, 2, 4, 6, 7, 9, 11, 12, 14, 15];
  for (let i = 0; i < m3BazarDays.length; i++) {
    const d = m3BazarDays[i];
    const amount = 2200 + Math.floor(pseudoRandom() * 1200); // 2200 - 3400 BDT
    const desc = BAZAR_ITEMS[(i + 7) % BAZAR_ITEMS.length];
    bazarEntries.push({
      id: `bazar-2026-09-${i + 1}`,
      yearMonth: '2026-09',
      date: `2026-09-${String(d).padStart(2, '0')}`,
      amount: amount,
      description: desc,
      managerId: m3Manager,
      createdAt: `2026-09-${String(d).padStart(2, '0')}T10:00:00.000Z`
    });
  }

  // Utilities for Month 3 (33 members)
  expenses.push(
    { id: 'exp-2026-09-khala', yearMonth: '2026-09', category: 'KHALA_BILL', amount: 6600, description: 'Khala cooking bill (33 members x 200)', updatedAt: '2026-09-05T00:00:00.000Z' },
    { id: 'exp-2026-09-gas', yearMonth: '2026-09', category: 'GAS_BILL', amount: 3300, description: 'LPG Gas cylinder bill (33 members x 100)', updatedAt: '2026-09-05T00:00:00.000Z' },
    { id: 'exp-2026-09-extra', yearMonth: '2026-09', category: 'EXTRA_COST', amount: 1650, description: 'Trash & maintenance (33 members x 50)', updatedAt: '2026-09-05T00:00:00.000Z' }
  );

  // Deposits for Month 3 (all 33 members deposited in early September)
  for (let i = 0; i < month3Members.length; i++) {
    const mem = month3Members[i];
    const depositAmt = 2500;
    deposits.push({
      id: `dep-2026-09-${mem.id}-1`,
      memberId: mem.id,
      yearMonth: '2026-09',
      date: '2026-09-02',
      amount: depositAmt,
      note: 'September Initial Deposit',
      createdAt: '2026-09-02T11:00:00.000Z'
    });
  }

  // Audit Logs
  const auditLogs = [
    {
      id: 'audit-1',
      userId: 'user-superadmin',
      userName: 'Super Admin',
      action: 'SYSTEM_INITIALIZATION',
      details: 'System initialized with 3 consecutive accounting cycles (2026-07, 2026-08, 2026-09).',
      timestamp: new Date().toISOString()
    },
    {
      id: 'audit-2',
      userId: 'user-superadmin',
      userName: 'Super Admin',
      action: 'ASSIGN_MONTH_MANAGER',
      details: 'Assigned Tanvir Ahmed as Manager for month 2026-07.',
      timestamp: '2026-07-01T00:00:00.000Z'
    },
    {
      id: 'audit-3',
      userId: 'user-superadmin',
      userName: 'Super Admin',
      action: 'ASSIGN_MONTH_MANAGER',
      details: 'Assigned Rafiqul Islam as Manager for month 2026-08.',
      timestamp: '2026-08-01T00:00:00.000Z'
    },
    {
      id: 'audit-4',
      userId: 'user-superadmin',
      userName: 'Super Admin',
      action: 'ASSIGN_MONTH_MANAGER',
      details: 'Assigned Mehedi Hasan as Manager for month 2026-09.',
      timestamp: '2026-09-01T00:00:00.000Z'
    }
  ];

  const db = {
    members,
    meals,
    bazarEntries,
    expenses,
    deposits,
    monthLocks,
    settlements,
    securityTokens: [],
    auditLogs
  };

  // Write local database.json
  const dbPath = path.join(process.cwd(), 'database.json');
  fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), 'utf-8');
  console.log(`✅ Saved ${members.length} members, ${meals.length} meal entries, ${bazarEntries.length} bazar entries, ${deposits.length} deposits to database.json`);

  // Sync to Google Sheet via GAS
  const gasUrl = process.env.GAS_API_URL || 'https://script.google.com/macros/s/AKfycbzrMAzwz8YawU09vBIh0xopzVDbghs1Y3tbUbWgB468wSr2yUf63bM8FaWuEX50Uy-Q/exec';
  const gasKey = process.env.GAS_API_KEY || 'MILL_SECRET_KEY_2026';

  console.log(`\nInitiating Google Sheet sync to:\n${gasUrl}`);
  try {
    const url = gasUrl.includes('?') 
      ? `${gasUrl}&key=${encodeURIComponent(gasKey)}` 
      : `${gasUrl}?key=${encodeURIComponent(gasKey)}`;

    const res = await fetch(url, {
      method: 'POST',
      redirect: 'follow',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: 'syncFullData', apiKey: gasKey, db })
    });

    const text = await res.text();
    console.log('GAS Sync Response Status:', res.status);
    console.log('GAS Sync Output:', text.substring(0, 300));
  } catch (err) {
    console.error('GAS Sync Error:', err);
  }
}

generateData().catch(console.error);
