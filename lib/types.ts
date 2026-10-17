export type UserRole = 'SUPER_ADMIN' | 'MANAGER' | 'MEMBER';

export type UserStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'INACTIVE';

export type MonthStatus = 'RUNNING' | 'CLOSED';

export interface Member {
  id: string;
  memberId: string; // e.g. MLL-2026-001
  name: string;
  phone: string;
  roomNo: string;
  email?: string;
  address?: string;
  status: UserStatus;
  role: UserRole;
  joinDate: string;
  leaveDate?: string;
  emergencyContact?: string;
  passwordHash?: string;
  createdAt: string;
}

export interface MealEntry {
  id: string;
  memberId: string;
  yearMonth: string; // Format: "YYYY-MM" e.g., "2026-08"
  day: number; // 1 to 31
  mealCount: number; // e.g. 0, 0.5, 1, 1.5, 2, 2.5, 3
  updatedAt: string;
}

export interface BazarEntry {
  id: string;
  yearMonth: string;
  date: string;
  amount: number;
  description: string;
  shopperName?: string; // বাজারকারীর নাম (The person who made the purchase)
  managerId: string;
  createdAt: string;
}


export interface ExpenseItem {
  id: string;
  yearMonth: string;
  category: 'KHALA_BILL' | 'GAS_BILL' | 'EXTRA_COST' | 'FRIDGE_BILL';
  memberId?: string; // If null, shared across all active members. If specified, per-member custom override.
  amount: number;
  description?: string;
  updatedAt: string;
}

export interface Deposit {
  id: string;
  memberId: string;
  yearMonth: string;
  date: string;
  amount: number;
  note?: string;
  createdAt: string;
}

export interface MonthLock {
  id: string;
  yearMonth: string;
  status: MonthStatus;
  managerId?: string; // Legacy single assigned manager
  managerIds?: string[]; // Up to 3 assigned managers for this month
  lockedBy: string;
  lockedAt: string;
}

export interface SettlementEntry {
  id: string;
  memberId: string;
  yearMonth: string;
  type: 'DUE_COLLECTION' | 'REFUND_PAYOUT';
  amount: number;
  date: string;
  recordedBy: string;
  note?: string;
  createdAt: string;
}

export interface SecurityToken {
  id: string;
  email: string;
  code: string;
  createdAt: string;
  expiresAt: string;
  status: 'PENDING' | 'USED' | 'EXPIRED';
}

export interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  action: string;
  details: string;
  timestamp: string;
  targetMemberId?: string;
  yearMonth?: string;
}

export interface MealRequest {
  id: string; // "req-YYYY-MM-DD-memberId"
  memberId: string;
  yearMonth: string; // "YYYY-MM"
  date: string; // "YYYY-MM-DD"
  day: number; // 1-31
  breakfast: boolean;
  lunch: boolean;
  dinner: boolean;
  guestCount: number; // total guest count for backward compatibility
  guestBreakfast?: number;
  guestLunch?: number;
  guestDinner?: number;
  note?: string;
  isInherited?: boolean;
  updatedAt: string;
}

export interface DailyMealLock {
  date: string; // "YYYY-MM-DD"
  yearMonth: string;
  isLocked: boolean;
  breakfastLocked?: boolean;
  lunchLocked?: boolean;
  dinnerLocked?: boolean;
  lockedBy?: string;
  lockedAt?: string;
  bValue?: number;
  lValue?: number;
  dValue?: number;
  gbValue?: number;
  glValue?: number;
  gdValue?: number;
}

export interface MemberCalculation {
  memberId: string;
  memberName: string;
  roomNo: string;
  meals: number;
  mealCost: number;
  khalaBill: number;
  gasBill: number;
  extraCost: number;
  fridgeBill: number;
  totalCost: number;
  deposit: number;
  dueAmount: number;    // TotalCost - Deposit (if > 0)
  refundAmount: number; // Deposit - TotalCost (if > 0)
  settledAmount: number; // Amount settled post-closure
  isSettled: boolean;
  receiveBalance?: number; // Backward compatibility
  giveBalance?: number;    // Backward compatibility
}

export interface MonthManagerInfo {
  id: string;
  memberId: string;
  name: string;
  roomNo: string;
  phone?: string;
}

export interface MonthlyReport {
  yearMonth: string;
  assignedManagerName?: string;
  assignedManagers?: MonthManagerInfo[];
  totalMeals: number;
  totalBazar: number;
  millRate: number;
  totalKhala: number;
  totalGas: number;
  totalExtra: number;
  totalFridge: number;
  totalUtilities: number;
  totalCost: number;
  totalDeposits: number;
  cashInHand: number;
  overallReceive: number;
  overallGive: number;
  memberCalculations: MemberCalculation[];
}

export interface AuthSession {
  user: {
    id: string;
    memberId: string;
    name: string;
    phone: string;
    email?: string;
    role: UserRole;
    roomNo: string;
  };
  token: string;
}
