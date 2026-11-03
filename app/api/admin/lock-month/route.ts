import { NextResponse } from 'next/server';
import { getDatabase, saveDatabase, syncAndPruneMonthTransition, deleteMonthData } from '../../../../lib/db';
import { MonthLock, AuditLog, MonthStatus } from '../../../../lib/types';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const forceFresh = searchParams.get('fresh') === '1';
  const db = await getDatabase(forceFresh);
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
      if (mgr && mgr.role !== 'SUPER_ADMIN') {
        // We keep user's global member role clean; monthLocks tracks their manager assignment
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
        if (!db.monthLocks[existingIndex].managerIds) {
          db.monthLocks[existingIndex].managerIds = [];
        }
        if (!db.monthLocks[existingIndex].managerIds.includes(managerId)) {
          db.monthLocks[existingIndex].managerIds.push(managerId);
        }
      }
    } else {
      const newLock: MonthLock = {
        id: `lock-${Date.now()}`,
        yearMonth,
        status: newStatus,
        managerId: managerId || undefined,
        managerIds: managerId ? [managerId] : [],
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

    // If month was closed, ensure remote Google Sheet backup is finalized and prune virtual database
    let pruneNotice = '';
    if (newStatus === 'CLOSED') {
      try {
        const { removedCount } = await syncAndPruneMonthTransition();
        pruneNotice = ` (গুগল শিটে ব্যাকআপ নিশ্চিত করা হয়েছে ও ভার্চুয়াল ডাটাবেজ থেকে ${removedCount}টি অতীত রেকর্ড অপ্টিমাইজ করা হয়েছে)`;
      } catch (err) {
        console.warn('Prune error after month close:', err);
      }
    }

    return NextResponse.json({
      success: true,
      message: `মাস ${yearMonth} সফলভাবে '${newStatus === 'CLOSED' ? 'লকড / সমাপ্ত' : 'চালু'}' করা হয়েছে!${pruneNotice}`,
    });
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const yearMonth = searchParams.get('yearMonth');
    const adminName = searchParams.get('adminName') || 'Super Admin';

    if (!yearMonth) {
      return NextResponse.json({ error: 'মাস (yearMonth) আবশ্যক।' }, { status: 400 });
    }

    // Add Audit Log before deleting
    const db = await getDatabase();
    if (!db.auditLogs) db.auditLogs = [];
    db.auditLogs.push({
      id: `audit-${Date.now()}`,
      userId: 'admin',
      userName: adminName,
      action: 'MONTH_DELETED',
      details: `${yearMonth} মাসের সম্পূর্ণ হিসাব ও রেকর্ড এবং গুগল শিট থেকে সংশ্লিষ্ট ট্যাব মুছে ফেলা হয়েছে।`,
      timestamp: new Date().toISOString(),
    });
    await saveDatabase(db, { syncGas: false });

    // Permanently delete month from local DB, cache and Google Sheets
    await deleteMonthData(yearMonth);

    return NextResponse.json({
      success: true,
      message: `${yearMonth} মাসের হিসাব এবং গুগল শিটের ট্যাব সফলভাবে মুছে ফেলা হয়েছে।`,
    });
  } catch (error: any) {
    console.error('Delete month error:', error);
    return NextResponse.json({ error: error.message || 'মাস মুছতে ব্যর্থ হয়েছে।' }, { status: 500 });
  }
}
