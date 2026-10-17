import { NextResponse } from 'next/server';
import { getDatabase } from '../../../lib/db';
import { calculateMonthlyReport } from '../../../lib/calculations';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const yearMonth = searchParams.get('yearMonth') || '2026-08';

  const db = await getDatabase();
  
  // Find assigned managers for this month (supporting up to 3 managers)
  const monthLock = (db.monthLocks || []).find((l) => l.yearMonth === yearMonth);
  const managerIds: string[] = monthLock?.managerIds && monthLock.managerIds.length > 0
    ? monthLock.managerIds
    : (monthLock?.managerId ? [monthLock.managerId] : []);

  const assignedManagers = managerIds
    .map((id) => db.members.find((m) => m.id === id || m.memberId === id))
    .filter((m): m is typeof db.members[0] => Boolean(m))
    .map((m) => ({
      id: m.id,
      memberId: m.memberId,
      name: m.name,
      roomNo: m.roomNo,
      phone: m.phone,
    }));

  const assignedManagerName = assignedManagers.length > 0
    ? assignedManagers.map((m) => `${m.name}${m.roomNo ? ` (রুম ${m.roomNo})` : ''}`).join(', ')
    : undefined;

  const report = calculateMonthlyReport(
    yearMonth,
    db.members,
    db.meals,
    db.bazarEntries,
    db.expenses,
    db.deposits,
    db.settlements || [],
    assignedManagerName,
    assignedManagers
  );

  return NextResponse.json({ report });
}
