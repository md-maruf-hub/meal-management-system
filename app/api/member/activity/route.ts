import { NextResponse } from 'next/server';
import { getDatabase, getMonthScopedData } from '../../../../lib/db';
import { verifyToken } from '../../../../lib/auth';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const yearMonth = searchParams.get('yearMonth');

    const cookieHeader = request.headers.get('cookie');
    const token = cookieHeader?.split(';').find((c) => c.trim().startsWith('mill_session='))?.split('=')[1];
    const user = token ? await verifyToken(token) : null;

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const [db, monthScoped] = await Promise.all([
      getDatabase(),
      yearMonth ? getMonthScopedData(yearMonth) : Promise.resolve(null),
    ]);

    const allLogs = db.auditLogs || [];

    // Filter rules for Audit Timeline:
    // 1. General mess activities (Bazar, Utility, Meals) are visible to all members in that month
    // 2. Personal financial activities (Deposits, Settlements) are ONLY visible if targetMemberId matches this member
    // 3. Super Admin and Manager can see all
    const isStaff = user.role === 'SUPER_ADMIN' || user.role === 'MANAGER';
    const isUserMatch = (id?: string) => Boolean(id && (id === user.id || (user.memberId && id === user.memberId)));

    const filteredLogs = allLogs.filter((log) => {
      // Month match (if specified)
      if (yearMonth && log.yearMonth && log.yearMonth !== yearMonth) {
        return false;
      }

      // If it is a targeted personal activity (e.g. deposit, personal settlement)
      if (log.targetMemberId) {
        if (!isStaff && !isUserMatch(log.targetMemberId)) {
          return false; // Privacy protection: Do not show other members' personal deposits
        }
      }

      return true;
    });

    const sortedLogs = filteredLogs.sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    // 1. Month's Bazar Entries (Visible to all members for transparency)
    const rawBazar = monthScoped ? monthScoped.bazarEntries : (db.bazarEntries || []);
    const monthBazar = rawBazar
      .filter((b) => !yearMonth || b.yearMonth === yearMonth)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // 2. Month's Utilities / Shared Expenses (Visible to all members)
    const rawUtilities = monthScoped ? monthScoped.expenses : (db.expenses || []);
    const monthUtilities = rawUtilities
      .filter((e) => !yearMonth || e.yearMonth === yearMonth)
      .sort((a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime());

    // 3. ONLY THIS MEMBER'S DEPOSITS (Strict privacy protection: only member's own deposits)
    const rawDeposits = monthScoped ? monthScoped.deposits : (db.deposits || []);
    const myDeposits = rawDeposits
      .filter((d) => (!yearMonth || d.yearMonth === yearMonth) && isUserMatch(d.memberId))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return NextResponse.json({
      activities: sortedLogs,
      bazarEntries: monthBazar,
      utilities: monthUtilities,
      myDeposits,
    });
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
