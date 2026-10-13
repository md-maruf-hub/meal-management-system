import { NextResponse } from 'next/server';
import { getDatabase, saveDatabase } from '../../../../lib/db';
import { MonthLock, AuditLog, MonthStatus } from '../../../../lib/types';

export async function GET(request: Request) {
  const db = await getDatabase();
  const approvedMembers = (db.members || []).filter(
    (m) => m.status === 'APPROVED' && m.role !== 'SUPER_ADMIN'
  );

  const monthSet = new Set<string>();
  (db.monthLocks || []).forEach((l) => { if (l.yearMonth) monthSet.add(l.yearMonth); });
  (db.meals || []).forEach((m) => { if (m.yearMonth) monthSet.add(m.yearMonth); });
  (db.bazarEntries || []).forEach((b) => { if (b.yearMonth) monthSet.add(b.yearMonth); });

  const availableMonths = Array.from(monthSet).sort().reverse();

  return NextResponse.json({
    monthLocks: db.monthLocks || [],
    approvedMembers,
    availableMonths,
  });
}

export async function POST(request: Request) {
  try {
    const { yearMonth, status, adminName, managerId, removedMemberIds } = await request.json();

    if (!yearMonth || !status) {
      return NextResponse.json({ error: 'Missing required params: yearMonth and status.' }, { status: 400 });
    }

    const newStatus = status as MonthStatus;
    const db = await getDatabase();

    // 1. If any members were marked to be excluded/removed for the new month:
    if (Array.isArray(removedMemberIds) && removedMemberIds.length > 0) {
      const [y, m] = yearMonth.split('-').map(Number);
      const prevDate = new Date(y, m - 1, 0); // last day of previous month
      const leaveDate = prevDate.toISOString().split('T')[0];

      for (const mId of removedMemberIds) {
        const targetMember = db.members.find((m) => m.id === mId);
        if (targetMember) {
          targetMember.status = 'INACTIVE';
          targetMember.leaveDate = leaveDate;
          db.auditLogs.push({
            id: `audit-${Date.now()}-${mId}`,
            userId: 'admin',
            userName: adminName || 'Super Admin',
            action: 'MEMBER_EXCLUDED_FROM_NEW_MONTH',
            details: `Member ${targetMember.name} (${targetMember.memberId}) was removed for new month ${yearMonth}. Status set to INACTIVE with leaveDate ${leaveDate}. Past month records remain intact.`,
            timestamp: new Date().toISOString(),
          });
        }
      }
    }

    // 2. If a manager is selected for this month, assign them
    if (managerId) {
      const mgr = db.members.find((m) => m.id === managerId);
      if (mgr) {
        mgr.role = 'MANAGER';
      }
    }

    // 3. Upsert month lock with status and manager
    const existingIndex = db.monthLocks.findIndex((l) => l.yearMonth === yearMonth);
    if (existingIndex >= 0) {
      db.monthLocks[existingIndex].status = newStatus;
      db.monthLocks[existingIndex].lockedBy = adminName || 'Super Admin';
      db.monthLocks[existingIndex].lockedAt = new Date().toISOString();
      if (managerId) {
        db.monthLocks[existingIndex].managerId = managerId;
      }
    } else {
      const newLock: MonthLock = {
        id: `lock-${Date.now()}`,
        yearMonth,
        status: newStatus,
        managerId: managerId || undefined,
        lockedBy: adminName || 'Super Admin',
        lockedAt: new Date().toISOString(),
      };
      db.monthLocks.push(newLock);
    }

    db.auditLogs.push({
      id: `audit-${Date.now()}`,
      userId: 'admin',
      userName: adminName || 'Super Admin',
      action: 'MONTH_STATUS_CHANGED',
      details: `Month ${yearMonth} status set to ${newStatus} with Manager ID ${managerId || 'None'} by ${adminName || 'Super Admin'}.`,
      timestamp: new Date().toISOString(),
    });

    await saveDatabase(db);
    return NextResponse.json({
      success: true,
      message: `মাস ${yearMonth} সফলভাবে '${newStatus === 'CLOSED' ? 'লকড' : 'চালু'}' করা হয়েছে!`,
    });
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
