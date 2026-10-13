import { NextResponse } from 'next/server';
import { getDatabase } from '../../../lib/db';
import { calculateMonthlyReport } from '../../../lib/calculations';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const yearMonth = searchParams.get('yearMonth') || '2026-08';

  const db = await getDatabase();
  
  // Find assigned manager name for this month
  const monthLock = (db.monthLocks || []).find((l) => l.yearMonth === yearMonth);
  let assignedManagerName: string | undefined = undefined;
  if (monthLock && monthLock.managerId) {
    const mgr = db.members.find((m) => m.id === monthLock.managerId);
    if (mgr) assignedManagerName = mgr.name;
  }

  const report = calculateMonthlyReport(
    yearMonth,
    db.members,
    db.meals,
    db.bazarEntries,
    db.expenses,
    db.deposits,
    db.settlements || [],
    assignedManagerName
  );

  return NextResponse.json({ report });
}
