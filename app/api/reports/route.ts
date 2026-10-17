import { NextResponse } from 'next/server';
import { getDatabase, getMonthScopedData } from '../../../lib/db';
import { calculateMonthlyReport } from '../../../lib/calculations';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const yearMonth = searchParams.get('yearMonth') || new Date().toISOString().substring(0, 7);

  const [db, monthScoped] = await Promise.all([
    getDatabase(),
    getMonthScopedData(yearMonth),
  ]);
  
  // Find assigned managers for this month (supporting up to 3 managers)
  const monthLock = (db.monthLocks || []).find((l) => l.yearMonth === yearMonth) || monthScoped.monthLock;
  const managerIds: string[] = monthLock?.managerIds && monthLock.managerIds.length > 0
    ? monthLock.managerIds
    : (monthLock?.managerId ? [monthLock.managerId] : []);

  const allMembers = monthScoped.members && monthScoped.members.length > 0 ? monthScoped.members : db.members;

  const assignedManagers = managerIds
    .map((id) => allMembers.find((m) => m.id === id || m.memberId === id))
    .filter((m): m is typeof allMembers[0] => Boolean(m))
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
    allMembers,
    monthScoped.meals,
    monthScoped.bazarEntries,
    monthScoped.expenses,
    monthScoped.deposits,
    monthScoped.settlements || [],
    assignedManagerName,
    assignedManagers
  );

  return NextResponse.json({
    report,
    source: monthScoped.source, // 'VIRTUAL_DB' | 'HISTORICAL_CACHE' | 'GOOGLE_SHEET'
  });
}
