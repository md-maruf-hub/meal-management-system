import { calculateMonthlyReport } from '../lib/calculations';
import { Member, MealEntry, BazarEntry, ExpenseItem, Deposit } from '../lib/types';

console.log("=== Testing Mill Management System Calculation Engine ===");

const yearMonth = "2026-08";

// 1. Members
const members: Member[] = [
  {
    id: "mem-1",
    memberId: "MLL-2026-001",
    name: "Nur-Alam",
    phone: "01700000001",
    roomNo: "101",
    status: "APPROVED",
    role: "MEMBER",
    joinDate: "2026-01-01",
    createdAt: new Date().toISOString(),
  },
  {
    id: "mem-2",
    memberId: "MLL-2026-002",
    name: "Rajon",
    phone: "01700000002",
    roomNo: "102",
    status: "APPROVED",
    role: "MEMBER",
    joinDate: "2026-01-01",
    createdAt: new Date().toISOString(),
  },
];

// 2. Meals setup (Total 423 meals split across members: Nur-Alam 61 meals + others/Rajon 35.5 meals)
const meals: MealEntry[] = [
  { id: "m1", memberId: "mem-1", yearMonth, day: 1, mealCount: 61, updatedAt: new Date().toISOString() },
  { id: "m2", memberId: "mem-2", yearMonth, day: 1, mealCount: 35.5, updatedAt: new Date().toISOString() },
];

members.push({
  id: "mem-3",
  memberId: "MLL-2026-003",
  name: "Other Members",
  phone: "01700000003",
  roomNo: "103",
  status: "APPROVED",
  role: "MEMBER",
  joinDate: "2026-01-01",
  createdAt: new Date().toISOString(),
});
meals.push({ id: "m3", memberId: "mem-3", yearMonth, day: 1, mealCount: 326.5, updatedAt: new Date().toISOString() });

// 3. Bazar Cost total = 16948
const bazarEntries: BazarEntry[] = [
  { id: "b1", yearMonth, date: "2026-08-01", amount: 16948, description: "Monthly Total Bazar", managerId: "mgr-1", createdAt: new Date().toISOString() }
];

// 4. Utility Expenses for each member = 307.559 per member
const expenses: ExpenseItem[] = [
  { id: "e1", yearMonth, category: "KHALA_BILL", amount: 922.677, updatedAt: new Date().toISOString() }
];

// 5. Deposits: Nur-Alam = 2580, Rajon = 2000
const deposits: Deposit[] = [
  { id: "d1", memberId: "mem-1", yearMonth, date: "2026-08-05", amount: 2580, createdAt: new Date().toISOString() },
  { id: "d2", memberId: "mem-2", yearMonth, date: "2026-08-05", amount: 2000, createdAt: new Date().toISOString() },
];

const report = calculateMonthlyReport("2026-08", members, meals, bazarEntries, expenses, deposits);

console.log("Total Meals:", report.totalMeals);
console.log("Total Bazar:", report.totalBazar);
console.log("Mill Rate:", report.millRate);

const nurAlam = report.memberCalculations.find((m) => m.memberName === "Nur-Alam");
const rajon = report.memberCalculations.find((m) => m.memberName === "Rajon");

console.log("\nNur-Alam:", {
  meals: nurAlam?.meals,
  totalCost: nurAlam?.totalCost,
  deposit: nurAlam?.deposit,
  dueAmount: nurAlam?.dueAmount,
});

console.log("\nRajon:", {
  meals: rajon?.meals,
  totalCost: rajon?.totalCost,
  deposit: rajon?.deposit,
  refundAmount: rajon?.refundAmount,
});

const passTotalMeals = report.totalMeals === 423;
const passTotalBazar = report.totalBazar === 16948;
const passMillRate = Math.abs(report.millRate - 40.066) < 0.01;
const passNurAlamCost = Math.abs((nurAlam?.totalCost || 0) - 2751.597) < 0.1;
const passNurAlamGive = Math.abs((nurAlam?.dueAmount || 0) - 171.597) < 0.1;
const passRajonCost = Math.abs((rajon?.totalCost || 0) - 1729.914) < 0.1;
const passRajonReceive = Math.abs((rajon?.refundAmount || 0) - 270.086) < 0.1;

if (passTotalMeals && passTotalBazar && passMillRate && passNurAlamCost && passNurAlamGive && passRajonCost && passRajonReceive) {
  console.log("\n✅ ALL CALCULATION VERIFICATION TESTS PASSED!");
} else {
  console.log("\n❌ VERIFICATION TEST MISMATCH DETECTED!");
}
