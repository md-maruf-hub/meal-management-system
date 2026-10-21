import { Member, MealEntry, BazarEntry, ExpenseItem, Deposit, SettlementEntry, MonthlyReport, MemberCalculation, MonthManagerInfo } from './types';

export function roundDecimal(num: number, decimals: number = 3): number {
  const factor = Math.pow(10, decimals);
  return Math.round((num + Number.EPSILON) * factor) / factor;
}

export function calculateMonthlyReport(
  yearMonth: string,
  members: Member[],
  meals: MealEntry[],
  bazarEntries: BazarEntry[],
  expenses: ExpenseItem[],
  deposits: Deposit[],
  settlements: SettlementEntry[] = [],
  assignedManagerName?: string,
  assignedManagers?: MonthManagerInfo[]
): MonthlyReport {
  // Active members for a month include:
  // 1. Members who had meals, deposits, or expenses in that specific yearMonth (historical ground truth)
  // 2. Or members who joined on/before this month, are APPROVED, and did not take a full-month leave (if month already has recorded meals)
  const isMemberMatch = (recordMemberId: string, m: Member) =>
    recordMemberId === m.id || (Boolean(m.memberId) && recordMemberId === m.memberId);

  const activeMembers = members.filter((m) => {
    if (m.role === 'SUPER_ADMIN') return false;

    // 1. Historical Activity: If the member has recorded meals, deposits, or expenses in this month, they are ALWAYS active
    const hasMealsInMonth = meals.some(
      (meal) => isMemberMatch(meal.memberId, m) && meal.yearMonth === yearMonth && meal.mealCount > 0
    );
    const hasDepositsInMonth = deposits.some(
      (dep) => isMemberMatch(dep.memberId, m) && dep.yearMonth === yearMonth && dep.amount > 0
    );
    const hasExpensesInMonth = expenses.some(
      (exp) => exp.memberId && isMemberMatch(exp.memberId, m) && exp.yearMonth === yearMonth && exp.amount > 0
    );

    if (hasMealsInMonth || hasDepositsInMonth || hasExpensesInMonth) {
      return true;
    }

    // A member cannot be active before their join month (if no historical activity exists)
    const joinYM = m.joinDate ? m.joinDate.substring(0, 7) : '';
    if (joinYM && joinYM > yearMonth) {
      return false;
    }

    // A member who left in a prior month cannot be active in a future month
    const leaveYM = m.leaveDate ? m.leaveDate.substring(0, 7) : '';
    if (leaveYM && leaveYM < yearMonth) {
      return false;
    }

    // If member is not approved (e.g. INACTIVE or REJECTED) and has no activity in this month
    if (m.status !== 'APPROVED') {
      return false;
    }

    return true;
  });
  const activeCount = activeMembers.length || 1;

  // 1. Total Meals
  const activeMemberIdSet = new Set<string>();
  activeMembers.forEach((m) => {
    if (m.id) activeMemberIdSet.add(m.id);
    if (m.memberId) activeMemberIdSet.add(m.memberId);
  });

  const monthMeals = meals.filter(
    (m) => m.yearMonth === yearMonth && activeMemberIdSet.has(m.memberId)
  );
  const totalMeals = roundDecimal(
    monthMeals.reduce((sum, m) => sum + (Number(m.mealCount) || 0), 0),
    1
  );

  // 2. Total Bazar & Mill Rate
  const monthBazar = bazarEntries.filter(
    (b) => b.yearMonth === yearMonth
  );
  const totalBazar = roundDecimal(
    monthBazar.reduce((sum, b) => sum + (Number(b.amount) || 0), 0),
    2
  );

  const millRate = totalMeals > 0 ? roundDecimal(totalBazar / totalMeals, 3) : 0;

  // 3. Category Expenses
  const monthExpenses = expenses.filter(
    (e) => e.yearMonth === yearMonth
  );

  const getExpensesByCategory = (category: string) =>
    monthExpenses.filter((e) => e.category === category);

  const calculateMemberUtilityCost = (category: string, member: Member): number => {
    const items = getExpensesByCategory(category);
    
    const directCost = items
      .filter((item) => item.memberId && isMemberMatch(item.memberId, member))
      .reduce((sum, item) => sum + (Number(item.amount) || 0), 0);

    const sharedCost = items
      .filter((item) => !item.memberId)
      .reduce((sum, item) => sum + (Number(item.amount) || 0), 0);

    const splitCost = sharedCost > 0 ? sharedCost / activeCount : 0;
    return roundDecimal(directCost + splitCost, 2);
  };

  let totalKhala = 0;
  let totalGas = 0;
  let totalExtra = 0;
  let totalFridge = 0;
  let totalCostSum = 0;
  let totalDepositsSum = 0;
  let overallReceive = 0;
  let overallGive = 0;

  const memberCalculations: MemberCalculation[] = activeMembers.map((member) => {
    const memberMealEntries = monthMeals.filter((m) => isMemberMatch(m.memberId, member));
    const memberMealCount = roundDecimal(
      memberMealEntries.reduce((sum, m) => sum + (Number(m.mealCount) || 0), 0),
      1
    );

    // Use full precision ratio to avoid premature rounding loss across members
    const mealCost = totalMeals > 0 ? roundDecimal((memberMealCount * totalBazar) / totalMeals, 2) : 0;

    const khalaBill = calculateMemberUtilityCost('KHALA_BILL', member);
    const gasBill = calculateMemberUtilityCost('GAS_BILL', member);
    const extraCost = calculateMemberUtilityCost('EXTRA_COST', member);
    const fridgeBill = calculateMemberUtilityCost('FRIDGE_BILL', member);

    const totalCost = roundDecimal(
      mealCost + khalaBill + gasBill + extraCost + fridgeBill,
      2
    );

    const memberDepositEntries = deposits.filter(
      (d) =>
        d.yearMonth === yearMonth &&
        isMemberMatch(d.memberId, member)
    );
    const depositAmount = roundDecimal(
      memberDepositEntries.reduce((sum, d) => sum + (Number(d.amount) || 0), 0),
      2
    );

    let dueAmount = 0;
    let refundAmount = 0;

    if (depositAmount > totalCost) {
      refundAmount = roundDecimal(depositAmount - totalCost, 2);
    } else if (totalCost > depositAmount) {
      dueAmount = roundDecimal(totalCost - depositAmount, 2);
    }

    if (dueAmount <= 0.01) dueAmount = 0;
    if (refundAmount <= 0.01) refundAmount = 0;

    // Check settlements for this member in this month
    const memberSettlements = settlements.filter(
      (s) => isMemberMatch(s.memberId, member) && s.yearMonth === yearMonth
    );
    const settledAmount = roundDecimal(
      memberSettlements.reduce((sum, s) => sum + (Number(s.amount) || 0), 0),
      2
    );

    const isZeroBalance = dueAmount <= 0.01 && refundAmount <= 0.01;
    // Settled only when the remaining balance is zero (0.00)
    const isSettled = isZeroBalance && (memberSettlements.length > 0 || totalCost === depositAmount);

    totalKhala += khalaBill;
    totalGas += gasBill;
    totalExtra += extraCost;
    totalFridge += fridgeBill;
    totalCostSum += totalCost;
    totalDepositsSum += depositAmount;
    overallReceive += refundAmount;
    overallGive += dueAmount;

    return {
      memberId: member.id,
      memberName: member.name,
      roomNo: member.roomNo,
      meals: memberMealCount,
      mealCost,
      khalaBill,
      gasBill,
      extraCost,
      fridgeBill,
      totalCost,
      deposit: depositAmount,
      dueAmount,
      refundAmount,
      settledAmount,
      isSettled,
      receiveBalance: refundAmount,
      giveBalance: dueAmount,
    };
  });

  const totalUtilitiesSum = roundDecimal(totalKhala + totalGas + totalExtra + totalFridge, 2);
  const cashInHand = roundDecimal(totalDepositsSum - totalBazar - totalUtilitiesSum, 2);

  return {
    yearMonth,
    assignedManagerName,
    assignedManagers,
    totalMeals,
    totalBazar,
    millRate,
    totalKhala: roundDecimal(totalKhala, 2),
    totalGas: roundDecimal(totalGas, 2),
    totalExtra: roundDecimal(totalExtra, 2),
    totalFridge: roundDecimal(totalFridge, 2),
    totalUtilities: totalUtilitiesSum,
    totalCost: roundDecimal(totalCostSum, 2),
    totalDeposits: roundDecimal(totalDepositsSum, 2),
    cashInHand,
    overallReceive: roundDecimal(overallReceive, 2),
    overallGive: roundDecimal(overallGive, 2),
    memberCalculations,
  };
}
